#!/usr/bin/env node
/**
 * apply-core-recovery-rows.cjs — land the six CORE recovery flows as rows in
 * canonical_pod_scenarios under the distinct slug 'core-recoveries'.
 *
 * Data: tools/pods/core-recovery-rows-2026-09-04.json (committed beside this).
 *
 * The slug is distinct from 'pod-1' ON EVIDENCE: pod-dialogue-generator.cjs
 * defaults every course regen to canonicalSlug='pod-1' and selects by pod_slug
 * only, so variant rows on pod-1 would be flexed into 22 courses. Rows under
 * 'core-recoveries' are reachable only when that slug is named explicitly.
 *
 * Gates:
 *   - default is DRY RUN; --execute writes; --only=recovery-s2[,...] limits flows
 *   - every restaged row is asserted verbatim against the live pod-1 row at its
 *     g-number (attachment drift aborts the run)
 *   - every target id must be absent before insert (no upsert, no delete, ever)
 *   - on --execute the full pod-1 slug is snapshotted before and after and the
 *     two snapshots must be byte-identical
 *   - every run appends to docs/pods/core-recovery-halves-2026-09-04-{dryrun,applied}-log.json
 *
 * Usage (from a checkout carrying .env, or with SUPABASE_URL/SUPABASE_SERVICE_KEY exported):
 *   node tools/pods/apply-core-recovery-rows.cjs                      # dry run, all flows
 *   node tools/pods/apply-core-recovery-rows.cjs --only=recovery-s2   # dry run, one flow
 *   node tools/pods/apply-core-recovery-rows.cjs --only=recovery-s2 --execute
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const REPO = path.resolve(__dirname, '..', '..')
const DATA = path.join(__dirname, 'core-recovery-rows-2026-09-04.json')
const LOG_DIR = path.join(REPO, 'docs', 'pods')

// env: prefer exported vars; fall back to repo .env if present
for (const envPath of [path.join(REPO, '.env')]) {
  if (!fs.existsSync(envPath)) continue
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}
const URL = (process.env.SUPABASE_URL || '').trim()
const KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim()
if (!URL || !KEY) { console.error('SUPABASE_URL / SUPABASE_SERVICE_KEY missing (export them or run from a checkout with .env)'); process.exit(1) }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

const EXECUTE = process.argv.includes('--execute')
const onlyArg = process.argv.find(a => a.startsWith('--only='))
const ONLY = onlyArg ? onlyArg.slice(7).split(',').map(s => s.trim()).filter(Boolean) : null

const pad = n => String(n).padStart(2, '0')

async function rest(pathQ, opts = {}) {
  const r = await fetch(`${URL}/rest/v1/${pathQ}`, { headers: H, ...opts })
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${pathQ}: ${(await r.text()).slice(0, 300)}`)
  return r.status === 204 ? null : r.json()
}

async function fetchAll(query) {
  let out = [], from = 0
  while (true) {
    const r = await fetch(`${URL}/rest/v1/canonical_pod_scenarios?${query}`, { headers: { ...H, Range: `${from}-${from + 999}` } })
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`)
    const rows = await r.json()
    out = out.concat(rows)
    if (rows.length < 1000) break
    from += 1000
  }
  return out
}

const pod1Snapshot = () => fetchAll('pod_slug=eq.pod-1&select=id,scene_number,scene_label,sentence_number,global_order,speaker,english_text,author_notes,variant_key,target_text,target_lang,created_at,updated_at&order=global_order')
const sha = obj => crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex')

;(async () => {
  const data = JSON.parse(fs.readFileSync(DATA, 'utf8'))
  const SLUG = data.pod_slug
  const MARKER = `${data.draft_marker}`
  const flows = data.flows.filter(f => !ONLY || ONLY.includes(f.variant_key))
  if (!flows.length) { console.error(`--only matched no flows`); process.exit(1) }

  // ---- build the rows deterministically -------------------------------------
  let globalOrder = 0
  const rows = []
  for (const flow of data.flows) {
    for (let i = 0; i < flow.rows.length; i++) {
      globalOrder += 1
      if (!flows.includes(flow)) continue
      const src = flow.rows[i]
      let note
      if (src.restaged_from) {
        note = `${MARKER}: edge ${flow.edge} (${flow.attachment_id}); RESTAGED verbatim from pod-1 g${src.restaged_from} — quotation of the canon, not new material.`
      } else if (src.anchor) {
        note = `${MARKER}: edge ${flow.edge} (${flow.attachment_id}); opens with the canon grant from pod-1 g${src.anchor.g}, then the audit replaces the canon compliment.`
      } else {
        note = `${MARKER}: edge ${flow.edge} (${flow.attachment_id}); authored recovery turn — attaches to pod-1 scene ${flow.scene_number}, does not append to it.`
      }
      rows.push({
        id: `${SLUG}:SC${pad(flow.scene_number)}-R${flow.edge}-S${pad(i + 1)}`,
        pod_slug: SLUG,
        scene_number: flow.scene_number,
        scene_label: 'CORE recovery',
        scene_title: flow.scene_title,
        scene_subtitle: flow.scene_subtitle,
        difficulty: null,
        sentence_number: i + 1,
        global_order: globalOrder,
        speaker: src.speaker,
        english_text: src.english_text,
        author_notes: note,
        variant_key: flow.variant_key,
        target_text: null,
        target_lang: null,
        _restaged_from: src.restaged_from || null,
        _anchor: src.anchor || null,
      })
    }
  }

  // ---- gate 1: restaged rows must match the live canon verbatim -------------
  const pod1Before = await pod1Snapshot()
  if (pod1Before.length === 0) throw new Error('pod-1 snapshot came back empty — refusing to proceed')
  const byG = new Map(pod1Before.map(r => [r.global_order, r]))
  const failures = []
  for (const r of rows) {
    if (r._restaged_from) {
      const live = byG.get(r._restaged_from)
      if (!live) failures.push(`${r.id}: pod-1 g${r._restaged_from} not found`)
      else if (live.english_text !== r.english_text) failures.push(`${r.id}: DRIFT at pod-1 g${r._restaged_from}\n  live:     ${live.english_text}\n  restaged: ${r.english_text}`)
    }
    if (r._anchor) {
      const live = byG.get(r._anchor.g)
      if (!live) failures.push(`${r.id}: anchor pod-1 g${r._anchor.g} not found`)
      else if (!live.english_text.startsWith(r._anchor.startsWith)) failures.push(`${r.id}: anchor drift at pod-1 g${r._anchor.g} (expected startsWith ${JSON.stringify(r._anchor.startsWith)})`)
    }
  }
  if (failures.length) { console.error('ATTACHMENT DRIFT — aborting:\n' + failures.join('\n')); process.exit(1) }
  console.log(`gate 1 ok: ${rows.filter(r => r._restaged_from).length} restaged rows match the live canon verbatim; anchors hold`)

  // ---- gate 2: every target id must be absent -------------------------------
  const existing = await fetchAll(`pod_slug=eq.${encodeURIComponent(SLUG)}&select=id`)
  const clash = rows.filter(r => existing.some(e => e.id === r.id))
  if (clash.length) { console.error(`ids already present under ${SLUG} — aborting:\n` + clash.map(r => '  ' + r.id).join('\n')); process.exit(1) }
  console.log(`gate 2 ok: ${SLUG} carries ${existing.length} rows, none colliding with the ${rows.length} to write`)

  const insertRows = rows.map(({ _restaged_from, _anchor, ...row }) => row)
  const logEntry = {
    ts: new Date().toISOString(),
    mode: EXECUTE ? 'execute' : 'dry-run',
    only: ONLY,
    pod1_rows_before: pod1Before.length,
    pod1_sha_before: sha(pod1Before),
    rows: insertRows,
  }

  if (!EXECUTE) {
    for (const r of insertRows) console.log(`  [dry] ${r.id} g${r.global_order} [${r.speaker}] ${r.english_text.slice(0, 70)}`)
    const logPath = path.join(LOG_DIR, 'core-recovery-halves-2026-09-04-dryrun-log.json')
    const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : []
    log.push(logEntry)
    fs.writeFileSync(logPath, JSON.stringify(log, null, 1))
    console.log(`\n[dry run] ${insertRows.length} rows would be inserted under ${SLUG}. Logged to ${logPath}. Re-run with --execute.`)
    return
  }

  // ---- write ---------------------------------------------------------------
  const r = await fetch(`${URL}/rest/v1/canonical_pod_scenarios`, { method: 'POST', headers: H, body: JSON.stringify(insertRows) })
  if (!r.ok) throw new Error(`insert HTTP ${r.status}: ${(await r.text()).slice(0, 500)}`)
  console.log(`inserted ${insertRows.length} rows under ${SLUG}`)

  // ---- gate 3: pod-1 must be byte-identical before/after --------------------
  const pod1After = await pod1Snapshot()
  logEntry.pod1_rows_after = pod1After.length
  logEntry.pod1_sha_after = sha(pod1After)
  const untouched = logEntry.pod1_sha_before === logEntry.pod1_sha_after && pod1Before.length === pod1After.length
  logEntry.pod1_untouched = untouched

  const written = await fetchAll(`pod_slug=eq.${encodeURIComponent(SLUG)}&select=id&order=global_order`)
  logEntry.slug_rows_after = written.length

  const logPath = path.join(LOG_DIR, 'core-recovery-halves-2026-09-04-applied-log.json')
  const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : []
  log.push(logEntry)
  fs.writeFileSync(logPath, JSON.stringify(log, null, 1))

  if (!untouched) { console.error(`POD-1 CHANGED UNDER US: before sha ${logEntry.pod1_sha_before} (${pod1Before.length} rows), after sha ${logEntry.pod1_sha_after} (${pod1After.length} rows). Logged. STOPPING.`); process.exit(1) }
  console.log(`gate 3 ok: pod-1 byte-identical before/after (${pod1After.length} rows, sha ${logEntry.pod1_sha_after.slice(0, 12)}…)`)
  console.log(`${SLUG} now carries ${written.length} rows. Logged to ${logPath}.`)
})().catch(e => { console.error(e); process.exit(1) })
