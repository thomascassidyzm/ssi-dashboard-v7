# Unifying course audio per language — design and sizing

**2026-08-18. Paper only.** Nothing was migrated, re-rendered, relinked or recast. No TTS was run.
Every query below was read-only. The deliverable is the scheme and the numbers behind it.

**A provenance note, because it nearly made this document wrong.** The working checkout is on a
`docs/…` branch whose `phase8-audio-v13.cjs` is 839 insertions behind `origin/main` — 7,277 lines
against 7,637. `origin/main` is byte-identical to the prod checkout the services actually run from.
**Every `phase8-audio-v13.cjs:N` citation below is `origin/main`/prod**, so the three
`findSiblingCourseClip` sites are **413 / 2277 / 5503**, not the 379 / 2268 / 5440 a stale checkout
shows.

The currency is Tom's, verbatim:

> *"it's worth doing all this de-duping because we might well save ourselves a lot of time, rather
> than money. The cost of extra clips in terms of generation and storage is trivial. The main issue
> is contention rates with xAI and Azure. So it's way better to not have to generate duplicates if
> we don't have to"*

So everything here is counted in **renders avoided** and **wall-clock**. Dollars appear once, in a
parenthesis, and are not the argument.

---

## The answer in six lines

- Had the estate always keyed clips by `(language, text, voice)` instead of by course, it would have
  rendered **400,656 fewer clips** — **16.1%** of everything it has ever made.
- If the **casting** were unified too — one voice per language per role, the way pods are cast —
  that rises to **653,521**, **26.2%**. The casting half is worth **252,865 renders on its own**, and
  nobody had sized it before.
- At the measured xAI rate of **6 clips/min**, 400,656 renders is **46 days** of continuous
  rendering; 653,521 is **76 days**. At the measured Azure rate of **17.3 clips/min**, **16 days**
  and **26 days**.
- **89.6% of the win is English** — one language, 103 courses.
- **All 400,656 of the voice-exact half is already reachable today** by a function that already
  exists, `findSiblingCourseClip()`, wired into more paths. It is called from **2 of the 9 render
  paths**; every repair, revoice and single-clip regeneration in the estate re-renders from scratch.
  Only the extra 252,865 needs the new scheme. That is the cheap first move and it should be taken
  first.
- For a genuinely new course the measured day-one coverage is **10–36%**, and it is almost entirely
  on whichever side is a language the estate already serves: `eng_for_hin` found **52.5%** of its
  English target audio already rendered and **0.6%** of its Hindi known side. `glg_for_eng` was the
  mirror image — **51.0%** of its English known side, **0.0%** of its Galician.

---

## Part 1 — What happens today

### Casting is per course, in a JSON blob on the course row

`courses.voice_config` holds the cast. It is a per-course document with one entry per role:

```json
{"voices": {
  "known":        {"voiceId": "en-GB-SoniaNeural", "provider": "azure", "language": "en-GB"},
  "target1":      {"voiceId": "zh-CN-XiaoxiaoMultilingualNeural", "provider": "azure"},
  "target2":      {"voiceId": "zh-CN-YunyiMultilingualNeural",   "provider": "azure"},
  "presentation": {"voiceId": "en-GB-SoniaNeural", "provider": "azure"}}}
```

(`zho_for_eng`, read live.) There is no per-language cast anywhere on the main-course path. The
`voices` table is a registry of what voices *exist* and what gender they are — it is not the cast.
`tools/pod-voices-xai.json` and the pool files `tools/pod-sync.cjs` reads are the **pod** cast, which
*is* per language, and which is the worked precedent for this whole document.

Two traps that must survive into any redesign, both already burned into the estate:

- **A course's target language is the `target_lang` column, never the course code.** `spa_mx_for_eng`
  carries `target_lang = 'spa'` and draws on the Iberian pool.
- **Regional variants share one pool key.** Resolve via `poolKeysForCourse()`
  (`tools/pod-sync.cjs`), never `poolKeyFor(target_lang)` — `tools/t21-resolved-cast-snapshot.cjs`
  exists specifically to show the three resolvers disagreeing.

The chain, read at render time in `/generate`: `courses` row read whole (`:1915-1919`) →
`voiceConfig.voices[role].voiceId` (`:1925-1926`) → `getVoiceForRole()` canonicalises it
(`:1960-1971`) → stamped onto every item (`:2107-2111`) → provider split off the canonical id at
dispatch (`:2318-2321`). Every other render path resolves identically from the same column
(`:2653`, `:4160`, `:4376`, `:4665`, `:4997`, `:5288`). `presentation` is the one role with its own
resolver, `resolvePresentationVoiceId()` (`services/presentation-author.cjs:311-325`), which for
`known_lang === 'eng'` **overrides the course's own config** with a hardcoded clone.

Eliminated as sources of the main-course cast, each by grep: the `voices` table (zero
`from('voices')` in phase8 — it is the *gender* registry), `tools/pod-voices-xai.json`, and the pool
files `pod-sync.cjs` reads (`phase8` contains **zero** references to `voice_pool_key`). Pods are
genuinely per-pool; main-course audio has no pool key at all. That absence is the finding.

What per-course casting costs, measured two ways. By clip: **18 distinct voices carry English
known-side audio** across 65 courses — `azure_en-GB-SoniaNeural` (47 courses, 271,164 keys),
`xai_gfzdpspr5fdp` (51 courses, 103,469), `xai_eve` (8 courses, 70,624), then fifteen long tails.
By config: **79 English-known courses share just 7 known voices; 20 English-target courses share 2.**

That second number is the real shape of the problem. **The estate is already behaving per-language;
it is only *storing* per-course.** The cast is a private JSON blob per course, so two courses
teaching the same sentence in the same language dedup only by the luck of having been configured
with the same voice. Where they diverge, the render is paid twice for no editorial reason at all.
(One live gap found in passing: 9 Welsh-known courses have no `voices.known.voiceId` in
`voice_config` at all.)

### A clip's identity contains the course code

`course_audio` is the table. Its uniqueness is
`UNIQUE (course_code, text_normalized, language, role, voice_id)` — **`course_code` is inside clip
identity**, and that single fact is what this whole commission turns on. The same English sentence
in the same voice, needed by nine courses, is nine rows and was nine renders.

`services/shared/clip-identity.cjs` already defines the canonical logical identity as
`(language, text_normalized, voice_id)` and already solves the spelling problem: 137 language
spellings for ~60 languages including the literal `'auto'`; ~100 voice bases carrying two or three
spellings each (`azure_en-GB-SoniaNeural` vs `en-GB-SoniaNeural`, 414,061 rows between them;
`xai_eve` vs `eve`). It deliberately **throws** on values that are not a language or a voice at all
rather than guessing. All the sizing below uses that module's canonicalisation, not a hand-rolled one.

`services/shared/text-normalize.cjs` is the second half of the key and carries its own warning: the
`text_normalized` column holds **two incompatible conventions**, because the trigger
`trg_course_audio_normalize` (`rtrim(lower(trim(t)), '.?!¿¡。？！')`) only landed in March 2026 and
rows written before it keep a trailing `?`. Every count below re-applies the trigger's own rtrim so
both conventions collapse onto one key.

### There is already a cross-course reuse path, and it is wired into 2 of 9 render paths

`services/phases/phase8-audio-v13.cjs:413` defines `findSiblingCourseClip()`. It is exactly the
unified lookup, already written:

```js
.neq('course_code', courseCode)
.in('text_normalized', audioKeyCandidates(normalizeForAudio(text)))
.eq('role', role)
.not('s3_key', 'like', 'pending/%')
.limit(200)
// then, in JS: sameLanguage(language, row.language) && sameVoice(voiceId, row.voice_id)
```

It matches on `(language, text, role, voice)` with both text conventions and both language and voice
spellings canonically bridged, and it is deliberately non-permissive — an uncanonicalisable stored
value returns `false` rather than a guess, because "a false positive here would link the WRONG audio
to a learner-facing slot" (`:410-411`). **Its matching IS the unified key.** Every duplicate this
document counts under the voice-exact key is a duplicate this function could have prevented.

It is called from two sites. Mapping all nine TTS dispatch blocks to their routes:

| render path | route | sibling reuse? |
|---|---|---|
| bulk generate | `POST /generate/:courseCode` `:1886` | ✅ `:2277` |
| component generate | `POST /generate-components/:courseCode` `:5261` | ✅ `:5503` |
| role re-render | `POST /regenerate-role` `:2623` | ❌ |
| single-clip re-render | `POST /regenerate-single` `:4117` | ❌ |
| presentation re-render | `POST /regenerate-presentation` `:4359` | ❌ |
| phrase re-render | `POST /regenerate-phrase` `:4639` | ❌ |
| lego re-render | `POST /regenerate-lego` `:4966` | ❌ |
| pod render | `POST /generate-pods` `:6869` | ❌ (confirmed — pods use their own narrower canon mechanism) |
| reuse-first rebuild | `POST /reuse-apply` `:7466` | ❌ (uses the separate planner, below) |

`grep -rn findSiblingCourseClip services/ tools/ api/` returns only those sites, the export and one
test. No other renderer in the estate reaches it — not `services/audio-repair.cjs`, not
`tools/revoice-clips.cjs`, not `tools/repair-presentation-clips.cjs`. **So every repair, revoice and
single-clip regeneration in the estate re-renders from scratch, cross-course reuse or not.** Both
live call sites also wrap the lookup in a `catch` that swallows every error and falls straight
through to paid TTS (`:2312-2314`, `:5532-5534`) — a silent failure mode that looks exactly like a
cache miss.

Two smaller findings on the function itself, both worth knowing and neither urgent:

- **`.limit(200)` is a latent cliff, not a live one.** The largest `(text_normalized, role)` group
  estate-wide is 142 rows; no group exceeds 200. It will bite eventually, not today.
- **A whitespace hole.** `:418` normalises twice — `audioKeyCandidates(normalizeForAudio(text))` —
  and `normalizeForAudio` collapses internal whitespace while `normalizeForDb` deliberately does not
  (it must stay byte-identical to SQL `normalize_text`). Measured blast radius: 94 rows estate-wide.

### And the planner Tom already specified exists, unwired

`services/audio-reuse-planner.cjs` is the reuse-first design already written down, mounted at
`/reuse-coverage`, `/reuse-plan`, `/reuse-apply` (`:7422`, `:7442`, `:7466`). Its header carries
Tom's own key, verbatim from 2026-08-07:

> *"set aside all clips for the first 10 ROUNDS / does this voice x text x lang combination exist
> already? / find it / then generate all missing clips"*

and his ruling that the lookup is **role-agnostic and direction-agnostic**: *"An English sentence
spoken by the clone as target2 in `eng_for_hin` COUNTS as coverage for the English known side of
`fra_for_eng`."* Measured there: role-scoping the query dropped the clone's English coverage on
`fra_for_eng` rounds 1-10 from 32 clips to 3.

**It is not called from `/generate`.** It is capped to 10 rounds by default and needs typed
confirmation to run. The capability exists; the wiring does not.

Finally, physical sharing already exists and is safe: `services/shared/clone-copy-index.cjs:10-19`
states the doctrine — *"logical ownership is per-course (every course gets its own `course_audio`
row), but PHYSICAL storage is shared — multiple rows across many courses/roles can point at the SAME
`s3_key`."* Safe because canonical `mastered/<uuid>.mp3` objects are write-once. So the unified
scheme is not inventing sharing; it is making the *lookup* as unified as the *storage* already is.

### Course-specific texts

`presentation` (130,716 rows, 85 courses) is the lego-introduction / narration layer. The pointer
trap: `lego_introductions.audio_uuid` is a *projection*, not the pointer. Both are written by one
helper, `bindPresentationAudio()` (`:2212-2247`), specifically so they cannot diverge — but **the
learner follows `course_legos.presentation_audio_id`**, confirmed in the delivery repo at
`api/courses/[code]/cycles.ts:739`, `api/courses/[code]/bundle.ts:356-366`, and
`packages/player-vue/src/providers/revisedAudioRefs.ts:44`.

Empirically presentation is the **least** shareable role in the estate: 0.9% duplication under the
voice-exact key, 10.1% under the ceiling, and 0.0% day-one coverage on every recent course measured.
The mechanism is visible in the text itself — a presentation line reads *"The Romanian for: 'I woke
up', as in — 'of course I woke up early', is:"*. It **names the target language**, so it is
shareable only within a `(target_lang, known_lang)` pair, not across a known language. That is
exactly what Tom predicted — *"any introductions are course specific necessarily"* — and it is the
strongest single piece of evidence that his reading of the problem is right.

The mirror image, and the sharpest case in the table: `instruction`, `encouragement`, `welcome` and
the two `bookend_listen_*` roles are pure **method furniture**, course-agnostic in every sense —
*"Okay, finally, time for the 10% rule!"*, *"Now just listen for a while."*. **657 distinct
instruction texts are stored as 3,306 rows across 69 courses; 8 welcome texts as 129 rows across 129
courses; 12 bookend texts as 59 rows each.** Small in absolute terms (~6,500 rows) but 76-79%
duplicated, and there is no argument at all for rendering them per course.

### What the per-course scheme costs, plainly

The same target-language sentence is rendered once per course that teaches it, and the same
known-language prompt is rendered once per course that uses it. Twenty-two courses teach English as
their target; between them they hold **486,535** distinct course-keys covering only **222,566**
distinct English texts. **263,969 of those renders were the same sentence, said again.**

---

## Part 2 — The unified scheme

**One paragraph.** A clip's identity is `(language, role, text_normalized, voice_id)` and nothing
else — the course code leaves the key. Voices are cast **per language per role**, exactly the way
pods are cast today: English-as-known gets one voice (per gender where the content needs two),
Chinese-as-target gets one, and a course inherits its cast from its languages rather than declaring
its own. A render is then a cache miss and only a cache miss: ask the store for
`(language, role, text, voice)`, and render only if it is not there. Texts that only ever appear in
one course — `"I want to speak Chinese with you now"`, every lego introduction, every course-specific
prompt — are **ordinary members of that store with one consumer**. They need no special tier, no
per-course layer and no fallback hierarchy; having one consumer is a property of the content, not of
the scheme. Measured: **93.5% of unified keys have exactly one consumer** (1,954,330 of 2,090,271),
and the scheme handles them by doing nothing special at all.

### What needs care

| | |
|---|---|
| **Known-side register** — **narrower than it looked** | The brief flagged this as open: the known side is instructional register (*"now say…"*), arguably a different role from target material in the same language. But **Tom already ruled on the keying half**, on 2026-08-07, and it is written into `services/audio-reuse-planner.cjs`: the reuse key is role-agnostic and direction-agnostic — *"An English sentence spoken by the clone as target2 in `eng_for_hin` COUNTS as coverage for the English known side of `fra_for_eng`."* So role should **not** be in the key by default; I have kept it in the headline numbers only as the conservative floor (see below). What genuinely remains open is the *casting* question — whether the instructional voice should be a different voice from the target voice within one language. That is one taste call, not an architecture call. |
| **Pacing** | Tom's own answer: *"Given that we have absolute speed control in the player"*. Today pace is decided at **render**, not playback — the belt ramp floors at 0.70 and xAI takes no speed parameter at all, so a per-course `settings.speed` bakes a course's pace into its bytes and would split the key. This is not hypothetical: `services/shared/clone-copy-match.cjs` records that **Azure bakes the configured speed into the stored MP3 and `course_audio` has no persisted per-row speed**, so an Azure clip's pace cannot be verified after the fact — which is precisely why the planner's cross-role guard is *engine-shaped* (xAI and ElevenLabs are always 1x, so crossing is free; Azure is not). Under the unified scheme pace becomes purely a playback concern, which the player already supports. This is the one place the scheme *requires* a behaviour change rather than just permitting one, and the Azure speed column is the concrete thing to fix. |
| **Regional variants** | `fra_ca` vs `fra_fr`, `por_br` vs `por_pt`, `spa_mx` vs `spa`. Language canonicalises region-free (`fr-CA` → `fra`) and **voice is what tells them apart inside the key** — `azure_fr-CA-SylvieNeural` vs `azure_fr-FR-CelesteNeural`. The estate already agrees: `fra_ca_for_eng` stores `'fra'` on 61,030 rows. This works, but only because voice stays in the key; do not be tempted to drop it. |
| **Human recordings** | The clip-identity language allowlist rejects 14 languages, and the human-recording upload path bypasses the guard entirely. `human_aran_cym_n` appears as an English known-side voice on 26 keys. Human clips must enter the store as first-class members with a `human_*` voice id, never as an exception. |
| **`audio_clips` canon** | Its backfill is oldest-object-wins and its trigger is INSERT-only, so it can hold a *superseded* take; converging on it would restore superseded takes across 262,097 rows. A human-QA'd clip **is** the canon and outranks it. Under a shared store this matters more, not less: one bad promotion now reaches every consumer. Any unified store must promote from human decisions, never over them. |

---

## Part 3 — Sizing the win

### Method, and what was excluded

Grouping key: `canonicalLanguage(language)` × `canonicalVoiceId(voice_id)` from
`services/shared/clip-identity.cjs`, × `rtrim(lower(trim(text_normalized)), '.?!¿¡。？！')` (the
trigger's own normalisation, re-applied so both historical text conventions collapse), × `role`.
Language/voice canonicalisation was computed in Node from the 887 distinct `(language, voice_id)`
pairs and pushed back into SQL as a temp mapping table, so the module — not a hand-rolled regex —
decided every grouping.

Counts are of **distinct `(course_code, key)`**, not raw rows. That deliberately isolates the
course-split component and excludes intra-course re-renders, which are a different problem.

| | rows |
|---|---|
| `course_audio` total | 2,565,528 |
| canonicalisable | **2,500,026** (97.45%) |
| **excluded** | **65,502** (2.55%) |

**EXPLICIT GAP.** The 65,502 excluded rows are 186 of 887 `(language, voice_id)` pairs the module
refuses to guess at: 184 with an uncanonicalisable voice — `legacy_import` (39,391 rows, mostly
`cym` and `eng`), bare `human`/`human_recording` (2,504), and 180 pairs carrying opaque clone ids
with no provider prefix and no registry entry (15,760 rows) (`f15c6a6a`, `b1a7441b97a1`, `yis75yfp`, `EXAVITQu4vr4xnSDxMaL` …) —
plus 2 with language `'auto'` (7,847 rows). They are 2.55% of the estate and the win among them is
unmeasured, not zero. Resolving those voice ids against the render jobs that made them is a separate,
cheap, worthwhile job.

### Headline

| | course-keys | unified keys | **renders avoided** | % |
|---|---|---|---|---|
| **Unified keying only** (voice as cast today) | 2,490,927 | 2,090,271 | **400,656** | **16.1%** |
| **+ unified casting** (one voice per language+role) | 2,490,927 | 1,837,406 | **653,521** | **26.2%** |

Both rows keep `role` in the key, which is the **conservative floor**: it is what
`findSiblingCourseClip()` enforces today. Dropping role, per Tom's 2026-08-07 ruling that reuse is
role-agnostic, adds **38,241 more** — 438,897 renders avoided, 17.6% — subject to the Azure
baked-speed guard above. I have led with the role-scoped number so nothing here depends on that
being re-confirmed.

The gap between the two rows above — **252,865 renders** — is the casting half, and it is the part
nobody had sized. It is 39% of the total available win and it is invisible to any amount of clip-store
cleverness, because two courses that render the same English sentence in two different English voices
are not duplicates under any key that contains voice.

### Target side vs known side

| role | course-keys | renders avoided (voice-exact) | % | ceiling (unified casting) | % |
|---|---|---|---|---|---|
| **known** | 788,758 | **164,440** | 20.8% | 256,301 | 32.5% |
| **target1** | 756,312 | **102,934** | 13.6% | 175,744 | 23.2% |
| **target2** | 718,907 | **94,009** | 13.1% | 169,199 | 23.5% |
| pod_fine_known | 41,992 | 27,018 | 64.3% | 27,018 | 64.3% |
| pod_explainer | 42,986 | 6,977 | 16.2% | 7,955 | 18.5% |
| **presentation** | 129,313 | **1,194** | **0.9%** | 13,117 | 10.1% |
| instruction | 2,541 | 1,932 | 76.0% | 1,932 | 76.0% |
| encouragement | 2,540 | 1,933 | 76.1% | 1,933 | 76.1% |
| welcome / bookends | 202 | 158 | 78% | 160 | 79% |

Known-side duplication (20.8%) runs half again ahead of target-side (13.4% across both target roles)
— because the estate is overwhelmingly `X_for_eng`, so one known language is shared by a hundred
courses while most target languages have one or two. Tom's corollary — *"the target language is
always re-usable for any Chinese for X speakers course"* — is true and is where the **future** win
sits; the estate simply has not built many `zho_for_X` courses yet. Where it has, the target-side
number is already large: English-as-target across 22 courses is **263,969 avoidable renders, 54.3%**.

And `presentation` at 0.9% is the honest confirmation that course-specific narration is genuinely
course-specific. It is 5% of the corpus and it shares almost nothing. That costs the scheme nothing —
it just sits in the store with one consumer.

### By language

| language | courses | course-keys | renders avoided | % |
|---|---|---|---|---|
| **eng** | 103 | 1,095,818 | **359,118** | **32.8%** |
| zho | 15 | 113,232 | 9,050 | 8.0% |
| spa | 7 | 110,690 | 5,829 | 5.3% |
| jpn | 12 | 71,631 | 5,217 | 7.3% |
| kor | 4 | 91,099 | 4,700 | 5.2% |
| ita | 4 | 59,653 | 4,028 | 6.8% |
| hin | 4 | 59,968 | 3,454 | 5.8% |
| eus | 2 | 29,780 | 2,605 | 8.7% |
| tam | 3 | 43,917 | 2,001 | 4.6% |
| cat | 2 | 25,853 | 1,668 | 6.5% |
| deu | 5 | 70,297 | 1,299 | 1.8% |
| fra | 6 | 101,881 | 888 | 0.9% |
| ara | 5 | 59,759 | 541 | 0.9% |
| por | 3 | 65,262 | 258 | 0.4% |
| **35 single-course languages** | 1 each | 436,251 | **0** | 0% |

Eighteen languages appear in more than one course; thirty-five appear in exactly one.

**English is 89.6% of the win.** Everything else put together is 41,538 renders. That is worth saying
plainly, because it changes what "adopt this" means: adopting per-language casting for **English
alone** captures nine tenths of the value and touches one voice decision.

The 35 single-course languages contributing zero are not a failure — they are the single-consumer
case, working correctly.

### Renders avoided → wall-clock

Assumptions, one line each, all overturnable:

- **xAI: 6 clips/min.** Measured 2026-08-17 on watson-1 during the A-136 Dutch re-render (335 clips):
  26.5 s per render at 1–5 concurrent workers, 107 s at 12 — the cap is xAI's server-side queue, not
  the box. `XAI_MAX_CONCURRENT` defaults to 4 (`services/tts-service.cjs:51`). ~5 workers is the
  sweet spot and more buys nothing.
- **Azure: 17.3 clips/min.** Measured 2026-08-07 on this machine, DEU render + whisper gate, 0 failed
  (`docs/audio-repair-2026-08-07/overnight-shepherd-and-the-incomplete-snapshot-2026-08-07.md`). This
  is render *plus* veracity gate, so it is a realistic pipeline rate rather than a bare API rate.
- Continuous rendering, no operator idle time, no retries beyond those already in the measurement.

| | at xAI 6/min | at Azure 17.3/min |
|---|---|---|
| **400,656** renders (unified keying) | 66,776 min = **1,113 h = 46 days** | 23,159 min = **386 h = 16 days** |
| **653,521** renders (+ unified casting) | 108,920 min = **1,815 h = 76 days** | 37,776 min = **630 h = 26 days** |
| the casting half alone (252,865) | **29 days** | **10 days** |

Read those as *contention avoided*, not as a bill someone would otherwise pay in one go. The estate
accumulated this over eighteen months. But the shape is the point: at xAI's rate, the English
known-side duplication alone (359,118 renders) is **41 days of queue** that need never have been
occupied — and it is exactly the queue Kai is about to want.

(Spend, once, parenthetically: at typical neural-TTS list rates the 400,656 duplicate renders are in
the low thousands of dollars. Trivial, as Tom said. The 46 days are not.)

### Day one for a new course — measured, not modelled

For each of the twelve newest substantial courses, what fraction of its keys had **already been
rendered by another course before it started**:

| course | keys | build started | voice-exact | voice-blind (unified casting) |
|---|---|---|---|---|
| zho_for_hin | 39,461 | 2026-08-02 | 14.6% | **18.0%** |
| zho_for_tam | 32,166 | 2026-08-01 | 3.2% | **14.7%** |
| kor_for_hin | 43,424 | 2026-08-01 | 13.8% | **16.3%** |
| kor_for_tam | 42,529 | 2026-07-31 | 2.1% | **10.0%** |
| glg_for_eng | 15,931 | 2026-07-14 | 15.6% | **16.2%** |
| eng_for_tel | 40,921 | 2026-07-05 | 27.9% | **29.2%** |
| eng_for_kan | 44,664 | 2026-07-05 | 21.8% | **22.7%** |
| eng_for_mar | 39,377 | 2026-07-05 | 29.8% | **30.6%** |
| ben_for_eng | 20,311 | 2026-07-03 | 11.4% | **11.6%** |
| eng_for_hin | 51,202 | 2026-06-11 | 33.0% | **35.9%** |
| afr_for_eng | 13,393 | 2026-05-14 | 16.9% | **17.4%** |
| rus_for_eng | 20,286 | 2026-05-13 | 15.8% | **16.1%** |

**Day-one coverage is 10–36%.** But the aggregate hides the real finding, which is in the role split:

| course | role | keys | already rendered elsewhere |
|---|---|---|---|
| **eng_for_hin** | target1 (English) | 17,486 | **52.5%** |
| | target2 (English) | 17,417 | **52.4%** |
| | known (Hindi) | 12,460 | 0.6% |
| | presentation | 2,930 | 0.0% |
| **glg_for_eng** | known (English) | 5,046 | **51.0%** |
| | target1/2 (Galician) | 10,058 | 0.0% |
| | presentation | 826 | 0.0% |
| **zho_for_hin** | target1/2 (Chinese) | 24,640 | 20.3% |
| | known (Hindi) | 12,817 | 16.3% |
| **kor_for_tam** | target1/2 (Korean) | 26,928 | 12.6% |
| | known (Tamil) | 13,663 | 6.4% |

That is Tom's model, confirmed by data he has not seen. A new course gets **roughly half of any side
whose language the estate already serves in volume, and nothing for a side it does not** — and the
narration layer is always zero. `eng_for_hin` and `glg_for_eng` are exact mirror images of each
other, which is as clean a demonstration as the estate is going to give.

Two live implications for Kai's queue:

- **A new `X_for_eng` course starts with ~half its known side already rendered.** ~5,000 clips it
  does not queue. At xAI, ~14 hours of contention it does not occupy.
- **A new `eng_for_X` course starts with ~half its target side already rendered** — ~35,000 clips for
  a course the size of `eng_for_hin`, four days of xAI queue.
- A new pair where **neither** language is well-served (`kor_for_tam` at 10%) gets very little, and
  should be planned as a full render.

### How much needs the new scheme, and how much is just wiring

`findSiblingCourseClip()` already matches on `(language, text, role, voice)` with both text
conventions and both language and voice spellings handled. That is precisely the voice-exact unified
key. So:

| | renders | needs |
|---|---|---|
| **400,656** (61%) | already reachable | **wiring an existing function into more render paths** — no schema change, no recasting, no migration |
| **252,865** (39%) | not reachable at any wiring | **per-language casting** — one voice decision per language per role |

**That distinction is the most actionable thing in this document.** Sixty-one percent of the win is a
code-wiring job on a function that already exists, already handles the spelling traps, and is already
correct. It requires no ruling from Tom, no migration, and nothing moves. The work order is the
render-path table in Part 1: **seven of nine paths do not call it**, and the two that do swallow
every lookup error into a silent fall-through to paid TTS.

### Measurement traps navigated

All named in the brief, all real, all handled:

- **Voice bare-vs-prefixed** — `eve` and `xai_eve` are one voice; matching one spelling misses ~14%.
  Handled by `canonicalVoiceId()`, not by SQL.
- **137 language spellings for ~60 languages**, including literal `'auto'`. Handled by
  `canonicalLanguage()`; `'auto'` rows excluded and counted above.
- **The ` … ` pause cue** in `course_audio.text` — avoided entirely by grouping on
  `text_normalized`, never on raw `text`.
- **Two text conventions in `text_normalized`** — collapsed by re-applying the trigger's own rtrim.
  This is not in the original brief and it matters: without it, every pre-March-2026 question-ending
  row is a false non-duplicate.
- **psql printing its command tag after RETURNING** — no RETURNING was used; everything is SELECT.
- No statement timeouts were hit; the aggregate ran whole over 2.5M rows in one session using temp
  tables, so no chunking was needed.

---

## Part 4 — What it would take

Sized, not done. **No SQL below was run.** No schema change was applied.

**1. The casting layer.** A per-language cast table or file, with the same shape pods already use:
`(language, role, gender) → voice_id`. `courses.voice_config` stops being the source of truth and
becomes a per-course *override* for the cases that genuinely need one — or is dropped entirely.
Resolution must go through the pod-proven resolver (`poolKeysForCourse()`), not a fresh one, and must
read `courses.target_lang`, never the course code; note only 16 of 145 course rows carry a
`voice_pool_key` today, and 16 `(target_lang, known_lang)` pairs hold more than one course, so the
base/variant collisions the resolver exists to handle are live. This is where the register question
lands: if the ear wants a different English voice for instruction than for target material, it is one
extra row per language, not a redesign. Also fix `resolvePresentationVoiceId()`, which currently
overrides a course's declared English presentation voice with a hardcoded clone
(`presentation-author.cjs:315-318`) — under a per-language cast that override becomes the cast, and
it should be stated rather than hidden.

**2. The render lookup.** Today: *does this course have this clip?* Under the scheme: *does the store
have `(language, text, voice)`?* Nothing needs writing — **both halves already exist**.
`findSiblingCourseClip()` is the per-clip lookup and is already correct; it needs calling from the
seven render paths that skip it, its swallow-all `catch` needs to log and count rather than fall
silently through to TTS, and `.limit(200)` should be raised before it bites. `audio-reuse-planner.cjs`
is the batch planner, carries Tom's own role-agnostic key, and needs mounting on `/generate` rather
than only on its three manual routes. This is the cheap 61% and it is a wiring job, not a build.

**3. Adopt-for-new.** New courses cast from the per-language table and check the store before every
render. Nothing existing is touched. This is the only adoption mode recommended, and it is where all
the forward-looking numbers in Part 3 come from.

**4. Existing content.** Under the standing gradual-replacement ruling: replaced as it is naturally
touched, never in a wave. The 400,656 historical duplicates stay exactly where they are. They are
already paid for; the number's job is to size the *future*, not to commission a cleanup.

**5. The 65,502 uncanonicalisable rows.** Separate, small, worth doing: resolve the ~170 opaque voice
ids against the render jobs that created them so the store can see them. Read-only investigation
first.

**Order:** 2 → 3 → 1 → 5. Wiring first because it is free and needs no ruling; adopt-for-new next
because it is where Kai's win is; casting third because it needs Tom's ear on register and one voice
decision per language; the orphan-voice cleanup whenever.

---

## Part 5 — Recommendation

**Adopt it, English first, and do the wiring before the casting.** The scheme is better because a
clip's identity should describe the clip and not the course that happened to need it first; simpler
because it deletes a concept (per-course audio) rather than adding one, and because 93.5% of texts
have exactly one consumer and the scheme handles them by doing nothing at all; and cheaper in the
only currency that matters here — 400,656 renders of xAI and Azure queue that need never have been
occupied, 46 days at the rate xAI actually gives us, rising to 76 days if the casting is unified too.
Nine tenths of that is English. And the first move turns out to be cheaper than the commission
assumed, because **both the lookup and the planner are already built**: `findSiblingCourseClip()` is
correct and called from two of nine render paths, and `audio-reuse-planner.cjs` already carries Tom's
own 2026-08-07 reuse key and is mounted on three manual routes but never on `/generate`. Wiring those
into every render path needs no ruling, no migration and no recast, and captures 61% of the available
win. Only then cast English-as-known and English-as-target per language rather than per course, which
captures most of the rest. The honest limits: for a new pair where neither language is already served
the win is about 10%, narration never shares at all because the text names the target language, and
2.55% of the estate could not be measured because its voice ids are opaque. None of that changes the
recommendation — it just means the pitch is "half of one side of every new course, free" rather than
"half of every new course, free", and half of one side is still four days of xAI queue on a course
the size of `eng_for_hin`.

**One thing needs Tom, answerable in one word.** Not the keying — he already ruled that role-agnostic
in 2026-08-07 and it is in the code. The remaining question is **casting**: should the known side —
instructional register, *"now say…"* — be cast as a **different voice** from target-language material
in the same language, or the same one? Same is simpler and dedups more; different may be what the ear
wants. *Same* / *Different*.

---

*Sources: live `course_audio` (2,565,528 rows) and `courses`, read-only, 2026-08-18;
`services/shared/clip-identity.cjs`; `services/shared/text-normalize.cjs`;
`services/phases/phase8-audio-v13.cjs:413,2277,5503` (**`origin/main`/prod line numbers**);
`services/audio-reuse-planner.cjs`; `services/presentation-author.cjs:311-325`;
`services/shared/clone-copy-index.cjs`; `services/tts-service.cjs:51`; `tools/pod-sync.cjs`;
learner pointer verified in `ssi-learning-app` (`api/courses/[code]/cycles.ts:739`,
`bundle.ts:356-366`). xAI throughput measured 2026-08-17 (A-136 Dutch re-render); Azure throughput
measured 2026-08-07 (`docs/audio-repair-2026-08-07/`). Code map by worker #981. Builds on
`docs/architecture/AUDIO_PIPELINE_CONTENT_ADDRESSED_DESIGN-2026-08-06.md`.*
