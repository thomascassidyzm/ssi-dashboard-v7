#!/usr/bin/env node
/**
 * Pod sample listening page — rule BY EAR on a course's pod casting before any
 * bulk generation is allowed to run against it.
 *
 * Usage:  node tools/pod-sample-listen/server.cjs [course ...]
 *         node tools/pod-sample-listen/server.cjs deu_at_for_eng ita_for_eng
 * Then open http://localhost:4751 (colleagues reach it via `tailscale serve`).
 *
 * WHY THIS EXISTS: A-95's second hard condition — sample-first. Tom listens to
 * ~10 phrases per course and approves the CASTING manually before that course's
 * full run. The refusal side of that gate lives in phase-8's /generate-pods;
 * this is the side Tom's ear plugs into.
 *
 * READ-ONLY on course data. It never generates audio, never relinks a clip and
 * never writes to course_* or listening_* tables. The only thing it writes is
 * the reviewer's own verdicts, to VERDICTS_PATH.
 *
 * Clips are streamed through this process from S3 (same approach as
 * tools/seed1-listen/server.cjs) rather than handed out as presigned URLs: a
 * presigned URL expires, and a listening page that quietly dies a week later is
 * worse than one that never existed.
 *
 * The course list, the cast and the clips are read LIVE on every request, not
 * snapshotted at boot. A recast that lands while this page is open must show up
 * on refresh — otherwise Tom approves a cast that is no longer the cast, which
 * is precisely the failure the fingerprint gate exists to prevent.
 */
const path = require('path');
const fs = require('fs');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const REPO = path.join(__dirname, '..', '..');
require('dotenv').config({ path: path.join(REPO, '.env') });

const COURSES = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = process.env.LISTEN_PORT || process.env.PORT || 4751;
// Loopback by default: colleagues reach this through `tailscale serve`, which
// proxies from localhost, so binding all interfaces only ever exposed it to the
// public internet.
const HOST = process.env.BIND_HOST || '127.0.0.1';
const DATA_DIR = process.env.POD_SAMPLE_DATA_DIR || path.join(REPO, 'scripts', 'pod-sample-listen');
const VERDICTS_PATH = path.join(DATA_DIR, 'verdicts.json');
// How many clips a reviewer is asked to sit through per course. Matches the
// server-side sample_limit cap on /generate-pods — asking for more than were
// ever generated just renders a short list with no sign it is short.
const SAMPLE_LIMIT = Math.max(1, parseInt(process.env.POD_SAMPLE_LIMIT || '10', 10) || 10);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.S3_AUDIO_BUCKET || process.env.S3_BUCKET;

// ---------- verdicts (the only thing this tool writes) ----------
function loadVerdicts() {
  try { return JSON.parse(fs.readFileSync(VERDICTS_PATH, 'utf8')); } catch { return {}; }
}
function saveVerdicts(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = VERDICTS_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 1));
  fs.renameSync(tmp, VERDICTS_PATH);
}

// ---------- live reads ----------
// Which courses to show: the argv list if given, else every course that has at
// least one pod sentence carrying target audio — so the page is useful without
// having to be told what was just generated.
async function courseList() {
  if (COURSES.length) return COURSES;
  const { data, error } = await supabase
    .from('listening_pods').select('course_code').order('course_code');
  if (error) throw new Error(error.message);
  return [...new Set((data || []).map((r) => r.course_code))];
}

// The cast as STORED (listening_pods.speakers) — the same snapshot phase-8's
// resolvePodSpeakerVoice reads at generation time. Deliberately not re-resolved
// from the voice pools: what Tom approves has to be what will actually render.
function castOf(pod) {
  const speakers = pod.speakers || {};
  const voices = new Map();
  for (const [name, a] of Object.entries(speakers)) {
    if (name === '_default' || !a) continue;
    for (const track of ['target', 'known']) {
      const v = a[track];
      if (!v || !v.voice_id) continue;
      const key = `${track}|${v.provider}|${v.voice_id}|${v.locale || ''}`;
      if (!voices.has(key)) {
        voices.set(key, { track, provider: v.provider, voice_id: v.voice_id, name: v.name, locale: v.locale || null, speakers: [] });
      }
      voices.get(key).speakers.push(name);
    }
  }
  const all = [...voices.values()];
  return {
    speaker_count: Object.keys(speakers).filter((k) => k !== '_default').length,
    deferred: Object.values(speakers).filter((v) => v && v.deferred).length,
    target: all.filter((v) => v.track === 'target'),
    known: all.filter((v) => v.track === 'known'),
  };
}

async function courseView(courseCode) {
  const { data: pods, error: pErr } = await supabase
    .from('listening_pods').select('id, speakers, title').eq('course_code', courseCode);
  if (pErr) throw new Error(pErr.message);
  if (!pods || !pods.length) return { course: courseCode, error: 'no pods' };

  const { data: sentences, error: sErr } = await supabase
    .from('listening_pod_sentences')
    .select('id, pod_id, global_order, scene_number, speaker, target_text, known_text, target_audio_id, known_audio_id')
    .in('pod_id', pods.map((p) => p.id))
    .order('global_order');
  if (sErr) throw new Error(sErr.message);

  const withAudio = (sentences || []).filter((s) => s.target_audio_id);
  // Spread the sample across SPEAKERS, not just across the top of the pod: a
  // two-voice cast is only judgeable if both voices are actually in the sample.
  // Round-robin by speaker, in global order, then fill from whatever is left.
  const bySpeaker = new Map();
  for (const s of withAudio) {
    if (!bySpeaker.has(s.speaker)) bySpeaker.set(s.speaker, []);
    bySpeaker.get(s.speaker).push(s);
  }
  const picked = [];
  const queues = [...bySpeaker.values()];
  while (picked.length < SAMPLE_LIMIT && queues.some((q) => q.length)) {
    for (const q of queues) {
      if (picked.length >= SAMPLE_LIMIT) break;
      if (q.length) picked.push(q.shift());
    }
  }
  picked.sort((a, b) => (a.global_order || 0) - (b.global_order || 0));

  const audioIds = picked.flatMap((s) => [s.target_audio_id, s.known_audio_id].filter(Boolean));
  let byAudio = new Map();
  if (audioIds.length) {
    const { data: au } = await supabase
      .from('course_audio').select('id, voice_id, duration_ms, s3_key, created_at').in('id', audioIds);
    byAudio = new Map((au || []).map((a) => [a.id, a]));
  }

  return {
    course: courseCode,
    pods: pods.map((p) => ({ id: p.id, title: p.title, cast: castOf(p) })),
    total_sentences: (sentences || []).length,
    with_target_audio: withAudio.length,
    clips: picked.map((s) => ({
      id: s.id,
      speaker: s.speaker,
      scene: s.scene_number,
      order: s.global_order,
      target_text: s.target_text,
      known_text: s.known_text,
      target: s.target_audio_id ? { id: s.target_audio_id, ...(byAudio.get(s.target_audio_id) || {}) } : null,
      known: s.known_audio_id ? { id: s.known_audio_id, ...(byAudio.get(s.known_audio_id) || {}) } : null,
    })),
  };
}

// ---------- app ----------
const app = express();
app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/courses', async (req, res) => {
  try {
    const codes = await courseList();
    const views = [];
    for (const c of codes) {
      try { views.push(await courseView(c)); } catch (e) { views.push({ course: c, error: e.message }); }
    }
    res.json({ sample_limit: SAMPLE_LIMIT, verdicts: loadVerdicts(), courses: views });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stream a clip's bytes. Resolved through course_audio.s3_key, never through a
// conventional `mastered/<row-id>.mp3` path — the versioned no-holes swap keeps
// the row id stable and writes a NEW s3_key, so a convention-built URL serves
// the PRE-SWAP object for ever.
app.get('/api/audio/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('course_audio').select('s3_key').eq('id', req.params.id).single();
    if (error || !data || !data.s3_key) return res.status(404).json({ error: 'unknown clip id' });
    const out = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: data.s3_key }));
    res.setHeader('Content-Type', 'audio/mpeg');
    if (out.ContentLength) res.setHeader('Content-Length', out.ContentLength);
    out.Body.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// The reviewer's verdict. Recorded ONLY here — this tool deliberately does not
// write the formal approval that unblocks bulk generation. That stays a
// separate, deliberate step (tools/pod-approve-voices.cjs), so a stray tap on a
// phone can never be the thing that releases a four-thousand-clip run.
app.post('/api/verdict/:course', (req, res) => {
  const { verdict, note } = req.body || {};
  if (!['approve', 'reject', 'unsure'].includes(verdict)) {
    return res.status(400).json({ error: 'verdict must be approve | reject | unsure' });
  }
  const state = loadVerdicts();
  state[req.params.course] = { verdict, note: note || '', at: new Date().toISOString() };
  saveVerdicts(state);
  res.json({ ok: true, course: req.params.course, ...state[req.params.course] });
});

app.listen(PORT, HOST, () => {
  console.log(`Pod sample listen → http://${HOST}:${PORT}  (${COURSES.length ? COURSES.join(', ') : 'all courses with pods'})`);
  console.log(`Verdicts → ${VERDICTS_PATH}`);
});
