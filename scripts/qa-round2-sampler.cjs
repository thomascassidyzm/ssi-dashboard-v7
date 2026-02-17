#!/usr/bin/env node
/**
 * Round 2 QA Sampler - USE phrases only
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

async function sampleCourse(courseCode) {
  const isEngForX = courseCode.startsWith('eng_for_')

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

  // Shuffle and take 50
  const shuffled = usePhrases.sort(() => Math.random() - 0.5)
  const sample = shuffled.slice(0, 50)

  const output = {
    course_code: courseCode,
    is_eng_for_x: isEngForX,
    round: 2,
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

  const outPath = path.join(__dirname, 'qa-comparison', courseCode + '-sample-r2.json')
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2))
  return { course: courseCode, sampled: sample.length, available: usePhrases.length }
}

async function main() {
  console.log('Generating Round 2 samples (USE phrases only)...\n')

  for (const course of courses) {
    const result = await sampleCourse(course)
    if (result) {
      console.log(result.course.padEnd(18) + ': ' + result.sampled + ' sampled from ' + result.available + ' USE phrases')
    }
  }

  console.log('\nDone! Files saved as *-sample-r2.json')
}

main()
