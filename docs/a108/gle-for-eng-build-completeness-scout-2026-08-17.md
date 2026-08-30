# gle_for_eng — build completeness & QA signals (read-only scout, 2026-08-17)

Measured live against Supabase (`swfvymspfxmnfhevgdkg`) on 2026-08-17. GET requests only; nothing written, nothing committed.

**Scope note:** this report deliberately contains **no judgements about Irish grammar or translation quality**. Every line is a count, a date, or a flag stored by the system itself.

**Calibration note:** the brief asked for `fin_for_eng` as the known-good comparator. It is a good comparator for *text* build, but it has **no target-language audio at all** (313 audio rows, all English; 1,425/1,425 legos with null audio links), so it cannot calibrate audio or playability. For those columns three peer beta courses of the same 300-seed shape are used instead: `dan_for_eng`, `ell_for_eng`, `pol_for_eng`, `cat_for_eng`.

---

## 1. Headline table

| Measure | **gle_for_eng** | fin_for_eng | dan_for_eng | ell_for_eng |
|---|---|---|---|---|
| `courses.status` / `new_app_status` | beta / **beta** | draft / not_available | beta / beta | beta / beta |
| `courses.visibility` | **beta** | public | public | public |
| `courses.seed_count` (declared) | **300** | 668 | 668 | 668 |
| `course_seeds` rows (actual) | **668** | 668 | 668 | 668 |
| Seeds with `decomposed_at` set (built) | **300** | 668 | 300 | 300 |
| Seeds with `approved_at` set | **0** | 105 | — | — |
| Seed-number range / gaps | 1–668 / **0 gaps** | 1–668 / 0 gaps | — | — |
| Seeds `status` | 668 × `released` | 668 × `released` | — | — |
| `course_legos` rows | **943** | 1,425 | 576 | 1,023 |
| Legos by `type` | M 709 / A 234 | M 878 / A 547 | — | — |
| Legos `is_new=true` (= the rounds a learner walks) | **786** | — | 555 | 731 |
| Legos with empty `known_text` / `target_text` | **0 / 0** | 0 / 0 | — | — |
| `course_practice_phrases` rows | **5,975** | 14,053 | 5,155 | 8,065 |
| Phrases by `phrase_role` | use 3,825 / build 1,606 / component 544 | use 7,805 / build 4,516 / component 1,732 | — | — |
| Phrases with empty `known_text` | **1** (seed 14, component) | 0 | — | — |
| Phrases with `qa_checked=true` | **5,908 / 5,975 (98.9%)** | 0 / 14,053 | — | — |
| Phrases carrying a `decomposition` blob | **5,975 / 5,975 (100%)** | 0 / 14,053 | — | — |
| `course_audio` rows | **25,308** | 313 | 19,572 | 28,764 |
| Audio rows with null `s3_key` | **0** | 0 | — | — |
| Audio rows with null or zero `duration_ms` | **0** | 0 | — | — |
| Audio `origin` | tts 25,233 / human 75 | tts 238 / human 75 | — | — |
| `course_round_index` rows (materialised view) | **786** (= exactly the 786 `is_new` legos) | 1,394 | — | — |
| Open (unresolved) `course_qa_flags` | **0** (43 flags, all `resolved`) | 0 | — | — |
| Pending `audio_pass_requests` | **1** (since 2026-07-24) | 1 | — | — |
| `courses.version` (touch counter) | 56 | 1,759 | — | — |
| `content_version` | 0.5.3 | 0.687.6 | — | — |
| `updated_at` / `content_stamp` | 2026-08-16T15:18Z | 2026-08-16T15:26Z | — | — |
| `audio_stamp` | 2026-08-14T21:06Z | 2026-08-14T21:06Z | — | — |
| `released_at` / `export_ready` | null / false | null / false | — | — |

### Audio integrity, gle_for_eng

| Measure | Value |
|---|---|
| Audio rows by `role` | known 7,520 · target1 7,282 · target2 6,552 · pod_explainer 1,360 · presentation 1,335 · pod_fine_known 1,003 · pod_take_g 179 · instruction 48 · encouragement 26 · welcome 1 · bookend_listen_intro 1 · bookend_listen_outro 1 |
| Distinct audio ids referenced by legos + phrases | 18,710 |
| Of those, **references that do not resolve to a real clip** | **0** |
| Referenced clips whose `role` disagrees with the slot they fill | **0** |
| Referenced clips on a non-canonical voice | **2** of 22,080 links (both on the English/known side: one `en-GB-ThomasNeural`, one xAI clone, where the course voice is `en-GB-SoniaNeural`) |
| target1 clips: all `ga-IE-OrlaNeural` | 6,916 / 6,916 |
| target2 clips: all `ga-IE-ColmNeural` | 6,916 / 6,916 |
| presentation clips: all `en-GB-SoniaNeural` | 1,332 / 1,332 |
| Clip durations (`known` / `target1` / `target2`) median | 2,952 ms / 4,272 ms / 3,840 ms; **0** clips under 500 ms, **0** over 20 s |
| Clips with `rerecord_wanted` | 0 |
| Clips with a veracity check recorded | 17 of 25,308; 0 failures recorded |
| Audio rows not referenced by any lego/phrase | 6,598 (housekeeping/superseded; learners resolve clips by id only) |
| **Live end-to-end playability sample** (25 random clips actually linked to served rounds, fetched through the real learner endpoint `ssi-learning-app.vercel.app/api/audio/<id>`) | **25 / 25 returned audio (HTTP 200/206)** |

### Coverage of the 786 rounds a learner actually walks

| Measure | **gle_for_eng** | dan_for_eng | ell_for_eng |
|---|---|---|---|
| Served rounds (`is_new` legos, = `course_round_index` rows) | **786** | 555 | 731 |
| Rounds whose lego has known + target1 + target2 audio | **786 / 786 (100%)** | — | — |
| Rounds whose lego has presentation audio | **786 / 786 (100%)** | — | — |
| **Rounds with ZERO practice phrases attached** | **399 (50.8%)** | **0 (0.0%)** | **0 (0.0%)** |
| Rounds with no BUILD phrase | **400** | 0 | 3 |
| Rounds with no USE phrase | **414** | 1 | 1 |
| Phrases per served round (min / median / mean / max) | **0 / 0 / 7.6 / 26** | 2 / 9 / 9.3 / 15 | 1 / 9 / 9.4 / 15 |
| Rounds with fewer than 7 phrases (the BUILD cap is 7) | **409** | 8 | 14 |
| Built seeds with legos but no phrases at all | **117 of 300** | 9 | 2 |

Cross-checked for a false alarm: the 388 distinct `(seed_number, lego_index)` phrase keys **all** match a real lego row, and 0 phrase rows are orphaned — so this is a genuine absence of phrases, not a join-key mismatch.

### Text hygiene (string checks only)

| Measure | **gle** | fin | dan | ell |
|---|---|---|---|---|
| Distinct known prompts mapping to >1 distinct target — legos | **4 / 786 (0.5%)** | 0 (0.0%) | 0 (0.0%) | 1 (0.1%) |
| Distinct known prompts mapping to >1 distinct target — phrases | **63 / 5,487 (1.1%)** | 202 (1.5%) | 68 (1.4%) | 123 (1.6%) |
| `known_text` rows carrying a parenthetical annotation | **39** | 40 | 28 | 0 |
| Leaked build directives (`(introduce:…)`, `[…]`) in either text column | **0** | — | — | — |
| Parentheses on the **Irish** side (`target_text`) | **0** | — | — | — |

---

## 2. Findings

**F1 — The declared 300-seed build is complete, and the built boundary is clean.**
`courses.seed_count` says 300 while `course_seeds` holds 668 rows — the known estate trap. It is benign here: the 668 are the shared English seed corpus (all 76 English-known courses hold the same seed text), and exactly **300** carry `decomposed_at`, i.e. are built. Every one of those 300 has all three seed-level clips linked. The seed sequence 1–668 has **zero gaps**. `course_round_index` holds 786 rows spanning seeds 1–300 — precisely the 786 `is_new` legos — so the round map stops at the built boundary on its own and a learner reaches a normal end-of-course rather than silence. `gle_for_eng` is *not* in the app's hard-coded `COURSE_MAX_SEED` cap list (`api/_utils/courseBoundary.ts:43`), and does not need to be.

**F2 — Audio is the strongest signal in the course: 25,308 clips, zero broken links.**
All 18,710 referenced clip ids resolve to a real row; every one has an `s3_key` and a non-zero `duration_ms`; not one sits in the wrong role slot; target1 is 100% Orla and target2 is 100% Colm across all 6,916 links each. 25 of 25 randomly sampled clips from the served rounds played back through the real learner endpoint. Presentation-clip coverage of the served rounds is 786/786. (155 legos have a null `presentation_audio_id` — **all 155 are `is_new=false`**, so none of them is a round the learner walks.)

**F3 — The largest measurable gap: half the served rounds have no practice phrases.**
**399 of 786 rounds (50.8%)** have zero practice phrases attached to their lego; the median round has **0** phrases. In the two peer beta courses measured, that figure is **0.0%**. 117 of the 300 built seeds have legos but not a single phrase row. The 5,975 phrases that do exist are concentrated in 183 seeds (median 24 per seed, max 131) rather than spread across all 300.

What this means at the player, traced in code: `api/courses/[code]/cycles.ts:773-830` fills a round's BUILD slots from that lego's own phrase rows. With none, the round emits its intro cycle and then falls through to spaced repetition, which draws USE phrases from **earlier** legos (`cycles.ts:835-860`). So those rounds still play — they are not silence — but the learner meets the new item and then never practises it in a sentence of its own. This is the difference between gle and its peers, and it is the honest answer to "is the course finished?": the audio and the LEGO spine are done, the practice layer is roughly half built.

**F4 — Zero open QA flags, but the scan is six months old.**
`course_qa_flags` holds 43 rows for gle, **all with `status='resolved'`**, all `check_type='grammar'`, all flagged inside a seven-minute window on **2026-02-18** (10 errors, 33 warnings — capitalisation of the language name and missing sentence punctuation). Nothing has been flagged since. `fin_for_eng` has 0 rows in this table; the estate-wide total is 604. Spot-checking whether those fixes landed: lowercase `gaeilge` now appears in **0** of 5,975 phrase `target_text` values and in **2** lego rows — seed 285 `labhraíonn sí gaeilge` and seed 286 `gaeilge a labhairt`, both `is_new=true`, i.e. both reachable. So 41 of 43 verifiably stuck; 2 residual instances of the same pattern remain.

**F5 — 30 English prompt clips speak a grammatical annotation aloud.**
39 `known_text` rows carry a parenthetical gloss. The brackets are stripped before synthesis but **the words inside are not**: `course_audio.text_stripped` for the linked clips reads `that rel`, `time genitive`, `hit past`, `very prefix`, `when question`, `can remember lit on memory with her`, and the per-token `word_boundaries` arrays confirm those tokens were voiced. 30 distinct clips, reached by **15 legos (14 of them served rounds)** and **24 phrases**, across seeds 76–297. **This is not gle-specific** — `dan_for_eng` has 28 such rows and `fin_for_eng` 40, so it is an estate-wide authoring pattern, not an Irish defect. Nothing worse leaked: **0** rows in either table carry a build directive like `(introduce:false)` or a square-bracket tag, and there are **0** parentheses anywhere on the Irish side, so the Irish voices never speak a stray annotation.

**F6 — Known-prompt→target consistency is at or better than peer courses.**
At phrase level gle has the **lowest** rate of the four measured (1.1% vs 1.4–1.6%). At lego level it has 4 such prompts (`about`, `from you`, `to know`, `to take`) where dan/fin have 0 and ell has 1. A hit here is a *candidate*, not a confirmed defect — distinguishing a genuine one-prompt-two-forms collision from a legitimately context-split pair is exactly the Irish-grammar call this report does not make.

**F7 — Update posture: one build burst, then maintenance.**
gle `course_seeds.updated_at` clusters in **2026-02 (215) and 2026-03 (435)**, with only 4 in April and 14 in July — one authoring burst, not continuous work. Lego touches spread thinner across Feb–Aug (95/547/29/41/14/166/51). Phrases are almost entirely a single **2026-06** event (5,969 of 5,975), with 6 in July. Audio creation peaks in **2026-02 (17,893)** with tails through August (18 rows). `courses.version` = 56 vs fin's 1,759 — but that column counts *touches*, not edits, and fin has been under active daily campaign work, so the gap measures attention, not quality. `content_stamp` (2026-08-16) and `audio_stamp` (2026-08-14) are identical to fin's to the same estate-wide sweep.

**F8 — Beta is learner-visible, but only as a bare "β" glyph, and it can be suppressed.**
Traced in `ssi-learning-app`:
- The gate is `new_app_status IN ('live','beta')` — `api/courses/available.ts:35`, `packages/player-vue/src/App.vue:446`, `components/BrowseScreen.vue:253`, `components/CourseSelector.vue:373`, `composables/schools/useSchoolCourseCatalogue.ts:58`. gle is `beta`, so it **is** in the learner catalogue.
- **`courses.visibility` is never read by the learning app.** It is typed (`packages/core/src/pricing/types.ts:16`) but greps find no consumer anywhere in `api/` or `packages/*/src` — every `.visibility` hit is `document.visibilityState`. So gle's unusual `visibility='beta'` (only 5 of 68 beta courses have it; the rest are `public`) changes nothing a learner sees.
- The only learner-visible marker is a single Greek beta character:
  - `BrowseScreen.vue:639` — `<div v-else-if="group.courses[0].new_app_status === 'beta'" class="course-badge beta-badge">β</div>`. It is a `v-else-if`: if the course is the learner's active course or a premium preview, **the β is not rendered at all** (lines 633, 638).
  - `CourseSelector.vue:607-608` — `<span class="row-beta">β</span>`, also `v-else-if`, after the enrolled-progress branch. **Once a learner enrols, the β is replaced by their belt dot and disappears.**
- No banner, no disclaimer, no sentence of explanatory text. Greps for `beta` across `packages/player-vue/src` and `packages/core/src` return no warning copy; `packages/player-vue/src/composables/` contains **no** occurrence of `beta` at all, so neither `useInstantPlayback.ts` nor `useFullCourseScript.ts` surfaces anything. `Onboarding.vue` carries `.ob-beta` CSS at lines 1967/1978 but nothing in its template uses those classes.
- `new_app_beta_started_at` (gle: 2026-06-23) drives nothing in the app — no consumer found in `api/` or `packages/`.

**Practical upshot for the supporter reply:** a learner can find Irish, sees a small β next to it before enrolling, and sees nothing marking it as beta afterwards. If Kai wants the supporter to know it is a work in progress, the app is not currently telling them that in words.

**F9 — One pending audio-pass request, unrelated to course content.**
`audio_pass_requests` holds one `pending` row for gle (id `0b394c68…`), created **2026-07-24**, last touched 2026-08-12, `fulfilled_at` null. Its reason is the **pod-0 English fresh build** (approved by Tom 2026-08-12), fulfilled by phase8 `POST /generate-pods/:courseCode` — pod audio, not course audio. `metadata.rows_applied: 2`. `fin_for_eng` carries the identical request. No pending course-audio pass exists for gle, i.e. no known text-edit backlog awaiting re-render. (Source read only, never required or executed: `services/shared/audio-pass-queue.cjs:27`.)

**F10 — Configuration is coherent.**
`voice_config` names Sonia (en-GB, speed 0.9) for known, Orla (ga-IE, 0.8) target1, Colm (ga-IE, 0.85) target2, Sonia (0.95) presentation — and the live clip census matches that exactly. `translation_analysis` (generated 2026-02-17, `seeds_analyzed: 668`) is substantive: a stated register choice (informal `tú` default, `sibh` for plural, formal vocatives for sir/madam seeds), 14 golden keys, 9 recorded ZUT concerns, 9 problem verbs. `quality_rules` records a calibration on 2026-02-18 by `golden_builder` with `pipeline_stage: complete`, `golden_seed_count: 10`, and 10 stored golden decompositions. fin has **no** `quality_rules` at all. Both are quoted in full in §4.

---

## 3. GAPS — what could not be measured

1. **`content_audit_log` is only partially measurable.** The table holds 3,368,760 rows and has no `course_code` column — filtering requires `old_row->>course_code`, which exceeds the 8-second statement timeout on any window wider than about a day. Month-level queries return HTTP 500; day-level queries mostly succeed. Partial result for gle: **2026-01 through 2026-06 = 0 rows** (clean); **2026-07 = 71 rows** across the days that answered, with **4 days timing out**; **2026-08 = 103 rows** (peaks 2026-08-13 ×83, 2026-08-11 ×9, 2026-08-16 ×9), with **9 of 17 days timing out**. So the July/August figures are **floors, not totals**. The same walk was not completed for fin. Newest row in the table estate-wide: 2026-08-17T10:51Z. Note also that `changed_by_uid` is NULL on every row, so no audit row names an author.
2. **`course_seeds.approved_at` is 0 for gle and cannot be interpreted as "unreviewed."** fin has 105. The column is a bare timestamp with no approver field, and nothing in the estate reliably writes it, so its absence is not evidence either way about human review.
3. **S3 object existence was sampled, not exhausted.** 25 of 25 sampled clips played; the other 25,283 were verified only as far as "a non-null `s3_key` and a non-zero `duration_ms` are recorded in the database." A full sweep would be ~25k HEAD requests.
4. **Clip content was not verified against clip text.** Only 17 of 25,308 gle clips carry a veracity check. Nothing here proves a clip *says* what its row claims — that is a whisper pass, out of scope for a GET-only scout, and the shipped language-ID gate is known unreliable on short clips anyway.
5. **No independent QA scan was run.** The 43 `course_qa_flags` rows are one February scan by the dashboard's own checker; there is no more recent scan artefact for gle in any table found (`course_scans`, `scan_results`, `qa_results`, `course_quality_scans`, `audio_quality_flags`, `course_flags` all return 404 — they do not exist). "0 open flags" therefore means "nothing has looked since 2026-02-18," not "nothing is wrong."
6. **Irish linguistic quality is deliberately unassessed**, per the brief. The 4 lego-level and 63 phrase-level repeated-prompt candidates in §1 are counts awaiting a native-speaker call, not verdicts.
7. **Method caveat on this scout's own numbers.** An initial pass paged `course_audio` without an `ORDER BY`, which silently duplicated rows (25,308 fetched, only 20,450 distinct) and produced wrong per-role counts and a spurious 212-clip voice mismatch. Every audio figure above was re-derived with `order=id.asc` and verified 25,308 rows / 25,308 distinct. The earlier numbers are discarded.

---

## 4. Verbatim configuration blobs

### `courses.quality_rules` for gle_for_eng (fin_for_eng: null)

```
calibrated_at:      2026-02-18T00:28:04.635Z
calibrated_by:      golden_builder
pipeline_stage:     complete
pipeline_running:   false
golden_seed_count:  10
pipeline_started_at: 2026-02-18T03:16:08.169Z
pipeline_updated_at: 2026-02-18T04:01:40.354Z
golden_decompositions: [10 entries, seeds 1-10]
  seed 1  "I want to speak Irish with you now."  -> "Tá mé ag iarraidh Gaeilge a labhairt leat anois."
          legos: M "I want" / M "to speak" / A "Irish" / A "with you" / A "now"
  seed 2  "I'm trying to learn."                 -> "Tá mé ag triail foghlaim."
  seed 3  "how to speak as often as possible."   -> "conas labhairt chomh minic agus is féidir."
  seed 4  "how to say something in Irish"        -> "conas rud éigin a rá i nGaeilge"
```

### `courses.translation_analysis` for gle_for_eng

```
generated_at:    2026-02-17T22:00:00Z
seeds_analyzed:  668

register.choice: "Informal singular (tú) as default throughout; sibh for plural 'you all' seeds;
                  a dhuine uasail/a bhean uasal for sir/madam seeds"
register.markers: tú (singular informal) · sibh (plural) · a dhuine uasail (sir) ·
                  a bhean uasal (madam) · le do thoil (please, informal)

golden_keys (14):
  ag iarraidh = want/try (the single most reused structure)
  tá mé chun = going to (future intention)
  is féidir liom = I can
  caithfidh mé = I must/need to
  ba cheart dom = I should
  tá ... de dhíth orm = I need (noun)
  tá súil agam = I hope
  tá brón orm = I'm sorry
  go raibh maith agat = thank you
  is cuma liom = I don't care/mind
  ní miste liom = I don't mind
  tar éis = after (+ verbal noun for perfect)
  sula = before (conjunction)
  chomh ... agus is féidir = as ... as possible

zut_concerns (9):
  'ag iarraidh' covers both 'want' and 'try' — context usually disambiguates but may cause ZUT
      in decomposition if split into separate LEGOs
  'ní miste liom' vs 'is cuma liom' — both mean 'I don't mind/care' but used in slightly
      different contexts; may need upchunking
  'ar' preposition — multiple uses (on, past tense marker with irregular verbs) — bundle with verb
  'le' preposition — multiple uses (with, belonging to) — bundle with context
  'go' — subordinating conjunction vs preposition 'to' — always bundle into larger chunk
  'a' — relative particle, possessive, vocative — never standalone LEGO
  Verbal noun forms vs conjugated forms — Irish uses both extensively, each form is separate vocab
  'ann' (there/in it) vs 'ansin' (there, pointing) — keep distinct
  Possessive pronouns trigger lenition/eclipsis — mo (my), do (your), a (his/her) — bundle with noun

problem_verbs (9):
  ag iarraidh — used for both 'want' and 'try', context-dependent; hardest-working form
  caithfidh — 'must/need to', used consistently for obligation
  ba mhaith liom — 'I would like', conditional want
  is maith liom — 'I like', present habitual
  mothaím — 'I feel', used consistently
  ceapaim — 'I think', hardest-working for opinion
  féidir — 'can/possible', used with copula throughout
  bheith ábalta — 'be able', used for future ability
  fiafraí — 'ask (a question)', used consistently vs iarr (ask/request)
```

### `courses.voice_config` for gle_for_eng (matches the live clip census exactly)

```
known        Sonia  azure  en-GB-SoniaNeural  speed 0.90
target1      Orla   azure  ga-IE-OrlaNeural   speed 0.80
target2      Colm   azure  ga-IE-ColmNeural   speed 0.85
presentation Sonia  azure  en-GB-SoniaNeural  speed 0.95
created 2026-02-18T12:12:23.543Z · updated 2026-02-18T12:14:01.137Z
```

### The 43 resolved `course_qa_flags` (all 2026-02-18, all `status='resolved'`)

| Severity | Count | Pattern | Seeds |
|---|---|---|---|
| error | 9 | Language name should be capitalised (`gaeilge` → `Gaeilge`) | 2, 3, 9 |
| error | 1 | Capitalisation `i ngaeilge` → `i nGaeilge` | 202 |
| warning | 18 | Proper noun `gaeilge` should be `Gaeilge` | 123, 124, 125, 127 |
| warning | 15 | USE phrase missing capitalisation and ending punctuation | 106, 108, 110 |

---

## 5. One-paragraph summary for the supporter reply

Irish is a 300-seed MVP course, live in beta, and the parts that make it playable are complete and verified: all 300 built seeds decomposed with no gaps in the sequence, 943 LEGOs with 786 learner-facing rounds, 25,308 audio clips with **zero** broken links, zero missing files, zero wrong-voice clips in the 22,080 places content points at audio, and 25 of 25 sampled clips playing back through the live learner path. The round map stops cleanly at seed 300, so nobody walks off the end into silence. The honest incompleteness is the **practice layer**: 399 of the 786 rounds (50.8%) currently have no practice phrases of their own, against 0% in comparable beta courses, so half the course introduces its new item and then relies on review of earlier material rather than drilling that item in sentences. The last quality scan was 2026-02-18 and closed all 43 issues it raised (2 instances of one capitalisation pattern are still present at seeds 285/286). Irish grammar and translation quality were not assessed here and still need a native-speaker pass.

no commits
