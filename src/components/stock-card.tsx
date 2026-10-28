import Link from "next/link";
import { removeStockAction } from "@/app/actions";
import { Sparkline } from "@/components/sparkline";
import { changeColorClass, formatChange, formatPrice } from "@/lib/format";
import type { Market, Quote } from "@/lib/providers/types";

const VERDICT_COLOR: Record<string, string> = {
  매수검토: "text-[var(--up)] border-[rgba(240,68,82,0.4)]",
  관망: "text-[var(--accent)] border-[rgba(124,108,240,0.4)]",
  회피: "text-[var(--down)] border-[rgba(49,130,246,0.4)]",
};

export function StockCard({
  stock,
  quote,
  closes = [],
  passedRules = [],
  verdict,
  canManage = false,
}: {
  stock: { symbol: string; name: string; market: Market };
  quote: Quote | null;
  closes?: number[];
  passedRules?: string[];
  verdict?: string;
  canManage?: boolean;
}) {
  return (
    <div className="group relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--text-faint)]">
      <Link
        href={`/stock/${encodeURIComponent(stock.symbol)}`}
        aria-label={`${stock.name} 상세 보기`}
        className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      />
      <div className="flex items-start justify-between">
        <div>
          <div className="font-bold">{stock.name}</div>
          <div className="text-xs text-[var(--text-faint)]">
            {stock.symbol.replace(":", " · ")}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-dim)]">
            {stock.market}
          </span>
          {canManage && <form action={removeStockAction.bind(null, stock.symbol)} className="relative z-10">
            <button
              title="관심 종목에서 제거"
              className="rounded px-1 text-[var(--text-faint)] opacity-0 transition-opacity hover:text-[var(--up)] group-hover:opacity-100"
            >
              ✕
            </button>
          </form>}
        </div>
      </div>
      {quote ? <div className="num mt-3 flex items-baseline gap-2">
        <span className="text-xl font-extrabold tracking-tight">
          {formatPrice(quote.price, quote.market)}
        </span>
        <span className={`text-sm font-semibold ${changeColorClass(quote.changePct)}`}>
          {formatChange(quote.changePct)}
        </span>
      </div> : <div className="mt-3 text-sm text-[var(--text-faint)]">시세 준비 중</div>}

      <Sparkline closes={closes} />

      {(passedRules.length > 0 || verdict) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {passedRules.map((r) => (
            <span
              key={r}
              className="rounded-full border border-[rgba(217,166,63,0.5)] px-2 py-0.5 text-[11px] text-[var(--gold)]"
            >
              ✓ {r}
            </span>
          ))}
          {verdict && (
            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${VERDICT_COLOR[verdict] ?? ""}`}>
              AI: {verdict}
            </span>
          )}
        </div>
      )}

      <div className="mt-2 text-[11px] text-[var(--text-faint)]">
        {quote ? <>{quote.asOf.toLocaleString("ko-KR", {
          timeZone: "Asia/Seoul",
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })} 기준
        {quote.isMock && " · 모의 데이터"}</> : "저장된 시세가 없습니다"}
      </div>
    </div>
  );
}
