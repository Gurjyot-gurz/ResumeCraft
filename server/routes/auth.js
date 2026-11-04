// ResumeCraft - auth routes: signup + login
"use strict";

const express = require("express");
const router = express.Router();
const path = require("path");
const { body, validationResult } = require("express-validator");
const { hashPassword, verifyPassword, signToken, verifyToken } = require("../middleware/auth");
const s3 = require("../services/s3");
const dynamodb = require("../services/dynamodb");

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
// Some browsers report DOC/DOCX files with different MIME types, so we also allow
// common alternatives and fallback to file extension check
const ALLOWED_MIME_EXTENSIONS = new Set([".pdf", ".doc", ".docx"]);
const MAX_RESUME_SIZE = 20 * 1024 * 1024; // 20MB

function isResumeAllowed(file) {
  if (!file || !file.originalname) return false;
  const ext = path.extname(file.originalname).toLowerCase();
  const isAllowedExt = ALLOWED_MIME_EXTENSIONS.has(ext);
  const isAllowedMime = ALLOWED_MIME.has(file.mimetype);
  // Allow if extension is valid OR if MIME type is in the strict list
  return isAllowedExt && (isAllowedMime || !file.mimetype || file.mimetype === "application/octet-stream");
}

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Validation failed", details: errors.array() });
  }
  return null;
}

// ---------- Sign up ----------
// Accepts multipart/form-data so the resume file can be uploaded directly.
router.post(
  "/signup",
  body("firstName").isString().trim().isLength({ min: 2, max: 100 }).withMessage("First name is required."),
  body("lastName").isString().trim().isLength({ min: 2, max: 100 }).withMessage("Last name is required."),
  body("email").isEmail().normalizeEmail().withMessage("A valid email is required."),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters."),
  body("phone").isString().trim().isLength({ min: 7, max: 20 }).withMessage("A valid phone number is required."),
  body("candidateLevel").isString().trim().isLength({ min: 1 }).withMessage("Candidate level is required."),
  body("terms").equals("on").withMessage("You must accept the terms."),
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return validationError;

    const { firstName, middleName, lastName, email, phone, password, candidateLevel, candidateLevelLabel } = req.body;
    const file = req.file; // uploaded by upload middleware

    // Resume is required at signup.
    if (!file || !isResumeAllowed(file)) {
      return res.status(400).json({ error: "Resume is required.", field: "resume" });
    }
    if (file.size > MAX_RESUME_SIZE) {
      return res.status(400).json({ error: "File size must be less than 20MB.", field: "resume" });
    }

    // Duplicate email check in DynamoDB
    const existingUser = await dynamodb.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }

    // Store the resume (S3 or local fallback)
    const stored = await s3.storeFile(file.buffer, file.originalname, file.mimetype);

    const passwordHash = await hashPassword(password);

    const resumeData = {
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      storage: stored.mode,
      key: stored.key,
      location: stored.location,
    };

    const userData = {
      firstName: firstName.trim(),
      middleName: (middleName || "").trim() || null,
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone,
      passwordHash,
      candidateLevel,
      candidateLevelLabel: candidateLevelLabel || candidateLevel,
      role: "candidate",
      resume: resumeData,
      createdAt: new Date().toISOString(),
    };

    // Store user in DynamoDB
    const storedUser = await dynamodb.storeUser(userData);

    const token = signToken(storedUser);
    // Never send the password hash back.
    const { passwordHash: _, ...publicUser } = storedUser;
    return res.json({ token, user: publicUser });
  }
);

// ---------- Log in ----------
router.post(
  "/login",
  body("email").isEmail().normalizeEmail().withMessage("A valid email is required."),
  body("password").isString().isLength({ min: 1 }).withMessage("Password is required."),
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return validationError;

    const { email, password } = req.body;
    const user = await dynamodb.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = signToken(user);
    const { passwordHash: _, ...publicUser } = user;
    return res.json({ token, user: publicUser });
  }
);

// ---------- Current user ----------
// Returns the logged-in user's profile (name, email, role) from the JWT.
// The dashboard uses this to greet the user by their real name instead of a
// generic placeholder, and to reset all per-user counters to zero.
router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }

  const user = await dynamodb.findUserById(payload.sub);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const { passwordHash: _, ...publicUser } = user;
  return res.json({ user: publicUser });
});

module.exports = router;