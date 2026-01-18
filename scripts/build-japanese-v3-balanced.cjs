#!/usr/bin/env node
/**
 * Japanese Course v3 - BALANCED Frame + Vocabulary Design
 *
 * Target: ~500 LEGOs across 150 seeds (~3.3 LEGOs/seed)
 *
 * Philosophy:
 * - Frames are MULTIPLIERS (grammar patterns)
 * - Vocabulary is PAYLOAD (things to talk about)
 * - Each seed increases communicative ability
 * - Balance: introduce frame, then enrich it with vocab
 *
 * Layers:
 * - Phase 1 (1-30):   Meta Foundation - talking about learning
 * - Phase 2 (31-60):  Wants, Likes & States - expressing needs/feelings
 * - Phase 3 (61-90):  Contributing & Reacting - participating in conversation
 * - Phase 4 (91-120): Ability & Actions - what you can do
 * - Phase 5 (121-150): Involving Others - talking about people
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const COURSE_CODE = 'jpn_for_eng_v3'

// =============================================================================
// PHASE 1: META FOUNDATION (Seeds 1-30) - ~100 LEGOs
// "I can talk about learning Japanese"
// =============================================================================

const PHASE_1 = [
  // Seed 1: Introduce です frame + first noun
  { n: 1, en: "It's Japanese.", jp: "日本語です。",
    legos: [
      { k: 'Japanese (language)', j: '日本語' },
      { k: 'is/it is', j: 'です' }
    ]},

  // Seed 2: Add "this" pointer + English
  { n: 2, en: "This is English.", jp: "これは英語です。",
    legos: [
      { k: 'this (topic)', j: 'これは' },
      { k: 'English (language)', j: '英語' }
    ]},

  // Seed 3: Question frame + "that" pointer
  { n: 3, en: "Is that Japanese?", jp: "それは日本語ですか。",
    legos: [
      { k: 'that (topic)', j: 'それは' },
      { k: '(question marker)', j: 'か' }
    ]},

  // Seed 4: Yes/no + Chinese
  { n: 4, en: "Yes. It's Chinese.", jp: "はい。中国語です。",
    legos: [
      { k: 'yes', j: 'はい' },
      { k: 'Chinese (language)', j: '中国語' }
    ]},

  // Seed 5: No + different + Spanish
  { n: 5, en: "No, it's Spanish.", jp: "いいえ、スペイン語です。",
    legos: [
      { k: 'no', j: 'いいえ' },
      { k: 'Spanish (language)', j: 'スペイン語' }
    ]},

  // Seed 6: First adjective - difficult
  { n: 6, en: "Japanese is difficult.", jp: "日本語は難しいです。",
    legos: [
      { k: 'difficult', j: '難しい' }
    ]},

  // Seed 7: Easy + French
  { n: 7, en: "French is easy.", jp: "フランス語は簡単です。",
    legos: [
      { k: 'easy', j: '簡単' },
      { k: 'French (language)', j: 'フランス語' }
    ]},

  // Seed 8: Interesting + German
  { n: 8, en: "German is interesting.", jp: "ドイツ語は面白いです。",
    legos: [
      { k: 'interesting', j: '面白い' },
      { k: 'German (language)', j: 'ドイツ語' }
    ]},

  // Seed 9: Negative frame - not difficult
  { n: 9, en: "English is not difficult.", jp: "英語は難しくないです。",
    legos: [
      { k: 'not difficult', j: '難しくないです' }
    ]},

  // Seed 10: Very + good
  { n: 10, en: "This is very good.", jp: "これはとてもいいです。",
    legos: [
      { k: 'very', j: 'とても' },
      { k: 'good', j: 'いい' }
    ]},

  // Seed 11: A little + fun
  { n: 11, en: "This is a little fun.", jp: "これは少し楽しいです。",
    legos: [
      { k: 'a little', j: '少し' },
      { k: 'fun', j: '楽しい' }
    ]},

  // Seed 12: Bad/not good
  { n: 12, en: "That is not good.", jp: "それはよくないです。",
    legos: [
      { k: 'not good', j: 'よくないです' }
    ]},

  // Seed 13: Understand frame
  { n: 13, en: "I understand.", jp: "わかります。",
    legos: [
      { k: 'I understand', j: 'わかります' }
    ]},

  // Seed 14: Don't understand
  { n: 14, en: "I don't understand.", jp: "わかりません。",
    legos: [
      { k: "I don't understand", j: 'わかりません' }
    ]},

  // Seed 15: Understand a little + Japanese
  { n: 15, en: "I understand Japanese a little.", jp: "日本語が少しわかります。",
    legos: [
      { k: '(subject marker)', j: 'が' }
    ]},

  // Seed 16: Speak frame
  { n: 16, en: "I speak English.", jp: "英語を話します。",
    legos: [
      { k: '(object marker)', j: 'を' },
      { k: 'speak', j: '話します' }
    ]},

  // Seed 17: Don't speak
  { n: 17, en: "I don't speak Chinese.", jp: "中国語を話しません。",
    legos: [
      { k: "don't speak", j: '話しません' }
    ]},

  // Seed 18: Speak a little
  { n: 18, en: "I speak Japanese a little.", jp: "日本語を少し話します。",
    legos: [
      { k: 'speak a little', j: '少し話します' }
    ]},

  // Seed 19: Study frame + Korean
  { n: 19, en: "I study Korean.", jp: "韓国語を勉強します。",
    legos: [
      { k: 'study', j: '勉強します' },
      { k: 'Korean (language)', j: '韓国語' }
    ]},

  // Seed 20: Am studying (continuous)
  { n: 20, en: "I am studying Japanese.", jp: "日本語を勉強しています。",
    legos: [
      { k: 'am studying', j: '勉強しています' }
    ]},

  // Seed 21: Thank you
  { n: 21, en: "Thank you.", jp: "ありがとうございます。",
    legos: [
      { k: 'thank you', j: 'ありがとうございます' }
    ]},

  // Seed 22: Sorry/excuse me
  { n: 22, en: "Excuse me.", jp: "すみません。",
    legos: [
      { k: 'excuse me / sorry', j: 'すみません' }
    ]},

  // Seed 23: Please (request frame)
  { n: 23, en: "Please.", jp: "お願いします。",
    legos: [
      { k: 'please (request)', j: 'お願いします' }
    ]},

  // Seed 24: Once more + slowly
  { n: 24, en: "Once more, slowly please.", jp: "もう一度、ゆっくりお願いします。",
    legos: [
      { k: 'once more', j: 'もう一度' },
      { k: 'slowly', j: 'ゆっくり' }
    ]},

  // Seed 25: What question
  { n: 25, en: "What is this?", jp: "これは何ですか。",
    legos: [
      { k: 'what', j: '何' }
    ]},

  // Seed 26: How question + say
  { n: 26, en: "How do you say this?", jp: "これは何と言いますか。",
    legos: [
      { k: 'say', j: '言います' },
      { k: 'how / what (way)', j: '何と' }
    ]},

  // Seed 27: In Japanese
  { n: 27, en: "How do you say this in Japanese?", jp: "これは日本語で何と言いますか。",
    legos: [
      { k: 'in (language)', j: 'で' }
    ]},

  // Seed 28: Important
  { n: 28, en: "This is important.", jp: "これは大切です。",
    legos: [
      { k: 'important', j: '大切' }
    ]},

  // Seed 29: New + word
  { n: 29, en: "This is a new word.", jp: "これは新しい言葉です。",
    legos: [
      { k: 'new', j: '新しい' },
      { k: 'word', j: '言葉' }
    ]},

  // Seed 30: Difficult but interesting (connector)
  { n: 30, en: "Japanese is difficult but interesting.", jp: "日本語は難しいですけど面白いです。",
    legos: [
      { k: 'but', j: 'けど' }
    ]},
]

// =============================================================================
// PHASE 2: WANTS, LIKES & STATES (Seeds 31-60) - ~100 LEGOs
// "I can express what I want, like, and how I feel"
// =============================================================================

const PHASE_2 = [
  // Seed 31: Like frame + music
  { n: 31, en: "I like music.", jp: "音楽が好きです。",
    legos: [
      { k: 'like', j: '好きです' },
      { k: 'music', j: '音楽' }
    ]},

  // Seed 32: Like Japanese + movies
  { n: 32, en: "I like Japanese movies.", jp: "日本の映画が好きです。",
    legos: [
      { k: "'s / of (possessive)", j: 'の' },
      { k: 'movie(s)', j: '映画' }
    ]},

  // Seed 33: Like question + food
  { n: 33, en: "Do you like Japanese food?", jp: "日本の食べ物が好きですか。",
    legos: [
      { k: 'food', j: '食べ物' }
    ]},

  // Seed 34: Don't like + spicy
  { n: 34, en: "I don't like spicy food.", jp: "辛い食べ物が好きじゃないです。",
    legos: [
      { k: "don't like", j: '好きじゃないです' },
      { k: 'spicy', j: '辛い' }
    ]},

  // Seed 35: Really like + sushi
  { n: 35, en: "I really like sushi.", jp: "寿司がとても好きです。",
    legos: [
      { k: 'sushi', j: '寿司' }
    ]},

  // Seed 36: Want frame + coffee
  { n: 36, en: "I want coffee.", jp: "コーヒーが欲しいです。",
    legos: [
      { k: 'want (thing)', j: '欲しいです' },
      { k: 'coffee', j: 'コーヒー' }
    ]},

  // Seed 37: Want + tea + water
  { n: 37, en: "I want tea, not water.", jp: "水じゃなくて、お茶が欲しいです。",
    legos: [
      { k: 'water', j: '水' },
      { k: 'tea', j: 'お茶' },
      { k: 'not X, but', j: 'じゃなくて' }
    ]},

  // Seed 38: Please give (request frame) + beer
  { n: 38, en: "Beer, please.", jp: "ビールをください。",
    legos: [
      { k: 'please give', j: 'ください' },
      { k: 'beer', j: 'ビール' }
    ]},

  // Seed 39: This one please + sake
  { n: 39, en: "This sake, please.", jp: "このお酒をください。",
    legos: [
      { k: 'this (adjective)', j: 'この' },
      { k: 'sake / alcohol', j: 'お酒' }
    ]},

  // Seed 40: Want + time
  { n: 40, en: "I want more time.", jp: "もっと時間が欲しいです。",
    legos: [
      { k: 'more', j: 'もっと' },
      { k: 'time', j: '時間' }
    ]},

  // Seed 41: Don't want
  { n: 41, en: "I don't want that.", jp: "それは欲しくないです。",
    legos: [
      { k: "don't want", j: '欲しくないです' }
    ]},

  // Seed 42: Hungry
  { n: 42, en: "I'm hungry.", jp: "お腹が空いています。",
    legos: [
      { k: "I'm hungry", j: 'お腹が空いています' }
    ]},

  // Seed 43: Not hungry + full
  { n: 43, en: "I'm not hungry. I'm full.", jp: "お腹が空いていません。お腹がいっぱいです。",
    legos: [
      { k: "I'm not hungry", j: 'お腹が空いていません' },
      { k: "I'm full", j: 'お腹がいっぱいです' }
    ]},

  // Seed 44: Thirsty
  { n: 44, en: "I'm thirsty.", jp: "喉が渇いています。",
    legos: [
      { k: "I'm thirsty", j: '喉が渇いています' }
    ]},

  // Seed 45: Tired
  { n: 45, en: "I'm tired.", jp: "疲れています。",
    legos: [
      { k: "I'm tired", j: '疲れています' }
    ]},

  // Seed 46: A little tired
  { n: 46, en: "I'm a little tired.", jp: "少し疲れています。",
    legos: [
      { k: 'a little tired', j: '少し疲れています' }
    ]},

  // Seed 47: Busy
  { n: 47, en: "I'm busy.", jp: "忙しいです。",
    legos: [
      { k: 'busy', j: '忙しい' }
    ]},

  // Seed 48: Not busy + free
  { n: 48, en: "I'm not busy. I'm free.", jp: "忙しくないです。暇です。",
    legos: [
      { k: 'not busy', j: '忙しくないです' },
      { k: 'free (time)', j: '暇' }
    ]},

  // Seed 49: Happy
  { n: 49, en: "I'm happy.", jp: "嬉しいです。",
    legos: [
      { k: 'happy', j: '嬉しい' }
    ]},

  // Seed 50: Sad
  { n: 50, en: "I'm sad.", jp: "悲しいです。",
    legos: [
      { k: 'sad', j: '悲しい' }
    ]},

  // Seed 51: OK / fine
  { n: 51, en: "I'm OK.", jp: "大丈夫です。",
    legos: [
      { k: "OK / fine", j: '大丈夫' }
    ]},

  // Seed 52: Nervous / worried
  { n: 52, en: "I'm a little nervous.", jp: "少し心配です。",
    legos: [
      { k: 'worried / nervous', j: '心配' }
    ]},

  // Seed 53: Excited
  { n: 53, en: "I'm excited.", jp: "楽しみです。",
    legos: [
      { k: 'looking forward to / excited', j: '楽しみ' }
    ]},

  // Seed 54: Me too + also
  { n: 54, en: "Me too.", jp: "私もです。",
    legos: [
      { k: 'I / me', j: '私' },
      { k: 'also / too', j: 'も' }
    ]},

  // Seed 55: How about you?
  { n: 55, en: "How about you?", jp: "あなたは？",
    legos: [
      { k: 'you', j: 'あなた' }
    ]},

  // Seed 56: And you? (name)
  { n: 56, en: "And Tanaka-san?", jp: "田中さんは？",
    legos: [
      { k: 'Tanaka', j: '田中' },
      { k: 'Mr/Ms (honorific)', j: 'さん' }
    ]},

  // Seed 57: Hot (weather)
  { n: 57, en: "It's hot today.", jp: "今日は暑いです。",
    legos: [
      { k: 'today', j: '今日' },
      { k: 'hot (weather)', j: '暑い' }
    ]},

  // Seed 58: Cold (weather)
  { n: 58, en: "It's cold.", jp: "寒いです。",
    legos: [
      { k: 'cold (weather)', j: '寒い' }
    ]},

  // Seed 59: Nice weather
  { n: 59, en: "Nice weather today.", jp: "今日はいい天気です。",
    legos: [
      { k: 'weather', j: '天気' }
    ]},

  // Seed 60: Bad weather + rain
  { n: 60, en: "Bad weather. It's raining.", jp: "天気が悪いです。雨です。",
    legos: [
      { k: 'bad', j: '悪い' },
      { k: 'rain', j: '雨' }
    ]},
]

// =============================================================================
// PHASE 3: CONTRIBUTING & REACTING (Seeds 61-90) - ~100 LEGOs
// "I can participate in and react to conversation"
// =============================================================================

const PHASE_3 = [
  // Seed 61: Think frame
  { n: 61, en: "I think so.", jp: "そう思います。",
    legos: [
      { k: 'think', j: '思います' },
      { k: 'so / that way', j: 'そう' }
    ]},

  // Seed 62: I think it's good
  { n: 62, en: "I think it's good.", jp: "いいと思います。",
    legos: [
      { k: 'I think (that)', j: 'と思います' }
    ]},

  // Seed 63: Don't think so
  { n: 63, en: "I don't think so.", jp: "そう思いません。",
    legos: [
      { k: "don't think", j: '思いません' }
    ]},

  // Seed 64: Really? + true
  { n: 64, en: "Really? Is that true?", jp: "本当ですか。",
    legos: [
      { k: 'true / really', j: '本当' }
    ]},

  // Seed 65: Amazing + particle ね
  { n: 65, en: "That's amazing!", jp: "すごいですね！",
    legos: [
      { k: 'amazing', j: 'すごい' },
      { k: "(isn't it / right)", j: 'ね' }
    ]},

  // Seed 66: That's nice
  { n: 66, en: "That's nice.", jp: "いいですね。",
    legos: [
      { k: "that's nice", j: 'いいですね' }
    ]},

  // Seed 67: I see / understood
  { n: 67, en: "I see.", jp: "なるほど。",
    legos: [
      { k: 'I see / ah', j: 'なるほど' }
    ]},

  // Seed 68: Of course
  { n: 68, en: "Of course.", jp: "もちろん。",
    legos: [
      { k: 'of course', j: 'もちろん' }
    ]},

  // Seed 69: Maybe + probably
  { n: 69, en: "Maybe. Probably.", jp: "たぶん。",
    legos: [
      { k: 'maybe / probably', j: 'たぶん' }
    ]},

  // Seed 70: I'm not sure
  { n: 70, en: "I'm not sure.", jp: "ちょっとわかりません。",
    legos: [
      { k: 'a bit / slightly', j: 'ちょっと' }
    ]},

  // Seed 71: Tomorrow
  { n: 71, en: "Tomorrow.", jp: "明日。",
    legos: [
      { k: 'tomorrow', j: '明日' }
    ]},

  // Seed 72: Yesterday
  { n: 72, en: "Yesterday.", jp: "昨日。",
    legos: [
      { k: 'yesterday', j: '昨日' }
    ]},

  // Seed 73: Now + later
  { n: 73, en: "Not now. Later.", jp: "今じゃないです。後で。",
    legos: [
      { k: 'now', j: '今' },
      { k: 'later', j: '後で' }
    ]},

  // Seed 74: This morning + this evening
  { n: 74, en: "This morning. This evening.", jp: "今朝。今晩。",
    legos: [
      { k: 'this morning', j: '今朝' },
      { k: 'this evening', j: '今晩' }
    ]},

  // Seed 75: Last week + next week
  { n: 75, en: "Last week. Next week.", jp: "先週。来週。",
    legos: [
      { k: 'last week', j: '先週' },
      { k: 'next week', j: '来週' }
    ]},

  // Seed 76: Past tense - did
  { n: 76, en: "I studied yesterday.", jp: "昨日勉強しました。",
    legos: [
      { k: 'did (past)', j: 'しました' }
    ]},

  // Seed 77: Went
  { n: 77, en: "I went to Tokyo.", jp: "東京に行きました。",
    legos: [
      { k: 'went', j: '行きました' },
      { k: 'Tokyo', j: '東京' },
      { k: 'to (direction)', j: 'に' }
    ]},

  // Seed 78: Ate + ramen
  { n: 78, en: "I ate ramen.", jp: "ラーメンを食べました。",
    legos: [
      { k: 'ate', j: '食べました' },
      { k: 'ramen', j: 'ラーメン' }
    ]},

  // Seed 79: Drank + saw
  { n: 79, en: "I drank sake. I saw a movie.", jp: "お酒を飲みました。映画を見ました。",
    legos: [
      { k: 'drank', j: '飲みました' },
      { k: 'saw / watched', j: '見ました' }
    ]},

  // Seed 80: Was fun / was good
  { n: 80, en: "It was fun. It was good.", jp: "楽しかったです。よかったです。",
    legos: [
      { k: 'was fun', j: '楽しかったです' },
      { k: 'was good', j: 'よかったです' }
    ]},

  // Seed 81: Where question + here/there
  { n: 81, en: "Where? Here. There.", jp: "どこですか。ここです。そこです。",
    legos: [
      { k: 'where', j: 'どこ' },
      { k: 'here', j: 'ここ' },
      { k: 'there', j: 'そこ' }
    ]},

  // Seed 82: When question
  { n: 82, en: "When?", jp: "いつですか。",
    legos: [
      { k: 'when', j: 'いつ' }
    ]},

  // Seed 83: How much + expensive
  { n: 83, en: "How much? That's expensive!", jp: "いくらですか。高いですね！",
    legos: [
      { k: 'how much', j: 'いくら' },
      { k: 'expensive', j: '高い' }
    ]},

  // Seed 84: Cheap + this one
  { n: 84, en: "This one is cheap.", jp: "これは安いです。",
    legos: [
      { k: 'cheap', j: '安い' }
    ]},

  // Seed 85: Which one
  { n: 85, en: "Which one?", jp: "どれですか。",
    legos: [
      { k: 'which (one)', j: 'どれ' }
    ]},

  // Seed 86: That one + delicious
  { n: 86, en: "That one is delicious.", jp: "それは美味しいです。",
    legos: [
      { k: 'delicious', j: '美味しい' }
    ]},

  // Seed 87: Because (reason frame)
  { n: 87, en: "Because it's interesting.", jp: "面白いからです。",
    legos: [
      { k: 'because', j: 'から' }
    ]},

  // Seed 88: So/therefore
  { n: 88, en: "It's difficult. So I'm studying.", jp: "難しいです。だから勉強しています。",
    legos: [
      { k: 'so / therefore', j: 'だから' }
    ]},

  // Seed 89: But/however
  { n: 89, en: "It's difficult. But it's fun.", jp: "難しいです。でも楽しいです。",
    legos: [
      { k: 'but / however', j: 'でも' }
    ]},

  // Seed 90: And/also + too
  { n: 90, en: "And Japanese too.", jp: "そして日本語も。",
    legos: [
      { k: 'and / then', j: 'そして' }
    ]},
]

// =============================================================================
// PHASE 4: ABILITY & ACTIONS (Seeds 91-120) - ~100 LEGOs
// "I can express what I can do and what I want to do"
// =============================================================================

const PHASE_4 = [
  // Seed 91: Can do frame
  { n: 91, en: "I can do it.", jp: "できます。",
    legos: [
      { k: 'can do', j: 'できます' }
    ]},

  // Seed 92: Can't do
  { n: 92, en: "I can't do it.", jp: "できません。",
    legos: [
      { k: "can't do", j: 'できません' }
    ]},

  // Seed 93: Can speak
  { n: 93, en: "I can speak a little Japanese.", jp: "日本語が少し話せます。",
    legos: [
      { k: 'can speak', j: '話せます' }
    ]},

  // Seed 94: Can't speak well
  { n: 94, en: "I can't speak well yet.", jp: "まだ上手に話せません。",
    legos: [
      { k: 'well / skillfully', j: '上手に' },
      { k: 'yet / still', j: 'まだ' }
    ]},

  // Seed 95: Can read + kanji
  { n: 95, en: "I can read hiragana. I can't read kanji.", jp: "ひらがなが読めます。漢字が読めません。",
    legos: [
      { k: 'can read', j: '読めます' },
      { k: "can't read", j: '読めません' },
      { k: 'hiragana', j: 'ひらがな' },
      { k: 'kanji', j: '漢字' }
    ]},

  // Seed 96: Can write
  { n: 96, en: "I can write a little.", jp: "少し書けます。",
    legos: [
      { k: 'can write', j: '書けます' }
    ]},

  // Seed 97: Want to (action) frame
  { n: 97, en: "I want to go.", jp: "行きたいです。",
    legos: [
      { k: 'want to go', j: '行きたいです' }
    ]},

  // Seed 98: Want to eat + want to drink
  { n: 98, en: "I want to eat sushi. I want to drink tea.", jp: "寿司が食べたいです。お茶が飲みたいです。",
    legos: [
      { k: 'want to eat', j: '食べたいです' },
      { k: 'want to drink', j: '飲みたいです' }
    ]},

  // Seed 99: Want to see + want to try
  { n: 99, en: "I want to see. I want to try.", jp: "見たいです。やってみたいです。",
    legos: [
      { k: 'want to see', j: '見たいです' },
      { k: 'want to try', j: 'やってみたいです' }
    ]},

  // Seed 100: Want to learn + want to know
  { n: 100, en: "I want to learn more. I want to know.", jp: "もっと学びたいです。知りたいです。",
    legos: [
      { k: 'want to learn', j: '学びたいです' },
      { k: 'want to know', j: '知りたいです' }
    ]},

  // Seed 101: Don't want to
  { n: 101, en: "I don't want to do that.", jp: "それはしたくないです。",
    legos: [
      { k: "don't want to do", j: 'したくないです' }
    ]},

  // Seed 102: Have to / must frame
  { n: 102, en: "I have to study.", jp: "勉強しなければなりません。",
    legos: [
      { k: 'have to / must', j: 'しなければなりません' }
    ]},

  // Seed 103: Need + necessary
  { n: 103, en: "Practice is necessary.", jp: "練習が必要です。",
    legos: [
      { k: 'practice', j: '練習' },
      { k: 'necessary', j: '必要' }
    ]},

  // Seed 104: Know / don't know
  { n: 104, en: "I know. I don't know.", jp: "知っています。知りません。",
    legos: [
      { k: 'know', j: '知っています' },
      { k: "don't know", j: '知りません' }
    ]},

  // Seed 105: Remember / forget
  { n: 105, en: "I remember. I forgot.", jp: "覚えています。忘れました。",
    legos: [
      { k: 'remember', j: '覚えています' },
      { k: 'forgot', j: '忘れました' }
    ]},

  // Seed 106: Wait please
  { n: 106, en: "Please wait a moment.", jp: "ちょっと待ってください。",
    legos: [
      { k: 'please wait', j: '待ってください' }
    ]},

  // Seed 107: Thinking
  { n: 107, en: "I'm thinking.", jp: "考えています。",
    legos: [
      { k: "I'm thinking", j: '考えています' }
    ]},

  // Seed 108: Let me think
  { n: 108, en: "Let me think.", jp: "考えさせてください。",
    legos: [
      { k: 'let me (do)', j: 'させてください' }
    ]},

  // Seed 109: Will go / will do (future)
  { n: 109, en: "I will go tomorrow.", jp: "明日行きます。",
    legos: [
      { k: 'will go / go', j: '行きます' }
    ]},

  // Seed 110: Will eat / will drink
  { n: 110, en: "I will eat later. I will drink coffee.", jp: "後で食べます。コーヒーを飲みます。",
    legos: [
      { k: 'will eat / eat', j: '食べます' },
      { k: 'will drink / drink', j: '飲みます' }
    ]},

  // Seed 111: Try + tried
  { n: 111, en: "I tried. I will try again.", jp: "やってみました。また やってみます。",
    legos: [
      { k: 'tried', j: 'やってみました' },
      { k: 'will try', j: 'やってみます' },
      { k: 'again', j: 'また' }
    ]},

  // Seed 112: Buy / bought
  { n: 112, en: "I bought this. I will buy that.", jp: "これを買いました。それを買います。",
    legos: [
      { k: 'bought', j: '買いました' },
      { k: 'will buy / buy', j: '買います' }
    ]},

  // Seed 113: Make / made
  { n: 113, en: "I made this. I will make it.", jp: "これを作りました。作ります。",
    legos: [
      { k: 'made', j: '作りました' },
      { k: 'will make / make', j: '作ります' }
    ]},

  // Seed 114: Use / using
  { n: 114, en: "I use this. I'm using it now.", jp: "これを使います。今使っています。",
    legos: [
      { k: 'use', j: '使います' },
      { k: 'using', j: '使っています' }
    ]},

  // Seed 115: Work / working
  { n: 115, en: "I work. I'm working now.", jp: "働きます。今働いています。",
    legos: [
      { k: 'work (verb)', j: '働きます' },
      { k: 'working', j: '働いています' }
    ]},

  // Seed 116: Live / living + Japan
  { n: 116, en: "I live in Japan.", jp: "日本に住んでいます。",
    legos: [
      { k: 'living / live', j: '住んでいます' },
      { k: 'Japan', j: '日本' }
    ]},

  // Seed 117: Come / came
  { n: 117, en: "I came from America.", jp: "アメリカから来ました。",
    legos: [
      { k: 'came', j: '来ました' },
      { k: 'from', j: 'から' },
      { k: 'America', j: 'アメリカ' }
    ]},

  // Seed 118: Return / go home
  { n: 118, en: "I will go home.", jp: "帰ります。",
    legos: [
      { k: 'go home / return', j: '帰ります' }
    ]},

  // Seed 119: Start / started + finish / finished
  { n: 119, en: "It started. It finished.", jp: "始まりました。終わりました。",
    legos: [
      { k: 'started', j: '始まりました' },
      { k: 'finished', j: '終わりました' }
    ]},

  // Seed 120: If possible + if OK
  { n: 120, en: "If possible. If it's OK.", jp: "できれば。よければ。",
    legos: [
      { k: 'if possible', j: 'できれば' },
      { k: "if it's OK", j: 'よければ' }
    ]},
]

// =============================================================================
// PHASE 5: INVOLVING OTHERS (Seeds 121-150) - ~100 LEGOs
// "I can talk about other people"
// =============================================================================

const PHASE_5 = [
  // Seed 121: He / she
  { n: 121, en: "He is Japanese. She is American.", jp: "彼は日本人です。彼女はアメリカ人です。",
    legos: [
      { k: 'he', j: '彼' },
      { k: 'she', j: '彼女' },
      { k: 'Japanese (person)', j: '日本人' },
      { k: 'American (person)', j: 'アメリカ人' }
    ]},

  // Seed 122: Friend + my friend
  { n: 122, en: "My friend. My Japanese friend.", jp: "私の友達。日本人の友達。",
    legos: [
      { k: 'friend', j: '友達' }
    ]},

  // Seed 123: Teacher + student
  { n: 123, en: "Teacher. Student.", jp: "先生。学生。",
    legos: [
      { k: 'teacher', j: '先生' },
      { k: 'student', j: '学生' }
    ]},

  // Seed 124: Family + parents
  { n: 124, en: "My family. My parents.", jp: "私の家族。私の両親。",
    legos: [
      { k: 'family', j: '家族' },
      { k: 'parents', j: '両親' }
    ]},

  // Seed 125: Mother + father
  { n: 125, en: "My mother. My father.", jp: "母。父。",
    legos: [
      { k: 'mother (own)', j: '母' },
      { k: 'father (own)', j: '父' }
    ]},

  // Seed 126: Older brother + older sister
  { n: 126, en: "Older brother. Older sister.", jp: "兄。姉。",
    legos: [
      { k: 'older brother', j: '兄' },
      { k: 'older sister', j: '姉' }
    ]},

  // Seed 127: Younger brother + younger sister
  { n: 127, en: "Younger brother. Younger sister.", jp: "弟。妹。",
    legos: [
      { k: 'younger brother', j: '弟' },
      { k: 'younger sister', j: '妹' }
    ]},

  // Seed 128: Children + child
  { n: 128, en: "Children. My child.", jp: "子供。私の子供。",
    legos: [
      { k: 'child / children', j: '子供' }
    ]},

  // Seed 129: Husband + wife
  { n: 129, en: "My husband. My wife.", jp: "主人。妻。",
    legos: [
      { k: 'husband', j: '主人' },
      { k: 'wife', j: '妻' }
    ]},

  // Seed 130: Boyfriend + girlfriend
  { n: 130, en: "Boyfriend. Girlfriend.", jp: "彼氏。彼女。",
    legos: [
      { k: 'boyfriend', j: '彼氏' },
      { k: 'girlfriend', j: '彼女' }
    ]},

  // Seed 131: Everyone + someone + no one
  { n: 131, en: "Everyone. Someone. No one.", jp: "みんな。誰か。誰も。",
    legos: [
      { k: 'everyone', j: 'みんな' },
      { k: 'someone', j: '誰か' },
      { k: 'no one', j: '誰も' }
    ]},

  // Seed 132: We + they
  { n: 132, en: "We. They.", jp: "私たち。彼ら。",
    legos: [
      { k: 'we', j: '私たち' },
      { k: 'they', j: '彼ら' }
    ]},

  // Seed 133: Together + with
  { n: 133, en: "Together. With my friend.", jp: "一緒に。友達と一緒に。",
    legos: [
      { k: 'together', j: '一緒に' },
      { k: 'with (person)', j: 'と' }
    ]},

  // Seed 134: He speaks Japanese
  { n: 134, en: "He speaks Japanese well.", jp: "彼は日本語を上手に話します。",
    legos: [
      { k: 'he speaks well', j: '彼は上手に話します' }
    ]},

  // Seed 135: She is studying
  { n: 135, en: "She is studying English.", jp: "彼女は英語を勉強しています。",
    legos: [
      { k: 'she is studying', j: '彼女は勉強しています' }
    ]},

  // Seed 136: My friend likes
  { n: 136, en: "My friend likes Japanese food.", jp: "友達は日本の食べ物が好きです。",
    legos: [
      { k: 'friend likes', j: '友達は好きです' }
    ]},

  // Seed 137: He said
  { n: 137, en: "He said it's good.", jp: "彼はいいと言いました。",
    legos: [
      { k: 'said', j: '言いました' }
    ]},

  // Seed 138: She thinks
  { n: 138, en: "She thinks it's interesting.", jp: "彼女は面白いと思っています。",
    legos: [
      { k: 'thinks (ongoing)', j: '思っています' }
    ]},

  // Seed 139: They are busy
  { n: 139, en: "They are busy.", jp: "彼らは忙しいです。",
    legos: [
      { k: 'they are busy', j: '彼らは忙しいです' }
    ]},

  // Seed 140: We went together
  { n: 140, en: "We went to Tokyo together.", jp: "私たちは一緒に東京に行きました。",
    legos: [
      { k: 'we went together', j: '私たちは一緒に行きました' }
    ]},

  // Seed 141: Work (noun) + company
  { n: 141, en: "Work. Company.", jp: "仕事。会社。",
    legos: [
      { k: 'work (noun)', j: '仕事' },
      { k: 'company', j: '会社' }
    ]},

  // Seed 142: Office + meeting
  { n: 142, en: "Office. Meeting.", jp: "オフィス。会議。",
    legos: [
      { k: 'office', j: 'オフィス' },
      { k: 'meeting', j: '会議' }
    ]},

  // Seed 143: He is at work
  { n: 143, en: "He is at work.", jp: "彼は仕事中です。",
    legos: [
      { k: 'in the middle of', j: '中' }
    ]},

  // Seed 144: She is in a meeting
  { n: 144, en: "She is in a meeting.", jp: "彼女は会議中です。",
    legos: [
      { k: 'in a meeting', j: '会議中' }
    ]},

  // Seed 145: He is kind + she is interesting
  { n: 145, en: "He is kind. She is interesting.", jp: "彼は親切です。彼女は面白いです。",
    legos: [
      { k: 'kind', j: '親切' }
    ]},

  // Seed 146: I think he is good
  { n: 146, en: "I think he is good.", jp: "彼はいいと思います。",
    legos: [
      { k: 'I think he is good', j: '彼はいいと思います' }
    ]},

  // Seed 147: To (person) + tell/teach
  { n: 147, en: "I told my friend.", jp: "友達に言いました。",
    legos: [
      { k: 'told (to person)', j: 'に言いました' }
    ]},

  // Seed 148: Ask + question
  { n: 148, en: "I asked. I have a question.", jp: "聞きました。質問があります。",
    legos: [
      { k: 'asked / heard', j: '聞きました' },
      { k: 'question', j: '質問' },
      { k: 'there is / have', j: 'あります' }
    ]},

  // Seed 149: Help + helped
  { n: 149, en: "Please help. He helped me.", jp: "助けてください。彼が助けてくれました。",
    legos: [
      { k: 'please help', j: '助けてください' },
      { k: 'helped (me)', j: '助けてくれました' }
    ]},

  // Seed 150: Let's + together
  { n: 150, en: "Let's study together. Let's go together.", jp: "一緒に勉強しましょう。一緒に行きましょう。",
    legos: [
      { k: "let's (do)", j: 'しましょう' },
      { k: "let's go", j: '行きましょう' }
    ]},
]

// =============================================================================
// COMBINE ALL PHASES
// =============================================================================

const ALL_SEEDS = [...PHASE_1, ...PHASE_2, ...PHASE_3, ...PHASE_4, ...PHASE_5]

// =============================================================================
// PHRASE GENERATION (Enhanced for richer vocabulary)
// =============================================================================

function generatePhrases(seed, allPreviousLegos) {
  const phrases = []

  // Always include the seed sentence itself
  phrases.push({ known: seed.en, target: seed.jp })

  // Add each LEGO as a phrase (unless it's a grammar marker)
  for (const lego of seed.legos) {
    if (!lego.k.startsWith('(')) {
      phrases.push({ known: lego.k, target: lego.j })
    }
  }

  // Generate recombinations based on available vocabulary
  const recombinations = generateRecombinations(seed, allPreviousLegos)
  phrases.push(...recombinations)

  return phrases.slice(0, 15) // Max 15 phrases per seed for richer practice
}

function generateRecombinations(seed, previousLegos) {
  const recombinations = []
  const n = seed.n

  // Collect vocabulary by category
  const languages = previousLegos.filter(l => l.k.includes('(language)')).map(l => ({ k: l.k.replace(' (language)', ''), j: l.j }))
  const adjectives = previousLegos.filter(l => ['good', 'difficult', 'easy', 'interesting', 'fun', 'important', 'new', 'busy', 'expensive', 'cheap', 'delicious', 'spicy', 'hot', 'cold', 'bad', 'amazing', 'kind'].some(a => l.k.includes(a)))
  const foods = previousLegos.filter(l => ['sushi', 'ramen', 'food', 'coffee', 'tea', 'water', 'beer', 'sake'].some(f => l.k.includes(f)))
  const people = previousLegos.filter(l => ['friend', 'teacher', 'student', 'mother', 'father', 'he', 'she', 'everyone'].some(p => l.k === p))

  // Phase 1: Language + adjective combinations
  if (n >= 6 && n <= 30 && languages.length > 0 && adjectives.length > 0) {
    for (const lang of languages.slice(0, 2)) {
      for (const adj of adjectives.slice(0, 2)) {
        recombinations.push({ known: `${lang.k} is ${adj.k}`, target: `${lang.j}は${adj.j}です` })
      }
    }
  }

  // Phase 2: Like/want + foods/things
  if (n >= 31 && n <= 60 && foods.length > 0) {
    for (const food of foods.slice(0, 3)) {
      recombinations.push({ known: `I like ${food.k}`, target: `${food.j}が好きです` })
      recombinations.push({ known: `I want ${food.k}`, target: `${food.j}が欲しいです` })
    }
  }

  // Phase 3+: Think + adjectives
  if (n >= 61 && adjectives.length > 0) {
    for (const adj of adjectives.slice(0, 2)) {
      recombinations.push({ known: `I think it's ${adj.k}`, target: `${adj.j}と思います` })
    }
  }

  // Phase 5: People + actions
  if (n >= 121 && people.length > 0 && languages.length > 0) {
    for (const person of people.slice(0, 2)) {
      recombinations.push({ known: `${person.k} speaks Japanese`, target: `${person.j}は日本語を話します` })
    }
  }

  return recombinations.slice(0, 6)
}

// =============================================================================
// BUILD FUNCTION
// =============================================================================

async function buildCourse() {
  console.log(`\nBuilding Japanese v3 BALANCED Course: ${COURSE_CODE}`)
  console.log('Target: ~500 LEGOs across 150 Seeds')
  console.log('='.repeat(60))

  // Check if exists
  const { data: existing } = await supabase
    .from('course_seeds')
    .select('seed_number')
    .eq('course_code', COURSE_CODE)

  if (existing && existing.length > 0) {
    if (process.argv.includes('--wipe')) {
      console.log('\nWiping existing course data...')
      await supabase.from('course_practice_phrases').delete().eq('course_code', COURSE_CODE)
      await supabase.from('course_legos').delete().eq('course_code', COURSE_CODE)
      await supabase.from('course_seeds').delete().eq('course_code', COURSE_CODE)
      console.log('✓ Wiped existing data')
    } else {
      console.log(`\n⚠️  Course exists with ${existing.length} seeds. Use --wipe to rebuild.`)
      return
    }
  }

  let totalLegos = 0
  let totalPhrases = 0
  const seenLegos = new Map()
  const allLegos = []

  for (const seed of ALL_SEEDS) {
    // Insert seed
    const { error: seedErr } = await supabase
      .from('course_seeds')
      .insert({
        course_code: COURSE_CODE,
        seed_number: seed.n,
        known_text: seed.en,
        target_text: seed.jp
      })

    if (seedErr) {
      console.error(`S${seed.n} seed error: ${seedErr.message}`)
      continue
    }

    // Insert LEGOs
    for (let i = 0; i < seed.legos.length; i++) {
      const lego = seed.legos[i]
      const legoIndex = i + 1
      const legoKey = `${lego.k}|${lego.j}`

      const isNew = !seenLegos.has(legoKey)
      if (isNew) seenLegos.set(legoKey, seed.n)

      const { error: legoErr } = await supabase
        .from('course_legos')
        .insert({
          course_code: COURSE_CODE,
          seed_number: seed.n,
          lego_index: legoIndex,
          type: 'A', // Simplified - all atomic for now
          known_text: lego.k,
          target_text: lego.j,
          is_new: isNew
        })

      if (!legoErr) {
        totalLegos++
        allLegos.push(lego)
      }
    }

    // Generate and insert phrases
    const phrases = generatePhrases(seed, allLegos)
    for (let p = 0; p < phrases.length; p++) {
      const phrase = phrases[p]
      const wordCount = phrase.known.split(/\s+/).length

      const { error: phraseErr } = await supabase
        .from('course_practice_phrases')
        .insert({
          course_code: COURSE_CODE,
          seed_number: seed.n,
          lego_index: 1,
          position: p + 1,
          word_count: wordCount,
          lego_count: 1,
          known_text: phrase.known,
          target_text: phrase.target
        })

      if (!phraseErr) totalPhrases++
    }

    // Progress indicator every 10 seeds
    if (seed.n % 10 === 0) {
      console.log(`  Completed seed ${seed.n}/150 (${totalLegos} LEGOs so far)`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('BUILD COMPLETE')
  console.log('='.repeat(60))
  console.log(`Seeds: ${ALL_SEEDS.length}`)
  console.log(`LEGOs: ${totalLegos} (avg ${(totalLegos / ALL_SEEDS.length).toFixed(2)}/seed)`)
  console.log(`Unique LEGOs: ${seenLegos.size}`)
  console.log(`Phrases: ${totalPhrases} (avg ${(totalPhrases / ALL_SEEDS.length).toFixed(1)}/seed)`)
  console.log(`\nCourse code: ${COURSE_CODE}`)
}

buildCourse().catch(err => {
  console.error('Build failed:', err.message)
  process.exit(1)
})
