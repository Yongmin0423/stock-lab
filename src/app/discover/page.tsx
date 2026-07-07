import { DbSetupNotice } from "@/components/db-setup-notice";
import { DiscoverPanel } from "@/components/discover-panel";
import { hasDb } from "@/lib/db";
import { latestDiscovery } from "@/lib/db/queries/discoveries";
import { getWatchlist } from "@/lib/db/queries/stocks";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  if (!hasDb()) return <DbSetupNotice />;

  const [latest, watchlist] = [await latestDiscovery(), await getWatchlist()];

  return (
    <div>
      <div className="mb-1 flex items-baseline gap-3">
        <h1 className="text-xl font-extrabold tracking-tight">발굴</h1>
        <span className="text-xs text-[var(--text-faint)]">
          watchlist 밖에서 내 룰을 통과하고 내 원칙에 맞는 종목 찾기
        </span>
      </div>
      <p className="mb-5 text-xs text-[var(--text-faint)]">
        예측이 아니라 "내 원칙 적합도" 평가입니다. 유니버스: 미국 대형주 30 + 한국 대형주 20 (KIS 키 필요)
      </p>
      <DiscoverPanel
        initial={
          latest
            ? {
                picks: latest.picks,
                scannedCount: latest.scannedCount,
                candidateCount: latest.candidateCount,
                createdAt: latest.createdAt,
              }
            : null
        }
        watchlist={watchlist.map((s) => s.symbol)}
      />
    </div>
  );
}
