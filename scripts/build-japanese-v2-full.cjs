#!/usr/bin/env node
/**
 * Japanese Test Course v2 - FULL 150 Seeds
 * Frame-based design maximizing speakability at every stage
 *
 * Layers covered:
 * - Layer 0: Meta (talking about learning) - Seeds 1-30
 * - Layer 1: Basic needs - Seeds 31-50
 * - Layer 2: Contributing & Reactions - Seeds 51-80
 * - Layer 3: Self & Opinions - Seeds 81-120
 * - Layer 4: Involving Others - Seeds 121-150
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const COURSE_CODE = 'jpn_for_eng_v2'

// =============================================================================
// ALL 150 SEEDS
// =============================================================================

const ALL_SEEDS = [
  // =========================================================================
  // PHASE 1: META FOUNDATION (Seeds 1-30)
  // "I can talk about learning Japanese"
  // =========================================================================

  { n: 1, en: "It's Japanese.", jp: "日本語です。",
    legos: [
      { t: 'A', k: 'Japanese', j: '日本語' },
      { t: 'A', k: 'is', j: 'です' }
    ]},

  { n: 2, en: "This is Japanese.", jp: "これは日本語です。",
    legos: [{ t: 'M', k: 'this is', j: 'これは' }]},

  { n: 3, en: "Is this Japanese?", jp: "これは日本語ですか。",
    legos: [{ t: 'A', k: '(question)', j: 'か' }]},

  { n: 4, en: "Is that Japanese?", jp: "それは日本語ですか。",
    legos: [{ t: 'M', k: 'that is', j: 'それは' }]},

  { n: 5, en: "Yes, that's right.", jp: "はい、そうです。",
    legos: [
      { t: 'A', k: 'yes', j: 'はい' },
      { t: 'M', k: "that's right", j: 'そうです' }
    ]},

  { n: 6, en: "No, it's different.", jp: "いいえ、違います。",
    legos: [
      { t: 'A', k: 'no', j: 'いいえ' },
      { t: 'M', k: "it's different", j: '違います' }
    ]},

  { n: 7, en: "This is good.", jp: "これはいいです。",
    legos: [{ t: 'A', k: 'good', j: 'いい' }]},

  { n: 8, en: "Is that good?", jp: "それはいいですか。",
    legos: [{ t: 'M', k: 'is that good?', j: 'それはいいですか' }]},

  { n: 9, en: "This is not good.", jp: "これはよくないです。",
    legos: [{ t: 'M', k: 'not good', j: 'よくないです' }]},

  { n: 10, en: "This is difficult.", jp: "これは難しいです。",
    legos: [{ t: 'A', k: 'difficult', j: '難しい' }]},

  { n: 11, en: "Japanese is difficult.", jp: "日本語は難しいです。",
    legos: [{ t: 'M', k: 'Japanese is difficult', j: '日本語は難しいです' }]},

  { n: 12, en: "This is interesting.", jp: "これは面白いです。",
    legos: [{ t: 'A', k: 'interesting', j: '面白い' }]},

  { n: 13, en: "Difficult but interesting.", jp: "難しいですけど面白いです。",
    legos: [{ t: 'A', k: 'but', j: 'けど' }]},

  { n: 14, en: "This is very good.", jp: "これはとてもいいです。",
    legos: [{ t: 'A', k: 'very', j: 'とても' }]},

  { n: 15, en: "I understand.", jp: "わかります。",
    legos: [{ t: 'M', k: 'I understand', j: 'わかります' }]},

  { n: 16, en: "I don't understand.", jp: "わかりません。",
    legos: [{ t: 'M', k: "I don't understand", j: 'わかりません' }]},

  { n: 17, en: "I understand a little.", jp: "少しわかります。",
    legos: [{ t: 'A', k: 'a little', j: '少し' }]},

  { n: 18, en: "I speak Japanese.", jp: "日本語を話します。",
    legos: [
      { t: 'A', k: '(object)', j: 'を' },
      { t: 'M', k: 'I speak', j: '話します' }
    ]},

  { n: 19, en: "I don't speak Japanese.", jp: "日本語を話しません。",
    legos: [{ t: 'M', k: "I don't speak", j: '話しません' }]},

  { n: 20, en: "I speak a little Japanese.", jp: "日本語を少し話します。",
    legos: [{ t: 'M', k: 'I speak a little', j: '少し話します' }]},

  { n: 21, en: "I study Japanese.", jp: "日本語を勉強します。",
    legos: [
      { t: 'A', k: 'study', j: '勉強' },
      { t: 'M', k: 'do', j: 'します' }
    ]},

  { n: 22, en: "I am studying Japanese.", jp: "日本語を勉強しています。",
    legos: [{ t: 'M', k: 'am doing', j: 'しています' }]},

  { n: 23, en: "Thank you.", jp: "ありがとうございます。",
    legos: [{ t: 'M', k: 'thank you', j: 'ありがとうございます' }]},

  { n: 24, en: "Please.", jp: "お願いします。",
    legos: [{ t: 'M', k: 'please', j: 'お願いします' }]},

  { n: 25, en: "Once more, please.", jp: "もう一度お願いします。",
    legos: [{ t: 'M', k: 'once more', j: 'もう一度' }]},

  { n: 26, en: "Slowly, please.", jp: "ゆっくりお願いします。",
    legos: [{ t: 'A', k: 'slowly', j: 'ゆっくり' }]},

  { n: 27, en: "What is this?", jp: "これは何ですか。",
    legos: [{ t: 'A', k: 'what', j: '何' }]},

  { n: 28, en: "This is fun.", jp: "これは楽しいです。",
    legos: [{ t: 'A', k: 'fun', j: '楽しい' }]},

  { n: 29, en: "This is easy.", jp: "これは簡単です。",
    legos: [{ t: 'A', k: 'easy', j: '簡単' }]},

  { n: 30, en: "Japanese is difficult but fun.", jp: "日本語は難しいですけど楽しいです。",
    legos: [{ t: 'M', k: 'difficult but fun', j: '難しいですけど楽しいです' }]},

  // =========================================================================
  // PHASE 2: WANTS & LIKES (Seeds 31-50)
  // "I can express what I want and like"
  // =========================================================================

  { n: 31, en: "I like this.", jp: "これが好きです。",
    legos: [
      { t: 'A', k: '(subject)', j: 'が' },
      { t: 'M', k: 'I like', j: '好きです' }
    ]},

  { n: 32, en: "I like Japanese.", jp: "日本語が好きです。",
    legos: [{ t: 'M', k: 'I like Japanese', j: '日本語が好きです' }]},

  { n: 33, en: "Do you like Japanese?", jp: "日本語が好きですか。",
    legos: [{ t: 'M', k: 'do you like?', j: '好きですか' }]},

  { n: 34, en: "I don't like that.", jp: "それは好きじゃないです。",
    legos: [{ t: 'M', k: "don't like", j: '好きじゃないです' }]},

  { n: 35, en: "I want this.", jp: "これが欲しいです。",
    legos: [{ t: 'M', k: 'I want', j: '欲しいです' }]},

  { n: 36, en: "I want coffee.", jp: "コーヒーが欲しいです。",
    legos: [{ t: 'A', k: 'coffee', j: 'コーヒー' }]},

  { n: 37, en: "I want water.", jp: "水が欲しいです。",
    legos: [{ t: 'A', k: 'water', j: '水' }]},

  { n: 38, en: "Coffee, please.", jp: "コーヒーをください。",
    legos: [{ t: 'M', k: 'please give', j: 'ください' }]},

  { n: 39, en: "I want time.", jp: "時間が欲しいです。",
    legos: [{ t: 'A', k: 'time', j: '時間' }]},

  { n: 40, en: "Now.", jp: "今。",
    legos: [{ t: 'A', k: 'now', j: '今' }]},

  { n: 41, en: "I'm okay.", jp: "大丈夫です。",
    legos: [{ t: 'M', k: "I'm okay", j: '大丈夫です' }]},

  { n: 42, en: "No problem.", jp: "問題ないです。",
    legos: [{ t: 'M', k: 'no problem', j: '問題ないです' }]},

  { n: 43, en: "I'm tired.", jp: "疲れています。",
    legos: [{ t: 'M', k: "I'm tired", j: '疲れています' }]},

  { n: 44, en: "A little tired.", jp: "少し疲れています。",
    legos: [{ t: 'M', k: 'a little tired', j: '少し疲れています' }]},

  { n: 45, en: "I'm busy.", jp: "忙しいです。",
    legos: [{ t: 'A', k: 'busy', j: '忙しい' }]},

  { n: 46, en: "I'm not busy.", jp: "忙しくないです。",
    legos: [{ t: 'M', k: 'not busy', j: '忙しくないです' }]},

  { n: 47, en: "I'm happy.", jp: "嬉しいです。",
    legos: [{ t: 'A', k: 'happy', j: '嬉しい' }]},

  { n: 48, en: "I'm very happy.", jp: "とても嬉しいです。",
    legos: [{ t: 'M', k: 'very happy', j: 'とても嬉しいです' }]},

  { n: 49, en: "How about you?", jp: "あなたは？",
    legos: [{ t: 'M', k: 'how about you?', j: 'あなたは' }]},

  { n: 50, en: "Me too.", jp: "私も。",
    legos: [
      { t: 'A', k: 'I/me', j: '私' },
      { t: 'A', k: 'also', j: 'も' }
    ]},

  // =========================================================================
  // PHASE 3: CONTRIBUTING & REACTIONS (Seeds 51-80)
  // "I can participate in conversation"
  // =========================================================================

  { n: 51, en: "I think so.", jp: "そう思います。",
    legos: [{ t: 'M', k: 'I think', j: '思います' }]},

  { n: 52, en: "I think it's good.", jp: "いいと思います。",
    legos: [{ t: 'M', k: 'I think it is', j: 'と思います' }]},

  { n: 53, en: "I don't think so.", jp: "そう思いません。",
    legos: [{ t: 'M', k: "I don't think", j: '思いません' }]},

  { n: 54, en: "Really?", jp: "本当ですか。",
    legos: [{ t: 'A', k: 'really/true', j: '本当' }]},

  { n: 55, en: "That's amazing.", jp: "すごいですね。",
    legos: [
      { t: 'A', k: 'amazing', j: 'すごい' },
      { t: 'A', k: "(isn't it)", j: 'ね' }
    ]},

  { n: 56, en: "That's nice.", jp: "いいですね。",
    legos: [{ t: 'M', k: "that's nice", j: 'いいですね' }]},

  { n: 57, en: "I see.", jp: "なるほど。",
    legos: [{ t: 'M', k: 'I see', j: 'なるほど' }]},

  { n: 58, en: "Of course.", jp: "もちろん。",
    legos: [{ t: 'M', k: 'of course', j: 'もちろん' }]},

  { n: 59, en: "Maybe.", jp: "たぶん。",
    legos: [{ t: 'A', k: 'maybe', j: 'たぶん' }]},

  { n: 60, en: "I'm not sure.", jp: "わかりません。",
    legos: [{ t: 'M', k: "I'm not sure", j: 'ちょっとわかりません' }]},

  { n: 61, en: "Today.", jp: "今日。",
    legos: [{ t: 'A', k: 'today', j: '今日' }]},

  { n: 62, en: "Tomorrow.", jp: "明日。",
    legos: [{ t: 'A', k: 'tomorrow', j: '明日' }]},

  { n: 63, en: "Yesterday.", jp: "昨日。",
    legos: [{ t: 'A', k: 'yesterday', j: '昨日' }]},

  { n: 64, en: "Later.", jp: "後で。",
    legos: [{ t: 'A', k: 'later', j: '後で' }]},

  { n: 65, en: "I'm busy today.", jp: "今日は忙しいです。",
    legos: [{ t: 'M', k: "I'm busy today", j: '今日は忙しいです' }]},

  { n: 66, en: "I'm free tomorrow.", jp: "明日は暇です。",
    legos: [{ t: 'A', k: 'free (time)', j: '暇' }]},

  { n: 67, en: "I studied yesterday.", jp: "昨日勉強しました。",
    legos: [{ t: 'M', k: 'did (past)', j: 'しました' }]},

  { n: 68, en: "I will study tomorrow.", jp: "明日勉強します。",
    legos: [{ t: 'M', k: 'I will study tomorrow', j: '明日勉強します' }]},

  { n: 69, en: "When?", jp: "いつですか。",
    legos: [{ t: 'A', k: 'when', j: 'いつ' }]},

  { n: 70, en: "Where?", jp: "どこですか。",
    legos: [{ t: 'A', k: 'where', j: 'どこ' }]},

  { n: 71, en: "Here.", jp: "ここです。",
    legos: [{ t: 'A', k: 'here', j: 'ここ' }]},

  { n: 72, en: "There.", jp: "そこです。",
    legos: [{ t: 'A', k: 'there', j: 'そこ' }]},

  { n: 73, en: "How much?", jp: "いくらですか。",
    legos: [{ t: 'A', k: 'how much', j: 'いくら' }]},

  { n: 74, en: "This one.", jp: "これです。",
    legos: [{ t: 'M', k: 'this one', j: 'これです' }]},

  { n: 75, en: "That one.", jp: "それです。",
    legos: [{ t: 'M', k: 'that one', j: 'それです' }]},

  { n: 76, en: "Which one?", jp: "どれですか。",
    legos: [{ t: 'A', k: 'which', j: 'どれ' }]},

  { n: 77, en: "I like this one.", jp: "これが好きです。",
    legos: [{ t: 'M', k: 'I like this one', j: 'これが好きです' }]},

  { n: 78, en: "I want that one.", jp: "それが欲しいです。",
    legos: [{ t: 'M', k: 'I want that one', j: 'それが欲しいです' }]},

  { n: 79, en: "Sorry.", jp: "すみません。",
    legos: [{ t: 'M', k: 'sorry/excuse me', j: 'すみません' }]},

  { n: 80, en: "It's okay.", jp: "大丈夫ですよ。",
    legos: [{ t: 'A', k: '(emphasis)', j: 'よ' }]},

  // =========================================================================
  // PHASE 4: ABILITY & DEEPER OPINIONS (Seeds 81-120)
  // "I can express what I can do and what I think"
  // =========================================================================

  { n: 81, en: "I can do it.", jp: "できます。",
    legos: [{ t: 'M', k: 'I can', j: 'できます' }]},

  { n: 82, en: "I can't do it.", jp: "できません。",
    legos: [{ t: 'M', k: "I can't", j: 'できません' }]},

  { n: 83, en: "I can speak a little.", jp: "少し話せます。",
    legos: [{ t: 'M', k: 'I can speak', j: '話せます' }]},

  { n: 84, en: "I can't speak well.", jp: "上手に話せません。",
    legos: [{ t: 'A', k: 'well/skillfully', j: '上手に' }]},

  { n: 85, en: "I can understand.", jp: "わかります。",
    legos: [{ t: 'M', k: 'I can understand', j: 'わかることができます' }]},

  { n: 86, en: "I want to speak.", jp: "話したいです。",
    legos: [{ t: 'M', k: 'I want to speak', j: '話したいです' }]},

  { n: 87, en: "I want to learn.", jp: "学びたいです。",
    legos: [{ t: 'M', k: 'I want to learn', j: '学びたいです' }]},

  { n: 88, en: "I want to try.", jp: "やってみたいです。",
    legos: [{ t: 'M', k: 'I want to try', j: 'やってみたいです' }]},

  { n: 89, en: "I don't want to.", jp: "したくないです。",
    legos: [{ t: 'M', k: "I don't want to", j: 'したくないです' }]},

  { n: 90, en: "I have to study.", jp: "勉強しなければなりません。",
    legos: [{ t: 'M', k: 'I have to', j: 'しなければなりません' }]},

  { n: 91, en: "I need to practice.", jp: "練習が必要です。",
    legos: [
      { t: 'A', k: 'practice', j: '練習' },
      { t: 'A', k: 'necessary', j: '必要' }
    ]},

  { n: 92, en: "It's important.", jp: "大切です。",
    legos: [{ t: 'A', k: 'important', j: '大切' }]},

  { n: 93, en: "It's not important.", jp: "大切じゃないです。",
    legos: [{ t: 'M', k: 'not important', j: '大切じゃないです' }]},

  { n: 94, en: "I think it's important.", jp: "大切だと思います。",
    legos: [{ t: 'M', k: 'I think it is important', j: '大切だと思います' }]},

  { n: 95, en: "I agree.", jp: "賛成です。",
    legos: [{ t: 'M', k: 'I agree', j: '賛成です' }]},

  { n: 96, en: "I disagree.", jp: "反対です。",
    legos: [{ t: 'M', k: 'I disagree', j: '反対です' }]},

  { n: 97, en: "I don't know.", jp: "知りません。",
    legos: [{ t: 'M', k: "I don't know", j: '知りません' }]},

  { n: 98, en: "I know.", jp: "知っています。",
    legos: [{ t: 'M', k: 'I know', j: '知っています' }]},

  { n: 99, en: "Do you know?", jp: "知っていますか。",
    legos: [{ t: 'M', k: 'do you know?', j: '知っていますか' }]},

  { n: 100, en: "I remember.", jp: "覚えています。",
    legos: [{ t: 'M', k: 'I remember', j: '覚えています' }]},

  { n: 101, en: "I don't remember.", jp: "覚えていません。",
    legos: [{ t: 'M', k: "I don't remember", j: '覚えていません' }]},

  { n: 102, en: "I forgot.", jp: "忘れました。",
    legos: [{ t: 'M', k: 'I forgot', j: '忘れました' }]},

  { n: 103, en: "Please wait.", jp: "待ってください。",
    legos: [{ t: 'M', k: 'please wait', j: '待ってください' }]},

  { n: 104, en: "Just a moment.", jp: "ちょっと待ってください。",
    legos: [{ t: 'A', k: 'a little/just', j: 'ちょっと' }]},

  { n: 105, en: "I'm thinking.", jp: "考えています。",
    legos: [{ t: 'M', k: "I'm thinking", j: '考えています' }]},

  { n: 106, en: "Let me think.", jp: "考えさせてください。",
    legos: [{ t: 'M', k: 'let me think', j: '考えさせてください' }]},

  { n: 107, en: "I tried.", jp: "やってみました。",
    legos: [{ t: 'M', k: 'I tried', j: 'やってみました' }]},

  { n: 108, en: "I will try.", jp: "やってみます。",
    legos: [{ t: 'M', k: 'I will try', j: 'やってみます' }]},

  { n: 109, en: "It was difficult.", jp: "難しかったです。",
    legos: [{ t: 'M', k: 'it was difficult', j: '難しかったです' }]},

  { n: 110, en: "It was fun.", jp: "楽しかったです。",
    legos: [{ t: 'M', k: 'it was fun', j: '楽しかったです' }]},

  { n: 111, en: "It was interesting.", jp: "面白かったです。",
    legos: [{ t: 'M', k: 'it was interesting', j: '面白かったです' }]},

  { n: 112, en: "It was good.", jp: "よかったです。",
    legos: [{ t: 'M', k: 'it was good', j: 'よかったです' }]},

  { n: 113, en: "Because it's difficult.", jp: "難しいからです。",
    legos: [{ t: 'A', k: 'because', j: 'から' }]},

  { n: 114, en: "Because I like it.", jp: "好きだからです。",
    legos: [{ t: 'M', k: 'because I like it', j: '好きだからです' }]},

  { n: 115, en: "So/therefore.", jp: "だから。",
    legos: [{ t: 'M', k: 'so/therefore', j: 'だから' }]},

  { n: 116, en: "But.", jp: "でも。",
    legos: [{ t: 'A', k: 'but/however', j: 'でも' }]},

  { n: 117, en: "And.", jp: "そして。",
    legos: [{ t: 'A', k: 'and/then', j: 'そして' }]},

  { n: 118, en: "Or.", jp: "または。",
    legos: [{ t: 'A', k: 'or', j: 'または' }]},

  { n: 119, en: "If possible.", jp: "できれば。",
    legos: [{ t: 'M', k: 'if possible', j: 'できれば' }]},

  { n: 120, en: "If you don't mind.", jp: "よければ。",
    legos: [{ t: 'M', k: "if you don't mind", j: 'よければ' }]},

  // =========================================================================
  // PHASE 5: INVOLVING OTHERS (Seeds 121-150)
  // "I can talk about other people"
  // =========================================================================

  { n: 121, en: "He.", jp: "彼。",
    legos: [{ t: 'A', k: 'he', j: '彼' }]},

  { n: 122, en: "She.", jp: "彼女。",
    legos: [{ t: 'A', k: 'she', j: '彼女' }]},

  { n: 123, en: "Friend.", jp: "友達。",
    legos: [{ t: 'A', k: 'friend', j: '友達' }]},

  { n: 124, en: "My friend.", jp: "私の友達。",
    legos: [{ t: 'A', k: '(possessive)', j: 'の' }]},

  { n: 125, en: "Teacher.", jp: "先生。",
    legos: [{ t: 'A', k: 'teacher', j: '先生' }]},

  { n: 126, en: "He is a teacher.", jp: "彼は先生です。",
    legos: [{ t: 'M', k: 'he is a teacher', j: '彼は先生です' }]},

  { n: 127, en: "She speaks Japanese.", jp: "彼女は日本語を話します。",
    legos: [{ t: 'M', k: 'she speaks Japanese', j: '彼女は日本語を話します' }]},

  { n: 128, en: "My friend likes Japanese.", jp: "友達は日本語が好きです。",
    legos: [{ t: 'M', k: 'friend likes Japanese', j: '友達は日本語が好きです' }]},

  { n: 129, en: "He said so.", jp: "彼がそう言いました。",
    legos: [{ t: 'M', k: 'said', j: '言いました' }]},

  { n: 130, en: "She thinks so.", jp: "彼女はそう思っています。",
    legos: [{ t: 'M', k: 'thinks', j: '思っています' }]},

  { n: 131, en: "Everyone.", jp: "みんな。",
    legos: [{ t: 'A', k: 'everyone', j: 'みんな' }]},

  { n: 132, en: "Someone.", jp: "誰か。",
    legos: [{ t: 'A', k: 'someone', j: '誰か' }]},

  { n: 133, en: "No one.", jp: "誰も。",
    legos: [{ t: 'A', k: 'no one', j: '誰も' }]},

  { n: 134, en: "Together.", jp: "一緒に。",
    legos: [{ t: 'M', k: 'together', j: '一緒に' }]},

  { n: 135, en: "With my friend.", jp: "友達と一緒に。",
    legos: [
      { t: 'A', k: 'with', j: 'と' },
      { t: 'M', k: 'with my friend', j: '友達と一緒に' }
    ]},

  { n: 136, en: "I studied with a friend.", jp: "友達と一緒に勉強しました。",
    legos: [{ t: 'M', k: 'studied with friend', j: '友達と一緒に勉強しました' }]},

  { n: 137, en: "We.", jp: "私たち。",
    legos: [{ t: 'A', k: 'we', j: '私たち' }]},

  { n: 138, en: "They.", jp: "彼ら。",
    legos: [{ t: 'A', k: 'they', j: '彼ら' }]},

  { n: 139, en: "We are studying.", jp: "私たちは勉強しています。",
    legos: [{ t: 'M', k: 'we are studying', j: '私たちは勉強しています' }]},

  { n: 140, en: "They speak Japanese.", jp: "彼らは日本語を話します。",
    legos: [{ t: 'M', k: 'they speak Japanese', j: '彼らは日本語を話します' }]},

  { n: 141, en: "Family.", jp: "家族。",
    legos: [{ t: 'A', k: 'family', j: '家族' }]},

  { n: 142, en: "Work.", jp: "仕事。",
    legos: [{ t: 'A', k: 'work', j: '仕事' }]},

  { n: 143, en: "I'm working.", jp: "仕事をしています。",
    legos: [{ t: 'M', k: "I'm working", j: '仕事をしています' }]},

  { n: 144, en: "He is busy with work.", jp: "彼は仕事で忙しいです。",
    legos: [
      { t: 'A', k: '(means/by)', j: 'で' },
      { t: 'M', k: 'busy with work', j: '仕事で忙しいです' }
    ]},

  { n: 145, en: "She is very kind.", jp: "彼女はとても親切です。",
    legos: [{ t: 'A', k: 'kind', j: '親切' }]},

  { n: 146, en: "He is interesting.", jp: "彼は面白いです。",
    legos: [{ t: 'M', k: 'he is interesting', j: '彼は面白いです' }]},

  { n: 147, en: "They are good.", jp: "彼らはいいです。",
    legos: [{ t: 'M', k: 'they are good', j: '彼らはいいです' }]},

  { n: 148, en: "I think he is kind.", jp: "彼は親切だと思います。",
    legos: [{ t: 'M', k: 'I think he is kind', j: '彼は親切だと思います' }]},

  { n: 149, en: "Everyone is studying.", jp: "みんな勉強しています。",
    legos: [{ t: 'M', k: 'everyone is studying', j: 'みんな勉強しています' }]},

  { n: 150, en: "Let's study together.", jp: "一緒に勉強しましょう。",
    legos: [{ t: 'M', k: "let's", j: 'しましょう' }]}
]

// =============================================================================
// PHRASE GENERATION
// =============================================================================

function generatePhrases(seed, allPreviousLegos) {
  const phrases = []

  // Always include the seed sentence itself
  phrases.push({ known: seed.en, target: seed.jp })

  // Add each LEGO as a phrase
  for (const lego of seed.legos) {
    if (!lego.k.startsWith('(')) { // Skip grammar markers
      phrases.push({ known: lego.k, target: lego.j })
    }
  }

  // Generate recombinations based on available vocabulary
  const vocab = collectVocab(allPreviousLegos, seed.legos)

  // Generate contextual recombinations
  const recombinations = generateRecombinations(seed, vocab)
  phrases.push(...recombinations)

  return phrases.slice(0, 12) // Max 12 phrases per seed
}

function collectVocab(previousLegos, currentLegos) {
  const vocab = {
    adjectives: [],
    verbs: [],
    nouns: [],
    expressions: [],
    particles: []
  }

  const allLegos = [...previousLegos, ...currentLegos]

  for (const lego of allLegos) {
    const k = lego.k || lego.known
    const j = lego.j || lego.target

    if (k.startsWith('(')) {
      vocab.particles.push({ k, j })
    } else if (['good', 'difficult', 'interesting', 'fun', 'easy', 'busy', 'happy', 'tired', 'important', 'kind'].includes(k)) {
      vocab.adjectives.push({ k, j })
    } else if (['speak', 'study', 'understand', 'do', 'think', 'know', 'remember', 'want', 'like'].some(v => k.includes(v))) {
      vocab.verbs.push({ k, j })
    } else if (['Japanese', 'coffee', 'water', 'time', 'friend', 'teacher', 'work', 'family'].includes(k)) {
      vocab.nouns.push({ k, j })
    } else {
      vocab.expressions.push({ k, j })
    }
  }

  return vocab
}

function generateRecombinations(seed, vocab) {
  const recombinations = []
  const n = seed.n

  // Generate based on seed number (what vocabulary is available)

  // Early seeds: basic combinations
  if (n >= 7 && n <= 30) {
    if (vocab.adjectives.length > 0) {
      // これは + adjective + です combinations
      for (const adj of vocab.adjectives.slice(0, 2)) {
        recombinations.push({ known: `this is ${adj.k}`, target: `これは${adj.j}です` })
        recombinations.push({ known: `that is ${adj.k}`, target: `それは${adj.j}です` })
      }
    }
  }

  // Mid seeds: more complex combinations
  if (n >= 31 && n <= 80) {
    // Like + noun combinations
    if (vocab.nouns.length > 0) {
      for (const noun of vocab.nouns.slice(0, 2)) {
        recombinations.push({ known: `I like ${noun.k}`, target: `${noun.j}が好きです` })
        recombinations.push({ known: `I want ${noun.k}`, target: `${noun.j}が欲しいです` })
      }
    }
  }

  // Late seeds: complex sentences
  if (n >= 81 && n <= 150) {
    // Opinion + adjective combinations
    if (vocab.adjectives.length > 0) {
      for (const adj of vocab.adjectives.slice(0, 2)) {
        recombinations.push({ known: `I think it's ${adj.k}`, target: `${adj.j}と思います` })
      }
    }
  }

  return recombinations.slice(0, 5) // Max 5 recombinations
}

// =============================================================================
// BUILD FUNCTION
// =============================================================================

async function buildCourse() {
  console.log(`\nBuilding Japanese v2 FULL Course: ${COURSE_CODE}`)
  console.log('150 Seeds - Frame-based design')
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
          type: lego.t,
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
      console.log(`  Completed seed ${seed.n}/150`)
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
