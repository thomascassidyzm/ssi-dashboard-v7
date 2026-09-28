#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-future-in-past-2026-09-28.cjs
//
// ita_for_eng — "would" and the Italian conditional. Kai's ruling, 2026-09-28 (job #546·I):
//   after a PAST verb of saying / thinking / knowing / promising (ha detto che, pensavo che,
//   sapevo che, chiunque abbia detto che …), English "would + verb" is the conditional PERFECT
//   (sarebbe stato, avrebbe fatto). Standing alone, "would + verb" is the conditional SIMPLE
//   (sarebbe, farebbe). "would have + pp" is always the conditional perfect.
//
// CENSUS (dry run prints it, with coverage): every seed, LEGO and phrase in the course is
// classified by classifyRow() below — the same function the test exercises — and the counts
// per class are printed. The reading list that came out of it is what CHANGES holds.
//
// FIXES (phrases only; no seed or LEGO text changes; no new vocabulary; every frame word is
// checked live to have been introduced at or before the seed it is used in):
//   544  L02 "it would be difficult → sarebbe stato difficile" is right IN the seed (chiunque abbia
//        detto che …). B03, U01, U02, U04, U05 stood alone with the perfect → each now sits after
//        a past reporting frame the learner already has. B02, U03 unchanged (Kai's instruction).
//   535  L02 "he wouldn't choose → non avrebbe scelto" is the same shape (ha fatto una promessa
//        che …). Seven standalone/present-frame rows get a past frame; B01, B02, U04, L03B03 stay.
//   415  L01 "that wouldn't be a problem → non sarebbe un problema" is standalone SIMPLE (right).
//        B02 put it after "she said → ha detto che" — simple after a past frame. The frame moves
//        to the present ("I think → penso che") so the LEGO stays intact.
//   406  U04 "she told me it would be okay → mi ha detto che andrà bene": the Italian is the
//        future, like its siblings (B03/U02 "she said … will be okay"); English aligned to "will".
//   508  U05 "she asked how you would pay → ha chiesto come pagherai": same — English to "you'll".
// AMBIGUOUS rows are NOT edited; they are listed in the published doc (seeds 201 L02, 203, 348,
// 593 B02). No presentation / intro text is written: Kai is choosing that wording.
//
// AUDIO — Italian on the course's cast Azure voices (Elsa target1 / Benigno target2) through the
// guarded door, existing clips linked first. English goes through the temporary-Sonia fill
// (ita-sonia-temporary-fill-2026-09-28.cjs, SCOPE=ids). Nothing deleted.
//
//   node tools/course-optimization/ita-future-in-past-2026-09-28.cjs           # dry run + census
//   APPLY=1 node tools/course-optimization/ita-future-in-past-2026-09-28.cjs   # write + render Italian

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-future-in-past-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = 'Kai, 2026-09-28 (job #546·I): would+verb after a past reporting frame is the conditional perfect; standing alone it is the conditional simple';
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const AZURE_VOICE_IDS = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };

/** LEGO each changed phrase must still contain, both sides. */
const LEGOS = {
  S0544L02: { known: 'it would be difficult', target: 'sarebbe stato difficile' },
  S0535L02: { known: "he wouldn't choose", target: 'non avrebbe scelto' },
  S0535L03: { known: 'the wrong job', target: 'il lavoro sbagliato' },
  S0415L01: { known: "that wouldn't be a problem", target: 'non sarebbe un problema' },
  S0406L01: { known: 'it will be okay', target: 'andrà bene' },
  S0508L01: { known: "you'll pay", target: 'pagherai' },
};
/** Frames used, with the Italian words that must already be introduced at the seed they land in. */
const FRAMES = { 'pensavo che': 'I thought', 'ha detto che': 'he said / she said', 'sapevo che': 'I knew', 'hanno detto che': 'they said', 'penso che': 'I think' };

const CHANGES = [
  // seed 544
  { seed: 544, lego: 'S0544L02', id: 'S0544L02B03', frame: 'ha detto che', before: { known: 'it would be difficult to say', target: 'sarebbe stato difficile dire' }, after: { known: 'he said it would be difficult to say', target: 'ha detto che sarebbe stato difficile dire' } },
  { seed: 544, lego: 'S0544L02', id: 'S0544L02U01', frame: 'pensavo che', before: { known: 'it would be difficult to finish', target: 'sarebbe stato difficile finire' }, after: { known: 'I thought it would be difficult to finish', target: 'pensavo che sarebbe stato difficile finire' } },
  { seed: 544, lego: 'S0544L02', id: 'S0544L02U02', frame: 'sapevo che', before: { known: 'it would be difficult to stay here without the car', target: 'sarebbe stato difficile restare qui senza la macchina' }, after: { known: 'I knew it would be difficult to stay here without the car', target: 'sapevo che sarebbe stato difficile restare qui senza la macchina' } },
  { seed: 544, lego: 'S0544L02', id: 'S0544L02U04', frame: 'ha detto che', before: { known: 'but it would be difficult to breathe slowly', target: 'ma sarebbe stato difficile respirare lentamente' }, after: { known: 'but she said it would be difficult to breathe slowly', target: 'ma ha detto che sarebbe stato difficile respirare lentamente' } },
  { seed: 544, lego: 'S0544L02', id: 'S0544L02U05', frame: 'hanno detto che', before: { known: 'it would be difficult without a promise', target: 'sarebbe stato difficile senza una promessa' }, after: { known: 'they said it would be difficult without a promise', target: 'hanno detto che sarebbe stato difficile senza una promessa' } },
  // seed 535
  { seed: 535, lego: 'S0535L02', id: 'S0535L02B03', frame: 'ha detto che', before: { known: "he wouldn't choose to stay here", target: 'non avrebbe scelto di restare qui' }, after: { known: "he said he wouldn't choose to stay here", target: 'ha detto che non avrebbe scelto di restare qui' } },
  { seed: 535, lego: 'S0535L02', id: 'S0535L02U01', frame: 'pensavo che', before: { known: "he wouldn't choose to stay", target: 'non avrebbe scelto di restare' }, after: { known: "I thought he wouldn't choose to stay", target: 'pensavo che non avrebbe scelto di restare' } },
  { seed: 535, lego: 'S0535L02', id: 'S0535L02U02', frame: 'sapevo che', before: { known: "he wouldn't choose to go outside in this dreadful weather", target: 'non avrebbe scelto di uscire con questo tempo terribile' }, after: { known: "I knew he wouldn't choose to go outside in this dreadful weather", target: 'sapevo che non avrebbe scelto di uscire con questo tempo terribile' } },
  { seed: 535, lego: 'S0535L02', id: 'S0535L02U03', frame: 'ha detto che', before: { known: "he wouldn't choose to tell the truth", target: 'non avrebbe scelto di dire la verità' }, after: { known: "she said he wouldn't choose to tell the truth", target: 'ha detto che non avrebbe scelto di dire la verità' } },
  { seed: 535, lego: 'S0535L02', id: 'S0535L02U05', frame: 'pensavo che', before: { known: "I'm afraid he wouldn't choose to finish", target: 'temo che non avrebbe scelto di finire' }, after: { known: "I thought he wouldn't choose to finish", target: 'pensavo che non avrebbe scelto di finire' } },
  { seed: 535, lego: 'S0535L03', id: 'S0535L03B02', frame: 'ha detto che', before: { known: "he wouldn't choose the wrong job", target: 'non avrebbe scelto il lavoro sbagliato' }, after: { known: "he said he wouldn't choose the wrong job", target: 'ha detto che non avrebbe scelto il lavoro sbagliato' } },
  { seed: 535, lego: 'S0535L03', id: 'S0535L03U03', frame: 'sapevo che', before: { known: "it's true he wouldn't choose the wrong job", target: 'è vero che non avrebbe scelto il lavoro sbagliato' }, after: { known: "I knew he wouldn't choose the wrong job", target: 'sapevo che non avrebbe scelto il lavoro sbagliato' } },
  // seed 415 — simple after a past frame → frame goes present, LEGO intact
  { seed: 415, lego: 'S0415L01', id: 'S0415L01B02', frame: 'penso che', before: { known: "she said it wouldn't be a problem", target: 'ha detto che non sarebbe un problema' }, after: { known: "I think that wouldn't be a problem", target: 'penso che non sarebbe un problema' } },
  // 406 / 508 — English aligned to the Italian future its siblings already carry
  { seed: 406, lego: 'S0406L01', id: 'S0406L01U04', frame: null, before: { known: 'she told me it would be okay', target: 'mi ha detto che andrà bene' }, after: { known: 'she told me it will be okay', target: 'mi ha detto che andrà bene' } },
  { seed: 508, lego: 'S0508L01', id: 'S0508L01U05', frame: null, before: { known: 'she asked how you would pay', target: 'ha chiesto come pagherai' }, after: { known: "she asked how you'll pay", target: 'ha chiesto come pagherai' } },
];
const SEEDS = [...new Set(CHANGES.map(c => c.seed))].sort((a, b) => a - b);

// ── Census classifier (the rule, as code) ───────────────────────────────────────────────
const AUX = '(?:sarei|saresti|sarebbe|saremmo|sareste|sarebbero|avrei|avresti|avrebbe|avremmo|avreste|avrebbero)';
const PP = '(?:[a-zà-ù]+(?:at|ut|it)[oaie]|stat[oaie]|fatt[oaie]|dett[oaie]|vist[oaie]|mess[oaie]|pres[oaie]|scritt[oaie]|lett[oaie]|apert[oaie]|mort[oaie]|rimast[oaie]|chiest[oaie]|rispost[oaie]|decis[oaie]|scelt[oaie]|vint[oaie]|pers[oaie]|offert[oaie]|rott[oaie]|nat[oaie]|success[oaie]|piaciut[oaie]|spent[oaie]|chius[oaie]|tolt[oaie]|permess[oaie]|promess[oaie]|risolt[oaie]|riuscit[oaie]|scopert[oaie]|soffert[oaie]|vissut[oaie]|cott[oaie])';
const PERF = new RegExp(`\\b${AUX}\\s+(?:(?:mai|già|ancora|più|anche|proprio|davvero|sempre|forse|certamente|sicuramente|probabilmente|potuto|dovuto|voluto)\\s+)*${PP}\\b`, 'i');
const COND = /\b[a-zà-ù]+(?:rei|resti|rebbe|remmo|reste|rebbero)\b/i;
const IT_PAST_FRAME = /\b(?:dett[oa]|pensav[aoi]|pensavano|pensato|sapev[aoi]|sapevano|saputo|credev[aoi]|credevano|creduto|promess[oa]|sperav[aoi]|sperato|dicev[aoi]|immaginav[aoi]|ero sicur[oa]|era sicur[oa]|era chiaro|sembrava|capito|capiv[aoi]|temev[aoi]|chiest[oa]|deciso|spiegato|giurato|voleva sapere|volevo sapere|volevamo sapere|riuscivo a immaginar\w*)\b.*?\bche\b/i;
const EN_PAST_FRAME = /\b(?:said|thought|knew|believed|promised|hoped|told|was sure|were sure|was certain|seemed|realised|realized|understood|assumed|expected|feared|wondered|asked|explained|warned|swore|was convinced|imagined|couldn't imagine|figured|agreed|wrote|felt|heard|was told|were told|made a promise|used to think|wanted to know|wanted to see|didn't think|didn't know)\b/i;
const WOULD_HAVE = /\b(?:would|wouldn't|wouldn’t|'d|’d)\s+(?:(?:not|never|also|probably|really|just|only|always|still)\s+)*(?:have|'ve|’ve)\b/i;
const WOULD = /\b(?:would|wouldn't|wouldn’t)\b|\b\w+(?:'d|’d)\b/i;
const HAD = /\b\w+(?:'d|’d)\s+(?:(?:not|never|already|just|also)\s+)*(?:been|seen|done|gone|had|made|said|told|taken|given|known|left|thought|forgotten|heard|lost|found|come|written|read|met|felt|bought|brought|put|got|kept|paid|spent|sent|spoken|eaten|driven|fallen|shown|broken|chosen|begun|finished|started|arrived|decided|promised|tried|wanted|asked|learned|learnt|worked|played|lived|stopped|changed|called|moved|expected|hoped|managed|needed|talked|waited|visited|watched|planned|opened|closed|helped|remembered|realised|realized)\b/i;
const OTHER_MODAL = /\b(?:could|should|might|ought|'d like|’d like|would like)\b/i;
/**
 * Classify one row. Returns null when the row carries neither English would/'d nor an Italian
 * conditional (not matched). Classes beginning "A-" are correct under the ruling; B/C/D/E are
 * the reading list; F/G are conditionals with no English "would" (could/should/was going to…).
 */
function classifyRow(known, target) {
  const k = known || '', t = target || '';
  const enWould = WOULD.test(k) && !HAD.test(k);
  const enWH = WOULD_HAVE.test(k);
  const itPerf = PERF.test(t);
  const itCond = COND.test(t);
  if (!enWould && !itCond) return null;
  const itSimple = itCond && !itPerf;
  const frame = IT_PAST_FRAME.test(t) || EN_PAST_FRAME.test(k);
  const hyp = /\b(?:if|se)\b/i.test(k) || /\bse\b/i.test(t);
  if (enWH) return itPerf ? 'A-correct(would-have+perf)' : itSimple ? 'D-mismatch(would-have vs simple)' : 'D-mismatch(would-have, no Italian cond)';
  if (enWould) {
    if (itPerf) return frame ? 'A-correct(frame+perf)' : hyp ? 'A-correct(if+perf)' : 'B-perf-standalone';
    if (itSimple) return frame ? 'C-simple-after-frame' : 'A-correct(standalone simple)';
    return 'E-would-no-Italian-cond';
  }
  return OTHER_MODAL.test(k) ? 'F-other-modal' : 'G-Italian-cond-no-English-would';
}

// ── Rules ───────────────────────────────────────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/[.,!?;:"]+/g, ' ').replace(/’/g, "'").replace(/\s+/g, ' ').trim();
const contains = (hay, needle) => ` ${norm(hay)} `.includes(` ${norm(needle)} `);
const phraseContainsLego = (p, lego) => contains(p.target, lego.target) && contains(p.known, lego.known);
/** Vocabulary tokens: contractions ("wouldn't", "you'll") stay whole; elisions ("l'economia") split after the apostrophe. */
const words = (s) => norm(s).replace(/\b([a-z])'([a-zà-ù])/g, "$1' $2").split(/\s+/).filter(Boolean);

// ── Live ────────────────────────────────────────────────────────────────────────────────
async function census(pg) {
  const { rows } = await pg.query(
    `SELECT 'seed' AS kind, 'S'||lpad(seed_number::text,4,'0') AS id, seed_number, known_text, target_text FROM course_seeds WHERE course_code=$1
     UNION ALL SELECT 'lego', lego_id, seed_number, known_text, target_text FROM course_legos WHERE course_code=$1
     UNION ALL SELECT phrase_role, id, seed_number, known_text, target_text FROM course_practice_phrases WHERE course_code=$1`, [COURSE]);
  const counts = { scanned: rows.length, matched: 0 };
  const list = [];
  for (const r of rows) {
    const c = classifyRow(r.known_text, r.target_text);
    if (!c) continue;
    counts.matched++; counts[c] = (counts[c] || 0) + 1;
    list.push({ cls: c, kind: r.kind, id: r.id, seed: r.seed_number, known: r.known_text, target: r.target_text });
  }
  return { counts, list };
}
/** Every word of `text` must already occur at seed <= `seed` on that side (phrases, legos, seeds). */
async function newVocabulary(pg, seed, text, side) {
  const col = side === 'known' ? 'known_text' : 'target_text';
  const out = [];
  for (const w of new Set(words(text))) {
    const { rows } = await pg.query(
      `SELECT 1 FROM (SELECT seed_number, ${col} AS t FROM course_practice_phrases WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_legos WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_seeds WHERE course_code=$1) x
       WHERE seed_number <= $2 AND ' '||regexp_replace(lower(t), '[.,!?;:"]', ' ', 'g')||' ' LIKE '% '||$3||' %' LIMIT 1`, [COURSE, seed, w.replace(/'/g, "'")]);
    if (!rows.length) out.push(w);
  }
  return out;
}
async function frameIntroduced(pg, seed, frame) {
  const { rows } = await pg.query(`SELECT min(seed_number) AS first FROM (SELECT seed_number, target_text FROM course_practice_phrases WHERE course_code=$1 UNION ALL SELECT seed_number, target_text FROM course_legos WHERE course_code=$1) x WHERE ' '||lower(target_text)||' ' LIKE '% '||$2||' %'`, [COURSE, frame]);
  return { first: rows[0]?.first, ok: rows[0]?.first != null && rows[0].first <= seed };
}
async function guardLive(pg, startedAt) {
  const problems = [];
  for (const c of CHANGES) {
    const { rows: [r] } = await pg.query('SELECT known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND id=$2', [COURSE, `${COURSE}:${c.id}`]);
    if (!r || r.known_text !== c.before.known || r.target_text !== c.before.target) problems.push(`${c.id} reads "${r?.known_text}" → "${r?.target_text}" (expected "${c.before.known}" → "${c.before.target}")`);
  }
  for (const [id, l] of Object.entries(LEGOS)) {
    const { rows: [r] } = await pg.query('SELECT known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, id]);
    if (!r || r.known_text !== l.known || r.target_text !== l.target) problems.push(`${id} reads "${r?.known_text}" → "${r?.target_text}"`);
  }
  // Concurrent jobs (#543·I, #544·I run beside this one): any edit event on these seeds by another surface since we started means STOP.
  const { rows: foreign } = await pg.query(`SELECT surface, occurred_at, scope FROM content_edit_events WHERE course_code=$1 AND surface<>$2 AND occurred_at >= $3 AND scope->'seed_numbers' ?| $4::text[]`, [COURSE, SURFACE, startedAt, SEEDS.map(String)]);
  for (const f of foreign) problems.push(`another job (${f.surface}) edited seeds ${JSON.stringify(f.scope.seed_numbers)} at ${f.occurred_at}`);
  return problems;
}
async function zutAgainstCourse(pg) {
  const clashes = [];
  for (const c of CHANGES) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND id<>$4 AND phrase_role<>'component' AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))`,
      [COURSE, c.after.known, c.after.target, `${COURSE}:${c.id}`]);
    for (const r of rows) clashes.push(`${c.id} "${c.after.known}" → "${c.after.target}" vs ${r.id} "${r.known_text}" → "${r.target_text}"`);
  }
  return clashes;
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit',
    scope: { seed_numbers: SEEDS, phrase_ids: CHANGES.map(c => `${COURSE}:${c.id}`), rows: CHANGES.length },
    detail: { ruling: RULING, changes: CHANGES.map(c => ({ id: `${COURSE}:${c.id}`, known_from: c.before.known, target_from: c.before.target, known_to: c.after.known, target_to: c.after.target, frame: c.frame })) } });
  const seedEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: SEEDS, rows: SEEDS.length }, detail: { why: 'phrases under these seeds re-framed for the future-in-the-past rule; need Kai\'s read' } });
  log.events = { phraseEvent, seedEvent };
  await pg.query('BEGIN');
  try {
    for (const c of CHANGES) {
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, known_audio_id = CASE WHEN $1 = known_text THEN known_audio_id ELSE NULL END, target1_audio_id = CASE WHEN $2 = target_text THEN target1_audio_id ELSE NULL END, target2_audio_id = CASE WHEN $2 = target_text THEN target2_audio_id ELSE NULL END, word_count=$3, lego_count=$4, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$5, updated_at=now() WHERE course_code=$6 AND id=$7 AND known_text=$8 AND target_text=$9`,
        [c.after.known, c.after.target, c.after.target.length, c.after.target.split(/\s+/).length, phraseEvent, COURSE, `${COURSE}:${c.id}`, c.before.known, c.before.target]);
      if (u.rowCount !== 1) throw new Error(`${c.id}: ${u.rowCount} rows`);
    }
    const s = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [seedEvent, COURSE, SEEDS]);
    if (s.rowCount !== SEEDS.length) throw new Error(`seed unapprove: ${s.rowCount}`);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
}

// ── Audio (Italian) — same guarded door as ita-seed-343-fuller-cut ──────────────────────
async function fillAudio(pg, supabase, log) {
  process.env.PHASE8_NO_LISTEN = '1';
  const phase8 = require('../../services/phases/phase8-audio-v13.cjs');
  const ttsService = require('../../services/tts-service.cjs');
  const veracity = require('../../services/audio-veracity.cjs');
  const voiceConfigService = require('../../services/voice-config-service.cjs');
  const { writeOrSwapClip } = require('../../services/shared/audio-revision-swap.cjs');
  const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs');
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const { v4: uuidv4 } = require('uuid');
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });
  const logger = console;
  const ids = CHANGES.filter(c => c.after.target !== c.before.target).map(c => `${COURSE}:${c.id}`);
  const { rows } = await pg.query(`SELECT id, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) ORDER BY 1`, [COURSE, ids]);
  const slots = [];
  for (const r of rows) for (const role of ['target1', 'target2']) if (!r[`${role}_audio_id`]) slots.push({ id: r.id, role, text: r.target_text });
  const link = async (slot, audioId) => (await pg.query(`UPDATE course_practice_phrases SET ${slot.role}_audio_id=$1 WHERE course_code=$2 AND id=$3 AND target_text=$4 AND ${slot.role}_audio_id IS NULL`, [audioId, COURSE, slot.id, slot.text])).rowCount === 1;
  for (const slot of slots) {
    const entry = { ...slot }; log.audio.push(entry);
    const { rows: have } = await pg.query(`SELECT id, voice_id FROM course_audio WHERE language='ita' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND voice_id = ANY($2) ORDER BY (course_code=$3) DESC, (role=$4) DESC, created_at DESC LIMIT 1`, [slot.text, AZURE_VOICE_IDS[slot.role], COURSE, slot.role]);
    if (have[0]) { entry.result = `linked existing ${have[0].voice_id} clip ${have[0].id}`; entry.linked = await link(slot, have[0].id); continue; }
    const voice = slot.role === 'target1' ? ELSA : BENIGNO;
    try {
      const renderAndMaster = async () => {
        const out = await ttsService.generateWithRetry(slot.text, 'azure', { door: { courseCode: COURSE, intro: false, language: 'ita', voiceBound: true }, subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope', voiceName: voice.voiceName, speed: 1 });
        if (out.existingClip && !AZURE_VOICE_IDS[slot.role].includes(out.existingClip.voice_id)) throw new Error(`door offered ${out.existingClip.voice_id}; Azure only`);
        const { buffer, durationMs } = await phase8.masterAudio(out.audioBuffer, slot.text, await voiceConfigService.masteringOptsFor(voice.voiceName, 'azure'));
        return { buffer, durationMs, wordBoundaries: out.wordBoundaries };
      };
      const gated = await veracity.renderChecked({ render: renderAndMaster, expectedText: slot.text, language: 'ita', sampler: veracity.ALWAYS_SAMPLER, logger, meta: { courseCode: COURSE, role: slot.role, voiceId: voice.voiceName, phrase_id: slot.id, originalText: slot.text } });
      if (!gated.published) throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason})`);
      const newAudioId = uuidv4().toUpperCase(), newS3Key = `mastered/${newAudioId}.mp3`;
      await s3.send(new PutObjectCommand({ Bucket: phase8.S3_BUCKET, Key: newS3Key, Body: gated.buffer, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
      const verdictColumns = veracity.verdictColumns(gated.verdict, { checker: SWEEP, attempts: gated.attempts });
      const textNormalized = normalizeForAudio(slot.text);
      const base = { course_code: COURSE, text: slot.text, text_normalized: textNormalized, language: 'ita', role: slot.role, voice_id: voice.voiceId, origin: 'tts' };
      const out = await writeOrSwapClip({ supabase, identity: { course_code: COURSE, text_normalized: textNormalized, language: 'ita', role: slot.role, voice_id: voice.voiceId }, insertRow: { ...base, s3_key: newS3Key, duration_ms: gated.durationMs, word_boundaries: gated.wordBoundaries || null, ...verdictColumns }, swapPatch: { voice_id: voice.voiceId, origin: 'tts', word_boundaries: gated.wordBoundaries || null, text: slot.text, ...verdictColumns }, newS3Key, durationMs: gated.durationMs, source: SWEEP, acceptedBy: `${SWEEP} (${slot.role}, ${voice.voiceName})`, reason: RULING, logger });
      entry.result = `rendered ${voice.voiceName} clip ${out.audioId} (${gated.durationMs} ms)`;
      const { rows: [now] } = await pg.query(`SELECT ${slot.role}_audio_id AS id FROM course_practice_phrases WHERE course_code=$1 AND id=$2`, [COURSE, slot.id]);
      entry.linked = now?.id ? (now.id === out.audioId || await link(slot, out.audioId)) : await link(slot, out.audioId);
    } catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; }
  }
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const startedAt = '2026-09-28T16:30:00Z'; // this job's read of the edit log; anything on these seeds by another surface after it is a stop
  const log = { sweep: SWEEP, ruling: RULING, apply: APPLY, started: new Date().toISOString(), problems: [], census: null, frames: {}, vocab: {}, zut: [], audio: [] };
  console.log(`\n══ ${COURSE} future-in-the-past — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  log.census = await census(pg);
  console.log('CENSUS coverage: ' + Object.entries(log.census.counts).map(([k, v]) => `${k}=${v}`).join('  '));
  if (process.env.LIST) for (const r of log.census.list.filter(r => /^[BCDE]-/.test(r.cls))) console.log(`  ${r.cls.padEnd(34)} ${r.id.padEnd(26)} "${r.known}" → "${r.target}"`);
  const problems = await guardLive(pg, startedAt);
  for (const c of CHANGES) {
    const lego = LEGOS[c.lego];
    if (!phraseContainsLego(c.after, lego)) problems.push(`${c.id} does not contain ${c.lego} on both sides after the change`);
    if (c.frame) { const f = await frameIntroduced(pg, c.seed, c.frame); log.frames[`${c.id}:${c.frame}`] = f; if (!f.ok) problems.push(`${c.id}: frame "${c.frame}" first appears at seed ${f.first}, after seed ${c.seed}`); }
    const nvK = await newVocabulary(pg, c.seed, c.after.known, 'known'), nvT = await newVocabulary(pg, c.seed, c.after.target, 'target');
    if (nvK.length || nvT.length) { log.vocab[c.id] = { known: nvK, target: nvT }; problems.push(`${c.id} introduces new vocabulary: ${[...nvK, ...nvT].join(', ')}`); }
    const cls = classifyRow(c.after.known, c.after.target);
    if (cls !== null && !/^A-/.test(cls)) problems.push(`${c.id} after the change still classifies as ${cls}`);
  }
  log.zut = await zutAgainstCourse(pg); problems.push(...log.zut);
  log.problems = problems;
  console.log(problems.length ? 'PROBLEMS:\n  ' + problems.join('\n  ') : `rules hold for ${CHANGES.length} rows: LEGO contained both sides, every frame introduced earlier, no new vocabulary, each row classifies correct after the change, no ZUT clash`);
  for (const c of CHANGES) console.log(`  ${c.id}  "${c.before.known}" → "${c.before.target}"\n      ⇒ "${c.after.known}" → "${c.after.target}"`);
  if (APPLY && !problems.length) {
    await applyContent(pg, supabase, log); console.log(`APPLIED. events=${JSON.stringify(log.events)}; seeds ${SEEDS.join(', ')} unapproved; course_round_index refreshed`);
    await fillAudio(pg, supabase, log);
    console.log('AUDIO (Italian):'); for (const a of log.audio) console.log(`  ${a.id} ${a.role} "${a.text}": ${a.result}${a.linked ? ' → linked' : ''}`);
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end(); process.exit(problems.length ? 2 : 0);
}
module.exports = { CHANGES, LEGOS, SEEDS, FRAMES, classifyRow, phraseContainsLego, words, newVocabulary, contains };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
