// services/shared/wipe-seed-teaching.cjs — tear down seeds' LEGOs and practice phrases in ONE transaction.
//
// Why one transaction (job #912): the database refuses, at commit, any write that leaves a debut LEGO
// (is_new) with no practice phrase (trigger debut_keeps_practice,
// database/migrations/20260930_debut_practice_guard.sql). "Delete the seed's phrases, then its LEGOs" as
// two PostgREST calls commits the first half alone — every debut in the seed empty, LEGOs still standing —
// and is refused. public.wipe_seed_teaching() deletes both inside one transaction, so the guard sees the
// LEGOs gone and passes, and a teardown can no longer stop half-way.
//
// seeds = null tears down the whole course, a window of seeds per call so no one statement meets the
// statement timeout on a 20k-row course; every window is whole seeds, so every call passes the guard.

const WINDOW = 25;

async function wipeSeedTeaching(supabase, courseCode, seeds = null) {
  if (!courseCode) throw new Error('wipeSeedTeaching: courseCode required');
  let list = seeds;
  if (list == null) {
    const found = new Set();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from('course_legos').select('seed_number')
        .eq('course_code', courseCode).order('seed_number').range(from, from + 999);
      if (error) throw new Error(`wipeSeedTeaching: listing seeds: ${error.message}`);
      for (const r of data || []) found.add(r.seed_number);
      if (!data || data.length < 1000) break;
    }
    list = [...found];
  }
  list = [...new Set(list.map(Number).filter((n) => Number.isInteger(n) && n > 0))].sort((a, b) => a - b);
  const total = { phrases_deleted: 0, legos_deleted: 0 };
  for (let i = 0; i < list.length; i += WINDOW) {
    const { data, error } = await supabase.rpc('wipe_seed_teaching', { p_course: courseCode, p_seeds: list.slice(i, i + WINDOW) });
    if (error) throw new Error(`wipe_seed_teaching ${courseCode} seeds ${list[i]}…: ${error.message}`);
    total.phrases_deleted += data?.phrases_deleted || 0;
    total.legos_deleted += data?.legos_deleted || 0;
  }
  return total;
}

module.exports = { wipeSeedTeaching };
