import type { NewsItem } from "./types";

/**
 * 네이버 검색 API — 한국 종목 뉴스 (M4에서 KIS와 함께 활성화).
 * 종목명으로 검색하고, 동명 노이즈를 줄이기 위해 제목에 종목명이 포함된 것만 남긴다.
 */
export async function naverNews(stockName: string): Promise<NewsItem[]> {
  const id = process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret) return [];

  const res = await fetch(
    `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(stockName)}&display=20&sort=date`,
    {
      headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`Naver ${res.status}`);

  const d = (await res.json()) as {
    items: Array<{ title: string; originallink: string; link: string; pubDate: string }>;
  };

  const strip = (s: string) => s.replace(/<\/?b>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

  return d.items
    .filter((n) => strip(n.title).includes(stockName))
    .map((n) => ({
      headline: strip(n.title),
      source: "네이버뉴스",
      url: n.originallink || n.link,
      publishedAt: new Date(n.pubDate),
    }));
}
