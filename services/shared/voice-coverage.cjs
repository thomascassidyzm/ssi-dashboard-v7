/** Read-only clip-index coverage. No course/role restrictions on a clip hit. */
const { clipTextKey } = require('./clip-index.cjs')
const path = require('path')
const SUMMARY_PATH = process.env.VOICE_COVERAGE_FILE || '/home/tomcassidy/ssi-evidence/voice-coverage/summary.json'
const pct = (n, d) => d ? Math.round(n * 10000 / d) / 100 : null

function summariseSide({ language, rounds, voices, cast, index }) {
  const needed = new Set()
  const requirements = rounds.map(r => {
    const keys = new Set(r.texts.map(t => t == null || !String(t).trim() ? null : clipTextKey(t)))
    for (const k of keys) if (k != null) needed.add(k)
    return { number: r.number, keys }
  })
  const rows = [...new Set([...voices, ...cast])].sort().map(voiceId => {
    const has = key => key != null && !!index.get(`${language}\u001f${key}`)?.has(voiceId)
    let heldPairs = 0, completeRounds = 0, firstBreak = null
    for (const key of needed) if (has(key)) heldPairs++
    for (const r of requirements) {
      if (r.keys.size && [...r.keys].every(has)) completeRounds++
      else if (firstBreak == null) firstBreak = r.number
    }
    return { voiceId, isCast: cast.includes(voiceId), heldPairs, pairPercent: pct(heldPairs, needed.size),
      completeRounds, roundPercent: pct(completeRounds, rounds.length), firstBreak }
  })
  const alternatives = rows.filter(r => !r.isCast).sort((a, b) => b.completeRounds - a.completeRounds || b.heldPairs - a.heldPairs || a.voiceId.localeCompare(b.voiceId))
  return { language, neededPairs: needed.size, rounds: rounds.length,
    missingTextRounds: requirements.filter(r => r.keys.has(null)).length,
    bestAlternative: alternatives[0]?.voiceId || null, voices: rows }
}

/** The generator reads a complete, preloaded snapshot. No PostgREST row cap,
 * offset queries against the DB, or silent read-error fallback in the generator.
 * Only the read vocabulary used by learning-script-generator is supported. */
function snapshotReader(tables) {
  return { from(table) {
    if (!Object.hasOwn(tables, table)) throw new Error(`Unloaded generator table: ${table}`)
    let rows = tables[table], orders = [], start = 0, end = Infinity
    const q = {
      select() { return q },
      eq(k, v) { rows = rows.filter(r => r[k] === v); return q },
      in(k, v) { const values = new Set(v); rows = rows.filter(r => values.has(r[k])); return q },
      gte(k, v) { rows = rows.filter(r => r[k] >= v); return q },
      not(k, op, v) { if (op !== 'is' || v !== null) throw new Error('Unsupported snapshot filter'); rows = rows.filter(r => r[k] != null); return q },
      order(k, opts = {}) { orders.push([k, opts.ascending !== false ? 1 : -1]); return q },
      range(a, b) { start = a; end = b + 1; return q },
      limit(n) { end = n; return q },
      then(resolve, reject) {
        try {
          const data = [...rows].sort((a, b) => {
            for (const [k, sign] of orders) { if (a[k] < b[k]) return -sign; if (a[k] > b[k]) return sign }
            return 0
          }).slice(start, end)
          return Promise.resolve({ data, error: null }).then(resolve, reject)
        } catch (e) { return Promise.reject(e).then(resolve, reject) }
      },
    }
    return q
  } }
}

function writeAtomic(file, value) {
  const fs = require('fs')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temp, JSON.stringify(value))
  fs.renameSync(temp, file)
}
module.exports = { summariseSide, snapshotReader, writeAtomic, SUMMARY_PATH }
