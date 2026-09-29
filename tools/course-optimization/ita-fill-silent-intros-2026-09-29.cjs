#!/usr/bin/env node
'use strict';
// ita_for_eng — render the three intros left silent by the 28 Sept audio stop (S0159L01, S0513L03,
// S0607L02) and link them. AUDIO ONLY: the intro texts are the ones jobs #673 / #667 already wrote;
// nothing is re-authored. Same Sonia presentation route and temporary one-row cast as their tools
// (cast restored byte-for-byte in finally). Job #700, Tom's go 2026-09-29 00:44Z.
//   APPLY=1 TTS_SPEND_JOB='#700·I' node tools/course-optimization/ita-fill-silent-intros-2026-09-29.cjs
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const COURSE = 'ita_for_eng';
const SWEEP = 'ita-fill-silent-intros-2026-09-29';
const TEMP = { slot: 'presentation', language: 'eng', gender: 'f', rank: 1, voice_id: 'en-GB-SoniaNeural' };

async function main() {
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const t667 = require('./ita-513-151-607-2026-09-28.cjs');
  const t159 = require('./ita-159-that-isnt-2026-09-28.cjs');
  const { sameCast } = require('./ita-sonia-temporary-fill-2026-09-28.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const lines = [
    { legoId: 'S0159L01', text: t159.INTRO.text },
    { legoId: t667.S513.lego.id, text: t667.S513.intro },
    { legoId: t667.S607.lego.id, text: t667.S607.intro },
  ];
  const engCast = async () => (await pg.query(`SELECT slot, language, gender, rank, voice_id, notes, assigned_by, created_at, updated_at FROM voice_language_roles WHERE language='eng' ORDER BY slot, gender, rank, voice_id`)).rows;
  try {
    for (const l of lines) {
      const { rows: [r] } = await pg.query('SELECT presentation_audio_id FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, l.legoId]);
      l.silent = !r.presentation_audio_id;
      console.log(`${l.legoId} ${l.silent ? 'SILENT' : 'already has an intro'}: ${l.text}`);
    }
    if (process.env.APPLY !== '1') return;
    const before = await engCast();
    let castRow = false;
    try {
      // same one-row temporary cast as job #667's presentation route.
      await pg.query(`INSERT INTO voice_language_roles (slot, language, gender, rank, voice_id, notes, assigned_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [TEMP.slot, TEMP.language, TEMP.gender, TEMP.rank, TEMP.voice_id, 'TEMPORARY — job #700 intros fill (Kai #546 Sonia presentation route). Removed by the same run.', SWEEP]);
      castRow = true;
      for (const l of lines.filter((x) => x.silent)) {
        try {
          const { audioId, how } = await t667.renderSoniaPresentation(pg, supabase, l.text, l.legoId);
          await pg.query('UPDATE course_legos SET presentation_audio_id=$1 WHERE course_code=$2 AND lego_id=$3 AND presentation_audio_id IS NULL', [audioId, COURSE, l.legoId]);
          await pg.query(`INSERT INTO lego_introductions (course_code, lego_id, presentation_audio_id, audio_uuid, updated_at) VALUES ($1,$2,$3,$3,now()) ON CONFLICT (course_code, lego_id) DO UPDATE SET presentation_audio_id=EXCLUDED.presentation_audio_id, audio_uuid=EXCLUDED.audio_uuid, updated_at=now()`, [COURSE, l.legoId, audioId]);
          console.log(`  ${l.legoId}: ${how} → linked ${audioId}`);
        } catch (e) { console.log(`  ${l.legoId}: SILENT — ${e.message}`); }
      }
    } finally {
      if (castRow) await pg.query(`DELETE FROM voice_language_roles WHERE slot=$1 AND language=$2 AND gender=$3 AND rank=$4 AND voice_id=$5 AND assigned_by=$6`, [TEMP.slot, TEMP.language, TEMP.gender, TEMP.rank, TEMP.voice_id, SWEEP]);
      console.log(`English cast ${sameCast(before, await engCast()) ? 'RESTORED byte-for-byte' : 'NOT RESTORED — fix by hand'}`);
    }
  } finally { await pg.end(); }
}
main().catch((e) => { console.error(e); process.exit(1); });
