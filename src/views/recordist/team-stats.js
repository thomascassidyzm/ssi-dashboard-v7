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
export function teamCards(artists, ownVoiceId, now = Date.now()) {
  const list = Array.isArray(artists) ? artists : []
  const own = list.find((a) => a.voiceId === ownVoiceId)
  const ownName = own ? own.name : null
  return list
    .filter((a) => !a.isTest && !a.noQueue && a.voiceId !== ownVoiceId && !(ownName && a.name === ownName))
    .map((a) => ({ ...a, rows: projectRows(a.projects, now) }))
}

/**
 * The project a card shows: the one worked on most recently, else the first unfinished one of
 * more than one line, else the first unfinished. A trial script ("(test)") or a one-line project
 * never heads a card while real work exists (Aran, 2026-10-14: Catrin's card led with her trial
 * Health script, Eleri's with the single guess-game line queued before her Pod 1).
 */
export function focusProject(projects) {
  const all = (projects || []).filter((p) => !p.other)
  const real = all.filter((p) => !isMinorProject(p))
  const pick = (list) => {
    const worked = list.filter((p) => p.activity && p.activity.lastActive)
      .sort((a, b) => Date.parse(b.activity.lastActive) - Date.parse(a.activity.lastActive))
    return worked[0] || list.find((p) => p.total > 0 && p.recorded < p.total) || list[0] || null
  }
  return pick(real) || pick(all)
}

/** A trial script ("(test)") or a one-line project: shown, but never ahead of real work. */
export const isMinorProject = (p) => /\(test\)/i.test(p.label || '') || p.total === 1

/**
 * EVERY PROJECT ON THE CARD, one row each (Aran, 2026-10-14, job #393: "we only see one line of
 * progress for each of them … Dan needs to do Pod1, then new and old seeds, whole sentences, and
 * practice phrases. Current progress should be shown for ALL of those").
 *
 * The list is the server's — one project per card of the reader's own booth home (their
 * castings: pods, sentences, LEGOs, practice phrases per course and pass), so a project they have
 * not touched is still a row, "0 of 968". Nothing here adds or drops a project by name. Earlier
 * lines (takes whose words are on no line of the queue today) come last, with a take count and no
 * total, because there is nothing left to count them against. A trial script or a one-line
 * project (Eleri's guess-game line) is still a row, after the real work (job #379's rule).
 */
export function projectRows(projects, now = Date.now()) {
  const list = projects || []
  const main = list.filter((p) => !p.other && !isMinorProject(p))
  const minor = list.filter((p) => !p.other && isMinorProject(p))
  return [...main, ...minor, ...list.filter((p) => p.other)].map((p) => {
    const act = p.activity || {}
    return {
      key: p.key,
      label: p.label,
      other: !!p.other,
      recorded: p.other ? null : (p.recorded || 0),
      total: p.other ? null : (p.total || 0),
      done: !p.other && p.total > 0 && p.recorded >= p.total,
      takes: act.takes || 0,
      takes7d: act.takes7d || 0,
      lastActive: act.lastActive || null,
      when: whenLabel(act, now),
    }
  })
}

/** "today", "yesterday", "3d ago", or "not started" — the last take of a reader or a project. */
export function whenLabel(activity, now = Date.now()) {
  const t = activity && activity.lastActive
  if (!t) return 'not started'
  if (activity.takesToday) return 'today'
  const days = Math.floor((now - Date.parse(t)) / 86400000)
  return days < 1 ? 'in the last day' : days === 1 ? 'yesterday' : `${days}d ago`
}
