/**
 * THE SPEND GUARD — the money check at every paid TTS provider call.
 *
 * Specimen (job #425, post-mortem of #382): between 2026-09-25 22:33Z and
 * 2026-09-26 20:47Z one fill driver posted phase8 /generate 37 times for
 * eng_for_hin. Pass 1 rendered the course's 19,023 missing clips; passes 2-37
 * rendered 246,934 more and not ONE of them was a new line — the linker could
 * not see the clips it had just made (a PostgREST read truncated at 60,000
 * rows), so every pass paid for them again. 7,631,695 Cartesia characters,
 * 95% of the 8M monthly pool, for 610,839 characters of new audio. Every pass
 * reported "status: completed, failed: 0". Nothing watched money.
 *
 * #383 fixed that cause and put a per-pass cap in phase8 (runSpendCap). This
 * module is the layer that does NOT trust any caller to be right about what is
 * missing. It sits at the provider call itself — services/tts-service.cjs
 * renderWithRetry, services/elevenlabs-service.cjs, services/google-tts-service.cjs
 * — and, before EVERY attempt (a retry or a re-roll is billed like the first):
 *
 *   1. LEDGER    appends one line per provider call to a host-wide JSONL
 *                ledger: provider, voice, chars, course, job, text hash, pid.
 *                Written BEFORE the call, so a crash mid-call is still counted.
 *   2. BUDGET    refuses the call if it would take the provider's spend today
 *                past its daily cap, or this billing cycle past the stop share
 *                of the monthly pool (50% unless an explicit, dated, signed
 *                raise in ops/tts-spend-budgets.json says otherwise). Every
 *                process on the host reads the same ledger, so the budget is
 *                global, not per process.
 *   3. REPEAT    refuses the call if these same words, in this voice, from
 *                this provider have already been sent maxPerKey times inside
 *                the window — whatever the caller believes is missing. The
 *                #382 loop sent the median line 15 times; "her name" 41 times.
 *   4. PROVIDER  where the provider can report its own usage (ElevenLabs yes;
 *                Cartesia only once CARTESIA_USAGE_URL is configured), compares
 *                the provider's count with the ledger's; if the provider has
 *                billed materially more than the ledger recorded, something is
 *                spending outside this door and every render stops.
 *   5. ALERT     any refusal, and any first crossing of a daily alert line or
 *                of 50% / 80% of a pool, posts ONE line to a human (the command
 *                surface's needs-you), logs it loudly, and appends it to an
 *                alerts file beside the ledger. Never throws, never blocks.
 *
 * A refusal throws TtsSpendGuardError, whose message carries "(402)" so the
 * door's retry classifier treats it as a non-retriable client error — a
 * refused call is never re-rolled.
 *
 * Fail CLOSED: an unreadable budget file or an unwritable ledger refuses the
 * render. A render the guard cannot account for is a render it cannot bound.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')

// ─── Configuration ──────────────────────────────────────────────────────────

/**
 * Built-in budgets, used for any provider the budget file does not name.
 * Characters, not dollars (Kai reads TTS in characters against the pool).
 * cycleStartDay: the day of the month the provider's pool resets (UTC).
 */
const DEFAULT_BUDGETS = Object.freeze({
  cartesia:   { monthlyPoolChars: 8_000_000, cycleStartDay: 1, dailyCapChars: 1_000_000, alertDailyChars: 300_000, stopAtShareOfPool: 0.5 },
  elevenlabs: { monthlyPoolChars: 2_000_000, cycleStartDay: 1, dailyCapChars:   200_000, alertDailyChars:  50_000, stopAtShareOfPool: 0.5 },
  xai:        { monthlyPoolChars: 5_000_000, cycleStartDay: 1, dailyCapChars:   500_000, alertDailyChars: 150_000, stopAtShareOfPool: 0.5 },
  azure:      { monthlyPoolChars: 5_000_000, cycleStartDay: 1, dailyCapChars:   500_000, alertDailyChars: 150_000, stopAtShareOfPool: 0.5 },
  google:     { monthlyPoolChars: 1_000_000, cycleStartDay: 1, dailyCapChars:   100_000, alertDailyChars:  30_000, stopAtShareOfPool: 0.5 },
})
const DEFAULT_REPEAT = Object.freeze({ maxPerKey: 6, windowHours: 24 })
/** Pool shares at which a human is told, whatever the stop share is. */
const POOL_ALERT_SHARES = [0.5, 0.8]
/** Provider-vs-ledger: trip when the provider's delta exceeds ours by this factor AND this many chars. */
const DEFAULT_DIVERGENCE = Object.freeze({ factor: 1.25, slackChars: 20_000, checkEveryMinutes: 10 })

const REPO_ROOT = path.resolve(__dirname, '..', '..')

function defaultLedgerPath() {
  if (process.env.TTS_SPEND_LEDGER) return process.env.TTS_SPEND_LEDGER
  // Tests never write the host's real ledger.
  if (process.env.VITEST) return path.join(os.tmpdir(), `tts-spend-ledger-test-${process.pid}.jsonl`)
  return path.join(os.homedir(), '.local', 'state', 'ssi-tts-spend', 'ledger.jsonl')
}
function defaultBudgetPath() {
  return process.env.TTS_SPEND_BUDGETS || path.join(REPO_ROOT, 'ops', 'tts-spend-budgets.json')
}

class TtsSpendGuardError extends Error {
  constructor(code, message, detail = {}) {
    super(`TTS spend guard (402) ${code}: ${message}`)
    this.name = 'TtsSpendGuardError'
    this.code = code
    this.detail = detail
  }
}

// ─── Small pure helpers ─────────────────────────────────────────────────────

/** The loop key's text: case, punctuation and spacing do not make a new line. */
function repeatTextKey(text) {
  return String(text || '').normalize('NFC').toLowerCase()
    .replace(/[\s ]+/g, ' ')
    .replace(/[.,!?;:"'“”‘’()\[\]{}…—–\-।॥¿¡。？！、，]/g, '')
    .trim()
}
function repeatKey(provider, voiceId, text) {
  return crypto.createHash('sha1').update(`${provider}|${voiceId || '?'}|${repeatTextKey(text)}`).digest('hex').slice(0, 20)
}
function textHash(text) {
  return crypto.createHash('sha1').update(String(text || '')).digest('hex').slice(0, 16)
}
const dayKey = (ms) => new Date(ms).toISOString().slice(0, 10)

/** The start (ms, UTC) of the billing cycle containing `ms`. */
function cycleStart(ms, startDay = 1) {
  const d = new Date(ms)
  const day = Math.max(1, Math.min(28, startDay | 0 || 1))
  let y = d.getUTCFullYear(); let m = d.getUTCMonth()
  if (d.getUTCDate() < day) { m -= 1; if (m < 0) { m = 11; y -= 1 } }
  return Date.UTC(y, m, day)
}

/**
 * The stop share in force for a provider now. A raise only counts while it is
 * in date and says who made it and why — an anonymous or expired raise is
 * ignored, so the default 50% comes back on its own.
 */
function effectiveStopShare(budget, nowMs) {
  const base = budget.stopAtShareOfPool ?? 0.5
  const r = budget.raise
  if (!r || typeof r.share !== 'number' || !r.by || !r.why || !r.until) return { share: base, raised: false }
  if (Date.parse(r.until) <= nowMs) return { share: base, raised: false, expired: true }
  return { share: Math.min(1, r.share), raised: true, by: r.by, until: r.until }
}

// ─── The guard ──────────────────────────────────────────────────────────────

function createSpendGuard(opts = {}) {
  const now = opts.now || (() => Date.now())
  const ledgerPath = opts.ledgerPath || defaultLedgerPath()
  const alertsPath = opts.alertsPath || ledgerPath.replace(/\.jsonl$/, '') + '.alerts.jsonl'
  const tripsPath = opts.tripsPath || ledgerPath.replace(/\.jsonl$/, '') + '.trips.json'
  const budgetPath = opts.budgetPath === undefined ? defaultBudgetPath() : opts.budgetPath
  const notify = opts.notify || defaultNotify
  const usageReaders = opts.usageReaders || {}
  const log = opts.logger || console

  // Aggregates rebuilt from the ledger, tailed incrementally so every process
  // sees every other process's calls.
  const state = { offset: 0, partial: '', day: new Map(), cycle: new Map(), keys: new Map(), pruneAt: 0 }
  const alerted = new Set()        // alert keys already sent by this process
  const providerBase = new Map()   // provider -> { at, used, ledger }
  const providerCheckedAt = new Map()

  function loadBudgets() {
    let file = {}
    if (budgetPath && fs.existsSync(budgetPath)) {
      try { file = JSON.parse(fs.readFileSync(budgetPath, 'utf8')) } catch (e) {
        throw new TtsSpendGuardError('CONFIG', `budget file ${budgetPath} is unreadable (${e.message}) — refusing to render without a budget`)
      }
    }
    const providers = { ...DEFAULT_BUDGETS }
    for (const [p, b] of Object.entries(file.providers || {})) providers[p] = { ...(DEFAULT_BUDGETS[p] || DEFAULT_BUDGETS.google), ...b }
    return {
      providers,
      repeat: { ...DEFAULT_REPEAT, ...(file.repeat || {}) },
      divergence: { ...DEFAULT_DIVERGENCE, ...(file.divergence || {}) },
    }
  }

  function ingest(e) {
    if (!e || e.kind !== 'call') return
    const at = Date.parse(e.at)
    const cfg = budgetsCache || { providers: DEFAULT_BUDGETS }
    const b = cfg.providers[e.provider] || DEFAULT_BUDGETS.google
    const dk = `${e.provider}|${dayKey(at)}`
    state.day.set(dk, (state.day.get(dk) || 0) + (e.chars || 0))
    const ck = `${e.provider}|${cycleStart(at, b.cycleStartDay)}`
    state.cycle.set(ck, (state.cycle.get(ck) || 0) + (e.chars || 0))
    if (e.key) { const a = state.keys.get(e.key) || []; a.push(at); state.keys.set(e.key, a) }
  }

  let budgetsCache = null
  function refresh() {
    budgetsCache = loadBudgets()
    let fd
    try { fd = fs.openSync(ledgerPath, 'r') } catch (e) {
      if (e.code === 'ENOENT') return
      throw new TtsSpendGuardError('LEDGER', `cannot read the spend ledger ${ledgerPath} (${e.message})`)
    }
    try {
      const size = fs.fstatSync(fd).size
      if (size < state.offset) { state.offset = 0; state.partial = ''; state.day.clear(); state.cycle.clear(); state.keys.clear() }
      const buf = Buffer.alloc(1 << 20)
      while (state.offset < size) {
        const n = fs.readSync(fd, buf, 0, Math.min(buf.length, size - state.offset), state.offset)
        if (n <= 0) break
        state.offset += n
        const chunk = state.partial + buf.toString('utf8', 0, n)
        const lines = chunk.split('\n')
        state.partial = lines.pop()
        for (const l of lines) { if (l) { try { ingest(JSON.parse(l)) } catch { /* torn line: skip */ } } }
      }
    } finally { fs.closeSync(fd) }
    if (now() > state.pruneAt) {
      const cutoff = now() - budgetsCache.repeat.windowHours * 3600e3
      for (const [k, a] of state.keys) { const kept = a.filter(t => t >= cutoff); if (kept.length) state.keys.set(k, kept); else state.keys.delete(k) }
      state.pruneAt = now() + 600e3
    }
  }

  function append(file, obj) {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.appendFileSync(file, JSON.stringify(obj) + '\n')
  }

  function alert(key, level, message, detail = {}) {
    if (alerted.has(key)) return
    alerted.add(key)
    const entry = { at: new Date(now()).toISOString(), level, key, message, ...detail, pid: process.pid }
    try { append(alertsPath, entry) } catch { /* the log line below still says it */ }
    ;(level === 'trip' ? log.error : log.warn).call(log, `[TtsSpendGuard] ${message}`)
    try { Promise.resolve(notify(entry)).catch(() => {}) } catch { /* never block a render on an alert */ }
  }

  function readTrips() {
    try { return JSON.parse(fs.readFileSync(tripsPath, 'utf8')) } catch { return {} }
  }
  function writeTrip(provider, code, message) {
    const trips = readTrips()
    trips[provider] = { code, message, at: new Date(now()).toISOString(), clear: `delete ${tripsPath} (or its "${provider}" key) once a human has looked` }
    try { append(tripsPath + '.log', trips[provider]) } catch {}
    fs.mkdirSync(path.dirname(tripsPath), { recursive: true })
    fs.writeFileSync(tripsPath, JSON.stringify(trips, null, 2))
  }

  function refuse(code, provider, message, detail) {
    alert(`trip:${code}:${provider}:${dayKey(now())}:${detail?.key || ''}`, 'trip', `${provider}: ${message}`, { provider, code, ...detail })
    throw new TtsSpendGuardError(code, message, { provider, ...detail })
  }

  /** Totals for a provider now: { today, cycle, pool, stopShare }. */
  function totals(provider) {
    const b = budgetsCache.providers[provider] || DEFAULT_BUDGETS.google
    const t = now()
    return {
      budget: b,
      today: state.day.get(`${provider}|${dayKey(t)}`) || 0,
      cycle: state.cycle.get(`${provider}|${cycleStart(t, b.cycleStartDay)}`) || 0,
      stop: effectiveStopShare(b, t),
    }
  }

  async function checkProvider(provider, cfg) {
    const reader = usageReaders[provider]
    if (!reader) return
    const last = providerCheckedAt.get(provider) || 0
    if (now() - last < cfg.divergence.checkEveryMinutes * 60e3) return
    providerCheckedAt.set(provider, now())
    let usage
    try { usage = await reader() } catch (e) {
      alert(`usage-unreadable:${provider}:${dayKey(now())}`, 'warn', `${provider}: provider usage could not be read (${e.message}) — relying on the ledger alone`)
      return
    }
    if (!usage || typeof usage.usedChars !== 'number') return
    const { cycle, budget, stop } = totals(provider)
    const pool = usage.limitChars || budget.monthlyPoolChars
    if (usage.usedChars >= stop.share * pool) {
      writeTrip(provider, 'PROVIDER_POOL', `the provider itself reports ${usage.usedChars} of ${pool} chars used, past the ${Math.round(stop.share * 100)}% stop`)
      refuse('PROVIDER_POOL', provider, `the provider reports ${usage.usedChars.toLocaleString()} of ${pool.toLocaleString()} characters used — past the ${Math.round(stop.share * 100)}% stop share`, { usedChars: usage.usedChars, pool })
    }
    const base = providerBase.get(provider)
    if (!base) { providerBase.set(provider, { used: usage.usedChars, ledger: cycle }); return }
    const providerDelta = usage.usedChars - base.used
    const ledgerDelta = cycle - base.ledger
    if (providerDelta > cfg.divergence.factor * ledgerDelta + cfg.divergence.slackChars) {
      const msg = `provider billed ${providerDelta.toLocaleString()} chars since this process's baseline but the ledger recorded ${ledgerDelta.toLocaleString()} — something is spending outside the door`
      writeTrip(provider, 'PROVIDER_DIVERGENCE', msg)
      refuse('PROVIDER_DIVERGENCE', provider, msg, { providerDelta, ledgerDelta })
    }
  }

  /**
   * Call immediately before a paid provider call. Throws TtsSpendGuardError to
   * refuse; otherwise records the call in the ledger and returns its entry.
   * ctx: { provider, voiceId, text, courseCode, job, language, attempt }
   */
  async function beforeProviderCall(ctx) {
    const provider = String(ctx.provider || 'unknown')
    const text = String(ctx.text || '')
    const chars = text.length
    refresh()
    const cfg = budgetsCache

    const trip = readTrips()[provider]
    if (trip) refuse('TRIPPED', provider, `renders are stopped for ${provider} since ${trip.at}: ${trip.message}. ${trip.clear}`, {})

    const { today, cycle, budget, stop } = totals(provider)
    const pool = budget.monthlyPoolChars
    if (today + chars > budget.dailyCapChars) {
      refuse('DAILY_CAP', provider, `today's ${provider} spend is ${today.toLocaleString()} chars; this call (${chars}) would pass the daily cap of ${budget.dailyCapChars.toLocaleString()}. Raise dailyCapChars in ${budgetPath} if a human approved more.`, { today, cap: budget.dailyCapChars })
    }
    if (cycle + chars > stop.share * pool) {
      refuse('POOL_SHARE', provider, `this cycle's ${provider} spend is ${cycle.toLocaleString()} of a ${pool.toLocaleString()}-char pool; the stop is ${Math.round(stop.share * 100)}%${stop.raised ? ` (raised by ${stop.by} until ${stop.until})` : ''}. A raise needs share, by, why and until in ${budgetPath}.`, { cycle, pool, stopShare: stop.share })
    }
    const key = repeatKey(provider, ctx.voiceId, text)
    const seen = (state.keys.get(key) || []).filter(t => t >= now() - cfg.repeat.windowHours * 3600e3).length
    if (seen >= cfg.repeat.maxPerKey) {
      refuse('REPEAT', provider, `"${text.slice(0, 40)}" in ${ctx.voiceId || '?'} has already been sent ${seen} times in ${cfg.repeat.windowHours}h (limit ${cfg.repeat.maxPerKey}) — a caller is re-rendering what it already has`, { key, seen, course: ctx.courseCode || null, job: ctx.job || null })
    }

    await checkProvider(provider, cfg)

    const entry = {
      kind: 'call', at: new Date(now()).toISOString(), provider, voice: ctx.voiceId || null, chars,
      course: ctx.courseCode || null, job: ctx.job || process.env.TTS_SPEND_JOB || null,
      language: ctx.language || null, text_hash: textHash(text), key, attempt: ctx.attempt || 1, pid: process.pid,
    }
    try { append(ledgerPath, entry) } catch (e) {
      throw new TtsSpendGuardError('LEDGER', `cannot write the spend ledger ${ledgerPath} (${e.message}) — refusing to render unrecorded`)
    }
    // Our own line is counted by reading it back with everyone else's — never
    // by skipping ahead, which would drop a neighbour's line appended meanwhile.
    refresh()

    // Alerts on crossing lines (once per process per line per day/cycle).
    const after = totals(provider)
    if (after.today >= budget.alertDailyChars) {
      alert(`daily:${provider}:${dayKey(now())}`, 'warn', `${provider} spend today has reached ${after.today.toLocaleString()} chars (alert line ${budget.alertDailyChars.toLocaleString()}, cap ${budget.dailyCapChars.toLocaleString()})`, { provider })
    }
    for (const s of POOL_ALERT_SHARES) {
      if (after.cycle >= s * pool) alert(`pool:${provider}:${s}:${cycleStart(now(), budget.cycleStartDay)}`, 'warn', `${provider} has used ${Math.round(100 * after.cycle / pool)}% of its ${pool.toLocaleString()}-char pool this cycle (line ${s * 100}%)`, { provider })
    }
    return entry
  }

  /** Read-only snapshot for a status route or a driver. */
  function snapshot(provider) { refresh(); const t = totals(provider); return { provider, todayChars: t.today, cycleChars: t.cycle, pool: t.budget.monthlyPoolChars, dailyCap: t.budget.dailyCapChars, stopShare: t.stop.share, tripped: readTrips()[provider] || null } }

  return { beforeProviderCall, snapshot, ledgerPath, alertsPath, tripsPath }
}

// ─── Human alert: one line into the command surface's needs-you ────────────

/**
 * POST the alert to the surface (loopback identity, the same way
 * ops/watchdog/holmes-availability-sentinel.sh escalates). Fire-and-forget,
 * 5s timeout. TTS_SPEND_ALERTS=0 turns the POST off (the log and the alerts
 * file still carry it).
 */
async function defaultNotify(entry) {
  if (process.env.TTS_SPEND_ALERTS === '0' || process.env.VITEST) return
  const surface = process.env.CS_SURFACE || 'http://localhost:4317'
  const text = `TTS SPEND ${entry.level === 'trip' ? 'GUARD TRIPPED' : 'ALERT'} on ${os.hostname()}: ${entry.message}`
  const headers = { 'Content-Type': 'application/json', Origin: surface }
  if (process.env.CS_COOKIE) headers.Cookie = `cs_user=${process.env.CS_COOKIE}`
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 5000)
  try { await fetch(`${surface}/api/needs-you`, { method: 'POST', headers, body: JSON.stringify({ text }), signal: ctl.signal }) } finally { clearTimeout(t) }
}

// ─── Provider usage readers ─────────────────────────────────────────────────

/**
 * Readers return { usedChars, limitChars } for the current billing cycle, or
 * null when the provider cannot say. ElevenLabs publishes it
 * (GET /v1/user/subscription: character_count / character_limit). Cartesia's
 * usage endpoint could not be verified (its API docs sit behind a login, job
 * #425), so it is read only from CARTESIA_USAGE_URL when someone who has seen
 * the endpoint sets it, with the fields named by CARTESIA_USAGE_USED_FIELD /
 * CARTESIA_USAGE_LIMIT_FIELD.
 */
function liveUsageReaders(env = process.env) {
  const readers = {}
  if (env.ELEVENLABS_API_KEY) {
    readers.elevenlabs = async () => {
      const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': env.ELEVENLABS_API_KEY } })
      if (!r.ok) throw new Error(`elevenlabs subscription ${r.status}`)
      const j = await r.json()
      return { usedChars: j.character_count, limitChars: j.character_limit }
    }
  }
  if (env.CARTESIA_API_KEY && env.CARTESIA_USAGE_URL) {
    readers.cartesia = async () => {
      const r = await fetch(env.CARTESIA_USAGE_URL, { headers: { Authorization: `Bearer ${env.CARTESIA_API_KEY}`, 'X-API-Key': env.CARTESIA_API_KEY, 'Cartesia-Version': env.CARTESIA_VERSION || '2025-04-16' } })
      if (!r.ok) throw new Error(`cartesia usage ${r.status}`)
      const j = await r.json()
      const pick = (o, dotted) => String(dotted).split('.').reduce((v, k) => (v == null ? v : v[k]), o)
      return { usedChars: Number(pick(j, env.CARTESIA_USAGE_USED_FIELD || 'used')), limitChars: Number(pick(j, env.CARTESIA_USAGE_LIMIT_FIELD || 'limit')) || null }
    }
  }
  return readers
}

// ─── The process-wide guard every door uses ─────────────────────────────────

let shared = null
function spendGuard() {
  if (!shared) shared = createSpendGuard({ usageReaders: liveUsageReaders() })
  return shared
}
/** Tests inject a guard (or null to rebuild the default). */
function useSpendGuard(g) { shared = g }

module.exports = {
  createSpendGuard,
  spendGuard,
  useSpendGuard,
  liveUsageReaders,
  TtsSpendGuardError,
  repeatKey,
  repeatTextKey,
  cycleStart,
  effectiveStopShare,
  DEFAULT_BUDGETS,
  DEFAULT_REPEAT,
}
