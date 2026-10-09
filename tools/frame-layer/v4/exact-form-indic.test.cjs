// exact-form.cjs normalises with availability.norm, which turns combining marks (\p{M}:
// Devanagari matras, Bengali/Tamil vowel signs) into spaces. An inflection that differs
// only by a vowel sign therefore looks identical to the taught form, so the exact-form
// rule (Tom 2026-10-09) is not enforced for Indic-script targets.
const test = require('node:test');
const assert = require('node:assert');
const { exactFormCheck } = require('./exact-form.cjs');

test('Hindi: taught "वह करता है" does not license "वह करती है"', () => {
  const r = exactFormCheck('वह करती है', ['वह करता है']);
  assert.strictEqual(r.ok, false);
});

test('Hindi: की is not licensed by taught कि (vowel sign only)', () => {
  assert.strictEqual(exactFormCheck('की', ['कि']).ok, false);
  assert.strictEqual(exactFormCheck('वह करता है', ['वह करता है']).ok, true);
});

test('Chinese: 我想去 tiles from taught 我想 + 去 by character; 我要去 does not', () => {
  assert.strictEqual(exactFormCheck('我想去', ['我想', '去'], { noSpace: true }).ok, true);
  assert.strictEqual(exactFormCheck('我要去', ['我想', '去'], { noSpace: true }).ok, false);
  assert.strictEqual(exactFormCheck('我想去', ['我想', '去']).ok, false); // old word-tiling behaviour
});

test('regate --dir is an option pair, not a course', () => {
  const { parseArgs } = require('./exact-form-regate.cjs');
  assert.deepStrictEqual(parseArgs(['hin_for_eng', '--dir', '/x/y', 'ben_for_eng']), { courses: ['hin_for_eng', 'ben_for_eng'], dir: '/x/y' });
});
