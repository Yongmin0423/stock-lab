export const SESSION_COOKIE = "stocklab_session";
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

const encoder = new TextEncoder();

async function key(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function encode(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decode(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

export async function createSessionToken(secret: string, expiresAt: number) {
  const payload = String(expiresAt);
  const signature = await crypto.subtle.sign("HMAC", await key(secret), encoder.encode(payload));
  return `${payload}.${encode(signature)}`;
}

export async function verifySessionToken(token: string | undefined, secret: string) {
  try {
    if (!token) return false;
    const [payload, signature] = token.split(".");
    const expiresAt = Number(payload);
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now() || !signature) return false;
    return crypto.subtle.verify("HMAC", await key(secret), decode(signature), encoder.encode(payload));
  } catch {
    return false;
  }
}

export async function verifyPassword(input: string, expected: string) {
  const message = encoder.encode("stocklab-login");
  const supplied = await crypto.subtle.sign("HMAC", await key(input), message);
  return crypto.subtle.verify("HMAC", await key(expected), supplied, message);
}
