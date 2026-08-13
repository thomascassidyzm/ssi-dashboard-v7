#!/usr/bin/env node
/**
 * reverify-veracity-cache.cjs — replay the persisted verdict cache through the
 * CURRENT scoring rules and report (optionally write) the corrected verdicts.
 *
 * WHY THIS EXISTS. ~/.audio-veracity-verdicts.json is deliberately never
 * invalidated, and that is right: it is keyed on s3Key + expected text +
 * language, and mastered/<uuid>.mp3 is write-once, so a hit is always the answer
 * to the identical question (services/audio-reuse-planner.cjs, verifyPlanVeracity).
 *
 * But "the same question" is not "the same JUDGE". The cache stores the whole
 * decode, not just the verdict, so when a SCORING rule changes, every remembered
 * verdict can be recomputed from the transcript that is already sitting there —
 * no audio, no S3, no whisper, no cost. That is what this does. It is the cheap
 * half of a re-audit and it should be run after any change to verdictFromDecode.
 *
 * WHAT IT CANNOT DO: it cannot re-listen. If a DECODE is wrong — whisper misheard
 * the clip — replaying it re-derives the same wrong answer. This tool corrects
 * judgment, never perception. A clip whose classification actually matters still
 * has to be listened to.
 *
 * Usage:
 *   node tools/reverify-veracity-cache.cjs                     # dry run, prints the reclassification
 *   node tools/reverify-veracity-cache.cjs --samples 40        # show more worked examples
 *   node tools/reverify-veracity-cache.cjs --json out.json     # write the full per-entry log
 *   node tools/reverify-veracity-cache.cjs --apply             # write corrected verdicts back (backs up first)
 *   node tools/reverify-veracity-cache.cjs --cache <path>      # a different cache file
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const V = require('../services/audio-veracity.cjs')

const argv = process.argv.slice(2)
const flag = (name, fallback = null) => {
  const i = argv.indexOf(name)
  return i === -1 ? fallback : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true)
}
const APPLY = argv.includes('--apply')
const CACHE = flag('--cache') || process.env.AUDIO_VERACITY_CACHE_PATH
  || path.join(os.homedir(), '.audio-veracity-verdicts.json')
const SAMPLES = Number(flag('--samples', 12))
const JSON_OUT = flag('--json')

if (!fs.existsSync(CACHE)) {
  console.error(`No cache at ${CACHE}`)
  process.exit(1)
}
const cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'))
const keys = Object.keys(cache)

const changed = []          // verdict flipped
const unchanged = []
const unreplayable = []     // no stored decode — cannot be re-judged without listening

for (const k of keys) {
  const old = cache[k]
  // An entry that never carried its transcript cannot be re-judged. It is not a
  // pass and not a failure — it is a gap, and it is reported as one.
  if (old.decode === undefined || old.expected === undefined) { unreplayable.push({ key: k, old }); continue }
  const fresh = V.verdictFromDecode(old.decode, old.expected, old.language)
  const rec = {
    key: k,
    expected: old.expected,
    decode: old.decode,
    language: old.language,
    was: { pass: old.pass, reason: old.reason },
    now: { pass: fresh.pass, reason: fresh.reason, lastWordVia: fresh.lastWordVia || null },
    cer: fresh.cer,
  }
  if (old.pass !== fresh.pass || old.reason !== fresh.reason) changed.push(rec)
  else unchanged.push(rec)
}

const count = (rows, fn) => rows.filter(fn).length
const oldFailures = keys.filter(k => cache[k].pass === false)
const byReason = (list, pick) => {
  const o = {}
  for (const r of list) { const x = pick(r); o[x] = (o[x] || 0) + 1 }
  return Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]))
}

console.log(`cache            ${CACHE}`)
console.log(`entries          ${keys.length}`)
console.log(`replayable       ${keys.length - unreplayable.length}`)
if (unreplayable.length) console.log(`NOT REPLAYABLE   ${unreplayable.length}  (no stored transcript — these were NOT re-judged)`)
console.log('')
console.log(`recorded failures BEFORE   ${oldFailures.length}`)
console.log(`  by reason                ${JSON.stringify(byReason(oldFailures, k => cache[k].reason))}`)

const nowFail = [...changed, ...unchanged].filter(r => r.now.pass === false)
console.log(`recorded failures AFTER    ${nowFail.length}`)
console.log(`  by reason                ${JSON.stringify(byReason(nowFail, r => r.now.reason))}`)
console.log('')
console.log(`verdicts changed           ${changed.length}`)
console.log(`  fail -> pass             ${count(changed, r => r.was.pass === false && r.now.pass === true)}`)
console.log(`  pass -> fail             ${count(changed, r => r.was.pass === true && r.now.pass === false)}`)
console.log(`  reason changed only      ${count(changed, r => r.was.pass === r.now.pass)}`)

const collapsed = changed.filter(r => r.was.pass === false && r.now.pass === true)
if (collapsed.length) {
  console.log(`\n--- ${Math.min(SAMPLES, collapsed.length)} of ${collapsed.length} FALSE ALARMS, shown ---`)
  const stride = Math.max(1, Math.floor(collapsed.length / SAMPLES))
  for (let i = 0; i < collapsed.length && i / stride < SAMPLES; i += stride) {
    const r = collapsed[i]
    console.log(`  [${r.was.reason} -> ok${r.now.lastWordVia ? `, ${r.now.lastWordVia}` : ''}]`)
    console.log(`    script: ${JSON.stringify(r.expected)}`)
    console.log(`    heard : ${JSON.stringify(r.decode)}`)
  }
}

const stillFail = nowFail
if (stillFail.length) {
  console.log(`\n--- ${Math.min(SAMPLES, stillFail.length)} of ${stillFail.length} SURVIVING FAILURES, shown ---`)
  const stride = Math.max(1, Math.floor(stillFail.length / SAMPLES))
  for (let i = 0; i < stillFail.length && i / stride < SAMPLES; i += stride) {
    const r = stillFail[i]
    console.log(`  [${r.now.reason}]`)
    console.log(`    script: ${JSON.stringify(r.expected)}`)
    console.log(`    heard : ${JSON.stringify(r.decode)}`)
  }
}

if (JSON_OUT && typeof JSON_OUT === 'string') {
  fs.writeFileSync(JSON_OUT, JSON.stringify({
    cache: CACHE,
    entries: keys.length,
    unreplayable: unreplayable.map(u => u.key),
    before: { failures: oldFailures.length, byReason: byReason(oldFailures, k => cache[k].reason) },
    after: { failures: nowFail.length, byReason: byReason(nowFail, r => r.now.reason) },
    changed,
    survivingFailures: stillFail,
  }, null, 2))
  console.log(`\nfull log -> ${JSON_OUT}`)
}

if (!APPLY) {
  console.log(`\nDRY RUN — nothing written. Re-run with --apply to correct the cache in place.`)
  process.exit(0)
}

// A backup BEFORE the write, because this is the only copy of ~5,000 decodes and
// they cost real whisper hours. The corrected file keeps every decode untouched;
// only the verdict fields are re-derived from it.
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backup = `${CACHE}.before-reverify-${stamp}`
fs.copyFileSync(CACHE, backup)

for (const r of changed) {
  const old = cache[r.key]
  const fresh = V.verdictFromDecode(old.decode, old.expected, old.language)
  cache[r.key] = {
    ...old,
    pass: fresh.pass,
    reason: fresh.reason,
    cer: fresh.cer,
    edits: fresh.edits,
    threshold: fresh.threshold,
    ...(fresh.lastWordVia ? { lastWordVia: fresh.lastWordVia } : {}),
    reverifiedAt: stamp,
  }
}
fs.writeFileSync(CACHE, JSON.stringify(cache, null, 0))
console.log(`\nAPPLIED — ${changed.length} verdicts corrected in ${CACHE}`)
console.log(`backup   ${backup}`)
