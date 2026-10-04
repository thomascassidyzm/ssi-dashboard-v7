#!/usr/bin/env node
/**
 * One-off: create public.guess_text_items, the canonical home of the /guess game's text
 * (reveal lines, Read more notes, place notes). Minimal additive create-table, nothing else.
 *   node tools/guess-text/setup-table.cjs
 *
 * POSTURE: RLS on with no policies, AND every grant to anon/authenticated revoked. The estate
 * has been burnt by new tables arriving grant-open to anon (default privileges), so the revoke
 * is explicit and the script prints the grants it finds afterwards. Only the service role
 * (the api/ handlers) ever touches this table; drafts are unreachable from a browser.
 */
const fs = require('fs'), path = require('path')
const { Client } = require('pg')

const url = (fs.readFileSync(path.join(__dirname, '../../.env.psql'), 'utf8').match(/DATABASE_URL=(.*)/) || [])[1].trim()

const DDL = `
create table if not exists public.guess_text_items (
  id bigserial primary key,
  known_lang text not null,                       -- the KNOWN language the text is written in ('eng' first)
  kind text not null check (kind in ('tell','pair','place_note','place_where')),
  item_id text not null,                          -- stable: language key, 'a|b' pair, or place key (guessData ids)
  content text not null,
  state text not null check (state in ('live','draft','superseded')),
  source text not null default 'editor',          -- seed-live | seed-draft | editor
  edited_by text,
  created_at timestamptz not null default now(),
  approved_by text,
  approved_at timestamptz
);
create unique index if not exists guess_text_one_live  on public.guess_text_items (known_lang, kind, item_id) where state = 'live';
create unique index if not exists guess_text_one_draft on public.guess_text_items (known_lang, kind, item_id) where state = 'draft';
alter table public.guess_text_items enable row level security;
revoke all on table public.guess_text_items from anon, authenticated, public;
revoke all on sequence public.guess_text_items_id_seq from anon, authenticated, public;
notify pgrst, 'reload schema';
`

;(async () => {
  const c = new Client({ connectionString: url })
  await c.connect()
  await c.query(DDL)
  const g = await c.query("select grantee, privilege_type from information_schema.role_table_grants where table_name='guess_text_items' and grantee in ('anon','authenticated','PUBLIC')")
  const r = await c.query("select relrowsecurity from pg_class where relname='guess_text_items'")
  console.log('grants to anon/authenticated/public:', JSON.stringify(g.rows), 'rls:', r.rows[0].relrowsecurity)
  await c.end()
  if (g.rows.length) { console.error('GRANTS REMAIN — fix before use'); process.exit(1) }
})().catch(e => { console.error(e.message); process.exit(1) })
