/**
 * Gender Prep Detector
 *
 * Per-course Haiku check: does this course's target language vary 1st-person
 * predicate forms by speaker gender? Sets courses.needs_gender_prep based on
 * actual phrases in the course (not just a hardcoded language list).
 *
 * Usage (programmatic):
 *   const { detectNeedsGenderPrep } = require('./gender-prep-detector.cjs')
 *   const result = await detectNeedsGenderPrep('heb_for_eng')
 *
 * Usage (CLI):
 *   node services/gender-prep-detector.cjs <course_code>
 */
const { spawn } = require('child_process')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const voiceGender = require('./voice-gender-map.cjs')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// Bump when the Haiku prompt changes meaningfully. Stored in check_notes so
// future runs can identify stale determinations and selectively re-run.
const PROMPT_VERSION = 'v1'
const MODEL = 'haiku'

// Pull a sample of first-person target_text from the course.
// First-person phrases are where the answer is most likely to vary by gender.
async function sampleFirstPersonPhrases(courseCode, n = 10) {
  // Heuristic: known_text starting with "I " (English) or "我" (Chinese) or "私" (Japanese)
  // — adjust as needed. For non-English known langs, sampling target_text directly.
  const { data: course } = await supabase.from('courses').select('known_lang,target_lang,voice_config').eq('course_code', courseCode).single()
  if (!course) throw new Error(`Course not found: ${courseCode}`)
  const knownPrefix = { eng: 'I ', zho: '我', jpn: '私' }[course.known_lang] || ''
  let q = supabase.from('course_practice_phrases').select('known_text,target_text')
    .eq('course_code', courseCode)
    .not('target_text', 'is', null)
  if (knownPrefix) q = q.like('known_text', `${knownPrefix}%`)
  const { data } = await q.limit(40)
  if (!data || data.length === 0) return { course, samples: [] }
  // Pick n random
  const shuffled = data.sort(() => Math.random() - 0.5)
  return { course, samples: shuffled.slice(0, n) }
}

function buildPrompt(targetLang, samples) {
  const list = samples.map((s, i) => `${i + 1}. "${s.target_text}"  ${s.known_text ? `(EN: "${s.known_text}")` : ''}`).join('\n')
  return `You are a linguistics expert. Answer one question about ${targetLang} (ISO 639-3 code).

QUESTION: Does ${targetLang} grammatical structure vary the FIRST-PERSON SPEAKER'S form by speaker gender? In other words: would a male speaker say "I am tired" differently from how a female speaker says it?

The variation might be in:
- Predicate adjectives (e.g. Spanish "cansado" vs "cansada")
- Past-tense verbs (e.g. Polish "byłem" vs "byłam")
- Participles used as present-tense verbs (e.g. Hebrew "מדבר" vs "מדברת")
- First-person verb conjugations (e.g. Arabic in some tenses)

Or there might be NO such variation (e.g. English, Japanese, Chinese, Turkish, German for predicates, etc.).

Here are 10 actual phrases from a course teaching ${targetLang}:
${list}

Examine these. If the language genders 1st-person predicate forms, point to specific examples that would change between male/female speakers.

Output STRICT JSON only, no markdown fences, no commentary:

{"needs_gender_prep": true|false, "reasoning": "1-2 sentences", "examples": ["male: X | female: Y", "male: A | female: B"]}

If you genuinely cannot tell from the samples (e.g. no first-person phrases, or you don't know the language well), output:
{"needs_gender_prep": null, "reasoning": "explain why"}`
}

function callHaiku(prompt) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, ANTHROPIC_API_KEY: '' }
    delete env.CLAUDECODE  // avoid nested-CLI confusion
    const proc = spawn('claude', ['--print', '--model', 'haiku'], { env })
    let stdout = '', stderr = ''
    proc.stdout.on('data', d => stdout += d.toString())
    proc.stderr.on('data', d => stderr += d.toString())
    proc.on('close', code => {
      if (code !== 0) return reject(new Error(`haiku exit ${code}: ${stderr.slice(0, 200)}`))
      resolve(stdout.trim())
    })
    proc.stdin.write(prompt)
    proc.stdin.end()
    setTimeout(() => proc.kill('SIGKILL'), 60000)
  })
}

function parseHaikuJson(raw) {
  // Strip any leading/trailing junk, find first { and last }
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end < 0) throw new Error(`No JSON object in haiku output: ${raw.slice(0, 200)}`)
  const json = raw.slice(start, end + 1)
  return JSON.parse(json)
}

// Don't auto-overwrite a determination that was set by a human. The migration
// stores authoring source in check_notes under `set_by`.
async function getExistingSetBy(courseCode) {
  const { data, error } = await supabase.from('courses').select('gender_prep_check_notes').eq('course_code', courseCode).single()
  if (error || !data?.gender_prep_check_notes) return null
  try {
    const parsed = JSON.parse(data.gender_prep_check_notes)
    return parsed.set_by || null
  } catch { return null }
}

async function detectNeedsGenderPrep(courseCode, opts = {}) {
  const { force = false } = opts

  // Human override: don't clobber a manually-set decision unless force=true
  if (!force) {
    const existingSetBy = await getExistingSetBy(courseCode).catch(() => null)
    if (existingSetBy === 'human') {
      return {
        courseCode,
        needs_gender_prep: null,
        reasoning: 'Skipped: existing determination was set by a human. Pass force=true to override.',
        examples: [],
        skipped: 'human-override',
        persisted: false,
      }
    }
  }

  const { course, samples } = await sampleFirstPersonPhrases(courseCode, 10)
  if (samples.length === 0) {
    return { courseCode, needs_gender_prep: null, reasoning: 'No first-person phrases found in course (course may be empty or use non-standard known prefixes)', examples: [] }
  }
  const prompt = buildPrompt(course.target_lang, samples)
  const raw = await callHaiku(prompt)
  const parsed = parseHaikuJson(raw)

  // Voice-config gate: even if Haiku says the LANGUAGE genders 1st-person
  // forms, the course only NEEDS gender prep when at least one target voice
  // is female (otherwise the masculine canonical text is the only thing that
  // ever speaks, and the feminine variants are dead weight).
  const voiceGenders = voiceGender.getCourseVoiceGenders(course.voice_config)
  const hasFemTarget = voiceGender.anyTargetVoiceFemale(course.voice_config)

  const languageVerdict = parsed.needs_gender_prep
  let courseVerdict = languageVerdict
  let voiceGate = 'pass'
  if (languageVerdict === true && hasFemTarget === false) {
    courseVerdict = false
    voiceGate = 'no-female-target'
  } else if (languageVerdict === true && hasFemTarget === null) {
    // Unknown voices in a gendered lang — conservatively keep prep enabled
    // and flag it in audit so a reviewer can confirm.
    voiceGate = 'unknown-voices'
  }

  // Persist
  const update = {
    needs_gender_prep: courseVerdict,
    gender_prep_check_notes: JSON.stringify({
      reasoning: parsed.reasoning,
      examples: parsed.examples || [],
      samples: samples.map(s => s.target_text),
      language_verdict: languageVerdict,
      voice_gate: voiceGate,
      voices: {
        target1: voiceGenders.voiceIds.target1,
        target2: voiceGenders.voiceIds.target2,
        target1_gender: voiceGenders.target1,
        target2_gender: voiceGenders.target2,
        any_female_target: hasFemTarget,
      },
      set_by: 'haiku',
      model: MODEL,
      prompt_version: PROMPT_VERSION,
    }),
    gender_prep_checked_at: new Date().toISOString()
  }
  const { error } = await supabase.from('courses').update(update).eq('course_code', courseCode)
  if (error) {
    if (/column .* does not exist|Could not find the/.test(error.message || '')) {
      console.warn(`Migration 20260505_courses_needs_gender_prep.sql not applied yet — Haiku check completed but result not persisted. Run the migration via Supabase dashboard, then re-run.`)
      return { courseCode, ...parsed, needs_gender_prep: courseVerdict, language_verdict: languageVerdict, voice_gate: voiceGate, samplesUsed: samples.length, persisted: false, persistError: 'migration not applied' }
    } else {
      throw error
    }
  }
  return { courseCode, ...parsed, needs_gender_prep: courseVerdict, language_verdict: languageVerdict, voice_gate: voiceGate, samplesUsed: samples.length, persisted: true }
}

// Used by the API endpoint when a human flips needs_gender_prep manually,
// so the audit trail records who decided what and the auto-detector won't
// overwrite it on a future run.
async function setManualOverride(courseCode, value, reason) {
  if (value !== true && value !== false && value !== null) {
    throw new Error(`Invalid value: must be true|false|null, got ${value}`)
  }
  const update = {
    needs_gender_prep: value,
    gender_prep_check_notes: JSON.stringify({
      reasoning: reason || 'Manual override (no reason given)',
      set_by: 'human',
      manual_value: value,
    }),
    gender_prep_checked_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('courses').update(update).eq('course_code', courseCode)
  if (error) throw error
  return { courseCode, needs_gender_prep: value, set_by: 'human' }
}

if (require.main === module) {
  const courseCode = process.argv[2]
  if (!courseCode) { console.error('Usage: node gender-prep-detector.cjs <course_code>'); process.exit(1) }
  detectNeedsGenderPrep(courseCode).then(r => {
    console.log(JSON.stringify(r, null, 2))
    process.exit(0)
  }).catch(e => { console.error('FATAL:', e.message); process.exit(1) })
}

module.exports = { detectNeedsGenderPrep, setManualOverride }
