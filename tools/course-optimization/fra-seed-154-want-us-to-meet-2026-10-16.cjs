#!/usr/bin/env node
'use strict';
// tools/course-optimization/fra-seed-154-want-us-to-meet-2026-10-16.cjs  (job #188)
//
// KAI'S RULING, 2026-10-16: fra_for_eng seed 154 keeps its French exactly (Deborah approved it) —
//   "où voulez-vous nous rencontrer samedi soir?"
// and its English becomes "where do you want us to meet on Saturday night?" (speaker AND listener meeting; the "nous"
// is the reflexive that S0018L02 "we want to meet | nous voulons nous rencontrer" already teaches). The seed had NO
// LEGO for "nous rencontrer": it leaned on the old S0018L02 (held in job #449). A new LEGO takes it:
//   S0154L03  "do you want us to meet | voulez-vous nous rencontrer"   (M; tiles do you want / us / meet)
// "us to meet" cannot stand alone, so the LEGO grows to take its "do you want" (K40/L29); it overlaps S0154L01
// "where do you want | où voulez-vous" — the K39 shape (the A-LEGO L01 is taught first, L13). It is inserted as lego_index 3
// (index 2 is "on Saturday"); the seed sentence and the "us to meet" drills live in ITS basket (P25: it is new).
//
// PHRASES. The five twins say "meet" over "nous rencontrer"; each becomes "… want us to meet …" (same French):
//   S0154L01U07 / S0154L02U09 sit under LEGOs taught BEFORE the new one, so "us to meet" would be untaught there:
//   they are rewritten to a "go" drill (same slot, same frame) and the meeting rows are re-made under L03.
//   S0155L03U07 / S0156L02U06 / S0157L03U07 come after L03 and only need the English fixed.
//
// Writes go ONLY through Popty's edit-batch door; audio ONLY through tools/audio/render.cjs (POST /api/audio/render).
//
//   node tools/course-optimization/fra-seed-154-want-us-to-meet-2026-10-16.cjs check <dump.json>
//   node ... ops <dump.json> --out ops.json                       # text edits
//   node ... renders <dump.json> [--apply] --out map.json         # needed clips (dry run unless --apply)
//   node ... links <dump.json> --audio map.json --out links.json  # audio.link ops

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const JOB = '#188';
const COURSE = 'fra_for_eng';
const P = (s) => `${COURSE}:${s}`;
const SEED = 154;
const NEW_SEED_KNOWN = 'where do you want us to meet on Saturday night?';

const LEGO = {
  id: 'S0154L03', index: 3, round: 399,
  known: 'do you want us to meet', target: 'voulez-vous nous rencontrer',
  components: [{ known: 'do you want', target: 'voulez-vous' }, { known: 'us', target: 'nous' }, { known: 'meet', target: 'rencontrer' }],
  intro: "The French for: 'do you want us to meet', is:",
};
// L02's intro quotes the seed ("as in —"); it must follow the seed (presentations mirror the LEGO/seed).
const L02_INTRO = { lego_id: 'S0154L02', old: "The French for: 'on Saturday', as in — 'where do you want to meet on Saturday night?', is:",
  text: "The French for: 'on Saturday', as in — 'where do you want us to meet on Saturday night?', is:" };

// [id, from known, from target, to known, to target]
const REWRITES = [
  ['S0154L01U07', 'where do you want to meet?', 'où voulez-vous nous rencontrer?', 'where do you want to go today?', "où voulez-vous aller aujourd'hui?"],
  ['S0154L02U09', 'where do you want to meet on Saturday night?', 'où voulez-vous nous rencontrer samedi soir?', 'where do you want to go on Saturday night?', 'où voulez-vous aller samedi soir?'],
  ['S0155L03U07', 'where do you want to meet tomorrow morning?', 'où voulez-vous nous rencontrer demain matin?', 'where do you want us to meet tomorrow morning?', 'où voulez-vous nous rencontrer demain matin?'],
  ['S0156L02U06', 'where do you want to meet tonight?', 'où voulez-vous nous rencontrer ce soir?', 'where do you want us to meet tonight?', 'où voulez-vous nous rencontrer ce soir?'],
  ['S0157L03U07', 'where do you want to meet next month?', 'où voulez-vous nous rencontrer le mois prochain?', 'where do you want us to meet next month?', 'où voulez-vous nous rencontrer le mois prochain?'],
];
// New basket of S0154L03 [suffix, role, known, target]. The seed sentence is U08 (P26).
const BASKET = [
  ['B01', 'build', 'do you want us to meet', 'voulez-vous nous rencontrer'],
  ['B02', 'build', 'do you want us to meet here', 'voulez-vous nous rencontrer ici'],
  ['B03', 'build', 'do you want us to meet today', "voulez-vous nous rencontrer aujourd'hui"],
  ['B04', 'build', 'do you want us to meet tomorrow', 'voulez-vous nous rencontrer demain'],
  ['U01', 'use', 'do you want us to meet now?', 'voulez-vous nous rencontrer maintenant?'],
  ['U02', 'use', 'where do you want us to meet?', 'où voulez-vous nous rencontrer?'],
  ['U03', 'use', 'do you want us to meet later on?', 'voulez-vous nous rencontrer plus tard?'],
  ['U04', 'use', 'why do you want us to meet?', 'pourquoi voulez-vous nous rencontrer?'],
  ['U05', 'use', 'do you want us to meet on Saturday?', 'voulez-vous nous rencontrer samedi?'],
  ['U06', 'use', 'do you want us to meet this evening?', 'voulez-vous nous rencontrer ce soir?'],
  ['U07', 'use', 'do you want us to meet at six o\'clock?', 'voulez-vous nous rencontrer à six heures?'],
  ['U08', 'use', NEW_SEED_KNOWN, 'où voulez-vous nous rencontrer samedi soir?'],
];

// ── checks ──
const norm = (s) => String(s || '').toLowerCase().replace(/[’]/g, "'").replace(/\b(qu|j|l|d|s|n|m|t|c)'/g, "$1' ")
  .replace(/[.,!?;:"«»“”¿¡]+/g, ' ').split(/\s+/).filter(Boolean);
const key = (s) => norm(s).join(' ');
function containsWords(hay, needle) {
  const h = norm(hay);
  for (const w of norm(needle)) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); }
  return true;
}
/** Words taught by LEGOs and components up to and including `round` (plus the new LEGO when round >= its own). */
function taught(dump, round, withNew) {
  const t = new Set(), k = new Set();
  const legos = [...dump.legos.filter((l) => l.round_index != null && l.round_index <= round)];
  if (withNew || round >= LEGO.round) legos.push({ known_text: LEGO.known, target_text: LEGO.target, components: LEGO.components });
  for (const l of legos) {
    norm(l.target_text).forEach((w) => t.add(w)); norm(l.known_text).forEach((w) => k.add(w));
    for (const c of l.components || []) { norm(c.target).forEach((w) => t.add(w)); norm(c.known).forEach((w) => k.add(w)); }
  }
  return { t, k };
}
const basketId = (suffix) => P(`${LEGO.id}${suffix}`);

function checkPlan(dump) {
  const problems = [];
  const seed = dump.seeds.find((s) => s.seed_number === SEED);
  if (!seed) return ['seed 154 not in dump'];
  if (seed.target_text !== 'où voulez-vous nous rencontrer samedi soir?') problems.push(`seed target drifted: ${seed.target_text}`);
  if (seed.known_text !== NEW_SEED_KNOWN && seed.known_text !== 'where do you want to meet on Saturday night?') problems.push(`seed known drifted: ${seed.known_text}`);
  if (dump.legos.some((l) => l.lego_id === LEGO.id)) problems.push(`${LEGO.id} already exists`);
  const l2 = dump.legos.find((l) => l.lego_id === 'S0154L02');
  if (!l2 || l2.round_index + 1 !== LEGO.round) problems.push(`S0154L02 round is ${l2 && l2.round_index}, expected ${LEGO.round - 1}`);
  // L26: LEGO words are the seed's own
  if (!containsWords(NEW_SEED_KNOWN, LEGO.known) || !containsWords(seed.target_text, LEGO.target)) problems.push('LEGO is not a slice of the seed (L26)');
  if (key(NEW_SEED_KNOWN).indexOf(key(LEGO.known)) < 0 || key(seed.target_text).indexOf(key(LEGO.target)) < 0) problems.push('LEGO is not contiguous in the seed');
  for (const [s, fk, ft] of REWRITES) {
    const p = dump.phrases.find((x) => x.id === P(s));
    if (!p) { problems.push(`${s} not in dump`); continue; }
    if (p.known_text !== fk || p.target_text !== ft) problems.push(`${s} drifted: "${p.known_text} | ${p.target_text}"`);
  }
  const rounds = new Map(dump.legos.map((l) => [`${l.seed_number}:${l.lego_index}`, l]));
  // every rewritten / new row: contains its LEGO (P17), no untaught word by its round, no ZUT with other rows
  const rows = [
    ...REWRITES.map(([s, , , k, t]) => ({ id: s, k, t, owner: rounds.get(`${Number(s.slice(1, 5))}:${Number(s.slice(6, 8))}`) })),
    ...BASKET.map(([s, , k, t]) => ({ id: LEGO.id + s, k, t, owner: { target_text: LEGO.target, round_index: LEGO.round } })),
  ];
  for (const r of rows) {
    if (!r.owner) { problems.push(`${r.id}: no owner LEGO`); continue; }
    if (!containsWords(r.t, r.owner.target_text)) problems.push(`${r.id}: "${r.t}" does not contain its LEGO "${r.owner.target_text}" (P17)`);
    // pre-shift rounds: an old round r >= 399 becomes r+1 once S0154L03 is inserted, so 'old <= r' + the new LEGO is exact
    const T = r.id.startsWith(LEGO.id) ? taught(dump, LEGO.round - 1, true) : taught(dump, r.owner.round_index);
    const ut = norm(r.t).filter((w) => !T.t.has(w)), uk = norm(r.k).filter((w) => !T.k.has(w));
    if (ut.length || uk.length) problems.push(`${r.id}: untaught by round ${r.owner.round_index}: ${[...ut, ...uk].join(',')}`);
  }
  // the 5 twins: French unchanged except the two re-made rows; English says "us to meet" where French says nous rencontrer
  for (const [s, , ft, k, t] of REWRITES.slice(2)) if (t !== ft || !/want us to meet/.test(k)) problems.push(`${s}: French must stay and English must be "want us to meet"`);
  // ZUT overlay: gather all non-component prompts after the plan
  const all = new Map();
  const add = (id, k, t) => { const kk = key(k); if (!all.has(kk)) all.set(kk, new Map()); all.get(kk).set(key(t), id); };
  const rw = new Map(REWRITES.map((r) => [P(r[0]), r]));
  for (const p of dump.phrases) if (p.phrase_role !== 'component') { const r = rw.get(p.id); add(p.id, r ? r[3] : p.known_text, r ? r[4] : p.target_text); }
  for (const l of dump.legos) add(l.lego_id, l.known_text, l.target_text);
  add(LEGO.id, LEGO.known, LEGO.target);
  for (const [s, , k, t] of BASKET) add(LEGO.id + s, k, t);
  add('seed154', NEW_SEED_KNOWN, 'où voulez-vous nous rencontrer samedi soir?');
  for (const k of [LEGO.known, NEW_SEED_KNOWN, ...BASKET.map((b) => b[2]), ...REWRITES.map((r) => r[3])])
    if (all.get(key(k)).size > 1) problems.push(`ZUT: "${k}" → ${[...all.get(key(k)).keys()].join(' / ')}`);
  // duplicates in the new basket
  const seen = new Set();
  for (const [s, , k, t] of BASKET) { const kk = key(k) + '|' + key(t); if (seen.has(kk)) problems.push(`${s} duplicates another row`); seen.add(kk); }
  return problems;
}

// ── edit-batch bodies ──
function phraseRow(dump, [suffix, role, known, target], i) {
  const id = basketId(suffix);
  return {
    id, course_code: COURSE, seed_number: SEED, lego_index: LEGO.index, lego_id: LEGO.id, position: i + 1,
    known_text: known, target_text: target, phrase_role: role, status: 'draft', introduce: true,
    lego_position: 'middle', connected_lego_ids: [],
    word_count: target.length, lego_count: norm(target).length,
    metadata: { job: JOB, format: 'build_use', source: 'fra-seed-154-want-us-to-meet-2026-10-16', ...(suffix === 'U08' ? { seed_sentence_of: SEED } : {}) },
  };
}
function textOps(dump) {
  const seed = dump.seeds.find((s) => s.seed_number === SEED);
  const l2 = dump.legos.find((l) => l.lego_id === 'S0154L02');
  const ops = [
    { op: 'seed.update', seed_number: SEED, expect: { known_text: seed.known_text }, set: { known_text: NEW_SEED_KNOWN, approved_at: null } },
    { op: 'lego.insert', row: { seed_number: SEED, lego_index: LEGO.index, type: 'M', is_new: true, known_text: LEGO.known, target_text: LEGO.target, components: LEGO.components, status: 'draft' } },
  ];
  for (const [s, fk, ft, k, t] of REWRITES) ops.push({ op: 'phrase.update', phrase_id: P(s), expect: { known_text: fk, target_text: ft }, set: { known_text: k, target_text: t } });
  BASKET.forEach((b, i) => ops.push({ op: 'phrase.insert', row: phraseRow(dump, b, i) }));
  void l2;
  return ops;
}
/** Clips each new/changed row needs, by role. Existing identical clips are reused library-first by the render route. */
function wanted() {
  const out = [{ role: 'known', text: NEW_SEED_KNOWN, seed: SEED }, { role: 'known', text: LEGO.known, lego: LEGO.id }, { role: 'target1', text: LEGO.target, lego: LEGO.id }, { role: 'target2', text: LEGO.target, lego: LEGO.id }];
  for (const [s, , , k, t] of REWRITES) for (const role of ['known', 'target1', 'target2']) out.push({ role, text: role === 'known' ? k : t, phrase: P(s) });
  for (const [s, , k, t] of BASKET) for (const role of ['known', 'target1', 'target2']) out.push({ role, text: role === 'known' ? k : t, phrase: basketId(s) });
  return out.filter((r, i, a) => a.findIndex((x) => x.role === r.role && x.text === r.text) === i);
}
function linkOps(map) {
  const g = (role, text) => map[`${role}|${text}`];
  const ops = [];
  const link = (target, idKey, id, role, text) => { const a = g(role, text); if (a) ops.push({ op: 'audio.link', target, [idKey]: id, slot: role, audio_id: a }); };
  link('seed', 'seed_number', SEED, 'known', NEW_SEED_KNOWN);
  link('lego', 'lego_id', LEGO.id, 'known', LEGO.known); link('lego', 'lego_id', LEGO.id, 'target1', LEGO.target); link('lego', 'lego_id', LEGO.id, 'target2', LEGO.target);
  const pres = g('presentation', LEGO.intro); if (pres) ops.push({ op: 'audio.link', target: 'lego', lego_id: LEGO.id, slot: 'presentation', audio_id: pres });
  const pres2 = g('presentation', L02_INTRO.text); if (pres2) ops.push({ op: 'audio.link', target: 'lego', lego_id: L02_INTRO.lego_id, slot: 'presentation', audio_id: pres2 });
  for (const [s, , , k, t] of REWRITES) { link('phrase', 'phrase_id', P(s), 'known', k); link('phrase', 'phrase_id', P(s), 'target1', t); link('phrase', 'phrase_id', P(s), 'target2', t); }
  for (const [s, , k, t] of BASKET) { link('phrase', 'phrase_id', basketId(s), 'known', k); link('phrase', 'phrase_id', basketId(s), 'target1', t); link('phrase', 'phrase_id', basketId(s), 'target2', t); }
  return ops;
}

module.exports = { LEGO, REWRITES, BASKET, NEW_SEED_KNOWN, checkPlan, textOps, wanted, linkOps, containsWords };

if (require.main === module) {
  const [cmd, dumpPath, ...rest] = process.argv.slice(2);
  const opt = (f) => { const i = rest.indexOf(f); return i >= 0 ? rest[i + 1] : undefined; };
  if (!cmd || !dumpPath) { console.error('usage: check|ops|renders|links <dump.json> [--audio map.json] [--out file] [--apply]'); process.exit(1); }
  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  if (cmd === 'check') {
    const pr = checkPlan(dump); console.log(pr.length ? pr.join('\n') : 'plan clean'); process.exit(pr.length ? 2 : 0);
  } else if (cmd === 'ops') {
    const ops = textOps(dump); fs.writeFileSync(opt('--out') || 'ops.json', JSON.stringify({ ops }, null, 1)); console.log(`${ops.length} text ops`);
  } else if (cmd === 'links') {
    const ops = linkOps(JSON.parse(fs.readFileSync(opt('--audio'), 'utf8'))); fs.writeFileSync(opt('--out') || 'links.json', JSON.stringify({ ops }, null, 1)); console.log(`${ops.length} audio links`);
  } else if (cmd === 'renders') {
    const apply = rest.includes('--apply');
    const reqs = wanted().filter((r) => r.lego === undefined || r.role === 'known' || true);
    reqs.push({ role: 'presentation', text: LEGO.intro, lego: LEGO.id }, { role: 'presentation', text: L02_INTRO.text, lego: L02_INTRO.lego_id });
    const map = {}; let chars = 0, refused = 0;
    for (const r of reqs) {
      const args = [path.join(__dirname, '..', 'audio', 'render.cjs'), '--course', COURSE, '--role', r.role, '--text', r.text, '--purpose', `${JOB} fra seed 154 want us to meet: ${r.lego || r.phrase || 'seed 154'}`, '--job', JOB];
      if (r.role === 'presentation') args.push('--lego', r.lego);
      if (!apply) args.push('--dry-run');
      const res = spawnSync('node', args, { encoding: 'utf8', env: { ...process.env, AGENT_ID: 'kai-watson-188' } });
      let out = {}; try { out = JSON.parse(res.stdout); } catch (_) { out = { ok: false, error: (res.stdout || res.stderr || '').slice(-300) }; }
      if (!out.ok) { refused++; console.log(`REFUSED ${r.role} "${r.text}": ${JSON.stringify(out).slice(0, 300)}`); continue; }
      chars += out.charsSpent || out.wouldSpendChars || 0;
      if (out.audioId) map[`${r.role}|${r.text}`] = out.audioId;
      console.log(`${out.source}${out.dryRun ? ' (dry)' : ''} ${r.role} "${r.text}" ${out.charsSpent || out.wouldSpendChars || 0} chars ${out.audioId || ''}`);
    }
    console.log(`TOTAL ${apply ? 'spent' : 'would spend'} ${chars} chars over ${reqs.length} clips, ${refused} refused`);
    if (opt('--out')) fs.writeFileSync(opt('--out'), JSON.stringify(map, null, 1));
  }
}
