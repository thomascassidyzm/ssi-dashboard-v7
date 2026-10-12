// Page past PostgREST's 1000-row default cap, several pages in flight at once.
//
// Two live defects came from this one limit (measured 2026-10-12):
//   - getAllCourseContentStats read course_legos once and silently got <=1000 rows,
//     so completedSeeds undercounted every course with more than 1000 legos.
//   - /api/pod-scripts read 31,663 pod sentences as 32 SEQUENTIAL pages (~3-4 s).
// fetchPage(from, to) must return { data, error } for the inclusive range, ordered
// (offset paging without an ORDER BY can repeat or skip rows). Pages are fetched in
// waves of `concurrency`; the first short page ends the read. Rows come back in order.
async function fetchAllPages(fetchPage, { pageSize = 1000, concurrency = 8 } = {}) {
  const out = []
  for (let wave = 0; ; wave += concurrency) {
    const results = await Promise.all(
      Array.from({ length: concurrency }, (_, i) => {
        const from = (wave + i) * pageSize
        return fetchPage(from, from + pageSize - 1)
      })
    )
    let done = false
    for (const { data, error } of results) {
      if (error) throw error
      out.push(...(data || []))
      if (!data || data.length < pageSize) { done = true; break }
    }
    if (done) return out
  }
}

module.exports = { fetchAllPages }
