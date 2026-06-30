#!/usr/bin/env node
/**
 * extend-spaced-rep-offsets.cjs — flip the GO-LIVE switch for the spaced-rep
 * seed-phase extension.
 *
 * Both apps read algorithm_config.script_shape at runtime; the code arrays are
 * only fallbacks. This sets the row's spacedRepOffsets to the full course-
 * spanning Fibonacci series so seed-phase reviews (offset ≥144) actually reach
 * learners. Only spacedRepOffsets is touched — every other script_shape field
 * is preserved.
 *
 * SAFE BY DEFAULT: dry-run unless you pass --commit.
 *   node tools/sync/extend-spaced-rep-offsets.cjs            # show before/after, write nothing
 *   node tools/sync/extend-spaced-rep-offsets.cjs --commit   # actually update the live row
 *
 * Idempotent: re-running when already extended is a no-op.
 * Revert: re-run with TARGET set back to the historical [..,55,89].
 */
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const TARGET = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584]
const COMMIT = process.argv.includes('--commit')

;(async () => {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const { data: row, error: readErr } = await sb
    .from('algorithm_config').select('key, config').eq('key', 'script_shape').single()
  if (readErr) { console.error('READ FAILED:', readErr.message); process.exit(1) }

  const before = row.config.spacedRepOffsets
  console.log('current spacedRepOffsets:', JSON.stringify(before))
  console.log('target  spacedRepOffsets:', JSON.stringify(TARGET))

  if (JSON.stringify(before) === JSON.stringify(TARGET)) {
    console.log('\n✓ Already up to date — nothing to do.')
    return
  }

  // Preserve every other field; only replace spacedRepOffsets.
  const nextConfig = { ...row.config, spacedRepOffsets: TARGET }

  if (!COMMIT) {
    console.log('\nDRY RUN — no write. Other fields preserved:',
      JSON.stringify({ ...nextConfig, spacedRepOffsets: '…(extended)' }))
    console.log('Re-run with --commit to apply.')
    return
  }

  const { error: writeErr } = await sb
    .from('algorithm_config').update({ config: nextConfig }).eq('key', 'script_shape')
  if (writeErr) { console.error('WRITE FAILED:', writeErr.message); process.exit(1) }

  const { data: check } = await sb
    .from('algorithm_config').select('config').eq('key', 'script_shape').single()
  console.log('\n✓ COMMITTED. Live spacedRepOffsets now:',
    JSON.stringify(check.config.spacedRepOffsets))
})()
