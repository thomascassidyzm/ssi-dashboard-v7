#!/usr/bin/env node
// cs #346·AL: send one ≤100-op request to Popty's edit-batch door for jpn_for_eng and log request + response here.
//   node post.cjs <kind> [--apply] [--only <phrase_id,…>] [--skip <phrase_id,…>]   (kind = deletes | rewords | addend)
// Ops come from ops-<kind>.json (written by precheck.cjs). Dry run unless --apply. Identity: x-agent-id kai-346-jpn-open-end.
// Every op carries the census `expect` (seed_number, lego_index, known_text, target_text): any drift aborts the whole request.
'use strict'
const fs = require('fs'), path = require('path')
const [kind, ...rest] = process.argv.slice(2)
const apply = rest.includes('--apply')
const list = (f) => { const i = rest.indexOf(f); return i >= 0 ? new Set(rest[i + 1].split(',')) : null }
const only = list('--only'), skip = list('--skip')
let ops = JSON.parse(fs.readFileSync(path.join(__dirname, `ops-${kind}.json`), 'utf8'))
if (only) ops = ops.filter((o) => only.has(o.phrase_id))
if (skip) ops = ops.filter((o) => !skip.has(o.phrase_id))
if (!ops.length || ops.length > 100) { console.error(`refusing: ${ops.length} ops`); process.exit(1) }
;(async () => {
  const body = { ops, apply, changeset: { id: `jpn_for_eng-cs346-${kind}`, batch: 1 } }
  const r = await fetch(`http://localhost:3470/api/production/jpn_for_eng/edit-batch`, { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-agent-id': 'kai-346-jpn-open-end' }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) })
  const json = await r.json().catch(() => ({}))
  const tag = `${new Date().toISOString().replace(/[:.]/g, '-')}-${kind}${only ? '-only' : ''}-${apply ? 'apply' : 'dryrun'}`
  fs.writeFileSync(path.join(__dirname, 'log', `${tag}.json`), JSON.stringify({ request: body, status: r.status, response: json }, null, 1) + '\n')
  console.log(JSON.stringify({ kind, ops: ops.length, status: r.status, ok: json.ok, applied: json.applied, event_id: json.event_id, undo_file: json.undo_file, code: json.code, error: json.error, log: `log/${tag}.json` }))
  process.exit(r.ok && json.ok ? 0 : 1)
})()
