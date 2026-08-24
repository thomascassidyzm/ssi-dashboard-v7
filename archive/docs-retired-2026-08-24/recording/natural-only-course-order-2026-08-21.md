# Natural pace only, in course order

**For:** Kai · **Date:** 2026-08-21 · **Link:** `popty.app/record/deu_at_for_eng?order=course`

---

## What changed

`?order=course` already read the script's 496 selected lines in course sequence instead of coverage
sequence. It now also reads each of them **once**, at natural speed. The slow pass is gone from that
mode entirely — record the line, move to the next line, no amber screen in between.

For Austrian German, against the live database today:

| | items to read | estimated booth time |
|---|---|---|
| default (coverage order, two passes) | 960 | ~96 min |
| `?order=course` (natural only) | **480** | **~48 min** |

Same 480 lines either way — verified line-for-line, not inferred. Nothing was dropped from the
script; the second reading of each line was.

**Nothing else moved.** Without `?order=course` the recorder behaves exactly as it did yesterday:
natural then slow, every line. Only the exact word `course` turns any of this on, so every link
anyone already holds is unaffected.

## The trade — please read this bit

The takes are real, filed takes. A natural take is filed at upload as a `course_audio` row
(`services/script-take-filing.cjs`), and it is the cadence that was already being filed — the slow
read never became a clip of its own. So nothing recorded this weekend is orphaned or malformed, and
nothing about the upload, provenance or review path changes.

What a natural-only line **cannot** do is get **chunked**.

- Alignment runs on the slow take. `services/voice-engine/align.cjs` (`alignTakePair`) uses the slow
  read as the authoritative chunk map, then cuts the chunks out of the natural take. No slow take →
  no chunk map.
- `services/voice-engine/synthesis-job.cjs:241` handles this gracefully rather than failing: the line
  is logged as `no slow take uploaded — cannot align without pause boundaries` and skipped for
  alignment. No crash, no bad data.
- The natural take is still used **whole** wherever a course item matches its text — and a whole
  natural take always beats a splice anyway (`synthesis-job.cjs:303`). For the 480 script lines
  themselves, that is the path they were going to take.
- What is lost is the line's ability to **donate chunks to other phrases**. Until someone supplies
  alignment another way — a later slow read, or a different boundary source — these lines contribute
  their own audio and nothing beyond it.

That is the informed trade you asked for, stated plainly. It is reversible: reading those lines slow
later fills the gap without re-recording the natural takes.

## Where it lives

- `services/recording-script-items.cjs` — the reading list, now a tested pure function rather than an
  inline loop in the API. It owns the one decision: how many times each line is read.
- `services/production-api.cjs` — the `recording-script` endpoint calls it and reports
  `naturalOnly` in its response.
- `src/components/production/autocue/AutocueStudio.vue` — the confirmation panel no longer promises
  "amber text for slow reading" in a session that has none.
- `src/views/RecordRoom.vue` — the room forwards `order` when it prices the session, so its
  "about N minutes" matches the run the recordist is about to do.
- Tests: `services/recording-script-items.test.cjs`, `src/composables/autocue-natural-only.test.js`
  (20 tests green with the existing course-order suites).
