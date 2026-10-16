/**
 * booth-upload-concurrency.cjs — HOW MANY TAKES ONE BOOTH MAY SEND AT ONCE, AND THE
 * SERVER-SIDE GUARD THAT KEEPS TWO TAKES OF ONE LINE FROM RACING.
 *
 * Aran, 2026-10-16 (Phase 1 of the upload plan, job #221): the booth sends two takes at once
 * instead of one, falling back to one by itself on any trouble
 * (src/services/uploadConcurrency.js). His condition was that the number must be settable back
 * to 1 WITHOUT A DEPLOY, so the server says it on every take reply in the
 * X-Booth-Upload-Concurrency header, and reads it from a one-line file that anyone on watson-1
 * can write:
 *
 *     echo 1 > ~/.local/state/ssi-booth-upload-concurrency-3470     # back to one at a time
 *     rm ~/.local/state/ssi-booth-upload-concurrency-3470           # back to the default (2)
 *
 * It is re-read at most every RELOAD_MS, so a change reaches every booth on its next answer with
 * no restart. BOOTH_UPLOAD_CONCURRENCY on the unit sets the default when there is no file. The
 * booth clamps whatever it hears to its own ceiling of 2, so a typo here cannot open the
 * floodgates; this side clamps to 1..HARD_MAX for the same reason.
 *
 * THE LINE LOCK. Two takes of the same line (or of the same words — the natural take is filed
 * into course_audio by its normalised text, and supersedeEarlierTakes marks every OTHER take of
 * those words) must be filed one after the other: run together, each can mark the other
 * superseded, and the course_audio upsert's last writer is whichever finished second rather
 * than whichever was read second. The booth already never sends two such takes at once; this
 * lock is the same rule held where every device meets — two tabs, two phones, a retry that
 * overtakes its own timed-out original. It is FIFO per key and in-process (one API process
 * files a voice's takes), and a wait never exceeds WAIT_CAP_MS: past that the take proceeds
 * unserialised, exactly as every take did before this lock existed, because a take that cannot
 * be filed is worse than one filed out of order.
 */
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')

const HEADER = 'X-Booth-Upload-Concurrency'
const HARD_MAX = 2
const DEFAULT = 2
const RELOAD_MS = 5000
const WAIT_CAP_MS = 60000

function defaultFile (env = process.env) {
  if (env.BOOTH_UPLOAD_CONCURRENCY_FILE) return env.BOOTH_UPLOAD_CONCURRENCY_FILE
  const port = env.PRODUCTION_API_PORT || env.PORT || '3470'
  return path.join(os.homedir(), '.local', 'state', `ssi-booth-upload-concurrency-${port}`)
}

function clamp (v) {
  const n = Math.floor(Number(String(v).trim()))
  if (!Number.isFinite(n) || String(v).trim() === '') return null
  return Math.max(1, Math.min(HARD_MAX, n))
}

/**
 * @param {object} [o]
 * @param {string} [o.file]   the one-line knob
 * @param {object} [o.env]
 * @param {object} [o.fsImpl] fs, injectable for tests
 * @param {Function} [o.now]
 */
function createConcurrencySetting (o = {}) {
  const env = o.env || process.env
  const file = o.file || defaultFile(env)
  const fsImpl = o.fsImpl || fs
  const now = o.now || (() => Date.now())
  const fallback = clamp(env.BOOTH_UPLOAD_CONCURRENCY) || DEFAULT
  let cached = null
  let readAt = -Infinity

  function current () {
    const t = now()
    if (cached != null && t - readAt < RELOAD_MS) return cached
    readAt = t
    let v = null
    try { v = clamp(fsImpl.readFileSync(file, 'utf8')) } catch { v = null }
    cached = v == null ? fallback : v
    return cached
  }

  /** Set the header on a response. Never throws: the take matters more than the hint. */
  function advertise (res) {
    try { res.set(HEADER, String(current())) } catch { /* headers already sent */ }
  }

  return { current, advertise, file }
}

/** Same words, same slot: the key the line lock serialises on. Over-normalising only serialises more. */
function lineLockKey ({ voiceId, lineId, text }) {
  const words = String(text || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’ʼ']/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
  return `${voiceId || ''}|${words ? `text:${words}` : `line:${lineId}`}`
}

/**
 * A FIFO lock per key. acquire(key) resolves to a release function once every earlier holder of
 * that key has released, or after waitCapMs, whichever is first. Keys with no holders are
 * forgotten, so the map stays the size of what is in flight.
 */
function createKeyedLock ({ waitCapMs = WAIT_CAP_MS, onTimeout } = {}) {
  const tails = new Map() // key -> promise that settles when the last holder releases

  async function acquire (key) {
    const prev = tails.get(key) || Promise.resolve()
    let release
    const mine = new Promise((resolve) => { release = resolve })
    const tail = prev.then(() => mine)
    tails.set(key, tail)
    let timer = null
    const capped = new Promise((resolve) => {
      timer = setTimeout(() => { if (onTimeout) onTimeout(key); resolve() }, waitCapMs)
      if (timer.unref) timer.unref()
    })
    await Promise.race([prev, capped])
    clearTimeout(timer)
    let done = false
    return function releaseLock () {
      if (done) return
      done = true
      release()
      if (tails.get(key) === tail) tails.delete(key)
    }
  }

  return { acquire, get size () { return tails.size } }
}

module.exports = { createConcurrencySetting, createKeyedLock, lineLockKey, HEADER, HARD_MAX, DEFAULT, RELOAD_MS, WAIT_CAP_MS }
