#!/usr/bin/env node
// Approve -> narrowed bulk render -> revoke, per course, for the approved
// empty-pod-0-English-slot fill. Never widens scope: pod_ids + roles are
// pinned to the plan, and the approval is revoked immediately after the run
// so the gate stays shut for the HELD out-of-scope work.
const { execFileSync } = require('child_process')
const fs = require('fs')
const plan = require('./plan.json').filter(c => c.course_code !== 'fin_for_eng') // shakedown done
const NOTE = "Scoped approval for the empty-pod-0-English-slot fill ONLY (Tom approved 2026-08-13). Cast censused across all 728 in-scope slots: 100% clone xai:gfzdpspr5fdp + Olivia xai:bedd6226. Revoked immediately after the run."
const BY = "watson-agent (Tom approved render 2026-08-13)"
const log = []
for (const c of plan) {
  const step = { course: c.course_code, role: c.role, pod_ids: c.pod_ids, expected_slots: c.slots }
  try {
    execFileSync('node', ['tools/pod-approve-voices.cjs', `--course=${c.course_code}`, `--by=${BY}`, `--note=${NOTE}`], { stdio: 'pipe' })
    step.approved = true
    const body = JSON.stringify({ pod_ids: c.pod_ids, roles: [c.role], concurrency: 4 })
    const out = execFileSync('curl', ['-s','-m','3000','-X','POST',
      `http://localhost:3465/generate-pods/${c.course_code}`,
      '-H','Content-Type: application/json','-d', body], { timeout: 3100000 }).toString()
    step.result = JSON.parse(out)
  } catch (e) {
    step.error = String(e.message).slice(0, 300)
  } finally {
    try { execFileSync('node', ['tools/pod-approve-voices.cjs', `--revoke=${c.course_code}`], { stdio: 'pipe' }); step.revoked = true }
    catch (e) { step.revoke_error = String(e.message).slice(0, 200) }
  }
  const r = step.result || {}
  console.log(`${c.course_code.padEnd(18)} queued=${String(r.queued_before_sample ?? '?').padStart(4)} (expected ${String(c.slots).padStart(4)})  generated=${r.generated ?? '-'} reused=${r.reused ?? '-'} failed=${r.failed ?? '-'} revoked=${step.revoked}${step.error ? '  ERROR ' + step.error : ''}`)
  log.push(step)
  fs.writeFileSync(__dirname + '/rollout-log.json', JSON.stringify(log, null, 2))
}
const tot = log.reduce((a, s) => { const r = s.result || {}; a.g += r.generated||0; a.r += r.reused||0; a.f += r.failed||0; return a }, {g:0,r:0,f:0})
console.log(`\nTOTAL generated=${tot.g} reused=${tot.r} failed=${tot.f}`)
