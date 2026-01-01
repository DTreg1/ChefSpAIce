import sharp from 'sharp';
import path from 'path';

async function fixSplashIcon() {
  const inputPath = path.join(process.cwd(), 'assets/images/icon.png');
  const outputPath = path.join(process.cwd(), 'assets/images/splash-icon.png');
  
  console.log('Loading icon.png as fresh source...');
  
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  const size = metadata.width!;
  
  console.log(`Image size: ${size}x${size}`);
  
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const channels = info.channels;
  const newData = Buffer.from(data);
  
  function getPixel(x: number, y: number) {
    x = Math.max(0, Math.min(size - 1, Math.round(x)));
    y = Math.max(0, Math.min(size - 1, Math.round(y)));
    const idx = (y * size + x) * channels;
    return {
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2],
      a: data[idx + 3]
    };
  }
  
  function setPixel(x: number, y: number, r: number, g: number, b: number, a: number) {
    const idx = (y * size + x) * channels;
    newData[idx] = r;
    newData[idx + 1] = g;
    newData[idx + 2] = b;
    newData[idx + 3] = a;
  }
  
  console.log('Sampling gradient colors from known clean areas...');
  
  const topSample = getPixel(size / 2, 250);
  const bottomSample = getPixel(size / 2, size - 250);
  const leftSample = getPixel(250, size / 2);
  const rightSample = getPixel(size - 250, size / 2);
  
  console.log('Samples:', { topSample, bottomSample, leftSample, rightSample });
  
  const topLeftCorner = {
    r: Math.round((topSample.r + leftSample.r) / 2 - 10),
    g: Math.round((topSample.g + leftSample.g) / 2),
    b: Math.round((topSample.b + leftSample.b) / 2)
  };
  const topRightCorner = {
    r: Math.round((topSample.r + rightSample.r) / 2 - 5),
    g: Math.round((topSample.g + rightSample.g) / 2),
    b: Math.round((topSample.b + rightSample.b) / 2)
  };
  const bottomLeftCorner = {
    r: Math.round((bottomSample.r + leftSample.r) / 2),
    g: Math.round((bottomSample.g + leftSample.g) / 2),
    b: Math.round((bottomSample.b + leftSample.b) / 2)
  };
  const bottomRightCorner = {
    r: Math.round((bottomSample.r + rightSample.r) / 2 + 10),
    g: Math.round((bottomSample.g + rightSample.g) / 2),
    b: Math.round((bottomSample.b + rightSample.b) / 2)
  };
  
  console.log('Corner colors:', { topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner });
  
  function getGradientColor(x: number, y: number): { r: number, g: number, b: number } {
    const tx = x / (size - 1);
    const ty = y / (size - 1);
    
    const topR = topLeftCorner.r * (1 - tx) + topRightCorner.r * tx;
    const topG = topLeftCorner.g * (1 - tx) + topRightCorner.g * tx;
    const topB = topLeftCorner.b * (1 - tx) + topRightCorner.b * tx;
    
    const bottomR = bottomLeftCorner.r * (1 - tx) + bottomRightCorner.r * tx;
    const bottomG = bottomLeftCorner.g * (1 - tx) + bottomRightCorner.g * tx;
    const bottomB = bottomLeftCorner.b * (1 - tx) + bottomRightCorner.b * tx;
    
    return {
      r: Math.round(topR * (1 - ty) + bottomR * ty),
      g: Math.round(topG * (1 - ty) + bottomG * ty),
      b: Math.round(topB * (1 - ty) + bottomB * ty)
    };
  }
  
  const paintRadius = 250;
  const edgeWidth = 25;
  
  function shouldPaint(x: number, y: number): boolean {
    const pixel = getPixel(x, y);
    if (pixel.a < 255) return true;
    
    const corners = [
      { cx: paintRadius, cy: paintRadius, inSquare: x < paintRadius && y < paintRadius },
      { cx: size - paintRadius, cy: paintRadius, inSquare: x >= size - paintRadius && y < paintRadius },
      { cx: paintRadius, cy: size - paintRadius, inSquare: x < paintRadius && y >= size - paintRadius },
      { cx: size - paintRadius, cy: size - paintRadius, inSquare: x >= size - paintRadius && y >= size - paintRadius }
    ];
    
    for (const corner of corners) {
      if (corner.inSquare) {
        const dx = x - corner.cx;
        const dy = y - corner.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > paintRadius * 0.6) {
          return true;
        }
      }
    }
    
    if (x < edgeWidth || x >= size - edgeWidth || y < edgeWidth || y >= size - edgeWidth) {
      return true;
    }
    
    return false;
  }
  
  console.log('Painting over corners and edges with gradient...');
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (shouldPaint(x, y)) {
        const color = getGradientColor(x, y);
        setPixel(x, y, color.r, color.g, color.b, 255);
      }
    }
  }
  
  await sharp(newData, {
    raw: { width: size, height: size, channels: channels }
  })
    .png()
    .toFile(outputPath);
  
  console.log(`Splash icon fixed! Saved to ${outputPath}`);
}

fixSplashIcon().catch(console.error);
