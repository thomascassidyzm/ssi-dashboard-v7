#!/usr/bin/env node
/**
 * Seeds tools/audio/intro-reuse/as-in-store.json from the RECORDS of the Tom-006 intro sweep (jobs #794 seeds 1-100
 * of deu/spa/fra/ita, #836 everything else across the 11 premium X_for_eng courses, 11-12 Oct 2026). No DB, no network:
 *   ops/794-tom006-intros/<course>.plan.json + <course>-ledger.jsonl
 *   ops/836-tom006-intros/<course>.plan.json, <course>.gaps.json + <course>-ledger.jsonl, <course>-gaps-ledger.jsonl
 * A plan row carries the LEGO's prompt (x), its as-in context (ctx), the Haiku score and the APPLIED keepAsIn; the
 * ledger maps each new intro text to the Tom-006 clip it was rendered/faded into (newId) — the clean second half.
 *   node tools/audio/intro-reuse/seed-store.cjs [--check]     (--check: rebuild in memory and say whether the file is current)
 */
const fs = require('fs'), path = require('path')
const { buildStore } = require('./as-in-store.cjs')
const ROOT = path.join(__dirname, '../../..')
const OUT = path.join(__dirname, 'as-in-store.json')
const SOURCES = [{ job: '#794', dir: 'ops/794-tom006-intros' }, { job: '#836', dir: 'ops/836-tom006-intros' }]

const readJsonl = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)) : []

function collect() {
  const records = [], seen = new Set(), perCourse = {}
  for (const { job, dir } of SOURCES) {
    const abs = path.join(ROOT, dir)
    for (const f of fs.readdirSync(abs).filter(n => /\.(plan|gaps)\.json$/.test(n)).sort()) {
      const course = f.replace(/\.(plan|gaps)\.json$/, ''), gaps = f.endsWith('.gaps.json')
      // text -> {newId, at}: the clip that intro text now lives in (render/swap/partial rows; legacy 'intent' too)
      const clip = new Map()
      for (const e of readJsonl(path.join(abs, `${course}${gaps ? '-gaps' : ''}-ledger.jsonl`)))
        if (e.text && e.newId && ['swap', 'partial', 'render', 'intent'].includes(e.kind) && !clip.has(e.text)) clip.set(e.text, { id: e.newId, at: e.at })
      for (const o of JSON.parse(fs.readFileSync(path.join(abs, f), 'utf8'))) {
        const x = o.x || o.known; if (!x || !o.newText) continue   // hand-written / unparsed intros carry no prompt
        const id = `${course}:${o.lego_id}`; if (seen.has(id)) continue; seen.add(id)
        const c = clip.get(o.newText)
        records.push({ x, ctx: o.ctx || null, keep: !!o.keepAsIn, score: o.score ?? null, course, lego_id: o.lego_id, job, gradedAt: c ? c.at.slice(0, 10) : null, clipId: c ? c.id : null, text: o.newText })
        const pc = perCourse[course] || (perCourse[course] = { hadContext: 0, kept: 0, scored: 0 })
        if (o.ctx) { pc.hadContext++; if (o.keepAsIn) pc.kept++; if (o.score != null) pc.scored++ }
      }
    }
  }
  return { records, perCourse }
}

if (require.main === module) {
  const { records, perCourse } = collect()
  const store = buildStore(records)
  store.seededFrom = SOURCES.map(s => s.dir)
  store.perCourse = perCourse
  store.records = records.length
  const json = JSON.stringify(store, null, 0)
  if (process.argv.includes('--check')) { const cur = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8'); console.log(cur === json ? 'current' : 'STALE'); process.exit(cur === json ? 0 : 1) }
  fs.writeFileSync(OUT, json)
  const e = Object.values(store.entries)
  console.log(JSON.stringify({ records: records.length, keys: store.keys, keep: e.filter(x => x.decision === 'keep').length, strip: e.filter(x => x.decision === 'strip').length,
    conflicts: store.conflicts, withBareClip: e.filter(x => x.bare).length, withCtxClip: e.filter(x => Object.keys(x.ctx).length).length, perCourse }))
}
module.exports = { collect }
