# Known-language clip resolution: when we replace a clip, does the learner hear the new one?

**Read-only trace, 2026-08-06. Nothing was changed.** Live DB via psql, live `player_events`,
cross-repo code read.

---

## The one-sentence answer

**No — in German, 41 known-side slots still resolve to the OLD superseded take, Tom demonstrably
played four of them live including the exact phrase he named ("as often as possible"), and no
replacement exists to relink to — but this is *not* what is happening in French, and fixing the
shared clips centrally would NOT heal French, because French and German do not share a single one of
these files.**

Tom is right about the design and right about the fix strategy for shared clips. The two symptoms he
heard are, on the evidence, **two different faults that look identical from the headphones**. That
distinction is worth having before anyone spends a fifth attempt.

---

## First: Tom's model of the system is correct

The reframe said known-language clips are deliberately shared and deduplicated across courses. That
is exactly what the database does, and the previous version of this report missed it. Measured live:

| | |
|---|---|
| `course_audio` rows | **2,545,090** |
| distinct courses | 133 |
| distinct `s3_key` values | 2,348,428 |
| **files shared by >1 `course_audio` row** | **81,686** |
| of those, **spanning multiple courses** | **81,581** |
| **max courses on a single file** | **39** |
| English-only: shared files / rows on them | **67,292 / 243,547** |

**It is not a central table.** Each course has its own `course_audio` row with its own uuid; the
sharing is at the **file** level — many per-course rows pointing at one `s3_key`, keyed effectively
by (text, voice). That distinction matters enormously for the fix and is the reason this needed
tracing rather than assuming.

Worked example — "as often as possible" has **108 `course_audio` rows** across the estate,
deduplicated onto a handful of files by voice:

```
mastered/293CEE0F-E8A5-449C-B843-A3439118420A.mp3  azure_en-GB-SoniaNeural  ~25 courses
mastered/A259EC47-F7D9-497D-B316-86E2F18F47D3.mp3  gfzdpspr5fdp             ~8 courses
mastered/E0A476B6-4A3F-4854-A7AD-AB8700EEAFEC.mp3  xai_eve                  fra_for_eng + kor_for_eng
mastered/413E7424-F4D5-4176-89A5-D6980B920CAE.mp3  eve                      deu_for_eng  <-- ::superseded-regen
```

So one regeneration at `293CEE0F` heals twenty-five courses at once. Tom's instinct — fix it
centrally — is correct **for the shared files**, and the numbers make the case better than the
theory did: 67,292 shared English files is a very large amount of leverage.

`fra_for_eng` and `deu_for_eng` do share 106 audio files with each other. Just not these ones.

---

## Calibration, before any number

The estate's rule: calibrate the detector against Tom's own live plays first. Two calibrations ran.

**Calibration 1 — his live German session** (`deu_for_eng`, user `81987d60…`, dev, 18:13:06Z –
18:43:17Z, 143 plays, 67 known-side, 31 distinct known-side audio ids). Every id resolved against
`course_audio`:

```
plays_on_superseded_rows | total_distinct_known_clips
                       4 |                        18

4b3fb29d-20aa-492e-9547-ac2d8d1d481e rev=1 eve "as often as possible ::superseded-regen"
     s3=mastered/413E7424-F4D5-4176-89A5-D6980B920CAE.mp3  created 2026-02-16
d03382e8-9691-4229-b70b-8db693c46ed6 rev=1 eve "The German for: 'I'm trying to', is: ::superseded…"
e95a12ee-1295-43ad-a67b-3f095260856c rev=1 eve "The German for: 'to learn German', as in — …::superseded…"
7d7da0ef-faa1-44f5-9a8c-5a9c8c3462a7 rev=1 eve "The German for: 'to learn', as in — …::superseded…"
```

**Tom played the superseded take of "as often as possible" live, and that is the exact phrase he
named.** His testimony and the database agree precisely.

The other 13 of the 31 ids did not resolve — because they are **versioned URLs**:

```
f2b64431-46fb-401d-b2a9-cab278f05ea9.v2
c8b02ff5-27c9-48b6-959d-35f137222957.v3
… 13 in total, all .v2 / .v3
```

That is commit `6c68d9bf`'s rule confirmed live and from the other direction: 13 of his German
known-side clips are revision ≥2 and carry a cache-busting `.vN` URL; **18 are revision 1 and carry
a bare uuid that has been the same cache key for months** — and 4 of those 18 are the superseded
takes.

**Calibration 2 — his live French session**: all 49 known-side clips resolve to `fra_for_eng`-owned
rows, **zero** carry the `::superseded` marker, and all are `xai_eve` created 2026-08-03. French's
known-side audio is fresh.

---

## Deliverable 1 — the exact shared rows, and where the shadowing is

The marker is not a `status` column (`course_audio` has none). Per commit `f1fd9bc0` the marker is
literal text: rows whose `text` ends `'::superseded-regen'`. Estate-wide there are **108 such rows,
all in `deu_for_eng`** — 55 German, 53 English.

Live content slots still pointing at one of them:

| slot | count |
|---|---|
| `course_practice_phrases.known_audio_id` | **33** |
| `course_legos.known_audio_id` | **5** |
| `course_seeds.known_audio_id` | **3** |
| `course_legos.presentation_audio_id` | **12** |
| `course_seeds.target1/target2` | 2 / 2 |
| `phrase.target1` / `phrase.target2` / `lego.target1` / `lego.target2` | **0 / 0 / 0 / 0** |

**That zero row is the finding.** Commits `98b45908` and `f1fd9bc0` swept `target1`/`target2` and
did their job — the target side is clean. **Neither commit touched `known_audio_id`.** `f1fd9bc0`'s
own message says so: *"61 holder slots (course_practice_phrases target1/target2 and course_legos
target1/target2)"*. The known side was never in scope, so **41 known-side slots plus 16 others — 57
live slots — are still serving superseded takes.**

A sample, with the prompt the learner sees and the row it actually resolves to:

```
deu_for_eng:S0003L01B01  "As often as possible"    -> "as often as possible ::superseded-regen"      rev 1
deu_for_eng:S0002L02B01  "I'm trying to"           -> "I'm trying to ::superseded-regen"             rev 1
deu_for_eng:S0002L03B01  "To learn German"         -> "to learn German ::superseded-regen"           rev 1
deu_for_eng:S0003L02B01  "How to speak"            -> "how to speak ::superseded-regen"              rev 2
deu_for_eng:S0004L04B01  "How to say something…"   -> "how to say something in German ::superseded…" rev 2
deu_for_eng:S0005L02B01  "I'm going to"            -> "I'm going to ::superseded-regen"              rev 2
```

### The part that changes the fix

```
shadowed_slots_with_a_clean_replacement_available
                                                0
```

On the **target** side the sweep worked because verified 2026-08-06 replacements were sitting
generated and unlinked — there was something to relink *to*. On the **known** side there is **not a
single clean replacement**. The superseded row is the only row for that text in that course.

**So the known-side German defect cannot be fixed by relinking at all. It needs regeneration.** Any
attempt to repeat the `f1fd9bc0` relink recipe on the known side will find nothing to point at and
will do nothing. That is worth knowing before attempt number five.

---

## Deliverable 2 — resolution precedence

There is no course-local-versus-central precedence to resolve, because **there is no central row to
lose to**. The chain is:

```
course_practice_phrases.known_audio_id (uuid)
   -> course_audio row  (per-course, own uuid, own revision)
      -> s3_key         (MAY be shared with up to 38 other courses)
         -> bytes
```

Serving is **by stored uuid, not by text**. No cross-course lookup happens at serve time — a course
can only resolve to its own row. Two consequences, both confirmed against Tom's plays:

- A per-course fix **is** structurally capable of working, contrary to the theory in the reframe —
  provided it repoints `known_audio_id`, which the German sweeps never did.
- Sharing bites at the **file** level instead: rewriting bytes at a shared `s3_key` changes every
  course on that file at once, and **no revision bumps**, so no cache invalidates anywhere.

Measured: **0 shared English files where the courses disagree on `audio_revision`.** Nobody has
forked a shared file per-course yet, which means the in-place-rewrite hazard is live and untriggered
rather than already survived.

The `.vN` cache-key rule is confirmed live from the play events (13 versioned, 18 bare-uuid). A
worker is tracing the serve route and the device cache layer in `ssi-learning-app` to pin the exact
lines; **that trace had not returned when this was written and is an open gap.**

---

## Deliverable 3 — where the regen wrote vs where serving reads

For the **German known side**: the regeneration renamed the *old* row's text to
`…::superseded-regen` and **never created a replacement**, while `known_audio_id` kept pointing at
that same now-marked row. So the write and the read are the same row — the regen marked it as dead
and then served it anyway. Two rows and two URLs cannot be shown for these, because **the second
row does not exist**. That absence is itself the evidence.

For the **target side**: replacements were created and left unlinked; `f1fd9bc0` fixed that. Done.

For **French**: no superseded rows, no shadowing, fresh `xai_eve` audio. Nothing to fix here.

---

## One bug or two? — Two. Said plainly, with the evidence.

The highest-value sentence in this report, per the brief. The honest answer is not the unified one,
and here is precisely why:

**Against unification:**
- The 53 superseded **English** files in `deu_for_eng` are shared with **0** other courses.
- `fra_for_eng` has **0** superseded rows of any kind.
- French's clips are `xai_eve`, created 2026-08-03; German's are older takes on a different voice,
  hence different files.
- So the German staleness has no path to reach French. Sharing is not the transmission mechanism
  here, because these particular files are not shared.

**What Tom heard, and why both readings are true:**
- In **German** he heard genuinely old takes — 4 of 18 known-side clips are superseded rows.
  Real defect, unfixed, quantified above.
- In **French** he heard the *same English sentence repeated 3–4 times in ten minutes* — 40% of his
  known-side audio was a repeat. That is the script generator replaying one phrase, traced in
  `docs/audio/fra-known-side-duplicate-clips-2026-08-06.md`. The clips are correct and fresh.

Both are "I keep hearing the same wrong-sounding English." They are not the same fault.

**What survives from Tom's unified theory, and it is the important part:** the shared-file
architecture is real, it is large (67,292 English files, up to 39 courses each), and it means the
*fix location* for anything on a shared file must be central. That is correct and it is now
measured rather than assumed.

### Resolving the tension with worker 17288e82 — without doubting anyone

17288e82 measured Tom's 25 German clips on the bytes, found one loudness cluster, found not one
truncated file, and concluded the bad bytes are stale copies on his device. **Nothing in that is
wrong, and this trace does not contradict it.**

What it did not test is the layer that matters here. It asked *"is the file this row names
complete?"* — and the answer is yes, for every row. It did not ask *"is this row the take we meant
to serve?"* — and for four of Tom's known-side clips the answer is **no: it is the superseded one.**

A superseded take is a complete, well-formed, correctly-mastered mp3. It measures perfectly. It is
simply the wrong generation. So *"every row I read names a complete file"* and *"Tom hears an old
clip"* are **both true at once**, with no contradiction and no one mistaken. That is the layer
nobody had measured, and measuring it is what closes the gap.

The two explanations are also not exclusive, and the evidence says both are running:
- **18** of Tom's German known-side clips are revision 1 → bare-uuid URL → device cache can serve
  arbitrarily old bytes (17288e82's mechanism, live).
- **4** of those 18 are *also* pointing at superseded rows → even a cold cache would serve the old
  take (this trace's mechanism, live).

Fixing only the cache would leave those 4 wrong. Fixing only the links would leave the other 14
cached. **Both need doing.**

---

## Fix plan — NOT executed on this pass

In order, make-before-break throughout (generate → verify alive and correct-voiced → swap links
atomically → only then touch the old clip):

1. **Regenerate the 41 German known-side slots.** These have no replacement to relink to, so this is
   a generation job, not a link job — and generation costs money, so it needs Tom's explicit
   approval and goes through the audio-pass queue, not a direct TTS run. Scope: 33 phrase + 5 lego +
   3 seed `known_audio_id`, plus the 12 `lego.presentation_audio_id` and 4 seed target slots.
2. **Bump `audio_revision` on every replacement** so the URL becomes `.vN` and existing device caches
   are bypassed. Without this, step 1 will appear to fail exactly as the last four attempts did.
3. **Sweep the known side estate-wide** for the marker, the way `f1fd9bc0` swept the target side.
   Currently `deu_for_eng` is the only course with superseded rows, so this is small — but the
   detector should exist so it stays small.
4. **Central replacements for shared files, where a clip is shared.** 67,292 English files qualify;
   one regen at `293CEE0F` heals ~25 courses. This is the leverage Tom identified and it is real —
   it just is not what is wrong with German seed 1.
5. **The guarantee 17288e82 proposed** — a DB trigger making it impossible for bytes to change
   without `audio_revision` changing — is the right structural fix and this trace strengthens the
   case for it: with up to 39 courses on one file, a silent in-place rewrite is a 39-course incident.
6. **French needs none of this.** Its known-side audio is clean. Its problem is the script
   generator, in the companion doc.

---

## Gaps, stated explicitly

- **The `ssi-learning-app` serve-route and device-cache code trace had not returned when this was
  written.** Precedence and the `.vN` rule are established from the DB and from Tom's live URLs, not
  yet from quoted route code. Named as a gap rather than papered over.
- The earlier collision census in `docs/audio/fra-known-side-duplicate-clips-2026-08-06.md`
  (2,265 fra dedup groups, 56,429 estate-wide) is **a description of the intended design, not a
  defect list**, and should be read that way. Its 44 "one clip, several prompts" defects are a
  separate small content issue, not this bug.
- I have not verified on S3 whether the superseded files' bytes still exist; the fix plan assumes
  regeneration regardless, so it does not depend on that.
- Whether any course has silently rewritten bytes at a shared `s3_key` was not measured — it needs
  S3 `LastModified` against 243,547 rows. The zero-revision-divergence figure suggests it has not
  happened per-course, but that is inference, not measurement.

---

*Companion: `docs/audio/fra-known-side-duplicate-clips-2026-08-06.md` (the French scheduling trace).
Detector: `tools/audio/detect-known-audio-collisions.cjs`.*
