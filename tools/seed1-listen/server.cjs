#!/usr/bin/env node
/**
 * Seed-1 listening harness — rule BY EAR on the live seed-1 clips of a course.
 *
 * Usage:  node tools/seed1-listen/server.cjs [courseCode]   (default fra_for_eng)
 * Then open http://localhost:4749
 *
 * WHY THIS EXISTS: a length-based census of fra_for_eng seed 1 reported zero
 * truncated clips, but the app plainly has cut ones in it. The failure mode is
 * that the END of a clip is SILENCED rather than shortened — the file is still
 * full length, so every duration-based detector is blind to it. The only
 * instrument that sees it is Kai's ear, so this serves the clips to his phone.
 *
 * READ-ONLY on course data. It never touches course_* tables, never generates
 * or relinks audio; the only thing it writes is the reviewer's own marks.
 *
 * Data (all under SEED1_DATA_DIR, default scripts/<slug>/):
 *   manifest-<course>.json   the live clips           (built by probe/manifest.cjs; required)
 *   suspicion-<course>.json  optional ranking, [{id, rank, score, ...}]
 *   marks-<course>.json      this tool's only output  (written atomically)
 *
 * The suspicion file is re-read on every /api/clips call, not cached at boot,
 * so a ranking that lands while the server is up takes effect on next refresh.
 * Every clip is always listed — ranked ones first, then the rest — because a
 * ranking Kai cannot disconfirm is worthless.
 */
const path = require('path');
const fs = require('fs');
const express = require('express');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const REPO = path.join(__dirname, '..', '..');
require('dotenv').config({ path: path.join(REPO, '.env') });

const COURSE = (process.argv.find((a, i) => i >= 2 && !a.startsWith('--')) || 'fra_for_eng').trim();
const PORT = process.env.LISTEN_PORT || process.env.PORT || 4749;
// The manifest and the sibling worker's ranking live in the gitignored scripts/
// workspace of the MAIN checkout, which a dedicated service worktree does not
// have — so the directory is overridable and the unit file points at it.
const DATA_DIR = process.env.SEED1_DATA_DIR || path.join(REPO, 'scripts', 'fra-seed1-listen');

const manifestPath = path.join(DATA_DIR, `manifest-${COURSE}.json`);
const suspicionPath = path.join(DATA_DIR, `suspicion-${COURSE}.json`);
const marksPath = path.join(DATA_DIR, `marks-${COURSE}.json`);

if (!fs.existsSync(manifestPath)) {
  console.error(`Missing manifest: ${manifestPath}`);
  process.exit(1);
}
// Re-read on every request, mtime-gated, exactly as the ranking is. The seed-1 clip
// set is NOT stable while this page is open: a components campaign linked 4 new LEGOs
// (16 clips, 65 -> 81) during the hour this tool was built. A manifest snapshotted at
// boot would have gone on serving 65 and shown the reviewer a short list with no sign
// it was short — the silent-staleness failure this whole exercise is about.
let _mf = { mtime: 0, clips: [], byId: new Map() };
function manifestState() {
  let mtime = 0;
  try { mtime = fs.statSync(manifestPath).mtimeMs; } catch { return _mf; }
  if (mtime !== _mf.mtime) {
    try {
      const clips = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).clips || [];
      _mf = { mtime, clips, byId: new Map(clips.map((c) => [c.id, c])) };
    } catch { /* keep the last good manifest rather than serving an empty page */ }
  }
  return _mf;
}
manifestState();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ---------- marks ----------
function loadMarks() {
  try {
    return JSON.parse(fs.readFileSync(marksPath, 'utf8'));
  } catch {
    return { course: COURSE, marks: {} };
  }
}
function saveMarks(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = marksPath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 1));
  fs.renameSync(tmp, marksPath);
}

// ---------- ranking ----------
// Re-read per request. Absent or malformed → manifest order, no ranking shown.
function loadSuspicion() {
  try {
    const raw = JSON.parse(fs.readFileSync(suspicionPath, 'utf8'));
    const rows = Array.isArray(raw) ? raw : raw.ranking || raw.clips || [];
    const byId = new Map();
    for (const r of rows) if (r && r.id) byId.set(r.id, r);
    return byId;
  } catch {
    return new Map();
  }
}

function orderedClips() {
  const susp = loadSuspicion();
  const rank = (c) => {
    const r = susp.get(c.id);
    return r && Number.isFinite(Number(r.rank)) ? Number(r.rank) : Infinity;
  };
  return manifestState().clips
    .map((c, i) => ({ c, i }))
    .sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i)
    .map(({ c }) => {
      const s = susp.get(c.id) || null;
      // The clip voices one side of the row; the other side is context.
      const voiced = c.role === 'known' || c.role === 'presentation' ? 'known' : 'target';
      return {
        id: c.id,
        role: c.role,
        text: c.text,
        voiced,
        known_text: c.known_text,
        target_text: c.target_text,
        language: c.language,
        voice_id: c.voice_id,
        duration_ms: c.duration_ms,
        slots: c.slots,
        suspicion: s && {
          rank: s.rank ?? null,
          score: s.score ?? null,
          trailingSilenceMs: s.trailingSilenceMs ?? null,
          stepDb: s.stepDb ?? null,
          note: s.note ?? null,
        },
      };
    });
}

// ---------- server ----------
const app = express();
app.use(express.json());

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/api/clips', (_req, res) => {
  const state = loadMarks();
  res.json({
    course: COURSE,
    ranked: fs.existsSync(suspicionPath),
    clips: orderedClips(),
    marks: state.marks || {},
  });
});

// status: 'good' | 'cut' | null (clear)
app.post('/api/mark', (req, res) => {
  const body = req.body || {};
  const { id, status } = body;
  if (!id || !manifestState().byId.has(id)) return res.status(400).json({ error: 'unknown clip id' });
  // A body with no `status` key at all is a malformed request, not a request to
  // clear. Clearing must be explicit (status: null) — otherwise a garbled POST
  // silently erases a verdict the reviewer already gave.
  if (!('status' in body)) return res.status(400).json({ error: 'missing status; send good|cut|null' });
  if (![ 'good', 'cut', null ].includes(status)) {
    return res.status(400).json({ error: 'status must be good|cut|null' });
  }
  const state = loadMarks();
  state.marks = state.marks || {};
  if (status == null) delete state.marks[id];
  else state.marks[id] = { status, at: new Date().toISOString() };
  saveMarks(state);
  res.json({ ok: true, marks: state.marks });
});

// Only manifest ids resolve to a key — an arbitrary S3 key is never fetchable.
app.get('/api/audio/:id', async (req, res) => {
  const clip = manifestState().byId.get(req.params.id);
  if (!clip || !clip.s3_key) return res.status(404).json({ error: 'unknown clip id' });
  const range = req.headers.range;
  try {
    const out = await s3.send(new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: clip.s3_key,
      ...(range ? { Range: range } : {}),
    }));
    res.status(range && out.ContentRange ? 206 : 200);
    res.set('Content-Type', 'audio/mpeg');
    res.set('Accept-Ranges', 'bytes');
    res.set('Cache-Control', 'no-store');
    if (out.ContentLength != null) res.set('Content-Length', String(out.ContentLength));
    if (out.ContentRange) res.set('Content-Range', out.ContentRange);
    out.Body.pipe(res);
  } catch (err) {
    res.status(502).json({ error: `S3 GET failed: ${err.name}` });
  }
});

app.listen(PORT, () => {
  console.log(`Seed-1 listen [${COURSE}] ${manifestState().clips.length} clips → http://localhost:${PORT}`);
  console.log(`  data dir: ${DATA_DIR}`);
});
