/**
 * generateLegoPhrases' v4 seam (job #544): an extraCheck reason is a gate failure — it is quoted into
 * the retry, and a set that never clears it comes back blocked. With no extraCheck, v3 is unchanged.
 * Run: npx vitest run services/course-builder/lib/phrase-generation.extra-check.test.cjs
 */
import { describe, it, expect } from 'vitest'
const path = require('path')

const stub = (rel, exportsFn) => {
  const p = require.resolve(path.join(__dirname, rel))
  require.cache[p] = { id: p, filename: p, loaded: true, exports: exportsFn(require(p)) }
}
const prompts = []
stub('../../shared/claude-cli.cjs', (m) => ({ ...m, claudeChat: async (p) => { prompts.push(p); return '{"build":[{"known":"a","target":"b"}],"use":[]}' } }))
stub('../../../tools/phrase-lab/build-prompt.cjs', (m) => ({ ...m, buildPrompt: async () => ({ prompt: 'P', inventory: {}, lego: { lego_id: 'x:S0010L04', is_new: true, known_text: 'k', target_text: 't' }, seed: null }) }))
stub('../../../tools/phrase-gate/gate-check.cjs', (m) => ({ ...m, makeCourseCtx: () => ({}), checkPhraseSet: async () => ({ overallPass: true, failingGates: [] }), failureFeedback: () => [] }))
stub('../../../tools/frame-layer/declaration.cjs', (m) => ({ ...m, computeDeclaration: async () => ({ declares: true }), recordDeclaration: () => null,
  checkDeclaration: () => ({ checked: true, pass: true, floor_failures: [] }), frameSection: () => '[V3 FRAMES]' }))
stub('./separable-verbs.cjs', (m) => ({ ...m, separableSection: () => '' }))
stub('./structural-features.cjs', (m) => ({ ...m, structuralStop: () => null }))
const { generateLegoPhrases, MAX_GATE_RETRIES } = require('./phrase-generation.cjs')

describe('generateLegoPhrases extraCheck / frameSectionFn', () => {
  it('v3 untouched: with no extraCheck a clean set passes and carries no extraReasons', async () => {
    const r = await generateLegoPhrases({}, 'fra_for_eng', 10, 4, {})
    expect(r.blocked).toBe(false)
    expect(r.extraReasons).toBeUndefined()
    expect(prompts.at(-1)).toContain('[V3 FRAMES]')
  })

  it('an extraCheck reason is quoted into the retry; never clearing it is blocked after the retries', async () => {
    prompts.length = 0
    const r = await generateLegoPhrases({}, 'fra_for_eng', 10, 4, { frameSectionFn: () => '[V4 FRAMES]', extraCheck: async () => ['USE "x": stapled opener'] })
    expect(r.blocked).toBe(true)
    expect(r.attempts).toHaveLength(MAX_GATE_RETRIES + 1)
    expect(prompts[0]).toContain('[V4 FRAMES]')
    expect(prompts[0]).not.toContain('[V3 FRAMES]')
    expect(prompts[1]).toContain('USE "x": stapled opener')
    expect(r.extraReasons).toEqual(['USE "x": stapled opener'])
  })

  it('a check that clears on the second attempt passes', async () => {
    let n = 0
    const r = await generateLegoPhrases({}, 'fra_for_eng', 10, 4, { extraCheck: async () => (++n === 1 ? ['fix me'] : []) })
    expect(r.blocked).toBe(false)
    expect(r.attempts).toHaveLength(2)
  })
})
