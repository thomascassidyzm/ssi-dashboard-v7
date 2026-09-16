#!/usr/bin/env node
/**
 * assemble-ladder.cjs — DRY RUN BY DEFAULT. Turn a seed's two takes into its
 * LEAN ladder, and fail loudly the moment the gapped read does not carry the
 * joints the split says it has.
 *
 *   node tools/recording/health-seed-ladders/assemble-ladder.cjs --pilot
 *   node tools/recording/health-seed-ladders/assemble-ladder.cjs --seed HG19 --takes <dir>
 *
 * WITHOUT --takes it prints the PLAN: which span of which take becomes which
 * rung, for every seed asked for. That is the whole assembly plan and it needs
 * no audio to exist, which is the point — the plan is reviewable before anybody
 * opens a microphone.
 *
 * WITH --takes <dir> it additionally ALIGNS the real takes it finds there
 * (`<code>.gapped.mp3` and `<code>.natural.mp3`), through
 * services/voice-engine/align.cjs, and reports the measured span of every rung
 * in milliseconds. THE CHUNK-COUNT GATE IS align.cjs's OWN: mapVoicedToChunks
 * returns {ok:false, reason:'chunk-count-mismatch', expectedCount, detectedCount}
 * and this tool exits NON-ZERO naming the seed. A take that yields the wrong
 * number of voiced regions is a re-record, never a guessed chunk map — the
 * whole quarry idea rests on that refusal.
 *
 * It writes nothing and cuts nothing. Cutting is `--emit <dir>`, which is
 * deliberately NOT implemented here: rendering audio is an approval gate
 * (CLAUDE.md), and a dry-run tool that can quietly become a render tool is how
 * that gate gets walked past.
 */
const path = require('path')
const fs = require('fs')

const { planLadder, takesFor, expectedChunks } = require('./ladder.cjs')
const SEEDS = require('./health-seeds.json')

function parseArgs(argv) {
  const out = { seeds: [], takesDir: null, pilot: false, all: false, json: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--pilot') out.pilot = true
    else if (a === '--all') out.all = true
    else if (a === '--json') out.json = true
    else if (a === '--seed') out.seeds.push(String(argv[++i] || '').toUpperCase())
    else if (a === '--takes') out.takesDir = argv[++i]
    else if (a === '--emit') {
      console.error('--emit is not implemented. Cutting audio is an approval gate; this tool plans and verifies only.')
      process.exit(2)
    } else {
      console.error(`unknown argument: ${a}`)
      process.exit(2)
    }
  }
  return out
}

function selectSeeds(args) {
  if (args.seeds.length) {
    return args.seeds.map((code) => {
      const s = SEEDS.find((x) => x.code === code)
      if (!s) { console.error(`no such seed: ${code}`); process.exit(2) }
      return s
    })
  }
  if (args.all) return SEEDS
  return SEEDS.filter((s) => s.batch === 1)   // the pilot, and the default
}

function printPlan(seed) {
  const rungs = planLadder(seed)
  const takes = takesFor(seed)
  console.log(`\n${seed.code} — ${seed.chunks.length} chunk(s), ${rungs.length} rung(s), ${takes.length} take(s) per voice: ${takes.join(' + ')}`)
  console.log(`  ${seed.welsh}`)
  for (const c of seed.chunks) console.log(`    · ${c.target}`)
  for (const r of rungs) {
    const where = r.source === 'natural-whole'
      ? 'the natural take, WHOLE (never cut)'
      : `natural take, span chunks ${r.from + 1}..${r.to + 1}`
    console.log(`  ${String(r.rung).padStart(2)}. [${r.kind}] ${where}`)
    console.log(`      ${r.target}`)
  }
}

async function alignSeed(seed, takesDir) {
  const align = require(path.resolve(__dirname, '../../../services/voice-engine/align.cjs'))
  const gapped = path.join(takesDir, `${seed.code}.gapped.mp3`)
  const natural = path.join(takesDir, `${seed.code}.natural.mp3`)
  const expected = expectedChunks(seed)

  if (expected.length <= 1) {
    if (!fs.existsSync(natural)) throw new Error(`${seed.code}: natural take missing (${natural})`)
    console.log(`  ${seed.code}: single chunk — natural take only, nothing to align.`)
    return
  }
  if (!fs.existsSync(gapped)) throw new Error(`${seed.code}: gapped take missing (${gapped})`)
  if (!fs.existsSync(natural)) throw new Error(`${seed.code}: natural take missing (${natural})`)

  const res = await align.alignTakePair({ slowPath: gapped, naturalPath: natural, expectedChunks: expected })
  if (!res.ok) {
    const f = res.failure || {}
    throw new Error(
      `${seed.code}: ALIGNMENT FAILED at ${f.stage || 'unknown'} — ${f.reason || 'no reason given'}` +
      (f.expectedCount !== undefined ? ` (expected ${f.expectedCount} chunks, detected ${f.detectedCount})` : '') +
      `\n    The gapped read does not carry the joints the #991 split says this sentence has.` +
      `\n    That is a re-record, not a chunk map to guess at.`)
  }
  console.log(`  ${seed.code}: aligned — cadence ${res.cadence}, natural boundaries ${res.naturalMethod}`)
  for (const r of planLadder(seed)) {
    if (r.source === 'natural-whole') { console.log(`    ${String(r.rung).padStart(2)}. whole take`); continue }
    const startMs = res.chunks[r.from].startMs
    const endMs = res.chunks[r.to].endMs
    console.log(`    ${String(r.rung).padStart(2)}. ${startMs}–${endMs}ms (${endMs - startMs}ms)  ${r.target}`)
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const seeds = selectSeeds(args)

  if (args.json) {
    console.log(JSON.stringify(seeds.map((s) => ({ code: s.code, takes: takesFor(s), rungs: planLadder(s) })), null, 2))
    return
  }

  console.log(`DRY RUN — plan only. Nothing is recorded, cut, written or sent.`)
  console.log(`${seeds.length} seed(s): ${seeds.map((s) => s.code).join(', ')}`)
  for (const s of seeds) printPlan(s)

  if (!args.takesDir) {
    console.log(`\nNo --takes <dir> given, so nothing was aligned. Re-run with --takes once the booth takes land.`)
    return
  }
  console.log(`\nAligning takes in ${args.takesDir} …`)
  const failures = []
  for (const s of seeds) {
    try { await alignSeed(s, args.takesDir) } catch (err) { failures.push(err.message) }
  }
  if (failures.length) {
    console.error(`\n${failures.length} of ${seeds.length} seed(s) did not align:`)
    for (const f of failures) console.error(`  ✗ ${f}`)
    process.exit(1)
  }
  console.log(`\nAll ${seeds.length} seed(s) aligned. Every rung is a contiguous span of one take; nothing needs the splicer.`)
}

main().catch((err) => { console.error(err.stack || err.message); process.exit(1) })
