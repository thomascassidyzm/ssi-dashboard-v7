/**
 * A LEGO row whose `components` is stored as {} (cat_for_eng S0028L01/L02) must not crash the gate.
 * Before the fix, buildKnownSideSeedCtx iterated it ("object is not iterable") and every phrase-quality
 * window of cat_for_eng after seed 28 failed at the gate (ramp 967, 13 windows).
 * Run: npx vitest run tools/phrase-gate/gate-check.components-shape.test.cjs
 */
import { describe, it, expect } from 'vitest'
const { buildKnownSideSeedCtx, loadTranslationVocab } = require('./gate-check.cjs')

const PRIOR = [
  { target_text: 'vull', known_text: 'I want', components: [], seed_number: 1, type: 'A' },
  { target_text: 'parlar català', known_text: 'to speak Catalan', components: {}, seed_number: 28, type: 'M' },
]
const supabase = { from: () => { const c = { select: () => c, eq: () => c, lt: () => c, not: () => c, order: () => c, range: () => Promise.resolve({ data: PRIOR, error: null }), then: (ok) => ok({ data: PRIOR, error: null }) }; return c } }

describe('components stored as {}', () => {
  it('builds the known-side seed context instead of throwing', async () => {
    await expect(buildKnownSideSeedCtx(supabase, 'cat_for_eng', 41, [{ known: 'why', target: 'per què', components: {} }], { glossSynonyms: {} })).resolves.toBeTruthy()
  })
  it('loads translation vocab instead of throwing', async () => {
    await expect(loadTranslationVocab(supabase, 'cat_for_eng', 41, false)).resolves.toBeTruthy()
  })
})
