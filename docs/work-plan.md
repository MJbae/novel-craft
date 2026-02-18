# Novel Craft — 간소화 웹소설 생성/편집 서비스 작업 계획서 (v2)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

> **v2 변경사항**: `review-feasibility-and-quality.md` 검토 결과 반영. 비동기 작업 큐, 구조화 캐릭터 보이스, 2패스 생성, AI 냄새 메트릭, 이벤트 로그, 컨텍스트 예산 관리 추가.

**Goal:** 사용자가 핵심 컨셉만 입력하면 ChatGPT 5.2 모델로 **출판 가능한 품질의** 웹소설을 생성·편집할 수 있는 **웹 기반 서비스**를 구축한다.

**Architecture:** Next.js 15 풀스택 앱(App Router)으로 프론트엔드와 API 라우트를 단일 프로젝트에 통합한다. 텍스트 생성은 **비동기 작업 큐** 기반으로, Codex CLI(`codex exec -m gpt-5.2`)를 백그라운드 워커에서 **stdin 파이프**로 호출한다. ChatGPT Pro 구독($200/월) 내에서 추가 비용 없이 운영한다. 데이터는 SQLite(better-sqlite3)로 관리한다.

**Tech Stack:** TypeScript, Next.js 15 (App Router), Tailwind CSS, shadcn/ui, SQLite (better-sqlite3), Zod, Codex CLI (gpt-5.2, stdin pipe), Tiptap (에디터)

**Reference:** `../web-novel/web-novel-service-prd.md` — 원본 PRD (웹소설 창작 핵심 조건 참고)

---

## 0. 현재 프로젝트 대비 변경점 요약

### 기존 프로젝트 (`web-novel`)

| 항목 | 규모 |
|---|---|
| MCP 도구 | 30+ 개 |
| LLM 모델 | GPT-5 + Gemini Flash/Pro/Embedding (이중 과금) |
| 메모리 아키텍처 | 5-레이어 (Rules/Canon/EventLog/RAG/Summaries) |
| 검증 시스템 | 삼중 방어 (하드+보이스+소프트) + 문체 게이트 + 모드 콜랩스 |
| 인터페이스 | CLI(Codex) + Web GUI(편집자 검수) 이중 구조 |
| 게이트 시스템 | Gate A + B + C (자동+편집자) |
| 서버 | MCP 프로토콜 + REST API 이중 노출 |
| 월 비용 | ~₩36만 (ChatGPT Pro $200 + Gemini API ₩10만) |

### 신규 프로젝트 (`novel-craft`)

| 항목 | 규모 |
|---|---|
| 생성 엔진 | ChatGPT 5.2 only (Codex CLI exec, **비동기 작업 큐**) |
| 메모리 | SQLite (5 테이블: projects, characters, episodes, **episode_events**, **generation_jobs**) |
| 검증 | **다층 검증**: 하드 체크 + **AI 냄새 메트릭** + **엔딩 훅 검증** (전부 로컬, $0) |
| 생성 방식 | **2패스 생성** (1패스: 서사 정확성 → 2패스: 문체 교정) |
| 캐릭터 | **구조화 보이스 프로파일** (endings, banned_endings, formality, behavioral_rules) |
| 인터페이스 | 웹 앱 단일 (Next.js 풀스택) |
| 서버 | Next.js API Routes |
| 월 비용 | **$200 (ChatGPT Pro만, 추가 비용 $0)** |

### 제거 항목

- ~~MCP 서버/프로토콜~~ → Next.js API Routes
- ~~Gemini API 전체~~ (소프트 체크, 요약, RAG, 삽화) → 없음
- ~~5-레이어 메모리~~ → SQLite 5테이블 (간소화하되 이벤트 추적은 유지)
- ~~골든 코퍼스 / 장르 플레이북~~ → 프롬프트 엔지니어링으로 대체
- ~~아크 페이싱 / 모드 콜랩스 방지~~ → Phase 4+ 유보 (20화 파일럿 후 판단)
- ~~삽화 생성~~ → 없음
- ~~편집자 Gate C 시스템~~ → 사용자 직접 확인/수정
- ~~플랫폼별 프리셋~~ → 문피아 기본만
- ~~피드백 분류/전략 제안~~ → 없음

### v1 → v2 핵심 변경 (검토 결과 반영)

| 영역 | v1 | v2 |
|---|---|---|
| 아키텍처 | 동기 `codex exec` | **비동기 작업 큐** (generation_jobs + 백그라운드 워커 + 프론트 polling) |
| Codex CLI | CLI 인자 전달 | **stdin 파이프** (`spawn` + `child.stdin.write`) |
| DB | 3 테이블 | **5 테이블** (+episode_events, +generation_jobs) |
| 캐릭터 | 자유 텍스트 speech_style | **구조화 JSON 보이스 프로파일** |
| 아웃라인 | 자유 텍스트 | **JSON 구조** (scenes[] + goal/conflict/twist, Zod 검증) |
| 검증 | 분량만 | **7-메트릭 파이프라인** (분량, 장면 수, 엔딩 훅, 평균 문장 길이, 대화 비율, 설명체 밀도, 반복률) |
| 생성 | 1패스 | **2패스** (서사 정확성 → 문체 교정, 자동 체이닝) |
| 이벤트 | 없음 | **에피소드별 이벤트 추출** (LLM → JSON → DB → 다음 화 컨텍스트) |
| 컨텍스트 | "최근 3화 요약" | **예산 관리** (항목별 글자수 제한) |
| 로드맵 | 8~11일 | **10~13일** (4 Phase) |

---

## 1. ChatGPT 5.2 터미널 통합 전략

### 1-1. 핵심 발견사항

| 항목 | 내용 |
|---|---|
| **모델 식별자** | `gpt-5.2` |
| **CLI 명령** | `codex exec -m gpt-5.2 --stdin` (stdin 파이프 모드) |
| **설정 파일** | `~/.codex/config.toml` → `model = "gpt-5.2"` |
| **과금** | ChatGPT Pro 구독에 포함 (추가 비용 $0) |
| **레이트 리밋** | ~300–1,500 로컬 메시지 / 5시간 롤링 윈도우 (Pro) |
| **비대화형 모드** | `codex exec` — JSON 출력, 스키마 지정, ephemeral 세션 지원 |
| **프로필 지원** | `[profiles.writer]` 설정으로 창작 전용 프로필 가능 |

### 1-2. 프로필 설정 (권장)

```toml
# ~/.codex/config.toml
model = "gpt-5.3-codex"  # 코딩 기본

[profiles.writer]
model = "gpt-5.2"
model_reasoning_effort = "high"
approval_policy = "never"
```

```bash
# 사용 예시
codex --profile writer "판타지 웹소설 1화를 작성해주세요..."
codex exec -m gpt-5.2 --json "아웃라인을 JSON으로 생성해주세요"
```

### 1-3. 레이트 리밋 운영 전략

| 작업 | 예상 메시지 수 | 비고 |
|---|---|---|
| 프로젝트 초기 설정 (바이블+캐릭터+플롯) | 5~10 | 1회성 |
| 회차 아웃라인 생성 | 1~2 | |
| 회차 원고 1패스 생성 (8,000자) | 2~4 | 길이에 따라 분할 |
| 회차 원고 2패스 스타일 교정 | 1~2 | 자동 체이닝 |
| 이벤트 추출 | 1 | 자동 |
| 수정 지시 | 1~2 | |
| **1화 총합** | **~8~14** | v1 대비 +3~4 (2패스+이벤트) |
| **5시간당 최대 생산량** | **20~180화** | Pro 리밋 기준 |
| **일간 목표 (보수적)** | **2~5화** | 안전 마진 충분 |

> 일간 2~5화 생산은 Pro 레이트 리밋의 **5~15%**만 소모. 충분히 여유로움.

### 1-4. 품질 주의사항

- CLI `gpt-5.2`는 웹 ChatGPT "GPT-5.2 Pro"와 품질 차이 가능성 있음 (커뮤니티 보고)
- `model_reasoning_effort = "high"` 설정으로 품질 최대화
- 필요시 `gpt-5-pro` 모델이 CLI에서 사용 가능한지 추후 검증

### 1-5. 통합 아키텍처 (v2 — 비동기 작업 큐)

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Web App                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 프로젝트  │  │ 에피소드  │  │ 에디터    │  │ 생성 상태 │   │
│  │ 설정 UI  │  │ 목록 UI  │  │ UI       │  │ polling  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │         │
│  ┌────▼──────────────▼──────────────▼──────────────▼──────┐ │
│  │              Next.js API Routes                        │ │
│  │  /api/projects | /api/episodes | /api/jobs/:id (poll)  │ │
│  │  /api/generate → 작업 큐 등록 → job_id 즉시 반환       │ │
│  └────┬──────────────────────────────────────────────────┘ │
│       │                                                     │
│  ┌────▼──────────────────────────────────────────────────┐ │
│  │              Service Layer                             │ │
│  │  JobQueueService → generation_jobs 테이블 관리         │ │
│  │  WorkerService → 백그라운드 작업 실행                    │ │
│  │  GenerationService → codex exec (stdin pipe)           │ │
│  │  ValidationService → 7-메트릭 검증 파이프라인            │ │
│  │  ContextService → 예산 기반 컨텍스트 조합                │ │
│  │  StorageService → SQLite CRUD                          │ │
│  └────┬──────────────┬──────────────┬─────────────────────┘ │
│       │              │              │                       │
│  ┌────▼────┐   ┌─────▼─────┐  ┌────▼────────┐             │
│  │ Codex   │   │  SQLite   │  │ Validation  │             │
│  │ CLI     │   │  (5 tbl)  │  │ Pipeline    │             │
│  │ gpt-5.2 │   │           │  │ (로컬, $0)   │             │
│  │ (stdin) │   │           │  │             │             │
│  └─────────┘   └───────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 핵심 기능 정의

원본 PRD에서 웹소설 창작의 **필수 조건** 추출 + **검토 결과 반영 품질 요건** 포함:

### 2-1. 프로젝트 부트스트랩 (1회성)

사용자가 최소한의 입력으로 프로젝트를 시작한다.

**입력 (필수)**:
- 장르 (판타지, 로맨스, 현대판타지, 회귀 등)
- 전체 톤/느낌 (1~2문장)
- 주인공 키워드 (이름, 성격, 특징)

**입력 (선택)**:
- 조연 키워드
- 참고 작품
- 금지 요소
- 추가 설정 메모

**자동 생성 (ChatGPT 5.2)**:
- 시놉시스 (300~500자)
- 캐릭터 프로필 (주요 인물 3~5명): **구조화 보이스 프로파일** 포함
  - 이름, 성격, 관계
  - **말투 어미** (endings: ["~거든", "~잖아"])
  - **금지 어미** (banned_endings: ["~하옵니다"])
  - **입버릇** (catchphrases: ["쯧"])
  - **존댓말 규칙** (formality: "반말_기본")
  - **감정 표현 스타일** (emotion_style: "절제형")
  - **행동 규칙** (values, never_does, conflict_style)
- 세계관 설정 요약
- 50화 분량의 대략적 플롯 골격

### 2-2. 회차 생성 파이프라인 (v2 — 2패스 + 검증)

매 회차 생성 시 반복되는 핵심 루프:

```
컨텍스트 조합 (예산 관리)
  → 아웃라인 생성 (JSON 구조화, Zod 검증)
  → 사용자 확인/수정
  → 원고 1패스 생성 (서사 정확성 우선)
  → 기본 검증 (분량, 장면 수, 엔딩 훅)
  → AI 냄새 메트릭 측정 + 경고
  → 원고 2패스 스타일 교정 (자동, 내용 변경 불가)
  → 사용자 편집
  → 이벤트 추출 (LLM → JSON → DB)
  → 요약 생성
  → 저장
```

**컨텍스트 조합 (예산 관리 — v2 신규)**:
- 세계관/캐릭터 설정 (**보이스 프로파일 JSON** 포함)
- 직전 회차 요약 (최근 3화, **항목별 글자수 제한**)
- **이전 에피소드 주요 이벤트** (episode_events에서 조회)
- 현재 플롯 진행 상태
- 사용자 추가 지시

**컨텍스트 예산 배분** (총 프롬프트 한도 ~12,000자 기준):

| 항목 | 배분 | 글자수 제한 |
|---|---|---|
| 작성 규칙 + 시스템 | 10% | ~1,200자 |
| 세계관 설정 | 10% | ~1,200자 |
| 캐릭터 보이스 프로파일 | 15% | ~1,800자 |
| 이전 에피소드 요약 (최근 3화) | 20% | ~2,400자 |
| 이벤트 로그 (진행 중인 이벤트) | 10% | ~1,200자 |
| 플롯 위치 | 5% | ~600자 |
| 아웃라인 (이번 화) | 15% | ~1,800자 |
| 사용자 추가 지시 | 5% | ~600자 |
| 여유분 | 10% | ~1,200자 |

**아웃라인 생성 (ChatGPT 5.2 — v2 구조화)**:
- **JSON 구조** 출력 (Zod 검증):
  ```json
  {
    "scenes": [
      {
        "scene_number": 1,
        "goal": "주인공이 첫 번째 시련에 직면",
        "conflict": "강적의 등장",
        "twist": "예상치 못한 동맹자 출현",
        "characters": ["김도현", "이수아"],
        "emotion_intensity": 7
      }
    ],
    "ending_hook": "마지막 장면에서 숨겨진 적의 존재 암시",
    "estimated_word_count": 8000
  }
  ```

**원고 1패스 생성 (ChatGPT 5.2)**:
- ~8,000자 한국어 웹소설
- **캐릭터 보이스 프로파일 엄격 준수** (어미, 금지 어미, 입버릇)
- **구조화 아웃라인의 장면별 goal/conflict/twist 반영**
- 엔딩 훅 포함

**기본 검증 (로컬, $0 — v2 확장)**:
1. 분량 체크 (7,000~9,000자 허용 범위)
2. 장면 수 >= 3 (### 구분자 기준)
3. **엔딩 훅 검증** (마지막 500자: 대화 종결 아닌지, 훅 키워드 존재)
4. **평균 문장 길이** (목표: 15~35자)
5. **대화 비율** (목표: 40~60%)
6. **설명체 밀도** (목표: <5%, ~것이다/~때문이다/~할 수 있다)
7. **반복률** (목표: <3%, 2-gram 반복)

**원고 2패스 스타일 교정 (ChatGPT 5.2 — v2 신규)**:
- 1패스 결과의 **내용은 변경하지 않고** 문체만 교정
- AI 냄새 메트릭 경고 항목 집중 교정
- 자동 체이닝 (1패스 완료 → 즉시 2패스 실행)

**이벤트 추출 (ChatGPT 5.2 → DB — v2 신규)**:
- 원고 완성 후 LLM이 "이번 화 주요 이벤트" JSON 출력
- `episode_events` 테이블에 저장
- 다음 화 컨텍스트에 포함

### 2-3. 웹 에디터

- 생성된 원고를 웹에서 직접 편집
- 수정 지시 기능 (특정 부분에 대해 ChatGPT 5.2에 재생성 요청)
- 버전 히스토리 (최소 직전 버전 보관)
- **생성 진행 상태 표시** (큐 대기 → 1패스 생성 중 → 검증 중 → 2패스 교정 중 → 완료)
- **검증 결과 패널** (7개 메트릭 + 경고/통과 배지)
- **이벤트 탭** (이번 화에서 추출된 이벤트 목록)

### 2-4. 프로젝트 관리

- 프로젝트 목록 / 생성 / 삭제
- 회차 목록 (상태: 초안/완료)
- 캐릭터 설정 열람/수정 (**보이스 프로파일 JSON 편집 UI**)
- 세계관 설정 열람/수정

---

## 3. 데이터 모델 (SQLite — v2: 5 테이블)

```sql
-- 프로젝트
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  genre TEXT NOT NULL,
  tone TEXT,                    -- 전체 톤/느낌
  synopsis TEXT,                -- 자동 생성된 시놉시스
  worldbuilding TEXT,           -- 세계관 설정 (텍스트)
  plot_outline TEXT,            -- 50화 플롯 골격 (텍스트)
  settings JSON,                -- 금지 요소, 추가 설정 등
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 캐릭터 (v2: 구조화 보이스 프로파일)
CREATE TABLE characters (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'main',  -- main / supporting / minor
  personality TEXT,              -- 성격 설명
  speech_style JSON NOT NULL DEFAULT '{}',
  -- 구조:
  -- {
  --   "endings": ["~거든", "~잖아"],
  --   "banned_endings": ["~하옵니다"],
  --   "catchphrases": ["쯧"],
  --   "formality": "반말_기본",
  --   "avg_dialogue_length": "15~40자",
  --   "emotion_style": "절제형"
  -- }
  behavioral_rules JSON NOT NULL DEFAULT '{}',
  -- 구조:
  -- {
  --   "values": ["실용주의"],
  --   "never_does": ["비겁한 행동"],
  --   "conflict_style": "직접 대면"
  -- }
  appearance TEXT,               -- 외형
  background TEXT,               -- 배경 이야기
  relationships TEXT,            -- 관계 설명
  notes TEXT,                    -- 추가 노트
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 에피소드 (회차)
CREATE TABLE episodes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft / outline / generating / generated / edited / final
  outline JSON,                  -- v2: 구조화 JSON 아웃라인 (scenes[])
  content TEXT,                  -- 최종 원고
  previous_content TEXT,         -- 직전 버전 (1개만 보관)
  summary TEXT,                  -- 자동 생성된 요약 (다음 화 컨텍스트용)
  word_count INTEGER DEFAULT 0,
  style_metrics JSON,            -- v2: AI 냄새 메트릭 결과 JSON
  generation_prompt TEXT,        -- 생성 시 사용한 프롬프트 (디버깅용)
  user_notes TEXT,               -- 사용자 메모
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(project_id, episode_number)
);

-- v2 신규: 에피소드 이벤트 로그
CREATE TABLE episode_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- plot / character_state / relationship / foreshadow
  description TEXT NOT NULL,
  characters_involved JSON,  -- JSON array of character names/IDs
  created_at TEXT DEFAULT (datetime('now'))
);

-- v2 신규: 생성 작업 큐
CREATE TABLE generation_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  episode_id TEXT,
  job_type TEXT NOT NULL,  -- bootstrap / outline / episode_pass1 / episode_pass2 / revise / summary / event_extract
  status TEXT NOT NULL DEFAULT 'queued',  -- queued → running → completed → failed
  input JSON NOT NULL,      -- 프롬프트 구성에 필요한 파라미터
  output TEXT,              -- 생성 결과
  error TEXT,               -- 실패 시 에러 메시지
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 2,
  created_at TEXT DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
);
```

> **설계 원칙**: "간소화하되 품질은 유지". 5개 테이블로 비동기 생성, 이벤트 추적, 구조화 검증을 모두 지원한다.

---

## 4. API 설계

### 4-1. 프로젝트 API

```
POST   /api/projects                    프로젝트 생성
GET    /api/projects                    프로젝트 목록
GET    /api/projects/:id                프로젝트 상세
PUT    /api/projects/:id                프로젝트 수정
DELETE /api/projects/:id                프로젝트 삭제
```

### 4-2. 캐릭터 API

```
GET    /api/projects/:id/characters     캐릭터 목록
POST   /api/projects/:id/characters     캐릭터 추가
PUT    /api/characters/:id              캐릭터 수정 (보이스 프로파일 포함)
DELETE /api/characters/:id              캐릭터 삭제
```

### 4-3. 에피소드 API

```
GET    /api/projects/:id/episodes       에피소드 목록
POST   /api/projects/:id/episodes       에피소드 생성 (빈 초안)
GET    /api/episodes/:id                에피소드 상세 (이벤트, 메트릭 포함)
PUT    /api/episodes/:id                에피소드 수정 (편집 저장)
DELETE /api/episodes/:id                에피소드 삭제
```

### 4-4. 생성 API (v2: 비동기 작업 큐)

```
POST   /api/generate/bootstrap          프로젝트 부트스트랩 → job_id 반환
POST   /api/generate/outline            회차 아웃라인 생성 → job_id 반환
POST   /api/generate/episode            회차 원고 생성 (1패스+2패스 자동) → job_id 반환
POST   /api/generate/revise             원고 수정 지시 → job_id 반환
POST   /api/generate/summary            회차 요약 생성 → job_id 반환
```

### 4-5. 작업 상태 API (v2 신규)

```
GET    /api/jobs/:id                    작업 상태 조회 (polling용)
GET    /api/jobs/:id/result             작업 결과 조회 (완료 시)
DELETE /api/jobs/:id                    작업 취소
```

### 4-6. 생성 API 상세: `/api/generate/episode`

```typescript
// Request
{
  project_id: string,
  episode_number: number,
  outline?: object,              // JSON 아웃라인 — 없으면 자동 생성
  additional_instructions?: string,
}

// Response (즉시 반환)
{
  job_id: string,
  status: "queued",
  estimated_duration: "120~240초",
}

// 백그라운드 워커 동작:
// 1. 컨텍스트 조합 (예산 관리)
//    - 프로젝트 설정 + 캐릭터 보이스 프로파일
//    - 최근 3화 요약 (글자수 제한 적용)
//    - 이벤트 로그 (진행 중인 이벤트)
//    - 플롯 위치
// 2. 프롬프트 구성 (항목별 예산 적용)
// 3. codex exec -m gpt-5.2 --stdin (1패스: 서사 정확성)
// 4. 기본 검증 (분량, 장면 수, 엔딩 훅)
// 5. AI 냄새 메트릭 측정
// 6. codex exec -m gpt-5.2 --stdin (2패스: 스타일 교정)
// 7. 결과 DB 저장 + 메트릭 저장
// 8. 자동 이벤트 추출 (별도 LLM 호출)
// 9. 자동 요약 생성 (별도 LLM 호출)

// Polling Response (GET /api/jobs/:id)
{
  job_id: string,
  status: "queued" | "running" | "completed" | "failed",
  step?: "pass1_generating" | "validating" | "pass2_correcting" | "extracting_events" | "summarizing",
  progress?: number,  // 0~100
  result?: {
    episode_id: string,
    content: string,
    word_count: number,
    outline: object,
    summary: string,
    style_metrics: StyleMetrics,
    events: EpisodeEvent[],
  },
  error?: string,
}
```

---

## 5. 프롬프트 엔지니어링 (v2 — 보이스 프로파일 + 구조화 출력)

### 5-1. 부트스트랩 프롬프트 (프로젝트 초기화)

```
당신은 한국 웹소설 전문 작가이자 작품 기획자입니다.

아래 컨셉을 바탕으로 웹소설의 기초 설정을 생성해주세요.
캐릭터는 반드시 구별 가능한 말투를 가져야 합니다 — 말투만으로 누가 말하는지 알 수 있어야 합니다.

## 컨셉
- 장르: {genre}
- 톤/느낌: {tone}
- 주인공: {protagonist_keywords}
- 조연: {supporting_keywords}
- 금지 요소: {banned_elements}
- 추가 메모: {notes}

## 출력 형식 (JSON)
{
  "synopsis": "300~500자 시놉시스",
  "worldbuilding": "세계관 설정 (기술, 사회, 마법 체계 등)",
  "characters": [
    {
      "name": "이름",
      "role": "main|supporting",
      "personality": "성격 핵심 (3~5단어)",
      "speech_style": {
        "endings": ["자주 쓰는 어미 3~5개"],
        "banned_endings": ["절대 쓰지 않는 어미"],
        "catchphrases": ["입버릇, 감탄사"],
        "formality": "반말_기본|존댓말_기본|상대에_따라",
        "avg_dialogue_length": "15~40자 등 범위",
        "emotion_style": "절제형|격정형|유머형 등"
      },
      "behavioral_rules": {
        "values": ["핵심 가치관 1~3개"],
        "never_does": ["절대 하지 않는 행동"],
        "conflict_style": "직접 대면|회피|계략 등"
      },
      "appearance": "외형 핵심",
      "background": "배경 요약",
      "relationships": "관계"
    }
  ],
  "plot_outline": "50화 분량 플롯 골격 (10화 단위로 주요 사건과 전환점)"
}

## 중요
- 각 캐릭터의 말투 어미가 겹치지 않도록 설계하세요
- endings에 최소 3개, banned_endings에 최소 1개를 포함하세요
- 주인공과 히로인은 반드시 대비되는 말투 스타일을 가져야 합니다
```

### 5-2. 아웃라인 생성 프롬프트 (v2 — JSON 구조화)

```
당신은 한국 웹소설 전문 작가입니다. {episode_number}화의 장면별 아웃라인을 설계해주세요.

## 작품 정보
- 장르: {genre}
- 시놉시스: {synopsis}

## 직전 흐름
{previous_summaries}

## 현재 플롯 위치
{plot_position}

## 진행 중인 이벤트
{active_events}

## 사용자 지시
{additional_instructions}

## 출력 형식 (JSON)
{
  "scenes": [
    {
      "scene_number": 1,
      "goal": "이 장면에서 달성해야 할 서사적 목표",
      "conflict": "이 장면의 핵심 갈등 또는 긴장",
      "twist": "독자의 예상을 벗어나는 전환 (없으면 null)",
      "characters": ["등장 캐릭터 이름"],
      "emotion_intensity": 7
    }
  ],
  "ending_hook": "마지막 500자에서 구현할 훅 (구체적 상황 서술)",
  "estimated_word_count": 8000
}

## 규칙
- 최소 3개 장면, 최대 5개 장면
- 각 장면에 반드시 goal과 conflict 포함
- ending_hook은 '다음 화가 궁금해지는' 구체적 상황이어야 함
- emotion_intensity는 1~10 (전체적으로 단조롭지 않게 변화를 줄 것)
```

### 5-3. 회차 생성 프롬프트 (v2 — 1패스: 서사 정확성)

```
당신은 한국 웹소설 전문 작가입니다. 아래 설정과 컨텍스트를 기반으로 {episode_number}화를 작성해주세요.

## 작품 설정
- 장르: {genre}
- 시놉시스: {synopsis}
- 세계관: {worldbuilding}

## 등장 캐릭터 (말투 규칙 엄격 준수)
{characters_voice_profiles}

예시:
### 김도현 (주인공)
- 성격: 실용주의, 약자보호
- 말투 어미: ~거든, ~잖아, ~인데 (반드시 대사에 이 어미를 빈번히 사용)
- 금지 어미: ~하옵니다, ~이로다 (절대 사용 금지)
- 입버릇: "쯧", "어이가 없네"
- 존댓말: 반말 기본, 윗사람에게만 존댓말
- 감정 표현: 절제형 — 감정을 직접 서술하지 말고 행동/대사로 표현
- 절대 하지 않는 것: 비겁한 행동, 무고한 자 희생 방관
- 갈등 방식: 직접 대면

## 직전 회차 요약
{previous_summaries}

## 진행 중인 이벤트 (모순 방지)
{active_events}

## 현재 플롯 위치
{plot_position}

## 이번 화 아웃라인
{structured_outline}
(각 장면의 goal/conflict/twist를 반드시 반영하세요)

## 작성 규칙 (위반 시 재생성)
1. 분량: 약 8,000자 (7,000~9,000자). 부족하면 장면을 깊게, 넘치면 요약하지 말고 장면을 나누세요.
2. 장면: 아웃라인의 모든 장면을 포함. 장면 전환은 ### 구분.
3. 문체: {tone}. 모바일 가독성을 위해 한 문단 3줄 이내.
4. 대화: 총 분량의 40~60%. 캐릭터별 말투 어미를 반드시 구별하여 사용.
5. 설명체 금지: "~것이다", "~때문이다", "~할 수 있다" 등 AI 특유의 설명체를 최소화 (<5%).
6. 문장 길이: 평균 15~35자. 너무 길거나 짧은 문장 연속 금지.
7. 엔딩: 마지막 500자는 아웃라인의 ending_hook을 구현. 대화 종결이 아닌 서사적 긴장으로 마무리.
8. 감정: 직접 서술("슬펐다", "화가 났다") 최소화. 행동/대사/묘사로 표현.
9. 금지 요소: {banned_elements}

## 출력
원고 본문만 출력하세요. 메타 코멘트 없이 소설 텍스트만.
```

### 5-4. 스타일 교정 프롬프트 (v2 신규 — 2패스)

```
아래 원고의 문체를 교정해주세요.

## 규칙 (절대 준수)
1. **내용 변경 금지**: 사건, 대화 내용, 캐릭터 행동을 바꾸지 마세요. 문체와 표현만 다듬으세요.
2. AI 설명체 제거: "~것이다", "~때문이다", "~할 수 있다" → 자연스러운 서술체로
3. 캐릭터 말투 강화: 각 캐릭터의 지정된 어미를 더 빈번히 사용
4. 문장 호흡 조절: 너무 긴 문장은 분리, 너무 짧은 문장의 연속은 합치기
5. 반복 표현 제거: 같은 단어/구문이 근접 반복되면 동의어로 교체
6. 감정 직접 서술 → 행동/대사로 교체

## 경고된 메트릭 (이 부분을 집중 교정)
{style_warnings}

## 원고
{content}

## 캐릭터 말투 참조
{characters_voice_profiles}

## 출력
교정된 전체 원고를 출력하세요. 원고 본문만, 메타 코멘트 없이.
```

### 5-5. 수정 지시 프롬프트

```
아래 원고의 특정 부분을 수정해주세요.

## 원본 원고
{current_content}

## 캐릭터 말투 규칙
{characters_voice_profiles}

## 수정 지시
{revision_instruction}

## 규칙
- 지시된 부분만 수정하고, 나머지는 최대한 유지
- 전체 분량 7,000~9,000자 유지
- 캐릭터별 말투 어미 일관성 유지 (지정된 endings 사용)
- 금지 어미(banned_endings) 절대 사용 금지

## 출력
수정된 전체 원고를 출력하세요.
```

### 5-6. 요약 생성 프롬프트

```
아래 회차의 핵심 내용을 요약해주세요. 다음 회차 작성을 위한 컨텍스트로 사용됩니다.

## {episode_number}화 원고
{content}

## 출력 형식 (200자 이내)
- 주요 사건 (1~3개, 구체적으로)
- 캐릭터 상태 변화 (부상, 각성, 감정 등)
- 다음 화로 이어지는 떡밥/상황
- 해결되지 않은 갈등
```

### 5-7. 이벤트 추출 프롬프트 (v2 신규)

```
아래 원고에서 주요 이벤트를 추출해주세요. 향후 일관성 유지를 위한 데이터로 사용됩니다.

## {episode_number}화 원고
{content}

## 출력 형식 (JSON)
[
  {
    "event_type": "plot|character_state|relationship|foreshadow",
    "description": "구체적 이벤트 서술 (1~2문장)",
    "characters_involved": ["관련 캐릭터 이름"]
  }
]

## 추출 기준
- plot: 줄거리에 영향을 주는 사건 (전투, 발견, 이동 등)
- character_state: 캐릭터 상태 변화 (부상, 능력 각성, 감정 변화 등)
- relationship: 관계 변화 (동맹, 적대, 화해 등)
- foreshadow: 아직 해결되지 않은 복선, 떡밥

이벤트 수: 3~8개. 사소한 것은 제외하고 중요한 것만.
```

---

## 6. 검증 파이프라인 (v2 신규)

### 6-1. 7-메트릭 검증 시스템

모든 메트릭은 **로컬 TypeScript 코드**로 실행. 추가 비용 $0.

```typescript
// services/validation.ts

interface StyleMetrics {
  wordCount: number;              // 목표: 7,000~9,000자
  sceneCount: number;             // 목표: >= 3
  endingHookValid: boolean;       // 마지막 500자 훅 검증
  avgSentenceLength: number;      // 목표: 15~35자
  dialogueRatio: number;          // 목표: 0.40~0.60
  explanationDensity: number;     // 목표: < 0.05
  repetitionRate: number;         // 목표: < 0.03
}

interface ValidationResult {
  metrics: StyleMetrics;
  warnings: ValidationWarning[];  // 범위 이탈 항목
  passed: boolean;                // 모든 메트릭 통과 여부
}

interface ValidationWarning {
  metric: string;
  actual: number;
  expected: string;
  severity: 'error' | 'warning';
  suggestion: string;
}
```

### 6-2. 메트릭 구현 상세

```typescript
// 1. 분량 체크
function checkWordCount(content: string): number {
  return content.replace(/\s/g, '').length;
}

// 2. 장면 수 체크
function checkSceneCount(content: string): number {
  return content.split(/###/).length;
}

// 3. 엔딩 훅 검증
function validateEndingHook(content: string): { valid: boolean; reason?: string } {
  const lastChars = content.slice(-500);
  // 500자 이상 존재 확인
  // 대화 종결이 아닌지 (마지막 문장이 대사로 끝나지 않음)
  // 물음표/느낌표/반전 키워드 존재 (기본 휴리스틱)
  // 서술 종결("~했다.") 단독이 아닌지
}

// 4. 평균 문장 길이
function avgSentenceLength(content: string): number {
  const sentences = content.split(/[.!?]\s*/);
  return sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
}

// 5. 대화 비율
function dialogueRatio(content: string): number {
  const dialogueMatches = content.match(/"[^"]*"/g) || [];
  const dialogueChars = dialogueMatches.join('').length;
  return dialogueChars / content.length;
}

// 6. 설명체 밀도
function explanationDensity(content: string): number {
  const patterns = /것이다|때문이다|할 수 있다|하는 것이|되는 것이|인 것이다/g;
  const matches = content.match(patterns) || [];
  const totalSentences = content.split(/[.!?]/).length;
  return matches.length / totalSentences;
}

// 7. 반복률 (2-gram)
function repetitionRate(content: string): number {
  const chars = content.replace(/\s/g, '');
  const bigrams = new Map<string, number>();
  for (let i = 0; i < chars.length - 1; i++) {
    const bg = chars.slice(i, i + 2);
    bigrams.set(bg, (bigrams.get(bg) || 0) + 1);
  }
  const repeated = [...bigrams.values()].filter(v => v > 3).length;
  return repeated / bigrams.size;
}
```

### 6-3. 검증 → 2패스 연계

```
1패스 생성 완료
  ↓
메트릭 측정
  ↓
경고 목록 생성 (예: "설명체 밀도 8% > 목표 5%", "대화 비율 32% < 목표 40%")
  ↓
2패스 스타일 교정 프롬프트에 경고 목록 주입 (style_warnings)
  ↓
2패스 생성
  ↓
메트릭 재측정
  ↓
최종 결과 + 메트릭 저장 (episodes.style_metrics)
```

---

## 7. UI 화면 설계

### 7-1. 전체 레이아웃

```
┌─────────────────────────────────────────────┐
│  Novel Craft    [프로젝트 선택 드롭다운]       │
├──────────┬──────────────────────────────────┤
│ 사이드바  │          메인 콘텐츠              │
│          │                                  │
│ ·프로젝트 │  [선택한 화면에 따라 변경]          │
│  설정    │                                  │
│ ·캐릭터  │                                  │
│ ·회차목록 │                                  │
│          │                                  │
└──────────┴──────────────────────────────────┘
```

### 7-2. 화면 목록 (4개)

| # | 화면 | 목적 | 우선순위 |
|---|---|---|---|
| 1 | **프로젝트 대시보드** | 프로젝트 생성, 목록, 기본 설정 | MVP |
| 2 | **프로젝트 설정** | 시놉시스/세계관/캐릭터 열람·수정, 부트스트랩 | MVP |
| 3 | **에피소드 목록** | 회차 목록, 상태, 새 회차 생성 | MVP |
| 4 | **에피소드 에디터** | 아웃라인→생성→검증→편집→수정지시→저장 | MVP |

### 7-3. 에피소드 에디터 (핵심 화면 — v2 확장)

```
┌──────────────────────────────────────────────────────────┐
│  ◀ 3화: 불꽃의 시련  │  상태: 생성 완료  │  7,842자        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  [아웃라인] [원고] [검증] [이벤트] [설정]  탭 전환    │    │
│  ├──────────────────────────────────────────────────┤    │
│  │                                                  │    │
│  │  [원고] 탭: Tiptap 웹 에디터                       │    │
│  │  원고 본문이 여기에 표시/편집됨                       │    │
│  │                                                  │    │
│  │  [검증] 탭: 7-메트릭 결과                          │    │
│  │  ┌────────────────────────────────────────┐      │    │
│  │  │ ✅ 분량: 7,842자 (7,000~9,000)          │      │    │
│  │  │ ✅ 장면: 4개 (>=3)                      │      │    │
│  │  │ ✅ 엔딩 훅: 유효                         │      │    │
│  │  │ ⚠️ 평균 문장 길이: 38자 (목표: 15~35)    │      │    │
│  │  │ ✅ 대화 비율: 47% (40~60%)              │      │    │
│  │  │ ✅ 설명체: 3% (<5%)                     │      │    │
│  │  │ ✅ 반복률: 2% (<3%)                     │      │    │
│  │  └────────────────────────────────────────┘      │    │
│  │                                                  │    │
│  │  [이벤트] 탭: 이번 화 추출된 이벤트                 │    │
│  │  ┌────────────────────────────────────────┐      │    │
│  │  │ plot: 도현이 첫 번째 시련 통과             │      │    │
│  │  │ character_state: 수아 능력 각성            │      │    │
│  │  │ relationship: 도현-수아 동맹 강화          │      │    │
│  │  │ foreshadow: 그림자 조직의 존재 암시        │      │    │
│  │  └────────────────────────────────────────┘      │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  생성 상태: ✅ 완료 (1패스 45초 + 2패스 38초 + 검증 2초)    │
│                                                          │
│  수정 지시: [_________________________________] [전송]     │
│                                                          │
│  [아웃라인 생성] [원고 생성] [요약 생성] [저장]               │
└──────────────────────────────────────────────────────────┘
```

**핵심 UX 플로우 (v2)**:
1. "아웃라인 생성" 클릭 → job_id 반환 → polling → JSON 아웃라인 표시
2. 사용자 아웃라인 확인/수정 (JSON 폼 또는 텍스트)
3. "원고 생성" 클릭 → job_id 반환 → polling (진행 상태: 1패스 → 검증 → 2패스 → 이벤트 추출 → 요약)
4. 완료 시 [원고], [검증], [이벤트] 탭 자동 갱신
5. 사용자 에디터에서 직접 수정 또는 수정 지시 입력
6. "저장" 클릭 → DB 저장

**생성 진행 상태 UI**:
```
[========--] 1패스 생성 중... (45초 경과)
[============--] 2패스 교정 중... (83초 경과)
[================] ✅ 완료 (총 127초)
```

---

## 8. 기술 스택 상세

| 영역 | 기술 | 이유 |
|---|---|---|
| **프레임워크** | Next.js 15 (App Router) | 풀스택, React 생태계, API Routes |
| **스타일링** | Tailwind CSS + shadcn/ui | 빠른 UI 구축, 일관된 디자인 시스템 |
| **에디터** | Tiptap (ProseMirror) | 리치 텍스트 편집, 마크다운 호환 |
| **상태 관리** | Zustand | 경량, 간단한 글로벌 상태 |
| **DB** | better-sqlite3 | 로컬 SQLite, 서버리스, 설정 불필요 |
| **검증** | Zod | 스키마 검증 + TypeScript 타입 추론 |
| **LLM** | Codex CLI (gpt-5.2, **stdin pipe**) | Pro 구독 포함, 추가 비용 없음 |
| **프로세스 실행** | Node.js child_process (**spawn**) | Codex CLI stdin 파이프 호출용 |
| **Polling** | `setInterval` + `fetch` | 작업 상태 polling (2초 간격) |

---

## 9. 구현 로드맵 (v2: 10~13일, 4 Phase)

### Phase 0: 프로젝트 스캐폴딩 + 기반 (1.5일)

| Task | 내용 | 산출물 |
|---|---|---|
| T0-1 | Next.js 15 프로젝트 초기화 | package.json, tsconfig.json |
| T0-2 | Tailwind CSS + shadcn/ui 설정 | globals.css, tailwind.config |
| T0-3 | SQLite DB 스키마 (5테이블) + 초기화 + WAL 모드 | schema.sql, database.ts |
| T0-4 | Zod 스키마 정의 (캐릭터 보이스, 아웃라인 JSON 포함) | schemas/*.ts |
| T0-5 | Codex CLI 연동 유틸리티 (**spawn + stdin 파이프**) | lib/codex.ts |
| T0-6 | 작업 큐 기반 구조 (JobQueueService, WorkerService) | services/job-queue.ts, services/worker.ts |
| T0-7 | 프로젝트 디렉토리 구조 확정 | 전체 폴더 구조 |

### Phase 1: 코어 API + 생성 엔진 (3~4일)

| Task | 내용 | 산출물 |
|---|---|---|
| T1-1 | StorageService (CRUD — 5테이블) | services/storage.ts, 테스트 |
| T1-2 | ContextService (예산 기반 컨텍스트 조합) | services/context.ts, 테스트 |
| T1-3 | GenerationService (Codex CLI 호출, stdin) | services/generation.ts, 테스트 |
| T1-4 | 프로젝트 API Routes | api/projects/*, 테스트 |
| T1-5 | 캐릭터 API Routes (보이스 프로파일 포함) | api/characters/*, 테스트 |
| T1-6 | 에피소드 API Routes | api/episodes/*, 테스트 |
| T1-7 | 생성 API Routes (비동기 큐) + 작업 상태 API | api/generate/*, api/jobs/*, 테스트 |
| T1-8 | 프롬프트 템플릿 (7종: bootstrap, outline, episode, style, revise, summary, events) | prompts/*.ts |
| T1-9 | 기본 검증 (분량, 장면 수) | services/validation.ts |

### Phase 2: 웹 UI (3~4일)

| Task | 내용 | 산출물 |
|---|---|---|
| T2-1 | 레이아웃 + 네비게이션 | layout.tsx, sidebar, top-nav |
| T2-2 | 프로젝트 대시보드 | projects/page.tsx |
| T2-3 | 프로젝트 설정 화면 | projects/[id]/page.tsx |
| T2-4 | 부트스트랩 UI (컨셉 입력 → 자동 생성) + **생성 진행 상태** | 프로젝트 설정 내 |
| T2-5 | 캐릭터 관리 UI (**보이스 프로파일 JSON 편집 폼**) | characters 컴포넌트 |
| T2-6 | 에피소드 목록 화면 | episodes/page.tsx |
| T2-7 | 에피소드 에디터 (Tiptap) + **검증/이벤트 탭** | episodes/[id]/page.tsx |
| T2-8 | 아웃라인/원고 생성 UI + **생성 진행 상태 바 (polling)** | 에디터 내 |
| T2-9 | 수정 지시 UI | 에디터 내 |

### Phase 3: 품질 시스템 + 편의 기능 (2~3일)

| Task | 내용 | 산출물 |
|---|---|---|
| T3-1 | **AI 냄새 메트릭 구현** (4개: 문장 길이, 대화 비율, 설명체, 반복) | services/style-check.ts |
| T3-2 | **엔딩 훅 검증** 구현 | services/validation.ts 확장 |
| T3-3 | **2패스 스타일 교정** (자동 체이닝, 워커에 통합) | worker 확장, prompts/style.ts |
| T3-4 | **이벤트 추출** (LLM → JSON → DB) | prompts/events.ts, worker 확장 |
| T3-5 | **컨텍스트 예산 관리** 최적화 | services/context.ts 확장 |
| T3-6 | 에디터 편의 (자동저장, 글자수, 단축키) | 에디터 기능 추가 |
| T3-7 | 프로젝트 내보내기 (TXT/MD) | export 기능 |
| T3-8 | 에러 핸들링 강화 (Codex CLI 실패, 타임아웃, 재시도) | error handling |
| T3-9 | 반응형 UI 다듬기 | CSS 조정 |

### 전체 예상 소요: **10~13일**

---

## 10. 디렉토리 구조 (v2)

```
novel-craft/
├── docs/
│   ├── work-plan.md                    ← 이 문서
│   └── review-feasibility-and-quality.md  ← 검토 리포트
├── src/
│   ├── app/                             # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                     # 프로젝트 대시보드
│   │   ├── projects/
│   │   │   └── [id]/
│   │   │       ├── page.tsx             # 프로젝트 설정
│   │   │       ├── episodes/
│   │   │       │   ├── page.tsx         # 에피소드 목록
│   │   │       │   └── [episodeId]/
│   │   │       │       └── page.tsx     # 에피소드 에디터
│   │   │       └── characters/
│   │   │           └── page.tsx         # 캐릭터 관리
│   │   ├── api/
│   │   │   ├── projects/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── characters/
│   │   │   │       │   └── route.ts
│   │   │   │       └── episodes/
│   │   │   │           └── route.ts
│   │   │   ├── characters/
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── episodes/
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── generate/
│   │   │   │   ├── bootstrap/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── outline/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── episode/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── revise/
│   │   │   │   │   └── route.ts
│   │   │   │   └── summary/
│   │   │   │       └── route.ts
│   │   │   └── jobs/                    # v2 신규: 작업 상태 API
│   │   │       └── [id]/
│   │   │           └── route.ts
│   │   └── globals.css
│   ├── components/
│   │   ├── layout/
│   │   │   ├── app-layout.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── top-nav.tsx
│   │   ├── projects/
│   │   │   ├── project-card.tsx
│   │   │   ├── project-form.tsx
│   │   │   └── bootstrap-dialog.tsx
│   │   ├── episodes/
│   │   │   ├── episode-list.tsx
│   │   │   └── episode-card.tsx
│   │   ├── editor/
│   │   │   ├── tiptap-editor.tsx
│   │   │   ├── outline-panel.tsx
│   │   │   ├── revision-input.tsx
│   │   │   ├── generation-toolbar.tsx
│   │   │   ├── generation-progress.tsx   # v2 신규: 생성 진행 상태
│   │   │   ├── validation-panel.tsx      # v2 신규: 검증 결과 패널
│   │   │   └── events-panel.tsx          # v2 신규: 이벤트 목록
│   │   ├── characters/
│   │   │   ├── character-list.tsx
│   │   │   ├── character-form.tsx
│   │   │   └── voice-profile-form.tsx    # v2 신규: 보이스 프로파일 편집
│   │   └── ui/                           # shadcn/ui 컴포넌트
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── textarea.tsx
│   │       ├── select.tsx
│   │       ├── badge.tsx
│   │       ├── tabs.tsx
│   │       ├── progress.tsx              # v2 신규: 진행 바
│   │       └── ...
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.sql
│   │   │   └── database.ts
│   │   ├── services/
│   │   │   ├── storage.ts
│   │   │   ├── generation.ts
│   │   │   ├── validation.ts
│   │   │   ├── style-check.ts            # v2 신규: AI 냄새 메트릭
│   │   │   ├── context.ts                # v2 확장: 예산 관리
│   │   │   ├── job-queue.ts              # v2 신규: 작업 큐
│   │   │   └── worker.ts                 # v2 신규: 백그라운드 워커
│   │   ├── prompts/
│   │   │   ├── bootstrap.ts
│   │   │   ├── outline.ts
│   │   │   ├── episode.ts
│   │   │   ├── style.ts                  # v2 신규: 2패스 스타일 교정
│   │   │   ├── revise.ts
│   │   │   ├── summary.ts
│   │   │   └── events.ts                 # v2 신규: 이벤트 추출
│   │   ├── codex.ts                      # v2: spawn + stdin pipe
│   │   ├── schemas.ts                    # v2: 보이스 프로파일, 아웃라인 Zod
│   │   └── utils.ts
│   ├── stores/
│   │   ├── project-store.ts
│   │   ├── episode-store.ts
│   │   ├── editor-store.ts
│   │   └── job-store.ts                  # v2 신규: 작업 상태
│   └── types/
│       └── index.ts
├── data/
│   └── novels.db                         # SQLite DB 파일 (gitignore)
├── tests/
│   ├── services/
│   │   ├── storage.test.ts
│   │   ├── generation.test.ts
│   │   ├── validation.test.ts
│   │   ├── style-check.test.ts           # v2 신규
│   │   ├── context.test.ts               # v2 신규
│   │   └── job-queue.test.ts             # v2 신규
│   └── api/
│       ├── projects.test.ts
│       ├── episodes.test.ts
│       └── jobs.test.ts                  # v2 신규
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── .gitignore
└── .env.local                            # CODEX_PATH 등 설정
```

---

## 11. Codex CLI 호출 구현 설계 (v2: stdin pipe + spawn)

### 11-1. `lib/codex.ts` — 핵심 유틸리티

```typescript
import { spawn } from 'child_process';

interface CodexOptions {
  model?: string;        // 기본: gpt-5.2
  timeout?: number;      // 기본: 작업별 차등
  json?: boolean;        // JSON 출력 모드
}

interface CodexResult {
  content: string;
  exitCode: number;
  duration: number;
}

// v2: stdin 파이프 방식 (긴 프롬프트 안전 전달)
export function codexExec(
  prompt: string,
  options: CodexOptions = {}
): Promise<CodexResult> {
  const {
    model = 'gpt-5.2',
    timeout = 180_000,  // 기본 3분
    json = false,
  } = options;

  return new Promise((resolve, reject) => {
    const args = ['exec', '-m', model, '--stdin'];
    if (json) args.push('--json');

    const child = spawn('codex', args, {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const start = Date.now();

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        content: normalizeOutput(stdout.trim()),
        exitCode: code ?? 0,
        duration: Date.now() - start,
      });
    });

    child.on('error', (err) => {
      reject(new Error(`Codex exec failed: ${err.message}`));
    });

    // stdin으로 프롬프트 전달 (CLI 인자 길이 제한 우회)
    child.stdin.write(prompt);
    child.stdin.end();

    // 타임아웃 핸들링
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Codex exec timed out after ${timeout}ms`));
    }, timeout);

    child.on('close', () => clearTimeout(timer));
  });
}

// 출력 정규화 (ANSI 이스케이프, 디버그 메시지 제거)
function normalizeOutput(raw: string): string {
  return raw
    .replace(/\x1b\[[0-9;]*m/g, '')  // ANSI 색상 코드 제거
    .replace(/^(debug|warn|info):.*$/gm, '')  // 디버그 라인 제거
    .trim();
}
```

### 11-2. 타임아웃/재시도 전략 (v2: 작업별 차등)

| 작업 | 타임아웃 | 재시도 | 비고 |
|---|---|---|---|
| 부트스트랩 | 120초 | 2회 | |
| 아웃라인 생성 | 60초 | 2회 | JSON 출력 |
| 원고 1패스 생성 | **300초** | 2회 | 8,000자 장문 |
| 원고 2패스 교정 | **180초** | 1회 | 재교정 가치 낮음 |
| 수정 지시 | 180초 | 2회 | |
| 요약 생성 | 60초 | 2회 | |
| 이벤트 추출 | 60초 | 1회 | JSON 출력 |

**재시도 조건**:
- 타임아웃
- 빈 응답
- JSON 파싱 실패 (json 모드)
- exit code != 0

**429 레이트 리밋**: 60초 대기 후 재시도

### 11-3. 대안: Codex SDK (TypeScript)

```typescript
import { Codex } from "@openai/codex-sdk";

// Codex SDK가 안정화되면 child_process 대신 사용 가능
// 장점: 네이티브 Promise, 세션 유지, 에러 핸들링 표준화, 스트리밍
// lib/codex.ts를 추상화 레이어로 유지하여 SDK 전환 용이하게 설계
```

---

## 12. 리스크 및 완화 전략

| # | 리스크 | 심각도 | 확률 | 완화 |
|---|---|---|---|---|
| 1 | **Codex CLI gpt-5.2 품질이 웹 ChatGPT보다 낮음** | 중간 | 높음 | reasoning_effort=high, 2패스 생성으로 보정, 필요시 gpt-5-pro 테스트 |
| 2 | **Codex CLI exec 불안정** | 높음 | 중간 | 재시도 로직, 출력 정규화, stdin 파이프, 에러 로깅 |
| 3 | **Pro 레이트 리밋 도달** | 낮음 | 낮음 | 일간 2~5화는 리밋의 5~15%만 소모 |
| 4 | **장편 일관성 저하 (50화+)** | 높음 | 높음 | 이벤트 로그 + 구조화 보이스 + 컨텍스트 예산 관리 |
| 5 | **Codex CLI 정책 변경** | 중간 | 낮음 | codex.ts 추상화 → SDK/API 전환 가능 |
| 6 | **8,000자 단일 생성 한계** | 중간 | 중간 | 분할 생성 (장면별) → 합산 전략 준비 |
| 7 | **비동기 워커 프로세스 관리** | 중간 | 중간 | 동시성 제한 (max 2~3), 좀비 프로세스 정리, graceful shutdown |

---

## 13. 향후 확장 가능성 (Phase 4+, 유보)

현재 간소화 버전에서 제외했지만, **20화 파일럿 이후** 필요성 평가:

| 기능 | 난이도 | 가치 | 비고 |
|---|---|---|---|
| 모드 콜랩스 방지 | 중 | 높음 | 최근 10화 훅/오프닝/갈등 유형 추적 — 20화+ 에서 체감 |
| 아크 페이싱 | 높음 | 중간 | 25화 단위 감정 곡선 — 현재는 플롯 골격으로 충분 |
| 떡밥 추적 | 중 | 높음 | episode_events의 foreshadow로 기초 데이터 확보 중 |
| 골든 코퍼스 | 중 | 중간 | 스타일 메트릭 목표 범위를 수동 설정으로 대체 |
| 장르 플레이북 | 낮음 | 중간 | 프롬프트에 장르 특성 직접 기술로 대체 |
| Gemini 소프트 체크 | 높음 | 중간 | 2패스 + 로컬 하드 체크로 대체 |
| 문피아 출고 포맷 | 낮음 | 높음 | 마크다운 → 플레인텍스트 변환 |

---

## 14. 기존 프로젝트 코드 재활용 가능 목록

`../web-novel/` 프로젝트에서 참고/재활용 가능한 코드:

| 원본 | 재활용 부분 | 수정 필요 |
|---|---|---|
| `packages/mcp-server/src/db/schema.sql` | DB 스키마 패턴 | 5테이블로 재설계 |
| `packages/mcp-server/src/schemas/*.ts` | Zod 스키마 패턴 | 보이스 프로파일, 아웃라인 JSON 추가 |
| `packages/gui/src/components/layout/` | 레이아웃 구조 | Next.js App Router 적용 |
| `packages/gui/src/components/editor/` | Tiptap 에디터 패턴 | 간소화 + 검증/이벤트 탭 추가 |
| `packages/mcp-server/src/validators/style-check.ts` | 문체 검증 로직 | AI 냄새 메트릭 4종으로 재구성 |

---

## 15. 성공 기준

### MVP 완료 조건

- [ ] 프로젝트 생성 시 컨셉 입력 → 시놉시스/캐릭터(**보이스 프로파일 포함**)/세계관/플롯 자동 생성 동작
- [ ] 회차 아웃라인 생성 → **JSON 구조화** + Zod 검증 통과
- [ ] 원고 생성 (**2패스**: 1패스 서사 → 2패스 스타일) 파이프라인 동작
- [ ] **7-메트릭 검증** 자동 실행 + 결과 UI 표시
- [ ] **이벤트 자동 추출** → DB 저장 → 다음 화 컨텍스트 반영
- [ ] **비동기 생성** (작업 큐 + polling) → 프론트엔드 진행 상태 표시
- [ ] 웹 에디터에서 원고 열람/수정/저장 가능
- [ ] 수정 지시 → ChatGPT 5.2 재생성 동작 (**보이스 프로파일 반영**)
- [ ] 직전 회차 요약이 다음 회차 생성 컨텍스트에 포함 (**예산 관리**)
- [ ] 3화 연속 생성 시 캐릭터/세계관 일관성 유지 (육안 확인)
- [ ] 추가 API 비용 $0 (ChatGPT Pro 구독만 사용)

### 품질 목표

- 1화 생성 소요: < 5분 (1패스 + 검증 + 2패스 + 이벤트 추출 + 요약)
- 원고 분량: 7,000~9,000자/화
- AI 냄새 메트릭: 4개 중 3개 이상 목표 범위 내
- 일간 생산 가능량: 2~5화 (Pro 레이트 리밋 내)
- 캐릭터 말투 구별: 대사만 읽고 누가 말하는지 알 수 있음
