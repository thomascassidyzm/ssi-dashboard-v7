#!/usr/bin/env node
/**
 * audio-repair.cjs — the one CLI for repairing course audio. Role-agnostic:
 * presentation clips, lego clips, phrase clips, all by the same path.
 *
 * It is a THIN front end. Every decision that can damage anything lives in
 * services/audio-repair-core.cjs (28 unit tests, no network); this file reads
 * arguments, prints, logs, and asserts that nothing moved under the human.
 *
 * ── Why this replaces the delete-then-regenerate tools ──────────────────────
 * repair-silent-clips.cjs and repair-presentation-clips.cjs each minted a NEW
 * course_audio id, which forces a DELETE of the old row (the unique index
 * course_code+text_normalized+language+role+voice_id will not hold both). For
 * role='presentation' that delete CASCADEs through
 * lego_introductions.presentation_audio_id and destroys the authored intro
 * script — which is why presentation clips were hard-refused outright, and why
 * the tool that did handle them needed a tombstone dance to get round the
 * unique index at all.
 *
 * The core swaps IN PLACE at the same id: s3_key, duration and audio_revision
 * move; id, text, role, voice and every foreign key pointing at the row do not.
 * Nothing is created, nothing is deleted, no CASCADE can fire. The cost of
 * same-id — immutable cache headers would serve the old bytes forever — is paid
 * by audio_revision, which the learning app carries in the URL as
 * /api/audio/<id>?v=<rev> (ssi-learning-app api/_utils/audioRevisions.ts).
 *
 * ── MACHINES MAY FLAG AUDIO, ONLY HUMANS MAY PASS IT ────────────────────────
 * `propose` renders and verifies a candidate; it puts nothing on the learner
 * path. `accept` is the only thing that does, it is never implied by any other
 * verb, and it demands --actor plus one of two attestations that mean DIFFERENT
 * things:
 *
 *   --i-have-listened   a human heard both clips. A CLI accept is still a human
 *                       accept. No machine may ever type this.
 *   --machine-verified  nobody listened; every automated check passed, including
 *                       tier 2 on the candidate itself. Requires --authorised-by
 *                       naming the person whose standing decision this discharges,
 *                       refuses any candidate whose tail was not MEASURED clean,
 *                       and stamps the history row so it can never be misread as an
 *                       ear pass. It exists because a course-wide authorisation
 *                       cannot be discharged one click at a time, and because the
 *                       alternative in practice is a machine typing the human flag.
 *
 * ── TTS COSTS MONEY ─────────────────────────────────────────────────────────
 * `propose` will NOT render unless you pass --spend. Without it you get a
 * dry run: the real clip facts, the character count, and what would happen.
 * That is the default deliberately — the approval gate in CLAUDE.md is a rule
 * about money, and a flag you have to type is the cheapest possible enforcement.
 *
 *   node tools/audio-repair.cjs queue deu_for_eng --role presentation --json /tmp/q.json
 *   node tools/audio-repair.cjs queue deu_for_eng --max-seed 5 --tails --json /tmp/q.json
 *   node tools/audio-repair.cjs preview deu_for_eng --id <audioId>
 *   node tools/audio-repair.cjs propose deu_for_eng --targets /tmp/q.json            # dry, free
 *   node tools/audio-repair.cjs propose deu_for_eng --targets /tmp/q.json --spend    # renders
 *   node tools/audio-repair.cjs accept  deu_for_eng --from /tmp/...-applied-log.json \
 *          --i-have-listened --actor tom --reason "clipped final word"
 *   node tools/audio-repair.cjs reject  deu_for_eng --candidate <id> --actor tom
 */
const fs = require('fs')
const path = require('path')
const {
  parseArgv, parseTargets, planTargets, expectationFrom, assertNoDrift,
  costEstimate, logPath, DriftError,
} = require('./lib/audio-repair-cli.cjs')

const { flags, positional } = parseArgv(process.argv.slice(2))
const VERB = positional[0]
const COURSE = positional[1]

const num = (v, d) => (v === undefined || v === true ? d : Number(v))
const str = (v, d = null) => (v === undefined || v === true ? d : String(v))

const USAGE = `
audio-repair — non-destructive course audio repair (propose / preview / accept / reject)

  queue    <course> [--role R] [--limit N] [--json FILE] [--tails] [--max-seed N]
  preview  <course> --id <audioId>
  propose  <course> (--id <audioId> | --targets FILE) [--role R] [--only V] [--limit N]
                    [--spend] [--actor NAME] [--text "..."] [--voice V]
  accept   <course> (--from LOG | --id <audioId> --candidate <candidateId>)
                    (--i-have-listened | --machine-verified --authorised-by "...")
                    --actor NAME [--reason "..."] [--dry]
  reject   <course> --candidate <candidateId> --actor NAME [--reason "..."]

  --tails            also run the tail-integrity check (fetches + decodes every clip)
  --max-seed N       restrict to clips reachable from seeds 1..N
  --spend            propose renders for real. WITHOUT IT NOTHING IS BILLED.
  --i-have-listened  accept: a HUMAN heard both clips. Machines must never type this.
  --machine-verified accept: nobody listened; every automated check passed. Needs
                     --authorised-by "<who authorised this, and to do what>", refuses
                     any candidate whose tail was not MEASURED clean, and stamps the
                     history row so it can never read as an ear pass.
  --concurrency N    queue --tails: clips measured at once (default 8)
                     propose: clips rendered+verified at once (default 1)
`

function die (msg, code = 1) { console.error(msg); process.exit(code) }
if (!VERB || flags.help) die(USAGE, VERB ? 0 : 1)
if (!COURSE) die(`${VERB}: a course code is required.\n${USAGE}`)

/** Lazily loaded: requiring it pulls dotenv, Supabase and (eventually) phase8. */
function core () { return require('../services/audio-repair.cjs') }

function writeLog (rows, { verb, dryRun }) {
  const p = logPath({ course: COURSE, verb, dryRun, count: rows.length })
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(rows, null, 2))
  console.log(`\nlog -> ${p}`)
  return p
}

/** Targets from --targets FILE, or a single --id. */
function targetsFromArgs () {
  const file = str(flags.targets) || str(flags.ids) || str(flags.flags)
  if (file) return parseTargets(JSON.parse(fs.readFileSync(file, 'utf8')))
  const id = str(flags.id)
  if (id) return [{ id, role: null, text: null, durationMs: null, verdict: null }]
  die('need --targets <file> or --id <audioId>')
}

function announce () {
  try { require('../services/audio-veracity.cjs').announceStatus(console) } catch {}
}

// ── queue ──────────────────────────────────────────────────────────────────
async function cmdQueue () {
  const maxSeed = flags['max-seed'] === undefined ? null : num(flags['max-seed'], null)
  const audioIds = maxSeed
    ? await core().seedScopedAudioIds({ courseCode: COURSE, maxSeedNumber: maxSeed })
    : null
  const tails = !!flags.tails
  if (audioIds) console.log(`\nscoped to seeds 1-${maxSeed}: ${audioIds.length} clip(s) referenced`)
  const tailConcurrency = num(flags.concurrency, 8)
  if (tails) console.log(`tail check ON — one S3 fetch and one decode per clip, ${tailConcurrency} at a time; this is not instant.`)
  const started = Date.now()
  const out = await core().queue({
    courseCode: COURSE, limit: num(flags.limit, 50), role: str(flags.role),
    audioIds, tails, tailConcurrency,
    onProgress: tails
      ? (done, total) => {
          const rate = done / ((Date.now() - started) / 1000)
          const eta = Math.round((total - done) / Math.max(rate, 0.01) / 60)
          process.stderr.write(`\r  measured ${done}/${total} (${rate.toFixed(1)}/s, ~${eta}m left)   `)
        }
      : null,
  })
  if (tails) process.stderr.write('\n')
  console.log(`\naudio-repair queue — ${COURSE}`)
  console.log(`detector: ${out.detector.name}`)
  console.log(`  ${out.detector.precisionNote}`)
  if (out.tailDetector) {
    console.log(`detector: ${out.tailDetector.name}`)
    console.log(`  ${out.tailDetector.precisionNote}`)
    console.log(`  measured ${out.measured} clip(s); ${out.tailMeasureFailures} could not be measured`)
    // The per-voice flag rate is printed unasked, because it is the first thing that
    // says whether a number is damage or a calibration miss on a voice nobody measured.
    for (const [voice, b] of Object.entries(out.tailByVoice || {})) {
      console.log(`  ${voice.padEnd(22)} ${String(b.flagged).padStart(6)} / ${String(b.measured).padEnd(6)} flagged` +
        ` (${b.measured ? (100 * b.flagged / b.measured).toFixed(1) : '—'}%)${b.failed ? `, ${b.failed} unmeasured` : ''}`)
    }
  }
  console.log(`\n${out.total} clip(s) worth a human's ears (${out.flaggedByDuration} by duration, ${out.flaggedByTail} by tail); showing ${out.items.length}, worst first.\n`)
  for (const it of out.items) {
    const why = it.tail && it.tail.flagged ? it.tail.reason : it.detector.reason
    const score = it.tail && it.tail.flagged
      ? `${it.tail.shape.fallRate}dB/ms` : String(it.detector.score)
    console.log(`  ${score.padStart(7)}  ${String(it.role).padEnd(13)} ${String(it.durationMs ?? '?').padStart(6)}ms  ${JSON.stringify(String(it.text || '')).slice(0, 54)}`)
    console.log(`           ${it.audioId}  rev ${it.revision}${why ? `  — ${why}` : ''}`)
  }
  if (flags.json) {
    const p = str(flags.json)
    fs.writeFileSync(p, JSON.stringify(out, null, 2))
    console.log(`\nqueue -> ${p}  (feed it straight to \`propose --targets\`)`)
  }
  console.log('\nThis is an ORDERING, not a verdict. Nothing here has been judged broken.\n')
}

// ── preview ────────────────────────────────────────────────────────────────
async function cmdPreview () {
  const audioId = str(flags.id) || die('preview needs --id <audioId>')
  const p = await core().preview({ courseCode: COURSE, audioId })
  console.log(`\naudio-repair preview — ${COURSE} ${audioId}\n`)
  console.log(`  LIVE   rev ${p.current.revision}  ${String(p.current.durationMs ?? '?').padStart(6)}ms  role=${p.current.role}  voice=${p.current.voiceId}`)
  console.log(`         ${JSON.stringify(p.current.text)}`)
  console.log(`         ${p.current.s3Key}`)
  if (!p.candidates.length) console.log('\n  no candidates proposed yet.')
  for (const c of p.candidates) {
    console.log(`\n  CAND   ${c.candidateId}  [${c.status}]  ${String(c.durationMs ?? '?').padStart(6)}ms  ${c.source}`)
    console.log(`         veracity ${c.veracity.pass === true ? 'pass' : c.veracity.pass === false ? 'FAIL' : 'unchecked'}${c.veracity.reason ? ` (${c.veracity.reason})` : ''}  mean ${c.level.meanDb}dB peak ${c.level.peakDb}dB`)
    console.log(`         proposed by ${c.proposedBy} at ${c.createdAt}`)
  }
  if (p.comparison) {
    console.log(`\n  ratio shipped/candidate = ${p.comparison.durationRatio == null ? '?' : p.comparison.durationRatio.toFixed(3)}`)
  }
  console.log(`\n  detector: ${p.detector.reason}`)
  console.log(`            ${p.detector.precisionNote}`)
  if (p.history.length) {
    console.log('\n  history:')
    for (const h of p.history) console.log(`    rev ${h.previous_revision} -> ${h.revision}  by ${h.accepted_by} at ${h.created_at}${h.reason ? ` — ${h.reason}` : ''}`)
  }
  console.log('\n  Hear both before deciding:')
  console.log(`    audio-repair bytes ${COURSE} --id ${audioId} --out /tmp/live.mp3`)
  console.log(`    audio-repair bytes ${COURSE} --candidate <candidateId> --out /tmp/cand.mp3\n`)
}

// ── bytes (so a human can actually listen, without the learner app) ────────
async function cmdBytes () {
  const out = str(flags.out) || die('bytes needs --out <file>')
  const c = core()
  const got = str(flags.candidate)
    ? await c.candidateBytes(str(flags.candidate))
    : await c.currentBytes(COURSE, str(flags.id) || die('bytes needs --id or --candidate'))
  fs.writeFileSync(out, got.buffer)
  console.log(`${got.buffer.length} bytes -> ${out}`)
}

// ── propose ────────────────────────────────────────────────────────────────
async function cmdPropose () {
  const targets = targetsFromArgs()
  const { jobs, skipped } = planTargets(targets, {
    role: str(flags.role), only: str(flags.only, 'all'), limit: num(flags.limit, 0),
  })
  const SPEND = flags.spend === true
  const actor = str(flags.actor, process.env.USER || 'cli')

  console.log(`\naudio-repair propose — ${COURSE}`)
  announce()
  console.log(`${jobs.length} clip(s) to propose${skipped.length ? `, ${skipped.length} skipped` : ''}`)
  for (const s of skipped) console.log(`   SKIP ${s.id} — ${s.why}`)

  const est = costEstimate(jobs)
  if (!SPEND) {
    console.log(`\nDRY RUN — no TTS, nothing billed, nothing written.`)
    console.log(`Would render ${est.clips} clip(s)${est.charactersKnown ? `, ${est.characters.toLocaleString()} characters` : ' (character count unknown from this target file)'}.`)
  }

  // A propose is one TTS round trip, one mastering pass and one whisper decode. The
  // whisper decode dominates and it is CPU-bound, so a single-file run measured ~90s
  // per clip on a loaded box — nineteen hours for a course-scale queue, which is not a
  // run, it is a hostage situation. Concurrency is opt-in and defaults to 1 so that
  // nothing about the existing single-clip behaviour changes: it is a batch tool
  // affordance, not a new default posture.
  //
  // Order is preserved in the log regardless of completion order (rows[i] is written by
  // slot, never pushed), because `accept --from` reads that log and a human scanning it
  // should see the same order they queued.
  const CONCURRENCY = Math.max(1, num(flags.concurrency, 1))
  const rows = new Array(jobs.length)
  let nextJob = 0
  const runOne = async (i) => {
    const job = jobs[i]
    const prefix = `[${i + 1}/${jobs.length}] ${job.id}`
    try {
      const out = await core().propose({
        courseCode: COURSE, audioId: job.id, source: 'tts',
        text: str(flags.text), voiceId: str(flags.voice),
        actor, dryRun: !SPEND,
      })
      if (!SPEND) {
        const cur = out.current || {}
        console.log(`${prefix}  [DRY] ${cur.role} rev ${cur.revision} ${String(cur.durationMs ?? '?')}ms  ${JSON.stringify(String(cur.text || '')).slice(0, 48)}`)
        console.log(`         would render ${out.wouldSpend ? `${out.wouldSpend.characters} chars via ${out.wouldSpend.provider}` : '?'} and propose a candidate; the live row is NOT touched`)
        rows[i] = { audioId: job.id, action: 'would-propose', current: cur, wouldSpend: out.wouldSpend || null }
      } else {
        console.log(`${prefix}  candidate ${out.candidateId}  ${out.current.durationMs}ms -> ${out.candidate.durationMs}ms  veracity ${out.candidate.veracity.pass === false ? 'FAIL' : 'pass'}`)
        rows[i] = {
          audioId: job.id, action: 'proposed', candidateId: out.candidateId,
          candidate: out.candidate,
          // The BEFORE-STATE. `accept` re-reads the clip and refuses if any of
          // this has moved since a human was shown it.
          expect: expectationFrom(out.current),
        }
      }
    } catch (e) {
      console.log(`${prefix}  FAILED — ${e.message.slice(0, 160)}`)
      rows[i] = { audioId: job.id, action: 'failed', error: e.message, code: e.code || null }
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async () => {
    for (;;) { const i = nextJob++; if (i >= jobs.length) return; await runOne(i) }
  })
  if (SPEND && CONCURRENCY > 1) console.log(`rendering ${CONCURRENCY} at a time`)
  await Promise.all(workers)

  const p = writeLog(rows.filter(Boolean), { verb: 'propose', dryRun: !SPEND })
  if (SPEND) {
    const ok = rows.filter(r => r.action === 'proposed')
    console.log(`\n${ok.length} candidate(s) proposed, ${rows.length - ok.length} failed. NOTHING IS LIVE YET.`)
    console.log(`Listen, then accept the ones you believe:`)
    console.log(`  node tools/audio-repair.cjs accept ${COURSE} --from ${p} --i-have-listened --actor <you>\n`)
  } else {
    console.log(`\nNothing rendered. Re-run with --spend once the plan is approved.\n`)
  }
  process.exit(rows.some(r => r.action === 'failed') ? 2 : 0)
}

// ── accept ─────────────────────────────────────────────────────────────────
async function cmdAccept () {
  const DRY = flags.dry === true
  const actor = str(flags.actor)
  const reason = str(flags.reason)

  // ── The two doors, and why the second one exists ──────────────────────────
  // --i-have-listened is a HUMAN attestation: someone heard both clips. It stays
  // exactly as it was, and no machine may ever type it.
  //
  // --machine-verified is a second, narrower door, and it attests something
  // different and smaller: nobody has heard this clip, and every check the estate
  // owns has passed it. It exists because a standing authorisation to repair a
  // whole course cannot be discharged one click at a time — deu_for_eng seeds
  // 1-300 is 18,163 clips — and because the alternative in practice is a machine
  // typing --i-have-listened, which would poison the one field in this system
  // that means a person was there.
  //
  // It is deliberately more expensive to satisfy than the human door:
  //   - --authorised-by must name the person and what they authorised; it goes
  //     into the history row verbatim, so the audit trail says who decided.
  //   - the candidate must have been MEASURED CLEAN by tier 2 in the propose log.
  //     Not "not flagged" — measured. A candidate whose tail could not be measured
  //     is refused here, because unmeasured is not clean.
  //   - the reason recorded is stamped with the fact that no human heard it, so
  //     nobody reading the history later mistakes this for an ear-passed clip.
  // Revert stays one command away and costs nothing: the superseded object is
  // never deleted.
  const MACHINE = flags['machine-verified'] === true
  const authorisedBy = str(flags['authorised-by'])
  if (!DRY && flags['i-have-listened'] !== true && !MACHINE) {
    die(`accept refuses without --i-have-listened.\n\nMachines may flag audio; only humans may pass it. Hear the live clip and the\ncandidate first:\n  node tools/audio-repair.cjs preview ${COURSE} --id <audioId>\n  node tools/audio-repair.cjs bytes ${COURSE} --id <audioId> --out /tmp/live.mp3\n  node tools/audio-repair.cjs bytes ${COURSE} --candidate <cid> --out /tmp/cand.mp3\n\nIf you are a machine acting on a standing authorisation, that is a DIFFERENT\nclaim and it has its own door — it records that nobody listened:\n  --machine-verified --authorised-by "<who authorised this, and to do what>"`)
  }
  if (MACHINE && flags['i-have-listened'] === true) {
    die('--machine-verified and --i-have-listened claim different things. Pick the true one.')
  }
  if (!DRY && MACHINE && !authorisedBy) {
    die('--machine-verified refuses without --authorised-by "<who authorised this, and to do what>".\nThe history row has to say whose decision this was.')
  }
  if (!DRY && (!actor || actor === 'unknown')) {
    die('accept refuses without --actor <name>. The history row records who passed it.')
  }

  // Work items: either a propose log (batch) or one explicit pair.
  let items
  if (flags.from) {
    const log = JSON.parse(fs.readFileSync(str(flags.from), 'utf8'))
    items = log.filter(r => r.action === 'proposed' && r.candidateId)
      .map(r => ({
        audioId: r.audioId, candidateId: r.candidateId, expect: r.expect || null,
        // Carried through so the machine door can check it. A human who listened
        // does not need it; a machine that did not has nothing else to stand on.
        tail: r.candidate ? r.candidate.tail : undefined,
      }))
    if (!items.length) die(`no proposed candidates in ${str(flags.from)} — did you run propose with --spend?`)
    const only = str(flags.only)
    if (only) items = items.filter(i => i.audioId === only || i.candidateId === only)
  } else {
    const audioId = str(flags.id) || die('accept needs --from <log> or --id <audioId> --candidate <candidateId>')
    const candidateId = str(flags.candidate) || die('accept needs --candidate <candidateId>')
    items = [{ audioId, candidateId, expect: null }]
  }

  console.log(`\naudio-repair accept — ${COURSE}${DRY ? '  [DRY RUN]' : ''}`)
  console.log(`${items.length} clip(s); actor=${actor || '(dry)'}`)
  if (MACHINE) {
    console.log(`MACHINE-VERIFIED: nobody has listened to these clips. Authorised by: ${authorisedBy}`)
    console.log('Every candidate must have been measured clean by the tail detector; unmeasured is refused.')
  }
  console.log('')

  const rows = []
  let ok = 0, aborted = 0, failed = 0
  for (const [i, item] of items.entries()) {
    const prefix = `[${i + 1}/${items.length}] ${item.audioId}`
    try {
      // BEFORE-STATE ASSERTION. Several workers touch this estate at once; a
      // clip whose live bytes have moved since a human heard them is a clip
      // nobody has approved, so the run aborts on it rather than overwriting.
      const p = await core().preview({ courseCode: COURSE, audioId: item.audioId })
      if (item.expect) assertNoDrift(item.expect, p.current)

      const cand = p.candidates.find(c => c.candidateId === item.candidateId)
      if (!cand) throw new Error(`candidate ${item.candidateId} is not attached to this clip`)
      if (cand.status !== 'pending') throw new Error(`candidate is already ${cand.status}`)

      // The machine door's whole basis. `undefined` = an older propose log that
      // never measured; `null`/`flagged:null` = measured attempted and failed.
      // Neither is clean, and neither may pass without ears.
      if (MACHINE) {
        if (item.tail === undefined) {
          throw new Error('this propose log predates the candidate tail check — no machine basis to accept on; use ears')
        }
        if (!item.tail || item.tail.flagged !== false) {
          throw new Error(`candidate tail is ${item.tail && item.tail.flagged === null ? 'UNMEASURED' : 'FLAGGED'} — unmeasured is not clean; use ears`)
        }
      }

      if (DRY) {
        console.log(`${prefix}  [DRY] would swap in place: rev ${p.current.revision} -> ${p.current.revision + 1}, ${p.current.durationMs}ms -> ${cand.durationMs}ms`)
        console.log(`         id unchanged, ${p.current.role} links unchanged, old object ${p.current.s3Key} retained`)
        rows.push({ audioId: item.audioId, candidateId: item.candidateId, action: 'would-accept', from: p.current, to: { durationMs: cand.durationMs } })
        ok++
        continue
      }

      const res = await core().accept({
        courseCode: COURSE, audioId: item.audioId, candidateId: item.candidateId, actor,
        // Stamped, not appended as a courtesy: whoever reads this history row later
        // must not be able to mistake a machine pass for an ear pass.
        reason: MACHINE
          ? `[machine-verified, NOBODY LISTENED] authorised by ${authorisedBy}` +
            `; candidate measured clean by ${require('../services/audio-intelligence/tiers/tier2-edge-shape.cjs').DETECTOR.name}` +
            ` at ${item.tail.shape ? item.tail.shape.fallRate : '?'} dB/ms${reason ? `; ${reason}` : ''}`
          : reason,
      })
      console.log(`${prefix}  ACCEPTED rev ${res.previousRevision} -> ${res.revision}, ${res.durationMs.before}ms -> ${res.durationMs.after}ms`)
      console.log(`         links after swap: ${JSON.stringify(res.links)}`)
      console.log(`         superseded object retained: ${res.supersededS3Key}`)
      rows.push({ audioId: item.audioId, candidateId: item.candidateId, action: 'accepted', ...res })
      ok++
    } catch (e) {
      if (e instanceof DriftError) {
        aborted++
        console.log(`${prefix}  ABORTED — ${e.message}`)
        rows.push({ audioId: item.audioId, candidateId: item.candidateId, action: 'aborted-drift', moved: e.moved })
      } else {
        failed++
        console.log(`${prefix}  FAILED — ${e.message.slice(0, 200)}${e.rollback ? ` [rollback: ${e.rollback}]` : ''}`)
        rows.push({ audioId: item.audioId, candidateId: item.candidateId, action: 'failed', error: e.message, rollback: e.rollback || null })
      }
    }
  }

  writeLog(rows, { verb: 'accept', dryRun: DRY })
  console.log(`\n${ok} ${DRY ? 'would be accepted' : 'accepted'}, ${aborted} aborted on drift, ${failed} failed.\n`)
  process.exit(failed || aborted ? 2 : 0)
}

// ── reject ─────────────────────────────────────────────────────────────────
async function cmdReject () {
  const candidateId = str(flags.candidate) || die('reject needs --candidate <candidateId>')
  const res = await core().reject({
    courseCode: COURSE, audioId: str(flags.id), candidateId,
    actor: str(flags.actor, process.env.USER || 'cli'), reason: str(flags.reason),
  })
  console.log(`candidate ${res.candidateId} rejected. The learner path was never touched; the S3 object is kept as evidence.`)
}

const COMMANDS = { queue: cmdQueue, preview: cmdPreview, propose: cmdPropose, accept: cmdAccept, reject: cmdReject, bytes: cmdBytes }

;(async () => {
  const fn = COMMANDS[VERB]
  if (!fn) die(`unknown command '${VERB}'.\n${USAGE}`)
  await fn()
})().catch(e => { console.error(`ERR: ${e.message}`); process.exit(1) })
