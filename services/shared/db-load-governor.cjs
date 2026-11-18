// VENDORED, byte-for-byte below this line, from command-surface ops/db-load-governor.cjs (the source of truth). Never edit here: edit there, bump GOVERNOR_VERSION, copy. services/shared/db-load-gate.cjs loads whichever copy has the higher GOVERNOR_VERSION.
// ── THE LIVE SSi DB LOAD GOVERNOR: one adaptive write gate for every bulk writer (job #835, 2026-11-18) ──
//
// TOM'S RULING r-2026-11-18-no-watson-or-worker-any-owner: "No Watson or worker, any owner (Kai
// included), ever hammers the live SSi database: bulk/background writes are throttled by a code-
// enforced load governor that backs off when the DB is busy, so learners never feel it." And: "no
// fixed cap, adapt to measured load".
//
// HARM. 18 Nov 19:54Z Tom's iPhone sat on an endless spinner on saysomethingin.app while course-content
// jobs wrote hard to the one shared Supabase (P0 diagnosis #834). Before that: 5 Nov 17:43Z froze ~2 min
// under ~100 lookups/s (#692). A fixed 20/s per process (db-worker-guard LIVE_PER_SEC) did not stop it:
// ten processes at 20/s is 200/s whether the DB is idle or drowning.
//
// WHAT IT IS. A per-process gate every live statement (pg query or Supabase REST call) of a writer
// passes through: `await gov.acquire()` before, `release(ms, err)` after. It reads a LOAD SIGNAL and runs
// AIMD (as TCP does): rate and concurrency HALVE when the database shows pressure, grow by one step per
// calm tick, and stop being a limit at all once they are far above what the writer actually uses. There
// is no ceiling; the only constants are the floor (one statement per FLOOR_GAP_MS while red, so a wait is
// always bounded) and the start (a new writer does not open at full speed).
//
// THE SIGNAL, cheapest first, read at most every TICK_MS (2 s) and cached per process:
//   1. the freeze recorder's newest sample (cs-db-freeze-recorder.service, a 5 s pg_stat_activity
//      snapshot it takes anyway) — free; used when < RECORDER_FRESH_MS old;
//   2. a box-wide cache file another governed process wrote < TICK_MS ago (one probe serves the box);
//   3. ONE light pg_stat_activity count on the governor's own connection, statement_timeout 1 s;
//   4. none of these → the database is treated as BUSY (red). Never as idle.
// Measured: learner-facing backends (PostgREST + Auth + Storage logins) active / waiting on a lock or
// IO, their longest running statement, all waiting backends; plus the writer's OWN statement latency
// (fast EWMA) against its own rolling baseline (slow EWMA).
//   red   — no readable signal, or ≥2 learner backends waiting, or a learner statement ≥3 s, or ≥5
//           backends waiting (the freeze recorder's incident line): concurrency 1, rate halved down to
//           the floor (one statement per 5 s).
//   amber — learner active > max(4, 2×its calm baseline + 2), or 1 learner waiting, or ≥2 waiting, or own
//           latency > 3× baseline and > 150 ms: concurrency 1, rate halved.
//   green — otherwise: rate +1/s and concurrency +1 per tick; both lift to unlimited once 4× above use.
// Learner traffic itself is never touched: it is not a writer, it is what this protects.
//
// SAYING SO. Every level change prints one stderr line (≤ 1 per 10 s). A writer held back > 30 s of
// a minute prints a "held" line (≤ 1 a minute) and posts ONE ops_events row (source db-load-governor,
// kind held) per 10 minutes. Never silence; never an unbounded wait.
//
// SHARED BY: command-surface ops/db-worker-guard.cjs (every worker node process and cs-long/cs-wake unit;
// a declared @db-live-write tool's live pg and REST calls) and Popty services/shared/db-load-gate.cjs
// (every Popty service entrypoint), which carries a byte-identical VENDORED copy of this file at
// services/shared/db-load-governor.cjs and loads whichever has the higher GOVERNOR_VERSION. Edit HERE,
// bump GOVERNOR_VERSION, copy to Popty.
//
// Dependency-free. The probe uses the pg Client class its host hands it (configure({ Client, probe })).
"use strict";

const GOVERNOR_VERSION = 1;
const fs = require("fs");
const path = require("path");
const os = require("os");

const LEARNER_USERS = ["authenticator", "anon", "authenticated", "service_role", "supabase_auth_admin", "supabase_storage_admin"];
const TICK_MS = 2000;
const RECORDER_FRESH_MS = 12000;
const FLOOR_GAP_MS = 5000;            // red floor: one statement per 5 s per process
const START_RATE = 5;                 // statements/s a new writer opens at (grows from there, no ceiling)
const START_INFLIGHT = 2;
const HELD_LOG_MS = 60000, HELD_EVENT_MS = 600000, LEVEL_LOG_MS = 10000;
const SOURCE = "db-load-governor";
const RECORDER_DIR = process.env.DB_GOVERNOR_RECORDER_DIR || path.join(os.homedir(), ".local", "state", "db-watchdog", "freezes");
const CACHE_FILE = path.join("/tmp", `db-load-governor-signal-${typeof process.getuid === "function" ? process.getuid() : "x"}.json`);

// One read-only count. Every column comes back null for other logins' backends when the probe's login
// lacks pg_read_all_stats — "visible" says so, and a blind probe counts as no signal (red).
const PROBE_SQL = `select count(*) filter (where state is not null)::int as visible,
       count(*) filter (where state = 'active' and usename = any($1::text[]))::int as learner_active,
       count(*) filter (where state = 'active' and usename = any($1::text[])
                          and wait_event_type is not null and wait_event_type not in ('Client', 'Activity'))::int as learner_waiting,
       count(*) filter (where state = 'active'
                          and wait_event_type is not null and wait_event_type not in ('Client', 'Activity'))::int as all_waiting,
       coalesce(max(extract(epoch from clock_timestamp() - query_start))
                  filter (where state = 'active' and usename = any($1::text[])), 0)::float8 as learner_max_secs
  from pg_stat_activity
 where datname = current_database() and backend_type = 'client backend' and pid <> pg_backend_pid()`;

// ── signal sources ────────────────────────────────────────────────────────────────────────────
/** The freeze recorder's newest sample, reduced to the signal. null if absent, stale or failed. */
function fromRecorder(now = Date.now(), dir = RECORDER_DIR) {
  try {
    const files = fs.readdirSync(dir).filter((f) => /^samples-.*\.jsonl$/.test(f)).sort();
    if (!files.length) return null;
    const file = path.join(dir, files[files.length - 1]);
    const fd = fs.openSync(file, "r");
    let text;
    try {
      const size = fs.fstatSync(fd).size;
      const len = Math.min(size, 262144);
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, size - len);
      text = buf.toString("utf8");
    } finally { fs.closeSync(fd); }
    const lines = text.split("\n").filter(Boolean);
    const rec = JSON.parse(lines[lines.length - 1]);
    const at = Date.parse(rec.at);
    if (!(now - at < RECORDER_FRESH_MS) || rec.error || !Array.isArray(rec.activity)) return null;
    return reduceActivity(rec.activity, { at, source: "recorder" });
  } catch { return null; }
}

/** pg_stat_activity rows (the recorder's shape) → the signal. */
function reduceActivity(rows, { at = Date.now(), source = "rows" } = {}) {
  const learner = new Set(LEARNER_USERS);
  const waits = (a) => a.state === "active" && a.wait_event_type && a.wait_event_type !== "Client" && a.wait_event_type !== "Activity";
  const client = rows.filter((a) => !a.backend_type || a.backend_type === "client backend");
  const la = client.filter((a) => learner.has(a.usename) && a.state === "active");
  return {
    at, source, ok: true,
    learnerActive: la.length,
    learnerWaiting: la.filter(waits).length,
    allWaiting: client.filter(waits).length,
    learnerMaxSecs: la.reduce((m, a) => Math.max(m, Number(a.query_seconds) || 0), 0),
  };
}

function fromCache(now = Date.now()) {
  try {
    const s = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    return s && s.ok && now - s.at < TICK_MS ? { ...s, source: "cache" } : null;
  } catch { return null; }
}
function toCache(sig) {
  try { const tmp = `${CACHE_FILE}.${process.pid}`; fs.writeFileSync(tmp, JSON.stringify(sig), { mode: 0o644 }); fs.renameSync(tmp, CACHE_FILE); } catch {}
}

// ── the governor ──────────────────────────────────────────────────────────────────────────────
function createGovernor({ writer = "writer", Client = null, probe = null, now = Date.now, log = defaultLog, event = defaultEvent,
  readRecorder = fromRecorder, readCache = fromCache, startRate = START_RATE } = {}) {
  const g = {
    writer, Client, probe,               // probe: pg connection config (object) for the fallback count
    level: "red", rate: startRate, inflightMax: START_INFLIGHT, inflight: 0,
    next: 0, lastTick: 0, signal: null, done: 0, doneAtTick: 0,
    latFast: null, latSlow: null, learnerBase: null, unbounded: 0,
    heldMs: 0, heldWindowStart: now(), lastHeldLog: 0, lastHeldEvent: 0, lastLevelLog: 0,
    queue: [], ticking: null, probeClient: null, probeBlindSaid: false,
  };

  async function readSignal() {
    const t = now();
    const r = readRecorder(t) || readCache(t);
    if (r) return r;
    if (!g.Client || !g.probe) return { at: t, source: "none", ok: false, why: "no fresh freeze-recorder sample and no probe connection" };
    try {
      if (!g.probeClient) {
        const c = new g.Client({ ...g.probe, application_name: "db-governor-probe", statement_timeout: 1000, query_timeout: 1500, connectionTimeoutMillis: 3000 });
        c[PROBE] = true;
        c.on && c.on("error", () => { g.probeClient = null; });
        await c.connect();
        g.probeClient = c;
      }
      const res = await g.probeClient.query(PROBE_SQL, [LEARNER_USERS]);
      const row = res.rows[0];
      if (!row.visible) {
        if (!g.probeBlindSaid) { g.probeBlindSaid = true; log(`db-load-governor[${g.writer}]: probe login cannot see other backends (no pg_read_all_stats) and no fresh freeze-recorder sample — running SLOW (red) until one appears`); }
        return { at: t, source: "probe", ok: false, why: "probe blind" };
      }
      const sig = { at: t, source: "probe", ok: true, learnerActive: row.learner_active, learnerWaiting: row.learner_waiting, allWaiting: row.all_waiting, learnerMaxSecs: Number(row.learner_max_secs) || 0 };
      toCache(sig);
      return sig;
    } catch (e) {
      try { g.probeClient && g.probeClient.end(); } catch {}
      g.probeClient = null;
      return { at: t, source: "probe", ok: false, why: `probe failed: ${String(e && e.message || e).slice(0, 120)}` };
    }
  }

  function classify(s) {
    if (!s || !s.ok) return "red";
    if (s.learnerWaiting >= 2 || s.learnerMaxSecs >= 3 || s.allWaiting >= 5) return "red";
    const base = g.learnerBase == null ? s.learnerActive : g.learnerBase;
    const latHot = g.latFast != null && g.latSlow != null && g.latFast > 3 * g.latSlow && g.latFast > 150;
    if (s.learnerActive > Math.max(4, 2 * base + 2) || s.learnerWaiting >= 1 || s.allWaiting >= 2 || latHot) return "amber";
    return "green";
  }

  async function tick() {
    const t = now();
    const s = await readSignal();
    const level = classify(s);
    const secs = Math.max(0.001, (t - (g.lastTick || t - TICK_MS)) / 1000);
    const used = (g.done - g.doneAtTick) / secs;               // statements/s the writer actually ran last tick
    g.doneAtTick = g.done; g.lastTick = t; g.signal = s;
    const floor = 1000 / FLOOR_GAP_MS;
    if (level === "green") {
      if (s.ok) g.learnerBase = g.learnerBase == null ? s.learnerActive : 0.9 * g.learnerBase + 0.1 * s.learnerActive;
      if (Number.isFinite(g.rate)) {
        g.rate += 1;
        g.unbounded = g.rate > 4 * Math.max(used, 1) ? g.unbounded + 1 : 0;
        if (g.unbounded >= 3) { g.rate = Infinity; g.inflightMax = Infinity; }   // not binding: no limit at all
        else if (Number.isFinite(g.inflightMax)) g.inflightMax += 1;
      }
    } else {
      const from = Number.isFinite(g.rate) ? Math.min(g.rate, Math.max(used, floor)) : Math.max(used, floor);
      g.rate = Math.max(floor, from / 2);
      g.inflightMax = 1;
      g.unbounded = 0;
      if (level === "red") g.rate = Math.min(g.rate, Math.max(floor, g.rate / 2));
    }
    if (level !== g.level && t - g.lastLevelLog >= LEVEL_LOG_MS) {
      g.lastLevelLog = t;
      log(`db-load-governor[${g.writer}]: ${g.level} → ${level} (${describe(s)}) — rate ${fmtRate(g.rate)}, ${Number.isFinite(g.inflightMax) ? g.inflightMax : "∞"} in flight`);
    }
    g.level = level;
  }

  function maybeTick() {
    if (g.ticking) return g.ticking;
    if (now() - g.lastTick < TICK_MS) return null;
    g.ticking = tick().catch(() => { g.level = "red"; g.lastTick = now(); }).finally(() => { g.ticking = null; });
    return g.ticking;
  }

  function noteHeld(ms) {
    const t = now();
    if (t - g.heldWindowStart > 60000) { g.heldWindowStart = t; g.heldMs = 0; }
    g.heldMs += ms;
    if (g.heldMs > 30000 && t - g.lastHeldLog >= HELD_LOG_MS) {
      g.lastHeldLog = t;
      const line = `db-load-governor[${g.writer}]: HELD BACK — its statements waited ${Math.round(g.heldMs / 1000)} s in total over the last minute — database ${g.level} (${describe(g.signal)}); rate ${fmtRate(g.rate)}. Learners come first; this writer is still moving, slowly.`;
      log(line);
      if (t - g.lastHeldEvent >= HELD_EVENT_MS) { g.lastHeldEvent = t; event("held", line); }
    }
  }

  /** Wait for a slot. Resolves with a release(ms, err) to call when the statement finishes. Always bounded. */
  async function acquire() {
    const t0 = now();
    const tk = maybeTick();
    if (tk && !g.lastTick) await tk;                 // first statement waits for the first reading
    for (;;) {
      if (g.inflight < g.inflightMax) {
        const t = now();
        const gap = Number.isFinite(g.rate) ? 1000 / g.rate : 0;
        const at = Math.max(t, g.next);
        if (at <= t) { g.next = t + gap; break; }
        await sleep(Math.min(at - t, FLOOR_GAP_MS));
      } else {
        await new Promise((r) => { g.queue.push(r); setTimeout(r, FLOOR_GAP_MS); });
      }
      const tk2 = maybeTick(); if (tk2) await tk2;
    }
    g.inflight += 1;
    const held = now() - t0;
    if (held > 0) noteHeld(held);
    const started = now();
    let released = false;
    return function release(err) {
      if (released) return; released = true;
      g.inflight = Math.max(0, g.inflight - 1);
      g.done += 1;
      const ms = now() - started;
      if (!err) {
        g.latFast = g.latFast == null ? ms : 0.3 * ms + 0.7 * g.latFast;
        g.latSlow = g.latSlow == null ? ms : 0.02 * ms + 0.98 * g.latSlow;
      }
      const w = g.queue.shift(); if (w) w();
    };
  }

  /** Run fn() through the gate. */
  async function run(fn) {
    const release = await acquire();
    try { const out = await fn(); release(); return out; } catch (e) { release(e); throw e; }
  }

  function status() {
    return { writer: g.writer, level: g.level, rate: fmtRate(g.rate), inflight: g.inflight, inflightMax: Number.isFinite(g.inflightMax) ? g.inflightMax : "unlimited",
      signal: g.signal, ownLatencyMs: g.latFast == null ? null : Math.round(g.latFast), baselineMs: g.latSlow == null ? null : Math.round(g.latSlow) };
  }

  async function close() { try { g.probeClient && await g.probeClient.end(); } catch {} g.probeClient = null; }

  return { acquire, run, status, close, configure(o) { Object.assign(g, o || {}); }, _state: g, _tick: tick, _classify: classify };
}

const PROBE = Symbol.for("cs.dbLoadGovernor.probe");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmtRate = (r) => (Number.isFinite(r) ? `${Math.round(r * 10) / 10}/s` : "unlimited");
function describe(s) {
  if (!s) return "no reading yet";
  if (!s.ok) return `no signal: ${s.why || s.source}`;
  return `${s.source}: learner active ${s.learnerActive}, learner waiting ${s.learnerWaiting}, all waiting ${s.allWaiting}, longest learner stmt ${Math.round(s.learnerMaxSecs * 10) / 10} s`;
}
function defaultLog(line) { try { process.stderr.write(line + "\n"); } catch {} }
function defaultEvent(kind, detail) {
  try {
    const job = (process.env.PGAPPNAME || "").replace(/^cs-job:/, "") || (process.env.CS_SCRATCH || "").split("/").pop() || path.basename(process.argv[1] || "?");
    const body = JSON.stringify({ source: SOURCE, kind, detail: `[${job}] ${String(detail)}`.slice(0, 500) });
    require("child_process").spawn("/usr/bin/curl", ["-s", "-m", "5", "-o", "/dev/null", "-X", "POST", "http://localhost:4317/api/ops-event", "-H", "Content-Type: application/json", "-d", body], { detached: true, stdio: "ignore" }).unref();
  } catch { /* best effort */ }
}

/** The application_name a governed writer stamps on its live connections; db-watchdog reads it. */
// Keeps whatever stamp the connection already carried (cs-job:<id>, popty service name) after the prefix,
// so the watchdog still attributes it to its job.
const governedAppName = (writer, prior) => `governed:${String(prior || writer || "writer").replace(/^governed:/, "")}`.slice(0, 63);

module.exports = { GOVERNOR_VERSION, createGovernor, fromRecorder, reduceActivity, governedAppName, PROBE, PROBE_SQL, LEARNER_USERS, TICK_MS, FLOOR_GAP_MS, START_RATE };

// ── exercise: one governed reading, printed. Read-only: one pg_stat_activity count at most. ────────
//   node ops/db-load-governor.cjs signal [<dir with node_modules/pg>]   (DATABASE_URL = the login to probe with)
if (require.main === module && process.argv[2] === "signal") {
  (async () => {
    let Client = null;
    try { Client = require(require.resolve("pg", { paths: [process.argv[3] || process.cwd(), __dirname] })).Client; } catch {}
    const url = process.env.DATABASE_URL;
    const gov = createGovernor({ writer: "signal-check", Client, probe: url ? { connectionString: url } : null,
      readRecorder: process.argv.includes("--no-recorder") ? () => null : fromRecorder, readCache: process.argv.includes("--no-recorder") ? () => null : fromCache });
    const rel = await gov.acquire(); rel();
    console.log(JSON.stringify(gov.status(), null, 2));
    await gov.close();
  })().catch((e) => { console.error(e.message); process.exit(1); });
}
