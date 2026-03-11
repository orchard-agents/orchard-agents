import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey() {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY;

  if (!raw) {
    throw new Error("Missing SETTINGS_ENCRYPTION_KEY. Set a 32-byte secret for credential encryption.");
  }

  const trimmed = raw.trim();

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  if (/^[A-Za-z0-9+/]+={0,2}$/.test(trimmed)) {
    const base64Buffer = Buffer.from(trimmed, "base64");
    if (base64Buffer.length === 32) {
      return base64Buffer;
    }
  }

  if (trimmed.length === 32) {
    return Buffer.from(trimmed, "utf8");
  }

  throw new Error(
    "Invalid SETTINGS_ENCRYPTION_KEY format. Use 32-char text, 64-char hex, or base64 that decodes to 32 bytes."
  );
}

export function encryptSettings(plainText: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSettings(payload: string) {
  const key = getEncryptionKey();
  const [ivPart, tagPart, encryptedPart] = payload.split(":");

  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error("Invalid encrypted payload format.");
  }

  const iv = Buffer.from(ivPart, "base64");
  const authTag = Buffer.from(tagPart, "base64");
  const encrypted = Buffer.from(encryptedPart, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString("utf8");
}
