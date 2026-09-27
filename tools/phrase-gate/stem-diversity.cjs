/**
 * STEM DIVERSITY — the collapse is BETWEEN baskets (audit #423, 2026-09-27).
 *
 * v3 cured "good early stem + new LEGO" and grew a new set of house frames:
 * every basket is a separate call reading the same prompt, so they all land on
 * the frame that is cheapest to vary — ita late "he said that" in 63% of
 * baskets, "I'm sure that" 51%; fra "to be able" 53%; deu "I'm going to" 52% —
 * against live's worst of 28-43%. Tom's GO (2026-09-27): tell each basket what
 * the course has already overused (b), and gate it (d):
 *   d1  within a basket, no collocate and no stem in more than 2 USE phrases;
 *   d2  a stem already in more than ~25% of the course's baskets may appear at
 *       most once in this basket.
 * Both are repaired by the door's existing retry, so neither is a gate without
 * a repair path.
 *
 * THE UNITS, as the audit measured them, on the English (known) side:
 *   STEM      a three-word run of the prompt that does not overlap the LEGO's
 *             own words ("he said that", "as often as", "if i can");
 *   COLLOCATE the nearest content word either side of the LEGO ("better" in
 *             German S0050's "to become better" basket).
 * A proxy, stated: a collocation that exists only on the target side is not
 * seen.
 */

const STOP = new Set(('a an the to of in on at for with from by about and but or so if than as ' +
  'i me my you your he him his she her it its we us our they them their this that these those ' +
  "is am are was were be been being do does did don't doesn't didn't not no " +
  "i'm i'd i'll i've you're you'd you'll he's she's it's we're they're that's there's can can't could would will won't shall should " +
  'have has had there here what who which when where why how very just some any all').split(/\s+/));

/** Tokens of an English prompt, lower-cased, apostrophes unified, punctuation dropped. */
function tokens(text) {
  return String(text || '').toLowerCase().replace(/[’‘`]/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ').split(/\s+/).filter(Boolean);
}

/** Positions the LEGO's own words occupy in the phrase (first contiguous match; the gloss may be inflected, so a miss is tolerated). */
function legoSpan(tok, legoKnown) {
  const lt = tokens(legoKnown);
  const tries = [lt, lt[0] === 'to' ? lt.slice(1) : null].filter((x) => x && x.length);
  for (const l of tries) {
    for (let i = 0; i + l.length <= tok.length; i++) {
      if (l.every((w, j) => tok[i + j] === w)) return [i, i + l.length];
    }
  }
  return null;
}

/** Every three-word stem of a phrase that does not touch the LEGO. */
function stemsOf(known, legoKnown) {
  const tok = tokens(known);
  const span = legoSpan(tok, legoKnown);
  const out = new Set();
  for (let i = 0; i + 3 <= tok.length; i++) {
    if (span && i < span[1] && i + 3 > span[0]) continue;
    out.add(tok.slice(i, i + 3).join(' '));
  }
  return out;
}

/** Nearest content word left and right of the LEGO. */
function collocatesOf(known, legoKnown) {
  const tok = tokens(known);
  const span = legoSpan(tok, legoKnown);
  if (!span) return new Set();
  const out = new Set();
  for (let i = span[0] - 1; i >= 0; i--) if (!STOP.has(tok[i])) { out.add(tok[i]); break; }
  for (let i = span[1]; i < tok.length; i++) if (!STOP.has(tok[i])) { out.add(tok[i]); break; }
  return out;
}

/**
 * Course-so-far shares: for every stem, the fraction of baskets that contain it
 * in any phrase. `baskets` = [{ legoKnown, phrases: [{known}] }]. Stems seen in
 * fewer than `minBaskets` baskets are dropped as noise.
 */
function courseStemShares(baskets, { minBaskets = 5 } = {}) {
  const count = new Map();
  for (const b of baskets) {
    const seen = new Set();
    for (const p of b.phrases || []) for (const s of stemsOf(p.known, b.legoKnown)) seen.add(s);
    for (const s of seen) count.set(s, (count.get(s) || 0) + 1);
  }
  const n = baskets.length || 1;
  const shares = new Map();
  for (const [s, c] of count) if (c >= minBaskets) shares.set(s, c / n);
  return { shares, baskets: baskets.length };
}

/**
 * THE COLLAPSE IS LOCAL. Course-wide, ita "he said that" is in 22% of baskets —
 * under the cap — while it is in 73% of the baskets at seeds 330-380, which is
 * the stretch a learner actually hears back to back. So the share a basket is
 * judged against is the HIGHER of the course-wide share and the share among
 * the baskets within WINDOW_SEEDS of it (both directions: a regeneration fills
 * the whole course, and the neighbours on either side are what the learner
 * hears around it).
 */
const WINDOW_SEEDS = 40;
function windowedStemShares(baskets, centreSeed, opts = {}) {
  const wide = courseStemShares(baskets, opts).shares;
  const near = baskets.filter((b) => b.seed != null && Math.abs(b.seed - centreSeed) <= WINDOW_SEEDS);
  const local = near.length >= 20 ? courseStemShares(near, { minBaskets: 3 }).shares : new Map();
  const out = new Map(wide);
  for (const [s, v] of local) if (v > (out.get(s) || 0)) out.set(s, v);
  return out;
}

const WITHIN_MAX = 2;       // d1: a stem or collocate in at most 2 USE phrases of a basket
const COURSE_SHARE = 0.25;  // d2: a stem in more than this share of baskets …
const COURSE_CAP = 1;       //     … may appear at most once in this basket

/**
 * The gate. Pure. `shares` is a Map stem → course share (may be empty).
 * Returns { pass, within:[{kind,item,count}], course:[{stem,share,count}] }.
 */
function checkStemDiversity({ legoKnown, build = [], use = [] }, shares = new Map()) {
  const within = [];
  const stemUse = new Map();
  const collUse = new Map();
  for (const p of use) {
    for (const s of stemsOf(p.known, legoKnown)) stemUse.set(s, (stemUse.get(s) || 0) + 1);
    for (const c of collocatesOf(p.known, legoKnown)) collUse.set(c, (collUse.get(c) || 0) + 1);
  }
  for (const [s, k] of stemUse) if (k > WITHIN_MAX) within.push({ kind: 'stem', item: s, count: k });
  for (const [c, k] of collUse) if (k > WITHIN_MAX) within.push({ kind: 'collocate', item: c, count: k });

  const course = [];
  const allCount = new Map();
  for (const p of [...build, ...use]) for (const s of stemsOf(p.known, legoKnown)) allCount.set(s, (allCount.get(s) || 0) + 1);
  for (const [s, k] of allCount) {
    const share = shares.get(s);
    if (share !== undefined && share > COURSE_SHARE && k > COURSE_CAP) course.push({ stem: s, share: Number(share.toFixed(2)), count: k });
  }
  return { pass: !within.length && !course.length, within, course };
}

/** (b) the per-basket prompt section: what the course has already overused. */
function overuseSection(shares, { top = 15, floor = 0.10 } = {}) {
  const list = [...shares.entries()].filter(([, v]) => v >= floor).sort((a, b) => b[1] - a[1]).slice(0, top);
  if (!list.length) return '';
  const lines = list.map(([s, v]) => `- "${s}" — already in ${Math.round(v * 100)}% of the baskets around this point in the course${v > COURSE_SHARE ? ': at most ONCE in this basket, and better not at all' : ': use sparingly'}`);
  return `

---

## ALREADY OVERUSED ACROSS THIS COURSE — reach past these

Every basket is written separately, and they keep converging on the same few
frames. These English stems are already everywhere in this course. A stem over
${Math.round(COURSE_SHARE * 100)}% may appear at most once in your whole set (the gate refuses more); and
within your USE phrases no three-word stem and no word hugging the LEGO may
appear more than ${WITHIN_MAX} times. Find frames the course has NOT worn out yet —
naturally: a plain natural sentence beats a contorted rare one.

${lines.join('\n')}
`;
}

/** Every candidate basket in a run-course-v3 tree, as stem baskets (seeds 11+). */
function loadCandidateStemBaskets(dir) {
  const fs = require('fs');
  const path = require('path');
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const sd of fs.readdirSync(dir).filter((d) => /^seed-\d+$/.test(d))) {
    for (const f of fs.readdirSync(path.join(dir, sd)).filter((x) => x.endsWith('.json'))) {
      try {
        const r = JSON.parse(fs.readFileSync(path.join(dir, sd, f), 'utf8'));
        if (r.seedNumber > 10) out.push({ seed: r.seedNumber, legoIndex: r.legoIndex, file: path.join(dir, sd, f), legoKnown: r.legoKnown, phrases: [...(r.build || []), ...(r.use || [])], raw: r });
      } catch { /* mid-write */ }
    }
  }
  return out;
}

module.exports = {
  loadCandidateStemBaskets,
  tokens, stemsOf, collocatesOf, courseStemShares, windowedStemShares, checkStemDiversity, overuseSection, WINDOW_SEEDS,
  WITHIN_MAX, COURSE_SHARE, COURSE_CAP,
};
