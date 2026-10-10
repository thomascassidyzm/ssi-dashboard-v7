/**
 * WHERE A LIVE TTS KEY MAY LIVE (job #695).
 *
 * Tom, 2026-09-29 00:25Z: 50,000 audio characters a day TOTAL. That cap lives in
 * the shared ledger, so it only binds code that reserves in the ledger first
 * (services/shared/tts-spend-guard.cjs). Code older than the guard calls the
 * providers with nothing in between, and the only thing it shares with the
 * guarded estate is a provider key in a .env file. So:
 *
 *   a live TTS key may sit ONLY in the real `.env` of a checkout that carries the
 *   current guard, i.e. the total-cap guard. Everywhere else the key is a dead
 *   placeholder (see tools/tts-stop.cjs), and tools/check-tts-keys.cjs alerts if
 *   one reappears.
 *
 * A symlinked .env counts as the file it points at: a worktree whose .env links
 * into a pre-guard checkout is only as guarded as that checkout.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')

const HOME = os.homedir()
/** The paid-TTS credentials. Not CARTESIA_ADMIN_API_KEY: that one only READS usage. */
const TTS_KEY_LINE = /^(\s*(?:export\s+)?(?:CARTESIA_API_KEY\w*|AZURE_SPEECH_KEY|AZURE_TTS_KEY|ELEVENLABS_API_KEY|XAI_API_KEY)\s*=)(.*)$/
const { execFileSync } = require('child_process')
const VAULT = path.join(HOME, '.local', 'state', 'ssi-tts-spend', 'tom-stop')
const PLACEHOLDER_MARK = 'STOPPED-BY-TOM'
const PLACEHOLDER = 'STOPPED-BY-TOM-2026-09-28-see-tools-tts-stop'

/** A checkout is guarded when its code holds the total-cap spend guard. */
function isGuardedCheckout(dir) {
  try {
    const guard = fs.readFileSync(path.join(dir, 'services', 'shared', 'tts-spend-guard.cjs'), 'utf8')
    return guard.includes('DAILY_TOTAL_CAP') && fs.existsSync(path.join(dir, 'ops', 'sql', '20260929-tts-spend-total-cap.sql'))
  } catch { return false }
}

/** The checkout root that owns `file` (nearest ancestor with a .git), or null. */
function checkoutOf(file) {
  let d = path.dirname(file)
  while (d !== path.dirname(d)) {
    if (fs.existsSync(path.join(d, '.git'))) return d
    d = path.dirname(d)
  }
  return null
}

/** May this file hold a live key? Only a checkout's own plain `.env`, in a guarded checkout. */
function mayHoldLiveKey(file) {
  let real
  try { real = fs.realpathSync(file) } catch { return false }
  if (path.basename(real) !== '.env') return false
  const root = checkoutOf(real)
  return !!root && path.dirname(real) === root && isGuardedCheckout(root)
}

/** Every real (not symlinked, not example) .env file under $HOME holding a TTS key. */
function keyFiles() {
  let out = ''
  try {
    out = execFileSync('find', [HOME, '-maxdepth', '6', '-type', 'f', '-name', '.env*',
      '-not', '-name', '*.example', '-not', '-path', '*/node_modules/*', '-not', '-path', '*/.cs-scratch/*', '-not', '-path', `${VAULT}/*`],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch (e) { out = e.stdout || '' }
  // The key backups in ~/.secrets are copied into checkouts by hand: hold them too.
  const secrets = path.join(HOME, '.secrets')
  if (fs.existsSync(secrets)) out += '\n' + fs.readdirSync(secrets).filter(n => n.endsWith('.env')).map(n => path.join(secrets, n)).join('\n')
  return out.split('\n').filter(Boolean).filter(f => {
    try { return fs.readFileSync(f, 'utf8').split('\n').some(l => TTS_KEY_LINE.test(l)) } catch { return false }
  })
}

/** xAI voice generation is BANNED (Tom 2026-10-10): XAI_API_KEY is an alert in ANY file, guarded checkout or not, placeholder or not. */
const BANNED_KEY_LINE = /^\s*(?:export\s+)?XAI_API_KEY\s*=/
const bannedKeyLines = (file) => {
  try { return fs.readFileSync(file, 'utf8').split('\n').filter(l => BANNED_KEY_LINE.test(l)) } catch { return [] }
}
const liveKeyLines = (file) => {
  try { return fs.readFileSync(file, 'utf8').split('\n').filter(l => { const k = l.match(TTS_KEY_LINE); return k && k[2].trim() && !k[2].includes(PLACEHOLDER_MARK) }) } catch { return [] }
}

module.exports = { HOME, TTS_KEY_LINE, PLACEHOLDER, PLACEHOLDER_MARK, isGuardedCheckout, checkoutOf, mayHoldLiveKey, liveKeyLines, bannedKeyLines, BANNED_KEY_LINE, keyFiles, VAULT }
