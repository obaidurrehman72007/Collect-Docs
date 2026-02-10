import express from "express";
import { authenticateToken } from "../Controllers/authController.js";
import {
  createBundle,
  getBundles,
  getBundleById,
  updateBundle,
  deleteBundle,
  getBundlePreview,
} from "../Controllers/bundleController.js";

const router = express.Router();

router.get("/:id/preview", getBundlePreview);

router.use(authenticateToken);

router.post("/", createBundle);
router.get("/", getBundles);
router.get("/:id", getBundleById);
router.put("/:id", updateBundle);
router.delete("/:id", deleteBundle);

export default router;
