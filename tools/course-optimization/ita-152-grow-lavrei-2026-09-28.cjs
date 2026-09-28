#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-152-grow-lavrei-2026-09-28.cjs
//
// ita_for_eng — KAI'S APPROVAL (2026-09-28, job #649·I): seed 152's own sentence
// ("l'avrei fatto diversamente se avessi saputo cosa volevi") carries the clitic l' that no LEGO
// of 152 covers — P27's worked example left that gap "stated rather than resolved". Kai's answer
// is L27's remedy: GROW the LEGO in place, never touch the seed sentence.
//
//   S0152L01  I would have done | avrei fatto  →  I would have done it | l'avrei fatto
//             components: it → l'  +  I would have done → avrei fatto
//             (K26: the component carries its person; K29: "avrei fatto" stays a tile on its own,
//              which is what licenses the bare "avrei fatto quello / tutto" rows in 152 L02/L03 and later)
//
// KNOCK-ON, each decided here so the decision is checkable by eye:
//   S0153L01 "I wouldn't have said it | non l'avrei detto" — NOT a duplicate of the grown LEGO
//     (duplicate = BOTH sides match, Kai 2026-09-23): different verb, different polarity. It stays new,
//     its basket stays played (P25), nothing under it moves. The l' is now first shown at 152, as the
//     seed order always implied; 153 still debuts non + l'avrei detto as a chunk.
//   Every build/use row under S0152L01 must contain the grown LEGO on BOTH sides (P17, O12). Rows built
//     on "avrei fatto quello/qualcosa/tutto" (the #626·I rewrites that took the clitic OUT one seed early)
//     are rewritten to "l'avrei fatto …" from vocabulary taught at or before seed 152 (ieri 30, prima 25,
//     per te / con te in 152's own rows, stamattina 39, meglio 29, penso che 72). No new words.
//   Rows under S0152L02/L03 and elsewhere that use bare "avrei fatto" keep it: they contain their own
//     LEGO and "avrei fatto" is still taught as a component (K29). Listed by the downstream audit, not changed.
//   Seed sentences 152/153 are NOT changed. Seeds 152 and 153 are unapproved (153 because the l' it
//     introduces is no longer its first showing — Kai should read both).
//
// AFTER THE EDIT (same shape as ita-grow-subject-legos-2026-09-28.cjs): changed Italian slots linked to
// an existing Elsa/Benigno clip or rendered on Azure through the guarded door (never Cartesia); changed
// English slots detached for ita-sonia-temporary-fill (SCOPE=ids; Charlotte re-voice list); the intro
// re-mirrored by ita-intro-mirror-fix --only-seeds 152; audio-pass request queued; round index refreshed.
//
//   node tools/course-optimization/ita-152-grow-lavrei-2026-09-28.cjs            # plan (dry run, no writes)
//   APPLY=1 node tools/course-optimization/ita-152-grow-lavrei-2026-09-28.cjs    # write + Italian audio + intro
//   AUDIO_ONLY=1 node tools/course-optimization/ita-152-grow-lavrei-2026-09-28.cjs  # after apply: fill still-silent Italian slots

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const JOB = '#649·I';
const SWEEP = 'ita-152-grow-lavrei-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = "Kai, 2026-09-28 (job #649·I): seed 152's l' is a piece of the seed no LEGO covers (L27); grow S0152L01 in place to 'I would have done it | l'avrei fatto' on both sides, seed sentence unchanged; every phrase under it contains it";
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const AZURE_VOICE_IDS = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };

// ── Rules (same as the subject-LEGO grow tool; re-stated so this file reads alone) ──────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»“”]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
const squash = (s) => norm(s).replace(/\s+/g, '');
/** Live gate's phrase-contains-LEGO rule: word multiset. */
function containsWords(hay, needle) {
  const h = words(hay);
  for (const w of words(needle)) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); }
  return true;
}
const sameWords = (a, b) => containsWords(a, b) && words(a).length === words(b).length;
const phraseContainsLego = (p, l) => containsWords(p.known, l.known) && containsWords(p.target, l.target);
/** Components tile the LEGO: Italian contiguous (l' + avrei fatto squashes to l'avreifatto), English as a multiset. */
const componentsTileTarget = (l) => squash(l.components.map((c) => c.target).join(' ')) === squash(l.target);
const componentsTileKnown = (l) => sameWords(l.components.map((c) => c.known).join(' '), l.known);
/** Duplicate = BOTH sides match (Kai, 2026-09-23). */
const isDuplicate = (a, b) => sameWords(a.known, b.known) && sameWords(a.target, b.target);

// ── The LEGO ──────────────────────────────────────────────────────────────────────────────
const SEED = 152;
const SENTENCE = { known: 'I would have done it differently if I had known what you wanted', target: "l'avrei fatto diversamente se avessi saputo cosa volevi" };
const LEGO = {
  id: 'S0152L01', seed: SEED,
  from: { known: 'I would have done', target: 'avrei fatto', components: [{ known: 'would have done', target: 'avrei fatto' }] },
  to: { known: 'I would have done it', target: "l'avrei fatto", components: [{ known: 'it', target: "l'" }, { known: 'I would have done', target: 'avrei fatto' }] },
};
/** The neighbour the brief asks about: left as it stands unless it is a both-sides duplicate. */
const NEIGHBOUR = { id: 'S0153L01', known: "I wouldn't have said it", target: "non l'avrei detto" };

const P = (id, bk, bt, ak, at, why) => ({ id, seed: SEED, before: { known: bk, target: bt }, after: { known: ak, target: at }, why });
/** Every build/use row under S0152L01, before → after. Vocabulary: taught at or before seed 152. */
const PHRASES = [
  P('S0152L01B01', 'I would have done', 'avrei fatto', 'I would have done it', "l'avrei fatto", 'lego: B01 is the LEGO itself'),
  P('S0152L01B02', 'I would have done', 'avrei fatto', 'I would have done it', "l'avrei fatto", 'lego: the repeated build (153 L01 has four)'),
  P('S0152L01B03', 'I would have done', 'avrei fatto', 'I would have done it', "l'avrei fatto", 'lego: the repeated build'),
  P('S0152L01B04', 'I would have done that', 'avrei fatto quello', 'I would have done it before', "l'avrei fatto prima", 'contain: "that | quello" is not "it | l\'"; prima taught at 25 and already in 152 L03B03'),
  P('S0152L01U01', 'I would have done that yesterday', 'avrei fatto quello ieri', 'I would have done it yesterday', "l'avrei fatto ieri", 'contain: the object becomes the clitic (ieri 30)'),
  P('S0152L01U02', 'I would have done something for you', 'avrei fatto qualcosa per te', 'I would have done it for you', "l'avrei fatto per te", 'contain: qualcosa → l\' (per te already in this row)'),
  P('S0152L01U03', 'I would have done that with you', 'avrei fatto quello con te', 'I would have done it with you', "l'avrei fatto con te", 'contain: quello → l\' (con te already in this row)'),
  P('S0152L01U05', 'I would have done everything this morning', 'avrei fatto tutto stamattina', 'I would have done it this morning', "l'avrei fatto stamattina", 'contain: tutto → l\' (stamattina 39)'),
  P('S0152L01U06', 'I would have done something else', "avrei fatto qualcos'altro", 'I would have done it better', "l'avrei fatto meglio", 'contain: qualcos\'altro → l\' + meglio (29); also clears the qualcos\'altro form #626·I left for Kai'),
  P('S0152L01U07', 'I would have done the same thing', 'avrei fatto la stessa cosa', 'I think I would have done it', "penso che l'avrei fatto", 'contain: la stessa cosa → l\'; penso che (72) frames it as 152 L02U05 does'),
];

const short = (id) => String(id).replace(/^ita_for_eng:/, '');
function plan(rows) {
  const byId = {}; for (const r of rows) byId[r.id] = r;
  const problems = [], notes = [];
  const live = byId[LEGO.id];
  if (!live) problems.push(`${LEGO.id}: not live`);
  else {
    if (live.known !== LEGO.from.known || live.target !== LEGO.from.target) problems.push(`${LEGO.id}: live reads "${live.known}" | "${live.target}", expected "${LEGO.from.known}" | "${LEGO.from.target}"`);
    if (JSON.stringify(live.components) !== JSON.stringify(LEGO.from.components)) problems.push(`${LEGO.id}: live components are ${JSON.stringify(live.components)}`);
    if (live.is_new !== true) problems.push(`${LEGO.id}: is_new is ${live.is_new} — this job keeps it true`);
  }
  // L28: the old target sits inside a BOUND token (l'avrei), so the Italian test is contiguous substring, not word multiset.
  if (!containsWords(LEGO.to.known, LEGO.from.known) || !squash(LEGO.to.target).includes(squash(LEGO.from.target))) problems.push(`${LEGO.id}: the grown LEGO does not contain the old one`);
  if (!containsWords(SENTENCE.known, LEGO.to.known) || !squash(SENTENCE.target).includes(squash(LEGO.to.target))) problems.push(`${LEGO.id}: the grown LEGO is not a piece of its own seed (L26)`);
  if (!componentsTileTarget(LEGO.to)) problems.push(`${LEGO.id}: components do not tile the Italian`);
  if (!componentsTileKnown(LEGO.to)) problems.push(`${LEGO.id}: components do not tile the English`);
  const seedRow = rows.find((r) => r.kind === 'seed' && r.sn === SEED);
  if (seedRow && (seedRow.known !== SENTENCE.known || seedRow.target !== SENTENCE.target)) problems.push(`seed ${SEED} sentence reads "${seedRow.known}" | "${seedRow.target}" — not what this job was written against`);
  // The neighbour: duplicate only if BOTH sides match; otherwise it stays as it is and we say why.
  const n = byId[NEIGHBOUR.id];
  const neighbour = { id: NEIGHBOUR.id, live: n ? { known: n.known, target: n.target, is_new: n.is_new } : null,
    duplicate: n ? isDuplicate(n, LEGO.to) : null,
    verdict: n && isDuplicate(n, LEGO.to) ? 'DUPLICATE — later one goes not-new and its rows are rehomed (P25)'
      : `not a duplicate of "${LEGO.to.known} | ${LEGO.to.target}": different verb (said/done) and polarity (non); stays new, basket stays played` };
  if (neighbour.duplicate) problems.push(`${NEIGHBOUR.id} IS a both-sides duplicate of the grown LEGO — this tool does not rehome; stop`);
  for (const c of PHRASES) {
    const l = byId[c.id];
    if (!l) { problems.push(`${c.id}: not live`); continue; }
    if (l.known !== c.before.known || l.target !== c.before.target) problems.push(`${c.id}: live reads "${l.known}" | "${l.target}", expected "${c.before.known}" | "${c.before.target}"`);
    if (l.kind === 'component') problems.push(`${c.id}: is a component row`);
    if (!phraseContainsLego(c.after, LEGO.to)) problems.push(`${c.id}: after "${c.after.known}" | "${c.after.target}" does not contain the grown LEGO`);
  }
  const after = rows.map((r) => { const c = PHRASES.find((x) => x.id === r.id); return c ? { ...r, known: c.after.known, target: c.after.target } : r; });
  const under = after.filter((r) => r.id.startsWith(LEGO.id) && r.id !== LEGO.id && (r.kind === 'build' || r.kind === 'use'));
  const kept = [];
  for (const p of under) {
    if (!phraseContainsLego(p, LEGO.to)) problems.push(`${p.id}: "${p.known}" | "${p.target}" does not contain the grown LEGO`);
    if (!PHRASES.some((x) => x.id === p.id)) kept.push(p);
  }
  const seen = new Map();
  for (const p of under.filter((p) => p.kind === 'use')) { const k = norm(p.known) + '|' + norm(p.target); if (seen.has(k)) problems.push(`${p.id} duplicates ${seen.get(k)}: "${p.known}"`); seen.set(k, p.id); }
  // O12 course-wide half: every other row that carries the OLD gloss over the old target still contains its own LEGO; listed.
  const oldGlossElsewhere = after.filter((r) => (r.kind === 'build' || r.kind === 'use') && !r.id.startsWith(LEGO.id) && containsWords(r.known, LEGO.from.known) && containsWords(r.target, LEGO.from.target))
    .map((r) => ({ id: r.id, seed: r.sn, known: r.known, target: r.target }));
  // P27 sanity: after the edit, no row BEFORE seed 152 carries l'avrei.
  const early = after.filter((r) => r.sn < SEED && /\bl'avrei\b/i.test(r.target)).map((r) => r.id);
  if (early.length) problems.push(`l'avrei used before seed ${SEED}: ${early.join(', ')}`);
  return { problems, notes, kept, neighbour, oldGlossElsewhere, lego: LEGO, phrases: PHRASES, seeds: [152, 153] };
}

async function loadRows(pg) {
  const { rows } = await pg.query(
    `SELECT 'lego' AS kind, seed_number AS sn, lego_id AS id, known_text AS known, target_text AS target, components, is_new FROM course_legos WHERE course_code=$1
     UNION ALL SELECT phrase_role, seed_number, id, known_text, target_text, NULL, NULL FROM course_practice_phrases WHERE course_code=$1
     UNION ALL SELECT 'seed', seed_number, seed_id, known_text, target_text, NULL, NULL FROM course_seeds WHERE course_code=$1 ORDER BY 2, 3`, [COURSE]);
  return rows.map((r) => ({ ...r, sn: Number(r.sn), id: short(r.id) }));
}
/** ZUT against the live course for every pair this job writes: K2 (one English → two Italians) is a HOLD. */
async function zutAgainstCourse(pg, D) {
  const ours = new Set([...D.phrases.map((c) => c.id), D.lego.id]);
  const pairs = [{ id: D.lego.id, known: D.lego.to.known, target: D.lego.to.target }, ...D.phrases.map((c) => ({ id: c.id, ...c.after }))];
  const clashes = [];
  for (const p of pairs) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND id<>$4 AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id<>$5 AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))`,
      [COURSE, p.known, p.target, `${COURSE}:${p.id}`, p.id]);
    for (const r of rows.filter((r) => !ours.has(short(r.id)))) clashes.push({ change: p.id, pair: `"${p.known}" → "${p.target}"`, vs: `${short(r.id)} "${r.known_text}" → "${r.target_text}"`, k2: r.known_text.trim().toLowerCase() === p.known.toLowerCase() });
  }
  return clashes;
}

async function applyContent(pg, supabase, D, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: op, scope, detail });
  const legoEvent = await ev('lego-edit', { seed_numbers: [SEED], lego_ids: [LEGO.id], rows: 1 }, { ruling: RULING, job: JOB, changes: [{ id: LEGO.id, from: LEGO.from, to: LEGO.to }] });
  const phraseEvent = await ev('phrase-edit', { seed_numbers: [SEED], phrase_ids: D.phrases.map((c) => `${COURSE}:${c.id}`), rows: D.phrases.length }, { ruling: RULING, job: JOB, changes: D.phrases.map((c) => ({ id: `${COURSE}:${c.id}`, from: c.before, to: c.after, why: c.why })) });
  const unapproveEvent = await ev('unapprove', { seed_numbers: D.seeds, rows: D.seeds.length }, { why: "S0152L01 grown to take the seed's l' under Kai's approval; 153 now shows l' second — both need his read", job: JOB });
  log.events = { legoEvent, phraseEvent, unapproveEvent };
  await pg.query('BEGIN');
  try {
    const u = await pg.query(`UPDATE course_legos SET known_text=$1, target_text=$2, components=$3, known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL, target1_duration_ms=NULL, target2_duration_ms=NULL, last_edit_event_id=$4, updated_at=now() WHERE course_code=$5 AND lego_id=$6 AND known_text=$7 AND target_text=$8 AND is_new=true`,
      [LEGO.to.known, LEGO.to.target, JSON.stringify(LEGO.to.components), legoEvent, COURSE, LEGO.id, LEGO.from.known, LEGO.from.target]);
    if (u.rowCount !== 1) throw new Error(`${LEGO.id}: ${u.rowCount} rows`);
    for (const c of D.phrases) {
      const knownMoved = c.before.known !== c.after.known, targetMoved = c.before.target !== c.after.target;
      const r = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL,
          known_audio_id = CASE WHEN $10 THEN NULL ELSE known_audio_id END, target1_audio_id = CASE WHEN $11 THEN NULL ELSE target1_audio_id END, target2_audio_id = CASE WHEN $11 THEN NULL ELSE target2_audio_id END,
          last_edit_event_id=$5, updated_at=now() WHERE course_code=$6 AND id=$7 AND known_text=$8 AND target_text=$9`,
        [c.after.known, c.after.target, c.after.target.length, c.after.target.split(/\s+/).length, phraseEvent, COURSE, `${COURSE}:${c.id}`, c.before.known, c.before.target, knownMoved, targetMoved]);
      if (r.rowCount !== 1) throw new Error(`${c.id}: ${r.rowCount} rows`);
    }
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [unapproveEvent, COURSE, D.seeds]);
    log.unapproved = { seeds: D.seeds, rows: un.rowCount };
    const { rows: still } = await pg.query('SELECT is_new FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, LEGO.id]);
    if (!still[0]?.is_new) throw new Error('is_new is no longer true on the grown LEGO');
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: S0152L01 grown to "l'avrei fatto" (Kai's approval) and ${D.phrases.length} phrases; Italian on Elsa/Benigno by the tool, English prompts on temporary Sonia (ita-sonia-temporary-fill SCOPE=ids), intro re-mirrored`, metadata: { job: JOB, seeds: D.seeds, rows: D.phrases.length + 1 } });
}

async function fillItalian(pg, supabase, D, log) {
  const { rows } = await pg.query(
    `SELECT 'course_legos' AS tbl, lego_id AS id, target_text, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND lego_id=$2
     UNION ALL SELECT 'course_practice_phrases', id, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($3)`,
    [COURSE, LEGO.id, D.phrases.map((c) => `${COURSE}:${c.id}`)]);
  const slots = [];
  for (const r of rows) for (const role of ['target1', 'target2']) if (!r[`${role}_audio_id`]) slots.push({ tbl: r.tbl, id: r.id, role, text: r.target_text });
  const idCol = (tbl) => (tbl === 'course_legos' ? 'lego_id' : 'id');
  const link = async (slot, audioId) => (await pg.query(`UPDATE ${slot.tbl} SET ${slot.role}_audio_id=$1 WHERE course_code=$2 AND ${idCol(slot.tbl)}=$3 AND target_text=$4 AND ${slot.role}_audio_id IS NULL`, [audioId, COURSE, slot.id, slot.text])).rowCount === 1;
  const current = async (slot) => (await pg.query(`SELECT ${slot.role}_audio_id AS id FROM ${slot.tbl} WHERE course_code=$1 AND ${idCol(slot.tbl)}=$2`, [COURSE, slot.id])).rows[0]?.id || null;
  log.italian = [];
  for (const slot of slots) {
    const entry = { ...slot }; log.italian.push(entry);
    const { rows: have } = await pg.query(`SELECT id, voice_id FROM course_audio WHERE language='ita' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND voice_id = ANY($2) ORDER BY (course_code=$3) DESC, (role=$4) DESC, created_at DESC LIMIT 1`, [slot.text, AZURE_VOICE_IDS[slot.role], COURSE, slot.role]);
    if (have[0]) {
      const already = await current(slot);
      entry.result = `linked existing ${have[0].voice_id} clip ${have[0].id}`;
      entry.linked = already ? (already === have[0].id || `slot already holds ${already}`) : await link(slot, have[0].id);
      continue;
    }
    entry.result = await renderItalian(supabase, slot, link, current);
    entry.linked = (await current(slot)) !== null;
  }
}
async function renderItalian(supabase, slot, link, current) {
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
    if (!(await current(slot))) await link(slot, out.audioId);
    return `rendered ${voice.voiceName} clip ${out.audioId} (${gated.durationMs} ms)`;
  } catch (e) { return `REFUSED/FAILED: ${e.message}`; }
}
function reMirrorIntros(log, seeds) {
  const { spawnSync } = require('child_process');
  const script = path.join(__dirname, 'ita-intro-mirror-fix-2026-09-28.cjs');
  const r = spawnSync(process.execPath, [script, '--only-seeds', seeds.join(',')], { encoding: 'utf8', env: { ...process.env, APPLY: '1', INTRO_MIRROR_AT_EXIT: '0' }, timeout: 20 * 60 * 1000 });
  log.introFix = { status: r.status, tail: String(r.stdout || '').split('\n').slice(-40).join('\n'), stderr: String(r.stderr || '').slice(-4000) };
  return r.status;
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const log = { sweep: SWEEP, job: JOB, ruling: RULING, apply: APPLY, started: new Date().toISOString() };
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
    if (process.env.AUDIO_ONLY === '1') {
      await fillItalian(pg, supabase(), { phrases: PHRASES }, log);
      for (const a of log.italian) console.log(`  ${a.tbl}.${short(a.id)} ${a.role} "${a.text}": ${a.result}${a.linked === true ? ' → linked' : a.linked ? ` (${a.linked})` : ''}`);
      const f = evidencePath(`tools/course-optimization/${SWEEP}/audio-only-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
      return;
    }
    const rows = await loadRows(pg);
    const D = plan(rows);
    console.log(`\n══ ${COURSE} — grow S0152L01 to take the seed's l' — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
    console.log(`  LEGO ${LEGO.id}  "${LEGO.from.known}" | "${LEGO.from.target}"  →  "${LEGO.to.known}" | "${LEGO.to.target}"   components ${LEGO.to.components.map((c) => `${c.known}→${c.target}`).join(' | ')}`);
    for (const c of D.phrases) console.log(`  ${c.id}  "${c.before.known}" | "${c.before.target}"  →  "${c.after.known}" | "${c.after.target}"   (${c.why.split(':')[0]})`);
    console.log(`  ${D.neighbour.id}: ${D.neighbour.verdict}`);
    console.log(`kept under the grown LEGO (already contain it): ${D.kept.length}; rows elsewhere still on the old gloss "I would have done | avrei fatto" (own LEGO, K29 component): ${D.oldGlossElsewhere.length}`);
    const clashes = await zutAgainstCourse(pg, D);
    console.log(`ZUT against the course: ${clashes.length ? '\n  ' + clashes.map((z) => `${z.k2 ? 'K2 HOLD' : 'two Englishes, one Italian (not a defect)'}: ${z.change} ${z.pair} vs ${z.vs}`).join('\n  ') : 'no clash'}`);
    for (const z of clashes.filter((z) => z.k2)) D.problems.push(`ZUT K2: ${z.change} ${z.pair} vs ${z.vs}`);
    log.plan = D; log.zutInTool = clashes;
    if (D.problems.length) console.log('\nPROBLEMS:\n  ' + D.problems.join('\n  ')); else console.log('\nguards hold: live text matches, is_new true, components tile both sides, grown LEGO is a piece of the seed, every phrase under it contains it, 153 L01 is not a duplicate, no l\'avrei before 152');
    if (APPLY && !D.problems.length) {
      const sb = supabase();
      await applyContent(pg, sb, D, log);
      console.log(`APPLIED. events=${JSON.stringify(log.events)} unapproved=${JSON.stringify(log.unapproved)} audioPass=${JSON.stringify(log.audioPass)}`);
      await fillItalian(pg, sb, D, log);
      console.log('ITALIAN AUDIO:'); for (const a of log.italian) console.log(`  ${a.tbl}.${short(a.id)} ${a.role} "${a.text}": ${a.result}${a.linked === true ? ' → linked' : a.linked ? ` (${a.linked})` : ''}`);
      const st = reMirrorIntros(log, [SEED]);
      console.log(`intro re-mirror: exit ${st}\n${log.introFix.tail}`);
      const ids = [LEGO.id, ...D.phrases.filter((c) => c.before.known !== c.after.known).map((c) => `${COURSE}:${c.id}`)];
      log.soniaIds = ids;
      console.log(`\nENGLISH prompts to fill on temporary Sonia (${ids.length}):\n  SCOPE=ids IDS=${ids.join(',')} APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs`);
    }
    const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
    if (D.problems.length) process.exitCode = 2;
  } finally { await pg.end(); }
}

module.exports = { plan, LEGO, PHRASES, NEIGHBOUR, SENTENCE, containsWords, sameWords, phraseContainsLego, componentsTileTarget, componentsTileKnown, isDuplicate };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
