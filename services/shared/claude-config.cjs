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

/** Merge the pinned config dir + auth into an env object for spawn/exec. */
function claudeEnv(base = process.env) {
  const env = { ...base, CLAUDE_CONFIG_DIR }
  delete env.ANTHROPIC_API_KEY
  delete env.CLAUDECODE
  try {
    const token = fs.readFileSync(OAUTH_TOKEN_FILE, 'utf8').trim()
    if (token) env.CLAUDE_CODE_OAUTH_TOKEN = token
  } catch {
    // No token file on this machine — keychain/stored credentials apply.
  }
  return env
}

/** Inline `export …` chain (no trailing separator) for shell/iTerm command strings. */
function claudeConfigExport() {
  return [
    `export CLAUDE_CONFIG_DIR='${CLAUDE_CONFIG_DIR}'`,
    'unset ANTHROPIC_API_KEY CLAUDECODE',
    `if [ -f '${OAUTH_TOKEN_FILE}' ]; then export CLAUDE_CODE_OAUTH_TOKEN="$(cat '${OAUTH_TOKEN_FILE}')"; fi`,
  ].join(' && ')
}

module.exports = { CLAUDE_CONFIG_DIR, claudeEnv, claudeConfigExport }
