const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const assetsDir = path.join(__dirname, "..", "assets", "images");

const appIconSvg = path.join(assetsDir, "app-icon.svg");
const splashIconSvg = path.join(assetsDir, "splash-icon.svg");

const appIconPng = path.join(assetsDir, "app-icon.png");
const splashIconPng = path.join(assetsDir, "splash-icon.png");

async function main() {
  if (!fs.existsSync(appIconSvg) || !fs.existsSync(splashIconSvg)) {
    console.error("Missing SVG files in assets/images");
    process.exit(1);
  }

  // App Icon (1024x1024)
  await sharp(appIconSvg).resize(1024, 1024).png().toFile(appIconPng);

  console.log("✅ Generated app-icon.png");

  // Splash Icon (1024x1024)
  await sharp(splashIconSvg).resize(1024, 1024).png().toFile(splashIconPng);

  console.log("✅ Generated splash-icon.png");
}

main();
