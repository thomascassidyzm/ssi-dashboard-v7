#!/usr/bin/env node
/**
 * Dedup analyzer for the encouragement migration.
 *
 * For each of the 35 translated langs, compare each new translation against
 * shared_audio (where audio_type ∈ {encouragement, instruction} and language matches)
 * to determine: which entries can REUSE existing audio (no TTS) vs need FRESH TTS.
 *
 * Two match levels:
 *   - exact: text_normalized identical → 100% safe reuse
 *   - near: Levenshtein similarity ≥ 95% → likely safe, may differ in punctuation/case
 *
 * Output: temp/encouragement-migration/dedup-report.json + console summary table.
 *
 * Cost estimation: counts per lang = TTS calls needed × estimated chars/duration.
 */
require('dotenv/config')
const fs = require('fs')
const path = require('path')
const { supabase } = require('../../services/supabase-client.cjs')

const ROOT = path.join(__dirname, '..', '..', 'temp', 'encouragement-migration')
const OUT_DIR = path.join(ROOT, 'output')

function normalize(s) {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.?!,;:]+$/, '')
}

function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[a.length][b.length]
}

function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

;(async () => {
  const langs = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''))
  console.log(`Translation files: ${langs.length} langs\n`)

  const report = {}
  let grandTotal = { exact: 0, near: 0, fresh: 0, totalEntries: 0, totalChars: 0, freshChars: 0 }

  for (const lang of langs) {
    if (lang === 'eng') continue  // skip English — it IS the source

    const translations = JSON.parse(fs.readFileSync(path.join(OUT_DIR, `${lang}.json`), 'utf8'))

    // Load shared_audio for this lang's encouragement + instruction entries
    const { data: existing } = await supabase.from('shared_audio')
      .select('text, text_normalized, audio_type')
      .eq('language', lang)
      .in('audio_type', ['encouragement', 'instruction'])

    const existingByType = { encouragement: [], instruction: [] }
    for (const e of existing || []) {
      existingByType[e.audio_type]?.push(normalize(e.text_normalized || e.text))
    }

    let exactMatch = 0, nearMatch = 0, fresh = 0, freshChars = 0, totalChars = 0
    const freshSamples = []
    const nearSamples = []

    for (const tr of translations) {
      const norm = normalize(tr.text)
      const pool = existingByType[tr.audio_type] || []
      totalChars += tr.text.length

      // Exact match first
      if (pool.includes(norm)) { exactMatch++; continue }

      // Near match: any existing within 95% similarity
      let bestSim = 0, bestExisting = null
      for (const ex of pool) {
        const s = similarity(norm, ex)
        if (s > bestSim) { bestSim = s; bestExisting = ex }
        if (bestSim >= 0.95) break
      }
      if (bestSim >= 0.95) {
        nearMatch++
        if (nearSamples.length < 3) nearSamples.push({ tr: tr.text.slice(0, 80), ex: bestExisting?.slice(0, 80), sim: bestSim.toFixed(3) })
      } else {
        fresh++
        freshChars += tr.text.length
        if (freshSamples.length < 2) freshSamples.push(tr.text.slice(0, 60))
      }
    }

    report[lang] = { total: translations.length, exact: exactMatch, near: nearMatch, fresh, freshChars, totalChars, freshSamples, nearSamples }
    grandTotal.exact += exactMatch
    grandTotal.near += nearMatch
    grandTotal.fresh += fresh
    grandTotal.totalEntries += translations.length
    grandTotal.totalChars += totalChars
    grandTotal.freshChars += freshChars
  }

  // Print summary
  console.log('LANG  | total | exact | near | fresh | fresh_chars')
  console.log('------+-------+-------+------+-------+------------')
  for (const [lang, r] of Object.entries(report).sort()) {
    console.log(`${lang.padEnd(5)} | ${String(r.total).padStart(5)} | ${String(r.exact).padStart(5)} | ${String(r.near).padStart(4)} | ${String(r.fresh).padStart(5)} | ${String(r.freshChars).padStart(11)}`)
  }
  console.log('------+-------+-------+------+-------+------------')
  console.log(`TOTAL | ${String(grandTotal.totalEntries).padStart(5)} | ${String(grandTotal.exact).padStart(5)} | ${String(grandTotal.near).padStart(4)} | ${String(grandTotal.fresh).padStart(5)} | ${String(grandTotal.freshChars).padStart(11)}`)

  console.log(`\nMatch rate: exact=${(grandTotal.exact / grandTotal.totalEntries * 100).toFixed(1)}%  near=${(grandTotal.near / grandTotal.totalEntries * 100).toFixed(1)}%  fresh=${(grandTotal.fresh / grandTotal.totalEntries * 100).toFixed(1)}%`)
  console.log(`Total chars to TTS: ${grandTotal.freshChars.toLocaleString()}`)
  // ElevenLabs cost: ~1 credit per character (varies by model). Sin uses Azure.
  console.log(`Rough cost estimate: ${(grandTotal.freshChars * 1).toLocaleString()} credits (1 credit/char ElevenLabs upper bound)`)

  fs.writeFileSync(path.join(ROOT, 'dedup-report.json'), JSON.stringify(report, null, 2))
  console.log(`\nSaved per-lang detail to dedup-report.json`)
})().catch(e => { console.error(e); process.exit(1) })
