/**
 * THE RULE (Tom, 2026-10-07, r-2026-10-07-never-use-regex-to-classify-language):
 * no classifier path in the frame layer decides language with a regex. Frames,
 * dialogue shapes, could-occupy classes and split outcomes are defined in codex
 * JSON and classified by a Haiku-family model (frame-tagger.cjs), cached per
 * phrase text.
 *
 * Two checks, because each misses what the other sees:
 *   STATIC   the classifier modules below contain no regex literal and no
 *            RegExp constructor (parsed, not grepped).
 *   RUNTIME  classifying through the public API runs ZERO RegExp executions,
 *            measured by wrapping RegExp.prototype.exec around the call.
 * Add a module to CLASSIFIERS when it classifies language; text plumbing that
 * only tokenises or normalises (db.cjs, availability.cjs norm) is not listed.
 *
 * Run: node --test tools/frame-layer/no-regex-classifiers.test.cjs
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parse } = require('@babel/parser');
const { installTags, regexpCalls } = require('./tag-fixtures.cjs');

const CLASSIFIERS = [
  'frame-tagger.cjs', 'patterns.cjs', 'v4/window-coverage.cjs', 'v4/frame-inventory.cjs',
];

function regexNodes(file) {
  const src = fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/^#!.*\n/, '');
  const found = [];
  (function walk(x) {
    if (!x || typeof x !== 'object') return;
    if (Array.isArray(x)) return x.forEach(walk);
    if (x.type === 'RegExpLiteral') found.push(`/${x.pattern}/ at line ${x.loc.start.line}`);
    if ((x.type === 'NewExpression' || x.type === 'CallExpression') && x.callee && x.callee.name === 'RegExp') found.push(`RegExp() at line ${x.loc.start.line}`);
    for (const k of Object.keys(x)) if (k !== 'loc') walk(x[k]);
  })(parse(src, { sourceType: 'script' }));
  return found;
}

for (const file of CLASSIFIERS) {
  test(`${file} classifies with no regex`, () => {
    assert.deepStrictEqual(regexNodes(file), []);
  });
}

test('frame classification through the public API runs zero RegExp executions', () => {
  installTags({ 'I want to go tomorrow': ['P1', 'P28'], 'thank you, I want to go': { frames: ['P1'], opener: true } });
  const PATTERNS = require('./patterns.cjs');
  const { framesOf, hasOpener } = require('./frame-tagger.cjs');
  let out;
  const n = regexpCalls(() => {
    out = [PATTERNS.filter(p => p.test('I want to go tomorrow')).map(p => p.id), framesOf('thank you, I want to go'), hasOpener('thank you, I want to go')];
  });
  assert.strictEqual(n, 0);
  assert.deepStrictEqual(out, [['P1', 'P28'], ['P1'], true]);
});

test('an untagged text throws rather than scoring as frameless', () => {
  installTags({});
  const PATTERNS = require('./patterns.cjs');
  assert.throws(() => PATTERNS[0].test('never tagged'), /not tagged/);
});
