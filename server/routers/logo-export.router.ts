import { Router, Request, Response } from "express";
import sharp from "sharp";

const router = Router();

const CHEF_HAT_SVG_PATH = `M12,5A2,2 0 0,1 14,3A2,2 0 0,1 16,5V6H17A2,2 0 0,1 19,8V9H20A2,2 0 0,1 22,11V12L21,22H3L2,12V11A2,2 0 0,1 4,9H5V8A2,2 0 0,1 7,6H8V5A2,2 0 0,1 10,3A2,2 0 0,1 12,5M7,18H9V14H7V18M11,18H13V14H11V18M15,18H17V14H15V18Z`;

function generateLogoSVG(size: number = 512, includeBackground: boolean = true): string {
  const padding = size * 0.15;
  const iconSize = size - padding * 2;
  const iconScale = iconSize / 24;
  const iconOffset = padding;
  const cornerRadius = size * 0.22;

  const backgroundGradient = includeBackground ? `
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#1a1a2e"/>
        <stop offset="100%" style="stop-color:#0d0d1a"/>
      </linearGradient>
      <linearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:rgba(255,255,255,0.25)"/>
        <stop offset="50%" style="stop-color:rgba(255,255,255,0.08)"/>
        <stop offset="100%" style="stop-color:rgba(255,255,255,0.15)"/>
      </linearGradient>
      <linearGradient id="iconGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#ffffff"/>
        <stop offset="100%" style="stop-color:#c0c0c0"/>
      </linearGradient>
      <filter id="iconShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.4)"/>
      </filter>
      <filter id="glassBlur" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2"/>
      </filter>
    </defs>
    <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" fill="url(#bgGrad)"/>
  ` : `
    <defs>
      <linearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:rgba(255,255,255,0.25)"/>
        <stop offset="50%" style="stop-color:rgba(255,255,255,0.08)"/>
        <stop offset="100%" style="stop-color:rgba(255,255,255,0.15)"/>
      </linearGradient>
      <linearGradient id="iconGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#ffffff"/>
        <stop offset="100%" style="stop-color:#c0c0c0"/>
      </linearGradient>
      <filter id="iconShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.4)"/>
      </filter>
    </defs>
  `;

  const glassButtonSize = size * 0.7;
  const glassButtonOffset = (size - glassButtonSize) / 2;
  const glassCornerRadius = glassButtonSize * 0.25;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  ${backgroundGradient}
  
  <!-- Glass button background -->
  <rect 
    x="${glassButtonOffset}" 
    y="${glassButtonOffset}" 
    width="${glassButtonSize}" 
    height="${glassButtonSize}" 
    rx="${glassCornerRadius}" 
    ry="${glassCornerRadius}" 
    fill="url(#glassGrad)"
    stroke="rgba(255,255,255,0.3)"
    stroke-width="1"
  />
  
  <!-- Specular highlight on glass -->
  <ellipse 
    cx="${size / 2}" 
    cy="${glassButtonOffset + glassButtonSize * 0.2}" 
    rx="${glassButtonSize * 0.35}" 
    ry="${glassButtonSize * 0.1}" 
    fill="rgba(255,255,255,0.15)"
  />
  
  <!-- Chef hat icon with shadow -->
  <g transform="translate(${iconOffset}, ${iconOffset}) scale(${iconScale})" filter="url(#iconShadow)">
    <path d="${CHEF_HAT_SVG_PATH}" fill="url(#iconGrad)"/>
  </g>
</svg>`;
}

function generateIconOnlySVG(size: number = 512): string {
  const iconScale = size / 24;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="iconGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff"/>
      <stop offset="100%" style="stop-color:#c0c0c0"/>
    </linearGradient>
  </defs>
  <g transform="scale(${iconScale})">
    <path d="${CHEF_HAT_SVG_PATH}" fill="url(#iconGrad)"/>
  </g>
</svg>`;
}

router.get("/svg", (req: Request, res: Response) => {
  const size = parseInt(req.query.size as string) || 512;
  const withBg = req.query.background !== "false";
  
  const svg = generateLogoSVG(size, withBg);
  
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Content-Disposition", `attachment; filename="chefspace-logo-${size}.svg"`);
  res.send(svg);
});

router.get("/icon-svg", (req: Request, res: Response) => {
  const size = parseInt(req.query.size as string) || 512;
  
  const svg = generateIconOnlySVG(size);
  
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Content-Disposition", `attachment; filename="chefspace-icon-${size}.svg"`);
  res.send(svg);
});

router.get("/png", async (req: Request, res: Response) => {
  try {
    const size = parseInt(req.query.size as string) || 512;
    const withBg = req.query.background !== "false";
    
    const svg = generateLogoSVG(size, withBg);
    
    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
    
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="chefspace-logo-${size}.png"`);
    res.send(pngBuffer);
  } catch (error) {
    console.error("Error generating PNG:", error);
    res.status(500).json({ error: "Failed to generate PNG" });
  }
});

router.get("/favicon.ico", async (req: Request, res: Response) => {
  try {
    const svg = generateLogoSVG(32, true);
    
    const pngBuffer = await sharp(Buffer.from(svg))
      .resize(32, 32)
      .png()
      .toBuffer();
    
    res.setHeader("Content-Type", "image/x-icon");
    res.setHeader("Content-Disposition", "attachment; filename=\"favicon.ico\"");
    res.send(pngBuffer);
  } catch (error) {
    console.error("Error generating favicon:", error);
    res.status(500).json({ error: "Failed to generate favicon" });
  }
});

router.get("/favicon-png", async (req: Request, res: Response) => {
  try {
    const sizes = [16, 32, 48, 64, 128, 256];
    const requestedSize = parseInt(req.query.size as string);
    const size = sizes.includes(requestedSize) ? requestedSize : 32;
    
    const svg = generateLogoSVG(size, true);
    
    const pngBuffer = await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toBuffer();
    
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="favicon-${size}x${size}.png"`);
    res.send(pngBuffer);
  } catch (error) {
    console.error("Error generating favicon PNG:", error);
    res.status(500).json({ error: "Failed to generate favicon PNG" });
  }
});

router.get("/apple-touch-icon", async (req: Request, res: Response) => {
  try {
    const size = 180;
    const svg = generateLogoSVG(size, true);
    
    const pngBuffer = await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toBuffer();
    
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", "attachment; filename=\"apple-touch-icon.png\"");
    res.send(pngBuffer);
  } catch (error) {
    console.error("Error generating Apple touch icon:", error);
    res.status(500).json({ error: "Failed to generate Apple touch icon" });
  }
});

router.get("/", (req: Request, res: Response) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  
  res.json({
    message: "Logo Export API",
    endpoints: {
      svg: {
        url: `${baseUrl}/api/logo/svg`,
        params: "?size=512&background=true",
        description: "Full logo as SVG with glass effect"
      },
      iconSvg: {
        url: `${baseUrl}/api/logo/icon-svg`,
        params: "?size=512",
        description: "Chef hat icon only as SVG"
      },
      png: {
        url: `${baseUrl}/api/logo/png`,
        params: "?size=512&background=true",
        description: "Full logo as PNG"
      },
      favicon: {
        url: `${baseUrl}/api/logo/favicon.ico`,
        description: "32x32 favicon"
      },
      faviconPng: {
        url: `${baseUrl}/api/logo/favicon-png`,
        params: "?size=32 (16, 32, 48, 64, 128, 256)",
        description: "Favicon as PNG in various sizes"
      },
      appleTouchIcon: {
        url: `${baseUrl}/api/logo/apple-touch-icon`,
        description: "180x180 Apple touch icon"
      }
    }
  });
});

export default router;
