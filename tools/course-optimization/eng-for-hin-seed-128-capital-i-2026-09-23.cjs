#!/usr/bin/env node
// eng_for_hin seed 128 — English lines with a lowercase pronoun "i" ("i think you're like me",
// "someone i used to know") are capitalised. Ten rows: nine practice phrases and the LEGO
// S0128L03 "i used to know". Kai, 2026-09-23 (job #900·H). Text only — never renders TTS.
//
// Same write path as eng-for-hin-shuchita-apply-2026-09-23.cjs: snapshot the seed into
// seed_redo_snapshots, one content_edit_events row under serviceIdentity, update with version bump
// and last_edit_event_id, append to the pending audio-pass reason. approved_at is not touched:
// seed 128 is already unapproved (its re-cut is awaiting Kai). The English audio for these rows is
// already queued for re-render in Charlotte on the pending request (job #866) — the DB trigger
// keeps a clip whose text differs only by case, so most links survive anyway.
//
//   node tools/course-optimization/eng-for-hin-seed-128-capital-i-2026-09-23.cjs [--seed 128] [--apply]

'use strict';
const path = require('path');

const COURSE = 'eng_for_hin';
const SWEEP = 'eng-for-hin-seed-128-capital-i-2026-09-23';
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const APPLY = args.includes('--apply');

/**
 * The pronoun "i" → "I" wherever it stands as a word: "i think" → "I think", "i'm" → "I'm",
 * "someone i used to know" → "someone I used to know". Kai's brief named the ten lines that START
 * with it; three of them carry it mid-line too and a half-capitalised line is still wrong English.
 * "if", "it", "in" and any word containing i are untouched.
 */
function capitaliseLeadingI(text) {
  return String(text || '').replace(/(^|[\s(])i(?=['’\s,.!?)]|$)/g, '$1I');
}

async function main() {
  const seed = Number(opt('--seed') || 128);
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

  const legos = must(await supabase.from('course_legos').select('*').eq('course_code', COURSE).eq('seed_number', seed), 'legos');
  const phrases = must(await supabase.from('course_practice_phrases').select('*').eq('course_code', COURSE).eq('seed_number', seed), 'phrases');
  const fixes = [
    ...legos.filter(l => capitaliseLeadingI(l.target_text) !== l.target_text).map(l => ({ role: 'lego', id: l.lego_id, from: l.target_text, to: capitaliseLeadingI(l.target_text), version: l.version })),
    ...phrases.filter(p => capitaliseLeadingI(p.target_text) !== p.target_text).map(p => ({ role: p.phrase_role, id: p.id, from: p.target_text, to: capitaliseLeadingI(p.target_text), version: p.version })),
  ];
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'}: seed ${seed}, ${fixes.length} row(s)`);
  for (const f of fixes) console.log(`  ${f.id} [${f.role}] "${f.from}" → "${f.to}"`);
  if (!fixes.length || !APPLY) return;

  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const batchId = require('crypto').randomUUID();
  const seedRow = must(await supabase.from('course_seeds').select('known_text,target_text,approved_at,decomposed_at,flagged_at').eq('course_code', COURSE).eq('seed_number', seed).single(), 'seed');
  must(await supabase.from('seed_redo_snapshots').insert({ batch_id: batchId, course_code: COURSE, seed_number: seed, reason: 'capital-i', notes: `${SWEEP}: ${fixes.map(f => f.id).join('; ')}`, seed_row: seedRow, legos, phrases, lego_count: legos.length, phrase_count: phrases.length }), 'snapshot');
  const eventId = await recordContentEdit(supabase, {
    identity, courseCode: COURSE, surface: `tools/course-optimization/${SWEEP}.cjs`, operation: 'capital-i',
    scope: { seed_numbers: [seed], rows: fixes.length, phrase_ids: fixes.filter(f => f.role !== 'lego').map(f => f.id), lego_ids: fixes.filter(f => f.role === 'lego').map(f => f.id) },
    detail: { snapshot_batch_id: batchId, changes: fixes.map(f => ({ id: f.id, from: { target: f.from }, to: { target: f.to } })) },
  });
  for (const f of fixes) {
    const table = f.role === 'lego' ? 'course_legos' : 'course_practice_phrases';
    const key = f.role === 'lego' ? { lego_id: f.id } : { id: f.id };
    must(await supabase.from(table).update({ target_text: f.to, version: (f.version || 1) + 1, last_edit_event_id: eventId }).eq('course_code', COURSE).match(key).eq('target_text', f.from), `update ${f.id}`);
    console.log(`  wrote ${f.id}`);
  }
  const { appendAudioPassReason } = require('./eng-for-hin-mark-21-348-new-2026-09-23.cjs');
  const pending = must(await supabase.from('audio_pass_requests').select('id,reason').eq('course_code', COURSE).eq('status', 'pending').order('created_at', { ascending: false }).limit(1), 'pending audio pass');
  const reason = `${SWEEP}: ${fixes.length} English row(s) in seed ${seed} capitalised (lowercase i → I) — text only, no TTS (Kai 2026-09-23)`;
  if (pending && pending.length) must(await supabase.from('audio_pass_requests').update({ reason: appendAudioPassReason(pending[0].reason || '', reason) }).eq('id', pending[0].id), 'append audio pass reason');
  else { const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs'); await queueAudioPass(supabase, { courseCode: COURSE, reason, requestedBy: SWEEP }); }
  console.log(`done: ${fixes.length} row(s), snapshot batch ${batchId}, event ${eventId}`);
}

if (require.main === module) main().catch(e => { console.error('FAILED:', e.message); process.exit(2); });
module.exports = { capitaliseLeadingI };
