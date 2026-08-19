#!/usr/bin/env node
/**
 * What has an editor changed in a learner-facing copy surface?
 *
 *   node tools/htw-copy/diff.cjs                  unified diff for the How This Works doc
 *   node tools/htw-copy/diff.cjs <doc-id>         ...for any registered copy surface
 *   node tools/htw-copy/diff.cjs --list           every surface, with how many saves each has
 *   node tools/htw-copy/diff.cjs <doc-id> --export  writes the draft to a file
 *   node tools/htw-copy/diff.cjs <doc-id> --history every version (time, who, size, published)
 *   node tools/htw-copy/diff.cjs <doc-id> --published  DRAFT vs WHAT LEARNERS SEE
 *
 * The doc id defaults to 'htw', so every invocation that worked before still works.
 *
 * Two different questions, and they are easy to confuse:
 *   (no flag)     draft vs the frozen original — everything an editor has changed
 *   --published   draft vs the published version — what is written but not yet live
 *
 * Source of truth is the append-only table public.htw_copy_versions, written by
 * POST /api/copy?doc=<id> from the editor at https://popty.app/copy/<id>
 * (and by its permanent alias https://popty.app/htw-copy). The published version
 * is the row with the greatest non-null published_at — the same rule the API and
 * the learner endpoint use.
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
              max(saved_at) filter (where kind = 'save') last_save,
              max(published_at) published_at
         from htw_copy_versions group by doc_id order by doc_id`)
    rows.forEach(r => console.log(
      `${r.doc_id.padEnd(16)} ${String(r.saves).padStart(4)} saves` +
      (r.last_save ? `  last ${r.last_save.toISOString()}` : '') +
      (r.published_at ? `  live since ${r.published_at.toISOString()}` : '  NOTHING PUBLISHED') +
      (Number(r.originals) === 1 ? '' : `  ⚠ ${r.originals} original rows`)))
    await c.end()
    return
  }

  const { rows: all } = await c.query(
    `select id, kind, content, saved_at, saved_by, published_at, published_by, length(content) len
       from htw_copy_versions where doc_id = $1 order by id`, [docId])
  await c.end()

  const original = all.find(r => r.kind === 'original')
  const saves = all.filter(r => r.kind === 'save')
  // The same rule as the API: greatest non-null published_at, id breaking any
  // legacy tie. Never "the newest save" — a draft is not what a learner reads.
  const published = all
    .filter(r => r.published_at)
    .sort((a, b) => (b.published_at - a.published_at) || (Number(b.id) - Number(a.id)))[0] || null
  if (!original) {
    console.error(`no original row for doc_id='${docId}' — the document has not been seeded`)
    console.error(`seed it with: node tools/htw-copy/seed-doc.cjs ${docId} <file> <source-ref>`)
    process.exit(1)
  }
  const current = saves.length ? saves[saves.length - 1] : original

  if (has('--history')) {
    all.forEach(r => {
      const isLive = published && Number(published.id) === Number(r.id)
      const mark = isLive ? '● LIVE' : r.published_at ? '  was live' : '        '
      const when = r.kind === 'original' ? 'the frozen original'.padEnd(24) : r.saved_at.toISOString()
      console.log(`${String(r.id).padStart(6)}  ${when}  ${String(r.len).padStart(7)} chars  ${mark}  ${r.saved_by || ''}`)
    })
    if (!published) console.log('\nNothing has ever been published — learners read the words built into the app.')
    return
  }

  // --published answers the question that matters once publishing exists: what
  // has been written that a learner cannot see yet?
  const base = has('--published')
    ? published
    : original
  const baseName = has('--published') ? 'published' : 'original'

  if (has('--published') && !published) {
    console.log(`Nothing has ever been published for '${docId}' — learners read the words built into the app.`)
    console.log(`There ${saves.length === 1 ? 'is' : 'are'} ${saves.length} saved draft${saves.length === 1 ? '' : 's'} waiting.`)
    return
  }

  if (base.content === current.content) {
    console.log(has('--published')
      ? `Nothing waiting — learners are reading exactly the current draft of '${docId}'.`
      : `No edits yet — the current draft of '${docId}' is identical to the original.`)
  } else {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'copydiff-'))
    const a = path.join(dir, `${baseName}.md`)
    const b = path.join(dir, 'draft.md')
    fs.writeFileSync(a, base.content)
    fs.writeFileSync(b, current.content)
    try {
      execFileSync('git', ['diff', '--no-index', '--no-color', '--', a, b], { stdio: 'inherit' })
    } catch { /* git diff exits 1 when files differ — that is the normal path */ }
    fs.rmSync(dir, { recursive: true, force: true })
  }

  console.log(`\ndoc: ${docId}  saves: ${saves.length}` +
    (saves.length ? `  latest: ${current.saved_at.toISOString()} by ${current.saved_by || 'unknown'}` : ''))
  console.log(published
    ? `learners see: version ${published.id}, published ${published.published_at.toISOString()} by ${published.published_by || 'unknown'}` +
      (published.content === current.content ? ' — up to date with the draft' : ' — the draft is ahead')
    : 'learners see: nothing published — the words built into the app')

  if (has('--export')) {
    fs.writeFileSync(exportPath, current.content)
    console.log(`wrote ${path.resolve(exportPath)}`)
  }
})().catch(e => { console.error(e.message); process.exit(1) })
