#!/usr/bin/env node
'use strict';
// tools/course-optimization/gender-expansions-resync-2026-09-29.cjs
//
// Job #821 (Kai's finding, 2026-09-29): course_gender_expansions rows were generated once (15 Jul) and the
// phrases they were derived from have since been edited. Two defects, repaired here; the write-time hook that
// stops it recurring is services/shared/gender-expansion-sync.cjs (wired in the content-edit gate).
//
//   ORPHAN  a target-side row whose original_text is no longer the target_text of any seed, lego or phrase of its
//           course AND is not the text of any course_audio clip of that course. Nothing can look it up any more, so
//           it is deleted; the full row goes in the evidence log (restorable). A row still named by an audio clip is KEPT.
//   MISSING a course text edited through an attributed path (last_edit_event_id set) since the course's rows were
//           made, that has no row. Given one by the existing generator (gender-haiku-service.ensureExpansionForText,
//           prompt rule: female form only where the word refers back to the speaker). Existing rows are never
//           overwritten, so hand fixes stand.
//
//   STALE   an orphan whose text IS still live under another surface form (case, bookend punctuation, quotes:
//           "sono pronto a imparare." vs live "sono pronto a imparare"). The render key is exact, so the old row
//           serves nothing, but the live text may have no row. Its live text is generated like a MISSING one, and
//           the stale row goes only once that generation has succeeded. The old forms are never copied across:
//           some were wrong (Hebrew "אגמרה"), so the current prompt decides afresh.
//
// ORDER (job #837, Astra card 887): generate first, then delete. If ANY generation in a course fails, nothing in
// that course is deleted and no edit event is filed. Pass one of #821 ran with the model unreachable (ENOENT),
// failed all 44 generations, and still deleted 142 rows and filed 25 events. Applied logs are timestamped so a
// re-run can never overwrite the record of what an earlier run deleted.
//
// eng_for_hin is EXCLUDED: it is under active re-authoring by other jobs (7,625 attributed edits since its rows were
// made), so a repair now would race them. The hook covers its future edits; it is reported as a gap, not repaired.
//
//   node tools/course-optimization/gender-expansions-resync-2026-09-29.cjs            # DRY RUN, read-only, no model
//   APPLY=1 node …                                                                     # writes (model spend: cents)
//   COURSES=ita_for_eng,cat_for_eng node …                                             # restrict
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const { evidencePath } = require('../lib/evidence-path.cjs');

const SWEEP = 'gender-expansions-resync-2026-09-29';
const JOB = '#821';
const SURFACE = 'tools/course-optimization/gender-expansions-resync-2026-09-29.cjs';
const EXCLUDE = new Set(['eng_for_hin']);
const APPLY = process.env.APPLY === '1';
const GENERATED_OK = new Set(['written', 'exists', 'no-variants']);   // anything else is a generation that did not happen

// One sentence in two surface forms: differs only by case, punctuation (incl. quotes and ’ vs ') or spacing.
function surfaceKey(t) { return String(t).normalize('NFC').toLowerCase().replace(/[\p{P}\p{S}]+/gu, '').replace(/\s+/g, ' ').trim(); }

async function main() {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

  const courses = process.env.COURSES ? process.env.COURSES.split(',')
    : (await pg.query(`SELECT DISTINCT course_code FROM course_gender_expansions WHERE text_side='target' ORDER BY 1`)).rows.map(r => r.course_code).filter(c => !EXCLUDE.has(c));
  const log = { sweep: SWEEP, job: JOB, at: new Date().toISOString(), apply: APPLY, excluded: [...EXCLUDE], courses: {} };

  for (const c of courses) {
    if (EXCLUDE.has(c)) throw new Error(`${c} is excluded`);
    const orphans = (await pg.query(`
      SELECT g.id, g.original_text, g.language, g.expanded_f, g.expanded_m, g.processed_at FROM course_gender_expansions g
      WHERE g.course_code=$1 AND g.text_side='target'
        AND NOT EXISTS (SELECT 1 FROM course_practice_phrases p WHERE p.course_code=g.course_code AND p.target_text=g.original_text)
        AND NOT EXISTS (SELECT 1 FROM course_legos l WHERE l.course_code=g.course_code AND l.target_text=g.original_text)
        AND NOT EXISTS (SELECT 1 FROM course_seeds s WHERE s.course_code=g.course_code AND s.target_text=g.original_text)`, [c])).rows;
    const heard = orphans.length ? new Set((await pg.query(`SELECT DISTINCT text FROM course_audio WHERE course_code=$1 AND text = ANY($2)`, [c, orphans.map(o => o.original_text)])).rows.map(r => r.text)) : new Set();
    const keptForAudio = orphans.filter(o => heard.has(o.original_text));
    const deletable = orphans.filter(o => !heard.has(o.original_text));

    const missing = (await pg.query(`
      WITH m AS (SELECT max(processed_at) mx FROM course_gender_expansions WHERE course_code=$1 AND text_side='target'),
      t AS (SELECT target_text tx, updated_at u FROM course_practice_phrases WHERE course_code=$1 AND last_edit_event_id IS NOT NULL
            UNION ALL SELECT target_text, updated_at FROM course_legos WHERE course_code=$1 AND last_edit_event_id IS NOT NULL
            UNION ALL SELECT target_text, updated_at FROM course_seeds WHERE course_code=$1 AND last_edit_event_id IS NOT NULL)
      SELECT DISTINCT tx FROM t, m WHERE u > m.mx AND tx IS NOT NULL AND btrim(tx) <> ''
        AND NOT EXISTS (SELECT 1 FROM course_gender_expansions g WHERE g.course_code=$1 AND g.text_side='target' AND g.original_text=tx)`, [c])).rows.map(r => r.tx);

    // STALE: a deletable orphan whose text is live under another surface form, where that live text has no row.
    const stale = [];
    if (deletable.length) {
      const live = (await pg.query(`
        SELECT DISTINCT target_text AS live_text FROM (
          SELECT target_text FROM course_practice_phrases WHERE course_code=$1 UNION ALL
          SELECT target_text FROM course_legos WHERE course_code=$1 UNION ALL
          SELECT target_text FROM course_seeds WHERE course_code=$1) x WHERE target_text IS NOT NULL AND btrim(target_text) <> ''`, [c])).rows.map(r => r.live_text);
      const hasRow = new Set((await pg.query(`SELECT original_text FROM course_gender_expansions WHERE course_code=$1 AND text_side='target'`, [c])).rows.map(r => r.original_text));
      const liveByKey = new Map();
      for (const t of live) { const k = surfaceKey(t); if (!liveByKey.has(k)) liveByKey.set(k, []); liveByKey.get(k).push(t); }
      for (const o of deletable) {
        const rowless = (liveByKey.get(surfaceKey(o.original_text)) || []).filter(t => !hasRow.has(t));
        if (rowless.length) stale.push({ id: o.id, original_text: o.original_text, liveTexts: rowless });
      }
    }
    const toGenerate = [...new Set([...missing, ...stale.flatMap(s => s.liveTexts)])];

    const entry = log.courses[c] = { orphanRows: orphans.length, deletable: deletable.length, keptBecauseAudioNamesThem: keptForAudio.map(o => o.original_text), missingTexts: missing.length, staleKeyed: stale, toGenerate: toGenerate.length, deletedRows: [], wouldDelete: deletable, missing, written: [], statuses: {} };
    console.log(`${c.padEnd(16)} orphan ${String(orphans.length).padStart(3)} (delete ${deletable.length}, of which stale-keyed ${stale.length}; keep-for-audio ${keptForAudio.length})  missing ${missing.length}  to generate ${toGenerate.length}`);
    if (!APPLY || (!deletable.length && !toGenerate.length)) continue;

    // 1. Generate first. Every text must come back analysed, or nothing in this course is deleted.
    const { ensureExpansionForText } = require('../../services/gender-haiku-service.cjs');
    const failed = [];
    for (const t of toGenerate) {
      let status;
      try { status = (await ensureExpansionForText(c, t, sb)); } catch (e) { status = { status: 'error', error: e.message }; }
      entry.statuses[status.status] = (entry.statuses[status.status] || 0) + 1;
      if (status.status === 'written') entry.written.push(status.row);
      if (!GENERATED_OK.has(status.status)) failed.push({ text: t, status: status.status, error: status.error });
    }
    if (failed.length) {
      entry.deletionsRefused = `${failed.length} of ${toGenerate.length} generations did not succeed — nothing deleted in this course`;
      entry.failedGenerations = failed;
      console.log(`   REFUSED: ${entry.deletionsRefused}; statuses ${JSON.stringify(entry.statuses)}`);
      continue;
    }
    if (!deletable.length && !entry.written.length) { console.log(`   nothing to write; statuses ${JSON.stringify(entry.statuses)}`); continue; }

    // 2. Attribute, then delete. The event is filed only once there is something to attribute.
    const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
    const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
    const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
    const eventId = await recordContentEdit(sb, { identity, courseCode: c, surface: SURFACE, operation: 'gender-expansion-resync',
      scope: { orphan_rows: deletable.length, stale_keyed: stale.length, generated_texts: toGenerate.length }, detail: { job: JOB, rule: 'female form only where the word refers back to the speaker' } });
    entry.eventId = eventId;

    for (const o of deletable) {                       // before-state assertion: the row must still be exactly what we read
      const { data } = await sb.from('course_gender_expansions').select('id, original_text, expanded_f, expanded_m').eq('id', o.id).maybeSingle();
      if (!data) continue;
      if (data.original_text !== o.original_text || data.expanded_f !== o.expanded_f || data.expanded_m !== o.expanded_m) throw new Error(`before-state drift on ${o.id} — aborting`);
      const { error } = await sb.from('course_gender_expansions').delete().eq('id', o.id);
      if (error) throw new Error(`delete ${o.id}: ${error.message}`);
      entry.deletedRows.push(o);
    }
    console.log(`   applied: event ${eventId}, deleted ${entry.deletedRows.length}, statuses ${JSON.stringify(entry.statuses)}`);
  }
  const stamp = APPLY ? `-${log.at.replace(/[:.]/g, '-')}` : '';   // an applied log is never overwritten by a re-run
  const out = evidencePath(`tools/course-optimization/${SWEEP}-${APPLY ? 'applied' : 'dryrun'}${stamp}-log.json`);
  fs.writeFileSync(out, JSON.stringify(log, null, 1));
  console.log(`${APPLY ? 'APPLIED' : 'DRY RUN — nothing written'}. evidence: ${out}`);
  await pg.end();
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { main, surfaceKey };
