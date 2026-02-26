/**
 * Generates padded app-icon.png and splash-icon.png from SVGs.
 * This prevents the icons from being cut off on Android devices.
 */
const fs = require("fs");
const path = require("path");

const assetsDir = path.join(__dirname, "..", "assets", "images");
const appIconSvg = path.join(assetsDir, "app-icon.svg");
const splashIconSvg = path.join(assetsDir, "splash-icon.svg");
const appIconPng = path.join(assetsDir, "app-icon.png");
const splashIconPng = path.join(assetsDir, "splash-icon.png");

async function main() {
  const sharp = require("sharp");

  if (!fs.existsSync(appIconSvg) || !fs.existsSync(splashIconSvg)) {
    console.error("Missing SVG files in assets/images");
    process.exit(1);
  }

  // 1. GENERATE APP ICON (With 20% Safe-Zone Padding)
  // We shrink the logo to 660px inside a 1024px canvas
  await sharp(appIconSvg)
    .resize(660, 660, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: 182,
      bottom: 182,
      left: 182,
      right: 182,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(appIconPng);
  console.log("✅ Generated: Padded App Icon");

  // 2. GENERATE SPLASH ICON
  // Splash icons usually look better if they are slightly smaller
  await sharp(splashIconSvg)
    .resize(512, 512, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(splashIconPng);
  console.log("✅ Generated: Splash Icon");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
