import express from "express";
import { authenticateToken } from "../Controllers/authController.js";
import {
  createClient,
  getClients,
  deleteClient,
  updateClientRole,
  sendError,
  sendSuccess,
} from "../Controllers/clientController.js";
import bcrypt from "bcrypt";
import { Client } from "../models/index.js";
import { Op } from "sequelize";

const router = express.Router();
router.use(authenticateToken);

router.post("/", createClient);
router.get("/", getClients);
router.delete("/:id", deleteClient);
router.patch("/:id/role", updateClientRole);
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    if (!name && !email) {
      return sendError(res, 400, "Nothing to update", "NO_FIELDS_PROVIDED");
    }

    const client = await Client.findByPk(id);
    if (!client) {
      return sendError(res, 404, "Client not found", "NOT_FOUND");
    }

    if (client.workspace_id !== req.workspaceId) {
      return sendError(res, 403, "Not authorized for this client", "FORBIDDEN");
    }

    const updates = {};
    if (name) {
      updates.name = String(name).trim();
    }

    if (email) {
      const cleanEmail = String(email).trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return sendError(res, 400, "Invalid email format", "INVALID_EMAIL");
      }

      const existing = await Client.findOne({
        where: {
          email: cleanEmail,
          workspace_id: req.workspaceId,
          id: { [Op.ne]: id },
        },
      });
      if (existing) {
        return sendError(
          res,
          409,
          "Email already in use in this workspace",
          "DUPLICATE_EMAIL",
        );
      }

      updates.email = cleanEmail;
    }

    if (Object.keys(updates).length === 0) {
      return sendError(res, 400, "No valid fields to update", "INVALID_UPDATE");
    }

    await client.update(updates);

    return sendSuccess(res, 200, "Client updated successfully", {
      id: client.id,
      name: client.name,
      email: client.email,
      role: client.role,
      updatedAt: client.updatedAt,
    });
  } catch (error) {
    console.error("Update client error:", error);
    return sendError(res, 500, "Server error", "SERVER_ERROR");
  }
});

router.post("/change-password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const clientId = req.user.userId;

    const client = await Client.findByPk(clientId);
    if (!client) return res.status(404).json({ message: "Client not found" });

    const isCurrentValid = await bcrypt.compare(
      currentPassword,
      client.password,
    );
    if (!isCurrentValid)
      return res.status(400).json({ message: "Current password incorrect" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await client.update({ password: hashedPassword });

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
