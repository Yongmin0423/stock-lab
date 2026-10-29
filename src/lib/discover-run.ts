import { hasAiKey } from "@/lib/ai/analyze";
import { mockDiscover, runDiscover, type DiscoverCandidate } from "@/lib/ai/discover";
import { listNotes } from "@/lib/db/queries/notes";
import { listEnabledRules } from "@/lib/db/queries/rules";
import { listScreeningFundamentals } from "@/lib/db/queries/screening";
import { getWatchlist } from "@/lib/db/queries/stocks";
import { evaluateRules, ruleMetrics } from "@/lib/rules";

export interface DiscoveryOutput {
  picks: Array<{ symbol: string; name: string; fit_score: number; reason: string; cited: string; caution: string }>;
  scannedCount: number;
  candidateCount: number;
  isMock: boolean;
  message?: string;
}

/**
 * 발굴 전체 파이프라인 (2단계 깔때기) — 수동 버튼과 브리핑 cron이 공용
 * 1) 유니버스(watchlist 제외)에 스크리닝 룰 적용
 * 2) 통과 후보를 AI가 내 노트 기준으로 적합도 평가 → 실키일 때만 DB 저장
 */
export async function generateDiscovery(): Promise<DiscoveryOutput> {
  const enabledRules = await listEnabledRules();
  if (enabledRules.length === 0) {
    throw new Error("활성화된 룰이 없어요 — 설정에서 룰을 먼저 만드세요");
  }

  const [watchlistRows, cached] = await Promise.all([getWatchlist(), listScreeningFundamentals()]);
  const watchlist = new Set(watchlistRows.map((s) => s.symbol));
  const universe = cached.filter(
    (u) =>
      !watchlist.has(u.symbol) &&
      [u.per, u.pbr, u.eps, u.roe, u.debtToEquity, u.dividendYield].some((value) => value != null),
  );

  if (universe.length === 0) {
    return {
      picks: [],
      scannedCount: 0,
      candidateCount: 0,
      isMock: !hasAiKey(),
      message: "스크리닝 데이터가 아직 없어요. 배포 후 갱신 cron이 종목 데이터를 순차적으로 채웁니다.",
    };
  }

  const candidates: DiscoverCandidate[] = [];
  for (const u of universe) {
    const ruleResults = evaluateRules(ruleMetrics(u), enabledRules);
    const passedCount = ruleResults.filter((r) => r.passed).length;
    if (passedCount > 0) {
      candidates.push({
        symbol: u.symbol,
        name: u.name,
        fundamentals: { per: u.per, pbr: u.pbr, eps: u.eps, roe: u.roe, debtToEquity: u.debtToEquity, dividendYield: u.dividendYield },
        ruleResults,
        passedCount,
      });
    }
  }

  candidates.sort((a, b) => b.passedCount - a.passedCount);
  const top = candidates.slice(0, 10);

  if (top.length === 0) {
    return {
      picks: [],
      scannedCount: universe.length,
      candidateCount: 0,
      isMock: !hasAiKey(),
      message: "룰을 통과한 종목이 없어요. 설정에서 룰 기준을 조정해보세요.",
    };
  }

  const notes = await listNotes();
  const result = hasAiKey() ? await runDiscover(top, notes.slice(0, 8)) : mockDiscover(top);
  const candidatesBySymbol = new Map(top.flatMap((c) => [[c.symbol, c], [c.symbol.split(":")[1], c]]));
  const picks = result.picks
    .sort((a, b) => b.fit_score - a.fit_score)
    .flatMap((p) => {
      const candidate = candidatesBySymbol.get(p.symbol);
      return candidate ? [{ ...p, symbol: candidate.symbol, name: candidate.name }] : [];
    });

  if (hasAiKey()) {
    const { insertDiscovery } = await import("@/lib/db/queries/discoveries");
    await insertDiscovery({ picks, scannedCount: universe.length, candidateCount: candidates.length });
  }

  return { picks, scannedCount: universe.length, candidateCount: candidates.length, isMock: !hasAiKey() };
}
