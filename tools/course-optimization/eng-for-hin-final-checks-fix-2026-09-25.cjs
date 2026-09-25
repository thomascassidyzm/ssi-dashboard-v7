#!/usr/bin/env node
'use strict';
// eng_for_hin — final checks before the joint Kriti/Rehan/Charlotte render (Kai's approval 2026-09-25 10:26Z, job #181·I).
//
// WHAT THIS FIXES (and nothing else): the rows among the 55 Shuchita-rulebook hits on #941·H's rewritten lines, and the
// 26 Sonnet presentation-author flags from #20·I, that are CLEARLY wrong on the evidence of the live course itself —
// a phrase that no longer contains its LEGO, a Hindi prompt that drops the taught English, English that is not English,
// or a construction no Hindi speaker produces. Everything judgement-shaped (LEGO-level glosses, मेरा/अपना under a LEGO
// that carries मेरा, copula drops in natural speech, adverb attachment with two valid readings) is LEFT and listed in
// the record page for Kai. Kai is resting: borderline calls were settled here by best effort and are named as such.
//
//   S0466L02 (LEGO दीवार के पार "over the wall" — Shuchita's own seed-466 fix): four phrases still say दीवार पर ("on the
//            wall") and so no longer contain their LEGO. → दीवार के पार on all four.
//   S0490L03 ("ever again"): five phrases embed the seed's "तो मैं …" under कि, giving "कि तो मैं", which strands तो
//            (the judge's 3 high-confidence hits plus the 2 male twins with the same shape). → "कि मैं तो फिर कभी …".
//   S0057L02 ("what I wanted to say"): three phrases drop the correlative the seed itself carries (जो … उसे) — a straight
//            calque of the English. → "जो मैं कहना चाहती थी वह मुझे याद नहीं आ रहा" (Shuchita's seed-78/122 precedent).
//   S0379L03U01: the Hindi says only "मैं अफ़्रीका जा सकी" but the answer is "I was lucky enough to travel to Africa" —
//            the prompt drops भाग्यशाली थी कि, so it does not elicit the taught English. → restored, as every sibling has.
//   S0562L03 ("safely"): B03 puts सुरक्षित before the noun ("safe grass"); U03 "I'll call you back safely" is not a sentence
//            anyone says, in either language, and its LEGO has exactly 5 USE rows so it cannot be removed. → B03 adverb
//            before the verb; U03 becomes "मैं वहाँ सुरक्षित पहुँच जाऊँगी।" / "I'll get there safely" (vocabulary of seed 562).
//   S0184L03U04: the English "we were talking about a while ago" is not English (the "about" leaks from LEGO S0143L02's
//            gloss). → "we were talking a while ago"; the display tiling's target label follows.
//   Seed 82: "… Why not?" over "क्यों?" — क्यों alone elicits "Why?". → क्यों नहीं?
//   Seed 342: the seed line "मैं किसी से मिली जिसने …" is the only row of its family without था/थी; its own LEGO S0342L01 is
//            "मैं किसी से मिली थी", so the seed does not contain its LEGO. → मिली थी.
//
// LEFT ALONE, deliberately: seed 5 lines S0005L02U04 / L03U02 / L03U05 (Kai's decision); the 92 oversized-LEGO cuts (later);
// S0071L01's five adverb placements (both attachments are valid readings); the eight मैं…मेरा/मेरी rows (their LEGOs carry
// मेरा — a LEGO-level call); everything else in the two lists — see the record page.
//
// MECHANICS: same guarded path as eng-for-hin-as-often-as-possible-baar-2026-09-24.cjs — refuses unless every live row is
// byte-for-byte what it was written against; live ZUT (checkPhraseZUT) on every new line; the known-side gender pairs in
// course_gender_expansions are rewritten with the row (the render picks Kriti/Rehan BY TEXT); redo snapshot of every seed
// touched + one content_edit_event; metadata.known_gender stamps untouched; approvals kept as found and recorded; nothing
// rendered — appended to the pending audio-pass request (the BEFORE UPDATE trigger nulls the Hindi clip link on a changed
// row; the one English change nulls its English links, which the same render refills).
//
//   node tools/course-optimization/eng-for-hin-final-checks-fix-2026-09-25.cjs            # dry run + live gates
//   node tools/course-optimization/eng-for-hin-final-checks-fix-2026-09-25.cjs --apply
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });

const COURSE = 'eng_for_hin';
const JOB = '#181·I';
const SWEEP = 'eng-for-hin-final-checks-fix-2026-09-25';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = `Kai, 2026-09-25 10:26Z (job ${JOB}): final checks before the joint render — fix only what is clearly wrong among the 55 Shuchita hits on #941·H rows and the 26 #20·I author flags; settle borderline items by best effort and list them`;

/** id → {seed, role, lego (the form of its LEGO this row must contain), known, target} before, and the intended text after. The table is the truth; the transform below must reproduce it. */
const PHRASES = [
  { id: 'eng_for_hin:S0466L02B03', seed: 466, role: 'build', lego: 'दीवार के पार', known: 'जो दीवार पर खड़ा है', target: 'the one who is standing over the wall', newKnown: 'जो दीवार के पार खड़ा है' },
  { id: 'eng_for_hin:S0466L02U01', seed: 466, role: 'use', lego: 'दीवार के पार', known: 'मैं उसे जानता हूँ जो दीवार पर चल रहा है', target: 'I know the one who is walking over the wall', newKnown: 'मैं उसे जानता हूँ जो दीवार के पार चल रहा है' },
  { id: 'eng_for_hin:S0466L02U02', seed: 466, role: 'use', lego: 'दीवार के पार', known: 'मैं दीवार पर किसी से मिली थी', target: 'I met someone over the wall', newKnown: 'मैं दीवार के पार किसी से मिली थी' },
  { id: 'eng_for_hin:S0466L02U05', seed: 466, role: 'use', lego: 'दीवार के पार', known: 'मैं दीवार पर रह सकता हूँ', target: 'I can stay over the wall', newKnown: 'मैं दीवार के पार रह सकता हूँ' },
  { id: 'eng_for_hin:S0490L03B02', seed: 490, role: 'build', lego: 'फिर कभी', known: 'मुझे लगता है कि तो मैं फिर कभी किसी पर भरोसा नहीं करूँगी।', target: 'I think that then I will never trust anyone ever again', newKnown: 'मुझे लगता है कि मैं तो फिर कभी किसी पर भरोसा नहीं करूँगी।' },
  { id: 'eng_for_hin:S0490L03B03', seed: 490, role: 'build', lego: 'फिर कभी', known: 'मैंने कहा था कि तो मैं फिर कभी किसी पर भरोसा नहीं करूँगा।', target: 'I said that then I will never trust anyone ever again', newKnown: 'मैंने कहा था कि मैं तो फिर कभी किसी पर भरोसा नहीं करूँगा।' },
  { id: 'eng_for_hin:S0490L03U02', seed: 490, role: 'use', lego: 'फिर कभी', known: 'मुझे डर है कि तो मैं फिर कभी किसी पर भरोसा नहीं करूँगा।', target: "I'm afraid then I will never trust anyone ever again", newKnown: 'मुझे डर है कि मैं तो फिर कभी किसी पर भरोसा नहीं करूँगा।' },
  { id: 'eng_for_hin:S0490L03U03', seed: 490, role: 'use', lego: 'फिर कभी', known: 'मुझे यक़ीन है कि तो मैं फिर कभी किसी पर भरोसा नहीं करूँगी।', target: "I'm sure then I will never trust anyone ever again", newKnown: 'मुझे यक़ीन है कि मैं तो फिर कभी किसी पर भरोसा नहीं करूँगी।' },
  { id: 'eng_for_hin:S0490L03U05', seed: 490, role: 'use', lego: 'फिर कभी', known: 'क्या आपको लगता है कि तो मैं फिर कभी किसी पर भरोसा नहीं करूँगी?', target: 'do you think that then I will never trust anyone ever again?', newKnown: 'क्या आपको लगता है कि मैं तो फिर कभी किसी पर भरोसा नहीं करूँगी?' },
  { id: 'eng_for_hin:S0057L02B01', seed: 57, role: 'build', lego: 'जो मैं कहना चाहती थी', known: 'जो मैं कहना चाहती थी मुझे याद नहीं आ रहा', target: "I can't remember what I wanted to say", newKnown: 'जो मैं कहना चाहती थी वह मुझे याद नहीं आ रहा' },
  { id: 'eng_for_hin:S0057L02U04', seed: 57, role: 'use', lego: 'जो मैं कहना चाहती थी', known: 'आज सुबह जो मैं कहना चाहती थी मुझे याद नहीं आ रहा।', target: "I can't remember what I wanted to say this morning", newKnown: 'आज सुबह जो मैं कहना चाहती थी वह मुझे याद नहीं आ रहा।' },
  { id: 'eng_for_hin:S0057L02U05', seed: 57, role: 'use', lego: 'जो मैं कहना चाहता था', legoText: 'जो मैं कहना चाहती थी' /* LEGO debuts female; this male row carries the male form of it */, known: 'यहाँ जो मैं कहना चाहता था मुझे याद नहीं आ रहा।', target: "I can't remember what I wanted to say here", newKnown: 'यहाँ जो मैं कहना चाहता था वह मुझे याद नहीं आ रहा।' },
  { id: 'eng_for_hin:S0379L03U01', seed: 379, role: 'use', lego: 'अफ़्रीका जा सकी', known: 'मैं अफ़्रीका जा सकी लेकिन मेरे पास काफ़ी पैसे नहीं थे।', target: "I was lucky enough to travel to Africa but I didn't have enough money", newKnown: 'मैं भाग्यशाली थी कि अफ़्रीका जा सकी लेकिन मेरे पास काफ़ी पैसे नहीं थे।' },
  { id: 'eng_for_hin:S0562L03B03', seed: 562, role: 'build', lego: 'सुरक्षित', known: 'मैं सुरक्षित घास पर दौड़ूँगी।', target: "I'm going to run across the grass safely", newKnown: 'मैं घास पर सुरक्षित दौड़ूँगी।' },
  { id: 'eng_for_hin:S0562L03U03', seed: 562, role: 'use', lego: 'सुरक्षित', known: 'मैं सुरक्षित आपको वापस कॉल करूँगी।', target: "I'll call you back safely", newKnown: 'मैं वहाँ सुरक्षित पहुँच जाऊँगी।', newTarget: "I'll get there safely" },
  { id: 'eng_for_hin:S0184L03U04', seed: 184, role: 'use', lego: 'थोड़ी देर पहले', known: 'हम थोड़ी देर पहले बात कर रही थीं।', target: 'we were talking about a while ago', newKnown: 'हम थोड़ी देर पहले बात कर रही थीं।', newTarget: 'we were talking a while ago',
    decompFix: { from: ' we were talking about', to: ' we were talking' } },
];
const SEEDS = [
  { seed: 82, known: 'मैं आपका इंतज़ार नहीं करूँगी। क्यों?', target: "I'm not going to wait for you. Why not?", newKnown: 'मैं आपका इंतज़ार नहीं करूँगी। क्यों नहीं?' },
  { seed: 342, known: 'मैं किसी से मिली जिसने कुछ कहा था।', target: 'I met someone who said something.', newKnown: 'मैं किसी से मिली थी जिसने कुछ कहा था।' },
];
const SEEDS_TOUCHED = [...new Set([...PHRASES.map(p => p.seed), ...SEEDS.map(s => s.seed)])].sort((a, b) => a - b);

/** The same rewrite, gender-aware, so a course_gender_expansions pair (male / female sides) moves with its row. Idempotent. */
function transformKnown(text) {
  let t = String(text);
  t = t.replace(/दीवार पर/gu, 'दीवार के पार');
  t = t.replace(/कि तो मैं फिर कभी/gu, 'कि मैं तो फिर कभी');
  t = t.replace(/(चाहत[ीा] थ[ीा]) मुझे याद नहीं आ रहा/gu, '$1 वह मुझे याद नहीं आ रहा');
  t = t.replace(/^मैं अफ़्रीका जा सका लेकिन/u, 'मैं भाग्यशाली था कि अफ़्रीका जा सका लेकिन');
  t = t.replace(/^मैं अफ़्रीका जा सकी लेकिन/u, 'मैं भाग्यशाली थी कि अफ़्रीका जा सकी लेकिन');
  t = t.replace(/^मैं सुरक्षित घास पर दौड़/u, 'मैं घास पर सुरक्षित दौड़');
  t = t.replace(/^मैं सुरक्षित आपको वापस कॉल करूँगा।$/u, 'मैं वहाँ सुरक्षित पहुँच जाऊँगा।');
  t = t.replace(/^मैं सुरक्षित आपको वापस कॉल करूँगी।$/u, 'मैं वहाँ सुरक्षित पहुँच जाऊँगी।');
  t = t.replace(/^मैं आपका इंतज़ार नहीं करूँग([ाी])। क्यों\?$/u, 'मैं आपका इंतज़ार नहीं करूँग$1। क्यों नहीं?');
  t = t.replace(/^मैं किसी से मिला जिसने कुछ कहा था।$/u, 'मैं किसी से मिला था जिसने कुछ कहा था।');
  t = t.replace(/^मैं किसी से मिली जिसने कुछ कहा था।$/u, 'मैं किसी से मिली थी जिसने कुछ कहा था।');
  return t;
}

/** The defects, as rules a row either breaks or does not — the test of this tool. */
function defects(rows) {
  const out = [];
  for (const r of rows) {
    const k = String(r.known || ''), t = String(r.target || '');
    if (r.lego && !k.includes(r.lego)) out.push(`${r.id}: does not contain its LEGO ${r.lego}`);
    if (/कि तो मैं/u.test(k)) out.push(`${r.id}: stranded तो after कि`);
    if (/(चाहत[ीा] थ[ीा]) मुझे याद नहीं आ रहा/u.test(k)) out.push(`${r.id}: जो-clause without its correlative`);
    if (/lucky enough/.test(t) && !/भाग्यशाली/u.test(k)) out.push(`${r.id}: prompt drops भाग्यशाली for "lucky enough"`);
    if (/^मैं सुरक्षित (घास|आपको)/u.test(k)) out.push(`${r.id}: सुरक्षित stranded before a noun`);
    if (/call you back safely/.test(t)) out.push(`${r.id}: "call you back safely" is not a sentence`);
    if (/talking about a while ago/.test(t)) out.push(`${r.id}: "talking about a while ago" is not English`);
    if (/Why not\?$/.test(t) && !/क्यों नहीं\?$/u.test(k)) out.push(`${r.id}: क्यों alone does not elicit "Why not?"`);
    if (r.id === 'S0342' && !/मिली थी जिसने/u.test(k)) out.push(`${r.id}: seed does not contain its LEGO मैं किसी से मिली थी`);
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
  const snap = await snapshotSeeds(sb, COURSE, SEEDS_TOUCHED, { reason: 'final-checks-fix', notes: `${RULING}. Undo: POST /api/build/redo-undo/${COURSE}.` });
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
  const mine = `final checks before the joint render (Kai, job ${JOB}, 2026-09-25): seeds 82, 342 + ${PHRASES.length} phrases across seeds ${SEEDS_TOUCHED.join(',')} null-audio on the Hindi side (1 English line re-worded: S0562L03U03; 1 English line corrected: S0184L03U04)`;
  must(await sb.from('audio_pass_requests').update({ reason: `${pending.reason} + ${mine}`, metadata: { ...pending.metadata, job181FinalChecks: { editEventId: eventId, snapshotBatch: snap.batchId, seeds: SEEDS_TOUCHED } }, updated_at: new Date().toISOString() }).eq('id', pending.id), 'audio-pass append');
  console.log(`audio pass: appended to pending request ${pending.id}`);
  out.eventId = eventId; out.snapshot = snap;
  const ev = evidencePath(`tools/course-optimization/${SWEEP}.json`);
  fs.writeFileSync(ev, JSON.stringify(out, null, 1));
  console.log(`evidence: ${ev}`);
}

module.exports = { COURSE, PHRASES, SEEDS, SEEDS_TOUCHED, transformKnown, defects, oldRows, newRows };
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
