#!/usr/bin/env node
require('dotenv').config()
const { Client } = require('pg')
const fs = require('fs')

async function run() {
  const sqlFile = process.argv[2] || 'supabase/migrations/20251228_cycle_views_v12.sql'

  // Extract project ref from Supabase URL
  const projectRef = process.env.SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')
  const password = process.env.SUPABASE_SERVICE_KEY

  // Supabase direct connection
  const connectionString = `postgresql://postgres.${projectRef}:${password}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`

  console.log('Connecting to Supabase...')

  const client = new Client({ connectionString })

  try {
    await client.connect()
    console.log('Connected!')

    const sql = fs.readFileSync(sqlFile, 'utf8')
    console.log('Running ' + sqlFile + '...')

    await client.query(sql)
    console.log('Migration complete!')
  } catch (error) {
    console.error('Error:', error.message)
    if (error.detail) console.error('Detail:', error.detail)
    if (error.hint) console.error('Hint:', error.hint)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()
