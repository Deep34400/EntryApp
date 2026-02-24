#!/usr/bin/env node
/**
 * One script for build, update, submit. Reads APP_TYPE from .env:
 *   APP_TYPE=production  → profile/branch "production" (deploy)
 *   APP_TYPE=development → profile/branch "preview" (internal)
 * Usage: node scripts/eas.js build | update | submit
 * Update with message: node scripts/eas.js update "Your message"
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

// Load .env
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return;
    const i = t.indexOf("=");
    if (i <= 0) return;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[k] = v;
  });
}

const appType = (process.env.APP_TYPE || "development").toLowerCase().trim();
const isProd = appType === "production";
const profile = isProd ? "production" : "preview";

const cmd = process.argv[2];
if (!cmd) {
  console.log("Usage: npm run build | npm run update | npm run submit");
  console.log("APP_TYPE in .env: development (internal) or production (deploy)");
  process.exit(1);
}

if (cmd === "build") {
  console.log("APP_TYPE=" + appType + " → building " + profile);
  const r = spawnSync("eas", ["build", "--profile", profile, "--platform", "android", "--non-interactive"], { stdio: "inherit", shell: true });
  process.exit(r.status ?? 1);
}

if (cmd === "update") {
  console.log("APP_TYPE=" + appType + " → updating branch " + profile);
  const args = ["update", "--branch", profile, "--non-interactive"];
  // Support: npm run update -- "msg"  or  npm run update -- --message "msg"  or  npm run update -- word1 word2
  const rest = process.argv.slice(3);
  let msg;
  if (rest[0] === "--message") {
    msg = rest[1] || "";
  } else if (rest.length) {
    msg = rest.join(" ");
  }
  if (msg) {
    args.push("--message", msg);
  } else {
    console.log("No message provided. Use: npm run update -- \"Your update message\"");
    process.exit(1);
  }
  // Don't use shell: true — it re-parses the command and splits the message on spaces
  const r = spawnSync("eas", args, { stdio: "inherit" });
  process.exit(r.status ?? 1);
}

if (cmd === "submit") {
  if (!isProd) {
    console.log("Submit is for production only. APP_TYPE is " + appType + ". Skipping.");
    process.exit(0);
  }
  const r = spawnSync("eas", ["submit", "--platform", "android", "--latest", "--non-interactive"], { stdio: "inherit", shell: true });
  process.exit(r.status ?? 1);
}

console.log("Unknown command: " + cmd + ". Use build, update, or submit.");
process.exit(1);
