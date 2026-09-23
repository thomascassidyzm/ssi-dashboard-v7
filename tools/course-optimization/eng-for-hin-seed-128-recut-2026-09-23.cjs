#!/usr/bin/env node
'use strict';
// eng_for_hin — seed 128 re-cut: no gap marker on either side of a LEGO (Kai's ruling, 2026-09-23, job #871).
//
// Seed 128: "आप एक ऐसे व्यक्ति की तरह हैं जिसे मैं पहले जानता था।" / "You're like someone I used to know."
// Live cut (3 LEGOs): S0128L01 "आप ( ) की तरह हैं" → "you're like" carries a gap because Hindi puts
// the postposition की तरह AFTER the noun, so "you're like" is discontinuous in Hindi. Kai: "If there
// needs to be a gap, it's not a good lego — can we rethink it?" Neither an ellipsis nor dropping the
// marker is acceptable. A LEGO grows on BOTH sides: when one side cannot split cleanly, the other
// grows to match. So "you're like" grows to "you're like someone", which is continuous and meaningful
// in both languages, and the seed becomes TWO LEGOs. Precedent in this course: S0117L02 gathers a
// discontinuous Hindi chunk into one LEGO rather than leaving a hole.
//
//   S0128L01  आप एक ऐसे व्यक्ति की तरह हैं  → you're like someone   (was L01 "आप ( ) की तरह हैं" + L02 "एक ऐसे व्यक्ति")
//   S0128L02  जिसे मैं पहले जानता था        → i used to know        (was L03, text unchanged)
//
// VERIFIED LIVE 2026-09-23 (dry run, no write): the course-builder's edit-cascade dry run put the
// cut through the real gates — tiling, containment, phrase counts, chunk-vocabulary, ZUT — and seed
// 128 passed. Course-wide from seed 128, exactly ONE downstream row breaks: S0140L01U03 "I can't see
// someone", which tiled off the bare "someone" chunk that no longer exists; it is rewritten here.
// The 31 seeds already red before the cut stay red and are not this tool's business.
//
// LEARNERS: a 3→2 cut shifts course_round_index by one for every LEGO after S0128L03. Resume anchors
// on lego_id, not round number (ssi-learning-app resolveResumeAnchor), so learners past seed 128 keep
// their place; the stored round ceiling is one higher than the new index for them (belt display), and
// S0128L03 progress rows become orphans. Kai's brief: if any learner is at or beyond seed 128, STOP and
// report. 72 were, so this tool WRITES NOTHING unless --apply --accept-round-shift is given.
//
// AUDIO: nothing is rendered here, ever. Retained phrases keep their exact text so the existing
// Charlotte clips relink on the next English pass; new rows are null-audio and are appended to the
// pending audio-pass request. English is Charlotte everywhere (Kai, 2026-09-23).
//
//   node tools/course-optimization/eng-for-hin-seed-128-recut-2026-09-23.cjs                       # dry run
//   node tools/course-optimization/eng-for-hin-seed-128-recut-2026-09-23.cjs --apply --accept-round-shift

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });

const COURSE = 'eng_for_hin';
const SEED = 128;
const SWEEP = 'eng-for-hin-seed-128-recut-2026-09-23';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = 'Kai, 2026-09-23 (job #871): a LEGO with a gap on either side is not a good LEGO — re-cut seed 128 so every LEGO is continuous and meaningful on both sides';
const BUILDER = process.env.COURSE_BUILDER_SELF_URL || 'http://localhost:3471';

const SEED_TEXT = { known: 'आप एक ऐसे व्यक्ति की तरह हैं जिसे मैं पहले जानता था।', target: "You're like someone I used to know." };

/** The cut this tool was written against — refuses to run on anything else. */
const OLD_LEGOS = [
  { lego_id: 'S0128L01', known: 'आप ( ) की तरह हैं', target: "you're like" },
  { lego_id: 'S0128L02', known: 'एक ऐसे व्यक्ति', target: 'someone' },
  { lego_id: 'S0128L03', known: 'जिसे मैं पहले जानता था', target: 'i used to know' },
];

/** The new cut, in the /seed/complete lego shape. Phrase text is lowercase "i" like the rest of this
 *  seed's live rows; the six retained rows are byte-identical to the live rows so their clips relink. */
const LEGOS = [
  { idx: 1, type: 'A', known: 'आप एक ऐसे व्यक्ति की तरह हैं', target: "you're like someone",
    build: [
      { known: 'आप एक ऐसे व्यक्ति की तरह हैं जिसे मैं जानता हूँ', target: "you're like someone i know" },
      { known: 'आप एक ऐसे व्यक्ति की तरह हैं जिससे मैं मिलना चाहता हूँ', target: "you're like someone i want to meet" },
      { known: 'आप एक ऐसे व्यक्ति की तरह हैं जिससे मैं मिलना चाहूँगा', target: "you're like someone i'd like to meet" },
    ],
    use: [
      { known: 'मुझे लगता है आप एक ऐसे व्यक्ति की तरह हैं जिसे मैं जानता हूँ।', target: "i think you're like someone i know" },
      { known: 'मुझे यक़ीन नहीं है कि आप एक ऐसे व्यक्ति की तरह हैं जिससे मैं मिलना चाहता हूँ।', target: "i'm not sure if you're like someone i want to meet" },
      { known: 'मुझे लग रहा है कि आप एक ऐसे व्यक्ति की तरह हैं जिसे मैं नहीं जानता।', target: "i feel as if you're like someone i don't know" },
      { known: 'मुझे लगता है कि आप एक ऐसे व्यक्ति की तरह हैं जिससे मैं मिलना चाहूँगा।', target: "i think that you're like someone i'd like to meet" },
      { known: 'आप एक ऐसे व्यक्ति की तरह हैं जिसे मैं बहुत अच्छी तरह जानता हूँ।', target: "you're like someone i know very well" },
    ] },
  { idx: 2, type: 'A', known: 'जिसे मैं पहले जानता था', target: 'i used to know',
    build: [
      { known: 'उन लोगों को जिन्हें मैं पहले जानता था', target: 'those people i used to know' },
      { known: 'दूसरे लोग जिन्हें मैं पहले जानता था', target: 'other people i used to know' },
      { known: 'आप एक ऐसे व्यक्ति की तरह हैं जिसे मैं पहले जानता था', target: "you're like someone i used to know" },
    ],
    use: [
      { known: 'मैं उन लोगों से मिलना चाहता हूँ जिन्हें मैं पहले जानता था।', target: 'i want to meet those people i used to know' },
      { known: 'मुझे लगता है आप एक ऐसे व्यक्ति की तरह हैं जिसे मैं पहले जानता था।', target: "i think you're like someone i used to know" },
      { known: 'हम उन लोगों को देखना चाहते हैं जिन्हें मैं पहले जानता था।', target: "we want to see those people i used to know" },
      { known: 'मुझे यक़ीन नहीं है कि आप एक ऐसे व्यक्ति की तरह हैं जिसे मैं पहले जानता था।', target: "i'm not sure if you're like someone i used to know" },
      { known: 'इसीलिए आप एक ऐसे व्यक्ति की तरह हैं जिसे मैं पहले जानता था।', target: "that is why you're like someone i used to know" },
    ] },
];

/** The one downstream row the cut breaks: it tiled off the bare "someone" chunk. Stays under S0140L01
 *  "I can't see"; "other people" is S0034L04. S0140L01B03 already says "I can't see those people". */
const S0140_FIX = {
  id: `${COURSE}:S0140L01U03`, seed: 140,
  from: { known: 'मैं एक ऐसे व्यक्ति को नहीं देख सकता।', target: "I can't see someone" },
  to: { known: 'मैं दूसरे लोगों को नहीं देख सकता।', target: "I can't see other people" },
};

const SEEDS_TOUCHED = [SEED, S0140_FIX.seed];

// ── The rule, as code ────────────────────────────────────────────────────────
/** A gap marker on either side: "( )", "(…)", "...", "…", or an underscore run. */
const GAP_MARKER = /\(\s*\)|\(…\)|\.\.\.|…|_{2,}/;
const isGapFree = (text) => !GAP_MARKER.test(String(text || ''));

const normWords = (s) => String(s || '').toLowerCase().replace(/[.,!?;:।"]+/g, ' ').replace(/’/g, "'").replace(/\s+/g, ' ').trim();

/** Both-sides containment: a phrase under a LEGO carries that LEGO's target, and its known side
 *  carries the LEGO's known side up to Hindi relative-pronoun agreement (जिसे → जिन्हें, plural). */
function phraseContainsLego(lego, phrase) {
  const t = ` ${normWords(phrase.target)} `.includes(` ${normWords(lego.target)} `);
  const kn = normWords(lego.known), kp = normWords(phrase.known);
  const k = kp.includes(kn) || kp.includes(kn.replace('जिसे', 'जिन्हें'));
  return t && k;
}

/** The LEGOs read in order are the seed, on both sides (the Hindi order is the seed's own here). */
function legosTileSeed(legos, seed) {
  return normWords(legos.map(l => l.target).join(' ')) === normWords(seed.target)
    && normWords(legos.map(l => l.known).join(' ')) === normWords(seed.known);
}

// ── Live helpers ────────────────────────────────────────────────────────────
function supa() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}
async function postJson(url, body, headers = {}) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  let json = null; try { json = await r.json(); } catch { /* non-JSON */ }
  return { ok: r.ok, status: r.status, json };
}
const IDENTITY_HEADERS = { 'x-agent-id': SWEEP, 'x-agent-role': 'content-sweep', 'x-service-name': SWEEP };

async function guard(sb) {
  const problems = [];
  const { data: seed } = await sb.from('course_seeds').select('known_text, target_text, approved_at').eq('course_code', COURSE).eq('seed_number', SEED).single();
  if (!seed) problems.push('seed 128 missing');
  else {
    if (seed.known_text !== SEED_TEXT.known) problems.push(`seed known is "${seed.known_text}"`);
    if (seed.target_text !== SEED_TEXT.target) problems.push(`seed target is "${seed.target_text}"`);
  }
  const { data: legos } = await sb.from('course_legos').select('lego_id, known_text, target_text').eq('course_code', COURSE).eq('seed_number', SEED).order('lego_index');
  const live = (legos || []).map(l => `${l.lego_id}|${l.known_text}|${l.target_text}`).join('\n');
  const want = OLD_LEGOS.map(l => `${l.lego_id}|${l.known}|${l.target}`).join('\n');
  if (live !== want) problems.push(`seed 128 LEGOs are not the cut this tool was written against:\n${live}`);
  const { data: row } = await sb.from('course_practice_phrases').select('known_text, target_text').eq('course_code', COURSE).eq('id', S0140_FIX.id).single();
  if (!row) problems.push(`${S0140_FIX.id} missing`);
  else if (row.known_text !== S0140_FIX.from.known || row.target_text !== S0140_FIX.from.target) problems.push(`${S0140_FIX.id} is "${row.known_text}" → "${row.target_text}"`);
  return { problems, seed };
}

/** Learners whose enrolment has reached seed 128 or beyond — the people a round shift touches. */
async function learnersAtOrBeyond(sb) {
  const { count } = await sb.from('course_enrollments').select('learner_id', { count: 'exact', head: true })
    .eq('course_id', COURSE).gte('highest_completed_seed', SEED);
  const { data: inSeed } = await sb.from('course_enrollments').select('learner_id, last_completed_lego_id')
    .eq('course_id', COURSE).like('last_completed_lego_id', 'S0128%');
  return { atOrBeyond: count || 0, cursorInsideSeed: inSeed || [] };
}

/** The real gates, no write: edit-cascade dry run vs a baseline sweep from seed 128. */
async function dryRunThroughGates() {
  const body = { seed_number: SEED, target_text: SEED_TEXT.target, generateAudio: false, dryRun: true, legos: LEGOS };
  const [dry, base] = await Promise.all([
    postJson(`${BUILDER}/api/course/${COURSE}/edit-cascade`, body, IDENTITY_HEADERS),
    postJson(`${BUILDER}/api/v2/validate/${COURSE}`, { fromSeed: SEED }),
  ]);
  if (!dry.ok || !dry.json?.ok) throw new Error(`edit-cascade dry run refused: ${dry.status} ${JSON.stringify(dry.json).slice(0, 500)}`);
  const baseline = new Map((base.json?.failures || []).map(f => [f.seed, new Set(f.issues)]));
  const caused = [];
  for (const f of dry.json.blastRadius?.failures || []) {
    const fresh = f.issues.filter(i => !(baseline.get(f.seed) || new Set()).has(i));
    if (fresh.length) caused.push({ seed: f.seed, issues: fresh });
  }
  return { dry: dry.json, baselineRed: baseline.size, caused };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const accept = process.argv.includes('--accept-round-shift');
  const sb = supa();
  console.log(`\n══════ ${COURSE}: seed 128 re-cut — no gaps ══════`);
  const { problems } = await guard(sb);
  for (const p of problems) console.error(`BLOCKED  ${p}`);
  if (problems.length) { console.error('\nBLOCKED — live state differs. Nothing written.'); process.exit(1); }

  // The rule, offline, before anything live.
  for (const l of LEGOS) {
    if (!isGapFree(l.known) || !isGapFree(l.target)) throw new Error(`${l.idx} carries a gap marker`);
    for (const p of [...l.build, ...l.use]) if (!phraseContainsLego(l, p)) throw new Error(`"${p.target}" does not contain LEGO ${l.idx} on both sides`);
  }
  if (!legosTileSeed(LEGOS, SEED_TEXT)) throw new Error('LEGOs do not tile the seed');
  console.log('offline: every LEGO gap-free on both sides, every phrase contains its LEGO on both sides, LEGOs tile the seed');

  const learners = await learnersAtOrBeyond(sb);
  console.log(`learners at or beyond seed 128: ${learners.atOrBeyond}; cursor inside seed 128: ${learners.cursorInsideSeed.map(l => l.last_completed_lego_id).join(', ') || 'none'}`);

  const gates = await dryRunThroughGates();
  console.log(`live gates (edit-cascade dry run): ${gates.dry.case}; vocab +${JSON.stringify(gates.dry.vocabDelta.added)} −${JSON.stringify(gates.dry.vocabDelta.removed)}; seeds already red from 128: ${gates.baselineRed}`);
  console.log(`failures CAUSED by the cut: ${gates.caused.length ? JSON.stringify(gates.caused) : 'none'}`);
  const onlyS140 = gates.caused.length === 1 && gates.caused[0].seed === 140 && gates.caused[0].issues.length === 1 && /L1: vocab/.test(gates.caused[0].issues[0]);
  if (gates.caused.length && !onlyS140) { console.error('BLOCKED — the cut breaks something this tool does not repair.'); process.exit(1); }

  const { evidencePath } = require('../lib/evidence-path.cjs');
  const out = { sweep: SWEEP, at: new Date().toISOString(), ruling: RULING, apply, learners, legos: LEGOS, s0140: S0140_FIX, gates };
  if (!apply) {
    const ev = evidencePath(`tools/course-optimization/${SWEEP}-dryrun.json`);
    fs.writeFileSync(ev, JSON.stringify(out, null, 1));
    console.log(`\nDRY RUN — nothing written. evidence: ${ev}`);
    return;
  }
  if (learners.atOrBeyond > 0 && !accept) {
    console.error(`\nREFUSED — ${learners.atOrBeyond} learner(s) at or beyond seed 128; a 3→2 cut shifts every later round by one. Re-run with --accept-round-shift once Kai has ruled.`);
    process.exit(2);
  }

  // ─── apply ──────────────────────────────────────────────────────────────
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { snapshotSeeds } = require('../../services/course-builder/lib/redo-snapshot.cjs');
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const snap = await snapshotSeeds(sb, COURSE, SEEDS_TOUCHED, { reason: 'seed-128-recut', notes: `${RULING}. Undo: POST /api/build/redo-undo/${COURSE}.` });
  const eventId = await recordContentEdit(sb, {
    identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-recut',
    scope: { seed_numbers: SEEDS_TOUCHED, lego_ids: ['S0128L01', 'S0128L02', 'S0128L03'], phrase_ids: [S0140_FIX.id] },
    detail: { ruling: RULING, from: OLD_LEGOS, to: LEGOS.map(l => ({ idx: l.idx, known: l.known, target: l.target })), s0140: S0140_FIX, snapshot_batch: snap.batchId, learners },
  });
  console.log(`edit event ${eventId}; snapshot batch ${snap.batchId}`);

  const cascade = await postJson(`${BUILDER}/api/course/${COURSE}/edit-cascade`,
    { seed_number: SEED, target_text: SEED_TEXT.target, generateAudio: false, dryRun: false, legos: LEGOS }, IDENTITY_HEADERS);
  if (!cascade.ok || !cascade.json?.ok) throw new Error(`edit-cascade apply failed (rolled back by the route): ${cascade.status} ${JSON.stringify(cascade.json).slice(0, 800)}`);
  console.log(`edit-cascade applied: ${cascade.json.message || JSON.stringify(cascade.json).slice(0, 300)}`);

  const { data: after } = await sb.from('course_legos').select('lego_id, known_text, target_text').eq('course_code', COURSE).eq('seed_number', SEED).order('lego_index');
  if ((after || []).length !== LEGOS.length) throw new Error(`seed 128 now has ${(after || []).length} LEGOs, expected ${LEGOS.length}`);
  for (const l of after) console.log(`  ${l.lego_id}  "${l.known_text}" → "${l.target_text}"`);

  const { error: pe } = await sb.from('course_practice_phrases')
    .update({ known_text: S0140_FIX.to.known, target_text: S0140_FIX.to.target, qa_checked: null, last_edit_event_id: eventId })
    .eq('course_code', COURSE).eq('id', S0140_FIX.id);
  if (pe) throw new Error(`${S0140_FIX.id}: ${pe.message}`);
  console.log(`${S0140_FIX.id} → "${S0140_FIX.to.target}" (unchecked; clips dropped by trigger)`);

  const { error: se } = await sb.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId }).eq('course_code', COURSE).in('seed_number', SEEDS_TOUCHED);
  if (se) throw new Error(`unapprove: ${se.message}`);
  console.log(`seeds ${SEEDS_TOUCHED.join(', ')} unapproved for Shuchita`);

  await refreshNow();
  console.log('course_round_index refreshed');

  const { data: pending } = await sb.from('audio_pass_requests').select('id, reason, metadata').eq('course_code', COURSE).eq('status', 'pending').maybeSingle();
  if (!pending) throw new Error(`no pending audio-pass request for ${COURSE} — queue one with queue-audio-pass.cjs`);
  const mine = `seed 128 re-cut to 2 gap-free LEGOs — new English rows for Charlotte, Hindi prompts/intros for the Hindi voice, S0140L01U03 rewritten (Kai, job #871, 2026-09-23)`;
  const { error: qe } = await sb.from('audio_pass_requests').update({
    reason: `${pending.reason} + ${mine}`,
    metadata: { ...pending.metadata, job871Recut: { editEventId: eventId, snapshotBatch: snap.batchId, seeds: SEEDS_TOUCHED } },
    updated_at: new Date().toISOString(),
  }).eq('id', pending.id);
  if (qe) throw new Error(`audio-pass append: ${qe.message}`);
  console.log(`audio pass: appended to pending request ${pending.id}`);

  out.eventId = eventId; out.snapshot = snap; out.after = after;
  const ev = evidencePath(`tools/course-optimization/${SWEEP}.json`);
  fs.writeFileSync(ev, JSON.stringify(out, null, 1));
  console.log(`evidence: ${ev}`);
}

module.exports = { COURSE, SEED, SEED_TEXT, OLD_LEGOS, LEGOS, S0140_FIX, GAP_MARKER, isGapFree, phraseContainsLego, legosTileSeed };

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
