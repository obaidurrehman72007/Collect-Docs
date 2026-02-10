// controllers/bundleRequestController.js
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import {
  Bundle,
  BundleRequest,
  BundleRequestRequirement,
  DocumentSubmission,
  sequelize,
  Client,
} from "../../src/models/index.js";
import {
  sendBundleRequestEmail,
  sendDocumentApprovedEmail,
  sendDocumentRejectedEmail,
  sendRequestCompletedEmail,
} from "../Config/mailer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, "../../uploads/submissions");

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});
const uploadMiddleware = multer({
  storage, // your existing storage
  limits: { fileSize: 500 * 1024 * 1024 },
});

async function updateRequirementToLatestStatus(requirementId, transaction) {
  const latest = await DocumentSubmission.findOne({
    where: { requirement_id: requirementId },
    order: [["createdAt", "DESC"]],
    transaction,
  });

  const newStatus = latest ? latest.status : "pending";
  const rejectionReason = latest ? latest.rejection_reason : null;

  await BundleRequestRequirement.update(
    {
      status: newStatus,
      rejection_reason: rejectionReason,
    },
    {
      where: { id: requirementId },
      transaction,
    },
  );
}

export const updateSubmissionStatus = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { bundleRequestId, submissionId, status } = req.params;
    const { reason } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      throw new Error("Invalid status");
    }

    const submission = await DocumentSubmission.findOne({
      where: {
        id: submissionId,
        bundle_request_id: bundleRequestId,
      },
      transaction,
    });

    if (!submission) throw new Error("Submission not found");

    await submission.update(
      {
        status,
        rejection_reason: status === "rejected" ? reason || null : null,
      },
      { transaction },
    );

    await updateRequirementToLatestStatus(
      submission.requirement_id,
      transaction,
    );

    const request = await BundleRequest.findByPk(bundleRequestId, {
      include: [{ model: Client, as: "client" }],
      transaction,
    });

    if (request?.client?.email) {
      const emailData = submission.toJSON();
      try {
        if (status === "approved") {
          await sendDocumentApprovedEmail(request.client.email, emailData);
        } else if (status === "rejected") {
          await sendDocumentRejectedEmail(
            request.client.email,
            emailData,
            reason || "No reason provided",
          );
        }
      } catch (mailErr) {
        console.warn("Email failed (non-critical):", mailErr.message);
      }
    }

    await transaction.commit();

    return res.json({
      success: true,
      message: `File ${status === "approved" ? "approved" : "rejected"}`,
    });
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error("updateSubmissionStatus error:", err);
    return res.status(err.message.includes("not found") ? 404 : 500).json({
      success: false,
      message: err.message || "Failed to update submission status",
    });
  }
};

export const createBundleRequest = async (req, res) => {
  try {
    const { bundle_id, client_id, client_email: providedEmail } = req.body;

    if (!bundle_id)
      return res
        .status(400)
        .json({ success: false, message: "Bundle ID required" });

    const share_token = crypto.randomBytes(32).toString("hex");

    const request = await BundleRequest.create({
      bundle_id,
      client_id: client_id || null,
      workspace_id: req.user.workspaceId,
      share_token,
      status: "pending",
      created_by: req.user.id,
    });

    try {
      const bundle = await Bundle.findByPk(bundle_id);
      let templateFields = [];
      if (bundle?.template) {
        let t = bundle.template;
        try {
          while (typeof t === "string") t = JSON.parse(t);
        } catch {}
        templateFields = Array.isArray(t) ? t : [];
      }

      if (templateFields.length > 0) {
        const snapshotData = templateFields.map((field) => ({
          bundle_request_id: request.id,
          requirement_id: field.id || crypto.randomUUID(),
          field_name: (field.name || "").toLowerCase().replace(/\s+/g, "_"),
          name: field.name || null,
          description: field.description || null,
          type: field.type || "file",
          is_mandatory: field.required !== false,

          status: "pending",
        }));

        await BundleRequestRequirement.bulkCreate(snapshotData);
      }
    } catch (snapErr) {
      console.error("Snapshot error (non-critical):", snapErr);
    }

    let finalEmail = providedEmail;
    if (!finalEmail && client_id) {
      const client = await Client.findByPk(client_id);
      finalEmail = client?.email;
    }

    if (finalEmail) {
      try {
        const mailRes = await sendBundleRequestEmail(finalEmail, share_token);
        if (mailRes.success);
        else console.warn("Bundle request email failed:", mailRes.error);
      } catch (err) {
        console.error("Email error (non-critical):", err);
      }
    }

    const shareLink = `${process.env.FRONTEND_URL}/public/${share_token}`;

    return res.status(201).json({
      success: true,
      message: "Bundle request created",
      data: { id: request.id, share_token, link: shareLink },
    });
  } catch (error) {
    console.error("Create Bundle Request Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getPublicBundle = async (req, res) => {
  try {
    const { shareToken } = req.params;

    const bundleRequest = await BundleRequest.findOne({
      where: { share_token: shareToken },
      include: [
        { model: Bundle, as: "Bundle" },
        { model: BundleRequestRequirement, as: "requirements" },
        { model: DocumentSubmission, as: "submissions" },
      ],
    });

    if (!bundleRequest) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid or expired link" });
    }

    const requirements = await Promise.all(
      (bundleRequest.requirements || []).map(async (reqItem) => {
        const submissions = (bundleRequest.submissions || [])
          .filter((s) => s.requirement_id === reqItem.id)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const latest = submissions[0];

        const processedSubs = await Promise.all(
          submissions.map(async (sub) => {
            const data = sub.toJSON();
            const filePath = sub.file_path;
            const fileName = sub.file_name;
            const ext = path.extname(fileName).toLowerCase().slice(1);

            let base64 = null;
            try {
              const buffer = await fs.readFile(filePath);
              if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
                base64 = `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${buffer.toString("base64")}`;
              } else if (ext === "pdf") {
                base64 = `data:application/pdf;base64,${buffer.toString("base64")}`;
              }
              if (["txt", "log", "csv", "md", "json"].includes(ext)) {
                base64 = `data:text/plain;base64,${buffer.toString("base64")}`;
              } else if (ext === "rtf") {
                base64 = `data:application/rtf;base64,${buffer.toString("base64")}`;
              }
            } catch (err) {
              console.warn("Failed to generate base64 for file:", err.message);
            }

            data.base64 = base64;
            return data;
          }),
        );

        return {
          ...reqItem.toJSON(),
          status: latest?.status || "pending",
          rejection_reason: latest?.rejection_reason || null,
          latestFileName: latest?.file_name || null,
          submissions: processedSubs,
        };
      }),
    );

    return res.json({
      success: true,
      data: {
        id: bundleRequest.id,
        bundle_name: bundleRequest.Bundle?.name || "Untitled Bundle",
        status: bundleRequest.status,
        rejection_reason: bundleRequest.rejection_reason, // ← added here too
        requirements,
      },
    });
  } catch (err) {
    console.error("getPublicBundle error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const submitPublicBundleHandler = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { shareToken } = req.params;
    const files = req.files || [];
    const body = req.body;

    const bundleRequest = await BundleRequest.findOne({
      where: { share_token: shareToken },
      include: [
        { model: BundleRequestRequirement, as: "requirements" },
        { model: Bundle, as: "Bundle" },
      ],
      transaction,
    });

    if (!bundleRequest) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Request not found or expired" });
    }

    for (const [index, reqItem] of bundleRequest.requirements.entries()) {
      if (reqItem.type === "file") {
        const file = files.find((f) => f.fieldname === `field_file_${index}`);
        if (file) {
          await DocumentSubmission.create(
            {
              bundle_request_id: bundleRequest.id,
              requirement_id: reqItem.id,
              file_path: file.path,
              file_name: file.originalname,
              status: "pending",
              rejection_reason: null,
            },
            { transaction },
          );

          await reqItem.update(
            { status: "pending", rejection_reason: null },
            { transaction },
          );
        }
      } else {
        const value = body[`field_text_${index}`];
        if (value && String(value).trim()) {
          await reqItem.update(
            {
              submitted_value: value,
              status: "pending",
              rejection_reason: null,
            },
            { transaction },
          );
        }
      }
    }

    if (["pending", "rejected"].includes(bundleRequest.status)) {
      await bundleRequest.update(
        {
          status: "submitted",
          submitted_at: new Date(),
        },
        { transaction },
      );
    }

    await transaction.commit();
    return res.json({ success: true, message: "Files submitted successfully" });
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error("submitPublicBundleHandler error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const resendBundleRequestEmail = async (req, res) => {
  try {
    const role = (req.user?.role || "").toLowerCase();
    if (!["staff", "manager", "admin"].includes(role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { shareToken } = req.params;

    const request = await BundleRequest.findOne({
      where: { share_token: shareToken },
      include: [
        { model: Client, as: "client" },
        { model: Bundle, as: "Bundle" },
      ],
    });

    if (!request)
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });

    const clientEmail = request.client?.email;
    if (!clientEmail)
      return res
        .status(400)
        .json({ success: false, message: "Client email not available" });

    const mailRes = await sendBundleRequestEmail(
      clientEmail,
      request.share_token,
    );
    if (!mailRes.success)
      return res
        .status(500)
        .json({ success: false, message: "Failed to resend email" });

    return res.json({ success: true, message: "Email resent successfully" });
  } catch (error) {
    console.error("Resend Bundle Request Email Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const approveSubmission = async (req, res) => {
  try {
    const { shareToken } = req.params;

    const [count] = await BundleRequest.update(
      { status: "approved", reviewed_at: new Date() },
      { where: { share_token: shareToken } },
    );

    try {
      const request = await BundleRequest.findOne({
        where: { share_token: shareToken },
        include: [
          { model: Client, as: "client" },
          { model: Bundle, as: "Bundle" },
        ],
      });
      if (request?.client?.email) {
        await sendRequestCompletedEmail(
          request.client.email,
          request.Bundle?.name || "Your Request",
          shareToken,
        );
      }
    } catch (mailErr) {
      console.warn("Completion email failed:", mailErr);
    }

    return res.json({
      success: count > 0,
      message: count > 0 ? "Bundle approved" : "Request not found",
    });
  } catch (error) {
    console.error("Approve Submission Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectSubmission = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { shareToken } = req.params;
    const { rejection_reason } = req.body;

    if (!rejection_reason?.trim()) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Rejection reason is required" });
    }

    const [count] = await BundleRequest.update(
      {
        status: "rejected",
        rejection_reason: rejection_reason.trim(),
        reviewed_at: new Date(),
      },
      { where: { share_token: shareToken }, transaction },
    );

    if (count === 0) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    }

    await BundleRequestRequirement.update(
      { status: "rejected", rejection_reason: rejection_reason.trim() },
      {
        where: {
          bundle_request_id: (
            await BundleRequest.findOne({
              where: { share_token: shareToken },
              attributes: ["id"],
              transaction,
            })
          ).id,
          status: "pending",
        },
        transaction,
      },
    );

    const request = await BundleRequest.findOne({
      where: { share_token: shareToken },
      include: [
        { model: Client, as: "client" },
        { model: Bundle, as: "Bundle" },
      ],
      transaction,
    });

    if (request?.client?.email) {
      try {
        await sendDocumentRejectedEmail(request.client.email, {
          bundle_name: request.Bundle?.name || "Your Bundle",
          rejection_reason,
          share_token: shareToken,
        });
      } catch (mailErr) {
        console.warn("Rejection email failed:", mailErr.message);
      }
    }

    await transaction.commit();

    return res.json({
      success: true,
      message: "Bundle request rejected successfully",
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Reject Submission Error:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: error.message || "Failed to reject request",
      });
  }
};

export const completeBundleRequest = async (req, res) => {
  try {
    const { shareToken } = req.params;

    const [count] = await BundleRequest.update(
      { status: "completed", reviewed_at: new Date() },
      { where: { share_token: shareToken } },
    );

    try {
      const request = await BundleRequest.findOne({
        where: { share_token: shareToken },
        include: [
          { model: Client, as: "client" },
          { model: Bundle, as: "Bundle" },
        ],
      });
      if (request?.client?.email) {
        await sendRequestCompletedEmail(
          request.client.email,
          request.Bundle?.name || "Your Request",
          shareToken,
        );
      }
    } catch (mailErr) {
      console.warn("Completion email failed:", mailErr);
    }

    return res.json({
      success: count > 0,
      message: count > 0 ? "Request marked as completed" : "Request not found",
    });
  } catch (error) {
    console.error("Complete Bundle Request Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getClientBundleRequests = async (req, res) => {
  try {
    let client;

    if (req.user?.email) {
      client = await Client.findOne({
        where: { email: req.user.email, workspace_id: req.user.workspaceId },
      });
    }

    if (
      !client &&
      req.user &&
      ["staff", "manager", "admin"].includes(req.user.role?.toLowerCase()) &&
      req.query.client_id
    ) {
      client = await Client.findByPk(req.query.client_id);
    }

    if (!client) {
      return res
        .status(404)
        .json({ success: false, message: "Client not found" });
    }

    const requests = await BundleRequest.findAll({
      where: { client_id: client.id },
      attributes: [
        "id",
        "share_token",
        "status",
        "submitted_at",
        "created_at",
        "rejection_reason",
        "reviewed_at",
      ],
      include: [
        { model: Bundle, as: "Bundle", attributes: ["id", "name"] },
        { model: BundleRequestRequirement, as: "requirements" },
        { model: DocumentSubmission, as: "submissions" },
      ],
      order: [["createdAt", "DESC"]],
    });

    const formatted = requests.map((r) => ({
      id: r.id,
      share_token: r.share_token,
      status: r.status,
      submitted_at: r.submitted_at,
      created_at: r.created_at,
      rejection_reason: r.rejection_reason, // Now sent to frontend
      reviewed_at: r.reviewed_at,
      bundle: r.Bundle ? { id: r.Bundle.id, name: r.Bundle.name } : null,
      requirements: (r.requirements || []).map((reqItem) => {
        const latest = (r.submissions || [])
          .filter((s) => s.requirement_id === reqItem.id)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        return {
          id: reqItem.id,
          name: reqItem.name || reqItem.field_name,
          status: latest ? latest.status : reqItem.status || "pending",
        };
      }),
    }));

    return res.json({ success: true, bundleRequests: formatted });
  } catch (error) {
    console.error("Get Client Bundle Requests Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  createBundleRequest,
  resendBundleRequestEmail,
  getPublicBundle,
  submitPublicBundleHandler,
  updateSubmissionStatus,
  approveSubmission,
  rejectSubmission,
  completeBundleRequest,
  getClientBundleRequests,
};
