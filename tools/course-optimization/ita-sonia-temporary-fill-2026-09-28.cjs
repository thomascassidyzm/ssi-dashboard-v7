#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs
//
// ita_for_eng — fill the silent English PROMPT slots on Azure Sonia under a TEMPORARY cast.
//
// Kai's approval, 2026-09-28 (job #522): "TEMPORARILY cast Azure Sonia for English on ita_for_eng.
// Use her to generate every missing English clip … Then RESTORE the English cast to Cartesia
// Charlotte, exactly as it was. Record the before state first, and verify it has been restored.
// Do not call Cartesia at all." Extended the same day to the 137 slots job #520·I left silent
// (d/65806cce), leaving its 24 intro texts alone: intros belong to the male intro voice.
//
// The cast is per LANGUAGE (voice_language_roles; services/shared/voice-cast-gate.cjs), so the
// window is kept as short as the batch: every run of this tool (1) snapshots the eng rows,
// (2) inserts ONE row — slot known / eng / f / rank 1 / en-GB-SoniaNeural — (3) fills up to
// BATCH slots through the one TTS door (voiceBound: only an existing SONIA clip answers, else
// Azure renders; the spend guard and the cast gate stand in front of every render), (4) deletes
// that one row in a finally block, re-reads the eng rows and refuses to exit 0 unless they are
// byte-identical to the snapshot. Only known_audio_id slots are touched — presentation
// (intro) slots are never in scope. Nothing is deleted; clips already linked are never replaced.
//
// SCOPE (default) = NULL known slots in: seed 519 (this job), the three rows #519·I left silent
// (S0642L01U03, S0642L01U04, S0208L01U02), and every seed job #520·I edited
// (content_edit_events, 2026-09-28: 47 72 114 115 118 119 151 152 185 204 261 281 291 292 346
// 419 497 506 508 526 597 598 655 668). Other silent English slots in the course are OUT of
// scope and are counted in the evidence file, never filled.
//
// SCOPE=course (Kai, 2026-09-28, job #529: "fill the 43 silent English prompt slots elsewhere in
// ita_for_eng, plus any Job 1 creates") = EVERY NULL known slot in the course, phrases and legos,
// grouped 'course'. Presentation (intro) slots stay out of scope in both modes.
//
//   node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs             # dry run: scope + cast snapshot, no cast change
//   APPLY=1 BATCH=50 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs   # one batch, cast restored at the end
//   SCOPE=course APPLY=1 BATCH=50 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs   # whole course
//   SCOPE=ids IDS=ita_for_eng:S0544L02U01,… APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs   # named rows only

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-sonia-temporary-fill-2026-09-28';
const RULING = 'Kai, 2026-09-28 (job #522): temporary Sonia cast for English on ita_for_eng to fill the silent prompt slots; cast restored to Charlotte exactly as it was';
const SONIA = { voiceId: 'azure_en-GB-SoniaNeural', castVoiceId: 'en-GB-SoniaNeural', voiceName: 'en-GB-SoniaNeural' };
const SONIA_IDS = ['azure_en-GB-SoniaNeural', 'en-GB-SoniaNeural'];
const TEMP_ROW = { slot: 'known', language: 'eng', gender: 'f', rank: 1, voice_id: SONIA.castVoiceId };
const SEEDS_520 = [47, 72, 114, 115, 118, 119, 151, 152, 185, 204, 261, 281, 291, 292, 346, 419, 497, 506, 508, 526, 597, 598, 655, 668];
const ROWS_519I = ['ita_for_eng:S0642L01U03', 'ita_for_eng:S0642L01U04', 'ita_for_eng:S0208L01U02'];

const castKey = (r) => `${r.slot}|${r.language}|${r.gender}|${r.rank}|${r.voice_id}|${r.notes ?? ''}|${r.assigned_by ?? ''}|${r.created_at?.toISOString?.() ?? r.created_at}|${r.updated_at?.toISOString?.() ?? r.updated_at}`;
async function engCast(pg) {
  const { rows } = await pg.query(`SELECT slot, language, gender, rank, voice_id, notes, assigned_by, created_at, updated_at FROM voice_language_roles WHERE language='eng' ORDER BY slot, gender, rank, voice_id`);
  return rows;
}
const sameCast = (a, b) => a.length === b.length && a.every((r, i) => castKey(r) === castKey(b[i]));

async function scope(pg) {
  if (process.env.SCOPE === 'ids') {
    // SCOPE=ids IDS=<comma list of phrase ids / lego ids> (job #546·I): fill ONLY the named rows, so a
    // pass running beside other jobs never sweeps up slots they are about to fill themselves.
    const ids = String(process.env.IDS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!ids.length) throw new Error('SCOPE=ids needs IDS=<comma list>');
    const { rows } = await pg.query(
      `SELECT 'course_practice_phrases' AS tbl, id, seed_number, known_text, 'ids' AS grp FROM course_practice_phrases WHERE course_code=$1 AND known_audio_id IS NULL AND known_text IS NOT NULL AND id = ANY($2)
       UNION ALL SELECT 'course_legos', lego_id, seed_number, known_text, 'ids' FROM course_legos WHERE course_code=$1 AND known_audio_id IS NULL AND known_text IS NOT NULL AND lego_id = ANY($2)
       ORDER BY 3, 2`, [COURSE, ids]);
    return { slots: rows, outOfScope: { phrases: 0, legos: 0 } };
  }
  if (process.env.SCOPE === 'course') {
    const { rows } = await pg.query(
      `SELECT 'course_practice_phrases' AS tbl, id, seed_number, known_text, 'course' AS grp FROM course_practice_phrases WHERE course_code=$1 AND known_audio_id IS NULL AND known_text IS NOT NULL
       UNION ALL SELECT 'course_legos', lego_id, seed_number, known_text, 'course' FROM course_legos WHERE course_code=$1 AND known_audio_id IS NULL AND known_text IS NOT NULL
       ORDER BY 3, 2`, [COURSE]);
    return { slots: rows, outOfScope: { phrases: 0, legos: 0 } };
  }
  const { rows } = await pg.query(
    `SELECT 'course_practice_phrases' AS tbl, id, seed_number, known_text,
            CASE WHEN seed_number=519 THEN '519' WHEN id = ANY($2) THEN '519I' ELSE '520' END AS grp
       FROM course_practice_phrases WHERE course_code=$1 AND known_audio_id IS NULL AND known_text IS NOT NULL AND (seed_number=519 OR id = ANY($2) OR seed_number = ANY($3))
     UNION ALL
     SELECT 'course_legos', lego_id, seed_number, known_text, CASE WHEN seed_number=519 THEN '519' ELSE '520' END
       FROM course_legos WHERE course_code=$1 AND known_audio_id IS NULL AND known_text IS NOT NULL AND (seed_number=519 OR seed_number = ANY($3))
     ORDER BY 3, 2`, [COURSE, ROWS_519I, SEEDS_520]);
  const { rows: [out] } = await pg.query(
    `SELECT (SELECT count(*) FROM course_practice_phrases WHERE course_code=$1 AND known_audio_id IS NULL AND NOT (seed_number=519 OR id = ANY($2) OR seed_number = ANY($3))) AS phrases,
            (SELECT count(*) FROM course_legos WHERE course_code=$1 AND known_audio_id IS NULL AND NOT (seed_number=519 OR seed_number = ANY($3))) AS legos`, [COURSE, ROWS_519I, SEEDS_520]);
  return { slots: rows, outOfScope: { phrases: Number(out.phrases), legos: Number(out.legos) } };
}

async function fill(pg, supabase, slots, log) {
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
  const masterOpts = await voiceConfigService.masteringOptsFor(SONIA.voiceName, 'azure');

  for (const slot of slots) {
    const entry = { id: slot.id, tbl: slot.tbl, seed: slot.seed_number, grp: slot.grp, text: slot.known_text };
    log.filled.push(entry);
    const idCol = slot.tbl === 'course_legos' ? 'lego_id' : 'id';
    try {
      // An existing Sonia clip anywhere answers first (voiceBound: never another voice).
      const { rows: have } = await pg.query(
        `SELECT id, course_code FROM course_audio WHERE language='eng' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND voice_id = ANY($2) ORDER BY (course_code=$3) DESC, created_at DESC LIMIT 1`,
        [slot.known_text, SONIA_IDS, COURSE]);
      let audioId = have[0]?.id;
      if (audioId) entry.result = `linked existing Sonia clip ${audioId} (${have[0].course_code})`;
      else {
        const renderAndMaster = async () => {
          const out = await ttsService.generateWithRetry(slot.known_text, 'azure', {
            door: { courseCode: COURSE, intro: false, language: 'eng', voiceBound: true },
            subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope', voiceName: SONIA.voiceName, speed: 1,
          });
          if (out.existingClip && !SONIA_IDS.includes(out.existingClip.voice_id)) throw new Error(`door offered a ${out.existingClip.voice_id} clip; Sonia only`);
          const { buffer, durationMs } = await phase8.masterAudio(out.audioBuffer, slot.known_text, masterOpts);
          return { buffer, durationMs, wordBoundaries: out.wordBoundaries };
        };
        const gated = await veracity.renderChecked({ render: renderAndMaster, expectedText: slot.known_text, language: 'eng', sampler: veracity.ALWAYS_SAMPLER, logger,
          meta: { courseCode: COURSE, role: 'known', voiceId: SONIA.voiceName, phrase_id: slot.id, originalText: slot.known_text } });
        if (!gated.published) throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason})`);
        const newAudioId = uuidv4().toUpperCase();
        const newS3Key = `mastered/${newAudioId}.mp3`;
        await s3.send(new PutObjectCommand({ Bucket: phase8.S3_BUCKET, Key: newS3Key, Body: gated.buffer, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
        const verdictColumns = veracity.verdictColumns(gated.verdict, { checker: SWEEP, attempts: gated.attempts });
        const textNormalized = normalizeForAudio(slot.known_text);
        const base = { course_code: COURSE, text: slot.known_text, text_normalized: textNormalized, language: 'eng', role: 'known', voice_id: SONIA.voiceId, origin: 'tts' };
        const out = await writeOrSwapClip({ supabase,
          identity: { course_code: COURSE, text_normalized: textNormalized, language: 'eng', role: 'known', voice_id: SONIA.voiceId },
          insertRow: { ...base, s3_key: newS3Key, duration_ms: gated.durationMs, word_boundaries: gated.wordBoundaries || null, ...verdictColumns },
          swapPatch: { voice_id: SONIA.voiceId, origin: 'tts', word_boundaries: gated.wordBoundaries || null, text: slot.known_text, ...verdictColumns },
          newS3Key, durationMs: gated.durationMs, source: SWEEP, acceptedBy: `${SWEEP} (known, Sonia, temporary cast)`, reason: RULING, logger });
        audioId = out.audioId;
        entry.result = `rendered Sonia clip ${audioId} (${gated.durationMs} ms)`;
      }
      // link_audio_to_content (AFTER INSERT ON course_audio) usually fills the empty slot the
      // moment the clip row lands, so the UPDATE below often finds it already linked. What is
      // verified is the outcome: the slot now holds THIS clip (or another Sonia clip).
      await pg.query(`UPDATE ${slot.tbl} SET known_audio_id=$1 WHERE course_code=$2 AND ${idCol}=$3 AND known_text=$4 AND known_audio_id IS NULL`, [audioId, COURSE, slot.id, slot.known_text]);
      const { rows: [now] } = await pg.query(`SELECT a.id, a.voice_id FROM ${slot.tbl} x LEFT JOIN course_audio a ON a.id=x.known_audio_id WHERE x.course_code=$1 AND x.${idCol}=$2`, [COURSE, slot.id]);
      entry.audioId = now?.id || null;
      entry.linked = !!now?.id && SONIA_IDS.includes(now.voice_id);
      if (!entry.linked) entry.result += ` — NOT linked (slot holds ${now?.voice_id || 'nothing'})`;
    } catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; }
    console.log(`  ${slot.id} "${slot.known_text}": ${entry.result}${entry.linked ? ' → linked' : ''}`);
  }
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const BATCH = Number(process.env.BATCH || 50);
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const log = { sweep: SWEEP, ruling: RULING, apply: APPLY, started: new Date().toISOString(), castBefore: null, castAfter: null, castRestored: null, filled: [], outOfScope: null };

  log.castBefore = await engCast(pg);
  console.log(`\n══ ${COURSE}: Sonia temporary fill — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  console.log('English cast BEFORE:');
  for (const r of log.castBefore) console.log(`  ${r.slot}/${r.gender}/${r.rank}  ${r.voice_id}`);
  if (log.castBefore.some(r => SONIA_IDS.includes(r.voice_id))) throw new Error('Sonia is already in the English cast — a previous run did not restore it. Fix that first.');

  const { slots, outOfScope } = await scope(pg);
  log.outOfScope = outOfScope;
  const counts = slots.reduce((m, s) => ({ ...m, [s.grp]: (m[s.grp] || 0) + 1 }), {});
  console.log(`scope: ${slots.length} empty English prompt slots (${JSON.stringify(counts)}); out of scope and left alone: ${outOfScope.phrases} phrases + ${outOfScope.legos} legos elsewhere in the course`);
  const batch = slots.slice(0, BATCH);
  if (!APPLY) { for (const s of batch) console.log(`  would fill ${s.id} "${s.known_text}"`); }
  else {
    let castRowInserted = false;
    try {
      await pg.query(`INSERT INTO voice_language_roles (slot, language, gender, rank, voice_id, notes, assigned_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [TEMP_ROW.slot, TEMP_ROW.language, TEMP_ROW.gender, TEMP_ROW.rank, TEMP_ROW.voice_id, `TEMPORARY — ${RULING}. Removed by the same run.`, SWEEP]);
      castRowInserted = true;
      console.log(`cast: Sonia added as ${TEMP_ROW.slot}/${TEMP_ROW.gender}/${TEMP_ROW.rank} for eng (temporary)`);
      console.log(`filling ${batch.length} of ${slots.length} slots:`);
      await fill(pg, supabase, batch, log);
    } finally {
      if (castRowInserted) {
        const d = await pg.query(`DELETE FROM voice_language_roles WHERE slot=$1 AND language=$2 AND gender=$3 AND rank=$4 AND voice_id=$5 AND assigned_by=$6`,
          [TEMP_ROW.slot, TEMP_ROW.language, TEMP_ROW.gender, TEMP_ROW.rank, TEMP_ROW.voice_id, SWEEP]);
        console.log(`cast: temporary Sonia row removed (${d.rowCount} row)`);
      }
      log.castAfter = await engCast(pg);
      log.castRestored = sameCast(log.castBefore, log.castAfter);
      console.log(`English cast AFTER is ${log.castRestored ? 'BYTE-IDENTICAL to the snapshot — RESTORED' : 'NOT identical to the snapshot — NOT RESTORED, fix by hand'}`);
      if (!log.castRestored) { console.log(JSON.stringify({ before: log.castBefore, after: log.castAfter }, null, 1)); }
    }
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${stamp}.json`);
  fs.writeFileSync(f, JSON.stringify(log, null, 2));
  console.log(`remaining after this batch: ${Math.max(0, slots.length - (APPLY ? batch.length : 0))}; wrote ${f}`);
  await pg.end();
  process.exit(APPLY && !log.castRestored ? 3 : 0);
}

module.exports = { sameCast, castKey, TEMP_ROW, SEEDS_520, ROWS_519I };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
