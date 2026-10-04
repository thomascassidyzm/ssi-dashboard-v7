#!/usr/bin/env node
/**
 * ita-pod1-finish-revoice-2026-10-04.cjs — job #640, follow-up to #629
 * (ita-pod1-english-revoice-2026-10-04.cjs). Two leftovers in ita_for_eng Pod 1:
 *
 *  1. INTERLOCUTOR known lines: speaker gender follows the CAST. The Interlocutor's
 *     Italian is Lorenzo (male), so a known line still on Charlotte (its old clip was
 *     female) is re-voiced on tom_001. Found by rule, not by id: speaker Interlocutor,
 *     target clip on a male cast voice, known clip not on tom_001.
 *  2. TAKE-G Italian clips still on xAI (ara / xai_ara / x7avnu1k): re-voiced on the
 *     cast Italian voice of that row's speaker — the voice of its own target clip
 *     (Alessandra f / Lorenzo m). The xAI "[pause]" cue is stripped from the text:
 *     Cartesia would speak it, and every Cartesia Take-G already in the pod is plain
 *     text. The new audio has different timing, so the row's atom_map_fine spans
 *     (measured on the old xAI audio) are cleared, exactly as render-take-g.cjs does
 *     when a group's link moves; the slicer re-earns them.
 *
 * Mixed Italian/English explainer clips are not touched.
 *
 * Make-before-break: render everything through POST /api/audio/render (library first,
 * spend guard, no retries), verify every new row, only then move links. Old ids and
 * old atom_map_fine go to the map file; `--revert` restores them.
 *
 *   node tools/pods/ita-pod1-finish-revoice-2026-10-04.cjs --dry-run|--render|--swap|--revert
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
const TOM_001 = 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2'
const LORENZO = 'cartesia_ee16f140-f6dc-490e-a1ed-c1d537ea0086'
const XAI_VOICE = /^(xai_)?(ara|x7avnu1k)$/
const LOG_DIR = path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/docs/pods')
const MAP_FILE = path.join(LOG_DIR, 'ita-pod1-finish-revoice-2026-10-04-map.json')
const BASE = process.env.POPTY_URL || 'http://localhost:3470'
const mode = ['--dry-run', '--render', '--swap', '--revert'].find((f) => process.argv.includes(f))
if (!mode) { console.error('say --dry-run, --render, --swap or --revert'); process.exit(1) }
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// ECONNREFUSED = never reached Popty (it restarts under deploys): nothing spent, safe to re-ask.
// Anything else, including a spend-guard refusal, is the answer and is never retried.
async function renderOne (req) {
  for (let i = 0; ; i++) {
    let r
    try {
      const res = await fetch(`${BASE}/api/audio/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-agent-id': 'job-640-ita-pod1-finish' },
        body: JSON.stringify({ courseCode: COURSE, voiceBound: true, job: '#640',
          purpose: '#640 Italian pod 1 finish (Tom 2026-10-04): speaker gender follows the cast', ...req }),
      })
      const out = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
      r = { status: res.status, ...out }
    } catch (e) { r = { ok: false, status: 0, error: `fetch: ${e.message} ${(e.cause && e.cause.code) || ''}` } }
    if (r.status !== 0 || !/ECONNREFUSED/.test(r.error || '') || i >= 12) return r
    await new Promise((res) => setTimeout(res, 15000))
  }
}

async function clipsById (ids) {
  const m = new Map(); const all = [...new Set(ids.filter(Boolean))]
  for (let i = 0; i < all.length; i += 100) {
    const { data, error } = await sb.from('course_audio').select('id,text,voice_id,s3_key,duration_ms').in('id', all.slice(i, i + 100))
    if (error) throw error
    for (const c of data) m.set(c.id, c)
  }
  return m
}

// Work list: [{ key, kind, rowId, index?, role, language, text, voiceId, oldId }]
async function plan () {
  const { data: rows, error } = await sb.from('listening_pod_sentences')
    .select('id,speaker,known_audio_id,target_audio_id,takeg_audio_ids,atom_map_fine').eq('pod_id', POD)
  if (error) throw error
  const clips = await clipsById(rows.flatMap((r) => [r.known_audio_id, r.target_audio_id, ...(r.takeg_audio_ids || [])]))
  const work = []
  for (const r of rows) {
    const tv = clips.get(r.target_audio_id)
    if (r.speaker === 'Interlocutor' && tv && tv.voice_id === LORENZO) {
      const k = clips.get(r.known_audio_id)
      if (k && k.voice_id !== TOM_001) work.push({ key: `K|${r.id}`, kind: 'known', rowId: r.id, role: 'known', language: 'eng', text: k.text, voiceId: TOM_001, oldId: k.id })
    }
    ;(r.takeg_audio_ids || []).forEach((id, index) => {
      const c = id && clips.get(id)
      if (!c || !XAI_VOICE.test(String(c.voice_id))) return
      if (!tv || !/^cartesia_/.test(tv.voice_id)) throw new Error(`${r.id}: target clip is not on a Cartesia cast voice`)
      if (r.takeg_audio_ids.length !== 1) throw new Error(`${r.id}: Take-G array has ${r.takeg_audio_ids.length} groups; span clearing here assumes one`)
      const text = c.text.replace(/\s*\[pause\]\s*/g, ' ').replace(/\s+/g, ' ').trim()
      work.push({ key: `G|${r.id}|${index}`, kind: 'takeg', rowId: r.id, index, role: 'target1', language: 'ita', text, voiceId: tv.voice_id, oldId: c.id })
    })
  }
  return { rows, work }
}

async function main () {
  fs.mkdirSync(LOG_DIR, { recursive: true })
  const done = fs.existsSync(MAP_FILE) ? JSON.parse(fs.readFileSync(MAP_FILE, 'utf8')) : { audio: {}, rows: [] }

  if (mode === '--revert') {
    for (const r of done.rows) {
      const { error } = await sb.from('listening_pod_sentences').update(r.old).eq('id', r.id)
      if (error) throw error
    }
    console.log(`reverted ${done.rows.length} sentence rows`)
    return
  }

  const { rows, work } = await plan()
  console.log(`${work.filter((w) => w.kind === 'known').length} Interlocutor known lines, ${work.filter((w) => w.kind === 'takeg').length} Take-G clips`)

  if (mode === '--dry-run' || mode === '--render') {
    let spent = 0, lib = 0, fail = 0, would = 0
    for (const w of work) {
      if (done.audio[w.key]) continue
      const r = await renderOne({ role: w.role, language: w.language, text: w.text, voiceId: w.voiceId, dryRun: mode === '--dry-run' })
      if (!r.ok) { fail++; console.warn('✗', w.key, r.status, r.code || r.error); if (r.status === 402) break; continue }
      if (r.source === 'library') lib++
      if (r.source === 'would-render') would += r.wouldSpendChars || 0
      spent += r.charsSpent || 0
      console.log(`${w.key} ${r.source} ${r.charsSpent || r.wouldSpendChars || 0} "${w.text.slice(0, 50)}"`)
      if (mode === '--render') { done.audio[w.key] = r.audioId; fs.writeFileSync(MAP_FILE, JSON.stringify(done, null, 1)) }
    }
    console.log(`${mode}: library ${lib}, failed ${fail}, charsSpent ${spent}, wouldSpend ${would}`)
    return
  }

  // --swap: every new clip must exist, be on the intended voice, with bytes, before any link moves.
  const missing = work.filter((w) => !done.audio[w.key])
  if (missing.length) throw new Error(`${missing.length} clips not rendered yet — run --render first`)
  const fresh = await clipsById(Object.values(done.audio))
  const bad = work.filter((w) => { const c = fresh.get(done.audio[w.key]); return !c || c.voice_id !== w.voiceId || !c.s3_key || !(c.duration_ms > 300) })
  if (bad.length) throw new Error(`verify failed on ${bad.map((w) => w.key).join(', ')}`)
  const byRow = new Map(rows.map((r) => [r.id, r]))
  const log = done.rows.slice()
  for (const w of work) {
    const r = byRow.get(w.rowId); const newId = done.audio[w.key]
    let upd
    if (w.kind === 'known') upd = { known_audio_id: newId }
    else {
      const cur = (await sb.from('listening_pod_sentences').select('takeg_audio_ids').eq('id', w.rowId).single()).data.takeg_audio_ids.slice()
      cur[w.index] = newId
      upd = { takeg_audio_ids: cur, atom_map_fine: (r.atom_map_fine || []).map((a) => (a.kind === 'note' ? a : { ...a, target_start_ms: null, target_end_ms: null })) }
    }
    if (!log.find((l) => l.id === w.rowId)) log.push({ id: w.rowId, old: Object.fromEntries(Object.keys(upd).map((k) => [k, r[k]])) })
    const { error } = await sb.from('listening_pod_sentences').update(upd).eq('id', w.rowId)
    if (error) throw error
  }
  done.rows = log
  fs.writeFileSync(MAP_FILE, JSON.stringify(done, null, 1))
  console.log(`swapped ${work.length} clips on ${log.length} rows; old state in ${MAP_FILE}`)
}
main().catch((e) => { console.error('FATAL', e.message || e); process.exit(1) })
