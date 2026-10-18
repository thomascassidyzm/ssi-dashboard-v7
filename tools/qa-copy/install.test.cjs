/** tools/qa-copy/install.sh — the QA units are SYSTEM units, so their drop-ins must land in the system unit dir (F17a). */
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const here = path.dirname(new URL(import.meta.url).pathname)

describe('qa-copy install.sh', () => {
  it('writes the drop-ins to the system unit dir, not the user one, with a literal env path', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qacopy-'))
    const home = path.join(root, 'home'), sys = path.join(root, 'sys'), bin = path.join(root, 'bin')
    fs.mkdirSync(bin); fs.writeFileSync(path.join(bin, 'systemctl'), '#!/bin/sh\nexit 0\n', { mode: 0o755 })
    const env = { ...process.env, HOME: home, SYSTEM_UNIT_DIR: sys, SUDO: '', PATH: `${bin}:${process.env.PATH}` }
    execFileSync('bash', [path.join(here, 'install.sh')], { env })
    const conf = fs.readFileSync(path.join(sys, 'ssi-voice-audit.service.d', 'qa-copy.conf'), 'utf8')
    expect(conf).toContain(`EnvironmentFile=-${home}/ssi-restore/qa-copy.env`)
    expect(conf).not.toMatch(/ssi-qa-copy-pg|%h/)
    expect(fs.existsSync(path.join(home, '.config/systemd/user/ssi-voice-audit.service.d'))).toBe(false)
    execFileSync('bash', [path.join(here, 'install.sh'), '--off'], { env })
    expect(fs.existsSync(path.join(sys, 'ssi-voice-audit.service.d', 'qa-copy.conf'))).toBe(false)
  })
})
