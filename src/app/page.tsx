import { DbSetupNotice } from "@/components/db-setup-notice";
import { EmptyState } from "@/components/empty-state";
import { SearchDialog } from "@/components/search-dialog";
import { StockCard } from "@/components/stock-card";
import { hasDb } from "@/lib/db";
import { getWatchlistWithQuotes } from "@/lib/db/queries/stocks";
import { isMarketOpen } from "@/lib/market-hours";
import type { Quote } from "@/lib/providers/types";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  if (!hasDb()) return <DbSetupNotice />;

  let quotes: Quote[];
  try {
    quotes = await getWatchlistWithQuotes();
  } catch (e) {
    return <DbSetupNotice error={e instanceof Error ? e.message : "알 수 없는 오류"} />;
  }

  const hasMock = quotes.some((q) => q.isMock);
  const usOpen = isMarketOpen("US");

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${usOpen ? "bg-emerald-500" : "bg-[var(--text-faint)]"}`}
          />
          미국 장 {usOpen ? "거래 중" : "마감"}
        </div>
        <SearchDialog existing={quotes.map((q) => q.symbol)} />
      </div>

      {hasMock && (
        <div className="mb-4 rounded-xl border border-[rgba(217,166,63,0.4)] bg-[rgba(217,166,63,0.08)] px-4 py-3 text-sm text-[var(--gold)]">
          모의 데이터 모드 — <code className="font-mono">FINNHUB_API_KEY</code> 설정 후 서버를 재시작하세요.
        </div>
      )}

      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
        Watchlist {quotes.length > 0 && <span className="text-[var(--text-faint)]">({quotes.length})</span>}
      </h2>

      {quotes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {quotes.map((q) => (
            <StockCard key={q.symbol} quote={q} />
          ))}
        </div>
      )}
    </div>
  );
}
