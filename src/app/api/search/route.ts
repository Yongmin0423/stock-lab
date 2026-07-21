import { NextResponse } from "next/server";
import { finnhub } from "@/lib/providers/finnhub";
import { kis } from "@/lib/providers/kis";
import type { SymbolInfo } from "@/lib/providers/types";

const within = (search: Promise<SymbolInfo[]>) =>
  Promise.race([search.catch(() => []), new Promise<SymbolInfo[]>((resolve) => setTimeout(() => resolve([]), 5_000))]);

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 1) return NextResponse.json([]);

  // US(Finnhub) + KR(stocks_master) 병합 — 한글이면 KR 우선
  const isKorean = /[가-힣]/.test(q);
  const [kr, us] = await Promise.all([
    within(kis.searchSymbol(q)),
    isKorean ? Promise.resolve([]) : within(finnhub.searchSymbol(q)),
  ]);

  return NextResponse.json(isKorean ? [...kr, ...us].slice(0, 10) : [...us, ...kr].slice(0, 10));
}
