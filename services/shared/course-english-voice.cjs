/**
 * THE VOICE A COURSE ALREADY SPEAKS ENGLISH IN (Tom, 2026-09-29 10:17Z).
 *
 * Until our cloned voices replace a course's English wholesale, a new English
 * clip in an EXISTING course matches that course's current English voice
 * not the cast's Charlotte — Charlotte is for a course that holds no English clip
 * yet. The route asks this before it asks the cast; voice and provider come out
 * together so they can never be paired wrong.
 *
 * EXCEPT Sonia (Azure en-GB): never a habit worth matching (Tom, r-2026-10-30-
 * sonia-azure-en-gb-is-never — overrides 2026-09-29). A course whose English is
 * Sonia reads as holding no usable habit, so the cast (Tom-006 / Charlotte) speaks.
 */

const ENGLISH = 'eng'
const SELECTABLE = /^(azure|cartesia)_(.+)$/
const NEVER_MATCHED = /Sonia/i
const BARE_AZURE = /^[a-z]{2,3}-[A-Z]{2}-\w+Neural$/

/** 'azure_en-GB-SoniaNeural' → { provider:'azure', voiceId:'en-GB-SoniaNeural' }; anything else → null. */
function parseCourseVoice(stored) {
  const s = String(stored || '')
  const m = SELECTABLE.exec(s)
  if (m) return { provider: m[1], voiceId: m[2] }
  if (BARE_AZURE.test(s)) return { provider: 'azure', voiceId: s }
  return null
}

/** Pure. The voice most of `rows` (recent course_audio rows: { voice_id }) are in; null when none is selectable. */
function pickCourseVoice(rows) {
  const tally = new Map()
  for (const r of rows || []) {
    const v = parseCourseVoice(r.voice_id)
    if (!v || NEVER_MATCHED.test(v.voiceId)) continue
    const key = `${v.provider}_${v.voiceId}`
    const t = tally.get(key) || { ...v, n: 0 }
    t.n++
    tally.set(key, t)
  }
  const best = [...tally.values()].sort((a, b) => b.n - a.n)[0]
  return best ? { provider: best.provider, voiceId: best.voiceId } : null
}

/**
 * The course's own English voice for a role: its recent English clips in that
 * role first, then the known/presentation English (an English prompt on a
 * non-English role speaks as the course's English does).
 */
// Remembered for a minute per (course, role) (job #806): phase8 asks this for
// every English line it renders, and the answer is the course's HABIT across
// its last 200 clips — it does not move between one line and the next. Each
// ask is up to three course_audio reads (7,370 calls, mean 242 ms, since
// 2026-09-26). A minute keeps a recast visible almost at once.
const MEMO_MS = 60_000
const memo = new Map()
function clearCourseEnglishVoiceMemo() { memo.clear() }

async function courseEnglishVoice(supabase, courseCode, role) {
  const key = `${courseCode}\u001f${role}`
  const hit = memo.get(key)
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.value
  const value = await readCourseEnglishVoice(supabase, courseCode, role)
  memo.set(key, { at: Date.now(), value })
  return value
}

async function readCourseEnglishVoice(supabase, courseCode, role) {
  for (const r of [...new Set([role, 'known', 'presentation'])]) {
    const { data, error } = await supabase.from('course_audio').select('voice_id')
      .eq('course_code', courseCode).eq('role', r).eq('language', ENGLISH)
      .order('created_at', { ascending: false }).limit(200)
    if (error) throw new Error(`course_audio unreadable (course English voice): ${error.message}`)
    const v = pickCourseVoice(data)
    if (v) return v
  }
  return null
}

module.exports = { pickCourseVoice, parseCourseVoice, courseEnglishVoice, clearCourseEnglishVoiceMemo }
