// ResumeCraft - S3 storage service
//
// Wraps AWS S3 operations behind a simple interface so the rest of the app
// never talks to the SDK directly. Falls back to local disk storage when
// AWS credentials are not configured, so the app keeps working before you
// finish setting up AWS.
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

function loadConfig() {
  return {
    mode: (process.env.STORAGE_MODE || "local").toLowerCase(),
    bucket: process.env.AWS_S3_BUCKET || "",
    region: process.env.AWS_REGION || "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  };
}

let _s3Client = null;
function getS3Client(cfg) {
  if (_s3Client) return _s3Client;
  if (!cfg.accessKeyId || !cfg.secretAccessKey) {
    throw new Error("AWS credentials are not configured (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY).");
  }
  _s3Client = new S3Client({ region: cfg.region, credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey } });
  return _s3Client;
}

// Build a unique, collision-resistant object key for a resume.
// e.g. resumes/2026/11/02/<uuid>.pdf
function buildKey(originalName) {
  const ext = path.extname(originalName || "").slice(0, 10) || ".bin";
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  const id = crypto.randomBytes(12).toString("hex");
  return `resumes/${date}/${id}${ext}`;
}

function isS3Mode(cfg) {
  return cfg.mode === "s3" && Boolean(cfg.accessKeyId && cfg.secretAccessKey && cfg.bucket);
}

// Returns a "location" string and a flag of where the file lives.
// mode: "s3" | "local"
async function storeFile(buffer, originalName, mimeType) {
  const cfg = loadConfig();
  const key = buildKey(originalName);

  if (isS3Mode(cfg)) {
    const client = getS3Client(cfg);
    await client.send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType || "application/octet-stream",
        // Bucket has ACL disabled, so we do NOT set ACL here.
        // Default SSE-S3 encryption is already on at the bucket level.
      })
    );
    return { mode: "s3", key, location: `s3://${cfg.bucket}/${key}` };
  }

  // Local fallback
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const filePath = path.join(UPLOADS_DIR, key.replace(/\//g, path.sep));
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return { mode: "local", key, location: filePath };
}

async function retrieveFile(location) {
  const cfg = loadConfig();
  if (location.startsWith("s3://")) {
    const rest = location.slice("s3://".length);
    const bucket = rest.split("/")[0];
    const key = rest.slice(bucket.length + 1);
    const client = getS3Client(cfg);
    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return res.Body;
  }
  return fs.createReadStream(location);
}

async function deleteFile(location) {
  const cfg = loadConfig();
  if (location.startsWith("s3://")) {
    const rest = location.slice("s3://".length);
    const bucket = rest.split("/")[0];
    const key = rest.slice(bucket.length + 1);
    const client = getS3Client(cfg);
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return;
  }
  if (fs.existsSync(location)) fs.unlinkSync(location);
}

module.exports = { loadConfig, isS3Mode, storeFile, retrieveFile, deleteFile, buildKey };