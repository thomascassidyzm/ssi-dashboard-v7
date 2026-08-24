/**
 * Unit tests: PEOPLE-FIRST casting (Tom's design 2026-06-11) + the
 * auto-provisioning decision. Pure logic in services/voice-engine/pods-cast.cjs.
 * Run: npx vitest run services/voice-engine
 */

import { describe, it, expect } from 'vitest'

const {
  EXPLAINER_SPEAKER,
  mergePodCast,
  normalizePeople,
  nameSlug,
  mintPeopleVoiceIds,
  proposePeopleCast,
  provisionPlanFor,
} = require('../pods-cast.cjs')

// ── Fixture builders (same dialogue shape as pods-cast-solver.test.cjs) ─────

let ORDER = 0
function row(podId, scene, speaker, extra = {}) {
  ORDER += 1
  return {
    id: `${podId}:SC${String(scene).padStart(2, '0')}-S${String(ORDER).padStart(3, '0')}`,
    pod_id: podId,
    scene_number: scene,
    global_order: ORDER,
    speaker,
    target_text: `target line ${ORDER}`,
    known_text: `known line ${ORDER}`,
    explainer_text: '',
    glue_to_next: false,
    ...extra,
  }
}

// Two-pod course: pod-1 scene 1 is a THREE-hander (Anna+Friend+Waiter), so the
// dialogues need at least 3 actors; 4 characters total (Neighbour doubles).
function twoPodSentences() {
  ORDER = 0
  return [
    row('c:pod-0', 1, 'Anna (F)'),
    row('c:pod-0', 1, 'Waiter (M)'),
    row('c:pod-0', 1, 'Anna (F)'),
    row('c:pod-0', 1, 'Waiter (M)'),
    row('c:pod-0', 2, 'Neighbour (8 am)'),
    row('c:pod-0', 2, 'Anna (F)'),
    row('c:pod-0', 2, 'Neighbour (10:30 pm)'),
    row('c:pod-1', 1, 'Anna (F)'),
    row('c:pod-1', 1, 'Friend (F)'),
    row('c:pod-1', 1, 'Waiter (M)'),
    row('c:pod-1', 1, 'Anna (F)'),
    row('c:pod-1', 1, 'Friend (F)'),
  ]
}

const COURSE = 'cym_n_for_eng'

function people3() {
  return [
    { name: 'Catrin', gender: 'f', email: 'catrin@example.com' },
    { name: 'Aran', gender: 'm', email: 'aran@example.com' },
    { name: 'Sioned', gender: 'f', email: 'sioned@example.com' },
  ]
}

// ── normalizePeople ──────────────────────────────────────────────────────────

describe('normalizePeople', () => {
  it('requires a non-empty list and a name or email per person', () => {
    expect(() => normalizePeople([])).toThrow(/non-empty/)
    expect(() => normalizePeople(null)).toThrow(/non-empty/)
    expect(() => normalizePeople([{ gender: 'f' }])).toThrow(/person 1/)
  })

  it('gender is SOFT: only f/m survive, everything else is no-preference', () => {
    const out = normalizePeople([
      { name: 'A', gender: 'F' }, { name: 'B', gender: 'male' },
      { name: 'C', gender: 'm' }, { name: 'D' },
    ])
    expect(out.map(p => p.gender)).toEqual(['f', null, 'm', null])
  })

  it('email-only rows get a display name from the localpart', () => {
    const [p] = normalizePeople([{ email: 'Maria.Lopez@Example.com' }])
    expect(p.email).toBe('maria.lopez@example.com')
    expect(p.name).toBe('maria.lopez')
  })
})

// ── voice-id minting (voice-slots convention) ────────────────────────────────

describe('mintPeopleVoiceIds', () => {
  it('mints human_{localpart}_{targetLang} from email, name-slug without', () => {
    const people = normalizePeople([
      { name: 'Catrin', email: 'catrin.haf@example.com' },
      { name: 'Siân Wyn' },
    ])
    const out = mintPeopleVoiceIds({ people, courseCode: COURSE })
    expect(out[0].voiceId).toBe('human_catrin_haf_cym_n')
    expect(out[1].voiceId).toBe(`human_${nameSlug('Siân Wyn')}_cym_n`)
  })

  it('collision-suffixes within the pool (two Marias)', () => {
    const people = normalizePeople([{ name: 'Maria' }, { name: 'Maria' }])
    const out = mintPeopleVoiceIds({ people, courseCode: COURSE })
    expect(out[0].voiceId).toBe('human_maria_cym_n')
    expect(out[1].voiceId).toBe('human_maria_cym_n_2')
  })

  it('keeps a saved voiceId stable for the same email across re-solves', () => {
    const existingCast = {
      Anna: { voiceId: 'human_catrin_cym_n', name: 'Catrin', email: 'catrin@example.com' },
    }
    const people = normalizePeople([{ name: 'Catrin H', email: 'catrin@example.com' }])
    const out = mintPeopleVoiceIds({ people, courseCode: COURSE, existingCast })
    expect(out[0].voiceId).toBe('human_catrin_cym_n')
  })

  it("never re-mints another email's saved id onto a new person", () => {
    const existingCast = {
      Anna: { voiceId: 'human_maria_cym_n', name: 'Maria A', email: 'maria@a.com' },
    }
    const people = normalizePeople([{ name: 'Maria', email: 'maria@b.com' }])
    const out = mintPeopleVoiceIds({ people, courseCode: COURSE, existingCast })
    expect(out[0].voiceId).toBe('human_maria_cym_n_2')
  })
})

// ── proposePeopleCast ────────────────────────────────────────────────────────

describe('proposePeopleCast — 3 people, feasible (doubling allowed)', () => {
  const proposal = proposePeopleCast({
    people: people3(),
    sentences: twoPodSentences(),
    courseCode: COURSE,
    genderBySpeaker: { Anna: 'f', Friend: 'f', Waiter: 'm', Neighbour: 'n' },
    explainerWorkload: { knownLines: 12, estimatedSeconds: 120 },
  })

  it('covers every character with exactly the declared people', () => {
    const speakers = Object.keys(proposal.podCast).filter(s => s !== EXPLAINER_SPEAKER)
    expect(speakers.sort()).toEqual(['Anna', 'Friend', 'Neighbour', 'Waiter'])
    const allowed = new Set(proposal.people.map(p => p.voiceId))
    for (const s of speakers) expect(allowed.has(proposal.podCast[s].voiceId)).toBe(true)
  })

  it('no forced same-scene reuse: feasible with 3 (minimumActors = 3)', () => {
    expect(proposal.feasibility.minimumActors).toBe(3)
    expect(proposal.feasibility.collisions.count).toBe(0)
    expect(proposal.warnings.filter(w => w.type === 'need-more-people')).toEqual([])
  })

  it('doubling is allowed: 4 characters across 3 people, no warning for it', () => {
    const totalCharacters = proposal.assignments.reduce((n, a) => n + a.characters.length, 0)
    expect(totalCharacters).toBe(4)
    expect(proposal.assignments.some(a => a.characters.length >= 2)).toBe(true)
  })

  it('per-person allocation carries line counts and estimated minutes', () => {
    for (const a of proposal.assignments) {
      expect(a.lineCount).toBeGreaterThanOrEqual(0)
      expect(a.estimatedMinutes).toBeGreaterThanOrEqual(0)
      if (a.characters.length) expect(a.estimatedMinutes).toBeGreaterThan(0)
    }
    const totalLines = proposal.assignments.reduce((n, a) => n + a.lineCount, 0)
    expect(totalLines).toBe(12) // every dialogue line is someone's
  })

  it('suggests the lightest-loaded person as bilingual guide (doubling allowed, noted gently)', () => {
    const guide = proposal.assignments.find(a => a.isGuide)
    expect(guide).toBeTruthy()
    expect(guide.guideSuggested).toBe(true) // no row was marked
    expect(proposal.explainer.suggested).toBe(true)
    expect(proposal.podCast[EXPLAINER_SPEAKER].voiceId).toBe(guide.voiceId)
    // Guide minutes include the known-language workload (120s = 2 min)
    expect(proposal.explainer.estimatedMinutes).toBe(2)
    // 3 people / 4 characters: the guide also plays dialogue → gentle note
    if (guide.characters.length) {
      expect(proposal.warnings.some(w => w.type === 'guide-doubles')).toBe(true)
    }
  })

  it('podCast entries are PUT-ready: voiceId + name + email + soft gender', () => {
    for (const entry of Object.values(proposal.podCast)) {
      expect(entry.voiceId).toMatch(/^human_/)
      expect(entry.name).toBeTruthy()
      expect(entry.email).toMatch(/@example\.com$/)
    }
  })
})

describe('proposePeopleCast — 2 people, infeasible', () => {
  const proposal = proposePeopleCast({
    people: people3().slice(0, 2),
    sentences: twoPodSentences(),
    courseCode: COURSE,
  })

  it('reports the collisions instead of failing', () => {
    expect(proposal.feasibility.minimumActors).toBe(3)
    expect(proposal.feasibility.collisions.count).toBeGreaterThan(0)
    expect(proposal.feasibility.collisions.details.length).toBe(proposal.feasibility.collisions.count)
  })

  it('says plainly "you need one more person" with the talk-to-themselves explanation', () => {
    const warning = proposal.warnings.find(w => w.type === 'need-more-people')
    expect(warning).toBeTruthy()
    expect(warning.message).toContain('1 more person')
    expect(warning.message).toContain('talk to themselves')
    expect(warning.message).toContain('at least 3')
  })

  it('still returns a complete (best-effort) cast for review', () => {
    const speakers = Object.keys(proposal.podCast).filter(s => s !== EXPLAINER_SPEAKER)
    expect(speakers.length).toBe(4)
  })
})

describe('proposePeopleCast — gender is soft', () => {
  it('a mismatch is reported gently, never blocking', () => {
    ORDER = 0
    // Three female characters in one scene; people are f, f, m → one mismatch.
    const sentences = [
      row('p', 1, 'A (F)'), row('p', 1, 'B (F)'), row('p', 1, 'C (F)'),
      row('p', 1, 'A (F)'), row('p', 1, 'B (F)'), row('p', 1, 'C (F)'),
    ]
    const proposal = proposePeopleCast({
      people: [
        { name: 'Eira', gender: 'f' }, { name: 'Mari', gender: 'f' }, { name: 'Huw', gender: 'm' },
      ],
      sentences,
      courseCode: COURSE,
    })
    // All three characters cast distinctly (distinctness beats gender)…
    const ids = ['A', 'B', 'C'].map(s => proposal.podCast[s].voiceId)
    expect(new Set(ids).size).toBe(3)
    expect(proposal.feasibility.collisions.count).toBe(0)
    // …and the mismatch is one gentle warning naming the person.
    const mismatches = proposal.warnings.filter(w => w.type === 'gender-mismatch')
    expect(mismatches.length).toBe(1)
    expect(mismatches[0].message).toContain('Huw')
    expect(mismatches[0].message).toContain('fine')
  })

  it('people with no declared gender raise no mismatch noise', () => {
    const proposal = proposePeopleCast({
      people: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
      sentences: twoPodSentences(),
      courseCode: COURSE,
      genderBySpeaker: { Anna: 'f', Friend: 'f', Waiter: 'm' },
    })
    expect(proposal.warnings.filter(w => w.type === 'gender-mismatch')).toEqual([])
  })
})

describe('proposePeopleCast — marked bilingual guide', () => {
  it('honours the marked row over the lightest-loaded default', () => {
    const people = people3()
    people[0].guide = true // Catrin carries pod dialogue too — doubling allowed
    const proposal = proposePeopleCast({
      people,
      sentences: twoPodSentences(),
      courseCode: COURSE,
      explainerWorkload: { knownLines: 12, estimatedSeconds: 60 },
    })
    const guide = proposal.assignments.find(a => a.isGuide)
    expect(guide.name).toBe('Catrin')
    expect(guide.guideSuggested).toBe(false)
    expect(proposal.explainer.suggested).toBe(false)
    expect(proposal.podCast[EXPLAINER_SPEAKER].email).toBe('catrin@example.com')
  })
})

// ── mergePodCast carries the soft gender preference ──────────────────────────

describe('mergePodCast — gender rides through for panel prefill', () => {
  it('stores gender when present, preserves it when absent', () => {
    const one = mergePodCast(null, {
      Anna: { voiceId: 'human_catrin_cym_n', name: 'Catrin', gender: 'f' },
    })
    expect(one.podCast.Anna.gender).toBe('f')
    const two = mergePodCast(one, { Anna: { voiceId: 'human_catrin_cym_n_2' } })
    expect(two.podCast.Anna.gender).toBe('f')
    expect(two.podCast.Anna.voiceId).toBe('human_catrin_cym_n_2')
  })
})

// ── provisionPlanFor — the never-downgrade decision ──────────────────────────

describe('provisionPlanFor', () => {
  const COURSE_B = 'mkd_for_fra'

  it('no row → create (router mirrors the redeem row shape)', () => {
    expect(provisionPlanFor(null, COURSE_B)).toEqual({ action: 'create' })
  })

  it('existing recorder on other courses → add-course (append, preserve order)', () => {
    const row = { email: 'm@x.com', role: 'recorder', courses: ['cym_n_for_eng'], voice_id: 'human_m_cym_n' }
    expect(provisionPlanFor(row, COURSE_B)).toEqual({
      action: 'add-course', courses: ['cym_n_for_eng', COURSE_B],
    })
  })

  it('already holds the course → no-op (idempotent re-PUT)', () => {
    const row = { email: 'm@x.com', role: 'recorder', courses: [COURSE_B] }
    expect(provisionPlanFor(row, COURSE_B)).toEqual({
      action: 'no-op', reason: 'already-holds-course',
    })
  })

  it("admin with '*' is never touched", () => {
    const row = { email: 'tom@x.com', role: 'admin', courses: '*' }
    expect(provisionPlanFor(row, COURSE_B)).toEqual({
      action: 'no-op', reason: 'holds-all-courses',
    })
  })

  it('editor with an explicit list gains the course — role untouched (plan carries no role)', () => {
    const row = { email: 'ed@x.com', role: 'editor', courses: ['spa_for_eng'] }
    const plan = provisionPlanFor(row, COURSE_B)
    expect(plan).toEqual({ action: 'add-course', courses: ['spa_for_eng', COURSE_B] })
    expect('role' in plan).toBe(false) // never-downgrade: the plan cannot express a role change
  })

  it('unrecognised courses shapes are left alone', () => {
    expect(provisionPlanFor({ courses: 'cym_n_for_eng' }, COURSE_B).action).toBe('no-op')
    expect(provisionPlanFor({ courses: null }, COURSE_B).action).toBe('no-op')
    expect(provisionPlanFor({ courses: { odd: true } }, COURSE_B).action).toBe('no-op')
  })

  it('requires a courseCode', () => {
    expect(() => provisionPlanFor(null, '')).toThrow(/courseCode/)
  })
})
