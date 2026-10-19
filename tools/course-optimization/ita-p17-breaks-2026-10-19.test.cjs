'use strict';
// node --test tools/course-optimization/ita-p17-breaks-2026-10-19.test.cjs
// The proof for job #282: the rows the plan rewrites, exactly as Popty listed them on 19 Oct 2026, do NOT contain their LEGO
// under canon K49–K51; after the plan every one does. The census matcher (quality-census legoInPhrase) only flags candidates
// — it cannot tell a K49 split from a K50 break, and folds accents so "e" (and) stands in for "è" (is).
const test = require('node:test');
const assert = require('node:assert');
const T = require('./ita-p17-breaks-2026-10-19.cjs');
const PLAN = require('./ita-p17-breaks-2026-10-19.plan.cjs');

// [phrase, LEGO target, target text on 19 Oct]
const BEFORE = [
  ['S0065L02U02', 'prendersi il tempo', 'mi piace prendermi il tempo per rispondere'],
  ['S0387L02B02', 'non pensavo che avesse ragione', 'ho chiesto se avesse ragione'],
  ['S0387L02U03', 'non pensavo che avesse ragione', 'non ho chiesto se avesse ragione'],
  ['S0387L02U04', 'non pensavo che avesse ragione', 'non sapevo che aveva ragione'],
  ['S0584L02B01', 'svegliarsi ogni mattina', 'svegliarsi'],
  ['S0584L02B03', 'svegliarsi ogni mattina', 'svegliarsi e vedere le montagne'],
  ['S0584L02U02', 'svegliarsi ogni mattina', 'è bellissimo svegliarsi qui'],
  ['S0584L02U03', 'svegliarsi ogni mattina', "com'è svegliarsi in questa parte del mondo?"],
  ['S0615L02B03', 'pensavo che fossi', 'sapevo che eri molto coraggioso'],
  ['S0615L02U02', 'pensavo che fossi', 'sono felice che fossi molto coraggioso'],
  ['S0615L02U03', 'pensavo che fossi', 'ha detto che eri molto coraggioso'],
  ['S0615L02U04', 'pensavo che fossi', 'ha visto che eri molto coraggioso'],
  ['S0617L02B02', 'pensavi che fosse', 'le ho detto che era un errore'],
  ['S0617L02B03', 'pensavi che fosse', 'le ha detto che era un errore'],
  ['S0617L02U03', 'pensavi che fosse', 'mi ha detto che era un errore'],
  ['S0617L02U04', 'pensavi che fosse', 'ha visto che era un errore'],
  ['S0647L01U04', 'lei lo parla, signora', 'lei lo parla bene, signore'],
];

test('every row the plan rewrites broke P17 on 19 Oct, and contains its LEGO after the plan', () => {
  const upd = new Map(PLAN.filter((e) => e.do === 'update').map((e) => [e.id, e]));
  assert.strictEqual(upd.size, BEFORE.length);
  for (const [id, lego, before] of BEFORE) {
    assert.ok(!T.containsLego(lego, before), `${id} before should break: ${before}`);
    assert.ok(T.containsLego(lego, upd.get(id).target), `${id} after should contain "${lego}": ${upd.get(id).target}`);
  }
});

test('K49: words inside the LEGO or another order is contained; K50/K51: another form is not; L28: infinitive + clitic is', () => {
  assert.strictEqual(T.shape('pensavo che fosse', 'pensavo che quel posto fosse bellissimo'), 'split');
  assert.strictEqual(T.shape('un nuovo approccio', 'un approccio nuovo e diverso'), 'split');
  assert.strictEqual(T.shape('svegliarsi ogni mattina', 'svegliarsi qui ogni mattina'), 'split');
  assert.strictEqual(T.shape('arriverò', 'penso di arrivare domani'), 'break');
  assert.strictEqual(T.shape('hai fatto', 'sono felice che tu abbia fatto il lavoro'), 'break');
  assert.strictEqual(T.shape('andrà bene', 'sto provando a fare in modo che vada bene'), 'break');
  assert.strictEqual(T.shape('rilassarsi', 'voglio rilassarmi'), 'break');
  assert.strictEqual(T.shape('assicurarsi', 'dovremmo assicurarci prima di andare'), 'break');
  assert.strictEqual(T.shape('ottenere', 'vogliamo ottenerlo insieme'), 'plain');
  assert.strictEqual(T.shape('pensare', 'non voglio pensarci adesso'), 'plain');
  // accents are words: "e" (and) is not "è" (is)
  assert.strictEqual(T.shape('è una mia amica', 'penso che sia una mia amica e posso chiederle'), 'break');
  assert.strictEqual(T.shape("un bicchiere d'acqua", "un altro bicchiere d'acqua"), 'split');
});

test('the plan never deletes or edits a LEGO and every held row names its question', () => {
  for (const e of PLAN) {
    assert.ok(['update', 'delete', 'insert', 'hold', 'rehome', 'keep'].includes(e.do), e.id);
    if (e.do !== 'insert') assert.match(e.id, /^S\d{4}L\d{2}[BU]\d{2}$/, `${e.id} must be a phrase id`);
    if (e.do === 'hold') assert.ok(Object.values(PLAN.QUESTIONS).includes(e.why), e.id);
  }
});
