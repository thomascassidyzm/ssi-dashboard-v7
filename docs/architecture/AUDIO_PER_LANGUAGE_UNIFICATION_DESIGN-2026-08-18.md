# Unifying course audio per language — design and sizing

**2026-08-18. Paper only.** Nothing was migrated, re-rendered, relinked or recast. No TTS was run.
Every query below was read-only. The deliverable is the scheme and the numbers behind it.

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
  exists, `findSiblingCourseClip()`, wired into more paths. Only the extra 252,865 needs the new
  scheme. That is the cheap first move and it should be taken first.
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

What per-course casting costs, measured: **18 distinct voices carry English known-side audio** across
65 courses. Three of them carry the bulk — `azure_en-GB-SoniaNeural` (47 courses, 271,164 keys),
`xai_gfzdpspr5fdp` (51 courses, 103,469), `xai_eve` (8 courses, 70,624) — and fifteen more carry
long tails of a few hundred keys each. Every text rendered in two of those voices is a text rendered
twice.

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

### There is already a cross-course reuse path, and it is barely wired in

`services/phases/phase8-audio-v13.cjs:379` defines `findSiblingCourseClip()`. It is exactly the
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
spellings handled. It is called from **two** sites — `:2268` and `:5440`. **Pods never call it.** The
detailed path-by-path map of which render paths reach it is worker **#981**'s deliverable; what is
already certain from the code is that the function's *matching* is the unified key, so every
duplicate this document counts under the voice-exact key is a duplicate that function could have
prevented. One caveat worth fixing whenever it is next touched: `.limit(200)` before the JS filter
means a very common text — `"yes"`, `"again"` — can have its 200 candidates exhausted by rows in the
wrong voice and fall through to a render that was not needed.

### Course-specific texts

`presentation` (130,716 rows) is the lego-introduction / narration layer. Note the pointer trap:
`lego_introductions.audio_uuid` is the S3 *filename*, while the learner reads `course_legos` — trace
the real pointer, not the one the table name suggests. Empirically presentation is the **least**
shareable role in the estate: 0.9% duplication under the voice-exact key, 10.1% under the ceiling,
and 0.0% day-one coverage on every recent course measured. That is exactly what Tom predicted —
*"any introductions are course specific necessarily"* — and it is the strongest single piece of
evidence that his reading of the problem is right.

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
| **Known-side register** — **OPEN, needs Tom's ear** | The known side is instructional register (*"now say…"*), a different ROLE from target material in the same language. `role` is already a column on the render path and already in the key above, so per-(language, role, voice) costs nothing to adopt. But if the ear says the instructional voice and the target voice must differ even within one language, that is a *casting* ruling, not a scheme change. One line for Tom, not a blocker. |
| **Pacing** | Tom's own answer: *"Given that we have absolute speed control in the player"*. Today pace is decided at **render**, not playback — the belt ramp floors at 0.70 and xAI takes no speed parameter at all, so a per-course `settings.speed` bakes a course's pace into its bytes and would split the key. Under the unified scheme pace becomes purely a playback concern, which is what the player already supports. This is the one place the scheme *requires* a behaviour change rather than just permitting one. |
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

The gap between those two rows — **252,865 renders** — is the casting half, and it is the part
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
code-wiring job on a function that already exists and already handles the spelling traps. It requires
no ruling from Tom, no migration, and nothing moves. Worker **#981** is mapping which render paths do
and do not reach it; that map is the work order.

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
read `courses.target_lang`, never the course code. This is where the register question lands: if the
ear wants a different English voice for instruction than for target material, it is one extra row per
language, not a redesign.

**2. The render lookup.** Today: *does this course have this clip?* Under the scheme: *does the store
have `(language, role, text, voice)`?* `findSiblingCourseClip()` is 90% of that query already — it
only needs the `.neq('course_code', …)` dropped, the `.limit(200)` raised or made voice-filtered in
SQL, and to be called from every render path rather than two. This is the cheap 61%.

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
Nine tenths of that is English, so the first move is small: wire `findSiblingCourseClip()` into every
render path, which needs no ruling and no migration and captures 61% of the available win, then cast
English-as-known and English-as-target per language rather than per course, which captures most of
the rest. The honest limits: for a new pair where neither language is already served the win is about
10%, narration never shares at all, and 2.55% of the estate could not be measured because its voice
ids are opaque. None of that changes the recommendation — it just means the pitch is "half of one
side of every new course, free" rather than "half of every new course, free", and half of one side is
still four days of xAI queue on a course the size of `eng_for_hin`.

**One thing needs Tom, answerable in one word:** should the known side — instructional register,
*"now say…"* — be cast as a **different voice** from target-language material in the same language,
or the same? `role` is already in the key either way, so this is a taste call, not an architecture
call. *Same* / *Different*.

---

*Sources: live `course_audio` (2,565,528 rows) and `courses`, read-only, 2026-08-18;
`services/shared/clip-identity.cjs`; `services/shared/text-normalize.cjs`;
`services/phases/phase8-audio-v13.cjs:379,2268,5440`; `services/tts-service.cjs:51`;
`tools/pod-sync.cjs`; xAI throughput measured 2026-08-17 (A-136 Dutch re-render); Azure throughput
measured 2026-08-07 (`docs/audio-repair-2026-08-07/`). Builds on
`docs/architecture/AUDIO_PIPELINE_CONTENT_ADDRESSED_DESIGN-2026-08-06.md`.*
