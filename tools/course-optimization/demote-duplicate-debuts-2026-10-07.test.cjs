'use strict';
// Job #138 draft: a LEGO debuted twice keeps its EARLIER debut (round order) and the later one is planned is_new=false;
// a seed sentence whose only played home is the later basket is copied under the seed's last remaining new LEGO
// (canon P26); a later LEGO that is its seed's only debut, or whose earlier twin lacks audio, is held; Welsh is never
// planned; and once the plan is applied, a re-plan is empty.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./demote-duplicate-debuts-2026-10-07.cjs');

const n = (t) => t.toLowerCase().replace(/[.,!?]/g, '').trim();
const A = { known_audio_id: 'k', target1_audio_id: 't1', target2_audio_id: 't2' };
const L = (seed, idx, known, target, extra = {}) => ({ id: `id-${seed}-${idx}`, lego_id: `S${String(seed).padStart(4, '0')}L${String(idx).padStart(2, '0')}`,
  seed_number: seed, lego_index: idx, type: 'A', is_new: true, known_text: known, target_text: target, nk: n(known), nt: n(target), ...A, ...extra });
const P = (seed, idx, pos, role, known, target) => ({ id: `fra:S${String(seed).padStart(4, '0')}L${String(idx).padStart(2, '0')}${role === 'use' ? 'U' : 'B'}${String(pos).padStart(2, '0')}`,
  seed_number: seed, lego_index: idx, position: pos, phrase_role: role, known_text: known, target_text: target, pn: n(target), ...A });
const S = (known, target) => ({ known_text: known, target_text: target, sn: n(target) });

function course(code = 'fra_for_eng') {
  const legos = [
    L(2, 1, 'to explain', 'expliquer'),
    L(3, 1, 'bag', 'sac'),
    L(10, 1, 'to explain', 'expliquer'), L(10, 2, 'they want', 'ils veulent'),
    L(20, 1, 'bag', 'sac'), L(20, 2, 'big', 'grand', { is_new: false }),
  ];
  const phrases = [
    P(2, 1, 1, 'build', 'I want to explain', 'je veux expliquer'),
    P(3, 1, 1, 'use', 'my bag', 'mon sac'),
    P(10, 1, 1, 'build', 'to explain it', "l'expliquer"),
    P(10, 1, 2, 'use', 'they want to explain', 'ils veulent expliquer'),          // the seed sentence: only played home
    P(10, 2, 1, 'use', 'they want to eat', 'ils veulent manger'),
    P(20, 1, 1, 'use', 'a big bag', 'un grand sac'),
  ];
  const seeds = new Map([[10, S('they want to explain', 'ils veulent expliquer')], [20, S('a big bag', 'un grand sac')]]);
  return { course: code, legos, order: new Map(), woven: false, phrases, seeds };
}

test('the later duplicate is demoted, its seed sentence copied under the seed\'s last new LEGO; a sole-debut seed is held', () => {
  const p = T.planCourse(course());
  assert.deepStrictEqual(p.demote.map((d) => [d.lego_id, d.keep]), [['S0010L01', 'S0002L01']]);
  assert.deepStrictEqual(p.copies.map((c) => [c.id, c.home.lego_id, c.src.target_text, c.position]), [['fra_for_eng:S0010L02U02', 'S0010L02', 'ils veulent expliquer', 2]]);
  assert.match(p.held[0].why.join(' '), /HELD-SOLE-DEBUT: S0020L01/);
});

test('once applied (flag flipped, sentence copied), a re-plan finds nothing more to do', () => {
  const c = course();
  c.legos.find((l) => l.lego_id === 'S0010L01').is_new = false;
  c.phrases.push(P(10, 2, 2, 'use', 'they want to explain', 'ils veulent expliquer'));
  const p = T.planCourse(c);
  assert.strictEqual(p.demote.length, 0);
  assert.strictEqual(p.copies.length, 0);
});

test('in a woven course the EARLIER ROUND is kept, whatever the seed number', () => {
  const c = course();
  c.woven = true;
  c.order = new Map([[10, 1], [2, 2], [3, 3], [20, 4]]);     // seed 10 plays first
  c.legos.push(L(2, 2, 'now', 'maintenant'));                 // seed 2 keeps a debut of its own
  const p = T.planCourse(c);
  assert.deepStrictEqual(p.demote.map((d) => [d.lego_id, d.keep]), [['S0002L01', 'S0010L01']]);
});

test('an earlier twin missing a clip, and any Welsh course, are held — never planned', () => {
  const c = course();
  c.legos.find((l) => l.lego_id === 'S0002L01').target2_audio_id = null;
  assert.strictEqual(T.planCourse(c).demote.length, 0);
  const w = T.planCourse(course('cym_s_for_eng'));
  assert.strictEqual(w.demote.length, 0);
  assert.ok(w.held.every((h) => h.why.some((y) => /Welsh/.test(y))));
});

test('APPLY\'s drift check notices a changed copy source even when every id is unchanged', () => {
  const a = T.canonical(T.planCourse(course()));
  const c = course();
  c.phrases.find((p) => p.id === 'fra:S0010L01U02').target1_audio_id = 'other-clip';
  assert.notStrictEqual(T.canonical(T.planCourse(c)), a);
  assert.strictEqual(T.canonical(T.planCourse(course())), a);
});
