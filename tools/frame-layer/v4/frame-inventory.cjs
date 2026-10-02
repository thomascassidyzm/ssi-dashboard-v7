#!/usr/bin/env node
/**
 * FRAME INVENTORY — the canon frames and WHEN each one becomes available.
 *
 * Tom, 2026-10-02 (r-2026-10-02-phrase-gen-v4-maximise-frame-diversity): "the
 * frames are covered by the 668 SEEDS … over a 10-20 SEED region of the course,
 * we really have used as many of the 30 as possible … we don't need to wait for
 * a frame to be introduced by a SEED, if it's possible to use it through
 * combination of already covered LEGOS".
 *
 * So every frame gets TWO availability points, per course:
 *   by_seed        the first seed whose own sentence fires the frame
 *                  (availability.cjs attestedFrames — the seed introduces it)
 *   by_combination the first seed at or before which some TAUGHT chunk (a LEGO
 *                  or a component, on its known side) fires the frame on its own
 *                  — the frame's fixed material has been cut, so a phrase can be
 *                  built in that shape from pieces the learner already owns,
 *                  whether or not a seed has yet shown the whole shape.
 *   available      min of the two: the point from which a window may use it.
 *
 * The frames are the 31 seed-corpus P-frames (patterns.cjs). The 12 D-frames
 * and 6 X-frames of the pod corpus are reported for the count but are NOT
 * coverage frames: their fixed material ("thank you", "of course", "no
 * problem", "great") is exactly the interjection class #463 found v3 stapling
 * on, and v4 pays nothing for it. The 30 metagraph shapes (nodes.json) are
 * conversation shapes spanning turns, not single-utterance frames.
 *
 * READ-ONLY. Output: a JSON file per course under the evidence dir.
 */
const fs = require('fs');
const path = require('path');
const PATTERNS = require('../patterns.cjs');
const { attestedFrames } = require('../availability.cjs');
const { loadCourse } = require('./db.cjs');

/** P20 "question" fires on "?", which no cut chunk carries; a taught wh-word or a
 *  taught question opener ("do you want", "can I") licenses the shape. */
const QUESTION_OPENER = /^(do|does|did|are|is|was|were|can|could|will|would|should|have|has|what|where|when|why|who|how|which)\b/i;

function combinationAvailability(legos, components) {
  const first = new Map();
  const rows = [...legos.map(l => ({ ...l, kind: 'lego' })), ...components.map(c => ({ ...c, kind: 'component' }))]
    .sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index);
  for (const r of rows) {
    const k = String(r.known_text || '');
    for (const p of PATTERNS) {
      const fires = p.id === 'P20' ? (QUESTION_OPENER.test(k.trim()) && k.trim().split(/\s+/).length >= 2) : p.test(k);
      if (!fires) continue;
      if (!first.has(p.id)) first.set(p.id, { seed: r.seed_number, via: `${r.kind} "${k}" → "${r.target_text}"` });
    }
  }
  return first;
}

function inventory(course, data) {
  const bySeed = attestedFrames(data.seeds);
  const byCombo = combinationAvailability(data.legos, data.components);
  const frames = PATTERNS.map(p => {
    const s = bySeed.get(p.id) ?? null;
    const c = byCombo.get(p.id) || null;
    const available = Math.min(s ?? Infinity, c ? c.seed : Infinity);
    return { id: p.id, name: p.name, shape: p.shape,
      by_seed: s, by_combination: c ? c.seed : null, combination_via: c ? c.via : null,
      available: Number.isFinite(available) ? available : null,
      earlier_by_combination: (s != null && c && c.seed < s) ? s - c.seed : 0,
      seed_count: data.seeds.filter(x => p.test(x.known_text || '')).length };
  });
  return { course, generated: new Date().toISOString(), seeds: data.seeds.length,
    frame_count: { seed_frames_P: PATTERNS.length, pod_sentence_frames_D: 12, pod_exchange_frames_X: 6, metagraph_shapes_N: 30 },
    frames };
}

function availableAt(inv, seed) {
  return inv.frames.filter(f => f.available != null && f.available <= seed).map(f => f.id);
}

module.exports = { inventory, availableAt, combinationAvailability };

if (require.main === module) {
  const courses = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const outDir = process.env.V4_EVIDENCE || path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', '468-frame-diversity');
  fs.mkdirSync(outDir, { recursive: true });
  for (const course of courses.length ? courses : ['fra_for_eng']) {
    const inv = inventory(course, loadCourse(course));
    fs.writeFileSync(path.join(outDir, `frame-inventory-${course}.json`), JSON.stringify(inv, null, 2));
    console.log(`${course}: ${inv.seeds} seeds; ${inv.frames.filter(f => f.available != null).length}/${inv.frames.length} frames ever available`);
    console.log('id    by_seed by_combo earlier  name');
    for (const f of inv.frames) console.log(`${f.id.padEnd(5)} ${String(f.by_seed ?? '-').padStart(7)} ${String(f.by_combination ?? '-').padStart(8)} ${String(f.earlier_by_combination).padStart(7)}  ${f.name}  ${f.combination_via ? '← ' + f.combination_via : ''}`);
  }
}
