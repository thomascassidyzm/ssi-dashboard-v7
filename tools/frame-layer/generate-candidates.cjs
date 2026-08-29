#!/usr/bin/env node
/**
 * Generate a candidate PHRASE BASKET PER LEGO for one seed, guided by the frame layer.
 *
 * The job is not "write nine phrases for this seed". Tom's ruling, 2026-08-29:
 * the seed is invisible to the learner, the unit of learning is the LEGO and the
 * unit of practice is the PHRASE. So the job, per Watson, is: "for this LEGO,
 * build a basket that exercises it across positions, neighbours and frames,
 * ordered so each phrase adds one thing." One basket per LEGO, each scored
 * against the full floors on its own.
 *
 * The seed's teaching job is DERIVED (derive-seed-job.cjs), never looked up, and
 * each basket is told only about the split side its OWN lego admits.
 *
 * WRITES NOTHING TO THE DATABASE. Output is a JSON file under labs/basket-lab/candidates/.
 * All LLM calls go through the Claude CLI (never the Anthropic SDK): repo rule.
 *
 * Usage: node tools/frame-layer/generate-candidates.cjs spa_for_eng 599 [--passes 3]
 */
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const { scoreBaskets } = require('./pattern-diversity.cjs');
const { deriveJob, splitsForBasket } = require('./derive-seed-job.cjs');
const { loadCorpus, knownSideIsEnglish } = require('./corpus.cjs');
const { availableVocab, attestedFrames } = require('./availability.cjs');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
const ROOT = path.join(__dirname, '..', '..');
const OUTDIR = path.join(ROOT, 'labs', 'basket-lab', 'candidates');

const pad = (i) => 'L' + String(i).padStart(2, '0');

function buildPrompt({ seedRow, ownLegos, legos, components, liveBaskets, job, attested }, course, mapping, priorAttempt) {
  // The SHAPES come from the inventory doc; WHICH frames are attested comes from
  // THIS course's own prior seeds (`attested`), never from the doc's `first_seed`
  // — that field was computed over spa_for_eng's seed list and the known side is
  // not one canonical set across the estate.
  const patterns = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/frame-layer/english-pattern-inventory.json'), 'utf8'));
  const usable = patterns.patterns.filter(p => attested.has(p.id))
    .map(p => `${p.id} ${p.name}: ${p.shape}  [class for this pair: ${mapping[p.id] || '—'}]`).join('\n');
  // The base pool — everything admitted BEFORE this seed — is the same for every
  // basket, so it is stated once. Per-basket windows are stated as deltas off it:
  // repeating a 50,000-character vocabulary list four times quadrupled the prompt.
  const base = availableVocab({ legos, components, seed: seedRow.seed_number, legoIndex: 1 });
  const baseVocab = base.map(v => `${v.known_text}=${v.target_text}`).join('; ');
  const ownRows = [...legos, ...components].filter(r => r.seed_number === seedRow.seed_number);

  const briefs = ownLegos.map(l => {
    const b = liveBaskets.find(x => x.lego_index === +l.lego_index);
    const n = b && b.score ? b.score.phrase_count : 6;
    const nb = b ? b.phrases.filter(p => p.phrase_role === 'build').length : 3;
    const splits = splitsForBasket(job, +l.lego_index);
    // PER-BASKET availability window (Tom, 2026-08-29): everything through seed
    // N-1, plus legos 1..k-1 of this seed and their components. Cumulative within
    // the seed — LEGO 1 has none of its siblings, LEGO 4 has all three.
    const k = +l.lego_index;
    const earlier = ownRows.filter(r => +r.lego_index < k).map(r => `${r.known_text}=${r.target_text}`);
    const later = ownRows.filter(r => +r.lego_index > k).map(r => `${r.known_text}=${r.target_text}`);
    return `--- BASKET ${pad(l.lego_index)} — the LEGO "${l.known_text}" / "${l.target_text}" [${l.type}]
    produce ${n} phrases: ${nb} build, ${n - nb} use. EVERY phrase must contain "${l.target_text}" verbatim on the
    target side and "${l.known_text}" verbatim on the known side — character-exact, because the LEGO's own
    surface form is what makes the mapping deterministic.
    ${splits.length
      ? `THIS LEGO ADMITS a side of a split the course has never shown before: ${splits.map(sp => `${sp.id} ${sp.name} → ${sp.outcomes.map(o => o.form).join(' AND ')}`).join('; ')}. Carry it in at least TWO genuinely different known-side shapes.`
      : `This LEGO admits no new side of any split. Its job is lexical: make the word usable, not make a contrast.`}
    AVAILABLE TO THIS BASKET: the base vocabulary below, ${earlier.length ? `PLUS these earlier pieces of this same seed — ${earlier.join('; ')}` : 'and NOTHING from this seed — this is the first LEGO, so none of its siblings exist yet'}.
    ${later.length ? `NOT AVAILABLE to this basket, because they are admitted after it: ${later.join('; ')}.` : ''}
    ${b && b.score ? `The live basket here scores ${b.score.composite} and ${b.score.pass ? 'passes' : 'FAILS on: ' + b.score.floor_failures.join(', ')}. Live phrases you are competing with:\n${b.phrases.filter(p => p.phrase_role !== 'component').map(p => `      ${p.phrase_role}: ${p.known_text} || ${p.target_text}`).join('\n')}` : ''}`;
  }).join('\n');

  return `You are writing candidate practice phrases for ONE seed of an SSi course. This is a SELECTION task against a frame inventory, not a phrase-writing task.

COURSE: ${course}   SEED ${seedRow.seed_number} (IMMUTABLE — do not restate, rewrite or alter it)
  known:  ${seedRow.known_text}
  target: ${seedRow.target_text}

WHAT THIS SEED IS FOR, derived from its own admission diff — ${job.verdict}:
  ${job.sentence}

THE UNIT IS THE LEGO, NOT THE SEED. A seed is invisible to a learner; the unit of learning is the LEGO and the unit of practice is the PHRASE. You are building ONE BASKET PER LEGO. For each LEGO, build a basket that exercises it across POSITIONS, NEIGHBOURS and FRAMES, ordered so each phrase adds one thing. Each basket is scored on its own against every floor — a strong basket cannot carry a weak one.

${briefs}

FRAMES YOU MAY INSTANTIATE (attested in the known-language corpus at or before this seed):
${usable}

BASE VOCABULARY — every known/target pair the course admitted BEFORE this seed, LEGOs and components alike.
Components are the pieces an M-LEGO was broken into for the learner; they are legitimately seen material and
they are the connective glue that makes a phrase work on both sides, so use them. Do not invent, re-conjugate
or contract beyond what is listed. AVAILABILITY IS PER BASKET, NOT PER SEED: on top of this base, a basket may
use only the earlier LEGOs of this seed named in its own brief above, never the later ones.
${baseVocab}

EACH BASKET IS SCORED ON:
  FRAME  distinct pattern signatures of the MATRIX CLAUSE / what was instantiable   (floor 0.34)
  POS    distinct positions of the LEGO in its phrase (initial/medial/final) / 3     (floor 0.34)
  NEIGH  (distinct left + distinct right neighbours of the LEGO) / (2 x phrases)     (floor 0.30)
  JUNCT  distinct (left neighbour -> right neighbour) junctions / phrase count       (floor 0.50)
  SPLIT  each side this LEGO admits, carried by >= 2 distinct known-side skeletons   (floor 1.00)
Every floor must be cleared in EVERY basket. Vary the MATRIX CLAUSE, not the tail: swapping the end of a
sentence does not change the frame the LEGO is being taught in. Put the LEGO initially, medially and finally.
Give it different words on its left and on its right.

METHODOLOGY RAILS, non-negotiable:
- ZUT: one known prompt maps to exactly one target form, everywhere.
- The known side is a controlled language too: no English structure or word the learner has not been given.
- BUILD phrases may be fragments but must extend naturally; USE phrases must be complete, natural sentences a native would say, never clunky.
- No parentheses, no explanations, no grammar labels anywhere in the text.
- Informal register (tú) unless the sentence itself insists otherwise.
${priorAttempt ? `\nYOUR PREVIOUS ATTEMPT failed these baskets: ${priorAttempt.failing.map(f => `${pad(f.lego_index)} (${f.floors.join(', ')})`).join('; ')}. Fix exactly those baskets and leave the passing ones alone.\nPrevious attempt:\n${priorAttempt.phrases.map(p => `  ${pad(p.lego_index)} ${p.phrase_role}: ${p.known_text} || ${p.target_text}`).join('\n')}\n` : ''}
Reply with JSON ONLY, no prose, no code fence:
{"phrases":[{"lego_index":1,"phrase_role":"build|use","known_text":"...","target_text":"...","frame":"P-id","why":"one clause: which frame, and what this phrase adds that the previous one did not"}]}`;
}

function callClaude(prompt) {
  // The repo's own helper: pins the config dir, injects the OAuth token, and
  // strips ANTHROPIC_API_KEY + CLAUDECODE. Never the Anthropic SDK.
  const { claudeEnv } = require(path.join(ROOT, 'services', 'shared', 'claude-config.cjs'));
  const env = claudeEnv(process.env);
  const CLAUDE = '/home/tomcassidy/.local/bin/claude';
  const out = execFileSync(CLAUDE, ['--print', '--model', 'sonnet'], {
    input: prompt, env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
    // 300s was not enough for a four-basket prompt: all three attempts on seed 599
    // died on ETIMEDOUT with nothing generated. The call itself is fine (a tiny
    // prompt returns in 2.7s); it is the size of this one that costs the minutes.
    timeout: +(process.env.CLAUDE_TIMEOUT_MS || 900000),
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no JSON in model output:\n' + out.slice(0, 500));
  return JSON.parse(m[0]);
}

async function main() {
  const [course = 'spa_for_eng', seedArg = '599'] = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const passes = +(process.argv[process.argv.indexOf('--passes') + 1] || 1) || 1;
  const seed = +seedArg;
  const { seedRow, legos, ownLegos, priorSeeds, priorLegos, priorComponents, components, phrases } = await loadCorpus(sb, course, seed);
  if (!seedRow) throw new Error(`no seed ${seed} in ${course}`);
  const job = deriveJob({ course, seedRow, ownLegos, priorSeeds, priorLegos, priorComponents });
  // per-course frame attestation — never the doc's spa-derived first_seed
  const attested = attestedFrames(priorSeeds, seedRow);
  const liveScored = scoreBaskets(phrases, { legos: ownLegos, job, instantiableFrames: attested.size });
  if (!knownSideIsEnglish(course)) {
    console.log(`NOTE: ${course} has a non-English known side; the frame layer's patterns are English regexes and will report nothing here.`);
  }
  const mapping = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/frame-layer/pair-mapping-classes.json'), 'utf8'))
    .patterns.map(p => [p.id, p.pairs[course]?.class]));

  console.log(`${course} seed ${seed} — job: ${job.verdict}`);
  console.log(job.sentence + '\n');

  const ctx = { seedRow, ownLegos, legos, components, liveBaskets: liveScored.baskets, job, attested };
  const attempts = [];
  let best = null, prior = null;
  if (process.env.DUMP_PROMPT) {
    const pr = buildPrompt(ctx, course, mapping, null);
    console.log(`prompt: ${pr.length} chars`); fs.writeFileSync(process.env.DUMP_PROMPT, pr); return;
  }
  for (let i = 0; i < passes; i++) {
    const prompt = buildPrompt(ctx, course, mapping, prior);
    let parsed;
    try { parsed = callClaude(prompt); }
    catch (e) { attempts.push({ pass: i + 1, error: String(e.message).slice(0, 400) }); continue; }
    const ph = (parsed.phrases || []).map((p, n) => ({ ...p, position: n + 1 }));
    const r = scoreBaskets(ph, { legos: ownLegos, job, instantiableFrames: attested.size });
    attempts.push({ pass: i + 1, seed_composite: r.seed_composite, seed_pass: r.seed_pass,
                    failing_baskets: r.failing_baskets, phrase_count: ph.length });
    console.log(`pass ${i + 1}: ${ph.length} phrases, ${r.seed_pass ? 'ALL BASKETS PASS' : 'failing ' + r.failing_baskets.map(f => pad(f.lego_index)).join(', ')}`);
    prior = { failing: r.failing_baskets, phrases: ph };
    // "better" = fewer failing baskets; the seed composite is never the decider
    if (!best || r.failing_baskets.length < best.result.failing_baskets.length) best = { phrases: ph, result: r };
    if (r.seed_pass) break;
  }
  if (!best) throw new Error('no usable generation: ' + JSON.stringify(attempts));

  const build_sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const out = { course, seed, generated: new Date().toISOString(), build_sha, model: 'sonnet',
    job: { verdict: job.verdict, sentence: job.sentence },
    attempts, phrases: best.phrases,
    baskets: best.result.baskets.map(b => ({ lego_index: b.lego_index, lego: b.lego.known_text,
      composite: b.score && b.score.composite, pass: !!(b.score && b.score.pass),
      floor_failures: b.score ? b.score.floor_failures : ['no phrases'] })),
    seed_pass: best.result.seed_pass, seed_composite: best.result.seed_composite };
  fs.mkdirSync(OUTDIR, { recursive: true });
  const at = path.join(OUTDIR, `${course}-${seed}.json`);
  fs.writeFileSync(at, JSON.stringify(out, null, 2));
  console.log(`\nwrote ${at}`);
  for (const b of best.result.baskets) {
    console.log(`${pad(b.lego_index)} "${b.lego.known_text}" — ${b.score ? `${b.score.composite} ${b.score.pass ? 'PASS' : 'FAIL: ' + b.score.floor_failures.join(', ')}` : 'NO PHRASES'}`);
    b.phrases.forEach(p => console.log(`   ${p.lab_id.padEnd(7)} ${p.phrase_role.padEnd(5)} ${p.known_text} || ${p.target_text}`));
  }
  console.log(`\nSEED: ${best.result.seed_pass ? 'PASS' : 'FAIL'} (seed composite ${best.result.seed_composite}, context only)`);
}
main().catch(e => { console.error(e.message); process.exit(1); });
