#!/usr/bin/env node
/**
 * FRAME TAGGER: the ONE way the frame layer decides which frames a phrase uses.
 *
 * Tom, 2026-10-07 (r-2026-10-07-never-use-regex-to-classify-language): "Never
 * use regex to classify language (frames, grammar, meaning); use a model
 * (Haiku family) with clearly articulated definitions instead."
 *
 * So the definitions live in frame-codex.json (definition, five positives,
 * five near misses, boundary rules, how each frame surfaces in a non-English
 * known side), a Haiku-family model reads them, and every answer is CACHED
 * PER PHRASE TEXT, keyed by the codex version. The cache is course-agnostic: a
 * known text tagged for one course is never paid for again in another.
 *
 * Two halves, and why:
 *   ensureTagged(texts)  async: tags whatever the cache lacks, in batches,
 *                        writing each batch to disk the moment it returns, so
 *                        a killed run resumes and no paid call is lost.
 *   tagOf(text)          sync lookup. Callers that classify inside a filter or
 *                        a sort ask ensureTagged first, then read synchronously.
 *                        An untagged text THROWS: a silent "no frames" would
 *                        score a window as weak because the cache was cold.
 *
 * A tag is { frames: ['P1', ...], opener: bool }. `opener` means a detachable
 * discourse opener ("thank you,", "no problem", "well") sits at the front; the
 * model tags only what follows it, so an opener can never earn a frame.
 *
 * Nothing here matches language with a RegExp. The only patterns in this file
 * parse the MODEL's reply format ("12: O P1 P23"), which is machine syntax we
 * defined, not language. frame-tagger.test.cjs asserts both.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const CODEX = require('./frame-codex.json');
const CLAUDE = process.env.CLAUDE_BIN || path.join(require('os').homedir(), '.local', 'bin', 'claude');
const FRAME_IDS = CODEX.frames.map(f => f.id);
const idsOf = (codex) => codex.frames.map(f => f.id);
const STORE = process.env.FRAME_TAG_STORE
  || path.join(process.env.SSI_EVIDENCE_ROOT || path.join(require('os').homedir(), 'ssi-evidence', 'ssi-dashboard-v7'), 'frame-tags');

/** The cache key normalises whitespace and case only: the model sees the text as written. */
const words = (s) => String(s || '').replaceAll('\t', ' ').replaceAll('\n', ' ').replaceAll('\r', ' ').split(' ').filter(Boolean);
const ANALYSE = process.env.FRAME_TAG_ANALYSE !== '0'; // default ON: gold F1 0.77 -> 0.92 at equal tokens (2026-10-07)
/** Strip markdown/punctuation marks a model puts round an id: '**P1**', 'P23.', '(P5)'. Plumbing over the reply format. */
const MARKS = new Set(['*', '.', ';', ':', '(', ')', '[', ']', '`', '"', "'"]);
function trimMarks(t) { let a = 0, b = t.length; while (a < b && MARKS.has(t[a])) a++; while (b > a && MARKS.has(t[b - 1])) b--; return t.slice(a, b); }
const keyOf = (text) => words(text).join(' ').toLowerCase();

// ---------------------------------------------------------------- prompt
function renderCodex(codex = CODEX) {
  const lines = [codex.title, '', 'GENERAL RULES'];
  (codex.general_rules || []).forEach(r => lines.push(`- ${r}`));
  if (codex.non_english_known_side) {
    lines.push('', 'KNOWN SIDE IN A LANGUAGE OTHER THAN ENGLISH');
    codex.non_english_known_side.forEach(r => lines.push(`- ${r}`));
  }
  lines.push('', codex.frames_heading || 'FRAMES');
  for (const f of codex.frames) {
    lines.push('', `${f.id} ${f.name}  (shape: ${f.shape})`, `  Definition: ${f.definition}`,
      `  Fires: ${(f.positives || []).map(p => `"${p}"`).join('; ')}`,
      `  Does not fire: ${(f.near_misses || []).map(n => `"${n.text}" (${n.why})`).join('; ')}`);
    if (f.boundary && f.boundary.length) lines.push(`  Boundary: ${f.boundary.join(' ')}`);
    if (f.other_languages) lines.push(`  Other languages: ${f.other_languages}`);
  }
  lines.push('', 'OUTPUT', codex.output);
  return lines.join('\n');
}

const SYSTEM = (codex = CODEX) => `${codex.task || "You tag phrases from a language course with grammatical frames"}, using exactly the codex below. You reply with the requested lines only, no prose.\n\n${renderCodex(codex)}`;

/**
 * `analyse` asks the model to name the constructions it sees before the ids
 * ("3: says+clause; shouldn't; => P7 P12 P23"). It costs output tokens and is
 * kept only if the gold set says it buys accuracy (gold/measure-gold.cjs).
 */
function buildPrompt(items, { knownLanguage, analyse = ANALYSE, codex } = {}) {
  const lang = knownLanguage ? `The phrases are in ${knownLanguage}. ` : '';
  // A codex without openers (D, X, C, S) states its own request and example.
  const form = analyse
    ? `<number>: <a few words naming each construction you see, separated by ;> => <O and/or frame ids, or ->
${(codex && codex.example) || "Example: 7: but-opener; want + to-verb; don't; tomorrow => O P1 P23 P28"}`
    : `<number>: <O and/or frame ids, or ->`;
  return `${lang}${(codex && codex.request) || 'For EACH numbered phrase, give the frame ids it instantiates, per the codex. Put O first if the phrase starts with a detachable opener.'} Reply with exactly one line per phrase, in order:
${form}

PHRASES:
${items.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
}

/**
 * Parse the model's reply. Reads a line as "<n>: tokens" by splitting on the
 * first colon and on whitespace, no pattern matching: the reply format is ours.
 */
function parseReply(text, n, ids = FRAME_IDS) {
  const out = new Array(n).fill(null);
  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    const colon = [':', '.', ')'].map(c => line.indexOf(c)).filter(i => i > 0).sort((a, b) => a - b)[0];
    if (colon === undefined) continue;
    const num = Number(line.slice(0, colon).trim());
    if (!Number.isInteger(num) || num < 1 || num > n) continue;
    const body = line.slice(colon + 1);
    const arrow = body.lastIndexOf('=>');
    const tokens = words((arrow >= 0 ? body.slice(arrow + 2) : body).replaceAll(',', ' ')).map(t => trimMarks(t).toUpperCase()).filter(Boolean);
    // An answer is ONLY ids, O and '-'. Anything else ("unable to classify", an
    // analysis with no '=>') is MALFORMED and stays null, so ensureTagged retries
    // it rather than caching it as "no frames" (review #115: a malformed reply
    // read as a negative made false coverage gaps). Empty needs an explicit '-' or O.
    if (!tokens.length || !tokens.every(t => t === 'O' || t === '-' || ids.includes(t))) continue;
    const frames = [...new Set(tokens.filter(t => ids.includes(t)))].sort((a, b) => ids.indexOf(a) - ids.indexOf(b));
    out[num - 1] = { frames, opener: tokens.includes('O') };
  }
  return out;
}

// ---------------------------------------------------------------- model
function callModel(prompt, { model = process.env.FRAME_TAG_MODEL || 'haiku', system = SYSTEM(), timeoutMs = 600000 } = {}) {
  const { claudeEnv } = require(path.join(ROOT, 'services', 'shared', 'claude-config.cjs'));
  const args = ['--print', '--model', model, '--output-format', 'json', '--tools', '',
    '--system-prompt', system, '--exclude-dynamic-system-prompt-sections'];
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const ch = spawn(CLAUDE, args, { env: claudeEnv(process.env), cwd: process.env.TMPDIR || require('os').tmpdir() });
    let so = '', se = '';
    ch.stdout.on('data', d => { so += d; }); ch.stderr.on('data', d => { se += d; });
    const timer = setTimeout(() => ch.kill('SIGTERM'), timeoutMs);
    ch.on('close', () => {
      clearTimeout(timer);
      try {
        const j = JSON.parse(so);
        if (j.is_error) return reject(new Error('model error: ' + String(j.result).slice(0, 300)));
        const u = j.usage || {};
        const usage = { input: u.input_tokens || 0, cache_create: u.cache_creation_input_tokens || 0, cache_read: u.cache_read_input_tokens || 0,
          output: u.output_tokens || 0, cost_usd: j.total_cost_usd || 0, model: Object.keys(j.modelUsage || {})[0] || null, ms: Date.now() - t0 };
        usage.total = usage.input + usage.cache_create + usage.cache_read + usage.output;
        resolve({ text: j.result, usage });
      } catch (e) { reject(new Error('unparseable CLI output: ' + (se || so).slice(0, 300))); }
    });
    ch.stdin.end(prompt);
  });
}

// ---------------------------------------------------------------- cache
/**
 * One JSONL file per codex version: {k, text, frames, opener, model}. Appends
 * only, so parallel batches never clobber each other and a crash loses at
 * most the batch in flight. Loaded once per process.
 */
class TagCache {
  constructor({ dir = STORE, codex = CODEX, model = 'haiku' } = {}) {
    const version = codex.version;
    this.file = path.join(dir, `tags-${codex.id}-${version}-${model}.jsonl`);
    this.version = version;
    this.map = new Map();
    this.usage = [];
    if (fs.existsSync(this.file)) {
      for (const line of fs.readFileSync(this.file, 'utf8').split('\n')) {
        if (!line) continue;
        try { const r = JSON.parse(line); this.map.set(r.k, { frames: r.frames, opener: !!r.opener }); } catch { /* torn last line */ }
      }
    }
  }
  has(text) { return this.map.has(keyOf(text)); }
  get(text) { return this.map.get(keyOf(text)) || null; }
  put(entries, model) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const lines = entries.map(([text, tag]) => {
      this.map.set(keyOf(text), tag);
      return JSON.stringify({ k: keyOf(text), text, frames: tag.frames, opener: tag.opener, model });
    });
    if (lines.length) fs.appendFileSync(this.file, lines.join('\n') + '\n');
  }
}

/** One cache per codex id; tests (and gold runs against a candidate codex) swap one in. */
const CACHES = new Map();
const defaultCache = (codex = CODEX) => {
  if (!CACHES.has(codex.id)) CACHES.set(codex.id, new TagCache({ codex }));
  return CACHES.get(codex.id);
};
function useCache(c, codex = CODEX) { CACHES.set(codex.id, c); return c; }

/** An in-memory cache for tests: { text: {frames, opener} }. Never touches disk or a model. */
class MemoryCache {
  constructor(tags = {}) { this.map = new Map(Object.entries(tags).map(([t, v]) => [keyOf(t), { frames: v.frames || v, opener: !!v.opener }])); }
  has(text) { return this.map.has(keyOf(text)); }
  get(text) { return this.map.get(keyOf(text)) || null; }
  put(entries) { for (const [t, tag] of entries) this.map.set(keyOf(t), tag); }
}

/**
 * Tag every text the cache lacks. Batches of `batch`, `parallel` at once; a
 * batch whose reply misses some lines retries those lines once on their own.
 * Returns a ledger: calls, tokens, untagged (texts the model never answered).
 */
async function ensureTagged(texts, { codex = CODEX, cache = defaultCache(codex), batch = 40, parallel = 4, model = 'haiku', // batch 40: the size the gold set was measured at
  knownLanguage, log = (s) => process.stderr.write(s + '\n'), call = callModel } = {}) {
  const todo = [...new Set(texts.map(t => String(t || '').trim()).filter(Boolean))].filter(t => !cache.has(t));
  const ledger = { requested: texts.length, missing: todo.length, calls: 0, tokens: 0, output_tokens: 0, cost_usd: 0, untagged: [] };
  if (!todo.length) return ledger;
  const system = SYSTEM(codex);
  const batches = [];
  for (let i = 0; i < todo.length; i += batch) batches.push(todo.slice(i, i + batch));
  let next = 0;
  const runOne = async (items, attempt) => {
    const r = await call(buildPrompt(items, { knownLanguage, codex }), { model, system });
    ledger.calls++; ledger.tokens += r.usage.total; ledger.output_tokens += r.usage.output; ledger.cost_usd += r.usage.cost_usd;
    const tags = parseReply(r.text, items.length, idsOf(codex));
    cache.put(items.map((t, i) => [t, tags[i]]).filter(([, tag]) => tag), model);
    const gaps = items.filter((_, i) => !tags[i]);
    log(`  tagged ${items.length - gaps.length}/${items.length} (${r.usage.total} tokens, ${Math.round(r.usage.ms / 1000)}s)`);
    // retry what the model left unanswered or malformed: once as a batch, then in tens
    if (gaps.length && attempt === 1) await runOne(gaps, 2);
    else if (gaps.length && attempt === 2) for (let i = 0; i < gaps.length; i += 10) await runOne(gaps.slice(i, i + 10), 3);
    else ledger.untagged.push(...gaps);
  };
  const worker = async () => {
    while (next < batches.length) {
      const b = batches[next++];
      try { await runOne(b, 1); } catch (e) {
        log(`  batch failed: ${e.message}; retrying once`);
        try { await runOne(b, 2); } catch (e2) { log(`  batch failed again: ${e2.message}`); ledger.untagged.push(...b); }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallel, batches.length) }, worker));
  return ledger;
}

/** Sync: the tag for a text that ensureTagged has seen. Throws if it was never tagged. */
function tagOf(text, cache = defaultCache()) {
  if (cache && cache.frames) cache = defaultCache(cache); // a codex was passed
  const t = cache.get(text);
  if (!t) throw new Error(`frame-tagger: "${String(text).slice(0, 80)}" is not tagged; call ensureTagged first`);
  return t;
}
const framesOf = (text, cache) => (String(text || '').trim() ? tagOf(text, cache).frames : []);
const hasOpener = (text, cache) => (String(text || '').trim() ? tagOf(text, cache).opener : false);

/** Known language of a course code: the part after "_for_", as an ISO 639-3 code. */
function knownLanguageOf(course) {
  const i = String(course).lastIndexOf('_for_');
  return i < 0 ? 'eng' : String(course).slice(i + 5);
}
const LANGUAGE_NAMES = { eng: 'English', hin: 'Hindi', tam: 'Tamil', kan: 'Kannada', guj: 'Gujarati', mar: 'Marathi', ben: 'Bengali',
  pan: 'Punjabi', sin: 'Sinhala', urd: 'Urdu', tel: 'Telugu', jpn: 'Japanese', spa: 'Spanish', fra: 'French', por: 'Portuguese',
  ita: 'Italian', ara: 'Arabic', deu: 'German', kor: 'Korean', zho: 'Chinese', yor: 'Yoruba', gle: 'Irish', cym: 'Welsh' };
const knownLanguageName = (course) => LANGUAGE_NAMES[knownLanguageOf(course)] || knownLanguageOf(course);

module.exports = { CODEX, FRAME_IDS, idsOf, MemoryCache, renderCodex, buildPrompt, parseReply, callModel, TagCache, useCache, defaultCache,
  ensureTagged, tagOf, framesOf, hasOpener, keyOf, knownLanguageOf, knownLanguageName };

if (require.main === module) {
  // node tools/frame-layer/frame-tagger.cjs --render   prints the codex exactly as the model reads it
  if (process.argv.includes('--render')) console.log(SYSTEM());
}
