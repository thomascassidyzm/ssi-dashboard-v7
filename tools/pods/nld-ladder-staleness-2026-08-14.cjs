#!/usr/bin/env node
/**
 * nld-ladder-staleness-2026-08-14.cjs — inventory the derivative audio the
 * V-register render leaves behind. READ-ONLY: renders nothing, writes nothing.
 *
 * WHY THIS EXISTS. The approved job re-rendered the 29 pod TURN clips and moved
 * their text with them. But each of those rows also carries a breakdown ladder
 * the turn take is only the top rung of:
 *
 *   sentence_audio_ids  per-sentence natural takes
 *   takeg_audio_ids     the Take G rungs
 *   atom_map_fine       the tiling the ladder is walked over (text, not audio)
 *
 * Those were rendered from the OLD wording and none of them moved. So the turn
 * now says `alstublieft` while a rung underneath it still says `alsjeblieft` —
 * a desync at a lower layer than the one the brief was written about, and one
 * the render CREATES rather than inherits. It is outside the 29-clip approval,
 * so it is measured here and reported, not silently fixed: TTS costs money and
 * re-tiling an atom map is content work, not a render.
 *
 * THE STALENESS TEST. A ladder clip is stale when its text is not a contiguous
 * substring of its row's current target_text (normalised for case and
 * whitespace). Substring, not word-multiset — the same rule the ZUT component
 * membership check settled on, and for the same reason: it does not
 * false-positive on elision or fused forms. A rung that still tiles the turn is
 * fine no matter which pass rendered it; a rung that no longer appears in the
 * turn at all is the defect.
 *
 *   node tools/pods/nld-ladder-staleness-2026-08-14.cjs
 */

require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const COURSE = 'nld_for_eng'
const OUT = path.join(__dirname, '../..', 'docs/a108/nld-ladder-staleness.json')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim()

;(async () => {
  const log = JSON.parse(fs.readFileSync(path.join(__dirname, '../..', 'docs/a108/nld-vregister-render-applied-log.json'), 'utf8'))
  const rowIds = log.plan.flatMap(p => p.rows)

  const { data: rows, error } = await supabase
    .from('listening_pod_sentences')
    .select('id, speaker, target_text, sentence_audio_ids, takeg_audio_ids, atom_map_fine, atom_map')
    .in('id', rowIds).order('id')
  if (error) { console.error(error.message); process.exit(1) }

  const allClipIds = [...new Set(rows.flatMap(r =>
    [...(r.sentence_audio_ids || []), ...(r.takeg_audio_ids || [])].filter(Boolean)))]
  const clips = {}
  for (let i = 0; i < allClipIds.length; i += 200) {
    const { data } = await supabase.from('course_audio')
      .select('id, text, voice_id, origin, duration_ms').in('id', allClipIds.slice(i, i + 200))
    for (const c of data || []) clips[c.id] = c
  }

  const stale = { sentence: new Map(), takeg: new Map() }
  const missing = []
  const atomRows = []
  for (const r of rows) {
    const hay = norm(r.target_text)
    for (const [kind, ids] of [['sentence', r.sentence_audio_ids], ['takeg', r.takeg_audio_ids]]) {
      for (const id of (ids || []).filter(Boolean)) {
        const c = clips[id]
        if (!c) { missing.push({ row: r.id, kind, clip: id }); continue }
        // Take G rungs carry the pause cue; strip it before testing membership
        const probe = norm(c.text).replace(/\s*…\s*/g, ' ')
        if (hay.includes(probe)) continue
        if (!stale[kind].has(id)) stale[kind].set(id, { clip: id, text: c.text, voice_id: c.voice_id, origin: c.origin, chars: c.text.length, rows: [] })
        stale[kind].get(id).rows.push(r.id)
      }
    }
    const badAtoms = [...(r.atom_map_fine || []), ...(r.atom_map || [])]
      .filter(a => a && a.target_surface && a.kind !== 'note' && !hay.includes(norm(a.target_surface)))
      .map(a => a.target_surface)
    if (badAtoms.length) atomRows.push({ row: r.id, speaker: r.speaker, target_text: r.target_text, surfaces: [...new Set(badAtoms)] })
  }

  const sentence = [...stale.sentence.values()], takeg = [...stale.takeg.values()]
  const chars = [...sentence, ...takeg].reduce((n, c) => n + c.chars, 0)
  const report = {
    job: 'A-108 nld_for_eng — derivative ladder left stale by the V-register render',
    date: '2026-08-14',
    scope_note: 'NOT part of the approved 29-clip render. Measured, not fixed.',
    rows_examined: rows.length,
    stale_sentence_clips: sentence.length,
    stale_takeg_clips: takeg.length,
    stale_clips_total: sentence.length + takeg.length,
    stale_chars: chars,
    render_cost_usd_at_xai: Number(((chars / 1e6) * 15).toFixed(4)),
    rows_with_stale_atom_tiling: atomRows.length,
    ladder_clips_not_in_course_audio: missing,
    non_tts_stale_clips: [...sentence, ...takeg].filter(c => c.origin !== 'tts'),
    sentence, takeg, atom_retiling: atomRows,
  }
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n')
  console.log(`${rows.length} rows examined`)
  console.log(`stale ladder clips: ${sentence.length} sentence + ${takeg.length} takeG = ${report.stale_clips_total} (${chars} chars, $${report.render_cost_usd_at_xai})`)
  console.log(`rows whose atom tiling no longer walks the turn text: ${atomRows.length}`)
  console.log(`ladder ids with no course_audio row: ${missing.length}`)
  console.log(`non-tts among the stale: ${report.non_tts_stale_clips.length}`)
  console.log(`log: ${OUT}`)
})().catch(e => { console.error('ERR:', e.stack || e.message); process.exit(1) })
