/**
 * Guards for DB tests that write real rows (review #270). cast-voice-role.db.test used to run
 * `DELETE FROM voice_language_roles WHERE language='zzc'` before and after, against whatever DB .env.psql
 * points at — which is the one live Supabase. A fixed code means a real row with that code is destroyed;
 * a writing test therefore (1) takes a code nobody holds, (2) deletes only that code, (3) refuses a live host
 * unless a human opts in.
 */
const crypto = require('crypto')

const LIVE_HOST = /supabase\.(co|com)\b|pooler\./i

function hostOf(url) {
  try { return new URL(url).hostname } catch { return String(url || '') }
}

/** True when the URL is the live project and nobody said the test may write there. */
function refusesLiveHost(url, env = process.env) {
  return LIVE_HOST.test(hostOf(url)) && env.ALLOW_WRITING_DB_TESTS_ON_LIVE !== 'yes'
}

/** A throwaway 3-letter language code no row holds. `hasRows(code)` is the caller's lookup. */
function pickScratchLanguage(hasRows, { rand = () => crypto.randomBytes(2) } = {}) {
  for (let i = 0; i < 20; i++) {
    const b = rand()
    const code = 'z' + String.fromCharCode(97 + (b[0] % 26)) + String.fromCharCode(97 + (b[1] % 26))
    if (!hasRows(code)) return code
  }
  throw new Error('no free scratch language code after 20 tries — refusing to run')
}

module.exports = { refusesLiveHost, pickScratchLanguage, hostOf }
