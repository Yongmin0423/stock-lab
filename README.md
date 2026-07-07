# StockLab

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
