#!/usr/bin/env node
/**
 * THE NATURALNESS PASS — a cross-family judge reads every phrase in BOTH
 * languages and says whether a native speaker would say it.
 *
 * Tom, 2026-09-27: the five floors cannot hear. Clunky lines ("I'm not trying
 * to improve today") and one collocation stamped across a basket (German
 * "besser werden" five times) pass every mechanical gate. So a judge that is
 * NOT Claude (the generator is Opus; verification crosses families) reads each
 * basket and flags, per phrase:
 *   - unnatural KNOWN side (the English prompt) — nobody would say it;
 *   - unnatural TARGET side — grammatical but not what a native reaches for,
 *     or wrong;
 * and, per basket, any COLLOCATION OVER-REUSE: one multi-word collocation in
 * three or more of the basket's phrases.
 * Flagged baskets go back to the generator with the judge's words as the
 * rewrite instruction (generateLegoPhrases' `revise`), then are judged again.
 *
 * THE JUDGE is Codex (`codex exec`, read-only sandbox, one call at a time,
 * baskets batched). It is the only non-Claude family that authenticates on
 * this box (the Gemini CLI was retired for personal accounts, 2026-09-27).
 * Calls are strictly serial: the Codex credential is one refresh token shared
 * with the command surface's own Astra lanes.
 *
 * Arms: `--cands <dir>` judges v3 candidates (run-course-v3 layout);
 * `--live <course> --seeds a,b,…` judges the LIVE baskets at those seeds, so
 * old and v3 rates come off the same judge with the same prompt.
 *
 * READ-ONLY with respect to the database. Writes a JSONL of verdicts.
 *
 *   node tools/phrase-lab/naturalness-judge.cjs ita_for_eng --cands <dir> --out nat-v3.jsonl [--batch 15] [--model gpt-5.6-terra]
 *   node tools/phrase-lab/naturalness-judge.cjs ita_for_eng --live --seeds 20,45,… --out nat-live.jsonl
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const CODEX_BIN = process.env.CODEX_BIN || path.join(os.homedir(), '.npm-global', 'bin', 'codex');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i === -1 ? d : process.argv[i + 1]; };

const LANG = { ita: 'Italian', deu: 'German', fra: 'French', spa: 'Spanish' };

function judgePrompt(targetLang, baskets) {
  const body = baskets.map((b) => [
    `## ${b.key} — new chunk being practised: "${b.legoKnown}" = "${b.legoTarget}"`,
    ...b.phrases.map((p, i) => `${i}. EN: ${p.known}  ||  ${targetLang.toUpperCase()}: ${p.target}`),
  ].join('\n')).join('\n\n');
  return `You are a native-level editor of English and ${targetLang}. These are practice sentences from a spoken ${targetLang} course for English speakers: the learner hears the English and says the ${targetLang}. Fragments are allowed; teaching the new chunk is the point.

Judge each sentence for ONE thing: is it NATURAL — something a native speaker would actually say, in that language, in some real situation?
- en_ok=false if the English is clunky, contrived or something nobody says (e.g. "I'm not trying to improve today", "I want to learn how to learn Spanish").
- tl_ok=false if the ${targetLang} is wrong, or grammatical but not what a native would say for that meaning (wrong collocation, calque, odd register, missing article/elision a native would use).
Do NOT judge vocabulary level, difficulty, or whether it teaches well. Short plain sentences are fine.

The new chunk's own wording is FIXED — every sentence must contain it, so never flag a sentence only because of the chunk's own wording. If the chunk's English or ${targetLang} wording is itself unnatural, say so ONCE in the basket's "gloss" field instead.

Also, per basket: if one multi-word collocation (not the new chunk itself) appears in 3 or more of the basket's sentences, name it in "overused".

Return JSON only, no prose:
{"baskets":[{"key":"<key>","gloss":"<empty, or why the chunk's own wording is unnatural>","overused":["<collocation> xN"],"flags":[{"i":<index>,"en_ok":<bool>,"tl_ok":<bool>,"why":"<≤15 words>","fix":"<a natural version, both languages, or empty>"}]}]}
List in "flags" ONLY sentences with en_ok=false or tl_ok=false. A basket with nothing wrong has "flags":[], "overused":[] and "gloss":"".

${body}`;
}

/** One serial codex call. Returns parsed JSON or throws. */
function codexJudge(prompt, model) {
  const out = path.join(os.tmpdir(), `nat-judge-${process.pid}-${Date.now()}.txt`);
  return new Promise((resolve, reject) => {
    const env = { ...process.env, PATH: `${path.dirname(CODEX_BIN)}:${process.env.PATH}` };
    // ONE CODEX CALL AT A TIME, BOX-WIDE, across every judge process this pass
    // runs (the chain's and the slot pilot's): flock on one lock file.
    const lock = path.join(os.homedir(), '.cs-codex-judge.lock');
    const child = spawn('flock', [lock, CODEX_BIN, 'exec', '--sandbox', 'read-only', '--skip-git-repo-check', '-C', os.tmpdir(), '-o', out, '-m', model, '-'],
      { env, stdio: ['pipe', 'ignore', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => { err += d; });
    child.stdin.end(prompt);
    const timer = setTimeout(() => child.kill('SIGTERM'), 15 * 60 * 1000);
    child.on('exit', (code) => {
      clearTimeout(timer);
      let text = '';
      try { text = fs.readFileSync(out, 'utf8'); fs.unlinkSync(out); } catch { /* reported below */ }
      if (code !== 0 && !text) return reject(new Error(`codex exit ${code}: ${err.slice(-300)}`));
      const i = text.indexOf('{'); const j = text.lastIndexOf('}');
      if (i === -1) return reject(new Error(`no JSON from judge: ${text.slice(0, 200)}`));
      try { resolve(JSON.parse(text.slice(i, j + 1))); } catch (e) { reject(new Error(`bad judge JSON: ${e.message}`)); }
    });
  });
}

function loadCandidates(dir, only) {
  const out = [];
  for (const sd of fs.readdirSync(dir).filter((d) => /^seed-\d+$/.test(d)).sort()) {
    for (const f of fs.readdirSync(path.join(dir, sd)).filter((x) => /^S\d+L\d+\.json$/.test(x) || x.endsWith('.json'))) {
      if (f === 'run-log.jsonl') continue;
      let r;
      try { r = JSON.parse(fs.readFileSync(path.join(dir, sd, f), 'utf8')); } catch { continue; } // mid-write by the generator; next pass
      if (!r.seedNumber || r.seedNumber < 11) continue;
      const key = `S${String(r.seedNumber).padStart(4, '0')}L${String(r.legoIndex).padStart(2, '0')}`;
      if (only && !only.has(key)) continue;
      const phrases = [...(r.build || []).map((p) => ({ ...p, role: 'build' })), ...(r.use || []).map((p) => ({ ...p, role: 'use' }))];
      if (phrases.length) out.push({ key, file: path.join(dir, sd, f), seed: r.seedNumber, legoIndex: r.legoIndex, legoKnown: r.legoKnown, legoTarget: r.legoTarget, phrases });
    }
  }
  return out;
}

async function loadLive(course, seeds) {
  const { supabase } = require('../../services/supabase-client.cjs');
  const { fetchLivePhrases } = require('./score.cjs');
  const { data: legos } = await supabase.from('course_legos').select('seed_number,lego_index,known_text,target_text')
    .eq('course_code', course).in('seed_number', seeds).order('seed_number').order('lego_index');
  const out = [];
  for (const l of legos || []) {
    const phrases = await fetchLivePhrases(supabase, course, l.seed_number, l.lego_index);
    const key = `S${String(l.seed_number).padStart(4, '0')}L${String(l.lego_index).padStart(2, '0')}`;
    if (phrases.length) out.push({ key, seed: l.seed_number, legoIndex: l.lego_index, legoKnown: l.known_text, legoTarget: l.target_text, phrases });
  }
  return out;
}

/** Judge baskets in serial batches; append one verdict line per basket. Resumable by key. */
async function judgeBaskets(course, baskets, outFile, { batch = 15, model = 'gpt-5.6-terra' } = {}) {
  const targetLang = LANG[course.split('_')[0]] || course;
  const done = new Set(fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l).key) : []);
  const todo = baskets.filter((b) => !done.has(b.key));
  let failed = 0;
  for (let k = 0; k < todo.length; k += batch) {
    const slice = todo.slice(k, k + batch);
    const started = Date.now();
    let parsed;
    try { parsed = await codexJudge(judgePrompt(targetLang, slice), model); } catch (e) {
      console.error(`[nat] batch ${slice[0].key}… FAILED: ${e.message}`);
      failed += slice.length;
      continue; // unjudged baskets stay unjudged and are counted as holes, never as clean
    }
    for (const b of slice) {
      const v = (parsed.baskets || []).find((x) => x.key === b.key);
      if (!v) continue;
      const flags = (v.flags || []).filter((f) => Number.isInteger(f.i) && f.i >= 0 && f.i < b.phrases.length && (f.en_ok === false || f.tl_ok === false));
      fs.appendFileSync(outFile, JSON.stringify({
        key: b.key, seed: b.seed, file: b.file || null, phrases: b.phrases.length,
        flagged: flags.length, enFlags: flags.filter((f) => f.en_ok === false).length, tlFlags: flags.filter((f) => f.tl_ok === false).length,
        overused: v.overused || [],
        gloss: v.gloss || '',
        flags: flags.map((f) => ({ ...f, known: b.phrases[f.i].known, target: b.phrases[f.i].target, role: b.phrases[f.i].role })),
        model, ms: Date.now() - started,
      }) + '\n');
    }
    console.error(`[nat] ${Math.min(k + batch, todo.length)}/${todo.length} baskets judged (${((Date.now() - started) / 1000).toFixed(0)}s)`);
  }
  return { judged: todo.length - failed, failed };
}

async function main() {
  const course = process.argv[2];
  const outFile = arg('--out');
  const batch = +arg('--batch', 15);
  const model = arg('--model', 'gpt-5.6-terra');
  let baskets;
  if (process.argv.includes('--live')) baskets = await loadLive(course, arg('--seeds').split(',').map(Number));
  else baskets = loadCandidates(arg('--cands'), arg('--keys') ? new Set(arg('--keys').split(',')) : null);
  if (arg('--limit')) baskets = baskets.slice(0, +arg('--limit'));
  await judgeBaskets(course, baskets, outFile, { batch, model });
}

module.exports = { judgePrompt, codexJudge, judgeBaskets, loadCandidates, loadLive };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
