/**
 * v3's gate replays seed-complete's vocabulary scope: a LEGO's phrases may use EARLIER siblings
 * of its seed, never later ones (canon P2). ita_for_eng S0190L01 "ti dispiace se ti faccio" was
 * given phrases built on "domande" — S0190L02, not yet taught — and the gate passed them.
 * Run: npx vitest run tools/phrase-gate/gate-check.sibling-vocab.test.cjs
 */
import { describe, it, expect } from 'vitest'
const { loadSameSeedSiblingVocab } = require('./gate-check.cjs')

const SEED_190 = [
  { lego_index: 1, target_text: 'ti dispiace se ti faccio', type: 'M', components: [{ target: 'ti dispiace' }, { target: 'se' }, { target: 'ti faccio' }] },
  { lego_index: 2, target_text: 'domande', type: 'A', components: null },
]
const supabase = { from: () => { const c = { select: () => c, eq: () => c, then: (ok) => ok({ data: SEED_190, error: null }) }; return c } }

describe('loadSameSeedSiblingVocab', () => {
  it('gives L01 nothing from its own seed — domande (L02) is not taught yet', async () => {
    const v = await loadSameSeedSiblingVocab(supabase, 'ita_for_eng', 190, false, 1)
    expect(v.has('domande')).toBe(false)
  })
  it('gives L02 everything L01 taught', async () => {
    const v = await loadSameSeedSiblingVocab(supabase, 'ita_for_eng', 190, false, 2)
    expect(v.has('ti dispiace se ti faccio')).toBe(true) // vocab is whole chunks (P2), not words
    expect(v.has('domande')).toBe(false)
  })
})
