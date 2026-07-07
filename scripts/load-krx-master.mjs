/**
 * 한국 상장종목 마스터 적재 (KOSPI + KOSDAQ)
 *
 * 실행: node scripts/load-krx-master.mjs
 * 소스: KIS 공식 종목마스터 파일 (한국투자증권 배포, KIS GitHub 샘플과 동일 포맷)
 *   - https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip
 *   - https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip
 * 파싱: 각 행의 뒤 228자는 고정폭 수치 필드 → 앞부분에서 [0:9]=단축코드, [21:]=종목명
 *       (KIS GitHub kis_kospi_code_mst.py 로직과 동일)
 */
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL이 .env.local에 없습니다.");
  process.exit(1);
}

const SOURCES = [
  { market: "KOSPI", url: "https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip", tail: 228 },
  { market: "KOSDAQ", url: "https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip", tail: 222 },
];

async function loadOne({ market, url, tail }) {
  console.log(`${market} 마스터 다운로드 중…`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${market} 다운로드 실패: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  const dir = mkdtempSync(join(tmpdir(), "krx-"));
  const zipPath = join(dir, "master.zip");
  writeFileSync(zipPath, buf);
  execSync(`unzip -o -qq "${zipPath}" -d "${dir}"`);

  const mstName = market === "KOSPI" ? "kospi_code.mst" : "kosdaq_code.mst";
  const raw = readFileSync(join(dir, mstName));
  const text = new TextDecoder("euc-kr").decode(raw);

  const rows = [];
  for (const line of text.split("\n")) {
    if (line.length <= tail) continue;
    const head = line.slice(0, line.length - tail);
    const code = head.slice(0, 9).trim();
    const name = head.slice(21).trim();
    if (/^\d{6}$/.test(code) && name) rows.push({ code, name });
  }
  console.log(`  ${market}: ${rows.length}개 파싱`);
  return rows;
}

async function main() {
  const all = [];
  for (const src of SOURCES) {
    try {
      all.push(...(await loadOne(src)));
    } catch (e) {
      console.warn(`  ${src.market} 실패 (${e.message}) — 계속 진행`);
    }
  }
  if (all.length < 500) throw new Error(`파싱 결과가 너무 적음 (${all.length}건) — 포맷 변경 가능성. 에러 내용을 알려주세요.`);

  // 중복 코드 제거 (뒤에 온 것 우선)
  const map = new Map(all.map((r) => [r.code, r.name]));
  const rows = [...map.entries()].map(([code, name]) => ({ code, name }));
  console.log(`총 ${rows.length}개 종목 → DB 적재 중…`);

  const sql = postgres(process.env.DATABASE_URL, { prepare: false });
  await sql`CREATE TABLE IF NOT EXISTS stocks_master (code text PRIMARY KEY, name text NOT NULL)`;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    await sql`
      INSERT INTO stocks_master ${sql(chunk, "code", "name")}
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    `;
  }
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM stocks_master`;
  const sample = await sql`SELECT code, name FROM stocks_master WHERE code IN ('005930','035720','000660')`;
  console.log(`완료! stocks_master 총 ${count}개.`);
  console.log("샘플:", sample.map((s) => `${s.name}(${s.code})`).join(", "));
  await sql.end();
}

main().catch((e) => {
  console.error("실패:", e.message);
  process.exit(1);
});
