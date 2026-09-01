/**
 * The versioning rules for the Script Lab's line editor, as pure functions over
 * rows, so they can be tested without a database and so the endpoint and the
 * view can never disagree about what the history says.
 *
 * The shape is the estate's proven one (api/lib/copy-publish.js, htw_copy_versions),
 * narrowed to a single line of dialogue and with publication left out — a
 * canonical script has no draft/live split, the master text IS the live text.
 * What is kept is the part that matters:
 *
 *   THE HISTORY IS APPEND-ONLY, AND THE FIRST EDIT FREEZES WHAT WAS THERE BEFORE.
 *
 * So: on the first save of a line, the PRE-EDIT text is written as a 'original'
 * row, once and once only, and then the new text is appended as a 'save'. A
 * restore is another 'save' carrying an older row's words — never a delete, and
 * never a rewrite. Roll back and forth as often as you like: every intermediate
 * value is still there to compare against.
 *
 * A row is { id, scenario_id, pod_slug, kind, english_text, speaker,
 * author_notes, saved_at, saved_by }, with kind 'original' | 'save'.
 */

/**
 * The editable fields of a canonical line — the ones a version row carries.
 *
 * target_text joined them on 2026-09-01. It used to be a read-only specimen
 * rendered beside the English, which is fine while the target is a machine
 * rendering of somebody else's decision — and useless the moment the target is
 * a DRAFT waiting for a human to correct it line by line, which is what the
 * Welsh health overlay is. It saves through exactly the same freeze-then-append
 * path as the English: same history, same diff, same restore.
 */
export const EDITABLE_FIELDS = ['english_text', 'speaker', 'author_notes', 'target_text'];

/** Has this line's pre-edit state been frozen yet? Exactly one 'original' ever. */
export function hasOriginal(rows) {
  return (rows || []).some(r => r && r.kind === 'original');
}

/**
 * The frozen 'original' row to write on a line's first edit — built from the
 * line AS IT STANDS, before the patch is applied. Called only when
 * hasOriginal() is false; the database's partial unique index is the backstop
 * against two first-edits racing.
 */
export function originalRowFrom(line, savedBy = 'unknown') {
  return {
    scenario_id: line.id,
    pod_slug: line.pod_slug,
    kind: 'original',
    english_text: line.english_text ?? '',
    speaker: line.speaker ?? null,
    author_notes: line.author_notes ?? null,
    target_text: line.target_text ?? null,
    target_lang: line.target_lang ?? null,
    saved_by: savedBy
  };
}

/**
 * The patch to apply: only the editable fields the caller actually sent, and
 * only where they differ from what is stored. An empty object means the save is
 * a no-op — which the endpoint answers without writing a version, because a
 * blur with no typing must not mint history.
 */
export function patchFor(line, body) {
  const patch = {};
  for (const f of EDITABLE_FIELDS) {
    const v = body?.[f];
    if (typeof v !== 'string') continue;
    if (v === (line?.[f] ?? '')) continue;
    if (line?.[f] == null && v === '') continue;
    patch[f] = v;
  }
  return patch;
}

/** The 'save' row for an edit: the line's new state in full, not just the delta. */
export function saveRowFrom(line, patch, savedBy = 'unknown') {
  const next = { ...line, ...patch };
  return {
    scenario_id: line.id,
    pod_slug: line.pod_slug,
    kind: 'save',
    english_text: next.english_text ?? '',
    speaker: next.speaker ?? null,
    author_notes: next.author_notes ?? null,
    target_text: next.target_text ?? null,
    target_lang: next.target_lang ?? null,
    saved_by: savedBy
  };
}

/**
 * The list the editor shows: newest first, with the frozen original at the
 * bottom — the order a human reads a history in, and the order that puts "what
 * it used to say" where they expect to find it.
 *
 * english_text IS included: these are single lines of dialogue, so the whole
 * history of a line is a few hundred bytes, and shipping the text is what lets
 * the diff render without a round trip per version.
 */
export function versionList(rows) {
  return (rows || [])
    .slice()
    .sort((a, b) => Number(b.id) - Number(a.id))
    .map(r => ({
      versionId: Number(r.id),
      kind: r.kind,
      englishText: r.english_text ?? '',
      speaker: r.speaker ?? null,
      authorNotes: r.author_notes ?? null,
      targetText: r.target_text ?? null,
      targetLang: r.target_lang ?? null,
      savedAt: r.saved_at ?? null,
      savedBy: r.saved_by ?? null
    }));
}

/**
 * Per-line summary for a whole script: how many times each line has been
 * edited and who touched it last. Drives the 'edited' chips, so the page can
 * mark what has been changed without loading every version of every line.
 *
 * The count is SAVES, not rows: the frozen original is the state before anyone
 * edited anything, and counting it would say "1 edit" about a line nobody has
 * touched.
 */
export function editSummary(rows) {
  const by = {};
  for (const r of rows || []) {
    const e = (by[r.scenario_id] ||= { scenarioId: r.scenario_id, edits: 0, lastSavedAt: null, lastSavedBy: null });
    if (r.kind !== 'save') continue;
    e.edits++;
    if (!e.lastSavedAt || Number(r.id) > Number(e._id ?? -1)) {
      e._id = Number(r.id);
      e.lastSavedAt = r.saved_at ?? null;
      e.lastSavedBy = r.saved_by ?? null;
    }
  }
  return Object.values(by)
    .filter(e => e.edits > 0)
    .map(({ _id, ...e }) => e);
}

/** The version being restored, or null if it does not belong to this line. */
export function pickVersion(rows, versionId) {
  return (rows || []).find(r => String(r.id) === String(versionId)) ?? null;
}
