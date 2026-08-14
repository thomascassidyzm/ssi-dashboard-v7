# A-108 — execution spec for the 39 released clips

Tom approved this on 2026-08-14, sequenced on #538's transcription:

- If the clips already speak the correct single form (TTS silently dropped the slash)
  → **text-only fix, zero rendering.**
- Otherwise → **re-render all 39 to the resolved gendered form**, make-before-break:
  generate, verify each clip, swap links, then delete. Pennies, pre-approved.

End state either way: **text and audio agree, no slash forms anywhere.**

## Which rows

79 rows carry an annotation; all are `target_text_draft = false`. 75 sit behind **39
distinct clips** (`pod-0` and `pod-0-unrecorded` duplicate pods share clips — fix every
row, but render each clip once). 4 rows in `spa_for_eng` have no audio at all.

| Course | Rows | Clips | Status |
|---|---|---|---|
| pol_for_eng | 49 | 25 | beta, public |
| lav_for_eng | 12 | 6 | beta, public |
| por_for_eng | 12 | 6 | **released / live** |
| ara_for_eng | 2 | 2 | beta |
| spa_for_eng | 4 | 0 | released / live — text-only, no audio exists |

## How to resolve each slash — the rule that decides it

**A slash agrees with whoever it describes. Determine that first, then take that
person's gender from the cast.**

1. **Self-reference → the SPEAKER's gender.**
   `Jestem bardzo wdzięczny/wdzięczna` (I'm grateful), `Estou impressionado/a`,
   `Esmu pārsteigts(-a)`, `powinnam/powinienem` (should I).
2. **Second-person reference → the ADDRESSEE's gender.**
   `Pan/Pani` (polite you), `był Pan/była Pani` (you were), `pomocny/pomocna` (helpful,
   describing the addressee), `percebê-lo/a` (understand you), `gatavs(-a)` (you're ready),
   `عايز/عايزة` (what do *you* want).
3. A single line often needs BOTH — resolve each slash independently.
   `Dziękuję, był Pan/była Pani bardzo pomocny/pomocna. Jestem bardzo wdzięczny/wdzięczna.`
   → addressee for the first two, speaker for the last.

The addressee is the other participant in that scene. `docs/a108/speaker-gender-map.txt`
gives the resolved gender for every speaker role in all five courses.

## Resolving gender from the cast

`listening_pods.speakers[role].gender` is authoritative **when it is `m` or `f`**. When it
is `'n'`, it is stale — fall back to the **target voice**, which is what Tom's rule keys on
("the voice saying the line"). Voice genders were settled empirically across the estate's
gendered cast entries.

**Two cast conflicts** — role declared `f` but cast with a male voice:

- `ara_for_eng` **Barista** — declared `f`, voice **Khalid** (male in 18 of 22 castings).
- `por_for_eng` **Barista** — declared `f`, voice **Sal** (male elsewhere).

Only the Arabic one touches an annotated clip. **Do not guess it.** The voice is what the
learner hears, so the voice should win — but flag it rather than silently deciding, and
note that the Arabic line's slash is second-person anyway, so it turns on the customer.

**One genuinely ambiguous line.** `ara_for_eng` Barista/Bartender say `عايز/عايزة إيه؟`
to a scene containing Customer 1 (`Ara`, f), Customer 2 (`Eve`, f) and Customer 3
(`Tariq`, m). Resolve by **who actually replies next in the dialogue**, not by picking one.
If that does not disambiguate, report it as a gap.

## Constraints

- **Never delete a clip before its replacement is generated and verified alive and
  correct-voiced.** Make-before-break is absolute (`AUDIO_PIPELINE_ARCHITECTURE.md` §6b).
- Re-render **only** these clips. No other audio, no other course.
- Keep `target_text_draft = false` on these rows — they are released text, not drafts.
- Bump `courses.audio_stamp` after relinking so learners fetch the new bytes.
- Verify on the **served bytes**, not the DB row.
- Log every row and every clip to `docs/a108/released-clip-fix-applied-log.json`.
- `spa_for_eng`'s 4 rows are stage directions (`(a Ana)`, `(tras el escáner)`), present in
  both known and target text, with no audio. Under rule 1 they are annotations: **strip
  them from both sides.** No render needed.
