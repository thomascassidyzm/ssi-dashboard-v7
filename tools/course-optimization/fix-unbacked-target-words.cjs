#!/usr/bin/env node
/*
 * fix-unbacked-target-words.cjs — apply DELETION-ONLY repairs for the
 * unbacked-extra-word defect class (Tom's ruling, 2026-08-31).
 *
 * The repair is ALWAYS a deletion of a surplus span from target_text. It never
 * rewrites, re-inflects, re-orders or adds a word: a rewrite could introduce
 * vocabulary the learner has not been taught, which is a worse defect than the
 * one being fixed. A row whose repair is not a pure deletion is not applied.
 *
 * GATES (all fail-closed, per the 2026-07-04 sweep protocol):
 *   - DRY RUN is the default; --apply is required to write.
 *   - per-row before-state assertion: the row's CURRENT target_text must equal
 *     the `target` recorded at triage time, or the row is skipped (drift).
 *   - deletion check: corrected_target must be reachable from target by
 *     removing surplus_span and normalising whitespace. Anything else aborts.
 *   - ZUT, production direction: after the edit, this row's known_text must not
 *     map to two different targets among LEGO/BUILD/USE rows in the course.
 *     A collision that ALREADY exists before the edit and is REMOVED by it is
 *     reported as a resolution, not a block.
 *   - every row is logged to the --log file, applied or not.
 *
 * Audio: the plain UPDATE fires trg_null_phrase_audio_on_text_change, which
 * relinks to a same-voice clip of the new text if one exists and NULLs the link
 * otherwise. We never hand-write the NULLing UPDATE. Rows left silent are
 * counted and reported so an audio pass can be queued for them.
 *
 * usage: node tools/course-optimization/fix-unbacked-target-words.cjs \
 *          --in verdicts.json --log out-log.json [--apply]
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.psql') });
const { Client } = require('pg');

const argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf(k); return i > -1 ? argv[i + 1] : null; };
const APPLY = argv.includes('--apply');
const IN = opt('--in'), LOG = opt('--log');
if (!IN || !LOG) { console.error('usage: --in verdicts.json --log log.json [--apply]'); process.exit(2); }

const norm = s => String(s || '').toLowerCase().normalize('NFC')
  .replace(/[¿¡]/g, '').replace(/[.,!?;:"“”()\-–—]/g, ' ').replace(/\s+/g, ' ').trim();
const tidy = s => String(s).replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();

function deletionReachable(target, span, corrected) {
  if (!span || !target.includes(span)) return false;
  return tidy(target.replace(span, ' ')) === tidy(corrected);
}

async function main() {
  const rows = JSON.parse(fs.readFileSync(IN, 'utf8')).filter(r => r.verdict === 'DEFECT');
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const log = [];
  let applied = 0, skipped = 0, silent = 0, relinked = 0;

  for (const r of rows) {
    const rec = { id: r.id, course: r.course, verdict: r.verdict, was: null, now: r.corrected_target, action: null, why: null };
    const cur = (await c.query('select known_text,target_text,course_code from course_practice_phrases where id=$1', [r.id])).rows[0];
    if (!cur) { rec.action = 'skip'; rec.why = 'row not found'; log.push(rec); skipped++; continue; }
    rec.was = cur.target_text; rec.known = cur.known_text;

    if (cur.target_text !== r.target) { rec.action = 'skip'; rec.why = `drift: live target "${cur.target_text}" != triaged "${r.target}"`; log.push(rec); skipped++; continue; }
    if (!r.corrected_target || !deletionReachable(cur.target_text, r.surplus_span, r.corrected_target)) {
      rec.action = 'skip'; rec.why = 'not reachable by deleting surplus_span — repair is a rewrite, not a deletion'; log.push(rec); skipped++; continue;
    }
    if (norm(r.corrected_target) === norm(cur.target_text)) { rec.action = 'skip'; rec.why = 'no change'; log.push(rec); skipped++; continue; }

    // ZUT, production direction, over LEGO/BUILD/USE rows (components exempt on
    // the known side — feedback_ssi_component_row_zut_scope).
    const sib = (await c.query(
      `select id, target_text from course_practice_phrases
        where course_code=$1 and phrase_role in ('build','use') and id<>$2
          and lower(btrim(known_text)) = lower(btrim($3))`, [cur.course_code, r.id, cur.known_text])).rows;
    const before = new Set(sib.map(s => norm(s.target_text)).concat(norm(cur.target_text)));
    const after = new Set(sib.map(s => norm(s.target_text)).concat(norm(r.corrected_target)));
    if (after.size > before.size) {
      rec.action = 'skip'; rec.why = `ZUT: edit would fork "${cur.known_text}" into ${after.size} targets`; log.push(rec); skipped++; continue;
    }
    rec.zut = before.size > after.size ? `resolves a pre-existing ZUT fork on "${cur.known_text}"`
      : after.size > 1 ? `pre-existing ZUT fork on "${cur.known_text}" untouched by this edit` : 'clean';
    if (after.size < before.size) rec.duplicate_created = sib.filter(s => norm(s.target_text) === norm(r.corrected_target)).map(s => s.id);

    if (!APPLY) { rec.action = 'would-apply'; log.push(rec); continue; }

    await c.query('update course_practice_phrases set target_text=$2 where id=$1', [r.id, r.corrected_target]);
    const post = (await c.query('select target_text,target1_audio_id,target2_audio_id from course_practice_phrases where id=$1', [r.id])).rows[0];
    rec.action = 'applied';
    rec.audio_after = { t1: post.target1_audio_id, t2: post.target2_audio_id };
    if (post.target1_audio_id || post.target2_audio_id) { rec.audio = 'relinked'; relinked++; }
    else { rec.audio = 'silent — needs an audio pass'; silent++; }
    log.push(rec); applied++;
  }
  await c.end();
  fs.writeFileSync(LOG, JSON.stringify(log, null, 1));
  console.log(`${APPLY ? 'APPLIED' : 'DRY RUN'}: ${rows.length} DEFECT rows in — ${applied} written, ${skipped} skipped, relinked ${relinked}, silent ${silent}. Log: ${LOG}`);
  for (const l of log.filter(x => x.action === 'skip')) console.log(`  SKIP ${l.id}: ${l.why}`);
}
main().catch(e => { console.error('FATAL', e.message); process.exit(1); });
