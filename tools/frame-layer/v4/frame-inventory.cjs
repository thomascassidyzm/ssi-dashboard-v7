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
 * The frames are the 31 seed-corpus P-frames (frame-codex.json, via patterns.cjs)
 * AND the 18 pod frames: 12 D-frames (one turn) and 6 X-frames (an exchange),
 * from the frame map mined 2026-08-31 (docs/frame-layer/dialogue-frame-inventory.json,
 * read by availability.loadDialogueFrames). Tom, 2026-11-05, after #430·AD showed
 * v4 reaching 40-45% of the frames available per seed: "make all and any frames
 * available / but STILL the phrases cannot break the gates in the course-builder /
 * so, thank you and of course / CAN be used as vocab, provided they have already
 * been admitted". Until that ruling the pod frames were reported for the count
 * only, because their fixed material ("thank you", "of course", "no problem",
 * "great") is the interjection class #463 found v3 stapling on. They are coverage
 * frames now, under two guards that keep the stapling out:
 *   - WINDOW. A pod frame is available at the first seed by which every chunk of
 *     one alternate of its `fixed_material` is OWNED: some LEGO or component, at
 *     or before that seed, whose known side IS that chunk (whole-chunk, the same
 *     OWNED rule as availability.instantiableFrameSet). Pods contribute frame
 *     attestation and zero vocabulary, so no seed ever "introduces" a pod frame:
 *     by_seed is always null and availability is by carrier alone.
 *   - CREDIT. window-coverage.cjs gives a phrase that opens with a detachable
 *     interjection no pod-frame credit at all, so "thank you, <P-frame phrase>"
 *     earns only its P-frames and "thank you, <nothing>" earns nothing.
 * An X-frame spans a turn boundary, which a single practice phrase cannot; it is
 * reached through its `sentence_projection` D-frame (the reply turn), exactly as
 * dialogue-patterns.cjs prescribes for a sentence-grain consumer.
 * The 30 metagraph shapes (nodes.json) are conversation shapes spanning turns,
 * not single-utterance frames, and stay out.
 *
 * READ-ONLY. Output: a JSON file per course under the evidence dir.
 */
const fs = require('fs');
const path = require('path');
const PATTERNS = require('../patterns.cjs');
const { attestedFrames, loadDialogueFrames, norm } = require('../availability.cjs');
const { loadCourse } = require('./db.cjs');
const { tagCourse } = require('./tag-course.cjs');

/**
 * Every row's known side is classified by the frame tagger (Haiku reading
 * frame-codex.json). A cut chunk like "do you want" is a question by its word
 * order even without "?", and the codex says so, so P20 needs no special case:
 * until 2026-10-07 a regex of question openers stood in for that judgement.
 * The caller tags first (tag-course.cjs); an untagged chunk throws.
 */
function combinationAvailability(legos, components) {
  const first = new Map();
  const rows = [...legos.map(l => ({ ...l, kind: 'lego' })), ...components.map(c => ({ ...c, kind: 'component' }))]
    .sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index);
  for (const r of rows) {
    const k = String(r.known_text || '');
    for (const p of PATTERNS) {
      if (!k.trim() || !p.test(k)) continue;
      if (!first.has(p.id)) first.set(p.id, { seed: r.seed_number, via: `${r.kind} "${k}" → "${r.target_text}"` });
    }
  }
  return first;
}

/** The pod frames (D then X), as the mined frame map holds them. */
const podFrames = () => loadDialogueFrames();

/**
 * When does each pod frame's carrier become OWNED? For every alternate of the
 * frame's fixed_material, the alternate is owned from the latest of its chunks'
 * first owning rows; the frame from the earliest owned alternate. Whole-chunk on
 * the known side: "tú" inside "estúpido" is not ownership.
 */
function podCarrierAvailability(legos, components, frames = podFrames()) {
  const rows = [...legos.map(l => ({ ...l, kind: 'lego' })), ...components.map(c => ({ ...c, kind: 'component' }))]
    .sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index);
  const firstOwner = new Map();
  for (const r of rows) {
    const k = norm(r.known_text);
    if (k && !firstOwner.has(k)) firstOwner.set(k, r);
  }
  const out = new Map();
  for (const f of frames) {
    let best = null;
    for (const alt of f.fixed_material || []) {
      if (!alt.length) continue;
      const owners = alt.map(ch => firstOwner.get(norm(ch)));
      if (owners.some(o => !o)) continue;
      const seed = Math.max(...owners.map(o => o.seed_number));
      if (!best || seed < best.seed) best = { seed, via: owners.map(o => `${o.kind} "${o.known_text}" → "${o.target_text}"`).join(' + ') };
    }
    if (best) out.set(f.id, best);
  }
  return out;
}

/** One definition per frame id, P or pod: { id, name, shape, provenance, grain, ... }. */
function frameDef(id) {
  const p = PATTERNS.find(x => x.id === id);
  if (p) return { id: p.id, name: p.name, shape: p.shape, provenance: 'seed', grain: 'sentence', test: p.test };
  const f = podFrames().find(x => x.id === id);
  if (!f) return null;
  return { id: f.id, name: f.name, shape: f.shape, provenance: 'pod', grain: f.grain || 'sentence',
    sentence_projection: f.sentence_projection || null, fixed_material: f.fixed_material || [] };
}
const isPodFrame = (id) => { const d = frameDef(id); return !!d && d.provenance === 'pod'; };

function inventory(course, data) {
  const bySeed = attestedFrames(data.seeds);
  const byCombo = combinationAvailability(data.legos, data.components);
  const frames = PATTERNS.map(p => {
    const s = bySeed.get(p.id) ?? null;
    const c = byCombo.get(p.id) || null;
    const available = Math.min(s ?? Infinity, c ? c.seed : Infinity);
    return { id: p.id, name: p.name, shape: p.shape, provenance: 'seed', grain: 'sentence',
      by_seed: s, by_combination: c ? c.seed : null, combination_via: c ? c.via : null,
      available: Number.isFinite(available) ? available : null,
      earlier_by_combination: (s != null && c && c.seed < s) ? s - c.seed : 0,
      seed_count: data.seeds.filter(x => String(x.known_text || '').trim() && p.test(x.known_text)).length };
  });
  const byCarrier = podCarrierAvailability(data.legos, data.components);
  for (const f of podFrames()) {
    const c = byCarrier.get(f.id) || null;
    frames.push({ id: f.id, name: f.name, shape: f.shape, provenance: 'pod', grain: f.grain || 'sentence',
      sentence_projection: f.sentence_projection || null,
      by_seed: null, by_combination: c ? c.seed : null, combination_via: c ? c.via : null,
      available: c ? c.seed : null, earlier_by_combination: 0, seed_count: null });
  }
  return { course, generated: new Date().toISOString(), seeds: data.seeds.length,
    frame_count: { seed_frames_P: PATTERNS.length, pod_sentence_frames_D: 12, pod_exchange_frames_X: 6, metagraph_shapes_N: 30 },
    frames };
}

function availableAt(inv, seed) {
  return inv.frames.filter(f => f.available != null && f.available <= seed).map(f => f.id);
}

module.exports = { inventory, availableAt, combinationAvailability, podCarrierAvailability, frameDef, isPodFrame, podFrames };

if (require.main === module) {
  const courses = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const outDir = process.env.V4_EVIDENCE || path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', '468-frame-diversity');
  fs.mkdirSync(outDir, { recursive: true });
  (async () => { for (const course of courses.length ? courses : ['fra_for_eng']) {
    const data = loadCourse(course);
    await tagCourse(course, data);
    const inv = inventory(course, data);
    fs.writeFileSync(path.join(outDir, `frame-inventory-${course}.json`), JSON.stringify(inv, null, 2));
    console.log(`${course}: ${inv.seeds} seeds; ${inv.frames.filter(f => f.available != null).length}/${inv.frames.length} frames ever available`);
    console.log('id    by_seed by_combo earlier  name');
    for (const f of inv.frames) console.log(`${f.id.padEnd(5)} ${String(f.by_seed ?? '-').padStart(7)} ${String(f.by_combination ?? '-').padStart(8)} ${String(f.earlier_by_combination).padStart(7)}  ${f.name}  ${f.combination_via ? '← ' + f.combination_via : ''}`);
  } })().catch(e => { console.error(e.message); process.exit(1); });
}
