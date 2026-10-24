#!/usr/bin/env node
/**
 * AUDIO TRUTH IN THREE COLUMNS — what the learner app PLAYS vs what the DB says was RECORDED vs what is CAST
 * (Tom, job #329: "We need to be able to distinguish what the player plays from what the DB says has been recorded
 * and/or selected as the cast voice").
 *
 * READ-ONLY. Renders nothing, writes nothing.
 *
 *   A  PLAYED    the audio ids the learner app's own bundle door serves for each slot (GET <base>/api/courses/:code/bundle,
 *                over HTTP, exactly as useCourseBundle fetches it). Anonymous = the free preview slice; pass --token for
 *                a signed-in learner's whole course. The ref may carry a revision suffix (uuid.vN) — kept and compared.
 *   B  RECORDED  course_audio for those exact ids (voice_id, origin, created_at, s3_key, audio_revision), read with
 *                services/shared/agent-db.cjs clipsById — on the nightly QA copy when DATABASE_URL points there.
 *   C  CAST      what a render for that role would use today: Popty's GET /api/courses/:code/voice-config/resolved.
 *
 * Every row is flagged where A, B, C disagree:
 *   ok             recorded voice == cast voice
 *   off-cast       recorded voice != cast voice (the learner hears B, not C)
 *   human          a human recording (never judged against the cast)
 *   no-row         the bundle names an id course_audio does not hold (in this copy)
 *   stale-ref      the bundle's revision suffix differs from the row's current audio_revision
 *   no-audio       the slot has no audio id at all in the bundle
 *
 *   set -a; . ~/ssi-restore/qa-copy.env; set +a
 *   node tools/audio/audio-truth.cjs --course zho_for_eng --seeds 1-100 [--base https://saysomethingin.app]
 *        [--bundle file.json] [--token <learner bearer>] [--json out.json] [--md out.md]
 */
const fs = require('fs')
const { tryCanonicalVoiceId } = require('../../services/shared/clip-identity.cjs')

const ROLES = ['target1', 'target2', 'known', 'presentation']

/** Pure. "1-100" → {from:1,to:100}; "7" → {from:7,to:7}. */
function parseRange(s) {
  const m = /^(\d+)(?:-(\d+))?$/.exec(String(s || '').trim())
  if (!m) throw new Error(`bad --seeds ${s} (want e.g. 1-100)`)
  return { from: Number(m[1]), to: Number(m[2] || m[1]) }
}

/** Pure. "uuid" | "uuid.v3" → {id, revision} (revision 1 when absent). */
function parseRef(ref) {
  const m = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\.v(\d+))?$/i.exec(String(ref || ''))
  return m ? { id: m[1].toLowerCase(), revision: m[2] ? Number(m[2]) : 1 } : null
}

/** Pure. Seed number of "S0042L03" / "S0042". */
const seedOf = (id) => { const m = /^S(\d{4})/.exec(String(id || '')); return m ? Number(m[1]) : null }

/**
 * Pure. Every audio slot the bundle hands the player inside the seed range:
 * lego intros/debuts (ephemeralAudio), practice phrases (audio), seed sentences (audio).
 * @returns {{slots: Array<{kind, key, seed, role, ref}>, maxSeed: number, previewOnly: boolean}}
 */
function extractSlots(bundle, { from, to }) {
  const slots = []
  let maxSeed = 0
  const push = (kind, key, seed, audio) => {
    if (seed == null) return
    if (seed > maxSeed) maxSeed = seed
    if (seed < from || seed > to) return
    for (const role of ROLES) {
      if (kind !== 'lego' && role === 'presentation') continue
      const a = audio && audio[role]
      slots.push({ kind, key, seed, role, ref: a && a.id ? String(a.id) : null })
    }
  }
  for (const l of bundle.legos || []) push('lego', l.legoId, l.seedNumber ?? seedOf(l.legoId), l.ephemeralAudio || l.audio)
  for (const p of bundle.phrases || []) push('phrase', p.phraseId, seedOf(p.legoId), p.audio)
  for (const s of bundle.seeds || []) push('seed', s.seedId, s.seedNumber ?? seedOf(s.seedId), s.audio)
  return { slots, maxSeed, previewOnly: !!bundle.previewOnly }
}

/** Pure. Provider of a voice id under the estate's one identity rule ('xai_eve' and 'eve' are one voice). */
function providerOf(voiceId) {
  if (!voiceId) return null
  const c = tryCanonicalVoiceId(voiceId)
  if (c) return c.split('_')[0]
  return /^human/i.test(voiceId) ? 'human' : 'unknown'
}
const canon = (v) => (v ? tryCanonicalVoiceId(v) || String(v) : null)

/**
 * Pure. Join slots (A) with clip rows (B, Map id→row) and the cast (C, role→voiceId) into flagged rows.
 */
function join(slots, clips, cast) {
  return slots.map((s) => {
    const ref = s.ref ? parseRef(s.ref) : null
    const row = ref ? clips.get(ref.id) : null
    const castVoice = cast[s.role] || null
    const out = {
      ...s,
      played_id: ref ? ref.id : null,
      played_revision: ref ? ref.revision : null,
      recorded_voice: row ? row.voice_id : null,
      recorded_provider: row ? (row.origin === 'human' ? 'human' : providerOf(row.voice_id)) : null,
      recorded_at: row ? row.created_at : null,
      recorded_revision: row ? Number(row.audio_revision || 1) : null,
      recorded_role: row ? row.role : null,
      recorded_course: row ? row.course_code : null,
      s3_key: row ? row.s3_key : null,
      cast_voice: castVoice,
      cast_provider: providerOf(castVoice),
    }
    let flag
    if (!ref) flag = 'no-audio'
    else if (!row) flag = 'no-row'
    else if (row.origin === 'human') flag = 'human'
    else if (canon(row.voice_id) === canon(castVoice)) flag = 'ok'
    else flag = 'off-cast'
    out.flag = flag
    out.stale_ref = !!(row && ref.revision !== out.recorded_revision)
    return out
  })
}

/** Pure. Counts per role × (recorded provider:voice) and per flag. */
function aggregate(rows) {
  const byFlag = {}, byRoleVoice = {}, byRoleProvider = {}
  let stale = 0
  for (const r of rows) {
    byFlag[r.flag] = (byFlag[r.flag] || 0) + 1
    if (r.stale_ref) stale++
    const k = `${r.role}\t${r.recorded_voice || '(' + r.flag + ')'}`
    byRoleVoice[k] = (byRoleVoice[k] || 0) + 1
    const p = `${r.role}\t${r.recorded_provider || '(' + r.flag + ')'}`
    byRoleProvider[p] = (byRoleProvider[p] || 0) + 1
  }
  return { total: rows.length, byFlag, staleRefs: stale, byRoleVoice, byRoleProvider }
}

function markdown({ course, range, base, bundleMeta, cast, agg, rows }) {
  const L = []
  L.push(`# Audio truth — ${course} seeds ${range.from}-${range.to}`, '')
  L.push(`Played from \`${base}/api/courses/${course}/bundle\` (bundle ${bundleMeta.version}, previewOnly=${bundleMeta.previewOnly}, highest seed in bundle ${bundleMeta.maxSeed}).`, '')
  L.push('Cast today: ' + ROLES.map((r) => `${r} \`${cast[r] || '—'}\``).join(', '), '')
  L.push(`Slots: ${agg.total}. Flags: ` + Object.entries(agg.byFlag).map(([k, v]) => `${k} ${v}`).join(', ') + `. Stale revision refs: ${agg.staleRefs}.`, '')
  L.push('| role | recorded voice (what plays) | slots |', '|---|---|---|')
  for (const [k, v] of Object.entries(agg.byRoleVoice).sort()) { const [role, voice] = k.split('\t'); L.push(`| ${role} | ${voice} | ${v} |`) }
  L.push('', '| kind | id | seed | role | played id | recorded voice | recorded at | cast | flag |', '|---|---|---|---|---|---|---|---|---|')
  for (const r of rows) L.push(`| ${r.kind} | ${r.key} | ${r.seed} | ${r.role} | ${r.played_id ? r.played_id.slice(0, 8) : '—'}${r.stale_ref ? ' (stale v' + r.played_revision + ')' : ''} | ${r.recorded_voice || '—'} | ${r.recorded_at ? new Date(r.recorded_at).toISOString().slice(0, 10) : '—'} | ${r.cast_voice || '—'} | ${r.flag} |`)
  return L.join('\n') + '\n'
}

async function main(argv) {
  const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d }
  const course = arg('course'); if (!course) throw new Error('--course required')
  const range = parseRange(arg('seeds', '1-100'))
  const base = arg('base', 'https://saysomethingin.app').replace(/\/$/, '')
  const popty = arg('popty', 'http://localhost:3470')
  let bundle
  if (arg('bundle')) bundle = JSON.parse(fs.readFileSync(arg('bundle'), 'utf8'))
  else {
    const headers = arg('token') ? { Authorization: `Bearer ${arg('token')}` } : {}
    const r = await fetch(`${base}/api/courses/${course}/bundle`, { headers })
    if (!r.ok) throw new Error(`bundle ${r.status}`)
    bundle = await r.json()
  }
  const { slots, maxSeed, previewOnly } = extractSlots(bundle, range)
  const cr = await fetch(`${popty}/api/courses/${course}/voice-config/resolved`)
  const resolved = (await cr.json()).resolved || {}
  const cast = Object.fromEntries(ROLES.map((r) => [r, resolved.voices && resolved.voices[r] ? resolved.voices[r].voiceId : null]))
  const db = require('../../services/shared/agent-db.cjs')
  const pg = await db.connect()
  let clips
  try {
    clips = await db.clipMap(pg, slots.map((s) => s.ref && parseRef(s.ref) && parseRef(s.ref).id), { cols: 'id::text AS id, course_code, role, language, voice_id, s3_key, duration_ms, origin, created_at, audio_revision' })
  } finally { await pg.end() }
  const rows = join(slots, clips, cast)
  const agg = aggregate(rows)
  const bundleMeta = { version: bundle.version, previewOnly, maxSeed }
  const report = { course, range, base, bundleMeta, cast, agg, rows }
  if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify(report, null, 1))
  if (arg('md')) fs.writeFileSync(arg('md'), markdown(report))
  console.log(`${course} seeds ${range.from}-${range.to}: ${agg.total} slots (bundle previewOnly=${previewOnly}, highest seed ${maxSeed})`)
  console.log('flags', agg.byFlag, 'stale refs', agg.staleRefs)
  for (const [k, v] of Object.entries(agg.byRoleVoice).sort()) console.log(`  ${k.replace('\t', '  ')}  ${v}`)
  if (maxSeed < range.to) console.log(`GAP: the bundle stops at seed ${maxSeed}; seeds ${maxSeed + 1}-${range.to} are not in it${previewOnly ? ' (anonymous preview slice — pass --token)' : ''}`)
}

module.exports = { parseRange, parseRef, extractSlots, providerOf, join, aggregate, markdown }
if (require.main === module) main(process.argv.slice(2)).catch((e) => { console.error(e.message); process.exit(1) })
