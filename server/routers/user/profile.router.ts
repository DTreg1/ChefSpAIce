import { Router, Request, Response } from "express";
import multer from "multer";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { objectStorageClient, ObjectStorageService } from "../../integrations/objectStorage";
import { storage } from "../../storage/index";

const router = Router();
const objectStorage = new ObjectStorageService();

/**
 * GET /
 * Returns the authenticated user's profile information.
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user;
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to fetch profile" 
    });
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'));
    }
  },
});

router.post("/picture", upload.single("picture"), async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const userId = req.user.id;
    const fileExtension = 'webp'; // We'll convert all images to webp for consistency
    const fileName = `profile-pictures/${userId}-${randomUUID()}.${fileExtension}`;

    // Process and optimize the image
    const processedImage = await sharp(req.file.buffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 85 })
      .toBuffer();

    // Get the public search paths and use the first one
    const publicPaths = process.env.PUBLIC_OBJECT_SEARCH_PATHS;
    if (!publicPaths) {
      console.error("PUBLIC_OBJECT_SEARCH_PATHS not configured");
      return res.status(500).json({ message: "Object storage not configured" });
    }

    const publicPath = JSON.parse(publicPaths)[0];
    const fullPath = `${publicPath}/${fileName}`;
    
    // Parse the path to get bucket and object name
    const pathParts = fullPath.split('/').filter(Boolean);
    const bucketName = pathParts[0];
    const objectName = pathParts.slice(1).join('/');

    // Upload to object storage
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    
    await file.save(processedImage, {
      contentType: 'image/webp',
      metadata: {
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
    });

    // Generate the public URL
    const profileImageUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;

    // Update user's profile image URL in database
    await storage.updateUser(userId, { profileImageUrl });

    res.json({ 
      message: "Profile picture updated successfully",
      profileImageUrl 
    });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to upload profile picture" 
    });
  }
});

router.delete("/picture", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.user.id;
    
    // Update user's profile image URL to null
    await storage.updateUser(userId, { profileImageUrl: null });

    res.json({ message: "Profile picture removed successfully" });
  } catch (error) {
    console.error("Error removing profile picture:", error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to remove profile picture" 
    });
  }
});

export default router;
