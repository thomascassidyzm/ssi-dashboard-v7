#!/usr/bin/env node
/**
 * FOLD A DIRECTORY OF qa-report SCORES INTO THE ONE TABLE THE DECISION NEEDS:
 * v3 CANDIDATE against the LIVE basket it would replace, per axis, per basket.
 *
 * A pile of per-seed JSON answers nothing on its own — the question is whether
 * the v3 prompt beats what learners hear today, and that is a PAIRED question:
 * every candidate is compared with the live basket for its own lego_id, never
 * with a course-wide average. Baskets with only one side present are counted
 * and named rather than silently dropped, because an unpaired basket is a fact
 * about the run (blocked, or not yet generated), not a missing number.
 *
 * It also names the baskets where LIVE WINS. That list is the one a hurried
 * reader drops and the one a promotion decision actually turns on.
 *
 *   node tools/phrase-lab/summarise-scores.cjs <scores-dir> [--min-seed 11]
 *     [--run-log <candidates/run-log.jsonl>] [--md <out.md>]
 *
 * --min-seed exists because seeds 1-10 are excluded from v3 statistics and
 * regeneration (Tom, 2026-09-20: v3 is aimed at late-course stem laziness, and
 * the opening seeds have too little inventory for the generator to work with).
 * They are still reported, separately, under their own heading.
 */
const fs = require('fs');
const path = require('path');

const AXES = ['frame', 'pos', 'neigh', 'junct', 'split'];
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i === -1 ? d : process.argv[i + 1]; };
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const f3 = (x) => (x === null ? '—' : x.toFixed(3));

function loadRows (dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).rows || []);
}

/** lego_id → { live, candidate } — the pairing is the whole point. */
function pair (rows) {
  const by = new Map();
  for (const r of rows) {
    if (!by.has(r.lego_id)) by.set(r.lego_id, { lego_id: r.lego_id, seed: r.seed, lego: r.lego });
    by.get(r.lego_id)[r.source] = r;
  }
  return [...by.values()].sort((a, b) => a.lego_id.localeCompare(b.lego_id));
}

function block (pairs) {
  const both = pairs.filter((p) => p.live && p.candidate);
  const stat = (side) => ({
    n: both.length,
    pass: both.filter((p) => p[side].pass).length,
    composite: mean(both.map((p) => p[side].composite)),
    axes: Object.fromEntries(AXES.map((a) => [a, mean(both.map((p) => p[side].axes[a]))])),
  });
  return {
    both,
    candidateOnly: pairs.filter((p) => p.candidate && !p.live),
    liveOnly: pairs.filter((p) => p.live && !p.candidate),
    live: stat('live'),
    candidate: stat('candidate'),
    candidateWins: both.filter((p) => p.candidate.composite > p.live.composite + 0.02),
    liveWins: both.filter((p) => p.live.composite > p.candidate.composite + 0.02),
  };
}

function render (title, b) {
  if (!b.both.length) return `### ${title}\n\nNo paired baskets.\n`;
  const row = (label, s) => `| ${label} | ${s.pass}/${s.n} | ${f3(s.composite)} | ${AXES.map((a) => f3(s.axes[a])).join(' | ')} |`;
  const list = (ps) => (ps.length
    ? ps.map((p) => `- \`${p.lego_id}\` ${p.lego} — candidate ${f3(p.candidate.composite)} vs live ${f3(p.live.composite)}`).join('\n')
    : '- none');
  return [
    `### ${title}`,
    '',
    `| source | pass | composite | ${AXES.join(' | ')} |`,
    `|---|---|---|${AXES.map(() => '---').join('|')}|`,
    row('LIVE', b.live),
    row('CANDIDATE (v3)', b.candidate),
    '',
    `**v3 clearly ahead (${b.candidateWins.length}/${b.both.length})**`,
    list(b.candidateWins),
    '',
    `**LIVE clearly ahead (${b.liveWins.length}/${b.both.length})**`,
    list(b.liveWins),
    '',
  ].join('\n');
}

function runLogSummary (file) {
  if (!file || !fs.existsSync(file)) return '';
  const rows = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const blocked = rows.filter((r) => r.blocked);
  const errored = rows.filter((r) => r.error || (r.ok === false && !r.blocked));
  const gates = {};
  for (const r of blocked) for (const g of r.failingGates || []) gates[g] = (gates[g] || 0) + 1;
  return [
    '### Generation outcomes',
    '',
    `- attempted: ${rows.length}`,
    `- BLOCKED by the gate: ${blocked.length}${blocked.length ? ` (${blocked.map((r) => r.lego_id).join(', ')})` : ''}`,
    `- errored / unparseable: ${errored.length}`,
    Object.keys(gates).length ? `- failing gates among blocked: ${Object.entries(gates).map(([g, n]) => `${g}×${n}`).join(', ')}` : '',
    '',
  ].filter(Boolean).join('\n');
}

const dir = process.argv[2];
if (!dir) { console.error('usage: summarise-scores.cjs <scores-dir> [--min-seed 11] [--run-log f] [--md out.md]'); process.exit(2); }
const minSeed = +arg('--min-seed', 11);
const all = pair(loadRows(dir));
const out = [
  `# v3 candidates vs live — ${path.resolve(dir)}`,
  '',
  `Paired by lego_id. Generated ${new Date().toISOString()}.`,
  '',
  render(`In scope: seeds ${minSeed}+`, block(all.filter((p) => p.seed >= minSeed))),
  render(`Excluded from stats: seeds 1-${minSeed - 1} (reported, not counted)`, block(all.filter((p) => p.seed < minSeed))),
  runLogSummary(arg('--run-log')),
].join('\n');
const md = arg('--md');
if (md) { fs.writeFileSync(md, out); console.error(`wrote ${md}`); }
console.log(out);
