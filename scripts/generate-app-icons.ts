import sharp from "sharp";
import { mdiChefHat } from "@mdi/js";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = "assets/app-icon";
const SIZES = [1024, 512, 180, 167, 152, 120, 87, 80, 60, 58, 40, 29];

function generateSVG(size: number, cornerRadius: number): string {
  const iconScale = size * 0.55;
  const iconOffset = (size - iconScale) / 2;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Green base gradient -->
    <linearGradient id="greenBase" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4ADE80"/>
      <stop offset="50%" style="stop-color:#22C55E"/>
      <stop offset="100%" style="stop-color:#16A34A"/>
    </linearGradient>
    
    <!-- Glass overlay gradient -->
    <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.35)"/>
      <stop offset="40%" style="stop-color:rgba(255,255,255,0.12)"/>
      <stop offset="100%" style="stop-color:rgba(255,255,255,0.18)"/>
    </linearGradient>
    
    <!-- Specular highlight gradient -->
    <linearGradient id="specularHighlight" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.7)"/>
      <stop offset="25%" style="stop-color:rgba(255,255,255,0.3)"/>
      <stop offset="50%" style="stop-color:rgba(255,255,255,0)"/>
    </linearGradient>
    
    <!-- Edge highlight gradient -->
    <linearGradient id="edgeHighlight" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.6)"/>
      <stop offset="50%" style="stop-color:rgba(255,255,255,0.15)"/>
      <stop offset="100%" style="stop-color:rgba(255,255,255,0.25)"/>
    </linearGradient>
    
    <!-- Inner glow filter -->
    <filter id="innerGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${size * 0.02}" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    
    <!-- Icon drop shadow -->
    <filter id="iconShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="${size * 0.02}" stdDeviation="${size * 0.025}" flood-color="rgba(0,0,0,0.35)"/>
      <feDropShadow dx="0" dy="${size * 0.008}" stdDeviation="${size * 0.012}" flood-color="rgba(0,0,0,0.25)"/>
    </filter>
    
    <!-- Clip path for rounded rectangle -->
    <clipPath id="roundedClip">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}"/>
    </clipPath>
  </defs>
  
  <!-- Background with green + glass effect -->
  <g clip-path="url(#roundedClip)">
    <!-- Solid green base -->
    <rect x="0" y="0" width="${size}" height="${size}" fill="url(#greenBase)"/>
    
    <!-- Glass overlay -->
    <rect x="0" y="0" width="${size}" height="${size}" fill="url(#glassGradient)"/>
    
    <!-- Specular highlight (top half) -->
    <rect x="0" y="0" width="${size}" height="${size * 0.45}" fill="url(#specularHighlight)"/>
    
    <!-- Inner glow overlay -->
    <rect x="0" y="0" width="${size}" height="${size}" fill="rgba(255,255,255,0.06)" filter="url(#innerGlow)"/>
  </g>
  
  <!-- Border/edge highlight -->
  <rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="${Math.max(0, cornerRadius - 1)}" ry="${Math.max(0, cornerRadius - 1)}" 
        fill="none" stroke="url(#edgeHighlight)" stroke-width="2"/>
  
  <!-- Outer border -->
  <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" 
        fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
  
  <!-- Chef hat icon with shadow (no background) -->
  <g transform="translate(${iconOffset}, ${iconOffset}) scale(${iconScale / 24})" filter="url(#iconShadow)">
    <path d="${mdiChefHat}" fill="white" fill-rule="evenodd"/>
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
