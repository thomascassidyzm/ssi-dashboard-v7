#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-intro-mirror-fix-2026-09-28.cjs
//
// ita_for_eng — make every introduction mirror the LEGO it introduces (Kai's ruling, 2026-09-28,
// job #557·I). The check is services/shared/intro-mirror.cjs / tools/check-intro-mirror.cjs; this
// is the repair for one course, and it ends by running that check over the seeds it touched.
//
// WHAT IT DOES, per row the check reports:
//   LEGO whose intro quotes the wrong chunk or a context that no longer shows it
//     → the line is re-authored from the course's live template under its PRIOR frame
//       (intro-mirror expectedLine: Frame B keeps its old demonstration sentence when that still
//       contains the new chunk, else the seed sentence, else Frame A); an existing RENDERED
//       Sonia clip with that exact text in this course is linked, otherwise one is RENDERED on
//       Azure Sonia (below); the new clip is linked at all three places the learner path reads
//       (course_legos.presentation_audio_id, lego_introductions, course_audio.lego_id); the old
//       link is recorded in content_audio_link_drops and its clip is KEPT (never deleted).
//   LEGO that is is_new with no intro (silent) → the same, with the pending placeholder row's
//       text as the prior line when one exists (it carries the frame the earlier job chose).
//       A pending placeholder row (s3_key 'pending/…', no bytes) that this run supersedes is
//       deleted: it is not a generated asset, and phase8 would otherwise render it in the cast
//       intro voice (Tom's clone) and re-bind over the Sonia clip.
//   Guarded (human-authored) LEGO whose line no longer mirrors → LISTED, never rewritten.
//   Component with a stale intro link → UNLINKED (components are never introduced, Tom
//       2026-08-06; the trigger refuses a new binding and cycles.ts never plays them). Logged in
//       content_audio_link_drops; the clip is kept.
//   lego_introductions row that disagrees with a mirroring course_legos link → made to agree.
//   Stale clip still keyed to a LEGO by course_audio.lego_id → lego_id cleared (phase8 counts a
//       keyed clip as "has an intro" and would never author a replacement).
//
// VOICE. New English intro lines render on AZURE SONIA (Kai, 2026-09-28: "as the temporary
// English route #529·I used — not Cartesia"). The one TTS door gates every render on the
// LANGUAGE cast (voice_language_roles), and English's cast is Charlotte / Tom's clone / Aran's
// clone — Sonia is refused with a 403. `--probe-door` prints that refusal verbatim. The
// sanctioned route is the one #522/#529 used with Kai's approval: (1) snapshot the eng cast rows,
// (2) insert ONE temporary row (presentation / eng / f / rank 1 / en-GB-SoniaNeural), (3) render,
// (4) delete that one row in a finally block and refuse to exit 0 unless the cast is
// byte-identical to the snapshot. Every clip rendered here joins the Charlotte re-voice list
// (`--revoice-list` prints it live from the DB: every ita_for_eng slot holding a Sonia clip made
// since Charlotte became the English cast on 2026-09-23).
//
// CONCURRENCY. `--exclude-actor <actor_label>` (repeatable) leaves alone every seed that actor's
// content_edit_events name — used while jobs #543·I / #546·I are still editing; the final pass
// runs with no exclusions.
//
// NOTHING HERE CHANGES SEED, LEGO OR PHRASE TEXT, so no seed is unapproved (Kai: intro-only
// mirroring does not change seed content). The LEGOs whose intro changed are listed in the
// evidence file and the published report instead.
//
//   node tools/course-optimization/ita-intro-mirror-fix-2026-09-28.cjs                    # plan (dry run, no writes)
//   node tools/course-optimization/ita-intro-mirror-fix-2026-09-28.cjs --probe-door       # show the door's refusal of Sonia, no cast change
//   APPLY=1 node tools/course-optimization/ita-intro-mirror-fix-2026-09-28.cjs [--exclude-actor X]
//   node tools/course-optimization/ita-intro-mirror-fix-2026-09-28.cjs --revoice-list     # the Charlotte re-voice list, live
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const JOB = '#557·I';
const SWEEP = 'ita-intro-mirror-fix-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = `Kai, 2026-09-28 (job ${JOB}): every ita_for_eng introduction quotes its current LEGO; new English intro lines on Azure Sonia (temporary cast row, restored byte for byte), every Sonia line on the Charlotte re-voice list; stale component intro links dropped (components are never introduced); no seed unapproved for an intro-only change`;
const SONIA = { voiceId: 'azure_en-GB-SoniaNeural', castVoiceId: 'en-GB-SoniaNeural', voiceName: 'en-GB-SoniaNeural' };
const SONIA_IDS = ['azure_en-GB-SoniaNeural', 'en-GB-SoniaNeural'];
const TEMP_ROW = { slot: 'presentation', language: 'eng', gender: 'f', rank: 1, voice_id: SONIA.castVoiceId };
const CHARLOTTE_CAST_DATE = '2026-09-23';

const realLog = console.log; console.log = () => {};
const mirror = require('../../services/shared/intro-mirror.cjs');
const { renderIntro, localisedLangName } = require('../../services/phases/presentation-author.cjs');
console.log = realLog;

const castKey = (r) => `${r.slot}|${r.language}|${r.gender}|${r.rank}|${r.voice_id}|${r.notes ?? ''}|${r.assigned_by ?? ''}|${r.created_at?.toISOString?.() ?? r.created_at}|${r.updated_at?.toISOString?.() ?? r.updated_at}`;
async function engCast(pg) {
  const { rows } = await pg.query(`SELECT slot, language, gender, rank, voice_id, notes, assigned_by, created_at, updated_at FROM voice_language_roles WHERE language='eng' ORDER BY slot, gender, rank, voice_id`);
  return rows;
}
const sameCast = (a, b) => a.length === b.length && a.every((r, i) => castKey(r) === castKey(b[i]));
function args() { const a = process.argv.slice(2); return { has: (n) => a.includes(n), all: (n) => a.flatMap((x, i) => x === n ? [a[i + 1]] : []) }; }

/** Seeds named by these actors' edit events (the jobs still running beside this one). */
async function excludedSeeds(pg, actors) {
  if (!actors.length) return new Set();
  const { rows } = await pg.query(`SELECT scope FROM content_edit_events WHERE course_code=$1 AND actor_label = ANY($2)`, [COURSE, actors]);
  const out = new Set();
  for (const r of rows) {
    for (const s of (r.scope?.seed_numbers || [])) out.add(Number(s));
    for (const id of (r.scope?.lego_ids || [])) { const m = /^S(\d{4})/.exec(id); if (m) out.add(Number(m[1])); }
    for (const id of (r.scope?.phrase_ids || [])) { const m = /S(\d{4})L\d{2}/.exec(id); if (m) out.add(Number(m[1])); }
  }
  return out;
}

/** The plan: one decision per row the check reports. Pure given the census + the extra reads. */
async function plan(pg) {
  const census = await mirror.checkCourse(pg, COURSE);
  const { rows: [tpl] } = await pg.query(`SELECT template FROM presentation_templates WHERE known_lang='eng' AND is_active ORDER BY priority DESC LIMIT 1`);
  const template = tpl.template;
  const targetLangName = localisedLangName('ita', 'eng');
  const compiled = mirror.compileTemplate(template, { knownLang: 'eng' });
  const { rows: pending } = await pg.query(`SELECT id, lego_id, text, voice_id FROM course_audio WHERE course_code=$1 AND role='presentation' AND lego_id IS NOT NULL AND s3_key LIKE 'pending/%'`, [COURSE]);
  const pendingByLego = new Map();
  for (const p of pending) { if (!pendingByLego.has(p.lego_id)) pendingByLego.set(p.lego_id, []); pendingByLego.get(p.lego_id).push(p); }
  const { rows: rendered } = await pg.query(`SELECT id, text, text_normalized, voice_id, lego_id FROM course_audio WHERE course_code=$1 AND role='presentation' AND language='eng' AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($2)`, [COURSE, SONIA_IDS]);
  const renderedByNorm = new Map();
  for (const r of rendered) if (!renderedByNorm.has(r.text_normalized)) renderedByNorm.set(r.text_normalized, r);
  const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs');

  const items = [];
  for (const row of census.rows) {
    if (row.kind === 'lego') {
      const stale = row.keyed_stale || [];
      const liDiverges = row.reasons.includes('lego_introductions-diverges');
      if (row.status === 'mismatch' && row.guarded) { items.push({ ...row, action: 'list-guarded' }); continue; }
      if (row.status === 'mismatch' || (row.status === 'silent' && row.is_new)) {
        const prior = row.intro || pendingByLego.get(row.id)?.[0]?.text || row.li_text || null;
        const e = mirror.expectedLine({ template, targetLangName, knownText: row.known, priorText: prior, compiled, contextText: row.seed_known || null });
        const norm = normalizeForAudio(e.text);
        const have = renderedByNorm.get(norm) || null;
        items.push({ ...row, action: 'reauthor', newText: e.text, frame: e.frame, prior, reuse: have ? have.id : null, pendingRows: (pendingByLego.get(row.id) || []).map(p => ({ id: p.id, voice_id: p.voice_id, text: p.text })), keyedStale: stale.map(k => k.id) });
        continue;
      }
      if (row.status === 'mirror' && (liDiverges || stale.length)) {
        items.push({ ...row, action: 'align-secondary', keyedStale: stale.map(k => k.id) });
      }
      continue;
    }
    if (row.kind === 'component' && row.status === 'mismatch') items.push({ ...row, action: 'unlink-component' });
  }
  // Every planned line must mirror under the check's own verdict before it is written.
  for (const it of items.filter(i => i.action === 'reauthor')) {
    const v = mirror.verdict({ introText: it.newText, knownText: it.known, compiled });
    if (v.status !== 'mirror') throw new Error(`planned line for ${it.id} does not mirror: "${it.newText}" (${v.reasons})`);
    if (it.newText.includes('{')) throw new Error(`unfilled slot in planned line for ${it.id}`);
  }
  return { census, items, template, targetLangName };
}

async function render(pg, supabase, text, log) {
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
  const masterOpts = await voiceConfigService.masteringOptsFor(SONIA.voiceName, 'azure');
  const renderAndMaster = async () => {
    const out = await ttsService.generateWithRetry(text, 'azure', {
      door: { courseCode: COURSE, intro: true, language: 'eng', voiceBound: true },
      subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope', voiceName: SONIA.voiceName, speed: 1,
    });
    if (out.existingClip && !SONIA_IDS.includes(out.existingClip.voice_id)) throw new Error(`door offered a ${out.existingClip.voice_id} clip; Sonia only`);
    const { buffer, durationMs } = await phase8.masterAudio(out.audioBuffer, text, masterOpts);
    return { buffer, durationMs, wordBoundaries: out.wordBoundaries };
  };
  const gated = await veracity.renderChecked({ render: renderAndMaster, expectedText: text, language: 'eng', sampler: veracity.ALWAYS_SAMPLER, logger: console,
    meta: { courseCode: COURSE, role: 'presentation', voiceId: SONIA.voiceName, originalText: text } });
  if (!gated.published) throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason})`);
  const newAudioId = uuidv4().toUpperCase();
  const newS3Key = `mastered/${newAudioId}.mp3`;
  await s3.send(new PutObjectCommand({ Bucket: phase8.S3_BUCKET, Key: newS3Key, Body: gated.buffer, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
  const verdictColumns = veracity.verdictColumns(gated.verdict, { checker: SWEEP, attempts: gated.attempts });
  const textNormalized = normalizeForAudio(text);
  const base = { course_code: COURSE, text, text_normalized: textNormalized, language: 'eng', role: 'presentation', voice_id: SONIA.voiceId, origin: 'tts' };
  const out = await writeOrSwapClip({ supabase,
    identity: { course_code: COURSE, text_normalized: textNormalized, language: 'eng', role: 'presentation', voice_id: SONIA.voiceId },
    insertRow: { ...base, s3_key: newS3Key, duration_ms: gated.durationMs, word_boundaries: gated.wordBoundaries || null, ...verdictColumns },
    swapPatch: { voice_id: SONIA.voiceId, origin: 'tts', word_boundaries: gated.wordBoundaries || null, text, ...verdictColumns },
    newS3Key, durationMs: gated.durationMs, source: SWEEP, acceptedBy: `${SWEEP} (presentation, Sonia, temporary cast)`, reason: RULING, logger: console });
  log.chars += text.length;
  return { audioId: out.audioId, durationMs: gated.durationMs };
}

async function dropLink(pg, { table, rowId, seed, column, oldId, newId, oldText, newText, reason }) {
  await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, new_audio_id, old_text, new_text, reason) VALUES ($1,$2,$3,$4,$5,'presentation',$6,$7,$8,$9,$10)`,
    [table, rowId, COURSE, seed, column, oldId || null, newId || null, oldText || null, newText || null, reason]);
}

async function linkLego(pg, it, audioId, durationMs, eventId, log) {
  // course_legos: a writer-set link with no text change — the text-change trigger leaves it alone.
  const r = await pg.query(`UPDATE course_legos SET presentation_audio_id=$1, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND lego_id=$4 AND known_text=$5 AND presentation_audio_id IS NOT DISTINCT FROM $6`,
    [audioId, eventId, COURSE, it.id, it.known, it.link || null]);
  if (r.rowCount !== 1) throw new Error(`${it.id}: LEGO moved under the plan (known_text or link changed) — not linked`);
  if (it.link && it.link !== audioId) await dropLink(pg, { table: 'course_legos', rowId: it.id, seed: it.seed, column: 'presentation_audio_id', oldId: it.link, newId: audioId, oldText: it.intro, newText: it.newText, reason: `${SWEEP}: intro re-authored to mirror the LEGO (job ${JOB}, event ${eventId}); old clip kept` });
  await pg.query(`INSERT INTO lego_introductions (course_code, lego_id, presentation_audio_id, audio_uuid, duration_ms, updated_at) VALUES ($1,$2,$3,$3,$4,now()) ON CONFLICT (course_code, lego_id) DO UPDATE SET presentation_audio_id=EXCLUDED.presentation_audio_id, audio_uuid=EXCLUDED.audio_uuid, duration_ms=COALESCE(EXCLUDED.duration_ms, lego_introductions.duration_ms), updated_at=now()`,
    [COURSE, it.id, audioId, durationMs || null]);
  await pg.query(`UPDATE course_audio SET lego_id=$1 WHERE id=$2 AND (lego_id IS NULL OR lego_id<>$1)`, [it.id, audioId]);
  // Stale clips keyed to this LEGO (phase8 would count them as "has an intro"): re-key, keep.
  for (const staleId of (it.keyedStale || [])) {
    if (staleId === audioId) continue;
    await pg.query(`UPDATE course_audio SET lego_id=NULL WHERE id=$1 AND lego_id=$2`, [staleId, it.id]);
    await dropLink(pg, { table: 'course_audio', rowId: staleId, seed: it.seed, column: 'lego_id', oldId: staleId, newId: audioId, reason: `${SWEEP}: stale clip un-keyed from ${it.id} (its text no longer mirrors the LEGO); clip kept (job ${JOB})` });
  }
  if (it.link && it.link !== audioId) {
    await pg.query(`UPDATE course_audio SET lego_id=NULL WHERE id=$1 AND lego_id=$2`, [it.link, it.id]);
  }
  // Pending placeholders this clip supersedes: no bytes, not an asset; phase8 would render them in
  // the cast intro voice and re-bind over this link.
  for (const p of (it.pendingRows || [])) {
    if (p.id === audioId) continue;
    const d = await pg.query(`DELETE FROM course_audio WHERE id=$1 AND s3_key LIKE 'pending/%' AND lego_id=$2`, [p.id, it.id]);
    if (d.rowCount) log.pendingDeleted.push({ id: p.id, lego: it.id, voice_id: p.voice_id, text: p.text });
  }
}

async function apply(pg, supabase, P, opts, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP);
  const items = P.items.filter(i => !opts.excluded.has(i.seed));
  const toRender = items.filter(i => i.action === 'reauthor');
  const seeds = [...new Set(items.map(i => i.seed))].sort((a, b) => a - b);
  const eventId = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'intro-relink', scope: { seed_numbers: seeds, lego_ids: toRender.map(i => i.id), rows: items.length },
    detail: { job: JOB, ruling: RULING, reauthor: toRender.length, unlinkComponents: items.filter(i => i.action === 'unlink-component').length, excludedSeeds: [...opts.excluded].sort((a, b) => a - b), excludedActors: opts.actors } });
  log.eventId = eventId;

  log.castBefore = await engCast(pg);
  if (log.castBefore.some(r => SONIA_IDS.includes(r.voice_id))) throw new Error('Sonia is already in the English cast — a previous run did not restore it. Fix that first.');
  let castRowInserted = false;
  try {
    if (toRender.some(i => !i.reuse)) {
      await pg.query(`INSERT INTO voice_language_roles (slot, language, gender, rank, voice_id, notes, assigned_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [TEMP_ROW.slot, TEMP_ROW.language, TEMP_ROW.gender, TEMP_ROW.rank, TEMP_ROW.voice_id, `TEMPORARY — ${RULING}. Removed by the same run.`, SWEEP]);
      castRowInserted = true;
      console.log(`cast: Sonia added as ${TEMP_ROW.slot}/${TEMP_ROW.gender}/${TEMP_ROW.rank} for eng (temporary)`);
      const { useCastRows } = require('../../services/shared/voice-cast-gate.cjs'); useCastRows(null); // drop the 60 s cache
    }
    for (const it of toRender) {
      const entry = { id: it.id, seed: it.seed, known: it.known, old: it.intro || (it.prior ? `(pending) ${it.prior}` : null), new: it.newText, frame: it.frame, silentBefore: it.status === 'silent' };
      log.fixed.push(entry);
      try {
        let audioId = it.reuse, durationMs = null;
        if (audioId) entry.result = `linked existing Sonia clip ${audioId}`;
        else { const r = await render(pg, supabase, it.newText, log); audioId = r.audioId; durationMs = r.durationMs; entry.result = `rendered Sonia clip ${audioId} (${durationMs} ms)`; }
        await linkLego(pg, it, audioId, durationMs, eventId, log);
        entry.audioId = audioId; entry.linked = true;
      } catch (e) { entry.result = `FAILED: ${e.message}`; entry.linked = false; }
      console.log(`  ${it.id} "${it.known}": ${entry.result}`);
    }
  } finally {
    if (castRowInserted) {
      await pg.query(`DELETE FROM voice_language_roles WHERE slot=$1 AND language=$2 AND gender=$3 AND rank=$4 AND voice_id=$5 AND assigned_by=$6`, [TEMP_ROW.slot, TEMP_ROW.language, TEMP_ROW.gender, TEMP_ROW.rank, TEMP_ROW.voice_id, SWEEP]);
    }
    log.castAfter = await engCast(pg);
    log.castRestored = sameCast(log.castBefore, log.castAfter);
    console.log(`cast restored byte-identical: ${log.castRestored}`);
  }
  for (const it of items.filter(i => i.action === 'unlink-component')) {
    const r = await pg.query(`UPDATE course_practice_phrases SET presentation_audio_id=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND id=$3 AND presentation_audio_id=$4`, [eventId, COURSE, it.id, it.link]);
    if (r.rowCount === 1) await dropLink(pg, { table: 'course_practice_phrases', rowId: it.id, seed: it.seed, column: 'presentation_audio_id', oldId: it.link, oldText: it.intro, reason: `${SWEEP}: component intro quotes '${mirror.parseIntro(it.intro, mirror.compileTemplate(P.template, { knownLang: 'eng' }))?.known}' not '${it.known}'; components are never introduced (Tom, 2026-08-06) — unlinked, clip kept (job ${JOB})` });
    log.componentsUnlinked.push({ id: it.id, seed: it.seed, known: it.known, intro: it.intro, link: it.link, done: r.rowCount === 1 });
  }
  for (const it of items.filter(i => i.action === 'align-secondary')) {
    if (it.li_link && it.li_link !== it.link) {
      await pg.query(`UPDATE lego_introductions SET presentation_audio_id=$1, audio_uuid=$1, updated_at=now() WHERE course_code=$2 AND lego_id=$3 AND presentation_audio_id=$4`, [it.link, COURSE, it.id, it.li_link]);
      await dropLink(pg, { table: 'lego_introductions', rowId: it.id, seed: it.seed, column: 'presentation_audio_id', oldId: it.li_link, newId: it.link, oldText: it.li_text, newText: it.intro, reason: `${SWEEP}: lego_introductions aligned to the mirroring course_legos link (job ${JOB})` });
      log.secondaryAligned.push({ id: it.id, from: it.li_link, to: it.link });
    }
    for (const staleId of (it.keyedStale || [])) {
      await pg.query(`UPDATE course_audio SET lego_id=NULL WHERE id=$1 AND lego_id=$2`, [staleId, it.id]);
      await dropLink(pg, { table: 'course_audio', rowId: staleId, seed: it.seed, column: 'lego_id', oldId: staleId, newId: it.link, reason: `${SWEEP}: stale clip un-keyed from ${it.id}; clip kept (job ${JOB})` });
      log.secondaryAligned.push({ id: it.id, unkeyed: staleId });
    }
    await pg.query(`UPDATE course_audio SET lego_id=$1 WHERE id=$2 AND lego_id IS NULL`, [it.id, it.link]);
  }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow(COURSE);
}

async function probeDoor() {
  const ttsService = require('../../services/tts-service.cjs');
  const text = "The Italian for: 'I would have been', as in — 'I would have been happy', is:";
  try {
    const out = await ttsService.generateWithRetry(text, 'azure', { door: { courseCode: COURSE, intro: true, language: 'eng', voiceBound: true, dryRun: true }, subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope', voiceName: SONIA.voiceName, speed: 1 });
    console.log(`door did NOT refuse (dry run): ${JSON.stringify({ existingClip: out.existingClip?.id || null, wouldRender: !out.existingClip })}`);
  } catch (e) { console.log(`door refused Sonia for an intro line, verbatim:\n  ${e.message}`); }
}

async function revoiceList(pg) {
  const { rows } = await pg.query(`
    WITH links AS (
      SELECT 'course_seeds' AS tbl, seed_number::text AS row_id, seed_number, 'known' AS slot, known_audio_id AS audio_id, known_text AS text FROM course_seeds WHERE course_code=$1
      UNION ALL SELECT 'course_legos', lego_id, seed_number, 'known', known_audio_id, known_text FROM course_legos WHERE course_code=$1
      UNION ALL SELECT 'course_legos', lego_id, seed_number, 'presentation', CASE WHEN presentation_audio_id ~* '^[0-9a-f-]{36}$' THEN presentation_audio_id::uuid END, NULL FROM course_legos WHERE course_code=$1
      UNION ALL SELECT 'course_practice_phrases', id, seed_number, 'known', known_audio_id, known_text FROM course_practice_phrases WHERE course_code=$1)
    SELECT l.tbl, l.row_id, l.seed_number, l.slot, a.id AS audio_id, a.text, a.created_at::date AS made
      FROM links l JOIN course_audio a ON a.id = l.audio_id
     WHERE a.voice_id = ANY($2) AND a.language='eng' AND a.created_at >= $3::date
     ORDER BY l.seed_number, l.row_id, l.slot`, [COURSE, SONIA_IDS, CHARLOTTE_CAST_DATE]);
  return rows;
}

async function main() {
  const A = args();
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  try {
    if (A.has('--probe-door')) { await probeDoor(); return; }
    if (A.has('--revoice-list')) {
      const rows = await revoiceList(pg);
      console.log(`Charlotte re-voice list — ${COURSE}: ${rows.length} slots holding a Sonia clip made on/after ${CHARLOTTE_CAST_DATE} (English cast became Charlotte)`);
      for (const r of rows) console.log(`  ${r.seed_number} | ${r.row_id} | ${r.slot} | ${r.audio_id} | ${r.made.toISOString().slice(0, 10)} | ${r.text}`);
      const p = evidencePath(`tools/course-optimization/${SWEEP}-revoice-list-${stamp}.json`); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(rows, null, 1)); console.log(`evidence: ${p}`);
      return;
    }
    const actors = A.all('--exclude-actor');
    const excluded = await excludedSeeds(pg, actors);
    const P = await plan(pg);
    const L = P.census.legos, C = P.census.components;
    console.log(`\n══ ${COURSE}: intro mirror fix — ${APPLY ? 'APPLY' : 'PLAN (dry run)'} ══`);
    console.log(`before: legos ${L.with_intro} with intro / ${L.mismatch} mismatch / ${L.new_without_intro} silent new / ${L.guarded} guarded; components ${C.with_intro} with intro / ${C.mismatch} mismatch; li diverge ${L.li_diverges}; keyed stale ${L.keyed_stale}`);
    const by = (a) => P.items.filter(i => i.action === a);
    const held = P.items.filter(i => excluded.has(i.seed));
    console.log(`plan: ${by('reauthor').length} LEGO intros to re-author (${by('reauthor').filter(i => i.reuse).length} link an existing Sonia clip, ${by('reauthor').filter(i => !i.reuse).length} render), ${by('list-guarded').length} guarded to list, ${by('unlink-component').length} component links to drop, ${by('align-secondary').length} secondary links to align; ${held.length} rows HELD (seeds of ${actors.join(', ') || 'nobody'}: ${[...excluded].sort((a, b) => a - b).join(',') || '—'})`);
    for (const it of by('reauthor')) console.log(`  ${excluded.has(it.seed) ? 'HOLD ' : ''}${it.id} "${it.known}"\n      old: ${it.intro || (it.prior ? '(pending) ' + it.prior : '(silent)')}\n      new: ${it.newText}${it.reuse ? `  ← existing ${it.reuse}` : '  ← RENDER'}`);
    for (const it of by('list-guarded')) console.log(`  GUARDED ${it.id} "${it.known}" — human line does not mirror, not rewritten:\n      ${it.intro}`);
    const log = { sweep: SWEEP, job: JOB, ruling: RULING, apply: APPLY, started: new Date().toISOString(), excludedActors: actors, excludedSeeds: [...excluded], before: { legos: L, components: C }, plan: P.items, fixed: [], componentsUnlinked: [], secondaryAligned: [], pendingDeleted: [], chars: 0, castBefore: null, castAfter: null, castRestored: null };
    if (APPLY) {
      await apply(pg, supa(), P, { excluded, actors }, log);
      const after = await mirror.checkCourse(pg, COURSE);
      log.after = { legos: after.legos, components: after.components, mismatches: after.mismatches.map(m => ({ id: m.id, kind: m.kind, seed: m.seed, reasons: m.reasons, guarded: m.guarded })) };
      console.log(`after: legos ${after.legos.with_intro} with intro / ${after.legos.mismatch} mismatch / ${after.legos.new_without_intro} silent new; components ${after.components.mismatch} mismatch; li diverge ${after.legos.li_diverges}; keyed stale ${after.legos.keyed_stale}; Azure chars spent ${log.chars}`);
      if (!log.castRestored) { console.error('CAST NOT RESTORED — refusing to exit 0'); process.exitCode = 2; }
    }
    const p = evidencePath(`tools/course-optimization/${SWEEP}-${APPLY ? 'applied' : 'plan'}-${stamp}.json`);
    fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(log, null, 1));
    console.log(`evidence: ${p}`);
  } finally { await pg.end(); }
}
function supa() { const { createClient } = require('@supabase/supabase-js'); return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } }); }

if (require.main === module) main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { plan, excludedSeeds, revoiceList, TEMP_ROW, SONIA, CHARLOTTE_CAST_DATE };
