#!/usr/bin/env node
/**
 * promote-ita-method-pod.cjs — put the Italian Method Pod where a learner can
 * reach it: 309 authored turns out of `canonical_pod_scenarios` and into
 * `listening_pods` + `listening_pod_sentences`, byte-identical.
 *
 * WHICH CUT. `method-pod-chapters`, the 12-chapter cut — Tom's ruling
 * (2026-09-03): "the 12-cut is better, because this allows more assymetry in
 * the conversation, it's more like 12 chapters, each moving a proposition
 * forward, or bringing up a discrete idea". A chapter is a unit of what
 * CHANGED, never a unit of length, so the 14..49-line spread is the design.
 * Nothing here rebalances, resplits, merges or pads. The sibling slug
 * `method-pod-43-scene` is not read.
 *
 * WHY NOT services/pod-dialogue-generator.cjs, which also reads
 * canonical_pod_scenarios and writes listening_pod_sentences: it LLM-*flexes*
 * canonical ENGLISH into a target language. The Italian here is authored by
 * Tom and Aran and ZUT-corrected on 2026-09-03; a generator would replace it
 * with machine translation. This tool COPIES. english_text → known_text,
 * target_text → target_text, and the ordering columns straight across.
 *
 * NO TEXT GATE, ON PURPOSE. The estate rule that unread drafted target text
 * must not be rendered (docs/pods/text-approval-policy-2026-08-16.md) is about
 * the COST OF REDOING a human booth session. Tom's ruling, 2026-09-03: "we
 * don't record Italian, that's TTS always" — a wrong line is corrected in text
 * and re-rendered for pennies, so there is no draft flag, no reviewer and no
 * wait anywhere in this path.
 *
 * INSERT-ONLY. Every row is a new id under a new pod_id. Nothing existing is
 * updated or deleted; the source rows in canonical_pod_scenarios are read and
 * never written. --apply refuses if the pod already has sentence rows.
 *
 *   node tools/pods/promote-ita-method-pod.cjs            # dry run
 *   node tools/pods/promote-ita-method-pod.cjs --apply
 */
'use strict'

const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true })
const { createClient } = require('@supabase/supabase-js')

const SRC_SLUG = 'method-pod-chapters'
const COURSE = 'ita_for_eng'
const SLUG = 'method-pod'
const POD_ID = `${COURSE}:${SLUG}`
const EXPECT_ROWS = 309

const APPLY = process.argv.includes('--apply')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// THE CAST. Two men who talk to each other for 309 turns, so they must sound
// different from each other on BOTH tracks or the pod is unlistenable.
//
// English (known): Cartesia, not xAI — xAI is being wound down and a pod born
// tonight is not born on it (Tom, 2026-09-03, via the Senedd cast). tom_001 is
// Tom's own clone (consent authorised 2026-09-01); aran_english_003 is Aran's.
// VOICE IDS ARE BARE for Cartesia: generateCartesia passes the cast's voice_id
// verbatim to the vendor, which does not know the estate's `cartesia_` prefix.
//
// Italian (target): xAI, because the estate has NO Cartesia Italian voice
// registered — the three Cartesia clones are declared English-only. Enzo is
// the voice ita_for_eng:pod-1 already renders its men on; Matteo is a second
// registered Italian male so the two speakers are distinguishable.
const CAST = {
  Tom: {
    gender: 'm',
    variants: ['Tom', 'TOM'],
    known: { name: 'Tom', provider: 'cartesia', locale: 'en-GB', voice_id: '8fef4d59-0a7e-4ad2-a261-6a3bb50734d2' },
    target: { name: 'Enzo', provider: 'xai', locale: 'it', voice_id: 'x7avnu1k' },
  },
  Aran: {
    gender: 'm',
    variants: ['Aran', 'ARAN'],
    known: { name: 'Aran', provider: 'cartesia', locale: 'en-GB', voice_id: '33890587-a29f-4416-ba61-2615c74f92fe' },
    target: { name: 'Matteo', provider: 'xai', locale: 'it', voice_id: 'bcs7l2c3' },
  },
}

// The canonical rows store TOM/ARAN in transcript caps. The estate's live pods
// store display-cased speaker names and key the cast on them, so the rows are
// written cased and the caps survive as `variants`.
const SPEAKER = { TOM: 'Tom', ARAN: 'Aran' }

const pad = (n, w) => String(n).padStart(w, '0')

async function readSource() {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('canonical_pod_scenarios')
      .select('id, scene_number, scene_label, scene_title, scene_subtitle, sentence_number, global_order, speaker, english_text, target_text, target_lang')
      .eq('pod_slug', SRC_SLUG).order('global_order').range(from, from + 999)
    if (error) throw new Error(`source read failed: ${error.message}`)
    rows.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return rows
}

function checkSource(rows) {
  const problems = []
  if (rows.length !== EXPECT_ROWS) problems.push(`expected ${EXPECT_ROWS} source rows, got ${rows.length}`)
  rows.forEach((r, i) => {
    if (r.global_order !== i + 1) problems.push(`${r.id}: global_order ${r.global_order} breaks the 1..N run at position ${i + 1}`)
    if (!SPEAKER[r.speaker]) problems.push(`${r.id}: unknown speaker ${JSON.stringify(r.speaker)}`)
    if (!(r.target_text || '').trim()) problems.push(`${r.id}: empty target_text`)
    if (!(r.english_text || '').trim()) problems.push(`${r.id}: empty english_text`)
    if (r.target_lang !== 'ita') problems.push(`${r.id}: target_lang ${r.target_lang}`)
  })
  return problems
}

function planRows(rows) {
  return rows.map(r => ({
    id: `${POD_ID}:SC${pad(r.scene_number, 2)}-S${pad(r.sentence_number, 3)}`,
    pod_id: POD_ID,
    scene_number: r.scene_number,
    sentence_number: r.sentence_number,
    global_order: r.global_order,
    speaker: SPEAKER[r.speaker],
    target_text: r.target_text,
    known_text: r.english_text,
    _src: r.id,
  }))
}

function chapterMeta(rows) {
  const byScene = new Map()
  for (const r of rows) {
    if (!byScene.has(r.scene_number)) {
      byScene.set(r.scene_number, { number: r.scene_number, label: r.scene_label, title: r.scene_title, subtitle: r.scene_subtitle, sentence_count: 0 })
    }
    byScene.get(r.scene_number).sentence_count++
  }
  return [...byScene.values()].sort((a, b) => a.number - b.number)
}

async function main() {
  const src = await readSource()
  const problems = checkSource(src)
  if (problems.length) { problems.forEach(p => console.error(`  ! ${p}`)); throw new Error(`${problems.length} source problem(s) — nothing written`) }

  const plan = planRows(src)
  const chapters = chapterMeta(src)
  const ids = new Set(plan.map(p => p.id))
  if (ids.size !== plan.length) throw new Error('planned ids collide')

  console.log(`source ${SRC_SLUG}: ${src.length} rows, ${chapters.length} chapters`)
  console.log(chapters.map(c => `  ${c.label} (${c.sentence_count}) — ${c.title} / ${c.subtitle}`).join('\n'))
  console.log(`speakers: ${JSON.stringify(plan.reduce((a, p) => (a[p.speaker] = (a[p.speaker] || 0) + 1, a), {}))}`)
  console.log(`destination ${POD_ID}: ${plan.length} sentence rows to insert`)

  const { data: existingPod } = await supabase.from('listening_pods').select('id, visibility, required_role').eq('id', POD_ID).maybeSingle()
  const { count: existingRows } = await supabase.from('listening_pod_sentences').select('id', { count: 'exact', head: true }).eq('pod_id', POD_ID)
  console.log(`existing: pod header ${existingPod ? 'present' : 'absent'}, ${existingRows || 0} sentence rows`)

  const log = { pod: POD_ID, source: SRC_SLUG, at: new Date().toISOString(), chapters, rows: plan }
  if (!APPLY) {
    write('dryrun', log)
    console.log('DRY RUN — nothing written.')
    return
  }
  if (existingRows) throw new Error(`${existingRows} sentence rows already exist under ${POD_ID} — this tool only ever creates; refusing`)

  // Header. visibility/required_role are set by the release step, not here:
  // promotion is not release.
  const header = {
    id: POD_ID, course_code: COURSE, pod_type: 'core', slug: SLUG, pod_order: 2,
    title: 'Italian Method Pod — Tom and Aran Talk Bollocks',
    speakers: CAST,
    visibility: 'held',
    metadata: {
      source: `canonical_pod_scenarios:${SRC_SLUG}`,
      format: 'Two-host conversation about the method, in Italian, 12 chapters',
      hosts: [{ name: 'Tom' }, { name: 'Aran' }],
      sections: chapters,
      note: 'Chapters are units of what CHANGED, not units of length (Tom, 2026-09-03). Sizes 14..49 are the design.',
    },
  }
  const { error: hErr } = await supabase.from('listening_pods').upsert(header, { onConflict: 'id' })
  if (hErr) throw new Error(`header write failed: ${hErr.message}`)
  console.log(`header written: ${POD_ID}`)

  for (let i = 0; i < plan.length; i += 100) {
    const batch = plan.slice(i, i + 100).map(({ _src, ...r }) => r)
    const { error } = await supabase.from('listening_pod_sentences').insert(batch)
    if (error) throw new Error(`insert at ${i}: ${error.message}`)
    console.log(`  inserted ${Math.min(i + 100, plan.length)}/${plan.length}`)
  }

  // Reconcile both sides.
  const { count: after } = await supabase.from('listening_pod_sentences').select('id', { count: 'exact', head: true }).eq('pod_id', POD_ID)
  const { count: srcAfter } = await supabase.from('canonical_pod_scenarios').select('id', { count: 'exact', head: true }).eq('pod_slug', SRC_SLUG)
  console.log(`destination now ${after} rows; source still ${srcAfter} rows`)
  if (after !== plan.length) throw new Error(`destination has ${after}, expected ${plan.length}`)
  if (srcAfter !== src.length) throw new Error(`SOURCE CHANGED: ${srcAfter} vs ${src.length}`)

  // Text travelled byte-identical?
  const back = []
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from('listening_pod_sentences')
      .select('id, target_text, known_text, speaker, scene_number, sentence_number, global_order')
      .eq('pod_id', POD_ID).order('global_order').range(from, from + 999)
    back.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  let mismatched = 0
  back.forEach((b, i) => {
    const p = plan[i]
    if (b.id !== p.id || b.target_text !== p.target_text || b.known_text !== p.known_text ||
        b.speaker !== p.speaker || b.global_order !== p.global_order) mismatched++
  })
  console.log(`read-back: ${back.length} rows, ${mismatched} mismatched`)
  if (mismatched) throw new Error('read-back mismatch')

  write('applied', log)
}

function write(kind, log) {
  const out = path.join(__dirname, '..', '..', 'docs', 'ita-method-pod-2026-09-04', `ita-method-pod-promotion-${kind}-log.json`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(log, null, 1))
  console.log(`log: ${out}`)
}

main().then(() => process.exit(0)).catch(e => { console.error(String(e.message || e)); process.exit(1) })
