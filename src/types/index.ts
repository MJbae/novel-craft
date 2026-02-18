import { z } from 'zod';
import {
  SpeechStyleSchema,
  BehavioralRulesSchema,
  CharacterRoleSchema,
  EpisodeStatusSchema,
  JobTypeSchema,
  JobStatusSchema,
  JobStepSchema,
  EventTypeSchema,
  OutlineSceneSchema,
  OutlineSchema,
  StyleMetricsSchema,
  ValidationWarningSchema,
  ValidationResultSchema,
  EpisodeEventSchema,
} from '@/lib/schemas';

export type SpeechStyle = z.infer<typeof SpeechStyleSchema>;
export type BehavioralRules = z.infer<typeof BehavioralRulesSchema>;
export type CharacterRole = z.infer<typeof CharacterRoleSchema>;
export type EpisodeStatus = z.infer<typeof EpisodeStatusSchema>;
export type JobType = z.infer<typeof JobTypeSchema>;
export type JobStatus = z.infer<typeof JobStatusSchema>;
export type JobStep = z.infer<typeof JobStepSchema>;
export type EventType = z.infer<typeof EventTypeSchema>;
export type OutlineScene = z.infer<typeof OutlineSceneSchema>;
export type Outline = z.infer<typeof OutlineSchema>;
export type StyleMetrics = z.infer<typeof StyleMetricsSchema>;
export type ValidationWarning = z.infer<typeof ValidationWarningSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type EpisodeEvent = z.infer<typeof EpisodeEventSchema>;

export interface Project {
  id: string;
  name: string;
  genre: string;
  tone: string | null;
  synopsis: string | null;
  worldbuilding: string | null;
  plot_outline: string | null;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: string;
  project_id: string;
  name: string;
  role: CharacterRole;
  personality: string | null;
  speech_style: SpeechStyle;
  behavioral_rules: BehavioralRules;
  appearance: string | null;
  background: string | null;
  relationships: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Episode {
  id: string;
  project_id: string;
  episode_number: number;
  title: string | null;
  status: EpisodeStatus;
  outline: Outline | null;
  content: string | null;
  previous_content: string | null;
  summary: string | null;
  word_count: number;
  style_metrics: StyleMetrics | null;
  generation_prompt: string | null;
  user_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EpisodeEventRow {
  id: number;
  project_id: string;
  episode_id: string;
  event_type: EventType;
  description: string;
  characters_involved: string[];
  created_at: string;
}

export interface GenerationJob {
  id: string;
  project_id: string;
  episode_id: string | null;
  job_type: JobType;
  status: JobStatus;
  step: JobStep | null;
  progress: number;
  input: Record<string, unknown>;
  output: string | null;
  error: string | null;
  retry_count: number;
  max_retries: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface CodexResult {
  content: string;
  exitCode: number;
  duration: number;
}

export interface CodexOptions {
  model?: string;
  timeout?: number;
}

export interface ContextBudget {
  rules: number;
  worldbuilding: number;
  characters: number;
  previousSummaries: number;
  eventLog: number;
  plotPosition: number;
  outline: number;
  userInstructions: number;
  reserve: number;
}
