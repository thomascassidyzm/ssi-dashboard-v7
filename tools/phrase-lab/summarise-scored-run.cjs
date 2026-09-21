#!/usr/bin/env node
/**
 * FOLD A SCORED v3 RUN INTO THE COMPARISON THAT ANSWERS THE QUESTION.
 *
 * `run-course-v3-scored.sh` leaves one qa-report JSON per seed, each holding a
 * LIVE row and a CANDIDATE row for every basket. That is evidence, not an
 * answer: nobody can read 60 files and say whether v3 beat the live course.
 * This folds them into one markdown table — per-axis means, pass counts, the
 * baskets where LIVE WINS (the list a worker in a hurry drops, and the most
 * valuable one), the gate's BLOCKED and errored counts from the run log, and
 * the layer-2 inherited-ambiguity rate, which is a fact about the COURSE's own
 * mapping table and is never charged to the generator.
 *
 * Course-agnostic on purpose: the scores directory is the only required input.
 *
 *   node tools/phrase-lab/summarise-scored-run.cjs <run-dir> [--min-seed 11]
 *
 * --min-seed EXCLUDES EARLY SEEDS FROM THE HEADLINE (Tom, 2026-09-20: v3 exists
 * for late-course stem laziness; seeds 1-10 are out of scope for both the stats
 * and any regeneration). They are still counted and reported separately, never
 * silently dropped.
 *
 * Reads the filesystem only. Writes nothing anywhere but stdout.
 */
const fs = require('fs');
const path = require('path');

const AXES = ['frame', 'pos', 'neigh', 'junct', 'split'];
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i === -1 ? d : process.argv[i + 1]; };
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const f3 = (x) => (Number.isFinite(x) ? x.toFixed(3) : '—');

// A scored row IS a measurement; an error stub is the ABSENCE of one.
const isMeasurement = (row) => Boolean(row && row.lego_id);

function loadRows(scoresDir) {
  const rows = [];
  const stubs = [];
  for (const f of fs.readdirSync(scoresDir).filter((f) => f.endsWith('.json')).sort()) {
    const j = JSON.parse(fs.readFileSync(path.join(scoresDir, f), 'utf8'));
    // qa-report writes an ERROR STUB row — {seed, error} with no lego_id — when
    // its own database read fails. A transient Supabase schema-cache outage on
    // 2026-09-21 stubbed 25 previously-good seed files this way. A stub is the
    // absence of a measurement, never a basket: drop it here and count it, so a
    // scoring outage can never be read as content that scored badly.
    for (const r of j.rows || []) (isMeasurement(r) ? rows : stubs).push({ ...r, file: f });
  }
  if (stubs.length) {
    console.error(`note: ${stubs.length} seed score file(s) are ERROR STUBS from a failed scorer read `
      + `(${[...new Set(stubs.map((s2) => s2.file))].slice(0, 3).join(', ')}…) — excluded; re-score those seeds.`);
  }
  rows.stubs = stubs;
  return rows;
}

// One basket = one lego_id with (ideally) both a live and a candidate row.
function pair(rows) {
  const by = new Map();
  for (const r of rows) {
    const k = r.lego_id;
    if (!by.has(k)) by.set(k, { lego_id: k, seed: r.seed, lego: r.lego, live: null, candidate: null });
    by.get(k)[r.source] = r;
  }
  return [...by.values()].sort((a, b) => a.lego_id.localeCompare(b.lego_id));
}

function block(title, pairs) {
  const live = pairs.map((p) => p.live).filter(Boolean);
  const cand = pairs.map((p) => p.candidate).filter(Boolean);
  const out = [];
  out.push(`### ${title} — ${pairs.length} baskets`, '');
  out.push('| set | baskets | pass | fail | mean composite | ' + AXES.join(' | ') + ' |');
  out.push('|---|---|---|---|---|' + AXES.map(() => '---').join('|') + '|');
  for (const [name, set] of [['LIVE', live], ['CANDIDATE (v3)', cand]]) {
    if (!set.length) continue;
    // A basket the instrument could not score at all (no phrases, or a reason
    // given) carries a null composite. Averaging it in yields NaN and blanks
    // the cell; count it and say so instead of losing the whole column.
    const scored = set.map((r) => r.composite).filter(Number.isFinite);
    const unscored = set.length - scored.length;
    out.push(`| ${name} | ${set.length}${unscored ? ` (${unscored} unscorable)` : ''} | ${set.filter((r) => r.pass).length} | ${set.filter((r) => !r.pass).length} | `
      + `**${f3(mean(scored))}** | `
      + AXES.map((a) => f3(mean(set.map((r) => r.axes?.[a]).filter(Number.isFinite)))).join(' | ') + ' |');
  }
  out.push('');
  // Same guard as the means above: an unscorable basket has no delta to take.
  const both = pairs.filter((p) => p.live && p.candidate
    && Number.isFinite(p.live.composite) && Number.isFinite(p.candidate.composite));
  const delta = both.map((p) => ({ ...p, d: p.candidate.composite - p.live.composite }));
  const wins = delta.filter((p) => p.d > 0).length;
  const liveWins = delta.filter((p) => p.d < 0).sort((a, b) => a.d - b.d);
  out.push(`Head to head on the ${both.length} baskets scored both ways: **v3 ahead on ${wins}**, `
    + `live ahead on ${liveWins.length}, level on ${both.length - wins - liveWins.length}. `
    + `Mean per-basket delta **${f3(mean(delta.map((p) => p.d)))}**.`, '');
  if (liveWins.length) {
    out.push('**Baskets where the LIVE content is better** — the list that matters most:', '');
    out.push('| basket | lego | live | v3 | delta | v3 floors failed |');
    out.push('|---|---|---|---|---|---|');
    for (const p of liveWins) {
      out.push(`| ${p.lego_id} | ${p.lego} | ${f3(p.live.composite)} | ${f3(p.candidate.composite)} | ${f3(p.d)} | `
        + `${(p.candidate.floor_failures || []).join(', ') || '—'} |`);
    }
    out.push('');
  }
  const bigWins = delta.filter((p) => p.d > 0).sort((a, b) => b.d - a.d).slice(0, 10);
  if (bigWins.length) {
    out.push('**Baskets where v3 is clearest** (top 10 by delta):', '');
    out.push('| basket | lego | live | v3 | delta | live floors failed |');
    out.push('|---|---|---|---|---|---|');
    for (const p of bigWins) {
      out.push(`| ${p.lego_id} | ${p.lego} | ${f3(p.live.composite)} | ${f3(p.candidate.composite)} | +${f3(p.d)} | `
        + `${(p.live.floor_failures || []).join(', ') || '—'} |`);
    }
    out.push('');
  }
  return out.join('\n');
}

// A POOL EXHAUSTION is not a generator finding — see splitErrors' callers.
const POOL_WINDOW = /session limit|rate.?limit|usage limit|429/i;
function splitErrors(errored) {
  return {
    exhausted: errored.filter((l) => POOL_WINDOW.test(String(l.error))),
    realErrors: errored.filter((l) => !POOL_WINDOW.test(String(l.error))),
  };
}

function runLogSummary(runDir) {
  const p = path.join(runDir, 'candidates', 'run-log.jsonl');
  if (!fs.existsSync(p)) return '_no run log found_';
  const lines = fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const errored = lines.filter((l) => !l.ok);
  const blocked = lines.filter((l) => l.ok && l.blocked);
  // A POOL EXHAUSTION is not a generator finding. The CLI returning "you've hit
  // your session limit" says the account ran out of window, and counting those
  // beside unparseable-output errors would report the pool's state as though it
  // were the prompt's quality. Split them; the basket is simply not yet done and
  // the run resumes onto it.
  const { exhausted, realErrors } = splitErrors(errored);
  const out = [`${lines.length} baskets attempted — ${lines.filter((l) => l.ok && !l.blocked).length} generated clean, `
    + `**${blocked.length} BLOCKED by the gate**, **${realErrors.length} errored** on unparseable model output or a thrown call`
    + (exhausted.length ? `, and **${exhausted.length} did not run at all because the account hit its pool window** `
      + `(not a generator finding; those baskets are simply still to do and the run resumes onto them).` : '.'), ''];
  if (blocked.length) {
    out.push('| blocked basket | seed | failing gates | declaration floors |', '|---|---|---|---|');
    for (const b of blocked) out.push(`| ${b.lego_id} | ${b.seed} | ${(b.failingGates || []).join(', ') || '—'} | ${(b.declarationFloors || []).join(', ') || '—'} |`);
    out.push('');
  }
  if (realErrors.length) {
    out.push('| errored basket | seed | error |', '|---|---|---|');
    for (const e of realErrors) out.push(`| ${e.lego_id} | ${e.seed} | ${String(e.error).slice(0, 120)} |`);
    out.push('');
  }
  if (exhausted.length) {
    const seeds = [...new Set(exhausted.map((e) => e.seed))].sort((a, b) => a - b);
    out.push(`Pool-window casualties touched seeds ${seeds[0]}-${seeds[seeds.length - 1]} (${exhausted.length} baskets).`, '');
  }
  const times = lines.filter((l) => l.elapsedMs).map((l) => l.elapsedMs / 1000);
  if (times.length) out.push(`Median basket ${Math.round(times.sort((a, b) => a - b)[Math.floor(times.length / 2)])}s.`, '');
  return out.join('\n');
}

// Layer-2 inherited ambiguity: counted, named, NEVER charged to the phrase.
function zutDebt(runDir) {
  const cand = path.join(runDir, 'candidates');
  if (!fs.existsSync(cand)) return '_no candidates directory_';
  let phrases = 0, amb = 0, hits = 0, baskets = 0, ambBaskets = 0;
  for (const d of fs.readdirSync(cand).filter((d) => d.startsWith('seed-'))) {
    for (const f of fs.readdirSync(path.join(cand, d)).filter((f) => f.endsWith('.json'))) {
      const j = JSON.parse(fs.readFileSync(path.join(cand, d, f), 'utf8'));
      const parts = [j.score?.build, j.score?.use].filter(Boolean);
      if (!parts.length) continue;
      baskets += 1;
      let a = 0;
      for (const p of parts) {
        phrases += p.phrases || 0;
        a += p.inheritedAmbiguityPhrases || 0;
        hits += p.inheritedAmbiguityHits || 0;
      }
      amb += a;
      if (a) ambBaskets += 1;
    }
  }
  return `Across ${baskets} generated baskets (${phrases} phrases): **${amb} phrases (${phrases ? ((amb / phrases) * 100).toFixed(1) : '0'}%) `
    + `carry layer-2 inherited ambiguity**, ${hits} hits, in ${ambBaskets} baskets. `
    + `That is ambiguity the course's OWN known→target mapping already had; layer 1 (this builder's own ZUT failures) is what gates, and it is in the BLOCKED table above.`;
}

function claimHonesty(rows) {
  const cand = rows.filter((r) => r.source === 'candidate' && r.claim_honesty?.checked);
  const checked = cand.reduce((n, r) => n + r.claim_honesty.checked, 0);
  const wrong = cand.reduce((n, r) => n + r.claim_honesty.wrong, 0);
  return `**${wrong} of ${checked} frame tags** the model claimed do not match what the matchers fire `
    + `(${checked ? ((wrong / checked) * 100).toFixed(0) : 0}%), across ${cand.length} candidate baskets. `
    + `Reported, never gated — it changes no score above.`;
}

function main() {
  const runDir = process.argv[2];
  if (!runDir) { console.error('usage: summarise-scored-run.cjs <run-dir> [--min-seed N]'); process.exit(2); }
  const minSeed = +arg('--min-seed', 0);
  const rows = loadRows(path.join(runDir, 'scores'));
  const pairs = pair(rows);
  const seeds = [...new Set(pairs.map((p) => p.seed))].sort((a, b) => a - b);
  console.log(`## Scored range\n`);
  console.log(`Seeds ${seeds[0]}-${seeds[seeds.length - 1]} (${seeds.length} seeds, ${pairs.length} baskets scored). Run directory \`${runDir}\`.\n`);
  console.log('## Generation outcome\n');
  console.log(runLogSummary(runDir) + '\n');
  console.log('## Candidate versus live\n');
  if (minSeed > 1) {
    console.log(block(`Headline — seeds ${minSeed}+`, pairs.filter((p) => p.seed >= minSeed)));
    console.log(block(`Early seeds 1-${minSeed - 1}, reported separately and excluded from the headline`, pairs.filter((p) => p.seed < minSeed)));
  } else {
    console.log(block('All scored baskets', pairs));
  }
  console.log('## Layer-2 ZUT debt — a fact about the course, not the generator\n');
  console.log(zutDebt(runDir) + '\n');
  console.log('## Claim honesty\n');
  console.log(claimHonesty(rows) + '\n');
}

if (require.main === module) main();
module.exports = { splitErrors, isMeasurement };
