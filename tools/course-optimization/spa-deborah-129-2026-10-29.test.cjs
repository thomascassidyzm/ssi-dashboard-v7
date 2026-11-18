'use strict';
// node --test tools/course-optimization/spa-deborah-129-2026-10-29.test.cjs
// The rules and gates of the job #425 apply tool (Deborah's 129 spa_for_eng answers), on a hand-built course.
const test = require('node:test');
const assert = require('node:assert');
const { plan, applyRules, untaughtNew, editBatches } = require('./spa-deborah-129-2026-10-29.cjs');
const tw = require('../../services/course-builder/lib/taught-words.cjs');

test('item 1: "pienso que" becomes "creo que" only where the English says "I think"; "no pienso + verb" (not planning) is left', () => {
  assert.strictEqual(applyRules('S0099L01U01', 'I think you should try', 'Pienso que deberías intentar hablar').target, 'Creo que deberías intentar hablar');
  assert.strictEqual(applyRules('S0496L01U01', "I'm not planning to go", 'no pienso ir').target, 'no pienso ir');
  assert.strictEqual(applyRules('S0100L01U01', 'It is going well, I think', 'Va bien, pienso').target, 'Va bien, creo');
});

test('item 44: practising WITH someone gains "el español" and the English says "Spanish"; "con cuidado" is not a partner', () => {
  const r = applyRules('S0047L02U01', "I think that it's good to practise speaking with another person", 'Pienso que es bueno practicar hablando con otra persona');
  assert.strictEqual(r.target, 'Creo que es bueno practicar el español hablando con otra persona');
  assert.strictEqual(r.known, "I think that it's good to practise speaking Spanish with another person");
  const c = applyRules('S0037L03U05', 'I started to practise speaking carefully', 'Empecé a practicar hablando con cuidado');
  assert.strictEqual(c.target, 'Empecé a practicar hablando con cuidado');
});

test('item 16: bare "intentar" takes "lo"; a relative "que" object or a listed row is left', () => {
  assert.strictEqual(applyRules('X', "I'm going to try", 'pero voy a intentar').target, 'pero voy a intentarlo');
  assert.strictEqual(applyRules('S0131L02U03', 'There are many ideas I would like to try', 'Hay muchas ideas que me gustaría intentar').target, 'Hay muchas ideas que me gustaría intentar');
});

test('item 69: comparisons take "de lo que"; "lo que" after a plain "que" is left', () => {
  assert.strictEqual(applyRules('X', 'It was better than what I expected', 'Fue mejor que lo que esperaba').target, 'Fue mejor de lo que esperaba');
  assert.strictEqual(applyRules('X', 'I know that what you do is good', 'Sé que lo que haces es bueno').target, 'Sé que lo que haces es bueno');
});

test('an infinitive with an attached pronoun counts as its two taught parts; a new subjunctive does not', () => {
  const keys = tw.taughtWordKeys(['quiero intentar', 'arreglarlo', 'lo', 'pero'], 'spa_for_eng');
  assert.deepStrictEqual(untaughtNew(tw, keys, 'pero quiero intentar', 'pero quiero intentarlo'), []);
  assert.deepStrictEqual(untaughtNew(tw, keys, 'pero quiero intentar', 'pero quiero que lo intentes'), ['que', 'intentes']);
});

test('the "lo" of "todo lo que" is not the object clitic: -lo on an infinitive is untaught until an enclitic -lo is (Kai 30 Oct)', () => {
  const early = tw.taughtWordKeys(['quiero intentar todo lo que pueda hoy', 'lo estás haciendo'], 'spa_for_eng');
  assert.deepStrictEqual(untaughtNew(tw, early, 'quiero intentar', 'quiero intentarlo'), ['intentarlo']);
  const late = tw.taughtWordKeys(['quiero intentar todo lo que pueda hoy', 'no es fácil arreglarlo'], 'spa_for_eng');
  assert.deepStrictEqual(untaughtNew(tw, late, 'quiero intentar', 'quiero intentarlo'), []);
  const me = tw.taughtWordKeys(['quiero intentar', 'despertarme'], 'spa_for_eng');
  assert.deepStrictEqual(untaughtNew(tw, me, 'quiero intentar', 'quiero intentarme'), []);
});

test('gates: one English over two Spanish is refused; two Englishes over one Spanish is only noted', () => {
  const L = (seed, idx, known, target) => ({ lego_id: `S${String(seed).padStart(4, '0')}L${String(idx).padStart(2, '0')}`, seed_number: seed, lego_index: idx, known_text: known, target_text: target, type: 'A', components: null });
  const P = (id, role, known, target) => ({ id: `spa_for_eng:${id}`, phrase_role: role, known_text: known, target_text: target, seed_number: Number(id.slice(1, 5)), decomposition: null });
  const db = {
    seeds: [{ seed_number: 104, known_text: 's', target_text: 's', approved_at: '2026-10-01T00:00:00Z' }],
    legos: [L(104, 1, 'it is', 'es')],
    phrases: [
      P('S0104L01U01', 'use', "I think it's good", 'Pienso que es bueno'),  // → "Creo que es bueno", which U02 says for "I believe…": allowed
      P('S0104L01U02', 'use', "I believe it's good", 'Creo que es bueno'),
      P('S0104L01U03', 'use', "I think it's nice", 'Pienso que es agradable'), // → "Creo que es agradable" …
      P('S0104L01U14', 'use', "I think it's nice", 'Pienso que es agradable'), // … while this row is held as it is: one English, two Spanish
    ],
  };
  const decomposer = { decomposeAnchored: (t, _v, parent) => ({ kind: t.toLowerCase().includes(parent.target_text.toLowerCase()) ? 'exact' : 'error', blocks: [{ target: t }] }) };
  const p = plan(db, { decomposer, tw: { taughtWordKeys: () => new Set(), untaughtWords: () => [] } });
  assert.ok(p.go.some((g) => g.id === 'S0104L01U01'), 'two Englishes over one Spanish goes');
  assert.ok(p.notes.some((n) => n.id === 'S0104L01U01' && /allowed/.test(n.why)));
  assert.ok(p.skipped.some((s) => s.id === 'S0104L01U03' && /ZUT new clash: EN→2ES S0104L01U14/.test(s.why)));
  assert.deepStrictEqual(p.unapprove, [104]);
});

test('a LEGO whose target moves keeps its introduction: the same presentation clip is relinked in the same batch', () => {
  const p = { legoGo: [{ id: 'S0047L01', by: ['G1'], set: { target_text: 'creo que' }, before: { target_text: 'pienso que', presentation_audio_id: '2c305c43-0822-427e-b5a1-8773896ca374' } }], seedGo: [], go: [], unapprove: [] };
  const ops = editBatches(p).flatMap((b) => b.ops);
  assert.deepStrictEqual(ops.map((o) => o.op), ['lego.update', 'audio.link']);
  assert.deepStrictEqual({ slot: ops[1].slot, audio_id: ops[1].audio_id, lego_id: ops[1].lego_id }, { slot: 'presentation', audio_id: '2c305c43-0822-427e-b5a1-8773896ca374', lego_id: 'S0047L01' });
});
