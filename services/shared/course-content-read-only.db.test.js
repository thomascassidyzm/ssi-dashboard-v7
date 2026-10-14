// Job #388: courses change only through Popty (Tom's standing ruling). The agent login in .env.psql
// (agent_script) may READ every course-content table and is refused every write to them, by trigger
// zz_refuse_agent_course_write — database/migrations/20261014_agent_script_course_content_read_only.sql.
// Each write is a zero-row statement (`WHERE false`), so the test changes nothing even if the lock is
// missing; a statement-level trigger still fires on zero rows. Skips when no agent login is provisioned.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import pg from 'pg';

const AGENT_ENV = process.env.AGENT_DB_ENV || `${process.env.HOME}/.config/ssi-db/agent.env`;
const url = fs.existsSync(AGENT_ENV) && (fs.readFileSync(AGENT_ENV, 'utf8').match(/^DATABASE_URL=(.+)$/m) || [])[1];
export const LOCKED = ['course_audio', 'course_seeds', 'course_legos', 'course_practice_phrases', 'course_gender_expansions', 'courses'];

describe.skipIf(!url)('agent_script is read-only on course content', () => {
  let c;
  beforeAll(async () => { c = new pg.Client({ connectionString: url.trim() }); await c.connect(); });
  afterAll(async () => { await c?.end(); });

  for (const t of LOCKED) {
    it(`${t}: SELECT allowed, UPDATE and DELETE refused`, async () => {
      await expect(c.query(`SELECT 1 FROM ${t} LIMIT 1`)).resolves.toBeTruthy();
      const col = (await c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND is_generated = 'NEVER' ORDER BY ordinal_position LIMIT 1`, [t])).rows[0].column_name;
      await expect(c.query(`UPDATE ${t} SET ${col} = ${col} WHERE false`)).rejects.toThrow(/COURSE_CONTENT_READ_ONLY/);
      await expect(c.query(`DELETE FROM ${t} WHERE false`)).rejects.toThrow(/COURSE_CONTENT_READ_ONLY/);
    });
  }

  it('SET ROLE service_role does not lift the lock', async () => {
    await c.query('SET ROLE service_role');
    try { await expect(c.query('UPDATE course_audio SET id = id WHERE false')).rejects.toThrow(/COURSE_CONTENT_READ_ONLY/); }
    finally { await c.query('RESET ROLE'); }
  });
});
