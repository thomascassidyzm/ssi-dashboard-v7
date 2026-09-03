# Connemara build — ADDENDUM, night of 20–21 Aug 2026

**Read `docs/gle-cn/BUILD-BRIEF-300-2026-08-20.md` FIRST. This file amends it.**
Where the two disagree, **this file wins** — it carries rulings Kai made after the brief was written.

Course is `gle_cn_for_eng`. Never touch `gle_for_eng`, `gle_ul_for_eng`, `gle_mu_for_eng`.
**ZERO TTS. Zero rows in `course_audio` before and after. No `/generate`, no `queue-audio-pass`,
no tool with `audio` in its name.**

---

## A. Rulings added tonight (all Kai's own, all closed)

**A1 — "I am going to" is NOT `tá mé chun`.** Zero attestation in the dialect. Use
**`ag goil a` + softened (lenited) verbal noun**. `tá mé ag goil a labhairt` = *I'm going to speak*.
22 of the 668 English seeds carry "going to".

> ⚠️ **AMENDED 2026-08-21, and this is now the only permitted form.** This rule first offered
> `ag goil a` *or* `ag dul a` — which is two targets for one known prompt, i.e. a ZUT break written
> into the ruling itself. Worker T1 read all 248 translated seeds and found the estate had already
> converged on its own: **`ag goil a` 7, `ag dul a` 0.** So `ag goil a` is the form. **Do not write
> `ag dul a`.** Corpus backs it: `ag goil a` 111 hits across the four volumes against 7 for
> `ag dul a`, and vol III notes `a ghoil aL` is "for regular `ag goil aL`".
>
> **Known consequence (worker T4):** `ag goil a` **cannot take a fronted object** — its own `a`
> already fills the particle slot that fronting needs. So inside this one frame the course's normal
> object-fronting word order inverts. Seeds 227, 236 and 243 hit it and are decided consistently.
⚠️ **This SUPERSEDES the row `I'm going to → tá mé chun | S5` in the translation register.**
Seeds 5, 8, 12, 23, 25 still hold the old `chun` and are being repaired by another job — **do not
edit them yourself**, but never write a new `chun`-future.

**A2 — NEVER split a preposition off as its own tile and invent a gloss for it.** If a verb simply
demands a preposition (`cuimhnigh **ar**`, `fiafraigh **de**`, `cabhraigh **le**`), that preposition
belongs *inside* the tile with its verb. It is not a word meaning "about" or "of" or "with".
This was tonight's worst defect: one bad split glossed a verb-demanded `ar` as "about", and seven
downstream English practice sentences were then generated from the invention, producing
*"remember about the whole sentence"*, which is not English. **One bad split manufactured seven bad
sentences.** If you find yourself writing an English gloss for a bare preposition, stop.

**A3 — A seed that teaches units MUST MIRROR ITS OWN SENTENCE.** If a unit does not appear in the
seed's own target sentence, it does not belong to that seed. Silently broken twice already.

**A4 — THE GOVERNING TEST.** Apply to every single phrase you write:
> *Could a learner holding ONLY what the course has taught so far produce this sentence from the
> English prompt alone?*
If not, **the decomposition is wrong, not the learner.**

**A5 — You explain something TO someone, never "with" someone.** (English-side naturalness; the
same care applies to every other English preposition you write.)

**A6 — No bare frames, ever.** Never a pattern with a slot in it. Whole sentences in context only.
**One new unit at a time.**

**A7 — `tá … agam` possession + Hiberno-English "I have Irish" on the known side.** Seed 13
introduces `agat`, seed 22 `acu`. **"very good Irish" is ONE unit** — never `very` + `good`.

**A8 — Seed 14 is habitual**: `An mbíonn tú ag caint i nGaeilge` — not the possession idiom.

**A9 — `labhairt` (verbal noun) is correct and stays. The finite present of `labhair`
(`labhraím`, `labhraíonn`) is BANNED everywhere.**

**A10 — Dialect as actually spoken beats standard.** "Not in the dictionary" is not an objection.
Settled: `amáireach`, `eicínt`, `i nGaeilge` (never `as Gaeilge`), `chuile`, `céard`, `tá muid`,
`aríst`.

---

## B. TWO THINGS DELIBERATELY LEFT OPEN — annotate, DO NOT decide

### B1 — the word for "try"
A higher-tier job is deciding this **right now**. You do **not** get a vote.

- **`ag iarracht` is NOT a Kai ruling.** It was misattributed earlier tonight and looks like a
  coinage rather than a real dialect form. It appears **nowhere** in the live course. Do not write it.
- **Use whatever the live course already uses**, which is:
  - *"I'm trying to X"* → `tá mé ag iarraidh X` (as at seed 2)
  - *"to try to X"* → `iarracht a dhéanamh X` (as at seed 8)
  - *"try as hard as I can"* → `mo dhícheall a dhéanamh` (as at seed 7)
- **ANNOTATE EVERY INSTANCE YOU WRITE** so a later swap is surgical. Annotation = append the exact
  marker `<!--TRY-OPEN-->` on its own line in your seed markdown, listing the seed number and the
  line, AND list every instance in your final report with seed number and phrase. **Report your
  count.** A sweep will be sized from these numbers.

### B2 — the "how to" embedded clause
`cén chaoi` + verbal noun is **unattested (0 of 76 in the corpus)**, but the obvious repair collides
with A9 (`labhair` has no present tense). This is a curriculum decision still sitting with Kai.

- **Do not create NEW instances.** If an English seed says *"how to …"*, prefer a rewrite that
  avoids the embedded clause where the English allows it naturally.
- If you cannot avoid it, use the live form `cén chaoi` (**no `le`**), mark it `<!--HOWTO-OPEN-->`,
  and list it in your report.

---

## C. Confidence labels — mandatory, honest

Every non-obvious sentence carries one:
- **confident** — attested, or the dictionary's own frame
- **best attempt** — regular and not contradicted, but not directly attested
- **genuinely uncertain** — you are guessing at the wording; a speaker should look at it

> **"This needs a native speaker" is NOT a terminal answer.** We have none. Attempt it, label it,
> move on. But say clearly in your report **which items a Connemara speaker should be shown first.**

---

## C2. Register decisions merged by the coordinator, 2026-08-21 — BINDING

Merged from the finished translation workers because a second worker could plausibly pick each of
these the other way tonight. **Use these; do not re-decide them.**

| English | Irish | why |
|---|---|---|
| in a few days / in a week | **`faoi cheann`** + time noun | **NOT `i gceann`** — Ó Curnáin glosses `i gceann` as *"in addition to"* and it never appears before a time noun. `faoi cheann` is attested in running speech. Live at seeds 253, 274. |
| longer (comparative of *fada*) | **`níos foide`** | `foide` 23 vs `faide` 3. The shared register's worked example writes `faide`, but there is no ruling row for it and both are zero in the live course, so R1 governs. Live at seeds 275, 276. |
| what is …? (identifying) | **`Céard é …`** (copula) | identifying questions take the copula, not `atá`. |
| did you have to …? | **`Arbh éigean duit …?`** | **NOT `Ar b'éigean duit`**, which is not a well-formed past-copula question. Live at seed 278. |
| I only had to … | **`Níorbh éigean dom ach …`** | not `tá orm`, which the shared register itself forbids. |
| to help (someone) | **`cúnamh do`** — e.g. `cúnamh dhom` | **NOT `cabhrú le`.** Ó Curnáin, controls passing: `cabhrú` **1**, `cúnamh` **42**, `cabhair` 11, `cuidiú` 4. Note the preposition changes with the word: `cúnamh` governs **do/dho**, never `le`. Attested: *"cúnamh DHOM"*, *"níor thug sé cúnamh ar bith DHI"*, *"ag goil a chúnamh"*. Applied at seed 25. |
| to improve (intransitive) | **`feabhsú`** | the shared register's `feabhas a chur ar` is transitive and cannot be written where there is no object (seed 44). |

**Still genuinely open, do not harden:** the word for *sister* (seeds 233/234/284), `Aontaím leat` vs
`Tá an ceart agat` (seeds 83/84), and `bialann` vs the loanword `restaurant` (seed 156).

---

## D. The corpus trap — read before you cite a zero

Ó Curnáin vols I–III are phonetic transcription in a custom font and **extract as control bytes**.
`grep` calls them binary and returns **FALSE ZEROS**. Read them in Python via
`tools/gle-cn/ocurnain-probe.py`, and **calibrate on words you know are present** before trusting
any zero. The tool also reads from a temp folder that can be cleared mid-run — verify your files
still exist. A false zero nearly became a linguistic ruling tonight.
**A bare zero is not evidence.** Ordinary words score 2–9 across ~2,700 pages.

### D2. THE APOSTROPHE TRAP — worse than the binary-file trap. Found by worker T5, 2026-08-20.

**Any probe containing a literal ASCII apostrophe returns a FALSE NEAR-ZERO.** The apostrophe in
the extracted volumes is *not* U+0027. Worked example: `b'fhéidir` probes as **1**. Its real count
is **191**.

This is nastier than the binary-file trap, because a *near*-zero looks exactly like a genuine
noise-floor result and therefore **survives the "a bare zero is not evidence" check**. T5 was one
step from ruling that Connemara does not use `b'fhéidir`.

**So:** before citing any count for a form with an apostrophe — `b'fhéidir`, `b'éigean`,
`níorbh`, `arbh`, `d'iarr`, `m'athair` — re-run it with the apostrophe as a wildcard (`.`) and
compare. **Every apostrophe-bearing count reported on the night of 20 August must be re-run
before it is used as evidence for anything.**

---

## E. Checkpoints — every ~50 seeds, stop and self-check

Do not eyeball it. Verify all seven and report each briefly as you go:

- **(a)** no word used before its introduction
- **(b)** no bare frames
- **(c)** no preposition split off with an invented gloss
- **(d)** every unit mirrors its own seed sentence
- **(e)** dialect forms consistent; no finite present of `labhair`
- **(f)** the English is natural and grammatical to a native English speaker
- **(g)** still **zero** rows in `course_audio`

Helpers: `node scripts/gle-cn/vocab.cjs <seed>` and `node scripts/gle-cn/checkpoint.cjs <from> <to>`.
**If a checkpoint fails, FIX IT BEFORE CONTINUING.**

---

## F. Write paths — the only sanctioned ones

Course-builder API already runs on `http://localhost:3471`. **Do not start another copy.**

### F0 — RUN THE PRE-CHECKER BEFORE EVERY POST. Do not rebuild one.

    node scripts/gle-cn/scratch-d1/precheck.cjs  <yourseed>.md
    node scripts/gle-cn/scratch-d2/preflight.cjs <yourseed>.md

They call the **course-builder's own validation library**, so a clean local run means the POST will
not be rejected. They reproduce every hard gate — tiling, target vocabulary, lego containment,
**3 BUILD / 5 USE phrase counts**, BUILD anti-template, known-side controlled language, syllable
cap, length ratio, ZUT. They cut per-seed time from ~55 minutes to 10–15, which is the difference
between finishing and not. See `scripts/gle-cn/READ-ME-PRECHECK.md`.

Translation (one call per seed):
```
curl -s -X PATCH http://localhost:3471/api/seed/gle_cn_for_eng/<n> \
  -H 'Content-Type: application/json' -d '{"target_text":"<Irish>"}'
```

Decomposition + practice phrases (atomic, one call per seed):
```
curl -s -X POST 'http://localhost:3471/api/seed/complete?course=gle_cn_for_eng' \
  -H 'Content-Type: text/markdown' --data-binary @seedNNN.md
```
Never set a phrase ID. If it rejects you, **read the rejection and fix the content** — do not write
to the database directly to get around it. Scratch files go in `scripts/` (gitignored), never in
the repo root.

---

## G. ZUT across parallel workers

Several workers are translating **disjoint** bands simultaneously. Read
`docs/gle-cn/translation-register-2026-08-20.md` **before translating a single seed** and use its
Irish for any English it covers — **except** the `I'm going to` row, which A1 above overrides.

If your English is not in the register and you judge it will recur, **do not just pick one silently**:
append it to **your own file** `docs/gle-cn/register-additions-<yourlabel>.md` with the English, your
Irish, your authority and your confidence. The coordinator merges these and runs a ZUT sweep.
**Never edit the shared register file directly** — parallel writes will clobber each other.

---

## H. THE TOOLS THAT LIE — read this BEFORE you trust any measurement

**Kai's standing rule: a measure that lies is worse than no measure.** Five tools on this build have
now been caught reporting something false, and **every one was caught by a worker checking rather
than trusting.** Start from this list instead of rediscovering it at your own cost. Each entry says
what the tool reports, what is actually true, and how to get the real answer.

### H1 — The corpus reader returns FALSE ZEROS (this is §D above, in register form)

`grep` classifies Ó Curnáin vols I–III as **binary** — their phonetic transcription extracts as
control bytes — and prints *"Binary file matches"* instead of a count, so `grep -c` returns **0 for
words that are demonstrably present**. A false zero reads exactly like *"this dialect does not have
this form"*, and it has come within one step of becoming a linguistic ruling **three times**.

**Real answer:** `python3 tools/gle-cn/ocurnain-probe.py <regex>`, and **read its calibration block
before you read your own counts**. If `Gaeilge`≈121, `duine`≈521 and `bhí`≈3133 do not come back at
those values, your extraction is broken and every number under it is meaningless. A bare zero is not
evidence: ordinary words score 2–9 across ~2,700 pages.

### H2 — The apostrophe bug turns real forms into FALSE NEAR-ZEROS

The apostrophe in the extracted volumes is **not** U+0027. Any probe containing a literal ASCII
apostrophe under-counts massively: `b'fhéidir` probes as **1** against a true count of **191**.

This is nastier than H1 because a *near*-zero **survives the "a bare zero is not evidence" check** —
it looks like an ordinary noise-floor result. Re-run every apostrophe-bearing probe with the
apostrophe as a wildcard (`.`) and compare: `b'éigean`, `níorbh`, `arbh`, `d'iarr`, `m'athair`.

### H3 — The vocabulary lister is WIDER than the gate, and the gate allows no inflection

`vocab.cjs` prints every English word the learner has met. **The gate accepts far fewer.** It reads
LEGO and COMPONENT glosses only — never seed or phrase English — and matches **exact forms**:
`looking` does not license `look`, `work` does not license `works`.

The gap is real at every seed and was worst where first measured: the 194–218 band found **364
listed against 189 accepted**. Re-measured at seed 132 it is **285 listed against 259 accepted** —
narrower as the course grows, but never zero, and writing from the wider list gets you rejected.

**Real answer:** `node scripts/gle-cn/w-D194/glosses.cjs <seed>` prints the list the gate actually
uses. Write only from that.

### H4 — The known-side gate shreds English contractions, and pushes you toward stilted English

The gate expands contractions into tokens before matching, and **some of those tokens are not
words**. Verified directly:

| you write | gate sees |
|---|---|
| `can't` | `ca` + `not` |
| `don't` | `do` + `not` |
| `it's` | `it` + `is` |
| `I'd` | `i` + `would` |

So **`can't` is licensed by the fragment `ca`, not by `can`.** Teaching *"if I can"* does **not**
make *"can't"* legal. This bit seed 113 in the 111–131 band: the perfectly natural prompt
*"Why can't I remember what you said?"* was rejected as **unknown gloss "ca"**, and the fix was to
write the stiffer *"why am I not able to remember what you said?"* instead.

**That is the damage — it does not corrupt data, it quietly degrades the English toward the
stilted**, which is exactly what R4 forbids. If a contraction is rejected, you have two honest
options: introduce it properly in a gloss, or rewrite. **Do not conclude your English was bad.**

### H5 — The `[n]` bracket is NOT a syllable count to the server

The brief calls the bracket on a USE line *"the target syllable count"*, and `sylmd.cjs` stamps a
syllable estimate into it. **The server reads it as a quality score.** `markdown-parser.cjs` copies
a single bracketed value into **both** `known_score` and `target_score`, and `phrase-structure.cjs`
then **rejects any USE phrase scoring under 5** with the message *"broken English"*.

Nothing downstream consumes the syllable reading, so a too-high number is harmless — **which is the
only reason nothing has been bitten yet. Every phrase so far happens to be long enough. That is
luck, and it will run out.** A genuinely short, perfectly natural USE line gets stamped `[4]` and is
rejected as broken English, with a message that sends you off rewriting a sentence that was never
wrong.

**If a USE line is rejected for a low score, check the bracket before you touch the sentence.**
Raising the number is legitimate — it is a quality score, and a short natural sentence is not a
low-quality one.

### H6 — Historical, now fixed: the 8-syllable LEGO cap lived in only one pre-checker

`precheck.cjs` used to pass a lego the server would reject as `lego_too_large`, because the cap was
implemented in `preflight.cjs` alone. **Fixed 21 Aug — either tool alone now catches it.** Recorded
because it is the shape of failure to watch for: *two* tools that are each described as sufficient,
and are not. Long relative clauses are where the cap bites.
