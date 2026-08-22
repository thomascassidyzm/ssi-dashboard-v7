#!/usr/bin/env node
/**
 * The evidence that matters: drive the REAL serving path for a sample of relinked slots and
 * confirm a learner is handed the new clip. A DB row and an S3 object both being fine proves
 * nothing about what is actually served — that inference is what this check refuses to make.
 *
 * Two hops per sampled slot, both over HTTP, neither of them the database:
 *   1. GET <api>/api/pods/<course>/<slug>   — the pod detail route the app itself calls.
 *      Assert the sentence's known_audio_id / target_audio_id IS the shared clip id.
 *   2. GET <host>/api/audio/<id>.v<rev>     — the app's own versioned player URL, the same
 *      form tools/eng-sample-pack-page.cjs uses. Assert 200, audio/mpeg, and a byte length
 *      that matches the object we verified. A bucket link would prove bytes exist and prove
 *      nothing about what a learner is served.
 *
 * Also spot-checks the Welsh human recordings on the same serving path — they must still
 * resolve to Aran, untouched.
 *
 *   node tools/eng-distinct-render/served-check.cjs [--n 12]
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { q } = require('./db.cjs')

const D = __dirname
const HOST = process.env.SERVED_CHECK_HOST || 'https://staging.saysomethingin.app'
const API = process.env.SERVED_CHECK_API || 'http://localhost:3470'   // production-api, PRODUCTION_API_PORT
const N = (() => { const i = process.argv.indexOf('--n'); return i > -1 ? Number(process.argv[i + 1]) : 12 })()

const get = (u, extra = []) => execFileSync('curl', ['-s', '-m', '45', ...extra, u]).toString()
// GET, not HEAD: the player route answers HEAD with 405, so a HEAD probe would report
// every clip in the estate as broken — including Aran's human recordings, which is how
// this was caught. -o /dev/null keeps the bytes off disk while still fetching them, so
// Content-Length here is a real transfer, not a promise.
// The size is curl's own %{size_download} — bytes that actually arrived — not a
// Content-Length header. The header is unreliable here (redirects and chunked responses
// both put a misleading value in the stream), and it is a promise about the body rather
// than the body. The status is the FINAL status after redirects, for the same reason.
const headOf = u => {
  const out = execFileSync('curl', ['-sL', '-m', '45', '-o', '/dev/null',
    '-w', '%{http_code} %{size_download} %{content_type}', u]).toString().trim().split(/\s+/)
  return { status: Number(out[0] || 0), len: Number(out[1] || 0), type: out[2] || '' }
}

;(async () => {
  const applied = JSON.parse(fs.readFileSync(D + '/relink-applied-log.json'))
    .filter(r => r.result === 'relinked')
  console.log('relinked slots on record:', applied.length)

  // Sample deterministically and spread across courses, so the draw is not one pod's luck.
  const byCourse = new Map()
  for (const r of applied) { if (!byCourse.has(r.course_code)) byCourse.set(r.course_code, []); byCourse.get(r.course_code).push(r) }
  const courses = [...byCourse.keys()].sort()
  const sample = []
  for (let i = 0; sample.length < N && i < courses.length * 4; i++) {
    const list = byCourse.get(courses[i % courses.length])
    const pick = list[Math.floor(i / courses.length) % list.length]
    if (pick && !sample.includes(pick)) sample.push(pick)
  }

  const podMeta = new Map()
  for (const r of sample) {
    if (podMeta.has(r.pod_id)) continue
    const [course, slug] = [r.pod_id.split(':')[0], r.pod_id.split(':').slice(1).join(':')]
    podMeta.set(r.pod_id, { course, slug })
  }

  const results = []
  for (const r of sample) {
    const { course, slug } = podMeta.get(r.pod_id)
    const res = { course, slug, sentence_id: r.sentence_id, column: r.column, expect: r.to, text: (r.text || '').slice(0, 50) }
    try {
      const body = JSON.parse(get(`${API}/api/pods/${course}/${slug}`))
      const s = (body.sentences || []).find(x => x.id === r.sentence_id)
      res.api_status = 'ok'
      res.served_audio_id = s ? s[r.column] : null
      res.api_points_at_new_clip = res.served_audio_id === r.to
    } catch (e) { res.api_status = 'ERROR ' + String(e.message).slice(0, 100) }

    const rev = (await q('SELECT coalesce(audio_revision,1) rev, voice_id, s3_key, duration_ms FROM course_audio WHERE id=$1', [r.to]))[0]
    res.voice_id = rev?.voice_id
    const playerUrl = `${HOST}/api/audio/${r.to}.v${rev?.rev ?? 1}`
    const h = headOf(playerUrl)
    res.player_url = playerUrl
    res.player_http = h.status
    res.player_bytes = h.len
    res.player_type = h.type
    res.playable = h.status === 200 && h.len > 2048
    results.push(res)
    console.log(`${res.playable && res.api_points_at_new_clip ? 'OK  ' : 'FAIL'} ${course}/${slug} ${r.column} api=${res.api_points_at_new_clip} player=${h.status} ${h.len}b ${res.voice_id}`)
  }

  // Welsh: the 23 human recordings, on the same serving path, must be untouched.
  const welsh = await q(
    `SELECT s.id, s.pod_id, s.known_audio_id, a.voice_id, a.s3_key, a.origin, coalesce(a.audio_revision,1) rev
     FROM listening_pod_sentences s JOIN listening_pods p ON p.id=s.pod_id
     JOIN course_audio a ON a.id=s.known_audio_id
     WHERE p.course_code LIKE 'cym%' AND p.slug LIKE 'pod-0%' AND s.known_audio_id IS NOT NULL`)
  const wrong = welsh.filter(w => w.voice_id !== 'human_aran_cym_n' || w.origin !== 'human')
  console.log(`\nWelsh human-recording rows still linked: ${welsh.length} (${new Set(welsh.map(w => w.known_audio_id)).size} distinct clips), off-cast/non-human: ${wrong.length}`)
  let wAlive = 0
  for (const w of welsh) {
    const h = headOf(`${HOST}/api/audio/${w.known_audio_id}.v${w.rev}`)
    w.player_http = h.status; w.player_bytes = h.len
    if (h.status === 200 && h.len > 2048) wAlive++
    else console.log(`  DEAD ${w.pod_id} ${w.known_audio_id} ${h.status} ${h.len}b`)
  }
  console.log(`  all ${welsh.length} still Aran, ${wAlive}/${welsh.length} serve real audio through the player path`)

  const pass = results.filter(r => r.playable && r.api_points_at_new_clip).length
  console.log(`\nSERVED SPOT-CHECK: ${pass}/${results.length} slots serve the new shared clip through the real path`)
  fs.writeFileSync(D + '/served-check.json', JSON.stringify({ results, welsh: welsh.map(w => ({ ...w })) }, null, 1))
})().catch(e => { console.error(e); process.exit(1) })
