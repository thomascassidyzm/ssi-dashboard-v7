#!/usr/bin/env node
// Provenance of a list of clip ids: counts grouped by origin and by voice_id, and every id that is
// not (origin = 'human' AND voice_id names human_aran_eng). Read-only, by primary key only.
// Usage: node tools/voice/clip-provenance.cjs <ids-file> [--voice human_aran_eng] [--out file.json]
// Run against the nightly copy: set -a; . ~/ssi-restore/qa-copy.env; set +a
const fs = require('fs')
const { connect, clipsById, UUID } = require('../../services/shared/agent-db.cjs')

function summarise(ids, rows, voice) {
  const byId = new Map(rows.map((r) => [r.id, r]))
  const count = (k) => rows.reduce((m, r) => ((m[r[k] ?? 'null'] = (m[r[k] ?? 'null'] || 0) + 1), m), {})
  const missing = ids.filter((i) => !byId.has(i))
  const bad = rows.filter((r) => r.origin !== 'human' || r.voice_id !== voice)
  return {
    wanted: ids.length, found: rows.length, missing,
    byOrigin: count('origin'), byVoice: count('voice_id'), byCourse: count('course_code'),
    totalSeconds: Math.round(rows.reduce((s, r) => s + (r.duration_ms || 0), 0) / 1000),
    notVerified: bad.map((r) => ({ id: r.id, origin: r.origin, voice_id: r.voice_id, course_code: r.course_code, text: r.text })),
    allVerified: !missing.length && !bad.length,
  }
}

async function main() {
  const a = process.argv.slice(2)
  const flag = (n, d) => (a.includes(n) ? a[a.indexOf(n) + 1] : d)
  const ids = [...new Set(fs.readFileSync(a[0], 'utf8').split(/\s+/).filter((x) => UUID.test(x)))]
  const pg = await connect()
  try {
    const out = summarise(ids, await clipsById(pg, ids), flag('--voice', 'human_aran_eng'))
    if (flag('--out')) fs.writeFileSync(flag('--out'), JSON.stringify(out, null, 1))
    console.log(JSON.stringify({ ...out, notVerified: out.notVerified.length, missing: out.missing.length }, null, 1))
  } finally { await pg.end() }
}
module.exports = { summarise }
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1) })
