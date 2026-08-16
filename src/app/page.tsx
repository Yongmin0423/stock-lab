import Link from "next/link";
import { DbSetupNotice } from "@/components/db-setup-notice";
import { EmptyState } from "@/components/empty-state";
import { MarketQuestion } from "@/components/market-question";
import { RefreshQuotesButton } from "@/components/refresh-quotes-button";
import { SearchDialog } from "@/components/search-dialog";
import { StockCard } from "@/components/stock-card";
import { hasDb } from "@/lib/db";
import { latestVerdicts } from "@/lib/db/queries/analyses";
import { latestBriefing } from "@/lib/db/queries/briefings";
import { latestDiscovery } from "@/lib/db/queries/discoveries";
import { listNotes } from "@/lib/db/queries/notes";
import { listEnabledRules } from "@/lib/db/queries/rules";
import { getDashboardExtras, getWatchlistWithQuotes } from "@/lib/db/queries/stocks";
import { changeColorClass, formatChange, timeAgo } from "@/lib/format";
import { getMarketBar } from "@/lib/market-overview";
import { isMarketOpen } from "@/lib/market-hours";
import type { Quote } from "@/lib/providers/types";
import { evaluateRules } from "@/lib/rules";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  if (!hasDb()) return <DbSetupNotice />;

  let quotes: Quote[];
  const quoteFailures: Array<{ name: string; message: string; usingCache: boolean }> = [];
  try {
    quotes = await getWatchlistWithQuotes((failure) => quoteFailures.push(failure));
  } catch (e) {
    return <DbSetupNotice error={e instanceof Error ? e.message : "알 수 없는 오류"} />;
  }

  const symbols = quotes.map((q) => q.symbol);
  const [bar, extras, verdicts, enabledRules, brief, notes, discovery] = await Promise.all([
    getMarketBar(),
    getDashboardExtras(symbols),
    latestVerdicts(),
    listEnabledRules(),
    latestBriefing(),
    listNotes(),
    latestDiscovery(),
  ]);
  const recentNotes = notes.slice(0, 3);

  // 추천 리스트: 최근 발굴 결과 중 아직 watchlist에 없는 것만
  const recommendations = (discovery?.picks ?? []).filter((p) => !symbols.includes(p.symbol)).slice(0, 3);

  const hasMock = quotes.some((q) => q.isMock);
  const usOpen = isMarketOpen("US");
  const krOpen = isMarketOpen("KR");

  return (
    <div>
      {/* 시장 상태 바 */}
      {bar.length > 0 && (
        <div className="num mb-4 flex gap-5 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[13px]">
          <span className="flex items-center gap-1.5 whitespace-nowrap text-[var(--text-dim)]">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${krOpen ? "bg-emerald-500" : "bg-[var(--text-faint)]"}`} />
            한국 {krOpen ? "장중" : "마감"}
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap text-[var(--text-dim)]">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${usOpen ? "bg-emerald-500" : "bg-[var(--text-faint)]"}`} />
            미국 {usOpen ? "장중" : "마감"}
          </span>
          {bar.map((b) => (
            <span key={b.name} className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-[var(--text-dim)]">{b.name}</span>
              <b>{b.value}</b>
              {b.changePct != null && (
                <span className={changeColorClass(b.changePct)}>{formatChange(b.changePct)}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* 브리핑 스트립 (없으면 안내) */}
      {brief ? (
        <Link
          href={`/briefing?id=${brief.id}`}
          className="mb-4 flex items-center gap-3 rounded-xl border border-[rgba(124,108,240,0.35)] bg-gradient-to-r from-[rgba(124,108,240,0.12)] to-transparent px-4 py-3"
        >
          <span className="whitespace-nowrap rounded-full border border-[rgba(124,108,240,0.4)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--accent)]">
            {brief.slot === "morning" ? "아침" : "저녁"} 브리핑
          </span>
          <span className="truncate text-sm text-[var(--text-dim)]">{brief.marketSummary}</span>
          <span className="ml-auto whitespace-nowrap text-xs text-[var(--text-faint)]">
            {timeAgo(brief.createdAt)} · 보기 →
          </span>
        </Link>
      ) : (
        <Link
          href="/briefing"
          className="mb-4 flex items-center gap-3 rounded-xl border border-dashed border-[var(--border)] px-4 py-3 hover:border-[var(--accent)]"
        >
          <span className="whitespace-nowrap rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--text-faint)]">
            브리핑
          </span>
          <span className="truncate text-sm text-[var(--text-faint)]">
            아직 브리핑이 없어요 — 아침/저녁 시장 요약이 여기 표시됩니다
          </span>
          <span className="ml-auto whitespace-nowrap text-xs text-[var(--accent)]">생성하러 가기 →</span>
        </Link>
      )}

      <div className="mb-4 flex items-center gap-2">
        <SearchDialog existing={symbols} />
        <RefreshQuotesButton />
      </div>

      {quotes.length > 0 && <MarketQuestion />}

      {hasMock && (
        <div className="mb-4 rounded-xl border border-[rgba(217,166,63,0.4)] bg-[rgba(217,166,63,0.08)] px-4 py-3 text-sm text-[var(--gold)]">
          일부 시세가 모의 데이터입니다 — <code className="font-mono">.env.local</code>의 키 설정을 확인하세요.
        </div>
      )}

      {quoteFailures.length > 0 && (
        <div className="mb-4 rounded-xl border border-[rgba(240,68,82,0.4)] bg-[rgba(240,68,82,0.08)] px-4 py-3 text-sm text-[var(--up)]">
          시세 조회 실패 — {quoteFailures.map((f) => `${f.name}: ${f.message}${f.usingCache ? " (저장값 표시 중)" : ""}`).join(" · ")}
        </div>
      )}

      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
        Watchlist {quotes.length > 0 && <span className="text-[var(--text-faint)]">({quotes.length})</span>}
      </h2>

      {quotes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {quotes.map((q) => {
            const fund = extras.funds[q.symbol];
            const passed = fund
              ? evaluateRules(
                  {
                    per: fund.per,
                    pbr: fund.pbr,
                    eps: fund.eps,
                    roe: fund.roe,
                    debtToEquity: fund.debtToEquity,
                    dividendYield: fund.dividendYield,
                  },
                  enabledRules,
                )
                  .filter((r) => r.passed)
                  .map((r) => r.name)
              : [];
            return (
              <StockCard
                key={q.symbol}
                quote={q}
                closes={extras.closes[q.symbol] ?? []}
                passedRules={passed}
                verdict={verdicts[q.symbol]}
              />
            );
          })}
        </div>
      )}

      {/* 추천 리스트 (최근 발굴) — 항상 표시 */}
      <div className="mt-6">
        <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
          추천 리스트{" "}
          <Link href="/discover" className="normal-case text-[var(--text-faint)] underline hover:text-[var(--text-dim)]">
            (발굴에서 전체 보기)
          </Link>
        </h2>
        {recommendations.length === 0 ? (
          <Link
            href="/discover"
            className="block rounded-xl border border-dashed border-[var(--border)] p-5 text-center text-sm text-[var(--text-faint)] hover:border-[var(--gold)]"
          >
            발굴을 실행하면 내 룰·원칙에 맞는 종목이 여기 표시됩니다
            <span className="mt-1 block text-xs">
              (실행하러 가기 → · ANTHROPIC_API_KEY 필요 · 배포 후엔 아침·저녁 브리핑과 함께 자동 갱신)
            </span>
          </Link>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {recommendations.map((p) => (
              <Link
                key={p.symbol}
                href="/discover"
                className="rounded-xl border border-[rgba(217,166,63,0.4)] bg-gradient-to-b from-[rgba(217,166,63,0.07)] to-transparent p-4 hover:border-[var(--gold)]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold">{p.name}</span>
                  <span className="ml-auto rounded-full bg-[rgba(217,166,63,0.12)] px-2 py-0.5 text-[11px] font-bold text-[var(--gold)]">
                    적합도 {p.fit_score}/5
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm text-[var(--text-dim)]">{p.reason}</p>
                <div className="mt-2 truncate text-xs text-[var(--gold)]">근거: {p.cited}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 주목 종목 + 최근 노트 — 항상 표시 */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
            주목 종목 <span className="normal-case text-[var(--text-faint)]">(최근 브리핑)</span>
          </h2>
          {(brief?.watchItems?.length ?? 0) > 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4">
              {brief!.watchItems!.slice(0, 3).map((w, i) => (
                <Link
                  key={i}
                  href={`/stock/${encodeURIComponent(w.symbol)}`}
                  className="flex gap-2.5 border-b border-[var(--border)] py-3 last:border-none"
                >
                  <span className="text-[var(--gold)]">◆</span>
                  <div className="min-w-0">
                    <div className="text-sm">
                      <b>{w.name}</b> — {w.reason}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-[var(--text-faint)]">근거: {w.basis}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Link
              href="/briefing"
              className="block rounded-xl border border-dashed border-[var(--border)] p-5 text-center text-sm text-[var(--text-faint)] hover:border-[var(--gold)]"
            >
              브리핑을 생성하면 룰 진입·판단 갱신 시점 등<br />
              지금 주목할 종목이 근거와 함께 표시됩니다 →
            </Link>
          )}
        </div>
        <div>
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
            최근 노트
          </h2>
          {recentNotes.length > 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4">
              {recentNotes.map((n) => (
                <Link key={n.id} href={`/notes/${n.id}`} className="flex gap-2.5 border-b border-[var(--border)] py-3 last:border-none">
                  <span className="text-[var(--accent)]">✎</span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{n.title}</div>
                    <div className="mt-0.5 text-xs text-[var(--text-faint)]">
                      {n.source ? `${n.source} · ` : ""}
                      {timeAgo(n.updatedAt)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Link
              href="/notes/new"
              className="block rounded-xl border border-dashed border-[var(--border)] p-5 text-center text-sm text-[var(--text-faint)] hover:border-[var(--accent)]"
            >
              첫 노트를 작성하면 AI 분석이 당신의 원칙을
              <br />
              반영하기 시작합니다 — 이 앱의 심장이에요 →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
