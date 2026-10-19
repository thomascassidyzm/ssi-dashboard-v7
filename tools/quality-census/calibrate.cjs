#!/usr/bin/env node
'use strict';
// tools/quality-census/calibrate.cjs — prove each check can find its defect IN THIS COURSE'S OWN STYLE, then report
// the hand-read precision the census multiplies hits by.
//
// Two controls, because a zero proves nothing on its own (Kai's memory: "a zero is a claim about your query first"):
//   1. CANARIES (positive control). For each check, take a REAL row of the course and plant the defect in it
//      (a bracket tag, Italian on the English side, a seed copy edited by one word…). The check must report the
//      canary. A check that returns 0 on the course AND catches its canary has earned its zero.
//   2. NONSENSE (harness control). Shuffle the target side across the course's played rows so no pair means the
//      same thing. Checks that read meaning (content mismatch, ZUT, seed placement) must explode; a check that
//      stays flat is not reading what it claims to.
//
//   node tools/quality-census/calibrate.cjs ita_for_eng [--offline raw.json]
//
// PRECISION below is the hand-read on ita_for_eng, 2026-10-19, job #239·T: every hit read in full (no sampling —
// all hit lists were small enough), judged against course-methodology-canon.md and Kai's rulings.
const { load } = require('./load.cjs');
const C = require('./checks.cjs');

const PRECISION = {
  // id: { read, real, verdict, note } — verdict: trusted | reading-list | not-trusted | question
  parentheticals: { read: 0, real: 0, verdict: 'trusted', note: '0 hits; canary caught; content door refuses brackets since #486' },
  slashes: { read: 0, real: 0, verdict: 'trusted', note: '0 hits; canary caught' },
  'wrong-language': { read: 0, real: 0, verdict: 'trusted', note: '0 hits; canaries on both sides caught' },
  'multi-sentence': { read: 16, real: 6, verdict: 'trusted', note: '16 of 16 truly two sentences. 6 are builder-made dialogues on one-sentence seeds (264-266 "who was that? An old man", 626) = real P20 defects. 10 come from the two-sentence SEEDS 82 and 141 (the seeds, their P26 copies, six "… Why not?" rows modelled on 82) — Kai question: are those defects?' },
  unpronounceable: { read: 0, real: 0, verdict: 'trusted', note: '0 hits; canary caught' },
  'wrapping-quotes': { read: 0, real: 0, verdict: 'trusted', note: '0 hits; canary caught' },
  'trailing-period': { read: 0, real: 0, verdict: 'trusted', note: 'informational only: canon A7 says a full stop makes no difference' },
  'lowercase-i': { read: 0, real: 0, verdict: 'trusted', note: '0 hits; canary caught' },
  'zut-lego': { read: 6, real: 2, verdict: 'trusted', note: '3 groups: "it was" and "anywhere" are K23-explained in their intros (sub k23-explained); 72/655 tu / no-tu is the real one (open in K38). Count conflicts only.' },
  capitalisation: { read: 94, real: 94, verdict: 'trusted', note: 'every hit is a real inconsistency: known-side capital-initial seeds/rows on a lowercase course — the class Kai approved fixing on the target side (#883·I/#884·I). Cosmetic; never blocks.' },
  identical: { read: 7, real: 0, verdict: 'trusted', note: 'first run 7 hits all false (6 × in|in, Africa); fixed, now 0; canary caught' },
  underpopulated: { read: 3, real: 3, verdict: 'trusted', note: 'S0001L02 (BUILD-only, Tom: report, not block), S0001L03 1 use, S0053L02 to put 4 build 0 use — all real, all SOFT' },
  'ita-subjunctive': { read: 9, real: 0, verdict: 'trusted', note: 'first run with 1pl/2sg forms: 9 of 9 false (siamo/abbiamo are also subjunctive; relative-clause verbs). Recipe list: 0 hits; canary caught' },
  'duplicate-lego': { read: 2, real: 0, verdict: 'trusted', note: 'repeat-debut 0 (agrees with the debut tool). orphan-not-new 2 (246 L02, 609 L02) are both Kai-ruled not-new (#618·I, #590·I): reading list, not defects' },
  'content-mismatch': { read: 29, real: 0, verdict: 'not-trusted', note: 'HIGH band 0 of 29 real (stasera/this evening, da qualche parte/anywhere…). Word-count gap (#118·T rule) 1,235 candidates, top 80 read, 1 real (an adverb dropped). Neither is a counter for Italian.' },
  'seed-placement': { read: 36, real: 29, verdict: 'trusted', note: 'missing 8 real; drifted 22, of which 17 real and 5 trivial (that-drop K30 ×2, cosa/che cosa, word order, about it/that); early 4 real (#363 held them for Kai); no-home 2 = seeds with no new LEGO, which P26 says are LISTED — not defects' },
};

function plant(c) {
  // Canaries are REAL rows of this course with the defect planted, so the check meets the course's own spelling.
  const x = JSON.parse(JSON.stringify(c));
  const use = x.phrases.filter((p) => p.phrase_role === 'use' && p.lego_is_new);
  const pick = (i) => use[Math.floor((use.length * i) / 20)];
  const canary = {};
  const mark = (id, row, f) => { f(row); row.id = `CANARY:${id}`; canary[id] = row.id; };
  mark('parentheticals', pick(1), (r) => { r.known_text += ' (formal)'; });
  mark('slashes', pick(2), (r) => { r.known_text = r.known_text.replace(/\b(\w+)\b/, '$1/$1s'); });
  mark('wrong-language', pick(3), (r) => { r.known_text = r.target_text; r.target_text += ' adesso'; });
  mark('multi-sentence', pick(4), (r) => { r.known_text += '. Why not?'; });
  mark('unpronounceable', pick(5), (r) => { r.target_text = '...'; });
  mark('wrapping-quotes', pick(6), (r) => { r.known_text = `"${r.known_text}"`; });
  mark('trailing-period', pick(7), (r) => { r.target_text += '.'; });
  mark('lowercase-i', pick(8), (r) => { r.known_text = `i think ${r.known_text}`; });
  mark('capitalisation', pick(9), (r) => { r.target_text = r.target_text[0].toUpperCase() + r.target_text.slice(1); });
  mark('identical', pick(10), (r) => { r.target_text = r.known_text; });
  mark('ita-subjunctive', pick(11), (r) => { r.known_text = "I think he's right"; r.target_text = 'penso che lui ha ragione'; });
  // LEGO-level canaries: a ZUT twin, a repeat debut, an emptied debut
  const l0 = x.legos.find((l) => l.is_new !== false && l.seed_number > 100);
  x.legos.push({ ...l0, lego_id: 'CANARY:zut-lego', seed_number: l0.seed_number + 1, lego_index: 9, target_text: `${l0.target_text} subito` });
  canary['zut-lego'] = 'CANARY:zut-lego';
  const l1 = x.legos.find((l) => l.is_new !== false && l.seed_number > 200);
  x.legos.push({ ...l1, lego_id: 'CANARY:duplicate-lego', seed_number: l1.seed_number + 1, lego_index: 9 });
  canary['duplicate-lego'] = 'CANARY:duplicate-lego';
  const l2 = x.legos.find((l) => l.is_new !== false && l.seed_number > 300);
  x.phrases = x.phrases.filter((p) => p.lego_id !== l2.lego_id || p.phrase_role === 'component');
  canary.underpopulated = l2.lego_id;
  // seed placement: edit the played copy of a placed seed by one word (the 451 shape)
  const s = x.seeds.find((sd) => sd.seed_number > 400 && x.phrases.some((p) => p.lego_is_new && C.norm(p.known_text) === C.norm(sd.known_text) && C.norm(p.target_text) === C.norm(sd.target_text)));
  for (const p of x.phrases) if (C.norm(p.known_text) === C.norm(s.known_text) && C.norm(p.target_text) === C.norm(s.target_text)) p.target_text += ' adesso';
  canary['seed-placement'] = s.seed_id || `S${String(s.seed_number).padStart(4, '0')}`;
  return { course: x, canary };
}

function shuffleTargets(c) {
  const x = JSON.parse(JSON.stringify(c));
  const played = x.phrases.filter((p) => p.phrase_role !== 'component');
  const t = played.map((p) => p.target_text);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = t.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [t[i], t[j]] = [t[j], t[i]]; }
  played.forEach((p, i) => { p.target_text = t[i]; });
  const lt = x.legos.map((l) => l.target_text);
  for (let i = lt.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [lt[i], lt[j]] = [lt[j], lt[i]]; }
  x.legos.forEach((l, i) => { l.target_text = lt[i]; });
  return x;
}

// Content-mismatch recall: drop the last clause (last third of the words) from the target of 20 long real rows.
function truncationRecall(c) {
  const x = JSON.parse(JSON.stringify(c));
  const long = x.phrases.filter((p) => p.phrase_role === 'use' && p.lego_is_new && C.words(p.target_text).length >= 9);
  const ids = [];
  for (let i = 0; i < 20; i++) { const p = long[Math.floor((long.length * i) / 20)]; const w = p.target_text.split(/\s+/); p.target_text = w.slice(0, Math.ceil(w.length * 0.66)).join(' '); p.id = `TRUNC:${i}`; ids.push(p.id); }
  const hits = new Set(C.contentMismatch(x).map((h) => h.ref));
  return { planted: 20, caught: ids.filter((id) => hits.has(id)).length };
}

async function main() {
  const argv = process.argv.slice(2);
  const code = argv[0] || 'ita_for_eng';
  const i = argv.indexOf('--offline');
  const course = await load(code, { offline: i > -1 ? argv[i + 1] : null });
  const base = Object.fromEntries(C.CHECKS.map((ch) => [ch.id, ch.run(course).length]));
  const { course: planted, canary } = plant(course);
  const nonsense = shuffleTargets(course);
  console.log(`check\tlive hits\tcanary caught\tshuffled-course hits\tprecision (hand-read)\tverdict`);
  for (const ch of C.CHECKS) {
    let caught = '—';
    if (canary[ch.id]) caught = ch.run(planted).some((h) => h.ref === canary[ch.id]) ? 'yes' : 'NO';
    const shuffled = ch.run(nonsense).length;
    const p = PRECISION[ch.id];
    const prec = p.read ? `${p.real}/${p.read}` : 'n/a (0 hits)';
    console.log(`${ch.id}\t${base[ch.id]}\t${caught}\t${shuffled}\t${prec}\t${p.verdict}`);
  }
  const r = truncationRecall(course);
  console.log(`\ncontent-mismatch recall on planted truncations: ${r.caught}/${r.planted}`);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { PRECISION, plant, shuffleTargets, truncationRecall };
