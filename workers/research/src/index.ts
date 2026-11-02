import { RESEARCH_PROTOCOL_VERSION, RESEARCH_SERVICE, verifyHealthRequest } from "../../../src/lib/research/protocol.ts";

const headers = { "Cache-Control": "no-store" };

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
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
