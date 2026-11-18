#!/usr/bin/env node
/**
 * SILENCE LINES (job #71, 2026-11-06). pair.mjs --lines cuts a several-sentence turn at its sentence ends from the
 * render's Cartesia word timings. Human takes have none, so Welsh Pod 1 played whole. Tom said Y to the narrow case:
 * cut human takes ONLY at sentence breaks, in real silence, nothing sub-sentence, nothing re-recorded.
 *
 * It reads <course>.whole-turns.json (made by whole-turns.mjs --known-clips on the QA copy), fetches the clips over
 * the public audio proxy and runs the splicer's own gates (splice-gates.cjs) on BOTH sides of every turn. The result
 * is SPANS of the card's existing clips, in the player's cut file: no clip made, no row written, no database touched.
 *
 * Refuse, never guess. On top of the splicer's gates, two that human takes need:
 *  - syllable_share: every cut must land within SHARE_TOL of where the text says it is (share of syllables before
 *    the cut against share of speech time before it). The longest-gap rule assumes the long pauses are the sentence
 *    ends; a person can breathe longer at a comma.
 *  - suspect_long_gap: a gap over LONG_GAP_S is not a sentence pause, it is a retake or an edit fault.
 *
 * PLACED BREAKS. The splicer's cue mode counts a pause at every "…" in the text, because the TTS renderer put one
 * there. A person does not, so most human takes fail its gap count (too_few_gaps) while pausing plainly at the
 * sentence end. For those turns alone the break is placed by position instead: the gap nearest the sentence end's
 * syllable share. It must be unambiguous, or the turn stays whole:
 *  - within PLACE_TOL of that share, and the runner-up gap at least PLACE_CLEAR further away;
 *  - at least PLACE_MIN_GAP long;
 *  - a pause nobody marked (no comma or "…" near it) must be no longer than the shortest cut over 1.5, the splicer's
 *    margin; marked pauses are expected and do not count against it;
 *  - the sentences' speech rates must agree within RATE_RATIO, and every seam, piece and share gate still applies.
 * Where the strict cut passes, the placed break is computed beside it (placed_agrees). If they disagree, placed wins;
 * with hesitation marks in the text, a strict cut position cannot confirm is refused.
 *
 * Each sentence's English, in preference order: an existing clip of the exact sentence in the same voice (the Drill
 * looks it up by text), else a span of the card's own English take. A turn with any sentence left without English
 * stays whole: a sentence is never drilled without its English.
 *
 *   node tools/pods/pod-drill/silence-lines.cjs <course> [--conc=4] [--limit=N] [--write]
 * Without --write it prints the tally and writes the per-turn report to $CS_SCRATCH. With --write it keeps the report
 * as ops/pod-drill-cuts/<course>.silence-lines.json and the cut file as <course>.cuts.json.
 * Measurement, not ear: nobody has heard a cut because this passed it.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')
const { cueMap, splitOn, spliceAndGate } = require('../splice-gates.cjs')

const execFileP = promisify(execFile)
const SPLICER = path.join(__dirname, '..', 'splice.py')
const OPS = process.env.POD_DRILL_OPS || path.join(__dirname, '..', '..', '..', 'ops', 'pod-drill-cuts')
const SHARE_TOL = 0.14   // of the whole turn's speech
const LONG_GAP_S = 2.5
const TRIM_S = 0.2       // keep at most this much of a long pause on each side of a cut
const PLACE_TOL = 0.1    // of the turn's speech
const PLACE_CLEAR = 0.08
const PLACE_MIN_GAP = 0.15
const RATE_RATIO = 1.7

/** Pure: rough syllables, vowel groups; good enough for a share of a turn, in Welsh and in English. */
const syllables = (t) => (String(t || '').toLowerCase().match(/[aeiouwyâêîôûŵŷáéíóúàèìòù]+/g) || []).length || 1

/** Pure: at each cut, the gap between the text's syllable share and the audio's share of speech time. */
function shareDeltas (sentences, spans, gapsMs, take = null) {
  const syl = sentences.map(syllables)
  const total = syl.reduce((a, b) => a + b, 0)
  const gaps = gapsMs.map((g) => g / 1000)
  const speech = spans.map(([a, b], i) => (b - a) - ((i < gaps.length ? gaps[i] / 2 + 0.05 : 0) + (i > 0 ? gaps[i - 1] / 2 + 0.05 : 0)))
  // Lead-in and tail silence are not speech: Aran's SC11 takes open on half a second of room tone (job #96). Only the
  // turns the audit retired take this: it would also pass four other refused turns, and those stay whole until Tom says.
  if (take) { speech[0] -= Math.max(0, take.speech_start - spans[0][0]); speech[speech.length - 1] -= Math.max(0, spans[spans.length - 1][1] - take.speech_end) }
  const allSpeech = speech.reduce((a, b) => a + b, 0)
  const out = []
  let s = 0
  let t = 0
  for (let i = 0; i < sentences.length - 1; i++) {
    s += syl[i]
    t += speech[i]
    out.push(Math.abs(s / total - t / allSpeech))
  }
  return out.map((d) => Math.round(d * 1000) / 1000)
}

/** Pure: player spans in ms, touching at most at the gap's middle (verifiedCutGroups refuses a card whose lines
 *  overlap, so the splicer's 50 ms pad past the middle must not reach the file), and at most TRIM_S into the pause. */
function msSpans (spans, gapsMs) {
  return spans.map(([a, b], i) => {
    const gapBefore = i > 0 ? gapsMs[i - 1] / 1000 : 0
    const gapAfter = i < gapsMs.length ? gapsMs[i] / 1000 : 0
    const start = i > 0 ? Math.max(a + 0.05, a + 0.05 + gapBefore / 2 - TRIM_S) : a
    const end = i < gapsMs.length ? Math.min(b - 0.05, b - 0.05 - gapAfter / 2 + TRIM_S) : b
    return [Math.round(start * 1000), Math.round(end * 1000)]
  })
}

/** Pure: speech-time share of a moment, with the pauses taken out. */
function speechShare (at, speechStart, speechEnd, gaps) {
  const total = speechEnd - speechStart - gaps.reduce((n, [a, b]) => n + (b - a), 0)
  const before = at - speechStart - gaps.reduce((n, [a, b]) => n + (b <= at ? b - a : 0), 0)
  return before / total
}

/** Pure: syllable share of every marked pause inside the text (comma, ellipsis, or a sentence end). */
function markedPauses (text) {
  const total = syllables(text)
  const marks = []
  const re = /[,…;:.!?]+\s+/g
  let m
  while ((m = re.exec(text))) marks.push(syllables(text.slice(0, m.index)) / total)
  return marks
}

/** Pure: which gap (index in time order) is each sentence end, or {refuse}. See PLACED BREAKS. */
function placeBreaks (sentences, text, take) {
  const { gaps, speech_start: s0, speech_end: s1 } = take
  if (gaps.length < sentences.length - 1) return { refuse: 'too_few_gaps' }
  const mid = (g) => speechShare(g[0], s0, s1, gaps)
  const syl = sentences.map(syllables)
  const total = syl.reduce((a, b) => a + b, 0)
  const at = []
  let acc = 0
  for (let i = 0; i < sentences.length - 1; i++) {
    acc += syl[i]
    const want = acc / total
    const near = gaps.map((g, j) => [Math.abs(mid(g) - want), j]).sort((a, b) => a[0] - b[0])
    if (near[0][0] > PLACE_TOL) return { refuse: 'placed_far' }
    if (near[1] && near[1][0] - near[0][0] < PLACE_CLEAR) return { refuse: 'placed_ambiguous' }
    if (gaps[near[0][1]][1] - gaps[near[0][1]][0] < PLACE_MIN_GAP) return { refuse: 'placed_short_gap' }
    at.push(near[0][1])
  }
  if (new Set(at).size !== at.length) return { refuse: 'placed_ambiguous' }
  const chosen = at.map((j) => gaps[j][1] - gaps[j][0])
  const marks = markedPauses(text)
  const unmarked = gaps.filter((g, j) => !at.includes(j) && !marks.some((p) => Math.abs(p - mid(g)) <= PLACE_TOL))
  const longest = Math.max(0, ...unmarked.map(([a, b]) => b - a))
  if (longest && Math.min(...chosen) / longest < 1.5) return { refuse: 'placed_margin' }
  return { at }
}

/** Pure: slowest and fastest sentence must agree. Only sentences of 4 syllables or more say anything. */
function ratesAgree (sentences, spans) {
  const rates = sentences.map((s, i) => [syllables(s), (spans[i][1] - spans[i][0]) / 1000]).filter(([n]) => n >= 4).map(([n, d]) => n / d)
  return rates.length < 2 || Math.max(...rates) / Math.min(...rates) <= RATE_RATIO
}

/** One side of a turn: split its text into sentences by the Welsh ellipsis rule, cut the take, run every gate. */
async function cutSide (clipFile, text, tag, dir, opts = {}) {
  const m = cueMap(text)
  if (!m) return { ok: false, reason: 'cue_map_refused' }
  const r = { sentences: m.sentences, n: m.sentences.length }
  if (r.n < 2) return { ...r, ok: false, reason: 'one_sentence' }
  const take = JSON.parse((await execFileP('python3', [SPLICER, clipFile, '2', path.join(dir, tag), '--gaps'])).stdout)
  const placed = placeBreaks(m.sentences, text, take)
  let res = await spliceAndGate(clipFile, r.n, path.join(dir, tag), { cues: m.cues, at: m.at })
  for (const f of res.files || []) fs.rmSync(f, { force: true })
  r.measure = res.measure
  r.method = 'strict'
  // A hesitation mark the reader did not pause at shifts every ordinal by one, and the strict cut then lands in the
  // wrong clean pause with every audio gate passing. So with hesitation marks in the text, it stands only if placing
  // the break by position finds the same gap. In #71's first run the two disagreed on 5 of 67: all 5 strict cuts were
  // mid-sentence, on reading the text against the gap times, and all 5 placed cuts were at the sentence end.
  const marked = m.cues > r.n - 1
  if (res.ok && !placed.refuse) {
    const strictMids = res.measure.piece_spans.slice(1).map(([a]) => a + 0.05)
    r.placed_agrees = placed.at.every((j, i) => Math.abs((take.gaps[j][0] + take.gaps[j][1]) / 2 - strictMids[i]) < 0.1)
  }
  if (res.ok && placed.refuse && marked) return { ...r, ok: false, reason: placed.refuse, strict: 'unconfirmed' }
  if ((res.ok && r.placed_agrees === false) || (!res.ok && res.reason === 'too_few_gaps')) {
    if (placed.refuse) return { ...r, ok: false, reason: placed.refuse, strict: res.reason }
    r.method = 'placed'
    res = await spliceAndGate(clipFile, r.n, path.join(dir, tag), { cues: take.gaps.length, at: placed.at })
    for (const f of res.files || []) fs.rmSync(f, { force: true })
    r.measure = res.measure
  }
  if (!res.ok) return { ...r, ok: false, reason: res.reason }
  const gaps = res.measure.cut_at_gaps_ms
  if (gaps.some((g) => g / 1000 > LONG_GAP_S)) return { ...r, ok: false, reason: 'suspect_long_gap' }
  r.share_deltas = shareDeltas(m.sentences, res.measure.piece_spans, gaps, opts.fairShare ? take : null)
  if (r.share_deltas.some((d) => d > SHARE_TOL)) return { ...r, ok: false, reason: 'syllable_share' }
  const spans = msSpans(res.measure.piece_spans, gaps)
  if (r.method === 'placed' && !ratesAgree(m.sentences, spans)) return { ...r, ok: false, reason: 'placed_rate' }
  return { ...r, ok: true, spans }
}

module.exports = { syllables, shareDeltas, msSpans, placeBreaks, ratesAgree, speechShare, markedPauses }
if (require.main !== module) return

const argv = process.argv.slice(2)
const opt = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] }))
const course = argv.find((a) => !a.startsWith('--'))
if (!course) { console.error('usage: silence-lines.cjs <course> [--conc=4] [--limit=N] [--write]'); process.exit(64) }
const input = JSON.parse(fs.readFileSync(path.join(OPS, `${course}.whole-turns.json`), 'utf8'))
const cards = opt.limit ? input.cards.slice(0, Number(opt.limit)) : input.cards
const scratch = process.env.CS_SCRATCH || os.tmpdir()
const cache = path.join(scratch, 'pod-clips')
fs.mkdirSync(cache, { recursive: true })

async function fetchClip (ref) {
  const f = path.join(cache, `${ref}.mp3`)
  if (fs.existsSync(f) && fs.statSync(f).size > 500) return f
  await execFileP('curl', ['-sL', '--fail', '--max-time', '60', '-o', f, `https://saysomethingin.app/api/audio/${ref}`])
  if (!fs.existsSync(f) || fs.statSync(f).size < 500) throw new Error(`clip too small: ${ref}`)
  return f
}

async function handle (c) {
  const tag = c.id.replace(/[^A-Za-z0-9_-]/g, '_')
  const row = { id: c.id, scene: c.scene, speaker: c.speaker, target: c.target, known: c.known, targetAudioId: c.targetAudioId, knownAudioId: c.knownAudioId, targetVoice: c.targetVoice, knownVoice: c.knownVoice, targetOrigin: c.targetOrigin, knownOrigin: c.knownOrigin }
  if (!c.targetAudioId) return { ...row, verdict: 'whole', reason: 'no_target_take' }
  const t = await cutSide(await fetchClip(c.targetAudioId), c.target, `${tag}-t`, scratch, { fairShare: /retired/.test(c.why || '') })
  row.targetSide = t
  if (!t.ok) return { ...row, verdict: 'whole', reason: `target:${t.reason}` }
  // The renderer's cue pause stays on the front of a sentence in stored text; the Drill looks the words up, so drop it.
  const kParts = splitOn(c.known, /(?<=[.!?])\s+/).map((s) => s.replace(/^[…\s]+/u, '').trim()).filter(Boolean)
  if (kParts.length !== t.n) return { ...row, verdict: 'whole', reason: 'known_count_mismatch', knownParts: kParts.length }
  // Same-voice clip of the exact sentence: what the Drill's by-text lookup will find.
  const reuse = (c.knownSentenceClips || []).map((s) => (s.clips || [])[0] || null)
  let k = null
  if (c.knownAudioId && !(reuse.length === t.n && reuse.every(Boolean))) {
    k = await cutSide(await fetchClip(c.knownAudioId), c.known, `${tag}-k`, scratch)
    row.knownSide = k
  }
  const lines = []
  const levels = []
  for (let i = 0; i < t.n; i++) {
    const tl = [t.sentences[i], t.spans[i][0], t.spans[i][1]]
    if (reuse[i]) {
      // kc: the clip itself, so a card never waits on the Drill's by-text lookup (the live read lost the race on the
      // first such card of every scene, job #96, and it played Welsh three times with no English).
      lines.push({ t: tl, k: [kParts[i]], kc: reuse[i].ref, chunks: [] })
      levels.push('reuse')
    } else if (k?.ok && k.n === t.n) {
      lines.push({ t: tl, k: [kParts[i], k.spans[i][0], k.spans[i][1]], chunks: [] })
      levels.push(c.knownOrigin === 'human' ? 'cut-human' : 'cut-tts')
    } else {
      return { ...row, verdict: 'whole', reason: k ? `known:${k.reason}` : 'known:no_take', gapTtsChars: String(c.known || '').length }
    }
  }
  row.levels = levels
  row.verdict = 'cut'
  row.cut = { clip: c.targetAudioId, knownClip: c.knownAudioId, lines }
  return row
}

;(async () => {
  const out = []
  let next = 0
  await Promise.all(Array.from({ length: Number(opt.conc || 4) }, async () => {
    while (next < cards.length) {
      const c = cards[next++]
      try {
        out.push(await handle(c))
      } catch (e) {
        out.push({ id: c.id, target: c.target, verdict: 'whole', reason: `error:${e.message.slice(0, 120)}` })
      }
    }
  }))
  out.sort((a, b) => a.id.localeCompare(b.id))
  const tally = {}
  for (const r of out) {
    const k = r.verdict === 'cut' ? 'cut' : r.reason.replace(/^error.*/, 'error')
    tally[k] = (tally[k] || 0) + 1
  }
  const levels = {}
  for (const r of out) for (const l of r.levels || []) levels[l] = (levels[l] || 0) + 1
  const sides = out.flatMap((r) => [r.targetSide, r.knownSide]).filter(Boolean)
  const calibration = { strict: sides.filter((x) => x.placed_agrees !== undefined).length, agree: sides.filter((x) => x.placed_agrees === true).length, placedKept: sides.filter((x) => x.ok && x.method === 'placed').length }
  const summary = { turns: out.length, calibration, cut: tally.cut || 0, sentences: out.reduce((n, r) => n + (r.cut?.lines.length || 0), 0), tally, englishLevels: levels }
  console.log(JSON.stringify(summary, null, 1))
  const report = { course, tool: 'tools/pods/pod-drill/silence-lines.cjs (#71)', summary, turns: out }
  const reportPath = path.join(opt.write ? OPS : scratch, `${course}.silence-lines.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 1) + '\n')
  console.log(`report: ${reportPath}`)
  if (opt.write) {
    const sentences = Object.fromEntries(out.filter((r) => r.cut).map((r) => [r.id, r.cut]))
    fs.writeFileSync(path.join(OPS, `${course}.cuts.json`), JSON.stringify({ course, format: 2, tool: report.tool, summary: { cards: out.length, verified: summary.cut }, sentences }) + '\n')
  }
})().catch((e) => { console.error(e); process.exit(1) })
