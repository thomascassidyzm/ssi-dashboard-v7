/**
 * derive.cjs — WHERE ARE THE SIBLINGS? Asked of the live catalogue, never of a list.
 *
 * A sibling set is several rows under one key that exist because they are supposed
 * to be different from each other. In this schema that shape is always written the
 * same way: a COMPOSITE UNIQUE INDEX, where one of its columns is the discriminator
 * (variant_key, position, rank…) and the rest are the key the siblings share.
 * So the enumeration is mechanical — every composite unique index in `public`,
 * every way of dropping one column — and no table name is written down anywhere.
 *
 * Two filters, and both are stated so they can be argued with:
 *
 *   1. THE TABLE MUST CARRY AUTHORED TEXT. A sibling identity collision is only
 *      meaningful where there is authored content to be identical. Detected from
 *      column NAMES (text/template/body/title/note/gloss/target/known/english/…),
 *      not from a table list, so a new content table is caught by existing.
 *   2. THE DISCRIMINATOR MUST NOT ITSELF BE A CONTENT COLUMN. Dropping
 *      `text_normalized` from a clip-identity key produces "do two rows with the
 *      same voice differ in text?" — vacuous, since the differing column IS the
 *      thing being compared.
 *
 * Whether a surviving candidate's siblings are MEANT to differ is not a catalogue
 * question and is not answered here: see register.cjs.
 *
 * Pure SQL in, plain objects out. Read-only, catalogue only, no content scanned.
 */
'use strict';

/** Column names that mean "a human authored this string". */
const CONTENT_NAME_RE = /(^|_)(text|template|body|title|note|notes|gloss|target|known|english|message|subtitle)(_|s|$)/;

const CANDIDATE_SQL = `
with ui as (
  select t.relname as tbl,
         i.relname as idx,
         array(select a.attname
               from unnest(ix.indkey) with ordinality u(k, o)
               join pg_attribute a on a.attrelid = t.oid and a.attnum = u.k
               order by u.o)::text[] as cols
  from pg_index ix
  join pg_class i on i.oid = ix.indexrelid
  join pg_class t on t.oid = ix.indrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and ix.indisunique
    and ix.indpred is null          -- a partial unique index is a rule about a subset, not a sibling key
    and array_length(ix.indkey::int[], 1) >= 2
),
txt as (
  select table_name as tbl, array_agg(column_name order by ordinal_position)::text[] as tcols
  from information_schema.columns
  where table_schema = 'public'
    and data_type in ('text', 'character varying')
    and column_name ~ '(^|_)(text|template|body|title|note|notes|gloss|target|known|english|message|subtitle)(_|s|$)'
  group by 1
)
select ui.tbl, ui.idx, ui.cols, txt.tcols
from ui join txt on txt.tbl = ui.tbl
order by ui.tbl, ui.idx
`;

/**
 * Expand one unique index into candidates: drop each column in turn, the dropped
 * column being the discriminator and the rest the key the siblings share.
 */
function candidatesOfIndex(row) {
  const out = [];
  for (const disc of row.cols) {
    if (CONTENT_NAME_RE.test(disc)) continue;          // filter 2
    const groupCols = row.cols.filter((c) => c !== disc);
    if (!groupCols.length) continue;
    out.push({ table: row.tbl, index: row.idx, groupCols, discriminator: disc, contentCols: row.tcols });
  }
  return out;
}

async function derive(client) {
  const { rows } = await client.query(CANDIDATE_SQL);
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    for (const c of candidatesOfIndex(r)) {
      const k = `${c.table}::${[...c.groupCols].sort().join(',')}::${c.discriminator}`;
      if (seen.has(k)) continue;   // two indexes can express the same sibling shape
      seen.add(k);
      out.push(c);
    }
  }
  return out;
}

module.exports = { derive, candidatesOfIndex, CANDIDATE_SQL, CONTENT_NAME_RE };
