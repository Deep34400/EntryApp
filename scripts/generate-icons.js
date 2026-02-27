const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const assetsDir = path.join(__dirname, "..", "assets", "images");

const appIconSvg = path.join(assetsDir, "app-icon.svg");
const appIconPng = path.join(assetsDir, "app-icon.png");

async function main() {
  if (!fs.existsSync(appIconSvg)) {
    console.error("Missing app-icon.svg in assets/images");
    process.exit(1);
  }

  // App Icon only — generated from app-icon.svg
  await sharp(appIconSvg).resize(1024, 1024).png().toFile(appIconPng);
  console.log("✅ Generated app-icon.png");

  // Splash: use ./assets/images/splash-icon.png directly (no conversion)
}

main();
