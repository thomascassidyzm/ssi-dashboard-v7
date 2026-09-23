#!/usr/bin/env node
'use strict';
// eng_for_hin — "right now" is अभी के अभी; seed 489 split into four pieces (Kai's ruling, 2026-09-23 16:56Z, job #906·H).
//
// THE RULING. Plain अभी is S0040L02 → "at the moment". Seed 489 had अभी inside a 12-word chunk whose English
// carried "right now", so one Hindi word had two English answers hidden inside a chunk (ZUT, invisible to the
// exact-text checker). Kai: emphatic अभी के अभी ("now of now") is the Hindi prompt for "right now"; plain अभी
// keeps "at the moment". Web evidence (Rekhta headword; the Singham "abhi ke abhi" threats; "आ जाओ अभी के अभी")
// says it is everyday colloquial Hindi with urgent / imperative force — it fits an ultimatum like seed 489 and
// would sit oddly in a calm stative line. INVENTORY (live, 2026-09-23): "right now" occurs in eng_for_hin ONLY in
// seed 489 — its seed, its one LEGO, its 8 phrases, and two USE phrases under S0490L01/L02 that quote the whole
// seed. There is no stative "right now" anywhere in the course, so nothing needs a different English.
//
// THE SPLIT (Kai's four pieces; new vocabulary taught before the frame; word order is never a barrier):
//   S0489L01  एक कड़क कॉफ़ी              → a strong cup of coffee   NEW (कड़क; "strong", "cup")
//   S0489L02  अभी के अभी                → right now                NEW
//   S0489L03  अगर                       → if                       = S0049L03, the gate marks it is_new=false, no baskets
//   S0489L04  आपने मेरे लिए नहीं बनाई   → you don't make me        known words gathered into one chunk (precedent S0117L02)
// The seed's Hindi gains के अभी. The 8 existing phrases keep their English byte-for-byte (Charlotte clips relink
// on the next English pass) and re-home under L04 with के अभी on the Hindi side; the two S0490 USE phrases get
// के अभी in place. L01 and L02 get fresh baskets in known vocabulary only.
//
// GATES, before any write: the course-builder edit-cascade DRY RUN (tiling, containment, vocab, ZUT, known side,
// build/use floors) — the only failure it may report is "L3: BUILD: need 3+" on the duplicate "if", because the dry
// run's override marks every LEGO is_new and the real /seed/complete path skips baskets for a duplicate; LEGO and
// phrase ZUT against the course; the Shuchita rulebook checker (deterministic + judged) over every row; a
// cross-family (Astra) read of every Hindi line. Learners: none at or beyond seed 489 (max 198), so no migration.
//
// AUDIO: renders nothing. New rows are null-audio and are appended to the pending audio-pass request; the three new
// LEGOs get PENDING Frame A intro rows in the presentation voice ("अंग्रेज़ी में — '<chunk>' — में :"), keyed to the
// LEGO. The old S0489L01 intro row (stale: it quoted 'बनाते') is left where it is — never delete a generated asset.
//
//   node tools/course-optimization/eng-for-hin-seed-489-abhi-ke-abhi-2026-09-23.cjs            # dry run
//   node tools/course-optimization/eng-for-hin-seed-489-abhi-ke-abhi-2026-09-23.cjs --apply

const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });

const COURSE = 'eng_for_hin';
const SEED = 489;
const JOB = '#906·H';
const SWEEP = 'eng-for-hin-seed-489-abhi-ke-abhi-2026-09-23';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = `Kai, 2026-09-23 16:56Z (job ${JOB}): अभी के अभी is the Hindi for "right now", plain अभी stays "at the moment"; seed 489 splits into a strong cup of coffee / right now / if / you don't make me`;
const BUILDER = process.env.COURSE_BUILDER_SELF_URL || 'http://localhost:3471';
const HINDI_TEMPLATE = "{target_lang_name} में — '{known}' — जैसे — '{seed}' — में :";
const TARGET_LANG_NAME = 'अंग्रेज़ी';

/** The one Hindi prompt for English "right now" (Kai's ruling). */
const RIGHT_NOW = { known: 'अभी के अभी', target: 'right now' };

const SEED_TEXT = {
  known_old: 'अगर आपने अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई।',
  known: 'अगर आपने अभी के अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई।',
  target: "If you don't make me a strong cup of coffee right now.",
};

/** The live cut this tool was written against — refuses to run on anything else. */
const OLD_LEGOS = [
  { lego_id: 'S0489L01', known: 'अगर आपने अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई', target: "if you don't make me a strong cup of coffee right now" },
];
/** The 8 live phrases under the old LEGO: English kept byte-identical, Hindi gains के अभी. */
const OLD_PHRASES = [
  { id: 'eng_for_hin:S0489L01B01', known: 'अगर आपने अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो मुझे देर हो जाएगी।', target: "if you don't make me a strong cup of coffee right now I'm going to be late" },
  { id: 'eng_for_hin:S0489L01B02', known: 'अगर आपने अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो मैं आपका इंतज़ार नहीं करूँगा।', target: "if you don't make me a strong cup of coffee right now I'm not going to wait for you" },
  { id: 'eng_for_hin:S0489L01B03', known: 'अगर आपने अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो इससे कोई फ़र्क़ नहीं पड़ता।', target: "if you don't make me a strong cup of coffee right now it doesn't matter" },
  { id: 'eng_for_hin:S0489L01U01', known: 'मुझे डर है कि अगर आपने अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो मुझे देर हो जाएगी।', target: "I'm afraid if you don't make me a strong cup of coffee right now I'm going to be late" },
  { id: 'eng_for_hin:S0489L01U02', known: 'मुझे चिंता है कि अगर आपने अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो मैं आपका इंतज़ार नहीं करूँगा।', target: "I'm worried that if you don't make me a strong cup of coffee right now I'm not going to wait for you" },
  { id: 'eng_for_hin:S0489L01U03', known: 'अगर आपने अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो यह चुनौती हो सकती है।', target: "if you don't make me a strong cup of coffee right now it might be a challenge" },
  { id: 'eng_for_hin:S0489L01U04', known: 'मैंने कहा था कि अगर आपने अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो मुझे देर हो जाएगी।', target: "I said that if you don't make me a strong cup of coffee right now I'm going to be late" },
  { id: 'eng_for_hin:S0489L01U05', known: 'मुझे लगता है कि अगर आपने अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो इससे कोई फ़र्क़ नहीं पड़ता।', target: "I think that if you don't make me a strong cup of coffee right now it doesn't matter" },
];

/** Hindi gains के अभी after the seed's अभी — the same edit on every quoted copy; idempotent. */
const withAbhiKeAbhi = (known) => String(known).includes(RIGHT_NOW.known) ? String(known) : String(known).replace(/(^|\s)अभी(?=\s|$)/u, '$1अभी के अभी');

/** The new cut, in the /seed/complete lego shape. */
const LEGOS = [
  { idx: 1, type: 'A', known: 'एक कड़क कॉफ़ी', target: 'a strong cup of coffee',
    build: [
      { known: 'मुझे एक कड़क कॉफ़ी की ज़रूरत है', target: 'I need a strong cup of coffee' },
      { known: 'मैं एक कड़क कॉफ़ी चाहता हूँ', target: 'I want a strong cup of coffee' },
      { known: 'क्या आप मुझे एक कड़क कॉफ़ी दे सकते हैं', target: 'can you give me a strong cup of coffee' },
      { known: 'मैं एक कड़क कॉफ़ी चाहूँगा', target: "I'd like a strong cup of coffee" },
    ],
    use: [
      { known: 'मुझे लगता है कि मुझे एक कड़क कॉफ़ी की ज़रूरत है।', target: 'I think that I need a strong cup of coffee' },
      { known: 'मुझे यक़ीन नहीं है कि मैं एक कड़क कॉफ़ी चाहता हूँ।', target: "I'm not sure if I want a strong cup of coffee" },
      { known: 'क्या आप मुझे आज सुबह एक कड़क कॉफ़ी दे सकते हैं?', target: 'can you give me a strong cup of coffee this morning' },
      { known: 'मैं एक कड़क कॉफ़ी चाहूँगा क्योंकि मैं व्यस्त हूँ।', target: "I'd like a strong cup of coffee because I'm busy" },
      { known: 'मुझे एक कड़क कॉफ़ी की ज़रूरत है क्योंकि मुझे देर हो जाएगी।', target: "I need a strong cup of coffee because I'm going to be late" },
    ] },
  { idx: 2, type: 'A', known: RIGHT_NOW.known, target: RIGHT_NOW.target,
    // urgent / imperative contexts only — the nuance the evidence supports
    build: [
      { known: 'मुझे अभी के अभी जाना है', target: 'I need to leave right now' },
      { known: 'क्या आप मुझे अभी के अभी बता सकते हैं', target: 'can you tell me right now' },
      { known: 'मुझे अभी के अभी एक कड़क कॉफ़ी की ज़रूरत है', target: 'I need a strong cup of coffee right now' },
      { known: 'मैं अभी के अभी एक कड़क कॉफ़ी चाहता हूँ', target: 'I want a strong cup of coffee right now' },
    ],
    use: [
      { known: 'मुझे अभी के अभी यह पता लगाना है।', target: 'I have to find out right now' },
      { known: 'मैं चाहता हूँ कि आप मुझे अभी के अभी बताएँ।', target: 'I want you to tell me right now' },
      { known: 'हमें अभी के अभी बदलना होगा।', target: 'we need to change right now' },
      { known: 'मुझे लगता है कि मुझे अभी के अभी जाना है।', target: 'I think that I need to leave right now' },
      { known: 'क्या आप मुझे अभी के अभी एक कड़क कॉफ़ी दे सकते हैं?', target: 'can you give me a strong cup of coffee right now' },
    ] },
  { idx: 3, type: 'A', known: 'अगर', target: 'if', build: [], use: [] }, // = S0049L03; the gate marks it a duplicate
  { idx: 4, type: 'A', known: 'आपने मेरे लिए नहीं बनाई', target: "you don't make me",
    build: OLD_PHRASES.slice(0, 3).map(p => ({ known: withAbhiKeAbhi(p.known), target: p.target })),
    use: OLD_PHRASES.slice(3).map(p => ({ known: withAbhiKeAbhi(p.known), target: p.target })) },
];

/** The two seed-490 USE phrases that quote the whole seed: same edit, in place. */
const S0490_FIXES = [
  { id: 'eng_for_hin:S0490L01U01', seed: 490, from: 'अगर आपने अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो मैं किसी पर भरोसा नहीं करूँगा।', target: "if you don't make me a strong cup of coffee right now then I will never trust anyone" },
  { id: 'eng_for_hin:S0490L02U01', seed: 490, from: 'अगर आपने अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो मैं फिर कभी किसी पर भरोसा नहीं करूँगा।', target: "if you don't make me a strong cup of coffee right now then I will never trust anyone ever again" },
].map(f => ({ ...f, to: withAbhiKeAbhi(f.from) }));

const SEEDS_TOUCHED = [SEED, 490];
const NEW_LEGO_IDXS = [1, 2, 4];

// ── The rule, as code ────────────────────────────────────────────────────────
const normWords = (s) => String(s || '').toLowerCase().replace(/[.,!?;:।"]+/g, ' ').replace(/’/g, "'").replace(/\s+/g, ' ').trim();
const hasRightNow = (target) => /\bright now\b/i.test(String(target || ''));
const hasAbhiKeAbhi = (known) => String(known || '').includes(RIGHT_NOW.known);

/** Kai's ruling on a row: English "right now" ⇔ Hindi अभी के अभी. Plain अभी never answers "right now". */
function rightNowRuleViolations(rows) {
  const out = [];
  for (const r of rows) {
    const t = hasRightNow(r.target), k = hasAbhiKeAbhi(r.known);
    if (t && !k) out.push({ id: r.id, why: '"right now" without अभी के अभी' });
    if (k && !t) out.push({ id: r.id, why: 'अभी के अभी without "right now"' });
  }
  return out;
}

/** Every phrase under a LEGO carries the LEGO's English (the live containment gate is English-side). */
const phraseContainsLego = (lego, phrase) => ` ${normWords(phrase.target)} `.includes(` ${normWords(lego.target)} `);

/** The LEGOs' English words ARE the seed's English words. Teaching order (new vocabulary first) is not sentence
 *  order, and word order is never a barrier (Kai, 2026-09-23) — so this is a multiset, as the live tiling gate is. */
const wordBag = (s) => normWords(s).split(' ').filter(Boolean).sort().join(' ');
const legosTileSeedTarget = (legos, seed) => wordBag(legos.map(l => l.target).join(' ')) === wordBag(seed.target);

/** Frame A — the bare introduction: "अंग्रेज़ी में — '<chunk>' — में :", never an 'as in' clause. */
function frameAIntro(chunk, renderIntro) {
  return renderIntro({ frame: 'A', template: HINDI_TEMPLATE, targetLangName: TARGET_LANG_NAME, chunk, seed: '' });
}

function allRows() {
  const rows = [{ id: 'S0489', known: SEED_TEXT.known, target: SEED_TEXT.target }];
  for (const l of LEGOS) {
    rows.push({ id: `S0489L0${l.idx}`, known: l.known, target: l.target });
    l.build.forEach((p, i) => rows.push({ id: `S0489L0${l.idx}B0${i + 1}`, ...p }));
    l.use.forEach((p, i) => rows.push({ id: `S0489L0${l.idx}U0${i + 1}`, ...p }));
  }
  for (const f of S0490_FIXES) rows.push({ id: f.id, known: f.to, target: f.target });
  return rows;
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
const IDENTITY_HEADERS = { 'x-agent-id': `${SWEEP} (${JOB})`, 'x-agent-role': 'content-sweep', 'x-service-name': SWEEP };
const legoBody = () => LEGOS.map(l => ({ idx: l.idx, type: l.type, known: l.known, target: l.target, build: l.build, use: l.use }));

async function guard(sb) {
  const problems = [];
  const { data: seed } = await sb.from('course_seeds').select('known_text, target_text, approved_at').eq('course_code', COURSE).eq('seed_number', SEED).single();
  if (!seed) problems.push('seed 489 missing');
  else {
    if (seed.known_text !== SEED_TEXT.known_old) problems.push(`seed known is "${seed.known_text}"`);
    if (seed.target_text !== SEED_TEXT.target) problems.push(`seed target is "${seed.target_text}"`);
  }
  const { data: legos } = await sb.from('course_legos').select('lego_id, known_text, target_text').eq('course_code', COURSE).eq('seed_number', SEED).order('lego_index');
  const live = (legos || []).map(l => `${l.lego_id}|${l.known_text}|${l.target_text}`).join('\n');
  const want = OLD_LEGOS.map(l => `${l.lego_id}|${l.known}|${l.target}`).join('\n');
  if (live !== want) problems.push(`seed 489 LEGOs are not the cut this tool was written against:\n${live}`);
  const { data: phrases } = await sb.from('course_practice_phrases').select('id, known_text, target_text').eq('course_code', COURSE).eq('seed_number', SEED);
  for (const p of OLD_PHRASES) {
    const row = (phrases || []).find(r => r.id === p.id);
    if (!row) problems.push(`${p.id} missing`);
    else if (row.known_text !== p.known || row.target_text !== p.target) problems.push(`${p.id} is "${row.known_text}" → "${row.target_text}"`);
  }
  if ((phrases || []).length !== OLD_PHRASES.length) problems.push(`seed 489 has ${(phrases || []).length} phrases, expected ${OLD_PHRASES.length}`);
  for (const f of S0490_FIXES) {
    const { data: row } = await sb.from('course_practice_phrases').select('known_text, target_text').eq('course_code', COURSE).eq('id', f.id).single();
    if (!row) problems.push(`${f.id} missing`);
    else if (row.known_text !== f.from || row.target_text !== f.target) problems.push(`${f.id} is "${row.known_text}" → "${row.target_text}"`);
  }
  // "right now" must live in seed 489 and the two S0490 rows only — the inventory this tool rests on
  const others = [];
  for (const [table, idCol] of [['course_legos', 'lego_id'], ['course_seeds', 'seed_id'], ['course_practice_phrases', 'id']]) {
    const { data } = await sb.from(table).select(`${idCol}, seed_number`).eq('course_code', COURSE).ilike('target_text', '%right now%');
    for (const r of data || []) if (r.seed_number !== SEED && !S0490_FIXES.some(f => f.id === r[idCol])) others.push(`${table}:${r[idCol]}`);
  }
  if (others.length) problems.push(`"right now" also appears outside seed 489: ${others.join(', ')}`);
  return { problems, seed };
}

async function learnersAtOrBeyond(sb) {
  const { count } = await sb.from('course_enrollments').select('learner_id', { count: 'exact', head: true }).eq('course_id', COURSE).gte('highest_completed_seed', SEED);
  const { count: legoRows } = await sb.from('lego_progress').select('*', { count: 'exact', head: true }).eq('course_id', COURSE).like('lego_id', 'S0489%');
  return { atOrBeyond: count || 0, progressRowsOnSeed: legoRows || 0 };
}

/** The real gates, no write: edit-cascade dry run vs a baseline sweep from seed 489. */
async function dryRunThroughGates() {
  const body = { seed_number: SEED, target_text: SEED_TEXT.target, generateAudio: false, dryRun: true, legos: legoBody() };
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
/** The dry run marks every LEGO is_new, so the duplicate "if" is floor-checked there and nowhere else. */
const isDuplicateIfArtefact = (c) => c.seed === SEED && c.issues.length === 1 && /^L3: BUILD: need 3\+/.test(c.issues[0]);

async function main() {
  const apply = process.argv.includes('--apply');
  const sb = supa();
  console.log(`\n══════ ${COURSE}: seed 489 — अभी के अभी = right now (${JOB}) ══════`);
  const { problems, seed } = await guard(sb);
  for (const p of problems) console.error(`BLOCKED  ${p}`);
  if (problems.length) { console.error('\nBLOCKED — live state differs. Nothing written.'); process.exit(1); }

  // The rule, offline, before anything live.
  const v = rightNowRuleViolations(allRows());
  if (v.length) throw new Error(`right-now rule: ${v.map(x => `${x.id} ${x.why}`).join('; ')}`);
  for (const l of LEGOS) for (const p of [...l.build, ...l.use]) if (!phraseContainsLego(l, p)) throw new Error(`"${p.target}" does not contain LEGO ${l.idx}`);
  if (!legosTileSeedTarget(LEGOS, SEED_TEXT)) throw new Error('LEGOs do not tile the seed');
  for (const l of LEGOS.filter(l => NEW_LEGO_IDXS.includes(l.idx))) if (l.build.length < 3 || l.use.length < 5) throw new Error(`LEGO ${l.idx} basket short`);
  for (const p of OLD_PHRASES) { const n = LEGOS[3]; if (![...n.build, ...n.use].some(q => q.target === p.target)) throw new Error(`${p.id} English not preserved`); }
  console.log('offline: every "right now" row carries अभी के अभी and vice versa; every phrase contains its LEGO; LEGOs tile the seed; 8 English lines preserved byte-for-byte');

  const learners = await learnersAtOrBeyond(sb);
  console.log(`learners at or beyond seed 489: ${learners.atOrBeyond}; progress rows on S0489*: ${learners.progressRowsOnSeed}`);
  if (learners.atOrBeyond > 0 || learners.progressRowsOnSeed > 0) { console.error('BLOCKED — learners are past seed 489; migrate progress first (pod-migration protocol).'); process.exit(2); }

  const { checkLegoConflict, checkPhraseZUT } = require('../../services/course-builder/lib/validation.cjs');
  const { courseFamily } = require('../../services/course-builder/lib/course-family.cjs');
  const family = await courseFamily(sb, COURSE);
  for (const l of LEGOS) {
    const c = await checkLegoConflict(sb, COURSE, l.known, l.target, SEED, { family });
    if (c.conflict === 'zut') throw new Error(`LEGO ${l.idx} ZUT: ${c.error}`);
    if (c.conflict === 'duplicate' && l.idx !== 3) throw new Error(`LEGO ${l.idx} duplicates ${c.legoId}`);
    if (l.idx === 3 && c.legoId !== 'S0049L03') throw new Error(`"if" is not the S0049L03 duplicate (${JSON.stringify(c)})`);
  }
  const zut = await checkPhraseZUT(sb, COURSE, allRows().filter(r => !/^S0489(L0\d)?$/.test(r.id)), SEED, { family });
  if (zut.length) throw new Error(`phrase ZUT: ${JSON.stringify(zut)}`);
  console.log('ZUT: LEGOs clean (L03 "if" = S0049L03 duplicate, as planned); phrases clean');

  const gates = await dryRunThroughGates();
  console.log(`live gates (edit-cascade dry run): ${gates.dry.case}; vocab +${JSON.stringify(gates.dry.vocabDelta.added)} −${JSON.stringify(gates.dry.vocabDelta.removed)}; seeds already red from 489: ${gates.baselineRed}`);
  const real = gates.caused.filter(c => !isDuplicateIfArtefact(c));
  console.log(`failures CAUSED by the cut: ${real.length ? JSON.stringify(real) : 'none'}${gates.caused.length !== real.length ? ' (plus the duplicate-"if" dry-run artefact)' : ''}`);
  if (real.length) { console.error('BLOCKED — the cut breaks something this tool does not repair.'); process.exit(1); }

  const { evidencePath } = require('../lib/evidence-path.cjs');
  const out = { sweep: SWEEP, job: JOB, at: new Date().toISOString(), ruling: RULING, apply, learners, seed: SEED_TEXT, legos: LEGOS, s0490: S0490_FIXES, gates };
  if (!apply) {
    const ev = evidencePath(`tools/course-optimization/${SWEEP}-dryrun.json`);
    fs.writeFileSync(ev, JSON.stringify(out, null, 1));
    console.log(`\nDRY RUN — nothing written. evidence: ${ev}`);
    return;
  }

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
  if (!pending) throw new Error(`no pending audio-pass request for ${COURSE} — queue one with queue-audio-pass.cjs`);

  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const snap = await snapshotSeeds(sb, COURSE, SEEDS_TOUCHED, { reason: 'seed-489-abhi-ke-abhi', notes: `${RULING}. Undo: POST /api/build/redo-undo/${COURSE}.` });
  const eventId = await recordContentEdit(sb, {
    identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-recut',
    scope: { seed_numbers: SEEDS_TOUCHED, lego_ids: OLD_LEGOS.map(l => l.lego_id), phrase_ids: [...OLD_PHRASES.map(p => p.id), ...S0490_FIXES.map(f => f.id)] },
    detail: { job: JOB, ruling: RULING, seed_known: { from: SEED_TEXT.known_old, to: SEED_TEXT.known }, from: OLD_LEGOS, to: LEGOS.map(l => ({ idx: l.idx, known: l.known, target: l.target })), s0490: S0490_FIXES, snapshot_batch: snap.batchId, learners },
  });
  console.log(`edit event ${eventId}; snapshot batch ${snap.batchId}`);

  // 1. The seed's Hindi gains के अभी — edit-cascade keeps the known side as it finds it, so this goes first.
  must(await sb.from('course_seeds').update({ known_text: SEED_TEXT.known, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', SEED), 'seed known');
  console.log(`seed 489 Hindi: "${SEED_TEXT.known}"`);

  // 2. The cut, through the live gates (rolled back by the route on failure).
  const cascade = await postJson(`${BUILDER}/api/course/${COURSE}/edit-cascade`, { seed_number: SEED, target_text: SEED_TEXT.target, generateAudio: false, dryRun: false, legos: legoBody() }, IDENTITY_HEADERS);
  if (!cascade.ok || !cascade.json?.ok) {
    must(await sb.from('course_seeds').update({ known_text: SEED_TEXT.known_old }).eq('course_code', COURSE).eq('seed_number', SEED), 'seed known restore');
    throw new Error(`edit-cascade apply failed (route rolled back; seed Hindi restored): ${cascade.status} ${JSON.stringify(cascade.json).slice(0, 800)}`);
  }
  console.log(`edit-cascade applied: ${cascade.json.message || ''}`);
  const after = must(await sb.from('course_legos').select('lego_id, known_text, target_text, is_new, version').eq('course_code', COURSE).eq('seed_number', SEED).order('lego_index'), 'legos after');
  if (after.length !== LEGOS.length) throw new Error(`seed 489 now has ${after.length} LEGOs, expected ${LEGOS.length}`);
  for (const l of after) console.log(`  ${l.lego_id}  is_new=${l.is_new}  "${l.known_text}" → "${l.target_text}"`);
  if (after[2].is_new) throw new Error('S0489L03 "if" came back is_new=true — expected the S0049L03 duplicate');
  must(await sb.from('course_legos').update({ last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', SEED), 'legos event');
  must(await sb.from('course_practice_phrases').update({ last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', SEED), 'phrases event');

  // 3. The two S0490 rows, in place (clips dropped by the trigger; re-checked by the proofreader).
  for (const f of S0490_FIXES) {
    must(await sb.from('course_practice_phrases').update({ known_text: f.to, qa_checked: null, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('id', f.id), f.id);
    console.log(`${f.id} → "${f.to}"`);
  }

  // 4. Pending Frame A intros for the three new LEGOs, keyed to the LEGO (phase8 renders a pending row as-is).
  const presRows = [];
  for (const l of LEGOS.filter(l => NEW_LEGO_IDXS.includes(l.idx))) {
    const legoId = `S0489L0${l.idx}`;
    const intro = frameAIntro(l.known, presentationAuthor.renderIntro);
    if (!intro.includes(`'${l.known}'`) || /जैसे|as in/.test(intro)) throw new Error(`intro "${intro}" is not the bare Frame A line — refusing`);
    const row = { course_code: COURSE, text: intro, text_normalized: normalizeForAudio(intro), language: course.known_lang, role: 'presentation', voice_id: presVoice, origin: 'tts', s3_key: `pending/${randomUUID().toUpperCase()}.mp3`, lego_id: legoId };
    must(await sb.from('course_audio').upsert([row], { onConflict: 'course_code,text_normalized,language,role,voice_id', ignoreDuplicates: true }), `${legoId} pending presentation`);
    const got = must(await sb.from('course_audio').select('id,s3_key,lego_id').eq('course_code', COURSE).eq('role', 'presentation').eq('text_normalized', row.text_normalized).eq('voice_id', presVoice), 'pending row after');
    if (!got.some(p => p.lego_id === legoId)) throw new Error(`${legoId}: pending presentation row keyed elsewhere (${got.map(p => p.lego_id).join(',')})`);
    presRows.push({ lego_id: legoId, text: intro, rows: got });
    console.log(`  intro (pending, ${presVoice}) ${legoId}: ${intro}`);
  }

  // 5. An edit unapproves; the round index; the audio pass (appended, never replaced).
  must(await sb.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId }).eq('course_code', COURSE).in('seed_number', SEEDS_TOUCHED), 'unapprove');
  console.log(`seeds ${SEEDS_TOUCHED.join(', ')} unapproved (489 was ${seed.approved_at || 'NULL'})`);
  await refreshNow();
  console.log('course_round_index refreshed');
  const rowsAfter = must(await sb.from('course_practice_phrases').select('id, known_audio_id, target1_audio_id, target2_audio_id').eq('course_code', COURSE).eq('seed_number', SEED), 'rows after');
  const mine = `seed 489 split into 4 LEGOs, "right now" = अभी के अभी (Kai, job ${JOB}, 2026-09-23) — ${rowsAfter.length} phrase rows + 3 LEGOs null-audio (Kriti known, Charlotte target; 8 English lines are byte-identical to their old clips and relink), 2 S0490 Hindi prompts re-render, 3 pending Frame A intros in Kriti`;
  must(await sb.from('audio_pass_requests').update({
    reason: `${pending.reason} + ${mine}`,
    metadata: { ...pending.metadata, job906AbhiKeAbhi: { editEventId: eventId, snapshotBatch: snap.batchId, seeds: SEEDS_TOUCHED, presentations: presRows.flatMap(p => p.rows.map(r => r.id)) } },
    updated_at: new Date().toISOString(),
  }).eq('id', pending.id), 'audio-pass append');
  console.log(`audio pass: appended to pending request ${pending.id}`);

  out.eventId = eventId; out.snapshot = snap; out.after = after; out.presentations = presRows; out.cascade = cascade.json;
  const ev = evidencePath(`tools/course-optimization/${SWEEP}.json`);
  fs.writeFileSync(ev, JSON.stringify(out, null, 1));
  console.log(`evidence: ${ev}`);
}

module.exports = { COURSE, SEED, RIGHT_NOW, SEED_TEXT, OLD_LEGOS, OLD_PHRASES, LEGOS, S0490_FIXES, withAbhiKeAbhi, rightNowRuleViolations, phraseContainsLego, legosTileSeedTarget, frameAIntro, allRows, isDuplicateIfArtefact };

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
