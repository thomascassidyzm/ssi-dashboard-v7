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
      // filled from a full read of the live course (job #250·AD); every [得] here is the "must" sense
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
