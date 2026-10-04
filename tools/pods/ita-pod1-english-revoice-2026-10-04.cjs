#!/usr/bin/env node
/**
 * ita-pod1-english-revoice-2026-10-04.cjs — job #629. Tom, 2026-10-04: remake
 * ita_for_eng Pod 1 on Charlotte (female) and tom_001 (male) for the ENGLISH
 * known track; the Italian track is already Alessandra / Lorenzo.
 *
 * Scope: every KNOWN-role clip the player reads for the pod — `known_audio_id`
 * and each element of `sentence_known_audio_ids`. Gender is taken from the clip's
 * CURRENT voice (Olivia → Charlotte, Tom → tom_001), so each line keeps its
 * gender. Explainer (mixed Italian/English, and tom_001 speaks English only) and
 * Take-G clips are deliberately not touched.
 *
 * Make-before-break: render ALL clips through POST /api/audio/render (library
 * first, spend guard), verify each new row, and only then swap links. Old ids
 * are written to the evidence log; `--revert` restores them from it.
 *
 *   node tools/pods/ita-pod1-english-revoice-2026-10-04.cjs --dry-run|--render|--swap|--revert
 */
'use strict'
const path = require('path')
const fs = require('fs')
const os = require('os')
const REPO = path.join(__dirname, '..', '..')
require('dotenv').config({ path: path.join(REPO, '.env') })
const { createClient } = require('@supabase/supabase-js')

const POD = 'ita_for_eng:pod-1'
const COURSE = 'ita_for_eng'
const VOICE = {
  f: 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121', // Charlotte
  m: 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2', // tom_001
}
const OLD_GENDER = { bedd6226: 'f', gfzdpspr5fdp: 'm' }
const LOG_DIR = path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/docs/pods')
const MAP_FILE = path.join(LOG_DIR, 'ita-pod1-english-revoice-2026-10-04-map.json')
const BASE = process.env.POPTY_URL || 'http://localhost:3470'
const mode = ['--dry-run', '--render', '--swap', '--revert'].find((f) => process.argv.includes(f))
if (!mode) { console.error('say --dry-run, --render, --swap or --revert'); process.exit(1) }

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function loadClips () {
  const { data: rows, error } = await sb.from('listening_pod_sentences')
    .select('id,known_audio_id,sentence_known_audio_ids').eq('pod_id', POD)
  if (error) throw error
  const ids = new Set()
  for (const r of rows) {
    if (r.known_audio_id) ids.add(r.known_audio_id)
    for (const a of r.sentence_known_audio_ids || []) if (a) ids.add(a)
  }
  const clips = new Map()
  const all = [...ids]
  for (let i = 0; i < all.length; i += 100) {
    const { data, error: e } = await sb.from('course_audio').select('id,text,voice_id,role,language').in('id', all.slice(i, i + 100))
    if (e) throw e
    for (const c of data) clips.set(c.id, c)
  }
  return { rows, clips }
}

// ECONNREFUSED means the request never reached Popty (it restarts under deploys),
// so nothing was rendered or spent and re-asking is safe. Any other outcome,
// including a spend-guard refusal, is returned as the answer and never retried.
async function renderOne (text, voiceId, dryRun) {
  for (let i = 0; ; i++) {
    const r = await renderOnce(text, voiceId, dryRun)
    if (r.status !== 0 || !/ECONNREFUSED/.test(r.error || '') || i >= 12) return r
    await new Promise((res) => setTimeout(res, 15000))
  }
}

async function renderOnce (text, voiceId, dryRun) {
  let res
  try {
    res = await fetch(`${BASE}/api/audio/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-agent-id': 'job-629-ita-pod1' },
    body: JSON.stringify({ courseCode: COURSE, role: 'known', language: 'eng', text, voiceId, voiceBound: true, dryRun,
      purpose: '#629 Italian pod 1 English re-voice (Tom 2026-10-04): Charlotte/tom_001', job: '#629' }),
    })
  } catch (e) { return { ok: false, status: 0, error: `fetch: ${e.message} ${e.cause && e.cause.code || ''}` } }
  const out = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
  return { status: res.status, ...out }
}

async function main () {
  fs.mkdirSync(LOG_DIR, { recursive: true })
  if (mode === '--revert') {
    const map = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'))
    for (const r of map.rows) {
      const { error } = await sb.from('listening_pod_sentences')
        .update({ known_audio_id: r.known_audio_id_old, sentence_known_audio_ids: r.sentence_known_audio_ids_old }).eq('id', r.id)
      if (error) throw error
    }
    console.log(`reverted ${map.rows.length} sentence rows to the old audio ids`)
    return
  }

  const { rows, clips } = await loadClips()
  // unique work: (text, new voice)
  const jobs = new Map()
  const skipped = []
  for (const c of clips.values()) {
    const g = OLD_GENDER[String(c.voice_id).replace(/^xai_/, '')]
    if (!g) { skipped.push(c); continue }
    jobs.set(`${g}|${c.text}`, { gender: g, text: c.text })
  }
  console.log(`${clips.size} known clips, ${jobs.size} unique (gender,text) renders, ${skipped.length} not on Olivia/Tom (left alone)`)
  const done = fs.existsSync(MAP_FILE) ? JSON.parse(fs.readFileSync(MAP_FILE, 'utf8')) : { audio: {}, rows: [] }

  if (mode === '--dry-run' || mode === '--render') {
    let spent = 0, lib = 0, fail = 0, would = 0, n = 0
    for (const [k, j] of jobs) {
      if (done.audio[k]) continue
      n++; if (n % 25 === 0) console.log(`  … ${n}/${jobs.size}`)
      const r = await renderOne(j.text, VOICE[j.gender], mode === '--dry-run')
      if (!r.ok) { fail++; console.warn('✗', k, r.status, r.code || r.error); if (r.status === 402) break; continue }
      if (r.source === 'library') lib++
      if (r.source === 'would-render') would += r.wouldSpendChars || 0
      spent += r.charsSpent || 0
      if (mode === '--render') { done.audio[k] = r.audioId; fs.writeFileSync(MAP_FILE, JSON.stringify(done, null, 1)) }
    }
    console.log(`${mode}: library ${lib}, failed ${fail}, charsSpent ${spent}, wouldSpend ${would}`)
    return
  }

  // --swap: every new clip must exist and be Cartesia before any link moves.
  const missing = [...jobs.keys()].filter((k) => !done.audio[k])
  if (missing.length) throw new Error(`${missing.length} clips not rendered yet — run --render first`)
  const newIds = [...new Set(Object.values(done.audio))]
  const newRows = []
  for (let i = 0; i < newIds.length; i += 100) {
    const { data, error: ne } = await sb.from('course_audio').select('id,voice_id,s3_key,duration_ms').in('id', newIds.slice(i, i + 100))
    if (ne) throw ne
    newRows.push(...data)
  }
  const bad = newRows.filter((r) => !/^cartesia_(71a7ad14|8fef4d59)/.test(r.voice_id || '') || !r.s3_key || !(r.duration_ms > 300))
  if (bad.length || newRows.length !== newIds.length) throw new Error(`verify failed: ${bad.length} bad, ${newRows.length}/${newIds.length} found`)
  const remap = (id) => {
    const c = clips.get(id); if (!c) return id
    const g = OLD_GENDER[String(c.voice_id).replace(/^xai_/, '')]
    return g ? done.audio[`${g}|${c.text}`] : id
  }
  const log = []
  for (const r of rows) {
    const kn = r.known_audio_id ? remap(r.known_audio_id) : null
    const sk = r.sentence_known_audio_ids ? r.sentence_known_audio_ids.map((a) => (a ? remap(a) : a)) : null
    log.push({ id: r.id, known_audio_id_old: r.known_audio_id, sentence_known_audio_ids_old: r.sentence_known_audio_ids })
    const { error } = await sb.from('listening_pod_sentences').update({ known_audio_id: kn, sentence_known_audio_ids: sk }).eq('id', r.id)
    if (error) throw error
  }
  done.rows = log
  fs.writeFileSync(MAP_FILE, JSON.stringify(done, null, 1))
  console.log(`swapped ${rows.length} sentence rows; old ids in ${MAP_FILE}`)
}
main().catch((e) => { console.error('FATAL', e.message || e); process.exit(1) })
