import Link from "next/link";
import { removeStockAction } from "@/app/actions";
import { changeColorClass, formatChange, formatPrice } from "@/lib/format";
import type { Quote } from "@/lib/providers/types";

export function StockCard({ quote }: { quote: Quote }) {
  return (
    <div className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--text-faint)]">
      <div className="flex items-start justify-between">
        <Link href={`/stock/${encodeURIComponent(quote.symbol)}`} className="hover:underline">
          <div className="font-bold">{quote.name}</div>
          <div className="text-xs text-[var(--text-faint)]">
            {quote.symbol.replace(":", " · ")}
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-dim)]">
            {quote.market}
          </span>
          <form action={removeStockAction.bind(null, quote.symbol)}>
            <button
              title="관심 종목에서 제거"
              className="rounded px-1 text-[var(--text-faint)] opacity-0 transition-opacity hover:text-[var(--up)] group-hover:opacity-100"
            >
              ✕
            </button>
          </form>
        </div>
      </div>
      <div className="num mt-3 flex items-baseline gap-2">
        <span className="text-xl font-extrabold tracking-tight">
          {formatPrice(quote.price, quote.market)}
        </span>
        <span className={`text-sm font-semibold ${changeColorClass(quote.changePct)}`}>
          {formatChange(quote.changePct)}
        </span>
      </div>
      <div className="mt-2 text-[11px] text-[var(--text-faint)]">
        {quote.asOf.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 기준
        {quote.isMock && " · 모의 데이터"}
      </div>
    </div>
  );
}
