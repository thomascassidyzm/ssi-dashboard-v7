#!/usr/bin/env node
'use strict';
// Re-link the per-sentence KNOWN clips of a split pod turn to recordings that already exist (job #917, 2026-09-30).
//
// WHY. A turn row whose target was silence-split into per-sentence clips (sentence_audio_ids) but whose known side was
// not (sentence_known_audio_ids null, or a different count) plays every one of its sentences with NO known audio: the
// player pairs known ⇄ target by index and drops the known slot on a count mismatch (podSentenceSplit.splitRowUnits).
// Italian Pod 1 rows 33 and 94 (Aran, 2026-09-30: "bits missing — either English or Italian or both") — six sentences
// with no English, in Drill, Immersion and the main-flow pod laps alike — while every one of those six English sentences
// already existed in the library in the same voice (Tom's clone), recorded for the Drill's fine-known glosses.
//
// WHAT IT DOES. For each such row in a live pod: split known_text at sentence ends; the count must equal the target
// clip count (else the row is skipped — never guess an alignment); every sentence must find an EXISTING course_audio
// clip with the same text and the same voice IDENTITY as the row's own whole-turn known clip (canonicalVoiceId, so
// 'gfzdpspr5fdp' and 'xai_gfzdpspr5fdp' are one voice). All found → sentence_known_audio_ids is written. One missing →
// the row is skipped and reported. No audio is rendered and no course_audio row is touched.
//
// NOT A CONTENT CHANGE. No text moves and the unit count comes from the TARGET clips, which are untouched, so every
// learner_pod_state slot means exactly what it meant before (tools/pods/CLAUDE.md rule 1 is about text/slot edits).
// The language key is canonicalised as well as the voice: the library spells English 'en' and 'eng'.
//
// NOT ARABIC. Aran leads Arabic with full artistic control (Tom, 2026-09-22) — ara_* pods are reported, never written.
//
//   node tools/pods/relink-split-known-sentence-clips.cjs            # dry run: the plan, row by row
//   node tools/pods/relink-split-known-sentence-clips.cjs --apply    # write it (asserts each row is unchanged first)
//   --pod <pod_id>                                                    # one pod only
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
const { tryCanonicalVoiceId, tryCanonicalLanguage } = require('../../services/shared/clip-identity.cjs');

const SWEEP = 'relink-split-known-sentence-clips';
const JOB = '#917';

/** Same boundary the player splits turn text on (podSentenceSplit.POD_SENTENCE_BOUNDARY). */
const SENTENCE_BOUNDARY = /(?<=[.!?])\s+/;
const splitSentences = (t) => String(t || '').split(SENTENCE_BOUNDARY).map((s) => s.trim()).filter(Boolean);

/** Text key for "the same words": case, spacing and trailing sentence punctuation don't make a different recording. */
const textKey = (t) => String(t || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!?。！？]+$/, '').trim();

const voiceKey = (v) => tryCanonicalVoiceId(v) || null;
const langKey = (l) => tryCanonicalLanguage(l) || null;

const isArabicHold = (podId) => /^ara_/.test(String(podId || ''));

/**
 * Pure planner for one row. `candidates` are course_audio rows { id, course_code, role, voice_id, text,
 * audio_revision, created_at } whose text might match; the planner does the matching. Returns
 * { action: 'link', ids, picks } or { action: 'skip', reason }.
 */
function planRow({ row, rowKnownVoice, rowKnownLanguage, candidates }) {
  const targetClips = (row.sentence_audio_ids || []).filter(Boolean);
  const knownClips = (row.sentence_known_audio_ids || []).filter(Boolean);
  if (targetClips.length < 2) return { action: 'skip', reason: 'target not split' };
  if (knownClips.length === targetClips.length) return { action: 'skip', reason: 'already linked' };
  if (isArabicHold(row.pod_id)) return { action: 'skip', reason: 'Arabic — Aran leads (2026-09-22), not written' };
  const wantVoice = voiceKey(rowKnownVoice);
  if (!wantVoice) return { action: 'skip', reason: `row's known voice ${JSON.stringify(rowKnownVoice)} has no identity` };
  const wantLang = langKey(rowKnownLanguage);
  const sentences = splitSentences(row.known_text);
  if (sentences.length !== targetClips.length) {
    return { action: 'skip', reason: `known text has ${sentences.length} sentences, target has ${targetClips.length} clips` };
  }
  const course = String(row.pod_id).split(':')[0];
  const picks = [];
  for (const s of sentences) {
    const k = textKey(s);
    const same = (candidates || []).filter((c) =>
      textKey(c.text) === k && voiceKey(c.voice_id) === wantVoice && langKey(c.language) === wantLang);
    if (!same.length) return { action: 'skip', reason: `no existing clip for ${JSON.stringify(s)} in ${wantVoice}` };
    same.sort((a, b) =>
      (b.course_code === course) - (a.course_code === course) ||
      (b.audio_revision || 1) - (a.audio_revision || 1) ||
      String(b.created_at).localeCompare(String(a.created_at)));
    picks.push({ sentence: s, clip: same[0] });
  }
  return { action: 'link', ids: picks.map((p) => p.clip.id), picks };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const podArg = process.argv.includes('--pod') ? process.argv[process.argv.indexOf('--pod') + 1] : null;
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const { rows } = await pg.query(
    `select s.id, s.pod_id, s.global_order, s.known_text, s.sentence_audio_ids, s.sentence_known_audio_ids,
            s.known_audio_id, k.voice_id as known_voice, k.language as known_language
       from listening_pod_sentences s
       join listening_pods p on p.id = s.pod_id and p.visibility = 'live'
       left join course_audio k on k.id = s.known_audio_id
      where cardinality(s.sentence_audio_ids) >= 2
        and cardinality(s.sentence_audio_ids) is distinct from cardinality(s.sentence_known_audio_ids)
        ${podArg ? 'and s.pod_id = $1' : ''}
      order by s.pod_id, s.global_order`, podArg ? [podArg] : []);

  const plan = [];
  for (const row of rows) {
    // text_normalized carries two conventions (with and without the closing mark), so ask the index for
    // both spellings; planRow compares on textKey either way.
    const keys = splitSentences(row.known_text).map(textKey).flatMap((k) => [k, `${k}.`, `${k}?`, `${k}!`]);
    const { rows: candidates } = keys.length
      ? await pg.query(
        `select id, course_code, role, voice_id, language, text, audio_revision, created_at from course_audio
          where text_normalized = any($1::text[])`,
        [keys])
      : { rows: [] };
    plan.push({ row, ...planRow({ row, rowKnownVoice: row.known_voice, rowKnownLanguage: row.known_language, candidates }) });
  }

  for (const p of plan) {
    const tag = `${p.row.pod_id} row ${p.row.global_order}`;
    if (p.action === 'link') {
      console.log(`LINK  ${tag}`);
      for (const x of p.picks) console.log(`        ${JSON.stringify(x.sentence)} → ${x.clip.id} (${x.clip.course_code} ${x.clip.role} ${x.clip.voice_id})`);
    } else console.log(`skip  ${tag}: ${p.reason}`);
  }
  const links = plan.filter((p) => p.action === 'link');
  console.log(`\n${rows.length} rows with an unsplit known side in live pods; ${links.length} can be linked to existing clips; ${rows.length - links.length} skipped.`);
  if (!apply) { console.log('dry run — pass --apply to write'); await pg.end(); return; }

  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const byCourse = new Map();
  for (const p of links) {
    // Before-state assertion: the row still has exactly the known ids we planned against.
    const res = await pg.query(
      `update listening_pod_sentences set sentence_known_audio_ids = $1::uuid[], updated_at = now()
        where id = $2 and sentence_known_audio_ids is not distinct from $3::uuid[] returning id`,
      [p.ids, p.row.id, p.row.sentence_known_audio_ids]);
    if (res.rowCount !== 1) { console.error(`DRIFT ${p.row.id}: row changed since planning — not written`); continue; }
    const course = p.row.pod_id.split(':')[0];
    if (!byCourse.has(course)) byCourse.set(course, []);
    byCourse.get(course).push({ id: p.row.id, pod_id: p.row.pod_id, before: p.row.sentence_known_audio_ids, after: p.ids });
  }
  for (const [course, done] of byCourse) {
    await recordContentEdit(sb, {
      identity: serviceIdentity(SWEEP, { role: 'content-sweep' }),
      courseCode: course, surface: `tools/pods/${SWEEP}.cjs`, operation: 'pod-known-clips-relink',
      scope: { rows: done.length, pod_sentence_ids: done.map((d) => d.id) },
      detail: { job: JOB, rows: done },
    });
  }
  console.log(`applied: ${[...byCourse.values()].reduce((n, d) => n + d.length, 0)} rows across ${byCourse.size} courses`);
  await pg.end();
}

module.exports = { planRow, splitSentences, textKey, isArabicHold };

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
