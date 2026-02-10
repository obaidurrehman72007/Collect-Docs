// src/Routes/reviewRoutes.js - ✅ MATCHES CONTROLLER
import express from "express";
import {
  reviewDocument,
  completeBundleRequest,
} from "../Controllers/reviewController.js";

const router = express.Router();

router.patch("/:submissionId", reviewDocument);
router.post("/complete/:requestId", completeBundleRequest);

export default router;
