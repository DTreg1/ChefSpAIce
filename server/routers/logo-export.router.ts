import { Router, Request, Response, NextFunction } from "express";
import sharp from "sharp";

const router = Router();

const CHEF_HAT_SVG_PATH = `M12,5A2,2 0 0,1 14,3A2,2 0 0,1 16,5V6H17A2,2 0 0,1 19,8V9H20A2,2 0 0,1 22,11V12L21,22H3L2,12V11A2,2 0 0,1 4,9H5V8A2,2 0 0,1 7,6H8V5A2,2 0 0,1 10,3A2,2 0 0,1 12,5M7,18H9V14H7V18M11,18H13V14H11V18M15,18H17V14H15V18Z`;

function generateLogoSVG(size: number = 512, includeBackground: boolean = true): string {
  const cornerRadius = size * 0.25;
  const iconSize = size * 0.73;
  const iconScale = iconSize / 24;
  const iconOffset = (size - iconSize) / 2;

  const defs = `
    <defs>
      <linearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:rgba(255,255,255,0.18)"/>
        <stop offset="50%" style="stop-color:rgba(255,255,255,0.06)"/>
        <stop offset="100%" style="stop-color:rgba(255,255,255,0.12)"/>
      </linearGradient>
      <filter id="iconShadow" x="-100%" y="-100%" width="300%" height="300%">
        <feDropShadow dx="0" dy="0" stdDeviation="${size * 0.05}" flood-color="rgba(0,0,0,1)"/>
      </filter>
      <filter id="buttonShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="${size * 0.04}" stdDeviation="${size * 0.05}" flood-color="rgba(0,0,0,0.5)"/>
      </filter>
    </defs>
  `;

  const background = includeBackground ? `
    <rect x="0" y="0" width="${size}" height="${size}" fill="#1a1a2e"/>
  ` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  ${defs}
  ${background}
  
  <!-- Glass button with rounded corners -->
  <rect 
    x="0" 
    y="0" 
    width="${size}" 
    height="${size}" 
    rx="${cornerRadius}" 
    ry="${cornerRadius}" 
    fill="url(#glassGrad)"
    stroke="rgba(255,255,255,0.12)"
    stroke-width="${Math.max(2, size * 0.008)}"
    filter="url(#buttonShadow)"
  />
  
  <!-- Chef hat icon with drop shadow matching AppLogo style -->
  <g transform="translate(${iconOffset}, ${iconOffset}) scale(${iconScale})" filter="url(#iconShadow)">
    <path d="${CHEF_HAT_SVG_PATH}" fill="rgba(255,255,255,0.7)"/>
  </g>
</svg>`;
}

function generateIconOnlySVG(size: number = 512): string {
  const iconScale = size / 24;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <g transform="scale(${iconScale})">
    <path d="${CHEF_HAT_SVG_PATH}" fill="rgba(255,255,255,0.7)"/>
  </g>
</svg>`;
}

router.get("/svg", (req: Request, res: Response, _next: NextFunction) => {
  const size = parseInt(req.query.size as string) || 512;
  const withBg = req.query.background !== "false";
  
  const svg = generateLogoSVG(size, withBg);
  
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Content-Disposition", `attachment; filename="chefspace-logo-${size}.svg"`);
  res.send(svg);
});

router.get("/icon-svg", (req: Request, res: Response, _next: NextFunction) => {
  const size = parseInt(req.query.size as string) || 512;
  
  const svg = generateIconOnlySVG(size);
  
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Content-Disposition", `attachment; filename="chefspace-icon-${size}.svg"`);
  res.send(svg);
});

router.get("/png", async (req: Request, res: Response, next: NextFunction) => {
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
    next(error);
  }
});

router.get("/favicon.ico", async (req: Request, res: Response, next: NextFunction) => {
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
    next(error);
  }
});

router.get("/favicon-png", async (req: Request, res: Response, next: NextFunction) => {
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
    next(error);
  }
});

router.get("/apple-touch-icon", async (req: Request, res: Response, next: NextFunction) => {
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
    next(error);
  }
});

router.get("/", (req: Request, res: Response, _next: NextFunction) => {
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
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: #fff; 
      padding: 40px; 
      max-width: 900px;
      margin: 0 auto;
      min-height: 100vh;
    }
    h1 { margin-bottom: 30px; text-align: center; }
    .preview { 
      background: linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%);
      padding: 60px 40px; 
      border-radius: 24px; 
      text-align: center;
      margin-bottom: 40px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .preview iframe {
      border: none;
      border-radius: 16px;
      background: transparent;
    }
    .preview-label {
      margin-top: 20px;
      font-size: 14px;
      opacity: 0.6;
    }
    .downloads { display: grid; gap: 12px; }
    button.btn { 
      display: block;
      width: 100%;
      text-align: left;
      background: rgba(255,255,255,0.08); 
      color: #fff; 
      padding: 16px 24px; 
      border-radius: 12px; 
      border: 1px solid rgba(255,255,255,0.1);
      cursor: pointer;
      font-size: 16px;
      transition: all 0.2s;
    }
    button.btn:hover { 
      background: rgba(255,255,255,0.15); 
      border-color: rgba(255,255,255,0.2);
      transform: translateY(-1px);
    }
    button.btn:disabled { opacity: 0.5; cursor: wait; }
    .btn span { opacity: 0.6; font-size: 14px; }
    h2 { margin-top: 30px; margin-bottom: 15px; font-size: 18px; opacity: 0.8; }
  </style>
</head>
<body>
  <h1>ChefSpAIce Logo Downloads</h1>
  
  <div class="preview">
    <iframe src="/logo-preview" width="280" height="280" title="Logo Preview"></iframe>
    <div class="preview-label">Live AppLogo Component</div>
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
