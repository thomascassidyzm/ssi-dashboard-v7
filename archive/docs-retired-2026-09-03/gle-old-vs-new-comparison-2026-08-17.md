# Old Irish course vs new: does the new one waste the native work, and can the old content be recovered?

*Read-only comparison for Kai, 2026-08-17. The missing artefact arrived — the old native-built Irish course is now readable (`docs/shared/en-ga.json` on branch `origin/share/en-ga`, 33.5 MB, v1.3.4). Nothing was written, merged, or changed.*

*Revised 2026-08-17 (v2). The first version of this page was published during a ~40-minute Supabase outage and could not read the new course's practice layer. Worker **#916** got through at 13:40 and extracted all 5,975 practice phrases from the live DB. **The headline finding below is v2's, and it is sharper and worse than v1's.** Every overlap number on this page is now measured against the complete new course.*

---

## The answer, first

**The new course did not overwrite the native work — it simply never used most of it. The old course's 13,455 native practice phrases are, to within a rounding error, absent from what learners hear today.**

The number that settles it: comparing the two courses' **practice layers only** — 13,455 old phrases against 5,974 new ones — they share **98 English prompts. That is 1.8% of the new course's practice layer and 0.73% of the old course's.** A native speaker wrote 13,455 practice sentences; roughly a hundred of them survive in production in any form.

Three findings around that:

1. **Where the two courses *do* meet, the Irish is verbatim identical about half the time.** Across all content types, 707 English prompts appear in both courses; the Irish is **character-identical in 389 (55%)** and **different in 318 (45%)**. Identical strings include long ones — *"learning Irish isn't easy but it is fun" → "Níl sé éasca Gaeilge a fhoghlaim ach tá sé spraíúil"*; *"I think that she could put it on the table" → "ceapaim go bhféadfadh sí é a chur ar an mbord"*. Independent machine translation does not land character-for-character on sentences that long. Some of the native build **is** in the live course — but it is concentrated in the seed sentences and legos, not the practice. **How** it got there is a gap (below).

2. **The old course is the bigger and denser course by a wide margin.** 511 seeds / 1,938 legos / **13,455 practice phrases**, every seed carrying practice and every lego carrying a written teaching script — against 300 built seeds / 943 legos / **5,975 phrases**, of which **117 of the 300 built seeds (39.0%) have no practice phrases at all** and the phrase layer is wildly uneven (seed 65 has 131 phrases; the median built seed has 13). All 943 legos are `status: draft`; all 5,975 phrases are `status: draft`; `approved_at` is non-null on **0** of 668 seeds.

3. **The old course's audio is not lost — it is alive on our own bucket right now.** The legacy index's 47,704 audio ids resolve as `mastered/<UPPERCASE-UUID>.mp3` in `ssi-audio-stage`: **300 of 300 sampled ids hit, zero misses**, object sizes matching the index's declared durations to within 1.5% (96 kbps CBR, 48 kHz mono). Worker **#918** separately established that the 5,945 *root-level* orphan mp3s are **not** the Irish recordings (0/65 hits; they trace to the current TTS content-cache hash). Both are true: wrong prefix, right bucket.

**On the rescue question: recoverable, but not by overwriting `gle_for_eng`.** The importer that exists (`database/lib/import-legacy-course-core.cjs`, which already hard-codes `'en-ga': 'gle_for_eng'` at line 29) reads the legacy file field-for-field with no transform. Pointed at `gle_for_eng` it performs an in-place text edit of the very slots 102 enrolled learners' progress is filed against — no migration, no validation gate, and with `clearFirst` a delete-before-replace of all 25,308 audio rows. Pointed at a **new course code** it is clean. §4.

**On the dialect idea:** the old course's Irish carries an unmistakable **Connacht** lean where the new course does not. *céard* appears **613** times in the old course and *cad* **zero**; the new course uses *cad*. *ar bith* 114 / *in aon chor* 0; *ceapaim* 361; contracted spoken forms throughout (*'bhfuil*, *'tá*, *níl fhios agam*). Zero Ulster markers (*chan*, *domh*, *goidé*, *uilig*, *tchí* — all 0) and zero Munster-exclusive markers (*ansan*, *ana-*, *táim*, *bhíos* — all 0). The artefact you now hold is, on the marker evidence, **Connacht-leaning standard Irish** — a real dialect asset, and the only Irish we own whose words a native chose. *(Marker counts, not a linguistic judgement — a native reader confirms.)*

---

## 1. Shape, side by side

| axis | Old course (`en-ga`, native-built) | New course (`gle_for_eng`, live) |
|---|---|---|
| Provenance | authored seeds-and-legos by a **native Irish speaker**, partly proofread by her | machine pipeline, `calibrated_by = "golden_builder"`; all 668 seed rows created 2026-02-17, 938 of 943 legos and 5,908 of 5,975 phrases on 2026-02-18 — a single batch build |
| Version / status | v1.3.4, `status: published` | `status: beta` since 2026-06-23, free, `released_at` null, `content_version` 0.5.3 |
| Seeds | **511**, all built | **668 seed rows; 300 built**. 368 seeds have zero legos — seeds 301–668 are empty shells with a seed sentence and audio but no legos and no phrases. `courses.seed_count` says 300 |
| Legos | **1,938** debut legos | **943** (709 M-type, 234 A-type; 786 `is_new=true`, 157 `is_new=false`) |
| Practice phrases | **13,455** | **5,975** |
| Legos per seed | min 1, mean 3.8, max 10 | 3.1 over built seeds |
| Phrases per seed | min **3**, median 25, max 92 — **zero seeds with no practice** | over built seeds: min 0, **median 13**, max 131. **117 of 300 built seeds (39.0%) have zero phrases**; across all 668 seed numbers, 485 (72.6%) do |
| Practice thinness, the other way | — | **399 of 786 learner-facing rounds (50.8%) have no practice of their own.** Rounds track the 786 `is_new=true` legos, so this is the per-lego measure and 39.0% is the per-seed measure — both are correct, different denominators |
| Teaching script | **1,938 of 1,938 legos (100%)** carry written spoken teaching text | 788 of 943 legos have a presentation audio link; 1,335 presentation clips exist |
| Breakdowns | none in the export (`lemmas`/`tokens` are matching aids, not glosses) | **5,975 of 5,975** phrases carry a `decomposition`; 0 carry `display_tiling` |
| Approvals / review | she proofread part of it | **0 of 668** seeds `approved_at`; **0 of 5,975** phrases `qa_checked`; all legos and all phrases `status: draft`. `course_legos` has no approval column at all. Not one of the 68 courses with a recorded final pass |
| Audio | **49,180 clips** indexed (target1 15,743 / target2 15,736 / source 15,689 / presentation 2,012), 33,442 distinct target sentences, plus 48 ordered + 26 pooled encouragements | **25,308 clips**, all Azure TTS — `ga-IE-OrlaNeural` (f) + `ga-IE-ColmNeural` (m), English side `en-GB-SoniaNeural`. Link coverage: legos 943/943/943, phrases 5,973/5,973/5,973, seeds 663/662/662 |
| Human Irish audio | **unverified** — objects exist and are correctly sized; human-vs-legacy-TTS not determined (Gaps) | **none. Zero.** Of 25,308 clips, 75 are non-TTS and all 75 are English narration |
| Dialect signal | **Connacht-leaning** (above) | generic `ga-IE`; `voice_pool_key` empty |
| Learners | none — never in the production estate; `legacy_app_status = not_available` | **102 enrolments, 3rd most-enrolled course on the estate**, 252.4 h practice, deepest learner at seed 39, median at seed 10 |

*New-course figures are worker #916's read of the live DB at 13:40 today, except the enrolment/usage figures and the 786-round count, which come from the scout at /d/afc58779.*

---

## 2. Content overlap, measured

**The practice layer, on its own — the number that answers Kai's question:**

| | old course | new course | shared |
|---|---|---|---|
| practice phrases | 13,455 | 5,974 | — |
| distinct English prompts | 13,420 | 5,483 | **98** |
| — as a share | **0.73%** of old practice | **1.8%** of new practice | |
| distinct Irish strings | 13,380 | 5,389 | **97** (1.8% of new practice Irish) |
| of the 98 shared prompts: Irish identical | | | 57 (58%) · differs 41 |

Then everything, all content types together:

## The measured overlap

| axis | old items | new items | English prompts in both | Irish identical | Irish differs |
|---|---|---|---|---|---|
| all content | 15,904 (15,278 distinct English) | 7,585 (6,435 distinct) | 707 | 389 | 318 |
| seed sentences only | 511 (511 distinct English) | 668 (667 distinct) | 274 | 107 | 167 |
| legos only | 1,938 (1,936 distinct English) | 943 (786 distinct) | 246 | 173 | 73 |
| old legos+phrases vs new legos | 15,393 (15,254 distinct English) | 943 (786 distinct) | 265 | 185 | 80 |

Irish strings, matched independently of the English prompt: old course holds **15,193** distinct Irish strings, the new course **6,238**; **490** strings occur in both (7.9% of the new course's Irish, 3.2% of the old course's).

### Where the shared English sits along each course

**Old (native-built), 511 seeds**

| seed band | items | English also in the other course | % |
|---|---|---|---|
| 0–50 | 1,670 | 197 | 12% |
| 51–101 | 1,348 | 124 | 9% |
| 102–152 | 1,557 | 139 | 9% |
| 153–203 | 1,635 | 93 | 6% |
| 204–254 | 1,636 | 83 | 5% |
| 255–305 | 1,829 | 75 | 4% |
| 306–356 | 1,456 | 92 | 6% |
| 357–407 | 1,628 | 82 | 5% |
| 408–458 | 1,627 | 80 | 5% |
| 459–510 | 1,518 | 62 | 4% |

**New (generated), built seeds 1–300**

| seed band | items | English also in the other course | % |
|---|---|---|---|
| 1–30 | 1,165 | 155 | 13% |
| 31–60 | 1,132 | 137 | 12% |
| 61–90 | 1,094 | 121 | 11% |
| 91–120 | 904 | 82 | 9% |
| 121–150 | 647 | 41 | 6% |
| 151–180 | 436 | 83 | 19% |
| 181–210 | 618 | 80 | 13% |
| 211–240 | 461 | 34 | 7% |
| 241–270 | 336 | 66 | 20% |
| 271–300 | 424 | 90 | 21% |

**New, unbuilt seed corpus 301–668 (seed rows only)**

| seed band | items | English also in the other course | % |
|---|---|---|---|
| 301–336 | 37 | 21 | 57% |
| 337–373 | 37 | 21 | 57% |
| 374–410 | 37 | 18 | 49% |
| 411–447 | 37 | 18 | 49% |
| 448–484 | 36 | 29 | 81% |
| 485–520 | 37 | 26 | 70% |
| 521–557 | 37 | 22 | 59% |
| 558–594 | 37 | 24 | 65% |
| 595–631 | 37 | 18 | 49% |
| 632–668 | 36 | 27 | 75% |


**How to read the bands.** The old course's practice layer barely intersects the new course at all (4–12% per band, and only 0.73% phrase-to-phrase) — that is 13,455 native practice sentences, almost none of which exist in production. Read the other way, 6–21% of the new course's built content has an English twin in the old course, and the *unbuilt* corpus tail (seeds 301–668) overlaps far more — 49–81%. Both courses descend from the same English seed corpus; the new one is a shallower cut of it, and the overlap lives in the spine, not the drills.

**Where both courses render the same English identically** — offered as evidence that native material is already in the live course, not as a quality claim:

| English prompt | Irish (both courses agree) |
|---|---|
| to speak Irish | Gaeilge a labhairt |
| tomorrow | amárach |
| anything | aon rud |
| I can help you | is féidir liom cabhrú leat |
| finish | críochnú |
| I think you left them at work | ceapaim gur fhág tú ag an obair iad |
| to leave | imeacht |
| they're not ready yet but they'll be ready soon | Níl siad réidh fós ach beidh siad réidh go luath |

---

## 3. For a native reader — 30 aligned items to adjudicate

**Justin's wife: this is the whole ask.** Two Irish courses render the same English. The left column was written by a native speaker; the right column is what our live course says to learners today. We are not asking which is "correct Irish" in the abstract — we are asking, for each row: **which one would you say?** If neither, say what you would say. If both are fine, say so; that is a useful answer too.

These 30 are sampled evenly across the length of the course (new-course seed 1 to seed 638), from the 318 places where the two courses disagree. Many now come from the practice layer at low seed numbers — which is exactly where every current learner is sitting. No Irish judgement of our own is embedded in the ordering or the wording; we deliberately do not judge Irish, and the differences are presented neutrally.

| # | English prompt | Old course (native-built) | New course (live now) | Your call |
|---|---|---|---|---|
| 1 | to speak | **labhairt** | **a labhairt** |  |
| 2 | I want to be able to speak Irish with you | **Tá mé ag iarraidh bheith in ann Gaeilge a labhairt leat** | **tá mé ag iarraidh a bheith ábalta Gaeilge a labhairt leat** |  |
| 3 | you want to speak Irish | **Tá tú ag iarraidh go labharófá Gaeilge.** | **tá tú ag iarraidh Gaeilge a labhairt** |  |
| 4 | how long have you been learning irish | **Conas a bhfuil tú ag foghlaim Gaeilge le fada?** | **cé chomh fada is atá tú ag foghlaim Gaeilge** |  |
| 5 | how do you feel now | **Conas a mothaíonn tú anois?** | **conas a mhothaíonn tú anois** |  |
| 6 | I don't care about making mistakes | **is cuma liom faoi bhotúin a dhéanamh** | **is cuma liom faoi botúin a dhéanamh** |  |
| 7 | enough words | **dóthain focal.** | **go leor focail** |  |
| 8 | what are you looking for now | **céard atá á lorg agat anois?** | **cad atá tú ag lorg anois** |  |
| 9 | I'm not ready yet | **níl mé réidh fós** | **nílim réidh fós** |  |
| 10 | home | **baile** | **abhaile** |  |
| 11 | work | **obair** | **oibríonn** |  |
| 12 | do you want | **'bhfuil tú ag iarraidh** | **an bhfuil tú ag iarraidh** |  |
| 13 | on my own | **im'aonar** | **liom féin** |  |
| 14 | I was there a while ago | **bhí mé ansin tamall ó shin** | **bhí mé ann tamall ó shin** |  |
| 15 | much | **i bhfad** | **mórán** |  |
| 16 | who was that man you were talking to | **cérbh é an fear sin go raibh tú ag caint leis?** | **cé hé an fear sin a raibh tú ag caint leis** |  |
| 17 | I want to stay | **tá mé ag iarraidh fanacht** | **ba mhaith liom fanacht** |  |
| 18 | enough time | **dóthain ama** | **go leor ama** |  |
| 19 | no I don't think she could this time | **nó, ní cheapaim go bhféadfadh sí an uair seo** | **Níl, ní cheapaim go bhféadfadh sí an uair seo** |  |
| 20 | Did you hear what he wanted to grow? | **ar chuala tú céard a bhí sé ag iarraidh a fhás?** | **an gcuala tú cad a bhí sé ag iarraidh a fhás?** |  |
| 21 | Did you agree with her? | **ar aontaigh tú léi?** | **an raibh tú ag aontú léi?** |  |
| 22 | That wouldn't be a problem if you ask me | **Níorbh fadhb a bheadh ann dar liomsa.** | **Ní bheadh sé sin ina fhadhb dar liom** |  |
| 23 | they will be able to carry that suitcase | **beidh siad in ann an cás sin a iompar.** | **beidh siad ábalta an mála taistil sin a iompar** |  |
| 24 | I told her my room number once but she forgot it | **d'inis mé uimhir mo sheomra di uair amháin ach dhearúd sí é** | **d'inis mé uimhir mo sheomra di uair amháin ach rinne sí dearmad air** |  |
| 25 | I love the way you try to help | **is aoibhinn liom an chaoi a ndéanann tú iarracht cabhrú** | **is breá liom an chaoi a n-iarrann tú cabhrú** |  |
| 26 | they both came on their own | **tháinig siad beirt ina n-aonar** | **tháinig an bheirt acu leo féin** |  |
| 27 | I am feeling sad at the moment | **tá brón orm faoi láthair** | **Tá mé ag mothú brónach faoi láthair** |  |
| 28 | I'd have thought about it more carefully | **bheadh machnamh níos cúramaí déanta agam air** | **bheinn tar éis smaoineamh air níos cúramaí** |  |
| 29 | what's it like in this part of the world? | **conas mar atá sé sa chuid seo den domhan?** | **conas atá sé sa chuid seo den domhan?** |  |
| 30 | if I'd known I'd have done things differently | **dá mbeadh 'fhios agam, bheinn tar éis rudaí a dhéanamh ar bhealach eile** | **dá mbeadh a fhios agam bheinn tar éis rudaí a dhéanamh ar bhealach difriúil** |  |

Two things worth knowing before you start, both our own flags rather than conclusions:

- **The old course is not flawless either.** Our automated read of it turned up 212 target sentences beginning with a bare apostrophe (*'bhfuil*, *'tá* — spoken contractions written as-is), 25 instances of `tseanhbean` (an apparent slip for *tseanbhean*), a run-together `d'fhágadarle chéile`, `d´fhéadfadh` with the wrong apostrophe character, and `nó,` used for English "no". Flagged, not adjudicated.
- **We already have a list of Irish in the live course we suspect is broken** and have been waiting on a native reader for: `"i do dhíol"` for *pleased to meet you*, `"scéim ghréine"` for *sunscreen*, and missing eclipsis in `"An féadfainn…?"` / `"An féadfá…?"`. Also 35 machine-confirmed places where a word is used in practice before it is taught, 10 inside the first 22 seeds.

---

## 4. The rescue path — assessed, not run

Full assessment (worker **#917**): **https://watson-1.tail4968cb.ts.net/d/a4d2ef17**

**Verdict: UNSUITABLE as an overwrite of `gle_for_eng`. Clean as an import to a new course code.**

The good news is real: the legacy export fits `import-legacy-course-core.cjs` field-for-field with **no transform needed** — `manifest.id`, `known`/`target`, `slices[0].seeds[]`, the snake_case `introduction_items` branch, `nodes[]`, `presentation`, and the `samples` index keyed by target text are all read directly, and `'en-ga': 'gle_for_eng'` is line 29 of its own alias table. It is idempotent. In that narrow sense it is ready.

**Why it must not be pointed at the live course — three code facts:**

1. **It is an in-place edit of live learner progress, not an import.** The importer mints phrase ids with the identical deterministic scheme the live course already uses (`:531-535` vs `services/course-builder/lib/phrase-structure.cjs:27-33`) and upserts `onConflict: 'id'` (`:563`). `gle_for_eng:S0001L01B01` in the export **is** the row a learner has already practised. Progress is slot-keyed — `lego_progress` carries `lego_id: 'S0039L01'`, `highest_completed_seed` is a bare integer, nothing references phrase text. Every one of the 76 learners with ≥10 minutes and 56 with an hour keeps their counts and loses the sentences those counts were earned on, with no error and no alarm. That is what the standing content-change migration protocol (`docs/pods/pod-migration-protocol.md`, adopted 2026-08-16) exists to forbid; this importer predates it and has no migration step.
2. **`clearFirst` deletes before replacing.** `clearCourseData` (`:95-127`) hard-deletes `lego_introductions`, `course_practice_phrases`, `course_legos`, `course_seeds` and **all 25,308 `course_audio` rows** before a single replacement is written, and a delete failure only `console.error`s and continues. That is the fra_for_eng shape that left ~2,000 slots silent for two days. Without `clearFirst` you get the other failure: 511 seeds overlaid on 668, seeds 512–668 of the machine corpus surviving underneath, with no marker telling them apart.
3. **Zero validation.** The module imports only `@supabase/supabase-js` and `language-code-service.cjs` — never `validation.cjs`. ZUT, tiling, vocab, known-side, lego-conflict and the `blocked_unapproved_target` text gate are all bypassed, and every row lands `status: 'released'`. `maxSeeds` is destructured and never used, so a small trial import is not available.

**What would be kept, and what lost, on the safe path** (`--course-code=gle_native_for_eng`, supported and honoured):

| | outcome |
|---|---|
| **Kept** | all 511 seeds, 1,938 legos, 13,455 native practice phrases; the 1,938 presentation scripts (as audio links); the `samples` index; and the new course's 668 seeds, 943 legos, 5,975 phrases, 25,308 clips and all 102 learners' progress — **untouched** |
| **Lost in transit** | `lemmas[]`/`tokens[]`, `seed_sentence.canonical`, all seed/node UUIDs, `cadence`, `paywallEncouragements` — read by nothing. `components: null` for every lego, so **no breakdowns come across**. Note the live course has 5,975 decompositions and the legacy export has none, so this is the one axis where the machine course is genuinely richer |
| **Wrong by default** | every phrase written `phrase_role: 'build'`, but 644 legos carry >7 nodes and `computePhraseRole` classes position ≥8 as `'use'`; INF PLAY filters on `use`/`eternal_eligible`, so an all-`build` course has **zero INF PLAY content**. Fixable, one function call |
| **Audio, corrected** | the importer mints `s3_key: mastered/<UUID>.mp3` with no existence check. #917 flagged that as unverified; **I verified it — 300/300 sampled legacy ids exist at exactly that key**, sizes matching declared durations. The links would resolve. Presentation-role rows would be mis-filed as `language = gle` (a real bug at `:176`), and every clip would carry `voice_id: 'legacy_import'` |
| **Not answered** | whether those objects are the native speaker's voice or legacy TTS. All 60 sampled objects were last modified 2026-05-25 (a bulk copy into `mastered/`), carry no S3 metadata, and are uniformly 96 kbps mono with digital-silence noise floors — consistent with either human recordings that went through our gating chain, or TTS. **An ear settles this in thirty seconds; bytes cannot.** |

**Recommendation.** Import to `gle_native_for_eng` as a dry run, show it to Justin's wife alongside the live course, and let her verdicts decide whether a protocol-governed, content-matched migration into `gle_for_eng` is worth the harder half of the job. That sequencing costs nothing and risks nothing. Given the 0.73% practice-layer overlap, the prize is not a patch — it is 13,455 native practice sentences we currently own and do not use, against a live practice layer that is 39% empty by seed and entirely unapproved.

---

## 5. Gaps — named, not papered over

- **How the identical Irish got into the live course is undetermined.** 389 verbatim matches is strong evidence of transfer, not proof of a mechanism. The 10 golden decompositions in `quality_rules` are the obvious candidate source and were not read. The alternative reading — that a strong model independently produced the same Irish — is not excluded, and for the short items it is likely.
- **Human-vs-TTS for the legacy audio is unresolved**, as above. I verified object existence and size, not content: nothing here confirms a clip matches the text it is indexed against.
- **No Irish was judged.** Deliberately. Irish is weak for LLMs; every rendering difference in §3 is presented neutrally in both directions for a native reader to settle. The dialect finding is a count of marker words, not an opinion about them.
- **The old course's `samples` index has 47,704 distinct ids across 49,180 rows** — 1,476 rows reuse an id. Not investigated.
- **The old course's own audio coverage was not cross-checked against its phrase list.** 33,442 indexed target sentences against 13,455 phrases + 1,938 legos + 511 seeds suggests full coverage plus extras, but that is arithmetic, not a verified join.
- **Two numbers in the estate disagree and neither was reconciled here:** `courses.seed_count` says 300 while 668 seed rows exist, and `voice_pool_key` is empty for a course with a locked two-voice cast.
- **Closed since v1 of this page:** the practice-layer overlap gap (worker #916 read the live DB at 13:40); and the apparent 50.8%-vs-39.0% conflict in practice-thinness figures, which was two correct measures on different denominators — 399/786 is per learner-facing round (rounds track the 786 `is_new=true` legos), 117/300 is per built seed.

---

*Read-only throughout. No DB writes, no merges, no course changes, no TTS. The old course's branch (`origin/share/en-ga`) was fetched and read, not merged. Worker reports folded in: **#916** live extraction of the new course, **#917** importer feasibility (/d/a4d2ef17), **#918** S3 root-level key match (/d/2076e10e).*
