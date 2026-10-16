// src/services/uploadConcurrency.js
//
// HOW MANY BOOTH TAKES MAY BE ON THE WIRE AT ONCE (Aran, 2026-10-16, Phase 1 of
// the upload-speed plan, job #221). Phase 0 (#842) made the server answer as
// soon as a take is stored, mastered and through its refusal gates, which took
// the drain from ~4 to ~10 takes a minute. Phase 1 lets the booth send TWO at
// once — but Aran's condition was that it must fall back to one by itself the
// moment the server shows any strain, and only climb back after a run of clean
// answers. This file is that rule and nothing else, so it can be tested without
// a network, a shelf or a clock.
//
// The rule:
//   • Start at ONE. The server's advertised ceiling is unknown until it has
//     answered once, and an unknown ceiling is treated as 1.
//   • The server says what it will take in the X-Booth-Upload-Concurrency
//     header on every take reply. That is the switch that sets the whole estate
//     back to one-at-a-time without a deploy
//     (services/voice-engine/booth-upload-concurrency.cjs). It is clamped to
//     HARD_MAX here, so a typo on the server cannot open the floodgates.
//   • TROUBLE drops straight to one: any transient failure (network, timeout,
//     5xx, 429, 408) and any answer slower than SLOW_MS. A refusal of the take's
//     own bytes (422 and friends) is a verdict on the recording, not on the
//     server, and counts neither way.
//   • Climb ONE step only after STEP_UP_AFTER clean answers in a row, and start
//     counting again from zero after every step and every trouble.

export const HARD_MAX = 2
export const STEP_UP_AFTER = 3
// A Phase 0 take answers in ~2-4 s of server time. Fifteen seconds is "the
// server or the line is struggling", not a performance budget.
export const SLOW_MS = 15000
export const CONCURRENCY_HEADER = 'x-booth-upload-concurrency'

export function parseAdvertised(value) {
  if (value == null || value === '') return null
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n)) return null
  return Math.max(1, Math.min(HARD_MAX, n))
}

export function createUploadConcurrency({ stepUpAfter = STEP_UP_AFTER, slowMs = SLOW_MS } = {}) {
  let serverMax = 1
  let limit = 1
  let clean = 0

  return {
    get limit() { return limit },
    get serverMax() { return serverMax },
    get cleanStreak() { return clean },

    /** Adopt the server's ceiling. Never raises `limit` by itself — only clean answers do. */
    advertise(value) {
      const n = parseAdvertised(value)
      if (n == null) return
      serverMax = n
      if (limit > serverMax) limit = serverMax
    },

    /** A 2xx. Slow counts as trouble even though the take is safe. */
    success(elapsedMs) {
      if (elapsedMs != null && elapsedMs > slowMs) { this.trouble(); return }
      // Only answers given while there is room to climb count towards a
      // climb: a run banked at the ceiling is not a run at the next step.
      if (limit >= serverMax) { clean = 0; return }
      clean += 1
      if (clean >= stepUpAfter) {
        limit += 1
        clean = 0
      }
    },

    /** Any transient failure, 429/503, timeout. Down to one, count from zero. */
    trouble() {
      limit = 1
      clean = 0
    },
  }
}

/**
 * Is this failure the SERVER's trouble (retry, slow down) rather than a verdict
 * on the take's bytes (keep it as refused)? 408 and 429 are 4xx but are the
 * server asking us to come back later — before Phase 1 they would have been
 * filed as a refusal and the take parked for a human, which is wrong.
 */
export function isTransientStatus(status) {
  if (status == null) return true
  if (status === 408 || status === 429) return true
  return status < 400 || status >= 500
}

/**
 * The keys a take holds while it is on the wire. Two takes sharing any key are
 * never in flight together:
 *   • the same lineId — a re-read must not race the read it replaces;
 *   • the same words — the server files natural takes by text (course_audio is
 *     upserted on its normalised text, earlier takes of the same words are
 *     superseded, duplicates of the line are filled), so two DIFFERENT lines
 *     with identical words are the same slot on the server and must go up one
 *     after the other, exactly as they did when the queue was sequential.
 * Over-normalising here only ever serialises more, never less.
 */
export function inFlightKeys(rec) {
  const keys = [`line:${rec.lineId}`]
  const words = String(rec.text || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’ʼ']/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
  if (words) keys.push(`text:${words}`)
  return keys
}
