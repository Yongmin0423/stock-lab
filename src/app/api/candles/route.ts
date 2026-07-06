import { NextResponse } from "next/server";
import { getCandlesCached } from "@/lib/cache";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol");
  const days = Math.min(Number(url.searchParams.get("days")) || 90, 400);
  if (!symbol) return NextResponse.json({ error: "symbol 필요" }, { status: 400 });

  try {
    const candles = await getCandlesCached(decodeURIComponent(symbol), days);
    return NextResponse.json(
      candles.map((c) => ({ date: c.date, open: c.open, high: c.high, low: c.low, close: c.close })),
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 500 });
  }
}
