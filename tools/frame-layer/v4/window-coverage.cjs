#!/usr/bin/env node
/**
 * WINDOW FRAME COVERAGE — the v4 metric.
 *
 * Tom, 2026-10-02: "the full reflection of frame diversity across the full
 * scope of the course is the most important thing … not necessarily in each
 * phrase basket of course but such that — over a 10-20 SEED region of the
 * course, we really have used as many of the 30 as possible".
 *
 * So the unit of the metric is the WINDOW (a run of seeds), never the phrase
 * and never the basket:
 *
 *   coverage(window) = |frames USED by the window's phrases ∩ frames AVAILABLE
 *                       by the window's last seed| / |frames AVAILABLE|
 *
 * AVAILABLE comes from frame-inventory.cjs (first seed, or first taught chunk
 * that carries the shape — whichever is earlier). USED means the frame tagger
 * (frame-tagger.cjs: Haiku reading frame-codex.json, cached per phrase text)
 * says the phrase's known side instantiates the frame.
 *
 * INTERJECTIONS EARN NOTHING. #463 measured v3 buying position spread and
 * neighbour variety with "thank you,", "of course", "unfortunately", "no
 * problem" stapled to the front of a phrase: 22% of Irish v3 USE phrases open
 * that way against 2-5% elsewhere. A stapled opener is not a frame and it is
 * not a connection. The codex tells the tagger to mark a detachable opener O
 * and tag only what follows it, so "thank you, I want to go" and "I want to
 * go" carry the same frames and the first is counted as an interjection. Until
 * 2026-10-07 this file stripped openers from a hand-kept word list; Tom's
 * ruling r-2026-10-07-never-use-regex-to-classify-language moved that judgement
 * to the model too (gold: opener accuracy 0.99).
 *
 * Fairness across volumes: live, v3 and v4 do not write the same number of
 * phrases in a window, and more phrases find more frames by luck. So beside
 * the raw coverage the report gives RAREFIED coverage — the expected number of
 * distinct frames found in a random sample of N phrases (N fixed, default 60,
 * averaged over 200 seeded draws). Two generators compared at the same N are
 * compared on what they DO with a phrase, not on how many they wrote.
 *
 * Every function here is SYNC and reads tags the caller has already fetched
 * (`await tagCourse(...)` in tag-course.cjs, or `ensureTagged`). An untagged
 * phrase throws: a cold cache must never read as a weak window.
 */
const T = require('../frame-tagger.cjs');

/** Which P-frames does this phrase USE? An opener earns nothing (the tagger tags past it). */
const framesOf = (known) => T.framesOf(known);
/** Does the phrase open with a stapled interjection / discourse opener? */
const hasOpener = (known) => T.hasOpener(known);

/** Deterministic PRNG so rarefaction is reproducible. */
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function rarefy(frameSets, n, draws = 200, seed = 42) {
  if (frameSets.length <= n) return null;
  const rnd = mulberry32(seed);
  let total = 0;
  for (let d = 0; d < draws; d++) {
    const idx = frameSets.map((_, i) => i);
    for (let i = idx.length - 1; i > idx.length - 1 - n; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const seen = new Set();
    for (let i = idx.length - 1; i > idx.length - 1 - n; i--) for (const f of frameSets[idx[i]]) seen.add(f);
    total += seen.size;
  }
  return +(total / draws).toFixed(2);
}

/**
 * Score one window. `phrases` = rows with known_text (and phrase_role);
 * `available` = frame ids available by the window's last seed.
 */
function scoreWindow(phrases, available, { rarefyN = 60 } = {}) {
  const avail = new Set(available);
  const used = new Map();
  let interjected = 0;
  const frameSets = [];
  for (const p of phrases) {
    if (hasOpener(p.known_text)) interjected++;
    const fs = framesOf(p.known_text).filter(f => avail.has(f));
    frameSets.push(fs);
    for (const f of fs) used.set(f, (used.get(f) || 0) + 1);
  }
  const usedIds = T.FRAME_IDS.filter(f => used.has(f));
  const missing = available.filter(f => !avail.has(f) ? false : !used.has(f));
  return {
    phrases: phrases.length,
    available: available.length,
    used: usedIds.length,
    coverage: available.length ? +(usedIds.length / available.length).toFixed(3) : null,
    rarefied_frames_at_n: rarefy(frameSets, rarefyN),
    rarefy_n: rarefyN,
    frames_per_100_phrases: phrases.length ? +(frameSets.reduce((a, f) => a + f.length, 0) / phrases.length * 100).toFixed(1) : null,
    interjection_openers: interjected,
    interjection_rate: phrases.length ? +(interjected / phrases.length).toFixed(3) : null,
    used_ids: usedIds, missing_ids: missing,
    counts: Object.fromEntries(usedIds.map(f => [f, used.get(f)])),
  };
}

/** Cut seeds 1..maxSeed into windows of `size` and score each. */
function scoreCourseWindows(phrases, availableAt, { size = 20, maxSeed = 668, rarefyN = 60 } = {}) {
  const out = [];
  for (let start = 1; start <= maxSeed; start += size) {
    const end = Math.min(start + size - 1, maxSeed);
    const inWin = phrases.filter(p => p.seed_number >= start && p.seed_number <= end);
    if (!inWin.length) continue;
    out.push({ start, end, ...scoreWindow(inWin, availableAt(end), { rarefyN }) });
  }
  return out;
}

module.exports = { framesOf, hasOpener, scoreWindow, scoreCourseWindows, rarefy };
