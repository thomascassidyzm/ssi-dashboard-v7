/**
 * Unit tests for the pod-1 speaker reattribution (2026-08-24).
 *
 * The thing these tests exist to hold still is the NUMBERING TRAP. The audit
 * numbers these lines as scenes 16/17/21; other documents in the repo number
 * the same conversation differently; and the pod was renumbered pod-0 → pod-1
 * on 2026-08-23. So the tool matches on known-side TEXT and nothing else, and
 * the first test below moves every row to a wrong scene number and asserts the
 * plan is unchanged.
 *
 * The second thing they hold still is the 4/7 split. Watson's one-line
 * commission compressed the work order as "Learner -> Staff" for all eleven.
 * The audit says 4 Staff and 7 Interlocutor, and the audit wins.
 */

import { describe, it, expect } from 'vitest'

const { planReattribution, normText, WORK_ORDER, FROM } = require('./reattribute-pod1-speakers.cjs')

/** Build a pod's worth of rows: the 11 target lines plus filler, all `Learner`. */
const podRows = (overrides = {}) => {
  const rows = WORK_ORDER.map((w, i) => ({
    id: `ita_for_eng:pod-1:R${i}`,
    scene_number: w.audit_ref < 165 ? 16 : w.audit_ref < 200 ? 17 : 21,
    sentence_number: i + 1,
    global_order: w.audit_ref,
    speaker: FROM,
    known_text: w.known_text,
    target_text: `it-${i}`,
  }))
  // filler learner lines in the same scene band, so the 15-21 count is real
  for (let i = 0; i < 62; i++) {
    rows.push({
      id: `ita_for_eng:pod-1:F${i}`,
      scene_number: 15 + (i % 7),
      sentence_number: 50 + i,
      global_order: 300 + i,
      speaker: FROM,
      known_text: `filler line ${i}`,
      target_text: `f-${i}`,
    })
  }
  return rows.map(r => ({ ...r, ...(overrides[r.id] || {}) }))
}

const plan = (rows) => planReattribution({ podId: 'ita_for_eng:pod-1', rows })

describe('the work order is the audit, not the one-line commission', () => {
  it('splits 4 Staff / 7 Interlocutor, never 11 Staff', () => {
    const p = plan(podRows())
    expect(p.ok).toBe(true)
    expect(p.updates).toHaveLength(11)
    expect(p.updates.filter(u => u.speaker_after === 'Staff')).toHaveLength(4)
    expect(p.updates.filter(u => u.speaker_after === 'Interlocutor')).toHaveLength(7)
  })

  it('sends the four payment lines to Staff and the directions/drinks lines to Interlocutor', () => {
    const p = plan(podRows())
    const by = Object.fromEntries(p.updates.map(u => [u.audit_ref, u.speaker_after]))
    expect(by[160]).toBe('Staff')
    expect(by[164]).toBe('Staff')
    expect(by[166]).toBe('Staff')
    expect(by[167]).toBe('Staff')
    expect(by[171]).toBe('Interlocutor')
    expect(by[211]).toBe('Interlocutor')
    expect(by[212]).toBe('Interlocutor')
    expect(by[214]).toBe('Interlocutor')
    expect(by[217]).toBe('Interlocutor')
    expect(by[218]).toBe('Interlocutor')
    expect(by[219]).toBe('Interlocutor')
  })

  it('leaves line 172 "It\'s not bad." alone — the audit calls it undecidable', () => {
    const rows = podRows()
    rows.push({
      id: 'ita_for_eng:pod-1:SC17-S010',
      scene_number: 17,
      sentence_number: 10,
      global_order: 172,
      speaker: FROM,
      known_text: "It's not bad.",
      target_text: 'non è male.',
    })
    const p = plan(rows)
    expect(p.ok).toBe(true)
    expect(p.updates.map(u => u.id)).not.toContain('ita_for_eng:pod-1:SC17-S010')
  })
})

describe('matching is by text, never by number', () => {
  it('plans identically when every scene and global_order is wrong', () => {
    const base = plan(podRows())
    const scrambled = podRows().map((r, i) => ({
      ...r, scene_number: 22, sentence_number: 999 - i, global_order: 90000 + i,
    }))
    const p = planReattribution({ podId: 'ita_for_eng:pod-1', rows: scrambled })
    expect(p.ok).toBe(true)
    expect(p.updates.map(u => `${u.audit_ref}:${u.speaker_after}`))
      .toEqual(base.updates.map(u => `${u.audit_ref}:${u.speaker_after}`))
  })

  it('matches through curly quotes and doubled whitespace', () => {
    const rows = podRows()
    const target = rows.find(r => r.global_order === 214)
    target.known_text = 'Yes,  I said it’s over  there.'
    const p = plan(rows)
    expect(p.ok).toBe(true)
    expect(p.updates.find(u => u.audit_ref === 214).speaker_after).toBe('Interlocutor')
  })

  it('does not fold punctuation away — a differently-punctuated line is a different line', () => {
    expect(normText('No, we only take cash.')).not.toBe(normText('No we only take cash'))
  })
})

describe('it refuses rather than guessing', () => {
  it('refuses the whole course when a line is missing', () => {
    const rows = podRows().filter(r => r.global_order !== 217)
    const p = plan(rows)
    expect(p.ok).toBe(false)
    expect(p.matched).toBe(10)
    expect(p.refusals.join(' ')).toMatch(/#217: no row matches/)
  })

  it('refuses when the same text appears twice — it will not pick one', () => {
    const rows = podRows()
    rows.push({
      id: 'ita_for_eng:pod-1:DUP',
      scene_number: 21,
      sentence_number: 99,
      global_order: 999,
      speaker: FROM,
      known_text: "It's down there on the left.",
      target_text: 'dup',
    })
    const p = plan(rows)
    expect(p.ok).toBe(false)
    expect(p.refusals.join(' ')).toMatch(/2 rows match .* refusing to guess which/)
  })

  it('refuses when the BEFORE speaker has drifted off Learner', () => {
    const rows = podRows()
    rows.find(r => r.global_order === 160).speaker = 'Barista'
    const p = plan(rows)
    expect(p.ok).toBe(false)
    expect(p.refusals.join(' ')).toMatch(/reads speaker "Barista", expected "Learner"/)
  })

  // An already-reattributed pod is a NO-OP, not a refusal. The distinction is
  // not cosmetic: on 2026-08-24 the fleet apply ran after the Italian pilot,
  // classified Italy's finished rows as "drift", and overwrote its applied log
  // with a refusal record. A re-run must be harmless in every respect.
  it('treats a re-run as a no-op, not as drift', () => {
    const rows = podRows()
    for (const w of WORK_ORDER) rows.find(r => r.global_order === w.audit_ref).speaker = w.to
    const p = plan(rows)
    expect(p.noop).toBe(true)
    expect(p.ok).toBe(false)
    expect(p.updates).toHaveLength(0)
    expect(p.refusals).toHaveLength(0)
    expect(p.alreadyDone).toHaveLength(11)
  })

  it('a half-applied pod is drift, NOT a no-op', () => {
    const rows = podRows()
    rows.find(r => r.global_order === 160).speaker = 'Staff'
    const p = plan(rows)
    expect(p.noop).toBe(false)
    expect(p.ok).toBe(false)
    expect(p.alreadyDone).toHaveLength(1)
    expect(p.updates).toHaveLength(10)
  })

  it('a genuine wrong-speaker drift is still a refusal', () => {
    const rows = podRows()
    rows.find(r => r.global_order === 171).speaker = 'Barista'
    const p = plan(rows)
    expect(p.noop).toBe(false)
    expect(p.refusals.join(' ')).toMatch(/reads speaker "Barista"/)
  })
})

describe('the count it reports is the count Tom checks', () => {
  it('reports the Learner population of scenes 15-21 before the write', () => {
    const p = plan(podRows())
    expect(p.learnerInScenes15to21).toBe(73)
  })
})
