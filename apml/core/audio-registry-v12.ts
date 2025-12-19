// ============================================================================
// APML Compiled TypeScript Types
// Version: 12.0.0
// Generated: 2025-12-19T15:03:52.854Z
// Compiler: apml-compiler.cjs v2.0
// ============================================================================

/** All unique text units across all courses */
export interface Texts {
  /** Database-assigned unique identifier */
  id: string;
  /** The actual text content to speak */
  content: string;
  /** ISO 639-3 language code (eng, zho, spa, etc.) */
  language: string;
  /** Normalized for deduplication matching */
  content_normalized?: string;
  created_at?: string;
}

/** Insert type for texts (omits auto-generated fields) */
export interface TextsInsert {
  content: string;
  language: string;
}

/** Registry of available voices (TTS and human) */
export interface Voices {
  id: string;
  /** Canonical voice identifier */
  voice_id: string;
  provider: 'azure' | 'elevenlabs' | 'human';
  /** Human-readable name */
  display_name?: string;
  /** Voice locale (e.g., zh-CN, en-GB) */
  locale?: string;
  /** ISO 639-3 codes this voice can speak */
  languages?: string[];
  gender?: 'male' | 'female' | 'neutral';
  /** Can speak multiple languages natively */
  is_multilingual?: boolean;
  is_active?: boolean;
  /** Provider-specific settings */
  metadata?: Record<string, unknown>;
  created_at?: string;
}

/** Insert type for voices (omits auto-generated fields) */
export interface VoicesInsert {
  voice_id: string;
  provider: 'azure' | 'elevenlabs' | 'human';
  display_name?: string;
  locale?: string;
  languages?: string[];
  gender?: 'male' | 'female' | 'neutral';
  is_multilingual?: boolean;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

/** Audio renderings - each is a specific voice speaking specific text */
export interface AudioFiles {
  /** Database-assigned, NOT hash-computed */
  id: string;
  /** What text this audio speaks */
  text_id: string;
  /** Which voice speaks it */
  voice_id: string;
  /** Speaking speed */
  cadence: 'slow' | 'natural';
  /** S3 bucket containing the file */
  s3_bucket?: string;
  /** S3 object key (path) */
  s3_key?: string;
  /** Audio duration in milliseconds */
  duration_ms?: number;
  file_size_bytes?: number;
  source?: 'tts_azure' | 'tts_elevenlabs' | 'human_recording';
  created_at?: string;
}

/** Insert type for audio_files (omits auto-generated fields) */
export interface AudioFilesInsert {
  text_id: string;
  voice_id: string;
  cadence: 'slow' | 'natural';
  s3_bucket?: string;
  s3_key?: string;
  duration_ms?: number;
  file_size_bytes?: number;
  source?: 'tts_azure' | 'tts_elevenlabs' | 'human_recording';
}

/** Which courses use which audio files */
export interface CourseAudio {
  id: string;
  course_code: string;
  audio_id: string;
  /** How this course uses the audio */
  role: 'target1' | 'target2' | 'known' | 'presentation';
  /** Seed/LEGO reference (e.g., S0001L01) */
  context?: string;
  /** Order within course */
  position?: number;
  created_at?: string;
}

/** Insert type for course_audio (omits auto-generated fields) */
export interface CourseAudioInsert {
  course_code: string;
  audio_id: string;
  role: 'target1' | 'target2' | 'known' | 'presentation';
  context?: string;
  position?: number;
}
