#!/usr/bin/env node

/**
 * Bundle Course Data - Creates aggregated JSON files for VFS loader
 *
 * This script reads individual files from amino_acids directories and
 * creates bundled JSON files that can be loaded by the browser VFS loader.
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const COURSES_DIR = path.join(__dirname, '../public/vfs/courses')

async function readJSON(filepath) {
  try {
    const content = await fs.readFile(filepath, 'utf-8')
    return JSON.parse(content)
  } catch (err) {
    console.error(`Error reading ${filepath}:`, err.message)
    return null
  }
}

async function writeJSON(filepath, data) {
  await fs.writeFile(filepath, JSON.stringify(data, null, 2))
  console.log(`✓ Created ${filepath}`)
}

/**
 * Bundle all translation files into a single array
 */
async function bundleTranslations(courseDir) {
  const translationsDir = path.join(courseDir, 'amino_acids/translations')

  try {
    const files = await fs.readdir(translationsDir)
    const jsonFiles = files.filter(f => f.endsWith('.json'))

    const translations = []

    for (const file of jsonFiles) {
      const filepath = path.join(translationsDir, file)
      const data = await readJSON(filepath)
      if (data) {
        translations.push(data)
      }
    }

    // Sort by seed_id
    translations.sort((a, b) => (a.seed_id || '').localeCompare(b.seed_id || ''))

    await writeJSON(
      path.join(courseDir, 'amino_acids/translations_bundle.json'),
      translations
    )

    console.log(`  Bundled ${translations.length} translations`)
    return translations
  } catch (err) {
    console.error('Error bundling translations:', err.message)
    return []
  }
}

/**
 * Bundle all basket files into a single object
 */
async function bundleBaskets(courseDir) {
  const basketsDir = path.join(courseDir, 'amino_acids/baskets')

  try {
    const files = await fs.readdir(basketsDir)
    const jsonFiles = files.filter(f => f.startsWith('basket_') && f.endsWith('.json'))

    const baskets = []

    for (const file of jsonFiles) {
      const filepath = path.join(basketsDir, file)
      const data = await readJSON(filepath)
      if (data) {
        baskets.push(data)
      }
    }

    // Sort by basket_id
    baskets.sort((a, b) => (a.basket_id || 0) - (b.basket_id || 0))

    await writeJSON(
      path.join(courseDir, 'amino_acids/baskets_bundle.json'),
      baskets
    )

    console.log(`  Bundled ${baskets.length} baskets`)
    return baskets
  } catch (err) {
    console.error('Error bundling baskets:', err.message)
    return []
  }
}

/**
 * Bundle all introduction files into a single array
 */
async function bundleIntroductions(courseDir) {
  const introsDir = path.join(courseDir, 'amino_acids/introductions')

  try {
    const files = await fs.readdir(introsDir)
    const jsonFiles = files.filter(f => f.startsWith('intro_basket_') && f.endsWith('.json'))

    const introductions = []

    for (const file of jsonFiles) {
      const filepath = path.join(introsDir, file)
      const data = await readJSON(filepath)
      if (data) {
        introductions.push(data)
      }
    }

    // Sort by basket_id
    introductions.sort((a, b) => (a.basket_id || 0) - (b.basket_id || 0))

    await writeJSON(
      path.join(courseDir, 'amino_acids/introductions_bundle.json'),
      introductions
    )

    console.log(`  Bundled ${introductions.length} introductions`)
    return introductions
  } catch (err) {
    console.error('Error bundling introductions:', err.message)
    return []
  }
}

/**
 * Convert legos_index to a flat array
 */
async function bundleLegos(courseDir) {
  const indexPath = path.join(courseDir, 'amino_acids/legos_index.json')

  try {
    const index = await readJSON(indexPath)
    if (!index || !index.by_translation) {
      return []
    }

    // Flatten the index to an array
    const legos = []
    for (const translationId in index.by_translation) {
      const legosForTranslation = index.by_translation[translationId]
      legos.push(...legosForTranslation)
    }

    await writeJSON(
      path.join(courseDir, 'amino_acids/legos_bundle.json'),
      legos
    )

    console.log(`  Bundled ${legos.length} legos`)
    return legos
  } catch (err) {
    console.error('Error bundling legos:', err.message)
    return []
  }
}

/**
 * Create a LEGO breakdowns structure for the visualizer
 */
async function createLegoBreakdowns(courseDir, translations, legos) {
  const breakdowns = []

  for (const translation of translations) {
    const translationLegos = legos.filter(
      lego => lego.source_translation_uuid === translation.uuid
    )

    if (translationLegos.length === 0) {
      continue
    }

    // Group by provenance to create lego_pairs
    const legoPairs = translationLegos.map(lego => ({
      lego_id: lego.provenance || lego.uuid,
      lego_type: 'BASE',
      target_chunk: lego.text || '',
      known_chunk: '', // We'd need to extract this from the translation
      fd_validated: true
    }))

    breakdowns.push({
      seed_id: translation.seed_id,
      original_target: translation.target,
      original_known: translation.source,
      lego_pairs: legoPairs,
      feeder_pairs: []
    })
  }

  await writeJSON(
    path.join(courseDir, 'amino_acids/lego_breakdowns_bundle.json'),
    breakdowns
  )

  console.log(`  Created ${breakdowns.length} LEGO breakdowns`)
  return breakdowns
}

/**
 * Create a baskets display format (keyed by lego_id)
 */
async function createBasketsDisplay(courseDir, baskets) {
  const display = {}

  for (const basket of baskets) {
    if (!basket.legos || !Array.isArray(basket.legos)) {
      continue
    }

    for (const lego of basket.legos) {
      const legoId = lego.provenance?.[0]?.provenance || lego.uuid

      display[legoId] = {
        lego: [lego.text || '', ''], // [target, known] - known would need translation
        e: [], // Eternal phrases (would need to be extracted)
        d: { // Debut phrases by word count
          '2': [],
          '3': [],
          '4': [],
          '5': []
        }
      }
    }
  }

  await writeJSON(
    path.join(courseDir, 'amino_acids/baskets_display.json'),
    display
  )

  console.log(`  Created baskets display format with ${Object.keys(display).length} entries`)
  return display
}

/**
 * Process a single course
 */
async function processCourse(courseCode) {
  console.log(`\nProcessing ${courseCode}...`)

  const courseDir = path.join(COURSES_DIR, courseCode)

  // Check if amino_acids directory exists
  try {
    await fs.access(path.join(courseDir, 'amino_acids'))
  } catch (err) {
    console.log(`  Skipping - no amino_acids directory`)
    return
  }

  // Bundle all the data
  const translations = await bundleTranslations(courseDir)
  const legos = await bundleLegos(courseDir)
  const baskets = await bundleBaskets(courseDir)
  const introductions = await bundleIntroductions(courseDir)

  // Create derived formats
  await createLegoBreakdowns(courseDir, translations, legos)
  await createBasketsDisplay(courseDir, baskets)

  console.log(`✓ Completed ${courseCode}`)
}

/**
 * Main function
 */
async function main() {
  console.log('Bundling course data for VFS loader...\n')

  // Get all course directories
  const entries = await fs.readdir(COURSES_DIR, { withFileTypes: true })
  const courseDirs = entries.filter(e => e.isDirectory()).map(e => e.name)

  // Process each course
  for (const courseCode of courseDirs) {
    await processCourse(courseCode)
  }

  console.log('\n✓ All courses processed!')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
