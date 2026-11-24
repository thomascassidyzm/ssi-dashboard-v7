#!/usr/bin/env node
'use strict'
/**
 * scan.cjs — the nightly read-only course scan's ONE database step (cs #237·AL; Kai approved 24 Nov 2026 17:02Z).
 *
 *   node tools/nightly-course-scan/scan.cjs <course> [...]   dump each course from the nightly QA copy, then analyse it
 *   node tools/nightly-course-scan/scan.cjs --calibrate      dump every calibration course, then analyse.cjs --calibrate
 *   node tools/nightly-course-scan/scan.cjs --next 3         the next 3 queue courses not yet in scanned.txt (no DB)
 *
 * The read is ops/paid-cleanup-scan-447/copy-read.cjs `dump`, unchanged: it REFUSES any DATABASE_URL that is not the local
 * ssi_copy_* database, so this never reads live. One dump per course per copy build (a dump already present is reused).
 * Everything after the dump is analyse.cjs, which has no database code at all.
 * Queue order: ops/nightly-course-scan/queue.json. Done list: ~/.cs-long/nightly-course-scan/scanned.txt (SCAN_DONE_FILE).
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')
const R = path.resolve(__dirname, '../..')
const { evidencePath } = require(R + '/tools/lib/evidence-path.cjs')

function run(args) {
  const r = spawnSync(process.execPath, args, { cwd: R, stdio: 'inherit' })
  if (r.status !== 0) throw new Error(`${path.basename(args[0])} ${args[1] || ''} exited ${r.status}`)
}
function dumpFile(course) {
  const st = JSON.parse(fs.readFileSync(path.join(os.homedir(), 'ssi-restore', 'copy-state.json'), 'utf8'))
  if (!st.db) throw new Error('no nightly QA copy recorded in ~/ssi-restore/copy-state.json — report it, never read live')
  const f = evidencePath(`ops/nightly-course-scan/${st.db}/${course}.dump.json`)
  if (!fs.existsSync(f)) run([path.join(R, 'ops/paid-cleanup-scan-447/copy-read.cjs'), 'dump', course, f, '9999'])
  return f
}
const a = process.argv.slice(2)
try {
  if (a[0] === '--next') {
    const Q = JSON.parse(fs.readFileSync(path.join(R, 'ops/nightly-course-scan/queue.json'), 'utf8'))
    const doneF = process.env.SCAN_DONE_FILE || path.join(os.homedir(), '.cs-long/nightly-course-scan/scanned.txt')
    const done = new Set(fs.existsSync(doneF) ? fs.readFileSync(doneF, 'utf8').split(/\s+/).filter(Boolean) : [])
    console.log(Q.queue.map((q) => q.course).filter((c) => !done.has(c)).slice(0, Number(a[1] || 3)).join(' '))
  } else if (a[0] === '--calibrate') {
    const C = JSON.parse(fs.readFileSync(path.join(__dirname, 'calibration.json'), 'utf8'))
    for (const c of new Set(C.positives.map((p) => p.course))) dumpFile(c)
    run([path.join(__dirname, 'analyse.cjs'), '--calibrate'])
  } else if (a.length) {
    for (const c of a) run([path.join(__dirname, 'analyse.cjs'), dumpFile(c)])
  } else { console.error('usage: scan.cjs <course>... | --calibrate | --next N'); process.exit(2) }
} catch (e) { console.error(`scan: ${e.message}`); process.exit(1) }
