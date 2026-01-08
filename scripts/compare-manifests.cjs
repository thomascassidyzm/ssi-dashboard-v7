#!/usr/bin/env node
/**
 * Manifest Comparison Script
 *
 * Compares two legacy manifests and reports differences in:
 * - Top-level structure
 * - Seed counts and content
 * - Samples dictionary
 * - Encouragements
 *
 * Usage:
 *   node scripts/compare-manifests.cjs <old-manifest> <new-manifest>
 */

const fs = require('fs')
const path = require('path')

// ANSI colors
const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const BLUE = '\x1b[34m'
const CYAN = '\x1b[36m'
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'

function log(color, ...args) {
  console.log(color + args.join(' ') + RESET)
}

function loadManifest(filePath) {
  const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
  return JSON.parse(fs.readFileSync(absPath, 'utf8'))
}

function compareTopLevel(old, neu) {
  log(BOLD + CYAN, '\n═══════════════════════════════════════════════════════════════')
  log(BOLD + CYAN, '  TOP-LEVEL STRUCTURE')
  log(BOLD + CYAN, '═══════════════════════════════════════════════════════════════\n')

  const fields = ['id', 'known', 'target', 'version', 'status']

  console.log('Field'.padEnd(15) + 'OLD'.padEnd(25) + 'NEW'.padEnd(25) + 'Match')
  console.log('─'.repeat(75))

  for (const field of fields) {
    const oldVal = JSON.stringify(old[field])
    const newVal = JSON.stringify(neu[field])
    const match = oldVal === newVal ? '✓' : '✗'
    const color = oldVal === newVal ? GREEN : RED
    console.log(
      field.padEnd(15) +
      (oldVal || 'undefined').substring(0, 23).padEnd(25) +
      (newVal || 'undefined').substring(0, 23).padEnd(25) +
      color + match + RESET
    )
  }

  // Introduction
  log(YELLOW, '\nIntroduction:')
  console.log('  OLD:', JSON.stringify(old.introduction, null, 2).split('\n').join('\n       '))
  console.log('  NEW:', JSON.stringify(neu.introduction, null, 2).split('\n').join('\n       '))
}

function compareSeeds(old, neu) {
  log(BOLD + CYAN, '\n═══════════════════════════════════════════════════════════════')
  log(BOLD + CYAN, '  SEEDS COMPARISON')
  log(BOLD + CYAN, '═══════════════════════════════════════════════════════════════\n')

  const oldSeeds = old.slices?.[0]?.seeds || []
  const newSeeds = neu.slices?.[0]?.seeds || []

  console.log('OLD seeds: ' + oldSeeds.length)
  console.log('NEW seeds: ' + newSeeds.length)

  // Build lookup by seed sentence
  const oldBySentence = new Map()
  for (const seed of oldSeeds) {
    const canonical = seed.seed_sentence?.canonical
    if (canonical) oldBySentence.set(canonical, seed)
  }

  const newBySentence = new Map()
  for (const seed of newSeeds) {
    const canonical = seed.seed_sentence?.canonical
    if (canonical) newBySentence.set(canonical, seed)
  }

  // Find matches and differences
  let matched = 0
  let onlyInOld = 0
  let onlyInNew = 0
  let structureDiffs = []

  for (const [sentence, oldSeed] of oldBySentence) {
    const newSeed = newBySentence.get(sentence)
    if (newSeed) {
      matched++
      const oldIntroCount = oldSeed.introduction_items?.length || 0
      const newIntroCount = newSeed.introduction_items?.length || 0
      if (oldIntroCount !== newIntroCount) {
        structureDiffs.push({
          sentence: sentence.substring(0, 50),
          oldIntro: oldIntroCount,
          newIntro: newIntroCount
        })
      }
    } else {
      onlyInOld++
    }
  }

  for (const sentence of newBySentence.keys()) {
    if (!oldBySentence.has(sentence)) {
      onlyInNew++
    }
  }

  log(GREEN, '\nMatched by sentence: ' + matched)
  log(YELLOW, 'Only in OLD: ' + onlyInOld)
  log(YELLOW, 'Only in NEW: ' + onlyInNew)

  if (structureDiffs.length > 0) {
    log(YELLOW, '\nIntroduction item count differences (first 10):')
    for (const diff of structureDiffs.slice(0, 10)) {
      console.log('  "' + diff.sentence + '..." OLD: ' + diff.oldIntro + ', NEW: ' + diff.newIntro)
    }
    if (structureDiffs.length > 10) {
      console.log('  ... and ' + (structureDiffs.length - 10) + ' more')
    }
  }

  // Compare first seed structure in detail
  log(BLUE, '\n--- First Seed Structure Comparison ---')
  if (oldSeeds[0] && newSeeds[0]) {
    console.log('\nOLD seed[0] keys:', Object.keys(oldSeeds[0]).join(', '))
    console.log('NEW seed[0] keys:', Object.keys(newSeeds[0]).join(', '))

    console.log('\nOLD seed[0].node keys:', Object.keys(oldSeeds[0].node || {}).join(', '))
    console.log('NEW seed[0].node keys:', Object.keys(newSeeds[0].node || {}).join(', '))

    if (oldSeeds[0].introduction_items?.[0] && newSeeds[0].introduction_items?.[0]) {
      console.log('\nOLD introduction_items[0] keys:', Object.keys(oldSeeds[0].introduction_items[0]).join(', '))
      console.log('NEW introduction_items[0] keys:', Object.keys(newSeeds[0].introduction_items[0]).join(', '))
    }
  }
}

function compareSamples(old, neu) {
  log(BOLD + CYAN, '\n═══════════════════════════════════════════════════════════════')
  log(BOLD + CYAN, '  SAMPLES DICTIONARY COMPARISON')
  log(BOLD + CYAN, '═══════════════════════════════════════════════════════════════\n')

  const oldSamples = old.slices?.[0]?.samples || {}
  const newSamples = neu.slices?.[0]?.samples || {}

  const oldKeys = Object.keys(oldSamples)
  const newKeys = Object.keys(newSamples)

  console.log('OLD samples: ' + oldKeys.length)
  console.log('NEW samples: ' + newKeys.length)

  // Find overlaps
  const oldSet = new Set(oldKeys)
  const newSet = new Set(newKeys)

  let both = 0
  let onlyOld = 0
  let onlyNew = 0

  for (const key of oldKeys) {
    if (newSet.has(key)) both++
    else onlyOld++
  }
  for (const key of newKeys) {
    if (!oldSet.has(key)) onlyNew++
  }

  log(GREEN, '\nIn both: ' + both)
  log(YELLOW, 'Only in OLD: ' + onlyOld)
  log(YELLOW, 'Only in NEW: ' + onlyNew)

  // Compare sample entry structure
  log(BLUE, '\n--- Sample Entry Structure ---')
  const oldFirstKey = oldKeys[0]
  const newFirstKey = newKeys[0]

  if (oldFirstKey) {
    console.log('\nOLD sample["' + oldFirstKey.substring(0, 30) + '..."]:')
    console.log(JSON.stringify(oldSamples[oldFirstKey], null, 2))
  }
  if (newFirstKey) {
    console.log('\nNEW sample["' + newFirstKey.substring(0, 30) + '..."]:')
    console.log(JSON.stringify(newSamples[newFirstKey], null, 2))
  }

  // Check role/cadence values
  log(BLUE, '\n--- Role/Cadence Analysis ---')

  const oldRoles = new Set()
  const oldCadences = new Set()
  const newRoles = new Set()
  const newCadences = new Set()

  for (const entries of Object.values(oldSamples)) {
    for (const entry of entries) {
      if (entry.role) oldRoles.add(entry.role)
      if (entry.cadence) oldCadences.add(entry.cadence)
    }
  }
  for (const entries of Object.values(newSamples)) {
    for (const entry of entries) {
      if (entry.role) newRoles.add(entry.role)
      if (entry.cadence) newCadences.add(entry.cadence)
    }
  }

  console.log('OLD roles: ' + [...oldRoles].join(', '))
  console.log('NEW roles: ' + [...newRoles].join(', '))
  console.log('OLD cadences: ' + [...oldCadences].join(', '))
  console.log('NEW cadences: ' + [...newCadences].join(', '))

  // Find common texts and compare their audio entries
  log(BLUE, '\n--- Sample Match Analysis (first 5 common texts) ---')
  let matchCount = 0
  for (const text of oldKeys) {
    if (newSet.has(text) && matchCount < 5) {
      console.log('\nText: "' + text.substring(0, 50) + '..."')
      console.log('  OLD:', JSON.stringify(oldSamples[text]))
      console.log('  NEW:', JSON.stringify(newSamples[text]))
      matchCount++
    }
  }
}

function compareEncouragements(old, neu) {
  log(BOLD + CYAN, '\n═══════════════════════════════════════════════════════════════')
  log(BOLD + CYAN, '  ENCOURAGEMENTS COMPARISON')
  log(BOLD + CYAN, '═══════════════════════════════════════════════════════════════\n')

  const oldOrdered = old.slices?.[0]?.orderedEncouragements || []
  const newOrdered = neu.slices?.[0]?.orderedEncouragements || []
  const oldPooled = old.slices?.[0]?.pooledEncouragements || []
  const newPooled = neu.slices?.[0]?.pooledEncouragements || []

  console.log('OLD ordered: ' + oldOrdered.length + ', pooled: ' + oldPooled.length)
  console.log('NEW ordered: ' + newOrdered.length + ', pooled: ' + newPooled.length)

  if (oldOrdered[0]) {
    console.log('\nOLD ordered[0]:', JSON.stringify(oldOrdered[0]))
  }
  if (newOrdered[0]) {
    console.log('NEW ordered[0]:', JSON.stringify(newOrdered[0]))
  }
}

function generateSummary(old, neu) {
  log(BOLD + CYAN, '\n═══════════════════════════════════════════════════════════════')
  log(BOLD + CYAN, '  SUMMARY')
  log(BOLD + CYAN, '═══════════════════════════════════════════════════════════════\n')

  const issues = []
  const matches = []

  if (old.id === neu.id) matches.push('✓ id matches')
  else issues.push('✗ id differs: "' + old.id + '" vs "' + neu.id + '"')

  if (old.known === neu.known) matches.push('✓ known language matches')
  else issues.push('✗ known differs: "' + old.known + '" vs "' + neu.known + '"')

  if (old.target === neu.target) matches.push('✓ target language matches')
  else issues.push('✗ target differs: "' + old.target + '" vs "' + neu.target + '"')

  const oldSeedCount = old.slices?.[0]?.seeds?.length || 0
  const newSeedCount = neu.slices?.[0]?.seeds?.length || 0
  if (oldSeedCount === newSeedCount) matches.push('✓ seed count matches (' + oldSeedCount + ')')
  else issues.push('✗ seed count differs: ' + oldSeedCount + ' vs ' + newSeedCount)

  const oldSampleCount = Object.keys(old.slices?.[0]?.samples || {}).length
  const newSampleCount = Object.keys(neu.slices?.[0]?.samples || {}).length
  if (Math.abs(oldSampleCount - newSampleCount) < 100) {
    matches.push('✓ sample counts similar (' + oldSampleCount + ' vs ' + newSampleCount + ')')
  } else {
    issues.push('⚠ sample counts differ significantly: ' + oldSampleCount + ' vs ' + newSampleCount)
  }

  const oldEncCount = (old.slices?.[0]?.orderedEncouragements?.length || 0) +
                      (old.slices?.[0]?.pooledEncouragements?.length || 0)
  const newEncCount = (neu.slices?.[0]?.orderedEncouragements?.length || 0) +
                      (neu.slices?.[0]?.pooledEncouragements?.length || 0)
  if (oldEncCount === newEncCount) matches.push('✓ encouragement count matches (' + oldEncCount + ')')
  else issues.push('✗ encouragement count differs: ' + oldEncCount + ' vs ' + newEncCount)

  log(GREEN, 'MATCHES:')
  for (const m of matches) console.log('  ' + m)

  if (issues.length > 0) {
    log(YELLOW, '\nISSUES/DIFFERENCES:')
    for (const i of issues) console.log('  ' + i)
  }
}

// Main
async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.log('Usage: node compare-manifests.cjs <old-manifest> <new-manifest>')
    process.exit(1)
  }

  const [oldPath, newPath] = args

  log(BOLD, '\n╔═══════════════════════════════════════════════════════════════╗')
  log(BOLD, '║           MANIFEST COMPARISON REPORT                          ║')
  log(BOLD, '╚═══════════════════════════════════════════════════════════════╝')

  console.log('\nOLD: ' + oldPath)
  console.log('NEW: ' + newPath)

  const old = loadManifest(oldPath)
  const neu = loadManifest(newPath)

  compareTopLevel(old, neu)
  compareSeeds(old, neu)
  compareSamples(old, neu)
  compareEncouragements(old, neu)
  generateSummary(old, neu)

  console.log('')
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
