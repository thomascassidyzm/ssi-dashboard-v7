#!/usr/bin/env node
/**
 * NIGHTLY VOICE-POLICY AUDIT — report only (job #53, Tom 2026-10-12 16:17Z: voice assignment is one deterministic procedure).
 *
 * Runs tools/audio/voice-audit.cjs over the 11 premium X_for_eng courses (full counts, drift included, kept in the snapshot as the
 * detail file) and posts ONE plain notice of three lines into Tom's 令 Watson room (surface-notice, relay 'voice-audit'):
 * cast status, real gaps, English roster. Tom 2026-10-16: a voice that differs from the casting is variety, not error.
 * It moves nothing. Moving slots is `node tools/audio/voice-audit.cjs --course C --fix`, an act somebody chooses.
 *
 *   node tools/qa/voice-policy/nightly.cjs [--no-notice] [--courses a,b]
 * Snapshot: ~/ssi-evidence/ssi-dashboard-v7/tools/qa/voice-policy/<date>.json (and latest.json).
 * Exit 2 = it could not run (and it has said so in the room).
 */
const fs = require('fs'), path = require('path')
const va = require('../../audio/voice-audit.cjs')
const { nameBackend } = require('../lib/name-backend.cjs')
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

/**
 * Tom 2026-10-16 (r-2026-10-16-voice-casting-10-16-cast-spa): a voice that differs from the casting is VARIETY, not error.
 * So the notice carries only what he acts on: which premium courses are cast, real gaps, the English roster. Drift stays in the snapshot.
 */
const CAST = Object.freeze(['spa_for_eng', 'spa_mx_for_eng', 'deu_for_eng', 'ita_for_eng', 'fra_for_eng', 'por_for_eng', 'por_br_for_eng', 'zho_for_eng'])
const TO_CONFIRM = Object.freeze(['jpn_for_eng', 'kor_for_eng', 'ara_for_eng'])
const short = (c) => c.replace(/_for_eng$/, '')
const ARAN_004 = /aran[\s_-]*0*04/i

/** Pure. Gaps = slots with no playable audio (dangling pointer, no file, pending, too short) or in a voice of an uncast/refused language. */
function gapLines(now) {
  return Object.entries(now.courses).filter(([c]) => CAST.includes(c) || TO_CONFIRM.includes(c)).map(([c, v]) => {
    const none = (v.totals.dangling || 0) + (v.totals.unplayable || 0), unc = v.totals.refused || 0
    return { c, none, unc }
  }).filter((r) => r.none + r.unc > 0)
    .map((r) => `${short(r.c)} ${[r.none && `${r.none} with no playable audio`, r.unc && `${r.unc} in an uncast-language voice`].filter(Boolean).join(', ')}`)
}

/** Pure. English prompt roster vs Tom's list: Tom-006 male, aran-004 second male, Charlotte female, Sonia legacy. A line per miss. */
function rosterLines(cast, voices) {
  const out = englishCastDrift(cast)
  const live = (v) => v && v.is_active !== false
  if (!(voices || []).some((v) => live(v) && (ARAN_004.test(v.voice_id || '') || ARAN_004.test(v.display_name || '')))) out.push('aran-004 (second male) is not an active voice')
  if (!(voices || []).some((v) => live(v) && /sonia/i.test(v.voice_id || ''))) out.push('Sonia (legacy) is not an active voice')
  return out
}

/** Pure. Cast courses' TARGET-voice coverage (target1+target2 slots playing the cast voice), from the same pointers the app plays. */
function coverageLine(now) {
  const parts = CAST.filter((c) => now.courses[c] && now.courses[c].byRole).map((c) => {
    const t = va.targetCoverage(now.courses[c].byRole)
    return t.total ? `${short(c)} ${t.pct.toFixed(t.pct >= 99.95 ? 0 : 1)}% (${t.ok}/${t.total})` : null
  }).filter(Boolean)
  return parts.length ? `Target voice already in the cast, by slot the app plays: ${parts.join(', ')}.` : null
}

/** Pure. The notice: three lines, a fourth when the snapshot carries per-role counts. */
function noticeText(now, rosterMisses) {
  const gaps = gapLines(now)
  return [
    `Voice casting: cast = ${CAST.map(short).join(', ')}; still to confirm = ${TO_CONFIRM.map(short).join(', ')}.`,
    coverageLine(now),
    gaps.length ? `Real gaps: ${gaps.join('; ')}.` : 'Real gaps: none (every premium slot plays, none in an uncast language).',
    rosterMisses.length ? `English roster off Tom's list: ${rosterMisses.join('; ')}.` : 'English roster matches: tom-006 male, aran-004 second male, Charlotte female, Sonia legacy.',
  ].filter(Boolean).join('\n')
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
  await nameBackend(pg, 'qa:voice-audit')
  const date = new Date().toISOString().slice(0, 10)
  const dir = evidencePath('tools/qa/voice-policy'); fs.mkdirSync(dir, { recursive: true })
  const latest = path.join(dir, 'latest.json')
  try {
    const cast = await rv.loadCast(db)
    const codes = opt('--courses') ? opt('--courses').split(',') : va.PREMIUM_11
    const snap = { date, courses: {} }
    for (const code of codes) {
      const a = await va.audit(pg, db, code, cast, { withPlan: false })
      snap.courses[code] = { totals: a.totals, byRole: a.byRole, plan: a.plan || null }
      console.log(va.render(code, a))
    }
    fs.writeFileSync(path.join(dir, `${date}.json`), JSON.stringify(snap, null, 1))
    fs.writeFileSync(latest, JSON.stringify(snap, null, 1))
    const { data: voices, error } = await db.from('voices').select('voice_id, display_name, is_active').or('display_name.ilike.%aran%004%,voice_id.ilike.%aran%004%,voice_id.ilike.%sonia%')
    if (error) throw new Error(`cannot read voices: ${error.message}`)
    await notice(noticeText(snap, rosterLines(cast, voices)))
  } finally { await pg.end() }
}

if (require.main === module) {
  main().catch(async (e) => {
    console.error(e)
    try { await notice(`Voice audit (nightly) could not run: ${e.message}`) } catch (e2) { console.error('notice failed too:', e2.message) }
    process.exit(2)
  })
}
module.exports = { coverageLine, noticeText, englishCastDrift, gapLines, rosterLines }
