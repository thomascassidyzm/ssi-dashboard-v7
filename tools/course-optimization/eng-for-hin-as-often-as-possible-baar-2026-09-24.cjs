#!/usr/bin/env node
'use strict';
// eng_for_hin — "as often as possible" is ज़्यादा से ज़्यादा बार (Kai's ruling, 2026-09-24 09:38Z, job #17·I).
//
// THE RULING. S0003L02 keeps its English "as often as possible"; its Hindi changes from ज़्यादा से ज़्यादा (which reads as
// "as much as possible" — quantity, the sense S0437L03 ज़्यादा से ज़्यादा राशि "as much money as possible" legitimately uses)
// to ज़्यादा से ज़्यादा बार: Shuchita's approved wording kept, बार added so it is unambiguously frequency. Applied to every
// row carrying the LEGO. Seed 437 is CORRECT and does not change; seeds 28 (जितनी जल्दी हो सके) and 403 (जितनी देर हो सके)
// are untouched.
//
// LIVE SCOPE (re-counted here, refused if it moved): seed S0003, LEGO S0003L02, 17 phrases in seeds 3/4/5/9/10/13/14/58/224/398
// = 19 rows with target_text ILIKE '%as often as possible%', every one carrying ज़्यादा से ज़्यादा on the Hindi side. Also:
// S0003L02.components and the 6 phrase `decomposition` arrays that still quote the LEGO's Hindi (a text-only edit would
// leave them stale), and the 14 course_gender_expansions pairs (text_side='known') that carry the phrase — the two-voices
// render (#941·H) picks Kriti or Rehan BY TEXT against that pair table (services/shared/known-voice-gender.cjs), so a
// rewritten phrase whose pair is not rewritten with it would lose its assigned voice. metadata.known_gender stamps are
// untouched; the gender form of every row (चाहती/चाहता, रही/रहा, करूँगी/करूँगा) is preserved byte-for-byte.
//
// बार goes straight after ज़्यादा से ज़्यादा in every line: the adverbial sits before the verb phrase in all 19, so no line
// needs its word order changed (cross-family read of every line requested after apply).
//
// AUDIO: renders nothing. The BEFORE UPDATE triggers null the Hindi clip links on every changed row (no same-voice clip for
// the new text exists) and log each drop in content_audio_link_drops; the English (Charlotte) links are untouched because
// the English does not change. S0003L02's mastered intro (eve, quoting the old जितनी बार हो सके) is unlinked by the trigger
// and stays in course_audio; a pending Frame A intro in the presentation voice is added keyed to the LEGO, the same shape
// as seeds 339 and 489. Everything is appended to the pending audio-pass request; nothing is rendered until approved.
//
// APPROVALS: kept as found (seed 3 was approved by Shuchita on 2026-09-10; she has finished, there is no proofreader queue
// to land in — precedent: seed 339, 2026-09-23). The approved_at values are recorded in the edit event so the room can
// reverse that call with one update.
//
// LEARNERS: this edit changes no slot (same seed, same LEGO id, same phrase ids), so learner progress stays valid; the
// count past seed 3 is printed for the record and does not block.
//
//   node tools/course-optimization/eng-for-hin-as-often-as-possible-baar-2026-09-24.cjs            # dry run + live gates
//   node tools/course-optimization/eng-for-hin-as-often-as-possible-baar-2026-09-24.cjs --rows f   # export rows for the checkers
//   node tools/course-optimization/eng-for-hin-as-often-as-possible-baar-2026-09-24.cjs --apply
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });

const COURSE = 'eng_for_hin';
const SEED = 3;
const LEGO_ID = 'S0003L02';
const JOB = '#17·I';
const SWEEP = 'eng-for-hin-as-often-as-possible-baar-2026-09-24';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = `Kai, 2026-09-24 09:38Z (job ${JOB}): "as often as possible" (S0003L02) keeps its English; its Hindi is ज़्यादा से ज़्यादा बार — Shuchita's wording plus बार so it is unambiguously frequency — on every row carrying it; seed 437 (ज़्यादा से ज़्यादा राशि) is correct and unchanged`;
const HINDI_TEMPLATE = "{target_lang_name} में — '{known}' — जैसे — '{seed}' — में :";
const TARGET_LANG_NAME = 'अंग्रेज़ी';

const ENGLISH = 'as often as possible';
const OLD = 'ज़्यादा से ज़्यादा';
const NEW = 'ज़्यादा से ज़्यादा बार';
/** The quantity sense that stays: S0437L03 "as much money as possible". */
const EXEMPT = 'ज़्यादा से ज़्यादा राशि';

/** बार after ज़्यादा से ज़्यादा wherever it is the frequency LEGO; the राशि (money) sense and already-fixed text are left alone. Idempotent. */
const withBaar = (known) => String(known).replace(/ज़्यादा से ज़्यादा(?! बार)(?! राशि)/gu, NEW);
const carriesOld = (known) => /ज़्यादा से ज़्यादा(?! बार)(?! राशि)/u.test(String(known || ''));
const hasEnglish = (target) => /\bas often as possible\b/i.test(String(target || ''));

/** Kai's rule on a row: English "as often as possible" ⇔ Hindi ज़्यादा से ज़्यादा बार; bare ज़्यादा से ज़्यादा never answers it. */
function frequencyRuleViolations(rows) {
  const out = [];
  for (const r of rows) {
    const eng = hasEnglish(r.target);
    const baar = String(r.known || '').includes(NEW);
    if (eng && !baar) out.push(r.id);
    if (!eng && baar) out.push(r.id);
    if (eng && carriesOld(r.known)) out.push(r.id);
  }
  return [...new Set(out)];
}

/** The live rows this tool was written against (2026-09-24 morning) — refuses to run on anything else. */
const OLD_SEED = { id: 'S0003', known: 'कि ज़्यादा से ज़्यादा कैसे बोलूँ।', target: 'how to speak as often as possible.' };
const OLD_LEGO = { id: LEGO_ID, known: OLD, target: ENGLISH, components: [{ known: OLD, target: ENGLISH }] };
const OLD_PHRASES = [
  { id: 'eng_for_hin:S0003L02B01', seed: 3, role: 'build', known: 'ज़्यादा से ज़्यादा कैसे बोलूँ', target: 'how to speak as often as possible' },
  { id: 'eng_for_hin:S0003L02U01', seed: 3, role: 'use', known: 'मैं ज़्यादा से ज़्यादा बात करना चाहती हूँ।', target: 'I want to speak as often as possible' },
  { id: 'eng_for_hin:S0003L02U02', seed: 3, role: 'use', known: 'मैं ज़्यादा से ज़्यादा अंग्रेज़ी बोलना चाहता हूँ।', target: 'I want to speak English as often as possible' },
  { id: 'eng_for_hin:S0003L02U03', seed: 3, role: 'use', known: 'मैं ज़्यादा से ज़्यादा सीखने की कोशिश कर रही हूँ।', target: "I'm trying to learn as often as possible" },
  { id: 'eng_for_hin:S0004L02U04', seed: 4, role: 'use', known: 'मैं ज़्यादा से ज़्यादा कुछ कहना चाहता हूँ।', target: 'I want to say something as often as possible' },
  { id: 'eng_for_hin:S0005L01U04', seed: 5, role: 'use', known: 'मैं किसी और के साथ ज़्यादा से ज़्यादा बात करना चाहती हूँ।', target: 'I want to speak with someone else as often as possible' },
  { id: 'eng_for_hin:S0005L02U04', seed: 5, role: 'use', known: 'मैं ज़्यादा से ज़्यादा बात करने का अभ्यास करना चाहता हूँ।', target: 'I want to practise speaking as often as possible' },
  { id: 'eng_for_hin:S0005L03U02', seed: 5, role: 'use', known: 'मैं ज़्यादा से ज़्यादा बात करने का अभ्यास करूँगा।', target: "I'm going to practise speaking as often as possible" },
  { id: 'eng_for_hin:S0005L03U05', seed: 5, role: 'use', known: 'मैं अंग्रेज़ी में ज़्यादा से ज़्यादा बात करने का अभ्यास करूँगी।', target: "I'm going to practise speaking in English as often as possible" },
  { id: 'eng_for_hin:S0009L02U04', seed: 9, role: 'use', known: 'मैं ज़्यादा से ज़्यादा अंग्रेज़ी बोलती हूँ।', target: 'I speak English as often as possible' },
  { id: 'eng_for_hin:S0010L03U05', seed: 10, role: 'use', known: 'मुझे यक़ीन नहीं है कि मैं ज़्यादा से ज़्यादा बात करना चाहता हूँ।', target: "I'm not sure if I want to speak as often as possible" },
  { id: 'eng_for_hin:S0013L02U02', seed: 13, role: 'use', known: 'आप ज़्यादा से ज़्यादा अंग्रेज़ी बोलते हैं।', target: 'you speak English as often as possible' },
  { id: 'eng_for_hin:S0014L02U04', seed: 14, role: 'use', known: 'क्या आप ज़्यादा से ज़्यादा अंग्रेज़ी बोलते हैं?', target: 'do you speak English as often as possible?' },
  { id: 'eng_for_hin:S0058L01U05', seed: 58, role: 'use', known: 'मुझे लगता है कि जब आप ज़्यादा से ज़्यादा बोलते हैं तो यह दिलचस्प हो जाता है।', target: 'I think that it becomes interesting when you speak as often as possible' },
  { id: 'eng_for_hin:S0224L01U04', seed: 224, role: 'use', known: 'उसने ज़्यादा से ज़्यादा बात करना शुरू किया है।', target: "he's started to speak as often as possible" },
  { id: 'eng_for_hin:S0224L02U05', seed: 224, role: 'use', known: 'उसने ज़्यादा से ज़्यादा अंग्रेज़ी सीखना शुरू किया है।', target: "he's started to learn English as often as possible" },
  { id: 'eng_for_hin:S0398L03U03', seed: 398, role: 'use', known: 'हम अपने बच्चों के साथ ज़्यादा से ज़्यादा अंग्रेज़ी बोलना चाहते हैं।', target: 'we want to speak English with our children as often as possible' },
];
const SEEDS_TOUCHED = [...new Set([SEED, ...OLD_PHRASES.map(p => p.seed)])].sort((a, b) => a - b);

const NEW_SEED = { ...OLD_SEED, known: withBaar(OLD_SEED.known) };
const NEW_LEGO = { ...OLD_LEGO, known: NEW, components: [{ known: NEW, target: ENGLISH }] };
const NEW_PHRASES = OLD_PHRASES.map(p => ({ ...p, known: withBaar(p.known) }));

/** Every row after the fix, in the shape the checkers read. */
function allRows() {
  return [
    { seed: SEED, id: NEW_SEED.id, role: 'seed', known: NEW_SEED.known, target: NEW_SEED.target },
    { seed: SEED, id: NEW_LEGO.id, role: 'lego', known: NEW_LEGO.known, target: NEW_LEGO.target },
    ...NEW_PHRASES.map(p => ({ seed: p.seed, id: p.id, role: p.role, known: p.known, target: p.target })),
  ];
}
function oldRows() {
  return [
    { seed: SEED, id: OLD_SEED.id, role: 'seed', known: OLD_SEED.known, target: OLD_SEED.target },
    { seed: SEED, id: OLD_LEGO.id, role: 'lego', known: OLD_LEGO.known, target: OLD_LEGO.target },
    ...OLD_PHRASES.map(p => ({ seed: p.seed, id: p.id, role: p.role, known: p.known, target: p.target })),
  ];
}

/** A phrase `decomposition` array with the LEGO's Hindi brought up to date; untouched entries stay byte-identical. */
function fixDecomposition(decomp) {
  if (!Array.isArray(decomp)) return { changed: false, value: decomp };
  let changed = false;
  const value = decomp.map(e => {
    if (e && e.legoId === LEGO_ID && carriesOld(e.known)) { changed = true; return { ...e, known: withBaar(e.known) }; }
    return e;
  });
  return { changed, value };
}

/** The gender pair rows to rewrite: every known-side pair carrying the frequency phrase (the राशि pairs are left alone). */
function fixPair(row) {
  const to = { original_text: withBaar(row.original_text), expanded_f: withBaar(row.expanded_f), expanded_m: withBaar(row.expanded_m) };
  const changed = to.original_text !== row.original_text || to.expanded_f !== row.expanded_f || to.expanded_m !== row.expanded_m;
  return { changed, to };
}

function frameAIntro(chunk, renderIntro) {
  return renderIntro({ frame: 'A', template: HINDI_TEMPLATE, targetLangName: TARGET_LANG_NAME, chunk, seed: '' });
}

// ── Live helpers ────────────────────────────────────────────────────────────
function supa() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}
function must(res, what) { if (res.error) throw new Error(`${what}: ${res.error.message}`); return res.data; }

async function guard(sb) {
  const problems = [];
  const seed = must(await sb.from('course_seeds').select('known_text, target_text, approved_at').eq('course_code', COURSE).eq('seed_number', SEED).single(), 'seed 3');
  if (seed.known_text !== OLD_SEED.known) problems.push(`seed 3 known is "${seed.known_text}"`);
  if (seed.target_text !== OLD_SEED.target) problems.push(`seed 3 target is "${seed.target_text}"`);
  const lego = must(await sb.from('course_legos').select('known_text, target_text, components, presentation_audio_id, known_audio_id').eq('course_code', COURSE).eq('lego_id', LEGO_ID).single(), LEGO_ID);
  if (lego.known_text !== OLD_LEGO.known || lego.target_text !== OLD_LEGO.target) problems.push(`${LEGO_ID} is "${lego.known_text}" → "${lego.target_text}"`);
  if (JSON.stringify(lego.components) !== JSON.stringify(OLD_LEGO.components)) problems.push(`${LEGO_ID} components are ${JSON.stringify(lego.components)}`);
  const phrases = must(await sb.from('course_practice_phrases').select('id, seed_number, known_text, target_text, decomposition, metadata, known_audio_id').eq('course_code', COURSE).in('id', OLD_PHRASES.map(p => p.id)), 'phrases');
  for (const p of OLD_PHRASES) {
    const row = phrases.find(r => r.id === p.id);
    if (!row) problems.push(`${p.id} missing`);
    else if (row.known_text !== p.known || row.target_text !== p.target) problems.push(`${p.id} is "${row.known_text}" → "${row.target_text}"`);
  }
  // Inventory: the English lives on exactly these 19 rows, and the frequency Hindi on no others (all three tables).
  for (const [table, idCol] of [['course_seeds', 'seed_id'], ['course_legos', 'lego_id'], ['course_practice_phrases', 'id']]) {
    const eng = must(await sb.from(table).select(`${idCol}, known_text`).eq('course_code', COURSE).ilike('target_text', `%${ENGLISH}%`), `${table} english`);
    for (const r of eng) if (!oldRows().some(o => o.id === r[idCol])) problems.push(`${table}:${r[idCol]} has the English but is not in this tool's list`);
    const hin = must(await sb.from(table).select(`${idCol}, known_text, target_text`).eq('course_code', COURSE).like('known_text', `%${OLD}%`), `${table} hindi`);
    for (const r of hin) if (carriesOld(r.known_text) && !oldRows().some(o => o.id === r[idCol])) problems.push(`${table}:${r[idCol]} carries bare ${OLD} outside the list: "${r.known_text}" → "${r.target_text}"`);
  }
  const pairs = must(await sb.from('course_gender_expansions').select('id, original_text, expanded_f, expanded_m').eq('course_code', COURSE).eq('text_side', 'known').like('original_text', `%${OLD}%`), 'pairs');
  const pairPlan = pairs.map(r => ({ id: r.id, from: r, ...fixPair(r) })).filter(p => p.changed);
  return { problems, seed, lego, phrases, pairPlan };
}

async function learnersAtOrBeyond(sb) {
  const { count } = await sb.from('course_enrollments').select('learner_id', { count: 'exact', head: true }).eq('course_id', COURSE).gte('highest_completed_seed', SEED);
  return count || 0;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const rowsOut = process.argv.indexOf('--rows') >= 0 ? process.argv[process.argv.indexOf('--rows') + 1] : null;
  if (rowsOut) { fs.writeFileSync(rowsOut, JSON.stringify({ rows: allRows() }, null, 1)); console.log(`rows → ${rowsOut}`); return; }

  // offline rules first
  const pre = frequencyRuleViolations(oldRows());
  const post = frequencyRuleViolations(allRows());
  if (pre.length !== oldRows().length) throw new Error(`pre-fix: expected every row to break the rule, got ${pre.length}/${oldRows().length}`);
  if (post.length) throw new Error(`post-fix rows break the rule: ${post.join(', ')}`);
  for (const p of NEW_PHRASES) if (!p.known.includes(NEW)) throw new Error(`${p.id} does not contain the LEGO: ${p.known}`);
  console.log(`offline: ${oldRows().length} rows break the rule before, 0 after; every phrase contains ${NEW}`);

  const sb = supa();
  const g = await guard(sb);
  if (g.problems.length) { console.error('GUARD FAILED — the live course is not what this tool was written against:\n  ' + g.problems.join('\n  ')); process.exit(2); }
  console.log(`guard: live rows match (seed 3 approved_at ${g.seed.approved_at || 'NULL'}); ${g.pairPlan.length} gender pairs to rewrite`);
  const learners = await learnersAtOrBeyond(sb);
  console.log(`learners at or beyond seed 3: ${learners} (no slot changes — progress stays valid)`);

  // live ZUT: the LEGO against the family, every changed phrase against the course
  const { checkLegoConflict, checkPhraseZUT } = require('../../services/course-builder/lib/validation.cjs');
  const { courseFamily } = require('../../services/course-builder/lib/course-family.cjs');
  const family = await courseFamily(sb, COURSE);
  const c = await checkLegoConflict(sb, COURSE, NEW_LEGO.known, NEW_LEGO.target, SEED, { family });
  if (c.conflict === 'zut') throw new Error(`LEGO ZUT: ${c.error}`);
  if (c.conflict === 'duplicate' && c.legoId !== LEGO_ID) throw new Error(`${NEW} duplicates ${c.legoId}`);
  const zut = await checkPhraseZUT(sb, COURSE, allRows().filter(r => r.role !== 'seed' && r.role !== 'lego'), SEED, { family });
  console.log(`ZUT: LEGO ${JSON.stringify(c)}; phrases ${zut.length} hit(s)${zut.length ? ' ' + JSON.stringify(zut).slice(0, 800) : ''}`);
  if (zut.length) throw new Error('phrase ZUT hits — refusing');

  const decompPlan = g.phrases.map(r => ({ id: r.id, ...fixDecomposition(r.decomposition) })).filter(d => d.changed);
  const before = oldRows(); const after = allRows();
  const table = before.map((b, i) => ({ id: b.id, role: b.role, seed: b.seed, before: b.known, after: after[i].known, target: b.target, known_gender: (g.phrases.find(p => p.id === b.id) || {}).metadata?.known_gender || null }));
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const out = { sweep: SWEEP, job: JOB, at: new Date().toISOString(), ruling: RULING, apply, learners, rows: table, decompositions: decompPlan.map(d => d.id), pairs: g.pairPlan.map(p => ({ id: p.id, from: p.from.original_text, to: p.to.original_text })), approved_at_seed3: g.seed.approved_at };
  console.log(`plan: 1 seed + 1 LEGO (+components) + ${OLD_PHRASES.length} phrases; decompositions to fix: ${decompPlan.map(d => d.id.replace('eng_for_hin:', '')).join(', ')}; pairs: ${g.pairPlan.length}`);
  for (const r of table) console.log(`  ${r.id.replace('eng_for_hin:', '').padEnd(12)} ${(r.known_gender || '-').padEnd(2)} ${r.before}  →  ${r.after}`);
  if (!apply) { const ev = evidencePath(`tools/course-optimization/${SWEEP}-dryrun.json`); fs.writeFileSync(ev, JSON.stringify(out, null, 1)); console.log(`DRY RUN — nothing written. evidence: ${ev}`); return; }

  // ─── apply ──────────────────────────────────────────────────────────────
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { snapshotSeeds } = require('../../services/course-builder/lib/redo-snapshot.cjs');
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs');
  const presentationAuthor = require('../../services/phases/presentation-author.cjs');
  const course = must(await sb.from('courses').select('course_code, known_lang, target_lang, voice_config').eq('course_code', COURSE).single(), 'course');
  const tpl = must(await sb.from('presentation_templates').select('template').eq('known_lang', 'hin').eq('is_active', true).order('priority', { ascending: false }).limit(1), 'template');
  if (!tpl.length || tpl[0].template !== HINDI_TEMPLATE) throw new Error(`live Hindi template is "${tpl[0]?.template}" — refusing`);
  if (presentationAuthor.localisedLangName(course.target_lang, course.known_lang) !== TARGET_LANG_NAME) throw new Error('localisedLangName disagrees — refusing');
  const presVoice = presentationAuthor.resolvePresentationVoiceId(course);
  const pending = must(await sb.from('audio_pass_requests').select('id, reason, metadata').eq('course_code', COURSE).eq('status', 'pending').maybeSingle(), 'pending audio pass');
  if (!pending) throw new Error(`no pending audio-pass request for ${COURSE} — queue one with queue-audio-pass.cjs`);
  const approvals = must(await sb.from('course_seeds').select('seed_number, approved_at').eq('course_code', COURSE).in('seed_number', SEEDS_TOUCHED), 'approvals');

  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const snap = await snapshotSeeds(sb, COURSE, SEEDS_TOUCHED, { reason: 'as-often-as-possible-baar', notes: `${RULING}. Undo: POST /api/build/redo-undo/${COURSE}.` });
  const eventId = await recordContentEdit(sb, {
    identity, courseCode: COURSE, surface: SURFACE, operation: 'known-text-fix',
    scope: { seeds: SEEDS_TOUCHED, lego: LEGO_ID, phrases: OLD_PHRASES.map(p => p.id) },
    detail: { job: JOB, ruling: RULING, from: OLD, to: NEW, rows: table, decompositions: decompPlan.map(d => d.id), pairs: g.pairPlan.map(p => p.id), approvals_kept: approvals, snapshot_batch: snap.batchId, learners },
  });
  console.log(`edit event ${eventId}; snapshot batch ${snap.batchId}`);

  // 1. seed
  must(await sb.from('course_seeds').update({ known_text: NEW_SEED.known, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', SEED).eq('known_text', OLD_SEED.known), 'seed');
  // 2. LEGO + components (the trigger unlinks the stale eve intro and logs it)
  must(await sb.from('course_legos').update({ known_text: NEW_LEGO.known, components: NEW_LEGO.components, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('lego_id', LEGO_ID).eq('known_text', OLD_LEGO.known), LEGO_ID);
  // 3. phrases (+ decomposition where it quotes the LEGO); the trigger nulls the Hindi clip links
  for (const p of NEW_PHRASES) {
    const d = decompPlan.find(x => x.id === p.id);
    const old = OLD_PHRASES.find(o => o.id === p.id);
    must(await sb.from('course_practice_phrases').update({ known_text: p.known, last_edit_event_id: eventId, ...(d ? { decomposition: d.value } : {}) }).eq('course_code', COURSE).eq('id', p.id).eq('known_text', old.known), p.id);
  }
  // 4. gender pairs, so the Kriti/Rehan split still finds each rewritten line
  for (const p of g.pairPlan) must(await sb.from('course_gender_expansions').update(p.to).eq('id', p.id).eq('course_code', COURSE).eq('text_side', 'known'), `pair ${p.id}`);
  // 5. pending Frame A intro keyed to the LEGO (phase8 renders a pending row as-is; the old eve intro stays, unlinked)
  const intro = frameAIntro(NEW_LEGO.known, presentationAuthor.renderIntro);
  if (!intro.includes(`'${NEW_LEGO.known}'`) || /जैसे|as in/.test(intro)) throw new Error(`intro "${intro}" is not the bare Frame A line — refusing`);
  const presRow = { course_code: COURSE, text: intro, text_normalized: normalizeForAudio(intro), language: course.known_lang, role: 'presentation', voice_id: presVoice, origin: 'tts', s3_key: `pending/${randomUUID().toUpperCase()}.mp3`, lego_id: LEGO_ID };
  must(await sb.from('course_audio').upsert([presRow], { onConflict: 'course_code,text_normalized,language,role,voice_id', ignoreDuplicates: true }), 'pending presentation');
  const got = must(await sb.from('course_audio').select('id,s3_key,lego_id').eq('course_code', COURSE).eq('role', 'presentation').eq('text_normalized', presRow.text_normalized).eq('voice_id', presVoice), 'pending row after');
  if (!got.some(p => p.lego_id === LEGO_ID)) throw new Error(`pending presentation row keyed elsewhere (${got.map(p => p.lego_id).join(',')})`);
  console.log(`intro (pending, ${presVoice}): ${intro}`);

  // 6. verify what landed
  const seedNow = must(await sb.from('course_seeds').select('known_text, known_audio_id, approved_at').eq('course_code', COURSE).eq('seed_number', SEED).single(), 'seed after');
  const legoNow = must(await sb.from('course_legos').select('known_text, components, known_audio_id, presentation_audio_id, target1_audio_id').eq('course_code', COURSE).eq('lego_id', LEGO_ID).single(), 'lego after');
  const phrNow = must(await sb.from('course_practice_phrases').select('id, known_text, known_audio_id, target1_audio_id, decomposition, metadata').eq('course_code', COURSE).in('id', OLD_PHRASES.map(p => p.id)), 'phrases after');
  const bad = [];
  if (seedNow.known_text !== NEW_SEED.known) bad.push('seed text');
  if (legoNow.known_text !== NEW || JSON.stringify(legoNow.components) !== JSON.stringify(NEW_LEGO.components) || legoNow.known_audio_id || legoNow.presentation_audio_id) bad.push(`lego ${JSON.stringify(legoNow)}`);
  for (const p of NEW_PHRASES) {
    const r = phrNow.find(x => x.id === p.id); const was = g.phrases.find(x => x.id === p.id);
    if (!r || r.known_text !== p.known) bad.push(`${p.id} text`);
    else if (r.known_audio_id) bad.push(`${p.id} still links Hindi clip ${r.known_audio_id}`);
    else if (JSON.stringify(r.decomposition || null).includes(`"known":"${OLD}"`)) bad.push(`${p.id} decomposition stale`);
    else if ((r.metadata?.known_gender || null) !== (was.metadata?.known_gender || null)) bad.push(`${p.id} gender stamp moved`);
  }
  const stalePairs = must(await sb.from('course_gender_expansions').select('id, original_text').eq('course_code', COURSE).eq('text_side', 'known').like('original_text', `%${OLD}%`), 'pairs after').filter(r => carriesOld(r.original_text));
  if (stalePairs.length) bad.push(`pairs still bare: ${stalePairs.map(p => p.id).join(',')}`);
  if (bad.length) throw new Error(`POST-APPLY CHECK FAILED (snapshot ${snap.batchId} can undo): ${bad.join('; ')}`);
  console.log(`verified: seed, LEGO (+components, intro unlinked), ${phrNow.length} phrases (Hindi clips null, English links kept, gender stamps intact), ${g.pairPlan.length} pairs`);

  // 7. round index + the audio pass (appended, never replaced)
  await refreshNow();
  const mine = `"as often as possible" = ज़्यादा से ज़्यादा बार (Kai, job ${JOB}, 2026-09-24) — seed 3 + S0003L02 + ${OLD_PHRASES.length} phrases across seeds ${SEEDS_TOUCHED.join(',')} null-audio on the Hindi side (Kriti/Rehan by the stamped form; English links kept), 1 pending Frame A intro (S0003L02)`;
  must(await sb.from('audio_pass_requests').update({ reason: `${pending.reason} + ${mine}`, metadata: { ...pending.metadata, job17AsOftenBaar: { editEventId: eventId, snapshotBatch: snap.batchId, seeds: SEEDS_TOUCHED, presentations: got.filter(p => p.lego_id === LEGO_ID).map(p => p.id) } }, updated_at: new Date().toISOString() }).eq('id', pending.id), 'audio-pass append');
  console.log(`audio pass: appended to pending request ${pending.id}`);

  out.eventId = eventId; out.snapshot = snap; out.intro = intro; out.presVoice = presVoice; out.presentationRows = got;
  const ev = evidencePath(`tools/course-optimization/${SWEEP}.json`);
  fs.writeFileSync(ev, JSON.stringify(out, null, 1));
  console.log(`evidence: ${ev}`);
}

module.exports = { COURSE, SEED, LEGO_ID, OLD, NEW, EXEMPT, ENGLISH, withBaar, carriesOld, frequencyRuleViolations, OLD_SEED, NEW_SEED, OLD_LEGO, NEW_LEGO, OLD_PHRASES, NEW_PHRASES, SEEDS_TOUCHED, allRows, oldRows, fixDecomposition, fixPair, frameAIntro };

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
