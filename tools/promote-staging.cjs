#!/usr/bin/env node
'use strict'
/**
 * THE DAILY PROMOTION: staging (origin/deploy/staging) -> main, fast-forward only.
 *
 * Tom, 2026-10-02: Popty has community users now, so Popty workers land on deploy/staging
 * (browsable at staging.popty.app) and main moves only here, once a day, when
 *   1. the nightly booth-artists-day check was GREEN for exactly the staging SHA being promoted
 *      (e2e/booth-artists-day/run.sh appends the verdict, so a stale or missing one holds), and
 *   2. no commit between main and staging touches the community builder journey
 *      (tools/staging-promotion/journey-paths.cjs) — those are HELD for Tom's look on staging;
 *      `node tools/promote-staging.cjs --approve` records his look for the current staging SHA.
 * Anything else (red, stale, diverged, journey) HOLDS and says why in one plain line to Watson.
 * It never force-pushes: the push is `<sha>:refs/heads/main` without +, so git itself refuses a
 * non-fast-forward.
 *
 *   node tools/promote-staging.cjs [--dry-run] [--no-notice] [--repo <dir>] [--approve]
 *
 * NB staging shares the LIVE Supabase with production: staging is for reviewing CODE, not for
 * data isolation (see vite.config.js PREVIEW_BACKENDS).
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { isJourneyPath } = require('./staging-promotion/journey-paths.cjs')

const STAGING_BRANCH = 'deploy/staging'
const VERDICT_MAX_AGE_MS = 36 * 3600 * 1000 // the nightly runs every ~24h; a day-and-a-half-old green is stale
const ROOT = process.env.SSI_EVIDENCE_ROOT || path.join(os.homedir(), 'ssi-evidence', 'ssi-dashboard-v7')
const VERDICTS = path.join(ROOT, 'e2e', 'booth-artists-day', 'verdicts.jsonl')
const STATE = path.join(ROOT, 'ops', 'staging-promotion-state.json') // last hold announced + Tom's approval

/** Pure decision. verdict = {sha, rc, at} | null; approvedSha = SHA Tom has looked at | null. */
function decide({ mainSha, stagingSha, mainIsAncestor, changedFiles, verdict, approvedSha, now }) {
  if (mainSha === stagingSha) return { action: 'noop', reason: 'staging and main are the same commit — nothing to promote' }
  if (!mainIsAncestor) {
    return { action: 'hold', kind: 'diverged', reason: 'main has commits staging does not — staging needs main merged into it before anything can be promoted' }
  }
  const short = stagingSha.slice(0, 8)
  if (!verdict || verdict.sha !== stagingSha) {
    return { action: 'hold', kind: 'no-verdict', reason: `the booth check has not run on staging ${short} yet` }
  }
  if (verdict.rc !== 0) return { action: 'hold', kind: 'red', reason: `the booth check was RED on staging ${short}` }
  if (now - Date.parse(verdict.at) > VERDICT_MAX_AGE_MS) {
    return { action: 'hold', kind: 'stale', reason: `the green booth check for staging ${short} is more than 36 hours old` }
  }
  const journey = changedFiles.filter(isJourneyPath)
  if (journey.length && approvedSha !== stagingSha) {
    return { action: 'hold', kind: 'journey', journey, reason: `the change touches the community builder journey (${journey.slice(0, 5).join(', ')}${journey.length > 5 ? ', …' : ''}) — waiting for Tom's look on staging.popty.app` }
  }
  return { action: 'promote', reason: journey.length ? `Tom approved ${short}` : 'green booth check, no journey files' }
}

function lastVerdict(sha) {
  let lines = []
  try { lines = fs.readFileSync(VERDICTS, 'utf8').trim().split('\n') } catch { return null }
  for (let i = lines.length - 1; i >= 0; i--) {
    try { const v = JSON.parse(lines[i]); if (v.sha === sha) return v } catch { /* skip a torn line */ }
  }
  return null
}
const readState = () => { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')) } catch { return {} } }
const writeState = (s) => { fs.mkdirSync(path.dirname(STATE), { recursive: true }); fs.writeFileSync(STATE, JSON.stringify(s, null, 2)) }

async function notifyHold(text, state) {
  try {
    const r = await fetch((process.env.CS_SURFACE || 'http://localhost:4317') + '/api/needs-you', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Popty staging promotion held', text, needs: 'Tom' }),
    })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return true
  } catch (e) { console.error(`notice FAILED (${e.message}): ${text}`); return false }
}

async function main() {
  const args = process.argv.slice(2)
  const flag = (f) => args.includes(f)
  const repo = args.includes('--repo') ? args[args.indexOf('--repo') + 1] : path.join(os.homedir(), 'wt-staging')
  const git = (...a) => execFileSync('git', a, { cwd: repo, encoding: 'utf8' }).trim()
  git('fetch', '-q', 'origin', 'main', STAGING_BRANCH)
  const mainSha = git('rev-parse', 'origin/main')
  const stagingSha = git('rev-parse', `origin/${STAGING_BRANCH}`)
  if (flag('--approve')) {
    writeState({ ...readState(), approvedSha: stagingSha, approvedAt: new Date().toISOString() })
    console.log(`approved staging ${stagingSha.slice(0, 8)} for promotion despite journey files`)
    return 0
  }
  let mainIsAncestor = true
  try { git('merge-base', '--is-ancestor', mainSha, stagingSha) } catch { mainIsAncestor = false }
  const changedFiles = mainIsAncestor ? git('diff', '--name-only', `${mainSha}..${stagingSha}`).split('\n').filter(Boolean) : []
  const state = readState()
  const d = decide({ mainSha, stagingSha, mainIsAncestor, changedFiles, verdict: lastVerdict(stagingSha), approvedSha: state.approvedSha || null, now: Date.now() })
  console.log(`${new Date().toISOString()} ${d.action.toUpperCase()}: ${d.reason}`)
  if (d.action === 'hold' && !flag('--no-notice') && !flag('--dry-run')) {
    const key = `${stagingSha}:${d.kind}`
    if (state.lastHoldKey !== key && await notifyHold(`Popty staging (${stagingSha.slice(0, 8)}) was NOT promoted to main: ${d.reason}.`, state)) {
      writeState({ ...readState(), lastHoldKey: key })
    }
  }
  if (d.action === 'promote' && !flag('--dry-run')) {
    git('push', 'origin', `${stagingSha}:refs/heads/main`) // no +: git refuses anything but a fast-forward
    console.log(`promoted: main is now ${stagingSha.slice(0, 8)}`)
  }
  return d.action === 'hold' && d.kind === 'diverged' ? 1 : 0
}

module.exports = { decide, VERDICT_MAX_AGE_MS }
if (require.main === module) main().then((c) => process.exit(c), (e) => { console.error(e); process.exit(1) })
