// Pure regression fixture: no database or production changes.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { summariseSide } = require('../../services/shared/voice-coverage.cjs')

test('a missing required seed 1–100 text prevents offering the voice', () => {
  const side = summariseSide({
    language: 'eng',
    rounds: [{ number: 1, seed: 1, texts: ['hello', null] }],
    voices: ['v'], cast: [],
    index: new Map([['eng\u001fhello', new Map([['v', 'tts']])]]),
  })
  assert.equal(side.missingTextRounds, 1)
  assert.equal(side.voices[0].completeRounds, 0)
  assert.equal(side.voices[0].offerable, false)
})
