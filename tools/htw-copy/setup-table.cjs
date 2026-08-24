#!/usr/bin/env node
/**
 * One-off: create the htw_copy_versions table (append-only store behind /htw-copy).
 * Posture per CLAUDE.md rule 7: RLS ON with no policies = service-role-only.
 *   node tools/htw-copy/setup-table.cjs
 */
const fs = require('fs'), path = require('path')
const { Client } = require('pg')

const envPath = path.join(__dirname, '../../.env.psql')
const url = (fs.readFileSync(envPath, 'utf8').match(/DATABASE_URL=(.*)/) || [])[1].trim()

const DDL = `
create table if not exists public.htw_copy_versions (
  id bigserial primary key,
  doc_id text not null default 'htw',
  kind text not null check (kind in ('original','save')),
  content text not null,
  saved_by text,
  saved_at timestamptz not null default now()
);
create index if not exists htw_copy_versions_doc_saved_idx
  on public.htw_copy_versions (doc_id, saved_at desc);
alter table public.htw_copy_versions enable row level security;
notify pgrst, 'reload schema';
`

;(async () => {
  const c = new Client({ connectionString: url })
  await c.connect()
  await c.query(DDL)
  const { rows } = await c.query(
    "select kind, count(*) from public.htw_copy_versions group by kind")
  console.log('ok', JSON.stringify(rows))
  await c.end()
})().catch(e => { console.error(e.message); process.exit(1) })
