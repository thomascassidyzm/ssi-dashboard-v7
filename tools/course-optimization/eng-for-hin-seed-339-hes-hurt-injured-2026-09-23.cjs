#!/usr/bin/env node
'use strict';
// eng_for_hin — seed 339: "he's hurt" is the INJURED sense, never "he has hurt (someone)" (Kai's ruling, 2026-09-23 22:00Z, job #965·H).
//
// The defect (live, 2026-09-23): S0339L02 "he's hurt" | उसने चोट पहुँचाई है. उसने चोट पहुँचाई है means "he has hurt (someone)" —
// the CAUSATIVE — and every one of the basket's 17 phrases carried it ("he's hurt me", "he's hurt you", "he's hurt himself" =
// उसने खुद को चोट पहुँचाई है). Astra flagged it on the cross-family read of #943·H (d/17587bf7). The seed itself already
// says the injured sense: नहीं, मुझे लगता है उसे … चोट लगी है।
//
// The cut after this tool:
//   seed   नहीं, मुझे लगता है उसे काफ़ी बुरी तरह चोट लगी है।   → No I think he's hurt himself quite badly.   (बहुत → काफ़ी so L01 sits in the seed; English unchanged)
//   S0339L01  M  काफ़ी बुरी तरह     → quite badly          unchanged, 11 phrases byte-identical
//   S0339L02  A  उसे चोट लगी है     → he's hurt himself    the injured sense. The Hindi has no piece for "himself" (उसे चोट लगी है
//                                                          is simply "he got hurt"), so the English side GROWS to match — a LEGO grows
//                                                          on both sides; "he's hurt" alone never appears, so it can never read causative.
//   S0339L03  "himself" | खुद को    MERGED into L02 (Kai, 22:03Z: never delete a LEGO — re-cut or merge into a neighbour). "himself" is in the
//                                                          seed English and is now taught inside L02; खुद को was never in the seed Hindi (it was the causative
//                                                          reflexive), and "himself"/खुद को appear nowhere else in the course.
// Phrases: every causative row is deleted (Kai: "just delete the possibly problematic ones"); the four "he's hurt himself …" English
// lines the old basket had are kept with their Hindi rewritten to the injured sense; five fresh lines from taught chunks only
// (I think 123, I'm afraid 183, no 96, yes 97, today 7). No bare-LEGO row. No English line duplicated anywhere in the course.
//
// GATES before any write: offline rules (below); LEGO + phrase ZUT against the family; the edit-cascade DRY RUN (tiling, vocab,
// counts, blast radius); the Shuchita deterministic checker on --rows; a cross-family (Astra) read of the new Hindi.
// The seed is NOT unapproved (no proofreader exists; the brief says so). Voice stamps (#941·H, metadata.known_gender*) are
// carried across on every byte-identical row; the new rows are third person and carry none. Learners past 338: guarded at 0.
//
// AUDIO: renders nothing. edit-cascade re-inserts the seed's LEGO and phrase rows, which drops their clip links; this tool then
// restores the links on every row whose id AND both texts are byte-identical (all of L01), and the English (target1/2) links on
// every new row whose English line the old basket already had. The Hindi side of every changed row is null and the pending
// pass (Kriti) renders it. Two pending Frame A intros in the presentation voice (S0339L01, S0339L02); the three mastered
// intros that quote the OLD causative seed line stay in course_audio untouched (nothing is deleted), the L03 one orphaned.
//
//   node tools/course-optimization/eng-for-hin-seed-339-hes-hurt-injured-2026-09-23.cjs            # dry run
//   node tools/course-optimization/eng-for-hin-seed-339-hes-hurt-injured-2026-09-23.cjs --rows f   # export rows for the checkers
//   node tools/course-optimization/eng-for-hin-seed-339-hes-hurt-injured-2026-09-23.cjs --apply

const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });

const COURSE = 'eng_for_hin';
const SEED = 339;
const JOB = '#965·H';
const SWEEP = 'eng-for-hin-seed-339-hes-hurt-injured-2026-09-23';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = `Kai, 2026-09-23 22:00Z (job ${JOB}): "he's hurt" must never read as "he has hurt someone" in the Hindi — उसने चोट पहुँचाई है is the causative; the injured sense is उसे चोट लगी है`;
const BUILDER = process.env.COURSE_BUILDER_SELF_URL || 'http://localhost:3471';
const HINDI_TEMPLATE = "{target_lang_name} में — '{known}' — जैसे — '{seed}' — में :";
const TARGET_LANG_NAME = 'अंग्रेज़ी';

const OLD_SEED = { known: 'नहीं, मुझे लगता है उसे बहुत बुरी तरह चोट लगी है।', target: "No I think he's hurt himself quite badly." };
const NEW_SEED = { known: 'नहीं, मुझे लगता है उसे काफ़ी बुरी तरह चोट लगी है।', target: OLD_SEED.target };

/** The live cut this tool was written against (after #943·H made L02 "he's hurt"). */
const OLD_LEGOS = [
  { lego_id: 'S0339L01', type: 'M', known: 'काफ़ी बुरी तरह', target: 'quite badly' },
  { lego_id: 'S0339L02', type: 'M', known: 'उसने चोट पहुँचाई है', target: "he's hurt" },
  { lego_id: 'S0339L03', type: 'A', known: 'खुद को', target: 'himself' },
];
const R = (id, role, known, target, score) => ({ id: `${COURSE}:${id}`, role, known, target, ...(score ? { score } : {}) });
const OLD_L01_PHRASES = [
  R('S0339L01C01', 'component', 'काफ़ी', 'quite'), R('S0339L01C02', 'component', 'बुरी तरह', 'badly'),
  R('S0339L01B01', 'build', 'काफ़ी बुरी तरह', 'quite badly'),
  R('S0339L01B02', 'build', 'अभी काफ़ी बुरी तरह', 'quite badly now'), R('S0339L01B03', 'build', 'आज काफ़ी बुरी तरह', 'quite badly today'), R('S0339L01B04', 'build', 'यहाँ काफ़ी बुरी तरह', 'quite badly here'),
  R('S0339L01U01', 'use', 'वह काफ़ी बुरी तरह बोलती है', 'she speaks quite badly', 6), R('S0339L01U02', 'use', 'मुझे लगता है वह काफ़ी बुरी तरह बोलती है', 'I think she speaks quite badly', 6),
  R('S0339L01U03', 'use', 'वह आज काफ़ी बुरी तरह बोलती है', 'she speaks quite badly today', 5), R('S0339L01U04', 'use', 'वह अभी काफ़ी बुरी तरह बोलती है', 'she speaks quite badly now', 5),
  R('S0339L01U05', 'use', 'मुझे नहीं लगता वह काफ़ी बुरी तरह बोलती है', "I don't think she speaks quite badly", 5),
];
const OLD_L02_PHRASES = [
  R('S0339L02C01', 'component', 'उसने', "he's"), R('S0339L02C02', 'component', 'चोट पहुँचाई है', 'hurt'),
  R('S0339L02B01', 'build', 'उसने खुद को बुरी तरह चोट पहुँचाई है', "he's hurt himself badly"), R('S0339L02B02', 'build', 'उसने मुझे बुरी तरह चोट पहुँचाई है', "he's hurt me badly"),
  R('S0339L02B03', 'build', 'उसने आपको काफ़ी बुरी तरह चोट पहुँचाई है', "he's hurt you quite badly"), R('S0339L02B04', 'build', 'उसने मुझे आज चोट पहुँचाई है', "he's hurt me today"),
  R('S0339L02U01', 'use', 'उसने मुझे चोट पहुँचाई है', "he's hurt me", 6), R('S0339L02U02', 'use', 'उसने आपको चोट पहुँचाई है', "he's hurt you", 6),
  R('S0339L02U03', 'use', 'मुझे लगता है उसने मुझे चोट पहुँचाई है', "I think he's hurt me", 6), R('S0339L02U04', 'use', 'उसने मुझे काफ़ी बुरी तरह चोट पहुँचाई है', "he's hurt me quite badly", 6),
  R('S0339L02U05', 'use', 'नहीं, उसने मुझे बुरी तरह चोट पहुँचाई है', "no he's hurt me badly", 6),
];
const OLD_L03_PHRASES = [
  R('S0339L03B01', 'build', 'खुद को चोट पहुँचाई है', 'hurt himself'), R('S0339L03B02', 'build', 'खुद को बुरी तरह चोट पहुँचाई है', 'hurt himself badly'), R('S0339L03B03', 'build', 'खुद को काफ़ी बुरी तरह', 'himself quite badly'),
  R('S0339L03U01', 'use', 'उसने खुद को चोट पहुँचाई है', "he's hurt himself", 7), R('S0339L03U02', 'use', 'नहीं, मुझे लगता है उसने खुद को काफ़ी बुरी तरह चोट पहुँचाई है', "no I think he's hurt himself quite badly", 8),
  R('S0339L03U03', 'use', 'मुझे लगता है उसने खुद को बुरी तरह चोट पहुँचाई है', "I think he's hurt himself badly", 6), R('S0339L03U04', 'use', 'उसने खुद को काफ़ी बुरी तरह चोट पहुँचाई है', "he's hurt himself quite badly", 7),
  R('S0339L03U05', 'use', 'नहीं, उसने खुद को चोट पहुँचाई है', "no he's hurt himself", 6),
];
const OLD_PHRASES = [...OLD_L01_PHRASES, ...OLD_L02_PHRASES, ...OLD_L03_PHRASES];

const HURT = { known: 'उसे चोट लगी है', target: "he's hurt himself" };
/** The injured-sense basket. Hindi splits उसे … चोट लगी है around the adverb as Hindi does; English contains the LEGO whole. */
const HURT_BUILD = [
  { known: 'उसे बुरी तरह चोट लगी है', target: "he's hurt himself badly" },
  { known: 'उसे काफ़ी बुरी तरह चोट लगी है', target: "he's hurt himself quite badly" },
  { known: 'उसे आज चोट लगी है', target: "he's hurt himself today" },
  { known: 'हाँ, उसे चोट लगी है', target: "yes he's hurt himself" },
];
const HURT_USE = [
  { known: 'मुझे लगता है उसे चोट लगी है', target: "I think he's hurt himself", score: 6 },
  { known: 'नहीं, मुझे लगता है उसे काफ़ी बुरी तरह चोट लगी है', target: "no I think he's hurt himself quite badly", score: 8 },
  { known: 'मुझे लगता है उसे बुरी तरह चोट लगी है', target: "I think he's hurt himself badly", score: 6 },
  { known: 'नहीं, उसे चोट लगी है', target: "no he's hurt himself", score: 6 },
  { known: 'मुझे डर है कि उसे चोट लगी है', target: "I'm afraid he's hurt himself", score: 6 },
];
/**
 * The one downstream row the cut breaks: "he's" as a bare chunk was taught ONLY by #943's component S0339L02C01 (उसने → "he's",
 * i.e. "he has" — the same distortion), and S0345L02U05 "I'm sure he's ready to leave" tiled as I'm sure / he's / ready / to leave.
 * With that component gone it no longer tiles; it becomes "I'm sure he's not ready to leave", which tiles from S0345L04
 * "he's not ready" + S0345L02 "to leave" under the vocabulary BEFORE and AFTER this cut, so it is written first.
 */
const SEED_345_REWORD = { id: `${COURSE}:S0345L02U05`, seed: 345, lego: { known: 'निकलने के लिए', target: 'to leave' },
  expect: { known: 'मुझे यक़ीन है कि वह निकलने के लिए तैयार है', target: "I'm sure he's ready to leave" },
  set: { known: 'मुझे यक़ीन है कि वह निकलने के लिए तैयार नहीं है', target: "I'm sure he's not ready to leave" } };
const EXPECTED_CAUSED = [{ seed: 345, issues: ['L2: vocab violations in 1 phrase(s)'] }];
const strip = (p) => ({ known: p.known, target: p.target, ...(p.score ? { score: p.score } : {}) });
const LEGOS = [
  { idx: 1, type: 'M', known: OLD_LEGOS[0].known, target: OLD_LEGOS[0].target, components: [{ known: 'काफी', target: 'quite' }, { known: 'बुरी तरह', target: 'badly' }],
    build: OLD_L01_PHRASES.filter(p => p.role === 'build' && !p.id.endsWith('B01')).map(strip), use: OLD_L01_PHRASES.filter(p => p.role === 'use').map(strip) },
  { idx: 2, type: 'A', known: HURT.known, target: HURT.target, components: [], build: HURT_BUILD.map(strip), use: HURT_USE.map(strip) },
];

// ── Rules ────────────────────────────────────────────────────────────────────
const normWords = (s) => String(s || '').toLowerCase().replace(/[.,!?;:।"“”]+/g, ' ').replace(/’/g, "'").replace(/\s+/g, ' ').trim();
function containsInOrder(hay, needle, gapsAllowed) {
  const h = normWords(hay).split(' ').filter(Boolean), n = normWords(needle).split(' ').filter(Boolean);
  if (!gapsAllowed) return ` ${h.join(' ')} `.includes(` ${n.join(' ')} `);
  let i = 0; for (const w of h) if (w === n[i]) i++;
  return i === n.length;
}
/** THE RULE: an English "hurt" in the injured sense (he's/she's/is hurt, hurt himself/herself) never sits over the causative चोट पहुँचा-. */
const CAUSATIVE = /चोट\s+पहुँचा|चोट\s+पहुंचा|चोट\s+पहुँचाना/u;
const INJURED_ENGLISH = /\b(he's|she's|he is|she is|is|are|got|get)\s+hurt\b|\bhurt\s+(himself|herself|myself|yourself)\b|^hurt$/i;
const causativeUnderInjured = (rows) => rows.filter(r => INJURED_ENGLISH.test(String(r.target || '')) && CAUSATIVE.test(String(r.known || ''))).map(r => r.id || r.target);
const legoWordsInSeed = (lego, seed) => normWords(lego.known).split(' ').every(w => normWords(seed.known).split(' ').includes(w)) && containsInOrder(seed.target, lego.target, false);

function allRows() {
  const rows = [{ seed: SEED, id: `S${String(SEED).padStart(4, '0')}`, role: 'seed', known: NEW_SEED.known, target: NEW_SEED.target }];
  for (const l of LEGOS) {
    const legoId = `S0339L0${l.idx}`;
    rows.push({ seed: SEED, id: legoId, role: 'lego', known: l.known, target: l.target });
    l.build.forEach((p, i) => rows.push({ seed: SEED, id: `${legoId}B${String(i + 1).padStart(2, '0')}`, role: 'build', known: p.known, target: p.target }));
    l.use.forEach((p, i) => rows.push({ seed: SEED, id: `${legoId}U${String(i + 1).padStart(2, '0')}`, role: 'use', known: p.known, target: p.target }));
  }
  rows.push({ seed: SEED_345_REWORD.seed, id: SEED_345_REWORD.id.split(':')[1], role: 'use', known: SEED_345_REWORD.set.known, target: SEED_345_REWORD.set.target });
  return rows;
}
const newRows = () => allRows().filter(r => r.id.startsWith('S0339L02'));

function offlineCheck() {
  const problems = [];
  const v = causativeUnderInjured(allRows());
  if (v.length) problems.push(`causative Hindi under injured English: ${v.join(', ')}`);
  if (allRows().some(r => /\bhurt\b/i.test(r.target) && !/चोट लगी/u.test(r.known))) problems.push('a "hurt" row without चोट लगी');
  for (const l of LEGOS) {
    if (!legoWordsInSeed(l, NEW_SEED)) problems.push(`S0339L0${l.idx} is not in the seed on both sides`);
    for (const p of [...l.build, ...l.use]) {
      if (!containsInOrder(p.target, l.target, false) || !containsInOrder(p.known, l.known, true)) problems.push(`"${p.target}" does not contain S0339L0${l.idx} on both sides`);
      if (normWords(p.target) === normWords(l.target)) problems.push(`"${p.target}" is a bare LEGO row`);
    }
    if (l.use.length < 5 || l.use.some(p => !(p.score >= 5 && p.score <= 9))) problems.push(`S0339L0${l.idx}: use needs 5+ scored 5-9`);
    if (l.build.length < 3) problems.push(`S0339L0${l.idx}: build needs 3+`);
  }
  const eng = allRows().filter(r => r.role === 'build' || r.role === 'use').map(r => normWords(r.target));
  const dup = eng.filter((t, i) => eng.indexOf(t) !== i);
  if (dup.length) problems.push(`duplicate English in the batch: ${[...new Set(dup)].join(' | ')}`);
  if (NEW_SEED.target !== OLD_SEED.target) problems.push('seed English must not change');
  if (!/उसे काफ़ी बुरी तरह चोट लगी है/u.test(NEW_SEED.known)) problems.push('seed Hindi must carry the injured sense with काफ़ी');
  if (LEGOS.filter(l => l.target.toLowerCase().includes('hurt')).length !== 1) problems.push('exactly one hurt LEGO');
  if (!containsInOrder(SEED_345_REWORD.set.target, SEED_345_REWORD.lego.target, false) || !containsInOrder(SEED_345_REWORD.set.known, SEED_345_REWORD.lego.known, true)) problems.push('the 345 reword does not contain "to leave" | निकलने के लिए');
  if (!/he's not ready/.test(SEED_345_REWORD.set.target) || !/तैयार नहीं है/u.test(SEED_345_REWORD.set.known)) problems.push("the 345 reword must tile from 'he's not ready' (S0345L04) on both sides");
  return problems;
}

// ── Live ────────────────────────────────────────────────────────────────────
function supa() { const { createClient } = require('@supabase/supabase-js'); return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } }); }
async function postJson(url, body, headers = {}) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }); let json = null; try { json = await r.json(); } catch { /* */ } return { ok: r.ok, status: r.status, json }; }
const IDENTITY_HEADERS = { 'x-agent-id': `${SWEEP} (${JOB})`, 'x-agent-role': 'content-sweep', 'x-service-name': SWEEP };
const legoBody = () => LEGOS.map(l => ({ idx: l.idx, type: l.type, known: l.known, target: l.target, ...(l.type === 'M' ? { components: l.components } : {}), build: l.build, use: l.use }));
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

/** Re-read the seed right before writing (#941·H is live on the course): the tool applies only to the cut it was written against. */
async function guard(sb) {
  const problems = [];
  const seed = must(await sb.from('course_seeds').select('known_text, target_text, approved_at').eq('course_code', COURSE).eq('seed_number', SEED).single(), 'seed');
  if (seed.known_text === NEW_SEED.known && seed.target_text === NEW_SEED.target) return { problems: ['already applied'], seed };
  if (seed.known_text !== OLD_SEED.known || seed.target_text !== OLD_SEED.target) problems.push(`seed 339 is "${seed.known_text}" → "${seed.target_text}"`);
  const legos = must(await sb.from('course_legos').select('lego_id, type, known_text, target_text').eq('course_code', COURSE).eq('seed_number', SEED).order('lego_index'), 'legos');
  const live = legos.map(l => `${l.lego_id}|${l.type}|${l.known_text}|${l.target_text}`).join('\n');
  if (live !== OLD_LEGOS.map(l => `${l.lego_id}|${l.type}|${l.known}|${l.target}`).join('\n')) problems.push(`seed 339 LEGOs are not the cut this tool was written against:\n${live}`);
  const phrases = must(await sb.from('course_practice_phrases').select('*').eq('course_code', COURSE).eq('seed_number', SEED), 'phrases');
  for (const p of OLD_PHRASES) {
    const row = phrases.find(r => r.id === p.id);
    if (!row) problems.push(`${p.id} missing`);
    else if (row.known_text !== p.known || row.target_text !== p.target || row.phrase_role !== p.role) problems.push(`${p.id} is ${row.phrase_role} "${row.known_text}" → "${row.target_text}"`);
  }
  if (phrases.length !== OLD_PHRASES.length) problems.push(`seed 339 has ${phrases.length} phrases, expected ${OLD_PHRASES.length}`);
  const elsewhere = must(await sb.from('course_legos').select('lego_id').eq('course_code', COURSE).neq('seed_number', SEED).or('target_text.ilike.%himself%,known_text.ilike.%खुद को%'), 'himself elsewhere');
  if (elsewhere.length) problems.push(`"himself"/खुद को is taught elsewhere too: ${elsewhere.map(l => l.lego_id).join(', ')} — L03 cannot simply go`);
  const r345 = must(await sb.from('course_practice_phrases').select('id, known_text, target_text').eq('course_code', COURSE).eq('id', SEED_345_REWORD.id).maybeSingle(), '345 row');
  const reword345Done = !!r345 && r345.known_text === SEED_345_REWORD.set.known && r345.target_text === SEED_345_REWORD.set.target;
  if (!r345) problems.push(`${SEED_345_REWORD.id} missing`);
  else if (!reword345Done && (r345.known_text !== SEED_345_REWORD.expect.known || r345.target_text !== SEED_345_REWORD.expect.target)) problems.push(`${SEED_345_REWORD.id} is "${r345.target_text}" | ${r345.known_text}`);
  const dup345 = must(await sb.from('course_practice_phrases').select('id').eq('course_code', COURSE).neq('id', SEED_345_REWORD.id).ilike('target_text', SEED_345_REWORD.set.target), 'dup 345');
  if (dup345.length) problems.push(`345 reword English already in the course: ${dup345.map(d => d.id).join(', ')}`);
  const dupEng = must(await sb.from('course_practice_phrases').select('id, target_text').eq('course_code', COURSE).neq('seed_number', SEED).in('target_text', newRows().filter(r => r.role !== 'lego').map(r => r.target)), 'dup english');
  if (dupEng.length) problems.push(`English line already in the course: ${dupEng.map(d => `${d.id} "${d.target_text}"`).join('; ')}`);
  return { problems, seed, legos, phrases, reword345Done };
}

async function dryRunThroughGates() {
  const body = { seed_number: SEED, target_text: NEW_SEED.target, generateAudio: false, dryRun: true, legos: legoBody() };
  const [dry, base] = await Promise.all([postJson(`${BUILDER}/api/course/${COURSE}/edit-cascade`, body, IDENTITY_HEADERS), postJson(`${BUILDER}/api/v2/validate/${COURSE}`, { fromSeed: SEED })]);
  if (!dry.ok || !dry.json?.ok) throw new Error(`edit-cascade dry run refused: ${dry.status} ${JSON.stringify(dry.json).slice(0, 800)}`);
  const baseline = new Map((base.json?.failures || []).map(f => [f.seed, new Set(f.issues)]));
  const caused = [];
  for (const f of dry.json.blastRadius?.failures || []) { const fresh = f.issues.filter(i => !(baseline.get(f.seed) || new Set()).has(i)); if (fresh.length) caused.push({ seed: f.seed, issues: fresh }); }
  return { dry: dry.json, baselineRed: baseline.size, caused };
}

/** After the cascade: clip links back onto byte-identical rows; English links onto new rows whose English line the old basket had. */
function audioRestorePlan(oldPhrases, newPhrases) {
  const plan = [];
  for (const n of newPhrases) {
    const same = oldPhrases.find(o => o.id === n.id && o.known_text === n.known_text && o.target_text === n.target_text);
    if (same) { plan.push({ id: n.id, kind: 'byte-identical', set: { known_audio_id: same.known_audio_id, target1_audio_id: same.target1_audio_id, target2_audio_id: same.target2_audio_id, target1_duration_ms: same.target1_duration_ms, target2_duration_ms: same.target2_duration_ms, qa_checked: same.qa_checked, metadata: { ...(n.metadata || {}), ...(same.metadata || {}) } } }); continue; }
    const eng = oldPhrases.find(o => o.target_text === n.target_text && (o.target1_audio_id || o.target2_audio_id));
    if (eng) plan.push({ id: n.id, kind: 'english-line', set: { target1_audio_id: eng.target1_audio_id, target2_audio_id: eng.target2_audio_id, target1_duration_ms: eng.target1_duration_ms, target2_duration_ms: eng.target2_duration_ms } });
  }
  return plan;
}

/**
 * After the cascade, /seed/complete rebuilt S0339L01's component rows from the LEGO's components array, whose first entry reads
 * काफी (no nukta) while the LEGO and the row that was live before both read काफ़ी. The row goes back to काफ़ी, with the clip that
 * says काफ़ी (a3d1636c, the link it carried before the cut). Idempotent; runs on apply and on any later run.
 */
const C01 = { id: `${COURSE}:S0339L01C01`, known: 'काफ़ी', rebuilt: 'काफी', known_audio_id: 'a3d1636c-c035-429b-9087-fdd0149b0d4d' };
async function tidyC01(sb) {
  const row = must(await sb.from('course_practice_phrases').select('id, known_text, known_audio_id').eq('course_code', COURSE).eq('id', C01.id).maybeSingle(), 'C01');
  if (!row || row.known_text !== C01.rebuilt) return false;
  const clip = must(await sb.from('course_audio').select('id, text').eq('id', C01.known_audio_id).maybeSingle(), 'C01 clip');
  if (!clip || clip.text !== C01.known) throw new Error(`clip ${C01.known_audio_id} is not the काफ़ी clip — refusing`);
  must(await sb.from('course_practice_phrases').update({ known_text: C01.known, known_audio_id: C01.known_audio_id }).eq('course_code', COURSE).eq('id', C01.id).eq('known_text', C01.rebuilt), 'C01 tidy');
  console.log(`  S0339L01C01 काफी → काफ़ी, clip ${C01.known_audio_id} relinked`);
  return true;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const rowsAt = process.argv.indexOf('--rows');
  if (rowsAt >= 0) { fs.writeFileSync(process.argv[rowsAt + 1], JSON.stringify(allRows(), null, 1)); console.log(`${allRows().length} rows → ${process.argv[rowsAt + 1]}`); return; }
  const sb = supa();
  console.log(`\n══════ ${COURSE}: seed 339 — "he's hurt" is the injured sense (${JOB}) ══════`);
  const offline = offlineCheck();
  if (offline.length) throw new Error(`offline rules: ${offline.join('; ')}`);
  console.log(`offline: ${causativeUnderInjured(OLD_PHRASES.concat([{ id: 'S0339L02', known: OLD_LEGOS[1].known, target: OLD_LEGOS[1].target }])).length} live rows carry the causative under injured English; 0 after; every phrase contains its LEGO on both sides; no bare row; no duplicate English`);
  const g = await guard(sb);
  if (g.problems.length === 1 && g.problems[0] === 'already applied') { console.log(`already applied. ${await tidyC01(sb) ? 'C01 tidied.' : 'Nothing to do.'}`); return; }
  for (const p of g.problems) console.error(`BLOCKED  ${p}`);
  if (g.problems.length) { console.error('\nBLOCKED — live state differs. Nothing written.'); process.exit(1); }

  const { count } = await sb.from('course_enrollments').select('learner_id', { count: 'exact', head: true }).eq('course_id', COURSE).gte('highest_completed_seed', SEED - 1);
  const { count: legoRows } = await sb.from('lego_progress').select('*', { count: 'exact', head: true }).eq('course_id', COURSE).like('lego_id', 'S0339%');
  console.log(`learners at or beyond seed 338: ${count || 0}; progress rows on S0339*: ${legoRows || 0}`);
  if ((count || 0) > 0 || (legoRows || 0) > 0) { console.error('BLOCKED — learners are past seed 338; migrate progress first.'); process.exit(2); }

  const { checkLegoConflict, checkPhraseZUT } = require('../../services/course-builder/lib/validation.cjs');
  const { courseFamily } = require('../../services/course-builder/lib/course-family.cjs');
  const family = await courseFamily(sb, COURSE);
  for (const l of LEGOS) {
    const c = await checkLegoConflict(sb, COURSE, l.known, l.target, SEED, { family });
    if (c.conflict === 'zut') throw new Error(`S0339L0${l.idx} ZUT: ${c.error}`);
    if (c.conflict === 'duplicate' && !(c.legoId || '').startsWith('S0339L')) throw new Error(`S0339L0${l.idx} duplicates ${c.legoId}`);
  }
  const zut = await checkPhraseZUT(sb, COURSE, allRows().filter(r => r.role !== 'seed' && r.role !== 'lego'), SEED, { family });
  if (zut.length) throw new Error(`phrase ZUT: ${JSON.stringify(zut)}`);
  console.log('ZUT: LEGOs clean; phrases clean');

  const gates = await dryRunThroughGates();
  console.log(`live gates (edit-cascade dry run): ${gates.dry.case}; vocab +${JSON.stringify(gates.dry.vocabDelta?.added)} −${JSON.stringify(gates.dry.vocabDelta?.removed)}; seeds already red from 339: ${gates.baselineRed}`);
  const unrepaired = g.reword345Done ? gates.caused : gates.caused.filter(c => !EXPECTED_CAUSED.some(e => e.seed === c.seed && JSON.stringify(e.issues) === JSON.stringify(c.issues)));
  console.log(`failures CAUSED by the cut: ${gates.caused.length ? JSON.stringify(gates.caused) : 'none'}${!g.reword345Done && gates.caused.length ? ' — the 345 L2 one is S0345L02U05, repaired by the reword this tool writes first' : ''}`);
  if (unrepaired.length) { console.error(`BLOCKED — the cut breaks something this tool does not repair: ${JSON.stringify(unrepaired)}`); process.exit(1); }

  const { evidencePath } = require('../lib/evidence-path.cjs');
  const out = { sweep: SWEEP, job: JOB, at: new Date().toISOString(), ruling: RULING, apply, seed: { from: OLD_SEED, to: NEW_SEED }, legos: LEGOS, deleted: OLD_PHRASES.filter(p => !allRows().some(r => `${COURSE}:${r.id}` === p.id && r.known === p.known && r.target === p.target)).map(p => p.id), gates };
  if (!apply) { const ev = evidencePath(`tools/course-optimization/${SWEEP}-dryrun.json`); fs.writeFileSync(ev, JSON.stringify(out, null, 1)); console.log(`\nDRY RUN — nothing written. evidence: ${ev}`); return; }

  // ─── apply ──────────────────────────────────────────────────────────────
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { snapshotSeeds } = require('../../services/course-builder/lib/redo-snapshot.cjs');
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs');
  const presentationAuthor = require('../../services/phases/presentation-author.cjs');
  const course = must(await sb.from('courses').select('course_code,known_lang,target_lang,voice_config').eq('course_code', COURSE).single(), 'course');
  const tpl = must(await sb.from('presentation_templates').select('template').eq('known_lang', 'hin').eq('is_active', true).order('priority', { ascending: false }).limit(1), 'template');
  if (!tpl.length || tpl[0].template !== HINDI_TEMPLATE) throw new Error(`live Hindi template is "${tpl[0]?.template}" — refusing`);
  if (presentationAuthor.localisedLangName(course.target_lang, course.known_lang) !== TARGET_LANG_NAME) throw new Error('localisedLangName disagrees — refusing');
  const presVoice = presentationAuthor.resolvePresentationVoiceId(course);
  const pending = must(await sb.from('audio_pass_requests').select('id, reason, metadata').eq('course_code', COURSE).eq('status', 'pending').maybeSingle(), 'pending audio pass');
  if (!pending) throw new Error(`no pending audio-pass request for ${COURSE}`);
  const oldLegoRows = must(await sb.from('course_legos').select('*').eq('course_code', COURSE).eq('seed_number', SEED), 'old lego rows');
  const approvedAt = g.seed.approved_at;

  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const snap = await snapshotSeeds(sb, COURSE, [SEED], { reason: 'seed-339-hes-hurt-injured', notes: `${RULING}. Undo: POST /api/build/redo-undo/${COURSE}.` });
  const eventId = await recordContentEdit(sb, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-recut',
    scope: { seed_numbers: [SEED, SEED_345_REWORD.seed], lego_ids: OLD_LEGOS.map(l => l.lego_id), phrase_ids: [...OLD_PHRASES.map(p => p.id), SEED_345_REWORD.id] },
    detail: { job: JOB, ruling: RULING, seed: { from: OLD_SEED.known, to: NEW_SEED.known }, from: OLD_LEGOS, to: LEGOS.map(l => ({ idx: l.idx, known: l.known, target: l.target })), deleted_phrases: out.deleted, snapshot_batch: snap.batchId } });
  console.log(`edit event ${eventId}; snapshot batch ${snap.batchId}`);

  // 0. the downstream row the cut would break, reworded so it tiles before AND after the cut
  if (!g.reword345Done) {
    const z345 = await checkPhraseZUT(sb, COURSE, [{ known: SEED_345_REWORD.set.known, target: SEED_345_REWORD.set.target }], SEED_345_REWORD.seed, { family });
    if (z345.length) throw new Error(`345 reword ZUT: ${JSON.stringify(z345)}`);
    must(await sb.from('course_practice_phrases').update({ known_text: SEED_345_REWORD.set.known, target_text: SEED_345_REWORD.set.target, known_audio_id: null, target1_audio_id: null, target2_audio_id: null, target1_duration_ms: null, target2_duration_ms: null, qa_checked: null, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('id', SEED_345_REWORD.id).eq('target_text', SEED_345_REWORD.expect.target), '345 reword');
    console.log(`  S0345L02U05 → "${SEED_345_REWORD.set.target}" | ${SEED_345_REWORD.set.known}`);
  }
  // 1. the seed's Hindi (edit-cascade keeps the known side; this is the one place it changes) — re-read guarded above
  must(await sb.from('course_seeds').update({ known_text: NEW_SEED.known, known_audio_id: null, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', SEED).eq('known_text', OLD_SEED.known), 'seed known');
  // 2. the cut, through the live gates
  const cascade = await postJson(`${BUILDER}/api/course/${COURSE}/edit-cascade`, { seed_number: SEED, target_text: NEW_SEED.target, generateAudio: false, dryRun: false, legos: legoBody() }, IDENTITY_HEADERS);
  if (!cascade.ok || !cascade.json?.ok) {
    must(await sb.from('course_seeds').update({ known_text: OLD_SEED.known }).eq('course_code', COURSE).eq('seed_number', SEED), 'seed known restore');
    throw new Error(`edit-cascade apply failed (route rolled back; seed Hindi restored): ${cascade.status} ${JSON.stringify(cascade.json).slice(0, 800)}`);
  }
  console.log(`edit-cascade applied: ${cascade.json.message || ''}`);
  const after = must(await sb.from('course_legos').select('*').eq('course_code', COURSE).eq('seed_number', SEED).order('lego_index'), 'legos after');
  if (after.length !== 2 || !after[1].is_new || after[1].known_text !== HURT.known || after[1].target_text !== HURT.target) throw new Error(`seed 339 after: ${JSON.stringify(after.map(l => [l.lego_id, l.known_text, l.target_text]))}`);
  for (const l of after) console.log(`  ${l.lego_id}  ${l.type} is_new=${l.is_new}  "${l.known_text}" → "${l.target_text}"`);
  must(await sb.from('course_legos').update({ last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', SEED), 'legos event');
  must(await sb.from('course_practice_phrases').update({ last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', SEED), 'phrases event');

  // 3. clip links back where the text is what the clip says
  const l01old = oldLegoRows.find(l => l.lego_id === 'S0339L01');
  if (l01old && after[0].known_text === l01old.known_text && after[0].target_text === l01old.target_text) {
    must(await sb.from('course_legos').update({ known_audio_id: l01old.known_audio_id, target1_audio_id: l01old.target1_audio_id, target2_audio_id: l01old.target2_audio_id, target1_duration_ms: l01old.target1_duration_ms, target2_duration_ms: l01old.target2_duration_ms, presentation_audio_id: l01old.presentation_audio_id, target_text_roman: l01old.target_text_roman }).eq('course_code', COURSE).eq('lego_id', 'S0339L01'), 'L01 links');
  }
  const newPhrases = must(await sb.from('course_practice_phrases').select('*').eq('course_code', COURSE).eq('seed_number', SEED), 'phrases after');
  const plan = audioRestorePlan(g.phrases, newPhrases);
  for (const p of plan) must(await sb.from('course_practice_phrases').update(p.set).eq('course_code', COURSE).eq('id', p.id), `restore ${p.id}`);
  await tidyC01(sb);
  console.log(`clip links restored: ${plan.filter(p => p.kind === 'byte-identical').length} byte-identical rows (all links + metadata), ${plan.filter(p => p.kind === 'english-line').length} English lines the old basket had (target links only)`);

  // 4. pending Frame A intros in the presentation voice for both LEGOs (the mastered ones quote the old causative seed line)
  const presRows = [];
  for (const l of after) {
    const intro = presentationAuthor.renderIntro({ frame: 'A', template: HINDI_TEMPLATE, targetLangName: TARGET_LANG_NAME, chunk: l.known_text, seed: '' });
    if (!intro.includes(`'${l.known_text}'`) || /जैसे|as in/.test(intro)) throw new Error(`intro "${intro}" is not the bare Frame A line — refusing`);
    const row = { course_code: COURSE, text: intro, text_normalized: normalizeForAudio(intro), language: course.known_lang, role: 'presentation', voice_id: presVoice, origin: 'tts', s3_key: `pending/${randomUUID().toUpperCase()}.mp3`, lego_id: l.lego_id };
    must(await sb.from('course_audio').upsert([row], { onConflict: 'course_code,text_normalized,language,role,voice_id', ignoreDuplicates: true }), `${l.lego_id} pending presentation`);
    const got = must(await sb.from('course_audio').select('id,s3_key,lego_id').eq('course_code', COURSE).eq('role', 'presentation').eq('text_normalized', row.text_normalized).eq('voice_id', presVoice), 'pending row after');
    if (!got.some(p => p.lego_id === l.lego_id)) throw new Error(`${l.lego_id}: presentation row keyed elsewhere (${got.map(p => p.lego_id).join(',')})`);
    presRows.push({ lego_id: l.lego_id, text: intro, rows: got });
    console.log(`  intro (${got[0].s3_key.startsWith('pending/') ? 'pending' : 'existing'}, ${presVoice}) ${l.lego_id}: ${intro}`);
  }

  // 5. the seed stays approved (no proofreader exists — the brief); refresh the round index
  const seedNow = must(await sb.from('course_seeds').select('approved_at').eq('course_code', COURSE).eq('seed_number', SEED).single(), 'seed after');
  if (approvedAt && seedNow.approved_at !== approvedAt) { must(await sb.from('course_seeds').update({ approved_at: approvedAt }).eq('course_code', COURSE).eq('seed_number', SEED), 're-approve'); console.log('approved_at restored (the cascade had cleared it)'); }
  await refreshNow();
  const post = await postJson(`${BUILDER}/api/v2/validate/${COURSE}`, { fromSeed: SEED });
  const postRed = (post.json?.failures || []);
  console.log(`validator after, from seed 339: ${post.json?.seeds_passed}/${post.json?.seeds_checked} pass, ${postRed.length} red`);
  if (postRed.length) throw new Error(`RED after apply: ${JSON.stringify(postRed)} — undo with POST /api/build/redo-undo/${COURSE} (snapshot ${snap.batchId})`);
  const mine = `seed 339 re-cut: "he's hurt" → injured sense (S0339L02 उसे चोट लगी है → he's hurt himself, S0339L03 himself merged into it; Kai's ruling, job ${JOB}, 2026-09-23) — seed Hindi बहुत→काफ़ी null-audio, 9 new L02 rows null-audio on the Hindi side (4 English lines relinked), 2 pending Frame A intros (S0339L01, S0339L02)`;
  must(await sb.from('audio_pass_requests').update({ reason: `${pending.reason} + ${mine}`, metadata: { ...pending.metadata, job965HesHurt: { editEventId: eventId, snapshotBatch: snap.batchId, presentations: presRows.flatMap(p => p.rows.map(r => r.id)) } }, updated_at: new Date().toISOString() }).eq('id', pending.id), 'audio-pass append');
  console.log(`audio pass: appended to pending request ${pending.id}`);
  out.eventId = eventId; out.snapshot = snap; out.after = after.map(l => ({ lego_id: l.lego_id, known: l.known_text, target: l.target_text, is_new: l.is_new })); out.audioRestore = plan; out.presentations = presRows; out.cascade = cascade.json;
  const ev = evidencePath(`tools/course-optimization/${SWEEP}.json`); fs.writeFileSync(ev, JSON.stringify(out, null, 1)); console.log(`evidence: ${ev}`);
}

module.exports = { C01, tidyC01, COURSE, SEED, OLD_SEED, NEW_SEED, SEED_345_REWORD, EXPECTED_CAUSED, OLD_LEGOS, OLD_PHRASES, OLD_L02_PHRASES, OLD_L03_PHRASES, HURT, HURT_BUILD, HURT_USE, LEGOS, CAUSATIVE, INJURED_ENGLISH, causativeUnderInjured, containsInOrder, legoWordsInSeed, allRows, newRows, offlineCheck, audioRestorePlan };
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
