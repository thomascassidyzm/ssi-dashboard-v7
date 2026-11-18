// services/shared/roman-sync.cjs
//
// target_text_roman must always spell the CURRENT target_text (job #252, 2026-11-04).
//
// zho_for_eng, jpn_for_eng and kor_for_eng carry a romanisation (pinyin, romaji,
// revised romanisation) on seeds, LEGOs and phrases, and the learner app SHOWS IT
// as the primary text whenever it is non-empty (ssi-learning-app
// api/courses/[code]/cycles.ts: "when target_text_roman exists, show romanized").
// No code can derive it — polyphones (得 de/děi, 了 le/liǎo, 只 zhī/zhǐ) need a
// reader — so when a target text changes and the caller does not send the new
// romanisation, the old one keeps playing to the learner as the spelling of a
// sentence that no longer exists. On 4 Nov 2026 zho_for_eng had 58 such rows
// ("你认识我父亲吗？" displayed as "nǐ zhīdào wǒ fùqīn ma").
//
// The rule, one function, two policies:
//   - the course-edit engine (agents, sweeps) REFUSES: ROMAN_STALE. The caller
//     has the new text in hand and is the one who must read and supply the
//     romanisation — or send target_text_roman: null to clear it on purpose.
//   - the single-row human edit routes CLEAR it (null) and say so, because a
//     blank shows the learner the right characters, and a stale one shows them
//     the wrong words.
// A row with no romanisation (most of seeds 301-668 today) is never affected.

/**
 * True when `set` changes a row's target_text, the row currently carries a
 * romanisation, and `set` says nothing about target_text_roman.
 * @param {{target_text?: string, target_text_roman?: string|null}} before  the row as read
 * @param {Object} set  the columns about to be written
 */
function romanGoesStale(before, set) {
  if (!before || !set) return false;
  if (!Object.prototype.hasOwnProperty.call(set, 'target_text')) return false;
  if (Object.prototype.hasOwnProperty.call(set, 'target_text_roman')) return false;
  if (set.target_text === before.target_text) return false;
  return typeof before.target_text_roman === 'string' && before.target_text_roman.trim() !== '';
}

const ROMAN_STALE_MESSAGE =
  'target_text changes but this row carries a target_text_roman (pinyin/romaji/romanisation) written for the old text. ' +
  'Send the new target_text_roman with it, read by hand (polyphones need a reader), or target_text_roman: null to clear it deliberately.';

/**
 * For the single-row human edit routes: the patch to write, with the stale
 * romanisation cleared when it would otherwise go stale.
 * @returns {{ patch: Object, romanCleared: boolean }}
 */
function clearStaleRoman(before, set) {
  if (!romanGoesStale(before, set)) return { patch: set, romanCleared: false };
  return { patch: { ...set, target_text_roman: null }, romanCleared: true };
}

/**
 * For whole-row WRITES that may land on an existing row (an upsert of a LEGO's
 * phrase set, job #272): the romanisation the row must carry. An upsert updates
 * only the columns its rows name, so a row that leaves target_text_roman out
 * keeps the OLD sentence's romanisation under the NEW text. The rule: what the
 * caller sent; else the existing row's, if it spells the same text; else null
 * (a blank shows the learner the right characters, a stale one the wrong words).
 *
 * "Sent" means the value is not undefined — NOT that the key is present. An
 * explicit null or "" (or whitespace) is a deliberate clear and wins over the
 * existing reading: that is how a builder removes a wrong romanisation without
 * changing the characters (review finding 3, job #731). Only undefined means
 * "omitted" and falls back to the existing reading. Never test key presence
 * (`in` / hasOwnProperty) here: the v2 phrase-set route's BUILD and USE row
 * builders always create the key, copying `p.target_text_roman` from the JSON
 * body, so an omitted field arrives as a present key holding undefined.
 * @param {Object} row            the row about to be written
 * @param {Object|null} existing  the row now at that key, as read (target_text, target_text_roman)
 */
function withExplicitRoman(row, existing = null) {
  const nonEmpty = (v) => (typeof v === 'string' && v.trim() ? v : null);
  if (row.target_text_roman !== undefined) return { ...row, target_text_roman: nonEmpty(row.target_text_roman) };
  const kept = existing && existing.target_text === row.target_text ? nonEmpty(existing.target_text_roman) : null;
  return { ...row, target_text_roman: kept };
}

module.exports = { romanGoesStale, clearStaleRoman, withExplicitRoman, ROMAN_STALE_MESSAGE };
