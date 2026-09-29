#!/usr/bin/env node
/**
 * Job #704: run the v3 generator (generateLegoPhrases, unchanged) on the sampled LEGOs with Sonnet 5.5 at medium effort.
 * Writes JSON to --out only. The supabase client handed to the generator is READ-ONLY: any insert/update/upsert/delete/rpc throws,
 * so nothing can reach a course table (the one raiseStructuralFlag insert path included, which then reports {raised:false}).
 * Model/effort are swapped by a `claude` shim earlier on PATH (SHIM_DIR) — the generator and claudeChat are untouched.
 * Course-so-far stem view per LEGO = the Opus (#409) candidates-orig baskets of lower seeds + live seeds 1-10, windowed at this seed.
 *   node run-sonnet.cjs --out DIR [--only key,key] [--limit N] [--concurrency 3]
 */
const fs = require('fs'), path = require('path');
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const { generateLegoPhrases } = require('../../../services/course-builder/lib/phrase-generation.cjs');
const { windowedStemShares } = require('../../phrase-gate/stem-diversity.cjs');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i === -1 ? d : process.argv[i + 1]; };
const WRITES = new Set(['insert', 'update', 'upsert', 'delete']);
function readOnly(sb) {
  const wrap = (q) => new Proxy(q, { get(t, p) { if (WRITES.has(p)) throw new Error(`read-only harness: ${String(p)} refused`); const v = t[p]; return typeof v === 'function' ? (...a) => { const r = v.apply(t, a); return r && typeof r === 'object' && typeof r.then === 'function' && r !== t ? wrap(r) : r; } : v; } });
  return new Proxy(sb, { get(t, p) { if (p === 'rpc') return () => { throw new Error('read-only harness: rpc refused'); }; if (p === 'from') return (tb) => wrap(t.from(tb)); const v = t[p]; return typeof v === 'function' ? v.bind(t) : v; } });
}
const isPool = (m) => /session limit|usage limit|weekly limit|hit your (\w+ )?limit|limit · resets|rate limit|quota|429|credit balance/i.test(String(m || ''));
async function main() {
  const out = arg('--out'); if (!out) { console.error('--out required'); process.exit(2); }
  const conc = Math.min(+arg('--concurrency', 3), 3);
  const only = arg('--only') ? new Set(arg('--only').split(',')) : null;
  let items = JSON.parse(fs.readFileSync(path.join(__dirname, 'sample.json'), 'utf8')).sample;
  if (only) items = items.filter((x) => only.has(`${x.course}/${x.key}`) || only.has(x.key));
  if (arg('--limit')) items = items.slice(0, +arg('--limit'));
  const sb = readOnly(createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
  const views = {};
  async function viewFor(course) {
    if (views[course]) return views[course];
    const c = course.split('_')[0], baskets = [];
    const d = path.join(process.env.HOME, 'ssi-evidence/ssi-dashboard-v7/tools/phrase-lab', `${c}-v3`, 'candidates-orig');
    for (const sd of fs.readdirSync(d).filter((x) => /^seed-\d+$/.test(x))) for (const f of fs.readdirSync(path.join(d, sd)).filter((x) => /^S\d+L\d+\.json$/.test(x))) {
      const r = JSON.parse(fs.readFileSync(path.join(d, sd, f), 'utf8'));
      if (r.seedNumber > 10) baskets.push({ seed: r.seedNumber, legoKnown: r.legoKnown, phrases: [...(r.build || []), ...(r.use || [])] });
    }
    const { data: early } = await sb.from('course_practice_phrases').select('seed_number,lego_index,known_text').eq('course_code', course).lte('seed_number', 10).in('phrase_role', ['build', 'use']);
    const { data: el } = await sb.from('course_legos').select('seed_number,lego_index,known_text').eq('course_code', course).lte('seed_number', 10);
    const by = new Map(); for (const p of early || []) { const k = `${p.seed_number}:${p.lego_index}`; (by.get(k) || by.set(k, []).get(k)).push({ known: p.known_text }); }
    for (const l of el || []) { const ph = by.get(`${l.seed_number}:${l.lego_index}`); if (ph) baskets.push({ seed: l.seed_number, legoKnown: l.known_text, phrases: ph }); }
    return (views[course] = baskets);
  }
  const queue = items.filter((x) => !fs.existsSync(path.join(out, x.course, `${x.key}.json`)));
  console.log(`${items.length} sampled, ${queue.length} to run, concurrency ${conc}`);
  fs.mkdirSync(out, { recursive: true });
  let n = 0, exhausted = null;
  async function worker() {
    for (;;) {
      const x = queue.shift(); if (!x || exhausted) return;
      const t0 = Date.now();
      try {
        const all = await viewFor(x.course);
        const stemShares = windowedStemShares(all.filter((b) => b.seed < x.seed), x.seed);
        const res = await generateLegoPhrases(sb, x.course, x.seed, x.lego_index, { timeout: 900000, stemShares });
        fs.mkdirSync(path.join(out, x.course), { recursive: true });
        fs.writeFileSync(path.join(out, x.course, `${x.key}.json`), JSON.stringify({ ...res, sampleBand: x.band }, null, 2));
        console.log(`[${++n}/${items.length}] ${x.course} ${x.key} ${res.blocked ? 'BLOCKED ' + (res.gate?.failingGates || []) : 'ok'} ${res.build.length}B/${res.use.length}U attempts=${res.attempts?.length} ${Math.round((Date.now() - t0) / 1000)}s`);
      } catch (e) {
        fs.appendFileSync(path.join(out, 'errors.jsonl'), JSON.stringify({ key: x.key, course: x.course, error: e.message }) + '\n');
        console.log(`[${++n}] ${x.course} ${x.key} ERROR ${e.message.slice(0, 300)}`);
        if (isPool(e.message)) { exhausted = e.message; console.log('POOL EXHAUSTED — stopping'); return; }
      }
    }
  }
  await Promise.all(Array.from({ length: conc }, worker));
  console.log('done'); if (exhausted) process.exitCode = 3;
}
main().catch((e) => { console.error(e); process.exit(1); });
