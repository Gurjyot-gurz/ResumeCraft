// ResumeCraft - process entry point
//
// Run:  node server.js
// Or:   npm start
"use strict";

const app = require("./server/app");
const PORT = parseInt(process.env.PORT, 10) || 3000;

const server = app.listen(PORT, () => {
  console.log(`ResumeCraft backend running on http://localhost:${PORT}`);
  const s3 = require("./server/services/s3");
  const cfg = s3.loadConfig();
  console.log(`Storage mode: ${cfg.mode}${s3.isS3Mode(cfg) ? " (S3 bucket: " + cfg.bucket + ")" : " (local fallback — set AWS_* env vars to use S3)"}`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));