#!/usr/bin/env node
/**
 * PREMIUM COURSE QA PASS — the v3 arm, DRY-RUN.
 *
 * Tom, 2026-09-27: "start seeing about doing QA passes on the premium courses
 * using the phrase generator v3 and seeing how much we can improve the phrase
 * quality". This runs the PRODUCTION v3 door (`generateLegoPhrases` — the same
 * prompt, the same real gates, the same retries the builder gets) over a
 * stratified sample of one course's LEGOs and writes the sets to disk.
 *
 * WRITES NOTHING TO THE DATABASE and renders no audio: proposals only (standing
 * no-new-TTS-spend ruling, 2026-09-26). The one side-effect the door has — the
 * per-LEGO declaration record — is redirected out of the repo by setting
 * PHRASE_DECLARATIONS_DIR before the door is required.
 *
 * THE SAMPLE (pick): seeds 1-10 are hand-tweaked and excluded (Tom, 2026-09-20).
 * The rest of the course's POPULATED extent — the seeds that actually carry
 * LEGOs, which for Welsh is not 668 — is cut into thirds, and N seeds are taken
 * evenly spaced in each third. The LEGO index rotates through the seed's LEGOs so
 * the sample is not only ever the first, simplest LEGO of a seed.
 *
 * RESUMABLE: completed targets are skipped on re-run; failures are retried.
 *
 * Usage:
 *   node tools/phrase-lab/qa-pass-generate.cjs pick cym_s_for_eng --per-third 15 --out targets.json
 *   node tools/phrase-lab/qa-pass-generate.cjs run  cym_s_for_eng --targets targets.json --out v3.json
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');

const FIRST_REGENERATED_SEED = 11; // seeds 1-10 are hand-tweaked — never regenerated

async function fetchAll(supabase, table, select, courseCode) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(select).eq('course_code', courseCode)
      .order('seed_number').range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

/** The course's populated extent cut into thirds, seeds 1-10 excluded. */
function thirdsOf(maxSeed) {
  const span = maxSeed - FIRST_REGENERATED_SEED + 1;
  const a = FIRST_REGENERATED_SEED + Math.floor(span / 3) - 1;
  const b = FIRST_REGENERATED_SEED + Math.floor((2 * span) / 3) - 1;
  return [
    { name: 'early', from: FIRST_REGENERATED_SEED, to: a },
    { name: 'mid', from: a + 1, to: b },
    { name: 'late', from: b + 1, to: maxSeed },
  ];
}

async function pick(supabase, courseCode, perThird) {
  const legos = await fetchAll(supabase, 'course_legos', 'seed_number,lego_index,lego_id,type,known_text,target_text', courseCode);
  const bySeed = new Map();
  for (const l of legos) {
    if (!['A', 'M'].includes(String(l.type).toUpperCase())) continue;
    if (!bySeed.has(l.seed_number)) bySeed.set(l.seed_number, []);
    bySeed.get(l.seed_number).push(l);
  }
  const maxSeed = Math.max(...bySeed.keys());
  const thirds = thirdsOf(maxSeed);
  const targets = [];
  let k = 0;
  for (const t of thirds) {
    const seeds = [...bySeed.keys()].filter((s) => s >= t.from && s <= t.to).sort((x, y) => x - y);
    const step = seeds.length / perThird;
    for (let i = 0; i < perThird && i < seeds.length; i++) {
      const s = seeds[Math.floor(i * step + step / 2)];
      const ls = bySeed.get(s).sort((x, y) => x.lego_index - y.lego_index);
      const l = ls[k++ % ls.length];
      targets.push({ third: t.name, seed: s, lego: l.lego_index, legoId: l.lego_id, type: l.type, known: l.known_text, target: l.target_text });
    }
  }
  return { thirds, maxSeed, targets };
}

async function run(supabase, courseCode, targetsFile, outFile, concurrency) {
  process.env.PHRASE_DECLARATIONS_DIR = process.env.PHRASE_DECLARATIONS_DIR
    || path.join(path.dirname(path.resolve(outFile)), 'declarations');
  const { generateLegoPhrases } = require('../../services/course-builder/lib/phrase-generation.cjs');

  const targets = JSON.parse(fs.readFileSync(targetsFile, 'utf8')).targets;
  const prior = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : [];
  const results = prior.filter((r) => !r.error);
  const done = new Set(results.map((r) => `${r.seedNumber}:${r.legoIndex}`));
  const todo = targets.filter((t) => !done.has(`${t.seed}:${t.lego}`));
  const save = () => fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.error(`[qa-pass] ${courseCode}: ${todo.length} to generate, ${results.length} done`);

  let cursor = 0;
  async function worker() {
    for (;;) {
      const t = todo[cursor++];
      if (!t) return;
      try {
        const r = await generateLegoPhrases(supabase, courseCode, t.seed, t.lego);
        results.push({ third: t.third, ...r });
        console.error(`[qa-pass] S${t.seed}L${t.lego} ${r.build.length}B/${r.use.length}U in ${(r.elapsedMs / 1000).toFixed(0)}s — ${r.blocked ? `BLOCKED ${r.gate?.failingGates?.join(',')}` : 'pass'} after ${r.attempts.length}`);
      } catch (e) {
        // A hole is recorded as a hole, never dropped: an arm with holes must
        // not read as an arm that scored badly.
        results.push({ third: t.third, courseCode, seedNumber: t.seed, legoIndex: t.lego, error: String(e.message).slice(0, 400) });
        console.error(`[qa-pass] S${t.seed}L${t.lego} FAILED: ${String(e.message).slice(0, 200)}`);
      }
      save();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, todo.length) }, worker));
  save();
  console.error(`[qa-pass] done — ${results.filter((r) => !r.error).length} sets, ${results.filter((r) => r.error).length} failed`);
}

async function main() {
  const [cmd, courseCode, ...rest] = process.argv.slice(2);
  const arg = (k, d) => (rest.includes(k) ? rest[rest.indexOf(k) + 1] : d);
  const { supabase } = require('../../services/supabase-client.cjs');
  if (cmd === 'pick') {
    const r = await pick(supabase, courseCode, Number(arg('--per-third', '15')));
    fs.writeFileSync(arg('--out'), JSON.stringify({ courseCode, ...r }, null, 2));
    console.error(`picked ${r.targets.length} targets over ${JSON.stringify(r.thirds)}`);
  } else if (cmd === 'run') {
    await run(supabase, courseCode, arg('--targets'), arg('--out'), Number(arg('--concurrency', '3')));
  } else {
    console.error('usage: pick|run <course> …');
    process.exit(1);
  }
}

module.exports = { thirdsOf, pick, FIRST_REGENERATED_SEED };

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
