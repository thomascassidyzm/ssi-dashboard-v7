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

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--concurrency' && args[i + 1]) CONCURRENCY = parseInt(args[++i], 10)
  if (args[i] === '--batch-size' && args[i + 1]) BATCH_SIZE = parseInt(args[++i], 10)
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

Output ONLY a JSON array of texts that need gender variants. No explanation, no markdown fences, ONLY the raw JSON array:

[{"original":"Sono stanco","expanded_f":"Sono stanca","expanded_m":"Sono stanco"}]

If NO texts need variants, output: []

Rules:
- Only include texts where expanded_f OR expanded_m differs from original
- Do NOT skip any text — analyse every single one
- Most texts will NOT need changes. Be selective.
- Output raw JSON only — no markdown, no commentary`
}

// ─── Run a single Haiku batch ─────────────────────────────────────────

function runHaikuBatch(brief, batchNum, totalBatches) {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const proc = spawn('claude', ['--print', '--model', 'haiku', brief], {
      cwd: path.resolve(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, HOME: process.env.HOME }
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (d) => { stdout += d.toString() })
    proc.stderr.on('data', (d) => { stderr += d.toString() })

    proc.on('close', (code) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      if (code !== 0) {
        console.error(`  [${batchNum}/${totalBatches}] FAILED (exit ${code}, ${elapsed}s)`)
        if (stderr) console.error(`  stderr: ${stderr.substring(0, 200)}`)
        return resolve([])
      }

      // Parse JSON from stdout — strip any markdown fences if present
      let cleaned = stdout.trim()
      // Remove markdown code fences
      cleaned = cleaned.replace(/^```json?\s*/i, '').replace(/\s*```\s*$/i, '')
      // Find the JSON array
      const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
      if (!arrayMatch) {
        if (cleaned === '[]' || cleaned === '') {
          console.log(`  [${batchNum}/${totalBatches}] 0 variants (${elapsed}s)`)
          return resolve([])
        }
        console.error(`  [${batchNum}/${totalBatches}] No JSON array found (${elapsed}s)`)
        console.error(`  Output: ${cleaned.substring(0, 300)}`)
        return resolve([])
      }

      try {
        const results = JSON.parse(arrayMatch[0])
        console.log(`  [${batchNum}/${totalBatches}] ${results.length} variants (${elapsed}s)`)
        resolve(results)
      } catch (e) {
        console.error(`  [${batchNum}/${totalBatches}] JSON parse error (${elapsed}s): ${e.message}`)
        console.error(`  Output: ${arrayMatch[0].substring(0, 300)}`)
        resolve([])
      }
    })

    proc.on('error', (e) => {
      console.error(`  [${batchNum}/${totalBatches}] spawn error: ${e.message}`)
      resolve([])
    })
  })
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

  // 2. Collect all unique target texts
  const textSet = new Set()
  const { data: phrases } = await supabase.from('course_practice_phrases').select('target_text').eq('course_code', courseCode)
  if (phrases) phrases.forEach(p => { if (p.target_text) textSet.add(p.target_text) })
  const { data: legos } = await supabase.from('course_legos').select('target_text').eq('course_code', courseCode)
  if (legos) legos.forEach(l => { if (l.target_text) textSet.add(l.target_text) })
  const { data: seeds } = await supabase.from('course_seeds').select('target_text').eq('course_code', courseCode)
  if (seeds) seeds.forEach(s => { if (s.target_text) textSet.add(s.target_text) })

  const allTexts = [...textSet].sort()
  console.log(`Total unique texts: ${allTexts.length}`)

  if (allTexts.length === 0) {
    console.error('No target texts found')
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
  const tasks = batches.map((batchTexts, b) => () => {
    const brief = buildBrief(langName, course.target_lang, batchTexts)
    return runHaikuBatch(brief, b + 1, batches.length)
  })

  // 6. Run with concurrency limit
  const startTime = Date.now()
  const batchResults = await runWithConcurrency(tasks, CONCURRENCY)

  // 7. Collect all results
  const allResults = batchResults.flat().filter(r => r && r.original)
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
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
