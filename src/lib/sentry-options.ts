import type { BrowserOptions, ErrorEvent } from "@sentry/nextjs";

type SentrySpan = Parameters<NonNullable<BrowserOptions["beforeSendSpan"]>>[0];

// DSN은 공개 수집 주소이며 관리자 인증 토큰이 아니다.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || "https://3251edcdfa159cd811691ebd60b5c54e@o4512326526959616.ingest.us.sentry.io/4512326565101568";

export function scrubSentryError(event: ErrorEvent): ErrorEvent {
  // 요청 본문·쿠키·헤더와 노트/질문이 담길 수 있는 부가 정보는 전송하지 않는다.
  if (event.request) {
    event.request = { method: event.request.method, url: event.request.url?.split(/[?#]/)[0] };
  }
  delete event.user;
  delete event.extra;
  delete event.breadcrumbs;
  return event;
}

export function scrubSentrySpan(span: SentrySpan): SentrySpan {
  // API 키가 URL 쿼리에 들어가는 시세 API 및 DB/AI 입력은 추적 속성에서 제외한다.
  const op = span.attributes["sentry.op"];
  return {
    ...span,
    name: typeof op === "string" && (op.startsWith("db") || op.startsWith("gen_ai")) ? op : span.name.split(/[?#]/)[0],
    attributes: { "sentry.op": op },
    links: undefined,
  };
}

export const sentryOptions = {
  dsn,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.SENTRY_ENVIRONMENT || process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || "jusik-galpi@0.1.0",
  sendDefaultPii: false,
  enableLogs: false,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1 : 0.1,
  beforeSend: scrubSentryError,
  beforeSendSpan: scrubSentrySpan,
};
