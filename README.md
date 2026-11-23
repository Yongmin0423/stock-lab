# 주식갈피

> 내가 정리한 투자 원칙으로 종목을 살펴보는 개인 주식 리서치 대시보드

관심 종목의 **시세·재무·뉴스**를 한곳에서 확인하고, Markdown으로 정리한 투자 원칙을 **AI 분석과 종목 발굴**에 활용합니다. 브리핑을 저장해 이전에 살펴본 내용과 비교할 수 있습니다.

**Next.js · TypeScript · Supabase · Drizzle ORM · Cloudflare Workers**

## 무엇을 할 수 있나요?

| 기능 | 할 수 있는 일 |
| --- | --- |
| 관심 종목 | 종목을 검색해 관심 목록에 추가하고 캔들 차트와 재무지표를 확인합니다. |
| 뉴스 | 종목별 뉴스와 관심 목록의 통합 뉴스 피드를 확인합니다. |
| 투자 노트 | Markdown 노트를 작성하고 태그와 관련 종목을 연결합니다. 노트는 `.md`로 내려받을 수 있습니다. |
| AI 분석과 종목 발굴 | 노트에서 스크리닝 규칙을 만들고, 재무 조건을 통과한 후보를 투자 원칙에 비춰 살펴봅니다. |
| 데일리 브리핑 | 시장 요약과 관심 종목의 주요 변화를 정리하고 이전 브리핑과 수치를 비교합니다. |

## 로컬에서 시작하기

저장소에 지정된 pnpm 버전은 **11.10.0**입니다.

```bash
git clone https://github.com/Yongmin0423/stock-lab.git
cd stock-lab
pnpm install --frozen-lockfile
pnpm dev
```

브라우저에서 [localhost:3000](http://localhost:3000)을 열면 됩니다. 시세와 AI는 키 없이 모의 데이터로 확인할 수 있습니다. 관심 목록·노트·브리핑처럼 저장이 필요한 기능에는 Supabase 연결이 필요합니다.

### 실제 데이터와 AI 연결

[환경 변수 예시](.env.local.example)를 `.env.local`로 복사한 뒤 사용할 기능의 키를 채웁니다. 값을 바꾼 뒤에는 개발 서버를 재시작합니다.

| 설정 | 연결되는 기능 |
| --- | --- |
| `DATABASE_URL` | Supabase PostgreSQL과 저장 기능 |
| `FINNHUB_API_KEY` | 미국 주식 시세·재무·뉴스 |
| `ANTHROPIC_API_KEY` 또는 `OPENAI_API_KEY` | AI 분석·노트 검토·브리핑·종목 발굴 |
| `KIS_APP_KEY`, `KIS_APP_SECRET`, `KIS_ENV` | 한국 주식 시세와 차트 |
| `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | 한국 종목 뉴스 |
| `DART_API_KEY` | 한국 종목 재무지표 보강 |

DB 설정과 한국 종목 데이터 적재는 [서비스 연결 가이드](docs/연결_가이드.md), 리서치 Worker 실행과 배포는 [Cloudflare Worker 가이드](docs/Cloudflare_Worker_연결.md)를 참고하세요.

## 코드와 문서

| 경로 | 내용 |
| --- | --- |
| [`src/app`](src/app) | 대시보드, 종목 상세, 뉴스, 노트, 브리핑, 발굴 화면 |
| [`src/components`](src/components) | 차트와 화면 컴포넌트 |
| [`src/lib`](src/lib) | 시장 데이터 공급자와 리서치 로직 |
| [`workers/research`](workers/research) | Cloudflare 리서치 Worker |

- [프로젝트 기획](docs/주식_리서치_대시보드_기획서.md) · [MVP 구현 계획](docs/MVP_구현계획서.md) · [디자인 목업](docs/디자인_목업.html)
- [브리핑 비교](docs/브리핑_변화_비교.md) · [테스트 흐름](docs/테스트_플로우.md) · [변경 이력](docs/CHANGELOG.md)

<details>
<summary>배포 및 운영 설정</summary>

### 검색 노출 설정

- 기본 대표 주소는 `https://stock-lab-ndgw.vercel.app`입니다. 도메인을 바꾸면 배포 환경에 `SITE_URL=https://실제운영도메인`을 지정하고 재배포합니다. 경로 없이 대표 도메인 하나를 사용합니다.
- 대표 주소는 canonical·Open Graph·사이트맵에 동일하게 사용합니다.
- `/sitemap.xml`에는 주요 공개 페이지, 등록된 관심 종목, 공개 미리보기가 있는 노트와 저장된 브리핑을 포함합니다.
- 배포 후 Google Search Console·네이버 서치어드바이저에서 소유권을 확인하고 사이트맵을 제출합니다.
- 홈 소개·공개 콘텐츠 링크·WebSite 구조화 데이터는 시세 API 완료를 기다리지 않고 첫 HTML에 포함됩니다. 소유권 확인을 유지하려면 `src/app/layout.tsx`의 Google 인증 메타데이터를 삭제하지 않습니다.
- 로그인·설정·노트 작성 화면은 `noindex`이며, 노트 메타 설명도 공개 미리보기 범위만 사용합니다.
- Cache Components 스트리밍 이후 없는 종목을 판별하면 HTTP 200일 수 있지만, `notFound()`의 `noindex`로 색인에서 제외합니다.

### Clarity 방문 분석

- `z45hin4a0v` 프로젝트에 연결합니다. 공개 프로젝트 ID는 `NEXT_PUBLIC_CLARITY_PROJECT_ID`로 변경할 수 있으며 비밀 토큰은 필요하지 않습니다.
- 공통 하단의 동의 안내에서 허용한 경우에만 로드합니다. `environment` 태그로 development/production을 구분합니다.
- 화면 텍스트는 기본 마스킹하고 로고·고정 메뉴만 표시합니다. 입력값·노트·질문을 포함한 본문은 가립니다. 마스킹은 URL을 가리지 않으므로 주소/검색어에는 민감정보를 넣지 않습니다.
- 선택 전·거절 상태에서는 Clarity를 로드하지 않습니다. 허용한 경우 Consent V2의 분석 쿠키만 granted로 전달하고 광고 쿠키는 denied로 유지합니다. 선택은 브라우저 localStorage에 저장하며, 하단의 ‘Clarity 방문 분석 설정’에서 바꿀 수 있습니다. 철회하면 쿠키 동의를 취소하고 수집을 중단합니다. Sentry 설정은 별도로 유지됩니다.
- Clarity의 레코딩/대시보드에서 테스트 기록을 확인합니다. 처음 데이터가 표시되기까지 최대 2시간이 걸릴 수 있습니다.

### Sentry 오류 수집

- Sentry 조직/프로젝트: `youngmin/jusik-galpi`. 공개 DSN이 기본 연결돼 있으며 `NEXT_PUBLIC_SENTRY_DSN`으로 변경할 수 있습니다.
- 브라우저·서버·Edge 오류, 수동 브리핑과 Cron의 처리된 실패를 수집합니다. 성능 추적은 개발 100%, 운영 10%로 샘플링합니다.
- 오류의 쿠키·헤더·요청 본문·사용자 정보·breadcrumbs·extra 및 span 속성은 전송 전에 제거합니다. 로그 수집은 활성화하지 않습니다.
- Session Replay는 개발 세션 100%, 운영 세션 10%, 오류 발생 시 100%를 수집 대상으로 설정합니다. 화면 텍스트·입력값은 마스킹하고 미디어는 차단하며, 요청/응답 본문과 콘솔 기록은 수집하지 않습니다. URL과 클릭·이동 등 기본 동작 정보는 기록됩니다.
- 확인: 개발 서버에서 화면 이동·클릭을 한 뒤 Sentry의 Explore → Replays에서 development 환경을 조회합니다. 새 브라우저 오류가 발생하면 오류 상세의 Replays에서도 연결된 기록을 볼 수 있습니다.
- Vercel 환경/커밋을 오류의 environment/release로 구분합니다. 로컬 환경에서는 development로 표시됩니다.
- 운영 소스맵 자동 업로드는 `SENTRY_AUTH_TOKEN` 등록 후 활성화됩니다. 소스 코드가 포함될 수 있어 업로드를 승인한 뒤 Vercel에 비밀 토큰을 등록합니다. 이 토큰은 `NEXT_PUBLIC_` 접두어를 붙이지 않습니다.

</details>
