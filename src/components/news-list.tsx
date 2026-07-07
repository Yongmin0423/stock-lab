import { timeAgo } from "@/lib/format";

export type NewsRow = {
  id: number;
  stockSymbol: string;
  headline: string;
  source: string | null;
  url: string;
  publishedAt: Date | null;
  sentiment?: "호재" | "악재" | "중립" | null;
  importance?: number | null;
  aiNote?: string | null;
};

const SENTIMENT_STYLE: Record<string, string> = {
  호재: "bg-[rgba(240,68,82,0.12)] text-[var(--up)]",
  악재: "bg-[rgba(49,130,246,0.12)] text-[var(--down)]",
  중립: "bg-[var(--surface-2)] text-[var(--text-faint)]",
};

export function NewsList({ items, showSymbol = false }: { items: NewsRow[]; showSymbol?: boolean }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-xs text-[var(--text-faint)]">
        아직 뉴스가 없어요.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4">
      {items.map((n) => (
        <a
          key={n.id}
          href={n.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block border-b border-[var(--border)] py-3 last:border-none"
        >
          <div className="flex items-baseline gap-2.5">
            {showSymbol && (
              <span className="shrink-0 rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-dim)]">
                {n.stockSymbol.split(":")[1]}
              </span>
            )}
            {n.sentiment && n.sentiment !== "중립" && (
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${SENTIMENT_STYLE[n.sentiment]}`}>
                {n.sentiment}
              </span>
            )}
            {(n.importance ?? 0) >= 3 && (
              <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold bg-[rgba(217,166,63,0.12)] text-[var(--gold)]">
                중요
              </span>
            )}
            <span className={`text-sm leading-snug hover:underline ${(n.importance ?? 2) <= 1 ? "text-[var(--text-dim)]" : ""}`}>
              {n.headline}
            </span>
            <span className="ml-auto shrink-0 text-xs text-[var(--text-faint)]">
              {n.source} · {timeAgo(n.publishedAt)}
            </span>
          </div>
          {n.aiNote && (
            <div className="mt-1 pl-1 text-xs text-[var(--gold)]">✎ {n.aiNote}</div>
          )}
        </a>
      ))}
    </div>
  );
}
