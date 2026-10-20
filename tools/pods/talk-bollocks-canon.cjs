#!/usr/bin/env node
/**
 * talk-bollocks-canon — the Talk Bollocks pods, made from what Tom and Aran actually said.
 *
 * Tom, 2026-10-20: "The one I want to get rid of is the ones the agents made up for Tom and
 * Aran Talk Bollocks ... It didn't work because it just did not sound enough like us ... we
 * should have just used the precise transcripts from Tom and Aran Talk Bollocks 1, 2 and 4,
 * cleaned them up into the 2 separate voices as logically as possible, and then made this the
 * canonical text - expressed in English."
 *
 * THE CHAIN, every link checkable:
 *   Tom's edited Descript transcript (archive/docs-retired-2026-09-03/corpus/talk-bollocks/part-N.md)
 *   + the DECLARED edits for that part (talk-bollocks-edits.cjs: which line is whose, what is
 *     dropped as noise, the few spellings corrected)
 *   = the canonical English, one row per sentence, written as a pod-table corpus that
 *     ingest-canonical-pods.cjs puts in the canonical store unchanged.
 *
 * The edits may move a line to the other voice, split a line between the voices, drop a line,
 * strip Descript's markup (bullets, bold, underline, square-bracket editor's notes) and correct a
 * declared spelling. They may never add, reorder or paraphrase a word — the test proves it by
 * checking that every part's words are, in order, a subsequence of the transcript's own words.
 *
 *   node tools/pods/talk-bollocks-canon.cjs build            # write the three corpora
 *   node tools/pods/talk-bollocks-canon.cjs check            # exit 1 if a corpus is stale
 *   node tools/pods/talk-bollocks-canon.cjs read --part=1    # the readable two-voice text, to stdout
 *
 * Pure apart from reading the transcripts and writing the corpora. No network, no DB.
 */
'use strict'

const fs = require('fs')
const path = require('path')
const { PARTS, CORRECTIONS } = require('./talk-bollocks-edits.cjs')

const REPO = path.resolve(__dirname, '..', '..')
const SOURCE_DIR = 'archive/docs-retired-2026-09-03/corpus/talk-bollocks'
const SPEAKER_LINE = /^(Tom|Aran)$/

/**
 * Descript's export → numbered lines, each carrying the speaker label above it.
 * Markup is stripped here, and only markup: the `- ` bullets (and a stray leading dash), `**` bold, `__` underline,
 * non-breaking spaces and runs of whitespace. Words are untouched.
 */
function readTranscript (text) {
  const out = []
  let speaker = null
  text.split('\n').forEach((raw, i) => {
    const t = raw.replace(/^(?:-\s*)+/, '').replace(/\u00a0/g, ' ').trim()
    if (!t) return
    if (SPEAKER_LINE.test(t)) { speaker = t.toUpperCase(); return }
    const clean = t.replace(/\*\*/g, '').replace(/__/g, '').replace(/\s+/g, ' ').trim()
    if (clean) out.push({ line: i + 1, speaker, text: clean })
  })
  return out
}

/** Apply the declared spelling corrections, whole words only. */
function correct (text) {
  let s = text
  for (const [from, to] of CORRECTIONS) s = s.replace(new RegExp(`(^|[^\\p{L}])${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}])`, 'gu'), `$1${to}`)
  return s
}

/** Square brackets in these transcripts are the editor's notes; the edits say when one was spoken. */
const stripEditorNotes = text => text.replace(/\s*\[[^\]]*\]\s*/g, ' ').replace(/\s+([,.?!])/g, '$1').replace(/\s+/g, ' ').trim()

/**
 * Transcript lines + one part's edits → chapters of turns.
 * edits: { drop: [line], speaker: { line: 'TOM'|'ARAN' }, text: { line: 'replacement' },
 *          split: { line: [['TOM', 'text'], ['ARAN', 'text']] }, chapters: { line: 'Title' } }
 */
function applyEdits (lines, edits) {
  const drop = new Set(edits.drop || [])
  const chapterAt = Object.entries(edits.chapters || {}).map(([l, title]) => ({ line: Number(l), title })).sort((a, b) => a.line - b.line)
  const chapters = []
  let ci = 0
  const segments = []
  for (const l of lines) {
    if (drop.has(l.line)) continue
    while (ci < chapterAt.length && chapterAt[ci].line <= l.line) {
      chapters.push({ number: chapters.length + 1, title: chapterAt[ci].title, turns: [] })
      ci++
    }
    if (!chapters.length) throw new Error(`line ${l.line} comes before the first chapter`)
    const pieces = edits.split && edits.split[l.line]
      ? edits.split[l.line]
      : [[(edits.speaker && edits.speaker[l.line]) || l.speaker, (edits.text && edits.text[l.line]) || stripEditorNotes(l.text)]]
    for (const [speaker, text] of pieces) {
      if (speaker !== 'TOM' && speaker !== 'ARAN') throw new Error(`line ${l.line} has no speaker (${speaker})`)
      segments.push({ chapter: chapters[chapters.length - 1], speaker, text: correct(text), line: l.line })
    }
  }
  if (ci < chapterAt.length) throw new Error(`chapter at line ${chapterAt[ci].line} never started`)
  // Consecutive lines in one voice are one turn.
  for (const s of segments) {
    const turns = s.chapter.turns
    const last = turns[turns.length - 1]
    if (last && last.speaker === s.speaker) { last.text += ' ' + s.text; last.lines.push(s.line) } else turns.push({ speaker: s.speaker, text: s.text, lines: [s.line] })
  }
  return chapters
}

// An abbreviation's full stop never ends a sentence.
const ABBREV = /(?:^|\s)(?:Dr|Mr|Mrs|Ms|St|vs|etc|e\.g|i\.e)\.$/i

/**
 * One turn → its sentences, the text untouched apart from the whitespace between them.
 * A sentence ends at . ! ? (or a run of them, ellipses included, and any closing quote) followed
 * by a space.
 */
function splitSentences (text) {
  const out = []
  const re = /[.!?]+['"’”)]*(?=\s+\S)/g
  let start = 0
  let m
  while ((m = re.exec(text))) {
    const end = m.index + m[0].length
    const candidate = text.slice(start, end).trim()
    if (ABBREV.test(candidate)) continue
    if (candidate) out.push(candidate)
    start = end
  }
  const tail = text.slice(start).trim()
  if (tail) out.push(tail)
  return out
}

/** Words for the no-added-word proof: letters/digits/apostrophes, case-folded. */
const words = text => (String(text).toLowerCase().replace(/[’‘]/g, "'").match(/[\p{L}\p{N}']+/gu) || []).map(w => w.replace(/^'+|'+$/g, '')).filter(Boolean)

/** Is `sub` an in-order subsequence of `whole`? Returns the first index of `sub` that fails, or -1. */
function subsequenceBreak (sub, whole) {
  let j = 0
  for (let i = 0; i < sub.length; i++) {
    while (j < whole.length && whole[j] !== sub[i]) j++
    if (j === whole.length) return i
    j++
  }
  return -1
}

function loadPart (n) {
  const part = PARTS[n]
  if (!part) throw new Error(`no part ${n}`)
  const src = fs.readFileSync(path.join(REPO, SOURCE_DIR, `part-${n}.md`), 'utf8')
  const lines = readTranscript(src)
  return { part, lines, chapters: applyEdits(lines, part.edits) }
}

const cell = s => s.replace(/\|/g, '/')

/** The pod-table corpus ingest-canonical-pods.cjs reads (`### Chapter N — *Title*`, a `| | |` table). */
function renderCorpus (n, { part, chapters }) {
  const rows = chapters.reduce((a, c) => a + c.turns.reduce((b, t) => b + splitSentences(t.text).length, 0), 0)
  const out = [
    `# ${part.title} — canonical English`,
    '',
    `> Built by tools/pods/talk-bollocks-canon.cjs from ${SOURCE_DIR}/part-${n}.md and the declared edits in`,
    '> tools/pods/talk-bollocks-edits.cjs. Do not edit by hand: change the edits and rebuild.',
    `> Tom's and Aran's own words, two voices, one row per sentence. ${chapters.length} chapters, ${rows} sentences.`,
    '> HELD for Tom\'s read: no translation and no audio until he has read it.',
    '',
  ]
  for (const c of chapters) {
    out.push(`### Chapter ${c.number} — *${c.title}*`, '', '| | |', '|---|---|')
    for (const t of c.turns) for (const s of splitSentences(t.text)) out.push(`| **${t.speaker}** | ${cell(s)} |`)
    out.push('')
  }
  return out.join('\n')
}

/** The same text for a human: chapters, then one paragraph per turn. */
function renderReading (n, { part, chapters }) {
  const name = { TOM: 'Tom', ARAN: 'Aran' }
  const out = [`# ${part.title}`, '', `*Canonical English — Tom's and Aran's own words from the transcript, in two voices. ${chapters.length} chapters.*`, '']
  for (const c of chapters) {
    out.push(`## ${c.number}. ${c.title}`, '')
    for (const t of c.turns) out.push(`**${name[t.speaker]}:** ${t.text}`, '')
  }
  return out.join('\n')
}

const corpusPath = n => path.join(REPO, PARTS[n].corpus)

module.exports = { readTranscript, applyEdits, splitSentences, words, subsequenceBreak, loadPart, renderCorpus, renderReading, correct, stripEditorNotes, corpusPath, PARTS, SOURCE_DIR, REPO }

if (require.main === module) {
  const [cmd, ...rest] = process.argv.slice(2)
  const partArg = (rest.find(a => a.startsWith('--part=')) || '').split('=')[1]
  if (cmd === 'build' || cmd === 'check') {
    let stale = 0
    for (const n of Object.keys(PARTS)) {
      const text = renderCorpus(n, loadPart(n))
      const file = corpusPath(n)
      const have = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null
      if (cmd === 'build') { fs.writeFileSync(file, text); console.log(`wrote ${PARTS[n].corpus}`) } else if (have !== text) { stale++; console.error(`STALE: ${PARTS[n].corpus}`) }
    }
    process.exit(stale ? 1 : 0)
  } else if (cmd === 'read' && PARTS[partArg]) {
    process.stdout.write(renderReading(partArg, loadPart(partArg)))
  } else {
    console.error('usage: build | check | read --part=<1|2|4>')
    process.exit(2)
  }
}
