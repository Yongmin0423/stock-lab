import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OperatorMenu } from "@/components/operator-menu";
import { ClarityAnalytics } from "@/components/clarity-analytics";
import { siteUrl } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: "주식갈피 | 주식 리서치와 시장 브리핑", template: "%s | 주식갈피" },
  description: "내 투자 공부가 AI의 판단 기준이 되는 개인 리서치 대시보드",
  verification: { google: "XVXKmhbAmz9i2kIKN6Q6zP8jSRhHHzH5M-Ly8-wSDiU" },
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "주식갈피",
  },
};

export const viewport = {
  themeColor: "#0e1116",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body data-clarity-mask="true">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-6 border-b border-[var(--border)] bg-[rgba(14,17,22,0.92)] px-6 backdrop-blur">
          <div data-clarity-unmask="true" className="shrink-0 text-base font-extrabold tracking-tight">
            주식<span className="text-[var(--accent)]">갈피</span>
          </div>
          <nav data-clarity-unmask="true" className="flex min-w-0 gap-1 overflow-x-auto whitespace-nowrap text-sm text-[var(--text-dim)]">
            <Link href="/" className="rounded-lg px-3 py-1.5 hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
              대시보드
            </Link>
            <Link href="/briefing" className="rounded-lg px-3 py-1.5 hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
              브리핑
            </Link>
            <Link href="/news" className="rounded-lg px-3 py-1.5 hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
              뉴스
            </Link>
            <Link href="/notes" className="rounded-lg px-3 py-1.5 hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
              노트
            </Link>
            <Link href="/discover" className="rounded-lg px-3 py-1.5 hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
              발굴
            </Link>
            <Link href="/stocks" className="rounded-lg px-3 py-1.5 hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
              전체 종목
            </Link>
          </nav>
          <Suspense fallback={null}><OperatorMenu /></Suspense>
        </header>
        <main className="mx-auto max-w-5xl p-6">{children}</main>
        <footer className="py-8 text-center text-[11px] text-[var(--text-faint)]">
          <p>본 서비스의 모든 분석은 투자 조언이 아닌 개인 학습용 참고 자료입니다.</p>
          <ClarityAnalytics />
        </footer>
      </body>
    </html>
  );
}
