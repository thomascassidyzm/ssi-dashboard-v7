#!/usr/bin/env node
/**
 * holmes-availability-sentinel.test.cjs
 *
 * The rule this pins down is Tom's, 2026-08-08, after the sentinel woke him at
 * 02:34Z to report that his laptop was asleep:
 *
 *   Holmes down with nothing waiting on it  -> SILENT (a log line, nothing else)
 *   Holmes down with something waiting      -> escalate
 *   Holmes up but half-working              -> escalate, demand or no demand
 *   Holmes up and healthy                   -> silent, outage state cleared
 *
 * Both ends are faked: a throwaway listener stands in for Holmes, and a second
 * one stands in for the Command Surface, so we can PROVE whether a POST was
 * made rather than infer it — and so no run of this test can ever reach Tom's
 * phone. Nothing here talks to popty.ngrok.app or to localhost:4317.
 */
const http = require('http')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')
const execFileAsync = promisify(execFile)

const SCRIPT = path.join(__dirname, 'holmes-availability-sentinel.sh')

function listen(handler) {
  const server = http.createServer(handler)
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

const listenOn = (s) => `http://127.0.0.1:${s.address().port}`

let failures = 0
function check(name, ok, detail) {
  if (ok) { console.log(`  ok   ${name}`) }
  else { failures++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`) }
}

async function main() {
  // The fake Holmes. `holmes` is reassigned per scenario.
  let holmes = { status: 200, body: '[{"code":"fra_for_eng"}]', type: 'application/json' }
  const holmesServer = await listen((req, res) => {
    res.writeHead(holmes.status, { 'Content-Type': holmes.type })
    res.end(holmes.body)
  })

  // The fake Command Surface. Every POST it sees is a message that would have
  // reached Tom, so `posts` being empty IS the silence assertion.
  let posts = []
  const surfaceServer = await listen((req, res) => {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      if (req.method === 'POST') posts.push({ url: req.url, body })
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('{"ok":true}')
    })
  })

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'holmes-sentinel-test-'))
  const log = path.join(tmp, 'sentinel.log')
  const marker = path.join(tmp, 'holmes-demand')

  /** Run one cron tick. Returns {posts, log} for just that tick.
   *  MUST be async: the fake Holmes and fake surface are served by THIS process's
   *  event loop, so a synchronous exec here would block the very servers the
   *  child is curling and deadlock the test. */
  async function tick(env = {}) {
    posts = []
    const before = fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : ''
    await execFileAsync('/bin/sh', [SCRIPT], {
      env: {
        ...process.env,
        HOLMES_HEALTH_URL: listenOn(holmesServer) + '/api/languages',
        CS_SURFACE: listenOn(surfaceServer),
        HOLMES_SENTINEL_LOG: log,
        HOLMES_STATE_DIR: tmp,
        HOLMES_DEMAND_MARKER: marker,
        HOLMES_MISSES_TO_ALERT: '1', // one tick per scenario; the ramp is not what we're testing
        ...env,
      },
      timeout: 30000,
    })
    const after = fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : ''
    return { posts: posts.slice(), log: after.slice(before.length) }
  }

  function reset() {
    for (const f of ['holmes-sentinel-misses', 'holmes-sentinel-open']) {
      fs.rmSync(path.join(tmp, f), { force: true })
    }
    fs.rmSync(marker, { force: true })
  }

  console.log('holmes-availability-sentinel — the four states\n')

  // 1. THE 02:34Z BUG. Holmes unreachable, nothing waiting on it.
  console.log('1. down, nothing waiting  -> must be completely silent')
  reset()
  holmes = { status: 404, body: '<html>endpoint is offline (ERR_NGROK_3200)</html>', type: 'text/html' }
  let r = await tick()
  check('no POST reaches the surface', r.posts.length === 0, `${r.posts.length} post(s): ${JSON.stringify(r.posts)}`)
  check('but it is recorded in the log', /nothing is waiting on Holmes, staying quiet/.test(r.log), r.log.trim())

  // 2. Same outage, but something touched the marker.
  console.log('\n2. down, something waiting -> must escalate')
  reset()
  fs.writeFileSync(marker, 'test\n')
  r = await tick()
  check('exactly one POST to /api/needs-you', r.posts.length === 1 && r.posts[0].url === '/api/needs-you',
    JSON.stringify(r.posts))
  check('and it says something is waiting',
    r.posts.length === 1 && /something is waiting on it/.test(JSON.parse(r.posts[0].body).text),
    r.posts.length ? r.posts[0].body : '(none)')

  // 2b. A stale marker is not demand.
  console.log('\n2b. down, marker touched long ago -> silent again')
  reset()
  fs.writeFileSync(marker, 'test\n')
  const old = new Date(Date.now() - 6 * 60 * 60 * 1000)
  fs.utimesSync(marker, old, old)
  r = await tick()
  check('a 6-hour-old marker is not demand', r.posts.length === 0, JSON.stringify(r.posts))

  // 3. The lying green dot. No demand marker anywhere — must still speak.
  console.log('\n3. up but half-working    -> must escalate WITHOUT demand')
  for (const half of [
    { name: '401 on a route the dashboard needs', resp: { status: 401, body: '{"error":"unauthorized"}', type: 'application/json' } },
    { name: '200 with an HTML body, not JSON', resp: { status: 200, body: '<!DOCTYPE html><html>ngrok</html>', type: 'text/html' } },
    { name: '502 — tunnel up, API behind it dead', resp: { status: 502, body: 'Bad Gateway', type: 'text/plain' } },
  ]) {
    reset()
    holmes = half.resp
    r = await tick({ HOLMES_HALF_MISSES_TO_ALERT: '1' })
    check(half.name, r.posts.length === 1 && /looks online but isn't working/.test(JSON.parse(r.posts[0].body).text),
      JSON.stringify(r.posts))
  }

  // 4. Healthy. Silent, and any outage state from a previous tick is cleared.
  console.log('\n4. up and healthy         -> silent, outage state cleared')
  reset()
  holmes = { status: 404, body: '<html>offline</html>', type: 'text/html' }
  fs.writeFileSync(marker, 'test\n')
  await tick() // escalate first, so there is state to clear
  check('precondition: outage state exists', fs.existsSync(path.join(tmp, 'holmes-sentinel-open')))
  holmes = { status: 200, body: '[{"code":"fra_for_eng"}]', type: 'application/json' }
  r = await tick()
  check('no POST on recovery', r.posts.length === 0, JSON.stringify(r.posts))
  check('logs a plain recovered line, no warning about a card it cannot find',
    /recovered after \d+ consecutive misses/.test(r.log) && !/WARNING/.test(r.log), r.log.trim())
  check('outage state cleared', !fs.existsSync(path.join(tmp, 'holmes-sentinel-open')))
  check('miss counter reset', fs.readFileSync(path.join(tmp, 'holmes-sentinel-misses'), 'utf8').trim() === '0')

  // The ramp survives: below the threshold nothing is posted even with demand.
  console.log('\n5. the 3-miss ramp still holds')
  reset()
  fs.writeFileSync(marker, 'test\n')
  holmes = { status: 404, body: '<html>offline</html>', type: 'text/html' }
  r = await tick({ HOLMES_MISSES_TO_ALERT: '3' })
  check('miss 1 of 3 is silent even with demand', r.posts.length === 0 && /miss 1\/3/.test(r.log), r.log.trim())
  r = await tick({ HOLMES_MISSES_TO_ALERT: '3' })
  check('miss 2 of 3 is silent', r.posts.length === 0 && /miss 2\/3/.test(r.log), r.log.trim())
  r = await tick({ HOLMES_MISSES_TO_ALERT: '3' })
  check('miss 3 of 3 escalates once', r.posts.length === 1, JSON.stringify(r.posts))
  r = await tick({ HOLMES_MISSES_TO_ALERT: '3' })
  check('miss 4 does NOT re-post', r.posts.length === 0 && /already escalated/.test(r.log), r.log.trim())

  // 6. THE 2026-08-13 FALSE ALARM, replayed exactly.
  //
  // Holmes is a laptop and it sleeps, so the sentinel sees a long run of [404]
  // (ERR_NGROK_3200, endpoint offline) — correctly silent. Then it wakes: ngrok's
  // agent re-establishes its session before node is listening on 3470 again, so
  // for ONE tick the edge answers ERR_NGROK_8012 / [503]. That is `half`.
  //
  // The bug was that `half` inherited the 404 miss count and escalated on that
  // single tick, telling Tom his Mac had been broken for "~15 minutes" when it
  // had merely been asleep and was already recovering. Every one of the 16 [503]s
  // logged 08-08..08-13 was isolated like this. `half` must now show its own
  // consecutive evidence.
  const asleep = { status: 404, body: '<html>endpoint is offline (ERR_NGROK_3200)</html>', type: 'text/html' }
  const waking = { status: 503, body: 'ERR_NGROK_8012', type: 'text/plain' }
  const awake = { status: 200, body: '[{"code":"fra_for_eng"}]', type: 'application/json' }

  console.log('\n6. asleep, then one wake-transition tick -> must NOT escalate')
  reset()
  holmes = asleep
  await tick({ HOLMES_MISSES_TO_ALERT: '3' })
  await tick({ HOLMES_MISSES_TO_ALERT: '3' })
  holmes = waking
  r = await tick({ HOLMES_MISSES_TO_ALERT: '3' })
  check('a lone 503 after a sleep does not wake Tom', r.posts.length === 0, JSON.stringify(r.posts))
  check('and it is counted as miss 1 of its own run, not 3', /miss 1\/6/.test(r.log), r.log.trim())
  holmes = awake
  r = await tick({ HOLMES_MISSES_TO_ALERT: '3' })
  check('recovers silently on the next tick', r.posts.length === 0 && /recovered/.test(r.log), r.log.trim())

  console.log('\n6b. but a SUSTAINED half-working state still escalates, at the >30 min bar')
  // Defaults on purpose: `half` must prove itself for MORE THAN 30 MINUTES, i.e.
  // 6 consecutive probes at 5 minutes each. The `down` bar stays at 3.
  reset()
  holmes = asleep
  await tick()
  await tick()
  holmes = waking
  for (let i = 1; i <= 5; i++) {
    r = await tick()
    check(`503 run ${i} of 6 silent (${i * 5} min — under the 30 min bar)`, r.posts.length === 0, JSON.stringify(r.posts))
  }
  r = await tick()
  check('503 run 6 escalates — 30 minutes of real fault', r.posts.length === 1, JSON.stringify(r.posts))
  check('and it reports ~30 minutes of the FAULT, not of the sleep',
    r.posts.length === 1 && /~30 minutes/.test(JSON.parse(r.posts[0].body).text),
    r.posts.length ? r.posts[0].body : '(none)')

  console.log('\n6c. a sleeping Mac with real demand still escalates as before')
  reset()
  fs.writeFileSync(marker, 'test\n')
  holmes = asleep
  await tick({ HOLMES_MISSES_TO_ALERT: '3' })
  await tick({ HOLMES_MISSES_TO_ALERT: '3' })
  r = await tick({ HOLMES_MISSES_TO_ALERT: '3' })
  check('down + demand is untouched by the half fix', r.posts.length === 1 && /something is waiting on it/.test(JSON.parse(r.posts[0].body).text),
    JSON.stringify(r.posts))

  holmesServer.close(); surfaceServer.close()
  fs.rmSync(tmp, { recursive: true, force: true })

  console.log(failures === 0 ? '\nall green' : `\n${failures} failure(s)`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
