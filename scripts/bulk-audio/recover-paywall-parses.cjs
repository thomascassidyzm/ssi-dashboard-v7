#!/usr/bin/env node
/**
 * Recover translations whose hand-rolled bracket-matching parser failed.
 * Strategy: strip markdown fences, find the LAST closing `]` (anchored to
 * the end of meaningful content), then try JSON.parse on the resulting
 * `[ ... ]` slice. The hand-rolled parser breaks on Claude's free-text
 * output that includes ASCII " characters in German/etc strings; full
 * JSON.parse handles all valid JSON correctly.
 */
const fs = require('fs')
const path = require('path')

const OUT_DIR = path.join(__dirname, '..', '..', 'temp', 'paywall-expansion', 'output')
const langs = ['deu', 'zho', 'lit', 'pan']

function recover(lang) {
  const raw = fs.readFileSync(path.join(OUT_DIR, lang + '.raw.txt'), 'utf8')
  // Strip code fences globally (they can also appear at the very end)
  let clean = raw.replace(/```(?:json)?/g, '').trim()
  // Find first [ and last ] in the cleaned text
  const start = clean.indexOf('[')
  const end = clean.lastIndexOf(']')
  if (start < 0 || end < 0 || end < start) {
    return { ok: false, error: 'no JSON array delimiters found' }
  }
  const json = clean.slice(start, end + 1)
  try {
    const arr = JSON.parse(json)
    return { ok: true, arr }
  } catch (e) {
    // Strip trailing buddy comments on lines after the last `]`
    return { ok: false, error: e.message, around: json.slice(Math.max(0, e.message.match(/position (\d+)/)?.[1] - 80 || 0), 200) }
  }
}

let recoveredCount = 0
for (const lang of langs) {
  const result = recover(lang)
  if (result.ok) {
    fs.writeFileSync(path.join(OUT_DIR, lang + '.json'), JSON.stringify(result.arr, null, 2))
    console.log(`✓ ${lang}: ${result.arr.length} entries`)
    recoveredCount++
  } else {
    console.log(`✗ ${lang}: ${result.error}`)
    if (result.around) console.log('  around:', result.around.slice(0, 200))
  }
}
console.log(`\nRecovered ${recoveredCount}/${langs.length}`)
