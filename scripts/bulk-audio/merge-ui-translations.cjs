#!/usr/bin/env node
/**
 * Merge wave 1+2+3 UI translation outputs into the live course-configs/Translations/.
 *
 * Behavior:
 *   --plan       (default)  Show counts only, no writes
 *   --execute              Write the changes
 *   --overwrite            Also overwrite existing keys (default: skip-if-present)
 *
 * Output for new languages (wave 3) is a brand-new file ordered by EN key order.
 * For existing languages, new keys are appended at the end (preserving live order).
 *
 * NOTE: only writes to local checkout. Does NOT git commit/push.
 */
const fs = require('fs')
const path = require('path')

const LIVE_DIR = '/Users/kaisaraceno/Documents/GitHub/course-configs/Translations'
const OUT_DIR = path.join(__dirname, '..', '..', 'temp', 'ssi-xlsx', 'output')
const EN_PATH = path.join(LIVE_DIR, 'en.json')

// 3-letter (output filename) → live filename mapping
const ALIAS = { yor: 'yo' }  // most are direct; cmn stays cmn

const args = process.argv.slice(2)
const EXECUTE = args.includes('--execute')
const OVERWRITE = args.includes('--overwrite')

// Selective overwrites — keys we explicitly want to take from the wave output
// even though the live file has a different value. Curated 2026-04-29 after
// reading all 46 differences. See chat for the analysis.
const SELECTED_OVERWRITES = {
  fr: [
    'myresourcesitem_SpanishFAQ',                        // em-dash matches EN
    'myresourcesitem_faq-en',                            // sentence case
    'myresourcesitem_newsletter-signup',                 // sentence case
    'myresourcesitem_saysomething-apps',                 // sentence case
    'myresourcesitem_spanish-original-course-en-es',     // sentence case
    'myresourcesitem_spanish-tourist-course-en-es',      // sentence case
    'myresourcesitem_welsh-advanced-content-en-cy',      // strip trailing space
    'myresourcesitem_welsh-classic-challenges-en-cy',    // sentence case
    'myresourcesitem_welsh-mini-course-welsh-national-anthem-en-cy', // strip trailing
    'myresourcesitem_welsh-original-courses-en-cy',      // strip trailing
  ],
  ta: [
    'onboardstep3text',                                  // escape-fix bug
    'onboardstep4text',                                  // escape-fix bug
    'myresourcesitem_EnglishFAQ',                        // FAQ wording match EN
    'myresourcesitem_FrenchFAQ',                         // FAQ wording match EN
    'myresourcesitem_SpanishFAQ',                        // FAQ wording match EN
    'myresourcesitem_WelshFAQ',                          // FAQ wording match EN
    'myresourcesitem_saysomething-apps',                 // SaySomethingin stays Latin
  ],
  eu: [
    'notvalidatedpopupcancelurltext',                    // Utzi (mobile-natural) over Ezeztatu
  ],
  // si (Sinhala) — 7 cases need native-speaker review, leaving as OLD for now
}

// Strip trailing whitespace from values in wave outputs (Cat 1 in chat).
// Many "differences" between wave and live are just the model copying EN's
// trailing-space typos. Stripping here aligns wave with the cleaner live convention.
function stripTrailingWs(s) { return typeof s === 'string' ? s.replace(/[ \t]+$/, '') : s }

function loadJson(p) {
  if (!fs.existsSync(p)) return null
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function liveFilename(lang) {
  return (ALIAS[lang] || lang) + '.json'
}

function main() {
  const enKeys = Object.keys(loadJson(EN_PATH) || {})  // canonical key order
  const files = fs.readdirSync(OUT_DIR).filter(f => /^[a-z]{2,3}\.json$/.test(f)).sort()
  console.log(`Mode: ${EXECUTE ? 'EXECUTE' : 'DRY-RUN'} | overwrite-existing: ${OVERWRITE ? 'YES' : 'no'}`)
  console.log()
  console.log('lang | live-keys | added | overwritten | skipped')
  let totalAdded = 0, totalOverwritten = 0, totalSkipped = 0
  const overwriteDetails = []

  for (const f of files) {
    const lang = path.basename(f, '.json')
    const waveRaw = loadJson(path.join(OUT_DIR, f))
    // Strip trailing whitespace from all wave values (cleaner than EN's trailing-space typos)
    const wave = {}
    for (const [k, v] of Object.entries(waveRaw)) wave[k] = stripTrailingWs(v)
    const liveFile = liveFilename(lang)
    const livePath = path.join(LIVE_DIR, liveFile)
    const liveExists = fs.existsSync(livePath)
    const live = liveExists ? loadJson(livePath) : {}
    const selectedOverwrites = new Set(SELECTED_OVERWRITES[liveFilename(lang).replace('.json','')] || [])

    // Build merged object — preserve live key order, append new keys at end (in EN order)
    let merged = { ...live }
    let added = 0, overwritten = 0, skipped = 0
    const langOverwrites = []

    for (const k of Object.keys(wave)) {
      if (k in merged) {
        if (merged[k] === wave[k]) continue  // already match
        if (OVERWRITE || selectedOverwrites.has(k)) {
          langOverwrites.push({ key: k, old: merged[k], new: wave[k] })
          merged[k] = wave[k]
          overwritten++
        } else {
          skipped++
        }
      } else {
        merged[k] = wave[k]
        added++
      }
    }

    if (langOverwrites.length > 0) overwriteDetails.push({ lang, items: langOverwrites })

    console.log(`  ${(lang + (liveExists ? '' : ' [NEW]')).padEnd(11)} | ${String(Object.keys(live).length).padStart(5)}   |  ${String(added).padStart(3)} |    ${String(overwritten).padStart(3)}     |  ${String(skipped).padStart(3)}`)

    totalAdded += added
    totalOverwritten += overwritten
    totalSkipped += skipped

    if (EXECUTE && (added > 0 || overwritten > 0)) {
      // For new files: write in EN key order
      // For existing: preserve original order then append new keys
      let out
      if (!liveExists) {
        out = {}
        for (const k of enKeys) if (k in merged) out[k] = merged[k]
        // Append any keys not in EN (shouldn't happen but defensive)
        for (const k of Object.keys(merged)) if (!(k in out)) out[k] = merged[k]
      } else {
        out = merged  // preserves the order of live keys, with new ones at end
      }
      // Preserve original indentation per file. ja.json uses 4-space; all
      // others use 2-space. Detect from the live file's first indented line.
      let indent = 2
      if (liveExists) {
        const firstLine = fs.readFileSync(livePath, 'utf8').split('\n').find(l => /^\s+\S/.test(l))
        if (firstLine) {
          const m = firstLine.match(/^( +)/)
          if (m) indent = m[1].length
        }
      }
      fs.writeFileSync(livePath, JSON.stringify(out, null, indent) + '\n')
    }
  }

  console.log()
  console.log(`TOTAL added: ${totalAdded}, overwritten: ${totalOverwritten}, skipped (had different value): ${totalSkipped}`)

  if (totalSkipped > 0 && !OVERWRITE) {
    console.log()
    console.log(`To see the ${totalSkipped} skipped overwrites: re-run with --overwrite (it'll show diffs and apply).`)
  }

  if (OVERWRITE && overwriteDetails.length > 0) {
    console.log()
    console.log('OVERWRITES applied:')
    for (const { lang, items } of overwriteDetails) {
      console.log(`\n  [${lang}]`)
      for (const { key, old: oldV, new: newV } of items.slice(0, 20)) {
        console.log(`    "${key}":`)
        console.log(`      OLD: ${JSON.stringify(oldV)}`)
        console.log(`      NEW: ${JSON.stringify(newV)}`)
      }
      if (items.length > 20) console.log(`    ... +${items.length - 20} more`)
    }
  }

  if (!EXECUTE) console.log('\nDRY-RUN ONLY — pass --execute to write.')
  else console.log('\nFiles written. Review with `cd ~/Documents/GitHub/course-configs && git diff Translations/` then commit/push when ready.')
}

main()
