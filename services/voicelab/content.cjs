/**
 * VOICELAB content — real course text for the sentence picker.
 *
 * A voice that sounds fine on "hello, how are you" and falls over on the actual course
 * line is a voice that passed the wrong test, so the lab types from the course rather
 * than from imagination. Both reads are SELECT-only, spend nothing, and touch no audio
 * table: `courses` for the picker, `course_seeds` and `course_practice_phrases` for the
 * lines themselves.
 *
 * Language comes from `courses.target_lang`, which is the estate's own answer for what
 * language a course's target text is in — resolved through params.findLanguage because
 * that column says `zho` where the render table says `cmn`.
 */

const params = require('./params.cjs')

/** Lazy: mounting must not build a Supabase client, or a missing env takes the API down at boot. */
function client () {
  return require('../supabase-client.cjs').getClient()
}

/** Courses that have any content to pick from, newest content first. */
async function courses () {
  const { data, error } = await client()
    .from('courses')
    .select('course_code, display_name, target_lang, known_lang, seed_count, status')
    .order('seed_count', { ascending: false, nullsFirst: false })
    .limit(400)
  if (error) throw Object.assign(new Error(`courses read failed: ${error.message}`), { status: 502 })

  return (data || [])
    .filter((c) => (c.seed_count || 0) > 0)
    .map((c) => {
      const lang = params.findLanguage(c.target_lang)
      return {
        code: c.course_code,
        name: c.display_name || c.course_code,
        language: lang ? lang.code : String(c.target_lang || ''),
        languageName: lang ? lang.name : String(c.target_lang || 'unknown'),
        // A course whose target language this lab cannot steer is listed and marked,
        // not hidden — "it is not there" and "we cannot render it" are different facts.
        renderable: Boolean(lang),
        knownLang: c.known_lang,
        sentences: c.seed_count || 0,
        status: c.status,
      }
    })
}

/**
 * Lines from one course. `role` picks the table: seeds are the master sentences, and
 * everything else is a practice phrase filtered by phrase_role.
 *
 * @param {object} a
 * @param {string} a.course
 * @param {string} [a.role]   'seed' | 'build' | 'use' | 'component' | 'any'
 * @param {string} [a.q]      free-text, matched against the target text
 * @param {number} [a.limit]
 */
async function sentences ({ course, role = 'seed', q = '', limit = 50 }) {
  if (!course) throw Object.assign(new Error('course is required'), { status: 400 })
  const cap = Math.min(Math.max(Number(limit) || 50, 1), 200)

  const { data: courseRow, error: courseErr } = await client()
    .from('courses')
    .select('course_code, target_lang')
    .eq('course_code', course)
    .single()
  if (courseErr) throw Object.assign(new Error(`unknown course ${course}`), { status: 404 })
  const lang = params.findLanguage(courseRow.target_lang)
  const language = lang ? lang.code : String(courseRow.target_lang || '')

  const wantSeeds = role === 'seed' || role === 'any'
  const wantPhrases = role !== 'seed'
  const out = []

  if (wantSeeds) {
    let query = client()
      .from('course_seeds')
      .select('seed_id, seed_number, known_text, target_text')
      .eq('course_code', course)
      .order('seed_number', { ascending: true })
      .limit(cap)
    if (q) query = query.ilike('target_text', `%${q}%`)
    const { data, error } = await query
    if (error) throw Object.assign(new Error(`seeds read failed: ${error.message}`), { status: 502 })
    for (const r of data || []) {
      out.push({
        id: r.seed_id || `${course}:S${r.seed_number}`,
        text: r.target_text,
        knownText: r.known_text,
        language,
        role: 'seed',
        source: `${course} seed ${r.seed_number}`,
      })
    }
  }

  if (wantPhrases && out.length < cap) {
    let query = client()
      .from('course_practice_phrases')
      .select('id, seed_number, lego_index, known_text, target_text, phrase_role')
      .eq('course_code', course)
      .order('seed_number', { ascending: true })
      .limit(cap - out.length)
    if (role && role !== 'any') query = query.eq('phrase_role', role)
    if (q) query = query.ilike('target_text', `%${q}%`)
    const { data, error } = await query
    if (error) throw Object.assign(new Error(`phrases read failed: ${error.message}`), { status: 502 })
    for (const r of data || []) {
      out.push({
        id: r.id,
        text: r.target_text,
        knownText: r.known_text,
        language,
        role: r.phrase_role || 'phrase',
        source: `${course} S${r.seed_number}L${r.lego_index} ${r.phrase_role || ''}`.trim(),
      })
    }
  }

  return { course, language, sentences: out.filter((s) => String(s.text || '').trim()) }
}

module.exports = { courses, sentences }
