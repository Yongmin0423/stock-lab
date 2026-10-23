import Link from "next/link";
import { Suspense } from "react";
import { addStockAction } from "@/app/actions";
import { DbSetupNotice } from "@/components/db-setup-notice";
import { PageLoading } from "@/components/page-loading";
import { hasDb } from "@/lib/db";
import { listMaster } from "@/lib/db/queries/master";
import { getWatchlist } from "@/lib/db/queries/stocks";
import { isOperator } from "@/lib/operator";

type Market = "US" | "KR";

function pageHref(page: number, q?: string, m?: string) {
  const p = new URLSearchParams();
  if (page > 1) p.set("page", String(page));
  if (q) p.set("q", q);
  if (m) p.set("m", m);
  const s = p.toString();
  return `/stocks${s ? `?${s}` : ""}`;
}

export default function StocksPage(props: {
  searchParams: Promise<{ page?: string; q?: string; m?: string }>;
}) {
  return (
    <Suspense fallback={<PageLoading />}>
      <StocksContent {...props} />
    </Suspense>
  );
}

async function StocksContent({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; m?: string }>;
}) {
  if (!hasDb()) return <DbSetupNotice />;
  const operator = await isOperator();
  const { page: pageRaw, q, m } = await searchParams;
  const page = Number(pageRaw) || 1;
  const market = m === "US" || m === "KR" ? (m as Market) : undefined;

  const [{ rows, total, totalPages }, watchlist] = [
    await listMaster({ page, q, market }),
    await getWatchlist(),
  ];
  const inList = new Set(watchlist.map((s) => s.symbol));

  const pages = [...new Set([1, page - 2, page - 1, page, page + 1, page + 2, totalPages])]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-extrabold tracking-tight">전체 종목</h1>
        <span className="text-xs text-[var(--text-faint)]">
          {total.toLocaleString()}개 · 한국 전체 + 미국 주요 대형주 (그 외 미국 종목은 ⌘K 검색)
        </span>
      </div>

      <div className="mb-3 mt-3 flex flex-wrap items-center gap-2">
        <form className="mr-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="이름 또는 코드로 필터…"
            className="w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
          />
          {market && <input type="hidden" name="m" value={market} />}
        </form>
        {[
          { label: "전체", value: undefined },
          { label: "🇰🇷 한국", value: "KR" },
          { label: "🇺🇸 미국", value: "US" },
        ].map((t) => (
          <Link
            key={t.label}
            href={pageHref(1, q, t.value)}
            className={`rounded-full border px-3 py-1 text-xs ${
              market === t.value
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text-faint)]"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--text-dim)]">
          {q ? (
            "조건에 맞는 종목이 없어요."
          ) : (
            <>
              종목 마스터가 비어 있어요. 터미널에서 실행하세요:
              <code className="mt-2 block font-mono text-xs text-[var(--gold)]">node scripts/load-krx-master.mjs</code>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4">
            {rows.map((r) => {
              const symbol = `${r.market}:${r.code}`;
              const added = inList.has(symbol);
              return (
                <div key={symbol} className="flex items-center gap-3 border-b border-[var(--border)] py-2.5 last:border-none">
                  <span
                    className={`w-9 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-bold ${
                      r.market === "KR"
                        ? "bg-[rgba(240,68,82,0.12)] text-[var(--up)]"
                        : "bg-[rgba(49,130,246,0.12)] text-[var(--down)]"
                    }`}
                  >
                    {r.market}
                  </span>
                  <span className="num w-20 shrink-0 text-xs text-[var(--text-faint)]">{r.code}</span>
                  {added ? (
                    <Link href={`/stock/${encodeURIComponent(symbol)}`} className="truncate text-sm font-semibold hover:underline">
                      {r.name}
                    </Link>
                  ) : (
                    <span className="truncate text-sm">{r.name}</span>
                  )}
                  {operator && <form action={addStockAction.bind(null, symbol, r.name, r.market)} className="ml-auto shrink-0">
                    <button
                      disabled={added}
                      className="rounded-lg border border-[rgba(124,108,240,0.5)] px-3 py-1 text-xs font-bold text-[var(--accent)] hover:bg-[rgba(124,108,240,0.08)] disabled:border-[var(--border)] disabled:text-[var(--text-faint)]"
                    >
                      {added ? "추가됨 ✓" : "+ 추가"}
                    </button>
                  </form>}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="num mt-4 flex flex-wrap items-center gap-1.5">
              {page > 1 && (
                <Link href={pageHref(page - 1, q, market)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-dim)] hover:border-[var(--text-faint)]">
                  ‹ 이전
                </Link>
              )}
              {pages.map((p, i) => (
                <span key={p} className="flex items-center gap-1.5">
                  {i > 0 && pages[i - 1] !== p - 1 && <span className="text-xs text-[var(--text-faint)]">…</span>}
                  <Link
                    href={pageHref(p, q, market)}
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
                <Link href={pageHref(page + 1, q, market)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-dim)] hover:border-[var(--text-faint)]">
                  다음 ›
                </Link>
              )}
              <span className="ml-2 text-xs text-[var(--text-faint)]">
                {page} / {totalPages} 페이지
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
