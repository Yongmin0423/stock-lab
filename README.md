# 주식갈피

내 투자 공부가 AI의 판단 기준이 되는 개인 리서치 대시보드.
(기획서·구현계획서·디자인 목업은 상위 폴더 참고)

## 실행 방법

```bash
pnpm install
pnpm dev   # http://localhost:3000
```

> pnpm이 없다면: `npm i -g pnpm`

API 키 없이도 **모의 데이터 모드**로 바로 실행됩니다.

## 환경 변수 (.env.local)

| 변수 | 발급처 | 없으면 |
|---|---|---|
| `DATABASE_URL` | supabase.com → Connect → ORMs → Transaction pooler URI | DB 설정 안내 화면 |
| `FINNHUB_API_KEY` | finnhub.io 무료 가입 → Dashboard의 API Key | 시세가 모의 데이터 |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys (크레딧 충전 필요, 최소 $5) | AI 분석이 모의 모드 |
| `KIS_APP_KEY` / `KIS_APP_SECRET` / `KIS_ENV=paper` | KIS Developers 앱키 (M4) | 한국 주식 불가 |
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | developers.naver.com 앱 등록 → 검색 API (M4) | 한국 뉴스 불가 |

키를 바꾸면 **dev 서버 재시작** 필수 (`Ctrl+C` → `pnpm dev`).

## 진행 상황 (MVP_구현계획서.md 기준)

- [x] M1: 셋업 + Finnhub 시세 → 대시보드 카드
- [x] M2: Supabase DB + watchlist CRUD + 검색(⌘K) + 스타터 칩
- [x] M3: 종목 상세 (캔들 차트 + 재무지표 8종, Stooq 폴백)
- [ ] M4: KIS Provider (한국 주식)
- [x] M5: 뉴스 (상세 섹션 + /news 통합 피드, 1h 캐시)
- [x] M6: 지식 노트 (마크다운 에디터 + 태그 필터 + 관련 종목 연결)
- [x] M7: 계산식 + AI 분석 (키 없으면 모의 모드)
- [x] P2: 계산식 편집 UI(/settings) + 노트 AI 검토
- [x] P2: 데일리 브리핑 v1 (수동 생성 — cron은 M8에서)
- [x] M4 선구현: KIS Provider 전체 (키 연결만 남음 — docs/연결_가이드.md)
- [x] M8 준비물: Basic Auth + PWA + Vercel cron (배포만 남음)
- [x] 발굴: 유니버스 스크리닝 + AI 적합도 + 노트→룰 변환
- [x] 노트 백업(.md 다운로드)

**→ 남은 연결 작업은 `docs/연결_가이드.md` 참고**
- [ ] M8: 배포

## 구조

```
src/
  app/            # 페이지 (Server Component가 기본)
  components/     # UI 컴포넌트
  lib/
    providers/    # 시장 데이터 소스 추상화 (finnhub, 이후 kis)
    format.ts     # 통화/등락 포맷 (상승=빨강, 하락=파랑)
    market-hours.ts
```

## 검색 노출 설정

- 기본 대표 주소는 `https://stock-lab-ndgw.vercel.app`입니다. 도메인을 바꾸면 배포 환경에 `SITE_URL=https://실제운영도메인`을 지정하고 재배포합니다. 경로 없이 대표 도메인 하나를 사용합니다.
- 대표 주소는 canonical·Open Graph·사이트맵에 동일하게 사용합니다.
- `/sitemap.xml`에는 주요 공개 페이지, 등록된 관심 종목, 공개 미리보기가 있는 노트와 저장된 브리핑을 포함합니다.
- 배포 후 Google Search Console·네이버 서치어드바이저에서 소유권을 확인하고 사이트맵을 제출합니다.
- 2026-10-28: Google Search Console 소유권 확인 및 사이트맵 제출을 완료했고 Google이 URL 124개를 처리했습니다. 홈 실시간 검사도 ‘등록할 수 있음’으로 통과했습니다. 홈은 아직 ‘발견됨 — 현재 색인이 생성되지 않음’ 상태이며, 수동 색인 요청은 Google 일일 할당량 초과로 접수되지 않아 다음 날 이후 재요청이 필요합니다. 네이버 등록은 별도입니다.
- 홈 소개·공개 콘텐츠 링크·WebSite 구조화 데이터는 시세 API 완료를 기다리지 않고 첫 HTML에 포함됩니다. 소유권 확인을 유지하려면 `src/app/layout.tsx`의 Google 인증 메타데이터를 삭제하지 않습니다.
- 로그인·설정·노트 작성 화면은 `noindex`이며, 노트 메타 설명도 공개 미리보기 범위만 사용합니다.
- Cache Components 스트리밍 이후 없는 종목을 판별하면 HTTP 200일 수 있지만, `notFound()`의 `noindex`로 색인에서 제외합니다.

## Clarity 방문 분석

- `z45hin4a0v` 프로젝트에 연결합니다. 공개 프로젝트 ID는 `NEXT_PUBLIC_CLARITY_PROJECT_ID`로 변경할 수 있으며 비밀 토큰은 필요하지 않습니다.
- 공통 하단의 동의 안내에서 허용한 경우에만 로드합니다. `environment` 태그로 development/production을 구분합니다.
- 화면 텍스트는 기본 마스킹하고 로고·고정 메뉴만 표시합니다. 입력값·노트·질문을 포함한 본문은 가립니다. 마스킹은 URL을 가리지 않으므로 주소/검색어에는 민감정보를 넣지 않습니다.
- 선택 전·거절 상태에서는 Clarity를 로드하지 않습니다. 허용한 경우 Consent V2의 분석 쿠키만 granted로 전달하고 광고 쿠키는 denied로 유지합니다. 선택은 브라우저 localStorage에 저장하며, 하단의 ‘Clarity 방문 분석 설정’에서 바꿀 수 있습니다. 철회하면 쿠키 동의를 취소하고 수집을 중단합니다. Sentry 설정은 별도로 유지됩니다.
- Clarity의 레코딩/대시보드에서 테스트 기록을 확인합니다. 처음 데이터가 표시되기까지 최대 2시간이 걸릴 수 있습니다.

## Sentry 오류 수집

- Sentry 조직/프로젝트: `youngmin/jusik-galpi`. 공개 DSN이 기본 연결돼 있으며 `NEXT_PUBLIC_SENTRY_DSN`으로 변경할 수 있습니다.
- 브라우저·서버·Edge 오류, 수동 브리핑과 Cron의 처리된 실패를 수집합니다. 성능 추적은 개발 100%, 운영 10%로 샘플링합니다.
- 오류의 쿠키·헤더·요청 본문·사용자 정보·breadcrumbs·extra 및 span 속성은 전송 전에 제거합니다. 로그 수집은 활성화하지 않습니다.
- Session Replay는 개발 세션 100%, 운영 세션 10%, 오류 발생 시 100%를 수집 대상으로 설정합니다. 화면 텍스트·입력값은 마스킹하고 미디어는 차단하며, 요청/응답 본문과 콘솔 기록은 수집하지 않습니다. URL과 클릭·이동 등 기본 동작 정보는 기록됩니다.
- 확인: 개발 서버에서 화면 이동·클릭을 한 뒤 Sentry의 Explore → Replays에서 development 환경을 조회합니다. 새 브라우저 오류가 발생하면 오류 상세의 Replays에서도 연결된 기록을 볼 수 있습니다.
- Vercel 환경/커밋을 오류의 environment/release로 구분합니다. 로컬 환경에서는 development로 표시됩니다.
- 운영 소스맵 자동 업로드는 `SENTRY_AUTH_TOKEN` 등록 후 활성화됩니다. 소스 코드가 포함될 수 있어 업로드를 승인한 뒤 Vercel에 비밀 토큰을 등록합니다. 이 토큰은 `NEXT_PUBLIC_` 접두어를 붙이지 않습니다.
