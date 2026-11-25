#!/usr/bin/env node
'use strict'
/**
 * analyse.cjs — the DATABASE-FREE half of the nightly read-only course scan (cs #237·AL; Kai approved 24 Nov 2026 17:02Z:
 * "Yes on the other live courses being scanned"). It reads DUMP FILES only; scan.cjs makes them from the nightly QA copy.
 *
 *   node tools/nightly-course-scan/analyse.cjs <dump.json> [...]   hits + a reading sheet beside each dump
 *   node tools/nightly-course-scan/analyse.cjs --calibrate        every known positive in calibration.json must fire
 *                                                                  (the dumps must exist: scan.cjs --calibrate makes them)
 * Writes beside the dump (out of the repo tree, tools/lib/evidence-path.cjs):
 *   <course>.hits.json   every candidate, by family
 *   <course>.sheet.md    the READING SHEET for the night worker: per family the candidate count and a deterministic sample
 *                        with its seed. Candidate counts are for the worker's sampling, NEVER for Kai's table: Kai sees
 *                        only families whose hits a person read, with an estimate of how many are real.
 * Detectors: the #447 kit's detect.cjs (reused unchanged; it too reads only a dump file) plus ./detectors.cjs (what this
 * scan adds). Nothing here writes to any database, renders anything or fixes anything.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')
const R = path.resolve(__dirname, '../..')
const { evidencePath } = require(R + '/tools/lib/evidence-path.cjs')
const DET = require('./detectors.cjs')
const KIT = path.join(R, 'ops/paid-cleanup-scan-447') // detect.cjs only: it reads a dump file, never a database

// Which families answer which of Kai's five questions (brief, 24 Nov). Everything else detect.cjs finds is ignored here.
const CATEGORY = {
  untaught_target: '1 untaught word (target)', untaught_known: '1 untaught word (known)',
  gloss_absent: '2 English does not say what the target says', qmark_mismatch: '2 English does not say what the target says',
  digits_mismatch: '2 English does not say what the target says',
  garble_tail: '3 garbled generator line', garble_doubled: '3 garbled generator line', garble_punct: '3 garbled generator line',
  garble_script: '3 garbled generator line', same_both: '3 garbled generator line', tag_phrase: '3 garbled generator line',
  empty_audio: '4 silent slot', silent_lego: '4 silent slot',
  wrong_side: '3 wrong-language text (Breton/French on the wrong side)', zut_lego: '6 ZUT (one known, two targets)', zut_use: '6 ZUT (one known, two targets)', dup_rows: '3 duplicate row in one basket',
  lego_absent_absent: '5 LEGO not in its own phrase', lego_absent_near: '5 LEGO not in its own phrase (inflected / near form)',
}
const SAMPLE = 20

function copyState() {
  try { return JSON.parse(fs.readFileSync(path.join(os.homedir(), 'ssi-restore', 'copy-state.json'), 'utf8')) } catch { return {} }
}

function node(args) {
  const r = spawnSync(process.execPath, args, { cwd: R, encoding: 'utf8', maxBuffer: 1 << 28 })
  if (r.status !== 0) throw new Error(`${path.basename(args[0])} failed (${r.status}): ${(r.stderr || r.stdout || '').slice(-600)}`)
  return r.stdout
}

function dirFor() {
  const st = copyState()
  if (!st.db) throw new Error('no ~/ssi-restore/copy-state.json: the nightly QA copy is missing — report it, never read live')
  return { st, dir: path.dirname(evidencePath(`ops/nightly-course-scan/${st.db}/x`)) }
}
const dumpPath = (course) => path.join(dirFor().dir, `${course}.dump.json`)

// Deterministic sample: spread through the course (every k-th hit), so a sample is not just the first seeds.
function sample(list, n = SAMPLE) {
  if (list.length <= n) return list
  const step = list.length / n
  return Array.from({ length: n }, (_, i) => list[Math.floor(i * step)])
}

function analyse(dumpF) {
  const dir = path.dirname(dumpF)
  const D = JSON.parse(fs.readFileSync(dumpF, 'utf8')), course = D.course
  const st = { db: D.copy_db, built: D.copy_built }
  if (!D.seeds || !D.seeds.length) throw new Error(`${course}: the copy holds no seeds for it`)
  const kitF = path.join(dir, `${course}.kit.json`)
  node([path.join(KIT, 'detect.cjs'), dumpF, kitF, path.join(KIT, 'patterns.json')])
  const kit = JSON.parse(fs.readFileSync(kitF, 'utf8'))
  const mine = DET.run(D)
  const hits = { ...mine.hits }
  for (const k of ['empty_audio', 'qmark_mismatch', 'same_both', 'tag_phrase', 'zut_lego', 'zut_use', 'dup_rows']) if (kit.hits[k]) hits[k] = kit.hits[k]
  for (const k of Object.keys(kit.hits)) if (k.startsWith('lex:')) { hits[k] = kit.hits[k]; CATEGORY[k] = '2 English does not say what the target says (lexical pattern)' }
  const out = { course, copy_db: st.db, copy_built: st.built, scanned_at: new Date().toISOString(), coverage: kit.coverage, notes: mine.notes,
    counts: Object.fromEntries(Object.entries(hits).map(([k, v]) => [k, v.length])), hits }
  fs.writeFileSync(path.join(dir, `${course}.hits.json`), JSON.stringify(out, null, 1))

  const seedText = new Map(D.seeds.map((s) => [s.n, `${s.known} | ${s.target}`]))
  const L = [`# Reading sheet — ${course} (CANDIDATES, not findings)`, '',
    `Copy ${st.db} built ${st.built}; scanned ${out.scanned_at}. ${kit.coverage.seeds} seeds, ${kit.coverage.new_legos} new LEGOs, ${kit.coverage.played_rows} played rows.`,
    ...mine.notes.map((n) => `- ${n}`), '',
    'Read every sampled row by hand against the canon before anything reaches Kai. Kai\'s table carries only families you read,',
    'with real examples and your estimate of how many candidates are real (e.g. "about 14 of 20 sampled are real").', '']
  const fams = Object.keys(hits).sort((a, b) => (CATEGORY[a] || 'z').localeCompare(CATEGORY[b] || 'z'))
  for (const k of fams) {
    const list = hits[k]
    L.push(`## ${k} — ${CATEGORY[k] || 'other'} — ${list.length} candidates (sample ${Math.min(SAMPLE, list.length)})`, '')
    for (const h of sample(list)) {
      const ctx = h.seed != null && seedText.has(h.seed) ? `  \n  seed ${h.seed}: ${seedText.get(h.seed)}` : ''
      const rest = Object.entries(h).filter(([x]) => !['seed', 'sample'].includes(x)).map(([x, v]) => `${x}=${typeof v === 'string' ? v : JSON.stringify(v)}`).join(' · ')
      L.push(`- ${rest}${ctx}`)
      if (h.sample) for (const r of h.sample.slice(0, 15)) L.push(`  - ${r.id} [${r.lego} ${r.lego_target}] ${r.known} | ${r.target}`)
    }
    L.push('')
  }
  fs.writeFileSync(path.join(dir, `${course}.sheet.md`), L.join('\n'))
  console.log(`${course}: ${JSON.stringify(out.counts)} -> ${path.join(dir, course + '.sheet.md')}`)
  return out
}

function calibrate() {
  const C = JSON.parse(fs.readFileSync(path.join(__dirname, 'calibration.json'), 'utf8'))
  const cache = new Map(); let fail = 0
  for (const c of C.positives) {
    let out = cache.get(c.course)
    if (!out) { const f = dumpPath(c.course); if (!fs.existsSync(f)) { console.log(`MISSING DUMP ${c.course} (run scan.cjs --calibrate)`); fail++; continue } out = analyse(f); cache.set(c.course, out) }
    const list = out.hits[c.family] || []
    const hit = list.find((h) => (!c.id || h.id === c.id || String(h.id).startsWith(c.id)) && (!c.match || new RegExp(c.match, 'u').test(JSON.stringify(h))))
    const verdict = hit ? 'PASS' : 'FAIL'
    if (!hit) fail++
    console.log(`${verdict} ${c.family} ${c.course} ${c.id || ''} ${c.match || ''} — ${c.why}`)
  }
  console.log(fail ? `${fail} calibration(s) FAILED` : 'all calibrations fired')
  process.exit(fail ? 1 : 0)
}

const a = process.argv.slice(2)
try {
  if (a[0] === '--calibrate') calibrate()
  else if (a.length) for (const f of a) analyse(f)
  else { console.error('usage: analyse.cjs <dump.json>... | --calibrate'); process.exit(2) }
} catch (e) { console.error(`analyse: ${e.message}`); process.exit(1) }
