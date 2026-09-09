#!/usr/bin/env node
// tools/gle-lego-reorder-2026-09-09.cjs
//
// Reorder the LEGOs inside named gle_for_eng seeds, live.
//
// WHY THIS EXISTS AT ALL. Inside a seed, `lego_index` IS the teaching order —
// there is no separate ordering column, and `lego_id` is a GENERATED column
// built from (seed_number, lego_index). So "teach these chunks in a different
// order" is a renumbering, and a renumbering re-labels every lego_id in the
// seed. Everything that names a lego by id has to move in the same breath:
//   * course_practice_phrases.lego_index AND its text id (`…:S0146L01B01`),
//   * every decomposition tile ANYWHERE in the course whose `legoId` names one
//     of these legos — 3,391 tiles in 1,944 phrases when this was written,
//   * course_qa_flags.phrase_id, which is a plain FK with no ON UPDATE CASCADE.
// Miss any of them and the tiles quietly point at a different chunk. That is
// why this runs as ONE transaction and not as a sequence of hand edits.
//
// WHAT IT DELIBERATELY DOES NOT TOUCH.
//   * No text is changed, so the audio-nulling triggers
//     (trg_null_lego_audio_on_text_change / trg_null_phrase_audio_on_text_change,
//     both gated on known_text/target_text) never fire and no clip is orphaned.
//   * Learner state (lego_progress, lego_introductions, learner_lego_metrics,
//     learner_l1_state) is keyed by lego_id and is NOT remapped here. See
//     --learner-map, which prints the remap SQL for a human to run; that is a
//     learner-data write and belongs to whoever owns the migration decision.
//
// Editor identity is mandatory (Tom's ruling, 2026-09-01): one
// content_edit_events row per seed, and every row this touches carries its id.
//
//   node tools/gle-lego-reorder-2026-09-09.cjs --dry-run
//   node tools/gle-lego-reorder-2026-09-09.cjs --apply
//   node tools/gle-lego-reorder-2026-09-09.cjs --learner-map

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { serviceIdentity } = require('../services/shared/editor-identity.cjs');
const { assertIdentity } = require('../services/shared/content-edit-log.cjs');

const COURSE = 'gle_for_eng';
const SURFACE = 'tools/gle-lego-reorder-2026-09-09.cjs';
const OPERATION = 'lego-reorder';

// new order, as OLD lego_index values in their NEW sequence.
// Chosen per seed by: (1) every LEGO must be practisable from what is available
// at its position, then (2) leave the fewest existing phrases reaching forward,
// then (3) move as few legos as possible. Seeds whose best order IS the current
// order are absent from this map on purpose.
const PLAN = {
  2:   [2, 1],
  53:  [1, 3, 5, 4, 2],
  78:  [3, 2, 1],
  85:  [3, 2, 4, 1],
  89:  [1, 2, 6, 4, 5, 3],
  110: [1, 2, 5, 4, 6, 3],
  112: [2, 3, 5, 4, 1],
  134: [1, 3, 4, 2],
  146: [2, 3, 4, 5, 6, 1],
  181: [1, 3, 4, 5, 2],
  190: [2, 3, 4, 1],
  234: [2, 3, 4, 5, 1],
  279: [2, 1],
  288: [1, 3, 2],
};

const legoId = (seed, idx) => `S${String(seed).padStart(4, '0')}L${String(idx).padStart(2, '0')}`;

/** old lego_index -> new lego_index, from a plan entry. Exported for the test. */
function indexMap(perm) {
  const m = new Map();
  perm.forEach((oldIdx, i) => m.set(oldIdx, i + 1));
  return m;
}

/** Every lego_id rename this plan implies, across all seeds. */
function legoIdRenames(plan = PLAN) {
  const out = new Map();
  for (const [seed, perm] of Object.entries(plan)) {
    for (const [oldIdx, newIdx] of indexMap(perm)) {
      if (oldIdx !== newIdx) out.set(legoId(Number(seed), oldIdx), legoId(Number(seed), newIdx));
    }
  }
  return out;
}

function databaseUrl() {
  const envPath = path.join(__dirname, '..', '.env.psql');
  const line = fs.readFileSync(envPath, 'utf8').split('\n').find((l) => l.startsWith('DATABASE_URL='));
  if (!line) throw new Error('.env.psql has no DATABASE_URL');
  return line.slice('DATABASE_URL='.length).trim();
}

async function main() {
  const apply = process.argv.includes('--apply');
  const learnerMap = process.argv.includes('--learner-map');

  if (learnerMap) {
    // The remap that would keep each learner's per-chunk state attached to the
    // chunk it was earned on. Printed, never run: learner data is not ours.
    const pairs = [...legoIdRenames()].map(([o, n]) => `('${o}','${n}')`).join(',\n    ');
    console.log(`-- run inside one transaction, AFTER the reorder has landed
WITH m(old_id, new_id) AS (VALUES
    ${pairs})
UPDATE lego_progress p SET lego_id = m.new_id FROM m
 WHERE p.course_id = '${COURSE}' AND p.lego_id = m.old_id;
-- and the same shape for lego_introductions (course_code), learner_lego_metrics, learner_l1_state`);
    return;
  }

  const identity = serviceIdentity('gle-lego-reorder-2026-09-09', { role: 'content-editor' });
  assertIdentity(identity);

  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  try {
    await client.query('BEGIN');

    // course_practice_phrases -> course_legos on (course_code, seed_number,
    // lego_index) is a plain, NOT-DEFERRABLE composite FK, so there is no
    // moment during a renumbering when both sides are consistent: park the
    // legos and the phrases dangle, park the phrases and they point at nothing.
    // The constraint comes off for the length of the transaction and goes back
    // on before commit, which re-validates every row — a rollback restores it
    // untouched, so the only way out of here is with the FK in place.
    const FK = `ALTER TABLE course_practice_phrases
      ADD CONSTRAINT fk_course_practice_phrases_lego
      FOREIGN KEY (course_code, seed_number, lego_index)
      REFERENCES course_legos(course_code, seed_number, lego_index)`;
    await client.query('ALTER TABLE course_practice_phrases DROP CONSTRAINT fk_course_practice_phrases_lego');

    const renames = legoIdRenames();
    const summary = [];

    // course_qa_flags.phrase_id is a plain FK with no ON UPDATE CASCADE, so the
    // rows have to let go of the id, watch it change, and take the new one.
    const seeds = Object.keys(PLAN).map(Number);
    const flagRows = (await client.query(
      `SELECT f.id, f.phrase_id, p.seed_number, p.lego_index, substr(f.phrase_id, 21) AS suffix
         FROM course_qa_flags f JOIN course_practice_phrases p ON p.id = f.phrase_id
        WHERE f.course_code=$1 AND p.seed_number = ANY($2)`,
      [COURSE, seeds],
    )).rows;
    if (flagRows.length) {
      await client.query('UPDATE course_qa_flags SET phrase_id=NULL WHERE id = ANY($1)', [flagRows.map((r) => r.id)]);
    }

    for (const [seedStr, perm] of Object.entries(PLAN)) {
      const seed = Number(seedStr);
      const map = indexMap(perm);

      const before = (await client.query(
        'SELECT lego_index, lego_id, known_text FROM course_legos WHERE course_code=$1 AND seed_number=$2 ORDER BY lego_index',
        [COURSE, seed],
      )).rows;
      const live = before.map((r) => r.lego_index).sort((a, b) => a - b);
      const planned = [...perm].sort((a, b) => a - b);
      if (JSON.stringify(live) !== JSON.stringify(planned)) {
        throw new Error(`seed ${seed}: live lego_index set ${live} does not match the plan's ${planned} — the DB moved under this plan, refusing`);
      }

      const eventId = (await client.query(
        `INSERT INTO content_edit_events
           (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [COURSE, SURFACE, OPERATION, identity.kind, identity.id, identity.label, identity.verified, identity.role,
          JSON.stringify({ seed_numbers: [seed], lego_ids: before.map((r) => r.lego_id), rows: before.length }),
          JSON.stringify({
            reason: 'bucket-1 within-seed LEGO reorder, approved by Kai 2026-09-09',
            before: before.map((r) => ({ lego_index: r.lego_index, known_text: r.known_text })),
            new_order_as_old_indexes: perm,
          })],
      )).rows[0].id;

      // ── legos: park out of the way of the (course, seed, lego_index) unique key
      await client.query(
        'UPDATE course_legos SET lego_index = lego_index + 50 WHERE course_code=$1 AND seed_number=$2',
        [COURSE, seed],
      );
      for (const [oldIdx, newIdx] of map) {
        await client.query(
          'UPDATE course_legos SET lego_index=$3, last_edit_event_id=$4 WHERE course_code=$1 AND seed_number=$2 AND lego_index=$5',
          [COURSE, seed, newIdx, eventId, oldIdx + 50],
        );
      }

      // ── phrases: lego_index AND the text id, which embeds the lego_id
      await client.query(
        `UPDATE course_practice_phrases
            SET lego_index = lego_index + 50, id = id || '#tmp'
          WHERE course_code=$1 AND seed_number=$2`,
        [COURSE, seed],
      );
      for (const [oldIdx, newIdx] of map) {
        await client.query(
          `UPDATE course_practice_phrases
              SET lego_index = $3,
                  id = $1 || ':' || $6 || replace(substr(id, 21), '#tmp', ''),
                  last_edit_event_id = $4
            WHERE course_code=$1 AND seed_number=$2 AND lego_index=$5`,
          [COURSE, seed, newIdx, eventId, oldIdx + 50, legoId(seed, newIdx)],
        );
      }

      summary.push({ seed, order: perm, legos: before.length });
    }

    for (const f of flagRows) {
      const newIdx = indexMap(PLAN[f.seed_number]).get(f.lego_index);
      await client.query('UPDATE course_qa_flags SET phrase_id=$2 WHERE id=$1',
        [f.id, `${COURSE}:${legoId(f.seed_number, newIdx)}${f.suffix}`]);
    }

    // ── decomposition tiles course-wide: a legoId that named one of these
    //    chunks must follow the chunk, not the slot.
    const affected = (await client.query(
      'SELECT id, decomposition FROM course_practice_phrases WHERE course_code=$1 AND decomposition IS NOT NULL',
      [COURSE],
    )).rows;
    let tiles = 0; let phrases = 0;
    for (const row of affected) {
      let touched = false;
      const next = row.decomposition.map((t) => {
        if (t && t.legoId && renames.has(t.legoId)) { touched = true; tiles += 1; return { ...t, legoId: renames.get(t.legoId) }; }
        return t;
      });
      if (!touched) continue;
      phrases += 1;
      await client.query('UPDATE course_practice_phrases SET decomposition=$2 WHERE id=$1', [row.id, JSON.stringify(next)]);
    }

    await client.query(FK);

    console.log(JSON.stringify({ seeds: summary.length, detail: summary, decomposition: { phrases, tiles } }, null, 2));

    if (apply) {
      await client.query('COMMIT');
      // course_round_index is what round-map.ts reads; CONCURRENTLY cannot run
      // inside a transaction, so it follows the commit.
      await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index');
      console.log('COMMITTED, course_round_index refreshed');
    } else {
      await client.query('ROLLBACK');
      console.log('DRY RUN — rolled back');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
module.exports = { PLAN, indexMap, legoIdRenames, legoId };
