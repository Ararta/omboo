// Minimal, dependency-free JWT payload decoder (no signature verification — same principle
// as apps/web's lib/jwt.ts: this is UX-only routing, the API re-verifies every request).
// Avoids pulling in a browser-oriented JWT library that may not be RN/Hermes-safe.

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64UrlDecode(input: string): string {
  let str = input.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (const char of str) {
    if (char === "=") break;
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

export function decodeJwtPayload<T>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(base64UrlDecode(parts[1])) as T;
  } catch {
    return null;
  }
}
