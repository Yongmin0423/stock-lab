import { operatorApiError } from "@/lib/operator";
import { NextResponse } from "next/server";
import { getNewsCached } from "@/lib/cache";
import { getWatchlist } from "@/lib/db/queries/stocks";

export const maxDuration = 120;

/** watchlist 전 종목 뉴스 갱신 (1h TTL이 지난 종목만 실제 fetch + AI 평가) */
export async function POST() {
  const denied = await operatorApiError();
  if (denied) return denied;
  try {
    const list = await getWatchlist();
    let refreshed = 0;
    for (const s of list) {
      await getNewsCached(s.symbol, s.name, true);
      refreshed++;
    }
    return NextResponse.json({ ok: true, refreshed });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "갱신 실패" }, { status: 500 });
  }
}
