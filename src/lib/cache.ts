import { and, asc, desc, eq, gte, isNull } from "drizzle-orm";
import { getDb } from "./db";
import { candles, financials, news, quotes } from "./db/schema";
import { providerFor } from "./providers/factory";
import { parseSymbol, type Quote } from "./providers/types";

const QUOTE_TTL_MS = 2 * 60 * 1000;

function cachedQuote(
  symbol: string,
  name: string,
  cached: { price: number; changePct: number; fetchedAt: Date },
): Quote {
  const { market } = parseSymbol(symbol);
  return {
    symbol,
    name,
    market,
    price: cached.price,
    changePct: cached.changePct,
    currency: market === "KR" ? "KRW" : "USD",
    asOf: cached.fetchedAt,
    isMock: false,
  };
}

/**
 * 시세 조회의 유일한 관문 (TTL 캐시).
 * - 캐시가 신선하면 DB 값 반환 (API 호출 0회)
 * - 오래됐으면 Provider 호출 → upsert → 반환
 * - API 실패 시 낡은 캐시라도 반환 (장애 격리)
 * - 모의 데이터는 DB에 저장하지 않음 (키 설정 후 바로 실데이터로 전환되도록)
 */
export async function getQuoteCached(
  symbol: string,
  name: string,
  force = false,
  onFailure?: (message: string, usingCache: boolean) => void,
): Promise<Quote | null> {
  const db = getDb();
  const { code } = parseSymbol(symbol);

  const cached = await db.query.quotes.findFirst({
    where: eq(quotes.stockSymbol, symbol),
  });

  if (!force && cached && Date.now() - cached.fetchedAt.getTime() < QUOTE_TTL_MS) {
    return cachedQuote(symbol, name, cached);
  }

  try {
    const fresh = await providerFor(symbol).getQuote(code);
    if (!fresh.isMock) {
      await db
        .insert(quotes)
        .values({ stockSymbol: symbol, price: fresh.price, changePct: fresh.changePct, fetchedAt: new Date() })
        .onConflictDoUpdate({
          target: quotes.stockSymbol,
          set: { price: fresh.price, changePct: fresh.changePct, fetchedAt: new Date() },
        });
    }
    return { ...fresh, symbol, name };
  } catch (e) {
    onFailure?.(e instanceof Error ? e.message : "시세 조회 실패", Boolean(cached));
    if (cached) return cachedQuote(symbol, name, cached);
    return null; // 한 종목 실패가 전체를 막지 않도록
  }
}

const FUND_TTL_MS = 24 * 60 * 60 * 1000;

/** 재무지표 캐시 (24h TTL) */
export async function getFundamentalsCached(symbol: string) {
  const db = getDb();
  const { code, market } = parseSymbol(symbol);

  const cached = await db.query.financials.findFirst({
    where: eq(financials.stockSymbol, symbol),
  });
  if (cached && Date.now() - cached.fetchedAt.getTime() < FUND_TTL_MS) return cached;

  try {
    const f = await providerFor(symbol).getFundamentals(code);

    // 한국: KIS가 안 주는 ROE·부채비율·배당수익률을 DART로 보강 (기획서 §4.4)
    if (market === "KR" && (f.roe == null || f.debtToEquity == null || f.dividendYield == null)) {
      const { dartEnrich } = await import("./providers/dart");
      const q = await db.query.quotes.findFirst({ where: eq(quotes.stockSymbol, symbol) });
      const extra = await dartEnrich(code, q?.price ?? null);
      f.roe ??= extra.roe;
      f.debtToEquity ??= extra.debtToEquity;
      f.dividendYield ??= extra.dividendYield;
    }

    const row = {
      stockSymbol: symbol,
      per: f.per ?? null,
      pbr: f.pbr ?? null,
      eps: f.eps ?? null,
      roe: f.roe ?? null,
      debtToEquity: f.debtToEquity ?? null,
      dividendYield: f.dividendYield ?? null,
      marketCap: f.marketCap ?? null,
      w52High: f.w52High ?? null,
      w52Low: f.w52Low ?? null,
      fetchedAt: new Date(),
    };
    await db.insert(financials).values(row).onConflictDoUpdate({
      target: financials.stockSymbol,
      set: row,
    });
    return row;
  } catch {
    return cached ?? null;
  }
}

/** 일봉 캐시: 최신 캔들이 3일 이내면 DB 사용, 아니면 전체 리페치 후 upsert */
export async function getCandlesCached(symbol: string, days: number) {
  const db = getDb();
  const { code } = parseSymbol(symbol);

  const cutoff = new Date(Date.now() - days * 86400e3).toISOString().slice(0, 10);
  const existing = await db
    .select()
    .from(candles)
    .where(and(eq(candles.stockSymbol, symbol), gte(candles.date, cutoff)))
    .orderBy(asc(candles.date));

  const newest = existing.at(-1)?.date;
  const fresh = newest && Date.now() - new Date(newest).getTime() < 3 * 86400e3;
  if (existing.length > 5 && fresh) return existing;

  const fetched = await providerFor(symbol).getDailyCandles(code, Math.max(days, 400));
  if (fetched.length > 0) {
    // 400일치를 한 번에 받아두면 기간 토글(1M/3M/1Y)시 API 재호출 불필요
    for (let i = 0; i < fetched.length; i += 500) {
      await db
        .insert(candles)
        .values(fetched.slice(i, i + 500).map((c) => ({ stockSymbol: symbol, ...c })))
        .onConflictDoNothing();
    }
  }
  return fetched.filter((c) => c.date >= cutoff).map((c) => ({ stockSymbol: symbol, id: 0, ...c }));
}

const NEWS_TTL_MS = 60 * 60 * 1000;

/** 뉴스 캐시 (1h TTL). AI 평가는 명시적인 뉴스 갱신에서만 실행 */
export async function getNewsCached(symbol: string, name: string, evaluate = false) {
  const db = getDb();
  const { market, code } = parseSymbol(symbol);

  async function evaluateStoredNews() {
    try {
      const { hasAiKey } = await import("./ai/analyze");
      if (!hasAiKey()) return;

      const unevaluated = await db
        .select({ id: news.id, headline: news.headline })
        .from(news)
        .where(and(eq(news.stockSymbol, symbol), isNull(news.sentiment)))
        .orderBy(desc(news.publishedAt))
        .limit(20);
      if (unevaluated.length === 0) return;

      const { evaluateNewsBatch } = await import("./ai/news-eval");
      const { listNotes } = await import("./db/queries/notes");
      const digest = (await listNotes())
        .slice(0, 10)
        .map((n) => `[${n.tags.join(",")}] ${n.title}`)
        .join(" / ");
      const evals = await evaluateNewsBatch(unevaluated, name, digest);
      for (const ev of evals) {
        await db
          .update(news)
          .set({ sentiment: ev.sentiment, importance: ev.importance, aiNote: ev.note || null })
          .where(eq(news.id, ev.id));
      }
    } catch {
      // 평가 실패는 뉴스 표시를 막지 않으며 다음 수동 갱신에서 재시도
    }
  }

  const rows = await db
    .select()
    .from(news)
    .where(eq(news.stockSymbol, symbol))
    .orderBy(desc(news.publishedAt))
    .limit(20);

  const fresh = rows.some((r) => Date.now() - r.fetchedAt.getTime() < NEWS_TTL_MS);
  if (fresh) {
    if (evaluate) await evaluateStoredNews();
    return rows;
  }

  try {
    const items =
      market === "KR"
        ? await (await import("./providers/naver-news")).naverNews(name)
        : await providerFor(symbol).getNews(code, name);

    // 한 INSERT 안에 같은 url이 두 번 있으면 ON CONFLICT DO UPDATE가 실패하므로 url 기준으로 중복 제거
    const rowsByUrl = new Map(
      items.map((n) => [
        n.url,
        { stockSymbol: symbol, headline: n.headline, source: n.source, url: n.url, publishedAt: n.publishedAt, fetchedAt: new Date() },
      ]),
    );
    if (rowsByUrl.size > 0) {
      await db
        .insert(news)
        .values([...rowsByUrl.values()])
        .onConflictDoUpdate({ target: news.url, set: { fetchedAt: new Date() } });
    }

    if (evaluate) await evaluateStoredNews();

    return db.select().from(news).where(eq(news.stockSymbol, symbol)).orderBy(desc(news.publishedAt)).limit(20);
  } catch {
    return rows; // 실패 시 기존 캐시
  }
}
