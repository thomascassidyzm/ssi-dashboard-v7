/**
 * Where a course's canonical (English reference) seed text comes from.
 *
 * Default: the shared canonical_seeds table, read exactly as it always was.
 * Override: a course with a row in canonical_list_assignments reads its own list
 * from canonical_list_seeds instead (Aran's ruling, 2026-10-07: a separate canonical
 * list for the Welsh courses that "doesn't impact on any other course"). Tables:
 * database/changes/20261007_canonical_seed_lists.sql.
 *
 * An assigned list is COMPLETE for its course: a seed number missing from the list, or
 * stored as '', is an empty canonical slot. It never falls back to canonical_seeds —
 * the Welsh North list has an 11-seed insert at 306-316, so canonical_seeds' 306 would be
 * the wrong sentence for that course.
 *
 * Returned rows are { seed_number, source_text } — the same shape canonical_seeds gave
 * every caller — so call sites change only the read, never what they do with it.
 */

async function assignedListId(supabase, courseCode) {
  const { data, error } = await supabase
    .from('canonical_list_assignments')
    .select('list_id')
    .eq('course_code', courseCode)
    .maybeSingle();
  if (error) {
    // Can't tell → behave as before this feature existed. Logged, because for an
    // assigned course this shows the shared canonical text instead of its own.
    console.warn(`[canonical-source] assignment lookup failed for ${courseCode}: ${error.message} — using canonical_seeds`);
    return null;
  }
  return data ? data.list_id : null;
}

/**
 * @param {object} supabase
 * @param {string} courseCode
 * @param {number[]} [seedNumbers]  omit for the whole list, ordered by seed_number
 * @returns {Promise<{data: Array<{seed_number:number, source_text:string}>|null, error: any, listId: string|null}>}
 */
async function fetchCanonicalSeeds(supabase, courseCode, seedNumbers) {
  const listId = await assignedListId(supabase, courseCode);

  let q = listId
    ? supabase.from('canonical_list_seeds').select('seed_number, source_text').eq('list_id', listId)
    : supabase.from('canonical_seeds').select('seed_number, source_text');
  q = seedNumbers ? q.in('seed_number', seedNumbers) : q.order('seed_number');

  const { data, error } = await q;
  return { data, error, listId };
}

module.exports = { fetchCanonicalSeeds, assignedListId };
