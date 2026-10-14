#!/usr/bin/env node
/**
 * NIGHTLY VOICE-POLICY AUDIT — report only (job #53, Tom 2026-10-12 16:17Z: voice assignment is one deterministic procedure).
 *
 * Runs tools/audio/voice-audit.cjs over every released/beta course (counts) and the 11 premium X_for_eng courses (counts + fix
 * plan), compares with last night, and posts ONE plain notice into Tom's 令 Watson room (surface-notice, relay 'voice-audit').
 * It moves nothing. Moving slots is `node tools/audio/voice-audit.cjs --course C --fix`, an act somebody chooses.
 * It also says when the Voice Lab's English cast stops saying what the coded policy expects (Charlotte f / Tom-006 m).
 *
 *   node tools/qa/voice-policy/nightly.cjs [--no-notice] [--courses a,b]
 * Snapshot: ~/ssi-evidence/ssi-dashboard-v7/tools/qa/voice-policy/<date>.json (and latest.json, the comparison base).
 * Exit 2 = it could not run (and it has said so in the room).
 */
const fs = require('fs'), path = require('path')
const va = require('../../audio/voice-audit.cjs')
const rv = require('../../../services/shared/resolve-voice.cjs')
const { evidencePath } = require('../../lib/evidence-path.cjs')

const argv = process.argv.slice(2), has = (f) => argv.includes(f), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }
const SURFACE = process.env.CS_SURFACE || 'http://localhost:4317'

/** Pure. Does the Voice Lab's English cast still say what the coded policy expects? Lines naming each disagreement. */
function englishCastDrift(cast) {
  const out = []
  for (const [g, want] of Object.entries(rv.EXPECTED_ENGLISH_TARGET)) {
    const got = rv.resolveVoice({ course: { course_code: 'eng_for_x', known_lang: 'zzz', target_lang: 'eng' }, role: g === 'f' ? 'target1' : 'target2' }, cast)
    if (got.status !== 'voice' || !rv.sameVoice(got.voiceId, want)) out.push(`English ${g} target cast is ${got.voiceId || got.reason}, policy expects ${want}`)
  }
  return out
}

/** Pure. The notice text from tonight's and last night's snapshots. */
function noticeText(now, prev, castLines) {
  const sum = (snap) => Object.values(snap.courses).reduce((t, c) => { for (const k of Object.keys(c.totals)) t[k] = (t[k] || 0) + c.totals[k]; return t }, {})
  const T = sum(now), P = prev ? sum(prev) : null
  const d = (k) => (P ? ` (${T[k] - (P[k] || 0) >= 0 ? '+' : ''}${T[k] - (P[k] || 0)})` : '')
  const L = [`Voice audit (nightly, report only — nothing moved): ${Object.keys(now.courses).length} courses. Drift ${T.drift || 0}${d('drift')} slots in a voice resolveVoice does not give; refused ${T.refused || 0}${d('refused')} (target language Tom has not cast); human ${T.human || 0}; no-ruling ${T['no-ruling'] || 0}.`]
  const worst = Object.entries(now.courses).filter(([, c]) => c.totals.drift > 0).sort((a, b) => b[1].totals.drift - a[1].totals.drift).slice(0, 8)
  if (worst.length) L.push('Most drift: ' + worst.map(([code, c]) => `${code} ${c.totals.drift}${prev && prev.courses[code] ? ` (${c.totals.drift - prev.courses[code].totals.drift >= 0 ? '+' : ''}${c.totals.drift - prev.courses[code].totals.drift})` : ''}`).join(', ') + '.')
  const plans = Object.entries(now.courses).filter(([, c]) => c.plan && c.plan.slots)
  if (plans.length) {
    const p = plans.reduce((t, [, c]) => { for (const k of Object.keys(c.plan)) t[k] = (t[k] || 0) + c.plan[k]; return t }, {})
    L.push(`Premium 11 fix plan: reuse ${p.reuseTexts} texts (${p.reuseSlots} slots, free); render ${p.renderTexts} texts (${p.renderChars} chars); ${p.presentationRender} intro texts for the intro tooling.`)
  }
  for (const l of castLines) L.push(`Cast check: ${l}.`)
  L.push('Fix one course: node tools/audio/voice-audit.cjs --course <code> --fix --dry-run (then without --dry-run; renders only with --max-chars).')
  return L.join('\n')
}

async function notice(text) {
  if (has('--no-notice')) { console.log(text); return }
  let headers = { 'Content-Type': 'application/json' }
  try { headers = { ...headers, ...require('/home/tomcassidy/command-surface/ops/cs-cron-identity.js').identityHeaders(SURFACE) } } catch { /* no identity: the post is refused, and logged below */ }
  const rooms = await (await fetch(`${SURFACE}/api/rooms`, { headers })).json()
  const jobId = (rooms.rooms || []).find((r) => r.key === 'watson')?.convId
  if (!jobId) throw new Error('no Watson room found on the surface')
  const r = await fetch(`${SURFACE}/api/surface-notice`, { method: 'POST', headers, body: JSON.stringify({ jobId, text, relay: 'voice-audit' }) })
  if (!r.ok) throw new Error(`surface-notice ${r.status}: ${await r.text()}`)
}

async function main() {
  const { pg, db } = await va.connect()
  const date = new Date().toISOString().slice(0, 10)
  const dir = evidencePath('tools/qa/voice-policy'); fs.mkdirSync(dir, { recursive: true })
  const latest = path.join(dir, 'latest.json'), prev = fs.existsSync(latest) ? JSON.parse(fs.readFileSync(latest, 'utf8')) : null
  try {
    const cast = await rv.loadCast(db)
    const codes = opt('--courses') ? opt('--courses').split(',')
      : (await pg.query(`select course_code from courses where status in ('released','beta') order by 1`)).rows.map((r) => r.course_code)
    const snap = { date, courses: {} }
    for (const code of codes) {
      const a = await va.audit(pg, db, code, cast, { withPlan: va.PREMIUM_11.includes(code) })
      snap.courses[code] = { totals: a.totals, plan: a.plan || null }
      console.log(va.render(code, a))
    }
    fs.writeFileSync(path.join(dir, `${date}.json`), JSON.stringify(snap, null, 1))
    fs.writeFileSync(latest, JSON.stringify(snap, null, 1))
    await notice(noticeText(snap, prev, englishCastDrift(cast)))
  } finally { await pg.end() }
}

if (require.main === module) {
  main().catch(async (e) => {
    console.error(e)
    try { await notice(`Voice audit (nightly) could not run: ${e.message}`) } catch (e2) { console.error('notice failed too:', e2.message) }
    process.exit(2)
  })
}
module.exports = { noticeText, englishCastDrift }
