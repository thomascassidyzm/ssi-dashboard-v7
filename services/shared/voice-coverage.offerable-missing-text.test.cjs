/**
 * OFFERABLE must not ignore rounds whose text is missing: a line nobody can look up is a line no
 * voice holds, so it cannot be waved through just because the lines that DO have text are held.
 *
 * Run: node services/shared/voice-coverage.offerable-missing-text.test.cjs
 */
const test = require('node:test')
const assert = require('node:assert/strict')
const { summariseSide } = require('./voice-coverage.cjs')
const { clipTextKey } = require('./clip-index.cjs')

const index = new Map([[`eng\u001f${clipTextKey('hello')}`, new Map([['v', 'tts']])]])
const side = rounds => summariseSide({ language: 'eng', rounds, voices: ['v'], cast: [], index }).voices[0]

test('a voice holding every line with text is offerable when no round is missing text', () => {
  assert.equal(side([{ number: 1, seed: 1, texts: ['hello'] }]).offerable, true)
})

test('a missing-text round in seeds 1-100 blocks offering', () => {
  assert.equal(side([{ number: 1, seed: 1, texts: ['hello'] }, { number: 2, seed: 2, texts: [null] }]).offerable, false)
})

test('missing-text rounds past seed 100 count against the 80% rest share', () => {
  const rounds = [{ number: 1, seed: 1, texts: ['hello'] }, { number: 2, seed: 150, texts: [null] }]
  assert.equal(side(rounds).offerable, false)
})
