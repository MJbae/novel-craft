# Novel Craft 작업 계획서 — 구현 가능성 및 품질 검토 리포트

> 작성일: 2026-02-18
> 대상: `docs/work-plan.md` (v1)

---

## 판정 요약

**현재 계획은 구현은 가능하나, 두 가지 영역에서 심각한 결함이 있다:**

| 영역 | 판정 | 위험도 |
|---|---|---|
| **구현 가능성** | ⚠️ `codex exec` 동기 호출 구조가 프로덕션에서 불안정 | **높음** |
| **웹소설 품질** | ❌ 원본 PRD의 핵심 품질 요건 대부분 누락 → "출판 가능한" 수준 미달 | **치명적** |

> **결론**: "간소화"는 맞지만, 현재는 **핵심까지 제거**한 상태. 간소화의 목표는 "복잡도를 줄이되 품질은 유지"여야 한다. 아래 검토를 반영하여 계획을 수정해야 한다.

---

## A. 구현 가능성 이슈 (7건)

### A-1. ❌ `codex exec` 동기 호출 — 가장 큰 구조적 결함

**현재 계획**: API Route에서 `child_process.execFile('codex', ...)` → 응답 대기 → 결과 반환

**문제점**:

| 이슈 | 설명 | 심각도 |
|---|---|---|
| **긴 프롬프트의 CLI 인자 전달** | 8,000자 생성을 위한 프롬프트(설정+캐릭터+요약+아웃라인+규칙)가 3,000~5,000자. 셸 인자 길이 제한(`ARG_MAX`)에 걸릴 수 있음 | 높음 |
| **HTTP 타임아웃** | Next.js API Route 기본 타임아웃은 보통 10~60초. 8,000자 생성은 60~300초 소요 가능. Vercel 배포 시 10초 제한 | 높음 |
| **UX 블랙아웃** | 사용자가 1~5분간 스피너만 보게 됨. 진행 상태 없음 | 높음 |
| **프로세스 고아** | 타임아웃/취소 시 codex 프로세스가 남아있을 수 있음 | 중간 |
| **동시 요청** | 여러 생성을 동시에 요청하면 CPU/메모리 경합 | 중간 |

**권장 수정**:
```
현재: API Route → codex exec (동기) → 응답
수정: API Route → 작업 큐 DB 등록 → 즉시 job_id 반환
      백그라운드 워커 → codex exec → 결과 DB 저장
      프론트 → polling/SSE로 진행 상태 확인
```

- `generation_jobs` 테이블 추가 (status: queued → running → completed → failed)
- 프롬프트는 CLI 인자가 아닌 **stdin 파이프** 또는 **임시 파일**로 전달
- 워커 동시성 제한 (최대 2~3개)
- 프론트엔드에 진행 상태 UI (큐 대기 → 생성 중 → 완료)

### A-2. ⚠️ 120초 타임아웃 — 불충분

8,000자 한국어 장문 생성 + 모델 reasoning + CLI 오버헤드를 고려하면:

| 작업 | 예상 소요 |
|---|---|
| 아웃라인 생성 | 15~30초 |
| 원고 생성 (8,000자) | 60~180초 |
| 수정 지시 (전문 재생성) | 60~120초 |
| 요약 생성 | 10~20초 |

**권장**: 작업별 타임아웃 차등 적용. 원고 생성은 **300초** 기본.

### A-3. ⚠️ Codex CLI 출력 파싱 — 불안정 가능

`codex exec`의 stdout이 항상 깨끗한 텍스트/JSON으로 나오리라 보장 없음:

- 디버그 메시지, 경고, ANSI 이스케이프 코드 혼입 가능
- 부분 출력 (타임아웃 시 중간에 끊김)
- JSON 모드에서도 파싱 실패 가능

**권장**: 출력 정규화 레이어 필수. JSON 모드 실패 시 텍스트 모드 폴백. 재시도 2회.

### A-4. ⚠️ better-sqlite3 + Next.js — 주의 필요

| 이슈 | 설명 |
|---|---|
| **네이티브 모듈** | C++ 빌드 필요. Vercel 서버리스에서 동작 불가 |
| **Edge Runtime 불가** | Node.js 런타임 필수 |
| **Hot reload 충돌** | 개발 중 HMR이 DB 연결을 중복 생성할 수 있음 |
| **동시 쓰기** | WAL 모드 + `busy_timeout` 설정 필수 |

**권장**: 싱글톤 DB 인스턴스 + WAL 모드 + `busy_timeout(5000)`. `next.config.ts`에서 `serverExternalPackages: ['better-sqlite3']` 설정.

### A-5. ℹ️ Next.js에서 child_process

- API Route는 반드시 `runtime: 'nodejs'` (Edge 불가)
- 서버리스 배포 시 CLI 바이너리 존재 보장 필요
- **현재는 로컬 실행 전제이므로 큰 문제 아님**, 향후 배포 시 주의

### A-6. ℹ️ 프롬프트 전달 방식

`execFile('codex', ['exec', '-m', 'gpt-5.2', prompt])`에서 `prompt`가 수천 자일 때:

**권장**: stdin 파이프 방식으로 변경
```typescript
const child = spawn('codex', ['exec', '-m', 'gpt-5.2', '--stdin']);
child.stdin.write(prompt);
child.stdin.end();
```

### A-7. ℹ️ Codex SDK 대안

`@openai/codex-sdk` TypeScript SDK가 안정화되면 child_process보다 훨씬 안정적:
- 네이티브 Promise 지원
- 세션 유지 가능
- 에러 핸들링 표준화
- 스트리밍 지원 가능

**권장**: `lib/codex.ts`를 추상화 레이어로 유지하되, SDK 전환 가능하게 인터페이스 설계.

---

## B. 웹소설 품질 갭 분석 (PRD 대비)

### 핵심 질문: "이 서비스로 문피아에 연재할 수 있는가?"

원본 PRD는 "좋은 웹소설"을 위한 구체적인 규격을 정의한다. 현재 계획에서 얼마나 반영되었는지 점검한다.

### B-1. 누락 항목 — 영향도 순 랭킹

| 순위 | PRD 요건 | 현재 계획 | 영향도 | 복원 난이도 |
|---|---|---|---|---|
| **1** | **캐릭터 말투/행동 규칙** (speech_markers, banned_endings, formality, behavioral_rules) | ❌ 프롬프트에 "말투 준수" 한 줄만 | **치명적** — 10화 넘어가면 캐릭터 구분 불가 | 낮음 |
| **2** | **구조화 아웃라인** (장면별 goal/conflict/twist/감정강도 JSON) | ❌ 자유 텍스트 아웃라인만 | **높음** — 장면 구성 품질 불안정 | 낮음 |
| **3** | **엔딩 훅 강제** (마지막 500자 별도 설계, "손가락 멈춤" 포인트) | ⚠️ 프롬프트에 언급만 | **높음** — 문피아 24시간 윈도우 경쟁력 직결 | 낮음 |
| **4** | **이벤트/상태 추적** (캐릭터 부상/위치/능력/관계 변화 기록) | ❌ 없음 | **높음** — 20화+ 에서 모순 발생 필연 | 중간 |
| **5** | **AI 냄새 방지** (설명체 밀도 <5%, 대화 비율 40-60%, 문장 길이 15-35자) | ❌ 없음 | **높음** — 독자 AI 감지 → 이탈 | 낮음 |
| **6** | **2패스 생성** (1패스: 서사 정확성 → 2패스: 문체/호흡 최적화) | ❌ 1패스만 | **높음** — AI 문체 그대로 노출 | 중간 |
| **7** | **컨텍스트 예산 관리** (항목별 토큰 배분: 규칙 10%, 캐논 15%, 요약 20% 등) | ❌ "최근 3화 요약" 단순 결합 | **중간** — 50화+ 에서 컨텍스트 부족/과잉 | 중간 |
| **8** | **모드 콜랩스 방지** (최근 10화 훅/오프닝/갈등 유형 추적) | ❌ 없음 | **중간** — 반복적 패턴으로 독자 이탈 | 중간 |
| **9** | **떡밥(복선) 추적** (planted → hinted → resolved 라이프사이클) | ❌ 없음 | **중간** — 장편의 재미 요소 관리 불가 | 중간 |
| **10** | **아크 레벨 페이싱** (25화 단위 감정 곡선: setup→crisis→climax) | ❌ 없음 | **중간** — 장편 리듬 관리 불가 | 높음 |

### B-2. 프롬프트만으로 해결 가능한가?

현재 계획의 전략: "복잡한 시스템 대신 프롬프트 엔지니어링으로 대체"

**PRD가 이미 경고한 내용**:

> "서비스는 '장면 수/분량'을 **프롬프트로 권고하는 수준에서 끝내면 안 된다**. 장편 연재에서는 어느 순간 분량이 무너지고, 장면이 1개로 쏠리며, 반복 묘사가 늘어난다." (PRD §본문 생성 워크플로우)

즉, PRD 자체가 **프롬프트만으로는 불충분하다**고 명시적으로 선언하고 있다. LLM은 장편에서 반드시 드리프트한다 — 이를 검증 코드로 잡아야 한다.

### B-3. "출판 가능한 품질"을 위한 최소 필수 세트

모든 PRD 기능을 넣지 않되, **이것 없이는 문피아 연재가 불가능**한 최소 세트:

| # | 기능 | 구현 방식 (간소화) | 추가 공수 |
|---|---|---|---|
| 1 | **캐릭터 보이스 프로파일** | DB에 `speech_style` 컬럼을 구조화 JSON으로 확장 (endings, banned, formality) → 프롬프트에 정확히 주입 + 생성 후 정규식 기본 검증 | +0.5일 |
| 2 | **구조화 아웃라인** | 아웃라인을 자유 텍스트 → JSON 구조 (scenes[], 각 scene에 goal/conflict/twist) 변경. Zod 검증 | +0.5일 |
| 3 | **엔딩 훅 검증** | 생성 후 마지막 500자 추출 → "훅 존재 여부" 기본 체크 (분량 + 대화 종료가 아닌지) | +0.3일 |
| 4 | **AI 냄새 메트릭** | 로컬 코드로 4개 메트릭 측정 (평균 문장 길이, 대화 비율, 설명체 비율, 반복 표현). 범위 이탈 시 경고 표시 | +0.5일 |
| 5 | **2패스 생성 (간소화)** | 1패스 후 자동으로 "스타일 교정" 프롬프트 실행. 내용 변경 불가 규칙 명시 | +0.5일 |
| 6 | **이벤트 로그** | `episode_events` 테이블 추가. 매화 생성 후 LLM이 "이번 화 주요 이벤트" JSON 출력 → 저장. 다음 화 컨텍스트에 포함 | +0.5일 |
| 7 | **컨텍스트 예산 관리** | 프롬프트 구성 시 항목별 글자수 제한 적용. 화수 증가에 따라 요약 범위 조정 | +0.3일 |

**추가 공수 합계: ~3일** → 전체 로드맵 8~11일에서 **11~14일**로 조정.

---

## C. 권장 수정사항

### C-1. 아키텍처 변경 — 비동기 작업 큐

```diff
 현재:
 - API Route → codex exec (동기, 120초 대기) → 응답

 변경:
+ API Route → generation_jobs 큐 등록 → job_id 즉시 반환
+ 백그라운드 워커 → codex exec (stdin 파이프) → 결과 DB 저장
+ 프론트엔드 → polling GET /api/jobs/:id (2초 간격) → 완료 시 결과 표시
```

**추가 테이블**:
```sql
CREATE TABLE generation_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  episode_id TEXT,
  job_type TEXT NOT NULL,  -- bootstrap / outline / episode / revise / summary / style_pass
  status TEXT NOT NULL DEFAULT 'queued',  -- queued → running → completed → failed
  input JSON NOT NULL,      -- 프롬프트 구성에 필요한 파라미터
  output TEXT,              -- 생성 결과
  error TEXT,               -- 실패 시 에러 메시지
  retry_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
);
```

### C-2. 캐릭터 DB 스키마 확장

```diff
 CREATE TABLE characters (
   ...
-  speech_style TEXT,
+  speech_style JSON NOT NULL DEFAULT '{}',
+  -- 구조: {
+  --   "endings": ["~거든", "~잖아"],
+  --   "banned_endings": ["~하옵니다"],
+  --   "catchphrases": ["쯧"],
+  --   "formality": "반말_기본",
+  --   "avg_dialogue_length": "15~40자",
+  --   "emotion_style": "절제형"
+  -- }
+  behavioral_rules JSON NOT NULL DEFAULT '{}',
+  -- 구조: {
+  --   "values": ["실용주의"],
+  --   "never_does": ["비겁한 행동"],
+  --   "conflict_style": "직접 대면"
+  -- }
   ...
 );
```

### C-3. 에피소드 이벤트 로그 테이블 추가

```sql
CREATE TABLE episode_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- plot / character_state / relationship / foreshadow
  description TEXT NOT NULL,
  characters_involved TEXT,  -- JSON array of character IDs
  created_at TEXT DEFAULT (datetime('now'))
);
```

### C-4. 생성 파이프라인 변경 — 단계적 생성

```diff
 현재:
 - 아웃라인 생성 → 원고 생성 → 저장

 변경:
+ 아웃라인 생성 (JSON 구조화, Zod 검증)
+   → 사용자 확인
+ 원고 1패스 생성 (서사 정확성 우선)
+   → 기본 검증 (분량, 장면 수, 엔딩 훅 존재)
+   → AI 냄새 메트릭 측정 + 경고 표시
+ 원고 2패스 스타일 교정 (자동, 내용 변경 불가)
+   → 사용자 편집
+ 이벤트 추출 (LLM이 주요 이벤트 JSON 출력)
+   → DB 저장
+ 요약 생성
```

### C-5. 프롬프트 강화 — 캐릭터 보이스 주입

현재 프롬프트의 `{characters_context}` 를:

```diff
 ## 등장 캐릭터
- {characters_context}  ← 이름/성격/관계 텍스트만

+ ## 등장 캐릭터 (말투 규칙 엄격 준수)
+
+ ### 김도현 (주인공)
+ - 성격: 실용주의, 약자보호
+ - 말투 어미: ~거든, ~잖아, ~인데 (이 어미를 자주 사용)
+ - 금지 어미: ~하옵니다, ~이로다 (절대 사용 금지)
+ - 입버릇: "쯧", "어이가 없네"
+ - 존댓말 규칙: 반말 기본, 윗사람에게만 존댓말
+ - 감정 표현: 절제형, 행동으로 표현 (감정 직접 서술 금지)
+ - 절대 하지 않는 것: 비겁한 행동, 무고한 자 희생 방관
+ - 갈등 방식: 직접 대면
+
+ ### 이수아 (히로인)
+ - (동일 구조)
```

### C-6. AI 냄새 체커 — 로컬 코드, 무료

```typescript
// services/style-check.ts

interface StyleMetrics {
  avgSentenceLength: number;  // 목표: 15~35자
  dialogueRatio: number;      // 목표: 40~60%
  explanationDensity: number; // 목표: <5% (~것이다/~때문이다/~할 수 있다)
  repetitionRate: number;     // 목표: <3% (2-gram 반복)
}

function checkStyle(content: string): { metrics: StyleMetrics; warnings: string[] }
```

4개 메트릭 모두 **로컬 코드, 추가 비용 $0**. 생성 후 자동 실행 → 에디터에 경고 배지 표시.

### C-7. 엔딩 훅 검증 — 로컬 코드, 무료

```typescript
function validateEndingHook(content: string): { valid: boolean; reason?: string } {
  const lastChars = content.slice(-500);
  // 1. 500자 이상 존재 확인
  // 2. 대화 종결이 아닌지 (마지막 문장이 대사로 끝나지 않음)
  // 3. 물음표/느낌표/반전 키워드 존재 (기본 휴리스틱)
  // 4. 서술 종결("~했다.") 단독이 아닌지
}
```

---

## D. 수정 후 아키텍처 비교

### 수정 전 (현재)

```
사용자 → Next.js API → codex exec (동기) → 응답
                            ↓
                         SQLite (3 테이블)
```

### 수정 후 (권장)

```
사용자 → Next.js API → generation_jobs 등록 → job_id 반환
              ↓                                    ↑
         백그라운드 워커 ──→ codex exec (stdin) ──→ 결과 DB 저장
              ↓                                    ↓
         검증 파이프라인:                        프론트 polling
         1. Zod 스키마 검증                     (2초 간격)
         2. 분량/장면 수 체크
         3. AI 냄새 메트릭
         4. 엔딩 훅 검증
         5. 2패스 스타일 교정 (자동)
              ↓
         SQLite (5 테이블: projects, characters, episodes,
                           episode_events, generation_jobs)
```

---

## E. 수정 후 로드맵

| Phase | 내용 | 일수 |
|---|---|---|
| **Phase 0** | 스캐폴딩 + DB (5테이블) + Zod 스키마 + Codex 유틸 + 작업 큐 기반 | 1.5일 |
| **Phase 1** | 코어 API + 생성 엔진 (비동기 큐) + 프롬프트 + 검증 파이프라인 | 3~4일 |
| **Phase 2** | 웹 UI (대시보드 + 설정 + 에피소드 목록 + 에디터 + 생성 상태) | 3~4일 |
| **Phase 3** | 2패스 스타일 교정 + AI 냄새 메트릭 UI + 이벤트 추출 + 컨텍스트 최적화 | 2~3일 |
| **총 합계** | | **10~13일** |

---

## F. 유보 항목 (Phase 4+, 필요 시 추가)

아래 항목은 현 시점에서 제외하되, 20화+ 파일럿 이후 필요성 평가:

| 항목 | 판단 근거 |
|---|---|
| 모드 콜랩스 방지 | 10화 이내에서는 체감 어려움, 20화+ 파일럿 후 판단 |
| 아크 페이싱 | 25화 단위이므로 초기에는 플롯 골격으로 충분 |
| 떡밥 추적 | episode_events의 foreshadow 타입으로 기초 데이터 확보, 전용 UI는 후순위 |
| 골든 코퍼스 | Style 메트릭의 목표 범위를 수동 설정으로 대체 |
| 장르 플레이북 | 프롬프트에 장르 특성 직접 기술로 대체 |
| Gemini 소프트 체크 | ChatGPT 5.2로 2패스 + 로컬 하드 체크로 대체 |
