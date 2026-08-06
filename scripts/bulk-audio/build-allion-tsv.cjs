#!/usr/bin/env node
/**
 * Build a TSV mirroring Allion's xlsx row order, with values from live
 * course-configs/Translations/. He can open the TSV in Excel and copy the
 * columns he needs into the Google Sheet — preserving row alignment with
 * his Key column.
 *
 * Output: temp/ssi-xlsx/SSI-Translations-filled.tsv
 *
 * Cells that already have a value in the spreadsheet are left empty in this
 * TSV — only fills are emitted, so pasting a column over the live sheet
 * preserves anything Allion already had.
 */
const fs = require('fs')
const path = require('path')

const PARSED = path.join(__dirname, '..', '..', 'temp', 'ssi-xlsx', 'parsed.json')
const TR_DIR = path.join(require('os').homedir(), 'Documents', 'GitHub', 'course-configs', 'Translations')
const OUT = path.join(__dirname, '..', '..', 'temp', 'ssi-xlsx', 'SSI-Translations-filled.tsv')

// Existing xlsx columns (already in spreadsheet)
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
// Wave 3 brand-new languages — add these columns to the Google Sheet
const NEW_COLS = {
  'HI Value':  'hi',
  'BN Value':  'bn',
  'GU Value':  'gu',
  'PA Value':  'pa',
  'UR Value':  'ur',
  'YO Value':  'yo',
  'DE Value':  'de',  // also missing from current xlsx
  'IT Value':  'it',
  'NL Value':  'nl'
}

function isEmpty(v) {
  if (v === null || v === undefined) return true
  const s = String(v).trim()
  return s === '' || s.toUpperCase() === 'MISSING'
}

function tsvEscape(s) {
  if (s === null || s === undefined) return ''
  // TSV: tabs and newlines need handling. Replace tabs with spaces, escape newlines.
  return String(s)
    .replace(/\t/g, ' ')
    .replace(/\r?\n/g, '\\n')
    // Strip ASCII space before French-style punctuation (formal-French typography
    // that we asked the model to add but Kai wants stripped for the UI). Also
    // strip space inside « » constructs. Harmless for other languages — they
    // don't typically have this pattern.
    .replace(/[  ]+([?!:;»])/g, '$1')
    .replace(/(«)[  ]+/g, '$1')
    // Strip trailing whitespace (EN's trailing-space typos shouldn't propagate).
    .replace(/[ \t]+$/, '')
}

function main() {
  const parsed = JSON.parse(fs.readFileSync(PARSED, 'utf8'))
  const headers = parsed.headers
  const rows = parsed.rows

  const ALL_COLS = { ...COL_TO_LANG, ...NEW_COLS }
  const liveByLang = {}
  // Merge in en-additions outputs if present (so TSV reflects the latest
  // translations without requiring course-configs writes).
  const ADDITIONS_DIR = path.join(__dirname, '..', '..', 'temp', 'ssi-xlsx', 'en-additions-output')
  for (const lang of Object.values(ALL_COLS)) {
    const p = path.join(TR_DIR, lang + '.json')
    if (fs.existsSync(p)) liveByLang[lang] = JSON.parse(fs.readFileSync(p, 'utf8'))
    else liveByLang[lang] = {}
    const addsPath = path.join(ADDITIONS_DIR, lang + '.json')
    if (fs.existsSync(addsPath)) {
      const adds = JSON.parse(fs.readFileSync(addsPath, 'utf8'))
      for (const [k, v] of Object.entries(adds)) {
        if (!(k in liveByLang[lang])) liveByLang[lang][k] = v  // additions only fill gaps
      }
    }
  }

  const keyCol = headers.indexOf('Key')
  const langCols = []
  // Existing columns first (preserve order)
  for (const [colName, lang] of Object.entries(COL_TO_LANG)) {
    const idx = headers.indexOf(colName)
    if (idx >= 0 && liveByLang[lang]) langCols.push({ colName, lang, idx })
  }
  // New columns (no idx in source xlsx — use -1 to mark "always fill")
  for (const [colName, lang] of Object.entries(NEW_COLS)) {
    if (liveByLang[lang]) langCols.push({ colName, lang, idx: -1 })
  }

  // Output TSV columns: Key | <lang1> filled | <lang2> filled | ...
  const outLines = []
  outLines.push(['Key', ...langCols.map(c => c.colName)].join('\t'))

  const stats = {}
  for (const c of langCols) stats[c.lang] = { filled: 0, kept: 0 }

  for (const row of rows) {
    if (!row || row.length === 0) continue
    const key = (row[keyCol] || '').trim()
    if (!key) continue
    const out = [key]
    for (const { lang, idx } of langCols) {
      const cellVal = idx === -1 ? '' : row[idx]
      const liveVal = liveByLang[lang][key]
      // Always output the live JSON value if we have one (lets Kai paste whole
      // columns wholesale instead of skip-blanks). If neither side has a value,
      // output empty.
      if (liveVal !== undefined && !isEmpty(liveVal)) {
        out.push(tsvEscape(liveVal))
        if (isEmpty(cellVal)) stats[lang].filled++
        else stats[lang].kept++
      } else if (!isEmpty(cellVal)) {
        // Live JSON has no value but spreadsheet does — keep what spreadsheet has
        out.push(tsvEscape(cellVal))
        stats[lang].kept++
      } else {
        out.push('')
      }
    }
    outLines.push(out.join('\t'))
  }

  fs.writeFileSync(OUT, outLines.join('\n') + '\n')

  console.log('Wrote', OUT)
  console.log()
  console.log('Per-language fills (cells in TSV that contain values to paste):')
  console.log('lang | fills | originally-had')
  for (const [lang, s] of Object.entries(stats)) {
    console.log('  ' + lang.padEnd(4) + ' | ' + String(s.filled).padStart(4) + '  | ' + String(s.kept).padStart(4))
  }
  console.log()
  console.log('To use:')
  console.log('  1. Open the TSV in Excel (it\'s tab-separated)')
  console.log('  2. For each language column, copy the WHOLE column and paste over the matching column in the Google Sheet')
  console.log('     — no skip-blanks needed; the TSV now contains all values, both new fills AND existing ones')
  console.log('  3. Empty cells in the TSV mean neither the spreadsheet nor the JSON had a value — those rows truly are missing')
  console.log()
  console.log('NEW columns to ADD to the Google Sheet (right side, after existing TA Value column):')
  console.log('  HI Value, BN Value, GU Value, PA Value, UR Value, YO Value (wave-3 languages)')
  console.log('  DE Value, IT Value, NL Value (already have JSONs but were missing from xlsx)')
}

main()
