#!/usr/bin/env node
/**
 * PROOF of job holds (cs #502·AK, r-2026-11-22-once-an-audio-job-is-agreed). Tom asked for a proof, not a test
 * suite (tests are off estate-wide, r-2026-11-03): one script, PASS or FAIL per assertion, then before-and-after
 * throughput on a SIMULATED Cartesia. It runs the real spend guard (createSpendGuard), the real batch runner
 * (audio-render-batch.renderBatch), the real door ticket and the real Cartesia slot limiter, against the in-process
 * memory store (memorySpendStore, the SQL functions' semantics in one process). It touches no database and calls no
 * TTS provider: the "render" is a sleep drawn from observed clip latencies.
 *
 *   node tools/audio/job-reserve-proof.cjs [--latency-log <day9-results.jsonl>] [--items 90] [--no-throughput]
 *
 * --latency-log: a run-day.cjs results file (cs #486·AK). Each paid clip's latency is the time from the previous
 * line's link to that line's render answer, as the serial runner saw it. That interval includes one uncontended
 * guard reserve, so it slightly OVERSTATES the provider's own latency, which makes the new path look slower, not faster.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const chain = require('../../services/shared/chain-context.cjs')
const { issueTicket } = require('../../services/shared/door-ticket.cjs')
const { withProviderSlot, providerConcurrencyStats } = require('../../services/shared/provider-concurrency.cjs')
const G = require('../../services/shared/tts-spend-guard.cjs')
const { renderBatch } = require('../../services/shared/audio-render-batch.cjs')

const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const ITEMS = Number(arg('--items', 90))
const WORK = fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'job-reserve-proof-'))
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const quiet = { warn() {}, error() {}, info() {}, log() {} }
const ON = { TTS_SPEND_JOB_HOLDS: 'on' }
const VOICE = 'cartesia_proof-voice'
let n = 0
const results = []
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`) }
async function code(p) { try { await p; return 'OK' } catch (e) { return e.code || e.message } }

function guardOn(store, { budget, now } = {}) {
  n += 1
  let budgetPath = null
  if (budget) { budgetPath = path.join(WORK, `budget-${n}.json`); fs.writeFileSync(budgetPath, JSON.stringify(budget)) }
  return G.createSpendGuard({
    store, now, budgetPath, budgetOverridePath: null, notify: () => {}, usageReaders: {}, isCommissioned: async () => false, logger: quiet,
    ledgerPath: path.join(WORK, `ledger-${n}.jsonl`),
  })
}
/** One line through the door's shape: ticket → guard → one provider slot → settle. A "LIB:" line is a library hit (no guard). */
function fakeRender(guard, latency) {
  return async (input) => {
    if (String(input.text).startsWith('LIB:')) return { ok: true, source: 'library', charsSpent: 0 }
    const text = String(input.spokenText || input.text)
    const ticket = issueTicket({ language: 'spa', voiceId: VOICE, text })
    const entry = await guard.beforeProviderCall({ provider: 'cartesia', voiceId: VOICE, text, courseCode: input.courseCode, job: input.job, language: 'spa', ticket })
    await withProviderSlot('cartesia', () => sleep(latency()))
    guard.afterProviderCall(entry, { ok: true })
    return { ok: true, source: 'rendered', charsSpent: text.length }
  }
}
const lines = (k, prefix = 'linea') => Array.from({ length: k }, (_, i) => ({ role: 'target1', text: `${prefix} numero ${i} del lote de prueba` }))

async function assertions() {
  const T0 = Date.parse('2026-11-23T10:00:00Z')
  let clock = T0
  const now = () => clock
  const course = 'spa_for_zho'

  // (a) ceiling / caps: a hold that would breach them is refused with the code a single call gets today.
  {
    const store = G.memorySpendStore({ name: `a-${Date.now()}`, now })
    store.totalCapChars = 1000
    const g = guardOn(store, { now })
    const job = await code(g.reserveJob({ provider: 'cartesia', courseCode: course, job: '#9001', chars: 1500 }))
    const call = await code(chain.run('proof', () => g.beforeProviderCall({ provider: 'cartesia', voiceId: VOICE, text: 'x'.repeat(1500), courseCode: course, job: '#9001', ticket: issueTicket({ voiceId: VOICE, text: 'x'.repeat(1500) }) })))
    check('(a1) hold past the automatic daily total cap refused like a single call', job === 'DAILY_TOTAL_CAP' && call === job, `hold ${job}, single call ${call}`)
    store.totalCapChars = G.TOTAL_DAILY_CAP_CHARS; store.totalCeilingChars = 1000
    const ceil = await code(g.reserveJob({ provider: 'cartesia', courseCode: course, job: '#9001', chars: 1500 }))
    check('(a2) hold past the hard ceiling refused', ceil === 'DAILY_TOTAL_CAP', ceil)
    store.totalCeilingChars = G.TOTAL_DAILY_CEILING_CHARS
    const g2 = guardOn(store, { now, budget: { providers: { cartesia: { dailyCapChars: 2000 } } } })
    const prov = await code(g2.reserveJob({ provider: 'cartesia', courseCode: course, job: '#9002', chars: 2500 }))
    const provCall = await code(chain.run('proof', () => g2.beforeProviderCall({ provider: 'cartesia', voiceId: VOICE, text: 'y'.repeat(2500), courseCode: course, job: '#9002', ticket: issueTicket({ voiceId: VOICE, text: 'y'.repeat(2500) }) })))
    check('(a3) hold past the provider daily cap refused like a single call', prov === 'DAILY_CAP' && provCall === prov, `hold ${prov}, single call ${provCall}`)
    const h = await g2.reserveJob({ provider: 'cartesia', courseCode: course, job: '#9003', chars: 1500 })
    const other = await code(chain.run('proof', () => g2.beforeProviderCall({ provider: 'cartesia', voiceId: VOICE, text: 'z'.repeat(600), courseCode: course, job: '#7777', ticket: issueTicket({ voiceId: VOICE, text: 'z'.repeat(600) }) })))
    check('(a4) a live hold counts for everyone: another caller\'s 600 chars past 2,000 - 1,500 refused', other === 'DAILY_CAP', other)
    await g2.releaseJob(h)
    const after = await code(chain.run('proof', () => g2.beforeProviderCall({ provider: 'cartesia', voiceId: VOICE, text: 'z'.repeat(600), courseCode: course, job: '#7777', ticket: issueTicket({ voiceId: VOICE, text: 'z'.repeat(600) }) })))
    check('(a5) and once released, the same call passes', after === 'OK', after)
    store.trips.set('*', { code: 'STOPPED_BY_TOM', message: 'proof', at: new Date(clock).toISOString() })
    const stopped = await code(g.reserveJob({ provider: 'cartesia', courseCode: course, job: '#9004', chars: 10 }))
    check('(a6) Tom\'s stop refuses a hold', stopped === 'STOPPED_BY_TOM', stopped)
  }

  // (b) re-record: no grant, an expired grant, a grant for another role, a spent grant — refused; a good one passes.
  {
    const store = G.memorySpendStore({ name: `b-${Date.now()}`, now })
    const iso = (ms) => new Date(ms).toISOString()
    store.rerecordGrants.push(
      { id: 184, course_code: course, roles: ['target1', 'target2', 'known'], by: 'Tom', why: 'yes 22 Nov', at: iso(T0 - 86400e3), until: iso(T0 + 3 * 86400e3), max_clips: 11000, used: 400, revoked_at: null },
      { id: 185, course_code: course, roles: null, by: 'Tom', why: 'old', at: iso(T0 - 10 * 86400e3), until: iso(T0 - 86400e3), max_clips: null, revoked_at: null },
      { id: 186, course_code: course, roles: ['known'], by: 'Tom', why: 'known only', at: iso(T0 - 86400e3), until: iso(T0 + 86400e3), max_clips: null, revoked_at: null },
      { id: 187, course_code: course, roles: null, by: 'Tom', why: 'spent', at: iso(T0 - 86400e3), until: iso(T0 + 86400e3), max_clips: 5, used: 5, revoked_at: null },
      { id: 188, course_code: course, roles: null, by: 'Watson', why: 'not Tom', at: iso(T0 - 86400e3), until: iso(T0 + 86400e3), max_clips: null, revoked_at: null })
    const g = guardOn(store, { now })
    const base = { provider: 'cartesia', courseCode: course, job: '#9010', roles: ['target1'], chars: 500 }
    const none = await code(g.reserveJob({ ...base, rerecord: true }))
    const expired = await code(g.reserveJob({ ...base, rerecord: true, grantId: 185 }))
    const wrongRole = await code(g.reserveJob({ ...base, rerecord: true, grantId: 186 }))
    const spent = await code(g.reserveJob({ ...base, rerecord: true, grantId: 187 }))
    const notTom = await code(g.reserveJob({ ...base, rerecord: true, grantId: 188 }))
    const good = await code(g.reserveJob({ ...base, rerecord: true, grantId: 184 }))
    check('(b1) re-record batch with no grant refused', none === 'RERECORD_NOT_PERMITTED', none)
    check('(b2) expired grant refused', expired === 'RERECORD_NOT_PERMITTED', expired)
    check('(b3) grant not covering the batch\'s role refused', wrongRole === 'RERECORD_NOT_PERMITTED', wrongRole)
    check('(b4) spent grant refused', spent === 'RERECORD_NOT_PERMITTED', spent)
    check('(b5) grant not signed by Tom refused', notTom === 'RERECORD_NOT_PERMITTED', notTom)
    check('(b6) Tom\'s in-date grant covering the roles is held', good === 'OK', good)
    let rendered = 0
    const batchNoGrant = await code(renderBatch({ courseCode: course, job: '#9011', purpose: 'proof', requestedBy: 'proof', items: [{ role: 'target1', text: 'hola', replaceAudioId: '00000000-0000-0000-0000-000000000000' }] },
      { guard: g, env: ON, renderOne: async () => { rendered++; return { ok: true } }, logger: quiet }))
    check('(b7) batch route: a replaceAudioId batch with no grant is refused before any line renders', batchNoGrant === 'RERECORD_NOT_PERMITTED' && rendered === 0, `${batchNoGrant}, lines rendered ${rendered}`)
  }

  // (c) a clip that would overrun its job's reservation is refused.
  {
    const store = G.memorySpendStore({ name: `c-${Date.now()}`, now })
    const g = guardOn(store, { now })
    const hold = await g.reserveJob({ provider: 'cartesia', courseCode: course, job: '#9020', chars: 100 })
    const draw = (text) => code(chain.run('proof', () => chain.withJobHold(hold, () => g.beforeProviderCall({ provider: 'cartesia', voiceId: VOICE, text, courseCode: course, job: '#9020', ticket: issueTicket({ voiceId: VOICE, text }) }))))
    const first = await draw('a'.repeat(60))
    const over = await draw('b'.repeat(50))
    const fits = await draw('c'.repeat(40))
    check('(c1) clips within the reservation draw (60, then 40 of 100)', first === 'OK' && fits === 'OK', `${first}, ${fits}`)
    check('(c2) clip that would overrun the reservation refused', over === 'JOB_RESERVATION_EXCEEDED', `${over}; drawn ${store.holds[0].drawn} of ${store.holds[0].reserved}`)
    check('(c3) refusal is a 402 the door never re-rolls', await (async () => { try { await chain.run('proof', () => chain.withJobHold(hold, () => g.beforeProviderCall({ provider: 'cartesia', voiceId: VOICE, text: 'd'.repeat(10), courseCode: course, job: '#9020', ticket: issueTicket({ voiceId: VOICE, text: 'd'.repeat(10) }) }))) } catch (e) { return /\(402\)/.test(e.message) } return false })(), 'message carries (402)')
  }

  // (d) the unspent remainder is released at the end; an abandoned hold expires on its own; midnight ends a hold.
  {
    clock = T0
    const store = G.memorySpendStore({ name: `d-${Date.now()}`, now })
    const g = guardOn(store, { now })
    const items = lines(10).concat([{ role: 'target1', text: 'LIB: ya existe en la biblioteca' }])
    const out = await chain.run('proof', () => renderBatch({ courseCode: course, job: '#9030', purpose: 'proof', requestedBy: 'proof', items }, { guard: g, env: ON, renderOne: fakeRender(g, () => 1), logger: quiet }))
    const t = await store.totals('cartesia', 23)
    const paid = items.filter(i => !i.text.startsWith('LIB:')).reduce((s, i) => s + i.text.length, 0)
    check('(d1) batch end releases the remainder: today counts only what was drawn', out.hold.releaseOk && t.held === 0 && t.today === paid && out.hold.drawn === paid,
      `reserved ${out.hold.reserved}, drawn ${out.hold.drawn}, released ${out.hold.released}, today ${t.today}, still held ${t.held}`)
    const abandoned = await g.reserveJob({ provider: 'cartesia', courseCode: course, job: '#9031', chars: 5000 })
    const heldNow = (await store.totals('cartesia', 23)).held
    clock += 6 * 60_000   // the job died: no draw, no heartbeat
    const heldLater = (await store.totals('cartesia', 23)).held
    const lateDraw = await code(chain.run('proof', () => chain.withJobHold(abandoned, () => g.beforeProviderCall({ provider: 'cartesia', voiceId: VOICE, text: 'tarde', courseCode: course, job: '#9031', ticket: issueTicket({ voiceId: VOICE, text: 'tarde' }) }))))
    check('(d2) abandoned hold stops counting after 5 minutes with no heartbeat', heldNow === 5000 && heldLater === 0, `held ${heldNow} → ${heldLater}`)
    check('(d3) and nothing more can be drawn from it', lateDraw === 'JOB_RESERVATION_EXPIRED', lateDraw)
    const beating = await g.reserveJob({ provider: 'cartesia', courseCode: course, job: '#9032', chars: 700 })
    for (let i = 0; i < 6; i++) { clock += 60_000; await g.heartbeatJob(beating) }
    const stillHeld = (await store.totals('cartesia', 23)).held
    check('(d4) a heartbeating hold stays live past 5 minutes', stillHeld === 700, `held ${stillHeld} after 6 min of heartbeats`)
    clock = Date.parse('2026-11-23T23:59:00Z')
    const lateHold = await g.reserveJob({ provider: 'cartesia', courseCode: course, job: '#9033', chars: 300, ttlSeconds: 7200 })
    clock = Date.parse('2026-11-24T00:00:30Z')
    const nextDay = (await store.totals('cartesia', 23)).held
    check('(d5) a hold never outlives its UTC day', nextDay === 0 && Date.parse(lateHold.expiresAt) === Date.parse('2026-11-24T00:00:00Z'), `expires ${lateHold.expiresAt}, held next day ${nextDay}`)
  }

  // (e) the ledger shows one row per paid clip; the per-call path is unchanged; the switch keeps the route off.
  {
    clock = T0
    const store = G.memorySpendStore({ name: `e-${Date.now()}`, now })
    const g = guardOn(store, { now })
    const items = lines(40).concat(Array.from({ length: 5 }, (_, i) => ({ role: 'target1', text: `LIB: clip ${i}` })))
    const out = await chain.run('proof', () => renderBatch({ courseCode: course, job: '#9040', purpose: 'proof', requestedBy: 'proof', items }, { guard: g, env: ON, renderOne: fakeRender(g, () => 2), logger: quiet }))
    const rows = store.rows.filter(r => r.kind === 'call' && r.job === '#9040')
    const lens = items.filter(i => !i.text.startsWith('LIB:')).map(i => i.text.length).sort((a, b) => a - b)
    const got = rows.map(r => r.chars).sort((a, b) => a - b)
    check('(e1) one ledger row per paid clip, with its own chars, tagged with its hold', rows.length === 40 && JSON.stringify(got) === JSON.stringify(lens) && rows.every(r => r.note === `hold #${out.hold.id}`),
      `${rows.length} rows for 40 paid + 5 library lines; hold rows in ledger: ${store.rows.filter(r => r.kind === 'hold').length}`)
    const before = store.rows.length
    await chain.run('proof', () => g.beforeProviderCall({ provider: 'cartesia', voiceId: VOICE, text: 'una sola linea', courseCode: course, job: '#9041', ticket: issueTicket({ voiceId: VOICE, text: 'una sola linea' }) }))
    const single = store.rows[before]
    check('(e2) a render with no hold takes today\'s per-call reserve', store.rows.length === before + 1 && single.job === '#9041' && !single.note && store.holds.length === 1, `rows +${store.rows.length - before}, holds ${store.holds.length}`)
    const off = await code(renderBatch({ courseCode: course, job: '#9042', purpose: 'proof', requestedBy: 'proof', items: lines(2) }, { guard: g, env: {}, renderOne: async () => ({ ok: true }), logger: quiet }))
    check('(e3) switch off (no TTS_SPEND_JOB_HOLDS=on): the batch route refuses, no hold taken', off === 'JOB_HOLDS_OFF' && store.holds.length === 1, off)
    for (let i = 0; i < 4; i++) await chain.run('proof', () => g.beforeProviderCall({ provider: 'cartesia', voiceId: VOICE, text: 'repetida', courseCode: course, job: '#9043', ticket: issueTicket({ voiceId: VOICE, text: 'repetida' }) }))
    // 4 sends of these words already; a batch of 2 more: the 5th passes, the 6th meets the repeat cap (5 per 24 h).
    const repOut = await chain.run('proof', () => renderBatch({ courseCode: course, job: '#9043', purpose: 'proof', requestedBy: 'proof', items: [{ role: 'target1', text: 'repetida' }, { role: 'target1', text: 'repetida' }] }, { guard: g, env: ON, renderOne: fakeRender(g, () => 1), logger: quiet }))
    const repCodes = repOut.results.map(r => r.code || 'OK').sort().join(',')
    const repRows = store.rows.filter(r => r.kind === 'call' && r.job === '#9043').length
    check('(e4) the repeat cap still binds inside a hold: 5 sends of the same words, the 6th refused REPEAT', repCodes === 'OK,REPEAT' && repRows === 5, `batch answered ${repCodes}; ${repRows} ledger rows for those words`)
  }
}

// ── THROUGHPUT, SIMULATED ──────────────────────────────────────────────────────
function latencySampler() {
  const f = arg('--latency-log', null)
  let xs = []
  if (f && fs.existsSync(f)) {
    const T = (s) => Date.parse(s)
    let prevLink = null
    for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
      const s = l.trim(); if (!s.startsWith('{') || !s.endsWith('}')) continue
      let r; try { r = JSON.parse(s) } catch { continue }
      if (r.kind === 'render' && r.source === 'rendered' && prevLink != null) { const d = T(r.at) - prevLink; if (d > 0 && d < 30_000) xs.push(d) }
      if (r.kind === 'link') prevLink = T(r.at)
    }
  }
  const source = xs.length ? `${xs.length} paid clips in ${path.basename(f)}` : 'fallback: median 550 ms (no log given)'
  if (!xs.length) xs = [550]
  const sorted = [...xs].sort((a, b) => a - b)
  let i = 0
  const order = xs.map((x, k) => xs[(k * 7919) % xs.length])   // a fixed shuffle, so both paths see the same draws
  return { source, median: sorted[Math.floor(sorted.length / 2)], p90: sorted[Math.floor(sorted.length * 0.9)], next: () => order[i++ % order.length], reset: () => { i = 0 } }
}
function mutex() { let tail = Promise.resolve(); return (fn) => { const run = tail.then(fn); tail = run.catch(() => {}); return run } }
/** The memory store with the DB's serial sections made real: a per-call reserve holds __total__ + provider for reserveMs; a draw holds the provider lock only, for drawMs. */
function timedStore(inner, { reserveMs, drawMs }) {
  const total = mutex(); const provider = mutex()
  return Object.assign(Object.create(inner), {
    kind: 'memory-timed',
    reserve: (r) => total(() => provider(async () => { await sleep(reserveMs); return inner.reserve(r) })),
    jobReserve: (r) => total(() => provider(async () => { await sleep(reserveMs); return inner.jobReserve(r) })),
    jobDraw: (r) => provider(async () => { await sleep(drawMs); return inner.jobDraw(r) }),
    jobRelease: (id, note) => inner.jobRelease(id, note), jobHeartbeat: (id) => inner.jobHeartbeat(id), settle: () => Promise.resolve(), totals: (p, d) => inner.totals(p, d),
  })
}
async function throughput() {
  const lat = latencySampler()
  const CONC = 15
  const DRAW_MS = 15
  console.log(`\nTHROUGHPUT (SIMULATED — no provider called, no DB): ${ITEMS} paid lines at ${CONC} concurrent; Cartesia latency drawn from ${lat.source} (median ${lat.median} ms, p90 ${lat.p90} ms); draw lock ${DRAW_MS} ms (assumed)`)
  const rows = []
  // 1500 ms: the serial section that reproduces #486·AK's observed 0.65 lines/s at 15 concurrent
  for (const reserveMs of [50, 200, 500, 1500]) {
    const course = 'spa_for_zho'
    // OLD: 15 concurrent per-call renders, each taking the global reserve.
    lat.reset()
    const s1 = guardOn(timedStore(G.memorySpendStore({ name: `t-old-${reserveMs}-${Date.now()}` }), { reserveMs, drawMs: DRAW_MS }))
    const r1 = fakeRender(s1, lat.next)
    const items = lines(ITEMS, `sim${reserveMs}`)
    let k = 0
    const t1 = Date.now()
    await chain.run('proof', () => Promise.all(Array.from({ length: CONC }, async () => { for (;;) { const i = k++; if (i >= items.length) return; await r1({ ...items[i], courseCode: course, job: '#9100' }) } })))
    const old = ITEMS / ((Date.now() - t1) / 1000)
    // NEW: one batch, one hold, draws.
    lat.reset()
    const s2 = guardOn(timedStore(G.memorySpendStore({ name: `t-new-${reserveMs}-${Date.now()}` }), { reserveMs, drawMs: DRAW_MS }))
    const t2 = Date.now()
    const out = await chain.run('proof', () => renderBatch({ courseCode: course, job: '#9101', purpose: 'proof', requestedBy: 'proof', items: lines(ITEMS, `sim${reserveMs}b`), concurrency: CONC }, { guard: s2, env: ON, renderOne: fakeRender(s2, lat.next), logger: quiet }))
    const neu = ITEMS / ((Date.now() - t2) / 1000)
    const peak = providerConcurrencyStats().cartesia
    rows.push({ reserveMs, old: +old.toFixed(2), new: +neu.toFixed(2), x: +(neu / old).toFixed(1), ok: out.ok, peak: peak && peak.peak })
    console.log(`  reserve section ${String(reserveMs).padStart(3)} ms: old ${old.toFixed(2)} lines/s → new ${neu.toFixed(2)} lines/s (×${(neu / old).toFixed(1)}); batch ok=${out.ok}, Cartesia slots peak ${peak && peak.peak}`)
  }
  return { latency: { source: lat.source, median: lat.median, p90: lat.p90 }, drawMs: DRAW_MS, conc: CONC, items: ITEMS, rows }
}

;(async () => {
  console.log('JOB HOLD PROOF (cs #502·AK) — in-process memory store, no DB, no provider\n')
  await chain.run('proof:job-reserve', assertions)
  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} assertions PASS${failed.length ? `; FAILED: ${failed.map(f => f.name).join('; ')}` : ''}`)
  let tp = null
  if (!args.includes('--no-throughput')) tp = await throughput()
  fs.writeFileSync(path.join(WORK, 'proof.json'), JSON.stringify({ results, throughput: tp }, null, 1))
  console.log(`\nwritten ${path.join(WORK, 'proof.json')}`)
  process.exit(failed.length ? 1 : 0)
})().catch(e => { console.error('PROOF CRASHED:', e); process.exit(2) })
