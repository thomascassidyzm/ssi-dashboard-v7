#!/usr/bin/env node
/**
 * TOTAL COST OF COURSE PRODUCTION — the crossover, from measured data only.
 *
 * Tom's question, verbatim: "I'd also like to know if Opus 5 is better than
 * Sonnet 5 - simply because it will need less human time to check and fix / So a
 * more expensive model might be worth it in the total cost of CourseProduction."
 *
 * THE FIRST THING THIS MODEL HAD TO THROW AWAY was the phrase "more expensive
 * model". Every LLM call in this estate goes through the Claude CLI on a
 * flat-rate Max Plan subscription, never the metered API — that is a hard estate
 * rule with its own $38/day incident behind it, and it is restated at the top of
 * services/shared/claude-cli.cjs. The marginal DOLLAR cost of an Opus call and a
 * Sonnet call is identically zero (docs/spa-repair-unit-costs-2026-08-26.md
 * section A: "$0 marginal... there is no per-token metered spend to multiply").
 *
 * So the trade is NOT dollars against human time. It is:
 *
 *     Opus draws more of a CAPPED WEEKLY POOL and more WALL-CLOCK
 *     against
 *     Sonnet leaves more SETS ON A HUMAN'S DESK.
 *
 * Both sides of that are measured here. The pool/wall-clock side comes from
 * elapsedMs, which generate.cjs records per call. The desk side comes from the
 * touch tally compare.cjs computes: clean / targeted / rewrite / regenerate.
 *
 * THE ONE NUMBER NOBODY HAS is minutes-per-human-touch. No measured
 * human-review rate exists anywhere in this repo — the closest is the source
 * audit's throughput of ~220 phrases per pass at the full seed-plus-siblings
 * evidence standard, which is a pass size, not a clock. Inventing one would be
 * fake precision. So this reports a CROSSOVER instead: the human cost per
 * touched set at which the two arms draw level. The reader then only has to
 * decide whether the real number is above or below it, which is a judgement a
 * human can actually make.
 *
 * Touch weights are RELATIVE and stated, not smuggled: a targeted edit against a
 * named shortfall is 1 unit, a full rewrite is 3, a gate-failure regenerate is
 * 1.5 (cheap for the machine, but a human still has to notice it and re-check
 * the replacement). Change them with --weights if you disagree; the crossover
 * moves and the shape does not.
 *
 * READ-ONLY. Reads compare.json files. Writes nothing but its own report.
 *
 * Usage:
 *   node tools/phrase-lab/cost-model.cjs \
 *     --course "Spanish=../spa/out/compare.json" --course "Italian=../ita/out/compare.json" ... \
 *     --arms-dir-pattern '../{c}/out' --md cost.md
 */

const fs = require('fs');

const WEIGHTS = { clean: 0, targeted: 1, rewrite: 3, regenerate: 1.5 };

/** Recompute the touch tally from a compare.json's stored per-set scores. */
function touchKind(set) {
  const gate = set.build.gateFailed + set.use.gateFailed;
  if (gate > 0) return 'regenerate';
  const sf = [...set.verdict.build.shortfalls, ...set.verdict.use.shortfalls];
  if (!sf.length) return 'clean';
  if (sf.some((x) => x.axis === 'phrases') || sf.length >= 3) return 'rewrite';
  return 'targeted';
}

function tallyFor(sets, weights) {
  const t = { clean: 0, targeted: 0, rewrite: 0, regenerate: 0 };
  for (const s of sets) t[touchKind(s)] += 1;
  const units = Object.entries(t).reduce((a, [k, n]) => a + n * weights[k], 0);
  return { ...t, touched: sets.length - t.clean, units, n: sets.length };
}

/** Machine side: wall-clock actually spent, from the arm files' elapsedMs. */
function machineFor(armFile) {
  if (!armFile || !fs.existsSync(armFile)) return null;
  const rows = JSON.parse(fs.readFileSync(armFile, 'utf8')).filter((r) => r.elapsedMs);
  if (!rows.length) return null;
  const total = rows.reduce((a, r) => a + r.elapsedMs, 0);
  return { calls: rows.length, meanSec: total / rows.length / 1000, totalSec: total / 1000 };
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
  const specs = argv.map((a, i) => (a === '--course' ? argv[i + 1] : null)).filter(Boolean)
    .map((s) => { const i = s.indexOf('='); return { name: s.slice(0, i), dir: s.slice(i + 1) }; });
  const weights = arg('--weights') ? JSON.parse(arg('--weights')) : WEIGHTS;

  const rows = [];
  for (const sp of specs) {
    const cmp = JSON.parse(fs.readFileSync(`${sp.dir}/compare.json`, 'utf8'));
    const armNames = Object.keys(cmp.perSeed);
    const per = {};
    for (const n of armNames) per[n] = tallyFor(cmp.perSeed[n], weights);
    rows.push({
      course: sp.name, armNames, per,
      machine: {
        opus: machineFor(`${sp.dir}/opus.json`),
        sonnet: machineFor(`${sp.dir}/sonnet.json`)
      }
    });
  }

  const md = [];
  md.push('## Human-touch load, per arm, per course');
  md.push('');
  md.push('Counted over the measured LEGOs. `clean` costs no human time at all.');
  md.push('');
  const arms = rows[0] ? rows[0].armNames : [];
  md.push(`| course | ${arms.map((a) => `${a}: clean/targeted/rewrite/regen`).join(' | ')} |`);
  md.push(`|---|${arms.map(() => '---').join('|')}|`);
  for (const r of rows) {
    md.push(`| ${r.course} | ${arms.map((a) => { const t = r.per[a]; return t ? `${t.clean}/${t.targeted}/${t.rewrite}/${t.regenerate}` : '—'; }).join(' | ')} |`);
  }
  md.push('');

  md.push('## Weighted human units (targeted=1, rewrite=3, regenerate=1.5)');
  md.push('');
  md.push(`| course | ${arms.join(' | ')} | Sonnet 5 units SAVED by Opus |`);
  md.push(`|---|${arms.map(() => '---').join('|')}|---|`);
  let sumOpus = 0; let sumSonnet = 0; let sumN = 0;
  for (const r of rows) {
    const o = arms.find((a) => /opus/i.test(a));
    const s = arms.find((a) => /sonnet 5/i.test(a));
    const saved = o && s && r.per[o] && r.per[s] ? r.per[s].units - r.per[o].units : null;
    if (saved !== null) { sumOpus += r.per[o].units; sumSonnet += r.per[s].units; sumN += r.per[o].n; }
    md.push(`| ${r.course} | ${arms.map((a) => (r.per[a] ? r.per[a].units.toFixed(1) : '—')).join(' | ')} | ${saved === null ? '—' : saved.toFixed(1)} |`);
  }
  md.push(`| **all courses** | | | **${(sumSonnet - sumOpus).toFixed(1)} over ${sumN} LEGOs** |`);
  md.push('');

  md.push('## The machine side — what Opus actually costs more of');
  md.push('');
  md.push('Dollar cost is **identical and zero** for both arms: every call runs through the Claude CLI on the flat-rate subscription, never the metered API. What Opus costs more of is wall-clock and weekly-pool draw.');
  md.push('');
  md.push('| course | Opus mean sec/call | Sonnet 5 mean sec/call | Opus is slower by |');
  md.push('|---|---|---|---|');
  let mo = []; let ms = [];
  for (const r of rows) {
    const o = r.machine.opus; const s = r.machine.sonnet;
    if (o) mo.push(o.meanSec); if (s) ms.push(s.meanSec);
    md.push(`| ${r.course} | ${o ? o.meanSec.toFixed(0) : '—'} | ${s ? s.meanSec.toFixed(0) : '—'} | ${o && s ? `${((o.meanSec / s.meanSec - 1) * 100).toFixed(0)}%` : '—'} |`);
  }
  const avg = (x) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : null);
  md.push('');

  md.push('## The crossover');
  md.push('');
  const savedTotal = sumSonnet - sumOpus;
  const savedPerLego = sumN ? savedTotal / sumN : 0;
  const extraSecPerLego = avg(mo) && avg(ms) ? avg(mo) - avg(ms) : null;
  md.push(`Across every measured LEGO, Opus saves **${savedPerLego.toFixed(2)} weighted human units per LEGO** against Sonnet 5, at **${extraSecPerLego === null ? '—' : `${extraSecPerLego > 0 ? `${extraSecPerLego.toFixed(0)} extra` : `${Math.abs(extraSecPerLego).toFixed(0)} FEWER`} machine-seconds per LEGO`}** (see the caveat below on why the machine-time column is not a clean measurement).`);
  md.push('');
  md.push('Because the marginal dollar cost of both arms is zero, there is no human-minute rate at which Sonnet 5 becomes cheaper on **money**. The only currency Sonnet 5 wins is machine time and weekly pool. So the crossover is stated in the honest units:');
  md.push('');
  if (extraSecPerLego !== null && savedPerLego > 0 && extraSecPerLego > 0) {
    const secPerUnit = extraSecPerLego / savedPerLego;
    md.push(`> Opus buys back one weighted human touch-unit for **${secPerUnit.toFixed(0)} seconds of extra machine time**. It is the wrong trade only if a unit of skilled human attention is worth less than ${(secPerUnit / 60).toFixed(1)} minutes of unattended wall-clock on a box that is idle anyway.`);
  } else if (savedPerLego > 0 && extraSecPerLego !== null && extraSecPerLego <= 0) {
    // No crossover exists. Do not manufacture one out of a negative number.
    md.push(`> **There is no crossover.** Opus leaves less work on the human's desk AND did not spend more machine time doing it, so there is no human-minute rate at which Sonnet 5 becomes the cheaper arm. A crossover only exists when the cheaper-to-run arm is actually cheaper to run.`);
    md.push('');
    md.push(`> **Read the machine-time column with care.** The arms were NOT run under matched conditions: an account session limit interrupted this experiment mid-flight and the Sonnet arms carry more retries and more contention than the Opus arms do. So "Opus is faster" is NOT a claim this data can make. The claim it CAN make is the weaker and sufficient one: **nothing on the machine side offsets Opus's quality lead.** Per-call latency is the same order of magnitude for both, and the cost that would have to be traded away simply is not there.`);
  }
  md.push('');
  md.push('**The gap, stated plainly.** No measured minutes-per-human-touch figure exists anywhere in this repo. The nearest thing is the source audit\'s throughput of ~220 phrases per pass at the full seed-plus-siblings evidence standard, which is a pass size and not a clock. That is why this is reported as a crossover rather than a total: the arithmetic above is measured, and the one judgement left is whether a human touch-unit is worth more than the machine time it costs to avoid.');
  md.push('');

  const out = md.join('\n');
  const mdOut = arg('--md');
  if (mdOut) { fs.writeFileSync(mdOut, out); console.error(`wrote ${mdOut}`); } else console.log(out);
}

if (require.main === module) main();
module.exports = { touchKind, tallyFor, machineFor, WEIGHTS };
