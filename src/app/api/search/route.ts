import { NextResponse } from "next/server";
import { finnhub } from "@/lib/providers/finnhub";
import { kis } from "@/lib/providers/kis";
import { isKrOnlySearchQuery } from "@/lib/providers/types";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 1) return NextResponse.json([]);

  // US(Finnhub) + KR(stocks_master) 병합 — 한글·숫자는 외부 API를 호출하지 않음
  const krOnly = isKrOnlySearchQuery(q);
  let usUnavailable = false;
  const [kr, us] = await Promise.all([
    kis.searchSymbol(q).catch(() => []),
    krOnly
      ? Promise.resolve([])
      : finnhub.searchSymbol(q).catch(() => {
          usUnavailable = true;
          return [];
        }),
  ]);

  return NextResponse.json(krOnly ? kr.slice(0, 10) : [...us, ...kr].slice(0, 10), {
    headers: usUnavailable ? { "X-Search-Warning": "us-unavailable" } : undefined,
  });
}
