# 주식갈피 (stock-lab) 작업 규칙

투자 판단에 쓰는 개인 주식 리서치 서비스다. **틀린 숫자를 그럴듯하게 보여주는 것은 오류를 보여주는 것보다 나쁘다.** 아래 규칙은 이 프로젝트를 운영하며 실제로 겪은 문제에서 나왔다. 근거는 `docs/CHANGELOG.md`에 있다.

## 프로젝트 구조

- `src/app`: 화면과 API Route. 데이터 변경은 Server Actions(`src/app/actions.ts`)를 먼저 고려한다.
- `src/lib/providers`: 외부 시세·재무·뉴스 공급자(Finnhub, KIS, DART, 네이버)
- `src/lib/cache.ts`: 외부 호출의 관문. 화면이나 API에서 공급자를 직접 부르지 말고 여기를 거친다.
- `src/lib/ai`: LLM 호출. 반드시 `llm.ts`의 `llmJson`과 tier(`smart`·`fast`·`briefing`)를 사용한다.
- `src/lib/db`: Drizzle 스키마와 쿼리
- `workers/research`: Cloudflare 리서치 Worker. 수치 비교만 하고, AI 작성은 Next.js 쪽에서 한다.
- 기획과 결정 기록은 `docs/`에 있다. 큰 기능은 기획서나 계획서를 먼저 읽는다.

## 명령어

- 패키지 매니저는 pnpm 11.10.0이다. npm이나 yarn을 쓰지 않는다.
- 개발: `pnpm dev` / 빌드: `pnpm build` / 린트: `pnpm lint`
- 테스트: `node tests/<이름>.test.mjs` (Node가 `.ts`를 직접 불러온다). 묶음 명령은 `pnpm test:briefing`, `pnpm test:research*`.
- Worker: `pnpm worker:typecheck` → `pnpm worker:dry-run` → `pnpm worker:deploy`
- `pnpm db:push`는 drizzle-kit 버그로 쓰지 않는다. 스키마를 바꾸면 `schema.ts`를 고치고, 실행할 ALTER SQL을 사용자에게 제시한다.

## 데이터 규칙

- **모의·합성 데이터로 폴백하지 않는다.** API 키가 없거나 조회에 실패하면 빈 상태와 실패 사유를 보여준다. 임의 가격, 고정 재무지표, 합성 캔들은 만들지 않는다.
- 캐시된 값을 보여줄 때는 기준 시각과 캐시 사용 여부를 함께 표시한다.
- 외부 API 호출에는 모두 `AbortSignal.timeout`을 건다.
- 날짜와 시각은 `Asia/Seoul`을 명시해서 포맷한다. 서버 기본값은 UTC다.
- 종목 심볼은 항상 `US:AAPL`, `KR:005930`처럼 시장 접두어를 붙인 형식을 쓰고, 해석은 `parseSymbol`로 한다.

## AI(LLM) 출력 규칙

- LLM 응답은 Zod 스키마로 검증하고 나서 저장한다. 형식이 틀리면 저장하지 않는다.
- LLM이 돌려준 종목은 입력으로 준 후보 목록과 대조한다. 목록 밖 종목, 중복 종목, 누락된 종목은 거부하고, 심볼은 후보의 정식 심볼로 바꾼다.
- 출력 한도에 걸려 잘린 응답은 JSON 파싱 전에 거부한다. 오류에는 모델, 종료 사유, 토큰 수만 남기고 프롬프트나 본문은 남기지 않는다.
- AI 비용이 드는 실행과 데이터 변경은 운영자 전용이다. 새 API나 Server Action에는 `requireOperator` / `operatorApiError`를 적용한다.

## 성능 변경 규칙

- Supabase는 동시 쿼리에 약하다(`statement_timeout` 이력이 있다). DB 조회 병렬화는 기본값이 아니다. 하려면 이유를 쓰고 운영 빌드에서 확인한다.
- 루프 안에서 쿼리를 반복하지 않는다. 일괄 INSERT를 할 때는 `ON CONFLICT` 키 기준으로 중복을 먼저 제거한다.
- 홈, 캐시, Suspense 구조를 바꾸면 `tests/dashboard-production.test.mjs`(프로덕션 서버 재시작 후 반복 요청)를 통과해야 한다. 개발 서버에서 되는 것으로는 부족하다.

## 검증과 완료 기준

- "해결됐다"는 실제로 실행해 확인한 것만 말한다. 확인하지 못한 것은 "미확인", 근거가 부족한 원인은 "추정"이라고 쓴다.
- 버그를 고치면 재현하는 회귀 테스트를 `tests/`에 추가한다.
- 고친 뒤에도 같은 문제가 재현되면 이전 판단이 틀렸다고 기록하고, 계속 덧대기보다 마지막으로 정상이던 구현으로 되돌리는 것을 먼저 검토한다.
- 운영 배포, 운영 DB 쓰기, Worker 배포, 외부 서비스 설정 변경은 사용자에게 먼저 묻는다.

## 변경 기록

모든 의미 있는 변경은 `docs/CHANGELOG.md` 맨 위에 날짜별로 추가한다.

```md
### YYYY-MM-DD

- **변경 요약** — `바꾼 파일 경로`
  - 원인/이유: 무엇이 문제였고 어떻게 확인했는가
  - 수정: 무엇을 바꿨고 무엇은 일부러 유지했는가
  - 검증: 실행한 테스트와 확인 결과. 확인하지 못한 항목은 따로 적는다
```

## 개인정보와 비밀값

- 키와 토큰은 `.env.local`, `.dev.vars`에만 둔다. 비밀값에 `NEXT_PUBLIC_` 접두어를 붙이지 않는다.
- Sentry와 Clarity로 보내는 데이터에서 쿠키, 헤더, 요청 본문, 노트 본문을 빼는 설정을 유지한다. URL과 쿼리 문자열에 민감정보를 넣지 않는다.
- `src/app/layout.tsx`의 Google 소유권 인증 메타데이터는 지우지 않는다.
