#!/usr/bin/env node
/**
 * Generate candidate LEGOs and phrases for ONE seed, guided by the frame layer.
 *
 * The whole point of the artefacts in docs/frame-layer is that this is a
 * SELECTION task, not a phrase-writing task: the generator is handed the frames
 * it may instantiate, the split it must cross, the vocabulary it owns, and the
 * metric it will be scored by — then asked to choose, not to free-associate.
 *
 * WRITES NOTHING TO THE DATABASE. Output is a JSON file under labs/seed-lab/candidates/.
 * All LLM calls go through the Claude CLI (never the Anthropic SDK): repo rule.
 *
 * Usage: node tools/frame-layer/generate-candidates.cjs spa_for_eng 600 [--passes 2]
 */
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const { score } = require('./pattern-diversity.cjs');
const SEED_SPLITS = require('./seed-splits.cjs');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
const ROOT = path.join(__dirname, '..', '..');
const OUTDIR = path.join(ROOT, 'labs', 'seed-lab', 'candidates');

async function page(table, sel, f) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await f(sb.from(table).select(sel)).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data); if (data.length < 1000) break;
  }
  return out;
}

async function context(course, seed) {
  const { data: seedRow } = await sb.from('course_seeds').select('seed_number,known_text,target_text')
    .eq('course_code', course).eq('seed_number', seed).single();
  const legos = await page('course_legos', 'seed_number,lego_id,known_text,target_text,type',
    q => q.eq('course_code', course).lte('seed_number', seed).order('seed_number'));
  const live = await page('course_practice_phrases', 'phrase_role,known_text,target_text',
    q => q.eq('course_code', course).eq('seed_number', seed));
  return { seedRow, own: legos.filter(l => l.seed_number === seed), owned: legos, live };
}

function buildPrompt({ seedRow, own, owned, live }, course, splits, mapping, priorAttempt) {
  const patterns = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/frame-layer/english-pattern-inventory.json'), 'utf8'));
  const usable = patterns.patterns.filter(p => p.first_seed !== null && p.first_seed <= seedRow.seed_number)
    .map(p => `${p.id} ${p.name}: ${p.shape}  [class for this pair: ${mapping[p.id] || '—'}]`).join('\n');
  const vocab = owned.map(l => `${l.known_text}=${l.target_text}`).join('; ');
  const splitText = splits.map(s => `${s.id} ${s.name}\n  outcomes: ${s.outcomes.map(o => o.form).join('  |  ')}`).join('\n');
  return `You are writing candidate practice phrases for ONE seed of an SSi course. This is a SELECTION task against a frame inventory, not a phrase-writing task.

COURSE: ${course}   SEED ${seedRow.seed_number} (IMMUTABLE — do not restate, rewrite or alter it)
  known:  ${seedRow.known_text}
  target: ${seedRow.target_text}

THE LEGO(s) THIS SEED TEACHES (each phrase must contain its LEGO's exact target text):
${own.map(l => `  ${l.lego_id} [${l.type}] "${l.known_text}" / "${l.target_text}"`).join('\n')}

THE SPLIT THIS SEED EXISTS TO TEACH — the phrase set must CROSS it, and must carry each outcome in at least TWO DIFFERENT SHAPES (not one clause copied with its tail swapped):
${splitText || '  (none registered for this seed)'}

FRAMES YOU MAY INSTANTIATE (attested in the known-language corpus at or before this seed):
${usable}

VOCABULARY OWNED AT THIS SEED — you may use ONLY these known/target pairs plus the seed's own LEGOs. Do not invent, re-conjugate or contract beyond what is listed; you may inflect a verb only where a listed LEGO already shows that form.
${vocab}

WHAT IS LIVE TODAY (the set you are competing with — nine phrases, one matrix frame, tail swapped; it scores 0.333 and fails on FRAME and SPLIT):
${live.map(p => `  ${p.phrase_role}: ${p.known_text} || ${p.target_text}`).join('\n')}

YOU ARE SCORED ON:
  FRAME  distinct pattern signatures of each phrase's MATRIX CLAUSE / phrase count   (floor 0.34)
  POS    distinct positions of the LEGO in its phrase (initial/medial/final) / 3     (floor 0.34)
  NEIGH  (distinct left + distinct right neighbours of the LEGO) / (2 x phrases)     (floor 0.30)
  JUNCT  distinct (left neighbour -> right neighbour) junctions / phrase count       (floor 0.50)
  SPLIT  each outcome of the split carried by >= 2 distinct known-side skeletons     (floor 1.00)
Every floor must be cleared. Vary the MATRIX CLAUSE, not the tail.

METHODOLOGY RAILS, non-negotiable:
- ZUT: one known prompt maps to exactly one target form, everywhere.
- The known side is a controlled language too: no English structure or word the learner has not been given.
- BUILD phrases may be fragments but must extend naturally; USE phrases must be complete, natural sentences a native would say, never clunky.
- No parentheses, no explanations, no grammar labels anywhere in the text.
- Informal register (tú) unless the sentence itself insists otherwise.

PRODUCE exactly ${live.length} phrases (${live.filter(p => p.phrase_role === 'build').length} build, ${live.filter(p => p.phrase_role === 'use').length} use) — like for like with the live set.
${priorAttempt ? `\nYOUR PREVIOUS ATTEMPT SCORED ${priorAttempt.composite} and failed these floors: ${priorAttempt.floor_failures.join(', ')}. Fix exactly that; vary the matrix clause and carry BOTH halves of the split in several shapes.\nPrevious attempt:\n${priorAttempt.phrases.map(p => `  ${p.phrase_role}: ${p.known_text} || ${p.target_text}`).join('\n')}\n` : ''}
Reply with JSON ONLY, no prose, no code fence:
{"phrases":[{"phrase_role":"build|use","known_text":"...","target_text":"...","frame":"P-id","why":"one clause: which frame, and which side of the split"}]}`;
}

function callClaude(prompt) {
  // The repo's own helper: pins the config dir, injects the OAuth token, and
  // strips ANTHROPIC_API_KEY + CLAUDECODE. Never the Anthropic SDK.
  const { claudeEnv } = require(path.join(ROOT, 'services', 'shared', 'claude-config.cjs'));
  const env = claudeEnv(process.env);
  const CLAUDE = '/home/tomcassidy/.local/bin/claude';
  const out = execFileSync(CLAUDE, ['--print', '--model', 'sonnet'], {
    input: prompt, env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 300000,
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no JSON in model output:\n' + out.slice(0, 500));
  return JSON.parse(m[0]);
}

async function main() {
  const [course = 'spa_for_eng', seedArg = '600'] = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const passes = +(process.argv[process.argv.indexOf('--passes') + 1] || 1) || 1;
  const seed = +seedArg;
  const ctx = await context(course, seed);
  const splits = SEED_SPLITS[`${course}:${seed}`] || [];
  const mapping = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/frame-layer/pair-mapping-classes.json'), 'utf8'))
    .patterns.map(p => [p.id, p.pairs[course]?.class]));

  const attempts = [];
  let best = null, prior = null;
  for (let i = 0; i < passes; i++) {
    const prompt = buildPrompt(ctx, course, splits, mapping, prior);
    let parsed;
    try { parsed = callClaude(prompt); }
    catch (e) { attempts.push({ pass: i + 1, error: String(e.message).slice(0, 400) }); continue; }
    const phrases = parsed.phrases || [];
    const s = score(phrases, { lego: ctx.own[0].known_text, splits });
    attempts.push({ pass: i + 1, composite: s.composite, floor_failures: s.floor_failures, phrase_count: phrases.length });
    prior = { composite: s.composite, floor_failures: s.floor_failures, phrases };
    if (!best || (s.pass && !best.score.pass) || s.composite > best.score.composite) best = { phrases, score: s };
    if (s.pass) break;
  }
  if (!best) throw new Error('no usable generation: ' + JSON.stringify(attempts));

  const build_sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const out = { course, seed, generated: new Date().toISOString(), build_sha, model: 'sonnet',
    attempts, phrases: best.phrases, score: { ...best.score, detail: undefined } };
  fs.mkdirSync(OUTDIR, { recursive: true });
  const at = path.join(OUTDIR, `${course}-${seed}.json`);
  fs.writeFileSync(at, JSON.stringify(out, null, 2));
  console.log(`wrote ${at} — composite ${best.score.composite}, floors failed: ${best.score.floor_failures.join(', ') || 'none'}`);
  best.phrases.forEach(p => console.log(` ${p.phrase_role.padEnd(5)} ${p.known_text} || ${p.target_text}`));
}
main().catch(e => { console.error(e.message); process.exit(1); });
