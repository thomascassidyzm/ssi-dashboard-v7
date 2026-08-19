#!/usr/bin/env node
/**
 * What has an editor changed in a learner-facing copy surface?
 *
 *   node tools/htw-copy/diff.cjs                  unified diff for the How This Works doc
 *   node tools/htw-copy/diff.cjs <doc-id>         ...for any registered copy surface
 *   node tools/htw-copy/diff.cjs --list           every surface, with how many saves each has
 *   node tools/htw-copy/diff.cjs <doc-id> --export  writes the current text to a file
 *   node tools/htw-copy/diff.cjs <doc-id> --history list every save (time, who, size)
 *
 * The doc id defaults to 'htw', so every invocation that worked before still works.
 *
 * Source of truth is the append-only table public.htw_copy_versions, written by
 * POST /api/copy?doc=<id> from the editor at https://popty.app/copy/<id>
 * (and by its permanent alias https://popty.app/htw-copy).
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

const args = process.argv.slice(2)
const flags = args.filter(a => a.startsWith('--'))
const docId = args.find(a => !a.startsWith('--')) || 'htw'
const has = f => flags.includes(f)

// Where --export writes. The How This Works doc keeps its original destination so
// the mapping worker's habits are unchanged; anything else lands beside it.
const exportPath = docId === 'htw'
  ? path.join(REPO, '../ssi-learning-app/docs/htw-copy-for-aran.edited.md')
  : path.join(REPO, `../ssi-learning-app/docs/copy-${docId}.edited.md`)

;(async () => {
  const c = new Client({ connectionString: url })
  await c.connect()

  if (has('--list')) {
    const { rows } = await c.query(
      `select doc_id,
              count(*) filter (where kind = 'original') originals,
              count(*) filter (where kind = 'save') saves,
              max(saved_at) filter (where kind = 'save') last_save
         from htw_copy_versions group by doc_id order by doc_id`)
    rows.forEach(r => console.log(
      `${r.doc_id.padEnd(16)} ${String(r.saves).padStart(4)} saves` +
      (r.last_save ? `  last ${r.last_save.toISOString()}` : '') +
      (Number(r.originals) === 1 ? '' : `  ⚠ ${r.originals} original rows`)))
    await c.end()
    return
  }

  const { rows: all } = await c.query(
    `select kind, content, saved_at, saved_by, length(content) len
       from htw_copy_versions where doc_id = $1 order by id`, [docId])
  await c.end()

  const original = all.find(r => r.kind === 'original')
  const saves = all.filter(r => r.kind === 'save')
  if (!original) {
    console.error(`no original row for doc_id='${docId}' — the document has not been seeded`)
    console.error(`seed it with: node tools/htw-copy/seed-doc.cjs ${docId} <file> <source-ref>`)
    process.exit(1)
  }
  const current = saves.length ? saves[saves.length - 1] : original

  if (has('--history')) {
    saves.forEach((s, i) => console.log(
      `${String(i + 1).padStart(3)}  ${s.saved_at.toISOString()}  ${s.len} chars  ${s.saved_by || ''}`))
    return
  }

  if (original.content === current.content) {
    console.log(`No edits yet — the live text of '${docId}' is identical to the original.`)
  } else {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'copydiff-'))
    const a = path.join(dir, 'original.md')
    const b = path.join(dir, 'current.md')
    fs.writeFileSync(a, original.content)
    fs.writeFileSync(b, current.content)
    try {
      execFileSync('git', ['diff', '--no-index', '--no-color', '--', a, b], { stdio: 'inherit' })
    } catch { /* git diff exits 1 when files differ — that is the normal path */ }
    fs.rmSync(dir, { recursive: true, force: true })
  }

  console.log(`\ndoc: ${docId}  saves: ${saves.length}` +
    (saves.length ? `  latest: ${current.saved_at.toISOString()} by ${current.saved_by || 'unknown'}` : ''))

  if (has('--export')) {
    fs.writeFileSync(exportPath, current.content)
    console.log(`wrote ${path.resolve(exportPath)}`)
  }
})().catch(e => { console.error(e.message); process.exit(1) })
