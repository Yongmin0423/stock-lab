import { NextResponse } from "next/server";
import { finnhub } from "@/lib/providers/finnhub";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 1) return NextResponse.json([]);

  try {
    // M4에서 KIS searchSymbol 결과 병합 예정
    const results = await finnhub.searchSymbol(q);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
