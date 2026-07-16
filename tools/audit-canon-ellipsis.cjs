#!/usr/bin/env node
/**
 * audit-canon-ellipsis.cjs — authoring-time S-LEGO ceiling audit for a pod
 * canon MARKDOWN file (the master format tools/seed-canonical-pods.cjs
 * parses). File-mode counterpart of insert-ellipsis-seams.cjs --dry, for
 * canon that hasn't been seeded yet: verifies that every S-LEGO piece
 * (split on . ! ? and '…', same rule as splitPieces there) fits the pod
 * level's syllable ceiling (docs/pods/pod-ladder-proposal.md §9a/§9b), so
 * ellipses are baked in AT AUTHORING TIME and the seam-insertion pass has
 * nothing to do.
 *
 * Read-only. Fails (exit 1) on: any piece over the ceiling, ASCII '...'
 * (the mark is U+2026, never three dots), or parentheses in dialogue text
 * (zero-explanation methodology). Warns on digits (TTS prefers words).
 *
 *   node tools/audit-canon-ellipsis.cjs <file.md> <lang> <ceiling C>
 *   node tools/audit-canon-ellipsis.cjs docs/pods/pod-1-english-canonical.md eng 12
 */
const fs = require('fs')
const { countSyllables, REGISTRY } = require('./lib/syllable-counters.cjs')

const [FILE, LANG, CEILING_ARG] = process.argv.slice(2)
const CEILING = Number(CEILING_ARG)
if (!FILE || !LANG || !CEILING) {
  console.error('usage: audit-canon-ellipsis.cjs <file.md> <lang> <ceiling C>')
  process.exit(1)
}
if (!REGISTRY[LANG]) {
  console.error(`ERR: no syllable counter registered for language '${LANG}' — add one to tools/lib/syllable-counters.cjs`)
  process.exit(1)
}

// Same split rule as insert-ellipsis-seams.cjs / breakdown-fine.cjs.
const splitPieces = (t) => String(t || '').split(/(?<=[.!?…])/).map(s => s.trim()).filter(Boolean)

const lines = fs.readFileSync(FILE, 'utf8').split('\n')
let scene = '(none)', rows = 0, pieces = 0, ellipses = 0, maxSyl = 0
const errors = [], warnings = []

for (const raw of lines) {
  const line = raw.trim()
  if (line.startsWith('## ')) { scene = line.slice(3).trim(); continue }
  if (!line.startsWith('|')) continue
  const cells = line.split('|').slice(1, -1).map(c => c.trim())
  if (cells.length < 3 || !/^\d+[a-z]?$/.test(cells[0])) continue // header/separator; digit[+letter] = row, incl. menu-line variants
  const [num, , text] = cells
  rows++
  const at = `${scene} line ${num}`
  if (text.includes('...')) errors.push(`${at}: ASCII '...' — use U+2026 '…'`)
  if (/[()]/.test(text)) errors.push(`${at}: parentheses in dialogue text`)
  if (/\d/.test(text)) warnings.push(`${at}: digits in dialogue text — spell numbers as words`)
  ellipses += (text.match(/…/g) || []).length
  for (const piece of splitPieces(text)) {
    pieces++
    const n = countSyllables(piece, LANG)
    if (n > maxSyl) maxSyl = n
    if (n > CEILING) errors.push(`${at}: piece over ceiling (${n} > ${CEILING}): "${piece}"`)
  }
}

console.log(`${FILE} — lang=${LANG} C=${CEILING}`)
console.log(`rows: ${rows} · pieces: ${pieces} · ellipses: ${ellipses} · max piece syllables: ${maxSyl}`)
for (const w of warnings) console.log(`WARN ${w}`)
for (const e of errors) console.log(`FAIL ${e}`)
console.log(errors.length ? `RESULT: FAIL (${errors.length})` : 'RESULT: PASS — 100% of pieces fit the ceiling')
process.exit(errors.length ? 1 : 0)
