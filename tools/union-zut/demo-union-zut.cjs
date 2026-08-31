#!/usr/bin/env node
/**
 * THE UNION GATE, DEMONSTRATED ON REAL COURSE DATA. READ-ONLY — this script
 * makes no write of any kind, and the segment it uses is a LABELLED STAND-IN.
 *
 * No sector seeds exist anywhere in the estate yet (the sector branches hold
 * source conversations and mappings only), and `course_sectors` does not exist
 * in the database. So: the BASE side is real spa_for_eng rows read live; the
 * SEGMENT side is a stand-in of three rows, labelled as one throughout, and is
 * never to be read as attested. The registry row is injected, not read.
 *
 * Run: node tools/union-zut/demo-union-zut.cjs
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const V = require('../../services/course-builder/lib/validation.cjs');
const F = require('../../services/course-builder/lib/course-family.cjs');
const { unionVocab } = require('../frame-layer/union.cjs');
const { instantiableFrameSet } = require('../frame-layer/availability.cjs');

const BASE = 'spa_for_eng', SEG = 'spa_health_for_eng';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// the stand-in registry row — injected, because the table does not exist
const REGISTRY = [{ base_course_code: BASE, sector_slug: 'health', sector_course_code: SEG,
                    core_anchor_lego_id: null, status: 'draft' }];

// A supabase wrapper that overlays the STAND-IN segment rows on live reads, so
// the gate runs its real queries against real data and the stand-in is visible
// as the only thing that is not.
function overlay(client, extra) {
  return { from: (table) => {
    const q = client.from(table);
    const wrap = (b) => new Proxy(b, { get(t, k) {
      if (k === 'then') return (res, rej) => Promise.resolve(t).then(r => {
        const rows = (r.data || []).concat((extra[table] || []).filter(x => matches(x, t)));
        return { ...r, data: rows };
      }).then(res, rej);
      const v = t[k];
      if (typeof v !== 'function') return v;
      return (...a) => { const out = v.apply(t, a); rec(t, k, a); return out === t ? wrap(t) : (out && out.then ? out : wrap(out)); };
    }});
    const filters = new WeakMap();
    const list = [];
    function rec(_t, k, a) { list.push([k, a]); }
    function matches(row) {
      return list.every(([k, a]) => {
        if (k === 'eq') return row[a[0]] === a[1];
        if (k === 'lt') return row[a[0]] < a[1];
        if (k === 'lte') return row[a[0]] <= a[1];
        if (k === 'in') return a[1].includes(row[a[0]]);
        return true;
      });
    }
    return wrap(q);
  }};
}

(async () => {
  // ── 1. real rows, read live ─────────────────────────────────────────────
  const { data: real, error } = await sb.from('course_legos')
    .select('lego_id,seed_number,lego_index,known_text,target_text')
    .eq('course_code', BASE).in('known_text', ['you', 'and', 'and you']).order('seed_number');
  if (error) throw new Error(error.message);
  console.log(`LIVE ${BASE} rows for the worked case:`);
  for (const r of real) console.log(`  ${r.lego_id}  "${r.known_text}" → "${r.target_text}"`);
  const you = real.find(r => r.known_text === 'you');
  const and = real.find(r => r.known_text === 'and');
  const andYou = real.find(r => r.known_text === 'and you');
  console.log(`  "and you" cut by ${BASE}: ${andYou ? 'YES → ' + andYou.target_text : 'NO'}`);

  // ── 2. the stand-in segment ─────────────────────────────────────────────
  const STANDIN = [
    { course_code: SEG, seed_number: 1, lego_index: 1, known_text: 'the pain', target_text: 'el dolor', type: 'A' },
    { course_code: SEG, seed_number: 2, lego_index: 1, known_text: you ? you.known_text : 'you',
      target_text: 'vosotros', type: 'A' },   // ← THE FORK, and the whole point
  ];
  console.log(`\nSTAND-IN segment ${SEG} (labelled: no sector seed exists anywhere yet):`);
  for (const r of STANDIN) console.log(`  S${String(r.seed_number).padStart(4,'0')}L0${r.lego_index}  "${r.known_text}" → "${r.target_text}"`);

  const family = await F.resolveCourseFamily(sb, SEG, { rows: REGISTRY });
  console.log(`\nfamily resolved: base=${family.baseCourseCode} zutScope=${family.zutCourseCodes.join(' + ')} anchor=${JSON.stringify(family.anchor)}`);

  const sbo = overlay(sb, { course_legos: STANDIN });

  // ── 3. BEFORE — the gate as it shipped: one course code ─────────────────
  const before = await V.checkLegoConflict(sbo, SEG, STANDIN[1].known_text, 'vosotros', 3);
  console.log(`\nBEFORE (single-course, no family): ${JSON.stringify(before)}`);

  // ── 4. AFTER — the same gate, fed the family ────────────────────────────
  const after = await V.checkLegoConflict(sbo, SEG, STANDIN[1].known_text, 'vosotros', 3, { family });
  console.log(`AFTER  (family-wide):  conflict=${after.conflict}`);
  if (after.error) console.log(`  ${after.error}`);
  if (after.existing) for (const e of after.existing) console.log(`  existing: ${e.legoId} "${e.target}"${e.courseCode ? ' in ' + e.courseCode : ''}`);

  // ── 5. the y usted case, on the real base course ────────────────────────
  const { data: baseLegos } = await sb.from('course_legos')
    .select('seed_number,lego_index,known_text,target_text').eq('course_code', BASE).lte('seed_number', 40);
  const { data: baseComps } = await sb.from('course_practice_phrases')
    .select('seed_number,lego_index,known_text,target_text')
    .eq('course_code', BASE).eq('phrase_role', 'component').lte('seed_number', 40);
  const anchored = { ...family, anchor: { seed_number: 40, lego_index: 2 } };
  const vocab = unionVocab({ base: { legos: baseLegos, components: baseComps },
                             segment: { legos: STANDIN, components: [] }, family: anchored, seed: 3 });
  const D6 = { id: 'D6', name: 'and you?', grain: 'exchange', fixed_material: [['and you']] };
  const pool = instantiableFrameSet({ vocab, priorSeeds: [], dialogueFrames: [D6] });
  const segKnowns = new Set(STANDIN.map(r => String(r.known_text).toLowerCase()));
  const ownsKnown = (k) => {
    const hit = vocab.find(v => String(v.known_text).toLowerCase() === k);
    return hit ? `yes (via ${segKnowns.has(k) ? 'the stand-in segment thread' : 'the base thread'})` : 'no';
  };
  console.log(`\nTHE y usted CASE, on ${baseLegos.length} real base legos + ${baseComps.length} real components up to the anchor:`);
  console.log(`  union owns "and":     ${ownsKnown('and')}`);
  console.log(`  union owns "you":     ${ownsKnown('you')}`);
  console.log(`  union owns "and you": ${ownsKnown('and you')}`);
  console.log(`  D6 "and you?" in the union pool: ${pool.some(f => f.id === 'D6')}  ← must be false`);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
