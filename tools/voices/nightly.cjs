#!/usr/bin/env node
/*
 * nightly.cjs — the scheduled leg of the clip-library reconcile (job #703).
 *
 * Tom, 2026-09-29: "index everything named, then a nightly reconcile reporting
 * drift (target 0)". Follows the nightly doctrine on watson-1 (see
 * tools/qa/sibling-identity/nightly.cjs): QUIET IS SILENT, DRIFT IS LOUD, A NIGHT
 * IT CANNOT RUN IS LOUD TOO.
 *
 * Each night it (1) refreshes the spoken-text evidence for any gendered clip
 * written since, (2) walks course_audio and INSERTS every missing index entry
 * and drops any stale one (logged), then (3) counts what is left. What is left
 * after step 2 is drift a machine could not fix — that is the alarm. The two
 * lists that need a PERSON (takes awaiting a name; a machine voice nothing names)
 * are reported in the snapshot every night but only speak when they GROW: a
 * legacy take nobody has named yet is the honest state, not a failure.
 *
 *   node tools/voices/nightly.cjs [--no-notice] [--force-notice]
 * Exit codes: 0 ran, 2 could not run.
 */
'use strict'
const fs = require('fs')
const path = require('path')
const { refreshSpokenEvidence, reconcile, connect } = require('./reconcile-library.cjs')

const SURFACE = process.env.CS_SURFACE || 'http://localhost:4317'
const STATE = process.env.VOICES_RECONCILE_STATE || '/home/tomcassidy/.local/state/ssi-voices-reconcile'
const LOG = process.env.VOICES_RECONCILE_LOG || '/home/tomcassidy/.local/log/ssi-voices-reconcile.log'
const CHANNEL_CWD = '/home/tomcassidy/SSi/ssi-dashboard-v7-clean'
const noNotice = process.argv.includes('--no-notice')
const forceNotice = process.argv.includes('--force-notice')

function log(s) {
  const line = `${new Date().toISOString()} ${s}\n`
  try { fs.mkdirSync(path.dirname(LOG), { recursive: true }); fs.appendFileSync(LOG, line) } catch { /* console is the floor */ }
  process.stdout.write(line)
}

async function api(method, route, body) {
  const r = await fetch(SURFACE + route, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const t = await r.text()
  if (!r.ok) throw new Error(`${method} ${route} → ${r.status} ${t.slice(0, 200)}`)
  try { return JSON.parse(t) } catch { return t }
}

async function say(text) {
  if (noNotice) { log(`--no-notice: ${text}`); return }
  try {
    const raw = await api('GET', '/api/channels')
    const list = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.channels) ? raw.channels : [])
    const ch = list.find(c => c.cwd === CHANNEL_CWD)
    if (!ch) { log(`no project channel for ${CHANNEL_CWD} — notice NOT delivered:\n${text}`); return }
    await api('POST', '/api/reply', { jobId: ch.convId, automated: true, text })
    log('notice posted to the Popty channel')
  } catch (e) { log(`notice FAILED: ${e.message}\n${text}`) }
}

/** The alarm is drift a machine could not fix, or a person-list that GREW. Pure — tested. */
function judge(prev, cur) {
  const grew = (a, b) => (b || 0) > (a || 0)
  const reasons = []
  if (cur.drift > 0) reasons.push(`${cur.drift} clips are still out of step with the library after tonight's repair (${cur.missing} missing, ${cur.stale} stale)`)
  if (prev && grew(prev.awaitingName, cur.awaitingName)) reasons.push(`takes awaiting a name went ${prev.awaitingName} → ${cur.awaitingName}`)
  if (prev && grew(prev.unresolvable, cur.unresolvable)) reasons.push(`clips in a voice nothing names went ${prev.unresolvable} → ${cur.unresolvable}`)
  return { alarm: reasons.length > 0, reasons }
}

async function main() {
  let client, snap
  try {
    client = await connect()
    const evidence = await refreshSpokenEvidence(client, { apply: true })
    const r = await reconcile(client, { apply: true })
    snap = { generated_at: new Date().toISOString(), evidence, ...r }
  } catch (e) {
    log(`CANNOT-RUN: ${e.message}`)
    await say(`The nightly clip-library reconcile could not run tonight: ${e.message}. The drift figure you last saw is stale until this is fixed.`)
    process.exit(2)
  } finally { if (client) await client.end().catch(() => {}) }

  let prev = null
  try { prev = JSON.parse(fs.readFileSync(path.join(STATE, 'latest.json'), 'utf8')) } catch { /* first night */ }
  fs.mkdirSync(STATE, { recursive: true })
  const file = path.join(STATE, `${snap.generated_at.slice(0, 10)}.json`)
  fs.writeFileSync(file, JSON.stringify(snap, null, 2))
  fs.writeFileSync(path.join(STATE, 'latest.json'), JSON.stringify(snap, null, 2))
  log(`ran: read=${snap.read} drift=${snap.drift} (missing=${snap.missing} stale=${snap.stale}) inserted=${snap.inserted} dropped=${snap.dropped} awaitingName=${snap.awaitingName} unresolvable=${snap.unresolvable}`)

  const v = judge(prev, snap)
  if (!v.alarm && !forceNotice) { log('quiet — silent by design'); return }
  await say([
    'The clip library has drifted from course_audio.',
    '',
    ...v.reasons.map(x => `• ${x}`),
    '',
    `${snap.read} clips read. Awaiting a name: ${snap.awaitingName}. In a voice nothing names: ${snap.unresolvable}.`,
    `Full report: ${file}`,
  ].join('\n'))
}

if (require.main === module) main()
module.exports = { judge }
