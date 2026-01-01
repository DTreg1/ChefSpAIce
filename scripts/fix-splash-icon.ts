import sharp from 'sharp';
import path from 'path';

async function fixSplashIcon() {
  const inputPath = path.join(process.cwd(), 'assets/images/splash-icon.png');
  const outputPath = path.join(process.cwd(), 'assets/images/splash-icon-new.png');
  
  console.log('Loading splash icon...');
  
  const size = 1024;
  
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const channels = info.channels;
  const newData = Buffer.from(data);
  
  function getPixel(x: number, y: number) {
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
  
  function findNearestOpaqueInward(startX: number, startY: number) {
    const centerX = size / 2;
    const centerY = size / 2;
    
    const dx = centerX - startX;
    const dy = centerY - startY;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ndx = dx / len;
    const ndy = dy / len;
    
    for (let d = 0; d < 300; d++) {
      const x = Math.round(startX + ndx * d);
      const y = Math.round(startY + ndy * d);
      
      if (x >= 0 && x < size && y >= 0 && y < size) {
        const pixel = getPixel(x, y);
        if (pixel.a === 255) {
          return pixel;
        }
      }
    }
    
    return { r: 39, g: 174, b: 96, a: 255 };
  }
  
  console.log('Filling transparent corners...');
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const pixel = getPixel(x, y);
      
      if (pixel.a < 255) {
        const nearest = findNearestOpaqueInward(x, y);
        setPixel(x, y, nearest.r, nearest.g, nearest.b, 255);
      }
    }
  }
  
  await sharp(newData, {
    raw: { width: size, height: size, channels: channels }
  })
    .png()
    .toFile(outputPath);
  
  console.log(`Splash icon fixed! Saved to ${outputPath}`);
  
  const fs = await import('fs');
  fs.copyFileSync(outputPath, inputPath);
  fs.unlinkSync(outputPath);
  console.log('Replaced original file.');
}

fixSplashIcon().catch(console.error);
