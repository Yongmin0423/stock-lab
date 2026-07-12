### 2026-07-10
- **관심 종목 시세 강제 새로고침** — `src/lib/cache.ts`, `src/app/api/refresh-quotes/route.ts`, `src/components/refresh-quotes-button.tsx`, `src/app/page.tsx`
  - 원인/이유: 대시보드의 일반 페이지 갱신은 2분 시세 TTL을 그대로 사용해 사용자가 즉시 최신 시세를 요청할 수 없었다.
  - 수정: 강제 조회 옵션과 watchlist 갱신 API, 대시보드 새로고침 버튼을 추가해 최신 공급자 데이터를 조회·저장한 뒤 화면을 갱신한다.
