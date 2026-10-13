#!/usr/bin/env node
/**
 * ARAN'S LEGO PROOF FLAGS, APPLIED (job #554·P, Aran 2026-10-13) in the two Welsh sandboxes
 * cym_nv2_for_eng (N) / cym_sv2_for_eng (S) — and nowhere else.
 *
 * Source: job #552's doc (24 numbered blocks built from lego_proof_flags), approved by Aran with
 * exceptions: #1 / #9 / #13 NO CHANGE (the piece he asked to introduce first — dw i'n meddwl,
 * do'n i ddim, defnyddio — is already taught on its own); #24 'yn barod' HELD (South already teaches
 * 'yn barod' = 'already'); seed 15 / 'dw i newydd ddechrau' never touched; #17 / #20 other-course
 * changes beyond the two named North slips are held. The two North slips Aran named are applied:
 * S1152L02 gloss 'different' → 'differently' (Welsh unchanged, so it stays already-taught and gets
 * its 2-3 new-pairing phrases from weave-cym-new-pairing-phrases.cjs), S1364L02 'lle ’na' → 'y lle ’na'.
 *
 * Kinds of change, all keyed by seed id (seed ids are never changed):
 *   set     a LEGO's Welsh / English / components rewritten in place (radical form on its own:
 *           Aran's rule — a word alone is unmutated, the mutation lives in the phrases with its trigger).
 *   add     a build-up LEGO introduced BEFORE the LEGO Aran flagged ("introduce 'adeiladu' first").
 *           The later LEGOs of the seed move up one index (RENUMBER — safe here only because both
 *           sandboxes have zero enrollments, asserted in the SQL; never do this on a live course, see
 *           rechunk-short-legos/lib.cjs THE PROGRESS RULE). Their phrases, phrase ids and recorded
 *           intros move with them. A new LEGO is written NOT new here and flipped to new in stage 2
 *           in the same transaction that writes its basket (debut_keeps_practice refuses either half
 *           alone); its basket comes from the live generator (phrase-generation.cjs, the v3 door, with
 *           the Welsh rule of PR #80) — see the `generate` / `sql2` modes.
 *   phrases every phrase under a changed LEGO is kept and refiled where it plays: text follows the
 *           LEGO (phrase-initial mutated form → radical; clitic ’r / ’n written attached, hoffi’r);
 *           S1530's phrases move to its new LEGO 'cyfri nhw' (the old one is now already taught).
 *           Only the two scaffolding component rows 'er mwyn' / 'i fi allu' of S1530 are dropped.
 *   N 'ges i ddim' → 'ches i ddim' in every North sandbox phrase (Aran: the negative is aspirate).
 *   flags   each fixed LEGO's lego_proof_flags row → flagged false, note 'fixed (job #554·P) — …';
 *           a flag whose LEGO moved index moves with it.
 *
 *   node tools/course-optimization/weave-cym-proof-fixes-554.cjs plan    read-only: prints every change
 *   node tools/course-optimization/weave-cym-proof-fixes-554.cjs sql     → weave-cym-proof-fixes-554.sql + -undo.sql
 *   node tools/course-optimization/weave-cym-proof-fixes-554.cjs generate  (after stage 1) baskets for the new LEGOs
 *   node tools/course-optimization/weave-cym-proof-fixes-554.cjs sql2    → weave-cym-proof-fixes-554-stage2.sql
 * Every .sql is a dry run unless psql -v finish=COMMIT. The ONE undo (-undo.sql) restores every touched
 * seed whole from the stage-1 backup, so it also removes stage-2 baskets and the new-pairing rows.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createClient } = require('@supabase/supabase-js');
const { makePhraseId, computeLegoPosition, generateBuildupPhrases } = require('../../services/course-builder/lib/phrase-structure.cjs');
const { welshContainsLego } = require('../../services/course-builder/lib/welsh-mutation.cjs');

const JOB = '554·P';
const N = 'cym_nv2_for_eng';
const S = 'cym_sv2_for_eng';
const SQL = path.join(__dirname, 'weave-cym-proof-fixes-554.sql');
const SQL2 = path.join(__dirname, 'weave-cym-proof-fixes-554-stage2.sql');
const EVID = path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/job-554');
const BACKUP = 'backup_cym_proof_fixes_554';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const q = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const qj = (o) => (o === null || o === undefined ? 'NULL' : `${q(JSON.stringify(o))}::jsonb`);
const tag = (s, l) => `S${String(s).padStart(4, '0')}L${String(l).padStart(2, '0')}`;
const comp = (...pairs) => pairs.map(([known, target]) => ({ known, target }));

// Rewrites of a phrase target. Each rule is [RegExp, replacement]; applied in order.
const attachClitic = (word) => [new RegExp(` ’([rn]) (${word})`, 'g'), '’$1 $2'];

/**
 * THE PLAN. One entry per (course, seed). `before` asserts each LEGO's current Welsh so the SQL refuses
 * to run on a seed that has changed since this was written. Index numbers in `set`, `rules`, `compText`
 * are AFTER the moves.
 */
const PLAN = [
  // #2 North: 'oedd o isio' → 'oedd o isio i mi ddeud' → the full LEGO
  { c: N, s: 76, block: 2, before: { 1: 'oedd o isio i mi ddeud wrthot ti' }, moves: [[1, 3]],
    adds: [{ idx: 1, type: 'M', known: 'he wanted', target: 'oedd o isio', components: null },
           { idx: 2, type: 'M', known: 'he wanted me to say', target: 'oedd o isio i mi ddeud', components: null }] },
  // #3 North
  { c: N, s: 77, block: 3, before: { 1: 'oedd o isio i ti ddeud wrthaf fi' }, moves: [[1, 2]],
    adds: [{ idx: 1, type: 'M', known: 'he wanted you to say', target: 'oedd o isio i ti ddeud', components: null }] },
  // #2 / #3 South (old seeds numbered one lower: North S0076/S0077 = South S0075/S0076)
  { c: S, s: 75, block: 2, before: { 1: 'oedd e’n moyn i fi ddweud wrthot ti' }, moves: [[1, 3]],
    adds: [{ idx: 1, type: 'M', known: 'he wanted', target: 'oedd e’n moyn', components: null },
           { idx: 2, type: 'M', known: 'he wanted me to say', target: 'oedd e’n moyn i fi ddweud', components: null }] },
  { c: S, s: 76, block: 3, before: { 1: 'oedd e’n moyn i ti ddweud wrtha i' }, moves: [[1, 2]],
    adds: [{ idx: 1, type: 'M', known: 'he wanted you to say', target: 'oedd e’n moyn i ti ddweud', components: null }] },
  // #4 North
  { c: N, s: 1009, block: 4, before: { 1: 'dipyn bach o Gymraeg' },
    set: { 1: { target: 'tipyn bach o Gymraeg', components: comp(['a little', 'tipyn bach'], ['of', 'o'], ['Welsh', 'Cymraeg']) } },
    rules: { 1: [[/^dipyn bach/, 'tipyn bach']] }, compText: { 1: { 'dipyn bach': 'tipyn bach', Gymraeg: 'Cymraeg' } } },
  // #5 North + South
  { c: N, s: 1010, block: 5, before: { 4: 'gofio’r frawddeg gyfan' },
    set: { 4: { target: 'cofio’r frawddeg gyfan', components: comp(['remember', 'cofio'], ['the', '’r'], ['sentence', 'brawddeg'], ['whole', 'cyfan']) } },
    rules: { 4: [[/^gofio’r/, 'cofio’r']] }, compText: { 4: { gofio: 'cofio', frawddeg: 'brawddeg', gyfan: 'cyfan' } } },
  { c: S, s: 1010, block: 5, before: { 4: 'gofio’r frawddeg gyfan' },
    set: { 4: { target: 'cofio’r frawddeg gyfan', components: comp(['remember', 'cofio'], ['the', '’r'], ['sentence', 'brawddeg'], ['whole', 'cyfan']) } },
    rules: { 4: [[/^gofio’r/, 'cofio’r']] }, compText: { 4: { gofio: 'cofio', frawddeg: 'brawddeg', gyfan: 'cyfan' } } },
  // #6 North + South (South keeps its ’mlaen)
  { c: N, s: 1092, block: 6, before: { 2: 'gario ymlaen' },
    set: { 2: { target: 'cario ymlaen', components: comp(['to carry', 'cario'], ['on', 'ymlaen']) } },
    rules: { 2: [[/^gario ymlaen/, 'cario ymlaen']] }, compText: { 2: { gario: 'cario' } } },
  { c: S, s: 1092, block: 6, before: { 2: 'gario ’mlaen' },
    set: { 2: { target: 'cario ’mlaen', components: comp(['to keep on', 'cario ’mlaen']) } },
    rules: { 2: [[/^gario ’mlaen/, 'cario ’mlaen']] } },
  // #7 North + South
  { c: N, s: 1115, block: 7, before: { 2: 'gael sgwrs' },
    set: { 2: { target: 'cael sgwrs', components: comp(['to have', 'cael'], ['a conversation', 'sgwrs']) } },
    rules: { 2: [[/^gael sgwrs/, 'cael sgwrs']] }, compText: { 2: { gael: 'cael' } } },
  { c: S, s: 1115, block: 7, before: { 3: 'gael sgwrs' },
    set: { 3: { target: 'cael sgwrs', components: comp(['to have a conversation', 'cael sgwrs']) } },
    rules: { 3: [[/^gael sgwrs/, 'cael sgwrs']] } },
  // #8 North + South: 'welodd hi fi' first
  { c: N, s: 1147, block: 8, before: { 3: 'welodd hi fi’n teimlo’n nerfus' }, moves: [[3, 4]],
    adds: [{ idx: 3, type: 'M', known: 'she saw me', target: 'welodd hi fi', components: comp(['she saw', 'welodd hi'], ['me', 'fi']) }] },
  { c: S, s: 1147, block: 8, before: { 3: 'welodd hi fi’n teimlo’n nerfus' }, moves: [[3, 4]],
    adds: [{ idx: 3, type: 'M', known: 'she saw me', target: 'welodd hi fi', components: comp(['she saw me', 'welodd hi fi']) }] },
  // #10 North + South: 'rhoi’r llyfr' first, then the full LEGO in its radical form
  { c: N, s: 1161, block: 10, before: { 2: 'roi’r llyfr ’na i mi', 3: 'fore dydd Sul' }, moves: [[3, 4], [2, 3]],
    adds: [{ idx: 2, type: 'M', known: 'to give the book', target: 'rhoi’r llyfr', components: comp(['to give', 'rhoi'], ['the book', '’r llyfr']) }],
    set: { 3: { target: 'rhoi’r llyfr ’na i mi', components: comp(['give', 'rhoi'], ['that book', '’r llyfr ’na'], ['to me', 'i mi']) } },
    rules: { 3: [[/^roi’r/, 'rhoi’r']] }, compText: { 3: { roi: 'rhoi' } } },
  { c: S, s: 1161, block: 10, before: { 2: 'roi’r llyfr ’na i fi', 3: 'fore dydd Sul' }, moves: [[3, 4], [2, 3]],
    adds: [{ idx: 2, type: 'M', known: 'to give the book', target: 'rhoi’r llyfr', components: comp(['to give the book', 'rhoi’r llyfr']) }],
    set: { 3: { target: 'rhoi’r llyfr ’na i fi', components: comp(['give me that book', 'rhoi’r llyfr ’na i fi']) } },
    rules: { 3: [[/^roi’r/, 'rhoi’r']] } },
  // #11 North: aspirate negative, LEGO and seed text
  { c: N, s: 1178, block: 11, before: { 1: 'ges i ddim amser' },
    set: { 1: { target: 'ches i ddim amser', components: comp(['I didn’t have', 'ches i ddim'], ['time', 'amser']) } },
    seedTarget: { before: 'ges i ddim amser, er bo’ fi isio gweld chdi', after: 'ches i ddim amser, er bo’ fi isio gweld chdi' } },
  // #12 North + South: 'ddudon nhw' / 'ddwedon nhw' first
  { c: N, s: 1211, block: 12, before: { 1: 'ddudon nhw wrthon ni', 2: 'esbonio' }, moves: [[2, 3], [1, 2]],
    adds: [{ idx: 1, type: 'M', known: 'they said', target: 'ddudon nhw', components: comp(['they said', 'ddudon nhw']) }] },
  { c: S, s: 1211, block: 12, before: { 1: 'ddwedon nhw wrthon ni', 2: 'bo’ nhw ddim yn moyn', 3: 'esbonio' }, moves: [[3, 4], [2, 3], [1, 2]],
    adds: [{ idx: 1, type: 'M', known: 'they said', target: 'ddwedon nhw', components: comp(['they said', 'ddwedon nhw']) }] },
  // #14 North + South: 'adeiladu' first
  { c: N, s: 1332, block: 14, before: { 2: 'adeiladu bywyd newydd', 3: 'i’w chwaer' }, moves: [[3, 4], [2, 3]],
    adds: [{ idx: 2, type: 'A', known: 'to build', target: 'adeiladu', components: null }] },
  { c: S, s: 1332, block: 14, before: { 2: 'adeiladu bywyd newydd', 3: 'i’w chwaer' }, moves: [[3, 4], [2, 3]],
    adds: [{ idx: 2, type: 'A', known: 'to build', target: 'adeiladu', components: null }] },
  // #15 North + South: 'rhai syniadau' first
  { c: N, s: 1335, block: 15, before: { 3: 'rhai syniadau gwerthfawr' }, moves: [[3, 4]],
    adds: [{ idx: 3, type: 'M', known: 'some ideas', target: 'rhai syniadau', components: comp(['some', 'rhai'], ['ideas', 'syniadau']) }] },
  { c: S, s: 1335, block: 15, before: { 4: 'rhai syniadau gwerthfawr' }, moves: [[4, 5]],
    adds: [{ idx: 4, type: 'M', known: 'some ideas', target: 'rhai syniadau', components: comp(['some ideas', 'rhai syniadau']) }] },
  // #16 North + South: 'yn rhy agos' first
  { c: N, s: 1413, block: 16, before: { 3: 'yn rhy agos at yr ymyl' }, moves: [[3, 4]],
    adds: [{ idx: 3, type: 'M', known: 'too close', target: 'yn rhy agos', components: comp(['too', 'yn rhy'], ['close', 'agos']) }] },
  { c: S, s: 1413, block: 16, before: { 3: 'yn rhy agos at yr ymyl' }, moves: [[3, 4]],
    adds: [{ idx: 3, type: 'M', known: 'too close', target: 'yn rhy agos', components: comp(['too close', 'yn rhy agos']) }] },
  // #17 South 'yn wahanol'; North: gloss only (Aran's named slip) — Welsh 'wahanol' unchanged, stays already taught
  { c: S, s: 1152, block: 17, before: { 2: '’n wahanol' },
    set: { 2: { target: 'yn wahanol', components: comp(['differently', 'yn wahanol']) } },
    rules: { 2: [[/ ’n wahanol/g, '’n wahanol']] } },
  { c: N, s: 1152, block: 17, before: { 2: 'wahanol' }, set: { 2: { known: 'differently' } } },
  // #18 South (S1258L01 repeats it, already taught, follows)
  { c: S, s: 1257, block: 18, before: { 2: '’r peth glas ’na' },
    set: { 2: { target: 'y peth glas ’na', components: comp(['that blue thing', 'y peth glas ’na']) } },
    rules: { 2: [attachClitic('peth glas')] } },
  { c: S, s: 1258, block: 18, before: { 1: '’r peth glas ’na' },
    set: { 1: { target: 'y peth glas ’na', components: comp(['that blue thing', 'y peth glas ’na']) } } },
  // #19 South
  { c: S, s: 1268, block: 19, before: { 2: 'ddau e-bost' },
    set: { 2: { target: 'dau e-bost', components: comp(['two emails', 'dau e-bost']) } },
    rules: { 2: [[/^ddau e-bost/, 'dau e-bost']] } },
  // #20 South, and North's named slip
  { c: S, s: 1364, block: 20, before: { 3: '’r lle ’na' },
    set: { 3: { target: 'y lle ’na', components: comp(['that place', 'y lle ’na']) } },
    rules: { 3: [[/^’r lle ’na/, 'y lle ’na'], attachClitic('lle')] } },
  { c: N, s: 1364, block: 20, before: { 2: 'lle ’na' },
    set: { 2: { target: 'y lle ’na', components: comp(['the', 'y'], ['place', 'lle'], ['that', '’na']) } } },
  // #21 South
  { c: S, s: 1434, block: 21, before: { 2: 'dorri' },
    set: { 2: { target: 'torri', known: 'to cut' } },
    rules: { 2: [[/^dorri/, 'torri']] } },
  // #22 South: 'er mwyn i fi' first at its first appearance (S1056), and S1530 split
  { c: S, s: 1056, block: 22, before: { 1: 'er mwyn i fi allu cofio', 2: 'sut', 3: 'ddweud', 4: 'ychydig o eiriau' }, moves: [[4, 5], [3, 4], [2, 3], [1, 2]],
    adds: [{ idx: 1, type: 'M', known: 'so that I', target: 'er mwyn i fi', components: comp(['so that', 'er mwyn'], ['I', 'i fi']) }] },
  { c: S, s: 1530, block: 22, before: { 1: 'er mwyn i fi allu cyfri nhw' },
    set: { 1: { target: 'er mwyn i fi allu', known: 'so I can', components: comp(['so that', 'er mwyn'], ['I can', 'i fi allu']), is_new: false } },
    split: { from: 1, to: 2, lego: { type: 'M', known: 'count them', target: 'cyfri nhw', components: comp(['count', 'cyfri'], ['them', 'nhw']) },
             dropComponents: ['er mwyn', 'i fi allu'] } },
  // #23 South
  { c: S, s: 1590, block: 23, before: { 2: '’r bws ola’n gadael' },
    set: { 2: { target: 'y bws ola’n gadael', components: comp(['the last bus leaving', 'y bws ola’n gadael']) } },
    rules: { 2: [attachClitic('bws')] } },
];

// lego_proof_flags: [course, lego id as flagged, lego id after this job, kind]
const FLAGS = [
  [N, 'S0031L04', 'S0031L04', 'nochange'], [N, 'S1148L03', 'S1148L03', 'nochange'], [N, 'S1312L02', 'S1312L02', 'nochange'],
  [N, 'S0076L01', 'S0076L03', 'fixed'], [N, 'S0077L01', 'S0077L02', 'fixed'], [N, 'S1009L01', 'S1009L01', 'fixed'],
  [N, 'S1010L04', 'S1010L04', 'fixed'], [N, 'S1092L02', 'S1092L02', 'fixed'], [N, 'S1115L02', 'S1115L02', 'fixed'],
  [N, 'S1147L03', 'S1147L04', 'fixed'], [N, 'S1161L02', 'S1161L03', 'fixed'], [N, 'S1178L01', 'S1178L01', 'fixed'],
  [N, 'S1211L01', 'S1211L02', 'fixed'], [N, 'S1332L02', 'S1332L03', 'fixed'], [N, 'S1335L03', 'S1335L04', 'fixed'],
  [N, 'S1413L03', 'S1413L04', 'fixed'],
  [S, 'S1152L02', 'S1152L02', 'fixed'], [S, 'S1257L02', 'S1257L02', 'fixed'], [S, 'S1268L02', 'S1268L02', 'fixed'],
  [S, 'S1364L03', 'S1364L03', 'fixed'], [S, 'S1434L02', 'S1434L02', 'fixed'], [S, 'S1530L01', 'S1530L01', 'fixed'],
  [S, 'S1590L02', 'S1590L02', 'fixed'],
  // S1627L02 (#24 'yn barod') HELD: its flag is not touched.
];
const flagNote = (kind) => (kind === 'fixed' ? `fixed (job #${JOB})` : 'no change: already taught (Aran 2026-10-13)');

// The aspirate negative, North only (South already says 'ches i ddim').
const GES = /(^|[\s,.?!])ges i ddim/g;

async function pageAll(qf) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await qf().range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

/** Every phrase change, computed from the live rows. */
async function build() {
  const out = { legoMoves: [], adds: [], sets: [], ptext: [], pmove: [], pdrop: [], seeds: [], warnings: [] };
  const byKey = new Map();
  for (const p of PLAN) {
    const { data: legos } = await sb.from('course_legos').select('*').eq('course_code', p.c).eq('seed_number', p.s).order('lego_index');
    const { data: phr } = await sb.from('course_practice_phrases').select('id,lego_index,position,phrase_role,target_text,lego_position').eq('course_code', p.c).eq('seed_number', p.s).order('lego_index').order('position');
    for (const [i, t] of Object.entries(p.before)) {
      const l = legos.find((x) => x.lego_index === Number(i));
      if (!l || l.target_text !== t) throw new Error(`${p.c} S${p.s}L${i}: expected "${t}", found "${l && l.target_text}" — the seed changed since the plan was written`);
    }
    out.seeds.push([p.c, p.s]);
    const newIdx = new Map(legos.map((l) => [l.lego_index, l.lego_index]));
    for (const [a, b] of p.moves || []) { newIdx.set(a, b); out.legoMoves.push({ c: p.c, s: p.s, a, b, target: legos.find((l) => l.lego_index === a).target_text }); }
    for (const a of p.adds || []) out.adds.push({ c: p.c, s: p.s, ...a, block: p.block });
    // phrase ids after the move
    const moved = phr.map((x) => ({ ...x, newIdx: newIdx.get(x.lego_index), newId: x.id.replace(tag(p.s, x.lego_index), tag(p.s, newIdx.get(x.lego_index))) }));
    for (const [i, st] of Object.entries(p.set || {})) {
      const before = legos.find((l) => l.lego_index === [...newIdx].find(([, b]) => b === Number(i))[0]);
      out.sets.push({ c: p.c, s: p.s, idx: Number(i), beforeTarget: before.target_text, beforeKnown: before.known_text, ...st, block: p.block });
    }
    if (p.seedTarget) out.seedText = { c: p.c, s: p.s, ...p.seedTarget };
    // text rules under a changed LEGO
    const legoAfter = (i) => (p.set?.[i]?.target) || (legos.find((l) => newIdx.get(l.lego_index) === i) || {}).target_text;
    for (const x of moved) {
      let t = x.target_text;
      if (x.phrase_role === 'component') { const m = p.compText?.[x.newIdx]; if (m && m[t]) t = m[t]; }
      else for (const [re, rep] of p.rules?.[x.newIdx] || []) t = t.replace(re, rep);
      if (p.c === N) t = t.replace(GES, '$1ches i ddim');
      if (t !== x.target_text) {
        const lt = legoAfter(x.newIdx);
        if (x.phrase_role !== 'component' && !(t.includes(lt) || welshContainsLego(p.c, lt, t))) out.warnings.push(`${x.newId} "${t}" does not carry its LEGO "${lt}"`);
        out.ptext.push({ c: p.c, id: x.newId, before: x.target_text, after: t, lego_position: x.phrase_role === 'component' ? x.lego_position : (computeLegoPosition(t, lt) || x.lego_position), block: p.block });
      }
    }
    if (p.split) {
      const sp = p.split;
      out.adds.push({ c: p.c, s: p.s, idx: sp.to, ...sp.lego, is_new: true, block: p.block, splitFrom: sp.from });
      const rows = moved.filter((x) => x.newIdx === sp.from);
      const keep = rows.filter((x) => !(x.phrase_role === 'component' && sp.dropComponents.includes(x.target_text)));
      for (const x of rows) if (!keep.includes(x)) out.pdrop.push({ c: p.c, id: x.id, target: x.target_text, why: `scaffolding component of the old LEGO; '${x.target_text}' is now inside the already-taught LEGO "er mwyn i fi allu"` });
      const cnt = { component: 0, build: 0, use: 0 };
      keep.forEach((x, k) => {
        const n = ++cnt[x.phrase_role];
        out.pmove.push({ c: p.c, oldId: x.id, newId: makePhraseId(p.c, p.s, sp.to, x.phrase_role, n), s: p.s, a: sp.from, b: sp.to, position: k + 1,
          target: x.target_text, lego_position: x.phrase_role === 'component' ? x.lego_position : (computeLegoPosition(x.target_text, sp.lego.target) || x.lego_position) });
      });
    }
    byKey.set(`${p.c}|${p.s}`, true);
  }
  // North 'ges i ddim' anywhere else in the sandbox
  const ges = await pageAll(() => sb.from('course_practice_phrases').select('id,seed_number,target_text,lego_position').eq('course_code', N).ilike('target_text', '%ges i ddim%').order('id'));
  for (const x of ges) {
    if (byKey.has(`${N}|${x.seed_number}`)) continue;
    const t = x.target_text.replace(GES, '$1ches i ddim');
    if (t !== x.target_text) out.ptext.push({ c: N, id: x.id, before: x.target_text, after: t, lego_position: x.lego_position, block: 11, extra: true });
  }
  for (const x of out.ptext) if (/newydd ddechrau/.test(x.after)) throw new Error(`refusing: ${x.id} touches 'dw i newydd ddechrau' (seed 15 rule)`);
  return out;
}

function printPlan(o) {
  const cc = (c) => (c === N ? 'N' : 'S');
  console.log(`seeds touched: ${o.seeds.map(([c, s]) => `${cc(c)}${s}`).join(' ')}`);
  for (const m of o.legoMoves) console.log(`MOVE ${cc(m.c)} S${m.s} L${m.a} → L${m.b}  "${m.target}"`);
  for (const a of o.adds) console.log(`ADD  ${cc(a.c)} ${tag(a.s, a.idx)} [${a.type}] "${a.target}" = ${a.known}${a.splitFrom ? ' (split, new)' : ' (new in stage 2)'}`);
  for (const s of o.sets) console.log(`SET  ${cc(s.c)} ${tag(s.s, s.idx)} "${s.beforeTarget}" = ${s.beforeKnown}  →  "${s.target || s.beforeTarget}" = ${s.known || s.beforeKnown}${s.is_new === false ? ' (now already taught)' : ''}`);
  if (o.seedText) console.log(`SEED ${cc(o.seedText.c)} ${o.seedText.s}: "${o.seedText.before}" → "${o.seedText.after}"`);
  for (const p of o.ptext) console.log(`TEXT ${p.id.replace(/^cym_.v2_for_eng:/, cc(p.c) + ' ')}${p.extra ? ' [elsewhere]' : ''}: ${p.before}  →  ${p.after}`);
  for (const p of o.pmove) console.log(`REFILE ${cc(p.c)} ${p.oldId.split(':')[1]} → ${p.newId.split(':')[1]} pos ${p.position} (${p.lego_position}) ${p.target}`);
  for (const p of o.pdrop) console.log(`DROP ${cc(p.c)} ${p.id.split(':')[1]} "${p.target}" — ${p.why}`);
  for (const w of o.warnings) console.log(`WARN ${w}`);
  console.log(`${o.legoMoves.length} moves, ${o.adds.length} adds, ${o.sets.length} sets, ${o.ptext.length} phrase texts (${o.ptext.filter((p) => p.extra).length} elsewhere), ${o.pmove.length} refiled, ${o.pdrop.length} dropped`);
}

const FP = `CREATE FUNCTION pg_temp.fp() RETURNS TABLE(t text, n bigint, h text) LANGUAGE sql AS $f$
  SELECT 'canonical_seeds (master)', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_seeds x
  UNION ALL SELECT 'canonical_list_seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_list_seeds x
  UNION ALL SELECT 'live '||x.course_code||' seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_seeds x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'live '||x.course_code||' legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'live '||x.course_code||' phrases', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'live '||x.course_code||' intros', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM lego_introductions x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'sandbox '||x.course_code||' other seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_seeds x
    WHERE x.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng') AND NOT (x.course_code='cym_nv2_for_eng' AND x.seed_number=1178) GROUP BY x.course_code
  UNION ALL SELECT 'sandbox '||x.course_code||' other legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x
    WHERE x.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng') AND (x.course_code, x.seed_number) NOT IN (SELECT course_code, seed_number FROM t_seeds) GROUP BY x.course_code
  UNION ALL SELECT 'sandbox '||x.course_code||' other phrases', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x
    WHERE x.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng') AND (x.course_code, x.seed_number) NOT IN (SELECT course_code, seed_number FROM t_seeds)
      AND x.id NOT IN (SELECT id FROM t_extra) GROUP BY x.course_code
  UNION ALL SELECT 'sandbox '||x.course_code||' other intros', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM lego_introductions x
    WHERE x.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng') AND (x.course_code, substr(x.lego_id, 2, 4)::int) NOT IN (SELECT course_code, seed_number FROM t_seeds) GROUP BY x.course_code
  UNION ALL SELECT 'lego_proof_flags (held/other)', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.course_code, x.lego_id)) FROM lego_proof_flags x
    WHERE (x.course_code, x.lego_id) NOT IN (SELECT course_code, old_id FROM t_flags UNION SELECT course_code, new_id FROM t_flags)
$f$;`;

const LEGO_COLS = 'id, course_code, seed_number, lego_index, type, is_new, known_text, target_text, components, status, release_batch, version, updated_at, created_at, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, target1_duration_ms, target2_duration_ms, target_text_roman, target_lego_id, known_gloss_segments, last_edit_event_id';

function header(title) {
  return `${title}
\\set ON_ERROR_STOP on
\\if :{?finish}
\\else
  \\set finish ROLLBACK
\\endif
BEGIN;
SET LOCAL statement_timeout = '20min';
`;
}

function tables(o) {
  const seeds = o.seeds.map(([c, s]) => `(${q(c)},${s})`).join(',');
  const flags = FLAGS.map(([c, a, b, k]) => `(${q(c)},${q(a)},${q(b)},${q(k)})`).join(',');
  return `CREATE TEMP TABLE t_seeds (course_code text, seed_number int, PRIMARY KEY (course_code, seed_number));
INSERT INTO t_seeds VALUES ${seeds};
CREATE TEMP TABLE t_flags (course_code text, old_id text, new_id text, kind text, PRIMARY KEY (course_code, old_id));
INSERT INTO t_flags VALUES ${flags};
-- Phrases OUTSIDE the touched seeds that this job writes: North 'ges i ddim' rewrites, and every phrase whose stored
-- decomposition names a LEGO of a touched seed (the display cache is cleared; the player's runtime fallback rebuilds it).
CREATE TEMP TABLE t_extra (id text PRIMARY KEY);
INSERT INTO t_extra SELECT DISTINCT id FROM (
  SELECT unnest(ARRAY[${o.ptext.filter((p) => p.extra).map((p) => q(p.id)).join(',')}]::text[]) id
  UNION SELECT p.id FROM course_practice_phrases p WHERE p.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng')
    AND (p.course_code, p.seed_number) NOT IN (SELECT course_code, seed_number FROM t_seeds)
    AND (p.decomposition IS NOT NULL OR p.display_tiling IS NOT NULL)
    AND EXISTS (SELECT 1 FROM t_seeds t WHERE t.course_code = p.course_code
      AND (p.decomposition::text LIKE '%"S'||lpad(t.seed_number::text,4,'0')||'L%' OR p.display_tiling::text LIKE '%"S'||lpad(t.seed_number::text,4,'0')||'L%'))
) v;
`;
}

function sqlStage1(o) {
  const evFor = (c) => (c === N ? ":'ev_n'" : ":'ev_s'");
  const moves = o.legoMoves.map((m) => `SELECT pg_temp.move_lego(${q(m.c)}, ${m.s}, ${m.a}, ${m.b}, ${evFor(m.c)});`).join('\n');
  const adds = o.adds.map((a) => `INSERT INTO course_legos (course_code, seed_number, lego_index, type, is_new, known_text, target_text, components, status, last_edit_event_id)
  VALUES (${q(a.c)}, ${a.s}, ${a.idx}, ${q(a.type)}, ${a.splitFrom ? 'true' : 'false'}, ${q(a.known)}, ${q(a.target)}, ${qj(a.components)}, 'draft', ${evFor(a.c)});`).join('\n');
  const sets = o.sets.map((s) => `UPDATE course_legos SET ${[s.target && `target_text = ${q(s.target)}`, s.known && `known_text = ${q(s.known)}`, s.components && `components = ${qj(s.components)}`,
    s.is_new === false && 'is_new = false', `last_edit_event_id = ${evFor(s.c)}`].filter(Boolean).join(', ')}
  WHERE course_code = ${q(s.c)} AND seed_number = ${s.s} AND lego_index = ${s.idx} AND target_text = ${q(s.beforeTarget)};`).join('\n');
  const pmove = o.pmove.map((p) => `UPDATE course_practice_phrases SET id = ${q(p.newId)}, lego_index = ${p.b}, position = ${p.position}, lego_position = ${q(p.lego_position)},
  decomposition = NULL, decomposition_course_version = NULL, display_tiling = NULL, display_tiling_version = NULL, last_edit_event_id = ${evFor(p.c)}
  WHERE id = ${q(p.oldId)};`).join('\n');
  const pdrop = o.pdrop.map((p) => `DELETE FROM course_practice_phrases WHERE id = ${q(p.id)} AND target_text = ${q(p.target)};`).join('\n');
  const ptext = o.ptext.map((p) => `UPDATE course_practice_phrases SET target_text = ${q(p.after)}, lego_position = ${q(p.lego_position)}, last_edit_event_id = ${evFor(p.c)}
  WHERE id = ${q(p.id)} AND target_text = ${q(p.before)};`).join('\n');
  const st = o.seedText;
  return `${header(`-- GENERATED by tools/course-optimization/weave-cym-proof-fixes-554.cjs sql — job #${JOB}, Aran's LEGO proof flags (stage 1).
-- cym_nv2_for_eng / cym_sv2_for_eng ONLY. Live cym_n/cym_s, canonical_seeds, canonical_list_seeds and every sandbox row
-- outside the touched seeds (bar the listed extra phrases) are fingerprinted unchanged. Dry run unless -v finish=COMMIT.
-- Undo: weave-cym-proof-fixes-554-undo.sql (restores every touched seed whole; also undoes stage 2 and the new-pairing rows).`)}
${tables(o)}
${FP}
CREATE TEMP TABLE pre AS SELECT * FROM pg_temp.fp();

DO $$ BEGIN
  IF to_regclass('${BACKUP}_legos') IS NOT NULL THEN RAISE EXCEPTION 'already applied (${BACKUP}_legos exists)'; END IF;
  -- Renumbering a seed's LEGOs is only safe with nobody's progress stored against them.
  IF EXISTS (SELECT 1 FROM course_enrollments WHERE course_id IN ('cym_nv2_for_eng','cym_sv2_for_eng')) THEN
    RAISE EXCEPTION 'a sandbox has enrollments: renumbering would move learners (PROGRESS RULE)'; END IF;
  IF EXISTS (SELECT 1 FROM t_seeds WHERE course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng') OR seed_number = 15) THEN
    RAISE EXCEPTION 'a touched seed is outside the sandboxes, or is seed 15'; END IF;
END $$;

-- BACKUP: every touched seed whole, the extra phrases, the N S1178 seed row, the flags.
CREATE TABLE ${BACKUP}_legos AS SELECT l.* FROM course_legos l JOIN t_seeds USING (course_code, seed_number);
CREATE TABLE ${BACKUP}_phrases AS SELECT p.* FROM course_practice_phrases p JOIN t_seeds USING (course_code, seed_number)
  UNION ALL SELECT p.* FROM course_practice_phrases p WHERE p.id IN (SELECT id FROM t_extra);
CREATE TABLE ${BACKUP}_intros AS SELECT i.* FROM lego_introductions i JOIN t_seeds t ON t.course_code = i.course_code AND t.seed_number = substr(i.lego_id, 2, 4)::int;
CREATE TABLE ${BACKUP}_seeds AS SELECT * FROM course_seeds WHERE course_code = ${q(st.c)} AND seed_number = ${st.s};
CREATE TABLE ${BACKUP}_flags AS SELECT f.* FROM lego_proof_flags f JOIN t_flags t ON t.course_code = f.course_code AND t.old_id = f.lego_id;
CREATE TABLE ${BACKUP}_scope AS SELECT 'seed' k, course_code, seed_number::text v FROM t_seeds UNION ALL SELECT 'extra', NULL, id FROM t_extra;
REVOKE ALL ON ${BACKUP}_legos, ${BACKUP}_phrases, ${BACKUP}_intros, ${BACKUP}_seeds, ${BACKUP}_flags, ${BACKUP}_scope FROM anon, authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM ${BACKUP}_flags) <> (SELECT count(*) FROM t_flags) THEN RAISE EXCEPTION 'a listed flag row is missing'; END IF;
END $$;

INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
SELECT c, 'sql:job-554 weave-cym-proof-fixes', 'weave-proof-fixes', 'agent', 'claude-job-554-proof-fixes', 'agent (claude-job-554-proof-fixes)', false, 'creator',
  jsonb_build_object('seeds', (SELECT jsonb_agg(seed_number ORDER BY seed_number) FROM t_seeds WHERE course_code = c)),
  jsonb_build_object('ruling', 'Job #${JOB}: Aran''s LEGO proof flags (job #552 doc d/fb006eba), approved 2026-10-13 with exceptions (#1/#9/#13 no change, #24 held, seed 15 untouched, #17/#20 guessed other-course changes held bar the two named North slips).',
                     'backup', '${BACKUP}')
FROM (VALUES ('cym_nv2_for_eng'), ('cym_sv2_for_eng')) v(c);
SELECT (SELECT id FROM content_edit_events WHERE detail->>'backup' = '${BACKUP}' AND course_code = 'cym_nv2_for_eng' ORDER BY occurred_at DESC LIMIT 1) AS ev_n,
       (SELECT id FROM content_edit_events WHERE detail->>'backup' = '${BACKUP}' AND course_code = 'cym_sv2_for_eng' ORDER BY occurred_at DESC LIMIT 1) AS ev_s \\gset
CREATE TEMP TABLE ev AS SELECT :'ev_n'::uuid AS ev_n, :'ev_s'::uuid AS ev_s;  -- psql variables do not reach inside DO blocks

-- Move one LEGO up the seed (b free): copy the row to b, move its phrases (ids follow) and recorded intro, delete the old
-- row, give the copy the old row's uuid back. Callers go from the highest index down, so b is always free.
CREATE FUNCTION pg_temp.move_lego(c text, s int, a int, b int, ev uuid) RETURNS void LANGUAGE plpgsql AS $f$
DECLARE old_uuid uuid; new_uuid uuid := gen_random_uuid();
  ta text := 'S'||lpad(s::text,4,'0')||'L'||lpad(a::text,2,'0'); tb text := 'S'||lpad(s::text,4,'0')||'L'||lpad(b::text,2,'0');
BEGIN
  SELECT id INTO old_uuid FROM course_legos WHERE course_code=c AND seed_number=s AND lego_index=a;
  IF old_uuid IS NULL THEN RAISE EXCEPTION 'move % %: no LEGO', c, ta; END IF;
  IF EXISTS (SELECT 1 FROM course_legos WHERE course_code=c AND seed_number=s AND lego_index=b) THEN RAISE EXCEPTION 'move % → %: target taken', ta, tb; END IF;
  INSERT INTO course_legos (id, course_code, seed_number, lego_index, type, is_new, known_text, target_text, components, status, release_batch, version, created_at,
    known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, target1_duration_ms, target2_duration_ms, target_text_roman, target_lego_id, known_gloss_segments, last_edit_event_id)
  SELECT new_uuid, course_code, seed_number, b, type, is_new, known_text, target_text, components, status, release_batch, version, created_at,
    known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, target1_duration_ms, target2_duration_ms, target_text_roman, target_lego_id, known_gloss_segments, ev
  FROM course_legos WHERE id = old_uuid;
  UPDATE course_practice_phrases SET lego_index = b, id = replace(id, ':'||ta, ':'||tb),
    decomposition = NULL, decomposition_course_version = NULL, display_tiling = NULL, display_tiling_version = NULL, last_edit_event_id = ev
  WHERE course_code=c AND seed_number=s AND lego_index=a;
  UPDATE lego_introductions SET lego_id = tb WHERE course_code=c AND lego_id=ta;
  DELETE FROM course_legos WHERE id = old_uuid;
  UPDATE course_legos SET id = old_uuid WHERE id = new_uuid;
END $f$;

-- 1. MOVES (highest index first within each seed)
${moves}

-- 2. NEW LEGOs (build-up ones written NOT new; stage 2 flips each to new with its basket in one transaction)
${adds}

-- 3. LEGO text / gloss / components
${sets}

-- 4. S1530: phrases refiled under the new LEGO 'cyfri nhw'; the two scaffolding component rows dropped
${pdrop}
${pmove}

-- 5. Phrase texts that follow their LEGO (and North 'ges i ddim' → 'ches i ddim')
${ptext}

-- 6. Seed text (#11 North)
UPDATE course_seeds SET target_text = ${q(st.after)}, last_edit_event_id = ${evFor(st.c)} WHERE course_code = ${q(st.c)} AND seed_number = ${st.s} AND target_text = ${q(st.before)};

-- 7. Display caches that name a touched LEGO are cleared (runtime fallback rebuilds them)
UPDATE course_practice_phrases p SET decomposition = NULL, decomposition_course_version = NULL, display_tiling = NULL, display_tiling_version = NULL
WHERE (p.course_code, p.seed_number) IN (SELECT course_code, seed_number FROM t_seeds) AND (p.decomposition IS NOT NULL OR p.display_tiling IS NOT NULL);
UPDATE course_practice_phrases p SET decomposition = NULL, decomposition_course_version = NULL, display_tiling = NULL, display_tiling_version = NULL
WHERE p.id IN (SELECT id FROM t_extra) AND (p.decomposition IS NOT NULL OR p.display_tiling IS NOT NULL);

-- 8. Flags: unflag, note, follow a moved LEGO
UPDATE lego_proof_flags f SET lego_id = t.new_id, flagged = false, updated_at = now(),
  note = left(CASE t.kind WHEN 'fixed' THEN 'fixed (job #${JOB})' ELSE 'no change: already taught (Aran 2026-10-13)' END || ' — ' || coalesce(f.note, ''), 1000)
FROM t_flags t WHERE t.course_code = f.course_code AND t.old_id = f.lego_id;

-- CHECKS
CREATE TEMP TABLE post AS SELECT * FROM pg_temp.fp();
SELECT 'CHANGED (before)' k, * FROM (SELECT * FROM pre EXCEPT SELECT * FROM post) d UNION ALL SELECT 'CHANGED (after)', * FROM (SELECT * FROM post EXCEPT SELECT * FROM pre) d2;
DO $$
DECLARE n_text int; n_set int; n_move int; n_seed int;
BEGIN
  IF EXISTS (SELECT * FROM pre EXCEPT SELECT * FROM post) OR EXISTS (SELECT * FROM post EXCEPT SELECT * FROM pre) THEN
    RAISE EXCEPTION 'CHECK FAILED: something outside the touched sandbox seeds changed'; END IF;
  SELECT count(*) INTO n_text FROM course_practice_phrases WHERE last_edit_event_id IN ((SELECT ev_n FROM ev), (SELECT ev_s FROM ev)) AND id IN (${o.ptext.map((p) => q(p.id)).join(',')});
  IF n_text <> ${o.ptext.length} THEN RAISE EXCEPTION 'CHECK FAILED: % of ${o.ptext.length} phrase texts written', n_text; END IF;
  SELECT count(*) INTO n_set FROM course_legos WHERE last_edit_event_id IN ((SELECT ev_n FROM ev), (SELECT ev_s FROM ev));
  IF n_set <> ${new Set([...o.sets.map((s) => `${s.c}|${s.s}|${s.idx}`), ...o.adds.map((a) => `${a.c}|${a.s}|${a.idx}`), ...o.legoMoves.map((m) => `${m.c}|${m.s}|${m.b}`)]).size} THEN RAISE EXCEPTION 'CHECK FAILED: % LEGOs stamped', n_set; END IF;
  SELECT count(*) INTO n_seed FROM course_seeds WHERE last_edit_event_id = (SELECT ev_n FROM ev) AND target_text = ${q(st.after)};
  IF n_seed <> 1 THEN RAISE EXCEPTION 'CHECK FAILED: seed text not written'; END IF;
  IF EXISTS (SELECT 1 FROM course_practice_phrases p JOIN t_seeds USING (course_code, seed_number) WHERE p.target_text ~ 'newydd ddechrau' AND p.last_edit_event_id IN ((SELECT ev_n FROM ev), (SELECT ev_s FROM ev))) THEN
    RAISE EXCEPTION 'CHECK FAILED: wrote a dw i newydd ddechrau phrase'; END IF;
  IF (SELECT count(*) FROM lego_proof_flags f JOIN t_flags t ON t.course_code=f.course_code AND t.new_id=f.lego_id WHERE NOT f.flagged) <> (SELECT count(*) FROM t_flags) THEN
    RAISE EXCEPTION 'CHECK FAILED: flags'; END IF;
  -- every phrase of a touched seed still sits under a LEGO (FK) and no is_new LEGO there lost its practice (debut guard fires at COMMIT)
  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
SELECT l.course_code, l.lego_id, l.is_new, l.target_text, l.known_text,
  (SELECT count(*) FROM course_practice_phrases p WHERE p.course_code=l.course_code AND p.seed_number=l.seed_number AND p.lego_index=l.lego_index) phrases
FROM course_legos l JOIN t_seeds USING (course_code, seed_number) ORDER BY 1, 2;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \\gset
\\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\\endif
`;
}

function sqlUndo() {
  return `${header(`-- Undo of job #${JOB} (weave-cym-proof-fixes-554.sql and its stage 2, and the job's new-pairing rows): every touched seed of
-- cym_nv2_for_eng / cym_sv2_for_eng is put back WHOLE from ${BACKUP}_*, the extra phrases and the N S1178 seed row
-- are restored, the flags put back, and the result is checked byte for byte against the backup. Dry run unless -v finish=COMMIT.`)}
DO $$ BEGIN IF to_regclass('${BACKUP}_legos') IS NULL THEN RAISE EXCEPTION 'not applied (no ${BACKUP}_legos)'; END IF; END $$;
SET CONSTRAINTS ALL DEFERRED;  -- the debut guard judges the restored seeds at the end, not each delete
CREATE TEMP TABLE t_seeds AS SELECT course_code, v::int AS seed_number FROM ${BACKUP}_scope WHERE k = 'seed';
CREATE TEMP TABLE t_extra AS SELECT v AS id FROM ${BACKUP}_scope WHERE k = 'extra';
LOCK TABLE course_practice_phrases, course_legos, lego_introductions IN SHARE ROW EXCLUSIVE MODE;
DELETE FROM course_practice_phrases p USING t_seeds t WHERE p.course_code = t.course_code AND p.seed_number = t.seed_number;
DELETE FROM course_practice_phrases WHERE id IN (SELECT id FROM t_extra);
DELETE FROM lego_introductions i USING t_seeds t WHERE i.course_code = t.course_code AND substr(i.lego_id, 2, 4)::int = t.seed_number;
DELETE FROM course_legos l USING t_seeds t WHERE l.course_code = t.course_code AND l.seed_number = t.seed_number;
INSERT INTO course_legos (${LEGO_COLS}) SELECT ${LEGO_COLS} FROM ${BACKUP}_legos;
INSERT INTO course_practice_phrases SELECT * FROM ${BACKUP}_phrases;
INSERT INTO lego_introductions SELECT * FROM ${BACKUP}_intros;
UPDATE course_seeds s SET target_text = b.target_text, known_text = b.known_text, last_edit_event_id = b.last_edit_event_id FROM ${BACKUP}_seeds b WHERE s.id = b.id;
-- the job's flag rows sit at the LEGO's new id (or its old one, where it did not move)
DELETE FROM lego_proof_flags WHERE (course_code, lego_id) IN (${FLAGS.map(([c, , b]) => `(${q(c)},${q(b)})`).join(',')})
  OR (course_code, lego_id) IN (SELECT course_code, lego_id FROM ${BACKUP}_flags);
INSERT INTO lego_proof_flags SELECT * FROM ${BACKUP}_flags;
SET CONSTRAINTS ALL IMMEDIATE;
DO $$ BEGIN
  IF (SELECT md5(string_agg(md5(row(${LEGO_COLS.split(', ').filter((c) => c !== 'updated_at' && c !== 'version').map((c) => 'l.' + c).join(',')})::text), '' ORDER BY l.id)) FROM course_legos l JOIN t_seeds USING (course_code, seed_number))
     IS DISTINCT FROM (SELECT md5(string_agg(md5(row(${LEGO_COLS.split(', ').filter((c) => c !== 'updated_at' && c !== 'version').map((c) => 'b.' + c).join(',')})::text), '' ORDER BY b.id)) FROM ${BACKUP}_legos b) THEN
    RAISE EXCEPTION 'CHECK FAILED: LEGOs differ from the backup'; END IF;
  IF (SELECT md5(string_agg(md5((p.id, p.lego_index, p.position, p.known_text, p.target_text, p.phrase_role, p.lego_position, p.decomposition, p.target1_audio_id, p.target2_audio_id)::text), '' ORDER BY p.id))
        FROM course_practice_phrases p WHERE (p.course_code, p.seed_number) IN (SELECT course_code, seed_number FROM t_seeds) OR p.id IN (SELECT id FROM t_extra))
     IS DISTINCT FROM (SELECT md5(string_agg(md5((b.id, b.lego_index, b.position, b.known_text, b.target_text, b.phrase_role, b.lego_position, b.decomposition, b.target1_audio_id, b.target2_audio_id)::text), '' ORDER BY b.id)) FROM ${BACKUP}_phrases b) THEN
    RAISE EXCEPTION 'CHECK FAILED: phrases differ from the backup'; END IF;
  IF (SELECT count(*) FROM lego_introductions i JOIN t_seeds t ON t.course_code = i.course_code AND t.seed_number = substr(i.lego_id, 2, 4)::int) <> (SELECT count(*) FROM ${BACKUP}_intros) THEN
    RAISE EXCEPTION 'CHECK FAILED: intros'; END IF;
  RAISE NOTICE 'RESTORED: % LEGOs, % phrases, % intros, % flags', (SELECT count(*) FROM ${BACKUP}_legos), (SELECT count(*) FROM ${BACKUP}_phrases), (SELECT count(*) FROM ${BACKUP}_intros), (SELECT count(*) FROM ${BACKUP}_flags);
END $$;
DROP TABLE ${BACKUP}_legos, ${BACKUP}_phrases, ${BACKUP}_intros, ${BACKUP}_seeds, ${BACKUP}_flags, ${BACKUP}_scope;
DROP TABLE IF EXISTS backup_cym_nv2_newpairing_554;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \\gset
\\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\\endif
`;
}

// ── stage 2: baskets for the build-up LEGOs ─────────────────────────────────────────────────────────
const STAGE2 = () => PLAN.flatMap((p) => (p.adds || []).map((a) => ({ c: p.c, s: p.s, l: a.idx, target: a.target, known: a.known, type: a.type, components: a.components, block: p.block })));
const resultFile = (x) => path.join(EVID, `${x.c}-${tag(x.s, x.l)}.json`);

async function generate() {
  const { generateLegoPhrases } = require('../../services/course-builder/lib/phrase-generation.cjs');
  fs.mkdirSync(EVID, { recursive: true });
  const only = (() => { const i = process.argv.indexOf('--only'); return i === -1 ? null : new Set(process.argv[i + 1].split(',')); })();
  const todo = STAGE2().filter((x) => !only || only.has(`${x.c === N ? 'N' : 'S'}${tag(x.s, x.l)}`))
    .filter((x) => process.argv.includes('--redo') || !fs.existsSync(resultFile(x)) || JSON.parse(fs.readFileSync(resultFile(x), 'utf8')).blocked);
  let i = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (i < todo.length) {
      const x = todo[i++];
      const { data: lego } = await sb.from('course_legos').select('target_text,is_new').eq('course_code', x.c).eq('seed_number', x.s).eq('lego_index', x.l).single();
      if (!lego || lego.target_text !== x.target || lego.is_new) { console.log(`${x.c} ${tag(x.s, x.l)} SKIP: stage 1 not applied (found ${JSON.stringify(lego)})`); continue; }
      let r;
      try { r = await generateLegoPhrases(sb, x.c, x.s, x.l, { debutInSameWrite: true }); } catch (e) { r = { error: e.message }; }
      const rec = { ...x, blocked: r.blocked || !!r.error, error: r.error, failingGates: r.gate?.failingGates, build: r.build, use: r.use, attempts: r.attempts?.length };
      fs.writeFileSync(resultFile(x), JSON.stringify(rec, null, 2));
      console.log(`${x.c === N ? 'N' : 'S'} ${tag(x.s, x.l)} "${x.target}": ${rec.blocked ? `BLOCKED ${rec.error || (rec.failingGates || []).join(',')}` : `${r.build.length}B/${r.use.length}U`}`);
      for (const p of [...(r.build || []), ...(r.use || [])]) console.log(`    ${p.target}  =  ${p.known}`);
    }
  }));
}

async function sql2() {
  const { lineChecks } = require('./weave-cym-aran-written-510.cjs');
  const rows = [];
  const flips = [];
  const held = [];
  for (const x of STAGE2()) {
    const f = resultFile(x);
    if (!fs.existsSync(f)) { held.push(`${x.c} ${tag(x.s, x.l)}: not generated`); continue; }
    const r = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (r.blocked) { held.push(`${x.c} ${tag(x.s, x.l)}: blocked (${r.error || (r.failingGates || []).join(',')})`); continue; }
    // Second check, the Welsh per-line gate (welshUntaughtWords / welshContainsLego), on every line before it is filed.
    const lego = { target_text: x.target };
    const ok = { build: [], use: [] };
    for (const role of ['build', 'use']) for (const p of r[role]) {
      const errs = await lineChecks(sb, x.c, x.s, x.l, lego, p.target);
      if (errs.length) held.push(`${x.c} ${tag(x.s, x.l)} line "${p.target}": ${JSON.stringify(errs)}`); else ok[role].push(p);
    }
    if (!ok.build.length && !ok.use.length) { held.push(`${x.c} ${tag(x.s, x.l)}: no line survived the Welsh check`); continue; }
    flips.push(x);
    let start = 1;
    const rc = { component: 0, build: 0, use: 0 };
    if (x.type === 'M' && x.components?.length) {
      const b = generateBuildupPhrases({ seed: x.s, idx: x.l, known: x.known, target: x.target, components: x.components }, x.c);
      rows.push(...b.buildupPhrases.map((p) => ({ ...p, metadata: { ...p.metadata, job: JOB } })));
      start = b.startPosition;
      Object.assign(rc, b.roleCounts);
    }
    [...ok.build.map((p) => ['build', p]), ...ok.use.map((p) => ['use', p])].forEach(([role, p], i) => {
      rows.push({ id: makePhraseId(x.c, x.s, x.l, role, ++rc[role]), course_code: x.c, seed_number: x.s, lego_index: x.l, position: start + i,
        known_text: p.known, target_text: p.target, word_count: p.target.length, lego_count: (p.known.match(/\s+/g) || []).length + 1,
        phrase_role: role, introduce: true, lego_position: computeLegoPosition(p.target, x.target),
        metadata: { format: 'build_use', pipeline: 'v3', job: JOB, generator: 'phrase-generation.cjs generateLegoPhrases' } });
    });
  }
  const evFor = (c) => (c === N ? ":'ev_n'" : ":'ev_s'");
  const sql = `${header(`-- GENERATED by weave-cym-proof-fixes-554.cjs sql2 — job #${JOB} stage 2: baskets for the build-up LEGOs stage 1 added,
-- each LEGO flipped to NEW in the same transaction as its basket. Undo: weave-cym-proof-fixes-554-undo.sql (whole seeds).
${held.map((h) => `-- HELD: ${h}`).join('\n')}`)}
DO $$ BEGIN IF to_regclass('${BACKUP}_legos') IS NULL THEN RAISE EXCEPTION 'stage 1 is not applied'; END IF; END $$;
INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
SELECT c, 'sql:job-554 weave-cym-proof-fixes stage2', 'weave-proof-fixes-baskets', 'agent', 'claude-job-554-proof-fixes', 'agent (claude-job-554-proof-fixes)', false, 'creator',
  '{}'::jsonb, jsonb_build_object('stage', 2, 'backup', '${BACKUP}', 'generator', 'phrase-generation.cjs generateLegoPhrases (v3 door) + Welsh line check')
FROM (VALUES ('cym_nv2_for_eng'), ('cym_sv2_for_eng')) v(c);
SELECT (SELECT id FROM content_edit_events WHERE detail->>'backup' = '${BACKUP}' AND (detail->>'stage') = '2' AND course_code = 'cym_nv2_for_eng' ORDER BY occurred_at DESC LIMIT 1) AS ev_n,
       (SELECT id FROM content_edit_events WHERE detail->>'backup' = '${BACKUP}' AND (detail->>'stage') = '2' AND course_code = 'cym_sv2_for_eng' ORDER BY occurred_at DESC LIMIT 1) AS ev_s \\gset
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM course_practice_phrases p WHERE (p.course_code, p.seed_number, p.lego_index) IN (${flips.map((x) => `(${q(x.c)},${x.s},${x.l})`).join(',')})) THEN
    RAISE EXCEPTION 'a build-up LEGO already has phrases'; END IF;
  IF (SELECT count(*) FROM course_legos l WHERE (l.course_code, l.seed_number, l.lego_index, l.target_text) IN (${flips.map((x) => `(${q(x.c)},${x.s},${x.l},${q(x.target)})`).join(',')}) AND NOT l.is_new) <> ${flips.length} THEN
    RAISE EXCEPTION 'a build-up LEGO is missing, changed, or already new'; END IF;
END $$;
INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count,
  phrase_role, introduce, connected_lego_ids, lego_position, metadata, status, version, last_edit_event_id) VALUES
${rows.map((r) => `  (${q(r.id)}, ${q(r.course_code)}, ${r.seed_number}, ${r.lego_index}, ${r.position}, ${q(r.known_text)}, ${q(r.target_text)}, ${r.word_count}, ${r.lego_count}, ${q(r.phrase_role)}, ${r.introduce}, '{}', ${q(r.lego_position)}, ${qj(r.metadata)}, 'draft', 1, ${evFor(r.course_code)})`).join(',\n')};
${flips.map((x) => `UPDATE course_legos SET is_new = true, last_edit_event_id = ${evFor(x.c)} WHERE course_code = ${q(x.c)} AND seed_number = ${x.s} AND lego_index = ${x.l};`).join('\n')}
SET CONSTRAINTS ALL IMMEDIATE;
SELECT course_code, seed_number, lego_index, phrase_role, target_text, known_text FROM course_practice_phrases WHERE last_edit_event_id IN (:'ev_n', :'ev_s') ORDER BY 1, 2, 3, position;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \\gset
\\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\\endif
`;
  fs.writeFileSync(SQL2, sql);
  console.log(`${SQL2}: ${flips.length} LEGOs flipped new, ${rows.length} rows`);
  for (const h of held) console.log(`HELD ${h}`);
}

async function main() {
  const mode = process.argv[2];
  if (mode === 'generate') return generate();
  if (mode === 'sql2') return sql2();
  const o = await build();
  if (mode === 'plan') return printPlan(o);
  if (mode === 'sql') {
    printPlan(o);
    if (o.warnings.length) throw new Error('warnings above: fix the plan first');
    fs.writeFileSync(SQL, sqlStage1(o));
    fs.writeFileSync(SQL.replace(/\.sql$/, '-undo.sql'), sqlUndo());
    fs.mkdirSync(EVID, { recursive: true });
    fs.writeFileSync(path.join(EVID, 'stage1-plan.json'), JSON.stringify(o, null, 2));
    console.log(`wrote ${SQL} and -undo.sql`);
    return;
  }
  throw new Error('mode: plan | sql | generate | sql2');
}

module.exports = { PLAN, FLAGS };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
