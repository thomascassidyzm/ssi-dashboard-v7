/**
 * Why did a course build stop? — pure classification + plain-English wording.
 *
 * Job #482 (Kai, 29 Oct 2026). Two fry_for_eng runs ended and nobody could tell why:
 *   - run 1 stopped at 4/300 because the headless Claude CLI reaps background tasks
 *     10 minutes after the parent's last turn ("Background tasks still running 10m after
 *     the last turn (subagent …); stopping them"), and the orchestrator read that as a
 *     human stop;
 *   - run 2 stopped at 294/300 on "You've hit your 5-hour limit · resets 1:50am (UTC)"
 *     and the job was marked COMPLETE, silently, because /build/job-done marked every
 *     exit complete.
 * Outside builders (Auke, Doug, Erik) read the Course Manager page, so the reason has to
 * be stored and said plainly. This module holds the decision; the I/O lives in
 * build-job-runtime.cjs and the routes.
 *
 * THE RULE THAT MATTERS: a build-team job is `complete` only when completed >= total.
 * Anything else that ends is `stopped` (or `failed` for a crash) with a stop_reason.
 *
 * stop_reason vocabulary (stored in build_jobs.metadata.stop_reason — build_jobs has no
 * column for it, and red/agent work never writes schema):
 *   done            all target seeds built
 *   usage_limit     Claude account hit its 5-hour / weekly limit; reset_at parsed if printed
 *   background_kill the CLI's background-task ceiling reaped the builder
 *   crashed         non-zero exit or an API error, with the last error line as detail
 *   human           someone pressed Stop (stopped_by records who, when we know)
 *   process_gone    the orchestrator process vanished without reporting (found by the sweep)
 *   ended_early     the orchestrator exited cleanly but the seeds are not all built
 */

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };

/** Offset (ms) of `timeZone` from UTC at instant `date` (positive east of UTC). */
function tzOffsetMs(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date).reduce((o, p) => (o[p.type] = p.value, o), {});
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** UTC instant for a wall-clock time in `timeZone`. */
function wallToUtc({ y, mo, d, h, mi }, timeZone) {
  const guess = Date.UTC(y, mo, d, h, mi);
  if (!timeZone || /^utc$/i.test(timeZone) || /^gmt$/i.test(timeZone)) return new Date(guess);
  try {
    const first = guess - tzOffsetMs(new Date(guess), timeZone);
    return new Date(guess - tzOffsetMs(new Date(first), timeZone));
  } catch {
    return new Date(guess); // unknown zone name → treat as UTC rather than invent one
  }
}

/** The calendar date (y, mo, d) of `date` as seen in `timeZone`. */
function wallDate(date, timeZone) {
  const off = (!timeZone || /^(utc|gmt)$/i.test(timeZone)) ? 0 : (() => { try { return tzOffsetMs(date, timeZone); } catch { return 0; } })();
  const w = new Date(date.getTime() + off);
  return { y: w.getUTCFullYear(), mo: w.getUTCMonth(), d: w.getUTCDate() };
}

/**
 * Find the LAST usage-limit notice in CLI output and work out when it resets.
 * Shapes seen / expected from the CLI:
 *   "You've hit your 5-hour limit · resets 1:50am (UTC)"
 *   "You've hit your weekly limit · resets Nov 2, 10am (Europe/London)"
 *   "Claude usage limit reached. Your limit will reset at 3pm (UTC)."
 * Returns null when there is no notice; { limit, resetAt: Date|null, raw } otherwise.
 * resetAt is the first matching instant AFTER `now` (a bare time rolls to tomorrow).
 */
function parseUsageLimit(text, now = new Date()) {
  if (!text) return null;
  const re = /(?:hit your ([\w\s-]*?)\s*limit|usage limit reached)[^\n]*/gi;
  let m, last = null;
  while ((m = re.exec(text))) last = m;
  if (!last) return null;
  const raw = last[0].trim();
  const limit = (last[1] || 'usage').trim() || 'usage';
  const r = /reset(?:s| at)?\s+(?:at\s+)?(?:([A-Za-z]{3,4})\w*\s+(\d{1,2}),?\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:\(([^)]+)\))?/i.exec(raw);
  if (!r) return { limit, resetAt: null, raw };
  let h = +r[3];
  const mi = r[4] ? +r[4] : 0;
  const ap = (r[5] || '').toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || mi > 59) return { limit, resetAt: null, raw };
  const tz = r[6] ? r[6].trim() : 'UTC';
  const today = wallDate(now, tz);
  let resetAt;
  if (r[1] && MONTHS[r[1].toLowerCase()] !== undefined) {
    const mo = MONTHS[r[1].toLowerCase()];
    resetAt = wallToUtc({ y: today.y, mo, d: +r[2], h, mi }, tz);
    // "Jan 2" printed in late December means next year
    if (resetAt.getTime() < now.getTime() - 86400e3) resetAt = wallToUtc({ y: today.y + 1, mo, d: +r[2], h, mi }, tz);
  } else {
    resetAt = wallToUtc({ ...today, h, mi }, tz);
    if (resetAt.getTime() <= now.getTime()) resetAt = wallToUtc({ ...today, d: today.d + 1, h, mi }, tz);
  }
  return { limit, resetAt, raw };
}

const BG_KILL_RE = /Background tasks still running [^\n]*stopping them/i;

/** Last line that looks like an error, for the crash detail (trimmed, single line). */
function lastErrorLine(text) {
  const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0 && i >= lines.length - 40; i--) {
    if (/\b(API Error|Error:|error:|ECONN|ETIMEDOUT|overloaded|rate.?limit|Invalid API key|401|403|500|529)\b/.test(lines[i])) return lines[i].slice(0, 240);
  }
  return null;
}

/**
 * Decide how a finished builder process ended.
 * @param {object} p
 * @param {string}  p.logText   CLI output of THIS run only (not the whole appended log)
 * @param {?number} p.exitCode  shell $? of the claude process (null if unknown)
 * @param {number}  p.completed seeds decomposed now
 * @param {number}  p.total     the job's target
 * @param {string}  p.pass      build_jobs.pass
 * @param {Date}    p.now
 * @returns {{status:'complete'|'stopped'|'failed', stop_reason:string, reset_at:?string, detail:?string, limit:?string}}
 */
function classifyBuildExit({ logText = '', exitCode = null, completed = 0, total = 0, pass = 'build-team', now = new Date() } = {}) {
  const seedCounted = pass === 'build-team';
  if (seedCounted && total > 0 && completed >= total) {
    return { status: 'complete', stop_reason: 'done', reset_at: null, detail: null, limit: null };
  }
  const usage = parseUsageLimit(logText, now);
  if (usage) {
    return { status: 'stopped', stop_reason: 'usage_limit', reset_at: usage.resetAt ? usage.resetAt.toISOString() : null, detail: usage.raw, limit: usage.limit };
  }
  if (BG_KILL_RE.test(logText) && seedCounted) {
    return { status: 'stopped', stop_reason: 'background_kill', reset_at: null, detail: null, limit: null };
  }
  const err = lastErrorLine(logText);
  if ((exitCode !== null && exitCode !== undefined && exitCode !== 0) || (err && /API Error/.test(err))) {
    return { status: 'failed', stop_reason: 'crashed', reset_at: null, detail: err || `exit code ${exitCode}`, limit: null };
  }
  if (!seedCounted) {
    // translate / final-pass / … have no seed-level target to check; a clean exit is done.
    return { status: 'complete', stop_reason: 'done', reset_at: null, detail: null, limit: null };
  }
  return { status: 'stopped', stop_reason: 'ended_early', reset_at: null, detail: null, limit: null };
}

function hhmmUtc(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
}
function whenUtc(iso, now) {
  const t = hhmmUtc(iso);
  if (!t) return null;
  const d = new Date(iso);
  const sameDay = d.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400e3).toISOString().slice(0, 10) === d.toISOString().slice(0, 10);
  if (sameDay) return t;
  if (tomorrow) return `${t} tomorrow`;
  return `${t} on ${d.toISOString().slice(0, 10)}`;
}

/**
 * The sentence the Course Manager page shows for a job that is no longer running.
 * `job` is a build_jobs row (status, total_seeds, completed_at, metadata).
 */
function describeStop(job, { completed = null, now = new Date() } = {}) {
  if (!job) return null;
  const m = job.metadata || {};
  const reason = m.stop_reason || (job.status === 'complete' ? 'done' : null);
  const total = job.total_seeds || null;
  const at = completed !== null && completed !== undefined && total ? ` at seed ${completed} of ${total}` : '';
  const ar = m.auto_resume || null;
  switch (reason) {
    case 'done':
      return total ? `Finished: all ${total} seeds built.` : 'Finished.';
    case 'usage_limit': {
      if (ar && ar.state === 'scheduled' && ar.at) {
        if (ar.switch_account) return `Paused: usage limit reached on one Claude account${at} — restarting on another SSi account at ${whenUtc(ar.at, now)}.`;
        // Name the limit's own reset time (what the CLI printed); the restart follows a minute later.
        return `Paused: usage limit reached${at} — resumes automatically at ${whenUtc(m.reset_at || ar.at, now)}.`;
      }
      if (ar && ar.state === 'starting') return `Paused: usage limit reached${at} — resuming now.`;
      if (ar && ar.state === 'resumed') return `Paused for the usage limit${at}; resumed automatically at ${whenUtc(ar.resumed_at || ar.at, now)}.`;
      if (ar && ar.state === 'cancelled') return `Stopped: usage limit reached${at}; the automatic resume was cancelled${ar.cancelled_by ? ` by ${ar.cancelled_by}` : ''}. Press Start to continue.`;
      if (ar && ar.state === 'failed') return `Stopped: usage limit reached${at}; the automatic resume failed (${ar.error || 'unknown error'}). Press Start to continue.`;
      if (m.reset_at) return `Stopped: usage limit reached${at} — the limit resets at ${whenUtc(m.reset_at, now)}. Press Start to continue.`;
      return `Stopped: usage limit reached${at} (reset time not shown). Press Start to continue.`;
    }
    case 'background_kill':
      return `Stopped: the builder was cut off by the Claude CLI's 10-minute background-task limit${at}. Press Start to continue from where it stopped.`;
    case 'crashed':
      return `Stopped: the builder crashed${at}${m.detail ? ` (${m.detail})` : ''}. Press Start to continue from where it stopped.`;
    case 'human':
      return `Stopped${m.stopped_by ? ` by ${m.stopped_by}` : ' by hand'}${job.completed_at ? ` at ${whenUtc(job.completed_at, now)}` : ''}${at}.`;
    case 'process_gone':
      return `Stopped: the builder process is no longer running${at}. Press Start to continue from where it stopped.`;
    case 'ended_early':
      return `Stopped: the builder exited${at} without finishing. Press Start to continue from where it stopped.`;
    default:
      if (job.status === 'stopped') return `Stopped${at}.`;
      if (job.status === 'failed') return `Failed${at}${job.error_message ? ` (${job.error_message})` : ''}.`;
      return null;
  }
}

module.exports = { parseUsageLimit, classifyBuildExit, describeStop, lastErrorLine, BG_KILL_RE };
