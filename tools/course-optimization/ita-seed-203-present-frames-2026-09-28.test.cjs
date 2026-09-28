'use strict';
// The rules behind job #574·I (Kai, 2026-09-28): each test fails on the BEFORE state and passes on the AFTER state.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-seed-203-present-frames-2026-09-28.cjs');

test('P24: the five rows were past frames before and are present frames after; faresti stays', () => {
  for (const c of T.CHANGES.filter(c => c.rule === 1)) {
    assert.equal(T.frameOf(c.before.known), 'past', `${c.id} before`);
    assert.equal(T.frameOf(c.after.known), 'present', `${c.id} after`);
    assert.match(c.after.target, /\bfaresti\b/, c.id);
    assert.doesNotMatch(c.after.target, /\b(volevo|era|fosse)\b/, `${c.id} keeps a past-frame verb`);
  }
});

test('frameOf: the hypothetical is a present frame, a past matrix verb is a past frame', () => {
  assert.equal(T.frameOf('what would you do if I asked you to help me?'), 'present');
  assert.equal(T.frameOf('if I asked you to help, would you do it?'), 'present');
  assert.equal(T.frameOf('what would you do if it was difficult?'), 'present');
  assert.equal(T.frameOf('I want to know what you would do'), 'present');
  assert.equal(T.frameOf('I wanted to know what you would do'), 'past');
  assert.equal(T.frameOf("it wasn't easy to know what you would do"), 'past');
  assert.equal(T.frameOf('I think nobody was sure what you would do'), 'past');
  assert.equal(T.frameOf('she said she would do it'), null, 'not this LEGO');
});

test('L27: L01 + L02 + the grown L03 tile seed 203; the old L03 left "di" untaught', () => {
  assert.equal(T.legosTileSeed(T.SEED_203, [T.L01, T.L02, T.OLD_L03]), false);
  assert.equal(T.legosTileSeed(T.SEED_203, [T.L01, T.L02, T.NEW_L03]), true);
  assert.equal(T.componentsTile(T.NEW_L03), true);
});

test('O12: every rewritten L03 phrase contains the grown LEGO on both sides; the old rows did not', () => {
  for (const c of T.CHANGES.filter(c => c.rule === 2)) {
    assert.equal(T.containsWords(c.after.known, T.NEW_L03.known) && T.containsWords(c.after.target, T.NEW_L03.target), true, c.id);
    assert.equal(T.containsWords(c.before.target, T.NEW_L03.target), false, `${c.id} before`);
  }
});

test('O13: the intro mirrors the grown LEGO and its context contains it; the old line did not', () => {
  assert.equal(T.NEW_INTRO_L03.includes(`'${T.NEW_L03.known}'`), true);
  assert.equal(T.containsWords('if I asked you to help me', T.NEW_L03.known), true);
  assert.equal(T.OLD_INTRO_L03.text.includes(`'${T.NEW_L03.known}'`), false);
});
