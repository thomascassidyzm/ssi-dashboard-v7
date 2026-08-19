// Unit tests for script-mode take filing — the step whose absence left 50
// takes recorded on 2026-08-19 with S3 bytes and no course_audio row.
// Run: npx vitest run services/script-take-filing.test.js
import { describe, it, expect, vi } from 'vitest'
import { planScriptTakeFiling, fileScriptTake } from './script-take-filing.cjs'

const COURSE = { target_lang: 'fin', known_lang: 'eng' }
const quiet = { log: () => {}, error: () => {}, warn: () => {} }

describe('planScriptTakeFiling', () => {
  it('files a natural target take under the course target language', () => {
    const plan = planScriptTakeFiling({
      metadata: { role: 'target1', cadence: 'natural', text: 'miten sanoa jotain suomeksi' },
      voiceId: 'human_kai_fin',
      course: COURSE,
    })
    expect(plan).toEqual({
      file: true,
      text: 'miten sanoa jotain suomeksi',
      role: 'target1',
      language: 'fin',
      voiceId: 'human_kai_fin',
    })
  })

  it('files a known-slot take under the KNOWN language, like the engine does', () => {
    const plan = planScriptTakeFiling({
      metadata: { role: 'known', cadence: 'natural', text: 'how to say something' },
      voiceId: 'human_kai_eng',
      course: COURSE,
    })
    expect(plan.language).toBe('eng')
  })

  it('treats an absent cadence as natural (the take is still a whole read)', () => {
    const plan = planScriptTakeFiling({
      metadata: { role: 'target1', text: 'moi' }, voiceId: 'v', course: COURSE,
    })
    expect(plan.file).toBe(true)
  })

  it('DELIBERATELY does not file the slow cadence — it would overwrite the natural take', () => {
    const plan = planScriptTakeFiling({
      metadata: { role: 'target1', cadence: 'slow', text: 'moi' }, voiceId: 'v', course: COURSE,
    })
    expect(plan.file).toBe(false)
    expect(plan.filing.reason).toBe('slow_cadence')
    // deliberate = the recordist gets no alarm for a correct outcome
    expect(plan.filing.deliberate).toBe(true)
  })

  it('refuses to file when the slot has no human voice, and says so loudly', () => {
    const plan = planScriptTakeFiling({
      metadata: { role: 'target1', cadence: 'natural', text: 'moi' }, voiceId: null, course: COURSE,
    })
    expect(plan.file).toBe(false)
    expect(plan.filing.reason).toBe('no_voice')
    expect(plan.filing.deliberate).toBe(false)
    expect(plan.filing.message).toMatch(/no human voice assigned/i)
  })

  it('refuses on missing text, missing role and missing course', () => {
    expect(planScriptTakeFiling({ metadata: { role: 'target1', text: '   ' }, voiceId: 'v', course: COURSE }).filing.reason).toBe('no_text')
    expect(planScriptTakeFiling({ metadata: { text: 'moi' }, voiceId: 'v', course: COURSE }).filing.reason).toBe('no_role')
    expect(planScriptTakeFiling({ metadata: { role: 'target1', text: 'moi' }, voiceId: 'v', course: null }).filing.reason).toBe('no_course')
  })

  it('refuses when the course row carries no language for the slot', () => {
    const plan = planScriptTakeFiling({
      metadata: { role: 'target1', text: 'moi' }, voiceId: 'v', course: { known_lang: 'eng' },
    })
    expect(plan.filing.reason).toBe('no_course')
    expect(plan.filing.deliberate).toBe(false)
  })
})

describe('fileScriptTake', () => {
  function fakeSupabase(onUpsert) {
    return {
      from: () => ({
        upsert: (row, opts) => ({
          select: () => ({
            single: async () => onUpsert(row, opts),
          }),
        }),
      }),
    }
  }

  it('upserts on the live 5-column key with origin=human, and returns the row id', async () => {
    let seen = null
    const supabase = fakeSupabase((row, opts) => {
      seen = { row, opts }
      return { data: { id: 'ROW-1' }, error: null }
    })
    const plan = planScriptTakeFiling({
      metadata: { role: 'target1', cadence: 'natural', text: 'Moi!' },
      voiceId: 'human_kai_fin', course: COURSE,
    })
    const filing = await fileScriptTake({
      supabase, courseCode: 'fin_for_eng', plan, s3Key: 'mastered/AAA.mp3', durationMs: 913, logger: quiet,
    })
    expect(filing).toEqual({ filed: true, courseAudioId: 'ROW-1', reason: null, deliberate: false, message: null })
    expect(seen.opts.onConflict).toBe('course_code,text_normalized,language,role,voice_id')
    expect(seen.row.origin).toBe('human')
    expect(seen.row.s3_key).toBe('mastered/AAA.mp3')
    expect(seen.row.duration_ms).toBe(913)
    expect(seen.row.course_code).toBe('fin_for_eng')
  })

  it('passes a non-filing plan straight through without touching the database', async () => {
    const upsert = vi.fn()
    const plan = planScriptTakeFiling({
      metadata: { role: 'target1', cadence: 'slow', text: 'Moi!' }, voiceId: 'v', course: COURSE,
    })
    const filing = await fileScriptTake({ supabase: { from: upsert }, courseCode: 'c', plan, s3Key: 'k', logger: quiet })
    expect(upsert).not.toHaveBeenCalled()
    expect(filing.filed).toBe(false)
    expect(filing.reason).toBe('slow_cadence')
  })

  it('NEVER throws on a database failure — the bytes are already safe, so it reports instead', async () => {
    const supabase = fakeSupabase(() => ({ data: null, error: { message: 'permission denied' } }))
    const plan = planScriptTakeFiling({
      metadata: { role: 'target1', cadence: 'natural', text: 'Moi!' }, voiceId: 'human_kai_fin', course: COURSE,
    })
    const filing = await fileScriptTake({ supabase, courseCode: 'c', plan, s3Key: 'k', logger: quiet })
    expect(filing.filed).toBe(false)
    expect(filing.reason).toBe('write_failed')
    expect(filing.deliberate).toBe(false)
    expect(filing.message).toMatch(/permission denied/)
    expect(filing.message).toMatch(/the recording itself is safe/i)
  })

  // clip-identity refuses a voice id it cannot canonicalise (no provider
  // prefix, provider not inferable) and a language it does not know. Both throw
  // from inside the upsert helper, and both must come back as a LOUD verdict
  // rather than a 500 that loses the take.
  it('reports an un-canonicalisable voice id as a filing failure, not a crash', async () => {
    const supabase = fakeSupabase(() => ({ data: { id: 'ROW-1' }, error: null }))
    const plan = planScriptTakeFiling({
      metadata: { role: 'target1', cadence: 'natural', text: 'Moi!' }, voiceId: 'v', course: COURSE,
    })
    const filing = await fileScriptTake({ supabase, courseCode: 'c', plan, s3Key: 'k', logger: quiet })
    expect(filing.filed).toBe(false)
    expect(filing.reason).toBe('write_failed')
    expect(filing.message).toMatch(/canonicalise voice_id/)
  })
})
