import { and, desc, eq, ilike } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { kisTokens, stocksMaster } from "@/lib/db/schema";
import { parseOverseasDailyRows } from "./kis-overseas";
import type { Candle, Fundamentals, MarketDataProvider, NewsItem, SymbolInfo } from "./types";

/**
 * 한국투자증권 KIS 오픈API.
 * 필요 env: KIS_APP_KEY, KIS_APP_SECRET, KIS_ENV(real|paper)
 * 뉴스는 NaverNewsProvider가 담당 (cache.ts에서 라우팅).
 */

const BASE = () =>
  process.env.KIS_ENV === "paper"
    ? "https://openapivts.koreainvestment.com:29443"
    : "https://openapi.koreainvestment.com:9443";

export function hasKisKeys(): boolean {
  return Boolean(process.env.KIS_APP_KEY && process.env.KIS_APP_SECRET);
}

/** 토큰: DB 저장, 만료 10분 전에만 재발급. 매 요청 발급 시 KIS가 차단함 (최대 함정) */
async function getToken(): Promise<string> {
  const db = getDb();
  const cur = await db.query.kisTokens.findFirst({ orderBy: desc(kisTokens.id) });
  if (cur && cur.expiresAt.getTime() - Date.now() > 10 * 60 * 1000) return cur.accessToken;

  const res = await fetch(`${BASE()}/oauth2/tokenP`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: process.env.KIS_APP_KEY,
      appsecret: process.env.KIS_APP_SECRET,
    }),
    cache: "no-store",
  });
  const d = await res.json();
  if (!d.access_token) throw new Error(`KIS 토큰 발급 실패: ${JSON.stringify(d).slice(0, 200)}`);

  await db.insert(kisTokens).values({
    accessToken: d.access_token,
    expiresAt: new Date(Date.now() + (d.expires_in ?? 86400) * 1000),
  });
  return d.access_token;
}

async function kisGet(path: string, trId: string, params: Record<string, string>) {
  if (!hasKisKeys()) throw new Error("KIS 키 미설정 (KIS_APP_KEY/KIS_APP_SECRET)");
  const token = await getToken();
  const qs = new URLSearchParams(params);
  const res = await fetch(`${BASE()}${path}?${qs}`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      authorization: `Bearer ${token}`,
      appkey: process.env.KIS_APP_KEY!,
      appsecret: process.env.KIS_APP_SECRET!,
      tr_id: trId,
      custtype: "P",
    },
    cache: "no-store",
  });
  const d = await res.json();
  if (d.rt_cd !== "0") throw new Error(`KIS ${trId} 오류: ${d.msg1 ?? JSON.stringify(d).slice(0, 200)}`);
  return d;
}

const n = (v: unknown): number | undefined => {
  const x = Number(v);
  return Number.isFinite(x) && x !== 0 ? x : undefined;
};

/** 미국 주식 일봉. 종목의 거래소 정보가 없으므로 미국 3개 거래소를 순서대로 확인한다. */
export async function getUsDailyCandles(code: string, days: number): Promise<Candle[]> {
  const cutoff = new Date(Date.now() - days * 86400e3).toISOString().slice(0, 10);
  let lastError: unknown;

  for (const exchange of ["NYS", "NAS", "AMS"]) {
    let before = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    const candles: Candle[] = [];

    try {
      for (let page = 0; page < 5; page++) {
        const d = await kisGet("/uapi/overseas-price/v1/quotations/dailyprice", "HHDFS76240000", {
          AUTH: "",
          EXCD: exchange,
          SYMB: code,
          GUBN: "0",
          BYMD: before,
          MODP: "1",
        });
        const batch = parseOverseasDailyRows(d.output2 ?? []);
        if (batch.length === 0) break;
        candles.push(...batch);

        const oldest = batch.at(-1)!.date;
        if (oldest <= cutoff) {
          return candles.filter((c) => c.date >= cutoff).reverse();
        }
        const previousDay = new Date(`${oldest}T00:00:00Z`);
        previousDay.setUTCDate(previousDay.getUTCDate() - 1);
        before = previousDay.toISOString().slice(0, 10).replaceAll("-", "");
      }
      if (candles.length > 0) return candles.filter((c) => c.date >= cutoff).reverse();
    } catch (e) {
      lastError = e;
      // 다른 미국 거래소에서 다시 조회
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error(`KIS 미국 일봉 데이터 없음: ${code}`);
}

/** KOSPI 지수 (시장 상태 바용). KIS 키 필요 */
export async function getKospiIndex(): Promise<{ value: number; changePct: number } | null> {
  if (!hasKisKeys()) return null;
  try {
    const d = await kisGet("/uapi/domestic-stock/v1/quotations/inquire-index-price", "FHPUP02100000", {
      FID_COND_MRKT_DIV_CODE: "U",
      FID_INPUT_ISCD: "0001", // KOSPI
    });
    return { value: Number(d.output.bstp_nmix_prpr), changePct: Number(d.output.bstp_nmix_prdy_ctrt) };
  } catch {
    return null;
  }
}

export const kis: MarketDataProvider = {
  market: "KR",

  async getQuote(code) {
    const d = await kisGet("/uapi/domestic-stock/v1/quotations/inquire-price", "FHKST01010100", {
      FID_COND_MRKT_DIV_CODE: "J",
      FID_INPUT_ISCD: code,
    });
    const o = d.output;
    return {
      market: "KR",
      price: Number(o.stck_prpr),
      changePct: Number(o.prdy_ctrt),
      currency: "KRW",
      asOf: new Date(),
      isMock: false,
    };
  },

  /** 현재가 API 응답에 지표 포함 — 별도 호출 불필요 (기획서 §4.4 지름길) */
  async getFundamentals(code): Promise<Fundamentals> {
    const d = await kisGet("/uapi/domestic-stock/v1/quotations/inquire-price", "FHKST01010100", {
      FID_COND_MRKT_DIV_CODE: "J",
      FID_INPUT_ISCD: code,
    });
    const o = d.output;
    return {
      per: n(o.per),
      pbr: n(o.pbr),
      eps: n(o.eps),
      // hts_avls: 시가총액(억원) → 원 단위로 통일
      marketCap: n(o.hts_avls) ? Number(o.hts_avls) * 1e8 : undefined,
      w52High: n(o.w52_hgpr),
      w52Low: n(o.w52_lwpr),
      // ROE·부채비율·배당은 DART 자체 계산으로 추후 보강 (기획서 §4.4)
    };
  },

  async getDailyCandles(code, days): Promise<Candle[]> {
    const end = new Date();
    const start = new Date(Date.now() - days * 86400e3);
    const fmt = (d: Date) => d.toISOString().slice(0, 10).replaceAll("-", "");
    const d = await kisGet(
      "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
      "FHKST03010100",
      {
        FID_COND_MRKT_DIV_CODE: "J",
        FID_INPUT_ISCD: code,
        FID_INPUT_DATE_1: fmt(start),
        FID_INPUT_DATE_2: fmt(end),
        FID_PERIOD_DIV_CODE: "D",
        FID_ORG_ADJ_PRC: "0", // 수정주가
      },
    );
    const rows: Array<Record<string, string>> = d.output2 ?? [];
    return rows
      .filter((r) => r.stck_bsop_date)
      .map((r) => ({
        date: `${r.stck_bsop_date.slice(0, 4)}-${r.stck_bsop_date.slice(4, 6)}-${r.stck_bsop_date.slice(6)}`,
        open: Number(r.stck_oprc),
        high: Number(r.stck_hgpr),
        low: Number(r.stck_lwpr),
        close: Number(r.stck_clpr),
        volume: Number(r.acml_vol),
      }))
      .reverse(); // KIS는 최신순 → 과거순으로
  },

  async getNews(): Promise<NewsItem[]> {
    return []; // 한국 뉴스는 naver-news.ts 담당
  },

  /** stocks_master ILIKE 검색 (KIS API 불필요 — 마스터 적재만 돼 있으면 동작) */
  async searchSymbol(query): Promise<SymbolInfo[]> {
    try {
      const db = getDb();
      const kr = eq(stocksMaster.market, "KR"); // US 시드 행 제외
      const rows = await db
        .select()
        .from(stocksMaster)
        .where(and(ilike(stocksMaster.name, `%${query}%`), kr))
        .limit(8);
      const byCode = /^\d{6}$/.test(query)
        ? await db.select().from(stocksMaster).where(and(ilike(stocksMaster.code, `${query}%`), kr)).limit(3)
        : [];
      return [...byCode, ...rows].slice(0, 8).map((r) => ({
        symbol: `KR:${r.code}`,
        name: r.name,
        market: "KR" as const,
      }));
    } catch {
      return []; // stocks_master 미적재 시 조용히 빈 결과
    }
  },
};
