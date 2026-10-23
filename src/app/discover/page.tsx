import { Suspense } from "react";
import { DbSetupNotice } from "@/components/db-setup-notice";
import { DiscoverPanel } from "@/components/discover-panel";
import { PageLoading } from "@/components/page-loading";
import { hasDb } from "@/lib/db";
import { latestDiscovery } from "@/lib/db/queries/discoveries";
import { getWatchlist } from "@/lib/db/queries/stocks";
import { isOperator } from "@/lib/operator";

export default function DiscoverPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <DiscoverContent />
    </Suspense>
  );
}

async function DiscoverContent() {
  const operator = await isOperator();
  if (!hasDb()) return <DbSetupNotice />;

  const watchlist = await getWatchlist();
  const latest = await latestDiscovery();

  return (
    <div>
      <div className="mb-1 flex items-baseline gap-3">
        <h1 className="text-xl font-extrabold tracking-tight">발굴</h1>
        <span className="text-xs text-[var(--text-faint)]">
          watchlist 밖에서 내 룰을 통과하고 내 원칙에 맞는 종목 찾기
        </span>
      </div>
      <p className="mb-5 text-xs text-[var(--text-faint)]">
        예측이 아니라 &quot;내 원칙 적합도&quot; 평가입니다. 캐시된 전체 종목을 검사하고 오래된 재무 데이터는 배치로 갱신합니다.
      </p>
      <DiscoverPanel
        canManage={operator}
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
