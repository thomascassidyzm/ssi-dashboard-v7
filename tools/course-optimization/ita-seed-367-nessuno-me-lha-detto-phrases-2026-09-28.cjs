#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-seed-367-nessuno-me-lha-detto-phrases-2026-09-28.cjs
//
// ita_for_eng — seed 367 "no, nobody told me" → "no, nessuno me l'ha detto" (Kai, 2026-09-28 22:56Z, job #638·I).
//
// S0367L01 was grown by #622·I to "nobody told me | nessuno me l'ha detto". Its six USE phrases kept a forced
// "nessuno me l'ha detto che / di …" pattern — bad Italian: the l' already stands for "it", so "nessuno me l'ha detto
// che il gruppo era tranquillo" says it twice. Kai approved replacing them and warned that "me l'ha detto" is
// LIMITING: it means "told me IT", so "nobody told me anything" (= "nessuno mi ha detto niente") and anything with a
// stated object do NOT fit under this LEGO. The replacement rows keep "it" understood from context — an exclamation,
// a reason, an apology — and every word is taught by seed 367 on both sides (guarded live, the row itself excluded):
//   why has nobody told me? · it's true, but nobody told me · I'm sorry, nobody told me · I don't know why nobody
//   told me · nobody told me before today · unfortunately nobody told me · of course nobody told me · I wanted to
//   know why nobody told me.
// Three of Kai's own ideas are NOT used as written: "why did nobody tell me?" does not CONTAIN the LEGO on the known side
// (tell ≠ told; P17 is hard and L28 covers bound spellings, not inflections), so it is "why has nobody told me?"; "I didn't know, nobody told me" needs sapevo (first taught at seed 375) and
// "nobody ever told me" needs "ever" (never on the known side by 367). "nobody told me anything" is the one he ruled out.
//
// Rows: U01–U06 are RE-TEXTED IN PLACE (their slots stay; a phrase's progress is filed by slot), U07–U08 are new.
// B01–B03 stand: B01 the bare LEGO (the course's usual first build), B02 "nobody told me yesterday" (fine Italian),
// B03 the seed sentence. Components stand: the Italian tiles (nessuno + me + l'ha detto); the English glosses are
// literal (nobody + to me + said it), which #622·I already listed for Kai — not this job's call.
//
// STANDING RULE — later phrases: three rows after 367 use the same doubled pattern under OTHER LEGOs and are fixed here
// to the natural "nessuno mi ha detto che …" (mi ha detto: seed 128; che cosa: 107; ha visto: 147), each still
// containing its own LEGO: S0368L01U03 (tomatoes), S0369L02U06 (several horses — "about several horses" reworded to
// "she saw several horses", since "told me about X" is not "me l'ha detto di X"), S0372L02U04 (she was trying to).
// One EARLIER row is fixed too, on Kai's own form: S0130L01U05 "…because nobody told me | …perché nessuno mi ha
// detto" has no object in the Italian (incomplete); it becomes "…nobody told me anything | …nessuno mi ha detto niente"
// (niente/anything: seed 35). Its known side already said "nobody" at 130 (nessuno is "anyone" at 71) — pre-existing,
// listed, not this job's doing.
//
// AFTER THE WRITE: edited seeds unapproved (130, 368, 369; 367 and 372 already unapproved); Italian slots linked to
// an existing Elsa/Benigno clip or rendered through the one TTS door; English prompts filled by
// ita-sonia-temporary-fill SCOPE=ids (temporary Sonia, cast restored byte-identical; Charlotte re-voice list, canon A23);
// check-intro-mirror --strict; audit-phrase-zut strict must stay at 56.
//
//   node tools/course-optimization/ita-seed-367-nessuno-me-lha-detto-phrases-2026-09-28.cjs            # dry run
//   APPLY=1 node tools/course-optimization/ita-seed-367-nessuno-me-lha-detto-phrases-2026-09-28.cjs    # apply + Italian audio
//   AUDIO_ONLY=1 node … # re-run the Italian link-or-render for any slot still silent (idempotent)

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-seed-367-nessuno-me-lha-detto-phrases-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#638·I';
const RULING = 'Kai, 2026-09-28 22:56Z (job #638·I): replace the "nessuno me l\'ha detto che/di …" phrases under S0367L01 (l\' already says "it") with phrases where "it" is understood; "me l\'ha detto" is limiting — "nobody told me anything" is "nessuno mi ha detto niente" and does not fit the LEGO; later rows on the doubled pattern fixed to "nessuno mi ha detto che …"; edited seeds unapproved';
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
const rowContainsLego = (row, lego) => containsWords(row.known, lego.known) && containsWords(row.target, lego.target);
/** Kai's defect: the clitic l' ("it") followed by a clause or complement that states the same object again. */
const doublesTheObject = (target) => /\bme l'ha detto (che|di)\b/.test(norm(target));
/** Kai's limit: "me l'ha detto" only where the object is "it", understood — never with a stated object (niente, qualcosa…). */
const statesAnObjectBesideLo = (target) => /\bme l'ha detto\b/.test(norm(target)) && /\b(niente|nulla|qualcosa|tutto)\b/.test(norm(target));
const legoPosition = (known, legoKnown) => { const k = norm(known), l = norm(legoKnown); return k === l || k.startsWith(l + ' ') ? 'start' : k.endsWith(' ' + l) ? 'end' : 'middle'; };

const LEGOS = {
  S0367L01: { seed: 367, lego_index: 1, known: 'nobody told me', target: "nessuno me l'ha detto", components: [{ known: 'nobody', target: 'nessuno' }, { known: 'to me', target: 'me' }, { known: 'said it', target: "l'ha detto" }] },
  S0130L01: { seed: 130, lego_index: 1, known: 'it was a surprise because', target: 'è stata una sorpresa perché' },
  S0368L01: { seed: 368, lego_index: 1, known: 'tomatoes', target: 'pomodori' },
  S0369L02: { seed: 369, lego_index: 2, known: 'several horses', target: 'diversi cavalli' },
  S0372L02: { seed: 372, lego_index: 2, known: 'she was trying to', target: 'stava provando a' },
};
const SEED_367 = { known: 'no nobody told me', target: "no, nessuno me l'ha detto" };
/** Live seed-367 non-component rows as read 2026-09-28 23:05Z (after #622·I grew the LEGO) — the BEFORE state. */
const BEFORE_367 = [
  { id: 'S0367L01B01', role: 'build', known: 'nobody told me', target: "nessuno me l'ha detto" },
  { id: 'S0367L01B02', role: 'build', known: 'nobody told me yesterday', target: "nessuno me l'ha detto ieri" },
  { id: 'S0367L01B03', role: 'build', known: 'no nobody told me', target: "no, nessuno me l'ha detto" },
  { id: 'S0367L01U01', role: 'use', known: 'nobody told me what he wanted to grow', target: "nessuno me l'ha detto di cosa voleva coltivare" },
  { id: 'S0367L01U02', role: 'use', known: 'nobody told me what she said to him', target: "nessuno me l'ha detto di quello che lei gli ha detto" },
  { id: 'S0367L01U03', role: 'use', known: 'nobody told me that the group was quiet', target: "nessuno me l'ha detto che il gruppo era tranquillo" },
  { id: 'S0367L01U04', role: 'use', known: 'nobody told me that she felt like going out', target: "nessuno me l'ha detto che lei aveva voglia di uscire" },
  { id: 'S0367L01U05', role: 'use', known: "nobody told me he didn't like that place", target: "nessuno me l'ha detto che non gli piaceva quel posto" },
  { id: 'S0367L01U06', role: 'use', known: 'nobody told me what was happening', target: "nessuno me l'ha detto di quello che stava succedendo" },
];
/** In-place edits: id → after text. before is asserted live (and by the test) before any write. */
const EDITS = [
  { id: 'S0367L01U01', lego: 'S0367L01', known: 'why has nobody told me?', target: "perché nessuno me l'ha detto?" }, // Kai's "why did nobody tell me?" fails P17 on the known side (tell ≠ told)
  { id: 'S0367L01U02', lego: 'S0367L01', known: "it's true, but nobody told me", target: "è vero, ma nessuno me l'ha detto" },
  { id: 'S0367L01U03', lego: 'S0367L01', known: "I'm sorry, nobody told me", target: "mi dispiace, nessuno me l'ha detto" },
  { id: 'S0367L01U04', lego: 'S0367L01', known: "I don't know why nobody told me", target: "non so perché nessuno me l'ha detto" },
  { id: 'S0367L01U05', lego: 'S0367L01', known: 'nobody told me before today', target: "nessuno me l'ha detto prima di oggi" },
  { id: 'S0367L01U06', lego: 'S0367L01', known: 'unfortunately nobody told me', target: "purtroppo nessuno me l'ha detto" },
  // later rows on the doubled pattern, under their own LEGOs (standing knock-on rule)
  { id: 'S0368L01U03', lego: 'S0368L01', known: 'nobody told me he wanted to grow tomatoes', target: 'nessuno mi ha detto che voleva coltivare pomodori',
    before: { known: 'nobody told me he wanted to grow tomatoes', target: "nessuno me l'ha detto che voleva coltivare pomodori" } },
  { id: 'S0369L02U06', lego: 'S0369L02', known: 'nobody told me she saw several horses', target: 'nessuno mi ha detto che ha visto diversi cavalli',
    before: { known: 'nobody told me about several horses', target: "nessuno me l'ha detto di diversi cavalli" } },
  { id: 'S0372L02U04', lego: 'S0372L02', known: 'nobody told me what she was trying to do', target: 'nessuno mi ha detto che cosa stava provando a fare',
    before: { known: 'nobody told me what she was trying to do', target: "nessuno me l'ha detto di quello che stava provando a fare" } },
  // the earlier objectless row, on Kai's own form for "told me anything"
  { id: 'S0130L01U05', lego: 'S0130L01', known: 'it was a surprise because nobody told me anything', target: 'è stata una sorpresa perché nessuno mi ha detto niente',
    before: { known: 'it was a surprise because nobody told me', target: 'è stata una sorpresa perché nessuno mi ha detto' } },
];
for (const e of EDITS) if (!e.before) { const b = BEFORE_367.find(r => r.id === e.id); e.before = { known: b.known, target: b.target }; }
const NEW_ROWS = [
  { id: 'S0367L01U07', lego: 'S0367L01', known: 'of course nobody told me', target: "certo che nessuno me l'ha detto" },
  { id: 'S0367L01U08', lego: 'S0367L01', known: 'I wanted to know why nobody told me', target: "volevo sapere perché nessuno me l'ha detto" },
];
for (const r of [...EDITS, ...NEW_ROWS]) { const l = LEGOS[r.lego]; r.seed = l.seed; r.lego_index = l.lego_index; r.role = 'use'; r.lego_position = legoPosition(r.known, l.known); }
const AFTER_367 = [...BEFORE_367.map(r => { const e = EDITS.find(x => x.id === r.id); return e ? { ...r, known: e.known, target: e.target } : r; }), ...NEW_ROWS.map(r => ({ id: r.id, role: 'use', known: r.known, target: r.target }))];
const SEEDS = [...new Set([...EDITS, ...NEW_ROWS].map(r => r.seed))].sort((a, b) => a - b);
/** Known-side words a row ALREADY carried before this pass at its seed, with nothing earlier teaching them — pre-existing, listed, not introduced here. */
const PREEXISTING_KNOWN = { S0130L01U05: ['nobody'] };

// ── Live ────────────────────────────────────────────────────────────────────────────────
async function newVocabulary(pg, row, side) {
  const col = side === 'known' ? 'known_text' : 'target_text';
  const out = [];
  for (const w of new Set(words(row[side]))) {
    const { rows } = await pg.query(
      `SELECT 1 FROM (SELECT id, seed_number, ${col} AS t FROM course_practice_phrases WHERE course_code=$1 UNION ALL SELECT lego_id, seed_number, ${col} FROM course_legos WHERE course_code=$1 UNION ALL SELECT seed_id, seed_number, ${col} FROM course_seeds WHERE course_code=$1) x
       WHERE seed_number <= $2 AND id <> $4 AND ' '||regexp_replace(lower(replace(t,'’','''')), '[.,!?;:"]', ' ', 'g')||' ' LIKE '% '||$3||' %' LIMIT 1`, [COURSE, row.seed, w, `${COURSE}:${row.id}`]);
    if (!rows.length && !(side === 'known' && (PREEXISTING_KNOWN[row.id] || []).includes(w))) out.push(w);
  }
  return out;
}
async function guardLive(pg, problems, log) {
  const { rows: [s] } = await pg.query('SELECT known_text, target_text FROM course_seeds WHERE course_code=$1 AND seed_number=367', [COURSE]);
  if (!s || s.known_text !== SEED_367.known || s.target_text !== SEED_367.target) problems.push(`seed 367 reads "${s?.known_text}" → "${s?.target_text}"`);
  const { rows: legos } = await pg.query('SELECT lego_id, seed_number, lego_index, known_text, target_text, is_new, components FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)', [COURSE, Object.keys(LEGOS)]);
  for (const [id, l] of Object.entries(LEGOS)) {
    const r = legos.find(x => x.lego_id === id);
    if (!r || r.known_text !== l.known || r.target_text !== l.target || r.seed_number !== l.seed || r.lego_index !== l.lego_index) problems.push(`${id} reads "${r?.known_text}" → "${r?.target_text}" (seed ${r?.seed_number}/${r?.lego_index}) — expected "${l.known}" → "${l.target}"`);
    if (r && !r.is_new) problems.push(`${id} is not new — its basket is never played (P25)`);
    if (l.components && r && JSON.stringify(r.components) !== JSON.stringify(l.components)) problems.push(`${id} components are ${JSON.stringify(r.components)}`);
  }
  const { rows: live367 } = await pg.query(`SELECT split_part(id,':',2) id, phrase_role AS role, known_text AS known, target_text AS target FROM course_practice_phrases WHERE course_code=$1 AND seed_number=367 AND phrase_role<>'component' ORDER BY position`, [COURSE]);
  if (JSON.stringify(live367) !== JSON.stringify(BEFORE_367)) problems.push(`seed 367 rows differ from the BEFORE state: ${JSON.stringify(live367)}`);
  for (const e of EDITS) {
    const { rows: [r] } = await pg.query('SELECT known_text, target_text, seed_number, lego_index FROM course_practice_phrases WHERE course_code=$1 AND id=$2', [COURSE, `${COURSE}:${e.id}`]);
    if (!r || r.known_text !== e.before.known || r.target_text !== e.before.target) problems.push(`${e.id} reads "${r?.known_text}" → "${r?.target_text}" — expected "${e.before.known}" → "${e.before.target}"`);
    if (r && (r.seed_number !== e.seed || r.lego_index !== e.lego_index)) problems.push(`${e.id} sits at seed ${r.seed_number} lego ${r.lego_index}`);
  }
  const { rows: clash } = await pg.query('SELECT id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)', [COURSE, NEW_ROWS.map(r => `${COURSE}:${r.id}`)]);
  for (const c of clash) problems.push(`${c.id} already exists`);
  const { rows: [m] } = await pg.query('SELECT max(position) p FROM course_practice_phrases WHERE course_code=$1 AND seed_number=367 AND lego_index=1', [COURSE]);
  let p = m?.p ?? 0; for (const r of NEW_ROWS) r.position = ++p;
  const { rows: seeds } = await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) ORDER BY 1', [COURSE, SEEDS]);
  log.seedsApprovedBefore = Object.fromEntries(seeds.map(x => [x.seed_number, x.approved_at]));
  // Concurrency: another surface editing these seeds in the last hours (sibling #635·I adds seed sentences course-wide) — re-read before writing.
  const { rows: ev } = await pg.query(`SELECT id, surface, operation, scope->'seed_numbers' AS seeds, occurred_at FROM content_edit_events WHERE course_code=$1 AND occurred_at > now() - interval '3 hours' AND surface NOT LIKE '%' || $2 || '%' AND EXISTS (SELECT 1 FROM jsonb_array_elements(scope->'seed_numbers') e WHERE (e#>>'{}')::int = ANY($3)) ORDER BY occurred_at`, [COURSE, SWEEP, SEEDS]);
  // #635·I (ita-seed-sentences-in-played-baskets) ADDS seed-sentence rows course-wide (130 and 368 at 23:01Z); it edits none of
  // this pass's rows, and every row here is asserted by its before-text (seed 367 as a whole) just above, so its adds do not block.
  const KNOWN_FINISHED = ['ita-grow-subject-legos-2026-09-28', 'ita-sonia-temporary-fill-2026-09-28', 'ita-intro-mirror-fix-2026-09-28'];
  const NON_BLOCKING_ADDS = ['ita-seed-sentences-in-played-baskets-2026-09-28'];
  log.otherSurfaces = ev.map(e => `${e.occurred_at.toISOString()} ${e.surface} ${e.operation} ${JSON.stringify(e.seeds)}`);
  for (const e of ev) if (!KNOWN_FINISHED.some(f => e.surface.includes(f)) && !(e.operation === 'phrase-add' && NON_BLOCKING_ADDS.some(f => e.surface.includes(f)))) problems.push(`another surface touched ${JSON.stringify(e.seeds)} recently: ${e.surface} ${e.operation} (${e.id}) — re-read before writing`);
}
async function guards(pg, problems, log) {
  if (!BEFORE_367.some(r => doublesTheObject(r.target))) problems.push('seed 367 had no doubled-object row before this pass — why edit?');
  for (const r of AFTER_367) {
    if (r.role !== 'component' && !rowContainsLego(r, LEGOS.S0367L01)) problems.push(`${r.id} "${r.known}" → "${r.target}" does not contain S0367L01`);
    if (doublesTheObject(r.target)) problems.push(`${r.id} still doubles the object: "${r.target}"`);
    if (statesAnObjectBesideLo(r.target)) problems.push(`${r.id} states an object beside l': "${r.target}"`);
  }
  for (const r of [...EDITS, ...NEW_ROWS]) {
    if (!rowContainsLego(r, LEGOS[r.lego])) problems.push(`${r.id} does not contain ${r.lego}`);
    if (doublesTheObject(r.target)) problems.push(`${r.id} doubles the object`);
    const nk = await newVocabulary(pg, r, 'known'), nt = await newVocabulary(pg, r, 'target');
    if (nk.length || nt.length) problems.push(`${r.id} introduces vocabulary not taught by seed ${r.seed}: ${[...nk, ...nt].join(', ')}`);
  }
  // ZUT vs the course: a known must not already map to a different target (the reverse is listed).
  const ours = new Set([...EDITS, ...NEW_ROWS].map(r => r.id));
  log.zut = []; log.targetSide = [];
  for (const r of [...EDITS, ...NEW_ROWS]) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND (lower(trim(known_text))=lower(trim($2)) OR lower(trim(target_text))=lower(trim($3)))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND (lower(trim(known_text))=lower(trim($2)) OR lower(trim(target_text))=lower(trim($3)))`, [COURSE, r.known, r.target]);
    for (const x of rows) {
      const rid = x.id.replace(`${COURSE}:`, ''); if (ours.has(rid)) continue;
      const sameK = norm(x.known_text) === norm(r.known), sameT = norm(x.target_text) === norm(r.target);
      if (sameK && !sameT) log.zut.push(`${r.id} "${r.known}" → "${r.target}" vs ${rid} "${x.known_text}" → "${x.target_text}"`);
      else if (sameT && !sameK) log.targetSide.push(`${r.id} "${r.known}" shares its Italian with ${rid} "${x.known_text}"`);
    }
    for (const o of [...EDITS, ...NEW_ROWS]) if (o !== r && norm(o.known) === norm(r.known) && norm(o.target) !== norm(r.target)) log.zut.push(`${r.id} vs ${o.id}: same English, different Italian`);
  }
  problems.push(...new Set(log.zut));
  // Standing rule — every row in the course still on the doubled pattern, or saying "nobody told me" with an objectless Italian, after this pass.
  const { rows: later } = await pg.query(`SELECT split_part(id,':',2) id, seed_number, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND (lower(target_text) ~ 'me l''ha detto (che|di)\\M' OR lower(target_text) ~ 'nessuno mi ha detto$' OR lower(known_text) ~ 'nobody (told|tell)') ORDER BY seed_number, id`, [COURSE]);
  log.courseWideNobodyTold = later;
  log.remainingDefects = later.filter(r => !ours.has(r.id) && (doublesTheObject(r.target_text) || /nessuno mi ha detto$/.test(norm(r.target_text)))).map(r => `${r.id} "${r.known_text}" → "${r.target_text}"`);
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const editEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: SEEDS, phrase_ids: EDITS.map(r => `${COURSE}:${r.id}`), rows: EDITS.length },
    detail: { ruling: RULING, job: JOB, rows: EDITS.map(r => ({ id: `${COURSE}:${r.id}`, seed: r.seed, lego: r.lego, before: r.before, after: { known: r.known, target: r.target } })) } });
  const addEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-add', scope: { seed_numbers: [367], phrase_ids: NEW_ROWS.map(r => `${COURSE}:${r.id}`), rows: NEW_ROWS.length },
    detail: { ruling: RULING, job: JOB, rows: NEW_ROWS.map(r => ({ id: `${COURSE}:${r.id}`, seed: r.seed, lego: r.lego, position: r.position, known: r.known, target: r.target })) } });
  const toUnapprove = SEEDS.filter(s => log.seedsApprovedBefore[s]);
  const unapproveEvent = toUnapprove.length ? await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: toUnapprove, rows: toUnapprove.length }, detail: { why: 'practice phrases edited under Kai\'s ruling of 2026-09-28 22:56Z; edited phrases arrive unchecked', job: JOB, approved_at_before: log.seedsApprovedBefore } }) : null;
  log.events = { editEvent, addEvent, unapproveEvent, unapproved: toUnapprove };
  await pg.query('BEGIN');
  try {
    for (const e of EDITS) {
      const knownMoved = e.before.known !== e.known, targetMoved = e.before.target !== e.target;
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4, lego_position=$5, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL,
          known_audio_id = CASE WHEN $10 THEN NULL ELSE known_audio_id END, target1_audio_id = CASE WHEN $11 THEN NULL ELSE target1_audio_id END, target2_audio_id = CASE WHEN $11 THEN NULL ELSE target2_audio_id END,
          target1_duration_ms = CASE WHEN $11 THEN NULL ELSE target1_duration_ms END, target2_duration_ms = CASE WHEN $11 THEN NULL ELSE target2_duration_ms END,
          last_edit_event_id=$6, updated_at=now() WHERE course_code=$7 AND id=$8 AND known_text=$9 AND target_text=$12`,
        [e.known, e.target, e.target.length, e.target.split(/\s+/).length, e.lego_position, editEvent, COURSE, `${COURSE}:${e.id}`, e.before.known, knownMoved, targetMoved, e.before.target]);
      if (u.rowCount !== 1) throw new Error(`${e.id}: update ${u.rowCount}`);
    }
    for (const r of NEW_ROWS) {
      const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, last_edit_event_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft','use','{}',$11,$12,true,$13)`,
        [`${COURSE}:${r.id}`, COURSE, r.seed, r.lego_index, r.position, r.known, r.target, r.target.length, r.target.split(/\s+/).length, JSON.stringify({ format: 'build_use', source: SWEEP, job: JOB }), r.lego_position, r.lego, addEvent]);
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
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: seed 367 "nessuno me l'ha detto" phrases replaced (${EDITS.length} edited, ${NEW_ROWS.length} added); Italian linked/rendered on Elsa/Benigno by the tool, English prompts on temporary Sonia`, metadata: { job: JOB, seeds: SEEDS, rows: EDITS.length + NEW_ROWS.length } });
}

// ── Audio (the #579·I/#580·I/#590·I/#621·I route, unchanged) ─────────────────────────────
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
const ALL_IDS = () => [...EDITS, ...NEW_ROWS].map(r => `${COURSE}:${r.id}`);
async function fillItalian(pg, supabase, log) {
  const { rows } = await pg.query(`SELECT id, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) ORDER BY seed_number, position`, [COURSE, ALL_IDS()]);
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
      if (u.rowCount !== 1 && now?.id === audioId) entry.result += ' — linked by the audio_autolink trigger';
      entry.linked = now?.id || null; entry.linkedVoice = now?.voice_id || null;
      if (!now?.id || !AZURE_VOICE_IDS[role].includes(now.voice_id)) entry.result += ` — SLOT NOT ON CAST VOICE (${now?.voice_id})`;
    } catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; }
  }
}
async function silentEnglish(pg) {
  const { rows } = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) AND known_audio_id IS NULL ORDER BY seed_number, position`, [COURSE, ALL_IDS()]);
  return rows.map(r => r.id);
}

async function main() {
  const APPLY = process.env.APPLY === '1', AUDIO_ONLY = process.env.AUDIO_ONLY === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, ruling: RULING, job: JOB, apply: APPLY, started: new Date().toISOString(), problems: [], audio: [] };
  console.log(`\n══ ${COURSE} — seed 367 "nessuno me l'ha detto" phrases — ${AUDIO_ONLY ? 'AUDIO ONLY' : APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  if (AUDIO_ONLY) {
    await fillItalian(pg, supabase, log);
    for (const a of log.audio) console.log(`  ${a.id} ${a.role} "${a.text}": ${a.result}`);
    const silent = await silentEnglish(pg);
    console.log(`ENGLISH still silent (${silent.length}): ${silent.length ? 'SCOPE=ids IDS=' + silent.join(',') + ' APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs' : 'none'}`);
    await pg.end(); return;
  }
  await guardLive(pg, log.problems, log);
  if (!log.problems.length) await guards(pg, log.problems, log);
  console.log('\nPLAN:');
  for (const e of EDITS) console.log(`  EDIT ${e.id.padEnd(12)} seed ${String(e.seed).padStart(3)} [${e.lego}] "${e.before.known}" → "${e.before.target}"\n       ${''.padEnd(12)}          ⇒ "${e.known}" → "${e.target}"`);
  for (const r of NEW_ROWS) console.log(`  ADD  ${r.id.padEnd(12)} seed ${String(r.seed).padStart(3)} pos ${r.position ?? '?'} [${r.lego}] "${r.known}" → "${r.target}"`);
  console.log(`  seeds ${SEEDS.join(',')} — approved_at before: ${JSON.stringify(log.seedsApprovedBefore)}; to unapprove: ${SEEDS.filter(s => log.seedsApprovedBefore?.[s]).join(',') || 'none'}`);
  if (log.otherSurfaces?.length) console.log(`  other surfaces on these seeds (3h): ${log.otherSurfaces.join(' ; ')}`);
  console.log(`  course-wide "nobody told" rows after this pass: ${JSON.stringify(log.courseWideNobodyTold || [])}`);
  console.log(`  remaining doubled/objectless rows NOT in this pass: ${JSON.stringify(log.remainingDefects || [])}`);
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
module.exports = { norm, containsWords, rowContainsLego, doublesTheObject, statesAnObjectBesideLo, legoPosition, LEGOS, SEED_367, BEFORE_367, AFTER_367, EDITS, NEW_ROWS, SEEDS, PREEXISTING_KNOWN };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
