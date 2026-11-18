#!/usr/bin/env node
/**
 * THE CHANGESET APPLIER — the one way a computed change reaches the live SSi DB in bulk (cs #835, 2026-11-18).
 *
 * Tom: "There should be no need to write to the live database in a heavy way. We want a single db still but we
 * need a clever way to update it." Design: https://watson-1.tail4968cb.ts.net/d/973c9f34
 *
 *   node tools/changeset/apply-changeset.cjs <file.changeset.jsonl> --agent <id> [--key kai]
 *        [--batch 25] [--dry-run] [--check] [--urgent "<why>"]
 *
 * What it does, per changeset (written by services/shared/changeset.cjs from work done on the nightly copy):
 *   · --check: validates every op's shape with the edit door's own planner, offline. Zero DB. Any time.
 *   · QUIET HOURS: applies only 22:00-07:00 Europe/London (the estate's night). Outside it, says when the window
 *     opens and exits 75. --urgent "<why>" overrides; it is logged to ops_events, and the governor still applies.
 *   · SMALL: ≤ --batch ops (default 25, max 100) per request to Popty's edit door
 *     (POST /api/admin/course-edit/<course>/edit-batch, signed as --agent). Each batch is ONE short transaction,
 *     with the door's before-state check, undo file and content-log event.
 *   · GOVERNED: every request waits on the live DB load governor (services/shared/db-load-governor.cjs). It slows
 *     when learners need the database, and the batch latency feeds back as the writer's own latency.
 *   · IDEMPOTENT: <file>.applied.jsonl records every op's fate, and a re-run skips them. A DRIFT (live ≠ what the
 *     copy saw) is isolated to its own op, which is then dry-run with expect = its target: if live already holds the
 *     target, the op is "already" applied; otherwise it is "drift" and is set aside, reported, never overwritten.
 *     The rest of the batch is re-sent without it.
 *   · UNDO: each applied batch's undo file is named in the ledger
 *     (POST …/edit-batch {"undo_file": "<name>", "apply": true}).
 * Exit: 0 all done · 1 stopped (error or refusal; re-run resumes) · 2 done with drift/refused ops to look at ·
 *       75 outside quiet hours / window closed mid-run (re-run tonight resumes).
 */
'use strict'
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const changeset = require('../../services/shared/changeset.cjs')

const ROOT = path.resolve(__dirname, '..', '..')
const POPTY = process.env.POPTY_URL || 'http://localhost:3470'
const QUIET = { from: 22, to: 7, tz: 'Europe/London' }
const MAX_BATCH = 100

function parseArgs(argv) {
  const a = { batch: 25 }
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]
    if (k === '--agent') a.agent = argv[++i]
    else if (k === '--key') a.key = argv[++i]
    else if (k === '--batch') a.batch = Number(argv[++i])
    else if (k === '--urgent') a.urgent = argv[++i]
    else if (k === '--dry-run') a.dryRun = true
    else if (k === '--check') a.check = true
    else if (!k.startsWith('--') && !a.file) a.file = k
    else throw new Error(`unknown argument ${k}`)
  }
  if (!a.file) throw new Error('usage: apply-changeset.cjs <file.changeset.jsonl> --agent <id> [--key kai] [--batch 25] [--dry-run] [--check] [--urgent "<why>"]')
  if (!(a.batch >= 1 && a.batch <= MAX_BATCH)) throw new Error(`--batch must be 1..${MAX_BATCH}`)
  return a
}

function londonHour(d = new Date()) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: QUIET.tz, hour: '2-digit', hourCycle: 'h23' }).format(d))
}
const inQuietHours = (d = new Date()) => { const h = londonHour(d); return h >= QUIET.from || h < QUIET.to }

function opsEvent(kind, detail) {
  try {
    const body = JSON.stringify({ source: 'changeset-applier', kind, detail: String(detail).slice(0, 500) })
    require('child_process').spawn('/usr/bin/curl', ['-s', '-m', '5', '-o', '/dev/null', '-X', 'POST', 'http://localhost:4317/api/ops-event', '-H', 'Content-Type: application/json', '-d', body], { detached: true, stdio: 'ignore' }).unref()
  } catch { /* best effort */ }
}

/** POST to Popty's edit door, signed as the agent (the same signer tools/agent-admin/call.cjs uses). */
async function post(args, course, body) {
  const urlPath = `/api/admin/course-edit/${course}/edit-batch`
  const header = execFileSync('sudo', ['-n', '-u', 'popty', 'node', path.join(ROOT, 'tools', 'agent-admin', 'sign.cjs')], {
    input: JSON.stringify({ agentId: args.agent, method: 'POST', path: urlPath, body, key: args.key }), encoding: 'utf8',
  }).trim()
  const res = await fetch(POPTY + urlPath, { method: 'POST', headers: { 'x-agent-admin': header, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) })
  let json = null
  try { json = await res.json() } catch { json = null }
  return { status: res.status, json: json || {} }
}

function loadLedger(file) {
  const done = new Map()
  try {
    for (const l of fs.readFileSync(file, 'utf8').split('\n')) {
      if (!l.trim()) continue
      const e = JSON.parse(l)
      for (const i of e.ops || []) done.set(i, e.status)
    }
  } catch { /* none yet */ }
  return done
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const { header, ops } = changeset.read(args.file)
  const course = header.course

  if (args.check) {
    const { planOps } = require('../../services/shared/course-edit-ops.cjs')
    for (let i = 0; i < ops.length; i += MAX_BATCH) planOps(ops.slice(i, i + MAX_BATCH), course)
    console.log(`check OK: ${ops.length} op(s) for ${course} parse against the edit door's planner (no DB touched)`)
    return 0
  }
  if (!args.agent) throw new Error('--agent <id> is required (your job label or Watson name; Kai: --key kai --agent kai-<job>)')

  const urgentOk = () => { if (!args.urgent) return false; opsEvent('urgent', `${header.id}: applied outside quiet hours — ${args.urgent} (agent ${args.agent})`); return true }
  if (!inQuietHours() && !urgentOk()) {
    console.error(`apply-changeset: outside quiet hours (applies ${QUIET.from}:00-0${QUIET.to}:00 UK; it is ${londonHour()}:xx). Nothing sent. Re-run in the window; the ledger makes a re-run safe.`)
    return 75
  }

  const ledgerFile = `${args.file}.applied.jsonl`
  const done = args.dryRun ? new Map() : loadLedger(ledgerFile)
  const pendingAll = ops.map((o, i) => i).filter((i) => !done.has(i))
  const record = (status, indices, extra = {}) => {
    const e = { at: new Date().toISOString(), status, ops: indices, ...extra }
    if (!args.dryRun) fs.appendFileSync(ledgerFile, JSON.stringify(e) + '\n')
    for (const i of indices) done.set(i, status)
  }

  const { m: gm } = require('../../services/shared/db-load-gate.cjs').loadGovernorModule()
  const gov = gm.createGovernor({ writer: `changeset:${header.id}`.slice(0, 60), startRate: 1 })
  const extras = { ...(header.tom_go ? { tom_go: header.tom_go } : {}), ...(header.kai_go ? { kai_go: header.kai_go } : {}) }
  console.log(`apply-changeset: ${header.id} (${course}) — ${ops.length} op(s), ${ops.length - pendingAll.length} already in the ledger, ${pendingAll.length} to send in batches of ${args.batch}${args.dryRun ? ' (DRY RUN: rolled back, no ledger)' : ''}`)

  let batchNo = 0
  for (let b = 0; b < pendingAll.length; b += args.batch) {
    if (!args.urgent && !inQuietHours()) { console.error('apply-changeset: the quiet-hours window closed mid-run; stopping cleanly. Re-run tonight to resume.'); return 75 }
    batchNo += 1
    let pending = pendingAll.slice(b, b + args.batch)
    let transient = 0
    while (pending.length) {
      const body = { ops: pending.map((i) => ops[i]), apply: !args.dryRun, changeset: { id: header.id, batch: batchNo }, ...extras }
      let r
      try { r = await gov.run(() => post(args, course, body)) } catch (e) { r = { status: 0, json: { error: e.message } } }
      if (r.status === 200 && r.json.ok) {
        record(args.dryRun ? 'dry-ok' : 'applied', pending, { batch: batchNo, event_id: r.json.event_id || null, undo_file: r.json.undo_file || null })
        console.log(`  batch ${batchNo}: ${pending.length} op(s) ${args.dryRun ? 'pass dry run' : `applied (event ${r.json.event_id || '?'}, undo ${r.json.undo_file || '-'})`} — governor ${gov.status().level} ${gov.status().rate}`)
        break
      }
      const idx = Number.isInteger(r.json.index) && r.json.index >= 0 && r.json.index < pending.length ? r.json.index : null
      if ((r.status === 409 || r.status === 400) && idx !== null) {
        const opi = pending[idx], o = ops[opi]
        let status = r.json.code === 'DRIFT' ? 'drift' : 'refused'
        if (status === 'drift' && o.set && typeof o.set === 'object') {
          // Already applied? Dry-run the op alone, expecting its TARGET values.
          const probe = { ops: [{ ...o, expect: { ...(o.expect || {}), ...o.set } }], apply: false, changeset: { id: header.id, batch: batchNo, probe: true }, ...extras }
          const p = await gov.run(() => post(args, course, probe)).catch(() => ({ status: 0, json: {} }))
          if (p.status === 200 && p.json.ok) status = 'already'
        }
        record(status, [opi], { batch: batchNo, detail: status === 'already' ? 'live already holds the target' : String(r.json.error || '').slice(0, 400) })
        console.log(`  batch ${batchNo}: op ${opi} ${status}${status === 'already' ? '' : ` — ${String(r.json.error || '').slice(0, 200)}`}`)
        pending = pending.filter((i) => i !== opi)
        continue
      }
      if ((r.status === 0 || r.status >= 500) && transient < 1) { transient += 1; await new Promise((s) => setTimeout(s, 10000)); continue }
      console.error(`apply-changeset: batch ${batchNo} stopped — HTTP ${r.status}: ${r.json.error || JSON.stringify(r.json).slice(0, 300)}. Nothing in this batch was applied; re-run resumes here.`)
      opsEvent('stopped', `${header.id} batch ${batchNo}: HTTP ${r.status} ${String(r.json.error || '').slice(0, 200)}`)
      return 1
    }
  }

  const count = (s) => [...done.values()].filter((v) => v === s).length
  const sum = { applied: count('applied'), already: count('already'), drift: count('drift'), refused: count('refused'), dry_ok: count('dry-ok') }
  console.log(`apply-changeset: ${header.id} finished — ${JSON.stringify(sum)}${args.dryRun ? '' : `; ledger ${ledgerFile}`}`)
  if (!args.dryRun) opsEvent('finished', `${header.id} (${course}) by ${args.agent}: ${JSON.stringify(sum)}`)
  return sum.drift || sum.refused ? 2 : 0
}

if (require.main === module) {
  main().then((code) => process.exit(code), (e) => { console.error(`apply-changeset: ${e.message}`); process.exit(1) })
}
module.exports = { inQuietHours, londonHour, parseArgs, loadLedger, QUIET, MAX_BATCH }
