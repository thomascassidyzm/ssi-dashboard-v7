#!/usr/bin/env node
/**
 * What has Aran changed in the How This Works copy?
 *
 *   node tools/htw-copy/diff.cjs            unified diff, frozen original -> current live text
 *   node tools/htw-copy/diff.cjs --export   the same, and writes the current text to
 *                                           ../ssi-learning-app/docs/htw-copy-for-aran.edited.md
 *                                           so a mapping worker has a normal file to work from
 *   node tools/htw-copy/diff.cjs --history  list every save (time, who, size)
 *
 * Source of truth is the append-only table public.htw_copy_versions, written by
 * POST /api/htw-copy from the editor at https://popty.app/htw-copy.
 * Needs .env.psql at the repo root (the DATABASE_URL secret-zero).
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execFileSync } = require('child_process')
const { Client } = require('pg')

const REPO = path.join(__dirname, '../..')
const url = (fs.readFileSync(path.join(REPO, '.env.psql'), 'utf8')
  .match(/DATABASE_URL=(.*)/) || [])[1].trim()

const EXPORT_TO = path.join(REPO, '../ssi-learning-app/docs/htw-copy-for-aran.edited.md')

;(async () => {
  const c = new Client({ connectionString: url })
  await c.connect()

  const { rows: all } = await c.query(
    `select kind, content, saved_at, saved_by, length(content) len
       from htw_copy_versions where doc_id = 'htw' order by id`)
  await c.end()

  const original = all.find(r => r.kind === 'original')
  const saves = all.filter(r => r.kind === 'save')
  if (!original) { console.error('no original row — the document has not been seeded'); process.exit(1) }
  const current = saves.length ? saves[saves.length - 1] : original

  if (process.argv.includes('--history')) {
    saves.forEach((s, i) => console.log(
      `${String(i + 1).padStart(3)}  ${s.saved_at.toISOString()}  ${s.len} chars  ${s.saved_by || ''}`))
    return
  }

  if (original.content === current.content) {
    console.log('No edits yet — the live text is identical to the original.')
  } else {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'htwdiff-'))
    const a = path.join(dir, 'original.md')
    const b = path.join(dir, 'current.md')
    fs.writeFileSync(a, original.content)
    fs.writeFileSync(b, current.content)
    try {
      execFileSync('git', ['diff', '--no-index', '--no-color', '--', a, b], { stdio: 'inherit' })
    } catch { /* git diff exits 1 when files differ — that is the normal path */ }
    fs.rmSync(dir, { recursive: true, force: true })
  }

  console.log(`\nsaves: ${saves.length}` +
    (saves.length ? `  latest: ${current.saved_at.toISOString()} by ${current.saved_by || 'unknown'}` : ''))

  if (process.argv.includes('--export')) {
    fs.writeFileSync(EXPORT_TO, current.content)
    console.log(`wrote ${path.resolve(EXPORT_TO)}`)
  }
})().catch(e => { console.error(e.message); process.exit(1) })
