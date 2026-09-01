#!/usr/bin/env node
/**
 * seed-canonical-pods.cjs — populate canonical_pod_scenarios from the English
 * master markdown (~/Desktop/english-pods.md). One-off seeding of the
 * dashboard-editable canonical store; after this, Aran edits the scenarios in
 * the dashboard and the generator flexes them per lang-pair.
 *
 * Parses the master's scenes (## headings) + dialogue tables into rows.
 *
 * Usage:
 *   node tools/seed-canonical-pods.cjs                 # dry run (default) — prints what it would insert
 *   node tools/seed-canonical-pods.cjs --execute       # upsert into canonical_pod_scenarios
 *   node tools/seed-canonical-pods.cjs --file=PATH --slug=pod-1 --execute
 */

require('dotenv').config()
const fs = require('fs')

const arg = (n, d) => { const h = process.argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d }
const EXECUTE = process.argv.includes('--execute')
const FILE = arg('file', `${process.env.HOME}/Desktop/english-pods.md`)
const POD_SLUG = arg('slug', 'pod-1')

const pad = (n) => String(n).padStart(2, '0')

/** Parse the master markdown into canonical scenario rows. */
function parse(md) {
  const lines = md.split('\n')
  const rows = []
  let scene = null, sceneNum = 0, sentNum = 0, globalOrder = 0
  let inTable = false

  const parseHeading = (h) => {
    // "Pod 0 · A Day of Greetings — *Morning to night*"  |  "1. Coffee Shop — *A flat white*"
    let label = null, title = h, subtitle = null
    const dot = h.split(' · ')
    if (dot.length >= 2) { label = dot[0].trim(); title = dot.slice(1).join(' · ').trim() }
    const dash = title.split(' — ')
    if (dash.length >= 2) { title = dash[0].trim(); subtitle = dash.slice(1).join(' — ').replace(/\*/g, '').trim() }
    // leading "1." style label when no '·'
    if (!label) { const m = title.match(/^(\d+)\.\s+(.*)$/); if (m) { label = m[1]; title = m[2].trim() } }
    return { label, title, subtitle }
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith('## ')) {
      const { label, title, subtitle } = parseHeading(line.slice(3).trim())
      sceneNum += 1; sentNum = 0; inTable = false
      scene = { number: sceneNum, label, title, subtitle, difficulty: null }
      continue
    }
    // difficulty / count line under a heading: *Difficulty: beginner · 12 sentences*
    if (scene && /^\*.*difficulty/i.test(line)) {
      const m = line.match(/difficulty:\s*([a-z]+)/i); if (m) scene.difficulty = m[1].toLowerCase()
      continue
    }
    if (line.startsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim())
      // header row or separator → mark table start, skip
      if (/^#$/.test(cells[0]) || /^-+$/.test(cells[0])) { inTable = true; continue }
      if (!inTable) continue
      // Numbered data row, or a menu-line scenario-variant row (`3a`/`3b`/…):
      // rows sharing the digit part form one turn-group (founder ruling
      // 2026-07-16, docs/pods/pod05-placement-analysis-2026-07-16.md §Menu-lines).
      const numMatch = cells[0].match(/^(\d+)([a-z])?$/)
      if (!numMatch) continue
      const speaker = cells[1] || null
      const english = cells[2] || ''
      // Optional 4th column: per-line author_notes. Without it a re-seed would
      // silently drop the notes the dashboard/generator rely on (the drill-tail
      // "vocab coda" rows carry one), so the markdown stays lossless.
      const notes = cells[3] || null
      if (!english) continue
      // Skip the trailing summary table (scene → count): a real dialogue line
      // is never a bare number, and its "speaker" cell is a scene title.
      if (/^\d+$/.test(english.trim())) continue
      sentNum = Number(numMatch[1]); const variantKey = numMatch[2] || null
      globalOrder += 1
      rows.push({
        id: `${POD_SLUG}:SC${pad(scene.number)}-S${pad(sentNum)}${variantKey || ''}`,
        pod_slug: POD_SLUG,
        scene_number: scene.number,
        scene_label: scene.label,
        scene_title: scene.title,
        scene_subtitle: scene.subtitle,
        difficulty: scene.difficulty,
        sentence_number: sentNum,
        variant_key: variantKey,
        global_order: globalOrder,
        speaker,
        english_text: english,
        author_notes: notes,
      })
    }
  }
  return rows
}

async function upsert(rows) {
  const URL = (process.env.SUPABASE_URL || '').trim(), KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim()
  const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }
  // Clean re-seed: drop the slug's existing rows first so a corrected parse
  // (fewer rows) never leaves orphans behind.
  const del = await fetch(`${URL}/rest/v1/canonical_pod_scenarios?pod_slug=eq.${encodeURIComponent(POD_SLUG)}`, { method: 'DELETE', headers: H })
  if (!del.ok && del.status !== 404) throw new Error(`clean delete HTTP ${del.status}: ${(await del.text()).slice(0, 200)}`)
  let done = 0
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200)
    const r = await fetch(`${URL}/rest/v1/canonical_pod_scenarios`, { method: 'POST', headers: H, body: JSON.stringify(batch) })
    if (!r.ok) throw new Error(`upsert HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`)
    done += batch.length
  }
  return done
}

;(async () => {
  if (!fs.existsSync(FILE)) { console.error(`file not found: ${FILE}`); process.exit(1) }
  const rows = parse(fs.readFileSync(FILE, 'utf8'))
  const scenes = [...new Set(rows.map(r => r.scene_number))]
  console.log(`parsed ${rows.length} sentences across ${scenes.length} scenes from ${FILE} (slug=${POD_SLUG})`)
  // scene summary
  const byScene = {}
  for (const r of rows) { (byScene[r.scene_number] ||= { label: r.scene_label, title: r.scene_title, n: 0 }).n++ }
  for (const [n, s] of Object.entries(byScene)) console.log(`  scene ${n}: [${s.label}] ${s.title} — ${s.n} sentences`)
  console.log('\nfirst 4 rows:')
  for (const r of rows.slice(0, 4)) console.log(`  ${r.id}  ${(r.speaker || '').padEnd(18)} ${JSON.stringify(r.english_text)}`)

  if (!EXECUTE) { console.log('\n[dry run] re-run with --execute to upsert into canonical_pod_scenarios'); return }
  const n = await upsert(rows)
  console.log(`\n✓ upserted ${n} canonical scenarios into canonical_pod_scenarios`)
})().catch(e => { console.error(e); process.exit(1) })
