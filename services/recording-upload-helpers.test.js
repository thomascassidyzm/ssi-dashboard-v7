// Unit tests for the recording upload seam's pure helpers.
// Run: npx vitest run services/recording-upload-helpers.test.js
import { describe, it, expect } from 'vitest'
import {
  isScriptModeUpload,
  normalizeProvenance,
  buildProvenanceContext,
  resolveTakeVoiceId,
  resolveRawFormat,
  buildRawTakeKey,
  retainAndProcessTake
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

  it('keeps the pause boundaries the recorder heard inside a slow take', () => {
    // The browser VAD hears every deliberate pause live and used to discard the
    // timings the moment the take was cut, leaving the aligner to rediscover
    // them from the audio. They are the speaker's own account of the cut, and
    // they cost nothing to keep.
    const boundaries = [
      { startMs: 900, endMs: 1600 },
      { startMs: 2400, endMs: 3100 },
      { startMs: 3900, endMs: null }
    ]
    const ctx = buildProvenanceContext({
      courseCode: 'cym_for_eng',
      isScriptMode: true,
      metadata: { cadence: 'slow', chunksString: 'dw i|eisiau|siarad', chunkBoundariesMs: boundaries },
      provenance: {},
      s3Key: 'mastered/DEF.mp3'
    })
    expect(ctx.chunk_boundaries_ms).toEqual(boundaries)
  })

  it('leaves the boundaries null for a take that carried none', () => {
    // Every take recorded before 2026-08-11, and every natural-speed take.
    const ctx = buildProvenanceContext({
      courseCode: 'cym_for_eng',
      isScriptMode: true,
      metadata: { cadence: 'natural' },
      provenance: {},
      s3Key: 'mastered/GHI.mp3'
    })
    expect(ctx.chunk_boundaries_ms).toBeNull()
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

  it('pod mode: carries pod identity + replaced audio id, mode=pod (additive)', () => {
    const ctx = buildProvenanceContext({
      courseCode: 'cym_n_for_eng',
      isScriptMode: false,
      metadata: { mode: 'pod', text: 'Bore da', role: 'target1' },
      provenance: { sessionId: 'session_pod_1' },
      s3Key: 'mastered/TAKE.mp3',
      courseAudioId: 'NEW-ROW-UUID',
      replacedS3Key: null,
      voiceId: 'human_catrin_cym',
      pod: {
        podId: 'cym_n_for_eng:pod-0',
        sentenceId: 'cym_n_for_eng:pod-0:SC01-S001',
        kind: 'target',
        replacedAudioId: 'OLD-TTS-UUID'
      }
    })
    expect(ctx.mode).toBe('pod')
    expect(ctx.pod_id).toBe('cym_n_for_eng:pod-0')
    expect(ctx.sentence_id).toBe('cym_n_for_eng:pod-0:SC01-S001')
    expect(ctx.kind).toBe('target')
    expect(ctx.replaced_audio_id).toBe('OLD-TTS-UUID')
    // existing fields keep their exact names/values (additive extension)
    expect(ctx.course_code).toBe('cym_n_for_eng')
    expect(ctx.role).toBe('target1')
    expect(ctx.voice_id).toBe('human_catrin_cym')
    expect(ctx.text).toBe('Bore da')
    expect(ctx.course_audio_id).toBe('NEW-ROW-UUID')
    expect(ctx.s3_key).toBe('mastered/TAKE.mp3')
    expect(ctx.script_session_id).toBe('session_pod_1')
  })

  it('pod fields round-trip through JSON (quality_notes is the live transport)', () => {
    const ctx = buildProvenanceContext({
      courseCode: 'cym_n_for_eng',
      isScriptMode: false,
      metadata: { mode: 'pod', text: 'Bore da' },
      s3Key: 'mastered/TAKE.mp3',
      pod: { podId: 'p', sentenceId: 's', kind: 'explainer', replacedAudioId: null }
    })
    const back = JSON.parse(JSON.stringify(ctx))
    expect(back.mode).toBe('pod')
    expect(back.pod_id).toBe('p')
    expect(back.sentence_id).toBe('s')
    expect(back.kind).toBe('explainer')
    expect(back.replaced_audio_id).toBeNull()
  })

  it('non-pod calls are byte-identical to before (no pod keys, modes unchanged)', () => {
    const script = buildProvenanceContext({ courseCode: 'c', isScriptMode: true, metadata: {}, s3Key: 'k' })
    expect(script.mode).toBe('script')
    expect('pod_id' in script).toBe(false)
    expect('sentence_id' in script).toBe(false)
    expect('kind' in script).toBe(false)
    expect('replaced_audio_id' in script).toBe(false)
    const regen = buildProvenanceContext({ courseCode: 'c', isScriptMode: false, metadata: {}, s3Key: 'k' })
    expect(regen.mode).toBe('regeneration')
    expect('pod_id' in regen).toBe(false)
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

  it('truncates runaway values at an escape boundary (AWS 2KB total metadata cap)', () => {
    // ~200 Cyrillic chars percent-encode to ~1200 bytes — must come back capped,
    // never sliced mid-%XX escape.
    const long = 'сакам да зборувам македонски '.repeat(10)
    const meta = toS3Metadata({ text: long })
    expect(meta.text.length).toBeLessThanOrEqual(512)
    expect(/%[0-9A-Fa-f]?$/.test(meta.text)).toBe(false)
    expect(/^[\x20-\x7e]*$/.test(meta.text)).toBe(true)
    // Short values pass through untouched
    expect(toS3Metadata({ role: 'target1' }).role).toBe('target1')
  })
})

// The deu_at_for_eng defect (2026-08): a real recordist's takes were stamped
// with de-AT-IngridNeural — voice 1's Azure voice — because the upload seam
// took the slot's voiceId whatever provider held it. A human take must never
// claim a synthetic voice sang it.
describe('resolveTakeVoiceId', () => {
  const config = {
    voices: {
      target1: { name: 'Ingrid', voiceId: 'de-AT-IngridNeural', provider: 'azure' },
      target2: { name: 'Sasha', voiceId: 'human_sasha_wanasky_deu_at', provider: 'human', assignedEmail: 'sasha.wanasky@gmail.com' }
    }
  }

  it('stamps the slot voice when a HUMAN holds the slot', () => {
    const r = resolveTakeVoiceId({ voiceConfig: config, role: 'target2' })
    expect(r).toMatchObject({ voiceId: 'human_sasha_wanasky_deu_at', source: 'slot', warning: null })
  })

  it('server slot voice wins over a disagreeing client voice, and says so', () => {
    const r = resolveTakeVoiceId({ voiceConfig: config, role: 'target2', clientVoiceId: 'human_someone_else' })
    expect(r.voiceId).toBe('human_sasha_wanasky_deu_at')
    expect(r.warning).toMatch(/disagrees/)
  })

  it('NEVER lends a TTS slot voice to a human take', () => {
    const r = resolveTakeVoiceId({ voiceConfig: config, role: 'target1' })
    expect(r.voiceId).toBeNull()
    expect(r.source).toBe('none')
    expect(r.warning).toMatch(/de-AT-IngridNeural/)
  })

  it('uses the client voice on a TTS slot — a minted recordist ahead of assignment', () => {
    const r = resolveTakeVoiceId({ voiceConfig: config, role: 'target1', clientVoiceId: 'human_kai_deu_at' })
    expect(r).toMatchObject({ voiceId: 'human_kai_deu_at', source: 'client' })
  })

  it('is null-safe on an absent config, unknown slot or missing role', () => {
    expect(resolveTakeVoiceId({ voiceConfig: null, role: 'target1' }).voiceId).toBeNull()
    expect(resolveTakeVoiceId({ voiceConfig: config, role: 'target9' }).voiceId).toBeNull()
    expect(resolveTakeVoiceId({ voiceConfig: config, role: null }).voiceId).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Raw-take retention (T-20 standing rule: the RAW capture is retained, always).
// ---------------------------------------------------------------------------

const silentLogger = { log() {}, error() {}, warn() {} }

// A processRecording double that records WHEN it ran relative to the archive
// write — the ordering is the whole point, so it has to be observable.
function makeTake({ audioMeta, retainRaw, calls = [] } = {}) {
  return {
    calls,
    args: {
      rawBuffer: Buffer.from('RAW-WEBM-BYTES'),
      mimeType: 'audio/webm;codecs=opus',
      s3KeyUuid: 'AAAA1111-2222-4333-8444-555566667777',
      audioId: 'AAAA1111-2222-4333-8444-555566667777',
      logger: silentLogger,
      retainRaw: retainRaw || (async ({ rawKey, buffer, contentType }) => {
        calls.push({ step: 'retainRaw', rawKey, bytes: buffer.length, contentType })
      }),
      processRecording: async (buffer, options) => {
        calls.push({ step: 'process', inputFormat: options.inputFormat, bytes: buffer.length })
        return {
          buffer: Buffer.from('MASTERED'),
          metadata: audioMeta || { processed: true, durationMs: 1400, inputSize: buffer.length, outputSize: 8 }
        }
      }
    }
  }
}

describe('resolveRawFormat', () => {
  it('maps every container the recorders send to an extension and Content-Type', () => {
    expect(resolveRawFormat('audio/webm;codecs=opus')).toMatchObject({ inputFormat: 'webm', extension: 'webm', contentType: 'audio/webm' })
    expect(resolveRawFormat('audio/ogg;codecs=opus')).toMatchObject({ extension: 'ogg', contentType: 'audio/ogg' })
    expect(resolveRawFormat('audio/mp4')).toMatchObject({ extension: 'm4a', contentType: 'audio/mp4' })
    expect(resolveRawFormat('audio/x-m4a')).toMatchObject({ extension: 'm4a' })
    expect(resolveRawFormat('audio/wav')).toMatchObject({ extension: 'wav', contentType: 'audio/wav' })
    expect(resolveRawFormat('audio/mpeg')).toMatchObject({ inputFormat: 'mp3', extension: 'mp3', contentType: 'audio/mpeg' })
    expect(resolveRawFormat('audio/mp3')).toMatchObject({ inputFormat: 'mp3', extension: 'mp3' })
  })

  it('falls back to webm rather than refusing a take over an unknown header', () => {
    expect(resolveRawFormat('application/octet-stream').extension).toBe('webm')
    expect(resolveRawFormat(undefined).extension).toBe('webm')
    expect(resolveRawFormat('').extension).toBe('webm')
  })
})

describe('buildRawTakeKey', () => {
  it('shares the mastered object uuid so clip -> original is a string swap', () => {
    const uuid = 'AAAA1111-2222-4333-8444-555566667777'
    expect(buildRawTakeKey(uuid, 'webm')).toBe(`raw/${uuid}.webm`)
    // The join: mastered/{uuid}.mp3 <-> raw/{uuid}.{ext}
    expect(buildRawTakeKey(uuid, 'webm').split('/')[1].replace(/\.webm$/, '')).toBe(uuid)
  })
})

describe('retainAndProcessTake', () => {
  it('PUTs the raw original BEFORE processing, with the right key and Content-Type', async () => {
    const t = makeTake()
    const out = await retainAndProcessTake(t.args)

    expect(t.calls.map(c => c.step)).toEqual(['retainRaw', 'process'])
    expect(t.calls[0]).toEqual({
      step: 'retainRaw',
      rawKey: 'raw/AAAA1111-2222-4333-8444-555566667777.webm',
      bytes: Buffer.from('RAW-WEBM-BYTES').length,
      contentType: 'audio/webm'
    })
    expect(out.rawRetained).toBe(true)
    expect(out.rawKey).toBe('raw/AAAA1111-2222-4333-8444-555566667777.webm')
    expect(out.refused).toBeNull()
    expect(out.processedBuffer.toString()).toBe('MASTERED')
  })

  it('archives the bytes UNTOUCHED — the buffer handed to S3 is the one the client sent', async () => {
    let archived = null
    const t = makeTake({ retainRaw: async ({ buffer }) => { archived = buffer } })
    await retainAndProcessTake(t.args)
    expect(archived).toBe(t.args.rawBuffer)
    expect(archived.equals(Buffer.from('RAW-WEBM-BYTES'))).toBe(true)
  })

  it('REFUSED take (processing failed) still retained its raw', async () => {
    const t = makeTake({ audioMeta: { processed: false, reason: 'ffmpeg not found' } })
    const out = await retainAndProcessTake(t.args)

    expect(t.calls[0].step).toBe('retainRaw')            // archived before the refusal
    expect(out.refused.status).toBe(500)
    expect(out.refused.body.processed).toBe(false)
    expect(out.processedBuffer).toBeNull()               // nothing goes to mastered/
    expect(out.rawRetained).toBe(true)
    expect(out.rawKey).toBe('raw/AAAA1111-2222-4333-8444-555566667777.webm')
    expect(out.refused.body.rawKey).toBe(out.rawKey)     // recoverable from the 500 itself
  })

  it('REFUSED take (silent, under MIN_TAKE_MS) still retained its raw', async () => {
    const t = makeTake({ audioMeta: { processed: true, durationMs: 40, inputSize: 14, outputSize: 834 } })
    const out = await retainAndProcessTake({ ...t.args, minTakeMs: 100 })

    expect(t.calls[0].step).toBe('retainRaw')
    expect(out.refused.status).toBe(422)
    expect(out.refused.body.silent).toBe(true)
    expect(out.refused.body.durationMs).toBe(40)
    expect(out.processedBuffer).toBeNull()
    expect(out.rawRetained).toBe(true)
    expect(out.rawKey).toBe('raw/AAAA1111-2222-4333-8444-555566667777.webm')
  })

  it('a zero-duration take is still refused (the 2026-08-06 Welsh bug), raw kept', async () => {
    const t = makeTake({ audioMeta: { processed: true, durationMs: 0, outputSize: 834 } })
    const out = await retainAndProcessTake(t.args)
    expect(out.refused.status).toBe(422)
    expect(out.rawRetained).toBe(true)
  })

  it('a raw-store failure does NOT fail the upload — the take still processes and lands', async () => {
    const calls = []
    const t = makeTake({
      calls,
      retainRaw: async () => { calls.push({ step: 'retainRaw' }); throw new Error('S3 timeout') }
    })
    const out = await retainAndProcessTake(t.args)

    expect(calls.map(c => c.step)).toEqual(['retainRaw', 'process'])  // carried on
    expect(out.refused).toBeNull()
    expect(out.processedBuffer.toString()).toBe('MASTERED')
    expect(out.rawRetained).toBe(false)
    expect(out.rawKey).toBeNull()       // never claim an original that is not there
    expect(out.rawError).toBe('S3 timeout')
  })

  it('logs a raw-store failure loudly', async () => {
    const errors = []
    const t = makeTake({ retainRaw: async () => { throw new Error('AccessDenied') } })
    await retainAndProcessTake({ ...t.args, logger: { log() {}, error: m => errors.push(m), warn() {} } })
    expect(errors.some(m => /RAW RETENTION FAILED/.test(m) && /AccessDenied/.test(m))).toBe(true)
  })

  it('passes the resolved inputFormat through to the processor unchanged', async () => {
    const t = makeTake()
    await retainAndProcessTake({ ...t.args, mimeType: 'audio/ogg;codecs=opus' })
    expect(t.calls[0].rawKey).toBe('raw/AAAA1111-2222-4333-8444-555566667777.ogg')
    expect(t.calls[1].inputFormat).toBe('ogg')
  })
})

describe('buildProvenanceContext raw pointer', () => {
  it('carries raw_s3_key so a stored clip resolves back to its original', () => {
    const ctx = buildProvenanceContext({
      courseCode: 'zzz_test_for_eng',
      isScriptMode: true,
      metadata: {},
      s3Key: 'mastered/TAKE.mp3',
      rawS3Key: 'raw/TAKE.webm'
    })
    expect(ctx.raw_s3_key).toBe('raw/TAKE.webm')
    expect(ctx.s3_key).toBe('mastered/TAKE.mp3')
  })

  it('is an honest null when the archive write failed', () => {
    const ctx = buildProvenanceContext({ courseCode: 'c', isScriptMode: true, metadata: {}, s3Key: 'k' })
    expect(ctx.raw_s3_key).toBeNull()
  })
})
