#!/usr/bin/env node
/**
 * Alerts if a LIVE TTS key sits anywhere outside the guarded set (job #695).
 * Rule and the definition of "guarded": tools/lib/tts-key-guard.cjs.
 *
 *   node tools/check-tts-keys.cjs          # exit 1 + one needs-you card if any
 *   node tools/check-tts-keys.cjs --fix    # also re-vault them (tts-stop guard)
 *
 * Run nightly by ssi-tts-key-check.timer. Told ONCE per distinct set of
 * offending files (state file beside the ledger), never once per run.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { keyFiles, liveKeyLines, mayHoldLiveKey, HOME } = require('./lib/tts-key-guard.cjs')

const STATE = path.join(HOME, '.local', 'state', 'ssi-tts-spend', 'key-check.json')

function offenders() { return keyFiles().filter(f => liveKeyLines(f).length && !mayHoldLiveKey(f)).sort() }

async function main() {
  let bad = offenders()
  if (bad.length && process.argv.includes('--fix')) {
    execFileSync('node', [path.join(__dirname, 'tts-stop.cjs'), 'guard'], { stdio: 'inherit' })
    bad = offenders()
  }
  let said = ''
  try { said = JSON.parse(fs.readFileSync(STATE, 'utf8')).said } catch { /* first run */ }
  const now = bad.join('\n')
  if (!bad.length) { fs.mkdirSync(path.dirname(STATE), { recursive: true }); fs.writeFileSync(STATE, JSON.stringify({ said: '' })); console.log('ok: no live TTS key outside the guarded set'); return 0 }
  console.log(`LIVE TTS KEY OUTSIDE THE GUARDED SET:\n${now}`)
  if (now !== said) {
    const surface = process.env.CS_SURFACE || 'http://localhost:4317'
    const text = `TTS KEYS: a live provider key is in ${bad.length} unguarded place(s) on ${os.hostname()} — code there bypasses the 50k daily cap: ${bad.join(', ')}. Fix: node tools/tts-stop.cjs guard`
    try { await fetch(`${surface}/api/needs-you`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: surface }, body: JSON.stringify({ text }) }); fs.mkdirSync(path.dirname(STATE), { recursive: true }); fs.writeFileSync(STATE, JSON.stringify({ said: now })) } catch (e) { console.error(`could not post the alert: ${e.message}`) }
  }
  return 1
}
if (require.main === module) main().then(c => process.exit(c))
module.exports = { offenders }
