#!/usr/bin/env node
/**
 * POD DRILL BOUNDARY SCORE (job #707). Says, for every KNOWN-side Drill piece the stage cut out of a
 * card's whole English clip, whether the cut is CLEAN or TIGHT, and why in plain words, from the
 * render's own stored Cartesia word timings only (r-2026-11-03: never Whisper).
 *
 *   node tools/pods/pod-drill/score.mjs <course> [--write] [--json]     (normally run by stage.mjs)
 *
 * Why this exists: pair.mjs places each seam (quietest 10 ms frame within 60 ms of the timing
 * boundary) but never judged the cut it made, and Kai heard about half the German and Spanish known
 * pieces as "clipped short, or carrying a fragment of the neighbouring audio" (d/620808e0, #669).
 * Tom, r-2026-11-03-pod-1-drill-cuts-do-not: "When a shorter piece is really too tight to cut from
 * the full take, re-bake that short piece as its own clip"; and: "Many of them will work fine. We can
 * tell which ones will be tight by the voice timings". So: clean cuts stay cuts, tight pieces are
 * re-rendered standalone (render.mjs), and this file is the line between the two.
 *
 * Per seam (an edge a piece shares with its neighbour; a clip's own first/last edge is not a seam),
 * between the last word A of one piece and the first word B of the next:
 *   gap     B's timed start minus A's timed end: the silence the voice left to cut in
 *   inside  the seam falls inside A's or B's timed span (A clipped / B's onset carried)
 *   margin  how far the seam sits from the nearer timed word edge (negative = inside a word)
 * A seam is tight when its margin is under BOUNDARY.MARGIN_MS; a piece is tight when either of its
 * seams is. Both pieces either side of a tight seam are tight: one loses a tail, the other carries it.
 *
 * Writes (--write) ops/pod-drill-cuts/<course>.score.json: one row per known piece, with its seams,
 * verdict and reason; render.mjs reads it, and /production/<course>/pod-drill shows it.
 * Reads only committed files: <course>.dump.json and <course>.cuts.json. Renders nothing.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { OPS, cutsPath } from './paths.mjs'
import { knownLangOf, wordsIn, segmentZh, alignTimes, cartesiaSegs, tileWords, BOUNDARY } from './lib.mjs'

/** One seam's facts and verdict. All times ms. aEnd/bStart from the timings; seam from the cut. */
export function scoreSeam({ seam, aWord, aEnd, bWord, bStart }) {
  const gap = Math.round(bStart - aEnd)
  const intoA = Math.round(aEnd - seam), intoB = Math.round(seam - bStart)
  const margin = Math.min(seam - aEnd, bStart - seam)
  let why
  if (intoA > 0) why = `cut ${intoA} ms inside "${aWord}"`
  else if (intoB > 0) why = `cut ${intoB} ms inside "${bWord}"`
  else if (bStart - seam <= seam - aEnd) why = `"${bWord}" starts ${Math.round(bStart - seam)} ms after the cut`
  else why = `"${aWord}" ends ${Math.round(seam - aEnd)} ms before the cut`
  if (gap <= 0) why += ` (no silence between "${aWord}" and "${bWord}")`
  else why += ` (${gap} ms of silence between the words)`
  return { seam: Math.round(seam), aWord, bWord, gapMs: gap, marginMs: Math.round(margin), inside: intoA > 0 ? 'a' : intoB > 0 ? 'b' : null, tight: margin < BOUNDARY.MARGIN_MS, why }
}

/** Score every known piece of one course. Returns {rows, unscored}. */
export function scoreCourse(course, { dump, cuts } = {}) {
  dump ??= JSON.parse(readFileSync(path.join(OPS, `${course}.dump.json`), 'utf8'))
  cuts ??= JSON.parse(readFileSync(cutsPath(course), 'utf8'))
  const KNOWN = knownLangOf(course)
  const wordsOf = course === 'zho_for_eng' ? segmentZh : (t) => wordsIn(t, KNOWN)
  const byId = new Map(dump.cards.map((d) => [d.id, d]))
  const rows = [], unscored = []
  for (const [id, e] of Object.entries(cuts.sentences || {})) {
    const pieces = [] // {li, ci, known, ks, ke}
    const multi = e.lines.length > 1
    for (const [li, l] of e.lines.entries()) {
      if (l.chunks.length >= 2) for (const [ci, c] of l.chunks.entries()) pieces.push({ li, ci, known: c[3], ks: c[4], ke: c[5], target: c[0], standalone: c[6] || null })
      else pieces.push({ li, ci: null, known: multi ? l.k?.[0] : null, ks: multi ? l.k?.[1] : null, ke: multi ? l.k?.[2] : null, line: true })
    }
    const cutPieces = pieces.filter((p) => !p.line && p.ks != null && p.ke != null)
    if (!cutPieces.length) continue // no known piece is cut from this card's English clip
    const d = byId.get(id)
    const base = { id, knownClip: e.knownClip || null, knownSentence: d?.known || null }
    const segs = d && cartesiaSegs(d.knownWordTimings)
    const tm = segs && e.knownClip === d.knownAudioId ? alignTimes(wordsOf(d.known), segs, KNOWN) : null
    const ranges = tm ? tileWords(wordsOf(d.known), pieces.map((p) => p.known)) : null
    if (!tm || !ranges) {
      const why = !d ? 'the card is not in the pod any more'
        : !segs ? 'the English clip has no stored Cartesia word timings'
          : e.knownClip !== d.knownAudioId ? 'the cut was made from a different English clip from the one the card plays now'
            : !tm ? 'the stored timings do not say the English sentence'
              : 'the pieces do not tile the English sentence'
      for (const p of cutPieces) { const r = { ...base, line: p.li, chunk: p.ci, known: p.known, target: p.target, startMs: p.ks, endMs: p.ke, verdict: 'unscored', why }; rows.push(r); unscored.push(r) }
      continue
    }
    const words = wordsOf(d.known)
    const seamAt = (i) => scoreSeam({ seam: pieces[i].ke, aWord: words[ranges[i][1]], aEnd: tm.ends[ranges[i][1]] * 1000, bWord: words[ranges[i + 1][0]], bStart: tm.starts[ranges[i + 1][0]] * 1000 })
    pieces.forEach((p, i) => {
      if (p.line || p.ks == null || p.ke == null) return
      const seams = []
      if (i > 0 && pieces[i - 1].ke != null) seams.push({ edge: 'start', ...seamAt(i - 1), seam: Math.round(p.ks) })
      if (i < pieces.length - 1) seams.push({ edge: 'end', ...seamAt(i) })
      const bad = seams.filter((s) => s.tight)
      const worst = [...seams].sort((x, y) => x.marginMs - y.marginMs)[0]
      rows.push({ ...base, line: p.li, chunk: p.ci, known: p.known, target: p.target, startMs: p.ks, endMs: p.ke, seams,
        verdict: bad.length ? 'tight' : 'clean',
        why: bad.length ? bad.map((s) => `${s.edge === 'start' ? 'start' : 'end'}: ${s.why}`).join('; ') : worst ? `${worst.edge}: ${worst.why}` : 'no seam',
        ...(p.standalone ? { standalone: p.standalone } : {}) })
    })
  }
  return { rows, unscored }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const course = process.argv.slice(2).find((a) => !a.startsWith('--'))
  if (!course) { console.error('usage: score.mjs <course> [--write] [--json]'); process.exit(1) }
  const { rows, unscored } = scoreCourse(course)
  const n = (v) => rows.filter((r) => r.verdict === v).length
  const out = { course, tool: 'tools/pods/pod-drill/score.mjs (#707)', boundary: BOUNDARY, totals: { pieces: rows.length, clean: n('clean'), tight: n('tight'), unscored: n('unscored') }, pieces: rows }
  if (process.argv.includes('--json')) console.log(JSON.stringify(out, null, 1))
  console.error(`${course}: ${JSON.stringify(out.totals)}`)
  for (const r of unscored) console.error(`  unscored ${r.id} "${r.known}": ${r.why}`)
  if (process.argv.includes('--write')) {
    // keep what render.mjs recorded (the standalone clip and how it was made) across re-scores
    const f = path.join(OPS, `${course}.score.json`)
    const prev = existsSync(f) ? new Map(JSON.parse(readFileSync(f, 'utf8')).pieces.map((r) => [`${r.id}|${r.line}|${r.chunk}`, r])) : new Map()
    for (const r of rows) { const p = prev.get(`${r.id}|${r.line}|${r.chunk}`); if (p?.render) r.render = p.render }
    writeFileSync(f, JSON.stringify(out, null, 1) + '\n')
  }
}
