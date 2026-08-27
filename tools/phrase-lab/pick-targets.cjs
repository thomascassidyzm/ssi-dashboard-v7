#!/usr/bin/env node
/**
 * Pick the 20 measured LEGOs for a course, by ONE rule, for every course.
 *
 * The seed list is the Spanish run's, held constant across all six courses. The
 * English seed corpus is shared estate-wide, so the same seed numbers carry the
 * same English sentences everywhere — which is what makes the cross-course
 * comparison about the target language rather than about the material. If each
 * worker picked its own LEGO index by its own judgement, that guarantee would be
 * gone by lunchtime, so the rule lives here and nobody re-decides it.
 *
 * THE RULE: within a seed, take lego_index 1. If there is no LEGO at index 1, or
 * the row at index 1 is not a real A/M LEGO, take the lowest index that is.
 * (course_legos rows are always type A or M — components live in
 * course_practice_phrases — so the fallback is a belt-and-braces path, and when it
 * fires it is printed rather than applied silently.)
 *
 * READ-ONLY.
 *
 * Usage: node tools/phrase-lab/pick-targets.cjs ita_for_eng --out targets.json
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');

const SEEDS = [20, 45, 75, 110, 130, 150, 206, 250, 300, 358, 400, 440, 470, 510, 535, 560, 580, 600, 620, 650];

async function pickTargets(supabase, courseCode) {
  const { data, error } = await supabase
    .from('course_legos')
    .select('lego_id,seed_number,lego_index,type,known_text,target_text')
    .eq('course_code', courseCode)
    .in('seed_number', SEEDS)
    .order('seed_number').order('lego_index');
  if (error) throw new Error(`course_legos read failed for ${courseCode}: ${error.message}`);

  const bySeed = new Map();
  for (const r of data || []) {
    if (!['A', 'M'].includes(String(r.type).toUpperCase())) continue;
    if (!bySeed.has(r.seed_number)) bySeed.set(r.seed_number, r);
  }

  const targets = [];
  const missing = [];
  const notIndexOne = [];
  for (const seed of SEEDS) {
    const r = bySeed.get(seed);
    if (!r) { missing.push(seed); continue; }
    if (r.lego_index !== 1) notIndexOne.push(`${seed} -> L${r.lego_index}`);
    targets.push({ seed, lego: r.lego_index, legoId: r.lego_id, type: r.type, known: r.known_text, target: r.target_text });
  }
  return { targets, missing, notIndexOne };
}

async function main() {
  const [courseCode] = process.argv.slice(2);
  const argv = process.argv.slice(2);
  const out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : null;
  if (!courseCode) { console.error('usage: node tools/phrase-lab/pick-targets.cjs <course> [--out targets.json]'); process.exit(1); }
  const { supabase } = require('../../services/supabase-client.cjs');
  const { targets, missing, notIndexOne } = await pickTargets(supabase, courseCode);

  // The measured list is published, not assumed: a reader must be able to see
  // exactly what was measured without re-running anything.
  console.log(`| seed | lego | id | type | known | target |`);
  console.log(`|---|---|---|---|---|---|`);
  for (const t of targets) console.log(`| ${t.seed} | L${t.lego} | ${t.legoId} | ${t.type} | ${t.known} | ${t.target} |`);
  if (notIndexOne.length) console.error(`\nNOT index 1 (fallback fired): ${notIndexOne.join(', ')}`);
  if (missing.length) console.error(`\nMISSING — no A/M LEGO at these seeds, report as a gap: ${missing.join(', ')}`);
  if (out) { fs.writeFileSync(out, JSON.stringify(targets, null, 2)); console.error(`\nwrote ${out} (${targets.length} targets)`); }
}

module.exports = { pickTargets, SEEDS };

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
