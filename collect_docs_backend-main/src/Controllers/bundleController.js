import { Bundle, DocumentRequirement } from "../models/index.js";
import sequelize from "../Config/database.js";
import { Sequelize } from "sequelize";
import { Op } from "sequelize";
import { v4 as uuidv4 } from "uuid";

export const createBundle = async (req, res) => {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required: User ID missing from token",
    });
  }

  const transaction = await sequelize.transaction();
  try {
    const { name, description, requirements = [] } = req.body;

    if (!name?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Bundle name is required" });
    }

    const validRequirements = Array.isArray(requirements)
      ? requirements.filter((r) => r?.name?.trim())
      : [];

    const bundle = await Bundle.create(
      {
        name: name.trim(),
        description: description?.trim() || null,
        template: JSON.stringify(validRequirements),
        workspace_id: req.user.workspaceId,
        created_by: req.user.userId,
        status: "pending",
      },
      { transaction },
    );

    if (validRequirements.length > 0) {
      const requirementsData = validRequirements.map((reqItem) => ({
        name: reqItem.name.trim(),
        field_name: reqItem.name.trim(),
        description: reqItem.description || null,
        required: reqItem.required ?? true,
        accept: reqItem.accept || "*",
        bundle_id: bundle.id,
      }));
      await DocumentRequirement.bulkCreate(requirementsData, { transaction });
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: "Bundle created successfully",
      data: {
        id: bundle.id,
        name: bundle.name,
        totalRequirements: validRequirements.length,
      },
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Bundle Creation Error:", error);
    res.status(500).json({
      success: false,
      message:
        error.name === "SequelizeValidationError"
          ? "Validation failed"
          : "Internal server error",
      error: error.message,
    });
  }
};

export const getBundleById = async (req, res) => {
  try {
    const bundle = await Bundle.findOne({
      where: { id: req.params.id, workspace_id: req.user.workspaceId },
      attributes: ["id", "name", "description", "status", "template"],
    });

    if (!bundle) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const template = JSON.parse(bundle.template || "[]");

    res.json({
      success: true,
      id: bundle.id,
      name: bundle.name,
      description: bundle.description,
      template,
      totalFields: template.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateBundle = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const bundle = await Bundle.findOne({
      where: {
        id: req.params.id,
        workspace_id: req.user.workspaceId,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!bundle) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Bundle not found" });
    }

    const { name, description, requirements = [] } = req.body;

    if (!Array.isArray(requirements)) {
      throw new Error("Requirements must be an array");
    }

    await DocumentRequirement.destroy({
      where: { bundle_id: bundle.id },
      transaction,
    });

    const createdRequirements = [];

    for (const r of requirements) {
      if (!r?.name?.trim()) continue;

      const created = await DocumentRequirement.create(
        {
          bundle_id: bundle.id,
          name: r.name.trim(),
          type: r.type || "text",
          required: r.required ?? true,
          placeholder: r.placeholder || "",
          accept: r.accept || "",
          pattern: r.pattern || "",
        },
        { transaction },
      );

      createdRequirements.push(created);
    }

    await bundle.update(
      {
        name: name?.trim() || bundle.name,
        description: description?.trim() ?? bundle.description,
        template: createdRequirements.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          required: r.required,
          placeholder: r.placeholder,
          accept: r.accept,
          pattern: r.pattern,
        })),
      },
      { transaction },
    );

    await transaction.commit();

    const refreshed = await Bundle.findByPk(bundle.id, {
      include: [{ model: DocumentRequirement, as: "requirements" }],
    });

    return res.json({
      success: true,
      message: "Bundle updated (preview & template synced)",
      bundle: refreshed,
    });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to update bundle",
      error: error.message,
    });
  }
};



export const getBundles = async (req, res) => {
  try {
    const bundles = await Bundle.findAll({
      where: {
        workspace_id: req.user.workspaceId,
      },
      attributes: [
        "id",
        "name",
        "description",
        "status",
        "template",
        "created_at",
      ],
      include: [
        {
          model: DocumentRequirement,
          as: "requirements",
          attributes: [
            "id",
            "name",
            "type",
            "required",
            "placeholder",
            "accept",
            "pattern",
            "description",
          ],
          // Optional: order the included requirements
          order: [["createdAt", "ASC"]],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    const formattedBundles = bundles.map((bundle) => {
      const requirements = bundle.requirements || [];

      return {
        id: bundle.id,
        name: bundle.name,
        description: bundle.description,
        status: bundle.status,
        created_at: bundle.created_at,
        requirementsCount: requirements.length,           // ← calculated in JS
        requirements,                                     // ← full array
        parsedTemplate: bundle.template ? JSON.parse(bundle.template) : [],
      };
    });

    return res.status(200).json({
      success: true,
      message: "Bundles retrieved successfully",
      total: formattedBundles.length,
      bundles: formattedBundles,
    });
  } catch (error) {
    console.error("🚨 Get bundles error:", error);

    let status = 500;
    let message = "Failed to retrieve bundles";

    if (error.name === "SequelizeConnectionError") {
      status = 503;
      message = "Database connection failed";
    } else if (error.name === "SequelizeAccessDeniedError") {
      status = 403;
      message = "Access denied to workspace";
    }

    return res.status(status).json({
      success: false,
      message,
      error: error.message,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    });
  }
};


export const deleteBundle = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    await sequelize.query(
      "DELETE FROM document_requirements WHERE bundle_id = ?",
      { replacements: [req.params.id], transaction },
    );

    const [result] = await sequelize.query(
      `
      DELETE FROM bundles WHERE id = ? AND workspace_id = ? 
    `,
      {
        replacements: [req.params.id, req.user.workspaceId],
        transaction,
      },
    );

    if (result[1] === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: req.t("errors.notFound"),
        lang: req.lang,
      });
    }

    await transaction.commit();

    res.json({
      success: true,
      message: req.t("common.delete"),
      lang: req.lang,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("🚨 Delete bundle error:", error);
    res.status(500).json({
      success: false,
      message: req.t("errors.serverError"),
      lang: req.lang,
    });
  }
};
export const getBundlePreview = async (req, res) => {
  try {
    const bundle = await Bundle.findByPk(req.params.id, {
      include: [{ model: DocumentRequirement, as: "requirements" }],
    });

    if (!bundle)
      return res.status(404).json({ success: false, message: "Not found" });

    const requirementsList =
      bundle.requirements && bundle.requirements.length > 0
        ? bundle.requirements
        : JSON.parse(bundle.template || "[]");

    res.json({
      success: true,
      id: bundle.id,
      name: bundle.name,
      description: bundle.description,
      requirements: requirementsList,
      status: bundle.status,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

async function getFieldCount(bundleId) {
  const [result] = await sequelize.query(
    `
    SELECT COUNT(*) as count 
    FROM document_requirements 
    WHERE bundle_id = ?
  `,
    { replacements: [bundleId] },
  );
  return result[0].count;
}
