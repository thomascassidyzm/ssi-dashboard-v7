/**
 * The render driver against a fake phase8 (job #425). No network, no spend.
 * The "#382 replay" fake returns exactly what passes 2-37 of the eng_for_hin
 * loop reported: ~10,000 provider calls, ~160 slots attached, "completed".
 * Run: npx vitest run tools/render-driver.test.cjs
 */
import { describe, it, expect } from 'vitest'
const { runDriver } = require('./render-driver.cjs')

function fakePhase8(passes, plan = { wouldGenerate: 19043, wouldSpendChars: 603664 }) {
  const posted = []
  let i = 0
  return {
    posted,
    post: async (body) => {
      posted.push(body)
      if (body.dryRun) return { dryRun: true, ...plan }
      return passes[Math.min(i++, passes.length - 1)]
    },
  }
}
const pass = (spentChars, providerCalls, attached, status = 'completed') => ({ status, attached, failed: 0, spend: { spentChars, providerCalls, capped: null } })

describe('render driver', () => {
  it('refuses to run without a character budget', async () => {
    const f = fakePhase8([])
    await expect(runDriver({ post: f.post })).rejects.toThrow(/budget-chars is required/)
  })

  it('without --go it only plans: one dry run, zero renders', async () => {
    const f = fakePhase8([pass(1, 1, 1)])
    const out = await runDriver({ post: f.post, budgetChars: 700000 })
    expect(out.stopped).toMatch(/plan only/)
    expect(f.posted.every(b => b.dryRun)).toBe(true)
  })

  it('--partial renders what fits a day\'s remaining budget instead of refusing the bigger plan', async () => {
    const f = fakePhase8([pass(90000, 3000, 3000, 'spend-capped')])
    const out = await runDriver({ post: f.post, budgetChars: 100000, go: true, partial: true })
    expect(out.stopped).not.toMatch(/plan needs up to/)
    expect(f.posted.find(b => !b.dryRun).budgetChars).toBe(100000)   // phase8 enforces the day's budget inside the pass
  })

  it('refuses a plan bigger than the budget', async () => {
    const f = fakePhase8([pass(1, 1, 1)])
    const out = await runDriver({ post: f.post, budgetChars: 100000, go: true })
    expect(out.stopped).toMatch(/plan needs up to 603664/)
    expect(f.posted.filter(b => !b.dryRun)).toHaveLength(0)
  })

  it('the #382 replay: stops after the FIRST wasteful pass, not 36 passes later', async () => {
    // Pass 1 of #382 was healthy (19,031 renders, ~19k slots); pass 2 was the first loop pass.
    const f = fakePhase8([pass(603664, 19031, 19100), pass(344413, 12057, 160), pass(323246, 11179, 160)])
    const out = await runDriver({ post: f.post, budgetChars: 8_000_000, go: true, maxPasses: 50 })
    expect(out.passes).toBe(2)
    expect(out.stopped).toMatch(/12057 provider calls for 160 slots/)
    expect(out.spent).toBe(603664 + 344413)
  })

  it('posts each pass with what is left of the budget, and stops when it is spent', async () => {
    const f = fakePhase8([pass(400, 10, 10), pass(400, 10, 10), pass(400, 10, 10)], { wouldGenerate: 30, wouldSpendChars: 900 })
    const out = await runDriver({ post: f.post, budgetChars: 1000, go: true })
    const renders = f.posted.filter(b => !b.dryRun)
    expect(renders.map(b => b.budgetChars)).toEqual([1000, 600, 200])
    expect(out.stopped).toMatch(/budget spent/)
  })

  it('stops on a pass that attached nothing, and on a service that does not report spend', async () => {
    let f = fakePhase8([pass(100, 5, 0)])
    expect((await runDriver({ post: f.post, budgetChars: 1e6, go: true })).stopped).toMatch(/attached 0/)
    f = fakePhase8([{ status: 'completed', success: 10000, failed: 0 }])
    expect((await runDriver({ post: f.post, budgetChars: 1e6, go: true })).stopped).toMatch(/did not report spend/)
  })
})

describe('render driver transport and exit codes (#518)', () => {
  const http = require('http')
  const { makePost, EXIT_BUDGET_CAP } = require('./render-driver.cjs')
  const serve = (handler) => new Promise(r => { const s = http.createServer(handler); s.listen(0, '127.0.0.1', () => r(s)) })

  it('makePost picks the transport from the URL protocol (http works; https is not forced onto http)', async () => {
    const s = await serve((q, r) => { r.end('{"ok":1}') })
    try { expect(await makePost(`http://127.0.0.1:${s.address().port}`, 'x')({})).toEqual({ ok: 1 }) } finally { s.close() }
    const s2 = await serve((q, r) => r.end('{}'))
    try { await expect(makePost(`https://127.0.0.1:${s2.address().port}`, 'x')({})).rejects.toThrow() } finally { s2.close() }
  })

  it('a connection dropped mid-response rejects instead of crashing', async () => {
    const s = await serve((q, r) => { r.writeHead(200, { 'Content-Length': '1000' }); r.write('{"partial"'); setTimeout(() => r.socket.destroy(), 20) })
    try { await expect(makePost(`http://127.0.0.1:${s.address().port}`, 'x')({})).rejects.toThrow() } finally { s.close() }
  })

  it('budget stops are flagged capped; other stops are not', async () => {
    const capped = await runDriver({ ...fakePhase8([pass(100, 10, 10)]), budgetChars: 100, go: true, partial: true })
    expect(capped.capped).toBe(true)
    const nothing = await runDriver({ ...fakePhase8([pass(0, 0, 0)]), budgetChars: 100000, go: true })
    expect(nothing.capped).toBe(false)
    expect(EXIT_BUDGET_CAP).toBe(4)
  })

  it('wrapper: only driver exit 4 counts as a cap stop; other non-zero near the cap is a failure', () => {
    const fs = require('fs'), cp = require('child_process'), os = require('os'), path = require('path')
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'w518-'))
    fs.mkdirSync(path.join(dir, 'tools/course-optimization'), { recursive: true })
    fs.mkdirSync(path.join(dir, 'bin'))
    fs.copyFileSync(path.join(__dirname, 'course-optimization/release-held-audio-355.sh'), path.join(dir, 'w.sh'))
    // psql stub: first call (before the course) 0 spent, later calls 259000 (inside MIN_USEFUL of the cap)
    fs.writeFileSync(path.join(dir, 'bin/psql'), `#!/bin/sh\nf=${dir}/n; n=$(cat $f 2>/dev/null || echo 0); echo $((n+1)) > $f; [ $n -eq 0 ] && echo 0 || echo 259000\n`, { mode: 0o755 })
    fs.writeFileSync(path.join(dir, 'tools/render-driver.cjs'), 'process.exit(Number(process.env.RC))\n')
    const run = (rc) => { fs.rmSync(path.join(dir, 'n'), { force: true }); return cp.spawnSync('bash', [path.join(dir, 'w.sh')], { env: { PATH: `${dir}/bin:${process.env.PATH}`, HOME: dir, POPTY_DIR: dir, DATABASE_URL: 'x', COURSES: 'a:1000', DAILY_CAP_CHARS: '260000', MIN_USEFUL_CHARS: '5000', RC: String(rc) }, encoding: 'utf8' }) }
    expect(run(4).status).toBe(0)
    expect(run(1).status).toBe(1)
  })
})
