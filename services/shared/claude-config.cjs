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
 * WHICH SSi ACCOUNT PAYS (2026-10-27, command-surface #334; reworked 2026-11-04, #412·AD). The single
 * .cs-oauth-token above is claude@'s; alternatives live as `<config dir>/tokens/<email>` (symlinks to the
 * surface's token files — on watson-1 claude@ and kai.claude@, the SSi company pair). Tom's ruling,
 * 2026-11-04 (r-2026-11-04-popty-uses-claude-and-kai-gmail): "Popty uses claude@ and kai-gmail directly, its
 * own choice between the two, no surface allocator; it paces token-heavy work across the week."
 *
 * THE BUG THIS REPLACED: the pick read `five_hour_pct`. Five-hour windows ended on 2 Nov and the surface's
 * gauge stopped publishing the field, so every account read as "unknown gauge" and every spawn fell back to
 * claude@. On 4 Nov the fry_for_eng build and #248's jpn/kor phrase-v4 rebuild ran ~15,000 CLIs on claude@
 * alone (24% → 100% of its week, 11:00-18:50Z) while kai-gmail sat at 59-68%.
 *
 * The pick, per spawn, on the WEEKLY gauge only (command-surface/ops/account-usage.json, refreshed every
 * ten minutes; weekly_all_pct_used / weekly_all_resets_at, Anthropic's own header):
 *   1. a hammered account (Control panel steer) takes every spawn until its week is full (WEEKLY_FULL_PCT);
 *   2. otherwise accounts UNDER PACE first — at or below their pro-rata share of the week plus PACE_SLACK_PCT
 *      (weeklyShare) — then the rest; avoid = out unless that empties the set;
 *   3. most weekly headroom left, then the default token.
 * An account with no readable weekly gauge ranks behind every account with one; with no gauge at all the
 * default token runs, exactly as before. The pick never refuses a spawn — PACING is a separate, opt-in
 * question asked at a bulk door (pacedNow below), so a person's one-off call is never held.
 */
const TOKENS_DIR = path.join(CLAUDE_CONFIG_DIR, 'tokens')
const DEFAULT_EMAIL = 'claude@saysomethingin.com'
const WEEK_H = 168
// Points a bulk run may run AHEAD of an account's pro-rata share of the week before it is held. Small enough
// that a run cannot eat a week in a day (4 Nov: 76 points in eight hours), big enough not to stutter.
const PACE_SLACK_PCT = Number(process.env.SSI_CLAUDE_PACE_SLACK_PCT || 10)
const WEEKLY_FULL_PCT = 98
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

// The weekly percent used, or null when unreadable. weekly_all_known:false / stale:true mean UNKNOWN, never 0.
function weeklyPct(g) {
  if (!g || g.weekly_all_known === false || g.weekly_all_stale === true) return null
  const v = g.weekly_all_pct_used ?? g.seven_day_pct
  return v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)
}
// The account's pro-rata share of its own week at `now`, in percent: 0 at its reset, 100 a week later. Null when
// the reset instant is unknown.
function weeklyShare(g, now = Date.now()) {
  const reset = Date.parse(g && g.weekly_all_resets_at)
  if (!Number.isFinite(reset)) return null
  const elapsedH = WEEK_H - Math.max(0, Math.min(WEEK_H, (reset - now) / 3600e3))
  return (100 * elapsedH) / WEEK_H
}
// Under pace = at or below share + slack. An unknown reset counts as under pace only below the slack itself.
function underPace(g, now = Date.now()) {
  const pct = weeklyPct(g)
  if (pct === null) return false
  const share = weeklyShare(g, now)
  return pct <= (share === null ? 0 : share) + PACE_SLACK_PCT
}
// When an over-pace account is next back under pace (its share catches up at 100/168 points an hour), or its
// reset, whichever is sooner. Null when it cannot be said.
function paceResumeAt(g, now = Date.now()) {
  const pct = weeklyPct(g), reset = Date.parse(g && g.weekly_all_resets_at)
  if (pct === null || !Number.isFinite(reset)) return null
  // A FULL account is not back at its catch-up instant — it is still full then — only at its reset. Without
  // this, claude@ 100% (catch-up 6 Nov 22:12Z) + kai 95% would answer resume_at = 22:12 and then, at 22:12,
  // resume_at = now on every call: a bulk caller spinning on 60-second retries until 7 Nov 08:48Z.
  if (pct >= WEEKLY_FULL_PCT) return Math.max(now, reset)
  const weekStart = reset - WEEK_H * 3600e3
  const at = weekStart + ((pct - PACE_SLACK_PCT) / 100) * WEEK_H * 3600e3
  return Math.max(now, Math.min(at, reset))
}

// Pure: choose one candidate given the gauge and the steers. Exported for the test.
function pickAccount(cands, { usage = {}, steer = {}, now = Date.now() } = {}) {
  if (!cands.length) return null
  const g = (c) => usage[c.email] || usage[Object.keys(usage).find((k) => k.toLowerCase() === c.email)] || null
  const pct = (c) => weeklyPct(g(c))
  const known = cands.filter((c) => pct(c) !== null)
  if (!known.length) return cands.find((c) => c.email === DEFAULT_EMAIL) || cands[0]
  // HAMMER = FILL IT UNTIL IT RUNS OUT (Tom 2026-10-27 #337, restated 2026-11-04 for the weekly gauge): the
  // least-filled hammer first, so two hammers fill equally.
  const hammers = known.filter((c) => steer[c.email] === 'hammer' && pct(c) < WEEKLY_FULL_PCT)
  if (hammers.length) return [...hammers].sort((a, b) => pct(a) - pct(b) || (b.email === DEFAULT_EMAIL) - (a.email === DEFAULT_EMAIL))[0]
  const narrow = (set, pred) => { const k = set.filter(pred); return k.length ? k : set }
  let pool = narrow(known, (c) => pct(c) < WEEKLY_FULL_PCT)
  pool = narrow(pool, (c) => steer[c.email] !== 'avoid')
  pool = narrow(pool, (c) => underPace(g(c), now))
  const head = (c) => 100 - pct(c)
  return [...pool].sort((a, b) =>
    head(b) - head(a)
    || (b.email === DEFAULT_EMAIL) - (a.email === DEFAULT_EMAIL))[0]
}

/**
 * THE WEEKLY PACE FOR BULK RUNS (Tom 2026-11-04: "if it's doing too much token heavy stuff it has to pace it
 * over the week"). Pure. Null = go. Otherwise { resumeAt, why }: every account with a token is past its
 * pro-rata share of the week (plus PACE_SLACK_PCT) or full, so a bulk door should hold the call, not spawn it.
 * An unreadable gauge never holds (Popty is not stopped by the surface being down).
 */
function pacedNow(cands, { usage = {}, now = Date.now() } = {}) {
  if (!cands.length) return null
  const g = (c) => usage[c.email] || null
  if (cands.some((c) => weeklyPct(g(c)) === null)) return null
  if (cands.some((c) => underPace(g(c), now) && weeklyPct(g(c)) < WEEKLY_FULL_PCT)) return null
  const resumes = cands.map((c) => paceResumeAt(g(c), now)).filter(Number.isFinite)
  const resumeAt = resumes.length ? Math.min(...resumes) : now + 3600e3
  const why = cands.map((c) => {
    const share = weeklyShare(g(c), now)
    return `${c.email} ${Math.round(weeklyPct(g(c)))}% used vs ${share === null ? '?' : Math.round(share)}% share`
  }).join('; ')
  return { resumeAt: new Date(resumeAt).toISOString(), why: `every SSi account is ahead of its weekly pace (+${PACE_SLACK_PCT} points): ${why}` }
}

function readUsage() {
  try {
    const u = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'))
    const out = {}
    for (const [k, v] of Object.entries(u.accounts || u)) if (k.includes('@') && v && typeof v === 'object') out[k.toLowerCase()] = v
    return out
  } catch { return {} }
}

function liveCandidates() { return candidates().filter((c) => readToken(c.file)) }

/**
 * The account a spawn bills: { email, file }. `exclude` (emails) drops accounts a caller knows
 * are spent — the course builder passes the account that just hit its usage limit when it
 * restarts a build (job #482), and claude-cli.cjs passes the account that just answered "weekly
 * limit" (#412·AD). If excluding leaves nothing, the unfiltered pick stands: a build is never
 * refused here. email is null when the default token is used.
 */
function pickSpawnAccount({ exclude = [] } = {}) {
  const ex = new Set(exclude.filter(Boolean).map((e) => String(e).toLowerCase()))
  const all = liveCandidates()
  const kept = all.filter((c) => !ex.has(c.email))
  const opts = { usage: readUsage(), steer: steers() }
  const c = pickAccount(kept.length ? kept : all, opts)
  return c ? { email: c.email, file: c.file } : { email: null, file: OAUTH_TOKEN_FILE }
}

/** Should a BULK door hold its next call? Null = go; else { resumeAt, why }. See pacedNow. */
function bulkPace() {
  return pacedNow(liveCandidates(), { usage: readUsage() })
}

/**
 * Another SSi account worth switching to right now, or null: not excluded, has a token, and
 * its week is not already full by the surface's gauge (unknown gauge counts as usable). Only
 * the accounts in <config dir>/tokens are ever considered — on watson-1 those are claude@ and
 * kai-gmail, the SSi pool; Tom's personal accounts are never in that dir.
 */
function alternativeAccount({ exclude = [] } = {}) {
  const ex = new Set(exclude.filter(Boolean).map((e) => String(e).toLowerCase()))
  const usage = readUsage()
  const ok = liveCandidates().filter((c) => !ex.has(c.email)).filter((c) => {
    const pct = weeklyPct(usage[c.email])
    return pct === null || pct < WEEKLY_FULL_PCT
  })
  if (!ok.length) return null
  const c = pickAccount(ok, { usage, steer: steers() })
  return c ? c.email : null
}

/** The token file this spawn bills: the picked SSi account, else the default. */
function tokenFile() {
  return pickSpawnAccount().file
}

/** Merge the pinned config dir + auth into an env object for spawn/exec. */
function claudeEnv(base = process.env) {
  return claudeSpawnEnv(base).env
}

/**
 * The same env plus the account it bills: { env, email }. `exclude` as for pickSpawnAccount —
 * claude-cli.cjs uses it to retry ONCE on the other SSi account when the first answers "weekly limit".
 */
function claudeSpawnEnv(base = process.env, { exclude = [] } = {}) {
  const env = { ...base, CLAUDE_CONFIG_DIR }
  delete env.ANTHROPIC_API_KEY
  delete env.CLAUDECODE
  const { email, file } = pickSpawnAccount({ exclude })
  const token = readToken(file)
  // No token file on this machine — keychain/stored credentials apply.
  if (token) env.CLAUDE_CODE_OAUTH_TOKEN = token
  return { env, email: email || DEFAULT_EMAIL }
}

/**
 * Inline `export …` chain (no trailing separator) for shell/iTerm command strings, plus the
 * account it bills.
 *
 * CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 (job #482): a headless CLI whose turn has ended
 * stops its still-running background tasks after 10 minutes (the CLI's own default ceiling,
 * 600000 ms in 2.1.312; its notice says "Set CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 to wait
 * indefinitely"). The build orchestrator starts its Opus builder as a background subagent
 * and ends its turn, so every long build was cut off ten minutes in — fry_for_eng stopped at
 * 4/300 on 28 Oct that way. 0 makes the CLI wait for the builder however long it runs.
 * Stop (/build/stop) now kills the process tree, so an indefinite wait can always be ended.
 */
function claudeSpawnSetup({ exclude = [] } = {}) {
  const { email, file } = pickSpawnAccount({ exclude })
  const exportCmd = [
    `export CLAUDE_CONFIG_DIR='${CLAUDE_CONFIG_DIR}'`,
    'unset ANTHROPIC_API_KEY CLAUDECODE',
    `export CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=${BG_WAIT_CEILING_MS}`,
    `if [ -f '${file}' ]; then export CLAUDE_CODE_OAUTH_TOKEN="$(cat '${file}')"; fi`,
  ].join(' && ')
  return { exportCmd, email }
}
const BG_WAIT_CEILING_MS = 0

function claudeConfigExport(opts) {
  return claudeSpawnSetup(opts).exportCmd
}

module.exports = { CLAUDE_CONFIG_DIR, claudeEnv, claudeSpawnEnv, claudeConfigExport, claudeSpawnSetup, pickSpawnAccount, alternativeAccount, pickAccount, pacedNow, bulkPace, weeklyPct, weeklyShare, candidates, PACE_SLACK_PCT, WEEKLY_FULL_PCT, BG_WAIT_CEILING_MS }
