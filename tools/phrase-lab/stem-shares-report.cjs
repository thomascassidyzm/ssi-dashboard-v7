#!/usr/bin/env node
/**
 * THE CROSS-BASKET COLLAPSE, MEASURED — the two numbers Tom's GO set as the
 * pass mark for (b)+(d) (audit #423, 2026-09-27):
 *   - no English stem in more than ~25% of baskets;
 *   - fewer than 15% of baskets dominated by one collocate (one word hugging
 *     the LEGO in at least half the basket's phrases).
 * Plus the two defects the audit's cheap gates close: questions missing "?" and
 * a lower-case "i". Same units as the gate (tools/phrase-gate/stem-diversity.cjs).
 *
 * Arms: v3 candidates in a seed range, and the LIVE baskets for the same LEGOs.
 * READ-ONLY.
 *
 *   node tools/phrase-lab/stem-shares-report.cjs ita_for_eng --cands <dir> --from 381 --to 400 [--json out.json]
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { stemsOf, collocatesOf } = require('../phrase-gate/stem-diversity.cjs');
const { questionMarkViolations, lowerIViolations } = require('../phrase-gate/gate-check.cjs');

const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i === -1 ? d : process.argv[i + 1]; };

function measure(baskets) {
  const stemCount = new Map();
  let dominated = 0; let phrases = 0; let qm = 0; let li = 0;
  for (const b of baskets) {
    const seen = new Set();
    const coll = new Map();
    for (const p of b.phrases) {
      for (const s of stemsOf(p.known, b.legoKnown)) seen.add(s);
      for (const c of collocatesOf(p.known, b.legoKnown)) coll.set(c, (coll.get(c) || 0) + 1);
    }
    for (const s of seen) stemCount.set(s, (stemCount.get(s) || 0) + 1);
    if ([...coll.values()].some((k) => k >= b.phrases.length / 2)) dominated += 1;
    phrases += b.phrases.length;
    qm += questionMarkViolations(b.phrases).length;
    li += lowerIViolations(b.phrases).length;
  }
  const n = baskets.length || 1;
  const top = [...stemCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([s, k]) => ({ stem: s, share: Number((k / n).toFixed(2)) }));
  return { baskets: baskets.length, phrases, topStems: top, maxStemShare: top[0]?.share ?? 0,
    collocateDominatedShare: Number((dominated / n).toFixed(2)), questionsMissingMark: qm, lowerI: li };
}

async function main() {
  const course = process.argv[2];
  const cands = arg('--cands');
  const from = +arg('--from', 11); const to = +arg('--to', 9999);
  const v3 = [];
  for (const sd of fs.readdirSync(cands).filter((d) => /^seed-\d+$/.test(d))) {
    const n = Number(sd.slice(5)); if (n < from || n > to) continue;
    for (const f of fs.readdirSync(path.join(cands, sd)).filter((x) => x.endsWith('.json'))) {
      const r = JSON.parse(fs.readFileSync(path.join(cands, sd, f), 'utf8'));
      v3.push({ seed: r.seedNumber, lego: r.legoIndex, legoKnown: r.legoKnown, phrases: [...(r.build || []), ...(r.use || [])] });
    }
  }
  const { supabase } = require('../../services/supabase-client.cjs');
  const live = [];
  for (const b of v3) {
    const { data } = await supabase.from('course_practice_phrases').select('known_text,target_text,phrase_role')
      .eq('course_code', course).eq('seed_number', b.seed).eq('lego_index', b.lego).in('phrase_role', ['build', 'use']);
    if (data && data.length) live.push({ legoKnown: b.legoKnown, phrases: data.map((p) => ({ known: p.known_text, target: p.target_text })) });
  }
  const out = { course, from, to, v3: measure(v3), live: measure(live) };
  const fmt = (m) => `${m.baskets} baskets · top stem ${m.topStems.slice(0, 4).map((t) => `"${t.stem}" ${Math.round(t.share * 100)}%`).join(', ')} · one-collocate baskets ${Math.round(m.collocateDominatedShare * 100)}% · questions missing "?" ${m.questionsMissingMark} · lower-case i ${m.lowerI}`;
  console.log(`${course} seeds ${from}-${to}\n  v3   ${fmt(out.v3)}\n  live ${fmt(out.live)}`);
  if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify(out, null, 2));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { measure };
