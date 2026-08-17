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

const COURSE = (process.argv.find((a, i) => i >= 2 && !a.startsWith('--')) || 'fin_for_eng').trim();
const ENFORCE_ON_LOAD = process.argv.includes('--enforce-on-load');
const PORT = process.env.PROOFREAD_PORT || 4747;
// Loopback by default: colleagues reach this through `tailscale serve`, which proxies
// from localhost, so binding all interfaces only ever exposed it to the public internet.
const HOST = process.env.BIND_HOST || '127.0.0.1';
const PROGRESS_DIR = path.join(__dirname, 'progress');

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
async function loadCourse(force) {
  if (cache && !force && Date.now() - cacheFetchedAt < CACHE_TTL_MS) return cache;
  const [seeds, legos, phrases] = await Promise.all([
    fetchAll('course_seeds', 'seed_number, known_text, target_text, approved_at, flagged_at', [['seed_number', {}]]),
    fetchAll('course_legos', 'seed_number, lego_index, known_text, target_text', [['seed_number', {}], ['lego_index', {}]]),
    fetchAll('course_practice_phrases', 'id, seed_number, lego_index, position, known_text, target_text, phrase_role', [
      ['seed_number', {}], ['lego_index', {}], ['position', {}],
    ], (q) => q.neq('phrase_role', 'component')),
  ]);
  cacheFetchedAt = Date.now();
  cache = { course: COURSE, seeds, legos, phrases, fetchedAt: cacheFetchedAt };
  return cache;
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

// ---------- server ----------
const app = express();
app.use(express.json());
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/api/state', async (req, res) => {
  try {
    const data = await loadCourse(req.query.refresh === '1');
    const progress = loadProgress(COURSE);
    let stale = staleApprovals(data, progress);
    if (ENFORCE_ON_LOAD && stale.length) {
      for (const n of stale) await setApprovedAt(n, null);
      console.log(`[enforce-on-load] unapproved ${stale.length} seed(s) holding unchecked phrases`);
      stale = [];
    }
    res.json({ ...data, progress, staleApprovals: stale });
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
  saveProgress(COURSE, progress);

  // Clearing a decision can leave an approved seed with an unchecked phrase —
  // approval would then overstate what has been reviewed, so drop it.
  let unapproved = null;
  try {
    const data = await loadCourse(false);
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
