// Job #914: deleting any courses row failed — forget_recordist_emails() read old.language, a column courses
// does not have. Fix: database/migrations/20260930_forget_recordist_emails_fix.sql.
// One rolled-back transaction, writes nothing. FORGET_INSTALL=rollback installs the pre-fix body
// inside the transaction (how the fail-before half is seen); otherwise the fix migration is applied inside it. Skips without DATABASE_URL.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
function dbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const f = [path.join(__dirname, '../../.env.psql'), '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.psql'].find(fs.existsSync);
  const m = f && fs.readFileSync(f, 'utf8').match(/DATABASE_URL=(.+)/);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}
const url = dbUrl();
let c;
describe.skipIf(!url)('forget_recordist_emails', () => {
  beforeAll(async () => {
    c = new pg.Client({ connectionString: url });
    await c.connect();
    await c.query('BEGIN');
    const f = process.env.FORGET_INSTALL === 'rollback' ? '20260930_forget_recordist_emails_fix.ROLLBACK.sql' : '20260930_forget_recordist_emails_fix.sql';
    await c.query(fs.readFileSync(path.join(__dirname, '../../database/migrations', f), 'utf8'));
  });
  afterAll(async () => { await c.query('ROLLBACK'); await c.end(); });
  it('lets a courses row be deleted, and forgets its vaulted emails', async () => {
    const code = 'zzz_forget914_for_tst';
    await c.query(`INSERT INTO courses (course_code, display_name, known_lang, target_lang) VALUES ($1,'zzz','eng','tst')`, [code]);
    await c.query(`INSERT INTO recordist_emails (source, row_key, path, email) VALUES ('courses',$1,'{x}','a@b.c')`, [code]);
    await c.query('DELETE FROM courses WHERE course_code=$1', [code]);
    const { rows } = await c.query(`SELECT count(*)::int n FROM courses WHERE course_code=$1`, [code]);
    expect(rows[0].n).toBe(0);
    const left = await c.query(`SELECT count(*)::int n FROM recordist_emails WHERE source='courses' AND row_key=$1`, [code]);
    expect(left.rows[0].n).toBe(0);
  });
});
