#!/usr/bin/env node
/**
 * Parse Sonnet's per-lang identification outputs into structured delete/keep lists.
 */
const fs = require('fs')
const path = require('path')

const LANGS = ['ara','deu','fra','ita','jpn','kor','por','spa','tam','zho']
const DIR = path.join(__dirname, '..', '..', 'temp', 'encouragement-migration', 'delete-id')

const summary = {}
for (const lang of LANGS) {
  const raw = fs.readFileSync(path.join(DIR, `${lang}.raw.txt`), 'utf8')
  const clean = raw.replace(/```(?:json)?/g, '').trim()
  const start = clean.indexOf('[')
  const end = clean.lastIndexOf(']')
  if (start < 0 || end < start) { console.log(`${lang}: NO JSON ARRAY`); continue }
  let arr
  try { arr = JSON.parse(clean.slice(start, end + 1)) }
  catch (e) { console.log(`${lang}: parse fail (${e.message.slice(0,60)})`); continue }

  // Validate shape
  const total = arr.length
  const enc = arr.filter(x => x.audio_type === 'encouragement')
  const inst = arr.filter(x => x.audio_type === 'instruction')
  const encKeep = enc.filter(x => Number.isInteger(x.decision))
  const encDel = enc.filter(x => x.decision === 'DELETE')
  const instKeep = inst.filter(x => Number.isInteger(x.decision))
  const instDel = inst.filter(x => x.decision === 'DELETE')

  // Check for unmatched seqs
  const encSeqs = encKeep.map(x => x.decision)
  const instSeqs = instKeep.map(x => x.decision)
  const encDupSeqs = encSeqs.filter((s, i) => encSeqs.indexOf(s) !== i)
  const instDupSeqs = instSeqs.filter((s, i) => instSeqs.indexOf(s) !== i)

  summary[lang] = {
    total,
    enc: { total: enc.length, keep: encKeep.length, delete: encDel.length, dupSeqs: encDupSeqs },
    inst: { total: inst.length, keep: instKeep.length, delete: instDel.length, dupSeqs: instDupSeqs },
    parsed: arr,
  }

  fs.writeFileSync(path.join(DIR, `${lang}.parsed.json`), JSON.stringify(arr, null, 2))
}

console.log('LANG | TOTAL | ENC keep | ENC del | ENC dups | INST keep | INST del | INST dups')
console.log('-----+-------+----------+---------+----------+-----------+----------+-----------')
for (const [lang, s] of Object.entries(summary)) {
  console.log(`${lang.padEnd(4)} | ${String(s.total).padStart(5)} | ${String(s.enc.keep).padStart(8)} | ${String(s.enc.delete).padStart(7)} | ${String(s.enc.dupSeqs.length).padStart(8)} | ${String(s.inst.keep).padStart(9)} | ${String(s.inst.delete).padStart(8)} | ${String(s.inst.dupSeqs.length).padStart(9)}`)
}
console.log()
console.log('Expected per lang: enc keep=14, enc del=36, inst keep=14, inst del=34. Dups should be 0.')
console.log('Saved per-lang parsed JSON to ' + DIR + '/{lang}.parsed.json')
