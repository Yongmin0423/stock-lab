import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry-options";

Sentry.init({
  ...sentryOptions,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
      networkCaptureBodies: false,
      // 콘솔에는 투자 노트나 API 응답이 포함될 수 있다.
      beforeAddRecordingEvent: (event) => {
        if (event.data.tag === "breadcrumb" && event.data.payload?.category === "console") return null;
        return event;
      },
    }),
  ],
  replaysSessionSampleRate: process.env.NODE_ENV === "development" ? 1 : 0.1,
  replaysOnErrorSampleRate: 1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
