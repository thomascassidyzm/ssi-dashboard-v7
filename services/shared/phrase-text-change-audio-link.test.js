// Job #893: a text change must keep an audio link the writer set in the SAME UPDATE
// (null_phrase_audio_on_text_change / null_seed_audio_on_text_change), and still
// unlink on a text-only change. Runs against the live DB inside a rolled-back
// transaction, so it writes nothing. Skips when no DATABASE_URL.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';
const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function dbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const f = [path.join(__dirname, '../../.env.psql'), '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.psql'].find(fs.existsSync);
  const m = f && fs.readFileSync(f, 'utf8').match(/DATABASE_URL=(.+)/);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}
const url = dbUrl();

async function inRolledBack(fn) {
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    await c.query('BEGIN');
    return await fn(c);
  } finally {
    await c.query('ROLLBACK').catch(() => {});
    await c.end();
  }
}

// table -> row-picker. Each returns {id, course_code, audioA (current), audioB (a different clip)}
const CASES = {
  course_practice_phrases: `SELECT p.id, p.course_code, p.target1_audio_id AS a,
      (SELECT id FROM course_audio b WHERE b.course_code = p.course_code AND b.id <> p.target1_audio_id LIMIT 1) AS b
      FROM course_practice_phrases p WHERE p.target1_audio_id IS NOT NULL LIMIT 1`,
  course_seeds: `SELECT p.id, p.course_code, p.target1_audio_id AS a,
      (SELECT id FROM course_audio b WHERE b.course_code = p.course_code AND b.id <> p.target1_audio_id LIMIT 1) AS b
      FROM course_seeds p WHERE p.target1_audio_id IS NOT NULL LIMIT 1`,
};

describe.skipIf(!url)('text change vs audio link set in the same UPDATE', () => {
  for (const [table, pick] of Object.entries(CASES)) {
    it(`${table}: text + audio in one UPDATE keeps the new audio`, async () => {
      await inRolledBack(async (c) => {
        const { rows: [r] } = await c.query(pick);
        const { rows: [after] } = await c.query(
          `UPDATE ${table} SET target_text = target_text || ' zzz893 ' || md5(random()::text), target1_audio_id = $2
           WHERE id = $1 RETURNING target1_audio_id`, [r.id, r.b]);
        expect(after.target1_audio_id).toBe(r.b);
      });
    });

    it(`${table}: text-only change still unlinks a stale clip`, async () => {
      await inRolledBack(async (c) => {
        const { rows: [r] } = await c.query(pick);
        const { rows: [after] } = await c.query(
          `UPDATE ${table} SET target_text = target_text || ' zzz893 ' || md5(random()::text)
           WHERE id = $1 RETURNING target1_audio_id`, [r.id]);
        expect(after.target1_audio_id).not.toBe(r.a);
      });
    });
  }
});
