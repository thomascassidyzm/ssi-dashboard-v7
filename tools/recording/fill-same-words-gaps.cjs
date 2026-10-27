#!/usr/bin/env node
/**
 * fill-same-words-gaps.cjs — ONE TAKE, EVERY SLOT OF THE SAME WORDS, for takes made before the
 * booth did it by itself (Aran's standing rule; job #198).
 *
 * Since job #198 a booth take fills every empty seed / LEGO / phrase slot of the same spoken words
 * (recordist-queue fillSameWordsSlots). Older takes did not, so some slots are still empty although
 * the reader has already said their words. This closes those gaps — through Popty only:
 *
 *   1. GET /api/recording/voice/<voice>/same-words-gaps  (signed agent, takes:read) — the plan:
 *      every empty slot this voice is cast on whose words it has recorded, as edit-door ops.
 *   2. POST /api/production/<course>/edit-batch per course — DRY RUN unless --apply. Every op is
 *      `audio.link` with `expect: {<slot>: null}` (fill-empty only: a slot that filled meanwhile is
 *      refused, nothing is overwritten) and returns an undo file.
 *
 *   node tools/recording/fill-same-words-gaps.cjs --voice human_aran_cym_n [--course cym_nv2_for_eng]... [--apply]
 *
 * --course limits the courses written (repeatable); with none, every course in the plan. The plan,
 * the door's answers and the undo file names are written to ~/ssi-evidence (tools/lib/evidence-path).
 * POPTY_URL overrides http://localhost:3470.
 */
'use strict'
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { evidencePath } = require('../lib/evidence-path.cjs')

const AGENT = 'fill-same-words-gaps-198'
const CHUNK = 500

function args(argv) {
  const out = { voice: null, courses: [], apply: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--voice') out.voice = argv[++i]
    else if (argv[i] === '--course') out.courses.push(argv[++i])
    else if (argv[i] === '--apply') out.apply = true
    else throw new Error(`unknown argument ${argv[i]}`)
  }
  if (!out.voice) throw new Error('usage: fill-same-words-gaps.cjs --voice <voiceId> [--course <code>]... [--apply]')
  return out
}

/** Split one course's planned ops into edit-batch bodies. Pure — tested. */
function batchesFor(planned, { apply, chunk = CHUNK } = {}) {
  const out = []
  for (let i = 0; i < planned.length; i += chunk) out.push({ ops: planned.slice(i, i + chunk).map((p) => p.op), apply: !!apply })
  return out
}

const MAX_DRIFT_RETRIES = 50

/**
 * The door refused the batch because op `index`'s slot is no longer empty: drop that op from
 * `body` (in place) and return it, else null. Pure — tested.
 */
function dropDriftedOp(body, status, out) {
  if (status !== 409 || !out || !Number.isInteger(out.index) || !/before-state drift/.test(String(out.error || ''))) return null
  const [op] = body.ops.splice(out.index, 1)
  return op || null
}

async function main() {
  const a = args(process.argv.slice(2))
  const base = process.env.POPTY_URL || 'http://localhost:3470'
  const plan = JSON.parse(execFileSync('node', [path.join(__dirname, '../agent-admin/call.cjs'), '--agent', AGENT, 'GET',
    `/api/recording/voice/${encodeURIComponent(a.voice)}/same-words-gaps`], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }))
  const courses = Object.keys(plan.byCourse || {}).filter((c) => !a.courses.length || a.courses.includes(c))
  const report = { voiceId: plan.voiceId, at: new Date().toISOString(), apply: a.apply, takes: plan.takes, planned: plan.slots, courses: {} }
  console.log(`${plan.voiceId}: ${plan.takes} takes; ${plan.slots} empty slot(s) whose words are already recorded`)
  for (const [c, list] of Object.entries(plan.byCourse || {})) console.log(`  ${c}: ${list.length}${courses.includes(c) ? '' : '  (not selected)'}`)
  for (const courseCode of courses) {
    const planned = plan.byCourse[courseCode]
    const r = report.courses[courseCode] = { planned: planned.length, ok: 0, refused: 0, batches: [], sample: planned.slice(0, 15) }
    r.alreadyFilled = []
    for (const body of batchesFor(planned, { apply: a.apply })) {
      // A slot that filled after the plan was read (he may be recording right now; the phrase plan
      // is cached for minutes) fails its `expect` and the door refuses the whole batch: that op is
      // dropped — the slot already plays a take — and the rest is sent again.
      for (let attempt = 0; attempt <= MAX_DRIFT_RETRIES && body.ops.length; attempt++) {
        const res = await fetch(`${base}/api/production/${encodeURIComponent(courseCode)}/edit-batch`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body),
        })
        const out = await res.json().catch(() => ({}))
        const drift = dropDriftedOp(body, res.status, out)
        if (drift) { r.alreadyFilled.push(drift); continue }
        r.batches.push({ status: res.status, dryRun: out.dryRun, event: out.event_id || null, undo: out.undo_file || out.how_to_undo || null, error: out.error || null, code: out.code || null })
        if (res.ok) r.ok += body.ops.length; else r.refused += body.ops.length
        console.log(`  ${courseCode}: ${body.ops.length} op(s) → HTTP ${res.status}${out.dryRun === false ? ' APPLIED' : ' dry run'}${out.error ? ` — ${out.error}` : ''}`)
        break
      }
    }
    if (r.alreadyFilled.length) console.log(`  ${courseCode}: ${r.alreadyFilled.length} slot(s) filled since the plan was read — left as they are`)
  }
  const file = evidencePath(`tools/recording/fill-same-words-gaps/${plan.voiceId}-${a.apply ? 'applied' : 'dryrun'}-${Date.now()}.json`)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify({ report, plan }, null, 1))
  console.log(`log: ${file}`)
  if (!a.apply) console.log('Dry run: nothing written. Add --apply to link.')
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1) })
module.exports = { batchesFor, args, dropDriftedOp }
