/**
 * take-g-spans — per-unit ms spans for a Take G clip from the clip's own word
 * timings (no audio inspection). Two sources, one reconstruction gate:
 *   - Azure `word_boundaries`: [{ text, offset, duration }] in ms
 *   - Cartesia `word_timings`: { words, starts, ends } in SECONDS
 * Cartesia Take-G clips have no pauses, so silence detection finds no seams;
 * the timings are the only exact source for them.
 */
const alnum = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]/gu, '')

// pad into a gap: a third of it each side, capped — the rest stays as margin
const PAD_MS = Number(process.env.SLICE_PAD_MS || 150)
const pad = (gapMs) => Math.max(0, Math.min(PAD_MS, Math.round(gapMs / 3)))

/** Per-unit padded spans from speech edges (ms). */
function paddedSpans(speech, durMs) {
  return speech.map((sp, i) => {
    const prevGap = i === 0 ? null : { from: speech[i - 1].end, to: sp.start }
    const nextGap = i === speech.length - 1 ? null : { from: sp.end, to: speech[i + 1].start }
    return {
      start: prevGap ? Math.round(sp.start - pad(sp.start - prevGap.from)) : 0,
      end: nextGap ? Math.round(sp.end + pad(nextGap.to - sp.end)) : Math.round(durMs),
    }
  })
}

/** words: [{ text, start, end }] ms. Every unit must reconstruct exactly and
 *  all words be consumed, else null (caller falls back). */
function spansFromWords(rawWords, group, durMs) {
  const words = (rawWords || []).filter((w) => alnum(w.text))
  if (!words.length) return null
  const speech = []
  let wi = 0
  for (const a of group) {
    const want = alnum(a.target_surface)
    let got = ''
    const start = wi
    while (wi < words.length && got.length < want.length) { got += alnum(words[wi].text); wi++ }
    if (got !== want) return null
    speech.push({ start: words[start].start, end: words[wi - 1].end })
  }
  if (wi !== words.length) return null
  return paddedSpans(speech, durMs)
}

function spansFromWordBoundaries(wb, group, durMs) {
  return spansFromWords((wb || []).map((w) => ({ text: w.text, start: w.offset, end: w.offset + (w.duration || 0) })), group, durMs)
}

function spansFromWordTimings(wt, group, durMs) {
  if (!wt || !Array.isArray(wt.words) || !Array.isArray(wt.starts) || !Array.isArray(wt.ends)) return null
  if (wt.words.length !== wt.starts.length || wt.words.length !== wt.ends.length) return null
  return spansFromWords(wt.words.map((t, i) => ({ text: t, start: wt.starts[i] * 1000, end: wt.ends[i] * 1000 })), group, durMs)
}

module.exports = { alnum, paddedSpans, spansFromWords, spansFromWordBoundaries, spansFromWordTimings }
