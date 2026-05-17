// services/phrase-decomposition-writer.cjs
//
// Thin wrapper that computes + stores decompositions for freshly-written
// course_practice_phrases rows. Called from phrase-save paths AFTER the
// phrase insert/upsert has succeeded.
//
// Design constraints (from PHRASE_DECOMPOSITION_SPEC.md + Tom's notes):
//
//   1. NEVER block the write on decomposition failure. If decomposition
//      throws (vocabulary fetch fails, integrity check fails, etc.), we log
//      a warning and leave the row's `decomposition` column NULL. The
//      runtime fallback picks up null and runs its alignment path — no
//      learner-visible breakage.
//
//   2. ONE call per (course, seed, lego_index) batch. The vocabulary fetch
//      is the expensive bit (one query per phrase would be N+1). We cache
//      vocabulary per courseCode for the duration of one decoration pass.
//
//   3. Stamp `decomposition_course_version` with courses.version AT WRITE
//      TIME — this is the staleness key the backfill endpoint uses to
//      detect drift.
//
// The function signature is shaped to fit the existing call sites:
//   - savePracticePhrase (course-data-service.cjs) returns one row
//   - seed-complete batch upsert hands us many rows at once
// Both end up calling decoratePhrasesWithDecomposition(supabase, rows).

const { decomposeText } = require('./phrase-decomposer.cjs')

// Small in-function cache used per decoration pass. We don't memoise across
// requests because course_legos can change between requests (that's the whole
// point of the version-stamp drift detection). Within one pass, all phrases
// will see the same vocabulary anyway — re-fetching for each would be silly.
async function fetchCourseVocabulary(supabase, courseCode, maxSeedNumber) {
  const { data, error } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, target_text, known_text')
    .eq('course_code', courseCode)
    .lte('seed_number', maxSeedNumber)
  if (error) throw new Error(`vocab fetch: ${error.message}`)
  return (data || []).map(l => ({
    lego_id: `S${String(l.seed_number).padStart(4, '0')}L${String(l.lego_index).padStart(2, '0')}`,
    target_text: l.target_text,
    known_text: l.known_text,
    seed_number: l.seed_number
  }))
}

async function fetchCourseVersion(supabase, courseCode) {
  const { data, error } = await supabase
    .from('courses')
    .select('version')
    .eq('course_code', courseCode)
    .single()
  if (error) throw new Error(`courses version fetch: ${error.message}`)
  return data?.version ?? null
}

/**
 * Compute + store decomposition for one or more freshly-written phrase rows.
 *
 * Phrases must already exist in course_practice_phrases — this only writes
 * the `decomposition` and `decomposition_course_version` columns.
 *
 * @param {SupabaseClient} supabase
 * @param {Array<{id: string, course_code: string, seed_number: number, target_text: string}>} phrases
 * @param {Object} [opts]
 * @param {Function} [opts.logger] — Optional logger; defaults to console.warn
 *
 * @returns {Promise<{decorated: number, skipped: number}>}
 *   Never throws. Failures are logged + counted in `skipped`.
 */
async function decoratePhrasesWithDecomposition(supabase, phrases, opts = {}) {
  const warn = opts.logger || ((msg) => console.warn(`[decomposition] ${msg}`))

  if (!Array.isArray(phrases) || phrases.length === 0) {
    return { decorated: 0, skipped: 0 }
  }

  // Group phrases by course_code so we batch the vocabulary fetch.
  // Within a course, we further filter vocabulary by the phrase's seed_number
  // (seed_number ≤ phrase.seed_number) — but we fetch the WHOLE vocabulary
  // once per course and slice in memory, which is way cheaper than per-phrase
  // queries.
  const byCourse = new Map()
  for (const p of phrases) {
    if (!p?.course_code || !p?.target_text || typeof p?.seed_number !== 'number') continue
    if (!byCourse.has(p.course_code)) byCourse.set(p.course_code, [])
    byCourse.get(p.course_code).push(p)
  }

  let decorated = 0
  let skipped = 0

  for (const [courseCode, coursePhrases] of byCourse) {
    let vocabulary, version
    try {
      // Fetch vocabulary up to the highest seed_number in this batch.
      // Slicing per-phrase is cheap in memory.
      const maxSeed = Math.max(...coursePhrases.map(p => p.seed_number))
      ;[vocabulary, version] = await Promise.all([
        fetchCourseVocabulary(supabase, courseCode, maxSeed),
        fetchCourseVersion(supabase, courseCode)
      ])
    } catch (e) {
      warn(`${courseCode}: skipped ${coursePhrases.length} phrase(s) — ${e.message}`)
      skipped += coursePhrases.length
      continue
    }

    // Per-phrase: filter vocabulary to seed_number ≤ phrase.seed_number,
    // run decomposeText, write back.
    for (const p of coursePhrases) {
      try {
        const vocabForPhrase = vocabulary.filter(l => l.seed_number <= p.seed_number)
        const blocks = decomposeText(p.target_text, vocabForPhrase)

        const { error: updateErr } = await supabase
          .from('course_practice_phrases')
          .update({
            decomposition: blocks,
            decomposition_course_version: version
          })
          .eq('id', p.id)

        if (updateErr) {
          warn(`${p.id}: write failed — ${updateErr.message}`)
          skipped++
        } else {
          decorated++
        }
      } catch (e) {
        // decomposeText threw — integrity violation or runaway loop.
        // Log + skip. The row keeps decomposition=NULL and the runtime
        // fallback handles rendering.
        warn(`${p.id}: decompose failed — ${e.message}`)
        skipped++
      }
    }
  }

  return { decorated, skipped }
}

module.exports = {
  decoratePhrasesWithDecomposition,
  // Re-export for callers that don't already import the pure module
  decomposeText
}
