/**
 * The model call behind generate-v4, for either provider — the Codex adapter (#438·AD).
 *
 * WHY THIS EXISTS: Tom is trialling whether Codex (his prepaid Codex credits) can write
 * Popty phrase baskets alongside or instead of Claude Opus (2026-11-05: "we should try
 * 10 LEGOS at random on both"). A fair trial needs the two models to see the SAME prompt
 * text, the SAME admitted list and to be judged by the SAME gates, so this module owns
 * ONLY the transport: it takes the prompt generate-v4 already built and returns the raw
 * reply text plus usage in one ledger shape. JSON extraction, gates, floors and the retry
 * rule stay in generate-v4 and are shared by both providers.
 *
 * Provider is chosen by `--provider claude|codex` on generate-v4 (or V4_PROVIDER); the
 * default is claude, so every existing caller behaves exactly as before.
 *
 * Fairness points that are fixed here, not left to the caller:
 *   - SYSTEM LINE. Claude gets SYSTEM_LINE as --system-prompt. `codex exec` has no
 *     system-prompt flag, so Codex gets the same sentence as the first paragraph of its
 *     prompt. Same words, different channel; Codex's own harness preamble cannot be removed.
 *   - EFFORT. The same EFFORT label (V4_EFFORT, default low) goes to both: Claude --effort,
 *     Codex model_reasoning_effort.
 *   - NO TOOLS. Claude runs with --tools ''. Codex runs `--sandbox read-only` from an EMPTY
 *     scratch directory, so it cannot write anywhere and has no repo (and no AGENTS.md) to
 *     read — it only has to answer.
 *
 * Codex auth: Tom's ChatGPT subscription via a logged-in CODEX_HOME, never OPENAI_API_KEY
 * (deleted from the child env below). LANE DOCTRINE: any script that calls codex directly
 * takes one of the four device-login homes ~/.codex-lanes/1..4 and holds its lock while the
 * call runs, using the same <home>/.held O_EXCL protocol as command-surface/lane-lock.js
 * (pid-named, stale when the pid is dead), so we never share auth/session state with a
 * surface job. HOW THE LANE IS CHOSEN: CS_CODEX_LANE=<1..4> pins one (and waits for it);
 * otherwise the first free lane in 1..4 is taken. One lane per call, never more.
 *
 * Model: Claude = V4_MODEL (family name, as before). Codex = V4_CODEX_MODEL if set, else the
 * account's default (no -m flag). The model that actually SERVED is read back from the
 * session's rollout file (turn_context.model) and recorded, because a default is not a fact.
 *
 * Cost: Claude's CLI reports total_cost_usd and it is recorded as cost_usd. The Codex CLI
 * reports tokens only — it spends subscription credits and states no price — so a Codex
 * call records cost_usd 0 with cost_basis 'codex: not reported by the CLI (credits); tokens only'.
 * Nothing here invents a price.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SYSTEM_LINE = 'You write practice phrases for a language course. You follow the rails exactly and reply with JSON only.';
const CLAUDE = '/home/tomcassidy/.local/bin/claude';
const CODEX = process.env.CODEX_BIN || path.join(os.homedir(), '.npm-global', 'bin', 'codex');
const LANES_DIR = process.env.CODEX_LANES_DIR || path.join(os.homedir(), '.codex-lanes');

const providerOf = () => (process.env.V4_PROVIDER || 'claude').toLowerCase();

// ---------- claude (unchanged behaviour, moved here from generate-v4) ----------
function claudeArgs({ model, effort }) {
  return ['--print', '--model', model, '--effort', effort, '--output-format', 'json', '--tools', '',
    '--system-prompt', SYSTEM_LINE, '--exclude-dynamic-system-prompt-sections'];
}

function callClaude(prompt, { model, effort, timeoutMs, root }) {
  const { claudeEnv } = require(path.join(root, 'services', 'shared', 'claude-config.cjs'));
  const t0 = Date.now();
  const env = { ...claudeEnv(process.env), MAX_THINKING_TOKENS: String(process.env.V4_THINKING || 3000) };
  let raw;
  try {
    raw = execFileSync(CLAUDE, claudeArgs({ model, effort }), { input: prompt, env, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    // The CLI reports a usage limit on STDOUT as {is_error, result}; stderr is empty (#924).
    let said = '';
    try { said = JSON.parse(String(e.stdout || '')).result || ''; } catch { said = String(e.stdout || '').slice(0, 300); }
    throw new Error(`claude --print failed: ${said ? said + ' — ' : ''}${String(e.stderr || e.message).slice(0, 300)}`);
  }
  const j = JSON.parse(raw);
  if (j.is_error) throw new Error(`model error: ${String(j.result).slice(0, 300)}`);
  const u = j.usage || {};
  const usage = { provider: 'claude', input: u.input_tokens || 0, cache_create: u.cache_creation_input_tokens || 0, cache_read: u.cache_read_input_tokens || 0,
    output: u.output_tokens || 0, thinking: (u.output_tokens_details || {}).thinking_tokens ?? null,
    cost_usd: j.total_cost_usd || 0, cost_basis: 'claude: total_cost_usd from the CLI',
    model: Object.keys(j.modelUsage || {})[0] || null, effort, ms: Date.now() - t0 };
  usage.total = usage.input + usage.cache_create + usage.cache_read + usage.output;
  return { text: String(j.result || ''), usage };
}

// ---------- codex lane lock (same protocol as command-surface/lane-lock.js) ----------
const lockFile = (home) => path.join(home, '.held');
function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}
function tryTake(home) {
  for (let i = 0; i < 3; i++) {
    try { fs.writeFileSync(lockFile(home), JSON.stringify({ pid: process.pid, owner: 'popty-generate-v4' }), { flag: 'wx' }); return true; }
    catch (e) {
      if (e.code !== 'EEXIST') return false;
      let l = null; try { l = JSON.parse(fs.readFileSync(lockFile(home), 'utf8')); } catch {}
      if (l && pidAlive(l.pid)) return false;
      try { fs.unlinkSync(lockFile(home)); } catch {}
    }
  }
  return false;
}
function release(home) {
  try { const l = JSON.parse(fs.readFileSync(lockFile(home), 'utf8')); if (l.pid === process.pid) fs.unlinkSync(lockFile(home)); } catch {}
}
const sleepMs = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function takeLane({ waitMs = 30 * 60 * 1000 } = {}) {
  const pinned = process.env.CS_CODEX_LANE;
  const homes = (pinned ? [pinned] : ['1', '2', '3', '4']).map(n => path.join(LANES_DIR, n)).filter(h => fs.existsSync(path.join(h, 'auth.json')));
  if (!homes.length) throw new Error(`no logged-in codex lane under ${LANES_DIR}${pinned ? ` (CS_CODEX_LANE=${pinned})` : ''}`);
  const until = Date.now() + waitMs;
  for (;;) {
    for (const h of homes) if (tryTake(h)) return h;
    if (Date.now() > until) throw new Error(`no free codex lane in ${waitMs / 60000} min (${homes.join(', ')})`);
    sleepMs(15000);
  }
}

// ---------- codex ----------
function codexArgs({ model, effort, cwd, lastMsg }) {
  const a = ['exec', '--json', '--sandbox', 'read-only', '--skip-git-repo-check', '-C', cwd, '-o', lastMsg];
  if (model) a.push('-m', model);
  if (/^(minimal|low|medium|high)$/.test(effort)) a.push('-c', `model_reasoning_effort="${effort}"`);
  a.push('-'); // prompt on stdin: the same bytes generate-v4 hands to claude, behind the system line
  return a;
}

/** Which model served a codex thread: its rollout file's turn_context, else null. */
function servedModel(home, threadId) {
  if (!threadId) return null;
  const base = path.join(home, 'sessions');
  const days = [0, 1].map(d => new Date(Date.now() - d * 864e5)).map(d => path.join(base, String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')));
  for (const dir of days) {
    let files = []; try { files = fs.readdirSync(dir).filter(f => f.includes(threadId)); } catch {}
    for (const f of files) {
      const m = fs.readFileSync(path.join(dir, f), 'utf8').match(/"type":"turn_context","payload":\{[^\n]*?"model":"([^"]+)"/);
      if (m) return m[1];
    }
  }
  return null;
}

/** Codex JSONL stdout → { threadId, usage, text, errors }. Shapes as codex-cli 0.164 emits them. */
function parseCodexEvents(stdout) {
  const out = { threadId: null, usage: null, text: '', errors: [] };
  for (const line of String(stdout).split('\n')) {
    let ev; try { ev = JSON.parse(line); } catch { continue; }
    if (ev.type === 'thread.started') out.threadId = ev.thread_id || null;
    if (ev.usage) out.usage = ev.usage;
    if (ev.item && ev.item.type === 'agent_message' && ev.item.text) out.text = ev.item.text;
    if (/error|failed/.test(ev.type || '')) out.errors.push(ev.message || (ev.error && ev.error.message) || JSON.stringify(ev).slice(0, 300));
  }
  return out;
}

function callCodex(prompt, { model, effort, timeoutMs }) {
  const scratch = fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'v4-codex-'));
  const lastMsg = path.join(scratch, 'last.txt');
  const cwd = path.join(scratch, 'empty'); fs.mkdirSync(cwd);
  const home = takeLane();
  const env = { ...process.env, CODEX_HOME: home };
  delete env.OPENAI_API_KEY; // subscription credits only — never an API key
  const t0 = Date.now();
  let stdout = '';
  try {
    try {
      stdout = execFileSync(CODEX, codexArgs({ model, effort, cwd, lastMsg }), { input: `${SYSTEM_LINE}\n\n${prompt}`, env, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 });
    } catch (e) {
      const ev = parseCodexEvents(e.stdout || '');
      throw new Error(`codex exec failed: ${ev.errors.join(' | ') || String(e.stderr || e.message).slice(0, 400)}`);
    }
    const ev = parseCodexEvents(stdout);
    let text = ''; try { text = fs.readFileSync(lastMsg, 'utf8'); } catch {}
    if (!text) text = ev.text;
    if (!text) throw new Error(`codex returned no answer${ev.errors.length ? ': ' + ev.errors.join(' | ') : ''}`);
    const u = ev.usage || {};
    // cached_input_tokens is a SUBSET of input_tokens in codex's usage; split it so the ledger's
    // input/cache_read mean the same thing for both providers (fresh input vs cache hits).
    const cached = u.cached_input_tokens || 0;
    const usage = { provider: 'codex', input: Math.max(0, (u.input_tokens || 0) - cached), cache_create: u.cache_write_input_tokens || 0, cache_read: cached,
      output: u.output_tokens || 0, thinking: u.reasoning_output_tokens ?? null,
      cost_usd: 0, cost_basis: 'codex: not reported by the CLI (credits); tokens only',
      model: servedModel(home, ev.threadId) || model || null, effort, lane: path.basename(home), thread: ev.threadId, ms: Date.now() - t0 };
    usage.total = usage.input + usage.cache_create + usage.cache_read + usage.output;
    return { text, usage };
  } finally {
    release(home);
    try { fs.rmSync(scratch, { recursive: true, force: true }); } catch {}
  }
}

/**
 * One model call. Returns { text, usage }; the caller extracts JSON and gates it, identically
 * for both providers. opts: { provider, model (claude family), codexModel, effort, timeoutMs, root }.
 */
function callProvider(prompt, opts) {
  const provider = (opts.provider || providerOf()).toLowerCase();
  if (provider === 'claude') return callClaude(prompt, opts);
  if (provider === 'codex') return callCodex(prompt, { ...opts, model: opts.codexModel || process.env.V4_CODEX_MODEL || null });
  throw new Error(`unknown provider "${provider}" (claude|codex)`);
}

module.exports = { callProvider, claudeArgs, codexArgs, parseCodexEvents, servedModel, providerOf, SYSTEM_LINE };

// Tiny hand probe: node model-provider.cjs <claude|codex> "<prompt>"
if (require.main === module) {
  const [p, ...rest] = process.argv.slice(2);
  const r = callProvider(rest.join(' ') || 'Reply with JSON only: {"phrases":[{"known":"I want","target":"quiero"}]}',
    { provider: p, model: process.env.V4_MODEL || 'opus', effort: process.env.V4_EFFORT || 'low', timeoutMs: 600000, root: path.join(__dirname, '..', '..', '..') });
  console.log(JSON.stringify(r, null, 1));
}
