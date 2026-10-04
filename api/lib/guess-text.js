/**
 * The rules for the /guess game's text, as pure functions over rows, so the editor endpoint
 * and the public learner endpoint cannot disagree about what is live.
 *
 * Five kinds of text, each keyed by a STABLE item id and by the KNOWN language it is
 * written in, so the game can be localised later by adding rows for another known language:
 *   game        the game's OWN words: modes, prompts, buttons, feedback, score and share lines, the
 *               mini-lesson lines. id = a stable key (chooser_title, btn_next); {placeholders} are kept
 *   tell        the one-line reveal under each answer          id = language key ('gle', 'cym_s')
 *   pair        a Read more "Easily mistaken for" line         id = 'a|b' (the order the game's list uses)
 *   place_note  the light line under the place (speakers)      id = place key
 *   place_where the place in two or three words                id = place key
 *
 * A row is a version: state 'live' (what learners read) or 'superseded' (history); 'draft' is a
 * legacy state the table still allows but nothing writes any more (Tom 2026-10-04: saves go live).
 * At most one live row per item. Learners read live rows only.
 */

export const KINDS = ['game', 'tell', 'pair', 'place_note', 'place_where'];
export const DEFAULT_KNOWN = 'eng';
const MAX_CHARS = 600;
const ITEM_ID_RE = /^[a-z0-9_]+(\|[a-z0-9_]+)?$/;
const KNOWN_RE = /^[a-z]{3}$/;

// The player names its known language by interface-locale code (ga, cym_n, cym_s); the table is keyed by
// the three-letter course language. Map the aliases; any other well-formed code is looked up as itself
// and, having no rows, gets English item by item.
const KNOWN_ALIAS = { ga: 'gle', cy: 'cym', cym_n: 'cym', cym_s: 'cym' };
const PLAYER_KNOWN_RE = /^[a-z]{2,3}(_[a-z]{1,3})?$/;

/** The table's known_lang for a player-sent code, or null when the code is malformed. */
export function normaliseKnown(known) {
  if (typeof known !== 'string' || !PLAYER_KNOWN_RE.test(known)) return null;
  return KNOWN_ALIAS[known] || (KNOWN_RE.test(known) ? known : null) || known.slice(0, 3);
}

export function validKnown(known) { return typeof known === 'string' && KNOWN_RE.test(known); }

/** An error string, or null when the item may be saved. */
export function validateItem({ kind, item_id, content }) {
  if (!KINDS.includes(kind)) return `kind must be one of ${KINDS.join(', ')}`;
  if (typeof item_id !== 'string' || !ITEM_ID_RE.test(item_id)) return 'bad item id';
  if ((kind === 'pair') !== item_id.includes('|')) return kind === 'pair' ? 'a pair id is "a|b"' : 'only a pair id contains "|"';
  if (typeof content !== 'string' || !content.trim()) return 'the text is empty';
  if (content.length > MAX_CHARS) return `over ${MAX_CHARS} characters`;
  return null;
}

/** Tom's rule: no parentheses in course text. The editor warns; it does not block. */
export const hasParentheses = (s) => /[()]/.test(String(s || ''));

/** {kind: {item_id: content}} from LIVE rows only; a draft or superseded row is ignored here whatever the caller passed. */
export function liveMap(rows) {
  const out = Object.fromEntries(KINDS.map(k => [k, {}]));
  for (const r of rows || []) {
    if (r && r.state === 'live' && out[r.kind]) out[r.kind][r.item_id] = r.content;
  }
  return out;
}

/** The text for `known`, with any item it lacks filled from English. Reports whether English was needed. */
export function withFallback(knownRows, engRows, known) {
  const own = liveMap(knownRows);
  if (known === DEFAULT_KNOWN) return { items: own, fallbackFrom: null };
  const eng = liveMap(engRows);
  let used = false;
  for (const k of KINDS) {
    for (const [id, text] of Object.entries(eng[k])) {
      if (!(id in own[k])) { own[k][id] = text; used = true; }
    }
  }
  return { items: own, fallbackFrom: used ? DEFAULT_KNOWN : null };
}

/** The editor's view: one entry per item with its live text, in seed order. */
export function itemsForEditor(rows) {
  const by = new Map();
  for (const r of [...(rows || [])].sort((a, b) => Number(a.id) - Number(b.id))) {
    if (r.state !== 'live') continue;
    const key = `${r.kind}\u0000${r.item_id}`;
    if (!by.has(key)) by.set(key, { kind: r.kind, id: r.item_id, live: null });
    const slot = by.get(key);
    const v = { content: r.content, editedBy: r.edited_by ?? null, source: r.source, at: r.created_at, approvedBy: r.approved_by ?? null, approvedAt: r.approved_at ?? null };
    slot.live = v;
  }
  return [...by.values()];
}
