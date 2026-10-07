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
  'dialogue-patterns.cjs', 'could-occupy.cjs', 'split-matchers.cjs',
];

/**
 * Modules that still normalise or split text with a regex (a word tokeniser,
 * the matrix-clause cut) but must never BUILD a regex from data: the
 * `new RegExp(o.target_re)` split matchers lived here until 2026-10-07.
 */
const NO_DYNAMIC_REGEX = ['derive-seed-job.cjs', 'pattern-diversity.cjs'];

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

for (const file of NO_DYNAMIC_REGEX) {
  test(`${file} builds no regex from data`, () => {
    assert.deepStrictEqual(regexNodes(file).filter(n => n.startsWith('RegExp(')), []);
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

test('dialogue, could-occupy and split-outcome classification run zero RegExp executions', () => {
  const { installTags: put } = require('./tag-fixtures.cjs');
  const { SENTENCE_FRAMES, EXCHANGE_FRAMES, exchangeText, D_CODEX, X_CODEX } = require('./dialogue-patterns.cjs');
  const { tag, C_CODEX } = require('./could-occupy.cjs');
  const { spa, carries, CODEX_BY_TARGET_LANGUAGE } = require('./split-matchers.cjs');
  put({ 'Thank you very much. Goodbye.': ['D3', 'D1'] }, D_CODEX);
  put({ [exchangeText('Where are you from?', "I'm from Leeds. And you?")]: ['X1'],
        [exchangeText('Where are you from?', "I'm from Leeds. And you?", "I'm from France.")]: ['X1'] }, X_CODEX);
  put({ 'Could you say that again more slowly?': ['C3', 'C5', 'C24'] }, C_CODEX);
  put({ 'quiero que vengas': ['S1B'] }, CODEX_BY_TARGET_LANGUAGE.spa);
  let out;
  const n = regexpCalls(() => {
    const x1 = EXCHANGE_FRAMES.find(f => f.id === 'X1');
    out = [
      SENTENCE_FRAMES.filter(f => f.test('Thank you very much. Goodbye.')).map(f => f.id),
      x1.testPair('Where are you from?', "I'm from Leeds. And you?"),
      x1.testTriple('Where are you from?', "I'm from Leeds. And you?", "I'm from France."),
      tag('Could you say that again more slowly?').classes,
      spa.S1.outcomes.map(o => carries(o, 'quiero que vengas')),
    ];
  });
  assert.strictEqual(n, 0);
  assert.deepStrictEqual(out, [['D1', 'D3'], true, true, ['C3', 'C5', 'C24', 'C0'], [false, true]]);
});

test('an untagged turn, exchange, sentence or target text throws rather than reading as absent', () => {
  const { installTags: put } = require('./tag-fixtures.cjs');
  const { SENTENCE_FRAMES, EXCHANGE_FRAMES, D_CODEX, X_CODEX } = require('./dialogue-patterns.cjs');
  const { tag, C_CODEX } = require('./could-occupy.cjs');
  const { spa, carries, CODEX_BY_TARGET_LANGUAGE } = require('./split-matchers.cjs');
  put({}, D_CODEX); put({}, X_CODEX); put({}, C_CODEX); put({}, CODEX_BY_TARGET_LANGUAGE.spa);
  assert.throws(() => SENTENCE_FRAMES[0].test('never tagged'), /not tagged/);
  assert.throws(() => EXCHANGE_FRAMES[0].testPair('a', 'b'), /not tagged/);
  assert.throws(() => tag('never tagged at all'), /not tagged/);
  assert.throws(() => carries(spa.S1.outcomes[0], 'nunca'), /not tagged/);
});
