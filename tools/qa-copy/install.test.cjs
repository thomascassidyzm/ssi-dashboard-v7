/** tools/qa-copy/install.sh — each batch reader's switch lands in the manager that defines the unit (F17a), one job at a time (job #204). */
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const here = path.dirname(new URL(import.meta.url).pathname)

function box() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qacopy-'))
  const home = path.join(root, 'home'), sys = path.join(root, 'sys'), usr = path.join(home, '.config/systemd/user'), bin = path.join(root, 'bin')
  for (const d of [bin, sys, usr]) fs.mkdirSync(d, { recursive: true })
  fs.writeFileSync(path.join(bin, 'systemctl'), '#!/bin/sh\nexit 0\n', { mode: 0o755 })
  // as on watson-1: debut-practice and voice-coverage armed as SYSTEM units, the reconcile, pulse and intel as USER units
  for (const u of ['ssi-debut-practice', 'ssi-voice-coverage']) fs.writeFileSync(path.join(sys, `${u}.service`), '')
  fs.writeFileSync(path.join(sys, 'ssi-voice-coverage.timer'), '')
  for (const u of ['ssi-voice-audit', 'ssi-voices-reconcile', 'cs-ssi-telemetry-pulse', 'ssi-intel-nightly']) fs.writeFileSync(path.join(usr, `${u}.service`), '')
  fs.writeFileSync(path.join(usr, 'ssi-intel-nightly.timer'), '')
  const env = { ...process.env, HOME: home, SYSTEM_UNIT_DIR: sys, USER_UNIT_DIR: usr, SUDO: '', PATH: `${bin}:${process.env.PATH}` }
  const run = (...a) => execFileSync('bash', [path.join(here, 'install.sh'), ...a], { env, encoding: 'utf8' })
  const read = (d, u, kind = 'service') => { const f = path.join(d, `${u}.${kind}.d`, 'qa-copy.conf'); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null }
  return { home, sys, usr, run, read }
}

describe('qa-copy install.sh', () => {
  it('puts each switch in the manager that defines the unit, with a literal env path', () => {
    const b = box()
    b.run()
    expect(b.read(b.sys, 'ssi-debut-practice')).toBe(`[Service]\nEnvironmentFile=-${b.home}/ssi-restore/qa-copy.env\n`)
    expect(b.read(b.usr, 'ssi-voice-audit')).toContain(`EnvironmentFile=-${b.home}/ssi-restore/qa-copy.env`)
    expect(b.read(b.sys, 'ssi-voice-audit')).toBeNull() // no system unit, no orphan drop-in
    expect(b.read(b.usr, 'ssi-debut-practice')).toBeNull()
  })
  it('splits the reconcile (reads on the copy, writes live) and gives day-judging jobs the fresh-only file', () => {
    const b = box()
    b.run()
    const rc = b.read(b.usr, 'ssi-voices-reconcile')
    expect(rc).toContain(`Environment=QA_COPY_ENV=${b.home}/ssi-restore/qa-copy.env`)
    expect(rc).not.toMatch(/EnvironmentFile/) // DATABASE_URL (the write side) must stay live
    expect(b.read(b.usr, 'cs-ssi-telemetry-pulse')).toContain(`Environment=SSI_PULSE_COPY_ENV=${b.home}/ssi-restore/qa-copy-fresh.env`)
    expect(b.read(b.usr, 'ssi-intel-nightly')).toContain(`EnvironmentFile=-${b.home}/ssi-restore/qa-copy-fresh.env`)
    expect(b.read(b.usr, 'ssi-intel-nightly', 'timer')).toMatch(/OnCalendar=\nOnCalendar=\*-\*-\* 04:00:00 UTC/)
    expect(b.read(b.sys, 'ssi-voice-coverage', 'timer')).toMatch(/04:05:00 UTC/)
  })
  it('moves one job at a time, and --off <unit> puts only that one back on live', () => {
    const b = box()
    b.run('ssi-voice-coverage')
    expect(b.read(b.sys, 'ssi-voice-coverage')).not.toBeNull()
    expect(b.read(b.usr, 'ssi-voices-reconcile')).toBeNull()
    b.run('ssi-voices-reconcile')
    b.run('--off', 'ssi-voice-coverage')
    expect(b.read(b.sys, 'ssi-voice-coverage')).toBeNull()
    expect(b.read(b.sys, 'ssi-voice-coverage', 'timer')).toBeNull()
    expect(b.read(b.usr, 'ssi-voices-reconcile')).not.toBeNull()
    b.run('--off')
    expect(b.read(b.usr, 'ssi-voices-reconcile')).toBeNull()
  })
  it('refuses a unit that is not in the table', () => {
    const b = box()
    expect(() => b.run('ssi-round-index')).toThrow()
  })
})
