#!/usr/bin/env node
/**
 * Generate LEGO index for faster lookups
 * This creates a JSON file mapping translation UUIDs to their LEGOs
 */

const fs = require('fs')
const path = require('path')

const LEGOS_DIR = path.join(__dirname, 'amino_acids', 'legos')
const OUTPUT_FILE = path.join(__dirname, 'amino_acids', 'legos_index.json')

async function generateIndex() {
  console.log('Generating LEGO index...')

  try {
    // Read all LEGO files
    const files = fs.readdirSync(LEGOS_DIR)
    const legoFiles = files.filter(f => f.endsWith('.json'))

    console.log(`Found ${legoFiles.length} LEGO files`)

    // Load all LEGOs
    const allLegos = []
    for (const file of legoFiles) {
      const filePath = path.join(LEGOS_DIR, file)
      const content = fs.readFileSync(filePath, 'utf8')
      const lego = JSON.parse(content)
      allLegos.push(lego)
    }

    // Group by translation UUID
    const byTranslation = {}
    for (const lego of allLegos) {
      const uuid = lego.source_translation_uuid
      if (!byTranslation[uuid]) {
        byTranslation[uuid] = []
      }
      byTranslation[uuid].push(lego)
    }

    console.log(`Indexed LEGOs for ${Object.keys(byTranslation).length} translations`)

    // Write index file
    const indexData = {
      generated_at: new Date().toISOString(),
      total_legos: allLegos.length,
      total_translations: Object.keys(byTranslation).length,
      by_translation: byTranslation,
      all_legos: allLegos
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(indexData, null, 2), 'utf8')
    console.log(`✓ Index written to: ${OUTPUT_FILE}`)

    // Print some stats
    console.log('\nStats:')
    console.log(`  Total LEGOs: ${allLegos.length}`)
    console.log(`  Translations with LEGOs: ${Object.keys(byTranslation).length}`)

    // Show example
    const exampleUuid = Object.keys(byTranslation)[0]
    const exampleLegos = byTranslation[exampleUuid]
    console.log(`\nExample (${exampleUuid}):`)
    console.log(`  LEGOs: ${exampleLegos.length}`)
    exampleLegos.forEach(lego => {
      console.log(`    - ${lego.provenance}: "${lego.text}"`)
    })

  } catch (err) {
    console.error('Error generating index:', err)
    process.exit(1)
  }
}

generateIndex()
