/**
 * The publication rules for the Copy area, as pure functions over rows.
 *
 * Everything about "what is live" is decided here rather than in the handlers,
 * so the rules can be tested without a database and so the authenticated
 * editor endpoint and the public learner endpoint can never disagree about
 * which version a learner is reading.
 *
 * The one rule everything else follows from:
 *
 *   THE LIVE TEXT IS THE ROW WITH THE GREATEST NON-NULL published_at.
 *
 * Publishing stamps a row with published_at = now(). Rolling back stamps an
 * OLDER row, which thereby becomes the greatest and so becomes live. Content is
 * never copied, edited or deleted; a rollback is a stamp, not a rewrite.
 *
 * Ties would be poison: a rollback stamped in the same millisecond as the
 * publish it undoes has to beat it, and no tie-break over ids can know that —
 * the rollback target is by definition the OLDER row. So ties are prevented
 * rather than resolved: nextPublishStamp() below makes every publish strictly
 * later than the one it replaces. The id tie-break in publishedRows() is only a
 * backstop for rows stamped before that rule existed, so the sort stays total.
 *
 * A row is { id, kind, content, saved_at, saved_by, published_at, published_by }.
 * 'kind' is 'original' (the frozen seed, one per doc) or 'save'.
 */

/** The published rows, newest publish first. */
function publishedRows(rows) {
  return (rows || [])
    .filter(r => r && r.published_at)
    .sort((a, b) => {
      const t = new Date(b.published_at) - new Date(a.published_at);
      return t !== 0 ? t : Number(b.id) - Number(a.id);
    });
}

/**
 * The row a learner is reading right now, or null if this doc has never been
 * published — which is the honest state of every doc until someone clicks
 * Publish, and the state the learner app must survive by falling back.
 */
export function liveVersion(rows) {
  return publishedRows(rows)[0] ?? null;
}

/**
 * The published_at to stamp on the version being published.
 *
 * Normally just now(). But "the live text is the greatest published_at" only
 * decides anything if the greatest is unique, and a rollback clicked in the
 * same millisecond as the publish it undoes would tie — with the rollback
 * target, being the older row, losing any id-based tie-break. Two clicks a
 * millisecond apart would then leave the wrong words in front of learners with
 * nothing on screen to say so.
 *
 * So a publish is never allowed to land at or before the one it replaces: it
 * takes the next millisecond instead. Wall-clock drift of a millisecond or two
 * is invisible in a status line that reads "published at 15:32"; a rollback
 * that silently does not roll back is not.
 *
 * @param {object|null} live  the currently live row, or null
 * @param {Date} now
 * @returns {string} ISO timestamp, strictly after live.published_at
 */
export function nextPublishStamp(live, now = new Date()) {
  const t = now.getTime();
  if (!live || !live.published_at) return new Date(t).toISOString();
  const liveT = new Date(live.published_at).getTime();
  return new Date(Number.isFinite(liveT) && t <= liveT ? liveT + 1 : t).toISOString();
}

/**
 * The version list the editor shows: every row, newest first, each flagged with
 * whether it has ever been published and whether it is the one that is live.
 * The frozen original is included on purpose — republishing it is how someone
 * puts the whole document back to where it started.
 *
 * Content is deliberately not included: the list is a picker, and the payload
 * stays small however long the history gets.
 */
export function versionList(rows) {
  const live = liveVersion(rows);
  return (rows || [])
    .slice()
    .sort((a, b) => Number(b.id) - Number(a.id))
    .map(r => ({
      versionId: Number(r.id),
      kind: r.kind,
      savedAt: r.saved_at ?? null,
      savedBy: r.saved_by ?? null,
      publishedAt: r.published_at ?? null,
      publishedBy: r.published_by ?? null,
      everPublished: !!r.published_at,
      isLive: !!live && Number(live.id) === Number(r.id),
      chars: typeof r.content === 'string' ? r.content.length : null
    }));
}

/**
 * What the editor's status line needs: which version is live, when, by whom,
 * and whether the draft in the box says something a learner cannot see yet.
 *
 * @param {Array} rows   every row for one doc
 * @param {object} draft the row the editor is showing — the newest save, or the
 *                       original when nothing has been saved
 */
export function publicationState(rows, draft) {
  const live = liveVersion(rows);
  return {
    published: live
      ? {
          versionId: Number(live.id),
          kind: live.kind,
          publishedAt: live.published_at,
          publishedBy: live.published_by ?? null,
          savedAt: live.saved_at ?? null,
          savedBy: live.saved_by ?? null
        }
      : null,
    publishedContent: live ? live.content ?? null : null,
    // Compared on content, not on ids: saving the same words twice, or
    // republishing an older row whose text matches the draft, both leave a
    // learner reading exactly what the editor is looking at — and the status
    // line should say so rather than nagging about a version number.
    draftDiffers: live ? (draft?.content ?? null) !== (live.content ?? null) : true
  };
}
