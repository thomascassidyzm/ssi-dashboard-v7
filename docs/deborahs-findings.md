# Deborah's Findings Catalog

Living ground truth of issues Deborah catches during manual content review. Used to calibrate and improve the mechanical + LLM scanners.

## Important: Coverage is uneven

Deborah speaks Spanish, German, French, and English. For these courses her findings include grammar, naturalness, and vocabulary issues. For Japanese, Chinese, Korean, Arabic, and other languages she can only spot structural issues (missing phrases, wrong punctuation, mixed languages, data corruption). **Absence of findings does NOT mean no issues** — for languages Deborah doesn't speak, our scanner is the primary quality gate.

## Classification taxonomy

- `vocab_ordering` — word or chunk used before introduced (covers both word-level and chunk-level)
- `capitalisation` — first-letter inconsistency or wrong capitalisation
- `missing_qmark` — direct question without `?` (or missing `¿`)
- `identical_known_target` — target_text same as known_text (data corruption)
- `underpopulated_lego` — LEGO with missing BUILD/component or too few USE phrases
- `grammar_incomplete` — language-specific pattern that's grammatically incomplete
- `awkward_phrase` — unnatural phrasing only a speaker catches
- `wrong_word_order` — target language word order is wrong
- `gender_mismatch` — wrong gender form for the context (él/ella, callado/callada)
- `mixed_language` — target language text mixed into known language field or vice versa
- `punctuation` — trailing periods, inconsistent `ka`+`?`, full stops in Japanese, etc.
- `audio_issue` — TTS mispronunciation, wrong voice, wrong language audio
- `presentation_weird` — intro example awkward or wrong
- `wrong_language_mention` — text mentions learner's own language when should be target
- `translation_mismatch` — known and target texts don't say the same thing

**Scan coverage**: ✅ caught now, 🚧 check being added, ❌ needs LLM or manual

## Scanner coverage summary (2026-04-22, after Steps 3 & 4)

| Category | Status | Check(s) |
|---|---|---|
| `vocab_ordering` (word-level, known side) | ✅ | 11 |
| `vocab_ordering` (chunk-level, target) | ✅ | 12 |
| `capitalisation` (case-only dupes) | ✅ | 13a |
| `capitalisation` (first-letter outliers, >80% dominance) | ✅ | 13b |
| `capitalisation` (lowercase I in English contractions) | ✅ | 9 |
| `missing_qmark` (direct questions, both-sides filter) | ✅ | 14 |
| `missing_qmark` (Spanish `¿` opener) | ✅ | 14 |
| `identical_known_target` (with per-pair cognate allowlist) | ✅ | 15 |
| `underpopulated_lego` (empty / no-builds / few-uses) | ✅ | 16 |
| `grammar_incomplete` — spa `llevar + gerund` needs time | ✅ | 17a |
| `grammar_incomplete` — ita subjunctive after `penso che` | ✅ | 17b |
| `grammar_incomplete` — deu verb-final in subclauses | 🚧 | 17c (candidates only, needs LLM verdict) |
| `punctuation` — trailing periods | ✅ | 8 |
| `punctuation` — speech marks wrapping | ✅ | 7 |
| `punctuation` — jpn `ka`/`?` inconsistency | ✅ | 17d |
| `mixed_language` (wrong script in known/target) | ✅ | 3, 4 |
| `wrong_language_mention` (e.g. 日本語 in target-language field) | 🚧 | partial via Check 3/4; needs LLM for subtle cases |
| `awkward_phrase` | ❌ | LLM only |
| `wrong_word_order` | ❌ | LLM only |
| `gender_mismatch` | ❌ | LLM only |
| `translation_mismatch` | ❌ | LLM only |
| `audio_issue` | ❌ | manual |
| `presentation_weird` | ❌ | manual / LLM |

**Step 6 plan**: LLM pre-check for the ❌ categories before Deborah sees the course. Pattern matches the existing pipeline: **Opus orchestrates, Sonnet workers** — Opus picks the batch and evaluates results, Sonnet does the per-phrase reading. Don't burn Opus on every phrase; let the orchestrator dispatch. Expected to reduce what Deborah catches by a significant fraction and let her focus on the genuinely hard cases.

---

## German for English Speakers (deu_for_eng)

| date | id | category | finding | scan? | status |
|---|---|---|---|---|---|
| 2025-11-24 | S10 R31 | vocab_ordering | "the whole sentence" in consolidation phrase, not introduced until R33 | ✅ | Fixed |
| 2025-11-24 | various | vocab_ordering | 'ob' (whether) introduced R34 but used before | ✅ | Fixed |
| 2025-11-24 | various | vocab_ordering | 'gut' used R45, introduced R46 | ✅ | Fixed |
| 2025-11-24 | S18 R9 | grammar_incomplete | 'jemand' after 'treffen' needs accusative 'jemanden' | ❌ | Fixed |
| 2026-02-11 | S4 | awkward_phrase | "how to say things" — no German word for "things" introduced | ❌ | Fixed |
| 2026-02-27 | S13 R45 | vocab_ordering | 'sehr' uses 'gut' in BUILD/CONS, not introduced until R46. Suggest swap. | ✅ | Fixed |
| 2026-02-27 | S17 R56 | vocab_ordering | 'die Antwort' used in BUILD before introduced | ✅ | Fixed |
| 2026-02-27 | S40 R121 | vocab_ordering | 'im Moment' in CONS before introduced R122 | ✅ | Fixed |
| 2026-02-27 | various | grammar_incomplete | 'um...zu' pattern appears with "in order to" meaning, never formally introduced that way | ❌ | noted |
| 2026-02-27 | S52 R147 | underpopulated_lego | 'letzte Woche' has no BUILD/CONS phrases | 🚧 | |
| 2026-02-27 | S52 R149 | underpopulated_lego | 'einen Brief' has no BUILD/CONS phrases | 🚧 | |
| 2026-03-06 | various | wrong_word_order | "was willst du machen hier?" should be "was willst du hier machen?" (verb last). Multiple instances. | ❌ | |
| 2026-03-06 | various | wrong_word_order | "nichts scheint zu funktionieren gut" → "nichts scheint gut zu funktionieren" | ❌ | |
| 2026-03-06 | various | capitalisation | German nouns missing capital letters | 🚧 | |
| 2026-03-06 | various | mixed_language | German text mixed into English field: "ich sollte in ein paar Minuten bereit sein" in English text | 🚧 `checkIdenticalKnownTarget` (partial) | |
| 2026-03-06 | S53 R152 | vocab_ordering | 1 BUILD uses 'stecken', not introduced until R153 | ✅ | |
| 2026-04-07 | S4 R12 | vocab_ordering | BUILD 5 uses 'sagen' (R13) and 'auf Deutsch' (R14) | ✅ | Fixed |
| 2026-04-07 | S5 R16 | vocab_ordering | BUILD 5 uses 'mit jemand anderem' (R18) | ✅ | Fixed |
| 2026-04-07 | S6 R21 | vocab_ordering | BUILD 4 uses 'ich kann' (R31), 'was du gesagt hast'; BUILD 5 uses 'ich muss', 'wollte' | ✅ | Fixed |
| 2026-04-07 | S6 R22 | vocab_ordering | BUILD 4 uses 'ich muss', 'sehr wichtig ist'; BUILD 5 uses 'ich sollte' | ✅ | Fixed |
| 2026-04-15 | (course-wide) | capitalisation | 1,084 phrases capital / 4,609 lowercase. 36 duplicates differ only in case. | 🚧 | |
| 2026-04-15 | S1 R4 | audio_issue | LEGO voice heard as "ima" instead of "jetzt" (text is correct). Suspected playback bug. | ❌ | parked |
| 2026-04-15 | S4 R12 | vocab_ordering | Same as 04-07 (re-reported after backfill) | ✅ | Deleted |
| 2026-04-15 | S5 R16 | vocab_ordering | Same as 04-07 | ✅ | Deleted |
| 2026-04-15 | S10 R30 | vocab_ordering | 'den ganzen Satz' (R32) + 'ich kann' (R31) | ✅ | Deleted |
| 2026-04-16 | S18 R59 | vocab_ordering | 'uns' (R60) used at R59. Fixed but then 'dich' used (not until R100) | ✅ | Deleted, new violation found |
| 2026-04-16 | ~786 phrases | vocab_ordering | Chunk-level scan found 786. After English-side filter: 64 Cat A (new English). | ✅ | 61 deleted, 3 typos fixed |
| 2026-04-17 | S25 R78 | missing_qmark | "are you going to..." phrases need question marks | 🚧 | |
| 2026-04-17 | S25 R80 | presentation_weird | Intro doesn't give "as in" example — needed to show dative "mir" vs accusative "mich" | ❌ | |
| 2026-04-17 | S33 R103 | missing_qmark | "how long" questions without question marks | 🚧 | |
| 2026-04-17 | S34 R106 | identical_known_target | English says "here", German says "to be quiet" — mismatch. No BUILD/CONS. | 🚧 | |
| 2026-04-17 | S34 R107 | vocab_ordering + awkward_phrase | BUILD 3,7 use "they" (sie) not introduced; confused with "she" (also "sie") | ✅ + ❌ | |
| 2026-04-17 | S34 R108 | awkward_phrase | CONS 1 uses both "they" and "she" — both "sie" in German, confusing | ❌ | |
| 2026-04-17 | S36 R113 | audio_issue | LEGO says "hanasi" instead of "the story" (die Geschichte) | ❌ | |
| 2026-04-17 | S41 R124 | vocab_ordering | BUILD 5 "I'm becoming tired" — "werden" (to become) not until R143 | ✅ | |
| 2026-04-17 | S42 R125 | grammar_incomplete | "fing" should be "fing an" — separable verb "anfangen" split incorrectly | ❌ | |
| 2026-04-17 | S42 R127 | audio_issue | LEGO says "yo" instead of "than" (als) | ❌ | |
| 2026-04-17 | S51 R144 | missing_qmark | "do you enjoy..." phrases need question marks | 🚧 | |
| 2026-04-17 | S52 R148 | vocab_ordering | BUILD 7 "an seinen Freund" — introduced R150 | ✅ | |
| 2026-04-17 | S52 R149 | awkward_phrase | BUILD 4: first use of "um" meaning "in order to" — previously only "um sechs" (at six) | ❌ | |
| 2026-04-17 | S52 R149 | vocab_ordering | BUILD 5 uses "den" (relative pronoun) not seen before | ✅ | |
| 2026-04-17 | S53 R151 | vocab_ordering | BUILD 4 "she wanted them" — "them" not seen before | ✅ | |
| 2026-04-17 | S53 R152 | vocab_ordering | BUILD 7 "in her bag" — introduced R153 | ✅ | |
| 2026-04-17 | S56 R160 | presentation_weird | "one" introduced without example — learners will think number "one" not general "one does this" | ❌ | |
| 2026-04-17 | S56 R160 | vocab_ordering | BUILD 7 uses "who" relative pronoun not seen before | ✅ | |

## Spanish for English Speakers (spa_for_eng)

| date | id | category | finding | scan? | status |
|---|---|---|---|---|---|
| 2026-03-04 | S34 R97 | underpopulated_lego | "callarse" has no BUILD phrases, 1 CONS = same as BUILD | 🚧 | |
| 2026-03-04 | S40 R115 | awkward_phrase | "cómo te sientes bien" / "cómo te sientes muy bien" — unnatural split | ❌ | |
| 2026-03-04 | S41 R116 | awkward_phrase | "very okay" in BUILD phrases — unnatural English | ❌ | |
| 2026-03-04 | S45 R126 | vocab_ordering | 'everything' in CONS 2, not introduced until R127 | ✅ | Fixed |
| 2026-03-04 | S53 R147 | translation_mismatch | 'meter' (insert) translated as 'put' but should be 'put in'. BUILD/CONS vanished after LEGO edit. | ❌ | |
| 2026-03-04 | S53 R149 | translation_mismatch | 'la carta' = 'his letter' — ambiguity (su carta vs the letter) | ❌ | |
| 2026-03-26 | S21 R62 | capitalisation | Some phrases start capital, some don't | 🚧 | |
| 2026-03-26 | R79 | presentation_weird | Intro says "en contestar" but no BUILD/CONS uses it — mostly "para contestar" | ❌ | |
| 2026-03-26 | R97 | underpopulated_lego | "callarse" still no BUILD/CONS phrases | 🚧 | |
| 2026-03-26 | R115 | punctuation | Multiple phrases need `?` in Spanish and English | 🚧 | |
| 2026-03-26 | R116 | awkward_phrase | "muy bien" = "very well" not "very okay" | ❌ | Fixed |
| 2026-03-26 | R126, R127, R128 | vocab_ordering | "I don't need to" used R126-R127 but introduced R128 | ✅ | |
| 2026-04-09 | various | audio_issue | "y" (and) pronounced as letter Y — TTS issue | ❌ | Fixed (regen) |
| 2026-04-09 | S21 R61-62, S25 R71 | missing_qmark | Only has initial ¿ no final ?; English missing ? | 🚧 | Fixed |
| 2026-04-09 | S24 R69 | presentation_weird | English says "not going to be able to" but Spanish has "I'm not going to be able to" | ❌ | |
| 2026-04-09 | S33 R93 | missing_qmark | "how long?" no punctuation either language | 🚧 | |
| 2026-04-09 | S33 R93 | vocab_ordering | "llevas aprendiendo" used before introduced at R94; "llevas hablando" never introduced | ✅ | Fixed |
| 2026-04-09 | S34 R96 | gender_mismatch | F voice uses "callada" for "él" context — should be "callado" | ❌ | Mostly fixed |
| 2026-04-09 | S38 R110 | missing_qmark | Builds 2-5, Cons 1-2 are questions, need punctuation | 🚧 | |
| 2026-04-09 | S40 R115-116 | missing_qmark | Missing question marks | 🚧 | Fixed |
| 2026-04-09 | S41 R118 | gender_mismatch | "cansado" — F voice says "cansado" but 1st person should be "cansada" | ❌ | |
| 2026-04-10 | S33 R93 | presentation_weird | Intro says "how long" but text says "you have been learning" | ❌ | |
| 2026-04-10 | S33 R94 | presentation_weird | Intro says "you have been learning" but text says "how long" | ❌ | |
| 2026-04-10 | S34 R96 | gender_mismatch | Intro example "he doesn't want to be quiet" but F voice says "callada" | ❌ | |
| 2026-04-10 | S38 R110 | missing_qmark | Still needs punctuation | 🚧 | |
| 2026-04-10 | S41 R118 | gender_mismatch | Same F voice "cansado" issue | ❌ | |
| 2026-04-10 | (course-wide) | capitalisation | Still mixed capital/lowercase starts | 🚧 | |
| 2026-04-16 | S33, S38 | grammar_incomplete | "llevas/llevo aprendiendo" without time period | 🚧 | Flagged build team |
| 2026-04-16 | ~156 phrases | vocab_ordering | Combined word+chunk scan, 156 Cat A | ✅ | 155 deleted |

## Mexican Spanish for English Speakers (spa_mx_for_eng)

| date | id | category | finding | scan? | status |
|---|---|---|---|---|---|
| 2026-04-14 | R62, R71, R72, R115 | missing_qmark | Questions without ? — TTS reads as statements | 🚧 | 94 fixed |
| 2026-04-14 | S33 R92 | presentation_weird | "how long speaking Spanish with me" is awkward fragment | ❌ | Flagged build team |
| 2026-04-14 | S33 R93, S38 R109 | grammar_incomplete | "Llevas (time period) aprendiendo" without time period | 🚧 | Flagged build team |
| 2026-04-14 | S34 R95 | identical_known_target | No Spanish for "to be quiet" — target was literal English | 🚧 | Fixed (estar callado) |
| 2026-04-14 | S34 R95 | underpopulated_lego | No BUILD/CONS phrases (linked to data corruption) | 🚧 | |
| 2026-04-14 | S38 R110 | underpopulated_lego | No BUILD/CONS phrases | 🚧 | |
| 2026-04-14 | S38 R111 | audio_issue | LEGO voice says "yaku" — not reproduced by Kai | ❌ | not reproduced |
| 2026-04-14 | S42 R121 | audio_issue | LEGO voice says "yo" — not reproduced by Kai | ❌ | not reproduced |

## English for German Speakers (eng_for_deu)

| date | id | category | finding | scan? | status |
|---|---|---|---|---|---|
| 2026-03-27 | S34 R98 | identical_known_target | "still sein" for both German and English | 🚧 | Fixed |
| 2026-03-27 | S34 R98 | underpopulated_lego | No BUILD/CONS phrases | 🚧 | Fixed (phrases exist) |
| 2026-04-10 | S34 R98 | identical_known_target | Still showing "still sein" — stale export | 🚧 | Re-exported |

## English for Spanish Speakers (eng_for_spa)

| date | id | category | finding | scan? | status |
|---|---|---|---|---|---|
| 2026-03-04 | S34 R97 | underpopulated_lego | "callarse" has no BUILD, 1 CONS | 🚧 | |
| 2026-03-04 | S40 R115 | awkward_phrase | Unnatural splits: "cómo te sientes bien" | ❌ | |
| 2026-03-26 | S21 R62 | capitalisation | Mixed capital/lowercase starts | 🚧 | |
| 2026-03-26 | R79 | presentation_weird | Intro "en contestar" doesn't match BUILD/CONS "para contestar" | ❌ | |
| 2026-03-26 | R97 | underpopulated_lego | Still no BUILD/CONS | 🚧 | |
| 2026-03-26 | R115 | missing_qmark | Need punctuation for questions | 🚧 | |
| 2026-03-26 | R128 | vocab_ordering | "I don't need to" used R126-R127, introduced R128 | ✅ | |
| 2026-04-10 | various | capitalisation | Still mixed starts | 🚧 | |
| 2026-04-10 | S24 R69 | presentation_weird | Intro says "not going to be able to" — mismatch | ❌ | |
| 2026-04-10 | S38 R110 | missing_qmark | Still needs punctuation | 🚧 | |
| 2026-04-10 | S41 R118 | gender_mismatch | F voice says "cansado" for 1st person (should be "cansada") | ❌ | |

## English for French Speakers (eng_for_fra)

| date | id | category | finding | scan? | status |
|---|---|---|---|---|---|
| 2026-04-02 | various | capitalisation | "i'm", "i'd" without capital I | ✅ lowercase-I check | Fixed |
| 2026-04-02 | S14 R35 BUILD 2 | mixed_language | Two French prompts in one phrase: "tu parles anglais? est-ce que tu parles anglais?" | ✅ multi-sentence | Fixed |
| 2026-04-02 | S34 R89 | identical_known_target | French given as English: "quand il y a d'autres personnes ici" — no BUILD/CONS | 🚧 | Fixed |
| 2026-04-08 | Intros | audio_issue | Not done by a French speaker — very anglicised French | ❌ | Fixed (Celeste voice) |

## English for Japanese Speakers (eng_for_jpn)

| date | id | category | finding | scan? | status |
|---|---|---|---|---|---|
| 2026-02-26 | S12 R35 | awkward_phrase | "You speak English with someone else tomorrow" — unnatural | ❌ | Fixed |
| 2026-02-26 | S20 R15 (R65) | underpopulated_lego | "name" has no BUILD, only "but I want to learn name" as CONS | 🚧 | Fixed |
| 2026-02-26 | S29 R46 (R95) | underpopulated_lego | "speaking better as soon as I can" has no BUILD/CONS | 🚧 | Fixed |
| 2026-02-26 | S41 R30 (R129) | vocab_ordering | "I'm starting to feel tired" — LEGO introduced next R31 | ✅ | Fixed |
| 2026-03-05 | S4 R09 | awkward_phrase | "to speak something", "I want to speak something" — unnatural | ❌ | Removed |
| 2026-03-05 | (course-wide) | punctuation | Inconsistent `ka` particle + `?` usage. Some have both, some only `ka`. Full stops push text left in app. | ❌ | |
| 2026-03-12 | S255 R613 | translation_mismatch | Japanese is 2 questions, English is 1 ("When do you think you'll be ready? Tonight?" vs "...ready tonight?") | ❌ | |
| 2026-03-12 | S254 R612 CONS 1 | translation_mismatch | Japanese: "ready since this morning. Are you ready to go?" English: "...and I'm ready to go" — different meaning | ❌ | |
| 2026-04-08 | S255 R610 BUILD 1-2 | translation_mismatch | Incorrect English translations of Japanese. Repeated in CONS 1-2. | ❌ | Fixed 04-10 |
| 2026-04-07 | S7 R18 | audio_issue | M voice says 'konnichiwa' instead of 'kyou' for 今日 kanji | ❌ | |
| 2026-04-07 | S22 R6 | audio_issue | F and M need 'hito' instead of 'nin' for 人 kanji in this context | ❌ | |

## English for Arabic Speakers (eng_for_ara)

| date | id | category | finding | scan? | status |
|---|---|---|---|---|---|
| 2026-03-13 | up to R40 | awkward_phrase | Removed a couple of odd phrases (unspecified) | ❌ | Fixed |
| 2026-03-16 | up to R140 | capitalisation | Missing capital I for "i'm", "i'd" | ✅ | Fixed |
| 2026-03-16 | up to R140 | missing_qmark | Missing question marks | 🚧 | Passed to Kai |
| 2026-03-27 | on Stage | punctuation | ? appearing in wrong place in English phrases | ❌ | |
| 2026-04-08 | on Stage | capitalisation + punctuation | Still "i'm" and question marks in wrong place | 🚧 | |

## English for Korean Speakers (eng_for_kor)

| date | id | category | finding | scan? | status |
|---|---|---|---|---|---|
| 2026-04-01 | up to R140 | capitalisation | "i'm" and "i'd" needing capital I | ✅ | Fixed |

## English for Italian Speakers (eng_for_ita)

| date | id | category | finding | scan? | status |
|---|---|---|---|---|---|
| 2026-04-08 | Intros | audio_issue | English voice with strong Italian accent | ❌ | |

## English for Portuguese Speakers (eng_for_por)

| date | id | category | finding | scan? | status |
|---|---|---|---|---|---|
| 2026-04-08 | Intros | audio_issue | Needs intros generating | ❌ | Generated |
| 2026-04-10 | Intros | audio_issue | English voice trying to speak Portuguese | ❌ | |

## Portuguese for English Speakers (por_for_eng)

| date | id | category | finding | scan? | status |
|---|---|---|---|---|---|
| 2026-04-13 | welcome | data_corruption | Welcome mentions "European vs Brazilian accent" | ❌ | Fixed (robo-Aran regen) |

## Brazilian Portuguese for English Speakers (por_br_for_eng)

| date | id | category | finding | scan? | status |
|---|---|---|---|---|---|
| 2026-04-15 | S34L02 | identical_known_target | "to be quiet" → "to be quiet" (same data corruption as spa_mx) | 🚧 | Fixed (ficar calado) |
| 2026-04-15 | S134L01 | identical_known_target | "um" → "um" — Portuguese article, not English "um" | 🚧 | Fixed (known→"a") |
| 2026-04-15 | 10 phrases | missing_qmark | Direct questions without ? | 🚧 | Fixed |

## Italian for English Speakers (ita_for_eng)

| date | id | category | finding | scan? | status |
|---|---|---|---|---|---|
| 2026-04-11 | S98L04 + 42 audio records | audio_issue | "qualcos'altro" → Azure TTS says "altro" only. Apostrophe elision bug. | ❌ | 38 regenerated with "qualcosaltro" TTS text |

## x_for_jpn Courses (all 6)

| date | id | category | finding | scan? | status |
|---|---|---|---|---|---|
| 2026-04-13 | Presentations | audio_issue / presentation_weird | Japanese word appears "said twice" — template pause too short (em-dash). | ❌ | Template updated: comma (、) |
| 2026-04-15 | 10 seeds × 6 courses | wrong_language_mention | Known text says 日本語 (Japanese) instead of target language name | 🚧 | 78 texts fixed, 54 audio deleted |

## All courses (global issues)

| date | id | category | finding | scan? | status |
|---|---|---|---|---|---|
| 2026-04-13 | 6,082 phrases + 13,883 audio | punctuation | Speech marks wrapping text ("text" in quotes) | ✅ | Stripped globally |

---

## Patterns to codify in language-patterns library

(Implementation lives in `.claude/commands/scan-course.md` Check 17. Add new patterns here with the regex and required-context, then wire them into Check 17.)

### Spanish (`spa`) ✅ implemented as 17a
- **`llevar + gerund` needs a time duration** (or "cuánto tiempo" question word, or `desde que ...`)
  - Surface: `/\bllev[oa]s?\s+\w+ndo\b/i`
  - Required: `/(cuánto tiempo|\bun[oa]s?\s+\w+|\bmucho\s+tiempo|\bm[aá]s o menos\s+\w+|\bdesde que\s+\w+)/i`
  - Known FP: `desde que empezaste a trabajar aquí` — scan Check 17a's TIME_DURATION regex may need `desde que` added.

### Italian (`ita`) ✅ implemented as 17b
- **Subjunctive after `penso che` / `credo che`**
  - Surface: `/\bpens[oa]\s+che\b/i` or `/\bcred[oa]\s+che\b/i`
  - Detection: flag common indicative 3sg/3pl forms (ha, hanno, è, sono, può, deve, vuole, fa, va, viene, sa, dice, ...) appearing after the "penso/credo che" trigger. Fix is mechanical (indicative → subjunctive table).

### German (`deu`) 🚧 candidates only (17c)
- **Verb-final in subclauses** — "weil/wenn/dass/ob/als/nachdem/bevor/..." trigger verb-final word order
  - Surface: `/\b(weil|wenn|dass|ob|als|nachdem|bevor|während|damit|obwohl|falls|sobald)\b/i` in phrase
  - Detection regex flags candidates but cannot verify verb placement — needs LLM (Step 6) or Deborah.

### Japanese (`jpn`) ✅ implemented as 17d (consistency report)
- **`ka` particle + `?` consistency** — either both or just `ka`, but not a mix across a course
  - Reports `ka+?` vs `ka`-only vs `?`-without-`ka`. Minority gets flagged for alignment.
- **Kanji readings** — context-dependent (kun/on-yomi). Single-char kanji especially. Not mechanically checkable; handled by `scripts/fixes/regen-jpn-single-char.cjs` (SSML `<sub alias>`).

## Cognate allowlist

### English ↔ Spanish
`idea`, `ideas`, `bar`, `total`, `hotel`, `email`, `emails`, `radio`, `internet`, `taxi`, `me`

### English ↔ German
`bar`, `email`, `hotel`, `internet`, `okay`, `ok`, `taxi`

### English ↔ Portuguese
`total`, `hotel`, `emails`, `internet`, `taxi`, `radio`, `um`

### English ↔ Italian
`email`, `hotel`, `internet`, `okay`, `taxi`, `radio`

---

## Calibration Results

*(Populated after Step 5 of the scanner improvement plan — run each mechanical check against this catalog, measure precision/recall per category.)*

TBD
