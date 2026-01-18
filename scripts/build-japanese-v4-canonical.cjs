#!/usr/bin/env node
/**
 * Japanese Course v4 - Canonical Concept-First Design
 *
 * Philosophy:
 * - Uses canonical seed concepts as the backbone (what learners WANT to say)
 * - Target-first: Natural Japanese expressions, back-translated to English
 * - LEGOs emerge from expressing complete thoughts (3-5 per seed naturally)
 * - Speakability layers: Meta → Basic Needs → Contributing → Self → Others
 *
 * Target: ~500 LEGOs across 150 seeds
 *
 * Formality: です/ます form (polite-casual) - universally safe
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const COURSE_CODE = 'jpn_for_eng_v4'

// =============================================================================
// PHASE 1: LAYER 0 - META (Seeds 1-50)
// "I can talk about the learning journey itself"
// Canonical concepts: intent, effort, progress, mistakes, requests, feelings about learning
// =============================================================================

const PHASE_1_META = [
  // --- BLOCK 1: Intent & Basic Effort (Seeds 1-10) ---

  { n: 1,
    jp: "日本語を話したいです。",
    en: "I want to speak Japanese.",
    legos: [
      { k: 'Japanese (language)', j: '日本語' },
      { k: '(object marker)', j: 'を' },
      { k: 'want to speak', j: '話したいです' }
    ]},

  { n: 2,
    jp: "今、あなたと話したいです。",
    en: "I want to speak with you now.",
    legos: [
      { k: 'now', j: '今' },
      { k: 'you', j: 'あなた' },
      { k: 'with', j: 'と' }
    ]},

  { n: 3,
    jp: "日本語を勉強しています。",
    en: "I'm studying Japanese.",
    legos: [
      { k: 'study', j: '勉強' },
      { k: 'am doing', j: 'しています' }
    ]},

  { n: 4,
    jp: "毎日勉強しています。",
    en: "I study every day.",
    legos: [
      { k: 'every day', j: '毎日' }
    ]},

  { n: 5,
    jp: "できるだけ話したいです。",
    en: "I want to speak as much as possible.",
    legos: [
      { k: 'as much as possible', j: 'できるだけ' }
    ]},

  { n: 6,
    jp: "日本語を少し話します。",
    en: "I speak a little Japanese now.",
    legos: [
      { k: 'a little', j: '少し' },
      { k: 'speak', j: '話します' }
    ]},

  { n: 7,
    jp: "まだあまり上手じゃないです。",
    en: "I'm not very good yet.",
    legos: [
      { k: 'yet / still', j: 'まだ' },
      { k: 'not very', j: 'あまり' },
      { k: 'good at / skilled', j: '上手' },
      { k: 'is not', j: 'じゃないです' }
    ]},

  { n: 8,
    jp: "でも、頑張っています。",
    en: "But I'm trying hard.",
    legos: [
      { k: 'but', j: 'でも' },
      { k: 'trying hard', j: '頑張っています' }
    ]},

  { n: 9,
    jp: "日本語を覚えようとしています。",
    en: "I'm trying to learn Japanese.",
    legos: [
      { k: 'trying to learn/remember', j: '覚えようとしています' }
    ]},

  { n: 10,
    jp: "言葉を思い出そうとしています。",
    en: "I'm trying to remember a word.",
    legos: [
      { k: 'word', j: '言葉' },
      { k: 'trying to remember', j: '思い出そうとしています' }
    ]},

  // --- BLOCK 2: Uncertainty & Comprehension (Seeds 11-20) ---

  { n: 11,
    jp: "全部覚えられるかどうかわかりません。",
    en: "I'm not sure if I can remember the whole thing.",
    legos: [
      { k: 'everything / the whole thing', j: '全部' },
      { k: 'can remember', j: '覚えられる' },
      { k: 'whether or not', j: 'かどうか' },
      { k: "don't know", j: 'わかりません' }
    ]},

  { n: 12,
    jp: "わかりますか。",
    en: "Do you understand?",
    legos: [
      { k: 'understand', j: 'わかります' },
      { k: '(question)', j: 'か' }
    ]},

  { n: 13,
    jp: "はい、わかります。",
    en: "Yes, I understand.",
    legos: [
      { k: 'yes', j: 'はい' }
    ]},

  { n: 14,
    jp: "すみません、わかりませんでした。",
    en: "Sorry, I didn't understand.",
    legos: [
      { k: 'sorry / excuse me', j: 'すみません' },
      { k: "didn't understand", j: 'わかりませんでした' }
    ]},

  { n: 15,
    jp: "今言ったことがわかりませんでした。",
    en: "I didn't understand what you just said.",
    legos: [
      { k: 'what (you) said', j: '言ったこと' },
      { k: 'just now', j: '今' }
    ]},

  { n: 16,
    jp: "もう一度言ってください。",
    en: "Please say it again.",
    legos: [
      { k: 'one more time', j: 'もう一度' },
      { k: 'please say', j: '言ってください' }
    ]},

  { n: 17,
    jp: "もう少しゆっくり話してください。",
    en: "Please speak a little more slowly.",
    legos: [
      { k: 'a little more', j: 'もう少し' },
      { k: 'slowly', j: 'ゆっくり' },
      { k: 'please speak', j: '話してください' }
    ]},

  { n: 18,
    jp: "ゆっくり話してもらえると助かります。",
    en: "It would help if you could speak slowly.",
    legos: [
      { k: 'if you could (do for me)', j: 'してもらえると' },
      { k: 'it helps / I appreciate', j: '助かります' }
    ]},

  { n: 19,
    jp: "これは日本語で何と言いますか。",
    en: "How do you say this in Japanese?",
    legos: [
      { k: 'this', j: 'これ' },
      { k: 'in Japanese', j: '日本語で' },
      { k: 'what / how', j: '何と' },
      { k: 'say', j: '言います' }
    ]},

  { n: 20,
    jp: "意味がわかりません。",
    en: "I don't understand the meaning.",
    legos: [
      { k: 'meaning', j: '意味' },
      { k: '(subject marker)', j: 'が' }
    ]},

  // --- BLOCK 3: Mistakes & Mindset (Seeds 21-30) ---

  { n: 21,
    jp: "間違いを気にしません。",
    en: "I don't worry about mistakes.",
    legos: [
      { k: 'mistake', j: '間違い' },
      { k: "don't mind / don't worry about", j: '気にしません' }
    ]},

  { n: 22,
    jp: "間違いは大切だと思います。",
    en: "I think mistakes are important.",
    legos: [
      { k: 'important', j: '大切' },
      { k: 'I think (that)', j: 'だと思います' }
    ]},

  { n: 23,
    jp: "間違えても大丈夫です。",
    en: "It's okay to make mistakes.",
    legos: [
      { k: 'even if (I) make a mistake', j: '間違えても' },
      { k: 'okay / fine', j: '大丈夫です' }
    ]},

  { n: 24,
    jp: "完璧じゃなくても大丈夫です。",
    en: "It's okay not to be perfect.",
    legos: [
      { k: 'perfect', j: '完璧' },
      { k: 'even if not', j: 'じゃなくても' }
    ]},

  { n: 25,
    jp: "話すことが一番大切です。",
    en: "Speaking is the most important thing.",
    legos: [
      { k: 'the act of speaking', j: '話すこと' },
      { k: 'most', j: '一番' }
    ]},

  { n: 26,
    jp: "完璧より練習が大事です。",
    en: "Practice is more important than perfection.",
    legos: [
      { k: 'practice', j: '練習' },
      { k: 'than', j: 'より' },
      { k: 'important', j: '大事' }
    ]},

  { n: 27,
    jp: "自信がないですけど、やってみます。",
    en: "I'm not confident, but I'll try.",
    legos: [
      { k: 'confidence', j: '自信' },
      { k: "don't have / there isn't", j: 'がないです' },
      { k: 'but', j: 'けど' },
      { k: "I'll try", j: 'やってみます' }
    ]},

  { n: 28,
    jp: "難しいですけど、楽しいです。",
    en: "It's difficult but fun.",
    legos: [
      { k: 'difficult', j: '難しい' },
      { k: 'fun', j: '楽しい' },
      { k: 'is (polite)', j: 'です' }
    ]},

  { n: 29,
    jp: "日本語は難しいですけど、面白いです。",
    en: "Japanese is difficult but interesting.",
    legos: [
      { k: 'interesting', j: '面白い' },
      { k: '(topic marker)', j: 'は' }
    ]},

  { n: 30,
    jp: "日本語を勉強するのが好きです。",
    en: "I like studying Japanese.",
    legos: [
      { k: 'studying (nominalized)', j: '勉強するの' },
      { k: 'like', j: '好きです' }
    ]},

  // --- BLOCK 4: Progress & Feelings (Seeds 31-40) ---

  { n: 31,
    jp: "だんだんわかるようになってきました。",
    en: "I'm gradually starting to understand.",
    legos: [
      { k: 'gradually', j: 'だんだん' },
      { k: 'have come to (understand)', j: 'わかるようになってきました' }
    ]},

  { n: 32,
    jp: "前よりよくわかります。",
    en: "I understand better than before.",
    legos: [
      { k: 'than before', j: '前より' },
      { k: 'well / better', j: 'よく' }
    ]},

  { n: 33,
    jp: "今日は昨日より上手だと思います。",
    en: "I think I'm better today than yesterday.",
    legos: [
      { k: 'today', j: '今日' },
      { k: 'yesterday', j: '昨日' }
    ]},

  { n: 34,
    jp: "思ったより早く上達しています。",
    en: "I'm improving faster than I thought.",
    legos: [
      { k: 'than I thought', j: '思ったより' },
      { k: 'fast / early', j: '早く' },
      { k: 'improving', j: '上達しています' }
    ]},

  { n: 35,
    jp: "自分の進歩に驚いています。",
    en: "I'm surprised at my own progress.",
    legos: [
      { k: "one's own", j: '自分の' },
      { k: 'progress', j: '進歩' },
      { k: 'surprised', j: '驚いています' }
    ]},

  { n: 36,
    jp: "今まで学んだことが嬉しいです。",
    en: "I'm happy with what I've learned so far.",
    legos: [
      { k: 'until now / so far', j: '今まで' },
      { k: 'what I learned', j: '学んだこと' },
      { k: 'happy', j: '嬉しい' }
    ]},

  { n: 37,
    jp: "もっと勉強したいです。",
    en: "I want to study more.",
    legos: [
      { k: 'more', j: 'もっと' },
      { k: 'want to study', j: '勉強したいです' }
    ]},

  { n: 38,
    jp: "まだまだ学ぶことがたくさんあります。",
    en: "There's still a lot to learn.",
    legos: [
      { k: 'still (emphasis)', j: 'まだまだ' },
      { k: 'things to learn', j: '学ぶこと' },
      { k: 'a lot', j: 'たくさん' },
      { k: 'there is', j: 'あります' }
    ]},

  { n: 39,
    jp: "ありがとうございます、でももっと学びたいです。",
    en: "Thank you, but I want to learn more.",
    legos: [
      { k: 'thank you', j: 'ありがとうございます' },
      { k: 'want to learn', j: '学びたいです' }
    ]},

  { n: 40,
    jp: "日本語がもっと上手になりたいです。",
    en: "I want to become better at Japanese.",
    legos: [
      { k: 'want to become', j: 'になりたいです' },
      { k: 'more skilled', j: 'もっと上手' }
    ]},

  // --- BLOCK 5: About the Other Person (Seeds 41-50) ---

  { n: 41,
    jp: "日本語がとても上手ですね。",
    en: "Your Japanese is very good.",
    legos: [
      { k: 'very', j: 'とても' },
      { k: "(isn't it / right)", j: 'ね' }
    ]},

  { n: 42,
    jp: "いつから日本語を勉強していますか。",
    en: "How long have you been studying Japanese?",
    legos: [
      { k: 'since when', j: 'いつから' },
      { k: 'have been studying', j: '勉強していますか' }
    ]},

  { n: 43,
    jp: "一週間ぐらい勉強しています。",
    en: "I've been studying for about a week.",
    legos: [
      { k: 'one week', j: '一週間' },
      { k: 'about / approximately', j: 'ぐらい' }
    ]},

  { n: 44,
    jp: "いつ勉強を始めましたか。",
    en: "When did you start studying?",
    legos: [
      { k: 'when', j: 'いつ' },
      { k: 'started', j: '始めました' }
    ]},

  { n: 45,
    jp: "先月から始めました。",
    en: "I started last month.",
    legos: [
      { k: 'last month', j: '先月' },
      { k: 'from / since', j: 'から' }
    ]},

  { n: 46,
    jp: "とても上手だと思いますよ。",
    en: "I think you're doing very well.",
    legos: [
      { k: 'I think (that)', j: 'と思います' },
      { k: '(emphasis)', j: 'よ' }
    ]},

  { n: 47,
    jp: "あなたの発音はとてもいいです。",
    en: "Your pronunciation is very good.",
    legos: [
      { k: 'your', j: 'あなたの' },
      { k: 'pronunciation', j: '発音' },
      { k: 'good', j: 'いい' }
    ]},

  { n: 48,
    jp: "他の人と練習したいです。",
    en: "I want to practice with other people.",
    legos: [
      { k: 'other people', j: '他の人' },
      { k: 'want to practice', j: '練習したいです' }
    ]},

  { n: 49,
    jp: "一緒に練習しましょう。",
    en: "Let's practice together.",
    legos: [
      { k: 'together', j: '一緒に' },
      { k: "let's practice", j: '練習しましょう' }
    ]},

  { n: 50,
    jp: "日本語をもっと話す機会が欲しいです。",
    en: "I want more opportunities to speak Japanese.",
    legos: [
      { k: 'opportunity / chance', j: '機会' },
      { k: 'want (thing)', j: '欲しいです' },
      { k: 'to speak more', j: 'もっと話す' }
    ]},
]

// =============================================================================
// PHASE 2: LAYERS 1-2 - BASIC NEEDS & CONTRIBUTING (Seeds 51-100)
// "I can express needs and participate in conversation"
// =============================================================================

const PHASE_2_NEEDS_CONTRIBUTING = [
  // --- BLOCK 6: Physical States & Needs (Seeds 51-65) ---

  { n: 51,
    jp: "少し疲れています。",
    en: "I'm a little tired.",
    legos: [
      { k: 'tired', j: '疲れています' }
    ]},

  { n: 52,
    jp: "今朝は少し疲れています。",
    en: "I'm a little tired this morning.",
    legos: [
      { k: 'this morning', j: '今朝' }
    ]},

  { n: 53,
    jp: "大丈夫ですけど、疲れ始めています。",
    en: "I'm okay, but I'm starting to feel tired.",
    legos: [
      { k: 'starting to get tired', j: '疲れ始めています' }
    ]},

  { n: 54,
    jp: "今、どう感じていますか。",
    en: "How do you feel right now?",
    legos: [
      { k: 'how', j: 'どう' },
      { k: 'feeling', j: '感じています' }
    ]},

  { n: 55,
    jp: "元気です。",
    en: "I'm fine / I feel good.",
    legos: [
      { k: 'fine / energetic', j: '元気' }
    ]},

  { n: 56,
    jp: "もう少し時間が必要です。",
    en: "I need a little more time.",
    legos: [
      { k: 'time', j: '時間' },
      { k: 'necessary / need', j: '必要です' }
    ]},

  { n: 57,
    jp: "まだ準備ができていません。",
    en: "I'm not ready yet.",
    legos: [
      { k: 'preparation / ready', j: '準備' },
      { k: 'is not done', j: 'ができていません' }
    ]},

  { n: 58,
    jp: "もう行かなければなりません。",
    en: "I have to go now.",
    legos: [
      { k: 'already / now', j: 'もう' },
      { k: 'go', j: '行く' },
      { k: 'have to', j: 'なければなりません' }
    ]},

  { n: 59,
    jp: "早く出なければならなくて、すみません。",
    en: "Sorry I have to leave early.",
    legos: [
      { k: 'early', j: '早く' },
      { k: 'leave / go out', j: '出る' },
      { k: 'have to and (regret)', j: 'なければならなくて' }
    ]},

  { n: 60,
    jp: "今日は忙しいです。",
    en: "I'm busy today.",
    legos: [
      { k: 'busy', j: '忙しい' }
    ]},

  { n: 61,
    jp: "明日の夜は忙しいです。",
    en: "I'm busy tomorrow night.",
    legos: [
      { k: 'tomorrow', j: '明日' },
      { k: 'night', j: '夜' }
    ]},

  { n: 62,
    jp: "すみませんが、今日は忙しすぎます。",
    en: "Sorry, but I'm too busy today.",
    legos: [
      { k: 'too (much)', j: 'すぎます' }
    ]},

  { n: 63,
    jp: "何か飲みたいですか。",
    en: "Would you like something to drink?",
    legos: [
      { k: 'something', j: '何か' },
      { k: 'want to drink', j: '飲みたいです' }
    ]},

  { n: 64,
    jp: "いいえ、大丈夫です。喉が渇いていません。",
    en: "No, I'm fine. I'm not thirsty.",
    legos: [
      { k: 'no', j: 'いいえ' },
      { k: 'thirsty', j: '喉が渇いています' },
      { k: 'not', j: 'いません' }
    ]},

  { n: 65,
    jp: "水をください。",
    en: "Water, please.",
    legos: [
      { k: 'water', j: '水' },
      { k: 'please give', j: 'ください' }
    ]},

  // --- BLOCK 7: Reactions & Contributing (Seeds 66-80) ---

  { n: 66,
    jp: "それはいい考えだと思います。",
    en: "I think that's a good idea.",
    legos: [
      { k: 'that', j: 'それ' },
      { k: 'idea / thought', j: '考え' }
    ]},

  { n: 67,
    jp: "問題ないです。大丈夫ですよ。",
    en: "No problem. Everything is okay.",
    legos: [
      { k: 'problem', j: '問題' },
      { k: 'there is no', j: 'ないです' }
    ]},

  { n: 68,
    jp: "ご親切にありがとうございます。",
    en: "That's very kind of you.",
    legos: [
      { k: 'kindness (honorific)', j: 'ご親切' },
      { k: 'thank you for', j: 'にありがとうございます' }
    ]},

  { n: 69,
    jp: "それは前に話していたことと同じですね。",
    en: "That's the same thing we were talking about earlier.",
    legos: [
      { k: 'before / earlier', j: '前に' },
      { k: 'were talking about', j: '話していた' },
      { k: 'same', j: '同じ' }
    ]},

  { n: 70,
    jp: "別のことを話しましょう。",
    en: "Let's talk about something else.",
    legos: [
      { k: 'different / another', j: '別の' },
      { k: 'thing', j: 'こと' },
      { k: "let's talk", j: '話しましょう' }
    ]},

  { n: 71,
    jp: "どう思いますか。",
    en: "What do you think about that?",
    legos: [
      { k: 'think', j: '思います' }
    ]},

  { n: 72,
    jp: "面白いと思います。",
    en: "I think it's interesting.",
    legos: [
      { k: 'I think it is', j: 'と思います' }
    ]},

  { n: 73,
    jp: "本当かどうかわかりません。",
    en: "I'm not sure if it's true.",
    legos: [
      { k: 'true / really', j: '本当' }
    ]},

  { n: 74,
    jp: "はい、それは助かります。",
    en: "Yes, that would be very helpful.",
    legos: [
      { k: 'helpful / it helps', j: '助かります' }
    ]},

  { n: 75,
    jp: "いいえ、大丈夫です。自分でできます。",
    en: "No thank you, I can manage on my own.",
    legos: [
      { k: 'by myself', j: '自分で' },
      { k: 'can do', j: 'できます' }
    ]},

  { n: 76,
    jp: "今のところ満足しています。",
    en: "I'm happy so far.",
    legos: [
      { k: 'for now / so far', j: '今のところ' },
      { k: 'satisfied / content', j: '満足しています' }
    ]},

  { n: 77,
    jp: "はい、いい考えですね。",
    en: "Yes, that's a good idea.",
    legos: [
      { k: 'good idea', j: 'いい考え' }
    ]},

  { n: 78,
    jp: "質問してもいいですか。",
    en: "Do you mind if I ask you some questions?",
    legos: [
      { k: 'question', j: '質問' },
      { k: 'is it okay to', j: 'してもいいですか' }
    ]},

  { n: 79,
    jp: "もちろん、どうぞ。",
    en: "Of course, go ahead.",
    legos: [
      { k: 'of course', j: 'もちろん' },
      { k: 'please / go ahead', j: 'どうぞ' }
    ]},

  { n: 80,
    jp: "それは予想していませんでした。面白いですね。",
    en: "That was unexpected. How interesting.",
    legos: [
      { k: 'expecting', j: '予想しています' },
      { k: 'was not', j: 'いませんでした' }
    ]},

  // --- BLOCK 8: Difficulty & Struggle (Seeds 81-90) ---

  { n: 81,
    jp: "時間内に答えるのが難しいです。",
    en: "It's difficult to answer in time.",
    legos: [
      { k: 'within time', j: '時間内に' },
      { k: 'to answer', j: '答える' },
      { k: 'difficult', j: '難しいです' }
    ]},

  { n: 82,
    jp: "早く考えるのが難しいです。",
    en: "It's difficult to think quickly enough.",
    legos: [
      { k: 'quickly', j: '早く' },
      { k: 'to think', j: '考える' }
    ]},

  { n: 83,
    jp: "この言語をもっと知りたいです。",
    en: "I'm enjoying finding out more about this language.",
    legos: [
      { k: 'this', j: 'この' },
      { k: 'language', j: '言語' },
      { k: 'want to know', j: '知りたいです' }
    ]},

  { n: 84,
    jp: "昨日より調子が悪いと感じます。",
    en: "I feel like I'm doing worse today than yesterday.",
    legos: [
      { k: 'condition / how one is doing', j: '調子' },
      { k: 'bad / worse', j: '悪い' },
      { k: 'feel', j: '感じます' }
    ]},

  { n: 85,
    jp: "まだ会話する準備ができていない気がします。",
    en: "I don't feel like I'm ready to have a conversation yet.",
    legos: [
      { k: 'conversation', j: '会話' },
      { k: 'feel like / sense', j: '気がします' }
    ]},

  { n: 86,
    jp: "前回よりは絶対に上手です。",
    en: "I'm definitely doing better than last time.",
    legos: [
      { k: 'last time', j: '前回' },
      { k: 'definitely', j: '絶対に' }
    ]},

  { n: 87,
    jp: "簡単になってきて、嬉しいです。",
    en: "It's starting to feel easier and I'm excited.",
    legos: [
      { k: 'easy', j: '簡単' },
      { k: 'becoming', j: 'になってきて' },
      { k: 'happy / glad', j: '嬉しいです' }
    ]},

  { n: 88,
    jp: "たくさん話すことが完璧より大事です。",
    en: "It's more important to talk often than to be perfect.",
    legos: [
      { k: 'a lot / often', j: 'たくさん' },
      { k: 'more important than', j: 'より大事です' }
    ]},

  { n: 89,
    jp: "この言葉はどういう意味ですか。",
    en: "What does this word mean?",
    legos: [
      { k: 'what kind of', j: 'どういう' }
    ]},

  { n: 90,
    jp: "言いたいことを説明してみます。",
    en: "I'm going to try to explain what I mean.",
    legos: [
      { k: 'what I want to say', j: '言いたいこと' },
      { k: 'explain', j: '説明する' },
      { k: "I'll try", j: 'してみます' }
    ]},

  // --- BLOCK 9: Wants & Desires (Seeds 91-100) ---

  { n: 91,
    jp: "終わってから話したいです。",
    en: "I'd like to speak after you finish.",
    legos: [
      { k: 'after finishing', j: '終わってから' },
      { k: 'want to talk', j: '話したいです' }
    ]},

  { n: 92,
    jp: "明日何が起こるか予想したくないです。",
    en: "I wouldn't like to guess what's going to happen tomorrow.",
    legos: [
      { k: 'what will happen', j: '何が起こるか' },
      { k: 'guess / predict', j: '予想する' },
      { k: "don't want to", j: 'したくないです' }
    ]},

  { n: 93,
    jp: "もうすぐ行く準備ができそうな気がします。",
    en: "I like feeling as if I'm nearly ready to go.",
    legos: [
      { k: 'soon', j: 'もうすぐ' },
      { k: 'seems like', j: 'そうな気がします' }
    ]},

  { n: 94,
    jp: "答えるのに時間をかけすぎたくないです。",
    en: "I don't like taking too much time to answer.",
    legos: [
      { k: 'to take time', j: '時間をかける' },
      { k: 'too much', j: 'すぎる' }
    ]},

  { n: 95,
    jp: "友達と面白いことをするのが好きです。",
    en: "I enjoy doing interesting things with my friends.",
    legos: [
      { k: 'friend(s)', j: '友達' },
      { k: 'interesting things', j: '面白いこと' },
      { k: 'doing (nominalized)', j: 'するの' }
    ]},

  { n: 96,
    jp: "何か聞きたいことがありました。",
    en: "I wanted to ask you something.",
    legos: [
      { k: 'something I want to ask', j: '聞きたいこと' },
      { k: 'there was', j: 'がありました' }
    ]},

  { n: 97,
    jp: "昨日聞きたかったです。",
    en: "I wanted to ask you yesterday.",
    legos: [
      { k: 'wanted to ask', j: '聞きたかったです' }
    ]},

  { n: 98,
    jp: "できるだけ早く終わらせようとはしていません。",
    en: "I'm not trying to finish as quickly as possible.",
    legos: [
      { k: 'finish', j: '終わらせる' },
      { k: 'trying to (not)', j: 'ようとはしていません' }
    ]},

  { n: 99,
    jp: "しばらく本を読みたいです。",
    en: "I'd like to read my book for a while.",
    legos: [
      { k: 'for a while', j: 'しばらく' },
      { k: 'book', j: '本' },
      { k: 'want to read', j: '読みたいです' }
    ]},

  { n: 100,
    jp: "コーヒーか紅茶が欲しいですか。",
    en: "Do you want a cup of coffee or tea?",
    legos: [
      { k: 'coffee', j: 'コーヒー' },
      { k: 'or', j: 'か' },
      { k: 'tea', j: '紅茶' }
    ]},
]

// =============================================================================
// PHASE 3: LAYERS 3-4 - SELF & OTHERS (Seeds 101-150)
// "I can express opinions and talk about other people"
// =============================================================================

const PHASE_3_SELF_OTHERS = [
  // --- BLOCK 10: Opinions & Agreement (Seeds 101-115) ---

  { n: 101,
    jp: "あなたが友達について言ったことに賛成です。",
    en: "I agree with what you said about your friend.",
    legos: [
      { k: 'about', j: 'について' },
      { k: 'what you said', j: '言ったこと' },
      { k: 'agree', j: '賛成です' }
    ]},

  { n: 102,
    jp: "彼が友達について言ったことには賛成しません。",
    en: "I don't agree with what he said about my friend.",
    legos: [
      { k: 'he', j: '彼' },
      { k: "don't agree", j: '賛成しません' }
    ]},

  { n: 103,
    jp: "バスで行くのが好きなのは面白いですね。",
    en: "It's interesting that you like to go by bus.",
    legos: [
      { k: 'bus', j: 'バス' },
      { k: 'by (means)', j: 'で' },
      { k: 'that (fact)', j: 'のは' }
    ]},

  { n: 104,
    jp: "あなたの考えはとても良かったと思います。",
    en: "I believe your idea was very good.",
    legos: [
      { k: 'believe / think', j: '思います' },
      { k: 'was good', j: '良かった' }
    ]},

  { n: 105,
    jp: "なぜそれがそんなにいいと思うのかわかりません。",
    en: "I don't know why you think it's so good.",
    legos: [
      { k: 'why', j: 'なぜ' },
      { k: 'so much / that much', j: 'そんなに' },
      { k: 'I don\'t understand', j: 'わかりません' }
    ]},

  { n: 106,
    jp: "どうしてもう嬉しくないのですか。",
    en: "Why are you not happy anymore?",
    legos: [
      { k: 'why (casual)', j: 'どうして' },
      { k: 'anymore', j: 'もう' },
      { k: 'not happy', j: '嬉しくない' }
    ]},

  { n: 107,
    jp: "あなたの目はきれいだと思います。",
    en: "I think your eyes are beautiful.",
    legos: [
      { k: 'eyes', j: '目' },
      { k: 'beautiful', j: 'きれい' }
    ]},

  { n: 108,
    jp: "あなたの助けようとする姿勢が好きです。",
    en: "I love the way you try to help.",
    legos: [
      { k: 'way / manner', j: '姿勢' },
      { k: 'to try to help', j: '助けようとする' }
    ]},

  { n: 109,
    jp: "迷惑をかけたくないですが、それは私のです。",
    en: "I hate making trouble, but that one's mine.",
    legos: [
      { k: 'trouble / bother', j: '迷惑' },
      { k: 'to cause', j: 'をかける' },
      { k: 'mine', j: '私の' }
    ]},

  { n: 110,
    jp: "昔はおかしいことは悪いと思っていました。",
    en: "I used to think that being crazy was bad.",
    legos: [
      { k: 'in the past', j: '昔' },
      { k: 'crazy / strange', j: 'おかしい' },
      { k: 'bad', j: '悪い' },
      { k: 'used to think', j: '思っていました' }
    ]},

  { n: 111,
    jp: "でも、間違っていました。",
    en: "But I was wrong.",
    legos: [
      { k: 'was wrong', j: '間違っていました' }
    ]},

  { n: 112,
    jp: "それがいい考えかどうか確信がありません。",
    en: "I'm not convinced that would be a very good idea.",
    legos: [
      { k: 'conviction / certainty', j: '確信' },
      { k: 'whether', j: 'かどうか' }
    ]},

  { n: 113,
    jp: "それを言う勇気があったと思います。",
    en: "I thought you were very brave to say that.",
    legos: [
      { k: 'courage / brave', j: '勇気' },
      { k: 'to say that', j: 'それを言う' }
    ]},

  { n: 114,
    jp: "そう思います。",
    en: "I think so.",
    legos: [
      { k: 'like that / so', j: 'そう' }
    ]},

  { n: 115,
    jp: "そうは思いません。",
    en: "I don't think so.",
    legos: [
      { k: "don't think", j: '思いません' }
    ]},

  // --- BLOCK 11: Third Persons (Seeds 116-130) ---

  { n: 116,
    jp: "彼は後で皆と一緒に戻りたいと言っています。",
    en: "He wants to come back with everyone else later on.",
    legos: [
      { k: 'later', j: '後で' },
      { k: 'everyone', j: '皆' },
      { k: 'come back', j: '戻る' },
      { k: 'says he wants', j: 'と言っています' }
    ]},

  { n: 117,
    jp: "彼女は答えが何か知りたいと言っています。",
    en: "She wants to find out what the answer is.",
    legos: [
      { k: 'she', j: '彼女' },
      { k: 'answer', j: '答え' },
      { k: 'what (question)', j: '何か' }
    ]},

  { n: 118,
    jp: "他の人がいるときに静かにしたくないと言っています。",
    en: "He doesn't want to be quiet when other people are here.",
    legos: [
      { k: 'when', j: 'とき' },
      { k: 'quiet', j: '静か' },
      { k: "doesn't want to", j: 'したくない' }
    ]},

  { n: 119,
    jp: "先週、友達に手紙を書きたかったそうです。",
    en: "He wanted to write a letter to his friend last week.",
    legos: [
      { k: 'last week', j: '先週' },
      { k: 'letter', j: '手紙' },
      { k: 'to (person)', j: 'に' },
      { k: 'I heard that', j: 'そうです' }
    ]},

  { n: 120,
    jp: "彼女はどこにあるか教えたくなかったそうです。",
    en: "She didn't want to tell me where it was.",
    legos: [
      { k: 'where', j: 'どこ' },
      { k: 'teach / tell', j: '教える' },
      { k: "didn't want to", j: 'たくなかった' }
    ]},

  { n: 121,
    jp: "だから彼は答えがわからなかったのです。",
    en: "That is why he didn't know the answer.",
    legos: [
      { k: 'that is why', j: 'だから' },
      { k: "didn't know", j: 'わからなかった' },
      { k: '(explanation)', j: 'のです' }
    ]},

  { n: 122,
    jp: "彼は友達だから、驚きました。",
    en: "That was a surprise because he's my friend.",
    legos: [
      { k: 'because', j: 'だから' },
      { k: 'surprise', j: '驚き' }
    ]},

  { n: 123,
    jp: "彼女が言っていたことほど面白くないですね。",
    en: "That's less exciting than what she was saying.",
    legos: [
      { k: 'as much as', j: 'ほど' },
      { k: 'less / not as', j: 'ほど...ない' },
      { k: 'exciting', j: '面白い' }
    ]},

  { n: 124,
    jp: "私が緊張しているのを見て、彼女はとても優しかったです。",
    en: "She was very kind when she saw me feeling nervous.",
    legos: [
      { k: 'nervous', j: '緊張している' },
      { k: 'saw', j: '見て' },
      { k: 'kind', j: '優しかった' }
    ]},

  { n: 125,
    jp: "答えられなかったとき、彼はあまり我慢強くなかったです。",
    en: "He wasn't very patient when I couldn't answer.",
    legos: [
      { k: 'patient', j: '我慢強い' },
      { k: "couldn't answer", j: '答えられなかった' },
      { k: "wasn't very", j: 'あまり...なかった' }
    ]},

  { n: 126,
    jp: "来年手伝ってもらえるか聞いてみます。",
    en: "I'll ask him if he'll be able to help next year.",
    legos: [
      { k: 'next year', j: '来年' },
      { k: 'help', j: '手伝う' },
      { k: "I'll try asking", j: '聞いてみます' }
    ]},

  { n: 127,
    jp: "彼女にどこに行きたいか聞きます。",
    en: "I'll ask her where she wants to go.",
    legos: [
      { k: 'where to', j: 'どこに' },
      { k: 'will ask', j: '聞きます' }
    ]},

  { n: 128,
    jp: "息子は教師として働いています。",
    en: "My son works as a teacher.",
    legos: [
      { k: 'son', j: '息子' },
      { k: 'teacher', j: '教師' },
      { k: 'as', j: 'として' },
      { k: 'works', j: '働いています' }
    ]},

  { n: 129,
    jp: "娘は市役所で働いています。",
    en: "My daughter works for the council.",
    legos: [
      { k: 'daughter', j: '娘' },
      { k: 'city office / council', j: '市役所' }
    ]},

  { n: 130,
    jp: "友達は昔オフィスで働いていました。",
    en: "My friend used to work in an office.",
    legos: [
      { k: 'office', j: 'オフィス' },
      { k: 'used to work', j: '働いていました' }
    ]},

  // --- BLOCK 12: Reported Speech & Complex (Seeds 131-150) ---

  { n: 131,
    jp: "全部終わらせたいと言っています。",
    en: "They say they want to make sure we finish everything.",
    legos: [
      { k: 'everything', j: '全部' },
      { k: 'want to finish', j: '終わらせたい' },
      { k: 'they say', j: 'と言っています' }
    ]},

  { n: 132,
    jp: "そのニュースが事務所の全員に届くまで数時間かかりました。",
    en: "The news took several hours to reach everyone in the office.",
    legos: [
      { k: 'news', j: 'ニュース' },
      { k: 'several hours', j: '数時間' },
      { k: 'to reach', j: '届く' },
      { k: 'took (time)', j: 'かかりました' }
    ]},

  { n: 133,
    jp: "彼女はあなたの言うことを全部聞くわけではありません。",
    en: "She won't listen to every word you say.",
    legos: [
      { k: 'every word', j: '全部' },
      { k: 'listen', j: '聞く' },
      { k: 'not necessarily', j: 'わけではありません' }
    ]},

  { n: 134,
    jp: "最終バスを見たばかりだと彼女は言いました。",
    en: "She told me she'd just seen the last bus.",
    legos: [
      { k: 'last (final)', j: '最終' },
      { k: 'just now', j: 'ばかり' },
      { k: 'saw', j: '見た' },
      { k: 'she said', j: '言いました' }
    ]},

  { n: 135,
    jp: "彼はそれについて百回くらい話を聞いたと思います。",
    en: "I suspect that he's heard a hundred stories about it.",
    legos: [
      { k: 'about 100 times', j: '百回くらい' },
      { k: 'stories', j: '話' },
      { k: 'heard', j: '聞いた' },
      { k: 'I suspect', j: 'と思います' }
    ]},

  { n: 136,
    jp: "彼女は私たちを泊めてくれると言ってくれました。",
    en: "She offered to let us stay with her.",
    legos: [
      { k: 'to stay', j: '泊める' },
      { k: 'offered to do for us', j: 'くれると言ってくれました' }
    ]},

  { n: 137,
    jp: "子供たちがそれを壊したことを知っていました。",
    en: "I knew that the children had broken it.",
    legos: [
      { k: 'children', j: '子供たち' },
      { k: 'broke', j: '壊した' },
      { k: 'knew that', j: 'ことを知っていました' }
    ]},

  { n: 138,
    jp: "知っていたら違うやり方をしたと思います。",
    en: "I would have done it differently if I had known.",
    legos: [
      { k: 'if I had known', j: '知っていたら' },
      { k: 'differently', j: '違うやり方で' },
      { k: 'would have done', j: 'したと思います' }
    ]},

  { n: 139,
    jp: "私だったら全く同じ言い方はしなかったと思います。",
    en: "I wouldn't have said it in exactly the same way.",
    legos: [
      { k: 'if it were me', j: '私だったら' },
      { k: 'exactly the same', j: '全く同じ' },
      { k: 'way of saying', j: '言い方' },
      { k: "wouldn't have done", j: 'しなかったと思います' }
    ]},

  { n: 140,
    jp: "でも、それは変えられないという意味ではありません。",
    en: "But that doesn't mean we can't change it.",
    legos: [
      { k: 'change', j: '変える' },
      { k: "can't", j: 'られない' },
      { k: "doesn't mean that", j: 'という意味ではありません' }
    ]},

  { n: 141,
    jp: "それは私たちに残された唯一の希望です。",
    en: "It's the only real hope we have left.",
    legos: [
      { k: 'only', j: '唯一の' },
      { k: 'hope', j: '希望' },
      { k: 'remaining / left', j: '残された' }
    ]},

  { n: 142,
    jp: "人生は簡単ではないけど、簡単であるべきでもないです。",
    en: "Life isn't easy but it's not meant to be easy.",
    legos: [
      { k: 'life', j: '人生' },
      { k: 'should be', j: 'であるべき' },
      { k: 'is not meant to', j: 'べきでもないです' }
    ]},

  { n: 143,
    jp: "逃げ出せたら、それ以上幸せなことはありません。",
    en: "Nothing would make me happier than to get away.",
    legos: [
      { k: 'to escape / get away', j: '逃げ出す' },
      { k: 'more than that', j: 'それ以上' },
      { k: 'nothing would be', j: 'ことはありません' }
    ]},

  { n: 144,
    jp: "そしたら、もう誰も信用しません。",
    en: "Then I will never trust anyone ever again.",
    legos: [
      { k: 'then / in that case', j: 'そしたら' },
      { k: 'never again', j: 'もう...ません' },
      { k: 'anyone', j: '誰も' },
      { k: 'trust', j: '信用する' }
    ]},

  { n: 145,
    jp: "一緒に遊んでもらえると信じられたらいいのに。",
    en: "If only I could trust you to play together.",
    legos: [
      { k: 'if only', j: 'たらいいのに' },
      { k: 'trust', j: '信じる' },
      { k: 'play together', j: '一緒に遊ぶ' }
    ]},

  { n: 146,
    jp: "自分が全く同じ問題を抱えているとは想像できませんでした。",
    en: "I couldn't imagine myself having exactly the same problem.",
    legos: [
      { k: 'imagine', j: '想像する' },
      { k: 'having (a problem)', j: '抱えている' },
      { k: "couldn't", j: 'できませんでした' }
    ]},

  { n: 147,
    jp: "彼らがそんなに大きな音楽を流さなければいいのに。",
    en: "I wish they wouldn't play such loud music.",
    legos: [
      { k: 'I wish', j: 'ばいいのに' },
      { k: 'loud', j: '大きな' },
      { k: 'music', j: '音楽' },
      { k: 'play (music)', j: '流す' }
    ]},

  { n: 148,
    jp: "もうこれ以上続けることはできませんでした。",
    en: "I wouldn't have been able to keep going any longer.",
    legos: [
      { k: 'any longer', j: 'これ以上' },
      { k: 'to continue', j: '続ける' },
      { k: "wasn't able to", j: 'ことはできませんでした' }
    ]},

  { n: 149,
    jp: "私の選択だったら、もっと考えたと思います。",
    en: "I'd have thought more if it had been my choice.",
    legos: [
      { k: 'choice', j: '選択' },
      { k: 'if it had been', j: 'だったら' },
      { k: 'would have thought more', j: 'もっと考えたと思います' }
    ]},

  { n: 150,
    jp: "言ってくれていたら喜んで運転したのに。",
    en: "I'd have been happy to drive if you'd told me.",
    legos: [
      { k: 'if you had told me', j: '言ってくれていたら' },
      { k: 'happily', j: '喜んで' },
      { k: 'drive', j: '運転する' },
      { k: 'would have done', j: 'したのに' }
    ]},
]

// =============================================================================
// COMBINE ALL PHASES
// =============================================================================

const ALL_SEEDS = [...PHASE_1_META, ...PHASE_2_NEEDS_CONTRIBUTING, ...PHASE_3_SELF_OTHERS]

// =============================================================================
// PHRASE GENERATION
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

  // Generate recombinations based on available patterns
  const recombinations = generateRecombinations(seed, allPreviousLegos)
  phrases.push(...recombinations)

  return phrases.slice(0, 15)
}

function generateRecombinations(seed, previousLegos) {
  const recombinations = []
  const n = seed.n

  // Early phase: basic recombinations
  if (n <= 50) {
    // Combine want to + verbs
    const wantPatterns = previousLegos.filter(l => l.k && l.k.includes('want to'))
    if (wantPatterns.length > 1) {
      recombinations.push({
        known: 'I want to speak Japanese',
        target: '日本語を話したいです'
      })
    }
  }

  // Middle phase: opinion + adjective combinations
  if (n > 50 && n <= 100) {
    const opinions = previousLegos.filter(l => l.k && l.k.includes('think'))
    const adjectives = previousLegos.filter(l =>
      ['difficult', 'easy', 'fun', 'interesting', 'good', 'important'].some(a => l.k === a)
    )
    for (const adj of adjectives.slice(0, 2)) {
      recombinations.push({
        known: `I think it's ${adj.k}`,
        target: `${adj.j}と思います`
      })
    }
  }

  // Later phase: he/she + action combinations
  if (n > 100) {
    const people = previousLegos.filter(l => ['he', 'she', 'friend(s)'].includes(l.k))
    for (const person of people.slice(0, 2)) {
      recombinations.push({
        known: `${person.k} said so`,
        target: `${person.j}がそう言いました`
      })
    }
  }

  return recombinations.slice(0, 6)
}

// =============================================================================
// BUILD FUNCTION
// =============================================================================

async function buildCourse() {
  console.log(`\nBuilding Japanese v4 CANONICAL Course: ${COURSE_CODE}`)
  console.log('Canonical concepts + Target-first design')
  console.log('Target: ~500 LEGOs across 150 seeds')
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
          type: 'A',
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

    // Progress every 10 seeds
    if (seed.n % 10 === 0) {
      console.log(`  Completed seed ${seed.n}/150 (${totalLegos} LEGOs)`)
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
