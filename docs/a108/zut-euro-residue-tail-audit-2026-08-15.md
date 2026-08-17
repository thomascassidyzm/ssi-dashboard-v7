# ZUT residue tail audit — euro cluster (2026-08-15)

**Read-only triage. No edits, no audio, no commits.**

Input: `.a108-zut/cluster-euro.json` — 48 courses, estate-wide untaught-word detector
output after 6 FP classes already stripped (digits/1-char, apostrophe-elision,
diacritic-only, stem/prefix inflection, edit-distance morphological neighbours,
affix/clitic containment, Celtic mutation, same-block N/N+1).

**68 residue rows across 20 courses.** All 68 checked individually (no sampling needed —
under the 80-row threshold for every course). Verification method: independently
recomputed each course's cumulative taught-vocabulary set (seed sentences +
`course_legos.target_text` + `course_practice_phrases` where `phrase_role='component'`)
directly from the live Supabase DB, then re-derived each word's true first-taught seed
and compared it to the detector's own number.

## Headline

- **1 course-level exclusion: `sbx_for_eng`** ("[SANDBOX] Guardian Test", `status: draft`,
  `visibility: private`) — 5 of the 68 rows (`asdf`, `qwerty`, `zzz`, `to`, `speak`) are
  literal keyboard-mash test fixture content, not real course material. Confirmed via
  `courses` table metadata. Excluded from all counts below.
- **Remaining 63 rows / 19 courses: independently reconfirmed, 0 additional false
  positives found.** My from-scratch recomputation of each course's taught set matched
  the detector's `firstTaughtAt`/`gap` numbers essentially exactly — this rules out
  "detector is stale/buggy" as an explanation for the whole tail.
- **2 rows worth flagging with an explicit linguistic diagnosis** (both still genuine
  defects, not FPs — see below): a likely **typo** in `hrv_for_eng`, and a **singular/
  plural gap** in `cym_anthem_for_jpn` that the generic edit-distance filter couldn't
  catch because the edit distance is too large.

## Per-course FP-class breakdown

| Course | Residue | FP found | High-confidence defects |
|---|---|---|---|
| sbx_for_eng | 5 | **5 — whole course excluded (sandbox test fixture)** | 0 |
| deu_for_eng | 12 | 0 | 12 |
| afr_for_eng | 7 | 0 | 7 |
| ita_for_eng | 6 | 0 | 6 |
| ces_for_eng | 6 | 0 | 6 |
| hrv_for_eng | 4 | 0 (likely typo, still real — see note) | 4 |
| srp_for_eng | 4 | 0 | 4 |
| bul_for_eng | 3 | 0 | 3 |
| cat_for_spa | 3 | 0 | 3 |
| pol_for_eng | 3 | 0 | 3 |
| ita_for_jpn | 3 | 0 | 3 |
| ell_for_eng | 2 | 0 | 2 |
| deu_for_zho | 2 | 0 | 2 |
| cym_anthem_for_jpn | 2 | 0 (singular/plural gap, still real — see note) | 2 |
| nld_for_eng | 1 | 0 | 1 |
| ron_for_eng | 1 | 0 | 1 |
| swe_for_eng | 1 | 0 | 1 |
| deu_for_jpn | 1 | 0 | 1 |
| ita_for_zho | 1 | 0 | 1 |
| spa_for_zho | 1 | 0 | 1 |
| **Total (excl. sandbox)** | **63** | **0** | **63** |

## Two rows with a specific diagnosis, beyond plain "confirmed absent"

- **`hrv_for_eng` "turba" (4 rows, seed 198)** — almost certainly a **typo for "torba"**
  (Croatian for "bag"; edit distance 1). Checked: the correctly-spelled "torba" is *also*
  not taught until seed 635 — over 400 seeds later. So whichever spelling is intended,
  the word for "bag" is used at seed 198 with zero prior teaching. Real defect either way;
  worth a content fix that both corrects the spelling and moves/adds the teaching card
  earlier (or moves these 4 phrases to seed ≥635).
- **`cym_anthem_for_jpn` "bardd" (2 rows, seeds 1 and 5)** — singular "poet". The course
  only ever teaches the plural **"beirdd"** (poets); the singular is never introduced as
  its own lego/component, yet is used twice in build phrases ("bardd", "bardd wyf" = "I am
  a poet"). Edit distance bardd↔beirdd is 3, well outside what the detector's morphological
  filter catches. Note: this is a 7-seed, single-song anthem course (not a standard
  progressive course structure) — flagging for awareness in case that course type has
  different pedagogical norms, but under the stated ZUT rule this is a genuine gap.

## Spot-checks for morphological-family false positives (beyond generic re-verification)

For the largest/most repeated residue words I additionally searched for **any related
inflected/paradigm form** taught earlier, which the generic word-level check wouldn't
catch (e.g. a conjugation paradigm taught via a different exact string). None found:

- `ita_for_eng`/`ita_for_jpn` **"essere"/"abbia"** — infinitive and subjunctive of "to be"/
  "to have" respectively; searched for any earlier occurrence of the bare infinitive —
  none found before the detector's stated first-teach seed. Conjugated forms (sono/sei/è
  etc.) don't substitute for the specific untaught target form under the stated ZUT rule.
- `cat_for_spa` **"crec"** (I believe, from "creure") — searched for any `cre[uio]`-stem
  hit before seed 25 — none.
- `deu_for_eng` **"für"** — searched for any für/fur spelling before seed 142 — none found
  (it really is a bare, ungapped absence of a common preposition for 130+ seeds).
- `srp_for_eng` **"otišao"** — searched for any `otiš`-stem form (other person/gender of
  the same verb) before seed 221 — none.

## Explicit gaps (honesty)

- I did **not** hand-verify cognate/loanword "obviousness" for every one of the 63 rows
  (e.g. `ita_for_zho` "idea", `spa_for_zho` "mucho") against native-speaker judgment of
  whether an untaught cognate is pedagogically tolerable. The stated ZUT rule treats any
  untaught target-form use as a defect regardless of cognate status, so this doesn't
  change any verdict here, but it does mean I can't rank these by "how bad it reads to a
  learner" — only by confirmed presence/absence in the DB.
- I did not paradigm-search every remaining single-occurrence row (only the 4 called out
  above) for a same-lemma taught form; time budget went to the words repeated ≥3 times.
  All are still independently confirmed absent from the DB by exact-token search across
  `course_seeds` + `course_legos` + component-role `course_practice_phrases`.

## Full high-confidence residue (63 rows)

| course | seed | row id | phrase | untaught word | first taught |
|---|---|---|---|---|---|
| deu_for_eng | 58 | S0058L03U11 | Ich denke du hast genug gelernt | gelernt | 76 |
| deu_for_eng | 399 | S0399L02U02 | ich denke, dass wir die Hoffnung nicht verlieren dürfen | dürfen | never |
| deu_for_eng | 130 | S0130L01U09 | Ich wollte sagen das war eine Überraschung für mich | für | 142 |
| deu_for_eng | 111 | S0111L02U14 | Wenn du mehr übst, verändert es wie du lernst | übst | never |
| deu_for_eng | 57 | S0057L01U07 | Was soll ich tun um gut Deutsch zu lernen | tun | 479 |
| deu_for_eng | 424 | S0424L01U04 | ich wusste, dass wir keine Zeit verschwenden durften | durften | never |
| deu_for_eng | 238 | S0238L01U10 | Er wollte, dass du ihn im Büro triffst, aber du hast es vergessen | triffst | never |
| deu_for_eng | 134 | S0134L01U07 | Sie sagte es ist kein Problem für sie | für | 142 |
| deu_for_eng | 58 | S0058L03U10 | Ich habe heute genug Deutsch gelernt | gelernt | 76 |
| deu_for_eng | 424 | S0424L01U02 | ich dachte, dass wir keine Zeit verschwenden durften | durften | never |
| deu_for_eng | 399 | S0399L02U04 | ich dachte, dass wir die Hoffnung nicht verlieren durften | durften | never |
| deu_for_eng | 55 | S0055L02U09 | Er hat gestern gut geschlafen | hat | 84 |
| ita_for_eng | 76 | S0076L02U08 | penso di essere molto contento di quanto ho già imparato | essere | 137 |
| ita_for_eng | 77 | S0077L01U08 | penso di essere sorpreso di qualcosa di molto importante | essere | 137 |
| ita_for_eng | 76 | S0076L01U03 | penso di essere molto contento di quello | essere | 137 |
| ita_for_eng | 77 | S0077L01U03 | penso di essere sorpreso di quello | essere | 137 |
| ita_for_eng | 83 | S0083L01U03 | penso di essere d'accordo con quello che vuoi fare | essere | 137 |
| ita_for_eng | 76 | S0076L01U08 | penso di essere molto contento di qualcosa | essere | 137 |
| afr_for_eng | 4 | S0004L01U04 | ek wil nou leer om dit te sê | dit | 28 |
| afr_for_eng | 65 | S0065L03U03 | ek gaan volgende week myself toets | myself | never |
| afr_for_eng | 65 | S0065L03B02 | ek wil myself toets | myself | never |
| afr_for_eng | 4 | S0004L01U03 | ek wil dit met jou sê | dit | 28 |
| afr_for_eng | 4 | S0004L01U05 | ek probeer so gereeld as moontlik dit sê | dit | 28 |
| afr_for_eng | 4 | S0004L01U02 | ek probeer dit in Afrikaans sê | dit | 28 |
| afr_for_eng | 65 | S0065L03U04 | ek geniet dit om myself te toets om my Afrikaans te verbeter | myself | never |
| ces_for_eng | 35 | S0035L01U06 | chci cvičit češtinu dnes odpoledne | češtinu | never |
| ces_for_eng | 112 | S0112L02U05 | nečekal jsem to vůbec | vůbec | 191 |
| ces_for_eng | 185 | S0185L02U04 | jsi je nechal na stole | stole | 195 |
| ces_for_eng | 107 | S0107L01U03 | doufali jsme, že to bude snazší | snazší | 122 |
| ces_for_eng | 89 | S0089L01U06 | jsem toho hodně stihl tento týden | tento | 554 |
| ces_for_eng | 102 | S0102L02U05 | doufám, že to tak není | doufám | 149 |
| hrv_for_eng | 198 | S0198L01B02 | moja turba | turba | never (typo for "torba" — see note) |
| hrv_for_eng | 198 | S0198L01U03 | rekao je da je to moja turba | turba | never (typo for "torba" — see note) |
| hrv_for_eng | 198 | S0198L01B01 | to je moja turba | turba | never (typo for "torba" — see note) |
| hrv_for_eng | 198 | S0198L01B03 | moja turba na stolu | turba | never (typo for "torba" — see note) |
| srp_for_eng | 221 | S0221L03U07 | gledao sam nešto i onda sam otišao da spavam | otišao | 362 |
| srp_for_eng | 47 | S0047L03U04 | volim da praviti zanimljive stvari | zanimljive | 51 |
| srp_for_eng | 47 | S0047L03U04 | volim da praviti zanimljive stvari | stvari | 51 |
| srp_for_eng | 105 | S0105L01U06 | nije znao koga da pita | koga | 128 |
| bul_for_eng | 47 | S0047L02U06 | смятам, че е интересно | интересно | 58 |
| bul_for_eng | 16 | S0016L02U03 | той не иска да се върне по-скоро | скоро | 23 |
| bul_for_eng | 16 | S0016L02U04 | той иска да се върне тази вечер | тази | 18 |
| cat_for_spa | 25 | S0025L02U04 | no crec que hagi d'explicar el que vull dir | crec | 47 |
| cat_for_spa | 25 | S0025L02U01 | no crec que hagi de parlar amb ell ara | crec | 47 |
| cat_for_spa | 25 | S0025L02U05 | no crec que hagi de tornar a parlar amb ell després | crec | 47 |
| pol_for_eng | 279 | S0279L01U04 | nie zostało żadnych pieniędzy | żadnych | never |
| pol_for_eng | 227 | S0227L02U04 | mój tata powiedział że on powie mi coś nowego | tata | 240 |
| pol_for_eng | 235 | S0235L02U03 | mój tata chciał ci coś powiedzieć przed weekendem | tata | 240 |
| ell_for_eng | 20 | S0020L02U06 | θέλεις να μάθεις πώς να λες κάτι στα ελληνικά; | λες | 533 |
| ell_for_eng | 18 | S0018L01U07 | θέλουμε να μάθει πώς να λέει κάτι στα ελληνικά | λέει | 480 |
| nld_for_eng | 29 | S0029L02U04 | dat is beter voor jou | jou | 230 |
| ron_for_eng | 87 | S0087L01U01 | persoana pe care vreau să o ajut | persoana | 388 |
| swe_for_eng | 85 | S0085L03U04 | många av de där människorna är unga | av | 110 |
| deu_for_jpn | 7 | S0007L02U06 | ich möchte noch hart lernen | noch | 60 |
| deu_for_zho | 277 | S0277L01U02 | ich werde dich von nächster Woche an öfter treffen | öfter | never |
| deu_for_zho | 281 | S0281L02U06 | bitte warte während ich austrinke | während | 512 |
| ita_for_jpn | 47 | S0047L01U02 | non penso che abbia bisogno di sapere tutto | abbia | 325 |
| ita_for_jpn | 47 | S0047L01U01 | penso che abbia bisogno di migliorare l'italiano | abbia | 325 |
| ita_for_jpn | 47 | S0047L01B02 | penso che abbia bisogno di | abbia | 325 |
| ita_for_zho | 121 | S0121L03U06 | non so se usare la macchina è una buona idea | idea | 123 |
| spa_for_zho | 38 | S0038L03U04 | llevo mucho tiempo aprendiendo español con alguien más | mucho | 88 |
| cym_anthem_for_jpn | 5 | S0005L01B03 | bardd wyf | bardd | never (singular never taught, only plural "beirdd" — see note) |
| cym_anthem_for_jpn | 1 | S0001L02B01 | bardd | bardd | never (singular never taught, only plural "beirdd" — see note) |

## Bottom line

The tail is **not clean** — of 68 residue rows, 63 (across 19 real courses) are
independently reconfirmed as genuine untaught-target-word defects, not detector noise.
Small counts did not hide anything; they were mostly correct already. The one course-
level FP (`sbx_for_eng`, 5 rows) is a private draft sandbox test, not shippable content.

**No commits, no edits, no audio generated — read-only per the job.**
