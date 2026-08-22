#!/usr/bin/env node
/**
 * Adds publication to the append-only copy store, idempotently.
 *
 *   node tools/htw-copy/setup-publish.cjs
 *
 * Nothing here rewrites history: setup-table.cjs still creates the table as it
 * always did, and this script only adds two nullable columns beside it.
 *
 *   published_at timestamptz  — when this exact row was made the live text
 *   published_by text         — who made it live
 *
 * The live text for a doc is the row with the greatest non-null published_at
 * for that doc_id. Publishing stamps a row; rolling back stamps an older row,
 * which then becomes the newest published. Content is never copied, edited or
 * deleted, so every version stays diffable and every publish stays attributable.
 *
 * Safe to re-run: add column / create index are both `if not exists`, and the
 * schema reload at the end is what makes PostgREST (and therefore the API) see
 * the new columns at all.
 */
const fs = require('fs'), path = require('path')
const { Client } = require('pg')

const envPath = path.join(__dirname, '../../.env.psql')
if (!fs.existsSync(envPath)) {
  console.error(`No .env.psql at ${envPath} — this machine has not been provisioned with DATABASE_URL. See docs/secrets-vault.md.`)
  process.exit(1)
}
const url = (fs.readFileSync(envPath, 'utf8').match(/DATABASE_URL=(.*)/) || [])[1].trim()

const DDL = `
alter table public.htw_copy_versions
  add column if not exists published_at timestamptz,
  add column if not exists published_by text;

-- The live-text lookup: newest non-null published_at for a doc. Partial, because
-- the only rows this index ever has to answer for are the published ones.
create index if not exists htw_copy_versions_doc_published_idx
  on public.htw_copy_versions (doc_id, published_at desc)
  where published_at is not null;

notify pgrst, 'reload schema';
`

;(async () => {
  const c = new Client({ connectionString: url })
  await c.connect()
  await c.query(DDL)

  const { rows: cols } = await c.query(`
    select column_name, data_type, is_nullable
      from information_schema.columns
     where table_schema = 'public' and table_name = 'htw_copy_versions'
     order by ordinal_position`)
  const { rows: counts } = await c.query(`
    select doc_id,
           count(*) filter (where kind = 'original')                as originals,
           count(*) filter (where kind = 'save')                    as saves,
           count(*) filter (where published_at is not null)         as published,
           max(published_at)                                        as live_since
      from public.htw_copy_versions
     group by doc_id order by doc_id`)

  console.log('columns:', cols.map(c => `${c.column_name} ${c.data_type}${c.is_nullable === 'YES' ? '' : ' not null'}`).join(', '))
  console.log('per doc:', JSON.stringify(counts, null, 2))
  await c.end()
})().catch(e => { console.error(e.message); process.exit(1) })
