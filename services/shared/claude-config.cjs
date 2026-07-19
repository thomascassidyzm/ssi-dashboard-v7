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
 * parent process can never silently win. Default is the account-3 dir.
 */

const CLAUDE_CONFIG_DIR =
  process.env.SSI_CLAUDE_CONFIG_DIR || '/Users/tomcassidy/.cs-accounts/account-3'

/** Merge the pinned config dir into an env object for spawn/exec. */
function claudeEnv(base = process.env) {
  return { ...base, CLAUDE_CONFIG_DIR }
}

/** Inline `export …` (no trailing separator) for shell/iTerm command strings. */
function claudeConfigExport() {
  return `export CLAUDE_CONFIG_DIR='${CLAUDE_CONFIG_DIR}'`
}

module.exports = { CLAUDE_CONFIG_DIR, claudeEnv, claudeConfigExport }
