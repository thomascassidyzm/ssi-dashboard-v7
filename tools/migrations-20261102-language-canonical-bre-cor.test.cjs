// npx vitest run tools/migrations-20261102-language-canonical-bre-cor.test.cjs
// The owner login runs this script, so it must be able to run these three files and nothing else.
import { describe, it, expect } from 'vitest'
import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

const REPO = path.resolve(__dirname, '..')
const RUNNER = path.join(REPO, 'tools/migrations-20261102-language-canonical-bre-cor.sh')
const M = 'database/migrations/20261102_language_canonical_bre_cor'

// A stand-in psql on PATH records what the runner hands it; no database is reached.
function runWithFakePsql(mode) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bre-cor-runner-'))
  const argvLog = path.join(dir, 'argv')
  fs.writeFileSync(path.join(dir, 'psql'), `#!/bin/sh\necho "$@" >> "${argvLog}"\n`, { mode: 0o755 })
  const ownerEnv = path.join(dir, 'owner.env')
  fs.writeFileSync(ownerEnv, 'DATABASE_URL=postgres://owner:s3cret@db.example:5432/postgres\n')
  const r = spawnSync('bash', [RUNNER, mode], {
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, SSI_OWNER_ENV: ownerEnv },
    encoding: 'utf8',
  })
  const argv = fs.existsSync(argvLog) ? fs.readFileSync(argvLog, 'utf8') : ''
  fs.rmSync(dir, { recursive: true, force: true })
  return { status: r.status, argv }
}

describe('language_canonical bre-cor runner', () => {
  it.each([
    ['apply', `${M}.sql`],
    ['verify', `${M}.VERIFY.sql`],
    ['rollback', `${M}.ROLLBACK.sql`],
  ])('%s runs exactly %s and never puts the password on argv', (mode, file) => {
    const { status, argv } = runWithFakePsql(mode)
    expect(status).toBe(0)
    expect(argv.trim()).toBe(`-X -v ON_ERROR_STOP=1 -1 -f ${file}`)
    expect(argv).not.toContain('s3cret')
  })

  it('refuses any other mode without reaching psql', () => {
    const { status, argv } = runWithFakePsql('tables')
    expect(status).toBe(64)
    expect(argv).toBe('')
  })

  it('touches only the two bre/cor rows in every file it can run', () => {
    expect(fs.readFileSync(path.join(REPO, `${M}.sql`), 'utf8')).toMatch(/\('bre','bre'\),\s*\('cor','cor'\)\s*ON CONFLICT DO NOTHING/)
    expect(fs.readFileSync(path.join(REPO, `${M}.ROLLBACK.sql`), 'utf8')).toContain(
      "DELETE FROM language_canonical WHERE (raw, canonical) IN (('bre','bre'), ('cor','cor'));")
    const verify = fs.readFileSync(path.join(REPO, `${M}.VERIFY.sql`), 'utf8').replace(/^--.*$/gm, '')
    expect(verify).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP)\b/i)
  })
})
