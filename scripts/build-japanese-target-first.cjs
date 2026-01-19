#!/usr/bin/env node
/**
 * Build Japanese course using TRUE target-first approach
 * Seeds 1-50 from japanese-concept-first.md
 *
 * Philosophy: Start simple in Japanese space, sophistication emerges through combination
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const COURSE_CODE = 'jpn_for_eng'

// Target-first seeds from japanese-concept-first.md
// Each seed: Japanese first, then back-translation to English
const TARGET_FIRST_SEEDS = [
  // Phase 1: Core Identity & Copula (Seeds 1-10)
  {
    seed: 1,
    target: '私です',
    known: "It's me",
    legos: [
      { type: 'A', known: 'I/me', target: '私' },
      { type: 'A', known: 'am/is', target: 'です' }
    ]
  },
  {
    seed: 2,
    target: '何ですか',
    known: 'What is it?',
    legos: [
      { type: 'A', known: 'what', target: '何' },
      { type: 'M', known: 'is it?', target: 'ですか' }
    ]
  },
  {
    seed: 3,
    target: 'これは何ですか',
    known: 'What is this?',
    legos: [
      { type: 'A', known: 'this', target: 'これ' },
      { type: 'A', known: 'as for (topic)', target: 'は' }
    ]
  },
  {
    seed: 4,
    target: 'これは本です',
    known: 'This is a book',
    legos: [
      { type: 'A', known: 'book', target: '本' }
    ]
  },
  {
    seed: 5,
    target: '違います',
    known: "That's not right",
    legos: [
      { type: 'A', known: 'is different/wrong', target: '違います' }
    ]
  },
  {
    seed: 6,
    target: '私の本です',
    known: "It's my book",
    legos: [
      { type: 'A', known: "'s (possession)", target: 'の' }
    ]
  },
  {
    seed: 7,
    target: 'あなたの本ですか',
    known: 'Is it your book?',
    legos: [
      { type: 'A', known: 'you', target: 'あなた' }
    ]
  },
  {
    seed: 8,
    target: 'はい、私のです',
    known: "Yes, it's mine",
    legos: [
      { type: 'A', known: 'yes', target: 'はい' }
    ]
  },
  {
    seed: 9,
    target: 'いいえ、違います',
    known: "No, that's not right",
    legos: [
      { type: 'A', known: 'no', target: 'いいえ' }
    ]
  },
  {
    seed: 10,
    target: '彼の本です',
    known: "It's his book",
    legos: [
      { type: 'A', known: 'he/him', target: '彼' }
    ]
  },

  // Phase 2: Basic Verbs - Present Actions (Seeds 11-25)
  {
    seed: 11,
    target: '話します',
    known: 'I speak',
    legos: [
      { type: 'A', known: 'speak', target: '話します' }
    ]
  },
  {
    seed: 12,
    target: '日本語を話します',
    known: 'I speak Japanese',
    legos: [
      { type: 'A', known: 'Japanese language', target: '日本語' },
      { type: 'A', known: '(object marker)', target: 'を' }
    ]
  },
  {
    seed: 13,
    target: '少し話します',
    known: 'I speak a little',
    legos: [
      { type: 'A', known: 'a little', target: '少し' }
    ]
  },
  {
    seed: 14,
    target: '分かります',
    known: 'I understand',
    legos: [
      { type: 'A', known: 'understand', target: '分かります' }
    ]
  },
  {
    seed: 15,
    target: '分かりません',
    known: "I don't understand",
    legos: [
      { type: 'M', known: "don't understand", target: '分かりません' }
    ]
  },
  {
    seed: 16,
    target: '食べます',
    known: 'I eat',
    legos: [
      { type: 'A', known: 'eat', target: '食べます' }
    ]
  },
  {
    seed: 17,
    target: '飲みます',
    known: 'I drink',
    legos: [
      { type: 'A', known: 'drink', target: '飲みます' }
    ]
  },
  {
    seed: 18,
    target: '行きます',
    known: 'I go',
    legos: [
      { type: 'A', known: 'go', target: '行きます' }
    ]
  },
  {
    seed: 19,
    target: '日本に行きます',
    known: 'I go to Japan',
    legos: [
      { type: 'A', known: 'Japan', target: '日本' },
      { type: 'A', known: 'to (direction)', target: 'に' }
    ]
  },
  {
    seed: 20,
    target: '来ます',
    known: 'I come',
    legos: [
      { type: 'A', known: 'come', target: '来ます' }
    ]
  },
  {
    seed: 21,
    target: '見ます',
    known: 'I see',
    legos: [
      { type: 'A', known: 'see/watch', target: '見ます' }
    ]
  },
  {
    seed: 22,
    target: '聞きます',
    known: 'I listen',
    legos: [
      { type: 'A', known: 'listen/hear', target: '聞きます' }
    ]
  },
  {
    seed: 23,
    target: '読みます',
    known: 'I read',
    legos: [
      { type: 'A', known: 'read', target: '読みます' }
    ]
  },
  {
    seed: 24,
    target: '書きます',
    known: 'I write',
    legos: [
      { type: 'A', known: 'write', target: '書きます' }
    ]
  },
  {
    seed: 25,
    target: '勉強します',
    known: 'I study',
    legos: [
      { type: 'M', known: 'study', target: '勉強します' }
    ]
  },

  // Phase 3: Desire & Intent (Seeds 26-35)
  {
    seed: 26,
    target: '食べたいです',
    known: 'I want to eat',
    legos: [
      { type: 'M', known: 'want to eat', target: '食べたいです' }
    ]
  },
  {
    seed: 27,
    target: '日本語を話したいです',
    known: 'I want to speak Japanese',
    legos: [
      { type: 'M', known: 'want to speak', target: '話したいです' }
    ]
  },
  {
    seed: 28,
    target: '日本に行きたいです',
    known: 'I want to go to Japan',
    legos: [
      { type: 'M', known: 'want to go', target: '行きたいです' }
    ]
  },
  {
    seed: 29,
    target: '日本語を勉強したいです',
    known: 'I want to study Japanese',
    legos: [
      { type: 'M', known: 'want to study', target: '勉強したいです' }
    ]
  },
  {
    seed: 30,
    target: '話してみます',
    known: "I'll try speaking",
    legos: [
      { type: 'M', known: 'try to speak', target: '話してみます' }
    ]
  },
  {
    seed: 31,
    target: '日本語が話せます',
    known: 'I can speak Japanese',
    legos: [
      { type: 'M', known: 'can speak', target: '話せます' }
    ]
  },
  {
    seed: 32,
    target: '読めません',
    known: 'I cannot read',
    legos: [
      { type: 'M', known: 'cannot read', target: '読めません' }
    ]
  },
  {
    seed: 33,
    target: '行かなければなりません',
    known: 'I must go',
    legos: [
      { type: 'M', known: 'must go', target: '行かなければなりません' }
    ]
  },
  {
    seed: 34,
    target: '行かなくてもいいです',
    known: "You don't have to go",
    legos: [
      { type: 'M', known: "don't have to go", target: '行かなくてもいいです' }
    ]
  },
  {
    seed: 35,
    target: '教えてください',
    known: 'Please teach me',
    legos: [
      { type: 'A', known: 'teach', target: '教えます' },
      { type: 'M', known: 'please (do)', target: 'てください' }
    ]
  },

  // Phase 4: Time & Location (Seeds 36-50)
  {
    seed: 36,
    target: '今、食べます',
    known: "I'm eating now",
    legos: [
      { type: 'A', known: 'now', target: '今' }
    ]
  },
  {
    seed: 37,
    target: '今日、行きます',
    known: 'I go today',
    legos: [
      { type: 'A', known: 'today', target: '今日' }
    ]
  },
  {
    seed: 38,
    target: '明日、来ます',
    known: 'I come tomorrow',
    legos: [
      { type: 'A', known: 'tomorrow', target: '明日' }
    ]
  },
  {
    seed: 39,
    target: 'ここで食べます',
    known: 'I eat here',
    legos: [
      { type: 'A', known: 'here', target: 'ここ' },
      { type: 'A', known: 'at (location)', target: 'で' }
    ]
  },
  {
    seed: 40,
    target: 'そこに行きます',
    known: 'I go there',
    legos: [
      { type: 'A', known: 'there', target: 'そこ' }
    ]
  },
  {
    seed: 41,
    target: '昨日、見ました',
    known: 'I saw it yesterday',
    legos: [
      { type: 'A', known: 'yesterday', target: '昨日' },
      { type: 'M', known: 'saw', target: '見ました' }
    ]
  },
  {
    seed: 42,
    target: '食べました',
    known: 'I ate',
    legos: [
      { type: 'M', known: 'ate', target: '食べました' }
    ]
  },
  {
    seed: 43,
    target: '行きませんでした',
    known: "I didn't go",
    legos: [
      { type: 'M', known: "didn't go", target: '行きませんでした' }
    ]
  },
  {
    seed: 44,
    target: 'いつも朝ご飯を食べます',
    known: 'I always eat breakfast',
    legos: [
      { type: 'A', known: 'always', target: 'いつも' },
      { type: 'A', known: 'breakfast', target: '朝ご飯' }
    ]
  },
  {
    seed: 45,
    target: '時々日本語を勉強します',
    known: 'I sometimes study Japanese',
    legos: [
      { type: 'A', known: 'sometimes', target: '時々' }
    ]
  },
  {
    seed: 46,
    target: '毎日運動します',
    known: 'I exercise every day',
    legos: [
      { type: 'A', known: 'every day', target: '毎日' },
      { type: 'M', known: 'exercise', target: '運動します' }
    ]
  },
  {
    seed: 47,
    target: '朝、散歩します',
    known: 'I walk in the morning',
    legos: [
      { type: 'A', known: 'morning', target: '朝' },
      { type: 'M', known: 'walk/stroll', target: '散歩します' }
    ]
  },
  {
    seed: 48,
    target: '夜、音楽を聞きます',
    known: 'I listen to music at night',
    legos: [
      { type: 'A', known: 'night', target: '夜' },
      { type: 'A', known: 'music', target: '音楽' }
    ]
  },
  {
    seed: 49,
    target: '週末に友達に会います',
    known: 'I meet friends on the weekend',
    legos: [
      { type: 'A', known: 'weekend', target: '週末' },
      { type: 'A', known: 'friend', target: '友達' },
      { type: 'A', known: 'meet', target: '会います' }
    ]
  },
  {
    seed: 50,
    target: '来週、日本に行きます',
    known: 'I go to Japan next week',
    legos: [
      { type: 'A', known: 'next week', target: '来週' }
    ]
  }
]

// Track all introduced LEGOs for phrase generation
const introducedLegos = new Map() // target -> { known, type, seedIntroduced }

async function buildCourse() {
  console.log('Building Japanese course with TRUE target-first approach')
  console.log('Philosophy: Start simple, sophistication emerges through combination\n')
  console.log('='.repeat(60))

  let totalLegos = 0
  let totalPhrases = 0
  let legoIdx = 0

  for (const seed of TARGET_FIRST_SEEDS) {
    console.log(`\nSeed ${seed.seed}: ${seed.target}`)
    console.log(`  Back-translation: "${seed.known}"`)

    // Update seed with target_text (Japanese) and known_text (back-translation)
    const { error: seedErr } = await supabase
      .from('course_seeds')
      .update({
        target_text: seed.target,
        known_text: seed.known
      })
      .eq('course_code', COURSE_CODE)
      .eq('seed_number', seed.seed)

    if (seedErr) {
      console.error(`  Error updating seed: ${seedErr.message}`)
      continue
    }

    // Insert LEGOs
    for (const lego of seed.legos) {
      legoIdx++

      // Check if this LEGO already exists (same target)
      const existing = introducedLegos.get(lego.target)
      if (existing) {
        console.log(`  LEGO: "${lego.target}" (${lego.known}) - already introduced in seed ${existing.seedIntroduced}`)
        continue
      }

      // New LEGO
      introducedLegos.set(lego.target, {
        known: lego.known,
        type: lego.type,
        seedIntroduced: seed.seed
      })

      const { error: legoErr } = await supabase
        .from('course_legos')
        .insert({
          course_code: COURSE_CODE,
          seed_number: seed.seed,
          lego_index: legoIdx,
          type: lego.type,
          known_text: lego.known,
          target_text: lego.target,
          is_new: true
        })

      if (legoErr) {
        console.error(`  Error inserting LEGO: ${legoErr.message}`)
        continue
      }

      console.log(`  NEW LEGO ${legoIdx} [${lego.type}]: "${lego.known}" → "${lego.target}"`)
      totalLegos++

      // Generate practice phrases using only introduced vocabulary
      const phrases = generatePhrases(lego, seed.seed)

      for (let pi = 0; pi < phrases.length; pi++) {
        const phrase = phrases[pi]
        const { error: phraseErr } = await supabase
          .from('course_practice_phrases')
          .insert({
            course_code: COURSE_CODE,
            seed_number: seed.seed,
            lego_index: legoIdx,
            position: pi + 1,
            known_text: phrase.known,
            target_text: phrase.target
          })

        if (phraseErr) {
          console.error(`    Error inserting phrase: ${phraseErr.message}`)
          continue
        }
        totalPhrases++
      }
      console.log(`    Generated ${phrases.length} phrases`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('BUILD COMPLETE')
  console.log(`Seeds processed: ${TARGET_FIRST_SEEDS.length}`)
  console.log(`Total LEGOs: ${totalLegos} (${(totalLegos/TARGET_FIRST_SEEDS.length).toFixed(2)}/seed)`)
  console.log(`Total phrases: ${totalPhrases} (${(totalPhrases/totalLegos).toFixed(1)}/LEGO)`)
  console.log('\nIntroduced vocabulary:')

  // Show vocabulary summary
  const byPhase = { 1: [], 2: [], 3: [], 4: [] }
  for (const [target, info] of introducedLegos) {
    const phase = info.seedIntroduced <= 10 ? 1 : info.seedIntroduced <= 25 ? 2 : info.seedIntroduced <= 35 ? 3 : 4
    byPhase[phase].push(`${target} (${info.known})`)
  }

  console.log(`\nPhase 1 (Identity): ${byPhase[1].length} LEGOs`)
  console.log(`Phase 2 (Verbs): ${byPhase[2].length} LEGOs`)
  console.log(`Phase 3 (Desire): ${byPhase[3].length} LEGOs`)
  console.log(`Phase 4 (Time): ${byPhase[4].length} LEGOs`)
}

function generatePhrases(lego, seedNumber) {
  const phrases = []
  const available = Array.from(introducedLegos.entries())

  // Always include the LEGO itself as a phrase
  phrases.push({
    known: lego.known,
    target: lego.target,
    type: 'debut'
  })

  // For early seeds, generate simple combinations
  // Build up: short → longer combinations using only introduced vocabulary

  // Find compatible combinations based on what's been introduced
  const particles = ['は', 'の', 'を', 'に', 'で'].filter(p => introducedLegos.has(p))
  const nouns = available.filter(([t, i]) =>
    !['は', 'の', 'を', 'に', 'で', 'です', 'ですか'].includes(t) &&
    i.type === 'A' &&
    !t.includes('ます') && !t.includes('たい')
  )
  const verbs = available.filter(([t, i]) => t.includes('ます') || t.includes('たい'))

  // Generate contextual combinations
  if (lego.target === 'です') {
    // Copula combinations
    if (introducedLegos.has('私')) {
      phrases.push({ known: "It's me", target: '私です', type: 'combination' })
    }
  }

  if (lego.target === 'は' && introducedLegos.has('これ') && introducedLegos.has('です')) {
    phrases.push({ known: 'As for this...', target: 'これは', type: 'combination' })
  }

  if (lego.target === 'の') {
    if (introducedLegos.has('私')) {
      phrases.push({ known: 'my', target: '私の', type: 'combination' })
    }
    if (introducedLegos.has('あなた')) {
      phrases.push({ known: 'your', target: 'あなたの', type: 'combination' })
    }
  }

  if (lego.target === 'を' && verbs.length > 0) {
    // Object marker + verb combinations
    if (introducedLegos.has('日本語')) {
      const verb = verbs[0]
      phrases.push({
        known: `Japanese (object)`,
        target: '日本語を',
        type: 'combination'
      })
    }
  }

  if (lego.target.includes('ます') && !lego.target.includes('たい')) {
    // Verb - add subject/object combinations
    if (introducedLegos.has('私') && introducedLegos.has('は')) {
      phrases.push({
        known: `I ${lego.known}`,
        target: `私は${lego.target}`,
        type: 'combination'
      })
    }
  }

  if (lego.target.includes('たい')) {
    // Want to - add time/place modifiers if available
    if (introducedLegos.has('今')) {
      phrases.push({
        known: `I ${lego.known} now`,
        target: `今、${lego.target}`,
        type: 'combination'
      })
    }
  }

  // Time words get verb combinations
  if (['今', '今日', '明日', '昨日'].includes(lego.target)) {
    for (const [vTarget, vInfo] of verbs.slice(0, 2)) {
      phrases.push({
        known: `${lego.known}, ${vInfo.known}`,
        target: `${lego.target}、${vTarget}`,
        type: 'combination'
      })
    }
  }

  // Ensure minimum phrases (pad with variations if needed)
  while (phrases.length < 3 && seedNumber > 5) {
    // Add a simple echo phrase
    phrases.push({
      known: lego.known,
      target: lego.target,
      type: 'echo'
    })
  }

  return phrases.slice(0, 8) // Cap at 8 phrases per LEGO for now
}

buildCourse().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
