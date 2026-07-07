/**
 * 셋업 자가 점검 — 키·DB 테이블·마스터 적재·KIS 실호출까지 검사
 * 실행: node scripts/check-setup.mjs
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const ok = (m) => console.log("  ✅", m);
const bad = (m) => console.log("  ❌", m);
const warn = (m) => console.log("  ⚠️ ", m);

console.log("\n[1] 환경 변수");
const env = (k) => (process.env[k] ? ok(`${k} 설정됨`) : bad(`${k} 없음`));
env("DATABASE_URL");
env("FINNHUB_API_KEY");
process.env.ANTHROPIC_API_KEY ? ok("ANTHROPIC_API_KEY 설정됨") : warn("ANTHROPIC_API_KEY 없음 — AI 기능 모의 모드");
env("KIS_APP_KEY");
env("KIS_APP_SECRET");
process.env.NAVER_CLIENT_ID ? ok("NAVER 키 설정됨") : warn("NAVER 키 없음 — 한국 뉴스 비활성");

console.log("\n[2] DB 연결 + 테이블");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, connect_timeout: 10 });
const REQUIRED = ["stocks", "quotes", "candles", "financials", "news", "notes", "analyses", "kis_tokens",
                  "rules", "briefings", "stocks_master", "discoveries"];
try {
  const rows = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
  const have = new Set(rows.map((r) => r.table_name));
  for (const t of REQUIRED) have.has(t) ? ok(`테이블 ${t}`) : bad(`테이블 ${t} 없음 → docs/연결_가이드.md §1 SQL 실행`);

  // 컬럼 체크 (ALTER 누락 감지)
  const cols = await sql`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public'`;
  const hasCol = (t, c) => cols.some((r) => r.table_name === t && r.column_name === c);
  hasCol("news", "fetched_at") ? ok("news.fetched_at") : bad("news.fetched_at 없음 → ALTER 실행");
  hasCol("analyses", "risks") ? ok("analyses.risks") : bad("analyses.risks 없음 → ALTER 실행");
  hasCol("notes", "ai_review") ? ok("notes.ai_review") : bad("notes.ai_review 없음 → ALTER 실행");

  if (have.has("stocks_master")) {
    const [{ c }] = await sql`SELECT count(*)::int AS c FROM stocks_master`;
    c > 100 ? ok(`stocks_master ${c}개 적재됨`) : bad(`stocks_master 비어있음 → node scripts/load-krx-master.mjs`);
  }
  const [{ c: wc }] = await sql`SELECT count(*)::int AS c FROM stocks`;
  console.log(`  ℹ️  watchlist ${wc}종목`);
} catch (e) {
  bad(`DB 연결 실패: ${e.message}`);
}

console.log("\n[3] KIS 실호출 (삼성전자 현재가)");
if (!process.env.KIS_APP_KEY) {
  warn("KIS 키 없음 — 스킵");
} else {
  const BASE = process.env.KIS_ENV === "paper"
    ? "https://openapivts.koreainvestment.com:29443"
    : "https://openapi.koreainvestment.com:9443";
  try {
    // 토큰: DB에 유효한 게 있으면 재사용 (발급 API 호출 제한 보호)
    let token;
    try {
      const [t] = await sql`SELECT access_token, expires_at FROM kis_tokens ORDER BY id DESC LIMIT 1`;
      if (t && new Date(t.expires_at).getTime() - Date.now() > 10 * 60 * 1000) {
        token = t.access_token;
        ok("기존 토큰 재사용");
      }
    } catch {}
    if (!token) {
      const res = await fetch(`${BASE}/oauth2/tokenP`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "client_credentials",
          appkey: process.env.KIS_APP_KEY, appsecret: process.env.KIS_APP_SECRET }),
      });
      const d = await res.json();
      if (!d.access_token) throw new Error(`토큰 발급 실패: ${JSON.stringify(d).slice(0, 150)}`);
      token = d.access_token;
      await sql`INSERT INTO kis_tokens (access_token, expires_at)
                VALUES (${token}, ${new Date(Date.now() + (d.expires_in ?? 86400) * 1000)})`.catch(() => {});
      ok("토큰 신규 발급");
    }

    const qs = new URLSearchParams({ FID_COND_MRKT_DIV_CODE: "J", FID_INPUT_ISCD: "005930" });
    const res2 = await fetch(`${BASE}/uapi/domestic-stock/v1/quotations/inquire-price?${qs}`, {
      headers: { authorization: `Bearer ${token}`, appkey: process.env.KIS_APP_KEY,
        appsecret: process.env.KIS_APP_SECRET, tr_id: "FHKST01010100", custtype: "P" },
    });
    const q = await res2.json();
    if (q.rt_cd === "0") {
      ok(`삼성전자 현재가 ${Number(q.output.stck_prpr).toLocaleString()}원 (${q.output.prdy_ctrt}%) — KIS 정상!`);
    } else {
      bad(`시세 조회 실패: ${q.msg1 ?? JSON.stringify(q).slice(0, 150)}`);
    }
  } catch (e) {
    bad(e.message);
  }
}

await sql.end({ timeout: 3 });
console.log("\n점검 끝. ❌ 항목만 해결하면 됩니다.\n");
