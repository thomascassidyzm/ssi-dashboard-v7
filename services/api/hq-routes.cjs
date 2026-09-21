/**
 * SSi HQ — GET /api/hq. The company at one level of granularity, derived.
 *
 * Tom and Aran, 2026-09-21: "a place where you and I go and get to look at the
 * overview at different levels of granularity and think, are we focusing on the
 * right things right now". This is v1: the functions table and the key numbers.
 *
 * THREE RULES ARE BUILT INTO THIS FILE, AND EACH ONE IS ASSERTED IN
 * hq-routes.test.cjs RATHER THAN WRITTEN DOWN SOMEWHERE ELSE:
 *
 *  1. NOTHING HERE IS TYPED BY A HUMAN. Every value comes from public.hq_facts()
 *     (database/migrations/20260921_hq_facts.sql), recomputed on every read, in
 *     the same posture as /api/estate-map. There are no seeded constants and no
 *     example rows.
 *
 *  2. A BLANK IS NOT A ZERO. Most of this company is not machine-readable today
 *     — cash, costs, marketing spend, the government contract, store conversions.
 *     Those render as THE HONEST BLANK with the reason and the unlock attached,
 *     never as 0 and never as a guess. A zero is a claim; a blank says the
 *     record cannot tell. Confusing them on this page would be worse than having
 *     no page, because a figure on this page will be believed.
 *
 *  3. ALL READS ARE SERVER-SIDE, BEHIND requireAdmin. The browser never touches
 *     Supabase for any of this. New Supabase tables arrive grant-open to anon
 *     (found 2026-09-21, tools/security/anon-grant-canary.cjs), so a browser-side
 *     read of company numbers is one new table away from being public.
 *
 * Owners: NOTHING IN THIS ESTATE RECORDS WHO OWNS A FUNCTION. dashboard_users
 * records access, not ownership, and reading it as ownership is exactly the
 * confident-looking wrong answer this page must not produce. So every row says
 * NO OWNER RECORDED, and the absence IS the finding for v1.
 *
 * The full census behind these verdicts, including what would make each
 * unreadable row readable: https://watson-1.tail4968cb.ts.net/d/d2b47b34
 */

/** What an unreadable cell says. One string, one meaning, used everywhere. */
const HONEST_BLANK = 'the record cannot tell'

/** No system in this estate records function ownership. See the header. */
const NO_OWNER_RECORDED = 'NO OWNER RECORDED'

/** A function that leaves no machine-readable trace anywhere. */
const NO_TRACE_SOURCE = 'NO TRACE SOURCE'

const HQ_SEMANTICS = {
  last_seen:
    'The most recent real trace of this function in a source this server can actually read. It is NOT a claim '
    + 'that somebody worked on it — it is the newest row that function wrote. A function with no trace source '
    + 'has no date here at all, and that gap is the point of the row.',
  owner:
    'Always NO OWNER RECORDED in v1, because nothing in this estate records who owns a function. dashboard_users '
    + 'records ACCESS (7 admins, 13 editors, 6 recorders), which is a different thing. Where a human recently '
    + 'touched a function the row names the most recent human ACTOR — a trace, never an owner.',
  honest_blank:
    `"${HONEST_BLANK}" means no readable source exists for this number today. It is NOT zero, NOT "none" and NOT `
    + '"unknown pending a lookup". Each blank carries the unlock that would make it readable.',
  direction:
    'Movement against the previous comparable period (this 7 days vs the 7 before, or this 30 days vs the 30 '
    + 'before). Where the prior period cannot be read, there is NO direction rather than a fabricated one.',
  subscribers:
    'THE MOST IMPORTANT CAVEAT ON THIS PAGE. subscriptions holds 19 rows in total, oldest 31 May 2026: that is '
    + "the NEW APP's Paddle billing and nothing else. SaySomethingin's actual subscriber base lives on the legacy "
    + 'platform and is NOT in this database. Never read this number as "subscribers".',
  learners:
    'Demo, test, internal and class-entity rows are not people and are filtered out of every learner figure here '
    + '(1,604 rows in learners, 657 of them real at the time of writing).',
  production_rate:
    'LEGOs written per week, from course_legos.created_at. It is throughput of course content, not quality, and '
    + 'it moves in bursts because courses are built in campaigns rather than continuously.',
  not_a_replacement:
    'This page does not replace Basecamp (the depot), Slack (conversation) or Drive (files). It reads what it can '
    + 'and says plainly what it cannot.',
}

/** Movement against the previous comparable period. No prior → no direction. */
function direction (value, prior) {
  if (value === null || value === undefined) return null
  if (prior === null || prior === undefined) return null
  if (value > prior) return 'up'
  if (value < prior) return 'down'
  return 'flat'
}

/** A number this server really read. */
function readableNumber (label, value, opts = {}) {
  const prior = opts.prior === undefined ? null : opts.prior
  return {
    key: opts.key || label,
    label,
    readable: true,
    value: value === null || value === undefined ? null : Number(value),
    prior,
    direction: direction(value, prior),
    period: opts.period || null,
    source: opts.source || null,
    note: opts.note || null,
  }
}

/**
 * A number with NO readable source. value stays null — never 0 — and the row
 * carries why it cannot be read and what would unlock it.
 */
function honestBlank (label, opts = {}) {
  return {
    key: opts.key || label,
    label,
    readable: false,
    value: null,
    prior: null,
    direction: null,
    display: HONEST_BLANK,
    blank_reason: opts.reason || 'No readable source exists for this number.',
    unlock: opts.unlock || null,
    source: null,
    note: opts.note || null,
  }
}

/** A function row whose trace this server can read. */
function tracedFunction (row) {
  return {
    key: row.key,
    label: row.label,
    owner: null,
    owner_display: NO_OWNER_RECORDED,
    cadence: row.cadence,
    trace_source: row.trace_source,
    last_seen: row.last_seen || null,
    readable: Boolean(row.last_seen),
    last_actor: row.last_actor || null,
    detail: row.detail || null,
    // A row with a trace source but nothing in it is a different gap from a row
    // with no trace source at all, and the page shows the difference.
    gap: row.last_seen ? null : (row.gap || 'The source exists and is empty — nothing has ever been written to it.'),
  }
}

/** A function that leaves no machine-readable trace anywhere. THE GAP. */
function untracedFunction (row) {
  return {
    key: row.key,
    label: row.label,
    owner: null,
    owner_display: NO_OWNER_RECORDED,
    cadence: row.cadence || null,
    trace_source: NO_TRACE_SOURCE,
    last_seen: null,
    readable: false,
    last_actor: null,
    detail: null,
    gap: row.gap,
  }
}

/**
 * Facts in, page out. PURE — no I/O — so the two rules that matter (a blank is
 * never a zero; no prior means no direction) are testable without a database.
 */
function buildHq (f) {
  const functions = [
    tracedFunction({
      key: 'course_production',
      label: 'Course production (Popty)',
      cadence: 'continuous',
      trace_source: 'content_edit_events — every content write carries an editor identity or is refused',
      last_seen: f.last_content_edit_at,
      last_actor: f.last_content_edit_actor
        ? `${f.last_content_edit_actor} (${f.last_content_edit_kind || 'unknown'})`
        : null,
      detail: `${f.content_edits_7d} content edits in the last 7 days, vs ${f.content_edits_prior_7d} the week before`,
    }),
    tracedFunction({
      key: 'voices',
      label: 'Voices',
      cadence: 'continuous',
      trace_source: 'course_audio.created_at, voices',
      last_seen: f.last_audio_written_at,
      detail: `${f.active_voices} active voices of record`,
    }),
    tracedFunction({
      key: 'learning_app',
      label: 'The learning app',
      cadence: 'continuous',
      trace_source: 'sessions (learner sessions are the trace this function leaves)',
      last_seen: f.last_session_at,
      detail: `${f.active_learners_7d} distinct learners had a session in the last 7 days`,
    }),
    tracedFunction({
      key: 'schools',
      label: 'Schools',
      cadence: 'intermittent',
      trace_source: 'schools, org_enrolments, teachers',
      last_seen: f.schools_last_touch_at,
      detail: `${f.real_schools} real schools (demo and test excluded), ${f.org_enrolments} org enrolments`,
    }),
    tracedFunction({
      key: 'finance',
      label: 'Finance',
      cadence: 'unknown',
      trace_source: 'processed_webhook_events (Paddle), subscriptions — NEW APP BILLING ONLY',
      last_seen: f.last_billing_webhook_at,
      detail: 'Billing events are readable; cash, actuals and costs by line are not. See the numbers below.',
    }),
    tracedFunction({
      key: 'marketing',
      label: 'Marketing',
      cadence: 'unknown',
      trace_source: 'try_links / try_link_visits — the only marketing instrument in this database',
      last_seen: f.last_try_link_visit_at,
      detail: `${f.try_links} try-links ever created; the last visit to one was the date shown. Spend and yield are not readable at all.`,
    }),
    tracedFunction({
      key: 'board',
      label: 'The board',
      cadence: 'unknown',
      trace_source: 'board_snapshots — the table is built and has never been written to',
      last_seen: f.last_board_snapshot_at,
      detail: `${f.board_snapshots} board snapshots recorded`,
      gap: 'board_snapshots exists with 0 rows. The source is already built; writing one row per board pack would light this row up.',
    }),
    untracedFunction({
      key: 'partnerships',
      label: 'Partnerships',
      gap: 'Nothing in the database and nothing in the code records a partnership. A table (or a readable Basecamp project) with one row per partner and a last-contact date would light this row up.',
    }),
    untracedFunction({
      key: 'colombo',
      label: 'The Colombo team (Imdad)',
      gap: 'content_edit_events records WHO edited, but nothing anywhere maps a person to a team, so no trace can be attributed to this function. It needs a team field on the people records, or Imdad\'s own tracker shared to a service account.',
    }),
  ]

  const numbers = [
    readableNumber('Active learners (7 days)', f.active_learners_7d, {
      key: 'active_learners',
      prior: f.active_learners_prior_7d,
      period: 'last 7 days vs the 7 before',
      source: 'sessions',
    }),
    readableNumber('New learner records (7 days)', f.new_learners_7d, {
      key: 'new_learners',
      prior: f.new_learners_prior_7d,
      period: 'last 7 days vs the 7 before',
      source: 'learners (demo, test, internal and class rows excluded)',
      note: `${f.real_learners} real learner records in total.`,
    }),
    readableNumber('New-app Paddle subscriptions, active', f.active_subscriptions, {
      key: 'app_subscriptions',
      prior: null,
      period: 'now',
      source: 'subscriptions',
      note: HQ_SEMANTICS.subscribers,
    }),
    readableNumber('New-app subscriptions started (30 days)', f.subs_new_30d, {
      key: 'app_subscriptions_new',
      prior: f.subs_new_prior_30d,
      period: 'last 30 days vs the 30 before',
      source: 'subscriptions',
      note: `${f.cancelled_subscriptions} cancelled to date, out of a table holding 19 rows in all.`,
    }),
    readableNumber('Active entitlements', f.active_entitlements, {
      key: 'active_entitlements',
      prior: null,
      period: 'now',
      source: 'user_entitlements (unrevoked and unexpired)',
      note: 'Access granted by gift, code, allowlist or Paddle — not the same thing as paid subscribers.',
    }),
    readableNumber('Course production rate — LEGOs written (7 days)', f.legos_7d, {
      key: 'production_rate',
      prior: f.legos_prior_7d,
      period: 'last 7 days vs the 7 before',
      source: 'course_legos.created_at',
      note: HQ_SEMANTICS.production_rate,
    }),
    readableNumber('Seeds written (30 days)', f.seeds_30d, {
      key: 'seeds_rate',
      prior: f.seeds_prior_30d,
      period: 'last 30 days vs the 30 before',
      source: 'course_seeds.created_at',
    }),
    readableNumber('Courses released', (f.courses_live || 0) + (f.courses_beta || 0), {
      key: 'courses_released',
      prior: null,
      period: 'now',
      source: 'courses.new_app_status',
      note: `${f.courses_live} live and ${f.courses_beta} in beta. Released means live or beta; unreleased does not mean unbuilt.`,
    }),
    honestBlank('Subscribers (the real company base)', {
      key: 'subscribers',
      reason: "The legacy SaySomethingin platform's subscriber base is not in this Supabase project and there is no readable path to it from here. The 7 above are new-app Paddle only.",
      unlock: 'A read-only feed from the legacy platform, or its billing provider, into a table this server can query.',
    }),
    honestBlank('The government contract', {
      key: 'government_contract',
      reason: 'Nothing anywhere in this estate records it — not value, not term, not milestones, not the next reporting date.',
      unlock: 'One record: contract value, term, milestones and next reporting date, in a table or a shared sheet a service account can read.',
    }),
    honestBlank('Marketing spend and yield', {
      key: 'marketing_spend',
      reason: 'No spend source is readable, and nothing tags a signup with a campaign, so yield cannot be attributed even where spend is known.',
      unlock: 'The spend source shared to a service account, plus a campaign/source tag written at signup.',
    }),
    honestBlank('Cash / actuals', {
      key: 'cash_actuals',
      reason: 'The actuals are a Google Sheet visible only to Tom and Aran. This server cannot see it.',
      unlock: 'That sheet shared read-only to a Google service account, then read on a schedule into a table. This is the single highest-value unlock: it turns several of these blanks into live rows.',
    }),
    honestBlank('Costs by line', {
      key: 'costs_by_line',
      reason: "No cost breakdown exists in any source this server can read. Katrin's account summaries arrive as prose.",
      unlock: 'The same actuals sheet, or the account summaries delivered as CSV / a shared sheet rather than prose.',
    }),
    honestBlank('Conversions across web / Play / iOS', {
      key: 'store_conversions',
      reason: 'player_events records web and webview only; no Play Console or App Store data exists anywhere in this estate. Imdad is assembling the actuals now.',
      unlock: "Imdad's conversion figures in a readable form; longer term, Play Console and App Store Connect API credentials.",
    }),
  ]

  return {
    generated_at: f.generated_at || new Date().toISOString(),
    computed: 'fresh on every read — no cache, no snapshot, nothing hand-typed',
    census_url: 'https://watson-1.tail4968cb.ts.net/d/d2b47b34',
    functions,
    numbers,
    semantics: HQ_SEMANTICS,
  }
}

/**
 * @param {object} app   express app
 * @param {object} deps
 * @param {function} deps.requireAdmin  (req,res) -> user|null (responds on failure)
 * @param {object}   deps.supabase      service-role client (server-side only)
 * @param {object}   [deps.logger]
 */
function mount (app, deps) {
  const { requireAdmin, supabase, logger = console } = deps

  app.get('/api/hq', async (req, res) => {
    // Company numbers. Admin only, both paths, one gate. Never the browser's job.
    if (!await requireAdmin(req, res)) return
    try {
      const client = typeof supabase === 'function' ? supabase() : supabase
      if (!client) return res.status(503).json({ error: 'Supabase not initialized' })
      const { data, error } = await client.rpc('hq_facts')
      if (error) throw new Error(error.message)
      res.json(buildHq(data || {}))
    } catch (err) {
      logger.error?.('[hq] failed to build the overview:', err)
      res.status(500).json({ error: err.message })
    }
  })

  logger.log?.('[hq] route mounted: GET /api/hq (admin only)')
}

module.exports = {
  mount,
  buildHq,
  direction,
  readableNumber,
  honestBlank,
  HONEST_BLANK,
  NO_OWNER_RECORDED,
  NO_TRACE_SOURCE,
  HQ_SEMANTICS,
}
