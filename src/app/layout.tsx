import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockLab",
  description: "내 투자 공부가 AI의 판단 기준이 되는 개인 리서치 대시보드",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StockLab",
  },
};

export const viewport = {
  themeColor: "#0e1116",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-6 border-b border-[var(--border)] bg-[rgba(14,17,22,0.92)] px-6 backdrop-blur">
          <div className="shrink-0 text-base font-extrabold tracking-tight">
            Stock<span className="text-[var(--accent)]">Lab</span>
          </div>
          <nav className="flex min-w-0 gap-1 overflow-x-auto whitespace-nowrap text-sm text-[var(--text-dim)]">
            <a href="/" className="rounded-lg px-3 py-1.5 hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
              대시보드
            </a>
            <a href="/briefing" className="rounded-lg px-3 py-1.5 hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
              브리핑
            </a>
            <a href="/news" className="rounded-lg px-3 py-1.5 hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
              뉴스
            </a>
            <a href="/notes" className="rounded-lg px-3 py-1.5 hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
              노트
            </a>
            <a href="/discover" className="rounded-lg px-3 py-1.5 hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
              발굴
            </a>
            <a href="/stocks" className="rounded-lg px-3 py-1.5 hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
              전체 종목
            </a>
            <a href="/settings" className="rounded-lg px-3 py-1.5 hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
              설정
            </a>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl p-6">{children}</main>
        <footer className="py-8 text-center text-[11px] text-[var(--text-faint)]">
          본 서비스의 모든 분석은 투자 조언이 아닌 개인 학습용 참고 자료입니다.
        </footer>
      </body>
    </html>
  );
}
