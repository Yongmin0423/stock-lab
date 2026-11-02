import { RESEARCH_PROTOCOL_VERSION, RESEARCH_SERVICE, verifyHealthRequest, verifyComparisonRequest } from "../../../src/lib/research/protocol.ts";
import { ComparisonInputSchema, compareBriefingSnapshots } from "../../../src/lib/research/briefing-comparison.ts";
import { readLimitedBody } from "../../../src/lib/research/body.ts";

const headers = { "Cache-Control": "no-store" };

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/briefing/compare") {
      if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: { ...headers, Allow: "POST" } });
      if (!env.RESEARCH_WORKER_SECRET || env.RESEARCH_WORKER_SECRET.length < 32) return Response.json({ error: "Service unavailable" }, { status: 503, headers });
      let body: string;
      try { body = await readLimitedBody(request.body, 512_000); }
      catch { return Response.json({ error: "Invalid or oversized body" }, { status: 413, headers }); }
      if (!(await verifyComparisonRequest(request, env.RESEARCH_WORKER_SECRET, body))) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
      let input;
      try { input = ComparisonInputSchema.safeParse(JSON.parse(body)); }
      catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers }); }
      if (!input.success) return Response.json({ error: "Invalid comparison input" }, { status: 400, headers });
      return Response.json({ requestId: request.headers.get("x-research-request-id"), comparisons: compareBriefingSnapshots(input.data) }, { headers });
    }
    if (url.pathname !== "/health") return Response.json({ error: "Not found" }, { status: 404, headers });
    if (request.method !== "GET") return Response.json({ error: "Method not allowed" }, { status: 405, headers: { ...headers, Allow: "GET" } });
    if (!env.RESEARCH_WORKER_SECRET || env.RESEARCH_WORKER_SECRET.length < 32) {
      return Response.json({ error: "Service unavailable" }, { status: 503, headers });
    }
    if (!(await verifyHealthRequest(request, env.RESEARCH_WORKER_SECRET))) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers });
    }
    return Response.json({
      service: RESEARCH_SERVICE,
      protocolVersion: RESEARCH_PROTOCOL_VERSION,
      status: "ok",
      requestId: request.headers.get("x-research-request-id"),
      checkedAt: new Date().toISOString(),
    }, { headers });
  },
} satisfies ExportedHandler<ResearchWorkerEnv>;
