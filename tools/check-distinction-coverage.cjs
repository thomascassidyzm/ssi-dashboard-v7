#!/usr/bin/env node
/**
 * scan-course Check 19 — distinction coverage, as a runnable check.
 *
 *   node tools/check-distinction-coverage.cjs <course_code>
 *   node tools/check-distinction-coverage.cjs <course_code> --json
 *   node tools/check-distinction-coverage.cjs <course_code> --all-samples
 *
 * READ-ONLY, AND DELIBERATELY SO. It never writes to course content and never creates
 * a phrase. It PROPOSES; a human judges. (Kai's ruling, 2026-08-19: this belongs at
 * fix time, not generation time — "we should test it out properly as fixes before
 * thinking about changing the actual course generation." A rule at generation time
 * acts on everything silently before anyone can look at it.)
 *
 * WHAT IT LOOKS FOR, IN BOTH DIRECTIONS — see tools/distinctions/axes.cjs for why the
 * two directions have opposite remedies, and tools/distinctions/reach-test.cjs for the
 * gate every Direction A candidate has to pass before it is offered as a drill.
 *
 * Neither slot is English. The pair is the subject.
 *
 * READ THE BUCKETS, NOT THE COUNT. Every row carrying a marked form is classified into
 * exactly one bucket — proposal, not-a-drill, attested, conflict, or a NAMED rejection
 * — and the totals are printed. Nothing is silently dropped. A detector you have not
 * watched find a known-present case is not evidence, which is why the attested set is
 * printed rather than merely counted.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.psql'), quiet: true });
const { Client } = require('pg');
const { directionsFor, axisPairKeys, LANGUAGES } = require('./distinctions/axes.cjs');
const {
  detectA1, detectA2, detectB, detectB1,
} = require('./distinctions/detect.cjs');

async function query(sql, params = []) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    return (await c.query(sql, params)).rows;
  } finally {
    await c.end();
  }
}

function groupProposals(list) {
  const m = new Map();
  for (const c of list) {
    const k = `${c.known_text} ${c.target_text}`;
    if (!m.has(k)) m.set(k, { ...c, occurrences: 0, seeds: [] });
    const g = m.get(k);
    g.occurrences += 1;
    if (!g.seeds.includes(c.seed_number)) g.seeds.push(c.seed_number);
    g.seed_number = Math.min(g.seed_number, c.seed_number);
  }
  return [...m.values()].sort((a, b) => a.seed_number - b.seed_number);
}

async function run(courseCode) {
  const [course] = await query(
    'select course_code, known_lang, target_lang, display_name from courses where course_code = $1',
    [courseCode],
  );
  if (!course) throw new Error(`no such course: ${courseCode}`);
  const { known_lang: known, target_lang: target } = course;

  const rows = await query(
    `select seed_number, lego_index, phrase_role, known_text, target_text
       from course_practice_phrases
      where course_code = $1 and known_text is not null and target_text is not null`,
    [courseCode],
  );

  const directions = directionsFor(known, target);
  const dirA = directions.filter((d) => d.direction === 'A');
  const dirB = directions.find((d) => d.direction === 'B') || null;

  const out = {
    course: courseCode,
    known_lang: known,
    target_lang: target,
    known_configured: !!LANGUAGES[known],
    target_configured: !!LANGUAGES[target],
    rows: rows.length,
    directions: directions.map((d) => ({
      axis: d.axis, direction: d.direction, richerSide: d.richerSide, generative: d.generative,
    })),
    a1: [],
    a2: null,
    b: null,
  };

  // A1 — generative. Needs morphology on the richer (known) side.
  for (const d of dirA.filter((x) => x.generative && x.morphology)) {
    const { buckets, carrying } = detectA1(rows, d, known, target);
    const byRule = {};
    for (const r of buckets.rejected) byRule[r.rule] = (byRule[r.rule] || 0) + 1;
    const classified = Object.values(buckets).reduce((n, b) => n + b.length, 0);
    const proposals = groupProposals(buckets.proposal);
    const notADrill = groupProposals(buckets.notADrill);

    out.a1.push({
      axis: d.axis,
      label: d.morphology.label,
      carrying,
      classified,
      coverage: carrying ? +((100 * classified) / carrying).toFixed(2) : 100,
      counts: {
        proposals: proposals.length,
        proposal_rows: buckets.proposal.length,
        not_a_drill: notADrill.length,
        not_a_drill_rows: buckets.notADrill.length,
        attested: buckets.attested.length,
        conflict: buckets.conflict.length,
        unanchored: buckets.unanchored.length,
        rejected: buckets.rejected.length,
        rejected_by_rule: byRule,
      },
      proposals,
      not_a_drill: notADrill,
      attested: buckets.attested,
      conflict: buckets.conflict,
      rejected: buckets.rejected,
      unanchored: buckets.unanchored,
    });
  }

  // A2 — observational, configuration-free, runs on every pair on the estate.
  const pairsForKnown = dirA.length ? axisPairKeys(dirA[0].richerLang, dirA[0].axis) : new Set();
  const a2 = detectA2(rows, known, pairsForKnown);
  out.a2 = {
    healthy: a2.healthy.length,
    walls: a2.walls.length,
    walls_in_sentences: a2.walls.filter((w) => !w.fragment).length,
    walls_in_fragments: a2.walls.filter((w) => w.fragment).length,
    flagged: a2.flagged.length,
    // Sentence-level first: a one-word gloss collapse is a dictionary fact, while two
    // whole sentences sharing an answer is a teaching decision someone made.
    wall_samples: [...a2.walls.filter((w) => !w.fragment), ...a2.walls.filter((w) => w.fragment)],
    flagged_samples: a2.flagged,
    healthy_samples: a2.healthy.slice(0, 40),
  };

  // B1 — target richer, GENERATIVE. Needs morphology on the target side. This is the
  // half a collision detector structurally cannot see.
  out.b1 = [];
  for (const d of directions.filter((x) => x.direction === 'B' && x.generative && x.morphology)) {
    const { buckets, carrying } = detectB1(rows, d, known);
    const classified = Object.values(buckets).reduce((n, x) => n + x.length, 0);
    const byRule = {};
    for (const r of buckets.rejected) byRule[r.rule] = (byRule[r.rule] || 0) + 1;
    out.b1.push({
      axis: d.axis,
      label: d.morphology.label,
      carrying,
      classified,
      coverage: carrying ? +((100 * classified) / carrying).toFixed(2) : 100,
      counts: {
        underdetermined: buckets.underdetermined.length,
        prompt_carries_a_cue: buckets.cued.length,
        both_forms_taught: buckets.bothTaught.length,
        unanchored: buckets.unanchored.length,
        rejected: buckets.rejected.length,
        rejected_by_rule: byRule,
      },
      samples: groupProposals(buckets.underdetermined),
      both_taught: buckets.bothTaught,
    });
  }

  // B — target richer, OBSERVATIONAL. Configuration-free.
  const b = detectB(rows, target, dirB);
  out.b = {
    axis: dirB ? dirB.axis : null,
    labelled: !!dirB,
    underdetermined: b.underdetermined.length,
    out_of_scope: b.outOfScope.length,
    samples: b.underdetermined,
  };

  return out;
}

/* ------------------------------------------------------------- reporting -- */

function report(out, opts) {
  const lim = opts.allSamples ? Infinity : 10;
  console.log(`=== DISTINCTION COVERAGE: ${out.course} ===`);
  console.log(`known=${out.known_lang} target=${out.target_lang}  ${out.rows} phrases scanned`);
  const missing = [
    out.known_configured ? null : out.known_lang,
    out.target_configured ? null : out.target_lang,
  ].filter(Boolean);
  if (missing.length) {
    console.log(`  ⚠ no language entry for ${missing.join(' and ')} — axis direction is`);
    console.log('    UNKNOWN for this pair, so only the configuration-free detectors ran.');
    console.log('    Add the language to tools/distinctions/axes.cjs to get A1 and an axis label.');
  }
  if (out.directions.length) {
    for (const d of out.directions) {
      const arrow = d.direction === 'A' ? 'known richer → collapse' : 'target richer → under-determined';
      console.log(`  axis ${d.axis}: DIRECTION ${d.direction} (${arrow})`
        + `${d.generative ? ', morphology available' : ', declared only'}`);
    }
  } else {
    console.log('  no asymmetric axis configured for this pair');
  }
  console.log('');

  let worst = 100;
  for (const r of out.a1) {
    worst = Math.min(worst, r.coverage);
    console.log(`[A1 · DIRECTION A · ${r.axis}] ${r.label}`);
    console.log(`  coverage: ${r.classified}/${r.carrying} rows carrying a marked form (${r.coverage}%)`);
    console.log(`  PROPOSALS THAT PASS THE REACH TEST: ${r.counts.proposals} distinct (${r.counts.proposal_rows} rows)`);
    console.log(`  same target form but NOT a drill candidate: ${r.counts.not_a_drill}`);
    console.log(`  attested both sides: ${r.counts.attested}   counterpart-with-different-answer: ${r.counts.conflict}`);
    console.log(`  unanchored: ${r.counts.unanchored}   rejected: ${r.counts.rejected}`);
    for (const [rule, n] of Object.entries(r.counts.rejected_by_rule)) {
      console.log(`      rejected/${rule}: ${n}`);
    }

    console.log('\n  --- CANDIDATES (propose only; nothing is written) ---');
    console.log('  Remedy: author the counterpart and drill it against the same answer.\n');
    for (const p of r.proposals.slice(0, lim)) {
      console.log(`  seed ${p.seed_number} [${p.phrase_role}] ${p.occurrences} row(s)`);
      console.log(`      HAS     : ${p.known_text}`);
      console.log(`      MISSING : ${p.counterpart_known_text}`);
      console.log(`      ANSWER  : ${p.target_text}`);
      console.log(`      REACH   : ${p.reach.verdict} — ${p.reach.reason}`);
    }
    if (r.proposals.length > lim) console.log(`  … ${r.proposals.length - lim} more (--all-samples or --json)`);

    if (r.not_a_drill.length) {
      console.log('\n  --- SAME TARGET FORM, BUT NOT A DRILL CANDIDATE ---');
      console.log('  Technically the same answer. The learner would not reach for it.');
      console.log('  These need teaching properly, NOT drilling.\n');
      for (const p of r.not_a_drill.slice(0, lim)) {
        console.log(`  seed ${p.seed_number}: ${p.known_text}  ↔  ${p.counterpart_known_text}`);
        console.log(`      ANSWER: ${p.target_text}`);
        console.log(`      REACH : ${p.reach.verdict} — ${p.reach.reason}`);
      }
      if (r.not_a_drill.length > lim) console.log(`  … ${r.not_a_drill.length - lim} more`);
    }

    console.log('\n  --- ATTESTED: both sides already taught, same answer (calibration) ---');
    for (const a of r.attested.slice(0, 6)) {
      console.log(`  seed ${a.seed_number}: ${a.known_text}  /  ${a.counterpart_known_text}  =>  ${a.target_text}`);
    }
    console.log('');
  }

  console.log('[A2 · DIRECTION A · observational] answers the course already reaches from >1 prompt');
  console.log('  Configuration-free — this one runs on every pair on the estate.');
  console.log(`  reachable collapses (the method working): ${out.a2.healthy}`);
  console.log(`  NOT DRILL PAIRS — same answer, prompts a learner would not connect: ${out.a2.walls}`
    + ` (${out.a2.walls_in_sentences} in sentences, ${out.a2.walls_in_fragments} in one-word glosses)`);
  console.log(`  middle ground, needs a human: ${out.a2.flagged}`);
  if (out.a2.walls) {
    console.log('\n  --- NOT DRILL PAIRS (the learn/teach shape — teach it, do not drill it) ---');
    console.log('  Informational, NOT defects. The course may well be teaching each of these');
    console.log('  properly already. What this says is only: do not pair them as a drill.');
    console.log('  Sentence-level cases first; one-word glosses after.\n');
    for (const w of out.a2.wall_samples.slice(0, lim)) {
      console.log(`  answer "${w.target_text}"${w.fragment ? '   [fragment]' : ''}`);
      console.log(`      first taught  seed ${w.first_taught.seed}: ${w.first_taught.known_text}`);
      console.log(`      also taught   seed ${w.also_taught.seed}: ${w.also_taught.known_text}`);
      console.log(`      REACH: ${w.reach.reason}`);
    }
    if (out.a2.wall_samples.length > lim) console.log(`  … ${out.a2.wall_samples.length - lim} more`);
  }

  for (const r of out.b1 || []) {
    console.log(`\n[B1 · DIRECTION B · ${r.axis}] the target marks it; the prompt does not`);
    console.log(`  coverage: ${r.classified}/${r.carrying} rows carrying a marked form (${r.coverage}%)`);
    console.log(`  UNDER-DETERMINED, and the other form is never taught: ${r.counts.underdetermined}`);
    console.log(`  prompt carries a cue (he/she/sir…), so the learner is not guessing: ${r.counts.prompt_carries_a_cue}`);
    console.log(`  both forms taught somewhere: ${r.counts.both_forms_taught}`);
    console.log(`  unanchored: ${r.counts.unanchored}   rejected: ${r.counts.rejected}`);
    console.log('  ⚠ NOT DEFECTS — candidates. A course may legitimately teach the unmarked');
    console.log('    form first and add the alternation later.\n');
    for (const f of r.samples.slice(0, lim)) {
      console.log(`  seed ${f.seed_number} [${f.phrase_role}] ${f.occurrences} row(s)`);
      console.log(`      PROMPT      : ${f.known_text}`);
      console.log(`      TAUGHT      : ${f.target_text}   (${f.side})`);
      console.log(`      NEVER TAUGHT: ${f.other_form}`);
    }
    if (r.samples.length > lim) console.log(`  … ${r.samples.length - lim} more`);
  }

  console.log('\n[B2 · DIRECTION B · observational] prompts taught with two related answers');
  if (out.b.labelled) {
    console.log(`  axis: ${out.b.axis} — the target marks it and the known side does not`);
  } else if (out.target_configured) {
    console.log(`  ${out.target_lang} marks no configured axis that ${out.known_lang} lacks, so`);
    console.log('  Direction B does not apply to this pair. The rows below are prompts taught');
    console.log('  with two closely-related answers anyway — worth a look, but unlabelled.');
  } else {
    console.log(`  unlabelled — no language entry for ${out.target_lang}, so the axis is unknown`);
  }
  console.log(`  under-determined prompts: ${out.b.underdetermined}`);
  console.log(`  same prompt, unrelated answers (a synonym/ZUT question, not this check): ${out.b.out_of_scope}`);
  console.log('  ⚠ NOT DEFECTS. Deliberate ambiguity is sometimes a teaching tool on this');
  console.log('    estate. These are candidates for a human. The remedy, if any, is the');
  console.log('    OPPOSITE of Direction A: disambiguate the prompt or split the card —');
  console.log('    never drill it.');
  for (const f of out.b.samples.slice(0, lim)) {
    console.log(`  prompt "${f.known_text}"`);
    console.log(`      seed ${f.answers[0].seed}: ${f.answers[0].target_text}`);
    console.log(`      seed ${f.answers[1].seed}: ${f.answers[1].target_text}`);
    console.log(`      ${f.reach.reason}`);
  }
  if (out.b.samples.length > lim) console.log(`  … ${out.b.samples.length - lim} more`);

  return worst < 99 ? 1 : 0;
}

/**
 * Which pairs on the estate does this fire on, and in which direction? Answers the
 * scoping question without scanning a single phrase.
 */
async function estate() {
  const courses = await query(
    'select course_code, known_lang, target_lang, seed_count, status from courses order by course_code',
  );
  const rows = [];
  for (const c of courses) {
    const dirs = directionsFor(c.known_lang, c.target_lang);
    if (!dirs.length) continue;
    rows.push({
      course: c.course_code,
      pair: `${c.known_lang}→${c.target_lang}`,
      seeds: c.seed_count,
      status: c.status,
      A: dirs.filter((d) => d.direction === 'A').map((d) => d.axis + (d.generative ? '*' : '')),
      B: dirs.filter((d) => d.direction === 'B').map((d) => d.axis + (d.generative ? '*' : '')),
    });
  }
  const unconfigured = [...new Set(courses
    .flatMap((c) => [c.known_lang, c.target_lang])
    .filter((l) => !LANGUAGES[l]))];
  return { courses: courses.length, firing: rows.length, rows, unconfigured };
}

(async () => {
  const args = process.argv.slice(2);
  if (args.includes('--estate')) {
    const e = await estate();
    if (args.includes('--json')) { console.log(JSON.stringify(e, null, 2)); process.exit(0); }
    console.log(`=== ESTATE SCOPE ===  ${e.firing} of ${e.courses} courses have an asymmetric axis`);
    console.log('(* = morphology available, so the detector can GENERATE rather than only observe)');
    console.log('you-number is off by default estate-wide — see AXES.number in axes.cjs\n');
    const a = e.rows.filter((r) => r.A.length);
    const b = e.rows.filter((r) => r.B.length);
    console.log(`DIRECTION A — known richer, prompts collapse onto one answer (${a.length}):`);
    for (const r of a) console.log(`  ${r.course.padEnd(22)} ${r.pair.padEnd(10)} ${String(r.seeds).padStart(4)} seeds  ${r.status || ''}  ${r.A.join(', ')}`);
    console.log(`\nDIRECTION B — target richer, learner must produce it unprompted (${b.length}):`);
    for (const r of b) console.log(`  ${r.course.padEnd(22)} ${r.pair.padEnd(10)} ${String(r.seeds).padStart(4)} seeds  ${r.status || ''}  ${r.B.join(', ')}`);
    if (e.unconfigured.length) {
      console.log(`\nNO LANGUAGE ENTRY (check cannot judge direction): ${e.unconfigured.join(' ')}`);
    }
    process.exit(0);
  }
  const course = args.find((a) => !a.startsWith('--'));
  const opts = { json: args.includes('--json'), allSamples: args.includes('--all-samples') };
  if (!course) {
    console.error('usage: check-distinction-coverage.cjs <course_code> [--json] [--all-samples]');
    process.exit(2);
  }
  const out = await run(course);
  if (opts.json) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }
  process.exit(report(out, opts));
})().catch((e) => { console.error(e.message); process.exit(2); });
