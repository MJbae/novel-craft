import { z } from 'zod';

export const SpeechStyleSchema = z.object({
  endings: z.array(z.string()).default([]),
  banned_endings: z.array(z.string()).default([]),
  catchphrases: z.array(z.string()).default([]),
  formality: z
    .enum(['반말_기본', '존댓말_기본', '상대에_따라'])
    .default('반말_기본'),
  avg_dialogue_length: z.string().default('15~40자'),
  emotion_style: z
    .enum(['절제형', '격정형', '유머형', '냉소형', '감성형'])
    .default('절제형'),
});

export const BehavioralRulesSchema = z.object({
  values: z.array(z.string()).default([]),
  never_does: z.array(z.string()).default([]),
  conflict_style: z.string().default('직접 대면'),
});

export const CharacterRoleSchema = z.enum(['main', 'supporting', 'minor']);

export const EpisodeStatusSchema = z.enum([
  'draft',
  'outline',
  'generating',
  'generated',
  'edited',
  'final',
]);

export const JobTypeSchema = z.enum([
  'bootstrap',
  'outline',
  'episode_pass1',
  'episode_pass2',
  'revise',
  'summary',
  'event_extract',
]);

export const JobStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
]);

export const JobStepSchema = z.enum([
  'pass1_generating',
  'validating',
  'pass2_correcting',
  'extracting_events',
  'summarizing',
]);

export const EventTypeSchema = z.enum([
  'plot',
  'character_state',
  'relationship',
  'foreshadow',
]);

export const OutlineSceneSchema = z.object({
  scene_number: z.number().int().min(1),
  goal: z.string().min(1),
  conflict: z.string().min(1),
  twist: z.string().nullable(),
  characters: z.array(z.string()),
  emotion_intensity: z.number().int().min(1).max(10),
});

export const OutlineSchema = z.object({
  scenes: z.array(OutlineSceneSchema).min(3).max(5),
  ending_hook: z.string().min(1),
  estimated_word_count: z.number().int().default(8000),
});

export const StyleMetricsSchema = z.object({
  wordCount: z.number(),
  sceneCount: z.number(),
  endingHookValid: z.boolean(),
  avgSentenceLength: z.number(),
  dialogueRatio: z.number(),
  explanationDensity: z.number(),
  repetitionRate: z.number(),
});

export const ValidationWarningSchema = z.object({
  metric: z.string(),
  actual: z.number(),
  expected: z.string(),
  severity: z.enum(['error', 'warning']),
  suggestion: z.string(),
});

export const ValidationResultSchema = z.object({
  metrics: StyleMetricsSchema,
  warnings: z.array(ValidationWarningSchema),
  passed: z.boolean(),
});

export const EpisodeEventSchema = z.object({
  event_type: EventTypeSchema,
  description: z.string().min(1),
  characters_involved: z.array(z.string()),
});

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  genre: z.string().min(1),
  tone: z.string().optional(),
  protagonist_keywords: z.string().min(1),
  supporting_keywords: z.string().optional(),
  reference_works: z.string().optional(),
  banned_elements: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  genre: z.string().min(1).optional(),
  tone: z.string().optional(),
  synopsis: z.string().optional(),
  worldbuilding: z.string().optional(),
  plot_outline: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
});

export const CreateCharacterSchema = z.object({
  name: z.string().min(1),
  role: CharacterRoleSchema.default('main'),
  personality: z.string().optional(),
  speech_style: SpeechStyleSchema.default({}),
  behavioral_rules: BehavioralRulesSchema.default({}),
  appearance: z.string().optional(),
  background: z.string().optional(),
  relationships: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdateCharacterSchema = CreateCharacterSchema.partial();

export const CreateEpisodeSchema = z.object({
  episode_number: z.number().int().min(1),
  title: z.string().optional(),
});

export const UpdateEpisodeSchema = z.object({
  title: z.string().optional(),
  status: EpisodeStatusSchema.optional(),
  outline: OutlineSchema.optional(),
  content: z.string().optional(),
  summary: z.string().optional(),
  user_notes: z.string().optional(),
});

export const GenerateBootstrapSchema = z.object({
  project_id: z.string().min(1),
});

export const GenerateOutlineSchema = z.object({
  project_id: z.string().min(1),
  episode_number: z.number().int().min(1),
  additional_instructions: z.string().optional(),
});

export const GenerateEpisodeSchema = z.object({
  project_id: z.string().min(1),
  episode_number: z.number().int().min(1),
  outline: OutlineSchema.optional(),
  additional_instructions: z.string().optional(),
});

export const GenerateReviseSchema = z.object({
  project_id: z.string().min(1),
  episode_id: z.string().min(1),
  revision_instruction: z.string().min(1),
});

export const GenerateSummarySchema = z.object({
  project_id: z.string().min(1),
  episode_id: z.string().min(1),
});

export const BootstrapCharacterSchema = z.object({
  name: z.string(),
  role: CharacterRoleSchema,
  personality: z.string(),
  speech_style: SpeechStyleSchema,
  behavioral_rules: BehavioralRulesSchema,
  appearance: z.string(),
  background: z.string(),
  relationships: z.string(),
});

export const BootstrapResultSchema = z.object({
  synopsis: z.string(),
  worldbuilding: z.string(),
  characters: z.array(BootstrapCharacterSchema),
  plot_outline: z.string(),
});
