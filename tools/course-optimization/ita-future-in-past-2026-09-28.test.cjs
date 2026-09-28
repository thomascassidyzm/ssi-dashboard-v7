// tools/course-optimization/ita-future-in-past-2026-09-28.test.cjs
//   node --test tools/course-optimization/ita-future-in-past-2026-09-28.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const T = require('./ita-future-in-past-2026-09-28.cjs');

test('the rule: would+verb after a past frame is the perfect; standing alone it is the simple; would have is always the perfect', () => {
  assert.equal(T.classifyRow('I thought it would be difficult to finish', 'pensavo che sarebbe stato difficile finire'), 'A-correct(frame+perf)');
  assert.equal(T.classifyRow('it would be difficult to finish', 'sarebbe stato difficile finire'), 'B-perf-standalone');          // the old S0544L02U01
  assert.equal(T.classifyRow("she said it wouldn't be a problem", 'ha detto che non sarebbe un problema'), 'C-simple-after-frame'); // the old S0415L01B02
  assert.equal(T.classifyRow('that would be difficult', 'sarebbe difficile'), 'A-correct(standalone simple)');                     // S0172L01U01 stays
  assert.equal(T.classifyRow('I would have done it yesterday', "l'avrei fatto ieri"), 'A-correct(would-have+perf)');
  assert.equal(T.classifyRow("I wouldn't have dared to go", 'non avrei osato andare'), 'A-correct(would-have+perf)');           // wouldn't have, no space
  assert.equal(T.classifyRow("I'd seen it before", "l'avevo visto prima"), null);                                                   // 'd = had, not matched
  assert.equal(T.classifyRow('we shouldn\'t eat yet', 'non dovremmo mangiare ancora'), 'G-Italian-cond-no-English-would');
});

test('every change: the before row is a defect and the after row is correct, and the LEGO survives on both sides', () => {
  for (const c of T.CHANGES) {
    const before = T.classifyRow(c.before.known, c.before.target), after = T.classifyRow(c.after.known, c.after.target);
    if (c.seed === 406 || c.seed === 508) { assert.equal(before, 'E-would-no-Italian-cond', c.id); assert.equal(after, null, `${c.id} leaves the census (will ↔ future)`); }
    else { assert.match(before, /^[BC]-/, `${c.id} before: ${before}`); assert.match(after, /^A-/, `${c.id} after: ${after}`); }
    assert.equal(T.phraseContainsLego(c.after, T.LEGOS[c.lego]), true, `${c.id} lost its LEGO`);
    if (c.frame) assert.ok(c.after.target.includes(c.frame) || c.frame === 'penso che', `${c.id} frame ${c.frame} not in Italian`);
  }
  assert.deepEqual(T.SEEDS, [406, 415, 508, 535, 544]);
});
