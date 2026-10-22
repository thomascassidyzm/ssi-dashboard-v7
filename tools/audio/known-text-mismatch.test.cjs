const test = require('node:test'), assert = require('node:assert')
const { slotsOf, mismatches } = require('./known-text-mismatch.cjs')
test('a slot showing "to eat" but pointing at a clip that says "eat" is a mismatch; matching and empty slots are not', () => {
  const seeds = [{ legos: [{ lego_id: 'S0001L01', phrases: [
    { type: 'lego_debut', known_text: 'to eat', known_audio_uuid: 'a' },
    { type: 'build', id: 'c:S0001L01B01', known_text: 'I want to eat', known_audio_uuid: 'b' },
    { type: 'use', id: 'c:S0001L01U01', known_text: 'to eat now', known_audio_uuid: null }] }] }]
  const clips = new Map([['a', { text: 'eat', voice_id: 'v' }], ['b', { text: 'I want to eat.', voice_id: 'v' }]])
  const bad = mismatches(slotsOf(seeds), clips)
  assert.deepStrictEqual(bad.map((x) => x.slot), ['S0001L01'])
})
