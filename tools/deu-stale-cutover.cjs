#!/usr/bin/env node
/** READ-ONLY: find the exact seed cutover of the Jan/Feb layer and cost its redo. */
require('dotenv').config({ quiet: true })
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
const COURSE = 'deu_for_eng'
const supabase = createClient((process.env.SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_KEY || '').trim(), { auth: { persistSession: false } })
const HOLDERS = [
  ['course_legos', 'known_audio_id', 'known'], ['course_legos', 'target1_audio_id', 'target1'],
  ['course_legos', 'target2_audio_id', 'target2'], ['course_legos', 'presentation_audio_id', 'presentation'],
  ['course_practice_phrases', 'known_audio_id', 'known'], ['course_practice_phrases', 'target1_audio_id', 'target1'],
  ['course_practice_phrases', 'target2_audio_id', 'target2'], ['course_practice_phrases', 'presentation_audio_id', 'presentation'],
]
async function pageAll (t, sel) {
  const out = []; const P = 1000
  for (let f = 0; ; f += P) {
    const { data, error } = await supabase.from(t).select(sel).eq('course_code', COURSE).range(f, f + P - 1)
    if (error) throw new Error(error.message); out.push(...data); if (data.length < P) break
  } return out
}
;(async () => {
  const legos = await pageAll('course_legos', 'seed_number,known_audio_id,target1_audio_id,target2_audio_id,presentation_audio_id')
  const phrases = await pageAll('course_practice_phrases', 'seed_number,known_audio_id,target1_audio_id,target2_audio_id,presentation_audio_id')
  const by = { course_legos: legos, course_practice_phrases: phrases }
  const slots = []
  for (const [t, c, role] of HOLDERS) for (const r of by[t]) if (r[c]) slots.push({ role, seed: r.seed_number, id: r[c] })
  const ids = [...new Set(slots.map(s => s.id))]
  const audio = new Map()
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.from('course_audio').select('id,created_at,voice_id,text_stripped,text,language').in('id', ids.slice(i, i + 200))
    if (error) throw new Error(error.message); for (const r of data) audio.set(r.id, r)
  }
  const jf = id => String(audio.get(id).created_at).slice(0, 7) < '2026-03'

  // Per-seed Jan/Feb share over the three main roles.
  const perSeed = {}
  for (const s of slots) {
    if (s.role === 'presentation') continue
    perSeed[s.seed] = perSeed[s.seed] || { tot: 0, old: 0 }
    perSeed[s.seed].tot++; if (jf(s.id)) perSeed[s.seed].old++
  }
  const seeds = Object.keys(perSeed).map(Number).sort((a, b) => a - b)
  const pct = s => perSeed[s].old / perSeed[s].tot
  // Last seed that is majority-old, and first seed after it that is majority-new.
  let lastOld = null; for (const s of seeds) if (pct(s) >= 0.5) lastOld = s
  const firstNewAfter = seeds.find(s => s > (seeds.filter(x => pct(x) >= 0.5).slice(-1)[0] || 0))
  const transition = seeds.filter(s => s >= 290 && s <= 320).map(s => ({ seed: s, oldPct: +(100 * pct(s)).toFixed(0), slots: perSeed[s].tot }))

  // Cost the seeds<=CUT layer, per role, deduped by text.
  const CUT = Number(process.env.CUT || 300)
  const cost = {}
  for (const role of ['known', 'target1', 'target2', 'presentation']) {
    const inBand = slots.filter(s => s.role === role && s.seed <= CUT)
    const oldSlots = inBand.filter(s => jf(s.id))
    const clips = new Set(oldSlots.map(s => s.id))
    const texts = new Map()
    for (const id of clips) { const a = audio.get(id); const t = (a.text_stripped ?? a.text ?? '').trim(); if (!texts.has(t.toLowerCase())) texts.set(t.toLowerCase(), t) }
    // Clips in this band that ALSO serve seeds beyond the band (repoint blast radius).
    const beyond = new Set(slots.filter(s => s.role === role && s.seed > CUT && clips.has(s.id)).map(s => s.id))
    cost[role] = {
      bandSlots: inBand.length, staleSlots: oldSlots.length,
      stalePct: inBand.length ? +(100 * oldSlots.length / inBand.length).toFixed(1) : 0,
      distinctClips: clips.size, distinctTexts: texts.size,
      chars: [...texts.values()].reduce((n, t) => n + t.length, 0),
      clipsAlsoServingLaterSeeds: beyond.size,
      extraSlotsTouchedBeyondBand: slots.filter(s => s.role === role && s.seed > CUT && clips.has(s.id)).length,
    }
  }
  // The Jan/Feb residue OUTSIDE the band — is it shared clips or independent old renders?
  const residue = {}
  for (const role of ['known', 'target1', 'target2']) {
    const bandClips = new Set(slots.filter(s => s.role === role && s.seed <= CUT && jf(s.id)).map(s => s.id))
    const out = slots.filter(s => s.role === role && s.seed > CUT && jf(s.id))
    residue[role] = { slots: out.length, sharedWithBand: out.filter(s => bandClips.has(s.id)).length, distinctClips: new Set(out.map(s => s.id)).size }
  }
  const out = { cut: CUT, perSeed, lastMajorityOldSeed: lastOld, firstNewAfter, transitionWindow: transition, bandCost: cost, janFebResidueBeyondBand: residue }
  fs.writeFileSync('/tmp/deu-cutover.json', JSON.stringify(out, null, 2))
  console.log(JSON.stringify(out, null, 2).slice(0, 4000))
})().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
