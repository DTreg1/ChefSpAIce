import sharp from "sharp";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [16, 32, 48, 64, 128, 192, 256, 512];

async function convertSvgToPng() {
  const svgPath = join(__dirname, "..", "icons", "chef-hat.svg");
  const svgBuffer = readFileSync(svgPath);

  console.log("Converting SVG to PNG at various sizes...\n");

  for (const size of sizes) {
    const outputPath = join(__dirname, "..", "public", `logo-${size}.png`);

    await sharp(svgBuffer)
      .resize(size, size)
      .png({ compressionLevel: 9, quality: 100 })
      .toFile(outputPath);

    console.log(`✓ Generated logo-${size}.png`);
  }

  // Also create apple-touch-icon
  const appleTouchPath = join(
    __dirname,
    "..",
    "public",
    "apple-touch-icon.png",
  );
  await sharp(svgBuffer)
    .resize(192, 192)
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(appleTouchPath);

  console.log("✓ Generated apple-touch-icon.png");
  console.log("\nAll PNG logos generated successfully!");
}

convertSvgToPng().catch(console.error);
