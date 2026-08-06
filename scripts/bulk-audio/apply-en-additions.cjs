#!/usr/bin/env node
/**
 * Apply Ivan's xlsx EN additions + 3 JA-derived + 3 best-guesses to en.json,
 * and write the new EN keys to a file so they can be propagated to all
 * other languages in the next step.
 *
 * Inputs:
 *   - ~/Downloads/SSI-Translations (1).xlsx (parsed via parse_xlsx.py)
 *   - en-additions.json (manual additions: JA-derived + best-guess)
 *
 * Outputs:
 *   - ~/Documents/GitHub/course-configs/Translations/en.json (updated)
 *   - temp/ssi-xlsx/new-en-keys.json (the 128 new keys for downstream translation)
 *
 * Usage:
 *   node apply-en-additions.cjs --plan      # show counts only
 *   node apply-en-additions.cjs --execute   # apply
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..', 'temp', 'ssi-xlsx')
const EN_PATH = path.join(require('os').homedir(), 'Documents', 'GitHub', 'course-configs', 'Translations', 'en.json')
const PARSED = path.join(ROOT, 'parsed-v2.json')
const ADDITIONS = path.join(ROOT, 'en-additions.json')
const NEW_KEYS_OUT = path.join(ROOT, 'new-en-keys.json')

const EXECUTE = process.argv.includes('--execute')

function isEmpty(v) {
  if (v === null || v === undefined) return true
  const s = String(v).trim()
  return s === '' || s.toUpperCase() === 'MISSING'
}

function main() {
  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'))
  const v2 = JSON.parse(fs.readFileSync(PARSED, 'utf8'))
  const adds = JSON.parse(fs.readFileSync(ADDITIONS, 'utf8'))
  const headers = v2.headers
  const keyCol = headers.indexOf('Key')
  const enCol = headers.indexOf('EN Value')

  const newKeys = {}  // key → en value to add

  // 1. Ivan-filled (xlsx EN values not in en.json)
  let ivanCount = 0
  for (const r of v2.rows) {
    const k = (r[keyCol] || '').trim()
    if (!k) continue
    const enV2 = r[enCol] || ''
    if (isEmpty(en[k]) && !isEmpty(enV2)) {
      newKeys[k] = String(enV2).trim()
      ivanCount++
    }
  }
  console.log('Ivan/xlsx EN additions:', ivanCount)

  // 2. JA-derived
  let jaCount = 0
  for (const [k, v] of Object.entries(adds._jaDerived || {})) {
    if (isEmpty(en[k]) && !(k in newKeys)) {
      newKeys[k] = v
      jaCount++
    }
  }
  console.log('JA-derived:', jaCount)

  // 3. Best-guess from key name (subscribe, this-week, learning-progress)
  let guessCount = 0
  for (const [k, v] of Object.entries(adds._bestGuess_pendingKaiConfirmation || {})) {
    if (isEmpty(en[k]) && !(k in newKeys)) {
      newKeys[k] = v
      guessCount++
    }
  }
  console.log('Best-guess (subscribe/this-week/learning-progress):', guessCount)

  console.log()
  console.log('TOTAL new EN keys:', Object.keys(newKeys).length)

  if (!EXECUTE) {
    console.log('\nDRY-RUN. Pass --execute to write.')
    console.log('Sample:')
    for (const k of Object.keys(newKeys).slice(0, 8)) console.log('  ' + k + ': ' + JSON.stringify(newKeys[k].slice(0,80)))
    return newKeys
  }

  // Detect indent
  let indent = 2
  const firstLine = fs.readFileSync(EN_PATH, 'utf8').split('\n').find(l => /^\s+\S/.test(l))
  if (firstLine) {
    const m = firstLine.match(/^( +)/)
    if (m) indent = m[1].length
  }

  // Add to en.json
  const merged = { ...en }
  for (const [k, v] of Object.entries(newKeys)) merged[k] = v
  fs.writeFileSync(EN_PATH, JSON.stringify(merged, null, indent) + '\n')
  console.log('Wrote', EN_PATH)

  // Save the new keys for downstream translation
  fs.writeFileSync(NEW_KEYS_OUT, JSON.stringify(newKeys, null, 2) + '\n')
  console.log('Wrote', NEW_KEYS_OUT, '(' + Object.keys(newKeys).length + ' keys for translation to other langs)')

  return newKeys
}

main()
