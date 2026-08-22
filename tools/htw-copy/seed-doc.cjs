#!/usr/bin/env node
/**
 * Seed a copy surface into the append-only store, byte-identically from a file.
 *
 *   node tools/htw-copy/seed-doc.cjs <doc-id> <path-to-file> "<source-ref>"
 *
 * Writes one kind='original' row (the frozen baseline the diff is taken against)
 * and one matching kind='save' row so the editor has something to open.
 *
 * REFUSES to run if the doc already has an original row. That row is the frozen
 * baseline of a document someone may be part-way through editing; it is never
 * overwritten and never dropped. To re-seed, a human deletes it deliberately.
 *
 * The doc id must already be registered in api/lib/copy-docs.js, otherwise the
 * page and the API will not serve it.
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { Client } = require('pg')

const REPO = path.join(__dirname, '../..')
const url = (fs.readFileSync(path.join(REPO, '.env.psql'), 'utf8')
  .match(/DATABASE_URL=(.*)/) || [])[1].trim()

const [docId, file, sourceRef] = process.argv.slice(2)
if (!docId || !file) {
  console.error('usage: node tools/htw-copy/seed-doc.cjs <doc-id> <path-to-file> "<source-ref>"')
  process.exit(1)
}

const registry = fs.readFileSync(path.join(REPO, 'api/lib/copy-docs.js'), 'utf8')
if (!registry.includes(`id: '${docId}'`)) {
  console.error(`'${docId}' is not registered in api/lib/copy-docs.js — add it there first`)
  process.exit(1)
}

const content = fs.readFileSync(file, 'utf8')
const md5 = crypto.createHash('md5').update(content).digest('hex')

;(async () => {
  const c = new Client({ connectionString: url })
  await c.connect()

  const { rows: existing } = await c.query(
    "select count(*)::int n from htw_copy_versions where doc_id = $1 and kind = 'original'", [docId])
  if (existing[0].n > 0) {
    console.error(`'${docId}' already has an original row — refusing to touch a frozen baseline`)
    await c.end()
    process.exit(1)
  }

  const by = `seed ${sourceRef || path.basename(file)}`
  await c.query('begin')
  await c.query(
    "insert into htw_copy_versions (doc_id, kind, content, saved_by) values ($1,'original',$2,$3)",
    [docId, content, by])
  await c.query(
    "insert into htw_copy_versions (doc_id, kind, content, saved_by) values ($1,'save',$2,$3)",
    [docId, content, by])
  await c.query('commit')

  const { rows } = await c.query(
    'select kind, md5(content) m, length(content) l from htw_copy_versions where doc_id = $1 order by id', [docId])
  await c.end()

  console.log(`seeded ${docId} from ${file}`)
  console.log(`file md5 ${md5}`)
  rows.forEach(r => console.log(`  ${r.kind.padEnd(9)} md5 ${r.m}  ${r.l} chars`))
  if (rows.some(r => r.m !== md5)) { console.error('MISMATCH — stored content differs from the file'); process.exit(1) }
  console.log('byte-identical ✓')
})().catch(e => { console.error(e.message); process.exit(1) })
