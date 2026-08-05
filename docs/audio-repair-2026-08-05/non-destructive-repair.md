# Audio repair, rebuilt: preview → accept → replace

**2026-08-05.** Tom's ruling, after finding the live deu_for_eng course clipping badly:

> I'm confused to why there is no replace function for introductions, or why the process deletes first and then regenerates … repair should allow preview/accept/replace — something like that if we're making a professional level tool.

This is what got built, and what was proved.

---

## The one idea: same id, new bytes

Every repair tool in the estate minted a **new** `course_audio` id. It had to: the unique index `unique_course_audio_per_voice` will not hold two rows with the same text, language, role and voice, so a replacement forced a delete of the old row.

And `lego_introductions.presentation_audio_id` is **ON DELETE CASCADE**. So for an introduction, the delete took the authored script with it — "The German for: X, as in — Y, is:". That single fact is why introductions had no repair path at all, and why `repair-silent-clips.cjs` hard-refuses to touch them.

The new core never creates a row and never deletes one. Accept **updates the existing row** to point at a new S3 object.

- No CASCADE can fire, because nothing is deleted.
- No foreign key moves, so there is nothing to orphan and no link capture/restore dance.
- The unique index is untouched, because the text never changes — so the tombstone hack the old tool needed is simply unnecessary. Verified: exactly one row exists for the clip at every moment.
- **Introductions repair by the same code path as everything else.** That was the point.

## What same-id costs, and how it is paid

The learning app serves audio as `Cache-Control: public, max-age=31536000, immutable` and caches blobs offline keyed by audio id. Fresh bytes under an unchanged URL would never reach a device that already played the damaged clip — it holds those bytes for a year.

So `course_audio.audio_revision` was added, bumped on every accepted swap, and the served URL becomes `/api/audio/<id>?v=<rev>`. **The id does not change; the URL does.** Immutable caching — the thing that makes the app fast — survives intact.

The learner half of that lives in the other repo and is on its own branch, not merged and not deployed. **Until it ships, a device that already cached a damaged clip may still hear it.** The database side is same-id and correct today; the client invalidation is the outstanding piece.

## Nothing here deletes anything

The superseded S3 object stays in the bucket. `course_audio_revisions` records what it was, what replaced it, who accepted it, when, and why. Which makes **revert** a data-only operation: no render, no spend, no approval needed. History is only real if you can get the old clip back.

A revert goes *forward* in revision number, never backwards. The number's only job is to invalidate caches, and a device holding the bad bytes at revision 2 must not be told it is fine at revision 1.

## Machines flag, humans pass

No automated check in this flow passes audio on its own authority.

`propose` refuses to hand a person a candidate that is silent, too short, or missing words — but that is a **floor, not a pass**. Only `accept`, pressed by someone who has heard both clips, puts bytes on the learner path. The queue detector is an *ordering*, and it ships with its precision attached every time it is surfaced. That precision is currently **unmeasured against human-labelled ground truth, and it says so** — the tail-defect detector it replaces measured ~9% precision by ear.

## Proved live, without spending a penny

Run against the real database and the real bucket, on **deu_for_eng S0463L02** — a genuine `role='presentation'` clip with a genuine `lego_introductions` row pointing at it. The exact case that had no repair path before.

No TTS was bought: the candidate was the clip's *own current bytes* put back through the mastering chain, which measured effectively idempotent (5352 ms → 5328 ms, identical byte length).

| Claim | Result |
|---|---|
| id stable across the swap | ✅ |
| `lego_introductions` row survived, same row id | ✅ |
| intro still points at the same id | ✅ |
| link census unchanged (all six holder tables) | ✅ |
| text, voice, language unchanged | ✅ |
| rows for this clip, throughout | **1** — no tombstone ever needed |
| superseded object still in the bucket | ✅ |
| denormalised intro duration re-synced | 5352 → 5328 → 5352 |
| propose left the row untouched | ✅ |

The probe **ended by reverting**, so the clip is once again serving byte-identical content to what learners heard before it ran. Revision moved 1 → 2 → 3.

## The seam for the approval gate

The gate — "no course reaches learners without a human pass" — is a separate commission. It needs two things from this half, and both already exist as data rather than as new API surface:

1. **What is still suspect** — the repair queue, ordered, with the detector's precision attached so an ordering can never be mistaken for a pass.
2. **What a human actually passed** — `course_audio_revisions`, which names the person, the reason and the moment. One join answers "has every flagged clip in this course been cleared by ears?"

The gate should **not** call accept on anyone's behalf. Accept *is* the human pass; a gate that could grant it would be the thing it exists to prevent.

## Four defaults chosen, each cheap to overrule

- **Revision column** — `course_audio.audio_revision`, integer, default 1; the version travels in the **query string** (`?v=`), not the path, so the learner-side route needs no new pattern and stays backward compatible when the revision is absent.
- **History** — a new table, `course_audio_revisions`, not extra columns on `course_audio`: a clip can be superseded many times and columns can only hold the last one.
- **UI** — a sibling component rather than more code inside `MissingAudio.vue`, which is already 730 lines and was being edited concurrently.
- **Uploads** — mp3, m4a, wav, aac, ogg, opus, flac, webm. Everything goes through the same mastering chain as a render anyway, so accepting what ffmpeg reads is simpler than policing a shortlist. An accepted upload becomes `origin='human'`, so the precious-audio guard protects it from a later TTS pass.

## One brief claim that was wrong

The commission said the learner-side URL builder emits `https://saysomethingin.app/api/audio/<id>`. It emits a **relative** `/api/audio/<id>`, in three places. And the storage column is `s3_key`, not `storage_path`. Both proceeded on what the code says.
