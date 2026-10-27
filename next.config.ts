import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  agentRules: false,
  cacheComponents: true,
};

export default withSentryConfig(nextConfig, {
  org: "youngmin",
  project: "jusik-galpi",
  silent: true,
  telemetry: false,
  // 토큰을 등록하기 전에는 소스 코드가 포함된 맵을 외부로 업로드하지 않는다.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN, deleteSourcemapsAfterUpload: true },
});
