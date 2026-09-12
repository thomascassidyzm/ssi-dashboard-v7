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
          { global_order: 3, target_text: 'Sì. Oggi abbiamo—', known_text: 'Yes. Today we have—', jump_in: false },
          { global_order: 4, target_text: 'Va bene.', known_text: 'Fine.', jump_in: false },
          { global_order: 5, target_text: 'Ciao.', known_text: 'Bye.' },
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

test('generateScene: text cut-off wins, then the model verdict; first line false; missing → null', async () => {
  const scene = { number: 1, title: 'T', lines: [1, 2, 3, 4, 5].map((n) => ({ global_order: n, sentence_number: n, speaker: n % 2 ? 'Tom' : 'Aran', english_text: `line ${n}` })) }
  const { lines } = await gen.generateScene({ scene, targetLanguage: 'Italian', knownLanguage: 'English', cultureNotes: '-', ledger: '', canonicalSlug: 'pod-1' })
  // line 4 follows a line the generator wrote as cut off ('—'): the text overrides the model's false
  assert.deepStrictEqual(lines.map((l) => l.jump_in), [false, true, false, true, null])
  assert.strictEqual(lines[1].target_text, 'Davvero?')
})
