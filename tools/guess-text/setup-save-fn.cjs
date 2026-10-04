#!/usr/bin/env node
/**
 * One-off: create public.guess_text_save, the atomic save for the /guess text editor.
 * Supersede the item's live row and insert the new live one in ONE transaction (a plpgsql function
 * body is one), so a crash between the two can never leave an item with no live text.
 *   node tools/guess-text/setup-save-fn.cjs
 *
 * POSTURE: security definer, EXECUTE revoked from anon/authenticated/public — new functions arrive
 * grant-open in this estate. Only the service role (api/guess-text.js) can call it.
 */
const fs = require('fs'), path = require('path')
const { Client } = require('pg')
const url = (fs.readFileSync(path.join(__dirname, '../../.env.psql'), 'utf8').match(/DATABASE_URL=(.*)/) || [])[1].trim()

const DDL = `
create or replace function public.guess_text_save(p_known text, p_kind text, p_item text, p_content text, p_who text)
returns table (id bigint, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  update guess_text_items set state = 'superseded'
   where known_lang = p_known and kind = p_kind and item_id = p_item and state = 'live';
  return query
    insert into guess_text_items (known_lang, kind, item_id, content, state, source, edited_by, approved_by, approved_at)
    values (p_known, p_kind, p_item, p_content, 'live', 'editor', p_who, p_who, now())
    returning guess_text_items.id, guess_text_items.created_at;
end $$;
revoke all on function public.guess_text_save(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.guess_text_save(text, text, text, text, text) to service_role;
notify pgrst, 'reload schema';
`
;(async () => {
  const c = new Client({ connectionString: url })
  await c.connect()
  await c.query(DDL)
  const g = await c.query("select grantee from information_schema.routine_privileges where routine_name='guess_text_save' and grantee in ('anon','authenticated','PUBLIC')")
  console.log('execute grants to anon/authenticated/public:', JSON.stringify(g.rows))
  await c.end()
  if (g.rows.length) { console.error('GRANTS REMAIN — fix before use'); process.exit(1) }
})().catch(e => { console.error(e.message); process.exit(1) })
