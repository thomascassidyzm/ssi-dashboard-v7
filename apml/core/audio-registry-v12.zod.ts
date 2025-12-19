// ============================================================================
// APML Compiled Zod Schemas
// Version: 12.0.0
// Generated: 2025-12-19T15:04:07.147Z
// Compiler: apml-compiler.cjs v2.0
// ============================================================================

import { z } from 'zod';

/** All unique text units across all courses */
export const textsSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  content: z.string(),
  language: z.string(),
  content_normalized: z.string().nullable().optional(),
  created_at: z.string().datetime().nullable().optional(),
});

export type Texts = z.infer<typeof textsSchema>;

/** Registry of available voices (TTS and human) */
export const voicesSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  voice_id: z.string(),
  provider: z.enum(['azure', 'elevenlabs', 'human']),
  display_name: z.string().nullable().optional(),
  locale: z.string().nullable().optional(),
  languages: z.array(z.string()).nullable().optional(),
  gender: z.enum(['male', 'female', 'neutral']).nullable().optional(),
  is_multilingual: z.boolean().nullable().optional(),
  is_active: z.boolean().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  created_at: z.string().datetime().nullable().optional(),
});

export type Voices = z.infer<typeof voicesSchema>;

/** Audio renderings - each is a specific voice speaking specific text */
export const audioFilesSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  text_id: z.string().uuid(),
  voice_id: z.string().uuid(),
  cadence: z.enum(['slow', 'natural']),
  s3_bucket: z.string().nullable().optional(),
  s3_key: z.string().nullable().optional(),
  duration_ms: z.number().int().nullable().optional(),
  file_size_bytes: z.number().int().nullable().optional(),
  source: z.enum(['tts_azure', 'tts_elevenlabs', 'human_recording']).nullable().optional(),
  created_at: z.string().datetime().nullable().optional(),
});

export type AudioFiles = z.infer<typeof audioFilesSchema>;

/** Which courses use which audio files */
export const courseAudioSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  course_code: z.string(),
  audio_id: z.string().uuid(),
  role: z.enum(['target1', 'target2', 'known', 'presentation']),
  context: z.string().nullable().optional(),
  position: z.number().int().nullable().optional(),
  created_at: z.string().datetime().nullable().optional(),
});

export type CourseAudio = z.infer<typeof courseAudioSchema>;
