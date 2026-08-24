/**
 * course-qa-gate.cjs — the manual approval gate.
 *
 * "No course should EVER go out to learners unless it has passed a manual
 * approval gate." (Tom, 2026-08-05, after playing the first ten minutes of
 * the live deu_for_eng course.) And the shape of it, in his words: sampling
 * is fine for the body of a course, but "we MUST manually play through the
 * first X ROUNDS" — X = 100 for paid, 20 for free.
 *
 * Schema and the full why: ops/sql/20260805-course-qa-gate.sql.
 *
 * ── The two laws this module refuses to break ──────────────────────────────
 *
 * 1. MACHINES MAY FLAG AUDIO; ONLY HUMANS MAY PASS IT.
 *    There is no function here that passes a round, clears a flag or passes a
 *    gate on its own judgement. `evaluateGate` looks like an exception and is
 *    not: it only counts sign-offs that humans already made, and it can only
 *    ever conclude what those sign-offs already say. Every write below takes
 *    an `actor` and records it.
 *
 * 2. A PASS IS AGAINST SPECIFIC BYTES.
 *    Nothing in here has to remember to invalidate anything, which is the
 *    point. Clip sign-off is keyed on (audio_id, audio_revision); round
 *    sign-off stores a fingerprint over every (audio_id, revision) in the
 *    round plus courses.version. Accepting an audio repair bumps the
 *    revision, so the clip's pass stops matching and the round's fingerprint
 *    moves — both go stale by arithmetic. That is deliberately NOT wired into
 *    services/audio-repair-core.cjs: a coupling that has to fire is a
 *    coupling that can fail to fire, and this one cannot.
 *
 * ── Object model ───────────────────────────────────────────────────────────
 * A ROUND is a LEGO (course_round_index.round_index -> lego_id) — position is
 * the LEGO, never the seed. A CYCLE is one item inside it, keyed exactly as
 * the learner-facing API keys it (`<legoId>_intro`, `_debut`, `_build_<n>`,
 * `_use_<n>`), so a producer and a learner are provably discussing the same
 * thing.
 */

const LEARNER_VISIBLE_STATUSES = ['live', 'beta']

/** X's defaults. Stored per course; these only seed a course that has no row. */
const DEFAULT_REQUIRED_ROUNDS = { premium: 100, free: 20, community: 20 }

class GateError extends Error {
  constructor (message, status = 400, code = 'qa_gate_error', extra = {}) {
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
function createGate (deps) {
  const { getDb, logger = console } = deps
  const db = () => {
    const client = getDb()
    if (!client) throw new GateError('Supabase not initialised', 503, 'no_db')
    return client
  }

  /** Supabase errors carry no HTTP status; give them one rather than a 500 wall. */
  const orThrow = (res, what) => {
    if (res.error) throw new GateError(`${what}: ${res.error.message}`, 500, 'db_error')
    return res.data
  }

  // ── Gate row ─────────────────────────────────────────────────────────────

  /**
   * Read the gate row, creating it on first touch with X seeded from the
   * course's pricing tier. 'community' counts as free (taste-safe default,
   * 2026-08-05) — it is a tier that is not paid for, and X follows payment.
   */
  async function ensureGate (courseCode) {
    const existing = orThrow(await db()
      .from('course_qa_gate').select('*').eq('course_code', courseCode).maybeSingle(),
    'read gate')
    if (existing) return existing

    const course = orThrow(await db()
      .from('courses').select('course_code, pricing_tier')
      .eq('course_code', courseCode).maybeSingle(),
    'read course')
    if (!course) throw new GateError(`Unknown course ${courseCode}`, 404, 'unknown_course')

    const requiredRounds =
      DEFAULT_REQUIRED_ROUNDS[course.pricing_tier] ?? DEFAULT_REQUIRED_ROUNDS.free

    const inserted = orThrow(await db()
      .from('course_qa_gate')
      .upsert({ course_code: courseCode, gate_status: 'unpassed', required_rounds: requiredRounds },
        { onConflict: 'course_code' })
      .select('*').single(),
    'create gate')
    return inserted
  }

  /**
   * Recompute gate_status from the sign-offs humans have already recorded.
   *
   * This counts; it does not judge. The gate is passed when every round in
   * the first X has a CURRENT human pass — current meaning the bytes and the
   * content version it was given against are still what a learner would get.
   * A stale sign-off is not a pass, so a repair accepted after sign-off pulls
   * the gate back down without anyone having to notice.
   */
  async function evaluateGate (courseCode, { actor = null } = {}) {
    const gate = await ensureGate(courseCode)

    const rounds = orThrow(await db()
      .from('course_qa_round_status')
      .select('round_index, status')
      .eq('course_code', courseCode)
      .lte('round_index', gate.required_rounds)
      .order('round_index'),
    'read round status') || []

    const windowSize = rounds.length
    const passed = rounds.filter(r => r.status === 'passed').length
    const flagged = rounds.filter(r => r.status === 'flagged').length
    const stale = rounds.filter(r => r.status === 'stale').length

    // A course with no rounds materialised cannot be passed — there is
    // nothing to have played. That is an honest unpassed, not a vacuous pass.
    let status = 'unpassed'
    if (windowSize > 0 && passed === windowSize) status = 'passed'
    else if (passed > 0 || flagged > 0 || stale > 0) status = 'in_progress'

    const patch = { gate_status: status, updated_at: new Date().toISOString() }
    if (status === 'passed' && gate.gate_status !== 'passed') {
      const course = orThrow(await db()
        .from('courses').select('version').eq('course_code', courseCode).maybeSingle(),
      'read course version')
      // passed_by is whoever's sign-off completed the set — a human, always.
      patch.passed_by = actor || gate.passed_by || 'unknown'
      patch.passed_at = new Date().toISOString()
      patch.passed_version = course?.version ?? null
    } else if (status !== 'passed') {
      patch.passed_by = null
      patch.passed_at = null
      patch.passed_version = null
    }

    const updated = orThrow(await db()
      .from('course_qa_gate').update(patch).eq('course_code', courseCode).select('*').single(),
    'update gate')

    return {
      ...updated,
      progress: { windowSize, passed, flagged, stale, remaining: windowSize - passed },
    }
  }

  /** X is per course, and changing it is a decision worth attributing. */
  async function setRequiredRounds (courseCode, requiredRounds, actor) {
    const x = Number(requiredRounds)
    if (!Number.isInteger(x) || x < 0) {
      throw new GateError('requiredRounds must be a non-negative integer', 400, 'bad_required_rounds')
    }
    await ensureGate(courseCode)
    orThrow(await db().from('course_qa_gate')
      .update({ required_rounds: x, notes: `X set to ${x} by ${actor}`, updated_at: new Date().toISOString() })
      .eq('course_code', courseCode).select('course_code').single(),
    'set required rounds')
    logger.log?.(`[qa-gate] ${actor} set X=${x} for ${courseCode}`)
    return evaluateGate(courseCode)
  }

  // ── Rounds: the play-through queue ───────────────────────────────────────

  /**
   * The first X rounds (or a window of them), each with its derived cycle
   * rollup, its sign-off and who it is assigned to. This is the listening
   * worklist.
   */
  async function rounds ({ courseCode, from = 1, limit = 100, all = false }) {
    const gate = await ensureGate(courseCode)
    const start = Math.max(1, Number(from) || 1)
    const end = all ? Number.MAX_SAFE_INTEGER : start + Math.min(Number(limit) || 100, 500) - 1

    let q = db().from('course_qa_round_status').select('*')
      .eq('course_code', courseCode).gte('round_index', start).order('round_index')
    if (!all) q = q.lte('round_index', end)

    const rows = orThrow(await q, 'read rounds') || []
    return {
      courseCode,
      requiredRounds: gate.required_rounds,
      gateStatus: gate.gate_status,
      rounds: rows.map(r => ({ ...r, inGateWindow: r.round_index <= gate.required_rounds })),
    }
  }

  /** The cycles of one round, with their derived verification status. */
  async function cycles ({ courseCode, legoId }) {
    const rows = orThrow(await db()
      .from('course_qa_cycle_status').select('*')
      .eq('course_code', courseCode).eq('lego_id', legoId)
      .order('cycle_type').order('cycle_ordinal'),
    'read cycles') || []
    return { courseCode, legoId, cycles: rows }
  }

  /**
   * Every clip in one round, with its text and derived status.
   *
   * This is what the flag dialog needs: to flag a round usefully a human has
   * to be able to say WHICH clip was wrong, and a flag is only actionable in
   * the repair flow if it carries an audio_id.
   */
  async function roundClips ({ courseCode, legoId }) {
    const clips = orThrow(await db()
      .from('course_qa_cycle_clips')
      .select('cycle_key, cycle_type, cycle_ordinal, audio_id, audio_role')
      .eq('course_code', courseCode).eq('lego_id', legoId)
      .order('cycle_type').order('cycle_ordinal').order('audio_role'),
    'read round clips') || []
    if (clips.length === 0) return { courseCode, legoId, clips: [] }

    const ids = [...new Set(clips.map(c => c.audio_id))]
    const [audio, statuses] = await Promise.all([
      db().from('course_audio').select('id, text, role, duration_ms, audio_revision')
        .in('id', ids).then(r => orThrow(r, 'read clip text')),
      db().from('course_qa_clip_status').select('audio_id, status, signed_off_by, open_flags')
        .in('audio_id', ids).then(r => orThrow(r, 'read clip status')),
    ])
    const byId = new Map((audio || []).map(a => [a.id, a]))
    const stById = new Map((statuses || []).map(s => [s.audio_id, s]))

    return {
      courseCode,
      legoId,
      clips: clips.map(c => ({
        ...c,
        text: byId.get(c.audio_id)?.text ?? null,
        duration_ms: byId.get(c.audio_id)?.duration_ms ?? null,
        audio_revision: byId.get(c.audio_id)?.audio_revision ?? null,
        status: stById.get(c.audio_id)?.status ?? 'unverified',
        signed_off_by: stById.get(c.audio_id)?.signed_off_by ?? null,
      })),
    }
  }

  /**
   * Record a human's verdict on a round they have just played through in the
   * REAL learning app.
   *
   * The fingerprint and content version are read here, at sign-off time, from
   * the same view the UI displayed — so the row says exactly what was heard.
   *
   * A 'flagged' verdict is not a dead note field: every clip named in
   * `flaggedAudioIds` gets a real row in audio_clip_flags with source='human',
   * which puts it in the repair flow's field of view and — because only a
   * human action or a byte replacement can clear it — holds the round down
   * until someone actually deals with it.
   */
  async function signOffRound ({ courseCode, roundIndex, verdict, notes, flaggedAudioIds = [], actor }) {
    if (!['passed', 'flagged'].includes(verdict)) {
      throw new GateError("verdict must be 'passed' or 'flagged'", 400, 'bad_verdict')
    }
    if (!actor) throw new GateError('actor is required — a sign-off must name a human', 400, 'no_actor')
    const idx = Number(roundIndex)
    if (!Number.isInteger(idx) || idx < 1) {
      throw new GateError('roundIndex must be a positive integer', 400, 'bad_round')
    }

    const round = orThrow(await db()
      .from('course_qa_round_status').select('*')
      .eq('course_code', courseCode).eq('round_index', idx).maybeSingle(),
    'read round')
    if (!round) {
      throw new GateError(
        `Round ${idx} not found for ${courseCode} — course_round_index may need REFRESH MATERIALIZED VIEW`,
        404, 'unknown_round')
    }

    const course = orThrow(await db()
      .from('courses').select('version').eq('course_code', courseCode).maybeSingle(),
    'read course version')

    // A round whose clips are all missing has no fingerprint. Signing that
    // off would be signing off silence, so refuse rather than record a pass
    // that means nothing.
    if (!round.audio_fingerprint) {
      throw new GateError(
        `Round ${idx} (${round.lego_id}) has no audio to sign off`, 409, 'no_audio')
    }

    orThrow(await db().from('course_round_signoffs').upsert({
      course_code: courseCode,
      round_index: idx,
      lego_id: round.lego_id,
      verdict,
      notes: notes || null,
      signed_off_by: actor,
      signed_off_at: new Date().toISOString(),
      content_version: course?.version ?? 0,
      audio_fingerprint: round.audio_fingerprint,
    }, { onConflict: 'course_code,round_index' }).select('id').single(), 'write signoff')

    // A PASSED round means a human just heard every clip in it, in the real
    // player, at these exact revisions. That IS a clip-level human pass, so
    // record it — which is what makes course_qa_cycle_status light up from
    // the play-through rather than needing a second human action per cycle.
    // Upsert on (audio_id, audio_revision): re-signing the same bytes is not
    // an error, it just refreshes who last heard them.
    let passedClips = 0
    if (verdict === 'passed') {
      const clips = orThrow(await db()
        .from('course_qa_cycle_clips').select('audio_id')
        .eq('course_code', courseCode).eq('lego_id', round.lego_id),
      'read round clips') || []
      const ids = [...new Set(clips.map(c => c.audio_id))]
      if (ids.length) {
        const revs = orThrow(await db()
          .from('course_audio').select('id, audio_revision').in('id', ids),
        'read clip revisions') || []
        orThrow(await db().from('audio_clip_signoffs').upsert(
          revs.map(r => ({
            audio_id: r.id,
            course_code: courseCode,
            audio_revision: r.audio_revision,
            signed_off_by: actor,
            signed_off_at: new Date().toISOString(),
            context: 'playthrough',
          })), { onConflict: 'audio_id,audio_revision' }).select('id'), 'sign off clips')
        passedClips = revs.length
      }
    }

    // Turn a flag into work, not a note.
    let raisedFlags = 0
    if (verdict === 'flagged' && flaggedAudioIds.length > 0) {
      const rows = flaggedAudioIds.map(audioId => ({
        audio_id: audioId,
        course_code: courseCode,
        source: 'human',
        severity: 'bad',
        reason: notes ? `Round ${idx} play-through: ${notes}` : `Flagged during round ${idx} play-through`,
        raised_by: actor,
      }))
      // Stamp each flag with the revision it is about, so a later repair
      // supersedes it arithmetically rather than leaving it open forever.
      const revs = orThrow(await db()
        .from('course_audio').select('id, audio_revision').in('id', flaggedAudioIds),
      'read clip revisions') || []
      const revById = new Map(revs.map(r => [r.id, r.audio_revision]))
      for (const row of rows) row.audio_revision = revById.get(row.audio_id) ?? 1

      orThrow(await db().from('audio_clip_flags').insert(rows).select('id'), 'raise flags')
      raisedFlags = rows.length
    }

    logger.log?.(`[qa-gate] ${actor} signed off ${courseCode} round ${idx} as ${verdict}` +
      (raisedFlags ? ` (+${raisedFlags} clip flags)` : ''))

    const gate = await evaluateGate(courseCode, { actor })
    return { courseCode, roundIndex: idx, verdict, passedClips, raisedFlags, gate }
  }

  // ── Flags: what a human must still deal with ─────────────────────────────

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
   * WHY THIS EXISTS (Tom's ruling, 2026-08-06). The detector is meant to be the machine
   * proof-of-quality step feeding this gate and the Audio Preview sampler. A finding that
   * evaporates when the scan process ends cannot do that job, so the rows the scan already
   * produces get a home here rather than living in one API process's memory.
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
    if (!actor) throw new GateError('actor is required — a machine flag still needs a person to answer for it', 400, 'no_actor')
    if (!Array.isArray(rows)) throw new GateError('rows must be an array', 400, 'bad_rows')
    const candidates = rows.filter(r => r && r.audio_id)
    if (candidates.some(r => r.source && r.source !== 'detector')) {
      throw new GateError("raiseDetectorFlags only writes source='detector' rows — a human flag comes from a sign-off",
        400, 'not_a_detector_flag')
    }
    if (candidates.some(r => r.course_code && r.course_code !== courseCode)) {
      throw new GateError('every row must belong to the course being flagged', 400, 'course_mismatch')
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

    logger.log?.(`[qa-gate] ${actor} raised ${flags.length} detector flag(s) on ${courseCode}` +
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
    if (!actor) throw new GateError('actor is required — only a human may clear a flag', 400, 'no_actor')
    if (!reason || !String(reason).trim()) {
      throw new GateError('reason is required — clearing a flag is a judgement and must be attributable',
        400, 'no_reason')
    }
    const updated = orThrow(await db().from('audio_clip_flags').update({
      resolution: 'cleared_by_human',
      resolved_by: actor,
      resolved_at: new Date().toISOString(),
      resolution_reason: String(reason).trim(),
    }).eq('id', flagId).is('resolution', null).select('id, audio_id, course_code').maybeSingle(),
    'clear flag')
    if (!updated) throw new GateError('Flag not found or already resolved', 404, 'unknown_flag')
    logger.log?.(`[qa-gate] ${actor} cleared flag ${flagId}: ${reason}`)
    return updated
  }

  // ── Assignment: dividing 100 rounds of listening ─────────────────────────

  /**
   * Claim a contiguous range of rounds, inclusive of both ends as a human
   * would say it ("rounds 1 to 25"), stored as the half-open int4range the
   * exclusion constraint needs.
   *
   * Overlap is refused by the database, not by this function — which is what
   * makes "two people are never silently handed the same rounds" true even
   * when two people press the button at the same moment.
   */
  async function assignRounds ({ courseCode, fromRound, toRound, assignee, actor }) {
    const a = Number(fromRound); const b = Number(toRound)
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < a) {
      throw new GateError('fromRound/toRound must be integers with 1 <= fromRound <= toRound',
        400, 'bad_range')
    }
    if (!assignee) throw new GateError('assignee is required', 400, 'no_assignee')

    const res = await db().from('course_round_assignments').insert({
      course_code: courseCode,
      rounds: `[${a},${b + 1})`,
      assignee,
      assigned_by: actor || assignee,
    }).select('*').single()

    if (res.error) {
      // 23P01 = exclusion_violation: somebody already holds part of this range.
      if (res.error.code === '23P01' || /exclusion|overlap/i.test(res.error.message || '')) {
        const held = orThrow(await db().from('course_round_assignments')
          .select('rounds, assignee').eq('course_code', courseCode).is('released_at', null),
        'read assignments')
        throw new GateError(
          `Rounds ${a}-${b} overlap a range already claimed on ${courseCode}`,
          409, 'range_taken', { held })
      }
      throw new GateError(`assign rounds: ${res.error.message}`, 500, 'db_error')
    }
    logger.log?.(`[qa-gate] ${actor} assigned ${courseCode} rounds ${a}-${b} to ${assignee}`)
    return res.data
  }

  async function releaseAssignment ({ assignmentId, actor, reason }) {
    const updated = orThrow(await db().from('course_round_assignments').update({
      released_at: new Date().toISOString(),
      released_reason: reason || `released by ${actor}`,
    }).eq('id', assignmentId).is('released_at', null).select('*').maybeSingle(),
    'release assignment')
    if (!updated) throw new GateError('Assignment not found or already released', 404, 'unknown_assignment')
    return updated
  }

  async function assignments (courseCode) {
    return orThrow(await db().from('course_round_assignments')
      .select('*').eq('course_code', courseCode).is('released_at', null).order('rounds'),
    'read assignments') || []
  }

  // ── The gate biting: may this course reach learners? ─────────────────────

  /**
   * The publish check. Returns { allowed, reason, ... } rather than throwing,
   * so a caller can show the answer as well as enforce it.
   *
   * Demotion is always allowed — you must always be able to pull a course
   * back. A no-op (already at the target status) is allowed too: 78 courses
   * were already learner-visible when this gate was built, and blocking an
   * unrelated re-save of one of them would be the gate punishing the wrong
   * thing. What is blocked is PROMOTION to learner-visible without a pass.
   */
  async function checkPublishAllowed ({ courseCode, targetAppStatus, currentAppStatus }) {
    const promoting = LEARNER_VISIBLE_STATUSES.includes(targetAppStatus)
    if (!promoting) {
      return { allowed: true, reason: 'not_learner_visible' }
    }
    if (currentAppStatus === targetAppStatus) {
      return { allowed: true, reason: 'no_op' }
    }

    const gate = await evaluateGate(courseCode)
    if (gate.gate_status === 'passed') {
      return { allowed: true, reason: 'gate_passed', gate }
    }
    if (gate.override_by) {
      return { allowed: true, reason: 'overridden', gate }
    }

    const { windowSize, passed, flagged, stale } = gate.progress
    const bits = [`${passed} of ${windowSize || gate.required_rounds} required rounds signed off`]
    if (flagged) bits.push(`${flagged} flagged`)
    if (stale) bits.push(`${stale} stale (audio or content changed since sign-off)`)
    if (windowSize === 0) bits.push('no rounds materialised — course_round_index may need refreshing')

    return {
      allowed: false,
      reason: 'gate_unpassed',
      message: `${courseCode} has not passed the QA approval gate: ${bits.join('; ')}. ` +
        'A human must play through the first ' + gate.required_rounds +
        ' rounds in the real learning app and sign each one off.',
      gate,
    }
  }

  /**
   * Override the gate. It exists because a hard block with no escape hatch
   * gets worked around in ways nobody records; this one is recorded, requires
   * words, and names a person.
   */
  async function overrideGate ({ courseCode, actor, reason }) {
    if (!actor) throw new GateError('actor is required', 400, 'no_actor')
    if (!reason || !String(reason).trim()) {
      throw new GateError('An override must say why, in words', 400, 'no_reason')
    }
    await ensureGate(courseCode)
    const updated = orThrow(await db().from('course_qa_gate').update({
      override_by: actor,
      override_reason: String(reason).trim(),
      override_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('course_code', courseCode).select('*').single(), 'override gate')
    logger.warn?.(`[qa-gate] OVERRIDE by ${actor} on ${courseCode}: ${reason}`)
    return updated
  }

  async function clearOverride ({ courseCode, actor }) {
    const updated = orThrow(await db().from('course_qa_gate').update({
      override_by: null, override_reason: null, override_at: null,
      updated_at: new Date().toISOString(),
    }).eq('course_code', courseCode).select('*').single(), 'clear override')
    logger.log?.(`[qa-gate] ${actor} cleared override on ${courseCode}`)
    return updated
  }

  // ── Estate (Part 4) ──────────────────────────────────────────────────────

  /** The whole estate at a glance — what the retrofit is prioritised from. */
  async function estate () {
    const rows = orThrow(await db().from('course_qa_estate')
      .select('*').order('learner_visible', { ascending: false })
      .order('pricing_tier').order('course_code'),
    'read estate') || []
    return {
      courses: rows,
      summary: {
        total: rows.length,
        learnerVisible: rows.filter(r => r.learner_visible).length,
        passed: rows.filter(r => r.gate_status === 'passed').length,
        inProgress: rows.filter(r => r.gate_status === 'in_progress').length,
        unpassed: rows.filter(r => r.gate_status === 'unpassed' || !r.gate_status).length,
        // The honest headline: courses learners can reach right now that no
        // human has signed off.
        liveAndUnpassed: rows.filter(r => r.learner_visible && r.gate_status !== 'passed').length,
      },
    }
  }

  /** Everything one course's QA page needs, in one call. */
  async function courseStatus (courseCode) {
    const gate = await evaluateGate(courseCode)
    const [estateRow, open, asg] = await Promise.all([
      db().from('course_qa_estate').select('*').eq('course_code', courseCode).maybeSingle()
        .then(r => orThrow(r, 'read estate row')),
      openFlags({ courseCode, limit: 50 }),
      assignments(courseCode),
    ])
    return { courseCode, gate, estate: estateRow, openFlags: open.flags, assignments: asg }
  }

  return {
    ensureGate, evaluateGate, setRequiredRounds,
    rounds, cycles, roundClips, signOffRound,
    openFlags, clearFlag, raiseDetectorFlags,
    assignRounds, releaseAssignment, assignments,
    checkPublishAllowed, overrideGate, clearOverride,
    estate, courseStatus,
  }
}

module.exports = { createGate, GateError, LEARNER_VISIBLE_STATUSES, DEFAULT_REQUIRED_ROUNDS }
