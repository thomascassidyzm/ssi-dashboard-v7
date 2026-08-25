# The autolinker was refusing human voice artists' own recordings — fixed

**2026-08-25.** Bug found and evidenced by job #581, fixed and proved here. Kai approved the fix.

## What was wrong

`audio_configured_voice()` — the SQL function that answers "which voice should a clip for
this course and role be in?" — built its answer as `provider` + `_` + `voiceId`, always.

For a synthetic voice that is right. Eve's config says provider `xai`, voiceId `eve`, and
the answer `xai_eve` is exactly what phase 8 writes on the clip.

For a human voice artist it is wrong, because a human voiceId **already carries its
provider**. Sasha (they/them) records Austrian German; their config says provider `human`,
voiceId `human_sasha_wanasky_deu_at`. The function therefore wanted:

```
human_human_sasha_wanasky_deu_at
```

A voice no clip in the estate has ever carried. Every clip Sasha has actually delivered is
filed as `human_sasha_wanasky_deu_at`. The voice gate compared the two, said "mismatch",
and the autolinker refused to bind the artist's own recordings to the slots they were
recorded for.

`relink_refusals` held the receipts: **319 rows** for `deu_at_for_eng` target2 and **44
rows** for `fin_for_eng` target1, dated 19–23 August, `candidate_voice` equal to the
artist's real voice id and `wanted_voice` equal to the doubled string.

The refusal is silent from the recordist's side. Takes upload fine, the clip count climbs,
and nothing links.

## The fix that looks right and is not

The obvious patch is to teach `audio_bare_voice_id()` to strip `human_` alongside
`xai_`/`azure_`/`elevenlabs_`/`google_`. It does not work, and it is worth writing down why:
`regexp_replace` strips exactly **one** leading prefix. It would take the doubled wanted
string down to `human_sasha_wanasky_deu_at` and the *correct* candidate down to
`sasha_wanasky_deu_at`. Still unequal. Still refused.

Verified on the live DB before choosing:

| string | after stripping with `human` added to the list |
|---|---|
| `human_human_sasha_wanasky_deu_at` (wanted) | `human_sasha_wanasky_deu_at` |
| `human_sasha_wanasky_deu_at` (the real clip) | `sasha_wanasky_deu_at` |

The doubling is the defect. The stripper was fine.

## What was actually changed

One root cause, fixed at the root — in both places that had drifted from the same rule.

The rule is not new. `services/shared/clip-identity.cjs` `canonicalVoiceId`, which phase 8
uses to decide the voice_id string it **writes**, already says: **the id's own provider
prefix wins**, and `provider` is only a hint for an id that carries no prefix. Two mirrors
of that rule had been written by hand as naive concatenation and had drifted:

1. **`audio_configured_voice()`** in the live database —
   `database/migrations/20260825_configured_voice_must_not_double_provider_prefix.sql`.
   Applied to the live DB; a helper `audio_provider_alias()` was added alongside it,
   mirroring `PROVIDER_ALIASES` from clip-identity.
2. **`resolveVoices()`** in `services/shared/relink-voice-guard.cjs`, which `phase8-audio-v13.cjs`
   imports and uses on its own linking path. It now reads `PROVIDER_ALIASES` from
   clip-identity rather than keeping a third hand-written copy.

Four regression tests were added to `services/shared/relink-voice-guard.test.cjs` — "THE
SASHA CASE" — alongside the existing "THE CHINESE CASE".

## The proof, both ways, on a real slot

`deu_at_for_eng` LEGO `S0001L01` ("i wü"), whose target2 slot really holds Sasha's clip
`058ead18-04b1-48d0-92ec-c53a4de4b09b`. In each run the slot was nulled, the real linker
was run, and the transaction was **rolled back**.

**Before the fix** — `link_all_audio_ids('deu_at_for_eng')` returned:

```
legos: {known: 0, target1: 0, target2: 0}
refused: 1
S0001L01 after linker: NULL
gate: wanted=human_human_sasha_wanasky_deu_at
      candidate=human_sasha_wanasky_deu_at  → accepts: false
```

**After the fix** — same slot, same command:

```
legos: {known: 0, target1: 0, target2: 1}
S0001L01 after linker: 058ead18-04b1-48d0-92ec-c53a4de4b09b   ← its own clip, back
gate: wanted=human_sasha_wanasky_deu_at
      candidate=human_sasha_wanasky_deu_at  → accepts: true
```

The `refused: 1` that remains after the fix is correct and wanted: the retired Azure voice
Jonas also has a clip with that text, and the gate still turns it away.

The **`audio_autolink` AFTER-INSERT trigger** — the path named in all 319 refusal rows — was
exercised separately, also rolled back: with the clip re-inserted, `S0001L01` bound to
`058ead18…` immediately. Post-rollback checks confirmed the slot and the clip were untouched.

## No regression for synthetic voices

Every `(course, role)` voice_config entry in the estate was resolved before and after and
diffed:

| | |
|---|---|
| voice_config entries estate-wide | **369** |
| entries whose resolved voice changed | **2** — `deu_at_for_eng` target2, `fin_for_eng` target1, both provider `human` |
| entries with provider xai / azure / elevenlabs / google | **361** |
| of those, changed by the fix | **0** |

## Sasha is safe

Counted after the fix landed:

| | |
|---|---|
| `course_legos.target2_audio_id` → Sasha | 28 |
| `course_practice_phrases.target2_audio_id` → Sasha | 266 |
| `course_seeds.target2_audio_id` → Sasha | 25 |
| **total slots** | **319** ✅ |
| **Sasha clips in `course_audio`** | **225** ✅ |

Unchanged by the fix, and now defended by it rather than by the direct-SQL restore job #581
performed.

## Other human-voice courses — reported, not touched

Kai decides whether to relink these; nothing below was changed.

- **`fin_for_eng` target1 (`human_kai_fin`) — 44 slots would now link** (20 seeds, 24
  practice phrases), matching its 44 refusals exactly. A dry run confirming this was rolled
  back.
- **`cym_n_for_eng`, `cym_s_for_eng`, `cym_anthem_for_jpn`** — Aran's and Catrin's clips.
  Dry runs found **0 to link and 0 refused** in all three. These courses were never hit by
  this bug.
- Worth flagging separately: those three Welsh courses have **empty-string `voiceId`s** with
  provider `azure` in their voice_config, so `audio_configured_voice` returns `azure_` for
  most roles. That was true before this fix and is still true after — a different defect, a
  config gap rather than a code one, and not fixed here.
- Every other `human_*` voice_id in the estate (`human_recording` for encouragements and
  instructions, `human_Aran` welcomes, `catrin_human`) sits on roles the voice gate does not
  cover, and is unaffected either way.

## Not done, deliberately

No TTS was generated. No bulk relink was run. Nothing outside `deu_at_for_eng`'s function
definitions was written, and every proof transaction was rolled back.
