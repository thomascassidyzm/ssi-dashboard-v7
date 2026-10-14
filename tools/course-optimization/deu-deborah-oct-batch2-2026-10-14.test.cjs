'use strict';
// node tools/course-optimization/deu-deborah-oct-batch2-2026-10-14.test.cjs — the plan's own rules (job #130)
const assert = require('assert');
const T = require('./deu-deborah-oct-batch2-2026-10-14.cjs');

// every intro quotes its LEGO, and an as-in context contains it (services/shared/intro-mirror.cjs, Kai 2026-09-28)
const quoted = (t) => t.match(/^The German for: '(.+?)'(?:, as in — '(.+)')?, is: <break time="300ms"\/>$/);
for (const l of T.LEGO_EDITS.filter((x) => x.intro)) { const m = quoted(l.intro); assert.ok(m, l.lego); assert.strictEqual(m[1], l.after[0], `${l.lego} intro quotes its new known side`); if (m[2]) assert.ok(T.containsWords(m[2], m[1]), `${l.lego} as-in contains the chunk`); }
for (const i of T.INTROS) { const m = quoted(i.text); assert.ok(m, i.lego); if (m[2]) assert.ok(T.containsWords(m[2], m[1]), `${i.lego} as-in contains the chunk`); }
assert.strictEqual(T.fadedText(T.intro('war', 'during the war')), `The German for: 'war', as in — 'during the war', is: <break time="300ms"/> <break time="10ms"/>`);

// a LEGO whose German grows keeps the English (Kai: a LEGO grows on BOTH sides; here the English already said it)
for (const l of T.LEGO_EDITS.filter((x) => x.cls === 'B')) { assert.strictEqual(l.before[0], l.after[0], l.lego); assert.ok(T.containsWords(l.after[1], l.before[1]), `${l.lego} grows, never swaps`); }
// Kai 2026-10-14: no German verb without its subject pronoun
assert.ok(['sie spielen', 'ich wünschte'].every((t) => T.LEGO_EDITS.some((l) => l.after[1] === t)));
// a bare build that mirrors the LEGO grows with it
for (const [lego, row] of [['S0436L01', 'S0436L01B01'], ['S0556L03', 'S0556L03B01'], ['S0460L02', 'S0460L02B01'], ['S0461L02', 'S0461L02B01'], ['S0547L02', 'S0547L02B01'], ['S0538L04', 'S0538L04B01']]) {
  assert.deepStrictEqual(T.PHRASE_EDITS.find((e) => e.id === row).after, T.LEGO_EDITS.find((l) => l.lego === lego).after, row);
}
// no two rows in the plan share English over different German (ZUT within the plan)
const k = new Map(); for (const e of [...T.PHRASE_EDITS.map((x) => x.after), ...T.LEGO_EDITS.map((x) => x.after)]) { const o = k.get(e[0].toLowerCase()); assert.ok(!o || o === e[1].toLowerCase(), e[0]); k.set(e[0].toLowerCase(), e[1].toLowerCase()); }
// moves go to a LATER LEGO whose German the row contains ("eine Frage stellen" is taught by S0423L03)
for (const m of T.MOVES) assert.ok(m.to > m.from.slice(0, 8), m.from);
// an id ever named in an edit event is never re-issued
assert.strictEqual(T.nextFreeId('S0423L03', 'use', new Set(['S0423L03U01']), new Set(['S0423L03U02'])), 'S0423L03U03');
// a moved row and a deleted row are never also edited
const edited = new Set(T.PHRASE_EDITS.map((e) => e.id));
for (const id of [...T.MOVES.map((m) => m.from), ...T.DELETES.map((d) => d.id)]) assert.ok(!edited.has(id), id);
// the audio plan asks the female voice for target1 and the male for target2, and Tom-006 for every intro
const fakeDb = { legoById: new Map([['S0496L01', { target_text: 'vorhaben' }], ['S0524L05', { target_text: 'zurückrufen' }]]), phrases: [], byId: new Map() };
const plan = T.audioPlan(fakeDb);
assert.ok(plan.filter((p) => p.role === 'target1').every((p) => /b9de4a89/.test(p.voiceId)));
assert.ok(plan.filter((p) => p.role === 'target2').every((p) => /afa425cf/.test(p.voiceId)));
assert.ok(plan.filter((p) => p.role === 'presentation').every((p) => /d293d509/.test(p.voiceId)));
assert.strictEqual(new Set(plan.map((p) => p.key)).size, plan.length, 'one render per distinct clip');
console.log('ok');
