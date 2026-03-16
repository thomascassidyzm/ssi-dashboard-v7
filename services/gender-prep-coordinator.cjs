#!/usr/bin/env node

/**
 * Gender Prep Coordinator
 *
 * Single process that spawns `claude --print --model haiku` child processes
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
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

// Terminal spawning mode - set via env or default to headless
// Headless is better for batch processing (coordinator itself provides visibility)
// Use TERMINAL_MODE=iTerm2 to debug individual batches in separate windows
const TERMINAL_MODE = process.env.TERMINAL_MODE || 'headless' // 'iTerm2', 'Terminal', or 'headless'

const LANG_NAMES = {
  spa: 'Spanish', ita: 'Italian', por: 'Portuguese', fra: 'French',
  ara: 'Arabic', deu: 'German', ron: 'Romanian', pol: 'Polish',
  rus: 'Russian', ukr: 'Ukrainian', cat: 'Catalan', hrv: 'Croatian',
  ces: 'Czech', slk: 'Slovak'
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
  const genderRules = langCode === 'ara'
    ? `- Predicate adjectives about the speaker: أنا سعيد→أنا سعيدة (female)
- Active/passive participles as predicates about the speaker
- Standalone adjective fragments where speaker is implied
- Do NOT change verb conjugations (Arabic 1st person past/present don't change for gender)
- Do NOT change 3rd person references or 2nd person forms`
    : `- Adjectives/participles describing "I" (the speaker): stanco→stanca, content→contente, prêt→prête
- Past participles where subject is the speaker (être/essere verbs): allé→allée, andato→andata
- Fragments where speaker is implied: "stanco"→"stanca" (female), "stanco" stays (male)
- Do NOT change: verbs, nouns, prepositions, articles, 3rd person references, 2nd person forms
- Do NOT change past participles with avoir/avere (they don't agree with speaker)
- Do NOT change meaning, word order, or "fix" anything — only adjust gender agreement`

  // Inline the texts directly in the brief (no file reading needed)
  const textList = texts.map((t, i) => `${i + 1}. ${t}`).join('\n')

  return `You are a ${langName} linguistics expert.

## Task

Analyse each text below for first-person speaker gender agreement. Two TTS voices read every phrase:
- target1 = female voice → adjectives/participles must agree feminine
- target2 = male voice → adjectives/participles must agree masculine

The original text is usually the masculine default.

## ${langName} Gender Rules

${genderRules}

## Texts to analyse

${textList}

## Output

Output ONLY a JSON array. No explanation, no markdown fences, ONLY the raw JSON array.

Format: [{"original":"original text","expanded_f":"feminine form","expanded_m":"masculine form"}]

If NO texts need variants, output: []

Rules:
- CRITICAL: Output ONLY valid JSON - no explanations, no questions, no commentary
- Only include texts where expanded_f OR expanded_m differs from original
- If a text cannot be analyzed (single word, no speaker context), skip it - do NOT explain why
- Most texts will NOT need changes. Be selective.
- For items that need changes, provide both feminine and masculine forms
- Output raw JSON only — not even markdown code fences`
}

// ─── Run a single Haiku batch ─────────────────────────────────────────

function runHaikuBatch(brief, batchNum, totalBatches) {
  return new Promise((resolve) => {
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
    const claudeCmd = `unset CLAUDECODE ANTHROPIC_API_KEY && cat '${briefFile}' | claude --print --model haiku > '${outputFile}' 2>&1 && touch '${doneFile}'`

    if (TERMINAL_MODE === 'headless') {
      // Headless mode: direct spawn (original behavior)
      // Unset CLAUDECODE to allow nested Claude CLI calls
      const env = { ...process.env, HOME: process.env.HOME }
      delete env.CLAUDECODE

      const proc = spawn('bash', ['-c', claudeCmd], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'pipe',
        env
      })

      let stderr = ''
      proc.stderr.on('data', (d) => { stderr += d.toString() })

      proc.on('close', (code) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
        if (code !== 0 || !fs.existsSync(outputFile)) {
          console.error(`  [${batchNum}/${totalBatches}] FAILED (exit ${code}, ${elapsed}s)`)
          if (stderr) console.error(`  stderr: ${stderr.substring(0, 500)}`)
          if (fs.existsSync(outputFile)) {
            const output = fs.readFileSync(outputFile, 'utf8')
            if (output) console.error(`  output: ${output.substring(0, 500)}`)
          }
          cleanup()
          return resolve([])
        }

        const results = parseOutputFile(outputFile, batchNum, totalBatches, elapsed)
        cleanup()
        resolve(results)
      })

      proc.on('error', (e) => {
        console.error(`  [${batchNum}/${totalBatches}] spawn error: ${e.message}`)
        cleanup()
        resolve([])
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

  // 2. Collect all unique target texts
  const textSet = new Set()
  const { data: phrases } = await supabase.from('course_practice_phrases').select('target_text').eq('course_code', courseCode)
  if (phrases) phrases.forEach(p => { if (p.target_text) textSet.add(p.target_text) })
  const { data: legos } = await supabase.from('course_legos').select('target_text').eq('course_code', courseCode)
  if (legos) legos.forEach(l => { if (l.target_text) textSet.add(l.target_text) })
  const { data: seeds } = await supabase.from('course_seeds').select('target_text').eq('course_code', courseCode)
  if (seeds) seeds.forEach(s => { if (s.target_text) textSet.add(s.target_text) })

  // Filter out invalid texts before gender analysis
  const allTexts = [...textSet]
    .filter(text => {
      if (!text || text.trim().length === 0) return false
      // Skip standalone punctuation
      if (/^[.,;:!?،؛؟\s]+$/.test(text)) return false
      // Skip single characters
      if (text.trim().length < 2) return false
      // Skip metadata artifacts
      if (text.includes('(perfect tense)') || text.includes('(imperfect)')) return false
      return true
    })
    .sort()

  console.log(`Total unique texts: ${allTexts.length} (filtered from ${textSet.size})`)

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

  // 5. Build tasks
  let batchesCompleted = 0
  const tasks = batches.map((batchTexts, b) => async () => {
    const brief = buildBrief(langName, course.target_lang, batchTexts)
    const result = await runHaikuBatch(brief, b + 1, batches.length)
    batchesCompleted++
    await updateJob({ last_heartbeat: new Date().toISOString(), seeds_completed: batchesCompleted })
    return result
  })

  // 6. Run with concurrency limit
  const startTime = Date.now()
  const batchResults = await runWithConcurrency(tasks, CONCURRENCY)

  // 7. Collect all results (deduplicate by original_text to avoid upsert conflict)
  const resultMap = new Map()
  for (const r of batchResults.flat()) {
    if (r && r.original && !resultMap.has(r.original)) {
      resultMap.set(r.original, r)
    }
  }
  const allResults = [...resultMap.values()]
  console.log(`\nTotal variants found: ${allResults.length}`)

  // 8. Insert into DB
  if (allResults.length > 0) {
    const rows = allResults.map(r => ({
      course_code: courseCode,
      original_text: r.original,
      language: course.target_lang,
      expanded_f: r.expanded_f,
      expanded_m: r.expanded_m
    }))

    let inserted = 0
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500)
      const { error } = await supabase
        .from('course_gender_expansions')
        .upsert(batch, { onConflict: 'course_code,original_text' })
      if (error) {
        console.error(`Insert error (batch ${Math.floor(i / 500) + 1}):`, error.message)
      } else {
        inserted += batch.length
      }
    }
    console.log(`Inserted ${inserted} gender expansions into DB`)

    // 9. Flag affected audio for regeneration
    //    Find target1 + target2 audio matching the expanded texts and flag them
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
    console.log(`→ Use "Regenerate All Flagged" on the Audio page to regenerate affected audio`)
  }

  // Mark job complete
  await updateJob({ status: 'complete', completed_at: new Date().toISOString() })
}

main().catch(async (e) => {
  console.error('Fatal error:', e)
  await updateJob({ status: 'failed', error_message: e.message || String(e) })
  process.exit(1)
})
