import { NextResponse } from "next/server";
import { getQuoteCached } from "@/lib/cache";
import { getWatchlist } from "@/lib/db/queries/stocks";

/** watchlist 전 종목 시세를 TTL과 관계없이 실제 공급자에서 다시 조회한다. */
export async function POST() {
  try {
    const list = await getWatchlist();
    let refreshed = 0;
    for (const stock of list) {
      if (await getQuoteCached(stock.symbol, stock.name, true)) refreshed++;
    }
    return NextResponse.json({ ok: true, refreshed });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "시세 갱신 실패" }, { status: 500 });
  }
}
