/**
 * Read EVERY row a PostgREST query matches, page by page.
 *
 * PostgREST caps a single select at the project's max-rows (60,000 on the SSi
 * project) and says nothing when it does: `.limit(100000)` quietly returns the
 * first 60,000. On 2026-09-26 that cap hid 31,245 of eng_for_hin's 91,245
 * course_audio rows from the phase8 linker, so fresh clips never linked, their
 * slots stayed NULL and every /generate pass re-rendered them — 37 passes,
 * 7.6M Cartesia characters (job #382).
 *
 * `build` must return a FRESH query builder each call (builders are single-use).
 * Pages are ordered by `orderCol` so offsets are stable, and the loop ends on an
 * EMPTY page rather than on a short one: a server whose max-rows is smaller than
 * `pageSize` returns short pages that are not the last, and stopping on the
 * first short page would reintroduce the very truncation this exists to end.
 */
async function readAllPages(build, { pageSize = 5000, orderCol = 'id', max = Infinity } = {}) {
  const rows = []
  let offset = 0
  for (;;) {
    const want = Math.min(pageSize, max - rows.length)
    if (want <= 0) break
    const { data, error } = await build()
      .order(orderCol, { ascending: true })
      .range(offset, offset + want - 1)
    if (error) throw new Error(error.message || String(error))
    if (!data || !data.length) break
    rows.push(...data)
    offset += data.length
  }
  return rows
}

module.exports = { readAllPages }
