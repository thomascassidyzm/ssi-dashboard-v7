#!/usr/bin/env node
/**
 * WRITE FRAME MASKS: put each row's frames on the row, from the frame cache we already paid for (job #446,
 * 2026-11-12, the French infinite-play-by-frame-coverage sample; plan https://watson-1.tail4968cb.ts.net/d/46895a47).
 *
 *   node tools/frame-layer/v4/write-frame-masks.cjs fra_for_eng --dry-run   # count only: totals, covered, stay NULL
 *   node tools/frame-layer/v4/write-frame-masks.cjs fra_for_eng             # write, through Popty's edit-batch
 *
 * What it does.
 *   - Reads the frame cache LOCALLY (frame-tagger's TagCache over tags-P-<codex version>-haiku.jsonl). It never
 *     calls a model: a text the cache lacks stays NULL and is counted. Running tag-course.cjs first is a separate,
 *     paid decision this tool does not make.
 *   - frame_mask = OR of 1 << (n - 1) for every frame Pn the cache gives the row's known text. P1 is bit 0, P31 is
 *     bit 30, so all 31 frames fit a signed Postgres integer (bit 31 would be negative). 0 = tagged, no frame.
 *   - Writes course_seeds and the BUILD/USE rows of course_practice_phrases (the rows the course bundle carries).
 *     Component rows are counted, never written: nothing reads a component's frames.
 *   - Writes only a row whose mask differs from what it holds, and never writes NULL, so a non-null mask is never
 *     overwritten with NULL. Each op carries the row's current mask as a before-state assertion; drift aborts its batch.
 *   - The write goes through Popty's POST /api/production/:course/edit-batch (one transaction per batch on the
 *     owner login, an undo file per batch, and Popty bumps the course's content_version after each batch it commits,
 *     so the learner app's edge-cached bundle lets go of the old shape). The agent login cannot write course content.
 *   - Rate: --batch ops per request (default 500), --pause-ms between requests (default 2000).
 *
 * @db-live-write: reads the course's seeds and phrases (one SELECT each) to plan frame_mask writes, which go through Popty's edit-batch; job #446
 */
const fs = require('fs');
const path = require('path');

const ROLE = { build: 'build', practice: 'build', use: 'use', eternal_eligible: 'use', component: 'component' };
const FRAME_RE = /^P(\d+)$/;

/** Frames ['P1','P20'] → integer mask, P1 = bit 0. Unknown ids are ignored; null frames → null. */
function maskOf(frames) {
  if (!Array.isArray(frames)) return null;
  let m = 0;
  for (const f of frames) {
    const hit = FRAME_RE.exec(String(f));
    const n = hit ? Number(hit[1]) : 0;
    if (n >= 1 && n <= 31) m |= 1 << (n - 1);
  }
  return m;
}

/**
 * Plan the writes and the coverage count. `cache` answers get(text) → {frames} | null (TagCache or MemoryCache).
 * rows: { seeds: [{seed_number, known_text, frame_mask}], phrases: [{id, phrase_role, known_text, frame_mask}] }.
 */
function plan(rows, cache) {
  const count = {};
  const bump = (cls, k) => { count[cls] = count[cls] || { total: 0, covered: 0, stay_null: 0, to_write: 0, unchanged: 0 }; count[cls][k]++; };
  const ops = [];
  const consider = (cls, row, op) => {
    bump(cls, 'total');
    const tag = row.known_text ? cache.get(String(row.known_text).trim()) : null;
    const mask = tag ? maskOf(tag.frames) : null;
    if (mask === null) { bump(cls, 'stay_null'); return; }
    bump(cls, 'covered');
    const have = row.frame_mask === undefined || row.frame_mask === null ? null : Number(row.frame_mask);
    if (have === mask) { bump(cls, 'unchanged'); return; }
    bump(cls, 'to_write');
    if (op) ops.push({ ...op, set: { frame_mask: mask }, expect: { frame_mask: have } });
  };
  for (const s of rows.seeds || []) consider('seed', s, { op: 'seed.update', seed_number: s.seed_number });
  for (const p of rows.phrases || []) {
    const cls = ROLE[p.phrase_role] || 'other';
    consider(cls, p, cls === 'build' || cls === 'use' ? { op: 'phrase.update', phrase_id: p.id } : null);
  }
  // Components and other roles are counted, never written.
  for (const cls of ['component', 'other']) if (count[cls]) count[cls].to_write = 0;
  return { ops, count };
}

function formatCount(course, count) {
  const lines = [`${course}: frame cache coverage (rows the cache covers / stay NULL)`];
  for (const cls of ['seed', 'build', 'use', 'component', 'other']) {
    const c = count[cls];
    if (!c) continue;
    const pct = c.total ? ((100 * c.covered) / c.total).toFixed(1) : '0.0';
    lines.push(`  ${cls.padEnd(9)} total ${String(c.total).padStart(6)}  covered ${String(c.covered).padStart(6)} (${pct}%)  stay NULL ${String(c.stay_null).padStart(5)}  to write ${String(c.to_write).padStart(6)}  already right ${c.unchanged}`);
  }
  return lines.join('\n');
}

async function readCourse(course) {
  const db = require('../../../services/shared/agent-db.cjs');
  const pg = await db.connect();
  try {
    // Before the migration lands the column is absent: read it as NULL so the dry run still counts.
    const cols = (await pg.query(
      `SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'frame_mask'
         AND table_name = ANY($1::text[])`, [['course_seeds', 'course_practice_phrases']])).rows.map((r) => r.table_name);
    const fm = (t) => (cols.includes(t) ? 'frame_mask' : 'NULL::integer AS frame_mask');
    const seeds = (await pg.query(
      `SELECT seed_number, known_text, ${fm('course_seeds')} FROM course_seeds WHERE course_code = $1 ORDER BY seed_number`, [course])).rows;
    const phrases = (await pg.query(
      `SELECT id, phrase_role, known_text, ${fm('course_practice_phrases')} FROM course_practice_phrases WHERE course_code = $1`, [course])).rows;
    return { seeds, phrases, hasColumn: cols.length === 2 };
  } finally {
    await pg.end();
  }
}

async function postBatch(base, course, ops) {
  const res = await fetch(`${base}/api/production/${encodeURIComponent(course)}/edit-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-service-name': 'write-frame-masks', 'x-agent-role': 'content-sweep' },
    body: JSON.stringify({ ops, apply: true }),
  });
  const out = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok || !out.applied) throw new Error(`edit-batch refused (${res.status}): ${out.code || ''} ${out.error || JSON.stringify(out).slice(0, 300)}`);
  return out;
}

function arg(name, dflt) {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}

async function main() {
  const course = process.argv[2];
  if (!course || course.startsWith('-')) { console.error('usage: write-frame-masks.cjs <course_code> [--dry-run] [--batch 500] [--pause-ms 2000]'); process.exit(2); }
  const dry = process.argv.includes('--dry-run');
  const batch = Math.max(1, Math.min(2000, Number(arg('--batch', 500))));
  const pauseMs = Math.max(0, Number(arg('--pause-ms', 2000)));
  const { TagCache } = require('../frame-tagger.cjs');
  const cache = new TagCache();
  console.log(`cache: ${cache.file} (${cache.map.size} texts)`);
  const rows = await readCourse(course);
  const { ops, count } = plan(rows, cache);
  console.log(formatCount(course, count));
  console.log(`frame_mask column present: ${rows.hasColumn ? 'yes' : 'NO (migration not applied — counted against NULL)'}`);
  console.log(`ops planned: ${ops.length} in ${Math.ceil(ops.length / batch)} batch(es) of ≤${batch}`);
  if (dry) { console.log('DRY RUN: nothing written'); return; }
  if (!rows.hasColumn) { console.error('refusing to write: frame_mask is not on both tables yet'); process.exit(3); }

  const base = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
  const dir = process.env.CS_SCRATCH || path.join(require('os').homedir(), 'ssi-evidence', 'ssi-dashboard-v7', 'frame-tags');
  const logFile = path.join(dir, `write-frame-masks-${course}-${new Date().toISOString().replace(/[:.]/g, '-')}-applied-log.json`);
  const log = { course, count, batches: [] };
  for (let i = 0; i < ops.length; i += batch) {
    const slice = ops.slice(i, i + batch);
    const out = await postBatch(base, course, slice);
    log.batches.push({ from: i, ops: slice.length, undo_file: out.undo_file || null, event: out.event_id || null });
    fs.writeFileSync(logFile, JSON.stringify(log, null, 1));
    console.log(`  batch ${i / batch + 1}: ${slice.length} ops applied${out.undo_file ? `, undo ${out.undo_file}` : ''}`);
    if (i + batch < ops.length && pauseMs) await new Promise((r) => setTimeout(r, pauseMs));
  }
  console.log(`done: ${ops.length} rows written; log ${logFile}`);
}

module.exports = { maskOf, plan, formatCount };

if (require.main === module) main().catch((e) => { console.error(e.message || e); process.exit(1); });
