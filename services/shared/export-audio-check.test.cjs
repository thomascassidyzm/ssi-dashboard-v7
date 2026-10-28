/**
 * Export Step 2 fails closed when the audio length/format check cannot run (Kai 2026-10-28, job #994).
 * Run: npx vitest run services/shared/export-audio-check.test.cjs
 */
import { describe, it, expect } from 'vitest'
const { audioCheckGap, stageVerdict, audioToolsPreflight, legacyExportAudioGate } = require('./export-audio-check.cjs')
const { verifyStageAudio } = require('../s3-deploy-service.cjs')

// What Step 2 produced on watson-1 with no sox (job #550): every file present, every measure threw,
// the format check never ran. The old route formula (missing === 0 && formatFailed === 0) passed it.
const NO_SOX_RESULT = {
  total: 1200, existing: 1200, missing: 0, missingUuids: [],
  durationChecked: 1200, durationMatched: 0, durationMismatched: 0, durationErrors: 1200,
  durationErrorDetails: [{ uuid: 'A1', error: 'Failed to get audio duration with sox: spawn sox ENOENT' }],
  formatChecked: 0, formatPassed: 0, formatFailed: 0, formatFailDetails: []
}
const CLEAN = {
  total: 3, existing: 3, missing: 0, durationChecked: 3, durationErrors: 0, durationMismatched: 1,
  formatChecked: 3, formatPassed: 3, formatFailed: 0
}

describe('stageVerdict / audioCheckGap', () => {
  it('the no-sox specimen is NOT verified, and says why', () => {
    const v = stageVerdict(NO_SOX_RESULT)
    expect(v.verified).toBe(false)
    expect(v.reasons[0]).toMatch(/^audio length\/format check could not run: 1200 of 1200 files could not be measured/)
    expect(v.reasons[0]).toContain('ENOENT')
  })

  it('one unmeasured file is enough to fail', () => {
    expect(stageVerdict({ ...CLEAN, durationErrors: 1 }).verified).toBe(false)
  })

  it('a format check that ran on fewer files than were measured fails', () => {
    expect(audioCheckGap({ ...CLEAN, formatChecked: 2 })).toMatch(/format checked on only 2 of 3/)
  })

  it('skipped, failed or never-run checks fail', () => {
    expect(audioCheckGap(null)).toMatch(/has not been run/)
    expect(audioCheckGap({ ...CLEAN, durationCheckFailed: true, durationCheckError: 'sox is not installed' })).toBe('sox is not installed')
    expect(audioCheckGap({ ...CLEAN, durationChecked: 0 })).toMatch(/no audio files were measured/)
  })

  it('a complete check passes; mismatches alone do not block, missing / bad encoding / post-fix mismatches do', () => {
    expect(stageVerdict(CLEAN)).toEqual({ verified: true, audioCheckGap: null, reasons: [] })
    expect(stageVerdict({ ...CLEAN, missing: 1 }).verified).toBe(false)
    expect(stageVerdict({ ...CLEAN, formatFailed: 1 }).verified).toBe(false)
    expect(stageVerdict(CLEAN, { stillMismatched: 1 }).verified).toBe(false)
  })
})

describe('audioToolsPreflight', () => {
  it('no sox binary → not ok (real exec of a path that does not exist)', async () => {
    const r = await audioToolsPreflight({ soxBinary: '/nonexistent/job-994/sox' })
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/sox is not installed/)
  })

  it('sox without MP3 support → not ok', async () => {
    const exec = async (bin) => bin === 'sox'
      ? { err: null, out: 'sox: SoX v14.4.2\nAUDIO FILE FORMATS: 8svx aif aiff wav flac\n' }
      : { err: null, out: 'ffprobe version 6' }
    expect(await audioToolsPreflight({ exec, soxBinary: 'sox' })).toEqual({ ok: false, reason: 'sox has no MP3 support (install libsox-fmt-mp3)' })
  })

  it('no ffprobe → not ok; sox with mp3 + ffprobe → ok', async () => {
    const soxOk = { err: null, out: 'AUDIO FILE FORMATS: aiff mp2 mp3 wav\n' }
    const noFf = async (bin) => bin === 'sox' ? soxOk : { err: Object.assign(new Error('spawn ffprobe ENOENT'), { code: 'ENOENT' }), out: '' }
    expect((await audioToolsPreflight({ exec: noFf, soxBinary: 'sox' })).reason).toMatch(/ffprobe is not available: not installed/)
    const all = async (bin) => bin === 'sox' ? soxOk : { err: null, out: 'ffprobe version 6' }
    expect(await audioToolsPreflight({ exec: all, soxBinary: 'sox' })).toEqual({ ok: true, reason: null })
  })
})

describe('verifyStageAudio runs the preflight', () => {
  it('missing tools → durationCheckFailed carrying the tool reason, not some other one', async () => {
    const r = await verifyStageAudio([], {}, null, { preflight: async () => ({ ok: false, reason: 'sox is not installed (looked for "sox")' }) })
    expect(r.durationCheckFailed).toBe(true)
    expect(r.durationCheckError).toBe('sox is not installed (looked for "sox")')
    expect(stageVerdict(r).verified).toBe(false)
  })
})

describe('legacyExportAudioGate (publish-manifest, stage-deploy)', () => {
  it('refuses the stored no-sox result with the plain message', async () => {
    const r = await legacyExportAudioGate(async () => NO_SOX_RESULT)
    expect(r.audioCheckCouldNotRun).toBe(true)
    expect(r.error).toMatch(/^audio length\/format check could not run: 1200 of 1200 files could not be measured/)
  })

  it('refuses when Step 2 never ran, or the state cannot be read', async () => {
    expect((await legacyExportAudioGate(async () => null)).error).toMatch(/has not been run/)
    expect((await legacyExportAudioGate(async () => { throw new Error('db down') })).error).toMatch(/could not read the Step 2 result \(db down\)/)
  })

  it('lets a complete check through', async () => {
    expect(await legacyExportAudioGate(async () => CLEAN)).toBe(null)
  })
})
