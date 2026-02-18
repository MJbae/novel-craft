import type {
  Character,
  Episode,
  EpisodeEventRow,
  Project,
  ContextBudget,
} from '@/types';

type SectionName = keyof ContextBudget;
type ContentSectionName = Exclude<SectionName, 'reserve'>;

const TOTAL_BUDGET = 12000;

const DEFAULT_PERCENTAGES: Record<SectionName, number> = {
  rules: 0.1,
  worldbuilding: 0.1,
  characters: 0.15,
  previousSummaries: 0.2,
  eventLog: 0.1,
  plotPosition: 0.05,
  outline: 0.15,
  userInstructions: 0.05,
  reserve: 0.1,
};

const SECTION_PRIORITIES: Record<SectionName, number> = {
  rules: 10,
  characters: 9,
  previousSummaries: 8,
  outline: 7,
  eventLog: 6,
  worldbuilding: 5,
  plotPosition: 4,
  userInstructions: 3,
  reserve: 1,
};

const SECTION_LABELS: Record<ContentSectionName, string> = {
  rules: '작성 규칙',
  worldbuilding: '세계관',
  characters: '캐릭터 프로파일',
  previousSummaries: '이전 에피소드 요약',
  eventLog: '이벤트 로그',
  plotPosition: '플롯 위치',
  outline: '아웃라인',
  userInstructions: '추가 지시',
};

const CONTENT_SECTIONS: readonly ContentSectionName[] = [
  'rules',
  'worldbuilding',
  'characters',
  'previousSummaries',
  'eventLog',
  'plotPosition',
  'outline',
  'userInstructions',
];

function truncateToLimit(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const truncated = text.slice(0, limit);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('。'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?'),
  );
  if (lastSentenceEnd > limit * 0.5) {
    return truncated.slice(0, lastSentenceEnd + 1);
  }
  return truncated + '…';
}

function formatVoiceProfile(char: Character): string {
  const lines: string[] = [];
  lines.push(`[${char.name}] (${char.role})`);
  if (char.personality) lines.push(`성격: ${char.personality}`);

  const style = char.speech_style;
  if (style.endings.length > 0) lines.push(`어미: ${style.endings.join(', ')}`);
  if (style.banned_endings.length > 0)
    lines.push(`금지 어미: ${style.banned_endings.join(', ')}`);
  if (style.catchphrases.length > 0)
    lines.push(`말버릇: ${style.catchphrases.join(', ')}`);
  lines.push(`격식: ${style.formality}`);
  lines.push(`대화 길이: ${style.avg_dialogue_length}`);
  lines.push(`감정 스타일: ${style.emotion_style}`);

  const rules = char.behavioral_rules;
  if (rules.values.length > 0)
    lines.push(`가치관: ${rules.values.join(', ')}`);
  if (rules.never_does.length > 0)
    lines.push(`절대 하지 않는 것: ${rules.never_does.join(', ')}`);
  lines.push(`갈등 스타일: ${rules.conflict_style}`);

  return lines.join('\n');
}

function buildRulesSection(project: Project, limit: number): string {
  const rules = [
    `장르: ${project.genre}`,
    project.tone ? `톤: ${project.tone}` : null,
    '한국 웹소설 형식으로 작성',
    '### 구분자로 장면 전환',
    '대화는 쌍따옴표("") 사용',
    '7,000~9,000자 분량',
    '엔딩 훅 필수',
  ]
    .filter(Boolean)
    .join('\n');
  return truncateToLimit(rules, limit);
}

function buildWorldbuildingSection(
  project: Project,
  limit: number,
): string {
  if (!project.worldbuilding) return '';
  return truncateToLimit(project.worldbuilding, limit);
}

function buildCharactersSection(
  characters: Character[],
  limit: number,
): string {
  if (characters.length === 0) return '';
  const profiles = characters.map(formatVoiceProfile);
  const joined = profiles.join('\n\n');
  return truncateToLimit(joined, limit);
}

function buildSummariesSection(
  recentEpisodes: Episode[],
  limit: number,
): string {
  const withSummary = recentEpisodes
    .filter((ep) => ep.summary)
    .sort((a, b) => b.episode_number - a.episode_number)
    .slice(0, 3);
  if (withSummary.length === 0) return '';
  const perEpisodeLimit = Math.floor(limit / withSummary.length);
  const parts = withSummary.map(
    (ep) =>
      `[${ep.episode_number}화] ${truncateToLimit(ep.summary!, perEpisodeLimit)}`,
  );
  return parts.join('\n\n');
}

function buildEventLogSection(
  events: EpisodeEventRow[],
  limit: number,
): string {
  if (events.length === 0) return '';
  const lines = events.map(
    (e) =>
      `[${e.event_type}] ${e.description} (${e.characters_involved.join(', ')})`,
  );
  return truncateToLimit(lines.join('\n'), limit);
}

function buildPlotPositionSection(
  plotPosition: string,
  limit: number,
): string {
  return truncateToLimit(plotPosition, limit);
}

function buildOutlineSection(
  outline: string | undefined,
  limit: number,
): string {
  if (!outline) return '';
  return truncateToLimit(outline, limit);
}

function buildUserInstructionsSection(
  instructions: string | undefined,
  limit: number,
): string {
  if (!instructions) return '';
  return truncateToLimit(instructions, limit);
}

function buildAllSections(
  params: AssembleContextParams,
  budgets: Record<ContentSectionName, number>,
): Record<ContentSectionName, string> {
  return {
    rules: buildRulesSection(params.project, budgets.rules),
    worldbuilding: buildWorldbuildingSection(
      params.project,
      budgets.worldbuilding,
    ),
    characters: buildCharactersSection(params.characters, budgets.characters),
    previousSummaries: buildSummariesSection(
      params.recentEpisodes,
      budgets.previousSummaries,
    ),
    eventLog: buildEventLogSection(params.activeEvents, budgets.eventLog),
    plotPosition: buildPlotPositionSection(
      params.plotPosition,
      budgets.plotPosition,
    ),
    outline: buildOutlineSection(params.outline, budgets.outline),
    userInstructions: buildUserInstructionsSection(
      params.userInstructions,
      budgets.userInstructions,
    ),
  };
}

function measureSections(
  params: AssembleContextParams,
): Record<ContentSectionName, number> {
  const unlimited: Record<ContentSectionName, number> = {
    rules: Number.MAX_SAFE_INTEGER,
    worldbuilding: Number.MAX_SAFE_INTEGER,
    characters: Number.MAX_SAFE_INTEGER,
    previousSummaries: Number.MAX_SAFE_INTEGER,
    eventLog: Number.MAX_SAFE_INTEGER,
    plotPosition: Number.MAX_SAFE_INTEGER,
    outline: Number.MAX_SAFE_INTEGER,
    userInstructions: Number.MAX_SAFE_INTEGER,
  };
  const sections = buildAllSections(params, unlimited);

  const measurements = {} as Record<ContentSectionName, number>;
  for (const name of CONTENT_SECTIONS) {
    measurements[name] = sections[name].length;
  }
  return measurements;
}

function allocateBudget(
  measurements: Record<ContentSectionName, number>,
  priorities: Record<SectionName, number>,
  totalBudget: number,
): Record<ContentSectionName, number> {
  const allocated = {} as Record<ContentSectionName, number>;
  let savings = Math.floor(totalBudget * DEFAULT_PERCENTAGES.reserve);
  const needsMore: Partial<Record<ContentSectionName, number>> = {};

  for (const name of CONTENT_SECTIONS) {
    const defaultAlloc = Math.floor(totalBudget * DEFAULT_PERCENTAGES[name]);
    const actual = measurements[name];

    if (actual <= defaultAlloc) {
      allocated[name] = actual;
      savings += defaultAlloc - actual;
    } else {
      allocated[name] = defaultAlloc;
      needsMore[name] = actual - defaultAlloc;
    }
  }

  const overSections = (Object.keys(needsMore) as ContentSectionName[]).sort(
    (a, b) => priorities[b] - priorities[a],
  );

  let sumRemainingPriorities = overSections.reduce(
    (sum, s) => sum + priorities[s],
    0,
  );

  for (const name of overSections) {
    if (savings <= 0 || sumRemainingPriorities <= 0) break;
    const demand = needsMore[name]!;
    const share = Math.min(
      demand,
      Math.floor((savings * priorities[name]) / sumRemainingPriorities),
    );
    allocated[name] += share;
    savings -= share;
    sumRemainingPriorities -= priorities[name];
  }

  if (savings > 0) {
    for (const name of overSections) {
      const stillNeeds = measurements[name] - allocated[name];
      if (stillNeeds > 0) {
        const extra = Math.min(stillNeeds, savings);
        allocated[name] += extra;
        savings -= extra;
        if (savings <= 0) break;
      }
    }
  }

  return allocated;
}

interface AssembleContextParams {
  project: Project;
  characters: Character[];
  recentEpisodes: Episode[];
  activeEvents: EpisodeEventRow[];
  plotPosition: string;
  outline?: string;
  userInstructions?: string;
}

export interface AssembleContextOptions {
  totalBudget?: number;
  priorities?: Record<string, number>;
}

export interface ContextUsageReport {
  totalBudget: number;
  usedChars: number;
  sections: Array<{
    name: string;
    defaultAllocation: number;
    actualSize: number;
    finalAllocation: number;
    truncated: boolean;
  }>;
}

export function assembleContext(
  params: AssembleContextParams,
  options?: AssembleContextOptions,
): string {
  return assembleContextWithReport(params, options).context;
}

export function assembleContextWithReport(
  params: AssembleContextParams,
  options?: AssembleContextOptions,
): { context: string; report: ContextUsageReport } {
  const totalBudget = options?.totalBudget ?? TOTAL_BUDGET;

  const mergedPriorities: Record<SectionName, number> = {
    ...SECTION_PRIORITIES,
  };
  if (options?.priorities) {
    for (const [key, value] of Object.entries(options.priorities)) {
      if (key in SECTION_PRIORITIES) {
        mergedPriorities[key as SectionName] = value;
      }
    }
  }

  const measurements = measureSections(params);
  const allocated = allocateBudget(measurements, mergedPriorities, totalBudget);
  const builtSections = buildAllSections(params, allocated);

  const outputSections: Array<{ label: string; content: string }> = [];
  const reportSections: ContextUsageReport['sections'] = [];

  for (const name of CONTENT_SECTIONS) {
    const content = builtSections[name];
    const defaultAlloc = Math.floor(totalBudget * DEFAULT_PERCENTAGES[name]);

    reportSections.push({
      name,
      defaultAllocation: defaultAlloc,
      actualSize: measurements[name],
      finalAllocation: allocated[name],
      truncated: measurements[name] > allocated[name],
    });

    if (content) {
      outputSections.push({ label: SECTION_LABELS[name], content });
    }
  }

  const context = outputSections
    .map((s) => `## ${s.label}\n\n${s.content}`)
    .join('\n\n---\n\n');

  return {
    context,
    report: {
      totalBudget,
      usedChars: context.length,
      sections: reportSections,
    },
  };
}
