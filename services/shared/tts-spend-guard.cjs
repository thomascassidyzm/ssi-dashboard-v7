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
 * missing. It sits at the provider call itself — the guarded doors listed in
 * tools/check-tts-door.cjs GUARDED_DOORS — and, before EVERY attempt (a retry
 * or a re-roll is billed like the first):
 *
 *   1. RESERVE   one atomic call to the SHARED ledger (Supabase,
 *                ops/sql/20260927-tts-spend-ledger.sql tts_spend_reserve):
 *                under a per-provider advisory lock it checks the provider's
 *                trip, its spend today against the daily cap, its spend this
 *                billing cycle against the stop share of the monthly pool, and
 *                how often these same words + voice + provider were sent in the
 *                repeat window — and inserts the reservation in the SAME
 *                transaction. Every host and every worker queues on one lock,
 *                so none of them can overshoot a cap (job #430; #425's
 *                host-local check-then-append could, on both counts).
 *   2. MIRROR    a local JSONL, written AHEAD of the reservation (intent) and
 *                after it (call / refused). It is a record for the host, never
 *                the authority: nothing reads it to decide.
 *   3. LIMITS    the committed baseline (DEFAULT_BUDGETS, in this file) holds
 *                unless ops/tts-spend-budgets.json lowers it — or raises it
 *                with a signed, dated, expiring raise (by / why / until, at most
 *                RAISE_MAX_DAYS out). An unsigned raise is ignored and alerted;
 *                an override file from TTS_SPEND_BUDGETS is ignored unless it is
 *                signed. Every change in the limits in force is alerted here and
 *                logged in the DB (tts_spend_limit_log) with the host.
 *   4. PROVIDER  where the provider reports its own usage (ElevenLabs
 *                /v1/user/subscription; Cartesia /usage/credits with an ADMIN
 *                key), compares it with the ledger; if the provider has billed
 *                materially more, something spends outside the door: the
 *                provider is tripped on every host. If a configured reader
 *                CANNOT be read, the guard fails closed past a small allowance
 *                (tiny calls pass, runs stop) and says so.
 *   5. ALERT     any refusal, any first crossing of a daily alert line or of
 *                50% / 80% of a pool, any limits change, posts ONE line to a
 *                human (the command surface's needs-you), logs it loudly, and
 *                appends it to an alerts file beside the mirror.
 *
 * A refusal throws TtsSpendGuardError, whose message carries "(402)" so the
 * door's retry classifier treats it as a non-retriable client error — a
 * refused call is never re-rolled.
 *
 * Fail CLOSED throughout: an unreachable ledger DB, an unreadable budget file,
 * an unwritable mirror, a malformed answer from the DB — each refuses the
 * render. A render the guard cannot account for is a render it cannot bound.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')

// ─── Configuration ──────────────────────────────────────────────────────────

/**
 * THE COMMITTED BASELINE. Characters, not dollars (Kai reads TTS in characters
 * against the pool). cycleStartDay: the day of the month the pool resets (UTC)
 * — for Cartesia NOT KNOWN to this repo (job #430 gap); 1 until someone reads
 * it off the Cartesia dashboard. The budget file may LOWER any of these freely;
 * anything looser needs a signed raise.
 */
const DEFAULT_BUDGETS = Object.freeze({
  cartesia:   Object.freeze({ monthlyPoolChars: 8_000_000, cycleStartDay: 1, dailyCapChars: 1_000_000, alertDailyChars: 300_000, stopAtShareOfPool: 0.5 }),
  elevenlabs: Object.freeze({ monthlyPoolChars: 2_000_000, cycleStartDay: 1, dailyCapChars:   200_000, alertDailyChars:  50_000, stopAtShareOfPool: 0.5 }),
  xai:        Object.freeze({ monthlyPoolChars: 5_000_000, cycleStartDay: 1, dailyCapChars:   500_000, alertDailyChars: 150_000, stopAtShareOfPool: 0.5 }),
  azure:      Object.freeze({ monthlyPoolChars: 5_000_000, cycleStartDay: 1, dailyCapChars:   500_000, alertDailyChars: 150_000, stopAtShareOfPool: 0.5 }),
  google:     Object.freeze({ monthlyPoolChars: 1_000_000, cycleStartDay: 1, dailyCapChars:   100_000, alertDailyChars:  30_000, stopAtShareOfPool: 0.5 }),
})
/** Any provider not named above (a bake-off candidate, a new vendor): the tightest. */
const UNKNOWN_PROVIDER_BUDGET = Object.freeze({ monthlyPoolChars: 200_000, cycleStartDay: 1, dailyCapChars: 20_000, alertDailyChars: 5_000, stopAtShareOfPool: 0.5 })
const DEFAULT_REPEAT = Object.freeze({ maxPerKey: 6, windowHours: 24 })
/** Pool shares at which a human is told, whatever the stop share is. */
const POOL_ALERT_SHARES = [0.5, 0.8]
/**
 * Provider-vs-ledger: trip when the provider's delta exceeds ours by this factor
 * AND this many chars. unverifiedAllowanceChars: what one process may reserve
 * while a CONFIGURED usage reader cannot be read — tiny calls pass, runs stop.
 */
/**
 * A provider with no usage reader is a KNOWN LIMIT, never a decision: said ONCE
 * per host (the alerts log remembers it across processes and days), never
 * re-raised daily (job #515 for Cartesia, #521 for Azure and every other).
 * Each entry names what would switch the provider check on; a provider not
 * listed gets NO_READER_LIMIT. Cartesia's /usage/credits answers only an admin
 * key (401 on the normal key: job #440, re-checked job #515).
 */
const KNOWN_USAGE_LIMITS = Object.freeze({
  azure: 'Azure Speech has no usage reader here: the AZURE_SPEECH_KEY can synthesise but cannot see the account\'s usage or bill, so Azure spend is checked against our ledger alone and anything spent outside the door (another script, a colleague, Speech Studio) is invisible. Known limit, said once and not raised again. What would switch the provider check on: a reader in liveUsageReaders on Azure Monitor (the Speech resource\'s SynthesizedCharacters metric) or Azure Cost Management (the Speech meter\'s cost this cycle), plus the credential it needs — an Entra service principal (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET) granted Monitoring Reader or Cost Management Reader on the subscription, and AZURE_SPEECH_RESOURCE_ID naming the resource.',
  cartesia: 'Cartesia shows account usage (/usage/credits) only to an ADMIN key, and this estate has only the normal key (401) — so Cartesia spend is checked against our ledger alone and anything spent outside the door (another script, a colleague, the playground) is invisible. Known limit, said once and not raised again; set CARTESIA_ADMIN_API_KEY (play.cartesia.ai/keys/admin) and the provider check switches on by itself.',
})
const NO_READER_LIMIT = 'no provider-usage reader is configured, so its spend is checked against our ledger alone and anything spent outside the door is invisible. Known limit, said once and not raised again; a reader for it in liveUsageReaders (and the credential that reader needs) switches the provider check on.'
const DEFAULT_DIVERGENCE = Object.freeze({ factor: 1.25, slackChars: 20_000, checkEveryMinutes: 10, unverifiedAllowanceChars: 20_000, retryUnreadableMinutes: 1 })
/** A job raise names its job the way the estate writes it: "#578". */
const JOB_TOKEN = /^#\d+$/
/** Does a call's job text (ctx.job / TTS_SPEND_JOB) belong to this job token? "#578" matches "... (job #578)" and "#578·I", never "#5780". */
function jobMatches(jobText, token) {
  if (!jobText || !token) return false
  return new RegExp(`${token.replace('#', '#')}(?!\\d)`).test(String(jobText))
}
/** How long a read of a job's spend today is reused before the ledger is asked again. */
const JOB_SPEND_CACHE_MS = 30_000
/** A raise may not be dated further out than this: raises expire on their own. */
const RAISE_MAX_DAYS = 31

/**
 * Which way is LOOSER for each limit — a value on the loose side of the
 * baseline needs a signed raise. cycleStartDay loosens in either direction (a
 * wrong reset day resets the count mid-cycle), so any change needs signing.
 */
const LOOSER = {
  monthlyPoolChars: 'higher', dailyCapChars: 'higher', alertDailyChars: 'higher', stopAtShareOfPool: 'higher', cycleStartDay: 'any',
  maxPerKey: 'higher', windowHours: 'lower',
  factor: 'higher', slackChars: 'higher', checkEveryMinutes: 'higher', unverifiedAllowanceChars: 'higher', retryUnreadableMinutes: 'higher',
}

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const COMMITTED_BUDGET_PATH = path.join(REPO_ROOT, 'ops', 'tts-spend-budgets.json')

function defaultMirrorPath() {
  if (process.env.TTS_SPEND_LEDGER) return process.env.TTS_SPEND_LEDGER
  // Tests never write the host's real mirror.
  if (process.env.VITEST) return path.join(os.tmpdir(), `tts-spend-ledger-test-${process.pid}.jsonl`)
  return path.join(os.homedir(), '.local', 'state', 'ssi-tts-spend', 'ledger.jsonl')
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
    .replace(/[\s ]+/g, ' ')
    .replace(/[.,!?;:"'“”‘’()\[\]{}…—–\-।॥¿¡。？！、，]/g, '')
    .trim()
}
function repeatKey(provider, voiceId, text) {
  return crypto.createHash('sha1').update(`${provider}|${voiceId || '?'}|${repeatTextKey(text)}`).digest('hex').slice(0, 20)
}
function textHash(text) {
  return crypto.createHash('sha1').update(String(text || '')).digest('hex').slice(0, 16)
}
// Refusals that hold until the billing cycle resets: alerted once per caller per cycle.
const CYCLE_STOPS = new Set(['POOL_SHARE', 'PROVIDER_POOL'])
const dayKey = (ms) => new Date(ms).toISOString().slice(0, 10)
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')

/** The start (ms, UTC) of the billing cycle containing `ms`. */
function cycleStart(ms, startDay = 1) {
  const d = new Date(ms)
  const day = Math.max(1, Math.min(28, startDay | 0 || 1))
  let y = d.getUTCFullYear(); let m = d.getUTCMonth()
  if (d.getUTCDate() < day) { m -= 1; if (m < 0) { m = 11; y -= 1 } }
  return Date.UTC(y, m, day)
}

/** Is a raise block in force? { ok, why } — signed (by + why), dated, not expired, not too far out. */
function raiseInForce(r, nowMs) {
  if (!r || typeof r !== 'object') return { ok: false, why: 'no raise' }
  if (!r.by || !r.why || !r.until) return { ok: false, why: 'a raise needs by, why and until' }
  const until = Date.parse(r.until)
  if (!Number.isFinite(until)) return { ok: false, why: `until "${r.until}" is not a date` }
  if (until <= nowMs) return { ok: false, why: `expired ${r.until}`, expired: true }
  if (until - nowMs > RAISE_MAX_DAYS * 86400e3) return { ok: false, why: `until ${r.until} is more than ${RAISE_MAX_DAYS} days out — raises must expire` }
  return { ok: true }
}

const isLooser = (field, value, base) => {
  const dir = LOOSER[field]
  if (typeof value !== 'number' || !Number.isFinite(value)) return true   // garbage is never accepted
  if (dir === 'higher') return value > base
  if (dir === 'lower') return value < base
  return value !== base
}

/**
 * Merge one block of limits over its committed baseline. Tightening is free;
 * loosening needs `raise` in force (fields named inside the raise block, or the
 * legacy `raise.share` for stopAtShareOfPool). Returns { limits, notes }.
 */
function applyLimits(base, block, nowMs, label) {
  const limits = { ...base }
  const notes = []
  const raise = block && block.raise
  const rs = raise ? raiseInForce(raise, nowMs) : { ok: false }
  const requested = { ...(block || {}) }
  delete requested.raise
  if (raise) {
    for (const [k, v] of Object.entries(raise)) if (k in LOOSER) requested[k] = v
    if (typeof raise.share === 'number') requested.stopAtShareOfPool = raise.share
  }
  for (const [k, v] of Object.entries(requested)) {
    if (!(k in LOOSER)) continue
    if (!(k in base)) continue
    if (!isLooser(k, v, base[k])) { limits[k] = v; continue }
    const raisedHere = raise && (k in raise || (k === 'stopAtShareOfPool' && typeof raise.share === 'number'))
    if (raisedHere && rs.ok && typeof v === 'number' && Number.isFinite(v)) { limits[k] = v; notes.push({ kind: 'raise', label, field: k, value: v, by: raise.by, why: raise.why, until: raise.until }); continue }
    notes.push({ kind: 'ignored', label, field: k, value: v, why: raisedHere ? rs.why : 'looser than the committed baseline without a signed raise' })
  }
  if (limits.stopAtShareOfPool > 1) limits.stopAtShareOfPool = 1
  return { limits, notes }
}

/** The stop share in force for a provider now (kept for callers of #425's API). */
function effectiveStopShare(budget, nowMs) {
  const base = budget.stopAtShareOfPool ?? 0.5
  const r = budget.raise
  if (!r || typeof r.share !== 'number') return { share: base, raised: false }
  const rs = raiseInForce(r, nowMs)
  if (!rs.ok) return { share: base, raised: false, expired: !!rs.expired }
  return { share: Math.min(1, r.share), raised: true, by: r.by, until: r.until }
}

/**
 * Read the limits in force: the committed baseline, then the budget file.
 * `budgetPath` null = baseline only (tests). An override path from the env is
 * honoured only when the file carries a signed, in-date `signed` block;
 * otherwise the committed file is read instead and a note says why.
 */
function loadLimits({ budgetPath, envOverride, nowMs }) {
  const notes = []
  let file = {}
  let source = budgetPath
  if (envOverride) {
    const f = readBudgetFile(envOverride)
    const rs = raiseInForce(f.signed, nowMs)
    if (rs.ok) { file = f; source = envOverride; notes.push({ kind: 'override', label: 'file', value: envOverride, by: f.signed.by, why: f.signed.why, until: f.signed.until }) }
    else { notes.push({ kind: 'ignored', label: 'file', field: 'TTS_SPEND_BUDGETS', value: envOverride, why: `an override budget file must carry signed: { by, why, until } in date (${rs.why}) — using the committed file` }); source = budgetPath }
  }
  if (source === budgetPath && budgetPath && fs.existsSync(budgetPath)) file = readBudgetFile(budgetPath)
  const providers = {}
  const names = new Set([...Object.keys(DEFAULT_BUDGETS), ...Object.keys(file.providers || {})])
  for (const p of names) {
    const { limits, notes: n } = applyLimits(DEFAULT_BUDGETS[p] || UNKNOWN_PROVIDER_BUDGET, (file.providers || {})[p], nowMs, `providers.${p}`)
    // A RETIRED provider (Tom 2026-09-28, job #575: "We don't use Eleven Labs
    // any more"): the budget file names it with a reason, and every call to it
    // is refused before the ledger is touched. Switching a provider off is a
    // tightening, so it needs no signature; switching it back on is deleting it.
    const block = (file.providers || {})[p]
    if (block && typeof block.retired === 'string' && block.retired.trim()) limits.retired = block.retired.trim()
    providers[p] = limits; notes.push(...n)
  }
  const rep = applyLimits(DEFAULT_REPEAT, file.repeat, nowMs, 'repeat'); notes.push(...rep.notes)
  const div = applyLimits(DEFAULT_DIVERGENCE, file.divergence, nowMs, 'divergence'); notes.push(...div.notes)
  // A standing HOLD (Tom 2026-09-28, job #569: "there should be no big audio
  // jobs going at all"): the budget file lowers every daily cap to a small-job
  // ceiling and names who lifts it. Its message rides every DAILY_CAP refusal,
  // so whoever hits the cap reads that the answer is Tom's go, not a workaround.
  // Tom 2026-09-28 (job #570): the hold's limit is ONE daily figure across every
  // provider together (Cartesia + Azure + the rest), not per provider — so the
  // hold may carry combinedDailyCapChars, checked against the sum of today's
  // spend on all of them. Each provider's own dailyCapChars stays the atomic
  // backstop; the combined sum is read, not locked, so concurrent hosts can
  // overshoot it by at most one in-flight clip each.
  const combined = file.hold && Number.isFinite(file.hold.combinedDailyCapChars) && file.hold.combinedDailyCapChars > 0 ? file.hold.combinedDailyCapChars : null
  const hold = file.hold && typeof file.hold.message === 'string' ? { by: file.hold.by || null, since: file.hold.since || null, message: file.hold.message, combinedDailyCapChars: combined } : null
  // JOB-SCOPED RAISES (Tom 2026-09-28, job #578): Tom's explicit go for ONE
  // job above the daily cap must not become a looser cap for everybody. A raise
  // here names the job ("#578") and a character allowance of its OWN for today;
  // that job's calls draw on the allowance instead of the daily caps, and every
  // other caller is checked as though the job's spend today had never happened
  // (its caps are lifted by exactly what the job has spent). So Tom's go cannot
  // starve a job he triggers later the same day, and nothing else gets looser.
  // Signed, dated and expiring like every raise; a malformed one is ignored and alerted.
  const jobRaises = []
  for (const r of Array.isArray(file.jobRaises) ? file.jobRaises : []) {
    const rs = raiseInForce(r, nowMs)
    const shaped = r && typeof r.job === 'string' && JOB_TOKEN.test(r.job.trim()) && Number.isFinite(r.extraDailyChars) && r.extraDailyChars > 0
    if (rs.ok && shaped) {
      jobRaises.push({ job: r.job.trim(), extraDailyChars: r.extraDailyChars, by: r.by, why: r.why, until: r.until })
      notes.push({ kind: 'raise', label: `jobRaises[${r.job.trim()}]`, field: 'extraDailyChars', value: r.extraDailyChars, by: r.by, why: r.why, until: r.until })
    } else {
      notes.push({ kind: 'ignored', label: 'jobRaises', field: String(r && r.job), value: r && r.extraDailyChars, why: rs.ok ? 'a job raise needs job "#NNN" and a positive extraDailyChars' : rs.why })
    }
  }
  return { providers, repeat: rep.limits, divergence: div.limits, notes, source, hold, jobRaises }
}
function readBudgetFile(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch (e) {
    throw new TtsSpendGuardError('CONFIG', `budget file ${p} is unreadable (${e.message}) — refusing to render without a budget`)
  }
}

// ─── Ledger stores ──────────────────────────────────────────────────────────
//
// A store is { reserve(req) → { ok, id?, code?, message?, today, cycle, seen },
// settle(id, status, note), trip(provider, code, message), totals(provider,
// cycleStartDay) → { today, cycle, tripped } }. reserve MUST be atomic: its
// check and its insert cannot interleave with another reserve for the same
// provider, in this process or any other.

/**
 * The authoritative store: the shared DB over PostgREST (service role). Every
 * host that renders reads and writes the same rows.
 */
function supabaseSpendStore({ client, url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY } = {}) {
  let c = client
  const db = () => {
    if (c) return c
    if (!url || !key) throw new Error('no spend ledger database: SUPABASE_URL and a service-role key are not set')
    const { createClient } = require('@supabase/supabase-js')
    c = createClient(url, key, { auth: { persistSession: false } })
    return c
  }
  const rpc = async (fn, args) => {
    const { data, error } = await db().rpc(fn, args)
    if (error) throw new Error(`${fn}: ${error.message}${error.code === 'PGRST202' ? ' — has ops/sql/20260927-tts-spend-ledger.sql been applied?' : ''}`)
    return data
  }
  return {
    kind: 'supabase',
    async reserve(r) { return rpc('tts_spend_reserve', reserveArgs(r)) },
    async settle(id, status, note) { await rpc('tts_spend_settle', { p_id: id, p_status: status, p_note: note || null }) },
    async trip(provider, code, message) { await rpc('tts_spend_trip', { p_provider: provider, p_code: code, p_message: message, p_host: os.hostname() }) },
    async totals(provider, cycleStartDay) { return rpc('tts_spend_totals', { p_provider: provider, p_cycle_start_day: cycleStartDay }) },
    /** Chars spent today (UTC) under a job token, by provider. Paged: a job's day can be thousands of rows. */
    async jobToday(token) {
      const from = new Date(Date.parse(dayKey(Date.now()) + 'T00:00:00Z')).toISOString()
      const byProvider = {}
      for (let off = 0; ; off += 1000) {
        const { data, error } = await db().from('tts_spend_ledger').select('provider,chars,job').gte('at', from).ilike('job', `%${token}%`).order('id').range(off, off + 999)
        if (error) throw new Error(`tts_spend_ledger: ${error.message}`)
        for (const r of data || []) if (jobMatches(r.job, token)) byProvider[r.provider] = (byProvider[r.provider] || 0) + (Number(r.chars) || 0)
        if (!data || data.length < 1000) break
      }
      return byProvider
    },
  }
}

/** The same functions over a direct Postgres connection (node-postgres pool). */
function pgSpendStore({ pool, connectionString = process.env.DATABASE_URL } = {}) {
  let p = pool
  const db = () => {
    if (p) return p
    if (!connectionString) throw new Error('no spend ledger database: DATABASE_URL is not set')
    const { Pool } = require('pg')
    p = new Pool({ connectionString, max: 4 })
    return p
  }
  const call = async (sql, vals) => (await db().query(sql, vals)).rows[0]
  return {
    kind: 'pg',
    async reserve(r) {
      const a = reserveArgs(r)
      const row = await call('select public.tts_spend_reserve($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) as r',
        [a.p_provider, a.p_voice, a.p_chars, a.p_repeat_key, a.p_text_hash, a.p_course, a.p_job, a.p_language, a.p_attempt, a.p_host, a.p_pid,
          a.p_daily_cap, a.p_cycle_start_day, a.p_cycle_cap, a.p_repeat_max, a.p_repeat_window_hours, a.p_limits])
      return row.r
    },
    async settle(id, status, note) { await call('select public.tts_spend_settle($1,$2,$3)', [id, status, note || null]) },
    async trip(provider, code, message) { await call('select public.tts_spend_trip($1,$2,$3,$4)', [provider, code, message, os.hostname()]) },
    async totals(provider, cycleStartDay) { return (await call('select public.tts_spend_totals($1,$2) as t', [provider, cycleStartDay])).t },
    async jobToday(token) {
      const { rows } = await db().query(`select provider, job, chars from public.tts_spend_ledger where at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' and job like $1`, [`%${token}%`])
      const byProvider = {}
      for (const r of rows) if (jobMatches(r.job, token)) byProvider[r.provider] = (byProvider[r.provider] || 0) + (Number(r.chars) || 0)
      return byProvider
    },
    end() { return p && p.end() },
  }
}

function reserveArgs(r) {
  return {
    p_provider: r.provider, p_voice: r.voice, p_chars: r.chars, p_repeat_key: r.key, p_text_hash: r.textHash,
    p_course: r.course, p_job: r.job, p_language: r.language, p_attempt: r.attempt, p_host: os.hostname(), p_pid: process.pid,
    p_daily_cap: r.dailyCap != null ? r.dailyCap : r.limits.dailyCapChars, p_cycle_start_day: r.limits.cycleStartDay, p_cycle_cap: r.limits.cycleCapChars,
    p_repeat_max: r.limits.maxPerKey, p_repeat_window_hours: r.limits.windowHours, p_limits: r.limits,
  }
}

/**
 * In-memory store with the SQL function's semantics, for tests. Stores are
 * shared by name, so two guards given the same ledgerPath see one ledger (the
 * way two hosts see one DB). reserve is synchronous inside, so it is atomic
 * within the process — the property the DB lock gives across processes.
 */
const memoryStores = new Map()
function memorySpendStore({ name, now = () => Date.now() } = {}) {
  if (name && memoryStores.has(name)) return memoryStores.get(name)
  const rows = []; const trips = new Map(); const limitLog = []
  const sum = (provider, fromMs) => rows.filter(r => r.provider === provider && r.at >= fromMs).reduce((n, r) => n + r.chars, 0)
  const store = {
    kind: 'memory', rows, trips, limitLog,
    async reserve(r) {
      const t = now()
      if (trips.has(r.provider)) { const tr = trips.get(r.provider); return { ok: false, code: 'TRIPPED', message: `renders are stopped for ${r.provider} since ${tr.at}: ${tr.message}. Clear: delete the trip row once a human has looked` } }
      const dayStart = Date.parse(dayKey(t) + 'T00:00:00Z')
      const today = sum(r.provider, dayStart)
      const cycle = sum(r.provider, cycleStart(t, r.limits.cycleStartDay))
      const seen = r.key ? rows.filter(x => x.key === r.key && x.kind === 'call' && x.at >= t - r.limits.windowHours * 3600e3).length : 0
      const h = JSON.stringify(r.limits)
      if (limitLog.filter(l => l.provider === r.provider).pop()?.h !== h) limitLog.push({ provider: r.provider, h, limits: r.limits })
      const dailyCap = r.dailyCap != null ? r.dailyCap : r.limits.dailyCapChars
      if (today + r.chars > dailyCap) return { ok: false, code: 'DAILY_CAP', today, cycle, seen, message: `today's ${r.provider} spend is ${today} chars; this call (${r.chars}) would pass the daily cap of ${dailyCap}` }
      if (cycle + r.chars > r.limits.cycleCapChars) return { ok: false, code: 'POOL_SHARE', today, cycle, seen, message: `this cycle's ${r.provider} spend is ${cycle} chars; this call (${r.chars}) would pass the cycle stop of ${r.limits.cycleCapChars}` }
      if (r.key && seen >= r.limits.maxPerKey) return { ok: false, code: 'REPEAT', today, cycle, seen, message: `these words in voice ${r.voice || '?'} have already been sent ${seen} times in ${r.limits.windowHours}h (limit ${r.limits.maxPerKey}) — a caller is re-rendering what it already has` }
      const id = rows.length + 1
      rows.push({ id, at: t, kind: 'call', provider: r.provider, voice: r.voice, chars: r.chars, key: r.key, job: r.job || null, status: 'reserved' })
      return { ok: true, id, today: today + r.chars, cycle: cycle + r.chars, seen: seen + 1 }
    },
    async settle(id, status) { const row = rows[id - 1]; if (row && row.status === 'reserved') row.status = status },
    async trip(provider, code, message) { if (!trips.has(provider)) trips.set(provider, { code, message, at: new Date(now()).toISOString() }) },
    async jobToday(token) {
      const from = Date.parse(dayKey(now()) + 'T00:00:00Z')
      const byProvider = {}
      for (const r of rows) if (r.at >= from && jobMatches(r.job, token)) byProvider[r.provider] = (byProvider[r.provider] || 0) + r.chars
      return byProvider
    },
    async totals(provider, cycleStartDay) {
      const t = now()
      return { today: sum(provider, Date.parse(dayKey(t) + 'T00:00:00Z')), cycle: sum(provider, cycleStart(t, cycleStartDay)), tripped: trips.get(provider) || null }
    },
    /** Test helper: a row spent at a given time (the September seed, say). */
    seed(provider, chars, atMs) { rows.push({ id: rows.length + 1, at: atMs, kind: 'seed', provider, chars, status: 'seed' }) },
  }
  if (name) memoryStores.set(name, store)
  return store
}

/** The store a guard uses when none is injected. */
function defaultStore(mirrorPath, now) {
  if (process.env.VITEST) return memorySpendStore({ name: mirrorPath, now })
  if (process.env.TTS_SPEND_STORE === 'pg') return pgSpendStore()
  return supabaseSpendStore()
}

// ─── The guard ──────────────────────────────────────────────────────────────

function createSpendGuard(opts = {}) {
  const now = opts.now || (() => Date.now())
  const mirrorPath = opts.ledgerPath || defaultMirrorPath()
  const alertsPath = opts.alertsPath || mirrorPath.replace(/\.jsonl$/, '') + '.alerts.jsonl'
  const budgetPath = opts.budgetPath === undefined ? COMMITTED_BUDGET_PATH : opts.budgetPath
  const envOverride = opts.budgetOverridePath === undefined ? (process.env.TTS_SPEND_BUDGETS || null) : opts.budgetOverridePath
  const store = opts.store || defaultStore(mirrorPath, now)
  const notify = opts.notify || defaultNotify
  const usageReaders = opts.usageReaders || {}
  const log = opts.logger || console

  const alerted = new Set()        // alert keys already sent by this process
  let lastLimitsHash = null
  const usage = new Map()          // provider -> { checkedAt, ok, base, unverifiedChars }
  const jobSpend = new Map()       // job token -> { at, byProvider } (ledger read, topped up by this process's own reservations)

  async function jobSpentToday(token) {
    const c = jobSpend.get(token)
    if (c && c.day === dayKey(now()) && now() - c.at < JOB_SPEND_CACHE_MS) return c.byProvider
    let byProvider
    try { byProvider = await store.jobToday(token) } catch (e) {
      throw new TtsSpendGuardError('LEDGER', `cannot read job ${token}'s spend today from the ledger (${e.message}) — refusing to render unrecorded`, {})
    }
    jobSpend.set(token, { at: now(), day: dayKey(now()), byProvider })
    return byProvider
  }
  const sumChars = (byProvider) => Object.values(byProvider).reduce((n, v) => n + (Number(v) || 0), 0)

  function limitsNow() {
    const cfg = loadLimits({ budgetPath, envOverride, nowMs: now() })
    const h = sha(JSON.stringify({ p: cfg.providers, r: cfg.repeat, d: cfg.divergence, j: cfg.jobRaises }))
    if (h !== lastLimitsHash) {
      // Every change in the limits in force, and every raise or ignored
      // loosening, is told — ONCE PER HOST per distinct change (limits + notes),
      // so a service restart does not re-raise the same raise (job #533: the
      // Cartesia 125% raise re-carded on every Popty auto-deploy restart).
      if (lastLimitsHash !== null || cfg.notes.length) {
        const said = cfg.notes.map(n => n.kind === 'ignored' ? `IGNORED ${n.label}.${n.field}=${n.value} (${n.why})` : n.kind === 'override' ? `override file ${n.value} signed by ${n.by} until ${n.until} (${n.why})` : `RAISED ${n.label}.${n.field}=${n.value} by ${n.by} until ${n.until} (${n.why})`).join('; ')
        const changeKey = sha(JSON.stringify({ h, n: cfg.notes }))
        alert(`limits:${changeKey}`, cfg.notes.some(n => n.kind === 'ignored') ? 'trip' : 'warn', `spend limits in force changed${lastLimitsHash ? '' : ' (at start)'} on ${os.hostname()} — ${said || 'back to the committed baseline'}`, { limitsHash: h }, { oncePerHost: true })
      }
      lastLimitsHash = h
    }
    return cfg
  }

  function mirror(obj) {
    fs.mkdirSync(path.dirname(mirrorPath), { recursive: true })
    fs.appendFileSync(mirrorPath, JSON.stringify(obj) + '\n')
  }

  // Has ANY process on this host already said this key? (the alerts file is
  // per host). A service restart must not re-raise what was already said.
  function saidOnHost(key) {
    try { return fs.readFileSync(alertsPath, 'utf8').includes(`"key":${JSON.stringify(key)}`) } catch { return false }
  }

  function alert(key, level, message, detail = {}, { oncePerHost = false } = {}) {
    if (alerted.has(key)) return
    alerted.add(key)
    if (oncePerHost && saidOnHost(key)) return
    const entry = { at: new Date(now()).toISOString(), level, message, ...detail, key, pid: process.pid }
    try { fs.mkdirSync(path.dirname(alertsPath), { recursive: true }); fs.appendFileSync(alertsPath, JSON.stringify(entry) + '\n') } catch { /* the log line below still says it */ }
    ;(level === 'trip' ? log.error : log.warn).call(log, `[TtsSpendGuard] ${message}`)
    try { Promise.resolve(notify(entry)).catch(() => {}) } catch { /* never block a render on an alert */ }
  }

  /**
   * A pool stop holds until the cycle resets, so every further call from the
   * same caller is refused for the same reason. Specimen (job #516): an editor
   * saving cat_for_eng phrases in the Popty script editor asked phase8 for one
   * 17-20 char known clip per save; each save past the stop, and each phase8
   * restart, posted a fresh needs-you card. Now the human is told ONCE per
   * caller (job, else course) per provider per cycle on this host; every later
   * refusal still throws, and is still in the log and the mirror.
   */
  function tripAlertKey(code, provider, detail) {
    if (CYCLE_STOPS.has(code)) {
      const caller = detail?.job || detail?.course || 'unnamed caller'
      return { key: `trip:${code}:${provider}:cycle-${new Date(cycleStart(now(), providerCycleDay(provider))).toISOString().slice(0, 10)}:${caller}`, caller, cycle: true }
    }
    return { key: `trip:${code}:${provider}:${dayKey(now())}:${detail?.key || ''}`, cycle: false }
  }

  function refuse(code, provider, message, detail) {
    const t = tripAlertKey(code, provider, detail)
    const said = t.cycle ? `${provider}: ${message} Caller: ${t.caller}. Said once for this caller this cycle; its further refusals are logged, not raised.` : `${provider}: ${message}`
    alert(t.key, 'trip', said, { provider, code, ...detail }, { oncePerHost: t.cycle })
    throw new TtsSpendGuardError(code, message, { provider, ...detail })
  }

  function providerCycleDay(provider) {
    try { return providerLimits(limitsNow(), provider).cycleStartDay || 1 } catch { return 1 }
  }

  function providerLimits(cfg, provider) {
    const b = cfg.providers[provider] || UNKNOWN_PROVIDER_BUDGET
    return { ...b, cycleCapChars: Math.floor(b.stopAtShareOfPool * b.monthlyPoolChars), maxPerKey: cfg.repeat.maxPerKey, windowHours: cfg.repeat.windowHours }
  }

  async function ledgerTotals(provider, b) {
    try { return await store.totals(provider, b.cycleStartDay) } catch (e) {
      throw new TtsSpendGuardError('LEDGER', `cannot read the spend ledger (${e.message}) — refusing to render unrecorded`, { provider })
    }
  }

  /**
   * PROVIDER RECONCILIATION. No reader for the provider: a known limit, said
   * once per host, the ledger stands alone. A reader that FAILS (or answers nonsense): this
   * process may reserve at most unverifiedAllowanceChars until it reads again,
   * then refuses — fail closed for runs, open for a tiny call.
   */
  async function checkProvider(provider, cfg, b, chars, who = {}) {
    const reader = usageReaders[provider]
    if (!reader) {
      const key = `usage-known-limit:${provider}`
      if (alerted.has(key)) return
      let saidBefore = false
      try { saidBefore = fs.readFileSync(alertsPath, 'utf8').includes(`"key":"${key}"`) } catch { /* no log yet */ }
      if (saidBefore) { alerted.add(key); return }
      alert(key, 'warn', `${provider}: ${KNOWN_USAGE_LIMITS[provider] || NO_READER_LIMIT}`, { provider })
      return
    }
    const st = usage.get(provider) || { checkedAt: 0, ok: false, base: null, unverifiedChars: 0, everRead: false }
    usage.set(provider, st)
    const every = (st.ok ? cfg.divergence.checkEveryMinutes : cfg.divergence.retryUnreadableMinutes) * 60e3
    if (now() - st.checkedAt >= every) {
      st.checkedAt = now()
      let u = null; let err = null
      try { u = await reader() } catch (e) { err = e }
      if (!err && (!u || typeof u.usedChars !== 'number' || !Number.isFinite(u.usedChars))) err = new Error(`reader answered ${JSON.stringify(u)}`)
      if (err) {
        st.ok = false
        alert(`usage-unreadable:${provider}:${dayKey(now())}`, 'trip', `${provider}: provider usage could not be read (${err.message}) — calls continue only up to ${cfg.divergence.unverifiedAllowanceChars.toLocaleString()} chars per process until it can be read`, { provider })
      } else {
        st.ok = true; st.unverifiedChars = 0
        const t = await ledgerTotals(provider, b)
        const pool = u.limitChars || b.monthlyPoolChars
        if (u.usedChars >= b.stopAtShareOfPool * pool) {
          const msg = `the provider itself reports ${u.usedChars.toLocaleString()} of ${pool.toLocaleString()} characters used — past the ${Math.round(b.stopAtShareOfPool * 100)}% stop`
          await store.trip(provider, 'PROVIDER_POOL', msg).catch(() => {})
          refuse('PROVIDER_POOL', provider, msg, { usedChars: u.usedChars, pool, course: who.course, job: who.job })
        }
        if (!st.base) st.base = { used: u.usedChars, ledger: Number(t.cycle) || 0 }
        else {
          const providerDelta = u.usedChars - st.base.used
          const ledgerDelta = (Number(t.cycle) || 0) - st.base.ledger
          if (providerDelta > cfg.divergence.factor * ledgerDelta + cfg.divergence.slackChars) {
            const msg = `provider billed ${providerDelta.toLocaleString()} chars since this process's baseline but the ledger recorded ${ledgerDelta.toLocaleString()} — something is spending outside the door`
            await store.trip(provider, 'PROVIDER_DIVERGENCE', msg).catch(() => {})
            refuse('PROVIDER_DIVERGENCE', provider, msg, { providerDelta, ledgerDelta })
          }
        }
      }
    }
    if (!st.ok) {
      if (st.unverifiedChars + chars > cfg.divergence.unverifiedAllowanceChars) {
        refuse('USAGE_UNREADABLE', provider, `${provider}'s own usage cannot be read, and this process has already sent ${st.unverifiedChars.toLocaleString()} unverified chars (allowance ${cfg.divergence.unverifiedAllowanceChars.toLocaleString()}) — refusing a run it cannot reconcile`, { unverifiedChars: st.unverifiedChars })
      }
      st.unverifiedChars += chars
    }
  }

  /**
   * Call immediately before a paid provider call. Throws TtsSpendGuardError to
   * refuse; otherwise returns the reservation (pass it to afterProviderCall).
   * ctx: { provider, voiceId, text, courseCode, job, language, attempt }
   */
  async function beforeProviderCall(ctx) {
    const provider = String(ctx.provider || 'unknown')
    const text = String(ctx.text || '')
    const chars = text.length
    const cfg = limitsNow()
    const b = providerLimits(cfg, provider)

    if (b.retired) refuse('RETIRED', provider, b.retired, { course: ctx.courseCode || null, job: ctx.job || process.env.TTS_SPEND_JOB || null })

    await checkProvider(provider, cfg, b, chars, { course: ctx.courseCode || null, job: ctx.job || process.env.TTS_SPEND_JOB || null })

    // Job-scoped raises (see loadLimits). The raised job spends from its own
    // allowance; everyone else's caps are lifted by exactly what it has spent.
    const jobText = ctx.job || process.env.TTS_SPEND_JOB || null
    const raisedJob = cfg.jobRaises.find(r => jobMatches(jobText, r.job)) || null
    let dailyCap = null
    let combinedCap = cfg.hold && cfg.hold.combinedDailyCapChars ? cfg.hold.combinedDailyCapChars : null
    if (raisedJob) {
      const spent = sumChars(await jobSpentToday(raisedJob.job))
      if (spent + chars > raisedJob.extraDailyChars) {
        refuse('DAILY_CAP', provider, `job ${raisedJob.job} has spent ${spent} chars today under Tom's signed raise; this call (${chars}) would pass its allowance of ${raisedJob.extraDailyChars} (raise by ${raisedJob.by}, until ${raisedJob.until})`, { course: ctx.courseCode || null, job: jobText })
      }
      dailyCap = Number.MAX_SAFE_INTEGER
      combinedCap = null
    } else if (cfg.jobRaises.length) {
      let extraHere = 0; let extraAll = 0
      for (const r of cfg.jobRaises) { const s = await jobSpentToday(r.job); extraHere += Number(s[provider]) || 0; extraAll += sumChars(s) }
      dailyCap = b.dailyCapChars + extraHere
      if (combinedCap) combinedCap += extraAll
    }

    if (combinedCap) {
      const cap = combinedCap
      let combined = 0
      for (const p of Object.keys(cfg.providers)) combined += Number((await ledgerTotals(p, providerLimits(cfg, p))).today) || 0
      if (combined + chars > cap) {
        refuse('DAILY_CAP', provider, `today's spend across all TTS providers is ${combined} chars; this call (${chars}) would pass the combined daily cap of ${cap}. HELD: ${cfg.hold.message}`, { today: combined, course: ctx.courseCode || null, job: ctx.job || process.env.TTS_SPEND_JOB || null })
      }
    }

    const key = repeatKey(provider, ctx.voiceId, text)
    const base = {
      at: new Date(now()).toISOString(), provider, voice: ctx.voiceId || null, chars,
      course: ctx.courseCode || null, job: ctx.job || process.env.TTS_SPEND_JOB || null,
      language: ctx.language || null, text_hash: textHash(text), key, attempt: ctx.attempt || 1, pid: process.pid,
    }
    // WRITE-AHEAD: the host's own record of the attempt exists before the
    // reservation is asked for. Unwritable = refuse.
    try { mirror({ kind: 'intent', ...base }) } catch (e) {
      throw new TtsSpendGuardError('LEDGER', `cannot write the spend mirror ${mirrorPath} (${e.message}) — refusing to render unrecorded`)
    }

    let res
    try {
      res = await store.reserve({ provider, voice: base.voice, chars, key, textHash: base.text_hash, course: base.course, job: base.job, language: base.language, attempt: base.attempt, limits: b, dailyCap })
    } catch (e) {
      try { mirror({ kind: 'refused', code: 'LEDGER', ...base }) } catch {}
      refuse('LEDGER', provider, `the shared spend ledger is unreachable (${e.message}) — refusing to render unrecorded`, {})
    }
    if (!res || typeof res.ok !== 'boolean') {
      refuse('LEDGER', provider, `the shared spend ledger answered ${JSON.stringify(res)} — refusing to render on an answer it cannot read`, {})
    }
    if (!res.ok) {
      try { mirror({ kind: 'refused', code: res.code, ...base }) } catch {}
      const hint = res.code === 'POOL_SHARE' ? ` The stop is ${Math.round(b.stopAtShareOfPool * 100)}% of a ${b.monthlyPoolChars.toLocaleString()}-char pool; a raise needs by, why and until (at most ${RAISE_MAX_DAYS} days) in ops/tts-spend-budgets.json.`
        : res.code === 'DAILY_CAP' ? (cfg.hold ? ` HELD: ${cfg.hold.message}` : ' Raise dailyCapChars only through a signed raise in ops/tts-spend-budgets.json.') : ''
      refuse(res.code || 'REFUSED', provider, `${res.message || 'refused by the ledger'}.${hint}`, { key: res.code === 'REPEAT' ? key : undefined, today: res.today, cycle: res.cycle, seen: res.seen, course: base.course, job: base.job })
    }
    const entry = { kind: 'call', id: res.id, ...base }
    if (raisedJob) { const c = jobSpend.get(raisedJob.job); if (c) c.byProvider[provider] = (Number(c.byProvider[provider]) || 0) + chars }
    try { mirror(entry) } catch { /* the reservation is in the DB; the intent line is on disk */ }

    // Alerts on crossing lines (once per process per line per day/cycle).
    const today = Number(res.today) || 0; const cycle = Number(res.cycle) || 0
    if (today >= b.alertDailyChars) {
      alert(`daily:${provider}:${dayKey(now())}`, 'warn', `${provider} spend today has reached ${today.toLocaleString()} chars (alert line ${b.alertDailyChars.toLocaleString()}, cap ${b.dailyCapChars.toLocaleString()})`, { provider })
    }
    for (const s of POOL_ALERT_SHARES) {
      if (cycle >= s * b.monthlyPoolChars) alert(`pool:${provider}:${s}:${cycleStart(now(), b.cycleStartDay)}`, 'warn', `${provider} has used ${Math.round(100 * cycle / b.monthlyPoolChars)}% of its ${b.monthlyPoolChars.toLocaleString()}-char pool this cycle (line ${s * 100}%)`, { provider })
    }
    return entry
  }

  /** After the call: sent or failed. Best effort, never throws — the chars stay counted either way. */
  function afterProviderCall(entry, { ok, error } = {}) {
    if (!entry || entry.id == null) return
    Promise.resolve().then(() => store.settle(entry.id, ok ? 'sent' : 'failed', error ? String(error.message || error).slice(0, 200) : null)).catch(() => {})
  }

  /** Read-only snapshot for a status route or a driver. */
  async function snapshot(provider) {
    const cfg = limitsNow(); const b = providerLimits(cfg, provider)
    const t = await ledgerTotals(provider, b)
    return { provider, todayChars: Number(t.today) || 0, cycleChars: Number(t.cycle) || 0, pool: b.monthlyPoolChars, dailyCap: b.dailyCapChars, stopShare: b.stopAtShareOfPool, tripped: t.tripped || null }
  }

  return { beforeProviderCall, afterProviderCall, snapshot, ledgerPath: mirrorPath, alertsPath, store }
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
 * Readers return { usedChars, limitChars } for the current billing cycle.
 * ElevenLabs: GET /v1/user/subscription (character_count / character_limit).
 * Cartesia: GET /usage/credits (public API reference, read 2026-09-27, job
 * #430) — credit usage between start_ts and end_ts, ~1 credit per TTS
 * character; it needs an ADMIN key (sk_car_admin_…, play.cartesia.ai/keys/admin)
 * in CARTESIA_ADMIN_API_KEY. No such key is in this estate's .env today, so the
 * Cartesia reader is off until one is made.
 *
 * TESTED with the NORMAL key (CARTESIA_API_KEY, sk_car_…) on 2026-09-27, job
 * #440, at Tom's ask: GET /usage/credits answered 401 "You must be logged in
 * to access this endpoint" under both Cartesia-Version 2025-04-16 and
 * 2026-08-14 (Bearer and X-API-Key alike); the same key answered GET /voices/
 * 200 in the same minute, so the key is good and the endpoint wants more. The
 * public API index lists /usage/credits under "Admin > Usage". /v1/usage/credits
 * is 404. So: the normal key CANNOT read usage; an admin key is required.
 */
function liveUsageReaders(env = process.env, { now = () => Date.now(), cycleStartDay = () => 1 } = {}) {
  const readers = {}
  if (env.ELEVENLABS_API_KEY) {
    readers.elevenlabs = async () => {
      const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': env.ELEVENLABS_API_KEY }, signal: AbortSignal.timeout(10000) })
      if (!r.ok) throw new Error(`elevenlabs subscription ${r.status}`)
      const j = await r.json()
      return { usedChars: j.character_count, limitChars: j.character_limit }
    }
  }
  if (env.CARTESIA_ADMIN_API_KEY) {
    readers.cartesia = async () => {
      const start = new Date(cycleStart(now(), cycleStartDay('cartesia'))).toISOString()
      const url = `https://api.cartesia.ai/usage/credits?start_ts=${encodeURIComponent(start)}&end_ts=${encodeURIComponent(new Date(now()).toISOString())}`
      const r = await fetch(url, { headers: { Authorization: `Bearer ${env.CARTESIA_ADMIN_API_KEY}`, 'Cartesia-Version': env.CARTESIA_USAGE_VERSION || '2026-08-14' }, signal: AbortSignal.timeout(10000) })
      if (!r.ok) throw new Error(`cartesia /usage/credits ${r.status}`)
      const j = await r.json()
      if (!Array.isArray(j?.data)) throw new Error('cartesia /usage/credits: no data array')
      return { usedChars: j.data.reduce((n, b) => n + (Number(b.credits) || 0), 0), limitChars: null }
    }
  }
  return readers
}

// ─── The process-wide guard every door uses ─────────────────────────────────

let shared = null
function spendGuard() {
  if (!shared) {
    shared = createSpendGuard({
      usageReaders: liveUsageReaders(process.env, {
        cycleStartDay: (p) => { try { return loadLimits({ budgetPath: COMMITTED_BUDGET_PATH, nowMs: Date.now() }).providers[p]?.cycleStartDay || 1 } catch { return 1 } },
      }),
    })
  }
  return shared
}
/** Tests inject a guard (or null to rebuild the default). */
function useSpendGuard(g) { shared = g }

module.exports = {
  createSpendGuard,
  spendGuard,
  useSpendGuard,
  liveUsageReaders,
  supabaseSpendStore,
  pgSpendStore,
  memorySpendStore,
  loadLimits,
  applyLimits,
  raiseInForce,
  jobMatches,
  TtsSpendGuardError,
  repeatKey,
  repeatTextKey,
  cycleStart,
  effectiveStopShare,
  DEFAULT_BUDGETS,
  DEFAULT_REPEAT,
  DEFAULT_DIVERGENCE,
  KNOWN_USAGE_LIMITS,
  RAISE_MAX_DAYS,
}
