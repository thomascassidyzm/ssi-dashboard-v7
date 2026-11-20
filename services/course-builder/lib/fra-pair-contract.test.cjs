/**
 * fra_for_eng pair-contract constructions (WORKLIST [#3], cs #593, 2026-11-20).
 *
 * The first-pass contract had NO constructions, so the known-side gate could never license
 * English machinery in a French course: every "going to" prompt was flagged unlicensed forever,
 * and "not" had to be an introduced gloss of its own. These tests pin the second pass: each
 * construction is licensed from its French carrier's debut, not before, and never before.
 *
 * Run: npx vitest run services/course-builder/lib/fra-pair-contract
 */

import { describe, it, expect } from 'vitest'

const {
  loadPairContract, compileKnownContract, checkKnownSide, stemKnownGloss, tokenizeKnown,
} = require('./validation.cjs')

// Debut seeds of the carriers as the live course had them on 2026-11-20 (context for realism;
// the gate itself resolves these from the live order).
const CARRIER_SEED = { 'je vais': 5, 'ce que': 8, pas: 10, qui: 12, 'est-ce que': 25, lui: 136 }

// Mirror of buildKnownSideSeedCtx (routes/seed-complete.cjs) with the DB replaced by fixtures.
function ctxFor(contract, glosses) {
  const stemFirstPos = new Map()
  for (const { text, seed } of glosses) {
    for (const tok of tokenizeKnown(text)) {
      const s = stemKnownGloss(tok)
      if (s && (!stemFirstPos.has(s) || stemFirstPos.get(s) > seed)) stemFirstPos.set(s, seed)
    }
  }
  const carrierSeed = (c) => CARRIER_SEED[c] ?? Infinity
  for (const [carrier, syns] of Object.entries(contract.glossSynonyms || {})) {
    const seed = carrierSeed(carrier)
    if (seed < Infinity) for (const syn of syns) {
      const k = stemKnownGloss(syn)
      if (!stemFirstPos.has(k) || stemFirstPos.get(k) > seed) stemFirstPos.set(k, seed)
    }
  }
  const consPos = {}
  for (const con of contract.constructions || []) consPos[con.id] = carrierSeed(con.carrier)
  const unitPos = (contract.glossUnits || []).map((u) => ({ phrase: u.phrase, pos: carrierSeed(u.carrier) }))
  return { ...compileKnownContract(contract), stemFirstPos, consPos, unitPos }
}

const GLOSSES = [
  { text: 'I', seed: 1 }, { text: 'I want', seed: 1 }, { text: 'to speak', seed: 1 }, { text: 'French', seed: 1 },
  { text: 'with you', seed: 1 }, { text: 'practise', seed: 5 }, { text: "I'm", seed: 5 }, { text: 'explain', seed: 8 },
  { text: 'what', seed: 8 }, { text: 'mean', seed: 8 }, { text: 'sure', seed: 10 }, { text: 'help me', seed: 25 },
  { text: 'you', seed: 1 }, { text: 'someone', seed: 5 }, { text: 'knows', seed: 12 }, { text: 'can', seed: 2 },
  { text: 'ask her', seed: 136 },
]

const fra = loadPairContract('fra_for_eng')
const ctx = ctxFor(fra, GLOSSES)

describe('fra_for_eng contract defines the WORKLIST [#3] constructions', () => {
  it('names a carrier for going-to, negation, questions, relatives and clitics', () => {
    const ids = (fra.constructions || []).map((c) => c.id)
    for (const id of ['going-to', 'negation', 'do-support-q', 'relative-who', 'free-relative-what', 'clitic-indirect']) {
      expect(ids).toContain(id)
    }
    for (const c of fra.constructions) expect(typeof c.carrier).toBe('string')
    expect(fra.ratified).toBeNull() // ratification is a French speaker's + adversarial pass's call
  })

  it('licenses "going to" from the je vais debut — and not before', () => {
    expect(checkKnownSide("I'm going to speak French", 5, ctx)).toEqual([])
    expect(checkKnownSide("I'm going to speak French", 4, ctx).join(';')).toMatch(/going-to/)
  })

  it('licenses negation (ne…pas) from the pas carrier, without "not" needing its own gloss', () => {
    expect(checkKnownSide("I'm not sure", 10, ctx)).toEqual([])
    expect(checkKnownSide("I'm not sure", 9, ctx).join(';')).toMatch(/negation/)
  })

  it('licenses do-support questions from est-ce que', () => {
    expect(checkKnownSide('do you want to help me', 25, ctx)).toEqual([])
    expect(checkKnownSide('do you want to help me', 24, ctx).join(';')).toMatch(/do-support-q/)
  })

  it('licenses relative "who" from qui and free-relative "what I mean" from ce que', () => {
    expect(checkKnownSide('someone who knows French', 12, ctx)).toEqual([])
    expect(checkKnownSide('someone who knows French', 11, ctx).join(';')).toMatch(/relative-who/)
    expect(checkKnownSide('I want to explain what I mean', 8, ctx)).toEqual([])
    expect(checkKnownSide('I want to explain what I mean', 7, ctx).join(';')).toMatch(/free-relative-what|what i mean/)
  })

  it('licenses the indirect-object clitic (ask her → lui demander) from lui', () => {
    expect(checkKnownSide('you can ask her', 136, ctx)).toEqual([])
    expect(checkKnownSide('you can ask her', 135, ctx).join(';')).toMatch(/clitic-indirect/)
  })
})
