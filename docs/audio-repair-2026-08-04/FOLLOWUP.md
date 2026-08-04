# Silent-clip repair — the two leftovers, 2026-08-04

Founder ruling (Tom, 2026-08-03): *"build a non-destructive path, or whatever:
better x simpler x cheaper"* — applied to the two items `README.md` left under
**What is still broken**. Both premises turned out to be wrong in the same
direction: the audio was fine, the *tooling* was lying. Neither fix spends a
penny of TTS.

---

## 1. The `presentation`-role clip

**Named item:** `f831cf4f-682a-4449-98ea-dab2fdd8ea41`, `eng_for_tel`,
`presentation`, `azure_te-IN-ShrutiNeural`, 984 ms, verdict `suspect`,
reason `rate` (36.4 ms/char, under the 37.2 floor).

### What it actually is

Two things the repair run could not see, both settled by reading the row:

**It is an orphan.** Every table that can cite a `course_audio` id was counted
against it — `lego_introductions` (both `presentation_audio_id` and the
FK-less `audio_uuid`), `course_audio_envelope`, `course_legos`,
`course_practice_phrases`, `course_seeds`, `listening_pod_sentences`. **All
zero.** The CASCADE the tool was protecting against had nothing to cascade
*for this clip*. It refused by role, blanket, without ever asking whether a
link existed.

**Its audio is not defective — its text is.** The presentation template is

```
ఇంగ్లీష్ — '<lego>' — '<example sentence>' —:
```

and this row reads `ఇంగ్లీష్ — 'తాతయ్య' — '' —:`. The example-sentence slot is
**empty**. 984 ms is the honest length of that text. Re-rendering it produces
another 984 ms clip that the gate flags again on the next pass. The clip is a
faithful reading of a broken string.

So the correct action for this clip is **no render**. It is unreachable by any
learner and re-rendering fixes nothing.

### What was built anyway, and why

The blanket refusal was still wrong, and the reason it existed was an
accident of ordering, not a law. `repair-silent-clips.cjs` deleted the old row
first and inserted the replacement second, because the unique key
`(course_code, text_normalized, language, role, voice_id)` blocks two rows with
the same voice. Delete-first is what makes
`lego_introductions.presentation_audio_id ON DELETE CASCADE` fatal.

`revoice-clips.cjs` had already found the inversion for its own case (insert
first, delete last — it changes `voice_id`, so both rows can coexist). A repair
does *not* change the voice, so it needs one more move: **park** the old row's
`voice_id` on a sentinel, which frees the unique key without deleting anything
or touching a single link.

```
park   -> old row's voice_id = 'parked:<newid8>:<voice>'   (unique key now free)
insert -> replacement lands under the REAL voice_id, beside the old row
relink -> every reference moves to the new id, old row still alive
delete -> old row goes last; no link points at it, so CASCADE takes nothing
```

Links are now never nulled and never need restoring. A failure at any step
un-parks the `voice_id` and drops the replacement — the old row was never gone,
so the S3-resurrection branch the tool used to carry is deleted.

**Proved, not asserted.** `tools/rehearse-audio-swap.cjs` runs both
orderings against the live `eng_for_tel` row `S0462L01` inside a transaction
that always rolls back:

```
DELETE-FIRST: lego_introductions rows left = 0  <-- authored content destroyed
park -> insert -> relink -> delete:
RESULT: lego_introductions survived = 1 row(s): {"lego_id":"S0462L01", ...}
rolled back — database unchanged
```

Two more gaps closed in the same blast radius:

- `lego_introductions.audio_uuid` carries **no FK** and equals
  `presentation_audio_id` on 44,751 of 47,381 rows. It is re-pointed too;
  otherwise a repair strands it on an id that no longer exists.
- `listening_pod_sentences` was missing from `LINK_TABLES` entirely. A **non-pod**
  clip can be cited by a pod — 4 `hrv_for_eng` `target1` rows are — and that FK is
  SET NULL, so a repair silently emptied the pod's link. Its three FK-less array
  columns now cause a **refusal** rather than a stranded uuid, matching
  `revoice-clips.cjs`.

### The finding that dwarfs the clip — [NEEDS TOM RULING]

The empty example slot is not a one-off. Counted estate-wide:

| | clips |
|---|---:|
| `presentation` rows with an empty example slot | **11,722** |
| ...of those, **live** (cited by a `lego_introductions` row) | **4,739** |

Live, across 11 courses: eng_for_tel 670, eng_for_hin 576, eng_for_urd 556,
kor_for_hin 539, eng_for_guj 489, zho_for_hin 459, eng_for_pan 402,
eng_for_mar 375, eng_for_kan 342, eng_for_ben 326, eng_for_ita 5.

Every one of these plays a learner "English — '*lego*' — " and then stops. The
gate cannot see them: it only caught this one because 984 ms happened to fall
under the rate floor, and the *linked* sibling for the same seed
(`289d7e09`, "'మా తాతయ్య' — ''", 1512 ms) has the identical defect and passes
cleanly at 50 ms/char.

This is a **content** defect with an audio symptom. Re-rendering cannot fix it —
the example sentences have to exist first. Out of scope for today's ruling;
logged here as the real headline.

---

## 2. The 14 `hrv_for_eng` rows on "dead" ElevenLabs voice ids

**The premise does not survive contact with the data. Do not remap them.**

The three ids are alive. Checked against the estate's own `ELEVENLABS_API_KEY`,
2026-08-04:

| voice id | HTTP | name |
|---|---|---|
| `EXAVITQu4vr4xnSDxMaL` | **200** | Sarah — Mature, Reassuring, Confident |
| `FGY2WhTYpPnrIDTdsKH5` | **200** | Laura — Enthusiast, Quirky Attitude |
| `JBFqnCBsd6RMkjVDRZzb` | **200** | George — Warm, Captivating Storyteller |

They 404'd because the clip was handed to **xAI**, which has never heard of
them. `decodeVoiceId` only recognised *prefixed* ids (`xai_`, `azure_`,
`elevenlabs_`) and defaulted everything else to xAI. Nothing is stale; the
router was wrong.

### They are also not stranded — they are a cast

Those ids are the **pod speaker palette**. `hrv_for_eng`'s listening pods assign
a voice per character, and Gabrijela + Srecko only cover two:

| speaker | voice |
|---|---|
| Anna, Customer, Customer 1, Learner, Passenger, Receptionist | `EXAVITQu4vr4xnSDxMaL` |
| Assistant, Customer 2 | `FGY2WhTYpPnrIDTdsKH5` |
| Customer 3, Tourist | `JBFqnCBsd6RMkjVDRZzb` |
| Barista, Chloe, Ellie, Emma, Katie, Narrator, … | `hr-HR-GabrijelaNeural` |
| Adam, Ali, Bartender, Ben, Driver, Waiter, … | `hr-HR-SreckoNeural` |

Remapping them to the course's configured `target1` voice — which is what
"remap to a valid current voice" would mean — **collapses the dialogue cast into
one speaker**. That is a regression, not a repair. (`revoice-clips.cjs` would
not have done it either: its `isLegacyVoice` matches `Neural$` and the
`azure_`/`elevenlabs_` prefixes, so a bare 20-character ElevenLabs id slips
past. Fortunate rather than designed — worth knowing before pointing it at a
pod-bearing course.)

Of the 13 rows resolvable from the run log (14 failures, one text appearing at
two indices): **none is linked from `course_legos`, `course_practice_phrases` or
`course_seeds`.** Four are cited by `listening_pod_sentences.target_audio_id`.
The rest are unreferenced. Every one was `suspect`/`rate` — flagged because
ElevenLabs speaks at a different pace than the Azure calibration, not because
anything is wrong with the audio.

**Action taken: none on the rows. Zero TTS. No approval needed, because nothing
needed generating.**

### What was actually broken, and how big it is

`decodeVoiceId` now infers the provider from the id's shape — Azure voices are
BCP-47-ish and end in `Neural`, ElevenLabs ids are exactly 20 alphanumeric
characters, xAI's are short names or 8–12 char handles (`leo`, `bedd6226`,
`gfzdpspr5fdp`). Verified against all 372 distinct `voice_id` values in the
estate: 123 classified xAI, 231 Azure, 18 ElevenLabs, no misfits.

What that unblocks, counted across `course_audio`:

| stored shape | rows | courses | before |
|---|---:|---:|---|
| prefixed | 1,957,579 | 120 | routed correctly |
| bare Azure (`hr-HR-GabrijelaNeural`) | **104,743** | **72** | **sent to xAI → 404** |
| bare ElevenLabs | **459** | 1 | **sent to xAI → 404** |
| bare xAI handles | 453,253 | 90 | routed correctly |

**105,202 clips across 72 courses were unrepairable by this tool** for the same
reason the 14 Croatian ones were, and the failure announced itself as a missing
voice rather than a mis-route. This is the third time in this repair sequence
that a tool defect wore a data defect's clothes — after the pagination bug and
the "missing Azure key" that was never missing.

---

## Decisions for Tom

1. **4,739 live presentation clips play a truncated intro with no example
   sentence** (table above). Needs a ruling on where the example sentences come
   from before any audio work; the render is the cheap half.
2. **The orphaned tel clip `f831cf4f`** — unreferenced, unreachable, defective
   text. Deleting it would clear the last residue from the estate-wide gate
   honestly. Deleting generated assets needs your approval (CLAUDE.md), so it is
   still there. Leave it or bin it?
3. **The gate's rate floor cannot see this defect class.** The linked sibling
   with the identical empty slot passes at 50 ms/char. Worth a `presentation`
   template check (does the text contain an empty `''` slot?) — a string test,
   not an audio one, and it would find all 11,722 for nothing.
