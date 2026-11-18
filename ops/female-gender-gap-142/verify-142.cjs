#!/usr/bin/env node
/**
 * cs #142 — evidence that each re-recorded clip id SERVES its new object: for every real library/rendered line in
 * result-142-<course>.tsv, ask Popty's GET /api/production/audio/:id/stream (the redirect it serves) and compare the object
 * key in the redirect with the s3Key the render route returned. HTTP only, read-only. Writes verify-142-<course>.tsv.
 *   node ops/female-gender-gap-142/verify-142.cjs <course>
 */
const fs = require('fs'); const path = require('path')
const course = process.argv[2]
const lines = fs.readFileSync(path.join(__dirname, `result-142-${course}.tsv`), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'))
const real = new Map(); for (const c of lines) if (c[4] === 'real' && /^(library|rendered|already-rerecorded)$/.test(c[5])) real.set(c[0], c)
;(async () => {
  const out = ['clip\tsource\trevision\texpected_key\tserved_key\tok']; let ok = 0
  for (const [clip, c] of real) {
    const r = await fetch(`http://localhost:3470/api/production/audio/${clip}/stream`, { redirect: 'manual', headers: { 'x-agent-id': 'cs-142-female-rerecord' } })
    const served = (r.headers.get('location') || '').replace(/^https?:\/\/[^/]+\//, '').split('?')[0]
    const good = !!c[8] && served === c[8]; if (good) ok++
    out.push([clip, c[5], c[7], c[8], served || `HTTP ${r.status}`, good ? 'yes' : 'NO'].join('\t'))
  }
  fs.writeFileSync(path.join(__dirname, `verify-142-${course}.tsv`), out.join('\n') + '\n')
  console.log(`${course}: ${ok} of ${real.size} re-recorded clips serve the object the route returned`)
})()
