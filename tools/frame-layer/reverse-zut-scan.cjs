#!/usr/bin/env node
/**
 * Reverse-ZUT scan for an eng_for_X LEGO layer.
 *
 * ZUT is one-directional and satisfied by the cut: one known intention, one
 * target form. In an eng_for_X course the known side is the pair language, so
 * the scan groups cuts by normalised known_text and reports every group whose
 * targets diverge — the reverse direction's fork list. Convergences (many
 * knowns, one target) are reported as context; they are harmless under ZUT.
 *
 * A divergence is not automatically a defect: it may be a mislinked cut row, a
 * SPLIT with a non-local trigger, or a MINT (no trigger exists in the known
 * language — see docs/frame-layer/reverse-mapping-classes.md). The scan finds
 * the groups; classifying them is a read of each seed's full sentence.
 *
 * Usage:
 *   node tools/frame-layer/reverse-zut-scan.cjs eng_for_spa
 *   node tools/frame-layer/reverse-zut-scan.cjs eng_for_zho --json out.json
 */
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

const course = process.argv[2];
if (!course) { console.error('usage: reverse-zut-scan.cjs <course_code> [--json out.json]'); process.exit(1); }
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;

const norm = s => (s || '').toLowerCase()
  .replace(/[¿¡?!.,;:"'’‘“”«»。、？！，…]+/g, '')
  .replace(/\s+/g, ' ').trim();

async function legos() {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('course_legos')
      .select('lego_id,seed_number,lego_index,known_text,target_text')
      .eq('course_code', course).order('seed_number').range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

(async () => {
  const rows = await legos();
  const byKnown = new Map(), byTarget = new Map();
  for (const l of rows) {
    const k = norm(l.known_text), t = norm(l.target_text);
    if (k) { if (!byKnown.has(k)) byKnown.set(k, []); byKnown.get(k).push(l); }
    if (t) { if (!byTarget.has(t)) byTarget.set(t, new Set()); byTarget.get(t).add(k); }
  }
  const divergences = [];
  for (const [k, arr] of byKnown) {
    const targets = [...new Set(arr.map(l => norm(l.target_text)))];
    if (targets.length > 1) divergences.push({
      known: k, targets,
      legos: arr.map(l => ({ lego_id: l.lego_id, seed: l.seed_number, target: l.target_text })),
    });
  }
  const convergences = [...byTarget.entries()]
    .filter(([, ks]) => ks.size > 1)
    .map(([t, ks]) => ({ target: t, knowns: [...ks] }));

  console.log(`${course}: ${rows.length} legos, seeds 1–${Math.max(0, ...rows.map(r => r.seed_number))}`);
  console.log(`known-side DIVERGENCE groups (reverse-ZUT forks): ${divergences.length}`);
  for (const d of divergences)
    console.log(`  ${d.known}  ->  ${d.targets.join('  |  ')}   [${d.legos.map(l => l.lego_id).join(', ')}]`);
  console.log(`target-side convergence groups (harmless): ${convergences.length}`);
  for (const c of convergences) console.log(`  ${c.knowns.join(' / ')}  ->  ${c.target}`);

  if (jsonOut) {
    fs.writeFileSync(jsonOut, JSON.stringify({ course, generated: new Date().toISOString(), divergences, convergences }, null, 2));
    console.log(`written ${jsonOut}`);
  }
})().catch(e => { console.error(e.message); process.exit(1); });
