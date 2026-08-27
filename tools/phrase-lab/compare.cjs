#!/usr/bin/env node
/**
 * Adjudicate the arms of the phrase-prompt comparison and emit the table.
 *
 * ARM 1 — LIVE: what is already in the database, which is the Sonnet 4.5
 *   baseline. It is read, not generated, so nothing is spent on it.
 * ARM 2+ — generated sets from tools/phrase-lab/generate.cjs, one file per model.
 *
 * BLIND WHERE IT CAN BE ARRANGED: every set is scored by identical code against
 * an inventory built from the same (course, seed, lego), and the arm label is
 * attached only after the score exists. The scorer never sees which model wrote
 * what — `scoreSet` takes an inventory and a list of phrases and has no argument
 * that could carry the arm.
 *
 * ARMS WITH HOLES ARE NOT ARMS THAT SCORED BADLY. A target a model failed to
 * produce is reported as a generation failure in its own column and excluded
 * from the per-axis means, never averaged in as a zero.
 *
 * READ-ONLY.
 *
 * Usage:
 *   node tools/phrase-lab/compare.cjs --course spa_for_eng --targets targets.json \
 *     --arm "Sonnet 4.5 (live)=live" --arm "Opus 5=opus.json" --arm "Sonnet 5=sonnet.json" \
 *     --md report.md
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const { buildInventory } = require('./inventory.cjs');
const { scoreSet, fetchLivePhrases, FLOORS } = require('./score.cjs');

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const f2 = (x) => (x === null || x === undefined ? '—' : Number(x).toFixed(2));

const AXES = [
  ['gateFailed', 'layer-1 gate failures', 'lower'],
  ['inheritedAmbiguityPhrases', 'phrases inheriting course ambiguity', 'lower'],
  ['phrases', 'phrases written', 'higher'],
  ['edgeCombos', 'neighbour x pattern combos', 'higher'],
  ['distinctAdjacencies', 'distinct neighbours touched', 'higher'],
  ['positionSpread', 'positions reached (of 3)', 'higher'],
  ['fillingShare', 'share in the filling position', 'higher'],
  ['axesVaried', 'pattern axes varied (of 5)', 'higher'],
  ['distinctPatterns', 'distinct pattern signatures', 'higher'],
  ['recencyMass', 'recency mass', 'higher'],
  ['ascent', 'one-distinction ascent', 'higher'],
  ['newEdgesPerSyllable', 'new edges per syllable', 'higher'],
  ['useCompleteShare', 'USE phrases standing alone', 'higher']
];

async function scoreArm(supabase, courseCode, targets, source) {
  const sets = [];
  const failures = [];
  const bySeed = new Map();
  if (source !== 'live') {
    for (const r of JSON.parse(fs.readFileSync(source, 'utf8'))) bySeed.set(`${r.seedNumber}:${r.legoIndex}`, r);
  }
  for (const t of targets) {
    const key = `${t.seed}:${t.lego}`;
    let phrases;
    if (source === 'live') {
      phrases = await fetchLivePhrases(supabase, courseCode, t.seed, t.lego);
    } else {
      const r = bySeed.get(key);
      if (!r || r.error || !r.phrases?.length) {
        failures.push({ ...t, why: r?.error || 'no set produced' });
        continue;
      }
      phrases = r.phrases;
    }
    const inv = await buildInventory(supabase, courseCode, t.seed, t.lego);
    const s = scoreSet(inv, phrases);   // <- no arm label reaches the scorer
    sets.push(s);
  }
  return { sets, failures };
}

function aggregate(sets, role) {
  const out = {};
  for (const [axis] of AXES) {
    const vals = sets.map((s) => s[role][axis]).filter((v) => v !== null && v !== undefined);
    out[axis] = mean(vals);
  }
  out.floorPassRate = sets.length ? sets.filter((s) => s.verdict[role].pass).length / sets.length : null;
  const tally = {};
  for (const s of sets) for (const sf of s.verdict[role].shortfalls) tally[sf.axis] = (tally[sf.axis] || 0) + 1;
  out.shortfallTally = tally;
  return out;
}

function table(armNames, rows, role, agg) {
  const lines = [`| axis | ${armNames.join(' | ')} |`, `|---|${armNames.map(() => '---').join('|')}|`];
  for (const [axis, label] of AXES) {
    const cells = armNames.map((n) => f2(agg[n][role][axis]));
    if (cells.every((c) => c === '—')) continue;
    lines.push(`| ${label} | ${cells.join(' | ')} |`);
  }
  lines.push(`| **clears every floor** | ${armNames.map((n) => (agg[n][role].floorPassRate === null ? '—' : `${Math.round(agg[n][role].floorPassRate * 100)}%`)).join(' | ')} |`);
  return lines.join('\n');
}

async function main() {
  const argv = process.argv.slice(2);
  const arg = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
  const courseCode = arg('--course');
  const targets = JSON.parse(fs.readFileSync(arg('--targets'), 'utf8'));
  const mdOut = arg('--md');
  const armSpecs = argv.map((a, i) => (a === '--arm' ? argv[i + 1] : null)).filter(Boolean)
    .map((s) => { const i = s.indexOf('='); return { name: s.slice(0, i), source: s.slice(i + 1) }; });

  const { supabase } = require('../../services/supabase-client.cjs');
  if (!supabase) throw new Error('no Supabase client — SUPABASE_URL / SUPABASE_SERVICE_KEY missing from .env');

  const agg = {};
  const armNames = [];
  const perSeed = {};
  const holes = {};
  for (const a of armSpecs) {
    const { sets, failures } = await scoreArm(supabase, courseCode, targets, a.source);
    agg[a.name] = { build: aggregate(sets, 'build'), use: aggregate(sets, 'use'), n: sets.length };
    perSeed[a.name] = sets;
    holes[a.name] = failures;
    armNames.push(a.name);
  }

  const md = [];
  md.push(`# Phrase prompt v3 — three-arm comparison (${courseCode})`);
  md.push('');
  md.push(`${targets.length} real LEGOs, spread across the course. Every arm generated against the **identical** introduced-vocabulary state; every arm scored by identical code with no arm label reaching the scorer.`);
  md.push('');
  md.push('| arm | sets scored | generation failures |');
  md.push('|---|---|---|');
  for (const n of armNames) md.push(`| ${n} | ${agg[n].n} / ${targets.length} | ${holes[n].length} |`);
  md.push('');
  for (const role of ['build', 'use']) {
    md.push(`## ${role.toUpperCase()} phrases — per-LEGO means`);
    md.push('');
    md.push(table(armNames, perSeed, role, agg));
    md.push('');
    md.push(`Floors for ${role.toUpperCase()}: ${Object.entries(FLOORS[role]).map(([k, v]) => `${k} ≥ ${v}`).join(', ')}.`);
    md.push('');
    md.push('Where each arm falls short, counted over the LEGOs:');
    md.push('');
    md.push(`| shortfall axis | ${armNames.join(' | ')} |`);
    md.push(`|---|${armNames.map(() => '---').join('|')}|`);
    const axes = new Set(armNames.flatMap((n) => Object.keys(agg[n][role].shortfallTally)));
    for (const ax of axes) md.push(`| ${ax} | ${armNames.map((n) => agg[n][role].shortfallTally[ax] || 0).join(' | ')} |`);
    md.push('');
  }

  md.push('## Per-LEGO detail');
  md.push('');
  md.push(`| seed | LEGO | ${armNames.map((n) => `${n}: gate / pos / axes / combos`).join(' | ')} |`);
  md.push(`|---|---|${armNames.map(() => '---').join('|')}|`);
  for (const t of targets) {
    const cells = armNames.map((n) => {
      const s = perSeed[n].find((x) => x.seedNumber === t.seed && x.legoIndex === t.lego);
      if (!s) return '*(no set)*';
      const g = s.build.gateFailed + s.use.gateFailed;
      return `${g} / ${s.use.positionSpread || s.build.positionSpread} / ${s.use.axesVaried} / ${s.build.edgeCombos + s.use.edgeCombos}`;
    });
    const lab = perSeed[armNames[0]].find((x) => x.seedNumber === t.seed)?.lego;
    md.push(`| ${t.seed} | ${lab ? `"${lab.known}" → "${lab.target}"` : t.legoId || ''} | ${cells.join(' | ')} |`);
  }
  md.push('');

  const text = md.join('\n');
  if (mdOut) { fs.writeFileSync(mdOut, text); console.error(`wrote ${mdOut}`); }
  else console.log(text);
  if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify({ agg, perSeed, holes }, null, 2));
}

module.exports = { scoreArm, aggregate };

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
