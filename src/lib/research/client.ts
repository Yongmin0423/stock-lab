import { createHealthHeaders, createComparisonHeaders, isResearchHealth, type ResearchHealth } from "./protocol.ts";
import { ComparisonInputSchema, ComparisonResultSchema, type ComparisonInput, type StockComparison } from "./briefing-comparison.ts";
import { readLimitedBody } from "./body.ts";

export class ResearchWorkerError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ResearchWorkerError";
    this.status = status;
  }
}

export function researchWorkerConfigured(): boolean {
  return Boolean(process.env.RESEARCH_WORKER_URL && process.env.RESEARCH_WORKER_SECRET);
}

function healthUrl(path = "/health"): URL {
  try {
    const url = new URL(process.env.RESEARCH_WORKER_URL ?? "");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/"
      || (url.protocol !== "https:" && !(url.protocol === "http:" && local && process.env.NODE_ENV !== "production"))) throw new Error();
    return new URL(path, url);
  } catch {
    throw new ResearchWorkerError("리서치 서버 주소를 확인해주세요. 운영 환경은 HTTPS 주소가 필요합니다.", 503);
  }
}

export async function compareBriefingOnWorker(input: ComparisonInput): Promise<StockComparison[]> {
  const secret = process.env.RESEARCH_WORKER_SECRET;
  if (!secret || secret.length < 32) throw new ResearchWorkerError("리서치 서버 연결 시크릿을 설정해주세요.", 503);
  const url = healthUrl("/briefing/compare");
  const body = JSON.stringify(ComparisonInputSchema.parse(input));
  if (new TextEncoder().encode(body).byteLength > 512_000) throw new ResearchWorkerError("브리핑 비교 자료가 너무 큽니다.", 413);
  const requestId = crypto.randomUUID();
  const signed = await createComparisonHeaders(secret, requestId, body);
  const signal = AbortSignal.timeout(10_000);
  try {
    const response = await fetch(url, { method: "POST", headers: signed, body, cache: "no-store", redirect: "error", signal });
    if (!response.ok) {
      await response.body?.cancel();
      throw new ResearchWorkerError("Worker 브리핑 비교에 실패했습니다. 연결 설정과 Worker 배포 상태를 확인해주세요.", 502);
    }
    const result = JSON.parse(await readLimitedBody(response.body, 256_000));
    const comparisons = ComparisonResultSchema.parse(result.comparisons);
    if (result.requestId !== requestId || comparisons.length !== input.current.length
      || comparisons.some((row, index) => row.symbol !== input.current[index].symbol)) throw new Error("Invalid comparison response");
    return comparisons;
  } catch (error) {
    if (error instanceof ResearchWorkerError) throw error;
    throw new ResearchWorkerError(signal.aborted ? "Worker 브리핑 비교 시간이 초과되었습니다." : "Worker 브리핑 비교 응답을 확인할 수 없습니다.", signal.aborted ? 504 : 502);
  }
}

// 서버에서만 호출한다. 서비스 시크릿·Worker 응답 본문은 브라우저나 로그에 전달하지 않는다.
export async function checkResearchWorker(): Promise<ResearchHealth> {
  const secret = process.env.RESEARCH_WORKER_SECRET;
  if (!process.env.RESEARCH_WORKER_URL || !secret || secret.length < 32) {
    throw new ResearchWorkerError("리서치 서버 주소와 32자 이상의 연결 시크릿을 설정해주세요.", 503);
  }
  const url = healthUrl();
  const requestId = crypto.randomUUID();
  const headers = await createHealthHeaders(secret, requestId);
  const signal = AbortSignal.timeout(5_000);
  try {
    const response = await fetch(url, { headers, cache: "no-store", redirect: "error", signal });
    if (!response.ok) {
      await response.body?.cancel();
      throw new ResearchWorkerError(response.status === 401
        ? "리서치 서버 인증에 실패했습니다. 양쪽 연결 시크릿과 서버 시각을 확인해주세요."
        : "리서치 서버가 정상 응답하지 않았습니다.", 502);
    }
    // 설정이 잘못된 서버에서 큰 본문이 반환돼도 연결 확인 요청은 작게 제한한다.
    const reader = response.body?.getReader();
    if (!reader) throw new ResearchWorkerError("리서치 서버 응답이 비어 있습니다.", 502);
    const decoder = new TextDecoder();
    let size = 0;
    let body = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 8_192) {
          await reader.cancel();
          throw new ResearchWorkerError("리서치 서버 응답 형식이 올바르지 않습니다.", 502);
        }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
    } finally {
      reader.releaseLock();
    }
    const result: unknown = JSON.parse(body);
    if (!isResearchHealth(result, requestId)) throw new ResearchWorkerError("리서치 서버 응답 형식이 올바르지 않습니다.", 502);
    return result;
  } catch (error) {
    if (error instanceof ResearchWorkerError) throw error;
    if (signal.aborted) throw new ResearchWorkerError("리서치 서버 연결 시간이 초과되었습니다. 다시 시도해주세요.", 504);
    throw new ResearchWorkerError("리서치 서버에 연결할 수 없거나 응답 형식이 올바르지 않습니다.", 502);
  }
}
