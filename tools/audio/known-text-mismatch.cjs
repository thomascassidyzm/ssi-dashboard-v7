#!/usr/bin/env node
/**
 * READ-ONLY census (job #542, Kai 2026-10-22): which known-side slots PLAY words other than the ones they SHOW?
 * An empty-slot query cannot find them. Job #530·V re-attached the OLD English clip ("eat") to LEGOs whose
 * known_text became "to eat", so the slot is full and wrong. Here the text each known slot shows (Popty script-view,
 * an existing HTTP route) is compared with course_audio.text of the clip the slot points at (clipMap, a primary-key read).
 *
 *   node tools/audio/known-text-mismatch.cjs --course spa_for_eng [--json out.json] [--max-seed 668]
 *
 * Prints coverage (slots checked / with a clip / without) so a clean result is never a result that judged nothing.
 * Writes nothing and renders nothing; the fix goes through POST /api/audio/render + link-clip (replace + expectCurrent).
 */
const fs = require('fs')
const { connect, clipMap } = require('../../services/shared/agent-db.cjs')
const { normalizeForDb } = require('../../services/shared/text-normalize.cjs')

const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')
// WORDS, not punctuation or case: a question mark or capital is prosody (the voice asks "Could you?"), not a different prompt.
const words = (t) => normalizeForDb(String(t || '')).toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, ' ').replace(/[’‘]/g, "'").split(/\s+/).filter(Boolean).join(' ')
const same = (a, b) => words(a) === words(b)

/** Pure. Flatten a script-view seeds[] into known slots: the LEGO's own debut slot and every phrase slot. */
function slotsOf(seeds) {
  const out = []
  for (const s of seeds || []) for (const l of s.legos || []) for (const p of l.phrases || []) {
    out.push({ kind: p.type === 'lego_debut' ? 'lego' : 'phrase', slot: p.type === 'lego_debut' ? l.lego_id : p.id, lego_id: l.lego_id, known_text: p.known_text, audio_id: p.known_audio_uuid || null })
  }
  return out
}
/** Pure. The slots whose clip says other words than the slot shows. */
function mismatches(slots, clips) {
  return slots.filter((x) => x.audio_id && clips.has(x.audio_id) && !same(x.known_text, clips.get(x.audio_id).text))
    .map((x) => ({ ...x, clip_text: clips.get(x.audio_id).text, clip_voice: clips.get(x.audio_id).voice_id }))
}

async function census(course, maxSeed = 668) {
  const slots = []
  for (let from = 1; from <= maxSeed; from += 50) {
    const res = await fetch(`${POPTY}/api/production/${course}/script-view?seedStart=S${String(from).padStart(4, '0')}&seedEnd=S${String(Math.min(from + 49, maxSeed)).padStart(4, '0')}`)
    if (!res.ok) throw new Error(`script-view ${course} from ${from}: HTTP ${res.status}`)
    slots.push(...slotsOf((await res.json()).seeds))
  }
  const pg = await connect()
  try {
    const clips = await clipMap(pg, slots.map((x) => x.audio_id))
    const bad = mismatches(slots, clips)
    return { course, checked: slots.length, withClip: slots.filter((x) => x.audio_id).length, withoutClip: slots.filter((x) => !x.audio_id).length, danglingClip: slots.filter((x) => x.audio_id && !clips.has(x.audio_id)).length, mismatch: bad.length, rows: bad,
      // voice of every known slot's clip, so a caller can check a fixed slot against the course's cast voice
      voices: slots.filter((x) => clips.has(x.audio_id)).map((x) => [x.slot, clips.get(x.audio_id).voice_id]),
      voiceCounts: slots.reduce((a, x) => { const v = clips.has(x.audio_id) ? clips.get(x.audio_id).voice_id : null; if (v) a[v] = (a[v] || 0) + 1; return a }, {}) }
  } finally { await pg.end() }
}

module.exports = { slotsOf, mismatches, census }

if (require.main === module) {
  const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }
  const course = opt('--course')
  if (!course) { console.error('usage: known-text-mismatch.cjs --course C [--json out.json] [--max-seed N]'); process.exit(1) }
  census(course, Number(opt('--max-seed', 668))).then((r) => {
    if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(r, null, 1))
    console.log(JSON.stringify({ ...r, rows: undefined, voices: undefined }))
    for (const x of r.rows.slice(0, 15)) console.log(`  ${x.slot}: shows "${x.known_text}" plays "${x.clip_text}" (${x.clip_voice})`)
  }, (e) => { console.error(e.message); process.exit(2) })
}
