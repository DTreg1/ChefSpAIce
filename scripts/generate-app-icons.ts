import sharp from "sharp";
import { mdiChefHat } from "@mdi/js";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = "assets/app-icon";
const SIZES = [1024, 512, 180, 167, 152, 120, 87, 80, 60, 58, 40, 29];

function generateSVG(size: number, cornerRadius: number): string {
  const iconScale = size * 0.55;
  const scale = iconScale / 24;
  // The chef hat path is visually centered around (12.5, 11.75) in the 24x24 viewBox
  // Adjust to center it at (12, 12) then position in the icon
  const iconOffsetX = (size - iconScale) / 2 - 0.5 * scale;
  const iconOffsetY = (size - iconScale) / 2 + 0.25 * scale;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Glass overlay gradient (matches AppLogo) -->
    <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.30)"/>
      <stop offset="40%" style="stop-color:rgba(255,255,255,0.10)"/>
      <stop offset="100%" style="stop-color:rgba(255,255,255,0.15)"/>
    </linearGradient>
    
    <!-- Specular highlight gradient (matches AppLogo) -->
    <linearGradient id="specularHighlight" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.5)"/>
      <stop offset="25%" style="stop-color:rgba(255,255,255,0.2)"/>
      <stop offset="50%" style="stop-color:rgba(255,255,255,0)"/>
    </linearGradient>
    
    <!-- Edge highlight gradient (matches AppLogo border) -->
    <linearGradient id="edgeHighlight" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.5)"/>
      <stop offset="50%" style="stop-color:rgba(255,255,255,0.25)"/>
      <stop offset="100%" style="stop-color:rgba(255,255,255,0.15)"/>
    </linearGradient>
    
    
    <!-- Clip path for rounded rectangle -->
    <clipPath id="roundedClip">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}"/>
    </clipPath>
  </defs>
  
  <!-- Background with green + glass effect -->
  <g clip-path="url(#roundedClip)">
    <!-- Solid green base (matches AppLogo #1a2e05) -->
    <rect x="0" y="0" width="${size}" height="${size}" fill="#1a2e05"/>
    
    <!-- Glass overlay -->
    <rect x="0" y="0" width="${size}" height="${size}" fill="url(#glassGradient)"/>
    
    <!-- Specular highlight (top half) -->
    <rect x="0" y="0" width="${size}" height="${size * 0.45}" fill="url(#specularHighlight)"/>
  </g>
  
  <!-- Border/edge highlight -->
  <rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="${Math.max(0, cornerRadius - 1)}" ry="${Math.max(0, cornerRadius - 1)}" 
        fill="none" stroke="url(#edgeHighlight)" stroke-width="2"/>
  
  <!-- Outer border -->
  <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" 
        fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
  
  <!-- Chef hat icon (no shadow to avoid filter artifacts) -->
  <g transform="translate(${iconOffsetX}, ${iconOffsetY}) scale(${scale})">
    <path d="${mdiChefHat}" fill="rgba(255,255,255,0.85)" fill-rule="evenodd"/>
  </g>
</svg>`;
}

async function generateIcons() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log("Generating app icons...\n");

  for (const size of SIZES) {
    const iosRadius = Math.round(size * 0.2237);
    
    const roundedSvg = generateSVG(size, iosRadius);
    const squareSvg = generateSVG(size, 0);
    
    const roundedSvgPath = path.join(OUTPUT_DIR, `icon-${size}-rounded.svg`);
    const squareSvgPath = path.join(OUTPUT_DIR, `icon-${size}-square.svg`);
    const roundedPngPath = path.join(OUTPUT_DIR, `icon-${size}-rounded.png`);
    const squarePngPath = path.join(OUTPUT_DIR, `icon-${size}-square.png`);
    
    fs.writeFileSync(roundedSvgPath, roundedSvg);
    fs.writeFileSync(squareSvgPath, squareSvg);
    
    await sharp(Buffer.from(roundedSvg))
      .png()
      .toFile(roundedPngPath);
    
    await sharp(Buffer.from(squareSvg))
      .png()
      .toFile(squarePngPath);
    
    console.log(`  ${size}x${size}: PNG + SVG (rounded & square)`);
  }

  const masterSvgRounded = generateSVG(1024, Math.round(1024 * 0.2237));
  const masterSvgSquare = generateSVG(1024, 0);
  
  fs.writeFileSync(path.join(OUTPUT_DIR, "icon-master-rounded.svg"), masterSvgRounded);
  fs.writeFileSync(path.join(OUTPUT_DIR, "icon-master-square.svg"), masterSvgSquare);

  console.log("\nGenerated files in:", OUTPUT_DIR);
  console.log("  - icon-master-rounded.svg (1024x1024 vector)");
  console.log("  - icon-master-square.svg (1024x1024 vector, no radius)");
  console.log("  - PNG files for all iOS sizes (rounded & square)");
}

generateIcons().catch(console.error);
