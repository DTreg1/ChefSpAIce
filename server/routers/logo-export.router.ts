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
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Logo Downloads</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e; 
      color: #fff; 
      padding: 40px; 
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { margin-bottom: 30px; }
    .preview { 
      background: #0d0d1a; 
      padding: 40px; 
      border-radius: 16px; 
      text-align: center;
      margin-bottom: 30px;
    }
    .preview img { max-width: 200px; }
    .downloads { display: grid; gap: 12px; }
    button.btn { 
      display: block;
      width: 100%;
      text-align: left;
      background: rgba(255,255,255,0.1); 
      color: #fff; 
      padding: 16px 24px; 
      border-radius: 8px; 
      border: none;
      cursor: pointer;
      font-size: 16px;
      transition: background 0.2s;
    }
    button.btn:hover { background: rgba(255,255,255,0.2); }
    button.btn:disabled { opacity: 0.5; cursor: wait; }
    .btn span { opacity: 0.6; font-size: 14px; }
    h2 { margin-top: 30px; margin-bottom: 15px; font-size: 18px; opacity: 0.8; }
  </style>
</head>
<body>
  <h1>ChefSpAIce Logo Downloads</h1>
  
  <div class="preview">
    <img src="/api/logo/png?size=256" alt="Logo Preview">
  </div>
  
  <h2>Full Logo (with background)</h2>
  <div class="downloads">
    <button class="btn" onclick="download('/api/logo/png?size=1024', 'chefspace-logo-1024.png')">
      PNG 1024x1024 <span>- High resolution</span>
    </button>
    <button class="btn" onclick="download('/api/logo/png?size=512', 'chefspace-logo-512.png')">
      PNG 512x512 <span>- Standard</span>
    </button>
    <button class="btn" onclick="download('/api/logo/svg', 'chefspace-logo.svg')">
      SVG <span>- Vector format, scalable</span>
    </button>
  </div>
  
  <h2>Favicons</h2>
  <div class="downloads">
    <button class="btn" onclick="download('/api/logo/favicon.ico', 'favicon.ico')">
      favicon.ico <span>- 32x32</span>
    </button>
    <button class="btn" onclick="download('/api/logo/favicon-png?size=16', 'favicon-16x16.png')">
      favicon-16x16.png
    </button>
    <button class="btn" onclick="download('/api/logo/favicon-png?size=32', 'favicon-32x32.png')">
      favicon-32x32.png
    </button>
    <button class="btn" onclick="download('/api/logo/favicon-png?size=48', 'favicon-48x48.png')">
      favicon-48x48.png
    </button>
  </div>
  
  <h2>App Icons</h2>
  <div class="downloads">
    <button class="btn" onclick="download('/api/logo/apple-touch-icon', 'apple-touch-icon.png')">
      Apple Touch Icon <span>- 180x180</span>
    </button>
    <button class="btn" onclick="download('/api/logo/png?size=192', 'icon-192x192.png')">
      Android Icon <span>- 192x192</span>
    </button>
    <button class="btn" onclick="download('/api/logo/png?size=512', 'icon-512x512.png')">
      PWA Icon <span>- 512x512</span>
    </button>
  </div>
  
  <h2>Icon Only (no background)</h2>
  <div class="downloads">
    <button class="btn" onclick="download('/api/logo/icon-svg', 'chefspace-icon.svg')">
      SVG Icon Only <span>- Just the chef hat</span>
    </button>
    <button class="btn" onclick="download('/api/logo/png?size=512&background=false', 'chefspace-icon-512.png')">
      PNG Icon Only <span>- Transparent background</span>
    </button>
  </div>

  <script>
    async function download(url, filename) {
      const btn = event.target.closest('button');
      btn.disabled = true;
      const originalText = btn.innerHTML;
      btn.innerHTML = 'Downloading...';
      
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(objectUrl);
        btn.innerHTML = 'Downloaded!';
        setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 1500);
      } catch (err) {
        btn.innerHTML = 'Error - try again';
        setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2000);
      }
    }
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

export default router;
