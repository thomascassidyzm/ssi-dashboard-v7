#!/usr/bin/env node
/**
 * Recover the 35 parse_error files from the encouragement recovery pass.
 *
 * Failure mode: Sonnet used the language's typographic OPEN quote („/«/") but
 * ASCII " for closing — the ASCII " prematurely terminates the JSON string.
 *
 * Fix: per-line, in any "text": "..." line, replace interior ASCII " with the
 * right-typographic " (U+201D). Same pattern that worked for paywall recovery.
 *
 * Reads:  temp/encouragement-migration/recovery/{key}.json.parse_error.txt
 * Writes: temp/encouragement-migration/recovery/{key}.json
 */
const fs = require('fs')
const path = require('path')

const RECOVERY_DIR = path.join(__dirname, '..', '..', 'temp', 'encouragement-migration', 'recovery')

function recover(file) {
  const txt = fs.readFileSync(file, 'utf8')
  const lines = txt.split('\n')
  const fixed = lines.map(line => {
    const m = line.match(/^(\s*"text":\s*")(.*)("[,]?)$/)
    if (!m) return line
    const inner = m[2].replace(/"/g, '”')
    return m[1] + inner + m[3]
  })
  const result = fixed.join('\n')
  let parsed
  try { parsed = JSON.parse(result) }
  catch (e) { return { ok: false, err: e.message.slice(0, 80) } }
  if (!Array.isArray(parsed)) return { ok: false, err: 'not array' }
  return { ok: true, data: parsed }
}

const errFiles = fs.readdirSync(RECOVERY_DIR).filter(f => f.endsWith('.json.parse_error.txt'))
console.log(`Found ${errFiles.length} parse_error files`)
let ok = 0, stillFails = 0
for (const f of errFiles) {
  const fullPath = path.join(RECOVERY_DIR, f)
  const result = recover(fullPath)
  if (result.ok) {
    const outName = f.replace(/\.parse_error\.txt$/, '')
    fs.writeFileSync(path.join(RECOVERY_DIR, outName), JSON.stringify(result.data, null, 2))
    ok++
    if (ok <= 5) console.log(`  ✓ ${outName}: ${result.data.length} entries`)
  } else {
    stillFails++
    console.log(`  ✗ ${f}: ${result.err}`)
  }
}
console.log(`\nRecovered ${ok}/${errFiles.length}; still failing ${stillFails}`)
