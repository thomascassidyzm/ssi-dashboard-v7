#!/usr/bin/env node
/**
 * PLAN a pod drill cut from the course's LEGOs (job #419, Tom 2026-10-31: "We use the LEGOs, they're already in the pods").
 * Read-only: it writes nothing to Popty or the database, and renders nothing.
 *
 *   node tools/audio/clip-cut-lego-plan.cjs <cards.json> <out-spec.json>
 *
 * cards.json: [{ courseCode, sourceAudioId, target, known?, label?, agentWords? }, ...]   (the pod line and its whole clip;
 *   agentWords from an earlier plan are reused, re-checked, rather than asked again)
 * For each card:
 *   1. the course's LEGOs, read through Popty's own GET /api/production/:courseCode/seeds;
 *   2. an unspaced line (Chinese) is split into WORDS by an agent (Haiku, through the Claude CLI — services/shared/claude-cli
 *      .cjs, never the SDK), all cards at once, and the split is checked here: its words rejoin to the line exactly;
 *   3. the line is tiled by LEGOs (services/shared/clip-cut-lego-split.cjs) — the agent's words only stop a LEGO match
 *      falling inside a word, they never choose a cut;
 *   4. LIBRARY FIRST, as the one render route does: each piece is asked of POST /api/audio/render with dryRun:true,
 *      voice-bound to the line speaker's cast target voice (the pod's own speakers table, GET /api/pods/:course/pod-1).
 *      A `library` answer means a clip of exactly those words in that voice already exists — that piece needs no cut.
 * Writes the spec tools/audio/clip-cut.cjs runs: pieces, glosses (the LEGOs' known texts), and per piece `plan`.
 */
'use strict'

const fs = require('fs')
const { legoSplit, legoIndex, checkWordSplit, exactLego } = require('../../services/shared/clip-cut-lego-split.cjs')

const POPTY = process.env.POPTY_API || 'http://localhost:3470'
const AGENT = 'job-419-clip-cut-plan'
const UNSPACED = new Set(['zho', 'jpn', 'tha', 'yue'])

async function getJson(url) {
  const r = await fetch(url, { headers: { 'x-agent-id': AGENT } })
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`)
  return r.json()
}

async function courseLegos(courseCode) {
  const d = await getJson(`${POPTY}/api/production/${courseCode}/seeds`)
  const out = []
  for (const s of d.seeds || []) for (const l of s.legos || []) out.push({ legoId: l.lego_id, target: l.target_text, known: l.known_text, target1AudioId: l.target1_audio_id })
  return out
}

async function podSpeakerVoice(courseCode, sourceAudioId) {
  const d = await getJson(`${POPTY}/api/pods/${courseCode}/pod-1`)
  const base = String(sourceAudioId).replace(/\.v\d+$/, '')
  const line = (d.sentences || []).find((x) => x.target_audio_id === base)
  const sp = line && d.pod && d.pod.speakers ? d.pod.speakers[line.speaker] : null
  return { podSentenceId: line ? line.id : null, speaker: line ? line.speaker : null, voiceId: sp && sp.target ? sp.target.voice_id : null }
}

const WORD_PROMPT = (text) => `Split this Chinese sentence into words (词), exactly as a dictionary would segment it. Keep punctuation attached to the word before it. Do not add, drop or change any character. Answer with ONLY a JSON array of strings, nothing else.\n\n${text}`

async function agentWords(text) {
  const { claudeChat } = require('../../services/shared/claude-cli.cjs')
  const raw = String(await claudeChat(WORD_PROMPT(text), { model: 'haiku', timeout: 120000 }))
  let words
  try { words = JSON.parse(raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1)) } catch { throw new Error(`agent gave no JSON array for "${text}": ${raw.slice(0, 200)}`) }
  const why = checkWordSplit(text, words)
  if (why) throw new Error(`agent word split refused for "${text}": ${why}`)
  return words.map(String)
}

async function libraryAnswer(courseCode, text, voiceId) {
  const r = await fetch(`${POPTY}/api/audio/render`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT },
    body: JSON.stringify({ courseCode, role: 'target1', text, voiceId: voiceId || undefined, purpose: 'job #419 pod drill cut plan: library-first check per LEGO piece (dry run, no render, no link)', dryRun: true }),
  })
  const j = await r.json().catch(() => ({}))
  return j.source === 'library' ? { audioId: j.audioId, s3Key: j.s3Key, durationMs: j.durationMs } : { none: j.source || j.code || `HTTP ${r.status}` }
}

async function main() {
  const [cardsPath, outPath] = process.argv.slice(2)
  if (!cardsPath || !outPath) { console.error('usage: clip-cut-lego-plan.cjs <cards.json> <out-spec.json>'); process.exit(2) }
  const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf8'))
  // the agent's word splits, all unspaced lines in parallel (one script, a handful of calls — r-2026-10-07)
  const words = await Promise.all(cards.map((c) => (UNSPACED.has(c.courseCode.split('_')[0]) ? (c.agentWords && !checkWordSplit(c.target, c.agentWords) ? c.agentWords : agentWords(c.target)) : null)))
  const legoCache = new Map()
  const spec = []
  for (const [i, c] of cards.entries()) {
    if (!legoCache.has(c.courseCode)) legoCache.set(c.courseCode, legoIndex(await courseLegos(c.courseCode)))
    const split = legoSplit(c.target, legoCache.get(c.courseCode), { words: words[i] })
    const who = await podSpeakerVoice(c.courseCode, c.sourceAudioId)
    const plan = []
    for (const p of split.pieces) {
      const lib = await libraryAnswer(c.courseCode, p.text, who.voiceId)
      plan.push({ text: p.text, legoIds: p.legos.map((l) => l.legoId), unmapped: p.unmapped, units: p.units, syllables: p.syllables, exactLego: exactLego(p) ? exactLego(p).legoId : null, library: lib })
    }
    spec.push({
      label: c.label, courseCode: c.courseCode, sourceAudioId: c.sourceAudioId, target: c.target, known: c.known, knownText: c.known,
      podSentenceId: who.podSentenceId, speaker: who.speaker, voiceId: who.voiceId, agentWords: words[i],
      pieces: split.pieces.map((p) => p.text),
      glosses: split.pieces.map((p) => (p.unmapped ? null : p.legos.map((l) => l.known).join(' '))),
      whole: split.whole, coverage: Math.round(split.coverage * 100) / 100, plan,
    })
    console.log(`${c.label}: ${split.whole ? 'WHOLE' : split.pieces.length + ' pieces'} ${plan.map((p) => `[${p.text}${p.unmapped ? '*' : ''}${p.library.audioId ? ' LIB' : ''}]`).join(' ')}`)
  }
  fs.writeFileSync(outPath, JSON.stringify(spec, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })
