#!/usr/bin/env node
/**
 * Loose recovery for translations whose JSON broke because Claude used ASCII "
 * as a closing quote on a string opened with a typographic quote (German „...",
 * Lithuanian „...", etc.). Rather than trying to fix the JSON, parse entries
 * one-by-one with a regex that treats `"sequence":\s*N` as the entry boundary.
 */
const fs = require('fs')
const path = require('path')

const OUT_DIR = path.join(__dirname, '..', '..', 'temp', 'paywall-expansion', 'output')

function recover(lang) {
  // Prefer the parse_error file if present (output of the parser), else raw
  let src
  const peFile = path.join(OUT_DIR, lang + '.json.parse_error.txt')
  const rawFile = path.join(OUT_DIR, lang + '.raw.txt')
  if (fs.existsSync(peFile)) src = fs.readFileSync(peFile, 'utf8')
  else if (fs.existsSync(rawFile)) src = fs.readFileSync(rawFile, 'utf8')
  else return { ok: false, error: 'no source file' }

  // Find every entry of the form {"sequence": N, "text": "..."}
  // The text may contain unescaped quotes (the bug we're recovering from).
  // Strategy: split on the boundary `}, {"sequence":` which is unique enough.
  // Then parse each chunk by extracting sequence and text manually.
  const entries = []
  // Normalise — strip leading [, trailing ], whitespace, and markdown fences
  let body = src.replace(/```(?:json)?/g, '').trim()
  body = body.replace(/^\[\s*/, '').replace(/\s*\]?\s*$/, '')

  // Split on `}, ` followed by `{"sequence":` or `{ "sequence":`
  // Each chunk begins with `{"sequence":` (possibly first char missing leading `{`)
  const chunks = body.split(/}\s*,\s*(?=\{)/)
  for (let chunk of chunks) {
    chunk = chunk.trim()
    if (chunk.startsWith('{')) chunk = chunk.slice(1)
    if (chunk.endsWith('}')) chunk = chunk.slice(0, -1)
    chunk = chunk.trim()

    // Pattern: "sequence": N, "text": "..."
    // Capture sequence as integer, text as everything after `"text":\s*"` up to the LAST `"` before end of chunk.
    const seqMatch = chunk.match(/"sequence"\s*:\s*(\d+)/)
    if (!seqMatch) continue
    const seq = parseInt(seqMatch[1], 10)
    const textStart = chunk.search(/"text"\s*:\s*"/)
    if (textStart < 0) continue
    const afterColon = chunk.slice(textStart).match(/"text"\s*:\s*"/)[0].length
    const textBegin = textStart + afterColon
    // Take from textBegin up to last `"` in chunk
    const textEnd = chunk.lastIndexOf('"')
    if (textEnd <= textBegin) continue
    let text = chunk.slice(textBegin, textEnd)
    // Unescape JSON escape sequences \", \\, \n
    text = text.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\')
    entries.push({ sequence: seq, text })
  }

  if (entries.length === 0) return { ok: false, error: 'no entries extracted' }
  return { ok: true, entries }
}

const langs = ['deu', 'lit']
for (const lang of langs) {
  const result = recover(lang)
  if (result.ok) {
    fs.writeFileSync(path.join(OUT_DIR, lang + '.json'), JSON.stringify(result.entries, null, 2))
    console.log(`✓ ${lang}: ${result.entries.length} entries recovered`)
    // Sanity: check for ASCII " in extracted texts (would indicate fix needed)
    const withQuotes = result.entries.filter(e => e.text.includes('"')).length
    if (withQuotes > 0) console.log(`   (${withQuotes} entries contain ASCII " — review for cleanup)`)
  } else {
    console.log(`✗ ${lang}: ${result.error}`)
  }
}
