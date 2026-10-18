#!/usr/bin/env node
/**
 * READ-ONLY per-course gap report (job #499, Watson cos #813): for each language, which Pod 1 slots
 * point at a clip outside the cast, and which seed 1-100 target lines lack a cast voice, with the
 * characters of the missing text split Pod 1 / seeds 1-100. No render, no TTS, no write.
 *
 *   node tools/voice-coverage/gap-report.cjs [--langs spa,fra,...] [--out file.json]
 *
 * DEFINITIONS (the code below is the spec):
 *  - cast voices = the course target language's Tom-cast voice_language_roles rows (isTomCastRow,
 *    same key resolver the Voice Lab and the render gate use). Seats = resolveVoice target1/target2.
 *  - Pod 1 slot = a listening_pods core pod (slug 'pod-1') sentence's target_audio_id. A slot is a
 *    gap when it is unlinked, or its clip's voice is not a cast voice. Chars = that sentence's target_text.
 *  - Seed line = a distinct target_text of seeds 1-100: seed, LEGO and non-component practice phrase.
 *    A line is missing a seat when no playable, speech-check-unfailed clip of it exists in that seat's
 *    voice (any course or role, as the coverage count). A line is a gap if either seat is missing.
 *    Chars count each distinct line once, as code points.
 * All reads are by primary key / keyset / id through agent-db.cjs under the 5 s cap.
 */
const fs = require('fs')
const db = require('../../services/shared/agent-db.cjs')
const { clipTextKey, clipLanguageKey } = require('../../services/shared/clip-index.cjs')
const { castKeyForCourse } = require('../../services/shared/cast-language-key.cjs')
const { isTomCastRow, rowIsForKey, canonVoice } = require('../../services/shared/voice-cast-gate.cjs')
const rv = require('../../services/shared/resolve-voice.cjs')
const { content } = require('./refresh.cjs')

const LANGS = ['spa', 'fra', 'deu', 'ita', 'por', 'zho', 'jpn', 'kor', 'ara', 'hin']
const FIRST_SEEDS = 100
const chars = t => [...String(t)].length
const usable = c => !!c && !!c.s3_key && !c.s3_key.startsWith('pending/') && Number(c.duration_ms || 0) > 200 && c.veracity_pass !== false

/** Pure. Pod slots: [{ text, voiceId|null }]. */
function podGap(slots, castVoices) {
  const cast = new Set(castVoices.map(canonVoice))
  const gaps = slots.filter(s => !s.voiceId || !cast.has(canonVoice(s.voiceId)))
  return { slots: slots.length, notInCast: gaps.length, unlinked: gaps.filter(s => !s.voiceId).length, chars: gaps.reduce((n, s) => n + chars(s.text), 0) }
}

/** Pure. lines: distinct texts; held: Map text_key → Set(voiceId) of usable clips; seats: [voiceId,...]. */
function seedGap(lines, held, seats) {
  const missing = new Map(seats.map(v => [v, 0]))
  let gaps = 0, gapChars = 0
  for (const text of lines) {
    const have = held.get(clipTextKey(text)) || new Set()
    const miss = seats.filter(v => !have.has(v))
    for (const v of miss) missing.set(v, missing.get(v) + 1)
    if (miss.length) { gaps++; gapChars += chars(text) }
  }
  return { lines: lines.length, missingAnySeat: gaps, perSeatMissing: Object.fromEntries(missing), chars: gapChars }
}

async function heldVoices(pg, language, texts, voiceIds) {
  const keys = [...new Set(texts.map(clipTextKey))], held = new Map(), want = new Set(voiceIds)
  for (let i = 0; i < keys.length; i += 400) {
    const { rows } = await pg.query('SELECT text_key, voice_id, audio_id FROM clip_index WHERE language = $1 AND text_key = ANY($2::text[])', [language, keys.slice(i, i + 400)])
    const mine = rows.filter(r => want.has(r.voice_id))
    const clips = await db.clipMap(pg, mine.map(r => String(r.audio_id)), { cols: 'id::text AS id, s3_key, duration_ms, veracity_pass' })
    for (const r of mine) if (usable(clips.get(String(r.audio_id)))) {
      if (!held.has(r.text_key)) held.set(r.text_key, new Set())
      held.get(r.text_key).add(r.voice_id)
    }
  }
  return held
}

async function podSlots(pg, courseCode) {
  const { rows: pods } = await pg.query(`SELECT id, slug FROM listening_pods WHERE course_code = $1 AND pod_type = 'core' ORDER BY (slug = 'pod-1') DESC, pod_order LIMIT 1`, [courseCode])
  if (!pods.length) return { pod: null, slots: [] }
  const { rows } = await pg.query('SELECT target_text, target_audio_id::text AS audio_id FROM listening_pod_sentences WHERE pod_id = $1 ORDER BY global_order', [pods[0].id])
  const clips = await db.clipMap(pg, rows.map(r => r.audio_id))
  return { pod: pods[0].slug, slots: rows.map(r => ({ text: r.target_text, voiceId: clips.get(r.audio_id)?.voice_id || null })) }
}

async function reportCourse(pg, course, cast) {
  const language = clipLanguageKey(course.target_lang, course)
  const key = castKeyForCourse(course, 'target')
  const castVoices = [...new Set(cast.roles.filter(r => rowIsForKey(r, key) && isTomCastRow(r)).map(r => canonVoice(r.voice_id)))]
  const seats = ['target1', 'target2'].map(role => rv.resolveVoice({ course, role }, cast)).filter(r => r.status === 'voice').map(r => r.voiceId)
  const [seeds, legos, phrases] = await Promise.all(['course_seeds', 'course_legos', 'course_practice_phrases'].map(t => content(pg, t, course.course_code)))
  const lines = [...new Set([
    ...seeds.filter(r => r.seed_number <= FIRST_SEEDS).map(r => r.target_text),
    ...legos.filter(r => r.seed_number <= FIRST_SEEDS).map(r => r.target_text),
    ...phrases.filter(r => r.seed_number <= FIRST_SEEDS && r.phrase_role !== 'component').map(r => r.target_text),
  ].filter(t => t && String(t).trim()))]
  const held = await heldVoices(pg, language, lines, seats)
  const pod = await podSlots(pg, course.course_code)
  return { courseCode: course.course_code, language, castKey: key, castVoices, seats,
    pod: { slug: pod.pod, ...podGap(pod.slots, castVoices) }, seeds1to100: seedGap(lines, held, seats) }
}

const table = rows => ['| course | cast | Pod 1 slots | not in cast | unlinked | Pod 1 chars | seed 1-100 lines | missing a seat | seat1 / seat2 missing | seed chars |', '|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map(r => r.error ? `| ${r.courseCode} | ERROR: ${r.error} |||||||||` : `| ${r.courseCode} | ${r.castVoices.length} | ${r.pod.slots} | ${r.pod.notInCast} | ${r.pod.unlinked} | ${r.pod.chars} | ${r.seeds1to100.lines} | ${r.seeds1to100.missingAnySeat} | ${r.seats.map(v => r.seeds1to100.perSeatMissing[v]).join(' / ')} | ${r.seeds1to100.chars} |`)].join('\n')

async function main(args) {
  const value = f => args.includes(f) ? args[args.indexOf(f) + 1] : undefined
  const langs = (value('--langs') || LANGS.join(',')).split(',')
  const pg = await db.connect({ app: 'agent:voice-gap-report' })
  try {
    await pg.query('SET default_transaction_read_only = on')
    const courses = (await pg.query('SELECT course_code, known_lang, target_lang, dialect, voice_pool_key, known_dialect, version FROM courses ORDER BY course_code')).rows
    const cast = { roles: (await pg.query('SELECT language, gender, slot, rank, voice_id, notes, assigned_by FROM voice_language_roles')).rows,
      voices: (await pg.query('SELECT voice_id, display_name, human_name, is_active, gender FROM voices')).rows }
    const out = []
    for (const lang of langs) {
      const mine = courses.filter(c => new RegExp(`^${lang}(_[a-z]+)?_for_eng$`).test(c.course_code))
      if (!mine.length) out.push({ courseCode: `${lang}_for_eng`, error: 'no such course' })
      for (const c of mine) {
        try { out.push(await reportCourse(pg, c, cast)) } catch (e) { out.push({ courseCode: c.course_code, error: e.message }) }
        console.error(`${c.course_code} done`)
      }
    }
    const md = table(out)
    if (value('--out')) fs.writeFileSync(value('--out'), JSON.stringify({ generatedAt: new Date().toISOString(), langs, rows: out }, null, 1))
    console.log(md)
  } finally { await pg.end() }
}
if (require.main === module) main(process.argv.slice(2)).catch(e => { console.error(e.message); process.exitCode = 1 })
module.exports = { podGap, seedGap, LANGS }
