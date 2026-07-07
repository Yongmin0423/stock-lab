import { hasAiKey } from "@/lib/ai/analyze";
import { mockDiscover, runDiscover, type DiscoverCandidate } from "@/lib/ai/discover";
import { listNotes } from "@/lib/db/queries/notes";
import { listEnabledRules } from "@/lib/db/queries/rules";
import { getWatchlist } from "@/lib/db/queries/stocks";
import { providerFor } from "@/lib/providers/factory";
import { hasKisKeys } from "@/lib/providers/kis";
import { parseSymbol } from "@/lib/providers/types";
import { evaluateRules } from "@/lib/rules";
import { UNIVERSE_KR, UNIVERSE_US } from "@/lib/universe";

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

  const watchlist = new Set((await getWatchlist()).map((s) => s.symbol));
  const universe = [...UNIVERSE_US, ...(hasKisKeys() ? UNIVERSE_KR : [])].filter((u) => !watchlist.has(u.symbol));

  const candidates: DiscoverCandidate[] = [];
  let scanned = 0;
  for (const u of universe) {
    try {
      const { code } = parseSymbol(u.symbol);
      const f = await providerFor(u.symbol).getFundamentals(code);
      const ruleResults = evaluateRules(
        {
          per: f.per ?? null,
          pbr: f.pbr ?? null,
          eps: f.eps ?? null,
          roe: f.roe ?? null,
          debtToEquity: f.debtToEquity ?? null,
          dividendYield: f.dividendYield ?? null,
        },
        enabledRules,
      );
      scanned++;
      const passedCount = ruleResults.filter((r) => r.passed).length;
      if (passedCount > 0) {
        candidates.push({
          symbol: u.symbol,
          name: u.name,
          fundamentals: { per: f.per, pbr: f.pbr, roe: f.roe, debtToEquity: f.debtToEquity, dividendYield: f.dividendYield },
          ruleResults,
          passedCount,
        });
      }
    } catch {
      // 한 종목 실패 무시
    }
  }

  candidates.sort((a, b) => b.passedCount - a.passedCount);
  const top = candidates.slice(0, 10);

  if (top.length === 0) {
    return {
      picks: [],
      scannedCount: scanned,
      candidateCount: 0,
      isMock: !hasAiKey(),
      message: "룰을 통과한 종목이 없어요. 설정에서 룰 기준을 조정해보세요.",
    };
  }

  const notes = await listNotes();
  const result = hasAiKey() ? await runDiscover(top, notes.slice(0, 8)) : mockDiscover(top);
  const nameOf = (sym: string) => universe.find((u) => u.symbol === sym)?.name ?? sym;
  const picks = result.picks.sort((a, b) => b.fit_score - a.fit_score).map((p) => ({ ...p, name: nameOf(p.symbol) }));

  if (hasAiKey()) {
    const { insertDiscovery } = await import("@/lib/db/queries/discoveries");
    await insertDiscovery({ picks, scannedCount: scanned, candidateCount: candidates.length });
  }

  return { picks, scannedCount: scanned, candidateCount: candidates.length, isMock: !hasAiKey() };
}
