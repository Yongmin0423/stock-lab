import { NextResponse } from "next/server";
import { getQuoteCached } from "@/lib/cache";
import { getWatchlist } from "@/lib/db/queries/stocks";

/** watchlist 전 종목 시세를 TTL과 관계없이 실제 공급자에서 다시 조회한다. */
export async function POST() {
  try {
    const list = await getWatchlist();
    let refreshed = 0;
    const failures: string[] = [];
    for (const stock of list) {
      let failed = false;
      const quote = await getQuoteCached(stock.symbol, stock.name, true, (message, usingCache) => {
        failed = true;
        failures.push(`${stock.name}: ${message}${usingCache ? " (저장값 유지)" : ""}`);
      });
      if (quote && !failed) refreshed++;
    }
    if (failures.length > 0) return NextResponse.json({ error: failures.join(" · "), refreshed }, { status: 502 });
    return NextResponse.json({ ok: true, refreshed });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "시세 갱신 실패" }, { status: 500 });
  }
}
