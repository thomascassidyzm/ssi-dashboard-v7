#!/usr/bin/env node
/**
 * Fill Allion's xlsx with the now-live translations from course-configs/Translations/.
 *
 * Reads ~/Downloads/SSI-Translations.xlsx, walks each row, and for any (Key, "{LANG} Value")
 * cell that's empty, fills with the value from Translations/{lang}.json.
 *
 * Usage:
 *   node fill-allion-xlsx.cjs --plan      # show counts only, no write
 *   node fill-allion-xlsx.cjs --execute   # write to ~/Downloads/SSI-Translations-filled.xlsx
 *
 * Output goes to a NEW file (SSI-Translations-filled.xlsx) so the original stays untouched.
 */
const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

const SRC = path.join(require('os').homedir(), 'Downloads', 'SSI-Translations.xlsx')
const OUT = path.join(require('os').homedir(), 'Downloads', 'SSI-Translations-filled.xlsx')
const TR_DIR = path.join(require('os').homedir(), 'Documents', 'GitHub', 'course-configs', 'Translations')

const args = process.argv.slice(2)
const EXECUTE = args.includes('--execute')

// xlsx column header → live filename
const COL_TO_LANG = {
  'EN Value': 'en',
  'ES Value': 'es',
  'JA Value': 'ja',
  'FR Value': 'fr',
  'KO Value': 'ko',
  'PT Value': 'pt',
  'FI Value': 'fi',
  'GA Value': 'ga',
  'CY Value': 'cy',
  'EU Value': 'eu',
  'SI Value': 'si',
  'AR Value': 'ar',
  'CMN Value': 'cmn',
  'TA Value': 'ta'
}

function isEmpty(v) {
  if (v === null || v === undefined) return true
  const s = String(v).trim()
  return s === '' || s.toUpperCase() === 'MISSING'
}

function main() {
  if (!fs.existsSync(SRC)) { console.error('Source not found:', SRC); process.exit(1) }

  // Load all translations
  const liveByLang = {}
  for (const lang of Object.values(COL_TO_LANG)) {
    const p = path.join(TR_DIR, lang + '.json')
    if (fs.existsSync(p)) liveByLang[lang] = JSON.parse(fs.readFileSync(p, 'utf8'))
  }
  console.log('Loaded translations for langs:', Object.keys(liveByLang).join(', '))
  console.log()

  // Read xlsx as 2D array
  const wb = XLSX.readFile(SRC, { cellDates: false, cellStyles: false })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const headers = aoa[0]
  const keyCol = headers.indexOf('Key')
  if (keyCol < 0) { console.error('No "Key" column'); process.exit(1) }

  // Build column index map
  const colMap = {}  // colIdx → lang
  for (const [colName, lang] of Object.entries(COL_TO_LANG)) {
    const idx = headers.indexOf(colName)
    if (idx >= 0 && liveByLang[lang]) colMap[idx] = lang
  }

  console.log('Filling cells from live JSON...')
  console.log('lang | filled | already-had | no-translation')
  const stats = {}
  for (const lang of Object.values(COL_TO_LANG)) stats[lang] = { filled: 0, had: 0, missing: 0 }

  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r]
    if (!row || row.length === 0) continue
    const key = (row[keyCol] || '').trim()
    if (!key) continue
    for (const [colIdxStr, lang] of Object.entries(colMap)) {
      const colIdx = parseInt(colIdxStr, 10)
      const cellVal = row[colIdx]
      const liveVal = liveByLang[lang][key]
      if (isEmpty(cellVal)) {
        if (liveVal !== undefined) {
          row[colIdx] = liveVal
          stats[lang].filled++
        } else {
          stats[lang].missing++
        }
      } else {
        stats[lang].had++
      }
    }
    aoa[r] = row
  }

  for (const [lang, s] of Object.entries(stats)) {
    console.log(`  ${lang.padEnd(4)} | ${String(s.filled).padStart(4)}  | ${String(s.had).padStart(4)}      | ${String(s.missing).padStart(4)}`)
  }

  if (!EXECUTE) {
    console.log('\nDRY-RUN. Pass --execute to write', OUT)
    return
  }

  // Write back
  const newWs = XLSX.utils.aoa_to_sheet(aoa)
  // Preserve column widths if they were in the original
  if (ws['!cols']) newWs['!cols'] = ws['!cols']
  wb.Sheets[sheetName] = newWs
  XLSX.writeFile(wb, OUT)
  console.log('\nWrote', OUT)
}

main()
