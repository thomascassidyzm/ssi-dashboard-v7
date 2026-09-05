#!/usr/bin/env node
/**
 * THE PER-BASKET QA REPORT — the declaration, run as an instrument.
 *
 * For every LEGO basket in the range this computes the DECLARATION (what a
 * generator at that position would be built to instantiate: derived job, frame
 * pool, splits, floors) and judges phrases against it, mechanically. Nobody
 * reads the target language: frames are re-derived from the matchers, splits
 * from their target-side regexes, floors from the declared pool.
 *
 * It scores TWO KINDS OF PHRASE and always says which:
 *   LIVE       — what is in `course_practice_phrases` right now.
 *   CANDIDATE  — a generated set on disk, not yet submitted.
 * Every line and every JSON row carries its source, because a live number and a
 * candidate number that look alike is how a baseline gets quoted as a result.
 *
 * TWO KINDS OF FINDING, never blended:
 *   CONTENT (the verdict)  — the five floors FRAME/POS/NEIGH/JUNCT/SPLIT and
 *                            the composite. This is what PASS and FAIL mean.
 *   CLAIMS  (an observation) — the model's own per-phrase frame tags, audited
 *                            against the matchers. Counted and named, never
 *                            summed into the composite, never able to turn a
 *                            PASS into a FAIL (Tom's ruling, 2026-09-05:
 *                            claim honesty reports, it does not gate).
 *
 * READ-ONLY. Writes nothing to any database, ever. It READS the live course
 * tables even in candidate mode, because the DECLARATION is derived from the
 * course — so a candidate score is "candidate phrases against a live
 * declaration", and the report says so on its face.
 *
 * ── HOW TO RUN IT ─────────────────────────────────────────────────────────
 * Needs a `.env` at the repo root with SUPABASE_URL and SUPABASE_SERVICE_KEY
 * (or SUPABASE_SERVICE_ROLE_KEY). Nothing else. No branch archaeology.
 *
 *   Score what is LIVE in the course for one seed:
 *     node tools/frame-layer/qa-report.cjs spa_for_eng --seed 599
 *
 *   Score a CANDIDATE set you have just generated, before submitting it:
 *     node tools/frame-layer/qa-report.cjs spa_for_eng --seed 599 \
 *       --candidates /path/to/generated/            # a file OR a directory
 *
 *   Both at once, so you can see the candidate against its own baseline:
 *     node tools/frame-layer/qa-report.cjs spa_for_eng --seed 599 \
 *       --candidates /path/to/generated/ --with-live
 *
 *   A region, or a whole course, with the rows written out:
 *     node tools/frame-layer/qa-report.cjs spa_for_eng --from 590 --to 610
 *     node tools/frame-layer/qa-report.cjs spa_for_eng --from 1 --to 668 --json report.json
 *
 * CANDIDATE FILES may be either shape the estate already produces, detected
 * automatically: the door's own response (`build[]`/`use[]` of
 * {known,target,frame}) or a lab candidate file (`phrases[]` of rows already
 * carrying phrase_role/known_text/target_text/lego_index/frame).
 *
 * READING THE OUTPUT
 *   FAIL <lego_id> … [floors: …]   the basket misses a CONTENT floor. Fix the
 *                                  phrases; each shortfall prints its own
 *                                  rewrite instruction underneath.
 *   ~ CLAIMS n/m …                 n of m frame tags do not match what the
 *                                  matchers fire on. A labelling finding. It
 *                                  does not fail anything; it tells you the
 *                                  generator's self-report cannot be trusted
 *                                  for those rows.
 *   composite                      the content number, 0-1, mean of the axes.
 *                                  It is a measurement, not a target.
 *
 * A full course is a few thousand read-only queries and some minutes — chunk
 * with --from/--to if you only need a region. Non-English known sides get one
 * honest "not applicable" line and no per-basket noise.
 */
const fs = require('fs');
const path = require('path');

const USAGE = `
usage:
  live:       node tools/frame-layer/qa-report.cjs <course> --seed N
  candidate:  node tools/frame-layer/qa-report.cjs <course> --seed N --candidates <file|dir>
  both:       node tools/frame-layer/qa-report.cjs <course> --seed N --candidates <file|dir> --with-live
  range:      node tools/frame-layer/qa-report.cjs <course> --from N --to N [--json out.json]

options:
  --seed N               one seed (shorthand for --from N --to N)
  --from N --to N        a seed range
  --candidates <path>    score phrases from disk instead of course_practice_phrases.
                         A file, or a directory of .json files. Two shapes are
                         accepted and detected automatically: the phrase door's
                         response (build[]/use[]) and a lab candidate file (phrases[]).
  --with-live            also score the live phrases, so both sources print side by side
  --json <out.json>      write every row, each carrying its source

env: .env at the repo root with SUPABASE_URL and SUPABASE_SERVICE_KEY
     (the DECLARATION is derived from the live course tables even in candidate
     mode — a candidate score is candidate phrases against a live declaration).

READ-ONLY: this tool writes nothing to any database.
`.trim();

/**
 * THE CANDIDATE READER. Normalises either on-disk shape into the rows
 * checkDeclaration wants. Pure, no I/O — the caller supplies the parsed object,
 * which is what lets the self-test exercise it with no file and no DB.
 */
function readCandidatePhrases(doc, legoIndex = null) {
  const rows = [];
  if (Array.isArray(doc?.phrases)) {
    // Lab candidate shape: rows already speak the checker's field names.
    for (const p of doc.phrases) {
      rows.push({ phrase_role: p.phrase_role || 'use', known_text: p.known_text,
                  target_text: p.target_text, frame: p.frame || null,
                  lego_index: p.lego_index != null ? +p.lego_index : null });
    }
  } else if (Array.isArray(doc?.build) || Array.isArray(doc?.use)) {
    // Door response shape: {known,target,frame}, role carried by the array.
    const li = doc.legoIndex != null ? +doc.legoIndex : null;
    for (const [role, arr] of [['build', doc.build], ['use', doc.use]]) {
      for (const p of arr || []) {
        rows.push({ phrase_role: role, known_text: p.known, target_text: p.target,
                    frame: p.frame || null, lego_index: li });
      }
    }
  } else {
    throw new Error('unrecognised candidate shape: expected build[]/use[] (door response) or phrases[] (lab candidate file)');
  }
  return legoIndex == null ? rows
    : rows.filter(r => r.lego_index == null || r.lego_index === +legoIndex);
}

/** Every .json under `p` (a file or a directory), parsed, tagged with its path. */
function loadCandidateFiles(p) {
  const st = fs.statSync(p);
  const files = st.isDirectory()
    ? fs.readdirSync(p).filter(f => f.endsWith('.json')).sort().map(f => path.join(p, f))
    : [p];
  const out = [];
  for (const f of files) {
    let doc;
    try { doc = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) {
      out.push({ file: f, error: `unreadable: ${e.message}` }); continue;
    }
    try { out.push({ file: f, doc, rows: readCandidatePhrases(doc) }); } catch (e) {
      out.push({ file: f, error: e.message });
    }
  }
  return out;
}

/** One row's source, in the words the report prints. */
const sourceLabel = (row) => row.source === 'live'
  ? 'LIVE (course_practice_phrases)'
  : `CANDIDATE (${row.source_file})`;

function printRow(r) {
  const verdict = r.pass === true ? 'PASS' : r.pass === false ? 'FAIL' : 'SKIP';
  const floors = r.floor_failures && r.floor_failures.length ? `  [floors: ${r.floor_failures.join(', ')}]` : '';
  console.log(`${verdict} ${r.lego_id}  "${r.lego}"  composite ${r.composite}${floors}  job ${r.job}, pool ${r.pool}, ${r.phrases} phrases`);
  console.log(`     source: ${sourceLabel(r)}`);
  for (const i of r.rewrite_instructions || []) console.log(`     ${i}`);
  // Claim findings print as a DIFFERENT KIND OF THING: their own prefix, below
  // the verdict, never inside it.
  const ch = r.claim_honesty;
  if (ch && ch.wrong) {
    console.log(`   ~ CLAIMS ${ch.wrong}/${ch.checked} frame tags wrong — a labelling finding, not a verdict; it changes no score:`);
    for (const f of ch.findings) console.log(`   ~   "${f.known_text}" claims ${f.claimed} but fires ${f.fired}`);
  }
}

async function main() {
  require('dotenv').config({ quiet: true });
  const { createClient } = require('@supabase/supabase-js');
  const { loadCorpus, knownSideIsEnglish } = require('./corpus.cjs');
  const { computeDeclaration, checkDeclaration } = require('./declaration.cjs');

  const arg = (name, dflt = null) => {
    const i = process.argv.indexOf(name);
    return i === -1 ? dflt : process.argv[i + 1];
  };
  const course = process.argv[2];
  if (!course || course.startsWith('--') || process.argv.includes('--help') || process.argv.includes('-h')) {
    console.error(USAGE);
    process.exit(course && !course.startsWith('--') ? 0 : 2);
  }
  if (!process.env.SUPABASE_URL) {
    console.error('no SUPABASE_URL — this tool derives the declaration from the live course tables.\n');
    console.error(USAGE);
    process.exit(2);
  }
  const sb = createClient(process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!knownSideIsEnglish(course)) {
    console.log(`${course}: NOT APPLICABLE — the known side is not English, and the frame layer's patterns are English regexes. No basket verdicts are produced; absence of findings here is blindness, not health.`);
    process.exit(0);
  }
  const one = arg('--seed');
  const from = +(one || arg('--from', 1));
  const to = +(one || arg('--to', from));
  const jsonOut = arg('--json');
  const candPath = arg('--candidates');
  const withLive = !candPath || process.argv.includes('--with-live');

  let candidates = [];
  if (candPath) {
    candidates = loadCandidateFiles(candPath);
    for (const c of candidates.filter(x => x.error)) console.log(`SKIP candidate ${c.file} — ${c.error}`);
    candidates = candidates.filter(c => !c.error);
    if (!candidates.length) { console.error(`no readable candidate files at ${candPath}`); process.exit(2); }
  }

  const rows = [];
  for (let seed = from; seed <= to; seed++) {
    let corpus;
    try { corpus = await loadCorpus(sb, course, seed); } catch (e) {
      rows.push({ seed, error: e.message }); continue;
    }
    if (!corpus.seedRow) continue;
    for (const l of corpus.ownLegos) {
      const k = +l.lego_index;
      // The declaration is ALWAYS derived from the live course tables, in both
      // modes — which is exactly why a candidate score is not an offline number.
      const decl = await computeDeclaration(sb, course, seed, k, { corpus });

      const sets = [];
      if (withLive) {
        sets.push({ source: 'live', source_file: null,
                    rows: corpus.phrases.filter(p => +p.lego_index === k) });
      }
      for (const c of candidates) {
        const mine = readCandidatePhrases(c.doc, k);
        if (mine.length) sets.push({ source: 'candidate', source_file: c.file, rows: mine });
      }

      for (const set of sets) {
        const check = checkDeclaration(decl, set.rows);
        rows.push({
          source: set.source, source_file: set.source_file,
          declaration_source: 'live course tables (course_seeds/course_legos/course_practice_phrases)',
          seed, lego_index: k, lego_id: decl.lego_id,
          lego: `${l.known_text} / ${l.target_text}`,
          job: decl.job.verdict, pool: decl.frame_pool.total,
          pod_offered: (decl.frame_pool.pod || []).map(p => p.id),
          phrases: set.rows.filter(p => p.phrase_role !== 'component').length,
          pass: check.pass, composite: check.composite,
          axes: check.axes, floor_failures: check.floor_failures || [],
          splits: (check.splits || []).map(s => ({ id: s.id, crossed: s.crossed })),
          pod_instantiated: check.pod_frames ? check.pod_frames.instantiated : [],
          rewrite_instructions: check.rewrite_instructions || [],
          claim_honesty: check.claim_honesty || null,
          reason: check.reason || null,
        });
      }
    }
  }

  const scored = rows.filter(r => r.pass !== undefined && !r.error);
  const failing = scored.filter(r => r.pass === false);
  const passing = scored.filter(r => r.pass === true);

  console.log(`\n=== CONTENT VERDICTS — the five floors, the only thing that PASSes or FAILs ===\n`);
  for (const r of [...failing, ...passing]) printRow(r);
  for (const r of rows.filter(x => x.error || x.reason)) {
    console.log(`SKIP seed ${r.seed}${r.lego_id ? ' ' + r.lego_id : ''} — ${r.error || r.reason}`);
  }

  // The claim roll-up is its own section, above the summary, so a reader who
  // skims still sees it — and cannot mistake it for the content verdict.
  const claimed = scored.filter(r => r.claim_honesty && r.claim_honesty.checked);
  const wrongRows = claimed.filter(r => r.claim_honesty.wrong);
  console.log(`\n=== CLAIM HONESTY — reported, never gated; changes no score above ===\n`);
  if (!claimed.length) {
    console.log('no frame tags were claimed on any scored basket — nothing to audit.');
  } else {
    const totalClaims = claimed.reduce((n, r) => n + r.claim_honesty.checked, 0);
    const totalWrong = claimed.reduce((n, r) => n + r.claim_honesty.wrong, 0);
    console.log(`~ ${totalWrong} of ${totalClaims} frame tags across ${claimed.length} scored basket(s) do not match what the matchers fire.`);
    for (const r of wrongRows) {
      console.log(`~ ${r.lego_id}  ${sourceLabel(r)}  ${r.claim_honesty.wrong}/${r.claim_honesty.checked} wrong  [content verdict: ${r.pass ? 'PASS' : 'FAIL'} — unaffected]`);
      for (const f of r.claim_honesty.findings) console.log(`~   "${f.known_text}" claims ${f.claimed} but fires ${f.fired}`);
    }
  }

  const bySource = (s) => scored.filter(r => r.source === s);
  console.log(`\n=== SUMMARY ===\n`);
  for (const s of ['live', 'candidate']) {
    const rs = bySource(s);
    if (!rs.length) continue;
    const mean = rs.reduce((n, r) => n + (r.composite || 0), 0) / rs.length;
    const label = s === 'live' ? 'LIVE (course_practice_phrases)' : `CANDIDATE (${candPath})`;
    console.log(`${label}: ${rs.length} baskets on ${course} seeds ${from}-${to} — ${rs.filter(r => r.pass).length} pass content, ${rs.filter(r => r.pass === false).length} fail; mean composite ${mean.toFixed(3)}`);
  }
  console.log(`declarations for every row above were derived from the LIVE course tables.`);
  const podReach = scored.filter(r => (r.pod_offered || []).length);
  if (podReach.length) {
    const landed = podReach.filter(r => (r.pod_instantiated || []).length);
    console.log(`pod frames: offered in ${podReach.length} baskets, instantiated in ${landed.length} — reported, never gated.`);
  }
  if (jsonOut) {
    fs.writeFileSync(jsonOut, JSON.stringify({ course, from, to, candidates_path: candPath || null, rows }, null, 2));
    console.log(`wrote ${jsonOut}`);
  }
}

module.exports = { readCandidatePhrases, loadCandidateFiles, USAGE };

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
