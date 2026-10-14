/**
 * cast_voice_role against the REAL database (job #266). Skipped without .env.psql.
 * (1) guide rank ignores gender: casting female B onto guide rank 0 held by male A must swap, not hit
 *     voice_language_roles_one_guide_per_rank. Runs in a transaction that is ROLLED BACK.
 * (2) opposite concurrent swaps must not deadlock (advisory lock before any SELECT). Uses a throwaway
 *     language code picked per run (nobody holds it), deletes only that code, and refuses the live host (#270).
 */
import { describe, it, expect } from 'vitest'
import { spawnSync, spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
import guard from './db-test-guard.cjs'

function dbUrl () {
  for (const p of [path.join(__dirname, '../../.env.psql'), path.join(process.env.HOME || '', 'ssi-dashboard-v7-clean/.env.psql')]) {
    try { const m = fs.readFileSync(p, 'utf8').match(/DATABASE_URL=(.*)/); if (m) return m[1].replace(/^["']|["']$/g, '').trim() } catch {}
  }
  return null
}
const URL_ = dbUrl()
const psql = (sql) => spawnSync('psql', [URL_, '-v', 'ON_ERROR_STOP=1', '-At', '-c', sql], { encoding: 'utf8' })
const d = URL_ ? describe : describe.skip
// The concurrency test WRITES and DELETES rows; on the live project it only runs on a human's say-so (#270).
const dw = URL_ && !guard.refusesLiveHost(URL_) ? describe : describe.skip

d('cast_voice_role (live DB)', () => {
  it('guide: female onto a rank held by a male swaps instead of tripping one_guide_per_rank', () => {
    const script = `
BEGIN;
DO $$
DECLARE a text; b text; r jsonb; g text;
BEGIN
  SELECT voice_id INTO a FROM voices ORDER BY voice_id LIMIT 1;
  SELECT voice_id INTO b FROM voices ORDER BY voice_id OFFSET 1 LIMIT 1;
  INSERT INTO voice_language_roles(slot,language,gender,rank,voice_id) VALUES ('guide','zzt','m',0,a);
  INSERT INTO voice_language_roles(slot,language,gender,rank,voice_id) VALUES ('guide','zzt','f',1,b);
  r := cast_voice_role('guide','zzt','f',0,b,'n','test');
  IF (r->>'swapped')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'not swapped %', r; END IF;
  SELECT gender INTO g FROM voice_language_roles WHERE slot='guide' AND language='zzt' AND rank=1 AND voice_id=a;
  IF g IS DISTINCT FROM 'm' THEN RAISE EXCEPTION 'displaced voice lost its gender: %', g; END IF;
END $$;
ROLLBACK;`
    const r = spawnSync('psql', [URL_, '-v', 'ON_ERROR_STOP=1', '-q'], { input: script, encoding: 'utf8' })
    expect(r.stderr).toBe('')
    expect(r.status).toBe(0)
  })

})

dw('cast_voice_role concurrency (writes rows)', () => {
  it('opposite concurrent swaps do not deadlock', async () => {
    // A code nobody holds, so the cleanup below can only ever delete rows this test made.
    const L = guard.pickScratchLanguage((c) => Number(psql(`SELECT count(*) FROM voice_language_roles WHERE language='${c}'`).stdout.trim()) > 0)
    const ids = psql(`SELECT voice_id FROM voices ORDER BY voice_id LIMIT 2`).stdout.trim().split('\n')
    try {
    psql(`INSERT INTO voice_language_roles(slot,language,gender,rank,voice_id) VALUES ('phrase','${L}','f',0,'${ids[0]}'),('phrase','${L}','f',1,'${ids[1]}')`)
    // A casts ids[0] to rank 1, B casts ids[1] to rank 0: opposite lock order without the advisory lock.
    const loop = (v, rank) => `for i in $(seq 1 60); do psql '${URL_}' -q -At -c "select cast_voice_role('phrase','${L}','f',${rank},'${v}','n','t')" >/dev/null || echo FAIL; done`
    const run = (cmd) => new Promise((res) => { let out = ''; const p = spawn('bash', ['-c', cmd]); p.stderr.on('data', (x) => { out += x }); p.stdout.on('data', (x) => { out += x }); p.on('close', () => res(out)) })
    const [e1, e2] = await Promise.all([run(loop(ids[0], 1)), run(loop(ids[1], 0))])
    expect(e1 + e2).not.toMatch(/deadlock/i)
    expect(e1 + e2).not.toMatch(/FAIL/)
    } finally { psql(`DELETE FROM voice_language_roles WHERE language='${L}'`) }
  }, 120000)
})
