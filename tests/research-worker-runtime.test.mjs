import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout } from "node:timers/promises";
import { checkResearchWorker, compareBriefingOnWorker } from "../src/lib/research/client.ts";
import { createHealthHeaders } from "../src/lib/research/protocol.ts";

// 외부 서비스와 운영 시크릿 없이 실제 workerd와 HTTP로 연결한다.
const directory = await mkdtemp(join(tmpdir(), "stock-lab-worker-"));
const envFile = join(directory, ".env");
const secret = crypto.randomUUID() + crypto.randomUUID();
await writeFile(envFile, `RESEARCH_WORKER_SECRET=${secret}\n`);
const originalEnv = { ...process.env };
const origin = "http://127.0.0.1:8797";
const server = spawn(process.execPath, [
  resolve("node_modules/wrangler/bin/wrangler.js"), "dev", "--config", "workers/research/wrangler.jsonc",
  "--env-file", envFile, "--local", "--ip", "127.0.0.1", "--port", "8797", "--inspector-port", "0",
], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, WRANGLER_SEND_METRICS: "false" } });
let startupLog = "";
for (const output of [server.stdout, server.stderr]) output.on("data", (data) => {
  startupLog = (startupLog + data.toString().replaceAll(secret, "[redacted]")).slice(-4_000);
});
let serverError;
server.on("error", (error) => { serverError = error; });
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (serverError) throw serverError;
    if (server.exitCode !== null) throw new Error(`Worker runtime exited: ${server.exitCode}\n${startupLog}`);
    try {
      const response = await fetch(`${origin}/health`, { signal: AbortSignal.timeout(500) });
      if (response.status === 401) { ready = true; break; }
    } catch { /* 로컬 런타임 시작 대기 */ }
    await setTimeout(250);
  }
  assert.equal(ready, true, "로컬 Worker 시작");
  process.env.NODE_ENV = "development";
  process.env.RESEARCH_WORKER_URL = origin;
  process.env.RESEARCH_WORKER_SECRET = secret;
  assert.equal((await checkResearchWorker()).status, "ok", "실제 Worker와 인증된 왕복 요청");
  const snapshot = {
    version: 1, symbol: "US:TEST", capturedAt: new Date().toISOString(), price: 100,
    quoteAt: new Date().toISOString(), isMock: false, fundamentalsAt: null,
    metrics: { per: null, pbr: null, eps: null, roe: null, debtToEquity: null, dividendYield: null }, rules: [],
  };
  const compared = await compareBriefingOnWorker({ current: [snapshot], previous: [] });
  assert.equal(compared[0].baseline, "missing", "실제 Worker에서 본문 서명·스냅샷 검증·비교 실행");
  const expired = await createHealthHeaders(secret, crypto.randomUUID(), Date.now() - 120_000);
  assert.equal((await fetch(`${origin}/health`, { headers: expired })).status, 401);
  const wrong = await createHealthHeaders("incorrect-service-secret", crypto.randomUUID());
  assert.equal((await fetch(`${origin}/health`, { headers: wrong })).status, 401);
  console.log("Research Worker runtime: HTTP 연결, HMAC 인증, 만료·위조 요청 거부 통과");
} finally {
  if (server.pid && server.exitCode === null) {
    const exited = new Promise((resolveExit) => server.once("exit", resolveExit));
    server.kill();
    await exited;
  }
  await rm(directory, { recursive: true, force: true });
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
}
