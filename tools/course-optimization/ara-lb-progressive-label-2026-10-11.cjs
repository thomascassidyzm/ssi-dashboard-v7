#!/usr/bin/env node
'use strict';
// tools/course-optimization/ara-lb-progressive-label-2026-10-11.cjs — job #195 (incident #174).
//
// ara_lb_for_eng S0372L01 had a component whose known side was the LABEL "[progressive]" (target عم). TTS only ever
// speaks examples (Tom, r-2026-10-11-text-sent-to-tts-is-only), and the audio pass sent that label to a voice. The
// label is dropped by MERGING the particle into the word it modifies (a construction-feature is absorbed into a whole
// intention, never glossed bare — ralph "Intention-units vs construction-features"):
//   components  she was | [progressive] | she tries | she does   →   she was | she's trying | she does
//   C03  "[progressive]"/عم  →  "she's trying"/عم تحاول   (a contiguous slice of the seed target, so membership holds)
//   C04  "she tries"/تحاول   →  deleted (its words now live in C03)
//   C05  component_index 4   →  3 (keeps the components JSON and the rows in step)
//
//   node tools/course-optimization/ara-lb-progressive-label-2026-10-11.cjs           # dry run: before-state asserted, nothing written
//   APPLY=1 node …                                                                    # one transaction + queued audio-pass request
// Needs the secret-zero env (DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY). Never renders audio.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ara_lb_for_eng';
const LEGO = 'S0372L01';
const SWEEP = 'ara-lb-progressive-label-2026-10-11';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const ID = (n) => `${COURSE}:S0372L01C0${n}`;
const BEFORE_COMPONENTS = [{ known: 'what', target: 'شو' }, { known: 'she was', target: 'كانت' }, { known: '[progressive]', target: 'عم' }, { known: 'she tries', target: 'تحاول' }, { known: 'she does', target: 'تعمل' }];
const AFTER_COMPONENTS = [{ known: 'what', target: 'شو' }, { known: 'she was', target: 'كانت' }, { known: "she's trying", target: 'عم تحاول' }, { known: 'she does', target: 'تعمل' }];
const SEED_TARGET = 'شفت شو كانت عم تحاول تعمل؟';

async function main() {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const apply = process.env.APPLY === '1';
  const probs = [];
  const { rows: [lego] } = await pg.query('SELECT components FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, LEGO]);
  if (JSON.stringify(lego && lego.components) !== JSON.stringify(BEFORE_COMPONENTS)) probs.push(`lego components drifted: ${JSON.stringify(lego && lego.components)}`);
  const { rows: comp } = await pg.query('SELECT id, known_text, target_text, metadata FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) ORDER BY id', [COURSE, [ID(3), ID(4), ID(5)]]);
  const by = Object.fromEntries(comp.map((r) => [r.id, r]));
  const expect = { [ID(3)]: ['[progressive]', 'عم', 2], [ID(4)]: ['she tries', 'تحاول', 3], [ID(5)]: ['she does', 'تعمل', 4] };
  for (const [id, [k, t, idx]] of Object.entries(expect)) {
    const r = by[id];
    if (!r || r.known_text !== k || r.target_text !== t || r.metadata.component_index !== idx) probs.push(`${id} drifted: ${JSON.stringify(r)}`);
  }
  if (!SEED_TARGET.includes('عم تحاول')) probs.push('merged target is not a contiguous slice of the seed');
  console.log(`${apply ? 'APPLY' : 'DRY RUN'}: ${probs.length ? 'PROBLEMS\n  ' + probs.join('\n  ') : 'before-state matches; would merge C03+C04 into "she\'s trying"/عم تحاول, delete C04, reindex C05'}`);
  if (probs.length) { await pg.end(); process.exit(2); }
  if (!apply) { await pg.end(); return; }

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: op, scope, detail: { ruling: 'Tom r-2026-10-11-text-sent-to-tts-is-only: TTS only ever speaks examples', job: '#195 (incident #174)', ...detail } });
  const eLego = await ev('lego-edit', { seed_numbers: [372], lego_ids: [LEGO], rows: 1 }, { change: 'components: drop the [progressive] label by merging عم into تحاول' });
  const ePhrase = await ev('phrase-edit', { seed_numbers: [372], phrase_ids: [ID(3), ID(5)], rows: 2 }, { change: 'C03 "[progressive]"/عم → "she\'s trying"/عم تحاول; C05 component_index 4→3' });
  const eDel = await ev('phrase-delete', { seed_numbers: [372], phrase_ids: [ID(4)], rows: 1 }, { deleted: 'C04 "she tries"/تحاول — merged into C03; its words are still taught by C03' });
  await pg.query('BEGIN');
  try {
    let r = await pg.query('UPDATE course_legos SET components=$1, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND lego_id=$4 AND components=$5::jsonb', [JSON.stringify(AFTER_COMPONENTS), eLego, COURSE, LEGO, JSON.stringify(BEFORE_COMPONENTS)]);
    if (r.rowCount !== 1) throw new Error(`lego: ${r.rowCount} rows`);
    r = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, qa_checked=NULL, known_gloss_segments=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$4, updated_at=now() WHERE course_code=$5 AND id=$6 AND known_text='[progressive]' AND target_text='عم'`, ["she's trying", 'عم تحاول', 'عم تحاول'.length, ePhrase, COURSE, ID(3)]);
    if (r.rowCount !== 1) throw new Error(`C03: ${r.rowCount} rows`);
    r = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, ID(4), 'she tries', 'تحاول']);
    if (r.rowCount !== 1) throw new Error(`C04 delete: ${r.rowCount} rows`);
    r = await pg.query(`UPDATE course_practice_phrases SET metadata=jsonb_set(metadata,'{component_index}','3'), last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND id=$3 AND known_text='she does'`, [ePhrase, COURSE, ID(5)]);
    if (r.rowCount !== 1) throw new Error(`C05: ${r.rowCount} rows`);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  void eDel;
  await require('../../services/shared/round-index-refresh.cjs').refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  const q = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: 'job #195: S0372L01 component C03 "[progressive]" → "she\'s trying"/عم تحاول; slot needs audio' });
  console.log('APPLIED. audio-pass request:', JSON.stringify(q));
  await pg.end();
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
