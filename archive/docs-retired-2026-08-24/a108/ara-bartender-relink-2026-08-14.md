# A-108 item 1 — the Arabic bartender line was never a render

Tom's ruling, 2026-08-14: *"fix the ara_for_eng bartender line collision — the pod text was
corrected but the render collides with an existing clip on the same voice/role because of a
unique index. This needs a RELINK, not a re-render."*

Done. **Zero TTS, zero cost, no clip deleted.**

## What the collision actually was

A-108 resolved the bartender's greeting from the annotated form to a single feminine one —
second-person slash, so it agrees with the addressee, who is Customer 1, cast **Ara (f)**
(`docs/a108/released-text-resolution.md` §B):

| Row | Speaker | Was | Now |
|---|---|---|---|
| `ara_for_eng:pod-0:SC08-S001` | Bartender | `مساء الخير. عايز/عايزة إيه؟` | `مساء الخير. عايزة إيه؟` |

That resolved string **already existed on this course as a rendered clip**. `d3af89ab` is
the Barista (3 pm) greeting at `SC03-S001` — identical words, same language, same role
(`target1`), same voice (Khalid, `70013edeb8e8`), rendered in the same batch on 2026-06-10.

`course_audio` carries a unique constraint on exactly that tuple:

```
unique_course_audio_per_voice (course_code, text_normalized, language, role, voice_id)
```

So a re-render of the bartender line could not have inserted at all — it would have hit the
index and failed. **Dedup on that key is not an obstacle here, it is the point:** one clip
serving both rows is the state the index exists to produce. The two rows say the same words
in the same voice, so they are the same clip.

## What was done

`tools/pods/ara-bartender-relink-2026-08-14.cjs`, DRY_RUN-gated, per-row before-state
assertions that abort on drift, idempotent.

`SC08-S001.target_audio_id`: `a2679471` → `d3af89ab`. Then `courses.audio_stamp` bumped for
`ara_for_eng` so learners fetch the new link.

Make-before-break (`AUDIO_PIPELINE_ARCHITECTURE.md` §6b) applies even though nothing was
generated — the asset being linked to was verified alive and correct **before** the swap,
and asserted again inside the write:

- **alive** — HTTP 200 on the served bytes, 33,696 bytes, 2.76 s;
- **same voice, same role, same language** as the clip it replaces, asserted, not assumed;
- **speaks the resolved words** — unprimed whisper decode (ggml-small, `ar`), 2026-08-14:

| Clip | Decode | Reading |
|---|---|---|
| `d3af89ab` (linked to) | `مساء الخير عيزة ايه` | one feminine form — correct |
| `a2679471` (superseded) | `مساء الخير عايز عايزة ايه` | **both** forms read aloud — the defect |

That decode is the whole justification for the relink: the incumbent clip really does say
the slash out loud, and the clip now linked really does say only the feminine form.

**The old clip was not deleted.** It is unreferenced — nothing else in
`listening_pod_sentences` points at it, verified after the write — but deleting a generated
asset needs its own plan and approval, so it stays.

## One honest note on the tooling

The first run of the script reported "all before-state assertions passed" **having asserted
nothing**. Its psql helper joined columns with an empty separator and then split each row on
the empty string, i.e. into single characters, so every assertion compared one character
against a full value and trivially passed. The relink itself still landed correctly — the
`UPDATE` carried its own before-state in the `WHERE` clause, which is what actually protected
it — but the script then aborted on its own miscounted result before bumping `audio_stamp`.

The helper is fixed, the script is idempotent, and the second run re-asserted every
condition genuinely and completed the stamp. Recording it because a gated script whose gate
is a no-op is worse than no gate: it reports a safety it never checked.

## What was deliberately left alone

- **`SC07-S001`, the Barista's morning greeting.** Text is corrected to
  `صباح الخير. عايزة إيه؟`, but its clip `42702c3e` still decodes as
  `صباح الخير عيز عيزة ايه` — both forms — and **no existing clip carries the corrected
  morning text**, so there is nothing to relink it to. It is a genuine render, and it stays
  inside the 39-clip job that needs Tom's `--i-have-listened` attestation. Untouched.
- **The accept step for the 39 clips.** Not run. That flag was not typed.
- **`ara_sy` Learner gender.** Untouched, exactly as today's sweep left it.

## Verification

```
ara_for_eng:pod-0:SC08-S001 | d3af89ab-73ee-4d2e-8a5b-89fb8b8dbb8f | مساء الخير. عايزة إيه؟ | draft=f
courses.audio_stamp(ara_for_eng) = 2026-08-14 17:13:35
references still pointing at a2679471: none
```

Row text and clip text now agree, so the "render reads `course_audio.text`, not the pod row"
trap flagged on the done card does not apply to this row — there is no stale text left to
re-render from.

Logs: `docs/a108/ara-bartender-relink-{dryrun,applied}-log.json`.
