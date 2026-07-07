import { addStockAction } from "@/app/actions";

/** 콜드 스타트 해결: 하드코딩 스타터 목록 (기획서 F1) */
const STARTERS = [
  { symbol: "US:AAPL", name: "Apple", market: "US" as const },
  { symbol: "US:MSFT", name: "Microsoft", market: "US" as const },
  { symbol: "US:NVDA", name: "NVIDIA", market: "US" as const },
  { symbol: "KR:005930", name: "삼성전자", market: "KR" as const },
  { symbol: "KR:005380", name: "현대차", market: "KR" as const },
  { symbol: "KR:000660", name: "SK하이닉스", market: "KR" as const },
];

export function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center">
      <p className="text-sm text-[var(--text-dim)]">
        아직 관심 종목이 없어요. 상단 검색(⌘K)으로 찾거나, 아래에서 바로 시작해보세요.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {STARTERS.map((s) => (
          <form key={s.symbol} action={addStockAction.bind(null, s.symbol, s.name, s.market)}>
            <button className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-sm text-[var(--text-dim)] hover:border-[var(--accent)] hover:text-[var(--text)]">
              + {s.name}
            </button>
          </form>
        ))}
      </div>
      <p className="mt-4 text-xs text-[var(--text-faint)]">한국 종목은 KIS 앱키 설정 후 시세가 표시됩니다.</p>
    </div>
  );
}
