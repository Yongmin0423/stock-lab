### 2026-07-13
- **Watchlist 자연어 질문 기능** — `src/app/api/ask-market/route.ts`, `src/components/market-question.tsx`, `src/app/page.tsx`
  - 원인/이유: 앱이 이미 불러온 종목 시세에서 상승·하락 종목을 자연어로 확인할 수 있는 경로가 없었다.
  - 수정: 기존 시세 캐시와 AI 공통 레이어를 재사용해 Watchlist 데이터만 근거로 답하는 API와 대시보드 질문 UI를 추가했다.

### 2026-07-10
- **관심 종목 시세 강제 새로고침** — `src/lib/cache.ts`, `src/app/api/refresh-quotes/route.ts`, `src/components/refresh-quotes-button.tsx`, `src/app/page.tsx`
  - 원인/이유: 대시보드의 일반 페이지 갱신은 2분 시세 TTL을 그대로 사용해 사용자가 즉시 최신 시세를 요청할 수 없었다.
  - 수정: 강제 조회 옵션과 watchlist 갱신 API, 대시보드 새로고침 버튼을 추가해 최신 공급자 데이터를 조회·저장한 뒤 화면을 갱신한다.
