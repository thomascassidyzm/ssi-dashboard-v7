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

/**
 * Call Claude via CLI and return the text response.
 *
 * @param {string} prompt - The user message
 * @param {object} [options]
 * @param {string} [options.model='haiku'] - Model: 'haiku', 'sonnet', 'opus'
 * @param {string} [options.system] - System prompt
 * @param {number} [options.timeout=120000] - Timeout in ms
 * @returns {Promise<string>} The response text
 */
function claudeChat(prompt, options = {}) {
  const { model = 'haiku', system, timeout = 120000 } = options

  return new Promise((resolve, reject) => {
    const args = ['--print', '--model', model]
    if (system) {
      args.push('--system', system)
    }

    // Strip ANTHROPIC_API_KEY so the CLI authenticates via the Max Plan
    // login, not the API key from .env (which would bill per-token and
    // fail with "Credit balance is too low"). Same pattern as
    // agent-spawner.cjs / gender-prep-detector.cjs. CLAUDECODE must also
    // be removed (not set to '') for nested CLI calls to work.
    const env = { ...process.env }
    delete env.ANTHROPIC_API_KEY
    delete env.CLAUDECODE

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
        const parts = [`claude --print failed (code=${error.code}, signal=${error.signal || 'none'}, killed=${!!error.killed})`]
        const stderrTrim = (stderr || '').trim()
        if (stderrTrim) parts.push(`stderr: ${stderrTrim.slice(0, 800)}`)
        const stdoutTrim = (stdout || '').trim()
        if (stdoutTrim) parts.push(`stdout-head: ${stdoutTrim.slice(0, 400)}`)
        reject(new Error(parts.join(' | ')))
        return
      }
      resolve(stdout.trim())
    })

    // Send prompt via stdin
    child.stdin.write(prompt)
    child.stdin.end()
  })
}

module.exports = { claudeChat }
