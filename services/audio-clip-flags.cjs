/**
 * audio-clip-flags.cjs — the detector's flag queue on course audio.
 *
 * A flag says "a human should look at this clip". Nothing here touches audio,
 * passes anything, or repairs anything: raising a flag puts a clip in somebody's
 * field of view, and the only two exits are a human clearing it with their name
 * and their reason, or a repair replacing the bytes so the revision moves past it
 * arithmetically.
 *
 * WHERE IT CAME FROM. These three functions and the `audio_clip_flags` table were
 * built inside services/course-qa-gate.cjs, the manual play-through approval gate.
 * That gate was deleted on 2026-09-07 (Tom: "let us just remove this - something
 * that has not been used, ever, is clearly not valuable enough") — in thirteen
 * months it never passed a single course and no human ever signed off a single
 * round. The flag queue is a different thing that merely lived in the same file:
 * services/audio-tail-scan.cjs produces detector rows and POST
 * /api/audio/tail-scan/:courseCode/flags makes them durable, and that path works
 * and is wanted. So it moved here rather than dying of association.
 *
 * There is deliberately no `passed`, no verdict and no gate status anywhere in
 * this module. A flag is a piece of work, never an assurance.
 */

class FlagError extends Error {
  constructor (message, status = 400, code = 'clip_flag_error', extra = {}) {
    super(message)
    this.status = status
    this.code = code
    Object.assign(this, extra)
  }
}

/**
 * @param {object} deps
 * @param {function} deps.getDb  () -> supabase client
 * @param {object}   [deps.logger]
 */
function createClipFlags (deps) {
  const { getDb, logger = console } = deps
  const db = () => {
    const client = getDb()
    if (!client) throw new FlagError('Supabase not initialised', 503, 'no_db')
    return client
  }

  /** Supabase errors carry no HTTP status; give them one rather than a 500 wall. */
  const orThrow = (res, what) => {
    if (res.error) throw new FlagError(`${what}: ${res.error.message}`, 500, 'db_error')
    return res.data
  }

  /**
   * Open flags for a course, newest first, with enough of the clip to act on.
   * This is the actionable tail of a flagged round — each row's audioId is
   * the handle the audio-repair panel takes.
   */
  async function openFlags ({ courseCode, limit = 200 }) {
    const flags = orThrow(await db()
      .from('audio_clip_flags')
      .select('id, audio_id, audio_revision, source, detector, detector_precision, severity, reason, raised_by, raised_at')
      .eq('course_code', courseCode).is('resolution', null)
      .order('raised_at', { ascending: false }).limit(Math.min(Number(limit) || 200, 1000)),
    'read flags') || []
    if (flags.length === 0) return { courseCode, flags: [] }

    const clips = orThrow(await db()
      .from('course_audio').select('id, text, role, audio_revision, duration_ms')
      .in('id', flags.map(f => f.audio_id)),
    'read flagged clips') || []
    const byId = new Map(clips.map(c => [c.id, c]))

    return {
      courseCode,
      flags: flags.map(f => {
        const clip = byId.get(f.audio_id) || null
        return {
          ...f,
          clip,
          // A flag raised against bytes that have since been replaced is not
          // holding anything down. Say so rather than let it read as live.
          superseded: clip ? clip.audio_revision > f.audio_revision : false,
        }
      }),
    }
  }

  /**
   * Raise MACHINE flags — the detector's findings, made durable.
   *
   * WHY THIS EXISTS (Tom's ruling, 2026-08-06). The detector is the machine
   * proof-of-quality step feeding the Audio Preview sampler and whoever is repairing
   * clips. A finding that evaporates when the scan process ends cannot do that job, so
   * the rows the scan already produces get a home here rather than living in one API
   * process's memory.
   *
   * ── A FLAG IS AN ANNOTATION, NOT A MUTATION ───────────────────────────────────────
   * Nothing here touches audio. Raising a flag puts a clip in a human's field of view and
   * nothing else. The two exits are unchanged and both are honest: a human clears it with
   * their name and their reason (`clearFlag`), or a repair replaces the bytes and the
   * revision moves past it arithmetically.
   *
   * ── MACHINE-ATTRIBUTED, AND ALSO ATTRIBUTED TO A PERSON ───────────────────────────
   * `source='detector'` is enforced, not merely expected — this function refuses to write
   * a row claiming to be human. `detector` and `detector_precision` travel on every row so
   * a reviewer reading a flag sees which machine said it and how far to trust it. And
   * `actor` is required: somebody pressed the button, and a flag nobody can be asked about
   * is a flag nobody deals with. `raised_by` records both, as "<detector> via <actor>".
   *
   * ── IDEMPOTENT, BECAUSE A SCAN IS RE-RUNNABLE ─────────────────────────────────────
   * The natural thing to do with a scan is run it again. Without this check the second run
   * doubles every open flag, the third triples it, and the queue becomes noise nobody
   * trusts. A clip already carrying an UNRESOLVED flag from the same detector at the same
   * revision is skipped and counted as `alreadyOpen`. Deliberately scoped to unresolved:
   * a human who cleared a flag and then the SAME revision gets re-flagged has been
   * overruled by a machine, so re-raising is refused and reported as `clearedAlready` —
   * the machine does not get to reopen a human's decision. A NEW revision is a different
   * clip and may be flagged afresh.
   *
   * @param {object} a
   * @param {string} a.courseCode
   * @param {Array<object>} a.rows   as produced by audio-tail-scan's flagRowsFromScan
   * @param {string} a.actor         the human who ran the scan and pressed raise
   */
  async function raiseDetectorFlags ({ courseCode, rows = [], actor }) {
    if (!actor) throw new FlagError('actor is required — a machine flag still needs a person to answer for it', 400, 'no_actor')
    if (!Array.isArray(rows)) throw new FlagError('rows must be an array', 400, 'bad_rows')
    const candidates = rows.filter(r => r && r.audio_id)
    if (candidates.some(r => r.source && r.source !== 'detector')) {
      throw new FlagError("raiseDetectorFlags only writes source='detector' rows — a human flag comes from a sign-off",
        400, 'not_a_detector_flag')
    }
    if (candidates.some(r => r.course_code && r.course_code !== courseCode)) {
      throw new FlagError('every row must belong to the course being flagged', 400, 'course_mismatch')
    }
    if (!candidates.length) return { courseCode, raised: 0, alreadyOpen: 0, clearedAlready: 0, flags: [] }

    // What is already known about these clips, so a re-run is cheap and quiet.
    const ids = [...new Set(candidates.map(r => r.audio_id))]
    const existing = []
    for (let i = 0; i < ids.length; i += 200) {
      existing.push(...(orThrow(await db()
        .from('audio_clip_flags')
        .select('audio_id, audio_revision, detector, resolution')
        .eq('course_code', courseCode).eq('source', 'detector')
        .in('audio_id', ids.slice(i, i + 200)),
      'read existing flags') || []))
    }
    const key = (audioId, rev, detector) => `${audioId}|${rev ?? 1}|${detector || ''}`
    const open = new Set(), resolved = new Set()
    for (const e of existing) {
      ;(e.resolution ? resolved : open).add(key(e.audio_id, e.audio_revision, e.detector))
    }

    let alreadyOpen = 0, clearedAlready = 0
    const toWrite = []
    for (const r of candidates) {
      const k = key(r.audio_id, r.audio_revision, r.detector)
      if (open.has(k)) { alreadyOpen++; continue }
      if (resolved.has(k)) { clearedAlready++; continue }
      toWrite.push({
        ...r,
        course_code: courseCode,
        source: 'detector',
        raised_by: `${r.detector || 'detector'} via ${actor}`,
      })
      open.add(k) // a scan that lists one clip twice must not insert it twice
    }

    const flags = []
    for (let i = 0; i < toWrite.length; i += 500) {
      flags.push(...(orThrow(await db().from('audio_clip_flags')
        .insert(toWrite.slice(i, i + 500)).select('id, audio_id'), 'raise detector flags') || []))
    }

    logger.log?.(`[clip-flags] ${actor} raised ${flags.length} detector flag(s) on ${courseCode}` +
      `${alreadyOpen ? `, ${alreadyOpen} already open` : ''}${clearedAlready ? `, ${clearedAlready} already cleared by a human and NOT reopened` : ''}`)
    return { courseCode, raised: flags.length, alreadyOpen, clearedAlready, flags }
  }

  /**
   * Clear a flag. There is exactly one automated-sounding thing this will
   * never do: decide. `actor` is a human, `reason` is their words, and the
   * only other exit from a flag is a repair replacing the bytes — which the
   * clip-status view already handles without writing anything here.
   */
  async function clearFlag ({ flagId, actor, reason }) {
    if (!actor) throw new FlagError('actor is required — only a human may clear a flag', 400, 'no_actor')
    if (!reason || !String(reason).trim()) {
      throw new FlagError('reason is required — clearing a flag is a judgement and must be attributable',
        400, 'no_reason')
    }
    const updated = orThrow(await db().from('audio_clip_flags').update({
      resolution: 'cleared_by_human',
      resolved_by: actor,
      resolved_at: new Date().toISOString(),
      resolution_reason: String(reason).trim(),
    }).eq('id', flagId).is('resolution', null).select('id, audio_id, course_code').maybeSingle(),
    'clear flag')
    if (!updated) throw new FlagError('Flag not found or already resolved', 404, 'unknown_flag')
    logger.log?.(`[clip-flags] ${actor} cleared flag ${flagId}: ${reason}`)
    return updated
  }

  return { openFlags, raiseDetectorFlags, clearFlag }
}

module.exports = { createClipFlags, FlagError }
