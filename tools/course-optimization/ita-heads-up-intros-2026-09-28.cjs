#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-heads-up-intros-2026-09-28.cjs
//
// ita_for_eng — the heads-up presentation line for every LEGO that teaches the "after said/thought"
// pattern (English would+verb = Italian conditional perfect). Kai's update to job #546·I, 2026-09-28,
// in his own template:
//     The Italian for '<LEGO English>' in phrases like '<short clear example>' is:
// The example is short, uses only words taught by that seed (checked live), carries the reporting
// verb, is not the seed sentence verbatim where that is long, and the line quotes the LEGO's English
// in full so it still mirrors the LEGO (the Hindi mirror rule). No grammar terms, no brackets.
//
// Each line is MARKED human-authored (services/shared/human-authored-presentations.cjs) BEFORE any
// course_audio write — the DB trigger trg_guard_human_authored_presentation enforces that order and
// stops any regenerator template-overwriting it afterwards (Kai, 2026-09-21).
//
// Audio: the English line is rendered on the temporary Sonia route (same door and same one-row cast
// window as ita-sonia-temporary-fill-2026-09-28.cjs; existing Sonia clip by text first), written as a
// new course_audio presentation row carrying lego_id; course_legos.presentation_audio_id and the legacy
// lego_introductions pointers move to it; the OLD clip is detached (lego_id → NULL) and kept, never
// deleted. If a render is refused the LEGO is left SILENT (link NULL) and listed — the old words must
// not keep playing under a marked line. S0348L01 is deliberately NOT here: its English gloss ("would
// have happened" vs the seed's "was going to happen") is with Kai.
//
//   node tools/course-optimization/ita-heads-up-intros-2026-09-28.cjs           # dry run
//   APPLY=1 node tools/course-optimization/ita-heads-up-intros-2026-09-28.cjs   # mark + write + render

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const { newVocabulary, contains } = require('./ita-future-in-past-2026-09-28.cjs');

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-heads-up-intros-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const AUTHOR = "Kai (template, 2026-09-28) — lines written by job #546·I";
const RULING = "Kai, 2026-09-28 (job #546·I): heads-up line for every LEGO that teaches would+verb after said/thought = conditional perfect, in his template \"The Italian for '<LEGO>' in phrases like '<example>' is:\"";
const SONIA = { voiceId: 'azure_en-GB-SoniaNeural', castVoiceId: 'en-GB-SoniaNeural', voiceName: 'en-GB-SoniaNeural' };
const SONIA_IDS = ['azure_en-GB-SoniaNeural', 'en-GB-SoniaNeural'];
const TEMP_ROW = { slot: 'known', language: 'eng', gender: 'f', rank: 1, voice_id: SONIA.castVoiceId };

const line = (legoKnown, example) => `The Italian for '${legoKnown}' in phrases like '${example}' is:`;
const LINES = [
  { legoId: 'S0544L02', seed: 544, lego: { known: 'it would be difficult', target: 'sarebbe stato difficile' }, example: 'he said it would be difficult' },
  { legoId: 'S0535L02', seed: 535, lego: { known: "he wouldn't choose", target: 'non avrebbe scelto' }, example: "he said he wouldn't choose to stay" },
  { legoId: 'S0201L02', seed: 201, lego: { known: 'what was going to', target: 'che cosa sarebbe' }, example: 'I wanted to know what was going to happen' },
  { legoId: 'S0201L03', seed: 201, lego: { known: 'happen', target: 'successo' }, example: 'I wanted to know what was going to happen' },
].map(l => ({ ...l, text: line(l.lego.known, l.example) }));
const REPORTING = /\b(said|thought|knew|wanted to know|told)\b/i;

function lineRules(l) {
  const p = [];
  if (!contains(l.example, l.lego.known)) p.push('example does not contain the LEGO English');
  if (!l.text.includes(`'${l.lego.known}'`)) p.push('line does not quote the LEGO English (mirror)');
  if (!REPORTING.test(l.example)) p.push('example has no reporting verb');
  if (/[()\[\]]/.test(l.text)) p.push('brackets');
  if (/\b(conditional|perfect|tense|subjunctive|clause|verb)\b/i.test(l.text)) p.push('grammar term');
  if (l.example.split(/\s+/).length > 10) p.push('example too long');
  return p;
}

async function guardLive(pg) {
  const problems = [];
  for (const l of LINES) {
    const { rows: [lego] } = await pg.query('SELECT lego_id, known_text, target_text, presentation_audio_id FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, l.legoId]);
    if (!lego || lego.known_text !== l.lego.known || lego.target_text !== l.lego.target) problems.push(`${l.legoId} reads "${lego?.known_text}" → "${lego?.target_text}"`);
    l.live = lego;
    const { rows: [seed] } = await pg.query('SELECT known_text FROM course_seeds WHERE course_code=$1 AND seed_number=$2', [COURSE, l.seed]);
    l.seedText = seed?.known_text;
    if (seed && seed.known_text.trim().toLowerCase() === l.example.trim().toLowerCase() && seed.known_text.split(/\s+/).length > 8) problems.push(`${l.legoId} example is the (long) seed verbatim`);
    const nv = await newVocabulary(pg, l.seed, l.example, 'known');
    if (nv.length) problems.push(`${l.legoId} example uses words not taught by seed ${l.seed}: ${nv.join(', ')}`);
    problems.push(...lineRules(l).map(x => `${l.legoId}: ${x}`));
    const { rows: [old] } = await pg.query('SELECT id, text, voice_id, s3_key FROM course_audio WHERE id::text=$1', [lego?.presentation_audio_id || '']);
    l.old = old || null;
  }
  return problems;
}

async function renderSonia(pg, supabase, text, legoId, log) {
  process.env.PHASE8_NO_LISTEN = '1';
  const phase8 = require('../../services/phases/phase8-audio-v13.cjs');
  const ttsService = require('../../services/tts-service.cjs');
  const veracity = require('../../services/audio-veracity.cjs');
  const voiceConfigService = require('../../services/voice-config-service.cjs');
  const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs');
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const { v4: uuidv4 } = require('uuid');
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });
  const logger = console;
  const textNormalized = normalizeForAudio(text);
  // An existing Sonia presentation clip with these exact words answers first.
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
    const gated = await veracity.renderChecked({ render: renderAndMaster, expectedText: text, language: 'eng', sampler: veracity.ALWAYS_SAMPLER, logger, meta: { courseCode: COURSE, role: 'presentation', voiceId: SONIA.voiceName, lego_id: legoId, originalText: text } });
    if (!gated.published) throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason})`);
    const newAudioId = uuidv4().toUpperCase();
    s3Key = `mastered/${newAudioId}.mp3`;
    await s3.send(new PutObjectCommand({ Bucket: phase8.S3_BUCKET, Key: s3Key, Body: gated.buffer, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
    durationMs = gated.durationMs; wordBoundaries = gated.wordBoundaries || null;
    verdictColumns = veracity.verdictColumns(gated.verdict, { checker: SWEEP, attempts: gated.attempts });
    how = `rendered Sonia (${durationMs} ms)`;
  }
  // A presentation row is keyed to its LEGO (lego_id); the guard trigger checks its words against the mark.
  const { data, error } = await supabase.from('course_audio').insert({ course_code: COURSE, text, text_normalized: textNormalized, language: 'eng', role: 'presentation', voice_id: SONIA.voiceId, origin: 'tts', s3_key: s3Key, duration_ms: durationMs, word_boundaries: wordBoundaries, lego_id: legoId, ...verdictColumns }).select('id').single();
  if (error) throw new Error(`course_audio insert refused: ${error.message}`);
  return { audioId: data.id, how };
}

async function apply(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const humanAuthored = require('../../services/shared/human-authored-presentations.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const eventId = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'presentation-edit',
    scope: { seed_numbers: [...new Set(LINES.map(l => l.seed))], lego_ids: LINES.map(l => l.legoId), rows: LINES.length },
    detail: { ruling: RULING, lines: LINES.map(l => ({ lego_id: l.legoId, from: l.old?.text || null, to: l.text, old_audio_id: l.old?.id || null })) } });
  log.event = eventId;
  const { sameCast, castKey } = require('./ita-sonia-temporary-fill-2026-09-28.cjs');
  const engCast = async () => (await pg.query(`SELECT slot, language, gender, rank, voice_id, notes, assigned_by, created_at, updated_at FROM voice_language_roles WHERE language='eng' ORDER BY slot, gender, rank, voice_id`)).rows;
  log.castBefore = await engCast();
  if (log.castBefore.some(r => SONIA_IDS.includes(r.voice_id))) throw new Error('Sonia already in the English cast — a previous run did not restore it');
  let castRow = false;
  try {
    await pg.query(`INSERT INTO voice_language_roles (slot, language, gender, rank, voice_id, notes, assigned_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [TEMP_ROW.slot, TEMP_ROW.language, TEMP_ROW.gender, TEMP_ROW.rank, TEMP_ROW.voice_id, `TEMPORARY — ${RULING}. Removed by the same run.`, SWEEP]);
    castRow = true;
    for (const l of LINES) {
      const entry = { legoId: l.legoId, text: l.text, from: l.old?.text || null }; log.lines.push(entry);
      // 1. the mark, first (the trigger enforces this order)
      const mark = await humanAuthored.markHumanAuthored(supabase, { courseCode: COURSE, legoId: l.legoId, text: l.text, author: AUTHOR, authoredOn: '2026-09-28', source: 'job #546·I', lego: l.live, by: SWEEP, why: RULING });
      entry.markId = mark.id || mark.lego_id;
      // 2. detach the old clip (kept, never deleted) and clear the links so the old words stop playing
      await pg.query('BEGIN');
      try {
        if (l.old) await pg.query('UPDATE course_audio SET lego_id=NULL WHERE id=$1 AND lego_id=$2', [l.old.id, l.legoId]);
        await pg.query('UPDATE course_legos SET presentation_audio_id=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND lego_id=$3', [eventId, COURSE, l.legoId]);
        await pg.query('UPDATE lego_introductions SET presentation_audio_id=NULL, audio_uuid=NULL, updated_at=now() WHERE course_code=$1 AND lego_id=$2', [COURSE, l.legoId]);
        await pg.query('COMMIT');
      } catch (e) { await pg.query('ROLLBACK'); throw e; }
      // 3. render + link; a refusal leaves the LEGO silent and listed
      try {
        const { audioId, how } = await renderSonia(pg, supabase, l.text, l.legoId, log);
        await pg.query('UPDATE course_legos SET presentation_audio_id=$1 WHERE course_code=$2 AND lego_id=$3 AND presentation_audio_id IS NULL', [audioId, COURSE, l.legoId]);
        await pg.query('UPDATE lego_introductions SET presentation_audio_id=$1, audio_uuid=$1, updated_at=now() WHERE course_code=$2 AND lego_id=$3', [audioId, COURSE, l.legoId]);
        entry.audioId = audioId; entry.result = how;
      } catch (e) { entry.result = `SILENT — render refused: ${e.message}`; }
      const { rows: [chk] } = await pg.query('SELECT l.presentation_audio_id, a.text FROM course_legos l LEFT JOIN course_audio a ON a.id::text=l.presentation_audio_id WHERE l.course_code=$1 AND l.lego_id=$2', [COURSE, l.legoId]);
      entry.linkedText = chk?.text || null; entry.mirrors = !!chk?.text && chk.text === l.text;
    }
  } finally {
    if (castRow) await pg.query(`DELETE FROM voice_language_roles WHERE slot=$1 AND language=$2 AND gender=$3 AND rank=$4 AND voice_id=$5 AND assigned_by=$6`, [TEMP_ROW.slot, TEMP_ROW.language, TEMP_ROW.gender, TEMP_ROW.rank, TEMP_ROW.voice_id, SWEEP]);
    log.castAfter = await engCast(); log.castRestored = sameCast(log.castBefore, log.castAfter);
    void castKey;
  }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, ruling: RULING, apply: APPLY, started: new Date().toISOString(), problems: [], lines: [] };
  console.log(`\n══ ${COURSE} heads-up intros — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  log.problems = await guardLive(pg);
  console.log(log.problems.length ? 'PROBLEMS:\n  ' + log.problems.join('\n  ') : `rules hold for ${LINES.length} lines: LEGO quoted in full, example contains it, reporting verb present, vocabulary taught by the seed, no brackets, no grammar terms`);
  for (const l of LINES) console.log(`  ${l.legoId}  was: ${l.old?.text || '(none)'}\n           now: ${l.text}`);
  if (APPLY && !log.problems.length) {
    await apply(pg, supabase, log);
    console.log(`APPLIED. event=${log.event}; cast ${log.castRestored ? 'RESTORED byte-for-byte' : 'NOT RESTORED — fix by hand'}`);
    for (const e of log.lines) console.log(`  ${e.legoId}: ${e.result}${e.mirrors ? ' → linked, mirrors the mark' : ' → SILENT'}`);
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end(); process.exit(log.problems.length || (APPLY && !log.castRestored) ? 2 : 0);
}
module.exports = { LINES, line, lineRules };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
