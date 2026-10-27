import assert from "node:assert/strict";
import { pageMetadata, siteUrl } from "../src/lib/seo.ts";

const original = process.env.SITE_URL;
try {
  delete process.env.SITE_URL;
  assert.equal(siteUrl().href, "https://stock-lab-ndgw.vercel.app/");
  assert.equal(pageMetadata("제목", "공개 설명", "/notes/1").alternates.canonical, "https://stock-lab-ndgw.vercel.app/notes/1");
  process.env.SITE_URL = "https://stocks.example/some-path/";
  assert.equal(siteUrl().href, "https://stocks.example/");
  const metadata = pageMetadata("삼성전자", "공개 설명", "/stock/KR%3A005930");
  assert.equal(metadata.alternates.canonical, "https://stocks.example/stock/KR%3A005930");
  assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
  assert.equal(metadata.description, "공개 설명");
  process.env.SITE_URL = "file:///tmp/invalid";
  assert.throws(() => siteUrl(), /SITE_URL/);
} finally {
  if (original === undefined) delete process.env.SITE_URL;
  else process.env.SITE_URL = original;
}
console.log("SEO metadata checks passed");
