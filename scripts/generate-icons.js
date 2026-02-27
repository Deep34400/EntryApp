const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const assetsDir = path.join(__dirname, "..", "assets", "images");
const assetAppiconDir = path.join(assetsDir, "assetAppicon");

const appIconSvg = path.join(assetsDir, "app-icon.svg");
const appIconPng = path.join(assetsDir, "app-icon.png");
const appstorePng = path.join(assetAppiconDir, "appstore.png");

async function main() {
  // App icon: use assetAppicon/appstore.png when present (production build); else generate from SVG
  if (fs.existsSync(appstorePng)) {
    fs.copyFileSync(appstorePng, appIconPng);
    console.log("✅ App icon: copied from assetAppicon/appstore.png");
  } else if (fs.existsSync(appIconSvg)) {
    await sharp(appIconSvg).resize(1024, 1024).png().toFile(appIconPng);
    console.log("✅ Generated app-icon.png from app-icon.svg");
  } else {
    console.error("Missing app icon: add assetAppicon/appstore.png or app-icon.svg in assets/images");
    process.exit(1);
  }

  // Splash: use ./assets/images/splash-icon.png directly (no conversion)
}

main();
