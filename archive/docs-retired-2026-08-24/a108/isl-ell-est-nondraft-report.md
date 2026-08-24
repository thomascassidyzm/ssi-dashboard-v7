# A-108 — the Icelandic, Greek and Estonian non-draft pocket

2026-08-14. The open item left by today's A-108 sweep, measured against the live DB and the
live clips. **Nothing was written and nothing was rendered.** The reason is the finding.

## Headline

Every one of the 38 clips behind this pocket **already speaks the wrong form aloud**. Tom's
constraint (b) — text-fix only where the audio is already right — therefore had zero rows to
act on. The pocket is a **render proposal, not an edit**: 38 clips, 74 rows, 3,056 characters,
about **5 US cents** of TTS.

The cost is not the gate. The gate is that **all 38 clips are Azure voices**, and Tom's
standing ruling is xAI first, Azure only where xAI has no voice. Re-rendering here means
re-rendering on Azure. That needs his call before anything moves.

## What was examined

763 non-draft rows across the three courses — `pod-0` (142 each, fully recorded) and the
non-draft half of `pod-0-unrecorded`. The two pods share clips, so 74 candidate rows resolve
to 38 distinct clips.

| Course | Non-draft rows | Candidate rows | Distinct clips | Gender | Register | Annotations |
|---|---|---|---|---|---|---|
| isl_for_eng | 238 | 11 | 6 | 6 clips | **0 — see below** | 0 |
| ell_for_eng | 260 | 20 | 10 | 5 clips | 5 clips | 0 |
| est_for_eng | 265 | 43 | 22 | **0 — see below** | 22 clips | 0 |

**Rule 1 is a clean zero across all three courses.** A detector covering ASCII and Unicode
slashes, round and full-width parens, square and full-width brackets, braces, angle brackets,
guillemets, backslash and the Latvian `-(` dash-paren form returns nothing on any of the 763
rows, known side or target side.

The sweep's rough sizing was "Icelandic and Greek 22 lines, Estonian 10". Measured: Icelandic
and Greek together are 31 rows / 16 clips, and Estonian is 43 rows / 22 clips — the Estonian
register fault is four times the sizing, because it is not confined to scene 10. Scene 10 is
where someone noticed it.

## Gender — resolved from the cast voice, not the `gender` field

The `.gender` field disagrees with the voice on several roles in these courses (Estonian
`Barista` is marked `f` but cast Kert; `Driver` and `Tourist` are marked `m` but cast Anu;
Icelandic `Customer*` is marked `n` but cast Guðrún). Per Tom's rule 2 every call below is
made from `speakers[role].target.voice_id`:

- Icelandic: Guðrún = female, Gunnar = male.
- Greek: Αθηνά = female, Νέστορας = male.
- Estonian: Anu = female, Kert = male.

### Icelandic — 6 clips

| Scene | Speaker (voice) | Now | Should be | Why |
|---|---|---|---|---|
| 4.3 | Friend (Gunnar, m) | `ég er upptekin` | `upptekinn` | self-reference, male speaker |
| 8.12 | Customer 1 (Guðrún, f) | `ég sé svangur` | `svöng` | self-reference, female speaker |
| 10.7 | Customer (Guðrún, f) | `Ég er mjög þakklátur` | `þakklát` | self-reference, female speaker |
| 15.6 / 22.6 | Friend (Gunnar, m) | `þú sért tilbúinn` | `tilbúin` | describes the **addressee**, the female Learner |
| 15.8 / 22.8 | Friend (Gunnar, m) | `að vera fullur af sjálfstrausti` | `full` | describes the addressee |
| 15.11 / 22.11 | Learner (Guðrún, f) | `Ég er mjög ánægður` | `ánægð` | self-reference, female speaker |

Scene 4.3 runs the other way to the rest: a **male** speaker written feminine. It is the one
row in this pocket where the defect is masculine-missing rather than masculine-imposed.

### Greek — 5 clips

All five are the scene 15 / scene 22 Learner-and-Friend dialogue, the pocket the sweep named:

| Scene | Speaker (voice) | Now | Should be |
|---|---|---|---|
| 15.1 / 22.1 | Learner (Αθηνά, f) | `νιώθω λίγο νευρικός` | `νευρική` |
| 15.5 / 22.5 | Learner (Αθηνά, f) | `Δεν είμαι σίγουρος` | `σίγουρη` |
| 15.6 / 22.6 | Friend (Νέστορας, m) | `είσαι έτοιμος` | `έτοιμη` (addressee) |
| 15.8 / 22.8 | Friend (Νέστορας, m) | `να είσαι ήδη σίγουρος` | `σίγουρη` (addressee) |
| 15.11 / 22.11 | Learner (Αθηνά, f) | `Είμαι πολύ χαρούμενος` | `χαρούμενη` |

### Estonian — a genuine zero, and it is a fact about the language

Estonian has no grammatical gender: no gendered pronouns, no gendered adjective or participle
agreement, no gendered verb forms. There is no surface anywhere in the language for the defect
to appear on. Zero here is not a miss.

## Register — T-V

### Icelandic — a genuine zero, and it is a fact about the language

Icelandic has no living T-V distinction. `þú` is universal, to strangers, to shop staff, to
the President. The polite plural `þér` is archaic and survives only in liturgy and parody.

The evidence, not just the claim: 14 non-draft rows contain the string `þér`, and **every one
of them is the dative of `þú`** — `hvað má ég bjóða þér`, `fáðu þér sæti`, `þakka þér
kærlega`. Not one is a polite-plural nominative. The one apparent formalism, `Afsakið` in
scene 2, is the frozen idiomatic "excuse me" and is used to intimates too.

An Icelandic register fix here would be an error, not a fix.

### Greek — 5 clips

Greek has a real T-V pair (`εσύ` / `εσείς`), and the service scenes hold it correctly almost
everywhere — barista, bartender, waiter, pharmacist, receptionist and taxi driver are all V.
Two places leak T:

| Scene | Speaker | Now | Should be |
|---|---|---|---|
| 2.2 | Passenger | `Παρακαλώ, κάτσε.` | `καθίστε` |
| 13.1 | Tourist | `ξέρεις πώς` | `ξέρετε πώς` |
| 13.2 | Local | `Πήγαινε ίσια` | `Πηγαίνετε ίσια` |
| 13.5 | Local | `πάρε την πρώτη έξοδο` | `πάρτε` |
| 13.7 | Local | `Θα δεις … στα αριστερά σου` | `Θα δείτε … στα αριστερά σας` |

Scene 13 is self-refuting as it stands: four T lines, then the tourist signs off with the V
form `Ήσασταν πολύ βοηθητικός`. It is half-polite in exactly the way Estonian scene 10 is.

### Estonian — 22 clips, and it is not just scene 10

`sina` / `teie` is real in Estonian and service convention is firmly `teie`. The fault runs
through every service scene, not only the one the sweep spotted:

| Scene | Clips | What leaks |
|---|---|---|
| 7 — barista | 3 | `Kas sa istud siin`, `Kas soovid veel midagi`, `Kas sa soovid siin istuda` |
| 8 — bartender | 1 | `või võid võtta` |
| 9 — waiter | 2 | `mida sa … soovitaksid`, `kui oled valmis` |
| 10 — pharmacy | 5 | `pead`, `leiad`, `sa oled olnud`, `Kas sa oled siin puhkusel? Sa räägid`, `lahke sinult` |
| 12 — pharmacist | 2 | `sinu sümptomid`, `Proovi peavalu vastu` |
| 13 — stranger | 5 | `kas sa tead`, `Mine`, `võta`, `Sa näed`, `Sa oled olnud` |
| 14 — taxi | 4 | `Kas saad`, `Kuidas arvad`, `Kas sa tead`, `jätan su` |

Each scene is already mixed — scene 7's barista says `Mida soovite?` and `Kas soovite tavalist
või suurt?` in V, then drops to `Kas sa istud siin` two lines later. The learner is being shown
both registers inside one exchange with one stranger.

Scenes 1, 4, 5, 6 (neighbour, friend, Anna/James) and 15/22 (Learner and Friend) are peer
scenes and correctly T. Scenes 2, 3 and 11 are already correctly V. Narrator lines were left
alone throughout — they are addressed to nobody.

## The whisper check — the reason nothing was written

All 38 clips were downloaded from `ssi-audio-stage`, converted to 16 kHz mono and decoded with
`whisper-cli` / `ggml-medium` at the clip's own language. The full decode set is in
`docs/a108/isl-ell-est-nondraft-applied-log.json`, one entry per row.

**36 of 38 decode unambiguously, and all 36 speak the current, wrong form.** Greek
`νευρικός`, `σίγουρος`, `έτοιμος`, `χαρούμενος`, `κάτσε`, `Πήγαινε`, `πάρε`, `Θα δεις … σου`
are all audibly there. Estonian `pead`, `leiad`, `sa oled`, `sinult`, `sinu`, `Proovi`,
`Mine`, `sa tead`, `soovid`, `võid`, `arvad`, `saad` are all audibly there. Icelandic
`svangur`, `þakklátur`, `fullur` are all audibly there.

**Two Icelandic rows I cannot verify, and I am not going to pretend otherwise.** Scene 4.3
(`upptekin`/`upptekinn`) and scene 15.6/22.6 (`tilbúinn`/`tilbúin`) both turn on a word-final
`-n` vs `-nn`, and whisper-medium does not track that contrast in Icelandic. Proof: a control
clip, isl scene 9.17, whose stored text is unambiguously `tilbúinn` (a woman addressing the
male waiter) decodes as `tilbúin` — the model drops the geminate. Its decode of scene 4.3 as
`upptekinn` where the text reads `upptekin` is the same coin landing the other way and is just
as likely to be its language prior rather than the acoustics.

Those two rows go into the render bucket anyway, because the clip was synthesised from the
stored text and `course_audio.text` still equals that stored text. But the honest statement is
that they are **unverified by listening**, not verified-wrong.

## Constraint (d): `course_audio.text` is not stale here

Today's sweep found the render path reads `course_audio.text` rather than the pod row. Checked
on all 74 rows: `course_audio.text` is **byte-identical to `listening_pod_sentences.target_text`
in every single case**. There is no stale-clip-text discrepancy in this pocket, which means a
future render would reproduce exactly the wrong forms listed above, and it also means a
pod-text-only edit would have silently desynced the two. Another reason nothing was written.

## The render proposal — for Tom's approval, nothing done

| Course | Clips | Rows | Characters | Voices |
|---|---|---|---|---|
| isl_for_eng | 6 | 11 | 694 | is-IS-GudrunNeural, is-IS-GunnarNeural |
| ell_for_eng | 10 | 20 | 1,122 | el-GR-AthinaNeural, el-GR-NestorasNeural |
| est_for_eng | 22 | 43 | 1,240 | et-EE-AnuNeural, et-EE-KertNeural |
| **Total** | **38** | **74** | **3,056** | all Azure |

At Azure neural rates (~$16 per million characters) the whole pocket is **$0.049** — under a
nickel, about four minutes of audio. Money is not the decision.

**The decision is the voices.** Every clip in this pocket is an Azure voice, and every
replacement would be too. That collides head-on with the xAI-first ruling, so per that ruling
this is a pause-and-report, not a silent render. Three ways forward, and my recommendation is
the second:

1. **Re-render on the same Azure voices.** Cheapest, make-before-break clean, fixes the
   learner-facing defect this week. But it deepens the Azure footprint in three courses.
2. **Recast these three courses to xAI voices first, then render the corrected text once.**
   The pocket is only 38 clips, but the courses are 142 recorded clips each — a recast is a
   whole-course job, and doing the correction as part of it means paying the render once
   instead of twice. It also means the defect stays live until the recast lands.
3. **Leave it.** Not recommended. Greek and Estonian learners are currently being taught
   `κάτσε` to a stranger and `sa` to a pharmacist, and a female learner persona hears herself
   described in the masculine throughout the closing dialogue.

Whichever way it goes: no `accept` step has been run, `--i-have-listened` has never been
typed, and no clip has been deleted or replaced.

## Rows I could not resolve

- **isl 4.3 and isl 15.6 / 22.6** — the `-n`/`-nn` contrast, described above. Text analysis
  says both are wrong; the listening check cannot confirm it. A native ear or a better
  Icelandic ASR would settle them in seconds.
- **ell 10.4** — `θα πρέπει να κοιτάξετε για να είστε σίγουροι`, spoken by the male Assistant
  to the female Customer. Formal-plural masculine `σίγουροι` addressed to one woman: Greek
  allows both this and the semantically-agreeing `σίγουρη`. Genuine taste fork, logged, not
  touched.
- **ell 10.9** — `Είστε πολύ καλοί!` from the Customer to a single male Assistant. Same
  honorific-plural question. Logged, not touched.
- **isl 11.2** — `Velkomin` from the Receptionist to the Guest. Feminine singular *or* mixed
  plural; the Guest asks for a late check-out "for us" and is answered in the plural, so the
  plural reading is defensible. Left alone deliberately.

## Files

- `docs/a108/isl-ell-est-nondraft-applied-log.json` — every one of the 74 rows: id, pod, scene,
  speaker, rule, before, proposed after, clip id, clip S3 key, clip voice, whisper transcript,
  and `applied: false` with the reason. `writes_applied: 0`.
- `tools/a108/nondraft-plan.cjs` — the read-only builder that produced it and the cost
  derivation.

Every row still carries `target_text_draft = false`, unchanged, because no row was written.
