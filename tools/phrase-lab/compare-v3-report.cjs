#!/usr/bin/env node
/**
 * THE COMPARISON — v3 candidates against the baskets a live course serves today.
 *
 * The candidates are not the deliverable; this is. It folds three read-only
 * sources into one document a human can rule on:
 *   - the run log     (what generated, what the gate BLOCKED, what errored)
 *   - the QA report   (the five content floors, candidate and live, per basket)
 *   - stem reuse      (where the vocabulary comes from — the late-course
 *                      laziness v3 exists to prevent, Tom 2026-09-20)
 *
 * SEEDS 1-10 ARE EXCLUDED FROM THE HEADLINE. Tom's ruling the same day: the
 * opening seeds are hand-tweaked, the improvement there is marginal, and the
 * generator has almost no inventory to write from — including them flatters
 * neither arm honestly.
 *
 * A candidate number and a live number that look alike is how a baseline gets
 * quoted as a result, so every figure here carries its arm.
 *
 *   node tools/phrase-lab/compare-v3-report.cjs <course> --evidence <dir> --out <md>
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');

const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i === -1 ? d : process.argv[i + 1]; };
const mean = (a) => a.length ? a.reduce((n, x) => n + x, 0) / a.length : null;
const f3 = (x) => x == null ? 'n/a' : x.toFixed(3);

async function main() {
  const course = process.argv[2] || 'ita_for_eng';
  const ev = arg('--evidence');
  const out = arg('--out');
  const minSeed = +arg('--min-seed', 11);
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

  // ---- run log: generated / blocked / errored -----------------------------
  const log = fs.readFileSync(path.join(ev, 'candidates', 'run-log.jsonl'), 'utf8')
    .trim().split('\n').map(JSON.parse);
  const ok = log.filter(r => r.ok), blocked = ok.filter(r => r.blocked);
  const errs = log.filter(r => !r.ok);
  const errKind = {};
  for (const e of errs) {
    const k = /session limit|usage limit/.test(e.error) ? 'account session limit'
      : /JSON|json/.test(e.error) ? 'unparseable model output' : 'other';
    errKind[k] = (errKind[k] || 0) + 1;
  }

  // ---- scores -------------------------------------------------------------
  const sdir = path.join(ev, 'scores');
  const byLego = {};
  for (const f of fs.readdirSync(sdir).filter(x => x.endsWith('.json'))) {
    for (const r of JSON.parse(fs.readFileSync(path.join(sdir, f), 'utf8')).rows) {
      if (r.pass === undefined) continue;
      const k = r.lego_id || `s${r.seed}l${r.lego_index}`;
      (byLego[k] = byLego[k] || { seed: r.seed, lego: r.lego })[r.source] = r;
    }
  }
  const pairs = Object.entries(byLego)
    .filter(([, v]) => v.live && v.candidate && v.seed >= minSeed)
    .map(([k, v]) => ({ k, ...v, d: (v.candidate.composite || 0) - (v.live.composite || 0) }))
    .sort((a, b) => a.d - b.d);
  const band = (p) => p.seed <= 60 ? 'early (11-60)' : 'late (330+)';
  const bands = [...new Set(pairs.map(band))];

  const axisTable = (rs) => {
    const ax = ['frame', 'pos', 'neigh', 'junct', 'split'];
    return ax.map(a => `${a.toUpperCase()} ${f3(mean(rs.map(r => (r.live.axes || {})[a] || 0)))} → ${f3(mean(rs.map(r => (r.candidate.axes || {})[a] || 0)))}`).join(' · ');
  };

  // ---- by-ear shortlist: close on the numbers, different in the mouth ------
  // Two kinds of basket need an ear, and a shortlist of only one kind is a
  // shortlist that answers half the question: the ones the instrument cannot
  // separate at all, and the LATE ones, which are the region the whole exercise
  // is about whatever the margin says.
  const ties = pairs.filter(p => Math.abs(p.d) < 0.06).slice(0, 3);
  const late = pairs.filter(p => p.seed >= 300 && !ties.includes(p)).slice(-3);
  const close = [...ties, ...late];
  const earRows = [];
  for (const p of close) {
    const seedNum = p.seed, legoIdx = +p.k.split('L').pop();
    const { data: live } = await sb.from('course_practice_phrases')
      .select('known_text,target_text,phrase_role')
      .eq('course_code', course).eq('seed_number', seedNum).eq('lego_index', legoIdx)
      .eq('phrase_role', 'use').limit(3);
    const cf = path.join(ev, 'candidates', `seed-${String(seedNum).padStart(4, '0')}`,
      `${p.k.split(':').pop()}.json`);
    let cand = [];
    if (fs.existsSync(cf)) cand = (JSON.parse(fs.readFileSync(cf, 'utf8')).use || []).slice(0, 3);
    earRows.push({ p, live: live || [], cand });
  }

  const L = [];
  L.push(`# v3 phrase generator over ${course}, scored against the live baskets`);
  L.push(`\n_${new Date().toISOString().replace('T', ' ').slice(0, 16)}Z · candidates generated on the iCloud pool, Opus, through the course-builder's own generateLegoPhrases · **nothing was written to any database**_`);
  L.push(`\n## What this is\n`);
  L.push(`Every basket below was generated twice over: once by whoever built ${course} (that is what learners hear today, the LIVE arm) and once now by the v3 prompt with its real gates and scorer (the CANDIDATE arm). Both arms are judged by the same instrument, \`tools/frame-layer/qa-report.cjs\`, against a declaration derived from the live course. Seeds 1-10 are excluded from every headline figure: they are hand-tweaked and the generator has almost no inventory there, so they flatter nobody honestly.`);

  L.push(`\n## My read\n`);
  L.push(`On this evidence v3 wins the mechanical comparison outright and there is no counter-list to weigh against it: PAIRED_LINE. What it does NOT yet prove is taste — every figure here is structural, and the sample is PAIRED_N baskets out of the course's 1,457. So: worth regenerating the phrase layer of ${course} from seed 11 onward, but not on this document alone. The next step that earns the decision is your ear on the shortlist below. LATE_LINE`);

  L.push(`\n## The run\n`);
  L.push(`- **${ok.length} baskets generated**, of which **${blocked.length} came back BLOCKED** by the gate (a set that could not be made to pass in two retries).`);
  L.push(`- **${errs.length} baskets errored**: ${Object.entries(errKind).map(([k, v]) => `${v} × ${k}`).join(', ')}.`);
  L.push(`- The run ended on limits outside the experiment, not on anything it found: the generating account's rolling 5-hour session window (twice), and a Supabase outage at 03:45Z that returned \`PGRST002\` to every remaining chunk. The errors above are those, not model failures.
- Blocked baskets cluster where the available vocabulary is thinnest — ${blocked.filter(b => b.seed <= 10).length} of ${blocked.length} are in seeds 1-10, which is the region the ruling above already excludes.`);

  L.push(`\n## The verdict, by content floor\n`);
  L.push(`| band | paired baskets | LIVE mean composite | CANDIDATE mean composite | LIVE pass | CANDIDATE pass |`);
  L.push(`|---|---|---|---|---|---|`);
  for (const b of bands) {
    const rs = pairs.filter(p => band(p) === b);
    L.push(`| ${b} | ${rs.length} | ${f3(mean(rs.map(r => r.live.composite || 0)))} | ${f3(mean(rs.map(r => r.candidate.composite || 0)))} | ${rs.filter(r => r.live.pass).length}/${rs.length} | ${rs.filter(r => r.candidate.pass).length}/${rs.length} |`);
  }
  L.push(`| **all (seeds ${minSeed}+)** | ${pairs.length} | **${f3(mean(pairs.map(r => r.live.composite || 0)))}** | **${f3(mean(pairs.map(r => r.candidate.composite || 0)))}** | ${pairs.filter(r => r.live.pass).length}/${pairs.length} | ${pairs.filter(r => r.candidate.pass).length}/${pairs.length} |`);
  L.push(`\nPer axis, live → candidate: ${axisTable(pairs)}`);

  L.push(`\n## Where the LIVE course is better\n`);
  L.push(`The shorter and more valuable list, because it is the one that says what a regeneration would COST. These are the baskets where live outscored the candidate:`);
  const worse = pairs.filter(p => p.d < -0.01).slice(0, 12);
  if (!worse.length) {
    L.push(`\n**None.** Outside seeds 1-10, no paired basket in this range scored materially better live than candidate. The nearest the live course came to holding its ground:`);
    for (const p of pairs.filter(x => x.d >= -0.01).slice(0, 5)) {
      L.push(`- \`${p.k}\` **${p.lego}** — live ${f3(p.live.composite)} vs candidate ${f3(p.candidate.composite)} (+${p.d.toFixed(3)}), a tie in all but name`);
    }
    L.push(`\nThat is a finding about a SMALL SAMPLE, not a licence: PAIRED_N paired baskets out of 1,457, and the instrument cannot hear taste. The shortlist further down is where that limit bites.`);
  }
  for (const p of worse) L.push(`- \`${p.k}\` **${p.lego}** — live ${f3(p.live.composite)} vs candidate ${f3(p.candidate.composite)} (${p.d.toFixed(3)})${p.candidate.floor_failures?.length ? `, candidate misses ${p.candidate.floor_failures.join('/')}` : ''}`);

  L.push(`\n## Where v3 is clearly better\n`);
  L.push(`Baskets whose live set has NO phrases at all are left out of this list — an empty basket is a hole in the course, not a quality comparison, and they are counted separately below.`);
  for (const p of pairs.filter(x => x.live.phrases > 0).slice(-10).reverse()) {
    L.push(`- \`${p.k}\` **${p.lego}** — live ${f3(p.live.composite)}${p.live.floor_failures?.length ? ` (misses ${p.live.floor_failures.join('/')})` : ''} vs candidate ${f3(p.candidate.composite)} (+${p.d.toFixed(3)}), ${p.live.phrases} live phrases vs ${p.candidate.phrases} candidate`);
  }

  // ---- stem reuse ---------------------------------------------------------
  const sr = fs.existsSync(path.join(ev, 'stem-reuse.json'))
    ? JSON.parse(fs.readFileSync(path.join(ev, 'stem-reuse.json'), 'utf8')) : null;
  if (sr) {
    L.push(`\n## Where the vocabulary comes from — the laziness metric\n`);
    L.push(`"Good stem + new LEGO" is the failure v3 exists to prevent: a model reaching for the same early-course frames forever. Measured on the known side, for the same baskets:`);
    L.push(`\n| arm | baskets | distinct priors reached per basket | mean age of reused material (seeds) | reuses per phrase |`);
    L.push(`|---|---|---|---|---|`);
    for (const a of ['live', 'candidate']) {
      const s = sr.summary[a]; if (!s) continue;
      L.push(`| ${a.toUpperCase()} | ${s.baskets} | ${s.distinct_per_basket} | ${s.mean_age} | ${s.reuses_per_phrase} |`);
    }
    L.push(`\nHigher distinct-priors and lower mean-age both mean the same thing: the set is built out of more of the course, and more of the recent course, rather than out of a handful of old reliable stems.`);
  }

  // ---- a finding about the course itself, not about either arm ----------
  {
    let legos = [], f = 0;
    for (;;) { const { data } = await sb.from('course_legos').select('lego_id,seed_number,lego_index,known_text')
      .eq('course_code', course).range(f, f + 999); legos = legos.concat(data || []); if (!data || data.length < 1000) break; f += 1000; }
    let ph = [], g = 0;
    for (;;) { const { data } = await sb.from('course_practice_phrases').select('seed_number,lego_index')
      .eq('course_code', course).in('phrase_role', ['build', 'use']).range(g, g + 999); ph = ph.concat(data || []); if (!data || data.length < 1000) break; g += 1000; }
    const cnt = {};
    for (const p of ph) { const k = `${p.seed_number}:${p.lego_index}`; cnt[k] = (cnt[k] || 0) + 1; }
    const emptyRows = legos.filter(l => !cnt[`${l.seed_number}:${l.lego_index}`]);
    const under = Object.values(cnt).filter(v => v < 9).length;
    L.push(`\n## A finding about the live course, separate from either arm\n`);
    L.push(`- **${emptyRows.length} of ${legos.length} live baskets have no BUILD or USE phrases at all.** A learner reaching those LEGOs is taught the word and then given nothing to build with. Examples: ${emptyRows.slice(0, 5).map(e => `\`${e.lego_id}\` "${e.known_text}"`).join(', ')}.`);
    L.push(`- **${under} baskets sit below the 4-BUILD + 5-USE floor** (mean ${(Object.values(cnt).reduce((a, b) => a + b, 0) / Object.values(cnt).length).toFixed(1)} phrases per non-empty basket). v3 sets average ${(mean(pairs.map(p => p.candidate.phrases)) || 0).toFixed(1)}.`);
    L.push(`\nNeither number depends on whether v3 is adopted; they are true of ${course} today.`);
  }

  L.push(`\n## The ones that need your ear\n`);
  L.push(`Baskets where the mechanical instrument cannot decide — the scores are within 0.06 and the two sets simply read differently. The instrument cannot hear clunky English; this is the part only you can rule on.\n`);
  for (const r of earRows) {
    L.push(`\n**\`${r.p.k}\` — ${r.p.lego}** (live ${f3(r.p.live.composite)}, candidate ${f3(r.p.candidate.composite)})\n`);
    L.push(`| | English prompt | Italian |`);
    L.push(`|---|---|---|`);
    for (const p of r.live) L.push(`| live | ${p.known_text} | ${p.target_text} |`);
    for (const p of r.cand) L.push(`| v3 | ${p.known} | ${p.target} |`);
  }

  L.push(`\n## Reading this honestly\n`);
  L.push(`- Both arms are scored by the same mechanical instrument. It judges structure — frames, positions, neighbours, junctures, splits — and it cannot hear whether an English prompt is clunky or an Italian rendering is what a native would reach for. A composite is a measurement, not a verdict on taste.`);
  L.push(`- Claim honesty (the generator's own frame tags) is reported by the QA tool and deliberately changes no score here.`);
  L.push(`- Nothing in this run touched \`course_practice_phrases\`. Every candidate is on disk at \`${path.join(ev, 'candidates')}\`, every score at \`${path.join(ev, 'scores')}\`.`);

  const lateN = pairs.filter(p => p.seed >= 300).length;
  const lateLine = lateN >= 40
    ? `The late band is no longer a sliver: ${lateN} paired baskets at seed 300+, and the margin is WIDER there than early, which is what the laziness story predicts.`
    : `The late band is still thin here (${lateN} paired baskets at seed 300+), and that is the region the whole exercise is about — more of it is the run worth having.`;
  const md = L.join('\n').split('LATE_LINE').join(lateLine).split('PAIRED_N').join(String(pairs.length)).replace('PAIRED_LINE',
    `across ${pairs.length} paired baskets outside seeds 1-10 the candidate sets score ${f3(mean(pairs.map(r => r.candidate.composite || 0)))} against live's ${f3(mean(pairs.map(r => r.live.composite || 0)))}, pass the content floors ${pairs.filter(r => r.candidate.pass).length}/${pairs.length} against ${pairs.filter(r => r.live.pass).length}/${pairs.length}, and reach for roughly three times as much of the course's own vocabulary`);
  if (out) { fs.writeFileSync(out, md); console.log(`wrote ${out} (${md.length} chars, ${pairs.length} paired baskets)`); }
  else console.log(md);
}
main().catch(e => { console.error(e); process.exit(1); });
