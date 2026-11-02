'use strict'
// The intro a LEGO plays is the clip course_legos.presentation_audio_id points at — not "the course_audio row
// whose lego_id is this LEGO". A presentation re-render (POST /api/audio/render, role presentation + legoId)
// writes a NEW row carrying the same lego_id and repoints the LEGO, keeping the old row (make-before-break),
// so a LEGO can own several presentation rows. Reading by lego_id with maybeSingle() then errored
// ("multiple (or no) rows returned") — job #978, fin_for_eng's 687 as-in intros. Read the link first.
const COLS = 'id, text, s3_key, duration_ms'

async function loadPresentationClip(db, courseCode, legoId) {
  const { data: lego, error: legoErr } = await db.from('course_legos')
    .select('presentation_audio_id').eq('course_code', courseCode).eq('lego_id', legoId).maybeSingle()
  if (legoErr) throw legoErr
  if (lego && lego.presentation_audio_id) {
    const { data, error } = await db.from('course_audio').select(COLS).eq('id', lego.presentation_audio_id).maybeSingle()
    if (error) throw error
    if (data) return data
  }
  // Unlinked LEGO: fall back to a stored presentation row for it, newest first, never more than one.
  const { data, error } = await db.from('course_audio').select(COLS)
    .eq('course_code', courseCode).eq('role', 'presentation').eq('lego_id', legoId)
    .order('created_at', { ascending: false }).limit(1)
  if (error) throw error
  return (data && data[0]) || null
}

module.exports = { loadPresentationClip }
