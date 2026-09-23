#!/usr/bin/env node
'use strict';
// eng_for_hin — two content fixes Kai approved on 2026-09-23 (job #914·H), closing the two items job #906·H held.
//
// 1. SEED 489: fold अगर into the frame chunk. After #906 the seed was cut as four pieces and the frame LEGO
//    S0489L04 read आपने मेरे लिए नहीं बनाई → "you don't make me". Heard alone, that Hindi is PAST TENSE ("you
//    didn't make [it] for me"); it means "don't" only because अगर + perfective gives a hypothetical future. So
//    the frame becomes अगर आपने मेरे लिए नहीं बनाई → "if you don't make me" and the separate, not-new अगर piece
//    (= S0049L03) is absorbed. Three LEGOs, gap-free on BOTH sides:
//      S0489L01  एक कड़क कॉफ़ी               → a strong cup of coffee    unchanged, basket unchanged
//      S0489L02  अभी के अभी                 → right now                 unchanged, basket unchanged
//      S0489L03  अगर आपने मेरे लिए नहीं बनाई → if you don't make me      NEW; the 8 phrases from old L04, byte-identical
//    The presentation is the bare Frame A line for the new chunk. The pending (never rendered) Frame A row that
//    #906 keyed to S0489L04 is re-pointed to S0489L03 with the new chunk, so no orphan pending row is left for
//    phase8 to render for a LEGO that no longer exists.
//
// 2. SEED 490: S0490L01 तो मैं किसी पर भरोसा नहीं करूँगा → "then I will never trust anyone" has no कभी, so the
//    Hindi does not cue "never" (every other "never" row in the course carries कभी … नहीं). The LEGO becomes
//    तो मैं कभी किसी पर भरोसा नहीं करूँगा, and the same insertion goes into each of its 8 phrases. The SEED is
//    unchanged: तो मैं फिर कभी किसी पर भरोसा नहीं करूँगा। already carries the कभी — natural Hindi "फिर कभी … नहीं"
//    shares one कभी between "never" (L01) and "ever again" (L02 फिर कभी), so L01 and L02 tile the seed with one
//    shared word on the Hindi side; the English side tiles exactly. S0490L02 and its basket are untouched.
//
// GATES before any write: the offline rules below (tiling both sides, containment both sides, English preserved,
// Frame A shape); LEGO + phrase ZUT against the course family; the course-builder edit-cascade DRY RUN for 489;
// the Shuchita rulebook checker (--input, deterministic + judged) and a cross-family (Astra) read are run by hand
// on the rows this tool exports (--rows). Learners: none at or beyond seed 489, so no progress migration.
//
// AUDIO: renders nothing. Text changes drop clip links by trigger; new/changed rows are appended to the pending
// audio-pass request. Presentation links on S0490L01 (a stale 2026-06 "eve" clip quoting 'भरोसा') are not touched
// — never delete an asset — and a pending Frame A row in the presentation voice is added for the new chunk.
//
//   node tools/course-optimization/eng-for-hin-seed-489-if-fold-490-kabhi-2026-09-23.cjs            # dry run
//   node tools/course-optimization/eng-for-hin-seed-489-if-fold-490-kabhi-2026-09-23.cjs --rows f   # export rows for the checkers
//   node tools/course-optimization/eng-for-hin-seed-489-if-fold-490-kabhi-2026-09-23.cjs --apply

const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });

const COURSE = 'eng_for_hin';
const JOB = '#914·H';
const SWEEP = 'eng-for-hin-seed-489-if-fold-490-kabhi-2026-09-23';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = `Kai, 2026-09-23 (job ${JOB}): seed 489 frame LEGO is अगर आपने मेरे लिए नहीं बनाई → "if you don't make me" (अगर folded in, the separate not-new "if" absorbed); seed 490 L01 gains कभी → तो मैं कभी किसी पर भरोसा नहीं करूँगा, and so does every phrase that quotes it`;
const BUILDER = process.env.COURSE_BUILDER_SELF_URL || 'http://localhost:3471';
const HINDI_TEMPLATE = "{target_lang_name} में — '{known}' — जैसे — '{seed}' — में :";
const TARGET_LANG_NAME = 'अंग्रेज़ी';

// ── Seed 489 ─────────────────────────────────────────────────────────────────
const SEED_489 = { known: 'अगर आपने अभी के अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई।', target: "If you don't make me a strong cup of coffee right now." };
/** The live cut (after #906) this tool was written against — refuses to run on anything else. */
const OLD_489_LEGOS = [
  { lego_id: 'S0489L01', is_new: true, known: 'एक कड़क कॉफ़ी', target: 'a strong cup of coffee' },
  { lego_id: 'S0489L02', is_new: true, known: 'अभी के अभी', target: 'right now' },
  { lego_id: 'S0489L03', is_new: false, known: 'अगर', target: 'if' },
  { lego_id: 'S0489L04', is_new: true, known: 'आपने मेरे लिए नहीं बनाई', target: "you don't make me" },
];
const L01_BUILD = [
  { known: 'मुझे एक कड़क कॉफ़ी की ज़रूरत है', target: 'I need a strong cup of coffee' },
  { known: 'मैं एक कड़क कॉफ़ी चाहता हूँ', target: 'I want a strong cup of coffee' },
  { known: 'क्या आप मुझे एक कड़क कॉफ़ी दे सकते हैं', target: 'can you give me a strong cup of coffee' },
  { known: 'मैं एक कड़क कॉफ़ी चाहूँगा', target: "I'd like a strong cup of coffee" },
];
const L01_USE = [
  { known: 'मुझे लगता है कि मुझे एक कड़क कॉफ़ी की ज़रूरत है।', target: 'I think that I need a strong cup of coffee' },
  { known: 'मुझे यक़ीन नहीं है कि मैं एक कड़क कॉफ़ी चाहता हूँ।', target: "I'm not sure if I want a strong cup of coffee" },
  { known: 'क्या आप मुझे आज सुबह एक कड़क कॉफ़ी दे सकते हैं?', target: 'can you give me a strong cup of coffee this morning' },
  { known: 'मैं एक कड़क कॉफ़ी चाहूँगा क्योंकि मैं व्यस्त हूँ।', target: "I'd like a strong cup of coffee because I'm busy" },
  { known: 'मुझे एक कड़क कॉफ़ी की ज़रूरत है क्योंकि मुझे देर हो जाएगी।', target: "I need a strong cup of coffee because I'm going to be late" },
];
const L02_BUILD = [
  { known: 'मुझे अभी के अभी जाना है', target: 'I need to leave right now' },
  { known: 'क्या आप मुझे अभी के अभी बता सकते हैं', target: 'can you tell me right now' },
  { known: 'मुझे अभी के अभी एक कड़क कॉफ़ी की ज़रूरत है', target: 'I need a strong cup of coffee right now' },
  { known: 'मैं अभी के अभी एक कड़क कॉफ़ी चाहता हूँ', target: 'I want a strong cup of coffee right now' },
];
const L02_USE = [
  { known: 'मुझे अभी के अभी यह पता लगाना है।', target: 'I have to find out right now' },
  { known: 'मैं चाहता हूँ कि आप मुझे अभी के अभी बताएँ।', target: 'I want you to tell me right now' },
  { known: 'हमें अभी के अभी बदलना होगा।', target: 'we need to change right now' },
  { known: 'मुझे लगता है कि मुझे अभी के अभी जाना है।', target: 'I think that I need to leave right now' },
  { known: 'क्या आप मुझे अभी के अभी एक कड़क कॉफ़ी दे सकते हैं?', target: 'can you give me a strong cup of coffee right now' },
];
/** The 8 frame phrases: live under S0489L04 today, re-homed under S0489L03 byte-for-byte on both sides. */
const FRAME_BUILD = [
  { known: 'अगर आपने अभी के अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो मुझे देर हो जाएगी।', target: "if you don't make me a strong cup of coffee right now I'm going to be late" },
  { known: 'अगर आपने अभी के अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो मैं आपका इंतज़ार नहीं करूँगा।', target: "if you don't make me a strong cup of coffee right now I'm not going to wait for you" },
  { known: 'अगर आपने अभी के अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो इससे कोई फ़र्क़ नहीं पड़ता।', target: "if you don't make me a strong cup of coffee right now it doesn't matter" },
];
const FRAME_USE = [
  { known: 'मुझे डर है कि अगर आपने अभी के अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो मुझे देर हो जाएगी।', target: "I'm afraid if you don't make me a strong cup of coffee right now I'm going to be late" },
  { known: 'मुझे चिंता है कि अगर आपने अभी के अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो मैं आपका इंतज़ार नहीं करूँगा।', target: "I'm worried that if you don't make me a strong cup of coffee right now I'm not going to wait for you" },
  { known: 'अगर आपने अभी के अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो यह चुनौती हो सकती है।', target: "if you don't make me a strong cup of coffee right now it might be a challenge" },
  { known: 'मैंने कहा था कि अगर आपने अभी के अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो मुझे देर हो जाएगी।', target: "I said that if you don't make me a strong cup of coffee right now I'm going to be late" },
  { known: 'मुझे लगता है कि अगर आपने अभी के अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो इससे कोई फ़र्क़ नहीं पड़ता।', target: "I think that if you don't make me a strong cup of coffee right now it doesn't matter" },
];
const phraseRows = (legoId, build, use) => [
  ...build.map((p, i) => ({ id: `${COURSE}:${legoId}B0${i + 1}`, role: 'build', ...p })),
  ...use.map((p, i) => ({ id: `${COURSE}:${legoId}U0${i + 1}`, role: 'use', ...p })),
];
/** Every live phrase row of seed 489 today (26). */
const OLD_489_PHRASES = [...phraseRows('S0489L01', L01_BUILD, L01_USE), ...phraseRows('S0489L02', L02_BUILD, L02_USE), ...phraseRows('S0489L04', FRAME_BUILD, FRAME_USE)];

/** The old frame LEGO and the "if" it absorbs, and what they become. */
const OLD_FRAME = OLD_489_LEGOS[3];
const OLD_IF = OLD_489_LEGOS[2];
const NEW_FRAME = { known: `${OLD_IF.known} ${OLD_FRAME.known}`, target: `${OLD_IF.target} ${OLD_FRAME.target}` };

/** The new cut, in the /seed/complete lego shape. */
const LEGOS_489 = [
  { idx: 1, type: 'A', known: 'एक कड़क कॉफ़ी', target: 'a strong cup of coffee', build: L01_BUILD, use: L01_USE },
  { idx: 2, type: 'A', known: 'अभी के अभी', target: 'right now', build: L02_BUILD, use: L02_USE },
  { idx: 3, type: 'A', known: NEW_FRAME.known, target: NEW_FRAME.target, build: FRAME_BUILD, use: FRAME_USE },
];

// ── Seed 490 ─────────────────────────────────────────────────────────────────
const SEED_490 = { known: 'तो मैं फिर कभी किसी पर भरोसा नहीं करूँगा।', target: 'Then I will never trust anyone ever again.' };
const OLD_490_LEGOS = [
  { lego_id: 'S0490L01', known: 'तो मैं किसी पर भरोसा नहीं करूँगा', target: 'then I will never trust anyone' },
  { lego_id: 'S0490L02', known: 'फिर कभी', target: 'ever again' },
];
/** कभी goes between मैं and किसी — "तो मैं कभी किसी पर … नहीं करूँगा"; idempotent. */
const KABHI_FROM = 'तो मैं किसी पर भरोसा नहीं करूँगा';
const KABHI_TO = 'तो मैं कभी किसी पर भरोसा नहीं करूँगा';
const withKabhi = (known) => String(known).includes(KABHI_TO) ? String(known) : String(known).split(KABHI_FROM).join(KABHI_TO);
const NEW_490_L01 = { lego_id: 'S0490L01', known: withKabhi(OLD_490_LEGOS[0].known), target: OLD_490_LEGOS[0].target };
/** The 8 phrases quoting S0490L01's Hindi (live today); English unchanged. */
const OLD_490_L01_PHRASES = [
  { id: `${COURSE}:S0490L01B01`, role: 'build', known: 'मुझे लगता है कि तो मैं किसी पर भरोसा नहीं करूँगा।', target: 'I think that then I will never trust anyone' },
  { id: `${COURSE}:S0490L01B02`, role: 'build', known: 'तो मैं किसी पर भरोसा नहीं करूँगा क्योंकि वह मेरी दोस्त है।', target: "then I will never trust anyone because she's my friend" },
  { id: `${COURSE}:S0490L01B03`, role: 'build', known: 'मैंने कहा था कि तो मैं किसी पर भरोसा नहीं करूँगा।', target: 'I said that then I will never trust anyone' },
  { id: `${COURSE}:S0490L01U01`, role: 'use', known: 'अगर आपने अभी के अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो मैं किसी पर भरोसा नहीं करूँगा।', target: "if you don't make me a strong cup of coffee right now then I will never trust anyone" },
  { id: `${COURSE}:S0490L01U02`, role: 'use', known: 'मुझे डर है कि तो मैं किसी पर भरोसा नहीं करूँगा।', target: "I'm afraid then I will never trust anyone" },
  { id: `${COURSE}:S0490L01U03`, role: 'use', known: 'मुझे यक़ीन है कि तो मैं किसी पर भरोसा नहीं करूँगा।', target: "I'm sure then I will never trust anyone" },
  { id: `${COURSE}:S0490L01U04`, role: 'use', known: 'मेरे हिसाब से तो मैं किसी पर भरोसा नहीं करूँगा।', target: 'then I will never trust anyone if you ask me' },
  { id: `${COURSE}:S0490L01U05`, role: 'use', known: 'ज़िंदगी आसान नहीं है लेकिन तो मैं किसी पर भरोसा नहीं करूँगा।', target: 'life isn\'t easy but then I will never trust anyone' },
];
const NEW_490_L01_PHRASES = OLD_490_L01_PHRASES.map(p => ({ ...p, known: withKabhi(p.known) }));

const SEEDS_TOUCHED = [489, 490];

// ── The rules, as code ───────────────────────────────────────────────────────
const normWords = (s) => String(s || '').toLowerCase().replace(/[.,!?;:।"]+/g, ' ').replace(/’/g, "'").replace(/\s+/g, ' ').trim();
const wordBag = (s) => normWords(s).split(' ').filter(Boolean).sort().join(' ');
/** Both sides: the LEGOs' words ARE the seed's words (teaching order is not sentence order; a multiset, as the live gate is). */
const legosTileSeed = (legos, seed, side) => wordBag(legos.map(l => l[side]).join(' ')) === wordBag(seed[side]);
const legosTileSeedBothSides = (legos, seed) => legosTileSeed(legos, seed, 'target') && legosTileSeed(legos, seed, 'known');
/** English: the LEGO's words in order (the live containment gate). Hindi: every word of the LEGO present, in order,
 *  other words allowed between them — the frame wraps अभी के अभी and एक कड़क कॉफ़ी. */
const containsInOrder = (hay, needle, gapsAllowed) => {
  const h = normWords(hay).split(' ').filter(Boolean), n = normWords(needle).split(' ').filter(Boolean);
  if (!gapsAllowed) return ` ${h.join(' ')} `.includes(` ${n.join(' ')} `);
  let i = 0; for (const w of h) if (w === n[i]) i++;
  return i === n.length;
};
const phraseContainsLego = (lego, phrase) => containsInOrder(phrase.target, lego.target, false) && containsInOrder(phrase.known, lego.known, true);

/** Kai's fold: the frame LEGO starts with अगर / "if" — a chunk that, alone, is hypothetical and not past tense. */
const frameCarriesIf = (lego) => /^अगर\s/u.test(lego.known) && /^if\s/i.test(lego.target);
/** Kai's कभी: every row whose English says "never" carries कभी on the Hindi side. */
function neverRuleViolations(rows) {
  return rows.filter(r => /\bnever\b/i.test(r.target) && !/कभी/u.test(r.known)).map(r => ({ id: r.id, why: '"never" without कभी' }));
}
/** Frame A — the bare introduction: "अंग्रेज़ी में — '<chunk>' — में :", never an 'as in' clause. */
function frameAIntro(chunk, renderIntro) {
  return renderIntro({ frame: 'A', template: HINDI_TEMPLATE, targetLangName: TARGET_LANG_NAME, chunk, seed: '' });
}

/** Every row after the change — the batch the Shuchita checker and the cross-family read see. */
function allRows() {
  const rows = [{ seed: 489, id: 'S0489', role: 'seed', known: SEED_489.known, target: SEED_489.target }];
  for (const l of LEGOS_489) {
    const legoId = `S0489L0${l.idx}`;
    rows.push({ seed: 489, id: legoId, role: 'lego', known: l.known, target: l.target });
    for (const p of phraseRows(legoId, l.build, l.use)) rows.push({ seed: 489, ...p });
  }
  rows.push({ seed: 490, id: 'S0490', role: 'seed', known: SEED_490.known, target: SEED_490.target });
  rows.push({ seed: 490, id: 'S0490L01', role: 'lego', known: NEW_490_L01.known, target: NEW_490_L01.target });
  for (const p of NEW_490_L01_PHRASES) rows.push({ seed: 490, ...p });
  return rows;
}
/** Only the rows whose text changes (for the audio pass and the report). */
const changedRows = () => allRows().filter(r => r.id === 'S0489L03' || r.id.startsWith('S0489L03') || r.id === 'S0490L01' || r.id.includes(':S0490L01'));

// ── Offline checks (no DB) ──────────────────────────────────────────────────
function offlineCheck() {
  const problems = [];
  if (!legosTileSeedBothSides(LEGOS_489, SEED_489)) problems.push('seed 489: LEGOs do not tile the seed on both sides');
  if (!frameCarriesIf(LEGOS_489[2])) problems.push('seed 489: frame LEGO does not carry अगर / if');
  if (LEGOS_489.some(l => l.target === 'if' || l.known === 'अगर')) problems.push('seed 489: a separate "if" piece survived');
  for (const l of LEGOS_489) for (const p of [...l.build, ...l.use]) if (!phraseContainsLego(l, p)) problems.push(`seed 489: "${p.target}" does not contain LEGO ${l.idx} on both sides`);
  for (const l of LEGOS_489) if (l.build.length < 3 || l.use.length < 5) problems.push(`seed 489: LEGO ${l.idx} basket short`);
  const oldFrame = OLD_489_PHRASES.filter(p => p.id.includes('S0489L04'));
  const newFrame = phraseRows('S0489L03', FRAME_BUILD, FRAME_USE);
  if (oldFrame.length !== 8 || newFrame.length !== 8) problems.push('seed 489: frame basket is not 8 phrases');
  oldFrame.forEach((p, i) => { if (p.known !== newFrame[i].known || p.target !== newFrame[i].target || p.role !== newFrame[i].role) problems.push(`seed 489: ${p.id} not preserved byte-for-byte`); });
  // 490
  const legos490 = [NEW_490_L01, OLD_490_LEGOS[1]];
  if (!legosTileSeed(legos490, SEED_490, 'target')) problems.push('seed 490: LEGOs do not tile the seed\'s English');
  if (!containsInOrder(SEED_490.known, NEW_490_L01.known, true) || !containsInOrder(SEED_490.known, OLD_490_LEGOS[1].known, true)) problems.push('seed 490: a LEGO is not inside the seed\'s Hindi');
  if ((SEED_490.known.match(/कभी/gu) || []).length !== 1) problems.push('seed 490: the seed must carry exactly one कभी (shared by "never" and "ever again")');
  const v = neverRuleViolations(allRows());
  if (v.length) problems.push(`never-rule: ${v.map(x => `${x.id} ${x.why}`).join('; ')}`);
  NEW_490_L01_PHRASES.forEach((p, i) => {
    if (p.target !== OLD_490_L01_PHRASES[i].target) problems.push(`seed 490: ${p.id} English changed`);
    if (!containsInOrder(p.known, NEW_490_L01.known, false) || !containsInOrder(p.target, NEW_490_L01.target, false)) problems.push(`seed 490: ${p.id} does not contain the LEGO`);
    if ((p.known.match(/कभी/gu) || []).length !== 1) problems.push(`seed 490: ${p.id} must carry exactly one कभी`);
  });
  return problems;
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
const legoBody = () => LEGOS_489.map(l => ({ idx: l.idx, type: l.type, known: l.known, target: l.target, build: l.build, use: l.use }));

async function guard(sb) {
  const problems = [];
  for (const [n, want] of [[489, SEED_489], [490, SEED_490]]) {
    const { data: seed } = await sb.from('course_seeds').select('known_text, target_text, approved_at').eq('course_code', COURSE).eq('seed_number', n).single();
    if (!seed) problems.push(`seed ${n} missing`);
    else if (seed.known_text !== want.known || seed.target_text !== want.target) problems.push(`seed ${n} is "${seed.known_text}" → "${seed.target_text}"`);
  }
  const { data: legos } = await sb.from('course_legos').select('lego_id, known_text, target_text, is_new, seed_number').eq('course_code', COURSE).in('seed_number', SEEDS_TOUCHED).order('seed_number').order('lego_index');
  const live = (legos || []).map(l => `${l.lego_id}|${l.known_text}|${l.target_text}`).join('\n');
  const want = [...OLD_489_LEGOS, ...OLD_490_LEGOS].map(l => `${l.lego_id}|${l.known}|${l.target}`).join('\n');
  if (live !== want) problems.push(`LEGOs are not the cut this tool was written against:\n${live}`);
  if ((legos || []).find(l => l.lego_id === 'S0489L03')?.is_new !== false) problems.push('S0489L03 "if" is not the not-new duplicate expected');
  const { data: phrases } = await sb.from('course_practice_phrases').select('id, seed_number, phrase_role, known_text, target_text').eq('course_code', COURSE).in('seed_number', SEEDS_TOUCHED);
  for (const p of [...OLD_489_PHRASES, ...OLD_490_L01_PHRASES]) {
    const row = (phrases || []).find(r => r.id === p.id);
    if (!row) problems.push(`${p.id} missing`);
    else if (row.known_text !== p.known || row.target_text !== p.target || row.phrase_role !== p.role) problems.push(`${p.id} is ${row.phrase_role} "${row.known_text}" → "${row.target_text}"`);
  }
  const n489 = (phrases || []).filter(p => p.seed_number === 489).length;
  if (n489 !== OLD_489_PHRASES.length) problems.push(`seed 489 has ${n489} phrases, expected ${OLD_489_PHRASES.length}`);
  const { data: elsewhere } = await sb.from('course_practice_phrases').select('id').eq('course_code', COURSE).neq('seed_number', 490).like('known_text', `%${KABHI_FROM}%`);
  if ((elsewhere || []).length) problems.push(`S0490L01's Hindi is quoted outside seed 490: ${elsewhere.map(r => r.id).join(', ')}`);
  return problems;
}

async function learnersAtOrBeyond(sb) {
  const { count } = await sb.from('course_enrollments').select('learner_id', { count: 'exact', head: true }).eq('course_id', COURSE).gte('highest_completed_seed', 489);
  const { count: legoRows } = await sb.from('lego_progress').select('*', { count: 'exact', head: true }).eq('course_id', COURSE).or('lego_id.like.S0489%,lego_id.like.S0490%');
  return { atOrBeyond: count || 0, progressRowsOnSeeds: legoRows || 0 };
}

/** The real gates, no write: edit-cascade dry run for 489 vs a baseline sweep from seed 489. */
async function dryRunThroughGates() {
  const body = { seed_number: 489, target_text: SEED_489.target, generateAudio: false, dryRun: true, legos: legoBody() };
  const [dry, base] = await Promise.all([
    postJson(`${BUILDER}/api/course/${COURSE}/edit-cascade`, body, IDENTITY_HEADERS),
    postJson(`${BUILDER}/api/v2/validate/${COURSE}`, { fromSeed: 489 }),
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
  const rowsAt = process.argv.indexOf('--rows');
  if (rowsAt >= 0) { fs.writeFileSync(process.argv[rowsAt + 1], JSON.stringify(allRows(), null, 1)); console.log(`${allRows().length} rows → ${process.argv[rowsAt + 1]}`); return; }
  const sb = supa();
  console.log(`\n══════ ${COURSE}: seed 489 अगर fold + seed 490 कभी (${JOB}) ══════`);
  const offline = offlineCheck();
  if (offline.length) throw new Error(`offline rules: ${offline.join('; ')}`);
  console.log('offline: 489 tiles on both sides with the frame carrying अगर/if, every phrase contains its LEGO on both sides, 8 frame phrases preserved byte-for-byte; 490 every "never" row carries one कभी, English unchanged');

  const problems = await guard(sb);
  for (const p of problems) console.error(`BLOCKED  ${p}`);
  if (problems.length) { console.error('\nBLOCKED — live state differs. Nothing written.'); process.exit(1); }

  const learners = await learnersAtOrBeyond(sb);
  console.log(`learners at or beyond seed 489: ${learners.atOrBeyond}; progress rows on S0489*/S0490*: ${learners.progressRowsOnSeeds}`);
  if (learners.atOrBeyond > 0 || learners.progressRowsOnSeeds > 0) { console.error('BLOCKED — learners are past seed 489; migrate progress first (pod-migration protocol).'); process.exit(2); }

  const { checkLegoConflict, checkPhraseZUT } = require('../../services/course-builder/lib/validation.cjs');
  const { courseFamily } = require('../../services/course-builder/lib/course-family.cjs');
  const family = await courseFamily(sb, COURSE);
  for (const l of LEGOS_489) {
    const c = await checkLegoConflict(sb, COURSE, l.known, l.target, 489, { family });
    if (c.conflict === 'zut') throw new Error(`S0489L0${l.idx} ZUT: ${c.error}`);
    if (c.conflict === 'duplicate' && !(c.legoId || '').startsWith('S0489L')) throw new Error(`S0489L0${l.idx} duplicates ${c.legoId}`);
  }
  const c490 = await checkLegoConflict(sb, COURSE, NEW_490_L01.known, NEW_490_L01.target, 490, { family });
  if (c490.conflict === 'zut' || (c490.conflict === 'duplicate' && c490.legoId !== 'S0490L01')) throw new Error(`S0490L01 ZUT/duplicate: ${JSON.stringify(c490)}`);
  const zut489 = await checkPhraseZUT(sb, COURSE, allRows().filter(r => r.seed === 489 && r.role !== 'seed' && r.role !== 'lego'), 489, { family });
  const zut490 = await checkPhraseZUT(sb, COURSE, NEW_490_L01_PHRASES, 490, { family });
  if (zut489.length || zut490.length) throw new Error(`phrase ZUT: ${JSON.stringify([...zut489, ...zut490])}`);
  console.log('ZUT: S0489L03 and S0490L01 clean against the course family; phrases clean');

  const gates = await dryRunThroughGates();
  console.log(`live gates (edit-cascade dry run, seed 489): ${gates.dry.case}; vocab +${JSON.stringify(gates.dry.vocabDelta?.added)} −${JSON.stringify(gates.dry.vocabDelta?.removed)}; seeds already red from 489: ${gates.baselineRed}`);
  console.log(`failures CAUSED by the cut: ${gates.caused.length ? JSON.stringify(gates.caused) : 'none'}`);
  if (gates.caused.length) { console.error('BLOCKED — the cut breaks something this tool does not repair.'); process.exit(1); }

  const { evidencePath } = require('../lib/evidence-path.cjs');
  const out = { sweep: SWEEP, job: JOB, at: new Date().toISOString(), ruling: RULING, apply, learners, seed489: { seed: SEED_489, legos: LEGOS_489 }, seed490: { seed: SEED_490, l01: NEW_490_L01, phrases: NEW_490_L01_PHRASES }, gates };
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
  // the pending, never-rendered Frame A row #906 keyed to the old frame LEGO — re-pointed below, not orphaned
  const oldFrameIntro = frameAIntro(OLD_FRAME.known, presentationAuthor.renderIntro);
  const { data: oldPendingRows } = await sb.from('course_audio').select('id, s3_key, text').eq('course_code', COURSE).eq('role', 'presentation').eq('lego_id', OLD_FRAME.lego_id).eq('text_normalized', normalizeForAudio(oldFrameIntro)).like('s3_key', 'pending/%');

  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const snap = await snapshotSeeds(sb, COURSE, SEEDS_TOUCHED, { reason: 'seed-489-if-fold-490-kabhi', notes: `${RULING}. Undo: POST /api/build/redo-undo/${COURSE}.` });
  const eventId = await recordContentEdit(sb, {
    identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-recut',
    scope: { seed_numbers: SEEDS_TOUCHED, lego_ids: [OLD_IF.lego_id, OLD_FRAME.lego_id, 'S0490L01'], phrase_ids: [...OLD_489_PHRASES.filter(p => p.id.includes('S0489L04')).map(p => p.id), ...OLD_490_L01_PHRASES.map(p => p.id)] },
    detail: { job: JOB, ruling: RULING, seed489: { from: OLD_489_LEGOS, to: LEGOS_489.map(l => ({ idx: l.idx, known: l.known, target: l.target })) }, seed490: { from: OLD_490_LEGOS[0], to: NEW_490_L01, phrases: NEW_490_L01_PHRASES.map(p => p.id) }, snapshot_batch: snap.batchId, learners },
  });
  console.log(`edit event ${eventId}; snapshot batch ${snap.batchId}`);

  // 1. Seed 489: the cut, through the live gates (rolled back by the route on failure). Seed text unchanged.
  const cascade = await postJson(`${BUILDER}/api/course/${COURSE}/edit-cascade`, { seed_number: 489, target_text: SEED_489.target, generateAudio: false, dryRun: false, legos: legoBody() }, IDENTITY_HEADERS);
  if (!cascade.ok || !cascade.json?.ok) throw new Error(`edit-cascade apply failed (route rolled back): ${cascade.status} ${JSON.stringify(cascade.json).slice(0, 800)}`);
  console.log(`edit-cascade applied: ${cascade.json.message || ''}`);
  const after = must(await sb.from('course_legos').select('lego_id, known_text, target_text, is_new, version').eq('course_code', COURSE).eq('seed_number', 489).order('lego_index'), 'legos after');
  if (after.length !== LEGOS_489.length) throw new Error(`seed 489 now has ${after.length} LEGOs, expected ${LEGOS_489.length}`);
  for (const l of after) console.log(`  ${l.lego_id}  is_new=${l.is_new}  "${l.known_text}" → "${l.target_text}"`);
  if (!after[2].is_new || after[2].known_text !== NEW_FRAME.known) throw new Error('S0489L03 is not the new frame LEGO');
  must(await sb.from('course_legos').update({ last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', 489), 'legos event');
  must(await sb.from('course_practice_phrases').update({ last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', 489), 'phrases event');

  // 2. Seed 490: L01 and its 8 phrases in place (clip links dropped by trigger; re-checked by the proofreader).
  must(await sb.from('course_legos').update({ known_text: NEW_490_L01.known, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('lego_id', 'S0490L01'), 'S0490L01');
  console.log(`S0490L01 → "${NEW_490_L01.known}"`);
  for (const p of NEW_490_L01_PHRASES) {
    must(await sb.from('course_practice_phrases').update({ known_text: p.known, qa_checked: null, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('id', p.id), p.id);
    console.log(`  ${p.id} → "${p.known}"`);
  }

  // 3. Presentations: bare Frame A lines, keyed to the LEGO, pending in the presentation voice.
  const presRows = [];
  const intros = [{ legoId: 'S0489L03', chunk: NEW_FRAME.known, reuse: (oldPendingRows || [])[0] }, { legoId: 'S0490L01', chunk: NEW_490_L01.known }];
  for (const { legoId, chunk, reuse } of intros) {
    const intro = frameAIntro(chunk, presentationAuthor.renderIntro);
    if (!intro.includes(`'${chunk}'`) || /जैसे|as in/.test(intro)) throw new Error(`intro "${intro}" is not the bare Frame A line — refusing`);
    const row = { course_code: COURSE, text: intro, text_normalized: normalizeForAudio(intro), language: course.known_lang, role: 'presentation', voice_id: presVoice, origin: 'tts', s3_key: `pending/${randomUUID().toUpperCase()}.mp3`, lego_id: legoId };
    if (reuse) {
      must(await sb.from('course_audio').update({ text: row.text, text_normalized: row.text_normalized, lego_id: legoId }).eq('id', reuse.id), `${legoId} re-point pending row ${reuse.id}`);
      console.log(`  re-pointed pending row ${reuse.id} (was ${OLD_FRAME.lego_id}) → ${legoId}`);
    } else {
      must(await sb.from('course_audio').upsert([row], { onConflict: 'course_code,text_normalized,language,role,voice_id', ignoreDuplicates: true }), `${legoId} pending presentation`);
    }
    const got = must(await sb.from('course_audio').select('id,s3_key,lego_id').eq('course_code', COURSE).eq('role', 'presentation').eq('text_normalized', row.text_normalized).eq('voice_id', presVoice), 'pending row after');
    if (!got.some(p => p.lego_id === legoId)) throw new Error(`${legoId}: pending presentation row keyed elsewhere (${got.map(p => p.lego_id).join(',')})`);
    presRows.push({ lego_id: legoId, text: intro, rows: got });
    console.log(`  intro (pending, ${presVoice}) ${legoId}: ${intro}`);
  }

  // 4. An edit unapproves; the round index; the audio pass (appended, never replaced).
  must(await sb.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId }).eq('course_code', COURSE).in('seed_number', SEEDS_TOUCHED), 'unapprove');
  console.log(`seeds ${SEEDS_TOUCHED.join(', ')} unapproved`);
  await refreshNow();
  console.log('course_round_index refreshed');
  const mine = `seed 489 अगर folded into the frame LEGO (3 LEGOs, S0489L03 "if you don't make me") + seed 490 L01 gains कभी (Kai, job ${JOB}, 2026-09-23) — 26 seed-489 phrase rows + 3 LEGOs null-audio (text byte-identical to #906's rows, clips relink by text), S0490L01 + 8 Hindi prompts re-render in Kriti, 2 pending Frame A intros in Kriti (S0489L03, S0490L01)`;
  must(await sb.from('audio_pass_requests').update({
    reason: `${pending.reason} + ${mine}`,
    metadata: { ...pending.metadata, job914IfFoldKabhi: { editEventId: eventId, snapshotBatch: snap.batchId, seeds: SEEDS_TOUCHED, presentations: presRows.flatMap(p => p.rows.map(r => r.id)) } },
    updated_at: new Date().toISOString(),
  }).eq('id', pending.id), 'audio-pass append');
  console.log(`audio pass: appended to pending request ${pending.id}`);

  out.eventId = eventId; out.snapshot = snap; out.after = after; out.presentations = presRows; out.cascade = cascade.json;
  const ev = evidencePath(`tools/course-optimization/${SWEEP}.json`);
  fs.writeFileSync(ev, JSON.stringify(out, null, 1));
  console.log(`evidence: ${ev}`);
}

module.exports = { COURSE, SEED_489, SEED_490, OLD_489_LEGOS, OLD_489_PHRASES, OLD_FRAME, OLD_IF, NEW_FRAME, LEGOS_489, OLD_490_LEGOS, NEW_490_L01, OLD_490_L01_PHRASES, NEW_490_L01_PHRASES, KABHI_FROM, KABHI_TO, withKabhi, legosTileSeed, legosTileSeedBothSides, phraseContainsLego, containsInOrder, frameCarriesIf, neverRuleViolations, frameAIntro, allRows, changedRows, offlineCheck, phraseRows };

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
