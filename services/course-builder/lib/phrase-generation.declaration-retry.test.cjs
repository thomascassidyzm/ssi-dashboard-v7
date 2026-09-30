/**
 * A failing declaration that carries no rewrite instructions is retried on the gate's reasons, never
 * a crash: tur_for_eng S0010L04 threw "is not iterable" and ended a whole regeneration run (job #906).
 * Run: npx vitest run services/course-builder/lib/phrase-generation.declaration-retry.test.cjs
 */
import { describe, it, expect } from 'vitest'
const path = require('path')

const stub = (rel, exportsFn) => {
  const p = require.resolve(path.join(__dirname, rel))
  require.cache[p] = { id: p, filename: p, loaded: true, exports: exportsFn(require(p)) }
}
let calls = 0
stub('../../shared/claude-cli.cjs', (m) => ({ ...m, claudeChat: async () => { calls++; return '{"build":[{"known":"a","target":"b"}],"use":[]}' } }))
stub('../../../tools/phrase-lab/build-prompt.cjs', (m) => ({ ...m, buildPrompt: async () => ({ prompt: 'P', inventory: {}, lego: { lego_id: 'x:S0010L04', is_new: true, known_text: 'k', target_text: 't' }, seed: null }) }))
stub('../../../tools/phrase-gate/gate-check.cjs', (m) => ({ ...m, makeCourseCtx: () => ({}), checkPhraseSet: async () => ({ overallPass: true, failingGates: [] }), failureFeedback: () => [] }))
stub('../../../tools/frame-layer/declaration.cjs', (m) => ({ ...m, computeDeclaration: async () => ({ declares: true }), recordDeclaration: () => null,
  checkDeclaration: () => ({ checked: true, pass: false, floor_failures: ['position'] }) })) // no rewrite_instructions
stub('./separable-verbs.cjs', (m) => ({ ...m, separableSection: () => '' }))
stub('./structural-features.cjs', (m) => ({ ...m, structuralStop: () => null }))
const { generateLegoPhrases, MAX_GATE_RETRIES } = require('./phrase-generation.cjs')

describe('generateLegoPhrases', () => {
  it('returns a blocked set after its retries instead of throwing', async () => {
    const r = await generateLegoPhrases({}, 'tur_for_eng', 10, 4, { frameSection: () => '' })
    expect(r.blocked).toBe(true)
    expect(r.attempts).toHaveLength(MAX_GATE_RETRIES + 1)
    expect(calls).toBe(MAX_GATE_RETRIES + 1)
  })
})
