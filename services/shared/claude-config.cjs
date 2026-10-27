/**
 * Deterministic Claude Code account for every `claude` CLI this repo spawns.
 *
 * The problem this closes: spawn sites used to rely on the ambient default
 * `~/.claude` profile, so a headless build billed whatever account that
 * profile happened to hold (it was logged out 2026-07-09). Pinning
 * CLAUDE_CONFIG_DIR forces every nested CLI call to the claude@ account
 * (config dir below, oauthAccount = claude@saysomethingin.com).
 *
 * Two shapes of spawn site, two helpers:
 *   - child_process spawn/exec with an env object  -> claudeEnv(base)
 *   - shell command strings run in a fresh login shell (osascript/iTerm
 *     write-text, or exec of a `cd … && claude …` string) where the parent
 *     env object does NOT propagate -> prepend claudeConfigExport()
 *
 * Deliberately keyed off a dedicated override var (SSI_CLAUDE_CONFIG_DIR),
 * NOT an ambient CLAUDE_CONFIG_DIR — so a wrong config dir inherited from a
 * parent process can never silently win. Default is the account-3 dir,
 * resolved against THIS machine's home: the previous hardcoded
 * '/Users/tomcassidy/…' was the Mac's home, so on watson-1 (Linux,
 * /home/tomcassidy) every spawned CLI got a nonexistent config dir, had no
 * OAuth login, fell back to the stale ANTHROPIC_API_KEY in .env, and died
 * with "401 API key is invalid" (the 2026-08-04 nld_for_eng backfill).
 *
 * Auth on machines with no keychain (Linux VMs): the CLI stores no
 * .credentials.json here; the working credential is the long-lived OAuth
 * token in <config dir>/.cs-oauth-token, passed via CLAUDE_CODE_OAUTH_TOKEN.
 * Both helpers inject it when the file exists and no-op when it doesn't
 * (Mac keeps using keychain credentials). The shell form reads the file at
 * spawn time — `$(cat …)` — so the token is never written into the /tmp
 * spawn scripts the terminal path creates.
 *
 * Both helpers also strip ANTHROPIC_API_KEY and CLAUDECODE: every CLI this
 * repo spawns must bill the subscription, never the .env key (that key
 * exists only for the dashboard env-switcher), and CLAUDECODE must not leak
 * into nested CLI calls. Individual spawn sites used to unset these
 * per-command; the one that forgot (component-backfill) is why the 401
 * surfaced — doing it here makes forgetting impossible.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

const CLAUDE_CONFIG_DIR =
  process.env.SSI_CLAUDE_CONFIG_DIR ||
  path.join(os.homedir(), '.cs-accounts', 'account-3')

const OAUTH_TOKEN_FILE = path.join(CLAUDE_CONFIG_DIR, '.cs-oauth-token')

/*
 * WHICH SSi ACCOUNT PAYS (2026-10-27, command-surface #334). The single
 * .cs-oauth-token above is claude@'s, so every course build billed claude@
 * alone, outside the surface router: on 27 Oct one pdc_for_eng build drove
 * claude@'s five-hour window from 12% to 93% while kai-gmail sat at 3%.
 * Both are the SSi company pool (Kai/Aran's ruled set), so each spawn now
 * picks between them. Alternatives live as `<config dir>/tokens/<email>`
 * (symlinks to the surface's token files); with no tokens/ dir this file
 * behaves exactly as before. The pick, per spawn:
 *   1. the surface's own gauge (command-surface/ops/account-usage.json,
 *      refreshed by its usage sweep) — an account at or past the 60% five-hour
 *      gate is out, unless every account is (then the least-filled one runs:
 *      a build is never refused here);
 *   2. the Control panel steer (GET /api/routing, cached, refreshed in the
 *      background): avoid = out unless that empties the set; hammer = fill it
 *      to its five-hour window first, past the 60% gate (#337, see pickAccount);
 *   3. most headroom left (the surface's own min-over-windows figure), then
 *      lowest five-hour pct, then the default token.
 * Unknown gauge → the default token, exactly as before.
 */
const TOKENS_DIR = path.join(CLAUDE_CONFIG_DIR, 'tokens')
const DEFAULT_EMAIL = 'claude@saysomethingin.com'
const FIVE_HOUR_GATE_PCT = 60
const USAGE_FILE = process.env.SSI_CLAUDE_USAGE_FILE ||
  path.join(os.homedir(), 'command-surface', 'ops', 'account-usage.json')
const ROUTING_URL = process.env.SSI_CLAUDE_ROUTING_URL || 'http://localhost:4317/api/routing'

let steerCache = { at: 0, steers: {} }
function refreshSteers() {
  if (typeof fetch !== 'function') return
  fetch(ROUTING_URL, { signal: AbortSignal.timeout(3000) })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      const steers = {}
      for (const s of (j && j.tom_override && j.tom_override.steers) || []) {
        if (s && s.email && (!s.until || Date.parse(s.until) > Date.now())) steers[String(s.email).toLowerCase()] = s.steer
      }
      steerCache = { at: Date.now(), steers }
    })
    .catch(() => {})
}
function steers() {
  if (Date.now() - steerCache.at > 60e3) { steerCache.at = Date.now(); refreshSteers() }
  return steerCache.steers
}

function readToken(file) {
  try { return fs.readFileSync(file, 'utf8').trim() || null } catch { return null }
}
function candidates(dir = TOKENS_DIR) {
  let names = []
  try { names = fs.readdirSync(dir).filter((n) => n.includes('@')) } catch {}
  return names.map((email) => ({ email: email.toLowerCase(), file: path.join(dir, email) }))
}

// Pure: choose one candidate given the gauge and the steers. Exported for the test.
// HAMMER = FILL IT UNTIL ITS 5H WINDOW RUNS OUT (Tom 2026-10-27, command-surface #337): a hammered account
// takes every spawn until its five-hour window is full (HAMMER_FULL_PCT — the surface's hand-over test with
// a human's 10% reserve), the least-filled hammer first so two hammers fill equally; the 60% gate does not
// apply to it. Then the normals under the 60% gate, most headroom first; then avoid; never refused.
const HAMMER_FULL_PCT = 90
function pickAccount(cands, { usage = {}, steer = {} } = {}) {
  if (!cands.length) return null
  const g = (c) => usage[c.email] || usage[Object.keys(usage).find((k) => k.toLowerCase() === c.email)] || null
  const known = cands.filter((c) => g(c) && Number.isFinite(Number(g(c).five_hour_pct)))
  if (known.length !== cands.length) return cands.find((c) => c.email === DEFAULT_EMAIL) || cands[0]
  const pct = (c) => Number(g(c).five_hour_pct)
  const hammers = known.filter((c) => steer[c.email] === 'hammer' && pct(c) < HAMMER_FULL_PCT)
  if (hammers.length) return [...hammers].sort((a, b) => pct(a) - pct(b) || (b.email === DEFAULT_EMAIL) - (a.email === DEFAULT_EMAIL))[0]
  const narrow = (set, pred) => { const k = set.filter(pred); return k.length ? k : set }
  let pool = narrow(known, (c) => pct(c) < FIVE_HOUR_GATE_PCT)
  pool = narrow(pool, (c) => steer[c.email] !== 'avoid')
  const head = (c) => { const h = Number(g(c).headroom); return Number.isFinite(h) ? h : (100 - pct(c)) / 100 }
  return [...pool].sort((a, b) =>
    head(b) - head(a)
    || pct(a) - pct(b)
    || (b.email === DEFAULT_EMAIL) - (a.email === DEFAULT_EMAIL))[0]
}

function readUsage() {
  try {
    const u = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'))
    const out = {}
    for (const [k, v] of Object.entries(u.accounts || u)) if (k.includes('@') && v && typeof v === 'object') out[k.toLowerCase()] = v
    return out
  } catch { return {} }
}

/** The token file this spawn bills: the picked SSi account, else the default. */
function tokenFile() {
  const cands = candidates().filter((c) => readToken(c.file))
  const c = pickAccount(cands, { usage: readUsage(), steer: steers() })
  return c ? c.file : OAUTH_TOKEN_FILE
}

/** Merge the pinned config dir + auth into an env object for spawn/exec. */
function claudeEnv(base = process.env) {
  const env = { ...base, CLAUDE_CONFIG_DIR }
  delete env.ANTHROPIC_API_KEY
  delete env.CLAUDECODE
  const token = readToken(tokenFile())
  // No token file on this machine — keychain/stored credentials apply.
  if (token) env.CLAUDE_CODE_OAUTH_TOKEN = token
  return env
}

/** Inline `export …` chain (no trailing separator) for shell/iTerm command strings. */
function claudeConfigExport() {
  const file = tokenFile()
  return [
    `export CLAUDE_CONFIG_DIR='${CLAUDE_CONFIG_DIR}'`,
    'unset ANTHROPIC_API_KEY CLAUDECODE',
    `if [ -f '${file}' ]; then export CLAUDE_CODE_OAUTH_TOKEN="$(cat '${file}')"; fi`,
  ].join(' && ')
}

module.exports = { CLAUDE_CONFIG_DIR, claudeEnv, claudeConfigExport, pickAccount, candidates, FIVE_HOUR_GATE_PCT, HAMMER_FULL_PCT }
