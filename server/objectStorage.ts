// Simplified Object Storage service for food item images
// Referenced from blueprint:javascript_object_storage
import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import path from "path";
import { ApiError } from "./apiError";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // Start with 1 second delay

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
  retryOptions: {
    autoRetry: true,
    maxRetries: MAX_RETRIES,
    retryDelayMultiplier: 2,
  },
});

export class ObjectNotFoundError extends ApiError {
  constructor(path?: string) {
    super(
      path ? `Object not found: ${path}` : "Object not found",
      404,
      JSON.stringify({ path })
    );
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageError extends ApiError {
  constructor(message: string, statusCode: number = 500, details?: any) {
    super(
      message,
      statusCode,
      details ? JSON.stringify(details) : undefined
    );
    this.name = "ObjectStorageError";
  }
}

export class ObjectStorageService {
  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new ObjectStorageError(
        "Object storage is not configured. Please set up object storage first.",
        503,
        { missingEnv: "PRIVATE_OBJECT_DIR" }
      );
    }
    // Validate the directory path format
    if (!this.isValidPath(dir)) {
      throw new ObjectStorageError(
        "Invalid object storage directory configuration",
        500,
        { invalidDir: dir }
      );
    }
    return dir;
  }

  private isValidPath(pathStr: string): boolean {
    // Check for path traversal attempts and invalid characters
    if (!pathStr || typeof pathStr !== 'string') return false;
    if (pathStr.includes('..')) return false;
    if (pathStr.includes('~')) return false;
    if (/[<>"|?*\x00-\x1F]/.test(pathStr)) return false;
    if (pathStr.length > 255) return false;
    return true;
  }

  async downloadObject(file: File, res: Response, retryCount = 0): Promise<void> {
    // Helper function to perform a single download attempt
    const attemptDownload = async (): Promise<void> => {
      return new Promise(async (resolve, reject) => {
        try {
          // Get metadata with timeout
          const metadataPromise = file.getMetadata();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Metadata fetch timeout")), 10000)
          );
          
          const [metadata] = await Promise.race([
            metadataPromise,
            timeoutPromise
          ]) as any;
          
          // Only set headers on first attempt or if not already sent
          if (!res.headersSent) {
            res.set({
              "Content-Type": metadata.contentType || "application/octet-stream",
              "Content-Length": metadata.size?.toString() || "0",
              "Cache-Control": "public, max-age=3600",
              "X-Content-Type-Options": "nosniff",
            });
          }

          const stream = file.createReadStream({
            validation: false, // Skip MD5 validation for better performance
          });
          
          let hasError = false;
          let errorOccurred: Error | null = null;
          
          stream.on("error", (err: any) => {
            hasError = true;
            errorOccurred = err;
            console.error(`Stream error (attempt ${retryCount + 1}):`, err);
            
            // Clean up the stream immediately
            stream.destroy();
            
            // Reject the promise to trigger retry logic
            reject(err);
          });
          
          stream.on("end", () => {
            if (!hasError) {
              console.log(`Successfully streamed file after ${retryCount} attempt(s)`);
              resolve();
            }
          });
          
          // Handle pipe errors separately
          stream.pipe(res).on("error", (err: any) => {
            console.error(`Pipe error (attempt ${retryCount + 1}):`, err);
            stream.destroy();
            reject(err);
          });
          
        } catch (error) {
          reject(error);
        }
      });
    };
    
    // Main retry logic with exponential backoff and jitter
    let lastError: any = null;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        // Calculate delay with exponential backoff and jitter
        const baseDelay = RETRY_DELAY * Math.pow(2, attempt - 1);
        const jitter = Math.random() * baseDelay * 0.1; // 10% jitter
        const delay = baseDelay + jitter;
        
        console.log(`Retrying download after ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Check if response is still writable before retry
        if (res.writableEnded || res.destroyed) {
          console.error("Response stream is no longer writable, aborting retries");
          break;
        }
      }
      
      try {
        await attemptDownload();
        return; // Success, exit the function
      } catch (error: any) {
        lastError = error;
        console.error(`Download attempt ${attempt + 1} failed:`, error.message);
        
        // Check if error is retryable
        if (!this.isRetryableError(error) || attempt === MAX_RETRIES) {
          break; // Exit retry loop
        }
      }
    }
    
    // All retries exhausted or non-retryable error
    if (!res.headersSent && !res.writableEnded) {
      const errorMessage = this.getErrorMessage(lastError);
      const statusCode = this.getErrorStatusCode(lastError);
      
      // Send error response
      res.status(statusCode).json({
        error: errorMessage,
        details: {
          attempts: retryCount + 1,
          lastError: lastError?.message
        }
      });
    }
    
    throw new ObjectStorageError(
      this.getErrorMessage(lastError),
      this.getErrorStatusCode(lastError),
      { retries: retryCount, originalError: lastError?.message }
    );
  }
  
  private isRetryableError(error: any): boolean {
    // Retry on network errors and certain status codes
    return (
      error?.code === 'ECONNRESET' ||
      error?.code === 'ETIMEDOUT' ||
      error?.code === 'ENOTFOUND' ||
      error?.code === 'EHOSTUNREACH' ||
      error?.code === 'EPIPE' ||
      error?.status === 429 || // Rate limited
      error?.status === 503 || // Service unavailable
      error?.status === 504    // Gateway timeout
    );
  }
  
  private getErrorMessage(error: any): string {
    if (error?.code === 'ECONNRESET' || error?.code === 'EPIPE') {
      return "Connection to storage service was interrupted. Please try again.";
    }
    if (error?.code === 'ETIMEDOUT') {
      return "Storage service request timed out. Please try again.";
    }
    if (error?.code === 'ENOTFOUND' || error?.code === 'EHOSTUNREACH') {
      return "Cannot reach storage service. Please check your connection.";
    }
    if (error?.status === 404) {
      return "File not found in storage.";
    }
    if (error?.status === 403) {
      return "Access denied to storage resource.";
    }
    if (error?.status === 429) {
      return "Too many requests to storage service. Please try again later.";
    }
    return error?.message || "An error occurred while accessing storage.";
  }
  
  private getErrorStatusCode(error: any): number {
    if (error?.status) {
      return error.status;
    }
    if (error?.code === 'ENOTFOUND' || error?.code === 'EHOSTUNREACH') {
      return 503;
    }
    if (error?.code === 'ETIMEDOUT') {
      return 504;
    }
    return 500;
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;
    const { bucketName, objectName } = this.parseObjectPath(fullPath);

    return this.signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError(objectPath);
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError(objectPath);
    }

    // Extract the entityId
    const entityId = parts.slice(1).join("/");
    
    try {
      // Sanitize the entity ID (this will throw if invalid)
      const sanitizedEntityId = this.sanitizePath(entityId);
      
      // Get the private directory
      let entityDir = this.getPrivateObjectDir();
      
      // Use Node.js path module for safe path construction
      // Remove trailing slash from entityDir to work properly with path.join
      if (entityDir.endsWith("/")) {
        entityDir = entityDir.slice(0, -1);
      }
      
      // Safely construct the full path using path.join
      const fullPath = path.posix.join(entityDir, sanitizedEntityId);
      
      // Resolve to get the absolute path and check if it's within bounds
      const resolvedPath = path.posix.resolve('/', fullPath);
      const resolvedEntityDir = path.posix.resolve('/', entityDir);
      
      // Ensure the resolved path is within the entity directory
      if (!resolvedPath.startsWith(resolvedEntityDir + '/')) {
        console.error("Path escapes private directory after resolution:", {
          entityDir: resolvedEntityDir,
          resolvedPath,
          originalPath: objectPath
        });
        throw new ObjectStorageError(
          "Invalid file path",
          400,
          { reason: "Path escapes allowed directory" }
        );
      }
      
      // Parse bucket and object name from the resolved path
      const { bucketName, objectName } = this.parseObjectPath(resolvedPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const objectFile = bucket.file(objectName);
      
      // Check if the file exists
      const [exists] = await objectFile.exists();
      if (!exists) {
        throw new ObjectNotFoundError(objectPath);
      }
      
      return objectFile;
    } catch (error: any) {
      if (error instanceof ObjectNotFoundError || error instanceof ObjectStorageError) {
        throw error;
      }
      
      console.error("Error accessing file in storage:", error);
      throw new ObjectStorageError(
        "Failed to access file in storage",
        500,
        { originalError: error.message, path: objectPath }
      );
    }
  }

  /**
   * Sanitize a path to prevent directory traversal attacks
   * @param inputPath The path to sanitize
   * @returns The sanitized path
   */
  private sanitizePath(inputPath: string): string {
    // Remove any null bytes and control characters
    let sanitized = inputPath.replace(/[\0-\x1f\x7f]/g, '');
    
    // Remove any backslashes (Windows-style paths not allowed)
    sanitized = sanitized.replace(/\\/g, '/');
    
    // Decode URL encoding multiple times to prevent double-encoding attacks
    let previousDecoded = sanitized;
    let decoded = sanitized;
    let decodeAttempts = 0;
    const maxDecodeAttempts = 5; // Prevent infinite loops
    
    while (decodeAttempts < maxDecodeAttempts) {
      try {
        decoded = decodeURIComponent(previousDecoded);
        if (decoded === previousDecoded) {
          // No more encoding layers
          break;
        }
        previousDecoded = decoded;
        decodeAttempts++;
      } catch (e) {
        // If decoding fails, use the last successful decode
        decoded = previousDecoded;
        break;
      }
    }
    
    // After fully decoding, check for suspicious patterns
    if (decoded.includes('..') || decoded.includes('\\')) {
      throw new ObjectStorageError(
        "Invalid file path",
        400,
        { reason: "Path contains forbidden sequences after decoding" }
      );
    }
    
    // Normalize the path using Node.js path module
    const normalized = path.posix.normalize(decoded);
    
    // Ensure the normalized path doesn't start with .. or /
    if (normalized.startsWith('..') || normalized.startsWith('/')) {
      throw new ObjectStorageError(
        "Invalid file path", 
        400,
        { reason: "Path attempts to escape directory" }
      );
    }
    
    // Split into segments for additional validation
    const segments = normalized.split('/').filter(seg => seg && seg !== '.');
    
    // Validate each segment
    for (const segment of segments) {
      // Check for invalid characters in segments
      // Allow: alphanumeric, dash, underscore, dot (for extensions)
      if (!/^[a-zA-Z0-9\-_.]+$/.test(segment)) {
        throw new ObjectStorageError(
          "Invalid file path",
          400,
          { reason: `Invalid characters in path segment: ${segment}` }
        );
      }
      
      // Prevent hidden files/directories
      if (segment.startsWith('.')) {
        throw new ObjectStorageError(
          "Invalid file path",
          400,
          { reason: "Hidden files/directories not allowed" }
        );
      }
    }
    
    return segments.join('/');
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }

    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }

    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }

    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  private parseObjectPath(path: string): {
    bucketName: string;
    objectName: string;
  } {
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }
    const pathParts = path.split("/");
    if (pathParts.length < 3) {
      throw new ObjectStorageError("Invalid path: must contain at least a bucket name", 400);
    }

    const bucketName = pathParts[1];
    const objectName = pathParts.slice(2).join("/");

    return { bucketName, objectName };
  }

  private async signObjectURL({
    bucketName,
    objectName,
    method,
    ttlSec,
  }: {
    bucketName: string;
    objectName: string;
    method: "GET" | "PUT" | "DELETE" | "HEAD";
    ttlSec: number;
  }): Promise<string> {
    const request = {
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    };
    const response = await fetch(
      `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );
    if (!response.ok) {
      throw new ObjectStorageError(
        `Failed to sign object URL`,
        response.status,
        { bucketName, objectName, method }
      );
    }

    const { signed_url: signedURL } = await response.json();
    return signedURL;
  }
}
