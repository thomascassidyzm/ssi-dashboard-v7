/**
 * PER-COURSE PRONUNCIATION OVERRIDES: what the TTS provider is told to SAY for a course line whose stored words it
 * reads wrongly. The stored course text is NEVER changed by this. Only the transcript sent to the provider is.
 *
 * Applied at the one TTS door (services/tts-service.cjs speak(), just before the provider is paid), so every render path
 * gets it: /api/audio/render, phase8 /generate fills, regenerates. The clip library is still asked with the STORED words, so
 * a fixed clip of the line is reused as before — but ONLY a fixed one: a clip of a listed line rendered before the rule's
 * `since` is refused by every reuse path (shared/pronunciation-reuse-guard.cjs, job #262·AD). A re-record of a listed line (audio-render-entry rerecord()) sends the
 * spoken form as its words, so the door cannot hand back another (old, misread) clip of the same characters in its place.
 *
 * WHY A LIST OF LINES AND NOT A CHARACTER SWAP. A polyphone is read by its sense, and the sense is in the sentence:
 * zho 得 is děi ("must, have to") in 我得走, but de in 做得好 / 说得 and dé in 得到, and 我觉得我们得带孩子 has both
 * (觉得 = juéde, then 得 = děi). A blanket swap would break every de line in the course. So each rule names the exact
 * lines it covers, with the sense-bearing character marked in [brackets] where it is meant: only a bracketed character is
 * replaced, nothing else in the line, and a line not on the list is sent exactly as stored. A person adds a line by
 * reading it, never by a regex (Kai, 15 Oct: no regex language fixes).
 *
 * zho_for_eng 得 = děi → Cartesia IPA <<t|e|i>> with no tone marks (job #236·AD round 3: the phone recogniser heard
 * děi on 16/18 IPA takes against 0/6 for the live clips; Kai listened to all six lines and approved it 2026-11-04
 * 13:18Z, "the ipa thing works"; applied by job #250·AD). The pinyin děi and a slower speed were both tried and lost.
 *
 * Matching is on the line's words with surrounding whitespace and trailing sentence punctuation ignored (a seed's
 * "你几天后就得走吗？" is the same line as its phrase "你几天后就得走吗"); the punctuation the line carries is kept.
 * Tested by services/shared/pronunciation-overrides.test.cjs, which also pins the de lines that must never change.
 */

const RULES = Object.freeze({
  zho_for_eng: Object.freeze({
    ruling: 'Kai 2026-11-04 13:18Z, job #236·AD round 3, applied #250·AD',
    // When the override went live (9230dad00, 13:24:04Z; the #250·AD re-records were written from 13:27Z). A clip of a
    // listed line whose S3 object is older was rendered WITHOUT it — misread — and is never reused for the line
    // (shared/pronunciation-reuse-guard.cjs, job #262·AD). Move this only forward, and only with the rule.
    since: '2026-11-04T13:24:04Z',
    char: '得',
    say: '<<t|e|i>>',
    reading: 'děi (must, have to)',
    lines: Object.freeze([
      // Every 得-line of the live course read in full (784 distinct lines, job #250·AD, 2026-11-04); these are the ones
      // where 得 means must / have to. NOT here, deliberately: 不得不 (bùdébù), 觉得 / 记得 / 值得 / 显得 / 赢得, V得 (做得,
      // 说得, 拿得动, 行得通), 得到, 得多. A new děi line is added here by a person who has read it.
      //
      // The bare LEGO 得 IS listed (job #262·AD): S0549L01 'have to' is the děi sense and is played. S0647L01 'manner
      // particle de' shares the words, so it gets děi too — it is a not-new LEGO and never played (its basket is not
      // built), its clip was already re-recorded as děi by hand in #250·AD, and whether it should exist at all is
      // held for Kai. Unlisted, a future render of 得 would have said "de" and the old misread clips would have stayed
      // reusable for the one sense a learner hears.
      '很抱歉我[得]这么早走',
      '但是我[得]带我妈去看医生',
      '你几天后就[得]走吗',
      '我[得]弄清楚他要在哪里见我',
      '不，他们[得]自己赶火车',
      '因为我[得]保持安静',
      '不管我怎么争论，我还是[得]分享',
      '我[得]和我妹妹分享我的玩具',
      '[得]带',
      '我[得]带',
      '[得]带你',
      '我[得]带他',
      '我[得]带你去那儿',
      '我[得]带你吗',
      '我[得]带你回家',
      '我[得]带你去看',
      '我明天[得]带你去那儿',
      '我今天[得]带你',
      '我[得]帮我妈',
      '我[得]去看医生',
      '我[得]带我妈去看医生',
      '我不能来，因为我[得]带我妈去看医生',
      '我想回家，但是我[得]找我的钥匙',
      '恐怕我[得]去了',
      '我[得]去办公室',
      '不行我[得]工作',
      '我[得]几天后完成',
      '很遗憾我[得]去会议',
      '我[得]弄清楚他在哪里',
      '我[得]弄清楚怎么做这个更好',
      '我[得]弄清楚她想在哪里见你',
      '[得]赶',
      '她[得]赶火车',
      '他说他[得]赶火车',
      '他们都[得]赶火车',
      '[得]去',
      '[得]保持安静',
      '我[得]去',
      '她[得]选',
      '没有人[得]留下',
      '我[得]试试',
      '她[得]来',
      '我[得]安静',
      '你[得]帮她',
      '我[得]保持安静',
      '还是[得]',
      '她争论了但是还是[得]',
      '还是[得]分享',
      '我[得]把它分享了',
      '我还是[得]分享',
      '我觉得我们[得]带孩子',
      '[得]',
    ]),
  }),
  // swe_for_eng: the English line "does" was read "dose" (doe plural) by Cartesia (#870·AG, learner bug e7e170b1). Kai
  // picked the IPA take on 11 Nov 2026 (page d/23a2b585, #133·AH; approved #137·AH). The cue 9d292e17 was re-recorded
  // with it by #139·AH (12:39Z). Listed so the S0059L02 intro's spliced 'does' piece, and any later render of the bare
  // line, are said the same way. Only the whole line "does" is matched; a longer line holding "does" is sent as stored.
  swe_for_eng: Object.freeze({
    ruling: 'Kai 2026-11-11, #133·AH pick (d/23a2b585), approved #137·AH, applied #139·AH',
    // Before this, every swe_for_eng "does" clip was the misread one (the old cue object, shared with kor_for_eng's
    // d0db1e99). The #139·AH cue re-record landed after it, so that take stays reusable.
    since: '2026-11-11T12:35:00Z',
    char: 'does',
    say: '<<ˈ|d|ʌ|z>>',
    reading: 'duz (third person of do), never "dose"',
    // + the S0059L02 intro (Kai 2026-11-11 14:44Z, #205·AH: re-rendered in Tom-006 with the IPA; a pre-`since` clip of it,
    // 5393744e, is the misread one and is refused for reuse by pronunciation-reuse-guard).
    lines: Object.freeze(['[does]', "The Swedish for: '[does]', is:"]),
  }),
})

/**
 * PER-LANGUAGE WORD RULES: a word the provider misreads in EVERY line of a language, whatever the course. Unlike the
 * course rules above there is no sense to read, so the word itself is the key: every whole-word occurrence (any case) in
 * a line of this language is sent as the Cartesia IPA form. Cartesia's own custom-pronunciation syntax, NOT SSML or XML
 * (Tom 2026-11-08, job #776: "Not xml"): IPA phonemes in <<…>>, pipe-separated, stress marks as their own elements.
 *
 * CARTESIA ONLY. The <<…>> form means nothing to any other provider, so the door applies these only when the provider
 * is cartesia (spokenFor's `provider`); an Azure or recorded line is sent exactly as stored.
 *
 * English, Tom 2026-11-08 (job #776, heard in Italian Pod 1, Tom-006 + Charlotte):
 *   Sarah   — British "Sair-ra", first vowel as in "hair", never "Sah-ra" as in father.
 *   risotto — "ris-OTT-oh", the short o of "lot", never "ris-OH-toe".
 * Chosen BY EAR, not by theory (Tom, 2026-11-08, pick page d/255dfa2f, both voices): the IPA form for Sarah works; for
 * risotto Sonic 3.6 ignored every IPA form tried (<<ɹ|ɪ|ˈ|z|ɒ|t|oʊ>>, <<r|ɪ|ˈ|z|ɒ|t|əʊ>>, <<ɹ|ɪ|ˈ|s|ɒ|t|oʊ>>) and only the
 * plain-text respelling "rizz-otto" passed. So `say` may be a respelling as well as IPA; either is Cartesia-only here.
 * Applies to every English Cartesia voice, not just those two: the misreading is the model's, not the voice's.
 */
const WORD_RULES = Object.freeze({
  eng: Object.freeze({
    ruling: 'Tom 2026-11-08, job #776 (Italian Pod 1: "Good morning Sarah", "risotto")',
    // When the rule went live on popty.app. A Cartesia clip of a line holding one of these words whose S3 object is older
    // was rendered WITHOUT it and is never reused (shared/pronunciation-reuse-guard.cjs). Move only forward, with the rule.
    // Moved forward with the risotto respelling (11:11Z): clips made 10:35-11:15 carry the failed risotto IPA.
    since: '2026-11-08T11:15:00Z',
    words: Object.freeze([
      Object.freeze({ word: 'Sarah', say: '<<ˈ|s|ɛ|ɹ|ə>>', reading: 'SAIR-uh, vowel of "hair"' }),
      Object.freeze({ word: 'risotto', say: 'rizz-otto', reading: 'ri-ZOT-oh, vowel of "lot" (respelled: the IPA was ignored)' }),
    ]),
  }),
})

let canonicalLanguage = null
/** 'en', 'en-GB', 'eng' → 'eng'; null when the code cannot be read. */
function languageKey(language) {
  if (!language) return null
  if (!canonicalLanguage) canonicalLanguage = require('./clip-identity.cjs').tryCanonicalLanguage
  return canonicalLanguage(language)
}

const wordRe = (word) => new RegExp(`(?<![\\p{L}\\p{N}])${word}(?![\\p{L}\\p{N}])`, 'giu')

/** The word rules of this language that this line holds: [{ word, say, reading }]. Pure. */
function wordRulesFor({ language, text }) {
  const rule = WORD_RULES[languageKey(language)]
  if (!rule || text == null) return []
  return rule.words.filter((w) => wordRe(w.word).test(String(text)))
}

/** The line with each of its language's listed words in spoken form, or null when it holds none. */
function wordSpokenFor({ language, text }) {
  const hits = wordRulesFor({ language, text })
  if (!hits.length) return null
  let out = String(text)
  for (const w of hits) out = out.replace(wordRe(w.word), w.say)
  return out
}

const TRAILING = /[\s。．.！!？?，,、；;：:…]+$/u

/** The words a line is matched on: trimmed, trailing sentence punctuation dropped. */
function lineKey(text) {
  return String(text == null ? '' : text).trim().replace(TRAILING, '')
}

/** A marked line ("我觉得我们[得]带孩子") → its stored words and its spoken form under the rule. */
function parseMarked(marked, rule) {
  const re = /\[([^\]]+)\]/gu
  let n = 0
  const text = marked.replace(re, (_, c) => { n++; return c })
  const spoken = marked.replace(re, (_, c) => { if (c !== rule.char) throw new Error(`pronunciation-overrides: "${marked}" marks "${c}", but this rule is for ${rule.char}`); return rule.say })
  if (!n) throw new Error(`pronunciation-overrides: "${marked}" marks nothing — bracket the ${rule.char} that is read ${rule.reading}`)
  return { text, spoken }
}

const compiled = new Map()
function compile(courseCode) {
  if (compiled.has(courseCode)) return compiled.get(courseCode)
  const rule = RULES[courseCode]
  let byKey = null
  if (rule) {
    byKey = new Map()
    for (const marked of rule.lines) {
      const { text, spoken } = parseMarked(marked, rule)
      const key = lineKey(text)
      if (byKey.has(key) && byKey.get(key).spokenKey !== lineKey(spoken)) throw new Error(`pronunciation-overrides: ${courseCode} lists "${key}" twice, marked differently`)
      byKey.set(key, { marked, spokenKey: lineKey(spoken) })
    }
  }
  compiled.set(courseCode, byKey)
  return byKey
}

/**
 * What to send the provider for this line of this course, or null when the line is not on the course's list (send it
 * as stored). The returned form keeps the line's own surrounding punctuation.
 */
function spokenFor({ courseCode, text, language, provider }) {
  const lineForm = courseSpokenFor({ courseCode, text })
  // The word rules are Cartesia IPA: applied on top of any line rule, only when the provider is known to be cartesia.
  if (provider !== 'cartesia') return lineForm
  return wordSpokenFor({ language, text: lineForm == null ? text : lineForm }) || lineForm
}

function courseSpokenFor({ courseCode, text }) {
  if (!courseCode || text == null) return null
  const byKey = compile(String(courseCode))
  if (!byKey) return null
  const raw = String(text)
  const key = lineKey(raw)
  const hit = byKey.get(key)
  if (!hit) return null
  const start = raw.indexOf(key)
  return raw.slice(0, start) + hit.spokenKey + raw.slice(start + key.length)
}

/**
 * Cartesia's word timings echo the transcript it was SENT, so a substituted line comes back with the IPA token as a word.
 * Put the stored character back. If any token fragment survives (the provider split it), the timings are dropped (null):
 * the word-timings contract prefers no timings to ones the display would misread.
 */
function restoreWordTimings(timings, courseCode, language) {
  const rule = RULES[courseCode]
  const wordRule = WORD_RULES[languageKey(language)]
  if (!timings || (!rule && !wordRule) || !Array.isArray(timings.words)) return timings
  const words = timings.words.map((w) => {
    let out = String(w)
    if (rule) out = out.split(rule.say).join(rule.char)
    if (wordRule) for (const r of wordRule.words) out = out.split(r.say).join(r.word)
    return out
  })
  if (words.some((w) => w.includes('<<') || w.includes('>>'))) return null
  return { ...timings, words }
}

/** Every listed line of a course: [{ marked, text, spoken }]. For tools and reviews. */
function linesFor(courseCode) {
  const rule = RULES[courseCode]
  if (!rule) return []
  return rule.lines.map((m) => ({ marked: m, ...parseMarked(m, rule) }))
}

module.exports = { RULES, WORD_RULES, spokenFor, courseSpokenFor, wordSpokenFor, wordRulesFor, languageKey, restoreWordTimings, linesFor, lineKey, parseMarked }
