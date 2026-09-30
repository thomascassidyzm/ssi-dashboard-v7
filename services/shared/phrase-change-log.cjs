// services/shared/phrase-change-log.cjs
//
// What an auto-fill / regenerate run must leave in the content event log so Kai can review it
// (Kai's ask + Tom's ruling, job #920, 2026-09-30): for EVERY course_practice_phrases row the run
// creates, replaces or deletes, the FULL text before and after — both sides — not just ids.
// Italian seed 190 had three phrases deleted by a regenerate run whose event held only their ids,
// so the text was unrecoverable. content_edit_events.detail is jsonb (no size cap), so the whole
// row goes in; nothing is truncated or chunked.
//
//   create  → { change:'create',  before:null, after:{…} }
//   delete  → { change:'delete',  before:{…},  after:null }
//   replace → { change:'replace', before:{…},  after:{…} }   (same id, text changed)
//
// The BEFORE side must be read by the caller BEFORE it writes (a failed write still leaves an
// honest record), which is why this module is pure: rows in, detail out.

function snapshot(row) {
  if (!row) return null;
  return {
    id: row.id,
    course_code: row.course_code,
    seed_number: row.seed_number,
    lego_index: row.lego_index,
    lego_id: row.lego_id ?? null,
    phrase_role: row.phrase_role ?? row.role ?? null,
    position: row.position ?? null,
    known_text: row.known_text ?? row.known ?? null,
    target_text: row.target_text ?? row.target ?? null,
  };
}

function changeEntry(before, after) {
  const b = snapshot(before);
  const a = snapshot(after);
  if (!b && !a) throw new Error('phrase change with neither before nor after');
  return { change: !b ? 'create' : !a ? 'delete' : 'replace', id: (a || b).id, before: b, after: a };
}

function phraseChangesDetail(changes, extra = {}) {
  return { ...extra, changes };
}

module.exports = { snapshot, changeEntry, phraseChangesDetail };
