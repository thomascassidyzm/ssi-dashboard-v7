# Cross-course sweep — Deborah's findings programme (2026-08-17)

Kai's ask: take every pattern class Deborah found in the five courses she has
checked (`eng_for_por`, `spa_for_eng`, `eng_for_ita`, `eus_for_eng`,
`ara_lb_for_eng`) and sweep the SAME pattern across the courses she has **not**
checked.

**Read-only.** Nothing was edited, no audio was generated, nothing was deleted.
All measurement is direct SQL via `scripts/deborah/q.cjs` against the live DB.

**RAW vs CONFIRMED are kept strictly separate throughout and never merged.**
RAW = matches the mechanical pattern. CONFIRMED = survives the validation test
described per task. Where a number would be a guess, it is not printed.

**Headline:** two of the four detectors were wrong on first run and were
corrected before reporting. The filler-Build tool I was handed does **not**
measure Deborah's defect (~81% false positives on a 16-cluster eyeball sample),
and its claim to reproduce her five `spa_for_eng` examples is false. Details and
a corrected detector are in Task 1. Please read that section before quoting any
filler number to Deborah.

---

## TASK 1 — Filler Builds

### 1a. Validation of the supplied tool: it does not measure this defect

`tools/deborah/filler-build-scan.cjs` defines a filler Build as "the LEGO's
known_text plus a residue of 1–3 tokens". I ran it estate-wide as instructed
(79 courses with `known_lang='eng'`, 0 errors) and then validated it. It fails
on both of the checks Kai asked for.

**Check 1 — does it reproduce Deborah's five `spa_for_eng` examples? No.**
All five LEGOs exist at exactly the rounds she named, so she was on the right
rows:

| Her round | LEGO known_text | lego_id | round_index in DB |
|---|---|---|---|
| R1150 | `was absolutely right` | S0544L03 | 1150 ✓ |
| R1155 | `because he has been playing` | S0547L01 | 1155 ✓ |
| R1156 | `in the mud` | S0547L02 | 1156 ✓ |
| R1157 | `I am feeling sad` | S0548L01 | 1157 ✓ |
| R1162 | `small` | S0553L01 | 1162 ✓ |

The tool flags **none** of the five as a cluster. But the deeper problem is that
**the Builds she quotes are not in the database.** The actual Builds are varied
recombination:

- S0544L03 `was absolutely right` → "that person was absolutely right",
  "that person over there was absolutely right"
- S0547L02 `in the mud` → "the dog is dirty and wet in the mud", "to fall in the
  mud", "if we go too close in the mud"
- S0548L01 `I am feeling sad` → "I don't want it, I am feeling sad",
  "because I am feeling sad", "since the second day I am feeling sad"
- S0553L01 `small` → "the small shirt", "a small hope"

None of them is "…here / …yesterday / …before". So the tool's header claim —
"It reproduces all five of Deborah's real spa_for_eng examples" — is **not true
of the current data**. See the GAP note below on why the data may differ from
what she saw.

**Check 2 — false-positive rate.** I eyeballed 16 CONFIRMED clusters sampled
across 8 courses (spa, por, ita, fra, deu_ch, hak, fin, eus). **13 of 16 are
plainly not the defect** — they are normal, correct SSi practice:

| Course | LEGO | Builds the tool called filler | Verdict |
|---|---|---|---|
| spa_for_eng | `she speaks` | "She speaks Spanish / a lot / very well / Spanish all day" | good practice |
| spa_for_eng | `just` | "Just a little / Just this evening / We just need to / I just want to" | good practice |
| fra_for_eng | `do they need to` | "…go / …come / …stay / …speak French / …work" | good practice |
| por_for_eng | `I agree with` | "I agree with you / that" | good practice |
| fin_for_eng | `that he wants` | "…to help / …to speak" | good practice |
| eus_for_eng | `happy` | "very happy / I'm happy" | good practice |

**Measured false-positive rate: 13/16 ≈ 81%.**

**Why it fails:** the definition has no notion of *semantic emptiness*. Deborah's
complaint is about padding that adds no new grammar (`here`, `yesterday`,
`before`, `for everyone`, `about everything`). A residue of `Spanish`, `to help`
or `very well` is genuine recombination and must not count. Worse, the
"CONFIRMED" gate (residue recurs ≥3× in the course) is trivially satisfied by
`my`, `your`, `a`, `the`, `to speak` — the most common words in English — so
recurrence adds no evidence at all.

**Its numbers should not be used.** For the record, they were:
79 courses, RAW 86,031, CONFIRMED 39,401 (`docs/deborah/filler-build-sweep-2026-08-17.json`).
`spa_for_eng` alone: RAW 2,487 / CONFIRMED 1,002. Those figures are ~81% noise.

### 1b. Corrected detector

I wrote a corrected detector (script preserved at
`.a74-scratch/t1/filler2.cjs`, output at
`docs/deborah/filler-build-sweep-v2-2026-08-17.json`). Same structural rule,
plus one correction: **the residue must be a semantically empty adjunct** drawn
from a closed list (`here, there, yesterday, today, tomorrow, before, after,
now, again, too, also, already, still, please, then, soon, for everyone,
about everything, with everyone, this morning, this evening, tonight,
every day, a lot, at all, of course, right now, back`, …).

- **RAW** = a Build that is the LEGO plus exactly one such adjunct.
- **CONFIRMED** = a LEGO padded **≥2 different ways** from that list — the
  "same LEGO, three different adverbs" shape Deborah described.

**Validation:** spot-checked 12 CONFIRMED clusters across the top 4 courses;
10–11 of 12 are the real defect, including several genuinely nonsensical Builds
("i've forgotten with everyone", "of course today", "of course before",
"to seem unfriendly with everyone", "it doesn't feel like a long time then").
**Estimated false-positive rate ~10–15%** — materially better than 81%, but not
zero, so CONFIRMED counts below are an upper bound pending her eye.

It also now reproduces Deborah's *shape* in `spa_for_eng`:

```
R1097  "it might have happened"  → "it might have happened here" / "…before"
R1102  "let's agree that"        → "let's agree that before"     / "…here"
R256   "why can't I remember what you said" → "…yesterday" / "…this morning" / "…today"
```

`let's agree that before` is ungrammatical — exactly her "some Builds
nonsensical".

### 1c. Corrected results, per course (118 courses scanned, all courses not just eng-known)

Estate totals: **RAW 7,733 / CONFIRMED 3,685** in 68 courses with ≥1 cluster.

| Course | builds | RAW | CONFIRMED | clusters |
|---|---|---|---|---|
| ces_for_eng | 2363 | 834 | 776 | 300 |
| ara_eg_for_eng | 4072 | 452 | 387 | 184 |
| deu_ch_for_eng | 4652 | 477 | 273 | 133 |
| hun_for_eng | 1898 | 327 | 225 | 108 |
| por_for_eng | 4555 | 341 | 222 | 89 |
| ben_for_eng | 2144 | 604 | 217 | 108 |
| pdc_for_eng | 1958 | 224 | 190 | 78 |
| fra_for_eng | 5110 | 294 | 151 | 71 |
| fra_ca_for_eng | 4295 | 255 | 133 | 62 |
| fas_for_eng | 2627 | 216 | 112 | 56 |
| fin_for_eng | 4534 | 280 | 112 | 52 |
| ara_lb_for_eng | 4311 | 367 | 78 | 39 |
| ita_for_eng | 4480 | 154 | 63 | 31 |
| ara_for_eng | 4366 | 162 | 54 | 27 |
| mlt_for_eng | 2031 | 111 | 49 | 23 |
| por_br_for_eng | 4844 | 222 | 48 | 23 |
| gla_for_eng | 1745 | 74 | 42 | 21 |
| tur_for_eng | 2986 | 119 | 41 | 19 |
| heb_for_eng | 1784 | 61 | 38 | 19 |
| deu_at_for_eng | 4684 | 100 | 30 | 14 |
| **spa_for_eng** | **5133** | **95** | **15** | **7** |

Full table for all 68 courses in the JSON.

### 1d. The finding that matters most for Deborah

`spa_for_eng` — the course she has **stopped checking** — measures
**CONFIRMED 15 Builds in 7 clusters** out of 5,133 Builds (0.3%).

The defect class she identified is **real and reproduces**, but in
`spa_for_eng` it is *rare*, not "nearly every Build". Her severity
characterisation does not match the current data. The class is an order of
magnitude worse in `ces_for_eng` (776), `ara_eg_for_eng` (387) and
`deu_ch_for_eng` (273) — **none of which she has checked**.

This needs reconciling with her before `spa_for_eng` is judged either way — see
GAP-1.

---

## TASK 2 — The "as soon as you can" class

**Method.** Matched the family on `course_legos` on **both** sides — Deborah's
two cases run in opposite directions (`eus_for_eng` has English as the known
side, `eng_for_por` has English as the *target*), so a known-side-only search
would have missed half the estate. 224 LEGOs matched on either side; 221 have
the family on their English side.

- **RAW** = English-side LEGO in the family that carries a person
  (`you can`, `I can`, `you want`, `you're able to`…): **101 LEGOs**.
- **CONFIRMED** = the person is demonstrably invented, i.e. the pronoun *inside
  the chunk* varies between the LEGO and its Builds while the target chunk is
  invariant: **2 LEGOs**.

I deliberately rejected a looser test first. Counting a Build as mixed whenever
the whole phrase contains two persons gave 22 "hits", but most were legitimate
("I'll come as soon as you want" — main clause vs subordinate clause). Only
chunk-internal variation is evidence. That correction took 22 → 2.

### CONFIRMED

| Course | Round | lego_id | known/English | target | LEGO person | Build persons |
|---|---|---|---|---|---|---|
| eus_for_eng | R83 | S0028L01 | `as soon as you can` | `ahal bezain laster` | you | you, **I**, **we** |
| heb_for_eng | R80 | S0028L03 | `as soon as you can` | `כמה שיותר מהר` | you | you, **I** |

`eus_for_eng` R83 is **Deborah's own finding, reproduced exactly** — this is the
validation that the detector fires on a known positive. `heb_for_eng` R80 is
**new**: the Hebrew `כמה שיותר מהר` means "as fast as possible" and carries no
person at all, while the English gloss invents "you". Same defect, a course she
has not checked.

### Her `eng_for_por` case is already fixed

`eng_for_por` S0028L01 currently reads known `o mais cedo possível` → target
`as soon as possible`. Her proposed wording is already in place there.
`eus_for_eng` S0028L01 still reads `as soon as you can`.

### Negative controls — 23 courses where "you can" is correct

These courses hold both a "you can" and an "I can" variant with **different**
target text, i.e. the target genuinely inflects for person and there is no
defect. This is the evidence that the 101 RAW figure must not be treated as 101
problems:

`cat_for_eng` (tan aviat com puguis / pugui), `dan_for_eng`, `eng_for_fra`
(dès que tu peux / je peux), `eng_for_spa` (en cuanto puedas / pueda),
`isl_for_eng`, `ita_for_eng` (appena puoi / posso), `nap_for_eng`,
`pdc_for_eng`, `por_br_for_eng`, `scn_for_eng`, `srp_for_eng`, `vec_for_eng`,
`lmo_for_eng`, `gla_for_eng`, `fin_for_eng`, `eng_for_pan`, `eng_for_zho`, and
others — full list in the working data.

### Suspected, needing a native eye (not counted as CONFIRMED)

A distinct sub-class runs the other way: in several `eng_for_X` courses the
**known prompt is person-neutral** but the English target invents "you". The
learner has no basis in the prompt for choosing "you can" — this is Deborah's
`eng_for_por` shape. Candidates where I can read the known side well enough to
suspect it, but which I am **not** counting as confirmed:

| Course | Round | Known prompt | English target |
|---|---|---|---|
| eng_for_ita | R76 | `il prima possibile` ("as soon as possible") | `as soon as you can` |
| eng_for_ara | R80 | `في أقرب وقت ممكن` ("at the soonest possible time") | `as soon as you can` |
| eng_for_ben | R81 | `যত তাড়াতাড়ি সম্ভব` (…সম্ভব = "possible") | `as soon as you can` |
| eng_for_kan | R82 | `ಸಾಧ್ಯವಾದಷ್ಟು ಬೇಗ` | `as soon as you can` |
| eng_for_pan | R84 | `ਜਿੰਨੀ ਜਲਦੀ ਹੋ ਸਕੇ` | `as soon as you can` |
| eng_for_hin | R78 | `जितनी जल्दी हो सके` | `as soon as you can` |
| eng_for_mar | R81 | `जमेल तितक्या लवकर` | `as soon as you can` |
| eng_for_sin | R79 | `හැකි ඉක්මනට` | `as soon as you can` |
| eng_for_jpn | R91 | `できるだけ早く` | `as soon as you can` |

`eng_for_ben` is the strongest of these on machine evidence alone: the *same
course* uses `যত তাড়াতাড়ি পারি` (with a 1sg verb) for "as soon as I can", so it
demonstrably has a person-marked form available and did not use it for the
neutral one. I am **not judging** the Indic/Sinhala/Japanese entries
linguistically — see GAP-4.

### Precedent for her proposed fix

**56 courses already use a "…as possible" form** on the English side
(`as soon as possible`, `as quickly as possible`, `as early as possible`,
`as fast as possible`), across 120 person-neutral LEGOs in 63 courses. Her
proposed fix is already the estate's majority pattern, including in
`eng_for_por`, `eng_for_ita`, `spa_for_eng`, `fra_for_eng`, `cym_n_for_eng`,
`cym_s_for_eng` and `eus_for_eng` itself (which holds `as quickly as possible`
elsewhere while S0028 still says `as soon as you can`).

---

## TASK 3 — Voice gender agreement (the stanco/stanca class)

### How voice gender was derived, and where it can be wrong

**There is no voice-gender field anywhere in the schema** — no enum, no column,
no key. The only available signal is the **human given name inside the Azure
voice id** (`it-IT-ElsaNeural` → Elsa → female; `it-IT-BenignoNeural` → Benigno
→ male). I reused the name→gender rule table from `tools/audio-gender-lint.cjs`
and extended it with the Romance voices actually present.

**Where this derivation can be wrong:**
1. A name I do not recognise resolves to *unknown* and the clip is **skipped, not
   guessed**. Unknowns are reported per language below (`hin` is 98% unknown, so
   Hindi is effectively unmeasured).
2. Non-Azure ids carry no name at all — ElevenLabs hashes
   (`o5tUAYEqld5GJZ1Lv8uC`), `xai_*`, pod ids (`rex`, `43423dee`). All skipped.
3. A name could be misgendered by me for an unfamiliar language.
4. Prefix variants (`azure_it-IT-ElsaNeural` vs `it-IT-ElsaNeural`) are the same
   voice; both resolve on the name so this does not affect counts.

The text side reuses `tools/gendered-speech.cjs` unchanged (copula + gendered
predicate adjective, e.g. `sono/mi sento/ero` + `stanco|stanca`).

### The existing tools do NOT fit as-is — reported as asked

`tools/audio-gender-lint.cjs` keys on the course's **target** language only.
Run on `eng_for_ita` — Deborah's actual course — it refuses:

```
=== audio-gender-lint: eng_for_ita (eng) ===
  ⚠ No gendered-form patterns for "eng".
```

Deborah's `stanco` clips are on the **known** side (Italian is the known
language in `eng_for_ita`), which that tool cannot see. `tools/gendered-speech.cjs`
*does* fit and I reused it directly. I wrote a both-sides sweep keyed on
`course_audio.language` instead (`.a74-scratch/t3/gsweep2.cjs`).

### Validation on Deborah's known positive — fires correctly

`eng_for_ita`, role `known`, voice `azure_it-IT-ElsaNeural` (female):

```
"Ma sono un po' stanco stamattina."
"sono un po' stanco ma sto imparando a parlare meglio"
"sono occupato al lavoro"
"ero preoccupato quando non ho avuto tue notizie"
```

63 such clips in `eng_for_ita`. Her finding reproduces.

### CONFIRMED results

CONFIRMED = text carries single-gender markers, voice gender resolved by name,
and the two disagree. RAW = clips whose text matched a gendered pattern at all.

| Language | RAW (gendered text) | judged | voice unresolved | **CONFIRMED** |
|---|---|---|---|---|
| pol | 1725 | 1658 | 9 | **829** |
| spa | 2370 | 1622 | 748 | **820** |
| ita | 1111 | 1059 | 48 | **488** |
| hrv | 631 | 589 | 0 | **291** |
| cat | 569 | 567 | 2 | **281** |
| por | 689 | 592 | 6 | **255** |
| ron | 358 | 357 | 1 | **177** |
| lit | 90 | 90 | 0 | **44** |
| lav | 88 | 88 | 0 | **43** |
| hin | 7277 | 0 | 7141 | not measurable |
| ukr / ell / isl | 658 / 737 / 94 | 0 | 0 | not measurable |

Per course:

| Course | CONFIRMED | Direction |
|---|---|---|
| pol_for_eng | 829 | 829 F-voice / M-text |
| spa_for_eng | 407 | 401 F/M, 6 M/F |
| cat_for_spa | 310 (cat) + 218 (spa) | all F-voice / M-text |
| ron_for_eng | 177 | 149 F/M, 28 M/F |
| ita_for_eng | 172 | all F-voice / M-text |
| ita_for_jpn | 147 | 146 F/M, 1 M/F |
| por_br_for_eng | 142 | 136 F/M, 6 M/F |
| ita_for_zho | 106 | all F-voice / M-text |
| por_for_eng | 89 | 85 F/M, 4 M/F |
| spa_for_zho | 84 | all F-voice / M-text |
| cat_for_eng | 63 | all F-voice / M-text |
| **eng_for_ita** | **63** | all F-voice / M-text |
| lit_for_eng / lav_for_eng | 44 / 43 | all F-voice / M-text |
| eng_for_por | 24 | all F-voice / M-text |
| eng_for_spa | 16 | all F-voice / M-text |

**The asymmetry is the strongest evidence this is real.** Across every course
the mismatch runs one way — a female voice speaking masculine forms. Random
mis-casting would be symmetric. **3,180 of 3,228 confirmed mismatches (98.5%)
are F-voice/M-text**; only 48 run the other way.

### Root cause in `eng_for_ita`: there is no male Italian voice in the course

Italian voice inventory:

| Course | Voices | |
|---|---|---|
| **eng_for_ita** | `azure_it-IT-ElsaNeural` (6051), `it-IT-ElsaNeural` (466) | **female only** |
| ita_for_eng | Elsa (7955+4912) **and** Benigno (7980+4869) | both |
| ita_for_jpn | Elsa (5433) **and** Lisandro (5433) | both |
| ita_for_zho | Elsa (5370) **and** Benigno (5370) | both |

`eng_for_ita` has **no male Italian voice at all**. Every masculine-marked
Italian line in that course is therefore necessarily voiced by a woman — which
is exactly why Deborah saw it "systematically" at S0041 R107–110, S0042 R111,
S0043 R113, S0045 R119, S0048 R127. This is a **course-level casting gap**, not
a set of per-clip slips, and it cannot be fixed clip-by-clip.

`ita_for_eng` / `ita_for_jpn` / `ita_for_zho` *do* have both voices, so their
172 / 147 / 106 mismatches are genuine per-clip casting errors — a different fix.

---

## TASK 4 — Text vs voiced, from `word_boundaries`

### Two structural discoveries that change how this must be measured

**1. `word_boundaries` has two incompatible shapes.** Only one is a witness:

| Shape | Rows | Witness? |
|---|---|---|
| `[{text, offset, duration}, …]` | 1,174,817 | **yes** — carries the spoken words |
| `[[offset, duration], …]` | 373,771 | **no** — timings only, no text at all |

The estate note that "`word_boundaries` is the only witness to what TTS spoke"
holds **only for the object shape**. 373,771 rows carry no word text and can
never witness anything. My first query silently treated these as mismatches;
they are excluded throughout below.

Total `course_audio` rows 2,565,380; 1,548,590 have any `word_boundaries`
(60.4%); **1,174,817 (45.8%) are actually usable as a witness.**

**2. Whitespace-only differences are an artefact, not a defect.** Comparing
normalised-with-spaces produced 103,837 "mismatches" — 93.9% of `jpn_for_eng`,
90.5% of `zho_for_jpn`, 62.5% of `tha_for_eng`. These are spaceless scripts
where Azure tokenises into words the text does not space:

```
TEXT: 一緒に言ってみたい     SPOKEN: 一緒に 言っ て み たい
TEXT: 日本語を理解する       SPOKEN: 日本語 を 理解 する
```

Identical once whitespace is removed, and inaudible either way. So:

- **RAW** = normalised comparison including whitespace: **103,837** clips.
- **CONFIRMED** = whitespace-insensitive comparison: **8,396** clips in 45
  courses. **The artefact was 92% of RAW.** `jpn_for_eng` goes 12,808 → 0.

### Validation on Deborah's known positives — both fire

| Her finding | Result |
|---|---|
| S0029/R87 text `gogoa dut`, voice `gogoz nago` | **found** (clip `0ccfab87-e19d-466c-9236-25b1192a2950`, boundaries `["gogoz","nago"]`) |
| S0006/R19 text `gogoratzen saiatzen ari naiz`, voice `gogoratu nahian ari naiz` | **found**, exactly as she describes |
| S0034/R98 `hemen dagoenean` / audio "when they are here" | **not found** — see GAP-5 |

Two of her three Basque positives reproduce verbatim. This detector is
validated against confirmed positives.

### CONFIRMED results, per course

| Course | witnessed clips | **CONFIRMED** | rate |
|---|---|---|---|
| hrv_for_eng | 16684 | 1363 | 8.17% |
| ara_eg_for_eng | 15840 | 1283 | 8.10% |
| fra_ca_for_eng | 37495 | 1011 | 2.70% |
| spa_for_eng | 17416 | 834 | 4.79% |
| spa_mx_for_eng | 30100 | 443 | 1.47% |
| spa_for_jpn | 22207 | 430 | 1.94% |
| cym_n_for_eng | 641 | 412 | 64.27% |
| fra_for_jpn | 20094 | 386 | 1.92% |
| ara_lb_for_eng | 14674 | 382 | 2.60% |
| ita_for_jpn | 17177 | 347 | 2.02% |
| fra_for_zho | 15023 | 329 | 2.19% |
| ita_for_zho | 16283 | 281 | 1.73% |
| spa_for_zho | 13663 | 207 | 1.52% |
| **eus_for_eng** | 15231 | **192** | 1.26% |
| isl_for_eng | 14107 | 180 | 1.28% |
| por_for_eng | 19907 | 84 | 0.42% |
| por_br_for_eng | 35570 | 58 | 0.16% |
| hye_for_eng | 17851 | 45 | 0.25% |
| deu_for_jpn | 15097 | 26 | 0.17% |
| zho_for_jpn | 13490 | 22 | 0.16% |
| afr_for_eng | 11696 | 20 | 0.17% |
| ita_for_eng | 22039 | 11 | 0.05% |
| pol_for_eng / nld_for_eng | 15322 / 1025 | 9 / 9 | |
| 22 further courses | | 1–5 each | |

Full table: `docs/deborah/text-vs-voiced-sweep-2026-08-17.json`.

### These are four distinct defects, not one

Sampling the top courses shows the CONFIRMED set contains several different
problems, which matters for triage:

**(a) Basque — text edited, audio never re-rendered.** Exactly Deborah's
"my fixes are reverting" alarm:

```
TEXT: erantzuna gogoratzen saiatzen ari naiz  | SPOKEN: erantzuna gogoratu nahian ari naiz
TEXT: euskaraz hitz egiten jarraituko dut     | SPOKEN: euskaraz hitz egiten jarraitu noa
TEXT: ondo sentitzea gustatzen zait           | SPOKEN: ondo sentitu gustuko dut
TEXT: nire aitari irakurtzea gustatzen zaio   | SPOKEN: nire aitak irakurtzea gustuko du
```

**(b) Gender agreement — Task 3's defect, independently visible here.** The
audio was rendered from a *different-gendered* string than the row now holds:

```
spa_for_eng     TEXT: No quiero parecer antipática…  | SPOKEN: …antipático
spa_for_eng     TEXT: estaba demasiado ocupada…      | SPOKEN: …ocupado
fra_ca_for_eng  TEXT: seule / passée / nouvelles     | SPOKEN: seul / passé / nouveaux
ara_eg_for_eng  TEXT: آسف (masc)                      | SPOKEN: آسفة (fem)
```

That two independent detectors converge on the same defect from opposite
directions is strong corroboration for Task 3.

**(c) Croatian known side — English text/audio divergence** (1,363 clips):

```
TEXT: they said what we need to make        | SPOKEN: they said what we need to do
TEXT: are you sure you can make that…       | SPOKEN: are you sure you can do that…
```

**(d) `cym_n_for_eng` presentation clips — markup in the boundary stream**
(412 clips, 64% of the course's witnessed clips):

```
TEXT:   The Cymraeg for <src>now</src> is <tgt>rŵan</tgt>.
SPOKEN: the cymraeg for &lt; src &gt; now &lt; / src &gt; is &lt; tgt &gt; rŵan …
```

The `<src>`/`<tgt>` tags appear as spoken tokens. **I have not listened to these
clips and am not asserting the tags are audible** — the boundary stream may
record markup the synthesiser did not voice. Flagged for a listen, not counted
as a proven learner-facing defect. (Related estate note: presentation clips are
known to bypass the phase8 paren guard.)

---

## GAPS

**GAP-1 — Deborah's five `spa_for_eng` Build examples do not exist in the DB.**
The LEGOs are all at the rounds she named, but the Builds she quotes
("was absolutely right here/yesterday/before") are not the Builds stored. Those
rows were last touched between 2026-07-21 and 2026-08-06 — i.e. **before** her
2026-08-17 report — so this is not an edit that landed after she looked.
I could not determine what she was reading. Leading hypothesis: she is reading a
**cached baked script** in the learner app rather than the DB, which would show
her pre-fix content. I could not test this: there is no script-cache table in
Postgres (the cache is app-side), and probing the learner app is outside a
read-only DB sweep. **This must be resolved with her directly before
`spa_for_eng` is judged** — my 0.3% figure and her "nearly every Build" cannot
both describe the same content.

**GAP-2 — `content_audit_log` could not be queried.** Every attempt to filter it
on `old_row->>'course_code'` timed out (`canceling statement due to statement
timeout`); the JSONB column is unindexed for that access path. I fell back to
`course_practice_phrases.updated_at`, which answered the question for GAP-1 but
gives no before-values and no author (that column is NULL estate-wide anyway).

**GAP-3 — Task 3 could not be measured for several languages.**
- `hin`: 7,277 candidate clips, **7,141 voices unresolved by name** (98%) — Hindi
  is effectively unmeasured, not clean.
- `ukr`, `ell`, `isl`: candidates found but 0 judged — their patterns did not
  match in the SQL-translated form.
- `tha`, `heb`, `ara`, `fra`: **skipped entirely.** Their `gendered-speech.cjs`
  patterns use regex lookaheads, which are not translatable to Postgres regex.
  These were prefiltered in SQL for speed after a full client-side scan timed out
  at 10 minutes. **French is a gendered language Kai explicitly asked for and it
  is not measured here** — the `fra_ca` gender evidence in Task 4(b) arrived by a
  different route and is not a substitute for a Task 3 count.
- All ElevenLabs / `xai_*` / pod voice ids are unresolvable by name and were
  skipped estate-wide.

**GAP-4 — I did not judge languages I cannot read.** In Task 2 the Indic,
Sinhala, Japanese and Chinese "suspected" entries are listed as candidates on
structural evidence only and are explicitly **not judged** linguistically or
counted as CONFIRMED. They need a native eye.

**GAP-5 — Deborah's third Basque positive (S0034/R98) was not found.** She
reports text `hemen dagoenean` with audio saying "when they are here". No clip
in `eus_for_eng` pairs that text with an English boundary stream. Possible
causes I did not distinguish: the clip has no usable `word_boundaries` (54% of
the estate does not), or the defect is a known/target *linkage* error rather
than a text/voice divergence. Unresolved.

**GAP-6 — Coverage ceiling on Task 4.** 54.2% of `course_audio` rows can never
be checked this way (no `word_boundaries`, or the textless pair shape). A course
reading 0 confirmed mismatches may simply be unwitnessed. Absence of a hit here
is **not** evidence of correct audio.

**GAP-7 — No listening was done.** Every Task 3 and Task 4 finding is derived
from stored text and boundary metadata. Nothing was played. Per the brief no
audio was generated and no content was touched.

**GAP-8 — Fan-out was refused.** The dispatch API returned a depth-ceiling error
(`this surface allows 2 level(s) of worker`), so all four tasks were done
in-turn by me rather than partitioned across workers as planned. This cost time
but not coverage.

---

## Artefacts

| File | What |
|---|---|
| `docs/deborah/filler-build-sweep-2026-08-17.json` | supplied tool's output — **81% FP, do not use** |
| `docs/deborah/filler-build-sweep-v2-2026-08-17.json` | corrected filler detector, 118 courses |
| `docs/deborah/voice-gender-sweep-2026-08-17.json` | Task 3, per-language with full hit lists |
| `docs/deborah/text-vs-voiced-sweep-2026-08-17.json` | Task 4 CONFIRMED counts per course |
