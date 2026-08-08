/**
 * Unit tests for reuse-first regeneration (no DB, no S3, no TTS, no spend).
 * Run: npx vitest run services/audio-reuse-planner
 *
 * These hold the claims the capability is sold on — the ones a reader of the
 * happy path cannot check:
 *
 *   - the reuse key really is (voice x text x language) and NOTHING else —
 *     role-agnostic and direction-agnostic, so an English clip sitting in a
 *     target2 role of eng_for_hin is reusable for a French course's known side;
 *   - the ONE exception is physical, not editorial: Azure bakes speed into the
 *     mp3, so role-crossing is refused on Azure sources and only those;
 *   - a text naming a FOREIGN language is never borrowed, and a course's own
 *     text naming one is BLOCKED rather than re-rendered in the wrong words;
 *   - a clip is NEVER borrowed across a voice boundary, no matter how tempting
 *     the match. This is the rule the whole French/German redo exists to
 *     protect: borrowing an Azure clip where the course is now on xAI is a
 *     voice-identity change and Tom's call, never the code's;
 *   - the bare voice id and its prefixed sibling ARE one voice (Tom's ruling,
 *     2026-08-07) — but the match is tagged, and it never merges two different
 *     voices;
 *   - a regional locale (fr-CA) is not the same language as fr — an accent is
 *     a voice;
 *   - a `pending/` row is not audio and is never a reuse source;
 *   - MAKE BEFORE BREAK: a relink never happens on an unverified claim, a
 *     FAILED storage question is not read as "missing", and nothing is ever
 *     deleted;
 *   - bytes beat rows: a clip whose stored object is gone is demoted to RENDER
 *     however confident the database is.
 */

import { describe, it, expect } from 'vitest'

const planner = require('./audio-reuse-planner.cjs')
const {
  decideClip, voicesMatch, sameLanguage, resolveVoices, clipKey, isSayable,
  verifyPlanBytes, verifyPlanVeracity, applyReusePlan, recountPlan, roundsInBand,
} = planner

// ── fixtures ───────────────────────────────────────────────────────────────

const clip = (over = {}) => ({
  clipKey: 'known|eng|xai_eve|i want to speak',
  role: 'known',
  language: 'eng',
  voiceId: 'xai_eve',
  text: 'I want to speak',
  plays: 1,
  roundsUsedIn: [2],
  holders: [{ table: 'course_practice_phrases', id: 'p1', column: 'known_audio_id', currentAudioId: null }],
  currentAudioIds: [],
  ...over,
})

const row = (over = {}) => ({
  id: 'a1',
  course_code: 'kor_for_eng',
  text: 'I want to speak',
  text_normalized: 'i want to speak',
  language: 'eng',
  role: 'known',
  voice_id: 'xai_eve',
  origin: 'tts',
  s3_key: 'mastered/AAA.mp3',
  duration_ms: 1176,
  created_at: '2026-07-21T12:43:14Z',
  ...over,
})

// NOTE: crossRole is deliberately NOT pinned here. Tom's 2026-08-07 ruling made
// the key voice x text x language and nothing else, so role-agnostic is the
// module default and the fixture must not quietly restore the old narrow one.
const opts = (over = {}) => ({ courseCode: 'fra_for_eng', voiceAliases: [], ...over })

// ── the voice boundary ─────────────────────────────────────────────────────

describe('never cross a voice boundary', () => {
  it('refuses an otherwise-perfect match on a different voice', () => {
    const d = decideClip(clip(), [row({ voice_id: 'azure_en-GB-SoniaNeural' })], opts())
    expect(d.decision).toBe('RENDER')
    expect(d.source).toBeNull()
    expect(d.reason).toMatch(/none usable — 1 on another voice/)
  })

  it('treats the bare id and its prefixed sibling as ONE voice — Tom ruled it, 2026-08-07', () => {
    // Superseded premise, kept deliberately: this used to assert RENDER,
    // because whether `eve` and `xai_eve` were the same voice was a
    // voice-identity call the code refused to make. Tom settled it — same
    // voice, two provider-migration eras — so the merge is now the default.
    const d = decideClip(clip(), [row({ voice_id: 'eve' })], opts())
    expect(d.decision).toBe('REUSE_CROSS')
  })

  it('TAGS an era-crossing match, so the ruling is correct without being invisible', () => {
    const d = decideClip(clip(), [row({ voice_id: 'eve' })], opts())
    expect(d.viaAlias).toBe(true)
  })

  it('prefers an EXACT id match over an era-crossing one when both exist', () => {
    const d = decideClip(
      clip(),
      [row({ id: 'era', voice_id: 'eve', created_at: '2026-08-06T00:00:00Z' }),
       row({ id: 'exact', voice_id: 'xai_eve', created_at: '2026-01-01T00:00:00Z' })],
      opts()
    )
    expect(d.source.audioId).toBe('exact')
    expect(d.viaAlias).toBe(false)
  })

  it('mergeProviderEras:false restores strict exact matching', () => {
    expect(voicesMatch('xai_eve', 'eve', [], { mergeProviderEras: false }).match).toBe(false)
  })

  it('merging eras never merges two DIFFERENT voices', () => {
    expect(voicesMatch('xai_eve', 'xai_eve').match).toBe(true)
    expect(voicesMatch('xai_eve', 'eve').match).toBe(true)
    expect(voicesMatch('xai_eve', 'xai_leo').match).toBe(false)
    expect(voicesMatch('xai_eve', 'leo').match).toBe(false)
    expect(voicesMatch('xai_gfzdpspr5fdp', 'xai_eve').match).toBe(false)
    expect(voicesMatch('xai_eve', 'XAI_EVE').match).toBe(false)
    expect(voicesMatch('xai_eve', null).match).toBe(false)
  })

  it('labels Tom\'s clone by name, in both eras', () => {
    expect(planner.voiceLabel('xai_gfzdpspr5fdp')).toBe('Tom (clone)')
    expect(planner.voiceLabel('gfzdpspr5fdp')).toBe('Tom (clone)')
    expect(planner.voiceLabel('xai_eve')).toBe('Eve (xAI)')
  })

  it('DOES share one xAI voice across target1 and target2 — role is not part of the key', () => {
    // Superseded premise, kept deliberately: this test used to assert the
    // opposite. Tom ruled 2026-08-07 that the key is voice x text x language
    // and nothing else. xAI exposes no speed parameter, so both layers are the
    // same 1x render and the player paces them live — there is nothing to keep
    // apart. The pace hazard is Azure-only and is covered below.
    const t1 = clip({ role: 'target1', language: 'fra', voiceId: 'xai_eve', text: 'je veux parler' })
    const d = decideClip(t1, [row({ role: 'target2', language: 'fra', voice_id: 'xai_eve', text_normalized: 'je veux parler' })], opts())
    expect(d.decision).toBe('REUSE_CROSS')
  })

  it('crossRole:false restores the old strict same-role key when a caller wants it', () => {
    const t1 = clip({ role: 'target1', language: 'fra', voiceId: 'xai_eve' })
    const d = decideClip(t1, [row({ role: 'target2', language: 'fra', voice_id: 'xai_eve' })], opts({ crossRole: false }))
    expect(d.decision).toBe('RENDER')
  })
})

// ── the language boundary ──────────────────────────────────────────────────

describe('language matching', () => {
  it('treats code conventions for one language as equal', () => {
    expect(sameLanguage('fra', 'fr')).toBe(true)
    expect(sameLanguage('fra', 'fre')).toBe(true)
    expect(sameLanguage('eng', 'en')).toBe(true)
  })

  it('does NOT treat a regional locale as the same language — an accent is a voice', () => {
    expect(sameLanguage('fra', 'fr-CA')).toBe(false)
    expect(sameLanguage('eng', 'en-GB')).toBe(false)
    expect(sameLanguage('por', 'pt-BR')).toBe(false)
  })

  it('never widens a language it does not know', () => {
    expect(sameLanguage('xyz', 'xy')).toBe(false)
    expect(sameLanguage('xyz', 'xyz')).toBe(true)
  })

  it('refuses a Quebecois clip for a French course even on a matching text', () => {
    const d = decideClip(
      clip({ role: 'target1', language: 'fra', voiceId: 'xai_eve', text: 'je veux parler' }),
      [row({ course_code: 'fra_ca_for_eng', role: 'target1', language: 'fr-CA', voice_id: 'xai_eve' })],
      opts()
    )
    expect(d.decision).toBe('RENDER')
  })
})

// ── what is and is not a reuse source ──────────────────────────────────────

describe('reuse source viability', () => {
  it('never reuses a pending/ row — that is a text placeholder, not audio', () => {
    const d = decideClip(clip(), [row({ s3_key: 'pending/whatever' })], opts())
    expect(d.decision).toBe('RENDER')
  })

  it('never reuses a row with no s3 key at all', () => {
    const d = decideClip(clip(), [row({ s3_key: null })], opts())
    expect(d.decision).toBe('RENDER')
  })

  it('prefers the course\'s own row over another course\'s', () => {
    const d = decideClip(
      clip(),
      [row({ id: 'other', course_code: 'kor_for_eng', created_at: '2026-08-06T00:00:00Z' }),
       row({ id: 'own', course_code: 'fra_for_eng', created_at: '2026-01-01T00:00:00Z' })],
      opts()
    )
    expect(d.decision).toBe('REUSE_OWN')
    expect(d.source.audioId).toBe('own')
  })

  it('reports SATISFIED only when every holder already points at the winner', () => {
    const c = clip({
      holders: [
        { table: 'course_legos', id: 'l1', column: 'known_audio_id', currentAudioId: 'own' },
        { table: 'course_practice_phrases', id: 'p1', column: 'known_audio_id', currentAudioId: 'own' },
      ],
    })
    const d = decideClip(c, [row({ id: 'own', course_code: 'fra_for_eng' })], opts())
    expect(d.decision).toBe('SATISFIED')
  })

  it('reports REUSE_OWN when one holder of several has drifted', () => {
    const c = clip({
      holders: [
        { table: 'course_legos', id: 'l1', column: 'known_audio_id', currentAudioId: 'own' },
        { table: 'course_practice_phrases', id: 'p1', column: 'known_audio_id', currentAudioId: 'stale' },
      ],
    })
    const d = decideClip(c, [row({ id: 'own', course_code: 'fra_for_eng' })], opts())
    expect(d.decision).toBe('REUSE_OWN')
  })

  it('blocks rather than renders when text is punctuation-only or empty', () => {
    expect(decideClip(clip({ text: '…' }), [], opts()).decision).toBe('BLOCKED')
    expect(decideClip(clip({ text: '' }), [], opts()).decision).toBe('BLOCKED')
    expect(isSayable('…')).toBe(false)
    expect(isSayable('こんにちは')).toBe(true)
  })

  it('blocks a clip whose role has no configured voice instead of guessing one', () => {
    expect(decideClip(clip({ voiceId: null }), [row()], opts()).decision).toBe('BLOCKED')
  })
})

// ── voice resolution mirrors phase 8 ───────────────────────────────────────

describe('resolveVoices', () => {
  it('builds provider_voiceId exactly as phase 8 writes it', () => {
    const v = resolveVoices({ voice_config: { voices: {
      known: { provider: 'xai', voiceId: 'eve' },
      target1: { provider: 'xai', voiceId: 'eve' },
      target2: { provider: 'xai', voiceId: 'leo' },
      presentation: { provider: 'xai', voiceId: 'eve' },
    } } })
    expect(v).toEqual({ known: 'xai_eve', target1: 'xai_eve', target2: 'xai_leo', presentation: 'xai_eve' })
  })

  it('falls back to a bare voiceId when no provider is set, and never returns the config object', () => {
    const v = resolveVoices({ voice_config: { voices: { known: { voiceId: 'eve' }, target1: { provider: 'xai' } } } })
    expect(v.known).toBe('eve')
    expect(v.target1).toBeNull()
  })
})

describe('clipKey', () => {
  it('is stable across trailing punctuation and case', () => {
    const a = clipKey({ role: 'known', language: 'eng', voiceId: 'xai_eve', text: 'I want to speak.' })
    const b = clipKey({ role: 'known', language: 'eng', voiceId: 'xai_eve', text: 'i want to speak' })
    expect(a).toBe(b)
  })

  it('separates two voices saying the same words', () => {
    const a = clipKey({ role: 'target1', language: 'fra', voiceId: 'xai_eve', text: 'je veux' })
    const b = clipKey({ role: 'target2', language: 'fra', voiceId: 'xai_leo', text: 'je veux' })
    expect(a).not.toBe(b)
  })
})

// ── bytes beat rows ────────────────────────────────────────────────────────

describe('verifyPlanBytes', () => {
  const planWith = (clips) => recountPlan({ courseCode: 'fra_for_eng', rounds: 10, clips })

  it('demotes a SATISFIED clip to RENDER when the stored object is gone', async () => {
    const p = planWith([{ ...clip(), decision: 'SATISFIED', reason: 'already linked', reuseSource: { s3Key: 'mastered/GONE.mp3' } }])
    await verifyPlanBytes(p, { headObject: async () => ({ exists: false, size: null }) })
    expect(p.clips[0].decision).toBe('RENDER')
    expect(p.clips[0].decisionBeforeByteCheck).toBe('SATISFIED')
    expect(p.summary.render).toBe(1)
  })

  it('demotes a zero-length clip too — a 40-byte mp3 is not audio', async () => {
    const p = planWith([{ ...clip(), decision: 'SATISFIED', reason: 'x', reuseSource: { s3Key: 'mastered/TINY.mp3' } }])
    await verifyPlanBytes(p, { headObject: async () => ({ exists: true, size: 40 }) })
    expect(p.clips[0].decision).toBe('RENDER')
  })

  it('does NOT demote when storage could not be asked — a failed question is not a missing file', async () => {
    const p = planWith([{ ...clip(), decision: 'SATISFIED', reason: 'x', reuseSource: { s3Key: 'mastered/OK.mp3' } }])
    await verifyPlanBytes(p, { headObject: async () => ({ exists: null, error: 'NetworkError' }) })
    expect(p.clips[0].decision).toBe('SATISFIED')
    expect(p.clips[0].bytes.state).toBe('unknown')
    expect(p.bytes.unknown).toBe(1)
  })

  it('survives a headObject that throws', async () => {
    const p = planWith([{ ...clip(), decision: 'SATISFIED', reason: 'x', reuseSource: { s3Key: 'mastered/OK.mp3' } }])
    await verifyPlanBytes(p, { headObject: async () => { throw new Error('boom') } })
    expect(p.clips[0].bytes.state).toBe('unknown')
    expect(p.clips[0].decision).toBe('SATISFIED')
  })
})

// ── make before break ──────────────────────────────────────────────────────

describe('applyReusePlan — make before break, delete never', () => {
  // A supabase double that RECORDS every call, so "nothing was deleted" is an
  // assertion about behaviour rather than about the absence of a code path.
  function makeDb () {
    const calls = { updates: [], upserts: [], deletes: [] }
    const api = {
      from (table) {
        return {
          update (patch) {
            return { eq (col, val) { calls.updates.push({ table, patch, col, val }); return Promise.resolve({ error: null }) } }
          },
          upsert (rowIn) {
            calls.upserts.push({ table, row: rowIn })
            return { select: () => ({ single: () => Promise.resolve({ data: { id: 'new-row-id' }, error: null }) }) }
          },
          delete () { calls.deletes.push({ table }); return { eq: () => Promise.resolve({ error: null }) } },
        }
      },
      calls,
    }
    return api
  }

  const basePlan = (clips) => recountPlan({ courseCode: 'fra_for_eng', rounds: 10, voices: {}, shape: {}, clips })

  it('a dry run writes nothing at all', async () => {
    const db = makeDb()
    const p = basePlan([{ ...clip(), decision: 'REUSE_CROSS', reason: 'x', reuseSource: { audioId: 'a1', courseCode: 'kor_for_eng', s3Key: 'mastered/AAA.mp3', durationMs: 1000 } }])
    const log = await applyReusePlan(db, p, { dryRun: true, headObject: async () => ({ exists: true, size: 20000 }) })
    expect(db.calls.updates).toHaveLength(0)
    expect(db.calls.upserts).toHaveLength(0)
    expect(log.entries[0].action).toBe('WOULD_REUSE_CROSS')
  })

  it('refuses to relink when the reuse source is missing from storage', async () => {
    const db = makeDb()
    const p = basePlan([{ ...clip(), decision: 'REUSE_CROSS', reason: 'x', reuseSource: { audioId: 'a1', courseCode: 'kor_for_eng', s3Key: 'mastered/GONE.mp3' } }])
    const log = await applyReusePlan(db, p, { dryRun: false, bumpStamp: false, headObject: async () => ({ exists: false }) })
    expect(db.calls.updates).toHaveLength(0)
    expect(log.errors[0].error).toMatch(/missing in storage/)
  })

  it('refuses to relink on an UNVERIFIED claim — a failed storage question blocks the swap', async () => {
    const db = makeDb()
    const p = basePlan([{ ...clip(), decision: 'REUSE_OWN', reason: 'x', reuseSource: { audioId: 'own', courseCode: 'fra_for_eng', s3Key: 'mastered/OK.mp3' } }])
    const log = await applyReusePlan(db, p, { dryRun: false, bumpStamp: false, headObject: async () => ({ exists: null, error: 'timeout' }) })
    expect(db.calls.updates).toHaveLength(0)
    expect(log.errors[0].error).toMatch(/refusing to relink/)
  })

  it('creates the row BEFORE moving the FK, and moves it to the new row', async () => {
    const db = makeDb()
    const p = basePlan([{ ...clip(), decision: 'REUSE_CROSS', reason: 'x', currentAudioIds: ['old-row'], holders: [{ table: 'course_practice_phrases', id: 'p1', column: 'known_audio_id', currentAudioId: 'old-row' }], reuseSource: { audioId: 'a1', courseCode: 'kor_for_eng', s3Key: 'mastered/AAA.mp3', durationMs: 1000 } }])
    const log = await applyReusePlan(db, p, { dryRun: false, bumpStamp: false, headObject: async () => ({ exists: true, size: 20000 }) })
    expect(db.calls.upserts).toHaveLength(1)
    expect(db.calls.upserts[0].row.s3_key).toBe('mastered/AAA.mp3')
    expect(db.calls.updates[0]).toMatchObject({ table: 'course_practice_phrases', patch: { known_audio_id: 'new-row-id' }, val: 'p1' })
    expect(log.entries[0].previousAudioIds).toEqual(['old-row'])
  })

  it('stores the COURSE text on the copied row, not the source clip\'s snapshot', async () => {
    const db = makeDb()
    const p = basePlan([{ ...clip({ text: 'I want to speak' }), decision: 'REUSE_CROSS', reason: 'x', reuseSource: { audioId: 'a1', courseCode: 'kor_for_eng', s3Key: 'mastered/AAA.mp3', text: 'I want to speak.', durationMs: 1000 } }])
    await applyReusePlan(db, p, { dryRun: false, bumpStamp: false, headObject: async () => ({ exists: true, size: 20000 }) })
    expect(db.calls.upserts[0].row.text).toBe('I want to speak')
  })

  it('never deletes anything, on any path', async () => {
    const db = makeDb()
    const p = basePlan([
      { ...clip(), decision: 'REUSE_CROSS', reason: 'x', reuseSource: { audioId: 'a1', courseCode: 'kor_for_eng', s3Key: 'mastered/AAA.mp3', durationMs: 1 } },
      { ...clip({ clipKey: 'k2' }), decision: 'REUSE_OWN', reason: 'x', reuseSource: { audioId: 'own', courseCode: 'fra_for_eng', s3Key: 'mastered/BBB.mp3' } },
      { ...clip({ clipKey: 'k3' }), decision: 'RENDER', reason: 'x', reuseSource: null },
      { ...clip({ clipKey: 'k4' }), decision: 'BLOCKED', reason: 'x', reuseSource: null },
    ])
    const log = await applyReusePlan(db, p, {
      dryRun: false, bumpStamp: false,
      headObject: async () => ({ exists: true, size: 20000 }),
      renderClip: async () => ({ audioId: 'rendered-id', s3Key: 'mastered/NEW.mp3', durationMs: 900 }),
    })
    expect(db.calls.deletes).toHaveLength(0)
    expect(log.deletionsPerformed).toBe(0)
    expect(typeof planner.applyReusePlan).toBe('function')
    // and the render path still linked its holders
    expect(db.calls.updates.some(u => u.patch.known_audio_id === 'rendered-id')).toBe(true)
  })

  it('a holder already pointing at the right row is left untouched', async () => {
    const db = makeDb()
    const p = basePlan([{ ...clip(), decision: 'REUSE_OWN', reason: 'x',
      holders: [{ table: 'course_legos', id: 'l1', column: 'known_audio_id', currentAudioId: 'own' },
                { table: 'course_practice_phrases', id: 'p1', column: 'known_audio_id', currentAudioId: 'stale' }],
      reuseSource: { audioId: 'own', courseCode: 'fra_for_eng', s3Key: 'mastered/OK.mp3' } }])
    await applyReusePlan(db, p, { dryRun: false, bumpStamp: false, headObject: async () => ({ exists: true, size: 20000 }) })
    expect(db.calls.updates).toHaveLength(1)
    expect(db.calls.updates[0].val).toBe('p1')
  })

  it('one clip failing does not stop the rest of the run', async () => {
    const db = makeDb()
    const p = basePlan([
      { ...clip({ clipKey: 'bad' }), decision: 'RENDER', reason: 'x', reuseSource: null },
      { ...clip({ clipKey: 'good' }), decision: 'REUSE_OWN', reason: 'x', reuseSource: { audioId: 'own', courseCode: 'fra_for_eng', s3Key: 'mastered/OK.mp3' } },
    ])
    let first = true
    const log = await applyReusePlan(db, p, {
      dryRun: false, bumpStamp: false,
      headObject: async () => ({ exists: true, size: 20000 }),
      renderClip: async () => { if (first) { first = false; throw new Error('tts exploded') } return { audioId: 'x' } },
    })
    expect(log.errors).toHaveLength(1)
    expect(log.counts.FAILED).toBe(1)
    expect(log.counts.REUSED_OWN).toBe(1)
  })
})

// ── the language-name filter (Tom, 2026-08-07) ─────────────────────────────

describe('language-name filter', () => {
  const fra = planner.buildLanguageNameFilter({ knownName: 'English', targetName: 'French' })
  const deu = planner.buildLanguageNameFilter({ knownName: 'English', targetName: 'German' })

  it('flags a German intro line as foreign to a French course', () => {
    expect(fra.namedLanguage("The German for: 'to speak', is:")).toBe('German')
  })

  it('bites in reverse for the German redo — a French line is foreign to a German course', () => {
    expect(deu.namedLanguage("The French for: 'to speak', is:")).toBe('French')
    expect(deu.namedLanguage("The German for: 'to speak', is:")).toBeNull()
  })

  it('allows the course to name its own known and target languages', () => {
    expect(fra.namedLanguage("The French for: 'I want', is:")).toBeNull()
    expect(fra.namedLanguage('I want to speak French with you now')).toBeNull()
    expect(fra.namedLanguage('English')).toBeNull()
  })

  it('catches the widened-search trap — an eng_for_hin line naming Hindi', () => {
    expect(fra.namedLanguage("The Hindi for: 'to speak', is:")).toBe('Hindi')
  })

  it('matches whole words only, so it does not fire on a substring', () => {
    expect(fra.namedLanguage('the frenchman')).toBeNull()
    expect(fra.namedLanguage('polishing the table')).toBeNull()
  })

  it('refuses a candidate naming a foreign language however good the voice match', () => {
    const d = decideClip(
      clip({ text: "The French for: 'to speak', is:", role: 'presentation' }),
      [row({ role: 'presentation', text: "The German for: 'to speak', is:", course_code: 'deu_for_eng' })],
      opts({ languageFilter: fra })
    )
    expect(d.decision).toBe('RENDER')
  })

  it('BLOCKS rather than renders when the course\'s OWN text names a foreign language', () => {
    // The case exact text matching cannot catch: contamination already sitting
    // in this course, written by some earlier batch. The text is wrong, not the
    // audio, so it must not be quietly re-rendered in the wrong words.
    const d = decideClip(clip({ text: "The German for: 'I want', is:" }), [row()], opts({ languageFilter: fra }))
    expect(d.decision).toBe('BLOCKED')
    expect(d.namedLanguage).toBe('German')
  })
})

// ── role- and direction-agnostic lookup ────────────────────────────────────

describe('role-agnostic, direction-agnostic reuse (Tom: voice x text x language, nothing else)', () => {
  it('reuses an English clip sitting in a target2 role of an eng_for_X course', () => {
    const d = decideClip(
      clip({ role: 'known', language: 'eng', voiceId: 'xai_gfzdpspr5fdp' }),
      [row({ course_code: 'eng_for_hin', role: 'target2', voice_id: 'xai_gfzdpspr5fdp' })],
      opts()
    )
    expect(d.decision).toBe('REUSE_CROSS')
    expect(d.source.role).toBe('target2')
  })

  it('records the provenance of a cross-role borrow', () => {
    const d = decideClip(
      clip({ role: 'known', voiceId: 'xai_eve' }),
      [row({ course_code: 'eng_for_urd', role: 'target2' })],
      opts()
    )
    expect(d.source.courseCode).toBe('eng_for_urd')
    expect(d.source.role).toBe('target2')
  })

  it('still refuses to cross a role on an AZURE source — speed is baked into the mp3', () => {
    const d = decideClip(
      clip({ role: 'known', voiceId: 'azure_en-GB-SoniaNeural' }),
      [row({ role: 'target2', voice_id: 'azure_en-GB-SoniaNeural' })],
      opts()
    )
    expect(d.decision).toBe('RENDER')
    expect(d.reason).toMatch(/baked-speed/)
  })

  it('the baked-speed guard is Azure-shaped, not prefix-shaped', () => {
    // A BARE legacy id must not be treated as Azure — the estate's bare ids
    // include Tom's own xAI clone, and failing closed on them suppressed
    // exactly the voice the widening exists to surface.
    expect(planner.isSpeedTrustedVoice('gfzdpspr5fdp')).toBe(true)
    expect(planner.isSpeedTrustedVoice('eve')).toBe(true)
    expect(planner.isSpeedTrustedVoice('xai_eve')).toBe(true)
    expect(planner.isSpeedTrustedVoice('azure_en-GB-SoniaNeural')).toBe(false)
    expect(planner.isSpeedTrustedVoice('en-GB-SoniaNeural')).toBe(false)
    expect(planner.isSpeedTrustedVoice('fr-CA-SylvieNeural')).toBe(false)
  })

  it('crossRole:false restores strict same-role matching', () => {
    const d = decideClip(
      clip({ role: 'known', voiceId: 'xai_eve' }),
      [row({ role: 'target2' })],
      opts({ crossRole: false })
    )
    expect(d.decision).toBe('RENDER')
  })
})

// ── preferred source ordering ──────────────────────────────────────────────

describe('preferred source courses', () => {
  it('queries the named source first rather than finding it by luck', () => {
    const d = decideClip(
      clip(),
      [row({ id: 'random', course_code: 'kor_for_eng', created_at: '2026-08-06T00:00:00Z' }),
       row({ id: 'deu', course_code: 'deu_for_eng', created_at: '2026-01-01T00:00:00Z' })],
      opts({ preferredSourceCourses: ['deu_for_eng'] })
    )
    expect(d.source.audioId).toBe('deu')
    expect(d.source.courseCode).toBe('deu_for_eng')
  })

  it('still puts the course\'s OWN row ahead of a preferred source', () => {
    const d = decideClip(
      clip(),
      [row({ id: 'deu', course_code: 'deu_for_eng' }),
       row({ id: 'own', course_code: 'fra_for_eng' })],
      opts({ preferredSourceCourses: ['deu_for_eng'] })
    )
    expect(d.source.audioId).toBe('own')
  })

  it('falls through the preference list in order', () => {
    const d = decideClip(
      clip(),
      [row({ id: 'spa', course_code: 'spa_for_eng' })],
      opts({ preferredSourceCourses: ['deu_for_eng', 'spa_for_eng'] })
    )
    expect(d.source.courseCode).toBe('spa_for_eng')
  })
})

// ── rebuild mode: the versioned, no-holes swap ─────────────────────────────

describe('rebuild mode', () => {
  it('forces a REBUILD even when the clip is already perfectly satisfied', () => {
    const c = clip({ holders: [{ table: 'course_legos', id: 'l1', column: 'known_audio_id', currentAudioId: 'own' }] })
    const d = decideClip(c, [row({ id: 'own', course_code: 'fra_for_eng' })], opts({ rebuild: true }))
    expect(d.decision).toBe('REBUILD')
  })

  it('carries the EXISTING row as the swap target — this is what makes it hole-free', () => {
    // The row id must not move: holders keep pointing at it throughout, so the
    // course never references a missing clip at any instant.
    const d = decideClip(clip(), [row({ id: 'own', course_code: 'fra_for_eng', audio_revision: 2 })], opts({ rebuild: true }))
    expect(d.source.swapTargetAudioId).toBe('own')
    expect(d.source.currentRevision).toBe(2)
    expect(d.reason).toMatch(/revision 3/)
  })

  it('never picks ANOTHER course\'s row as a swap target', () => {
    const d = decideClip(clip(), [row({ id: 'foreign', course_code: 'kor_for_eng' })], opts({ rebuild: true }))
    expect(d.decision).toBe('REBUILD')
    expect(d.source).toBeNull()
  })

  it('rebuilds from nothing when the clip does not exist yet', () => {
    const d = decideClip(clip(), [], opts({ rebuild: true }))
    expect(d.decision).toBe('REBUILD')
    expect(d.source).toBeNull()
  })

  it('still refuses to rebuild a clip whose own text names a foreign language', () => {
    const fra = planner.buildLanguageNameFilter({ knownName: 'English', targetName: 'French' })
    const d = decideClip(clip({ text: "The German for: 'I want', is:" }), [row()], opts({ rebuild: true, languageFilter: fra }))
    expect(d.decision).toBe('BLOCKED')
  })

  it('a rebuild dry run writes nothing and names the target revision', async () => {
    const calls = { updates: [], upserts: [], deletes: [] }
    const db = { from: (t) => ({
      update: () => ({ eq: () => { calls.updates.push(t); return Promise.resolve({ error: null }) } }),
      upsert: () => { calls.upserts.push(t); return { select: () => ({ single: () => Promise.resolve({ data: { id: 'x' }, error: null }) }) } },
      delete: () => { calls.deletes.push(t); return { eq: () => Promise.resolve({ error: null }) } },
    }) }
    const p = recountPlan({ courseCode: 'fra_for_eng', rounds: 10, clips: [
      { ...clip(), decision: 'REBUILD', reason: 'x', reuseSource: { swapTargetAudioId: 'own', currentRevision: 1 } },
    ] })
    const log = await applyReusePlan(db, p, { dryRun: true, headObject: async () => ({ exists: true, size: 20000 }) })
    expect(calls.updates).toHaveLength(0)
    expect(calls.upserts).toHaveLength(0)
    expect(log.entries[0].action).toBe('WOULD_REBUILD')
    expect(log.entries[0].swapTargetAudioId).toBe('own')
    expect(log.entries[0].nextRevision).toBe(2)
  })

  it('a live rebuild relinks nothing when the row id is unchanged — no FK moves, no hole', async () => {
    const calls = { updates: [], deletes: [] }
    const db = { from: (t) => ({
      update: (patch) => ({ eq: (c, v) => { calls.updates.push({ t, patch, v }); return Promise.resolve({ error: null }) } }),
      delete: () => { calls.deletes.push(t); return { eq: () => Promise.resolve({ error: null }) } },
    }) }
    const p = recountPlan({ courseCode: 'fra_for_eng', rounds: 10, clips: [
      { ...clip({ holders: [{ table: 'course_legos', id: 'l1', column: 'known_audio_id', currentAudioId: 'own' }] }),
        decision: 'REBUILD', reason: 'x', reuseSource: { swapTargetAudioId: 'own', currentRevision: 1 } },
    ] })
    const log = await applyReusePlan(db, p, {
      dryRun: false, bumpStamp: false,
      headObject: async () => ({ exists: true, size: 20000 }),
      // the renderer publishes into the SAME row id — that is the contract
      renderClip: async () => ({ audioId: 'own', s3Key: 'mastered/NEW.mp3', durationMs: 900, revision: 2, previousS3Key: 'mastered/OLD.mp3', swappedInPlace: true }),
    })
    expect(log.entries[0].action).toBe('REBUILT')
    expect(log.entries[0].revision).toBe(2)
    expect(log.entries[0].swappedInPlace).toBe(true)
    // the holder already points at 'own', so relinkHolders must be a no-op
    expect(log.entries[0].holdersUpdated).toHaveLength(0)
    expect(calls.deletes).toHaveLength(0)
    expect(log.deletionsPerformed).toBe(0)
  })
})

describe('rebuild picks its swap target deterministically', () => {
  it('prefers the EXACT voice-id row over an era-crossing sibling', () => {
    // Regression: a bare .find() took whichever row came back first, which
    // pointed one clip at the legacy `eve` row while its siblings sat on
    // `xai_eve`. Same voice, but the target must not depend on row order.
    const d = decideClip(
      clip(),
      [row({ id: 'legacy', course_code: 'fra_for_eng', voice_id: 'eve', created_at: '2026-08-05T00:00:00Z' }),
       row({ id: 'exact', course_code: 'fra_for_eng', voice_id: 'xai_eve', created_at: '2026-08-01T00:00:00Z' })],
      opts({ rebuild: true })
    )
    expect(d.source.swapTargetAudioId).toBe('exact')
  })

  it('falls back to the newest row when every candidate is era-crossing', () => {
    const d = decideClip(
      clip(),
      [row({ id: 'old', course_code: 'fra_for_eng', voice_id: 'eve', created_at: '2026-01-01T00:00:00Z' }),
       row({ id: 'new', course_code: 'fra_for_eng', voice_id: 'eve', created_at: '2026-08-05T00:00:00Z' })],
      opts({ rebuild: true })
    )
    expect(d.source.swapTargetAudioId).toBe('new')
  })
})

// ── intros are never borrowed ───────────────────────────────────────────────

describe('freshRoles — intros are never borrowed from another course', () => {
  // Tom, 2026-08-07, carrying the fra_for_eng clone English into deu_for_eng:
  // reuse the pooled known lines, but "intros ALWAYS rendered fresh, never
  // reused". A presentation line is the one clip whose text is ABOUT the
  // course it belongs to, so borrowing one is a course-identity error.
  const intro = (over = {}) => clip({
    role: 'presentation',
    text: "The German for: 'I want', is:",
    clipKey: "*|eng|xai_gfzdpspr5fdp|the german for i want is",
    voiceId: 'xai_gfzdpspr5fdp',
    ...over,
  })
  const introRow = (over = {}) => row({
    role: 'presentation',
    text: "The German for: 'I want', is:",
    text_normalized: 'the german for i want is',
    voice_id: 'xai_gfzdpspr5fdp',
    ...over,
  })

  it('rejects an exact match from another course and renders instead', () => {
    const d = decideClip(
      intro(),
      [introRow({ course_code: 'deu_ch_for_eng' })],
      opts({ courseCode: 'deu_for_eng', freshRoles: ['presentation'] })
    )
    expect(d.decision).toBe('RENDER')
    expect(d.reason).toContain('intros are never borrowed')
    expect(d.source).toBeNull()
  })

  it('still accepts this course OWN row, so re-running a range never re-buys audio', () => {
    const own = introRow({ course_code: 'deu_for_eng', id: 'own-intro' })
    const d = decideClip(
      intro({ holders: [{ table: 'course_legos', id: 'l1', column: 'presentation_audio_id', currentAudioId: 'own-intro' }] }),
      [own],
      opts({ courseCode: 'deu_for_eng', freshRoles: ['presentation'] })
    )
    expect(d.decision).toBe('SATISFIED')
  })

  it('leaves every OTHER role free to borrow across courses', () => {
    const d = decideClip(
      clip({ voiceId: 'xai_gfzdpspr5fdp' }),
      [row({ course_code: 'fra_for_eng', voice_id: 'xai_gfzdpspr5fdp' })],
      opts({ courseCode: 'deu_for_eng', freshRoles: ['presentation'] })
    )
    expect(d.decision).toBe('REUSE_CROSS')
    expect(d.source.courseCode).toBe('fra_for_eng')
  })

  it('with no freshRoles configured, nothing changes', () => {
    const d = decideClip(
      intro(),
      [introRow({ course_code: 'deu_ch_for_eng' })],
      opts({ courseCode: 'deu_for_eng' })
    )
    expect(d.decision).toBe('REUSE_CROSS')
  })
})

// ── concurrency ─────────────────────────────────────────────────────────────

describe('applyReusePlan concurrency — more hands, same log', () => {
  const src = (id) => ({ audioId: id, courseCode: 'kor_for_eng', s3Key: `mastered/${id}.mp3`, durationMs: 1000 })
  const clips = (n) => Array.from({ length: n }, (_, i) => ({
    ...clip({
      clipKey: `k${i}`,
      text: `text ${i}`,
      holders: [{ table: 'course_practice_phrases', id: `p${i}`, column: 'known_audio_id', currentAudioId: null }],
    }),
    decision: 'REUSE_CROSS',
    reason: 'x',
    reuseSource: src(`a${i}`),
  }))

  const db = () => ({
    from () {
      return {
        update () { return { eq: () => Promise.resolve({ error: null }) } },
        upsert () { return { select: () => ({ single: () => Promise.resolve({ data: { id: 'new-row-id' }, error: null }) }) } },
      }
    },
  })

  it('defaults to serial — the proven behaviour is what you get unasked', async () => {
    let live = 0, peak = 0
    const head = async () => { live++; peak = Math.max(peak, live); await new Promise(r => setTimeout(r, 5)); live--; return { exists: true, size: 20000 } }
    await applyReusePlan(db(), recountPlan({ courseCode: 'fra_for_eng', rounds: 10, voices: {}, shape: {}, clips: clips(6) }), { dryRun: false, bumpStamp: false, headObject: head })
    expect(peak).toBe(1)
  })

  it('runs up to `concurrency` clips at once when asked', async () => {
    let live = 0, peak = 0
    const head = async () => { live++; peak = Math.max(peak, live); await new Promise(r => setTimeout(r, 5)); live--; return { exists: true, size: 20000 } }
    await applyReusePlan(db(), recountPlan({ courseCode: 'fra_for_eng', rounds: 10, voices: {}, shape: {}, clips: clips(12) }), { dryRun: false, bumpStamp: false, headObject: head, concurrency: 4 })
    expect(peak).toBeGreaterThan(1)
    expect(peak).toBeLessThanOrEqual(4)
  })

  it('writes the log in PLAN order regardless of who finished first', async () => {
    // Later clips resolve FASTER, so a push-as-you-go log would come back
    // shuffled. The artifact has to stay diffable against the dry run.
    const clipList = clips(8)
    const delayFor = {}
    clipList.forEach((c, i) => { delayFor[c.reuseSource.s3Key] = (8 - i) * 4 })
    const head = async (key) => { await new Promise(r => setTimeout(r, delayFor[key])); return { exists: true, size: 20000 } }
    const log = await applyReusePlan(db(), recountPlan({ courseCode: 'fra_for_eng', rounds: 10, voices: {}, shape: {}, clips: clipList }), { dryRun: false, bumpStamp: false, headObject: head, concurrency: 8 })
    expect(log.entries.map(e => e.clipKey)).toEqual(clipList.map(c => c.clipKey))
    expect(log.errors).toHaveLength(0)
    expect(log.deletionsPerformed).toBe(0)
  })

  it('one clip failing under concurrency does not lose the others', async () => {
    const clipList = clips(6)
    const head = async (key) => (key === 'mastered/a3.mp3' ? { exists: false, size: null } : { exists: true, size: 20000 })
    const log = await applyReusePlan(db(), recountPlan({ courseCode: 'fra_for_eng', rounds: 10, voices: {}, shape: {}, clips: clipList }), { dryRun: false, bumpStamp: false, headObject: head, concurrency: 4 })
    expect(log.entries).toHaveLength(6)
    expect(log.entries[3].action).toBe('FAILED')
    expect(log.errors).toHaveLength(1)
    expect(log.entries.filter(e => e.action === 'REUSED_CROSS')).toHaveLength(5)
  })
})


describe('round bands — a full course is ~1,500 rounds, so a pass must be able to start past round 1', () => {
  const script = Array.from({ length: 10 }, (_, i) => ({ roundNumber: i + 1 }))
  const nums = (rs) => rs.map(r => r.roundNumber)

  it('defaults to the whole prefix — the only shape this ever had', () => {
    expect(nums(roundsInBand(script))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(nums(roundsInBand(script, 1, 10))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('is inclusive at both ends, so consecutive bands tile with no gap and no overlap', () => {
    const first = nums(roundsInBand(script, 1, 4))
    const second = nums(roundsInBand(script, 5, 10))
    expect(first).toEqual([1, 2, 3, 4])
    expect(second).toEqual([5, 6, 7, 8, 9, 10])
    expect([...first, ...second]).toEqual(nums(script))
    expect(first.filter(n => second.includes(n))).toEqual([])
  })

  it('a single round is a legal band', () => {
    expect(nums(roundsInBand(script, 7, 7))).toEqual([7])
  })

  it('an inverted or out-of-range band is empty, not a throw — the caller names the course', () => {
    expect(roundsInBand(script, 9, 3)).toEqual([])
    expect(roundsInBand(script, 99, 200)).toEqual([])
  })

  it('survives a generator that emitted nothing', () => {
    expect(roundsInBand(null, 1, 10)).toEqual([])
    expect(roundsInBand(undefined)).toEqual([])
  })
})

describe('verdict cache — whisper is the dominant cost, and bands re-ask the same question', () => {
  const planWith = (clips) => recountPlan({ courseCode: 'fra_for_eng', rounds: 10, clips })
  const sat = (over = {}) => ({
    ...clip(), decision: 'SATISFIED', reason: 'already linked',
    reuseSource: { s3Key: 'mastered/A.mp3' }, ...over,
  })
  // A cache that only ever answers; if the code decodes, the count rises.
  const mkVeracity = (verdict, counter) => ({
    checkAudioVeracity: async () => { counter.n++; return verdict },
  })
  const mkCache = () => {
    const m = new Map()
    return { m, get: (k) => m.get(k), set: (k, v) => m.set(k, v) }
  }
  const PASS = { pass: true, checked: true, reason: 'ok', cer: 0 }
  const FAIL = { pass: false, checked: true, reason: 'last_word_missing', cer: 0.29, decode: 'i want to' }

  it('without a cache, behaviour is exactly as before — every clip is decoded', async () => {
    const c = { n: 0 }
    const p = planWith([sat(), sat({ clipKey: 'k2' })])
    await verifyPlanVeracity(p, { fetchObject: async () => Buffer.from('x'), veracity: mkVeracity(PASS, c) })
    expect(c.n).toBe(2)
    expect(p.heard.cached).toBe(0)
  })

  it('the same clip in a later band is answered from cache, not re-decoded', async () => {
    const cache = mkCache()
    const c = { n: 0 }
    const band1 = planWith([sat()])
    await verifyPlanVeracity(band1, { fetchObject: async () => Buffer.from('x'), veracity: mkVeracity(PASS, c), verdictCache: cache })
    expect(c.n).toBe(1)

    // Band 2 replays the very same clip — review offsets reach back thousands of rounds.
    const band2 = planWith([sat()])
    await verifyPlanVeracity(band2, { fetchObject: async () => Buffer.from('x'), veracity: mkVeracity(PASS, c), verdictCache: cache })
    expect(c.n).toBe(1)              // NOT decoded again
    expect(band2.heard.cached).toBe(1)
    expect(band2.clips[0].heard.pass).toBe(true)
  })

  it('a cached DAMAGED verdict still promotes the clip to RENDER — the cache changes cost, never outcome', async () => {
    const cache = mkCache()
    const c = { n: 0 }
    const band1 = planWith([sat()])
    await verifyPlanVeracity(band1, { fetchObject: async () => Buffer.from('x'), veracity: mkVeracity(FAIL, c), verdictCache: cache })
    expect(band1.clips[0].decision).toBe('RENDER')

    const band2 = planWith([sat()])
    await verifyPlanVeracity(band2, { fetchObject: async () => { throw new Error('must not fetch') }, veracity: mkVeracity(FAIL, c), verdictCache: cache })
    expect(c.n).toBe(1)
    expect(band2.clips[0].decision).toBe('RENDER')
    expect(band2.clips[0].decisionBeforeVeracity).toBe('SATISFIED')
    expect(band2.summary.render).toBe(1)
  })

  it('different TEXT against the same object is a different question, and is decoded', async () => {
    const cache = mkCache()
    const c = { n: 0 }
    await verifyPlanVeracity(planWith([sat()]), { fetchObject: async () => Buffer.from('x'), veracity: mkVeracity(PASS, c), verdictCache: cache })
    await verifyPlanVeracity(planWith([sat({ text: 'something else entirely' })]),
      { fetchObject: async () => Buffer.from('x'), veracity: mkVeracity(PASS, c), verdictCache: cache })
    expect(c.n).toBe(2)
  })

  it('different LANGUAGE against the same object is a different question too', async () => {
    const cache = mkCache()
    const c = { n: 0 }
    await verifyPlanVeracity(planWith([sat()]), { fetchObject: async () => Buffer.from('x'), veracity: mkVeracity(PASS, c), verdictCache: cache })
    await verifyPlanVeracity(planWith([sat({ language: 'fra' })]),
      { fetchObject: async () => Buffer.from('x'), veracity: mkVeracity(PASS, c), verdictCache: cache })
    expect(c.n).toBe(2)
  })

  it('a different OBJECT is never answered from another object cache entry', async () => {
    const cache = mkCache()
    const c = { n: 0 }
    await verifyPlanVeracity(planWith([sat()]), { fetchObject: async () => Buffer.from('x'), veracity: mkVeracity(PASS, c), verdictCache: cache })
    await verifyPlanVeracity(planWith([sat({ reuseSource: { s3Key: 'mastered/B.mp3' } })]),
      { fetchObject: async () => Buffer.from('x'), veracity: mkVeracity(PASS, c), verdictCache: cache })
    expect(c.n).toBe(2)
  })

  it('an UNANSWERABLE check is never cached — a whisper outage must not freeze into a permanent verdict', async () => {
    const cache = mkCache()
    const c = { n: 0 }
    const p1 = planWith([sat()])
    await verifyPlanVeracity(p1, { fetchObject: async () => { throw new Error('s3 down') }, veracity: mkVeracity(PASS, c), verdictCache: cache })
    expect(p1.clips[0].heard.checked).toBe(false)
    expect(p1.clips[0].decision).toBe('SATISFIED')   // unknown never triggers a re-render
    expect(cache.m.size).toBe(0)

    // Storage comes back: the question is asked again for real.
    const p2 = planWith([sat()])
    await verifyPlanVeracity(p2, { fetchObject: async () => Buffer.from('x'), veracity: mkVeracity(PASS, c), verdictCache: cache })
    expect(c.n).toBe(1)
    expect(p2.clips[0].heard.pass).toBe(true)
  })

  it('deduplicates WITHIN one run too — a plan can name the same object twice', async () => {
    const cache = mkCache()
    const c = { n: 0 }
    const p = planWith([sat({ clipKey: 'a' }), sat({ clipKey: 'b' })])
    await verifyPlanVeracity(p, { fetchObject: async () => Buffer.from('x'), veracity: mkVeracity(PASS, c), verdictCache: cache, concurrency: 1 })
    expect(c.n).toBe(1)
    expect(p.heard.cached).toBe(1)
  })
})

// ── own clips are not a source (Tom, 2026-08-08 02:02Z) ────────────────────
//
// "we are not checking any internal clips first from French or German ...
// because we KNOW that both French and German are bobbins. all French and
// German clips in the current courses are being wiped and replaced — either
// from other courses contributions to the pool, or by regeneration."
//
// The damage is ours: until 2026-08-05 masterAudio trimmed at the tail
// detector's timestamp, eating every word after a natural mid-sentence pause.
// So the policy is a DATE, not a boolean — and the date is what keeps a banded
// run idempotent across restarts.

describe('own-course clips are not a reuse source when distrusted', () => {
  const CUT = '2026-08-05'
  const ownOld = () => row({ id: 'own-old', course_code: 'fra_for_eng', created_at: '2026-07-01T00:00:00Z' })
  const ownNew = () => row({ id: 'own-new', course_code: 'fra_for_eng', created_at: '2026-08-07T00:00:00Z' })
  const foreign = () => row({ id: 'far', course_code: 'spa_for_eng', created_at: '2026-07-01T00:00:00Z' })

  it('prefers a foreign clip over this course\'s own distrusted one', () => {
    const d = decideClip(clip(), [ownOld(), foreign()], opts({ distrustOwnBefore: CUT }))
    expect(d.decision).toBe('REUSE_CROSS')
    expect(d.source.courseCode).toBe('spa_for_eng')
  })

  it('renders fresh when the only candidate is its own distrusted clip', () => {
    const d = decideClip(clip(), [ownOld()], opts({ distrustOwnBefore: CUT }))
    expect(d.decision).toBe('RENDER')
  })

  it('still swaps in place, so no holder FK moves and nothing goes silent', () => {
    const d = decideClip(clip(), [ownOld()], opts({ distrustOwnBefore: CUT }))
    expect(d.source.swapTargetAudioId).toBe('own-old')
    expect(d.source.currentRevision).toBe(1)
  })

  it('TRUSTS an own clip written after the post-processing fix — this is what makes a restart idempotent', () => {
    const c = clip({ holders: [{ table: 't', id: 'p1', column: 'known_audio_id', currentAudioId: 'own-new' }] })
    const d = decideClip(c, [ownNew()], opts({ distrustOwnBefore: CUT }))
    expect(d.decision).toBe('SATISFIED')
  })

  it('trusts an old row that was RE-RENDERED IN PLACE since the cutoff', () => {
    // The swap bumps audio_revision and writes a history row but deliberately
    // leaves created_at alone. Without the revision set, tonight's own output
    // would be re-bought on every band restart.
    const c = clip({ holders: [{ table: 't', id: 'p1', column: 'known_audio_id', currentAudioId: 'own-old' }] })
    const d = decideClip(c, [ownOld()], opts({ distrustOwnBefore: CUT, ownRevisedSince: new Set(['own-old']) }))
    expect(d.decision).toBe('SATISFIED')
  })

  it('never falls back onto the distrusted row and calls it a cross-course reuse', () => {
    const d = decideClip(clip(), [ownOld()], opts({ distrustOwnBefore: CUT }))
    expect(d.decision).not.toBe('REUSE_CROSS')
    expect(d.decision).not.toBe('REUSE_OWN')
  })

  it('a fresh role with only a distrusted own clip renders rather than borrowing', () => {
    const c = clip({ role: 'presentation', clipKey: 'presentation|eng|xai_eve|the french for' })
    const d = decideClip(c,
      [row({ id: 'own-old', course_code: 'fra_for_eng', role: 'presentation', created_at: '2026-07-01T00:00:00Z' }),
       row({ id: 'far', course_code: 'spa_for_eng', role: 'presentation' })],
      opts({ distrustOwnBefore: CUT, freshRoles: ['presentation'] }))
    expect(d.decision).toBe('RENDER')
  })

  it('is inert when no cutoff is given — every other job keeps its own behaviour', () => {
    const c = clip({ holders: [{ table: 't', id: 'p1', column: 'known_audio_id', currentAudioId: 'own-old' }] })
    expect(decideClip(c, [ownOld()], opts()).decision).toBe('SATISFIED')
  })
})
