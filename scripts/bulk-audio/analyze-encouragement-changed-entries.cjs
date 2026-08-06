#!/usr/bin/env node
/**
 * Identify which of the 96 new English entries actually CHANGED vs the old
 * English set in shared_audio. Only the changed ones need fresh translations
 * and TTS in non-English langs.
 *
 * Threshold: similarity ≥ 0.95 = "unchanged" (reuse existing non-eng audio).
 *           similarity < 0.95 = "changed" (need new translation + TTS).
 *
 * Output:
 *   - per-entry classification (unchanged/changed)
 *   - per-lang TTS scope (chars to generate for the changed entries only)
 */
require('dotenv/config')
const fs = require('fs')
const path = require('path')
const { supabase } = require('../../services/supabase-client.cjs')

function lev(a, b) {
  if (a === b) return 0
  const m = Array.from({ length: a.length + 1 }, (_, i) => i)
  for (let j = 1; j <= b.length; j++) {
    let prev = m[0]; m[0] = j
    for (let i = 1; i <= a.length; i++) {
      const t = m[i]
      m[i] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, m[i], m[i - 1])
      prev = t
    }
  }
  return m[a.length]
}
const sim = (a, b) => 1 - lev(a, b) / Math.max(a.length, b.length)

const ROOT = path.join(__dirname, '..', '..', 'temp', 'encouragement-migration')
const OUT_DIR = path.join(ROOT, 'output')
const THRESHOLD = 0.95

;(async () => {
  const newSrc = JSON.parse(fs.readFileSync(path.join(ROOT, 'eng-source.json'), 'utf8'))
  const { data: oldEng } = await supabase.from('shared_audio')
    .select('text, audio_type, created_at')
    .eq('language', 'eng').in('audio_type', ['encouragement', 'instruction'])
    .lt('created_at', '2026-03-11')

  console.log(`Old eng entries (pre 2026-03-11): ${oldEng.length} (${oldEng.filter(e=>e.audio_type==='encouragement').length} enc + ${oldEng.filter(e=>e.audio_type==='instruction').length} inst)`)
  console.log(`New eng-source: ${newSrc.length} (${newSrc.filter(e=>e.audio_type==='encouragement').length} enc + ${newSrc.filter(e=>e.audio_type==='instruction').length} inst)`)
  console.log(`Threshold for "unchanged": ≥${THRESHOLD}\n`)

  const classified = []
  for (const ne of newSrc) {
    const cands = oldEng.filter(o => o.audio_type === ne.audio_type)
    let best = 0, bestText = null
    for (const c of cands) {
      const s = sim(ne.text.toLowerCase(), c.text.toLowerCase())
      if (s > best) { best = s; bestText = c.text }
      if (best >= 1.0) break
    }
    classified.push({
      seq: ne.sequence_within_type,
      type: ne.audio_type,
      text: ne.text,
      similarity: best,
      bestOldText: bestText,
      status: best >= THRESHOLD ? 'unchanged' : 'changed',
    })
  }

  const unchanged = classified.filter(c => c.status === 'unchanged')
  const changed = classified.filter(c => c.status === 'changed')
  console.log(`UNCHANGED (≥${THRESHOLD}): ${unchanged.length} (${unchanged.filter(c=>c.type==='encouragement').length} enc + ${unchanged.filter(c=>c.type==='instruction').length} inst)`)
  console.log(`CHANGED   (<${THRESHOLD}): ${changed.length} (${changed.filter(c=>c.type==='encouragement').length} enc + ${changed.filter(c=>c.type==='instruction').length} inst)`)

  console.log('\nFirst 8 changed entries (need fresh TTS in all langs):')
  for (const c of changed.slice(0, 8)) {
    console.log(`  ${c.type.slice(0,4)} seq=${c.seq}  sim=${c.similarity.toFixed(3)}`)
    console.log(`    new: ${c.text.slice(0, 100)}`)
    if (c.bestOldText) console.log(`    old: ${c.bestOldText.slice(0, 100)}`)
  }

  // Per-lang TTS scope (only for the changed entries)
  console.log('\n\nPer-lang TTS scope (chars for CHANGED entries only):')
  console.log('LANG  | chars')
  console.log('------+--------')
  let totalChars = 0
  const langs = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json',''))
  const liveLangs = ['ara','deu','fra','ita','jpn','kor','por','sin','spa','tam','zho']
  for (const lang of langs.sort()) {
    if (lang === 'eng') continue
    const tr = JSON.parse(fs.readFileSync(path.join(OUT_DIR, `${lang}.json`), 'utf8'))
    let chars = 0
    for (const c of changed) {
      const trEntry = tr.find(t => t.audio_type === c.type && t.sequence_within_type === c.seq)
      if (trEntry) chars += trEntry.text.length
    }
    totalChars += chars
    const flag = liveLangs.includes(lang) ? '★' : ' '
    console.log(`${lang.padEnd(5)} ${flag}| ${String(chars).padStart(6)}`)
  }
  console.log('------+--------')
  console.log(`TOTAL  | ${String(totalChars).padStart(6)}`)
  console.log(`\n★ = live-content lang per Kai's priority`)
  let liveOnly = 0
  for (const lang of liveLangs) {
    if (lang === 'eng') continue
    const tr = JSON.parse(fs.readFileSync(path.join(OUT_DIR, `${lang}.json`), 'utf8'))
    for (const c of changed) {
      const trEntry = tr.find(t => t.audio_type === c.type && t.sequence_within_type === c.seq)
      if (trEntry) liveOnly += trEntry.text.length
    }
  }
  console.log(`Total chars for 11 LIVE langs only: ${liveOnly.toLocaleString()}`)

  fs.writeFileSync(path.join(ROOT, 'changed-entries.json'), JSON.stringify({ unchanged: unchanged.map(c=>({seq:c.seq,type:c.type,sim:c.similarity})), changed: changed.map(c=>({seq:c.seq,type:c.type,sim:c.similarity,text:c.text,oldText:c.bestOldText})) }, null, 2))
  console.log('\nFull report: temp/encouragement-migration/changed-entries.json')
})().catch(e => { console.error(e); process.exit(1) })
