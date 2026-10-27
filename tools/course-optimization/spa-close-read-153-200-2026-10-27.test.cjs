'use strict';
// node --test tools/course-optimization/spa-close-read-153-200-2026-10-27.test.cjs
// The gates of the job #99 apply tool, on a hand-built course: a fix goes only when the row still reads as the report
// read it, its LEGO is still held (K49 reorder counts), no new ZUT clash appears either way, and a delete keeps the floor.
const test = require('node:test');
const assert = require('node:assert');
const { plan, editOps, clipAsks, holdsInOrder, existingClipOf } = require('./spa-close-read-153-200-2026-10-27.cjs');

const L = (seed, idx, known, target) => ({ lego_id: `S${String(seed).padStart(4, '0')}L${String(idx).padStart(2, '0')}`, seed_number: seed, lego_index: idx, known_text: known, target_text: target, is_new: true });
const P = (id, role, known, target, extra = {}) => ({ id: `spa_for_eng:${id}`, phrase_role: role, known_text: known, target_text: target, seed_number: Number(id.slice(1, 5)), lego_index: Number(id.slice(6, 8)), ...extra });

// Fake decomposer: the LEGO is held when its Spanish appears as whole words. Fake taught-words: everything is taught.
const decomposer = { decomposeAnchored: (t, _v, parent) => ({ kind: holdsInOrder(t, parent.target_text) ? 'exact' : 'error', blocks: [{ target: t }] }) };
const tw = { taughtWordKeys: () => new Set(), untaughtWords: () => [] };

function course(rows) {
  return {
    seeds: [{ seed_number: 153, known_text: 'x', target_text: 'x', approved_at: '2026-10-01T00:00:00Z' }, { seed_number: 163, known_text: 'y', target_text: 'y', approved_at: null }],
    legos: [L(153, 1, 'said', 'dicho'), L(163, 2, 'interesting', 'interesante'), L(163, 1, 'that', 'que')],
    phrases: rows,
  };
}
const base = () => [
  P('S0153L01U02', 'use', 'I think I have said a lot in a very short time', 'Pienso que he dicho mucho en poco tiempo'),
  P('S0153L01U04', 'use', "I don't think I have said it very well", 'No lo he dicho bien'),
  P('S0163L02B05', 'build', 'It was very interesting', 'Eso fue muy interesante'),
  P('S0163L01U10', 'use', "I think that let's talk about that carefully before doing anything", 'Creo que hablemos de eso con cuidado antes de hacer algo'),
  ...[1, 2, 3, 4, 5].map((i) => P(`S0163L01U9${i}`, 'use', `filler ${i} that`, `relleno ${i} que`)),
];

test('a clean fix goes, with its clips and the seed unapproved (O5)', () => {
  const p = plan(course(base()), { only: 'mismatch', decomposer, tw });
  const ids = p.go.map((g) => g.id);
  assert.ok(ids.includes('S0153L01U02') && ids.includes('S0153L01U04'));
  assert.deepStrictEqual(p.unapprove.map((s) => s.seed_number), [153]);
  const u04 = p.go.find((g) => g.id === 'S0153L01U04');
  assert.deepStrictEqual(Object.keys(u04.set).sort(), ['decomposition', 'known_text', 'target_text', 'word_count']);
  const asks = clipAsks({ go: [u04] });
  assert.deepStrictEqual(asks.map((a) => a.role).sort(), ['known', 'target1', 'target2']);
  const clips = new Map(asks.map((a) => [`${a.role}\u0000${a.text}`, `id-${a.role}`]));
  const ops = editOps({ go: [u04], unapprove: [] }, clips);
  assert.strictEqual(ops[0].op, 'phrase.update');
  assert.deepStrictEqual(ops[0].expect, { known_text: "I don't think I have said it very well", target_text: 'No lo he dicho bien' });
  assert.deepStrictEqual(ops.slice(1).map((o) => o.slot), ['known', 'target1', 'target2']);
});

test('a row that moved since the report is skipped, never forced', () => {
  const rows = base(); rows[0] = { ...rows[0], target_text: 'Pienso que he dicho mucho en muy poco tiempo' };
  const p = plan(course(rows), { only: 'mismatch', decomposer, tw });
  assert.ok(p.skipped.some((s) => s.id === 'S0153L01U02' && /^drift/.test(s.why)));
});

test('a fix that makes one Spanish carry two Englishes is held (ZUT, both ways)', () => {
  const rows = [...base(), P('S0219L01U01', 'use', 'It was very interesting', 'Eso fue muy interesante')];
  const p = plan(course(rows), { only: 'mismatch', decomposer, tw });
  assert.ok(p.skipped.some((s) => s.id === 'S0163L02B05' && /ZUT new clash/.test(s.why)));
});

test('K49: a reordered LEGO is still held; a dropped LEGO word is not', () => {
  assert.ok(holdsInOrder('If you have heard something new', 'have you heard'));
  assert.ok(!holdsInOrder('I do what I can', 'I make'));
});

test('a delete that would take the basket under 4 USE is held', () => {
  const thin = base().filter((r) => !/U9[2-5]$/.test(r.id));
  const p = plan(course(thin), { only: 'delete', decomposer, tw });
  assert.ok(p.skipped.some((s) => s.id === 'S0163L01U10' && /^floor/.test(s.why)));
  const full = plan(course(base()), { only: 'delete', decomposer, tw });
  assert.ok(full.go.some((g) => g.id === 'S0163L01U10' && g.kind === 'delete'));
});

test('a re-record refusal names the clip that already speaks the words, and that clip is used', () => {
  const msg = 'TTS door (403) RERECORD_NOT_PERMITTED: spa_for_eng target1 "Asegurarse de que va a funcionar" already has a working clip (35a79da3-d084-4254-96b3-50c9cd092581 in es-ES-ElviraNeural). Re-recording needs';
  assert.deepStrictEqual(existingClipOf(msg), { audioId: '35a79da3-d084-4254-96b3-50c9cd092581', voiceId: 'es-ES-ElviraNeural' });
  assert.strictEqual(existingClipOf('some other refusal'), null);
});
