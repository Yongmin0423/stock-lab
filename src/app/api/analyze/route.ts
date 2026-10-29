import { operatorApiError } from "@/lib/operator";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { hasAiKey, mockAnalysis, runAnalysis, type AnalysisContext } from "@/lib/ai/analyze";
import { getFundamentalsCached, getNewsCached, getQuoteCached } from "@/lib/cache";
import { getDb } from "@/lib/db";
import { findRelevantNotes } from "@/lib/db/queries/notes";
import { listEnabledRules } from "@/lib/db/queries/rules";
import { insertAnalysis } from "@/lib/db/queries/analyses";
import { stocks } from "@/lib/db/schema";
import { evaluateRules, ruleMetrics } from "@/lib/rules";

export const maxDuration = 60; // Vercel 배포 시 AI 응답 대기 여유

export async function POST(req: Request) {
  const denied = await operatorApiError();
  if (denied) return denied;
  try {
    const { symbol } = (await req.json()) as { symbol?: string };
    if (!symbol) return NextResponse.json({ error: "symbol 필요" }, { status: 400 });

    const db = getDb();
    const stock = await db.query.stocks.findFirst({ where: eq(stocks.symbol, symbol) });
    if (!stock) return NextResponse.json({ error: "watchlist에 없는 종목" }, { status: 404 });

    // 데이터 수집 — 순차 (KIS 초당 제한 대비, 대부분 캐시 히트)
    const quote = await getQuoteCached(symbol, stock.name);
    const fund = await getFundamentalsCached(symbol);
    const newsRows = await getNewsCached(symbol, stock.name);
    const notes = await findRelevantNotes(symbol, 5);

    const enabledRules = await listEnabledRules();
    const ruleResults = evaluateRules(ruleMetrics(fund), enabledRules);

    const ctx: AnalysisContext = {
      stock: { symbol, name: stock.name },
      quote: quote ? { price: quote.price, changePct: quote.changePct } : null,
      fundamentals: fund
        ? {
            per: fund.per,
            pbr: fund.pbr,
            eps: fund.eps,
            roe: fund.roe,
            debtToEquity: fund.debtToEquity,
            dividendYield: fund.dividendYield,
            marketCap: fund.marketCap,
            w52High: fund.w52High,
            w52Low: fund.w52Low,
          }
        : null,
      ruleResults,
      newsHeadlines: newsRows.slice(0, 8).map((n) => ({ headline: n.headline, source: n.source })),
      notes,
    };

    // 키 없으면 모의 분석 (DB 저장 안 함 — 이력 오염 방지)
    if (!hasAiKey()) {
      return NextResponse.json({ result: mockAnalysis(ctx), isMock: true, createdAt: new Date() });
    }

    const result = await runAnalysis(ctx);
    const saved = await insertAnalysis(symbol, result, quote?.price ?? null);
    return NextResponse.json({ result, isMock: false, createdAt: saved.createdAt, id: saved.id });
  } catch (e) {
    console.error("analyze 실패:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "분석 실패" }, { status: 500 });
  }
}
