/**
 * A CLIP IS MATCHED ON THE WORDS IT SAYS, NOT THE LABEL IT IS FILED UNDER (cs #160·AI, Kai 2026-11-16).
 *
 * The female-form re-records (#130·AI ita "sicura", #142·AI spa/fra/por, #155·AI fra fe407f10 "sûre") replaced the bytes
 * of ~1,100 clips IN PLACE: the clip now SAYS the female form while course_audio.text still holds the slot's male-form
 * text. Every reuse path keys a clip on (language, text), so without this a later render or link of "sono sicuro" could
 * be answered — free, "library" — with a clip that says "sono sicura".
 *
 * WHERE THE SPOKEN WORDS LIVE: public.clip_spoken_text (audio_id, spoken_text, basis, audio_revision) — the table the
 * named-voices migration (database/changes/20260929_named_human_voices.sql) made for exactly "a gender-expanded take is
 * stored under its unexpanded label". No new column. A verdict binds ONE revision of the clip: when the clip is
 * re-recorded again (audio_revision moves) the verdict no longer describes its bytes and is ignored here.
 *
 * THE RULE (saysOtherWords): a row whose verdict's spoken_text differs from the wanted words (sameRecordedWords —
 * case, end punctuation and the pod pause cue folded) never answers them. A row with no verdict is matched on its text,
 * exactly as before — the overwhelming majority, untouched.
 *
 * PRONUNCIATION OVERRIDES ARE NOT MARKED. A spokenFor re-record (shared/pronunciation-overrides.cjs) says the SAME words
 * in a respelling for the provider; its clip stays reusable for its stored text, and shared/pronunciation-reuse-guard.cjs
 * already governs those. Only a re-record whose explicit spokenText differs from both req.text and the spokenFor form is
 * a different-words take and gets a verdict (audio-render-entry.cjs rerecord → spokenVerdictFor).
 */
const { sameRecordedWords } = require('./text-normalize.cjs')

const CHUNK = 100

/** The verdict a row carries, if it describes the row's current bytes. Unknown revision on the row: applies (fails closed). */
function verdictApplies(verdict, row) {
  if (!verdict || verdict.spoken_text == null) return false
  if (row.audio_revision == null || verdict.audio_revision == null) return true
  return Number(verdict.audio_revision) === Number(row.audio_revision)
}

/** True when this row is known to SAY words other than `text`. Pure. Rows must have been through withSpokenText. */
function saysOtherWords(row, text) {
  return !!row && row.spoken_text != null && !sameRecordedWords(String(row.spoken_text), String(text == null ? '' : text))
}

/** The words a row says: its verdict when it has one, else its stored text. */
function wordsOf(row) {
  return row && row.spoken_text != null ? row.spoken_text : (row ? row.text : null)
}

/**
 * Read verdicts for these clip ids: Map audio_id → { spoken_text, audio_revision }. A failed read THROWS: not knowing
 * whether a clip says other words must never read as "it says its label" (that is how a wrong-gender clip gets reused).
 */
async function readVerdicts(supabase, ids) {
  const uniq = [...new Set((ids || []).filter(Boolean).map(String))]
  const out = new Map()
  for (let i = 0; i < uniq.length; i += CHUNK) {
    const { data, error } = await supabase.from('clip_spoken_text').select('audio_id, spoken_text, audio_revision').in('audio_id', uniq.slice(i, i + CHUNK))
    if (error) throw new Error(`clip_spoken_text unreadable (${error.message}) — refusing to reuse a clip without knowing what it says`)
    for (const r of data || []) out.set(String(r.audio_id), r)
  }
  return out
}

/** Copies of `rows` carrying spoken_text where a current verdict exists. Pure given the map. */
function attachVerdicts(rows, verdicts) {
  return (rows || []).map(row => {
    if (!row) return row
    const v = verdicts.get(String(row.id))
    return verdictApplies(v, row) ? { ...row, spoken_text: v.spoken_text } : row
  })
}

async function withSpokenText(supabase, rows) {
  if (!rows || !rows.length) return rows || []
  return attachVerdicts(rows, await readVerdicts(supabase, rows.map(r => r && r.id)))
}

/** Rows of mixed lines, each to be linked under its OWN text (phase8's fill linker, the reuse planner): drop the ones that say other words. */
async function withoutMislabelled(supabase, rows) {
  return (await withSpokenText(supabase, rows)).filter(r => r && !saysOtherWords(r, r.text))
}

/**
 * The clip_spoken_text verdict a re-record should leave, or null. `explicitSpoken` is the caller's req.spokenText (before
 * any pronunciation override filled it in); `overrideSpoken` is spokenFor's form for the stored text, if any.
 */
function spokenVerdictFor({ text, explicitSpoken, overrideSpoken }) {
  if (!explicitSpoken) return null
  if (sameRecordedWords(String(explicitSpoken), String(text || ''))) return null
  if (overrideSpoken && sameRecordedWords(String(explicitSpoken), String(overrideSpoken))) return null
  return { spoken_text: String(explicitSpoken) }
}

module.exports = { saysOtherWords, wordsOf, verdictApplies, readVerdicts, attachVerdicts, withSpokenText, withoutMislabelled, spokenVerdictFor }
