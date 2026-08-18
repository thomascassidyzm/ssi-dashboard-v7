/**
 * The one way to replace a clip's bytes in place.
 *
 * A clip's learner-facing address is `<uuid>.v<audio_revision>` — the uuid is
 * the course_audio row id and never moves, so the ONLY thing that makes the
 * address change is `audio_revision`. `/api/audio/:id` serves those objects
 * with `max-age=31536000, immutable`, and player-vue's offline IndexedDB
 * AudioCache keys on the bare ref string. So a writer that swaps `s3_key`
 * without bumping the revision changes the bytes behind an address nobody will
 * ask for again: a learner who has already played the clip keeps the old audio
 * for a year in the HTTP cache and forever in IndexedDB, while a first-time
 * listener gets the fix. That asymmetry is the documented cause of "we
 * replaced it and it's still wrong".
 *
 * Six in-place writers did exactly that (docs/audio-replacement-routes-verdict-2026-08-18.md):
 * /regenerate-single, /regenerate-role, /regenerate-phrase, /regenerate-lego,
 * /regenerate-presentation and the recordist retake. Two of them are wired to
 * buttons operators press daily. This module is the pattern that
 * `phase8 reuseRenderClip` and `audio-repair-core accept` already got right,
 * lifted out so there is one copy of it instead of eight.
 *
 * What it does NOT do, deliberately: it never writes text, text_normalized,
 * language, role or voice_id. Leaving those alone is what keeps
 * `unique_course_audio_per_voice` satisfied and the row id stable, and a stable
 * id is what makes the swap hole-free — no holder FK moves, so the course
 * cannot reference a missing clip at any instant. Callers that need to change
 * voice_id pass it in `patch` with their eyes open.
 */

/**
 * Swap the bytes an existing course_audio row points at, versioned.
 *
 * @param {object}   o
 * @param {object}   o.supabase      Supabase client.
 * @param {string}   o.audioId       course_audio.id — the row to swap. Never moves.
 * @param {string}   o.newS3Key      Key of the object ALREADY uploaded to the bucket.
 * @param {number}   [o.durationMs]  Duration of the new bytes.
 * @param {number}   [o.fileSizeBytes]
 * @param {object}   [o.patch]       Extra columns to write in the same UPDATE
 *                                   (origin, word_boundaries, veracity_*, …).
 * @param {string}   o.source        Which route did this — lands in history.
 * @param {string}   o.acceptedBy    Who/what asked for it — lands in history (NOT NULL).
 * @param {string}   [o.reason]
 * @param {function} [o.verifyObject] async (s3Key) => boolean. Make-before-break:
 *                                   when supplied, the row is not pointed at the
 *                                   new key until this says the object is really
 *                                   in the bucket.
 * @param {object}   [o.logger]
 * @returns {Promise<{audioId, revision, previousRevision, previousS3Key, previousDurationMs}>}
 */
async function swapClipInPlace ({
  supabase, audioId, newS3Key, durationMs = null, fileSizeBytes = null,
  patch = {}, source, acceptedBy, reason = null, verifyObject = null, logger = null,
}) {
  if (!supabase) throw new Error('swapClipInPlace: supabase client is required')
  if (!audioId) throw new Error('swapClipInPlace: audioId is required')
  if (!newS3Key) throw new Error('swapClipInPlace: newS3Key is required')
  if (!acceptedBy) throw new Error('swapClipInPlace: acceptedBy is required (history column is NOT NULL)')

  // Make before break: prove the new bytes are really in the bucket BEFORE the
  // row is pointed at them.
  if (verifyObject) {
    const exists = await verifyObject(newS3Key)
    if (!exists) throw new Error(`new object ${newS3Key} not in bucket — refusing to swap`)
  }

  const { data: row, error: readErr } = await supabase
    .from('course_audio')
    .select('id, course_code, s3_key, duration_ms, audio_revision')
    .eq('id', audioId)
    .single()
  if (readErr || !row) {
    throw new Error(`swap target ${audioId} not readable: ${readErr?.message || 'no row'}`)
  }

  const previousRevision = row.audio_revision ?? 1
  const revision = previousRevision + 1

  // History first — a swap that is not recorded is worse than one that does not
  // happen. This is the rollback ledger.
  //
  // UPSERT, not insert. The history write and the row update below are not
  // atomic, so a run killed between them leaves a history row for revision N
  // while course_audio still says N-1. Every retry then recomputes the same
  // revision number and dies on the unique (audio_id, revision) constraint — a
  // PERMANENT poison pill, not a transient: that clip could never be
  // re-rendered again. Seen 2026-08-08, one clip per interrupted band.
  // Re-writing the row is the correct repair: previous_s3_key is unchanged (the
  // swap never landed), only the new render's details differ.
  const { error: histErr } = await supabase
    .from('course_audio_revisions')
    .upsert({
      audio_id: row.id,
      course_code: row.course_code,
      revision,
      previous_revision: previousRevision,
      previous_s3_key: row.s3_key,
      new_s3_key: newS3Key,
      previous_duration_ms: row.duration_ms,
      new_duration_ms: durationMs,
      source: source || null,
      accepted_by: acceptedBy,
      reason,
    }, { onConflict: 'audio_id,revision' })
  if (histErr) throw new Error(`writing revision history for ${row.id}: ${histErr.message}`)

  const update = { ...patch, s3_key: newS3Key, audio_revision: revision }
  if (durationMs !== null && durationMs !== undefined) update.duration_ms = durationMs
  if (fileSizeBytes !== null && fileSizeBytes !== undefined) update.file_size_bytes = fileSizeBytes
  // Never ours to move: doing so breaks the unique key or the stable id.
  delete update.id
  delete update.text
  delete update.text_normalized

  const { error: swapErr } = await supabase
    .from('course_audio')
    .update(update)
    .eq('id', row.id)
  if (swapErr) throw new Error(`swapping clip ${row.id}: ${swapErr.message}`)

  // The revision is the whole point of this function, so assert it took rather
  // than trusting the write. A silent no-op here reproduces the exact bug.
  const { data: after, error: afterErr } = await supabase
    .from('course_audio')
    .select('id, s3_key, audio_revision')
    .eq('id', row.id)
    .single()
  if (afterErr || !after) throw new Error(`post-swap read of ${row.id} failed: ${afterErr?.message || 'no row'}`)
  if (after.s3_key !== newS3Key) throw new Error(`s3_key did not take on ${row.id}`)
  if ((after.audio_revision ?? 1) !== revision) {
    throw new Error(`audio_revision is ${after.audio_revision} on ${row.id}, expected ${revision}`)
  }

  if (logger?.info) {
    logger.info(`[RevisionSwap] ${row.id} -> revision ${revision} via ${source} (${row.s3_key} superseded, retained)`)
  }

  return {
    audioId: row.id,
    revision,
    previousRevision,
    previousS3Key: row.s3_key,
    previousDurationMs: row.duration_ms,
  }
}

/**
 * Write a freshly rendered clip to its identity key: INSERT when the key is
 * free, versioned SWAP when something already holds it.
 *
 * /regenerate-phrase and /regenerate-lego both used to do this with a single
 * UPSERT on `unique_course_audio_per_voice`, which cannot tell the two cases
 * apart. A CHANGED text mints a new uuid — new learner ref, every cache misses
 * correctly. An UNCHANGED text collides and lands on the EXISTING row — same
 * uuid, same ref — so the UPSERT quietly did an unversioned in-place swap and
 * returned a success that looked identical. /regenerate-lego LOCKS its text, so
 * for that route the unversioned branch was the normal path, not the edge case.
 *
 * The insert is a plain INSERT rather than an UPSERT on purpose: a concurrent
 * writer that creates the row between the lookup and the write must raise 23505
 * so it can be routed through the versioned swap, instead of silently
 * overwriting the row unversioned. The "never 500 on
 * unique_course_audio_per_voice" guarantee the UPSERT was there for is kept —
 * the 23505 is caught here.
 *
 * @param {object} o
 * @param {object} o.supabase
 * @param {object} o.identity   { course_code, text_normalized, language, role, voice_id }
 *                              — the unique key. Matched exactly.
 * @param {object} o.insertRow  Full row to INSERT when the key is free.
 * @param {object} o.swapPatch  Columns to write when swapping onto an existing row.
 *                              Must NOT include text/identity columns.
 * @param {string} o.newS3Key
 * @param {number} [o.durationMs]
 * @param {string} o.source
 * @param {string} o.acceptedBy
 * @param {string} [o.reason]
 * @param {object} [o.logger]
 * @returns {Promise<{audioId: string, created: boolean, revision: number|null}>}
 */
async function writeOrSwapClip ({
  supabase, identity, insertRow, swapPatch, newS3Key, durationMs = null,
  source, acceptedBy, reason = null, logger = null,
}) {
  const findHolder = async (single) => {
    let q = supabase.from('course_audio').select('id')
    for (const [col, val] of Object.entries(identity)) q = q.eq(col, val)
    return single ? q.single() : q.maybeSingle()
  }

  const swapOnto = async (audioId, why) => {
    const out = await swapClipInPlace({
      supabase, audioId, newS3Key, durationMs,
      patch: swapPatch, source, acceptedBy, reason: why, logger,
    })
    return { audioId, created: false, revision: out.revision }
  }

  const { data: holder } = await findHolder(false)
  if (holder) return swapOnto(holder.id, reason)

  const { data: inserted, error: insertError } = await supabase
    .from('course_audio')
    .insert(insertRow)
    .select('id')
    .single()

  if (!insertError) return { audioId: inserted.id, created: true, revision: null }
  if (insertError.code !== '23505') throw insertError

  // Lost the race. Someone created the row after our lookup — swap onto it
  // rather than letting the collision either 500 or overwrite unversioned.
  const { data: raced, error: racedErr } = await findHolder(true)
  if (racedErr || !raced) throw insertError
  return swapOnto(raced.id, reason ? `${reason} (concurrent-create race)` : 'concurrent-create race')
}

module.exports = { swapClipInPlace, writeOrSwapClip }
