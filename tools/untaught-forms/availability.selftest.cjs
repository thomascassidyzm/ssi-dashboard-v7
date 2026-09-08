#!/usr/bin/env node
/**
 * Self-test for Check 20's availability core. No database, no network.
 *   node tools/untaught-forms/availability.selftest.cjs
 *
 * These are the rules the calibration run depends on. Each one was a live defect at
 * some point in the 2026-09-08 build, so each assertion is a fact about the code and
 * not a restatement of intent.
 */
const assert = require('assert');
const A = require('./availability.cjs');
const { classifyDiff } = require('./classify.cjs');

const inv = A.buildInventory([
  { seed_number: 1, lego_index: 1, known_text: 'want to speak', components: [{ known: 'speak', target: 'x' }] },
  { seed_number: 12, lego_index: 1, known_text: "don't want to think", components: null },
  { seed_number: 16, lego_index: 1, known_text: 'want to go back', components: null },
]);
const at16 = A.inventoryAt(inv, 16 * 1000 + 1);

// K21 — a stem is not a form. "want" being taught never makes "wants" available.
assert.ok(at16.words.has('want'));
assert.ok(!at16.words.has('wants'));
assert.strictEqual(A.untaughtWords('he wants to go back', at16).map(x => x.word).join(','), 'he,wants');

// ...but the check must still be able to SAY that "wants" is a derivation of a taught
// word rather than an unrelated unknown. That is the opposite operation and is allowed.
assert.strictEqual(A.derivedFrom('wants', at16), 'want');
assert.strictEqual(A.derivedFrom('zebra', at16), null);
assert.strictEqual(A.derivedFrom('speak', at16), null, 'an attested form is never "derived"');

// Negation is not an inflection. Collapsing "do" and "don't" produced 158 false hits
// in the first jpn_for_eng calibration; these two assertions are what stops it coming back.
assert.notStrictEqual(A.variantKey('do'), A.variantKey("don't"));
assert.strictEqual(A.variantKey("don't"), A.variantKey("doesn't"));

// Case and the curly apostrophe are two encodings of one surface form, not two forms.
assert.strictEqual(A.normalise('He’s Really Good'), "he's really good");

// Classification drives the reading list's rank, so the person class must win over the
// bare-s rule for the do-support forms — that reordering was the calibration's own finding.
assert.strictEqual(classifyDiff("don't", "doesn't"), 'person');
assert.strictEqual(classifyDiff('want', 'wants'), 'person_or_plural');
assert.strictEqual(classifyDiff('speak', 'spoke'), 'past');
assert.strictEqual(classifyDiff('speak', 'speaking'), 'ing');
assert.strictEqual(classifyDiff('he', "he's"), 'contraction');

// The inventory is cumulative and strictly bounded by the cut: seed 16's chunk must not
// be visible to a row judged at seed 12.
const at12 = A.inventoryAt(inv, 12 * 1000 + 1);
assert.ok(!at12.words.has('back'));

console.log('availability.selftest: all assertions passed');
