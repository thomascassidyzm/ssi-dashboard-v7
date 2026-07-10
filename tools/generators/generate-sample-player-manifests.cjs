#!/usr/bin/env node
/**
 * generate-sample-player-manifests.cjs — static manifests for the www
 * <ssi-lesson-player> marketing demo element.
 *
 * Replaces the April-2026 tool that scraped the Production API on :3470.
 * This one wraps the CONVERGED learner-parity generator
 * (services/learning-script-generator.cjs, learnerView mode) and maps its
 * output to the exact manifest schema the deployed player consumes
 * (verified against https://www.dev.saysomethingin.com/lesson-player/manifests/en-es.json,
 * generated 2026-04-22).
 *
 * Schema (per cycle):
 *   { type, round_number, lego_id, known_text, target_text,
 *     target1_audio_id, target2_audio_id,
 *     presentation_audio_id (intro) | known_audio_id (all other types),
 *     belt_progress }                      // cycle_index / (total - 1)
 *
 * Divergence from the April manifests, by design: NO component_intro /
 * component_practice cycles — the learner app never plays them (components
 * are visual ghost tiles only) and the converged generator does not emit
 * them. The player handles this fine: it plays whatever cycles exist.
 *
 * Usage:
 *   node tools/generators/generate-sample-player-manifests.cjs \
 *     --courses eng_for_hin,eng_for_ben --max-legos 25 --out /path/to/outdir
 */

require('dotenv').config({ quiet: true })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { generateLearningScript } = require('../../services/learning-script-generator.cjs')

const SECONDS_PER_CYCLE = 11 // matches the April tool's approximate_minutes maths

const LANG_NAMES = {
  eng: 'English', spa: 'Spanish', fra: 'French', deu: 'German', ita: 'Italian',
  por: 'Portuguese', zho: 'Chinese', jpn: 'Japanese', ara: 'Arabic', kor: 'Korean',
  cym: 'Welsh', hin: 'Hindi', ben: 'Bengali', guj: 'Gujarati', pan: 'Punjabi',
  tam: 'Tamil', urd: 'Urdu', mar: 'Marathi', tel: 'Telugu', kan: 'Kannada', sin: 'Sinhala',
}

const TARGET_FLAGS = {
  eng: '🇬🇧', spa: '🇪🇸', fra: '🇫🇷', deu: '🇩🇪', ita: '🇮🇹', por: '🇵🇹',
  zho: '🇨🇳', jpn: '🇯🇵', ara: '🇸🇦', kor: '🇰🇷',
}

function parseArgs(argv) {
  const args = { maxLegos: 25, out: null, courses: [] }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--courses') args.courses = argv[++i].split(',').map(s => s.trim()).filter(Boolean)
    else if (argv[i] === '--max-legos') args.maxLegos = parseInt(argv[++i], 10)
    else if (argv[i] === '--out') args.out = argv[++i]
    else throw new Error(`Unknown arg: ${argv[i]}`)
  }
  if (!args.courses.length || !args.out) {
    console.error('Usage: generate-sample-player-manifests.cjs --courses a,b,c --out DIR [--max-legos 25]')
    process.exit(1)
  }
  return args
}

function itemToCycle(item) {
  const base = {
    type: item.type,
    round_number: item.roundNumber,
    lego_id: item.legoId,
    known_text: item.known_text,
    target_text: item.target_text,
    target1_audio_id: item.target1_audio_uuid || null,
    target2_audio_id: item.target2_audio_uuid || null,
  }
  if (item.type === 'intro') {
    base.presentation_audio_id = item.presentation_audio ? item.presentation_audio.id : null
  } else {
    base.known_audio_id = item.known_audio_uuid || null
  }
  return base
}

function cyclePlayable(cycle) {
  // A sample cycle must have both target voices; non-intro also needs the
  // known prompt; intro needs its presentation take (learnerView already
  // substitutes known audio when presentation is missing).
  if (!cycle.target1_audio_id || !cycle.target2_audio_id) return false
  if (cycle.type === 'intro') return !!cycle.presentation_audio_id
  return !!cycle.known_audio_id
}

async function loadCourseMeta(supabase, courseCode) {
  const { data, error } = await supabase
    .from('courses')
    .select('course_code, display_name, known_lang, target_lang')
    .eq('course_code', courseCode)
    .single()
  if (error) throw new Error(`courses row for ${courseCode}: ${error.message}`)
  return data
}

async function loadFirstSeed(supabase, courseCode) {
  const { data, error } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', courseCode)
    .order('seed_number', { ascending: true })
    .limit(1)
  if (error) throw new Error(`course_seeds for ${courseCode}: ${error.message}`)
  return data && data[0] ? { known_text: data[0].known_text, target_text: data[0].target_text } : null
}

async function buildManifest(supabase, courseCode, maxLegos) {
  const meta = await loadCourseMeta(supabase, courseCode)
  const seed = await loadFirstSeed(supabase, courseCode)
  const script = await generateLearningScript(supabase, courseCode, maxLegos, 0, { learnerView: true })

  const cycles = script.allItems.map(itemToCycle).filter(cyclePlayable)
  if (!cycles.length) throw new Error(`${courseCode}: generator produced 0 playable cycles`)

  const denom = Math.max(1, cycles.length - 1)
  cycles.forEach((c, i) => { c.belt_progress = i / denom })

  return {
    course_code: courseCode,
    known_lang: meta.known_lang,
    target_lang: meta.target_lang,
    known_name: LANG_NAMES[meta.known_lang] || meta.known_lang,
    target_name: LANG_NAMES[meta.target_lang] || meta.target_lang,
    flag_emoji: TARGET_FLAGS[meta.target_lang] || '🏳️',
    display_name: meta.display_name,
    seed,
    stats: {
      source_total_items: script.allItems.length,
      source_rounds: script.rounds.length,
      playable_cycles: cycles.length,
      approximate_duration_seconds: cycles.length * SECONDS_PER_CYCLE,
    },
    cycles,
  }
}

async function main() {
  const args = parseArgs(process.argv)
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  fs.mkdirSync(args.out, { recursive: true })

  const index = {
    generated_at: new Date().toISOString(),
    source: 'services/learning-script-generator.cjs (learnerView)',
    max_legos_per_course: args.maxLegos,
    courses: [],
  }

  for (const code of args.courses) {
    process.stdout.write(`${code} ... `)
    const manifest = await buildManifest(supabase, code, args.maxLegos)
    const file = path.join(args.out, `${code}.json`)
    fs.writeFileSync(file, JSON.stringify(manifest, null, 2))
    index.courses.push({
      code,
      name: manifest.known_name, // the differentiator on an all-English landing page
      flag: manifest.flag_emoji,
      cycle_count: manifest.cycles.length,
      approximate_minutes: Math.round(manifest.stats.approximate_duration_seconds / 60),
    })
    console.log(`${manifest.cycles.length} cycles (${manifest.stats.source_total_items} source items, ${manifest.stats.source_rounds} rounds)`)
  }

  fs.writeFileSync(path.join(args.out, 'index.json'), JSON.stringify(index, null, 2))
  console.log(`\nWrote ${index.courses.length} manifests + index.json to ${args.out}`)
}

main().catch(err => { console.error(err); process.exit(1) })
