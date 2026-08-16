### 2026-08-16

- **로그인 제출 상태 표시** — `src/app/login/page.tsx`, `src/app/login/submit-button.tsx`
  - 원인/이유: 로그인 확인 중에도 제출 버튼이 활성화되어 중복 제출할 수 있고 진행 여부를 알기 어려웠다.
  - 수정: 서버 액션 제출 상태 동안 버튼을 비활성화하고 `로그인 중…` 문구와 대기 커서를 표시한다.

- **대시보드 독립 조회 병렬화** — `src/app/page.tsx`
  - 원인/이유: 서로 의존하지 않는 시장·종목·분석·룰·브리핑·노트·발굴 조회를 순차 실행해 대시보드 응답 시간이 누적됐다.
  - 수정: 독립 조회 7개를 `Promise.all`로 병렬 실행하고 최근 노트 추출은 조회 완료 후 처리한다.

### 2026-08-11

- **시세·차트 조회 실패 메시지 표시** — `src/lib/cache.ts`, `src/lib/db/queries/stocks.ts`, `src/app/page.tsx`, `src/app/stock/[symbol]/page.tsx`, `src/app/api/refresh-quotes/route.ts`, `src/components/refresh-quotes-button.tsx`, `src/lib/providers/kis.ts`, `src/components/candle-chart.tsx`
  - 원인/이유: 외부 시세 조회 실패를 빈 값으로 처리해 API 설정 오류와 데이터 부재를 사용자가 구분할 수 없었다.
  - 수정: 대시보드·종목 상세·수동 갱신에 현재가 실패 원인과 캐시 사용 여부를 표시하고, 차트 API 오류를 차트 내부에 전달해 표시한다.

- **Finnhub 모의 시세·재무지표 제거** — `src/lib/providers/finnhub.ts`
  - 원인/이유: API 키가 없을 때 임의 가격과 재무지표가 실제 데이터처럼 표시될 수 있었다.
  - 수정: 키가 없으면 빈 상태 또는 기존 실데이터 캐시만 사용하고, 새 외부 조회에는 명확한 설정 오류를 반환하도록 가짜 데이터를 제거했다.

- **미국 주식 차트를 KIS 실제 일봉으로 교체** — `src/lib/providers/finnhub.ts`, `src/lib/providers/kis.ts`, `src/lib/providers/kis-overseas.ts`, `src/lib/providers/stooq.ts`, `tests/kis-overseas-candles.test.mjs`
  - 원인/이유: Finnhub 무료 키의 Candle API가 403을 반환하고 Stooq가 봇 검증 HTML을 반환하면, 기준가 100달러의 합성 캔들이 실제 차트처럼 표시·저장됐다.
  - 수정: Finnhub Candle 실패 시 기존 KIS 인증으로 미국 거래소 일봉을 조회하고, 실제 데이터가 없으면 빈 차트를 반환하도록 합성 데이터 폴백을 제거했다.

### 2026-07-21

- **발굴 전체 캐시 검사와 분할 갱신** — `src/lib/discover-run.ts`, `src/lib/screening-refresh.ts`, `src/lib/db/queries/screening.ts`, `src/lib/db/schema.ts`, `src/app/api/cron/refresh-screening/route.ts`, `vercel.json`
  - 원인/이유: 발굴할 때마다 고정 50종을 외부 API로 다시 조회해 범위가 좁고 실행 시간이 길었다.
  - 수정: 재무 데이터를 별도 DB에 30일간 캐시하고 브리핑 전 오래된 데이터 50종씩 갱신하며, 발굴은 매번 캐시된 전체 종목을 빠르게 룰 검사하도록 분리했다.

- **AI 판정 용어 질문 즉시 응답** — `src/app/api/ask-market/route.ts`, `src/lib/verdict-explanation.ts`, `tests/verdict-explanation.test.mjs`
  - 원인/이유: `매수검토·관망·회피` 의미 질문도 전체 시장 데이터와 AI를 호출해 불필요하게 느리고 시간 초과가 발생했다.
  - 수정: 판정 용어 설명은 DB와 AI를 거치지 않고 즉시 반환한다.

- **일반 AI 분석 모델을 Terra로 상향** — `src/lib/ai/llm.ts`
  - 원인/이유: `smart` tier가 구형 `gpt-4o`를 기본값으로 사용하고 있었다.
  - 수정: OpenAI `smart` 기본 모델을 `gpt-5.6-terra`로 변경하고 `fast`는 `gpt-4o-mini`로 유지했다.

- **브리핑 전용 상위 AI 모델 적용** — `src/lib/ai/llm.ts`, `src/lib/ai/briefing.ts`
  - 원인/이유: 브리핑이 일반 분석과 같은 `smart` 모델을 사용해 품질과 비용을 독립적으로 조정할 수 없었다.
  - 수정: 브리핑 전용 tier를 추가하고 OpenAI 기본 모델을 `gpt-5.6-terra`, Anthropic 기본 모델을 기존 Sonnet으로 설정했다.

- **대시보드 AI 질문 시간 초과 대응** — `src/app/api/ask-market/route.ts`, `src/components/market-question.tsx`
  - 원인/이유: 전체 Watchlist 리서치 컨텍스트와 AI 답변 생성이 기존 60초를 넘으면 Vercel 504 일반 텍스트 응답이 발생했다.
  - 수정: 질문용 뉴스·노트·최근 분석의 항목 수와 답변 길이를 줄이고 빠른 AI 모델을 사용한다. AI 호출은 60초에 중단하고 단계별 소요 시간을 기록하며, 함수는 프록시 제한보다 짧은 110초 안에 응답한다.

- **종목 검색의 비JSON 오류 응답 처리** — `src/components/search-dialog.tsx`
  - 원인/이유: 검색 API 장애 시 일반 텍스트 응답을 JSON으로 파싱하면 원본과 무관한 구문 오류가 표시됐다.
  - 수정: HTTP 상태와 응답 형식을 확인해 검색창 안에 명확한 오류를 표시한다.

### 2026-07-20

- **Watchlist 시세 기준 시각을 한국 시간으로 표시** — `src/components/stock-card.tsx`
  - 원인/이유: 서버 기본 시간대인 UTC로 시세 기준 시각이 표시됐다.
  - 수정: 시각 포맷에 `Asia/Seoul` 시간대를 명시했다.

- **모바일 상단 메뉴 가로 스크롤 적용** — `src/app/layout.tsx`
  - 원인/이유: 좁은 화면에서 메뉴가 줄바꿈되며 한글이 세로로 표시됐다.
  - 수정: 로고 너비를 유지하고 메뉴 영역에 가로 스크롤과 줄바꿈 방지를 적용했다.

- **브리핑 생성 시각을 한국 시간으로 표시** — `src/app/briefing/page.tsx`
  - 원인/이유: 서버의 기본 시간대가 UTC라 브리핑 생성 시각과 아카이브 날짜가 한국 시간과 다르게 표시됐다.
  - 수정: 날짜 포맷에 `Asia/Seoul` 시간대를 명시했다.

### 2026-07-16

- **발굴 상세 진입 시 접두어 없는 심볼 오류 수정** — `src/lib/discover-run.ts`, `src/lib/providers/types.ts`, `tests/parse-symbol.test.mjs`
  - AI가 `US:VZ` 대신 `VZ`를 반환해 watchlist 저장 후 상세 페이지에서 심볼 파싱 오류가 발생했음
  - 발굴 결과를 실제 후보의 정규 심볼로 치환하고, 이미 저장된 접두어 없는 미국·한국 심볼도 파서에서 호환

- **발굴 추천 종목 상세 이동 연결** — `src/components/discover-panel.tsx`
  - 추천 기업명이 클릭되지 않아 차트·재무·뉴스·AI 분석을 확인할 수 없었음
  - 기업명 클릭 시 watchlist 등록 후 기존 종목 상세 페이지로 이동하도록 연결

- **인증 쿠키 만료 1일로 단축** — `src/lib/auth.ts`
  - 개인용 금융 앱에서 30일간 유지되는 세션이 너무 길어 보안상 노출 범위를 줄일 필요가 있었음
  - 세션 토큰과 인증 쿠키의 최대 유효 시간을 24시간으로 변경
- **PWA 홈 화면 설치 보완** — `public/manifest.json`, `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`, `src/app/layout.tsx`, `src/middleware.ts`
  - 원인/이유: standalone manifest는 있었지만 설치에 필요한 크기별 앱 아이콘과 iOS 웹앱 메타데이터가 없었다.
  - 수정: 앱 아이콘, manifest 아이콘·scope, Apple Web App 메타데이터를 추가하고 아이콘 파일을 인증 예외 처리해 홈 화면 실행 시 독립 앱처럼 열리게 했다.
- **대시보드 질문 리서치 컨텍스트 확장** — `src/app/api/ask-market/route.ts`, `src/components/market-question.tsx`
  - 원인/이유: 질문 기능이 현재가와 당일 등락률만 참고해 분석형 질문에도 답변이 지나치게 단순했다.
  - 수정: DB에 저장된 재무, 30일 가격 요약, 뉴스, 룰 평가, 투자 노트, 최근 AI 분석을 함께 제공하고 분석 질문에는 근거와 데이터 한계를 설명하도록 변경했다.
- **Vercel 의존성 빌드 허용** — `pnpm-workspace.yaml`
  - 원인/이유: pnpm이 esbuild와 sharp의 설치 스크립트를 미검토 상태로 차단해 Vercel 배포가 `ERR_PNPM_IGNORED_BUILDS`로 종료됐다.
  - 수정: 필요한 두 패키지의 빌드 스크립트만 명시적으로 허용했다.

### 2026-07-15
- **개인용 로그인 화면과 쿠키 인증** — `src/lib/auth.ts`, `src/app/login/page.tsx`, `src/middleware.ts`, `docs/연결_가이드.md`, `docs/MVP_구현계획서.md`
  - 원인/이유: Basic Auth는 별도 화면이 없고 배포 URL을 아는 사용자의 접근을 앱 UI 안에서 제어하기 어려웠다.
  - 수정: 비밀번호 로그인 화면, 만료 시각을 포함한 HMAC 서명 쿠키, 전체 경로 인증 미들웨어를 추가하고 배포 환경변수 안내를 갱신했다.

### 2026-07-13
- **Watchlist 자연어 질문 기능** — `src/app/api/ask-market/route.ts`, `src/components/market-question.tsx`, `src/app/page.tsx`
  - 원인/이유: 앱이 이미 불러온 종목 시세에서 상승·하락 종목을 자연어로 확인할 수 있는 경로가 없었다.
  - 수정: 기존 시세 캐시와 AI 공통 레이어를 재사용해 Watchlist 데이터만 근거로 답하는 API와 대시보드 질문 UI를 추가했다.

### 2026-07-10
- **관심 종목 시세 강제 새로고침** — `src/lib/cache.ts`, `src/app/api/refresh-quotes/route.ts`, `src/components/refresh-quotes-button.tsx`, `src/app/page.tsx`
  - 원인/이유: 대시보드의 일반 페이지 갱신은 2분 시세 TTL을 그대로 사용해 사용자가 즉시 최신 시세를 요청할 수 없었다.
  - 수정: 강제 조회 옵션과 watchlist 갱신 API, 대시보드 새로고침 버튼을 추가해 최신 공급자 데이터를 조회·저장한 뒤 화면을 갱신한다.
