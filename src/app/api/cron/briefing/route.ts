import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { verifyCronAuthorization } from "@/lib/auth";
import { hasAiKey } from "@/lib/ai/analyze";
import { generateBriefing } from "@/lib/briefing-run";
import { generateDiscovery } from "@/lib/discover-run";

export const maxDuration = 300; // 브리핑 + 발굴 순차 실행

/**
 * Vercel Cron 전용 (vercel.json 참고) — 아침/저녁마다 브리핑 + 발굴을 함께 생성.
 * 보안: CRON_SECRET env 설정 시 Vercel이 Authorization: Bearer <CRON_SECRET>을 자동으로 붙여줌.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!verifyCronAuthorization(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const slot = url.searchParams.get("slot") === "evening" ? "evening" : "morning";

  try {
    const { row, isMock } = await generateBriefing(slot);

    // 발굴도 함께 (실패해도 브리핑은 성공 처리 — 장애 격리)
    let discovery: { ok: boolean; picks?: number; error?: string } = { ok: false };
    if (hasAiKey()) {
      try {
        const d = await generateDiscovery();
        discovery = { ok: true, picks: d.picks.length };
      } catch (e) {
        discovery = { ok: false, error: e instanceof Error ? e.message : "발굴 실패" };
        console.error("cron discovery 실패:", e);
        Sentry.captureException(e, { tags: { task: "cron-discovery" } });
      }
    }

    return NextResponse.json({ ok: true, id: row.id, slot, isMock, discovery });
  } catch (e) {
    console.error("cron briefing 실패:", e);
    Sentry.captureException(e, { tags: { task: "cron-briefing" } });
    return NextResponse.json({ error: e instanceof Error ? e.message : "실패" }, { status: 500 });
  }
}
