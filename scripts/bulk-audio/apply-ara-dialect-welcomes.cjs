#!/usr/bin/env node
/**
 * Apply Lebanese (ara_lb) and Syrian (ara_sy) welcome audio to the 4 dialect courses.
 * Replaces any existing welcome row that points at non-dialect audio.
 *
 * Usage: --plan to preview, --execute to apply
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const idx = require('./generated/welcomes/production/_welcome_index.json')

const EXECUTE = process.argv.includes('--execute')

const targets = [
  { course_code: 'ara_lb_for_eng', known_lang: 'eng', target_key: 'ara_lb' },
  { course_code: 'ara_sy_for_eng', known_lang: 'eng', target_key: 'ara_sy' },
  { course_code: 'ara_sy_for_jpn', known_lang: 'jpn', target_key: 'ara_sy' },
  { course_code: 'ara_sy_for_zho', known_lang: 'zho', target_key: 'ara_sy' }
]

const KNOWN_ALIAS = { zho: 'cmn' }

;(async () => {
  console.log(`=== ${EXECUTE ? 'EXECUTE' : 'DRY RUN'}: dialect welcome apply (4 courses) ===\n`)

  for (const t of targets) {
    const knownKey = KNOWN_ALIAS[t.known_lang] || t.known_lang
    const entry = idx[knownKey]?.[t.target_key]
    if (!entry) {
      console.log(`  ${t.course_code}: NO INDEX ENTRY for ${knownKey}→${t.target_key} — skip`)
      continue
    }

    const { data: existing } = await sb.from('course_audio')
      .select('id, s3_key').eq('course_code', t.course_code).eq('role', 'welcome')

    const action = existing?.length ? 'REPLACE' : 'INSERT'
    console.log(`  ${t.course_code}: ${action} → uuid=${entry.uuid.slice(0, 8)}… s3=${entry.s3_key} duration=${entry.duration_ms}ms`)
    if (existing?.length) {
      console.log(`    (current: id=${existing[0].id.slice(0, 8)}… s3=${existing[0].s3_key})`)
    }

    if (!EXECUTE) continue

    if (existing?.length) {
      const { error: delErr } = await sb.from('course_audio')
        .delete().eq('course_code', t.course_code).eq('role', 'welcome')
      if (delErr) { console.log(`    DELETE ERR: ${delErr.message}`); continue }
    }

    const { error } = await sb.from('course_audio').insert({
      id: entry.uuid.toLowerCase(),
      course_code: t.course_code,
      text: 'welcome',
      text_normalized: 'welcome',
      language: t.known_lang,
      role: 'welcome',
      voice_id: 'elevenlabs',
      s3_key: entry.s3_key,
      duration_ms: entry.duration_ms,
      origin: 'tts'
    })
    if (error) { console.log(`    INSERT ERR: ${error.message}`); continue }
    console.log(`    OK`)
  }

  if (!EXECUTE) console.log('\nDry-run. Re-run with --execute to apply.')
})().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
