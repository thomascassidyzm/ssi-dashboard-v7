/**
 * The Deborah watcher's session and --test-notice logic, kept apart from the watcher script so a test can
 * run it without the script's Basecamp reach.
 */
const fs = require('fs')

/** Kai's session as request headers, from DEBORAH_WATCH_SESSION; `why` says what is missing when it is not usable. */
function kaiSessionHeaders(surface, env = process.env) {
  const sessionFile = env.DEBORAH_WATCH_SESSION
  const headers = { 'Content-Type': 'application/json' }
  if (!sessionFile) return { headers, why: 'DEBORAH_WATCH_SESSION not set — no Kai identity, so the digest was NOT published (it would file as Tom\'s); the card and the repo queue file still went out' }
  try {
    const cookie = fs.readFileSync(sessionFile, 'utf8').trim()
    if (!cookie.startsWith('v2.')) return { headers, why: `${sessionFile} is not a v2 session — refusing to publish with a stale identity` }
    return { headers: { ...headers, Cookie: `cs_user=${cookie}`, Origin: surface } }
  } catch (e) { return { headers, why: `cannot read ${sessionFile}: ${e.message}` } }
}

/**
 * --test-notice: under --dry-run it NEVER posts (it returns what it would send); otherwise it posts through
 * the same Kai session the real digest uses, so the test proves the real path.
 */
async function testNotice({ dryRun, text, surface, post, env = process.env }) {
  if (dryRun) return { posted: false, wouldSend: text }
  return post(text, kaiSessionHeaders(surface, env).headers, surface)
}

module.exports = { kaiSessionHeaders, testNotice }
