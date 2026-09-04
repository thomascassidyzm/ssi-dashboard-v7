/**
 * IF RE-RENDERED must say WHY (Tom, 2026-09-04).
 *
 * The column used to read a bare "azure" for every language, which reads as an
 * estate policy statement when it is actually a consequence of an unfilled
 * Cartesia cast. These lock the two halves of that: the provider is still the
 * policy's own answer (never a hardcoded word), and the cause distinguishes
 * "nobody is cast" from "the vendor does not publish this language".
 *
 * Run: node services/voicelab/registry.default-render.test.cjs
 */
const test = require('node:test')
const assert = require('node:assert/strict')
const { providerDefaultFor } = require('./registry.cjs')

test('a Cartesia-published language falls to Azure, and says casting is what is missing', () => {
  const r = providerDefaultFor('fra')
  assert.equal(r.provider, 'azure')
  assert.match(r.cause, /no Cartesia voice cast yet/)
  assert.match(r.reason, /no Cartesia voice is cast for it/)
  assert.equal(r.rung, 3)
})

test('a language Cartesia does not publish says exactly that instead', () => {
  const r = providerDefaultFor('gle')
  assert.equal(r.provider, 'azure')
  assert.match(r.cause, /does not publish/)
})

test('a human-recorded language is an answer, not a failure', () => {
  const r = providerDefaultFor('cym')
  assert.equal(r.provider, 'human')
  assert.match(r.cause, /human-recorded/)
})

test('the provider is never a hardcoded word — it is whatever the policy says', () => {
  // If a Cartesia voice were ever auto-cast for a language, this row would
  // change with it. The point of the test is that the cause tracks the answer.
  const r = providerDefaultFor('eng')
  assert.ok(['azure', 'cartesia'].includes(r.provider))
  if (r.provider === 'cartesia') assert.match(r.cause, /Cartesia voice is cast/)
  else assert.match(r.cause, /no Cartesia voice cast yet/)
})
