# Voice per course vs per language — the duplication, measured again

**2026-08-29. Read-only.** Nothing was migrated, re-rendered, relinked or recast. No TTS was run.
Every number below is a `SELECT` against live `course_audio` (2,597,473 rows) and `courses`
(149 rows), plus reads of the code that runs in production. This refreshes
`docs/architecture/AUDIO_PER_LANGUAGE_UNIFICATION_DESIGN-2026-08-18.md`, published to Tom eleven
days ago as `/d/90343452`.

---

## The answer in seven lines

- **Your reading is right, and it has not changed in eleven days.** Casting is per course, in a JSON
  blob on the course row, and that is what duplicated the audio.
- **406,147 renders** — 16.1% of everything the estate has ever made — were the same sentence, same
  language, **same voice**, rendered again only because a different course asked for it.
- A further **257,236 renders** were the same sentence in the same language rendered again in a
  **different voice**, because two courses were configured independently. That is the casting half,
  and only a per-language cast reaches it. Together: **663,383 renders, 26.3%.**
- At the rates the estate actually gets, 663,383 renders is **77 days** of continuous xAI queue or
  **27 days** of Azure. That is the currency that matters, as you said.
- **89.8% of it is English.**
- **But the thing on your screen is not this.** The Languages page reads a brand-new table,
  `voice_language_roles`, which landed yesterday and **has zero rows in it**. Everything reads
  "uncast" because nobody has cast anything into it yet — not because voices are attached to
  courses. Two true things that look like one.
- **The keying half is already fixed.** A-137 landed at 01:07 on 2026-08-18 — twenty-seven minutes
  after the last document was published to you — and wired cross-course reuse into all nine render
  paths. New renders no longer pay the 406,147 tax. **The casting half is the only part still open,
  and it is now also the thing blocking Cartesia.**

---

## 1. The premise, checked against the live code

**Casting is still per course.** `courses.voice_config` holds
`{"voices": {"known": {...}, "target1": {...}, "target2": {...}, "presentation": {...}}}` and is
read at render time from the course row: `services/phases/phase8-audio-v13.cjs:1873` and `:2065`
fetch it, `:2401-2402` unpack it, `getVoiceForRole()` canonicalises at `:2430-2443`, and `:2557`
stamps it onto every item. Eight further render paths resolve from the same column. That is
`origin/main` as of `2dddcfb65`, which is what the services run.

The one place casting **is** per language remains the pod cast (`tools/pod-sync.cjs`, sourced from
`app_config.pod_voice_pools`), exactly as it was.

**And now there is a second per-language place — empty.** `voice_language_roles`, keyed
`(language, gender, rank)` with a foreign key to `voices.voice_id`, landed yesterday in `4afff0450`
with the Voice Lab Languages panel. **`select count(*) from voice_language_roles` returns 0.**
Nothing reads it on the render path; `docs/DECISIONS.md` for 2026-08-28 says so in as many words —
*"Casting is not enforced anywhere yet… this landed as a registry a human reads and fills."*

So the honest answer to what you were looking at:

> The voices show as uncast because the per-language casting registry is empty. It is a **fill**
> task, not an architecture problem. The per-course duplication you suspected is real and separately
> measured below — but it is not what that screen is reporting.

**The literal count you asked for.** Of 149 courses, **55 have no voice cast at all**: 52 carry a
bare `{}` in `voice_config` and 3 carry only a `podCast` block with no `voices` key. 56 have no
`target1` and 56 no `presentation` voice. The 52 figure matches what the job #126 briefing measured.
68 distinct target languages exist across the estate.

---

## 2. The headline, refreshed — and it has barely moved

| | 2026-08-18 | **2026-08-29** | delta |
|---|---|---|---|
| `course_audio` rows | 2,565,528 | **2,597,473** | +31,945 |
| canonicalisable | 2,500,026 (97.45%) | **2,531,884 (97.48%)** | +31,858 |
| excluded (opaque voice / `auto` language) | 65,502 | **65,589** | +87 |
| course-keys | 2,490,927 | **2,522,782** | +31,855 |
| unified keys, voice-exact | 2,090,271 | **2,116,635** | |
| **renders avoided — unified keying** | 400,656 (16.1%) | **406,147 (16.10%)** | +5,491 |
| unified keys, voice-blind | 1,837,406 | **1,859,399** | |
| **renders avoided — + unified casting** | 653,521 (26.2%) | **663,383 (26.30%)** | +9,862 |
| role-agnostic, voice-exact | 438,897 (17.6%) | **447,979 (17.76%)** | +9,082 |
| English share of the win | 89.6% | **89.8%** | |

**Unchanged in eleven days.** The percentages moved by two hundredths. The estate added 32,000 clips
and reproduced the same duplication ratio doing it, which is what you would expect if the cause is
structural rather than a bad patch of work.

Method is the prior document's, unchanged so the delta is real: group on
`canonicalLanguage(language)` × `canonicalVoiceId(voice_id)` from `services/shared/clip-identity.cjs`
× `rtrim(lower(trim(text_normalized)), '.?!¿¡。？！')` — the trigger's own normalisation, re-applied
so both historical text conventions collapse onto one key — × `role`. The canonicalisation was
computed in Node from the 910 distinct `(language, voice_id)` pairs by the estate's own module, not
a hand-rolled regex, and pushed back into SQL as a mapping table. Counts are of **distinct
`(course_code, key)`**, so intra-course re-renders are excluded; this isolates the course split.

### The two problems, kept apart

This is the part worth reading twice, because the two halves have different causes and different
fixes.

| | renders | what it is | what fixes it |
|---|---|---|---|
| **different COURSE, same voice** | **406,147** | the same sentence, same language, same voice, rendered once per course that wanted it | keying — **already done**, see §3 |
| **different VOICE, same text** | **257,236** | two courses independently cast different voices for the same language | **per-language casting — still open** |
| total | **663,383** | | |

Of 1,859,399 unified (language, role, text) keys, **1,584,047 — 85.2% — have exactly one course and
exactly one voice.** The single-consumer case is the overwhelming majority and it costs nothing
under any scheme; it just sits in the store.

### By role

| role | course-keys | avoided, voice-exact | % | avoided, + unified casting | % |
|---|---|---|---|---|---|
| known | 795,854 | **169,908** | 21.3% | 262,083 | 32.9% |
| target1 | 768,045 | **102,951** | 13.4% | 179,087 | 23.3% |
| target2 | 731,867 | **94,009** | 12.8% | 169,925 | 23.2% |
| presentation | 129,377 | 1,200 | **0.9%** | 13,128 | 10.1% |
| pod_fine_known | 41,992 | 27,018 | 64.3% | 27,018 | 64.3% |
| pod_explainer | 42,986 | 6,977 | 16.2% | 7,955 | 18.5% |
| pod_take_g | 7,376 | 61 | 0.8% | 162 | 2.2% |
| instruction | 2,543 | 1,932 | 76.0% | 1,932 | 76.0% |
| encouragement | 2,540 | 1,933 | 76.1% | 1,933 | 76.1% |
| welcome + bookends | 202 | 158 | 78% | 160 | 79% |

`presentation` at 0.9% is unchanged and is the honest confirmation that narration genuinely is
course-specific — the text names the target language, so it cannot be shared across a known
language. It is 5% of the corpus and shares almost nothing, and that costs the scheme nothing.

### By language

| language | courses | course-keys | avoided, voice-exact | avoided, + unified casting |
|---|---|---|---|---|
| **eng** | 103 | 1,102,935 | **364,592** | **554,747** |
| zho | 15 | 113,526 | 9,050 | 16,690 |
| spa | 7 | 111,903 | 5,832 | 17,659 |
| jpn | 12 | 72,166 | 5,217 | 6,897 |
| kor | 4 | 91,488 | 4,700 | 9,255 |
| ita | 4 | 60,013 | 4,029 | 6,125 |
| hin | 4 | 60,145 | 3,454 | 3,730 |
| eus | 2 | 29,851 | 2,608 | 2,808 |
| tam | 3 | 43,917 | 2,001 | 2,001 |
| cat | 2 | 25,998 | 1,668 | 2,833 |
| deu | 6 | 85,392 | 1,299 | 6,687 |
| fra | 6 | 102,649 | 888 | **22,305** |
| ara | 5 | 60,733 | 543 | 1,823 |
| por | 3 | 66,000 | 265 | 6,875 |
| all single-course languages | 1 each | — | 0 | small |

**English is 89.8% of the win.** Everything else together is 41,555 renders under voice-exact
keying. Casting English alone — as known and as target — captures nine tenths of it.

`fra` is the sharpest illustration of the casting half on its own: 888 renders avoidable at the
voice-exact key, **22,305** once voice leaves it. Six French courses, four different cast French
voices, so almost nothing dedups today.

### Renders avoided → wall-clock

Rates as measured previously and not re-measured here: **xAI 6 clips/min** (2026-08-17, A-136 Dutch
re-render, 335 clips), **Azure 17.3 clips/min** (2026-08-07, DEU render plus whisper gate). Both are
pipeline rates including the veracity gate, not bare API rates.

| | at xAI 6/min | at Azure 17.3/min |
|---|---|---|
| 406,147 (unified keying) | **47 days** | **16.3 days** |
| 663,383 (+ unified casting) | **77 days** | **26.6 days** |
| the casting half alone (257,236) | **29.8 days** | **10.3 days** |

Read those as contention avoided, accumulated over eighteen months — not a bill anybody would pay in
one go.

---

## 3. What changed since 2026-08-18: the keying half is done

The prior document's central recommendation was *wire the existing lookup into the seven render
paths that skip it*. **That landed twenty-seven minutes after the document was published**, in
`065d6078a` — *"feat(a137): one voice pool per language — reuse is role-agnostic, on every render
path"*, 2026-08-18 01:07, on `main`. Verified in `origin/main` today:

- `findSiblingCourseClip()` at `phase8-audio-v13.cjs:521`, unchanged in its matching;
- a new `lookupSiblingClip()` at `:571` that returns `hit` / `miss` / **`error`**, counts and logs
  each — the two silent `catch {}` fall-throughs to paid TTS the prior document flagged are gone;
- a shared `reuseSiblingIntoCourse()` at `:635`, called from five sites plus the two bulk paths, so
  repair, revoice, single-clip, presentation, phrase, lego and the pod cross-course branch all ask
  the store first;
- role has left the reuse key on your 2026-08-18 ruling — *"SAME voice pool per language, regardless
  of role… the player will play the voices at different speeds when necessary"* — with the Azure
  baked-speed guard (`isSpeedTrustedVoice`) as the one exception.

So the 406,147 figure is now **historical**, not forward-looking. A new course no longer pays it. The
**257,236 casting half is the entire remaining structural win**, and unlike the keying half it cannot
be reached by any amount of lookup cleverness: two courses rendering the same English sentence in two
different English voices are not duplicates under any key that contains voice — and voice stays in
the key, because dropping it would mass-revoice slots nobody approved.

**And it is now on the critical path for something else.** `services/shared/tts-provider-policy.cjs`
(2026-08-28) retires xAI from selection and makes Cartesia the standing default — but only where a
Cartesia **voice** actually resolves, and the estate holds **zero Cartesia rows in `voices`**. Its
own words: *"casting, not language coverage, is the live blocker on Cartesia becoming the estate's
default in practice."* The empty `voice_language_roles` table is that blocker, wearing a different
hat.

---

## 4. Bytes — the gap the prior document left

**`course_audio.file_size_bytes` is NULL on 2,588,054 of 2,597,473 rows (99.64%).** Only 9,419 rows
carry a size. So storage volume **cannot be counted** on this estate; it can only be estimated. It is
labelled an estimate everywhere below.

`duration_ms`, by contrast, is populated on **2,596,780 rows (99.97%)**, so the estimator is
duration × a measured bytes-per-ms:

- from the 9,419 sized rows with real bytes: **12.482 bytes/ms**;
- cross-check: the mastering chain encodes lame CBR **96 kbps** (`services/audio-processor.cjs:95`)
  = 12.0 bytes/ms, plus header and tag overhead.

Two independent sources within 4% of each other. Estimates below use 12.482 bytes/ms.

| | audio hours | **estimated bytes** |
|---|---|---|
| logical total (every row its own object) | 1,889 h | **84.9 GB** |
| **actually stored today** — 2,203,180 distinct S3 objects | 1,672 h | **≈75.1 GB** |
| if keyed `(language, role, text, voice)` | 1,629 h | ≈73.2 GB |
| if keyed `(language, role, text)` — **unified casting** | 1,459 h | **≈65.6 GB** |

**Bytes that would collapse under language-level casting: ≈9.6 GB, 12.7% of stored volume.**

Two honest qualifications, both of which cut against the headline:

1. **Physical sharing has already taken most of the byte win.** 2,531,851 rows point at 2,203,180
   distinct S3 objects — **328,671 rows already share bytes with another row**. That is
   `clone-copy-index.cjs`'s standing doctrine (*"logical ownership is per-course… PHYSICAL storage is
   shared"*) plus A-137's relinking, working. Of the keying half's byte win, only **≈1.9 GB** is
   still on the table; the rest is already collapsed. The 9.6 GB above is therefore almost entirely
   the **casting** half.
2. **9.6 GB is nothing.** At S3 Standard list that is roughly **twenty-five cents a month**. This
   confirms your own ruling rather than adding to it: storage is not an argument for anything. The
   argument is queue time.

---

## 5. TTS spend — partly derivable, and it is small

Rates on file in this repo, each with its provenance:

| provider | rate | source | status |
|---|---|---|---|
| Azure S0 neural | **$4.00 / M chars** | `services/audio-generation-planner.cjs:24` | on file |
| xAI | **$15.00 / M chars** | `tools/course-finish-report.cjs:21`, cited to docs.x.ai | on file, provider **retired** |
| ElevenLabs | ~$0.18 / 1k chars ≈ $180 / M | `audio-generation-planner.cjs:36` (growth plan overage) | on file |
| **Cartesia** | — | — | **no rate anywhere in the estate** |

Measured duplicate characters (voice-exact, the 406,147 keys): xAI 4.54M, Azure 4.47M, ElevenLabs
1.85M. At the rates above:

| | duplicate spend | all-time spend |
|---|---|---|
| Azure | $17.87 | $188 |
| xAI | $68.16 | $352 |
| ElevenLabs | $332.39 | $428 |
| **total (estimate)** | **≈$418** | **≈$968** |

So the historical duplication cost roughly **four hundred dollars** — against **47 days of xAI
queue**. That is your point, quantified: *"we might well save ourselves a lot of time, rather than
money."* ElevenLabs is two thirds of the money on 1% of the characters, which is its own small
finding and consistent with the ladder's rule that it must never be reached automatically.

**Explicit gaps in the money figure**: no Cartesia rate exists anywhere in the repo, so the
forward-looking cost of the provider the estate is moving to cannot be stated at all; and per
`docs/DECISIONS.md` 2026-08-28 the Voice Lab deliberately stopped claiming dollars for exactly this
reason. Treat the table as an order of magnitude, not a bill.

---

## 6. What would break — plainly

### Courses that deliberately differ, named

**Two target voices per course is a feature, not drift.** 87 of the 93 cast courses have
`target1 ≠ target2`; only 6 have them the same. Any per-language cast has to carry at least two
voices per language, which is what `voice_language_roles`'s `(language, gender, rank)` key already
provides for.

**Regional variants — the real ones, from live config:**

| course | target_lang | voice_pool_key | target1 | target2 |
|---|---|---|---|---|
| `ara_eg_for_eng` | ara | ara_eg | ar-EG-SalmaNeural | ar-EG-ShakirNeural |
| `ara_lb_for_eng` | ara | *(none)* | ar-LB-LaylaNeural | ar-LB-RamiNeural |
| `ara_sy_for_eng` | ara | ara_sy | ar-SY-AmanyNeural | ar-SY-LaithNeural |
| `deu_at_for_eng` | deu | deu_at | de-AT-IngridNeural | **human_sasha_wanasky_deu_at** |
| `deu_ch_for_eng` | deu | *(none)* | de-CH-LeniNeural | de-CH-JanNeural |
| `fra_ca_for_eng` | fra | fra_ca | fr-CA-SylvieNeural | fr-CA-AntoineNeural |
| `por_br_for_eng` | por | por_br | pt-BR-BrendaNeural | pt-BR-JulioNeural |
| `spa_mx_for_eng` | spa | spa_mx | es-MX-CarlotaNeural | es-MX-LucianoNeural |

Every one of these stores the **base** language code (`ara`, `deu`, `fra`, `por`, `spa`) and is told
apart **only by its voice**. Four Arabic courses carry four different `target1` voices; five German
courses carry four. A per-language cast keyed on `deu` alone would silently collapse Austrian, Swiss
and standard German into one voice. This is the single most concrete thing that would break, and the
estate already has the answer: `poolKeysForCourse()` in `tools/pod-sync.cjs`, which resolves
`courses.voice_pool_key` to the variant cast and falls back to the base. **Only 16 of 149 courses
carry a `voice_pool_key` today**, and `ara_lb_for_eng`, `deu_ch_for_eng` and the three `gle_*`
dialect courses have none — so the resolver exists but its data does not, and a naive per-language
cast rollout would hit exactly those five first.

**Human recordings.** `human_sasha_wanasky_deu_at` is `deu_at_for_eng`'s `target2`, and
`human_kai_fin` is `fin_for_eng`'s `target1`. In `course_audio`, human voices carry 2,999 clips:
`human_recording` (1,187 rows, 16 courses), bare `human` (1,317), `human_sasha_wanasky_deu_at` (225),
`human_aran_cym_n` (107 rows across **two** languages), `human_catrinlliar_cym_n` (56),
`human_kai_fin` (44). The provider ladder's rung 1 makes human recordings a **STOP**, not a
preference — but as its own gap #7 records, *"the code knows human-voiced COURSES and LANGUAGES, not
human-voiced SLOTS"*. Under a per-language cast that gap gets sharper, not softer: today the Welsh
courses are excluded wholesale by course code; a language-level cast makes the natural unit the
language, and a human slot inside an otherwise-synthetic course has nothing protecting it. The 1,187
rows under the uncanonicalisable `human_recording` spelling and 1,317 under bare `human` are exactly
those unprotected slots.

**English is not unanimous either.** 57 English-known courses carry a known voice, and they carry
**7 different spellings of it** — `en-GB-SoniaNeural` on 40, `eve` on 6, `gfzdpspr5fdp` on 5, plus
`en-GB-AdaMultilingualNeural`, `en-GB-MiaNeural` and `leo` on one each, and 3 courses holding an
empty string. Some of that is drift. Some of
it is the clone, deliberately. Only your ear can tell them apart, and this document does not try.

### What legitimately needs a per-course voice

Four care items from the prior document, re-checked. All four still stand:

1. **Known-side instructional register vs target material.** Keying is settled — role left the reuse
   key on your 2026-08-18 ruling and it is in the code. What is still open is *casting*: whether the
   instructional voice should differ from the target voice inside one language. One taste call, and
   the only thing on this page that needs you.
2. **Azure bakes pace into the stored MP3.** `services/shared/clone-copy-match.cjs` records that
   Azure bakes the configured speed into the bytes and `course_audio` persists no per-row speed, so
   an Azure clip's pace cannot be verified after the fact. Courses that differ in pace genuinely do
   **not** share bytes, and cannot be made to without re-rendering. A-137 handles this correctly
   today via `isSpeedTrustedVoice` (xAI and ElevenLabs are always 1x; Azure is not), and any casting
   change must keep that guard. This is the one place the scheme requires a behaviour change rather
   than permitting one.
3. **Regional variants** — the table above. Voice is what tells them apart inside the key, so voice
   must stay in the key, and `voice_pool_key` must be populated for the five variant courses that
   lack it before any cast resolves by language alone.
4. **The `audio_clips` canon (746,535 rows).** Its backfill is oldest-object-wins and its trigger is
   INSERT-only, so it can hold a superseded take. Under a shared store one bad promotion reaches
   every consumer, so promotion must come from human decisions rather than over them. Unchanged and
   still true.

And one that is not a breakage but is a live tension worth naming: **your own ruling of yesterday**
(`docs/tts-provider-policy-2026-08-28.md`) is that *"voice config per course is the course builder's
call, case by case. Not a central policy and not an estate sweep."* A per-language cast is compatible
with that only if it is a **default that a course may override**, never a policy that overrides a
course. That is how the pod cast already works and how `voice_language_roles` is shaped. Read the
recommendation below in that frame.

---

## 7. Where this leaves the decision

The scheme is not re-argued here; it was recommended on 2026-08-18 and half of it shipped that night.
What is new tonight:

- The keying half — 406,147 renders, 61% of the available win — **is done**. No decision needed.
- The casting half — **257,236 renders, 30 days of xAI queue, ≈9.6 GB, ≈$350** — is the whole
  remainder, and it is now *also* what blocks Cartesia from being reachable at all.
- The table to hold it **already exists and is empty**. Filling it is a casting job, not a build.
- Nine tenths of the win is English, which is a handful of voice decisions, not seventy.

Nothing here is a remediation programme. Existing content stays where it is and is replaced only as
it is naturally touched, per your standing ruling. The number's job is to size the future.

**One thing needs you, answerable in one word.** Not the keying — ruled and shipped. The casting:
should the **known side** — instructional register, *"now say…"* — be cast as a **different voice**
from target-language material in the same language, or the **same** one? Same is simpler and dedups
more; different may be what the ear wants. **Same / Different.**

---

## 8. Honest gap list

Everything below is something this document could **not** measure, or estimated rather than counted.

- **Bytes are estimated, not counted.** `file_size_bytes` is NULL on 99.64% of rows. Every GB figure
  in §4 is duration × 12.482 bytes/ms, an estimator measured on 9,419 rows (0.36% of the corpus) and
  cross-checked against the 96 kbps encode setting. The two agree within 4%, but the sample is small
  and may not be representative across providers.
- **S3 was not read.** No AWS CLI on this box; object sizes were not fetched. The "actually stored"
  figure is distinct `s3_key` count × estimated size, not a bucket listing.
- **65,589 rows (2.52%) could not be canonicalised** and are excluded from every count: 184
  `(language, voice_id)` pairs with an opaque voice id — `legacy_import`, bare `human` /
  `human_recording`, and clone ids with no provider prefix — plus 7,847 rows with language `'auto'`.
  The duplication among them is unmeasured, not zero. Essentially unchanged from the 65,502 of
  2026-08-18.
- **No Cartesia rate exists anywhere in the estate**, so the forward cost of the provider the estate
  is adopting cannot be stated. The dollar table in §5 prices two providers, one of which is retired.
- **Throughput rates were not re-measured.** xAI 6/min and Azure 17.3/min are carried over from
  2026-08-17 and 2026-08-07. xAI's is now of historical interest only, since xAI is retired from
  selection.
- **Day-one coverage for a new course was not re-measured.** The 10–36% range and the role split are
  from 2026-08-18 and are not refreshed here; the corpus grew 1.2%, so they will not have moved much,
  but that is an inference, not a measurement.
- **Which English voice differences are deliberate was not judged.** The seven English known voices
  are named in §6; separating drift from editorial choice needs your ear and was not attempted.
- **`voice_language_roles` completeness was read as zero rows, tonight.** Job #126 is actively
  working on the Languages page against the same column; if it casts anything while this document is
  being read, that number moves.

---

*Sources, all read live 2026-08-29: `course_audio` (2,597,473 rows), `courses` (149),
`voice_language_roles` (0), `audio_clips` (746,535). Code read from `origin/main` at `2dddcfb65`:
`services/phases/phase8-audio-v13.cjs:521,571,635,1873,2065,2401,2430,2557`;
`services/shared/clip-identity.cjs`; `services/shared/text-normalize.cjs`;
`services/shared/tts-provider-policy.cjs`; `services/audio-generation-planner.cjs:20-46`;
`services/audio-processor.cjs:95`; `tools/pod-sync.cjs`; `tools/course-finish-report.cjs:21`.
Rulings: `docs/DECISIONS.md` 2026-08-28; `docs/tts-provider-policy-2026-08-28.md`; commit
`065d6078a` (A-137, 2026-08-18). Baseline:
`docs/architecture/AUDIO_PER_LANGUAGE_UNIFICATION_DESIGN-2026-08-18.md`.*
