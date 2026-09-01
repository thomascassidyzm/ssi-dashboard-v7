#!/usr/bin/env node
/**
 * sync-walk-steps — put a corpus's DECLARED walk into the store, and nothing else.
 *
 * WHY THIS EXISTS. `ingest-canonical-pods.cjs` is a one-way, one-time import of a
 * whole walk: dialogue rows AND walk steps together. Once a slug has live dialogue
 * it refuses to run again, and the only way past that refusal is
 * `--reimport-destructive`, which deletes the dialogue. That is the correct shape
 * for an import and the wrong shape for the job here: health's 438 dialogue rows
 * are live and being edited in the Script Lab, while its scenes have only just been
 * given their `*Walks:*` declarations. Rewriting the dialogue to publish a coverage
 * number would be a catastrophic trade.
 *
 * So this tool writes ONE TABLE: `canonical_pod_walk_steps`, for one slug, replaced
 * wholesale from the corpus's current declarations. **`canonical_pod_scenarios` is
 * never written, and is read only to check that each step's `scenario_id` points at
 * a row that actually exists** — a step whose anchor row is missing is stored with a
 * null anchor rather than failing the foreign key, because a walk step's claim is
 * about a SCENE, and the anchor is a convenience.
 *
 * The steps come from the same parsers the import uses, via the same registry, so
 * there is one definition of what a corpus declares and this tool cannot drift from
 * it.
 *
 *   node tools/pods/sync-walk-steps.cjs --pod=health            # dry run
 *   node tools/pods/sync-walk-steps.cjs --pod=health --execute
 *   node tools/pods/sync-walk-steps.cjs --pod=all --execute
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { parsePod } = require('./parse-pod-markdown.cjs')
const { parseSectorWalk } = require('./parse-sector-walk.cjs')
const { parseHealthOverlay } = require('./parse-health-overlay.cjs')
const { evidencePath } = require('../lib/evidence-path.cjs')

const PARSERS = {
  'pod-table': (md, e, store) => parsePod(md, { slug: e.slug, unit: e.unit || 'Chapter', targetLang: e.targetLang || null, store }),
  'sector-flows': (md, e, store) => parseSectorWalk(md, { slug: e.slug, store }),
  'pair-overlay': (md, e) => parseHealthOverlay(md, { slug: e.slug, targetLang: e.targetLang || null })
}

const REPO = path.resolve(__dirname, '../..')
const arg = (n, d) => { const h = process.argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d }
const EXECUTE = process.argv.includes('--execute')

function loadStore () {
  const p = f => JSON.parse(fs.readFileSync(path.join(REPO, 'services/shared/metagraph', f), 'utf8'))
  const nodes = p('nodes.json'), moves = p('moves.json'), outcomes = p('outcome-shapes.json')
  return {
    nodeIds: new Set([...(nodes.nodes || []), ...(nodes.bound_pairs || [])].map(n => n.id)),
    moveIds: new Set((moves.moves || []).map(m => m.id)),
    outcomeIds: new Set((outcomes.outcome_shapes || []).map(o => o.id))
  }
}

const URL = () => (process.env.SUPABASE_URL || '').trim()
const KEY = () => (process.env.SUPABASE_SERVICE_KEY || '').trim()
const H = () => ({ apikey: KEY(), Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json' })

async function rest (pathname, init = {}) {
  const r = await fetch(`${URL()}/rest/v1/${pathname}`, { ...init, headers: { ...H(), ...(init.headers || {}) } })
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${pathname}: ${(await r.text()).slice(0, 300)}`)
  return r
}

/** Read-only: the scenario ids that exist, so no step is written with a dangling anchor. */
async function scenarioIds (slug) {
  const ids = new Set(); let from = 0
  while (true) {
    const r = await rest(`canonical_pod_scenarios?pod_slug=eq.${encodeURIComponent(slug)}&select=id&limit=1000&offset=${from}`)
    const d = await r.json(); d.forEach(x => ids.add(x.id))
    if (d.length < 1000) break; from += 1000
  }
  return ids
}

async function countSteps (slug) {
  const r = await rest(`canonical_pod_walk_steps?pod_slug=eq.${encodeURIComponent(slug)}&select=id`, { headers: { Prefer: 'count=exact', Range: '0-0' } })
  return Number((r.headers.get('content-range') || '*/0').split('/')[1] || 0)
}

async function main () {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'pod-corpora.json'), 'utf8'))
  const entries = (manifest.walks || []).filter(e => e.status === 'authored' && e.corpus && e.format)
  const which = arg('pod', '')
  const selected = which === 'all' ? entries : entries.filter(e => e.slug === which)
  if (!selected.length) {
    console.error(`--pod=<slug|all> required. Corpus-backed walks: ${entries.map(e => e.slug).join(', ')}`)
    process.exit(1)
  }

  const store = loadStore()
  const log = { ran: new Date().toISOString(), execute: EXECUTE, pods: [] }
  for (const e of selected) {
    const full = path.join(REPO, e.corpus)
    if (!fs.existsSync(full)) { console.log(`── ${e.slug} — CORPUS MISSING: ${e.corpus}`); continue }
    const parsed = PARSERS[e.format](fs.readFileSync(full, 'utf8'), e, store)
    const steps = parsed.steps || []
    const byRes = {}
    for (const s of steps) byRes[s.resolution] = (byRes[s.resolution] || 0) + 1
    const before = await countSteps(e.slug)
    console.log(`\n── ${e.slug} [${e.format}] — corpus declares ${steps.length} walk steps across ${new Set(steps.map(s => s.scene_number)).size} scenes; ${before} steps live now`)
    console.log(`   resolution: ${JSON.stringify(byRes)}`)
    if (!EXECUTE) { console.log('   DRY RUN — nothing written. Add --execute.'); log.pods.push({ slug: e.slug, before, would: steps.length, byRes }); continue }

    // The anchor check. Dialogue is READ here and never written.
    const live = await scenarioIds(e.slug)
    let orphanAnchors = 0
    const rows = steps.map(s => {
      if (s.scenario_id && !live.has(s.scenario_id)) { orphanAnchors++; return { ...s, scenario_id: null } }
      return s
    })
    if (orphanAnchors) console.log(`   ${orphanAnchors} steps had an anchor row that is not live — stored with a null anchor, dialogue untouched`)

    await rest(`canonical_pod_walk_steps?pod_slug=eq.${encodeURIComponent(e.slug)}`, { method: 'DELETE' })
    for (let i = 0; i < rows.length; i += 200) {
      await rest('canonical_pod_walk_steps', { method: 'POST', body: JSON.stringify(rows.slice(i, i + 200)) })
    }
    const after = await countSteps(e.slug)
    const dialogue = (await rest(`canonical_pod_scenarios?pod_slug=eq.${encodeURIComponent(e.slug)}&select=id`, { headers: { Prefer: 'count=exact', Range: '0-0' } }))
    const dCount = Number((dialogue.headers.get('content-range') || '*/0').split('/')[1] || 0)
    console.log(`   wrote ${rows.length}; READ BACK ${after} steps — and ${dCount} dialogue rows still live`)
    log.pods.push({ slug: e.slug, before, wrote: rows.length, readBack: after, dialogueRows: dCount, orphanAnchors, byRes })
  }
  const out = evidencePath('docs/pods/sync-walk-steps-log.json')
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`\nlog → ${out}`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
