#!/usr/bin/env node
/**
 * Final merge for the 7 retry-langs: combine output-micro + recovery into
 * temp/encouragement-migration/output/{lang}.json with all 96 entries.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..', 'temp', 'encouragement-migration')
const MICRO = path.join(ROOT, 'output-micro')
const RECOVERY = path.join(ROOT, 'recovery')
const OUT = path.join(ROOT, 'output')
const LANGS = ['deu', 'fil', 'fin', 'msa', 'nld', 'pan', 'pol']

function loadJsonSafe(file) {
  if (!fs.existsSync(file)) return []
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return [] }
}

function main() {
  for (const lang of LANGS) {
    const map = new Map()  // sequence_within_type|audio_type → entry

    for (const type of ['enc', 'inst']) {
      const audioType = type === 'enc' ? 'encouragement' : 'instruction'
      // Original micro batches (1-4)
      for (let part = 1; part <= 4; part++) {
        for (const e of loadJsonSafe(path.join(MICRO, `${lang}.${type}.${part}.json`))) {
          if (e.sequence_within_type) map.set(`${e.sequence_within_type}|${audioType}`, e)
        }
      }
      // Recovery batches (r1, r2, ...) AND single-entry retries (s25, s26, ...)
      const recoveryFiles = fs.readdirSync(RECOVERY).filter(f =>
        (f.startsWith(`${lang}.${type}.r`) || f.startsWith(`${lang}.${type}.s`))
        && f.endsWith('.json') && !f.endsWith('.parse_error.txt'))
      for (const rf of recoveryFiles) {
        for (const e of loadJsonSafe(path.join(RECOVERY, rf))) {
          if (e.sequence_within_type) map.set(`${e.sequence_within_type}|${audioType}`, e)
        }
      }
    }

    // Build final array, sorted by audio_type then sequence_within_type (matching source ordering)
    const all = [...map.values()]
    const enc = all.filter(e => e.audio_type === 'encouragement').sort((a, b) => a.sequence_within_type - b.sequence_within_type)
    const inst = all.filter(e => e.audio_type === 'instruction').sort((a, b) => a.sequence_within_type - b.sequence_within_type)
    const merged = [...enc, ...inst]

    const status = (enc.length === 48 && inst.length === 48) ? '✓' : '⚠'
    console.log(`  ${status} ${lang}: enc=${enc.length}/48  inst=${inst.length}/48  total=${merged.length}/96`)

    if (merged.length === 96) {
      fs.writeFileSync(path.join(OUT, `${lang}.json`), JSON.stringify(merged, null, 2))
    } else {
      // Still missing — show which seqs
      const haveEnc = new Set(enc.map(e => e.sequence_within_type))
      const haveInst = new Set(inst.map(e => e.sequence_within_type))
      const missingEnc = []; for (let i = 1; i <= 48; i++) if (!haveEnc.has(i)) missingEnc.push(i)
      const missingInst = []; for (let i = 1; i <= 48; i++) if (!haveInst.has(i)) missingInst.push(i)
      console.log(`     missing enc: [${missingEnc.join(',')}]`)
      console.log(`     missing inst: [${missingInst.join(',')}]`)
    }
  }
}

main()
