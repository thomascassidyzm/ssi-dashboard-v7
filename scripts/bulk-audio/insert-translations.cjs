#!/usr/bin/env node
/**
 * Insert translations into existing language encouragement JSON files
 *
 * Usage: node scripts/bulk-audio/insert-translations.cjs <lang> <translations-json-path>
 *
 * The translations JSON should have:
 * {
 *   "ordered": { "33": "translated text...", "34": "..." },
 *   "pooled": { "14": "translated text...", "20": "..." }
 * }
 *
 * The script matches by position (ordered) and array index (pooled) in the
 * existing language JSON file and replaces English text with translations.
 */

const fs = require('fs')
const path = require('path')

const lang = process.argv[2]
const translationsPath = process.argv[3]

if (!lang || !translationsPath) {
  console.error('Usage: node insert-translations.cjs <lang> <translations-json-path>')
  process.exit(1)
}

const ENCOURAGEMENTS_DIR = path.join(__dirname, 'data', 'translations', 'encouragements')
const langFilePath = path.join(ENCOURAGEMENTS_DIR, `${lang}.json`)

if (!fs.existsSync(langFilePath)) {
  console.error(`Language file not found: ${langFilePath}`)
  process.exit(1)
}

if (!fs.existsSync(translationsPath)) {
  console.error(`Translations file not found: ${translationsPath}`)
  process.exit(1)
}

// Load files
const langData = JSON.parse(fs.readFileSync(langFilePath, 'utf8'))
const translations = JSON.parse(fs.readFileSync(translationsPath, 'utf8'))

let pooledUpdated = 0
let orderedUpdated = 0

// Update pooled encouragements by array index
if (translations.pooled) {
  for (const [indexStr, text] of Object.entries(translations.pooled)) {
    const idx = parseInt(indexStr)
    if (idx >= 0 && idx < langData.pooledEncouragements.length) {
      const oldText = langData.pooledEncouragements[idx].text
      langData.pooledEncouragements[idx].text = text
      pooledUpdated++
    } else {
      console.warn(`Warning: pooled index ${idx} out of range (0-${langData.pooledEncouragements.length - 1})`)
    }
  }
}

// Update ordered encouragements by position
if (translations.ordered) {
  for (const [posStr, text] of Object.entries(translations.ordered)) {
    const pos = parseInt(posStr)
    const item = langData.orderedEncouragements.find(e => e.position === pos)
    if (item) {
      item.text = text
      orderedUpdated++
    } else {
      console.warn(`Warning: ordered position ${pos} not found`)
    }
  }
}

// Update timestamp
langData.translated_at = new Date().toISOString()

// Write back
fs.writeFileSync(langFilePath, JSON.stringify(langData, null, 2) + '\n', 'utf8')

console.log(`[${lang}] Updated ${pooledUpdated} pooled + ${orderedUpdated} ordered = ${pooledUpdated + orderedUpdated} total items`)
console.log(`[${lang}] Written to: ${langFilePath}`)
