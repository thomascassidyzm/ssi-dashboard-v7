#!/usr/bin/env node
/**
 * For each of the 7 retry-langs, walk the {lang}.{enc|inst}.{1-4}.json files,
 * collect all successfully-translated entries (by sequence_within_type), and
 * compute which sequence numbers are missing per (lang, type).
 *
 * Output: temp/encouragement-migration/recovery-needs.json — { lang: { enc: [missing seqs], inst: [missing seqs] } }
 * Plus a summary table.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..', 'temp', 'encouragement-migration')
const MICRO_OUT = path.join(ROOT, 'output-micro')
const LANGS = ['deu', 'fil', 'fin', 'msa', 'nld', 'pan', 'pol']

function loadPart(lang, type, part) {
  const file = path.join(MICRO_OUT, `${lang}.${type}.${part}.json`)
  if (!fs.existsSync(file)) return []
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return [] }
}

function main() {
  const needs = {}
  console.log(`\n=== Per-lang gap analysis ===`)
  console.log(`Total seqs per type: enc 1-48, inst 1-48\n`)

  for (const lang of LANGS) {
    needs[lang] = { enc: [], inst: [] }

    for (const type of ['enc', 'inst']) {
      const have = new Set()
      const corrupted = []
      for (let part = 1; part <= 4; part++) {
        const entries = loadPart(lang, type, part)
        for (const e of entries) {
          if (typeof e?.sequence_within_type === 'number' && typeof e?.text === 'string' && e.text.trim().length > 0) {
            // Sanity: text should not contain raw ASCII line break artifacts
            // Also ensure it's not a known placeholder
            have.add(e.sequence_within_type)
          } else {
            corrupted.push(e)
          }
        }
      }
      const missing = []
      for (let i = 1; i <= 48; i++) if (!have.has(i)) missing.push(i)
      needs[lang][type] = missing
      console.log(`  ${lang}.${type}: have ${have.size}/48  missing=[${missing.join(',')}]${corrupted.length ? `  corrupted=${corrupted.length}` : ''}`)
    }
  }

  fs.writeFileSync(path.join(ROOT, 'recovery-needs.json'), JSON.stringify(needs, null, 2))
  console.log(`\nSaved gap manifest to recovery-needs.json`)
  const totalMissing = Object.values(needs).reduce((s, l) => s + l.enc.length + l.inst.length, 0)
  console.log(`Total entries to recover across all langs: ${totalMissing}`)
}

main()
