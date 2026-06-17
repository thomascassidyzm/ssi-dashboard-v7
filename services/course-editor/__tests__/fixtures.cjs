/**
 * Test fixtures. Builds an in-memory DB with the SHAPE that caused the
 * 2026-06-17 incident: the same lego_id ('S0524L01') existing as a distinct
 * row in many courses, each with its own correct glosses.
 */

let idSeq = 1000
function uid() { return `id-${idSeq++}` }

function lego(courseCode, seedNumber, legoIndex, fields = {}) {
  return {
    id: uid(),
    course_code: courseCode,
    seed_number: seedNumber,
    lego_index: legoIndex,
    lego_id: `S${String(seedNumber).padStart(4, '0')}L${String(legoIndex).padStart(2, '0')}`,
    known_text: fields.known_text ?? 'placeholder',
    target_text: fields.target_text ?? 'placeholder',
    type: fields.type ?? 'A',
    is_new: fields.is_new ?? true,
    components: fields.components ?? null,
    status: fields.status ?? 'released',
    known_audio_id: fields.known_audio_id ?? uid(),
    target1_audio_id: fields.target1_audio_id ?? uid(),
    target2_audio_id: fields.target2_audio_id ?? uid(),
    presentation_audio_id: fields.presentation_audio_id ?? uid(),
  }
}

function phrase(courseCode, pid, fields = {}) {
  return {
    id: `${courseCode}:${pid}`,
    course_code: courseCode,
    seed_number: fields.seed_number ?? 1,
    lego_index: fields.lego_index ?? 1,
    known_text: fields.known_text ?? 'hello',
    target_text: fields.target_text ?? 'hola',
    phrase_role: fields.phrase_role ?? 'build',
    position: fields.position ?? 1,
    introduce: fields.introduce ?? false,
    word_count: fields.word_count ?? 1,
    lego_count: fields.lego_count ?? 1,
    known_audio_id: fields.known_audio_id ?? uid(),
    target1_audio_id: fields.target1_audio_id ?? uid(),
    target2_audio_id: fields.target2_audio_id ?? uid(),
  }
}

/**
 * Build the incident-shaped DB.
 * @param {number} nCourses how many courses share lego_id S0524L01
 */
function buildIncidentDb(nCourses = 79) {
  const course_legos = []
  for (let i = 0; i < nCourses; i++) {
    const code = `course_${String(i).padStart(2, '0')}_for_eng`
    // Each course's S0524L01 has its OWN correct English gloss.
    course_legos.push(lego(code, 524, 1, { known_text: `gloss-${i}`, target_text: `target-${i}` }))
    // plus an unrelated lego to ensure scoped edits don't touch siblings
    course_legos.push(lego(code, 17, 3, { known_text: `other-${i}`, target_text: `otra-${i}` }))
  }
  return { course_legos }
}

/** A small single-course DB for editing-operation tests. */
function buildSmallCourseDb(code = 'spa_for_eng') {
  return {
    course_legos: [
      lego(code, 1, 1, { known_text: 'I want (to)', target_text: 'quiero', type: 'M' }),
      lego(code, 2, 1, { known_text: 'he/she', target_text: 'él/ella' }),
      lego(code, 3, 1, { known_text: 'to read', target_text: 'leer' }),
    ],
    course_practice_phrases: [
      phrase(code, 'S0001L01B01', { known_text: 'do you want', target_text: 'quieres', seed_number: 1 }),
      phrase(code, 'S0001L01U01', { known_text: 'I want to read', target_text: 'quiero leer', seed_number: 1 }),
    ],
    course_seeds: [
      { id: `${code}-seed-1`, course_code: code, seed_number: 1, known_text: 'I want to speak', target_text: 'quiero hablar', status: 'released' },
    ],
    course_audio: [
      { id: 'aud-1', course_code: code, text: 'quiero', s3_key: 'mastered/AAA.mp3', role: 'target1' },
    ],
  }
}

module.exports = { buildIncidentDb, buildSmallCourseDb, lego, phrase }
