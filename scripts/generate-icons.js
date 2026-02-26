/**
 * Generates app-icon.png and splash-icon.png from SVGs only.
 * Run before build when app-icon.svg or splash-icon.svg change: npm run generate:icons
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

  if (!fs.existsSync(appIconSvg)) {
    console.error("Missing:", appIconSvg);
    process.exit(1);
  }
  if (!fs.existsSync(splashIconSvg)) {
    console.error("Missing:", splashIconSvg);
    process.exit(1);
  }

  await sharp(appIconSvg).resize(1024, 1024).png().toFile(appIconPng);
  console.log("Generated:", appIconPng);

  const splashSvg = await sharp(splashIconSvg);
  const meta = await splashSvg.metadata();
  const scale = 1024 / Math.max(meta.width, meta.height);
  const w = Math.round(meta.width * scale);
  const h = Math.round(meta.height * scale);
  const left = Math.round((1024 - w) / 2);
  const top = Math.round((1024 - h) / 2);
  const splashResized = await sharp(splashIconSvg).resize(w, h).toBuffer();
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: splashResized, left, top }])
    .png()
    .toFile(splashIconPng);
  console.log("Generated:", splashIconPng);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
