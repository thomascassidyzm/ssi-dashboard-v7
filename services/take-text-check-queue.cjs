/**
 * take-text-check-queue.cjs — THE BOOTH TAKE'S SCRIPT CHECK, RUN AFTER THE REPLY.
 *
 * Aran, 2026-10-15 (plan #715, built as job #842, Tom's yes 16:49 UTC): booth uploads drained at
 * about 4-5 a minute, strictly one at a time, and ~7.7 s of every ~10 s of server time was the
 * whisper "does this take say its line?" check (audio-veracity.checkAudioVeracity). That check
 * never refuses a take (Tom, 2026-08-24: "STT is never a hard course veto") and the booth never
 * read its result. So the upload now answers as soon as the take is stored, mastered and through
 * the refusal gates (silence, steady noise, truncation — those stay INLINE so "didn't save" is
 * still instant, #679/#783), and the script check runs here, afterwards. EVERY take with a script
 * text is still checked; only the WHEN changed.
 *
 * TOM'S TWO CONDITIONS, and where each lives:
 *   1. A take that fails the check comes back to the artist as a re-record, not silently.
 *      failuresFor() is the per-voice list; GET /api/recording/voice/:voiceId/text-check-failures
 *      serves it and the booth merges it into the one Re-record card (#788/#806, reason "didn't
 *      match the words") and the recording screen's slim bar (#783). "Fails" is the check's own
 *      pass/fail verdict (checked === true && pass === false) — no new threshold.
 *   2. Queued takes must drain faster than 4 a minute: measured live after deploy from the
 *      timestamped `[TextCheck]` lines this module writes (the API log has no timestamps of its
 *      own).
 *
 * DURABLE, BECAUSE THE API RESTARTS OFTEN. Production restarted every few minutes on 15 Oct (each
 * deploy restarts it), so an in-memory queue would drop checks all day. Every job is written to
 * disk BEFORE the reply goes — `pending/<takeId>.json` plus the mastered bytes beside it — and is
 * deleted only once its verdict is appended to the voice's ledger. recover() on boot re-queues
 * whatever a restart interrupted, and a job that has started MAX_ATTEMPTS times without finishing
 * is recorded as unchecked rather than crash-looping the box.
 *
 * THE LEDGER, one append-only file per voice (`voices/<voiceId>.jsonl`):
 *   {e:'take',    voiceId, lineId, takeId, at}          — a take was accepted for this line
 *   {e:'check',   voiceId, lineId, takeId, checked, pass, reason, heard, similarity, at}
 *   {e:'keep',    voiceId, lineId, takeId, at}          — the artist listened and kept it
 * A line's failure is live only while the take that failed is still the line's LATEST take, so a
 * new take of the line (good or not yet checked) takes it off the list at once, and a re-record
 * that fails again comes back with its own take id.
 *
 * Machine-local, one directory per API port (production 3470, staging 3490 share a box and a
 * home): never shared between two processes. No database, no TTS, no S3 — the bytes are the
 * mastered take the request already holds.
 */
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')

const MAX_ATTEMPTS = 3
/** A failure older than this is not "this session" any more and drops off the list. */
const FAILURE_WINDOW_MS = Number(process.env.TAKE_TEXT_CHECK_WINDOW_DAYS || 7) * 24 * 3600 * 1000
/** Background checks at once. The whisper wrapper's own 3-slot semaphore bounds the box. */
const DEFAULT_CONCURRENCY = Number(process.env.TAKE_TEXT_CHECK_CONCURRENCY || 2)

function defaultDir () {
  if (process.env.TAKE_TEXT_CHECK_DIR) return process.env.TAKE_TEXT_CHECK_DIR
  if (process.env.VITEST) return path.join(os.tmpdir(), `take-text-check-test-${process.pid}`)
  const port = process.env.PRODUCTION_API_PORT || process.env.PORT || '3470'
  return path.join(os.homedir(), '.local', 'state', `ssi-take-text-check-${port}`)
}

const safeName = (s) => String(s || 'unknown').replace(/[^\w.@-]/g, '_').slice(0, 120)

/** The failed-check list from one voice's ledger events (pure). */
function failuresFromEvents (events, { now = Date.now(), windowMs = FAILURE_WINDOW_MS } = {}) {
  const latestTake = new Map() // lineId -> {takeId, at}
  const checks = new Map()     // takeId -> check event
  const kept = new Set()       // takeIds the artist kept
  for (const ev of events) {
    if (!ev || !ev.lineId) continue
    if (ev.e === 'take') latestTake.set(ev.lineId, { takeId: ev.takeId, at: ev.at })
    else if (ev.e === 'check') checks.set(ev.takeId, ev)
    else if (ev.e === 'keep') kept.add(ev.takeId)
  }
  const out = []
  for (const [lineId, t] of latestTake) {
    const c = checks.get(t.takeId)
    if (!c || c.checked !== true || c.pass !== false || kept.has(t.takeId)) continue
    if (now - Date.parse(c.at || t.at || 0) > windowMs) continue
    out.push({
      lineId,
      takeId: t.takeId,
      audioId: c.audioId || null,
      courseCode: c.courseCode || null,
      text: c.text || null,
      heard: c.heard || null,
      reason: c.reason || null,
      similarity: c.similarity ?? null,
      takenAt: t.at || null,
      checkedAt: c.at || null,
    })
  }
  return out.sort((a, b) => String(a.checkedAt).localeCompare(String(b.checkedAt)))
}

/**
 * @param {object} o
 * @param {Function} [o.check] (buffer, text, language, {meta}) => verdict; default audio-veracity's
 * @param {string} [o.dir]
 * @param {object} [o.logger]
 * @param {number} [o.concurrency]
 * @param {Function} [o.now] () => ms
 */
function createTextCheckQueue (o = {}) {
  // The one implementation of the check (audio-veracity); injectable for tests.
  const check = o.check || ((buf, text, language, opts) => require('./audio-veracity.cjs').checkAudioVeracity(buf, text, language, opts))
  const logger = o.logger || console
  const concurrency = Math.max(1, o.concurrency || DEFAULT_CONCURRENCY)
  const now = o.now || (() => Date.now())
  const dir = o.dir || defaultDir()
  const pendingDir = path.join(dir, 'pending')
  const voicesDir = path.join(dir, 'voices')
  let durable = true
  try {
    fs.mkdirSync(pendingDir, { recursive: true })
    fs.mkdirSync(voicesDir, { recursive: true })
  } catch (e) {
    // Never fails an upload: the checks still run, they just would not survive a restart.
    durable = false
    logger.error(`[TextCheck] state dir ${dir} is not writable (${e.message}) — checks run IN MEMORY ONLY and a restart will drop them`)
  }

  const memLedger = new Map() // voiceId -> events, used only when not durable
  const queue = []            // jobs waiting: {job, buffer?}
  const queued = new Set()    // takeIds waiting or running
  let running = 0
  let idleWaiters = []

  const iso = () => new Date(now()).toISOString()
  const jobPath = (takeId) => path.join(pendingDir, `${safeName(takeId)}.json`)
  const audioPath = (takeId) => path.join(pendingDir, `${safeName(takeId)}.audio`)
  const ledgerPath = (voiceId) => path.join(voicesDir, `${safeName(voiceId)}.jsonl`)

  function writeAtomic (file, data) {
    const tmp = `${file}.${process.pid}.tmp`
    fs.writeFileSync(tmp, data)
    fs.renameSync(tmp, file)
  }

  function append (voiceId, ev) {
    const line = { ...ev, voiceId }
    if (!durable) {
      if (!memLedger.has(voiceId)) memLedger.set(voiceId, [])
      memLedger.get(voiceId).push(line)
      return
    }
    try {
      fs.appendFileSync(ledgerPath(voiceId), JSON.stringify(line) + '\n')
    } catch (e) {
      logger.error(`[TextCheck] could not write the ledger for ${voiceId}: ${e.message}`)
    }
  }

  function readEvents (voiceId) {
    if (!durable) return memLedger.get(voiceId) || []
    let raw
    try { raw = fs.readFileSync(ledgerPath(voiceId), 'utf8') } catch { return [] }
    const out = []
    for (const l of raw.split('\n')) {
      if (!l) continue
      try { out.push(JSON.parse(l)) } catch { /* a torn last line from a crash mid-append */ }
    }
    return out
  }

  /**
   * A take was accepted for a booth line. Called for EVERY accepted booth take, checked or not,
   * because a new take of a line is what takes that line's earlier failure off the list.
   */
  function noteTake ({ voiceId, lineId, takeId }) {
    if (!voiceId || !lineId || !takeId) return
    append(voiceId, { e: 'take', lineId, takeId, at: iso() })
  }

  /**
   * Queue one take's check. Synchronous and fast (two small file writes) so the caller can reply
   * the moment it returns. Never throws.
   * @param {object} job {takeId, voiceId, lineId, audioId, courseCode, text, language, kind}
   * @param {Buffer} buffer the mastered take
   */
  function enqueue (job, buffer) {
    try {
      if (!job || !job.takeId || !job.text || !buffer) return { queued: false }
      if (job.voiceId && job.lineId) noteTake(job)
      const rec = { ...job, queuedAt: iso(), attempts: 0 }
      if (durable) {
        try {
          writeAtomic(audioPath(job.takeId), buffer)
          writeAtomic(jobPath(job.takeId), JSON.stringify(rec))
        } catch (e) {
          logger.error(`[TextCheck] could not persist the check for ${job.takeId} (${e.message}) — running it in memory`)
        }
      }
      push(rec, buffer)
      logger.log(`[TextCheck] ${rec.queuedAt} queued take ${job.takeId} (${job.voiceId || '?'} ${job.lineId || '?'}) — ${depth()} waiting or running`)
      return { queued: true, depth: depth() }
    } catch (e) {
      logger.error(`[TextCheck] enqueue failed for ${job && job.takeId}: ${e.message}`)
      return { queued: false }
    }
  }

  function push (rec, buffer) {
    if (queued.has(rec.takeId)) return
    queued.add(rec.takeId)
    queue.push({ rec, buffer })
    pump()
  }

  function depth () { return queue.length + running }

  function pump () {
    while (running < concurrency && queue.length) {
      const item = queue.shift()
      running++
      runOne(item).catch((e) => logger.error(`[TextCheck] check of ${item.rec.takeId} failed outside the guard: ${e && e.message}`))
        .finally(() => {
          running--
          queued.delete(item.rec.takeId)
          pump()
          if (!running && !queue.length) { const w = idleWaiters; idleWaiters = []; w.forEach(f => f()) }
        })
    }
  }

  function finish (rec, verdict) {
    if (rec.voiceId && rec.lineId) {
      append(rec.voiceId, {
        e: 'check',
        lineId: rec.lineId,
        takeId: rec.takeId,
        audioId: rec.audioId || null,
        courseCode: rec.courseCode || null,
        text: String(rec.text).slice(0, 300),
        checked: verdict.checked === true,
        pass: verdict.checked === true ? verdict.pass === true : null,
        reason: verdict.reason || null,
        similarity: verdict.similarity ?? null,
        heard: String(verdict.primedDecode || verdict.decode || '').slice(0, 300) || null,
        at: iso(),
      })
    }
    if (durable) {
      for (const f of [jobPath(rec.takeId), audioPath(rec.takeId)]) { try { fs.unlinkSync(f) } catch { /* already gone */ } }
    }
  }

  async function runOne ({ rec, buffer }) {
    let buf = buffer
    if (durable) {
      // Count the start BEFORE the decode, so a job that kills the process every time it runs is
      // given up on rather than retried for ever.
      rec.attempts = (rec.attempts || 0) + 1
      try { writeAtomic(jobPath(rec.takeId), JSON.stringify(rec)) } catch { /* the in-memory run still goes ahead */ }
      if (!buf) { try { buf = fs.readFileSync(audioPath(rec.takeId)) } catch { buf = null } }
    }
    if (!buf) {
      logger.warn(`[TextCheck] take ${rec.takeId}: its bytes are gone — recorded as NOT CHECKED`)
      return finish(rec, { checked: false, reason: 'unchecked_bytes_missing' })
    }
    if (rec.attempts > MAX_ATTEMPTS) {
      logger.warn(`[TextCheck] take ${rec.takeId}: started ${rec.attempts - 1} times without finishing — recorded as NOT CHECKED`)
      return finish(rec, { checked: false, reason: 'unchecked_gave_up' })
    }
    let verdict
    try {
      verdict = await check(buf, rec.text, rec.language, { meta: { audioId: rec.audioId || rec.takeId, courseCode: rec.courseCode, role: rec.kind } })
    } catch (e) {
      verdict = { checked: false, reason: 'unchecked_decode_error', detail: String(e && e.message).slice(0, 200) }
    }
    verdict = verdict || { checked: false, reason: 'unchecked_no_verdict' }
    const at = iso()
    if (verdict.checked === false) {
      logger.warn(`[TextCheck] ${at} take ${rec.takeId} NOT CHECKED against its script: ${verdict.reason} — saved UNCHECKED.`)
    } else if (verdict.pass === false) {
      logger.warn(`[TextCheck] ${at} take ${rec.takeId} does not verify against its script (${verdict.reason}, similarity ${verdict.similarity ?? 'n/a'}) — saved, and on ${rec.voiceId || '?'}'s re-record list. want: ${JSON.stringify(String(rec.text).slice(0, 80))} heard: ${JSON.stringify(String(verdict.primedDecode || verdict.decode).slice(0, 80))}`)
    } else {
      logger.log(`[TextCheck] ${at} take ${rec.takeId} verifies (${verdict.reason})`)
    }
    finish(rec, verdict)
  }

  /** Re-queue every check a restart interrupted. Returns how many. */
  function recover () {
    if (!durable) return 0
    let names = []
    try { names = fs.readdirSync(pendingDir) } catch { return 0 }
    let n = 0
    for (const name of names) {
      if (!name.endsWith('.json')) continue
      try {
        const rec = JSON.parse(fs.readFileSync(path.join(pendingDir, name), 'utf8'))
        if (!rec || !rec.takeId) continue
        push(rec, null)
        n++
      } catch (e) {
        logger.warn(`[TextCheck] unreadable pending check ${name}: ${e.message}`)
      }
    }
    if (n) logger.log(`[TextCheck] ${iso()} re-queued ${n} script check(s) a restart interrupted`)
    return n
  }

  /** The live failed-check list over every spelling of a voice. */
  function failuresFor (voiceIds) {
    const ids = [...new Set((Array.isArray(voiceIds) ? voiceIds : [voiceIds]).filter(Boolean))]
    const events = []
    for (const v of ids) events.push(...readEvents(v))
    events.sort((a, b) => String(a.at).localeCompare(String(b.at)))
    return failuresFromEvents(events, { now: now() })
  }

  /** The artist listened to a flagged take and kept it: it leaves the list. */
  function keep ({ voiceId, lineId, takeId }) {
    if (!voiceId || !lineId || !takeId) return false
    append(voiceId, { e: 'keep', lineId, takeId, at: iso() })
    return true
  }

  function idle () {
    if (!running && !queue.length) return Promise.resolve()
    return new Promise((resolve) => idleWaiters.push(resolve))
  }

  return { enqueue, noteTake, recover, failuresFor, keep, depth, idle, dir, get durable () { return durable } }
}

// ---------------------------------------------------------------------------
// Orphaned decoders
// ---------------------------------------------------------------------------

/**
 * Production's unit runs with KillMode=process, so a restart kills node and leaves any whisper or
 * ffmpeg it had spawned running — reparented to PID 1, still holding one of the whisper
 * wrapper's three global slots (#833 saw one). The script check's decoders are recognisable by
 * their scratch files (`<tmpdir>/veracity-<uuid>…`, audio-veracity.decodeAudio). One is an orphan
 * when no process in its ancestry is a live node process: phase8 or a second API, decoding their
 * own clips, keep their chain intact and are never touched.
 *
 * @param {object} [o]
 * @param {string} [o.procRoot] '/proc'
 * @param {number} [o.uid] only this user's processes
 * @param {Function} [o.kill] (pid) => void
 * @returns {number[]} pids killed
 */
function reapOrphanedDecoders (o = {}) {
  const procRoot = o.procRoot || '/proc'
  const uid = o.uid == null ? (process.getuid ? process.getuid() : null) : o.uid
  const kill = o.kill || ((pid) => process.kill(pid, 'SIGKILL'))
  const logger = o.logger || console
  let pids
  try { pids = fs.readdirSync(procRoot).filter((n) => /^\d+$/.test(n)).map(Number) } catch { return [] }
  const info = new Map()
  const read = (pid) => {
    if (info.has(pid)) return info.get(pid)
    let v = null
    try {
      const status = fs.readFileSync(path.join(procRoot, String(pid), 'status'), 'utf8')
      const ppid = Number((status.match(/^PPid:\s*(\d+)/m) || [])[1] || 0)
      const puid = Number((status.match(/^Uid:\s*(\d+)/m) || [])[1])
      const cmd = fs.readFileSync(path.join(procRoot, String(pid), 'cmdline'), 'utf8').split('\0').filter(Boolean)
      v = { pid, ppid, uid: puid, cmd }
    } catch { v = null }
    info.set(pid, v)
    return v
  }
  const isNode = (p) => p && p.cmd.length && /(^|\/)node(js)?$/.test(p.cmd[0])
  const killed = []
  for (const pid of pids) {
    const p = read(pid)
    if (!p || (uid != null && p.uid !== uid)) continue
    if (!p.cmd.some((a) => /\/veracity-[0-9a-f-]{8,}/i.test(a))) continue
    if (!/whisper|ffmpeg/i.test(p.cmd[0] || '')) continue
    let up = p.ppid
    let owned = false
    for (let hops = 0; up > 1 && hops < 64; hops++) {
      const a = read(up)
      if (!a) break
      if (isNode(a)) { owned = true; break }
      up = a.ppid
    }
    if (owned) continue
    try { kill(pid); killed.push(pid) } catch { /* gone already */ }
  }
  if (killed.length) logger.warn(`[TextCheck] killed ${killed.length} orphaned decoder(s) a restart left running: ${killed.join(', ')}`)
  return killed
}

module.exports = {
  createTextCheckQueue,
  failuresFromEvents,
  reapOrphanedDecoders,
  MAX_ATTEMPTS,
  FAILURE_WINDOW_MS,
}
