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
 * (BATCH keys per query, sequential) — never a full course_audio scan.
 *
 *   node tools/tts-door-dry-run.cjs eng_for_hin [--json]
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')
const { audioKeyCandidates, normalizeForAudio } = require('../services/shared/text-normalize.cjs')
const { identityFromConfig, pickExistingClip } = require('../services/shared/clip-library.cjs')
const knownVoiceGender = require('../services/shared/known-voice-gender.cjs')

const BATCH = 150
const COLUMNS = 'id, course_code, text, text_normalized, language, voice_id, role, s3_key, origin, veracity_pass'

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

async function pagedAll(build) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999)
    if (error) throw new Error(error.message)
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

  const { course, voices } = await courseVoices(courseCode)
  const [seeds, legos, phrases] = await Promise.all([
    pagedAll(() => db.from('course_seeds').select('known_text, target_text').eq('course_code', courseCode).order('seed_number')),
    pagedAll(() => db.from('course_legos').select('lego_id, known_text, target_text').eq('course_code', courseCode).order('lego_id')),
    pagedAll(() => db.from('course_practice_phrases').select('id, known_text, target_text').eq('course_code', courseCode).order('id')),
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

  // Batched lookups by text across every course.
  const texts = [...new Set([...slots.values()].map(s => s.text))]
  const byText = new Map()
  for (let i = 0; i < texts.length; i += BATCH) {
    const chunk = texts.slice(i, i + BATCH)
    const keys = [...new Set(chunk.flatMap(t => audioKeyCandidates(t)))]
    const rows = await pagedAll(() => db.from('course_audio').select(COLUMNS).in('text_normalized', keys).not('s3_key', 'like', 'pending/%').order('id'))
    for (const r of rows) {
      const k = normalizeForAudio(r.text || '')
      if (!byText.has(k)) byText.set(k, [])
      byText.get(k).push(r)
    }
    if (!asJson && (i / BATCH) % 20 === 0) process.stderr.write(`  looked up ${Math.min(i + BATCH, texts.length)}/${texts.length} texts\r`)
  }

  const tally = { slots: 0, resolved: 0, charsWouldSpend: 0, resolvedIfNew: 0, charsIfNew: 0, byRole: {} }
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
    chars_spent_by_this_run: 0,
    sample_misses: misses,
  }
  if (asJson) console.log(JSON.stringify(report, null, 1))
  else {
    console.log(`\n${courseCode}: ${report.resolved}/${report.slots} lines resolved by the door (${report.resolved_pct}%) — ${report.chars_would_spend} chars would be rendered; this run spent 0.`)
    console.log(`as a NEW course (own clips hidden): ${report.resolved_if_new}/${report.slots} (${report.resolved_if_new_pct}%) — ${report.chars_if_new} chars of course-specific lines.`)
    for (const [role, r] of Object.entries(report.by_role)) console.log(`  ${role}: ${r.resolved}/${r.slots} resolved, ${r.resolvedIfNew} from other courses`)
    if (misses.length) console.log('sample misses:\n  ' + misses.join('\n  '))
  }
}

main().catch(e => { console.error(e.message); process.exit(1) })
