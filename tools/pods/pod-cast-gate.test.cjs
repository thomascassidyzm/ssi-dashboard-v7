/**
 * Unit tests for the pod cast gate (2026-08-23, Part B of Tom's Pod 1 rulings).
 *
 * What the gate is for: `movePod()` carries `speakers` across verbatim, so before
 * this existed a flip promoted whatever cast the staged pod happened to hold, and
 * the casting was bolted on afterwards by a separate recast sweep — per flip,
 * forever. The gate refuses to promote a pod that is not cast per conversation.
 *
 * The acceptance criterion under test is Tom's, and it is two numbers: ZERO
 * same-voice exchange pairs, and EXACTLY TWO voices in the cast. In his words —
 * "there's always male talking to female, so that two voices can actually do the
 * whole thing, rather than per character, which was the problem previously."
 */

import { describe, it, expect } from 'vitest'

const { checkPodCast } = require('./pod-cast-gate.cjs')

const F = { voice_id: 'sw-KE-ZuriNeural', name: 'Zuri', provider: 'azure' }
const M = { voice_id: 'sw-KE-RafikiNeural', name: 'Rafiki', provider: 'azure' }
const THIRD = { voice_id: 'sw-KE-SomeoneNeural', name: 'Someone', provider: 'azure' }

/** A two-hander: Anna and Guest alternating inside one scene. */
const twoHander = [
  { scene_number: 1, sentence_number: 1, global_order: 1, speaker: 'Anna', known_text: 'hello' },
  { scene_number: 1, sentence_number: 2, global_order: 2, speaker: 'Guest', known_text: 'hi' },
  { scene_number: 1, sentence_number: 3, global_order: 3, speaker: 'Anna', known_text: 'how are you' },
  { scene_number: 1, sentence_number: 4, global_order: 4, speaker: 'Guest', known_text: 'well' },
]

const castOf = (anna, guest, extra = {}) => ({
  Anna: { gender: 'f', target: anna, known: { voice_id: 'eng-narrator' } },
  Guest: { gender: 'm', target: guest, known: { voice_id: 'eng-narrator' } },
  ...extra,
})

describe('checkPodCast', () => {
  it('passes a two-hander cast to one voice each', () => {
    const r = checkPodCast({ rows: twoHander, speakers: castOf(F, M) })
    expect(r.ok).toBe(true)
    expect(r.failures).toEqual([])
    expect(r.voicesInUse).toHaveLength(2)
    expect(r.sameVoicePairs).toEqual([])
    expect(r.exchangePairs).toBe(1)
  })

  it('FAILS when two characters who talk to each other share a voice', () => {
    const r = checkPodCast({ rows: twoHander, speakers: castOf(F, F) })
    expect(r.ok).toBe(false)
    expect(r.sameVoicePairs).toHaveLength(1)
    expect(r.sameVoicePairs[0]).toMatchObject({ a: 'Anna', b: 'Guest', turns: 3 })
    expect(r.failures.join(' ')).toMatch(/same-voice exchange pair/)
  })

  it('FAILS a per-character cast — the exact shape Tom ruled against', () => {
    // Three characters, three voices, no same-voice collision anywhere. Under the
    // old per-character rule this was "correct"; it is the thing being replaced.
    const rows = [...twoHander,
      { scene_number: 1, sentence_number: 5, global_order: 5, speaker: 'Waiter', known_text: 'ready?' },
    ]
    const r = checkPodCast({
      rows,
      speakers: castOf(F, M, { Waiter: { gender: 'm', target: THIRD, known: { voice_id: 'eng-narrator' } } }),
    })
    expect(r.ok).toBe(false)
    expect(r.voicesInUse).toHaveLength(3)
    expect(r.sameVoicePairs).toEqual([])
    expect(r.failures.join(' ')).toMatch(/not 2/)
  })

  it('FAILS an uncast character rather than passing it silently', () => {
    const r = checkPodCast({ rows: twoHander, speakers: { Anna: { target: F } } })
    expect(r.ok).toBe(false)
    expect(r.uncast).toEqual(['Guest'])
    expect(r.failures.join(' ')).toMatch(/no target voice/)
  })

  it('FAILS a pod with no cast at all, and a pod with no rows', () => {
    expect(checkPodCast({ rows: twoHander, speakers: null }).ok).toBe(false)
    const empty = checkPodCast({ rows: [], speakers: castOf(F, M) })
    expect(empty.ok).toBe(false)
    expect(empty.failures.join(' ')).toMatch(/no sentence rows/)
  })

  it('does not count a scene boundary as an exchange', () => {
    // Anna ends scene 1, Guest opens scene 2: they never spoke to each other, so
    // sharing a voice across that boundary is not a collision.
    const rows = [
      { scene_number: 1, sentence_number: 1, global_order: 1, speaker: 'Anna', known_text: 'a' },
      { scene_number: 2, sentence_number: 1, global_order: 2, speaker: 'Guest', known_text: 'b' },
    ]
    const r = checkPodCast({ rows, speakers: castOf(F, F) })
    expect(r.exchangePairs).toBe(0)
    expect(r.sameVoicePairs).toEqual([])
    // Still fails, but on the voice COUNT — one voice, not two — never on a collision.
    expect(r.failures.join(' ')).toMatch(/not 2/)
  })

  it('normalises the voice-id prefix — `eve` and `xai_eve` are ONE voice', () => {
    const r = checkPodCast({
      rows: twoHander,
      speakers: castOf({ voice_id: 'eve' }, { voice_id: 'xai_eve' }),
    })
    expect(r.voicesInUse).toHaveLength(1)
    expect(r.sameVoicePairs).toHaveLength(1)
    expect(r.ok).toBe(false)
  })

  it('matches the cast on the CANONICAL speaker name, parenthesised markers and all', () => {
    // Estate rows carry "Anna (F)" / "Susjed (08:00)"; both cast stores are keyed
    // bare, so a gate that compared raw strings would report every pod uncast.
    const rows = twoHander.map(r => ({ ...r, speaker: `${r.speaker} (${r.speaker === 'Anna' ? 'F' : 'M'})` }))
    const r = checkPodCast({ rows, speakers: castOf(F, M) })
    expect(r.speakers).toEqual(['Anna', 'Guest'])
    expect(r.ok).toBe(true)
  })

  it('honours _default — and a _default-only cast is a ONE-voice pod, so it fails', () => {
    const r = checkPodCast({ rows: twoHander, speakers: { _default: { target: F } } })
    expect(r.uncast).toEqual([])            // nobody is uncast...
    expect(r.sameVoicePairs).toHaveLength(1) // ...they are all the same person
    expect(r.ok).toBe(false)
  })

  it('gates the TARGET track, never the known track', () => {
    // The eng_for_* shape is one narrator reading every character's known line.
    // That is a single voice by design and must not be judged by a two-voice rule.
    const r = checkPodCast({ rows: twoHander, speakers: castOf(F, M), track: 'known' })
    expect(r.voicesInUse).toEqual(['eng-narrator'])
    expect(r.ok).toBe(false) // it WOULD fail — which is why the callers pass target
    expect(checkPodCast({ rows: twoHander, speakers: castOf(F, M) }).track).toBe('target')
  })
})
