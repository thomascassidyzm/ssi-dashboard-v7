# Your replacements are all still there. Two of the five slots stopped pointing at them.

**2026-08-08. Read-only. Row ids, S3 keys and timestamps throughout.**

---

## You are right on both counts

**Nothing was overwritten.** All five clips you made are alive on S3 at their original keys, with `audio_revision 1` and no entry in the revisions ledger — no bulk job touched their bytes. I checked every one.

**And the pointer is the problem.** For two of the five slots, the holder column no longer points at your row. Your clip is still there; the slot simply looks somewhere else now.

---

## 1. `ich will` — side by side

First, a fact that reframes this clip: **there is no manual replacement of the `ich will` target audio.** Searching every `course_audio` row in `deu_for_eng` whose normalised text is `ich will` returns exactly two rows — the January pair and the 6-August pair — and the service log records no `[Regen Lego]` or `[Regen Phrase]` for `S0001L01` at all. The only manual operation you have ever run on `S0001L01` is a **Presentation** regen, logged at **10:48:15Z today**, which produced `414cbd3b…`.

So `ich will` was never fixed by replacement. It was fixed by **moving the pointer** onto the older January row — and that is precisely the class of fix the pipeline re-derives away.

| | Row | S3 key | Voice | Created |
|---|---|---|---|---|
| **What the app played you** (telemetry, 10:11-10:19Z, dev *and* staging) | `823cf48a…` served as `823cf48a….v2` | `mastered/823CF48A-…-56C2BE1788C7.mp3` | `ara` | 2026-08-06 13:48 |
| **What the slot holds now** | `0f37d106…` | `mastered/1CD434B3-…-12BC5874EAAD.mp3` | `xai_ara` | 2026-01-29 |

Hear them:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/823CF48A-43BF-40C9-A5D2-56C2BE1788C7.mp3

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/1CD434B3-3935-4DCC-B5E6-12BC5874EAAD.mp3

## 2. The resolution path, and where it diverges

**The app**, for the intro and debut of a round, reads the LEGO holder column and nothing else:

`cycles.ts:462-466` (intro) and `:491-494` (debut) → `lego.target1_audio_id` / `target2_audio_id` → `/api/audio/<id>` → `course_audio.s3_key`. The `.vN` suffix is only a cache key (`audioAccess.ts:88-104`); it never changes which row is chosen.

**Popty** has three resolvers, and only the first uses that pointer:

1. `/api/production/audio/:uuid/stream` (`production-api.cjs:4238`) — takes an id, `no-store`, always current bytes.
2. `/api/production/:courseCode/audio/by-text` (`:4306`) — resolves by **`text_normalized` + role**, `.single()`, no `ORDER BY`. Never consults a pointer.
3. `/api/audio/random-sample/:courseCode/:role` (`orchestrator.cjs:8694`) — reads a legacy `course_manifest.json` off disk, not the database at all.

**The divergence is not in how either side turns an id into bytes — it is that the pipeline rewrites the id.** `audio-reuse-planner.cjs:863-874` re-derives the winner for each slot from `voice × text × language` alone; if the slot doesn't already point at that winner, `relinkHolders:1628-1642` moves it, consulting nothing about what was there. There is no ordering rule, no `created_at` preference and no version check involved — the pointer is simply recomputed from text.

## 3. Do Popty and the app disagree? Yes — for two slots, provably

Every manual regen you ran on German, from the service log, with the current holder beside it:

| Slot | Your row | Slot points at now | Verdict |
|---|---|---|---|
| `S0008L01` target2 | `6e01eb96…` text `"erklären…"` | `32035a8d…` (17 Jan row, re-rendered 03:0x today, rev 2) | **diverged** |
| `S0008L02` target2 | `0e252419…` / `8aa8cc0d…` text `"was ich meine…"` / `"was ich meine,"` | `9a8ccea8…` (17 Jan row, rev 2) | **diverged** |
| `S0008L02B02` target2 | `9d97e197…` text `"Ich will sagen, was ich meine"` | `9d97e197…` | **intact** |
| `S0008L02B03` target2 | `9d1046bb…` text `"Ich werde erklären, was ich meine"` | `9d1046bb…` | **intact** |
| `S0001L01` presentation | `414cbd3b…` (10:48:15Z today) | `414cbd3b…` | **intact** |

Confirmed live against production just now:

```
intro  S0008L01 'erklären' -> target2_id: 32035a8d-0337-422b-a25f-5e5139d992a5.v2
debut  S0008L01 'erklären' -> target2_id: 32035a8d-0337-422b-a25f-5e5139d992a5.v2
```

**Your replacement for `erklären`:**

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/19C1C0E3-2DBD-4FBD-9502-F3B1C593B8FA.mp3

**What the app plays instead:**

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/37BF44A9-8B8E-4243-B6E2-878D2713A450.mp3

**Your replacement for `was ich meine`:**

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/99B23A97-698C-4457-B40A-E27EB3F885E8.mp3

**What the app plays instead:**

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/4A965BC1-EC58-42DF-B1D8-22B553685388.mp3

## 4. Why two and not the other three — the field that decides it

The three that survived have **row text identical to the slot's `target_text`**. The two that diverged do not:

| Your row text | Slot's `target_text` | Match after normalisation? |
|---|---|---|
| `erklären…` | `erklären` | **no** |
| `was ich meine…` / `was ich meine,` | `was ich meine` | **no** |
| `Ich will sagen, was ich meine` | identical | yes |
| `Ich werde erklären, was ich meine` | identical | yes |

I ran the estate's own normaliser (`services/shared/text-normalize.cjs`) on these exact strings. It folds case and a trailing full stop; it does **not** fold a trailing `…`, `,` or `?`. So when the planner asked "which row says `erklären` in `xai_leo`?", your row — which says `erklären…` — was not in the answer set, a January row was, and the pointer moved to it.

**That is the whole rule, and it is the same one that moved `ich will`:** there the invisible text was the tombstone `ich will ::superseded-regen`; here it is an ellipsis you typed to coax a fuller pronunciation. The fix method and the erasure condition are the same fact — a row whose text isn't character-identical to `target_text` cannot hold a slot through a pipeline run.

## Still armed

Slots in rounds 1-200 whose current row is invisible to the planner, measured with the planner's own normaliser: **14 in `deu_for_eng`, 2 in `fra_for_eng`.** Two of the fourteen are the `ich will` pair; most of the rest are clips whose text carries a `?` the `target_text` does not.

---

# A SECOND, SEPARATE DEFECT — found on the way, and it is bigger than this clip

**Bytes have been replaced under row ids that the app caches for a year as immutable.** I measured this myself rather than take it on report.

Sample: 40 `deu_for_eng` rows at `audio_revision = 1`, created before August. For every one I HEAD'd the live S3 object and compared its `Last-Modified` to the row's `created_at`.

```
object Last-Modified by day: { "2026-08-03": 40 }
BARE-REF rows whose bytes moved after the row was written: 40 of 40
```

**40 of 40.** Rows written in February; objects rewritten on **3 August**; `audio_revision` still **1**; **zero** rows in `course_audio_revisions` for any of them.

Why that combination is the dangerous one: the app addresses a clip as a bare uuid whenever `audio_revision = 1`, and `/api/audio/<id>` is served `Cache-Control: public, max-age=31536000, immutable`. The `.vN` suffix — the only cache-buster that exists — fires **only when `audio_revision > 1`**. So for these rows the bytes changed and **no cache anywhere can be told**. Browser HTTP cache, Vercel edge, and the player's IndexedDB store (which keys on the bare id) all keep the pre-3-August audio indefinitely.

`0f37d106…` — the `ich will` clip now in the slot — is one of them. Its object's `Last-Modified` is 2026-08-03T19:19:05Z, its row says `duration_ms 768`, and the object really measures 744 ms. The row and the bytes disagree because the bytes were swapped underneath it.

**This is not the same thing as today's rebuild, and the contrast is the proof.** This morning's `reuse-first-rebuild` swapped bytes for 24,357 German clips *properly*: ledger entry, `audio_revision` bumped to 2, so every one of them is addressed as `.v2` and every cache drops it. An independent sample of 30 February rows that went through that path came back stamped today, all ledgered. **The designed path works. The 3-August writes bypassed it.**

**Nobody knows what wrote at 19:19Z on 3 August.** `revoice-clips.cjs`, `clipfix/swap.cjs` and `audio-repair-core.cjs` were all read and cleared — they mint new keys or ledger correctly. Popty keeps no log covering that window. **That hunt matters more than this clip does**, and it is not started.

One live consequence worth holding in mind: the telemetry entry at 10:43:35Z that served the correct `0f37d106…` recorded `cacheHit=true`. If a browser cached that id before 3 August, it is holding pre-3-August bytes and no amount of pointer-fixing will change what it plays.

## Gaps

- I have not established which Popty screen you were looking at when you saw the replacements present. If it was a phrase-level view, the two intact phrase slots would show correctly while the two diverged LEGO slots sat elsewhere on the page — but that is inference, not evidence, and you can settle it in a glance.
- The armed count covers `course_legos` for rounds 1-200 in deu and fra only; `course_practice_phrases` and rounds 201+ are not in it.
- I have not listened to any clip. Every claim is from rows, logs, telemetry and timestamps.

## Nothing touched

Read-only throughout: no re-render, no repair, no re-pointing since the 10:31Z move made under the earlier authorisation.
