#!/usr/bin/env node
// tools/course-optimization/ita-zut-groupa-gloss-sweep-2026-09-28.cjs
//
// ita_for_eng — Kai's sharpened phrase rule (2026-09-28): when a LEGO gloss changes,
// EVERY phrase anywhere in the course that still carries the old gloss — the English
// wording, or the Italian it maps to — is brought to the new gloss on both sides.
//
// The three glosses this job changed, and what the whole-course search found:
//   S0376L01  "didn't go anywhere" → "I didn't go anywhere" / non sono andato da nessuna parte
//             All 7 occurrences (376, 377, 378) already read "I didn't go anywhere". Nothing to do.
//   dirlo alone  "say it" → "say that" (S0644L02, S0659L01C02; matches S0061L02)
//             Four phrases still said "say it" over a bare dirlo — the rows below.
//   S0208L02  "how to say it" / come dirlo
//             Every come dirlo row already reads "how to say it". Nothing to do.
//
// S0644L01U04 changes on BOTH sides: "could you say that again?" already exists at S0061L03U01
// as the informal "potresti dirlo di nuovo?", so the formal row takes the register marker the
// rest of seed 644 carries (Kai's formal-register rule): "could you say that again sir?" →
// "potrebbe dirlo di nuovo, signore?".
//
// Writes: 4 phrase rows (known_text; target_text on one), qa_checked=NULL, 4 seeds unapproved,
// 2 edit events. Dry run default; APPLY=1 writes. RENDER=1 re-voices the English on Azure Sonia
// (replacing the existing Sonia clip through the guarded door) and lists the Italian slot the
// trigger nulled for a phase8 /regenerate-phrase call.
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const COURSE = 'ita_for_eng';
const SWEEP = 'ita-zut-groupa-gloss-sweep-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const SONIA = { voiceId: 'azure_en-GB-SoniaNeural', voiceName: 'en-GB-SoniaNeural' };

const PHRASES = [
  { id: 'S0205L02U01', before: { known: 'I was trying to say it', target: 'stavo provando a dirlo' },            after: { known: 'I was trying to say that', target: 'stavo provando a dirlo' } },
  { id: 'S0208L01U02', before: { known: "I didn't want to say it", target: 'non volevo dirlo' },                  after: { known: "I didn't want to say that", target: 'non volevo dirlo' } },
  { id: 'S0616L01U01', before: { known: 'you were very brave to say it', target: 'sei stato molto coraggioso a dirlo' }, after: { known: 'you were very brave to say that', target: 'sei stato molto coraggioso a dirlo' } },
  { id: 'S0644L01U04', before: { known: 'could you say it again?', target: 'potrebbe dirlo di nuovo?' },          after: { known: 'could you say that again sir?', target: 'potrebbe dirlo di nuovo, signore?' } },
];
const SEEDS_TO_UNAPPROVE = [...new Set(PHRASES.map(p => Number(p.id.slice(1, 5))))];

async function main() {
  const APPLY = process.env.APPLY === '1', RENDER = process.env.RENDER === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const log = { apply: APPLY, render: RENDER, phrases: [], aborted: [], renders: [], nulled: [] };

  // The rule's own search, re-run live: any bare-dirlo phrase still glossed without "say that" aborts the run
  // unless it is one of the rows below (so the list can never silently go stale).
  const { rows: stale } = await pg.query(`SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND lower(target_text) ~ '\\mdirlo\\M' AND lower(target_text) !~ 'come dirlo' AND lower(known_text) !~ 'say that'`, [COURSE]);
  for (const r of stale) if (!PHRASES.some(p => `${COURSE}:${p.id}` === r.id)) log.aborted.push(`unlisted bare-dirlo row still glossed "${r.known_text}": ${r.id}`);

  const { rows: live } = await pg.query(`SELECT id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)`, [COURSE, PHRASES.map(p => `${COURSE}:${p.id}`)]);
  for (const p of PHRASES) {
    const r = live.find(x => x.id === `${COURSE}:${p.id}`);
    if (!r) { log.aborted.push(`${p.id} not found`); continue; }
    if (r.known_text !== p.before.known || r.target_text !== p.before.target) { log.aborted.push(`${p.id} drift: "${r.known_text}" / "${r.target_text}"`); continue; }
    const { rows: clash } = await pg.query(`SELECT id, target_text FROM course_practice_phrases WHERE course_code=$1 AND id<>$2 AND phrase_role<>'component' AND lower(trim(known_text))=lower(trim($3)) AND lower(trim(target_text))<>lower(trim($4))
      UNION ALL SELECT lego_id, target_text FROM course_legos WHERE course_code=$1 AND lower(trim(known_text))=lower(trim($3)) AND lower(trim(target_text))<>lower(trim($4))`, [COURSE, r.id, p.after.known, p.after.target]);
    if (clash.length) log.aborted.push(`ZUT: ${p.id} "${p.after.known}" already maps to ${clash.map(c => `"${c.target_text}" (${c.id})`).join(', ')}`);
    log.phrases.push({ id: r.id, before: p.before, after: p.after, audio: { known: r.known_audio_id, target1: r.target1_audio_id, target2: r.target2_audio_id } });
  }
  console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${log.phrases.length}/${PHRASES.length} phrases; unapprove ${SEEDS_TO_UNAPPROVE.join(', ')}`);
  for (const p of log.phrases) console.log(`  ${p.id} "${p.before.known}" / "${p.before.target}" → "${p.after.known}" / "${p.after.target}"`);
  if (log.aborted.length) { console.log('\nABORT CONDITIONS:'); log.aborted.forEach(a => console.log('  ' + a)); }

  if (APPLY && !log.aborted.length) {
    const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit',
      scope: { phrase_ids: log.phrases.map(p => p.id), seed_numbers: SEEDS_TO_UNAPPROVE, rows: log.phrases.length },
      detail: { why: "Kai 2026-09-28 sharpened rule: every phrase carrying the old gloss 'say it' over bare dirlo follows the new gloss 'say that'", edits: log.phrases.map(p => ({ id: p.id, before: p.before, after: p.after })) } });
    const seedEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove',
      scope: { seed_numbers: SEEDS_TO_UNAPPROVE, rows: SEEDS_TO_UNAPPROVE.length }, detail: { why: 'phrase text under these seeds changed' } });
    log.events = { phraseEvent, seedEvent };
    await pg.query('BEGIN');
    try {
      for (const p of log.phrases) {
        const r = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=length($2), qa_checked=NULL, last_edit_event_id=$3, updated_at=now()
          WHERE course_code=$4 AND id=$5 AND known_text=$6 AND target_text=$7 RETURNING known_audio_id, target1_audio_id, target2_audio_id`,
          [p.after.known, p.after.target, phraseEvent, COURSE, p.id, p.before.known, p.before.target]);
        if (r.rowCount !== 1) throw new Error(`${p.id} write race`);
        for (const role of ['known', 'target1', 'target2']) if (r.rows[0][`${role}_audio_id`] === null && p.audio[role] !== null) log.nulled.push({ id: p.id, role });
      }
      const s = await pg.query(`UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)`, [seedEvent, COURSE, SEEDS_TO_UNAPPROVE]);
      if (s.rowCount !== SEEDS_TO_UNAPPROVE.length) throw new Error(`unapproved ${s.rowCount}`);
      await pg.query('COMMIT');
      console.log(`APPLIED. events=${JSON.stringify(log.events)}; slots nulled by trigger: ${log.nulled.map(n => `${n.id} ${n.role}`).join(', ') || 'none'}`);
    } catch (e) { await pg.query('ROLLBACK'); console.error('ROLLED BACK:', e.message); await pg.end(); process.exit(1); }
  }

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
    for (const p of PHRASES) {
      const { rows: [row] } = await pg.query(`SELECT known_text, known_audio_id, (SELECT voice_id FROM course_audio a WHERE a.id=x.known_audio_id) AS cur_voice FROM course_practice_phrases x WHERE course_code=$1 AND id=$2`, [COURSE, `${COURSE}:${p.id}`]);
      const entry = { id: p.id, text: row?.known_text }; log.renders.push(entry);
      if (!row || row.known_text !== p.after.known) { entry.result = 'row not at after-text; skipped'; continue; }
      const text = p.after.known;
      const { rows: existing } = await pg.query(`SELECT id FROM course_audio WHERE course_code=$1 AND role='known' AND voice_id=$2 AND s3_key IS NOT NULL AND normalize_text(text)=normalize_text($3) ORDER BY created_at DESC LIMIT 1`, [COURSE, SONIA.voiceId, text]);
      let audioId = existing[0]?.id || null;
      if (audioId && row.known_audio_id === audioId) { entry.result = `already linked to Sonia ${audioId}`; continue; }
      if (audioId) entry.result = `linked existing Sonia clip ${audioId}`;
      else {
        // The text-change trigger has already unlinked the old clip, so the row shows NULL; the
        // door must still be told this is a REPLACEMENT of that clip, not new English audio.
        // The trigger recorded the drop, so the old id is read back from there.
        let replacing = row.known_audio_id ? [row.known_audio_id] : [];
        if (!replacing.length) {
          const { rows: drops } = await pg.query(`SELECT old_audio_id FROM content_audio_link_drops WHERE row_id=$1 AND column_name='known_audio_id' AND old_audio_id IS NOT NULL ORDER BY dropped_at DESC LIMIT 1`, [`${COURSE}:${p.id}`]).catch(() => ({ rows: [] }));
          if (drops[0]) replacing = [drops[0].old_audio_id];
        }
        entry.replacing = replacing;
        try {
          const render = async () => {
            const { audioBuffer, wordBoundaries } = await ttsService.generateWithRetry(text, 'azure', {
              door: { courseCode: COURSE, intro: false, replacing },
              subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope', voiceName: SONIA.voiceName, speed: 1 });
            const { buffer, durationMs } = await phase8.masterAudio(audioBuffer, text, await voiceConfigService.masteringOptsFor(SONIA.voiceName, 'azure'));
            return { buffer, durationMs, wordBoundaries };
          };
          const gated = await veracity.renderChecked({ render, expectedText: text, language: 'eng', sampler: veracity.ALWAYS_SAMPLER, logger: console, meta: { courseCode: COURSE, role: 'known', voiceId: SONIA.voiceName, phrase_id: p.id, originalText: text } });
          if (!gated.published) throw new Error(`veracity gate: quarantined (${gated.verdict?.reason})`);
          const newAudioId = uuidv4().toUpperCase(), newS3Key = `mastered/${newAudioId}.mp3`;
          await s3.send(new PutObjectCommand({ Bucket: phase8.S3_BUCKET, Key: newS3Key, Body: gated.buffer, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
          const vc = veracity.verdictColumns(gated.verdict, { checker: SWEEP, attempts: gated.attempts });
          const tn = normalizeForAudio(text);
          const base = { course_code: COURSE, text, text_normalized: tn, language: 'eng', role: 'known', voice_id: SONIA.voiceId, origin: 'tts' };
          const out = await writeOrSwapClip({ supabase, identity: { course_code: COURSE, text_normalized: tn, language: 'eng', role: 'known', voice_id: SONIA.voiceId },
            insertRow: { ...base, s3_key: newS3Key, duration_ms: gated.durationMs, word_boundaries: gated.wordBoundaries || null, ...vc },
            swapPatch: { voice_id: SONIA.voiceId, origin: 'tts', word_boundaries: gated.wordBoundaries || null, text, ...vc },
            newS3Key, durationMs: gated.durationMs, source: SWEEP, acceptedBy: `${SWEEP} (known, Sonia)`, reason: 'gloss sweep re-voice on Azure', logger: console });
          audioId = out.audioId; entry.result = `rendered Sonia clip ${audioId} (${gated.durationMs} ms)`;
        } catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; continue; }
      }
      const link = await pg.query(`UPDATE course_practice_phrases SET known_audio_id=$1 WHERE course_code=$2 AND id=$3 AND known_text=$4`, [audioId, COURSE, `${COURSE}:${p.id}`, text]);
      entry.linked = link.rowCount === 1;
    }
    console.log('\nRENDER (English, Sonia):'); for (const r of log.renders) console.log(`  ${r.id} "${r.text}": ${r.result}${r.linked ? ' → linked' : ''}`);
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY || RENDER ? 'applied' : 'dryrun'}-${stamp}.json`);
  fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end(); process.exit(log.aborted.length ? 2 : 0);
}
module.exports = { PHRASES };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
