import { Client } from "@replit/object-storage";
import { logger } from "../lib/logger";

const storageClient = new Client();

const PUBLIC_PREFIX = process.env.PUBLIC_OBJECT_SEARCH_PATHS?.split('/').slice(2).join('/') || 'public';

export async function uploadRecipeImage(
  recipeId: string,
  base64Data: string,
  _contentType: string = "image/jpeg"
): Promise<string> {
  const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/i, "");
  const buffer = Buffer.from(cleanBase64, "base64");
  
  const objectPath = `${PUBLIC_PREFIX}/recipe-images/${recipeId}.jpg`;
  
  const result = await storageClient.uploadFromBytes(objectPath, buffer);
  
  if (!result.ok) {
    logger.error("Object storage upload failed", { error: result.error.message });
    throw new Error(`Failed to upload image: ${result.error.message}`);
  }
  
  const publicUrl = getPublicUrl(objectPath);
  logger.info("Uploaded recipe image", { recipeId, url: publicUrl });
  
  return publicUrl;
}

export async function deleteRecipeImage(recipeId: string): Promise<void> {
  const objectPath = `${PUBLIC_PREFIX}/recipe-images/${recipeId}.jpg`;
  
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

export async function getRecipeImageUrl(recipeId: string): Promise<string | null> {
  const objectPath = `${PUBLIC_PREFIX}/recipe-images/${recipeId}.jpg`;
  
  try {
    const result = await storageClient.exists(objectPath);
    if (result.ok && result.value) {
      return getPublicUrl(objectPath);
    }
  } catch (error) {
    logger.error("Error checking recipe image", { recipeId, error: error instanceof Error ? error.message : String(error) });
  }
  
  return null;
}

function getPublicUrl(objectPath: string): string {
  const bucketId = process.env.PUBLIC_OBJECT_SEARCH_PATHS?.split('/')[1] || 
    process.env.REPLIT_DEFAULT_BUCKET_ID || '';
  return `https://storage.googleapis.com/${bucketId}/${objectPath}`;
}
