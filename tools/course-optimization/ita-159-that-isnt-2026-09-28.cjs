#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-159-that-isnt-2026-09-28.cjs
//
// ita_for_eng — KAI'S APPROVAL (2026-09-28, job #673·I, on #648·I's recommendation, d/a77fd754):
// seed 159 "that isn't what I'm trying to say | non è quello che sto provando a dire".
//
//   S0159L01  isn't | non è   →   that isn't | non è          (the S0282L01 "that's not | non è" shape)
//
// WHY. K26 says the known side carries the person the target verb marks; a bare "isn't" over "non è"
// says nobody. K28's sweep (#573·I) held this LEGO rather than adding a pronoun, because its own row
// B03 "that isn't | quello non è" would have made "that isn't" a one-known-two-targets clash (K2).
// Kai's resolution: the LEGO takes the seed's own demonstrative subject "that" (L26: it is the seed's
// word), the Italian stays "non è" (Italian drops the subject, exactly as S0282L01 already teaches),
// and B03 — a phrase with a stray "quello", never a LEGO — is deleted. "it isn't" was ruled out
// because "it isn't what I'm trying to say" is not natural English (#648·I).
//
// COMPONENTS (K26/K29): one component, "that isn't | non è" — the S0086L01 "it wasn't | non era"
// shape. Splitting "non" from "è" would leave a personless "is | è" (K26) or a contraction that
// tiles neither side; and K29 is already met without a split: "not | non" stands alone as a component
// at S0080L01 and "it's | è" at S0028L01, both before 159, so bare non / è later are licensed.
//
// NOT A DUPLICATE: S0282L01 "that's not | non è" — a duplicate needs BOTH sides to match (Kai,
// 2026-09-23); the English differs, so both stay new and both baskets stay played (P25).
//
// PHRASES: B01/B02 are the LEGO itself and follow it; every other row under S0159L01 already reads
// "that isn't …" over "non è …" and is kept (P17 both sides). B03 goes. ZUT strict is the same
// before and after — "that isn't" is only ever "non è …" once B03 is gone; the count is printed.
//
// INTRO (O13): human-authored, in Kai's template, marked BEFORE the clip is written (the guard
// trigger enforces that order), rendered on the temporary Sonia route and linked at all three
// places the learner path reads; the old clip is detached and kept.
//
// AUDIO: the English "that isn't" prompt already exists in this course as a Sonia clip (B03's own
// known clip) — it is re-linked to the LEGO and B01/B02, never re-rendered; the Italian "non è"
// clips are unchanged. Only the intro line is rendered. Seed 159 is unapproved.
//
//   node tools/course-optimization/ita-159-that-isnt-2026-09-28.cjs            # plan (dry run, no writes)
//   APPLY=1 node tools/course-optimization/ita-159-that-isnt-2026-09-28.cjs    # write + intro
//   Do NOT touch seed 151 — job #667·I owns it.

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const JOB = '#673·I';
const SWEEP = 'ita-159-that-isnt-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = "Kai, 2026-09-28 (job #673·I, approving #648·I): S0159L01 'isn't | non è' → 'that isn't | non è' on the S0282L01 shape; the phrase 'that isn't | quello non è' under it is deleted (a phrase, never a LEGO); every remaining phrase contains the LEGO on both sides";
const AUTHOR = 'Kai (template, 2026-09-28) — line written by job #673·I';
const SONIA = { voiceId: 'azure_en-GB-SoniaNeural', castVoiceId: 'en-GB-SoniaNeural', voiceName: 'en-GB-SoniaNeural' };
const SONIA_IDS = ['azure_en-GB-SoniaNeural', 'en-GB-SoniaNeural'];
const TEMP_ROW = { slot: 'known', language: 'eng', gender: 'f', rank: 1, voice_id: SONIA.castVoiceId };

// ── Rules (same as the 152 grow tool; re-stated so this file reads alone) ─────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»“”]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
const squash = (s) => norm(s).replace(/\s+/g, '');
function containsWords(hay, needle) {
  const h = words(hay);
  for (const w of words(needle)) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); }
  return true;
}
const sameWords = (a, b) => containsWords(a, b) && words(a).length === words(b).length;
const phraseContainsLego = (p, l) => containsWords(p.known, l.known) && containsWords(p.target, l.target);
const componentsTileTarget = (l) => squash(l.components.map((c) => c.target).join(' ')) === squash(l.target);
const componentsTileKnown = (l) => sameWords(l.components.map((c) => c.known).join(' '), l.known);
const isDuplicate = (a, b) => sameWords(a.known, b.known) && sameWords(a.target, b.target);

// ── The LEGO ──────────────────────────────────────────────────────────────────────────────
const SEED = 159;
const SENTENCE = { known: "that isn't what I'm trying to say", target: 'non è quello che sto provando a dire' };
const LEGO = {
  id: 'S0159L01', seed: SEED,
  from: { known: "isn't", target: 'non è', components: null },
  to: { known: "that isn't", target: 'non è', components: [{ known: "that isn't", target: 'non è' }] },
};
/** The precedent this follows, and the LEGO it must not duplicate. */
const PRECEDENT = { id: 'S0282L01', known: "that's not", target: 'non è' };
/** The K29 witnesses: the pieces of "non è" already stand alone as components before seed 159. */
const K29_WITNESSES = [{ id: 'S0080L01', target: 'non' }, { id: 'S0028L01', target: 'è' }];

const P = (id, bk, bt, ak, at, why) => ({ id, seed: SEED, before: { known: bk, target: bt }, after: { known: ak, target: at }, why });
/** The rows that change under S0159L01 (the LEGO's own build rows follow it). */
const PHRASES = [
  P('S0159L01B01', "isn't", 'non è', "that isn't", 'non è', 'lego: B01 is the LEGO itself'),
  P('S0159L01B02', "isn't", 'non è', "that isn't", 'non è', 'lego: the repeated build'),
];
/** The one row that goes: the bare LEGO with a stray quello — a phrase, never a LEGO. */
const DELETE = { id: 'S0159L01B03', known: "that isn't", target: 'quello non è', why: "K2: the only row in the course mapping 'that isn't' to anything but 'non è …'; a phrase, so it may go (Kai, 2026-09-23)" };

/** The intro, in Kai's template; the example is the seed sentence, which contains the chunk. */
const INTRO = { legoId: LEGO.id, text: `The Italian for '${LEGO.to.known}' in phrases like '${SENTENCE.known}' is:`, example: SENTENCE.known };

const short = (id) => String(id).replace(/^ita_for_eng:/, '');

function plan(rows) {
  const byId = {}; for (const r of rows) byId[r.id] = r;
  const problems = [];
  const live = byId[LEGO.id];
  if (!live) problems.push(`${LEGO.id}: not live`);
  else {
    if (live.known !== LEGO.from.known || live.target !== LEGO.from.target) problems.push(`${LEGO.id}: live reads "${live.known}" | "${live.target}", expected "${LEGO.from.known}" | "${LEGO.from.target}"`);
    if (live.is_new !== true) problems.push(`${LEGO.id}: is_new is ${live.is_new} — this job keeps it true`);
  }
  if (!containsWords(LEGO.to.known, LEGO.from.known) || squash(LEGO.to.target) !== squash(LEGO.from.target)) problems.push(`${LEGO.id}: the new LEGO does not keep the old one (English grows, Italian unchanged)`);
  if (!containsWords(SENTENCE.known, LEGO.to.known) || !containsWords(SENTENCE.target, LEGO.to.target)) problems.push(`${LEGO.id}: the new LEGO is not a piece of its own seed (L26)`);
  if (!componentsTileTarget(LEGO.to) || !componentsTileKnown(LEGO.to)) problems.push(`${LEGO.id}: components do not tile both sides`);
  const seedRow = rows.find((r) => r.kind === 'seed' && r.sn === SEED);
  if (seedRow && (seedRow.known !== SENTENCE.known || seedRow.target !== SENTENCE.target)) problems.push(`seed ${SEED} sentence reads "${seedRow.known}" | "${seedRow.target}" — not what this job was written against`);
  // Not a duplicate of the precedent: duplicate = both sides match.
  const pre = byId[PRECEDENT.id];
  const precedent = { id: PRECEDENT.id, live: pre ? { known: pre.known, target: pre.target, is_new: pre.is_new } : null, duplicate: pre ? isDuplicate(pre, LEGO.to) : null };
  if (pre && precedent.duplicate) problems.push(`${PRECEDENT.id} IS a both-sides duplicate of the new LEGO — stop`);
  if (pre && (pre.known !== PRECEDENT.known || pre.target !== PRECEDENT.target)) problems.push(`${PRECEDENT.id} reads "${pre.known}" | "${pre.target}" — the precedent moved`);
  // K29 witnesses: each piece of the Italian stands alone as a component before seed 159.
  const k29 = K29_WITNESSES.map((w) => { const l = byId[w.id]; const ok = !!l && l.sn < SEED && Array.isArray(l.components) && l.components.some((c) => squash(c.target) === squash(w.target)); if (!ok) problems.push(`K29: "${w.target}" is not a standalone component of ${w.id} before seed ${SEED}`); return { ...w, ok }; });
  for (const c of PHRASES) {
    const l = byId[c.id];
    if (!l) { problems.push(`${c.id}: not live`); continue; }
    if (l.known !== c.before.known || l.target !== c.before.target) problems.push(`${c.id}: live reads "${l.known}" | "${l.target}", expected "${c.before.known}" | "${c.before.target}"`);
    if (l.kind === 'component') problems.push(`${c.id}: is a component row`);
    if (!phraseContainsLego(c.after, LEGO.to)) problems.push(`${c.id}: after does not contain the new LEGO`);
  }
  const d = byId[DELETE.id];
  if (!d) problems.push(`${DELETE.id}: not live`);
  else if (d.known !== DELETE.known || d.target !== DELETE.target) problems.push(`${DELETE.id}: live reads "${d.known}" | "${d.target}", expected "${DELETE.known}" | "${DELETE.target}"`);
  else if (d.kind !== 'build' && d.kind !== 'use') problems.push(`${DELETE.id}: is a ${d.kind} row, not a phrase`);
  const after = rows.filter((r) => r.id !== DELETE.id).map((r) => { if (r.id === LEGO.id) return { ...r, known: LEGO.to.known, target: LEGO.to.target }; const c = PHRASES.find((x) => x.id === r.id); return c ? { ...r, known: c.after.known, target: c.after.target } : r; });
  const under = after.filter((r) => r.id.startsWith(LEGO.id) && r.id !== LEGO.id && (r.kind === 'build' || r.kind === 'use'));
  const kept = [];
  for (const p of under) {
    if (!phraseContainsLego(p, LEGO.to)) problems.push(`${p.id}: "${p.known}" | "${p.target}" does not contain the new LEGO`);
    if (!PHRASES.some((x) => x.id === p.id)) kept.push(p);
  }
  // Intro rules: quotes the LEGO, example contains it, no brackets, no grammar terms.
  if (!INTRO.text.includes(`'${LEGO.to.known}'`)) problems.push('intro does not quote the LEGO (mirror)');
  if (!containsWords(INTRO.example, LEGO.to.known)) problems.push('intro example does not contain the LEGO');
  if (/[()[\]]/.test(INTRO.text) || /\b(tense|clause|verb|pronoun|subject)\b/i.test(INTRO.text)) problems.push('intro carries brackets or a grammar term');
  // The K2 clash this resolves, seen in the data: BEFORE, "that isn't" maps to two Italians; AFTER, to one.
  const targetsFor = (set, known) => new Set(set.filter((r) => (r.kind === 'build' || r.kind === 'use' || r.kind === 'lego') && norm(r.known) === norm(known)).map((r) => norm(r.target)));
  // "before" is the live data (B03 alone); "wouldBe" is what re-glossing the LEGO WITHOUT deleting B03 would create — the K2 hold.
  const k2 = { before: [...targetsFor(rows, LEGO.to.known)], wouldBe: [...new Set([...targetsFor(rows, LEGO.to.known), norm(LEGO.to.target)])], after: [...targetsFor(after, LEGO.to.known)] };
  if (k2.after.length > 1) problems.push(`"${LEGO.to.known}" still maps to ${k2.after.join(' / ')} after the plan`);
  const isntLeft = after.filter((r) => (r.kind === 'build' || r.kind === 'use' || r.kind === 'lego') && norm(r.known) === norm(LEGO.from.known)).map((r) => r.id);
  return { problems, kept, precedent, k29, k2, isntLeft, lego: LEGO, phrases: PHRASES, del: DELETE, intro: INTRO, seeds: [SEED] };
}

async function loadRows(pg) {
  const { rows } = await pg.query(
    `SELECT 'lego' AS kind, seed_number AS sn, lego_id AS id, known_text AS known, target_text AS target, components, is_new FROM course_legos WHERE course_code=$1
     UNION ALL SELECT phrase_role, seed_number, id, known_text, target_text, NULL, NULL FROM course_practice_phrases WHERE course_code=$1
     UNION ALL SELECT 'seed', seed_number, seed_id, known_text, target_text, NULL, NULL FROM course_seeds WHERE course_code=$1 ORDER BY 2, 3`, [COURSE]);
  return rows.map((r) => ({ ...r, sn: Number(r.sn), id: short(r.id) }));
}
/** Strict ZUT count from the course audit tool, so before/after is the same number Kai reads elsewhere. */
function zutStrict() {
  const { spawnSync } = require('child_process');
  const r = spawnSync(process.execPath, [path.join(__dirname, 'audit-phrase-zut.cjs'), COURSE], { encoding: 'utf8', timeout: 10 * 60 * 1000 });
  const m = /bidirectional[\s\S]*?strict:\s*(\d+)/.exec(r.stdout || '');
  return m ? Number(m[1]) : null;
}

async function applyContent(pg, supabase, D, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: op, scope, detail });
  const legoEvent = await ev('lego-edit', { seed_numbers: [SEED], lego_ids: [LEGO.id], rows: 1 }, { ruling: RULING, job: JOB, changes: [{ id: LEGO.id, from: LEGO.from, to: LEGO.to }] });
  const phraseEvent = await ev('phrase-edit', { seed_numbers: [SEED], phrase_ids: D.phrases.map((c) => `${COURSE}:${c.id}`), rows: D.phrases.length }, { ruling: RULING, job: JOB, changes: D.phrases.map((c) => ({ id: `${COURSE}:${c.id}`, from: c.before, to: c.after, why: c.why })) });
  const deleteEvent = await ev('phrase-delete', { seed_numbers: [SEED], phrase_ids: [`${COURSE}:${D.del.id}`], rows: 1 }, { ruling: RULING, job: JOB, deleted: [{ id: `${COURSE}:${D.del.id}`, known: D.del.known, target: D.del.target, why: D.del.why }] });
  const unapproveEvent = await ev('unapprove', { seed_numbers: D.seeds, rows: D.seeds.length }, { why: "S0159L01 re-glossed to 'that isn't' under Kai's approval; the seed needs his read", job: JOB });
  log.events = { legoEvent, phraseEvent, deleteEvent, unapproveEvent };
  // The English "that isn't" prompt clip already in this course (B03's known clip; Sonia, so already on the A23 re-voice list).
  const { rows: clip } = await pg.query(`SELECT id, voice_id FROM course_audio WHERE course_code=$1 AND language='eng' AND role='known' AND text_normalized=normalize_text($2) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' ORDER BY (voice_id = ANY($3)) DESC, created_at DESC LIMIT 1`, [COURSE, LEGO.to.known, SONIA_IDS]);
  if (!clip[0]) throw new Error(`no rendered English clip for "${LEGO.to.known}" in ${COURSE} — expected B03's own`);
  log.knownClip = clip[0];
  const { rows: [oldLego] } = await pg.query('SELECT known_audio_id, presentation_audio_id FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, LEGO.id]);
  log.oldLegoLinks = oldLego;
  await pg.query('BEGIN');
  try {
    // Writer-set links in the SAME update as the text: the text-change trigger respects them (known → the existing clip; presentation → cleared, re-linked by the intro step).
    const u = await pg.query(`UPDATE course_legos SET known_text=$1, components=$2, known_audio_id=$3, presentation_audio_id=NULL, last_edit_event_id=$4, updated_at=now() WHERE course_code=$5 AND lego_id=$6 AND known_text=$7 AND target_text=$8 AND is_new=true`,
      [LEGO.to.known, JSON.stringify(LEGO.to.components), clip[0].id, legoEvent, COURSE, LEGO.id, LEGO.from.known, LEGO.from.target]);
    if (u.rowCount !== 1) throw new Error(`${LEGO.id}: ${u.rowCount} rows`);
    if (oldLego.presentation_audio_id) {
      await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, new_audio_id, old_text, new_text, reason) VALUES ('course_legos',$1,$2,$3,'presentation_audio_id','presentation',$4,NULL,(SELECT text FROM course_audio WHERE id=$4),$5,$6)`,
        [LEGO.id, COURSE, SEED, oldLego.presentation_audio_id, INTRO.text, `${SWEEP}: LEGO re-glossed; intro re-authored (job ${JOB}, event ${legoEvent}); old clip kept`]);
      await pg.query('UPDATE course_audio SET lego_id=NULL WHERE id=$1 AND lego_id=$2', [oldLego.presentation_audio_id, LEGO.id]);
      await pg.query('UPDATE lego_introductions SET presentation_audio_id=NULL, audio_uuid=NULL, updated_at=now() WHERE course_code=$1 AND lego_id=$2', [COURSE, LEGO.id]);
    }
    for (const c of D.phrases) {
      const r = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, known_audio_id=$2, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$3, updated_at=now() WHERE course_code=$4 AND id=$5 AND known_text=$6 AND target_text=$7`,
        [c.after.known, clip[0].id, phraseEvent, COURSE, `${COURSE}:${c.id}`, c.before.known, c.before.target]);
      if (r.rowCount !== 1) throw new Error(`${c.id}: ${r.rowCount} rows`);
    }
    const del = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, `${COURSE}:${D.del.id}`, D.del.known, D.del.target]);
    if (del.rowCount !== 1) throw new Error(`${D.del.id}: ${del.rowCount} rows deleted`);
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [unapproveEvent, COURSE, D.seeds]);
    log.unapproved = { seeds: D.seeds, rows: un.rowCount };
    const { rows: [still] } = await pg.query('SELECT is_new, known_audio_id, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, LEGO.id]);
    if (!still.is_new) throw new Error('is_new is no longer true');
    if (still.known_audio_id !== clip[0].id) throw new Error(`known slot holds ${still.known_audio_id}, not the "${LEGO.to.known}" clip`);
    if (!still.target1_audio_id || !still.target2_audio_id) throw new Error('an Italian slot went silent — the Italian did not change');
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
}

async function renderSonia(pg, supabase, text, legoId) {
  process.env.PHASE8_NO_LISTEN = '1';
  const phase8 = require('../../services/phases/phase8-audio-v13.cjs');
  const ttsService = require('../../services/tts-service.cjs');
  const veracity = require('../../services/audio-veracity.cjs');
  const voiceConfigService = require('../../services/voice-config-service.cjs');
  const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs');
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const { v4: uuidv4 } = require('uuid');
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });
  const textNormalized = normalizeForAudio(text);
  const { rows: have } = await pg.query(`SELECT id, s3_key, duration_ms, word_boundaries FROM course_audio WHERE language='eng' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($2) ORDER BY (course_code=$3) DESC, created_at DESC LIMIT 1`, [text, SONIA_IDS, COURSE]);
  let s3Key, durationMs, wordBoundaries, verdictColumns = {}, how;
  if (have[0]) { ({ s3_key: s3Key, duration_ms: durationMs, word_boundaries: wordBoundaries } = have[0]); how = `reused bytes of Sonia clip ${have[0].id}`; }
  else {
    const masterOpts = await voiceConfigService.masteringOptsFor(SONIA.voiceName, 'azure');
    const renderAndMaster = async () => {
      const out = await ttsService.generateWithRetry(text, 'azure', { door: { courseCode: COURSE, intro: false, language: 'eng', voiceBound: true }, subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope', voiceName: SONIA.voiceName, speed: 1 });
      if (out.existingClip && !SONIA_IDS.includes(out.existingClip.voice_id)) throw new Error(`door offered a ${out.existingClip.voice_id} clip; Sonia only`);
      const { buffer, durationMs } = await phase8.masterAudio(out.audioBuffer, text, masterOpts);
      return { buffer, durationMs, wordBoundaries: out.wordBoundaries };
    };
    const gated = await veracity.renderChecked({ render: renderAndMaster, expectedText: text, language: 'eng', sampler: veracity.ALWAYS_SAMPLER, logger: console, meta: { courseCode: COURSE, role: 'presentation', voiceId: SONIA.voiceName, lego_id: legoId, originalText: text } });
    if (!gated.published) throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason})`);
    const newAudioId = uuidv4().toUpperCase();
    s3Key = `mastered/${newAudioId}.mp3`;
    await s3.send(new PutObjectCommand({ Bucket: phase8.S3_BUCKET, Key: s3Key, Body: gated.buffer, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
    durationMs = gated.durationMs; wordBoundaries = gated.wordBoundaries || null;
    verdictColumns = veracity.verdictColumns(gated.verdict, { checker: SWEEP, attempts: gated.attempts });
    how = `rendered Sonia (${durationMs} ms, ${text.length} chars)`;
  }
  const { data, error } = await supabase.from('course_audio').insert({ course_code: COURSE, text, text_normalized: textNormalized, language: 'eng', role: 'presentation', voice_id: SONIA.voiceId, origin: 'tts', s3_key: s3Key, duration_ms: durationMs, word_boundaries: wordBoundaries, lego_id: legoId, ...verdictColumns }).select('id').single();
  if (error) throw new Error(`course_audio insert refused: ${error.message}`);
  return { audioId: data.id, durationMs, how };
}

async function applyIntro(pg, supabase, log) {
  const humanAuthored = require('../../services/shared/human-authored-presentations.cjs');
  const { sameCast } = require('./ita-sonia-temporary-fill-2026-09-28.cjs');
  const { rows: [live] } = await pg.query('SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, INTRO.legoId]);
  if (live.known_text !== LEGO.to.known) throw new Error('intro step: LEGO is not the new text');
  // 1. the mark, first (the guard trigger enforces this order)
  const mark = await humanAuthored.markHumanAuthored(supabase, { courseCode: COURSE, legoId: INTRO.legoId, text: INTRO.text, author: AUTHOR, authoredOn: '2026-09-28', source: `job ${JOB}`, lego: live, by: SWEEP, why: RULING });
  log.intro = { markId: mark.id || mark.lego_id, text: INTRO.text };
  // 2. render under the one-row temporary Sonia cast, restored in finally
  const engCast = async () => (await pg.query(`SELECT slot, language, gender, rank, voice_id, notes, assigned_by, created_at, updated_at FROM voice_language_roles WHERE language='eng' ORDER BY slot, gender, rank, voice_id`)).rows;
  log.castBefore = await engCast();
  if (log.castBefore.some((r) => SONIA_IDS.includes(r.voice_id))) throw new Error('Sonia already in the English cast — a previous run did not restore it');
  let castRow = false;
  try {
    await pg.query(`INSERT INTO voice_language_roles (slot, language, gender, rank, voice_id, notes, assigned_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [TEMP_ROW.slot, TEMP_ROW.language, TEMP_ROW.gender, TEMP_ROW.rank, TEMP_ROW.voice_id, `TEMPORARY — ${RULING}. Removed by the same run.`, SWEEP]);
    castRow = true;
    try {
      const { audioId, durationMs, how } = await renderSonia(pg, supabase, INTRO.text, INTRO.legoId);
      await pg.query('UPDATE course_legos SET presentation_audio_id=$1 WHERE course_code=$2 AND lego_id=$3 AND presentation_audio_id IS NULL', [audioId, COURSE, INTRO.legoId]);
      await pg.query(`INSERT INTO lego_introductions (course_code, lego_id, presentation_audio_id, audio_uuid, duration_ms, updated_at) VALUES ($1,$2,$3,$3,$4,now()) ON CONFLICT (course_code, lego_id) DO UPDATE SET presentation_audio_id=EXCLUDED.presentation_audio_id, audio_uuid=EXCLUDED.audio_uuid, duration_ms=COALESCE(EXCLUDED.duration_ms, lego_introductions.duration_ms), updated_at=now()`, [COURSE, INTRO.legoId, audioId, durationMs]);
      log.intro.audioId = audioId; log.intro.result = how;
    } catch (e) { log.intro.result = `SILENT — render refused: ${e.message}`; }
  } finally {
    if (castRow) await pg.query(`DELETE FROM voice_language_roles WHERE slot=$1 AND language=$2 AND gender=$3 AND rank=$4 AND voice_id=$5 AND assigned_by=$6`, [TEMP_ROW.slot, TEMP_ROW.language, TEMP_ROW.gender, TEMP_ROW.rank, TEMP_ROW.voice_id, SWEEP]);
    log.castAfter = await engCast(); log.castRestored = sameCast(log.castBefore, log.castAfter);
  }
  const { rows: [chk] } = await pg.query('SELECT l.presentation_audio_id, a.text FROM course_legos l LEFT JOIN course_audio a ON a.id::text=l.presentation_audio_id WHERE l.course_code=$1 AND l.lego_id=$2', [COURSE, INTRO.legoId]);
  log.intro.linkedText = chk?.text || null; log.intro.mirrors = !!chk?.text && chk.text === INTRO.text;
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const log = { sweep: SWEEP, job: JOB, ruling: RULING, apply: APPLY, started: new Date().toISOString() };
  try {
    const rows = await loadRows(pg);
    const D = plan(rows);
    console.log(`\n══ ${COURSE} — S0159L01 "${LEGO.from.known}" → "${LEGO.to.known}" | "${LEGO.to.target}" — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
    console.log(`  components: ${LEGO.to.components.map((c) => `${c.known}→${c.target}`).join(' | ')}`);
    for (const c of D.phrases) console.log(`  ${c.id}  "${c.before.known}" | "${c.before.target}"  →  "${c.after.known}" | "${c.after.target}"`);
    console.log(`  DELETE ${D.del.id}  "${D.del.known}" | "${D.del.target}"   (${D.del.why.split(':')[0]})`);
    console.log(`  kept under the LEGO, already containing it on both sides: ${D.kept.length} — ${D.kept.map((k) => k.id).join(', ')}`);
    console.log(`  ${D.precedent.id}: ${D.precedent.duplicate ? 'DUPLICATE' : 'not a duplicate (English differs); stays new'}`);
    console.log(`  K29 witnesses: ${D.k29.map((w) => `${w.target} @ ${w.id} ${w.ok ? 'ok' : 'MISSING'}`).join(', ')}`);
    console.log(`  "${LEGO.to.known}" → Italians before: ${D.k2.before.join(' / ')}; re-glossed without the deletion: ${D.k2.wouldBe.join(' / ')} (the K2 hold); after: ${D.k2.after.join(' / ')}`);
    console.log(`  rows still glossed bare "${LEGO.from.known}" after the plan: ${D.isntLeft.length ? D.isntLeft.join(', ') : 'none'}`);
    console.log(`  intro: ${INTRO.text}`);
    log.plan = D;
    log.zutBefore = zutStrict();
    console.log(`  ZUT strict before: ${log.zutBefore}`);
    if (D.problems.length) console.log('\nPROBLEMS:\n  ' + D.problems.join('\n  ')); else console.log('\nguards hold: live text matches, is_new true, components tile, LEGO is a piece of the seed, every phrase under it contains it, 282 L01 is not a duplicate, K29 witnesses present, one Italian per "that isn\'t" after the plan');
    if (APPLY && !D.problems.length) {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
      await applyContent(pg, supabase, D, log);
      console.log(`APPLIED. events=${JSON.stringify(log.events)} unapproved=${JSON.stringify(log.unapproved)} known clip=${log.knownClip.id} (${log.knownClip.voice_id})`);
      await applyIntro(pg, supabase, log);
      console.log(`INTRO: ${log.intro.result}${log.intro.mirrors ? ' → linked, mirrors the mark' : ' → NOT MIRRORING'}; cast ${log.castRestored ? 'RESTORED byte-for-byte' : 'NOT RESTORED — fix by hand'}`);
      const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
      await refreshNow();
      const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
      log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: S0159L01 re-glossed to "that isn't" (Kai's approval); English prompt re-linked to the course's Sonia clip (A23 re-voice list), intro rendered on temporary Sonia`, metadata: { job: JOB, seeds: D.seeds, rows: D.phrases.length + 1 } });
      log.zutAfter = zutStrict();
      console.log(`ZUT strict after: ${log.zutAfter} (before ${log.zutBefore})`);
      if (log.zutAfter > log.zutBefore) { console.log('ZUT ROSE — report it'); process.exitCode = 3; }
    }
    const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
    if (D.problems.length) process.exitCode = 2;
  } finally { await pg.end(); }
}

module.exports = { plan, LEGO, PHRASES, DELETE, PRECEDENT, INTRO, SENTENCE, K29_WITNESSES, containsWords, sameWords, phraseContainsLego, componentsTileTarget, componentsTileKnown, isDuplicate };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
