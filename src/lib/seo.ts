import type { Metadata } from "next";

export function siteUrl(): URL {
  const value = process.env.SITE_URL || "https://stock-lab-ndgw.vercel.app";
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("SITE_URL must use HTTP or HTTPS");
  return new URL(url.origin);
}

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const base = siteUrl();
  return {
    title,
    description,
    alternates: { canonical: new URL(path, base).href },
    openGraph: {
      title: `${title} | 주식갈피`,
      description,
      siteName: "주식갈피",
      locale: "ko_KR",
      type: "website",
      url: new URL(path, base).href,
    },
  };
}
