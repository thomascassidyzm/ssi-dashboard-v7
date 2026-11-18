/*
 * The bug this fixes: the old tick compared HEAD to origin/main and did
 * nothing once they matched — so a restart that failed stayed failed forever,
 * with production silently stale. These are the pure decision functions that
 * replace it: what to restart, and when the "fully deployed" marker is
 * allowed to advance. Kept pure (no git, no systemd, no network) so the fix
 * is provable without a live checkout.
 *
 * Run: npx vitest run tools/deploy/auto-deploy-prod.test.cjs
 */
import { describe, it, expect } from 'vitest'

const { allActive, unitsToRestart, nextDeployedSha, restartDecision } = require('./auto-deploy-prod.cjs')

const A = 'popty-production-api'
const B = 'popty-course-builder-api'
const C = 'popty-phase8-audio'

describe('allActive', () => {
  it('is true only when every unit is up', () => {
    expect(allActive({ [A]: true, [B]: true, [C]: true })).toBe(true)
    expect(allActive({ [A]: true, [B]: false, [C]: true })).toBe(false)
    expect(allActive({})).toBe(true)
  })
})

describe('unitsToRestart — the retry-on-failure fix', () => {
  it('restarts nothing when HEAD matches the marker and every unit is already active', () => {
    const active = { [A]: true, [B]: true, [C]: true }
    expect(unitsToRestart('sha1', 'sha1', active)).toEqual([])
  })

  it('THE BUG: a unit that failed last tick and is still down gets retried, even with no new commit', () => {
    const active = { [A]: true, [B]: false, [C]: true }
    expect(unitsToRestart('sha1', 'sha1', active)).toEqual([B])
  })

  it('restarts every unit on a fresh HEAD, even ones already active (they are running the OLD code)', () => {
    const active = { [A]: true, [B]: true, [C]: true }
    expect(unitsToRestart('sha2', 'sha1', active)).toEqual([A, B, C])
  })

  it('treats a null marker (first-ever tick) as a fresh deploy — restart everything', () => {
    const active = { [A]: false, [B]: false, [C]: false }
    expect(unitsToRestart('sha1', null, active)).toEqual([A, B, C])
  })
})

describe('nextDeployedSha — the marker only advances once everything is healthy', () => {
  it('advances to HEAD when every unit came up', () => {
    expect(nextDeployedSha('sha2', 'sha1', { [A]: true, [B]: true, [C]: true })).toBe('sha2')
  })

  it('stays at the old marker when a restart failed — so next tick retries instead of forgetting', () => {
    expect(nextDeployedSha('sha2', 'sha1', { [A]: true, [B]: false, [C]: true })).toBe('sha1')
  })

  it('stays null if the very first deploy never got everything healthy', () => {
    expect(nextDeployedSha('sha1', null, { [A]: true, [B]: false, [C]: true })).toBe(null)
  })

  it('sequential ticks: fails once, then recovers on retry without a new commit', () => {
    let marker = 'sha1'
    const activeTick2 = { [A]: true, [B]: false, [C]: true } // B down
    marker = nextDeployedSha('sha2', marker, activeTick2)
    expect(marker).toBe('sha1') // did not advance — B still down

    // Next tick, no new commit, but the marker never advanced past sha1 (B
    // never came up) — so this HEAD still reads as "not fully deployed" and
    // every unit is retried, not just B. Safe (restarting a healthy unit is
    // harmless) and simpler than tracking per-unit deploy state.
    expect(unitsToRestart('sha2', marker, activeTick2)).toEqual([A, B, C])

    const activeTick3 = { [A]: true, [B]: true, [C]: true } // B recovered
    marker = nextDeployedSha('sha2', marker, activeTick3)
    expect(marker).toBe('sha2') // now it advances
  })
})

describe('restartDecision — restart only when server-side code can have changed (job #255)', () => {
  it('skips evidence-only, SPA-only, test-only and docs-only merges', () => {
    expect(restartDecision(['public/evidence/x/a.mp3', 'public/evidence/x/index.html']).restart).toBe(false)
    expect(restartDecision(['src/views/Foo.vue', 'e2e/a.mjs', 'docs/DECISIONS.md']).restart).toBe(false)
    expect(restartDecision(['services/foo.test.cjs']).restart).toBe(false)
    expect(restartDecision(['tools/course-optimization/deu-x-2026-10-16.cjs']).restart).toBe(false)
  })
  it('restarts for server code, deps, config read at boot, and anything unknown', () => {
    for (const f of ['services/production-api.cjs', 'package-lock.json', 'package.json', 'automation.config.json',
      'docs/pair-contracts/fra_for_eng.contract.cjs', 'public/vfs/canonical/voices.json', 'src/explainer/pack.json',
      'SYSTEM.md', 'ops/systemd/popty-production-api.service', 'tools/lib/unit-scope.cjs', '.env.example', 'brand-new-dir/x']) {
      expect(restartDecision(['public/evidence/a.png', f]).restart, f).toBe(true)
    }
  })
  it('one server file among static ones is enough; empty diff skips', () => {
    expect(restartDecision(['src/a.vue', 'services/x.cjs']).restart).toBe(true)
    expect(restartDecision([]).restart).toBe(false)
  })
  it('a static deploy retries only down units; a server deploy restarts all', () => {
    const up = { [A]: true, [B]: true, [C]: true }
    expect(unitsToRestart('s2', 's1', up, false)).toEqual([])
    expect(unitsToRestart('s2', 's1', { ...up, [B]: false }, false)).toEqual([B])
    expect(unitsToRestart('s2', 's1', up, true)).toEqual([A, B, C])
  })
})

/*
 * Job #96: restart only the units a change touches. A fake tree stands in for
 * the repo; each unit's graph is DERIVED from its entry point, and narrowing
 * happens only on proof — every doubt restarts all three.
 */
const { graphOf, unitsFor } = require('./unit-restart-set.cjs')

function fakeTree (files) {
  const readFile = (rel) => (rel in files ? files[rel] : null)
  const listDir = (rel) => {
    const p = rel.replace(/\/$/, '') + '/'
    const kids = Object.keys(files).filter((f) => f.startsWith(p))
    return kids.length ? kids : null
  }
  return { readFile, listDir }
}
const TREE = {
  'tools/check-service-syntax.cjs': 'const vm = require("vm")',
  'services/production-api.cjs': 'require("./shared/common.cjs"); require("./prod-only.cjs"); const x = fs.readFileSync("SYSTEM.md")',
  'services/course-builder-api.cjs': 'require("./shared/common.cjs"); require("./course-builder/lib/validation.cjs")',
  'services/course-builder/lib/validation.cjs': 'try { require(`../../../docs/pair-contracts/${code}.contract.cjs`) } catch {}',
  'services/phases/phase8-audio-v13.cjs': 'require("../shared/common.cjs")',
  'services/shared/common.cjs': 'module.exports = 1',
  'services/prod-only.cjs': 'module.exports = 2',
  'docs/pair-contracts/fra_for_eng.contract.cjs': 'module.exports = {}',
  'SYSTEM.md': '# doc',
}
function graphsOf (tree) {
  const { readFile, listDir } = fakeTree(tree)
  return {
    [A]: graphOf({ readFile, listDir, entries: ['services/production-api.cjs', 'tools/check-service-syntax.cjs'] }),
    [B]: graphOf({ readFile, listDir, entries: ['services/course-builder-api.cjs', 'tools/check-service-syntax.cjs'] }),
    [C]: graphOf({ readFile, listDir, entries: ['services/phases/phase8-audio-v13.cjs', 'tools/check-service-syntax.cjs'] }),
  }
}

describe('restartDecision with unit graphs — restart only the units a change touches (job #96)', () => {
  const graphs = graphsOf(TREE)
  it('derives each unit graph from its entry point, syntax gate included', () => {
    expect(graphs[B].loaded.has('services/course-builder/lib/validation.cjs')).toBe(true)
    expect(graphs[A].loaded.has('services/course-builder/lib/validation.cjs')).toBe(false)
    for (const u of [A, B, C]) expect(graphs[u].loaded.has('tools/check-service-syntax.cjs')).toBe(true)
    for (const u of [A, B, C]) expect(graphs[u].unresolved).toEqual([])
  })
  it('THE CHANGE: a module only the course builder loads restarts only the course builder', () => {
    const d = restartDecision(['services/course-builder/lib/validation.cjs'], graphs)
    expect(d.restart).toBe(true)
    expect(d.units).toEqual([B])
    expect(d.reason).toMatch(/spared popty-production-api, popty-phase8-audio/)
    // and the old answer, with no graphs, is still every unit
    expect(restartDecision(['services/course-builder/lib/validation.cjs']).units).toEqual([A, B, C])
  })
  it('a shared module restarts each unit holding it', () => {
    expect(restartDecision(['services/shared/common.cjs'], graphs).units).toEqual([A, B, C])
    expect(restartDecision(['services/prod-only.cjs'], graphs).units).toEqual([A])
  })
  it('a template-literal require pulls in the whole directory it names', () => {
    expect(restartDecision(['docs/pair-contracts/fra_for_eng.contract.cjs'], graphs).units).toEqual([B])
  })
  it('a file a unit reads by path (not require) restarts that unit', () => {
    expect(restartDecision(['SYSTEM.md'], graphs).units).toEqual([A])
  })
  it('an unplaceable path — deleted, renamed, or simply unknown — restarts all', () => {
    for (const f of ['services/gone-since-this-commit.cjs', 'brand-new-dir/x.cjs', 'prompts/never-named.md']) {
      expect(restartDecision([f], graphs).units, f).toEqual([A, B, C])
      expect(restartDecision([f], graphs).reason, f).toMatch(/cannot be placed/)
    }
  })
  it('package.json, the lockfile, env files and ops/systemd restart all', () => {
    for (const f of ['package.json', 'package-lock.json', '.env', '.env.example', 'ops/systemd/popty-user/popty-production-api.service']) {
      expect(restartDecision([f], graphs).units, f).toEqual([A, B, C])
    }
  })
  it('static paths still restart nothing, graphs or not', () => {
    expect(restartDecision(['src/views/Foo.vue', 'services/x.test.cjs'], graphs)).toMatchObject({ restart: false, units: [] })
  })
  it('a unit whose walk met an unfollowable require is never spared', () => {
    const g = graphsOf({ ...TREE, 'services/phases/phase8-audio-v13.cjs': 'require("../shared/common.cjs"); const m = require(IMPL)' })
    expect(g[C].unresolved.length).toBe(1)
    expect(restartDecision(['services/prod-only.cjs'], g).units).toEqual([A, C])
    // and path.join(VAR, "file.cjs") whose literal part names nothing is the same doubt
    const g2 = graphsOf({ ...TREE, 'services/prod-only.cjs': 'require(path.join(LANE, "ledger.cjs"))' })
    expect(g2[A].unresolved.length).toBe(1)
    // while path.join(__dirname, "./x") with a real target is followed, not doubted
    const g3 = graphsOf({ ...TREE, 'services/prod-only.cjs': 'require(path.join(__dirname, "./shared/common.cjs"))' })
    expect(g3[A].unresolved).toEqual([])
  })
  it('a narrowed deploy still retries a spared unit that is down', () => {
    expect(unitsToRestart('s2', 's1', { [A]: true, [B]: true, [C]: true }, [B])).toEqual([B])
    expect(unitsToRestart('s2', 's1', { [A]: false, [B]: true, [C]: true }, [B])).toEqual([A, B])
    expect(unitsToRestart('s2', 's1', { [A]: true, [B]: true, [C]: true }, [])).toEqual([])
  })
})
