/**
 * Unit tests for the pod-cast-six-check template (C1-C5), against synthetic
 * fixtures — no live DB. Source: docs/pods/spa-pod1-casting-construction-audit-2026-08-24.md
 * §"The template check, for the other 20 courses".
 */

import { describe, it, expect } from 'vitest'

const { checkC1, checkC4, checkC5, bruteForceMinCollisions } = require('./pod-cast-six-check.cjs')

const OLIVIA = { name: 'Olivia', provider: 'xai', voice_id: 'bedd6226', locale: 'en' }
const CLONE = { name: 'Tom', provider: 'xai', voice_id: 'gfzdpspr5fdp', locale: 'en' }
const ELVIRA = { name: 'Elvira', provider: 'azure', voice_id: 'es-ES-ElviraNeural', locale: 'es-ES' }
const MANUEL = { name: 'Manuel', provider: 'xai', voice_id: 'yis75yfp', locale: 'es-ES' }
const THIRD = { name: 'Someone', provider: 'azure', voice_id: 'es-ES-SomeoneNeural', locale: 'es-ES' }

const castOf = (extra = {}) => ({
  Anna: { gender: 'f', target: ELVIRA, known: OLIVIA, variants: ['Anna'] },
  Guest: { gender: 'm', target: MANUEL, known: CLONE, variants: ['Guest'] },
  ...extra,
})

describe('checkC1 — voice inventory', () => {
  it('passes exactly 2 target + 2 known voices, known pair = clone + Olivia', () => {
    const r = checkC1(castOf())
    expect(r.pass).toBe(true)
    expect(r.targetVoices).toHaveLength(2)
    expect(r.knownVoices).toHaveLength(2)
    expect(r.knownPairOk).toBe(true)
  })

  it('FAILS a third target voice', () => {
    const r = checkC1(castOf({ Waiter: { gender: 'm', target: THIRD, known: CLONE } }))
    expect(r.pass).toBe(false)
    expect(r.targetVoices).toHaveLength(3)
  })

  it('FAILS when the known pair is not clone + Olivia', () => {
    const r = checkC1(castOf({ Waiter: { gender: 'f', target: ELVIRA, known: { ...OLIVIA, voice_id: 'someone-else' } } }))
    expect(r.pass).toBe(false)
    expect(r.knownPairOk).toBe(false)
  })

  it('normalises the xai_/azure_ voice-id prefix', () => {
    const r = checkC1({
      Anna: { gender: 'f', target: ELVIRA, known: { ...OLIVIA, voice_id: 'xai_bedd6226' } },
      Guest: { gender: 'm', target: MANUEL, known: { ...CLONE, voice_id: 'xai_gfzdpspr5fdp' } },
    })
    expect(r.pass).toBe(true)
  })
})

describe('checkC4 — scene cast size', () => {
  it('passes a clean two-hander scene', () => {
    const rows = [
      { scene_number: 1, sentence_number: 1, global_order: 1, speaker: 'Anna' },
      { scene_number: 1, sentence_number: 2, global_order: 2, speaker: 'Guest' },
      { scene_number: 1, sentence_number: 3, global_order: 3, speaker: 'Anna' },
    ]
    const r = checkC4(rows)
    expect(r.pass).toBe(true)
    expect(r.scenes).toEqual([{ scene: 1, characterCount: 2, characters: ['Anna', 'Guest'] }])
  })

  it('FLAGS a scene with 4 characters', () => {
    const rows = ['Cafe Barista', 'Cafe Customer 1', 'Cafe Customer 2', 'Cafe Customer 3'].map((speaker, i) => ({
      scene_number: 7, sentence_number: i + 1, global_order: i + 1, speaker,
    }))
    const r = checkC4(rows)
    expect(r.pass).toBe(false)
    expect(r.flagged).toHaveLength(1)
    expect(r.flagged[0].characterCount).toBe(4)
  })

  it('excludes the Narrator drill line from the count', () => {
    const rows = [
      { scene_number: 1, sentence_number: 1, global_order: 1, speaker: 'Anna' },
      { scene_number: 1, sentence_number: 2, global_order: 2, speaker: 'Guest' },
      { scene_number: 1, sentence_number: 3, global_order: 3, speaker: 'Narrator' },
    ]
    const r = checkC4(rows)
    expect(r.pass).toBe(true)
    expect(r.scenes[0].characterCount).toBe(2)
  })

  it('resolves parenthesised variants to the same canonical character', () => {
    const rows = [
      { scene_number: 1, sentence_number: 1, global_order: 1, speaker: 'Neighbour (8 am)' },
      { scene_number: 1, sentence_number: 2, global_order: 2, speaker: 'Anna' },
      { scene_number: 1, sentence_number: 3, global_order: 3, speaker: 'Neighbour' },
    ]
    const r = checkC4(rows)
    expect(r.scenes[0].characterCount).toBe(2)
    expect(r.scenes[0].characters).toEqual(['Anna', 'Neighbour'])
  })
})

describe('checkC5 — adjacent hand-offs', () => {
  it('reports zero collisions for a two-hander cast to two voices', () => {
    const rows = [
      { scene_number: 1, sentence_number: 1, global_order: 1, speaker: 'Anna' },
      { scene_number: 1, sentence_number: 2, global_order: 2, speaker: 'Guest' },
      { scene_number: 1, sentence_number: 3, global_order: 3, speaker: 'Anna' },
    ]
    const r = checkC5(rows, castOf())
    expect(r.pass).toBe(true)
    expect(r.totalCurrent).toBe(0)
    expect(r.totalOptimal).toBe(0)
  })

  it('counts a hand-off when consecutive different speakers share a voice', () => {
    // Bar Customer 1 -> Bar Customer 2, both female-cast (Elvira) — a same-voice hand-off.
    const speakers = castOf({
      'Bar Customer 1': { gender: 'f', target: ELVIRA, known: OLIVIA },
      'Bar Customer 2': { gender: 'f', target: ELVIRA, known: OLIVIA },
    })
    const rows = [
      { scene_number: 8, sentence_number: 1, global_order: 1, speaker: 'Bar Customer 1' },
      { scene_number: 8, sentence_number: 2, global_order: 2, speaker: 'Bar Customer 2' },
    ]
    const r = checkC5(rows, speakers)
    expect(r.pass).toBe(false)
    expect(r.totalCurrent).toBe(1)
    // Only 2 nodes, 1 edge — the optimal 2-colouring puts them on different sides: 0.
    expect(r.totalOptimal).toBe(0)
  })

  it('finds a better colouring than the current cast when one exists (odd cycle)', () => {
    // A-B-C chain, all cast to the same voice: 2 collisions today.
    // Optimal 2-colouring of a 3-node path is 1 collision (path graphs are bipartite... a chain of
    // 2 edges A-B, B-C: colour A=0,B=1,C=0 -> 0 collisions is achievable).
    const speakers = castOf({
      A: { gender: 'f', target: ELVIRA, known: OLIVIA },
      B: { gender: 'f', target: ELVIRA, known: OLIVIA },
      C: { gender: 'f', target: ELVIRA, known: OLIVIA },
    })
    const rows = [
      { scene_number: 1, sentence_number: 1, global_order: 1, speaker: 'A' },
      { scene_number: 1, sentence_number: 2, global_order: 2, speaker: 'B' },
      { scene_number: 1, sentence_number: 3, global_order: 3, speaker: 'C' },
    ]
    const r = checkC5(rows, speakers)
    expect(r.totalCurrent).toBe(2) // A-B and B-C both collide today (all one voice)
    expect(r.totalOptimal).toBe(0) // a 2-colouring of a path has zero forced collisions
    expect(r.scenes[0].avoidable).toBe(2)
  })

  it('excludes the Narrator drill line from the hand-off graph', () => {
    // Guest speaks last before the scene's Narrator drill; Narrator happens to
    // share Guest's voice. Not a dialogue hand-off (audit §3) and must not count,
    // consistent with C4's own Narrator exclusion.
    const speakers = castOf({
      Narrator: { gender: 'm', target: MANUEL, known: CLONE },
    })
    const rows = [
      { scene_number: 1, sentence_number: 1, global_order: 1, speaker: 'Anna' },
      { scene_number: 1, sentence_number: 2, global_order: 2, speaker: 'Guest' },
      { scene_number: 1, sentence_number: 3, global_order: 3, speaker: 'Narrator' },
    ]
    const r = checkC5(rows, speakers)
    expect(r.totalCurrent).toBe(0)
    expect(r.totalOptimal).toBe(0)
  })

  it('does not count a scene boundary as a hand-off', () => {
    const speakers = castOf()
    const rows = [
      { scene_number: 1, sentence_number: 1, global_order: 1, speaker: 'Anna' },
      { scene_number: 2, sentence_number: 1, global_order: 2, speaker: 'Guest' },
    ]
    const r = checkC5(rows, speakers)
    expect(r.totalCurrent).toBe(0)
  })
})

describe('bruteForceMinCollisions', () => {
  it('finds 0 for an odd-length path (always bipartite)', () => {
    const weights = new Map([['A|B', 3], ['B|C', 5]])
    expect(bruteForceMinCollisions(['A', 'B', 'C'], weights)).toBe(0)
  })

  it('finds the true minimum for an odd cycle (triangle) — cheapest edge must collide', () => {
    const weights = new Map([['A|B', 1], ['B|C', 2], ['A|C', 3]])
    // Any 2-colouring of a triangle leaves exactly one edge "inside" a side; minimise its weight.
    expect(bruteForceMinCollisions(['A', 'B', 'C'], weights)).toBe(1)
  })
})
