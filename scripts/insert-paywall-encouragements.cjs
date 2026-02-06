#!/usr/bin/env node
/**
 * Insert Paywall Encouragements into shared_audio table
 *
 * These are sequential messages shown to free tier users after they complete
 * the free content in paid courses. Only used for the 9 paid courses:
 * ara_for_eng, zho_for_eng, jpn_for_eng, kor_for_eng, spa_for_eng,
 * por_for_eng, ita_for_eng, deu_for_eng, fra_for_eng
 *
 * Prerequisites:
 * - Tom must update shared_audio schema to allow audio_type='paywall'
 * - Audio files must already exist in S3 bucket (ssi-audio-stage)
 *
 * Usage:
 *   node scripts/insert-paywall-encouragements.cjs [--dry-run]
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// CSV file path
const CSV_PATH = path.join(process.env.HOME, 'Downloads', 'paywallEncouragements Saesneg - Sheet1.csv')

// Parse command line args
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Parse CSV file (format: UUID,text)
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.trim().split('\n')

  const records = []
  for (const line of lines) {
    // Split on first comma (UUID is always 36 chars)
    const firstComma = line.indexOf(',')
    if (firstComma === -1) continue

    const uuid = line.substring(0, firstComma).trim()
    let text = line.substring(firstComma + 1).trim()

    // Validate UUID format
    if (!/^[A-F0-9-]{36}$/i.test(uuid)) continue

    // Remove surrounding quotes if present and unescape double quotes
    if (text.startsWith('"') && text.endsWith('"')) {
      text = text.slice(1, -1)
    }
    text = text.replace(/""/g, '"')

    records.push({ uuid, text })
  }

  return records
}

/**
 * Insert paywall encouragements into shared_audio
 */
async function insertPaywallEncouragements() {
  console.log('=== Paywall Encouragements Importer ===\n')

  if (DRY_RUN) {
    console.log('DRY RUN MODE - no changes will be made\n')
  }

  // Check if CSV exists
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`ERROR: CSV file not found at: ${CSV_PATH}`)
    console.error('Please download the CSV from Google Docs first.')
    process.exit(1)
  }

  // Parse CSV
  const records = parseCSV(CSV_PATH)
  console.log(`Parsed ${records.length} records from CSV\n`)

  if (records.length === 0) {
    console.error('ERROR: No valid records found in CSV')
    process.exit(1)
  }

  // Show first few records
  console.log('Sample records:')
  for (let i = 0; i < Math.min(3, records.length); i++) {
    console.log(`  ${i + 1}. ${records[i].uuid}: "${records[i].text.substring(0, 60)}..."`)
  }
  console.log()

  // Check for existing paywall records
  const { data: existing, error: checkError } = await supabase
    .from('shared_audio')
    .select('id, text')
    .eq('language', 'eng')
    .eq('audio_type', 'paywall')

  if (checkError) {
    // If error mentions audio_type, schema hasn't been updated yet
    if (checkError.message.includes('paywall') || checkError.message.includes('audio_type')) {
      console.error('ERROR: Schema not updated yet. Tom needs to run:')
      console.error(`
  ALTER TABLE shared_audio DROP CONSTRAINT IF EXISTS shared_audio_audio_type_check;
  ALTER TABLE shared_audio ADD CONSTRAINT shared_audio_audio_type_check
    CHECK (audio_type IN ('encouragement', 'instruction', 'paywall'));
`)
      process.exit(1)
    }
    console.error('ERROR checking existing records:', checkError.message)
    process.exit(1)
  }

  if (existing && existing.length > 0) {
    console.log(`Found ${existing.length} existing paywall records in database`)
    console.log('Skipping insert to avoid duplicates. Use --force to overwrite.\n')
    return
  }

  // Prepare records for insertion
  const insertRecords = records.map(r => ({
    text: r.text,
    text_normalized: r.text.toLowerCase().trim(),
    language: 'eng',
    audio_type: 'paywall',
    voice_id: 'human_aran',  // Aran's voice for paywall messages
    origin: 'human',
    s3_key: `mastered/${r.uuid}.mp3`,
    duration_ms: null  // Will be populated when audio is verified
  }))

  if (DRY_RUN) {
    console.log(`Would insert ${insertRecords.length} records into shared_audio`)
    console.log('\nFirst record:')
    console.log(JSON.stringify(insertRecords[0], null, 2))
    console.log('\nRun without --dry-run to execute the insert.')
    return
  }

  // Insert records
  console.log(`Inserting ${insertRecords.length} paywall encouragements...`)

  const { data, error } = await supabase
    .from('shared_audio')
    .insert(insertRecords)
    .select('id')

  if (error) {
    console.error('ERROR inserting records:', error.message)
    process.exit(1)
  }

  console.log(`\nSUCCESS: Inserted ${data.length} paywall encouragements into shared_audio`)
  console.log('\nNext steps:')
  console.log('1. Verify audio files exist in S3: ssi-audio-stage/mastered/')
  console.log('2. Test legacy manifest generation for a paid course')
  console.log('3. Verify paywallEncouragements appears in manifest')
}

// Run
insertPaywallEncouragements().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
