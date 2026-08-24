#!/usr/bin/env node
/**
 * audio-repair-campaign — repairs a large flagged backlog over days, in the order that
 * costs a learner least, and survives being killed.
 *
 * WHY THIS EXISTS. `propose` + `accept` handle a queue you can hold in your head. The
 * deu_for_eng tail backlog is 7,961 clips and roughly 40-48 hours of wall clock — bounded
 * by whisper veracity, not by money. A run that long WILL be interrupted: the box is
 * shared, sessions end, machines reboot. Anything that has to be restarted from the
 * beginning after an interruption never finishes, so this checkpoints after every tranche
 * and re-reads its own checkpoint on start. Killing it is a supported operation.
 *
 * ── THE ORDER IS THE POINT ──────────────────────────────────────────────────────────
 * Not worst-first. Not cheapest-first. LEGO-first, then learner order, because those are
 * the two things that decide what a learner actually loses:
 *
 *   tier 1  LEGO introductions        a LEGO needs intro + voice 1 + voice 2, and short
 *   tier 2  LEGO target1 / target2    of that triple the player drops the LEGO, which
 *   tier 3  LEGO known side           drops its whole ROUND, and every later LEGO that
 *                                     was contingent on it. Course-breaking.
 *   tier 4  seed clips                the sentence pair itself.
 *   tier 5  practice-phrase clips     cosmetic beside a broken round.
 *
 * Within every tier, ascending seed number — so the repair front moves the way a learner
 * moves, and an interrupted campaign has always fixed a contiguous beginning rather than
 * a scatter. A partial campaign is therefore still a useful campaign, which is the whole
 * design goal.
 *
 * ── PACING ──────────────────────────────────────────────────────────────────────────
 * This box has 8 cores and is shared with course builds and other sweeps. The campaign
 * reads the 1-minute load average before each tranche and waits rather than piling on.
 * Fan-out does NOT speed these sweeps up — measured — it just makes everything late.
 *
 * ── WHAT IT WILL NOT DO ─────────────────────────────────────────────────────────────
 * Never deletes. Never overwrites an S3 object in place. Never renders without --spend.
 * Accepts only candidates the tail detector MEASURED clean — unmeasured is not clean —
 * and only through the machine-verified door, which stamps the history row so it can
 * never read as a clip a human heard. Every repair reverts with one command and every
 * superseded object stays in the bucket.
 *
 *   node tools/audio-repair-campaign.cjs deu_for_eng \
 *     --flagged docs/audio-qc-2026-08-06/deu-seeds300-tail-flagged.json \
 *     --checkpoint docs/audio-qc-2026-08-06/deu-campaign-checkpoint.json \
 *     --tranche 40 --concurrency 4 --max-load 26 \
 *     --spend --accept --authorised-by "Tom, 2026-08-06: LEGO-first, paced over days" \
 *     --actor overnight-qc-job
 *
 * Without --spend it plans and prints the order and stops, which is the honest default
 * for a tool whose full run costs money.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true })
const fs = require('fs')
const os = require('os')
const path = require('path')

const argv = process.argv.slice(2)
const COURSE = argv[0]
const flag = (n, d = null) => { const i = argv.indexOf('--' + n); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) }
const has = (n) => argv.includes('--' + n)
const num = (n, d) => { const v = flag(n); return v === null || v === true ? d : Number(v) }

if (!COURSE || has('help')) {
  console.error('usage: audio-repair-campaign.cjs <course> --flagged <json> --checkpoint <json> [--tranche N] [--concurrency N] [--max-load N] [--max-tranches N] [--spend --accept --authorised-by "..." --actor NAME]')
  process.exit(argv.length ? 0 : 1)
}

const FLAGGED = flag('flagged') || die('need --flagged <scan json>')
const CHECKPOINT = flag('checkpoint') || die('need --checkpoint <file>')
const TRANCHE = num('tranche', 40)
const CONCURRENCY = num('concurrency', 4)
const MAX_LOAD = num('max-load', 26)
const MAX_TRANCHES = num('max-tranches', Infinity)
// Stop after a given tier. Tiers 1-4 are course-critical (a broken LEGO costs a whole
// round); tier 5 is practice phrases, which are cosmetic beside that. Splitting on the
// tier rather than on a tranche count means the boundary is a statement about what a
// learner loses, not an arithmetic accident.
const MAX_TIER = num('max-tier', 5)
const SPEND = has('spend')
const ACCEPT = has('accept')
const AUTHORISED_BY = flag('authorised-by')
const ACTOR = flag('actor', 'audio-repair-campaign')

function die (m) { console.error(m); process.exit(1) }
if (SPEND && ACCEPT && !AUTHORISED_BY) {
  die('--accept refuses without --authorised-by "<who authorised this, and to do what>".\nNobody will have listened to these clips; the history row has to say whose decision it was.')
}

const repair = require('../services/audio-repair.cjs')
const tier2 = require('../services/audio-intelligence/tiers/tier2-edge-shape.cjs')
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(
  (process.env.SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_KEY || '').trim(),
  { auth: { persistSession: false, autoRefreshToken: false } })

/**
 * Where each flagged clip sits in the course, and therefore what a learner loses if it
 * stays broken. Read from the holder tables rather than guessed from the clip's `role`:
 * role says known/target1/target2, which cannot tell a LEGO from a practice phrase, and
 * that distinction is the entire ordering.
 */
const TIERS = [
  { tier: 1, table: 'lego_introductions', column: 'presentation_audio_id', label: 'LEGO introduction' },
  { tier: 2, table: 'course_legos', column: 'target1_audio_id', label: 'LEGO target voice 1' },
  { tier: 2, table: 'course_legos', column: 'target2_audio_id', label: 'LEGO target voice 2' },
  { tier: 2, table: 'course_legos', column: 'presentation_audio_id', label: 'LEGO introduction (on lego row)' },
  { tier: 3, table: 'course_legos', column: 'known_audio_id', label: 'LEGO known side' },
  { tier: 4, table: 'course_seeds', column: 'known_audio_id', label: 'seed known' },
  { tier: 4, table: 'course_seeds', column: 'target1_audio_id', label: 'seed target voice 1' },
  { tier: 4, table: 'course_seeds', column: 'target2_audio_id', label: 'seed target voice 2' },
  { tier: 5, table: 'course_practice_phrases', column: 'known_audio_id', label: 'phrase known' },
  { tier: 5, table: 'course_practice_phrases', column: 'target1_audio_id', label: 'phrase target voice 1' },
  { tier: 5, table: 'course_practice_phrases', column: 'target2_audio_id', label: 'phrase target voice 2' },
]

/** lego_introductions has no course_code or seed_number; it joins through course_legos. */
async function legoSeedByLegoId () {
  const out = new Map()
  let from = 0
  for (;;) {
    const { data, error } = await supabase.from('course_legos')
      .select('lego_id, seed_number').eq('course_code', COURSE).range(from, from + 999)
    if (error) throw new Error(`reading course_legos: ${error.message}`)
    if (!data || !data.length) break
    for (const r of data) out.set(r.lego_id, r.seed_number)
    if (data.length < 1000) break
    from += 1000
  }
  return out
}

async function classify (ids) {
  const want = new Set(ids)
  const placed = new Map() // audioId -> {tier, seed, where}
  const legoSeed = await legoSeedByLegoId()

  for (const spec of TIERS) {
    const isIntro = spec.table === 'lego_introductions'
    let from = 0
    for (;;) {
      let q = supabase.from(spec.table)
        .select(isIntro ? `${spec.column}, lego_id` : `${spec.column}, seed_number`)
        .not(spec.column, 'is', null)
      if (!isIntro) q = q.eq('course_code', COURSE)
      const { data, error } = await q.range(from, from + 999)
      if (error) throw new Error(`reading ${spec.table}.${spec.column}: ${error.message}`)
      if (!data || !data.length) break
      for (const r of data) {
        const id = r[spec.column]
        if (!want.has(id)) continue
        const seed = isIntro ? (legoSeed.get(r.lego_id) ?? null) : r.seed_number
        // An id reachable from two holders keeps the WORST-consequence one: the tier that
        // costs a learner most is the one that should decide when it gets repaired.
        const prev = placed.get(id)
        if (!prev || spec.tier < prev.tier) placed.set(id, { tier: spec.tier, seed, where: spec.label })
      }
      if (data.length < 1000) break
      from += 1000
    }
  }
  return placed
}

/**
 * The tail verdict of whatever the clip is serving RIGHT NOW. Returns null when it cannot
 * be measured — and a null is never treated as clean, it just falls through to a repair,
 * which is the safe direction to be wrong in.
 */
async function currentTail (audioId) {
  try {
    const got = await repair.currentBytes(COURSE, audioId)
    const m = tier2.measure(await repair.verify.pcm(got.buffer))
    return { ...tier2.verdict(m), shape: m.error ? null : m }
  } catch { return null }
}

const loadAvg = () => os.loadavg()[0]
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

function readCheckpoint () {
  try { return JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8')) } catch { return null }
}
function writeCheckpoint (cp) {
  fs.mkdirSync(path.dirname(CHECKPOINT), { recursive: true })
  // Write-then-rename: a campaign killed mid-write must not come back to a truncated
  // checkpoint and re-repair everything it already paid for.
  const tmp = CHECKPOINT + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(cp, null, 1))
  fs.renameSync(tmp, CHECKPOINT)
}

async function main () {
  const scan = JSON.parse(fs.readFileSync(FLAGGED, 'utf8'))
  const items = new Map((scan.items || scan).map(i => [i.audioId, i]))
  console.log(`\naudio-repair-campaign — ${COURSE}`)
  console.log(`${items.size} flagged clip(s) in ${FLAGGED}`)

  const placed = await classify([...items.keys()])
  const unplaced = [...items.keys()].filter(id => !placed.has(id))

  const ordered = [...placed.entries()]
    .map(([audioId, p]) => ({ audioId, ...p, item: items.get(audioId) }))
    .filter(r => r.tier <= MAX_TIER)
    .sort((a, b) => (a.tier - b.tier) || ((a.seed ?? 1e9) - (b.seed ?? 1e9)) ||
      (a.item.fallRate ? b.item.fallRate - a.item.fallRate : 0))

  const byTier = {}
  for (const r of ordered) byTier[`${r.tier} ${r.where.replace(/ voice [12]| \(on lego row\)/, '')}`] =
    (byTier[`${r.tier} ${r.where.replace(/ voice [12]| \(on lego row\)/, '')}`] || 0) + 1
  console.log('\nrepair order — LEGO first, then learner order:'+(MAX_TIER<5?`  [capped at tier ${MAX_TIER}]`:''))
  for (const [k, v] of Object.entries(byTier).sort()) console.log(`  tier ${k.padEnd(34)} ${String(v).padStart(5)}`)
  // Named, never dropped silently: a clip whose holder we could not find is still broken.
  if (unplaced.length) {
    console.log(`  UNPLACED — flagged but reachable from no holder we know  ${unplaced.length}`)
    console.log('    (reported, not repaired: an unlinked clip is a link problem, not a tail problem)')
  }

  const cp = readCheckpoint() || { course: COURSE, flagged: FLAGGED, done: [], failed: [], accepted: [], tranches: 0 }
  const done = new Set(cp.done)
  const failed = new Set(cp.failed)
  const todo = ordered.filter(r => !done.has(r.audioId) && !failed.has(r.audioId))
  console.log(`\ncheckpoint ${CHECKPOINT}: ${done.size} repaired, ${failed.size} failed, ${todo.length} remaining`)

  if (!SPEND) {
    console.log('\nDRY — no TTS, nothing billed, nothing written. Re-run with --spend to start.')
    console.log(`First ${Math.min(10, todo.length)} in order:`)
    for (const r of todo.slice(0, 10)) {
      console.log(`  tier ${r.tier} seed ${String(r.seed ?? '?').padStart(4)}  ${r.where.padEnd(24)} ${JSON.stringify(String(r.item.text || '')).slice(0, 46)}`)
    }
    return
  }

  let tranches = 0
  while (todo.length && tranches < MAX_TRANCHES) {
    while (loadAvg() > MAX_LOAD) {
      console.log(`  load ${loadAvg().toFixed(1)} > ${MAX_LOAD} — waiting rather than piling on`)
      await sleep(120000)
    }
    const batch = todo.splice(0, TRANCHE)
    tranches++
    console.log(`\n── tranche ${tranches}: ${batch.length} clip(s), tiers ${[...new Set(batch.map(b => b.tier))].join('/')}, seeds ${batch[0].seed}-${batch[batch.length - 1].seed}  (load ${loadAvg().toFixed(1)})`)

    const proposed = []
    let next = 0
    const worker = async () => {
      for (;;) {
        const i = next++
        if (i >= batch.length) return
        const r = batch[i]
        try {
          // RE-MEASURE THE LIVE CLIP FIRST. The flagged list is a snapshot, and over a
          // multi-day campaign it goes stale: other repair runs are working the same
          // course, and a clip repaired an hour ago would otherwise be re-rendered and
          // re-accepted for nothing. One S3 GET and one decode (~1s) is far cheaper than
          // a wasted TTS render plus a 90s whisper decode, and it makes the campaign
          // self-correcting instead of needing to be told what someone else fixed.
          const live = await currentTail(r.audioId)
          if (live && live.flagged === false) {
            done.add(r.audioId)
            console.log(`  = ${r.audioId.slice(0, 8)} already clean (${live.shape.fallRate} dB/ms) — repaired since the scan, skipping`)
            continue
          }
          const out = await repair.propose({ courseCode: COURSE, audioId: r.audioId, source: 'tts', actor: ACTOR })
          proposed.push({ ...r, candidateId: out.candidateId, tail: out.candidate.tail, durationMs: out.candidate.durationMs, before: out.current.durationMs })
          console.log(`  + ${r.audioId.slice(0, 8)} ${String(out.current.durationMs).padStart(5)}ms -> ${String(out.candidate.durationMs).padStart(5)}ms  tail ${out.candidate.tail ? out.candidate.tail.shape.fallRate : '?'} dB/ms`)
        } catch (e) {
          failed.add(r.audioId)
          console.log(`  ! ${r.audioId.slice(0, 8)} FAILED — ${String(e.message).slice(0, 120)}`)
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batch.length) }, worker))

    if (ACCEPT) {
      for (const p of proposed) {
        // The machine door's basis, re-asserted here rather than trusted: MEASURED clean.
        if (!p.tail || p.tail.flagged !== false) {
          failed.add(p.audioId)
          console.log(`  ! ${p.audioId.slice(0, 8)} not accepted — candidate tail ${p.tail && p.tail.flagged === null ? 'UNMEASURED' : 'FLAGGED'}; unmeasured is not clean`)
          continue
        }
        try {
          const res = await repair.accept({
            courseCode: COURSE, audioId: p.audioId, candidateId: p.candidateId, actor: ACTOR,
            reason: `[machine-verified, NOBODY LISTENED] authorised by ${AUTHORISED_BY}` +
              `; candidate measured clean by ${tier2.DETECTOR.name} at ${p.tail.shape.fallRate} dB/ms` +
              `; campaign tier ${p.tier} (${p.where}), seed ${p.seed}`,
          })
          done.add(p.audioId)
          cp.accepted.push({ audioId: p.audioId, revision: res.revision, previousRevision: res.previousRevision,
            durationMs: res.durationMs, tier: p.tier, seed: p.seed, where: p.where, fallRate: p.tail.shape.fallRate })
        } catch (e) {
          failed.add(p.audioId)
          console.log(`  ! ${p.audioId.slice(0, 8)} accept FAILED — ${String(e.message).slice(0, 120)}`)
        }
      }
    } else {
      for (const p of proposed) done.add(p.audioId)
    }

    cp.done = [...done]; cp.failed = [...failed]; cp.tranches = (cp.tranches || 0) + 1
    cp.updated = new Date().toISOString()
    writeCheckpoint(cp)
    console.log(`  checkpoint: ${done.size} repaired, ${failed.size} failed, ${todo.length} remaining`)
  }

  console.log(`\ncampaign paused: ${done.size} repaired, ${failed.size} failed, ${todo.length} remaining.`)
  console.log(`Re-run the same command to continue from ${CHECKPOINT}.`)
}

main().then(() => process.exit(0)).catch(e => { console.error(e.stack || e.message); process.exit(1) })
