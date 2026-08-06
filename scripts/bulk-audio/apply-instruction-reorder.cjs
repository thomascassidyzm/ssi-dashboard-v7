#!/usr/bin/env node
/**
 * Apply canonical instruction ORDER to shared_audio.sequence, per language.
 * Reads temp/reorder/{lang}-rows.json (id,text) + temp/reorder/{lang}-map.json ([{id,seq}]).
 * Validates a perfect 1..48 bijection AND cross-checks translation-surviving fingerprints
 * (Kliemann/Julie/Twitter/Formula/7000/2%+20%) against the canonical English reference,
 * so a mis-matched map is caught before any write.
 *
 * Usage:
 *   node apply-instruction-reorder.cjs --lang deu[,spa,...] [--apply]
 *   node apply-instruction-reorder.cjs --all [--apply]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const DIR = path.join(__dirname, '../../temp/reorder')

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const argVal = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }

// Build anchor -> expected canonical seq from the English reference.
const canon = JSON.parse(fs.readFileSync(path.join(DIR, 'canonical-order-english.json'), 'utf8'))
const findSeq = re => { const e = canon.find(c => re.test(c.english)); return e ? e.seq : null }
const ANCHORS = [
  { name: 'Kliemann', row: /kliemann|2019|iowa/i, seq: findSeq(/Kliemann/) },
  { name: 'Julie', row: /julie/i, seq: findSeq(/Julie/) },
  { name: 'Twitter', row: /twitter/i, seq: findSeq(/Twitter/) },
  { name: 'Iowa/2019', row: /\biowa\b|\b2019\b/i, seq: findSeq(/Kliemann/) },
  { name: '2%+20%', row: /2\s*%[\s\S]{0,80}20\s*%|20\s*%[\s\S]{0,80}2\s*%/, seq: findSeq(/2% of your body weight|only 2% of/i) },
].filter(a => a.seq != null)
// NOTE: "7000" and "100 billion" each appear in TWO instructions (the science one + the
// recap seq47), so they are NOT usable as unique anchors. Formula/hemispherectomy get
// translated/transliterated and don't survive as latin substrings, so they're omitted.

function loadLangs() {
  if (args.includes('--all')) {
    return fs.readdirSync(DIR).filter(f => f.endsWith('-map.json')).map(f => f.replace('-map.json', ''))
  }
  return (argVal('--lang') || '').split(',').filter(Boolean)
}

async function processLang(lang) {
  const rowsF = path.join(DIR, `${lang}-rows.json`), mapF = path.join(DIR, `${lang}-map.json`)
  if (!fs.existsSync(mapF)) return console.log(`${lang}: no map file — skip`)
  const rows = JSON.parse(fs.readFileSync(rowsF, 'utf8'))
  const map = JSON.parse(fs.readFileSync(mapF, 'utf8'))
  const textById = new Map(rows.map(r => [r.id, r.text]))
  const problems = []
  // bijection checks
  if (map.length !== 48) problems.push(`map has ${map.length} entries (expected 48)`)
  const seqs = map.map(m => m.seq)
  const seqSet = new Set(seqs)
  if (seqSet.size !== 48) problems.push(`sequences not unique (${seqSet.size} distinct)`)
  for (let s = 1; s <= 48; s++) if (!seqSet.has(s)) problems.push(`missing seq ${s}`)
  const ids = new Set(map.map(m => m.id))
  if (ids.size !== map.length) problems.push('duplicate ids in map')
  for (const m of map) if (!textById.has(m.id)) problems.push(`map id not in rows: ${m.id}`)
  // fingerprint cross-checks
  const seqById = new Map(map.map(m => [m.id, m.seq]))
  const fp = []
  for (const a of ANCHORS) {
    const hit = rows.find(r => a.row.test(r.text || ''))
    if (!hit) { fp.push(`${a.name}: not found in text (skip)`); continue }
    const got = seqById.get(hit.id)
    if (got !== a.seq) problems.push(`FINGERPRINT ${a.name}: row mapped to seq ${got}, expected ${a.seq}`)
    else fp.push(`${a.name}✓seq${a.seq}`)
  }
  const ok = problems.length === 0
  console.log(`\n${lang}: ${ok ? 'VALID' : 'PROBLEMS'} | fingerprints: ${fp.join('  ')}`)
  if (!ok) { problems.forEach(p => console.log(`   ✗ ${p}`)); return }
  if (APPLY) {
    let n = 0
    for (const m of map) { const { error } = await supabase.from('shared_audio').update({ sequence: m.seq }).eq('id', m.id); if (error) console.log(`   ERR ${m.id}: ${error.message}`); else n++ }
    // verify DB
    const { data } = await supabase.from('shared_audio').select('sequence').eq('language', lang).eq('audio_type', 'instruction')
    const dbSeqs = data.map(r => r.sequence).sort((a, b) => a - b)
    const good = new Set(dbSeqs).size === 48 && dbSeqs[0] === 1 && dbSeqs[47] === 48
    console.log(`   applied ${n} | DB sequences 1..48 unique+complete: ${good}`)
  }
}

(async () => {
  const langs = loadLangs()
  console.log(`mode: ${APPLY ? 'APPLY' : 'VERIFY-ONLY'} | anchors: ${ANCHORS.map(a => a.name + '=seq' + a.seq).join(', ')}`)
  for (const l of langs) await processLang(l)
  process.exit(0)
})().catch(e => { console.error(e); process.exit(1) })
