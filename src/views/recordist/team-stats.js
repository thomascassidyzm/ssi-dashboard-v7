/**
 * THE TEAM ON A GOD ADMIN'S BOOTH (Aran, 2026-10-14, job #379): under his finished work on his
 * own booth, a compact card for each of the other human readers (Catrin, Dan, Eleri…), each
 * tapping through to that reader on /admin/recording.
 *
 * WHO SEES IT is decided on the SERVER: the cards are drawn from /api/recording/admin/artists,
 * which answers only a signed-in God admin (services/voice-engine/booth-god-admins.cjs). A booth
 * link alone is never enough. The list below decides one thing only — on which booths the section
 * exists at all, so that on any other reader's booth it draws nothing and makes no call. On these
 * booths a visitor who is not signed in is shown a "sign in to see the team" link, never data.
 */

/** The God admins' own booths: Aran's Welsh and English voices, and Kai's Welsh voice. */
export const TEAM_BOOTHS = new Set(['human_aran_cym_n', 'human_aran_eng', 'human_kai_cym_n'])

export const showsTeamSection = (voiceId) => TEAM_BOOTHS.has(String(voiceId || ''))

/**
 * The cards: every real reader except this booth's own artist (any of their voices — Aran's
 * English voice is also "Aran"), test voices and voices with no queue.
 */
export function teamCards(artists, ownVoiceId) {
  const list = Array.isArray(artists) ? artists : []
  const own = list.find((a) => a.voiceId === ownVoiceId)
  const ownName = own ? own.name : null
  return list
    .filter((a) => !a.isTest && !a.noQueue && a.voiceId !== ownVoiceId && !(ownName && a.name === ownName))
    .map((a) => ({ ...a, focus: focusProject(a.projects) }))
}

/**
 * The project a card shows: the one worked on most recently, else the first unfinished one of
 * more than one line, else the first unfinished. A trial script ("(test)") or a one-line project
 * never heads a card while real work exists (Aran, 2026-10-14: Catrin's card led with her trial
 * Health script, Eleri's with the single guess-game line queued before her Pod 1).
 */
export function focusProject(projects) {
  const all = (projects || []).filter((p) => !p.other)
  const real = all.filter((p) => !/\(test\)/i.test(p.label || '') && p.total !== 1)
  const pick = (list) => {
    const worked = list.filter((p) => p.activity && p.activity.lastActive)
      .sort((a, b) => Date.parse(b.activity.lastActive) - Date.parse(a.activity.lastActive))
    return worked[0] || list.find((p) => p.total > 0 && p.recorded < p.total) || list[0] || null
  }
  return pick(real) || pick(all)
}
