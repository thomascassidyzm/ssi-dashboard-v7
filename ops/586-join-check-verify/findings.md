# As-in context: join-check verification and zho re-score (job 586)

Read-only against course data. The only DB write is the 117 re-scored rows in `course_lego_intro_context_score` (rubric_version `rubric-586-v1`).

## 1. Is the join-defect check sound?

**No, not as a defect count.** "2,373 of 2,373" is a misreading of job 567's page: 2,373 is the *numerator* (rows whose intro X differs from the LEGO `known_text`). The page never gave a denominator. The player follows `course_legos.presentation_audio_id`: 73,704 LEGOs carry that link, in 89 courses. 39,231 of them have an English-template intro the 567 regex can parse; 2,373/39,231 is about 6 percent, not 100 percent.

The check compares the right *kind* of fields (the quoted gloss in the intro's text against the LEGO's known text). Four problems with how:

1. **Exact string match is too strict.** 1,471 of the 2,373 (62 percent) are benign on my re-read of the same rows: the LEGO known text lists alternatives ("I said / I told") and the intro uses one of them; or the intro adds "to" or a bracketed note ("good (neuter nominative/accusative adjective)").
2. **It is blind to every non-English-known course.** Those intros use localised templates (Tamil, Hindi, Chinese, Japanese, Urdu and so on); the regex does not match them, so about 34,000 linked intros were never compared. Welsh free-prose intros are also skipped.
3. **Wrong link for 179 rows.** It reads every `course_audio` presentation clip by `lego_id`, not the clip the LEGO links to. 179 flagged rows are on clips the player does not follow from `course_legos` (125 of them sit on the `lego_introductions` link instead).
4. **No transcript.** I could not check the sound itself: `clip_spoken_text` holds no presentation clips. "Audio linked" here means the text the linked clip was synthesised from. This is a gap.

### Hand inspection: 20 random flagged rows (seed 586) against the linked clip

| Read | Rows |
|---|---|
| Benign: X is one alternative of a slash list, or a bracket note, or article dropped | 12 |
| Benign-ish: X is a shorter or fuller gloss of the same thing | 4 |
| True defect: intro names a different thing (`fra_ca S0268L02` "two emails" -> 'sent'; `por_br S0134L01` "a" -> 'um', the target word) | 2 |
| Not on the player's link (cannot judge) | 2 |

So 16 of 20 flagged rows are not defects. About 10 percent are real.

## 2. True defect count (player-linked intros, all 89 courses)

I re-classified all 73,704 linked intros. Language-agnostic rule: for localised templates, does the LEGO known text appear in the clip's text? Then I hand-judged random samples of each suspect class.

| Class | Rows | Hand-judged sample | Truly wrong |
|---|---|---|---|
| Divergent: X is a different word or phrase from the LEGO | 360 | 40 | 28/40, about 70 percent: about 250 |
| Near: X is a shorter, longer or annotated version (mild) | 361 | 40 | 10/40, about 25 percent: about 90 (mild) |
| Not contained, localised templates (zho/jpn/kor/Welsh) | 494 | 40 | 16/40, about 40 percent: about 200 |
| Parsed and equivalent, or contained | 72,489 | not sampled | treated as fine |

**Estimate: about 540 true defects (range roughly 400 to 700), under 1 percent of linked intros.** This is a sample-based estimate, one reviewer, not a full hand count. The 360 + 361 + 494 candidate rows are in `ops/586-join-check-verify/mismatch-candidates.csv` (with audio ids and S3 keys) so anyone can finish the count.

Where they cluster: `fra_ca_for_eng` 223 candidates (the intro names the neighbouring word of the seed sentence, a decomposition misalignment), `zho_for_jpn` 96, `ita_for_zho` 49, `spa_for_zho` 45, `nld_for_eng` 43, `cat_for_eng` 35, `fra_for_zho` 35, `eng_for_kor` 28, `eng_for_zho` 27, `hye_for_eng` 26.

Of 567's 762 "as-in" defects, my classes give 190 divergent + 194 near as-in rows (those with an as-in context); the same sampling rates apply.

### Ten concrete defects (the intro names the wrong thing)

| # | Course / LEGO | LEGO known / target | Linked intro says | Audio id | S3 key |
|---|---|---|---|---|---|
| 1 | fra_ca_for_eng S0233L01 | a young woman / une jeune femme | 'knows' | 040f1adc-861f-40bd-b66f-7991274dccec | mastered/88AD8F5B-B340-4CE7-B0F2-97F6E8CBC5A2.mp3 |
| 2 | fra_ca_for_eng S0179L01 | sunday afternoon / dimanche après-midi | 'you are going to' | 065b302c-f679-4d75-8dc0-20e1c8f2d3fb | mastered/14E76887-2441-4587-94CB-660C1B4CA81E.mp3 |
| 3 | fra_ca_for_eng S0220L03 | a bit of / un peu de | 'television' | 15478e24-afd6-478b-b1b6-290d91bc08fc | mastered/A2AD5DE6-1ED1-410C-8A56-C4815C1668B7.mp3 |
| 4 | fra_ca_for_eng S0291L01 | to speak better / parler mieux | 'I hope I'll be able to' | 8241a174-774d-4fb7-b425-985910a11b79 | mastered/84A5E0DF-E84B-4AB3-BCAB-FB07F15662FF.mp3 |
| 5 | fra_ca_for_eng S0008L03 | what / ce que | 'to try to explain' | 070ceddf-63f7-4b7d-a4ab-8c22012e7f00 | mastered/DA6A2C0C-1C5A-46C2-87FD-C1263461F330.mp3 |
| 6 | spa_mx_for_eng S0161L01 | not that one / no ese | 'that book' | 8df3cb37-28c0-4422-a459-37c1d8e41e2a | mastered/E24B2A92-1F2D-49F8-ACA4-CE2C9C4D2ADE.mp3 |
| 7 | ara_for_eng S0202L01 | nobody was / لَمْ يَكُنْ أَحَدٌ | 'anyone' | 0336284f-3a2a-47ee-8350-b08067b0814f | mastered/99187CFE-0663-4EDF-813E-86433625C648.mp3 |
| 8 | ita_for_zho S0094L01 | 唯一 / solo | 「起作用」 | f3cb045a-4dda-48d8-8c69-76ff9d2028d8 | mastered/DB6BD5F4-49EA-476D-B993-4B23C62613FF.mp3 |
| 9 | zho_for_jpn S0027L02 | 費やす / 花 | 時間 | 8043b703-c7fa-457e-916a-a70f3c9d068e | mastered/BFDAEC13-58CB-4483-8053-03860D4FEB52.mp3 |
| 10 | hye_for_eng S0234L01 | of last night / երեկի | 'yeghbayrov' (a transliteration of another word) | ac68bac5-e62b-48d3-97f0-71129e083907 | mastered/3B841237-35AD-42BE-B004-7DD371042D5F.mp3 |

Implication for job 544 (assemble presentation intros only where score >= 3): these defects are real but rare; they should be fixed at the intro text, not by the score table. No course data was changed here.

## 3. The 117 zho rows with stock reasons

Job 567 batch 12 gave 117 `zho_for_eng` rows the same tail, "context leaves any synonym fork open". I re-scored each by hand against the rule (3 or more only if the target forks AND the sentence settles it), with a per-row reason that names the competing forms and what in the sentence does or does not settle it. Written to `course_lego_intro_context_score` (rubric `rubric-586-v1`), guarded by `score = old score` and the old stock tail, so 117 rows updated and nothing else.

Before: all 117 scored 2. After: 5 x 1, 82 x 2, 30 x 3. 35 rows changed score (30 up to 3, 5 down to 1). Examples of the new 3s: 百/千 need 一 before a measure; 暖和 vs 温暖 settled by "somewhere warmer"; 帮助 (noun) vs 帮忙 settled by "we needed help". File: `ops/586-join-check-verify/zho117-rescored.csv`.

## 4. Spot-check against the rule (no mass re-score)

I judged 40 random score-3 rows (from `rubric-567-v1`, not the 117) and 40 random carried `rubric-543-v1` rows, each against X, target and the context sentence. Sampling was limited to rows with a parseable English context.

| Set | Disagree | Rate | Typical disagreement |
|---|---|---|---|
| 40 score-3 rows from 567 | 18 | **45 percent** | Fork is real but the sentence does not settle it: tu/vous (S0489L04, S0149L03), est-ce que / inversion (S0025L01), gender unsettled (S0455L04), 'stopping' whose own reason says "only weakly settles" (kor S0470L02), non-forks scored 3 (ita S0032L01 mostrarmi) |
| 40 carried 543 rows | 10 | **25 percent** | Reason does not fit the row (zho S0217L03 "glass" carries "two splits 两 vs 二"); stock "secondary sense or word choice" tails scored 3 (spa_mx S0515L01, S0608L01); an unsettled fork scored 4 (zho S0531L01 "win the game"); a settled fork scored 2 (deu S0030L02 "ask more" fragen vs bitten) |

Reading: the 567 per-row pass over-credits context (rule "settles" stretched to "mentions"); 543's carried rows are cleaner but still a quarter off. One reviewer, 40 rows each, so each rate has a wide interval (about plus or minus 15 points). No mass re-score done; if you want it, the score-3 set is the one to redo (2,482 rows with score 3 in the table).

## Gaps

- No spoken transcripts for presentation clips, so "what the audio says" is the synthesis text, not the sound.
- The defect count is a sample-based estimate; the candidate list is supplied for a full count.
- Non-English-known intros were judged by gloss text in languages I read less well (Armenian, Thai, Tamil, Korean); my reads there are lower confidence.
- 543 and 567 spot-check judgments are mine alone; nobody else has second-read them.

Landing: branch `cs/586-verify-the-intro-join-defect-che`, not merged, not deployed. DB: 117 rows in `course_lego_intro_context_score` updated live (additive score table only).
