#!/usr/bin/env node
'use strict';
// eng_for_hin — S0651L01B03 re-worded after the cross-family read (Astra, #935·H, 2026-09-23; job #931·H).
// Astra: "उस फ़िल्म के बारे में आपका क्या ख़्याल है?" cues "what do you think about THAT film", not "the film".
// Correction: "फ़िल्म के बारे में आपका क्या ख़्याल है?" — the seed 248 LEGO is फ़िल्म → "the film", so the bare noun is
// exactly what the course taught. English unchanged, no clips existed. The two S0495L01 lines Astra called
// translated-sounding stay: its alternative changes the meaning ("when needed") and the LEGO is fixed.
//   node tools/course-optimization/eng-for-hin-seed-651-film-tighten-2026-09-23.cjs [--apply]
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const S = require('./eng-for-hin-seeds-651-653-new-lego-2026-09-23.cjs');
const P = require('./eng-for-hin-seed-489-if-fold-490-kabhi-2026-09-23.cjs');
const COURSE = 'eng_for_hin', SEED = 651, JOB = '#931·H', SWEEP = 'eng-for-hin-seed-651-film-tighten-2026-09-23';
const LEGO = S.SEEDS.find(s => s.seed === SEED).lego;
const FIX = { id: `${COURSE}:S0651L01B03`, role: 'build', from: { known: 'उस फ़िल्म के बारे में आपका क्या ख़्याल है?', target: 'what do you think about the film?' }, to: { known: 'फ़िल्म के बारे में आपका क्या ख़्याल है?', target: 'what do you think about the film?' } };
function offlineCheck() {
  const problems = [];
  if (!S.SEEDS.find(s => s.seed === SEED).build.some(p => p.known === FIX.from.known && p.target === FIX.from.target)) problems.push('"from" is not the line the 651/653 tool wrote');
  if (!P.phraseContainsLego(LEGO, FIX.to)) problems.push('replacement does not contain the LEGO on both sides');
  if (/उस /u.test(FIX.to.known)) problems.push('demonstrative still present');
  if (FIX.to.target !== FIX.from.target) problems.push('English must not change');
  return problems;
}
async function main() {
  const apply = process.argv.includes('--apply');
  const off = offlineCheck(); if (off.length) throw new Error(off.join('; '));
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { data: row } = await sb.from('course_practice_phrases').select('known_text,target_text,phrase_role,known_audio_id,target1_audio_id,target2_audio_id').eq('course_code', COURSE).eq('id', FIX.id).single();
  if (!row || row.known_text !== FIX.from.known || row.target_text !== FIX.from.target || row.phrase_role !== FIX.role) throw new Error(`BLOCKED ${FIX.id} is ${JSON.stringify(row)}`);
  if (row.known_audio_id || row.target1_audio_id || row.target2_audio_id) throw new Error('BLOCKED clips linked');
  const { checkPhraseZUT } = require('../../services/course-builder/lib/validation.cjs');
  const { courseFamily } = require('../../services/course-builder/lib/course-family.cjs');
  const zut = await checkPhraseZUT(sb, COURSE, [FIX.to], SEED, { family: await courseFamily(sb, COURSE) });
  if (zut.length) throw new Error(`ZUT ${JSON.stringify(zut)}`);
  const { runDeterministic } = require('./eng-for-hin-shuchita-rulebook.cjs');
  const hits = runDeterministic({ seed: SEED, id: FIX.id, role: FIX.role, known: FIX.to.known, target: FIX.to.target });
  if (hits.length) throw new Error(`Shuchita ${JSON.stringify(hits)}`);
  console.log(`offline ok; ZUT clean; Shuchita deterministic 0 hits; live row matches`);
  if (!apply) { console.log('DRY RUN — nothing written'); return; }
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { snapshotSeeds } = require('../../services/course-builder/lib/redo-snapshot.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const snap = await snapshotSeeds(sb, COURSE, [SEED], { reason: 'seed-651-film-tighten', notes: `Astra #935·H: उस फ़िल्म cues "that film" (job ${JOB}). Undo: POST /api/build/redo-undo/${COURSE}.` });
  const eventId = await recordContentEdit(sb, { identity, courseCode: COURSE, surface: `tools/course-optimization/${SWEEP}.cjs`, operation: 'phrase-edit', scope: { seed_numbers: [SEED], phrase_ids: [FIX.id] }, detail: { job: JOB, fix: FIX, snapshot_batch: snap.batchId } });
  const { error } = await sb.from('course_practice_phrases').update({ known_text: FIX.to.known, qa_checked: null, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('id', FIX.id);
  if (error) throw new Error(error.message);
  await sb.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', SEED);
  console.log(`${FIX.id}: "${FIX.to.known}" → "${FIX.to.target}"; edit event ${eventId}; snapshot ${snap.batchId}; seed 651 stays unapproved`);
}
module.exports = { FIX, offlineCheck };
if (require.main === module) main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
