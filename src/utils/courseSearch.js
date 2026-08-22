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

const NO_MATCH = { rank: Infinity, at: 0 }

/**
 * How well one query token matches one course's searchable text, and WHERE.
 * `rank` is lower-is-better; `at` is the index of the first word that matched.
 *
 * `at` is what makes "welsh" put "Welsh for Yoruba Speakers" above "Arabic for
 * Welsh Speakers": both are word-start hits, but the earlier the hit sits, the
 * more the course is about the thing you typed. Code words come first, so a
 * code hit always beats a name hit too.
 */
function tokenMatch(token, words) {
  for (let i = 0; i < words.length; i++) {
    if (words[i].startsWith(token)) return { rank: RANK_WORD_START, at: i }
  }
  for (let i = 0; i < words.length; i++) {
    if (words[i].includes(token)) return { rank: RANK_CONTAINS, at: i }
  }

  const budget = editBudget(token)
  if (budget > 0) {
    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      // Whole-word near-miss ("welch" -> "welsh")…
      if (boundedDistance(token, word, budget) <= budget) return { rank: RANK_FUZZY, at: i }
      // …or a near-miss on the word's opening, so a typo in a long word's
      // prefix still finds it ("engilsh" -> "english speakers").
      if (
        word.length > token.length &&
        boundedDistance(token, word.slice(0, token.length), budget) <= budget
      ) {
        return { rank: RANK_FUZZY, at: i }
      }
    }
  }
  return NO_MATCH
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
 * Score one course against an already-normalised query.
 * `rank` is the band (Infinity = no match); `offset` orders within a band.
 */
function scoreCourse(course, normalisedQuery, getName) {
  const { code, haystack, words } = indexCourse(course, getName)
  if (!haystack) return NO_MATCH_SCORE

  if (code && code === normalisedQuery) return { rank: RANK_EXACT_CODE, offset: 0 }
  if (code && code.startsWith(normalisedQuery)) return { rank: RANK_CODE_PREFIX, offset: 0 }

  // Conjunctive: EVERY token must match something, so `welsh north` returns
  // the courses satisfying both, not every Welsh course plus everything northern.
  // The course's band is the worst band any of its tokens needed.
  let worst = RANK_WORD_START
  let offset = 0
  for (const token of normalisedQuery.split(' ')) {
    const m = tokenMatch(token, words)
    if (m.rank === Infinity) return NO_MATCH_SCORE
    if (m.rank > worst) worst = m.rank
    offset += m.at
  }
  return { rank: worst, offset }
}

const NO_MATCH_SCORE = { rank: Infinity, offset: 0 }

/**
 * Rank one course against an already-normalised query. Returns Infinity for
 * "no match". Exported for tests; components use `searchCourses`.
 */
export function rankCourse(course, normalisedQuery, getName) {
  if (!normalisedQuery) return RANK_EXACT_CODE
  return scoreCourse(course, normalisedQuery, getName).rank
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
    const { rank, offset } = scoreCourse(list[i], q, getName)
    if (rank !== Infinity) scored.push({ course: list[i], rank, offset, index: i })
  }

  // Deterministic within a band: earliest match first, then shorter code, then
  // alphabetical, then original order — so the list never jitters between renders.
  scored.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    if (a.offset !== b.offset) return a.offset - b.offset
    const ac = String((a.course && a.course.code) || '')
    const bc = String((b.course && b.course.code) || '')
    if (ac.length !== bc.length) return ac.length - bc.length
    if (ac !== bc) return ac < bc ? -1 : 1
    return a.index - b.index
  })

  return scored.map((s) => s.course)
}

export default searchCourses
