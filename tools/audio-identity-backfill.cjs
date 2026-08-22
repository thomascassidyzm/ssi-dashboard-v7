#!/usr/bin/env node
/**
 * audio-identity-backfill — rewrite existing course_audio rows to the canonical
 * spelling of (language, voice_id).
 *
 *   node tools/audio-identity-backfill.cjs                 # DRY RUN (default)
 *   node tools/audio-identity-backfill.cjs --apply         # write
 *   node tools/audio-identity-backfill.cjs --limit 500     # a slice, for a shakedown
 *
 * Canonical forms: services/shared/clip-identity.cjs.
 * Plan and approval: docs/audio-clip-identity-canonicalisation-2026-08-06.md.
 *
 * WHAT IT WILL AND WILL NOT DO
 *
 * It rewrites two text columns. It never touches `s3_key`, never deletes a row,
 * never deletes an object, and never generates audio. Every clip that exists
 * before it runs exists after it, pointing at the same bytes.
 *
 * It deliberately SKIPS three buckets and reports them rather than guessing:
 *   · rows whose value cannot be canonicalised at all ('auto', 'legacy_import',
 *     an opaque voice id with no known provider) — those need a code fix or a
 *     decision, not a rewrite;
 *   · rows whose canonical form would COLLIDE with an existing row on
 *     unique_course_audio_per_voice (course_code, text_normalized, language,
 *     role, voice_id). On 2026-08-06 there were 2,578 such groups covering
 *     5,168 rows, and in every one of them the two rows point at DIFFERENT S3
 *     objects — they are the double renders. Both are valid audio; picking a
 *     winner is a link decision for a human, so this tool logs them and moves on.
 *
 * SAFETY, the same shape the ZUT sweeps used:
 *   · dry run by default, and `--apply` is the only way to write;
 *   · every update carries its own before-state in the WHERE clause, so a row
 *     that moved under us is skipped rather than clobbered;
 *   · one row per statement, batched in transactions, resumable;
 *   · every row written to scripts/audio-identity-backfill-{dryrun,applied}-log.json
 *     (scripts/ is the gitignored workspace — the plan runs to hundreds of
 *     thousands of rows and does not belong in the repo).
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const {
  tryCanonicalLanguage,
  tryCanonicalVoiceId,
} = require('../services/shared/clip-identity.cjs');

const REPO = path.join(__dirname, '..');
const BATCH = 500;

function databaseUrl() {
  const p = path.join(REPO, '.env.psql');
  if (!fs.existsSync(p)) {
    throw new Error('.env.psql not found at the repo root — see docs/secrets-vault.md §Provisioning');
  }
  return fs.readFileSync(p, 'utf8').match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)[1].trim();
}

const n = (x) => Number(x).toLocaleString('en-GB');

async function main() {
  const apply = process.argv.includes('--apply');
  const limIdx = process.argv.indexOf('--limit');
  const limit = limIdx > -1 ? Number(process.argv[limIdx + 1]) : null;

  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();

  // Only rows that are not already canonical can need work. Pull them with the
  // four columns the unique key needs so collisions can be detected up front.
  const { rows: candidates } = await client.query(
    `SELECT id, course_code, text_normalized, role, language, voice_id
       FROM course_audio
      WHERE language !~ '^[a-z]{3}$'
         OR NOT (voice_id ~ '^(azure|xai|elevenlabs|google|narakeet|human)_.' OR voice_id ~ '^comp:')
      ORDER BY id
      ${limit ? `LIMIT ${Number(limit)}` : ''}`
  );

  // The set of keys that already exist, so a rewrite that would collide is
  // detected before it is attempted rather than as a constraint error.
  const { rows: existing } = await client.query(
    `SELECT course_code, text_normalized, language, role, voice_id FROM course_audio`
  );
  const keyOf = (r) => [r.course_code, r.text_normalized, r.language, r.role, r.voice_id].join('');
  const taken = new Set(existing.map(keyOf));

  const plan = [], unresolvable = [], collisions = [];
  for (const row of candidates) {
    const language = tryCanonicalLanguage(row.language);
    const voice_id = tryCanonicalVoiceId(row.voice_id);
    if (!language || !voice_id) {
      unresolvable.push({ ...row, why: !language ? 'language' : 'voice_id' });
      continue;
    }
    if (language === row.language && voice_id === row.voice_id) continue;
    const after = keyOf({ ...row, language, voice_id });
    if (taken.has(after)) {
      collisions.push({ ...row, to_language: language, to_voice_id: voice_id });
      continue;
    }
    taken.delete(keyOf(row));
    taken.add(after);
    plan.push({ ...row, to_language: language, to_voice_id: voice_id });
  }

  console.log(`\ncandidates            ${n(candidates.length)}`);
  console.log(`  rewritable          ${n(plan.length)}`);
  console.log(`  collide, SKIPPED    ${n(collisions.length)}   (both rows are valid audio — a human picks the winner)`);
  console.log(`  unresolvable, SKIPPED ${n(unresolvable.length)}\n`);

  let written = 0, drifted = 0;
  if (apply) {
    for (let i = 0; i < plan.length; i += BATCH) {
      const batch = plan.slice(i, i + BATCH);
      await client.query('BEGIN');
      try {
        for (const r of batch) {
          // before-state in the WHERE: a row that changed under us is skipped.
          const res = await client.query(
            `UPDATE course_audio SET language = $1, voice_id = $2
              WHERE id = $3 AND language = $4 AND voice_id = $5`,
            [r.to_language, r.to_voice_id, r.id, r.language, r.voice_id]
          );
          if (res.rowCount === 1) written++;
          else { drifted++; r.skipped = 'row moved under us'; }
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
      console.log(`  ${n(Math.min(i + BATCH, plan.length))} / ${n(plan.length)}`);
    }
    console.log(`\nwritten ${n(written)}, skipped-on-drift ${n(drifted)}\n`);
  } else {
    console.log('DRY RUN — nothing written. Re-run with --apply.\n');
    for (const r of plan.slice(0, 10)) {
      console.log(`  ${r.course_code} ${r.role}  ${r.language} -> ${r.to_language}   ${r.voice_id} -> ${r.to_voice_id}`);
    }
    if (plan.length > 10) console.log(`  … and ${n(plan.length - 10)} more\n`);
  }

  const logPath = path.join(REPO, 'scripts', `audio-identity-backfill-${apply ? 'applied' : 'dryrun'}-log.json`);
  fs.writeFileSync(
    logPath,
    JSON.stringify(
      { at: new Date().toISOString(), apply, written, drifted, plan, collisions, unresolvable },
      null,
      2
    )
  );
  console.log(`log: ${logPath}\n`);

  await client.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(2);
});
