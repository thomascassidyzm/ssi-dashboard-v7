#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-seed-348-non-voleva-sapere-phrases-2026-09-28.cjs
//
// ita_for_eng — seed 348 "she didn't want to know what was going to happen" → "non voleva sapere che cosa
// sarebbe successo" (Kai, 2026-09-28 22:16Z, job #621·I).
//
// The seed has ONE LEGO, S0348L01 "what was going to happen | che cosa sarebbe successo" (not new — the 201 L03
// pair). The other half of the seed, "she didn't want to know | non voleva sapere", is in no LEGO and gets NONE:
// it is built entirely from taught pieces — voleva (S0053L01 "she wanted to"), the non pattern (S0071L01 "we didn't
// want to | non volevamo"), sapere (S0045L02 "to know") — so a LEGO would teach nothing (canon L17 familiarity;
// this is the general rule written in as L30). Instead the span is COVERED BY PHRASES:
//
//   (1) seed 348 gets MANY use phrases carrying "non volev- sapere" — she/he/I/we, "…next", "she said she didn't",
//       "I'm sure she didn't", "he told me he didn't" — every one of them still containing the seed's LEGO
//       "what was going to happen | che cosa sarebbe successo" (every phrase under a LEGO contains that LEGO,
//       build and use). The existing rows are kept: B01–B03 are the outward-growing build ladder and U01–U05 are
//       good; U01 repeats B03 (the seed sentence), which 29 other baskets in this course also do — left alone.
//   (2) "it comes up earlier in suitable legos ideally, since it's available" (Kai): earlier seeds — after 71, when
//       all three pieces exist — whose LEGO naturally takes "didn't want to know" get a use phrase each, containing
//       their own LEGO and no new vocabulary: 84 "what he said", 107 "what you were doing", 162 "about it | ne",
//       201 "to know | sapere" (two), 208 "I didn't want to | non volevo" (two). Seed 347 "what was happening" is
//       the natural neighbour but is OUT of scope: its LEGO is with Kai under K28 and a sibling job is growing the
//       subject LEGOs right now. Seeds 608, 618 and the #591 taste-call seeds are a sibling job's (#618·I) — untouched.
//
// Nothing is deleted and no LEGO changes, so there is no downstream re-gloss to do; the standing "check later
// phrases" rule is still run: every phrase after 348 that says "didn't/doesn't want to know" is listed with its
// Italian so the past-frame form (non volev- sapere) can be seen to hold.
//
// AFTER THE INSERT: Italian slots are linked to an existing Elsa/Benigno clip where one exists, else rendered through
// the one TTS door; English prompts are filled by ita-sonia-temporary-fill SCOPE=ids (temporary Sonia, cast restored
// byte-identical; Charlotte re-voice list, canon A23); the edited seeds are unapproved (new phrases arrive unchecked);
// check-intro-mirror --strict; audit-phrase-zut strict must stay at 56.
//
// SUPERSEDED THE SAME NIGHT (Kai, 22:23Z): S0348L01 is NOT NEW and the player never plays a not-new basket (canon P25),
// so the seven 348 rows this tool added were MOVED under S0201L03 / S0340L01 and the two S0201L02 rows deleted by
// tools/course-optimization/ita-rehome-drill-phrases-under-new-legos-2026-09-28.cjs. The 84/107/162/208 rows stand
// (their LEGOs are new). This file's BEFORE/AFTER pins the 22:27Z state and is kept as the record of that step.
//
//   node tools/course-optimization/ita-seed-348-non-voleva-sapere-phrases-2026-09-28.cjs            # dry run
//   APPLY=1 node tools/course-optimization/ita-seed-348-non-voleva-sapere-phrases-2026-09-28.cjs    # apply + Italian audio

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-seed-348-non-voleva-sapere-phrases-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#621·I';
const RULING = 'Kai, 2026-09-28 22:16Z (job #621·I): seed 348 keeps its single LEGO S0348L01 "what was going to happen"; the uncovered half "she didn\'t want to know | non voleva sapere" gets NO LEGO because it is built from taught pieces (voleva S0053L01, non S0071L01, sapere S0045L02) — it is covered by many phrases in the seed, each still containing the LEGO, and seeded earlier in suitable LEGOs (84, 107, 162, 201, 208) where the pieces are available (canon L30); edited seeds unapproved';
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const AZURE_VOICE_IDS = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };

// ── Rules (pure; the test exercises these) ─────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
/** The live gate's rule (checkWordContainment): every word of the needle is in the hay, as a multiset, any order. */
function containsWords(hay, needle) {
  const have = {}; for (const w of words(hay)) have[w] = (have[w] || 0) + 1;
  for (const w of words(needle)) { if (!have[w]) return false; have[w]--; }
  return true;
}
/** Every non-component row contains its LEGO on both sides (Kai 2026-08-28: build AND use, all of them). */
const rowContainsLego = (row, lego) => containsWords(row.known, lego.known) && containsWords(row.target, lego.target);
/** The span this pass covers: a past "didn't want to know" over the Italian imperfect "non volev- sapere". */
const coversSpan = (row) => /\bdidn't want to know\b/.test(norm(row.known)) && /\bnon volev(o|a|amo|ano|i) sapere\b/.test(norm(row.target));
/** Where the LEGO sits in the known text — the lego_position column the builder writes. */
function legoPosition(known, legoKnown) {
  const k = norm(known), l = norm(legoKnown);
  if (k === l || k.startsWith(l + ' ')) return 'start';
  if (k.endsWith(' ' + l)) return 'end';
  return 'middle';
}
/**
 * The rule as a predicate (canon L30): a seed span built entirely from taught pieces needs no LEGO — it is covered by
 * MANY phrases in the seed. "Many" here = at least MANY_MIN phrase rows of the seed carrying the span. Before this pass
 * seed 348 had 2 (B03 and U01, the seed sentence twice); after it has 9.
 */
const MANY_MIN = 6;
const spanCoveredByPhrases = (rows) => rows.filter(r => r.role !== 'component' && coversSpan(r)).length >= MANY_MIN;

// ── The changes ────────────────────────────────────────────────────────────────────────
const SEED_348 = { known: "she didn't want to know what was going to happen", target: 'non voleva sapere che cosa sarebbe successo' };
const PIECES = { S0053L01: { known: 'she wanted to', target: 'voleva' }, S0071L01: { known: "we didn't want to", target: 'non volevamo' }, S0045L02: { known: 'to know', target: 'sapere' }, S0208L01: { known: "I didn't want to", target: 'non volevo' } };
const LEGOS = {
  S0348L01: { seed: 348, lego_index: 1, known: 'what was going to happen', target: 'che cosa sarebbe successo' },
  S0084L01: { seed: 84, lego_index: 1, known: 'what he said', target: 'quello che ha detto' },
  S0107L02: { seed: 107, lego_index: 2, known: 'what you were doing', target: 'che cosa stavi facendo' },
  S0162L01: { seed: 162, lego_index: 1, known: 'about it', target: 'ne' },
  S0201L02: { seed: 201, lego_index: 2, known: 'to know', target: 'sapere' },
  S0208L01: { seed: 208, lego_index: 1, known: "I didn't want to", target: 'non volevo' },
};
/** The live seed-348 rows as read on 2026-09-28 22:25Z, after job #618·I re-cut the components under K29 (the BEFORE state the test proves against). */
const BEFORE_348 = [
  { id: 'S0348L01C01', role: 'component', known: 'what', target: 'che cosa' },
  { id: 'S0348L01C02', role: 'component', known: 'was going to', target: 'sarebbe' },
  { id: 'S0348L01C03', role: 'component', known: 'happen', target: 'successo' },
  { id: 'S0348L01B01', role: 'build', known: 'what was going to happen', target: 'che cosa sarebbe successo' },
  { id: 'S0348L01B02', role: 'build', known: 'to know what was going to happen', target: 'sapere che cosa sarebbe successo' },
  { id: 'S0348L01B03', role: 'build', known: "she didn't want to know what was going to happen", target: 'non voleva sapere che cosa sarebbe successo' },
  { id: 'S0348L01U01', role: 'use', known: "she didn't want to know what was going to happen", target: 'non voleva sapere che cosa sarebbe successo' },
  { id: 'S0348L01U02', role: 'use', known: 'he wanted to know what was going to happen', target: 'voleva sapere che cosa sarebbe successo' },
  { id: 'S0348L01U03', role: 'use', known: 'I liked knowing what was going to happen', target: 'mi piaceva sapere che cosa sarebbe successo' },
  { id: 'S0348L01U04', role: 'use', known: "I'm sure she knew what was going to happen", target: 'sono sicuro che sapeva che cosa sarebbe successo' },
  { id: 'S0348L01U05', role: 'use', known: 'she said she wanted to know what was going to happen', target: 'ha detto che voleva sapere che cosa sarebbe successo' },
];
// New USE rows. English patterns are ones the learner has already met on the known side (he told me he… 129,
// I'm sure 340, she said she… 348 U05, next→dopo 201); Italian is taught pieces only (guarded live per word).
const NEW_ROWS = [
  // (1) seed 348 — every row contains S0348L01 on both sides
  { id: 'S0348L01U06', lego: 'S0348L01', known: "he didn't want to know what was going to happen", target: 'non voleva sapere che cosa sarebbe successo' },
  { id: 'S0348L01U07', lego: 'S0348L01', known: "she didn't want to know what was going to happen next", target: 'non voleva sapere che cosa sarebbe successo dopo' },
  { id: 'S0348L01U08', lego: 'S0348L01', known: "I didn't want to know what was going to happen", target: 'non volevo sapere che cosa sarebbe successo' },
  { id: 'S0348L01U09', lego: 'S0348L01', known: "we didn't want to know what was going to happen", target: 'non volevamo sapere che cosa sarebbe successo' },
  { id: 'S0348L01U10', lego: 'S0348L01', known: "she said she didn't want to know what was going to happen", target: 'ha detto che non voleva sapere che cosa sarebbe successo' },
  { id: 'S0348L01U11', lego: 'S0348L01', known: "I'm sure she didn't want to know what was going to happen", target: 'sono sicuro che non voleva sapere che cosa sarebbe successo' },
  { id: 'S0348L01U12', lego: 'S0348L01', known: "he told me he didn't want to know what was going to happen", target: 'mi ha detto che non voleva sapere che cosa sarebbe successo' },
  // (2) earlier seeds, after 71 — each row contains its own LEGO
  { id: 'S0084L01U08', lego: 'S0084L01', known: "she didn't want to know what he said", target: 'non voleva sapere quello che ha detto' },
  { id: 'S0107L02U09', lego: 'S0107L02', known: "he didn't want to know what you were doing", target: 'non voleva sapere che cosa stavi facendo' },
  { id: 'S0162L01U10', lego: 'S0162L01', known: "she didn't want to know what you think about it", target: 'non voleva sapere che cosa ne pensi' },
  { id: 'S0201L02U10', lego: 'S0201L02', known: "she didn't want to know why", target: 'non voleva sapere perché' },
  { id: 'S0201L02U11', lego: 'S0201L02', known: "we didn't want to know what to do", target: 'non volevamo sapere che cosa fare' },
  { id: 'S0208L01U09', lego: 'S0208L01', known: "I didn't want to know", target: 'non volevo sapere' },
  { id: 'S0208L01U10', lego: 'S0208L01', known: "I didn't want to know why", target: 'non volevo sapere perché' },
];
for (const r of NEW_ROWS) { const l = LEGOS[r.lego]; r.seed = l.seed; r.lego_index = l.lego_index; r.role = 'use'; r.lego_position = legoPosition(r.known, l.known); }
const AFTER_348 = [...BEFORE_348, ...NEW_ROWS.filter(r => r.seed === 348)];
const SEEDS = [...new Set(NEW_ROWS.map(r => r.seed))].sort((a, b) => a - b);
const OUT_OF_SCOPE_SEEDS = [347, 608, 618]; // sibling jobs (#618·I; the K28 subject-LEGO growth) — asserted untouched
const EARLIEST_SEED_FOR_SPAN = 72; // Kai: "after 71, when all the pieces exist"

// ── Live ────────────────────────────────────────────────────────────────────────────────
async function newVocabulary(pg, seed, text, side) {
  const col = side === 'known' ? 'known_text' : 'target_text';
  const out = [];
  for (const w of new Set(words(text))) {
    const { rows } = await pg.query(
      `SELECT 1 FROM (SELECT seed_number, ${col} AS t FROM course_practice_phrases WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_legos WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_seeds WHERE course_code=$1) x
       WHERE seed_number <= $2 AND ' '||regexp_replace(lower(replace(t,'’','''')), '[.,!?;:"]', ' ', 'g')||' ' LIKE '% '||$3||' %' LIMIT 1`, [COURSE, seed, w]);
    if (!rows.length) out.push(w);
  }
  return out;
}
async function guardLive(pg, problems, log) {
  const { rows: [s348] } = await pg.query('SELECT known_text, target_text FROM course_seeds WHERE course_code=$1 AND seed_number=348', [COURSE]);
  if (!s348 || s348.known_text !== SEED_348.known || s348.target_text !== SEED_348.target) problems.push(`seed 348 reads "${s348?.known_text}" → "${s348?.target_text}"`);
  const { rows: legos } = await pg.query('SELECT lego_id, seed_number, lego_index, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)', [COURSE, [...Object.keys(LEGOS), ...Object.keys(PIECES)]]);
  for (const [id, l] of Object.entries({ ...PIECES, ...LEGOS })) {
    const r = legos.find(x => x.lego_id === id);
    if (!r || r.known_text !== l.known || r.target_text !== l.target) problems.push(`${id} reads "${r?.known_text}" → "${r?.target_text}" — expected "${l.known}" → "${l.target}"`);
    if (l.seed && r && (r.seed_number !== l.seed || r.lego_index !== l.lego_index)) problems.push(`${id} is seed ${r.seed_number} lego ${r.lego_index}, expected ${l.seed}/${l.lego_index}`);
  }
  // Seed 348 reads exactly as the BEFORE state this pass was written against.
  const { rows: live348 } = await pg.query(`SELECT split_part(id,':',2) id, phrase_role AS role, known_text AS known, target_text AS target FROM course_practice_phrases WHERE course_code=$1 AND seed_number=348 ORDER BY position`, [COURSE]);
  if (JSON.stringify(live348) !== JSON.stringify(BEFORE_348)) problems.push(`seed 348 rows differ from the BEFORE state: ${JSON.stringify(live348)}`);
  // None of the new ids exist; positions are computed live as max+1 per basket.
  const { rows: clash } = await pg.query('SELECT id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)', [COURSE, NEW_ROWS.map(r => `${COURSE}:${r.id}`)]);
  for (const c of clash) problems.push(`${c.id} already exists`);
  log.positions = {};
  for (const key of new Set(NEW_ROWS.map(r => r.lego))) {
    const l = LEGOS[key];
    const { rows: [m] } = await pg.query('SELECT max(position) p FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3', [COURSE, l.seed, l.lego_index]);
    let p = (m?.p ?? 0);
    for (const r of NEW_ROWS.filter(x => x.lego === key)) { r.position = ++p; }
    log.positions[key] = NEW_ROWS.filter(x => x.lego === key).map(r => `${r.id}@${r.position}`);
  }
  const { rows: seeds } = await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) ORDER BY 1', [COURSE, SEEDS]);
  log.seedsApprovedBefore = Object.fromEntries(seeds.map(s => [s.seed_number, s.approved_at]));
  // Concurrency: another surface editing these seeds today, other than the finished passes we know landed.
  const FINISHED = ['ita-seed-348-notnew-and-203-dup-2026-09-28', 'ita-missing-subject-2026-09-28', 'ita-seed-201-recut-2026-09-28', 'ita-heads-up-intros-2026-09-28', 'ita-say-it-that-this-2026-09-28', 'ita-zut-groupa-gloss-sweep-2026-09-28', 'ita-zut-groupa-followup-2026-09-28', 'ita-sonia-temporary-fill-2026-09-28', 'ita-intro-mirror-fix-2026-09-28', 'ita-noun-subject-pronoun-2026-09-28', 'ita-lego-downstream-audit-2026-09-28',
    // #618·I re-cut the S0201L03/S0348L01 COMPONENTS (K29) at 22:21Z, before this pass; its rulings (21:25–22:06Z) predate Kai's 22:16Z ruling here, and BEFORE_348 above is the state it left. Use rows appended after max(position) cannot collide with it.
    'ita-608p8-618p8-ten-calls-2026-09-28'];
  const { rows: ev } = await pg.query(`SELECT id, surface, operation, scope->'seed_numbers' AS seeds FROM content_edit_events WHERE course_code=$1 AND occurred_at > now() - interval '30 hours' AND surface NOT LIKE '%' || $2 || '%' AND NOT (surface LIKE ANY($3)) AND scope->'seed_numbers' ?| $4::text[]`,
    [COURSE, SWEEP, FINISHED.map(f => `%${f}%`), SEEDS.map(String)]);
  // scope.seed_numbers is stored as JSON numbers; ?| matches strings only, so check containment too.
  const { rows: ev2 } = await pg.query(`SELECT id, surface, operation, scope->'seed_numbers' AS seeds FROM content_edit_events WHERE course_code=$1 AND occurred_at > now() - interval '30 hours' AND surface NOT LIKE '%' || $2 || '%' AND NOT (surface LIKE ANY($3)) AND EXISTS (SELECT 1 FROM jsonb_array_elements(scope->'seed_numbers') e WHERE (e#>>'{}')::int = ANY($4))`,
    [COURSE, SWEEP, FINISHED.map(f => `%${f}%`), SEEDS]);
  for (const e of [...ev, ...ev2]) problems.push(`another surface touched ${JSON.stringify(e.seeds)} today: ${e.surface} ${e.operation} (${e.id}) — re-read before writing`);
}
async function guards(pg, problems, log) {
  // The rule holds on paper: 348 was NOT covered before and IS covered after; every new row contains its LEGO and the span.
  if (spanCoveredByPhrases(BEFORE_348)) problems.push('seed 348 already covered the span before this pass — why add?');
  if (!spanCoveredByPhrases(AFTER_348)) problems.push('seed 348 would still not cover the span after this pass');
  for (const r of NEW_ROWS) {
    if (!rowContainsLego(r, LEGOS[r.lego])) problems.push(`${r.id} "${r.known}" → "${r.target}" does not contain ${r.lego}`);
    if (!coversSpan(r)) problems.push(`${r.id} does not carry "didn't want to know | non volev- sapere"`);
    if (r.seed < EARLIEST_SEED_FOR_SPAN) problems.push(`${r.id} is before seed ${EARLIEST_SEED_FOR_SPAN}: the pieces are not all taught yet`);
    if (OUT_OF_SCOPE_SEEDS.includes(r.seed)) problems.push(`${r.id} is in an out-of-scope seed (sibling job)`);
    const nk = await newVocabulary(pg, r.seed, r.known, 'known'), nt = await newVocabulary(pg, r.seed, r.target, 'target');
    if (nk.length || nt.length) problems.push(`${r.id} introduces vocabulary not taught by seed ${r.seed}: ${[...nk, ...nt].join(', ')}`);
  }
  // ZUT vs the course: a new known must not already map to a different target (the reverse is listed, not a defect).
  const ours = new Set(NEW_ROWS.map(r => r.id));
  log.zut = []; log.targetSide = [];
  for (const r of NEW_ROWS) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND (lower(trim(known_text))=lower(trim($2)) OR lower(trim(target_text))=lower(trim($3)))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND (lower(trim(known_text))=lower(trim($2)) OR lower(trim(target_text))=lower(trim($3)))`, [COURSE, r.known, r.target]);
    for (const x of rows) {
      const rid = x.id.replace(`${COURSE}:`, ''); if (ours.has(rid)) continue;
      const sameK = norm(x.known_text) === norm(r.known), sameT = norm(x.target_text) === norm(r.target);
      if (sameK && !sameT) log.zut.push(`${r.id} "${r.known}" → "${r.target}" vs ${rid} "${x.known_text}" → "${x.target_text}"`);
      else if (sameT && !sameK) log.targetSide.push(`${r.id} "${r.known}" shares its Italian with ${rid} "${x.known_text}"`);
    }
    // Within this pass too: two new rows with the same English must agree on the Italian.
    for (const o of NEW_ROWS) if (o !== r && norm(o.known) === norm(r.known) && norm(o.target) !== norm(r.target)) log.zut.push(`${r.id} vs ${o.id}: same English, different Italian`);
  }
  problems.push(...new Set(log.zut));
  // Standing rule — later phrases: every row after 348 saying "didn't/doesn't want to know", with its Italian, for the eye.
  const { rows: later } = await pg.query(`SELECT split_part(id,':',2) id, seed_number, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND seed_number > 348 AND (lower(known_text) ~ 'n''t want to know' OR lower(target_text) ~ 'non vol\\w+ sapere|non voglia sapere') ORDER BY seed_number, id`, [COURSE]);
  log.laterUses = later;
  // A later PAST-frame row whose Italian is not the imperfect "non volev- sapere" would be an inconsistency to report.
  log.laterInconsistent = later.filter(r => /didn't want to know/.test(norm(r.known_text)) && !/\bnon volev\w+ sapere\b/.test(norm(r.target_text))).map(r => r.id);
  // The span's first phrase appearance course-wide — reported so the "seeded earlier" claim is a number, not a feeling.
  const { rows: [first] } = await pg.query(`SELECT min(seed_number) s, count(*) n FROM course_practice_phrases WHERE course_code=$1 AND lower(target_text) ~ '\\mnon volev\\w+ sapere\\M'`, [COURSE]);
  log.spanBefore = first;
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-add', scope: { seed_numbers: SEEDS, phrase_ids: NEW_ROWS.map(r => `${COURSE}:${r.id}`), rows: NEW_ROWS.length },
    detail: { ruling: RULING, job: JOB, rows: NEW_ROWS.map(r => ({ id: `${COURSE}:${r.id}`, seed: r.seed, lego: r.lego, position: r.position, role: r.role, known: r.known, target: r.target })) } });
  const toUnapprove = SEEDS.filter(s => log.seedsApprovedBefore[s]);
  const unapproveEvent = toUnapprove.length ? await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: toUnapprove, rows: toUnapprove.length }, detail: { why: 'new practice phrases added under Kai\'s ruling of 2026-09-28 22:16Z; new phrases arrive unchecked', job: JOB, approved_at_before: log.seedsApprovedBefore } }) : null;
  log.events = { phraseEvent, unapproveEvent, unapproved: toUnapprove };
  await pg.query('BEGIN');
  try {
    for (const r of NEW_ROWS) {
      const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, last_edit_event_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft','use','{}',$11,$12,true,$13)`,
        [`${COURSE}:${r.id}`, COURSE, r.seed, r.lego_index, r.position, r.known, r.target, r.target.length, r.target.split(/\s+/).length, JSON.stringify({ format: 'build_use', source: SWEEP, job: JOB }), r.lego_position, r.lego, phraseEvent]);
      if (ins.rowCount !== 1) throw new Error(`${r.id}: insert ${ins.rowCount}`);
    }
    if (toUnapprove.length) {
      const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [unapproveEvent, COURSE, toUnapprove]);
      if (un.rowCount !== toUnapprove.length) throw new Error('seed unapprove');
    }
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: ${NEW_ROWS.length} "didn't want to know | non volev- sapere" phrases added (seed 348 + earlier seeds); Italian linked/rendered on Elsa/Benigno by the tool, English prompts on temporary Sonia`, metadata: { job: JOB, seeds: SEEDS, rows: NEW_ROWS.length } });
}

// ── Audio (the #579·I/#580·I/#590·I route, unchanged) ─────────────────────────────────────
function ttsDeps() {
  process.env.PHASE8_NO_LISTEN = '1';
  return {
    phase8: require('../../services/phases/phase8-audio-v13.cjs'), ttsService: require('../../services/tts-service.cjs'), veracity: require('../../services/audio-veracity.cjs'),
    voiceConfigService: require('../../services/voice-config-service.cjs'), writeOrSwapClip: require('../../services/shared/audio-revision-swap.cjs').writeOrSwapClip,
    normalizeForAudio: require('../../services/shared/text-normalize.cjs').normalizeForAudio, S3: require('@aws-sdk/client-s3'), uuidv4: require('uuid').v4,
  };
}
async function renderClip(supabase, { text, role, voice, voiceIds }) {
  const d = ttsDeps();
  const s3 = new d.S3.S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });
  const renderAndMaster = async () => {
    const out = await d.ttsService.generateWithRetry(text, 'azure', { door: { courseCode: COURSE, intro: false, language: 'ita', voiceBound: true }, subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope', voiceName: voice.voiceName, speed: 1 });
    if (out.existingClip && !voiceIds.includes(out.existingClip.voice_id)) throw new Error(`door offered ${out.existingClip.voice_id}; ${voice.voiceName} only`);
    const { buffer, durationMs } = await d.phase8.masterAudio(out.audioBuffer, text, await d.voiceConfigService.masteringOptsFor(voice.voiceName, 'azure'));
    return { buffer, durationMs, wordBoundaries: out.wordBoundaries };
  };
  const gated = await d.veracity.renderChecked({ render: renderAndMaster, expectedText: text, language: 'ita', sampler: d.veracity.ALWAYS_SAMPLER, logger: console, meta: { courseCode: COURSE, role, voiceId: voice.voiceName, originalText: text } });
  if (!gated.published) throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason})`);
  const newAudioId = d.uuidv4().toUpperCase(), newS3Key = `mastered/${newAudioId}.mp3`;
  await s3.send(new d.S3.PutObjectCommand({ Bucket: d.phase8.S3_BUCKET, Key: newS3Key, Body: gated.buffer, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
  const verdictColumns = d.veracity.verdictColumns(gated.verdict, { checker: SWEEP, attempts: gated.attempts });
  const textNormalized = d.normalizeForAudio(text);
  const base = { course_code: COURSE, text, text_normalized: textNormalized, language: 'ita', role, voice_id: voice.voiceId, origin: 'tts' };
  const out = await d.writeOrSwapClip({ supabase, identity: { course_code: COURSE, text_normalized: textNormalized, language: 'ita', role, voice_id: voice.voiceId }, insertRow: { ...base, s3_key: newS3Key, duration_ms: gated.durationMs, word_boundaries: gated.wordBoundaries || null, ...verdictColumns }, swapPatch: { voice_id: voice.voiceId, origin: 'tts', word_boundaries: gated.wordBoundaries || null, text, ...verdictColumns }, newS3Key, durationMs: gated.durationMs, source: SWEEP, acceptedBy: `${SWEEP} (${role}, ${voice.voiceName})`, reason: RULING, logger: console });
  return { audioId: out.audioId, durationMs: gated.durationMs };
}
async function fillItalian(pg, supabase, log) {
  const ids = NEW_ROWS.map(r => `${COURSE}:${r.id}`);
  const { rows } = await pg.query(`SELECT id, target_text, target1_audio_id, target2_audio_id, last_edit_event_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) ORDER BY seed_number, position`, [COURSE, ids]);
  for (const r of rows) for (const role of ['target1', 'target2']) {
    if (r[`${role}_audio_id`]) continue;
    const entry = { id: r.id, role, text: r.target_text }; log.audio.push(entry);
    const voice = role === 'target1' ? ELSA : BENIGNO;
    try {
      const { rows: have } = await pg.query(`SELECT id, voice_id FROM course_audio WHERE language='ita' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($2) ORDER BY (course_code=$3) DESC, (role=$4) DESC, created_at DESC LIMIT 1`, [r.target_text, AZURE_VOICE_IDS[role], COURSE, role]);
      let audioId = have[0]?.id;
      if (audioId) entry.result = `linked existing ${have[0].voice_id} clip ${audioId}`;
      else { const out = await renderClip(supabase, { text: r.target_text, role, voice, voiceIds: AZURE_VOICE_IDS[role] }); audioId = out.audioId; entry.result = `rendered ${voice.voiceName} clip ${audioId} (${out.durationMs} ms)`; }
      const u = await pg.query(`UPDATE course_practice_phrases SET ${role}_audio_id=$1 WHERE course_code=$2 AND id=$3 AND target_text=$4 AND ${role}_audio_id IS NULL`, [audioId, COURSE, r.id, r.target_text]);
      const { rows: [now] } = await pg.query(`SELECT a.id, a.voice_id FROM course_practice_phrases x LEFT JOIN course_audio a ON a.id=x.${role}_audio_id WHERE x.course_code=$1 AND x.id=$2`, [COURSE, r.id]);
      // The audio_autolink trigger links the empty slot on insert (seen live, job #580·I): rowCount 0 with our own clip in the slot is success.
      if (u.rowCount !== 1 && now?.id === audioId) entry.result += ' — linked by the audio_autolink trigger on insert';
      entry.linked = now?.id || null; entry.linkedVoice = now?.voice_id || null;
      if (!now?.id || !AZURE_VOICE_IDS[role].includes(now.voice_id)) entry.result += ` — SLOT NOT ON CAST VOICE (${now?.voice_id})`;
    } catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; }
  }
}
async function silentEnglish(pg) {
  const { rows } = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) AND known_audio_id IS NULL ORDER BY seed_number, position`, [COURSE, NEW_ROWS.map(r => `${COURSE}:${r.id}`)]);
  return rows.map(r => r.id);
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, ruling: RULING, job: JOB, apply: APPLY, started: new Date().toISOString(), problems: [], audio: [] };
  console.log(`\n══ ${COURSE} — seed 348 "non voleva sapere" covered by phrases, seeded earlier — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  await guardLive(pg, log.problems, log);
  if (!log.problems.length) await guards(pg, log.problems, log);
  console.log('\nPLAN (new USE rows):');
  for (const r of NEW_ROWS) console.log(`  ${r.id.padEnd(12)} seed ${String(r.seed).padStart(3)} pos ${String(r.position ?? '?').padStart(2)} [${r.lego}] "${r.known}" → "${r.target}"`);
  console.log(`  seed 348 rows carrying the span: before ${BEFORE_348.filter(coversSpan).length}, after ${AFTER_348.filter(coversSpan).length} (MANY = ${MANY_MIN}+)`);
  console.log(`  span "non volev- sapere" in the course before this pass: first at seed ${log.spanBefore?.s}, ${log.spanBefore?.n} rows`);
  console.log(`  seeds ${SEEDS.join(',')} — approved_at before: ${JSON.stringify(log.seedsApprovedBefore)}; to unapprove: ${SEEDS.filter(s => log.seedsApprovedBefore?.[s]).join(',') || 'none (all already unapproved)'}`);
  console.log(`  later phrases (seed > 348) with "…n't want to know": ${JSON.stringify(log.laterUses || [])}`);
  console.log(`  later past-frame rows NOT on "non volev- sapere" (inconsistency, for Kai): ${JSON.stringify(log.laterInconsistent || [])}`);
  if (log.targetSide?.length) { console.log('same Italian under a different English elsewhere (listed, not a defect):'); for (const t of new Set(log.targetSide)) console.log('  ' + t); }
  console.log(log.problems.length ? '\nPROBLEMS:\n  ' + log.problems.join('\n  ') : '\nguards hold');
  if (APPLY && !log.problems.length) {
    await applyContent(pg, supabase, log); console.log(`APPLIED. events=${JSON.stringify(log.events)}`);
    await fillItalian(pg, supabase, log);
    console.log('ITALIAN AUDIO:'); for (const a of log.audio) console.log(`  ${a.id} ${a.role} "${a.text}": ${a.result}`);
    log.silentEnglish = await silentEnglish(pg);
    console.log(`ENGLISH prompts to fill on temporary Sonia (${log.silentEnglish.length}):\n  SCOPE=ids IDS=${log.silentEnglish.join(',')} APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs`);
    if (log.audio.some(a => /REFUSED|FAILED|NOT ON CAST/.test(a.result))) log.problems.push('some Italian slots were not filled — see audio');
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end(); process.exit(log.problems.length ? 2 : 0);
}
module.exports = { norm, containsWords, rowContainsLego, coversSpan, legoPosition, spanCoveredByPhrases, MANY_MIN, NEW_ROWS, LEGOS, PIECES, BEFORE_348, AFTER_348, SEED_348, SEEDS, OUT_OF_SCOPE_SEEDS, EARLIEST_SEED_FOR_SPAN };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
