# Two zzz test courses — which to keep

Read-only comparison. Nothing deleted. Recommendation: **keep `zzz_test2_for_eng`, delete `zzz_test_for_eng`.**

## The two courses

| | `zzz_test_for_eng` | `zzz_test2_for_eng` |
|---|---|---|
| **Title** | "[E2E TEST] Pod Recording Suite — safe to delete" | "[E2E TEST] Recordist by-language duplicate" |
| **Known → target** | eng → eng (no real target language) | eng → `zzz` (a placeholder target-language slot — structurally the "X for English speakers" shape) |
| **Seeds / LEGOs** | 1 seed ("Hello there, my friend"), 1 LEGO | 0 seeds, 0 LEGOs |
| **course_audio rows** | 18 | 21 |
| **What the audio actually is** | 6 rows from 2026-07-17, synthetic test voices (`human_e2e_pod_voice_a/b_zzz_test`) — an automated E2E test run, not Tom. Plus 12 rows of Tom's own voice (`human_tom_zzz`), spread 14–21 Aug, short café-dialogue lines. | 21 rows, all Tom's own voice (`human_tom_zzz`). One from 14 Aug; the other 20 are **tonight, 2026-09-02, 17:52–18:43** — a solid 51-minute booth session reading a full café-dialogue script ("A coffee, please" → "I would like to try the other one"). |
| **Real human recording on it** | Yes — 12 short Tom clips from mid-August, already superseded in practice by the fuller August/September work on the other course. | Yes — **tonight's session is the live one**: newest, longest, most complete take of the whole test script. This is the session referenced in the Catrin/booth report published tonight. |
| **`recording_provenance` rows** | 0 | 0 — gap noted below |
| **Most recent activity** | Content stamp 31 Aug (a metadata touch, not new recording); audio stamp 22 Aug. Nothing happened here tonight. | Content stamp and audio stamp both **tonight, 18:43** — this is the course Tom was actually recording into a few hours ago. |
| **Referenced by live code** | Yes: `e2e/pod-recording/seed-test-course.cjs` (the E2E pod-recording suite's own fixture seeder — **idempotently recreates this exact course row, including its one seed, every time the suite runs**), plus three tools/tests that just skip or exclude it by name (`tools/pods/recast-pod-english.cjs`, `tools/sweep-wrong-language-crosscourse.cjs`, `services/recording-upload-helpers.test.js`). None of these break if the row is deleted — the seeder will simply recreate it next run, and the others just reference the string as a fixture/skip-list entry. | Not referenced anywhere in code, in either repo — only in docs from tonight's investigations. |
| **Fitness for the booth plan** | Wrong shape (eng→eng) and stale; would need to become a real known/target pair before it's a sensible recording vehicle. | Right shape (eng→a target slot) but **empty of seed content** — 0 seeds, 0 LEGOs. Tonight's session recorded lines that exist only as loose `course_audio` rows, not tied to any seed. Before Tom can record against this properly it needs real seed sentences putting into it — the one-seed/zero-seed problem is real on both sides, this one is just honest about having none rather than one stale placeholder seed. |

## A gap, honestly

`recording_provenance` has zero rows for either course. The load-bearing recording metadata (mic, environment, consent) that the Catrin/Aran Welsh sessions carry does not exist for either zzz course. This isn't a reason to prefer one over the other — neither has it — but it means the two-week and tonight's Tom sessions on both courses are known only through `course_audio`'s own `voice_id`/`origin`/timestamp columns, not through the richer provenance table.

One more thing worth knowing, unrelated to the keep/delete call: tonight's separate audio-forensics pass found **13 of Tom's own clips across these two courses are quiet test fixtures that need re-recording regardless of which course survives** — 7 from tonight's dry-desktop take (usable, just a raised noise floor) and 6 from August (too quiet, would need real re-recording). That's a known, already-flagged cleanup item, not part of this decision.

## Recommendation

**Keep `zzz_test2_for_eng`. Delete `zzz_test_for_eng`.**

Reason: `zzz_test2_for_eng` is the course Tom was actually recording into tonight — it's the newest, most complete take of his booth-recording test, and its known/target shape (eng → a target slot) is structurally the "X for English speakers" vehicle he described wanting. `zzz_test_for_eng` is stale (last real recording mid-August), carries the wrong shape (eng→eng, no target language at all), and is explicitly self-regenerating E2E test scaffolding — its own seeder script recreates it from scratch every time the automated pod-recording suite runs, so nothing is lost by deleting the DB row; it'll be back, clean, the next time that suite runs.

What would change my mind: if the E2E pod-recording suite is relied on by CI right now and someone would be surprised by its fixture course briefly vanishing until the next run — but that's a non-issue, since the seeder is idempotent and re-creates it in seconds.

Before Tom can actually record against the survivor, it needs real seed sentences — right now it has none. That's the next step, not a blocker to the keep/delete call.

## Update, same evening: seed content populated

Tom's ruling: "We can use the canonical SEEDs as the English SEEDS - we are testing the process" — he doesn't need bespoke pedagogy for a process test, just real content.

Action taken (content only, no code, no audio): all 668 rows of the `canonical_seeds` table (the language-neutral English SSoT behind every real course build) were upserted into `zzz_test2_for_eng`'s `course_seeds`, `known_text` = `target_text` = the canonical `source_text` with its `{target}` placeholder resolved to "Zzz" (this course's own target-language code, capitalised as a stand-in proper noun — e.g. seed 1 reads "I want to speak Zzz with you now."). Nothing invented: every sentence is the same one used to open every real SSi course. `course_legos` was left untouched (0 rows) — decomposing into LEGOs is pedagogical work Tom explicitly said this test doesn't need; if the seed-recording flow turns out to require LEGO rows to drive, that's a separate, later step.

`zzz_test2_for_eng` now has 668 seeds, 0 LEGOs, and its earlier pod-dialogue content (`listening_pods`/`listening_pod_sentences`, tested successfully tonight) untouched alongside it.

## Update, same evening: loser deleted, Tom authorised it

Tom: "great stuff, do it" — the report-only hold is lifted, and his second ruling ("it does not matter about the recordings, we are just doing proof of concept") retired the provenance guard too. `zzz_test_for_eng` is now **deleted**: `courses`, `course_seeds` (1), `course_legos` (1), `course_audio` (18), `course_audio_revisions` (9), `listening_pods` (1), `listening_pod_sentences` (24). Nothing else referenced it. `zzz_test2_for_eng` survives, unchanged by the deletion, with its 668 canonical seeds already wired in from the earlier step.

## Taste-safe default applied

Both courses carry some of Tom's own real recordings, so per standing default I did not recommend outright destructive deletion of a course with human takes on it without flagging it — but here the takes on the course marked for deletion (`zzz_test_for_eng`) are the stale mid-August set, already superseded by fuller and more recent work elsewhere, and the course itself is a self-regenerating test fixture. If Tom wants those 12 August clips preserved for any reason, they should be exported/archived before deletion; otherwise this is a clean keep/delete call, not a genuine judgement-fork.
