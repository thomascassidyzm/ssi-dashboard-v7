#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-yet-noch-519-baby-2026-10-14.cjs  (job #494; evidence job #491·Q)
//
// KAI'S RULINGS, 2026-10-14, deu_for_eng:
//  1. "yet | noch" is first taught at S0060L01 (round 173). Its intro explains the trick, in Kai's words:
//     "The German for 'yet', when really you mean 'not yet', as in 'I haven't yet seen', is…" — with an example the
//     learner can follow at round 173 (slept | geschlafen is taught at seed 55). The later twins are NOT new:
//     S0345L01 already is; S0519L04 (round 1073, a two-sided duplicate) becomes not new here. No intro for them.
//  2. ONE RULE FOR "yet" (canon, German-scoped): negative "not … yet" → noch nicht; positive/question "yet"
//     (have you … yet?) → schon. A positive-yet row never sits in a basket that drills noch, and schon must be
//     taught before it. The only two positive-yet rows (S0519L04U02/U07) are DELETED: Kai allowed it, and no row
//     anywhere has told the learner that this "yet" is schon (U07's gekommen is taught by no new LEGO at all).
//  3. P25: S0519L04's basket goes dark, so each noch-nicht drill row moves under a NEW LEGO it contains on both
//     sides at whose seed every word is taught — the nearest such LEGO to round 1073; none fits → deleted.
//     S0519L04B01 "yet | noch" (the LEGO's own row) is deleted in run 2: it could only duplicate S0060L01 itself.
//  4. S0519L02 "their new baby | ihr neues Baby": the LEGO grew but the basket still drilled "a new one | ein
//     neues". Every row is rewritten (same ids, same positions) to contain the whole LEGO, from taught words.
//  5. S0519L04U08 is seed 431's sentence (P26), sitting in a basket that now goes dark. Seed 431's own LEGOs are
//     not new, so P26 sends it to the nearest earlier new LEGO it contains with every word taught — there is none
//     (S0060L01 "yet" comes before "they", taught at seed 87) — else the earliest later one: S0629L03 "but | aber".
//  Consistency knock-on (rule 2): S0268L02U03/U09 said "nobody has seen it … yet" over a German with no noch —
//  the English loses "yet" (the German is untouched); S0565L01U06 "she is not ready to talk about it" over
//  "sie will noch nicht darüber reden" gets the English the German says, "she does not want to talk about it yet".
//  Not touched: could/konnte/könnte rows (#489), seed 406 (#490).
//
// New phrase ids start at 21 (B21, U21, …): ids are never reused, and the edit-event history that would say which
// low numbers were once used is not in the dump, so the numbers are taken from a range no basket has reached.
//
// Writes go ONLY through Popty's edit-batch door; audio ONLY through tools/audio/render.cjs (POST /api/audio/render).
// Reads come from the sanctioned dump (course-dump-readonly-2026-10-14.cjs). No SQL here.
//
//   node …/deu-yet-noch-519-baby-2026-10-14.cjs check <dump.json>
//   node …/deu-yet-noch-519-baby-2026-10-14.cjs verify <fresh-dump.json>       # the rulings hold on the live course
//   node …/deu-yet-noch-519-baby-2026-10-14.cjs renders <dump.json> [--apply] [--intro] --out map.json
//   node …/deu-yet-noch-519-baby-2026-10-14.cjs ops <dump.json> --audio map.json --out ops.json   # text + moves + links

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const T = require('./p26-early-placement-sweep-2026-10-06.cjs');

const JOB = '#494';
const COURSE = 'deu_for_eng';
const P = (s) => `${COURSE}:${s}`;
const sid = (id) => id.slice(COURSE.length + 1);

const INTRO = { lego: 'S0060L01', text: "The German for 'yet', when really you mean 'not yet', as in 'I haven't slept yet', is:",
  example: { known: "I haven't slept yet", target: 'ich habe noch nicht geschlafen' } };
const FLIPS = { S0519L04: false };

// [phrase, destination new LEGO, role there]
const MOVES = [
  ['S0519L04B02', 'S0060L01', 'build'],   // not yet | noch nicht — the first build of the debut
  ['S0519L04B03', 'S0478L01', 'use'],     // she has not yet | sie hat noch nicht
  ['S0519L04U01', 'S0478L01', 'use'],     // she has not tried yet
  ['S0519L04U03', 'S0420L03', 'use'],     // he has not done it yet
  ['S0519L04U05', 'S0372L02', 'use'],     // I have not tried yet
  ['S0519L04U06', 'S0517L02', 'use'],     // she has not yet gone
  ['S0519L04U08', 'S0629L03', 'use'],     // seed 431's sentence (P26: S0060L01 is earlier but "they" is not taught until seed 87)
];
// Run 2 (same day): S0519L04B01 "yet | noch" is the LEGO's own row; its only possible home would duplicate S0060L01
// itself, and left behind it is a dark basket (check-debut-practice "dark 1") — rule 3 says drop it.
// The intro is now Kai's punctuation verbatim — "The German for 'yet', … as in '…', is:" — with no colon after "for" and
// no dash after "as in": with either, intro-mirror read the line as the house template (frame B, or frame A lazily)
// and took "yet', when really you mean 'not yet…" for the quoted chunk. Run 1's clip carried both and was MISMATCH.
const DELETES = [
  ['S0519L04B01', 'yet', 'noch'],
  ['S0519L04U02', 'have you tried yet?', 'hast du es schon versucht?'],
  ['S0519L04U07', 'has she come yet?', 'ist sie schon gekommen?'],
  ['S0519L04U04', 'she has not come yet', 'sie ist noch nicht gekommen'], // gekommen: taught by no new LEGO anywhere
];
// "not yet | noch nicht" leads S0060L01's builds: the three builds and U01 step down one place (position 5 is free).
const POSITIONS = { S0060L01B01: [1, 2], S0060L01B02: [2, 3], S0060L01B03: [3, 4], S0060L01U01: [4, 5] };
const POSITION_OF_MOVED = { S0519L04B02: 1 };

// [phrase, from known, from target, to known, to target]
const REWRITES = [
  // S0519L02 "their new baby | ihr neues Baby" — every row drills the whole LEGO
  ['S0519L02B01', 'new', 'neues', 'their new baby', 'ihr neues Baby'],
  ['S0519L02B02', 'a new one', 'ein neues', 'that is their new baby', 'das ist ihr neues Baby'],
  ['S0519L02B03', 'they have a new one', 'sie haben ein neues', 'is that their new baby?', 'ist das ihr neues Baby?'],
  ['S0519L02U01', 'do you have a new one?', 'hast du ein neues?', 'I want to see their new baby', 'ich will ihr neues Baby sehen'],
  ['S0519L02U02', 'she has a new one', 'sie hat ein neues', "I'd like to see their new baby", 'ich möchte ihr neues Baby sehen'],
  ['S0519L02U03', 'is that a new one?', 'ist das ein neues?', 'their new baby is here', 'ihr neues Baby ist hier'],
  ['S0519L02U04', 'he wants a new one', 'er will ein neues', 'their new baby is really beautiful', 'ihr neues Baby ist wirklich schön'],
  ['S0519L02U05', 'she has a new house', 'sie hat ein neues Haus', 'we want to see their new baby tomorrow', 'wir wollen ihr neues Baby morgen sehen'],
  ['S0519L02U06', 'he has a new one', 'er hat ein neues', 'she wants to see their new baby too', 'sie will ihr neues Baby auch sehen'],
  ['S0519L02U07', 'she wants a new one too', 'sie will auch ein neues', 'their new baby is very beautiful', 'ihr neues Baby ist sehr schön'],
  // rule 2 knock-on: the English says what the German says
  ['S0268L02U03', 'He sent it to the office yesterday but nobody has seen it there yet', 'Er hat es gestern zum Büro geschickt aber niemand hat es gesehen',
    'He sent it to the office yesterday but nobody has seen it', 'Er hat es gestern zum Büro geschickt aber niemand hat es gesehen'],
  ['S0268L02U09', 'He has sent two emails to the office but nobody has seen them yet today', 'Er hat zwei E-Mails zum Büro geschickt aber niemand hat sie gesehen heute',
    'He has sent two emails to the office but nobody has seen them today', 'Er hat zwei E-Mails zum Büro geschickt aber niemand hat sie gesehen heute'],
  ['S0565L01U06', 'she is not ready to talk about it', 'sie will noch nicht darüber reden', "she doesn't want to talk about it yet", 'sie will noch nicht darüber reden'],
];
const TOUCHED_SEEDS = [60, 268, 372, 420, 478, 517, 519, 565, 629];

// ── helpers ──
const key = (s) => T.words(s).join(' ');
const legoOfPhrase = (p) => sid(p.id).slice(0, 8);
const before = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
function firstIntroKnown(legos) {
  const first = new Map();
  for (const l of legos) if (l.is_new !== false) for (const w of T.words(l.known_text)) { const q = [l.seed_number, l.lego_index]; if (!first.has(w) || before(q, first.get(w))) first.set(w, q); }
  return first;
}
// English contractions the LEGO-gloss tokeniser never sees whole: judged by their parts, taught long before (they 87, are 11, will 94, have 37…)
const CONTRACTION_PARTS = { theyre: ['they', 'are'], theyll: ['they', 'will'], havent: ['have', 'not'], "i'd": ['i', 'would'], id: ['i'] };
// English do-support is structure, not vocabulary: no deu_for_eng LEGO glosses "does", yet 35 rows say "she does(n't) want".
const DO_SUPPORT = new Set(['does', 'doesnt', "doesn't"]);
function untaughtKnown(text, lego, firstK) {
  const out = [];
  for (const w of new Set(T.words(text))) {
    if (DO_SUPPORT.has(w)) continue;
    const parts = firstK.has(w) ? [w] : (CONTRACTION_PARTS[w.replace(/'/g, '')] || CONTRACTION_PARTS[w] || [w]);
    for (const p of parts) if (!firstK.has(p) || before([lego.seed_number, lego.lego_index], firstK.get(p))) out.push(w);
  }
  return [...new Set(out)];
}
/** "yet" said positively (a question or no negation) → schon; negatively → noch. */
const NEG = /\b(not|never|nobody|no one|nothing)\b|n't\b/i;
const yetPolarity = (known) => (!/\byet\b/i.test(known) ? null : NEG.test(known.replace(/’/g, "'")) ? 'negative' : 'positive');

function newIdsFor(dump) {
  const used = new Set(dump.phrases.map((p) => sid(p.id)));
  const n = new Map();
  return (lego, role) => {
    const L = role === 'build' ? 'B' : 'U';
    let i = n.get(lego + L) || 21;
    while (used.has(`${lego}${L}${i}`)) i++;
    n.set(lego + L, i + 1); used.add(`${lego}${L}${i}`);
    return `${lego}${L}${i}`;
  };
}

/** The plan applied to a dump (pure): post-state legos/phrases plus the inserted rows. */
function applyPlan(dump) {
  const legos = dump.legos.map((l) => (FLIPS[l.lego_id] !== undefined ? { ...l, is_new: FLIPS[l.lego_id] } : l));
  const byId = new Map(legos.map((l) => [l.lego_id, l]));
  const nextId = newIdsFor(dump);
  const live = new Map(dump.phrases.map((p) => [sid(p.id), p]));
  const maxPos = (lego) => Math.max(0, ...dump.phrases.filter((q) => legoOfPhrase(q) === lego).map((q) => q.position || 0));
  const posNext = new Map();
  const inserts = [];
  for (const [from, to, role] of MOVES) {
    const p = live.get(from), dest = byId.get(to);
    if (!p || !dest) continue;
    let position = POSITION_OF_MOVED[from];
    if (position == null) { position = (posNext.get(to) || maxPos(to)) + 1; posNext.set(to, position); }
    const row = { ...p, id: P(nextId(to, role)), seed_number: dest.seed_number, lego_index: dest.lego_index, lego_id: to, position, phrase_role: role,
      metadata: { ...(p.metadata || {}), moved_from: from, moved_by: `job ${JOB} deu yet/noch (P25)` } };
    delete row.course_code;
    inserts.push({ from, row });
  }
  const gone = new Set([...MOVES.map((m) => P(m[0])), ...DELETES.map((d) => P(d[0]))]);
  const rw = new Map(REWRITES.map(([s, , , k, t]) => [P(s), [k, t]]));
  const phrases = dump.phrases.filter((p) => !gone.has(p.id)).map((p) => {
    let q = p;
    if (rw.has(p.id)) q = { ...q, known_text: rw.get(p.id)[0], target_text: rw.get(p.id)[1] };
    const pos = POSITIONS[sid(p.id)];
    if (pos) q = { ...q, position: pos[1] };
    return q;
  }).concat(inserts.map((i) => i.row));
  return { ...dump, legos, phrases, inserts };
}

const promptRows = (d) => [
  ...d.legos.filter((l) => l.is_new !== false).map((l) => ({ id: l.lego_id, role: 'lego', known: l.known_text, target: l.target_text })),
  ...d.phrases.filter((p) => p.phrase_role !== 'component').map((p) => ({ id: sid(p.id), role: p.phrase_role, known: p.known_text, target: p.target_text })),
];

/** What must hold on the course once the rulings are applied — run on the plan's post-state (check) and on a fresh
 *  dump after apply (verify: fails on the course as it stood on 2026-10-14, passes once the batch has landed). */
function invariants(d) {
  const problems = [];
  const byId = new Map(d.legos.map((l) => [l.lego_id, l]));
  const legoOf = (p) => byId.get(`S${String(p.seed_number).padStart(4, '0')}L${String(p.lego_index).padStart(2, '0')}`);
  // rule 2, course-wide over played rows: negative yet ↔ noch; positive yet ↔ schon, never in a noch basket
  for (const p of d.phrases.filter((x) => x.phrase_role !== 'component')) {
    const l = legoOf(p); if (!l || !l.is_new) continue;
    const pol = yetPolarity(p.known_text), tw = T.words(p.target_text);
    if (pol === 'negative' && !tw.includes('noch')) problems.push(`negative yet without noch: ${sid(p.id)} "${p.known_text} | ${p.target_text}"`);
    if (pol === 'positive' && (!tw.includes('schon') || tw.includes('noch') || /noch/.test(l.target_text))) problems.push(`positive yet not schon: ${sid(p.id)}`);
  }
  // S0519L04's dark basket keeps only its own LEGO row
  const left = d.phrases.filter((p) => legoOfPhrase(p) === 'S0519L04' && p.phrase_role !== 'component').map((p) => sid(p.id));
  if (left.length) problems.push(`S0519L04 still holds ${left.join(', ')}`);
  // every S0519L02 row drills the whole LEGO
  for (const p of d.phrases.filter((x) => legoOfPhrase(x) === 'S0519L02' && x.phrase_role !== 'component'))
    if (!T.containsWords(p.target_text, 'ihr neues Baby')) problems.push(`${sid(p.id)} does not drill "ihr neues Baby"`);
  const yetLegos = d.legos.filter((l) => l.known_text === 'yet' && l.target_text === 'noch' && l.is_new).map((l) => l.lego_id);
  if (yetLegos.join() !== INTRO.lego) problems.push(`new "yet | noch" LEGOs: ${yetLegos.join(', ')} (only ${INTRO.lego} may be new)`);
  return problems;
}

function checkPlan(dump) {
  const problems = [];
  const live = new Map(dump.phrases.map((p) => [sid(p.id), p]));
  for (const id of Object.keys(FLIPS)) { const l = dump.legos.find((x) => x.lego_id === id); if (!l || l.known_text !== 'yet' || l.target_text !== 'noch') problems.push(`${id} drifted`); }
  const L60 = dump.legos.find((l) => l.lego_id === INTRO.lego);
  if (!L60 || !L60.is_new || L60.known_text !== 'yet' || L60.target_text !== 'noch') problems.push(`${INTRO.lego} is not the new "yet | noch"`);
  // a re-run finds earlier steps already landed: each row is either as it was or as the plan leaves it
  for (const [s, fk, ft, k, t] of REWRITES) {
    const p = live.get(s);
    if (!p) problems.push(`${s} not in dump`);
    else if (!(p.known_text === fk && p.target_text === ft) && !(p.known_text === k && p.target_text === t)) problems.push(`${s} drifted: "${p.known_text} | ${p.target_text}"`);
  }
  for (const [s, fk, ft] of DELETES) { const p = live.get(s); if (p && (p.known_text !== fk || p.target_text !== ft)) problems.push(`${s} drifted`); }
  const movedFrom = new Set(dump.phrases.map((p) => p.metadata && p.metadata.moved_from).filter(Boolean));
  for (const [s] of MOVES) if (!live.has(s) && !movedFrom.has(s)) problems.push(`${s} neither in place nor moved`);
  for (const [s, [a, b]] of Object.entries(POSITIONS)) if (![a, b].includes(live.get(s)?.position)) problems.push(`${s} position drifted`);

  const post = applyPlan(dump);
  const byId = new Map(post.legos.map((l) => [l.lego_id, l]));
  const first = T.firstIntro(post.legos), firstK = firstIntroKnown(post.legos);
  const legoOf = (p) => byId.get(`S${String(p.seed_number).padStart(4, '0')}L${String(p.lego_index).padStart(2, '0')}`);
  const judge = (label, p) => {
    const l = legoOf(p);
    if (!l || !l.is_new) return problems.push(`${label}: under ${l ? l.lego_id : '?'} which is not new (P25)`);
    if (!T.containsWords(p.target_text, l.target_text) || !T.containsWords(p.known_text, l.known_text)) problems.push(`${label}: "${p.known_text} | ${p.target_text}" does not contain ${l.lego_id} on both sides (P17)`);
    const ut = T.untaughtAt(p.target_text, l, first), uk = untaughtKnown(p.known_text, l, firstK);
    if (ut.length || uk.length) problems.push(`${label}: untaught at ${l.lego_id}: target [${ut}] known [${uk}]`);
  };
  for (const i of post.inserts) judge(`${i.from}→${sid(i.row.id)}`, i.row);
  for (const [s] of REWRITES) judge(s, post.phrases.find((p) => p.id === P(s)));
  // the intro's example is taught at the debut (both sides)
  { const ut = T.untaughtAt(INTRO.example.target, L60, first), uk = untaughtKnown(INTRO.example.known, L60, firstK);
    if (ut.length || uk.length) problems.push(`intro example untaught at ${INTRO.lego}: [${ut}] [${uk}]`); }
  // ZUT over every played prompt: a new or changed known must not meet a different target
  const byKnown = new Map();
  for (const r of promptRows(post)) { const k = key(r.known); if (!byKnown.has(k)) byKnown.set(k, new Map()); byKnown.get(k).set(key(r.target), r.id); }
  for (const k of [...REWRITES.map((r) => r[3]), ...post.inserts.map((i) => i.row.known_text)]) {
    const m = byKnown.get(key(k)); if (m && m.size > 1) problems.push(`ZUT: "${k}" → ${[...m.entries()].map(([t, id]) => `${id}: ${t}`).join(' / ')}`);
  }
  // duplicates inside the baskets this plan touches
  const touched = new Set([...post.inserts.map((i) => legoOfPhrase(i.row)), ...REWRITES.map((r) => r[0].slice(0, 8))]);
  const seen = new Map();
  for (const p of post.phrases.filter((x) => x.phrase_role !== 'component' && touched.has(legoOfPhrase(x)))) {
    const b = `${legoOfPhrase(p)}|${key(p.known_text)}|${key(p.target_text)}`;
    if (seen.has(b)) problems.push(`duplicate in basket: ${sid(p.id)} = ${seen.get(b)}`);
    seen.set(b, sid(p.id));
  }
  problems.push(...invariants(post));
  return problems;
}

// ── edit-batch ──
/** Only what has not landed yet (re-runs are safe: run 1 applied 68 ops, run 2 added the B01 delete). */
function textOps(dump) {
  const post = applyPlan(dump);
  const live = new Map(dump.phrases.map((p) => [sid(p.id), p]));
  const ops = [];
  for (const [id, v] of Object.entries(FLIPS)) if (dump.legos.find((l) => l.lego_id === id).is_new !== v) ops.push({ op: 'lego.update', lego_id: id, expect: { is_new: !v }, set: { is_new: v } });
  // highest first: (seed, lego, position) is unique, so each step down needs the place below it already vacated
  for (const [s, [a, b]] of Object.entries(POSITIONS).sort((x, y) => y[1][1] - x[1][1])) if (live.get(s).position !== b) ops.push({ op: 'phrase.update', phrase_id: P(s), expect: { position: a }, set: { position: b } });
  for (const i of post.inserts) {
    const was = dump.phrases.find((p) => p.id === P(i.from));
    ops.push({ op: 'phrase.insert', row: i.row });
    ops.push({ op: 'phrase.delete', phrase_id: was.id, expect: { known_text: was.known_text, target_text: was.target_text } });
  }
  for (const [s, fk, ft] of DELETES) if (live.has(s)) ops.push({ op: 'phrase.delete', phrase_id: P(s), expect: { known_text: fk, target_text: ft } });
  for (const [s, fk, ft, k, t] of REWRITES) {
    if (live.get(s).known_text === k && live.get(s).target_text === t) continue;
    const set = {}; if (k !== fk) set.known_text = k; if (t !== ft) set.target_text = t;
    ops.push({ op: 'phrase.update', phrase_id: P(s), expect: { known_text: fk, target_text: ft }, set });
  }
  return ops;
}
/** Slots whose words change: known if the English changed, both target slots if the German changed. */
function slotRequests(dump = null) {
  const out = [];
  const done = (s, k, t) => dump && dump.phrases.some((p) => p.id === P(s) && p.known_text === k && p.target_text === t);
  for (const [s, fk, ft, k, t] of REWRITES) {
    if (done(s, k, t)) continue;
    if (k !== fk) out.push({ phrase_id: P(s), role: 'known', text: k });
    if (t !== ft) out.push({ phrase_id: P(s), role: 'target1', text: t }, { phrase_id: P(s), role: 'target2', text: t });
  }
  return out;
}
function linkOps(audioMap, dump = null) {
  return slotRequests(dump).filter((r) => audioMap[`${r.role}|${r.text}`])
    .map((r) => ({ op: 'audio.link', target: 'phrase', phrase_id: r.phrase_id, slot: r.role, audio_id: audioMap[`${r.role}|${r.text}`] }));
}

module.exports = { invariants, INTRO, FLIPS, MOVES, DELETES, REWRITES, POSITIONS, TOUCHED_SEEDS, checkPlan, applyPlan, textOps, slotRequests, linkOps, yetPolarity, untaughtKnown };

if (require.main === module) {
  const [cmd, dumpPath, ...rest] = process.argv.slice(2);
  const opt = (f) => { const i = rest.indexOf(f); return i >= 0 ? rest[i + 1] : undefined; };
  if (!cmd || !dumpPath) { console.error('usage: check|renders|ops <dump.json> [--audio map.json] [--out file] [--apply] [--intro]'); process.exit(1); }
  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  if (cmd === 'check') {
    const pr = checkPlan(dump); console.log(pr.length ? pr.join('\n') : 'plan clean');
    for (const i of applyPlan(dump).inserts) console.log(`  move ${i.from} → ${sid(i.row.id)} (${i.row.phrase_role}, pos ${i.row.position}) ${i.row.known_text} | ${i.row.target_text}`);
    process.exit(pr.length ? 2 : 0);
  } else if (cmd === 'verify') {
    const pr = invariants(dump); console.log(pr.length ? pr.join('\n') : 'course holds the rulings'); process.exit(pr.length ? 2 : 0);
  } else if (cmd === 'ops') {
    const audio = opt('--audio') ? JSON.parse(fs.readFileSync(opt('--audio'), 'utf8')) : {};
    const ops = [...textOps(dump), ...linkOps(audio, dump)];
    fs.writeFileSync(opt('--out') || 'ops.json', JSON.stringify({ ops }, null, 1));
    console.log(`${ops.length} ops (${linkOps(audio, dump).length} audio links of ${slotRequests(dump).length} changed slots)`);
  } else if (cmd === 'renders') {
    const apply = rest.includes('--apply');
    const reqs = slotRequests(dump).filter((r, i, a) => a.findIndex((x) => x.role === r.role && x.text === r.text) === i);
    if (rest.includes('--intro')) reqs.push({ role: 'presentation', text: INTRO.text, lego_id: INTRO.lego });
    const map = {}; let chars = 0, refused = 0;
    for (const r of reqs) {
      const args = [path.join(__dirname, '..', 'audio', 'render.cjs'), '--course', COURSE, '--role', r.role, '--text', r.text, '--purpose', `${JOB} deu yet/noch + 519 baby: ${r.lego_id || sid(r.phrase_id)}`, '--job', JOB];
      if (r.role === 'presentation') args.push('--lego', r.lego_id);
      if (!apply) args.push('--dry-run');
      const res = spawnSync('node', args, { encoding: 'utf8', env: { ...process.env, AGENT_ID: 'kai-watson-494' } });
      let out = {}; try { out = JSON.parse(res.stdout); } catch (_) { out = { ok: false, error: (res.stdout || res.stderr || '').slice(-300) }; }
      if (!out.ok) { refused++; console.log(`REFUSED ${r.role} "${r.text}": ${JSON.stringify(out).slice(0, 300)}`); continue; }
      chars += out.charsSpent || out.wouldSpendChars || 0;
      if (out.audioId) map[`${r.role}|${r.text}`] = out.audioId;
      console.log(`${out.source}${out.dryRun ? ' (dry)' : ''} ${r.role} "${r.text}" ${out.charsSpent || out.wouldSpendChars || 0} chars ${out.audioId || ''}${out.legoLinked ? ' (bound to LEGO)' : ''}`);
    }
    console.log(`TOTAL ${apply ? 'spent' : 'would spend'} ${chars} chars over ${reqs.length} clips, ${refused} refused`);
    if (opt('--out')) fs.writeFileSync(opt('--out'), JSON.stringify(map, null, 1));
  }
}
