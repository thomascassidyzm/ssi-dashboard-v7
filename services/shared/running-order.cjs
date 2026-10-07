/**
 * A course's RUNNING ORDER, when it has one apart from its seed ids (job #949).
 *
 * Everywhere in the course builder, "already taught" has meant "lower seed number". A course
 * with a row in course_seed_weave plays its seeds in a different order (a block of seeds with
 * ids >= 1000 slotted after an old seed, some seeds dropped), and the DB view
 * course_running_order gives each KEPT seed its position. Tables and view:
 * database/changes/20261007_course_seed_weave.sql.
 *
 * THE FALLBACK IS THE SAFETY ARGUMENT. For a course with no running-order rows every function
 * here answers "no running order" (null), and every caller then runs the exact query or
 * comparison it ran before this module existed. So every course but a woven one is untouched.
 *
 * Position, not id, is "before" in a woven course: the history of a block seed is the old seeds
 * before the insert point plus the block seeds before it — never old 138-316. Dropped seeds are
 * not in the running order, so they are never anybody's history.
 */

/**
 * @returns {Promise<RunningOrder|null>} null when the course has no running order (or it
 *   cannot be read: then the caller behaves exactly as before, and the reason is logged).
 *
 * @typedef {object} RunningOrder
 * @property {Map<number, number>} positionOf  seed_number -> position (kept seeds only)
 * @property {number[]} seeds                  kept seed numbers in running order
 */
async function loadRunningOrder(supabase, courseCode) {
  let data, error;
  try {
    ({ data, error } = await supabase
      .from('course_running_order')
      .select('seed_number, position')
      .eq('course_code', courseCode)
      .order('position')
      .range(0, 9999));
  } catch (e) {
    error = e;
  }
  if (error) {
    console.warn(`[running-order] could not read course_running_order for ${courseCode}: ${error.message} — using seed_number order`);
    return null;
  }
  // Anything that is not a list of {seed_number, position} integers is "no running order":
  // the caller then does exactly what it did before this module existed.
  if (!Array.isArray(data) || data.length === 0) return null;
  if (!data.every(r => r && Number.isInteger(r.seed_number) && Number.isInteger(r.position))) return null;
  return fromRows(data);
}

function fromRows(rows) {
  const sorted = [...rows].sort((a, b) => a.position - b.position);
  return {
    positionOf: new Map(sorted.map(r => [r.seed_number, r.position])),
    seeds: sorted.map(r => r.seed_number),
  };
}

/**
 * Seeds that come before `seedNumber` in the running order (or up to and including it, with
 * `inclusive`). A seed that is not in the running order (dropped) has no history: [].
 */
function seedsBefore(order, seedNumber, { inclusive = false } = {}) {
  const p = order.positionOf.get(seedNumber);
  if (p === undefined) return [];
  return order.seeds.filter(n => {
    const q = order.positionOf.get(n);
    return inclusive ? q <= p : q < p;
  });
}

/**
 * Apply "seed_number before N" to a PostgREST query. order === null -> the exact filter the
 * caller always used (.lt, or .lte with inclusive). Otherwise an IN-list of the seeds before N
 * in running order (at most a few thousand small integers; well inside the URL limit).
 */
function filterSeedsBefore(query, order, seedNumber, { inclusive = false } = {}) {
  if (!order) return inclusive ? query.lte('seed_number', seedNumber) : query.lt('seed_number', seedNumber);
  const before = seedsBefore(order, seedNumber, { inclusive });
  // An empty IN-list is a syntax error in PostgREST; -1 matches nothing (seed_number > 0).
  return query.in('seed_number', before.length ? before : [-1]);
}

/** Where a seed sits for "earlier/later" comparisons: its position, or its own number when unwoven. */
function orderKey(order, seedNumber) {
  if (!order) return seedNumber;
  const p = order.positionOf.get(seedNumber);
  return p === undefined ? Infinity : p;
}

module.exports = { loadRunningOrder, fromRows, seedsBefore, filterSeedsBefore, orderKey };
