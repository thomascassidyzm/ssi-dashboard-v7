/**
 * Seed completion marker — the LAST write of a decomposition, never the first.
 *
 * `course_seeds.decomposed_at` is what says "this seed is done": build-manager's
 * getBuildProgress counts it as completion, /api/build/status reports on it, and
 * phase8 renders audio only for seeds whose status is 'released'. So stamping it
 * before the LEGOs and phrases are written means a partial failure mid-seed
 * leaves a seed that LOOKS complete, is never retried, and can be sent for TTS
 * with content missing.
 *
 * The two halves of a decomposition write are therefore split here so the order
 * is structural rather than a thing you have to remember:
 *   1. writeSeedRow()      — the text, with NO completion marker;
 *   2. …write LEGOs and phrases, throwing on the first failure…
 *   3. markSeedDecomposed() — the marker, and only if content actually landed.
 *
 * If step 2 throws, the seed stays un-decomposed and the pipeline legitimately
 * retries it.
 */

const COMPLETION_COLUMNS = ['status', 'decomposed_at'];

/**
 * Write the seed's text WITHOUT the completion marker.
 * Throws if a caller tries to smuggle the marker in with the content.
 */
async function writeSeedRow(supabase, row, eventId = null) {
  const smuggled = COMPLETION_COLUMNS.filter(c => row[c] !== undefined);
  if (smuggled.length > 0) {
    throw new Error(
      `writeSeedRow must not set the completion marker (${smuggled.join(', ')}) — ` +
      'call markSeedDecomposed after the LEGOs and phrases are written.'
    );
  }

  const { error } = await supabase
    .from('course_seeds')
    // Only write attribution when we actually have an event — a null here would
    // clobber an existing row's last_edit_event_id, which is a claim we must not make.
    .upsert(eventId ? { ...row, last_edit_event_id: eventId } : { ...row },
            { onConflict: 'course_code,seed_number' });

  if (error) throw new Error(`Seed insert failed: ${error.message}`);
}

/**
 * Stamp the seed complete. Refuses if the seed has no LEGOs — a seed with no
 * content is not decomposed, whatever the caller believes.
 */
async function markSeedDecomposed(supabase, { course_code, seed_number, eventId = null }) {
  const { data: legos, error: checkError } = await supabase
    .from('course_legos')
    .select('id')
    .eq('course_code', course_code)
    .eq('seed_number', seed_number)
    .limit(1);

  if (checkError) throw new Error(`Completion check failed: ${checkError.message}`);
  if (!legos || legos.length === 0) {
    throw new Error(
      `Refusing to mark S${String(seed_number).padStart(4, '0')} decomposed: no LEGOs were written.`
    );
  }

  const { error } = await supabase
    .from('course_seeds')
    .update({
      status: 'released',
      decomposed_at: new Date().toISOString(),
      ...(eventId ? { last_edit_event_id: eventId } : {}),
    })
    .eq('course_code', course_code)
    .eq('seed_number', seed_number);

  if (error) throw new Error(`Seed completion stamp failed: ${error.message}`);
}

module.exports = { writeSeedRow, markSeedDecomposed, COMPLETION_COLUMNS };
