# One voice, one spelling — canonicalising the clip identity key

**2026-08-06.** Companion to `docs/architecture/AUDIO_PIPELINE_CONTENT_ADDRESSED_DESIGN-2026-08-06.md`.
Code landed; the data reconciliation below is a **proposal awaiting approval** and has not been run.

> The design says a clip's identity is `(language, normalised text, voice)`. That only dedups if two
> clips that *are* the same combination are always *spelt* the same. Today they are not — and the bill
> for that has been arriving all week.

---

## What the estate actually holds

Measured on live `course_audio`, 2,532,679 rows, 2026-08-06.

| | canonical already | drifted spelling | unresolvable |
|---|---|---|---|
| **language** | 52 values / 2,432,506 rows | 79 values / 92,326 rows | 1 value / **7,847 rows** |
| **voice_id** | 153 values / 1,948,667 rows | 117 values / 526,032 rows | 101 values / **57,980 rows** |

**language** holds 137 distinct values for about 60 languages, in three incompatible families at once —
ISO-639-3 (`eng`), ISO-639-1 (`en`), BCP-47 (`en-GB`, `pt-BR`, `fr-CA`) — plus the literal string
`auto` on 7,847 rows across 36 courses. `spa_for_eng` alone stores its audio under six of them:
`auto`, `en`, `eng`, `es`, `es-ES`, `spa`.

**voice_id** spells the same voice two or three ways. `azure_en-GB-SoniaNeural` and
`en-GB-SoniaNeural` are one voice on 414,061 rows between them. `xai_leo`, `comp:leo` and `leo` are
one voice. About 100 voice bases carry more than one spelling, and the `voices` registry itself
carries six of them twice.

### What that costs, in one number

**21,477 clip identities are currently split across 154,571 rows, purely by spelling** — 17,682 split
by the voice, 4,004 by the language. Canonicalising merges 21,836 identities that the design's key
would otherwise have counted as distinct clips.

And it is not theoretical. **2,590 clips have been rendered twice** because an existence check spelt
the voice or the language differently, missed the clip it already owned, and paid for it again. Two
rows, two S3 objects, one sentence, one voice:

```
eng_for_ben  target2  "are you all ready"  voice gfzdpspr5fdp      19 Jun  1152 ms
eng_for_ben  target2  "are you all ready"  voice xai_gfzdpspr5fdp   1 Aug  1104 ms
```

The most recent such double render is dated **5 August 2026** — yesterday. This is live spend, not
history.

---

## The canonical forms

Both are implemented in **`services/shared/clip-identity.cjs`** (20 tests,
`services/shared/clip-identity.test.js`).

### Language — the estate's own `database_code`, region-free

Three lowercase letters, the `database_code` column of `tools/sync/reference/language_codes.csv` —
the same code every course code is built from (`zho_for_eng`, `fra_for_eng`). Region is **dropped**:
`fr-CA` → `fra`, `pt-BR` → `por`, `ar-LB` → `ara`, `en-GB` → `eng`.

Dropping the region is safe **because voice is in the identity**. A Canadian French clip and a
metropolitan French clip of the same sentence are told apart by their voice —
`azure_fr-CA-SylvieNeural` versus `azure_fr-FR-CelesteNeural` — so a region on the language column
adds nothing and only splits the key. The estate already agrees with itself: `fra_ca_for_eng` stores
`fra` on 61,030 rows and `por_br_for_eng` stores `por`.

This is also what settles the `ara` / `ara_lb` case that started this work. `ara_lb_for_eng` storing
its target audio as `ara` is **correct**, not a bug: the Lebanese accent lives in the declared voices
(`ar-LB-LaylaNeural`, `ar-LB-RamiNeural`), and the Lebanese text differs from MSA text anyway, so the
two never collide on one identity.

### Voice — `<provider>_<the provider's own voice id>`

Lowercase provider from a closed set — `azure`, `xai`, `elevenlabs`, `google`, `narakeet`, `human` —
an underscore, then the provider's id verbatim. Azure voice names are case-significant and are **not**
lowercased.

Three reasons this direction rather than stripping the prefix: it is already the majority (1.94M of
2.53M rows); it is exactly what `courses.voice_config` stores, in two fields
(`{provider: 'azure', voiceId: 'en-GB-SoniaNeural'}`), so composing it needs no lookup; and
`services/voice-gender-map.cjs` already documents it as the intended convention. `comp:leo` is the
voice-engine's composite prefix over an xAI id and resolves to `xai_leo`.

### Deliberately refuses to guess

`canonicalLanguage('auto')` and `canonicalVoiceId('legacy_import')` **throw**. These are placeholders,
not languages or voices; a caller that hits one must resolve the real value from the course code and
role, or from the render job. Guessing is how a wrong clip gets linked. `tryCanonical*` variants
return `null` for read-only audits that must survive bad data.

---

## What landed

| | |
|---|---|
| `services/shared/clip-identity.cjs` | `canonicalLanguage`, `canonicalVoiceId`, `clipIdentity`, plus non-throwing audit variants |
| `services/shared/clip-identity.test.js` | 20 tests, green; full suite unchanged at its pre-existing 6 failures |
| `tools/audio-identity-lint.cjs` | read-only census — writes nothing, exits non-zero while anything is unresolvable |
| `tools/sync/reference/language_codes.csv` | 21 rows whose language name contains a comma are now quoted |
| `database/migrations/20260806_clip_identity_canonical_shape.sql` | **written, deliberately not applied** — see below |

**The CSV fix is worth calling out.** The Greek row read
`el,Greek, Modern (1453-),el-GR,el,ell,el-GR` — the unquoted comma in the name shifted every later
column, so the whole estate read Greek's `database_code` as `el` instead of `ell` and its Azure locale
as `el`. `toIso3('el')` returned `'el'`, and 16,579 Greek rows stored as `ell` matched nothing.
Quoting the name fixes Greek for every caller of `language-code-service.cjs`, not just this work.

### The migration is written and not applied, on purpose

Two `NOT VALID` CHECK constraints on the *shape* of the two columns: `^[a-z]{3}$` for language,
`^(azure|xai|elevenlabs|google|narakeet|human)_.+` for voice_id. `NOT VALID` leaves every existing row
untouched and checks only new and updated ones. Shape only — whether `eng` is the *right* code for a
row stays in `clip-identity.cjs`, because duplicating the 92-code language table into SQL would give
two maps to keep in step, which is the exact bug this work exists to remove. The shape check still
rejects every drift class observed: `en`, `en-GB`, `auto`, `en-GB-SoniaNeural`, `comp:leo`,
`legacy_import`.

It is not applied because **applying it before the writers are converted breaks the audio pipeline**:
any writer still emitting `en-GB-SoniaNeural` starts failing its inserts. Order is: convert writers →
apply constraint → back-fill → `VALIDATE`.

---

## The 57,980 rows nothing can canonicalise

| value | rows | what it is |
|---|---|---|
| `legacy_import` | 39,391 | `origin = 'human'`, Jan–Mar 2026 — recorded Welsh/Spanish course audio imported from JSON |
| `human` | 1,317 | `origin = 'human'`, presentation role |
| `human_recording` | 1,187 | `origin = 'human'`, instruction/encouragement/welcome |
| 97 opaque ids | ~16,000 | `origin = 'tts'` — e.g. `f15c6a6a`, `yis75yfp`, `b1a7441b97a1`, `EXAVITQu4vr4xnSDxMaL`; **none are in the `voices` registry**, so the provider cannot be recovered from the string |
| `auto` (language) | 7,847 | 36 courses; not a language |

The three `human*` sentinels are recoverable by rule: the `voices` registry already uses
`human_<course>_<role>` (`human_spa_for_eng_target1`), and every one of these rows carries a
`course_code` and a `role`. That is a mechanical derivation, not a guess.

The 97 opaque TTS ids are **not** recoverable from the data alone — the provider is only in the code
that wrote them. `EXAVITQu4vr4xnSDxMaL` is a recognisable ElevenLabs id and the 8-character and
12-hex shapes look like clone ids, but *looks like* is not evidence and this is a stated gap. The
write-path audit running alongside this work is what closes it.

`auto` is likewise a code question: the language is derivable from `course_code` + `role`, and which
writer emits `auto` decides whether that derivation is safe or whether those rows are mislabelled.

---

## Reconciling the existing rows — PROPOSAL, needs approval

Rewriting 158,153 rows is a data change, so nothing below has been run.

**It cannot be a plain UPDATE.** `course_audio` carries
`unique_course_audio_per_voice (course_code, text_normalized, language, role, voice_id)`. Canonicalising
in place collides on **2,578 groups covering 5,168 rows**, and in **every single one of those groups the
two rows point at different S3 objects** — they are the double renders. There is no group where the
same file is merely listed twice.

Proposed order, each step gated and reversible:

1. **Convert the writers first.** Every place that writes `language` or `voice_id` composes it through
   `clip-identity.cjs`. Until this is done, a back-fill is just cleaning behind a tap that is still
   running — the 5 August duplicate proves the tap is open.
2. **Apply the shape constraint** (`NOT VALID`). New writes are now canonical by construction; old rows
   are untouched.
3. **Back-fill the non-colliding 152,985 rows**, in the sweep-protocol shape the estate already uses:
   DRY_RUN log first, per-row before-state assertion, abort on drift, `*-{dryrun,applied}-log.json`,
   re-run `audio-identity-lint.cjs` and reconcile the delta exactly.
4. **Resolve the 2,578 collision groups one at a time.** Both objects exist and both are valid audio,
   so this is a *link* decision, not a deletion: keep the row the app currently serves, repoint, and
   **delete nothing** — make-before-break (`AUDIO_PIPELINE_ARCHITECTURE.md` §6b), and the design's own
   ruling that no course may delete a shared object on its own authority. The superseded objects cost
   almost nothing to keep.
5. **`VALIDATE` the constraints.**
6. **The human rows** (41,895) get `human_<course>_<role>` derived from their own columns — same gated
   script shape. These are recordings: the precious-audio guard must be verified to still see them
   *before* the rename, not after.
7. **The 97 opaque TTS ids and `auto`** wait on the write-path audit naming their writer. No guessing.

### One judgement call I want a word on

Dropping the region merges **83 identities** where the *same* xAI voice rendered the *same* text for a
dialect pair — `spa_for_eng` and `spa_mx_for_eng`, `por_for_eng` and `por_br_for_eng`, all of them
`pod_take_g` / `pod_explainer` rows. They were rendered under `es-ES` and `es-MX` language hints, so
the two files may differ slightly in accent even though the voice is one person.

My read: **accept the merge.** The accent belongs to the voice, and if the Mexican course wants a
Mexican accent the honest fix is for it to *declare a different voice* — which is step 2 of the design
anyway — rather than to rely on a language tag that the identity key is about to stop carrying. But
this is 83 pod clips and an ear, so it is Tom's call, and it is cheap either way: the alternative is to
leave those rows non-canonical and revisit when the pod voices are next set.

---

## Verify it yourself

```
node tools/audio-identity-lint.cjs --detail
```

Read-only, writes nothing, prints the table at the top of this document.
