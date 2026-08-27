/**
 * audio-repair-core.cjs — non-destructive audio repair: PROPOSE / PREVIEW /
 * ACCEPT / REJECT, uniform across every clip kind.
 *
 * WHY THIS EXISTS (2026-08-05). Tom played the first ten minutes of the live
 * deu_for_eng course and found the clipping "atrocious. Unforgivable at the
 * start of a course." The mechanism (an automatic tail trim whose detector
 * measured ~9% precision by ear) has been deleted. His design ruling on what
 * replaces it:
 *
 *   "I'm confused to why there is no replace function for introductions, or
 *    why the process deletes first and then regenerates ... repair should
 *    allow preview/accept/replace - something like that if we're making a
 *    professional level tool"
 *
 * And the governing principle: MACHINES MAY FLAG AUDIO, ONLY HUMANS MAY PASS
 * IT. Nothing in this module passes audio on its own authority. `propose`
 * refuses to hand a human a candidate that is silent, short or missing words —
 * that is a *floor*, not a pass — and only `accept`, driven by a person who
 * has heard both clips, puts bytes on the learner path.
 *
 * ── The one structural idea: SAME ID, NEW BYTES ─────────────────────────────
 * Every previous repair tool minted a NEW course_audio id, because the unique
 * index `unique_course_audio_per_voice` will not hold two rows with the same
 * text/language/role/voice. That forced a delete of the old row — and
 * `lego_introductions.presentation_audio_id` is ON DELETE **CASCADE**, so for
 * role='presentation' the delete takes the authored intro script with it. That
 * is exactly why introductions had no repair path at all.
 *
 * Here the row is never created and never deleted. `accept` UPDATEs the
 * existing row to point at the new S3 object. Consequences, all good:
 *   - no CASCADE can fire, because nothing is deleted;
 *   - no FK moves, so no link capture/restore dance and nothing to orphan;
 *   - the unique index is untouched (text_normalized never changes), so the
 *     tombstone hack in tools/repair-presentation-clips.cjs is unnecessary
 *     here — verified: no second row exists at any point;
 *   - presentation clips repair by exactly the same code path as everything
 *     else, which is the whole point.
 *
 * ── The cost of same-id, and how it is paid ─────────────────────────────────
 * ssi-learning-app/api/audio/[audioId].ts serves `Cache-Control: public,
 * max-age=31536000, immutable`, and player-vue caches blobs in IndexedDB keyed
 * by audio id. Fresh bytes under an unchanged URL would never reach a device
 * that already played the damaged clip. So `accept` bumps
 * `course_audio.audio_revision`, and the learner-side URL carries it as
 * `/api/audio/<id>?v=<rev>`. The URL changes; the id does not; immutable
 * caching — which is what makes the app fast — survives intact.
 *
 * ── Nothing here deletes a generated asset ─────────────────────────────────
 * The superseded S3 object stays in the bucket. `course_audio_revisions`
 * records what it was, what replaced it, who accepted it, when and why. A
 * revert is therefore a data-only operation.
 *
 * ── Make-before-break ───────────────────────────────────────────────────────
 * docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b, written after the
 * 2026-08-03 fra_for_eng purge deleted 31,310 rows before re-rendering and
 * left ~2,000 slots silent for two days. `propose` renders, masters, measures
 * and verifies, and uploads to a candidate key, all before `accept` is even
 * offered. A failed propose mutates nothing.
 *
 * Dependencies are injected (see `createRepairCore`) so the unit tests can
 * drive the whole accept/rollback path against fakes, with no network, no S3
 * and no spend.
 */

const CANDIDATE_PREFIX = 'repair-candidates'

/** Roles whose duration is denormalised onto a holder table. */
const DURATION_HOLDERS = [
  { table: 'course_legos', column: 'target1_audio_id', duration: 'target1_duration_ms' },
  { table: 'course_legos', column: 'target2_audio_id', duration: 'target2_duration_ms' },
  { table: 'course_practice_phrases', column: 'target1_audio_id', duration: 'target1_duration_ms' },
  { table: 'course_practice_phrases', column: 'target2_audio_id', duration: 'target2_duration_ms' },
  { table: 'lego_introductions', column: 'presentation_audio_id', duration: 'duration_ms' },
]

/** Uploads are transcoded by the mastering chain, so accept what ffmpeg reads. */
const UPLOAD_EXTENSIONS = ['mp3', 'm4a', 'wav', 'aac', 'ogg', 'opus', 'flac', 'webm']

/**
 * The detector that orders the repair queue, and the only honest thing that
 * can be said about it. It is printed next to every verdict it produces.
 *
 * "A test is only fit for purpose when it's been shown to catch what you
 *  catch. Until an automated check clears that bar against human-labelled
 *  ground truth, its only legitimate job is ordering the queue for human ears
 *  — never passing audio on its own authority."
 */
const DETECTOR = {
  name: 'duration-vs-expected',
  precision: null,
  precisionNote:
    'Unmeasured against human-labelled ground truth. Orders the queue only — it never passes audio. The tail-defect detector it replaces measured ~9% precision by ear (2026-08-05).',
}

/**
 * The second detector: TAIL TRUNCATION, via the audio-intelligence engine's tier 2.
 *
 * `duration-vs-expected` cannot see a soft tail amputation and never could — losing
 * the final consonant of "want" costs ~100 ms on a 1.4 s clip, well inside the 15%
 * the duration check tolerates, and the queue's own chars/14 expectation is coarser
 * still. Tom heard such clips in deu_for_eng on 2026-08-05 ("I wan'" for "I want");
 * all of them sit at duration ratios the duration check calls healthy.
 *
 * ⚠️ THIS REPLACED AN EARLIER TAIL CHECK IN THIS FILE, and the replacement is the
 * whole point rather than a tidy-up. That check measured release time from the global
 * peak at 5 ms resolution and reported 40-65 ms for clips whose fall actually takes
 * 21-36 ms. It scored CLEAN on the clips Tom confirmed damaged by ear on 2026-08-06,
 * playing them outside the app. Two detectors that disagree about the same clip is
 * how this estate spent a week unsure which of its own gates to believe, so there is
 * now exactly one tail measurement and it lives in the engine:
 *
 *     services/audio-intelligence/tiers/tier2-edge-shape.cjs
 *
 * Read that file's header for what it measures, what it is calibrated on, and the
 * four ear-confirmed-clean clips it flags that cannot be excluded. The short version:
 * recall 16/16 against every clip Tom has ever labelled damaged, 0 false flags on 316
 * clips that are clean or presumed clean, and 80% precision on the listened set. It
 * detects that a clip was TRIMMED; on the labelled set 4 in 20 were trimmed
 * harmlessly. That makes it triage — it orders clips for repair or for a human ear,
 * and like everything else in this file it never passes or deletes audio.
 */
const tier2 = require('./audio-intelligence/tiers/tier2-edge-shape.cjs')
const TAIL_DETECTOR = tier2.DETECTOR
const { canonicalVoiceId, ClipIdentityError } = require('./shared/clip-identity.cjs')

class RepairError extends Error {
  constructor (message, code = 'repair_failed', status = 400) {
    super(message)
    this.name = 'RepairError'
    this.code = code
    this.status = status
  }
}

/**
 * Split a stored voice_id into the provider that must render it and the id that
 * provider expects.
 *
 * This used to guess: three prefixes, a `Neural` suffix rule, and then a
 * fall-through of `{ provider: 'xai' }` for ANY bare id. That last line failed
 * OPEN. A Cartesia voice id is a bare UUID, so it landed in the fallback and
 * would have been repaired as xAI — a Cartesia id posted to xAI's API, wrong
 * provider, and an error message pointing nowhere near the cause. Silently
 * repairing a clip in the wrong voice is worse than not repairing it.
 *
 * So the guessing is gone and the question is delegated to canonicalVoiceId,
 * which already resolves prefixes and the known bare voices properly and
 * THROWS rather than assuming. The same change is made in
 * tools/repair-presentation-clips.cjs and tools/regen-seed-clips-from-scratch.cjs,
 * which carried copies of the same guess.
 *
 * What this costs, measured rather than assumed (course_audio, 2026-08-27):
 * 57,216 rows carry a bare voice_id that canonicalVoiceId cannot resolve —
 * placeholders like 'legacy_import' and opaque 8/12-char ids that are in no
 * registry. Those rows are NOT xAI; the old code was guessing wrong about them
 * and their repair would have failed at the provider anyway. They now refuse
 * loudly at the door instead. Bare xAI names (eve/leo/ara/sal/rex and the two
 * clones) are in KNOWN_BARE_VOICES and keep working exactly as before.
 */
function decodeVoiceId (storedVoiceId) {
  const canonical = canonicalVoiceId(storedVoiceId)
  if (canonical.startsWith('comp:')) {
    throw new ClipIdentityError('voice_id', storedVoiceId,
      'a composite is a splice of two takes, not one provider render')
  }
  const i = canonical.indexOf('_')
  return { provider: canonical.slice(0, i), voiceId: canonical.slice(i + 1) }
}

/**
 * The tail verdict for one clip, delegated to the engine's tier 2.
 *
 * The measurement deliberately does NOT live here. It takes 1 ms frames and a count of
 * exact-zero samples in the trailing pad, neither of which survives being handed around
 * as a 5 ms dB envelope — which is precisely how the superseded check lost the falls it
 * was supposed to see. So the core asks for samples and passes them straight through.
 *
 * @param {Int16Array} samples  mono PCM at tier2.SAMPLE_RATE
 * @param {object} [ctx]
 * @param {string} [ctx.text]        the clip's own script, carried into the reason only
 * @param {object} [ctx.thresholds]  overrides; changing one needs the ground-truth rerun
 *                                   (tools/verify-edge-shape-ground-truth.cjs)
 */
function tailVerdict (samples, ctx = {}) {
  const T = ctx.thresholds || {}
  const m = tier2.measure(samples, T)
  const v = tier2.verdict(m, T)
  return {
    flagged: v.flagged,
    score: v.score,
    reason: v.reason,
    category: v.category,
    steep: v.steep,
    padded: v.padded,
    shape: m.error ? null : m,
  }
}

/**
 * Build a repair core over injected dependencies.
 *
 * @param {object} deps
 * @param {object} deps.supabase        supabase-js client (service key)
 * @param {object} deps.storage         { put(key, buffer, contentType), head(key), get(key) }
 * @param {object} deps.render          { render({ text, voiceId, language }) -> { buffer, durationMs } }
 * @param {object} deps.verify          { measure(buffer) -> { meanDb, peakDb } | null,
 *                                        veracity(buffer, text, language) -> { checked, pass, reason, cer } }
 * @param {function} [deps.newId]       uuid factory
 * @param {function} [deps.now]         () -> ISO string
 * @param {object} [deps.logger]
 * @param {object} [deps.thresholds]
 */
function createRepairCore (deps) {
  const {
    supabase,
    storage,
    render,
    verify,
    newId = () => require('crypto').randomUUID(),
    now = () => new Date().toISOString(),
    logger = console,
  } = deps

  const T = Object.assign({
    floorMs: 400,           // below this, there is no sentence in there
    silenceMeanDb: -60,     // digital silence
    nearSilencePeakDb: -9,  // the fra_for_eng near-silence signature
    suspectRatio: 0.85,     // shipped/expected below this = queue it for ears
    attempts: 3,
  }, deps.thresholds || {})

  // ── reads ────────────────────────────────────────────────────────────────

  async function loadClip (courseCode, audioId) {
    const { data, error } = await supabase
      .from('course_audio').select('*').eq('id', audioId).maybeSingle()
    if (error) throw new RepairError(`reading clip: ${error.message}`, 'db_error', 500)
    if (!data) throw new RepairError(`no course_audio row ${audioId}`, 'not_found', 404)
    if (courseCode && data.course_code !== courseCode) {
      throw new RepairError(
        `clip ${audioId} belongs to ${data.course_code}, not ${courseCode}`, 'course_mismatch', 400)
    }
    return data
  }

  /**
   * Who points at this clip, and how many of them. Captured before an accept
   * and asserted after it. Under same-id swap these numbers MUST NOT MOVE —
   * that is the whole safety claim, so it is measured rather than assumed.
   */
  async function linkCensus (audioId) {
    // A census that could not be taken is NOT a census of zero. Every count
    // here has to throw on error, or the post-swap assertion built on it can
    // be defeated by a transient read failure on both sides of the swap —
    // which is precisely the shape of bug that lets a CASCADE go unnoticed.
    const count = async (table, column) => {
      const r = await supabase.from(table)
        .select('id', { count: 'exact', head: true }).eq(column, audioId)
      if (r.error) throw new RepairError(`census ${table}.${column}: ${r.error.message}`, 'db_error', 500)
      if (typeof r.count !== 'number') {
        throw new RepairError(`census ${table}.${column}: no count returned`, 'db_error', 500)
      }
      return r.count
    }
    const census = { lego_introductions: 0, course_legos_presentation: 0, holders: {} }
    census.lego_introductions = await count('lego_introductions', 'presentation_audio_id')
    census.course_legos_presentation = await count('course_legos', 'presentation_audio_id')
    for (const h of DURATION_HOLDERS) {
      census.holders[`${h.table}.${h.column}`] = await count(h.table, h.column)
    }
    return census
  }

  function censusEqual (a, b) {
    return JSON.stringify(a) === JSON.stringify(b)
  }

  // ── PROPOSE ──────────────────────────────────────────────────────────────

  /**
   * Produce a verified candidate for `audioId`, from a fresh TTS render or an
   * uploaded file. Nothing that the learner can reach is touched, in any
   * outcome — success writes an S3 object under a candidate key plus one row
   * in audio_repair_candidates; failure writes nothing at all.
   *
   * The verification here is a FLOOR, not a pass: alive, long enough, and
   * carrying the words. A candidate that clears it still has to be heard.
   */
  async function propose ({
    courseCode, audioId, source = 'tts', text, voiceId,
    buffer, filename, actor = 'unknown', dryRun = false,
  }) {
    const row = await loadClip(courseCode, audioId)
    const useText = (text && String(text).trim()) || row.text
    const useVoice = voiceId || row.voice_id

    if (source !== 'tts' && source !== 'upload') {
      throw new RepairError(`unknown source '${source}' — expected 'tts' or 'upload'`, 'bad_source')
    }

    let candidateBuffer = null
    let durationMs = null
    let attemptLog = []

    if (source === 'upload') {
      if (!buffer || !buffer.length) throw new RepairError('upload carried no bytes', 'empty_upload')
      const ext = String(filename || '').split('.').pop().toLowerCase()
      if (filename && !UPLOAD_EXTENSIONS.includes(ext)) {
        throw new RepairError(
          `unsupported upload type '.${ext}' — accepted: ${UPLOAD_EXTENSIONS.join(', ')}`,
          'bad_upload_type')
      }
      // Uploads go through the same mastering chain as a render, so a human
      // recording and a TTS render arrive on the learner path identically
      // levelled. `render.master` is the pipeline's own masterAudio.
      const mastered = await render.master(buffer, useText)
      candidateBuffer = mastered.buffer
      durationMs = mastered.durationMs
    } else {
      if (dryRun) {
        return {
          dryRun: true, audioId, source, text: useText, voiceId: useVoice,
          wouldSpend: { provider: decodeVoiceId(useVoice).provider, characters: useText.length },
          current: currentFacts(row),
        }
      }
      // Re-roll on a bad render rather than handing a human a broken candidate.
      let last = null
      for (let attempt = 1; attempt <= T.attempts; attempt++) {
        const out = await render.render({
          text: useText, voiceId: useVoice, language: row.language, role: row.role,
        })
        const level = await verify.measure(out.buffer)
        const verdict = await verify.veracity(out.buffer, useText, row.language)
        const tail = await tailOf(out.buffer)
        const fault = faultOf(out.durationMs, level, verdict, tail)
        attemptLog.push({ attempt, durationMs: out.durationMs, level, tail, fault })
        last = { ...out, level, verdict, tail }
        if (!fault) break
        logger.log?.(`[repair] ${audioId} attempt ${attempt}: ${fault} — re-roll`)
      }
      const fault = faultOf(last.durationMs, last.level, last.verdict, last.tail)
      if (fault) {
        throw new RepairError(
          `no attempt produced a clean candidate (${fault}, last ${last.durationMs}ms)`,
          'candidate_failed_verification')
      }
      candidateBuffer = last.buffer
      durationMs = last.durationMs
    }

    // Verify whatever we ended up with — uploads included, which is the only
    // check standing between a mis-recorded file and a human's ears.
    const level = await verify.measure(candidateBuffer)
    const verdict = await verify.veracity(candidateBuffer, useText, row.language)
    const tail = await tailOf(candidateBuffer)
    const fault = faultOf(durationMs, level, verdict, tail)
    if (fault) {
      throw new RepairError(`candidate rejected: ${fault} (${durationMs}ms)`,
        'candidate_failed_verification')
    }

    if (dryRun) {
      return { dryRun: true, audioId, source, durationMs, level, verdict, tail, current: currentFacts(row) }
    }

    const candidateId = newId()
    const s3Key = `${CANDIDATE_PREFIX}/${candidateId.toUpperCase()}.mp3`
    await storage.put(s3Key, candidateBuffer, 'audio/mpeg')

    const { error } = await supabase.from('audio_repair_candidates').insert({
      id: candidateId,
      audio_id: audioId,
      course_code: row.course_code,
      source,
      status: 'pending',
      s3_key: s3Key,
      text: useText,
      voice_id: useVoice,
      duration_ms: durationMs,
      file_size_bytes: candidateBuffer.length,
      veracity_checked: verdict.checked === true,
      veracity_pass: verdict.pass,
      veracity_reason: verdict.reason,
      veracity_cer: verdict.cer,
      mean_db: level ? level.meanDb : null,
      peak_db: level ? level.peakDb : null,
      proposed_by: actor,
      notes: attemptLog.length ? { attempts: attemptLog } : null,
    })
    if (error) {
      // The S3 object is orphaned but harmless — it is referenced by nothing.
      throw new RepairError(`recording candidate: ${error.message}`, 'db_error', 500)
    }

    return {
      candidateId,
      audioId,
      candidate: {
        durationMs,
        source,
        veracity: { pass: verdict.pass, reason: verdict.reason, cer: verdict.cer },
        // Carried out to the caller so a repair log records that the replacement was
        // re-measured for the very defect it replaces, rather than leaving it implied.
        tail: tail ? { flagged: tail.flagged, reason: tail.reason, shape: tail.shape } : null,
        level,
        s3Key,
      },
      current: currentFacts(row),
    }
  }

  /**
   * @param {object} [tail]  the candidate's own tier-2 verdict, when it was measured.
   *   A repair that hands back a clip with the SAME defect it was repairing is worse
   *   than no repair: it costs a render, burns the revision, and reports success. The
   *   damage this whole path exists for was written at render time, so the fresh
   *   candidate is exactly the thing that has to be re-measured — not assumed clean
   *   because it is new.
   */
  function faultOf (durationMs, level, verdict, tail) {
    if (!durationMs || durationMs < T.floorMs) return 'too short'
    if (level && level.meanDb < T.silenceMeanDb) return 'silent'
    if (level && level.peakDb < T.nearSilencePeakDb) return 'near-silent'
    if (verdict && verdict.checked === true && verdict.pass === false) {
      return `words missing (${verdict.reason || 'veracity fail'})`
    }
    if (tail && tail.flagged === true) return `tail truncated (${tail.reason})`
    return null
  }

  /** The candidate's tier-2 verdict, or null when there is no decoder to ask. */
  async function tailOf (buffer) {
    if (!verify || typeof verify.pcm !== 'function') return null
    try {
      return tailVerdict(await verify.pcm(buffer))
    } catch (err) {
      // A decode failure is not a pass. It is reported as unmeasured and the
      // candidate goes to a human with that said out loud.
      logger.warn?.(`[repair] could not measure candidate tail: ${err.message}`)
      return { flagged: null, reason: `tail not measured: ${err.message}`, score: null }
    }
  }

  function currentFacts (row) {
    return {
      id: row.id,
      text: row.text,
      role: row.role,
      voiceId: row.voice_id,
      language: row.language,
      origin: row.origin,
      durationMs: row.duration_ms,
      revision: row.audio_revision ?? 1,
      s3Key: row.s3_key,
      legoId: row.lego_id,
    }
  }

  // ── PREVIEW ──────────────────────────────────────────────────────────────

  /** Current clip and every candidate, side by side, with the facts a human needs. */
  async function preview ({ courseCode, audioId }) {
    const row = await loadClip(courseCode, audioId)
    const { data: candidates, error } = await supabase
      .from('audio_repair_candidates')
      .select('*').eq('audio_id', audioId).order('proposed_at', { ascending: false })
    if (error) throw new RepairError(`reading candidates: ${error.message}`, 'db_error', 500)

    const { data: history } = await supabase
      .from('course_audio_revisions')
      .select('revision, previous_revision, previous_s3_key, new_s3_key, previous_duration_ms, new_duration_ms, accepted_by, reason, source, created_at')
      .eq('audio_id', audioId).order('revision', { ascending: false })

    const pending = (candidates || []).find(c => c.status === 'pending') || null

    return {
      current: currentFacts(row),
      candidates: (candidates || []).map(c => ({
        candidateId: c.id,
        status: c.status,
        source: c.source,
        durationMs: c.duration_ms,
        text: c.text,
        voiceId: c.voice_id,
        veracity: { checked: c.veracity_checked, pass: c.veracity_pass, reason: c.veracity_reason, cer: c.veracity_cer },
        level: { meanDb: c.mean_db, peakDb: c.peak_db },
        proposedBy: c.proposed_by,
        createdAt: c.proposed_at,
        decidedBy: c.decided_by,
        decidedAt: c.decided_at,
      })),
      comparison: pending ? {
        durationMsCurrent: row.duration_ms,
        durationMsCandidate: pending.duration_ms,
        durationRatio: pending.duration_ms ? row.duration_ms / pending.duration_ms : null,
      } : null,
      detector: {
        ...DETECTOR,
        ...detectorVerdict(row, pending ? pending.duration_ms : null),
      },
      history: history || [],
    }
  }

  /**
   * The detector's opinion, always shipped with its precision. It compares
   * what shipped against what a fresh render of the same text measures —
   * which is only knowable once a candidate exists, so before that it has
   * nothing to say and says so, rather than guessing.
   */
  function detectorVerdict (row, candidateDurationMs) {
    if (!candidateDurationMs || !row.duration_ms) {
      return { flagged: null, reason: 'no candidate to compare against yet', score: null }
    }
    const ratio = row.duration_ms / candidateDurationMs
    return {
      flagged: ratio < T.suspectRatio,
      score: Number(ratio.toFixed(3)),
      reason: ratio < T.suspectRatio
        ? `shipped clip is ${Math.round((1 - ratio) * 100)}% shorter than a fresh render of the same text`
        : `shipped duration is within ${Math.round(T.suspectRatio * 100)}% of a fresh render`,
    }
  }

  // ── ACCEPT ───────────────────────────────────────────────────────────────

  /**
   * The human pass. Atomic in-place swap at the same id: the row's s3_key,
   * duration and revision move; its id, text, role, voice and every foreign
   * key pointing at it do not. Every step asserts, and any failure rolls the
   * row back to exactly its pre-accept state.
   */
  async function accept ({ courseCode, audioId, candidateId, actor = 'unknown', reason = null }) {
    if (!actor || actor === 'unknown') {
      logger.warn?.('[repair] accept with no named actor — the history row will say "unknown"')
    }
    const row = await loadClip(courseCode, audioId)

    const { data: cand, error: candErr } = await supabase
      .from('audio_repair_candidates').select('*').eq('id', candidateId).maybeSingle()
    if (candErr) throw new RepairError(`reading candidate: ${candErr.message}`, 'db_error', 500)
    if (!cand) throw new RepairError(`no candidate ${candidateId}`, 'not_found', 404)
    if (cand.audio_id !== audioId) {
      throw new RepairError(
        `candidate ${candidateId} is for clip ${cand.audio_id}, not ${audioId}`, 'candidate_mismatch')
    }
    if (cand.status !== 'pending') {
      throw new RepairError(`candidate ${candidateId} is already ${cand.status}`, 'candidate_not_pending')
    }

    // Make-before-break: the bytes must be provably there before the row is
    // pointed at them.
    const head = await storage.head(cand.s3_key)
    if (!head || !head.exists) {
      throw new RepairError(`candidate object ${cand.s3_key} is not in the bucket`, 'candidate_object_missing')
    }

    const before = await linkCensus(audioId)
    const previousRevision = row.audio_revision ?? 1
    const revision = previousRevision + 1

    // Snapshot every field the swap touches, so rollback is exact.
    const snapshot = {
      s3_key: row.s3_key,
      duration_ms: row.duration_ms,
      file_size_bytes: row.file_size_bytes,
      audio_revision: previousRevision,
      origin: row.origin,
      word_boundaries: row.word_boundaries,
      veracity_checked_at: row.veracity_checked_at,
      veracity_pass: row.veracity_pass,
      veracity_reason: row.veracity_reason,
      veracity_cer: row.veracity_cer,
      veracity_checker: row.veracity_checker,
    }

    let historyId = null
    let swapped = false
    try {
      // History first: a swap that is not recorded is worse than one that
      // does not happen. Rolled back below if the swap itself fails.
      const { data: hist, error: histErr } = await supabase
        .from('course_audio_revisions').insert({
          audio_id: audioId,
          course_code: row.course_code,
          revision,
          previous_revision: previousRevision,
          previous_s3_key: row.s3_key,
          new_s3_key: cand.s3_key,
          previous_duration_ms: row.duration_ms,
          new_duration_ms: cand.duration_ms,
          candidate_id: candidateId,
          source: cand.source,
          accepted_by: actor,
          reason,
        }).select('id').single()
      if (histErr) throw new RepairError(`writing history: ${histErr.message}`, 'db_error', 500)
      historyId = hist.id

      // The swap. Same id. text/text_normalized/language/role/voice_id are
      // deliberately NOT in this patch — leaving them alone is what keeps
      // `unique_course_audio_per_voice` satisfied without a tombstone.
      const patch = {
        s3_key: cand.s3_key,
        duration_ms: cand.duration_ms,
        file_size_bytes: cand.file_size_bytes,
        audio_revision: revision,
        // Stale: recomputed by the word-boundary pass against the new bytes.
        word_boundaries: null,
        veracity_checked_at: now(),
        veracity_pass: cand.veracity_pass,
        veracity_reason: cand.veracity_reason,
        veracity_cer: cand.veracity_cer,
        veracity_checker: 'audio-repair-core.cjs',
      }
      // A human-uploaded recording IS human-origin audio, and the precious-
      // audio guard should protect it from a later TTS pass.
      if (cand.source === 'upload') patch.origin = 'human'

      const { error: upErr } = await supabase
        .from('course_audio').update(patch).eq('id', audioId)
      if (upErr) throw new RepairError(`swapping clip: ${upErr.message}`, 'db_error', 500)
      swapped = true

      // ── assertions, in the order the damage would appear ──────────────────
      const after = await loadClip(courseCode, audioId)
      if (after.id !== audioId) throw new RepairError('id moved during swap', 'assert_id')
      if (after.s3_key !== cand.s3_key) throw new RepairError('s3_key did not take', 'assert_s3_key')
      if ((after.audio_revision ?? 1) !== revision) {
        throw new RepairError(`revision is ${after.audio_revision}, expected ${revision}`, 'assert_revision')
      }
      if (after.text !== row.text || after.text_normalized !== row.text_normalized) {
        throw new RepairError('text changed during swap', 'assert_text')
      }

      // The claim that made same-id worth doing: nothing CASCADEd, nothing
      // was orphaned, and the intro row still exists pointing at this id.
      const afterCensus = await linkCensus(audioId)
      if (!censusEqual(before, afterCensus)) {
        throw new RepairError(
          `link census moved: ${JSON.stringify(before)} -> ${JSON.stringify(afterCensus)}`,
          'assert_links')
      }
      if (row.role === 'presentation' && before.lego_introductions !== afterCensus.lego_introductions) {
        throw new RepairError('lego_introductions row lost', 'assert_intro')
      }

      // Derived data that the new bytes invalidate. Failures here are logged,
      // not fatal — the swap is already correct and both are regenerable.
      await syncDenormalisedDurations(audioId, cand.duration_ms).catch(e =>
        logger.warn?.(`[repair] duration denormalisation: ${e.message}`))
      await supabase.from('course_audio_envelope').delete().eq('audio_id', audioId)
        .then(r => r.error && logger.warn?.(`[repair] envelope clear: ${r.error.message}`))

      await supabase.from('audio_repair_candidates')
        .update({ status: 'accepted', decided_by: actor, decided_at: now(), decision_reason: reason })
        .eq('id', candidateId)
      await supabase.from('audio_repair_candidates')
        .update({ status: 'superseded', decided_by: actor, decided_at: now() })
        .eq('audio_id', audioId).eq('status', 'pending')

      return {
        ok: true,
        audioId,
        revision,
        previousRevision,
        supersededS3Key: snapshot.s3_key,
        newS3Key: cand.s3_key,
        durationMs: { before: snapshot.duration_ms, after: cand.duration_ms },
        historyId,
        links: afterCensus,
      }
    } catch (err) {
      if (swapped) {
        const { error: rbErr } = await supabase
          .from('course_audio').update(snapshot).eq('id', audioId)
        if (rbErr) {
          logger.error?.(`[repair] ROLLBACK FAILED for ${audioId}: ${rbErr.message} — row may point at the candidate object`)
          err.rollback = 'failed'
        } else {
          err.rollback = 'restored'
        }
      } else {
        err.rollback = 'not-needed'
      }
      if (historyId) {
        await supabase.from('course_audio_revisions').delete().eq('id', historyId)
          .then(r => r.error && logger.error?.(`[repair] could not unwind history row ${historyId}: ${r.error.message}`))
      }
      throw err
    }
  }

  /**
   * The player sizes the pause between cycles from denormalised duration
   * columns. A repair that fixed the audio but left the old number there
   * would leave the collapsed pause in place — the second symptom Tom
   * actually heard in fra_for_eng.
   */
  async function syncDenormalisedDurations (audioId, durationMs) {
    for (const h of DURATION_HOLDERS) {
      const { error } = await supabase.from(h.table)
        .update({ [h.duration]: durationMs }).eq(h.column, audioId)
      if (error) throw new Error(`${h.table}.${h.duration}: ${error.message}`)
    }
  }

  // ── REVERT ───────────────────────────────────────────────────────────────

  /**
   * Put a clip back on the object it was serving before a given revision.
   *
   * This is what makes "the old audio is retained as history" a fact rather
   * than a promise: the superseded S3 object was never deleted, and
   * course_audio_revisions remembers its key, so undoing an accepted swap is a
   * data-only operation with no render and no spend.
   *
   * A revert is itself a forward revision — the number never goes backwards,
   * because the number's only job is to invalidate caches, and a device that
   * cached the bad bytes at revision 2 must not be told "you're at 1, you're
   * fine". So reverting revision 2 produces revision 3 pointing at revision
   * 1's object.
   */
  async function revert ({ courseCode, audioId, toRevision = null, actor = 'unknown', reason = null }) {
    const row = await loadClip(courseCode, audioId)
    const current = row.audio_revision ?? 1

    const { data: hist, error } = await supabase.from('course_audio_revisions')
      .select('*').eq('audio_id', audioId).order('revision', { ascending: false })
    if (error) throw new RepairError(`reading history: ${error.message}`, 'db_error', 500)
    if (!hist || !hist.length) {
      throw new RepairError(`clip ${audioId} has never been replaced — nothing to revert to`, 'no_history', 400)
    }

    // Which historical object are we going back to? By default, whatever was
    // there immediately before the current revision.
    const entry = toRevision
      ? hist.find(h => h.previous_revision === toRevision)
      : hist.find(h => h.revision === current)
    if (!entry) {
      throw new RepairError(
        `no history entry taking clip ${audioId} away from revision ${toRevision ?? current}`,
        'no_history', 400)
    }

    const head = await storage.head(entry.previous_s3_key)
    if (!head || !head.exists) {
      throw new RepairError(
        `the superseded object ${entry.previous_s3_key} is no longer in the bucket — cannot revert`,
        'previous_object_missing', 409)
    }

    const before = await linkCensus(audioId)
    const revision = current + 1
    const snapshot = {
      s3_key: row.s3_key, duration_ms: row.duration_ms,
      file_size_bytes: row.file_size_bytes, audio_revision: current,
    }

    let historyId = null
    let swapped = false
    try {
      const { data: h, error: hErr } = await supabase.from('course_audio_revisions').insert({
        audio_id: audioId,
        course_code: row.course_code,
        revision,
        previous_revision: current,
        previous_s3_key: row.s3_key,
        new_s3_key: entry.previous_s3_key,
        previous_duration_ms: row.duration_ms,
        new_duration_ms: entry.previous_duration_ms,
        source: 'revert',
        accepted_by: actor,
        reason: reason || `revert to revision ${entry.previous_revision}`,
      }).select('id').single()
      if (hErr) throw new RepairError(`writing history: ${hErr.message}`, 'db_error', 500)
      historyId = h.id

      const { error: upErr } = await supabase.from('course_audio').update({
        s3_key: entry.previous_s3_key,
        duration_ms: entry.previous_duration_ms,
        file_size_bytes: head.bytes ?? null,
        audio_revision: revision,
        word_boundaries: null,
      }).eq('id', audioId)
      if (upErr) throw new RepairError(`reverting clip: ${upErr.message}`, 'db_error', 500)
      swapped = true

      const after = await loadClip(courseCode, audioId)
      if (after.s3_key !== entry.previous_s3_key) throw new RepairError('revert did not take', 'assert_s3_key')
      const afterCensus = await linkCensus(audioId)
      if (!censusEqual(before, afterCensus)) {
        throw new RepairError(`link census moved during revert`, 'assert_links')
      }

      await syncDenormalisedDurations(audioId, entry.previous_duration_ms).catch(e =>
        logger.warn?.(`[repair] duration denormalisation: ${e.message}`))
      await supabase.from('course_audio_envelope').delete().eq('audio_id', audioId)

      return {
        ok: true, audioId, revision, previousRevision: current,
        restoredS3Key: entry.previous_s3_key, supersededS3Key: snapshot.s3_key,
        durationMs: { before: snapshot.duration_ms, after: entry.previous_duration_ms },
        historyId,
      }
    } catch (err) {
      if (swapped) {
        const { error: rbErr } = await supabase.from('course_audio').update(snapshot).eq('id', audioId)
        err.rollback = rbErr ? 'failed' : 'restored'
      } else {
        err.rollback = 'not-needed'
      }
      if (historyId) await supabase.from('course_audio_revisions').delete().eq('id', historyId)
      throw err
    }
  }

  // ── REJECT ───────────────────────────────────────────────────────────────

  /** Discard a candidate. Touches nothing on the learner path, by construction. */
  async function reject ({ courseCode, audioId, candidateId, actor = 'unknown', reason = null }) {
    const { data: cand, error } = await supabase
      .from('audio_repair_candidates').select('*').eq('id', candidateId).maybeSingle()
    if (error) throw new RepairError(`reading candidate: ${error.message}`, 'db_error', 500)
    if (!cand) throw new RepairError(`no candidate ${candidateId}`, 'not_found', 404)
    if (audioId && cand.audio_id !== audioId) {
      throw new RepairError(`candidate ${candidateId} is for clip ${cand.audio_id}`, 'candidate_mismatch')
    }
    if (cand.status !== 'pending') {
      throw new RepairError(`candidate ${candidateId} is already ${cand.status}`, 'candidate_not_pending')
    }
    const { error: upErr } = await supabase.from('audio_repair_candidates')
      .update({ status: 'rejected', decided_by: actor, decided_at: now(), decision_reason: reason })
      .eq('id', candidateId)
    if (upErr) throw new RepairError(`rejecting: ${upErr.message}`, 'db_error', 500)
    // The S3 object is left in place: it costs nothing, and a rejected
    // candidate is evidence about what the renderer produced.
    return { ok: true, candidateId, status: 'rejected' }
  }

  // ── QUEUE ────────────────────────────────────────────────────────────────

  /**
   * Clips worth a human's ears, worst first. Everything here is an ORDERING,
   * never a verdict — the precision note ships with it.
   *
   * Signals, cheapest first: an existing failed veracity check; an existing
   * pending candidate (someone already thought so); a suspiciously short clip
   * for its text length.
   */
  async function queue ({
    courseCode, limit = 50, role = null, includeUnrendered = false,
    audioIds = null, tails = false, tailConcurrency = 8, onProgress = null,
  }) {
    // PAGED, deliberately. This used to be a single `.limit(5000)`, which
    // silently truncated: deu_for_eng has 47,254 rendered clips and fra_for_eng
    // 51,369, so a whole-course sweep saw barely a tenth of the course and
    // reported a clean-looking flag rate for the part it never read. A queue
    // that quietly stops at 5,000 reads as "that is the whole course".
    //
    // Paged along `text_normalized`, which is NOT an arbitrary choice: the
    // unique index on (course_code, text_normalized, language, role, voice_id)
    // is the only index whose leading column is course_code, so it is the only
    // ordering Postgres can walk without sorting the whole course. Ordering by
    // `id` or `created_at` sorts ~50,000 rows and blows the 8s statement
    // timeout every time — measured, not assumed.
    //
    // text_normalized is not unique on its own (the same text exists across
    // roles and voices), so this keysets with `gte` and de-duplicates by id
    // rather than `gt`, which would drop every row sharing a page boundary.
    const COLUMNS = 'id, text, text_normalized, role, voice_id, language, duration_ms, s3_key, audio_revision, lego_id, veracity_pass, veracity_reason, veracity_cer'
    const PAGE = 1000
    const data = []
    if (audioIds && audioIds.length) {
      // `.in()` sends the ids in the QUERY STRING, so the limit here is URL length,
      // not row count — a different constraint from PAGE and it needs its own number.
      // Measured against this Supabase instance on 2026-08-06: 1,000 uuids is a hard
      // 400 Bad Request, 500 fails in fetch, 300 is fine. That is why a seed-1-300
      // deu_for_eng scan (18,163 clips) died on its first chunk. 200 leaves headroom
      // and costs 91 round trips instead of 19, which is nothing next to one S3 GET
      // and one ffmpeg decode per clip.
      const ID_CHUNK = 200
      for (let i = 0; i < audioIds.length; i += ID_CHUNK) {
        const chunk = audioIds.slice(i, i + ID_CHUNK)
        let q = supabase.from('course_audio').select(COLUMNS)
          .eq('course_code', courseCode).in('id', chunk)
        if (role) q = q.eq('role', role)
        const { data: rows, error } = await q.limit(ID_CHUNK)
        if (error) throw new RepairError(`reading course audio: ${error.message}`, 'db_error', 500)
        data.push(...(rows || []))
      }
    } else {
      const seen = new Set()
      let cursor = null
      for (;;) {
        let q = supabase.from('course_audio').select(COLUMNS)
          .eq('course_code', courseCode).order('text_normalized', { ascending: true })
        if (role) q = q.eq('role', role)
        if (cursor !== null) q = q.gte('text_normalized', cursor)
        const { data: rows, error } = await q.limit(PAGE)
        if (error) throw new RepairError(`reading course audio: ${error.message}`, 'db_error', 500)
        if (!rows || !rows.length) break
        let fresh = 0
        for (const r of rows) {
          if (seen.has(r.id)) continue
          seen.add(r.id); data.push(r); fresh++
        }
        const nextCursor = rows[rows.length - 1].text_normalized
        // No new ids, or the cursor cannot advance: a single text_normalized
        // fills a whole page. Stop rather than spin — and say so, because a
        // silent stop here would under-report the course.
        if (!fresh || nextCursor === cursor) {
          if (rows.length === PAGE) {
            logger.warn?.(`[repair] paging stalled at ${JSON.stringify(nextCursor)} — more than ${PAGE} clips share one normalised text; ${data.length} read`)
          }
          break
        }
        cursor = nextCursor
        if (rows.length < PAGE) break
      }
    }

    // Paged for the same reason the clip read is: PostgREST caps an unbounded
    // select, and a truncated pending list silently re-proposes clips that
    // already have a candidate waiting for ears.
    const pend = []
    for (let from = 0; ; from += PAGE) {
      const { data: rows } = await supabase.from('audio_repair_candidates')
        .select('audio_id, id, duration_ms, status')
        .eq('course_code', courseCode).eq('status', 'pending')
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1)
      pend.push(...(rows || []))
      if (!rows || rows.length < PAGE) break
    }
    const pendingBy = new Map(pend.map(c => [c.audio_id, c]))

    // A row with no duration is almost always an UNRENDERED slot, not a
    // damaged clip — a different problem, owned by the missing-audio backlog.
    // Left in, they dominate the ordering (612 of them in deu_for_eng alone)
    // and bury the clips that actually need ears. This queue is for repair.
    const unrendered = (data || []).filter(r => !r.duration_ms || !r.s3_key)
    const rendered = includeUnrendered ? (data || []) : (data || []).filter(r => r.duration_ms && r.s3_key)

    const scored = rendered.map(r => {
      const chars = String(r.text || '').length
      // ~14 chars/second is a slow speaking rate in any of the course
      // languages; a clip well under that for its text has lost something.
      const expectedMs = Math.max(T.floorMs, (chars / 14) * 1000)
      const ratio = r.duration_ms ? r.duration_ms / expectedMs : 0
      const cand = pendingBy.get(r.id)
      let reason = null
      let score = ratio
      if (r.veracity_pass === false) { reason = `veracity failed: ${r.veracity_reason || 'unknown'}`; score = -1 }
      else if (!r.duration_ms) { reason = 'no duration recorded'; score = -0.5 }
      else if (ratio < T.suspectRatio) { reason = `${Math.round((1 - ratio) * 100)}% shorter than its text implies` }
      if (cand) reason = (reason ? reason + '; ' : '') + 'candidate already proposed'
      return {
        audioId: r.id, text: r.text, role: r.role, voiceId: r.voice_id, language: r.language,
        durationMs: r.duration_ms, revision: r.audio_revision ?? 1, legoId: r.lego_id,
        pendingCandidateId: cand ? cand.id : null,
        detector: { flagged: score < T.suspectRatio, reason, score: Number(score.toFixed(3)) },
      }
    })

    // The tail check needs the bytes, so it is opt-in: one S3 GET and one
    // decode per clip. Each clip is measured and judged in the same pass and
    // only the verdict is kept — a 50,000-clip course cannot hold 50,000
    // envelopes in memory, and the verdict needs no cross-clip context.
    let tailFailures = 0
    const tailByVoice = new Map()
    if (tails) {
      if (!verify || typeof verify.pcm !== 'function') {
        throw new RepairError('tail check needs a verify.pcm dependency', 'no_tail_support', 500)
      }
      const byId = new Map(scored.map(s => [s.audioId, s]))
      // Concurrent, because this is one S3 GET plus one ffmpeg decode per clip
      // and the courses in scope are ~50,000 clips each. Serially that is a
      // day and a half per course; the work is entirely IO- and subprocess-bound
      // so a small pool turns it into hours.
      let next = 0
      let done = 0
      const worker = async () => {
        for (;;) {
          const i = next++
          if (i >= rendered.length) return
          const r = rendered[i]
          const voice = r.voice_id || 'unknown'
          if (!tailByVoice.has(voice)) tailByVoice.set(voice, { measured: 0, flagged: 0, failed: 0 })
          const bucket = tailByVoice.get(voice)
          try {
            const { buffer } = await storage.get(r.s3_key)
            const v = tailVerdict(await verify.pcm(buffer), { text: r.text })
            const item = byId.get(r.id)
            if (item) item.tail = v
            bucket.measured++
            if (v.flagged) bucket.flagged++
          } catch (err) {
            tailFailures++
            bucket.failed++
            logger.warn?.(`[repair] tail measure failed for ${r.id}: ${err.message}`)
          }
          if (onProgress && ++done % 250 === 0) onProgress(done, rendered.length)
        }
      }
      await Promise.all(Array.from(
        { length: Math.max(1, Math.min(tailConcurrency, rendered.length)) }, worker))
    }

    const kept = scored.filter(x =>
      x.detector.flagged || x.pendingCandidateId || (x.tail && x.tail.flagged))

    // Tail-flagged clips sort by their own (smaller = worse) score; the
    // duration detector's ratio and the tail's fall rate are different units,
    // so they are never mixed into one number.
    kept.sort((a, b) => {
      const at = a.tail && a.tail.flagged, bt = b.tail && b.tail.flagged
      if (at && bt) return a.tail.score - b.tail.score
      if (at !== bt) return at ? -1 : 1
      return a.detector.score - b.detector.score
    })

    return {
      courseCode,
      detector: DETECTOR,
      tailDetector: tails ? TAIL_DETECTOR : null,
      total: kept.length,
      flaggedByDuration: kept.filter(x => x.detector.flagged).length,
      flaggedByTail: kept.filter(x => x.tail && x.tail.flagged).length,
      measured: tails ? rendered.length - tailFailures : 0,
      tailMeasureFailures: tailFailures,
      // The flag rate PER VOICE, because that is the first thing to read out of
      // any sweep that leaves the course this detector was calibrated on. A voice
      // whose renders naturally fall steeply lights up wholesale, and that is a
      // calibration finding rather than ten thousand damaged clips. Reported
      // whether or not it looks alarming, so nobody has to ask for it.
      tailByVoice: tails
        ? Object.fromEntries([...tailByVoice].map(([v, b]) => [v, {
            ...b, flagRate: b.measured ? Number((b.flagged / b.measured).toFixed(4)) : null,
          }]))
        : null,
      // Named, not silently dropped: a queue that quietly excluded rows would
      // read as "nothing else to look at" when there is.
      excludedUnrendered: includeUnrendered ? 0 : unrendered.length,
      items: kept.slice(0, limit),
    }
  }

  /**
   * Every audio id reachable from seeds 1..maxSeedNumber of a course — seed,
   * lego, introduction and practice-phrase clips, all voices. The repair queue
   * works in audio ids; course work is scoped in seeds. This is the join.
   */
  async function seedScopedAudioIds ({ courseCode, maxSeedNumber }) {
    const ids = new Set()
    const add = (...xs) => { for (const x of xs) if (x) ids.add(x) }
    const seedFilter = q => q.eq('course_code', courseCode).lte('seed_number', maxSeedNumber)

    const { data: seeds } = await seedFilter(supabase.from('course_seeds')
      .select('known_audio_id, target1_audio_id, target2_audio_id'))
    for (const s of seeds || []) add(s.known_audio_id, s.target1_audio_id, s.target2_audio_id)

    const { data: legos } = await seedFilter(supabase.from('course_legos')
      .select('lego_id, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id'))
    for (const l of legos || []) {
      add(l.known_audio_id, l.target1_audio_id, l.target2_audio_id, l.presentation_audio_id)
    }

    const { data: phrases } = await seedFilter(supabase.from('course_practice_phrases')
      .select('known_audio_id, target1_audio_id, target2_audio_id'))
    for (const p of phrases || []) add(p.known_audio_id, p.target1_audio_id, p.target2_audio_id)

    // lego_introductions has no seed_number; its lego_id carries the seed.
    const keep = new Set((legos || []).map(l => l.lego_id))
    const { data: intros } = await supabase.from('lego_introductions')
      .select('lego_id, presentation_audio_id').eq('course_code', courseCode)
    for (const i of intros || []) if (keep.has(i.lego_id)) add(i.presentation_audio_id)

    return [...ids]
  }

  /** Bytes for a candidate, so a human can hear it before deciding. */
  async function candidateBytes (candidateId) {
    const { data: cand, error } = await supabase
      .from('audio_repair_candidates').select('s3_key, duration_ms').eq('id', candidateId).maybeSingle()
    if (error) throw new RepairError(`reading candidate: ${error.message}`, 'db_error', 500)
    if (!cand) throw new RepairError(`no candidate ${candidateId}`, 'not_found', 404)
    return storage.get(cand.s3_key)
  }

  /** Bytes for the live clip, so the two can be compared without the learner app. */
  async function currentBytes (courseCode, audioId) {
    const row = await loadClip(courseCode, audioId)
    return storage.get(row.s3_key)
  }

  return {
    propose, preview, accept, reject, revert, queue,
    candidateBytes, currentBytes, seedScopedAudioIds,
    loadClip, linkCensus, detectorVerdict,
    DETECTOR, TAIL_DETECTOR, RepairError,
    _internal: { faultOf, syncDenormalisedDurations, thresholds: T },
  }
}

module.exports = {
  createRepairCore,
  RepairError,
  DETECTOR,
  TAIL_DETECTOR,
  tailVerdict,
  DURATION_HOLDERS,
  UPLOAD_EXTENSIONS,
  CANDIDATE_PREFIX,
  decodeVoiceId,
}
