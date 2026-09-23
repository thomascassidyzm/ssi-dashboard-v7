#!/usr/bin/env node
// eng_for_hin — apply the MECHANICAL hits of the Shuchita-rulebook checker (job #891·H, Kai, 2026-09-23).
//
// Reads a hits file written by eng-for-hin-shuchita-check.cjs --out and applies only hits with
// severity 'fix' AND a proposed text — the rules whose precedent is direct and whose edit is a
// string substitution (nukta spelling, के बजाय, किसने बताया, इसलिए नहीं, …). Everything else in the
// hits file is left for Kai. Dry-run by default; --apply writes.
//
// What a write does, in order: (1) snapshot the seed's LEGOs and phrases into seed_redo_snapshots
// (reason 'shuchita-rulebook-fix', undo = the same restore path the redo tool uses); (2) record one
// content_edit_events row per seed under serviceIdentity (SQL-side sweep, outside the HTTP gate —
// CLAUDE.md); (3) update known_text / target_text on the named rows, bumping version and stamping
// last_edit_event_id (the DB trigger nulls any audio on the changed text, so (4)); (4) queue an
// audio-pass request, APPENDING to any pending reason. Never renders TTS. Never touches approved_at:
// these edits are her own rulings applied, not new content — the report says which seeds were touched.
//
//   node tools/course-optimization/eng-for-hin-shuchita-apply-2026-09-23.cjs --hits hits.json [--seeds 128,132] [--apply]

'use strict';
const path = require('path');
const fs = require('fs');

const COURSE = 'eng_for_hin';
const SWEEP = 'eng-for-hin-shuchita-rulebook-fix-2026-09-23';
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const APPLY = args.includes('--apply');

function selectFixes(hitsFile, seedsFilter) {
  const hits = JSON.parse(fs.readFileSync(hitsFile, 'utf8')).hits || [];
  const fixes = hits.filter(h => h.kind === 'deterministic' && h.severity === 'fix' && h.proposed && (h.proposed.known || h.proposed.target) && h.role !== 'seed');
  const byId = {};
  for (const h of fixes) {
    if (seedsFilter && !seedsFilter.includes(h.seed)) continue;
    const cur = byId[h.id] || { seed: h.seed, id: h.id, role: h.role, known: h.known, target: h.target, rules: [], newKnown: h.known, newTarget: h.target };
    // apply successive proposals on top of each other (two rules may touch one row)
    if (h.proposed.known) cur.newKnown = h.proposed.known.replace(h.known, cur.newKnown) === h.proposed.known ? applyOnTop(cur.newKnown, h.known, h.proposed.known) : cur.newKnown;
    if (h.proposed.target) cur.newTarget = applyOnTop(cur.newTarget, h.target, h.proposed.target);
    cur.rules.push(h.rule);
    byId[h.id] = cur;
  }
  return Object.values(byId).filter(f => f.newKnown !== f.known || f.newTarget !== f.target);
}
// The proposal was computed from the ORIGINAL text; re-derive it as a diff and apply to the current working text.
function applyOnTop(working, original, proposed) {
  if (working === original) return proposed;
  // find the single substitution original→proposed and replay it on working
  let a = 0; while (a < original.length && a < proposed.length && original[a] === proposed[a]) a++;
  let b = 0; while (b < original.length - a && b < proposed.length - a && original[original.length - 1 - b] === proposed[proposed.length - 1 - b]) b++;
  const from = original.slice(a, original.length - b); const to = proposed.slice(a, proposed.length - b);
  return from ? working.split(from).join(to) : working;
}

async function main() {
  const hitsFile = opt('--hits'); if (!hitsFile) throw new Error('--hits <file> required');
  const seedsFilter = opt('--seeds') ? opt('--seeds').split(',').map(Number) : null;
  const fixes = selectFixes(hitsFile, seedsFilter);
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'}: ${fixes.length} row(s) across seeds ${[...new Set(fixes.map(f => f.seed))].sort((a, b) => a - b).join(' ') || '-'}`);
  for (const f of fixes) console.log(`  ${f.id} [${f.rules.join(',')}]\n     ${f.known} → ${f.target}\n     ${f.newKnown} → ${f.newTarget}`);
  if (!fixes.length) return;
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const ev = evidencePath(`tools/course-optimization/${SWEEP}${APPLY ? '' : '-dryrun'}.json`);
  fs.mkdirSync(path.dirname(ev), { recursive: true });
  fs.writeFileSync(ev, JSON.stringify({ sweep: SWEEP, at: new Date().toISOString(), apply: APPLY, fixes }, null, 1));
  console.log('evidence:', ev);
  if (!APPLY) return;

  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
  const { createClient } = require('@supabase/supabase-js');
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };
  const batchId = require('crypto').randomUUID();
  const seeds = [...new Set(fixes.map(f => f.seed))].sort((a, b) => a - b);
  for (const seed of seeds) {
    const seedRow = must(await supabase.from('course_seeds').select('known_text,target_text,approved_at,decomposed_at,flagged_at').eq('course_code', COURSE).eq('seed_number', seed).single(), `seed ${seed}`);
    const legos = must(await supabase.from('course_legos').select('*').eq('course_code', COURSE).eq('seed_number', seed), `legos ${seed}`);
    const phrases = must(await supabase.from('course_practice_phrases').select('*').eq('course_code', COURSE).eq('seed_number', seed), `phrases ${seed}`);
    must(await supabase.from('seed_redo_snapshots').insert({ batch_id: batchId, course_code: COURSE, seed_number: seed, reason: 'shuchita-rulebook-fix', notes: `${SWEEP}: ${fixes.filter(f => f.seed === seed).map(f => f.id + ' ' + f.rules.join(',')).join('; ')}`, seed_row: seedRow, legos, phrases, lego_count: legos.length, phrase_count: phrases.length }), `snapshot ${seed}`);
    const seedFixes = fixes.filter(f => f.seed === seed);
    const eventId = await recordContentEdit(supabase, {
      identity, courseCode: COURSE, surface: `tools/course-optimization/${SWEEP}.cjs`, operation: 'shuchita-rulebook-fix',
      scope: { seed_numbers: [seed], rows: seedFixes.length, phrase_ids: seedFixes.filter(f => f.role !== 'lego').map(f => f.id), lego_ids: seedFixes.filter(f => f.role === 'lego').map(f => f.id) },
      detail: { rules: [...new Set(seedFixes.flatMap(f => f.rules))], snapshot_batch_id: batchId, changes: seedFixes.map(f => ({ id: f.id, from: { known: f.known, target: f.target }, to: { known: f.newKnown, target: f.newTarget } })) },
    });
    for (const f of seedFixes) {
      const table = f.role === 'lego' ? 'course_legos' : 'course_practice_phrases';
      const key = f.role === 'lego' ? { lego_id: f.id } : { id: f.id };
      const cur = must(await supabase.from(table).select('version,known_text,target_text').eq('course_code', COURSE).match(key).single(), `read ${f.id}`);
      if (cur.known_text !== f.known || cur.target_text !== f.target) { console.log(`  SKIP ${f.id}: row moved under us`); continue; }
      must(await supabase.from(table).update({ known_text: f.newKnown, target_text: f.newTarget, version: (cur.version || 1) + 1, last_edit_event_id: eventId }).eq('course_code', COURSE).match(key), `update ${f.id}`);
      console.log(`  wrote ${f.id}`);
    }
  }
  // audio pass: append, never replace (the #880·H rail)
  const { appendAudioPassReason } = require('./eng-for-hin-mark-21-348-new-2026-09-23.cjs');
  const pending = must(await supabase.from('audio_pass_requests').select('id,reason').eq('course_code', COURSE).eq('status', 'pending').order('created_at', { ascending: false }).limit(1), 'pending audio pass');
  const reason = `${SWEEP}: ${fixes.length} Hindi spelling row(s) in seeds ${seeds.join(',')}`;
  if (pending && pending.length) {
    must(await supabase.from('audio_pass_requests').update({ reason: appendAudioPassReason(pending[0].reason || '', reason) }).eq('id', pending[0].id), 'append audio pass reason');
    console.log('audio pass: appended to pending request', pending[0].id);
  } else {
    const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
    await queueAudioPass(supabase, { courseCode: COURSE, reason, requestedBy: SWEEP });
    console.log('audio pass: queued');
  }
  console.log(`done: ${fixes.length} row(s), snapshot batch ${batchId}`);
}

if (require.main === module) main().catch(e => { console.error('APPLY FAILED:', e.message); process.exit(2); });
module.exports = { selectFixes, applyOnTop };
