/**
 * A ROLE-WIDE RE-VOICE HAS TO SURVIVE A RESTART, BECAUSE THIS BOX RESTARTS.
 *
 * ops/watchdog/popty-staleness-watchdog.sh pulls main and restarts every Popty
 * service within ten minutes of ANY merge. On 2026-09-10 that killed a
 * 12,630-clip deu_at_for_eng re-voice twice — at 41 clips and at 431 — and
 * /regenerate-role regenerates EVERY row for its role, so restarting from the
 * top would have re-rendered, and re-paid for, everything already done.
 *
 * `onlyOtherVoices` is the fix: skip the rows already in the configured voice,
 * which makes the route idempotent and a re-run free. This file pins the rule
 * it turns on, and the two things it must not break.
 *
 * The rule is expressed against `sameVoice`, the same comparison the route
 * uses, because the trap is SPELLING: voice_config carries the provider's own
 * spelling of a Cartesia voice (a bare UUID) while course_audio carries the
 * identity spelling (cartesia_<uuid>). A resume filter that compared strings
 * would decide nothing was ever done and re-render the whole course.
 */
import { describe, it, expect } from 'vitest'

// Requiring phase8 starts its express listener unless told not to — the same
// flag services/phases/__fixtures__/phase8-sandbox.cjs sets, and the reason a
// bare require here collides with the live service on 3465.
process.env.PHASE8_NO_LISTEN = '1'
const phase8 = require('./phase8-audio-v13.cjs')
const { canonicalVoiceId } = require('../shared/clip-identity.cjs')

const BARE = '40e0f496-a220-46bb-975a-7ef465b3d92b'
const STORED = canonicalVoiceId(BARE, { provider: 'cartesia' })   // cartesia_<uuid>
const OTHER = 'azure_de-AT-IngridNeural'

/** The route's own filter, as applied: keep only rows not already in the voice. */
const remaining = (rows, storedVoiceId) =>
  rows.filter(a => !phase8.sameVoice(storedVoiceId, a.voice_id))

describe('onlyOtherVoices — the resume filter', () => {
  it('canonicalises the config spelling to the column spelling first', () => {
    // The route compares `storedVoiceId` — the config's bare provider spelling
    // put through canonicalClipVoiceId — against the column. If that step were
    // ever dropped, the filter would match nothing and a restart would cost a
    // second full render of the course.
    expect(STORED).toBe('cartesia_40e0f496-a220-46bb-975a-7ef465b3d92b')
    expect(remaining([{ id: 1, voice_id: STORED }], BARE).map(r => r.id)).toEqual([1])
  })

  it('keeps the rows still on the old voice and drops the ones already done', () => {
    const rows = [
      { id: 1, voice_id: OTHER },
      { id: 2, voice_id: STORED },
      { id: 3, voice_id: 'narakeet_fritzi' },
      { id: 4, voice_id: STORED },
    ]
    expect(remaining(rows, STORED).map(r => r.id)).toEqual([1, 3])
  })

  it('is idempotent: a second pass over a finished role has nothing left to do', () => {
    const done = [{ id: 1, voice_id: STORED }, { id: 2, voice_id: STORED }]
    expect(remaining(done, STORED)).toEqual([])
  })

  it('compares on the COLUMN spelling, and errs towards re-rendering', () => {
    expect(phase8.sameVoice(STORED, STORED)).toBe(true)
    expect(phase8.sameVoice(STORED, OTHER)).toBe(false)
    // A value with no provider prefix cannot be canonicalised without being
    // told the provider, so it does NOT match — and the row is therefore KEPT
    // for rendering. That is the safe direction and the one worth pinning: the
    // filter can cost an extra render, never a skipped one.
    expect(phase8.sameVoice(STORED, BARE)).toBe(false)
    expect(remaining([{ id: 9, voice_id: BARE }], STORED).map(r => r.id)).toEqual([9])
  })
})
