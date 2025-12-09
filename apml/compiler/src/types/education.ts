/**
 * APML-EDU Specific TypeScript Types
 *
 * Runtime TypeScript interfaces for APML-EDU constructs.
 * These types are used in the generated Vue application.
 */

// ============================================================================
// Content Hierarchy Types
// ============================================================================

export interface Course {
  course_code: string;
  version: string;
  target_language: string;
  known_language: string;
  total_seeds: number;
  status?: string;
  created_at?: Date;
}

export interface Seed {
  seed_id: string;
  course_code: string;
  known_text: string;
  target_text: string;
  sequence_number: number;
  known_audio_uuid?: string;
  target_audio_uuid?: string;
}

export interface LEGO {
  lego_id: string;
  seed_id: string;
  known_text: string;
  target_text: string;
  type: 'A' | 'M'; // Atomic or Molecular
  is_new: boolean;
  presentation_text?: string;
  known_audio_uuid?: string;
  target_audio_uuid?: string;
  presentation_audio_uuid?: string;
}

export interface Basket {
  basket_id: string;
  lego_id: string;
  phrases: PracticePhrase[];
}

export interface PracticePhrase {
  phrase_id: string;
  lego_id: string;
  known_text: string;
  target_text: string;
  phrase_type: 'COMP' | 'LEGO' | 'DEBU' | 'ETER';
  phrase_order: number;
  is_component?: boolean;
  is_debut?: boolean;
  known_audio_uuid?: string;
  target1_audio_uuid?: string;
  target2_audio_uuid?: string;
}

// ============================================================================
// Audio Types
// ============================================================================

export interface AudioSample {
  uuid: string;
  text_normalized: string;
  language: string;
  voice_id: string;
  role: 'source' | 'target1' | 'target2' | 'presentation';
  cadence: 'natural' | 'slow' | 'fast';
  s3_key: string;
  duration_ms: number;
  is_human_voiced: boolean;
  approved: boolean;
  created_at: Date;
}

export interface Voice {
  voice_id: string;
  provider: 'azure' | 'elevenlabs' | 'google' | 'human';
  language: string;
  role: string;
  name?: string;
}

// ============================================================================
// Production/Runtime Types
// ============================================================================

export interface LearnerSession {
  session_id: string;
  learner_id: string;
  course_code: string;
  started_at: Date;
  ended_at?: Date;
  duration_ms?: number;
  sets_completed: number;
  cycles_completed: number;
  legos_introduced: string[];
  legos_reviewed: string[];
  accuracy_rate?: number;
}

export interface Cycle {
  cycle_id: string;
  phrase_id: string;
  lego_id: string;
  session_id: string;
  started_at: Date;
  completed_at?: Date;
  learner_response?: string;
  correct?: boolean;
}

export interface Set {
  set_id: string;
  session_id: string;
  lego_id: string;
  methodology: 'DEBU' | 'ETER';
  cycles: Cycle[];
  started_at: Date;
  completed_at?: Date;
}

// ============================================================================
// Learner Progress Types
// ============================================================================

export interface LearnerProgress {
  learner_id: string;
  course_code: string;
  current_seed: number;
  total_seeds_completed: number;
  total_cycles: number;
  total_duration_ms: number;
  accuracy_rate: number;
  difficulty_level: 'easy' | 'normal' | 'challenging';
  last_session_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface LEGOProgress {
  lego_id: string;
  learner_id: string;
  introduced_at: Date;
  last_practiced_at: Date;
  practice_count: number;
  accuracy_rate: number;
  eter_schedule_position: number;
  mastery_level: 'introduced' | 'practicing' | 'mastered';
}

// ============================================================================
// Methodology Parameters
// ============================================================================

export interface MethodologyParameters {
  debu_count: number;
  eter_schedule: ETERScheduleItem[];
  response_pause: number;
  cycle_pause: number;
  echo_pause: number;
  speed_multiplier: number;
  target_cadence: 'natural' | 'slow' | 'fast';
}

export interface ETERScheduleItem {
  offset: number; // N-1, N-2, etc.
  cycles: number;
}

// ============================================================================
// Adaptation Types
// ============================================================================

export interface AdaptationEvent {
  event_id: string;
  learner_id: string;
  timestamp: Date;
  rule_name: string;
  trigger: string;
  adjustments: AdaptationAdjustmentRecord[];
  reason: string;
}

export interface AdaptationAdjustmentRecord {
  parameter: string;
  old_value: any;
  new_value: any;
}

export interface DifficultySettings {
  level: 'easy' | 'normal' | 'challenging';
  speed_multiplier: number;
  debu_count: number;
  pause_multiplier: number;
  eter_schedule_type: 'full' | 'standard' | 'aggressive';
}

// ============================================================================
// Production Tools Types (for dashboard)
// ============================================================================

export interface SampleFlag {
  sample_uuid: string;
  status: 'pending' | 'flagged' | 'approved' | 'human_needed' | 'regenerating';
  flag_type?: 'text_edit' | 'regen_tts' | 'needs_human';
  notes?: string;
  flagged_by?: string;
  flagged_at?: Date;
}

export interface GenerationJob {
  job_id: string;
  course_code: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  total_phrases: number;
  generated_count: number;
  failed_count: number;
  started_at: Date;
  completed_at?: Date;
  error_message?: string;
}

export interface PipelineStage {
  stage_name: string;
  phase_number: number;
  status: 'not_started' | 'in_progress' | 'complete' | 'blocked';
  progress: number;
  blockers: PipelineBlocker[];
}

export interface PipelineBlocker {
  blocker_id: string;
  description: string;
  suggested_action: string;
  resolution_url?: string;
  resolved: boolean;
}

// ============================================================================
// Manifest Types
// ============================================================================

export interface CourseManifest {
  course_code: string;
  version: string;
  target_language: string;
  known_language: string;
  total_seeds: number;
  seeds: SeedManifest[];
  metadata: ManifestMetadata;
}

export interface SeedManifest {
  seed_id: string;
  sequence_number: number;
  known_text: string;
  target_text: string;
  known_audio_uuid: string;
  target_audio_uuid: string;
  legos: LEGOManifest[];
}

export interface LEGOManifest {
  lego_id: string;
  type: 'A' | 'M';
  is_new: boolean;
  known_text: string;
  target_text: string;
  presentation_text?: string;
  known_audio_uuid: string;
  target_audio_uuid: string;
  presentation_audio_uuid?: string;
  introduction_items?: IntroductionItem[];
  basket: BasketManifest;
}

export interface IntroductionItem {
  audio_uuid: string;
  type: 'presentation' | 'target_repetition';
}

export interface BasketManifest {
  components?: PracticePhraseManifest[];
  debut: PracticePhraseManifest[];
  debu: PracticePhraseManifest[];
  eter: PracticePhraseManifest[];
}

export interface PracticePhraseManifest {
  phrase_id: string;
  phrase_type: 'COMP' | 'LEGO' | 'DEBU' | 'ETER';
  phrase_order: number;
  known_text: string;
  target_text: string;
  known_audio_uuid: string;
  target1_audio_uuid: string;
  target2_audio_uuid: string;
}

export interface ManifestMetadata {
  compiled_at: Date;
  compiler_version: string;
  apml_version: string;
  audio_coverage: number;
  total_audio_samples: number;
  total_legos: number;
  total_phrases: number;
}
