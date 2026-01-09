import { Storage } from "@google-cloud/storage";
import path from "path";

const BUCKET_ID = process.env.REPLIT_DEFAULT_BUCKET_ID || 
  process.env.PUBLIC_OBJECT_SEARCH_PATHS?.split('/')[1] || 
  'replit-objstore-0b011cbe-41a0-407c-8cf9-2db304bad2cc';

const storage = new Storage();
const bucket = storage.bucket(BUCKET_ID);

export async function uploadRecipeImage(
  recipeId: string,
  base64Data: string,
  contentType: string = "image/jpeg"
): Promise<string> {
  const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/i, "");
  const buffer = Buffer.from(cleanBase64, "base64");
  
  const objectPath = `recipe-images/${recipeId}.jpg`;
  const file = bucket.file(objectPath);
  
  await file.save(buffer, {
    contentType,
    metadata: {
      cacheControl: "public, max-age=31536000",
    },
  });
  
  await file.makePublic();
  
  const publicUrl = `https://storage.googleapis.com/${BUCKET_ID}/${objectPath}`;
  console.log(`[ObjectStorage] Uploaded recipe image: ${publicUrl}`);
  
  return publicUrl;
}

export async function deleteRecipeImage(recipeId: string): Promise<void> {
  const objectPath = `recipe-images/${recipeId}.jpg`;
  const file = bucket.file(objectPath);
  
  try {
    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
      console.log(`[ObjectStorage] Deleted recipe image: ${objectPath}`);
    }
  } catch (error) {
    console.error(`[ObjectStorage] Error deleting recipe image:`, error);
  }
}

export async function getRecipeImageUrl(recipeId: string): Promise<string | null> {
  const objectPath = `recipe-images/${recipeId}.jpg`;
  const file = bucket.file(objectPath);
  
  try {
    const [exists] = await file.exists();
    if (exists) {
      return `https://storage.googleapis.com/${BUCKET_ID}/${objectPath}`;
    }
  } catch (error) {
    console.error(`[ObjectStorage] Error checking recipe image:`, error);
  }
  
  return null;
}
