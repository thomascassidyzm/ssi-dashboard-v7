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

    const child = execFile('claude', args, {
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      env: { ...process.env, CLAUDECODE: '' }
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`claude --print failed: ${error.message}`))
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
