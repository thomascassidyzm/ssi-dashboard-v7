// Job #393: the plan-first planner may only CUT (one contiguous span of ONE longer clip of a different text), never JOIN and never
// self-source. Pre-fix there was no planner; the mutants below are the wrong versions this test must refuse while the real one passes.
const test = require('node:test'), assert = require('node:assert')
const P = require('./plan-first-render.cjs')
const clips = ['a b c d', 'b c', 'a', 'a d', 'c d'].map((t) => ({ id: t, text: t }))

test('real plan cuts contiguous spans, renders the rest, and passes its own check', () => {
  const p = P.plan(clips)
  assert.deepStrictEqual(p.render.sort(), ['a b c d', 'a d'])   // "a d" is a JOIN of a + d in the text sense: not a span, so it is rendered
  assert.strictEqual(p.cut['b c'].source, 'a b c d')
  assert.strictEqual(p.cut['a'].source, 'a b c d')
  assert.deepStrictEqual(P.verifyPlan(clips, p), [])
})
test('strict needs clause edges: a mid-sentence span is loose-only', () => {
  const c = ['hola, que tal estas', 'que tal', 'hola'].map((t) => ({ id: t, text: t }))
  assert.ok(P.plan(c, { strict: true }).cut['hola'])
  assert.ok(!P.plan(c, { strict: true }).cut['que tal'])   // opens mid-clause, closes mid-clause
  assert.ok(P.plan(c, { strict: false }).cut['que tal'])
})
test('checker refuses a join-allowing plan and a self-sourcing plan', () => {
  const joined = { render: ['a b c d'], cut: { 'a d': { source: 'a b c d', a: 0, b: 2 } } }       // a + d stitched: not contiguous
  assert.ok(P.verifyPlan(clips, joined).some((e) => /contiguous/.test(e)))
  const self = { render: ['a b c d', 'a d'], cut: { 'a d': { source: 'a d', a: 0, b: 2 } } }
  assert.ok(P.verifyPlan(clips, self).some((e) => /own text|both/.test(e)))
})
