#!/usr/bin/env node
'use strict';
// tools/course-optimization/heb-female-forms-358-2026-10-14.cjs
//
// Job #358·Q (Kai approved 2026-10-14). The 23 heb_for_eng texts that #837/#843 listed as live with no
// course_gender_expansions row (evidence: gender-expansions-resync-2026-09-29-stale-keyed-rowless-live-texts.json).
// Kai's rule (29 Sept): a female form only where the gendered word refers to the SPEAKER. Of the 23, these 11 do
// ("I must", "I was asking", "I had known", "I'm afraid", "I'm going to run" ...). The other 12 are bare adjectives or
// verbs ("young", "busy", "giving") or forms identical for both genders (אגמור, אשאל, אוכל) and get NO row.
// Hand-written, not model-generated: the forms are plain gendered inflection and were checked against the live text.
//   node …            DRY RUN     APPLY=1 node …   writes (rows only; the clips are rendered through /api/audio/render)
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const { evidencePath } = require('../lib/evidence-path.cjs');

const SWEEP = 'heb-female-forms-358-2026-10-14';
const SURFACE = 'tools/course-optimization/heb-female-forms-358-2026-10-14.cjs';
const COURSE = 'heb_for_eng';
const APPLY = process.env.APPLY === '1';
// [live text (the key, quotes included), female form]
const FORMS = [
  ['"הייתי מבקש"', '"הייתי מבקשת"'],
  ['"אני חייב"', '"אני חייבת"'],
  ['"הייתי צריך"', '"הייתי צריכה"'],
  ['"שאני מכיר"', '"שאני מכירה"'],
  ['"הייתי יודע"', '"הייתי יודעת"'],
  ['"אני מכיר"', '"אני מכירה"'],
  ['"שהייתי צריך"', '"שהייתי צריכה"'],
  ['"אני חושש"', '"אני חוששת"'],
  ['אני הולך לרוץ על הדשא.', 'אני הולכת לרוץ על הדשא.'],
  ['זה הכי פחות שאני יכול לעשות.', 'זה הכי פחות שאני יכולה לעשות.'],
  ['אני הולך לנסות להסביר למה אני מתכוון.', 'אני הולכת לנסות להסביר למה אני מתכוונת.'],
];

async function main() {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, at: new Date().toISOString(), apply: APPLY, rows: [] };
  const todo = [];
  for (const [text, f] of FORMS) {
    const live = (await pg.query(`SELECT (SELECT count(*) FROM course_practice_phrases WHERE course_code=$1 AND target_text=$2)
      + (SELECT count(*) FROM course_legos WHERE course_code=$1 AND target_text=$2)
      + (SELECT count(*) FROM course_seeds WHERE course_code=$1 AND target_text=$2) n`, [COURSE, text])).rows[0].n;
    const has = (await pg.query(`SELECT id FROM course_gender_expansions WHERE course_code=$1 AND original_text=$2 AND text_side='target'`, [COURSE, text])).rows.length;
    console.log(`${has ? 'EXISTS' : live > 0 ? 'todo  ' : 'NOT LIVE'} ${text}  →  ${f}`);
    if (!has && live > 0) todo.push({ course_code: COURSE, original_text: text, language: 'heb', text_side: 'target', expanded_f: f, expanded_m: null });
  }
  if (APPLY && todo.length) {
    const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
    const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
    const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
    log.eventId = await recordContentEdit(sb, { identity, courseCode: COURSE, surface: SURFACE, operation: 'gender-expansion-add',
      scope: { rows: todo.length }, detail: { job: '#358·Q', rule: 'female form only where the word refers back to the speaker' } });
    const { error } = await sb.from('course_gender_expansions').upsert(todo, { onConflict: 'course_code,original_text,text_side', ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    log.rows = todo;
  }
  const out = evidencePath(`tools/course-optimization/${SWEEP}-${APPLY ? 'applied' : 'dryrun'}-log.json`);
  fs.writeFileSync(out, JSON.stringify({ ...log, todo }, null, 1));
  console.log(`${APPLY ? 'APPLIED' : 'DRY RUN'} ${todo.length} rows. evidence: ${out}`);
  await pg.end();
}
main().catch(e => { console.error(e); process.exit(1); });
