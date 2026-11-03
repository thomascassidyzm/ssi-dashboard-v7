// MOVED to Popty from ssi-learning-app/tools/intro-bank/frankenstein/lib.mjs (job #699, Tom 2026-11-03: "we need everything that touches course content to be a popty tool"); behaviour unchanged, app paths via tools/lib/learning-app.mjs.
// Pure helpers for the Frankenstein intro method (#755, ruling r-2026-10-18-frankenstein-lego-intros): split a COMPLETE recorded
// LEGO intro once, right after "The <Language> for", swap in a recorded "The <Other> for", keep the rest of the recording.
export const keyOf = (t) => String(t).toLowerCase().replace(/[.,!?;:'"‘’“”]+/g, ' ').replace(/\s+/g, ' ').trim()

// "The Spanish for: 'I'm trying to', as in — 'ctx', is:"  or  "The Spanish for I'm trying to is:"  ->  { lang, x, c, tail }
export function parseIntro(text) {
  const s = String(text).replace(/<break[^>]*>/gi, '').replace(/\s+/g, ' ').trim()
  const m = /^The (.+?) for:? (.+?),? (is said like this|is given as|is):?$/.exec(s)
  if (!m) return null
  let body = m[2]
  const a = /^(.*?),? as in\s*[—–-]?\s*(.*)$/.exec(body)
  const strip = (v) => v.replace(/^['"‘“]|['"’”],?$/g, '').trim()
  return { lang: m[1], x: strip(a ? a[1] : body), c: a ? strip(a[2]) : null, tail: m[3] }
}

// word_timings {words, starts, ends}: the split is after the word "for" (index of "for" + 1). null if the timings do not line up with the words.
export function splitIndex(wt) {
  const w = wt && wt.words, s = wt && wt.starts, e = wt && wt.ends
  if (!Array.isArray(w) || !Array.isArray(s) || !Array.isArray(e) || w.length !== s.length || w.length !== e.length || w.length < 4) return null
  const i = w.findIndex((x, k) => k >= 1 && /^for:?$/i.test(String(x)))
  return i >= 1 && i + 1 < w.length ? i + 1 : null
}

// Cut points (seconds) for the body that is kept: from the first word after "for" to the end of the last word.
export function bodyCut(wt) {
  const i = splitIndex(wt)
  return i == null ? null : { start: wt.starts[i], end: wt.ends[wt.ends.length - 1], from: i }
}
