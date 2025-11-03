/**
 * Face Detection Service
 * 
 * Provides face detection capabilities using TensorFlow.js BlazeFace model.
 * Handles face detection, blurring, cropping, and privacy features.
 */

import * as tf from '@tensorflow/tfjs-node';
import * as blazeface from '@tensorflow-models/blazeface';
import sharp from 'sharp';
import { FaceDetection, InsertFaceDetection, PrivacySettings } from '@shared/schema';

interface FaceCoordinate {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  landmarks?: {
    leftEye?: { x: number; y: number };
    rightEye?: { x: number; y: number };
    nose?: { x: number; y: number };
    mouth?: { x: number; y: number };
    leftEar?: { x: number; y: number };
    rightEar?: { x: number; y: number };
  };
}

class FaceDetectionService {
  private model: blazeface.BlazeFaceModel | null = null;
  private modelLoadPromise: Promise<void> | null = null;

  /**
   * Initialize the BlazeFace model
   */
  private async ensureModelLoaded(): Promise<void> {
    if (this.model) return;
    
    if (!this.modelLoadPromise) {
      this.modelLoadPromise = this.loadModel();
    }
    
    await this.modelLoadPromise;
  }

  private async loadModel(): Promise<void> {
    try {
      console.log('Loading BlazeFace model...');
      this.model = await blazeface.load();
      console.log('BlazeFace model loaded successfully');
    } catch (error) {
      console.error('Failed to load BlazeFace model:', error);
      throw new Error('Failed to initialize face detection model');
    }
  }

  /**
   * Detect faces in an image
   */
  async detectFaces(imageBuffer: Buffer): Promise<{
    faces: FaceCoordinate[];
    imageWidth: number;
    imageHeight: number;
  }> {
    await this.ensureModelLoaded();
    
    if (!this.model) {
      throw new Error('Face detection model not initialized');
    }

    try {
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      const { width = 0, height = 0 } = metadata;

      // Convert image to tensor (ensure 3D tensor for BlazeFace)
      let imageTensor = tf.node.decodeImage(imageBuffer, 3);
      
      // If we got a 4D tensor (batch), squeeze it to 3D
      if (imageTensor.shape.length === 4) {
        const squeezed = tf.squeeze(imageTensor, [0]) as tf.Tensor3D;
        imageTensor.dispose();
        imageTensor = squeezed;
      }
      
      // Detect faces
      const predictions = await this.model.estimateFaces(imageTensor as tf.Tensor3D, false);
      
      // Clean up tensor
      imageTensor.dispose();

      // Convert predictions to normalized coordinates
      const faces: FaceCoordinate[] = predictions.map((prediction: any) => {
        const topLeft = prediction.topLeft as [number, number];
        const bottomRight = prediction.bottomRight as [number, number];
        
        const faceWidth = bottomRight[0] - topLeft[0];
        const faceHeight = bottomRight[1] - topLeft[1];

        // Normalize coordinates to 0-1 range
        const normalizedFace: FaceCoordinate = {
          x: topLeft[0] / width,
          y: topLeft[1] / height,
          width: faceWidth / width,
          height: faceHeight / height,
          confidence: prediction.probability || 0.99,
        };

        // Add landmarks if available
        if (prediction.landmarks) {
          normalizedFace.landmarks = {};
          const landmarkMap = ['rightEye', 'leftEye', 'nose', 'mouth', 'rightEar', 'leftEar'];
          
          prediction.landmarks.forEach((landmark: [number, number], index: number) => {
            const landmarkName = landmarkMap[index];
            if (landmarkName && normalizedFace.landmarks) {
              normalizedFace.landmarks[landmarkName as keyof typeof normalizedFace.landmarks] = {
                x: landmark[0] / width,
                y: landmark[1] / height,
              };
            }
          });
        }

        return normalizedFace;
      });

      return { faces, imageWidth: width, imageHeight: height };
    } catch (error) {
      console.error('Face detection error:', error);
      throw new Error('Failed to detect faces in image');
    }
  }

  /**
   * Blur faces in an image
   */
  async blurFaces(
    imageBuffer: Buffer,
    faces: FaceCoordinate[],
    blurIntensity: number = 5
  ): Promise<Buffer> {
    if (faces.length === 0) {
      return imageBuffer;
    }

    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      const { width = 0, height = 0 } = metadata;

      // Create blur overlays for each face
      const composites = await Promise.all(
        faces.map(async (face) => {
          // Convert normalized coordinates to pixels
          const x = Math.round(face.x * width);
          const y = Math.round(face.y * height);
          const faceWidth = Math.round(face.width * width);
          const faceHeight = Math.round(face.height * height);

          // Extract face region
          const faceRegion = await sharp(imageBuffer)
            .extract({
              left: Math.max(0, x),
              top: Math.max(0, y),
              width: Math.min(faceWidth, width - x),
              height: Math.min(faceHeight, height - y),
            })
            .blur(Math.max(1, blurIntensity * 2))
            .toBuffer();

          return {
            input: faceRegion,
            left: x,
            top: y,
          };
        })
      );

      // Composite blurred faces back onto original image
      const processedImage = await image
        .composite(composites)
        .toBuffer();

      return processedImage;
    } catch (error) {
      console.error('Face blurring error:', error);
      throw new Error('Failed to blur faces in image');
    }
  }

  /**
   * Crop image to a specific face
   */
  async cropToFace(
    imageBuffer: Buffer,
    face: FaceCoordinate,
    padding: number = 0.2
  ): Promise<Buffer> {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      const { width = 0, height = 0 } = metadata;

      // Convert normalized coordinates to pixels with padding
      const paddingX = face.width * width * padding;
      const paddingY = face.height * height * padding;

      const x = Math.max(0, Math.round(face.x * width - paddingX));
      const y = Math.max(0, Math.round(face.y * height - paddingY));
      const cropWidth = Math.min(
        Math.round(face.width * width + paddingX * 2),
        width - x
      );
      const cropHeight = Math.min(
        Math.round(face.height * height + paddingY * 2),
        height - y
      );

      const croppedImage = await image
        .extract({
          left: x,
          top: y,
          width: cropWidth,
          height: cropHeight,
        })
        .resize(256, 256, {
          fit: 'cover',
          position: 'center',
        })
        .toBuffer();

      return croppedImage;
    } catch (error) {
      console.error('Face cropping error:', error);
      throw new Error('Failed to crop face from image');
    }
  }

  /**
   * Anonymize faces with heavy pixelation
   */
  async anonymizeFaces(
    imageBuffer: Buffer,
    faces: FaceCoordinate[]
  ): Promise<Buffer> {
    if (faces.length === 0) {
      return imageBuffer;
    }

    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      const { width = 0, height = 0 } = metadata;

      // Create pixelated overlays for each face
      const composites = await Promise.all(
        faces.map(async (face) => {
          // Convert normalized coordinates to pixels
          const x = Math.round(face.x * width);
          const y = Math.round(face.y * height);
          const faceWidth = Math.round(face.width * width);
          const faceHeight = Math.round(face.height * height);

          // Extract face region and pixelate it
          const pixelSize = Math.max(8, Math.round(faceWidth / 10));
          
          const faceRegion = await sharp(imageBuffer)
            .extract({
              left: Math.max(0, x),
              top: Math.max(0, y),
              width: Math.min(faceWidth, width - x),
              height: Math.min(faceHeight, height - y),
            })
            .resize(
              Math.round(faceWidth / pixelSize),
              Math.round(faceHeight / pixelSize),
              { kernel: 'nearest' }
            )
            .resize(faceWidth, faceHeight, { kernel: 'nearest' })
            .toBuffer();

          return {
            input: faceRegion,
            left: x,
            top: y,
          };
        })
      );

      // Composite pixelated faces back onto original image
      const processedImage = await image
        .composite(composites)
        .toBuffer();

      return processedImage;
    } catch (error) {
      console.error('Face anonymization error:', error);
      throw new Error('Failed to anonymize faces in image');
    }
  }

  /**
   * Count faces in an image
   */
  async countFaces(imageBuffer: Buffer): Promise<number> {
    const { faces } = await this.detectFaces(imageBuffer);
    return faces.length;
  }

  /**
   * Process image based on privacy settings
   */
  async processWithPrivacy(
    imageBuffer: Buffer,
    privacySettings: PrivacySettings | null
  ): Promise<{
    processedBuffer: Buffer;
    faces: FaceCoordinate[];
    processing: string;
  }> {
    const { faces } = await this.detectFaces(imageBuffer);

    if (!privacySettings || !privacySettings.autoBlurFaces || faces.length === 0) {
      return {
        processedBuffer: imageBuffer,
        faces,
        processing: 'detect_only',
      };
    }

    // Apply privacy mode
    let processedBuffer: Buffer;
    let processing: string;

    if (privacySettings.privacyMode === 'strict') {
      processedBuffer = await this.anonymizeFaces(imageBuffer, faces);
      processing = 'anonymize';
    } else {
      processedBuffer = await this.blurFaces(
        imageBuffer,
        faces,
        privacySettings.blurIntensity
      );
      processing = 'blur';
    }

    return {
      processedBuffer,
      faces,
      processing,
    };
  }

  /**
   * Extract all face avatars from a group photo
   */
  async extractAllFaces(
    imageBuffer: Buffer,
    padding: number = 0.2
  ): Promise<Buffer[]> {
    const { faces } = await this.detectFaces(imageBuffer);
    
    const avatars = await Promise.all(
      faces.map((face) => this.cropToFace(imageBuffer, face, padding))
    );

    return avatars;
  }
}

export const faceDetectionService = new FaceDetectionService();