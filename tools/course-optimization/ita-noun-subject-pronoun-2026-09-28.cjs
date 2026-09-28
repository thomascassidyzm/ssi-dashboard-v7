#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-noun-subject-pronoun-2026-09-28.cjs
//
// ita_for_eng — KAI'S RULING (2026-09-28, job #577·I) on the LEGOs job #573·I listed for him:
// LEGOs whose Italian is a complete finite clause with the subject implied by the verb, while the
// seed's subject is a NOUN PHRASE that sits outside the LEGO ("the children were tired" → LEGO
// "were tired | erano stanchi").
//
//   "I think we could add 'they' to the lego or whatever other pronoun works. Just need to decide
//    on an approach and apply it consistently." … "make sure it only happens in cases like these in
//    Italian where the pronoun is implied. We need to add it to the English because otherwise the
//    English sounds unnatural, which gives a false impression of the Italian being incomplete when
//    in reality it is complete."                                              — Kai, 2026-09-28
//
// THE APPROACH (canon K28, the narrow exception to L26):
//   ADD the pronoun when the LEGO's Italian STANDS ALONE as a complete clause whose subject is in
//     the verb, and the seed's subject for that verb is a noun phrase outside the LEGO. The pronoun
//     is the one the seed's noun takes: the children → they; my grandfather → he; that woman → she;
//     this work / the news / a glass of water → it. Its head component gets the same pronoun and
//     the components go on tiling the LEGO's English.
//   DO NOT add one when the Italian does not stand alone (an -ing fragment such as "going around |
//     mi girano", a bare verb after English "did"), or when the seed's subject IS a subject word
//     that the LEGO left out — a wh-word or a negative pronoun ("what was happening", "who is
//     standing", "nobody told me", "nothing would make me happier"): there the pronoun would be
//     invented and the subject word itself is what the LEGO needs. Those are LISTED, never edited.
//   PHRASES under an edited LEGO: a bare fragment (B01 "were tired") takes the pronoun. A phrase
//     that already carries the seed's noun, or a pronoun of the same person, before the chunk
//     ("the children were tired so we had to leave", "she didn't need to sell the company" under
//     "he didn't need to") is KEPT: the Italian is one and the same form, the noun is the very
//     thing the pronoun stands for, and two Englishes over one Italian is not a defect (Kai's
//     standing rule; the live gate checks containment on the target side, which never moves here).
//     This is the consistent resolution of #573·I's seven "containment exceptions".
//   ZUT-HELD LEGOs (S0151L01 "wasn't | non era", S0159L01 "isn't | non è") stay held while their own
//     B03 rows ("that wasn't | quello non era") still make the pronoun a one-known-two-targets clash.
//   Seeds 203 and 348 belong to job #576·I and are never touched here.
//
// AFTER THE EDIT (same pipeline as #573·I): every seed touched is unapproved; the English clip of
// every changed row is detached so the temporary-Sonia fill re-voices it (Charlotte re-voice list,
// A23); intros of changed LEGOs are re-mirrored by ita-intro-mirror-fix (O13; the exit hook then
// runs the strict check); an audio-pass request is queued; the round index is refreshed.
//
//   node tools/course-optimization/ita-noun-subject-pronoun-2026-09-28.cjs            # plan (dry run, no writes)
//   APPLY=1 node tools/course-optimization/ita-noun-subject-pronoun-2026-09-28.cjs    # write
//   node … --report-from <applied.json> --out <file.md> [--zut-before a.json --zut-after b.json] [--sonia fill.json]

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const JOB = '#577·I';
const SWEEP = 'ita-noun-subject-pronoun-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = "Kai, 2026-09-28 (job #577·I): where the Italian LEGO is a complete clause whose subject is implied by the verb and the seed's subject is a noun phrase outside the LEGO, the English carries the pronoun that noun takes — otherwise the English sounds unnatural and makes the complete Italian look incomplete";
const HELD_SEEDS = [203, 348];
const HELD_ACTOR = 'ita-seed-203-present-frames-2026-09-28';

const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»“”]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
/** Live gate's phrase-contains-LEGO rule: word multiset. */
function containsWords(hay, needle) {
  const h = words(hay);
  for (const w of words(needle)) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); }
  return true;
}
const sameWords = (a, b) => containsWords(a, b) && words(a).length === words(b).length;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * THE RULE as a function — Kai's approach, decidable from the seed and the LEGO alone.
 * subject: the seed's subject for the LEGO's verb ({ kind: 'noun'|'wh'|'pronoun', text }) and
 * standalone: whether the Italian stands alone as a complete clause (false for -ing fragments and
 * bare-verb-after-did rows). Returns { action: 'add', pronoun } or { action: 'list', why }.
 */
const NOUN_PRONOUN = [
  [/^(the|these|those|our|my|your|their|his|her|some)\s+\S*(children|friends|people|parents|students|others)\b/i, 'they'],
  [/^(everybody|everyone)\b/i, 'they'],
  [/\b(grandfather|father|brother|son|man|boy|husband|uncle)\b/i, 'he'],
  [/\b(grandmother|mother|sister|daughter|woman|girl|wife|aunt)\b/i, 'she'],
];
function pronounForNoun(noun) {
  for (const [re, p] of NOUN_PRONOUN) if (re.test(noun)) return p;
  return 'it';
}
function decideLego({ subject, standalone }) {
  if (!standalone) return { action: 'list', why: 'the Italian does not stand alone as a complete clause' };
  if (subject.kind === 'wh') return { action: 'list', why: `the seed's subject is the word "${subject.text}" itself — the LEGO needs that word, not an invented pronoun` };
  if (subject.kind === 'pronoun') return { action: 'add', pronoun: subject.text.toLowerCase(), from: 'the seed says it' };
  return { action: 'add', pronoun: pronounForNoun(subject.text), from: `the seed's noun "${subject.text}"` };
}

// ── The list, one entry per LEGO #573·I sent to Kai, decided by decideLego with the facts read from the live seed ──
// Every seed sentence is quoted so the decision is checkable by eye (Kai reads on a phone).
const LEGOS = [
  { id: 'S0126L03', target: 'sta cambiando', seed: 'this work is changing the shape of my brain', subject: { kind: 'noun', text: 'this work' }, standalone: true,
    fragments: ['S0126L03B01', 'S0126L03B02', 'S0126L04B04'] },
  { id: 'S0131L04', target: 'mi girano', seed: 'there are too many ideas going around in my head', subject: { kind: 'noun', text: 'too many ideas' }, standalone: false,
    note: '"going around" is an -ing fragment; "they go around | mi girano" would be a re-gloss, not a pronoun — your call' },
  { id: 'S0151L01', target: 'non era', seed: "that wasn't what I was hoping would happen", subject: { kind: 'pronoun', text: 'that' }, standalone: true, zutHeld: true },
  { id: 'S0159L01', target: 'non è', seed: "that isn't what I'm trying to say", subject: { kind: 'pronoun', text: 'that' }, standalone: true, zutHeld: true },
  { id: 'S0229L02', target: 'ti aiuterebbe', seed: 'that woman would help you if she could', subject: { kind: 'noun', text: 'that woman' }, standalone: true, fragments: ['S0229L02B01'] },
  { id: 'S0261L02', target: 'potrebbe', seed: 'I think it might be something important', subject: { kind: 'pronoun', text: 'it' }, standalone: true, fragments: ['S0261L02B01', 'S0261L02B02'] },
  { id: 'S0347L01', target: 'stava succedendo', seed: 'he wanted to know what was happening a week ago', subject: { kind: 'wh', text: 'what' }, standalone: true,
    note: 'suggest re-cutting the LEGO to "what was happening | che cosa stava succedendo" (B02 already reads so)' },
  { id: 'S0360L01', target: "ha detto qualcos'altro", seed: 'did your friend say anything else?', subject: { kind: 'noun', text: 'your friend' }, standalone: false,
    note: 'English "say" is the bare verb after "did"; "he said anything else" changes the verb, not just the subject — your call' },
  { id: 'S0367L01', target: "me l'ha detto", seed: 'no nobody told me', subject: { kind: 'wh', text: 'nobody' }, standalone: true,
    note: 'suggest re-cutting to "nobody told me | nessuno me l\'ha detto" (B02 already reads so)' },
  { id: 'S0390L02', target: 'sta in piedi', seed: 'the one who is standing near the entrance', subject: { kind: 'wh', text: 'who' }, standalone: true },
  { id: 'S0391L01', target: 'sta camminando', seed: 'the one who is walking towards the bus', subject: { kind: 'wh', text: 'who' }, standalone: true },
  { id: 'S0396L05', target: 'sono pronti', seed: "we don't need to stand until everybody else is ready", subject: { kind: 'noun', text: 'everybody else' }, standalone: true, fragments: ['S0396L05B01'] },
  { id: 'S0454L02', target: 'sono venuti verso le sei', seed: "our friends came round at about six o'clock", subject: { kind: 'noun', text: 'our friends' }, standalone: true, fragments: ['S0454L02B01'] },
  { id: 'S0455L04', target: 'erano stanchi', seed: 'we had to leave because the children were tired', subject: { kind: 'noun', text: 'the children' }, standalone: true, fragments: ['S0455L04B01'] },
  { id: 'S0462L03', target: 'ha combattuto in Italia', seed: 'my grandfather fought in Italy during the war', subject: { kind: 'noun', text: 'my grandfather' }, standalone: true, fragments: ['S0462L03B01', 'S0462L03B03', 'S0462L04B02'] },
  { id: 'S0485L01', target: 'mi renderebbe più felice', seed: 'nothing would make me happier than to get away', subject: { kind: 'wh', text: 'nothing' }, standalone: true,
    note: 'suggest re-cutting to "nothing would make me happier | niente mi renderebbe più felice" (B02 already reads so)' },
  { id: 'S0511L03', target: 'ha impiegato diverse ore', seed: 'the news took several hours to reach everyone in the office', subject: { kind: 'noun', text: 'the news' }, standalone: true, fragments: ['S0511L03B01'] },
  // S0609L02 was REVERSED by job #579·I (Kai, 2026-09-28): the subject is the agreeing noun 'la cosa', so K28 does not apply — re-cut to take the noun (ita-seed-609-recut-2026-09-28.cjs). This tool's guard now refuses the row.
  { id: 'S0609L02', target: 'sarebbe stata chiedere', seed: 'the sensible thing to do would have been to ask', subject: { kind: 'noun', text: 'the sensible thing to do' }, standalone: true, fragments: ['S0609L02B01'],
    note: '"it would have been to ask" is the rule applied; if it reads oddly to you the alternative is a re-cut to "the sensible thing would have been to ask" (B02)' },
  { id: 'S0614L01', target: 'vive', seed: "it's near where your family live", subject: { kind: 'noun', text: 'your family' }, standalone: true, ambiguous: true,
    note: '"it lives" would be wrong for a family and its own phrases say "she lives" / "your family lives"; suggest "she lives | vive" — your read' },
  { id: 'S0622L03', target: 'lo avevano rotto', seed: 'I knew that the children had broken it', subject: { kind: 'noun', text: 'the children' }, standalone: true, fragments: ['S0622L03B01'] },
  { id: 'S0633L02', target: 'andrebbe bene', seed: 'A large glass of water would be fine', subject: { kind: 'noun', text: 'a large glass of water' }, standalone: true, fragments: ['S0633L02B01'] },
];
// English agreement slips seen under S0396L05 (K27: agreement follows the noun present; the seed itself says "everybody else is ready")
const AGREEMENT = { S0396L05B02: ['everybody else are ready', 'everybody else is ready'], S0396L05U01: ['we need to wait until everybody else are ready', 'we need to wait until everybody else is ready'], S0396L05U02: ['she said everybody else are ready', 'she said everybody else is ready'], S0396L05U03: ['I asked if everybody else are ready', 'I asked if everybody else is ready'] };
// Components that did not tile their LEGO before this job (#573·I listed them) and CAN with the pronoun on the head
const COMPONENT_FIX = { S0520L01: [{ known: 'it might', target: 'potrebbe' }, { known: 'have happened', target: 'essere successo' }] };
// The seven containment exceptions #573·I listed, resolved by the approach above: kept, with the reason
const EXCEPTIONS_KEPT = [
  ['S0354L01U03', 'he didn\'t need to', 'she didn\'t need to sell the company', 'non aveva bisogno di vendere l\'azienda', 'kept — "she" is the same 3rd-singular form; one Italian, two Englishes'],
  ['S0354L01U05', 'he didn\'t need to', 'she didn\'t need to see some old friends', 'non aveva bisogno di vedere alcuni vecchi amici', 'kept — as above'],
  ['S0354L01C01–C03', 'he didn\'t need to', 'not + he had need + to', 'non + aveva bisogno + di', 'kept — literal glosses that carry the person (K26); a component may be weird in order (L23), never in who is speaking'],
  ['S0429L01U01', 'it would be perfect', 'yes that would be perfect for them', 'sì, sarebbe perfetto per loro', 'kept — "that" stands for the same "it"'],
  ['S0520L01C01+C02', 'it might have happened', 'might + happened → it might + have happened', 'potrebbe + essere successo', 'FIXED — components now tile the LEGO'],
];

const withPronoun = (p, s) => `${p} ${s}`;

function plan(rows) {
  const byId = {}; for (const r of rows) byId[r.id] = r;
  const changes = []; const kai = []; const problems = []; const untiled = [];
  for (const L of LEGOS) {
    const live = byId[L.id];
    if (!live) { problems.push(`${L.id}: not live`); continue; }
    if (live.target !== L.target) problems.push(`${L.id}: live Italian is "${live.target}", expected "${L.target}"`);
    const d = decideLego(L);
    const row = (extra) => ({ sn: live.sn, id: L.id, kind: 'lego', known: live.known, target: live.target, seed: L.seed, ...extra });
    if (L.zutHeld) { kai.push(row({ why: `held: "${cap('that')} ${live.known}" would sit beside ${L.id}B03 "that ${live.known} | quello ${live.target}" — one known, two Italians; the B03 row with *quello* is the one to rule on`, suggest: `that ${live.known}` })); continue; }
    if (L.ambiguous) { kai.push(row({ why: L.note, suggest: 'she ' + live.known })); continue; }
    if (d.action === 'list') { kai.push(row({ why: d.why + (L.note ? ' — ' + L.note : ''), suggest: '' })); continue; }
    if (/^(i|you|he|she|it|we|they)\b/i.test(live.known)) { problems.push(`${L.id}: already carries a pronoun ("${live.known}")`); continue; }
    const to = withPronoun(d.pronoun, live.known);
    let comps = live.components;
    if (Array.isArray(comps) && comps.length) {
      const head = comps.findIndex((c) => norm(live.known).startsWith(norm(c.known)) || words(live.known)[0] === words(c.known)[0]);
      const i = head >= 0 ? head : 0;
      comps = comps.map((c, k) => (k === i ? { ...c, known: withPronoun(d.pronoun, c.known) } : c));
      // components that tiled the LEGO before must tile it after; literal glosses that never tiled ("would go + well" for
      // "would be fine") stay literal (L23) and just gain the person on the head (K26) — listed in the report, not blocked
      const tiledBefore = sameWords(live.components.map((c) => c.known).join(' '), live.known);
      const tiled = sameWords(comps.map((c) => c.known).join(' '), to);
      if (tiledBefore && !tiled) problems.push(`${L.id}: components "${comps.map((c) => c.known).join(' + ')}" do not tile "${to}"`);
      if (!tiledBefore) untiled.push({ id: L.id, comps: comps.map((c) => c.known).join(' + '), lego: to });
    }
    changes.push({ id: L.id, kind: 'lego', seed: live.sn, from: live.known, to, target: live.target, components: comps, pronoun: d.pronoun, why: `${d.from} → ${d.pronoun}`, note: L.note || '', sentence: L.seed });
    for (const fid of L.fragments || []) {
      const f = byId[fid]; if (!f) { problems.push(`${fid}: not live`); continue; }
      if (/^(i|you|he|she|it|we|they)\b/i.test(f.known)) { problems.push(`${fid}: already carries a pronoun`); continue; }
      const fto = withPronoun(d.pronoun, f.known);
      changes.push({ id: fid, kind: f.kind, seed: f.sn, from: f.known, to: fto, target: f.target, pronoun: d.pronoun, why: `fragment under ${L.id}` });
    }
  }
  for (const [id, [from, to]] of Object.entries(AGREEMENT)) {
    const f = byId[id]; if (!f) { problems.push(`${id}: not live`); continue; }
    if (f.known !== from) { problems.push(`${id}: live "${f.known}" ≠ "${from}"`); continue; }
    changes.push({ id, kind: f.kind, seed: f.sn, from, to, target: f.target, agreement: true, why: 'English agreement (K27): everybody else IS ready, as the seed itself says' });
  }
  for (const [lid, comps] of Object.entries(COMPONENT_FIX)) {
    const l = byId[lid]; if (!l) { problems.push(`${lid}: not live`); continue; }
    if (!sameWords(comps.map((c) => c.known).join(' '), l.known)) problems.push(`${lid}: fixed components do not tile "${l.known}"`);
    changes.push({ id: lid, kind: 'components', seed: l.sn, from: (l.components || []).map((c) => c.known).join(' + '), to: comps.map((c) => c.known).join(' + '), target: l.target, components: comps, why: 'components made to tile the LEGO (L4)' });
  }
  // guards: every changed phrase still contains its LEGO's English (as it will read) OR carries the seed's noun / a same-person pronoun before it — and its Italian contains the LEGO's Italian
  const legoTo = {}; for (const c of changes.filter((c) => c.kind === 'lego')) legoTo[c.id] = c.to;
  for (const c of changes.filter((c) => c.kind === 'build' || c.kind === 'use')) {
    const lid = c.id.slice(0, 8); const l = byId[lid]; if (!l) continue;
    const lk = legoTo[lid] || l.known;
    if (!c.agreement && !containsWords(c.to, lk) && !containsWords(c.to, l.known)) problems.push(`${c.id}: "${c.to}" contains neither "${lk}" nor "${l.known}"`);
    if (!containsWords(c.target, l.target)) problems.push(`${c.id}: Italian "${c.target}" does not contain its LEGO "${l.target}"`);
    if (HELD_SEEDS.includes(c.seed)) problems.push(`${c.id}: seed ${c.seed} is held`);
  }
  // the phrases KEPT under each changed LEGO, with the reason, for the report
  const kept = [];
  for (const c of changes.filter((c) => c.kind === 'lego')) {
    for (const r of rows.filter((r) => r.id.startsWith(c.id) && r.id !== c.id && (r.kind === 'build' || r.kind === 'use') && !changes.some((x) => x.id === r.id))) {
      const carries = containsWords(r.known, c.to) ? 'carries the LEGO' : `carries the subject before the chunk ("${words(r.known).slice(0, Math.max(1, words(r.known).indexOf(words(c.from)[0]))).join(' ')}")`;
      kept.push({ id: r.id, lego: c.to, known: r.known, target: r.target, why: carries });
    }
  }
  return { changes, kai, kept, problems, untiled };
}

// ── Live ──────────────────────────────────────────────────────────────────────────────────
const short = (id) => String(id).replace(/^ita_for_eng:/, '');
async function loadRows(pg) {
  const { rows } = await pg.query(
    `SELECT 'lego' AS kind, seed_number AS sn, lego_id AS id, known_text AS known, target_text AS target, components, known_audio_id FROM course_legos WHERE course_code=$1
     UNION ALL SELECT phrase_role, seed_number, id, known_text, target_text, NULL, known_audio_id FROM course_practice_phrases WHERE course_code=$1 ORDER BY 2, 3`, [COURSE]);
  return rows.map((r) => ({ ...r, sn: Number(r.sn), id: short(r.id) }));
}
async function zutAgainstCourse(pg, changes) {
  const ours = new Set(changes.map((c) => c.id));
  const clashes = [];
  for (const c of changes.filter((c) => c.kind !== 'components')) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND id<>$4 AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id<>$5 AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))`,
      [COURSE, c.to, c.target, `${COURSE}:${c.id}`, c.id]);
    // K2 is ONE KNOWN → TWO TARGETS; the other direction (one Italian under two Englishes) is not a defect by Kai's standing rule and is reported, never held
    for (const r of rows.filter((r) => !ours.has(short(r.id)))) clashes.push({ change: c.id, pair: `"${c.to}" → "${c.target}"`, vs: `${short(r.id)} "${r.known_text}" → "${r.target_text}"`, k2: r.known_text.trim().toLowerCase() === c.to.toLowerCase() });
  }
  return clashes;
}

async function applyContent(pg, supabase, D, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const legoChanges = D.changes.filter((c) => c.kind === 'lego' || c.kind === 'components');
  const phraseChanges = D.changes.filter((c) => c.kind === 'build' || c.kind === 'use');
  const seedsTouched = [...new Set(D.changes.map((c) => c.seed))].sort((a, b) => a - b);
  const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: op, scope, detail });
  const legoEvent = await ev('lego-edit', { seed_numbers: [...new Set(legoChanges.map((c) => c.seed))], lego_ids: legoChanges.map((c) => c.id), rows: legoChanges.length }, { ruling: RULING, job: JOB, changes: legoChanges.map((c) => ({ id: c.id, kind: c.kind, known_from: c.from, known_to: c.to, target: c.target, components: c.components, why: c.why })) });
  const phraseEvent = await ev('phrase-edit', { seed_numbers: [...new Set(phraseChanges.map((c) => c.seed))], phrase_ids: phraseChanges.map((c) => `${COURSE}:${c.id}`), rows: phraseChanges.length }, { ruling: RULING, job: JOB, changes: phraseChanges.map((c) => ({ id: `${COURSE}:${c.id}`, known_from: c.from, target_from: c.target, known_to: c.to, target_to: c.target, why: c.why })) });
  const unapproveEvent = await ev('unapprove', { seed_numbers: seedsTouched, rows: seedsTouched.length }, { why: "English subject pronouns added to noun-subject LEGOs under Kai's ruling of 2026-09-28; need his read", job: JOB });
  log.events = { legoEvent, phraseEvent, unapproveEvent };
  await pg.query('BEGIN');
  try {
    for (const c of legoChanges) {
      const u = c.kind === 'lego'
        ? await pg.query(`UPDATE course_legos SET known_text=$1, components=$2, known_audio_id=NULL, last_edit_event_id=$3, updated_at=now() WHERE course_code=$4 AND lego_id=$5 AND known_text=$6 AND target_text=$7`, [c.to, c.components == null ? null : JSON.stringify(c.components), legoEvent, COURSE, c.id, c.from, c.target])
        : await pg.query(`UPDATE course_legos SET components=$1, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND lego_id=$4 AND target_text=$5`, [JSON.stringify(c.components), legoEvent, COURSE, c.id, c.target]);
      if (u.rowCount !== 1) throw new Error(`${c.id}: ${u.rowCount} rows`);
    }
    for (const c of phraseChanges) {
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, known_audio_id=NULL, qa_checked=NULL, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND id=$4 AND known_text=$5 AND target_text=$6`, [c.to, phraseEvent, COURSE, `${COURSE}:${c.id}`, c.from, c.target]);
      if (u.rowCount !== 1) throw new Error(`${c.id}: ${u.rowCount} rows`);
    }
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [unapproveEvent, COURSE, seedsTouched]);
    log.unapproved = { seeds: seedsTouched, rows: un.rowCount };
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: English subject pronouns added to ${legoChanges.length} noun-subject LEGOs and ${phraseChanges.length} phrases (Kai's ruling); English prompts on temporary Sonia, intros re-mirrored`, metadata: { job: JOB, seeds: seedsTouched, rows: D.changes.length } });
}
function reMirrorIntros(log) {
  const { spawnSync } = require('child_process');
  const script = path.join(__dirname, 'ita-intro-mirror-fix-2026-09-28.cjs');
  const r = spawnSync(process.execPath, [script, '--exclude-actor', HELD_ACTOR], { encoding: 'utf8', env: { ...process.env, APPLY: '1', INTRO_MIRROR_AT_EXIT: '0' }, timeout: 20 * 60 * 1000 });
  log.introFix = { status: r.status, tail: String(r.stdout || '').split('\n').slice(-40).join('\n'), stderr: String(r.stderr || '').slice(-4000) };
  return r.status;
}

// ── Report ────────────────────────────────────────────────────────────────────────────────
function report(D, extra) {
  const L = [];
  L.push(`# ita_for_eng — pronouns on the noun-subject LEGOs: before → after (job ${JOB}, 2026-09-28)`, '');
  L.push(`**Your ruling:** *"add 'they' to the lego or whatever other pronoun works … only in cases like these in Italian where the pronoun is implied … otherwise the English sounds unnatural, which gives a false impression of the Italian being incomplete when in reality it is complete."*`, '');
  L.push(`**The approach, applied to every LEGO on #573·I's list:** the Italian stands alone as a complete clause and the seed's subject is a noun phrase outside the LEGO → the English gets the pronoun that noun takes (the children → they, my grandfather → he, that woman → she, the news → it). Head component takes it too, so the components still tile. Not added where the Italian does not stand alone (an -ing fragment, a bare verb after "did") or where the seed's subject is itself a subject word the LEGO left out (what, who, nobody, nothing) — those are listed below with a suggestion. Phrases: a bare fragment takes the pronoun; a phrase already carrying the seed's noun or a same-person pronoun before the chunk is kept — same Italian form, and the noun is what the pronoun stands for. That is also how the seven containment exceptions from #573·I are resolved. Italian never changed. Written into the canon as **K28**.`, '');
  if (extra.zut) L.push(`**ZUT (strict bidirectional, audit-phrase-zut):** ${extra.zut.before} → ${extra.zut.after}. ${extra.zut.newly.length ? 'New: ' + extra.zut.newly.join('; ') : 'None new.'} ${extra.zut.resolved.length ? 'Resolved: ' + extra.zut.resolved.join('; ') : ''}`, '');
  if (extra.unapproved) L.push(`**Seeds unapproved:** ${extra.unapproved.join(', ')}.`, '');
  L.push('## Changed rows (English only)', '', '| Seed | Row | Before | After | Italian | The sentence |', '|---|---|---|---|---|---|');
  for (const c of [...D.changes].sort((a, b) => a.seed - b.seed || a.id.localeCompare(b.id))) L.push(`| ${c.seed} | ${c.id}${c.kind === 'lego' ? ' (LEGO)' : c.kind === 'components' ? ' (components)' : ''} | ${c.from} | **${c.to}** | ${c.target} | ${c.sentence || ''} |`);
  const noted = D.changes.filter((c) => c.note);
  if (noted.length) { L.push('', '**One you may want to reverse:**'); for (const c of noted) L.push(`- ${c.id} "${c.to}": ${c.note}`); }
  if (D.untiled && D.untiled.length) { L.push('', '**Components that were literal glosses before and stay so, now with the person on the head (they never tiled; L23):**'); for (const u of D.untiled) L.push(`- ${u.id}: ${u.comps} under "${u.lego}"`); }
  if (extra.zutInfo && extra.zutInfo.length) { L.push('', '**One Italian under two Englishes after this pass (not a defect by your rule, shown so you see it):**'); for (const z of extra.zutInfo) L.push(`- ${z.change} ${z.pair} beside ${z.vs}`); }
  L.push('', '## Phrases kept under a changed LEGO (no edit)', '', 'Each carries the seed\'s noun, or a pronoun of the same person, where the LEGO now has the pronoun. One Italian form; the noun is what the pronoun stands for.', '', '| Row | LEGO now | Phrase | Italian |', '|---|---|---|---|');
  for (const k of D.kept) L.push(`| ${k.id} | ${k.lego} | ${k.known} | ${k.target} |`);
  L.push('', '## The seven containment exceptions from #573·I — resolved', '', '| Row | LEGO | Phrase / components | Italian | Resolution |', '|---|---|---|---|---|');
  for (const e of EXCEPTIONS_KEPT) L.push(`| ${e[0]} | ${e[1]} | ${e[2]} | ${e[3]} | ${e[4]} |`);
  L.push('', '## Still for you — not edited', '', '| Seed | LEGO | English | Italian | The sentence | Why | Suggestion |', '|---|---|---|---|---|---|---|');
  for (const k of D.kai.sort((a, b) => a.sn - b.sn)) L.push(`| ${k.sn} | ${k.id} | ${k.known} | ${k.target} | ${k.seed} | ${k.why} | ${k.suggest || ''} |`);
  if (extra.sonia) L.push('', '## English re-voiced on temporary Sonia — Charlotte re-voice list', '', extra.sonia);
  if (extra.intros) L.push('', '## Intros re-mirrored (temporary Sonia)', '', extra.intros);
  return L.join('\n');
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  if (arg('--report-from')) {
    const applied = JSON.parse(fs.readFileSync(arg('--report-from'), 'utf8'));
    const extra = { unapproved: applied.unapproved?.seeds };
    if (arg('--zut-before') && arg('--zut-after')) {
      const b = JSON.parse(fs.readFileSync(arg('--zut-before'), 'utf8')), a = JSON.parse(fs.readFileSync(arg('--zut-after'), 'utf8'));
      const key = (g) => g.known_norm; const bk = new Set(b.bidirectionalStrict.map(key)), ak = new Set(a.bidirectionalStrict.map(key));
      const show = (g) => `"${g.known_norm}" → ${g.distinct_targets.map((t) => `"${t.example.target}" (${t.example.seed} ${t.example.phrase_role || 'lego'})`).join(' / ')}`;
      extra.zut = { before: b.counts.bidirectional.strict, after: a.counts.bidirectional.strict, newly: a.bidirectionalStrict.filter((g) => !bk.has(key(g))).map(show), resolved: b.bidirectionalStrict.filter((g) => !ak.has(key(g))).map(show) };
    }
    if (arg('--sonia')) { const f = JSON.parse(fs.readFileSync(arg('--sonia'), 'utf8')); extra.sonia = ['| Row | English | Clip |', '|---|---|---|', ...(f.filled || []).map((x) => `| ${short(x.id)} | ${x.text} | ${x.result || x.audioId || ''} |`)].join('\n'); }
    if (arg('--intros')) extra.intros = fs.readFileSync(arg('--intros'), 'utf8');
    extra.zutInfo = (applied.zutInfo || []);
    const md = report(applied.plan, extra); fs.writeFileSync(arg('--out'), md); console.log(`report → ${arg('--out')} (${md.length} chars)`); return;
  }
  const { Client } = require('pg');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const log = { sweep: SWEEP, job: JOB, ruling: RULING, apply: APPLY, started: new Date().toISOString() };
  try {
    const rows = await loadRows(pg);
    const D = plan(rows);
    console.log(`\n══ ${COURSE} — noun-subject LEGO pronouns — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
    console.log(`plan: ${D.changes.length} changes (${D.changes.filter((c) => c.kind === 'lego').length} LEGOs), ${D.kai.length} for Kai, ${D.kept.length} phrases kept`);
    for (const c of D.changes) console.log(`  ${c.kind.padEnd(10)} ${c.id.padEnd(12)} "${c.from}" → "${c.to}"   (${c.target})   ${c.why}`);
    console.log('for Kai:'); for (const k of D.kai) console.log(`  ${k.id.padEnd(9)} "${k.known}" | "${k.target}" — ${k.why}`);
    const clashes = await zutAgainstCourse(pg, D.changes);
    console.log(`ZUT against the course: ${clashes.length ? '\n  ' + clashes.map((z) => `${z.k2 ? 'K2 HOLD' : 'two Englishes, one Italian (not a defect)'}: ${z.change} ${z.pair} vs ${z.vs}`).join('\n  ') : 'no clash'}`);
    for (const z of clashes.filter((z) => z.k2)) D.problems.push(`ZUT K2: ${z.change} ${z.pair} vs ${z.vs}`);
    log.plan = D; log.zutInTool = clashes; log.zutInfo = clashes.filter((z) => !z.k2);
    if (D.problems.length) console.log('\nPROBLEMS:\n  ' + D.problems.join('\n  ')); else console.log('\nguards hold: live text matches, components tile, every changed phrase contains its LEGO (Italian) and its English chunk, no held seed touched, no new ZUT pair');
    if (APPLY && !D.problems.length) {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
      await applyContent(pg, supabase, D, log);
      console.log(`APPLIED. events=${JSON.stringify(log.events)} unapproved=${JSON.stringify(log.unapproved)} audioPass=${JSON.stringify(log.audioPass)}`);
      const st = reMirrorIntros(log);
      console.log(`intro re-mirror: exit ${st}\n${log.introFix.tail}`);
      const ids = D.changes.filter((c) => c.kind !== 'components').map((c) => (c.kind === 'lego' ? c.id : `${COURSE}:${c.id}`));
      log.soniaIds = ids;
      console.log(`\nENGLISH prompts to fill on temporary Sonia (${ids.length}):\n  SCOPE=ids IDS=${ids.join(',')} APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs`);
    }
    const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  } finally { await pg.end(); }
}

module.exports = { decideLego, pronounForNoun, plan, containsWords, sameWords, LEGOS };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
