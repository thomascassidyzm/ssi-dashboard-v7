#!/usr/bin/env node
// tools/course-optimization/ita-zut-groupa-followup-2026-09-28.cjs
//
// ita_for_eng, Kai's follow-up to the group-A pass (same day, job #519):
//
//  (1) SEED 208 "come dirlo": two build rows under S0208L02 said "come dirlo" under the
//      wrong English ("say it", "how to say"). Both become "how to say it → come dirlo",
//      the LEGO's own pair. That leaves four identical build rows; Kai: introduce it ONCE.
//      B01 stays the debut (introduce=true), B02/B03/B04 are marked introduce=false.
//  (2) "dirlo" ALONE, for consistency: S0061L02 teaches "say that → dirlo" (new). S0644L02
//      (not new) glossed the same Italian "say it", and so did the component S0659L01C02,
//      while both their seeds say "say that" in English. Both glosses become "say that"
//      so one Italian carries one English wherever it stands alone. S0644L02 has no phrases;
//      S0659L01's phrases all already read "say that".
//  (3) RE-VOICE ON AZURE (Kai: "Azure, not xAI"): every English clip this job touched is
//      put on the course's known voice of record, Azure Sonia — the two the pool guard left
//      empty (642), the two the language cast rendered on Cartesia (116, 376), the xAI Eve
//      clip on 403, and whatever (1)/(2) null. Make-before-break: nothing is deleted.
//
// Kai's clarification (1) on the earlier shrinks needs no new LEGO: "the best choice" cut
// from S0116L01B03 is the LEGO S0116L02; the "you" cut from the two 642 rows was never in
// the Italian and is not a piece of seed 642.
//
// WHAT IT WRITES:
//   APPLY=1   course_practice_phrases 3 rows (known_text; +introduce=false on 3), course_legos 1 row,
//             course_seeds 3 rows approved_at=NULL, content_edit_events 3 rows
//   RENDER=1  course_audio rows for Sonia clips that do not yet exist (Azure TTS through the
//             guarded door), S3 objects under mastered/, and the known_audio_id links.
// Dry run is the default for both stages.

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-zut-groupa-followup-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const SONIA = { voiceId: 'azure_en-GB-SoniaNeural', voiceName: 'en-GB-SoniaNeural', provider: 'azure' };

const PHRASES = [
  { id: 'S0208L02B03', lego: 'S0208L02', before: { known: 'say it', target: 'come dirlo' },      after: { known: 'how to say it', target: 'come dirlo' } },
  { id: 'S0208L02B04', lego: 'S0208L02', before: { known: 'how to say', target: 'come dirlo' },  after: { known: 'how to say it', target: 'come dirlo' } },
  { id: 'S0659L01C02', lego: 'S0659L01', before: { known: 'say it', target: 'dirlo' },           after: { known: 'say that', target: 'dirlo' } },
];
// One debut for the four identical "how to say it" builds.
const INTRODUCE_FALSE = ['S0208L02B02', 'S0208L02B03', 'S0208L02B04'];
const LEGOS = [
  { id: 'S0644L02', before: { known: 'say it', target: 'dirlo' }, after: { known: 'say that', target: 'dirlo' } },
];
const SEEDS_TO_UNAPPROVE = [208, 644, 659];

// Every English clip this job touched, with the text it must speak, on Sonia.
const RENDER_TARGETS = [
  { table: 'course_practice_phrases', id: 'ita_for_eng:S0642L01U03', text: 'I can help madam' },
  { table: 'course_practice_phrases', id: 'ita_for_eng:S0642L01U04', text: "I'm going to help madam" },
  { table: 'course_practice_phrases', id: 'ita_for_eng:S0116L01B03', text: 'the choice' },
  { table: 'course_practice_phrases', id: 'ita_for_eng:S0376L01B01', text: "I didn't go anywhere" },
  { table: 'course_legos',            id: 'S0376L01',                text: "I didn't go anywhere" },
  { table: 'course_practice_phrases', id: 'ita_for_eng:S0403L03B01', text: 'remain quiet' },
  { table: 'course_practice_phrases', id: 'ita_for_eng:S0208L02B03', text: 'how to say it' },
  { table: 'course_practice_phrases', id: 'ita_for_eng:S0208L02B04', text: 'how to say it' },
  { table: 'course_practice_phrases', id: 'ita_for_eng:S0659L01C02', text: 'say that' },
  { table: 'course_legos',            id: 'S0644L02',                text: 'say that' },
];

async function main() {
  const APPLY = process.env.APPLY === '1';
  const RENDER = process.env.RENDER === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { evidencePath } = require('../lib/evidence-path.cjs');

  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const log = { apply: APPLY, render: RENDER, started: new Date().toISOString(), phrases: [], legos: [], aborted: [], renders: [] };

  // ── STAGE 1: content ──
  const { rows: prows } = await pg.query(
    `SELECT p.id, p.known_text, p.target_text, p.introduce, l.lego_id AS lego_id_joined
       FROM course_practice_phrases p JOIN course_legos l ON l.course_code=p.course_code AND l.seed_number=p.seed_number AND l.lego_index=p.lego_index
      WHERE p.course_code=$1 AND p.id = ANY($2)`, [COURSE, PHRASES.map(p => `${COURSE}:${p.id}`)]);
  for (const p of PHRASES) {
    const live = prows.find(r => r.id === `${COURSE}:${p.id}`);
    if (!live) { log.aborted.push(`phrase ${p.id} not found`); continue; }
    if (live.known_text !== p.before.known || live.target_text !== p.before.target) { log.aborted.push(`phrase ${p.id} drift: "${live.known_text}" / "${live.target_text}"`); continue; }
    if (live.lego_id_joined !== p.lego) log.aborted.push(`phrase ${p.id} sits under ${live.lego_id_joined}, expected ${p.lego}`);
    const { rows: clash } = await pg.query(
      `SELECT id, target_text FROM course_practice_phrases WHERE course_code=$1 AND id<>$2 AND phrase_role<>'component' AND lower(trim(known_text))=lower(trim($3)) AND lower(trim(target_text))<>lower(trim($4))
       UNION ALL SELECT lego_id, target_text FROM course_legos WHERE course_code=$1 AND lower(trim(known_text))=lower(trim($3)) AND lower(trim(target_text))<>lower(trim($4))`,
      [COURSE, live.id, p.after.known, p.after.target]);
    const real = clash.filter(c => !LEGOS.some(l => l.id === c.id));
    if (real.length) log.aborted.push(`ZUT: ${p.id} "${p.after.known}" already maps to ${real.map(c => `"${c.target_text}" (${c.id})`).join(', ')}`);
    log.phrases.push({ id: live.id, before: p.before, after: p.after });
  }
  const { rows: lrows } = await pg.query(`SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)`, [COURSE, LEGOS.map(l => l.id)]);
  for (const l of LEGOS) {
    const live = lrows.find(r => r.lego_id === l.id);
    if (!live) { log.aborted.push(`lego ${l.id} not found`); continue; }
    if (live.known_text !== l.before.known || live.target_text !== l.before.target) { log.aborted.push(`lego ${l.id} drift: "${live.known_text}" / "${live.target_text}"`); continue; }
    const { rows: clash } = await pg.query(
      `SELECT lego_id AS id, target_text FROM course_legos WHERE course_code=$1 AND lego_id<>$2 AND lower(trim(known_text))=lower(trim($3)) AND lower(trim(target_text))<>lower(trim($4))`,
      [COURSE, l.id, l.after.known, l.after.target]);
    if (clash.length) log.aborted.push(`ZUT: lego ${l.id} "${l.after.known}" already maps to ${clash.map(c => `"${c.target_text}" (${c.id})`).join(', ')}`);
    // Standing rule: every phrase under a re-glossed LEGO must carry the new gloss.
    const { rows: under } = await pg.query(`SELECT id, known_text FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3 AND phrase_role IN ('build','use')`,
      [COURSE, Number(l.id.slice(1, 5)), Number(l.id.slice(6, 8))]);
    const stale = under.filter(r => !r.known_text.toLowerCase().includes(l.after.known.toLowerCase()));
    if (stale.length) log.aborted.push(`lego ${l.id}: ${stale.length} phrase(s) under it do not carry "${l.after.known}": ${stale.map(r => r.id).join(', ')}`);
    log.legos.push({ id: l.id, before: l.before, after: l.after, phrasesUnder: under.length });
  }

  console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} content — ${log.phrases.length}/${PHRASES.length} phrases, ${log.legos.length}/${LEGOS.length} legos, introduce=false on ${INTRODUCE_FALSE.join(', ')}, unapprove ${SEEDS_TO_UNAPPROVE.join(', ')}`);
  for (const p of log.phrases) console.log(`  ${p.id} "${p.before.known}" → "${p.after.known}" (${p.after.target})`);
  for (const l of log.legos) console.log(`  LEGO ${l.id} "${l.before.known}" → "${l.after.known}" (${l.after.target}; ${l.phrasesUnder} phrases under it)`);
  if (log.aborted.length) { console.log('\nABORT CONDITIONS:'); log.aborted.forEach(a => console.log('  ' + a)); }

  if (APPLY && !log.aborted.length) {
    const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit',
      scope: { phrase_ids: log.phrases.map(p => p.id).concat(INTRODUCE_FALSE.map(i => `${COURSE}:${i}`)), rows: log.phrases.length + INTRODUCE_FALSE.length },
      detail: { why: 'Kai 2026-09-28: both come dirlo rows become "how to say it"; one debut; dirlo alone glossed "say that" everywhere', edits: log.phrases } });
    const legoEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-update',
      scope: { lego_ids: log.legos.map(l => l.id), rows: log.legos.length }, detail: { edits: log.legos } });
    const seedEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove',
      scope: { seed_numbers: SEEDS_TO_UNAPPROVE, rows: SEEDS_TO_UNAPPROVE.length }, detail: { why: 'text under these seeds changed' } });
    log.events = { phraseEvent, legoEvent, seedEvent };
    await pg.query('BEGIN');
    try {
      for (const p of log.phrases) {
        const r = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, qa_checked=NULL, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND id=$4 AND known_text=$5`,
          [p.after.known, phraseEvent, COURSE, p.id, p.before.known]);
        if (r.rowCount !== 1) throw new Error(`phrase ${p.id} write race`);
      }
      const i = await pg.query(`UPDATE course_practice_phrases SET introduce=false, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND id = ANY($3)`,
        [phraseEvent, COURSE, INTRODUCE_FALSE.map(x => `${COURSE}:${x}`)]);
      if (i.rowCount !== INTRODUCE_FALSE.length) throw new Error(`introduce=false touched ${i.rowCount} rows`);
      for (const l of log.legos) {
        const r = await pg.query(`UPDATE course_legos SET known_text=$1, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND lego_id=$4 AND known_text=$5`,
          [l.after.known, legoEvent, COURSE, l.id, l.before.known]);
        if (r.rowCount !== 1) throw new Error(`lego ${l.id} write race`);
      }
      const s = await pg.query(`UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)`, [seedEvent, COURSE, SEEDS_TO_UNAPPROVE]);
      if (s.rowCount !== SEEDS_TO_UNAPPROVE.length) throw new Error(`unapproved ${s.rowCount} seeds`);
      await pg.query('COMMIT');
      console.log(`APPLIED content. events=${JSON.stringify(log.events)}`);
    } catch (e) { await pg.query('ROLLBACK'); console.error('ROLLED BACK:', e.message); await pg.end(); process.exit(1); }
  }

  // ── STAGE 2: Sonia clips ──
  if (RENDER) {
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
    const S3_BUCKET = phase8.S3_BUCKET;
    const logger = console;

    for (const t of RENDER_TARGETS) {
      const idCol = t.table === 'course_legos' ? 'lego_id' : 'id';
      const { rows: [row] } = await pg.query(`SELECT known_text, known_audio_id, (SELECT voice_id FROM course_audio a WHERE a.id=x.known_audio_id) AS cur_voice FROM ${t.table} x WHERE course_code=$1 AND ${idCol}=$2`, [COURSE, t.id]);
      const entry = { ...t };
      log.renders.push(entry);
      if (!row) { entry.result = 'ROW NOT FOUND'; continue; }
      if (row.known_text !== t.text) { entry.result = `TEXT DRIFT: row says "${row.known_text}"`; continue; }
      if (row.cur_voice === SONIA.voiceId) { entry.result = `already Sonia (${row.known_audio_id})`; continue; }
      // An existing Sonia clip that speaks exactly this text is reused, never re-rendered.
      const { rows: existing } = await pg.query(
        `SELECT id FROM course_audio WHERE course_code=$1 AND role='known' AND voice_id=$2 AND s3_key IS NOT NULL AND normalize_text(text)=normalize_text($3) ORDER BY created_at DESC LIMIT 1`,
        [COURSE, SONIA.voiceId, t.text]);
      let audioId = existing[0]?.id || null;
      if (audioId) entry.result = `linked existing Sonia clip ${audioId}`;
      else {
        try {
          const speed = 1;
          const renderAndMaster = async () => {
            const { audioBuffer, wordBoundaries } = await ttsService.generateWithRetry(t.text, 'azure', {
              door: { courseCode: COURSE, intro: false, replacing: row.known_audio_id ? [row.known_audio_id] : [] },
              subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope',
              voiceName: SONIA.voiceName, speed,
            });
            const { buffer, durationMs } = await phase8.masterAudio(audioBuffer, t.text, await voiceConfigService.masteringOptsFor(SONIA.voiceName, 'azure'));
            return { buffer, durationMs, wordBoundaries };
          };
          const gated = await veracity.renderChecked({ render: renderAndMaster, expectedText: t.text, language: 'eng', sampler: veracity.ALWAYS_SAMPLER, logger,
            meta: { courseCode: COURSE, role: 'known', voiceId: SONIA.voiceName, phrase_id: t.id, originalText: t.text } });
          if (!gated.published) throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason})`);
          const newAudioId = uuidv4().toUpperCase();
          const newS3Key = `mastered/${newAudioId}.mp3`;
          await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: newS3Key, Body: gated.buffer, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
          const verdictColumns = veracity.verdictColumns(gated.verdict, { checker: SWEEP, attempts: gated.attempts });
          const textNormalized = normalizeForAudio(t.text);
          const base = { course_code: COURSE, text: t.text, text_normalized: textNormalized, language: 'eng', role: 'known', voice_id: SONIA.voiceId, origin: 'tts' };
          const out = await writeOrSwapClip({ supabase,
            identity: { course_code: COURSE, text_normalized: textNormalized, language: 'eng', role: 'known', voice_id: SONIA.voiceId },
            insertRow: { ...base, s3_key: newS3Key, duration_ms: gated.durationMs, word_boundaries: gated.wordBoundaries || null, ...verdictColumns },
            swapPatch: { voice_id: SONIA.voiceId, origin: 'tts', word_boundaries: gated.wordBoundaries || null, text: t.text, ...verdictColumns },
            newS3Key, durationMs: gated.durationMs, source: SWEEP, acceptedBy: `${SWEEP} (known, Sonia)`, reason: 'Kai 2026-09-28: re-voice on Azure, not xAI/Cartesia', logger });
          audioId = out.audioId;
          entry.result = `rendered Sonia clip ${audioId} (${gated.durationMs} ms)`;
        } catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; continue; }
      }
      const link = await pg.query(`UPDATE ${t.table} SET known_audio_id=$1 WHERE course_code=$2 AND ${idCol}=$3 AND known_text=$4`, [audioId, COURSE, t.id, t.text]);
      entry.linked = link.rowCount === 1;
      entry.previous = row.known_audio_id;
    }
    console.log('\nRENDER results:');
    for (const r of log.renders) console.log(`  ${r.id} "${r.text}": ${r.result}${r.linked ? ' → linked' : ''}`);
  }

  const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY || RENDER ? 'applied' : 'dryrun'}-${stamp}.json`);
  fs.writeFileSync(f, JSON.stringify(log, null, 2));
  console.log(`Wrote ${f}`);
  await pg.end();
  process.exit(log.aborted.length ? 2 : 0);
}

module.exports = { PHRASES, LEGOS, INTRODUCE_FALSE, RENDER_TARGETS };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
