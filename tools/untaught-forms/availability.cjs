'use strict';
/**
 * Check 20 — the availability core. K21: "Availability is keyed on the EXACT SURFACE
 * FORM. The gate never inflects and never derives."
 *
 * So there is no stemmer here, no lemmatiser, no fuzzy match, and there never may be.
 * The only transformation applied to a string is case-folding and the stripping of
 * punctuation that is not part of a word — neither of which turns one word into
 * another. "wants" is not "want"; "doesn't" is not "don't"; "his" is not "he".
 *
 * The known side of all nine paid English-known courses is ENGLISH, which is
 * whitespace-delimited, so tokenising it is safe. That is the whole reason this check
 * asks its question of the PROMPT rather than of the target text: K14 says the prompt
 * is what is wrong, and the prompt is the side we can tokenise honestly. Target-side
 * availability in a spaceless script is NOT computed here — see the check's header.
 */

// Case-fold; normalise the curly apostrophe to the straight one (same surface form,
// two encodings); drop punctuation that is not internal to a word. Nothing else.
function normalise(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/(^|\s)'+|'+(\s|$)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s) {
  const n = normalise(s);
  return n ? n.split(' ') : [];
}

/**
 * The taught inventory as of a cut-point, built from the glosses of the LEGOs the
 * learner has already been shown. A LEGO gloss is what the presentation says out loud
 * ("The English for X is…"), and its components are shown as tiles, so both are taught.
 * Seed sentences are NOT teaching events here: a seed's English is judged by this
 * check, never counted as evidence for itself.
 */
function buildInventory(legos) {
  const chunks = [];      // token arrays, in teaching order
  const words = new Set();
  const order = [];       // parallel: sort key of the teaching event
  const push = (text, key) => {
    const t = tokens(text);
    if (!t.length) return;
    chunks.push(t); order.push(key);
    for (const w of t) words.add(w);
  };
  for (const l of legos) {
    const key = l.seed_number * 1000 + l.lego_index;
    push(l.known_text, key);
    let comps = l.components;
    if (typeof comps === 'string') { try { comps = JSON.parse(comps); } catch { comps = null; } }
    if (Array.isArray(comps)) for (const c of comps) push(c && c.known, key);
  }
  return { chunks, words, order };
}

function inventoryAt(inv, cutKey) {
  const chunks = [], words = new Set();
  for (let i = 0; i < inv.chunks.length; i++) {
    if (inv.order[i] > cutKey) continue;
    chunks.push(inv.chunks[i]);
    for (const w of inv.chunks[i]) words.add(w);
  }
  return { chunks, words };
}

/** WORD tier: which exact surface forms in this prompt has the learner never been shown? */
function untaughtWords(text, inv) {
  const out = [];
  const t = tokens(text);
  for (let i = 0; i < t.length; i++) if (!inv.words.has(t[i])) out.push({ word: t[i], index: i });
  return out;
}

/**
 * CHUNK tier: can the prompt be tiled end-to-end by whole taught glosses?
 * This is the stricter reading of K21 and it is what catches the case the word tier
 * misses — "wants to know" taught, "wants to go back" asked. Word "wants" is attested;
 * the FORM the learner would have to produce is not.
 * Returns null if tileable, else the token index where every tiling dies.
 */
function chunkTilingFailure(text, inv) {
  const t = tokens(text);
  if (!t.length) return null;
  const byFirst = new Map();
  for (const c of inv.chunks) {
    if (!byFirst.has(c[0])) byFirst.set(c[0], []);
    byFirst.get(c[0]).push(c);
  }
  const reach = new Array(t.length + 1).fill(false);
  reach[0] = true;
  let furthest = 0;
  for (let i = 0; i < t.length; i++) {
    if (!reach[i]) continue;
    for (const c of (byFirst.get(t[i]) || [])) {
      if (i + c.length > t.length) continue;
      let ok = true;
      for (let j = 1; j < c.length; j++) if (t[i + j] !== c[j]) { ok = false; break; }
      if (ok) { reach[i + c.length] = true; if (i + c.length > furthest) furthest = i + c.length; }
    }
  }
  if (reach[t.length]) return null;
  return { deadAt: furthest, token: t[furthest], tokens: t };
}

module.exports = { normalise, tokens, buildInventory, inventoryAt, untaughtWords, chunkTilingFailure };

/* -------------------------------------------------------------------------
 * VARIANT DETECTION — and why this is not the stem matching K21 forbids.
 *
 * K21 forbids stemming in the AVAILABILITY computation: you may never say
 * "the learner met 'want', so 'wants' is available." Nothing below does that.
 * Availability is decided above, on exact surface forms only.
 *
 * What the map below does is the OPPOSITE operation. Once a form has already
 * been ruled UNAVAILABLE by exact match, it asks a second question: is this an
 * arbitrary unknown word, or is it a form the learner would have to DERIVE from
 * something they were shown? The second case is K21's own example — "I drink /
 * he drinks / is drinking" — and it is the highest-signal member of the class,
 * because the prompt reads perfectly natural while the target form behind it
 * was never taught. Stemming to grant availability is banned; recognising a
 * derivation in order to REFUSE it is what K21 asks for.
 * ------------------------------------------------------------------------- */

// Contraction and suffix stripping, applied only to build a grouping key. The key
// is never treated as a taught form.
const IRREGULAR = new Map(Object.entries({
  "don't": 'do', "doesn't": 'do', "didn't": 'do', does: 'do', did: 'do', done: 'do', doing: 'do',
  is: 'be', am: 'be', are: 'be', was: 'be', were: 'be', been: 'be', being: 'be', "isn't": 'be',
  "aren't": 'be', "wasn't": 'be', "weren't": 'be',
  has: 'have', had: 'have', "haven't": 'have', "hasn't": 'have', "hadn't": 'have',
  went: 'go', gone: 'go', said: 'say', knew: 'know', known: 'know', took: 'take', taken: 'take',
  came: 'come', got: 'get', gotten: 'get', made: 'make', saw: 'see', seen: 'see', told: 'tell',
  thought: 'think', felt: 'feel', found: 'find', gave: 'give', given: 'give', met: 'meet',
  spoke: 'speak', spoken: 'speak', began: 'begin', begun: 'begin', wrote: 'write', written: 'write',
  put: 'put', read: 'read', "can't": 'can', "won't": 'will', "wouldn't": 'would',
  "couldn't": 'could', "shouldn't": 'should',
}));

function variantKey(w) {
  // Negation is not an inflection. "do" and "don't" are not two forms of one word,
  // and collapsing them made the detector report a negative prompt as a bent
  // positive one — 158 false hits in the first jpn calibration run. The NEG flag
  // keeps "don't"/"doesn't" together (a real person inflection) and keeps them
  // apart from "do".
  const neg = /n't$/.test(w) ? '|NEG' : '';
  if (IRREGULAR.has(w)) return IRREGULAR.get(w) + neg;
  let s = w.replace(/'(s|ll|ve|d|re|m)$/, '').replace(/n't$/, '');
  if (IRREGULAR.has(s)) return IRREGULAR.get(s) + neg;
  if (s.length > 4 && /ies$/.test(s)) return s.slice(0, -3) + 'y' + neg;
  if (s.length > 3 && /(ches|shes|sses|xes)$/.test(s)) return s.slice(0, -2) + neg;
  if (s.length > 3 && /s$/.test(s) && !/ss$/.test(s)) return s.slice(0, -1) + neg;
  if (s.length > 4 && /ing$/.test(s)) { const b = s.slice(0, -3); return (/(.)\1$/.test(b) ? b.slice(0, -1) : b) + neg; }
  if (s.length > 3 && /ed$/.test(s)) { const b = s.slice(0, -2); return (/(.)\1$/.test(b) ? b.slice(0, -1) : b) + neg; }
  return s + neg;
}

/** Is w a DERIVED form of something the learner was actually shown? */
function derivedFrom(w, inv) {
  if (inv.words.has(w)) return null;              // attested: not our business
  const k = variantKey(w);
  for (const v of inv.words) if (v !== w && variantKey(v) === k) return v;
  return null;
}

/**
 * The high-signal tier. Find every taught gloss that the prompt reproduces ALMOST
 * exactly — same length, same words, except at one or more positions where the
 * prompt substitutes an unattested derived form of the taught word.
 *
 * "want to go back" was taught; the prompt says "wants to go back". The learner has
 * a chunk, and the prompt asks them to bend it into a shape nobody has shown them.
 * Under K14 that prompt is unavailable, and under K15 the remedy is downward into
 * the phrase, never a new LEGO to license it.
 */
function bentChunks(text, inv) {
  const t = tokens(text);
  const out = [];
  for (const c of inv.chunks) {
    if (c.length > t.length) continue;
    for (let i = 0; i + c.length <= t.length; i++) {
      const diffs = [];
      let ok = true;
      for (let j = 0; j < c.length; j++) {
        if (t[i + j] === c[j]) continue;
        // the substituted word must be a derived form OF THE TAUGHT WORD in that slot.
        // Note it may well be attested ELSEWHERE — "wants" is taught at seed 17 in
        // "wants to know" — and that is not a defence: the chunk "want to go back"
        // bent into "wants to go back" is still a form nobody has shown.
        if (variantKey(t[i + j]) !== variantKey(c[j])) { ok = false; break; }
        diffs.push({ taught: c[j], asked: t[i + j], at: i + j });
      }
      if (!ok || !diffs.length) continue;
      // If the bent window is ITSELF taught, or tiles out of taught chunks, the
      // learner has been shown it and there is nothing to report.
      const window = t.slice(i, i + c.length).join(' ');
      if (chunkTilingFailure(window, inv) === null) continue;
      out.push({ gloss: c.join(' '), window, diffs });
    }
  }
  // keep only the longest bend at each start, so one finding is reported once
  const seen = new Set(), keep = [];
  for (const b of out.sort((a, b2) => b2.gloss.length - a.gloss.length)) {
    const k = b.diffs.map(d => d.at).join(',');
    if (seen.has(k)) continue; seen.add(k); keep.push(b);
  }
  return keep;
}

/**
 * bendToTile — the check's primary test, and the one the calibration run is judged on.
 *
 * Tile the whole prompt out of taught chunks, exactly as chunkTilingFailure does, but
 * allow a chunk to match a window in which some positions carry a DERIVED form of the
 * taught word instead of the taught word itself. Take the cheapest tiling.
 *
 *   cost 0        the learner has been shown every form this prompt asks for. CLEAN.
 *   cost > 0      the prompt is producible only by BENDING taught material into a
 *                 shape nobody has shown — K21's "I drink / he drinks". FINDING.
 *   unreachable   the prompt cannot be built from taught material at all, bent or not.
 *                 That is a vocabulary gap, a different defect with a different
 *                 remedy, and it is COUNTED here but never reported as a bend.
 *
 * The whole-prompt formulation is what gives this precision. A local window match
 * fires on any coincidence; a tiling has to explain the entire prompt, so the bend it
 * names is the bend the learner would actually have to perform.
 */
function bendToTile(text, inv) {
  const t = tokens(text);
  if (!t.length) return { status: 'clean', subs: [] };
  const byFirstKey = new Map();
  for (const c of inv.chunks) {
    const k = variantKey(c[0]);
    if (!byFirstKey.has(k)) byFirstKey.set(k, []);
    byFirstKey.get(k).push(c);
  }
  const INF = Infinity;
  const cost = new Array(t.length + 1).fill(INF);
  const back = new Array(t.length + 1).fill(null);
  cost[0] = 0;
  for (let i = 0; i < t.length; i++) {
    if (cost[i] === INF) continue;
    for (const c of (byFirstKey.get(variantKey(t[i])) || [])) {
      if (i + c.length > t.length) continue;
      const subs = [];
      let ok = true;
      for (let j = 0; j < c.length; j++) {
        const asked = t[i + j], taught = c[j];
        if (asked === taught) continue;
        if (variantKey(asked) !== variantKey(taught)) { ok = false; break; }
        subs.push({ taught, asked, at: i + j });
      }
      if (!ok) continue;
      const end = i + c.length, nc = cost[i] + subs.length;
      if (nc < cost[end]) { cost[end] = nc; back[end] = { from: i, chunk: c.join(' '), subs }; }
    }
  }
  const total = cost[t.length];
  if (total === INF) return { status: 'untileable', subs: [] };
  if (total === 0) return { status: 'clean', subs: [] };
  const subs = [];
  for (let i = t.length; i > 0;) { const b = back[i]; subs.unshift(...b.subs.map(x => ({ ...x, chunk: b.chunk }))); i = b.from; }
  return { status: 'bent', cost: total, subs };
}

module.exports.bendToTile = bendToTile;
module.exports.variantKey = variantKey;
module.exports.derivedFrom = derivedFrom;
module.exports.bentChunks = bentChunks;
