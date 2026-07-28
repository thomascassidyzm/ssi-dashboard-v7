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
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const COURSE = (process.argv[2] || 'fin_for_eng').trim();
const PORT = process.env.PROOFREAD_PORT || 4747;
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
async function loadCourse(force) {
  if (cache && !force) return cache;
  const [seeds, legos, phrases] = await Promise.all([
    fetchAll('course_seeds', 'seed_number, known_text, target_text, approved_at, flagged_at', [['seed_number', {}]]),
    fetchAll('course_legos', 'seed_number, lego_index, known_text, target_text', [['seed_number', {}], ['lego_index', {}]]),
    fetchAll('course_practice_phrases', 'id, seed_number, lego_index, position, known_text, target_text, phrase_role', [
      ['seed_number', {}], ['lego_index', {}], ['position', {}],
    ], (q) => q.neq('phrase_role', 'component')),
  ]);
  cache = { course: COURSE, seeds, legos, phrases };
  return cache;
}

// ---------- server ----------
const app = express();
app.use(express.json());
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/api/state', async (req, res) => {
  try {
    const data = await loadCourse(req.query.refresh === '1');
    res.json({ ...data, progress: loadProgress(COURSE) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// status: 'ok' | 'flagged' | null (clear)
app.post('/api/decision', (req, res) => {
  const { phraseId, status, note } = req.body || {};
  if (!phraseId || !['ok', 'flagged', null].includes(status ?? null)) {
    return res.status(400).json({ error: 'phraseId and status (ok|flagged|null) required' });
  }
  const progress = loadProgress(COURSE);
  if (status === null) delete progress.decisions[phraseId];
  else progress.decisions[phraseId] = { status, note: note || '', at: new Date().toISOString() };
  progress.lastPhraseId = phraseId;
  saveProgress(COURSE, progress);
  res.json({ ok: true });
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

app.listen(PORT, () => {
  console.log(`Proofread [${COURSE}] → http://localhost:${PORT}`);
});
