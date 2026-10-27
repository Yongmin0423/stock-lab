### 2026-10-27

- **앱 아이콘을 기존 주가 그래프로 복원** — `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`, `public/manifest.json`, `src/app/layout.tsx`
  - 원인/이유: 책갈피 로고 시안 대신 기존 앱 아이콘을 유지하기로 했다.
  - 수정: SVG·PNG 아이콘과 아이콘 참조를 기존 상태로 복원하고 서비스 이름 주식갈피는 유지했다.

- **서비스 이름을 주식갈피로 변경** — `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/login/page.tsx`, `src/lib/seo.ts`, `public/manifest.json`, `src/app/api/export-notes/route.ts`, `README.md`
  - 원인/이유: StockLab이라는 이름이 기존 서비스와 겹쳐, 주식 공부와 리서치라는 용도를 드러내는 고유한 이름이 필요했다.
  - 수정: 화면 로고·검색 제목·Open Graph·설치 앱 이름·노트 백업 이름을 주식갈피로 통일했다. 로그인 제목은 공통 템플릿을 사용해 브랜드 중복을 없앴다. 기존 운영 도메인과 세션 식별자는 유지한다.

- **종목 상세의 정상 페이지 noindex 문제 보완** — `src/app/stock/[symbol]/page.tsx`, `src/lib/db/queries/stocks.ts`
  - 원인/이유: 첫 운영 배포 후 등록된 종목에도 스트리밍 404와 noindex가 포함되는 현상을 확인했다. 메타데이터와 본문의 종목 확인이 프리렌더·공유 캐시에 영향을 받지 않도록 요청 단위로 맞출 필요가 있었다.
  - 수정: 종목 메타데이터는 요청 시점에 조회하고 조회 결과는 React 요청 단위 캐시로 공유한다. 기존 종목 경로 디코딩도 유지한다.


- **검색 노출 기본 설정 추가** — `src/lib/seo.ts`, `src/app/layout.tsx`, `src/app/**/page.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/lib/db/queries/stocks.ts`, `README.md`, `tests/seo.test.mjs`, `tests/seo-routes.test.mjs`
  - 원인/이유: 공개 페이지가 같은 제목을 공유하고 canonical·사이트맵·robots가 없었으며, 미등록 종목도 안내 화면을 정상 페이지처럼 반환했다.
  - 수정: SITE_URL 기반 대표 URL과 페이지별 제목·설명·Open Graph를 추가하고, 실제 등록 종목·노트·저장 브리핑의 사이트맵을 생성한다. 노트 설명은 공개 미리보기로 제한하고 설정·작성 화면은 noindex로 지정한다. 미등록 종목과 없는 상세 콘텐츠는 notFound 처리한다. 스트리밍이 먼저 시작되면 HTTP 200일 수 있으므로 noindex 응답을 검증한다.

### 2026-10-23

- **로그인 화면에 공개 조회 진입 링크 추가** — `src/app/login/page.tsx`
  - 원인/이유: 공개 조회로 전환한 뒤에도 기존 `/login` 주소에서는 로그인 화면이 유지돼, 방문자가 로그인 없이 볼 수 있는 경로를 알아보기 어려웠다. 실행 중인 로컬 서버의 `/`은 비로그인 `200`이며 로그인 리다이렉트가 없음을 확인했다.
  - 수정: 운영자 로그인 폼 위에 대시보드로 이동하는 “로그인 없이 둘러보기” 링크를 추가했다.

- **공개 조회와 운영자 실행 권한 분리** — `src/proxy.ts`, `src/lib/auth.ts`, `src/lib/operator.ts`, `src/lib/note-preview.ts`, `src/app/actions.ts`, `src/app/api/`, `src/app/`, `src/components/`, `tests/auth.test.mjs`, `tests/operator-routes.test.mjs`
  - 원인/이유: 기존에는 모든 화면을 공용 비밀번호로 막았지만, 결과는 공개하고 AI 비용과 데이터 변경은 운영자만 허용할 필요가 있었다. 노트는 본문 일부만 공개하고 전문은 로그인 후 열람해야 했다.
  - 수정: 기존 서명 세션을 재사용해 공개 조회와 운영자 전용 API·서버 액션·작성/설정 화면을 분리하고, 인증 설정 누락 시에도 실행 권한을 차단한다. AI 실행·갱신·추가/삭제 UI는 운영자에게만 표시하며, 노트 공개 응답은 서버에서 160자로 제한한다. 로그인/로그아웃 메뉴를 추가하고 Cron은 비밀키가 있어야만 실행한다. 세션·공개 경로·노트 미리보기와 실제 HTTP 접근 권한 회귀 검증을 추가했다.

- **브리핑 OpenAI 빈 응답 진단 및 추론 예산 보완** — `src/lib/ai/llm.ts`, `tests/llm-openai.test.mjs`
  - 원인/이유: 운영 Cron을 수동 실행해 `OpenAI 응답이 비어 있습니다` 오류로 저장 전에 중단됨을 확인했다. 기존 오류는 종료 사유·토큰 사용량을 누락해 빈 응답의 원인을 구분할 수 없었고, 추론 모델에도 본문과 추론을 합쳐 3,000토큰만 허용했다. 운영 응답의 종료 사유가 남아 있지 않아 토큰 소진 여부는 추정이다.
  - 수정: GPT-5·6 및 o 계열 브리핑은 low 추론과 최소 12,000토큰 예산을 사용한다. 출력 한도로 중단된 응답은 JSON 파싱 전에 거부하고, 오류에 모델·종료 사유·출력/추론 토큰 수만 포함한다. 모의 응답으로 토큰 소진·정상 완료·빈 응답·다른 tier와 모델 설정을 검증한다. 운영 배포 및 수정 후 실제 생성 검증은 별도 필요하다.

### 2026-08-28

- **아침·저녁 브리핑 분석 컨텍스트 확장** — `src/lib/briefing-run.ts`, `src/lib/ai/briefing.ts`, `src/app/briefing/page.tsx`, `tests/briefing-prompt.test.mjs`
  - 원인/이유: 브리핑 프롬프트가 시장 전체 지표 없이 룰 통과 여부, 최근 분석의 첫 근거, 출처·시각 없는 뉴스 제목만 받아 종목별 변화와 기존 판단에 미치는 영향을 구체적으로 설명하기 어려웠다.
  - 수정: 기존 시장 상태 수집기를 재사용하고 재무·룰 상세, 최근 분석 전체, 새 뉴스 여부, 종목 관련 노트를 브리핑에 전달했다. 종목별 결과를 확인된 변화·해석·기존 판단 영향·다음 확인 순서로 작성하고 줄바꿈을 보존해 표시한다.

### 2026-08-21

- **런타임 데이터에 페이지별 Suspense 경계 추가** — `src/components/page-loading.tsx`, `src/app/loading.tsx`, `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/briefing/page.tsx`, `src/app/discover/page.tsx`, `src/app/news/page.tsx`, `src/app/notes/page.tsx`, `src/app/notes/[id]/page.tsx`, `src/app/settings/page.tsx`, `src/app/stock/[symbol]/page.tsx`, `src/app/stocks/page.tsx`
  - 원인/이유: 전역 로딩 파일만으로는 페이지 함수가 직접 접근하는 `params`·`searchParams`와 비캐시 DB 작업을 감싸지 못해 개발 서버에서 blocking prerender 경고가 발생했다.
  - 수정: 각 페이지를 동기 wrapper와 내부 async 콘텐츠로 분리하고 공용 로딩 UI를 가까운 Suspense fallback으로 사용해 정적 셸 밖의 런타임 작업을 명시했다.

- **변경 빈도가 낮은 DB 조회에 선택적 캐시 적용** — `src/lib/db/queries/master.ts`, `src/lib/db/queries/briefings.ts`, `src/lib/db/queries/discoveries.ts`, `src/app/discover/page.tsx`
  - 원인/이유: Cache Components 활성화 후에도 종목 마스터·브리핑·발굴 결과를 매 요청마다 DB에서 다시 읽고 있었고, 조회 중 시드 작업이 있는 종목 마스터에는 캐시를 직접 적용할 수 없었다.
  - 수정: 종목 마스터는 시드 후 별도 조회를 일 단위로 캐시하고, 브리핑·발굴은 시간 단위 캐시와 태그를 적용했다. 새 브리핑·발굴 저장 시 해당 태그를 즉시 만료해 생성 직후 최신 결과가 표시되도록 했다.

- **Cache Components 렌더링 구조 활성화** — `next.config.ts`, `src/app/loading.tsx`, `src/app/page.tsx`, `src/app/briefing/page.tsx`, `src/app/discover/page.tsx`, `src/app/news/page.tsx`, `src/app/notes/page.tsx`, `src/app/notes/[id]/page.tsx`, `src/app/settings/page.tsx`, `src/app/stock/[symbol]/page.tsx`, `src/app/stocks/page.tsx`, `src/app/api/cron/refresh-screening/route.ts`
  - 원인/이유: 전체 페이지의 `force-dynamic` 설정이 Next.js 16 Cache Components의 명시적 정적 셸·동적 콘텐츠 모델과 호환되지 않았다.
  - 수정: `cacheComponents`를 활성화하고 9개 페이지의 `force-dynamic`을 제거했으며, 전역 로딩 경계 안에서 기존 DB·외부 데이터 조회가 요청 시점에 실행되도록 했다. GET cron도 빌드 중 실행되지 않도록 요청 경계를 명시하고 개발 서버의 에이전트 규칙 파일 자동 생성은 비활성화했으며, 데이터 캐시 정책은 후속 단계에서 별도로 적용한다.

- **Next.js 16 런타임 및 개발 도구 마이그레이션** — `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, `eslint.config.mjs`, `src/proxy.ts`, `src/app/layout.tsx`, `src/app/discover/page.tsx`, `src/components/search-dialog.tsx`
  - 원인/이유: Next.js 15와 폐기 예정인 Middleware·`next lint` 구성을 사용해 Next.js 16 업그레이드가 필요했다.
  - 수정: Next.js 16.3.1과 호환 React·타입 패키지로 갱신하고 Middleware를 Proxy로 전환했으며, 공식 flat config 기반 ESLint CLI를 추가했다. 새 린트 규칙에 맞춰 내부 링크와 검색창 상태 정리를 수정했으며 Cache Components는 별도 단계에서 적용한다.

### 2026-08-17

- **대시보드 AI 질문 DB 부하와 응답 시간 개선** — `src/app/api/ask-market/route.ts`, `src/lib/market-question.ts`, `src/lib/db/queries/news.ts`, `src/lib/db/queries/analyses.ts`, `src/lib/db/schema.ts`, `tests/market-question.test.mjs`
  - 원인/이유: AI 질문마다 전체 뉴스 정렬·전체 개수 조회와 종목별 분석 N개 쿼리를 다른 DB 조회와 동시에 실행해 Supabase `statement_timeout`이 발생했고, 단순 등락 질문도 전체 컨텍스트와 LLM을 사용했다.
  - 수정: 단순 등락 질문은 시세로 즉시 계산하고, 복잡한 질문은 의도에 필요한 컨텍스트만 순차 조회한다. 뉴스와 최신 분석은 관심종목 대상 단일 `IN` 쿼리로 통합하고 종목·시간 복합 인덱스를 추가했으며 AI 답변 상한을 700토큰으로 줄였다.

### 2026-08-16

- **종목 검색 지연과 요청 경합 방지** — `src/components/search-dialog.tsx`, `src/app/api/search/route.ts`, `src/lib/providers/finnhub.ts`, `src/lib/providers/types.ts`, `tests/parse-symbol.test.mjs`
  - 원인/이유: 입력이 바뀌어도 이미 시작한 검색 요청이 남고, Finnhub 요청에 제한 시간이 없어 이전 응답 덮어쓰기와 Vercel 504가 발생할 수 있었다.
  - 수정: 새 검색 시 이전 요청을 중단하고 Finnhub 호출을 5초로 제한했다. 한글·숫자 검색은 한국 종목 DB만 조회하며, 미국 검색 실패 시 빈 결과로 오인하지 않도록 안내한다. 검색 대상 판별 검증도 추가했다.

- **종목 상세 진입 응답성과 데이터 로딩 개선** — `src/components/stock-card.tsx`, `src/app/stock/[symbol]/page.tsx`, `src/app/stock/[symbol]/loading.tsx`, `src/lib/cache.ts`, `src/app/api/refresh-news/route.ts`, `src/lib/providers/kis.ts`, `src/lib/providers/dart.ts`, `src/lib/providers/naver-news.ts`
  - 원인/이유: 카드 일부만 링크였고 상세 라우트 로딩 UI가 없었으며, 재무·뉴스·DB 조회와 뉴스 AI 평가를 초기 렌더링에서 순차로 기다렸다.
  - 수정: 카드 전체를 링크로 만들고 상세 전용 스켈레톤을 추가했다. 재무·룰과 뉴스를 Suspense로 분리하고 독립 DB 조회 및 DART 호출을 병렬화했으며, 뉴스 AI 평가는 수동 뉴스 갱신에서만 실행한다. 외부 KIS·DART·네이버 요청에도 제한 시간을 적용했다.

- **로그인 제출 상태 표시** — `src/app/login/page.tsx`, `src/app/login/submit-button.tsx`
  - 원인/이유: 로그인 확인 중에도 제출 버튼이 활성화되어 중복 제출할 수 있고 진행 여부를 알기 어려웠다.
  - 수정: 서버 액션 제출 상태 동안 버튼을 비활성화하고 `로그인 중…` 문구와 대기 커서를 표시한다.

- **대시보드 DB 조회 안정화** — `src/app/page.tsx`
  - 원인/이유: 독립 조회 7개를 동시에 실행한 뒤 Supabase에서 단순 룰 조회까지 `statement_timeout`으로 취소되어 대시보드가 500 응답을 반환했다.
  - 수정: DB 연결 압력을 낮추고 페이지 진입을 복구하기 위해 대시보드 조회를 기존 순차 실행으로 되돌렸다.

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
