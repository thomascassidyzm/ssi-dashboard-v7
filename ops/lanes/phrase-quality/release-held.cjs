#!/usr/bin/env node
// Release the ramp's audio-held replacements (Tom's ruling r-2026-10-12-for-the-open-ramp-967-decisions):
// runs apply-staged.cjs --release-held for every course that has held replacements still open in the
// ledger, a few courses at a time. DRY RUN unless --apply. Reversible with undo.cjs <course>.
// Usage: node ops/lanes/phrase-quality/release-held.cjs [--apply] [--parallel N] [course ...]
'use strict'
const fs = require('fs'), path = require('path'), { spawn } = require('child_process')
const { readLedger, doneRowIds } = require('./ledger.cjs')

function heldByCourse(dir = __dirname) {
  const out = {}
  const sd = path.join(dir, 'staged')
  for (const f of fs.existsSync(sd) ? fs.readdirSync(sd) : []) {
    const course = f.replace(/\.jsonl$/, '')
    const done = doneRowIds(readLedger(path.join(dir, 'undo', f)))
    const rows = new Set()
    for (const l of fs.readFileSync(path.join(sd, f), 'utf8').split('\n').filter((x) => x.trim())) {
      const d = JSON.parse(l)
      if (d.hold && d.decision === 'replace' && !done.has(d.row_id)) rows.add(d.row_id)
    }
    if (rows.size) out[course] = rows.size
  }
  return out
}

async function main() {
  const argv = process.argv.slice(2), APPLY = argv.includes('--apply')
  const pi = argv.indexOf('--parallel'), P = pi >= 0 ? Number(argv[pi + 1]) : 4
  const named = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--parallel')
  const held = heldByCourse(), courses = Object.keys(held).filter((c) => !named.length || named.includes(c))
  console.log(`held replacements open: ${courses.reduce((n, c) => n + held[c], 0)} across ${courses.length} courses`)
  const queue = [...courses]
  const worker = async () => {
    for (let c; (c = queue.shift()); ) {
      const code = await new Promise((res) => {
        const p = spawn('node', [path.join(__dirname, 'apply-staged.cjs'), c, '--release-held', ...(APPLY ? ['--apply'] : [])], { stdio: ['ignore', 'ignore', 'pipe'] })
        let err = ''; p.stderr.on('data', (b) => { err += b })
        p.on('close', (rc) => { const lines = err.trim().split('\n'); console.log(`${c}: ${lines.filter((l) => /DRY RUN|replace, .* delete/.test(l)).pop() || lines.pop()}${lines.some((l) => /audio pass/.test(l)) ? ' | ' + lines.filter((l) => /audio pass/.test(l)).pop() : ''}`); res(rc) })
      })
      if (code) console.log(`${c}: exit ${code}`)
    }
  }
  await Promise.all(Array.from({ length: P }, worker))
}
if (require.main === module) main().then(() => process.exit(0)); else module.exports = { heldByCourse }
