# MVP 구현 계획서

> 기획서(주식_리서치_대시보드_기획서.md)의 실행 문서. 셋업 → MVP 완성까지.
> 단위: "세션" = 주말 반나절(3~4시간) 작업 1회 기준. 총 **12~14세션 ≈ 7주**.

---

## ★ 진행 현황 (2026-07-06 업데이트)

| 마일스톤 | 상태 | 비고 |
|---|---|---|
| M0 사전 준비 | 🔶 부분 | Supabase ✅ / Finnhub·Anthropic·KIS·네이버 키 남음 |
| M1 셋업 + 첫 시세 | ✅ | pnpm으로 전환 |
| M2 DB + watchlist | ✅ | ⌘K 검색, 스타터 칩, TTL 캐시 |
| M3 종목 상세 | ✅ | 캔들차트 + 지표 8종 |
| M4 한국 주식 (KIS) | 🔶 코드 완성 | 키 연결 + 마스터 적재만 남음 → 연결_가이드.md |
| M5 뉴스 | ✅ | Finnhub + 네이버 모듈(대기) |
| M6 지식 노트 | ✅ | 마크다운 에디터, 태그, 관련종목 |
| M7 계산식 + AI 분석 | ✅ | 키 없으면 모의 모드 |
| M8 배포 | 🔶 준비물 완성 | Basic Auth·PWA·cron 코드 완료, Vercel 연결만 → 연결_가이드.md |
| P2 확장 | ✅ | 룰 편집 UI, 노트 AI 검토, 브리핑 v1, 발굴, 노트→룰, 백업 |

### 구현하며 계획에서 달라진 것
- **pnpm** 사용 (`pnpm-workspace.yaml`에 sharp 빌드 설정 포함)
- **일봉 3단 폴백**: Finnhub → Stooq(키 불필요) → 합성 캔들. Finnhub 무료 티어 candle 제한 대응
- **모든 외부 의존성에 모의(mock) 모드**: 키 없이도 앱 전체가 동작, 키 넣으면 실데이터 전환
- **`pnpm db:push` 사용 불가** (drizzle-kit introspection 버그) → 스키마 변경 시 Supabase SQL Editor에 ALTER 문 직접 실행. 지금까지 실행한 것: `news.fetched_at`, `analyses.risks`
- mutation은 API Route 대신 **Server Actions** 사용 (더 단순)

### 남은 작업 ①: M4 — 한국 주식 (KIS 승인 후 1~2세션)

사전 준비: KIS APP Key/Secret + 네이버 Client ID/Secret을 `.env.local`에 추가 (`KIS_ENV=real` 권장 — 모의서버는 시세 API 제한 있음)

1. **stocks_master 테이블** — SQL Editor에서:
   ```sql
   CREATE TABLE IF NOT EXISTS stocks_master (
     code text PRIMARY KEY, name text NOT NULL
   );
   ```
   schema.ts에도 동일 테이블 추가
2. **KRX 종목 마스터 적재** — `scripts/load-krx-master.ts` 작성: KIS GitHub(koreainvestment/open-trading-api)의 종목마스터 파일 다운로드 → 파싱 → stocks_master에 insert. 1회 실행
3. **`src/lib/providers/kis.ts`** — §14.6 코드 참고. 순서: 토큰 관리(kis_tokens 테이블 이미 존재) → getQuote/getFundamentals(현재가 API 하나로 커버) → getDailyCandles → searchSymbol(stocks_master ILIKE)
4. **`factory.ts`** — KR 라우팅의 throw를 kis로 교체 (1줄)
5. **`/api/search`** — US(Finnhub) + KR(stocks_master) 결과 병합
6. **empty-state에 한국 스타터 추가** — 삼성전자(005930)·현대차(005380) 등, "M4에서 지원" 문구 제거
7. **검증**: 005930 추가 → 카드에 "71,200원" 포맷 → 상세에서 KIS 일봉 차트 + PER/PBR/EPS → 네이버 뉴스 표시(자동 활성화) → AI 분석 실행

### 남은 작업 ②: M8 — 배포 (1세션)

1. GitHub repo 생성 → push (`.env.local`은 gitignore 확인됨)
2. vercel.com → Import Project → 환경변수 전부 등록 (DATABASE_URL, FINNHUB, ANTHROPIC, KIS×3, NAVER×2)
3. **접근 보호** (공개 URL에서 내 API 비용 방어): `src/middleware.ts`에 Basic Auth ~15줄 + `BASIC_AUTH_PASSWORD` env
4. PWA: `public/manifest.json` + 아이콘, layout에 메타 연결 → 폰 홈 화면 추가
5. 모바일 레이아웃 점검 (대시보드·상세·노트)
6. **최종 검증 = §0 DoD 시나리오**: 폰에서 종목 추가 → 상세 확인 → 노트 작성 → AI 분석 → 노트 수정 → 재분석 → 결과가 달라지는지

### 남은 작업 ③: 키 발급 잔여 체크리스트
- [ ] Finnhub 키 → `.env.local` (즉시, 시세 실데이터)
- [ ] Anthropic 키 + 크레딧 $5 → `.env.local` (즉시, AI 분석 실전환)
- [ ] KIS 계좌 개설 → KIS Developers 앱키 신청 (승인 1~2일) ← **M4 블로커**
- [ ] 네이버 개발자센터 앱 등록 (즉시, M4 때 필요)

---

## 0. MVP 완성의 정의 (Definition of Done)

아래 시나리오가 끊김 없이 동작하면 MVP 완성:

1. 미국/한국 종목을 검색해 watchlist에 추가한다
2. 대시보드에서 시세·등락·룰 뱃지를 본다
3. 종목 상세에서 차트·재무지표·뉴스를 본다
4. 책에서 배운 내용을 노트로 작성한다
5. "AI 분석" 버튼을 누르면 **내 노트를 인용한** 분석 결과가 나오고 저장된다
6. 노트를 수정하고 다시 분석하면 결과가 달라진다 ← 핵심 체험

---

## 1. M0: 사전 준비 (세션 0.5, 코드 없음)

| 작업 | 소요 | 비고 |
|---|---|---|
| KIS: 한투 계좌 개설(비대면) → KIS Developers 앱키 신청 | 승인 1~2일 대기 | **제일 먼저.** 모의투자 계좌로 가능 |
| Finnhub 키 발급 | 즉시 | finnhub.io 가입 |
| OpenDART 키 발급 | 즉시 | opendart.fss.or.kr (MVP엔 미사용, 미리 확보) |
| 네이버 개발자센터 앱 등록 (검색 API) | 즉시 | 뉴스용 |
| Anthropic API 키 | 즉시 | console.anthropic.com |
| Supabase 프로젝트 생성 | 즉시 | 리전: ap-northeast-2 |
| GitHub repo 생성 | 즉시 | |

---

## 2. M1: 프로젝트 셋업 + 첫 시세 (세션 1)

**목표**: `/api/quote?symbol=AAPL` 이 실제 가격을 반환하고 화면에 표시된다 (tracer bullet)

```bash
npx create-next-app@latest stock-lab --typescript --app --tailwind --src-dir
cd stock-lab
npx shadcn@latest init
npm i drizzle-orm postgres zod @anthropic-ai/sdk
npm i -D drizzle-kit
```

폴더 구조:

```
src/
  app/
    (pages)/            # /, /stock/[symbol], /notes, /news, /settings
    api/                # route handlers
  lib/
    providers/
      types.ts          # MarketDataProvider 인터페이스 + 공용 타입
      finnhub.ts
      kis.ts
      naver-news.ts
      factory.ts        # market → provider 라우팅
    ai/
      prompt.ts         # 프롬프트 조립
      analyze.ts        # Claude 호출 + 파싱
    db/
      schema.ts
      queries/
    cache.ts            # TTL 캐시 헬퍼
    market-hours.ts     # 장 상태 계산 (KST 기준)
    format.ts           # 통화/숫자 포맷
  components/
config/
  rules.json            # 하드코딩 계산식
```

작업:
- [ ] 위 스캐폴딩 + `.env.local` 세팅 (아래 §9)
- [ ] `types.ts`: 인터페이스 먼저 정의 (구현 전에 계약부터)

```ts
type Market = 'US' | 'KR'
interface Quote { symbol: string; market: Market; price: number; changePct: number; currency: 'USD'|'KRW'; asOf: Date }
interface Fundamentals { per?: number; pbr?: number; eps?: number; roe?: number; debtToEquity?: number; dividendYield?: number; marketCap?: number; week52High?: number; week52Low?: number }
interface Candle { date: string; open: number; high: number; low: number; close: number; volume: number }
interface NewsItem { headline: string; source: string; url: string; publishedAt: Date }

interface MarketDataProvider {
  market: Market
  getQuote(symbol: string): Promise<Quote>
  getDailyCandles(symbol: string, days: number): Promise<Candle[]>
  getFundamentals(symbol: string): Promise<Fundamentals>
  getNews(symbol: string, name: string): Promise<NewsItem[]>
  searchSymbol(query: string): Promise<{ symbol: string; name: string }[]>
}
```

- [ ] `finnhub.ts`: `getQuote`, `searchSymbol` 만 우선 구현
- [ ] `/api/quote` route + 메인 페이지에 AAPL 가격 표시

**DoD**: 브라우저에서 실제 AAPL 가격이 보인다

---

## 3. M2: DB + Watchlist (세션 2)

**목표**: 종목 검색 → 추가 → 카드 그리드 표시

- [ ] Drizzle 스키마 작성 + `drizzle-kit push` (전체 테이블 한 번에, §8 참고)
- [ ] `cache.ts`: 공유 캐시 헬퍼 — **모든 외부 API 호출은 이 함수를 통과**

```ts
// 종목 기준 캐시. 서비스화 시에도 이 구조 그대로 (기획서 §11.4)
async function cachedFetch<T>(key: string, ttlSec: number, fetcher: () => Promise<T>): Promise<T>
// key 예: "quote:US:AAPL", TTL: quote 120s / fundamentals 24h / news 1h / candles 24h
```

- [ ] watchlist CRUD: 검색 모달(shadcn Command, ⌘K) → `stocks` insert → 대시보드 카드 그리드
- [ ] 빈 상태: 하드코딩 스타터 목록(시총 상위 US 5 + KR 5) 칩 → 클릭 한 번에 추가
- [ ] `format.ts`: `$152.34` / `71,200원` 분기
- [ ] `market-hours.ts`: KST 기준 장중/마감 계산 (미국 서머타임 포함, 휴장일은 MVP 생략)

**DoD**: 새로고침해도 watchlist 유지, 카드에 시세·등락 표시

---

## 4. M3: 종목 상세 — 미국 먼저 (세션 3~4)

**목표**: `/stock/US:AAPL` 완성 (미국 종목 한정)

- [ ] `finnhub.ts` 나머지 구현: `getDailyCandles`(candle API), `getFundamentals`(basic financials에서 PER·PBR·ROE 등 추출)
- [ ] 차트: `lightweight-charts` 캔들 + 기간 토글(1M/3M/1Y)
- [ ] 재무지표 패널: 8개 지표 카드 (없는 값은 "—")
- [ ] 페이지 레이아웃: 헤더(가격·등락·장상태) / 차트 / 지표 / (뉴스·분석은 자리만)

**DoD**: AAPL 상세에서 차트와 PER를 본다

---

## 5. M4: KIS Provider — 한국 시세 (세션 5~6, 승인 완료 전제)

**목표**: 삼성전자(005930)가 watchlist와 상세에서 미국 종목과 동일하게 동작

- [ ] KIS 토큰 관리: access_token은 **24시간 유효 + 발급 API 자체에 호출 제한** → DB(`kis_tokens`)에 저장하고 만료 임박 시에만 재발급. 매 요청마다 발급하면 차단됨 (최대 함정)
- [ ] `kis.ts`:
  - `getQuote` + `getFundamentals`: 국내주식 현재가 시세 API 하나로 둘 다 커버 (응답에 PER·PBR·EPS 포함 — DART 자체 계산은 MVP 이후)
  - `getDailyCandles`: 일봉 조회 API
  - `searchSymbol`: KRX 상장종목 마스터 파일(정적 다운로드)을 DB에 적재 후 LIKE 검색 — API보다 단순
- [ ] `factory.ts`: `US:` / `KR:` 프리픽스로 라우팅
- [ ] 초당 호출 제한(실전 20/s, 모의 2/s) 대응: 순차 호출 + 100ms 간격이면 충분 (동시 fetch 금지)

**DoD**: watchlist에 AAPL과 005930이 나란히, 각자 통화 포맷으로 표시

---

## 6. M5: 뉴스 (세션 7)

**목표**: 종목 상세 뉴스 탭 + `/news` 통합 피드

- [ ] `finnhub.ts#getNews`: company-news API
- [ ] `naver-news.ts`: 종목명 쿼리 → 뉴스 검색 API. 관련성 필터: 제목에 종목명 포함 건만 (동명 노이즈 제거)
- [ ] 뉴스는 fetch 시 `news` 테이블에 upsert (URL unique) — AI 분석 컨텍스트 재사용
- [ ] `/news`: 전 종목 최신순, 종목 필터

**DoD**: 상세 페이지에서 그 종목 뉴스, /news에서 통합 피드

---

## 7. M6: 지식 노트 (세션 8)

**목표**: 노트 CRUD — 이 서비스의 심장이므로 작성 UX에 시간 투자

- [ ] `/notes` 목록: 태그 필터 칩, 키워드 검색(ILIKE)
- [ ] 에디터: textarea + 마크다운 프리뷰(react-markdown)면 충분. 위지윅 금지(범위 초과)
- [ ] 필드: 제목, 본문, 태그(자유 입력 + 기존 태그 자동완성), 출처, 관련 종목(선택)
- [ ] 시드 노트 3개 직접 작성 — M7 테스트 데이터 겸 진짜 공부 기록

**DoD**: 노트 작성→수정→태그 검색이 매끄럽다

---

## 8. M7: 계산식 + AI 분석 (세션 9~11, MVP의 클라이맥스)

**목표**: DoD 시나리오 5·6번 달성

- [ ] `config/rules.json` + 평가기: 지표에 op 적용 → `{ ruleName, passed, details[] }`. 순수 함수 + 유닛 테스트(vitest)
- [ ] 노트 검색 (MVP 단순 버전): 관련 종목 일치 + 태그/키워드 매칭, 부족하면 최신순으로 채워 **최대 5개**. 노트 30개 이하면 전부 주입도 OK
- [ ] `prompt.ts`: 기획서 §5.3 구조로 조립. 노트에 `[note-{id}]` 라벨 필수
- [ ] `analyze.ts`: Claude 호출 (tool use로 JSON 스키마 강제 권장)

```ts
// 응답 스키마 (zod로 검증)
{ verdict: '매수검토'|'관망'|'회피', confidence: 1-5,
  reasons: string[], cited_notes: string[], risks: string[],
  challenges: string[] }  // 내 원칙에 대한 AI의 반론 (잘못된 노트 방어)
```

- [ ] `/api/analyze` POST: 데이터 수집(캐시 경유) → 룰 평가 → 노트 검색 → 프롬프트 → Claude → `analyses` insert → 반환
- [ ] 결과 카드 UI: verdict 뱃지, 근거, 인용 노트 링크, 리스크, **반론(⚠ 스타일로 구분 표시)** / 상세 페이지에 분석 이력 탭
- [ ] 룰 뱃지를 대시보드 카드·상세에 표시

**검증 (세션 11 일부)**:
- [ ] 같은 종목을 노트 추가 전/후 분석 → cited_notes에 새 노트가 등장하는지
- [ ] 수치 환각 체크: reasons의 숫자가 주입한 데이터와 일치하는지 5종목 샘플 확인
- [ ] 노트 0개일 때 우아하게 동작 ("원칙 미등록" 안내)

**DoD**: 노트를 고치면 분석이 달라지는 걸 확인

---

## 9. M8: 마무리 + 배포 (세션 12)

- [ ] Vercel 배포 + 환경변수 등록, Supabase 프로덕션 연결
- [ ] 접근 보호: 혼자 쓰지만 공개 URL이므로 Basic Auth 또는 Vercel 배포 보호 설정 (API 키 비용 방어)
- [ ] 반응형 점검(모바일에서 대시보드·상세), PWA manifest
- [ ] "투자 조언 아님" 푸터
- [ ] README: 셋업 방법 (미래의 나를 위해)

**DoD**: 폰에서 접속해 전체 시나리오 통과

---

## 10. 환경 변수

```
DATABASE_URL=            # Supabase pooler
FINNHUB_API_KEY=
KIS_APP_KEY=
KIS_APP_SECRET=
KIS_ACCOUNT_NO=
KIS_ENV=paper|real       # 모의/실전
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
ANTHROPIC_API_KEY=
BASIC_AUTH_PASSWORD=     # M8
```

---

## 11. DB 스키마 (Drizzle 기준 요약)

```
stocks     symbol PK 형식 "US:AAPL"/"KR:005930", name, market, added_at
quotes     stock_symbol FK, price, change_pct, fetched_at        -- 캐시
candles    stock_symbol FK, date, o/h/l/c/volume, UNIQUE(symbol,date)
financials stock_symbol FK, per, pbr, eps, roe, debt_to_equity,
           dividend_yield, market_cap, w52_high, w52_low, fetched_at
news       id, stock_symbol FK, headline, source, url UNIQUE, published_at
notes      id, title, content, tags text[], source, related_symbols text[],
           created_at, updated_at
analyses   id, stock_symbol FK, verdict, confidence, reasons jsonb,
           cited_note_ids int[], price_at_analysis, trigger, created_at
kis_tokens id, access_token, expires_at
```

- user_id는 넣지 않되, 모든 쿼리를 `queries/` 폴더에 모아둠 → 나중에 한 곳만 수정 (기획서 §11.4)

---

## 12. 함정 목록 (미리 알고 가기)

| 함정 | 대응 |
|---|---|
| KIS 토큰을 매 요청 발급 → 차단 | DB 저장 + 만료 시에만 갱신 (M4 첫 작업) |
| KIS 모의계좌 초당 2건 제한 | 순차 호출 + 간격. watchlist 갱신을 병렬로 짜지 말 것 |
| Finnhub candle이 무료 티어에서 제한될 수 있음 | 안 되면 일봉은 FMP(무료 250/day)로 대체. Provider 구조라 교체 쉬움 |
| 미국 장 시간 = 한국 밤 | "마감" 상태가 정상. asOf 시각을 항상 표시해 혼란 방지 |
| 네이버 뉴스 동명 노이즈 (예: "삼성" 검색) | 제목 내 정확한 종목명 매칭 + 증권 카테고리 우선 |
| Claude 응답 JSON 파싱 실패 | tool use(스키마 강제) 사용, 실패 시 1회 재시도 |
| 수치 환각 | 화면의 모든 숫자는 DB 값. AI 출력의 숫자는 신뢰하지 않고 해석만 사용 |
| 범위 팽창 (제일 위험) | 이 문서에 없는 기능은 전부 기획서 Phase 2 백로그로 |

---

## 13. 부록: 필요한 쿼리 전체 목록 (백엔드 참고서)

> 이 앱의 백엔드는 "외부 API → 저장 → 꺼내서 표시"가 전부. 아래 ~20개가 전체이며,
> 핵심 패턴은 4개뿐: **① upsert ② 그룹별 최신 1건 ③ 배열 연산 ④ ILIKE 검색**

### Watchlist (M2)
```sql
-- 추가 / 삭제 (기본 CRUD)
INSERT INTO stocks (symbol, name, market) VALUES ('US:AAPL','Apple','US');
DELETE FROM stocks WHERE symbol = 'US:AAPL';

-- 대시보드: 전 종목 + 각자의 최신 시세 (패턴② DISTINCT ON)
SELECT DISTINCT ON (q.stock_symbol) s.*, q.price, q.change_pct, q.fetched_at
FROM stocks s LEFT JOIN quotes q ON q.stock_symbol = s.symbol
ORDER BY q.stock_symbol, q.fetched_at DESC;
```

### 시세/캐시 (M2~M4)
```sql
-- 캐시 신선도 확인 → 오래됐으면 API 호출 후 upsert (패턴①)
SELECT * FROM quotes WHERE stock_symbol=$1 AND fetched_at > now() - interval '2 minutes';

INSERT INTO quotes (stock_symbol, price, change_pct, fetched_at)
VALUES ($1,$2,$3,now())
ON CONFLICT (stock_symbol) DO UPDATE SET price=$2, change_pct=$3, fetched_at=now();
-- ※ quotes를 "종목당 1행 유지"로 설계하면 위처럼 단순해짐 (이력은 candles가 담당)

-- 일봉 upsert (패턴①) + 기간 조회
INSERT INTO candles (...) VALUES (...) ON CONFLICT (stock_symbol, date) DO NOTHING;
SELECT * FROM candles WHERE stock_symbol=$1 AND date >= $2 ORDER BY date;

-- financials: quotes와 동일 패턴 (종목당 1행 + 24h TTL)
```

### 뉴스 (M5)
```sql
-- url 기준 중복 방지 upsert (패턴①)
INSERT INTO news (stock_symbol, headline, source, url, published_at)
VALUES (...) ON CONFLICT (url) DO NOTHING;

-- 종목별 / 통합 피드
SELECT * FROM news WHERE stock_symbol=$1 ORDER BY published_at DESC LIMIT 20;
SELECT n.*, s.name FROM news n JOIN stocks s ON s.symbol=n.stock_symbol
ORDER BY published_at DESC LIMIT 50;
```

### 노트 (M6)
```sql
-- CRUD는 기본. 검색이 핵심:
-- 태그 필터 (패턴③ &&: 배열 교집합 존재)
SELECT * FROM notes WHERE tags && ARRAY['가치투자','안전마진'];

-- 키워드 검색 (패턴④)
SELECT * FROM notes WHERE title ILIKE '%'||$1||'%' OR content ILIKE '%'||$1||'%';

-- 태그별 개수 (필터 칩 UI용)
SELECT unnest(tags) AS tag, count(*) FROM notes GROUP BY tag ORDER BY count DESC;
```

### AI 분석 (M7)
```sql
-- 분석용 관련 노트 선별: 관련종목 일치 > 태그 매칭 > 최신순, 최대 5개
SELECT * FROM notes
WHERE $1 = ANY(related_symbols) OR tags && $2
ORDER BY ($1 = ANY(related_symbols)) DESC, updated_at DESC LIMIT 5;

-- 결과 저장 (INSERT) / 종목별 이력 / 종목별 최신 1건 (패턴②)
SELECT * FROM analyses WHERE stock_symbol=$1 ORDER BY created_at DESC;
SELECT DISTINCT ON (stock_symbol) * FROM analyses ORDER BY stock_symbol, created_at DESC;

-- 노트 역링크: "이 노트를 인용한 분석 N건" (패턴③ @>: 배열 포함)
SELECT count(*) FROM analyses WHERE cited_note_ids @> ARRAY[$1]::int[];
```

### Drizzle 팁 (백엔드 초심자용)
- 위 쿼리 대부분은 Drizzle 메서드 체인으로 표현 가능: `db.select().from(notes).where(arrayOverlaps(notes.tags, [...]))`
- `DISTINCT ON`처럼 Drizzle이 어색한 것만 `db.execute(sql\`...\`)`로 raw SQL 사용
- 모든 쿼리를 `lib/db/queries/` 폴더에 함수로 모아둘 것 — 페이지에서 직접 쿼리 금지 (기획서 §11.4의 user_id 대비이기도 함)
- 인덱스는 MVP에선 PK/UNIQUE 외에 불필요 (데이터가 수천 행 수준)

## 14. 코드 레퍼런스 (파일별 상세)

> 각 마일스톤에서 만들 핵심 파일의 실제 코드. 그대로 타이핑하지 말고 구조를 이해하고 참고할 것.

### 14.1 기술 스택 확정 + 설치

```bash
npx create-next-app@latest stock-lab --typescript --app --tailwind --src-dir --eslint
cd stock-lab
npx shadcn@latest init && npx shadcn@latest add button card badge command dialog tabs input
npm i drizzle-orm postgres zod @anthropic-ai/sdk lightweight-charts react-markdown
npm i -D drizzle-kit vitest
```

| 용도 | 선택 | 왜 |
|---|---|---|
| 프레임워크 | Next.js 15 App Router | Server Component로 "DB 조회 → 렌더"가 한 파일에서 끝남. 백엔드 초심자에게 오히려 단순 |
| DB 접근 | Drizzle + postgres.js | 스키마가 곧 타입. `drizzle-kit push`로 마이그레이션 파일 없이 개발 |
| 검증 | zod | 외부 API 응답·AI 응답을 파싱 시점에 검증 |
| 차트 | lightweight-charts | 캔들차트 전용, 무료, 트레이딩뷰 제작사 |
| 테스트 | vitest | 룰 평가기·지표 계산 등 순수 함수만 테스트 (UI 테스트는 범위 밖) |

### 14.2 `lib/db/schema.ts` (Drizzle 전체 스키마, M2)

```ts
import { pgTable, text, integer, real, timestamp, jsonb, date, serial, uniqueIndex } from 'drizzle-orm/pg-core'

export const stocks = pgTable('stocks', {
  symbol: text('symbol').primaryKey(),            // "US:AAPL" | "KR:005930"
  name: text('name').notNull(),
  market: text('market', { enum: ['US','KR'] }).notNull(),
  addedAt: timestamp('added_at').defaultNow(),
})

// 종목당 1행 유지 (이력은 candles가 담당) → 캐시 로직 단순화
export const quotes = pgTable('quotes', {
  stockSymbol: text('stock_symbol').primaryKey().references(() => stocks.symbol, { onDelete: 'cascade' }),
  price: real('price').notNull(),
  changePct: real('change_pct').notNull(),
  fetchedAt: timestamp('fetched_at').notNull(),
})

export const candles = pgTable('candles', {
  id: serial('id').primaryKey(),
  stockSymbol: text('stock_symbol').references(() => stocks.symbol, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  open: real('open'), high: real('high'), low: real('low'),
  close: real('close').notNull(), volume: real('volume'),
}, t => [uniqueIndex('candles_sym_date').on(t.stockSymbol, t.date)])

export const financials = pgTable('financials', {
  stockSymbol: text('stock_symbol').primaryKey().references(() => stocks.symbol, { onDelete: 'cascade' }),
  per: real('per'), pbr: real('pbr'), eps: real('eps'), roe: real('roe'),
  debtToEquity: real('debt_to_equity'), dividendYield: real('dividend_yield'),
  marketCap: real('market_cap'), w52High: real('w52_high'), w52Low: real('w52_low'),
  fetchedAt: timestamp('fetched_at').notNull(),
})

export const news = pgTable('news', {
  id: serial('id').primaryKey(),
  stockSymbol: text('stock_symbol').references(() => stocks.symbol, { onDelete: 'cascade' }),
  headline: text('headline').notNull(),
  source: text('source'),
  url: text('url').notNull().unique(),
  publishedAt: timestamp('published_at'),
})

export const notes = pgTable('notes', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  tags: text('tags').array().notNull().default([]),
  source: text('source'),
  relatedSymbols: text('related_symbols').array().notNull().default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const analyses = pgTable('analyses', {
  id: serial('id').primaryKey(),
  stockSymbol: text('stock_symbol').references(() => stocks.symbol),
  verdict: text('verdict', { enum: ['매수검토','관망','회피'] }).notNull(),
  confidence: integer('confidence'),
  reasons: jsonb('reasons').$type<string[]>(),
  challenges: jsonb('challenges').$type<string[]>(),
  citedNoteIds: integer('cited_note_ids').array().default([]),
  priceAtAnalysis: real('price_at_analysis'),
  trigger: text('trigger', { enum: ['manual','briefing'] }).default('manual'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const kisTokens = pgTable('kis_tokens', {
  id: serial('id').primaryKey(),
  accessToken: text('access_token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
})
```

`lib/db/index.ts`:
```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
export const db = drizzle(postgres(process.env.DATABASE_URL!, { prepare: false }), { schema })
// prepare:false — Supabase pooler(트랜잭션 모드) 필수 옵션
```

### 14.3 `lib/cache.ts` (M2 — 모든 외부 호출의 관문)

```ts
import { db } from './db'
import { sql } from 'drizzle-orm'

// 범용이 아니라 테이블별 특화가 더 단순함. 예: quote용
import { quotes } from './db/schema'
import { eq } from 'drizzle-orm'

export async function getQuoteCached(symbol: string, fetcher: () => Promise<{price:number; changePct:number}>) {
  const TTL_MS = 2 * 60 * 1000
  const cached = await db.query.quotes.findFirst({ where: eq(quotes.stockSymbol, symbol) })
  if (cached && Date.now() - cached.fetchedAt.getTime() < TTL_MS) return cached

  try {
    const fresh = await fetcher()
    const [row] = await db.insert(quotes)
      .values({ stockSymbol: symbol, ...fresh, fetchedAt: new Date() })
      .onConflictDoUpdate({ target: quotes.stockSymbol, set: { ...fresh, fetchedAt: new Date() } })
      .returning()
    return row
  } catch (e) {
    if (cached) return cached   // API 실패 시 낡은 캐시라도 반환 (장애 격리)
    throw e
  }
}
// financials(24h), news(1h)도 동일 패턴으로 각각 작성
```

### 14.4 `lib/format.ts` + `lib/market-hours.ts` (M2)

```ts
// format.ts
export function formatPrice(price: number, market: 'US'|'KR') {
  return market === 'KR'
    ? `${Math.round(price).toLocaleString('ko-KR')}원`
    : `$${price.toFixed(2)}`
}
export function formatChange(pct: number) {
  return `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`
}

// market-hours.ts — MVP는 단순 버전 (휴장일 무시)
export function isMarketOpen(market: 'US'|'KR', now = new Date()): boolean {
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const day = kst.getDay()
  if (day === 0 || day === 6) return false
  const mins = kst.getHours() * 60 + kst.getMinutes()
  if (market === 'KR') return mins >= 540 && mins <= 930          // 09:00~15:30
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const etMins = et.getHours() * 60 + et.getMinutes()
  return etMins >= 570 && etMins < 960                             // 09:30~16:00 ET (서머타임 자동 처리)
}
```

### 14.5 `lib/providers/finnhub.ts` (M1, M3)

```ts
import { z } from 'zod'
import type { MarketDataProvider } from './types'

const BASE = 'https://finnhub.io/api/v1'
const key = () => process.env.FINNHUB_API_KEY!

async function get<T>(path: string, params: Record<string,string>): Promise<T> {
  const qs = new URLSearchParams({ ...params, token: key() })
  const res = await fetch(`${BASE}${path}?${qs}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Finnhub ${res.status}: ${path}`)
  return res.json()
}

export const finnhub: MarketDataProvider = {
  market: 'US',

  async getQuote(symbol) {   // symbol은 "AAPL" (프리픽스 제거 후 전달)
    const d = z.object({ c: z.number(), dp: z.number().nullable() })
      .parse(await get('/quote', { symbol }))
    return { symbol, market: 'US', price: d.c, changePct: d.dp ?? 0, currency: 'USD', asOf: new Date() }
  },

  async getFundamentals(symbol) {
    const d: any = await get('/stock/metric', { symbol, metric: 'all' })
    const m = d.metric ?? {}
    return {
      per: m.peTTM, pbr: m.pbQuarterly, eps: m.epsTTM,
      roe: m.roeTTM, dividendYield: m.currentDividendYieldTTM,
      marketCap: m.marketCapitalization,
      w52High: m['52WeekHigh'], w52Low: m['52WeekLow'],
      debtToEquity: m['totalDebt/totalEquityQuarterly'],
    } // 필드명은 응답을 console.log로 확인 후 확정할 것 (버전에 따라 다름)
  },

  async getDailyCandles(symbol, days) {
    const to = Math.floor(Date.now()/1000), from = to - days*86400
    const d: any = await get('/stock/candle', { symbol, resolution: 'D', from: String(from), to: String(to) })
    if (d.s !== 'ok') return []
    return d.t.map((t: number, i: number) => ({
      date: new Date(t*1000).toISOString().slice(0,10),
      open: d.o[i], high: d.h[i], low: d.l[i], close: d.c[i], volume: d.v[i],
    }))
  },

  async getNews(symbol) {
    const to = new Date().toISOString().slice(0,10)
    const from = new Date(Date.now()-7*86400e3).toISOString().slice(0,10)
    const d: any[] = await get('/company-news', { symbol, from, to })
    return d.slice(0,20).map(n => ({
      headline: n.headline, source: n.source, url: n.url, publishedAt: new Date(n.datetime*1000),
    }))
  },

  async searchSymbol(q) {
    const d: any = await get('/search', { q })
    return d.result.filter((r: any) => !r.symbol.includes('.'))
      .slice(0,8).map((r: any) => ({ symbol: r.symbol, name: r.description }))
  },
}
```

### 14.6 `lib/providers/kis.ts` (M4 — 토큰 관리가 절반)

```ts
import { db } from '../db'
import { kisTokens } from '../db/schema'
import { desc } from 'drizzle-orm'

const BASE = process.env.KIS_ENV === 'real'
  ? 'https://openapi.koreainvestment.com:9443'
  : 'https://openapivts.koreainvestment.com:29443'   // 모의투자

// ── 토큰: DB 저장, 만료 10분 전에만 재발급. 매 요청 발급 시 차단됨! ──
async function getToken(): Promise<string> {
  const cur = await db.query.kisTokens.findFirst({ orderBy: desc(kisTokens.id) })
  if (cur && cur.expiresAt.getTime() - Date.now() > 10*60*1000) return cur.accessToken

  const res = await fetch(`${BASE}/oauth2/tokenP`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials',
      appkey: process.env.KIS_APP_KEY, appsecret: process.env.KIS_APP_SECRET }),
  })
  const d = await res.json()
  if (!d.access_token) throw new Error(`KIS token 실패: ${JSON.stringify(d)}`)
  await db.insert(kisTokens).values({
    accessToken: d.access_token,
    expiresAt: new Date(Date.now() + d.expires_in * 1000),
  })
  return d.access_token
}

async function kisGet(path: string, trId: string, params: Record<string,string>) {
  const token = await getToken()
  const qs = new URLSearchParams(params)
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: {
      authorization: `Bearer ${token}`,
      appkey: process.env.KIS_APP_KEY!, appsecret: process.env.KIS_APP_SECRET!,
      tr_id: trId, custtype: 'P',
    }, cache: 'no-store',
  })
  const d = await res.json()
  if (d.rt_cd !== '0') throw new Error(`KIS ${trId}: ${d.msg1}`)
  return d
}

export const kis: MarketDataProvider = {
  market: 'KR',

  async getQuote(code) {   // code는 "005930"
    const d = await kisGet('/uapi/domestic-stock/v1/quotations/inquire-price',
      'FHKST01010100', { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: code })
    const o = d.output
    return { symbol: code, market: 'KR', price: +o.stck_prpr,
             changePct: +o.prdy_ctrt, currency: 'KRW', asOf: new Date() }
  },

  async getFundamentals(code) {
    // 시세 응답에 지표가 같이 옴 — 별도 호출 불필요 (기획서 §4.4 지름길)
    const d = await kisGet('/uapi/domestic-stock/v1/quotations/inquire-price',
      'FHKST01010100', { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: code })
    const o = d.output
    return { per: +o.per || undefined, pbr: +o.pbr || undefined, eps: +o.eps || undefined,
             marketCap: +o.hts_avls * 1e8 || undefined,       // 억원 단위 주의
             w52High: +o.w52_hgpr || undefined, w52Low: +o.w52_lwpr || undefined }
  },

  async getDailyCandles(code, days) {
    const end = new Date(), start = new Date(Date.now() - days*86400e3)
    const fmt = (d: Date) => d.toISOString().slice(0,10).replaceAll('-','')
    const d = await kisGet('/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice',
      'FHKST03010100', {
        FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: code,
        FID_INPUT_DATE_1: fmt(start), FID_INPUT_DATE_2: fmt(end),
        FID_PERIOD_DIV_CODE: 'D', FID_ORG_ADJ_PRC: '0',
      })
    return d.output2.filter((r: any) => r.stck_bsop_date).map((r: any) => ({
      date: `${r.stck_bsop_date.slice(0,4)}-${r.stck_bsop_date.slice(4,6)}-${r.stck_bsop_date.slice(6)}`,
      open: +r.stck_oprc, high: +r.stck_hgpr, low: +r.stck_lwpr,
      close: +r.stck_clpr, volume: +r.acml_vol,
    })).reverse()
  },

  async getNews() { return [] },      // KR 뉴스는 NaverNewsProvider 담당
  async searchSymbol(q) {
    // KRX 종목 마스터를 stocks_master 테이블에 1회 적재 후 ILIKE 검색 (M4에서 스크립트 작성)
    return db.execute(sql`SELECT code AS symbol, name FROM stocks_master WHERE name ILIKE ${'%'+q+'%'} LIMIT 8`)
  },
}
```

`lib/providers/naver-news.ts` (M5):
```ts
export async function getKrNews(stockName: string) {
  const res = await fetch(
    `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(stockName)}&display=20&sort=date`,
    { headers: { 'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
                 'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET! } })
  const d = await res.json()
  return d.items
    .filter((n: any) => n.title.includes(stockName))          // 동명 노이즈 제거
    .map((n: any) => ({
      headline: n.title.replace(/<\/?b>|&quot;/g, ''),         // 네이버는 태그 포함해서 줌
      source: '네이버뉴스', url: n.originallink || n.link,
      publishedAt: new Date(n.pubDate),
    }))
}
```

`lib/providers/factory.ts`:
```ts
import { finnhub } from './finnhub'
import { kis } from './kis'

export function parseSymbol(full: string) {       // "KR:005930" → { market, code }
  const [market, code] = full.split(':')
  return { market: market as 'US'|'KR', code }
}
export function providerFor(full: string) {
  return parseSymbol(full).market === 'US' ? finnhub : kis
}
```

### 14.7 `config/rules.json` + `lib/rules.ts` (M7)

```ts
// lib/rules.ts
import rules from '../../config/rules.json'
import type { Fundamentals } from './providers/types'

type Op = '<' | '>' | '<=' | '>='
const ops: Record<Op, (a: number, b: number) => boolean> =
  { '<': (a,b)=>a<b, '>': (a,b)=>a>b, '<=': (a,b)=>a<=b, '>=': (a,b)=>a>=b }

export function evaluateRules(f: Fundamentals) {
  return rules.map(rule => {
    const details = rule.rules.map(r => {
      const value = f[r.metric as keyof Fundamentals]
      const passed = value != null && ops[r.op as Op](value, r.value)
      return { metric: r.metric, value, target: `${r.op} ${r.value}`, passed }
    })
    return { name: rule.name, passed: details.every(d => d.passed), details }
  })
}
// vitest로 경계값 테스트 작성: PER 정확히 15일 때, 값이 없을 때(undefined) 등
```

### 14.8 `lib/ai/analyze.ts` (M7 — 핵심 파이프라인)

```ts
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const ResultSchema = z.object({
  verdict: z.enum(['매수검토','관망','회피']),
  confidence: z.number().min(1).max(5),
  reasons: z.array(z.string()),
  cited_notes: z.array(z.string()),
  risks: z.array(z.string()),
  challenges: z.array(z.string()),
})

export async function runAnalysis(ctx: {
  stock: { symbol: string; name: string }, quote: any, fundamentals: any,
  ruleResults: any[], newsItems: any[], notes: { id: number; title: string; content: string }[],
}) {
  const client = new Anthropic()

  const system = `너는 나의 투자 스터디 파트너다. 아래 "나의 투자 원칙"을 최우선 판단 기준으로 삼아라.
원칙과 데이터가 충돌하면 명시적으로 지적하라.
나의 원칙이 검증된 투자 지식과 상충하거나 오해·과잉일반화로 보이면,
verdict은 원칙대로 내리되 challenges에 근거와 함께 이의를 제기하라.
제공된 데이터에 없는 수치를 만들어내지 마라. 노트 인용 시 [note-ID] 형식을 지켜라.
이것은 확정적 투자 조언이 아닌 학습용 분석이다.

## 나의 투자 원칙
${ctx.notes.length ? ctx.notes.map(n => `[note-${n.id}] ${n.title}\n${n.content}`).join('\n\n') : '(등록된 원칙 없음 — 일반적 기준으로 분석하되 그 사실을 명시)'}`

  const user = `## 종목: ${ctx.stock.name} (${ctx.stock.symbol})
현재가 ${ctx.quote.price} (${ctx.quote.changePct}%)
## 재무 지표
${JSON.stringify(ctx.fundamentals)}
## 스크리닝 룰 평가
${JSON.stringify(ctx.ruleResults)}
## 최근 뉴스
${ctx.newsItems.slice(0,10).map(n => `- ${n.headline} (${n.source})`).join('\n')}

위 데이터를 나의 원칙으로 평가해 submit_analysis 도구로 제출하라.`

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-5', max_tokens: 2000,
    system, messages: [{ role: 'user', content: user }],
    tools: [{
      name: 'submit_analysis', description: '분석 결과 제출',
      input_schema: {
        type: 'object',
        properties: {
          verdict: { enum: ['매수검토','관망','회피'] },
          confidence: { type: 'integer', minimum: 1, maximum: 5 },
          reasons: { type: 'array', items: { type: 'string' } },
          cited_notes: { type: 'array', items: { type: 'string' } },
          risks: { type: 'array', items: { type: 'string' } },
          challenges: { type: 'array', items: { type: 'string' },
            description: '사용자 원칙 자체에 대한 반론. 없으면 빈 배열' },
        },
        required: ['verdict','confidence','reasons','cited_notes','risks','challenges'],
      },
    }],
    tool_choice: { type: 'tool', name: 'submit_analysis' },   // JSON 강제 — 파싱 실패 원천 차단
  })

  const toolUse = msg.content.find(c => c.type === 'tool_use')
  return ResultSchema.parse((toolUse as any).input)
}
```

### 14.9 `app/api/analyze/route.ts` (M7 — 전체 조립)

```ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { analyses } from '@/lib/db/schema'
import { providerFor, parseSymbol } from '@/lib/providers/factory'
import { getQuoteCached } from '@/lib/cache'
import { evaluateRules } from '@/lib/rules'
import { findRelevantNotes } from '@/lib/db/queries/notes'
import { runAnalysis } from '@/lib/ai/analyze'

export async function POST(req: Request) {
  const { symbol } = await req.json()               // "KR:005930"
  const { code } = parseSymbol(symbol)
  const p = providerFor(symbol)

  const stock = await db.query.stocks.findFirst({ where: eq(stocks.symbol, symbol) })
  if (!stock) return NextResponse.json({ error: 'not in watchlist' }, { status: 404 })

  // 순차 수집 (KIS 초당 제한 대비 병렬 금지)
  const quote = await getQuoteCached(symbol, () => p.getQuote(code))
  const fundamentals = await getFundamentalsCached(symbol, () => p.getFundamentals(code))
  const newsItems = await getNewsCached(symbol, stock)
  const notes = await findRelevantNotes(symbol, 5)
  const ruleResults = evaluateRules(fundamentals)

  const result = await runAnalysis({ stock, quote, fundamentals, ruleResults, newsItems, notes })

  const [saved] = await db.insert(analyses).values({
    stockSymbol: symbol, ...result,
    citedNoteIds: result.cited_notes.map(s => +s.replace('note-','')).filter(Number.isFinite),
    priceAtAnalysis: quote.price, trigger: 'manual',
  }).returning()

  return NextResponse.json(saved)
}
```

### 14.10 프론트 패턴 (M2~M3 공통)

Server Component로 "쿼리 → 렌더"를 한 파일에서. API Route는 mutation(추가/삭제/분석)에만 사용:

```tsx
// app/page.tsx (대시보드)
import { getWatchlistWithQuotes } from '@/lib/db/queries/stocks'
import { StockCard } from '@/components/stock-card'

export const dynamic = 'force-dynamic'   // 캐시된 HTML 방지, 항상 fresh 조회

export default async function Dashboard() {
  const items = await getWatchlistWithQuotes()   // 내부에서 TTL 캐시 경유
  if (items.length === 0) return <EmptyState />  // 스타터 종목 칩
  return <div className="grid md:grid-cols-3 gap-3">
    {items.map(s => <StockCard key={s.symbol} stock={s} />)}
  </div>
}
```

```ts
// mutation은 Server Action이 더 단순 (API Route 대안)
// app/actions.ts
'use server'
import { revalidatePath } from 'next/cache'

export async function addStock(symbol: string, name: string, market: 'US'|'KR') {
  await db.insert(stocks).values({ symbol, name, market }).onConflictDoNothing()
  revalidatePath('/')
}
```

### 14.11 API 엔드포인트 전체 목록

| 경로 | 방식 | 역할 | 마일스톤 |
|---|---|---|---|
| Server Action `addStock`/`removeStock` | - | watchlist 관리 | M2 |
| `/api/search?q=` | GET | 종목 검색 (양 시장 병합) | M2 |
| `/api/candles?symbol=&days=` | GET | 차트 데이터 (캐시 경유) | M3 |
| Server Action `saveNote`/`deleteNote` | - | 노트 CRUD | M6 |
| `/api/analyze` | POST | AI 분석 실행 | M7 |
| 페이지 데이터 (시세·지표·뉴스) | Server Component 직접 조회 | API 불필요 | 전체 |

## 15. 세션 진행 팁

- 각 세션 시작: 이 문서의 해당 M 체크리스트 확인 / 끝: 체크 표시 + 커밋
- 막히면 그 M의 DoD만 사수하고 나머지는 다음 세션으로
- M4(KIS)가 제일 험난함 — 세션 2개를 온전히 배정한 이유. 문서는 KIS Developers 포털 + GitHub `koreainvestment/open-trading-api` 예제 참고
