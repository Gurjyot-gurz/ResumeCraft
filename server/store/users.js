// ResumeCraft - simple JSON-file user store
//
// Persisted to ./data/users.json. Good enough for the MVP; swap for a real
// database (Postgres/SQLite) before going to production.
"use strict";

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]", "utf8");
}

function readAll() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8") || "[]");
  } catch {
    return [];
  }
}

function writeAll(users) {
  ensureStore();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

function findByEmail(email) {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  return readAll().find((u) => u.email === e) || null;
}

function insert(user) {
  const users = readAll();
  if (users.some((u) => u.email === user.email)) {
    const err = new Error("An account with that email already exists.");
    err.status = 409;
    throw err;
  }
  users.push(user);
  writeAll(users);
  return user;
}

module.exports = { readAll, findByEmail, insert };