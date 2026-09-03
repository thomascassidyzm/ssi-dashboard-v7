# spa_for_eng 250–300 — Section A applied to the live DB

**Applied: 19 of the 29 Section-A (A1/A2/A3) rows, plus 1 ZUT-repair = 20 database writes.**
Live Supabase, `course_practice_phrases.target_text`. Written 2026-08-24. No LEGO edits, no seed edits, no TTS.

---

## 0. First, a correction to the brief's arithmetic

The brief said "Section A only (A1, A2, A3) — 37 phrases". The document's own "37 phrases, 19 seeds" headline **includes A4**. Counted from the tables:

| block | phrases |
|---|---|
| A1 | 14 (the s298 row is four phrase ids: U02, U09, U12, U20) |
| A2 | 11 |
| A3 | 4 |
| **A1–A3 subtotal** | **29** |
| A4 (excluded by the brief) | 8 |
| **doc total** | **37** |

So the reachable ceiling for this job was **29, not 37**. I applied 19 of those 29 and held 10. Nothing from A4, B, C or D was touched.

---

## 1. What was applied (20 rows)

| # | seed | phrase id | was | now |
|---|---|---|---|---|
| 1 | s267 | `S0267L01U11` | Sé que has tenido noticias de tu amigo así que no | **Sé que has tenido noticias de tu amigo así que no me preocupo** |
| 2 | s285 | `S0285L01U06` | Creo que ella habla muy bien pero todavía puede cometer errores | **Sé que ella habla muy bien pero todavía puede cometer errores** |
| 3 | s281 | `S0281L03U13` | Me gusta más mi café cuando tengo tiempo para relajarme bien | **Me gusta más mi café cuando tengo tiempo para relajarme un rato** |
| 4 | s298 | `S0298L02U02` | La verdad es que no me queda nada que decir contigo | **La verdad es que no me queda nada que decirte** |
| 5 | s298 | `S0298L02U09` | No me queda nada que decir contigo esta mañana | **No me queda nada que decirte esta mañana** |
| 6 | s298 | `S0298L02U12` | Lo siento no me queda nada que decir contigo hoy | **Lo siento no me queda nada que decirte hoy** |
| 7 | s298 | `S0298L02U20` | No me queda nada que decir contigo esta tarde | **No me queda nada que decirte esta tarde** |
| 8 | s295 | `S0295L01U11` | Dije que quería verte antes del fin de semana | **Dije que quería verte antes de que te vayas el fin de semana** |
| 9 | s291 | `S0291L02U10` | Así que espero que termines pronto para poder hablar mejor pronto | **Así que espero terminar pronto para poder hablar mejor pronto** |
| 10 | s259 | `S0259L01U16` | Una idea mejor sería pensar en eso con cuidado | **Una idea mejor sería pensar con más cuidado** |
| 11 | s282 | `S0282L02U01` | No es un problema cuando trabajas en algo difícil con ellos | **No es un problema cuando trabajas en algo difícil** |
| 12 | s285 | `S0285L01U11` | No estoy listo para hablar con personas que no conozco todavía pero ella habla con ellos | **Ella habla con mis amigos cuando están aquí para practicar** |
| 13 | s285 | `S0285L01U14` | Si puedes hablar más despacio eso sería genial y ella habla bien | **Si puedes hablar más despacio eso sería genial y ella habla demasiado rápido** |
| 14 | s291 | `S0291L02U11` | Sé que poder hablar mejor pronto es algo que quiero y que puede llevar tiempo | **Sé que poder hablar mejor pronto es algo que puede llevar tiempo** |
| 15 | s263 | `S0263L01U14` | No sé a quién te refieres pero mi amigo trabajaba en una oficina | **No sé a quién te refieres pero él trabajaba en una oficina** |
| 16 | s263 | `S0263L01U10` | No sé a quién te refieres pero ese hombre con el que estabas hablando ayer está intentando ayudarme | **No sé a quién te refieres pero ese hombre con el que estabas hablando ayer estaba intentando ayudarme** |
| 17 | s262 | `S0262L03U09` | Sabía con el que estabas hablando porque el hombre está intentando ayudarme | **Sabía con el que estabas hablando porque estaba intentando ayudarme** |
| 18 | s281 | `S0281L01U10` | ¿Te importa si quiero hacerlo de manera diferente? | **¿Te importa si lo hago de manera diferente?** |
| 19 | s281 | `S0281L04U11` | Pienso que es útil antes de que empieces pensar en lo que quieres decir | **Pienso que es útil antes de que empieces a pensar en lo que quieres decir** |
| 20 | s281 | `S0281L04U05` | Pienso que es útil antes de que empieces pensar en lo que quieres decir | **Pienso que es útil antes de que empieces a pensar en lo que quieres decir** |

Row 20 (`S0281L04U05`) is **not** from the analysis. See §4 — it is the ZUT repair.

Read-back from the live DB after writing: **20 of 20 character-exact** against the intended string (compared with `===` on the raw value, not normalised). 0 mismatches.

---

## 2. What was NOT applied, and why — 10 rows

Every one of these fails the same test the brief set: *does the proposed Spanish use only what the learner has been taught by that seed?* I checked each proposed form against all 742 spa_for_eng LEGOs (seeds 1–300) **and** against the full 16,328-phrase corpus.

**Three of these holds contradict a "taught at" citation in the analysis itself. Those citations are wrong.**

| seed | phrase id | proposed | untaught form | evidence |
|---|---|---|---|---|
| 291 | `S0291L02U06` | …pero es posible **si practicas** a menudo | `practicas` | **Never taught anywhere in the course.** Only `practicar` (S0005L01, s5). Zero occurrences in any LEGO and zero in any of the 16,328 phrases. *(This is the row the brief flagged.)* |
| 272 | `S0272L03U12` | porque eso **siempre** es lo mejor | `siempre` | Analysis says "siempre taught s181" — **false**. First and only LEGO is **S0542L01 (s542)**, 270 seeds later. It does appear in two earlier *phrases* (s190, s213), but never as a taught LEGO. |
| 299 | `S0299L01U04` | pero **yo también** quiero pagar | `yo`, `también` | Analysis says "también taught s262" — **false**. `también` appears in **zero LEGOs and zero phrases** in the entire course. `yo` as a standalone pronoun: zero LEGOs; one prior phrase (s291). |
| 282 | `S0282L02U15` | …**podemos** encontrar una manera de arreglarlo | `podemos` | **Zero LEGOs, zero phrases, course-wide.** "we can" is taught only at S0469L02 (s469) and as *`podamos`*. (A4 of the analysis asserts "podemos — s277"; that is also wrong.) |
| 252 | `S0252L02U08` | necesito que me **digas** cuándo… | `digas` | First LEGO **S0533L02 (s533)**. One earlier phrase at s249. The cited S0249L01 teaches the *pattern* (`que me ayudes`) but not this verb form. |
| 254 | `S0254L01U11` | **Le dije** que estoy listo… | `dije` | First LEGO **S0295L01 (s295)** — 41 seeds after this phrase. `dijo`/`dijiste` are taught early; the 1sg is not. |
| 281 | `S0281L01U07` | ¿Te importa si **lleva** demasiado tiempo contestar? | `lleva` (3sg) | Taught: `llevar` (s181), `llevas` (s33), `llevo` (s38). The 3sg `lleva` appears in **no LEGO and no phrase** before s281. |
| 283 | `S0283L03U05` | son muy interesantes para hablar **con ellas** | `ellas` | **Zero LEGOs, zero phrases, course-wide.** `con ellos` *is* taught (S0134L03, s134). |
| 283 | `S0283L01U06` | cuáles son los **mejores** | `mejores` | Zero LEGOs, zero phrases, course-wide. The analysis flags this itself ("mejores never taught"). |
| 286 | `S0286L01U04` | — | — | The analysis offers **no proposal**: "needs Deborah — ayudarles/ayudarlas never taught". Nothing to apply. |

All 10 were verified untouched after the pass: `target_text`, `version` and audio links identical to the pre-edit backup.

### Decisions I need from Kai (each is a one-liner)

Two of these have a fix reachable with taught material only, if you want it; two more definitively do not:

- **s272 `S0272L03U12`** — drop `pienso que` and stop: `…porque eso es lo mejor`. That removes the unlicensed "I think" (the actual A1 charge) and introduces nothing. It leaves "always" unrendered. **Say the word and I apply it.**
- **s283 `S0283L03U05`** — `…son muy interesantes para hablar con ellos` using the taught `con ellos` (S0134L03) instead of the untaught `ellas`. Fixes the ungrammatical `muy interesante hablar` completely.
- **s299 `S0299L01U04`** — the "too" cannot be rendered at all: `también` exists nowhere in this course. There is no taught-only fix; this needs a LEGO.
- **s281 `S0281L01U07`** — no taught-only formulation exists either; `lleva` is unavoidable for the impersonal reading.

The remaining rows (252, 254, 283/L01U06, 286, 291/L02U06, 282/L02U15) all need either a new LEGO or Deborah's word.

---

## 3. Check 2 — the corrected form was taught before this point

Every added form, with the LEGO that introduced it. All strictly earlier than the phrase's own seed.

| phrase | added form | taught by |
|---|---|---|
| S0267L01U11 (s267) | `me preocupo` | **S0046L01** s46 "I don't worry about" = *no me preocupo por* |
| S0285L01U06 (s285) | `sé` | **S0059L01** s59 "I know" = *sé* |
| S0281L03U13 (s281) | `un rato` | **S0092L03** s92 "a while" = *un rato* |
| S0298L02U02/09/12/20 (s298) | `decirte` | **S0235L02** s235 "to tell you" = *decirte* |
| S0295L01U11 (s295) | `te vayas` | **S0119L01** s119 "you leave" = *te vayas* |
| S0291L02U10 (s291) | `terminar` | **S0050L01** s50 "to finish" = *terminar* |
| S0259L01U16 (s259) | `más` | **S0003L03** s3 = *lo más frecuentemente posible* |
| S0282L02U01 (s282) | — deletion only | no new form introduced |
| S0285L01U11 (s285) | `mis amigos` / `cuando` / `están` / `aquí` / `practicar` | **S0051L03** s51; **S0034L03** s34; **S0213L04** s213 "they're trying to" = *están intentando*; **S0034L03** s34; **S0005L01** s5 |
| S0285L01U14 (s285) | `demasiado` / `rápido` | **S0027L01** s27 "too much"; **S0050L02** s50 *lo más rápido posible* |
| S0291L02U11 (s291) | — deletion only | no new form introduced |
| S0263L01U14 (s263) | `él` | **S0016L01** s16 "he wants" = *él quiere* |
| S0263L01U10 (s263) | `estaba` | **S0042L01** s42 "I was starting to" = *estaba empezando a* |
| S0262L03U09 (s262) | `estaba` | **S0042L01** s42 |
| S0281L01U10 (s281) | `lo hago` | **S0190L01** s190 "I make" = *hago* |
| S0281L04U11 + U05 (s281) | `a` (before infinitive) | **S0005L02** s5 "I'm going to" = *voy a* |

---

## 4. Check 3 & 4 — collisions, ZUT, duplicates

**I created one ZUT violation, detected it, and repaired it.**

`S0281L04U05` and `S0281L04U11` carry **byte-identical English** ("I think it is useful before you start to think about what you want to say") and previously **byte-identical Spanish**. The analysis listed only U11. Fixing U11 alone left the same English answering to two different Spanish — a straight ZUT breach — while U05 kept the exact same `empieces pensar` defect. I applied the same approved A3 fix to U05. That is the one edit here not literally in the document, and I am flagging it rather than burying it.

Two other edited rows previously **shared** their Spanish with a different phrase. My edits *removed* those merges — the correct direction:

| pair | English | before | after |
|---|---|---|---|
| `S0282L02U01` / `S0230L02U03` | "…something difficult" vs "…something difficult **with other people**" | both *…con ellos* | U01 now *…en algo difícil*; U03 keeps *…con ellos* (correct for its English) |
| `S0295L01U11` / `S0295L01U04` | "before **you left for** the weekend" vs "before the weekend" | both *antes del fin de semana* | U11 now *antes de que te vayas el fin de semana*; U04 unchanged |

**Final state across all 20 edited rows:**
- New "one Spanish, two different Englishes" collisions: **0**
- Remaining ZUT splits (same English → different Spanish): **0**
- New exact-duplicate phrases: **0**

*Calibration:* the same detectors report 682 shared-Spanish groups and 606 shared-English groups course-wide, so a zero here is a real zero, not an empty query.

---

## 5. Check 5 — presentations and `course_audio.text`

- `presentation_audio_id` on all 20 edited rows: **NULL, before and after.** No presentation clip exists for any of them, so there is nothing to mirror.
- `course_audio.text` vs `course_practice_phrases.target_text` **before** the edit: word-identical on all 87 linked clips across the 29 candidates. The 51 raw string diffs were entirely lowercased initials and trailing full stops.
- I swept all 20 old strings against `course_audio.text_normalized` scoped to `spa_for_eng`: **0 additional rows** hold an old text beyond the 38 clips listed in §6. (Calibrated: querying a known old string returns its 2 clips.)
- `course_legos` and `course_seeds`: **0 rows** anywhere carry an edited old string. No LEGO or seed text needed changing, and none was changed.

### ⚠️ One thing that IS now stale and I did not fix

**All 20 rows still carry a `decomposition` array describing the OLD Spanish.** E.g. S0267L01U11's decomposition still tiles `Sé | que | has | tenido noticias | de | tu | amigo | así que | no` — it has no tile for the new `me preocupo`. `display_tiling` is NULL on all 20, so this is the live tiling source.

I did not touch it: regenerating a decomposition is a decomposer job against the LEGOs, it was not in scope, and guessing at it by hand would be exactly the kind of over-reach this pass is meant to avoid. **This needs a decomposer re-run over the 20 rows.** Flagging it as an explicit gap.

---

## 6. Check 6 — STALE AUDIO. Report only; nothing generated.

**The trigger NULLed both target audio links on every edited row.** So learners do not hear the old words — they hear **nothing** in the target slots. That is arguably worse than stale and is live right now.

- **40 audio slots** orphaned (20 rows × target1 + target2)
- **38 distinct clips** (S0281L04U05 and U11 shared the same two clips, since their Spanish was identical)
- **36 of those 38 are now fully unreferenced.** 2 are still correctly serving other phrases whose text did not change (`S0295L01U04`, `S0230L02U03`) — those are **not** stale for their own rows.
- `known_audio_id` untouched on all 20: no `known_text` was edited, so the English prompts still play.

**Seed 267 specifically:** the truncation the analysis confirmed in the shipped audio is clips `e6eaae6b-a5ea-42d3-bb11-52bf6dd3c28c` (target1) and `f3cb21f4-7039-4df2-9c9f-953c0b806bd4` (target2). Both really do say *"…así que no"* and stop. Both are now unlinked. The text is fixed; the audio is not.

| # | seed | phrase | slot | clip id | voice | s3_key |
|---|---|---|---|---|---|---|
| 1 | s267 | S0267L01U11 | target1 | `e6eaae6b-a5ea-42d3-bb11-52bf6dd3c28c` | es-ES-ElviraNeural | mastered/7E873CA4-A352-4024-B533-AD4E7F6D5FE6.mp3 |
| 2 | s267 | S0267L01U11 | target2 | `f3cb21f4-7039-4df2-9c9f-953c0b806bd4` | azure_es-ES-AlvaroNeural | mastered/296A86A9-5632-4D88-B085-E5045677E4A2.mp3 |
| 3 | s285 | S0285L01U06 | target1 | `9d095ce8-2d75-4a47-90b4-4e5a587d6c28` | es-ES-ElviraNeural | mastered/289EAAD7-4639-431D-A8E2-81CFBB8372F5.mp3 |
| 4 | s285 | S0285L01U06 | target2 | `00b16e4d-4e7c-4a2c-8f9e-ef308557b58e` | azure_es-ES-AlvaroNeural | mastered/FA8FF05A-ADDC-4268-9037-C42283E9C879.mp3 |
| 5 | s281 | S0281L03U13 | target1 | `eb66890c-40a3-47ce-b660-7faf3020f4b6` | es-ES-ElviraNeural | mastered/FDB393DF-5AD9-462D-A37E-1152DA321B27.mp3 |
| 6 | s281 | S0281L03U13 | target2 | `3c02dcb7-0b51-41a3-bbe4-d55ba9be270a` | azure_es-ES-AlvaroNeural | mastered/EFA6DA01-2488-491A-A611-20A06E453CF2.mp3 |
| 7 | s298 | S0298L02U02 | target1 | `266a7915-b912-42b8-9990-bddfdf94c8d2` | es-ES-ElviraNeural | mastered/25E16544-0064-4E3D-8B5A-B97980BC8A96.mp3 |
| 8 | s298 | S0298L02U02 | target2 | `c6da9bf5-71bb-4692-beb2-b227c125b318` | azure_es-ES-AlvaroNeural | mastered/EA2C79CD-A9B4-4DFF-9B29-25E5E41C9291.mp3 |
| 9 | s298 | S0298L02U09 | target1 | `1b7e36ca-0db3-45a3-b7bf-239e69896b2f` | es-ES-ElviraNeural | mastered/D4FB0446-FCEB-499E-82ED-B3B6369079DB.mp3 |
| 10 | s298 | S0298L02U09 | target2 | `fe9dc3dd-0736-45ef-8d89-d30b363331a4` | azure_es-ES-AlvaroNeural | mastered/5EC9C5FF-213D-45C9-9B18-0D5340D6E993.mp3 |
| 11 | s298 | S0298L02U12 | target1 | `e5d22697-4da4-4c2f-ae09-17127aeb8c57` | es-ES-ElviraNeural | mastered/F1C4B3DA-79CA-4652-875E-84EB73429FE9.mp3 |
| 12 | s298 | S0298L02U12 | target2 | `fc41092f-4861-4c0c-bb36-dcf71c659308` | azure_es-ES-AlvaroNeural | mastered/684E5D75-00C5-40AE-8D2B-9BAC20B56577.mp3 |
| 13 | s298 | S0298L02U20 | target1 | `fbe860c0-f8a5-440e-932a-b67b0f4899fb` | es-ES-ElviraNeural | mastered/9180C360-5B59-47A1-A1CE-570F7A23AE15.mp3 |
| 14 | s298 | S0298L02U20 | target2 | `8b286119-8289-47de-91ef-5b8bf32c36fc` | azure_es-ES-AlvaroNeural | mastered/A5B22DB7-1DB3-4225-B91A-EFD7EE9BDE0D.mp3 |
| 15 | s295 | S0295L01U11 | target1 | `b2f3ea75-a151-44ea-9945-3871dd48e49a` | es-ES-ElviraNeural | mastered/7C950861-8AE0-4F1B-9FB1-665923D1472A.mp3 |
| 16 | s295 | S0295L01U11 | target2 | `58048ca8-ed5d-453e-8a76-8371d9dacf3f` | azure_es-ES-AlvaroNeural | mastered/AF7FE768-0450-4914-B90A-603A4A3461C7.mp3 |
| 17 | s291 | S0291L02U10 | target1 | `20877e18-f6df-4c53-9bed-7da4205912ef` | es-ES-ElviraNeural | mastered/32D47C89-71BF-47D3-9DC1-23F6AB10E474.mp3 |
| 18 | s291 | S0291L02U10 | target2 | `d23bd8e0-ecf9-4554-b3b5-575c5bcfa5c9` | azure_es-ES-AlvaroNeural | mastered/7E024A07-0ACE-41D6-9ED8-5DAAF670D46E.mp3 |
| 19 | s259 | S0259L01U16 | target1 | `2e81233d-76f2-4fdc-8a38-5ed5ebbdd2c1` | es-ES-ElviraNeural | mastered/01EB229C-3B1C-4998-971D-A07F29A597D7.mp3 |
| 20 | s259 | S0259L01U16 | target2 | `f7714641-d8d5-4dad-81de-8d24afa1e7d2` | azure_es-ES-AlvaroNeural | mastered/69FDAFED-6DDB-4D08-A876-0FDA78289265.mp3 |
| 21 | s282 | S0282L02U01 | target1 | `9b755d88-7e50-4130-9b12-96a30bc93954` | es-ES-ElviraNeural | mastered/1A54B1A7-92AC-403F-ABF5-CC2201F6E8FD.mp3 |
| 22 | s282 | S0282L02U01 | target2 | `57502b4c-ae3e-4877-8921-4d6c2e7a89c3` | azure_es-ES-AlvaroNeural | mastered/95DC8642-B940-4C1F-92BD-2F9374E011BA.mp3 |
| 23 | s285 | S0285L01U11 | target1 | `c824d14b-280c-4f82-a351-2b6f573c8302` | es-ES-ElviraNeural | mastered/9291F3F5-BE3C-41D3-88FE-5E3EF9C30541.mp3 |
| 24 | s285 | S0285L01U11 | target2 | `fad77570-09a5-4f1c-a94f-9d323268a927` | es-ES-AlvaroNeural | mastered/E36ACA59-AA8C-45EE-9CC2-D110DA1B7AA2.mp3 |
| 25 | s285 | S0285L01U14 | target1 | `4a24397e-1635-40bc-92e8-43f24e561903` | es-ES-ElviraNeural | mastered/9542535D-F439-4D2B-9873-53B9D7048A49.mp3 |
| 26 | s285 | S0285L01U14 | target2 | `8b5a5a38-d9bb-4ac4-a84b-9c0cbabf0383` | azure_es-ES-AlvaroNeural | mastered/1B9CC93B-4DC3-434B-8F13-6939B2E31A60.mp3 |
| 27 | s291 | S0291L02U11 | target1 | `ae65a692-6b63-4a26-9a4e-63febf792c55` | es-ES-ElviraNeural | mastered/DF4754E9-B928-48BC-90C5-6D6063C723A2.mp3 |
| 28 | s291 | S0291L02U11 | target2 | `f6e7ae25-3dd1-4555-aa3e-fb927cd745a2` | azure_es-ES-AlvaroNeural | mastered/E8391EED-7838-4171-B004-802C4C0A786C.mp3 |
| 29 | s263 | S0263L01U14 | target1 | `add897b4-9d67-4836-888d-fdfa1292ee5e` | es-ES-ElviraNeural | mastered/03DA4E0B-96D3-4D11-A493-C4FDFBED8027.mp3 |
| 30 | s263 | S0263L01U14 | target2 | `222c38c9-2334-49e4-9405-5cd79dee996e` | azure_es-ES-AlvaroNeural | mastered/B2C57665-8517-4851-8C7B-8A79F4B7FA54.mp3 |
| 31 | s263 | S0263L01U10 | target1 | `3314edd8-202c-4bdb-a46a-71fc9b90778a` | es-ES-ElviraNeural | mastered/E265D6C9-2E6F-4EFE-A2FA-D0035A48A50C.mp3 |
| 32 | s263 | S0263L01U10 | target2 | `3aea11a3-2549-46af-a7ed-1d1ce720cbcc` | azure_es-ES-AlvaroNeural | mastered/F1C25089-36D3-4902-AF82-5F6984403A8C.mp3 |
| 33 | s262 | S0262L03U09 | target1 | `c46c56df-68cc-4e7f-9f5b-099728569a0c` | es-ES-ElviraNeural | mastered/94452552-BFC5-4BBE-A596-8D0DD6E47AB8.mp3 |
| 34 | s262 | S0262L03U09 | target2 | `40728e82-9ead-4252-a396-582be9e72f75` | azure_es-ES-AlvaroNeural | mastered/090B5CFB-013D-49AD-898B-E7186E96F4B1.mp3 |
| 35 | s281 | S0281L01U10 | target1 | `a0fa78bc-2a07-4067-a38d-97596fb5f9c5` | azure_es-ES-ElviraNeural | mastered/C85F818B-D889-4D3B-AECD-3B85A109CF09.mp3 |
| 36 | s281 | S0281L01U10 | target2 | `0b6b412c-fb11-494e-be40-1ac7527d78fc` | azure_es-ES-AlvaroNeural | mastered/2FA14EF8-8DEC-440E-84AF-22717CE85403.mp3 |
| 37 | s281 | S0281L04U11 | target1 | `ac80be38-4606-48fe-8337-46259f674e14` | es-ES-ElviraNeural | mastered/9B64C710-AE20-4A6E-8EF4-A8F00EF3BDD7.mp3 |
| 38 | s281 | S0281L04U11 | target2 | `cbe36e7e-79d5-41ae-9b5b-e5b26a35a89b` | azure_es-ES-AlvaroNeural | mastered/CCA12546-241A-4ADB-93A2-04B69D14039B.mp3 |
| 39 | s281 | S0281L04U05 | target1 | `ac80be38-4606-48fe-8337-46259f674e14` | es-ES-ElviraNeural | mastered/9B64C710-AE20-4A6E-8EF4-A8F00EF3BDD7.mp3 |
| 40 | s281 | S0281L04U05 | target2 | `cbe36e7e-79d5-41ae-9b5b-e5b26a35a89b` | azure_es-ES-AlvaroNeural | mastered/CCA12546-241A-4ADB-93A2-04B69D14039B.mp3 |


**No TTS was run. No audio was deleted. Nothing was queued.** Under CLAUDE.md a content pass normally ends by queueing an audio-pass request — I did **not** do that, because your brief said report-and-stop. The non-spending command when you want it:

```
node tools/course-optimization/queue-audio-pass.cjs spa_for_eng --reason "Section A phrase fixes 250-300 (20 rows, 40 target slots)"
```

### Now-silent slots, in context

Seeds 250–300 currently have **39 phrases with a NULL `target1_audio_id`**. **20 are mine.** The other **19** were already silent before I started (`S0256L01B03/U03/U08`, `S0257L02B04/U01`, `S0261L01B04`, `S0262L01B07`, `S0280L01B04/U05/U07`, `S0281L02B03/B04`, `S0289L02U05`, `S0293L03B03/B05`, `S0297L04B03/B04`, `S0299L03B04/B05`) — a pre-existing hole, not caused by this pass, and worth a separate look.

---

## 7. Check 7 — seeds unapproved

**The honest answer is 0, and the premise needs correcting.**

I read `course_seeds` for all 19 seeds after the writes. Every one is still `status = released` with `approved_at = 2026-03-26` and `updated_at = 2026-07-21` — i.e. **untouched**. There is no trigger that unapproves a seed when a practice phrase's text is edited. The version bump and the audio-nulling happen on `course_practice_phrases` only.

So:
- Seeds whose approval state actually changed in the DB: **0**
- Seeds whose content changed and which therefore *ought* to be re-reviewed: **10** — 259, 262, 263, 267, 281, 282, 285, 291, 295, 298
- The analysis's "19 seeds unapproved" figure counts all of A including A4; on A1–A3 alone the ceiling was 16, and I reached 10 because of the holds.

If unapproving is wanted, it is a deliberate write to `course_seeds` that nothing performed automatically. Say so and I will do it.

---

## 8. Backup and rollback

Full pre-edit rows (every column) for all 29 candidates plus `S0281L04U05` are saved outside the repo:

- `$CS_SCRATCH/BACKUP-29-rows-pre-edit.json` — complete row snapshots
- `$CS_SCRATCH/BACKUP-S0281L04U05.json` — the ZUT-repair row
- `$CS_SCRATCH/ROLLBACK.json` — id + target_text + status + version + all three audio ids + decomposition
- `$CS_SCRATCH/applied-log.json`, `applied-log-20.json` — before/after for each write
- `$CS_SCRATCH/stale-clips.json` — the orphan list with clip ids and s3 keys

**How a rollback is performed.** For each of the 20 rows, `PATCH /rest/v1/course_practice_phrases?id=eq.<id>` with `{"target_text": <old>, "target1_audio_id": <old>, "target2_audio_id": <old>}` taken from `ROLLBACK.json`. Restoring the text *and* re-pointing the two audio ids in the same PATCH returns the row to byte-identical pre-edit state; the clips were never deleted and all 38 are still present in `course_audio` with their s3 keys intact. `version` will land one higher than the original — that column counts touches, not content, and cannot be restored.

**Row-level provenance also exists independently of my files:** `content_audit_log` holds before-values for these writes. It does not record an author (`changed_by_uid` is unpopulated), so my JSON backups are the better record of *what* changed; the audit log is the independent corroboration that it changed.

---

## 9. Scope, method, and gaps

**Method.** Live Supabase via PostgREST with the service role key, throughout. No sampling: all 29 candidate rows were read and classified individually, all 742 LEGOs pulled, and the full 16,328-phrase corpus pulled in seed bands for the collision work (a single unbanded read times out). Every zero above was calibrated against a known positive first — the LEGO count matched the analysis's 742, the collision detectors return 682/606 non-empty groups, the audio-text detector returns clips for a known old string, and the exact row count 16,328 was confirmed against a `count=exact` header.

**Explicit gaps:**
1. **`decomposition` is stale on all 20 rows** (§5). Not fixed. Needs a decomposer re-run.
2. **10 of 29 A-rows unapplied** (§2) pending your word on untaught forms.
3. **Three "taught at" citations in the source analysis are factually wrong** (siempre s181, también s262, podemos s277). I did not re-audit the rest of the document's citations — only the ones my 29 rows depended on.
4. I did not verify the *rendered* audio of any clip. The analysis's whisper pass covered 15 of 965; I relied on its finding for s267 and on `course_audio.text` for the rest.
5. Nothing was queued and no audio exists for the 40 slots.

---

## 10. Landing

**These are DATABASE writes, not code.** They are **live to learners immediately** — the learning app reads `course_practice_phrases` directly from Supabase, and `course_round_index` (the one materialised view on the learner path) indexes lego ids only and carries no text, so nothing needs refreshing and nothing shields learners from the change. As of now, learners on spa_for_eng seeds 259–298 get the corrected Spanish text with **no target audio** on those 20 phrases.

**no commits.**
