#!/usr/bin/env node
'use strict';
// Follow-on to ita-919-small-fixes-2026-09-30.cjs (job #919·I): the intro-mirror exit check found what the main write left behind.
//  · the two OLD LEGO intro clips (S0072L02 "…you're doing", S0655L01 "…that you're doing") were still keyed to their LEGO in course_audio.lego_id
//    now that the LEGO has a new intro: un-key them (the clips themselves are NOT deleted — make-before-break, deletion is Tom's plan to approve);
//  · S0129L01's two COMPONENT rows still carried intros for the old tiles ("happy that you're doing", "so well"): components are never played
//    (canon), so the link is dropped rather than re-authored; the clips stay.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const COURSE = 'ita_for_eng', SWEEP = 'ita-919-intro-cleanup-2026-09-30';
(async () => {
  const { Client } = require('pg'); const { createClient } = require('@supabase/supabase-js');
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const ev = await recordContentEdit(sb, { identity: serviceIdentity(SWEEP, { role: 'content-sweep' }), courseCode: COURSE, surface: `tools/course-optimization/${SWEEP}.cjs`, operation: 'audio-link-drop',
    scope: { seed_numbers: [72, 129, 655], lego_ids: ['S0072L02', 'S0655L01'], phrase_ids: ['ita_for_eng:S0129L01C01', 'ita_for_eng:S0129L01C02'], rows: 4 },
    detail: { job: '#919·I', unkeyed_clips: ['7f17c638-8eab-48ac-9445-42ce5f607897', 'a60456cc-0d7c-45f1-9a52-ad8710cad7e4'], dropped_component_intros: ['b3493b5f-314a-44ff-80a8-bb7fc1030c86', 'e3613a42-b14b-4cc3-995d-b76382ebe412'] } });
  await pg.query('BEGIN');
  const a = await pg.query(`UPDATE course_audio SET lego_id=NULL WHERE course_code=$1 AND id = ANY($2::uuid[]) AND lego_id IN ('S0072L02','S0655L01')`, [COURSE, ['7f17c638-8eab-48ac-9445-42ce5f607897', 'a60456cc-0d7c-45f1-9a52-ad8710cad7e4']]);
  const b = await pg.query(`UPDATE course_practice_phrases SET presentation_audio_id=NULL, last_edit_event_id=$2 WHERE course_code=$1 AND id IN ('ita_for_eng:S0129L01C01','ita_for_eng:S0129L01C02')`, [COURSE, ev]);
  if (a.rowCount !== 2 || b.rowCount !== 2) { await pg.query('ROLLBACK'); throw new Error(`unexpected counts ${a.rowCount}/${b.rowCount}`); }
  await pg.query('COMMIT'); await pg.end(); console.log('done', a.rowCount, b.rowCount);
})().catch((e) => { console.error(e); process.exit(1); });
