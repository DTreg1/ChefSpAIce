import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ENCODING: BufferEncoding = "base64";
const SEPARATOR = ":";

function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY environment variable is not set. " +
      "Generate a 32-byte hex key with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters). " +
      `Current key is ${keyBuffer.length} bytes.`
    );
  }
  return keyBuffer;
}

export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString(ENCODING),
    encrypted.toString(ENCODING),
    authTag.toString(ENCODING),
  ].join(SEPARATOR);
}

export function decryptToken(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(SEPARATOR);
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }
  const [ivStr, encryptedStr, authTagStr] = parts;
  const iv = Buffer.from(ivStr, ENCODING);
  const encrypted = Buffer.from(encryptedStr, ENCODING);
  const authTag = Buffer.from(authTagStr, ENCODING);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function encryptTokenOrNull(token: string | null | undefined): string | null {
  if (!token) return null;
  return encryptToken(token);
}

export function decryptTokenOrNull(token: string | null | undefined): string | null {
  if (!token) return null;
  try {
    return decryptToken(token);
  } catch {
    return token;
  }
}
