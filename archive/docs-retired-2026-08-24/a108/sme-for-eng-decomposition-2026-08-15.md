# sme_for_eng — decomposition build report

**2026-08-15 · Northern Sami for English speakers · TEXT ONLY, NO AUDIO GENERATED**

---

## How far it got

| | Before tonight | After tonight | Remaining |
|---|---|---|---|
| Translated seeds | 668 | 668 | 0 |
| Seeds decomposed | **0** | **10** | **658** |
| LEGOs | **0** | **31** | — |
| Practice phrases | **0** | **204** (81 BUILD + 123 USE) | — |
| Component rows | 0 | 24 | — |
| Audio clips | 1 (pre-existing) | **1 — unchanged** | — |

**10 of 668 seeds (1.5%) are decomposed. The course is NOT built.** It is a small,
fully-checked opening block with everything downstream of decomposition in place for those
10 seeds, a derived pair-contract, and a clean runway from seed 11.

**No TTS was run. No audio was generated.** `course_audio` holds exactly the one clip it
held before this session. Kai's hard rule was observed without exception.

The block is smaller than planned. The honest reason is in *Gaps* at the bottom: both
dispatched helper workers died on account limits without delivering, so their legwork was
absorbed into this session by hand.

---

## Premise check — done first, and the census was wrong on one point

Verified against the live database before anything was written:

- `sme_for_eng` exists, status `draft`, visibility `hidden`.
- **668 seeds**, numbered 1–668 with no gaps, every one carrying Northern Sami `target_text`.
- **0 LEGOs, 0 practice phrases** before this session. That much the census had right.

**It is not a 300-seed standard-tier build. It is a 668-seed flagship build.** The census
flagged this as an inferred number and it was wrong. `courses.seed_count` is `NULL` for
this course, and the API reports a NULL `seed_count` as "300" from a hardcoded default —
so the inference came from a field that says nothing. The seed rows say 668, and seed 1's
English is the shared 668-seed flagship corpus used by `hak / mar / tel / deu_ch / ara_lb /
rus / fin / hun` and dozens more.

> Worth passing on: the same `seed_count IS NULL` blind spot will have mis-sized **every**
> zero-LEGO course the census looked at, not just this one.

---

## Do the Sami letters survive? — round-trip evidence, not assurance

Northern Sami carries seven letters that a careless normalisation step would silently
destroy. All seven are present in the corpus, all 668 rows are NFC-clean, and no unexpected
non-ASCII character occurs anywhere:

| á | š | č | đ | ŋ | ž | ŧ |
|---|---|---|---|---|---|---|
| 984 | 279 | 234 | 97 | 53 | 49 | 6 |

The real test is the write path, so it was measured rather than reasoned about: every LEGO
target was compared **codepoint by codepoint** between what was POSTed to
`/api/seed/complete` and what came back out of the database.

**Result: 31/31 LEGOs byte-identical, 0 altered.** Across all 259 stored LEGO + phrase rows:
`á` U+00E1 ×415, `č` U+010D ×131, `š` U+0161 ×24; **0 rows non-NFC**; a fold-detector
looking for `geahccalan`, `cilget`, `vejolas`, `sahtan` and similar de-diacriticised forms
returns **0 hits**.

**Explicit limit on that evidence:** the vocabulary of seeds 1–10 contains only **á, č and
š**. `đ`, `ŋ`, `ž` and `ŧ` are attested in the corpus but do not yet appear in any built
content, so they are **not** covered by the round-trip measurement above. They should be
re-checked when a seed containing them is built. The intended code-path audit of every
`.normalize()` call in `seed-complete.cjs` was not done — see *Gaps*.

---

## The decomposition rule adopted for this pair, and why

This is as much the deliverable as the rows, so it is stated plainly.

Northern Sami has **consonant gradation**: the stem itself alternates through the paradigm,
so forms of one word share no usable prefix.

```
hupmat  (to speak)   ~  human  (I speak)  ~  humat  (you speak)  ~  hupmet  (they speak)
sáhtán  (I'm able to) ~ sáhtát (you're able to) ~ sáhttit (to be able to) ~ sáhte (…able, negative)
```

**Consequence, stated as a warning to the toolchain: any string-similarity test for "same
word" is unsafe in this pair.** It misses real repeats (`hupmat`/`human` share three
letters) and would merge distinct words. None was used, and none should be added.

**THE RULE: every LEGO is a whole inflected surface form with its own English intention.
Never a stem, never a bare person-ending, never an abstract lexeme.** Each form the learner
must *produce* is its own card; the paradigm is inferred by contrast, which is the method's
normal mechanism, not a departure from it. Seeds 1 and 9 are the showcase: `to speak →
hupmat` and `I speak → mun human` are two separate cards, and the learner infers the
alternation from the pair without a word of grammar.

**Negation is the sharpest case and follows from the same rule.** Sami negates with an
*inflecting* negative verb **and** changes the main verb, so both halves move at once:

```
mun háliidan (I want)      →  mun in háliid  (I don't want)
mun sáhtán  (I'm able to)  →  mun in sáhte   (I'm not able to)
mun lean    (I am)         →  mun in leat    (I'm not)
```

There is therefore **no "not" LEGO available**, and forcing one would be a category error —
the learner never forms an intention to "say *in*". Negation is taught as whole inflected
chunks (seed 10, `mun in leat sihkkar`), and the affirmative/negative pair carries the
grammar. This is a genuine departure from what the standard method would produce for, say,
Spanish, and it is deliberate.

**Method otherwise followed as written:** `ralph-methodology.md` +
`synonym-choice-architecture.md`, calibrated against **`fin_for_eng`** — the same 668-seed
corpus, the closest typological sibling in the estate (Uralic; case morphology, an
inflecting negative verb, partitive objects), and already proofread. That keeps the English
known side consistent with the rest of the estate rather than freshly invented here.

Every seed went in through `POST /api/seed/complete`, so each passed — atomically — tiling,
ZUT, the 8-syllable cap, containment, the BUILD anti-template gate, the vocabulary gate and
the known-side gate. Shape: 3.1 LEGOs per seed, 20.4 phrases per seed, USE outnumbering
BUILD 1.5 : 1.

---

## The mis-pairing defect — the check on my own output, with numbers

Kai's brief reports an estate-wide defect from the shared decomposition machinery: a LEGO's
known and target sides failing to correspond because one side was sliced from a *different
word in the same seed sentence*. All three prescribed checks were run against what is
actually in the database, not against my drafts.

**Result: 0 instances. The block is clean. Method for each, so the result means something:**

**1 · Off-by-one slice — 0/31 LEGOs.** For every LEGO, its target text was tested for
literal presence inside its *own* seed's target sentence. A LEGO holding a sibling's
material shows up here immediately. All 31 pass.

**2 · Seed coverage / missing LEGO — 0/10 seeds.** Every seed sentence was re-tiled from
scratch from its own LEGOs, their components, and everything taught earlier. A word the
seed needs that no LEGO ever teaches shows up as an uncovered token. **Zero uncovered
tokens across all 10 seeds.**

**3 · Self-contradiction (needs no Sami knowledge) — 0 forks.** All 55 known→target pairs
(31 LEGOs + 24 components) were cross-tabulated both ways.

- **Same English → two different Sami forms: 0.** This is the direction that would be a
  defect, and it is empty.
- **Same Sami form ← two different English glosses: 2.** Both are legal and intended —
  `hupmat` ← "to speak" / "speaking", and `muitit` ← "to remember" / "remember". These are
  the *reception* direction, which ZUT explicitly permits (`ralph-methodology.md` §ZUT
  Outranks Naturalness); they are recorded as convergences in the pair-contract rather than
  silently tolerated.

**A clean result is real evidence about the tool**, which is why the method is written out.
It is a 31-LEGO sample, so it is not a strong exoneration — but it is a genuine negative
data point from a fifth language pair, using the same machinery, on the same night.

One caveat stated honestly: checks 1 and 2 verify that each LEGO's target comes from the
right *place* in the sentence. They cannot verify that the English gloss attached to it is
the right *meaning* — that needs a Sami speaker, and it is what section E of the
native-speaker list asks for.

---

## The untaught-word rule — checked twice, result stated

> *A practice phrase may only use LEGOs the learner has already been taught at that point.*

Checked **during** the build — the API rejects a violating seed outright and inserts
nothing. It did so, and each rejection was fixed rather than bypassed. Then re-verified
**independently afterwards**: a separate script read all 31 LEGOs and all 204 phrases back
out of the database, rebuilt the learner's vocabulary in strict seed-then-LEGO order, and
re-tiled every phrase target from scratch from whole introduced chunks.

**Result: 228 phrase rows checked, 0 untaught-word violations.**

Two rejections worth knowing about, because both are the gate being right:

- **The known side is policed too, and does no stemming.** Six seed-10 prompts using
  *"…if I can remember…"* were rejected on `unknown gloss "if"`. The fix was to change the
  LEGO's gloss to *"if I'm able to remember"* so "if" is genuinely introduced — not to wave
  the prompts through. This also removed "can", which is the right call independently:
  Sami splits "can" by person *and* polarity (`sáhtán` / `sáhtát` / `sáhttit` / `sáhte`), so
  "can" would fork on the target side. `fin_for_eng` reached the same conclusion on the
  same corpus, which is a good sign the rule is real and not a local dodge.
- **Seed 1 genuinely cannot make two distinct phrases from two words.** `mun háliidan` +
  `hupmat` yields exactly one sentence. Seed 1 was submitted with the documented
  `SKIP_VALIDATION` bootstrap, which is honoured only for seeds 1–3 and silences the
  phrase-count minimums while leaving tiling, vocabulary, the syllable cap and the
  known-side gate fully in force. Seeds 2–10 used no bypass of any kind.

---

## Two defects found in the EXISTING translation (not introduced tonight)

Both were found by scanning all 668 seeds, and both are ruled on in the native-speaker list
rather than silently normalised.

**1 · "doesn't want" is spelled two ways in the identical slot.** `háliid` in seeds 19, 34,
35, 36 — `háliit` in seeds 241, 251, 269, 300, 302, 304, 399, 439, 473, 474, 500, 538. Same
construction, same grammatical slot, 4 seeds against 12. One of them is wrong. **Seed 19 is
inside the band being built**, so this one bites rather than being theoretical.

**2 · The dual is being used for plain English "we", and the English does not distinguish
it.** Sami separates *two people* (`moai`, with its own verb agreement — `geahččaletne`,
`dárbbašetne`, `letne`) from *three or more* (`mii`). English "we" in the corpus maps to
`mii` in 52 seeds and `moai` in 18 (S102, S104, S106–111, S117, S118, S143, S146 …), with
nothing on the English side to tell them apart. Seed 501 does the same with the dual "you",
`doai … stoahkabeahtti`.

**This is a ZUT violation baked into the translation layer, and decomposition cannot fix
it** — one English intention has two Sami answers. It does not affect seeds 1–10, but it
**stops anyone continuing past roughly seed 100** until it is ruled on. It needs either a
translation pass normalising "we" to `mii`, or a decision to differentiate the English
("the two of us").

Two things I suspected and checked and which turned out to be **nothing**: apparent `ii ii`
doubled negators and `ii mun` agreement errors were both artefacts of my own crude
tokeniser splitting on punctuation. Re-run against the raw text, both are zero. Recorded
because a scan that only reports its hits is not trustworthy.

---

## Produced alongside the content

- **`docs/pair-contracts/sme_for_eng.contract.cjs`** — the pair-contract, derived on first
  contact per `ralph-methodology.md` §The Pair-Contract. `ratified: null`, honestly, because
  nobody here speaks the language; the known-side gate therefore runs advisory. It carries
  the gradation rule, the negation rule, the attested convergences, the `nu … go` bound
  frames, and the "prefer *able to* over *can*" house rule.
- **`docs/a108/sme-for-eng-native-speaker-questions-2026-08-15.md`** — eight questions in
  plain English, answerable by a Sami speaker who knows nothing about our system. **Two are
  blocking** (the `háliid`/`háliit` split, and the dual-"we" problem).

---

## Gaps — reported, not papered over

- **Both dispatched workers died without delivering.** `#699 sme-diacritic-roundtrip` and
  `#700 sme-morphology-survey` both failed on `hit kai-gmail's limit`, as did several
  unrelated jobs across the estate at the same time. Their work was absorbed by hand here,
  which is the direct reason this block is 10 seeds rather than the ~30 planned. **No
  further workers were spawned** — the fleet was saturated.
- **The code-path audit of `seed-complete.cjs` normalisation was not done.** That was #699's
  job. What exists instead is the stronger empirical result — actual bytes in, actual bytes
  out — so the practical question is answered, but the claim in `ralph-methodology.md` line
  399 (that diacritics are stripped only for internal ZUT comparison) remains **unverified
  against the code**.
- **`đ`, `ŋ`, `ž`, `ŧ` are not yet covered by round-trip evidence** — they do not occur in
  seeds 1–10. Re-check when a seed containing them is built.
- **No native speaker has seen any of this.** Every Sami judgement here — what each word
  means, whether the composed sentences are natural, whether the word order works — is
  inference from the aligned English. The eight questions are where that inference is
  thinnest.
- **658 seeds remain undecomposed.** The course is not built and is not close to built.

---

## For whoever continues from seed 11

1. Read the pair-contract first — the gradation rule and the no-negator rule are what keep
   this coherent.
2. Calibrate against `fin_for_eng` on the same seed numbers. It is the closest sibling in
   the estate and it is proofread.
3. Prefer *"able to"* over *"can"* in every gloss.
4. **Get question B answered before you pass seed ~100.** The dual/plural "we" split is a
   wall, not a wrinkle.
