#!/usr/bin/env node
/**
 * ingest-canonical-pods — put a walk into the canonical store, once, so the Script
 * Lab can edit and score it.
 *
 * WHAT TO INGEST IS DATA, NOT CODE. This tool used to carry a hardcoded three-entry
 * map, which is why no new walk ever appeared in the Script Lab: a corpus could
 * exist and still be un-ingestable without editing this file. It now reads
 * `tools/pods/pod-corpora.json` — the walk registry — and the Script Lab reads the
 * same file. ADDING THE NINTH WALK IS ONE JSON ENTRY AND ONE CORPUS FILE, AND NO
 * CODE CHANGE ANYWHERE.
 *
 * Tom's ruling, 2026-08-30: "it has to then be stored in the DB like everything
 * else in popty editing does." So this is a ONE-WAY, ONE-TIME import. After it
 * runs, THE DATABASE IS CANON and the markdown is a historical artefact.
 *
 * There is deliberately no sync, no startup check and no compare-and-fix. The only
 * way to write over live rows again is `--reimport-destructive`, which says what it
 * does, refuses to run without `--execute`, and prints the row count it is about to
 * destroy. Anything less explicit would silently overwrite Tom's edits, which is
 * exactly the failure this job exists to avoid.
 *
 *   node tools/pods/ingest-canonical-pods.cjs --pod=learning-flagship            # dry run
 *   node tools/pods/ingest-canonical-pods.cjs --pod=learning-flagship --execute
 *   node tools/pods/ingest-canonical-pods.cjs --pod=all --execute
 *   node tools/pods/ingest-canonical-pods.cjs --pod=X --reimport-destructive --execute
 *   node tools/pods/ingest-canonical-pods.cjs --ddl                              # print the DDL
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { parsePod } = require('./parse-pod-markdown.cjs')
const { parseSectorWalk } = require('./parse-sector-walk.cjs')
const { evidencePath } = require('../lib/evidence-path.cjs')

// The two import formats the registry's `format` field selects between. A new
// format is a new entry here plus its parser; nothing else in this file moves.
const PARSERS = {
  'pod-table': (md, e, store) => parsePod(md, { slug: e.slug, unit: e.unit || 'Chapter', targetLang: e.targetLang || null, store }),
  'sector-flows': (md, e, store) => parseSectorWalk(md, { slug: e.slug, store })
}

const REPO = path.resolve(__dirname, '../..')
const arg = (n, d) => { const h = process.argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d }
const EXECUTE = process.argv.includes('--execute')
const REIMPORT = process.argv.includes('--reimport-destructive')
// --sections=1,2 restricts the import to those chapters/scenes. It exists for the
// pilot — prove the storage shape on one chapter before paying for ~1,500 rows.
const SECTIONS = (arg('sections', '') || '').split(',').filter(Boolean).map(Number)

const MANIFEST = path.join(__dirname, 'pod-corpora.json')

/** The walk registry, and what each entry means for THIS tool.
 *  - status 'authored' + a corpus  → ingestable
 *  - status 'mapping-only', or a null corpus → SKIPPED with its reason printed. A
 *    mapping is not a walk, and pod-1 is canon in the DB rather than in markdown.
 *  Entries in `parked[]` are never read here: they are deliberately not canon. */
function loadManifest () {
  const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  return (m.walks || []).map(e => ({
    ...e,
    ingestable: e.status === 'authored' && !!e.corpus && !!e.format,
    skipReason: e.status !== 'authored'
      ? `status '${e.status}' — not an authored walk`
      : (!e.corpus ? 'no corpus: the DB is canon for this one, or authoring is in flight'
        : (!e.format ? 'no format declared' : null))
  }))
}

const DDL = `
-- The Italian specimen realisation written beside the English in both Method Pod
-- cuts. It is not author_notes (a live editable field with its own purpose) and it
-- is not a second scenarios table (that would be a second copy of the dialogue).
alter table canonical_pod_scenarios add column if not exists target_text text;
alter table canonical_pod_scenarios add column if not exists target_lang text;

-- The walk, in node-reference form (Watson's ruling, 2026-08-30; src/lib/metagraph/
-- walk.js). A chapter declares its shapes AT CHAPTER LEVEL, so a step cannot be a
-- column on a dialogue row without inventing per-turn claims. Steps are node
-- references; the text hangs off scenario_id, never the other way round.
create table if not exists canonical_pod_walk_steps (
  id           text primary key,
  pod_slug     text not null,
  walk_id      text not null,
  walk_name    text,
  scene_number integer not null,
  step_order   integer not null,
  kind         text not null,
  node_id      text,
  declared_as  text not null,
  register     text,
  resolution   text not null,
  scenario_id  text references canonical_pod_scenarios(id) on delete set null,
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists canonical_pod_walk_steps_slug_idx
  on canonical_pod_walk_steps (pod_slug, scene_number, step_order);
`

function loadStore () {
  const p = f => JSON.parse(fs.readFileSync(path.join(REPO, 'services/shared/metagraph', f), 'utf8'))
  const nodes = p('nodes.json'), moves = p('moves.json'), outcomes = p('outcome-shapes.json')
  return {
    nodeIds: new Set([...(nodes.nodes || []), ...(nodes.bound_pairs || [])].map(n => n.id)),
    moveIds: new Set((moves.moves || []).map(m => m.id)),
    outcomeIds: new Set((outcomes.outcome_shapes || []).map(o => o.id))
  }
}

// --- Supabase REST, the same door tools/seed-canonical-pods.cjs uses ---------
const URL = () => (process.env.SUPABASE_URL || '').trim()
const KEY = () => (process.env.SUPABASE_SERVICE_KEY || '').trim()
const H = () => ({ apikey: KEY(), Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' })

async function rest (pathname, init = {}) {
  const r = await fetch(`${URL()}/rest/v1/${pathname}`, { ...init, headers: { ...H(), ...(init.headers || {}) } })
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${pathname}: ${(await r.text()).slice(0, 300)}`)
  return r
}

async function countRows (table, slug) {
  const r = await rest(`${table}?pod_slug=eq.${encodeURIComponent(slug)}&select=id`, { headers: { Prefer: 'count=exact', Range: '0-0' } })
  const cr = r.headers.get('content-range') || '*/0'
  return Number(cr.split('/')[1] || 0)
}

async function insertBatched (table, rows) {
  let done = 0
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200)
    await rest(table, { method: 'POST', body: JSON.stringify(batch) })
    done += batch.length
  }
  return done
}

function summarise (slug, parsed) {
  const byRes = {}
  for (const s of parsed.steps) byRes[s.resolution] = (byRes[s.resolution] || 0) + 1
  const byReg = {}
  for (const s of parsed.steps) if (s.resolution === 'unresolved') byReg[s.register] = (byReg[s.register] || 0) + 1
  const scenes = new Set(parsed.scenarios.map(r => r.scene_number))
  const shapedScenes = new Set(parsed.steps.filter(s => s.node_id).map(s => s.scene_number))
  const nodes = [...new Set(parsed.steps.filter(s => s.node_id).map(s => s.node_id))].sort()
  return { slug, lines: parsed.scenarios.length, sections: scenes.size, walkSteps: parsed.steps.length, byRes, unresolvedByRegister: byReg, resolvedShapes: nodes, sectionsWithAShape: shapedScenes.size }
}

async function main () {
  if (process.argv.includes('--ddl')) { console.log(DDL); return }

  const entries = loadManifest()
  const which = arg('pod', '')
  let selected
  if (which === 'all') {
    selected = entries.filter(e => e.ingestable)
    for (const e of entries.filter(e => !e.ingestable)) {
      console.log(`── ${e.slug} — SKIPPED: ${e.skipReason}`)
    }
  } else {
    const e = entries.find(x => x.slug === which)
    if (!e) {
      console.error(`--pod=<slug|all> required. The registry (tools/pods/pod-corpora.json) holds:`)
      for (const x of entries) console.error(`   ${x.slug.padEnd(24)} ${x.ingestable ? 'ingestable' : 'not ingestable — ' + x.skipReason}`)
      process.exit(1)
    }
    if (!e.ingestable) { console.error(`── ${e.slug} — not ingestable: ${e.skipReason}`); process.exit(1) }
    selected = [e]
  }
  if (!selected.length) { console.log('nothing ingestable in the registry.'); return }

  const store = loadStore()
  const report = []
  const table = []
  for (const e of selected) {
    console.log(`\n── ${e.slug} — ${e.name} [${e.format}]`)
    if (e.note) console.log(`   ${e.note}`)

    // A missing corpus file is a named error for THIS entry and nothing else: the
    // other walks in the run keep going. A silent skip is how a walk goes missing.
    const full = path.join(REPO, e.corpus)
    if (!fs.existsSync(full)) {
      const msg = `CORPUS FILE MISSING: ${e.corpus}${e.branch && e.branch !== 'main' ? ` — the registry says it lives on branch '${e.branch}'; bring it in with \`git checkout origin/${e.branch} -- ${e.corpus}\`` : ''}`
      console.log(`   ERROR: ${msg}`)
      report.push({ slug: e.slug, error: msg })
      table.push({ slug: e.slug, format: e.format, status: 'MISSING CORPUS', scenes: '—', flows: '—', lines: '—', steps: '—' })
      continue
    }
    const parse = PARSERS[e.format]
    if (!parse) {
      const msg = `NO PARSER for format '${e.format}' — add it to PARSERS in this file`
      console.log(`   ERROR: ${msg}`)
      report.push({ slug: e.slug, error: msg })
      table.push({ slug: e.slug, format: e.format, status: 'NO PARSER', scenes: '—', flows: '—', lines: '—', steps: '—' })
      continue
    }

    let parsed
    try {
      parsed = parse(fs.readFileSync(full, 'utf8'), e, store)
    } catch (err) {
      const msg = `PARSE FAILED: ${err.message}`
      console.log(`   ERROR: ${msg}`)
      report.push({ slug: e.slug, error: msg })
      table.push({ slug: e.slug, format: e.format, status: 'PARSE FAILED', scenes: '—', flows: '—', lines: '—', steps: '—' })
      continue
    }
    if (SECTIONS.length) {
      parsed = {
        ...parsed,
        scenarios: parsed.scenarios.filter(r => SECTIONS.includes(r.scene_number)),
        steps: parsed.steps.filter(s => SECTIONS.includes(s.scene_number))
      }
      console.log(`   (--sections=${SECTIONS.join(',')} — partial import)`)
    }

    const sum = summarise(e.slug, parsed)
    const flows = new Set(parsed.scenarios.map(r => `${r.scene_number}|${r.variant_key || ''}`)).size
    const unit = (e.unit || 'Scene').toLowerCase()
    console.log(`   ${sum.lines} lines across ${sum.sections} ${unit}s${parsed.stats ? ` and ${flows} flows` : ''}; ${sum.walkSteps} walk steps`)
    console.log(`   resolution: ${JSON.stringify(sum.byRes)}`)
    console.log(`   unresolved by register: ${JSON.stringify(sum.unresolvedByRegister)}`)
    console.log(`   resolved store shapes: ${sum.resolvedShapes.join(', ') || '(none)'}`)
    if (parsed.stats) {
      console.log(`   the defining rule rejected ${parsed.stats.sectionsRejected} of ${parsed.stats.sectionsSeen} '##' sections as not-a-scene`)
      console.log(`   ${parsed.stats.scenesWithoutDeclaration} of ${parsed.stats.scenes} scenes declare no shape — no walk steps invented for them`)
    }

    if (!EXECUTE) {
      console.log('   DRY RUN — nothing written. Add --execute.')
      report.push(sum)
      table.push({ slug: e.slug, format: e.format, status: 'dry run', scenes: sum.sections, flows, lines: sum.lines, steps: sum.walkSteps })
      continue
    }

    const existing = await countRows('canonical_pod_scenarios', e.slug)
    if (existing > 0 && !REIMPORT) {
      console.log(`   REFUSED: ${existing} rows already live under '${e.slug}'. The DB is canon; a re-import`)
      console.log('   would overwrite edits made in the Script Lab. Pass --reimport-destructive to destroy them.')
      report.push({ ...sum, wrote: 0, refused: existing })
      table.push({ slug: e.slug, format: e.format, status: `REFUSED (${existing} live rows)`, scenes: sum.sections, flows, lines: sum.lines, steps: sum.walkSteps })
      continue
    }
    if (existing > 0 && REIMPORT) {
      console.log(`   --reimport-destructive: DELETING ${existing} live scenario rows and their walk steps under '${e.slug}'.`)
      await rest(`canonical_pod_walk_steps?pod_slug=eq.${encodeURIComponent(e.slug)}`, { method: 'DELETE' })
      await rest(`canonical_pod_scenarios?pod_slug=eq.${encodeURIComponent(e.slug)}`, { method: 'DELETE' })
    }
    const wroteRows = await insertBatched('canonical_pod_scenarios', parsed.scenarios)
    const wroteSteps = await insertBatched('canonical_pod_walk_steps', parsed.steps)
    const backRows = await countRows('canonical_pod_scenarios', e.slug)
    const backSteps = await countRows('canonical_pod_walk_steps', e.slug)
    console.log(`   wrote ${wroteRows} lines / ${wroteSteps} walk steps; READ BACK ${backRows} lines / ${backSteps} walk steps`)
    report.push({ ...sum, wroteRows, wroteSteps, backRows, backSteps })
    table.push({ slug: e.slug, format: e.format, status: `wrote ${wroteRows}, read back ${backRows}`, scenes: sum.sections, flows, lines: sum.lines, steps: sum.walkSteps })
  }

  // One line per walk, so a human can see what the registry resolved to.
  console.log('\nWHAT THE REGISTRY RESOLVED TO')
  console.log(`  ${'walk'.padEnd(22)}${'format'.padEnd(15)}${'scenes'.padStart(7)}${'flows'.padStart(7)}${'lines'.padStart(7)}${'steps'.padStart(7)}  status`)
  for (const r of table) {
    console.log(`  ${r.slug.padEnd(22)}${String(r.format).padEnd(15)}${String(r.scenes).padStart(7)}${String(r.flows).padStart(7)}${String(r.lines).padStart(7)}${String(r.steps).padStart(7)}  ${r.status}`)
  }
  const errs = report.filter(r => r.error)
  if (errs.length) console.log(`\n${errs.length} entr${errs.length === 1 ? 'y' : 'ies'} FAILED: ${errs.map(e => e.slug).join(', ')}`)

  // Machine-generated evidence lives out of the tracked tree (docs/EVIDENCE.md);
  // the old path under docs/ was gitignored, so the log was being written nowhere
  // a second machine could find it.
  const out = evidencePath('docs/pods/pod-ingest-log.json')
  fs.writeFileSync(out, JSON.stringify({ ran: new Date().toISOString(), execute: EXECUTE, report, table }, null, 2))
  console.log(`\nlog → ${out}`)
  if (errs.length) process.exit(1)
}

main().catch(e => { console.error(e.message); process.exit(1) })
