# Cloudflare 리서치 Worker 연결

구현 단계: Worker 연결 + [브리핑 수치 비교](브리핑_변화_비교.md). 대화 저장·Worker의 AI 호출·노트 전송은 후속 단계다.

## 배포 상태 (2026-11-02)

- Worker: `stock-lab-research`
- 주소: `https://stock-lab-research.yym21345.workers.dev`
- 최신 버전: `0c45af25-e988-448e-a5a7-ed1b77ebfef0` (브리핑 비교 추가)
- 연결 시크릿을 등록했고, 실제 배포 주소에서 비인증 요청 401·서명 요청 정상 응답을 확인했다.
- 로컬 `.env.local`에 주소와 연결 시크릿을 반영했다. 서버 재시작 후 설정 화면에서 확인할 수 있다.
- Vercel 환경 변수 등록과 이 브랜치의 앱 배포는 아직 수행하지 않았다.

## 연결 경로

```text
설정 → 연결 확인
  → GET /api/research/health (Next.js 운영자 인증)
  → GET /health (Worker 서비스 인증)
  → 서비스명·프로토콜 버전·요청 ID·확인 시각 반환
```

- Worker는 `workers/research`에 두고 Next.js와 별도로 실행·배포한다.
- Next.js가 서비스 시크릿으로 HMAC-SHA256 서명을 생성한다. Worker는 서명과 요청 시각(±60초)을 검증한다.
- 브라우저에는 서비스 시크릿을 보내지 않으며 로그인 쿠키도 Worker에 전달하지 않는다.
- 이번 요청에는 투자 노트·대화·시세 등 운영 데이터를 포함하지 않는다.
- 이 인증 계약은 읽기 전용 `/health`에만 사용한다. 시간 범위 내 동일 요청의 재전송은 허용한다. 작업 생성 API를 추가할 때는 본문 서명·소유자 식별·영속적인 중복 방지를 별도로 구현한다.
- Next.js의 전체 연결 제한은 5초다. 리다이렉트는 거부하고 응답 크기·서비스명·프로토콜 버전·요청 ID를 검사한다.
- 미설정은 503, Worker 인증/응답/통신 오류는 502, 시간 초과는 504로 반환한다. upstream 본문과 시크릿은 오류 메시지에 포함하지 않는다.

## 로컬 실행

1. 프로젝트 루트에서 `pnpm install`을 실행한다. Node.js 24 이상을 권장한다(테스트에서 TypeScript를 직접 실행).
2. `workers/research/.dev.vars.example`을 같은 폴더의 `.dev.vars`로 복사한다.
3. 비밀번호 관리자 등으로 충분히 긴 난수(32자 이상)를 생성하고, 아래 두 위치에 같은 시크릿을 설정한다. `AUTH_SECRET`이나 Cloudflare API 토큰을 재사용하지 않는다.

Next.js 루트 `.env.local`:

```dotenv
RESEARCH_WORKER_URL=http://127.0.0.1:8787
RESEARCH_WORKER_SECRET=여기에_생성한_32자_이상_난수
```

Worker `workers/research/.dev.vars`:

```dotenv
RESEARCH_WORKER_SECRET=위와_같은_난수
```

4. 터미널 두 개에서 각각 실행한다.

```bash
pnpm worker:dev
```

```bash
pnpm dev
```

5. 기존 운영자 계정으로 로그인하고 `/settings`에서 **리서치 서버 연결 → 연결 확인**을 누른다. DB 설정이 없어도 이 연결 확인 영역은 사용할 수 있다.

설정 등록 여부와 실제 연결 성공은 구분해서 표시한다. Worker URL·시크릿을 바꾸면 Next.js와 Worker를 다시 시작한다. 로컬 HTTP는 개발 환경의 loopback 주소에서만 허용한다.

## Cloudflare와 Vercel 배포

1. `pnpm exec wrangler login`으로 사용할 Cloudflare 계정에 로그인한다.
2. `pnpm worker:typecheck`, `pnpm worker:dry-run`으로 사전 검증한다.
3. `pnpm worker:deploy`로 Worker를 배포한다. 필요한 경우 `workers/research/wrangler.jsonc`의 Worker 이름을 계정에 맞게 변경한다.
4. 아래 명령의 대화형 입력에 서비스 시크릿을 등록한다. 시크릿을 명령 인수나 Git에 넣지 않는다. 최초 배포 후 시크릿 등록 전에는 Worker가 503을 반환한다.

```bash
pnpm exec wrangler secret put RESEARCH_WORKER_SECRET --config workers/research/wrangler.jsonc
```

5. Vercel의 해당 배포 환경에 `RESEARCH_WORKER_URL=https://실제-worker주소`와 같은 `RESEARCH_WORKER_SECRET`을 등록하고 재배포한다. URL에는 경로·쿼리·인증 정보를 넣지 않는다.
6. 운영자 로그인 후 `/settings`에서 연결을 확인한다. 시크릿은 서버 전용이며 `NEXT_PUBLIC_` 접두어를 사용하지 않는다.

이 단계는 DB 변경이 없고 기존 질문·브리핑 생성 경로를 바꾸지 않는다. 배포 환경별로 Worker와 시크릿을 분리한다.

## 검증

```bash
pnpm test:research
pnpm test:research:runtime
pnpm worker:typecheck
pnpm worker:dry-run
pnpm lint
pnpm build
pnpm test:research:routes
```

- 계약 테스트: 정상 서명, 위조·만료 요청, 라우팅, 설정 누락, 잘못된 URL, 비정상·과대 응답, 통신 오류, 타임아웃.
- 런타임 테스트: 테스트용 임시 시크릿을 사용해 로컬 workerd와 HTTP로 왕복한다. Cloudflare 계정·외부 AI·운영 데이터를 사용하지 않는다. 로컬 포트 `8797`이 필요하다.
- 라우트 테스트: 빌드된 Next.js에서 비로그인·위조 세션 거부, 운영자에게 설정 누락 표시, DB 없는 설정 화면을 확인한다. 로컬 포트 `3219`가 필요하다.
- Worker 타입은 `wrangler.jsonc`로부터 생성하며 생성 파일은 Git에서 제외한다. 새 체크아웃에서는 `pnpm worker:typecheck`를 실행한다.
- 호환 날짜는 설치된 Wrangler 4.156.0 / workerd에서 검증된 `2026-10-30`이다. 런타임 업그레이드 시 함께 검토한다.

공식 참고: [Worker 설정](https://developers.cloudflare.com/workers/wrangler/configuration/), [시크릿 관리](https://developers.cloudflare.com/workers/configuration/secrets/), [Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/).
