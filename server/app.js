// ResumeCraft backend
//
// Entry point. Loads config from .env, mounts auth routes, and exposes
// the resume-upload endpoint used by the sign-up page.
"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");

const authRoutes = require("./routes/auth");
const s3 = require("./services/s3");

const app = express();

// ---- CORS ----
const corsOrigin = (process.env.CORS_ORIGINS || "*").split(",").map((s) => s.trim());
const corsOptions = {
  origin: corsOrigin,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

// Explicit CORS headers for all responses (handles edge cases with multer/form-data)
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (corsOrigin.includes("*") || corsOrigin.includes(requestOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin || "*");
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// ---- Body parsing ----
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ---- Resume upload (in-memory, validated before anything touches disk) ----
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_EXTENSIONS = new Set([".pdf", ".doc", ".docx"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const isAllowedExt = ALLOWED_EXTENSIONS.has(ext);
    const isAllowedMime = ALLOWED_MIME.has(file.mimetype);
    // Allow if extension is valid AND (MIME type is strict OR MIME type is generic/empty)
    const isAllowed = isAllowedExt && (isAllowedMime || !file.mimetype || file.mimetype === "application/octet-stream");
    if (!isAllowed) {
      return cb(new Error("Only PDF, DOC, or DOCX files are allowed."));
    }
    cb(null, true);
  },
});

// Attach the single resume file field to every auth route request.
app.use("/api/auth", (req, res, next) => upload.single("resume")(req, res, next));
app.use("/api/auth", authRoutes);

// ---- Health check ----
app.get("/api/health", (req, res) => {
  const cfg = s3.loadConfig();
  res.json({
    status: "ok",
    storage: {
      mode: cfg.mode,
      configured: s3.isS3Mode(cfg),
      bucket: cfg.bucket || null,
      region: cfg.region,
    },
  });
});

// ---- Error handler (multer errors + validation) ----
app.use((err, req, res, next) => {
  if (err) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File size must be less than 20MB.", field: "resume" });
    }
    return res.status(400).json({ error: err.message || "Bad request" });
  }
  next();
});

// ---- Serve the static front-end ----
const distDir = path.join(__dirname, "..");
app.use(express.static(distDir, { maxAge: "1d" }));

// Fallback to index.html for SPA-style routes is not needed here since each
// page is a separate file, but catch-all prevents 404 confusion for unknown
// API paths.
app.use("/api/*", (req, res) => res.status(404).json({ error: "Not found" }));

module.exports = app;