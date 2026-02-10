//src/Routes/documentRoutes.js
import express from "express";
import {
  uploadDocument,
  getBundleRequestDocuments,
  approveDocument,
  rejectDocument,
} from "../Controllers/documentController.js";
import auth from "../Middlewares/auth.js";

const router = express.Router();

router.get("/:token", getBundleRequestDocuments);
router.post("/upload", uploadDocument);

router.put("/:submissionId/approve", auth, approveDocument);
router.put("/:submissionId/reject", auth, rejectDocument);

export default router;
