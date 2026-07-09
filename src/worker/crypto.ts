import { HttpError } from "./http";
import type { Env } from "./types";
import { redactText } from "../shared/redaction";

function decodeKey(value: string): Uint8Array {
  const trimmed = value.trim();
  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    return new Uint8Array(trimmed.match(/.{2}/g)?.map((part) => Number.parseInt(part, 16)) || []);
  }

  const normalized = trimmed.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function importEncryptionKey(env: Env): Promise<CryptoKey> {
  if (!env.FIELD_ENCRYPTION_KEY) {
    throw new HttpError(
      503,
      "encryption_not_configured",
      "FIELD_ENCRYPTION_KEY is required before storing incident or resolution payloads."
    );
  }

  const raw = decodeKey(env.FIELD_ENCRYPTION_KEY);
  if (raw.byteLength !== 32) {
    throw new HttpError(503, "invalid_encryption_key", "FIELD_ENCRYPTION_KEY must decode to 32 bytes.");
  }

  const keyData = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer;
  return crypto.subtle.importKey("raw", keyData, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function encryptSensitivePayload(env: Env, value: unknown): Promise<string> {
  const key = await importEncryptionKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(redactText(value));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));
  return `v1:${base64(iv)}:${base64(ciphertext)}`;
}
