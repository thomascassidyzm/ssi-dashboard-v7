#!/usr/bin/env node
/**
 * Merge UI-string translations from the Allion xlsx into the live
 * course-configs/Translations/{lang}.json files.
 *
 * Source: an xlsx with a "Comparison" sheet, columns: Key, EN Value, ...,
 * HI Value, BN Value, GU Value, PA Value, UR Value, ...
 *
 * Behaviour:
 *   --plan (default)  Report what would change, write nothing
 *   --execute         Apply changes (LOCAL checkout only — no git commit/push)
 *   --overwrite       Also overwrite existing keys whose value differs
 *                     (default: add missing keys only, preserve live values)
 *
 * New keys are appended after the existing keys (preserving live order),
 * matching merge-ui-translations.cjs convention.
 */
const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

const XLSX_PATH = process.env.XLSX_PATH || '/Users/kaisaraceno/Downloads/SSI-Translations (2).xlsx'
const LIVE_DIR = '/Users/kaisaraceno/Documents/GitHub/course-configs/Translations'
const SHEET = 'Comparison'
const LANGS = { hi: 'HI VALUE', bn: 'BN VALUE', gu: 'GU VALUE', pa: 'PA VALUE', ur: 'UR VALUE' }

const args = process.argv.slice(2)
const EXECUTE = args.includes('--execute')
const OVERWRITE = args.includes('--overwrite')

function loadSheet() {
  const wb = XLSX.readFile(XLSX_PATH)
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[SHEET], { header: 1, defval: '' })
  const H = rows[0].map(String)
  const col = (name) => H.findIndex(h => h.trim().toUpperCase() === name.toUpperCase())
  const keyCol = col('KEY')
  const cols = {}
  for (const [lang, header] of Object.entries(LANGS)) cols[lang] = col(header)
  const data = rows.slice(1).filter(r => String(r[keyCol] || '').trim())
  return { data, keyCol, cols }
}

function run() {
  const { data, keyCol, cols } = loadSheet()
  console.log(`\n=== MERGE UI TRANSLATIONS ${EXECUTE ? '(EXECUTE)' : '(PLAN)'} ${OVERWRITE ? '+overwrite' : '(add-only)'} ===`)
  console.log(`source: ${path.basename(XLSX_PATH)} [${SHEET}], ${data.length} keyed rows\n`)

  for (const [lang, ci] of Object.entries(cols)) {
    const livePath = path.join(LIVE_DIR, `${lang}.json`)
    if (ci < 0) { console.log(`${lang}: no column in sheet — skip`); continue }
    if (!fs.existsSync(livePath)) { console.log(`${lang}: ${livePath} missing — skip`); continue }
    const live = JSON.parse(fs.readFileSync(livePath, 'utf8'))
    const before = Object.keys(live).length

    const toAdd = [], toUpdate = [], blankInSheet = []
    for (const r of data) {
      const k = String(r[keyCol]).trim()
      const v = String(r[ci] || '').trim()
      if (!v) { if (!(k in live)) blankInSheet.push(k); continue }
      if (!(k in live)) toAdd.push([k, v])
      else if (live[k] !== v) toUpdate.push([k, v])
    }

    for (const [k, v] of toAdd) live[k] = v
    if (OVERWRITE) for (const [k, v] of toUpdate) live[k] = v

    console.log(`${lang}: ${before} keys → ${Object.keys(live).length} | +${toAdd.length} new | ${toUpdate.length} differ${OVERWRITE ? ' (overwritten)' : ' (kept live)'} | ${blankInSheet.length} new-key blank-in-sheet`)
    if (toAdd.length) console.log(`     e.g. ${toAdd.slice(0, 3).map(([k, v]) => `${k}="${v.slice(0, 28)}"`).join(', ')}`)

    if (EXECUTE) {
      fs.writeFileSync(livePath, JSON.stringify(live, null, 2) + '\n')
      console.log(`     ✓ wrote ${livePath}`)
    }
  }
  if (!EXECUTE) console.log(`\nTo apply: node merge-xlsx-ui-translations.cjs --execute   (writes local course-configs only — review + commit yourself)`)
}

run()
