#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-seed-608-phrases-609-notnew-2026-09-28.cjs
//
// ita_for_eng — seed 608 phrase fixes + seed 609 L02 marked NOT NEW (Kai, 2026-09-28 19:30Z, job #590·I).
//
// (A) Seed 608 "it would have been the sensible thing to do" → "sarebbe stata la cosa sensata da fare";
//     LEGOs L01 sensible|sensata, L02 it would have been|sarebbe stata, L03 the thing to do|la cosa da fare.
//     Five phrases said something the Italian did not. The English is fixed to match the Italian:
//       L01U02  "that's the sensible thing to say"            → "that's the most sensible thing to say"   (più is there)
//       L03U01  "it would have been the sensible thing to do" → "it would have been the most sensible thing to do"
//       L01U04  "it seemed the most sensible"                 → "it was the most sensible thing"          (era la cosa …)
//       L03U03  "she did the right thing to do"               → see RIGHT below
//       L03U04  "this is the right thing to do"               → "this is the thing to do"                 (Kai's own example)
//     RIGHT: Kai's rule — if giusta ("right") was taught before 608, the Italian becomes "la cosa giusta da
//     fare"; otherwise "right" comes out of the English and the sentence is made natural. The tool ASSERTS
//     which branch holds (GIUSTA_TAUGHT_BEFORE_608) rather than trusting this comment. Live answer on
//     2026-09-28: giusta/giusto appears in NO LEGO and NO phrase of the course before 608, so the English
//     drops "right". "she did the thing to do" is not English anyone says, so L03U03 becomes
//     "it was the thing to do" → "era la cosa da fare" (era = "it was" is the same pair the seed's own L01U04
//     now uses; nothing new). Both sides move on that one row only.
//     più = "most": taught long before 608 (S0280L02 "most important | più importante", S0492L03 "the most
//     interesting | il più interessante") — asserted below, reported, nothing to fix.
//
// (C) Kai's standing rule (19:30Z): a change is checked against EVERY LATER phrase in the course that uses
//     the old or new form. The only later row with the same defect is S0618L01B03 "it doesn't feel like the
//     right thing → non sembra la cosa da fare" — "right" again with no giusta — so it takes the same fix:
//     "it doesn't feel like the thing to do" (its LEGO S0618L01 "it doesn't feel like" is still whole).
//     No other phrase after 608 carries "right thing", "sensible", "sensat-" or "cosa da fare".
//
// (B) Seed 609 L02 "the sensible thing to do | la cosa sensata da fare" (cut by #579·I). It is NOT a duplicate:
//     no earlier LEGO matches it on either side. It IS a combination of two LEGOs taught in the seed before it
//     (S0608L01 sensible|sensata + S0608L03 the thing to do|la cosa da fare), and 608 already drills the exact
//     string as a phrase (S0608L03B02 "the sensible thing to do | la cosa sensata da fare", plus U01/U02/U05).
//     Canon L17: a debut may be suppressed (is_new:false) when the pattern is one the learner is by now familiar
//     with; canon (Kai, 2026-09-28): "it can be not new if it's already introduced". Course convention for a
//     not-new LEGO: NO intro (S0519L04 / S0201L01-02 / S0348L01 precedent) — the Sonia intro clip is detached
//     and kept, lego_introductions cleared, the drop recorded. The LEGO stays (never delete a LEGO); its build
//     basket stays; the player's intro cycle falls back to the known prompt (cycles.ts: presentation || known).
//
// AFTER THE EDIT: English slots of changed rows are detached → ita-sonia-temporary-fill SCOPE=ids (temporary
// Sonia, cast restored byte-identical); Italian for L03U03 linked to an existing Elsa/Benigno clip or rendered
// through the one TTS door; seed 608 unapproved (609 and 618 already are); check-intro-mirror --strict;
// audit-phrase-zut strict must stay at 57.
//
//   node tools/course-optimization/ita-seed-608-phrases-609-notnew-2026-09-28.cjs            # dry run
//   APPLY=1 node tools/course-optimization/ita-seed-608-phrases-609-notnew-2026-09-28.cjs    # apply + Italian audio

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-seed-608-phrases-609-notnew-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#590·I';
const RULING = 'Kai, 2026-09-28 19:30Z (job #590·I): seed 608 phrases say what the Italian says (most where più is, no "right" where no giusta — giusta is untaught before 608); S0609L02 "the sensible thing to do" is a combination of the two LEGOs 608 teaches and is drilled there as a phrase, so it is NOT NEW and carries no intro (canon L17; not-new = no intro, S0519L04 precedent); every later phrase using the old or new form checked (S0618L01B03 fixed the same way); seed 608 unapproved';
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const AZURE_VOICE_IDS = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };
const SONIA_VOICE_ID = 'azure_en-GB-SoniaNeural';

// ── Rules (pure; the test exercises these) ─────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
const containsChunk = (hay, needle) => (' ' + norm(hay) + ' ').includes(' ' + norm(needle) + ' ');
const sameLegoBothSides = (a, b) => norm(a.known) === norm(b.known) && norm(a.target) === norm(b.target);
/**
 * The 608 defect, as a rule: the English says "right" (the thing / the way) but the Italian has no giusto/giusta.
 * True = defective. Fails on every BEFORE row below, passes on every AFTER row — that is the proving test.
 */
function rightWithoutGiusta(row) {
  return /\bright\b/.test(norm(row.known)) && !/\bgiust[aoie]\b/.test(norm(row.target));
}
/** The other 608 defect: the Italian has più (most) and the English has no "most". True = defective. */
function piuWithoutMost(row) {
  return words(row.target).includes('più') && !/\b(most|more|later|possible|else)\b/.test(norm(row.known));
}
/** The live gate's rule (checkWordContainment): every word of the needle is in the hay, as a multiset, any order. */
function containsWords(hay, needle) {
  const have = {}; for (const w of words(hay)) have[w] = (have[w] || 0) + 1;
  for (const w of words(needle)) { if (!have[w]) return false; have[w]--; }
  return true;
}
/** Remove the needle's words from the hay's multiset; what is left (a string of leftover words). */
function minusWords(hay, needle) {
  const take = {}; for (const w of words(needle)) take[w] = (take[w] || 0) + 1;
  return words(hay).filter(w => (take[w] ? (take[w]--, false) : true)).join(' ');
}
/**
 * Every non-component row contains its LEGO on both sides (O12) — by the live gate's rule (word multiset), which
 * is what every 608 L03 row already relies on: "the [most] sensible thing to do" carries "the thing to do" split.
 */
const rowContainsLego = (row, lego) => containsWords(row.known, lego.known) && containsWords(row.target, lego.target);
/**
 * Canon L17 / Kai 2026-09-28: a LEGO is a DUPLICATE only if an earlier LEGO matches it on BOTH sides; it is
 * NOT NEW (no intro, no debut announcement) when it is made entirely of LEGOs already taught and the learner has
 * already met the exact pair. Returns 'duplicate' | 'not-new' | 'new'.
 */
function debutStatus(lego, { earlierLegos, earlierPhrasePairs }) {
  if (earlierLegos.some(l => sameLegoBothSides(l, lego))) return 'duplicate';
  // Tiled by taught LEGOs under the live gate's word rule: 608's "the [sensible] thing to do" is L03 with L01 inside it.
  let k = norm(lego.known), t = norm(lego.target);
  for (const l of earlierLegos) if (containsWords(k, l.known) && containsWords(t, l.target)) { k = minusWords(k, l.known); t = minusWords(t, l.target); }
  const tiledByTaught = k === '' && t === '';
  const metAsPhrase = earlierPhrasePairs.some(p => sameLegoBothSides(p, lego));
  return tiledByTaught && metAsPhrase ? 'not-new' : 'new';
}

// ── The changes ────────────────────────────────────────────────────────────────────────
const SEED_608 = { known: 'it would have been the sensible thing to do', target: 'sarebbe stata la cosa sensata da fare' };
const LEGOS = {
  S0608L01: { known: 'sensible', target: 'sensata' },
  S0608L02: { known: 'it would have been', target: 'sarebbe stata' },
  S0608L03: { known: 'the thing to do', target: 'la cosa da fare' },
  S0609L02: { known: 'the sensible thing to do', target: 'la cosa sensata da fare' },
  S0618L01: { known: "it doesn't feel like", target: 'non sembra' },
};
const CHANGES = [
  { id: 'S0608L01U02', seed: 608, lego: 'S0608L01', role: 'use', before: { known: "that's the sensible thing to say", target: 'è la cosa più sensata da dire' }, after: { known: "that's the most sensible thing to say", target: 'è la cosa più sensata da dire' } },
  { id: 'S0608L03U01', seed: 608, lego: 'S0608L03', role: 'use', before: { known: 'it would have been the sensible thing to do', target: 'sarebbe stata la cosa più sensata da fare' }, after: { known: 'it would have been the most sensible thing to do', target: 'sarebbe stata la cosa più sensata da fare' } },
  { id: 'S0608L01U04', seed: 608, lego: 'S0608L01', role: 'use', before: { known: 'it seemed the most sensible', target: 'era la cosa più sensata' }, after: { known: 'it was the most sensible thing', target: 'era la cosa più sensata' } },
  { id: 'S0608L03U03', seed: 608, lego: 'S0608L03', role: 'use', before: { known: 'she did the right thing to do', target: 'ha fatto la cosa da fare' }, after: { known: 'it was the thing to do', target: 'era la cosa da fare' } },
  { id: 'S0608L03U04', seed: 608, lego: 'S0608L03', role: 'use', before: { known: 'this is the right thing to do', target: 'questa è la cosa da fare' }, after: { known: 'this is the thing to do', target: 'questa è la cosa da fare' } },
  // (C) the one later phrase with the same defect
  { id: 'S0618L01B03', seed: 618, lego: 'S0618L01', role: 'build', before: { known: "it doesn't feel like the right thing", target: 'non sembra la cosa da fare' }, after: { known: "it doesn't feel like the thing to do", target: 'non sembra la cosa da fare' } },
];
for (const c of CHANGES) { c.knownChanged = norm(c.before.known) !== norm(c.after.known); c.targetChanged = norm(c.before.target) !== norm(c.after.target); }
const NOT_NEW = { lego_id: 'S0609L02', ...LEGOS.S0609L02, madeOf: ['S0608L01', 'S0608L03'], metAsPhraseAt: 'S0608L03B02' };
const UNAPPROVE_SEEDS = [608]; // 609 and 618 are already unapproved; asserted live
const MOST_TAUGHT_BY = ['S0280L02', 'S0492L03'];

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
  const { rows: seeds } = await pg.query('SELECT seed_number, known_text, target_text, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) ORDER BY 1', [COURSE, [608, 609, 618]]);
  const s608 = seeds.find(s => s.seed_number === 608);
  if (!s608 || s608.known_text !== SEED_608.known || s608.target_text !== SEED_608.target) problems.push(`seed 608 reads "${s608?.known_text}" → "${s608?.target_text}"`);
  log.seedsApprovedBefore = Object.fromEntries(seeds.map(s => [s.seed_number, s.approved_at]));
  for (const n of [609, 618]) if (log.seedsApprovedBefore[n]) problems.push(`seed ${n} is approved (${log.seedsApprovedBefore[n]}) — expected already unapproved; add it to UNAPPROVE_SEEDS`);
  const { rows: legos } = await pg.query('SELECT lego_id, known_text, target_text, is_new, presentation_audio_id::text AS presentation_audio_id, seed_number FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)', [COURSE, Object.keys(LEGOS)]);
  for (const [id, l] of Object.entries(LEGOS)) { const r = legos.find(x => x.lego_id === id); if (!r || r.known_text !== l.known || r.target_text !== l.target) problems.push(`${id} reads "${r?.known_text}" → "${r?.target_text}"`); }
  const l609 = legos.find(x => x.lego_id === NOT_NEW.lego_id);
  if (l609 && !l609.is_new) problems.push(`${NOT_NEW.lego_id} is already is_new=false`);
  log.oldIntro = null;
  if (l609?.presentation_audio_id) { const { rows: [a] } = await pg.query('SELECT id::text AS id, text, voice_id FROM course_audio WHERE id=$1', [l609.presentation_audio_id]); log.oldIntro = a || { id: l609.presentation_audio_id }; }
  const { rows: rows } = await pg.query(`SELECT split_part(id,':',2) id, phrase_role, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND split_part(id,':',2) = ANY($2)`, [COURSE, CHANGES.map(c => c.id)]);
  const byId = Object.fromEntries(rows.map(r => [r.id, r]));
  for (const c of CHANGES) { const r = byId[c.id]; if (!r || r.known_text !== c.before.known || r.target_text !== c.before.target || r.phrase_role !== c.role) problems.push(`${c.id} reads "${r?.known_text}" → "${r?.target_text}" (${r?.phrase_role}) — expected "${c.before.known}" → "${c.before.target}"`); }
  // Concurrency: another surface editing these seeds in the last 24 h (other than the finished #579·I/#580·I passes on 609).
  const FINISHED = ['ita-seed-609-recut-2026-09-28', 'ita-seed-609-u07-u09-italian-fill-2026-09-28', 'ita-sonia-temporary-fill-2026-09-28', 'ita-intro-mirror-fix-2026-09-28'];
  const { rows: ev } = await pg.query(`SELECT id, surface, operation FROM content_edit_events WHERE course_code=$1 AND occurred_at > now() - interval '24 hours' AND surface NOT LIKE '%' || $2 || '%' AND NOT (surface LIKE ANY($4)) AND scope->'seed_numbers' ?| $3::text[]`,
    [COURSE, SWEEP, ['608', '609', '618'], FINISHED.map(f => `%${f}%`)]);
  for (const e of ev) problems.push(`another surface touched 608/609/618 today: ${e.surface} ${e.operation} (${e.id}) — re-read before writing`);
}
async function guards(pg, problems, log) {
  // The RIGHT branch: is giusta taught before 608? (Kai: if so, the Italian takes "la cosa giusta da fare".)
  const { rows: g } = await pg.query(`SELECT min(seed_number) s FROM (SELECT seed_number, target_text FROM course_legos WHERE course_code=$1 UNION ALL SELECT seed_number, target_text FROM course_practice_phrases WHERE course_code=$1) x WHERE seed_number < 608 AND lower(target_text) ~ '\\mgiust[aoie]\\M'`, [COURSE]);
  log.giustaFirstSeed = g[0]?.s ?? null;
  if (log.giustaFirstSeed !== null) problems.push(`giusta IS taught before 608 (first at seed ${log.giustaFirstSeed}) — Kai's rule says the Italian becomes "la cosa giusta da fare"; this tool applies the other branch, re-plan`);
  // più = most introduced before 608?
  const { rows: m } = await pg.query(`SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2) AND seed_number < 608 AND lower(known_text) ~ '\\mmost\\M' AND lower(target_text) ~ '\\mpiù\\M'`, [COURSE, MOST_TAUGHT_BY]);
  log.mostTaughtBy = m;
  if (m.length !== MOST_TAUGHT_BY.length) problems.push(`più = most is not taught before 608 by ${MOST_TAUGHT_BY.join('/')} — report to Kai`);
  // The defects are real before and gone after; every row still contains its LEGO; nothing new is taught
  for (const c of CHANGES) {
    if (!rightWithoutGiusta(c.before) && !piuWithoutMost(c.before) && !/seemed/.test(c.before.known)) problems.push(`${c.id}: before-row has neither defect — why change it?`);
    if (rightWithoutGiusta(c.after) || piuWithoutMost(c.after)) problems.push(`${c.id}: after-row still defective`);
    if (!rowContainsLego(c.after, LEGOS[c.lego])) problems.push(`${c.id} "${c.after.known}" → "${c.after.target}" does not contain ${c.lego}`);
    const nk = await newVocabulary(pg, c.seed, c.after.known, 'known'), nt = await newVocabulary(pg, c.seed, c.after.target, 'target');
    if (nk.length || nt.length) problems.push(`${c.id} introduces vocabulary not taught by seed ${c.seed}: ${[...nk, ...nt].join(', ')}`);
  }
  // ZUT vs the course: a new known must not already map to a different target (and list shared Italian)
  const ours = new Set(CHANGES.map(c => c.id));
  log.zut = []; log.targetSide = [];
  for (const c of CHANGES) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND (lower(trim(known_text))=lower(trim($2)) OR lower(trim(target_text))=lower(trim($3)))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND (lower(trim(known_text))=lower(trim($2)) OR lower(trim(target_text))=lower(trim($3)))`, [COURSE, c.after.known, c.after.target]);
    for (const r of rows) {
      const rid = r.id.replace(`${COURSE}:`, ''); if (ours.has(rid)) continue;
      const sameK = norm(r.known_text) === norm(c.after.known), sameT = norm(r.target_text) === norm(c.after.target);
      if (sameK && !sameT) log.zut.push(`${c.id} "${c.after.known}" → "${c.after.target}" vs ${rid} "${r.known_text}" → "${r.target_text}"`);
      else if (sameT && !sameK) log.targetSide.push(`${c.id} "${c.after.known}" shares its Italian with ${rid} "${r.known_text}"`);
    }
  }
  problems.push(...log.zut);
  // (B) debut status of S0609L02 from the live course
  const { rows: earlier } = await pg.query('SELECT lego_id, known_text AS known, target_text AS target FROM course_legos WHERE course_code=$1 AND seed_number < 609', [COURSE]);
  const { rows: metRows } = await pg.query(`SELECT split_part(id,':',2) id, known_text AS known, target_text AS target FROM course_practice_phrases WHERE course_code=$1 AND seed_number < 609 AND lower(known_text)=lower($2) AND lower(target_text)=lower($3)`, [COURSE, NOT_NEW.known, NOT_NEW.target]);
  log.debut = { status: debutStatus(NOT_NEW, { earlierLegos: earlier, earlierPhrasePairs: metRows }), madeOf: earlier.filter(l => NOT_NEW.madeOf.includes(l.lego_id)), metAsPhrase: metRows.map(r => r.id) };
  if (log.debut.status !== 'not-new') problems.push(`S0609L02 debut status from the live course is "${log.debut.status}", expected not-new`);
  // (C) every later phrase in the course using the old or new forms — listed; anything not in CHANGES is a gap
  const { rows: later } = await pg.query(`SELECT split_part(id,':',2) id, seed_number, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND seed_number > 608 AND (lower(known_text) ~ 'right (thing|way)|sensible|thing to do' OR lower(target_text) ~ 'sensat|cosa da fare|cosa giusta') ORDER BY seed_number, id`, [COURSE]);
  log.laterUses = later.filter(r => r.seed_number !== 609);
  // A later row with the same defect that this pass does not fix is listed for Kai, never silently passed over.
  // S0618L01U03 "it doesn't feel like the right way → non sembra il modo da fare": the Italian is itself not Italian
  // ("il modo da fare"), giusto is untaught in the whole course, and no "right"-less English fits — both sides need
  // his rewrite (e.g. "it doesn't feel like the way to do it → non sembra il modo di farlo"; farlo S0092L02, il modo S0094L01).
  log.awaitingKai = log.laterUses.filter(r => !ours.has(r.id) && (rightWithoutGiusta({ known: r.known_text, target: r.target_text }) || piuWithoutMost({ known: r.known_text, target: r.target_text }))).map(r => ({ id: r.id, known: r.known_text, target: r.target_text }));
  log.later609 = later.filter(r => r.seed_number === 609).length;
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const legoEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-edit', scope: { seed_numbers: [609], lego_ids: [NOT_NEW.lego_id], rows: 1 }, detail: { ruling: RULING, job: JOB, change: 'is_new true → false; no text change', why: `combination of ${NOT_NEW.madeOf.join('+')}, met as phrase ${log.debut.metAsPhrase.join(',')} (canon L17); not-new carries no intro — clip detached and kept`, intro: { from: log.oldIntro, to: null } } });
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: [...new Set(CHANGES.map(c => c.seed))], phrase_ids: CHANGES.map(c => `${COURSE}:${c.id}`), rows: CHANGES.length },
    detail: { ruling: RULING, job: JOB, giustaFirstSeed: log.giustaFirstSeed, mostTaughtBy: log.mostTaughtBy, changes: CHANGES.map(c => ({ id: `${COURSE}:${c.id}`, role: c.role, known_from: c.before.known, target_from: c.before.target, known_to: c.after.known, target_to: c.after.target })) } });
  const unapproveEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: UNAPPROVE_SEEDS, rows: UNAPPROVE_SEEDS.length }, detail: { why: 'five phrases rewritten under Kai\'s ruling of 2026-09-28 19:30Z; needs his read', job: JOB, approved_at_before: log.seedsApprovedBefore } });
  log.events = { legoEvent, phraseEvent, unapproveEvent };
  await pg.query('BEGIN');
  try {
    // 1. S0609L02 not new, intro detached (clip kept), drop recorded
    const l = await pg.query('UPDATE course_legos SET is_new=false, presentation_audio_id=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND lego_id=$3 AND known_text=$4 AND target_text=$5 AND is_new=true', [legoEvent, COURSE, NOT_NEW.lego_id, NOT_NEW.known, NOT_NEW.target]);
    if (l.rowCount !== 1) throw new Error(`${NOT_NEW.lego_id}: ${l.rowCount} rows`);
    if (log.oldIntro?.id) {
      await pg.query('UPDATE course_audio SET lego_id=NULL WHERE id=$1 AND lego_id=$2', [log.oldIntro.id, NOT_NEW.lego_id]);
      await pg.query('UPDATE lego_introductions SET presentation_audio_id=NULL, audio_uuid=NULL, updated_at=now() WHERE course_code=$1 AND lego_id=$2', [COURSE, NOT_NEW.lego_id]);
      await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, old_text, old_voice_id, new_text, reason) VALUES ('course_legos',$1,$2,609,'presentation_audio_id','presentation',$3,$4,$5,NULL,$6)`,
        [NOT_NEW.lego_id, COURSE, log.oldIntro.id, log.oldIntro.text || null, log.oldIntro.voice_id || SONIA_VOICE_ID, `${SWEEP}: S0609L02 marked not new (combination of ${NOT_NEW.madeOf.join('+')}, drilled at ${log.debut.metAsPhrase.join(',')}; canon L17) — a not-new LEGO carries no intro (S0519L04 precedent); clip detached, asset kept (job ${JOB}, event ${legoEvent})`]);
    }
    // 2. Phrase rows re-textured in place; a side whose words did not move keeps its clips.
    for (const c of CHANGES) {
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4,
          known_audio_id=CASE WHEN $5 THEN NULL ELSE known_audio_id END, target1_audio_id=CASE WHEN $6 THEN NULL ELSE target1_audio_id END, target2_audio_id=CASE WHEN $6 THEN NULL ELSE target2_audio_id END,
          qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$7, updated_at=now()
        WHERE course_code=$8 AND id=$9 AND known_text=$10 AND target_text=$11`,
        [c.after.known, c.after.target, c.after.target.length, c.after.target.split(/\s+/).length, c.knownChanged, c.targetChanged, phraseEvent, COURSE, `${COURSE}:${c.id}`, c.before.known, c.before.target]);
      if (u.rowCount !== 1) throw new Error(`${c.id}: ${u.rowCount} rows (row moved under us — re-read and re-plan)`);
    }
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [unapproveEvent, COURSE, UNAPPROVE_SEEDS]);
    if (un.rowCount !== UNAPPROVE_SEEDS.length) throw new Error('seed unapprove');
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: seed 608 phrases fixed (+S0618L01B03), S0609L02 not new; Italian linked/rendered on Elsa/Benigno by the tool, English prompts on temporary Sonia`, metadata: { job: JOB, seeds: [608, 609, 618], rows: CHANGES.length + 1 } });
}

// ── Audio (the #579·I/#580·I route, unchanged) ───────────────────────────────────────────
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
  const ids = CHANGES.filter(c => c.targetChanged).map(c => `${COURSE}:${c.id}`);
  const { rows } = await pg.query(`SELECT id, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) ORDER BY id`, [COURSE, ids]);
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
  const { rows } = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) AND known_audio_id IS NULL ORDER BY id`, [COURSE, CHANGES.map(c => `${COURSE}:${c.id}`)]);
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
  console.log(`\n══ ${COURSE} — seed 608 phrases + S0609L02 not new — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  await guardLive(pg, log.problems, log);
  if (!log.problems.length) await guards(pg, log.problems, log);
  console.log('\nPLAN:');
  for (const c of CHANGES) console.log(`  ${c.id.padEnd(12)} "${c.before.known}" → "${c.before.target}"  ⇒  "${c.after.known}" → "${c.after.target}"${c.targetChanged ? '  [Italian moves]' : ''}`);
  console.log(`  ${NOT_NEW.lego_id} "${NOT_NEW.known}" → "${NOT_NEW.target}": is_new true ⇒ false; intro detached (${log.oldIntro?.id || 'none'}: "${log.oldIntro?.text || ''}")`);
  console.log(`  debut status from the live course: ${JSON.stringify(log.debut)}`);
  console.log(`  giusta first taught before 608: ${log.giustaFirstSeed === null ? 'NEVER → "right" leaves the English' : 'seed ' + log.giustaFirstSeed}`);
  console.log(`  più = most taught before 608 by: ${(log.mostTaughtBy || []).map(m => `${m.lego_id} "${m.known_text}|${m.target_text}"`).join(', ')}`);
  console.log(`  unapprove seeds ${UNAPPROVE_SEEDS.join(',')} (approved_at before: ${JSON.stringify(log.seedsApprovedBefore)})`);
  console.log(`  later phrases (seed > 609) using the old or new forms: ${JSON.stringify(log.laterUses || [])}; in 609 itself: ${log.later609}`);
  console.log(`  same defect, NOT fixed here, for Kai: ${JSON.stringify(log.awaitingKai || [])}`);
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
module.exports = { norm, containsChunk, containsWords, minusWords, sameLegoBothSides, rightWithoutGiusta, piuWithoutMost, rowContainsLego, debutStatus, CHANGES, LEGOS, NOT_NEW, SEED_608 };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
