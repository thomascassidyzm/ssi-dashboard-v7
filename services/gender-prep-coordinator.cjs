#!/usr/bin/env node

/**
 * Gender Prep Coordinator
 *
 * Single process that spawns `claude --print --model <HAIKU_MODEL>` child processes
 * with controlled concurrency to analyse gender agreement in course texts.
 *
 * Each Haiku call is pure linguistics — outputs JSON. This coordinator
 * handles all DB work (reading texts, inserting results).
 *
 * Usage:
 *   node gender-prep-coordinator.cjs <course_code> [--concurrency 5] [--batch-size 200]
 *
 * Spawned from production-api via a single iTerm window.
 */

const { spawn } = require('child_process')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const { HAIKU_MODEL } = require('./shared/claude-cli.cjs')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

// Terminal spawning mode - set via env or default to headless
// Headless is better for batch processing (coordinator itself provides visibility)
// Use TERMINAL_MODE=iTerm2 to debug individual batches in separate windows
const TERMINAL_MODE = process.env.TERMINAL_MODE || 'headless' // 'iTerm2', 'Terminal', or 'headless'

const LANG_NAMES = {
  spa: 'Spanish', ita: 'Italian', por: 'Portuguese', fra: 'French',
  cat: 'Catalan', ron: 'Romanian',
  pol: 'Polish', ces: 'Czech', slk: 'Slovak', hrv: 'Croatian',
  rus: 'Russian', ukr: 'Ukrainian', bul: 'Bulgarian', mkd: 'Macedonian',
  ell: 'Greek',
  lav: 'Latvian', lit: 'Lithuanian',
  isl: 'Icelandic', hin: 'Hindi', nep: 'Nepali', ben: 'Bengali',
  guj: 'Gujarati', pan: 'Punjabi', urd: 'Urdu', mar: 'Marathi',
  ara: 'Arabic', heb: 'Hebrew', tha: 'Thai',
}

// ─── Parse args ───────────────────────────────────────────────────────

const args = process.argv.slice(2)
const courseCode = args[0]
if (!courseCode) {
  console.error('Usage: node gender-prep-coordinator.cjs <course_code> [--concurrency N] [--batch-size N]')
  process.exit(1)
}

let CONCURRENCY = 5
let BATCH_SIZE = 200
let JOB_ID = null

// Max wall-clock for a single Haiku batch. In headless mode the coordinator
// resolves a batch only when its `claude --print` child exits — so a single
// hung child (it happens: a runaway Haiku can spin for hours) used to wedge the
// entire run forever with no timeout. Kill + retry instead. Override via env.
const PER_BATCH_TIMEOUT_MS = parseInt(process.env.GENDER_BATCH_TIMEOUT_MS || '480000', 10) // 8 min
const MAX_BATCH_ATTEMPTS = 2

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--concurrency' && args[i + 1]) CONCURRENCY = parseInt(args[++i], 10)
  if (args[i] === '--batch-size' && args[i + 1]) BATCH_SIZE = parseInt(args[++i], 10)
  if (args[i] === '--job-id' && args[i + 1]) JOB_ID = args[++i]
}

// Helper: update build_jobs row
async function updateJob(fields) {
  if (!JOB_ID) return
  const { error } = await supabase
    .from('build_jobs')
    .update(fields)
    .eq('id', JOB_ID)
  if (error) console.warn('[JOB] Failed to update build_jobs:', error.message)
}

// ─── Supabase ─────────────────────────────────────────────────────────

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// ─── Build the Haiku brief ───────────────────────────────────────────

function buildBrief(langName, langCode, texts) {
  // Language-specific gender-agreement rules. Default ("Romance") covers
  // adjective/participle agreement with the 1st-person speaker. Add a
  // tailored block when a language's gender system differs significantly.
  let genderRules
  if (langCode === 'ara') {
    genderRules = `- Predicate adjectives about the speaker: أنا سعيد→أنا سعيدة (female)
- Active/passive participles as predicates about the speaker
- Standalone adjective fragments where speaker is implied
- Do NOT change verb conjugations (Arabic 1st person past/present don't change for gender)
- Do NOT change 3rd person references or 2nd person forms`
  } else if (langCode === 'heb') {
    genderRules = `- Hebrew verbs ARE gendered for the speaker: אני מדבר (male) → אני מדברת (female), אני עייף → אני עייפה
- Predicate adjectives describing the speaker also vary
- Participles used as present-tense verbs (the most common pattern): vary by gender
- Do NOT change 2nd person forms unless the addressee is the speaker (rare)
- Do NOT change past tense or future tense verb conjugations beyond the standard masc/fem pairs
- Do NOT change nouns, prepositions, particles`
  } else if (['pol','ces','slk','hrv','rus','ukr','bul','mkd'].includes(langCode)) {
    genderRules = `- Past tense verbs vary by speaker gender: byłem→byłam (Polish), byl jsem→byla jsem (Czech), bio sam→bila sam (Croatian)
- Predicate adjectives/participles describing the speaker: zmęczony→zmęczona, готов→готова
- L-participle past tenses are the main pattern in Slavic — feminine ends in -a where masculine has consonant or -ø
- Do NOT change present-tense verbs (they don't gender)
- Do NOT change 3rd-person references, 2nd-person forms, nouns, prepositions`
  } else if (langCode === 'ell') {
    genderRules = `- Predicate adjectives describing the speaker: είμαι κουρασμένος (m) → είμαι κουρασμένη (f), έτοιμος → έτοιμη
- Active participles describing the speaker: ευχαριστημένος → ευχαριστημένη
- Do NOT change verbs themselves (Greek verbs don't gender)
- Do NOT change articles, nouns, prepositions, 3rd-person references`
  } else if (['lav','lit'].includes(langCode)) {
    genderRules = `- Predicate adjectives describing the speaker MUST agree: esmu gatavs (m) → esmu gatava (f) [Latvian], esu pasiruošęs → esu pasiruošusi [Lithuanian]
- Past participles used predicatively also vary
- Adjective fragments where speaker is implied
- Do NOT change verbs themselves, articles (none in Baltic), nouns
- Do NOT change 2nd or 3rd person forms`
  } else if (['hin','urd','ben','guj','pan','mar','nep'].includes(langCode)) {
    genderRules = `- Indo-Aryan languages gender both verbs AND adjectives for the speaker
- Verb endings: मैं जाता हूँ (m) → मैं जाती हूँ (f) [Hindi]; main jaata huun → main jaati huun
- Predicate adjectives: मैं थका हूँ → मैं थकी हूँ
- Past participles: किया → की, गया → गयी
- Do NOT change 2nd/3rd person forms, nouns, postpositions
- The honorific plural may be relevant — use ordinary singular forms unless the original is honorific`
  } else if (langCode === 'isl') {
    genderRules = `- Icelandic predicate adjectives strongly agree with the speaker: ég er þreyttur (m) → ég er þreytt (f)
- Past participles describing the speaker: farinn → farin
- Do NOT change verbs themselves, articles, 3rd-person references`
  } else if (langCode === 'tha') {
    genderRules = `- Thai has NO adjective or verb gender agreement. Gender shows ONLY in the first-person pronoun (and, if present, polite sentence-final particles).
- First-person "I": male ผม → female ฉัน. This course uses ผม (male) as the default, so expanded_m = original (ผม unchanged); expanded_f replaces the first-person ผม with ฉัน.
- ⚠️ CRITICAL: ผม also means "hair". Only swap ผม when the English [means: "..."] shows it is the first-person subject "I" — NEVER when it means the noun "hair". Use the gloss.
- Only the "I"-pronoun changes. Do NOT touch verbs, other nouns, classifiers, or 2nd/3rd-person pronouns.
- Polite particles (only if they actually appear): male ครับ → female ค่ะ/คะ. (This course does not use them.)`
  } else {
    // Default: Romance + general
    genderRules = `- Adjectives/participles describing "I" (the speaker): stanco→stanca, content→contente, prêt→prête
- Past participles where subject is the speaker (être/essere verbs): allé→allée, andato→andata
- Fragments where speaker is implied: "stanco"→"stanca" (female), "stanco" stays (male)
- Do NOT change: verbs, nouns, prepositions, articles, 3rd person references, 2nd person forms
- Do NOT change past participles with avoir/avere (they don't agree with speaker)
- Do NOT change meaning, word order, or "fix" anything — only adjust gender agreement`
  }

  // Inline the texts directly in the brief (no file reading needed)
  const textList = texts.map((p, i) => `${i + 1}. [means: "${p.known || '?'}"]  ${p.target}`).join('\n')

  return `You are a ${langName} linguistics expert.

## Task

Analyse each text below for first-person speaker gender agreement. Two TTS voices read every phrase:
- target1 = female voice → adjectives/participles must agree feminine
- target2 = male voice → adjectives/participles must agree masculine

The original text is usually the masculine default.

## THE ONE TEST THAT DECIDES EVERYTHING (read before every item)

An adjective/participle varies by VOICE only if its subject is the FIRST-PERSON SPEAKER ("I" / yo / je / io / ich / …). If it describes ANYONE ELSE — he, she, they, "you", or a named person — it agrees with THAT person and MUST be byte-identical in both voices. Do not create a variant.

Ask: "Whose trait is this word describing?" Only "the speaker (I)" → vary. Anyone else → leave it, in BOTH voices.

**Every item below shows its English meaning in [means: "..."]. USE IT to find the subject** — the target-language ending alone is ambiguous (Spanish "estaba ocupada" could be "I was busy" OR "she was busy"; only the English tells you). If the English subject is he / she / they / you / a named person → the adjective is theirs → NO variant. Only if the English subject is "I" does it vary. Example: [means: "She was too busy so I didn't want to interrupt"] Estaba demasiado ocupada... → subject of *ocupada* is SHE → do NOT expand.

TRAP EXAMPLES — NO variant (subject is 3rd/2nd person; BOTH voices say the ORIGINAL). See how the English [means: ...] gives away the subject:
- [means: "He said he wanted to do it alone"]  quería hacerlo solo → *solo* = HE → keep "solo" in both voices, NOT "sola".
- [means: "She was too busy so I didn't want to interrupt"]  Estaba demasiado ocupada así que no quería interrumpir → *ocupada* = SHE → keep "ocupada" in both, NOT "ocupado" (the "I" here is only the interrupter, not the subject of *ocupada*).
- [means: "She is tired"]  ella está cansada → explicit 3rd person → never varies.
- [means: "Are you ready?"]  ¿estás listo? → *listo* = YOU → never varies.

VARY only when the English subject of the adjective is "I":
- [means: "I did more than I expected and I am very happy"]  hice mucho más de lo que esperaba y estoy muy contento → f: "...estoy muy contenta" / m: "...estoy muy contento" ✓
- bare fragment, implied "I": [means: "ready"]  listo → f: "lista" / m: "listo" ✓

When you cannot tell whose trait it is, LEAVE IT UNCHANGED (skip). A false variant that flips a he/she adjective to the wrong gender is worse than a missed one.

## ${langName} Gender Rules

${genderRules}

## Texts to analyse

${textList}

## Output

Output ONLY a JSON array. No explanation, no markdown fences, ONLY the raw JSON array.

Format: [{"original":"the target text VERBATIM (the part after [means: ...]; never the English, never the [means:] prefix)","expanded_f":"feminine form","expanded_m":"masculine form"}]

If NO texts need variants, output: []

Rules:
- CRITICAL: Output ONLY valid JSON - no explanations, no questions, no commentary
- "original" MUST be the target-language text exactly as given (drop the [means: "..."] gloss — it is context only, never part of any output field)
- Only include texts where expanded_f OR expanded_m differs from original
- If a text cannot be analyzed (single word, no speaker context), skip it - do NOT explain why
- Most texts will NOT need changes. Be selective.
- For items that need changes, provide both feminine and masculine forms
- Output raw JSON only — not even markdown code fences`
}

// ─── Run a single Haiku batch ─────────────────────────────────────────

function runHaikuBatch(brief, batchNum, totalBatches) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const tempDir = path.resolve(__dirname, '..', 'temp', 'gender-batches')
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

    const batchId = `batch-${batchNum}-${Date.now()}`
    const briefFile = path.join(tempDir, `${batchId}-brief.txt`)
    const outputFile = path.join(tempDir, `${batchId}-output.json`)
    const doneFile = path.join(tempDir, `${batchId}-done.flag`)

    // Write brief to file
    fs.writeFileSync(briefFile, brief, 'utf8')

    // Build the command that Claude will run
    // Use stdin instead of command-line args to avoid length limits
    // Explicitly unset CLAUDECODE to allow nested Claude CLI calls
    const claudeCmd = `unset CLAUDECODE ANTHROPIC_API_KEY && cat '${briefFile}' | claude --print --model ${HAIKU_MODEL} > '${outputFile}' 2>&1 && touch '${doneFile}'`

    if (TERMINAL_MODE === 'headless') {
      // Headless mode: direct spawn (original behavior)
      // Unset CLAUDECODE to allow nested Claude CLI calls
      const env = { ...process.env, HOME: process.env.HOME }
      delete env.CLAUDECODE
      delete env.ANTHROPIC_API_KEY

      const proc = spawn('bash', ['-c', claudeCmd], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'pipe',
        env,
        detached: true // own process group, so we can kill the whole tree on timeout
      })

      let stderr = ''
      let settled = false
      proc.stderr.on('data', (d) => { stderr += d.toString() })

      // Watchdog: if the child hasn't exited in time, kill its whole process
      // group (claude can spawn helpers) and reject so the caller can retry.
      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
        console.error(`  [${batchNum}/${totalBatches}] TIMEOUT after ${elapsed}s — killing hung Haiku child`)
        try { process.kill(-proc.pid, 'SIGKILL') } catch (e) { try { proc.kill('SIGKILL') } catch (_) {} }
        cleanup()
        reject(new Error(`timeout after ${elapsed}s`))
      }, PER_BATCH_TIMEOUT_MS)

      proc.on('close', (code) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
        if (code !== 0 || !fs.existsSync(outputFile)) {
          console.error(`  [${batchNum}/${totalBatches}] FAILED (exit ${code}, ${elapsed}s)`)
          if (stderr) console.error(`  stderr: ${stderr.substring(0, 500)}`)
          if (fs.existsSync(outputFile)) {
            const output = fs.readFileSync(outputFile, 'utf8')
            if (output) console.error(`  output: ${output.substring(0, 500)}`)
          }
          cleanup()
          return reject(new Error(`exit code ${code}`))
        }

        const results = parseOutputFile(outputFile, batchNum, totalBatches, elapsed)
        cleanup()
        resolve(results)
      })

      proc.on('error', (e) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        console.error(`  [${batchNum}/${totalBatches}] spawn error: ${e.message}`)
        cleanup()
        reject(e)
      })
    } else {
      // iTerm2/Terminal mode: spawn in visible window
      const label = `Gender Batch ${batchNum}/${totalBatches}`
      const escapedCmd = claudeCmd.replace(/"/g, '\\"')

      const osascript = TERMINAL_MODE === 'iTerm2'
        ? `tell application "iTerm"
  activate
  set newWindow to (create window with default profile)
  tell current session of newWindow
    set name to "${label}"
    write text "${escapedCmd}"
  end tell
end tell`
        : `tell application "Terminal"
  activate
  do script "${escapedCmd}"
end tell`

      spawn('osascript', ['-e', osascript], { stdio: 'pipe', detached: true })

      // Poll for completion (file-based communication)
      pollForCompletion(doneFile, outputFile, batchNum, totalBatches, startTime, resolve, cleanup)
    }

    function cleanup() {
      try {
        if (fs.existsSync(briefFile)) fs.unlinkSync(briefFile)
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile)
        if (fs.existsSync(doneFile)) fs.unlinkSync(doneFile)
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  })
}

// ─── Parse output file ────────────────────────────────────────────────

function parseOutputFile(outputFile, batchNum, totalBatches, elapsed) {
  try {
    const content = fs.readFileSync(outputFile, 'utf8').trim()

    // Remove markdown code fences
    let cleaned = content.replace(/^```json?\s*/i, '').replace(/\s*```\s*$/i, '')

    // Find the JSON array
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
    if (!arrayMatch) {
      if (cleaned === '[]' || cleaned === '') {
        console.log(`  [${batchNum}/${totalBatches}] 0 variants (${elapsed}s)`)
        return []
      }
      console.error(`  [${batchNum}/${totalBatches}] No JSON array found (${elapsed}s)`)
      console.error(`  Output: ${cleaned.substring(0, 300)}`)
      return []
    }

    const results = JSON.parse(arrayMatch[0])
    console.log(`  [${batchNum}/${totalBatches}] ${results.length} variants (${elapsed}s)`)
    return results
  } catch (e) {
    console.error(`  [${batchNum}/${totalBatches}] Parse error: ${e.message}`)
    return []
  }
}

// ─── Poll for completion ──────────────────────────────────────────────

function pollForCompletion(doneFile, outputFile, batchNum, totalBatches, startTime, resolve, cleanup) {
  const maxWait = 300000 // 5 minutes max
  const pollInterval = 1000 // Check every second

  const checkDone = () => {
    const elapsed = Date.now() - startTime

    if (fs.existsSync(doneFile)) {
      const elapsedSeconds = (elapsed / 1000).toFixed(1)
      const results = parseOutputFile(outputFile, batchNum, totalBatches, elapsedSeconds)
      cleanup()
      resolve(results)
    } else if (elapsed > maxWait) {
      console.error(`  [${batchNum}/${totalBatches}] TIMEOUT after ${(elapsed/1000).toFixed(0)}s`)
      cleanup()
      resolve([])
    } else {
      setTimeout(checkDone, pollInterval)
    }
  }

  setTimeout(checkDone, pollInterval)
}

// ─── Concurrency-limited batch runner ─────────────────────────────────

async function runWithConcurrency(tasks, concurrency) {
  const results = []
  let idx = 0

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++
      results[i] = await tasks[i]()
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()))
  return results
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n╔══════════════════════════════════════════════╗`)
  console.log(`║  Gender Prep Coordinator                     ║`)
  console.log(`║  Course: ${courseCode.padEnd(36)}║`)
  console.log(`║  Concurrency: ${String(CONCURRENCY).padEnd(31)}║`)
  console.log(`║  Batch size: ${String(BATCH_SIZE).padEnd(32)}║`)
  console.log(`╚══════════════════════════════════════════════╝\n`)

  // 1. Get course info
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('target_lang, display_name')
    .eq('course_code', courseCode)
    .single()

  if (courseErr || !course) {
    console.error('Course not found:', courseCode)
    process.exit(1)
  }

  const langName = LANG_NAMES[course.target_lang] || course.target_lang
  console.log(`Language: ${langName} (${course.target_lang})`)

  // Signal actual startup — job was 'pending' until now
  await updateJob({ status: 'running', last_heartbeat: new Date().toISOString() })

  // 2. Collect unique target texts, EACH PAIRED with a representative English known.
  //    The known disambiguates the subject (target endings alone are ambiguous:
  //    "estaba ocupada" = "I was busy" OR "she was busy"). Prefer the longest known
  //    for a given target — the fullest sentence gives the clearest subject.
  const pairMap = new Map() // target -> best known
  const addPair = (known, target) => {
    if (!target) return
    const cur = pairMap.get(target)
    if (cur === undefined || (known || '').length > cur.length) pairMap.set(target, known || cur || '')
  }
  const { data: phrases } = await supabase.from('course_practice_phrases').select('known_text,target_text').eq('course_code', courseCode)
  if (phrases) phrases.forEach(p => addPair(p.known_text, p.target_text))
  const { data: legos } = await supabase.from('course_legos').select('known_text,target_text').eq('course_code', courseCode)
  if (legos) legos.forEach(l => addPair(l.known_text, l.target_text))
  const { data: seeds } = await supabase.from('course_seeds').select('known_text,target_text').eq('course_code', courseCode)
  if (seeds) seeds.forEach(s => addPair(s.known_text, s.target_text))

  // Filter out invalid targets before gender analysis
  const allTexts = [...pairMap.entries()]
    .map(([target, known]) => ({ target, known }))
    .filter(({ target: text }) => {
      if (!text || text.trim().length === 0) return false
      if (/^[.,;:!?،؛؟\s]+$/.test(text)) return false
      if (text.trim().length < 2) return false
      if (text.includes('(perfect tense)') || text.includes('(imperfect)')) return false
      return true
    })
    .sort((a, b) => a.target.localeCompare(b.target))

  console.log(`Total unique texts: ${allTexts.length} (from ${pairMap.size} target/known pairs)`)

  if (allTexts.length === 0) {
    console.error('No valid target texts found')
    process.exit(1)
  }

  // 3. Clear existing expansions
  const { error: delErr } = await supabase.from('course_gender_expansions').delete().eq('course_code', courseCode)
  if (delErr) console.warn('Warning: could not clear existing expansions:', delErr.message)
  console.log('Cleared existing expansions')

  // 4. Split into batches
  const batches = []
  for (let i = 0; i < allTexts.length; i += BATCH_SIZE) {
    batches.push(allTexts.slice(i, i + BATCH_SIZE))
  }
  console.log(`Batches: ${batches.length} (${BATCH_SIZE} texts each, concurrency ${CONCURRENCY})\n`)

  // Persist one batch's expansions immediately. Incremental persistence means a
  // later hung/failed batch can no longer discard every other batch's (expensive)
  // Haiku work — the old code collected all 84 batches and inserted once at the
  // very end, so any interruption before that lost everything.
  // Dedupe within the batch: Postgres ON CONFLICT can only touch a row once per
  // upsert call ("cannot affect row a second time"). Cross-batch is safe — each
  // unique input text lives in exactly one batch, and repeats are separate calls.
  const persistExpansions = async (results) => {
    const valid = (results || []).filter(r => r && r.original)
    if (valid.length === 0) return 0
    const seen = new Map()
    for (const r of valid) if (!seen.has(r.original)) seen.set(r.original, r)
    const rows = [...seen.values()].map(r => ({
      course_code: courseCode,
      original_text: r.original,
      language: course.target_lang,
      expanded_f: r.expanded_f,
      expanded_m: r.expanded_m,
      text_side: 'target'
    }))
    let ok = 0
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500)
      const { error } = await supabase
        .from('course_gender_expansions')
        .upsert(chunk, { onConflict: 'course_code,original_text,text_side' })
      if (error) console.error(`  Persist error:`, error.message)
      else ok += chunk.length
    }
    return ok
  }

  // 5. Build tasks — each batch retries on failure/timeout, then persists.
  let batchesCompleted = 0
  let totalPersisted = 0
  const failedBatches = []
  const tasks = batches.map((batchTexts, b) => async () => {
    const brief = buildBrief(langName, course.target_lang, batchTexts)
    let result = []
    let ok = false
    for (let attempt = 1; attempt <= MAX_BATCH_ATTEMPTS; attempt++) {
      try {
        result = await runHaikuBatch(brief, b + 1, batches.length)
        ok = true
        break
      } catch (e) {
        console.error(`  [${b + 1}/${batches.length}] attempt ${attempt}/${MAX_BATCH_ATTEMPTS} failed: ${e.message}`)
      }
    }
    if (!ok) {
      failedBatches.push(b + 1)
      console.error(`  [${b + 1}/${batches.length}] GIVING UP after ${MAX_BATCH_ATTEMPTS} attempts — ${batchTexts.length} texts skipped`)
    }
    totalPersisted += await persistExpansions(result)
    batchesCompleted++
    await updateJob({ last_heartbeat: new Date().toISOString(), seeds_completed: batchesCompleted })
    return result
  })

  // 6. Run with concurrency limit
  const startTime = Date.now()
  const batchResults = await runWithConcurrency(tasks, CONCURRENCY)

  // 7. Collect all results (already persisted incrementally per batch above)
  const allResults = batchResults.flat().filter(r => r && r.original)
  console.log(`\nTotal variants found: ${allResults.length} (persisted ${totalPersisted} to DB)`)
  if (failedBatches.length > 0) {
    console.warn(`⚠️  ${failedBatches.length} batch(es) failed after retries and were skipped: ${failedBatches.sort((a, b) => a - b).join(', ')}`)
  }

  // 8. Flag affected audio for regeneration
  //    Find target1 + target2 audio matching the expanded texts and flag them.
  //    --text-only skips this (e.g. when a full regen is coming anyway).
  if (allResults.length > 0 && !process.argv.includes('--text-only')) {
    console.log(`\nFlagging affected audio for regeneration...`)
    const expandedOriginals = allResults.map(r => r.original)
    let flagged = 0

    for (const text of expandedOriginals) {
      for (const role of ['target1', 'target2']) {
        const { data: audio } = await supabase
          .from('course_audio')
          .select('id')
          .eq('course_code', courseCode)
          .eq('text', text)
          .eq('role', role)
          .limit(1)

        if (audio && audio.length > 0) {
          const { error: flagErr } = await supabase
            .from('audio_flags')
            .upsert({
              audio_uuid: audio[0].id,
              course_code: courseCode,
              status: 'flagged',
              reason: 'gender-expansion',
              flagged_by: 'gender-prep',
              created_at: new Date().toISOString()
            }, { onConflict: 'audio_uuid,course_code' })
          if (!flagErr) flagged++
        }
      }
    }
    console.log(`Flagged ${flagged} audio records (${expandedOriginals.length} texts × 2 roles)`)
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
  console.log(`\n✓ Done in ${elapsed}s — ${allResults.length} gender expansions for ${courseCode}`)
  if (allResults.length > 0) {
    console.log(`→ Use "Regenerate N flagged" in the Gender Prep banner on the Audio Pipeline page to re-voice affected audio`)
  }

  // Mark job complete
  await updateJob({ status: 'complete', completed_at: new Date().toISOString() })
}

main().catch(async (e) => {
  console.error('Fatal error:', e)
  await updateJob({ status: 'failed', error_message: e.message || String(e) })
  process.exit(1)
})
