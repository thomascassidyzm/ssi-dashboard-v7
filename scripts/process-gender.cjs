#!/usr/bin/env node
/**
 * Process gender expansions for a course and store in DB.
 *
 * Usage: node scripts/process-gender.cjs <course_code>
 * Example: node scripts/process-gender.cjs fra_for_eng
 *
 * Requires ANTHROPIC_API_KEY in .env
 */

require('dotenv').config()

const { createClient } = require('@supabase/supabase-js')
const genderHaikuService = require('../services/gender-haiku-service.cjs')

const courseCode = process.argv[2]
if (!courseCode) {
  console.error('Usage: node scripts/process-gender.cjs <course_code>')
  process.exit(1)
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY not set in environment')
  process.exit(1)
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function main() {
  console.log(`Processing gender expansions for ${courseCode}...`)

  try {
    const stats = await genderHaikuService.processAndStore(courseCode, supabase)
    console.log(`\nDone: ${stats.modified}/${stats.total} texts modified in ${stats.elapsed}ms`)
  } catch (err) {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  }
}

main()
