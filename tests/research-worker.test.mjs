import assert from "node:assert/strict";
import worker from "../workers/research/src/index.ts";
import { createHealthHeaders, isResearchHealth, verifyHealthRequest } from "../src/lib/research/protocol.ts";
import { checkResearchWorker, ResearchWorkerError } from "../src/lib/research/client.ts";

const secret = "test-only-research-secret-at-least-32-characters";
const requestId = crypto.randomUUID();
const now = Date.now();
const url = "https://research.example/health";
const headers = await createHealthHeaders(secret, requestId, now);
const request = () => new Request(url, { headers });
assert.equal(await verifyHealthRequest(request(), secret, now), true);
assert.equal(await verifyHealthRequest(request(), "wrong-secret", now), false);
assert.equal(await verifyHealthRequest(request(), secret, now + 60_001), false);
assert.equal(await verifyHealthRequest(request(), secret, now - 60_001), false);
assert.equal(await verifyHealthRequest(new Request(`${url}?other=1`, { headers }), secret, now), false);
assert.equal(await verifyHealthRequest(new Request(url, { method: "POST", headers }), secret, now), false);
const tampered = new Headers(headers);
tampered.set("x-research-request-id", crypto.randomUUID());
assert.equal(await verifyHealthRequest(new Request(url, { headers: tampered }), secret, now), false);

const env = { RESEARCH_WORKER_SECRET: secret };
const response = await worker.fetch(request(), env);
assert.equal(response.status, 200);
assert.equal(response.headers.get("cache-control"), "no-store");
assert.equal(isResearchHealth(await response.json(), requestId), true);
assert.equal((await worker.fetch(new Request(url), env)).status, 401);
assert.equal((await worker.fetch(request(), {})).status, 503);
assert.equal((await worker.fetch(new Request(url, { method: "POST" }), env)).status, 405);
assert.equal((await worker.fetch(new Request("https://research.example/missing"), env)).status, 404);

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
try {
  process.env.RESEARCH_WORKER_URL = "https://research.example";
  process.env.RESEARCH_WORKER_SECRET = secret;
  // 실제 Worker handler와 클라이언트의 인증/응답 계약을 함께 검증한다.
  globalThis.fetch = async (target, options) => {
    assert.equal(String(target), url);
    assert.equal(options.redirect, "error");
    assert.equal(options.cache, "no-store");
    assert.equal(options.headers.has("cookie"), false);
    return worker.fetch(new Request(target, options), env);
  };
  assert.equal((await checkResearchWorker()).status, "ok");

  const expectStatus = (status) => (error) => error instanceof ResearchWorkerError && error.status === status;
  process.env.RESEARCH_WORKER_SECRET = "wrong-but-long-enough-secret-for-testing";
  await assert.rejects(checkResearchWorker(), expectStatus(502));
  process.env.RESEARCH_WORKER_SECRET = secret;
  for (const invalid of ["http://research.example", "https://user:password@research.example", "https://research.example/path", "https://research.example?key=value", "not-a-url"]) {
    process.env.RESEARCH_WORKER_URL = invalid;
    await assert.rejects(checkResearchWorker(), expectStatus(503));
  }
  process.env.RESEARCH_WORKER_URL = "http://127.0.0.1:8787";
  process.env.NODE_ENV = "production";
  await assert.rejects(checkResearchWorker(), expectStatus(503));
  process.env.RESEARCH_WORKER_URL = "https://research.example";
  delete process.env.RESEARCH_WORKER_SECRET;
  await assert.rejects(checkResearchWorker(), expectStatus(503));
  process.env.RESEARCH_WORKER_SECRET = secret;

  for (const malformed of [{ status: "ok" }, { service: "other" }, { requestId: "wrong" }]) {
    globalThis.fetch = async () => Response.json(malformed);
    await assert.rejects(checkResearchWorker(), expectStatus(502));
  }
  globalThis.fetch = async () => new Response("not JSON");
  await assert.rejects(checkResearchWorker(), expectStatus(502));
  globalThis.fetch = async () => new Response("x".repeat(8_193));
  await assert.rejects(checkResearchWorker(), expectStatus(502));
  globalThis.fetch = async () => { throw new Error("internal upstream URL and token"); };
  await assert.rejects(checkResearchWorker(), (error) => expectStatus(502)(error) && !error.message.includes("token"));
  globalThis.fetch = async () => new Response("private upstream details", { status: 500 });
  await assert.rejects(checkResearchWorker(), (error) => expectStatus(502)(error) && !error.message.includes("private"));
  globalThis.fetch = async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
  // AbortSignal.timeout은 이벤트 루프를 유지하지 않으므로 테스트 동안만 타이머를 둔다.
  const keepAlive = setInterval(() => {}, 1_000);
  try {
    await assert.rejects(checkResearchWorker(), expectStatus(504));
  } finally {
    clearInterval(keepAlive);
  }
} finally {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
}
console.log("Research Worker: 인증, 시각, 라우팅, 응답 계약, 설정 및 오류 처리 통과");
