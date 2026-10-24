#!/usr/bin/env node
'use strict';
// CUT BEFORE RENDER (job #374): the opt-in path that lets a re-record take a phrase out of a cast-voice clip of a LONGER
// sentence instead of rendering it fresh. Tom 2026-10-24 on the zho dice-and-splice pairs: "the joins are not worth it, but
// the cuts work great. That will save a decent slug of credits."
//
// Same census as revoice-seeds-to-cast (slots whose clip is TTS on a voice other than the cast voice for the role). For each
// outstanding (role, words) it looks for a clip in the course, in that role's CAST voice, carrying word_timings, whose text
// contains the words and is longer; the cut points come from those timings (Cartesia writes Chinese per character and they
// describe the mastered clip — docs/DECISIONS.md, job #340). Then it posts Popty's ingest-cut for every slot of the ask: the
// first stores the cut, the rest find it library-first. Popty refuses anything off-rule (#359, tail click, joins) and nothing
// here writes the DB.
//
// It runs AHEAD of a render run, never inside one: revoice-seeds-to-cast's render is library-first, so a cut indexed here
// before the renderer reaches its words is linked at 0 characters, and a re-run census no longer counts the slots it moved.
//   node tools/audio/cut-before-render.cjs --course zho_for_eng --from 600 --seeds 668 [--limit 5]   # plan: lists cuts, posts nothing
//   CUT=1 node tools/audio/cut-before-render.cjs …          # posts ingest-cut as DRY RUNS (Popty cuts + audits, stores nothing)
//   CUT=1 APPLY=1 ROLLBACK_FILE=… node tools/audio/cut-before-render.cjs …   # real: stores + links; one rollback line per link
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
const { staleAsks, castFromVoiceConfig, postWith } = require('./revoice-seeds-to-cast.cjs');

const URL = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'cut-before-render (job #374)';
const PUNCT = /[\s\p{P}\p{S}]/u;
// Seconds of silence the engine left either side of the cut, unless that side is the clip's own edge. 0.1 by default because
// Cartesia's zho timings step in 0.08 s frames, so a 0.08 'gap' is usually no pause at all (seen on seeds 600-668, job #374).
const MIN_GAP = Number(process.env.MIN_GAP) > 0 ? Number(process.env.MIN_GAP) : 0.1;

/**
 * Pure. Where to cut `text` out of a source clip, or null. The source's characters are mapped to its per-character timings
 * (punctuation and spaces carry none); the span is the first place the bare words occur. Cut points sit midway in the gap
 * either side, or at the clip's own edge where the span opens or closes the source. A span with either edge mid-speech
 * (gap < MIN_GAP) is refused: a mid-speech onset carries the previous syllable, a mid-speech end is the clipped tail.
 */
function sourceSpan(source, text) {
  const wt = source.word_timings;
  if (!wt || !Array.isArray(wt.words) || !wt.words.length) return null;
  const raw = [...String(source.text || '')];
  const keep = []; // indexes into raw of the non-punctuation characters, in order
  raw.forEach((c, i) => { if (!PUNCT.test(c)) keep.push(i); });
  const tChars = [...String(wt.words.join(''))].filter((c) => !PUNCT.test(c));
  if (tChars.length !== keep.length) return null; // timings do not spell the text: never guess
  const starts = [], ends = [];
  wt.words.forEach((w, k) => { const cs = [...String(w)].filter((c) => !PUNCT.test(c)); const s = +wt.starts[k], e = +wt.ends[k]; cs.forEach((_, j) => { starts.push(s + ((e - s) * j) / cs.length); ends.push(s + ((e - s) * (j + 1)) / cs.length); }); });
  const bareSrc = keep.map((i) => raw[i]).join('').toLowerCase();
  const bare = [...String(text)].filter((c) => !PUNCT.test(c)).join('').toLowerCase();
  if (!bare || bare === bareSrc) return null;
  const at = bareSrc.indexOf(bare);
  if (at < 0) return null;
  const a = at, b = at + [...bare].length; // bare-character span [a, b)
  const durSec = Number(source.duration_ms) / 1000;
  const opens = a === 0, closes = b === keep.length;
  if (!opens && starts[a] - ends[a - 1] < MIN_GAP) return null;
  const startSec = opens ? 0 : (ends[a - 1] + starts[a]) / 2;
  const tailGap = closes ? Infinity : starts[b] - ends[b - 1];
  if (!closes && tailGap < MIN_GAP) return null;
  const endSec = closes ? (Number.isFinite(durSec) && durSec > 0 ? durSec : ends[b - 1] + 0.3) : (ends[b - 1] + starts[b]) / 2;
  return { charStart: keep[a], charEnd: keep[b - 1] + 1, startSec: +startSec.toFixed(3), endSec: +endSec.toFixed(3), closes, tailGap: closes ? null : +tailGap.toFixed(3) };
}

/** Pure. The best source for one ask: a cut that ends the source clip first (its natural tail), then the widest tail pause. */
function bestSource(sources, ask, voiceId) {
  let best = null;
  for (const s of sources) {
    if (s.voice_id !== voiceId) continue;
    const span = sourceSpan(s, ask.text);
    if (!span) continue;
    const score = span.closes ? 1e6 : span.tailGap;
    if (!best || score > best.score) best = { source: s, span, score };
  }
  return best;
}

async function main() {
  const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
  const COURSE = arg('course'); const SEEDS = +arg('seeds', 100); const FROM = +arg('from', 1); const LIMIT = +arg('limit', 0);
  if (!COURSE) throw new Error('--course required');
  const CUT = process.env.CUT === '1', APPLY = process.env.APPLY === '1';
  const vc = await fetch(`${URL}/api/courses/${COURSE}/voice-config/resolved`).then((r) => r.json()).catch(() => ({}));
  const { castByRole, missing } = castFromVoiceConfig(vc);
  if (missing) { console.log(`NO CAST for ${missing.role}`); return; }

  const db = require('../../services/shared/agent-db.cjs');
  const pg = await db.connect();
  let rows, clips, sources;
  try {
    const sel = 'seed_number, target_text, target1_audio_id, target2_audio_id';
    const S = (await pg.query(`SELECT ${sel} FROM course_seeds WHERE course_code=$1 AND seed_number <= $2 AND seed_number >= $3`, [COURSE, SEEDS, FROM])).rows.map((r) => ({ ...r, slot: { seedNumber: r.seed_number } }));
    const L = (await pg.query(`SELECT lego_id, ${sel} FROM course_legos WHERE course_code=$1 AND seed_number <= $2 AND seed_number >= $3`, [COURSE, SEEDS, FROM])).rows.map((r) => ({ ...r, slot: { legoId: r.lego_id } }));
    const P = (await pg.query(`SELECT id, ${sel} FROM course_practice_phrases WHERE course_code=$1 AND seed_number <= $2 AND seed_number >= $3 AND phrase_role <> 'component'`, [COURSE, SEEDS, FROM])).rows.map((r) => ({ ...r, slot: { phraseId: r.id } }));
    rows = [...S, ...L, ...P];
    clips = await db.clipMap(pg, rows.flatMap((r) => [r.target1_audio_id, r.target2_audio_id]), { cols: 'id::text AS id, text, voice_id, origin' });
    // The course's cast-voice target clips that carry timings: every one is a possible source.
    sources = (await pg.query(`SELECT id::text AS id, text, voice_id, role, duration_ms, word_timings FROM course_audio WHERE course_code=$1 AND voice_id = ANY($2) AND role IN ('target1','target2') AND word_timings IS NOT NULL AND s3_key NOT LIKE 'pending/%'`, [COURSE, [castByRole.target1, castByRole.target2]])).rows;
  } finally { await pg.end(); }

  const asks = staleAsks(rows, clips, castByRole);
  const plan = [];
  for (const a of asks) { const b = bestSource(sources, a, castByRole[a.role]); if (b) plan.push({ ask: a, ...b }); }
  const chars = plan.reduce((n, p) => n + p.ask.chars, 0);
  console.log(`${COURSE} seeds ${FROM}-${SEEDS}: ${asks.length} outstanding asks; ${sources.length} cast-voice sources with timings; CUTTABLE ${plan.length} asks (${plan.reduce((n, p) => n + p.ask.slots.length, 0)} slots, ~${chars} chars a render would spend)`);
  const todo = LIMIT ? plan.slice(0, LIMIT) : plan;
  for (const p of todo) console.log(`  ${p.ask.role} "${p.ask.text}" ← "${p.source.text}" [${p.span.charStart},${p.span.charEnd}) ${p.span.startSec}-${p.span.endSec}s ${p.span.closes ? 'ends the clip' : `tail gap ${p.span.tailGap}s`} (${p.ask.slots.length} slot${p.ask.slots.length > 1 ? 's' : ''})`);
  if (!CUT) return;

  const ROLLBACK = process.env.ROLLBACK_FILE || null;
  const post = (p, body) => postWith(fetch, (ms) => new Promise((res) => setTimeout(res, ms)), p, body);
  const out = { linked: 0, refused: 0, dry: 0 };
  for (const p of todo) {
    for (const s of p.ask.slots) {
      const slot = s.seedNumber ? { seedNumber: s.seedNumber } : s.legoId ? { legoId: s.legoId } : { phraseId: s.phraseId };
      const body = { ...slot, role: s.role, text: p.ask.text, sourceAudioId: p.source.id, ...p.span, replace: true, expectCurrent: s.current, dryRun: !APPLY };
      delete body.closes; delete body.tailGap;
      const r = await post(`/api/production/${COURSE}/ingest-cut`, body);
      const b = r.body || {};
      if (b.ok && b.rollback && ROLLBACK) fs.appendFileSync(ROLLBACK, JSON.stringify(b.rollback) + '\n');
      if (b.ok && b.dryRun) out.dry++; else if (b.ok) out.linked += b.linked || 0; else out.refused++;
      console.log(`  ${b.ok ? (b.dryRun ? 'DRY-OK' : 'LINKED') : 'REFUSED'} ${JSON.stringify(slot)} ${s.role} ${b.source || ''} ${b.audioId || ''} ${b.ok ? '' : `${b.code}: ${b.error}`}`.trimEnd());
    }
  }
  console.log(`DONE ${COURSE}: ${APPLY ? `linked ${out.linked}` : `dry-run ok ${out.dry}`}, refused ${out.refused}`);
}
module.exports = { sourceSpan, bestSource };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
