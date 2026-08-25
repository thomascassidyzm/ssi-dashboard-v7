#!/usr/bin/env node
/**
 * Put the candidate page where Kai's phone can reach it: the evidence host on
 * watson-1. Copies the page, the candidate manifest and the clips.
 *
 * The evidence server 404s non-ASCII filenames, so every candidate id is ASCII
 * by construction ("i-wue", never "i-wü") and this refuses to copy a file that
 * is not — a silent 404 on the phone reads as "that one's broken", not "that
 * one has an umlaut in its name".
 *
 * Usage: node tools/deu-at-splice/deploy.cjs [--dir <work dir>] [--slug <name>]
 */
const fs = require('fs')
const path = require('path')

const arg = (f, d) => (process.argv.includes(f) ? process.argv[process.argv.indexOf(f) + 1] : d)
const WORK = arg('--dir', path.join(__dirname, '..', '..', 'scripts', 'deu-at-splice'))
const SLUG = arg('--slug', 'deu-at-splice-candidates-2026-08-25')
const DEST = path.join('/home/tomcassidy/command-surface/public/evidence', SLUG)

const ascii = (s) => /^[\x20-\x7e]+$/.test(s)

function main() {
  const src = path.join(WORK, 'candidates')
  fs.mkdirSync(path.join(DEST, 'clips'), { recursive: true })
  fs.copyFileSync(path.join(__dirname, 'page', 'index.html'), path.join(DEST, 'index.html'))
  fs.copyFileSync(path.join(src, 'candidates.json'), path.join(DEST, 'candidates.json'))

  let n = 0
  const bad = []
  for (const f of fs.readdirSync(path.join(src, 'clips'))) {
    if (!f.endsWith('.mp3')) continue
    if (!ascii(f)) { bad.push(f); continue }
    fs.copyFileSync(path.join(src, 'clips', f), path.join(DEST, 'clips', f))
    n++
  }
  console.log(`${n} clips -> ${DEST}`)
  if (bad.length) console.log(`REFUSED (non-ASCII names the evidence server would 404): ${bad.join(', ')}`)
  console.log(`https://watson-1.tail4968cb.ts.net/evidence/${SLUG}/index.html`)
}

if (require.main === module) main()
