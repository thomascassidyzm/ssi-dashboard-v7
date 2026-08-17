#!/usr/bin/env node
/**
 * known-side-sweep.cjs — run the known-side vocabulary gate over LIVE course content.
 *
 * This is the REPORTING arm of the known-side contract layer. It calls exactly the same
 * functions the submit path calls (loadPairContract → buildKnownSideSeedCtx → checkKnownSide),
 * with the same seed-granular introduced-vocab accounting, so what it reports is what
 * /api/seed/complete would have said had the phrase been submitted today.
 *
 * IT NEVER WRITES. It reads course_legos + course_practice_phrases and prints findings.
 *
 * RAW vs CONFIRMED (the A135 discipline, docs/course-optimization/known-side-adjudications-2026-08-17/):
 *   RAW       = every problem string the matcher emits.
 *   CONFIRMED = raw findings under a MECHANICAL contract, which are gate-quality verdicts.
 * Under an AGENT BRIEF the matcher is exact-form, and the known languages it serves are
 * agglutinative/analytic in ways exact-form matching cannot see — an inflected form of an
 * introduced word is indistinguishable from a new word. Those findings are TRIAGE: a list a
 * human or agent adjudicates, never a build failure. The tool prints the two separately and
 * exits 0 either way; `--strict` is the only way to make it exit non-zero, and it honours the
 * mechanical/brief split (brief findings never fail, however many there are).
 *
 * Usage:
 *   node tools/course-optimization/known-side-sweep.cjs <course_code> [...]  # named courses
 *   node tools/course-optimization/known-side-sweep.cjs --all               # every live course
 *   node tools/course-optimization/known-side-sweep.cjs --all --json out.json
 *   node tools/course-optimization/known-side-sweep.cjs <code> --max-seed 30 --examples 20
 */
require('dotenv').config({ quiet: true });
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const V = require(path.join(__dirname, '../../services/course-builder/lib/validation.cjs'));
const {
  loadPairContract, checkKnownSide, isKnownVocabBreach, isMechanicalContract,
  compileKnownContract, stemKnownGloss, tokenizeKnown,
} = V;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function pageAll(table, select, filters) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from(table).select(select).range(from, from + 999);
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

/**
 * Seed-granular context, mirroring buildKnownSideSeedCtx in routes/seed-complete.cjs.
 * Built ONCE per course over all legos; `stemFirstPos` holds each gloss stem's debut seed,
 * and checkKnownSide compares against the seed of the phrase under test. That reproduces
 * the submit-path semantics without re-querying per seed.
 */
function buildCtx(legos, contract) {
  const stemFirstPos = new Map();
  const addStem = (s, seed) => {
    const k = stemKnownGloss(s);
    if (!k) return;
    if (!stemFirstPos.has(k) || stemFirstPos.get(k) > seed) stemFirstPos.set(k, seed);
  };
  for (const l of legos) {
    for (const t of tokenizeKnown(l.known_text)) addStem(t, l.seed_number);
    for (const c of l.components || []) for (const t of tokenizeKnown(c.known)) addStem(t, l.seed_number);
  }
  const carrierSeed = (carrier) => {
    let min = Infinity;
    for (const l of legos) {
      const hit = l.target_text === carrier || (l.components || []).some(c => c.target === carrier);
      if (hit && l.seed_number < min) min = l.seed_number;
    }
    return min;
  };
  for (const [carrier, syns] of Object.entries(contract.glossSynonyms || {})) {
    const seed = carrierSeed(carrier);
    if (seed < Infinity) for (const syn of syns) addStem(syn, seed);
  }
  const consPos = {};
  for (const con of contract.constructions || []) {
    consPos[con.id] = con.cluster
      ? (contract.clusterSeeds?.[con.cluster] ?? contract.clusterRounds?.[con.cluster] ?? Infinity)
      : carrierSeed(con.carrier);
  }
  const unitPos = (contract.glossUnits || []).map(u => ({ phrase: u.phrase, pos: carrierSeed(u.carrier) }));
  return { ...compileKnownContract(contract), stemFirstPos, consPos, unitPos };
}

async function sweepCourse(course, opts) {
  const code = course.course_code;
  const knownLang = course.known_lang;
  const contract = loadPairContract(code, knownLang);

  const base = {
    course_code: code, known_lang: knownLang, target_lang: course.target_lang, status: course.status,
  };
  if (!contract) {
    return { ...base, resolution: 'none', ran: false, reason: `no contract resolves for known language "${knownLang}"` };
  }
  // Which file won? Re-derive by asking for the course-specific one alone.
  const own = loadPairContract(code, '__none__');
  const resolution = own && own === contract ? `course:${code.replace(/_v\d+$/, '')}` : `lang:_lang_${knownLang}`;
  if (contract.known_lang && contract.known_lang !== knownLang) {
    return { ...base, resolution, ran: false, reason: `contract known_lang "${contract.known_lang}" != course known_lang "${knownLang}"` };
  }

  const legos = await pageAll('course_legos', 'lego_id,target_text,known_text,components,seed_number', { course_code: code });
  if (!legos.length) return { ...base, resolution, ran: false, reason: 'no legos' };

  // ONLY build/use/practice phrases. Component rows are never drilled by the learner and
  // carry un-authored known text; including them inflated an earlier census by ~60%.
  const phrases = (await pageAll(
    'course_practice_phrases', 'phrase_id,lego_id,seed_number,known_text,target_text,phrase_role', { course_code: code },
  )).filter(p => ['build', 'use', 'practice'].includes(p.phrase_role));

  const mechanical = isMechanicalContract(contract);
  const ctx = buildCtx(legos, contract);
  const maxSeed = opts.maxSeed || Infinity;

  let checked = 0;
  const rawByKind = {}; const examples = []; const perSeed = {};
  let rawBreaches = 0; let rawAdvisories = 0;
  const unknownGlossCounts = new Map();

  for (const p of phrases) {
    if (!p.known_text || p.seed_number == null || p.seed_number > maxSeed) continue;
    checked++;
    const probs = checkKnownSide(p.known_text, p.seed_number, ctx);
    if (!probs.length) continue;
    for (const pr of probs) {
      const kind = /^unknown gloss/.test(pr) ? 'unknown gloss'
        : /not introduced until/.test(pr) ? 'not introduced until'
          : /^negation/.test(pr) ? 'negation unlicensed'
            : /^NPI token/.test(pr) ? 'NPI without negation'
              : /^construction/.test(pr) ? 'construction unlicensed'
                : /^machinery/.test(pr) ? 'machinery unlicensed' : 'other';
      rawByKind[kind] = (rawByKind[kind] || 0) + 1;
      if (isKnownVocabBreach(pr)) rawBreaches++; else rawAdvisories++;
      const m = /^unknown gloss "(.+)"$/.exec(pr);
      if (m) unknownGlossCounts.set(m[1], (unknownGlossCounts.get(m[1]) || 0) + 1);
    }
    perSeed[p.seed_number] = (perSeed[p.seed_number] || 0) + probs.length;
    if (examples.length < (opts.examples || 12)) {
      examples.push({ phrase_id: p.phrase_id, seed: p.seed_number, known: p.known_text, target: p.target_text, problems: probs.slice(0, 4) });
    }
  }

  const topGlosses = [...unknownGlossCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
    .map(([w, n]) => ({ word: w, hits: n }));

  return {
    ...base,
    resolution,
    ran: true,
    mechanical,
    // CONFIRMED = gate-quality. Only a mechanical contract produces verdicts; a brief
    // produces triage. This is the whole raw-vs-confirmed split, in one line.
    verdict_class: mechanical ? 'confirmed' : 'triage',
    legos: legos.length,
    phrases_checked: checked,
    raw_findings: rawBreaches + rawAdvisories,
    raw_vocab_breaches: rawBreaches,
    raw_advisories: rawAdvisories,
    confirmed_vocab_breaches: mechanical ? rawBreaches : 0,
    confirmed_advisories: mechanical ? rawAdvisories : 0,
    distinct_unknown_glosses: unknownGlossCounts.size,
    by_kind: rawByKind,
    top_unknown_glosses: topGlosses,
    worst_seeds: Object.entries(perSeed).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, n]) => ({ seed: +s, findings: n })),
    examples,
  };
}

(async () => {
  const argv = process.argv.slice(2);
  const opts = {
    all: argv.includes('--all'),
    strict: argv.includes('--strict'),
    maxSeed: argv.includes('--max-seed') ? +argv[argv.indexOf('--max-seed') + 1] : 0,
    examples: argv.includes('--examples') ? +argv[argv.indexOf('--examples') + 1] : 12,
    json: argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null,
  };
  const named = argv.filter(a => !a.startsWith('--') && !/^\d+$/.test(a)
    && a !== opts.json);

  const { data: all, error } = await supabase.from('courses')
    .select('course_code,known_lang,target_lang,status,seed_count').limit(2000);
  if (error) throw new Error(error.message);
  const courses = opts.all ? all : all.filter(c => named.includes(c.course_code));
  if (!courses.length) { console.error('no matching courses'); process.exit(2); }

  const results = [];
  for (const c of courses) {
    let r;
    try { r = await sweepCourse(c, opts); } catch (e) { r = { course_code: c.course_code, known_lang: c.known_lang, ran: false, reason: `ERROR ${e.message}` }; }
    results.push(r);
    if (!r.ran) { console.log(`— ${r.course_code.padEnd(22)} known=${r.known_lang}  NOT RUN: ${r.reason}`); continue; }
    const tag = r.mechanical ? 'CONFIRMED' : 'triage   ';
    console.log(`${r.mechanical ? '✓' : '·'} ${r.course_code.padEnd(22)} known=${r.known_lang} via ${r.resolution.padEnd(14)} ${tag} phrases=${String(r.phrases_checked).padStart(6)} raw=${String(r.raw_findings).padStart(6)} (vocab ${r.raw_vocab_breaches}, adv ${r.raw_advisories}) distinct-unknown=${r.distinct_unknown_glosses}`);
  }

  if (opts.json) {
    require('fs').writeFileSync(opts.json, JSON.stringify(results, null, 2));
    console.log(`\nwrote ${opts.json}`);
  }

  const confirmedFailures = results.filter(r => r.ran && r.mechanical && r.confirmed_vocab_breaches > 0);
  console.log(`\n${results.filter(r => r.ran).length} swept, ${results.filter(r => !r.ran).length} not run; `
    + `${confirmedFailures.length} course(s) with CONFIRMED vocab breaches.`);
  // Brief-backed findings NEVER fail, by design — exact-form matching under agglutinative
  // morphology cannot tell an inflection from a new word (Kai/Tom, A135 adjudication).
  process.exit(opts.strict && confirmedFailures.length ? 1 : 0);
})();
