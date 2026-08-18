/**
 * Does pressing "Generate" replace bad audio, or re-link the old clip?
 *
 * These tests drive the SHIPPED getAudioNeeds() out of
 * services/phases/phase8-audio-v13.cjs — not a re-implementation of it — against
 * an in-memory PostgREST double. That is the point: the classification that
 * decides whether a slot costs a TTS render is the thing under test, so it has
 * to be the real function.
 *
 * Zero live DB, zero S3, zero TTS. The TTS double THROWS if reached, so a
 * regression that starts spending money fails the test rather than the invoice.
 *
 * Companion evidence: .a74-scratch/regen-repro/REPRO.md (job #105) runs the
 * complementary half — a real PostgreSQL (PGlite) carrying the live triggers and
 * the real UNIQUE index, with getAudioNeeds replicated. Between the two, both
 * the classification and the storage semantics are exercised as themselves.
 */

import { describe, it, expect } from 'vitest'

const {
  loadPhase8, fixtureTables, COURSE, BAD_S3_KEY,
} = require('./__fixtures__/phase8-sandbox.cjs')

const S3_HAS_THE_BAD_CLIP = new Set([BAD_S3_KEY])

function run({ linked, audioRowPresent, forceGenerate = false }) {
  const tables = fixtureTables({ linked, audioRowPresent })
  const { phase8, tts, db } = loadPhase8({ tables, s3Objects: S3_HAS_THE_BAD_CLIP })
  return phase8
    .getAudioNeeds(COURSE.course_code, 999, COURSE, forceGenerate, null)
    .then(r => ({ ...r, ttsCalls: tts.calls.length, db }))
}

describe('phase8 /generate is a fill-the-gaps tool, not a replace tool', () => {
  // LAYER 1 — getAudioNeeds:649 builds its candidate set from `.is(audioCol, null)`.
  it('never considers a bad clip that is still LINKED', async () => {
    const r = await run({ linked: true, audioRowPresent: true })

    expect(r.stats.breakdown.target1).toBe(0) // not even an unbound slot
    expect(r.toGenerate).toHaveLength(0)      // so no TTS is planned
    expect(r.toLink).toBe(0)
    expect(r.ttsCalls).toBe(0)
  })

  // LAYER 2 — phase8:787 keys the linkable bucket on normalizeText(text)|lang|role,
  // so the OLD row satisfies the now-empty slot and no render happens.
  it('re-links the SAME old row once the slot is unlinked (the workaround\'s step 1 alone is not enough)', async () => {
    const r = await run({ linked: false, audioRowPresent: true })

    expect(r.stats.breakdown.target1).toBe(1) // the slot is now a candidate...
    expect(r.toLink).toBe(1)                  // ...and is served the existing row
    expect(r.toGenerate).toHaveLength(0)      // no new audio is ever made
    expect(r.ttsCalls).toBe(0)
  })

  // Only removing the row — the destructive half of the documented workaround —
  // makes the text look new. This is break-before-make, against §6b doctrine.
  it('only produces real TTS once the old row is DELETED as well', async () => {
    const r = await run({ linked: false, audioRowPresent: false })

    expect(r.toLink).toBe(0)
    expect(r.toGenerate).toHaveLength(1)
    expect(r.toGenerate[0]).toMatchObject({ text: 'kotva', role: 'target1' })
  })

  // The escape hatch exists and works — but only for slots that are ALREADY
  // null, and no caller in src/, services/, api/ or tools/ ever passes it true.
  it('forceGenerate skips the re-link, but cannot reopen a still-linked slot', async () => {
    const unlinked = await run({ linked: false, audioRowPresent: true, forceGenerate: true })
    expect(unlinked.toLink).toBe(0)
    expect(unlinked.toGenerate).toHaveLength(1) // no delete needed

    const stillLinked = await run({ linked: true, audioRowPresent: true, forceGenerate: true })
    expect(stillLinked.toGenerate).toHaveLength(0) // layer 1 still wins
  })
})

describe('LAYER 3 — unique_course_audio_per_voice forbids a second row', () => {
  it('an ignoreDuplicates upsert for the same text+voice+role is a silent no-op', async () => {
    const tables = fixtureTables({ linked: true, audioRowPresent: true })
    const { supabase, db } = loadPhase8({ tables, s3Objects: S3_HAS_THE_BAD_CLIP })

    await supabase.from('course_audio').upsert([{
      course_code: COURSE.course_code,
      text: 'kotva',
      text_normalized: 'kotva',
      language: 'zzz',
      role: 'target1',
      voice_id: 'azure_zz-ZZ-TestNeural',
      origin: 'tts',
      s3_key: 'pending/BRAND-NEW.mp3',
      lego_id: null,
    }], {
      onConflict: 'course_code,text_normalized,language,role,voice_id',
      ignoreDuplicates: true,
    })

    // No second row, and the old bad object still owns the identity key. This is
    // why make-before-break cannot be satisfied by minting a replacement row:
    // there is nowhere to put it.
    expect(db.tables.course_audio).toHaveLength(1)
    expect(db.stats.dupIgnored).toBe(1)
    expect(db.stats.inserted).toBe(0)
    expect(db.tables.course_audio[0].s3_key).toBe(BAD_S3_KEY)
  })

  // The counterpart, and the correction to the original framing: the RENDER loop
  // (phase8:2415-2439) passes onConflict WITHOUT ignoreDuplicates, so PostgREST
  // uses merge-duplicates and the bytes ARE replaced in place, same row id.
  // Replacement is possible; the item just never gets that far.
  it('a merge-duplicates upsert DOES replace the bytes on the same row id', async () => {
    const tables = fixtureTables({ linked: true, audioRowPresent: true })
    const { supabase, db } = loadPhase8({ tables, s3Objects: S3_HAS_THE_BAD_CLIP })
    const idBefore = db.tables.course_audio[0].id

    await supabase.from('course_audio').upsert([{
      course_code: COURSE.course_code,
      text: 'kotva',
      text_normalized: 'kotva',
      language: 'zzz',
      role: 'target1',
      voice_id: 'azure_zz-ZZ-TestNeural',
      origin: 'tts',
      s3_key: 'mastered/NEW-GOOD.mp3',
    }], { onConflict: 'course_code,text_normalized,language,role,voice_id' })

    expect(db.tables.course_audio).toHaveLength(1)
    expect(db.tables.course_audio[0].id).toBe(idBefore)
    expect(db.tables.course_audio[0].s3_key).toBe('mastered/NEW-GOOD.mp3')
  })
})
