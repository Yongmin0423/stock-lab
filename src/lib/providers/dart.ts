import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dartCorpCodes } from "@/lib/db/schema";

/**
 * OpenDART — 한국 종목 재무 보강 (KIS가 안 주는 ROE·부채비율·배당수익률)
 * 기획서 §4.4. 필요: DART_API_KEY + scripts/load-dart-corpcodes.mjs 1회 실행
 */

const BASE = "https://opendart.fss.or.kr/api";

function apiKey(): string | undefined {
  return process.env.DART_API_KEY || undefined;
}

const num = (s: string | undefined | null): number | undefined => {
  if (!s) return undefined;
  const n = Number(String(s).replaceAll(",", "").trim());
  return Number.isFinite(n) ? n : undefined;
};

async function corpCodeOf(stockCode: string): Promise<string | null> {
  try {
    const db = getDb();
    const row = await db.query.dartCorpCodes.findFirst({ where: eq(dartCorpCodes.stockCode, stockCode) });
    return row?.corpCode ?? null;
  } catch {
    return null; // 테이블 미적재
  }
}

/** 최근 사업보고서 기준 주요계정 → ROE·부채비율. 작년 보고서 없으면 재작년 시도 */
async function financialRatios(corpCode: string): Promise<{ roe?: number; debtToEquity?: number }> {
  const thisYear = new Date().getFullYear();
  for (const year of [thisYear - 1, thisYear - 2]) {
    const qs = new URLSearchParams({
      crtfc_key: apiKey()!,
      corp_code: corpCode,
      bsns_year: String(year),
      reprt_code: "11011", // 사업보고서
    });
    const res = await fetch(`${BASE}/fnlttSinglAcnt.json?${qs}`, { cache: "no-store" });
    const d = await res.json();
    if (d.status !== "000" || !Array.isArray(d.list)) continue;

    // 연결(CFS) 우선, 없으면 개별(OFS). 계정명은 회사마다 표기가 달라 유연 매칭
    // (예: "당기순이익" vs "당기순이익(손실)")
    const pick = (matcher: (nm: string) => boolean) => {
      const rows = d.list as Array<Record<string, string>>;
      const match = (r: Record<string, string>) => matcher((r.account_nm ?? "").replace(/\s/g, ""));
      const cfs = rows.find((r) => r.fs_div === "CFS" && match(r));
      const ofs = rows.find((r) => r.fs_div === "OFS" && match(r));
      return num((cfs ?? ofs)?.thstrm_amount);
    };

    const equity = pick((nm) => nm === "자본총계");
    const debt = pick((nm) => nm === "부채총계");
    const netIncome = pick((nm) => nm.startsWith("당기순이익"));

    if (equity && equity > 0) {
      return {
        // 단순 ROE (기말 자본 기준 — 평균자본 방식보다 보수성 낮음, 학습용으로 충분)
        roe: netIncome != null ? +((netIncome / equity) * 100).toFixed(2) : undefined,
        debtToEquity: debt != null ? +((debt / equity) * 100).toFixed(2) : undefined,
      };
    }
  }
  return {};
}

/** 배당에 관한 사항 → 주당 현금배당금(보통주) → 배당수익률 = DPS / 현재가 */
async function dividendYieldOf(corpCode: string, price: number | null): Promise<number | undefined> {
  if (!price || price <= 0) return undefined;
  const thisYear = new Date().getFullYear();
  for (const year of [thisYear - 1, thisYear - 2]) {
    const qs = new URLSearchParams({
      crtfc_key: apiKey()!,
      corp_code: corpCode,
      bsns_year: String(year),
      reprt_code: "11011",
    });
    const res = await fetch(`${BASE}/alotMatter.json?${qs}`, { cache: "no-store" });
    const d = await res.json();
    if (d.status !== "000" || !Array.isArray(d.list)) continue;

    const row = d.list.find(
      (r: Record<string, string>) =>
        r.se?.includes("주당 현금배당금") && (!r.stock_knd || r.stock_knd.includes("보통")),
    );
    const dps = num(row?.thstrm);
    if (dps != null && dps >= 0) return +((dps / price) * 100).toFixed(2);
  }
  return undefined;
}

/** KIS 지표에 없는 것만 채워주는 보강 함수 (실패는 조용히 무시 — 있던 값은 유지) */
export async function dartEnrich(
  stockCode: string,
  price: number | null,
): Promise<{ roe?: number; debtToEquity?: number; dividendYield?: number }> {
  if (!apiKey()) return {};
  const corpCode = await corpCodeOf(stockCode);
  if (!corpCode) return {};

  try {
    const [ratios, dividendYield] = [await financialRatios(corpCode), await dividendYieldOf(corpCode, price)];
    return { ...ratios, dividendYield };
  } catch {
    return {};
  }
}
