/**
 * Unit tests for the pod script viewer's view model (2026-08-24).
 *
 * The acceptance case is Tom's own sentence about ita_for_eng pod-1:
 * "Scence 18 is the female voice ALL THE WAY THROUGH - apart from the
 * Narrator??? what the hell is all that about?"
 *
 * The shape of that scene, reproduced below from the live pod, is why this file
 * exists: ten consecutive `Learner` lines on the female voice, then one
 * `Narrator` line on the male voice. `checkPodCast` PASSES it — two voices,
 * zero same-voice exchange pairs — because the gate's exchange graph skips
 * adjacent lines by the same character. So the first test here asserts the gate
 * passes (that is not a bug, it is the gate's rule) and the second asserts the
 * VIEWER flags it anyway. Remove the run/scene walk from pod-script-view.cjs and
 * the second test goes red while the first stays green.
 */

import { describe, it, expect } from 'vitest'

const { checkPodCast } = require('./pod-cast-gate.cjs')
const { buildPodScript } = require('./pod-script-view.cjs')

const ARA = { voice_id: 'ara', name: 'Ara', provider: 'xai', locale: 'it' }       // catalogued f
const ENZO = { voice_id: 'x7avnu1k', name: 'Enzo', provider: 'xai', locale: 'it' } // NOT catalogued
const LEO = { voice_id: 'leo', name: 'Leo', provider: 'xai', locale: 'it' }        // catalogued m
const EVE = { voice_id: 'eve', name: 'Eve', provider: 'xai', locale: 'it' }        // catalogued f

const cast = (map) => Object.fromEntries(
  Object.entries(map).map(([k, [voice, gender]]) => [k, { target: voice, known: voice, gender }])
)

const line = (scene, n, speaker, target = `t${scene}.${n}`, known = `k${scene}.${n}`) =>
  ({ id: `${scene}-${n}`, scene_number: scene, sentence_number: n, global_order: scene * 100 + n, speaker, target_text: target, known_text: known })

/** ita_for_eng pod-1 scene 18, as it actually is on 2026-08-24. */
const scene18 = [
  ...Array.from({ length: 10 }, (_, i) => line(18, i + 1, 'Learner')),
  line(18, 11, 'Narrator'),
]
const italian = cast({ Learner: [ARA, 'f'], Narrator: [ENZO, 'm'], Anna: [ARA, 'f'], Guest: [ENZO, 'm'] })
const pod = { id: 'ita_for_eng:pod-1', course_code: 'ita_for_eng', slug: 'pod-1', title: 'Italian Pod 1', speakers: italian }

describe('the gate is blind to scene 18, and that is its rule not a bug', () => {
  it('passes the cast gate: two voices, no same-voice exchange pair', () => {
    const g = checkPodCast({ rows: scene18, speakers: italian, track: 'target' })
    expect(g.voicesInUse).toEqual(['ara', 'x7avnu1k'])
    expect(g.sameVoicePairs).toEqual([])
    expect(g.ok).toBe(true)
  })
})

describe('the viewer flags what Tom heard', () => {
  const view = buildPodScript({ pod, rows: scene18 })

  it('flags scene 18 as a single-voice scene, naming the Narrator exception', () => {
    const v = view.violations.find(x => x.type === 'single-voice-scene')
    expect(v).toBeTruthy()
    expect(v.scene).toBe(18)
    expect(v.message).toMatch(/10 spoken lines/)
    expect(v.message).toMatch(/Ara/)
    expect(v.message).toMatch(/female voice/)
    expect(v.message).toMatch(/apart from the Narrator/)
  })

  it('flags the ten-line run on one voice', () => {
    const v = view.violations.find(x => x.type === 'same-voice-run')
    expect(v).toBeTruthy()
    expect(v.message).toMatch(/^10 consecutive lines on one voice/)
  })

  it('marks the ten Learner lines and leaves the Narrator line clean', () => {
    const s = view.scenes.find(x => x.scene_number === 18)
    expect(s.lines).toHaveLength(11)
    const learner = s.lines.filter(l => l.speaker === 'Learner')
    expect(learner).toHaveLength(10)
    expect(learner.every(l => l.flags.some(f => f.type === 'single-voice-scene'))).toBe(true)
    expect(s.lines[10].speaker).toBe('Narrator')
    expect(s.lines[10].is_narrator).toBe(true)
    expect(s.lines[10].flags).toEqual([])
  })

  it('does not let the viewer finding change the gate verdict', () => {
    expect(view.summary.gate_ok).toBe(true)
    expect(view.summary.fails).toBe(0)
    expect(view.summary.warns).toBeGreaterThan(0)
  })
})

describe('a clean two-hander stays clean', () => {
  const rows = [
    line(1, 1, 'Anna'), line(1, 2, 'Guest'), line(1, 3, 'Anna'), line(1, 4, 'Guest'),
    line(1, 5, 'Anna'), line(1, 6, 'Guest'),
  ]
  const good = cast({ Anna: [ARA, 'f'], Guest: [LEO, 'm'] })
  const view = buildPodScript({ pod: { ...pod, speakers: good }, rows })

  it('reports no violations at all', () => {
    expect(view.violations).toEqual([])
    expect(view.summary.gate_ok).toBe(true)
  })

  it('names both voices with a catalogue gender', () => {
    expect(view.summary.cast.map(c => [c.name, c.gender, c.genderSource]).sort())
      .toEqual([['Ara', 'f', 'catalogue'], ['Leo', 'm', 'catalogue']])
  })

  it('does not flag a run of two', () => {
    const two = [line(2, 1, 'Anna'), line(2, 2, 'Anna'), line(2, 3, 'Guest'), line(2, 4, 'Guest')]
    const v = buildPodScript({ pod: { ...pod, speakers: good }, rows: two })
    expect(v.violations.filter(x => x.type === 'same-voice-run')).toEqual([])
  })
})

describe('the male-female rule', () => {
  it('fails an exchange between two female voices', () => {
    const rows = [line(3, 1, 'Anna'), line(3, 2, 'Sarah'), line(3, 3, 'Anna')]
    const twoWomen = cast({ Anna: [ARA, 'f'], Sarah: [EVE, 'f'] })
    const v = buildPodScript({ pod: { ...pod, speakers: twoWomen }, rows })
    const f = v.violations.find(x => x.type === 'same-gender-exchange')
    expect(f).toBeTruthy()
    expect(f.severity).toBe('fail')
    expect(f.message).toMatch(/not male-female/)
  })

  it('says "cannot check", never "passes", when a voice has no known gender', () => {
    const rows = [line(4, 1, 'Anna'), line(4, 2, 'Guest'), line(4, 3, 'Anna')]
    const unknown = cast({ Anna: [ARA, 'f'], Guest: [{ voice_id: 'not-in-any-catalogue', name: 'Nobody' }, null] })
    const v = buildPodScript({ pod: { ...pod, speakers: unknown }, rows })
    const u = v.violations.find(x => x.type === 'gender-uncheckable')
    expect(u).toBeTruthy()
    expect(u.message).toMatch(/cannot check male-female/)
    expect(v.summary.unknown_gender_voices).toContain('not-in-any-catalogue')
    // and it must NOT have been silently counted as a good male-female exchange
    expect(v.violations.filter(x => x.type === 'same-gender-exchange')).toEqual([])
  })

  it('prefers the catalogue to the cast map, and says which it used', () => {
    const rows = [line(5, 1, 'Anna'), line(5, 2, 'Olivia')]
    // OLIVIA is the real live case: `bedd6226` is the voice ita_for_eng's cast
    // map puts on the KNOWN track, and it is in neither shipped catalogue, so
    // its gender can only come from the cast map's character gender — which is
    // weaker evidence and must say so. Ara is catalogued and wins outright.
    const mixed = cast({ Anna: [ARA, 'f'], Olivia: [{ voice_id: 'bedd6226', name: 'Olivia' }, 'f'] })
    const v = buildPodScript({ pod: { ...pod, speakers: mixed }, rows })
    const olivia = v.summary.cast.find(c => c.voice_id === 'bedd6226')
    expect(olivia.gender).toBe('f')
    expect(olivia.genderSource).toBe('cast-map')
    const ara = v.summary.cast.find(c => c.voice_id === 'ara')
    expect(ara.genderSource).toBe('catalogue')
  })
})

describe('cast size', () => {
  it('fails a three-voice cast', () => {
    const rows = [line(6, 1, 'Anna'), line(6, 2, 'Guest'), line(6, 3, 'Sarah'), line(6, 4, 'Guest')]
    const three = cast({ Anna: [ARA, 'f'], Guest: [LEO, 'm'], Sarah: [EVE, 'f'] })
    const v = buildPodScript({ pod: { ...pod, speakers: three }, rows })
    const c = v.violations.find(x => x.type === 'cast-size')
    expect(c).toBeTruthy()
    expect(c.message).toMatch(/3 target voice\(s\), not 2/)
  })
})
