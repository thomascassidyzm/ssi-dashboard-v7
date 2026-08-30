#!/usr/bin/env node
/**
 * GENERATE ON DEMAND — asynchronous, capped, cached.
 *
 * Tom's shape, 2026-08-29: "pick the cells, let them fill, judge when they land.
 * Otherwise you're waiting on a spinner and judging whatever finished first."
 * So a generate action returns a job id immediately and the page polls; nothing
 * blocks on a generation.
 *
 * REUSES the existing generation path — tools/frame-layer/generate-candidates.cjs
 * spawned as a child process. The prompt is not reimplemented here and must not be.
 *
 * THE CACHE IS THE CANDIDATE FILE. labs/basket-lab/candidates/<course>-<seed>.json
 * is the whole cache: if it exists the cell renders instantly, with its own
 * `generated` stamp and `build_sha`. Regenerating ARCHIVES the previous file
 * beside it as <course>-<seed>--<stamp>.json rather than overwriting it, because
 * a verdict is pinned to a candidate stamp and silently replacing a set Tom has
 * already judged would orphan his verdict.
 *
 * CONCURRENCY IS CAPPED AT 2. This is a 4-core box that also runs the Command
 * Surface — Tom's own conversation and every other worker. Seven workers each
 * running a test suite took a box of this class to load 25 on 2026-08-25.
 * Queued cells say QUEUED; they never pretend to be running.
 *
 * WRITES NOTHING TO THE DATABASE. The child reads Supabase and writes one JSON
 * file; no course row is touched by anything in this file or the one it spawns.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CANDIDATES = path.join(__dirname, 'candidates');
const GENERATOR = path.join(ROOT, 'tools', 'frame-layer', 'generate-candidates.cjs');

// 2, not 3: the box also carries Tom's own conversation, and a generation is a
// ~60,000-character prompt held open for up to fifteen minutes.
const MAX_RUNNING = +(process.env.BASKET_LAB_CONCURRENCY || 2);

const keyOf = (course, seed) => `${course}-${seed}`;
const fileFor = (course, seed) => path.join(CANDIDATES, `${keyOf(course, seed)}.json`);

const jobs = new Map();   // key -> job
const queue = [];         // keys waiting for a slot

function readCandidates(course, seed) {
  const at = fileFor(course, seed);
  if (!fs.existsSync(at)) return null;
  try { return JSON.parse(fs.readFileSync(at, 'utf8')); }
  catch (e) { return { broken: e.message }; }
}

/** Every archived set for this cell, newest first — a verdict's stamp stays readable. */
function archivesFor(course, seed) {
  const pre = `${keyOf(course, seed)}--`;
  if (!fs.existsSync(CANDIDATES)) return [];
  return fs.readdirSync(CANDIDATES).filter(f => f.startsWith(pre) && f.endsWith('.json')).sort().reverse();
}

function running() { return [...jobs.values()].filter(j => j.state === 'running').length; }

function pump() {
  while (running() < MAX_RUNNING && queue.length) {
    const job = jobs.get(queue.shift());
    if (!job || job.state !== 'queued') continue;
    start(job);
  }
}

function start(job) {
  job.state = 'running';
  job.started = Date.now();
  const args = [GENERATOR, job.course, String(job.seed), '--passes', String(job.passes)];
  const child = spawn(process.execPath, args, { cwd: ROOT, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
  job.pid = child.pid;
  let tail = '';
  const grab = (b) => { tail = (tail + b.toString()).slice(-4000); };
  child.stdout.on('data', grab);
  child.stderr.on('data', grab);
  child.on('error', (e) => { job.state = 'failed'; job.finished = Date.now(); job.error = e.message; pump(); });
  child.on('close', (code) => {
    job.finished = Date.now();
    job.log = tail;
    if (code === 0 && readCandidates(job.course, job.seed)) {
      job.state = 'done';
    } else {
      job.state = 'failed';
      // the actual cause, not "something went wrong" — a failed cell must say why
      job.error = (tail.trim().split('\n').filter(Boolean).slice(-4).join(' / ') || `generator exited ${code}`).slice(0, 600);
    }
    pump();
  });
}

/**
 * @param regenerate  overwrite an existing set, archiving the old one first
 * @returns the job (already queued or running if one exists for this cell)
 */
function enqueue({ course, seed, passes = 2, regenerate = false }) {
  const key = keyOf(course, seed);
  const live = jobs.get(key);
  if (live && (live.state === 'queued' || live.state === 'running')) return live;

  if (regenerate) {
    const at = fileFor(course, seed);
    if (fs.existsSync(at)) {
      let stamp = new Date().toISOString().replace(/[:.]/g, '-');
      try { stamp = (JSON.parse(fs.readFileSync(at, 'utf8')).generated || stamp).replace(/[:.]/g, '-'); } catch {}
      fs.renameSync(at, path.join(CANDIDATES, `${key}--${stamp}.json`));
    }
  } else if (readCandidates(course, seed)) {
    // the file IS the cache: an unforced generate on a cell that already has one
    // is a no-op, reported as such rather than silently burning a pass
    return { key, course, seed, state: 'cached', started: null, finished: null };
  }

  const job = { key, course, seed, passes, state: 'queued', queued: Date.now(),
                started: null, finished: null, error: null };
  jobs.set(key, job);
  queue.push(key);
  pump();
  return job;
}

/** What a cell should say right now. One of: none / cached / queued / running / done / failed. */
function statusOf(course, seed) {
  const key = keyOf(course, seed);
  const job = jobs.get(key);
  const cand = readCandidates(course, seed);
  const base = { key, course, seed,
    has_candidates: !!cand,
    generated: cand ? cand.generated : null,
    build_sha: cand ? cand.build_sha : null,
    archives: archivesFor(course, seed).length };
  if (job && (job.state === 'queued' || job.state === 'running')) {
    return { ...base, state: job.state,
             elapsed_ms: job.started ? Date.now() - job.started : null,
             queue_position: job.state === 'queued' ? Math.max(1, queue.indexOf(key) + 1) : null };
  }
  if (job && job.state === 'failed') return { ...base, state: 'failed', error: job.error, log: job.log };
  if (cand) return { ...base, state: 'done' };
  return { ...base, state: 'none' };
}

const snapshot = () => ({ max_running: MAX_RUNNING, running: running(), queued: queue.length,
                          jobs: [...jobs.values()].map(j => ({ ...j, log: undefined })) });

module.exports = { enqueue, statusOf, readCandidates, archivesFor, fileFor, keyOf, snapshot, MAX_RUNNING, CANDIDATES };
