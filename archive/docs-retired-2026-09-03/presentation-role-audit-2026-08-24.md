# Presentation-role audit, all courses — 2026-08-24

READ-ONLY audit. No writes, no TTS, no content changes were made. DB reached via `psql` per the recipe in the brief.

## Code contract (verified against source, not docs)

`role='presentation'` is a `course_audio` label. It does **not** gate playback directly — the player never queries `course_audio.role`. What actually reaches the learner is a *link*: a foreign key on the lego/phrase row that points at a specific `course_audio.id`.

- **Player read path**: `ssi-learning-app/api/courses/[code]/cycles.ts:797` — `presentationAudioId: lego.presentation_audio_id` — reads `course_legos.presentation_audio_id`, a UUID FK into `course_audio.id`. Consumed by `packages/player-vue/src/providers/toSimpleRounds.ts:246-258` (`i.presentationAudioId || i.knownAudioId` — intro/component_intro cycles use the presentation clip as prompt audio if present, else fall back to the known clip) and `resolveIntroAudioUrl.ts:52-55`.
- **Two more link paths exist** (found in dashboard write-side code, `services/phases/phase8-audio-v13.cjs`): `course_practice_phrases.presentation_audio_id` (component/phrase-level presentations, matched by text since these carry no `lego_id`) and the legacy `lego_introductions.presentation_audio_id` (`ON DELETE CASCADE` per `services/audio-repair-core.cjs:26-27`).
- So the row's `role` column is a *label*, not the wire the player reads. A row can carry `role='presentation'`, be textually perfect, and still never play — because nothing links to it. Distinguishing "wrong role" from "right role, unlinked" is the point of check #4 below.

## Calibration (per brief)

- **Known positive**: `cym_n_for_eng`, `role='presentation'`, `voice_id='human'` → **641** clips. Matches exactly.
- **"Take ends abruptly" note count**: 17 (in `rerecord_wanted->>reason`, not a `quality_notes` column — that column doesn't exist on `course_audio`; noting as a brief-vs-schema mismatch, not a data gap). Matches exactly. Kai's 2026-08-24 ruling is recorded inline: "not cut off, a tiny noise at the end... leave them."
- **Nonsense control**: `role='zzz_nonexistent_role'` on `cym_n_for_eng` → 0 rows. Harness proven not to always-return-zero.
- **Global role-value sanity**: `SELECT count(*) WHERE role IS NULL OR role=''` → 0. No blank/null roles anywhere in the table.

## 1. Census — role values that exist, course-by-course counts

Twelve distinct `role` values exist estate-wide, all recognizable, no garbage/typo values found:

| role | rows |
|---|---|
| known | 810,532 |
| target1 | 790,807 |
| target2 | 734,324 |
| **presentation** | **130,753** |
| pod_explainer | 50,834 |
| pod_fine_known | 41,992 |
| pod_take_g | 11,975 |
| instruction | 3,308 |
| encouragement | 2,953 |
| welcome | 129 |
| bookend_listen_outro | 59 |
| bookend_listen_intro | 59 |

**Courses with presentation clips: 85** (of 149 rows in `courses`; 134 have *any* `course_audio` at all). Full per-course counts + distinct voice_ids are in the table below (top 20 by volume; full 85-row list available on request — all follow the same pattern, sampled across families in §2).

| course_code | presentation clips | distinct voices | voices |
|---|---|---|---|
| kor_for_eng | 5,580 | 3 | gfzdpspr5fdp, xai_eve, xai_gfzdpspr5fdp |
| jpn_for_eng | 5,096 | 4 | gfzdpspr5fdp, xai_eve, xai_eve_q, xai_gfzdpspr5fdp |
| spa_for_eng | 5,060 | 5 | eve, gfzdpspr5fdp, xai_eve, xai_eve_q, xai_gfzdpspr5fdp |
| fra_for_eng | 3,928 | 3 | eve, xai_eve, xai_gfzdpspr5fdp |
| deu_for_eng | 3,798 | 5 | azure_en-GB-SoniaNeural, en-GB-SoniaNeural, eve, xai_eve, xai_gfzdpspr5fdp |
| fra_ca_for_eng | 3,057 | 2 | azure_en-GB-SoniaNeural, xai_gfzdpspr5fdp |
| eng_for_hin | 2,936 | 3 | azure_hi-IN-SwaraNeural, eve, xai_eve |
| por_br_for_eng | 2,760 | 2 | azure_en-GB-BellaNeural, xai_gfzdpspr5fdp |
| eng_for_pan | 2,677 | 1 | azure_pa-IN-VaaniNeural |
| eng_for_kan | 2,577 | 1 | azure_kn-IN-SapnaNeural |
| ita_for_eng | 2,533 | 2 | azure_en-GB-SoniaNeural, xai_eve |
| eng_for_sin | 2,355 | 1 | azure_si-LK-SameeraNeural |
| eng_for_urd | 2,324 | 1 | azure_ur-PK-UzmaNeural |
| eng_for_mar | 2,306 | 1 | azure_mr-IN-ManoharNeural |
| eng_for_ben | 2,252 | 3 | azure_bn-IN-TanishaaNeural, eve, xai_eve |
| ... | ... | ... | (85 courses total, 27–5,580 clips each; smallest are `zho_for_gle` (16) and `cym_anthem_for_jpn` (27)) |
| cym_s_for_eng | 676 | 1 | human |
| cym_n_for_eng | 641 | 1 | human (calibration anchor) |

*Aside, not part of the role audit but visible in the data*: several courses carry both a bare and an `azure_`-prefixed copy of the same voice string (`en-GB-SoniaNeural` vs `azure_en-GB-SoniaNeural`) as "distinct voices" — matches the known pattern in memory (`bare-and-xai-prefixed-voice-ids-are-the-same-voice`), a voice-id naming artifact, not a role or content defect.

**Courses with NO presentation clips: 64.** Breaking down why:
- **~55 are stub/draft rows** — 0 or 1 `course_audio` row total (e.g. `ara_for_cym`, `gle_cn_for_eng`, `kor_for_jpn`, `zzz_test2_for_eng`). Nothing to mis-file; these courses have essentially no audio yet.
- **9 have substantial audio but stopped before the presentation stage**:

| course_code | course_audio rows | course_legos rows | roles present |
|---|---|---|---|
| ara_sy_for_eng | 2,974 | 0 | known, target1, pod_fine_known, pod_explainer, pod_take_g, welcome, bookend×2 |
| mar_for_eng | 1,329 | 2,077 | known, welcome |
| mlt_for_eng | 1,886 | 733 | known, target1(1), welcome |
| tel_for_eng | 1,421 | 1,657 | known, welcome |
| gla_for_eng | 1,965 | 536 | known, encouragement, instruction, welcome |
| fin_for_eng | 357 | 1,425 | known, target1(44), instruction, encouragement, welcome |
| bre_for_eng | 314 | 42 | known, encouragement, instruction, welcome |
| sbx_for_eng | 216 | 61 | known only |
| bre_for_fra | 97 | — | encouragement, instruction, welcome |

For all nine, `presentation` is generated *after* `known` and `target1/target2` in the build pipeline (`services/phases/phase8-audio-v13.cjs`), and these courses either have zero `course_legos` structure (`ara_sy_for_eng` is pod-only — 0 legos, all its non-pod rows are `known`) or have `course_legos` rows but almost no `target1/target2` audio either (`fin_for_eng`: 1,425 legos, 44 target1 clips — matches the pre-existing memory finding that fin_for_eng has essentially no target audio). **This reads as expected build-stage absence, not mis-filing**: the course hasn't reached the presentation-generation stage, not "content exists elsewhere under the wrong label." No text in these courses's `known`/`target1` rows reads like presentation narration (checked directly — see §4).

## 2. Sample presentation text, by course family — narration vs bare item

Sampled across every course family present (Celtic/human-voiced, European azure-voiced, Indic azure-voiced, Sino-Japanese cross-pairs, and the two smallest courses) rather than assuming one pattern generalizes.

| course | sample | reads as |
|---|---|---|
| cym_s_for_eng | *"The Welsh for now is nawr, nawr."* / *"Okay, now, moving on, I'd like you to say 'would' like this:"* | Narration, same register as the confirmed-genuine cym_n_for_eng |
| spa_for_eng | *"The Spanish for: 'the whole sentence', is:"* / *"The Spanish for: 'those things', as in — 'I'm probably supposed to keep those things in another room', is:"* | Narration with gloss-in-context |
| fas_for_eng | *"The Persian for: 'that very / same', as in — 'it's the same thing', is:"* | Narration — the `/` is an in-gloss alternate-translation marker, not a bare-pair artifact (checked: 391/1,638 fas rows have this, all narration-framed) |
| eng_for_hin | *"अंग्रेज़ी में — 'बहुत' — जैसे — 'हाँ, उसे बहुत बातें करने का मन था।' — में :"* | Narration in Hindi frame ("In English — X — as in — Y — is:") |
| eng_for_pan | *"ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ — 'ਬਾਹਰ' — ਜਿਵੇਂ — ... — ਹੈ:"* | Same frame, Punjabi |
| eng_for_jpn | *"犬 を英語で言うと："* ("dog, said in English is:") | Terse but still a narration frame, not a bare word |
| zho_for_gle | *"Is é an Sínis ar 'labhairt' ná:"* ("The Chinese for 'to speak' is:") | Narration, all 16 clips |
| cym_anthem_for_jpn | *"ウェールズ語で「歌手たち」は："* / longer explanatory ones about mutation and grammar | Narration, some genuinely didactic (explaining a mutation), consistent with what a presentation clip is for |

**No bare-teaching-item false positives found** in any sampled course. I specifically re-ran the pattern that flagged cym_n_for_eng originally (`" / "` bare-pair-looking text) across all 85 courses — every hit resolves to an in-gloss alternate, not a stray teaching pair (see `fas_for_eng` above, the largest hit at 391 rows).

**Reverse check** (do any `known`/`target1`/`target2` rows read like presentation narration but are filed under the wrong role?): searched for `"The % for:%"` and the Japanese/Marathi frame patterns inside `known`/`target1`/`target2` — **0 hits, all courses.**

**Text-identity check** (does any `presentation` clip's text exactly match a `known`/`target1`/`target2` clip's text for the *same* `lego_id* — the strongest signal of a clip mis-tagged into the wrong role): **0 hits, all courses.**

## 3. Courses without presentations — expected or a gap?

Covered in §1's breakdown table. Verdict: **expected**, not a gap requiring re-filing. The nine substantial-but-presentation-less courses are all mid-build (either no `course_legos` structure yet, or `course_legos` exist but `target1`/`target2` are themselves barely generated). There is no content sitting in `known`/`target1`/`target2` in these courses that reads like a presentation and should be relabelled — checked directly, see §2 reverse check (that check covers these courses too, since it ran estate-wide).

## 4. Role-value / consumption-inconsistency flags

- **No unexpected role values** — all 12 values in §1 are recognized, documented usages (course roles + pod-recording roles). No typos, no stray strings.
- **No role is null/empty.**
- **Link-orphan finding (informational, not a mis-filing)**: I checked, for every `presentation` clip, whether *anything* actually points at it — `course_legos.presentation_audio_id`, `course_practice_phrases.presentation_audio_id`, or the legacy `lego_introductions.presentation_audio_id`. A meaningful fraction are unreferenced by any of the three, i.e. filed correctly under `role='presentation'` but not currently reachable by a learner:

  | course | orphaned | of total | % |
  |---|---|---|---|
  | kor_for_eng | 3,430 | 5,580 | 61% |
  | jpn_for_eng | 3,209 | 5,096 | 63% |
  | spa_for_eng | 2,956 | 5,060 | 58% |
  | fra_ca_for_eng | 789 | 3,057 | 26% |
  | hin_for_eng | 338 | 1,426 | 24% |
  | (20 more courses, 1–20% each) | | | |

  For `kor_for_eng` specifically I traced this further: `course_legos` itself is 92% linked (1,347/1,459) — the bulk of the "orphan" count is component/phrase-level presentation rows (`lego_id IS NULL`, matched by text at generation time rather than by a stored FK), which is consistent with the `phase8-audio-v13.cjs` design comment for component presentations. I could **not** fully verify, within this audit, whether that text-match path actually resolves at request time for every one of those rows, or whether some fraction is genuinely dead audio left behind by iterative regeneration (make-before-break leaves old clips in place rather than deleting them, so some orphan volume is expected residue, not a bug). **This is an explicit gap** — flagging the shape of the finding, not asserting cause. If Kai wants it chased further, the next step is tracing `course_practice_phrases` text-match resolution in the live API, not another DB query.
  - This is **not a role mis-filing** — the `role` column is correct; the finding is about link/reachability, a different axis than the one this audit was scoped to. Raising it because it bears on "is anything filed under the wrong role" only insofar as an unlinked-but-correctly-labelled clip can look, from outside, like it's "missing" when it is really just unlinked.

## 5. Proposed corrections

**None.** Every check run (text-identity match, reverse-narration-pattern search, bare-pair-pattern audit, rogue-role-value scan) returned zero mis-filed clips across all 149 courses. Kai's cym_n_for_eng finding stands as confirmed-fine and does not generalize — no other course has presentation clips that read like bare teaching items.

## Gaps / things not verified

- The component/phrase-level text-match resolution path for presentation audio (mentioned in §4) was read in source but not traced live against a request — I did not spin up the API or fetch a real cycles response.
- I did not listen to any audio; "reads like narration" judgments are text-only, same evidence class as the rest of this DB.
- Did not check `presentation_templates` (memory notes it's priority-5 unreviewed-LLM-output for 11 languages, 3 released) against the actual clip text for consistency — orthogonal to role-filing, flagging as a related area Kai may already be tracking separately.
- I did not audit `pod_explainer`/`pod_fine_known`/`pod_take_g` for internal mis-filing — out of scope (brief is about `presentation` specifically), though the role list in §1 shows they exist and are large populations.

---

**Landing line: no commits.** This was a read-only audit — no files were written to the repo, no branch was created, nothing was pushed or merged.
