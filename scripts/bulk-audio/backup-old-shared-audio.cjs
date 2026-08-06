#!/usr/bin/env node
/**
 * Backup all OLD shared_audio entries (encouragement + instruction) for the 12 live langs
 * before any deletion. Written to temp/encouragement-migration/backup-2026-05-01.json
 * with full row data so we can restore if needed.
 *
 * "OLD" = created_at < 2026-05-01 (everything that existed before today's gen).
 */
require('dotenv/config')
const fs = require('fs')
const path = require('path')
const { supabase } = require('../../services/supabase-client.cjs')

const LIVE = ['ara','deu','fra','ita','jpn','kor','lit','por','sin','spa','tam','zho','eng']  // include eng as it has old too

;(async () => {
  const all = []
  for (const lang of LIVE) {
    const { data, error } = await supabase.from('shared_audio')
      .select('*')
      .eq('language', lang)
      .in('audio_type', ['encouragement','instruction'])
      .lt('created_at', '2026-05-01')
    if (error) { console.error(lang, error.message); continue }
    console.log(`${lang}: ${data.length} OLD entries`)
    all.push(...data)
  }
  const outPath = path.join(__dirname, '..', '..', 'temp', 'encouragement-migration', 'backup-2026-05-01.json')
  fs.writeFileSync(outPath, JSON.stringify({ backup_date: new Date().toISOString(), total: all.length, rows: all }, null, 2))
  console.log(`\nBackup written: ${outPath}  (${all.length} rows total)`)
})().catch(e => { console.error(e); process.exit(1) })
