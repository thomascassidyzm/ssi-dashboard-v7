#!/usr/bin/env node
/**
 * AUDIO STATE OF THE ESTATE — what we hold, what is genuinely missing, what
 * it would cost. Read-only. Never renders, never writes the database.
 *
 * Tom 2026-09-26 (r-2026-09-26-no-new-tts-spend-cartesia-overage): no new TTS
 * spend until we have a complete picture of the audio we hold. This is that
 * picture, answered the way the one TTS door answers (tools/tts-door-dry-run.cjs,
 * one course at a time) but for every course at once, against ONE local copy
 * of public.clip_index instead of per-slot course_audio lookups.
 *
 *   node tools/audio-estate-coverage.cjs [--out <file.json>] [--refresh-index]
 *
 * The three verdicts per line, in the course's CAST voice for that role:
 *   held_cast   — clip_index has (language, words, cast voice);
 *   held_other  — clip_index has the words in this language, only in another
 *                 voice (a re-voice question, never a missing line);
 *   missing     — no clip of these words in this language, in any voice.
 * A "line" is what the door renders: one distinct (role, voice, words) per
 * course, from seeds, LEGOs and practice phrases — known, target1, target2 —
 * with the Hindi-style gendered known split applied exactly as phase8 does.
 *
 * LANGUAGE CODE (job #394, Tom: "if it's a different target language in a
 * course, then it counts as a different language"): every line is asked in its
 * course's own language code (clipLanguageKey — spa_mx, cym_n), so a
 * Castilian clip never counts as held for Mexican
 * Spanish. The index must have been re-keyed first
 * (tools/clip-index-backfill.cjs --region-rekey), then --refresh-index.
 *
 * Load: clip_index is read once by primary-key keyset pages (never a scan
 * under one statement) and cached on disk; course content is read per course
 * by keyset pages. Every statement runs under a 15s timeout.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') })
const path = require('path')
const fs = require('fs')
const zlib = require('zlib')
const { Client } = require('pg')
const { normalizeForAudio } = require('../services/shared/text-normalize.cjs')
const { identityFromConfig } = require('../services/shared/clip-library.cjs')
const knownVoiceGender = require('../services/shared/known-voice-gender.cjs')
const { clipTextKey, clipLanguageKey } = require('../services/shared/clip-index.cjs')
const { isHumanVoiceCourse } = require('../services/shared/human-voice-courses.cjs')
const { evidencePath } = require('./lib/evidence-path.cjs')

const args = process.argv.slice(2)
const arg = (n, d = null) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const OUT = arg('--out', evidencePath('clip-index/audio-estate-coverage.json'))
const INDEX_CACHE = evidencePath('clip-index/clip-index-dump.tsv.gz')
const PAGE = 20000
const sleep = ms => new Promise(r => setTimeout(r, ms))
const log = (...a) => process.stderr.write(a.join(' ') + '\n')

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const m = fs.readFileSync(path.join(__dirname, '..', '.env.psql'), 'utf8').match(/DATABASE_URL=["']?([^"'\n]+)/)
  if (!m) throw new Error('DATABASE_URL not found in .env.psql')
  return m[1]
}

/** Provider of a canonical voice id ('cartesia_…', 'azure_…', 'human_…'). */
const providerOf = voiceId => String(voiceId || '').split('_')[0] || 'unknown'

/**
 * SAME WORDS, DIFFERENT PUNCTUATION. Not a match under the door's rule (a
 * question and a statement are different takes; "character by character"),
 * so a line found only this way stays MISSING — but it is counted apart, so a
 * reader can see how much of a gap is "why speak Spanish today" against a held
 * "why speak Spanish today?", or a pod clip stored with "…" pause marks.
 */
const looseKey = text => String(text || '').toLowerCase().replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim()

/** clip_index → Map(language\u001ftext_key → Set(voice_id)), plus per (language, voice, origin) counts. */
async function loadIndex(client) {
  if (!args.includes('--refresh-index') && fs.existsSync(INDEX_CACHE)) {
    log(`clip_index: reading cache ${INDEX_CACHE}`)
  } else {
    log('clip_index: dumping by keyset pages')
    fs.mkdirSync(path.dirname(INDEX_CACHE), { recursive: true })
    const gz = zlib.createGzip(); const ws = fs.createWriteStream(INDEX_CACHE); gz.pipe(ws)
    let k = ['', '', '']; let n = 0
    for (;;) {
      const { rows } = await client.query(
        `SELECT language, text_key, voice_id, origin FROM clip_index
          WHERE (language, text_key, voice_id) > ($1, $2, $3)
          ORDER BY language, text_key, voice_id LIMIT ${PAGE}`, k)
      for (const r of rows) gz.write(`${r.language}\t${r.voice_id}\t${r.origin}\t${r.text_key.replace(/[\t\n]/g, ' ')}\n`)
      n += rows.length
      if (rows.length < PAGE) break
      const l = rows[rows.length - 1]; k = [l.language, l.text_key, l.voice_id]
      if ((n / PAGE) % 10 === 0) log(`  ${n} entries`)
      await sleep(150)
    }
    gz.end(); await new Promise(r => ws.on('finish', r))
    log(`clip_index: ${n} entries dumped`)
  }
  const byWords = new Map(); const byLangVoice = new Map(); const loose = new Set(); let total = 0
  const lines = zlib.gunzipSync(fs.readFileSync(INDEX_CACHE)).toString('utf8').split('\n')
  for (const line of lines) {
    if (!line) continue
    const t1 = line.indexOf('\t'), t2 = line.indexOf('\t', t1 + 1), t3 = line.indexOf('\t', t2 + 1)
    const language = line.slice(0, t1), voice = line.slice(t1 + 1, t2), origin = line.slice(t2 + 1, t3), text = line.slice(t3 + 1)
    const key = `${language}\u001f${text}`
    let s = byWords.get(key); if (!s) byWords.set(key, s = new Set()); s.add(voice)
    loose.add(`${language}\u001f${looseKey(text)}`)
    const lv = `${language}|${voice}|${origin}`
    byLangVoice.set(lv, (byLangVoice.get(lv) || 0) + 1)
    total++
  }
  return { byWords, byLangVoice, loose, total }
}

async function pagedByCourse(client, table, cols, courseCode, orderCol) {
  const out = []; let after = null
  for (;;) {
    const { rows } = await client.query(
      `SELECT ${orderCol} AS _k, ${cols} FROM ${table} WHERE course_code = $1 ${after == null ? '' : `AND ${orderCol} > $2`}
        ORDER BY ${orderCol} LIMIT ${PAGE}`, after == null ? [courseCode] : [courseCode, after])
    out.push(...rows)
    if (rows.length < PAGE) return out
    after = rows[rows.length - 1]._k
  }
}

function voiceFor(entry) {
  if (!entry) return null
  if (typeof entry === 'string') return { provider: null, voiceId: entry }
  const id = entry.voiceId || entry.voice_id
  return id ? { provider: entry.provider || null, voiceId: id } : null
}

async function analyseCourse(client, course, index) {
  const voiceConfigService = require('../services/voice-config-service.cjs')
  const resolved = await voiceConfigService.resolveVoiceConfig({ voiceConfig: course.voice_config, course, courseCode: course.course_code })
  const voices = (resolved && (resolved.voices || resolved)) || {}
  const [seeds, legos, phrases] = [
    await pagedByCourse(client, 'course_seeds', 'known_text, target_text', course.course_code, 'seed_number'),
    await pagedByCourse(client, 'course_legos', 'lego_id, known_text, target_text', course.course_code, 'lego_id'),
    await pagedByCourse(client, 'course_practice_phrases', 'known_text, target_text', course.course_code, 'id'),
  ]
  let genderCtx = null
  if (knownVoiceGender.roleHasGenderedVoices(voices, 'known')) {
    const { rows: pairs } = await client.query(
      `SELECT expanded_m, expanded_f FROM course_gender_expansions WHERE course_code = $1 AND text_side = 'known'`, [course.course_code])
    genderCtx = { ...knownVoiceGender.buildKnownGenderContext({ courseCode: course.course_code, voices, pairs, legos, seeds }), voices }
  }
  const slots = new Map(); const unvoiced = {}
  const add = (role, text) => {
    if (!text || !String(text).trim()) return
    const gendered = role === 'known' && genderCtx ? knownVoiceGender.knownVoiceEntryForClip(genderCtx, { role, text }) : null
    const v = voiceFor((gendered && gendered.voice) || voices[role])
    const language = role === 'known' ? course.known_lang : course.target_lang
    if (!v) { unvoiced[role] = (unvoiced[role] || 0) + 1; return }
    const provider = v.provider || (/^[a-z]{2,3}-[A-Za-z]{2,4}-\w+Neural$/.test(v.voiceId) ? 'azure' : 'cartesia')
    const id = identityFromConfig(provider, { voiceId: v.voiceId, voiceName: v.voiceId, door: { language } })
    const key = `${role}|${id.voiceId}|${normalizeForAudio(text)}`
    if (!slots.has(key)) slots.set(key, { role, text, language: clipLanguageKey(id.language, course), voiceId: id.voiceId })
  }
  for (const row of [...seeds, ...legos, ...phrases]) {
    add('known', row.known_text)
    add('target1', row.target_text)
    if (voices.target2) add('target2', row.target_text)
  }
  const byRole = {}
  const missingSample = []
  for (const s of slots.values()) {
    const r = (byRole[`${s.role}|${s.voiceId}`] ||= { role: s.role, voice: s.voiceId, provider: providerOf(s.voiceId), lines: 0, held_cast: 0, held_other: 0, missing: 0, chars_missing: 0, missing_near: 0, chars_missing_near: 0, chars_other: 0, chars_all: 0 })
    const chars = [...String(s.text)].length
    r.lines++; r.chars_all += chars
    const have = s.language ? index.byWords.get(`${s.language}\u001f${clipTextKey(s.text)}`) : null
    if (have && have.has(s.voiceId)) r.held_cast++
    else if (have && have.size) { r.held_other++; r.chars_other += chars }
    else {
      r.missing++; r.chars_missing += chars
      if (s.language && index.loose.has(`${s.language}\u001f${looseKey(s.text)}`)) { r.missing_near++; r.chars_missing_near += chars }
      if (missingSample.length < 8) missingSample.push(`${s.role}: ${s.text.slice(0, 60)}`) }
  }
  return {
    course_code: course.course_code, known_lang: course.known_lang, target_lang: course.target_lang,
    status: course.new_app_status, cast: Object.fromEntries(Object.entries(voices).filter(([, v]) => voiceFor(v)).map(([k, v]) => [k, voiceFor(v).voiceId])), human_voiced: isHumanVoiceCourse(course.course_code),
    content: { seeds: seeds.length, legos: legos.length, phrases: phrases.length },
    gendered_known: !!genderCtx, unvoiced_roles: unvoiced,
    roles: Object.values(byRole), missing_sample: missingSample,
  }
}

/** Pod 1: the language's 231 canonical target lines, and each serving pod's lines, against the index. */
async function analysePods(client, index, courses) {
  // A pod's target_lang is split_part(course_code, '_for_', 1) — already the code.
  const podKey = lang => lang
  const { rows: canon } = await client.query(`SELECT target_lang, target_text FROM canonical_pod_target_text WHERE pod_slug = 'pod-1'`)
  const byLang = {}
  for (const r of canon) {
    const b = (byLang[r.target_lang] ||= { lines: 0, held_any: 0, missing: 0, missing_near: 0, chars_missing: 0, voices: {} })
    b.lines++
    const have = index.byWords.get(`${podKey(r.target_lang)}\u001f${clipTextKey(r.target_text)}`)
    if (have && have.size) { b.held_any++; for (const v of have) b.voices[v] = (b.voices[v] || 0) + 1 }
    else {
      b.missing++; b.chars_missing += [...String(r.target_text || '')].length
      if (index.loose.has(`${podKey(r.target_lang)}\u001f${looseKey(r.target_text)}`)) b.missing_near++
    }
  }
  const { rows: serving } = await client.query(`SELECT course_code, pod_id FROM serving_pod WHERE slug = 'pod-1'`)
  const langOf = Object.fromEntries(courses.map(c => [c.course_code, c]))
  const perCourse = []
  for (const { course_code, pod_id } of serving) {
    const c = langOf[course_code]; if (!c) continue
    const { rows } = await client.query(
      `SELECT s.known_text, s.target_text,
              (s.known_audio_id IS NOT NULL AND ka.id IS NOT NULL) AS known_linked,
              (s.target_audio_id IS NOT NULL AND ta.id IS NOT NULL) AS target_linked
         FROM listening_pod_sentences s
         LEFT JOIN course_audio ka ON ka.id = s.known_audio_id
         LEFT JOIN course_audio ta ON ta.id = s.target_audio_id
        WHERE s.pod_id = $1`, [pod_id])
    const side = (text, linked, lang) => {
      if (!text || !String(text).trim()) return 'empty'
      if (linked) return 'linked'
      const have = index.byWords.get(`${clipLanguageKey(lang, c)}\u001f${clipTextKey(text)}`)
      return have && have.size ? 'held_unlinked' : 'missing'
    }
    const t = { course_code, pod_id, status: c.new_app_status, lines: rows.length, known: {}, target: {}, chars_missing_known: 0, chars_missing_target: 0 }
    for (const r of rows) {
      const k = side(r.known_text, r.known_linked, c.known_lang); t.known[k] = (t.known[k] || 0) + 1
      if (k === 'missing') t.chars_missing_known += [...r.known_text].length
      const g = side(r.target_text, r.target_linked, c.target_lang); t.target[g] = (t.target[g] || 0) + 1
      if (g === 'missing') t.chars_missing_target += [...r.target_text].length
    }
    perCourse.push(t)
  }
  return { byLang, perCourse }
}

async function main() {
  const client = new Client({ connectionString: databaseUrl(), statement_timeout: 15000, application_name: 'audio-estate-coverage' })
  await client.connect()
  await client.query("SET statement_timeout = '15s'")
  await client.query('SET default_transaction_read_only = on')
  try {
    const index = await loadIndex(client)
    log(`clip_index: ${index.total} entries, ${index.byWords.size} distinct (language, words)`)
    const { rows: [ca] } = await client.query(`SELECT reltuples::bigint AS n FROM pg_class WHERE relname = 'course_audio'`)
    const { rows: courses } = await client.query(
      `SELECT course_code, known_lang, target_lang, voice_config, new_app_status, status FROM courses ORDER BY course_code`)
    const perCourse = []
    for (const c of courses) {
      try { perCourse.push(await analyseCourse(client, c, index)); log(`  ${c.course_code}`) } catch (e) { perCourse.push({ course_code: c.course_code, error: e.message }); log(`  ${c.course_code} ERROR ${e.message}`) }
      await sleep(100)
    }
    const pods = await analysePods(client, index, courses)
    const byLangVoice = [...index.byLangVoice].map(([k, n]) => { const [language, voice, origin] = k.split('|'); return { language, voice, provider: providerOf(voice), origin, clips: n } })
    const out = { generated_at: new Date().toISOString(), clip_index_entries: index.total, course_audio_estimate: Number(ca.n), by_lang_voice: byLangVoice, courses: perCourse, pods }
    fs.mkdirSync(path.dirname(OUT), { recursive: true })
    fs.writeFileSync(OUT, JSON.stringify(out))
    log(`wrote ${OUT}`)
  } finally { await client.end() }
}

main().catch(e => { console.error(e); process.exit(1) })
