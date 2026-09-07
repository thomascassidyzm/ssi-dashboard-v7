#!/usr/bin/env node
/**
 * THE SIBLING-IDENTITY CHECK — is any variant byte-identical to its sibling?
 *
 * READ-ONLY. It repairs nothing and it must not: a colliding flow needs the right
 * dialect and register to rewrite, and that is per-case authoring work, not a
 * sweep. This says which rows fail their own definition; who fixes them and how is
 * somebody's ear.
 *
 * ── THE DEFECT ──────────────────────────────────────────────────────────────
 * A variant exists in order to DIFFER from its siblings under the same key. A
 * variant byte-identical to its sibling is not a near-miss or a quality wobble: it
 * fails its own definition. And it fails SILENTLY — the row is well-formed,
 * non-null and correctly counted, so every count-based and null-based audit passes
 * it, and until this check nothing anywhere compared two siblings to each other.
 * (Job #264, cym_s_for_eng:health scenes 8 and 20.)
 *
 * ── WHAT IT DOES NOT ASSERT ─────────────────────────────────────────────────
 * Global uniqueness. A stock phrase reused in another scene, another course or
 * another seed is fine and always will be; the assertion is about siblings under
 * ONE key. See the scope rule and the ordinal rule in register.cjs — that boundary
 * is the difference between a check people keep and a check they switch off.
 *
 * ── HOW IT KNOWS WHERE TO LOOK ──────────────────────────────────────────────
 * derive.cjs asks the live catalogue; register.cjs supplies intent. No table name
 * is written into this file. A shape nobody has ruled on is reported UNKNOWN.
 *
 *   node tools/qa/sibling-identity/check.cjs [--calibrate] [--json FILE] [--quiet]
 *
 * Exit codes: 0 ran (collisions or not — the report is what you read), 2 could not
 * run or could not calibrate.
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../../.env.psql') });
const fs = require('fs');
const { Client } = require('pg');
const { derive } = require('./derive.cjs');
const { classify, MUST_DIFFER, UNKNOWN } = require('./register.cjs');

const q = (s) => `"${String(s).replace(/"/g, '""')}"`;

/** The single-column primary key, so a finding can name the rows a human must open. */
async function pkColumn(client, table) {
  const { rows } = await client.query(`
    select a.attname
    from pg_index ix
    join pg_class t on t.oid = ix.indrelid
    join pg_namespace n on n.oid = t.relnamespace
    join pg_attribute a on a.attrelid = t.oid and a.attnum = any(ix.indkey)
    where n.nspname = 'public' and t.relname = $1 and ix.indisprimary
  `, [table]);
  return rows.length === 1 ? rows[0].attname : null;
}

/**
 * ONE GROUPED SCAN PER ASSERTION. Rows with no content yet (NULL or empty) are not
 * compared at all: an unauthored pair is an authoring gap, not two variants that
 * agree, and conflating them would put every draft pod in the collision list.
 */
function collisionSQL({ table, groupCols, discriminator, fields, alsoGroupBy = [], where = null, pk }, { count = false, limit = 40 } = {}) {
  const group = [...groupCols, ...alsoGroupBy];
  const cols = [...group, ...fields].map(q).join(', ');
  const notEmpty = fields.map((f) => `${q(f)} is not null and btrim(${q(f)}) <> ''`).join(' and ');
  const idAgg = pk ? `array_agg(${q(pk)}::text order by ${q(discriminator)})` : `array_agg(${q(discriminator)}::text)`;
  const filter = `${notEmpty} and ${q(discriminator)} is not null${where ? ` and (${where})` : ''}`;
  if (count) {
    return `select count(*)::int as collisions from (
      select 1 from ${q(table)} where ${filter} group by ${cols} having count(*) > 1) c`;
  }
  return `
    select ${cols}, count(*)::int as siblings, ${idAgg} as ids,
           array_agg(${q(discriminator)}::text order by ${q(discriminator)}) as variants
    from ${q(table)}
    where ${filter}
    group by ${cols}
    having count(*) > 1
    order by count(*) desc
    limit ${limit}`;
}

/** How many sibling groups exist at all, so a zero can be told from "nothing to check". */
function siblingGroupSQL({ table, groupCols, discriminator, alsoGroupBy = [], where = null }) {
  const group = [...groupCols, ...alsoGroupBy].map(q).join(', ');
  return `
    select count(*)::int as groups, coalesce(sum(n), 0)::int as rows_in_groups
    from (select ${group}, count(*)::int as n from ${q(table)}
          where ${q(discriminator)} is not null${where ? ` and (${where})` : ''}
          group by ${group} having count(*) > 1) g`;
}

async function runAssertion(client, cand, fields) {
  const pk = await pkColumn(client, cand.table);
  const spec = { ...cand, fields, pk };
  const counts = (await client.query(siblingGroupSQL(spec))).rows[0];
  const total = (await client.query(collisionSQL(spec, { count: true }))).rows[0].collisions;
  const { rows } = await client.query(collisionSQL(spec, { limit: 40 }));
  return {
    table: cand.table,
    key: cand.key,
    group_by: [...cand.groupCols, ...(cand.alsoGroupBy || [])],
    discriminator: cand.discriminator,
    asserted_fields: fields,
    sibling_groups: counts.groups,
    rows_in_sibling_groups: counts.rows_in_groups,
    collisions: total,
    excluded: cand.where || null,
    examples: rows.map((r) => {
      const key = {};
      for (const c of [...cand.groupCols, ...(cand.alsoGroupBy || [])]) key[c] = r[c];
      const content = {};
      for (const f of fields) content[f] = String(r[f]).slice(0, 160);
      return { key, variants: r.variants, ids: r.ids, siblings: r.siblings, content };
    }),
  };
}

/**
 * CALIBRATION — the known positive, reproduced, or no estate numbers are reported.
 *
 * #264's finding is the specimen: in the canonical `health` walk, scene 8 and scene
 * 20 each carry two flows whose ENGLISH turn is byte-identical. A run of this check
 * that reports the estate clean while those sit in it is a broken check that would
 * then be trusted nightly — worse than no check at all.
 */
const CALIBRATION = {
  table: 'canonical_pod_scenarios',
  field: 'english_text',
  expect_at_least: 2,
  note: '#264: the health walk, scenes 8 and 20 — two flows with the same English turn.',
};

function calibrated(results) {
  const r = results.find((x) => x.table === CALIBRATION.table && x.asserted_fields.includes(CALIBRATION.field));
  if (!r) return { ok: false, why: `the calibration assertion (${CALIBRATION.table}.${CALIBRATION.field}) was not derived at all` };
  const health = r.examples.filter((e) => String(e.key.pod_slug || '').includes('health'));
  if (health.length < CALIBRATION.expect_at_least) {
    return { ok: false, why: `the known positive is no longer visible: expected at least ${CALIBRATION.expect_at_least} health collisions, saw ${health.length}. Either they were repaired (good — retire this calibration) or the check stopped seeing them (bad).` };
  }
  return { ok: true, seen: health.length };
}

async function main(argv = process.argv) {
  const quiet = argv.includes('--quiet');
  const jsonAt = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const candidates = (await derive(client)).map((c) => ({ ...c, ...classify(c) }));
    const results = [];
    for (const c of candidates.filter((x) => x.verdict === MUST_DIFFER)) {
      for (const fields of c.fields) results.push(await runAssertion(client, c, fields));
    }
    const out = {
      generated_at: new Date().toISOString(),
      derived_candidates: candidates.length,
      verdicts: candidates.reduce((a, c) => ({ ...a, [c.verdict]: (a[c.verdict] || 0) + 1 }), {}),
      unknown: candidates.filter((c) => c.verdict === UNKNOWN).map((c) => ({ key: c.key, why: c.why })),
      classification: candidates.map((c) => ({ key: c.key, verdict: c.verdict, by: c.by, why: c.why })),
      assertions: results,
      totals: {
        assertions: results.length,
        sibling_groups: results.reduce((a, r) => a + r.sibling_groups, 0),
        collisions: results.reduce((a, r) => a + r.collisions, 0),
      },
    };
    out.calibration = { ...CALIBRATION, ...calibrated(results) };
    if (jsonAt) fs.writeFileSync(jsonAt, JSON.stringify(out, null, 2));
    if (!quiet) print(out);
    return out;
  } finally {
    await client.end();
  }
}

function print(out) {
  const L = [];
  L.push(`SIBLING-VARIANT IDENTITY — ${out.generated_at}`);
  L.push(`${out.derived_candidates} sibling shapes derived from the live catalogue: `
    + Object.entries(out.verdicts).map(([k, v]) => `${v} ${k}`).join(', '));
  L.push(`calibration: ${out.calibration.ok ? `OK — ${out.calibration.seen} known positives still visible` : `FAILED — ${out.calibration.why}`}`);
  L.push('');
  for (const r of out.assertions) {
    L.push(`${r.table}.${r.asserted_fields.join('+')} by ${r.discriminator} under (${r.group_by.join(', ')})`);
    L.push(`  ${r.sibling_groups} sibling groups (${r.rows_in_sibling_groups} rows) → ${r.collisions} collisions`);
    for (const e of r.examples.slice(0, 8)) {
      L.push(`    ${Object.values(e.key).join(' / ')} — variants ${e.variants.join(', ')} — ${Object.values(e.content)[0]}`);
      L.push(`      ids: ${e.ids.join(', ')}`);
    }
    if (r.collisions > 8) L.push(`    …and ${r.collisions - 8} more (full list in the JSON).`);
    L.push('');
  }
  if (out.unknown.length) {
    L.push(`${out.unknown.length} shape(s) nobody has ruled on — reported, not asserted:`);
    for (const u of out.unknown) L.push(`  ${u.key}`);
  }
  process.stdout.write(L.join('\n') + '\n');
}

if (require.main === module) {
  main().then((o) => process.exit(o.calibration.ok ? 0 : 2)).catch((e) => { console.error(`sibling-identity: ${e.message}`); process.exit(2); });
}

module.exports = { main, collisionSQL, siblingGroupSQL, CALIBRATION, calibrated };
