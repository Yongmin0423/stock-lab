"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { readClarityConsent, saveClarityConsent, subscribeClarityConsent, syncClarityConsent, type ClarityConsent } from "@/lib/clarity";

export function ClarityAnalytics() {
  const consent = useSyncExternalStore<ClarityConsent | undefined>(subscribeClarityConsent, readClarityConsent, () => undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const visible = consent === null || settingsOpen;

  useEffect(() => { syncClarityConsent(consent ?? null); }, [consent]);

  function choose(value: "granted" | "denied") {
    saveClarityConsent(value);
    setSettingsOpen(false);
  }

  return (
    <>
      <button type="button" onClick={() => setSettingsOpen(true)} aria-expanded={visible} aria-controls="clarity-consent" className="mt-3 underline underline-offset-4 hover:text-[var(--text)]">
        Clarity 방문 분석 설정
      </button>
      {visible && (
        <section id="clarity-consent" aria-labelledby="clarity-consent-title" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left text-sm text-[var(--text)] shadow-2xl">
          <h2 id="clarity-consent-title" className="font-bold">방문 분석 쿠키를 허용할까요?</h2>
          <p className="mt-2 leading-relaxed text-[var(--text-dim)]">
            Microsoft Clarity로 클릭·스크롤·화면 이동을 분석해 서비스를 개선합니다. 허용하면 쿠키로 같은 브라우저의 방문을 연결하고 분석 데이터를 Microsoft에 전송합니다. 화면 텍스트와 입력값은 가립니다.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-faint)]">
            거절해도 서비스를 이용할 수 있습니다. 선택은 이 브라우저에 저장되며 하단에서 언제든 바꿀 수 있습니다.{" "}
            <a href="https://privacy.microsoft.com/ko-kr/privacystatement" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Microsoft 개인정보처리방침</a>
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {consent !== null && <button type="button" onClick={() => setSettingsOpen(false)} className="rounded-lg px-4 py-2 text-[var(--text-dim)]">닫기</button>}
            <button type="button" onClick={() => choose("denied")} className="rounded-lg border border-[var(--border)] px-4 py-2 font-semibold hover:bg-[var(--surface-2)]">거절</button>
            <button type="button" onClick={() => choose("granted")} className="rounded-lg border border-[var(--border)] px-4 py-2 font-semibold hover:bg-[var(--surface-2)]">허용</button>
          </div>
        </section>
      )}
    </>
  );
}
