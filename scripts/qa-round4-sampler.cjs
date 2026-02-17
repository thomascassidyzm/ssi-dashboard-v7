#!/usr/bin/env node
/**
 * Round 4 QA Sampler - Fresh random sample of USE phrases from ENTIRE course
 * Independent verification round to resolve R1-R3 inconsistencies
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const courses = [
  'cym_s_for_eng', 'cym_n_for_eng', 'eng_for_jpn', 'eng_for_por', 'jpn_for_eng',
  'nld_for_eng', 'eng_for_spa', 'zho_for_eng', 'eng_for_deu', 'eng_for_fra',
  'kor_for_eng', 'ita_for_eng', 'eng_for_ara', 'deu_for_eng', 'fra_for_eng',
  'por_for_eng', 'ara_for_eng', 'spa_for_eng', 'eng_for_zho'
]

function countSyllables(text) {
  if (!text) return 0
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/)
  let total = 0
  for (const word of words) {
    if (!word) continue
    const matches = word.match(/[aeiouy]+/g)
    let count = matches ? matches.length : 1
    if (word.endsWith('e') && count > 1) count--
    total += Math.max(1, count)
  }
  return total
}

// Seeded random for reproducibility - use different seed than R2
function seededRandom(seed) {
  let x = Math.sin(seed++) * 10000
  return x - Math.floor(x)
}

function shuffleWithSeed(array, seed) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

async function sampleCourse(courseCode) {
  const isEngForX = courseCode.startsWith('eng_for_')

  // Query ALL seeds (full course)
  const { data } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text, phrase_role')
    .eq('course_code', courseCode)

  if (!data || data.length === 0) return null

  // For eng_for_X, count syllables in target (English)
  // For X_for_eng, count syllables in known (English)
  const englishField = isEngForX ? 'target_text' : 'known_text'

  // Filter for USE phrases only (≥5 syllables)
  const usePhrases = data.filter(p => countSyllables(p[englishField]) >= 5)

  // Use a DIFFERENT seed than R2 (R2 used 42, we'll use 2024)
  const shuffled = shuffleWithSeed(usePhrases, 2024)
  const sample = shuffled.slice(0, 50)

  const output = {
    course_code: courseCode,
    is_eng_for_x: isEngForX,
    round: 4,
    seed_range: 'all',
    description: 'Fresh random sample from entire course - independent verification round',
    total_use_phrases: usePhrases.length,
    sample_size: sample.length,
    phrases: sample.map((p, idx) => ({
      idx: idx + 1,
      id: p.id,
      seed: p.seed_number,
      lego: p.lego_index,
      syllables: countSyllables(p[isEngForX ? 'target_text' : 'known_text']),
      english: isEngForX ? p.target_text : p.known_text,
      other: isEngForX ? p.known_text : p.target_text,
      qa_score: null
    }))
  }

  const outPath = path.join(__dirname, 'qa-comparison', courseCode + '-sample-r4.json')
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2))
  return { course: courseCode, sampled: sample.length, available: usePhrases.length }
}

async function main() {
  console.log('Generating Round 4 samples (fresh random sample from entire course)...\n')

  for (const course of courses) {
    const result = await sampleCourse(course)
    if (result) {
      console.log(result.course.padEnd(18) + ': ' + result.sampled + ' sampled from ' + result.available + ' USE phrases')
    }
  }

  console.log('\nDone! Files saved as *-sample-r4.json')
}

main()
