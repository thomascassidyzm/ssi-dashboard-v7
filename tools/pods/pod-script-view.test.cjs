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

// ---------------------------------------------------------------------------
// PLAYBACK REFS (2026-08-24). Tom: "I need the clips right there, that the DB
// is expecting the app to play." What he taps must be byte-identical to what a
// learner hears, which means the ref must be the ref the learner app builds:
// revised clips carry `.vN`, unrevised ones stay bare. See the header of
// pod-script-view.cjs and ssi-learning-app/api/_utils/audioAccess.ts.
// ---------------------------------------------------------------------------

const { buildAudioRef, AUDIO_BASE } = require('./pod-script-view.cjs')

const U1 = '11111111-1111-4111-8111-111111111111'
const U2 = '22222222-2222-4222-8222-222222222222'
const U3 = '33333333-3333-4333-8333-333333333333'
const U4 = '44444444-4444-4444-8444-444444444444'

describe('audio refs', () => {
  it('stamps a revised clip with .vN and leaves revision 1 and unknown bare', () => {
    expect(buildAudioRef(U1, 3)).toBe(`${U1}.v3`)
    expect(buildAudioRef(U1, 1)).toBe(U1)
    expect(buildAudioRef(U1, null)).toBe(U1)
    expect(buildAudioRef(U1, undefined)).toBe(U1)
    expect(buildAudioRef(U1, 0)).toBe(U1)
  })

  it('addresses every slot through the learner proxy, never S3', () => {
    const rows = [{
      ...line(2, 1, 'Anna'),
      target_audio_id: U1,
      known_audio_id: U2,
      explainer_audio_id: U3,
      sentence_audio_ids: [U1, U4],
      sentence_known_audio_ids: [],
    }, line(2, 2, 'Guest')]
    const clips = {
      [U1]: { text: 'ciao', voice_id: 'ara', audio_revision: 3 },
      [U2]: { text: 'hello', voice_id: 'eng', audio_revision: 1 },
      [U3]: { text: 'explain', voice_id: 'eng' },
      // U4 deliberately absent from course_audio — a dangling split reference
    }
    const v = buildPodScript({ pod: { ...pod, speakers: cast({ Anna: [ARA, 'f'], Guest: [LEO, 'm'] }) }, rows, clips })
    const l = v.scenes[0].lines[0]

    expect(l.audio.target.url).toBe(`${AUDIO_BASE}/${U1}.v3`)
    expect(AUDIO_BASE).toMatch(/^https:\/\/saysomethingin\.app\/api\/audio$/)
    expect(l.audio.known.url).toBe(`${AUDIO_BASE}/${U2}`)
    expect(l.audio.explainer.url).toBe(`${AUDIO_BASE}/${U3}`)

    // splits keep the row's own order, and each is individually addressable
    expect(l.audio.target_splits.map(c => c.ref)).toEqual([`${U1}.v3`, U4])
    expect(l.audio.target_splits[1].found).toBe(false) // dangling, shown as such
    expect(l.audio.known_splits).toEqual([])

    // a row with no audio columns at all says so rather than faking clips
    const bare = v.scenes[0].lines[1]
    expect(bare.audio.target).toBe(null)
    expect(bare.audio.target_splits).toEqual([])
    expect(bare.audio.has_split_arrays).toBe(false)

    expect(v.summary.audio).toMatchObject({ with_target: 1, without_target: 1, with_splits: 1, dangling: 1 })
  })

  it('reports found as null when clips were never loaded', () => {
    const rows = [{ ...line(3, 1, 'Anna'), target_audio_id: U1 }, line(3, 2, 'Guest')]
    const v = buildPodScript({ pod: { ...pod, speakers: cast({ Anna: [ARA, 'f'], Guest: [LEO, 'm'] }) }, rows })
    expect(v.scenes[0].lines[0].audio.target.found).toBe(null)
    expect(v.scenes[0].lines[0].audio.loaded).toBe(false)
    expect(v.summary.audio).toBe(null)
  })
})

// ---------------------------------------------------------------------------
// FLAGGING, as Tom corrected it on 2026-08-24. He read flags on ita scenes 13
// (Directions) and 14 (Taxi) — proper two-person dialogues that alternate, each
// containing ONE adjacent pair of lines by the same character — and said "This
// is completely fine - not a problem". Scene 17, ten Learner lines all on Ara,
// he called a genuine problem. These two tests hold that line: a scene that
// alternates is never flagged for one repeated turn; a single-voice scene is.
// ---------------------------------------------------------------------------

describe("Tom's flagging correction (ita scenes 13/14 vs 17)", () => {
  const twoHander = cast({ Tourist: [ARA, 'f'], Local: [LEO, 'm'], Learner: [ARA, 'f'], Narrator: [LEO, 'm'] })

  it('does NOT flag an alternating scene that has one repeated turn (scene 13/14 shape)', () => {
    const rows = [
      line(13, 1, 'Tourist'), line(13, 2, 'Local'), line(13, 3, 'Tourist'),
      line(13, 4, 'Local'), line(13, 5, 'Local'), // the repeated turn Tom called fine
      line(13, 6, 'Tourist'), line(13, 7, 'Local'), line(13, 8, 'Tourist'),
      line(13, 9, 'Local'), line(13, 10, 'Tourist'), line(13, 11, 'Narrator'),
    ]
    const v = buildPodScript({ pod: { ...pod, speakers: twoHander }, rows })
    expect(v.violations).toEqual([])
    expect(v.scenes[0].lines.every(l => l.worst === null)).toBe(true)
  })

  it('DOES flag a scene whose every spoken line is one voice (scene 17 shape)', () => {
    const rows = [
      ...Array.from({ length: 10 }, (_, i) => line(17, i + 1, 'Learner')),
      line(17, 11, 'Narrator'),
    ]
    const v = buildPodScript({ pod: { ...pod, speakers: twoHander }, rows })
    expect(v.violations.some(x => x.type === 'single-voice-scene')).toBe(true)
  })
})
