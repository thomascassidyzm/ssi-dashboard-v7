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
