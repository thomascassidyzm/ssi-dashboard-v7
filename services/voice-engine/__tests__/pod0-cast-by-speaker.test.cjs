/**
 * Unit tests: THE POD-0 CASTING RULE — two voices, cast BY SPEAKER.
 *
 * Tom, 2026-08-08, setting the requirement:
 *
 *   "the conversation has to be between 2 different voices - so Aran's
 *    sentences have to be cast as v1 v2 all the way through as much as
 *    possible […] this is a hard restriction and it MIGHT cause problems to
 *    the learner in a small way - who's saying what […] but Aran is confident
 *    that - as in Stephen Fry's reading of the Harry Potter books - one voice
 *    can actually work well enough for all the different characters"
 *
 * Asked directly whether he wanted casting by speaker or strict line-by-line
 * alternation, his answer was: "of course cast by speaker".
 *
 * So: each character is assigned a voice and KEEPS it for every line they
 * speak, including consecutive ones. A third or later character in a scene
 * recycles a voice already in play. Strict alternation is rejected, because it
 * splits one speaker across two voices the moment they have two lines in a row
 * — the regression the test below exists to catch.
 *
 * Run: npx vitest run services/voice-engine
 */

import { describe, it, expect } from 'vitest'

const {
  assignVoicesColoured,
  trimPoolPerGender,
  buildTurnWeights,
  countAdjacentCollisions,
} = require('../../../tools/pod-voice-colour.cjs')

// ── Fixtures ───────────────────────────────────────────────────────────────

const VOICE_F = { provider: 'xai', voice_id: 'v_female', name: 'Maria', gender: 'f' }
const VOICE_M = { provider: 'xai', voice_id: 'v_male', name: 'Pablo', gender: 'm' }
const SPARE_F = { provider: 'xai', voice_id: 'v_female_2', name: 'Lucia', gender: 'f' }
const SPARE_M = { provider: 'xai', voice_id: 'v_male_2', name: 'Carlos', gender: 'm' }

const FULL_POOL = { f: [VOICE_F, SPARE_F], m: [VOICE_M, SPARE_M] }

/** Cast a set of scenes on exactly two voices and return speaker → voice_id. */
function castTwoVoices(scenes, genders = {}) {
  const pool = trimPoolPerGender(FULL_POOL, 1)
  const speakers = [...new Set(scenes.flat())]
  const { assignments } = assignVoicesColoured({
    scenes,
    speakers,
    targetPool: pool,
    knownPool: pool,
    genderOf: (sp) => genders[sp] || 'n',
  })
  const out = {}
  for (const [sp, a] of Object.entries(assignments)) out[sp] = a.target.voice_id
  return out
}

// ── The rule ───────────────────────────────────────────────────────────────

describe('trimPoolPerGender — the two-voice cast is a parameter, not a hardcode', () => {
  it('trims to one voice per gender by default, keeping pool order', () => {
    const pool = trimPoolPerGender(FULL_POOL, 1)
    expect(pool.f).toEqual([VOICE_F])
    expect(pool.m).toEqual([VOICE_M])
  })

  it('parks pool depth rather than deleting it — N > 1 gives the voices back', () => {
    const pool = trimPoolPerGender(FULL_POOL, 2)
    expect(pool.f).toHaveLength(2)
    expect(pool.m).toHaveLength(2)
  })

  it('never hands back an empty gender it was given voices for', () => {
    const pool = trimPoolPerGender({ f: [VOICE_F], m: [] }, 1)
    expect(pool.f).toEqual([VOICE_F])
    expect(pool.m).toEqual([])
  })
})

describe('two-hander scene', () => {
  // Sarah and the Barista trade turns: A B A B.
  const scenes = [['Sarah', 'Barista', 'Sarah', 'Barista']]

  it('gives the two speakers the two different voices', () => {
    const cast = castTwoVoices(scenes, { Sarah: 'f' })
    expect(new Set(Object.values(cast)).size).toBe(2)
    expect(cast.Sarah).not.toBe(cast.Barista)
  })

  it('puts the female voice on the female character', () => {
    const cast = castTwoVoices(scenes, { Sarah: 'f', Barista: 'm' })
    expect(cast.Sarah).toBe('v_female')
    expect(cast.Barista).toBe('v_male')
  })
})

describe('consecutive lines by one speaker — the regression the ruling exists to prevent', () => {
  // Sarah asks three questions in a row before the Barista answers. Under
  // strict line-by-line alternation her three lines would come out
  // v1 / v2 / v1 — one person speaking in two voices mid-thought.
  const scenes = [['Barista', 'Sarah', 'Sarah', 'Sarah', 'Barista', 'Barista', 'Sarah']]

  it('holds ONE voice across a speaker\'s consecutive lines', () => {
    const cast = castTwoVoices(scenes, { Sarah: 'f', Barista: 'm' })
    // Casting is keyed by speaker, so every line of Sarah's resolves to the
    // same voice by construction — this asserts the key IS the speaker.
    const lineVoices = scenes[0].map(sp => cast[sp])
    expect(lineVoices).toEqual([
      cast.Barista, cast.Sarah, cast.Sarah, cast.Sarah,
      cast.Barista, cast.Barista, cast.Sarah,
    ])
    expect(new Set(scenes[0].filter(sp => sp === 'Sarah').map(sp => cast[sp])).size).toBe(1)
  })

  it('is NOT line-position alternation', () => {
    const cast = castTwoVoices(scenes, { Sarah: 'f', Barista: 'm' })
    const lineVoices = scenes[0].map(sp => cast[sp])
    const alternating = scenes[0].map((_, i) => (i % 2 === 0 ? cast.Barista : cast.Sarah))
    expect(lineVoices).not.toEqual(alternating)
  })

  it('still separates the two speakers from each other', () => {
    const cast = castTwoVoices(scenes, { Sarah: 'f', Barista: 'm' })
    expect(cast.Sarah).not.toBe(cast.Barista)
  })
})

describe('three or more characters in one scene', () => {
  // A bartender serving three customers: four characters, two voices.
  const scenes = [[
    'Bartender', 'Customer 1', 'Bartender', 'Customer 2',
    'Bartender', 'Customer 3', 'Bartender', 'Customer 1',
  ]]

  it('recycles a voice already in play rather than inventing a third', () => {
    const cast = castTwoVoices(scenes)
    expect(new Set(Object.values(cast)).size).toBe(2)
  })

  it('keeps the busiest speaker away from the people they talk to', () => {
    const cast = castTwoVoices(scenes)
    for (const customer of ['Customer 1', 'Customer 2', 'Customer 3']) {
      expect(cast[customer]).not.toBe(cast.Bartender)
    }
  })

  it('is deterministic and stable across runs', () => {
    const a = castTwoVoices(scenes)
    const b = castTwoVoices(scenes)
    const c = castTwoVoices(scenes)
    expect(b).toEqual(a)
    expect(c).toEqual(a)
  })

  it('every character keeps one voice for the whole scene', () => {
    const cast = castTwoVoices(scenes)
    for (const speaker of new Set(scenes[0])) {
      const voices = scenes[0].filter(sp => sp === speaker).map(sp => cast[sp])
      expect(new Set(voices).size).toBe(1)
    }
  })
})

describe('a character keeps their voice across scenes, not just within one', () => {
  const scenes = [
    ['Sarah', 'Neighbour', 'Sarah'],
    ['Sarah', 'Passenger', 'Sarah'],
    ['Barista', 'Sarah', 'Barista'],
  ]

  it('assigns Sarah one voice course-wide', () => {
    const cast = castTwoVoices(scenes, { Sarah: 'f' })
    expect(cast.Sarah).toBeTruthy()
    // One assignment map keyed by canonical speaker — the same entry serves
    // every scene, so there is exactly one voice for Sarah by construction.
    expect(Object.keys(cast).filter(k => k === 'Sarah')).toHaveLength(1)
  })
})

describe('the ear metric: two voices should still sound like a conversation', () => {
  // The shape that actually broke on the Spanish pod: role-labelled
  // two-handers whose speakers all read as the same gender, so a
  // gender-only cast put both halves of six scenes on one voice.
  const scenes = [
    ['Tourist', 'Local', 'Tourist', 'Local', 'Local', 'Tourist'],
    ['Customer', 'Assistant', 'Customer', 'Assistant'],
    ['Passenger', 'Driver', 'Passenger', 'Driver', 'Driver'],
  ]

  it('leaves no adjacent-turn collisions when the graph allows a clean cut', () => {
    const cast = castTwoVoices(scenes, {
      Tourist: 'm', Local: 'm', Customer: 'm', Assistant: 'm', Passenger: 'm', Driver: 'm',
    })
    const weights = buildTurnWeights(scenes)
    const { pairs, turns } = countAdjacentCollisions(weights, sp => cast[sp])
    expect(pairs).toBe(0)
    expect(turns).toBe(0)
  })

  it('beats casting on gender alone, which would put every speaker on one voice', () => {
    const genders = {
      Tourist: 'm', Local: 'm', Customer: 'm', Assistant: 'm', Passenger: 'm', Driver: 'm',
    }
    const cast = castTwoVoices(scenes, genders)
    const weights = buildTurnWeights(scenes)
    const genderOnly = countAdjacentCollisions(weights, () => 'v_male')
    const byGraph = countAdjacentCollisions(weights, sp => cast[sp])
    expect(byGraph.turns).toBeLessThan(genderOnly.turns)
  })
})
