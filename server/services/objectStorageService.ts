import { Client } from "@replit/object-storage";
import { logger } from "../lib/logger";
import { processImageFromBase64, processImage } from "./imageProcessingService";

const storageClient = new Client();

const PUBLIC_PREFIX = process.env.PUBLIC_OBJECT_SEARCH_PATHS?.split('/').slice(2).join('/') || 'public';

export interface UploadedImageUrls {
  displayUrl: string;
  thumbnailUrl: string | null;
}

async function uploadProcessedImages(
  recipeId: string,
  displayBuffer: Buffer,
  thumbnailBuffer: Buffer
): Promise<UploadedImageUrls> {
  const displayPath = `${PUBLIC_PREFIX}/recipe-images/${recipeId}.webp`;
  const thumbnailPath = `${PUBLIC_PREFIX}/recipe-images/${recipeId}-thumb.webp`;

  const displayResult = await storageClient.uploadFromBytes(displayPath, displayBuffer);
  if (!displayResult.ok) {
    logger.error("Display image upload failed", { error: displayResult.error.message });
    throw new Error(`Failed to upload display image: ${displayResult.error.message}`);
  }

  const thumbnailResult = await storageClient.uploadFromBytes(thumbnailPath, thumbnailBuffer);
  let thumbnailUrl: string | null = null;

  if (!thumbnailResult.ok) {
    logger.warn("Thumbnail upload failed, display image saved successfully", {
      recipeId,
      error: thumbnailResult.error.message,
    });
  } else {
    thumbnailUrl = getPublicUrl(thumbnailPath);
  }

  const displayUrl = getPublicUrl(displayPath);
  logger.info("Uploaded processed recipe images", { recipeId, displayUrl, thumbnailUrl });

  return { displayUrl, thumbnailUrl };
}

export async function uploadRecipeImage(
  recipeId: string,
  base64Data: string,
  _contentType: string = "image/jpeg"
): Promise<UploadedImageUrls> {
  const processed = await processImageFromBase64(base64Data);
  return uploadProcessedImages(recipeId, processed.display, processed.thumbnail);
}

export async function uploadRecipeImageFromBuffer(
  recipeId: string,
  imageBuffer: Buffer
): Promise<UploadedImageUrls> {
  const processed = await processImage(imageBuffer);
  return uploadProcessedImages(recipeId, processed.display, processed.thumbnail);
}

export async function deleteRecipeImage(recipeId: string): Promise<void> {
  const paths = [
    `${PUBLIC_PREFIX}/recipe-images/${recipeId}.webp`,
    `${PUBLIC_PREFIX}/recipe-images/${recipeId}-thumb.webp`,
    `${PUBLIC_PREFIX}/recipe-images/${recipeId}.jpg`,
  ];

  for (const objectPath of paths) {
    try {
      const existsResult = await storageClient.exists(objectPath);
      if (existsResult.ok && existsResult.value) {
        const deleteResult = await storageClient.delete(objectPath);
        if (deleteResult.ok) {
          logger.info("Deleted recipe image", { recipeId, objectPath });
        } else {
          logger.error("Object storage delete failed", { error: deleteResult.error.message });
        }
      }
    } catch (error) {
      logger.error("Error deleting recipe image", { recipeId, error: error instanceof Error ? error.message : String(error) });
    }
  }
}

export async function getRecipeImageUrl(recipeId: string): Promise<string | null> {
  const webpPath = `${PUBLIC_PREFIX}/recipe-images/${recipeId}.webp`;
  const jpgPath = `${PUBLIC_PREFIX}/recipe-images/${recipeId}.jpg`;

  try {
    const webpResult = await storageClient.exists(webpPath);
    if (webpResult.ok && webpResult.value) {
      return getPublicUrl(webpPath);
    }

    const jpgResult = await storageClient.exists(jpgPath);
    if (jpgResult.ok && jpgResult.value) {
      return getPublicUrl(jpgPath);
    }
  } catch (error) {
    logger.error("Error checking recipe image", { recipeId, error: error instanceof Error ? error.message : String(error) });
  }

  return null;
}

export async function getRecipeImageUrls(recipeId: string): Promise<UploadedImageUrls | null> {
  const webpDisplayPath = `${PUBLIC_PREFIX}/recipe-images/${recipeId}.webp`;
  const thumbnailPath = `${PUBLIC_PREFIX}/recipe-images/${recipeId}-thumb.webp`;
  const jpgPath = `${PUBLIC_PREFIX}/recipe-images/${recipeId}.jpg`;

  try {
    const webpResult = await storageClient.exists(webpDisplayPath);
    if (webpResult.ok && webpResult.value) {
      let thumbnailUrl: string | null = null;
      const thumbResult = await storageClient.exists(thumbnailPath);
      if (thumbResult.ok && thumbResult.value) {
        thumbnailUrl = getPublicUrl(thumbnailPath);
      }
      return {
        displayUrl: getPublicUrl(webpDisplayPath),
        thumbnailUrl,
      };
    }

    const jpgResult = await storageClient.exists(jpgPath);
    if (jpgResult.ok && jpgResult.value) {
      return {
        displayUrl: getPublicUrl(jpgPath),
        thumbnailUrl: null,
      };
    }
  } catch (error) {
    logger.error("Error checking recipe images", { recipeId, error: error instanceof Error ? error.message : String(error) });
  }

  return null;
}

function getPublicUrl(objectPath: string): string {
  const bucketId = process.env.PUBLIC_OBJECT_SEARCH_PATHS?.split('/')[1] || 
    process.env.REPLIT_DEFAULT_BUCKET_ID || '';
  return `https://storage.googleapis.com/${bucketId}/${objectPath}`;
}
