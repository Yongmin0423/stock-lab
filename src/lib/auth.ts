export const SESSION_COOKIE = "stocklab_session";
export const SESSION_MAX_AGE = 24 * 60 * 60;

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
    const [payload, signature, extra] = token.split(".");
    const expiresAt = Number(payload);
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now() || !signature || extra !== undefined) return false;
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

/** 공개 조회만 허용한다. 새 페이지/API는 명시적으로 공개하기 전까지 운영자 전용이다. */
export function requiresOperator(pathname: string, method: string): boolean {
  if (pathname === "/login") return false;
  if (method !== "GET" && method !== "HEAD") return true;
  if (pathname === "/api/candles") return false;
  if (pathname.startsWith("/api/")) return true;
  if (["/", "/briefing", "/discover", "/news", "/stocks", "/notes", "/robots.txt", "/sitemap.xml"].includes(pathname)) return false;
  return !/^\/(stock\/[^/]+|notes\/\d+)$/.test(pathname);
}

export function verifyCronAuthorization(authorization: string | null, secret: string | undefined): boolean {
  return Boolean(secret) && authorization === `Bearer ${secret}`;
}
