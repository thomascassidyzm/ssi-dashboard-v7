/** tools/qa-copy/refresh.sh step 7 — a failed env switch must not drop the copy that is still serving (F17b). */
import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const here = path.dirname(new URL(import.meta.url).pathname)

describe('qa-copy refresh.sh switch', () => {
  it('fails and drops nothing but the new copy when the env file cannot be written', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qarefresh-'))
    const pgbin = path.join(root, 'pg'), log = path.join(root, 'calls.log')
    fs.mkdirSync(pgbin)
    for (const c of ['psql', 'dropdb']) fs.writeFileSync(path.join(pgbin, c), `#!/bin/sh\necho "${c} $*" >> ${log}\n[ ${c} = psql ] && [ "$1" = -At ] && echo ssi_copy_old\nexit 0\n`, { mode: 0o755 })
    const src = fs.readFileSync(path.join(here, 'refresh.sh'), 'utf8')
    const step7 = src.slice(src.indexOf('# 7.'))
    const script = `HERE=${here}; PGBIN=${pgbin}; NEWDB=ssi_copy_new; SERVING=ssi_copy_old; KEY=k; SOCK=s; PORT=1; PGUSER_COPY=u; TODAY=t; COUNTS=""
ENVFILE=${root}/missing-dir/qa-copy.env; STATE=${root}/state.json
fail() { echo "FAILED: $1" >&2; [ "$NEWDB" != "$SERVING" ] && "$PGBIN/dropdb" --if-exists "$NEWDB"; exit 1; }
${step7}`
    const r = spawnSync('bash', ['-c', script], { encoding: 'utf8' })
    const calls = fs.readFileSync(log, 'utf8')
    expect(r.status).not.toBe(0)
    expect(r.stderr).toMatch(/FAILED: switching/)
    expect(calls).not.toMatch(/dropdb .*ssi_copy_old/)
  })
})
