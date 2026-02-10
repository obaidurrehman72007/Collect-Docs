import express from "express";
import multer from "multer";
import {
  getPublicBundle,
  submitPublicBundleHandler,
  approveSubmission,
  rejectSubmission,
  completeBundleRequest,
  updateSubmissionStatus,
  createBundleRequest,
  getClientBundleRequests,
  resendBundleRequestEmail,
} from "../Controllers/bundleRequestController.js";
import {
  authenticateToken,
  requireWorkspace,
} from "../Controllers/authController.js";
import { upload } from "../Controllers/documentController.js";

const router = express.Router();

router.get("/public/:shareToken", getPublicBundle);

router.post(
  "/:shareToken/submit",
  upload.any(),
  submitPublicBundleHandler
);

router.use(authenticateToken, requireWorkspace);

router.post("/", createBundleRequest);

router.get("/client", getClientBundleRequests);

router.post("/:shareToken/resend", resendBundleRequestEmail);

router.patch(
  "/:bundleRequestId/submission/:submissionId/:status",
  updateSubmissionStatus
);

router.patch("/:shareToken/approve", approveSubmission);
router.patch("/:shareToken/reject", rejectSubmission);
router.patch("/:shareToken/complete", completeBundleRequest);

router.patch("/:bundleRequestId/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["pending", "approved", "rejected", "completed", "submitted"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const bundle = await BundleRequest.findByPk(req.params.bundleRequestId);

    if (!bundle) {
      return res.status(404).json({ success: false, message: "Bundle request not found" });
    }

    if (status === "approved") {
      const pending = await BundleRequestRequirement.count({
        where: {
          bundle_request_id: bundle.id,
          status: { [Op.ne]: "approved" },
        },
      });

      if (pending > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot approve — some requirements are still pending or rejected",
        });
      }
    }

    await bundle.update({ status });

    return res.json({
      success: true,
      message: `Bundle status updated to ${status}`,
      data: bundle,
    });
  } catch (error) {
    console.error("Error updating bundle status:", error);
    return res.status(500).json({ success: false, message: "Failed to update status" });
  }
});

export default router;