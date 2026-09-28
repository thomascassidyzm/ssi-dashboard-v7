#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-seed-609-u07-u09-italian-fill-2026-09-28.cjs
//
// ita_for_eng — fill the two S0609L01 use phrases that #579·I found without Italian audio
// (job #580·I, Kai 2026-09-28 19:15Z): S0609L01U07 "voglio chiedere a mia madre la settimana prossima"
// and S0609L01U09 "non voglio chiedere a nessuno". NO TEXT CHANGES. Course's normal target voices only —
// Elsa (target1) and Benigno (target2) — the exact render route of ita-seed-609-recut-2026-09-28.cjs
// (one TTS door, veracity gate, writeOrSwapClip). An existing live Elsa/Benigno clip with the same
// normalised text is linked rather than re-rendered. The slot is written only while it is still NULL
// and the text is still what we read, so a concurrent edit is never overwritten.
//
//   node tools/course-optimization/ita-seed-609-u07-u09-italian-fill-2026-09-28.cjs        # dry run
//   APPLY=1 node tools/course-optimization/ita-seed-609-u07-u09-italian-fill-2026-09-28.cjs
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-seed-609-u07-u09-italian-fill-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#580·I';
const RULING = `Kai, 2026-09-28 19:15Z (job ${JOB}): S0609L01U07 and U09 get Italian audio on the course's normal target voices (Elsa, Benigno); no text change`;
const PHRASE_IDS = ['ita_for_eng:S0609L01U07', 'ita_for_eng:S0609L01U09'];
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const AZURE_VOICE_IDS = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };
const VOICE_FOR_ROLE = { target1: ELSA, target2: BENIGNO };

/** Pure: which (phrase, role) slots are empty. Tested. */
function emptySlots(rows) {
  const out = [];
  for (const r of rows) for (const role of ['target1', 'target2']) if (!r[`${role}_audio_id`]) out.push({ id: r.id, role, text: r.target_text, voice: VOICE_FOR_ROLE[role] });
  return out;
}
/** Pure: a linked slot counts as filled only on a cast voice with live bytes. Tested. */
function slotOk(role, clip) {
  return !!clip && AZURE_VOICE_IDS[role].includes(clip.voice_id) && !!clip.s3_key && !clip.s3_key.startsWith('pending/');
}

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

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, job: JOB, ruling: RULING, apply: APPLY, started: new Date().toISOString(), slots: [], problems: [] };
  const { rows } = await pg.query(`SELECT id, target_text, known_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) ORDER BY id`, [COURSE, PHRASE_IDS]);
  if (rows.length !== PHRASE_IDS.length) log.problems.push(`expected ${PHRASE_IDS.length} phrases, found ${rows.length}`);
  const slots = emptySlots(rows);
  console.log(`\n══ ${COURSE} — S0609L01U07/U09 Italian fill — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  for (const r of rows) console.log(`  ${r.id}: "${r.known_text}" → "${r.target_text}"  target1=${r.target1_audio_id || '—'} target2=${r.target2_audio_id || '—'}`);
  console.log(`  empty slots: ${slots.length} (${slots.map(s => `${s.id.split(':')[1]}/${s.role}`).join(', ') || 'none'})`);
  if (APPLY && slots.length && !log.problems.length) {
    const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
    const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
    const eventId = await recordContentEdit(supabase, { identity: serviceIdentity(SWEEP), courseCode: COURSE, surface: SURFACE, operation: 'audio-fill', scope: { seed_numbers: [609], phrase_ids: PHRASE_IDS, rows: slots.length }, detail: { job: JOB, ruling: RULING, textChanges: 0 } });
    log.eventId = eventId;
    for (const s of slots) {
      const entry = { id: s.id, role: s.role, text: s.text }; log.slots.push(entry);
      try {
        const { rows: have } = await pg.query(`SELECT id, voice_id FROM course_audio WHERE language='ita' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($2) ORDER BY (course_code=$3) DESC, (role=$4) DESC, created_at DESC LIMIT 1`, [s.text, AZURE_VOICE_IDS[s.role], COURSE, s.role]);
        let audioId = have[0]?.id;
        if (audioId) entry.result = `linked existing ${have[0].voice_id} clip ${audioId}`;
        else { const out = await renderClip(supabase, { text: s.text, role: s.role, voice: s.voice, voiceIds: AZURE_VOICE_IDS[s.role] }); audioId = out.audioId; entry.result = `rendered ${s.voice.voiceName} clip ${audioId} (${out.durationMs} ms)`; }
        const u = await pg.query(`UPDATE course_practice_phrases SET ${s.role}_audio_id=$1, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND id=$4 AND target_text=$5 AND ${s.role}_audio_id IS NULL`, [audioId, eventId, COURSE, s.id, s.text]);
        const { rows: [clip] } = await pg.query(`SELECT a.id, a.voice_id, a.s3_key FROM course_practice_phrases p LEFT JOIN course_audio a ON a.id=p.${s.role}_audio_id WHERE p.course_code=$1 AND p.id=$2`, [COURSE, s.id]);
        // The audio_autolink trigger on course_audio links an empty slot the moment a matching clip is
        // inserted (seen live, job #580·I), so our own UPDATE usually finds the slot already holding our clip.
        if (u.rowCount !== 1 && clip?.id === audioId) { entry.result += ' — linked by the audio_autolink trigger on insert'; await pg.query(`UPDATE course_practice_phrases SET last_edit_event_id=$1 WHERE course_code=$2 AND id=$3 AND ${s.role}_audio_id=$4 AND last_edit_event_id IS NULL`, [eventId, COURSE, s.id, audioId]); }
        else if (u.rowCount !== 1) entry.result += ` — SLOT MOVED UNDER US (now ${clip?.id}), not linked`;
        entry.linked = clip?.id || null; entry.linkedVoice = clip?.voice_id || null; entry.ok = slotOk(s.role, clip);
        if (!entry.ok) { entry.result += ` — SLOT NOT OK (${clip?.voice_id}, ${clip?.s3_key})`; log.problems.push(`${s.id} ${s.role} not filled on a cast voice`); }
      } catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; log.problems.push(`${s.id} ${s.role}: ${e.message}`); }
      console.log(`  ${s.id} ${s.role} "${s.text}": ${entry.result}`);
    }
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  if (log.problems.length) console.log('PROBLEMS:\n  ' + log.problems.join('\n  '));
  await pg.end(); process.exit(log.problems.length ? 2 : 0);
}
module.exports = { emptySlots, slotOk, PHRASE_IDS, ELSA, BENIGNO, AZURE_VOICE_IDS };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
