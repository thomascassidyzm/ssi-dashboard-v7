#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-ausmachen-540-2026-10-14.cjs  (job #504)
//
// KAI'S RULING, 2026-10-14, deu_for_eng S0540L04 "to mind | ausmachen" (R1141, Deborah flagged it):
//  1. The basket opened on "she doesn't mind | es macht ihr nichts aus": a split separable verb (macht … aus) wrapped
//     round nichts and a dative pronoun, the first time the learner is asked to SAY anything with the LEGO. Three gentle
//     rows now open it: the bare LEGO, the joined shape the learner already met at S0155L01 (R357), then the first split clause (he), every word already taught.
//     ("I / you don't mind" cannot be used: S0063L02 / S0155L01 already own those knowns with the joined target — ZUT.)
//     The twelve existing rows are kept, shifted down three places.
//  2. Slot 2 (target2) of this LEGO and of every row in its basket is the MALE German voice (voice_language_roles deu m
//     rank 0); target1 stays the female one. Make-before-break: the new clips are rendered and checked before any
//     slot is pointed at them, and no old clip is deleted.
//  The LEGO text is untouched, so the intro ("The German for: 'to mind', is:") still mirrors it. S0540 is already unapproved.
//
// Writes go ONLY through Popty's edit-batch door; audio ONLY through tools/audio/render.cjs. No SQL here.
//   node …/deu-ausmachen-540-2026-10-14.cjs check <dump.json>
//   node …/deu-ausmachen-540-2026-10-14.cjs verify <fresh-dump.json>
//   node …/deu-ausmachen-540-2026-10-14.cjs renders <dump.json> [--apply] --out map.json
//   node …/deu-ausmachen-540-2026-10-14.cjs ops <dump.json> --audio map.json --out ops.json

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const T = require('./p26-early-placement-sweep-2026-10-06.cjs');

const JOB = '#504';
const COURSE = 'deu_for_eng';
const LEGO = 'S0540L04';
const DEU_F = 'cartesia_b9de4a89-2257-424b-94c2-db18ba68c81a'; // voice_language_roles deu f rank 0
const DEU_M = 'cartesia_afa425cf-5489-4a09-8a3f-d3cb1f82150d'; // voice_language_roles deu m rank 0
const P = (s) => `${COURSE}:${s}`;
const sid = (id) => id.slice(COURSE.length + 1);

// [new id, known, target] — every word taught by round 1141 (check proves it)
const LADDER = [
  ['S0540L04B21', 'to mind', 'ausmachen'],
  ['S0540L04B22', "if I don't mind", 'wenn es mir nichts ausmacht'],   // the shape S0155L01 taught (R357): a recall, same pair as S0155L01B02
  ['S0540L04B23', "he doesn't mind", 'es macht ihm nichts aus'],        // the first split clause: one person, one particle at the end
];
// tiles in the phrase, counted the way the neighbouring rows are ("wenn es dir nichts ausmacht" = 4, "es macht ihr nichts aus" = 3)
const LEGO_COUNT = [1, 4, 3];
const basket = (d) => d.phrases.filter((p) => sid(p.id).startsWith(LEGO) && p.phrase_role !== 'component');
const key = (s) => T.words(s).join(' ');

/** The plan applied to a dump (pure). */
function applyPlan(dump) {
  const old = basket(dump);
  const shifted = new Map(old.map((p) => [p.id, p.position + LADDER.length]));
  const proto = old.find((p) => p.position === 1) || old[0];
  const rows = LADDER.map(([id, known, target], i) => {
    const r = { ...proto, id: P(id), position: i + 1, known_text: known, target_text: target, phrase_role: 'build', introduce: true,
      metadata: { authored_by: `job ${JOB}`, ruling: 'S0540L04 build-up: bare LEGO, then joined recall, then he, before the split third-person rows (Kai 2026-10-14)' } };
    for (const c of ['course_code', 'known_audio_id', 'target1_audio_id', 'target2_audio_id', 'target1_duration_ms', 'target2_duration_ms', 'last_edit_event_id',
      'created_at', 'updated_at', 'version', 'qa_checked']) delete r[c];
    r.word_count = target.length; // the column holds the target's length in characters (B01 "es macht ihr nichts aus" = 23)
    r.lego_count = LEGO_COUNT[i];
    return r;
  });
  const phrases = dump.phrases.map((p) => (shifted.has(p.id) ? { ...p, position: shifted.get(p.id) } : p));
  return { ...dump, phrases: phrases.concat(rows), inserts: rows, shifted };
}

function checkPlan(dump) {
  const problems = [];
  const lego = dump.legos.find((l) => l.lego_id === LEGO);
  if (!lego || lego.known_text !== 'to mind' || lego.target_text !== 'ausmachen' || !lego.is_new) return [`${LEGO} drifted`];
  for (const [id] of LADDER) if (dump.phrases.some((p) => p.id === P(id))) problems.push(`${id} already exists`);
  const post = applyPlan(dump);
  const first = T.firstIntro(post.legos), firstK = T.firstIntroKnown ? T.firstIntroKnown(post.legos) : null;
  const kfirst = new Map();
  for (const l of post.legos) if (l.is_new !== false) for (const w of T.words(l.known_text)) { const q = [l.seed_number, l.lego_index]; const c = kfirst.get(w); if (!c || q[0] < c[0] || (q[0] === c[0] && q[1] < c[1])) kfirst.set(w, q); }
  const DO_SUPPORT = new Set(['does', 'doesnt', 'dont']);
  for (const r of post.inserts) {
    const ut = T.untaughtAt(r.target_text, lego, first);
    const uk = [...new Set(T.words(r.known_text))].filter((w) => !DO_SUPPORT.has(w) && (!kfirst.has(w) || kfirst.get(w)[0] > lego.seed_number || (kfirst.get(w)[0] === lego.seed_number && kfirst.get(w)[1] > lego.lego_index)));
    if (ut.length || uk.length) problems.push(`${sid(r.id)}: untaught target [${ut}] known [${uk}]`);
    if (r.target_text !== 'ausmachen' && !/ausmacht$|macht .* aus$/.test(r.target_text)) problems.push(`${sid(r.id)} does not carry the verb`);
  }
  // ZUT: a new known must not meet a different target anywhere played
  const rows = [...post.legos.filter((l) => l.is_new !== false).map((l) => [l.known_text, l.target_text, l.lego_id]),
    ...post.phrases.filter((p) => p.phrase_role !== 'component').map((p) => [p.known_text, p.target_text, sid(p.id)])];
  for (const r of post.inserts) {
    const t = new Map();
    for (const [k, tg, id] of rows) if (key(k) === key(r.known_text)) t.set(key(tg), `${id}: ${tg}`);
    if (t.size > 1) problems.push(`ZUT: "${r.known_text}" → ${[...t.values()].join(' / ')}`);
  }
  problems.push(...invariants(post));
  return problems;
}

/** What must hold once applied: the ladder opens the basket, positions are 1..n with no gap, nothing lost. */
function invariants(d) {
  const problems = [];
  const b = basket(d).sort((x, y) => x.position - y.position);
  if (b.slice(0, LADDER.length).map((p) => sid(p.id)).join() !== LADDER.map((l) => l[0]).join()) problems.push(`${LEGO} does not open with ${LADDER.map((l) => l[0])}`);
  b.forEach((p, i) => { if (p.position !== i + 1) problems.push(`${sid(p.id)} at position ${p.position}, expected ${i + 1}`); });
  const seen = new Set(); for (const p of b) { const k = `${key(p.known_text)}|${key(p.target_text)}`; if (seen.has(k)) problems.push(`duplicate row ${sid(p.id)}`); seen.add(k); }
  return problems;
}

/** Every slot-2 text in the basket plus the LEGO itself: [target text]. */
const t2Texts = (d) => [...new Set([...basket(applyPlan(d)).map((p) => p.target_text), 'ausmachen'])];
const knownOf = (d) => applyPlan(d).inserts.map((r) => r.known_text);

function textOps(dump) {
  const post = applyPlan(dump);
  const ops = [];
  for (const p of basket(dump).sort((a, b) => b.position - a.position)) // top down: no two rows ever share a position
    ops.push({ op: 'phrase.update', phrase_id: p.id, expect: { position: p.position }, set: { position: post.shifted.get(p.id) } });
  for (const r of post.inserts) ops.push({ op: 'phrase.insert', row: r });
  return ops;
}
const wanted = (d) => [
  ...knownOf(d).map((text) => ({ role: 'known', text })),
  ...LADDER.map((l) => ({ role: 'target1', text: l[2], voiceId: DEU_F })),
  ...t2Texts(d).map((text) => ({ role: 'target2', text, voiceId: DEU_M })),
].filter((r, i, a) => a.findIndex((x) => x.role === r.role && x.text === r.text) === i);
function linkOps(dump, map) {
  const post = applyPlan(dump), ops = [];
  const g = (role, text) => map[`${role}|${text}`];
  // Make-before-break: a batch with text rows but no clip for a wanted slot would leave new rows silent
  // and the LEGO on its old voice, so an incomplete render map is refused before any op is emitted.
  const missing = wanted(dump).filter((r) => !g(r.role, r.text)).map((r) => `${r.role}|${r.text}`);
  if (missing.length) throw new Error(`render map incomplete, missing: ${missing.join(', ')}`);
  for (const r of post.inserts) for (const [slot, text] of [['known', r.known_text], ['target1', r.target_text], ['target2', r.target_text]]) {
    const a = g(slot, text); if (a) ops.push({ op: 'audio.link', target: 'phrase', phrase_id: r.id, slot, audio_id: a });
  }
  for (const p of basket(dump)) { const a = g('target2', p.target_text); if (a) ops.push({ op: 'audio.link', target: 'phrase', phrase_id: p.id, slot: 'target2', audio_id: a }); }
  const a = g('target2', 'ausmachen'); if (a) ops.push({ op: 'audio.link', target: 'lego', lego_id: LEGO, slot: 'target2', audio_id: a });
  return ops;
}

module.exports = { LADDER, applyPlan, checkPlan, invariants, textOps, linkOps, wanted };

if (require.main === module) {
  const [cmd, dumpPath, ...rest] = process.argv.slice(2);
  const opt = (f) => { const i = rest.indexOf(f); return i >= 0 ? rest[i + 1] : undefined; };
  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  if (cmd === 'check') { const pr = checkPlan(dump); console.log(pr.length ? pr.join('\n') : 'plan clean'); process.exit(pr.length ? 2 : 0); }
  else if (cmd === 'verify') { const pr = invariants(dump); console.log(pr.length ? pr.join('\n') : 'course holds the ruling'); process.exit(pr.length ? 2 : 0); }
  else if (cmd === 'ops') {
    const audio = opt('--audio') ? JSON.parse(fs.readFileSync(opt('--audio'), 'utf8')) : {};
    const ops = [...textOps(dump), ...linkOps(dump, audio)];
    fs.writeFileSync(opt('--out') || 'ops.json', JSON.stringify({ ops }, null, 1)); console.log(`${ops.length} ops`);
  } else if (cmd === 'renders') {
    const apply = rest.includes('--apply'); const map = {}; let chars = 0, refused = 0;
    for (const r of wanted(dump)) {
      const args = [path.join(__dirname, '..', 'audio', 'render.cjs'), '--course', COURSE, '--role', r.role, '--text', r.text, '--purpose', `${JOB} S0540L04 ausmachen build-up + male slot 2`, '--job', JOB];
      if (r.voiceId) args.push('--voice', r.voiceId);
      if (!apply) args.push('--dry-run');
      const res = spawnSync('node', args, { encoding: 'utf8', env: { ...process.env, AGENT_ID: 'kai-watson-504' } });
      let out = {}; try { out = JSON.parse(res.stdout); } catch (_) { out = { ok: false, error: (res.stdout || res.stderr || '').slice(-300) }; }
      if (!out.ok) { refused++; console.log(`REFUSED ${r.role} "${r.text}": ${JSON.stringify(out).slice(0, 300)}`); continue; }
      const n = out.charsSpent || out.wouldSpendChars || 0; chars += n;
      if (out.audioId) map[`${r.role}|${r.text}`] = out.audioId;
      console.log(`${out.source}${out.dryRun ? ' (dry)' : ''} ${r.role} "${r.text}" ${n} chars ${out.audioId || ''}`);
    }
    console.log(`TOTAL ${apply ? 'spent' : 'would spend'} ${chars} chars, ${refused} refused`);
    if (opt('--out')) fs.writeFileSync(opt('--out'), JSON.stringify(map, null, 1));
    if (refused) process.exit(2);
  }
}
