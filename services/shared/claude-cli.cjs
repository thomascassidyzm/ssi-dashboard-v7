/**
 * Claude CLI wrapper — calls `claude --print` through the Max Plan subscription.
 *
 * NEVER use @anthropic-ai/sdk directly — it bills per-token via the API.
 * This module routes all LLM calls through the CLI which is covered by
 * the Max Plan subscription ($200/month, unlimited usage).
 *
 * Usage:
 *   const { claudeChat } = require('./claude-cli.cjs')
 *   const response = await claudeChat('Fix this JSON', { model: 'haiku' })
 */

const { execFile } = require('child_process')
const { claudeEnv } = require('./claude-config.cjs')

// FAMILY NAMES ONLY (Tom, 2026-09-28, r-2026-09-28-models-are-named-by-family-only; job #654).
// The pin this replaced existed because a stale CLI (2.0.8, 2026-07) resolved 'haiku' to a
// retired model. watson-1 now keeps Claude Code current every 6h (command-surface
// ops/claude-cli-update.js), so the alias IS the latest and a pinned id is what rots.
// CLAUDE_HAIKU_MODEL stays as a rollback lever only.
const HAIKU_MODEL = process.env.CLAUDE_HAIKU_MODEL || 'haiku'

// The id a family resolves to on this box, for PROVENANCE stamps (who approved/wrote a row).
// Read from the catalogue cache the command surface writes per installed CLI version
// (~/.cache/cs-model-catalog/<ver>.json, from the binary's own latest_per_family table), so
// Popty never keeps its own table. Falls back to the family alias rather than inventing an id.
function latestModelId(family) {
  const fs = require('fs'), path = require('path'), os = require('os')
  try {
    const ver = path.basename(fs.realpathSync(path.join(os.homedir(), '.local', 'bin', 'claude')))
    const cat = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.cache', 'cs-model-catalog', `${ver}.json`), 'utf8'))
    return cat[String(family).replace(/\[.*$/, '')] || family
  } catch { return family }
}

/**
 * Call Claude via CLI and return the text response.
 *
 * @param {string} prompt - The user message
 * @param {object} [options]
 * @param {string} [options.model=HAIKU_MODEL] - Model: HAIKU_MODEL, 'sonnet', 'opus', or an explicit model id
 * @param {string} [options.system] - System prompt
 * @param {number} [options.timeout=120000] - Timeout in ms
 * @param {number} [options.thinkingTokens] - Override MAX_THINKING_TOKENS. Leave
 *   unset for the default 0 (no extended thinking), which is right for the
 *   deterministic tasks this wrapper was built for. Set it for genuinely
 *   generative work — course phrase authoring, where the 15x latency tax buys
 *   quality rather than nothing.
 * @returns {Promise<string>} The response text
 */
function claudeChat(prompt, options = {}) {
  const { model = HAIKU_MODEL, system, timeout = 120000, thinkingTokens } = options

  return new Promise((resolve, reject) => {
    const args = ['--print', '--model', model]
    if (system) {
      // '--system' is NOT a flag this CLI has ever accepted — it exits 1 with
      // "unknown option '--system'". Any caller passing `system` was silently
      // broken until 2026-08-27, when the phrase lab became the first caller to
      // use it. The real flag is --system-prompt.
      args.push('--system-prompt', system)
    }

    // claudeEnv() pins the claude@ account config dir, injects the machine's
    // OAuth token where one exists, and strips ANTHROPIC_API_KEY/CLAUDECODE
    // so the CLI bills the Max Plan login and nested calls work
    // (see claude-config.cjs).
    const env = claudeEnv()
    // MAX_THINKING_TOKENS=0 disables extended thinking. Without it, the
    // global effortLevel:high setting flows into every headless `claude
    // --print` call, so a simple translation-flex spends ~11K hidden
    // thinking tokens (~90s/call) before a ~450-token answer — a 15×
    // tax for zero quality gain on these deterministic tasks. With it:
    // ~8s/call, identical output. (Measured 2026-06-08: 122s → 8s.)
    env.MAX_THINKING_TOKENS = thinkingTokens === undefined ? '0' : String(thinkingTokens)

    const child = execFile('claude', args, {
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      env
    }, (error, stdout, stderr) => {
      if (error) {
        // Surface the actual failure shape — execFile's error.message is
        // just 'Command failed: ...' which hides everything useful. We
        // need stderr (CLI error text), exit code, signal, and the first
        // chunk of stdout (CLI may print partial JSON before dying) to
        // diagnose whether it's a timeout, a parse error, a rate-limit
        // response, or something else.
        const parts = [`claude --print --model ${model} failed (code=${error.code}, signal=${error.signal || 'none'}, killed=${!!error.killed})`]
        const stderrTrim = (stderr || '').trim()
        if (stderrTrim) parts.push(`stderr: ${stderrTrim.slice(0, 800)}`)
        const stdoutTrim = (stdout || '').trim()
        if (stdoutTrim) parts.push(`stdout-head: ${stdoutTrim.slice(0, 400)}`)
        const err = new Error(parts.join(' | '))
        console.error(`[claude-cli] ${err.message}`)
        reject(err)
        return
      }
      resolve(stdout.trim())
    })

    // Send prompt via stdin
    child.stdin.write(prompt)
    child.stdin.end()
  })
}

module.exports = { claudeChat, HAIKU_MODEL, latestModelId }
