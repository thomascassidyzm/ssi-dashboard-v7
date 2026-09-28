#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-seed-599-sarei-2026-09-28.cjs
//
// ita_for_eng seed 599 (Kai ruled YES, 2026-09-28, job #544): the seed and its first LEGO are in
// the WRONG PERSON. The English is first person ("I'd have been happy …") but the Italian says
// "sarebbe stato felice" (he/she would have been). Every build/use phrase under the LEGO already
// says "sarei stato" — only the seed, the LEGO and its first component still carry "sarebbe".
//
//   seed 599   sarebbe stato felice di guidare se me l'avessi detto  →  sarei stato felice di guidare se me l'avessi detto
//   S0599L01   sarebbe stato felice                                  →  sarei stato felice          (known unchanged)
//   S0599L01C01  would have been → sarebbe stato                     →  I would have been → sarei stato
//
// The component takes the pronoun on the English side because that is how this course glosses a
// first-person verb component (S0611L01C01 is the exact precedent: "I would have been → sarei
// stato"; 49 components in the course begin with "I "). It also makes the components tile the
// LEGO on BOTH sides, which "would have been" + "happy" never did.
//
// The presentation line "The Italian for: 'I would have been happy', is:" quotes the KNOWN side,
// which does not change, so it still mirrors the LEGO and its clip is kept (re-asserted after the
// UPDATE, because the lego trigger puts a presentation link in question whenever the target moves).
//
// AUDIO: nothing is rendered unless a slot has no clip on the course's cast voice. Every Italian
// line here already exists on Elsa/Benigno (the B/U phrases have said "sarei" all along), and an
// Azure Sonia "I would have been" clip exists from the temporary-Sonia fill of job #522/#529, so
// the expected outcome is links only. Italian renders, if any, go to Azure Elsa/Benigno through the
// guarded door — never Cartesia. English is Sonia-only (the temporary route), never rendered by
// this tool: a missing Sonia clip is REPORTED and left for ita-sonia-temporary-fill.
//
//   node tools/course-optimization/ita-seed-599-sarei-2026-09-28.cjs           # dry run
//   APPLY=1 node tools/course-optimization/ita-seed-599-sarei-2026-09-28.cjs   # write + link/render

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng', SEED = 599, LEGO_ID = 'S0599L01';
const SWEEP = 'ita-seed-599-sarei-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = 'Kai, 2026-09-28 (job #544): seed 599 is first person — "sarei stato felice", not "sarebbe stato felice"';
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const AZURE_VOICE_IDS = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };
const SONIA_IDS = ['azure_en-GB-SoniaNeural', 'en-GB-SoniaNeural'];

const SEED_KNOWN = "I'd have been happy to drive if you'd told me";
const OLD_SEED = { known: SEED_KNOWN, target: "sarebbe stato felice di guidare se me l'avessi detto" };
const NEW_SEED = { known: SEED_KNOWN, target: "sarei stato felice di guidare se me l'avessi detto" };
const OLD_LEGO = { known: 'I would have been happy', target: 'sarebbe stato felice', components: [{ known: 'would have been', target: 'sarebbe stato' }, { known: 'happy', target: 'felice' }] };
const NEW_LEGO = { known: 'I would have been happy', target: 'sarei stato felice', components: [{ known: 'I would have been', target: 'sarei stato' }, { known: 'happy', target: 'felice' }] };
const L02 = { known: "if you'd told me", target: "se me l'avessi detto" };
const CHANGES = [
  { id: 'S0599L01C01', role: 'component', before: { known: 'would have been', target: 'sarebbe stato' }, after: { known: 'I would have been', target: 'sarei stato' } },
];
const PRESENTATION = { audioId: '3a5840ce-7c07-433d-83eb-d2b9b2c07840', text: "The Italian for: 'I would have been happy', is:" };

// ── Rules ───────────────────────────────────────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/[.,!?;:"]+/g, ' ').replace(/’/g, "'").replace(/\s+/g, ' ').trim();
const squash = (s) => norm(s).replace(/\s+/g, '');
const contains = (hay, needle) => ` ${norm(hay)} `.includes(` ${norm(needle)} `);
/** A first-person English "I'd / I would have been" must be "sarei stato" in Italian, never "sarebbe stato". */
const personAgrees = (p) => !/\b(i'd|i would) have been\b/.test(norm(p.known)) || (contains(p.target, 'sarei stato') && !contains(p.target, 'sarebbe stato'));
/** L01 opens the seed and L02 closes it, on both sides. The middle piece "to drive → di guidare" belongs to no
 *  LEGO of this seed and the seed's English says "I'd" where the LEGO says "I would" — both pre-existing and
 *  outside this fix, so the rule brackets the seed rather than tiling it. */
const expandId = (s) => norm(s).replace(/\bi'd\b/g, 'i would');
const legosBracketSeed = (seed, l1) => norm(seed.target).startsWith(norm(l1.target)) && norm(seed.target).endsWith(norm(L02.target)) && expandId(seed.known).startsWith(expandId(l1.known)) && expandId(seed.known).endsWith(expandId(L02.known));
const componentsTileLego = (l) => squash(l.components.map(c => c.target).join(' ')) === squash(l.target) && squash(l.components.map(c => c.known).join(' ')) === squash(l.known);
const phraseContainsLego = (p, l = NEW_LEGO) => contains(p.target, l.target) && contains(p.known, l.known);
const presentationMirrorsLego = (text, l) => contains(text, `'${l.known}'`) || text.includes(`'${l.known}'`);

// ── Live ────────────────────────────────────────────────────────────────────────────────
async function guardLive(pg) {
  const problems = [];
  const { rows: [s] } = await pg.query('SELECT known_text, target_text FROM course_seeds WHERE course_code=$1 AND seed_number=$2', [COURSE, SEED]);
  if (!s || s.known_text !== OLD_SEED.known || s.target_text !== OLD_SEED.target) problems.push(`seed reads "${s?.known_text}" → "${s?.target_text}"`);
  const { rows: [l] } = await pg.query('SELECT known_text, target_text, components, presentation_audio_id FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, LEGO_ID]);
  if (!l || l.known_text !== OLD_LEGO.known || l.target_text !== OLD_LEGO.target) problems.push(`${LEGO_ID} reads "${l?.known_text}" → "${l?.target_text}"`);
  if (l && JSON.stringify(l.components) !== JSON.stringify(OLD_LEGO.components)) problems.push(`${LEGO_ID} components are ${JSON.stringify(l.components)}`);
  if (l && l.presentation_audio_id !== PRESENTATION.audioId) problems.push(`${LEGO_ID} presentation link is ${l.presentation_audio_id}`);
  const { rows: [pa] } = await pg.query('SELECT text FROM course_audio WHERE id=$1', [PRESENTATION.audioId]);
  if (pa?.text !== PRESENTATION.text) problems.push(`presentation clip text is "${pa?.text}"`);
  for (const c of CHANGES) {
    const { rows: [r] } = await pg.query('SELECT known_text, target_text, phrase_role FROM course_practice_phrases WHERE course_code=$1 AND id=$2', [COURSE, `${COURSE}:${c.id}`]);
    if (!r || r.known_text !== c.before.known || r.target_text !== c.before.target || r.phrase_role !== c.role) problems.push(`${c.id} reads "${r?.known_text}" → "${r?.target_text}" (${r?.phrase_role})`);
  }
  // Another job (#543·I) is editing say it/that/this rows in this course right now: refuse if any of its edits name seed 599.
  const { rows: ev } = await pg.query(`SELECT id, surface FROM content_edit_events WHERE course_code=$1 AND occurred_at > now() - interval '12 hours' AND surface NOT LIKE '%' || $2 || '%' AND (scope->'seed_numbers' @> to_jsonb(ARRAY[$3::int]) OR scope::text LIKE '%S0599%')`, [COURSE, SWEEP, SEED]);
  for (const e of ev) problems.push(`another surface edited seed 599 today: ${e.surface} (${e.id})`);
  return { problems };
}
async function seedPhrases(pg) {
  const { rows } = await pg.query('SELECT id, lego_index, phrase_role, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 ORDER BY lego_index, position', [COURSE, SEED]);
  const after = Object.fromEntries(CHANGES.map(c => [`${COURSE}:${c.id}`, c.after]));
  return rows.map(r => ({ id: r.id.split(':')[1], lego_index: r.lego_index, role: r.phrase_role, known: after[r.id]?.known ?? r.known_text, target: after[r.id]?.target ?? r.target_text }));
}
async function zutAgainstCourse(pg) {
  const pairs = [{ id: LEGO_ID, known: NEW_LEGO.known, target: NEW_LEGO.target }, ...CHANGES.filter(c => c.role !== 'component').map(c => ({ id: c.id, ...c.after }))];
  const clashes = [];
  for (const p of pairs) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND id<>$4 AND phrase_role<>'component' AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id<>$5 AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))`,
      [COURSE, p.known, p.target, `${COURSE}:${p.id}`, LEGO_ID]);
    for (const r of rows) clashes.push(`${p.id} "${p.known}" → "${p.target}" vs ${r.id} "${r.known_text}" → "${r.target_text}"`);
  }
  return clashes;
}
/** Anything anywhere in the course still saying "sarebbe stato felice" for this seed's English, or linked to a clip that says it. */
async function residue(pg) {
  const { rows } = await pg.query(
    `SELECT 'seed' AS kind, seed_number::text AS id, target_text AS text FROM course_seeds WHERE course_code=$1 AND target_text ILIKE '%sarebbe stato felice%'
     UNION ALL SELECT 'lego', lego_id, target_text FROM course_legos WHERE course_code=$1 AND (target_text ILIKE '%sarebbe stato felice%' OR components::text ILIKE '%sarebbe stato%' AND seed_number=$2)
     UNION ALL SELECT 'phrase', id, target_text FROM course_practice_phrases WHERE course_code=$1 AND target_text ILIKE '%sarebbe stato felice%'
     UNION ALL SELECT 'audio-link ' || x.tbl || '.' || x.col, x.id, a.text FROM (
        SELECT 'course_seeds' tbl, 'target1' col, seed_number::text id, target1_audio_id aid FROM course_seeds WHERE course_code=$1 AND seed_number=$2
        UNION ALL SELECT 'course_seeds', 'target2', seed_number::text, target2_audio_id FROM course_seeds WHERE course_code=$1 AND seed_number=$2
        UNION ALL SELECT 'course_legos', 'target1', lego_id, target1_audio_id FROM course_legos WHERE course_code=$1 AND seed_number=$2
        UNION ALL SELECT 'course_legos', 'target2', lego_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND seed_number=$2
        UNION ALL SELECT 'course_practice_phrases', 'target1', id, target1_audio_id FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2
        UNION ALL SELECT 'course_practice_phrases', 'target2', id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2
     ) x JOIN course_audio a ON a.id=x.aid WHERE a.text ILIKE '%sarebbe stato%'`, [COURSE, SEED]);
  return rows;
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const seedEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'seed-edit', scope: { seed_numbers: [SEED], rows: 1 }, detail: { ruling: RULING, from: OLD_SEED, to: NEW_SEED } });
  const legoEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-edit', scope: { seed_numbers: [SEED], lego_ids: [LEGO_ID], rows: 1 }, detail: { ruling: RULING, from: OLD_LEGO, to: NEW_LEGO } });
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: [SEED], phrase_ids: CHANGES.map(c => `${COURSE}:${c.id}`), rows: CHANGES.length },
    detail: { ruling: RULING, changes: CHANGES.map(c => ({ id: `${COURSE}:${c.id}`, known_from: c.before.known, target_from: c.before.target, known_to: c.after.known, target_to: c.after.target })) } });
  const unapproveEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: [SEED], rows: 1 }, detail: { why: 'seed 599 person fix; needs Kai\'s read' } });
  log.events = { seedEvent, legoEvent, phraseEvent, unapproveEvent };
  await pg.query('BEGIN');
  try {
    // Seed: target moves, known stays; target links cleared explicitly (the trigger respects a writer-set link).
    const s = await pg.query('UPDATE course_seeds SET target_text=$1, target1_audio_id=NULL, target2_audio_id=NULL, approved_at=NULL, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND seed_number=$4 AND target_text=$5', [NEW_SEED.target, seedEvent, COURSE, SEED, OLD_SEED.target]);
    if (s.rowCount !== 1) throw new Error(`seed: ${s.rowCount} rows`);
    const l = await pg.query('UPDATE course_legos SET target_text=$1, components=$2, target1_audio_id=NULL, target2_audio_id=NULL, target1_duration_ms=NULL, target2_duration_ms=NULL, last_edit_event_id=$3, updated_at=now() WHERE course_code=$4 AND lego_id=$5 AND target_text=$6', [NEW_LEGO.target, JSON.stringify(NEW_LEGO.components), legoEvent, COURSE, LEGO_ID, OLD_LEGO.target]);
    if (l.rowCount !== 1) throw new Error(`${LEGO_ID}: ${l.rowCount} rows`);
    // The presentation quotes the unchanged known side, so it still mirrors the LEGO: keep the clip whatever the trigger decided.
    const { rows: [pl] } = await pg.query('SELECT presentation_audio_id, known_audio_id FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, LEGO_ID]);
    log.presentation = { afterTrigger: pl.presentation_audio_id, knownAfterTrigger: pl.known_audio_id };
    if (pl.presentation_audio_id !== PRESENTATION.audioId) { await pg.query('UPDATE course_legos SET presentation_audio_id=$1 WHERE course_code=$2 AND lego_id=$3', [PRESENTATION.audioId, COURSE, LEGO_ID]); log.presentation.reasserted = true; }
    for (const c of CHANGES) {
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL, word_count=$3, lego_count=$4, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$5, updated_at=now() WHERE course_code=$6 AND id=$7 AND known_text=$8 AND target_text=$9`,
        [c.after.known, c.after.target, c.after.target.length, c.after.target.split(/\s+/).length, phraseEvent, COURSE, `${COURSE}:${c.id}`, c.before.known, c.before.target]);
      if (u.rowCount !== 1) throw new Error(`${c.id}: ${u.rowCount} rows`);
    }
    await pg.query('UPDATE course_seeds SET last_edit_event_id=$1 WHERE course_code=$2 AND seed_number=$3', [unapproveEvent, COURSE, SEED]);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
}

// ── Audio ───────────────────────────────────────────────────────────────────────────────
async function fillAudio(pg, supabase, log) {
  const { rows } = await pg.query(
    `SELECT 'course_seeds' AS tbl, seed_number::text AS id, target_text, NULL::text AS known_text, NULL::uuid AS known_audio_id, target1_audio_id, target2_audio_id FROM course_seeds WHERE course_code=$1 AND seed_number=$2
     UNION ALL SELECT 'course_legos', lego_id, target_text, known_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND lego_id=$3
     UNION ALL SELECT 'course_practice_phrases', id, target_text, known_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($4)`,
    [COURSE, SEED, LEGO_ID, CHANGES.map(c => `${COURSE}:${c.id}`)]);
  const slots = [];
  for (const r of rows) {
    for (const role of ['target1', 'target2']) if (!r[`${role}_audio_id`]) slots.push({ tbl: r.tbl, id: r.id, role, lang: 'ita', text: r.target_text });
    if (r.tbl !== 'course_seeds' && !r.known_audio_id) slots.push({ tbl: r.tbl, id: r.id, role: 'known', lang: 'eng', text: r.known_text });
  }
  const idCol = (tbl) => tbl === 'course_seeds' ? 'seed_number' : tbl === 'course_legos' ? 'lego_id' : 'id';
  const textCol = (slot) => slot.role === 'known' ? 'known_text' : 'target_text';
  const link = async (slot, audioId) => (await pg.query(`UPDATE ${slot.tbl} SET ${slot.role}_audio_id=$1 WHERE course_code=$2 AND ${idCol(slot.tbl)}=$3 AND ${textCol(slot)}=$4 AND ${slot.role}_audio_id IS NULL`, [audioId, COURSE, slot.tbl === 'course_seeds' ? Number(slot.id) : slot.id, slot.text])).rowCount === 1;
  const current = async (slot) => (await pg.query(`SELECT ${slot.role}_audio_id AS id FROM ${slot.tbl} WHERE course_code=$1 AND ${idCol(slot.tbl)}=$2`, [COURSE, slot.tbl === 'course_seeds' ? Number(slot.id) : slot.id])).rows[0]?.id || null;
  for (const slot of slots) {
    const entry = { ...slot }; log.audio.push(entry);
    const voiceIds = slot.role === 'known' ? SONIA_IDS : AZURE_VOICE_IDS[slot.role];
    const { rows: have } = await pg.query(`SELECT id, voice_id, course_code FROM course_audio WHERE language=$5 AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND voice_id = ANY($2) ORDER BY (course_code=$3) DESC, (role=$4) DESC, created_at DESC LIMIT 1`, [slot.text, voiceIds, COURSE, slot.role, slot.lang]);
    if (have[0]) {
      const already = await current(slot);
      entry.result = `linked existing ${have[0].voice_id} clip ${have[0].id}`;
      entry.linked = already ? (already === have[0].id || `slot already holds ${already}`) : await link(slot, have[0].id);
      continue;
    }
    if (slot.role === 'known') { entry.result = 'NO Sonia clip exists — left NULL for ita-sonia-temporary-fill (SCOPE=course)'; continue; }
    entry.result = await renderItalian(pg, supabase, slot, link, current);
    entry.linked = (await current(slot)) !== null;
  }
}
async function renderItalian(pg, supabase, slot, link, current) {
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
    const now = await current(slot);
    if (!now) await link(slot, out.audioId);
    return `rendered ${voice.voiceName} clip ${out.audioId} (${gated.durationMs} ms)`;
  } catch (e) { return `REFUSED/FAILED: ${e.message}`; }
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, ruling: RULING, apply: APPLY, started: new Date().toISOString(), problems: [], zut: [], residueBefore: [], residueAfter: null, audio: [] };
  console.log(`\n══ ${COURSE} seed ${SEED} → sarei — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  if (!personAgrees(NEW_SEED) || !personAgrees(NEW_LEGO)) log.problems.push('new seed/LEGO do not agree in person');
  if (!legosBracketSeed(NEW_SEED, NEW_LEGO)) log.problems.push('L01 does not open / L02 does not close the new seed');
  if (!componentsTileLego(NEW_LEGO)) log.problems.push('L01 components do not tile the LEGO');
  if (!presentationMirrorsLego(PRESENTATION.text, NEW_LEGO)) log.problems.push('presentation line does not mirror the LEGO');
  const live = await guardLive(pg); log.problems.push(...live.problems);
  if (!live.problems.length) {
    for (const p of await seedPhrases(pg)) {
      if (!personAgrees(p)) log.problems.push(`${p.id} "${p.known}" → "${p.target}" disagrees in person`);
      if (p.lego_index === 1 && p.role !== 'component' && !phraseContainsLego(p)) log.problems.push(`${p.id} "${p.known}" → "${p.target}" does not contain the LEGO on both sides`);
    }
    log.zut = await zutAgainstCourse(pg); log.problems.push(...log.zut);
    log.residueBefore = await residue(pg);
    console.log(`rows still carrying "sarebbe stato felice" / linked to a clip saying it (expected: seed, L01, C01 and their links): ${log.residueBefore.length}`);
    for (const r of log.residueBefore) console.log(`  ${r.kind.padEnd(34)} ${String(r.id).padEnd(26)} "${r.text}"`);
  }
  console.log(log.problems.length ? 'PROBLEMS:\n  ' + log.problems.join('\n  ') : 'rules hold: person agrees everywhere, L01 opens and L02 closes the seed, components tile L01, every L01 phrase contains it, presentation mirrors it, no ZUT clash');
  console.log(`  seed   "${NEW_SEED.known}" → "${NEW_SEED.target}"`);
  console.log(`  L01    "${NEW_LEGO.known}" → "${NEW_LEGO.target}"  components ${NEW_LEGO.components.map(c => `${c.known}→${c.target}`).join(' | ')}`);
  for (const c of CHANGES) console.log(`  ${c.id}  "${c.after.known}" → "${c.after.target}"`);
  if (APPLY && !log.problems.length) {
    await applyContent(pg, supabase, log); console.log(`APPLIED. events=${JSON.stringify(log.events)}; presentation=${JSON.stringify(log.presentation)}; course_round_index refreshed`);
    await fillAudio(pg, supabase, log);
    console.log('AUDIO:'); for (const a of log.audio) console.log(`  ${a.tbl}.${a.id} ${a.role} "${a.text}": ${a.result}${a.linked === true ? ' → linked' : a.linked ? ` (${a.linked})` : ''}`);
    log.residueAfter = await residue(pg);
    console.log(`residue after: ${log.residueAfter.length}`); for (const r of log.residueAfter) console.log(`  ${r.kind} ${r.id} "${r.text}"`);
    if (log.residueAfter.length) log.problems.push(`${log.residueAfter.length} residue rows after apply`);
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end(); process.exit(log.problems.length ? 2 : 0);
}
module.exports = { OLD_SEED, NEW_SEED, OLD_LEGO, NEW_LEGO, CHANGES, PRESENTATION, personAgrees, legosBracketSeed, componentsTileLego, phraseContainsLego, presentationMirrorsLego };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
