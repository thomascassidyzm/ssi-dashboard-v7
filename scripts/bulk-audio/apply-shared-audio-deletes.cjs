#!/usr/bin/env node
/**
 * Apply the shared_audio cleanup based on Sonnet's identification.
 *
 * For each lang, parse {lang}.parsed.json:
 *   - Entries where decision = "DELETE" → delete from shared_audio
 *   - Entries where decision = <int seq> → keep (verify exists)
 * Cross-check: any DB entry whose UUID isn't in the parsed list → also delete
 *   (safer default; catches Sonnet hallucinations that omitted real UUIDs)
 *
 * For eng: delete the deprecated old eng entries (74 enc + 96 inst → keep 14 enc + 14 inst).
 *   Eng identification is direct from the eng-source comparison (no Sonnet needed).
 *
 * Usage: --plan to preview, --execute to apply
 */
require('dotenv/config')
const fs = require('fs')
const path = require('path')
const { supabase } = require('../../services/supabase-client.cjs')

const EXECUTE = process.argv.includes('--execute')
const LANGS_WITH_OLD = ['ara','deu','fra','ita','jpn','kor','por','spa','tam','zho']
const DIR = path.join(__dirname, '..', '..', 'temp', 'encouragement-migration', 'delete-id')

;(async () => {
  console.log(`\n=== shared_audio cleanup — ${EXECUTE ? 'EXECUTE' : 'DRY RUN'} ===\n`)

  // For each lang, build the keep + delete sets
  const allDeletes = []  // { lang, id, audio_type, reason }
  const allKeeps = []    // { lang, id, audio_type, seq }

  for (const lang of LANGS_WITH_OLD) {
    const parsedPath = path.join(DIR, `${lang}.parsed.json`)
    if (!fs.existsSync(parsedPath)) { console.log(`${lang}: NO parsed.json — skip`); continue }
    const arr = JSON.parse(fs.readFileSync(parsedPath, 'utf8'))

    // Get actual DB ids
    const { data: actual } = await supabase.from('shared_audio')
      .select('id, audio_type')
      .eq('language', lang).in('audio_type', ['encouragement','instruction'])
      .lt('created_at', '2026-05-01')
    const actualSet = new Map(actual.map(a => [a.id, a.audio_type]))

    const keeps = arr.filter(e => Number.isInteger(e.decision) && actualSet.has(e.id))
    const dels = arr.filter(e => e.decision === 'DELETE' && actualSet.has(e.id))
    const inDbNotInOutput = [...actualSet.entries()].filter(([id]) => !arr.some(a => a.id === id))

    console.log(`${lang}: keep=${keeps.length}  delete=${dels.length}  not-in-output=${inDbNotInOutput.length} (default delete)`)

    for (const k of keeps) allKeeps.push({ lang, id: k.id, audio_type: k.audio_type, seq: k.decision })
    for (const d of dels) allDeletes.push({ lang, id: d.id, audio_type: d.audio_type, reason: 'sonnet-marked-DELETE' })
    for (const [id, audio_type] of inDbNotInOutput) allDeletes.push({ lang, id, audio_type, reason: 'missing-from-sonnet-output' })
  }

  // For eng: identify deprecated old entries
  console.log('\n--- eng (separate identification — direct text match) ---')
  const newSrc = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'temp', 'encouragement-migration', 'eng-source.json'), 'utf8'))
  const newSet = {
    encouragement: new Set(newSrc.filter(e => e.audio_type === 'encouragement').map(e => e.text)),
    instruction: new Set(newSrc.filter(e => e.audio_type === 'instruction').map(e => e.text)),
  }
  const { data: oldEng } = await supabase.from('shared_audio').select('id, audio_type, text').eq('language','eng').in('audio_type', ['encouragement','instruction']).lt('created_at', '2026-05-01')
  let engKeep = 0, engDel = 0
  for (const e of oldEng) {
    if (newSet[e.audio_type].has(e.text)) {
      engKeep++
    } else {
      engDel++
      allDeletes.push({ lang: 'eng', id: e.id, audio_type: e.audio_type, reason: 'eng-deprecated' })
    }
  }
  console.log(`eng: keep=${engKeep}  delete=${engDel}`)

  console.log(`\n=== TOTAL: ${allDeletes.length} entries to delete, ${allKeeps.length} non-eng to keep ===`)

  // Save plan files
  fs.writeFileSync(path.join(DIR, 'cleanup-plan.json'), JSON.stringify({ deletes: allDeletes, keeps: allKeeps }, null, 2))
  console.log('Saved plan to cleanup-plan.json')

  if (!EXECUTE) {
    console.log('\nDry-run only. Re-run with --execute to apply deletions.')
    return
  }

  console.log('\n=== Applying deletes ===')
  let ok = 0, failed = 0
  // Batch deletes by 100 at a time
  const ids = allDeletes.map(d => d.id)
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    const { error, count } = await supabase.from('shared_audio').delete({ count: 'exact' }).in('id', chunk)
    if (error) { console.error(`Batch ${i}-${i+chunk.length}: ${error.message}`); failed += chunk.length }
    else { ok += count || 0; process.stdout.write('.') }
  }
  console.log(`\nDeleted: ${ok}  Failed: ${failed}`)

  // Verify post-state
  console.log('\n=== Post-verify counts ===')
  for (const lang of [...LANGS_WITH_OLD, 'eng', 'lit', 'sin']) {
    const { count: enc } = await supabase.from('shared_audio').select('id', { count: 'exact', head: true }).eq('language', lang).eq('audio_type', 'encouragement')
    const { count: inst } = await supabase.from('shared_audio').select('id', { count: 'exact', head: true }).eq('language', lang).eq('audio_type', 'instruction')
    console.log(`  ${lang.padEnd(4)}: enc=${enc}  inst=${inst}`)
  }
})().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
