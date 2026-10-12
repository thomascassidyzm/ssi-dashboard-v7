// Read-only: per course, how many LEGOs have <4 USE and 0 USE phrases (job #184). Usage: node census-use.cjs <out.json> <course>...
'use strict'
const fs = require('fs')
const { client, selectAll } = require('./lib.cjs')
;(async () => {
  const [out, ...courses] = process.argv.slice(2)
  const res = {}
  for (const c of courses) {
    const legos = await selectAll('course_legos', 'seed_number,lego_index', (q) => q.eq('course_code', c))
    const use = await selectAll('course_practice_phrases', 'seed_number,lego_index', (q) => q.eq('course_code', c).eq('phrase_role', 'use'))
    const n = new Map(); for (const p of use) { const k = p.seed_number + ':' + p.lego_index; n.set(k, (n.get(k) || 0) + 1) }
    let lt4 = 0, zero = 0
    for (const l of legos) { const k = l.seed_number + ':' + l.lego_index, x = n.get(k) || 0; if (x < 4) lt4++; if (x === 0) zero++ }
    res[c] = { legos: legos.length, use: use.length, lt4, zero }
    console.error(c, JSON.stringify(res[c]))
  }
  fs.writeFileSync(out, JSON.stringify(res))
  process.exit(0)
})().catch((e) => { console.error(e.message); process.exit(1) })
