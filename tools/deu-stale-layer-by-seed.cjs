#!/usr/bin/env node
/**
 * deu-stale-layer-by-seed.cjs — READ-ONLY second cut of the census: is the old
 * generation a contiguous SEED BAND (scopable redo) or scattered course-wide
 * (whole-course redo)? Writes nothing.
 */
require('dotenv').config({ quiet: true })
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

const COURSE = process.argv[2] || 'deu_for_eng'
const OUT = process.argv[3] || null
const supabase = createClient(
  (process.env.SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_KEY || '').trim(),
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const HOLDERS = [
  { table: 'course_legos', column: 'known_audio_id', role: 'known' },
  { table: 'course_legos', column: 'target1_audio_id', role: 'target1' },
  { table: 'course_legos', column: 'target2_audio_id', role: 'target2' },
  { table: 'course_legos', column: 'presentation_audio_id', role: 'presentation' },
  { table: 'course_practice_phrases', column: 'known_audio_id', role: 'known' },
  { table: 'course_practice_phrases', column: 'target1_audio_id', role: 'target1' },
  { table: 'course_practice_phrases', column: 'target2_audio_id', role: 'target2' },
  { table: 'course_practice_phrases', column: 'presentation_audio_id', role: 'presentation' },
]

async function pageAll (table, select) {
  const out = []; const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(select)
      .eq('course_code', COURSE).range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...data)
    if (data.length < PAGE) break
  }
  return out
}

async function main () {
  const legos = await pageAll('course_legos', 'seed_number,known_audio_id,target1_audio_id,target2_audio_id,presentation_audio_id')
  const phrases = await pageAll('course_practice_phrases', 'seed_number,known_audio_id,target1_audio_id,target2_audio_id,presentation_audio_id')
  const rowsByTable = { course_legos: legos, course_practice_phrases: phrases }

  const slots = []
  for (const h of HOLDERS) {
    for (const row of rowsByTable[h.table]) {
      if (row[h.column]) slots.push({ role: h.role, seed: row.seed_number, audioId: row[h.column] })
    }
  }
  const ids = [...new Set(slots.map(s => s.audioId))]
  const audio = new Map()
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.from('course_audio')
      .select('id,created_at,voice_id,text_stripped,text').in('id', ids.slice(i, i + 200))
    if (error) throw new Error(error.message)
    for (const r of data) audio.set(r.id, r)
  }

  const month = id => String(audio.get(id).created_at).slice(0, 7)
  const BAND = 50
  const bands = {}
  const maxSeed = Math.max(...slots.map(s => s.seed || 0))
  for (const s of slots) {
    const b = `${Math.floor((s.seed - 1) / BAND) * BAND + 1}-${Math.floor((s.seed - 1) / BAND) * BAND + BAND}`
    bands[b] = bands[b] || {}
    bands[b][s.role] = bands[b][s.role] || {}
    const m = month(s.audioId)
    bands[b][s.role][m] = (bands[b][s.role][m] || 0) + 1
  }

  // Pre-July vs July+ per role, and the "oldest layer" seed footprint.
  const eras = {}
  for (const s of slots) {
    const m = month(s.audioId)
    const era = m < '2026-03' ? 'janfeb' : m < '2026-07' ? 'marjun' : m < '2026-08' ? 'jul' : 'aug'
    eras[s.role] = eras[s.role] || {}
    eras[s.role][era] = (eras[s.role][era] || 0) + 1
  }

  // Seed span of the Jan/Feb layer per role.
  const janfebSeeds = {}
  for (const s of slots) {
    if (month(s.audioId) >= '2026-03') continue
    janfebSeeds[s.role] = janfebSeeds[s.role] || new Set()
    janfebSeeds[s.role].add(s.seed)
  }
  const spans = {}
  for (const [role, set] of Object.entries(janfebSeeds)) {
    const arr = [...set].sort((a, b) => a - b)
    spans[role] = { seeds: arr.length, min: arr[0], max: arr[arr.length - 1] }
  }

  // Cost of a "everything before July" redo, per role: distinct texts + chars.
  const preJulyCost = {}
  for (const role of ['known', 'target1', 'target2', 'presentation']) {
    const clip = new Set(slots.filter(s => s.role === role && month(s.audioId) < '2026-07').map(s => s.audioId))
    const texts = new Map()
    for (const id of clip) {
      const a = audio.get(id)
      const t = (a.text_stripped ?? a.text ?? '').trim()
      if (!texts.has(t.toLowerCase())) texts.set(t.toLowerCase(), t)
    }
    preJulyCost[role] = {
      slots: slots.filter(s => s.role === role && month(s.audioId) < '2026-07').length,
      distinctClips: clip.size,
      distinctTexts: texts.size,
      chars: [...texts.values()].reduce((n, t) => n + t.length, 0),
    }
  }

  const out = { course: COURSE, maxSeed, bandSize: BAND, eras, janFebSeedSpan: spans, preJulyRedoCost: preJulyCost, bands }
  const json = JSON.stringify(out, null, 2)
  if (OUT) fs.writeFileSync(OUT, json); else console.log(json)
  console.error('done')
}
main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
