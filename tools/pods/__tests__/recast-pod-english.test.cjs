/**
 * planPod() is the whole decision surface of the shared-English-cast recast, and
 * it is pure — the DB round-trip lives outside it. These tests pin the three
 * things that, if they broke, would be expensive and quiet: discarding a human
 * cast, reverting a documented gender ruling, and touching the non-English track.
 */
import { describe, it, expect } from 'vitest'
const { planPod, OLIVIA, TOM } = require('../recast-pod-english.cjs')

const OLD = { name: 'Leo', locale: 'en', provider: 'xai', voice_id: 'leo' }
const ES = { name: 'Elvira', locale: 'es-ES', provider: 'azure', voice_id: 'es-ES-ElviraNeural' }

const forEng = (speakers) => ({
  id: 'spa_for_eng:pod-0', course_code: 'spa_for_eng',
  known_lang: 'eng', target_lang: 'spa', speakers,
})
const engFor = (speakers) => ({
  id: 'eng_for_spa:pod-0', course_code: 'eng_for_spa',
  known_lang: 'spa', target_lang: 'eng', speakers,
})
const itemFor = (plan, ch) => plan.items.find((i) => i.character === ch)

describe('which track is English', () => {
  it('recasts the KNOWN track on X_for_eng and leaves target alone', () => {
    const plan = planPod(forEng({ Sarah: { gender: 'f', known: OLD, target: ES } }))
    expect(plan.track).toBe('known')
    expect(plan.after.Sarah.known).toEqual(OLIVIA)
    expect(plan.after.Sarah.target).toEqual(ES)
  })

  it('recasts the TARGET track on eng_for_X and leaves known alone', () => {
    const plan = planPod(engFor({ Sarah: { gender: 'f', target: OLD, known: ES } }))
    expect(plan.track).toBe('target')
    expect(plan.after.Sarah.target).toEqual(OLIVIA)
    expect(plan.after.Sarah.known).toEqual(ES)
  })

  it('is decided by the course languages, never by the course code', () => {
    // A course code ending _for_eng whose known_lang is NOT eng must not be
    // treated as an English-known course.
    const odd = { ...forEng({ Sarah: { gender: 'f', known: OLD } }), known_lang: 'cym' }
    expect(planPod(odd)).toBeNull()
  })
})

describe('gender resolves the voice the way pod-sync does', () => {
  it("'f' takes Olivia; 'm' and 'n' both take Tom", () => {
    const plan = planPod(forEng({
      Sarah: { gender: 'f', known: OLD },
      James: { gender: 'm', known: OLD },
      Narrator: { gender: 'n', known: OLD },
    }))
    expect(plan.after.Sarah.known).toEqual(OLIVIA)
    expect(plan.after.James.known).toEqual(TOM)
    expect(plan.after.Narrator.known).toEqual(TOM)
  })

  it('casts a character that had no English voice at all', () => {
    const plan = planPod(forEng({ Sarah: { gender: 'f', target: ES } }))
    expect(itemFor(plan, 'Sarah').verdict).toBe('cast-from-nothing')
    expect(plan.after.Sarah.known).toEqual(OLIVIA)
  })

  it('reports an already-correct voice and rewrites nothing', () => {
    const plan = planPod(forEng({ Sarah: { gender: 'f', known: { ...OLIVIA } } }))
    expect(itemFor(plan, 'Sarah').verdict).toBe('already-correct')
    expect(plan.changed).toBe(0)
  })

  it('normalises a stale NAME on the right voice_id without changing the voice', () => {
    const nova = { ...OLIVIA, name: 'Nova' }
    const plan = planPod(forEng({ Sarah: { gender: 'f', known: nova } }))
    expect(plan.after.Sarah.known).toEqual(OLIVIA)
  })
})

describe('human recordings are never overwritten', () => {
  const human = { name: 'Catrin', provider: 'human', voice_id: 'human_catrinlliar_cym_n' }

  it('skips the character and says so', () => {
    const pod = { id: 'cym_n_for_eng:pod-0', course_code: 'cym_n_for_eng',
      known_lang: 'eng', target_lang: 'cym', speakers: { Anna: { gender: 'f', known: human } } }
    const plan = planPod(pod)
    expect(itemFor(plan, 'Anna').verdict).toBe('human-exempt')
    expect(plan.after.Anna.known).toEqual(human)
    expect(plan.changed).toBe(0)
  })
})

describe('gender is read, not rewritten', () => {
  it('leaves a documented Learner=m alone even with the flip rule on', () => {
    const plan = planPod(forEng({ Learner: { gender: 'm', known: OLD } }))
    expect(plan.after.Learner.gender).toBe('m')
    expect(plan.after.Learner.known).toEqual(TOM)
  })

  it("flips Learner 'n' → 'f' when the target text carries no male evidence", () => {
    const plan = planPod(forEng({ Learner: { gender: 'n', known: OLD } }),
      { learnerMaleEvidence: false })
    expect(plan.after.Learner.gender).toBe('f')
    expect(plan.after.Learner.known).toEqual(OLIVIA)
  })

  it("holds the flip back when the target text IS male-scripted", () => {
    const plan = planPod(forEng({ Learner: { gender: 'n', known: OLD } }),
      { learnerMaleEvidence: true })
    expect(plan.after.Learner.gender).toBe('n')
    expect(plan.after.Learner.known).toEqual(TOM)
    expect(plan.items.some((i) => i.verdict === 'learner-flip-held-back')).toBe(true)
  })

  it('does not flip any character other than the Learner', () => {
    const plan = planPod(forEng({ Narrator: { gender: 'n', known: OLD } }),
      { learnerMaleEvidence: false })
    expect(plan.after.Narrator.gender).toBe('n')
  })

  it('fills an absent gender from the estate value and flags it', () => {
    const plan = planPod(forEng({ Barista: { known: OLD } }))
    expect(itemFor(plan, 'Barista').gender_filled).toBe('f')
    expect(plan.after.Barista.gender).toBe('f')
  })

  it('resolves a parenthesised label to its canonical role for the fill', () => {
    const plan = planPod(forEng({ 'Barista (3 pm)': { known: OLD } }))
    expect(itemFor(plan, 'Barista (3 pm)').gender_filled).toBe('f')
  })
})

describe('everything else on the entry survives', () => {
  it('preserves variants and any unknown keys byte-for-byte', () => {
    const plan = planPod(forEng({
      Sarah: { gender: 'f', variants: ['Sarah', 'Sarah (F)'], notes: 'keep me', known: OLD, target: ES },
    }))
    expect(plan.after.Sarah.variants).toEqual(['Sarah', 'Sarah (F)'])
    expect(plan.after.Sarah.notes).toBe('keep me')
    expect(plan.after.Sarah.target).toEqual(ES)
  })

  it('never invents or drops a character', () => {
    const before = { Sarah: { gender: 'f', known: OLD }, _default: { gender: 'n', known: OLD } }
    const plan = planPod(forEng(before))
    expect(Object.keys(plan.after).sort()).toEqual(Object.keys(before).sort())
  })
})
