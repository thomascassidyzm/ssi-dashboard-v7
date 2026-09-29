#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-sicuro-di-wh-2026-09-29.cjs
//
// ita_for_eng — Kai's ruling, 2026-09-29 (job #733·I): "non sono sicuro DI cosa farò", "non sono sicuro DI come
// si dice". A Northern speaker says it without di; everywhere else it sounds wrong, so the course says
// sicuro + di + question word, consistently (canon L29: one form per kind of thing that follows).
//
// WHERE DI IS TAUGHT. Before this job no LEGO carried it: seed 80 "I'm not sure when I'll be ready | non sono
// sicuro di quando sarò pronto" already said di, but its LEGOs were "I'm not sure | non sono sicuro" (not new,
// a duplicate of S0010L02) + "when I'll be ready | quando sarò pronto", so di sat in no LEGO (L27 gap) and the
// basket that taught "I'm not sure" (seed 10) drilled "non sono sicuro come…" with no di. Seed 80 is the FIRST
// seed whose sentence puts a question word after sicuro, and seed 10's own sentence says "sicuro se" (so its
// LEGO cannot take di — L26). So S0080L01 GROWS on both sides into the fuller chunk (L29):
//     "I'm not sure | non sono sicuro"  →  "I'm not sure when | non sono sicuro di quando"
// with components "I'm not sure | non sono sicuro" + "of | di" + "when | quando" (literal, L11; di stands alone
// as a component so later "di come / di cosa" rows are licensed, K29). It no longer duplicates S0010L02 on
// either side, so it is NEW (L31) — template intro and a played basket (P25). S0080L02 "when I'll be ready"
// keeps its slot and its basket; the two overlap on "quando" by design (S4, the L29 worked example).
//
// BEFORE SEED 80 the construction cannot carry di (untaught — P1, the P27 shape) and may not go without it
// (the ruling), so those rows leave the construction: rewritten from words taught at their seed, each still
// containing its LEGO (P17), or deleted where a build fragment has nothing left to build (a phrase may go).
// AFTER seed 80 every sicuro + question word row says di (S0241L01U09 was the one that did not).
// No seed sentence lacked di (80 and 202 already had it), so no seed text changes. 'sicuro se' / 'sicuro che'
// are listed by the census and never touched.
//
//   node tools/course-optimization/ita-sicuro-di-wh-2026-09-29.cjs            # dry run: census + plan + guards
//   APPLY=1 node tools/course-optimization/ita-sicuro-di-wh-2026-09-29.cjs    # content, then audio via the ONE route
//   AUDIO_ONLY=1 node …                                                        # audio step alone (links, one render each, no retries)
//   CHECK=1 node …                                                             # end-state rule on the live course
//
// AUDIO: only through POST /api/audio/render on production Popty (Tom, 2026-09-29) — dry run first, one real
// call per slot, never a retry; a refusal is recorded as a gap. A returned clip in the wrong voice is NOT linked.
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const JOB = '#733·I';
const SWEEP = 'ita-sicuro-di-wh-2026-09-29';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = "Kai, 2026-09-29 (job #733·I): sicuro + question word takes di everywhere (non sono sicuro di cosa/come/quando…); di taught at first use by growing S0080L01 to 'I'm not sure when | non sono sicuro di quando' (new, intro, basket); earlier rows leave the construction; later rows take di";
const TEACH_SEED = 80;
const VOICES = { known: 'en-GB-SoniaNeural', target1: 'it-IT-ElsaNeural', target2: 'it-IT-BenignoNeural', presentation: 'en-GB-SoniaNeural' };
const voiceOk = (want, got) => String(got || '').replace(/^azure_/, '') === want;

// ── The rule ───────────────────────────────────────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»“”]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
const WH = "(?:che cosa|cosa|come|dove|quando|perch[eé]|chi|quale|quali|qual|quant[oaie])";
/** sicuro/a/i/e directly followed by a question word — the form Kai ruled out. ("sicuro che" alone is "that".) */
const BARE = new RegExp(`\\bsicur[oaie] ${WH}(?= |$)`);
/** sicuro + di + question word — the form Kai ruled in. */
const WITH_DI = new RegExp(`\\bsicur[oaie] di ${WH}(?= |$)`);
/** Named exception: "un posto sicuro dove parcheggiare" (seed 510) is sicuro = SAFE with a relative dove, not "sure". */
const SAFE_PLACE = /\bposto sicur[oaie] /;
const bareSicuroWh = (t) => BARE.test(norm(t)) && !SAFE_PLACE.test(norm(t));
const sicuroDiWh = (t) => WITH_DI.test(norm(t));
function containsWords(hay, needle) {
  const h = words(hay);
  for (const w of words(needle)) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); }
  return true;
}
function legoPosition(phraseTarget, legoTarget) {
  const p = norm(phraseTarget), l = norm(legoTarget);
  if (p === l) return null;
  if (p.startsWith(l + ' ')) return 'start';
  if (p.endsWith(' ' + l)) return 'end';
  return null;
}
const short = (id) => String(id).replace(/^ita_for_eng:/, '');
/**
 * target1 (Elsa) speaks the row's FEMALE READING (course_gender_expansions.expanded_f → target1): only the speaker's
 * own forms move — "sono sicuro" → "sicura", "sarò pronto" → "pronta"; "nessuno era sicuro" names somebody else.
 */
function femaleReading(target) {
  return String(target).replace(/\b(sono) sicuro\b/g, '$1 sicura').replace(/\b(sarò) pronto\b/g, '$1 pronta');
}
const full = (id) => (String(id).startsWith(`${COURSE}:`) ? id : `${COURSE}:${id}`);

// ── The plan ───────────────────────────────────────────────────────────────────────────────
const LEGO = {
  id: 'S0080L01', seed: 80,
  from: { known: "I'm not sure", target: 'non sono sicuro', is_new: false, components: [{ known: 'not', target: 'non' }, { known: 'sure', target: 'sicuro' }] },
  to: { known: "I'm not sure when", target: 'non sono sicuro di quando', is_new: true, components: [{ known: "I'm not sure", target: 'non sono sicuro' }, { known: 'of', target: 'di' }, { known: 'when', target: 'quando' }] },
  // the course's template, as S0607L02 / S0043L02 carry it; quotes the LEGO, example = the seed sentence
  intro: "The Italian for: 'I'm not sure when', as in — 'I'm not sure when I'll be ready', is:",
};
const E = (id, lego, before, after, why) => ({ id, lego, before, after, why });
const EDITS = [
  // seed 10 — S0010L02 "I'm not sure | non sono sicuro" plays before L03 "if | se": words from seeds 1–9 and 10 L01 posso
  E('S0010L02U01', 'S0010L02', { known: "I'm not sure how to explain", target: 'non sono sicuro come spiegare' }, { known: "I'm not sure, I want to try", target: 'non sono sicuro, voglio provare' }, 'before di is taught (80): leaves the construction; voglio 1, provare 7'),
  E('S0010L02U02', 'S0010L02', { known: "I'm not sure how to say what I mean", target: 'non sono sicuro come dire quello che intendo' }, { known: "I'm not sure, I can try", target: 'non sono sicuro, posso provare' }, 'posso 10 L01, provare 7'),
  E('S0010L02U04', 'S0010L02', { known: "I'm not sure how to explain a word in Italian", target: 'non sono sicuro come spiegare una parola in italiano' }, { known: "I'm not sure, I'm trying to remember", target: 'non sono sicuro, sto provando a ricordare' }, 'sto provando a 2, ricordare 6'),
  E('S0010L02U05', 'S0010L02', { known: "I'm not sure how to speak Italian", target: 'non sono sicuro come parlare italiano' }, { known: "I'm not sure, I can try to explain", target: 'non sono sicuro, posso provare a spiegare' }, 'posso 10, provare a 8, spiegare 8'),
  E('S0010L02U06', 'S0010L02', { known: "I'm not sure how to learn", target: 'non sono sicuro come imparare' }, { known: "I'm not sure, I'm going to try", target: 'non sono sicuro, sto per provare' }, "sto per 5 ('I'm going to'), provare 7"),
  // seed 12 — S0012L03 "what's going to happen | cosa succederà"
  E('S0012L03B03', 'S0012L03', { known: "I'm not sure what's going to happen", target: 'non sono sicuro cosa succederà' }, { known: "to try to guess what's going to happen", target: 'provare a indovinare cosa succederà' }, 'builds on B02 "to guess what\'s going to happen"; provare a 8'),
  E('S0012L03U01', 'S0012L03', { known: "I'm not sure what's going to happen", target: 'non sono sicuro cosa succederà' }, { known: "I'm trying to guess what's going to happen", target: 'sto provando a indovinare cosa succederà' }, 'was an exact twin of B03; sto provando a 2, indovinare 12 L02'),
  // seed 17 — S0017L02 "what is | qual è", S0017L03 "the answer | la risposta"
  E('S0017L02U05', 'S0017L02', { known: "I'm not sure what it is", target: 'non sono sicuro qual è' }, { known: "I'm trying to remember what it is", target: 'sto provando a ricordare qual è' }, 'sto provando a 2, ricordare 6'),
  E('S0017L03U01', 'S0017L03', { known: "I'm not sure what the answer is", target: 'non sono sicuro qual è la risposta' }, { known: "I'd like to find out what the answer is", target: 'mi piacerebbe scoprire qual è la risposta' }, 'mi piacerebbe 11, scoprire 17 L01'),
  // seed 20 — S0020L02 "his name | il suo nome"
  E('S0020L02U02', 'S0020L02', { known: "I'm not sure what his name is", target: 'non sono sicuro qual è il suo nome' }, { known: "I'm trying to remember what his name is", target: 'sto provando a ricordare qual è il suo nome' }, 'U03 is "I\'m trying to remember his name" — this keeps the qual è'),
  // seed 43 — already had di, 37 seeds before di is taught, and a fragment (not standalone — USE doctrine)
  E('S0043L02U06', 'S0043L02', { known: 'sure how to answer', target: 'sicuro di come rispondere' }, { known: "I'm trying to remember how to answer", target: 'sto provando a ricordare come rispondere' }, 'sicuro di come before 80 is untaught, and "sure how to answer" is a fragment'),
  // after seed 80 — the one row without di
  E('S0241L01U09', 'S0241L01', { known: "I want to give it to him but I'm not sure when", target: 'voglio darglielo ma non sono sicuro quando' }, { known: "I want to give it to him but I'm not sure when", target: 'voglio darglielo ma non sono sicuro di quando' }, 'di (the ruling); English unchanged, clip kept'),
];
const DELETES = [
  { id: 'S0010L02B02', known: "I'm not sure how", target: 'non sono sicuro come', why: 'build fragment toward "how" — before di is taught it cannot say di and may not go without it; seed 10 builds with se (L03), not a question word' },
  { id: 'S0017L02B03', known: "I'm not sure what is", target: 'non sono sicuro qual è', why: 'build fragment; the basket keeps B01 "what is" and B02 "to find out what is"' },
];
// the components (phrase_role component) follow the LEGO's components
const COMPONENTS = [
  { id: 'S0080L01C01', before: { known: 'not', target: 'non' }, after: { known: "I'm not sure", target: 'non sono sicuro' } },
  { id: 'S0080L01C02', before: { known: 'sure', target: 'sicuro' }, after: { known: 'of', target: 'di' } },
];
const COMPONENT_ADDS = [{ id: 'S0080L01C03', known: 'when', target: 'quando' }];
// S0080L01's played basket: every row contains "non sono sicuro di quando"; words taught before seed 80
const A = (id, role, known, target) => ({ id, role, known, target, lego: 'S0080L01', lego_index: 1 });
const ADDS = [
  A('S0080L01B01', 'build', "I'm not sure when", 'non sono sicuro di quando'),
  A('S0080L01B02', 'build', "I'm not sure when I can", 'non sono sicuro di quando posso'),
  A('S0080L01B03', 'build', "I'm not sure when I can speak Italian", 'non sono sicuro di quando posso parlare italiano'),
  A('S0080L01U01', 'use', "I'm not sure when I can explain", 'non sono sicuro di quando posso spiegare'),
  A('S0080L01U02', 'use', "I'm not sure when I can answer", 'non sono sicuro di quando posso rispondere'),
  A('S0080L01U03', 'use', "I'm not sure when I can find out the answer", 'non sono sicuro di quando posso scoprire la risposta'),
  A('S0080L01U04', 'use', "I'm not sure when I can speak Italian with you", 'non sono sicuro di quando posso parlare italiano con te'),
  A('S0080L01U05', 'use', "I'm not sure when I can practise speaking with someone else", 'non sono sicuro di quando posso fare pratica parlando con qualcun altro'),
];
const SEEDS_TO_UNAPPROVE = [10, 12, 17, 20, 43, 80, 241];
const seedOf = (id) => Number(String(short(id)).slice(1, 5));

/**
 * The end-state rule (tested): (1) no row says sicuro + question word without di; (2) no row BEFORE the seed that
 * teaches it says sicuro di + question word; (3) the teaching LEGO is new and carries it; (4) every non-component
 * row under it contains it; (5) "I'm not sure when" has one Italian (ZUT).
 */
function endStateProblems(rows) {
  const out = [];
  for (const r of rows) {
    if (bareSicuroWh(r.target)) out.push(`${r.id}: sicuro + question word without di — "${r.target}"`);
    if (r.sn < TEACH_SEED && sicuroDiWh(r.target)) out.push(`${r.id}: sicuro di + question word at seed ${r.sn}, before it is taught (${TEACH_SEED}) — "${r.target}"`);
  }
  const lego = rows.find((r) => r.kind === 'lego' && r.id === LEGO.id);
  if (!lego || !lego.is_new || !sicuroDiWh(lego.target)) out.push(`${LEGO.id} does not teach sicuro di + question word as a NEW LEGO`);
  else {
    for (const p of rows.filter((r) => ['build', 'use'].includes(r.kind) && r.id.startsWith(LEGO.id)))
      if (!containsWords(p.known, lego.known) || !containsWords(p.target, lego.target)) out.push(`${p.id} does not contain ${LEGO.id}`);
    if (!rows.some((r) => ['build', 'use'].includes(r.kind) && r.id.startsWith(LEGO.id))) out.push(`${LEGO.id} has no played basket`);
  }
  const targets = new Set(rows.filter((r) => r.kind !== 'component' && norm(r.known) === norm(LEGO.to.known)).map((r) => norm(r.target)));
  if (targets.size > 1) out.push(`ZUT: "${LEGO.to.known}" → ${[...targets].join(' / ')}`);
  return out;
}

/** The plan applied to a row snapshot (tested, no DB). */
function applyPlanToRows(rows) {
  const del = new Set(DELETES.map((d) => d.id));
  const ed = Object.fromEntries([...EDITS, ...COMPONENTS].map((e) => [e.id, e.after]));
  const outRows = rows.filter((r) => !del.has(r.id)).map((r) => {
    if (r.kind === 'lego' && r.id === LEGO.id) return { ...r, known: LEGO.to.known, target: LEGO.to.target, is_new: true, components: LEGO.to.components };
    return ed[r.id] ? { ...r, ...ed[r.id] } : r;
  });
  for (const a of [...ADDS.map((a) => ({ ...a, kind: a.role })), ...COMPONENT_ADDS.map((c) => ({ ...c, kind: 'component' }))]) outRows.push({ kind: a.kind, sn: seedOf(a.id), id: a.id, known: a.known, target: a.target });
  return outRows;
}

/** Guards against the live snapshot: every before-text matches, every after-row contains its LEGO. */
function planProblems(rows) {
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  const probs = [];
  const lego = byId[LEGO.id];
  if (!lego || lego.known !== LEGO.from.known || lego.target !== LEGO.from.target || lego.is_new !== false) probs.push(`${LEGO.id} live text/is_new differs from the plan's before`);
  for (const e of [...EDITS, ...COMPONENTS]) {
    const r = byId[e.id];
    if (!r || r.known !== e.before.known || r.target !== e.before.target) probs.push(`${e.id}: live row differs from the plan's before (${r ? `"${r.known}" | "${r.target}"` : 'missing'})`);
  }
  for (const d of DELETES) { const r = byId[d.id]; if (!r || r.known !== d.known || r.target !== d.target) probs.push(`${d.id}: live row differs (delete)`); }
  for (const a of [...ADDS, ...COMPONENT_ADDS]) if (byId[a.id]) probs.push(`${a.id} already exists`);
  for (const e of EDITS) {
    const l = e.lego === LEGO.id ? LEGO.to : byId[e.lego];
    if (!l || !containsWords(e.after.known, l.known) || !containsWords(e.after.target, l.target)) probs.push(`${e.id} would not contain ${e.lego}`);
  }
  return probs;
}

// ── DB ─────────────────────────────────────────────────────────────────────────────────────
async function loadRows(pg) {
  const { rows } = await pg.query(
    `SELECT 'lego' AS kind, seed_number AS sn, lego_id AS id, known_text AS known, target_text AS target, components, is_new FROM course_legos WHERE course_code=$1
     UNION ALL SELECT phrase_role, seed_number, id, known_text, target_text, NULL, NULL FROM course_practice_phrases WHERE course_code=$1
     UNION ALL SELECT 'seed', seed_number, seed_id, known_text, target_text, NULL, NULL FROM course_seeds WHERE course_code=$1 ORDER BY 2, 3`, [COURSE]);
  return rows.map((r) => ({ ...r, sn: Number(r.sn), id: short(r.id) }));
}
/** Census of every sicuro row: the bare question-word hits, the di hits, and sicuro se / sicuro che (listed, never changed). */
async function census(pg) {
  const rows = (await loadRows(pg)).filter((r) => /\bsicur[oaie]\b/.test(norm(r.target)));
  const { rows: audio } = await pg.query(`SELECT id, role, voice_id, text FROM course_audio WHERE course_code=$1 AND text ~* 'sicur[oaie] '`, [COURSE]);
  return {
    bare: rows.filter((r) => bareSicuroWh(r.target)), withDi: rows.filter((r) => sicuroDiWh(r.target)),
    se: rows.filter((r) => /\bsicur[oaie] se\b/.test(norm(r.target))), che: rows.filter((r) => /\bsicur[oaie] che\b/.test(norm(r.target)) && !/\bsicur[oaie] che cosa\b/.test(norm(r.target))),
    audioBare: audio.filter((a) => bareSicuroWh(a.text)),
  };
}
/** A word is taught at seed N if any row at or before N carries it. */
async function untaught(pg, seed, text, side) {
  const col = side === 'known' ? 'known_text' : 'target_text';
  const out = [];
  for (const w of new Set(words(text))) {
    const { rows } = await pg.query(
      `SELECT 1 FROM (SELECT seed_number, ${col} AS t FROM course_practice_phrases WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_legos WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_seeds WHERE course_code=$1) x
       WHERE seed_number <= $2 AND ' '||regexp_replace(lower(replace(t,'’','''')), '[.,!?;:"]', ' ', 'g')||' ' LIKE '% '||$3||' %' LIMIT 1`, [COURSE, seed, w]);
    if (!rows.length) out.push(`${side === 'known' ? 'en' : 'it'}:${w}`);
  }
  return out;
}
async function vocabularyGuards(pg) {
  const probs = [];
  for (const r of [...EDITS.map((e) => ({ id: e.id, ...e.after })), ...ADDS]) {
    const u = [...await untaught(pg, seedOf(r.id), r.known, 'known'), ...await untaught(pg, seedOf(r.id), r.target, 'target')];
    if (u.length) probs.push(`${r.id} at seed ${seedOf(r.id)} uses untaught words: ${u.join(', ')}`);
  }
  return probs;
}
/** ZUT against the live course for every pair written: one English → two Italians is a HOLD. */
async function zutAgainstCourse(pg) {
  const pairs = [...EDITS.map((e) => ({ id: e.id, ...e.after })), ...ADDS, { id: LEGO.id, ...LEGO.to }];
  const ours = new Set([...pairs.map((p) => p.id), ...DELETES.map((d) => d.id)]);
  const clashes = [];
  for (const p of pairs) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)`, [COURSE, p.known, p.target]);
    for (const r of rows.filter((r) => !ours.has(short(r.id)))) clashes.push(`${p.id} "${p.known}" → "${p.target}" vs ${short(r.id)} → "${r.target_text}"`);
  }
  return clashes;
}

async function applyContent(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: op, scope, detail });
  log.approvedBefore = Object.fromEntries((await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, SEEDS_TO_UNAPPROVE])).rows.map((r) => [r.seed_number, r.approved_at]));
  const allEdits = [...EDITS, ...COMPONENTS];
  const Ev = {};
  Ev.lego = await ev('lego-edit', { seed_numbers: [80], lego_ids: [LEGO.id], rows: 1 }, { ruling: RULING, job: JOB, changes: [{ id: LEGO.id, from: LEGO.from, to: LEGO.to, why: 'grown on both sides to teach sicuro di + question word at first use (L29); no longer a duplicate of S0010L02 → new (L31)' }] });
  Ev.phrase = await ev('phrase-edit', { seed_numbers: [...new Set(allEdits.map((e) => seedOf(e.id)))], phrase_ids: allEdits.map((e) => full(e.id)), rows: allEdits.length }, { ruling: RULING, job: JOB, changes: allEdits.map((e) => ({ id: full(e.id), from: e.before, to: e.after, why: e.why || 'component follows the LEGO' })) });
  Ev.add = await ev('phrase-add', { seed_numbers: [80], phrase_ids: [...ADDS, ...COMPONENT_ADDS].map((a) => full(a.id)), rows: ADDS.length + COMPONENT_ADDS.length }, { ruling: RULING, job: JOB, rows: [...ADDS, ...COMPONENT_ADDS].map((a) => ({ id: full(a.id), lego: LEGO.id, known: a.known, target: a.target })) });
  Ev.del = await ev('phrase-delete', { seed_numbers: [10, 17], phrase_ids: DELETES.map((d) => full(d.id)), rows: DELETES.length }, { ruling: RULING, job: JOB, rows: DELETES.map((d) => ({ id: full(d.id), known: d.known, target: d.target, why: d.why })) });
  Ev.unapprove = await ev('unapprove', { seed_numbers: SEEDS_TO_UNAPPROVE, rows: SEEDS_TO_UNAPPROVE.length }, { why: 'seeds whose LEGO or phrases this job edited — Kai should read them', job: JOB, approved_at_before: log.approvedBefore });
  log.events = Ev;
  const legoTargets = {};
  for (const id of [...new Set(EDITS.map((e) => e.lego))]) legoTargets[id] = id === LEGO.id ? LEGO.to.target : (await pg.query('SELECT target_text FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, id])).rows[0].target_text;
  await pg.query('BEGIN');
  try {
    const u = await pg.query(`UPDATE course_legos SET known_text=$1, target_text=$2, components=$3, is_new=true, last_edit_event_id=$4, updated_at=now()
      WHERE course_code=$5 AND lego_id=$6 AND known_text=$7 AND target_text=$8 AND is_new=false`, [LEGO.to.known, LEGO.to.target, JSON.stringify(LEGO.to.components), Ev.lego, COURSE, LEGO.id, LEGO.from.known, LEGO.from.target]);
    if (u.rowCount !== 1) throw new Error(`${LEGO.id}: ${u.rowCount} rows`);
    // text edits: the trigger null_phrase_audio_on_text_change drops the clip of a changed side (the asset is kept)
    for (const c of allEdits) {
      const r = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL,
          lego_position=$5, last_edit_event_id=$6, updated_at=now() WHERE course_code=$7 AND id=$8 AND known_text=$9 AND target_text=$10`,
        [c.after.known, c.after.target, c.after.target.length, c.after.target.split(/\s+/).length, c.lego ? legoPosition(c.after.target, legoTargets[c.lego]) : null, Ev.phrase, COURSE, full(c.id), c.before.known, c.before.target]);
      if (r.rowCount !== 1) throw new Error(`${c.id}: ${r.rowCount} rows`);
    }
    const { rows: [m] } = await pg.query('SELECT coalesce(max(position),0) AS m FROM course_practice_phrases WHERE course_code=$1 AND seed_number=80', [COURSE]);
    let pos = Number(m.m);
    for (const a of [...ADDS, ...COMPONENT_ADDS.map((c) => ({ ...c, role: 'component' }))]) {
      const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, last_edit_event_id)
        VALUES ($1,$2,80,1,$3,$4,$5,$6,$7,$8,'draft',$9,'{}',$10,$11,true,$12)`,
        [full(a.id), COURSE, ++pos, a.known, a.target, a.target.length, a.target.split(/\s+/).length, JSON.stringify({ format: 'build_use', source: SWEEP, job: JOB }), a.role, a.role === 'component' ? null : legoPosition(a.target, LEGO.to.target), LEGO.id, Ev.add]);
      if (ins.rowCount !== 1) throw new Error(`${a.id}: insert ${ins.rowCount}`);
    }
    for (const d of DELETES) {
      const del = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, full(d.id), d.known, d.target]);
      if (del.rowCount !== 1) throw new Error(`${d.id}: delete ${del.rowCount}`);
    }
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [Ev.unapprove, COURSE, SEEDS_TO_UNAPPROVE]);
    log.unapproved = { seeds: SEEDS_TO_UNAPPROVE, rows: un.rowCount };
    const { rows: [cnt] } = await pg.query('SELECT count(*)::int AS n FROM course_legos WHERE course_code=$1 AND seed_number=80', [COURSE]);
    if (cnt.n !== 2) throw new Error(`LEGO count in 80 is ${cnt.n}, expected 2 — never delete a LEGO`);
    const probs = endStateProblems(await loadRows(pg));
    if (probs.length) throw new Error('end state does not hold inside the transaction:\n  ' + probs.join('\n  '));
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: sicuro di + question word — S0080L01 grown (new, intro), ${EDITS.length} phrases edited, ${ADDS.length + COMPONENT_ADDS.length} added, ${DELETES.length} deleted; slots filled by the tool through /api/audio/render`, metadata: { job: JOB, seeds: SEEDS_TO_UNAPPROVE } });
}

// ── Audio: the ONE route ───────────────────────────────────────────────────────────────────
async function render(body) {
  const base = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
  const res = await fetch(`${base}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': `${SWEEP} (job ${JOB})` }, body: JSON.stringify(body) });
  const out = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  return { status: res.status, ...out };
}
/** Every empty slot on a row this job wrote (LEGO, phrases, components) plus the intro. */
async function emptySlots(pg) {
  const ids = [...EDITS, ...COMPONENTS, ...ADDS, ...COMPONENT_ADDS].map((r) => full(r.id));
  const { rows: phr } = await pg.query('SELECT id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)', [COURSE, ids]);
  const { rows: [l] } = await pg.query('SELECT lego_id AS id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, LEGO.id]);
  const out = [];
  for (const r of [...phr.map((p) => ({ ...p, table: 'course_practice_phrases' })), { ...l, table: 'course_legos' }]) {
    if (!r.known_audio_id) out.push({ table: r.table, id: r.id, slot: 'known', text: r.known_text });
    if (!r.target1_audio_id) out.push({ table: r.table, id: r.id, slot: 'target1', text: r.target_text });
    if (!r.target2_audio_id) out.push({ table: r.table, id: r.id, slot: 'target2', text: r.target_text });
  }
  if (!l.presentation_audio_id) out.push({ table: 'course_legos', id: LEGO.id, slot: 'presentation', text: LEGO.intro });
  return out;
}
async function fillAudio(pg, log) {
  const slots = await emptySlots(pg);
  log.audio = [];
  // one request per distinct (role, text): dry run first, then ONE real call; a refusal is the answer
  const keyOf = (s) => `${s.slot}\u0000${s.text}`;
  const jobs = [...new Map(slots.map((s) => [keyOf(s), s])).values()];
  for (const s of jobs) {
    const body = { courseCode: COURSE, role: s.slot, text: s.text, voiceId: VOICES[s.slot], purpose: `Kai 2026-09-29 sicuro di + question word (${short(s.id)})`, ...(s.slot === 'presentation' ? { legoId: LEGO.id } : {}) };
    const dry = await render({ ...body, dryRun: true });
    const entry = { role: s.slot, text: s.text, dry: { status: dry.status, source: dry.source, code: dry.code, wouldSpendChars: dry.wouldSpendChars, audioId: dry.audioId } };
    log.audio.push(entry);
    if (!dry.ok) { entry.result = `REFUSED on dry run: ${dry.code || dry.status} ${dry.error || ''}`; continue; }
    const real = await render(body);
    entry.real = { status: real.status, source: real.source, code: real.code, audioId: real.audioId, charsSpent: real.charsSpent, error: real.error };
    if (!real.ok || !real.audioId) { entry.result = `REFUSED: ${real.code || real.status} ${real.error || ''}`; continue; }
    // Seen 2026-09-29 08:36Z: target2 answered source 'rendered' with charsSpent 0 — the door handed back the Elsa clip it
    // had just made for target1 (existingClip) and the route stored those bytes as a new Benigno row (F0 ~232 Hz, Benigno
    // ~136 Hz). A render that spent nothing is not a render: never link it.
    if (real.source === 'rendered' && !real.charsSpent) { entry.result = `NOT LINKED — 'rendered' with 0 chars spent: another clip's bytes under ${VOICES[s.slot]}`; entry.clip = null; continue; }
    const { rows: [clip] } = await pg.query('SELECT id, voice_id, text, duration_ms, s3_key FROM course_audio WHERE id=$1', [real.audioId]);
    entry.clip = clip;
    if (!clip || !voiceOk(VOICES[s.slot], clip.voice_id)) { entry.result = `NOT LINKED — route returned a ${clip?.voice_id} clip for ${s.slot} (wanted ${VOICES[s.slot]})`; continue; }
    if (norm(clip.text) !== norm(s.text)) { entry.result = `NOT LINKED — route returned a clip whose text is "${clip.text}"`; continue; }
    entry.result = real.source;
  }
  // link: every slot whose (role, text) came back good
  const good = new Map(log.audio.filter((a) => a.clip && ['library', 'rendered'].includes(a.result)).map((a) => [`${a.role}\u0000${a.text}`, a.clip.id]));
  const linked = [];
  for (const s of slots) {
    const id = good.get(keyOf(s)); if (!id) continue;
    if (s.slot === 'presentation') {
      await pg.query('UPDATE course_legos SET presentation_audio_id=$1 WHERE course_code=$2 AND lego_id=$3 AND presentation_audio_id IS NULL', [id, COURSE, LEGO.id]);
      const up = await pg.query('UPDATE lego_introductions SET presentation_audio_id=$1, audio_uuid=$1, updated_at=now() WHERE course_code=$2 AND lego_id=$3', [id, COURSE, LEGO.id]);
      if (!up.rowCount) await pg.query('INSERT INTO lego_introductions (course_code, lego_id, audio_uuid, presentation_audio_id) VALUES ($1,$2,$3,$3)', [COURSE, LEGO.id, id]);
      await pg.query('UPDATE course_audio SET lego_id=$1 WHERE id=$2 AND lego_id IS NULL', [LEGO.id, id]);
    } else {
      const col = `${s.slot}_audio_id`;
      const where = s.table === 'course_legos' ? 'lego_id=$3' : 'id=$3';
      await pg.query(`UPDATE ${s.table} SET ${col}=$1 WHERE course_code=$2 AND ${where} AND ${col} IS NULL`, [id, COURSE, s.id]);
    }
    linked.push(`${short(s.id)}.${s.slot}`);
  }
  log.linked = linked;
}
/** Verify: no NULL slot, target1 ≠ target2 (clip id and duration), right voices, the intro mirrors. */
async function verifyAudio(pg) {
  const ids = [...EDITS, ...COMPONENTS, ...ADDS, ...COMPONENT_ADDS].map((r) => full(r.id));
  const { rows } = await pg.query(`SELECT x.id, x.known_audio_id k, x.target1_audio_id t1, x.target2_audio_id t2, ak.voice_id kv, a1.voice_id v1, a2.voice_id v2, a1.duration_ms d1, a2.duration_ms d2, a1.text x1, a2.text x2, x.target_text
    FROM (SELECT id, known_audio_id, target1_audio_id, target2_audio_id, target_text FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)
          UNION ALL SELECT lego_id, known_audio_id, target1_audio_id, target2_audio_id, target_text FROM course_legos WHERE course_code=$1 AND lego_id=$3) x
    LEFT JOIN course_audio ak ON ak.id=x.known_audio_id LEFT JOIN course_audio a1 ON a1.id=x.target1_audio_id LEFT JOIN course_audio a2 ON a2.id=x.target2_audio_id ORDER BY 1`, [COURSE, ids, LEGO.id]);
  const probs = [];
  for (const r of rows) {
    const id = short(r.id);
    if (!r.k || !r.t1 || !r.t2) probs.push(`${id}: NULL slot (${['known', 'target1', 'target2'].filter((s, i) => ![r.k, r.t1, r.t2][i]).join(', ')})`);
    if (r.t1 && r.t2 && (r.t1 === r.t2 || (r.d1 === r.d2 && r.d1 != null))) probs.push(`${id}: target1 and target2 are the same clip or the same duration (${r.t1}/${r.t2}, ${r.d1}/${r.d2} ms)`);
    if (r.t1 && !voiceOk(VOICES.target1, r.v1) && !/xai_|elevenlabs/.test(r.v1 || '')) probs.push(`${id}: target1 voice ${r.v1}`);
    if (r.t2 && !voiceOk(VOICES.target2, r.v2) && !/xai_|elevenlabs/.test(r.v2 || '')) probs.push(`${id}: target2 voice ${r.v2}`);
    if (r.t1 && norm(r.x1) !== norm(r.target_text) && norm(r.x1) !== norm(femaleReading(r.target_text))) probs.push(`${id}: target1 clip says "${r.x1}"`);
    if (r.t2 && norm(r.x2) !== norm(r.target_text)) probs.push(`${id}: target2 clip says "${r.x2}"`);
  }
  const { rows: [p] } = await pg.query(`SELECT a.text FROM course_legos l LEFT JOIN course_audio a ON a.id::text=l.presentation_audio_id WHERE l.course_code=$1 AND l.lego_id=$2`, [COURSE, LEGO.id]);
  if (!p?.text) probs.push(`${LEGO.id}: intro SILENT`); else if (p.text !== LEGO.intro) probs.push(`${LEGO.id}: intro clip says "${p.text}"`);
  return { rows, probs };
}

/**
 * The 19 target2 rows the route wrote at 08:36–08:38Z on 2026-09-29 carry Elsa's bytes under Benigno's name (measured:
 * median F0 203–278 Hz, the Elsa range; a live Benigno clip measures ~136 Hz). Unlink them from every slot, relabel
 * them to the voice they actually are (course_audio; the false clip_index entry is removed — the asset is kept, nothing is deleted), and raise a
 * 'bad' flag on each, so no Benigno lookup hands them out again.
 */
async function fenceMislabelledTarget2(pg, ids, log) {
  const ELSA = 'azure_it-IT-ElsaNeural';
  await pg.query('BEGIN');
  try {
    const drops = [];
    for (const t of ['course_practice_phrases', 'course_legos', 'course_seeds']) {
      const key = t === 'course_legos' ? 'lego_id' : t === 'course_seeds' ? 'seed_id' : 'id';
      const { rows } = await pg.query(`UPDATE ${t} SET target2_audio_id=NULL WHERE course_code=$1 AND target2_audio_id = ANY($2::uuid[]) RETURNING ${key} AS row_id, seed_number`, [COURSE, ids]);
      drops.push(...rows.map((r) => ({ t, ...r })));
    }
    const { rows: [inCourse] } = await pg.query('SELECT count(*)::int n FROM course_audio WHERE id = ANY($1::uuid[]) AND course_code=$2', [ids, COURSE]);
    if (inCourse.n !== ids.length) throw new Error(`expected ${ids.length} ${COURSE} clips, found ${inCourse.n}`);
    const rl = await pg.query(`UPDATE course_audio SET voice_id=$1 WHERE id = ANY($2::uuid[]) AND voice_id LIKE '%Benigno%'`, [ELSA, ids]);
    // clip_index holds ONE clip per (language, text, voice) and Elsa's own target1 clip already holds each Elsa key, so the
    // false Benigno index entries are removed (an index row, not an asset)
    const ci = await pg.query(`DELETE FROM clip_index WHERE audio_id = ANY($1::uuid[]) AND voice_id LIKE '%Benigno%'`, [ids]);
    for (const id of ids) await pg.query(`INSERT INTO audio_clip_flags (audio_id, course_code, source, detector, severity, reason, metrics, raised_by) VALUES ($1,$2,'detector','f0-median','bad',$3,$4,$5)`,
      [id, COURSE, `written by POST /api/audio/render as it-IT-BenignoNeural target2 with 0 chars spent: the bytes are the Elsa clip the door found for the same text (female F0). Relabelled to ${ELSA}, its Benigno clip_index entry removed; unlinked from every slot (job ${JOB}).`, JSON.stringify({ f0_range_hz: [203, 278], benigno_reference_hz: 136 }), SWEEP]);
    await pg.query('COMMIT');
    log.fenced = { clips: ids.length, relabelled: rl.rowCount, clipIndex: ci.rowCount, slotsUnlinked: drops };
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
}
/** Components are never introduced; the two whose text changed kept a historic intro that no longer mirrors — detach it (asset kept). */
async function detachComponentIntros(pg, log) {
  const { rows } = await pg.query(`UPDATE course_practice_phrases SET presentation_audio_id=NULL WHERE course_code=$1 AND id = ANY($2) AND presentation_audio_id IS NOT NULL RETURNING id`, [COURSE, COMPONENTS.map((c) => full(c.id))]);
  log.componentIntrosDetached = rows.map((r) => short(r.id));
}

async function main() {
  const { Client } = require('pg');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const { createClient } = require('@supabase/supabase-js');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const log = { sweep: SWEEP, job: JOB, ruling: RULING, started: new Date().toISOString() };
  const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
  const save = (tag) => { const f = evidencePath(`tools/course-optimization/${SWEEP}/${tag}-${stamp()}.json`); fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`); };
  try {
    if (process.env.CHECK === '1') {
      const probs = endStateProblems(await loadRows(pg));
      const a = await verifyAudio(pg);
      console.log(probs.length ? 'END STATE PROBLEMS:\n  ' + probs.join('\n  ') : 'end state holds on the live course');
      console.log(a.probs.length ? 'AUDIO PROBLEMS:\n  ' + a.probs.join('\n  ') : `audio: ${a.rows.length} rows, no NULL slot, target1 ≠ target2 everywhere, intro mirrors`);
      process.exitCode = probs.length || a.probs.length ? 2 : 0; return;
    }
    if (process.env.FENCE === '1') {
      const { rows } = await pg.query(`SELECT id FROM course_audio WHERE course_code=$1 AND voice_id LIKE '%Benigno%' AND role='target2' AND created_at BETWEEN '2026-09-29 08:36:00+00' AND '2026-09-29 08:39:00+00'`, [COURSE]);
      await fenceMislabelledTarget2(pg, rows.map((r) => r.id), log);
      await detachComponentIntros(pg, log);
      console.log(JSON.stringify({ fenced: { ...log.fenced, slotsUnlinked: log.fenced.slotsUnlinked.length }, componentIntrosDetached: log.componentIntrosDetached }));
      save('fence'); return;
    }
    if (process.env.AUDIO_ONLY === '1') {
      await fillAudio(pg, log);
      for (const a of log.audio) console.log(`  ${a.role} "${a.text}": dry ${a.dry.source || a.dry.code} → ${a.result}${a.clip ? ` [${a.clip.voice_id} ${a.clip.duration_ms}ms ${a.clip.id}]` : ''}`);
      const v = await verifyAudio(pg); log.verify = v.probs;
      console.log(v.probs.length ? 'AUDIO PROBLEMS:\n  ' + v.probs.join('\n  ') : 'audio verified'); save('audio-only'); return;
    }
    const APPLY = process.env.APPLY === '1';
    const c = await census(pg); log.census = c;
    console.log(`\n══ ${COURSE} — sicuro + question word — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
    console.log(`census: ${c.bare.length} without di, ${c.withDi.length} with di, ${c.se.length} 'sicuro se' and ${c.che.length} 'sicuro che' (listed, untouched), ${c.audioBare.length} course_audio texts without di`);
    for (const r of c.bare) console.log(`  BARE ${r.id} (${r.kind}) "${r.known}" | "${r.target}"`);
    for (const r of c.withDi) console.log(`  DI   ${r.id} (${r.kind}) "${r.target}"`);
    const rows = await loadRows(pg);
    const probs = [...planProblems(rows), ...(await vocabularyGuards(pg))];
    const zut = await zutAgainstCourse(pg); probs.push(...zut.map((z) => `ZUT: ${z}`));
    const after = endStateProblems(applyPlanToRows(rows));
    if (after.length) probs.push(...after.map((p) => `after-plan: ${p}`));
    log.problems = probs;
    console.log(probs.length ? '\nPROBLEMS:\n  ' + probs.join('\n  ') : '\nguards hold: live text matches the plan, every row contains its LEGO, no untaught word, no ZUT clash, the end state holds on the planned rows');
    if (APPLY && !probs.length) {
      await applyContent(pg, createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } }), log);
      console.log(`APPLIED. events=${JSON.stringify(log.events)} unapproved=${JSON.stringify(log.unapproved)}`);
      await fillAudio(pg, log);
      for (const a of log.audio) console.log(`  ${a.role} "${a.text}": dry ${a.dry.source || a.dry.code} → ${a.result}${a.clip ? ` [${a.clip.voice_id} ${a.clip.duration_ms}ms]` : ''}`);
      const v = await verifyAudio(pg); log.verify = v.probs;
      console.log(v.probs.length ? 'AUDIO PROBLEMS:\n  ' + v.probs.join('\n  ') : 'audio verified');
    }
    save(APPLY ? 'applied' : 'dryrun');
    if (probs.length) process.exitCode = 2;
  } finally { await pg.end(); }
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { femaleReading, endStateProblems, applyPlanToRows, planProblems, bareSicuroWh, sicuroDiWh, LEGO, EDITS, DELETES, ADDS, COMPONENTS, COMPONENT_ADDS, TEACH_SEED };
