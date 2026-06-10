// Unit tests for the recording upload seam's pure helpers.
// Run: npx vitest run services/recording-upload-helpers.test.js
import { describe, it, expect } from 'vitest'
import {
  isScriptModeUpload,
  normalizeProvenance,
  buildProvenanceContext
} from './recording-upload-helpers.cjs'
import { toS3Metadata } from './s3-production-service.cjs'

describe('isScriptModeUpload', () => {
  it('detects explicit metadata.mode === script (new clients, no uuid)', () => {
    expect(isScriptModeUpload(null, { mode: 'script' })).toBe(true)
    expect(isScriptModeUpload(undefined, { mode: 'script' })).toBe(true)
  })

  it('detects legacy client-fabricated script-N ids', () => {
    expect(isScriptModeUpload('script-0', {})).toBe(true)
    expect(isScriptModeUpload('script-142', {})).toBe(true)
  })

  it('treats real course_audio uuids as regeneration mode', () => {
    expect(isScriptModeUpload('A1B2C3D4-0000-4000-8000-1234567890AB', {})).toBe(false)
    expect(isScriptModeUpload('A1B2C3D4-0000-4000-8000-1234567890AB', { mode: 'continuous' })).toBe(false)
  })

  it('does not match script-like-but-not-script strings', () => {
    expect(isScriptModeUpload('script-', {})).toBe(false)
    expect(isScriptModeUpload('descript-1', {})).toBe(false)
    expect(isScriptModeUpload(null, {})).toBe(false)
  })
})

describe('normalizeProvenance', () => {
  it('accepts the snake_case shape the recorders actually send', () => {
    const prov = normalizeProvenance({
      recorded_by: 'autocue-studio',
      recorded_at: '2026-06-10T12:00:00Z',
      session_id: 'session_123',
      mode: 'continuous'
    })
    expect(prov.recordedBy).toBe('autocue-studio')
    expect(prov.recordedAt).toBe('2026-06-10T12:00:00Z')
    expect(prov.sessionId).toBe('session_123')
    expect(prov.mode).toBe('continuous')
  })

  it('still accepts the old camelCase shape', () => {
    const prov = normalizeProvenance({ recordedBy: 'someone@example.com', retakeCount: 2 })
    expect(prov.recordedBy).toBe('someone@example.com')
    expect(prov.retakeCount).toBe(2)
  })

  it('prefers snake_case when both are present and skips absent keys', () => {
    const prov = normalizeProvenance({ recorded_by: 'snake', recordedBy: 'camel' })
    expect(prov.recordedBy).toBe('snake')
    expect('speakerDialect' in prov).toBe(false)
  })

  it('preserves explicit false (speaker_consent)', () => {
    expect(normalizeProvenance({ speaker_consent: false }).speakerConsent).toBe(false)
  })
})

describe('buildProvenanceContext', () => {
  it('carries the chunksString pause map and course/seed identity for script mode', () => {
    const ctx = buildProvenanceContext({
      courseCode: 'mkd_for_fra',
      isScriptMode: true,
      metadata: {
        text: 'сакам да зборувам',
        cadence: 'slow',
        seedNumber: 12,
        phraseIndex: 3,
        coversLegos: ['S0012L01'],
        chunksString: 'сакам|да зборувам',
        scriptSessionId: 'session_99'
      },
      provenance: {},
      s3Key: 'mastered/ABC.mp3'
    })
    expect(ctx.course_code).toBe('mkd_for_fra')
    expect(ctx.mode).toBe('script')
    expect(ctx.chunks_string).toBe('сакам|да зборувам')
    expect(ctx.seed_number).toBe(12)
    expect(ctx.phrase_index).toBe(3)
    expect(ctx.script_session_id).toBe('session_99')
    expect(ctx.s3_key).toBe('mastered/ABC.mp3')
    expect(ctx.course_audio_id).toBeNull()
    expect(ctx.replaced_s3_key).toBeNull()
  })

  it('records the replaced s3_key and row id for regeneration mode (reversibility)', () => {
    const ctx = buildProvenanceContext({
      courseCode: 'mkd_for_fra',
      isScriptMode: false,
      metadata: { text: 'здраво', cadence: 'natural' },
      provenance: { sessionId: 'session_1' },
      s3Key: 'mastered/NEW.mp3',
      courseAudioId: 'OLD-ROW-UUID',
      replacedS3Key: 'mastered/OLD.mp3'
    })
    expect(ctx.mode).toBe('regeneration')
    expect(ctx.course_audio_id).toBe('OLD-ROW-UUID')
    expect(ctx.replaced_s3_key).toBe('mastered/OLD.mp3')
    expect(ctx.script_session_id).toBe('session_1')
  })

  it('keeps seed_number/phrase_index 0 distinct from absent', () => {
    const ctx = buildProvenanceContext({
      courseCode: 'c',
      isScriptMode: true,
      metadata: { seedNumber: 0, phraseIndex: 0 },
      s3Key: 'mastered/X.mp3'
    })
    expect(ctx.seed_number).toBe(0)
    expect(ctx.phrase_index).toBe(0)
  })
})

describe('toS3Metadata', () => {
  it('drops null/undefined and stringifies non-strings (S3 metadata = HTTP headers)', () => {
    const meta = toS3Metadata({ a: 'ok', b: null, c: undefined, d: 7, e: ['S0001L01'], f: { processed: true } })
    expect(meta).toEqual({ a: 'ok', d: '7', e: '["S0001L01"]', f: '{"processed":true}' })
  })

  it('percent-encodes non-ASCII values (Cyrillic target text must not break the PUT)', () => {
    const meta = toS3Metadata({ text: 'сакам да зборувам', chunksString: 'сакам|да зборувам' })
    expect(meta.text).toBe(encodeURIComponent('сакам да зборувам'))
    expect(meta.chunksString).toBe(encodeURIComponent('сакам|да зборувам'))
    expect(/^[\x20-\x7e]*$/.test(meta.text)).toBe(true)
  })
})
