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

// The installed `claude` CLI's own alias resolution for 'haiku' can lag
// behind Anthropic's model retirements (seen 2026-07: CLI 2.0.8 resolved
// 'haiku' -> retired 'claude-3-5-haiku-20241022', a 404). Pin an explicit,
// verified-working model id instead of trusting the CLI's alias — one env
// var to bump the next time Haiku is retired.
const HAIKU_MODEL = process.env.CLAUDE_HAIKU_MODEL || 'claude-haiku-4-5-20251001'

/**
 * Call Claude via CLI and return the text response.
 *
 * @param {string} prompt - The user message
 * @param {object} [options]
 * @param {string} [options.model=HAIKU_MODEL] - Model: HAIKU_MODEL, 'sonnet', 'opus', or an explicit model id
 * @param {string} [options.system] - System prompt
 * @param {number} [options.timeout=120000] - Timeout in ms
 * @returns {Promise<string>} The response text
 */
function claudeChat(prompt, options = {}) {
  const { model = HAIKU_MODEL, system, timeout = 120000 } = options

  return new Promise((resolve, reject) => {
    const args = ['--print', '--model', model]
    if (system) {
      args.push('--system', system)
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
    env.MAX_THINKING_TOKENS = '0'

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

module.exports = { claudeChat, HAIKU_MODEL }
