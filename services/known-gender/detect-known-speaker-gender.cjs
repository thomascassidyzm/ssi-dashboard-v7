/**
 * DETECT SPEAKER-GENDERED KNOWN LINES — language-general (Kai's design, 2026-09-23; #883·H).
 *
 * "Gendered" here means ONE thing: the grammar of the line moves with the
 * gender of the SPEAKER (first person). Hindi: मैं चाहता हूँ / मैं चाहती हूँ.
 * Italian: sono stanco / sono stanca. Lines whose gender marking belongs to the
 * LISTENER (आप जा रहे हैं / जा रही हैं) or to a THIRD PERSON (वह चाहता है / वह
 * चाहती है) are NOT speaker-gendered: either voice can say them unchanged, so
 * they take the neutral hash split. Third-person variation is the OTHER
 * mechanism (Tom's target-side two-reading ruling, 2026-09-03) and must never
 * leak into this one — which is why the existing target-side expander is not
 * reused here: its prompt is about the answer side and its stored rows mix the
 * axes.
 *
 * The judgement is made by a language model through the Claude CLI (never the
 * SDK — CLAUDE.md), one batch of lines at a time, and every answer is checked
 * mechanically before it is believed: one of the two forms MUST equal the
 * input character for character (the input is itself one of the two forms),
 * and the two forms must have the same number of words. Anything else is
 * recorded as `unverified` and treated as NEUTRAL — a detector that cannot
 * prove a pair does not invent one. Coverage is printed, never assumed
 * (Kai: a detector must print its own coverage).
 *
 * No regex makes a language judgement here. There is no per-language
 * pre-filter: every line is put to the model.
 */

const { claudeChat } = require('../shared/claude-cli.cjs')
const { normalizeKnownKey } = require('../shared/known-voice-gender.cjs')

const LANG_NAMES = {
  hin: 'Hindi', urd: 'Urdu', pan: 'Punjabi', guj: 'Gujarati', mar: 'Marathi', ben: 'Bengali', nep: 'Nepali',
  ita: 'Italian', spa: 'Spanish', por: 'Portuguese', fra: 'French', cat: 'Catalan', ron: 'Romanian',
  pol: 'Polish', ces: 'Czech', slk: 'Slovak', hrv: 'Croatian', rus: 'Russian', ukr: 'Ukrainian', bul: 'Bulgarian',
  ell: 'Greek', lav: 'Latvian', lit: 'Lithuanian', isl: 'Icelandic', ara: 'Arabic', heb: 'Hebrew',
  eng: 'English', cym: 'Welsh', deu: 'German', fin: 'Finnish', jpn: 'Japanese', kor: 'Korean', zho: 'Chinese',
}

const BATCH_SIZE = 40
const DEFAULT_CONCURRENCY = 4

function buildSpeakerGenderPrompt(lines, langName) {
  const numbered = lines.map((t, i) => `${i + 1}. ${t}`).join('\n')
  return `You are checking ${langName} prompt lines from a language course. For EACH line, write it exactly as a MALE speaker would say it and exactly as a FEMALE speaker would say it.

The ONLY thing that may differ between the two versions is grammatical agreement with the SPEAKER — the first person (I / we):
- verb forms that agree with the speaker
- adjectives, participles and predicates that describe the speaker
- any other speaker-gender agreement the language has

You must NOT change:
- anything that agrees with the LISTENER (you) — leave it exactly as written
- anything that agrees with a THIRD PERSON (he / she / they / a named person / any noun) — leave it exactly as written
- word order, word count, meaning, spelling, punctuation, or register
- lines that are questions to the listener, fragments with no speaker agreement, or lines about somebody else

If the line contains NO speaker-gender agreement, return the line UNCHANGED in BOTH versions, character for character.
The input line is already one of the two versions; that version must be returned byte-identical.

Return ONLY JSON, no commentary, in this exact shape:
{"results":[{"i":1,"m":"<male speaker version>","f":"<female speaker version>"}, ...]}

Lines:
${numbered}`
}

function parseJson(content) {
  try { return JSON.parse(content) } catch {}
  const m = String(content || '').match(/\{[\s\S]*\}/)
  if (!m) return null
  try { return JSON.parse(m[0]) } catch { return null }
}

const wordCount = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length

/**
 * Mechanical verification of one model answer. Returns
 *   { status: 'gendered'|'neutral'|'unverified', m, f, reason? }
 */
function verifyAnswer(original, m, f) {
  if (typeof m !== 'string' || typeof f !== 'string' || !m.trim() || !f.trim()) {
    return { status: 'unverified', reason: 'missing form' }
  }
  const same = normalizeKnownKey(m) === normalizeKnownKey(f)
  if (same) {
    if (normalizeKnownKey(m) !== normalizeKnownKey(original)) return { status: 'unverified', reason: 'neutral answer rewrote the line' }
    return { status: 'neutral', m: original, f: original }
  }
  if (m !== original && f !== original) return { status: 'unverified', reason: 'neither form equals the input', m, f }
  if (wordCount(m) !== wordCount(f)) return { status: 'unverified', reason: 'forms differ in word count', m, f }
  return { status: 'gendered', m, f }
}

async function runBatch(lines, langName, { model = 'sonnet', timeout = 180000 } = {}) {
  const prompt = buildSpeakerGenderPrompt(lines, langName)
  let content
  try {
    content = await claudeChat(prompt, { model, timeout })
  } catch (e) {
    return lines.map(text => ({ text, status: 'unverified', reason: `cli error: ${e.message}` }))
  }
  const parsed = parseJson(content)
  if (!parsed || !Array.isArray(parsed.results)) {
    return lines.map(text => ({ text, status: 'unverified', reason: 'unparseable answer' }))
  }
  const byIndex = new Map(parsed.results.map(r => [Number(r.i), r]))
  return lines.map((text, idx) => {
    const r = byIndex.get(idx + 1)
    if (!r) return { text, status: 'unverified', reason: 'no answer for line' }
    return { text, ...verifyAnswer(text, r.m, r.f) }
  })
}

async function runWithConcurrency(tasks, limit) {
  const results = new Array(tasks.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (next < tasks.length) {
      const i = next++
      results[i] = await tasks[i]()
    }
  })
  await Promise.all(workers)
  return results
}

/**
 * Detect speaker-gendered lines among `texts` (distinct known texts).
 * Returns { results: [{text, status, m, f, reason}], coverage }.
 * `onProgress(done, total)` is called after each batch.
 */
async function detectKnownSpeakerGender(texts, { language, langName, model = 'sonnet', concurrency = DEFAULT_CONCURRENCY, onProgress } = {}) {
  const name = langName || LANG_NAMES[language] || language
  const unique = [...new Set((texts || []).map(t => String(t || '').trim()).filter(t => t && t.length > 1))]
  const batches = []
  for (let i = 0; i < unique.length; i += BATCH_SIZE) batches.push(unique.slice(i, i + BATCH_SIZE))
  let done = 0
  const tasks = batches.map(b => async () => {
    const r = await runBatch(b, name, { model })
    done += 1
    if (onProgress) onProgress(done, batches.length)
    return r
  })
  const results = (await runWithConcurrency(tasks, concurrency)).flat()
  const coverage = { asked: unique.length, gendered: 0, neutral: 0, unverified: 0 }
  for (const r of results) coverage[r.status] += 1
  return { results, coverage, batches: batches.length }
}

/** Rows for course_gender_expansions (text_side='known'), gendered results only. */
function toKnownPairRows(courseCode, language, results) {
  const rows = []
  const seen = new Set()
  for (const r of results || []) {
    if (r.status !== 'gendered') continue
    if (seen.has(r.text)) continue
    seen.add(r.text)
    rows.push({ course_code: courseCode, original_text: r.text, language, expanded_m: r.m, expanded_f: r.f, text_side: 'known' })
  }
  return rows
}

/** Upsert known-side pairs. Never touches target-side rows, never deletes. */
async function storeKnownPairs(supabase, courseCode, language, results) {
  const rows = toKnownPairRows(courseCode, language, results)
  let stored = 0
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500)
    const { error } = await supabase.from('course_gender_expansions').upsert(batch, { onConflict: 'course_code,original_text,text_side' })
    if (error) throw new Error(`course_gender_expansions upsert failed: ${error.message}`)
    stored += batch.length
  }
  return stored
}

module.exports = {
  BATCH_SIZE, LANG_NAMES,
  buildSpeakerGenderPrompt, parseJson, verifyAnswer, runBatch,
  detectKnownSpeakerGender, toKnownPairRows, storeKnownPairs,
}
