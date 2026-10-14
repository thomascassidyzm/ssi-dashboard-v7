#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-egal-divide-2026-10-14.cjs  (job #520)
//
// KAI'S RULING, 2026-10-14, deu_for_eng — the egal divide (proposed by #513):
//   'es ist mir egal' (personal dative, any pronoun)  = "I don't care" / "she doesn't care"
//   'es ist egal'     (impersonal)                    = "it doesn't matter"
//   'egal wie / was / wo …'                           = "no matter how / what / where …"
//   "regardless" and "all the same" are RETIRED as glosses of egal. ausmachen stays "mind" only (confirmed clean: no row
//   sets ausmachen to care/matter, none sets a mind-English to a non-ausmachen German).
// S0593L01 "regardless | egal" is re-glossed "no matter | egal": that is S0409L01 on both sides, so it is NOT NEW (P25: a
// not-new basket is never played, no intro). Its dark rows are re-worded to "no matter", and every row that can LEGALLY live
// under a new LEGO (contains that LEGO on both sides, every word taught by then) moves there; the rest stay dark.
// Knock-on (standing rule): every egal / care / matter / mind / regardless / all-the-same row of the course was read; the
// rows below are the ones that broke the divide, plus S0538L02B03 (English "she seems to care" on German "sie will nicht wirken").
//
// Writes go ONLY through Popty's edit-batch door; audio ONLY through tools/audio/render.cjs. Reads: the sanctioned dump.
//   node …/deu-egal-divide-2026-10-14.cjs check <dump.json>
//   node …/deu-egal-divide-2026-10-14.cjs verify <fresh-dump.json>
//   node …/deu-egal-divide-2026-10-14.cjs renders <dump.json> [--apply] --out map.json
//   node …/deu-egal-divide-2026-10-14.cjs ops <dump.json> --audio map.json --out ops.json

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const T = require('./p26-early-placement-sweep-2026-10-06.cjs');
const Y = require('./deu-yet-noch-519-baby-2026-10-14.cjs');

const JOB = '#520';
const COURSE = 'deu_for_eng';
const P = (s) => `${COURSE}:${s}`;
const sid = (id) => id.slice(COURSE.length + 1);
const LEGO_93 = 'S0593L01', LEGO_409 = 'S0409L01';
const key = (s) => T.words(s).join(' ');

// [phrase, from known, from target, to known, to target]
const REWRITES = [
  // S0048L01 don't care | egal — "all the same" retired; personal dative = I don't care
  ['S0048L01B02', 'It is all the same to me', 'Mir ist es egal', "I don't care about that", 'Das ist mir egal'],
  ['S0048L01U02', "It is all the same to me, and I don't worry about it", 'Mir ist es egal, und ich mache mir keine Sorgen', "I don't care, and I don't worry about it", 'Mir ist es egal, und ich mache mir keine Sorgen'],
  ['S0048L01U05', 'I think it is all the same to me, and I feel better', 'Ich denke, es ist mir egal, und ich fühle mich besser', "I think I don't care, and I feel better", 'Ich denke, es ist mir egal, und ich fühle mich besser'],
  ['S0048L01U08', 'It is all the same to me whether I am ready or not', 'Mir ist es egal, ob ich bereit bin oder nicht', "I don't care whether I am ready or not", 'Mir ist es egal, ob ich bereit bin oder nicht'],
  // S0409L01 no matter | egal — impersonal = it doesn't matter
  ['S0409L01B02', 'that is all the same', 'das ist egal', "that doesn't matter", 'das ist egal'],
  ['S0409L01B03', 'it is all the same', 'es ist egal', "it doesn't matter", 'es ist egal'],
  ['S0409L01U02', 'I thought that was all the same', 'ich dachte, dass das egal war', "I thought that didn't matter", 'ich dachte, dass das egal war'],
  ['S0409L01U05', 'she told me it was all the same', 'sie hat mir gesagt, dass es egal war', "she told me it didn't matter", 'sie hat mir gesagt, dass es egal war'],
  ['S0409L01U06', 'I knew it was all the same', 'ich wusste, dass es egal war', "I knew it didn't matter", 'ich wusste, dass es egal war'],
  // S0538 — L04 is the old "don't care | egal"
  ['S0538L04B02', 'that is all the same', 'es ist also egal', "so it doesn't matter", 'es ist also egal'],
  ['S0538L03U21', "she doesn't want to seem as if it doesn't matter", 'sie will nicht so wirken, als ob es ihr egal ist', "she doesn't want to seem as if she doesn't care", 'sie will nicht so wirken, als ob es ihr egal ist'],
  ['S0538L02B03', 'she seems to care', 'sie will nicht wirken', "she doesn't want to seem", 'sie will nicht wirken'],
  // S0593L01 regardless → no matter (dark basket; rows that can legally move do, see MOVES93)
  ['S0593L01B01', 'regardless', 'egal', 'no matter', 'egal'],
  ['S0593L01B02', 'regardless how often', 'egal wie oft', 'no matter how often', 'egal wie oft'],
  ['S0593L01B03', 'regardless what she does', 'egal was sie macht', 'no matter what she does', 'egal was sie macht'],
  ['S0593L01U01', 'regardless how much', 'egal wie viel', 'no matter how much', 'egal wie viel'],
  ['S0593L01U02', 'regardless what', 'egal was', 'no matter what', 'egal was'],
  ['S0593L01U03', 'regardless how', 'egal wie', 'no matter how', 'egal wie'],
  ['S0593L01U04', 'she said regardless', 'sie hat gesagt, egal', 'she said no matter what', 'sie hat gesagt, egal was'],
  ['S0593L01U05', 'regardless how often she tried', 'egal wie oft sie versucht hat', 'no matter how often she tried', 'egal wie oft sie versucht hat'],
  ['S0593L01U06', 'regardless how long', 'egal wie lange', 'no matter how long', 'egal wie lange'],
  ['S0593L01U07', 'regardless what she wanted', 'egal was sie wollte', 'no matter what she wanted', 'egal was sie wollte'],
];
// rows that duplicate a row already standing in S0048L01 once the divide is applied — deleted (they sat under "me | mir" after #363)
const DELETES = [
  ['S0518L04U21', 'that is the same to me', 'das ist mir egal'],
  ['S0518L04U22', "it doesn't matter to me", 'es ist mir egal'],
];
const SEEDS_TO_UNAPPROVE = [48, 409, 518, 538, 593];

const newRow = (r) => ({ known: r[3], target: r[4] });

/** Pure: the plan applied to a dump (legos flipped, rows rewritten/deleted, S0593L01 rows moved where they legally fit). */
function applyPlan(dump) {
  const m409 = dump.legos.find((l) => l.lego_id === LEGO_409);
  const legos = dump.legos.map((l) => (l.lego_id === LEGO_93 ? { ...l, known_text: m409.known_text, is_new: false } : l));
  const rw = new Map(REWRITES.map((r) => [P(r[0]), r]));
  const del = new Set(DELETES.map((d) => P(d[0])));
  let phrases = dump.phrases.filter((p) => !del.has(p.id)).map((p) => (rw.has(p.id) ? { ...p, known_text: rw.get(p.id)[3], target_text: rw.get(p.id)[4] } : p));
  // S0593L01's rows → the earliest NEW LEGO that contains the row on both sides, with every word taught by then
  const first = T.firstIntro(legos), firstK = Y.firstIntroKnownFrom ? Y.firstIntroKnownFrom(legos) : null;
  const fk = new Map();
  for (const l of legos) if (l.is_new !== false) for (const w of T.words(l.known_text)) { const q = [l.seed_number, l.lego_index]; const c = fk.get(w); if (!c || q[0] < c[0] || (q[0] === c[0] && q[1] < c[1])) fk.set(w, q); }
  void firstK;
  const newLegos = legos.filter((l) => l.is_new !== false && l.lego_id !== LEGO_93).sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index);
  const seen = new Set(phrases.filter((p) => p.phrase_role !== 'component').map((p) => `${sid(p.id).slice(0, 8)}|${key(p.known_text)}|${key(p.target_text)}`));
  const posNext = new Map(), usedIds = new Set(phrases.map((p) => sid(p.id))), inserts = [];
  const maxPos = (lego) => Math.max(0, ...phrases.filter((q) => sid(q.id).slice(0, 8) === lego).map((q) => q.position || 0));
  const nextId = (lego, L) => { let i = 21; while (usedIds.has(`${lego}${L}${i}`)) i++; usedIds.add(`${lego}${L}${i}`); return `${lego}${L}${i}`; };
  for (const p of phrases.filter((x) => sid(x.id).startsWith(LEGO_93) && x.phrase_role !== 'component')) {
    if (/^no matter$/i.test(p.known_text)) continue; // the bare LEGO row has nowhere to go
    for (const dest of newLegos) {
      if (!T.containsWords(p.target_text, dest.target_text) || !T.containsWords(p.known_text, dest.known_text)) continue;
      if (T.untaughtAt(p.target_text, dest, first).length || Y.untaughtKnown(p.known_text, dest, fk).length) continue;
      const b = `${dest.lego_id}|${key(p.known_text)}|${key(p.target_text)}`; if (seen.has(b)) continue;
      seen.add(b);
      const position = (posNext.get(dest.lego_id) || maxPos(dest.lego_id)) + 1; posNext.set(dest.lego_id, position);
      const id = nextId(dest.lego_id, 'U');
      const row = { ...p, id: P(id), seed_number: dest.seed_number, lego_index: dest.lego_index, lego_id: dest.lego_id, position, phrase_role: 'use', known_audio_id: null,
        metadata: { ...(p.metadata || {}), moved_from: sid(p.id), moved_by: `job ${JOB} deu egal divide (S0593L01 now no matter, not new)` } };
      delete row.course_code; delete row.last_edit_event_id;
      inserts.push({ from: sid(p.id), row, dest: dest.lego_id });
      break;
    }
  }
  const gone = new Set(inserts.map((i) => P(i.from)));
  phrases = phrases.filter((p) => !gone.has(p.id)).concat(inserts.map((i) => i.row));
  return { ...dump, legos, phrases, inserts };
}

/** What must hold on the course once the divide is applied (check: on the plan's post-state; verify: on a fresh dump). */
function invariants(d) {
  const problems = [];
  const l93 = d.legos.find((x) => x.lego_id === LEGO_93), l409 = d.legos.find((x) => x.lego_id === LEGO_409);
  if (!l93 || l93.known_text !== 'no matter' || l93.target_text !== 'egal' || l93.is_new !== false) problems.push(`${LEGO_93} must be "no matter | egal", not new`);
  if (!l409 || l409.known_text !== 'no matter' || !l409.is_new) problems.push(`${LEGO_409} must stay the new "no matter | egal"`);
  const rows = [...d.legos.map((l) => [l.lego_id, l.known_text, l.target_text]), ...d.phrases.filter((p) => p.phrase_role !== 'component').map((p) => [sid(p.id), p.known_text, p.target_text])];
  for (const [id, k, t] of rows) {
    if (/\b(regardless|all the same|the same to me)\b/i.test(k) && /\begal\b/i.test(t)) problems.push(`retired gloss of egal: ${id} "${k}"`);
    // personal = a dative pronoun within two words of egal ("mir egal", "Mir ist es egal", "ist ihr egal"); "hat mir gesagt, dass es egal war" is not
    const personal = /\b(mir|dir|ihr|ihm|uns|euch|ihnen)\b(\s+\S+){0,2}\s+egal\b/i.test(t) || /\begal\b(\s+\S+){0,2}\s+(mir|dir|ihr|ihm|uns|euch|ihnen)\b/i.test(t);
    const impersonal = !personal && /\begal\b/i.test(t) && !/^egal$/i.test(t.trim());
    if (/\begal\b/i.test(t) && /\b(matter|matters)\b/i.test(k) && personal) problems.push(`personal egal glossed "matter": ${id} "${k} | ${t}"`);
    if (/\b(care|cares)\b/i.test(k) && impersonal) problems.push(`impersonal egal glossed "care": ${id} "${k} | ${t}"`);
    if (/\bseems? to care\b/i.test(k) && /wirken/.test(t)) problems.push(`${id} English/German mismatch: "${k}"`);
    if (/ausmach/i.test(t) && !/\bmind\b/i.test(k)) problems.push(`ausmachen not "mind": ${id} "${k}"`);
  }
  return problems;
}

function checkPlan(dump) {
  const problems = [];
  const live = new Map(dump.phrases.map((p) => [sid(p.id), p]));
  const movedFrom = new Set(dump.phrases.map((p) => p.metadata && p.metadata.moved_from).filter(Boolean));
  for (const r of REWRITES) { const p = live.get(r[0]); if (!p) { if (!movedFrom.has(r[0])) problems.push(`${r[0]} not in dump`); } else if (p.known_text !== r[3] && (p.known_text !== r[1] || p.target_text !== r[2])) problems.push(`${r[0]} drifted: "${p.known_text}" | "${p.target_text}"`); }
  const post = applyPlan(dump);
  const first = T.firstIntro(post.legos), fk = new Map();
  for (const l of post.legos) if (l.is_new !== false) for (const w of T.words(l.known_text)) { const q = [l.seed_number, l.lego_index]; const c = fk.get(w); if (!c || q[0] < c[0] || (q[0] === c[0] && q[1] < c[1])) fk.set(w, q); }
  const byId = new Map(post.legos.map((l) => [l.lego_id, l]));
  // every rewritten / moved row teaches only words already taught by its LEGO (target and known), and sits in a lego it contains
  for (const p of post.phrases.filter((x) => REWRITES.some((r) => P(r[0]) === x.id) || (x.metadata && x.metadata.moved_by && /egal divide/.test(x.metadata.moved_by)))) {
    const lg = byId.get(sid(p.id).slice(0, 8));
    const r = REWRITES.find((x) => P(x[0]) === p.id), was = r ? { k: new Set(T.words(r[1])), t: new Set(T.words(r[2])) } : { k: new Set(), t: new Set() };
    const ut = T.untaughtAt(p.target_text, lg, first).filter((w) => !was.t.has(w)), uk = Y.untaughtKnown(p.known_text, lg, fk).filter((w) => !was.k.has(w));
    if (ut.length || uk.length) problems.push(`${sid(p.id)}: untaught at ${lg.lego_id}: target [${ut}] known [${uk}]  "${p.known_text} | ${p.target_text}"`);
  }
  for (const i of post.inserts) {
    const dest = byId.get(i.row.lego_id);
    if (!T.containsWords(i.row.target_text, dest.target_text) || !T.containsWords(i.row.known_text, dest.known_text)) problems.push(`${sid(i.row.id)} does not contain ${dest.lego_id}`);
  }
  // no duplicate row inside a basket
  const seen = new Map(), touched = new Set([...REWRITES.map((r) => r[0].slice(0, 8)), ...post.inserts.map((i) => sid(i.row.id).slice(0, 8))]);
  for (const p of post.phrases.filter((x) => x.phrase_role !== 'component' && touched.has(sid(x.id).slice(0, 8)))) {
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
  const l93 = dump.legos.find((l) => l.lego_id === LEGO_93);
  if (l93.known_text !== 'no matter' || l93.is_new !== false) ops.push({ op: 'lego.update', lego_id: LEGO_93, expect: { known_text: l93.known_text, is_new: l93.is_new }, set: { known_text: 'no matter', is_new: false } });
  const moved = new Set(post.inserts.map((i) => i.from));
  for (const i of post.inserts) {
    const was = live.get(i.from); if (!was) continue;
    ops.push({ op: 'phrase.insert', row: i.row });
    ops.push({ op: 'phrase.delete', phrase_id: was.id, expect: { known_text: was.known_text, target_text: was.target_text } });
  }
  for (const [s, fk, ft] of DELETES) if (live.has(s)) ops.push({ op: 'phrase.delete', phrase_id: P(s), expect: { known_text: fk, target_text: ft } });
  for (const [s, fk, ft, k, t] of REWRITES) {
    const p = live.get(s); if (!p || moved.has(s)) continue;
    if (p.known_text === k && p.target_text === t) continue;
    const set = {}; if (k !== fk) set.known_text = k; if (t !== ft) set.target_text = t;
    ops.push({ op: 'phrase.update', phrase_id: p.id, expect: { known_text: fk, target_text: ft }, set });
  }
  for (const n of SEEDS_TO_UNAPPROVE.concat(post.inserts.map((i) => i.row.seed_number))) if (!ops.some((o) => o.op === 'seed.update' && o.seed_number === n)) ops.push({ op: 'seed.update', seed_number: n, set: { approved_at: null } });
  return ops;
}
/** Known-side clips the new English needs (a moved row is a new row, so it needs its own). */
function wanted(dump) {
  const post = applyPlan(dump), live = new Map(dump.phrases.map((p) => [sid(p.id), p])), out = [];
  const moved = new Set(post.inserts.map((i) => i.from));
  for (const r of REWRITES) { const p = live.get(r[0]); if (p && !moved.has(r[0]) && r[3] !== r[1]) out.push({ role: 'known', text: r[3], phrase: P(r[0]) }); }
  for (const i of post.inserts) out.push({ role: 'known', text: i.row.known_text, phrase: i.row.id });
  return out;
}
function linkOps(dump, map) {
  const ops = [];
  const l409 = dump.legos.find((l) => l.lego_id === LEGO_409);
  ops.push({ op: 'audio.link', target: 'lego', lego_id: LEGO_93, slot: 'known', audio_id: l409.known_audio_id });
  for (const w of wanted(dump)) { const a = map[`${w.role}|${w.text}`]; if (a) ops.push({ op: 'audio.link', target: 'phrase', phrase_id: w.phrase, slot: w.role, audio_id: a }); }
  return ops;
}

module.exports = { REWRITES, DELETES, applyPlan, invariants, checkPlan, textOps, linkOps, wanted, SEEDS_TO_UNAPPROVE };

if (require.main === module) {
  const [cmd, dumpPath, ...rest] = process.argv.slice(2);
  const opt = (f) => { const i = rest.indexOf(f); return i >= 0 ? rest[i + 1] : undefined; };
  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  if (cmd === 'check') {
    const pr = checkPlan(dump); console.log(pr.length ? pr.join('\n') : 'plan clean');
    for (const i of applyPlan(dump).inserts) console.log(`  move ${i.from} → ${sid(i.row.id)} (pos ${i.row.position}) ${i.row.known_text} | ${i.row.target_text}`);
    process.exit(pr.length ? 2 : 0);
  } else if (cmd === 'verify') { const pr = invariants(dump); console.log(pr.length ? pr.join('\n') : 'course holds the divide'); process.exit(pr.length ? 2 : 0); }
  else if (cmd === 'ops') {
    const audio = opt('--audio') ? JSON.parse(fs.readFileSync(opt('--audio'), 'utf8')) : {};
    const ops = [...textOps(dump), ...linkOps(dump, audio)];
    fs.writeFileSync(opt('--out') || 'ops.json', JSON.stringify({ ops }, null, 1)); console.log(`${ops.length} ops`);
  } else if (cmd === 'renders') {
    const apply = rest.includes('--apply'); const map = {}; let chars = 0, refused = 0;
    for (const r of wanted(dump).filter((x, i, a) => a.findIndex((y) => y.role === x.role && y.text === x.text) === i)) {
      const args = [path.join(__dirname, '..', 'audio', 'render.cjs'), '--course', COURSE, '--role', r.role, '--text', r.text, '--purpose', `${JOB} deu egal divide English rows`, '--job', JOB];
      if (!apply) args.push('--dry-run');
      const res = spawnSync('node', args, { encoding: 'utf8', env: { ...process.env, AGENT_ID: 'kai-watson-520' } });
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
