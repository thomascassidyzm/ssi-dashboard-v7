/**
 * PER-COURSE PRONUNCIATION OVERRIDES: what the TTS provider is told to SAY for a course line whose stored words it
 * reads wrongly. The stored course text is NEVER changed by this. Only the transcript sent to the provider is.
 *
 * Applied at the one TTS door (services/tts-service.cjs speak(), just before the provider is paid), so every render path
 * gets it: /api/audio/render, phase8 /generate fills, regenerates. The clip library is still asked with the STORED words, so
 * a fixed clip of the line is reused as before. A re-record of a listed line (audio-render-entry rerecord()) sends the
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
    char: '得',
    say: '<<t|e|i>>',
    reading: 'děi (must, have to)',
    lines: Object.freeze([
      // Every 得-line of the live course read in full (784 distinct lines, job #250·AD, 2026-11-04); these are the ones
      // where 得 means must / have to. NOT here, deliberately: 不得不 (bùdébù), 觉得 / 记得 / 值得 / 显得 / 赢得, V得 (做得,
      // 说得, 拿得动, 行得通), 得到, 得多. And NOT the bare LEGO 得 on its own: S0549L01 'have to' (děi) and S0647L01 'manner
      // particle de' share those words, so the words alone cannot say which is meant; its clips were re-recorded once by
      // hand (#250·AD) rather than listed. A new děi line is added here by a person who has read it.
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
    ]),
  }),
})

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
function spokenFor({ courseCode, text }) {
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
function restoreWordTimings(timings, courseCode) {
  const rule = RULES[courseCode]
  if (!timings || !rule || !Array.isArray(timings.words)) return timings
  const words = timings.words.map((w) => String(w).split(rule.say).join(rule.char))
  if (words.some((w) => w.includes('<<') || w.includes('>>'))) return null
  return { ...timings, words }
}

/** Every listed line of a course: [{ marked, text, spoken }]. For tools and reviews. */
function linesFor(courseCode) {
  const rule = RULES[courseCode]
  if (!rule) return []
  return rule.lines.map((m) => ({ marked: m, ...parseMarked(m, rule) }))
}

module.exports = { RULES, spokenFor, restoreWordTimings, linesFor, lineKey, parseMarked }
