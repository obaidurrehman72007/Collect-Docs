import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import i18n from "./Helpers/i18nHelper.js";

import authRoutes from "./Routes/authRoutes.js";
import clientRoutes from "./Routes/clientRoutes.js";
import adminRoutes from "./Routes/admin.js";
import bundleRoutes from "./Routes/bundleRoutes.js";
import bundleRequestRoutes from "./Routes/bundleRequestRoutes.js";
import documentRoutes from "./Routes/documentRoutes.js";
import workspaceRoutes from "./Routes/workspaceRoutes.js";

import { login, register } from "./Controllers/authController.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(
  cors({
    origin: process.env.NODE_ENV === "production"
      ? [process.env.FRONTEND_URL || "https://your-domain.com"]
      : ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept-Language"],
  })
);

app.use(express.json({ limit: "1024mb" }));
app.use(express.urlencoded({ extended: true, limit: "1024mb" }));
app.use(cookieParser());
app.use(i18n.middleware);

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/public", express.static(path.join(__dirname, "../public")));

app.post("/api/login", login);
app.post("/api/register", register);

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: req.t("health.ok") });
});

app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/bundles", bundleRoutes);
app.use("/api/bundle-requests", bundleRequestRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/workspaces", workspaceRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: req.t ? req.t("errors.notFound") : "Route not found",
    path: req.originalUrl,
  });
});

export { app };