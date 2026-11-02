import { operatorApiError } from "@/lib/operator";
import { checkResearchWorker, ResearchWorkerError } from "@/lib/research/client";

export const maxDuration = 10;

export async function GET() {
  const denied = await operatorApiError();
  if (denied) return denied;
  const headers = { "Cache-Control": "no-store" };
  try {
    return Response.json(await checkResearchWorker(), { headers });
  } catch (error) {
    if (error instanceof ResearchWorkerError) return Response.json({ error: error.message }, { status: error.status, headers });
    return Response.json({ error: "리서치 서버 연결 확인에 실패했습니다." }, { status: 500, headers });
  }
}
