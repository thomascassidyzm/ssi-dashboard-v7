# The one-way door is closed, and it was closed on the live site

**Verdict: Deborah can back out, and it is safe to point her at the editor now.**
26 checks passed, 0 failed, all in a real browser against the deployed popty.app
and the live watson-1 backend. The row this run edited was restored **through
the same button she will use** — no SQL was touched to put anything back, which
is the whole point of the job.

**[See it in three frames](https://watson-1.tail4968cb.ts.net/evidence/mapping-revert-2026-08-12/index.html)**

## What was wrong

Job #392 found it. The save gate refused an empty segment list, so the first tap
on any row marked it as hand-segmented for good. A row nobody had ever cut could
never be returned to that state through the UI or the API — even by someone who
immediately changed their mind. #392's own restore had to be finished with a
direct database write.

## What changed

One tap, at the end of the opened mapping strip, reading **back to the original**.
It only shows on a row someone has actually cut, and only to someone who may
edit. It puts the row back to the mapping the generator derives — target word
order preserved, literal gloss underneath — and the row's stored segmentation
goes genuinely empty, not a saved copy of the derived shape.

It writes one column and nothing else. No text, no decomposition, no components,
no audio, no phrase. It cannot reach a re-translation or a TTS render.

## The checks

Driven on `https://popty.app`, backend `watson-1`, course `eus_for_eng`, row
`eus_for_eng:S0001L03B01` (`euskaraz hitz egin` — "to speak Basque").

| | Check | Result |
|---|---|---|
| 1 | The mapping glyph is on the live page | 253 of 283 rows |
| 2 | Rows with nothing to align show no glyph | 30 rows correctly have none |
| 3 | The row does not get deeper when the mapping opens | 52.0px → 52.0px |
| 4 | No other row moves or resizes when it opens | 283 measured, 0 moved, 0 resized |
| 5 | One cell per target word | 3 words |
| 6 | The target line is on top, the literal gloss beneath | confirmed |
| 7 | The columns are a real target sentence, in target order | `euskaraz hitz egin` |
| 7b | The row was identified for an exact restore | never hand-cut before this run |
| 7c | A row nobody has cut offers no way back | confirmed |
| 8 | Tapping inside a chunk splits it | 2 → 3 chunks |
| 9 | The split saves against the live API and says so | "Saved" |
| 10 | Nudging never moves a target word | confirmed |
| 11 | Nudging moves a gloss word across the break | `basque`,`to`,`speak` → `basque to`,`·`,`speak` |
| 12 | The new cut survives a full reload of the live site | confirmed |
| 13 | Merging returns the row to its original chunk count | 2 chunks |
| 15 | A row someone has cut offers a way back, in plain words | "back to the original" |
| 16 | The revert saves against the live API and says so | "Back to the original" |
| 17 | The way back disappears once the row is back | confirmed |
| 18 | **Reverting costs no row height and moves nothing** | 283 measured, 0 moved, 0 resized; 52.0px → 52.0px |
| 19 | After a full reload the row reads as the original again | `basque`, `to speak` |
| 20 | And it is served as a row nobody has cut, not a stored copy | confirmed |
| 21 | **The restore needed no SQL** — the revert IS the restore | confirmed |
| 22 | The existing row controls are all still there | 263 pencils, 283 plays, 20 rounds |
| 6a | A non-editor cannot even reach the script viewer | redirected to `/record` |
| 6e | A non-editor's revert is refused by the API | `403 You need editor access to change a word mapping.` |
| 6f | That refusal is real JSON from the live route, not SPA HTML | `application/json` |
| — | Unit tests | 67 passed (6 new for the revert predicate) |

## The numbers that matter

**The course ends exactly where it started.** Hand-segmented rows in
`eus_for_eng`: **0 phrases and 0 legos before, 0 phrases and 0 legos after**, on
both tables.

**The reverted row is genuinely empty in the database** — `NULL`, not an empty
list and not a stored copy of the derived cut. Read straight back from the
production database after the run.

**Nothing else on that row moved.** Its known text, its target text, its two
decomposition blocks and all three audio clips are exactly as they were; the
gloss the page now derives from that decomposition reads `basque` / `to speak`,
which is what it read before anyone touched it.

**Both halves are deployed.** The chunk popty.app serves contains the new
control by name, and the page's own build stamp reads `19459dba` — the exact
commit. The backend was restarted at 12:59 UTC from a checkout at that commit,
and the route answers real JSON, including its 403, rather than SPA HTML.

## Choices made where the brief left a gap

- **Wording:** the control reads **back to the original**. Not "revert", and no
  word from the engineering vocabulary — Deborah never sees "derived",
  "segments" or a column name.
- **Placement:** inside the opened strip, at the end of the chunk row. The
  closed row gains nothing at all, and the strip's height is fixed, so it costs
  no pixels in either state. Measured both ways above.
- **No confirmation dialog.** One tap reverts. It loses a few taps of work and
  is instantly redoable by cutting again, and a confirm box is exactly the
  friction that was not wanted.
- **On the wire:** the client sends `segments: null`. The API accepts an empty
  list as well, and stores empty either way.

## Worth knowing

There is no role in Popty today that can *see* the script viewer but not *edit*
a mapping. The dashboard roles are recorder, editor and admin; editor and admin
may edit mappings, and a recorder is redirected away from the script viewer
entirely before any mapping is on screen. So the "reader sees the mapping but no
button" case was checked at the layer where it exists — the server refuses a
non-editor's revert with the same 403 as before, verified live with a real
downgraded session. The seeded test account was put back to admin immediately.

The bare `hitz bat` LEGO row Deborah originally reported still shows no mapping
glyph, and that is still correct: it is an A-LEGO with no components, so there
is nothing faithful to derive. The rows underneath it are the ones to tap. Left
exactly as it was.
