#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-if-wenn-435-mind-2026-10-14.cjs  (job #513)
//
// KAI'S RULINGS, 2026-10-14, deu_for_eng:
//  A. Seed 435 "yes they could if they wanted to": S0435L01 was glossed "when | wenn". The seed says "if", and S0413L03 is
//     already "if | wenn" (both sides match), so S0435L01 becomes "if | wenn", NOT NEW, no intro (P25: not-new baskets are
//     never played). Its basket is dark, so the rows that can legally live under another NEW LEGO (contain it on both sides,
//     every word taught by then) move there; a row that already stands, word for word, in a played basket stays where it is.
//     Knock-on (standing rule): every row of the course that rests on this wenn, English side — the S0435L01 basket and the
//     S0435L02 builds that still said "when we wanted" — says "if". Course-wide the only other conditional wenn glossed
//     "when" are these eight rows; the ~200 temporal "when … wenn" rows are the true reading and are untouched.
//  B. The mind side of the care/mind divide (egal = care/matter, ausmachen = mind) holds already — no row sets ausmachen to
//     care/matter or egal to mind. The egal English gloss spread is a taste call and is NOT applied (see the report).
//     Applied: "if I don't mind | wenn es mir nichts ausmacht" read oddly in English (mind with no object); the German's
//     "es" is the object, so the English says it: "if I don't mind it" (S0155L01B02 and S0540L04B22, one pair, one English).
//
// Writes go ONLY through Popty's edit-batch door; audio ONLY through tools/audio/render.cjs. Reads: the sanctioned dump.
//   node …/deu-if-wenn-435-mind-2026-10-14.cjs check <dump.json>
//   node …/deu-if-wenn-435-mind-2026-10-14.cjs verify <fresh-dump.json>
//   node …/deu-if-wenn-435-mind-2026-10-14.cjs renders <dump.json> [--apply] --out map.json
//   node …/deu-if-wenn-435-mind-2026-10-14.cjs ops <dump.json> --audio map.json --out ops.json

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const T = require('./p26-early-placement-sweep-2026-10-06.cjs');
const Y = require('./deu-yet-noch-519-baby-2026-10-14.cjs');

const JOB = '#513';
const COURSE = 'deu_for_eng';
const P = (s) => `${COURSE}:${s}`;
const sid = (id) => id.slice(COURSE.length + 1);
const LEGO = 'S0435L01', TWIN = 'S0413L03';
const SEEDS_TO_UNAPPROVE = [155, 435, 540];

// [phrase, new known]  (German untouched). The moved rows are rewritten on the way (MOVES).
const REWRITES = [
  ['S0435L01B01', 'when', 'if'], ['S0435L01B02', 'when they wanted', 'if they wanted'],
  ['S0435L01U01', 'I think we could do it when we wanted', 'I think we could do it if we wanted'],
  ['S0435L01U03', 'she told me we could when we wanted', 'she told me we could if we wanted'],
  ['S0435L01U04', 'I knew we could when we wanted', 'I knew we could if we wanted'],
  ['S0435L02B02', 'when they wanted', 'if they wanted'], ['S0435L02B03', 'we could when we wanted', 'we could if we wanted'],
  ['S0155L01B02', "if I don't mind", "if I don't mind it"], ['S0540L04B22', "if I don't mind", "if I don't mind it"],
];
// [from, new known, destination new LEGO, new id]
const MOVES = [
  ['S0435L01B03', 'they could if they wanted', 'S0435L02', 'S0435L02U21'],
  ['S0435L01U02', 'I thought they could if they wanted', 'S0435L02', 'S0435L02U22'],
  ['S0435L01U05', 'I think all could do it if they wanted', 'S0435L02', 'S0435L02U23'],
  ['S0435L01U06', 'please could we go if we want to', 'S0540L03', 'S0540L03U21'],
];
// rows left in the dark basket because the very same sentence (both sides) already stands in a played basket
const STAY_DUPES = { S0435L01U01: 'S0435L02U02', S0435L01U03: 'S0435L02U04', S0435L01U04: 'S0435L02U06', S0435L01B02: 'S0435L02B02' };

const key = (s) => T.words(s).join(' ');
const nowKnown = (dump, s) => (REWRITES.find((r) => r[0] === s) || [])[2];

function applyPlan(dump) {
  const legos = dump.legos.map((l) => (l.lego_id === LEGO ? { ...l, known_text: 'if', is_new: false } : l));
  const live = new Map(dump.phrases.map((p) => [sid(p.id), p]));
  const maxPos = (lego) => Math.max(0, ...dump.phrases.filter((q) => sid(q.id).slice(0, 8) === lego).map((q) => q.position || 0));
  const byId = new Map(legos.map((l) => [l.lego_id, l]));
  const inserts = [], posNext = new Map();
  for (const [from, known, to, id] of MOVES) {
    const p = live.get(from), dest = byId.get(to); if (!p || !dest) continue;
    const position = (posNext.get(to) || maxPos(to)) + 1; posNext.set(to, position);
    const row = { ...p, id: P(id), seed_number: dest.seed_number, lego_index: dest.lego_index, lego_id: to, position, phrase_role: 'use', known_text: known, known_audio_id: null,
      metadata: { ...(p.metadata || {}), moved_from: from, moved_by: `job ${JOB} deu if/wenn S0435L01 (P25)` } };
    delete row.course_code; delete row.last_edit_event_id; inserts.push({ from, row });
  }
  const gone = new Set(MOVES.map((m) => P(m[0])));
  const rw = new Map(REWRITES.map(([s, , k]) => [P(s), k]));
  const phrases = dump.phrases.filter((p) => !gone.has(p.id)).map((p) => (rw.has(p.id) ? { ...p, known_text: rw.get(p.id) } : p)).concat(inserts.map((i) => i.row));
  return { ...dump, legos, phrases, inserts };
}

/** Holds on the course once the rulings are applied (check: on the plan's post-state; verify: on a fresh dump after apply). */
function invariants(d) {
  const problems = [];
  const l = d.legos.find((x) => x.lego_id === LEGO), twin = d.legos.find((x) => x.lego_id === TWIN);
  if (!l || l.known_text !== 'if' || l.target_text !== 'wenn' || l.is_new !== false) problems.push(`${LEGO} must be "if | wenn", not new`);
  if (!twin || twin.known_text !== 'if' || twin.target_text !== 'wenn' || !twin.is_new) problems.push(`${TWIN} must stay the new "if | wenn"`);
  const newWhenWenn = d.legos.filter((x) => x.is_new !== false && x.known_text === 'when' && x.target_text === 'wenn').map((x) => x.lego_id);
  if (newWhenWenn.length) problems.push(`new "when | wenn" LEGO left: ${newWhenWenn}`);
  // no conditional (Konjunktiv II) wenn row anywhere glossed "when"
  for (const p of d.phrases.filter((x) => x.phrase_role !== 'component'))
    if (/\bwenn\b/i.test(p.target_text) && /\bwhen\b/i.test(p.known_text) && !/\bif\b/i.test(p.known_text) && /\b(könnte|könnten|könntest|würde|würden|wäre|wären|hätte|hätten)\b/i.test(p.target_text))
      problems.push(`conditional wenn glossed "when": ${sid(p.id)} "${p.known_text} | ${p.target_text}"`);
  for (const p of d.phrases.filter((x) => /^S0155L01B02$|^S0540L04B22$/.test(sid(x.id)))) if (p.known_text !== "if I don't mind it") problems.push(`${sid(p.id)} English not fixed`);
  return problems;
}

function checkPlan(dump) {
  const problems = [];
  const live = new Map(dump.phrases.map((p) => [sid(p.id), p]));
  const movedFrom = new Set(dump.phrases.map((p) => p.metadata && p.metadata.moved_from).filter(Boolean));
  const L = dump.legos.find((l) => l.lego_id === LEGO);
  if (!L || !['when', 'if'].includes(L.known_text) || L.target_text !== 'wenn') problems.push(`${LEGO} drifted`);
  for (const [s, , k] of REWRITES) { const p = live.get(s); if (!p) problems.push(`${s} not in dump`); else if (p.known_text !== k && !/when|if I don't mind$/.test(p.known_text)) problems.push(`${s} drifted: "${p.known_text}"`); }
  for (const [s] of MOVES) if (!live.has(s) && !movedFrom.has(s)) problems.push(`${s} neither in place nor moved`);
  const post = applyPlan(dump);
  const byId = new Map(post.legos.map((l) => [l.lego_id, l]));
  const first = T.firstIntro(post.legos), firstK = new Map();
  for (const l of post.legos) if (l.is_new !== false) for (const w of T.words(l.known_text)) { const q = [l.seed_number, l.lego_index]; const c = firstK.get(w); if (!c || q[0] < c[0] || (q[0] === c[0] && q[1] < c[1])) firstK.set(w, q); }
  for (const i of post.inserts) {
    const dest = byId.get(i.row.lego_id), r = i.row;
    if (!dest.is_new) problems.push(`${sid(r.id)} under a not-new LEGO`);
    if (!T.containsWords(r.target_text, dest.target_text) || !T.containsWords(r.known_text, dest.known_text)) problems.push(`${sid(r.id)} does not contain ${dest.lego_id} on both sides`);
    if (!T.containsWords(r.target_text, 'wenn') || !T.containsWords(r.known_text, 'if')) problems.push(`${sid(r.id)} does not contain if|wenn`);
    const ut = T.untaughtAt(r.target_text, dest, first), uk = Y.untaughtKnown(r.known_text, dest, firstK);
    if (ut.length || uk.length) problems.push(`${sid(r.id)}: untaught at ${dest.lego_id}: target [${ut}] known [${uk}]`);
  }
  // each staying row really is a word-for-word twin of a played row
  for (const [s, twin] of Object.entries(STAY_DUPES)) {
    const a = post.phrases.find((p) => p.id === P(s)), b = post.phrases.find((p) => p.id === P(twin));
    if (!a || !b || key(a.known_text) !== key(b.known_text) || key(a.target_text) !== key(b.target_text)) problems.push(`${s} is not a twin of ${twin}`);
  }
  // no duplicate row inside a basket the plan writes to
  const seen = new Map();
  for (const p of post.phrases.filter((x) => x.phrase_role !== 'component' && ['S0435L02', 'S0540L03', 'S0155L01', 'S0540L04'].includes(sid(x.id).slice(0, 8)))) {
    const b = `${sid(p.id).slice(0, 8)}|${key(p.known_text)}|${key(p.target_text)}`;
    if (seen.has(b)) problems.push(`duplicate in basket: ${sid(p.id)} = ${seen.get(b)}`); seen.set(b, sid(p.id));
  }
  // ZUT strict, course-wide, before vs after: no group the plan opens
  const audit = require('./audit-phrase-zut.cjs');
  const g = (d) => new Map(audit.auditRows({ seeds: d.seeds, legos: d.legos.map((l) => ({ ...l, id: l.lego_id })), phrases: d.phrases }).bidirectional.violationsStrict.map((v) => [v.known_norm, v]));
  const b4 = g(dump), af = g(post);
  for (const k of af.keys()) if (!b4.has(k)) problems.push(`ZUT strict: new group "${k}"`);
  console.log(`ZUT strict before ${b4.size} → after ${af.size}`);
  problems.push(...invariants(post));
  return problems;
}

function textOps(dump) {
  const post = applyPlan(dump), live = new Map(dump.phrases.map((p) => [sid(p.id), p])), ops = [];
  const lego = dump.legos.find((l) => l.lego_id === LEGO);
  if (lego.known_text !== 'if' || lego.is_new !== false) ops.push({ op: 'lego.update', lego_id: LEGO, expect: { known_text: lego.known_text, is_new: lego.is_new }, set: { known_text: 'if', is_new: false } });
  for (const i of post.inserts) {
    const was = live.get(i.from); if (!was) continue;
    ops.push({ op: 'phrase.insert', row: i.row });
    ops.push({ op: 'phrase.delete', phrase_id: was.id, expect: { known_text: was.known_text, target_text: was.target_text } });
  }
  for (const [s, , k] of REWRITES) { const p = live.get(s); if (p.known_text !== k) ops.push({ op: 'phrase.update', phrase_id: p.id, expect: { known_text: p.known_text }, set: { known_text: k } }); }
  return ops;
}
/** Known-side clips the new English needs. */
function wanted(dump) {
  const post = applyPlan(dump);
  const out = [{ role: 'known', text: 'if', lego: LEGO }];
  for (const [s, , k] of REWRITES) out.push({ role: 'known', text: k, phrase: P(s) });
  for (const i of post.inserts) out.push({ role: 'known', text: i.row.known_text, phrase: i.row.id });
  return out;
}
function linkOps(dump, map) {
  const ops = [];
  for (const w of wanted(dump)) {
    const a = map[`${w.role}|${w.text}`]; if (!a) continue;
    ops.push(w.lego ? { op: 'audio.link', target: 'lego', lego_id: w.lego, slot: w.role, audio_id: a } : { op: 'audio.link', target: 'phrase', phrase_id: w.phrase, slot: w.role, audio_id: a });
  }
  return ops;
}

module.exports = { REWRITES, MOVES, STAY_DUPES, applyPlan, invariants, checkPlan, textOps, linkOps, wanted, SEEDS_TO_UNAPPROVE };

if (require.main === module) {
  const [cmd, dumpPath, ...rest] = process.argv.slice(2);
  const opt = (f) => { const i = rest.indexOf(f); return i >= 0 ? rest[i + 1] : undefined; };
  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  if (cmd === 'check') {
    const pr = checkPlan(dump); console.log(pr.length ? pr.join('\n') : 'plan clean');
    for (const i of applyPlan(dump).inserts) console.log(`  move ${i.from} → ${sid(i.row.id)} (pos ${i.row.position}) ${i.row.known_text} | ${i.row.target_text}`);
    process.exit(pr.length ? 2 : 0);
  } else if (cmd === 'verify') { const pr = invariants(dump); console.log(pr.length ? pr.join('\n') : 'course holds the rulings'); process.exit(pr.length ? 2 : 0); }
  else if (cmd === 'ops') {
    const audio = opt('--audio') ? JSON.parse(fs.readFileSync(opt('--audio'), 'utf8')) : {};
    const ops = [...textOps(dump), ...linkOps(dump, audio)];
    fs.writeFileSync(opt('--out') || 'ops.json', JSON.stringify({ ops }, null, 1)); console.log(`${ops.length} ops`);
  } else if (cmd === 'renders') {
    const apply = rest.includes('--apply'); const map = {}; let chars = 0, refused = 0;
    for (const r of wanted(dump).filter((x, i, a) => a.findIndex((y) => y.role === x.role && y.text === x.text) === i)) {
      const args = [path.join(__dirname, '..', 'audio', 'render.cjs'), '--course', COURSE, '--role', r.role, '--text', r.text, '--purpose', `${JOB} deu if|wenn S0435L01 + mind row English`, '--job', JOB];
      if (!apply) args.push('--dry-run');
      const res = spawnSync('node', args, { encoding: 'utf8', env: { ...process.env, AGENT_ID: 'kai-watson-513' } });
      let out = {}; try { out = JSON.parse(res.stdout); } catch (_) { out = { ok: false, error: (res.stdout || res.stderr || '').slice(-300) }; }
      if (!out.ok) { refused++; console.log(`REFUSED ${r.role} "${r.text}": ${JSON.stringify(out).slice(0, 300)}`); continue; }
      const n = out.charsSpent || out.wouldSpendChars || 0; chars += n;
      if (out.audioId) map[`${r.role}|${r.text}`] = out.audioId;
      console.log(`${out.source}${out.dryRun ? ' (dry)' : ''} ${r.role} "${r.text}" ${n} chars ${out.audioId || ''}`);
    }
    console.log(`TOTAL ${apply ? 'spent' : 'would spend'} ${chars} chars, ${refused} refused`);
    if (opt('--out')) fs.writeFileSync(opt('--out'), JSON.stringify(map, null, 1));
  }
}
