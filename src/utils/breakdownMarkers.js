/**
 * Breakdown markers, and taking them off a recordist's screen.
 *
 * Pod sentences carry ellipses mid-sentence — `Mae o… wedi'i goginio'n… araf`.
 * They are LEARNER-facing chunk markers: they say where the phrase is broken up
 * for the learner's ear on first meeting. They are not performance directions
 * and they are not pauses anyone is being asked to make.
 *
 * A recording artist reading blind has no way to know that. Catrin Lliar was
 * thrown off by them mid-session (Aran, 2026-08-23), which is the entirely
 * reasonable reading: an ellipsis in a script means hesitate here.
 *
 * So they come off what the recordist SEES — and off nothing else. This is a
 * display transform and it must stay one: the marker is load-bearing in the
 * clip's identity (`audioKeyCandidates(line.text)` against
 * `course_audio.text_normalized`, which strips only TRAILING punctuation), so
 * the raw string still has to be what gets posted with the take. Strip at the
 * render seam, never at the data layer.
 *
 * Only markers actually present in the queue's text are stripped: the Unicode
 * ellipsis (572 rows in `listening_pod_sentences`), the ASCII three-dot (36),
 * and a spaced-out `. . .` for safety. Nothing else — an en-dash range and a
 * quoted slash exist in the data and are ordinary punctuation, not markers.
 */

// `. . .` first so its spaces are consumed as one marker rather than three.
const BREAKDOWN_MARKER = /\.\s\.\s\.|\.\.\.|…/g

/**
 * Take the breakdown markers out of a line, leaving it readable aloud.
 *
 * The marker often abuts other punctuation (`fi,…`) or a word with no space
 * (`goginio'n…`), so it becomes a space rather than nothing — otherwise
 * `goginio'n…araf` would fuse into one word. Then runs of whitespace collapse
 * to one, and a space that has been left sitting in front of closing
 * punctuation is tidied away, so `fi, …ydy` reads `fi, ydy` and not `fi , ydy`.
 */
export function stripBreakdownMarkers(text) {
  const raw = String(text ?? '')
  if (!raw) return ''
  if (!BREAKDOWN_MARKER.test(raw)) { BREAKDOWN_MARKER.lastIndex = 0; return raw }
  BREAKDOWN_MARKER.lastIndex = 0
  return raw
    .replace(BREAKDOWN_MARKER, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.?!;:])/g, '$1')
    .trim()
}
