import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";

const RECIPE_IMAGES_DIR = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}recipe-images/`
  : null;

const MAX_IMAGE_SIZE = 400;
const JPEG_QUALITY = 0.7;

async function ensureDirectoryExists(): Promise<void> {
  if (!RECIPE_IMAGES_DIR) return;

  const dirInfo = await FileSystem.getInfoAsync(RECIPE_IMAGES_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(RECIPE_IMAGES_DIR, {
      intermediates: true,
    });
  }
}

async function compressImage(base64Data: string): Promise<string> {
  try {
    const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/i, "");
    const dataUri = `data:image/png;base64,${cleanBase64}`;
    
    const result = await ImageManipulator.manipulateAsync(
      dataUri,
      [{ resize: { width: MAX_IMAGE_SIZE, height: MAX_IMAGE_SIZE } }],
      { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    
    if (result.base64) {
      console.log("[compressImage] Compressed from", cleanBase64.length, "to", result.base64.length);
      return result.base64;
    }
    return cleanBase64;
  } catch (error) {
    console.log("[compressImage] Compression failed, using original:", error);
    return base64Data.replace(/^data:image\/[a-z]+;base64,/i, "");
  }
}

export async function saveRecipeImage(
  recipeId: string,
  base64Data: string,
): Promise<string> {
  console.log("[saveRecipeImage] Starting save for recipe:", recipeId);
  console.log("[saveRecipeImage] Base64 data length:", base64Data?.length || 0);
  
  const compressedBase64 = await compressImage(base64Data);
  console.log("[saveRecipeImage] Compressed base64 length:", compressedBase64?.length || 0);

  if (Platform.OS === "web" || !RECIPE_IMAGES_DIR) {
    const dataUri = `data:image/jpeg;base64,${compressedBase64}`;
    console.log("[saveRecipeImage] Web platform - returning data URI, length:", dataUri.length);
    return dataUri;
  }

  await ensureDirectoryExists();

  const filename = `recipe-${recipeId}.png`;
  const fileUri = `${RECIPE_IMAGES_DIR}${filename}`;
  console.log("[saveRecipeImage] Saving to:", fileUri);

  await FileSystem.writeAsStringAsync(fileUri, compressedBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  console.log("[saveRecipeImage] File saved successfully:", fileUri);
  return fileUri;
}

export async function saveRecipeImageFromUrl(
  recipeId: string,
  imageUrl: string,
): Promise<string> {
  if (Platform.OS === "web" || !RECIPE_IMAGES_DIR) {
    return imageUrl;
  }

  await ensureDirectoryExists();

  const filename = `recipe-${recipeId}.png`;
  const fileUri = `${RECIPE_IMAGES_DIR}${filename}`;

  const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);

  if (downloadResult.status !== 200) {
    throw new Error(`Failed to download image: ${downloadResult.status}`);
  }

  return fileUri;
}

export async function deleteRecipeImage(recipeId: string): Promise<void> {
  if (Platform.OS === "web" || !RECIPE_IMAGES_DIR) return;

  const filename = `recipe-${recipeId}.png`;
  const fileUri = `${RECIPE_IMAGES_DIR}${filename}`;

  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (fileInfo.exists) {
    await FileSystem.deleteAsync(fileUri);
  }
}

