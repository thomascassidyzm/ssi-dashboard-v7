/**
 * TEST FIXTURES for the frame tagger: tests never call a model. A test states
 * the tags it assumes, installs them as the cache, and exercises the code that
 * reads them. `installTags({ 'I want to go': ['P1'], 'thank you, I want to go':
 * { frames: ['P1'], opener: true } })` and every patterns.cjs `p.test` /
 * frame-tagger `framesOf` lookup reads from it.
 *
 * `regexpCalls(fn)` runs fn and counts RegExp executions inside it, so a test
 * can assert that a classifier path runs on tags alone, with no regex at all.
 */
const T = require('./frame-tagger.cjs');

function installTags(map, codex = T.CODEX) {
  return T.useCache(new T.MemoryCache(map), codex);
}

function regexpCalls(fn) {
  const exec = RegExp.prototype.exec;
  let n = 0;
  RegExp.prototype.exec = function (...a) { n++; return exec.apply(this, a); };
  try { fn(); } finally { RegExp.prototype.exec = exec; }
  return n;
}

/** Clause cuts for tests (clause-cut.cjs): { text: k }, k = number of the connective word opening the second clause, 0 = none. */
function installCuts(map) {
  const C = require('./clause-cut.cjs');
  return C.useCutCache(new C.MemoryCutCache(map));
}

module.exports = { installTags, installCuts, regexpCalls };
