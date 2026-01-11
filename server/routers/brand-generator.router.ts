import { Router, Request, Response } from "express";
import sharp from "sharp";

const router = Router();

const brandData = {
  appName: "ChefSpAIce",
  tagline: "Your AI-Powered Kitchen Assistant",
  
  colors: {
    primary: {
      hex: "#5E8C3A",
      rgb: "rgb(94, 140, 58)",
      usage: "Primary brand color - buttons, accents, highlights"
    },
    secondary: {
      hex: "#E67E22",
      rgb: "rgb(230, 126, 34)",
      usage: "Secondary accent - warnings, calls to action"
    },
    accent: {
      hex: "#3498DB",
      rgb: "rgb(52, 152, 219)",
      usage: "Links, interactive elements"
    },
    success: {
      hex: "#2ECC71",
      rgb: "rgb(46, 204, 113)",
      usage: "Success states, confirmations"
    },
    warning: {
      hex: "#F39C12",
      rgb: "rgb(243, 156, 18)",
      usage: "Warnings, expiration alerts"
    },
    error: {
      hex: "#E74C3C",
      rgb: "rgb(231, 76, 60)",
      usage: "Errors, destructive actions"
    },
    background: {
      hex: "#F8F9FA",
      rgb: "rgb(248, 249, 250)",
      usage: "App background (light mode)"
    },
    text: {
      hex: "#2C3E50",
      rgb: "rgb(44, 62, 80)",
      usage: "Primary text color"
    },
    textSecondary: {
      hex: "#495057",
      rgb: "rgb(73, 80, 87)",
      usage: "Secondary/muted text"
    }
  },

  logo: {
    icon: "chef-hat",
    iconSource: "MaterialCommunityIcons (@expo/vector-icons)",
    style: "iOS 26 Liquid Glass Button",
    glassEffect: "clear",
    container: {
      width: 240,
      height: 240,
      borderRadius: 60,
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.12)"
    },
    iconStyle: {
      size: 175,
      color: "rgba(255, 255, 255, 0.7)",
      shadow: "drop-shadow(0px 0px 24px rgba(0, 0, 0, 1))"
    },
    appIconVariant: {
      size: 1024,
      backgroundGradient: ["#1a5c3a", "#4ade80"],
      iconColor: "#FFFFFF"
    }
  },

  glassDesign: {
    style: "iOS 26 Liquid Glass",
    light: {
      background: "rgba(255, 255, 255, 0.75)",
      border: "rgba(160, 165, 175, 0.5)",
      shadowColor: "rgba(31, 38, 135, 0.15)"
    },
    dark: {
      background: "rgba(0, 0, 0, 0.2)",
      border: "rgba(255, 255, 255, 0.15)",
      shadowColor: "rgba(0, 0, 0, 0.4)"
    },
    blur: {
      subtle: 4,
      regular: 6,
      strong: 10,
      intense: 20
    },
    borderRadius: {
      sm: 12,
      md: 16,
      lg: 20,
      xl: 24,
      pill: 32
    }
  },

  typography: {
    fontFamily: {
      web: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      ios: "system-ui (SF Pro)",
      android: "Roboto"
    },
    sizes: {
      h1: { fontSize: 28, lineHeight: 36, fontWeight: 700 },
      h2: { fontSize: 24, lineHeight: 32, fontWeight: 700 },
      h3: { fontSize: 20, lineHeight: 28, fontWeight: 600 },
      h4: { fontSize: 18, lineHeight: 26, fontWeight: 600 },
      body: { fontSize: 16, lineHeight: 24, fontWeight: 400 },
      small: { fontSize: 14, lineHeight: 20, fontWeight: 400 },
      caption: { fontSize: 13, lineHeight: 18, fontWeight: 500 }
    }
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    "2xl": 32,
    "3xl": 40,
    "4xl": 48
  }
};

const chefHatSvgPath = `M50 18c-8 0-14.5 6-15.5 13.5C28 32 23 37.5 23 44.5c0 4 1.8 7.6 4.5 10V72c0 2.2 1.8 4 4 4h37c2.2 0 4-1.8 4-4V54.5c2.7-2.4 4.5-6 4.5-10 0-7-5-12.5-11.5-13C64.5 24 58 18 50 18zm-15 56v-8h30v8H35zm30-12H35v-6h30v6zm7.5-20c0 3.5-2 6.5-5 8h-35c-3-1.5-5-4.5-5-8 0-5 4-9 9-9 .5 0 1 0 1.5.1 1-6 6-10.1 12-10.1s11 4.1 12 10.1c.5-.1 1-.1 1.5-.1 5 0 9 4 9 9z`;

function generateLogoSvg(size: number, bgColor: string = "transparent", iconColor: string = "#FFFFFF"): string {
  const padding = size * 0.1;
  const iconSize = size - (padding * 2);
  const scale = iconSize / 100;
  
  const hasBackground = bgColor !== "transparent";
  const borderRadius = size * 0.25;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    ${hasBackground ? `
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a5c3a"/>
      <stop offset="100%" stop-color="#4ade80"/>
    </linearGradient>
    ` : ''}
    <filter id="iconShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.5)"/>
    </filter>
  </defs>
  ${hasBackground ? `<rect width="${size}" height="${size}" rx="${borderRadius}" fill="url(#bgGradient)"/>` : ''}
  <g transform="translate(${padding}, ${padding}) scale(${scale})" filter="url(#iconShadow)">
    <path d="${chefHatSvgPath}" fill="${iconColor}"/>
  </g>
</svg>`;
}

router.get("/", (req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ChefSpAIce Brand Assets</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      color: #fff;
      padding: 40px 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    
    h1 {
      font-size: 48px;
      font-weight: 700;
      text-align: center;
      margin-bottom: 8px;
      background: linear-gradient(90deg, #4ade80, #22c55e);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .tagline {
      text-align: center;
      color: rgba(255,255,255,0.7);
      font-size: 18px;
      margin-bottom: 48px;
    }
    
    .section {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 32px;
      margin-bottom: 32px;
    }
    .section h2 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 24px;
      color: #4ade80;
    }
    .section h3 {
      font-size: 18px;
      font-weight: 600;
      margin: 24px 0 16px;
      color: rgba(255,255,255,0.9);
    }
    
    /* Logo Preview */
    .logo-preview {
      display: flex;
      flex-wrap: wrap;
      gap: 32px;
      justify-content: center;
      margin-bottom: 24px;
    }
    .logo-item {
      text-align: center;
    }
    .logo-item img, .logo-item .logo-display {
      display: block;
      margin: 0 auto 12px;
    }
    .logo-display {
      width: 200px;
      height: 200px;
      border-radius: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }
    .logo-display.glass {
      background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%);
      backdrop-filter: blur(20px);
      border: 2px solid rgba(255,255,255,0.12);
      box-shadow: 0 10px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2);
    }
    .logo-display.gradient {
      background: linear-gradient(135deg, #1a5c3a 0%, #4ade80 100%);
    }
    .logo-display svg {
      filter: drop-shadow(0px 0px 20px rgba(0,0,0,0.8));
    }
    .logo-label {
      font-size: 14px;
      color: rgba(255,255,255,0.6);
    }
    
    /* Download Buttons */
    .downloads {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: center;
    }
    .btn {
      background: linear-gradient(135deg, #5E8C3A 0%, #4ade80 100%);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(74, 222, 128, 0.3);
    }
    .btn.secondary {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
    }
    
    /* Color Swatches */
    .colors-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }
    .color-card {
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      overflow: hidden;
    }
    .color-swatch {
      height: 80px;
      display: flex;
      align-items: flex-end;
      padding: 8px 12px;
    }
    .color-swatch span {
      font-size: 12px;
      font-weight: 600;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }
    .color-info {
      padding: 12px;
    }
    .color-name {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .color-value {
      font-family: monospace;
      font-size: 13px;
      color: rgba(255,255,255,0.7);
    }
    .color-usage {
      font-size: 12px;
      color: rgba(255,255,255,0.5);
      margin-top: 8px;
    }
    
    /* Typography */
    .type-samples {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .type-sample {
      display: flex;
      align-items: baseline;
      gap: 24px;
      padding: 16px;
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
    }
    .type-label {
      width: 80px;
      font-size: 12px;
      color: rgba(255,255,255,0.5);
      text-transform: uppercase;
    }
    .type-example { flex: 1; }
    .type-specs {
      font-family: monospace;
      font-size: 12px;
      color: rgba(255,255,255,0.5);
    }
    
    /* Spacing */
    .spacing-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: flex-end;
    }
    .spacing-item {
      text-align: center;
    }
    .spacing-box {
      background: linear-gradient(135deg, #5E8C3A 0%, #4ade80 100%);
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .spacing-label {
      font-size: 12px;
      color: rgba(255,255,255,0.6);
    }
    .spacing-value {
      font-family: monospace;
      font-size: 11px;
      color: rgba(255,255,255,0.4);
    }
    
    /* Glass Design */
    .glass-demo {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }
    .glass-card {
      flex: 1;
      min-width: 280px;
      padding: 24px;
      border-radius: 20px;
    }
    .glass-card.light {
      background: rgba(255,255,255,0.75);
      border: 1px solid rgba(160,165,175,0.5);
      color: #1a1a1a;
    }
    .glass-card.dark {
      background: rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.15);
    }
    .glass-card h4 { margin-bottom: 12px; }
    .glass-specs {
      font-family: monospace;
      font-size: 12px;
      opacity: 0.7;
    }
    
    /* Code Block */
    .code-block {
      background: rgba(0,0,0,0.3);
      border-radius: 12px;
      padding: 16px;
      font-family: monospace;
      font-size: 13px;
      overflow-x: auto;
      white-space: pre;
      color: #a5d6ff;
      margin-top: 16px;
    }
    
    /* JSON Export */
    .json-toggle {
      margin-top: 24px;
    }
    #jsonOutput {
      display: none;
      margin-top: 16px;
    }
    #jsonOutput.show { display: block; }
  </style>
</head>
<body>
  <div class="container">
    <h1>ChefSpAIce</h1>
    <p class="tagline">Brand Asset Generator</p>
    
    <!-- Logo Section -->
    <div class="section">
      <h2>Logo Assets</h2>
      
      <div class="logo-preview">
        <div class="logo-item">
          <div class="logo-display glass">
            <svg width="140" height="140" viewBox="0 0 100 100">
              <path d="${chefHatSvgPath}" fill="rgba(255,255,255,0.9)"/>
            </svg>
          </div>
          <span class="logo-label">Liquid Glass (Landing Page)</span>
        </div>
        
        <div class="logo-item">
          <div class="logo-display gradient">
            <svg width="140" height="140" viewBox="0 0 100 100">
              <path d="${chefHatSvgPath}" fill="#FFFFFF"/>
            </svg>
          </div>
          <span class="logo-label">App Icon (Gradient BG)</span>
        </div>
        
        <div class="logo-item">
          <div class="logo-display" style="background: #fff; border: 1px solid rgba(0,0,0,0.1);">
            <svg width="140" height="140" viewBox="0 0 100 100">
              <path d="${chefHatSvgPath}" fill="#5E8C3A"/>
            </svg>
          </div>
          <span class="logo-label">Icon Only (Light BG)</span>
        </div>
      </div>
      
      <h3>Download Logo Files</h3>
      <div class="downloads">
        <button class="btn" onclick="downloadLogo('png', 1024)">PNG 1024x1024</button>
        <button class="btn" onclick="downloadLogo('png', 512)">PNG 512x512</button>
        <button class="btn" onclick="downloadLogo('png', 256)">PNG 256x256</button>
        <button class="btn" onclick="downloadLogo('svg')">SVG Vector</button>
        <button class="btn secondary" onclick="downloadLogo('favicon')">favicon.ico</button>
        <button class="btn secondary" onclick="downloadLogo('icon-only')">Icon Only (no BG)</button>
      </div>
      
      <h3>Logo Specifications</h3>
      <div class="code-block">Icon: chef-hat (MaterialCommunityIcons)
Style: iOS 26 Liquid Glass Button
Container: 240x240px, border-radius: 60px
Border: 2px solid rgba(255,255,255,0.12)
Icon Size: 175px
Icon Color: rgba(255,255,255,0.7)
Icon Shadow: drop-shadow(0px 0px 24px rgba(0,0,0,1))
Glass Effect: clear (expo-glass-effect GlassView)</div>
    </div>
    
    <!-- Colors Section -->
    <div class="section">
      <h2>Brand Colors</h2>
      <div class="colors-grid">
        ${Object.entries(brandData.colors).map(([name, color]) => `
        <div class="color-card">
          <div class="color-swatch" style="background: ${color.hex}">
            <span>${color.hex}</span>
          </div>
          <div class="color-info">
            <div class="color-name">${name.charAt(0).toUpperCase() + name.slice(1)}</div>
            <div class="color-value">${color.rgb}</div>
            <div class="color-usage">${color.usage}</div>
          </div>
        </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Typography Section -->
    <div class="section">
      <h2>Typography</h2>
      
      <h3>Font Family</h3>
      <div class="code-block">Web: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif
iOS: SF Pro (system-ui)
Android: Roboto</div>
      
      <h3>Type Scale</h3>
      <div class="type-samples">
        <div class="type-sample">
          <span class="type-label">H1</span>
          <span class="type-example" style="font-size: 28px; font-weight: 700; line-height: 36px;">Heading One</span>
          <span class="type-specs">28px / 36px / 700</span>
        </div>
        <div class="type-sample">
          <span class="type-label">H2</span>
          <span class="type-example" style="font-size: 24px; font-weight: 700; line-height: 32px;">Heading Two</span>
          <span class="type-specs">24px / 32px / 700</span>
        </div>
        <div class="type-sample">
          <span class="type-label">H3</span>
          <span class="type-example" style="font-size: 20px; font-weight: 600; line-height: 28px;">Heading Three</span>
          <span class="type-specs">20px / 28px / 600</span>
        </div>
        <div class="type-sample">
          <span class="type-label">H4</span>
          <span class="type-example" style="font-size: 18px; font-weight: 600; line-height: 26px;">Heading Four</span>
          <span class="type-specs">18px / 26px / 600</span>
        </div>
        <div class="type-sample">
          <span class="type-label">Body</span>
          <span class="type-example" style="font-size: 16px; font-weight: 400; line-height: 24px;">Body text for paragraphs and content</span>
          <span class="type-specs">16px / 24px / 400</span>
        </div>
        <div class="type-sample">
          <span class="type-label">Small</span>
          <span class="type-example" style="font-size: 14px; font-weight: 400; line-height: 20px;">Smaller supporting text</span>
          <span class="type-specs">14px / 20px / 400</span>
        </div>
        <div class="type-sample">
          <span class="type-label">Caption</span>
          <span class="type-example" style="font-size: 13px; font-weight: 500; line-height: 18px;">Captions and labels</span>
          <span class="type-specs">13px / 18px / 500</span>
        </div>
      </div>
    </div>
    
    <!-- Glass Design Section -->
    <div class="section">
      <h2>iOS 26 Liquid Glass Design</h2>
      
      <div class="glass-demo">
        <div class="glass-card light">
          <h4>Light Mode</h4>
          <div class="glass-specs">
background: rgba(255,255,255,0.75)
border: rgba(160,165,175,0.5)
blur: 6px (regular)</div>
        </div>
        <div class="glass-card dark">
          <h4>Dark Mode</h4>
          <div class="glass-specs">
background: rgba(0,0,0,0.2)
border: rgba(255,255,255,0.15)
blur: 6px (regular)</div>
        </div>
      </div>
      
      <h3>Border Radius Scale</h3>
      <div class="spacing-grid" style="margin-top: 16px;">
        ${Object.entries(brandData.glassDesign.borderRadius).map(([name, value]) => `
        <div class="spacing-item">
          <div class="spacing-box" style="width: 60px; height: 40px; border-radius: ${value}px;"></div>
          <div class="spacing-label">${name}</div>
          <div class="spacing-value">${value}px</div>
        </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Spacing Section -->
    <div class="section">
      <h2>Spacing Scale</h2>
      <div class="spacing-grid">
        ${Object.entries(brandData.spacing).map(([name, value]) => `
        <div class="spacing-item">
          <div class="spacing-box" style="width: ${value}px; height: ${value}px;"></div>
          <div class="spacing-label">${name}</div>
          <div class="spacing-value">${value}px</div>
        </div>
        `).join('')}
      </div>
    </div>
    
    <!-- JSON Export -->
    <div class="section">
      <h2>Export Brand Data</h2>
      <button class="btn" onclick="toggleJson()">View/Copy JSON</button>
      <button class="btn secondary" onclick="downloadJson()">Download JSON</button>
      <div id="jsonOutput">
        <div class="code-block" style="max-height: 400px; overflow-y: auto;">${JSON.stringify(brandData, null, 2)}</div>
      </div>
    </div>
  </div>
  
  <script>
    async function downloadLogo(format, size) {
      let url;
      let filename;
      
      switch(format) {
        case 'png':
          url = '/api/brand/logo.png?size=' + size;
          filename = 'chefspaice-logo-' + size + '.png';
          break;
        case 'svg':
          url = '/api/brand/logo.svg';
          filename = 'chefspaice-logo.svg';
          break;
        case 'favicon':
          url = '/api/brand/favicon.ico';
          filename = 'favicon.ico';
          break;
        case 'icon-only':
          url = '/api/brand/icon.svg';
          filename = 'chefspaice-icon.svg';
          break;
        default:
          return;
      }
      
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error('Download failed:', err);
        alert('Download failed. Please try again.');
      }
    }
    
    function toggleJson() {
      document.getElementById('jsonOutput').classList.toggle('show');
    }
    
    function downloadJson() {
      const data = ${JSON.stringify(brandData)};
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chefspaice-brand.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>`;
  
  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

router.get("/logo.png", async (req: Request, res: Response) => {
  const size = parseInt(req.query.size as string) || 1024;
  const svg = generateLogoSvg(size, "gradient", "#FFFFFF");
  
  try {
    const png = await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toBuffer();
    
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="chefspaice-logo-${size}.png"`);
    res.send(png);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate PNG" });
  }
});

router.get("/logo.svg", (req: Request, res: Response) => {
  const svg = generateLogoSvg(1024, "gradient", "#FFFFFF");
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Content-Disposition", 'attachment; filename="chefspaice-logo.svg"');
  res.send(svg);
});

router.get("/icon.svg", (req: Request, res: Response) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <path d="${chefHatSvgPath}" fill="#5E8C3A"/>
</svg>`;
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Content-Disposition", 'attachment; filename="chefspaice-icon.svg"');
  res.send(svg);
});

router.get("/favicon.ico", async (req: Request, res: Response) => {
  const svg = generateLogoSvg(32, "gradient", "#FFFFFF");
  
  try {
    const png = await sharp(Buffer.from(svg))
      .resize(32, 32)
      .png()
      .toBuffer();
    
    res.setHeader("Content-Type", "image/x-icon");
    res.setHeader("Content-Disposition", 'attachment; filename="favicon.ico"');
    res.send(png);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate favicon" });
  }
});

router.get("/data.json", (req: Request, res: Response) => {
  res.json(brandData);
});

export default router;
