#!/usr/bin/env node
/**
 * Build Japanese Test Course (jpn_for_eng_test)
 *
 * A paradigm-testing course using target-first philosophy:
 * - Start from what's SIMPLE in Japanese
 * - ONE new concept per seed
 * - Massive recombination
 * - Welsh-style lean decomposition
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const COURSE_CODE = 'jpn_for_eng_test'

// =============================================================================
// SEED DEFINITIONS
// =============================================================================

const seeds = [
  // BLOCK 1: Foundation - これ/それ + は + です
  {
    seed_number: 1,
    known_text: "This is Japanese.",
    target_text: "これは日本語です。",
    legos: [
      { type: 'M', known: 'this is', target: 'これは' },
      { type: 'A', known: 'Japanese', target: '日本語' },
      { type: 'A', known: 'is', target: 'です' }
    ]
  },
  {
    seed_number: 2,
    known_text: "What is this?",
    target_text: "これは何ですか。",
    legos: [
      { type: 'A', known: 'what', target: '何' },
      { type: 'A', known: '(question)', target: 'か' }
    ]
  },
  {
    seed_number: 3,
    known_text: "Is that Japanese?",
    target_text: "それは日本語ですか。",
    legos: [
      { type: 'M', known: 'that is', target: 'それは' }
    ]
  },
  {
    seed_number: 4,
    known_text: "Yes, that's right.",
    target_text: "はい、そうです。",
    legos: [
      { type: 'A', known: 'yes', target: 'はい' },
      { type: 'M', known: "that's right", target: 'そうです' }
    ]
  },
  {
    seed_number: 5,
    known_text: "No, it's different.",
    target_text: "いいえ、違います。",
    legos: [
      { type: 'A', known: 'no', target: 'いいえ' },
      { type: 'M', known: "it's different", target: '違います' }
    ]
  },

  // BLOCK 2: Describing Quality
  {
    seed_number: 6,
    known_text: "This is good.",
    target_text: "これはいいです。",
    legos: [
      { type: 'A', known: 'good', target: 'いい' }
    ]
  },
  {
    seed_number: 7,
    known_text: "Is that good?",
    target_text: "それはいいですか。",
    legos: [
      { type: 'M', known: 'Is that good?', target: 'それはいいですか' }
    ]
  },
  {
    seed_number: 8,
    known_text: "This is not good.",
    target_text: "これはよくないです。",
    legos: [
      { type: 'M', known: 'not good', target: 'よくないです' }
    ]
  },
  {
    seed_number: 9,
    known_text: "That is very good.",
    target_text: "それはとてもいいです。",
    legos: [
      { type: 'A', known: 'very', target: 'とても' }
    ]
  },
  {
    seed_number: 10,
    known_text: "This is interesting.",
    target_text: "これは面白いです。",
    legos: [
      { type: 'A', known: 'interesting', target: '面白い' }
    ]
  },

  // BLOCK 3: Speaking & Learning
  {
    seed_number: 11,
    known_text: "I speak Japanese.",
    target_text: "日本語を話します。",
    legos: [
      { type: 'A', known: '(object marker)', target: 'を' },
      { type: 'M', known: 'I speak', target: '話します' }
    ]
  },
  {
    seed_number: 12,
    known_text: "Do you speak Japanese?",
    target_text: "日本語を話しますか。",
    legos: [
      { type: 'M', known: 'Do you speak Japanese?', target: '日本語を話しますか' }
    ]
  },
  {
    seed_number: 13,
    known_text: "Yes, a little.",
    target_text: "はい、少し。",
    legos: [
      { type: 'A', known: 'a little', target: '少し' }
    ]
  },
  {
    seed_number: 14,
    known_text: "I don't speak Japanese.",
    target_text: "日本語を話しません。",
    legos: [
      { type: 'M', known: "I don't speak", target: '話しません' }
    ]
  },
  {
    seed_number: 15,
    known_text: "I am learning Japanese.",
    target_text: "日本語を勉強しています。",
    legos: [
      { type: 'A', known: 'study/learning', target: '勉強' },
      { type: 'M', known: 'I am doing', target: 'しています' }
    ]
  },

  // BLOCK 4: Understanding & Difficulty
  {
    seed_number: 16,
    known_text: "I understand.",
    target_text: "わかります。",
    legos: [
      { type: 'M', known: 'I understand', target: 'わかります' }
    ]
  },
  {
    seed_number: 17,
    known_text: "I don't understand.",
    target_text: "わかりません。",
    legos: [
      { type: 'M', known: "I don't understand", target: 'わかりません' }
    ]
  },
  {
    seed_number: 18,
    known_text: "Do you understand?",
    target_text: "わかりますか。",
    legos: [
      { type: 'M', known: 'Do you understand?', target: 'わかりますか' }
    ]
  },
  {
    seed_number: 19,
    known_text: "This is difficult.",
    target_text: "これは難しいです。",
    legos: [
      { type: 'A', known: 'difficult', target: '難しい' }
    ]
  },
  {
    seed_number: 20,
    known_text: "Japanese is not difficult.",
    target_text: "日本語は難しくないです。",
    legos: [
      { type: 'M', known: 'not difficult', target: '難しくないです' }
    ]
  },

  // BLOCK 5: Likes & Wants
  {
    seed_number: 21,
    known_text: "I like this.",
    target_text: "これが好きです。",
    legos: [
      { type: 'A', known: '(subject marker)', target: 'が' },
      { type: 'M', known: 'I like', target: '好きです' }
    ]
  },
  {
    seed_number: 22,
    known_text: "Do you like Japanese?",
    target_text: "日本語が好きですか。",
    legos: [
      { type: 'M', known: 'Do you like Japanese?', target: '日本語が好きですか' }
    ]
  },
  {
    seed_number: 23,
    known_text: "I don't like that.",
    target_text: "それは好きじゃないです。",
    legos: [
      { type: 'M', known: "I don't like", target: '好きじゃないです' }
    ]
  },
  {
    seed_number: 24,
    known_text: "I want this.",
    target_text: "これが欲しいです。",
    legos: [
      { type: 'M', known: 'I want', target: '欲しいです' }
    ]
  },
  {
    seed_number: 25,
    known_text: "Do you want that?",
    target_text: "それが欲しいですか。",
    legos: [
      { type: 'M', known: 'Do you want that?', target: 'それが欲しいですか' }
    ]
  },

  // BLOCK 6: Politeness & Requests
  {
    seed_number: 26,
    known_text: "Thank you.",
    target_text: "ありがとうございます。",
    legos: [
      { type: 'M', known: 'thank you', target: 'ありがとうございます' }
    ]
  },
  {
    seed_number: 27,
    known_text: "Please.",
    target_text: "お願いします。",
    legos: [
      { type: 'M', known: 'please', target: 'お願いします' }
    ]
  },
  {
    seed_number: 28,
    known_text: "This, please.",
    target_text: "これをください。",
    legos: [
      { type: 'M', known: 'please give me', target: 'ください' }
    ]
  },
  {
    seed_number: 29,
    known_text: "Once more, please.",
    target_text: "もう一度お願いします。",
    legos: [
      { type: 'M', known: 'once more', target: 'もう一度' }
    ]
  },
  {
    seed_number: 30,
    known_text: "Slowly, please.",
    target_text: "ゆっくりお願いします。",
    legos: [
      { type: 'A', known: 'slowly', target: 'ゆっくり' }
    ]
  }
]

// =============================================================================
// PHRASE GENERATION
// =============================================================================

/**
 * Generate practice phrases for a LEGO based on available vocabulary
 * Uses only vocabulary introduced up to this point
 */
function generatePhrases(seed, lego, legoIndex, allPreviousLegos) {
  const phrases = []

  // Always include the LEGO itself
  phrases.push({
    known_text: lego.known,
    target_text: lego.target
  })

  // Build combinations based on what we have available
  const vocab = {
    demonstratives: [],
    particles: [],
    nouns: [],
    verbs: [],
    adjectives: [],
    adverbs: [],
    expressions: []
  }

  // Collect vocabulary from previous LEGOs
  for (const prev of allPreviousLegos) {
    categorizeVocab(prev, vocab)
  }

  // Add current LEGO
  categorizeVocab(lego, vocab)

  // Generate SHORT phrases (2-3 elements)
  // Generate MEDIUM phrases (3-4 elements)
  // Generate LONG phrases (full sentences)

  // For simplicity, generate pattern-based phrases
  const patterns = generatePatternPhrases(lego, vocab, seed.seed_number)
  phrases.push(...patterns)

  return phrases.slice(0, 12) // Max 12 phrases per LEGO
}

function categorizeVocab(lego, vocab) {
  const known = lego.known.toLowerCase()
  const target = lego.target

  if (known.includes('this') || target === 'これは' || target === 'それは') {
    vocab.demonstratives.push({ known: lego.known, target: lego.target })
  } else if (known.includes('question') || target === 'か' || target === 'を' || target === 'が') {
    vocab.particles.push({ known: lego.known, target: lego.target })
  } else if (known === 'japanese' || target === '日本語' || target === '勉強') {
    vocab.nouns.push({ known: lego.known, target: lego.target })
  } else if (known.includes('speak') || known.includes('understand') || known.includes('like') || known.includes('want')) {
    vocab.verbs.push({ known: lego.known, target: lego.target })
  } else if (known === 'good' || known === 'interesting' || known === 'difficult' || known.includes('not good') || known.includes('not difficult')) {
    vocab.adjectives.push({ known: lego.known, target: lego.target })
  } else if (known === 'very' || known === 'slowly' || known === 'a little') {
    vocab.adverbs.push({ known: lego.known, target: lego.target })
  } else {
    vocab.expressions.push({ known: lego.known, target: lego.target })
  }
}

function generatePatternPhrases(lego, vocab, seedNum) {
  const phrases = []
  const target = lego.target
  const known = lego.known

  // Generate contextual phrases based on what vocabulary is available

  // If we have demonstratives, combine with this LEGO's concept
  if (seedNum >= 3 && vocab.demonstratives.length > 0) {
    // これは + adjective/noun patterns
    if (target === 'いい' || target === '面白い' || target === '難しい') {
      phrases.push({ known_text: `this is ${known}`, target_text: `これは${target}です` })
      phrases.push({ known_text: `that is ${known}`, target_text: `それは${target}です` })
      phrases.push({ known_text: `is this ${known}?`, target_text: `これは${target}ですか` })
      phrases.push({ known_text: `is that ${known}?`, target_text: `それは${target}ですか` })
    }
  }

  // If we have とても (very), combine with adjectives
  if (seedNum >= 9) {
    if (target === 'いい') {
      phrases.push({ known_text: 'very good', target_text: 'とてもいい' })
    }
    if (target === '面白い') {
      phrases.push({ known_text: 'very interesting', target_text: 'とても面白い' })
      phrases.push({ known_text: 'this is very interesting', target_text: 'これはとても面白いです' })
    }
    if (target === '難しい') {
      phrases.push({ known_text: 'very difficult', target_text: 'とても難しい' })
      phrases.push({ known_text: 'Japanese is very difficult', target_text: '日本語はとても難しいです' })
    }
  }

  // Verb patterns with 日本語
  if (seedNum >= 11 && (known.includes('speak') || known.includes('understand'))) {
    if (target === '話します') {
      phrases.push({ known_text: 'I speak', target_text: '話します' })
      phrases.push({ known_text: 'I speak Japanese', target_text: '日本語を話します' })
    }
    if (target === '話しません') {
      phrases.push({ known_text: "don't speak", target_text: '話しません' })
      phrases.push({ known_text: "I don't speak Japanese", target_text: '日本語を話しません' })
    }
    if (target === 'わかります') {
      phrases.push({ known_text: 'understand', target_text: 'わかります' })
      phrases.push({ known_text: 'I understand Japanese', target_text: '日本語がわかります' })
    }
  }

  // 少し (a little) combinations
  if (seedNum >= 13) {
    if (target === '少し') {
      phrases.push({ known_text: 'a little', target_text: '少し' })
      phrases.push({ known_text: 'I speak a little', target_text: '少し話します' })
      phrases.push({ known_text: 'I speak a little Japanese', target_text: '日本語を少し話します' })
      phrases.push({ known_text: 'I understand a little', target_text: '少しわかります' })
    }
  }

  // Like/want patterns
  if (seedNum >= 21) {
    if (target === '好きです') {
      phrases.push({ known_text: 'like', target_text: '好きです' })
      phrases.push({ known_text: 'I like this', target_text: 'これが好きです' })
      phrases.push({ known_text: 'I like that', target_text: 'それが好きです' })
      phrases.push({ known_text: 'I like Japanese', target_text: '日本語が好きです' })
    }
    if (target === '欲しいです') {
      phrases.push({ known_text: 'want', target_text: '欲しいです' })
      phrases.push({ known_text: 'I want this', target_text: 'これが欲しいです' })
      phrases.push({ known_text: 'I want that', target_text: 'それが欲しいです' })
    }
  }

  // Request patterns
  if (seedNum >= 28) {
    if (target === 'ください') {
      phrases.push({ known_text: 'please give me', target_text: 'ください' })
      phrases.push({ known_text: 'this please', target_text: 'これをください' })
      phrases.push({ known_text: 'that please', target_text: 'それをください' })
    }
    if (target === 'もう一度') {
      phrases.push({ known_text: 'once more', target_text: 'もう一度' })
      phrases.push({ known_text: 'once more please', target_text: 'もう一度お願いします' })
    }
    if (target === 'ゆっくり') {
      phrases.push({ known_text: 'slowly', target_text: 'ゆっくり' })
      phrases.push({ known_text: 'slowly please', target_text: 'ゆっくりお願いします' })
    }
  }

  // Question forms
  if (seedNum >= 2) {
    if (target === 'か') {
      phrases.push({ known_text: 'what is this?', target_text: 'これは何ですか' })
      phrases.push({ known_text: 'what is that?', target_text: 'それは何ですか' })
    }
  }

  return phrases
}

// =============================================================================
// MAIN BUILD FUNCTION
// =============================================================================

async function buildCourse() {
  console.log(`\nBuilding Japanese Test Course: ${COURSE_CODE}`)
  console.log('='.repeat(60))

  // Check if course already exists
  const { data: existing } = await supabase
    .from('course_seeds')
    .select('seed_number')
    .eq('course_code', COURSE_CODE)

  if (existing && existing.length > 0) {
    console.log(`\n⚠️  Course ${COURSE_CODE} already has ${existing.length} seeds.`)
    console.log('Delete existing data first? Run with --wipe flag.')

    if (process.argv.includes('--wipe')) {
      console.log('\nWiping existing course data...')

      await supabase.from('course_practice_phrases').delete().eq('course_code', COURSE_CODE)
      await supabase.from('course_legos').delete().eq('course_code', COURSE_CODE)
      await supabase.from('course_seeds').delete().eq('course_code', COURSE_CODE)

      console.log('✓ Wiped existing data')
    } else {
      return
    }
  }

  // Track all LEGOs for phrase generation
  const allLegos = []

  let totalLegos = 0
  let totalPhrases = 0

  for (const seed of seeds) {
    console.log(`\nSeed ${seed.seed_number}: "${seed.known_text}"`)

    // Insert seed
    const { error: seedErr } = await supabase
      .from('course_seeds')
      .insert({
        course_code: COURSE_CODE,
        seed_number: seed.seed_number,
        known_text: seed.known_text,
        target_text: seed.target_text
      })

    if (seedErr) {
      console.error(`  Error inserting seed: ${seedErr.message}`)
      continue
    }

    // Insert LEGOs
    for (let i = 0; i < seed.legos.length; i++) {
      const lego = seed.legos[i]
      const legoIndex = i + 1

      // Check if this LEGO was seen before (is_new = false)
      const isNew = !allLegos.some(l =>
        l.known === lego.known && l.target === lego.target
      )

      const { error: legoErr } = await supabase
        .from('course_legos')
        .insert({
          course_code: COURSE_CODE,
          seed_number: seed.seed_number,
          lego_index: legoIndex,
          type: lego.type,
          known_text: lego.known,
          target_text: lego.target,
          is_new: isNew
        })

      if (legoErr) {
        console.error(`  Error inserting LEGO: ${legoErr.message}`)
        continue
      }

      totalLegos++

      // Generate phrases only for NEW LEGOs
      if (isNew) {
        const phrases = generatePhrases(seed, lego, legoIndex, allLegos)

        for (let p = 0; p < phrases.length; p++) {
          const phrase = phrases[p]
          const wordCount = phrase.known_text.split(/\s+/).length
          // Count LEGOs in this phrase (approximate by counting target elements)
          const legoCount = phrase.target_text.split(/[\s、。？]/).filter(s => s.length > 0).length
          const { error: phraseErr } = await supabase
            .from('course_practice_phrases')
            .insert({
              course_code: COURSE_CODE,
              seed_number: seed.seed_number,
              lego_index: legoIndex,
              position: p + 1,
              word_count: wordCount,
              lego_count: Math.max(1, legoCount),
              known_text: phrase.known_text,
              target_text: phrase.target_text
            })

          if (phraseErr) {
            console.error(`  Error inserting phrase: ${phraseErr.message}`)
          } else {
            totalPhrases++
          }
        }

        console.log(`  L${legoIndex}: "${lego.known}" → "${lego.target}" (NEW, ${phrases.length} phrases)`)
      } else {
        console.log(`  L${legoIndex}: "${lego.known}" → "${lego.target}" (repeat)`)
      }

      // Track this LEGO
      allLegos.push(lego)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('BUILD COMPLETE')
  console.log('='.repeat(60))
  console.log(`Seeds: ${seeds.length}`)
  console.log(`LEGOs: ${totalLegos} (avg ${(totalLegos / seeds.length).toFixed(2)}/seed)`)
  console.log(`Phrases: ${totalPhrases}`)
  console.log(`\nCourse code: ${COURSE_CODE}`)
}

buildCourse().catch(err => {
  console.error('Build failed:', err.message)
  process.exit(1)
})
