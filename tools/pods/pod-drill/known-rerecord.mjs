/**
 * KNOWN-SIDE RE-RECORD LIST (job #665, Tom 2026-11-03: "we just cut the pieces out of the known
 * side's full sentence / if we Cannot do that - i.e. ordering differences, then we should probably
 * re-record the known language piece / the cuts MUST be possible in the target language because
 * that's the order we are following").
 *
 *   node tools/pods/pod-drill/known-rerecord.mjs <course> [--write]   (normally via stage.mjs)
 *
 * Read-only over committed files: ops/pod-drill-cuts/<course>.dump.json and the player's cut file.
 * For every Drill piece (a verified cut's chunks, else the card's fine-map chunks) it asks whether
 * the piece's known text can be cut from the card's WHOLE known sentence: each piece's known words
 * an unbroken run of that sentence, the runs in the TARGET's order, together covering it.
 *   already-cut   the cut file carries the known span (pair.mjs made it)
 *   cuttable      text says yes; the span waits on the known clip's word timings
 *   re-record     every piece's known words ARE in the sentence, but in a different order from the
 *                 target's: no cut in target order exists, so the known piece needs its own recording
 *   needs-pairing the piece's known text is worded differently from the sentence (a LEGO gloss,
 *                 "I would" against "I'd"), so text cannot say; pair.mjs's meaning-chunk pairing
 *                 decides, and only an ordering failure there joins the re-record list
 * Language-neutral: words are runs of letters/digits in any script; nothing assumes the known
 * language. Renders nothing — audio goes through Popty's single route, on Kai's say-so.
 * --write writes ops/pod-drill-cuts/<course>.known-rerecord.json.
 *
 * After pair.mjs --lego-only (job #669) has cut what it can, a "cuttable" piece that is still uncut
 * is sorted by WHY, from <course>.report.json:
 *   plays-whole   the card has no cut, so Drill plays it whole (the load rule called it short, or its
 *                 TARGET side would not cut): there is no Drill piece, so no known piece is needed
 *   re-record     the known side is what blocked it: the English clip has no Cartesia timings that
 *                 say its text (fix: re-render that whole English sentence, which stores them), or its
 *                 known seam was too shallow to cut cleanly (fix: record the piece on its own)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { OPS, cutsPath } from './paths.mjs'

const course = process.argv.slice(2).find((a) => !a.startsWith('--'))
const write = process.argv.includes('--write')
if (!course) { console.error('usage: known-rerecord.mjs <course> [--write]'); process.exit(1) }
const dump = JSON.parse(readFileSync(path.join(OPS, `${course}.dump.json`), 'utf8'))
const cutPath = cutsPath(course)
const cuts = existsSync(cutPath) ? JSON.parse(readFileSync(cutPath, 'utf8')).sentences : {}
const knownLang = course.split('_for_')[1] || null
const repPath = path.join(OPS, `${course}.report.json`)
const report = existsSync(repPath) ? new Map(JSON.parse(readFileSync(repPath, 'utf8')).cards.map((c) => [c.id, c])) : new Map()
const prPath = path.join(OPS, `${course}.pair-report.json`)
const knownFill = existsSync(prPath) ? JSON.parse(readFileSync(prPath, 'utf8')).knownFill || {} : {}
/** Why a text-cuttable piece is still uncut: { kind: 'plays-whole'|'re-record', why, fix? }. */
function stillUncut(d, cut) {
  const r = report.get(d.id) || {}
  const isCutNow = cut && (cut.lines.length > 1 || cut.lines.some((l) => (l.chunks || []).length >= 2))
  if (!isCutNow) {
    if (r.status === 'short' || !r.status) return { kind: 'plays-whole', why: 'the load rule keeps this card whole in Drill: no piece is played' }
    if (/English/.test(r.why || '')) return { kind: 're-record', why: r.why, fix: 're-render the whole English sentence (stores its Cartesia timings), then rerun pair.mjs --lego-only' }
    return { kind: 'plays-whole', why: `Drill plays this card whole; its target side would not cut: ${r.why || 'unknown'}` }
  }
  const w = r.knownWhole || (knownFill[d.id] && knownFill[d.id] !== 'filled' ? knownFill[d.id] : null) || 'the English clip could not be cut at these pieces'
  return /timings/.test(w)
    ? { kind: 're-record', why: w, fix: 're-render the whole English sentence (stores its Cartesia timings), then rerun pair.mjs --lego-only' }
    : { kind: 're-record', why: w, fix: 'record each known piece on its own' }
}

const words = (t) => (String(t || '').toLowerCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || [])

/** 'cut' | 'order' (every piece is an unbroken run of the sentence, not in target order) | 'wording'. */
function cutPlan(sentence, pieces) {
  const sw = words(sentence)
  const runs = []
  for (const p of pieces) {
    const pw = words(p)
    if (!pw.length) return { kind: 'wording', why: 'piece has no known text' }
    const hits = []
    for (let i = 0; i + pw.length <= sw.length; i++) if (pw.every((w, j) => sw[i + j] === w)) hits.push(i)
    if (!hits.length) return { kind: 'wording', why: `"${p}" is not said word for word in "${sentence}"` }
    runs.push({ p, len: pw.length, hits })
  }
  // In target order, each run starting where the previous ended, covering the sentence.
  let at = 0, inOrder = true
  for (const r of runs) { if (r.hits.includes(at)) at += r.len; else { inOrder = false; break } }
  if (inOrder && at === sw.length) return { kind: 'cut' }
  if (inOrder || runs.reduce((n, r) => n + r.len, 0) !== sw.length) return { kind: 'wording', why: 'the pieces do not cover the known sentence exactly' }
  return { kind: 'order', why: `the known sentence "${sentence}" says these pieces in a different order from the target` }
}

const out = []
const tally = { 'already-cut': 0, cuttable: 0, 're-record': 0, 'needs-pairing': 0, 'plays-whole': 0 }
const playsWhole = []
const pairing = []
for (const d of dump.cards) {
  const cut = cuts[d.id]
  // A verified cut's lines: its chunks are the Drill pieces.
  const lines = cut?.lines?.some((l) => (l.chunks || []).length >= 2) || cut?.lines?.length > 1
    ? cut.lines.map((l, li) => ({ li, known: cut.lines.length > 1 ? l.k?.[0] || '' : d.known, chunks: (l.chunks || []).map((c) => ({ target: c[0], known: c[3] || '', span: c[4] != null && c[5] != null })) }))
    : (d.chunks || []).length >= 2
      ? [{ li: 0, known: d.known, chunks: d.chunks.map((c) => ({ target: c.text, known: c.gloss || '', span: false, lego: c.legoKey })) }]
      : []
  for (const l of lines) {
    if (l.chunks.length < 2) continue
    if (l.chunks.every((c) => c.span)) { tally['already-cut'] += l.chunks.length; continue }
    const plan = cutPlan(l.known, l.chunks.map((c) => c.known))
    if (plan.kind === 'cut') {
      const u = stillUncut(d, cut)
      const rows = l.chunks.map((c) => ({ course, card: d.id, line: l.li, lego: c.lego || null, target: c.target, known: c.known, knownSentence: l.known, why: u.why, ...(u.fix ? { fix: u.fix } : {}) }))
      if (u.kind === 're-record') { tally['re-record'] += l.chunks.length; out.push(...rows) } else { tally['plays-whole'] += l.chunks.length; playsWhole.push(...rows) }
      continue
    }
    const rows = l.chunks.map((c) => ({ course, card: d.id, line: l.li, lego: c.lego || null, target: c.target, known: c.known, knownSentence: l.known, why: plan.why }))
    if (plan.kind === 'order') { tally['re-record'] += l.chunks.length; out.push(...rows) } else { tally['needs-pairing'] += l.chunks.length; pairing.push(...rows) }
  }
}
const result = { course, knownLanguage: knownLang, tool: 'tools/pods/pod-drill/known-rerecord.mjs (job #665, Popty #692)', note: 'A LIST, not audio. Nothing is rendered until Kai authorises it, through Popty /api/audio/render.', tally, rerecord: out, needsPairing: pairing, playsWhole }
console.log(`${course}: ${JSON.stringify(tally)}`)
if (write) writeFileSync(path.join(OPS, `${course}.known-rerecord.json`), JSON.stringify(result, null, 2) + '\n')
