#!/usr/bin/env node
'use strict';
// eng_for_hin — seed 490 teaches and DRILLS "never" (Kai's addition, 2026-09-23 17:32Z, job #914·H).
//
// Kai: "once कभी is added, NEVER must be properly practised, not just corrected. Check where कभी नहीं / कभी … नहीं →
// never is first taught as a LEGO. If that is not before or at seed 490, it needs to be taught (a LEGO) there."
//
// WHERE "never" IS TAUGHT (live, 2026-09-23): the only earlier row is seed 309 — S0309L01 मैंने कभी नहीं देखा →
// "I've never seen", an M-LEGO whose COMPONENT S0309L01C02 is कभी नहीं → never. Components are presented but carry
// no basket, and every one of 309's 11 "never" phrases is the one frame "I've never seen X". No LEGO row (course_legos)
// teaches "never" anywhere in the course, and at seed 490 it was only ever heard inside the whole chunk "then I will
// never trust anyone" (all 16 phrases). So "never" gets its own LEGO at 490, first, with a basket that moves it around:
//   S0490L01  कभी नहीं                          → never                          NEW — 4 build + 5 use, known vocabulary only
//   S0490L02  तो मैं कभी किसी पर भरोसा नहीं करूँगा → then I will never trust anyone  the 8 phrases of old L01, byte-identical
//   S0490L03  फिर कभी                            → ever again                     the 8 phrases of old L02, byte-identical
// Seed text unchanged. The three LEGOs' words all sit in the seed (the live tiling gate is coverage); कभी नहीं overlaps
// L02 on both sides by design — it is the piece being isolated for practice, the same way 309 isolated it as a
// component. English drill lines tile from taught chunks only (checked live by the edit-cascade dry run); the
// Hindi splits कभी … नहीं around the verb phrase as Hindi does.
//
// GATES before any write: offline rules; LEGO + phrase ZUT against the family; the edit-cascade DRY RUN; the Shuchita
// checker (--input, deterministic + judged) and a cross-family (Astra) read on the --rows export. Learners past 489: 0.
//
// AUDIO: renders nothing. edit-cascade reinserts the seed's LEGO and phrase rows, so the existing clip links on the
// 16 renumbered phrases (target1 only; known side was already null) drop and relink by text on the pending pass,
// which is regenerating this course in Kriti/Charlotte anyway. Pending Frame A intros in Kriti for all three LEGOs;
// the pending row #914 keyed to the old S0490L01 (तो मैं कभी …) is re-pointed to S0490L02, never orphaned.
//
//   node tools/course-optimization/eng-for-hin-seed-490-never-lego-2026-09-23.cjs            # dry run
//   node tools/course-optimization/eng-for-hin-seed-490-never-lego-2026-09-23.cjs --rows f   # export rows for the checkers
//   node tools/course-optimization/eng-for-hin-seed-490-never-lego-2026-09-23.cjs --apply

const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
const P = require('./eng-for-hin-seed-489-if-fold-490-kabhi-2026-09-23.cjs'); // the rules and the state this builds on

const COURSE = 'eng_for_hin';
const SEED = 490;
const JOB = '#914·H';
const SWEEP = 'eng-for-hin-seed-490-never-lego-2026-09-23';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = `Kai, 2026-09-23 17:32Z (job ${JOB}): "never" must be taught as a LEGO at or before seed 490 and drilled there — कभी नहीं → never becomes S0490L01 with its own basket`;
const BUILDER = process.env.COURSE_BUILDER_SELF_URL || 'http://localhost:3471';
const HINDI_TEMPLATE = "{target_lang_name} में — '{known}' — जैसे — '{seed}' — में :";
const TARGET_LANG_NAME = 'अंग्रेज़ी';

const SEED_TEXT = P.SEED_490;
/** Where "never" was taught before: a component, not a LEGO row. */
const NEVER_COMPONENT = { id: 'eng_for_hin:S0309L01C02', known: 'कभी नहीं', target: 'never', parent: 'S0309L01' };
const NEVER = { known: 'कभी नहीं', target: 'never' };

/** The live cut this tool was written against (after the कभी fix landed). */
const OLD_LEGOS = [
  { lego_id: 'S0490L01', known: P.NEW_490_L01.known, target: P.NEW_490_L01.target },
  { lego_id: 'S0490L02', known: 'फिर कभी', target: 'ever again' },
];
const OLD_L01_PHRASES = P.NEW_490_L01_PHRASES; // 8, ids …S0490L01B01-B03/U01-U05
const OLD_L02_PHRASES = [
  { id: `${COURSE}:S0490L02B01`, role: 'build', known: 'तो मैं फिर कभी किसी पर भरोसा नहीं करूँगा।', target: 'then I will never trust anyone ever again' },
  { id: `${COURSE}:S0490L02B02`, role: 'build', known: 'मुझे लगता है कि तो मैं फिर कभी किसी पर भरोसा नहीं करूँगा।', target: 'I think that then I will never trust anyone ever again' },
  { id: `${COURSE}:S0490L02B03`, role: 'build', known: 'मैंने कहा था कि तो मैं फिर कभी किसी पर भरोसा नहीं करूँगा।', target: 'I said that then I will never trust anyone ever again' },
  { id: `${COURSE}:S0490L02U01`, role: 'use', known: 'अगर आपने अभी के अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो मैं फिर कभी किसी पर भरोसा नहीं करूँगा।', target: "if you don't make me a strong cup of coffee right now then I will never trust anyone ever again" },
  { id: `${COURSE}:S0490L02U02`, role: 'use', known: 'मुझे डर है कि तो मैं फिर कभी किसी पर भरोसा नहीं करूँगा।', target: "I'm afraid then I will never trust anyone ever again" },
  { id: `${COURSE}:S0490L02U03`, role: 'use', known: 'मुझे यक़ीन है कि तो मैं फिर कभी किसी पर भरोसा नहीं करूँगा।', target: "I'm sure then I will never trust anyone ever again" },
  { id: `${COURSE}:S0490L02U04`, role: 'use', known: 'मेरे हिसाब से तो मैं फिर कभी किसी पर भरोसा नहीं करूँगा।', target: 'then I will never trust anyone ever again if you ask me' },
  { id: `${COURSE}:S0490L02U05`, role: 'use', known: 'क्या आपको लगता है कि तो मैं फिर कभी किसी पर भरोसा नहीं करूँगा?', target: 'do you think that then I will never trust anyone ever again?' },
];
const strip = (p) => ({ known: p.known, target: p.target });

/** The "never" basket — every line moves never to a new place; English from taught chunks only. */
const NEVER_BUILD = [
  { known: 'मैं कभी गुस्से में नहीं होता', target: "I'm never angry" },
  { known: 'हम कभी बात नहीं करते', target: 'we never talk' },
  { known: 'मैं वहाँ कभी नहीं गया', target: "I've never been there" },
  { known: 'आप कभी मेरी मदद नहीं करते', target: 'you never help me' },
];
const NEVER_USE = [
  { known: 'मुझे कभी पता नहीं होता कि क्या कहूँ।', target: 'I never know what to say' },
  { known: 'वह कभी यहाँ नहीं होता।', target: "he's never here" },
  { known: 'मुझे लगता है कि मैं कभी ख़ुश नहीं होता।', target: "I think that I'm never happy" },
  { known: 'मैं आपके साथ कभी बात नहीं करना चाहता क्योंकि आप कभी मेरी मदद नहीं करते।', target: 'I never want to speak with you because you never help me' },
  { known: 'मैंने कहा था कि मैं वहाँ कभी नहीं गया।', target: "I said that I've never been there" },
];

const LEGOS = [
  { idx: 1, type: 'A', known: NEVER.known, target: NEVER.target, build: NEVER_BUILD, use: NEVER_USE },
  { idx: 2, type: 'A', known: OLD_LEGOS[0].known, target: OLD_LEGOS[0].target, build: OLD_L01_PHRASES.filter(p => p.role === 'build').map(strip), use: OLD_L01_PHRASES.filter(p => p.role === 'use').map(strip) },
  { idx: 3, type: 'A', known: OLD_LEGOS[1].known, target: OLD_LEGOS[1].target, build: OLD_L02_PHRASES.filter(p => p.role === 'build').map(strip), use: OLD_L02_PHRASES.filter(p => p.role === 'use').map(strip) },
];

// ── The rules, as code ───────────────────────────────────────────────────────
const normWords = (s) => String(s || '').toLowerCase().replace(/[.,!?;:।"]+/g, ' ').replace(/’/g, "'").replace(/\s+/g, ' ').trim();
/** Every LEGO word is in the seed, both sides (the live gate: coverage, not a bag — कभी नहीं overlaps L02 by design). */
function legosCoveredBySeed(legos, seed) {
  const bag = (s) => new Set(normWords(s).split(' ').filter(Boolean));
  const tk = bag(seed.known), tt = bag(seed.target);
  return legos.every(l => normWords(l.known).split(' ').every(w => tk.has(w)) && normWords(l.target).split(' ').every(w => tt.has(w)));
}
/** "never" is DRILLED when its phrases put it in more than one English frame — not the same words around it every time. */
function neverFrames(phrases) {
  const frames = new Set();
  for (const p of phrases) {
    const w = normWords(p.target).split(' ');
    const i = w.indexOf('never'); if (i < 0) continue;
    frames.add(`${w[i - 1] || '^'} _ ${w[i + 1] || '$'}`);
  }
  return frames;
}
const neverIsDrilled = (phrases) => phrases.every(p => /\bnever\b/i.test(p.target) && /कभी/u.test(p.known)) && neverFrames(phrases).size >= 4;
/** The LEGO is the first LEGO ROW to teach "never": only components (S0309L01C02) came before it. */
const neverLegoRowsBefore = (legoRows) => legoRows.filter(l => normWords(l.target_text ?? l.target) === 'never' && (l.seed_number ?? 999) < SEED);

function allRows() {
  const rows = [{ seed: SEED, id: 'S0490', role: 'seed', known: SEED_TEXT.known, target: SEED_TEXT.target }];
  for (const l of LEGOS) {
    const legoId = `S0490L0${l.idx}`;
    rows.push({ seed: SEED, id: legoId, role: 'lego', known: l.known, target: l.target });
    for (const p of P.phraseRows(legoId, l.build, l.use)) rows.push({ seed: SEED, ...p });
  }
  return rows;
}
const newRows = () => allRows().filter(r => r.id === 'S0490L01' || r.id.includes(':S0490L01'));

function offlineCheck() {
  const problems = [];
  if (!legosCoveredBySeed(LEGOS, SEED_TEXT)) problems.push('a LEGO word is not in the seed');
  if (LEGOS[0].known !== NEVER_COMPONENT.known || LEGOS[0].target !== NEVER_COMPONENT.target) problems.push('L01 is not the same never as the 309 component');
  for (const l of LEGOS) for (const p of [...l.build, ...l.use]) if (!P.phraseContainsLego(l, p)) problems.push(`"${p.target}" does not contain LEGO ${l.idx} on both sides`);
  for (const l of LEGOS) if (l.build.length < 3 || l.use.length < 5) problems.push(`LEGO ${l.idx} basket short`);
  if (!neverIsDrilled([...NEVER_BUILD, ...NEVER_USE])) problems.push('the never basket does not drill never (fewer than 4 English frames)');
  for (const p of [...NEVER_BUILD, ...NEVER_USE]) if ((p.known.match(/कभी/gu) || []).length !== (p.target.match(/\bnever\b/gi) || []).length) problems.push(`${p.target}: कभी count ≠ never count`);
  const moved = [...P.phraseRows('S0490L02', LEGOS[1].build, LEGOS[1].use), ...P.phraseRows('S0490L03', LEGOS[2].build, LEGOS[2].use)];
  const was = [...OLD_L01_PHRASES, ...OLD_L02_PHRASES];
  moved.forEach((p, i) => { if (p.known !== was[i].known || p.target !== was[i].target || p.role !== was[i].role) problems.push(`${was[i].id} not preserved byte-for-byte as ${p.id}`); });
  if (P.neverRuleViolations(allRows()).length) problems.push('a "never" row lacks कभी');
  return problems;
}

// ── Live ────────────────────────────────────────────────────────────────────
function supa() { const { createClient } = require('@supabase/supabase-js'); return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } }); }
async function postJson(url, body, headers = {}) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }); let json = null; try { json = await r.json(); } catch { /* */ } return { ok: r.ok, status: r.status, json }; }
const IDENTITY_HEADERS = { 'x-agent-id': `${SWEEP} (${JOB})`, 'x-agent-role': 'content-sweep', 'x-service-name': SWEEP };
const legoBody = () => LEGOS.map(l => ({ idx: l.idx, type: l.type, known: l.known, target: l.target, build: l.build, use: l.use }));

async function guard(sb) {
  const problems = [];
  const { data: seed } = await sb.from('course_seeds').select('known_text, target_text').eq('course_code', COURSE).eq('seed_number', SEED).single();
  if (!seed || seed.known_text !== SEED_TEXT.known || seed.target_text !== SEED_TEXT.target) problems.push(`seed 490 is "${seed?.known_text}" → "${seed?.target_text}"`);
  const { data: legos } = await sb.from('course_legos').select('lego_id, known_text, target_text').eq('course_code', COURSE).eq('seed_number', SEED).order('lego_index');
  const live = (legos || []).map(l => `${l.lego_id}|${l.known_text}|${l.target_text}`).join('\n');
  if (live !== OLD_LEGOS.map(l => `${l.lego_id}|${l.known}|${l.target}`).join('\n')) problems.push(`seed 490 LEGOs are not the cut this tool was written against:\n${live}`);
  const { data: phrases } = await sb.from('course_practice_phrases').select('id, phrase_role, known_text, target_text').eq('course_code', COURSE).eq('seed_number', SEED);
  for (const p of [...OLD_L01_PHRASES, ...OLD_L02_PHRASES]) {
    const row = (phrases || []).find(r => r.id === p.id);
    if (!row) problems.push(`${p.id} missing`);
    else if (row.known_text !== p.known || row.target_text !== p.target || row.phrase_role !== p.role) problems.push(`${p.id} is ${row.phrase_role} "${row.known_text}" → "${row.target_text}"`);
  }
  if ((phrases || []).length !== 16) problems.push(`seed 490 has ${(phrases || []).length} phrases, expected 16`);
  // where "never" is taught: no LEGO row before 490; the 309 component exists as stated
  const { data: neverLegos } = await sb.from('course_legos').select('lego_id, seed_number, target_text').eq('course_code', COURSE).ilike('target_text', 'never');
  const before = neverLegoRowsBefore(neverLegos || []);
  if (before.length) problems.push(`"never" is already a LEGO row before 490: ${before.map(l => l.lego_id).join(', ')} — this tool's premise is wrong`);
  const { data: comp } = await sb.from('course_practice_phrases').select('known_text, target_text').eq('course_code', COURSE).eq('id', NEVER_COMPONENT.id).single();
  if (!comp || comp.known_text !== NEVER_COMPONENT.known || comp.target_text !== NEVER_COMPONENT.target) problems.push(`${NEVER_COMPONENT.id} is not कभी नहीं → never (${JSON.stringify(comp)})`);
  return problems;
}

async function dryRunThroughGates() {
  const body = { seed_number: SEED, target_text: SEED_TEXT.target, generateAudio: false, dryRun: true, legos: legoBody() };
  const [dry, base] = await Promise.all([postJson(`${BUILDER}/api/course/${COURSE}/edit-cascade`, body, IDENTITY_HEADERS), postJson(`${BUILDER}/api/v2/validate/${COURSE}`, { fromSeed: SEED })]);
  if (!dry.ok || !dry.json?.ok) throw new Error(`edit-cascade dry run refused: ${dry.status} ${JSON.stringify(dry.json).slice(0, 800)}`);
  const baseline = new Map((base.json?.failures || []).map(f => [f.seed, new Set(f.issues)]));
  const caused = [];
  for (const f of dry.json.blastRadius?.failures || []) { const fresh = f.issues.filter(i => !(baseline.get(f.seed) || new Set()).has(i)); if (fresh.length) caused.push({ seed: f.seed, issues: fresh }); }
  return { dry: dry.json, baselineRed: baseline.size, caused };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const rowsAt = process.argv.indexOf('--rows');
  if (rowsAt >= 0) { fs.writeFileSync(process.argv[rowsAt + 1], JSON.stringify(allRows(), null, 1)); console.log(`${allRows().length} rows → ${process.argv[rowsAt + 1]}`); return; }
  const sb = supa();
  console.log(`\n══════ ${COURSE}: seed 490 — "never" taught and drilled (${JOB}) ══════`);
  const offline = offlineCheck();
  if (offline.length) throw new Error(`offline rules: ${offline.join('; ')}`);
  console.log(`offline: LEGO words all in the seed; every phrase contains its LEGO on both sides; never basket uses ${neverFrames([...NEVER_BUILD, ...NEVER_USE]).size} English frames; 16 moved phrases byte-identical`);
  const problems = await guard(sb);
  for (const p of problems) console.error(`BLOCKED  ${p}`);
  if (problems.length) { console.error('\nBLOCKED — live state differs. Nothing written.'); process.exit(1); }
  console.log(`"never" before 490: no LEGO row; only the component ${NEVER_COMPONENT.id} (${NEVER_COMPONENT.known}) under ${NEVER_COMPONENT.parent}`);

  const { count } = await sb.from('course_enrollments').select('learner_id', { count: 'exact', head: true }).eq('course_id', COURSE).gte('highest_completed_seed', 489);
  const { count: legoRows } = await sb.from('lego_progress').select('*', { count: 'exact', head: true }).eq('course_id', COURSE).like('lego_id', 'S0490%');
  console.log(`learners at or beyond seed 489: ${count || 0}; progress rows on S0490*: ${legoRows || 0}`);
  if ((count || 0) > 0 || (legoRows || 0) > 0) { console.error('BLOCKED — learners are past seed 489; migrate progress first.'); process.exit(2); }

  const { checkLegoConflict, checkPhraseZUT } = require('../../services/course-builder/lib/validation.cjs');
  const { courseFamily } = require('../../services/course-builder/lib/course-family.cjs');
  const family = await courseFamily(sb, COURSE);
  for (const l of LEGOS) {
    const c = await checkLegoConflict(sb, COURSE, l.known, l.target, SEED, { family });
    if (c.conflict === 'zut') throw new Error(`S0490L0${l.idx} ZUT: ${c.error}`);
    if (c.conflict === 'duplicate' && !(c.legoId || '').startsWith('S0490L')) throw new Error(`S0490L0${l.idx} duplicates ${c.legoId}`);
  }
  const zut = await checkPhraseZUT(sb, COURSE, allRows().filter(r => r.role !== 'seed' && r.role !== 'lego'), SEED, { family });
  if (zut.length) throw new Error(`phrase ZUT: ${JSON.stringify(zut)}`);
  console.log('ZUT: LEGOs clean (never is a new LEGO row); phrases clean');

  const gates = await dryRunThroughGates();
  console.log(`live gates (edit-cascade dry run): ${gates.dry.case}; vocab +${JSON.stringify(gates.dry.vocabDelta?.added)} −${JSON.stringify(gates.dry.vocabDelta?.removed)}; seeds already red from 490: ${gates.baselineRed}`);
  console.log(`failures CAUSED by the cut: ${gates.caused.length ? JSON.stringify(gates.caused) : 'none'}`);
  if (gates.caused.length) { console.error('BLOCKED — the cut breaks something this tool does not repair.'); process.exit(1); }

  const { evidencePath } = require('../lib/evidence-path.cjs');
  const out = { sweep: SWEEP, job: JOB, at: new Date().toISOString(), ruling: RULING, apply, neverTaughtBefore: NEVER_COMPONENT, legos: LEGOS, gates };
  if (!apply) { const ev = evidencePath(`tools/course-optimization/${SWEEP}-dryrun.json`); fs.writeFileSync(ev, JSON.stringify(out, null, 1)); console.log(`\nDRY RUN — nothing written. evidence: ${ev}`); return; }

  // ─── apply ──────────────────────────────────────────────────────────────
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { snapshotSeeds } = require('../../services/course-builder/lib/redo-snapshot.cjs');
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs');
  const presentationAuthor = require('../../services/phases/presentation-author.cjs');
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };
  const course = must(await sb.from('courses').select('course_code,known_lang,target_lang,voice_config').eq('course_code', COURSE).single(), 'course');
  const tpl = must(await sb.from('presentation_templates').select('template').eq('known_lang', 'hin').eq('is_active', true).order('priority', { ascending: false }).limit(1), 'template');
  if (!tpl.length || tpl[0].template !== HINDI_TEMPLATE) throw new Error(`live Hindi template is "${tpl[0]?.template}" — refusing`);
  if (presentationAuthor.localisedLangName(course.target_lang, course.known_lang) !== TARGET_LANG_NAME) throw new Error('localisedLangName disagrees — refusing');
  const presVoice = presentationAuthor.resolvePresentationVoiceId(course);
  const pending = must(await sb.from('audio_pass_requests').select('id, reason, metadata').eq('course_code', COURSE).eq('status', 'pending').maybeSingle(), 'pending audio pass');
  if (!pending) throw new Error(`no pending audio-pass request for ${COURSE}`);
  const frameA = (chunk) => P.frameAIntro(chunk, presentationAuthor.renderIntro);
  const { data: movingIntro } = await sb.from('course_audio').select('id').eq('course_code', COURSE).eq('role', 'presentation').eq('lego_id', 'S0490L01').eq('text_normalized', normalizeForAudio(frameA(OLD_LEGOS[0].known))).like('s3_key', 'pending/%');

  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const snap = await snapshotSeeds(sb, COURSE, [SEED], { reason: 'seed-490-never-lego', notes: `${RULING}. Undo: POST /api/build/redo-undo/${COURSE}.` });
  const eventId = await recordContentEdit(sb, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-recut',
    scope: { seed_numbers: [SEED], lego_ids: OLD_LEGOS.map(l => l.lego_id), phrase_ids: [...OLD_L01_PHRASES, ...OLD_L02_PHRASES].map(p => p.id) },
    detail: { job: JOB, ruling: RULING, never_taught_before: NEVER_COMPONENT, from: OLD_LEGOS, to: LEGOS.map(l => ({ idx: l.idx, known: l.known, target: l.target })), snapshot_batch: snap.batchId } });
  console.log(`edit event ${eventId}; snapshot batch ${snap.batchId}`);

  const cascade = await postJson(`${BUILDER}/api/course/${COURSE}/edit-cascade`, { seed_number: SEED, target_text: SEED_TEXT.target, generateAudio: false, dryRun: false, legos: legoBody() }, IDENTITY_HEADERS);
  if (!cascade.ok || !cascade.json?.ok) throw new Error(`edit-cascade apply failed (route rolled back): ${cascade.status} ${JSON.stringify(cascade.json).slice(0, 800)}`);
  console.log(`edit-cascade applied: ${cascade.json.message || ''}`);
  const after = must(await sb.from('course_legos').select('lego_id, known_text, target_text, is_new').eq('course_code', COURSE).eq('seed_number', SEED).order('lego_index'), 'legos after');
  if (after.length !== 3 || !after[0].is_new || after[0].known_text !== NEVER.known) throw new Error(`seed 490 after: ${JSON.stringify(after)}`);
  for (const l of after) console.log(`  ${l.lego_id}  is_new=${l.is_new}  "${l.known_text}" → "${l.target_text}"`);
  must(await sb.from('course_legos').update({ last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', SEED), 'legos event');
  must(await sb.from('course_practice_phrases').update({ last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', SEED), 'phrases event');

  // Presentations: the moving pending row goes to L02; fresh pending Frame A rows for L01 and L03.
  const presRows = [];
  if ((movingIntro || []).length) { must(await sb.from('course_audio').update({ lego_id: 'S0490L02' }).eq('id', movingIntro[0].id), 're-point'); console.log(`  re-pointed pending row ${movingIntro[0].id} S0490L01 → S0490L02`); presRows.push({ lego_id: 'S0490L02', rows: [movingIntro[0]] }); }
  for (const { legoId, chunk } of [{ legoId: 'S0490L01', chunk: NEVER.known }, { legoId: 'S0490L03', chunk: OLD_LEGOS[1].known }]) {
    const intro = frameA(chunk);
    if (!intro.includes(`'${chunk}'`) || /जैसे|as in/.test(intro)) throw new Error(`intro "${intro}" is not the bare Frame A line — refusing`);
    const row = { course_code: COURSE, text: intro, text_normalized: normalizeForAudio(intro), language: course.known_lang, role: 'presentation', voice_id: presVoice, origin: 'tts', s3_key: `pending/${randomUUID().toUpperCase()}.mp3`, lego_id: legoId };
    must(await sb.from('course_audio').upsert([row], { onConflict: 'course_code,text_normalized,language,role,voice_id', ignoreDuplicates: true }), `${legoId} pending presentation`);
    const got = must(await sb.from('course_audio').select('id,s3_key,lego_id').eq('course_code', COURSE).eq('role', 'presentation').eq('text_normalized', row.text_normalized).eq('voice_id', presVoice), 'pending row after');
    if (!got.some(p => p.lego_id === legoId)) throw new Error(`${legoId}: presentation row keyed elsewhere (${got.map(p => p.lego_id).join(',')})`);
    presRows.push({ lego_id: legoId, text: intro, rows: got });
    console.log(`  intro (${got[0].s3_key.startsWith('pending/') ? 'pending' : 'existing'}, ${presVoice}) ${legoId}: ${intro}`);
  }

  must(await sb.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', SEED), 'unapprove');
  await refreshNow();
  console.log('seed 490 unapproved; course_round_index refreshed');
  const mine = `seed 490 re-cut with a NEW "never" LEGO first (S0490L01 कभी नहीं, 9 drill phrases; Kai's addition, job ${JOB}, 2026-09-23) — 25 phrase rows + 3 LEGOs null-audio (16 English lines byte-identical to earlier clips, relink by text), 2 more pending Frame A intros in Kriti (S0490L01, S0490L03)`;
  must(await sb.from('audio_pass_requests').update({ reason: `${pending.reason} + ${mine}`, metadata: { ...pending.metadata, job914NeverLego: { editEventId: eventId, snapshotBatch: snap.batchId, presentations: presRows.flatMap(p => p.rows.map(r => r.id)) } }, updated_at: new Date().toISOString() }).eq('id', pending.id), 'audio-pass append');
  console.log(`audio pass: appended to pending request ${pending.id}`);
  out.eventId = eventId; out.snapshot = snap; out.after = after; out.presentations = presRows; out.cascade = cascade.json;
  const ev = evidencePath(`tools/course-optimization/${SWEEP}.json`); fs.writeFileSync(ev, JSON.stringify(out, null, 1)); console.log(`evidence: ${ev}`);
}

module.exports = { COURSE, SEED, SEED_TEXT, NEVER, NEVER_COMPONENT, OLD_LEGOS, OLD_L01_PHRASES, OLD_L02_PHRASES, NEVER_BUILD, NEVER_USE, LEGOS, legosCoveredBySeed, neverFrames, neverIsDrilled, neverLegoRowsBefore, allRows, newRows, offlineCheck };
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
