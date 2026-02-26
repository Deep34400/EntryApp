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

  /**
   * 1. GENERATE APP ICON
   * We shrink the logo to 580px (approx 56%) to ensure it fits
   * perfectly within Android's circular mask "Safe Zone".
   */
  await sharp(appIconSvg)
    .resize(580, 580, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // Force transparency
    })
    .extend({
      top: 222,
      bottom: 222,
      left: 222,
      right: 222,
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // Padding is transparent
    })
    .png()
    .toFile(appIconPng);
  console.log("✅ Generated: Padded App Icon (Transparent)");

  /**
   * 2. GENERATE SPLASH ICON
   * Centered splash logo.
   */
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
