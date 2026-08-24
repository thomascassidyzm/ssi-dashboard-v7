/**
 * Guard tests for relink-off-cast-explainer-clips.cjs.
 *
 * Two things in this tool decide whether a LIVE learner hears the right voice or
 * a wrong one, and neither can be checked by reading the run log afterwards:
 *
 *   1. voice identity. 'xai_yis75yfp' and 'yis75yfp' are ONE voice. Treating
 *      them as two would flag the whole fleet as off-cast and move links that
 *      were already correct. Composite ids carry several voices at once and are
 *      only on-cast when EVERY component is cast.
 *   2. replacement choice. A composite, an off-cast voice, or a tie between two
 *      cast narrators must never be chosen — an unresolved row is the honest
 *      outcome, a guessed narrator is a defect on air.
 */
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)
const {
  norm, voicesOf, isComposite, castVoices, knownCastVoices, isOffCast, chooseReplacement,
} = require_('./relink-off-cast-explainer-clips.cjs')

const SPEAKERS = {
  Anna: { known: { voice_id: 'bedd6226' }, target: { voice_id: 'eve' } },
  James: { known: { voice_id: 'xai_gfzdpspr5fdp' }, target: { voice_id: 'xai_rex' } },
}

describe('voice identity', () => {
  it('strips provider prefixes so one voice is one voice', () => {
    expect(norm('xai_yis75yfp')).toBe('yis75yfp')
    expect(norm('azure_en-GB-SoniaNeural')).toBe('en-GB-SoniaNeural')
    expect(norm('yis75yfp')).toBe('yis75yfp')
    expect(norm(null)).toBe('')
  })

  it('decomposes composite ids into every voice they speak', () => {
    expect(voicesOf('comp:xai_rex+azure_en-GB-SoniaNeural')).toEqual(['rex', 'en-GB-SoniaNeural'])
    expect(voicesOf('comp:leo')).toEqual(['leo'])
    expect(voicesOf('gfzdpspr5fdp')).toEqual(['gfzdpspr5fdp'])
    expect(isComposite('comp:leo')).toBe(true)
    expect(isComposite('gfzdpspr5fdp')).toBe(false)
  })
})

describe('cast reading', () => {
  it('unions both sides for the off-cast test, and known-only for narration', () => {
    expect([...castVoices(SPEAKERS)].sort()).toEqual(['bedd6226', 'eve', 'gfzdpspr5fdp', 'rex'])
    expect([...knownCastVoices(SPEAKERS)].sort()).toEqual(['bedd6226', 'gfzdpspr5fdp'])
  })

  it('survives a malformed speakers map without inventing voices', () => {
    expect(castVoices(null).size).toBe(0)
    expect(castVoices({ X: null, Y: 'nonsense' }).size).toBe(0)
  })
})

describe('isOffCast', () => {
  const cast = castVoices(SPEAKERS)

  it('calls a prefixed twin of a cast voice ON-cast', () => {
    expect(isOffCast('xai_gfzdpspr5fdp', cast)).toBe(false)
    expect(isOffCast('gfzdpspr5fdp', cast)).toBe(false)
  })

  it('flags a composite whose parts are not all cast', () => {
    expect(isOffCast('comp:xai_rex+azure_en-GB-SoniaNeural', cast)).toBe(true)
    expect(isOffCast('comp:ga-IE-ColmNeural+en-GB-SoniaNeural', cast)).toBe(true)
  })

  it('leaves a composite made entirely of cast voices alone', () => {
    expect(isOffCast('comp:xai_rex+bedd6226', cast)).toBe(false)
  })

  it('treats an unreadable voice id as off-cast rather than as fine', () => {
    expect(isOffCast('', cast)).toBe(true)
    expect(isOffCast(null, cast)).toBe(true)
  })
})

describe('chooseReplacement', () => {
  const knownCast = knownCastVoices(SPEAKERS)
  const base = { knownCast, preferVoice: null, courseCode: 'gle_for_eng' }
  const clip = (o) => ({ id: 'a', voice_id: 'gfzdpspr5fdp', course_code: 'gle_for_eng', created_at: '2026-06-10T00:00:00Z', ...o })

  it('takes an in-cast single-voice twin', () => {
    const out = chooseReplacement([clip({ id: 'twin' })], base)
    expect(out.clip.id).toBe('twin')
  })

  it('never takes a composite, even one built from cast voices', () => {
    const out = chooseReplacement([clip({ id: 'c', voice_id: 'comp:xai_rex+bedd6226' })], base)
    expect(out.clip).toBeNull()
    expect(out.reason).toMatch(/no in-cast clip/)
  })

  it('never takes an off-cast voice', () => {
    const out = chooseReplacement([clip({ id: 'x', voice_id: 'en-GB-SoniaNeural' })], base)
    expect(out.clip).toBeNull()
  })

  it('never takes a target-side voice to narrate', () => {
    const out = chooseReplacement([clip({ id: 'x', voice_id: 'xai_rex' })], base)
    expect(out.clip).toBeNull()
  })

  it('refuses to pick between two cast narrators', () => {
    const out = chooseReplacement(
      [clip({ id: 'a', voice_id: 'gfzdpspr5fdp' }), clip({ id: 'b', voice_id: 'bedd6226' })], base)
    expect(out.clip).toBeNull()
    expect(out.reason).toMatch(/ambiguous/)
  })

  it('lets the pod incumbent settle that tie without a guess', () => {
    const out = chooseReplacement(
      [clip({ id: 'a', voice_id: 'gfzdpspr5fdp' }), clip({ id: 'b', voice_id: 'bedd6226' })],
      { ...base, preferVoice: 'bedd6226' })
    expect(out.clip.id).toBe('b')
  })

  it('prefers the same course, then the newest render', () => {
    const out = chooseReplacement([
      clip({ id: 'other', course_code: 'ara_for_eng', created_at: '2026-08-01T00:00:00Z' }),
      clip({ id: 'old' }),
      clip({ id: 'new', created_at: '2026-07-01T00:00:00Z' }),
    ], base)
    expect(out.clip.id).toBe('new')
    expect(out.alternatives).toEqual(['old', 'other'])
  })

  it('reports no twin rather than throwing on an empty candidate list', () => {
    expect(chooseReplacement([], base).clip).toBeNull()
    expect(chooseReplacement(null, base).clip).toBeNull()
  })
})
