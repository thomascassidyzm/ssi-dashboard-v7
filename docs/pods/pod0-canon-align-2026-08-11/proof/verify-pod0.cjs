#!/usr/bin/env node
/* Proof pass. For each course: live pod-0 byte-identical to the before-snapshot (or,
   for a draft aligned in place, deliberately changed); aligned pod at canon; every
   audio id the pre-align archive named still present in course_audio. */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs'), path = require('path'), crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const REPO = path.join(__dirname, '..')
const ARCH = path.join(REPO, 'docs/pods/pod0-canon-align-2026-08-11')
const SNAP = path.join(__dirname, 'pod0-snap/before')
const COLS = 'id,pod_id,scene_number,sentence_number,global_order,speaker,known_text,target_text,target_text_draft,target_audio_id,known_audio_id'
const courses = process.argv.slice(2)
const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase()

;(async () => {
  const { data: canonRaw } = await db.from('canonical_pod_scenarios').select('*').eq('pod_slug', 'pod-0').order('global_order')
  const out = []
  for (const c of courses) {
    const r = { course: c }
    const { data: course } = await db.from('courses').select('status').eq('course_code', c).single()
    r.status = course.status
    const live = `${c}:pod-0`
    const aligned = r.status === 'draft' ? live : `${c}:pod-0-unrecorded`
    r.aligned_pod = aligned

    // 1. live pod-0 vs before-snapshot
    const before = JSON.parse(fs.readFileSync(path.join(SNAP, `${c}.json`), 'utf8'))
    const { data: nowLive } = await db.from('listening_pod_sentences').select(COLS).eq('pod_id', live).order('id')
    const h = x => crypto.createHash('sha256').update(JSON.stringify({ sentences: x }, null, 1)).digest('hex')
    r.live_rows_before = before.sentences.length
    r.live_rows_now = nowLive.length
    r.live_unchanged = h(before.sentences) === h(nowLive)

    // 2. aligned pod at canon
    const { data: al } = await db.from('listening_pod_sentences').select(COLS).eq('pod_id', aligned).order('global_order')
    r.aligned_rows_total = al.length
    const inRange = al.filter(x => x.global_order < 90000)
    r.aligned_rows_in_canon_range = inRange.length
    r.aligned_retired_parked = al.length - inRange.length
    // language-name substitution, same rule as the aligner
    const m = /i(?:'m| am) learning ([^.]+)\./i
    const counts = new Map()
    for (const x of al) { const g = m.exec(String(x.known_text || '')); if (g) counts.set(g[1].trim(), (counts.get(g[1].trim()) || 0) + 1) }
    const lang = counts.size ? [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0] : null
    r.language_name = lang
    const canon = canonRaw.map(x => ({ ...x, english_text: lang ? String(x.english_text).replace(/\[target language\]/gi, lang) : x.english_text }))
    r.canon_lines = canon.length
    let engMatch = 0, spkMatch = 0, mismatches = []
    const byOrder = new Map(inRange.map(x => [x.global_order, x]))
    for (const cn of canon) {
      const row = byOrder.get(cn.global_order)
      if (!row) { mismatches.push(`missing go${cn.global_order}`); continue }
      if (norm(row.known_text) === norm(cn.english_text)) engMatch++; else mismatches.push(`go${cn.global_order} english`)
      if (norm(row.speaker) === norm(cn.speaker)) spkMatch++
    }
    r.english_matching_canon = engMatch
    r.speaker_matching_canon = spkMatch
    r.mismatches = mismatches.slice(0, 5)
    r.scenes = new Set(inRange.map(x => x.scene_number)).size
    r.target_lines_present = inRange.filter(x => (x.target_text || '').trim()).length
    r.target_lines_blank = inRange.length - r.target_lines_present
    r.target_audio_pointers = inRange.filter(x => x.target_audio_id).length
    r.known_audio_pointers = inRange.filter(x => x.known_audio_id).length
    const { data: pod } = await db.from('listening_pods').select('metadata').eq('id', aligned).single()
    r.metadata_stamp = (pod.metadata || {}).canonical_aligned_at
    r.metadata_sections = ((pod.metadata || {}).sections || []).length
    r.metadata_scene_hashes = Object.keys((pod.metadata || {}).scene_hashes || {}).length

    // 3. every audio id the pre-align archive named still exists
    const archFile = path.join(ARCH, aligned.endsWith(':pod-0') ? `${c}-pod0-sentences-prealign.json` : `${c}-pod-0-unrecorded-sentences-prealign.json`)
    const arch = JSON.parse(fs.readFileSync(archFile, 'utf8'))
    const ids = [...new Set(arch.sentences.flatMap(x => [x.target_audio_id, x.known_audio_id]).filter(Boolean))]
    let alive = 0
    for (let i = 0; i < ids.length; i += 200) {
      const { data: a, error } = await db.from('course_audio').select('id').in('id', ids.slice(i, i + 200))
      if (error) throw new Error(`course_audio probe: ${error.message}`)
      alive += a.length
    }
    r.audio_rows_referenced_prealign = ids.length
    r.audio_rows_still_present = alive
    r.no_audio_deleted = alive === ids.length
    out.push(r)
  }
  console.log(JSON.stringify(out, null, 1))
})().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
