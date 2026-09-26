#!/usr/bin/env node
/**
 * TTS DOOR DRY RUN — how much of a course the one TTS door would answer from
 * clips that already exist, and how many characters it would pay for.
 *
 * Read-only. Never renders, never writes. For every line of the course (seeds,
 * LEGOs, practice phrases — known, target1, target2) it names the clip the way
 * the door does (language, words — any voice; the voice only prefers) and asks the same pure rule
 * the door asks (services/shared/clip-library.cjs pickExistingClip), against
 * every course's clips.
 *
 * Two figures, because they answer two of Tom's rulings:
 *   resolved            — the door would pay for nothing but the misses
 *                         (recordings are per language; courses point by id);
 *   resolved_if_new     — the same question with this course's OWN clips
 *                         hidden: what a brand-new course with these lines would
 *                         need rendered (the ~1% course-specific lines).
 *
 * Load: one paged read per content table, then batched text_normalized lookups
 * (size-capped key lists per query, sequential) — never a full course_audio scan.
 *
 * Clip index (job #391): for every slot it also asks the question the live door
 * now asks — public.clip_index for (language, words), plus this course's own
 * rows, falling back to course_audio only when that cannot answer in the
 * preferred voice (services/shared/clip-index.cjs resolveClip, batched here) —
 * and reports where each answer came from: the index in the same voice, the
 * index in another voice, the fallback only (an index gap), or nothing (a real
 * render). This file never requires tts-service, so it cannot reach a provider.
 *
 *   node tools/tts-door-dry-run.cjs eng_for_hin [--json]
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')
const { audioKeyCandidates, normalizeForAudio } = require('../services/shared/text-normalize.cjs')
const { identityFromConfig, pickExistingClip } = require('../services/shared/clip-library.cjs')
const knownVoiceGender = require('../services/shared/known-voice-gender.cjs')
const { clipTextKey } = require('../services/shared/clip-index.cjs')
const { tryCanonicalVoiceId } = require('../services/shared/clip-identity.cjs')
const sleep = ms => new Promise(r => setTimeout(r, ms))

// Batches are cut by URL-ENCODED size, not count: an .in() list rides in the
// query string, and Devanagari/Han text encodes ~9x — 150 texts answered 400
// and 40 long seeds still broke the socket. MAX_KEY_CHARS keeps each request
// well inside PostgREST's URL limit.
const MAX_KEY_CHARS = 5000
function chunksBySize(items, size = s => encodeURIComponent(s).length) {
  const out = []
  let cur = [], n = 0
  for (const it of items) {
    const k = size(it) + 3
    if (cur.length && n + k > MAX_KEY_CHARS) { out.push(cur); cur = []; n = 0 }
    cur.push(it); n += k
  }
  if (cur.length) out.push(cur)
  return out
}
const COLUMNS = 'id, course_code, text, text_normalized, language, voice_id, role, s3_key, origin, veracity_pass'

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

let stage = 'start'
const mark = st => { stage = st; process.stderr.write(`[dry-run] ${new Date().toISOString()} ${st}\n`) }
async function pagedAll(build) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999)
    if (error) throw new Error(`${stage} (offset ${from}): ${error.message}`)
    out.push(...(data || []))
    if (!data || data.length < 1000) return out
  }
}

/** The course's voices per role, resolved exactly as phase8 resolves them. */
async function courseVoices(courseCode) {
  const voiceConfigService = require('../services/voice-config-service.cjs')
  const { data: course, error } = await db.from('courses').select('*').eq('course_code', courseCode).single()
  if (error) throw new Error(`courses: ${error.message}`)
  const resolved = await voiceConfigService.resolveVoiceConfig({ voiceConfig: course.voice_config, course, courseCode })
  const voices = (resolved && (resolved.voices || resolved)) || {}
  return { course, voices }
}

function voiceFor(entry) {
  if (!entry) return null
  if (typeof entry === 'string') return { provider: null, voiceId: entry }
  const id = entry.voiceId || entry.voice_id
  return id ? { provider: entry.provider || null, voiceId: id } : null
}

async function main() {
  const courseCode = process.argv[2]
  const asJson = process.argv.includes('--json')
  if (!courseCode) { console.error('usage: node tools/tts-door-dry-run.cjs <course_code> [--json]'); process.exit(2) }

  mark('voices')
  const { course, voices } = await courseVoices(courseCode)
  mark('content tables')
  // Each read is ordered along a (course_code, …) index: ordering
  // practice phrases by id walked the whole table's pkey filtering by course and
  // hit the 15s statement timeout on the live DB (2026-09-26, job #391).
  const [seeds, legos, phrases] = await Promise.all([
    pagedAll(() => db.from('course_seeds').select('known_text, target_text').eq('course_code', courseCode).order('seed_number')),
    pagedAll(() => db.from('course_legos').select('lego_id, known_text, target_text').eq('course_code', courseCode).order('lego_id')),
    pagedAll(() => db.from('course_practice_phrases').select('id, known_text, target_text').eq('course_code', courseCode).order('seed_number').order('lego_index').order('position')),
  ])

  // Gendered known voices (Hindi known = Kriti + Rehan, one per line): the same
  // context phase8 builds, so each known line is asked for in ITS voice.
  let genderCtx = null
  if (knownVoiceGender.roleHasGenderedVoices(voices, 'known')) {
    const pairs = await pagedAll(() => db.from('course_gender_expansions').select('expanded_m, expanded_f').eq('course_code', courseCode).eq('text_side', 'known').order('expanded_m'))
    genderCtx = { ...knownVoiceGender.buildKnownGenderContext({ courseCode, voices, pairs, legos, seeds }), voices }
  }

  const slots = new Map()
  const add = (role, text) => {
    if (!text || !String(text).trim()) return
    const gendered = role === 'known' && genderCtx ? knownVoiceGender.knownVoiceEntryForClip(genderCtx, { role, text }) : null
    const v = voiceFor((gendered && gendered.voice) || voices[role])
    if (!v) return
    const language = role === 'known' ? course.known_lang : course.target_lang
    const provider = v.provider || (/^[a-z]{2,3}-[A-Za-z]{2,4}-\w+Neural$/.test(v.voiceId) ? 'azure' : 'cartesia')
    const id = identityFromConfig(provider, { voiceId: v.voiceId, voiceName: v.voiceId, door: { language } })
    const key = `${role}|${id.voiceId}|${normalizeForAudio(text)}`
    if (!slots.has(key)) slots.set(key, { role, text, language: id.language, voiceId: id.voiceId })
  }
  for (const row of [...seeds, ...legos, ...phrases]) {
    add('known', row.known_text)
    add('target1', row.target_text)
    if (voices.target2) add('target2', row.target_text)
  }

  mark(`course_audio lookups for ${slots.size} slots`)
  // Batched lookups by text across every course.
  const texts = [...new Set([...slots.values()].map(s => s.text))]
  const byText = new Map()
  const textChunks = chunksBySize(texts, t => audioKeyCandidates(t).reduce((n, k) => n + encodeURIComponent(k).length + 3, 0))
  for (let i = 0; i < textChunks.length; i++) {
    const chunk = textChunks[i]
    const keys = [...new Set(chunk.flatMap(t => audioKeyCandidates(t)))]
    const rows = await pagedAll(() => db.from('course_audio').select(COLUMNS).in('text_normalized', keys).not('s3_key', 'like', 'pending/%').order('id'))
    for (const r of rows) {
      const k = normalizeForAudio(r.text || '')
      if (!byText.has(k)) byText.set(k, [])
      byText.get(k).push(r)
    }
    if (i % 100 === 0) process.stderr.write(`  course_audio batch ${i + 1}/${textChunks.length}\n`)
    await sleep(50)
  }

  mark('clip_index lookups')
  // The clip index, batched by language: (language, text_key) -> the canonical
  // row of every voice holding those words.
  const idxRows = new Map()
  const byLang = new Map()
  for (const sl of slots.values()) {
    if (!sl.language) continue
    if (!byLang.has(sl.language)) byLang.set(sl.language, new Set())
    byLang.get(sl.language).add(clipTextKey(sl.text))
  }
  for (const [language, keySet] of byLang) {
    const keys = [...keySet]
    for (const chunk of chunksBySize(keys)) {
      const rows = await pagedAll(() => db.from('clip_index').select(`text_key, voice_id, course_audio!inner(${COLUMNS})`).eq('language', language).in('text_key', chunk).order('text_key').order('voice_id'))
      for (const r of rows) {
        const k = `${language}|${r.text_key}`
        if (!idxRows.has(k)) idxRows.set(k, [])
        idxRows.get(k).push(r.course_audio)
      }
      await sleep(50)
    }
  }

  const tally = { slots: 0, resolved: 0, charsWouldSpend: 0, resolvedIfNew: 0, charsIfNew: 0, byRole: {} }
  const via = { index_same_voice: 0, index_other_voice: 0, own_course_row: 0, fallback_only_same_voice: 0, fallback_only_other_voice: 0, genuinely_new: 0, chars_would_spend: 0 }
  const misses = []
  for (const s of slots.values()) {
    const rows = byText.get(normalizeForAudio(s.text)) || []
    const want = { text: s.text, language: s.language, voiceId: s.voiceId, courseCode, ownCourseOnly: s.role === 'presentation' }
    const hit = s.language && s.voiceId ? pickExistingClip(rows, want) : null
    const hitElsewhere = s.language && s.voiceId ? pickExistingClip(rows.filter(r => r.course_code !== courseCode), want) : null
    const r = (tally.byRole[s.role] ||= { slots: 0, resolved: 0, resolvedIfNew: 0 })
    tally.slots++; r.slots++
    if (hit) { tally.resolved++; r.resolved++ } else { tally.charsWouldSpend += s.text.length; if (misses.length < 25) misses.push(`${s.role} ${s.voiceId}: ${s.text.slice(0, 60)}`) }
    if (hitElsewhere) { tally.resolvedIfNew++; r.resolvedIfNew++ } else tally.charsIfNew += s.text.length

    // The live door's question, via the index (resolveClip, batched).
    const sameVoice = row => tryCanonicalVoiceId(row.voice_id) === s.voiceId
    const own = rows.filter(x => x.course_code === courseCode)
    const indexed = idxRows.get(`${s.language}|${clipTextKey(s.text)}`) || []
    const first = s.language && s.voiceId && !want.ownCourseOnly ? pickExistingClip([...own, ...indexed], want) : null
    if (first && sameVoice(first)) {
      if (first.course_code === courseCode && !indexed.some(x => x.id === first.id)) via.own_course_row++
      else via.index_same_voice++
    } else {
      const fb = hit
      if (!fb) { via.genuinely_new++; via.chars_would_spend += s.text.length }
      else if (first && !sameVoice(fb)) via.index_other_voice++
      else if (sameVoice(fb)) via.fallback_only_same_voice++
      else via.fallback_only_other_voice++
    }
  }
  const pct = (a, b) => b ? +(100 * a / b).toFixed(2) : 0
  const report = {
    course: courseCode,
    voices: Object.fromEntries(Object.entries(voices).filter(([, v]) => v && (v.voiceId || typeof v === 'string')).map(([k, v]) => [k, v.voiceId || v])),
    gendered_known: !!genderCtx,
    slots: tally.slots,
    resolved: tally.resolved,
    resolved_pct: pct(tally.resolved, tally.slots),
    chars_would_spend: tally.charsWouldSpend,
    resolved_if_new: tally.resolvedIfNew,
    resolved_if_new_pct: pct(tally.resolvedIfNew, tally.slots),
    chars_if_new: tally.charsIfNew,
    by_role: tally.byRole,
    via_clip_index: via,
    chars_spent_by_this_run: 0,
    sample_misses: misses,
  }
  if (asJson) console.log(JSON.stringify(report, null, 1))
  else {
    console.log(`\n${courseCode}: ${report.resolved}/${report.slots} lines resolved by the door (${report.resolved_pct}%) — ${report.chars_would_spend} chars would be rendered; this run spent 0.`)
    console.log(`as a NEW course (own clips hidden): ${report.resolved_if_new}/${report.slots} (${report.resolved_if_new_pct}%) — ${report.chars_if_new} chars of course-specific lines.`)
    console.log(`via the clip index: ${JSON.stringify(via)}`)
    for (const [role, r] of Object.entries(report.by_role)) console.log(`  ${role}: ${r.resolved}/${r.slots} resolved, ${r.resolvedIfNew} from other courses`)
    if (misses.length) console.log('sample misses:\n  ' + misses.join('\n  '))
  }
}

main().catch(e => { console.error(e.message); process.exit(1) })
