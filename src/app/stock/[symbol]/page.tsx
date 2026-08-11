import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { CandleChart } from "@/components/candle-chart";
import { NewsList } from "@/components/news-list";
import { getFundamentalsCached, getNewsCached, getQuoteCached } from "@/lib/cache";
import { AnalyzePanel } from "@/components/analyze-panel";
import { getDb, hasDb } from "@/lib/db";
import { listAnalyses } from "@/lib/db/queries/analyses";
import { findRelevantNotes } from "@/lib/db/queries/notes";
import { listEnabledRules } from "@/lib/db/queries/rules";
import { stocks } from "@/lib/db/schema";
import { evaluateRules } from "@/lib/rules";
import { changeColorClass, formatChange, formatMarketCap, formatMetric, formatPrice } from "@/lib/format";
import { isMarketOpen } from "@/lib/market-hours";

export const dynamic = "force-dynamic";

export default async function StockPage({ params }: { params: Promise<{ symbol: string }> }) {
  const symbol = decodeURIComponent((await params).symbol);
  if (!hasDb()) notFound();

  const db = getDb();
  const stock = await db.query.stocks.findFirst({ where: eq(stocks.symbol, symbol) });
  if (!stock) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--text-dim)]">
        watchlist에 없는 종목이에요.{" "}
        <Link href="/" className="text-[var(--accent)] underline">
          대시보드에서 추가
        </Link>
        해주세요.
      </div>
    );
  }

  const quoteFailureRef: { value: { message: string; usingCache: boolean } | null } = { value: null };
  const quote = await getQuoteCached(symbol, stock.name, false, (message, usingCache) => {
    quoteFailureRef.value = { message, usingCache };
  });
  const quoteFailure = quoteFailureRef.value;
  const fund = await getFundamentalsCached(symbol);
  const newsItems = await getNewsCached(symbol, stock.name);
  const relatedNotes = await findRelevantNotes(symbol, 4);
  const history = await listAnalyses(symbol, 5);

  const enabledRules = await listEnabledRules();
  const ruleResults = evaluateRules(
    {
      per: fund?.per ?? null,
      pbr: fund?.pbr ?? null,
      eps: fund?.eps ?? null,
      roe: fund?.roe ?? null,
      debtToEquity: fund?.debtToEquity ?? null,
      dividendYield: fund?.dividendYield ?? null,
    },
    enabledRules,
  );

  const latest = history[0];
  const initialAnalysis = latest
    ? {
        result: {
          verdict: latest.verdict,
          confidence: latest.confidence ?? 3,
          reasons: latest.reasons ?? [],
          cited_notes: (latest.citedNoteIds ?? []).map((id) => `note-${id}`),
          risks: latest.risks ?? [],
          challenges: latest.challenges ?? [],
        },
        isMock: false,
        createdAt: latest.createdAt,
      }
    : null;
  const open = isMarketOpen(stock.market);

  const metrics = [
    { k: "PER", v: formatMetric(fund?.per) },
    { k: "PBR", v: formatMetric(fund?.pbr) },
    { k: "EPS", v: formatMetric(fund?.eps) },
    { k: "ROE", v: formatMetric(fund?.roe, "%") },
    { k: "부채비율", v: formatMetric(fund?.debtToEquity, "%") },
    { k: "배당수익률", v: formatMetric(fund?.dividendYield, "%") },
    { k: "시가총액", v: formatMarketCap(fund?.marketCap, stock.market) },
    {
      k: "52주 고저",
      v: fund?.w52Low && fund?.w52High ? `${formatMetric(fund.w52Low)} ~ ${formatMetric(fund.w52High)}` : "—",
    },
  ];

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <Link href="/" className="text-sm text-[var(--text-faint)] hover:text-[var(--text-dim)]">
          ←
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">{stock.name}</h1>
        <span className="text-sm text-[var(--text-faint)]">{symbol.replace(":", " · ")}</span>
        <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-dim)]">
          {stock.market}
        </span>
        {quote && (
          <>
            <span className="num text-2xl font-extrabold">{formatPrice(quote.price, stock.market)}</span>
            <span className={`num text-base font-semibold ${changeColorClass(quote.changePct)}`}>
              {formatChange(quote.changePct)}
            </span>
          </>
        )}
        <span className="flex items-center gap-1.5 text-xs text-[var(--text-faint)]">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${open ? "bg-emerald-500" : "bg-[var(--text-faint)]"}`} />
          {open ? "장중" : "장마감"}
          {quote && ` · ${quote.asOf.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 기준`}
        </span>
      </div>

      {quoteFailure && (
        <div className="mb-4 rounded-xl border border-[rgba(240,68,82,0.4)] bg-[rgba(240,68,82,0.08)] px-4 py-3 text-sm text-[var(--up)]">
          현재가 조회 실패: {quoteFailure.message}
          {quoteFailure.usingCache && " — 마지막 저장값을 표시하고 있습니다."}
        </div>
      )}

      {/* 차트 */}
      <CandleChart symbol={symbol} />

      {/* 재무 지표 */}
      <h2 className="mb-3 mt-6 text-[13px] font-bold uppercase tracking-wider text-[var(--text-dim)]">재무 지표</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.k} className="rounded-lg bg-[var(--surface-2)] px-3 py-2.5">
            <div className="text-[11px] text-[var(--text-faint)]">{m.k}</div>
            <div className="num mt-0.5 font-bold">{m.v}</div>
          </div>
        ))}
      </div>
      {fund && (
        <p className="mt-2 text-[11px] text-[var(--text-faint)]">
          재무 데이터 {new Date(fund.fetchedAt).toLocaleString("ko-KR")} 갱신 (24시간 캐시)
        </p>
      )}

      {/* 스크리닝 룰 */}
      <h2 className="mb-3 mt-8 text-[13px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
        스크리닝 룰{" "}
        <Link href="/settings" className="normal-case text-[var(--text-faint)] underline hover:text-[var(--text-dim)]">
          (설정에서 편집)
        </Link>
      </h2>
      <div className="flex flex-wrap gap-2">
        {ruleResults.map((r) => (
          <div
            key={r.name}
            className={`rounded-xl border px-4 py-2.5 ${
              r.passed ? "border-[rgba(217,166,63,0.5)]" : "border-[var(--border)]"
            }`}
          >
            <div className={`text-sm font-bold ${r.passed ? "text-[var(--gold)]" : "text-[var(--text-dim)]"}`}>
              {r.passed ? "✓" : "✗"} {r.name}
            </div>
            <div className="num mt-1 flex gap-3 text-[11px] text-[var(--text-faint)]">
              {r.details.map((d) => (
                <span key={d.metric} className={d.passed ? "" : "text-[var(--up)]"}>
                  {d.label} {d.value ?? "—"} ({d.target})
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* AI 분석 */}
      <div className="mt-8">
        <AnalyzePanel symbol={symbol} initial={initialAnalysis} />
      </div>

      {/* 분석 이력 */}
      {history.length > 1 && (
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4">
          {history.slice(1).map((h) => (
            <div key={h.id} className="flex items-baseline gap-3 border-b border-[var(--border)] py-2.5 text-sm last:border-none">
              <span className="font-bold">{h.verdict}</span>
              <span className="text-xs text-[var(--text-dim)]">{(h.reasons ?? [])[0]}</span>
              <span className="num ml-auto shrink-0 text-xs text-[var(--text-faint)]">
                {h.priceAtAnalysis ?? "—"} · {new Date(h.createdAt).toLocaleDateString("ko-KR")}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 뉴스 */}
      <h2 className="mb-3 mt-8 text-[13px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
        최근 뉴스
      </h2>
      <NewsList items={newsItems.slice(0, 10)} />

      {/* 관련 노트 */}
      {relatedNotes.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-[13px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
            관련 노트
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {relatedNotes.map((n) => (
              <Link
                key={n.id}
                href={`/notes/${n.id}`}
                className="rounded-xl border border-[rgba(217,166,63,0.35)] bg-[var(--surface)] p-3 hover:border-[var(--gold)]"
              >
                <div className="text-sm font-bold text-[var(--gold)]">✎ {n.title}</div>
                <p className="mt-1 line-clamp-1 text-xs text-[var(--text-dim)]">{n.content}</p>
              </Link>
            ))}
          </div>
        </>
      )}

    </div>
  );
}
