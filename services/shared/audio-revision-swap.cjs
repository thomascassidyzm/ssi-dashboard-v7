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
 * What it does NOT do, deliberately: it never writes text_normalized, language
 * or role. Leaving those alone is what keeps `unique_course_audio_per_voice`
 * satisfied and the row id stable, and a stable id is what makes the swap
 * hole-free — no holder FK moves, so the course cannot reference a missing clip
 * at any instant. Callers that need to change voice_id — or the display `text`
 * — pass it in `patch` with their eyes open; see the note at the delete lines
 * for why those two are different from text_normalized.
 */

const { audioKeyCandidates } = require('./text-normalize.cjs')
const { toWordTimingsColumn } = require('./word-timings.cjs')

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
 *                                   May carry `text` — the display label — when
 *                                   the caller holds the authoritative new
 *                                   wording. It may NOT move the row's identity
 *                                   key: a `text` that normalises to something
 *                                   other than the row's own text_normalized is
 *                                   refused, loudly, before anything is written.
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
    .select('id, course_code, s3_key, duration_ms, audio_revision, text_normalized')
    .eq('id', audioId)
    .single()
  if (readErr || !row) {
    throw new Error(`swap target ${audioId} not readable: ${readErr?.message || 'no row'}`)
  }

  // A caller-supplied `text` is a RELABEL, never a re-identification. The
  // BEFORE UPDATE trigger trg_course_audio_normalize recomputes
  // text_normalized := normalize_text(NEW.text) on every write, so a `text`
  // that normalises differently moves the identity key out from under the row
  // whatever this function deletes from the patch — deleting text_normalized
  // alone cannot stop it. That is a NEW clip identity, which means a new row
  // and a new uuid (writeOrSwapClip's insert branch), not a swap. Refuse it
  // here, before the ledger row is written and before a revision is burned.
  if (Object.prototype.hasOwnProperty.call(patch, 'text')) {
    const candidates = audioKeyCandidates(patch.text)
    if (row.text_normalized && !candidates.includes(row.text_normalized)) {
      throw new Error(
        `swapClipInPlace: patch.text ${JSON.stringify(String(patch.text).slice(0, 60))} ` +
        `normalises to ${JSON.stringify(candidates[0])}, but ${row.id} is keyed on ` +
        `${JSON.stringify(row.text_normalized)} — that is a new clip identity, not a swap`
      )
    }
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
  // WORD TIMINGS DESCRIBE BYTES, NOT THE ROW. `word_timings` was measured on
  // the render that lives under s3_key, so the moment s3_key moves the old
  // timings describe audio nobody hears any more — a human re-record replacing
  // a Cartesia clip is the plain case (cold-verify #415, 2026-09-12). The swap
  // is the one seam that moves s3_key, so it is where the column is cleared:
  // NULL unless the replacement brings its own timings in `patch`, and those
  // are re-validated through the contract so a half-shape stores NULL too.
  update.word_timings = toWordTimingsColumn(patch.word_timings)
  if (durationMs !== null && durationMs !== undefined) update.duration_ms = durationMs
  if (fileSizeBytes !== null && fileSizeBytes !== undefined) update.file_size_bytes = fileSizeBytes
  // TWO COLUMNS, TWO DIFFERENT REASONS — and only one of them is ours to hold.
  //
  // `text_normalized` IS THE IDENTITY. It is the key column of
  // unique_course_audio_per_voice (course_code + text_normalized + language +
  // role + voice_id) and what writeOrSwapClip's holder lookup matches on.
  // Moving it re-identifies the clip, so it never travels through a swap: a
  // genuinely different text is a different clip, which means a new row and a
  // new uuid, not new bytes under this one. Stripped unconditionally. (The
  // guard above is what makes that stick, because the normalize trigger would
  // otherwise recompute it from a changed `text` anyway.)
  //
  // `text` IS THE DISPLAY LABEL. It is not in the unique key and no lookup
  // matches on it, so writing it moves nothing. Stripping it was a real bug:
  // a punctuation-only or wording re-render — an Italian question mark, say —
  // lands on the same identity key, swaps the bytes correctly, and then left
  // the OLD label on the row forever. Measured 2026-09-10: 322 of 324 audited
  // ita_for_eng slots held correct audio under a stale label. So a caller that
  // holds the authoritative new wording passes it in `patch` and it is written.
  // DO NOT "fix" this back by deleting text again.
  delete update.id
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
 *                              — the unique key. Every column is matched
 *                              exactly EXCEPT text_normalized, which is matched
 *                              against audioKeyCandidates() of the raw text; see
 *                              the note above findHolder.
 * @param {string} [o.identity.text] Raw (un-normalised) text, if it is not
 *                              `insertRow.text`. Never used as a filter column.
 * @param {object} o.insertRow  Full row to INSERT when the key is free.
 * @param {object} o.swapPatch  Columns to write when swapping onto an existing row.
 *                              Must NOT include identity columns
 *                              (text_normalized, language, role). It SHOULD
 *                              include `text` when the caller holds the
 *                              authoritative new wording: the swap branch is
 *                              reached precisely when the new text keys to the
 *                              same row, i.e. a punctuation- or case-only
 *                              change, and without it that row keeps the old
 *                              label under the new audio.
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
  // THE KEY COLUMN DOES NOT HOLD ONE CONVENTION, SO IT CANNOT BE MATCHED WITH .eq().
  // `course_audio.text_normalized` is rewritten on every write by the trigger
  // trg_course_audio_normalize, whose normalize_text() strips a trailing '?' that
  // the JS normalizeForAudio() keeps — and rows written before that trigger keep
  // theirs. Callers hand us normalizeForAudio(text), so an .eq() lookup on a
  // question could not see its own row: it missed, INSERTed, hit 23505 on
  // unique_course_audio_per_voice, and the race retry (the same .eq()) missed
  // again, so the route 500'd AFTER paying for the render. Live on
  // ita_for_eng:S0154L01U01. See services/shared/text-normalize.cjs.
  const rawText = identity.text ?? insertRow?.text ?? identity.text_normalized
  const keyCandidates = [...new Set(
    [...audioKeyCandidates(rawText), identity.text_normalized].filter(Boolean)
  )]

  const findHolder = async () => {
    let q = supabase.from('course_audio').select('id, text_normalized')
    for (const [col, val] of Object.entries(identity)) {
      if (col === 'text') continue                        // raw text is not a key column
      if (col === 'text_normalized') { q = q.in(col, keyCandidates); continue }
      q = q.eq(col, val)
    }
    const { data, error } = await q
    if (error) {
      // A read that failed is not a key that is free — but neither is it a
      // holder. Fall through as before: the INSERT decides, and a 23505 comes
      // back here.
      if (logger?.warn) logger.warn(`[RevisionSwap] holder lookup failed: ${error.message}`)
      return null
    }
    const rows = data || []
    if (rows.length <= 1) return rows[0] || null
    // Both conventions are present under this key. Prefer the spelling the
    // trigger writes today — that is the row a fresh INSERT would collide with.
    for (const candidate of keyCandidates) {
      const hit = rows.find(row => row.text_normalized === candidate)
      if (hit) return hit
    }
    return rows[0]
  }

  const swapOnto = async (audioId, why) => {
    const out = await swapClipInPlace({
      supabase, audioId, newS3Key, durationMs,
      patch: swapPatch, source, acceptedBy, reason: why, logger,
    })
    return { audioId, created: false, revision: out.revision }
  }

  const holder = await findHolder()
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
  const raced = await findHolder()
  if (!raced) throw insertError
  return swapOnto(raced.id, reason ? `${reason} (concurrent-create race)` : 'concurrent-create race')
}

module.exports = { swapClipInPlace, writeOrSwapClip }
