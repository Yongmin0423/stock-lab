import { listScreeningRefreshTargets, upsertScreeningFundamentals } from "@/lib/db/queries/screening";
import { providerFor } from "@/lib/providers/factory";
import { hasKisKeys } from "@/lib/providers/kis";

const BATCH_SIZE = 50;

export async function refreshScreeningFundamentals() {
  const usLimit = hasKisKeys() ? BATCH_SIZE / 2 : BATCH_SIZE;
  const usTargets = await listScreeningRefreshTargets(usLimit, "US");
  const targets = [
    ...usTargets,
    ...(hasKisKeys() ? await listScreeningRefreshTargets(BATCH_SIZE - usTargets.length, "KR") : []),
  ];
  let updated = 0;

  for (const target of targets) {
    const symbol = `${target.market}:${target.code}`;
    try {
      const data = await providerFor(symbol).getFundamentals(target.code);
      await upsertScreeningFundamentals({
        symbol,
        name: target.name,
        market: target.market,
        per: data.per ?? null,
        pbr: data.pbr ?? null,
        eps: data.eps ?? null,
        roe: data.roe ?? null,
        debtToEquity: data.debtToEquity ?? null,
        dividendYield: data.dividendYield ?? null,
        marketCap: data.marketCap ?? null,
        fetchedAt: new Date(),
      });
      updated++;
    } catch {
      await upsertScreeningFundamentals({
        symbol,
        name: target.name,
        market: target.market,
        fetchedAt: new Date(),
      });
    }
  }

  return { attempted: targets.length, updated };
}
