'use strict';
const test = require('node:test');
const assert = require('node:assert');
const D = require('./spa-225-fix-31-2026-10-30.data.cjs');

const ids = Object.values(D.PHRASES).flat().map((r) => r[0]);

// Kai's brief for #261: his open calls and the audit's older breaks stay untouched.
test('never touches the S0125L02 / S0151L02 baskets except #164\'s own S0151L02U05, nor #237\'s rows', () => {
  for (const id of ids) {
    assert.ok(!id.startsWith('S0125L02'), id);
    if (id.startsWith('S0151L02')) assert.strictEqual(id, 'S0151L02U05');
    assert.ok(!/^S0(148|295|299|433)/.test(id), id);
  }
});

test('S0115L04: only the "as if I\'m" span leaves the English', () => {
  assert.strictEqual(D.replaceAsIf("I don't feel as if I'm ready to have a conversation yet"), "I don't feel ready to have a conversation yet");
  assert.strictEqual(D.LEGOS[0].set.known_text, "I don't feel ready to have a conversation");
});

test('no new Spanish row joins -la/-las to a verb or keeps two sentences', () => {
  for (const [, , t] of Object.values(D.PHRASES).flat()) {
    if (!t) continue;
    assert.ok(!/\b\w+(r|ndo)la(s)?\b|\blas necesito\b/i.test(t), t);
    assert.ok(!/[.?!]\s+\S/.test(t.replace(/\s*$/, '')), t);
  }
});

