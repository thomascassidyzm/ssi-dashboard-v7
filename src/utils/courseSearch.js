/**
 * Course search — tokenised, fuzzy, ranked matching for the course pickers.
 *
 * Pure module: no Vue, no DOM, no network. Takes a query plus a list of
 * `{ code, name }` objects and returns the ranked, filtered list. That is what
 * makes it unit-testable without a browser, and what lets CourseSwitcherDropdown
 * and CoursePicker share ONE algorithm instead of two copies of a substring hack.
 *
 * Why it exists: the old filter was literal `.includes()`, so `cym ` (with the
 * trailing space Tom actually types) matched nothing — no course code contains
 * "m" followed by a space. Space, underscore and hyphen are the same separator
 * here, so `cym`, `cym `, `cym_` and `cym-` all reach the Welsh courses.
 */

// Rank bands, best first. A course's band is the best one it qualifies for.
export const RANK_EXACT_CODE = 0 // query === the whole course code
export const RANK_CODE_PREFIX = 1 // query is a prefix of the course code
export const RANK_WORD_START = 2 // every token starts a word in code or name
export const RANK_CONTAINS = 3 // every token appears somewhere in code or name
export const RANK_FUZZY = 4 // every token is at worst a near-miss on some word

/**
 * Edit budget by token length. Bounded distance rather than an open-ended
 * score: predictable, cheap, and it never lets a typo outrank a real hit.
 * 1-3 chars get no fuzz at all — otherwise `n` matches everything.
 */
export function editBudget(token) {
  if (token.length <= 3) return 0
  if (token.length <= 6) return 1
  return 2
}

/** Lower-case, and reduce every non-alphanumeric run (space, _, -, parens…) to one space. */
export function normalise(text) {
  if (text === null || text === undefined) return ''
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/** Normalised text split into words. `cym_n_for_eng` -> ['cym','n','for','eng']. */
export function tokenise(text) {
  const n = normalise(text)
  return n ? n.split(' ') : []
}

/**
 * Levenshtein distance, abandoned as soon as it provably exceeds `max`.
 * Returns `max + 1` for "further than that" rather than the true distance.
 */
export function boundedDistance(a, b, max) {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > max) return max + 1
  if (max === 0) return a === b ? 0 : 1

  let prev = new Array(b.length + 1)
  let curr = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    let rowMin = curr[0]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
      if (curr[j] < rowMin) rowMin = curr[j]
    }
    if (rowMin > max) return max + 1
    const swap = prev
    prev = curr
    curr = swap
  }
  return prev[b.length] > max ? max + 1 : prev[b.length]
}

/**
 * How well one query token matches one course's searchable text.
 * Lower is better; returns Infinity when the token does not match at all.
 */
function tokenRank(token, haystack, words) {
  for (const word of words) {
    if (word.startsWith(token)) return RANK_WORD_START
  }
  if (haystack.includes(token)) return RANK_CONTAINS

  const budget = editBudget(token)
  if (budget > 0) {
    for (const word of words) {
      // Whole-word near-miss ("welch" -> "welsh")…
      if (boundedDistance(token, word, budget) <= budget) return RANK_FUZZY
      // …or a near-miss on the word's opening, so a typo in a long word's
      // prefix still finds it ("engilsh" -> "english speakers").
      if (word.length > token.length) {
        if (boundedDistance(token, word.slice(0, token.length), budget) <= budget) return RANK_FUZZY
      }
    }
  }
  return Infinity
}

/** Build the searchable surface for one course, once per query. */
function indexCourse(course, getName) {
  const code = normalise(course && course.code)
  // Guard: the Supabase branch of loadCourses() builds objects without `name`.
  let name = normalise(course && course.name)
  if (!name && typeof getName === 'function') {
    try {
      name = normalise(getName(course && course.code))
    } catch {
      name = ''
    }
  }
  const haystack = name ? `${code} ${name}` : code
  return { code, haystack, words: haystack ? haystack.split(' ') : [] }
}

/**
 * Rank one course against an already-normalised query. Returns Infinity for
 * "no match". Exported for tests; components use `searchCourses`.
 */
export function rankCourse(course, normalisedQuery, getName) {
  if (!normalisedQuery) return RANK_EXACT_CODE
  const { code, haystack, words } = indexCourse(course, getName)
  if (!haystack) return Infinity

  if (code && code === normalisedQuery) return RANK_EXACT_CODE
  if (code && code.startsWith(normalisedQuery)) return RANK_CODE_PREFIX

  // Conjunctive: EVERY token must match something, so `welsh north` returns
  // the courses satisfying both, not every Welsh course plus everything northern.
  // The course's band is the worst band any of its tokens needed.
  let worst = RANK_WORD_START
  for (const token of normalisedQuery.split(' ')) {
    const r = tokenRank(token, haystack, words)
    if (r === Infinity) return Infinity
    if (r > worst) worst = r
  }
  return worst
}

/**
 * Filter + rank courses for a query.
 *
 * @param {string} query        raw user input; leading/trailing space ignored
 * @param {Array<{code:string,name?:string}>} courses
 * @param {{getName?: (code:string)=>string}} [options] fallback name resolver
 * @returns {Array} the matching courses, best first (input objects, unmodified)
 */
export function searchCourses(query, courses, options = {}) {
  const list = Array.isArray(courses) ? courses : []
  const q = normalise(query)
  if (!q) return list

  const getName = options.getName
  const scored = []
  for (let i = 0; i < list.length; i++) {
    const rank = rankCourse(list[i], q, getName)
    if (rank !== Infinity) scored.push({ course: list[i], rank, index: i })
  }

  // Deterministic within a band: shorter code first, then alphabetical, then
  // original order — so the list never jitters between renders.
  scored.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    const ac = String((a.course && a.course.code) || '')
    const bc = String((b.course && b.course.code) || '')
    if (ac.length !== bc.length) return ac.length - bc.length
    if (ac !== bc) return ac < bc ? -1 : 1
    return a.index - b.index
  })

  return scored.map((s) => s.course)
}

export default searchCourses
