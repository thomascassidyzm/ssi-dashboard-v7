#!/usr/bin/env node
/**
 * Known-side audio collision detector (read-only).
 *
 * Answers: does one course_audio row serve the known (prompt) side of MORE THAN ONE
 * content row, and if so do those rows carry GENUINELY IDENTICAL known_text?
 *
 *   identical known_text  -> deduplication working as designed (noise class)
 *   different known_text  -> a LINKING DEFECT: two different prompts, one clip
 *
 * Scans known_audio_id on course_practice_phrases, course_legos and course_seeds.
 * Also reports cross-course links (audio owned by course A linked from course B) —
 * the mechanism swept in docs/audio/xcourse-audio-mislinks-swept-2026-08-06.md.
 *
 * Usage: node tools/audio/detect-known-audio-collisions.cjs [course_code] [--json out.json]
 * No arguments = estate-wide.
 */
const fs = require('fs')
const path = require('path')

function loadEnv(p) {
  if (!fs.existsSync(p)) return
  for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
}
loadEnv(path.join(__dirname, '../../.env'))
loadEnv(path.join(__dirname, '../../.env.local'))
const BASE = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

// Whole-field normalisation only. Never a regex word boundary: JS \w zeroes
// non-Latin text, which would silently blank every non-Latin known side.
// Bookend punctuation is stripped to match the API's own intake normalisation,
// so a seed row and its lego row differing only by a trailing "?" are not a defect.
const norm = s => (s || '').normalize('NFC').trim().toLowerCase()
  .replace(/\s+/g, ' ').replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '').trim()

async function pageAll(table, qs, cap = 400000) {
  const out = []
  for (let from = 0; from < cap; from += 1000) {
    const r = await fetch(`${BASE}/rest/v1/${table}?${qs}`, { headers: { ...H, Range: `${from}-${from + 999}` } })
    if (!r.ok) { console.error('ERR', table, r.status, await r.text()); break }
    const rows = await r.json()
    out.push(...rows)
    if (rows.length < 1000) break
  }
  return out
}

// Offset paging over course_practice_phrases times out server-side (no index on
// known_audio_id, and OFFSET re-scans). Keyset-page on the primary key instead —
// same pattern as services/insight-discovery.cjs.
async function keysetAll(table, sel, filter, keyCol = 'id', cap = 3000000) {
  const out = []
  let cursor = ''
  for (let n = 0; n < cap; n += 1000) {
    const after = cursor ? `&${keyCol}=gt.${encodeURIComponent(cursor)}` : ''
    const r = await fetch(`${BASE}/rest/v1/${table}?select=${sel}${filter}${after}&order=${keyCol}.asc&limit=1000`, { headers: H })
    if (!r.ok) { console.error('ERR', table, r.status, (await r.text()).slice(0, 200)); break }
    const rows = await r.json()
    if (!rows.length) break
    out.push(...rows)
    cursor = rows[rows.length - 1][keyCol]
    if (rows.length < 1000) break
  }
  return out
}

const argv = process.argv.slice(2)
const jsonIdx = argv.indexOf('--json')
const JSONOUT = jsonIdx >= 0 ? argv[jsonIdx + 1] : null
const COURSE = argv.find((a, i) => !a.startsWith('--') && i !== jsonIdx + 1)
const scope = COURSE ? `&course_code=eq.${COURSE}` : ''

;(async () => {
  const sources = [
    ['phrase', 'course_practice_phrases', 'id,course_code,seed_number,lego_index,phrase_role,known_text,known_audio_id'],
    ['lego',   'course_legos',            'lego_id,course_code,seed_number,lego_index,known_text,known_audio_id'],
    ['seed',   'course_seeds',            'seed_id,course_code,seed_number,known_text,known_audio_id'],
  ]
  const rows = []
  for (const [kind, table, sel] of sources) {
    const keyCol = kind === 'phrase' ? 'id' : kind === 'lego' ? 'lego_id' : 'seed_id'
    const got = await keysetAll(table, sel, `&known_audio_id=not.is.null${scope}`, keyCol)
    for (const r of got) rows.push({
      kind, table,
      ref: r.id || r.lego_id || r.seed_id,
      course_code: r.course_code,
      seed_number: r.seed_number, lego_index: r.lego_index,
      phrase_role: r.phrase_role || kind,
      known_text: r.known_text,
      audio_id: r.known_audio_id,
    })
    console.error(`  read ${table}: ${got.length} rows with known_audio_id`)
  }

  const audioIds = [...new Set(rows.map(r => r.audio_id))]
  const audio = new Map()
  for (let i = 0; i < audioIds.length; i += 200) {
    const chunk = audioIds.slice(i, i + 200)
    const got = await pageAll('course_audio', `select=id,course_code,text,role,voice_id,audio_revision&id=in.(${chunk.join(',')})`)
    for (const a of got) audio.set(a.id, a)
  }
  console.error(`  resolved ${audio.size}/${audioIds.length} audio rows`)

  const byAudio = new Map()
  for (const r of rows) {
    if (!byAudio.has(r.audio_id)) byAudio.set(r.audio_id, [])
    byAudio.get(r.audio_id).push(r)
  }

  const shared = [], defects = [], xcourse = []
  for (const [id, refs] of byAudio) {
    const a = audio.get(id)
    if (a && a.course_code) {
      const foreign = refs.filter(r => r.course_code !== a.course_code)
      if (foreign.length) xcourse.push({ audio_id: id, owner: a.course_code, text: a.text, linked_from: [...new Set(foreign.map(r => r.course_code))], refs: foreign.length })
    }
    if (refs.length < 2) continue
    const texts = [...new Set(refs.map(r => norm(r.known_text)))]
    const rec = {
      audio_id: id,
      audio_course: a && a.course_code, audio_text: a && a.text, audio_revision: a && a.audio_revision,
      pointing_rows: refs.length, distinct_known_text: texts.length, texts,
      refs: refs.map(r => ({ course: r.course_code, ref: r.ref, role: r.phrase_role, seed: r.seed_number, lego: r.lego_index, known_text: r.known_text })),
    }
    if (texts.length > 1) defects.push(rec); else shared.push(rec)
  }

  const out = {
    generated_for: COURSE || 'ESTATE-WIDE',
    rows_scanned: rows.length,
    distinct_known_audio_ids: byAudio.size,
    noise_legit_dedup_identical_known_text: shared.length,
    defect_one_clip_multiple_known_texts: defects.length,
    cross_course_known_links: xcourse.length,
    defects: defects.sort((a, b) => b.pointing_rows - a.pointing_rows),
    cross_course: xcourse,
    shared_sample: shared.slice(0, 25),
  }
  console.log(`\n=== known-side audio collision detector — ${out.generated_for} ===`)
  console.log(`rows with known_audio_id            : ${out.rows_scanned}`)
  console.log(`distinct known_audio_id values      : ${out.distinct_known_audio_ids}`)
  console.log(`NOISE  identical known_text (dedup) : ${out.noise_legit_dedup_identical_known_text}`)
  console.log(`DEFECT one clip, >1 known_text      : ${out.defect_one_clip_multiple_known_texts}`)
  console.log(`cross-course known links            : ${out.cross_course_known_links}`)
  for (const d of defects.slice(0, 40)) {
    console.log(`\n  ${d.audio_id}  owner=${d.audio_course}  "${d.audio_text}"`)
    for (const r of d.refs) console.log(`     ${r.course} ${r.ref} ${r.role} S${r.seed}L${r.lego} :: ${JSON.stringify(r.known_text)}`)
  }
  if (JSONOUT) { fs.writeFileSync(JSONOUT, JSON.stringify(out, null, 1)); console.log(`\nwrote ${JSONOUT}`) }
})()
