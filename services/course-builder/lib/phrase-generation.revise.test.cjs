/**
 * `revise` on the v3 door (job #409, 2026-09-27): a set a cross-family
 * naturalness reader has refused goes back to the model with its own phrases
 * and the reader's words, through the door's existing retry prompt — so the
 * rewrite keeps what was fine and still clears every gate.
 *
 * The model, the prompt assembler and the structural stop are stubbed in the
 * require cache: this test is about what the door SENDS, not what a model
 * writes.
 *
 * Run: node --test services/course-builder/lib/phrase-generation.revise.test.cjs
 */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const sent = [];
function stub(rel, exports) {
  const file = require.resolve(path.join(__dirname, rel));
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
}
stub('../../shared/claude-cli.cjs', {
  claudeChat: async (prompt) => { sent.push(prompt); return JSON.stringify({ build: [{ known: 'b', target: 'b' }], use: [{ known: 'u', target: 'u' }] }); },
});
stub('../../../tools/phrase-lab/build-prompt.cjs', {
  buildPrompt: async () => ({ prompt: 'BASE PROMPT', inventory: {}, lego: { lego_id: 'x:S0100L01', known_text: 'k', target_text: 't' }, seed: {} }),
});
stub('./structural-features.cjs', {
  structuralStop: () => null, buildStructuralFlag: () => null, loadCourseSeeds: async () => [], raiseStructuralFlag: async () => ({}),
});

const { generateLegoPhrases } = require('./phrase-generation.cjs');

test('without revise, the first call is the plain brief', async () => {
  sent.length = 0;
  await generateLegoPhrases(null, 'ita_for_eng', 100, 1, { gate: false });
  assert.ok(sent[0].startsWith('BASE PROMPT'));
  assert.ok(!sent[0].includes('REFUSED'));
});

test('with revise, the first call carries the refused set and the reader\'s words', async () => {
  sent.length = 0;
  await generateLegoPhrases(null, 'ita_for_eng', 100, 1, {
    gate: false,
    revise: { phrases: { build: [], use: [{ known: 'to see an old friend is interesting', target: 'vedere un vecchio amico è interessante' }] },
      reasons: ['NATURALNESS — a native reader rejected the English: unnatural. Replace this phrase.'] },
  });
  assert.strictEqual(sent.length, 1);
  assert.ok(sent[0].startsWith('BASE PROMPT'), 'the original brief still leads');
  assert.ok(sent[0].includes('Your previous attempt was REFUSED'));
  assert.ok(sent[0].includes('USE: to see an old friend is interesting → vedere un vecchio amico è interessante'));
  assert.ok(sent[0].includes('NATURALNESS — a native reader rejected the English'));
});
