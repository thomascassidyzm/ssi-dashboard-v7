#!/usr/bin/env node
/**
 * assemble-ladder.cjs — which span of which take becomes which ladder rung.
 * DRY RUN ALWAYS: it plans and verifies, and cuts nothing.
 *
 *   node tools/recording/health-seed-ladders/assemble-ladder.cjs --pilot
 *   node tools/recording/health-seed-ladders/assemble-ladder.cjs --pilot --from-store
 *   node tools/recording/health-seed-ladders/assemble-ladder.cjs --seed HG32 --takes <dir>
 *
 * WITHOUT AUDIO it prints the PLAN — every rung, and the span of the take it is
 * cut from. That needs no recording to exist, which is the point: the plan is
 * reviewable before anybody opens a microphone.
 *
 * --from-store is the REAL path once the takes land. The estate already measures
 * the seams: tools/slice-take-g.cjs reads the recorded Take G, finds the gaps
 * with ffmpeg silencedetect and writes each unit's target_start_ms /
 * target_end_ms into listening_pod_sentences.atom_map_fine. This reads those
 * spans back and says what each ladder rung is in milliseconds — or fails
 * loudly, naming the sentence, when a unit has no span (the Take G has not been
 * recorded, or the slicer refused it) or the unit count disagrees with the
 * declared split.
 *
 * --takes <dir> is the LOCAL path, for a take that is not in the store yet:
 * `<code>.gapped.mp3` and `<code>.natural.mp3` go through
 * services/voice-engine/align.cjs#alignTakePair. THE CHUNK-COUNT GATE IS
 * align.cjs's own — mapVoicedToChunks returns
 * {ok:false, reason:'chunk-count-mismatch'} and this exits non-zero naming the
 * seed. A take that yields the wrong number of voiced regions is a re-record,
 * never a guessed chunk map; the whole quarry idea rests on that refusal.
 *
 * NOTHING HERE IS SPLICED. Every LEAN rung is a contiguous span of ONE take
 * (ladder.cjs asserts it), so services/voice-engine/splicer.cjs is not on this
 * path — which is the same model slice-take-g.cjs states for the TTS ladder:
 * "any fusion window is a contiguous slice of this ONE take".
 *
 * `--emit <dir>` is deliberately NOT implemented. Cutting audio is an approval
 * gate, and a dry-run tool that can quietly become a render tool is how that
 * gate gets walked past.
 */
const path = require('path')
const fs = require('fs')

const { planLadder, takesFor, expectedChunks } = require('./ladder.cjs')
const SEEDS = require('./health-seeds.json')

function parseArgs(argv) {
  const out = { seeds: [], takesDir: null, pilot: false, all: false, json: false, fromStore: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--pilot') out.pilot = true
    else if (a === '--all') out.all = true
    else if (a === '--json') out.json = true
    else if (a === '--from-store') out.fromStore = true
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

/**
 * Read back the spans slice-take-g.cjs measured, and say what each rung is.
 *
 * Fails loudly and names the sentence in the two cases that matter: a unit with
 * no span (no Take G recorded, or the slicer refused the take) and a unit count
 * that disagrees with the declared split. Neither is guessed around.
 */
async function verifyFromStore(seeds) {
  require('dotenv').config()
  const { createClient } = require('@supabase/supabase-js')
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const POD_ID = 'cym_n_for_eng:health-ladder-pilot'
  const { data, error } = await db
    .from('listening_pod_sentences')
    .select('id, speaker, target_text, atom_map_fine, takeg_audio_ids')
    .eq('pod_id', POD_ID)
  if (error) throw new Error(`pod sentence read failed: ${error.message}`)

  const wanted = new Set(seeds.map((s) => s.code.toLowerCase()))
  const rows = (data || []).filter((r) => wanted.has(String(r.id).split(':')[2]))
  if (!rows.length) {
    console.error(`\nNo staged sentences found in ${POD_ID}. Run stage-pilot-pod.cjs --apply first.`)
    process.exit(1)
  }

  console.log(`\nReading measured spans from ${POD_ID} …`)
  const failures = []
  for (const row of rows) {
    const code = String(row.id).split(':')[2].toUpperCase()
    const seed = seeds.find((s) => s.code === code)
    const atoms = (row.atom_map_fine || []).filter((a) => a && a.kind !== 'note')
    if (atoms.length !== seed.chunks.length) {
      failures.push(`${row.id}: declares ${atoms.length} units, the split says ${seed.chunks.length}`)
      continue
    }
    const unmeasured = atoms.filter((a) => a.target_start_ms == null || a.target_end_ms == null)
    if (unmeasured.length) {
      const ids = Array.isArray(row.takeg_audio_ids) ? row.takeg_audio_ids : []
      failures.push(`${row.id}: ${unmeasured.length} of ${atoms.length} units have no span — ` +
        (ids.length ? 'a Take G exists, so run tools/slice-take-g.cjs (or it refused this take)' : 'no Take G has been recorded yet'))
      continue
    }
    console.log(`\n  ${row.id}  (${row.speaker})`)
    for (const r of planLadder(seed)) {
      if (r.source === 'natural-whole') { console.log(`    ${String(r.rung).padStart(2)}. the natural take, whole`); continue }
      const startMs = atoms[r.from].target_start_ms
      const endMs = atoms[r.to].target_end_ms
      console.log(`    ${String(r.rung).padStart(2)}. ${startMs}-${endMs}ms (${endMs - startMs}ms)  ${r.target}`)
    }
  }
  if (failures.length) {
    console.error(`\n${failures.length} sentence(s) cannot be assembled yet:`)
    for (const f of failures) console.error(`  x ${f}`)
    process.exit(1)
  }
  console.log(`\nAll ${rows.length} sentence(s) measured. Every rung is a contiguous span of one take.`)
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

  if (args.fromStore) return await verifyFromStore(seeds)

  if (!args.takesDir) {
    console.log(`\nNothing was measured: pass --from-store to read the spans tools/slice-take-g.cjs wrote,`)
    console.log(`or --takes <dir> to align local .gapped.mp3 / .natural.mp3 files.`)
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
