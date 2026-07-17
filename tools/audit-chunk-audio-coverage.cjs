#!/usr/bin/env node
/**
 * audit-chunk-audio-coverage.cjs — read-only coverage report: canon S-LEGO
 * seam-derived chunks (the '…' marks in `target_text`, founder ruling
 * 2026-07-17 — see PodLab.vue's `atomBoundaries`/`sLegoSpansFromBounds`,
 * which this script mirrors) vs the audio that actually exists to play one.
 *
 * Reports, per pod (course_code:pod_slug), the SAME three-tier resolution
 * PodLab's ladder now falls back through (services/../src/views/admin/
 * PodLab.vue `resolveChunkClips`):
 *   exact  — a Take-G ms-precise slice of the group's whole-sentence take
 *   approx — no slice, but a per-atom target clip (course_audio '[atom] …')
 *            or the group's whole-sentence take/Take-G covers it
 *   none   — nothing playable at any tier (would have been a dead play
 *            control before the fallback fix)
 *
 * Read-only. No writes, no TTS. node tools/audit-chunk-audio-coverage.cjs [courseFilter]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const courseFilter = process.argv[2] || null

const SENTENCE_PUNCT = /[.!?。！？]/
const ELLIPSIS_RE = /…/
const normSurface = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()

// ── mirrors PodLab.vue atomBoundaries/atomGroups/sLegoSpansFromBounds ──────
function atomBoundaries(text, atoms) {
  const lower = (text || '').toLowerCase()
  const bounds = new Array(Math.max(atoms.length - 1, 0)).fill(null)
  let cursor = 0
  for (let i = 0; i < atoms.length; i++) {
    const idx = lower.indexOf(atoms[i].target_surface.toLowerCase(), cursor)
    if (idx !== -1) cursor = idx + atoms[i].target_surface.length
    if (i < atoms.length - 1) {
      const nextIdx = lower.indexOf(atoms[i + 1].target_surface.toLowerCase(), cursor)
      const between = nextIdx !== -1 ? text.slice(cursor, nextIdx) : text.slice(cursor)
      if (SENTENCE_PUNCT.test(between)) bounds[i] = 'sentence'
      else if (ELLIPSIS_RE.test(between)) bounds[i] = 'sLego'
    }
  }
  return bounds
}
function atomGroups(atoms, bounds) {
  const groups = [[]]
  atoms.forEach((a, i) => {
    groups[groups.length - 1].push(a)
    if (bounds[i] === 'sentence') groups.push([])
  })
  return groups.filter((g) => g.length)
}
function sLegoSpans(atoms, bounds, gStart, gEnd) {
  const ranges = []
  let start = gStart
  for (let i = gStart; i <= gEnd; i++) {
    if (i === gEnd || bounds[i] === 'sLego') {
      ranges.push({ start: start - gStart, end: i - gStart })
      start = i + 1
    }
  }
  return ranges
}

// Sub-tags the 'approx' tier by WHICH fallback carried it — 'approx-wholetake'
// is the free re-alignment opportunity (source audio already exists; only the
// ms slice is missing — a cut, not a fresh render); 'approx-atomclip' already
// has per-unit clips and needs nothing further.
function tierFor(us, takeg, wholeAvailable, targetClipMap) {
  const sliced = takeg && us.every((a) => a.target_start_ms != null && a.target_end_ms != null)
  if (sliced) return 'exact'
  const atomClips = us.map((a) => targetClipMap.has(normSurface(a.target_surface)))
  if (atomClips.some(Boolean)) return 'approx-atomclip'
  if (wholeAvailable) return 'approx-wholetake'
  return 'none'
}
const tierBucket = (t) => (t === 'exact' ? 'exact' : t === 'none' ? 'none' : 'approx')

async function loadTargetClipMap(courseCode) {
  const map = new Set()
  const { data } = await supabase
    .from('course_audio')
    .select('text')
    .eq('course_code', courseCode)
    .eq('role', 'pod_explainer')
    .like('text', '[atom] %')
  for (const row of data || []) map.add(normSurface(row.text.slice('[atom] '.length)))
  return map
}

async function auditPod(pod) {
  const { data: rows, error } = await supabase
    .from('listening_pod_sentences')
    .select('id, global_order, target_text, atom_map_fine, atom_map, takeg_audio_ids, target_audio_id, sentence_audio_ids')
    .eq('pod_id', pod.id)
    .order('global_order', { ascending: true })
  if (error) throw error

  const targetClipMap = await loadTargetClipMap(pod.course_code)

  const counts = { exact: 0, approx: 0, none: 0 }
  const missing = [] // tier 'none' — genuine gaps, no source audio anywhere: TTS/recording candidates
  const cutCandidates = [] // tier 'approx-wholetake' — source audio exists, just needs a re-aligned slice: free
  let sentencesWithNoMap = 0
  let sentencesWithSeams = 0

  for (const s of rows || []) {
    const map = Array.isArray(s.atom_map_fine) && s.atom_map_fine.length ? s.atom_map_fine : s.atom_map
    const hasSeam = ELLIPSIS_RE.test(s.target_text || '')
    if (hasSeam) sentencesWithSeams++
    if (!Array.isArray(map) || !map.length) {
      sentencesWithNoMap++
      // No chunk map at all: the only playable unit is the whole turn.
      const tier = s.target_audio_id ? 'approx-wholetake' : 'none'
      counts[tierBucket(tier)]++
      if (tier === 'none') missing.push({ id: s.id, order: s.global_order, text: s.target_text, reason: 'no atom_map, no whole-turn audio' })
      continue
    }
    const atoms = map.filter((e) => e.kind === 'atom' || e.kind === 'passthrough')
    const bounds = atomBoundaries(s.target_text, atoms)
    const groups = atomGroups(atoms, bounds)
    const takegIds = Array.isArray(s.takeg_audio_ids) ? s.takeg_audio_ids : []
    const sentTakes = Array.isArray(s.sentence_audio_ids) ? s.sentence_audio_ids : []
    let offset = 0
    groups.forEach((g, gi) => {
      const spans = sLegoSpans(atoms, bounds, offset, offset + g.length - 1)
      const takeg = takegIds[gi]
      const wholeAvailable = !!(takeg || sentTakes[gi] || (groups.length === 1 && s.target_audio_id))
      spans.forEach((span) => {
        const us = g.slice(span.start, span.end + 1)
        const tier = tierFor(us, takeg, wholeAvailable, targetClipMap)
        counts[tierBucket(tier)]++
        const text = us.map((a) => a.target_surface).join(' ')
        if (tier === 'none') {
          missing.push({ id: s.id, order: s.global_order, text, reason: 'no slice, no atom clip, no whole-sentence/turn take' })
        } else if (tier === 'approx-wholetake') {
          cutCandidates.push({ id: s.id, order: s.global_order, text, sourceId: takeg || sentTakes[gi] || s.target_audio_id })
        }
      })
      offset += g.length
    })
  }

  const total = counts.exact + counts.approx + counts.none
  return { pod: pod.id, courseCode: pod.course_code, total, counts, missing, cutCandidates, sentencesWithSeams, sentencesWithNoMap, sentenceCount: (rows || []).length }
}

async function main() {
  let podQuery = supabase.from('listening_pods').select('id, course_code, slug').order('course_code').order('slug')
  if (courseFilter) podQuery = podQuery.ilike('course_code', `%${courseFilter}%`)
  const { data: pods, error } = await podQuery
  if (error) throw error

  const results = []
  for (const pod of pods || []) {
    process.stderr.write(`auditing ${pod.id}…\n`)
    results.push(await auditPod(pod))
  }

  const lines = []
  lines.push('# Chunk audio coverage audit')
  lines.push('')
  lines.push(`*Generated by \`tools/audit-chunk-audio-coverage.cjs\`. Read-only — no writes, no TTS. ${results.length} pods audited.*`)
  lines.push('')
  lines.push('Three tiers, matching PodLab\'s ladder fallback (`resolveChunkClips`):')
  lines.push('- **exact** — Take-G ms-precise slice at this exact seam span')
  lines.push('- **approx** — no slice; falls back to a per-atom clip or the whole-sentence/turn take (audible, just coarser)')
  lines.push('- **none** — nothing playable at any tier (would have been a dead play control before the fallback fix)')
  lines.push('')
  lines.push('| pod | chunks | exact | approx | none | sentences w/ seams | sentences w/ no map |')
  lines.push('|---|---|---|---|---|---|---|')
  for (const r of results) {
    lines.push(`| ${r.pod} | ${r.total} | ${r.counts.exact} | ${r.counts.approx} | ${r.counts.none} | ${r.sentencesWithSeams}/${r.sentenceCount} | ${r.sentencesWithNoMap}/${r.sentenceCount} |`)
  }

  const totalAll = results.reduce((a, r) => a + r.total, 0)
  const exactAll = results.reduce((a, r) => a + r.counts.exact, 0)
  const approxAll = results.reduce((a, r) => a + r.counts.approx, 0)
  const noneAll = results.reduce((a, r) => a + r.counts.none, 0)
  lines.push(`| **TOTAL** | **${totalAll}** | **${exactAll}** | **${approxAll}** | **${noneAll}** | | |`)
  lines.push('')

  const withGaps = results.filter((r) => r.counts.none > 0)
  if (withGaps.length) {
    lines.push('## Missing list (tier: none) — the actual regen/TTS candidates')
    lines.push('')
    for (const r of withGaps) {
      lines.push(`### ${r.pod} (${r.missing.length} gaps)`)
      lines.push('')
      for (const m of r.missing.slice(0, 200)) {
        lines.push(`- \`${m.id}\` (order ${m.order}): "${m.text}" — ${m.reason}`)
      }
      if (r.missing.length > 200) lines.push(`- … and ${r.missing.length - 200} more (see JSON)`)
      lines.push('')
    }
  } else {
    lines.push('No tier-none gaps found in the audited scope.')
  }

  const cutAll = results.reduce((a, r) => a + r.cutCandidates.length, 0)
  lines.push('')
  lines.push(`## Free upgrade opportunity (tier: approx-wholetake, ${cutAll} chunks)`)
  lines.push('')
  lines.push('Source audio already exists for these chunks (a whole-sentence or Take-G take) —')
  lines.push('they already PLAY (via the whole-take fallback), just not at exact seam precision.')
  lines.push('Re-running forced alignment against the existing take (no fresh TTS, no cost) would')
  lines.push('upgrade these from approx → exact. See `tools/course-optimization/*-STAGED.json` for the')
  lines.push('regen queue, which lists these separately from the paid TTS/recording candidates.')
  lines.push('')

  const outDir = path.join(__dirname, '..', 'docs', 'pods')
  fs.mkdirSync(outDir, { recursive: true })
  const stamp = 'chunk-audio-coverage-2026-07-17'
  fs.writeFileSync(path.join(outDir, `${stamp}.md`), lines.join('\n') + '\n')
  fs.writeFileSync(path.join(outDir, `${stamp}.json`), JSON.stringify(results, null, 2))
  console.log(`Wrote docs/pods/${stamp}.md + .json (${results.length} pods, ${noneAll} tier-none gaps)`)
}

main().catch((e) => { console.error(e); process.exit(1) })
