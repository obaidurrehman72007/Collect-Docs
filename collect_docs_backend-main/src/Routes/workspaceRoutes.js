// src/Routes/workspaceRoutes.js
import express from "express";
import {
  listWorkspaces,
  createWorkspace,
  updateWorkspace,
  addMember,
  getWorkspace,
  deleteWorkspace,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
} from "../Controllers/workspaceController.js";
import authMiddleware from "../Middlewares/auth.js";

const router = express.Router();

// All routes below require a valid Bearer token
router.get("/", authMiddleware, listWorkspaces);
router.get("/:id", authMiddleware, getWorkspace);
router.post("/", authMiddleware, createWorkspace);
router.put("/:id", authMiddleware, updateWorkspace);
router.delete("/:id", authMiddleware, deleteWorkspace);
router.post("/:id/members", authMiddleware, addMember);
router.post("/:id/staff", authMiddleware, createStaffMember);
router.put("/:id/members/:memberId", authMiddleware, updateStaffMember);
router.delete("/:id/members/:memberId", authMiddleware, deleteStaffMember);

export default router;
