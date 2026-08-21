import Link from "next/link";
import { Suspense } from "react";
import { DbSetupNotice } from "@/components/db-setup-notice";
import { NewsList } from "@/components/news-list";
import { PageLoading } from "@/components/page-loading";
import { RefreshNewsButton } from "@/components/refresh-news-button";
import { hasDb } from "@/lib/db";
import { listAllNews } from "@/lib/db/queries/news";
import { getWatchlist } from "@/lib/db/queries/stocks";

function pageHref(page: number, symbol?: string) {
  const p = new URLSearchParams();
  if (page > 1) p.set("page", String(page));
  if (symbol) p.set("symbol", symbol);
  const s = p.toString();
  return `/news${s ? `?${s}` : ""}`;
}

export default function NewsPage(props: {
  searchParams: Promise<{ symbol?: string; page?: string }>;
}) {
  return (
    <Suspense fallback={<PageLoading />}>
      <NewsContent {...props} />
    </Suspense>
  );
}

async function NewsContent({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string; page?: string }>;
}) {
  if (!hasDb()) return <DbSetupNotice />;
  const { symbol: filter, page: pageRaw } = await searchParams;
  const page = Number(pageRaw) || 1;

  // DB만 조회 — 즉시 응답. 수집·AI 평가는 ↻ 버튼 또는 cron이 담당
  const [{ rows, total, totalPages }, list] = [
    await listAllNews({ page, symbol: filter }),
    await getWatchlist(),
  ];

  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-extrabold tracking-tight">뉴스</h1>
        <span className="text-xs text-[var(--text-faint)]">{total.toLocaleString()}건</span>
        <div className="ml-auto">
          <RefreshNewsButton />
        </div>
      </div>

      {/* 종목 필터 칩 */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/news"
          className={`rounded-full border px-3 py-1 text-xs ${
            !filter ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-dim)]"
          }`}
        >
          전체
        </Link>
        {list.map((s) => (
          <Link
            key={s.symbol}
            href={pageHref(1, s.symbol)}
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

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--text-dim)]">
          아직 뉴스가 없어요 — 우측 상단 ↻ 버튼으로 수집해보세요.
        </div>
      ) : (
        <>
          <NewsList items={rows} showSymbol />

          {totalPages > 1 && (
            <div className="num mt-4 flex flex-wrap items-center gap-1.5">
              {page > 1 && (
                <Link href={pageHref(page - 1, filter)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-dim)] hover:border-[var(--text-faint)]">
                  ‹ 이전
                </Link>
              )}
              {pages.map((p, i) => (
                <span key={p} className="flex items-center gap-1.5">
                  {i > 0 && pages[i - 1] !== p - 1 && <span className="text-xs text-[var(--text-faint)]">…</span>}
                  <Link
                    href={pageHref(p, filter)}
                    className={`rounded-lg border px-3 py-1.5 text-xs ${
                      p === page
                        ? "border-[var(--accent)] font-bold text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text-faint)]"
                    }`}
                  >
                    {p}
                  </Link>
                </span>
              ))}
              {page < totalPages && (
                <Link href={pageHref(page + 1, filter)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-dim)] hover:border-[var(--text-faint)]">
                  다음 ›
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
