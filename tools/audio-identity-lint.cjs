#!/usr/bin/env node
/**
 * audio-identity-lint — read-only census of clip-identity spelling drift.
 *
 * The content-addressed design keys a clip on (language, text_normalized,
 * voice_id). This tool answers the only question that makes that key work:
 * *is every stored row already spelt the one canonical way?* It writes nothing
 * and touches no S3 object — run it as often as you like.
 *
 *   node tools/audio-identity-lint.cjs              # summary
 *   node tools/audio-identity-lint.cjs --detail     # every non-canonical value
 *   node tools/audio-identity-lint.cjs --json out.json
 *
 * Canonical forms and the reasoning behind them: services/shared/clip-identity.cjs.
 * Needs DATABASE_URL from .env.psql at the repo root (see docs/secrets-vault.md).
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const {
  tryCanonicalLanguage,
  tryCanonicalVoiceId,
} = require('../services/shared/clip-identity.cjs');

const REPO = path.join(__dirname, '..');

function databaseUrl() {
  const p = path.join(REPO, '.env.psql');
  if (!fs.existsSync(p)) {
    throw new Error('.env.psql not found at the repo root — see docs/secrets-vault.md §Provisioning');
  }
  const m = fs.readFileSync(p, 'utf8').match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
  if (!m) throw new Error('.env.psql has no DATABASE_URL');
  return m[1].trim();
}

const n = (x) => Number(x).toLocaleString('en-GB');

async function main() {
  const detail = process.argv.includes('--detail');
  const jsonIdx = process.argv.indexOf('--json');
  const jsonPath = jsonIdx > -1 ? process.argv[jsonIdx + 1] : null;

  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();

  const langs = (await client.query(
    'select language, count(*)::bigint n from course_audio group by 1 order by 2 desc'
  )).rows;
  const voices = (await client.query(
    'select voice_id, count(*)::bigint n from course_audio group by 1 order by 2 desc'
  )).rows;
  const total = langs.reduce((s, r) => s + Number(r.n), 0);

  const classify = (rows, key, fn) => {
    const clean = [], drifted = [], unresolvable = [];
    for (const r of rows) {
      const value = r[key];
      const canonical = fn(value);
      const entry = { value, canonical, rows: Number(r.n) };
      if (canonical === null) unresolvable.push(entry);
      else if (canonical === value) clean.push(entry);
      else drifted.push(entry);
    }
    return { clean, drifted, unresolvable };
  };

  const L = classify(langs, 'language', tryCanonicalLanguage);
  const V = classify(voices, 'voice_id', tryCanonicalVoiceId);

  // How many identities the drift is currently splitting: build the canonical
  // key in SQL from a values() map so the whole table is grouped server-side.
  const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
  const mapOf = (rows, key, fn) =>
    rows.map((r) => `(${lit(r[key])},${lit(fn(r[key]) ?? r[key])})`).join(',');

  const { rows: [split] } = await client.query(`
    with lm(raw,can) as (values ${mapOf(langs, 'language', tryCanonicalLanguage)}),
         vm(raw,can) as (values ${mapOf(voices, 'voice_id', tryCanonicalVoiceId)}),
         j as (
           select lm.can lang, a.text_normalized t, vm.can v, a.language rawl, a.voice_id rawv
           from course_audio a join lm on lm.raw = a.language join vm on vm.raw = a.voice_id
         ),
         g as (
           select lang, t, v, count(distinct rawl) nl, count(distinct rawv) nv, count(*) rows
           from j group by 1,2,3
         )
    select (select count(*) from (select distinct language,text_normalized,voice_id from course_audio) x)::bigint identities_raw,
           (select count(*) from g)::bigint identities_canonical,
           count(*) filter (where nl>1 or nv>1)::bigint split_identities,
           coalesce(sum(rows) filter (where nl>1 or nv>1),0)::bigint rows_in_split,
           count(*) filter (where nl>1)::bigint split_by_language,
           count(*) filter (where nv>1)::bigint split_by_voice
    from g`);

  const sum = (a) => a.reduce((s, e) => s + e.rows, 0);
  const report = {
    generated_for_rows: total,
    language: {
      canonical_values: L.clean.length, canonical_rows: sum(L.clean),
      drifted_values: L.drifted.length, drifted_rows: sum(L.drifted),
      unresolvable_values: L.unresolvable.length, unresolvable_rows: sum(L.unresolvable),
      drifted: L.drifted, unresolvable: L.unresolvable,
    },
    voice: {
      canonical_values: V.clean.length, canonical_rows: sum(V.clean),
      drifted_values: V.drifted.length, drifted_rows: sum(V.drifted),
      unresolvable_values: V.unresolvable.length, unresolvable_rows: sum(V.unresolvable),
      drifted: V.drifted, unresolvable: V.unresolvable,
    },
    identities: {
      raw: Number(split.identities_raw),
      canonical: Number(split.identities_canonical),
      merged_by_canonicalising: Number(split.identities_raw) - Number(split.identities_canonical),
      split_identities: Number(split.split_identities),
      rows_in_split_identities: Number(split.rows_in_split),
      split_by_language: Number(split.split_by_language),
      split_by_voice: Number(split.split_by_voice),
    },
  };

  console.log(`\ncourse_audio — ${n(total)} rows\n`);
  for (const [name, r] of [['language', report.language], ['voice_id', report.voice]]) {
    console.log(`${name}`);
    console.log(`  already canonical   ${String(r.canonical_values).padStart(4)} values  ${n(r.canonical_rows).padStart(11)} rows`);
    console.log(`  drifted spelling    ${String(r.drifted_values).padStart(4)} values  ${n(r.drifted_rows).padStart(11)} rows`);
    console.log(`  UNRESOLVABLE        ${String(r.unresolvable_values).padStart(4)} values  ${n(r.unresolvable_rows).padStart(11)} rows`);
    if (detail) {
      for (const e of r.drifted) console.log(`      ${e.value}  ->  ${e.canonical}   (${n(e.rows)} rows)`);
      for (const e of r.unresolvable) console.log(`      ${e.value}  ->  ???          (${n(e.rows)} rows)`);
    }
    console.log('');
  }
  const i = report.identities;
  console.log('identities');
  console.log(`  as spelt today       ${n(i.raw)}`);
  console.log(`  canonicalised        ${n(i.canonical)}   (${n(i.merged_by_canonicalising)} merge)`);
  console.log(`  split by spelling    ${n(i.split_identities)} identities across ${n(i.rows_in_split_identities)} rows`);
  console.log(`     by language       ${n(i.split_by_language)}`);
  console.log(`     by voice          ${n(i.split_by_voice)}\n`);

  if (jsonPath) {
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`wrote ${jsonPath}\n`);
  }

  await client.end();
  // Non-zero when anything is unresolvable: that bucket needs a human, not a script.
  process.exit(report.language.unresolvable_values + report.voice.unresolvable_values > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(2);
});
