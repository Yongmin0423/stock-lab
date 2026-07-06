import Link from "next/link";
import { DbSetupNotice } from "@/components/db-setup-notice";
import { NewsList, type NewsRow } from "@/components/news-list";
import { getNewsCached } from "@/lib/cache";
import { hasDb } from "@/lib/db";
import { getWatchlist } from "@/lib/db/queries/stocks";

export const dynamic = "force-dynamic";

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string }>;
}) {
  if (!hasDb()) return <DbSetupNotice />;
  const { symbol: filter } = await searchParams;

  const list = await getWatchlist();
  const all: NewsRow[] = [];
  // KIS 초당 제한 대비 순차 수집 (대부분 1h 캐시라 DB 조회로 끝남)
  for (const s of list) {
    if (filter && s.symbol !== filter) continue;
    const items = await getNewsCached(s.symbol, s.name);
    all.push(...items);
  }
  all.sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));

  return (
    <div>
      <h1 className="mb-4 text-xl font-extrabold tracking-tight">뉴스</h1>

      {/* 종목 필터 칩 */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/news"
          className={`rounded-full border px-3 py-1 text-xs ${
            !filter
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-[var(--border)] text-[var(--text-dim)]"
          }`}
        >
          전체
        </Link>
        {list.map((s) => (
          <Link
            key={s.symbol}
            href={`/news?symbol=${encodeURIComponent(s.symbol)}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              filter === s.symbol
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--text-dim)]"
            }`}
          >
            {s.name}
          </Link>
        ))}
      </div>

      <NewsList items={all.slice(0, 50)} showSymbol />
    </div>
  );
}
