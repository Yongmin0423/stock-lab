const cards = Array.from({ length: 3 });
const rows = Array.from({ length: 3 });

// 홈 DashboardContent의 레이아웃을 따른다. "Watchlist" 같은 실제 화면 문구는 넣지 않는다
// (tests/dashboard-production.test.mjs가 그 문구로 본문 완료 여부를 판단한다).
export function DashboardLoading() {
  return (
    <div aria-label="대시보드 불러오는 중" aria-busy="true" className="animate-pulse motion-reduce:animate-none">
      {/* 시장 상태 바 */}
      <div className="mb-4 flex gap-5 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-3.5 w-20 shrink-0 rounded bg-[var(--surface-2)]" />
        ))}
      </div>

      {/* 브리핑 스트립 */}
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3">
        <div className="h-5 w-20 shrink-0 rounded-full bg-[var(--surface-2)]" />
        <div className="h-3.5 flex-1 rounded bg-[var(--surface-2)]" />
        <div className="h-3 w-16 shrink-0 rounded bg-[var(--surface-2)]" />
      </div>

      {/* 관심 종목 카드 */}
      <div className="mb-3 h-4 w-24 rounded bg-[var(--surface-2)]" />
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="h-4 w-24 rounded bg-[var(--surface-2)]" />
                <div className="mt-1.5 h-3 w-16 rounded bg-[var(--surface-2)]" />
              </div>
              <div className="h-4 w-7 rounded bg-[var(--surface-2)]" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="h-6 w-28 rounded bg-[var(--surface-2)]" />
              <div className="h-4 w-12 rounded bg-[var(--surface-2)]" />
            </div>
            <div className="mt-2 h-7 rounded bg-[var(--surface-2)]" />
            <div className="mt-2 h-3 w-14 rounded bg-[var(--surface-2)]" />
          </div>
        ))}
      </div>

      {/* 추천 리스트 */}
      <div className="mt-6">
        <div className="mb-3 h-4 w-28 rounded bg-[var(--surface-2)]" />
        <div className="h-20 rounded-xl border border-dashed border-[var(--border)]" />
      </div>

      {/* 주목 종목 */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-3 h-4 w-32 rounded bg-[var(--surface-2)]" />
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4">
            {rows.map((_, i) => (
              <div key={i} className="border-b border-[var(--border)] py-3 last:border-none">
                <div className="h-3.5 w-3/4 rounded bg-[var(--surface-2)]" />
                <div className="mt-1.5 h-3 w-1/2 rounded bg-[var(--surface-2)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
