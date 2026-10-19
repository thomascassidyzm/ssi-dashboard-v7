#!/usr/bin/env node
'use strict';
// tools/qa/quality-census/calibrate.cjs — does each check catch what it is meant to catch, ON THE REAL COURSE?
//
// Two kinds of evidence, kept apart (Kai: "a nonsense control proves the harness, never your spelling"):
//   KNOWN POSITIVES  past states of the course a person fixed (known-positives.cjs), put back into a COPY of a live
//                    snapshot. The check passes if the replayed rows appear among its hits and did not before.
//   NONSENSE CONTROL one absurd planted row per check on a seed number the course does not use. It proves only that
//                    the wiring reads the field it should; a check that misses its own plant is broken.
// Plus RECALL against the phrase-quality lane: the 77 rows the lane's readers confirmed BAD on seeds 1–100 are put
// back and counted against every check, so the report can say how much of the real defect load these checks see.
//
//   node tools/qa/quality-census/calibrate.cjs <snapshot.json> [--out file.json]
// Read-only: works on a copy in memory; the snapshot comes from snapshot.cjs.

const fs = require('fs');
const { CHECKS } = require('./checks.cjs');
const KP = require('./known-positives.cjs');

const clone = (s) => JSON.parse(JSON.stringify(s));
const pid = (snap, sid) => `${snap.course}:${sid}`;
const keyOf = (h) => `${h.ref}|${h.why}`;
function phraseRow(snap, sid, seed, idx, role, known, target, extra = {}) {
  return { id: pid(snap, sid), course_code: snap.course, seed_number: seed, lego_index: idx, position: 99, phrase_role: role, known_text: known, target_text: target, metadata: {}, ...extra };
}
function setPhrase(snap, sid, known, target, fallback) {
  const p = snap.phrases.find((x) => x.id === pid(snap, sid));
  if (p) { p.known_text = known; p.target_text = target; return 'restored'; }
  snap.phrases.push(phraseRow(snap, sid, fallback.seed, fallback.idx, fallback.role, known, target));
  return 'added';
}
function newHits(check, base, mod) {
  const seen = new Set(check.run(base).map(keyOf));
  return check.run(mod).filter((h) => !seen.has(keyOf(h)));
}
const refsHit = (hits, refs) => refs.filter((r) => hits.some((h) => h.ref === r || (h.group || []).some((g) => g.ref === r)));

// ── known positives: each returns { check, what, source, expected[], found[] } ──────────────────────────────────
const SCENARIOS = [
  { check: 'DUP', what: 'six later LEGOs re-marked new (both sides match an earlier new LEGO)', source: '#639·I, 2026-09-28',
    apply: (s) => { for (const [later] of KP.DUPLICATES_639) s.legos.find((l) => l.lego_id === later).is_new = true; return KP.DUPLICATES_639.map(([l]) => l); } },
  { check: 'C10', what: 'one English prompt over potrebbe / poteva', source: '#865·I, 2026-09-29',
    apply: (s) => { for (const [sid, k, t] of KP.ZUT_865) setPhrase(s, sid, k, t, {}); return KP.ZUT_865.map(([sid]) => sid); } },
  { check: 'C13', what: 'capital-initial Italian row on a lowercase course', source: '#883·I, 2026-09-29',
    apply: (s) => { s.phrases.push(phraseRow(s, 'S0082L02U99', 82, 2, 'use', ...KP.CAPITALS_883[0])); return ['S0082L02U99']; } },
  { check: 'C16', what: 'a new LEGO left with BUILD rows and no USE', source: 'canon P30 specimen (#887·I / #906)',
    apply: (s) => { s.phrases = s.phrases.filter((p) => !(p.id.startsWith(pid(s, KP.NO_USE_887)) && p.phrase_role === 'use')); return [KP.NO_USE_887]; } },
  { check: 'C17', what: 'indicative after "penso che"', source: 'phrase-quality lane, ita_for_jpn job 967',
    apply: (s) => KP.SUBJUNCTIVE_967.map(([k, t], i) => { const sid = `S0049L02U9${i}`; s.phrases.push(phraseRow(s, sid, 49, 2, 'use', k, t)); return sid; }) },
  { check: 'C01', what: 'bracketed tag on a tile gloss', source: '#881 (cat_for_eng, K42)',
    apply: (s) => { const l = s.legos.find((x) => x.type === 'M' && Array.isArray(x.components) && x.components.length); l.components = [...l.components, { known: KP.TAG_881[0], target: KP.TAG_881[1] }]; return [`${l.lego_id}T${l.components.length}`]; } },
  { check: 'P26', what: 'a seed sentence removed from every played basket', source: 'P26 / #635·I',
    apply: (s) => { const seed = s.seeds.find((x) => x.seed_number === 100); const norm = (t) => String(t).toLowerCase().replace(/[^\p{L}\p{N}']+/gu, ' ').trim();
      s.phrases = s.phrases.filter((p) => !(norm(p.known_text) === norm(seed.known_text) && norm(p.target_text) === norm(seed.target_text))); return [seed.seed_id]; } },
];

// ── nonsense controls: one planted row per check, seed 9990+ ─────────────────────────────────────────────────────
function plantAll(s) {
  const seed = 9990;
  const lego = { lego_id: 'S9990L01', seed_number: seed, lego_index: 1, type: 'M', is_new: true, known_text: 'zorp the flange', target_text: 'zorp il flangia', components: [{ known: 'zorp', target: 'zorp' }, { known: 'the flange', target: 'il flangia' }] };
  s.seeds.push({ seed_number: seed, seed_id: 'S9990', known_text: 'zorp the flange', target_text: 'zorp il flangia' });
  s.legos.push(lego);
  const p = (sid, role, k, t) => s.phrases.push(phraseRow(s, sid, seed, 1, role, k, t));
  const plants = {
    C01: ['S9990L01U01', 'use', 'zorp (plural) the flange', 'zorp il flangia'],
    C02: ['S9990L01U02', 'use', 'zorp the flange/widget', 'zorp il flangia'],
    C03: ['S9990L01U03', 'use', 'zorp the flange я', 'zorp il flangia'],
    C04: ['S9990L01U04', 'use', 'zorp the flange', 'zorp il флангия'],
    C05: ['S9990L01U05', 'use', 'zorp the flange? zorp it again', 'zorp il flangia? zorp ancora'],
    C06: ['S9990L01U06', 'use', '?!', '...'],
    C07: ['S9990L01U07', 'use', '"zorp the flange"', '"zorp il flangia"'],
    C08: ['S9990L01U08', 'use', 'zorp the flange.', 'zorp il flangia.'],
    C09: ['S9990L01U09', 'use', 'i zorp the flange', 'zorpo il flangia'],
    C10: ['S9990L01U10', 'use', 'zorp the flange', 'zarp la flangia'],
    C13: ['S9990L01U11', 'use', 'zorp the flange often', 'Zorpo spesso il flangia'],
    C15: ['S9990L01U12', 'use', 'zorp the widget now', 'zorp the widget now'],
    C17: ['S9990L01U13', 'use', 'I think he zorps', 'penso che fa zorp'],
    LEN: ['S9990L01U14', 'use', 'zorp the flange tomorrow morning with all of my very best friends from school', 'zorp'],
  };
  for (const [, v] of Object.entries(plants)) p(...v);
  // C16: a second new LEGO with nothing under it; DUP: a third that repeats the first LEGO's pair
  s.legos.push({ lego_id: 'S9991L01', seed_number: 9991, lego_index: 1, type: 'A', is_new: true, known_text: 'blarg', target_text: 'blargo', components: null });
  s.legos.push({ lego_id: 'S9992L01', seed_number: 9992, lego_index: 1, type: 'M', is_new: true, known_text: 'zorp the flange', target_text: 'zorp il flangia', components: null });
  s.seeds.push({ seed_number: 9991, seed_id: 'S9991', known_text: 'blarg', target_text: 'blargo' }, { seed_number: 9992, seed_id: 'S9992', known_text: 'zorp the flange', target_text: 'zorp il flangia' });
  const refs = Object.fromEntries(Object.entries(plants).map(([c, v]) => [c, v[0]]));
  return { ...refs, C16: 'S9991L01', DUP: 'S9992L01', P26: 'S9991', C08: refs.C08 };
}

function calibrate(snap) {
  const byId = Object.fromEntries(CHECKS.map((c) => [c.id, c]));
  const known = SCENARIOS.map((sc) => {
    const mod = clone(snap);
    const expected = sc.apply(mod);
    const found = refsHit(newHits(byId[sc.check], snap, mod), expected);
    return { check: sc.check, what: sc.what, source: sc.source, expected, found, caught: found.length === expected.length };
  });
  const mod = clone(snap); const plants = plantAll(mod);
  const nonsense = CHECKS.map((c) => { const ref = plants[c.id]; if (!ref) return { check: c.id, planted: null, caught: null }; const hits = newHits(c, snap, mod); return { check: c.id, planted: ref, caught: refsHit(hits, [ref]).length === 1 }; });
  // lane recall
  const lane = clone(snap); const laneRefs = [];
  for (const [sid, seed, idx, role, k, t] of KP.LANE_BAD) { setPhrase(lane, sid, k, t, { seed, idx, role }); laneRefs.push(sid); }
  const recall = CHECKS.map((c) => { const hits = newHits(c, snap, lane); const got = refsHit(hits, laneRefs); return { check: c.id, caught: got.length, of: laneRefs.length, refs: got }; });
  const classes = {}; for (const r of KP.LANE_BAD) classes[r[6]] = (classes[r[6]] || 0) + 1;
  const anyCaught = new Set(recall.flatMap((r) => r.refs));
  return { known, nonsense, recall, lane: { rows: laneRefs.length, classes, caughtByAny: anyCaught.size, caughtRefs: [...anyCaught] } };
}

module.exports = { calibrate, plantAll, SCENARIOS };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('usage: calibrate.cjs <snapshot.json> [--out f]'); process.exit(64); }
  const res = calibrate(JSON.parse(fs.readFileSync(file, 'utf8')));
  const i = process.argv.indexOf('--out'); if (i > 0) fs.writeFileSync(process.argv[i + 1], JSON.stringify(res, null, 1));
  console.log('KNOWN POSITIVES'); for (const k of res.known) console.log(`  ${k.check.padEnd(4)} ${k.caught ? 'CAUGHT' : 'MISSED'} ${k.found.length}/${k.expected.length}  ${k.what} (${k.source})`);
  console.log('NONSENSE CONTROLS'); for (const n of res.nonsense) console.log(`  ${n.check.padEnd(4)} ${n.planted ? (n.caught ? 'caught' : 'MISSED') : '—'} ${n.planted || ''}`);
  console.log(`LANE RECALL (${res.lane.rows} hand-confirmed bad rows, seeds 1–100; any check: ${res.lane.caughtByAny})`); for (const r of res.recall) if (r.caught) console.log(`  ${r.check.padEnd(4)} ${r.caught}  ${r.refs.join(' ')}`);
  { const own = new Set(KP.CONTAINMENT_LANE.map((r) => r[0])); const got = (res.recall.find((r) => r.check === 'P17') || { refs: [] }).refs.filter((r) => own.has(r)); console.log(`  P17 on the lane's ${own.size} Containment-class rows: ${got.length} caught; missed: ${[...own].filter((r) => !got.includes(r)).join(' ') || 'none'}`); }
  console.log('  lane classes:', JSON.stringify(res.lane.classes));
}
