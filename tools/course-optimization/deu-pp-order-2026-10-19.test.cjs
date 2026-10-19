'use strict';
// Proof for job #158: the standard-order rule fails on each BEFORE text and passes on each AFTER text, and every AFTER
// text keeps its LEGO (the LEGO strings are the live ones read on 19 Oct 2026).
const test = require('node:test');
const assert = require('node:assert');
const { ROWS, standardOrder, editOps, clipAsks } = require('./deu-pp-order-2026-10-19.cjs');

const LEGO = { S0295L02U01: ['to be finished', 'fertig werden'], S0195L02U04: ['the table', 'der Tisch'], S0237L01U12: ['he wanted me to', 'er wollte, dass ich'],
  S0238L01U09: ['he wanted you to', 'er wollte, dass du'], S0246L01U10: ['I wanted her to help you but she was too busy', 'Ich wollte, dass sie dir hilft, aber sie war zu beschäftigt'],
  S0129L02U04: ['you are doing so well', 'du es so gut machst'], S0250L02U17: ['something else', 'etwas anderes'] };
const lc = (s) => s.toLowerCase();

test('seven rows, seed 251 untouched', () => {
  assert.strictEqual(ROWS.length, 7);
  assert.ok(!ROWS.some((r) => /^S0251/.test(r.id)));
});
test('every BEFORE text breaks the rule and every AFTER text obeys it', () => {
  for (const r of ROWS) {
    assert.ok(!standardOrder(r, r.before[1]), `${r.id} before should fail`);
    assert.ok(standardOrder(r, r.after[1]), `${r.id} after should pass`);
  }
});
test('every AFTER text contains its LEGO on both sides', () => {
  for (const r of ROWS) {
    assert.ok(lc(r.after[0]).includes(lc(LEGO[r.id][0])), `${r.id} known`);
    assert.ok(lc(r.after[1]).includes(lc(LEGO[r.id][1])), `${r.id} target`);
  }
});
test('an untaught "gehe" never comes back (S0025L05 teaches "gehen muss")', () => {
  assert.ok(!/\bgehe\b/.test(ROWS[0].after[1]));
});
test('ops: one text update per row, links in the same batch, known only where the English changed', () => {
  const clips = new Map(clipAsks().map((a, i) => [`${a.role}\0${a.text}`, `clip-${i}`]));
  const ops = editOps(clips);
  assert.strictEqual(ops.filter((o) => o.op === 'phrase.update').length, 7);
  assert.strictEqual(ops.filter((o) => o.op === 'audio.link' && o.slot === 'known').length, 5);
  assert.strictEqual(ops.filter((o) => o.op === 'audio.link' && o.slot !== 'known').length, 14);
});
