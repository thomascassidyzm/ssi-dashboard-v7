#!/usr/bin/env node
'use strict';
// eng_for_hin — follow-up to eng-for-hin-final-checks-fix-2026-09-25.cjs (job #181·I, 2026-09-25, same ruling).
//
// The first pass corrected two English lines to plain English; POST /api/v2/validate then went 666/668: the validator
// tiles a phrase's English by WHOLE LEGO chunks known at that seed, and "we were talking a while ago" / "I'll get there
// safely" are not tileable (the chunks are "we were talking about" from S0143L02 and "to get there" from S0562L02).
// So the two lines are re-worded to English the course can tile — still plain English, still the LEGO — and the Hindi
// follows:
//   S0184L03U04: "we were talking about the story a while ago" / हम थोड़ी देर पहले कहानी के बारे में बात कर रही थीं।
//                (कहानी is S0036L02 "the story"; the tiling label stays " we were talking about")
//   S0562L03U03: "I'd like to get there safely" / मैं वहाँ सुरक्षित पहुँचना चाहूँगी।  (चाहूँगी = "I'd like", S0021L03 pattern)
// Same guarded path, same pair rewrite, same snapshot + edit event; nothing rendered.
//
//   node tools/course-optimization/eng-for-hin-final-checks-fix-2026-09-25-b.cjs            # dry run + live gates
//   node tools/course-optimization/eng-for-hin-final-checks-fix-2026-09-25-b.cjs --apply
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });

const COURSE = 'eng_for_hin';
const JOB = '#181·I';
const SWEEP = 'eng-for-hin-final-checks-fix-2026-09-25-b';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = `Kai, 2026-09-25 10:26Z (job ${JOB}): final checks before the joint render — fix only what is clearly wrong among the 55 Shuchita hits on #941·H rows and the 26 #20·I author flags; settle borderline items by best effort and list them`;

/** id → {seed, role, lego (the form of its LEGO this row must contain), known, target} before, and the intended text after. The table is the truth; the transform below must reproduce it. */
const PHRASES = [
  { id: 'eng_for_hin:S0562L03U03', seed: 562, role: 'use', lego: 'सुरक्षित', known: 'मैं वहाँ सुरक्षित पहुँच जाऊँगी।', target: "I'll get there safely", newKnown: 'मैं वहाँ सुरक्षित पहुँचना चाहूँगी।', newTarget: "I'd like to get there safely" },
  { id: 'eng_for_hin:S0184L03U04', seed: 184, role: 'use', lego: 'थोड़ी देर पहले', known: 'हम थोड़ी देर पहले बात कर रही थीं।', target: 'we were talking a while ago', newKnown: 'हम थोड़ी देर पहले कहानी के बारे में बात कर रही थीं।', newTarget: 'we were talking about the story a while ago',
    decompFix: { from: ' we were talking', to: ' we were talking about' } },
];
const SEEDS = [];
const SEEDS_TOUCHED = [...new Set([...PHRASES.map(p => p.seed), ...SEEDS.map(s => s.seed)])].sort((a, b) => a - b);

/** The same rewrite, gender-aware, so a course_gender_expansions pair (male / female sides) moves with its row. Idempotent. */
function transformKnown(text) {
  let t = String(text);
  t = t.replace(/^मैं वहाँ सुरक्षित पहुँच जाऊँगा।$/u, 'मैं वहाँ सुरक्षित पहुँचना चाहूँगा।');
  t = t.replace(/^मैं वहाँ सुरक्षित पहुँच जाऊँगी।$/u, 'मैं वहाँ सुरक्षित पहुँचना चाहूँगी।');
  t = t.replace(/^हम थोड़ी देर पहले बात कर (रहे थे|रही थीं)।$/u, 'हम थोड़ी देर पहले कहानी के बारे में बात कर $1।');
  return t;
}

/** The defects, as rules a row either breaks or does not — the test of this tool. */
function defects(rows) {
  const out = [];
  for (const r of rows) {
    const k = String(r.known || ''), t = String(r.target || '');
    if (r.lego && !k.includes(r.lego)) out.push(`${r.id}: does not contain its LEGO ${r.lego}`);
    if (/^I'll get there safely$/.test(t)) out.push(`${r.id}: "I'll get there" is not tileable at seed 562 (validator red)`);
    if (/^we were talking a while ago$/.test(t)) out.push(`${r.id}: "we were talking" is not tileable at seed 184 (validator red)`);
  }
  return out;
}
const oldRows = () => [
  ...SEEDS.map(s => ({ id: `S${String(s.seed).padStart(4, '0')}`, seed: s.seed, role: 'seed', known: s.known, target: s.target })),
  ...PHRASES.map(p => ({ id: p.id, seed: p.seed, role: p.role, lego: p.lego, known: p.known, target: p.target })),
];
const newRows = () => [
  ...SEEDS.map(s => ({ id: `S${String(s.seed).padStart(4, '0')}`, seed: s.seed, role: 'seed', known: s.newKnown, target: s.target })),
  ...PHRASES.map(p => ({ id: p.id, seed: p.seed, role: p.role, lego: p.lego, known: p.newKnown, target: p.newTarget || p.target })),
];

// ── Live ──────────────────────────────────────────────────────────────────
function supa() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}
function must(res, what) { if (res.error) throw new Error(`${what}: ${res.error.message}`); return res.data; }

async function guard(sb) {
  const problems = [];
  const seeds = must(await sb.from('course_seeds').select('seed_number, known_text, target_text, approved_at, known_audio_id').eq('course_code', COURSE).in('seed_number', SEEDS.map(s => s.seed)), 'seeds');
  for (const s of SEEDS) {
    const row = seeds.find(r => r.seed_number === s.seed);
    if (!row) problems.push(`seed ${s.seed} missing`);
    else if (row.known_text !== s.known || row.target_text !== s.target) problems.push(`seed ${s.seed} is "${row.known_text}" → "${row.target_text}"`);
  }
  const phrases = must(await sb.from('course_practice_phrases').select('id, seed_number, lego_id, known_text, target_text, decomposition, metadata, known_audio_id, target1_audio_id, target2_audio_id').eq('course_code', COURSE).in('id', PHRASES.map(p => p.id)), 'phrases');
  for (const p of PHRASES) {
    const row = phrases.find(r => r.id === p.id);
    if (!row) problems.push(`${p.id} missing`);
    else if (row.known_text !== p.known || row.target_text !== p.target) problems.push(`${p.id} is "${row.known_text}" → "${row.target_text}"`);
  }
  const legoIds = [...new Set(PHRASES.map(p => p.id.replace('eng_for_hin:', '').slice(0, 8)))];
  const legos = must(await sb.from('course_legos').select('lego_id, known_text').eq('course_code', COURSE).in('lego_id', legoIds), 'legos');
  for (const p of PHRASES) {
    const l = legos.find(x => x.lego_id === p.id.replace('eng_for_hin:', '').slice(0, 8));
    if (!l || l.known_text !== (p.legoText || p.lego)) problems.push(`${p.id}: LEGO is "${l && l.known_text}", tool expects "${p.legoText || p.lego}"`);
  }
  // S0562L03 must keep ≥5 USE rows: this tool rewrites U03, never removes it — counted for the record.
  const useCount = must(await sb.from('course_practice_phrases').select('id', { count: 'exact', head: true }).eq('course_code', COURSE).eq('lego_id', 'S0562L03').eq('phrase_role', 'use'), 'S0562L03 use count');
  const oldKnowns = [...PHRASES.map(p => p.known), ...SEEDS.map(s => s.known)];
  const pairMap = new Map();
  for (const col of ['original_text', 'expanded_f', 'expanded_m']) {
    for (const r of must(await sb.from('course_gender_expansions').select('id, original_text, expanded_f, expanded_m').eq('course_code', COURSE).eq('text_side', 'known').in(col, oldKnowns), `pairs by ${col}`)) pairMap.set(r.id, r);
  }
  const pairs = [...pairMap.values()];
  const pairPlan = pairs.map(r => {
    const to = { original_text: transformKnown(r.original_text), expanded_f: transformKnown(r.expanded_f), expanded_m: transformKnown(r.expanded_m) };
    return { id: r.id, from: r, to, changed: to.original_text !== r.original_text || to.expanded_f !== r.expanded_f || to.expanded_m !== r.expanded_m };
  }).filter(p => p.changed);
  return { problems, seeds, phrases, legos, pairPlan };
}

async function main() {
  const apply = process.argv.includes('--apply');
  // offline: the table and the transform agree; every defect present before, none after
  for (const p of PHRASES) if (transformKnown(p.known) !== p.newKnown) throw new Error(`transform disagrees with the table on ${p.id}: "${transformKnown(p.known)}" vs "${p.newKnown}"`);
  for (const s of SEEDS) if (transformKnown(s.known) !== s.newKnown) throw new Error(`transform disagrees with the table on seed ${s.seed}`);
  for (const p of PHRASES) if (transformKnown(p.newKnown) !== p.newKnown) throw new Error(`transform is not idempotent on ${p.id}`);
  const pre = defects(oldRows()), post = defects(newRows());
  if (pre.length < oldRows().length) throw new Error(`pre-fix: expected every row to carry a defect, got ${pre.length}/${oldRows().length}:\n${pre.join('\n')}`);
  if (post.length) throw new Error(`post-fix rows still defective: ${post.join('; ')}`);
  console.log(`offline: ${pre.length} defects on ${oldRows().length} rows before, 0 after; every phrase contains its LEGO`);

  const sb = supa();
  const g = await guard(sb);
  if (g.problems.length) { console.error('GUARD FAILED — the live course is not what this tool was written against:\n  ' + g.problems.join('\n  ')); process.exit(2); }
  console.log(`guard: live rows match; ${g.pairPlan.length} gender pairs to rewrite`);

  const { checkPhraseZUT } = require('../../services/course-builder/lib/validation.cjs');
  const { courseFamily } = require('../../services/course-builder/lib/course-family.cjs');
  const family = await courseFamily(sb, COURSE);
  let zutHits = [];
  for (const seed of SEEDS_TOUCHED) {
    const rows = newRows().filter(r => r.seed === seed && r.role !== 'seed');
    if (!rows.length) continue;
    const hits = await checkPhraseZUT(sb, COURSE, rows, seed, { family });
    // a hit against the row's own old self (same id) is not a collision; anything else is
    zutHits.push(...hits.filter(h => !rows.some(r => r.known === h.known && r.target === h.target && h.existingId === r.id)));
  }
  console.log(`ZUT: ${zutHits.length} hit(s)${zutHits.length ? ' ' + JSON.stringify(zutHits).slice(0, 1200) : ''}`);
  if (zutHits.length) throw new Error('phrase ZUT hits — refusing');

  const table = [
    ...SEEDS.map(s => ({ id: `S${String(s.seed).padStart(4, '0')}`, role: 'seed', seed: s.seed, before: s.known, after: s.newKnown, target: s.target, known_gender: null })),
    ...PHRASES.map(p => ({ id: p.id, role: p.role, seed: p.seed, before: p.known, after: p.newKnown, target: p.target, targetAfter: p.newTarget || p.target, known_gender: (g.phrases.find(r => r.id === p.id) || {}).metadata?.known_gender || null })),
  ];
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const out = { sweep: SWEEP, job: JOB, at: new Date().toISOString(), ruling: RULING, apply, rows: table, pairs: g.pairPlan.map(p => ({ id: p.id, from: p.from.original_text, to: p.to.original_text })), approvals: g.seeds.map(s => ({ seed: s.seed_number, approved_at: s.approved_at })) };
  for (const r of table) console.log(`  ${r.id.replace('eng_for_hin:', '').padEnd(12)} ${(r.known_gender || '-').padEnd(2)} ${r.before}  →  ${r.after}${r.targetAfter && r.targetAfter !== r.target ? `   [EN: ${r.target} → ${r.targetAfter}]` : ''}`);
  if (!apply) { const ev = evidencePath(`tools/course-optimization/${SWEEP}-dryrun.json`); fs.writeFileSync(ev, JSON.stringify(out, null, 1)); console.log(`DRY RUN — nothing written. evidence: ${ev}`); return; }

  // ─── apply ──────────────────────────────────────────────────────────────
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { snapshotSeeds } = require('../../services/course-builder/lib/redo-snapshot.cjs');
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  const pending = must(await sb.from('audio_pass_requests').select('id, reason, metadata').eq('course_code', COURSE).eq('status', 'pending').maybeSingle(), 'pending audio pass');
  if (!pending) throw new Error(`no pending audio-pass request for ${COURSE} — queue one with queue-audio-pass.cjs`);

  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const snap = await snapshotSeeds(sb, COURSE, SEEDS_TOUCHED, { reason: 'final-checks-fix-b', notes: `${RULING}. Undo: POST /api/build/redo-undo/${COURSE}.` });
  const eventId = await recordContentEdit(sb, {
    identity, courseCode: COURSE, surface: SURFACE, operation: 'known-text-fix',
    scope: { seeds: SEEDS_TOUCHED, phrases: PHRASES.map(p => p.id) },
    detail: { job: JOB, ruling: RULING, rows: table, pairs: g.pairPlan.map(p => p.id), approvals_kept: out.approvals, snapshot_batch: snap.batchId },
  });
  console.log(`edit event ${eventId}; snapshot batch ${snap.batchId}`);

  for (const s of SEEDS) must(await sb.from('course_seeds').update({ known_text: s.newKnown, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', s.seed).eq('known_text', s.known), `seed ${s.seed}`);
  for (const p of PHRASES) {
    const row = g.phrases.find(r => r.id === p.id);
    const patch = { known_text: p.newKnown, last_edit_event_id: eventId };
    if (p.newTarget) patch.target_text = p.newTarget;
    if (p.decompFix && Array.isArray(row.decomposition)) patch.decomposition = row.decomposition.map(e => e && e.target === p.decompFix.from ? { ...e, target: p.decompFix.to } : e);
    must(await sb.from('course_practice_phrases').update(patch).eq('course_code', COURSE).eq('id', p.id).eq('known_text', p.known), p.id);
  }
  for (const p of g.pairPlan) must(await sb.from('course_gender_expansions').update(p.to).eq('id', p.id).eq('course_code', COURSE).eq('text_side', 'known'), `pair ${p.id}`);

  // verify
  const bad = [];
  const seedsNow = must(await sb.from('course_seeds').select('seed_number, known_text, known_audio_id').eq('course_code', COURSE).in('seed_number', SEEDS.map(s => s.seed)), 'seeds after');
  for (const s of SEEDS) { const r = seedsNow.find(x => x.seed_number === s.seed); if (!r || r.known_text !== s.newKnown) bad.push(`seed ${s.seed} text`); else if (r.known_audio_id) bad.push(`seed ${s.seed} still links a Hindi clip`); }
  const phrNow = must(await sb.from('course_practice_phrases').select('id, known_text, target_text, known_audio_id, target1_audio_id, decomposition, metadata').eq('course_code', COURSE).in('id', PHRASES.map(p => p.id)), 'phrases after');
  for (const p of PHRASES) {
    const r = phrNow.find(x => x.id === p.id); const was = g.phrases.find(x => x.id === p.id);
    if (!r || r.known_text !== p.newKnown || r.target_text !== (p.newTarget || p.target)) bad.push(`${p.id} text`);
    else if (r.known_audio_id) bad.push(`${p.id} still links Hindi clip ${r.known_audio_id}`);
    else if (p.newTarget && r.target1_audio_id) bad.push(`${p.id} still links an English clip for the old English`);
    else if (p.decompFix && JSON.stringify(r.decomposition || '').includes(JSON.stringify(p.decompFix.from))) bad.push(`${p.id} decomposition stale`);
    else if ((r.metadata?.known_gender || null) !== (was.metadata?.known_gender || null)) bad.push(`${p.id} gender stamp moved`);
  }
  if (bad.length) throw new Error(`POST-APPLY CHECK FAILED (snapshot ${snap.batchId} can undo): ${bad.join('; ')}`);
  console.log(`verified: ${SEEDS.length} seeds, ${PHRASES.length} phrases (Hindi clips null, gender stamps intact), ${g.pairPlan.length} pairs`);

  await refreshNow();
  const mine = `final checks follow-up (job ${JOB}): S0562L03U03 and S0184L03U04 re-worded on both sides to English the validator can tile — null-audio both sides`;
  must(await sb.from('audio_pass_requests').update({ reason: `${pending.reason} + ${mine}`, metadata: { ...pending.metadata, job181FinalChecksB: { editEventId: eventId, snapshotBatch: snap.batchId, seeds: SEEDS_TOUCHED } }, updated_at: new Date().toISOString() }).eq('id', pending.id), 'audio-pass append');
  console.log(`audio pass: appended to pending request ${pending.id}`);
  out.eventId = eventId; out.snapshot = snap;
  const ev = evidencePath(`tools/course-optimization/${SWEEP}.json`);
  fs.writeFileSync(ev, JSON.stringify(out, null, 1));
  console.log(`evidence: ${ev}`);
}

module.exports = { COURSE, PHRASES, SEEDS, SEEDS_TOUCHED, transformKnown, defects, oldRows, newRows };
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
