# The inflection hole in the v3 ZUT gate — closed, and what it costs

*2026-08-28. Tom's ruling, implemented and measured on live Spanish before landing.*

---

## The ruling

> "the ZUT gate was relaxed too much. It is a known problem. agents think that
> inflections are basically ok, so they use them. they are not OK in this
> methodology. if I say: I drink / he drinks / is drinking / drinking more — do I
> have zero uncertainty about the target language I am being asked to produce?
> the answer is no, unless each of these has been introduced separately as their
> own distinct LEGO."

Three parts, implemented exactly:

1. **Availability is keyed on the exact surface form.** No stemming, no
   lemmatisation, no morphological expansion, no fuzzy or normalised matching
   anywhere in the availability computation. The gate never inflects and never
   derives; it only ever asks whether this exact form has appeared.
2. **The test is attestation, not introduction.** A form is available if it was
   SEEN — as a LEGO in its own right, **or as a component of an M-LEGO**. "we DO
   allow components of an M-LEGO that might NOT have been introduced as their own
   LEGOs, but they DO become available as legitimate vocab." SEEN versus DERIVED.
3. **Seeds give the computation its bounds.** For a LEGO at seed N: everything
   attested in seeds 1..N-1, plus what landed earlier within seed N. Availability
   is a query over the course, not a judgement made by a model.

---

## Where the widening was — every site, with its line

**1. `tools/phrase-lab/score.cjs:97` — a stemmer on the known side.**
`const stem = (w) => w.replace(/(ing|ed|es|s)$/, '')`, applied at `:273–274` to
both the phrase's own known gloss and its tiles' glosses before comparison.
*drink / drinks / drinking* collapsed to one string. **This is the hole.**

**2. `tools/phrase-lab/inventory.cjs:88–101` — `zutKey()` stripped the infinitive
marker.** A leading or trailing "to" was folded away when building the
known→target mapping table (`:133`, `:152`) and again when matching a tile's
declared gloss (`score.cjs:192–193`), so "explain" and "to explain" were one
entry. Contraction folding in the same function is orthography and is kept; the
infinitive strip is a derivation and is gone.

**3. `prompts/phrase-prompt-v3-zut-edges.md` — nothing told the agent.** 253
lines constraining which *target* words are available and not one sentence
constraining the *English* surface form it may write. The model was free to
inflect and only the widened checks above ever looked.

**4. `tools/phrase-gate/gate-check.cjs:259` — the known-side context was cached
per SEED, not per LEGO.** On a multi-LEGO seed, whichever LEGO ran first wrote
the cache and every sibling reused it: an earlier-index LEGO could silently
inherit a later-index sibling's vocabulary, and authoring order rather than
`lego_index` decided what was available. The same context was also built from the
current LEGO alone, so the earlier siblings it is genuinely entitled to were
missing. Both fixed.

**5. `services/course-builder/lib/phrase-generation.cjs:165` — a `gate: false`
option** disables the whole gate including the known-side check. Not reachable
from `phrases-v3.cjs` today. Named, not changed.

**Not a widening, for the record:** `services/course-builder/lib/validation.cjs:806`
`stemKnownGloss` is already exact-form, carrying Tom's identical ruling of
**2026-06-15**. `spa_for_eng` has no contract of its own but falls back to
`_default_eng`, so that gate does run for Spanish — which is why so much of what
follows is independently corroborated. **This ruling has been made twice; the lab
code was written as though it had never been made once.**

---

## The bounds question, answered rather than assumed

Tom asked for the "earlier within seed N" clause to be confirmed against how the
builder actually orders within a seed.

- **`ralph-methodology.md:526`** — "LEGO N may draw on prior seeds plus LEGOs
  1..N-1 — **never a later sibling. No forward references.**"
- **`tools/phrase-lab/inventory.cjs`** (what the generator's prompt is built
  from) filters `lego_index < legoIndex`. **Agrees.**
- **`seed-complete.cjs`'s target-vocab check** snapshots prior vocab per LEGO in
  order. **Agrees.**
- **`seed-complete.cjs:1584`, the live known-side gate, does NOT.** It hands
  `checkKnownSide` the entire `legos` array for the seed once and reuses that one
  context for every LEGO, so a phrase for LEGO 1 may legally use an English gloss
  that only exists on LEGO 3 of the same seed.

**That disagreement is real and it is measurable: 9 of the 92 phrases this change
newly blocks are within-seed forward references that the live known-side gate
cannot see** — e.g. spa S0120L02 ("bus"), whose phrases use "by", introduced at
L04 of the same seed. The one-line fix has been applied to `gate-check.cjs` (the
v3 door's precondition, where it makes the gate stricter and nothing new can get
through). **`seed-complete.cjs` is deliberately untouched** — it is the live
submission route for every build in the estate and changing it is a separate
decision with its own blast radius.

---

## The measurement

Baseline reproduced live before anything was changed, not quoted:
**spa_for_eng seed 358 → 959 usable / 469 blocked mappings**, matching the v3
design doc exactly.

### Availability table — the infinitive fold was wrong in BOTH directions

| | before | after |
|---|---|---|
| usable mappings at spa 358 | 959 | **959** |
| blocked | 469 | **469** |
| blocked for `ambiguous-known` | 304 | 263 |
| blocked for `convergent-target` | 165 | 206 |

The totals are unchanged and that is a coincidence worth reading: **58 individual
mappings changed verdict, 29 each way.**

- **29 were wrongly blocked** and are now usable: "to speak"→*hablar*, "to
  try"→*intentar*, "to know"→*saber*, "to have"→*tener*, "to work"→*trabajar*.
  Each had been folded into a same-lemma sibling ("speak"→*habla*) and reported
  as a collision that does not exist. Two distinct English forms, two distinct
  Spanish forms, no uncertainty either way.
- **29 were wrongly released** and are now blocked, all of the shape
  "explain"/"to explain" → *explicar*, "tell me"/"to tell me" → *decirme*: two
  English forms genuinely reaching one Spanish word. **That block comes from the
  pre-existing convergent-target rule, not from this change** — the fold was
  hiding them from it. See the decision list below.

### The gate on live content

Every live BUILD and USE phrase of 140 Spanish LEGOs (every 10th seed across the
course), scored by the old gate and the new gate against identical inventories:

| | phrases | pass | fail |
|---|---|---|---|
| before | 1,355 | 950 (70%) | 405 |
| after | 1,355 | **858 (63%)** | 497 |

**92 phrases go from usable to blocked. None goes the other way.** That is 6.8%
of all live phrases and **9.7% of everything that previously passed.**

By reason — 109 failures across those 92 phrases:

| reason | count |
|---|---|
| `unattested-known-form` — the English word never appeared at all | 79 |
| `derived-inflection` — an inflected form of a word that was taught | 30 |
| `target-not-asked-for` — pre-existing smuggle, newly visible | 2 |

Most frequently blocked forms: *about, between, another, person, right, late,*
***finishing***, *still,* ***being, asking***, *by, us, watch,* ***worries***,
*sort,* ***remembering, explaining***, *phrase, even, though, everything,
friendly, honestly.*

### A dozen, concretely

| seed | prompt the learner is shown | target | why it is now blocked |
|---|---|---|---|
| 10 | I'm not sure about **remembering** what I mean | *recordar lo que quiero decir* | taught "remember", never "remembering" |
| 10 | I'm not sure about **explaining** something in Spanish today | *explicar algo…* | taught "explain" |
| 30 | I'm looking forward to **asking** you something | *preguntarte algo* | taught "ask" |
| 50 | I don't care about **finishing** now | *terminar ahora* | taught "finish" / "to finish" |
| 60 | I need to practise **saying** different words… | *decir palabras…* | taught "say" |
| 100 | **Worrying** about that | *preocuparte por eso* | taught "worry" |
| 250 | She wants to read the question again before she **answers** | *antes de que conteste* | taught "answer"; the target is a subjunctive nobody has met either |
| 200 | I think it is important to finish on time when you work with **others** | *con ellos* | taught "other" |
| 125 | I believe it's very important to **keep** trying when it's difficult | *seguir intentando* | "keep" first appears at seed 443 |
| 200 | They say that even **though** it is difficult… | *aunque…* | "though" first appears at seed 538 |
| 200 | I want **us** to finish this before I have to leave | *que terminemos…* | "us" first appears at seed 211 |
| 225 | I am not sure I can remember the whole **phrase** but I know the answer | *toda la frase…* | "phrase" appears nowhere in the course |
| 358 | to **reach** the top | *llegar a la cima* | "reach" appears nowhere; *llegar* was taught as "arrive" |

---

## Is this real, or is it collateral? — the judgement

**It is real, and it is not this gate's opinion: the estate's own API validator
already agrees with 83 of the 92.** Running `validation.cjs`'s exact-form
`checkKnownSide` — Tom's 2026-06-15 ruling, live, contract-gated through
`_default_eng`, which spa_for_eng resolves to — over the same 92 phrases returns
a known-side breach on 83 of them, naming the same tokens: *unknown gloss
"phrase"*, *gloss "keep" not introduced until 443*, *gloss "us" not introduced
until 211*. **The other 9 are the within-seed forward references described above,
which that gate is structurally unable to see.** So: 92 of 92 are defects by the
estate's own standing rules. Zero are artefacts of the new check.

Two honest qualifications, both of which are Tom's to weigh:

**The 30 inflection hits are the weakest of the three classes, and they are the
class the ruling is actually about.** Nearly all are an English gerund after a
preposition — *about finishing*, *forward to asking*, *practise saying* — where
the Spanish is the taught infinitive. A learner shown "finishing" who reaches for
the "finish" they were taught lands on *terminar* and is right. They are real
under the ruling; they are the mildest thing it catches; and they are exactly
where **canon K6** (Kai, 2026-08-17 — "the known can use a different case, or
conjugation, contraction… even if it isn't introduced") says the opposite. That
clash is now recorded in the canon as **C24**, unresolved, with the reconciliation
I believe is right — *strict at the gate, proportionate in the sweep* — written
down as a guess rather than acted on.

**Tom's own hand-graded GOOD specimen no longer passes.** spa 358 "the top" is
the positive example the v3 prompt shows every builder, and its phrases read "to
**reach** the top" → *llegar a la cima* where *llegar* was taught as "arrive".
"reach" appears nowhere in seeds 1..358. The old gate called this *gloss drift*
and warned; the ruling makes it a failure; and the API validator has been calling
it `unknown gloss "reach"` all along. The live regression test in
`score.test.cjs` has been flipped to assert the failure, with the reason written
into the test rather than the assertion quietly deleted. **The specimen needs
repairing or replacing, and that is a decision, not a fix to apply.**

---

## What is on Tom's desk

1. **The positive specimen.** spa 358 fails on "reach". Repair the set, or pick a
   new positive specimen for the prompt.
2. **Same-lemma convergence.** 29 mappings are now blocked because two English
   forms reach one Spanish word ("explain"/"to explain" → *explicar*). The
   muy/bien rule that blocks them was written for *bien* ← well / fine / a good
   time — three different lexemes. Should one lexeme's two forms converging count
   as a block, or not?
3. **`seed-complete.cjs:1584`.** The live submission route pools the whole seed's
   LEGOs for the known-side check, against ralph's stated rule and against its own
   neighbouring target-vocab check. One line. Not touched here.
4. **C24 — K6.** Does Tom's ruling reach back into finding triage on existing
   courses, or is it a gate-time rule only? Nothing has been re-opened pending
   his word.

## What is NOT in this change

- No course content was regenerated or edited. Every measurement is read-only.
- `seed-complete.cjs` is untouched.
- No check was weakened anywhere. The 44-test suite in
  `tools/phrase-lab/score.test.cjs` passes, including four new tests that lock
  the ruling in place: an inflected known form fails, `-ing` on a taught form
  fails, the exact introduced form still passes, and a component of an M-LEGO
  counts as attested vocabulary.
