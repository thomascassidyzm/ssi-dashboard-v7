/**
 * Flag resolution — a flag closes itself when the row it was left on is fixed.
 *
 * Kai, 2026-08-21: "you can have resolving a flag close it automatically. In the
 * past your agents have decided to do it themselves, but having it happen
 * automatically is better obviously. It should also leave it unaccepted, so I can
 * check it again and approve it then."
 *
 * WHERE "RESOLVED" IS KNOWABLE. Not in an edit path. Course rows are edited from
 * half a dozen places that know nothing about this tool — psql by hand, the
 * course-builder API, dashboard views, agent scripts — so any hook we bolt onto
 * one of them leaves the other five silently dangling flags, which is the bug we
 * are fixing. The one place that sees every edit, whoever made it, is this tool's
 * own read of the live rows. So resolution is decided there, on the same live
 * fetch the reviewer's page already does: what the row said when it was flagged
 * is recorded WITH the flag, and the next live read compares.
 *
 * A flag closes when, since it was left:
 *   - its row was deleted            (the Finnish kysyä flags were resolved by
 *                                     pulling six phrases outright)
 *   - its own text changed           (the ordinary fix)
 *   - its seed's phrases changed     (a row added or removed in the same seed —
 *                                     Kai's seed 105 flag asks for phrases to be
 *                                     ADDED, so the flagged row itself never moves)
 *
 * Closing means the decision is REMOVED, not flipped to ok: the phrase goes back
 * to "never checked", which is what puts it in front of the reviewer again and
 * what keeps its seed out of approval. Nothing here ever approves anything, and
 * a seed already carrying an approval is unapproved by the caller when a flag in
 * it closes — the row must come back round for Kai to accept, or not.
 *
 * The note he wrote is not thrown away: it is kept in progress.resolvedFlags so
 * the phrase card can say why the row is back.
 */
const crypto = require('crypto');

const SEP = '␟';

function phraseFingerprint(p) {
  return `${p.known_text || ''}${SEP}${p.target_text || ''}`;
}

function seedFingerprint(phrases, seedNumber) {
  const rows = phrases
    .filter((p) => p.seed_number === seedNumber)
    .map((p) => `${p.id}${SEP}${phraseFingerprint(p)}`)
    .sort();
  return crypto.createHash('sha1').update(rows.join('\n')).digest('hex');
}

// What a flag records about the row it is left on, so a later read can tell
// whether anything has been done about it.
function resolveKeyFor(phrases, phraseId) {
  const p = phrases.find((x) => x.id === phraseId);
  if (!p) return null;
  return {
    seedNumber: p.seed_number,
    phrase: phraseFingerprint(p),
    seed: seedFingerprint(phrases, p.seed_number),
  };
}

// null = still open. Anything else is why it closed.
function resolutionOf(phrases, key) {
  const p = phrases.find((x) => x.id === key.phraseId);
  if (!p) return 'the row was removed from the course';
  if (phraseFingerprint(p) !== key.phrase) return 'the row was edited';
  if (seedFingerprint(phrases, p.seed_number) !== key.seed) return 'the seed it sits in changed';
  return null;
}

/**
 * Reconcile the progress file against the live rows. MUTATES `progress`.
 *
 * Only ever call this with rows read live — a stale snapshot would close flags
 * against text that may already have moved on, or adopt a fingerprint from data
 * older than the flag.
 *
 * Returns { closed: [{phraseId, seedNumber, reason, note}], adopted: [phraseId] }.
 * `adopted` is the one-off backfill for flags left before this existed: their
 * current text becomes the flagged text, so they close on the NEXT change, never
 * on this read.
 */
function reconcileFlags(data, progress) {
  const closed = [];
  const adopted = [];
  for (const [phraseId, d] of Object.entries(progress.decisions || {})) {
    if (d?.status !== 'flagged') continue;
    if (!d.resolve) {
      const key = resolveKeyFor(data.phrases, phraseId);
      // No row and no record of what it said: nothing to compare, ever. Close it
      // — the row is gone, which is resolution by the same rule as a deletion.
      if (!key) {
        delete progress.decisions[phraseId];
        recordResolved(progress, phraseId, d, 'the row was removed from the course');
        closed.push({ phraseId, seedNumber: null, reason: 'the row was removed from the course', note: d.note || '' });
        continue;
      }
      d.resolve = key;
      adopted.push(phraseId);
      continue;
    }
    const reason = resolutionOf(data.phrases, { ...d.resolve, phraseId });
    if (!reason) continue;
    delete progress.decisions[phraseId];
    recordResolved(progress, phraseId, d, reason);
    closed.push({ phraseId, seedNumber: d.resolve.seedNumber, reason, note: d.note || '' });
  }
  return { closed, adopted };
}

function recordResolved(progress, phraseId, decision, reason) {
  progress.resolvedFlags = progress.resolvedFlags || {};
  progress.resolvedFlags[phraseId] = {
    note: decision.note || '',
    flaggedAt: decision.at || null,
    closedAt: new Date().toISOString(),
    reason,
  };
}

module.exports = {
  SEP,
  phraseFingerprint,
  seedFingerprint,
  resolveKeyFor,
  resolutionOf,
  reconcileFlags,
};
