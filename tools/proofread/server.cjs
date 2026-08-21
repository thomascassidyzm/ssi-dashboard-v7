#!/usr/bin/env node
/**
 * Proofread tool — one-phrase-at-a-time course review, outside the dashboard.
 *
 * Usage:  node tools/proofread/server.cjs [courseCode]   (default fin_for_eng)
 * Then open http://localhost:4747
 *
 * Reads seeds/legos/phrases from Supabase. Decisions (ok/flag) are saved to
 * tools/proofread/progress/<course>.json on every click. Approving a seed
 * writes course_seeds.approved_at — the same field the dashboard's
 * mass-approve uses — and only after every phrase in the seed is marked ok.
 *
 * The inverse rule (Kai, 2026-08-06): approval must mean "every phrase in this
 * seed has been reviewed", so a seed holding an unchecked phrase is not approved.
 *  - Enforced on DECISION WRITE: clearing a decision in an approved seed
 *    unapproves that seed immediately. Targeted, one seed, reviewer-driven.
 *  - REPORTED, not enforced, on state load: /api/state returns staleApprovals,
 *    seeds approved elsewhere (dashboard mass-approve) that hold unchecked
 *    phrases. Writing those is a bulk pass over real course state, so it is
 *    opt-in via --enforce-on-load and off by default.
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { reconcileFlags, resolveKeyFor } = require('./flag-resolution.cjs');

const COURSE = (process.argv.find((a, i) => i >= 2 && !a.startsWith('--')) || 'fin_for_eng').trim();
const ENFORCE_ON_LOAD = process.argv.includes('--enforce-on-load');
const PORT = process.env.PROOFREAD_PORT || 4747;
// Loopback by default: colleagues reach this through `tailscale serve`, which proxies
// from localhost, so binding all interfaces only ever exposed it to the public internet.
const HOST = process.env.BIND_HOST || '127.0.0.1';
const PROGRESS_DIR = path.join(__dirname, 'progress');
const FETCH_TIMEOUT_MS = Number(process.env.PROOFREAD_FETCH_TIMEOUT_MS || 15000);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ---------- progress file ----------
function progressPath(course) {
  return path.join(PROGRESS_DIR, `${course}.json`);
}
function loadProgress(course) {
  try {
    return JSON.parse(fs.readFileSync(progressPath(course), 'utf8'));
  } catch {
    return { course, decisions: {}, lastPhraseId: null };
  }
}
function saveProgress(course, progress) {
  fs.mkdirSync(PROGRESS_DIR, { recursive: true });
  const tmp = progressPath(course) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(progress, null, 1));
  fs.renameSync(tmp, progressPath(course));
}

// ---------- data ----------
async function fetchAll(table, columns, order, filter) {
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(table).select(columns).eq('course_code', COURSE).range(from, from + PAGE - 1);
    if (filter) q = filter(q);
    for (const [col, opts] of order) q = q.order(col, opts);
    // Without a deadline a Supabase outage hangs each page until Cloudflare's own
    // ~100s edge timeout, so the reviewer stares at bare chrome for a minute and a
    // half before anything at all appears (2026-08-17). Fail fast, fall back.
    q = q.abortSignal(AbortSignal.timeout(FETCH_TIMEOUT_MS));
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

let cache = null;
let cacheFetchedAt = 0;
const CACHE_TTL_MS = 60 * 1000;

// Last-good snapshot on disk. The 60s TTL plus the page's ?refresh=1 mean every
// load goes to the network, so an upstream outage used to leave the reviewer with
// nothing at all — header and buttons, no phrases, no boxes. Serving the last
// known-good course (clearly labelled stale) keeps proofreading possible while
// Supabase is unreachable; decisions already save to the local progress file.
function snapshotPath(course) {
  return path.join(PROGRESS_DIR, `${course}.snapshot.json`);
}
function saveSnapshot(data) {
  try {
    // The fallback is only worth having if it cannot be poisoned. A read that
    // comes back a fraction of the size of the last good one is far more likely
    // a partial/misdirected fetch than a course that genuinely lost most of its
    // phrases, so keep the old snapshot and say so rather than overwrite it.
    const prev = loadSnapshot();
    if (prev && data.phrases.length < prev.phrases.length * 0.5) {
      console.warn(`[snapshot] refusing to overwrite ${prev.phrases.length} phrases with ${data.phrases.length}; keeping previous`);
      return;
    }
    fs.mkdirSync(PROGRESS_DIR, { recursive: true });
    const tmp = snapshotPath(data.course) + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, snapshotPath(data.course));
  } catch (err) {
    console.warn('[snapshot] save failed:', err.message);
  }
}
function loadSnapshot() {
  try {
    return JSON.parse(fs.readFileSync(snapshotPath(COURSE), 'utf8'));
  } catch {
    return null;
  }
}

// While the database is down, every click would otherwise pay the full fetch
// timeout before falling back — unusable for someone working through phrases.
// After a failure, background reads serve the snapshot straight away; only an
// explicit reload (?refresh=1) retries the network.
let lastFailureAt = 0;
const FAILURE_BACKOFF_MS = 60 * 1000;

async function loadCourse(force) {
  if (cache && !force && Date.now() - cacheFetchedAt < CACHE_TTL_MS) return cache;
  if (!force && Date.now() - lastFailureAt < FAILURE_BACKOFF_MS) {
    const fallback = cache || loadSnapshot();
    if (fallback) return { ...fallback, offline: true, offlineReason: 'database unreachable (backing off)' };
  }
  try {
    const [seeds, legos, phrases] = await Promise.all([
      fetchAll('course_seeds', 'seed_number, known_text, target_text, approved_at, flagged_at', [['seed_number', {}]]),
      fetchAll('course_legos', 'seed_number, lego_index, known_text, target_text', [['seed_number', {}], ['lego_index', {}]]),
      fetchAll('course_practice_phrases', 'id, seed_number, lego_index, position, known_text, target_text, phrase_role', [
        ['seed_number', {}], ['lego_index', {}], ['position', {}],
      ], (q) => q.neq('phrase_role', 'component')),
    ]);
    cacheFetchedAt = Date.now();
    lastFailureAt = 0;
    cache = { course: COURSE, seeds, legos, phrases, fetchedAt: cacheFetchedAt };
    saveSnapshot(cache);
    return cache;
  } catch (err) {
    lastFailureAt = Date.now();
    const fallback = cache || loadSnapshot();
    if (!fallback) throw err;
    console.warn(`[offline] live fetch failed (${err.message}) — serving snapshot from ${new Date(fallback.fetchedAt).toISOString()}`);
    return { ...fallback, offline: true, offlineReason: err.message };
  }
}

// ---------- approval / review-completeness ----------
// A phrase is "unchecked" when the progress file holds no decision for it at all
// (a flagged phrase counts as checked — it has been looked at).
function uncheckedIn(data, progress, seedNumber) {
  return data.phrases.filter((p) => p.seed_number === seedNumber && !progress.decisions[p.id]);
}
// Approved seeds that hold at least one unchecked phrase — the rule's violations.
function staleApprovals(data, progress) {
  return data.seeds
    .filter((s) => s.approved_at && uncheckedIn(data, progress, s.seed_number).length)
    .map((s) => s.seed_number);
}
async function setApprovedAt(seedNumber, value) {
  const { error } = await supabase
    .from('course_seeds')
    .update({ approved_at: value })
    .eq('course_code', COURSE)
    .eq('seed_number', seedNumber);
  if (error) throw new Error(error.message);
  const seed = cache?.seeds.find((s) => s.seed_number === seedNumber);
  if (seed) seed.approved_at = value;
}

// ---------- flags that close themselves ----------
// A flag left on a row that has since been fixed (edited, deleted, or answered by
// phrases added to its seed) closes here, on the live read, and the row goes back
// to unchecked so it comes round again. If its seed was approved, that approval
// goes too: Kai's ruling is that a resolved flag leaves the row UNACCEPTED, for
// him to look at and approve, so nothing in this path ever approves anything.
//
// The unapproval is written BEFORE the progress file, so a database failure
// leaves the flag open and the whole thing is simply retried on the next read,
// rather than closing a flag while its seed keeps a stale approval.
async function settleFlags(data, progress) {
  if (data.offline) return { closed: [], unapproved: [] };
  const { closed, adopted } = reconcileFlags(data, progress);
  if (!closed.length && !adopted.length) return { closed: [], unapproved: [] };
  const unapproved = [];
  for (const c of closed) {
    const seed = c.seedNumber != null && data.seeds.find((s) => s.seed_number === c.seedNumber);
    if (seed && seed.approved_at) {
      await setApprovedAt(c.seedNumber, null);
      unapproved.push(c.seedNumber);
    }
  }
  saveProgress(COURSE, progress);
  for (const c of closed) {
    console.log(`[flag closed] ${c.phraseId} — ${c.reason}${c.note ? ` (was: ${c.note})` : ''}`);
  }
  if (unapproved.length) console.log(`[flag closed] unapproved seed(s): ${unapproved.join(', ')}`);
  if (adopted.length) console.log(`[flag] recorded what ${adopted.length} older flag(s) were left on`);
  return { closed, unapproved };
}

// ---------- server ----------
const app = express();
app.use(express.json());
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/api/state', async (req, res) => {
  try {
    const data = await loadCourse(req.query.refresh === '1');
    const progress = loadProgress(COURSE);
    const settled = await settleFlags(data, progress);
    let stale = staleApprovals(data, progress);
    // Never bulk-write approvals off a stale snapshot — the seeds it names may
    // already have been reviewed in the window the snapshot cannot see.
    if (ENFORCE_ON_LOAD && stale.length && !data.offline) {
      for (const n of stale) await setApprovedAt(n, null);
      console.log(`[enforce-on-load] unapproved ${stale.length} seed(s) holding unchecked phrases`);
      stale = [];
    }
    res.json({ ...data, progress, staleApprovals: stale, closedFlags: settled.closed, flagUnapprovals: settled.unapproved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// status: 'ok' | 'flagged' | null (clear)
app.post('/api/decision', async (req, res) => {
  const { phraseId, status, note } = req.body || {};
  if (!phraseId || !['ok', 'flagged', null].includes(status ?? null)) {
    return res.status(400).json({ error: 'phraseId and status (ok|flagged|null) required' });
  }
  const progress = loadProgress(COURSE);
  if (status === null) delete progress.decisions[phraseId];
  else progress.decisions[phraseId] = { status, note: note || '', at: new Date().toISOString() };
  progress.lastPhraseId = phraseId;
  // He has looked at this row again, so the "a flag you left here was resolved"
  // marker has done its job.
  if (progress.resolvedFlags) delete progress.resolvedFlags[phraseId];
  saveProgress(COURSE, progress);

  // Clearing a decision can leave an approved seed with an unchecked phrase —
  // approval would then overstate what has been reviewed, so drop it.
  let unapproved = null;
  try {
    const data = await loadCourse(false);
    // On a stale snapshot approved_at may already have moved, and the write would
    // fail anyway — the decision above is saved, which is what matters offline.
    if (data.offline) return res.json({ ok: true, unapprovedSeed: null, offline: true });
    // Record what the row said when it was flagged — this is what lets the flag
    // close itself later, when the row is fixed by whoever fixes it.
    if (status === 'flagged') {
      const key = resolveKeyFor(data.phrases, phraseId);
      if (key) {
        progress.decisions[phraseId].resolve = key;
        saveProgress(COURSE, progress);
      }
    }
    const phrase = data.phrases.find((p) => p.id === phraseId);
    const seed = phrase && data.seeds.find((s) => s.seed_number === phrase.seed_number);
    if (seed?.approved_at && uncheckedIn(data, progress, seed.seed_number).length) {
      await setApprovedAt(seed.seed_number, null);
      unapproved = seed.seed_number;
    }
  } catch (err) {
    return res.status(500).json({ ok: true, error: `decision saved; unapprove check failed: ${err.message}` });
  }
  res.json({ ok: true, unapprovedSeed: unapproved });
});

app.post('/api/seed/approve', async (req, res) => {
  const seedNumber = Number(req.body?.seedNumber);
  if (!seedNumber) return res.status(400).json({ error: 'seedNumber required' });
  try {
    const data = await loadCourse(false);
    const seedPhrases = data.phrases.filter((p) => p.seed_number === seedNumber);
    const progress = loadProgress(COURSE);
    const notOk = seedPhrases.filter((p) => progress.decisions[p.id]?.status !== 'ok');
    if (notOk.length) {
      return res.status(409).json({ error: `${notOk.length} phrase(s) not marked ok`, phraseIds: notOk.map((p) => p.id) });
    }
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('course_seeds')
      .update({ approved_at: now })
      .eq('course_code', COURSE)
      .eq('seed_number', seedNumber);
    if (error) throw new Error(error.message);
    const seed = data.seeds.find((s) => s.seed_number === seedNumber);
    if (seed) seed.approved_at = now;
    res.json({ ok: true, approved_at: now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/seed/unapprove', async (req, res) => {
  const seedNumber = Number(req.body?.seedNumber);
  if (!seedNumber) return res.status(400).json({ error: 'seedNumber required' });
  try {
    const { error } = await supabase
      .from('course_seeds')
      .update({ approved_at: null })
      .eq('course_code', COURSE)
      .eq('seed_number', seedNumber);
    if (error) throw new Error(error.message);
    const data = await loadCourse(false);
    const seed = data.seeds.find((s) => s.seed_number === seedNumber);
    if (seed) seed.approved_at = null;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Proofread [${COURSE}] → http://${HOST}:${PORT}`);
});
