#!/usr/bin/env node
/**
 * SPLIT CLIP AUDIT (job #96, 2026-11-06). The sentence clips on a pod row were cut by cue count, which on human takes
 * can land mid-sentence with every audio gate passing (#71). This checks the clips that are live: it takes the row's
 * clips from Popty's own read-only GET /api/pod-scripts/<course>, finds where each one really sits in the whole take by
 * waveform correlation (align-pieces.py), and compares those breaks with where POSITION says the sentence ends
 * (silence-lines.cjs placeBreaks, the same rule that caught #71's five). It reads no database and writes no row.
 *
 * Verdicts, per side of a turn: position-agrees (every live break is at the gap position places the sentence end at);
 * MID-SENTENCE (provably wrong: position rules against a live break, or a break sits outside the speech so a clip is
 * empty, or a clip's words cannot fit in its speech, or a clip carries no speech); unproven (position refuses, or the
 * clip does not align to the current take). `suspect` on an unproven side says a live break is not at the gap nearest
 * the sentence end: worth an ear, not a verdict. A silent seam proves nothing, so seams are not consulted.
 *
 *   node tools/pods/pod-drill/split-clip-audit.cjs <course> [--pod=pod-1] [--write]
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')
const { cueMap, splitOn, KNOWN_SPLIT } = require('../splice-gates.cjs')
const { placeBreaks, syllables, speechShare } = require('./silence-lines.cjs')

const execFileP = promisify(execFile)
const OPS = path.join(__dirname, '..', '..', '..', 'ops', 'pod-drill-cuts')
const SPLICER = path.join(__dirname, '..', 'splice.py')
const ALIGN = path.join(__dirname, 'align-pieces.py')
const ALIGN_MIN = 0.8    // correlation under this: the piece is not from this take
const AT_GAP_S = 0.12    // a break this close to a gap (past its edges) is at that gap
const MAX_RATE = 15      // syllables a second of speech above the floor; twice a fast reader, so a clip over this cannot hold its words
const MIN_SPEECH_S = 0.1

const argv = process.argv.slice(2)
const opt = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] }))
const course = argv.find((a) => !a.startsWith('--'))
if (!course) { console.error('usage: split-clip-audit.cjs <course> [--pod=pod-1] [--write]'); process.exit(64) }
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

/** Pure: the gap index a break falls in, or -1 when it falls on no gap. */
const gapAt = (t, gaps) => gaps.findIndex(([a, b]) => t >= a - AT_GAP_S && t <= b + AT_GAP_S)

/** Pure: is the clip's speech enough to hold the words the clip claims? */
const rateFault = (p) => (p.speech < MIN_SPEECH_S ? 'piece_empty' : syllables(p.text) / p.speech > MAX_RATE ? 'rate_impossible' : null)
const wordsOnly = (t) => String(t || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

async function auditSide (take, pieces, text, sentences, tag) {
  const whole = await fetchClip(take.ref)
  const files = []
  for (const p of pieces) files.push(await fetchClip(p.ref))
  const at = JSON.parse((await execFileP('python3', [ALIGN, whole, ...files], { maxBuffer: 8 << 20 })).stdout)
  const t = JSON.parse((await execFileP('python3', [SPLICER, whole, '2', path.join(scratch, tag), '--gaps'], { maxBuffer: 8 << 20 })).stdout)
  const ps = pieces.map((p, i) => ({ ref: p.ref, text: p.text, voice: p.voice_id, ...at[i], aligned: at[i].score >= ALIGN_MIN }))
  const r = { take: take.ref, takeVoice: take.voice_id, pieces: ps, gaps: t.gaps, speechStart: t.speech_start, speechEnd: t.speech_end, sentences }
  const voices = [...new Set(ps.map((p) => p.voice))]
  if (voices.length > 1 || voices[0] !== take.voice_id) r.voiceNote = voices.join(',')
  const faults = ps.map(rateFault)
  if (sentences.length !== ps.length || ps.some((p, i) => wordsOnly(p.text) !== wordsOnly(sentences[i]))) r.textNote = 'clip_text_differs_from_sentence'
  if (faults.some(Boolean)) return { ...r, verdict: 'MID-SENTENCE', why: faults.filter(Boolean).join(','), faults }
  if (sentences.length !== ps.length) return { ...r, verdict: 'unproven', why: 'piece_count_differs_from_sentences' }
  // A break needs one aligned side: a piece reused from another take says where its neighbour stopped.
  r.breaks = ps.slice(1).map((p, i) => {
    const prev = ps[i]
    if (prev.aligned && p.aligned) return (prev.end + p.start) / 2
    return prev.aligned ? prev.end - 0.05 : p.aligned ? p.start + 0.05 : null
  })
  if (r.breaks.every((b) => b === null)) return { ...r, verdict: 'unproven', why: 'pieces_not_from_this_take' }
  if (r.breaks.some((b) => b !== null && (b < t.speech_start || b > t.speech_end))) return { ...r, verdict: 'MID-SENTENCE', why: 'break_outside_speech' }
  const placed = placeBreaks(sentences, text, t)
  r.liveGaps = r.breaks.map((b) => (b === null ? null : gapAt(b, t.gaps)))
  if (r.liveGaps.includes(-1)) return { ...r, verdict: 'MID-SENTENCE', why: 'break_on_speech' }
  if (placed.refuse) {
    const syl = sentences.map(syllables)
    const total = syl.reduce((a, b) => a + b, 0)
    let acc = 0
    r.nearestGaps = sentences.slice(0, -1).map((_, i) => {
      acc += syl[i]
      const near = t.gaps.map((g, j) => [Math.abs(speechShare(g[0], t.speech_start, t.speech_end, t.gaps) - acc / total), j]).sort((a, b) => a[0] - b[0])
      return near.length ? near[0][1] : null
    })
    r.everyGapCut = t.gaps.length === sentences.length - 1
    r.suspect = !r.everyGapCut && r.liveGaps.some((g, i) => g !== null && g !== r.nearestGaps[i])
    return { ...r, verdict: 'unproven', why: placed.refuse }
  }
  r.placedGaps = placed.at.map((j) => t.gaps[j])
  r.disagree = r.liveGaps.map((g, i) => g !== null && g !== placed.at[i])
  return { ...r, verdict: r.disagree.some(Boolean) ? 'MID-SENTENCE' : 'position-agrees' }
}

;(async () => {
  const script = await (await fetch(`http://localhost:3470/api/pod-scripts/${course}`)).json()
  if (opt.pod && script.slug !== opt.pod) throw new Error(`pod-scripts serves ${script.slug}`)
  const lines = script.scenes.flatMap((s) => s.lines).filter((l) => (l.audio.target_splits || []).length >= 2)
  const out = []
  let next = 0
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (next < lines.length) {
      const l = lines[next++]
      const tag = l.id.replace(/[^A-Za-z0-9_-]/g, '_')
      const row = { id: l.id, speaker: l.speaker, target: l.target_text, known: l.known_text }
      try {
        const m = cueMap(l.target_text)
        row.welsh = await auditSide(l.audio.target, l.audio.target_splits, l.target_text, m ? m.sentences : [], `${tag}-t`)
        if ((l.audio.known_splits || []).length >= 2) row.english = await auditSide(l.audio.known, l.audio.known_splits, l.known_text, splitOn(l.known_text, KNOWN_SPLIT), `${tag}-k`)
        else row.english = { verdict: 'no-english-split' }
      } catch (e) { row.error = e.message.slice(0, 160) }
      out.push(row)
    }
  }))
  out.sort((a, b) => a.id.localeCompare(b.id))
  const tally = (side) => out.reduce((n, r) => { const k = r[side]?.verdict || 'error'; n[k] = (n[k] || 0) + 1; return n }, {})
  const summary = { turns: out.length, clips: out.reduce((n, r) => n + (r.welsh?.pieces.length || 0), 0), welsh: tally('welsh'), english: tally('english') }
  console.log(JSON.stringify(summary, null, 1))
  const file = path.join(opt.write ? OPS : scratch, `${course}.split-clip-audit.json`)
  fs.writeFileSync(file, JSON.stringify({ course, tool: 'tools/pods/pod-drill/split-clip-audit.cjs (#96)', summary, turns: out }, null, 1) + '\n')
  console.log(file)
})().catch((e) => { console.error(e); process.exit(1) })
