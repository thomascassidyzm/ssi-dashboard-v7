#!/usr/bin/env node
/**
 * Recover parse-error encouragement translations.
 * Failure mode: model used typographic opening quote („/«/") but ASCII " for closing,
 * which prematurely closes the JSON string. Per-line fix: in any "text": "..." line,
 * replace all interior ASCII " with right double quote U+201D (").
 *
 * Reads:  temp/encouragement-migration/output/{lang}.json.parse_error.txt
 * Writes: temp/encouragement-migration/output/{lang}.json
 */
const fs = require('fs')
const path = require('path')

const OUT_DIR = path.join(__dirname, '..', '..', 'temp', 'encouragement-migration', 'output')
const LANGS = ['bul', 'ces', 'dan', 'hrv', 'ind', 'ron', 'slk']

function recover(lang) {
  const errFile = path.join(OUT_DIR, `${lang}.json.parse_error.txt`)
  const outFile = path.join(OUT_DIR, `${lang}.json`)
  if (!fs.existsSync(errFile)) {
    console.log(`  ${lang}: no parse_error file, skip`)
    return
  }
  const txt = fs.readFileSync(errFile, 'utf8')
  const lines = txt.split('\n')
  const fixed = lines.map(line => {
    const m = line.match(/^(\s*"text":\s*")(.*)("[,]?)$/)
    if (!m) return line
    const inner = m[2].replace(/"/g, '”')
    return m[1] + inner + m[3]
  })
  const result = fixed.join('\n')
  let parsed
  try { parsed = JSON.parse(result) }
  catch (e) {
    console.log(`  ${lang}: STILL FAILS — ${e.message.slice(0, 80)}`)
    return
  }
  if (!Array.isArray(parsed) || parsed.length !== 96) {
    console.log(`  ${lang}: parsed but wrong shape (${parsed?.length} entries)`)
    return
  }
  fs.writeFileSync(outFile, JSON.stringify(parsed, null, 2))
  console.log(`  ${lang}: recovered ${parsed.length} entries`)
}

for (const lang of LANGS) recover(lang)
