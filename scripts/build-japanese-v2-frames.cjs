#!/usr/bin/env node
/**
 * Japanese Test Course v2 - Frame-Based Design
 *
 * Philosophy:
 * - FRAMES are slot patterns that unlock massive recombination
 * - Each frame accepts vocabulary that slots in
 * - Zero variation early on - one way to say each thing
 * - Layered by conversational capability (Meta → Needs → Contributing → Others)
 * - Follows SSi methodology: INTRO → LEGO → DEBUT → REP
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const COURSE_CODE = 'jpn_for_eng_v2'

// =============================================================================
// FRAME DEFINITIONS
// =============================================================================

/**
 * Core Frames - the ENGINE of the language
 * Each frame is a pattern that accepts vocabulary slots
 */
const FRAMES = {
  // Frame 1: X です (It's X / X is)
  DESU: { pattern: 'X です', meaning: "It's X" },

  // Frame 2: X ですか (Is it X?)
  DESU_KA: { pattern: 'X ですか', meaning: 'Is it X?' },

  // Frame 3: X じゃないです (It's not X)
  JANAI: { pattern: 'X じゃないです', meaning: "It's not X" },

  // Frame 4: X がわかります (I understand X)
  WAKARU: { pattern: 'X がわかります', meaning: 'I understand X' },

  // Frame 5: X を Y ます (I do Y to X)
  WO_MASU: { pattern: 'X を Y ます', meaning: 'I [verb] X' },

  // Frame 6: Y ています (I am doing Y)
  TEIRU: { pattern: 'Y ています', meaning: 'I am [verb]ing' },

  // Frame 7: X が好きです (I like X)
  SUKI: { pattern: 'X が好きです', meaning: 'I like X' },

  // Frame 8: X が欲しいです (I want X)
  HOSHII: { pattern: 'X が欲しいです', meaning: 'I want X' },

  // Frame 9: X をください (X please)
  KUDASAI: { pattern: 'X をください', meaning: 'X please' },

  // Frame 10: X と思います (I think X)
  OMOU: { pattern: 'X と思います', meaning: 'I think X' }
}

// =============================================================================
// PHASE 1: META FOUNDATION (Seeds 1-30)
// "I can talk about learning Japanese"
// =============================================================================

const PHASE_1_SEEDS = [
  // Seed 1: Introduce 日本語 + です
  {
    seed_number: 1,
    known_text: "It's Japanese.",
    target_text: "日本語です。",
    legos: [
      { type: 'A', known: 'Japanese', target: '日本語', is_new: true },
      { type: 'A', known: 'is', target: 'です', is_new: true }
    ],
    // Round structure for phrase generation
    debuts: [
      { known: "It's Japanese", target: '日本語です' }
    ]
  },

  // Seed 2: Introduce これは (this is)
  {
    seed_number: 2,
    known_text: "This is Japanese.",
    target_text: "これは日本語です。",
    legos: [
      { type: 'M', known: 'this is', target: 'これは', is_new: true }
    ],
    debuts: [
      { known: 'this', target: 'これ' },
      { known: 'this is', target: 'これは' },
      { known: 'this is Japanese', target: 'これは日本語です' }
    ],
    reps: [
      { known: "It's Japanese", target: '日本語です' }
    ]
  },

  // Seed 3: Introduce ですか (question)
  {
    seed_number: 3,
    known_text: "Is this Japanese?",
    target_text: "これは日本語ですか。",
    legos: [
      { type: 'A', known: '(question)', target: 'か', is_new: true }
    ],
    debuts: [
      { known: 'is this Japanese?', target: 'これは日本語ですか' },
      { known: 'Japanese?', target: '日本語ですか' }
    ],
    reps: [
      { known: 'this is Japanese', target: 'これは日本語です' },
      { known: "It's Japanese", target: '日本語です' }
    ]
  },

  // Seed 4: Introduce それは (that is)
  {
    seed_number: 4,
    known_text: "Is that Japanese?",
    target_text: "それは日本語ですか。",
    legos: [
      { type: 'M', known: 'that is', target: 'それは', is_new: true }
    ],
    debuts: [
      { known: 'that', target: 'それ' },
      { known: 'that is', target: 'それは' },
      { known: 'that is Japanese', target: 'それは日本語です' },
      { known: 'is that Japanese?', target: 'それは日本語ですか' }
    ],
    reps: [
      { known: 'is this Japanese?', target: 'これは日本語ですか' },
      { known: 'this is Japanese', target: 'これは日本語です' }
    ]
  },

  // Seed 5: Introduce はい、そうです (yes, that's right)
  {
    seed_number: 5,
    known_text: "Yes, that's right.",
    target_text: "はい、そうです。",
    legos: [
      { type: 'A', known: 'yes', target: 'はい', is_new: true },
      { type: 'M', known: "that's right", target: 'そうです', is_new: true }
    ],
    debuts: [
      { known: 'yes', target: 'はい' },
      { known: "that's right", target: 'そうです' },
      { known: "yes, that's right", target: 'はい、そうです' }
    ],
    reps: [
      { known: 'is that Japanese?', target: 'それは日本語ですか' },
      { known: 'is this Japanese?', target: 'これは日本語ですか' }
    ]
  },

  // Seed 6: Introduce いいえ、違います (no, it's different)
  {
    seed_number: 6,
    known_text: "No, it's different.",
    target_text: "いいえ、違います。",
    legos: [
      { type: 'A', known: 'no', target: 'いいえ', is_new: true },
      { type: 'M', known: "it's different", target: '違います', is_new: true }
    ],
    debuts: [
      { known: 'no', target: 'いいえ' },
      { known: "it's different", target: '違います' },
      { known: "no, it's different", target: 'いいえ、違います' }
    ],
    reps: [
      { known: "yes, that's right", target: 'はい、そうです' },
      { known: 'is that Japanese?', target: 'それは日本語ですか' }
    ]
  },

  // Seed 7: Introduce いい (good)
  {
    seed_number: 7,
    known_text: "This is good.",
    target_text: "これはいいです。",
    legos: [
      { type: 'A', known: 'good', target: 'いい', is_new: true }
    ],
    debuts: [
      { known: 'good', target: 'いい' },
      { known: "it's good", target: 'いいです' },
      { known: 'this is good', target: 'これはいいです' },
      { known: 'that is good', target: 'それはいいです' }
    ],
    reps: [
      { known: "no, it's different", target: 'いいえ、違います' },
      { known: "yes, that's right", target: 'はい、そうです' }
    ]
  },

  // Seed 8: Introduce question with いい
  {
    seed_number: 8,
    known_text: "Is that good?",
    target_text: "それはいいですか。",
    legos: [
      { type: 'M', known: 'is that good?', target: 'それはいいですか', is_new: true }
    ],
    debuts: [
      { known: 'is this good?', target: 'これはいいですか' },
      { known: 'is that good?', target: 'それはいいですか' },
      { known: 'good?', target: 'いいですか' }
    ],
    reps: [
      { known: 'this is good', target: 'これはいいです' },
      { known: 'that is good', target: 'それはいいです' },
      { known: 'is that Japanese?', target: 'それは日本語ですか' }
    ]
  },

  // Seed 9: Introduce よくない (not good) - negative adjective
  {
    seed_number: 9,
    known_text: "This is not good.",
    target_text: "これはよくないです。",
    legos: [
      { type: 'M', known: 'not good', target: 'よくないです', is_new: true }
    ],
    debuts: [
      { known: 'not good', target: 'よくないです' },
      { known: 'this is not good', target: 'これはよくないです' },
      { known: 'that is not good', target: 'それはよくないです' }
    ],
    reps: [
      { known: 'is that good?', target: 'それはいいですか' },
      { known: 'this is good', target: 'これはいいです' },
      { known: "no, it's different", target: 'いいえ、違います' }
    ]
  },

  // Seed 10: Introduce 難しい (difficult)
  {
    seed_number: 10,
    known_text: "This is difficult.",
    target_text: "これは難しいです。",
    legos: [
      { type: 'A', known: 'difficult', target: '難しい', is_new: true }
    ],
    debuts: [
      { known: 'difficult', target: '難しい' },
      { known: "it's difficult", target: '難しいです' },
      { known: 'this is difficult', target: 'これは難しいです' },
      { known: 'that is difficult', target: 'それは難しいです' },
      { known: 'is this difficult?', target: 'これは難しいですか' }
    ],
    reps: [
      { known: 'this is not good', target: 'これはよくないです' },
      { known: 'is that good?', target: 'それはいいですか' }
    ]
  },

  // Seed 11: Japanese is difficult
  {
    seed_number: 11,
    known_text: "Japanese is difficult.",
    target_text: "日本語は難しいです。",
    legos: [
      { type: 'M', known: 'Japanese is difficult', target: '日本語は難しいです', is_new: true }
    ],
    debuts: [
      { known: 'Japanese is difficult', target: '日本語は難しいです' },
      { known: 'is Japanese difficult?', target: '日本語は難しいですか' },
      { known: 'Japanese is good', target: '日本語はいいです' }
    ],
    reps: [
      { known: 'this is difficult', target: 'これは難しいです' },
      { known: 'is this difficult?', target: 'これは難しいですか' }
    ]
  },

  // Seed 12: Introduce 面白い (interesting)
  {
    seed_number: 12,
    known_text: "This is interesting.",
    target_text: "これは面白いです。",
    legos: [
      { type: 'A', known: 'interesting', target: '面白い', is_new: true }
    ],
    debuts: [
      { known: 'interesting', target: '面白い' },
      { known: "it's interesting", target: '面白いです' },
      { known: 'this is interesting', target: 'これは面白いです' },
      { known: 'that is interesting', target: 'それは面白いです' },
      { known: 'Japanese is interesting', target: '日本語は面白いです' }
    ],
    reps: [
      { known: 'Japanese is difficult', target: '日本語は難しいです' },
      { known: 'this is difficult', target: 'これは難しいです' }
    ]
  },

  // Seed 13: Introduce けど (but) - connector
  {
    seed_number: 13,
    known_text: "Difficult but interesting.",
    target_text: "難しいですけど面白いです。",
    legos: [
      { type: 'A', known: 'but', target: 'けど', is_new: true }
    ],
    debuts: [
      { known: 'but', target: 'けど' },
      { known: 'difficult but interesting', target: '難しいですけど面白いです' },
      { known: 'difficult but good', target: '難しいですけどいいです' },
      { known: 'Japanese is difficult but interesting', target: '日本語は難しいですけど面白いです' }
    ],
    reps: [
      { known: 'Japanese is interesting', target: '日本語は面白いです' },
      { known: 'this is interesting', target: 'これは面白いです' }
    ]
  },

  // Seed 14: Introduce とても (very)
  {
    seed_number: 14,
    known_text: "This is very good.",
    target_text: "これはとてもいいです。",
    legos: [
      { type: 'A', known: 'very', target: 'とても', is_new: true }
    ],
    debuts: [
      { known: 'very', target: 'とても' },
      { known: 'very good', target: 'とてもいい' },
      { known: 'this is very good', target: 'これはとてもいいです' },
      { known: 'very interesting', target: 'とても面白い' },
      { known: 'this is very interesting', target: 'これはとても面白いです' },
      { known: 'very difficult', target: 'とても難しい' },
      { known: 'Japanese is very difficult', target: '日本語はとても難しいです' }
    ],
    reps: [
      { known: 'difficult but interesting', target: '難しいですけど面白いです' },
      { known: 'Japanese is difficult but interesting', target: '日本語は難しいですけど面白いです' }
    ]
  },

  // Seed 15: Introduce わかります (I understand)
  {
    seed_number: 15,
    known_text: "I understand.",
    target_text: "わかります。",
    legos: [
      { type: 'M', known: 'I understand', target: 'わかります', is_new: true }
    ],
    debuts: [
      { known: 'I understand', target: 'わかります' },
      { known: 'I understand Japanese', target: '日本語がわかります' }
    ],
    reps: [
      { known: 'this is very good', target: 'これはとてもいいです' },
      { known: 'Japanese is very difficult', target: '日本語はとても難しいです' }
    ]
  },

  // Seed 16: Introduce わかりません (I don't understand)
  {
    seed_number: 16,
    known_text: "I don't understand.",
    target_text: "わかりません。",
    legos: [
      { type: 'M', known: "I don't understand", target: 'わかりません', is_new: true }
    ],
    debuts: [
      { known: "I don't understand", target: 'わかりません' },
      { known: "I don't understand Japanese", target: '日本語がわかりません' }
    ],
    reps: [
      { known: 'I understand', target: 'わかります' },
      { known: 'I understand Japanese', target: '日本語がわかります' }
    ]
  },

  // Seed 17: Introduce 少し (a little)
  {
    seed_number: 17,
    known_text: "I understand a little.",
    target_text: "少しわかります。",
    legos: [
      { type: 'A', known: 'a little', target: '少し', is_new: true }
    ],
    debuts: [
      { known: 'a little', target: '少し' },
      { known: 'I understand a little', target: '少しわかります' },
      { known: 'I understand Japanese a little', target: '日本語が少しわかります' },
      { known: 'a little difficult', target: '少し難しい' },
      { known: 'this is a little difficult', target: 'これは少し難しいです' }
    ],
    reps: [
      { known: "I don't understand", target: 'わかりません' },
      { known: 'I understand Japanese', target: '日本語がわかります' }
    ]
  },

  // Seed 18: Introduce 話します (I speak)
  {
    seed_number: 18,
    known_text: "I speak Japanese.",
    target_text: "日本語を話します。",
    legos: [
      { type: 'A', known: '(object marker)', target: 'を', is_new: true },
      { type: 'M', known: 'I speak', target: '話します', is_new: true }
    ],
    debuts: [
      { known: 'speak', target: '話します' },
      { known: 'I speak Japanese', target: '日本語を話します' }
    ],
    reps: [
      { known: 'I understand a little', target: '少しわかります' },
      { known: 'I understand Japanese a little', target: '日本語が少しわかります' }
    ]
  },

  // Seed 19: Introduce 話しません (I don't speak)
  {
    seed_number: 19,
    known_text: "I don't speak Japanese.",
    target_text: "日本語を話しません。",
    legos: [
      { type: 'M', known: "I don't speak", target: '話しません', is_new: true }
    ],
    debuts: [
      { known: "I don't speak", target: '話しません' },
      { known: "I don't speak Japanese", target: '日本語を話しません' }
    ],
    reps: [
      { known: 'I speak Japanese', target: '日本語を話します' },
      { known: 'I understand a little', target: '少しわかります' }
    ]
  },

  // Seed 20: Introduce 少し話します (I speak a little)
  {
    seed_number: 20,
    known_text: "I speak a little Japanese.",
    target_text: "日本語を少し話します。",
    legos: [
      { type: 'M', known: 'I speak a little Japanese', target: '日本語を少し話します', is_new: true }
    ],
    debuts: [
      { known: 'I speak a little', target: '少し話します' },
      { known: 'I speak a little Japanese', target: '日本語を少し話します' }
    ],
    reps: [
      { known: "I don't speak Japanese", target: '日本語を話しません' },
      { known: 'I speak Japanese', target: '日本語を話します' },
      { known: 'I understand Japanese a little', target: '日本語が少しわかります' }
    ]
  },

  // Seed 21: Introduce 勉強 (study)
  {
    seed_number: 21,
    known_text: "I study Japanese.",
    target_text: "日本語を勉強します。",
    legos: [
      { type: 'A', known: 'study', target: '勉強', is_new: true },
      { type: 'M', known: 'I do', target: 'します', is_new: true }
    ],
    debuts: [
      { known: 'study', target: '勉強' },
      { known: 'I study', target: '勉強します' },
      { known: 'I study Japanese', target: '日本語を勉強します' }
    ],
    reps: [
      { known: 'I speak a little Japanese', target: '日本語を少し話します' },
      { known: 'I speak Japanese', target: '日本語を話します' }
    ]
  },

  // Seed 22: Introduce しています (I am doing)
  {
    seed_number: 22,
    known_text: "I am studying Japanese.",
    target_text: "日本語を勉強しています。",
    legos: [
      { type: 'M', known: 'I am doing', target: 'しています', is_new: true }
    ],
    debuts: [
      { known: 'I am studying', target: '勉強しています' },
      { known: 'I am studying Japanese', target: '日本語を勉強しています' }
    ],
    reps: [
      { known: 'I study Japanese', target: '日本語を勉強します' },
      { known: 'I speak a little Japanese', target: '日本語を少し話します' }
    ]
  },

  // Seed 23: Introduce ありがとうございます (thank you)
  {
    seed_number: 23,
    known_text: "Thank you.",
    target_text: "ありがとうございます。",
    legos: [
      { type: 'M', known: 'thank you', target: 'ありがとうございます', is_new: true }
    ],
    debuts: [
      { known: 'thank you', target: 'ありがとうございます' }
    ],
    reps: [
      { known: 'I am studying Japanese', target: '日本語を勉強しています' },
      { known: 'Japanese is difficult but interesting', target: '日本語は難しいですけど面白いです' }
    ]
  },

  // Seed 24: Introduce お願いします (please)
  {
    seed_number: 24,
    known_text: "Please.",
    target_text: "お願いします。",
    legos: [
      { type: 'M', known: 'please', target: 'お願いします', is_new: true }
    ],
    debuts: [
      { known: 'please', target: 'お願いします' }
    ],
    reps: [
      { known: 'thank you', target: 'ありがとうございます' },
      { known: 'I am studying Japanese', target: '日本語を勉強しています' }
    ]
  },

  // Seed 25: Introduce もう一度 (once more)
  {
    seed_number: 25,
    known_text: "Once more, please.",
    target_text: "もう一度お願いします。",
    legos: [
      { type: 'M', known: 'once more', target: 'もう一度', is_new: true }
    ],
    debuts: [
      { known: 'once more', target: 'もう一度' },
      { known: 'once more please', target: 'もう一度お願いします' }
    ],
    reps: [
      { known: 'please', target: 'お願いします' },
      { known: 'thank you', target: 'ありがとうございます' }
    ]
  },

  // Seed 26: Introduce ゆっくり (slowly)
  {
    seed_number: 26,
    known_text: "Slowly, please.",
    target_text: "ゆっくりお願いします。",
    legos: [
      { type: 'A', known: 'slowly', target: 'ゆっくり', is_new: true }
    ],
    debuts: [
      { known: 'slowly', target: 'ゆっくり' },
      { known: 'slowly please', target: 'ゆっくりお願いします' },
      { known: 'slowly once more please', target: 'もう一度ゆっくりお願いします' }
    ],
    reps: [
      { known: 'once more please', target: 'もう一度お願いします' },
      { known: 'please', target: 'お願いします' }
    ]
  },

  // Seed 27: Introduce 何 (what) in context
  {
    seed_number: 27,
    known_text: "What is this?",
    target_text: "これは何ですか。",
    legos: [
      { type: 'M', known: 'what is this?', target: 'これは何ですか', is_new: true }
    ],
    debuts: [
      { known: 'what?', target: '何ですか' },
      { known: 'what is this?', target: 'これは何ですか' },
      { known: 'what is that?', target: 'それは何ですか' }
    ],
    reps: [
      { known: 'slowly please', target: 'ゆっくりお願いします' },
      { known: 'this is Japanese', target: 'これは日本語です' }
    ]
  },

  // Seed 28: Introduce 楽しい (fun)
  {
    seed_number: 28,
    known_text: "This is fun.",
    target_text: "これは楽しいです。",
    legos: [
      { type: 'A', known: 'fun', target: '楽しい', is_new: true }
    ],
    debuts: [
      { known: 'fun', target: '楽しい' },
      { known: "it's fun", target: '楽しいです' },
      { known: 'this is fun', target: 'これは楽しいです' },
      { known: 'Japanese is fun', target: '日本語は楽しいです' },
      { known: 'studying is fun', target: '勉強は楽しいです' },
      { known: 'difficult but fun', target: '難しいですけど楽しいです' }
    ],
    reps: [
      { known: 'what is this?', target: 'これは何ですか' },
      { known: 'this is interesting', target: 'これは面白いです' }
    ]
  },

  // Seed 29: Introduce 簡単 (easy)
  {
    seed_number: 29,
    known_text: "This is easy.",
    target_text: "これは簡単です。",
    legos: [
      { type: 'A', known: 'easy', target: '簡単', is_new: true }
    ],
    debuts: [
      { known: 'easy', target: '簡単' },
      { known: "it's easy", target: '簡単です' },
      { known: 'this is easy', target: 'これは簡単です' },
      { known: 'that is easy', target: 'それは簡単です' },
      { known: 'is this easy?', target: 'これは簡単ですか' },
      { known: 'not easy', target: '簡単じゃないです' },
      { known: 'this is not easy', target: 'これは簡単じゃないです' }
    ],
    reps: [
      { known: 'this is fun', target: 'これは楽しいです' },
      { known: 'this is difficult', target: 'これは難しいです' }
    ]
  },

  // Seed 30: Combine - Japanese is difficult but fun
  {
    seed_number: 30,
    known_text: "Japanese is difficult but fun.",
    target_text: "日本語は難しいですけど楽しいです。",
    legos: [
      { type: 'M', known: 'Japanese is difficult but fun', target: '日本語は難しいですけど楽しいです', is_new: true }
    ],
    debuts: [
      { known: 'Japanese is difficult but fun', target: '日本語は難しいですけど楽しいです' },
      { known: 'not easy but fun', target: '簡単じゃないですけど楽しいです' },
      { known: 'Japanese is not easy but interesting', target: '日本語は簡単じゃないですけど面白いです' }
    ],
    reps: [
      { known: 'this is easy', target: 'これは簡単です' },
      { known: 'difficult but interesting', target: '難しいですけど面白いです' },
      { known: 'I am studying Japanese', target: '日本語を勉強しています' },
      { known: 'I speak a little Japanese', target: '日本語を少し話します' }
    ]
  }
]

// =============================================================================
// PHASE 2: WANTS & LIKES (Seeds 31-50)
// "I can express what I want and like"
// =============================================================================

const PHASE_2_SEEDS = [
  // Seed 31: Introduce 好きです (I like)
  {
    seed_number: 31,
    known_text: "I like this.",
    target_text: "これが好きです。",
    legos: [
      { type: 'A', known: '(subject marker)', target: 'が', is_new: true },
      { type: 'M', known: 'I like', target: '好きです', is_new: true }
    ],
    debuts: [
      { known: 'I like', target: '好きです' },
      { known: 'I like this', target: 'これが好きです' },
      { known: 'I like that', target: 'それが好きです' }
    ],
    reps: [
      { known: 'Japanese is difficult but fun', target: '日本語は難しいですけど楽しいです' },
      { known: 'I am studying Japanese', target: '日本語を勉強しています' }
    ]
  },

  // Seed 32: I like Japanese
  {
    seed_number: 32,
    known_text: "I like Japanese.",
    target_text: "日本語が好きです。",
    legos: [
      { type: 'M', known: 'I like Japanese', target: '日本語が好きです', is_new: true }
    ],
    debuts: [
      { known: 'I like Japanese', target: '日本語が好きです' },
      { known: 'I like studying Japanese', target: '日本語を勉強するのが好きです' }
    ],
    reps: [
      { known: 'I like this', target: 'これが好きです' },
      { known: 'I am studying Japanese', target: '日本語を勉強しています' }
    ]
  },

  // Seed 33: Do you like Japanese?
  {
    seed_number: 33,
    known_text: "Do you like Japanese?",
    target_text: "日本語が好きですか。",
    legos: [
      { type: 'M', known: 'do you like Japanese?', target: '日本語が好きですか', is_new: true }
    ],
    debuts: [
      { known: 'do you like Japanese?', target: '日本語が好きですか' },
      { known: 'do you like this?', target: 'これが好きですか' },
      { known: 'do you like that?', target: 'それが好きですか' }
    ],
    reps: [
      { known: 'I like Japanese', target: '日本語が好きです' },
      { known: 'I like this', target: 'これが好きです' }
    ]
  },

  // Seed 34: I don't like
  {
    seed_number: 34,
    known_text: "I don't like that.",
    target_text: "それは好きじゃないです。",
    legos: [
      { type: 'M', known: "I don't like", target: '好きじゃないです', is_new: true }
    ],
    debuts: [
      { known: "I don't like", target: '好きじゃないです' },
      { known: "I don't like that", target: 'それは好きじゃないです' },
      { known: "I don't like this", target: 'これは好きじゃないです' }
    ],
    reps: [
      { known: 'do you like Japanese?', target: '日本語が好きですか' },
      { known: 'I like Japanese', target: '日本語が好きです' }
    ]
  },

  // Seed 35: I want (thing)
  {
    seed_number: 35,
    known_text: "I want this.",
    target_text: "これが欲しいです。",
    legos: [
      { type: 'M', known: 'I want', target: '欲しいです', is_new: true }
    ],
    debuts: [
      { known: 'I want', target: '欲しいです' },
      { known: 'I want this', target: 'これが欲しいです' },
      { known: 'I want that', target: 'それが欲しいです' }
    ],
    reps: [
      { known: "I don't like that", target: 'それは好きじゃないです' },
      { known: 'I like this', target: 'これが好きです' }
    ]
  },

  // Seed 36: Introduce コーヒー (coffee)
  {
    seed_number: 36,
    known_text: "I want coffee.",
    target_text: "コーヒーが欲しいです。",
    legos: [
      { type: 'A', known: 'coffee', target: 'コーヒー', is_new: true }
    ],
    debuts: [
      { known: 'coffee', target: 'コーヒー' },
      { known: 'I want coffee', target: 'コーヒーが欲しいです' },
      { known: 'I like coffee', target: 'コーヒーが好きです' },
      { known: "it's coffee", target: 'コーヒーです' }
    ],
    reps: [
      { known: 'I want this', target: 'これが欲しいです' },
      { known: 'I like this', target: 'これが好きです' }
    ]
  },

  // Seed 37: Introduce 水 (water)
  {
    seed_number: 37,
    known_text: "I want water.",
    target_text: "水が欲しいです。",
    legos: [
      { type: 'A', known: 'water', target: '水', is_new: true }
    ],
    debuts: [
      { known: 'water', target: '水' },
      { known: 'I want water', target: '水が欲しいです' },
      { known: 'I like water', target: '水が好きです' }
    ],
    reps: [
      { known: 'I want coffee', target: 'コーヒーが欲しいです' },
      { known: 'I like coffee', target: 'コーヒーが好きです' }
    ]
  },

  // Seed 38: Introduce ください (please give me)
  {
    seed_number: 38,
    known_text: "Coffee, please.",
    target_text: "コーヒーをください。",
    legos: [
      { type: 'M', known: 'please give me', target: 'ください', is_new: true }
    ],
    debuts: [
      { known: 'please give me', target: 'ください' },
      { known: 'coffee please', target: 'コーヒーをください' },
      { known: 'water please', target: '水をください' },
      { known: 'this please', target: 'これをください' },
      { known: 'that please', target: 'それをください' }
    ],
    reps: [
      { known: 'I want water', target: '水が欲しいです' },
      { known: 'I want coffee', target: 'コーヒーが欲しいです' }
    ]
  },

  // Seed 39: Introduce 時間 (time)
  {
    seed_number: 39,
    known_text: "I want time.",
    target_text: "時間が欲しいです。",
    legos: [
      { type: 'A', known: 'time', target: '時間', is_new: true }
    ],
    debuts: [
      { known: 'time', target: '時間' },
      { known: 'I want time', target: '時間が欲しいです' },
      { known: 'I need time', target: '時間が必要です' }
    ],
    reps: [
      { known: 'coffee please', target: 'コーヒーをください' },
      { known: 'I want coffee', target: 'コーヒーが欲しいです' }
    ]
  },

  // Seed 40: Introduce 今 (now)
  {
    seed_number: 40,
    known_text: "Now, please.",
    target_text: "今お願いします。",
    legos: [
      { type: 'A', known: 'now', target: '今', is_new: true }
    ],
    debuts: [
      { known: 'now', target: '今' },
      { known: 'now please', target: '今お願いします' },
      { known: "I'm studying now", target: '今勉強しています' },
      { known: 'I want coffee now', target: '今コーヒーが欲しいです' }
    ],
    reps: [
      { known: 'I want time', target: '時間が欲しいです' },
      { known: 'coffee please', target: 'コーヒーをください' }
    ]
  }
]

// Continue with more seeds...
// For brevity, I'll add the remaining phases in structure

const PHASE_3_SEEDS = [] // Seeds 41-80: Contributing & Opinions
const PHASE_4_SEEDS = [] // Seeds 81-120: Reactions & Conversation
const PHASE_5_SEEDS = [] // Seeds 121-150: Others & Connections

// Combine all seeds
const ALL_SEEDS = [
  ...PHASE_1_SEEDS,
  ...PHASE_2_SEEDS,
  // Will add more phases
]

// =============================================================================
// BUILD FUNCTION
// =============================================================================

async function buildCourse() {
  console.log(`\nBuilding Japanese v2 Course: ${COURSE_CODE}`)
  console.log('Frame-based design with conversational layers')
  console.log('='.repeat(60))

  // Check if exists
  const { data: existing } = await supabase
    .from('course_seeds')
    .select('seed_number')
    .eq('course_code', COURSE_CODE)

  if (existing && existing.length > 0) {
    console.log(`\n⚠️  Course ${COURSE_CODE} already has ${existing.length} seeds.`)

    if (process.argv.includes('--wipe')) {
      console.log('\nWiping existing course data...')
      await supabase.from('course_practice_phrases').delete().eq('course_code', COURSE_CODE)
      await supabase.from('course_legos').delete().eq('course_code', COURSE_CODE)
      await supabase.from('course_seeds').delete().eq('course_code', COURSE_CODE)
      console.log('✓ Wiped existing data')
    } else {
      console.log('Use --wipe flag to delete and rebuild.')
      return
    }
  }

  let totalLegos = 0
  let totalPhrases = 0
  const seenLegos = new Map() // Track known+target -> first occurrence

  for (const seed of ALL_SEEDS) {
    console.log(`\nSeed ${seed.seed_number}: "${seed.known_text}"`)
    console.log(`  Target: "${seed.target_text}"`)

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
      const legoKey = `${lego.known}|${lego.target}`

      // Check if truly new
      const isNew = !seenLegos.has(legoKey)
      if (isNew) {
        seenLegos.set(legoKey, seed.seed_number)
      }

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
      const marker = isNew ? 'NEW' : 'repeat'
      console.log(`  L${legoIndex}: "${lego.known}" → "${lego.target}" (${marker})`)
    }

    // Insert phrases from debuts and reps
    const allPhrases = [
      ...(seed.debuts || []),
      ...(seed.reps || [])
    ]

    for (let p = 0; p < allPhrases.length; p++) {
      const phrase = allPhrases[p]
      const wordCount = phrase.known.split(/\s+/).length

      const { error: phraseErr } = await supabase
        .from('course_practice_phrases')
        .insert({
          course_code: COURSE_CODE,
          seed_number: seed.seed_number,
          lego_index: 1, // Associate with first LEGO
          position: p + 1,
          word_count: wordCount,
          lego_count: 1,
          known_text: phrase.known,
          target_text: phrase.target
        })

      if (!phraseErr) {
        totalPhrases++
      }
    }

    console.log(`  Phrases: ${allPhrases.length}`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('BUILD COMPLETE')
  console.log('='.repeat(60))
  console.log(`Seeds: ${ALL_SEEDS.length}`)
  console.log(`LEGOs: ${totalLegos} (avg ${(totalLegos / ALL_SEEDS.length).toFixed(2)}/seed)`)
  console.log(`Phrases: ${totalPhrases}`)
  console.log(`Unique LEGOs: ${seenLegos.size}`)
  console.log(`\nCourse code: ${COURSE_CODE}`)
}

buildCourse().catch(err => {
  console.error('Build failed:', err.message)
  process.exit(1)
})
