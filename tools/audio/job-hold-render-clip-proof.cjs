#!/usr/bin/env node
/**
 * PROOF that a job hold reaches the spend guard THROUGH THE REAL renderClip (cs #761, the fixes from Fable review
 * #756·AK of cs #502·AK / #516·AK). tools/audio/job-reserve-proof.cjs renders with a fakeRender that calls the guard
 * directly inside withJobHold, so it could not see that renderClip's own chain.run() dropped the hold (fix 1: every
 * batch clip took the per-call reserve while the whole hold still counted). This proof runs the real batch runner
 * (audio-render-batch.renderBatch) over the REAL renderClip (audio-render-entry.cjs), with stub deps for everything that
 * touches the outside world: resolve, the clip library, the door (`speak`: ticket → guard → no provider) and store.
 * No database, no provider, nothing rendered: the in-process memory store has the SQL functions' semantics.
 *
 *   node tools/audio/job-hold-render-clip-proof.cjs
 *
 * One line per assertion, PASS or FAIL; exit 1 on any FAIL. Tests are off estate-wide (r-2026-11-03); this is a proof
 * script Kai's brief asked for, in the same shape as job-reserve-proof.cjs.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const chain = require('../../services/shared/chain-context.cjs')
const { issueTicket } = require('../../services/shared/door-ticket.cjs')
const G = require('../../services/shared/tts-spend-guard.cjs')
const { renderBatch } = require('../../services/shared/audio-render-batch.cjs')
const { renderClip } = require('../../services/shared/audio-render-entry.cjs')

const WORK = fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'job-hold-render-clip-proof-'))
const quiet = { warn() {}, error() {}, info() {}, log() {} }
const ON = { TTS_SPEND_JOB_HOLDS: 'on' }
const VOICE = 'cartesia_proof-voice'
const COURSE = 'spa_for_zho'
const results = []
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`) }
async function code(p) { try { await p; return 'OK' } catch (e) { return e.code || e.message } }

let n = 0
function guardOn(store, { budget, now, usageReaders = {} } = {}) {
  n += 1
  let budgetPath = null
  if (budget) { budgetPath = path.join(WORK, `budget-${n}.json`); fs.writeFileSync(budgetPath, JSON.stringify(budget)) }
  return G.createSpendGuard({ store, now, budgetPath, budgetOverridePath: null, notify: () => {}, usageReaders, isCommissioned: async () => false, logger: quiet, ledgerPath: path.join(WORK, `ledger-${n}.jsonl`) })
}
/** The memory store with every per-call reserve and every draw COUNTED (the property fix 1 is about). */
function countingStore(inner) {
  const calls = { reserve: 0, jobDraw: 0 }
  const s = Object.assign(Object.create(inner), {
    reserve: (r) => { calls.reserve++; return inner.reserve(r) },
    jobDraw: (r) => { calls.jobDraw++; return inner.jobDraw(r) },
  })
  return { store: s, calls }
}
/**
 * renderClip's deps, stubbed at the edge only. `speak` is the door's shape: a library-miss ticket, the spend guard's
 * beforeProviderCall / afterProviderCall, and no provider. A "LIB:" line is a clip-library hit (no guard at all).
 * spliceIntro (a presentation line) renders one missing piece through a NESTED renderClip, as phase8's splice does.
 */
function stubDeps(guard, pieceText = (t) => `pieza ${t}`) {
  let k = 0
  const deps = {
    resolve: async (req) => ({ language: req.role === 'presentation' ? 'eng' : 'spa', voiceId: VOICE, provider: 'cartesia', providerConfig: {} }),
    link: async (ident) => (String(ident.text).startsWith('LIB:') ? { audioId: `lib-${++k}`, s3Key: 'x' } : null),
    speak: async (said, provider, cfg) => {
      const ticket = issueTicket({ language: cfg.door.language, voiceId: VOICE, text: said })
      const entry = await guard.beforeProviderCall({ provider, voiceId: VOICE, text: said, courseCode: cfg.door.courseCode, job: cfg.door.job, language: cfg.door.language, ticket })
      guard.afterProviderCall(entry, { ok: true })
      return { audioBuffer: Buffer.from('proof'), charsSpent: said.length }
    },
    store: async () => ({ audioId: `new-${++k}` }),
  }
  deps.spliceIntro = async (req) => {
    const piece = await renderClip({ courseCode: req.courseCode, role: 'known', text: pieceText(req.text), language: 'eng', voiceId: VOICE, job: req.job, purpose: 'spliced intro piece (proof)', requestedBy: req.requestedBy }, { ...deps, spliceIntro: null })
    return { ok: true, source: 'spliced', charsSpent: piece.charsSpent, audioId: `spliced-${++k}` }
  }
  return deps
}
const batchBody = (job, items) => ({ courseCode: COURSE, job, purpose: 'proof', requestedBy: 'proof', items })

async function main() {
  const T0 = Date.parse('2026-11-23T10:00:00Z')
  let clock = T0
  const now = () => clock

  // (0) the mechanism itself: a nested chain.run inside withJobHold still sees the hold.
  {
    const seen = await chain.run('proof:outer', () => chain.withJobHold({ id: 'H' }, () => chain.run('proof:inner', async () => chain.jobHold())))
    check('(0) chain.run carries an existing job hold into its new store (fix 1 mechanism)', seen && seen.id === 'H', `inner jobHold ${JSON.stringify(seen)}`)
    const none = await chain.run('proof:plain', async () => chain.jobHold())
    check('(0b) a run() with no hold on the flow still has none', none === null, String(none))
  }

  // (1) THE BLOCKER, end to end: the batch runner over the REAL renderClip draws from the hold and never reserves per call.
  {
    const { store, calls } = countingStore(G.memorySpendStore({ name: `rc1-${Date.now()}`, now }))
    const g = guardOn(store, { now })
    const items = Array.from({ length: 12 }, (_, i) => ({ role: 'target1', text: `frase numero ${i} del lote` })).concat([{ role: 'target1', text: 'LIB: ya en la biblioteca' }])
    const paid = items.filter(i => !i.text.startsWith('LIB:')).reduce((s, i) => s + i.text.length, 0)
    const out = await chain.run('proof', () => renderBatch(batchBody('#9501', items), { guard: g, env: ON, renderOne: (input) => renderClip(input, stubDeps(g)), logger: quiet }))
    const rendered = out.results.filter(r => r.source === 'rendered').length
    check('(1a) every paid line rendered through the real renderClip', out.ok && rendered === 12 && out.counts.library === 1, JSON.stringify(out.counts))
    check('(1b) hold.drawn > 0 and equals the paid chars', out.hold.drawn > 0 && out.hold.drawn === paid, `reserved ${out.hold.reserved}, drawn ${out.hold.drawn}, paid ${paid}`)
    check('(1c) ZERO per-call store.reserve calls; one draw per paid clip', calls.reserve === 0 && calls.jobDraw === 12, `reserve ${calls.reserve}, jobDraw ${calls.jobDraw}`)
    const t = await store.totals('cartesia', 23)
    check('(1d) after release, today counts what was drawn and nothing is held', t.today === paid && t.held === 0, `today ${t.today}, held ${t.held}`)
  }

  // (7) a spliced intro's nested renderClip (two chain.run levels deep) also draws from the hold — the case fix 7 documents.
  {
    const { store, calls } = countingStore(G.memorySpendStore({ name: `rc7-${Date.now()}`, now }))
    const g = guardOn(store, { now })
    const out = await chain.run('proof', () => renderBatch(batchBody('#9507', [{ role: 'presentation', text: 'así se dice hola' }]), { guard: g, env: ON, renderOne: (input) => renderClip(input, stubDeps(g)), logger: quiet }))
    check('(7a) a spliced intro piece rendered by a nested renderClip draws from the batch hold', out.hold.drawn === 'pieza así se dice hola'.length && calls.reserve === 0, `drawn ${out.hold.drawn}, reserve ${calls.reserve}`)
    const big = await chain.run('proof', () => renderBatch(batchBody('#9508', Array.from({ length: 3 }, (_, i) => ({ role: 'presentation', text: `x${i}` }))), { guard: g, env: ON, renderOne: (input) => renderClip(input, stubDeps(g, (t) => `una pieza de introduccion bastante larga para ${t}`)), logger: quiet }))
    check('(7b) intro pieces longer than the hold was sized for fail closed (JOB_RESERVATION_EXCEEDED), no per-call fallback', big.stoppedBy === 'JOB_RESERVATION_EXCEEDED' && calls.reserve === 0, `stoppedBy ${big.stoppedBy}, reserve ${calls.reserve}, hold ${big.hold.reserved}`)
  }

  // (3) release in finally; a throwing rate gate is a line's answer, not a 500 that leaves workers rendering.
  {
    const store = G.memorySpendStore({ name: `rc3-${Date.now()}`, now })
    const g = guardOn(store, { now })
    let admits = 0
    const admit = async () => { admits++; if (admits === 3) throw new Error('limiter exploded'); return { ok: true } }
    const items = Array.from({ length: 20 }, (_, i) => ({ role: 'target1', text: `linea ${i} con limite roto` }))
    const out = await chain.run('proof', () => renderBatch({ ...batchBody('#9503', items), concurrency: 2 }, { guard: g, env: ON, admit, renderOne: (input) => renderClip(input, stubDeps(g)), logger: quiet }))
    const notSent = out.results.filter(r => r.code === 'NOT_SENT').length
    const h = store.holds[store.holds.length - 1]
    check('(3a) a throwing admit() answers that line ADMIT_FAILED and stops new lines (no 500)', out.stoppedBy === 'ADMIT_FAILED' && notSent > 0 && out.results.length === 20, `stoppedBy ${out.stoppedBy}, not sent ${notSent}`)
    check('(3b) the hold is released all the same', out.hold.releaseOk && h.releasedAt != null && (await store.totals('cartesia', 23)).held === 0, `releaseOk ${out.hold.releaseOk}`)
    const g2 = { ...g, releaseJob: async () => { throw new Error('ledger down') } }
    const out2 = await chain.run('proof', () => renderBatch(batchBody('#9504', items.slice(0, 2)), { guard: g2, env: ON, renderOne: (input) => renderClip(input, stubDeps(g)), logger: quiet }))
    check('(3c) a release that throws is reported releaseOk:false, never thrown over the results', out2.ok && out2.hold.releaseOk === false && out2.results.length === 2, `releaseOk ${out2.hold.releaseOk}`)
  }

  // (2) divergence: a baseline taken while another process's hold is live does not trip when that hold ends.
  {
    clock = T0
    const store = G.memorySpendStore({ name: `rc2-${Date.now()}`, now })
    let used = 1_000_000
    const other = guardOn(store, { now })
    const watcher = guardOn(store, { now, usageReaders: { cartesia: async () => ({ usedChars: used }) } })
    const hold = await other.reserveJob({ provider: 'cartesia', courseCode: COURSE, job: '#9502', chars: 100_000 })
    const say = (text) => code(chain.run('proof', () => watcher.beforeProviderCall({ provider: 'cartesia', voiceId: VOICE, text, courseCode: COURSE, job: '#9599', ticket: issueTicket({ voiceId: VOICE, text }) })))
    const first = await say('linea base')            // baseline read here, with 100,000 chars held
    used += 'linea base'.length
    await other.releaseJob(hold)                       // the hold ends; nothing of it was drawn
    clock += 11 * 60_000
    const second = await say('segunda linea')          // next usage check: provider moved by 10, ledger (sent) by 10
    check('(2a) no false PROVIDER_DIVERGENCE when a hold live at baseline is released', first === 'OK' && second === 'OK', `${first}, ${second}`)
    const watcher2 = guardOn(store, { now, usageReaders: { cartesia: async () => ({ usedChars: used }) } })
    const hold2 = await other.reserveJob({ provider: 'cartesia', courseCode: COURSE, job: '#9505', chars: 100_000 })
    const say2 = (text) => code(chain.run('proof', () => watcher2.beforeProviderCall({ provider: 'cartesia', voiceId: VOICE, text, courseCode: COURSE, job: '#9598', ticket: issueTicket({ voiceId: VOICE, text }) })))
    await say2('otra base')
    used += 'otra base'.length + 60_000              // 60,000 billed outside the door while the hold is live
    clock += 11 * 60_000
    await other.heartbeatJob(hold2)
    const masked = await say2('tercera linea')
    check('(2b) a live hold no longer masks outside-the-door spend', masked === 'PROVIDER_DIVERGENCE', masked)
  }

  // (6) a signed job raise: one live hold at a time, and its spend today counts the live hold.
  {
    clock = T0
    const store = G.memorySpendStore({ name: `rc6-${Date.now()}`, now })
    const budget = { jobRaises: [{ job: '#9506', extraDailyChars: 50_000, by: 'Tom', why: 'proof', until: new Date(T0 + 86400e3).toISOString() }] }
    const g = guardOn(store, { now, budget })
    const first = await g.reserveJob({ provider: 'cartesia', courseCode: COURSE, job: '#9506', chars: 30_000 })
    const second = await code(g.reserveJob({ provider: 'cartesia', courseCode: COURSE, job: '#9506 part 2', chars: 15_000 }))
    check('(6a) a second live hold for a raised job is refused JOB_HOLD_LIVE', first && second === 'JOB_HOLD_LIVE', second)
    const today = await store.jobToday('#9506')
    check('(6b) jobToday counts the live hold\'s undrawn chars', today.cartesia === 30_000, JSON.stringify(today))
    const g2 = guardOn(store, { now, budget })   // a fresh process: no cache, reads the store
    const call = await code(chain.run('proof', () => g2.beforeProviderCall({ provider: 'cartesia', voiceId: VOICE, text: 'z'.repeat(25_000), courseCode: COURSE, job: '#9506', ticket: issueTicket({ voiceId: VOICE, text: 'z'.repeat(25_000) }) })))
    check('(6c) a per-call clip of the raised job sees the held 30,000 against its 50,000 allowance', call === 'DAILY_CAP', call)
    await g.releaseJob(first)
    const after = await code(g2.reserveJob({ provider: 'cartesia', courseCode: COURSE, job: '#9506', chars: 15_000 }))
    check('(6d) once released, the raised job may hold again', after === 'OK', after)
    const other = await g.reserveJob({ provider: 'cartesia', courseCode: COURSE, job: '#9510', chars: 100 })
    const other2 = await code(g.reserveJob({ provider: 'cartesia', courseCode: COURSE, job: '#9510', chars: 100 }))
    check('(6e) an unraised job may still hold more than one batch', !!other && other2 === 'OK', other2)
  }
}

;(async () => {
  console.log('JOB HOLD THROUGH THE REAL renderClip (cs #761, Fable review #756·AK) — memory store, stub deps, no DB, no provider\n')
  await main()
  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} assertions PASS${failed.length ? `; FAILED: ${failed.map(f => f.name).join('; ')}` : ''}`)
  process.exit(failed.length ? 1 : 0)
})().catch(e => { console.error('PROOF CRASHED:', e); process.exit(2) })
