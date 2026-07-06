import { timeAgo } from "@/lib/format";

export type NewsRow = {
  id: number;
  stockSymbol: string;
  headline: string;
  source: string | null;
  url: string;
  publishedAt: Date | null;
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
          className="flex items-baseline gap-3 border-b border-[var(--border)] py-3 last:border-none"
        >
          {showSymbol && (
            <span className="shrink-0 rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-dim)]">
              {n.stockSymbol.split(":")[1]}
            </span>
          )}
          <span className="text-sm leading-snug hover:underline">{n.headline}</span>
          <span className="ml-auto shrink-0 text-xs text-[var(--text-faint)]">
            {n.source} · {timeAgo(n.publishedAt)}
          </span>
        </a>
      ))}
    </div>
  );
}
