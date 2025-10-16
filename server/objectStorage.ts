// Simplified Object Storage service for food item images
// Referenced from blueprint:javascript_object_storage
import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
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
    return dir;
  }

  async downloadObject(file: File, res: Response, retryCount = 0): Promise<void> {
    try {
      const [metadata] = await file.getMetadata();
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size?.toString() || "0",
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      });

      const stream = file.createReadStream({
        validation: false, // Skip MD5 validation for better performance
      });
      
      let hasError = false;
      
      stream.on("error", async (err: any) => {
        hasError = true;
        console.error(`Stream error (attempt ${retryCount + 1}):`, err);
        
        // Check if we can retry
        if (retryCount < MAX_RETRIES && this.isRetryableError(err)) {
          // Clean up the failed stream
          stream.destroy();
          
          // Wait with exponential backoff
          const delay = RETRY_DELAY * Math.pow(2, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Retry the download
          return this.downloadObject(file, res, retryCount + 1);
        }
        
        if (!res.headersSent) {
          const errorMessage = this.getErrorMessage(err);
          res.status(this.getErrorStatusCode(err)).json({ 
            error: errorMessage,
            retries: retryCount
          });
        }
      });
      
      stream.on("end", () => {
        if (!hasError) {
          console.log(`Successfully streamed file after ${retryCount} retries`);
        }
      });
      
      stream.pipe(res);
    } catch (error: any) {
      console.error(`Error downloading file (attempt ${retryCount + 1}):`, error);
      
      // Retry logic for metadata fetch
      if (retryCount < MAX_RETRIES && this.isRetryableError(error)) {
        const delay = RETRY_DELAY * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.downloadObject(file, res, retryCount + 1);
      }
      
      if (!res.headersSent) {
        const errorMessage = this.getErrorMessage(error);
        res.status(this.getErrorStatusCode(error)).json({ 
          error: errorMessage,
          retries: retryCount
        });
      }
    }
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

    // Sanitize entityId to prevent directory traversal attacks
    const entityId = parts.slice(1).join("/");
    
    // Check for path traversal attempts
    if (entityId.includes("..") || entityId.includes("//") || entityId.includes("\\")) {
      console.error("Potential path traversal attempt detected:", objectPath);
      throw new ObjectStorageError(
        "Invalid file path",
        400,
        { reason: "Path traversal detected", path: objectPath }
      );
    }
    
    // Additional validation: ensure entityId only contains alphanumeric, dash, underscore, and forward slash
    const isValidPath = /^[a-zA-Z0-9\-_\/]+$/.test(entityId);
    if (!isValidPath) {
      console.error("Invalid characters in path:", objectPath);
      throw new ObjectStorageError(
        "Invalid file path",
        400,
        { reason: "Invalid characters", path: objectPath }
      );
    }
    
    try {
      let entityDir = this.getPrivateObjectDir();
      if (!entityDir.endsWith("/")) {
        entityDir = `${entityDir}/`;
      }
      const objectEntityPath = `${entityDir}${entityId}`;
      const { bucketName, objectName } = this.parseObjectPath(objectEntityPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const objectFile = bucket.file(objectName);
      
      const [exists] = await objectFile.exists();
      if (!exists) {
        throw new ObjectNotFoundError(objectPath);
      }
      return objectFile;
    } catch (error: any) {
      if (error instanceof ObjectNotFoundError || error instanceof ObjectStorageError) {
        throw error;
      }
      
      console.error("Error checking file existence:", error);
      throw new ObjectStorageError(
        "Failed to access file in storage",
        500,
        { originalError: error.message, path: objectPath }
      );
    }
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
      throw new Error("Invalid path: must contain at least a bucket name");
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
      throw new Error(
        `Failed to sign object URL, errorcode: ${response.status}`
      );
    }

    const { signed_url: signedURL } = await response.json();
    return signedURL;
  }
}
