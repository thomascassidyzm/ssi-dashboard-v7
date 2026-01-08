/**
 * Production Suite Type Definitions
 *
 * Type definitions for the Course Production Suite components
 * Based on APML v11.0 and Course Production Suite Architecture
 */

// Sample Status States
// Simplified model: items are either 'pending_regen' or not flagged at all
export type SampleStatus =
  | 'pending_regen'  // Item marked for regeneration (stays until user clicks Done)
  // Legacy statuses (kept for backwards compatibility)
  | 'pending'
  | 'flagged_text_edit'
  | 'flagged_regen_tts'
  | 'flagged_human_needed'
  | 'in_pipeline'
  | 'tts_complete'
  | 'tts_failed'
  | 'in_recording'
  | 'recorded'
  | 'needs_review'
  | 'approved'
  | 'rejected'
  | 'complete';

// Flag Types
export type FlagType = 'text_edit' | 'regen_tts' | 'human_needed';

// LEGO Types
export type LegoType = 'A' | 'M'; // Atomic or Molecular

// Phrase Types
export type PhraseType = 'COMP' | 'LEGO' | 'DEBU' | 'ETER' | 'PRAC';

// Cadence Types
export type Cadence = 'natural' | 'slow';

// Role Types
export type Role = 'source' | 'target';

// Course Manifest Structure
export interface CourseManifest {
  version: string;
  course_code: string;
  target_language: string;
  known_language: string;
  total_seeds: number;
  generated_at: string;
  seeds: Seed[];
}

export interface Seed {
  seed_id: string;
  seed_pair: [string, string]; // [target, known]
  legos: Lego[];
  cycles: Cycle[];
}

export interface Lego {
  id: string;
  type: LegoType;
  target: string;
  known: string;
  is_new?: boolean;
  components?: [string, string][]; // For M-type
}

export interface Cycle {
  uuid: string;
  type: 'introduction' | 'lego_debut' | 'lego_component' | 'practice';
  seed_id: string;
  lego_id?: string;

  // The two key phrases
  target: string;
  known: string;

  // Audio references
  target_audio_uuid: string;
  known_audio_uuid: string;

  // Context for QA tools
  context: {
    is_debut?: boolean;
    is_component?: boolean;
    pattern_id?: string;
    cumulative_legos: number;
  };
}

// Sample Flag Structure
export interface SampleFlag {
  uuid: string;
  status: SampleStatus;
  flags: {
    text_edit: boolean;
    audio_regenerate: boolean;
    human_recording: boolean;
  };
  notes: string;
  flagged_by: string;
  flagged_at: string;

  context: {
    seed_id: string;
    cycle_index: number;
    phrase: string;
    voice_id: string;
  };

  history: StatusChange[];
}

export interface StatusChange {
  status: SampleStatus;
  timestamp: string;
  user: string;
  note?: string;
}

// Audio Metadata
export interface AudioMetadata {
  uuid: string;
  s3_key: string;
  duration_ms: number;
  file_size_bytes: number;
  voice_id: string;
  generation_method: 'tts' | 'human';
  created_at: string;
  created_by: string;
  checksum_md5: string;
  waveform_peaks?: number[];

  metadata: {
    seed_id?: string;
    phrase: string;
    language: string;
    tts_engine?: string;
    voice_variant?: string;
  };
}

// Audio Sample for playback
export interface AudioSample {
  uuid: string;
  text: string;
  role: Role;
  cadence: Cadence;
  voice_id: string;
  url?: string;
  duration_ms?: number;
  status?: SampleStatus;
  flag?: SampleFlag;
}

// Phrase Row Data (combines cycle info with audio)
export interface PhraseRowData {
  phrase_id: string;
  type: PhraseType;
  known_text: string;
  target_text: string;

  // Audio samples (legacy - full AudioSample objects)
  known_audio?: AudioSample;
  target_audio_1?: AudioSample; // natural cadence
  target_audio_2?: AudioSample; // slow cadence

  // Audio UUIDs (from script-view endpoint - for direct S3 playback)
  known_audio_uuid?: string;
  target1_audio_uuid?: string;
  target2_audio_uuid?: string;

  // S3 keys (v13 format - for direct URL construction)
  known_s3_key?: string;
  target1_s3_key?: string;
  target2_s3_key?: string;

  // Flag data
  flag_status?: SampleStatus;
  is_flagged: boolean;

  // Context
  seed_id: string;
  cycle_index: number;
  is_debut?: boolean;
  is_component?: boolean;
}

// LEGO Row Data
export interface LegoRowData {
  lego_id: string;
  type: LegoType;
  target: string;
  known: string;
  is_new: boolean;
  phrases: PhraseRowData[];
  expanded: boolean;
}

// Seed Row Data
export interface SeedRowData {
  seed_id: string;
  known_text: string;
  target_text: string;
  legos: LegoRowData[];
  introduction_phrases: PhraseRowData[];
  expanded: boolean;
}

// Filter State
export interface FilterState {
  status: SampleStatus | 'all';
  seed_range: {
    start?: string;
    end?: string;
  };
  search_text: string;
  show_flagged_only: boolean;
}

// Playback State
export interface PlaybackState {
  current_sample?: AudioSample;
  is_playing: boolean;
  current_time: number;
  duration: number;
  volume: number;
  playback_rate: number;
}

// Flag Modal Data
export interface FlagModalData {
  visible: boolean;
  sample?: AudioSample;
  flag_type?: FlagType;
  notes: string;
}

// Keyboard Shortcut
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

// WebSocket Events
export type WebSocketEvent =
  | { type: 'sample_flagged'; data: { course_code: string; uuid: string; new_status: SampleStatus } }
  | { type: 'sample_approved'; data: { course_code: string; uuid: string } }
  | { type: 'audio_generated'; data: { course_code: string; uuid: string; s3_key: string } }
  | { type: 'recording_uploaded'; data: { course_code: string; uuid: string; recorded_by: string } };

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface FlagUpdateRequest {
  uuid: string;
  status: SampleStatus;
  note: string;
  flagged_by: string;
}

export interface FlagUpdateResponse {
  success: boolean;
  updated: {
    uuid: string;
    status: SampleStatus;
    flagged_at: string;
  };
  broadcast?: WebSocketEvent;
}
