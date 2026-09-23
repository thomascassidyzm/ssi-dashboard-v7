#!/usr/bin/env node
'use strict';
// eng_for_hin — S0490L01 (कभी नहीं → never) marked NOT NEW; its "never" drilling re-homed (Kai's ruling,
// 2026-09-23 19:37Z, job #931·H).
//
// Kai: the seed 490 "never" LEGO matches the seed 309 component on both sides (S0309L01C02 कभी नहीं → never), so it is
// not new. Its drilling continues under other LEGOs, with phrases that fit those LEGOs.
//
// WHY THE LINES MOVE. course_round_index is built only from is_new = true rows, so a phrase under a not-new LEGO is
// never heard. Every phrase under a LEGO must CONTAIN that LEGO (build and use), and a practice phrase may not
// introduce vocabulary, so the 9 lines #914·H put under S0490L01 cannot simply be re-labelled: none of them contains
// S0490L02 or S0490L03. They are retired (no clips ever existed) and "never" is drilled instead by 8 new USE lines
// that each contain their host LEGO on both sides and move "never" to a new place:
//   S0490L03  फिर कभी → ever again            6 lines: "never want to … ever again", the seed's own shape, three subjects
// English tiles from COMPLETE taught chunks (checkVocabViolations is a chunk DP, not a word bag): "I will never" cannot
// tile because "will" alone is no chunk, "I never want to" can. "never" stays a chunk after the flip: the validator
// accumulates every LEGO of a seed whatever its is_new, and it is a component of S0309L01 besides.
//   S0495L01  जब यह मायने रखता है → when it matters   2 lines: habitual "never" against the 495 frame
// Tom's rule — the same English is never practised twice — is checked live against every phrase in the course.
// The pre-existing 'कि तो'/'लेकिन तो' lines under S0490L02 (Shuchita-approved) are not touched. Seed 490 keeps two
// is_new LEGOs (L02, L03), so it still plays.
//
// GATES before any write: offline rules; phrase ZUT against the family; the Shuchita deterministic rulebook; the
// edit-cascade DRY RUN for 490 and 495 (live tiling + vocab of the new English); no learner past seed 489. After the
// write, /v2/validate from 490 is compared with the baseline and the rows are restored on any regression.
// Identified write, redo snapshot, edit event, seeds 490 + 495 unapproved, round index refreshed, audio pass appended
// (nothing rendered). The pending Kriti Frame A intro placeholder for S0490L01 (pending/…, no S3 object) is deleted:
// a not-new LEGO gets no introduction.
//
//   node tools/course-optimization/eng-for-hin-seed-490-never-notnew-rehome-2026-09-23.cjs            # dry run
//   node tools/course-optimization/eng-for-hin-seed-490-never-notnew-rehome-2026-09-23.cjs --rows f   # export rows for the checkers
//   node tools/course-optimization/eng-for-hin-seed-490-never-notnew-rehome-2026-09-23.cjs --apply

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
const N = require('./eng-for-hin-seed-490-never-lego-2026-09-23.cjs');
const T = require('./eng-for-hin-seed-490-never-drill-tighten-2026-09-23.cjs');
const P = require('./eng-for-hin-seed-489-if-fold-490-kabhi-2026-09-23.cjs');

const COURSE = 'eng_for_hin';
const JOB = '#931·H';
const SWEEP = 'eng-for-hin-seed-490-never-notnew-rehome-2026-09-23';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = `Kai, 2026-09-23 19:37Z (job ${JOB}): S0490L01 कभी नहीं → never matches the seed 309 component on both sides and is NOT NEW; its drilling continues under other LEGOs with phrases that fit those LEGOs`;
const BUILDER = process.env.COURSE_BUILDER_SELF_URL || 'http://localhost:3471';

const NOT_NEW = { lego_id: 'S0490L01', known: N.NEVER.known, target: N.NEVER.target, component: N.NEVER_COMPONENT };
/** The 9 lines live under S0490L01 today: the #914·H basket after the #918·H tighten. Retired, not re-homed. */
const RETIRED = P.phraseRows('S0490L01', T.offlineCheck().after.slice(0, 4), T.offlineCheck().after.slice(4));

const HOSTS = {
  S0490L03: { seed: 490, lego_index: 3, known: 'फिर कभी', target: 'ever again', existing: 8, firstUse: 6 },
  S0495L01: { seed: 495, lego_index: 1, known: 'जब यह मायने रखता है', target: 'when it matters', existing: 8, firstUse: 6 },
};
/** The re-homed drill: every line contains its host LEGO on both sides and puts "never" in a new frame. */
const NEW_LINES = [
  { host: 'S0490L03', known: 'मैं फिर कभी वहाँ नहीं जाना चाहता।', target: 'I never want to go there ever again' },
  { host: 'S0490L03', known: 'मैं उसे फिर कभी नहीं देखना चाहता।', target: 'I never want to see him ever again' },
  { host: 'S0490L03', known: 'हम फिर कभी बात नहीं करना चाहते।', target: 'we never want to talk ever again' },
  { host: 'S0490L03', known: 'वह फिर कभी यहाँ नहीं आना चाहता।', target: 'he never wants to come here ever again' },
  { host: 'S0490L03', known: 'मुझे लगता है कि मैं फिर कभी वहाँ नहीं जाना चाहता।', target: 'I think that I never want to go there ever again' },
  { host: 'S0490L03', known: 'मुझे यक़ीन है कि मैं उसे फिर कभी नहीं देखना चाहता।', target: "I'm sure I never want to see him ever again" },
  { host: 'S0495L01', known: 'जब यह मायने रखता है तो मैं कभी यहाँ नहीं होता।', target: "I'm never here when it matters" },
  { host: 'S0495L01', known: 'जब यह मायने रखता है तो आप कभी मेरी मदद नहीं करते।', target: 'you never help me when it matters' },
];
const newRows = () => {
  const n = {};
  return NEW_LINES.map(l => { n[l.host] = (n[l.host] || 0) + 1; const u = HOSTS[l.host].firstUse + n[l.host] - 1; return { id: `${COURSE}:${l.host}U${String(u).padStart(2, '0')}`, seed: HOSTS[l.host].seed, lego_id: l.host, lego_index: HOSTS[l.host].lego_index, position: HOSTS[l.host].existing + n[l.host], role: 'use', known: l.known, target: l.target }; });
};

function offlineCheck() {
  const problems = [];
  if (NOT_NEW.known !== NOT_NEW.component.known || NOT_NEW.target !== NOT_NEW.component.target) problems.push('S0490L01 is not the 309 component on both sides — the not-new premise fails');
  if (RETIRED.length !== 9) problems.push(`expected 9 retired lines, have ${RETIRED.length}`);
  for (const l of NEW_LINES) {
    const host = HOSTS[l.host];
    if (!P.phraseContainsLego(host, l)) problems.push(`"${l.target}" does not contain ${l.host} on both sides`);
    if ((l.known.match(/कभी/gu) || []).length !== (l.target.match(/\bnever\b/gi) || []).length) problems.push(`"${l.target}": कभी count ≠ never count`);
    if (!/नहीं/u.test(l.known)) problems.push(`"${l.target}": never without नहीं`);
  }
  const targets = NEW_LINES.map(l => l.target);
  if (new Set(targets.map(t => t.toLowerCase())).size !== targets.length) problems.push('a new line repeats another new line');
  if (!N.neverIsDrilled(NEW_LINES)) problems.push('the re-homed lines do not drill never (fewer than 4 English frames)');
  const ids = newRows().map(r => r.id);
  if (new Set(ids).size !== ids.length) problems.push('phrase ids collide');
  return problems;
}

function supa() { const { createClient } = require('@supabase/supabase-js'); return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } }); }
async function postJson(url, body, headers = {}) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }); let json = null; try { json = await r.json(); } catch { /* */ } return { ok: r.ok, status: r.status, json }; }
const IDENTITY_HEADERS = { 'x-agent-id': `${SWEEP} (${JOB})`, 'x-agent-role': 'content-sweep', 'x-service-name': SWEEP };
async function validateFrom(seed, to) { const r = await postJson(`${BUILDER}/api/v2/validate/${COURSE}`, { fromSeed: seed, ...(to ? { toSeed: to } : {}) }); if (!r.ok) throw new Error(`validate: ${r.status}`); return r.json?.failures || []; }
const failureKey = (fs) => JSON.stringify(fs.map(f => [f.seed, [...(f.issues || [])].sort()]).sort((a, b) => a[0] - b[0]));

async function guard(sb) {
  const problems = [];
  const { data: l01 } = await sb.from('course_legos').select('lego_id, is_new, known_text, target_text').eq('course_code', COURSE).eq('seed_number', 490).order('lego_index');
  const live = (l01 || []).map(l => `${l.lego_id}|${l.is_new}|${l.known_text}|${l.target_text}`).join('\n');
  const want = [`S0490L01|true|${NOT_NEW.known}|${NOT_NEW.target}`, `S0490L02|true|${N.OLD_LEGOS[0].known}|${N.OLD_LEGOS[0].target}`, `S0490L03|true|${HOSTS.S0490L03.known}|${HOSTS.S0490L03.target}`].join('\n');
  if (live !== want) problems.push(`seed 490 LEGOs are not the cut this tool was written against:\n${live}`);
  const { data: comp } = await sb.from('course_practice_phrases').select('known_text, target_text').eq('course_code', COURSE).eq('id', NOT_NEW.component.id).single();
  if (!comp || comp.known_text !== NOT_NEW.component.known || comp.target_text !== NOT_NEW.component.target) problems.push(`${NOT_NEW.component.id} is not कभी नहीं → never`);
  const { data: rows } = await sb.from('course_practice_phrases').select('id, seed_number, lego_index, phrase_role, position, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id').eq('course_code', COURSE).in('seed_number', [490, 495]);
  for (const p of RETIRED) {
    const row = (rows || []).find(r => r.id === p.id);
    if (!row) problems.push(`${p.id} missing`);
    else if (row.known_text !== p.known || row.target_text !== p.target || row.phrase_role !== p.role) problems.push(`${p.id} is ${row.phrase_role} "${row.known_text}" → "${row.target_text}"`);
    else if (row.known_audio_id || row.target1_audio_id || row.target2_audio_id) problems.push(`${p.id} has clips linked — this tool expects none`);
  }
  for (const [id, h] of Object.entries(HOSTS)) {
    const mine = (rows || []).filter(r => r.seed_number === h.seed && r.lego_index === h.lego_index);
    if (mine.length !== h.existing) problems.push(`${id} has ${mine.length} phrases, expected ${h.existing}`);
    if (mine.some(r => r.position > h.existing)) problems.push(`${id} already has a position past ${h.existing}`);
    const { data: lego } = await sb.from('course_legos').select('is_new, known_text, target_text').eq('course_code', COURSE).eq('lego_id', id).single();
    if (!lego || !lego.is_new || lego.known_text !== h.known || lego.target_text !== h.target) problems.push(`${id} is not the new LEGO "${h.known}" → "${h.target}" (${JSON.stringify(lego)})`);
  }
  for (const r of newRows()) if ((rows || []).some(x => x.id === r.id)) problems.push(`${r.id} already exists`);
  // Tom's rule: the same English is never practised twice — against every live phrase in the course, minus the retired 9.
  const retiredIds = new Set(RETIRED.map(p => p.id));
  const { data: dupes } = await sb.from('course_practice_phrases').select('id, target_text').eq('course_code', COURSE).in('target_text', NEW_LINES.map(l => l.target));
  for (const d of (dupes || []).filter(d => !retiredIds.has(d.id))) problems.push(`"${d.target_text}" is already practised at ${d.id}`);
  const { count } = await sb.from('course_enrollments').select('learner_id', { count: 'exact', head: true }).eq('course_id', COURSE).gte('highest_completed_seed', 489);
  const { count: prog } = await sb.from('lego_progress').select('*', { count: 'exact', head: true }).eq('course_id', COURSE).or('lego_id.like.S0490%,lego_id.like.S0495%');
  if ((count || 0) > 0 || (prog || 0) > 0) problems.push(`learners past seed 489: ${count}; progress rows on S0490*/S0495*: ${prog} — migrate progress first`);
  return { problems, rows: rows || [] };
}

/** The edit-cascade dry run validates the new English through the live tiling + vocab gates without writing. */
async function dryRunSeed(sb, seed, extra) {
  const { data: seedRow } = await sb.from('course_seeds').select('known_text, target_text').eq('course_code', COURSE).eq('seed_number', seed).single();
  const { data: legos } = await sb.from('course_legos').select('lego_id, lego_index, type, known_text, target_text').eq('course_code', COURSE).eq('seed_number', seed).order('lego_index');
  const { data: phrases } = await sb.from('course_practice_phrases').select('id, lego_index, phrase_role, position, known_text, target_text').eq('course_code', COURSE).eq('seed_number', seed).order('position');
  const body = legos.map(l => {
    const mine = phrases.filter(p => p.lego_index === l.lego_index);
    const add = extra.filter(e => e.lego_id === l.lego_id).map(e => ({ known: e.known, target: e.target }));
    return { idx: l.lego_index, type: l.type, known: l.known_text, target: l.target_text, build: mine.filter(p => p.phrase_role === 'build').map(p => ({ known: p.known_text, target: p.target_text })), use: [...mine.filter(p => p.phrase_role === 'use').map(p => ({ known: p.known_text, target: p.target_text })), ...add] };
  });
  const [dry, base] = await Promise.all([
    postJson(`${BUILDER}/api/course/${COURSE}/edit-cascade`, { seed_number: seed, target_text: seedRow.target_text, generateAudio: false, dryRun: true, legos: body }, IDENTITY_HEADERS),
    validateFrom(seed),
  ]);
  if (!dry.ok || !dry.json?.ok) throw new Error(`edit-cascade dry run for ${seed} refused: ${dry.status} ${JSON.stringify(dry.json).slice(0, 800)}`);
  const baseline = new Map(base.map(f => [f.seed, new Set(f.issues)]));
  const caused = [];
  for (const f of dry.json.blastRadius?.failures || []) { const fresh = (f.issues || []).filter(i => !(baseline.get(f.seed) || new Set()).has(i)); if (fresh.length) caused.push({ seed: f.seed, issues: fresh }); }
  return { seed, case: dry.json.case, vocabDelta: dry.json.vocabDelta, baselineRed: baseline.size, caused };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const rowsAt = process.argv.indexOf('--rows');
  if (rowsAt >= 0) { const out = newRows().map(r => ({ seed: r.seed, id: r.id, role: r.role, known: r.known, target: r.target })); fs.writeFileSync(process.argv[rowsAt + 1], JSON.stringify(out, null, 1)); console.log(`${out.length} rows → ${process.argv[rowsAt + 1]}`); return; }
  const sb = supa();
  console.log(`\n══════ ${COURSE}: S0490L01 not new, "never" drill re-homed (${JOB}) ══════`);
  const offline = offlineCheck();
  if (offline.length) throw new Error(`offline rules: ${offline.join('; ')}`);
  console.log(`offline: S0490L01 = ${NOT_NEW.component.id} both sides; 9 retired lines named; ${NEW_LINES.length} new lines each contain their host LEGO; never in ${N.neverFrames(NEW_LINES).size} English frames`);
  const { problems } = await guard(sb);
  for (const p of problems) console.error(`BLOCKED  ${p}`);
  if (problems.length) { console.error('\nBLOCKED — live state differs. Nothing written.'); process.exit(1); }
  console.log('live: seed 490 cut as expected; 9 retired lines present with no clips; hosts at 8 phrases; no English practised elsewhere; learners past 489: 0');

  const { checkPhraseZUT } = require('../../services/course-builder/lib/validation.cjs');
  const { courseFamily } = require('../../services/course-builder/lib/course-family.cjs');
  const family = await courseFamily(sb, COURSE);
  for (const seed of [490, 495]) {
    const zut = await checkPhraseZUT(sb, COURSE, NEW_LINES.filter(l => HOSTS[l.host].seed === seed), seed, { family });
    if (zut.length) throw new Error(`phrase ZUT (${seed}): ${JSON.stringify(zut)}`);
  }
  const { runDeterministic } = require('./eng-for-hin-shuchita-rulebook.cjs');
  const hits = newRows().flatMap(r => runDeterministic({ seed: r.seed, id: r.id, role: r.role, known: r.known, target: r.target }));
  if (hits.length) throw new Error(`Shuchita deterministic: ${JSON.stringify(hits)}`);
  console.log('ZUT clean (490, 495); Shuchita deterministic 0 hits');
  const gates = [];
  for (const seed of [490, 495]) {
    const g = await dryRunSeed(sb, seed, newRows().filter(r => r.seed === seed));
    gates.push(g);
    console.log(`live gates ${seed} (edit-cascade dry run): ${g.case}; vocab +${JSON.stringify(g.vocabDelta?.added)} −${JSON.stringify(g.vocabDelta?.removed)}; already red from ${seed}: ${g.baselineRed}; caused: ${g.caused.length ? JSON.stringify(g.caused) : 'none'}`);
    if (g.caused.length) { console.error('BLOCKED — the new lines fail a live gate.'); process.exit(1); }
  }

  const { evidencePath } = require('../lib/evidence-path.cjs');
  const out = { sweep: SWEEP, job: JOB, at: new Date().toISOString(), ruling: RULING, apply, notNew: NOT_NEW, retired: RETIRED, newRows: newRows(), gates };
  if (!apply) { const ev = evidencePath(`tools/course-optimization/${SWEEP}-dryrun.json`); fs.writeFileSync(ev, JSON.stringify(out, null, 1)); console.log(`\nDRY RUN — nothing written. evidence: ${ev}`); return; }

  // ─── apply ──────────────────────────────────────────────────────────────
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { snapshotSeeds } = require('../../services/course-builder/lib/redo-snapshot.cjs');
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  const { computeLegoPosition } = require('../../services/course-builder/lib/phrase-structure.cjs');
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };
  const before = await validateFrom(490);
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const snap = await snapshotSeeds(sb, COURSE, [490, 495], { reason: 'seed-490-never-notnew-rehome', notes: `${RULING}. Undo: POST /api/build/redo-undo/${COURSE}.` });
  const eventId = await recordContentEdit(sb, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-not-new-rehome',
    scope: { seed_numbers: [490, 495], lego_ids: ['S0490L01', 'S0490L03', 'S0495L01'], phrase_ids: [...RETIRED.map(p => p.id), ...newRows().map(r => r.id)] },
    detail: { job: JOB, ruling: RULING, not_new: NOT_NEW, retired: RETIRED, inserted: newRows(), snapshot_batch: snap.batchId } });
  console.log(`edit event ${eventId}; snapshot batch ${snap.batchId}`);

  must(await sb.from('course_legos').update({ is_new: false, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('lego_id', 'S0490L01'), 'S0490L01 not new');
  console.log('  S0490L01 is_new → false');
  must(await sb.from('course_practice_phrases').delete().eq('course_code', COURSE).in('id', RETIRED.map(p => p.id)), 'retire');
  console.log(`  retired ${RETIRED.length} S0490L01 lines (no clips existed; in snapshot ${snap.batchId})`);
  const inserts = newRows().map(r => ({ id: r.id, course_code: COURSE, seed_number: r.seed, lego_index: r.lego_index, position: r.position, known_text: r.known, target_text: r.target,
    word_count: r.target.length, lego_count: (r.known.match(/\s+/g) || []).length + 1, metadata: { format: 'build_use', rehomed_from: 'S0490L01', job: JOB }, status: 'draft',
    phrase_role: r.role, lego_position: computeLegoPosition(r.target, HOSTS[r.lego_id].target), introduce: true, last_edit_event_id: eventId }));
  must(await sb.from('course_practice_phrases').insert(inserts), 'insert');
  for (const r of newRows()) console.log(`  + ${r.id}  "${r.known}" → "${r.target}"`);

  const after = await validateFrom(490);
  if (failureKey(after) !== failureKey(before)) {
    must(await sb.from('course_practice_phrases').delete().eq('course_code', COURSE).in('id', newRows().map(r => r.id)), 'restore: remove inserts');
    must(await sb.from('course_practice_phrases').insert(RETIRED.map((p, i) => ({ id: p.id, course_code: COURSE, seed_number: 490, lego_index: 1, position: i + 1, known_text: p.known, target_text: p.target, word_count: p.target.length, lego_count: (p.known.match(/\s+/g) || []).length + 1, metadata: { format: 'build_use' }, status: 'draft', phrase_role: p.role, lego_position: computeLegoPosition(p.target, NOT_NEW.target), introduce: true }))), 'restore: retired');
    must(await sb.from('course_legos').update({ is_new: true }).eq('course_code', COURSE).eq('lego_id', 'S0490L01'), 'restore: is_new');
    throw new Error(`validator from 490 changed after the write: ${JSON.stringify(after)} — rows restored`);
  }
  console.log(`validator from 490 after: unchanged (${after.length} seed(s) red, same as before)`);
  const { data: idx } = await sb.from('course_legos').select('lego_id').eq('course_code', COURSE).eq('seed_number', 490).eq('is_new', true);
  if (!idx || idx.length < 1) throw new Error('seed 490 has no is_new LEGO — it would stop playing');
  console.log(`  seed 490 keeps ${idx.length} is_new LEGO(s): ${idx.map(l => l.lego_id).join(', ')}`);

  const { data: placeholder } = await sb.from('course_audio').select('id, s3_key, text').eq('course_code', COURSE).eq('role', 'presentation').eq('lego_id', 'S0490L01').like('s3_key', 'pending/%').like('text', `%'${NOT_NEW.known}'%`);
  for (const ph of placeholder || []) { must(await sb.from('course_audio').delete().eq('id', ph.id), 'placeholder'); console.log(`  deleted pending intro placeholder ${ph.id} (${ph.s3_key}, no object) — a not-new LEGO is not introduced`); }

  must(await sb.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId }).eq('course_code', COURSE).in('seed_number', [490, 495]), 'unapprove');
  await refreshNow();
  const pending = must(await sb.from('audio_pass_requests').select('id, reason, metadata').eq('course_code', COURSE).eq('status', 'pending').maybeSingle(), 'pending audio pass');
  if (!pending) throw new Error(`no pending audio-pass request for ${COURSE} — the 8 new lines need clips`);
  const mine = `S0490L01 never LEGO marked not new, its 9 unrendered lines retired; "never" drill re-homed as 8 new USE lines (6 under S0490L03, 2 under S0495L01) null-audio, Kriti/Charlotte (Kai's ruling 2026-09-23 19:37Z, job ${JOB}); S0490L01 pending intro placeholder removed`;
  must(await sb.from('audio_pass_requests').update({ reason: `${pending.reason} + ${mine}`, metadata: { ...pending.metadata, job931NeverNotNew: { editEventId: eventId, snapshotBatch: snap.batchId, inserted: newRows().map(r => r.id), retired: RETIRED.map(p => p.id) } }, updated_at: new Date().toISOString() }).eq('id', pending.id), 'audio-pass append');
  console.log(`seeds 490 + 495 unapproved; round index refreshed; audio pass appended to ${pending.id}`);
  out.eventId = eventId; out.snapshot = snap; out.validatorAfter = after;
  const ev = evidencePath(`tools/course-optimization/${SWEEP}.json`); fs.writeFileSync(ev, JSON.stringify(out, null, 1)); console.log(`evidence: ${ev}`);
}

module.exports = { COURSE, NOT_NEW, RETIRED, HOSTS, NEW_LINES, newRows, offlineCheck };
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
