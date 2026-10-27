"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);

  return (
    <html lang="ko">
      <body style={{ margin: 0, padding: 32, background: "#0e1116", color: "#f3f0ff", fontFamily: "sans-serif" }}>
        <h1>화면을 불러오지 못했습니다</h1>
        <p>잠시 후 다시 시도해 주세요.</p>
        <button onClick={reset}>다시 시도</button>
      </body>
    </html>
  );
}
