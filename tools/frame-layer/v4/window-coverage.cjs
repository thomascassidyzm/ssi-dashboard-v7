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
 * that carries the shape — whichever is earlier). USED means a P-frame matcher
 * fires on the phrase's known side AFTER any leading interjection has been
 * stripped off.
 *
 * INTERJECTIONS EARN NOTHING. #463 measured v3 buying position spread and
 * neighbour variety with "thank you,", "of course", "unfortunately", "no
 * problem" stapled to the front of a phrase: 22% of Irish v3 USE phrases open
 * that way against 2-5% elsewhere. A stapled opener is not a frame and it is
 * not a connection, so the matcher never sees it: "thank you, I want to go"
 * and "I want to go" fire exactly the same frames and the first gets nothing
 * for its opener. The test file asserts this against a naive position-spread
 * scorer, which pays for it.
 *
 * Fairness across volumes: live, v3 and v4 do not write the same number of
 * phrases in a window, and more phrases find more frames by luck. So beside
 * the raw coverage the report gives RAREFIED coverage — the expected number of
 * distinct frames found in a random sample of N phrases (N fixed, default 60,
 * averaged over 200 seeded draws). Two generators compared at the same N are
 * compared on what they DO with a phrase, not on how many they wrote.
 */
const PATTERNS = require('../patterns.cjs');

// Fixed material of the pod D-frames (dialogue-patterns.cjs) plus the stapled
// openers #463 found. Multi-word first, so "no problem" is stripped before "no".
const INTERJECTIONS = [
  'thank you very much', 'thanks very much', 'i am sorry but', "i'm sorry but", 'i am sorry', "i'm sorry",
  'good morning', 'good afternoon', 'good evening', 'of course', 'no problem', 'here you are', 'here it is',
  'excuse me', 'and you', 'what about you', 'got it', "don't worry", "that's normal", 'not at all',
  'thank you', 'thanks', 'hello', 'hi', 'goodbye', 'bye', 'welcome', 'see you', 'sorry', 'please',
  'lovely', 'perfect', 'great', 'understood', 'unfortunately', 'fortunately', 'well', 'oh', 'ok', 'okay',
  'right', 'yes', 'no', 'really', 'actually', 'honestly', 'anyway', 'so', 'then', 'but', 'and', 'look', 'listen',
].sort((a, b) => b.length - a.length);

/** Strip every leading interjection (with its trailing comma/period). Returns
 *  the remainder and the list of what was stripped. */
function stripInterjections(known) {
  let s = String(known || '').trim();
  const stripped = [];
  for (let guard = 0; guard < 5; guard++) {
    const low = s.toLowerCase();
    const hit = INTERJECTIONS.find(w => low === w || low.startsWith(w + ',') || low.startsWith(w + ' ') || low.startsWith(w + '.') || low.startsWith(w + '!'));
    if (!hit) break;
    stripped.push(hit);
    s = s.slice(hit.length).replace(/^[\s,.!]+/, '');
    if (!s) break;
  }
  return { text: s, stripped };
}

/** Which P-frames does this phrase USE? (after the strip). */
function framesOf(known, matchers = PATTERNS) {
  const { text } = stripInterjections(known);
  if (!text) return [];
  return matchers.filter(p => p.test(text)).map(p => p.id);
}

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
function scoreWindow(phrases, available, { rarefyN = 60, matchers = PATTERNS } = {}) {
  const avail = new Set(available);
  const used = new Map();
  let interjected = 0;
  const frameSets = [];
  for (const p of phrases) {
    const { stripped } = stripInterjections(p.known_text);
    if (stripped.length) interjected++;
    const fs = framesOf(p.known_text, matchers).filter(f => avail.has(f));
    frameSets.push(fs);
    for (const f of fs) used.set(f, (used.get(f) || 0) + 1);
  }
  const usedIds = [...used.keys()].sort((a, b) => +a.slice(1) - +b.slice(1));
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

module.exports = { INTERJECTIONS, stripInterjections, framesOf, scoreWindow, scoreCourseWindows, rarefy };
