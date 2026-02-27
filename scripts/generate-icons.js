const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const assetsDir = path.join(__dirname, "..", "assets", "images");

const appIconSvg = path.join(assetsDir, "app-icon.svg");
const splashIconSvg = path.join(assetsDir, "splash-icon.svg");
const appIconPng = path.join(assetsDir, "app-icon.png");
const splashIconPng = path.join(assetsDir, "splash-icon.png");

async function main() {
  if (!fs.existsSync(appIconSvg)) {
    console.error("Missing app-icon.svg in assets/images");
    process.exit(1);
  }

  // App icon: generate from app-icon.svg
  await sharp(appIconSvg).resize(1024, 1024).png().toFile(appIconPng);
  console.log("✅ Generated app-icon.png");

  // Splash icon: from splash-icon.svg if present, else app-icon.svg
  const splashSource = fs.existsSync(splashIconSvg) ? splashIconSvg : appIconSvg;
  if (splashSource === appIconSvg) {
    console.log("Note: splash-icon.svg not found, using app-icon.svg for splash");
  }
  await sharp(splashSource).resize(1024, 1024).png().toFile(splashIconPng);
  console.log("✅ Generated splash-icon.png");
}

main();
