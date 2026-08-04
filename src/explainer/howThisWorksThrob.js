/**
 * howThisWorksThrob — seen/re-arm state for the How-this-works link's
 * discoverability throb. Ported from ssi-learning-app (types stripped; keyed on
 * Popty's `section` rather than the learning app's node id, since that is the
 * place key Popty already has).
 *
 * The link is THE single surfacing point for clips + invitations, so it glows
 * subtly on first visit and re-arms when the noticing rules surface something
 * not yet seen. Pure localStorage, same persistence idiom as
 * NoticingInvitations' dismissal map: one JSON map under one key, pruned as we
 * write.
 *
 * The rules:
 * · first visit = the viewer has NO seen entry for ANY section → throb.
 * · re-arm      = the current invitation/clip key set contains a key not
 *   recorded at the viewer's last open of THIS section's panel → throb.
 * · opening the panel = markSeen(current keys) → throb stops until the set
 *   changes again.
 */

export const HTW_SEEN_KEY = 'popty-htw-seen'

const PRUNE_DAYS = 180

function readSeen() {
  try {
    return JSON.parse(localStorage.getItem(HTW_SEEN_KEY) || '{}')
  } catch {
    return {}
  }
}

const entryKey = (viewerId, section) => `${viewerId}:${section}`

/** Should the How-this-works link throb right now? */
export function shouldThrob(viewerId, section, currentKeys) {
  const map = readSeen()
  const everSeen = Object.keys(map).some((k) => k.startsWith(`${viewerId}:`))
  if (!everSeen) return true
  const seenKeys = map[entryKey(viewerId, section)]?.keys ?? []
  return (currentKeys ?? []).some((k) => !seenKeys.includes(k))
}

/** The panel was opened: record it, with the key set it surfaced. */
export function markSeen(viewerId, section, currentKeys) {
  const map = readSeen()
  map[entryKey(viewerId, section)] = { seenAt: Date.now(), keys: currentKeys ?? [] }
  // Prune stale entries while we're here so the map never grows unbounded.
  const cutoff = Date.now() - PRUNE_DAYS * 86400000
  for (const k of Object.keys(map)) if (map[k].seenAt < cutoff) delete map[k]
  try {
    localStorage.setItem(HTW_SEEN_KEY, JSON.stringify(map))
  } catch {
    /* storage unavailable — the throb just stays armed, never breaks the page */
  }
}
