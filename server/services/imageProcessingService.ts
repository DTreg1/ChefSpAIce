import sharp from "sharp";
import { logger } from "../lib/logger";

export interface ProcessedImage {
  display: Buffer;
  thumbnail: Buffer;
}

const DISPLAY_MAX_WIDTH = 800;
const THUMBNAIL_MAX_WIDTH = 200;
const WEBP_QUALITY_DISPLAY = 80;
const WEBP_QUALITY_THUMBNAIL = 70;

export async function processImage(inputBuffer: Buffer): Promise<ProcessedImage> {
  const startTime = Date.now();

  const source = sharp(inputBuffer);
  const metadata = await source.metadata();
  const originalSize = inputBuffer.length;
  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;

  const [display, thumbnail] = await Promise.all([
    source.clone()
      .resize({
        width: DISPLAY_MAX_WIDTH,
        height: DISPLAY_MAX_WIDTH,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY_DISPLAY })
      .toBuffer(),

    source.clone()
      .resize({
        width: THUMBNAIL_MAX_WIDTH,
        height: THUMBNAIL_MAX_WIDTH,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY_THUMBNAIL })
      .toBuffer(),
  ]);

  const elapsed = Date.now() - startTime;
  const totalProcessedSize = display.length + thumbnail.length;
  const savings = Math.round((1 - totalProcessedSize / originalSize) * 100);

  logger.info("Image processed", {
    originalSize: `${(originalSize / 1024).toFixed(1)}KB`,
    originalDimensions: `${originalWidth}x${originalHeight}`,
    displaySize: `${(display.length / 1024).toFixed(1)}KB`,
    thumbnailSize: `${(thumbnail.length / 1024).toFixed(1)}KB`,
    savings: `${savings}%`,
    elapsed: `${elapsed}ms`,
  });

  return { display, thumbnail };
}

export async function processImageFromBase64(base64Data: string): Promise<ProcessedImage> {
  const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/i, "");
  const buffer = Buffer.from(cleanBase64, "base64");
  return processImage(buffer);
}
