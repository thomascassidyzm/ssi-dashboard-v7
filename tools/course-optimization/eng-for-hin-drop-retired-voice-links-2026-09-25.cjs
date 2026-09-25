#!/usr/bin/env node
'use strict';
// eng_for_hin — detach every clip link that points at a RETIRED voice, so the joint render can fill the slot in the voice
// of record (job #181·I, 2026-09-25; Kai's approval 10:26Z for the final checks + full render).
//
// WHY. phase8 /generate fills NULL slots only. Kai's rulings retired Eve/Swara on the Hindi side (Kriti f / Rehan m by the
// grammar of the line, #941·H) and the xAI/Azure English voices (Charlotte target1, Tom clone target2, #863/#827), but a
// slot that still LINKS a clip in a retired voice is not null, so no fill pass ever touches it: 1,812 Hindi slots still
// played Eve, 5,157 English slots still played the xAI voices, and 13 male-form lines played Kriti. /regenerate-role
// (in-place re-voice) is not gender-aware, so it cannot be used for the Hindi side; the honest tool is to detach the link,
// log the drop with the old id (content_audio_link_drops, reversible), and let /generate render or relink in the right
// voice. No course_audio row and no S3 object is touched: the old clips stay exactly where they are.
//
// WHAT COUNTS AS RETIRED. A voice not in the course's voice_config for that role: known → Kriti/Rehan (either), target1 →
// Charlotte, target2 → Tom clone. Plus the gender rule on the known side: a clip whose voice is not the one the line's
// text resolves to (services/shared/known-voice-gender.cjs) — e.g. a male-form phrase linked to a Kriti clip.
//
//   node tools/course-optimization/eng-for-hin-drop-retired-voice-links-2026-09-25.cjs            # dry run: counts by table/role/voice
//   node tools/course-optimization/eng-for-hin-drop-retired-voice-links-2026-09-25.cjs --apply
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
const { Client } = require('pg');

const COURSE = 'eng_for_hin';
const JOB = '#181·I';
const SWEEP = 'eng-for-hin-drop-retired-voice-links-2026-09-25';
const KRITI = 'cartesia_5283efe8-07d1-4e3a-b615-2ae4a81c1b73';
const REHAN = 'cartesia_205fc552-2cce-4307-baa1-598b9dc3dd01';
const CHARLOTTE = 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121';
const TOM = 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2';

const SLOTS = [
  { table: 'course_practice_phrases', idCol: 'id', col: 'known_audio_id', role: 'known', textCol: 'known_text' },
  { table: 'course_practice_phrases', idCol: 'id', col: 'target1_audio_id', role: 'target1', textCol: 'target_text' },
  { table: 'course_practice_phrases', idCol: 'id', col: 'target2_audio_id', role: 'target2', textCol: 'target_text' },
  { table: 'course_legos', idCol: 'lego_id', col: 'known_audio_id', role: 'known', textCol: 'known_text' },
  { table: 'course_legos', idCol: 'lego_id', col: 'target1_audio_id', role: 'target1', textCol: 'target_text' },
  { table: 'course_legos', idCol: 'lego_id', col: 'target2_audio_id', role: 'target2', textCol: 'target_text' },
  { table: 'course_seeds', idCol: 'seed_id', col: 'known_audio_id', role: 'known', textCol: 'known_text' },
  { table: 'course_seeds', idCol: 'seed_id', col: 'target1_audio_id', role: 'target1', textCol: 'target_text' },
  { table: 'course_seeds', idCol: 'seed_id', col: 'target2_audio_id', role: 'target2', textCol: 'target_text' },
];

/** The voice a linked clip must have, or null when the link is fine. Pure. */
function retiredReason({ role, voice, wantedKnownVoice }) {
  const v = String(voice || '');
  if (role === 'target1') return v === CHARLOTTE ? null : `target1 is Charlotte (Kai #863); clip is ${v || 'unknown'}`;
  if (role === 'target2') return v === TOM ? null : `target2 is the Tom clone (Kai #827); clip is ${v || 'unknown'}`;
  if (role === 'known') {
    if (v !== KRITI && v !== REHAN) return `known is Kriti/Rehan (Kai #941·H); clip is ${v || 'unknown'}`;
    if (wantedKnownVoice && v !== wantedKnownVoice) return `known line's grammar wants ${wantedKnownVoice === REHAN ? 'Rehan' : 'Kriti'}; clip is ${v === REHAN ? 'Rehan' : 'Kriti'}`;
    return null;
  }
  return null;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  // gender context, the same way phase8 builds it
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const kvg = require('../../services/shared/known-voice-gender.cjs');
  const { data: course } = await sb.from('courses').select('voice_config').eq('course_code', COURSE).single();
  const { data: pairs } = await sb.from('course_gender_expansions').select('original_text, expanded_m, expanded_f').eq('course_code', COURSE).eq('text_side', 'known').limit(100000);
  // legos + seeds feed the anchor set (neutral LEGO/seed lines are anchored female), exactly as phase8 knownGenderContextFor does
  const legos = [], seeds = [];
  for (let from = 0; ; from += 1000) { const { data } = await sb.from('course_legos').select('lego_id, known_text').eq('course_code', COURSE).range(from, from + 999); legos.push(...(data || [])); if (!data || data.length < 1000) break; }
  for (let from = 0; ; from += 1000) { const { data } = await sb.from('course_seeds').select('known_text').eq('course_code', COURSE).range(from, from + 999); seeds.push(...(data || [])); if (!data || data.length < 1000) break; }
  const ctx = { ...kvg.buildKnownGenderContext({ courseCode: COURSE, voices: course.voice_config.voices, pairs: pairs || [], legos, seeds }), voices: course.voice_config.voices };
  const wantedKnown = (text) => kvg.knownVoiceIdForClip(ctx, { role: 'known', text });

  const drops = [];
  for (const s of SLOTS) {
    const { rows } = await pg.query(`select t.${s.idCol} as row_id, t.seed_number, t.${s.textCol} as text, a.id as audio_id, a.voice_id, a.text as clip_text from ${s.table} t join course_audio a on a.id = t.${s.col} where t.course_code = $1`, [COURSE]);
    for (const r of rows) {
      const reason = retiredReason({ role: s.role, voice: r.voice_id, wantedKnownVoice: s.role === 'known' ? wantedKnown(r.text) : null });
      if (reason) drops.push({ table_name: s.table, row_id: String(r.row_id), course_code: COURSE, seed_number: r.seed_number, column_name: s.col, role: s.role, old_audio_id: r.audio_id, old_text: r.clip_text, new_text: r.text, old_voice_id: r.voice_id, reason: `${SWEEP} (job ${JOB}): ${reason}` });
    }
  }
  const by = {};
  for (const d of drops) { const k = `${d.table_name}.${d.column_name} ← ${d.old_voice_id}`; by[k] = (by[k] || 0) + 1; }
  console.log(`${drops.length} retired-voice links to detach:`); for (const [k, n] of Object.entries(by).sort()) console.log(`  ${String(n).padStart(6)}  ${k}`);
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const ev = evidencePath(`tools/course-optimization/${SWEEP}${apply ? '' : '-dryrun'}.json`);
  fs.writeFileSync(ev, JSON.stringify({ sweep: SWEEP, job: JOB, at: new Date().toISOString(), apply, counts: by, drops }, null, 1));
  console.log(`evidence: ${ev}`);
  if (!apply) { console.log('DRY RUN — nothing written.'); await pg.end(); return; }

  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const eventId = await recordContentEdit(sb, { identity, courseCode: COURSE, surface: `tools/course-optimization/${SWEEP}.cjs`, operation: 'audio-link-drop', scope: { slots: drops.length }, detail: { job: JOB, counts: by, evidence: ev, reversible: 'content_audio_link_drops rows carry old_audio_id' } });
  console.log(`edit event ${eventId}`);
  let done = 0;
  for (let i = 0; i < drops.length; i += 25) {
    const batch = drops.slice(i, i + 25);
    await pg.query('begin');
    for (const d of batch) {
      const idCol = SLOTS.find(s => s.table === d.table_name).idCol;
      const res = await pg.query(`update ${d.table_name} set ${d.column_name} = null where course_code = $1 and ${idCol} = $2 and ${d.column_name} = $3`, [COURSE, d.row_id, d.old_audio_id]);
      if (res.rowCount !== 1) { await pg.query('rollback'); throw new Error(`${d.table_name}:${d.row_id}.${d.column_name} did not update (rowCount ${res.rowCount}) — stopped at ${done}`); }
      await pg.query(`insert into content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, old_text, new_text, old_voice_id, reason) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [d.table_name, d.row_id, d.course_code, d.seed_number, d.column_name, d.role, d.old_audio_id, d.old_text, d.new_text, d.old_voice_id, d.reason]);
      done++;
    }
    await pg.query('commit');
    if (done % 500 < 25) console.log(`  ${done}/${drops.length}`);
  }
  const { rows: [{ n }] } = await pg.query(`select count(*)::int n from content_audio_link_drops where course_code=$1 and reason like $2`, [COURSE, `${SWEEP}%`]);
  console.log(`detached ${done}; drop log rows for this sweep: ${n}`);
  await pg.end();
}

module.exports = { retiredReason, KRITI, REHAN, CHARLOTTE, TOM };
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
