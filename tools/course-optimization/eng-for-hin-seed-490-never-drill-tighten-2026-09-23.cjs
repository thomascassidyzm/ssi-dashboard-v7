#!/usr/bin/env node
'use strict';
// eng_for_hin — three "never" drill lines under S0490L01 tightened after the cross-family read (Astra, #918·H,
// 2026-09-23; job #914·H). Astra passed seven of the nine lines and the कभी नहीं → never chunk itself, and said:
//   B03  मैं वहाँ कभी नहीं गया  → "I've never been there"   PASS, but the omitted हूँ also allows "I never went there";
//        clearer with हूँ.
//   U04  मैं आपके साथ कभी बात नहीं करना चाहता क्योंकि …  → "I never want to speak with you because you never help me"
//        ODD: reads as a categorical refusal ("I don't ever want to …"), not the habitual English.
//   U05  मैंने कहा था कि मैं वहाँ कभी नहीं गया  → "I said that I've never been there"   FAIL: reported speech invites
//        "I'd never been there"; Hindi cannot force the tense the English answer needs.
// Best effort first, review after (Kai, 2026-09-21): the three lines are replaced with ones whose Hindi cues exactly
// one English, all built from taught chunks, all still moving "never" to a new place. English is the live vocab gate's
// business (tiling against taught chunks, checked here with the edit-cascade validator after the write); ZUT and the
// Shuchita deterministic rules run before it. Identified write, snapshot, edit event; no TTS (rows had no clips).
//
//   node tools/course-optimization/eng-for-hin-seed-490-never-drill-tighten-2026-09-23.cjs            # dry run
//   node tools/course-optimization/eng-for-hin-seed-490-never-drill-tighten-2026-09-23.cjs --apply

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
const N = require('./eng-for-hin-seed-490-never-lego-2026-09-23.cjs');
const P = require('./eng-for-hin-seed-489-if-fold-490-kabhi-2026-09-23.cjs');

const COURSE = 'eng_for_hin';
const SEED = 490;
const JOB = '#914·H';
const SWEEP = 'eng-for-hin-seed-490-never-drill-tighten-2026-09-23';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = `Astra cross-family read #918·H (2026-09-23) on the S0490L01 never drill: B03 clearer with हूँ, U04 odd, U05 fails on reported-speech tense — replaced under Kai's best-effort-first rule (job ${JOB})`;
const BUILDER = process.env.COURSE_BUILDER_SELF_URL || 'http://localhost:3471';
const LEGO = N.NEVER; // कभी नहीं → never

const FIXES = [
  { id: `${COURSE}:S0490L01B03`, role: 'build', from: { known: 'मैं वहाँ कभी नहीं गया', target: "I've never been there" }, to: { known: 'मैं वहाँ कभी नहीं गया हूँ', target: "I've never been there" }, why: 'हूँ pins the present perfect' },
  { id: `${COURSE}:S0490L01U04`, role: 'use', from: { known: 'मैं आपके साथ कभी बात नहीं करना चाहता क्योंकि आप कभी मेरी मदद नहीं करते।', target: 'I never want to speak with you because you never help me' }, to: { known: 'हम कभी बात नहीं करते क्योंकि मैं कभी यहाँ नहीं होता।', target: "we never talk because I'm never here" }, why: 'two nevers, both habitual, no refusal reading' },
  { id: `${COURSE}:S0490L01U05`, role: 'use', from: { known: 'मैंने कहा था कि मैं वहाँ कभी नहीं गया।', target: "I said that I've never been there" }, to: { known: 'मुझे यक़ीन है कि वह कभी यहाँ नहीं होता।', target: "I'm sure he's never here" }, why: 'no reported-speech tense trap' },
];

/** Each replacement still contains the LEGO on both sides, keeps कभी count = never count, and is not a line already in the basket. */
function offlineCheck() {
  const problems = [];
  const basketNow = [...N.NEVER_BUILD, ...N.NEVER_USE].map(p => p.target);
  for (const f of FIXES) {
    if (!P.phraseContainsLego(LEGO, f.to)) problems.push(`${f.id}: replacement does not contain the LEGO on both sides`);
    if ((f.to.known.match(/कभी/gu) || []).length !== (f.to.target.match(/\bnever\b/gi) || []).length) problems.push(`${f.id}: कभी count ≠ never count`);
    if (f.to.target !== f.from.target && basketNow.includes(f.to.target)) problems.push(`${f.id}: replacement duplicates a basket line`);
    if (!N.NEVER_BUILD.concat(N.NEVER_USE).some(p => p.known === f.from.known && p.target === f.from.target)) problems.push(`${f.id}: "from" is not the line the never-lego tool wrote`);
  }
  const after = [...N.NEVER_BUILD, ...N.NEVER_USE].map(p => { const f = FIXES.find(x => x.from.known === p.known); return f ? f.to : p; });
  if (!N.neverIsDrilled(after)) problems.push('basket after the change no longer drills never');
  return { problems, after };
}

function supa() { const { createClient } = require('@supabase/supabase-js'); return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } }); }
async function postJson(url, body, headers = {}) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }); let json = null; try { json = await r.json(); } catch { /* */ } return { ok: r.ok, status: r.status, json }; }
async function validate490() { const r = await postJson(`${BUILDER}/api/v2/validate/${COURSE}`, { fromSeed: SEED, toSeed: SEED }); return (r.json?.failures || []).filter(f => f.seed === SEED); }

async function main() {
  const apply = process.argv.includes('--apply');
  const sb = supa();
  console.log(`\n══════ ${COURSE}: S0490L01 never drill tightened (${JOB}) ══════`);
  const { problems: off, after } = offlineCheck();
  if (off.length) throw new Error(`offline: ${off.join('; ')}`);
  console.log(`offline: 3 replacements contain the LEGO both sides; basket after uses ${N.neverFrames(after).size} English frames`);
  const problems = [];
  for (const f of FIXES) {
    const { data: row } = await sb.from('course_practice_phrases').select('known_text, target_text, phrase_role, known_audio_id, target1_audio_id, target2_audio_id').eq('course_code', COURSE).eq('id', f.id).single();
    if (!row) problems.push(`${f.id} missing`);
    else if (row.known_text !== f.from.known || row.target_text !== f.from.target || row.phrase_role !== f.role) problems.push(`${f.id} is ${row.phrase_role} "${row.known_text}" → "${row.target_text}"`);
    else if (row.known_audio_id || row.target1_audio_id || row.target2_audio_id) problems.push(`${f.id} has clips linked — this tool expects none`);
  }
  for (const p of problems) console.error(`BLOCKED  ${p}`);
  if (problems.length) { console.error('BLOCKED — live state differs. Nothing written.'); process.exit(1); }
  const before = await validate490();
  console.log(`validator on 490 before: ${before.length ? JSON.stringify(before) : 'clean'}`);

  const { checkPhraseZUT } = require('../../services/course-builder/lib/validation.cjs');
  const { courseFamily } = require('../../services/course-builder/lib/course-family.cjs');
  const family = await courseFamily(sb, COURSE);
  const zut = await checkPhraseZUT(sb, COURSE, FIXES.map(f => f.to), SEED, { family });
  if (zut.length) throw new Error(`phrase ZUT: ${JSON.stringify(zut)}`);
  const { runDeterministic } = require('./eng-for-hin-shuchita-rulebook.cjs');
  const hits = FIXES.flatMap(f => runDeterministic({ seed: SEED, id: f.id, role: f.role, known: f.to.known, target: f.to.target }));
  if (hits.length) throw new Error(`Shuchita deterministic: ${JSON.stringify(hits)}`);
  console.log('ZUT clean; Shuchita deterministic 0 hits');

  const { evidencePath } = require('../lib/evidence-path.cjs');
  const out = { sweep: SWEEP, job: JOB, at: new Date().toISOString(), ruling: RULING, apply, fixes: FIXES, basketAfter: after };
  if (!apply) { const ev = evidencePath(`tools/course-optimization/${SWEEP}-dryrun.json`); fs.writeFileSync(ev, JSON.stringify(out, null, 1)); console.log(`\nDRY RUN — nothing written. evidence: ${ev}`); return; }

  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { snapshotSeeds } = require('../../services/course-builder/lib/redo-snapshot.cjs');
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const snap = await snapshotSeeds(sb, COURSE, [SEED], { reason: 'seed-490-never-drill-tighten', notes: `${RULING}. Undo: POST /api/build/redo-undo/${COURSE}.` });
  const eventId = await recordContentEdit(sb, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: [SEED], phrase_ids: FIXES.map(f => f.id) }, detail: { job: JOB, ruling: RULING, fixes: FIXES, snapshot_batch: snap.batchId } });
  console.log(`edit event ${eventId}; snapshot batch ${snap.batchId}`);
  for (const f of FIXES) {
    must(await sb.from('course_practice_phrases').update({ known_text: f.to.known, target_text: f.to.target, qa_checked: null, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('id', f.id), f.id);
    console.log(`  ${f.id}: "${f.to.known}" → "${f.to.target}"   (${f.why})`);
  }
  const afterV = await validate490();
  if (afterV.length && JSON.stringify(afterV) !== JSON.stringify(before)) {
    for (const f of FIXES) must(await sb.from('course_practice_phrases').update({ known_text: f.from.known, target_text: f.from.target }).eq('course_code', COURSE).eq('id', f.id), `${f.id} restore`);
    throw new Error(`validator on 490 after the edit: ${JSON.stringify(afterV)} — rows restored`);
  }
  console.log(`validator on 490 after: ${afterV.length ? JSON.stringify(afterV) : 'clean'}`);
  must(await sb.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', SEED), 'unapprove');
  await refreshNow();
  const pending = must(await sb.from('audio_pass_requests').select('id, reason, metadata').eq('course_code', COURSE).eq('status', 'pending').maybeSingle(), 'pending audio pass');
  if (pending) must(await sb.from('audio_pass_requests').update({ reason: `${pending.reason} + S0490L01 never drill: 3 lines re-worded after the cross-family read (#918·H), no clips existed`, metadata: { ...pending.metadata, job914NeverDrillTighten: { editEventId: eventId, snapshotBatch: snap.batchId } }, updated_at: new Date().toISOString() }).eq('id', pending.id), 'audio-pass append');
  console.log(`seed 490 unapproved; round index refreshed; audio pass ${pending ? 'appended' : 'NOT FOUND'}`);
  out.eventId = eventId; out.snapshot = snap;
  const ev = evidencePath(`tools/course-optimization/${SWEEP}.json`); fs.writeFileSync(ev, JSON.stringify(out, null, 1)); console.log(`evidence: ${ev}`);
}
module.exports = { FIXES, offlineCheck };
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
