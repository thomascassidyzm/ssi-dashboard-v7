/**
 * Unit tests: TWO VOICES AS THE DEFAULT, three-to-five as an opt-in upgrade.
 *
 * Tom, voice note 2026-08-06, after looking at the Welsh pods in Popty:
 *
 *   "the whole point of doing this in this way was that we could get by with
 *    just two different voices, a male voice and a female voice […] probably do
 *    it for two voices as the default. And then if you want to try it with
 *    three or four voices because you do have additional human voice recorders,
 *    then fantastic, we can do that. But think about that. If we are making it
 *    a lot more complicated to even get the recordings done, it's going to be
 *    harder for people to do community courses, isn't it? […] we don't want to
 *    make it unnecessarily complicated by having 56 different cast members."
 *
 * This file replaces the "exactly two, no more" wall the 2026-07-17 ruling put
 * in POST /cast/propose. That wall is deliberately flipped: two is now a
 * DEFAULT, not a maximum. Recording must never get harder — a community course
 * with two recorders is the case that has to stay effortless.
 *
 * Run: npx vitest run services/voice-engine
 */

import { describe, it, expect } from 'vitest'

const {
  DEFAULT_POD_VOICES,
  MAX_POD_VOICES,
  defaultCastPeople,
  validateCastPeople,
  collapseTwoVoiceCast,
  proposePeopleCast,
} = require('../pods-cast.cjs')

// ── Fixtures ───────────────────────────────────────────────────────────────

let ORDER = 0
function row(podId, scene, speaker) {
  ORDER += 1
  return {
    id: `${podId}:SC${scene}-S${ORDER}`,
    pod_id: podId,
    scene_number: scene,
    global_order: ORDER,
    speaker,
    target_text: `target line ${ORDER}`,
    known_text: `known line ${ORDER}`,
    explainer_text: '',
    glue_to_next: false,
  }
}

/**
 * A WELSH-SHAPED script: many characters, few scenes — the exact shape that
 * made Tom see "56 different cast members". cym_n_for_eng/pod-0 really does
 * carry 22 canonical characters against 2 human voices (live DB, 2026-08-06).
 */
function welshShapedSentences() {
  ORDER = 0
  const female = ['Anna', 'Sarah', 'Barista', 'Passenger', 'Customer 1', 'Bartender',
    'Assistant', 'Receptionist', 'Learner']
  const male = ['James', 'Neighbour', 'Friend', 'Waiter', 'Narrator', 'Customer 2',
    'Customer 3', 'Guest', 'Pharmacist', 'Tourist', 'Local', 'Driver', 'Customer']
  const out = []
  // Each character gets its own two-hander scene with one of the opposite
  // gender, so nobody is forced to talk to themselves at two voices.
  const pairs = Math.max(female.length, male.length)
  for (let i = 0; i < pairs; i++) {
    const f = female[i % female.length]
    const m = male[i % male.length]
    out.push(row('pod-0', i + 1, f), row('pod-0', i + 1, m), row('pod-0', i + 1, f))
  }
  return out
}

function genderMap() {
  return {
    Anna: 'f', Sarah: 'f', Barista: 'f', Passenger: 'f', 'Customer 1': 'f',
    Bartender: 'f', Assistant: 'f', Receptionist: 'f', Learner: 'f',
    James: 'm', Neighbour: 'm', Friend: 'm', Waiter: 'm', Narrator: 'm',
    'Customer 2': 'm', 'Customer 3': 'm', Guest: 'm', Pharmacist: 'm',
    Tourist: 'm', Local: 'm', Driver: 'm', Customer: 'm',
  }
}

const ARAN = { name: 'Aran', gender: 'm', email: 'aran@hey.com' }
const CATRIN = { name: 'Catrin', gender: 'f', email: 'catrinlliar@gmail.com' }

// ── The default ────────────────────────────────────────────────────────────

describe('two voices is the default', () => {
  it('the default cast is two voices, one female and one male', () => {
    expect(DEFAULT_POD_VOICES).toBe(2)
    const people = defaultCastPeople()
    expect(people).toHaveLength(2)
    expect(people.map(p => p.gender).sort()).toEqual(['f', 'm'])
  })

  it('a course with no cast configured still yields a two-voice default', () => {
    // Nothing saved, nobody on the roster — a leader who configures nothing
    // must still land on the two-voice shape, never on an empty or N-voice one.
    const people = defaultCastPeople({ rosterVoices: [] })
    expect(people).toHaveLength(DEFAULT_POD_VOICES)
    expect(validateCastPeople(
      people.map(p => ({ ...p, name: p.gender === 'f' ? 'Catrin' : 'Aran' })),
    )).toEqual({ ok: true })
  })

  it('prefills the default rows from roster humans who already hold the course', () => {
    const people = defaultCastPeople({
      rosterVoices: [
        { name: 'Catrin', email: 'catrinlliar@gmail.com' },
        { name: 'Aran', email: 'aran@hey.com' },
      ],
    })
    expect(people[0]).toMatchObject({ name: 'Catrin', gender: 'f' })
    expect(people[1]).toMatchObject({ name: 'Aran', gender: 'm' })
  })

  it('accepts the two-voice cast', () => {
    expect(validateCastPeople([ARAN, CATRIN])).toEqual({ ok: true })
  })
})

// ── The opt-in upgrade ─────────────────────────────────────────────────────

describe('three or four voices is an opt-in upgrade, never a requirement', () => {
  it('accepts three and four voices', () => {
    const third = { name: 'Bethan', gender: 'f' }
    const fourth = { name: 'Dylan', gender: 'm' }
    expect(validateCastPeople([ARAN, CATRIN, third])).toEqual({ ok: true })
    expect(validateCastPeople([ARAN, CATRIN, third, fourth])).toEqual({ ok: true })
  })

  it('allows up to five, and says so plainly past the ceiling', () => {
    expect(MAX_POD_VOICES).toBe(5)
    const five = [ARAN, CATRIN, { name: 'C', gender: 'f' }, { name: 'D', gender: 'm' },
      { name: 'E', gender: 'f' }]
    expect(validateCastPeople(five)).toEqual({ ok: true })
    const six = [...five, { name: 'F', gender: 'm' }]
    const result = validateCastPeople(six)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/default/i)
  })

  it('the opt-in is never mandatory — a 22-character script casts fine at two voices', () => {
    // The heart of the ruling: a big character list must NEVER become a
    // requirement for more recorders. Welsh has exactly two.
    const sentences = welshShapedSentences()
    const proposal = proposePeopleCast({
      people: [CATRIN, ARAN],
      sentences,
      courseCode: 'cym_n_for_eng',
      genderBySpeaker: genderMap(),
    })
    const voices = new Set(Object.values(proposal.podCast).map(e => e.voiceId))
    expect(voices.size).toBe(2)
    // Every character is cast — nobody is left without a voice.
    expect(Object.keys(proposal.podCast).length).toBeGreaterThanOrEqual(22)
    // And it is a real solve, not a degenerate one.
    expect(proposal.assignments).toHaveLength(2)
    for (const a of proposal.assignments) expect(a.lineCount).toBeGreaterThan(0)
  })

  it('still needs one male and one female voice at any size', () => {
    // Not ceremony: with only these voices covering every character, a cast
    // missing a gender leaves characters with nobody to read them.
    const bothFemale = validateCastPeople([CATRIN, { name: 'Bethan', gender: 'f' }])
    expect(bothFemale.ok).toBe(false)
    expect(bothFemale.error).toMatch(/male voice and a female voice/i)
  })

  it('rejects a single voice, in leader language', () => {
    const one = validateCastPeople([ARAN])
    expect(one.ok).toBe(false)
    expect(one.error).toMatch(/one male, one female/i)
  })
})

// ── Welsh: many characters, two voices, takes preserved ─────────────────────

describe('a Welsh-shaped cast collapses to two voices with aliases preserved', () => {
  it('collapses many identities to one voice per gender and keeps the dropped ids as aliases', () => {
    // A legacy cast where the same two humans got split across version-suffixed
    // identities — the shape the 2026-07-17 collapse exists for. Aran's takes
    // must keep counting: he recorded every existing Welsh audio himself.
    const podCast = {
      Anna: { voiceId: 'human_catrin_cym_n', name: 'Catrin', gender: 'f' },
      Sarah: { voiceId: 'human_catrinv2_cym_n', name: 'Catrinv2' },
      Barista: { voiceId: 'human_catrinv3_cym_n', name: 'Catrinv3' },
      James: { voiceId: 'human_aran_cym_n', name: 'Aran', gender: 'm', email: 'aran@hey.com' },
      Narrator: { voiceId: 'human_aranv2_cym_n', name: 'Aranv2' },
      Waiter: { voiceId: 'human_aranv3_cym_n', name: 'Aranv3' },
    }
    const speakers = [
      { speaker: 'Anna', gender: 'f', lineCount: 10 },
      { speaker: 'Sarah', gender: 'f', lineCount: 8 },
      { speaker: 'Barista', gender: 'f', lineCount: 5 },
      { speaker: 'James', gender: 'm', lineCount: 12 },
      { speaker: 'Narrator', gender: 'm', lineCount: 9 },
      { speaker: 'Waiter', gender: 'm', lineCount: 4 },
    ]
    // Aran's existing takes sit on his original id — it must be the survivor.
    const takesByVoiceId = { human_aran_cym_n: 27, human_catrin_cym_n: 3 }

    const result = collapseTwoVoiceCast({ podCast, speakers, takesByVoiceId })

    expect(result.changed).toBe(true)
    const survivors = new Set(Object.values(result.podCast).map(e => e.voiceId))
    expect(survivors.size).toBe(2)
    expect(survivors.has('human_aran_cym_n')).toBe(true)
    expect(survivors.has('human_catrin_cym_n')).toBe(true)

    // NOTHING is stranded: every dropped id is reachable as an alias of a
    // survivor, so old record links resolve and old takes still count.
    expect(result.unresolved).toEqual([])
    const aliased = new Set(Object.values(result.aliases).flat())
    for (const dropped of result.dropped) expect(aliased.has(dropped)).toBe(true)
    expect(result.aliases.human_aran_cym_n.sort())
      .toEqual(['human_aranv2_cym_n', 'human_aranv3_cym_n'])
    expect(result.aliases.human_catrin_cym_n.sort())
      .toEqual(['human_catrinv2_cym_n', 'human_catrinv3_cym_n'])

    // Every character still has a voice — a collapse loses cast entries never.
    expect(Object.keys(result.podCast).sort()).toEqual(Object.keys(podCast).sort())
  })

  it('leaves an already-two-voice Welsh cast completely alone', () => {
    // Both live Welsh courses are already Aran + Catrin (verified 2026-08-06),
    // so loading the cast must be a no-op, not a rewrite.
    const podCast = {
      Anna: { voiceId: 'human_catrinlliar_cym_n', name: 'Catrin', gender: 'f' },
      James: { voiceId: 'human_aran_cym_n', name: 'Aran', gender: 'm' },
      __explainer__: { voiceId: 'human_aran_cym_n', name: 'Aran', gender: 'm' },
    }
    const result = collapseTwoVoiceCast({ podCast, speakers: [], takesByVoiceId: {} })
    expect(result.changed).toBe(false)
    expect(result.podCast).toBe(podCast)
    expect(result.dropped).toEqual([])
  })
})
