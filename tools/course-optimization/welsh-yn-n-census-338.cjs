#!/usr/bin/env node
/**
 * READ-ONLY census for job #338 (Aran, 2026-10-14: "'n after a vowel IS yn", canon K43): which
 * lines of the two Welsh sandboxes change status under the new rule. Writes nothing to the DB.
 *
 * Walks each course in its RUNNING ORDER (course_running_order) and asks, with the matchers of
 * two copies of services/course-builder/lib — the current tree and an OLD copy given by --old —
 * the questions v2 validate asks:
 *   seed tiling     checkTiling(seed, its LEGOs, prior LEGO + component targets)
 *   phrase vocab    checkVocabViolations(phrase, prior + this seed's LEGO/component targets)
 *   LEGO taught     an earlier LEGO in the running order with isSameWelsh Welsh
 * and prints every row whose answer differs.
 *
 *   git archive origin/main services | tar -x -C "$CS_SCRATCH/old"
 *   NODE_PATH=$PWD/node_modules node tools/course-optimization/welsh-yn-n-census-338.cjs --old "$CS_SCRATCH/old"
 */
require('dotenv').config({ quiet: true });
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.psql'), quiet: true }); // DATABASE_URL
const path = require('path');
const { Client } = require('pg');

const COURSES = ['cym_nv2_for_eng', 'cym_sv2_for_eng'];
const arg = (k) => { const i = process.argv.indexOf(k); return i === -1 ? null : process.argv[i + 1]; };
const OLD = arg('--old');
if (!OLD) throw new Error('--old <dir holding an old services/ tree> is required');
const lib = (root) => ({
  v: require(path.join(root, 'services/course-builder/lib/validation.cjs')),
  w: require(path.join(root, 'services/course-builder/lib/welsh-mutation.cjs')),
});
const NEW = lib(path.resolve(__dirname, '../..'));
const PREV = lib(path.resolve(OLD));
// v2 validate stores vocab through extractVocab (lower case, sentence punctuation stripped).
const norm = (t) => String(t || '').toLowerCase().replace(/[.,;:!?¿¡«»"]/g, '').replace(/\s+/g, ' ').trim();
const id = (s, l) => `S${String(s).padStart(4, '0')}${l == null ? '' : 'L' + String(l).padStart(2, '0')}`;

function legoTexts(l) {
  const out = [l.target_text];
  if (l.type === 'M' && Array.isArray(l.components)) for (const c of l.components) if (c && c.target) out.push(c.target);
  return out;
}

function census(L, course, seeds, legos, phrases, order) {
  const rows = new Map();
  const bySeed = new Map();
  for (const l of legos) { if (!bySeed.has(l.seed_number)) bySeed.set(l.seed_number, []); bySeed.get(l.seed_number).push(l); }
  const phr = new Map();
  for (const p of phrases) { const k = `${p.seed_number}:${p.lego_index}`; if (!phr.has(k)) phr.set(k, []); phr.get(k).push(p); }
  const seedText = new Map(seeds.map((s) => [s.seed_number, s.target_text]));
  const vocab = new Set();
  const earlier = [];
  for (const sn of order) {
    const sl = (bySeed.get(sn) || []).sort((a, b) => a.lego_index - b.lego_index);
    if (seedText.has(sn)) {
      const t = L.v.checkTiling(seedText.get(sn), sl.map((l) => ({ target: l.target_text, type: l.type, components: l.components })), course, vocab, { seedNumber: sn });
      rows.set(`seed ${id(sn)}`, { text: seedText.get(sn), ok: t.valid, why: t.untiled || '' });
    }
    const withSeed = new Set(vocab);
    for (const l of sl) for (const t of legoTexts(l)) withSeed.add(norm(t));
    for (const l of sl) {
      const taught = earlier.find((e) => L.w.isSameWelsh(course, e.target_text, l.target_text));
      rows.set(`lego ${id(sn, l.lego_index)}`, { text: `${l.target_text} | is_new=${l.is_new}`, ok: !taught, why: taught ? `same Welsh as ${id(taught.seed_number, taught.lego_index)} "${taught.target_text}"` : '' });
      for (const p of phr.get(`${sn}:${l.lego_index}`) || []) {
        const v = L.v.checkVocabViolations([{ target: p.target_text }], withSeed, course, { seedNumber: sn });
        rows.set(`phrase ${id(sn, l.lego_index)} #${p.position}`, { text: p.target_text, ok: v.length === 0, why: v.length ? v[0].unknown : '' });
      }
    }
    for (const l of sl) { for (const t of legoTexts(l)) vocab.add(norm(t)); earlier.push(l); }
  }
  return rows;
}

(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  for (const course of COURSES) {
    const q = async (sql) => (await db.query(sql, [course])).rows;
    const order = (await q('SELECT seed_number FROM course_running_order WHERE course_code=$1 ORDER BY position')).map((r) => r.seed_number);
    const seeds = await q('SELECT seed_number, target_text FROM course_seeds WHERE course_code=$1');
    const legos = await q('SELECT seed_number, lego_index, target_text, type, components, is_new FROM course_legos WHERE course_code=$1');
    const phrases = await q('SELECT seed_number, lego_index, position, target_text FROM course_practice_phrases WHERE course_code=$1');
    const a = census(PREV, course, seeds, legos, phrases, order);
    const b = census(NEW, course, seeds, legos, phrases, order);
    const changed = [...b].filter(([k, r]) => a.has(k) && a.get(k).ok !== r.ok);
    const kinds = (ok) => ['seed', 'lego', 'phrase'].map((k) => `${k} ${[...b].filter(([x, r]) => x.startsWith(k) && r.ok === ok).length}`).join(', ');
    console.log(`\n## ${course}: ${order.length} seeds in running order; ${b.size} rows checked; ${changed.length} change status`);
    console.log(`   now failing / already-taught: ${kinds(false)}`);
    for (const [k, r] of changed) {
      const was = a.get(k);
      const st = (ok) => k.startsWith('lego') ? (ok ? 'new' : 'already-taught') : (ok ? 'pass' : 'FAIL');
      console.log(`- ${k}: ${st(was.ok)} -> ${st(r.ok)}  "${r.text}"  ${r.ok ? `(was: ${was.why})` : `(now: ${r.why})`}`);
    }
  }
  await db.end();
})().catch((e) => { console.error(e); process.exit(1); });
