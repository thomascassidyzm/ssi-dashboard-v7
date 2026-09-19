/**
 * POD VOICES — one row per LANGUAGE, for the lane Tom picks pod voices in.
 *
 * Tom, 2026-09-19: "pods are per language and not per course … anytime a
 * language has been done once, then it never needs doing again", and "I am
 * going to choose all the voices carefully myself".
 *
 * So this is the per-LANGUAGE read behind the POD VOICES lane. It is a sibling
 * of registry.cjs — same shape of answer, same sort ruling (live courses first,
 * then course count, then the language's name, which the panel applies because
 * the name lookup lives there) — asked about the listening pod instead of the
 * course material.
 *
 * ── SPENDS NOTHING ──────────────────────────────────────────────────────────
 * Five SELECTs and a map. The clip it hands back for "what does this sound like
 * today" is a clip the estate ALREADY rendered, played straight from its
 * bucket: the honest answer to that question is free, and rendering one to fill
 * the gap on a held pod would be exactly the unauthorised pod render Tom's
 * ruling forbids. A pod with no audio says so.
 *
 * ── THE THREE STATES OF A ROW, WHICH ARE NOT THE SAME FACT ──────────────────
 *   live   the pod is serving and its clips can be heard now
 *   held   the pod exists, its text is written, and it has no audio yet — the
 *          #271 translations, deliberately unrendered
 *   none   the language has no core pod at all
 * Collapsing held into none would hide the work that has already been done;
 * collapsing it into live would claim audio that does not exist.
 *
 * Human-voiced languages (cym, bre, pdc) are their own state: HUMAN RECORDING
 * PENDING. Tom, 2026-09-19 on South Welsh: "we don't have TTS for Welsh so we
 * have to get human recordings done." A synthetic pick there is refused by
 * services/pod-voice-picks.cjs and the row must never read as an uncast gap.
 */

const picksStore = require('../pod-voice-picks.cjs')
const approvals = require('../pod-voice-approvals.cjs')
const samples = require('./samples.cjs')
const { isHumanVoiceLang } = require('../shared/human-voice-courses.cjs')

const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1'

/** How many of a pod's opening sentences are read to find a line and a clip. */
const SENTENCE_WINDOW = 60

function s3Url (key) {
  if (!key || String(key).startsWith('pending/')) return null
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`
}

async function all (db, table, select, apply = (q) => q) {
  const out = []
  const page = 1000
  for (let from = 0; ; from += page) {
    const { data, error } = await apply(db.from(table).select(select)).range(from, from + page - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data || []))
    if (!data || data.length < page) break
  }
  return out
}

/**
 * The pod pool key for a course — the SAME key tools/pod-sync.cjs casts with,
 * asked of the same function, so a pick and the cast it governs can never be
 * keyed differently. Required lazily: pod-sync runs dotenv at import and builds
 * a Supabase client on first use, and mounting a router must not do either.
 */
function podSync () { return require('../../tools/pod-sync.cjs') }

/**
 * One row per language, with the pod cast as it stands and the pick if there is
 * one. `db` is a Supabase client.
 */
async function build (db) {
  const { loadVoicePools, poolKeysForCourse } = podSync()
  const [courses, pods, pools, picks] = await Promise.all([
    all(db, 'courses', 'course_code, target_lang, known_lang, voice_pool_key, display_name, status'),
    all(db, 'listening_pods', 'id, course_code, slug, pod_type, visibility, speakers'),
    loadVoicePools(),
    picksStore.loadPicks(db),
  ])

  const courseByCode = new Map(courses.map((c) => [c.course_code, c]))
  const podsByCourse = new Map()
  for (const p of pods) {
    if (!podsByCourse.has(p.course_code)) podsByCourse.set(p.course_code, [])
    podsByCourse.get(p.course_code).push(p)
  }

  // Group courses by the TARGET pool key. A course whose pool key cannot be
  // resolved is reported as its own gap rather than silently dropped: a
  // malformed voice_pool_key is a one-column fix and must be visible.
  const byLang = new Map()
  const unkeyed = []
  for (const c of courses) {
    const mine = (podsByCourse.get(c.course_code) || []).filter((p) => p.pod_type === 'core')
    const pod = approvals.resolveCurrentPod(mine)
    if (!pod) continue
    let keys
    try { keys = poolKeysForCourse(pools, c) } catch (e) { unkeyed.push({ course: c.course_code, why: e.message }); continue }
    if (!byLang.has(keys.target)) byLang.set(keys.target, { language: keys.target, entries: [] })
    byLang.get(keys.target).entries.push({ course: c, pod, knownKey: keys.known })
  }

  const rows = []
  for (const group of byLang.values()) rows.push(await describeLanguage(db, group, picks))

  rows.sort((a, b) =>
    (a.liveCourses > 0 ? 0 : 1) - (b.liveCourses > 0 ? 0 : 1) ||
    b.courses - a.courses ||
    a.language.localeCompare(b.language))

  return {
    languages: rows,
    unkeyed,
    summary: {
      languages: rows.length,
      picked: rows.filter((r) => r.slots.length && r.slots.every((s) => s.pick)).length,
      unpicked: rows.filter((r) => !r.human && r.slots.some((s) => !s.pick)).length,
      human: rows.filter((r) => r.human).length,
      held: rows.filter((r) => r.state === 'held').length,
    },
  }
}

/**
 * THE POD THE ROW SPEAKS FOR. A language's pod is one story told once, so one
 * course's pod stands for the language: prefer a LIVE one (its clips are what
 * "what does this sound like today" actually means), then the biggest held one.
 */
function representativePod (entries) {
  const live = entries.filter((e) => e.pod.visibility === 'live')
  return (live[0] || entries[0])
}

async function describeLanguage (db, group, picks) {
  const { language, entries } = group
  const rep = representativePod(entries)
  const human = isHumanVoiceLang(language)
  const state = entries.some((e) => e.pod.visibility === 'live') ? 'live'
    : entries.length ? 'held' : 'none'

  // The cast, read off the pod itself rather than off the pools: what a learner
  // hears is the stored casting, and the pools are only where a NEW cast comes
  // from.
  const speakers = []
  const byGender = new Map()
  for (const [name, entry] of Object.entries(rep.pod.speakers || {})) {
    if (!entry || typeof entry !== 'object') continue
    if (name === '_default') continue
    const gender = picksStore.pickGenderOf(entry)
    const voice = entry.target && entry.target.voice_id ? entry.target : (entry.voice_id ? entry : null)
    speakers.push({ name, gender, voice: voice ? { ...voice } : null })
    if (!voice) continue
    const key = picksStore.voiceKey(voice)
    if (!byGender.has(gender)) byGender.set(gender, new Map())
    const m = byGender.get(gender)
    if (!m.has(key)) m.set(key, { voice: { ...voice }, speakers: [] })
    m.get(key).speakers.push(name)
  }
  speakers.sort((a, b) => a.gender.localeCompare(b.gender) || a.name.localeCompare(b.name))

  const { line, clipsByVoice } = await podLineAndClips(db, rep.pod.id)

  const slots = ['f', 'm']
    .filter((g) => byGender.has(g))
    .map((gender) => {
      const cast = [...byGender.get(gender).values()].map((c) => ({
        ...c,
        // FREE, OR NOTHING. A rendered clip of this voice on a real pod line is
        // the honest answer to "what does it sound like today"; a held pod has
        // none and says so rather than being filled in by a render.
        clip: clipsByVoice.get(picksStore.voiceKey(c.voice)) || null,
      }))
      const pick = picksStore.pickFor(picks, language, gender)
      return {
        gender,
        cast,
        pick,
        // The pick has drifted off the cast — the pod would render a voice Tom
        // did not pick. The generate gate refuses this too; the row says it.
        drifted: Boolean(pick && cast.length && !cast.some((c) => picksStore.voiceKey(c.voice) === picksStore.voiceKey(pick))),
      }
    })

  const liveCourses = entries.filter((e) => e.course.status === 'released' || e.course.status === 'live').length

  return {
    language,
    baseLanguage: String(language).split('_')[0],
    label: dialectLabel(entries.map((e) => e.course)),
    state,
    human,
    courses: entries.length,
    liveCourses,
    courseCodes: entries.map((e) => e.course.course_code).sort(),
    knownLanguages: [...new Set(entries.map((e) => e.knownKey))].sort(),
    pod: { id: rep.pod.id, slug: rep.pod.slug, visibility: rep.pod.visibility },
    speakers,
    slots,
    // The line every candidate is auditioned on, so the comparison is fair —
    // the same rule services/voicelab/samples.cjs already holds for course lines.
    line,
  }
}

/** "Austrian German for English Speakers" → "Austrian German". Same rule as registry.cjs. */
function dialectLabel (courses) {
  const counts = new Map()
  for (const c of courses || []) {
    const cut = String(c.display_name || '').split(/\s+for\s+/i)[0].trim()
    if (cut) counts.set(cut, (counts.get(cut) || 0) + 1)
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  return best ? best[0] : null
}

/**
 * The audition line for a language, and a free clip per cast voice.
 *
 * THE LINE comes from the OPENING of the canonical story (Tom, 2026-09-19: "all
 * 231 sentences are the same for all PODS"), chosen by the same middling-length,
 * plainly-punctuated rule samples.cjs uses for course lines — so it is
 * deterministic, and every candidate for a language is judged on identical
 * words.
 *
 * THE CLIPS are whatever the pod already has rendered, matched by the voice that
 * actually spoke them. Nothing here renders.
 */
async function podLineAndClips (db, podId) {
  const { data: rows, error } = await db
    .from('listening_pod_sentences')
    .select('global_order, scene_number, speaker, target_text, known_text, target_audio_id')
    .eq('pod_id', podId)
    .order('global_order', { ascending: true })
    .limit(SENTENCE_WINDOW)
  if (error) throw new Error(`pod sentences ${podId}: ${error.message}`)
  const sentences = rows || []

  const openingScene = sentences.length ? sentences[0].scene_number : null
  const opening = sentences.filter((s) => s.scene_number === openingScene)
  const chosen = samples.chooseFrom((opening.length ? opening : sentences).map((s) => ({
    text: String(s.target_text || '').trim(),
    knownText: String(s.known_text || '').trim(),
    order: s.global_order,
    speaker: s.speaker,
  })))

  const ids = [...new Set(sentences.map((s) => s.target_audio_id).filter(Boolean))]
  const clipsByVoice = new Map()
  if (ids.length) {
    const { data: audio } = await db
      .from('course_audio').select('id, voice_id, s3_key, duration_ms, text').in('id', ids.slice(0, 200))
    for (const a of audio || []) {
      const url = s3Url(a.s3_key)
      if (!url || !a.voice_id) continue
      // The estate spells a voice '<provider>_<id>' in course_audio and bare in
      // the cast, so both spellings are indexed and the caller can match either.
      const bare = String(a.voice_id).includes('_') ? String(a.voice_id).split('_').slice(1).join('_') : String(a.voice_id)
      for (const key of new Set([`xai:${bare}`, `azure:${bare}`, `cartesia:${bare}`, `elevenlabs:${bare}`])) {
        if (!clipsByVoice.has(key)) clipsByVoice.set(key, { url, durationMs: a.duration_ms || null, text: a.text || null, free: true })
      }
    }
  }

  return {
    line: chosen
      ? { text: chosen.text, knownText: chosen.knownText, speaker: chosen.speaker, pod: podId, source: `${podId} sentence ${chosen.order}`, kind: 'pod' }
      : null,
    clipsByVoice,
  }
}

// ── HELD BETWEEN LOADS ──────────────────────────────────────────────────────
// The build is ~5 SELECTs plus one small read per language, and the lane asks
// for it again every time a pick lands. Same hold registry.cjs keeps, same
// escape: ?refresh=1, and a write invalidates it so a pick is never stale on
// the screen that made it.
const CACHE_TTL_MS = 60 * 1000
let cache = null

async function cachedBuild (db, { refresh = false } = {}) {
  if (!refresh && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value
  const value = await build(db)
  cache = { at: Date.now(), value }
  return value
}

function invalidate () { cache = null }

/**
 * The audition line for one language — the SAME line the row shows, so a
 * candidate is always judged on the words the row named. Null when the language
 * has no pod.
 */
async function lineFor (db, language) {
  const { languages } = await cachedBuild(db)
  const row = languages.find((l) => l.language === language)
  return row ? row.line : null
}

module.exports = {
  build, cachedBuild, invalidate, lineFor,
  describeLanguage, podLineAndClips, representativePod, dialectLabel,
  SENTENCE_WINDOW, CACHE_TTL_MS,
}
