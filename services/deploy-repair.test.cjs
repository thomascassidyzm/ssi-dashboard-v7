/**
 * Deploy-repair tests. Real git repos in a temp dir — no mocks, because the whole
 * point of this module is that the git sequence behaves on a messy checkout.
 * Run: npx vitest run services/deploy-repair
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execSync } = require('child_process')
const repair = require('./deploy-repair.cjs')

let root, origin, work

function git(cmd, cwd) {
  return execSync(`git ${cmd}`, { cwd, encoding: 'utf-8' }).trim()
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'repair-test-'))
  origin = path.join(root, 'origin')
  work = path.join(root, 'work')

  fs.mkdirSync(origin)
  git('init -q -b main', origin)
  git('config user.email t@example.com', origin)
  git('config user.name Test', origin)
  fs.writeFileSync(path.join(origin, 'app.js'), 'v1\n')
  fs.writeFileSync(path.join(origin, '.gitignore'), '.env\nlogs/\n')
  git('add -A', origin)
  git('commit -q -m one', origin)

  execSync(`git clone -q ${origin} ${work}`, { encoding: 'utf-8' })
  git('config user.email t@example.com', work)
  git('config user.name Test', work)

  // origin moves ahead — this is what the machine needs to reach
  fs.writeFileSync(path.join(origin, 'app.js'), 'v2\n')
  git('commit -q -am two', origin)
})

afterEach(() => fs.rmSync(root, { recursive: true, force: true }))

/** The Camberley shape: dirty tracked file, untracked file, a stash, a diverged commit. */
function jamTheCheckout() {
  fs.writeFileSync(path.join(work, 'app.js'), 'local mess\n')
  git('stash -q', work)
  fs.writeFileSync(path.join(work, 'app.js'), 'more local mess\n')
  fs.writeFileSync(path.join(work, 'scratch.txt'), 'untracked work\n')
  fs.writeFileSync(path.join(work, '.env'), 'SECRET=keepme\n')
  fs.mkdirSync(path.join(work, 'logs'), { recursive: true })
  fs.writeFileSync(path.join(work, 'logs', 'old.log'), 'keep\n')
  fs.writeFileSync(path.join(work, 'diverged.js'), 'x\n')
  git('add diverged.js', work)
  git('commit -q -m "local-only commit"', work)
}

describe('repair tokens (guardrail 1: fallback only)', () => {
  it('refuses a repair with no token', () => {
    expect(repair.consumeRepairToken(undefined).ok).toBe(false)
  })

  it('accepts a freshly issued token exactly once', () => {
    const t = repair.issueRepairToken('git pull failed')
    expect(repair.hasLiveRepairToken()).toBe(true)
    const first = repair.consumeRepairToken(t)
    expect(first.ok).toBe(true)
    expect(first.reason).toBe('git pull failed')
    expect(repair.consumeRepairToken(t).ok).toBe(false)
  })
})

describe('captureSafetySnapshot (guardrail 3: recoverable)', () => {
  it('captures dirty tracked state, untracked files and a verifiable bundle', () => {
    jamTheCheckout()
    const snap = repair.captureSafetySnapshot(work, { stamp: 'test-1' })

    expect(snap.dirty_files).toBeGreaterThan(0)
    expect(snap.untracked_count).toBe(1) // scratch.txt; .env and logs/ are ignored
    expect(snap.stash_list).toContain('stash@{0}')
    expect(fs.existsSync(path.join(work, snap.bundle))).toBe(true)
    expect(fs.existsSync(path.join(work, snap.untracked_archive))).toBe(true)
    expect(() => git(`bundle verify ${snap.bundle}`, work)).not.toThrow()
    // the snapshot commit really carries the dirty content
    expect(git(`show ${snap.snapshot_commit}:app.js`, work)).toBe('more local mess')
  })

  it('does not disturb the working tree or the stash list', () => {
    jamTheCheckout()
    const before = git('status --porcelain', work)
    const stashesBefore = git('stash list', work)
    repair.captureSafetySnapshot(work, { stamp: 'test-2' })
    expect(git('status --porcelain', work)).toBe(before)
    expect(git('stash list', work)).toBe(stashesBefore)
  })
})

describe('forceResetToOrigin', () => {
  it('reaches origin/main from a checkout that git pull --ff-only cannot fix', () => {
    jamTheCheckout()
    expect(() => execSync('git pull --ff-only 2>&1', { cwd: work })).toThrow()

    repair.captureSafetySnapshot(work, { stamp: 'test-3' })
    const result = repair.forceResetToOrigin(work, { branch: 'main' })

    expect(result.head).toBe(git('rev-parse origin/main', work))
    expect(fs.readFileSync(path.join(work, 'app.js'), 'utf-8')).toBe('v2\n')
    expect(git('status --porcelain', work)).toBe('')
    expect(fs.existsSync(path.join(work, 'diverged.js'))).toBe(false)
  })

  it('keeps ignored files — .env and logs/ survive the repair', () => {
    jamTheCheckout()
    repair.captureSafetySnapshot(work, { stamp: 'test-4' })
    repair.forceResetToOrigin(work, { branch: 'main' })
    expect(fs.readFileSync(path.join(work, '.env'), 'utf-8')).toBe('SECRET=keepme\n')
    expect(fs.existsSync(path.join(work, 'logs', 'old.log'))).toBe(true)
  })

  it('snapshot survives the reset, and the discarded work is restorable from it', () => {
    jamTheCheckout()
    const snap = repair.captureSafetySnapshot(work, { stamp: 'test-5' })
    repair.forceResetToOrigin(work, { branch: 'main' })

    expect(fs.existsSync(path.join(work, snap.bundle))).toBe(true)
    expect(git(`show ${snap.snapshot_commit}:app.js`, work)).toBe('more local mess')
    execSync(`tar xzf ${snap.untracked_archive}`, { cwd: work })
    expect(fs.readFileSync(path.join(work, 'scratch.txt'), 'utf-8')).toBe('untracked work\n')
    expect(git('stash list', work)).toContain('stash@{0}') // pre-existing stashes untouched
  })
})

describe('deploy history (guardrail 4: audit trail)', () => {
  it('appends and reads back newest-first', () => {
    repair.logDeployEvent(work, { action: 'deploy', outcome: 'failed', error: 'pull jammed' })
    repair.logDeployEvent(work, { action: 'repair', outcome: 'success', snapshot_id: 'test-6' })
    const history = repair.readDeployHistory(work, 10)
    expect(history).toHaveLength(2)
    expect(history[0].action).toBe('repair')
    expect(history[0].machine).toBeTruthy()
    expect(history[1].error).toBe('pull jammed')
  })

  it('returns an empty history rather than throwing when nothing is logged yet', () => {
    expect(repair.readDeployHistory(work, 10)).toEqual([])
  })
})
