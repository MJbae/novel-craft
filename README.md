# Novel Craft

Codex CLI 기반 한국 웹소설 생성/편집 서비스입니다.

ChatGPT 5.2(Codex CLI)를 활용하여, 핵심 컨셉만 입력하면 출판 가능한 품질의 웹소설을 생성하고 편집할 수 있습니다.

## 주요 기능

- **프로젝트 부트스트랩** -- 장르/톤/컨셉만 입력하면 시놉시스, 세계관, 플롯 개요, 캐릭터를 자동 생성
- **2패스 원고 생성** -- 1패스(서사 정확성) + 2패스(문체 교정) 자동 체이닝
- **7-메트릭 검증 파이프라인** -- 분량, 장면 수, 엔딩 훅, 평균 문장 길이, 대화 비율, 설명체 밀도, 반복률 (전부 로컬, 추가 비용 $0)
- **구조화 캐릭터 보이스** -- endings, banned_endings, formality, behavioral_rules 기반 일관된 캐릭터 대사
- **Tiptap 에디터** -- WYSIWYG 편집, 자동 저장, 복사 버튼, 가독성 최적화
- **비동기 작업 큐** -- 생성 요청 즉시 반환, 백그라운드 워커 처리, 프론트엔드 폴링
- **에피소드 이벤트 추출** -- 회차별 주요 사건을 LLM이 JSON으로 추출하여 다음 화 컨텍스트로 활용
- **내보내기** -- 원고(TXT/MD)와 프로젝트 설정(시놉시스, 세계관, 플롯, 캐릭터) 개별 내보내기

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 (App Router, Turbopack) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS v4, shadcn/ui |
| 에디터 | Tiptap |
| 데이터베이스 | SQLite (better-sqlite3) |
| 유효성 검증 | Zod |
| 상태 관리 | Zustand |
| AI 엔진 | Codex CLI (gpt-5.2, stdin pipe) |
| 테스트 | Vitest |

## 시작하기

### 사전 요구사항

- Node.js 18+
- [Codex CLI](https://github.com/openai/codex) 설치 및 ChatGPT Pro 구독
- Codex CLI 기본 모델을 `gpt-5.2`로 설정

### 설치

```bash
git clone <repo-url> novel-craft
cd novel-craft
npm install
```

### 실행

```bash
# 개발 서버 (Turbopack)
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

`http://localhost:3000`으로 접속합니다.

### 테스트

```bash
npm test
```

## 프로젝트 구조

```
novel-craft/
├── docs/                          # 작업 계획서
├── data/                          # SQLite DB (런타임 생성, gitignored)
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── page.tsx               # 대시보드 (프로젝트 목록)
│   │   ├── projects/[id]/         # 프로젝트 설정
│   │   │   ├── characters/        # 캐릭터 관리
│   │   │   └── episodes/          # 회차 목록 & 에디터
│   │   └── api/                   # REST API 라우트
│   ├── components/                # UI 컴포넌트
│   │   ├── editor/                # Tiptap 에디터, 생성 툴바, 검증 패널
│   │   ├── episodes/              # 회차 카드, 목록
│   │   ├── projects/              # 프로젝트 카드, 부트스트랩, 내보내기
│   │   └── ui/                    # shadcn/ui 기본 컴포넌트
│   ├── lib/
│   │   ├── codex.ts               # Codex CLI 래퍼
│   │   ├── services/              # 비즈니스 로직 (생성, 검증, 워커, 큐)
│   │   ├── prompts/               # 프롬프트 템플릿 (7종)
│   │   └── db/                    # SQLite 스키마 & 초기화
│   ├── stores/                    # Zustand 스토어
│   └── types/                     # TypeScript 타입 정의
└── tests/                         # Vitest 테스트
```

## DB 스키마

5개 테이블: `projects`, `characters`, `episodes`, `episode_events`, `generation_jobs`

## API 라우트

| Method | 경로 | 설명 |
|--------|------|------|
| GET/POST | `/api/projects` | 프로젝트 CRUD |
| GET/PUT/DELETE | `/api/projects/[id]` | 프로젝트 상세 |
| GET | `/api/projects/[id]/export` | 내보내기 (`type=episodes\|settings`, `format=txt\|md`) |
| GET/POST | `/api/projects/[id]/episodes` | 회차 목록/생성 |
| GET/PUT/DELETE | `/api/episodes/[id]` | 회차 상세 |
| GET/POST | `/api/projects/[id]/characters` | 캐릭터 목록/생성 |
| POST | `/api/generate/bootstrap` | 프로젝트 부트스트랩 |
| POST | `/api/generate/outline` | 아웃라인 생성 |
| POST | `/api/generate/episode` | 원고 생성 (2패스) |
| POST | `/api/generate/revise` | 원고 수정 |
| POST | `/api/generate/summary` | 요약 생성 |
| GET | `/api/jobs/[id]` | 작업 상태 조회 |

## 비용

ChatGPT Pro 구독($200/월)만으로 운영. 검증 파이프라인은 전부 로컬 처리로 추가 비용 $0.

## 라이선스

Private
