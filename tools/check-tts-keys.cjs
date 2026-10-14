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
 *
 * Also (job #806): the spend guard's per-day rollup is checked against the
 * ledger (tools/lib/tts-rollup-drift.cjs) — a drift loosens the caps silently,
 * so it is told the same way, once per distinct drift.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { keyFiles, liveKeyLines, bannedKeyLines, mayHoldLiveKey, HOME } = require('./lib/tts-key-guard.cjs')
const { rollupDrift } = require('./lib/tts-rollup-drift.cjs')

const STATE = path.join(HOME, '.local', 'state', 'ssi-tts-spend', 'key-check.json')
const DRIFT_STATE = path.join(HOME, '.local', 'state', 'ssi-tts-spend', 'rollup-drift.json')

async function tell(text) {
  const surface = process.env.CS_SURFACE || 'http://localhost:4317'
  await fetch(`${surface}/api/needs-you`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: surface }, body: JSON.stringify({ text }) })
}

/** 0 when the rollup agrees with the ledger (or is not deployed), 1 on drift. */
async function checkRollup() {
  let r
  try { r = await rollupDrift() } catch (e) { console.error(`rollup drift check could not run: ${e.message}`); return 1 }
  if (!r.checked) { console.log('rollup: not deployed, nothing to check'); return 0 }
  let said = ''
  try { said = JSON.parse(fs.readFileSync(DRIFT_STATE, 'utf8')).said } catch { /* first run */ }
  const now = r.rows.map(x => `${x.which} ${x.provider || ''} ${x.day} ${x.kind || ''} ${x.job || ''}: ledger ${x.ledger} rollup ${x.rollup}`).join('\n')
  fs.mkdirSync(path.dirname(DRIFT_STATE), { recursive: true })
  if (!r.rows.length) { fs.writeFileSync(DRIFT_STATE, JSON.stringify({ said: '' })); console.log('ok: spend rollup agrees with the ledger'); return 0 }
  console.log(`SPEND ROLLUP DRIFT:\n${now}`)
  if (now !== said) {
    try {
      await tell(`TTS SPEND ROLLUP DRIFT: ${r.rows.length} row(s) where the guard's per-day totals disagree with tts_spend_ledger — the caps are being judged on the wrong numbers. Something inserted with triggers off. See: select * from tts_spend_rollup_drift(). First: ${now.split('\n')[0]}`)
      fs.writeFileSync(DRIFT_STATE, JSON.stringify({ said: now }))
    } catch (e) { console.error(`could not post the alert: ${e.message}`) }
  }
  return 1
}

function offenders() { return keyFiles().filter(f => bannedKeyLines(f).length || (liveKeyLines(f).length && !mayHoldLiveKey(f))).sort() }

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
    const text = `TTS KEYS: a live provider key is in ${bad.length} unguarded place(s) on ${os.hostname()} — code there bypasses the 50k daily cap: ${bad.join(', ')}. Fix: node tools/tts-stop.cjs guard (an XAI_API_KEY line anywhere is the xAI ban, 2026-10-10: delete the line)`
    try { await fetch(`${surface}/api/needs-you`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: surface }, body: JSON.stringify({ text }) }); fs.mkdirSync(path.dirname(STATE), { recursive: true }); fs.writeFileSync(STATE, JSON.stringify({ said: now })) } catch (e) { console.error(`could not post the alert: ${e.message}`) }
  }
  return 1
}
if (require.main === module) Promise.all([main(), checkRollup()]).then(cs => process.exit(Math.max(...cs)))
module.exports = { offenders, checkRollup }
