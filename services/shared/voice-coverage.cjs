/** Read-only clip-index coverage. No course/role restrictions on a clip hit. */
const { clipTextKey } = require('./clip-index.cjs')
const path = require('path')
const SUMMARY_PATH = process.env.VOICE_COVERAGE_FILE || '/home/tomcassidy/ssi-evidence/voice-coverage/summary.json'
const pct = (n, d) => d ? Math.round(n * 10000 / d) / 100 : null

/**
 * THE ONE COVERAGE COUNT (design v2.1 §5, job #258). Every coverage figure a
 * tool or page shows is this function's output; a second count elsewhere is
 * drift. A line is a distinct (language, clipTextKey) pair a course's authored
 * rounds need on one side. A voice holds a line when the index has a playable,
 * speech-check-unfailed clip of it in that voice, in any course or role.
 *
 * Bands: a line belongs to the FIRST band whose rounds need it, so a line
 * needed in seed 3 and again in seed 400 counts once, in seeds 1-100.
 *
 * OFFERABLE (the design's default, no ruling yet): a voice may sit on a
 * course's learner menu once it holds every line of seeds 1-100 and at least
 * 80% of the rest. A course with no seeds 1-100 lines offers nothing.
 */
const OFFERABLE = { firstSeeds: 100, firstShare: 1, restShare: 0.8 }

/** A generated round names its seed by id ('S0042'); the bands need its number. */
const seedOf = round => { const m = /^S(\d+)/.exec(String(round.seedId || round.legoId || '')); return m ? Number(m[1]) : null }

/** Index entries are a Map voiceId -> 'human'|'tts', or a bare Set of voices (origin unknown). */
const originOf = (entry, voiceId) => entry instanceof Map ? entry.get(voiceId) : undefined

function neededLines(rounds) {
  const all = new Set(), first = new Set()
  const requirements = rounds.map(r => {
    const keys = new Set(r.texts.map(t => t == null || !String(t).trim() ? null : clipTextKey(t)))
    for (const k of keys) if (k != null) {
      all.add(k)
      if (r.seed != null && r.seed <= OFFERABLE.firstSeeds) first.add(k)
    }
    return { number: r.number, seed: r.seed, keys }
  })
  return { all, first, requirements }
}

function summariseSide({ language, rounds, voices, cast, index }) {
  const { all: needed, first, requirements } = neededLines(rounds)
  const restNeeded = needed.size - first.size
  // A round with a line that has no text cannot be verified for ANY voice, so it can never count
  // as held: a missing line in seeds 1-100 blocks offering outright, and one further on counts as
  // a line the voice lacks (it is added to the denominator of the rest share).
  const firstMissing = requirements.filter(r => r.keys.has(null) && r.seed != null && r.seed <= OFFERABLE.firstSeeds).length
  const restMissing = requirements.filter(r => r.keys.has(null)).length - firstMissing
  const rows = [...new Set([...voices, ...cast])].sort().map(voiceId => {
    const entry = key => key != null ? index.get(`${language}\u001f${key}`) : undefined
    const has = key => !!entry(key)?.has(voiceId)
    let heldPairs = 0, humanPairs = 0, firstHeld = 0, completeRounds = 0, firstBreak = null
    for (const key of needed) if (has(key)) {
      heldPairs++
      if (originOf(entry(key), voiceId) === 'human') humanPairs++
      if (first.has(key)) firstHeld++
    }
    for (const r of requirements) {
      if (r.keys.size && [...r.keys].every(has)) completeRounds++
      else if (firstBreak == null) firstBreak = r.number
    }
    const restHeld = heldPairs - firstHeld
    const restTotal = restNeeded + restMissing
    const offerable = first.size > 0 && firstMissing === 0 && firstHeld >= first.size * OFFERABLE.firstShare
      && (restTotal === 0 || restHeld >= restTotal * OFFERABLE.restShare)
    return { voiceId, isCast: cast.includes(voiceId), heldPairs, humanPairs, ttsPairs: heldPairs - humanPairs,
      pairPercent: pct(heldPairs, needed.size),
      seeds1to100: { held: firstHeld, percent: pct(firstHeld, first.size) },
      rest: { held: restHeld, percent: pct(restHeld, restNeeded) },
      offerable, completeRounds, roundPercent: pct(completeRounds, rounds.length), firstBreak }
  })
  const alternatives = rows.filter(r => !r.isCast).sort((a, b) => b.completeRounds - a.completeRounds || b.heldPairs - a.heldPairs || a.voiceId.localeCompare(b.voiceId))
  return { language, neededPairs: needed.size, seeds1to100Pairs: first.size, restPairs: restNeeded, rounds: rounds.length,
    missingTextRounds: requirements.filter(r => r.keys.has(null)).length,
    bestAlternative: alternatives[0]?.voiceId || null,
    offerable: rows.filter(r => r.offerable).map(r => r.voiceId), voices: rows }
}

/**
 * By language, by voice: of every distinct line any course needs in this
 * language, as prompt or as model, how many each voice holds, human vs TTS,
 * and how many of that voice's clips in the language fail the speech check.
 * `needs` is Map language -> { lines: Set of text keys, courses: Set }.
 */
function summariseLanguages({ needs, voices, index, flagged = new Map() }) {
  return [...needs].sort(([a], [b]) => a.localeCompare(b)).map(([language, { lines, courses }]) => {
    const tally = new Map()
    for (const voiceId of voices.get(language) || []) tally.set(voiceId, { held: 0, human: 0 })
    for (const key of lines) {
      const entry = index.get(`${language}\u001f${key}`)
      if (!entry) continue
      for (const voiceId of entry instanceof Map ? entry.keys() : entry) {
        if (!tally.has(voiceId)) tally.set(voiceId, { held: 0, human: 0 })
        const t = tally.get(voiceId)
        t.held++
        if (originOf(entry, voiceId) === 'human') t.human++
      }
    }
    const rows = [...tally].map(([voiceId, t]) => ({ voiceId, heldLines: t.held, humanLines: t.human, ttsLines: t.held - t.human,
      percent: pct(t.held, lines.size), flaggedClips: flagged.get(`${language}\u001f${voiceId}`) || 0 }))
      .sort((a, b) => b.heldLines - a.heldLines || a.voiceId.localeCompare(b.voiceId))
    return { language, neededLines: lines.size, courses: [...courses].sort(), voices: rows }
  })
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
module.exports = { summariseSide, summariseLanguages, neededLines, seedOf, OFFERABLE, snapshotReader, writeAtomic, SUMMARY_PATH }
