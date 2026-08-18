/**
 * LEGO presentation/text drift — the matcher behind scan-course Check 18.
 *
 * Each LEGO has a `presentation_audio_id` whose clip announces the LEGO's
 * known_text before speaking the target. When the two disagree the learner
 * hears one phrase and reads another.
 *
 * WHY THIS FILE EXISTS. Check 18 used to extract the announced phrase with
 * a single English template:
 *
 *     /^The \w+ for:\s+'([\s\S]*?)'\s*,\s*as in/i
 *
 * Measured live on 2026-08-18 that template matched 21,342 of 72,063
 * presentation clips and silently `continue`d past the other 50,721. Most of
 * the estate does not say ", as in" — it says ", is:"; Dutch and the Indic
 * courses use em-dashes; the known side is not always English (Hindi, Tamil,
 * Chinese, Korean, Spanish, German narration all exist); and the legacy Welsh
 * courses use `<src>`/`<tgt>` markup with no quotes at all. Against a known
 * set of 232 drifted rows the old template caught 2.
 *
 * The fix is to stop parsing the sentence and parse the DELIMITERS instead.
 * Every narration family marks the announced phrase with one of a small set of
 * quote pairs, or with a <src> tag. That is language-independent.
 *
 * Anything this module cannot parse is returned as status 'unparsed' so the
 * caller can COUNT and REPORT it. Silent dropping is the defect being fixed:
 * a check that skips what it cannot read reports clean because it is not
 * looking.
 */

// Delimiter pairs seen in the live estate: straight/curly apostrophes,
// ASCII/curly double quotes, CJK corner brackets, guillemets, German low quotes.
// Listed close-first for asymmetric pairs so scanning is unambiguous.
const PAIRS = [
  ['‘', '’'], // ‘ ’
  ['“', '”'], // “ ”
  ['„', '“'], // „ “
  ['「', '」'], // 「 」
  ['『', '』'], // 『 』
  ['«', '»'], // « »
  ["'", "'"],
  ['"', '"'],
];

const SRC_TAG = /<src>([\s\S]*?)<\/src>/gi;

// The Japanese-known courses (*_for_jpn) quote nothing at all: the announced
// phrase is everything before the trailing " を<language>で言うと：" frame.
// Greedy on the left so a を inside the phrase itself ("〜を学んでいる") doesn't
// truncate it. 2,459 of the estate's 2,464 otherwise-unparseable clips are this.
const JP_FRAME = /^([\s\S]+?)[\s、]+を[^\sを]{1,12}で言うと\s*[：:]/;

// Some *_for_jpn clips carry a seed-example clause 「…」のように between the
// phrase and the frame — including an EMPTY 「」 where the generator had no
// example. Lift it out before framing, or the empty quote reads as the
// announced phrase and the row looks like drift when it is a generator gap.
const JP_EXAMPLE_CLAUSE = /、?「[^」]*」のように、?/;

// What may legitimately follow a closing quote: sentence punctuation, a dash,
// whitespace, CJK punctuation, or end of string. A letter cannot.
const CLOSER_BOUNDARY = /^[\s,.;:!?…—–\-、。：'"]*$|^[\s,.;:!?…—–\-、。：]/;

// SSML: <phoneme alphabet='ipa' ph='æm'>am</phoneme> wraps the announced phrase
// and puts quoted attribute values in front of it. Promote the element content
// to a quoted span (so it reads like every other family) and drop the remaining
// SSML — otherwise the scanner announces "ipa". <src>/<tgt> are kept: they are
// content markers, not SSML.
function preprocess(text) {
  return String(text || '')
    .replace(/<phoneme\b[^>]*>([\s\S]*?)<\/phoneme>/gi, "'$1'")
    .replace(/<(?!\/?(?:src|tgt)\b)[^>]*>/g, '');
}

/**
 * Every delimited span in `text`, in order of appearance.
 *
 * Same-character pairs are read greedily left-to-right, which is wrong when
 * the phrase itself contains an apostrophe ("I don't want"). That is why the
 * verdict below does NOT rely on these spans to decide `ok` — it looks for the
 * known_text sitting between a matched delimiter pair directly. Spans are used
 * to decide "is this clip parseable at all" and to report what was announced.
 */
function extractSpans(rawText) {
  const out = [];
  let m;
  const text = preprocess(rawText);
  SRC_TAG.lastIndex = 0;
  while ((m = SRC_TAG.exec(text))) out.push({ at: m.index, value: m[1], kind: 'src' });
  if (out.length) return out; // <src> markup wins: its apostrophes are literal

  const jp = JP_FRAME.exec(text.replace(JP_EXAMPLE_CLAUSE, '、'));
  if (jp) out.push({ at: -1, value: jp[1], kind: 'jp-frame' });

  for (const [open, close] of PAIRS) {
    let i = 0;
    for (;;) {
      const a = text.indexOf(open, i);
      if (a < 0) break;
      let b = text.indexOf(close, a + 1);
      if (b < 0) break; // dangling opener: ignore rather than swallow the tail
      if (open === close) {
        // "'didn't have', as in" — the first ' closes nothing, it sits inside
        // the phrase. Take the EARLIEST candidate closer that is followed by a
        // structural boundary; that is the one the generator wrote. (Earliest,
        // not furthest: furthest would swallow the seed example too.)
        for (let c = b; c >= 0; c = text.indexOf(close, c + 1)) {
          if (CLOSER_BOUNDARY.test(text.slice(c + 1, c + 2) || ' ')) { b = c; break; }
        }
      }
      out.push({ at: a, value: text.slice(a + open.length, b), kind: open });
      i = b + close.length;
    }
  }
  return out.sort((x, y) => x.at - y.at);
}

/**
 * Comparison form. Case, whitespace, quote shape, dash shape, Unicode
 * composition and edge punctuation are all noise here — the announced phrase
 * is spoken, not typed, and reaches us from several generators.
 */
function normalize(s) {
  return String(s == null ? '' : s)
    .normalize('NFC')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[‐-―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.,;:!?…¿¡。、！？．]+|[.,;:!?…¿¡。、！？．]+$/g, '')
    .trim()
    .toLowerCase();
}

/** The phrase the clip announces: the first delimited span. */
function extractAnnounced(text) {
  const spans = extractSpans(text || '');
  return spans.length ? spans[0].value : null;
}

/**
 * Verdict for one LEGO/clip pair.
 *   {status:'ok'}                the clip announces this LEGO's known_text
 *   {status:'drift', announced}  it announces something else
 *   {status:'unparsed'}          no delimited span — COUNT AND REPORT, never skip
 */
function matchesKnown(clipText, knownText) {
  const spans = extractSpans(clipText || '');
  if (!spans.length) return { status: 'unparsed', announced: null, reason: 'no_delimited_span' };

  const want = normalize(knownText);
  if (!want) return { status: 'unparsed', announced: extractAnnounced(clipText), reason: 'empty_known_text' };

  // Delimited-substring test. Searching for the known_text *between* a pair
  // sidesteps the apostrophe trap that broke the old regex: we never have to
  // decide where the value ends, only whether it is bracketed where it sits.
  const hay = normalize(preprocess(clipText));
  for (const [open, close] of PAIRS) {
    const o = normalize(open), c = normalize(close);
    if (hay.includes(o + want + c)) return { status: 'ok' };
  }
  // Span-value comparison. Catches the undelimited families (<src> markup, the
  // Japanese frame) and the cases the substring test misses because normalize()
  // strips edge punctuation the clip still carries inside its quotes — Spanish
  // '¿dónde quieres quedar?' announced for a lego written without the ¿…?.
  for (const s of spans) if (normalize(s.value) === want) return { status: 'ok' };

  return { status: 'drift', announced: spans[0].value };
}

module.exports = { preprocess, extractSpans, extractAnnounced, normalize, matchesKnown };
