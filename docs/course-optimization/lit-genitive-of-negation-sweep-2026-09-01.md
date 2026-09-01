# Lithuanian genitive-of-negation — the sweep, completed

*2026-09-01. Closes the gap opened by
`docs/course-optimization/bound-form-baltic-uralic-repair-2026-09-01.md`, which fixed three
phrases under `S0012L01` and reported the pattern as systemic with "≈15–20 further phrases"
outstanding. Script: `tools/course-optimization/fix-lit-genitive-of-negation-2026-09-01.cjs`.
Logs: `lit-genitive-of-negation-{dryrun,applied}-log.json` beside this file.*

---

## Direct answer

**The real number is 18 fixed, not 15–20 flagged-and-fixed.** A full-course scan of
`lit_for_eng` (6,070 phrase rows, 859 of them carrying a negated verb) found **18 rows**
that clearly weld an accusative-marked object onto a negated governor, and they are all
now genitive. **Seven further rows are left as arguable and named below** — four of them
form one entangled unit at seed 298 that cannot be repaired row-by-row without creating a
ZUT collision.

**36 clips are now unlinked and need re-rendering — 18 `target1`
(`azure_lt-LT-OnaNeural`) and 18 `target2` (`azure_lt-LT-LeonasNeural`).** Nothing was
rendered, no voice was cast, nothing was deleted. An audio-pass request is queued against
`lit_for_eng`. **Every known clip kept its link** — no known text changed on any row.

No LEGO was edited, no seed was edited, no boundary moved, no phrase id was reissued,
**no learner-progress migration is needed**, and `course_round_index` carries no phrase
text so it needed no refresh.

---

## The pattern

Lithuanian moves the direct object of a negated verb from the accusative to the genitive,
and the negation propagates to the object of a dependent infinitive
(*nenoriu duoti* **atsakymo**, not *atsakymą*). Each row below stored the accusative.

Repair is **clause 2 of the parent brief, exactly as the first three were fixed**: correct
the case in the *phrase* `target_text` and the matching decomposition tile, leave the LEGO
alone. Every affected LEGO is *correct* in its positive contexts — `savo automobilį` is
right in `noriu naudoti savo automobilį` (S0121L03U01), `pinigus` in `palikau pinigus kur
nors` (S0195L02U02), `viską baigti` in `ar turėjai viską baigti` (S0278L02B03) — so
touching the LEGO would have broken those.

The course's own attested practice supports every replacement form: `atsakymo` occurs 12×,
`problemos` 11×, `visko` 14×, `ko nors` is taught explicitly at `S0030L05`, and the whole
`neturiu` family is otherwise uniformly genitive (`neturiu daugiau laiko`, `neturiu
nieko`, `neturiu ko ji norėjo`, `neturiu menkiausio supratimo`).

---

## The 18 fixed

### A — `ką nors` → `ko nors` (5)

| Row | known | was → is now |
|---|---|---|
| `S0070L01B03` | she didn't want to tell | `ji nenorėjo sakyti **ką nors** ir` → **`ko nors`** |
| `S0208L01U02` | I didn't want to say something to you | `nenorėjau tau **ką nors** pasakyti` → **`ko nors`** |
| `S0241L01B02` | I don't want to give something | `nenoriu duoti **ką nors**` → **`ko nors`** |
| `S0241L01U02` | I don't want to give something new now | `nenoriu duoti **ką nors** naujo dabar` → **`ko nors naujo`** |
| `S0241L01U05` | I don't want to give you something before the weekend | `nenoriu duoti tau **ką nors** prieš savaitgalį` → **`ko nors`** |

`S0241L01U02` carried its own proof: the modifier was *already* genitive (`naujo`) against
an accusative head. Same confidence band as the already-applied `S0012L01U02` — prescriptively
required across the infinitive boundary, colloquially variable. Consistency with the
existing fix decided it.

### B — accusative noun → genitive (12)

| Row | known | was → is now |
|---|---|---|
| `S0121L03B04` | your car, she doesn't | `savo **automobilį** ji nenori` → **`automobilio`** |
| `S0121L03U02` | she doesn't want to use her car | `ji nenori naudoti savo **automobilį**` → **`automobilio`** |
| `S0182L02U02` | I can't find my keys | `negaliu rasti mano **raktus**` → **`raktų`** |
| `S0195L02U01` | I can't find the money | `negaliu rasti **pinigus**` → **`pinigų`** |
| `S0211L03B04` | they don't want to keep explaining the problem | `nenori aiškinti **problemą**` → **`problemos`** |
| `S0211L03U04` | they think we don't want to explain the problem | `…nenori aiškinti **problemą**` → **`problemos`** |
| `S0214L02U04` | we didn't want to discuss the problem at the weekend | `nenorėjome aptarti **problemą** savaitgalį` → **`problemos`** |
| `S0241L01B03` | I don't want to give an answer | `nenoriu duoti **atsakymą**` → **`atsakymo`** |
| `S0241L01U01` | I don't want to give you a film today | `nenoriu duoti tau **filmą** šiandien` → **`filmo`** |
| `S0241L01U03` | I don't want to give you an answer today | `nenoriu duoti tau **atsakymą** šiandien` → **`atsakymo`** |
| `S0248L03U01` | I don't want to give my money back | `nenoriu duoti savo **pinigus** atgal` → **`pinigų`** |
| `S0260L01B03` | I don't have an answer | `neturiu **atsakymą**` → **`atsakymo`** |

`S0260L01B03` is the most clear-cut in the course: negated *turėti* takes the genitive
unconditionally, and its four sibling rows already do.

### C — `viską` → `visko` (1)

| Row | known | was → is now |
|---|---|---|
| `S0278L02U01` | she doesn't want to finish everything today | `ji nenori **viską** baigti šiandien` → **`visko`** |

### R0.2 note

`atsakymo`, `problemos` and `visko` are all attested earlier in the course.
`pinigų`, `raktų`, `automobilio` and `filmo` are new forms — but every one of those rows
sits at seed 121 or later, long after the genitive is introduced at seed 27 and named at
seed 30. **The R0.2 tension the parent report flagged applies only to its own three rows at
seed 12, not to any of these 18.**

---

## Left as arguable — 7 rows, no action, native-speaker call

### 1. Seed 298 — an entangled unit, 4 rows (the biggest item here)

`S0298L01` teaches `ką daugiau pasakyti` glossed "nothing left to say", and **the seed
sentence itself carries the accusative**: `Neturiu ką daugiau pasakyti.` The idiom is
`neturiu **ko** daugiau pasakyti`.

| Row | target |
|---|---|
| seed 298 | `Neturiu ką daugiau pasakyti.` |
| LEGO `S0298L01` | `ką daugiau pasakyti` |
| `S0298L01U01`–`U04` | `neturiu **ką** daugiau pasakyti (…)` |
| `S0298L01B03` / `U05` | `ar ji turi **ką** daugiau pasakyti` — **positive** *turėti*; accusative looks right here |

**Why row-by-row repair is refused:** fixing only `U01`–`U04` would leave the seed prompt
"I've got nothing left to say" → `ką` while the drills say `ko` — **a ZUT collision I would
be creating**. Fixing the seed forces the LEGO (a LEGO must tile its seed), which forces
`B01`/`B02`, which then leaves the two *positive* rows containing a form the LEGO no longer
holds — and whether `ar ji turi ko daugiau pasakyti` is acceptable Lithuanian is exactly
the question I cannot answer. This wants one ruling on the whole unit, not eight edits.

### 2. Propagation from `nepatinka` — 1 row

`S0121L03U03` "it's unusual that you don't use your car" →
`keista kad tau nepatinka naudoti savo **automobilį**`. *Nepatinka* is intransitive and the
infinitive phrase is its **subject**, not its object, so there is no object for the negation
to re-case. This is also the seed 121 sentence itself. **Left deliberately** — the fixed
rows at this LEGO all have a genuinely transitive negated governor (`nenori naudoti`).

### 3. Propagation across impersonal `nėra sunku` — 2 rows

`S0066L02U04` `nėra sunku rasti **ką nors**` and `S0066L03U01` `nėra sunku rasti
**atsakymą**`. The negation is on the copula of an impersonal predicate, not on a verb
governing the object. Prescriptive propagation here is not established. **Left.**

---

## Named, but a different defect — not touched, not in scope

Found during the scan, reported so nobody has to re-derive them:

- **`S0257L01U02`** "I don't want to give her the blue thing" → `nenoriu duoti jai **tas
  mėlynas daiktas**`. The object is in the **nominative** — not an accusative-under-negation
  slip but a bare citation form welded in (the LEGO `S0257L01` is `tas mėlynas daiktas`).
  Correct under this rule would be `to mėlyno daikto`. **A bigger defect than this pattern;
  flagged, not fixed.**
- **`S0037L03U03`** "I don't want to think about this" → `nenoriu galvoti **ką nors**`.
  *Galvoti* requires `apie` + accusative; the preposition is missing. Wrong regardless of
  negation, and once `apie` is restored the negation does **not** reach the object. Different
  defect.
- **`S0220L02U05`** "they didn't want to watch a bit of television" → `nenorėjo truputį
  televizoriaus`. The genitive is already correct; the verb `žiūrėti` is simply missing.
  Elision, not case.

### Checked and confirmed correct — left alone

The genitive does **not** cross into a complement or relative clause with its own positive
verb: `nežinau, ką padarei`, `nežinome, ką jie mums pasakė`, `negaliu matyti ką tu bandai
man parodyti`, `neturiu menkiausio supratimo, ką daryti` — 24 such rows, all correct.
Accusative time adverbials (`šį vakarą`, `visą dieną`, `šią popietę`, `savaitgalį`) are
correct after a negated verb and were not touched — 26 rows. Prepositional objects
(`apie savo draugą`, `į vakarėlį`, `prie kažko sunkaus`) are governed by the preposition and
were not touched. `nekantrauju` ("I look forward to") is lexically `ne-` but semantically
positive and is not a negation.

---

## Audio — 36 clips need re-rendering. NOTHING WAS RENDERED.

Every one of the 18 rows had its `target1` and `target2` links nulled by
`trg_null_phrase_audio_on_text_change`, reason
**`nulled-no-same-voice-clip-for-new-text`** in all 36 cases — no existing clip of the new
text existed in the incumbent voice. **The superseded clips still exist in `course_audio`,
unlinked; nothing was deleted.** All 18 `known` clips kept their links because no known text
changed.

An audio-pass request is queued on `lit_for_eng`
(`tools/course-optimization/queue-audio-pass.cjs`) with this pass named as the reason.
**Voice casting and rendering are a separate gated decision and were not taken.**

| Row | role | voice of the superseded clip |
|---|---|---|
| `S0070L01B03` | target1 | azure_lt-LT-OnaNeural |
| `S0070L01B03` | target2 | azure_lt-LT-LeonasNeural |
| `S0121L03B04` | target1 | azure_lt-LT-OnaNeural |
| `S0121L03B04` | target2 | azure_lt-LT-LeonasNeural |
| `S0121L03U02` | target1 | azure_lt-LT-OnaNeural |
| `S0121L03U02` | target2 | azure_lt-LT-LeonasNeural |
| `S0182L02U02` | target1 | azure_lt-LT-OnaNeural |
| `S0182L02U02` | target2 | azure_lt-LT-LeonasNeural |
| `S0195L02U01` | target1 | azure_lt-LT-OnaNeural |
| `S0195L02U01` | target2 | azure_lt-LT-LeonasNeural |
| `S0208L01U02` | target1 | azure_lt-LT-OnaNeural |
| `S0208L01U02` | target2 | azure_lt-LT-LeonasNeural |
| `S0211L03B04` | target1 | azure_lt-LT-OnaNeural |
| `S0211L03B04` | target2 | azure_lt-LT-LeonasNeural |
| `S0211L03U04` | target1 | azure_lt-LT-OnaNeural |
| `S0211L03U04` | target2 | azure_lt-LT-LeonasNeural |
| `S0214L02U04` | target1 | azure_lt-LT-OnaNeural |
| `S0214L02U04` | target2 | azure_lt-LT-LeonasNeural |
| `S0241L01B02` | target1 | azure_lt-LT-OnaNeural |
| `S0241L01B02` | target2 | azure_lt-LT-LeonasNeural |
| `S0241L01B03` | target1 | azure_lt-LT-OnaNeural |
| `S0241L01B03` | target2 | azure_lt-LT-LeonasNeural |
| `S0241L01U01` | target1 | azure_lt-LT-OnaNeural |
| `S0241L01U01` | target2 | azure_lt-LT-LeonasNeural |
| `S0241L01U02` | target1 | azure_lt-LT-OnaNeural |
| `S0241L01U02` | target2 | azure_lt-LT-LeonasNeural |
| `S0241L01U03` | target1 | azure_lt-LT-OnaNeural |
| `S0241L01U03` | target2 | azure_lt-LT-LeonasNeural |
| `S0241L01U05` | target1 | azure_lt-LT-OnaNeural |
| `S0241L01U05` | target2 | azure_lt-LT-LeonasNeural |
| `S0248L03U01` | target1 | azure_lt-LT-OnaNeural |
| `S0248L03U01` | target2 | azure_lt-LT-LeonasNeural |
| `S0260L01B03` | target1 | azure_lt-LT-OnaNeural |
| `S0260L01B03` | target2 | azure_lt-LT-LeonasNeural |
| `S0278L02U01` | target1 | azure_lt-LT-OnaNeural |
| `S0278L02U01` | target2 | azure_lt-LT-LeonasNeural |

---

## How it was run, and what was verified

- **Scan**: every `lit_for_eng` phrase carrying a `ne-`/`nė-` verb (859 rows), clause-scoped
  either side of the negated verb so subordinate clauses were excluded, screened for
  accusative morphology with time adverbials filtered out. 83 candidates forward of the verb,
  6 behind it, plus a targeted pass for plural accusatives in `-as`/`-is`/`-us`. Every
  candidate was read against its own seed sentence and its full sibling family before a
  verdict.
- **Apply**: gated script, `DRY_RUN` first. Per-row before-state assertions — exact
  `target_text` match, the accusative fragment must occur exactly once, exactly one
  decomposition tile may carry it — aborting the whole run on any drift. Read-back assertion
  after each write.
- **Verified live**: all 18 rows read back with the new text; **18/18 decompositions
  recompose to their new `target_text` character-for-character**; phrase count unchanged at
  6,070; the 11 affected seeds still present in `course_round_index` (which carries no phrase
  text, so no refresh was needed); **no ZUT collision created** — each of the 18 known prompts
  still maps to exactly one target across the course.
- No test suite was run: this is a content pass on 18 rows with no code change.
