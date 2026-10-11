/**
 * cast_voice_role v2 fixed the gender-blind unique index for slot='guide' only; voice_language_roles_one_presentation_per_rank
 * is the same (language, rank) index and presentation is still found by gender. Skipped without .env.psql. ROLLED BACK.
 */
import { describe, it, expect } from 'vitest'
import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
function dbUrl () {
  for (const p of [path.join(__dirname, '../../.env.psql'), path.join(process.env.HOME || '', 'SSi/ssi-dashboard-v7-clean/.env.psql')]) {
    try { const m = fs.readFileSync(p, 'utf8').match(/DATABASE_URL=(.*)/); if (m) return m[1].replace(/^["']|["']$/g, '').trim() } catch {}
  }
  return null
}
const URL_ = dbUrl()
const d = URL_ ? describe : describe.skip
d('cast_voice_role presentation slot (live DB)', () => {
  it('female onto a presentation rank held by a male must not trip one_presentation_per_rank', () => {
    const script = `
BEGIN;
DO $$
DECLARE a text; b text;
BEGIN
  SELECT voice_id INTO a FROM voices ORDER BY voice_id LIMIT 1;
  SELECT voice_id INTO b FROM voices ORDER BY voice_id OFFSET 1 LIMIT 1;
  INSERT INTO voice_language_roles(slot,language,gender,rank,voice_id) VALUES ('presentation','zzt','m',0,a);
  PERFORM cast_voice_role('presentation','zzt','f',0,b,'n','test');
END $$;
ROLLBACK;`
    const r = spawnSync('psql', [URL_, '-v', 'ON_ERROR_STOP=1', '-q'], { input: script, encoding: 'utf8' })
    expect(r.stderr).not.toMatch(/one_presentation_per_rank|already exists/)
    expect(r.status).toBe(0)
  })
})
