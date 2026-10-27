export type ClarityConsent = "granted" | "denied" | null;

export const CLARITY_CONSENT_KEY = "jusik-galpi.clarity-consent.v1";
const consentChanged = "clarity-consent-changed";
const scriptId = "clarity-analytics";
let memoryConsent: ClarityConsent = null;
let tracking = false;

type Clarity = ((...args: unknown[]) => void) & { q?: unknown[][]; v?: string };
declare global {
  interface Window { clarity?: Clarity }
}

export function readClarityConsent(): ClarityConsent {
  try {
    const value = window.localStorage.getItem(CLARITY_CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return memoryConsent;
  }
}

export function saveClarityConsent(value: Exclude<ClarityConsent, null>) {
  memoryConsent = value;
  try {
    window.localStorage.setItem(CLARITY_CONSENT_KEY, value);
  } catch {
    // 저장이 차단된 브라우저에서도 현재 페이지의 선택은 반영한다.
  }
  window.dispatchEvent(new Event(consentChanged));
}

export function subscribeClarityConsent(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === CLARITY_CONSENT_KEY || event.key === null) notify();
  };
  window.addEventListener(consentChanged, notify);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(consentChanged, notify);
    window.removeEventListener("storage", onStorage);
  };
}

export function syncClarityConsent(consent: ClarityConsent) {
  if (consent !== "granted") {
    if (tracking || window.clarity?.v) {
      window.clarity?.("consentv2", { ad_Storage: "denied", analytics_Storage: "denied" });
      window.clarity?.("stop");
    }
    tracking = false;
    return;
  }

  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || "z45hin4a0v";
  if (tracking || !/^[a-z0-9]+$/i.test(projectId)) return;
  window.clarity ??= (...args: unknown[]) => { (window.clarity!.q ??= []).push(args); };
  const existingScript = document.getElementById(scriptId);
  if (existingScript) window.clarity("start");
  window.clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "granted" });
  window.clarity("set", "environment", process.env.NODE_ENV);
  if (!existingScript) {
    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${projectId}`;
    document.head.appendChild(script);
  }
  tracking = true;
}
