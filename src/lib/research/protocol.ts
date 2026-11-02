// Next.js와 Worker가 공유하는 연결 확인 계약. 사용자 데이터는 포함하지 않는다.
export const RESEARCH_SERVICE = "stock-lab-research";
export const RESEARCH_PROTOCOL_VERSION = 1;
const MAX_CLOCK_SKEW_MS = 60_000;
const encoder = new TextEncoder();

export type ResearchHealth = {
  service: typeof RESEARCH_SERVICE;
  protocolVersion: typeof RESEARCH_PROTOCOL_VERSION;
  status: "ok";
  requestId: string;
  checkedAt: string;
};

function signingKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function payload(timestamp: string, requestId: string) {
  return encoder.encode(`v1\nGET\n/health\n${timestamp}\n${requestId}`);
}

export async function createHealthHeaders(secret: string, requestId: string, now = Date.now()): Promise<Headers> {
  const timestamp = String(now);
  const signature = await crypto.subtle.sign("HMAC", await signingKey(secret), payload(timestamp, requestId));
  return new Headers({
    "x-research-timestamp": timestamp,
    "x-research-request-id": requestId,
    "x-research-signature": Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join(""),
  });
}

// 읽기 전용 /health에만 사용한다. 유효 시간 내 재전송은 허용하며 쓰기 API에는 재사용하지 않는다.
export async function verifyHealthRequest(request: Request, secret: string, now = Date.now()): Promise<boolean> {
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname !== "/health" || url.search) return false;
  const timestamp = request.headers.get("x-research-timestamp") ?? "";
  const requestId = request.headers.get("x-research-request-id") ?? "";
  const signature = request.headers.get("x-research-signature") ?? "";
  if (!/^\d{13}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > MAX_CLOCK_SKEW_MS) return false;
  if (!/^[a-f0-9-]{36}$/i.test(requestId) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const bytes = Uint8Array.from(signature.match(/../g)!, (byte) => Number.parseInt(byte, 16));
  return crypto.subtle.verify("HMAC", await signingKey(secret), bytes, payload(timestamp, requestId));
}

export function isResearchHealth(value: unknown, requestId: string): value is ResearchHealth {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return row.service === RESEARCH_SERVICE && row.protocolVersion === RESEARCH_PROTOCOL_VERSION && row.status === "ok"
    && row.requestId === requestId && typeof row.checkedAt === "string" && Number.isFinite(Date.parse(row.checkedAt));
}

async function comparisonPayload(body: string, timestamp: string, requestId: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(body));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return encoder.encode(`v1\nPOST\n/briefing/compare\n${timestamp}\n${requestId}\n${hash}`);
}

// 저장·LLM 호출 없는 순수 비교 요청이다. 같은 본문을 재전송해도 부수 효과가 없다.
export async function createComparisonHeaders(secret: string, requestId: string, body: string, now = Date.now()): Promise<Headers> {
  const timestamp = String(now);
  const signature = await crypto.subtle.sign("HMAC", await signingKey(secret), await comparisonPayload(body, timestamp, requestId));
  return new Headers({
    "Content-Type": "application/json",
    "x-research-timestamp": timestamp,
    "x-research-request-id": requestId,
    "x-research-signature": Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join(""),
  });
}

export async function verifyComparisonRequest(request: Request, secret: string, body: string, now = Date.now()): Promise<boolean> {
  const url = new URL(request.url);
  if (request.method !== "POST" || url.pathname !== "/briefing/compare" || url.search) return false;
  const timestamp = request.headers.get("x-research-timestamp") ?? "";
  const requestId = request.headers.get("x-research-request-id") ?? "";
  const signature = request.headers.get("x-research-signature") ?? "";
  if (!/^\d{13}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > MAX_CLOCK_SKEW_MS
    || !/^[a-f0-9-]{36}$/i.test(requestId) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  return crypto.subtle.verify("HMAC", await signingKey(secret), Uint8Array.from(signature.match(/../g)!, (byte) => Number.parseInt(byte, 16)), await comparisonPayload(body, timestamp, requestId));
}
