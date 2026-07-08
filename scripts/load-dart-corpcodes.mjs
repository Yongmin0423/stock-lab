/**
 * DART 고유번호(corp_code) 매핑 적재 — 한국 재무 보강(ROE·부채비율·배당)에 필요
 *
 * 실행: node scripts/load-dart-corpcodes.mjs
 * 필요: .env.local에 DART_API_KEY (opendart.fss.or.kr에서 즉시 발급)
 */
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL || !process.env.DART_API_KEY) {
  console.error("DATABASE_URL / DART_API_KEY가 .env.local에 필요합니다.");
  process.exit(1);
}

async function main() {
  console.log("DART corpCode.xml 다운로드 중…");
  const res = await fetch(
    `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${process.env.DART_API_KEY}`,
  );
  if (!res.ok) throw new Error(`다운로드 실패: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  const dir = mkdtempSync(join(tmpdir(), "dart-"));
  const zipPath = join(dir, "corp.zip");
  writeFileSync(zipPath, buf);
  execSync(`unzip -o -qq "${zipPath}" -d "${dir}"`);
  const xml = readFileSync(join(dir, "CORPCODE.xml"), "utf-8");

  // <list><corp_code>..</corp_code><corp_name>..</corp_name><stock_code>..</stock_code>..</list>
  const rows = [];
  const re = /<corp_code>(\d{8})<\/corp_code>[\s\S]*?<stock_code>\s*(\d{6})\s*<\/stock_code>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    rows.push({ corp_code: m[1], stock_code: m[2] });
  }
  if (rows.length < 1000) throw new Error(`파싱 결과가 너무 적음 (${rows.length}건)`);
  console.log(`상장사 ${rows.length}개 매핑 파싱 완료. DB 적재 중…`);

  const sql = postgres(process.env.DATABASE_URL, { prepare: false });
  await sql`CREATE TABLE IF NOT EXISTS dart_corp_codes (stock_code text PRIMARY KEY, corp_code text NOT NULL)`;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    await sql`
      INSERT INTO dart_corp_codes ${sql(chunk, "stock_code", "corp_code")}
      ON CONFLICT (stock_code) DO UPDATE SET corp_code = EXCLUDED.corp_code
    `;
  }
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM dart_corp_codes`;
  const [samsung] = await sql`SELECT corp_code FROM dart_corp_codes WHERE stock_code = '005930'`;
  console.log(`완료! 총 ${count}개. 샘플: 삼성전자 corp_code=${samsung?.corp_code ?? "??"}`);
  await sql.end();
}

main().catch((e) => {
  console.error("실패:", e.message);
  process.exit(1);
});
