// Read-only (job #184): LEGOs with <4 good USE phrases (rows still flagged bad don't count) as re-decomposition candidates.
'use strict'
const fs = require('fs')
const { client, selectAll } = require('./lib.cjs')
;(async () => {
  const home = process.env.HOME + '/ssi-evidence/job184/'
  const bad = new Set(fs.readdirSync(home).filter((f) => f.endsWith('.f0.log')).flatMap((f) => fs.readFileSync(home + f, 'utf8').split('\n').filter((l) => /ERROR — DEBUT/.test(l)).map((l) => l.split(':').slice(0, 2).join(':'))))
  const courses = fs.readFileSync(home + 'courses.txt', 'utf8').split('\n').filter(Boolean)
  const summary = [], body = []
  let T = { lt4: 0, zero: 0, seeds: 0 }
  for (const c of courses) {
    const legos = await selectAll('course_legos', 'seed_number,lego_index,known_text,target_text', (q) => q.eq('course_code', c).order('seed_number').order('lego_index'))
    const use = await selectAll('course_practice_phrases', 'id,seed_number,lego_index', (q) => q.eq('course_code', c).eq('phrase_role', 'use'))
    const n = new Map(); for (const p of use) { if (bad.has(p.id)) continue; const k = p.seed_number + ':' + p.lego_index; n.set(k, (n.get(k) || 0) + 1) }
    const seeds = new Map()
    for (const l of legos) { if (!seeds.has(l.seed_number)) seeds.set(l.seed_number, []); seeds.get(l.seed_number).push(l) }
    let lt4 = 0, zero = 0, ns = 0; const out = []
    for (const [s, ls] of seeds) {
      const short = ls.filter((l) => (n.get(s + ':' + l.lego_index) || 0) < 4)
      if (!short.length) continue
      ns++
      out.push(`**S${String(s).padStart(4, '0')}** split: ` + ls.map((l) => `L${l.lego_index} ${l.target_text} = ${l.known_text}`).join(' | '))
      for (const l of short) { const x = n.get(s + ':' + l.lego_index) || 0; lt4++; if (!x) zero++; out.push(`- SHORT L${l.lego_index} ${l.target_text}: ${x} good USE`) }
    }
    summary.push(`${c} | ${ns} | ${lt4} | ${zero}`); T.lt4 += lt4; T.zero += zero; T.seeds += ns
    body.push(`\n## ${c} (${ns} seeds, ${lt4} short LEGOs, ${zero} with 0)\n\n` + out.join('\n'))
  }
  fs.writeFileSync(process.env.CS_SCRATCH + '/redecomp-summary.md', `# Re-decomposition candidates: summary\n\nLEGOs with fewer than 4 good USE phrases (bad rows still stuck do not count). Total: ${T.seeds} seeds, ${T.lt4} short LEGOs, ${T.zero} with 0 USE.\n\ncourse | seeds | short LEGOs | of which 0 USE\n---|---|---|---\n` + summary.join('\n'))
  fs.writeFileSync(process.env.CS_SCRATCH + '/redecomp-full.md', `# Re-decomposition candidates: every seed with a short LEGO\n` + body.join('\n'))
  console.error(JSON.stringify(T), 'bad stuck', bad.size)
  process.exit(0)
})().catch((e) => { console.error(e.message); process.exit(1) })
