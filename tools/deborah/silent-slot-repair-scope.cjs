#!/usr/bin/env node
/**
 * silent-slot-repair-scope.cjs — scope the 1,034-slot repair so the approval has
 * real numbers. Tom's ruling 2026-08-17: "do not start it; scope it: produce the
 * per-course relinkable-vs-render split."
 *
 * A slot is a content row whose audio pointer is NULL (course_legos or
 * course_practice_phrases, columns known/target1/target2). They went NULL because
 * a text edit fired the voice-blind re-resolve and no clip existed for the new
 * text — see docs/deborah/programme-report-2026-08-17.md.
 *
 * THE SPLIT, and why it is drawn exactly here:
 *
 *   RELINKABLE (free, no TTS, reversible): a course_audio row exists with the SAME
 *     text_normalized, the SAME role, a live s3_key, AND the *exact* voice_id this
 *     course has configured for that role — region and all. Relinking one of these
 *     restores the slot at zero cost and no audible change.
 *
 *   VOICE-MISMATCH (NOT counted as relinkable): a clip exists for the text and role
 *     in the right language, but on a DIFFERENT voice. Linking it would silently
 *     change which voice a learner hears. That is a voice swap, needs approval, and
 *     is reported separately — never folded into the free number. The estate has
 *     already been burned by treating region-dropped matches as reuse (a French
 *     reuse figure read 100% when it was really 0%), so the exact-voice test is
 *     deliberately strict.
 *
 *   NEEDS RENDER: no clip for that text and role anywhere, on any voice.
 *
 * Read-only. Writes nothing, generates nothing, costs nothing.
 *
 * Usage: node tools/deborah/silent-slot-repair-scope.cjs [--json out.json] [course…]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env'), quiet: true })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

const PAGE = 1000
const ROLES = [
  { role: 'known', col: 'known_audio_id', textCol: 'known_text' },
  { role: 'target1', col: 'target1_audio_id', textCol: 'target_text' },
  { role: 'target2', col: 'target2_audio_id', textCol: 'target_text' },
]

/** Mirror of the DB's normalize_text(): rtrim(lower(btrim(t)), '.?!¿¡。？！') */
function norm (t) {
  if (typeof t !== 'string') return ''
  return t.trim().toLowerCase().replace(/[.?!¿¡。？！]+$/u, '')
}

/**
 * Mirror of canonicalClipVoiceId's shape: clips store `<provider>_<voiceName>`
 * while voice_config holds them split. Compare on the joined form.
 */
function configuredVoiceId (voices, role) {
  const v = voices?.[role]
  if (!v) return null
  const raw = typeof v === 'string' ? v : v.voiceId
  if (!raw) return null
  const provider = (typeof v === 'object' && v.provider) || 'azure'
  return raw.includes('_') ? raw : `${provider}_${raw}`
}

async function pageAll (buildQuery, label) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await buildQuery().range(from, from + PAGE - 1)
    if (error) throw new Error(`${label}: ${error.message}`)
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return rows
}

async function scopeCourse (courseCode) {
  const { data: course, error: cErr } = await db.from('courses')
    .select('course_code, voice_config, target_lang, known_lang, new_app_status')
    .eq('course_code', courseCode).single()
  if (cErr) throw new Error(`course ${courseCode}: ${cErr.message}`)
  const voices = course.voice_config?.voices || course.voice_config || {}

  // Filter to NULL-carrying rows SERVER-side. Paging every row of a 16k-phrase
  // course with an ORDER BY hits the statement timeout (measured on spa/spa_mx/
  // zho/ita/fra_ca), and a timeout that got swallowed would read as "0 silent
  // slots" — a false all-clear. This asks only for the rows in question.
  const ANY_NULL = 'known_audio_id.is.null,target1_audio_id.is.null,target2_audio_id.is.null'
  const legos = await pageAll(() => db.from('course_legos')
    .select('lego_id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id')
    .eq('course_code', courseCode).or(ANY_NULL).order('lego_id'), `legos ${courseCode}`)
  const phrases = await pageAll(() => db.from('course_practice_phrases')
    .select('id, known_text, target_text, phrase_role, known_audio_id, target1_audio_id, target2_audio_id')
    .eq('course_code', courseCode).or(ANY_NULL).order('id'), `phrases ${courseCode}`)

  // Collect every silent slot, with the text and role it needs.
  const slots = []
  for (const [table, rows, idKey] of [['course_legos', legos, 'lego_id'], ['course_practice_phrases', phrases, 'id']]) {
    for (const r of rows) {
      for (const { role, col, textCol } of ROLES) {
        if (r[col]) continue
        const text = r[textCol]
        if (!text || !String(text).trim()) continue   // no text to voice: a different defect
        slots.push({ table, id: r[idKey], role, text, norm: norm(text) })
      }
    }
  }
  if (slots.length === 0) {
    return { course_code: courseCode, status: course.new_app_status, silent_slots: 0,
             relinkable: 0, voice_mismatch: 0, needs_render: 0, distinct_texts_to_render: 0, detail: [] }
  }

  // One batched lookup per role over the distinct normalised texts.
  const candidates = new Map()   // `${norm}|${role}` -> [clip…]
  for (const { role } of ROLES) {
    const wanted = [...new Set(slots.filter(s => s.role === role).map(s => s.norm))]
    // Batch size is bounded by URL LENGTH, not row count: PostgREST sends `in.(…)`
    // in the query string, and 100 CJK phrases overflow it — zho_for_eng failed
    // reproducibly with a bare `TypeError: fetch failed`, which is what an
    // over-long URL looks like from the client. Size the batch by encoded bytes.
    const batches = []
    let cur = [], curBytes = 0
    for (const w of wanted) {
      const b = encodeURIComponent(w).length + 3
      if (cur.length && curBytes + b > 3000) { batches.push(cur); cur = []; curBytes = 0 }
      cur.push(w); curBytes += b
    }
    if (cur.length) batches.push(cur)

    for (const batch of batches) {
      const { data, error } = await db.from('course_audio')
        .select('id, text_normalized, role, voice_id, language, origin, course_code, s3_key')
        .eq('role', role).in('text_normalized', batch)
        .not('s3_key', 'is', null).order('id')
      if (error) throw new Error(`candidates ${courseCode}/${role}: ${error.message}`)
      for (const c of data || []) {
        const k = `${c.text_normalized}|${c.role}`
        if (!candidates.has(k)) candidates.set(k, [])
        candidates.get(k).push(c)
      }
    }
  }

  let relinkable = 0, voiceMismatch = 0, needsRender = 0
  const detail = []
  const renderTexts = new Set()
  for (const s of slots) {
    const want = configuredVoiceId(voices, s.role)
    const cands = candidates.get(`${s.norm}|${s.role}`) || []
    const exact = cands.filter(c => want && c.voice_id === want)
    if (exact.length) {
      relinkable++
      // prefer same course, then human, then newest — the estate's own preference order
      const pick = exact.sort((a, b) =>
        (a.course_code === courseCode ? -1 : 1) - (b.course_code === courseCode ? -1 : 1) ||
        ((b.origin === 'human') - (a.origin === 'human')))[0]
      detail.push({ ...s, verdict: 'relinkable', clip_id: pick.id, clip_course: pick.course_code, voice_id: pick.voice_id })
    } else if (cands.length) {
      voiceMismatch++
      detail.push({ ...s, verdict: 'voice-mismatch', wanted_voice: want,
                    available_voices: [...new Set(cands.map(c => c.voice_id))] })
    } else {
      needsRender++
      renderTexts.add(`${s.norm}|${s.role}`)
      detail.push({ ...s, verdict: 'needs-render', wanted_voice: want })
    }
  }

  return {
    course_code: courseCode, status: course.new_app_status,
    silent_slots: slots.length, relinkable, voice_mismatch: voiceMismatch, needs_render: needsRender,
    distinct_texts_to_render: renderTexts.size, detail
  }
}

async function main () {
  const argv = process.argv.slice(2)
  const jsonAt = argv.indexOf('--json')
  const jsonOut = jsonAt >= 0 ? argv[jsonAt + 1] : null
  let courses = argv.filter(a => /_for_/.test(a))

  if (courses.length === 0) {
    // Every course carrying at least one silent slot, in the collateral shape:
    // silent slots a small minority of the whole, as against a never-rendered course.
    const rows = await pageAll(() => db.from('courses')
      .select('course_code').order('course_code'), 'courses')
    courses = rows.map(r => r.course_code)
  }

  const results = []
  const hdr = 'course'.padEnd(18) + 'silent'.padStart(7) + 'relink'.padStart(8) +
              'vmismatch'.padStart(11) + 'render'.padStart(8) + 'texts'.padStart(7)
  console.log(hdr); console.log('-'.repeat(hdr.length))
  for (const c of courses) {
    try {
      const r = await scopeCourse(c)
      if (r.silent_slots === 0) continue
      results.push(r)
      console.log(r.course_code.padEnd(18) + String(r.silent_slots).padStart(7) +
        String(r.relinkable).padStart(8) + String(r.voice_mismatch).padStart(11) +
        String(r.needs_render).padStart(8) + String(r.distinct_texts_to_render).padStart(7))
    } catch (e) {
      console.log(`${c.padEnd(18)} GAP: ${e.message}`)
      results.push({ course_code: c, gap: e.message })
    }
  }

  const sum = k => results.reduce((n, r) => n + (r[k] || 0), 0)
  console.log('-'.repeat(hdr.length))
  console.log('TOTAL'.padEnd(18) + String(sum('silent_slots')).padStart(7) +
    String(sum('relinkable')).padStart(8) + String(sum('voice_mismatch')).padStart(11) +
    String(sum('needs_render')).padStart(8) + String(sum('distinct_texts_to_render')).padStart(7))
  console.log('\nrelink = free, exact voice match, no TTS. vmismatch = clip exists on a')
  console.log('DIFFERENT voice — a voice swap, needs approval, NOT free. render = nothing exists.')

  if (jsonOut) {
    require('fs').writeFileSync(jsonOut, JSON.stringify(results, null, 2))
    console.log(`\nwrote ${jsonOut}`)
  }
}

if (require.main === module) main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
module.exports = { norm, configuredVoiceId, scopeCourse }
