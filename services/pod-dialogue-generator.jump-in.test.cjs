'use strict'
// The generator writes the jump-in marker it was asked for, and never marks the
// first line of a scene (it has nobody to jump in on). Exercises generateScene
// through a stubbed claude CLI so the JSON → row mapping is the thing under test.
const test = require('node:test')
const assert = require('node:assert')
const Module = require('module')

// Stub ./shared/claude-cli.cjs before the generator loads it.
const realLoad = Module._load
Module._load = function (request, parent, ...rest) {
  if (request === './shared/claude-cli.cjs') {
    return {
      HAIKU_MODEL: 'haiku',
      claudeChat: async () => JSON.stringify({
        lines: [
          { global_order: 1, target_text: 'Chi lo sa.', known_text: 'Who knows.', jump_in: true },
          { global_order: 2, target_text: 'Davvero?', known_text: 'Really?', jump_in: true },
          { global_order: 3, target_text: 'Sì.', known_text: 'Yes.', jump_in: false },
          { global_order: 4, target_text: 'Va bene.', known_text: 'Fine.' },
        ],
        deviations: [],
      }),
    }
  }
  return realLoad.call(this, request, parent, ...rest)
}
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'x'
const gen = require('./pod-dialogue-generator.cjs')

test('generateScene maps jump_in per line; first line forced false; missing → null', async () => {
  const scene = { number: 1, title: 'T', lines: [1, 2, 3, 4].map((n) => ({ global_order: n, sentence_number: n, speaker: n % 2 ? 'Tom' : 'Aran', english_text: `line ${n}` })) }
  const { lines } = await gen.generateScene({ scene, targetLanguage: 'Italian', knownLanguage: 'English', cultureNotes: '-', ledger: '', canonicalSlug: 'pod-1' })
  assert.deepStrictEqual(lines.map((l) => l.jump_in), [false, true, false, null])
  assert.strictEqual(lines[1].target_text, 'Davvero?')
})
