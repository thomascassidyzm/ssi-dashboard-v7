# eng_for_hin — English embedded-question word order (2026-09-03)

**Course:** `eng_for_hin`. Known side = Hindi (the cue). Target side = **English** (the answer the
learner produces). `new_app_status = live` — verified against `courses` in production Supabase.

**Status: APPLIED 2026-09-03 18:42 UTC — all 55 rows are live in production Supabase, verified live.** See [`APPLIED-2026-09-03.md`](./APPLIED-2026-09-03.md) for the apply run, the before/after validator and the audio consequences. The "Why nothing was applied" section below records the state before Kai approved.

---

## The short version

**55 defective rows across 16 seeds**, in four sub-classes:

| sub-class | rows | what is wrong |
|---|---|---|
| embedded inversion | **50** | `I don't know what would you like` — interrogative order kept inside a subordinate clause. Ungrammatical English. |
| missing `if` | **3** | `I'm not sure you were able to finish` — grammatical English, but it does not render the Hindi's `या नहीं` ("or not"). A **translation-fidelity** defect, not a grammar one; graded separately at #335's prompting. |
| stray `or not` tag | **1** | s290 p5 `he knows the answer or not?` |
| known/target mismatch | **1** | s644 p8 — Hindi says `एक बार और` ("once more"), English says `for a little longer` |

The reading list that started this job named ~20 rows in 7 seeds. **Six of the sixteen seeds
carrying this defect — 290, 512, 525, 559, 572 and the whole of 570 — it never named**, and one seed
it did name (492) is a false positive.

**The finding that decides the shape of the fix:** the grammatically-correct rewrite of these
sentences is **not producible by the learner at that point in the course — 0 of 50 in the
embedded-inversion sub-class, measured, not assumed.** Every one fails the course-builder's own
LEGO-containment check, and 45 of 50 also fail its whole-chunk vocabulary DP gate. This is not a typo class. It is one systematic authoring error
with a curriculum question underneath it, and that question is escalated to Kai below.

| | |
|---|---|
| Rows read and confirmed as the defect | **55** across 16 seeds (290, 512, 525, 559, 569, 570, 572, 631, 642, 644, 652, 657, 659, 664, 666, 667) |
| Rows rejected as false positives | **8** in sweep 1 (all seed 262 — genuine main-clause questions), **94 of 98** in the naive form of sweep 2, **39 of 40** in sweep 4 |
| False-positive rate of my own scanners | sweep 1 **14.5%**; naive sweep 2 **96%**; sweep 4 **97.5%** — see §9 |
| Extra rows found beyond the ~20 in the reading list | **+35**, in seeds the reading list never named (290, 512, 525, 559, 572) |
| Rows in the reading list that were false positives | **1** (seed 492 — see §9) |
| In-place corrections producible, embedded-inversion sub-class | **0 of 50** (measured with `checkVocabViolations` + containment) |
| In-place corrections producible, missing-`if` sub-class | **3 of 3** — `if` is a taught chunk |
| Proposed replacement rows authored and gated | **55**, one per defective row |
| Proposed rows passing every gate | **55 of 55** |
| Validator failing seeds — before | **46** |
| Validator failing seeds — after (simulated) | **46**, and 0 seeds changed in any issue detail against a same-moment control |
| Phrases that lose tileability | **0** |
| English clips needing re-recording | **2** — both on one row, s290 p5 (target1 + target2). The other 53 rows have no English audio at all. |
| Hindi known-side clips that would go stale | **2** (s290 p5, s570 p2) |
| Audio generated | **none** |

---

## 1. What the defect actually is

It is not 55 independent bugs. It is one error repeated across sixteen late seeds.

In eleven of these seeds the new LEGO is cited as a **main-clause interrogative** — and correctly
so, because the seed sentence itself is a question:

| seed | LEGO (Hindi → English) | seed sentence |
|---|---|---|
| 631 | `आप क्या लेना चाहेंगे` → `what would you like` | What would you like? |
| 642 | `आप कैसा महसूस कर रही हैं` → `how do you feel` | How do you feel madam? |
| 657 | `आप सब कैसा महसूस कर रहे हैं` → `how do you all feel` | How do you all feel? |
| 664 | `क्या आप सब तैयार हैं` → `are you all ready` | Are you all ready? |
| 667 | `आप सबको आपत्ति तो नहीं है` → `do you all mind` | Do you all mind? |

The USE phrases then drop that chunk verbatim under a matrix verb — `I don't know ___`,
`can you tell me ___`, `it doesn't matter ___` — and English does not permit that. English requires
the clause to switch to statement order, and for a yes/no clause to acquire a complementiser.

(The other five — 290, 512, 525, 559, 572 — are the same collision reached from a different angle:
a matrix frame like `I'm afraid` or `I think that` swallowing a main-clause question whole.)

**Hindi does not.** `आप क्या लेना चाहेंगे` is the same string in `आप क्या लेना चाहेंगे?` and in
`मुझे नहीं पता कि आप क्या लेना चाहेंगे।` The Hindi chunk is invariant under embedding; its English
counterpart is not. The generator concatenated the chunk and produced wrong English, and every gate
in the builder waved it through because the phrase tiles the taught chunk *exactly*. **All 55 rows
currently PASS the validator** — not one of the 16 seeds is in the 46-seed failing set. The gates
check tileability, not English grammar, and this defect is invisible to them by construction.

## 2. Why the obvious fix is not available — measured

I wrote the grammatically-correct version of all 47 rows in the first sweep and ran the course-builder's own target-side
gates against the vocabulary available at each seed (`checkVocabViolations`, whole-chunk DP, plus
the LEGO-containment check from `POST /v2/validate`). Per-row output: `inplace-producibility.json`.

**0 of 47 pass. 47 of 47 fail containment. 42 of 47 also fail the vocabulary gate.**

The six rows found by the later sweeps (§9) split cleanly along the sub-class boundary. The three
that are embedded inversion fail exactly the same way — `I think that you can hold the door open`
(unknown: `can hold the door open`), `I think that you have found a friend` (`have found a friend`),
`I'm afraid you have forgotten what happens` (`have forgotten what happens`), all containment=false.
That takes the sub-class total to **0 of 50 producible, 50 of 50 failing containment**. The three
missing-`if` rows are the opposite: all three **are** producible in place, because `if` is taught.

```
s631 p4  I don't know what would you like  ->  I don't know what you would like
         tiles=false  unknown="what you would like"  contains=false
s664 p4  can you tell me are you all ready?  ->  can you tell me if you are all ready?
         tiles=false  unknown="are all ready"       contains=false
```

The reason is the same every time: the corrected clause (`what you would like`, `how you feel`,
`if you are all ready`) is a **different chunk** from the one the course taught, and it has never
been taught anywhere. Correcting the English in place would hand the learner a sentence they have
no way to build — which R0.1 calls *worse than the original error*.

### `whether` is untaught in this course — do not use it

The brief's suggested fix `can you tell me whether you're all ready` would itself have been an
untaught-material violation. Measured across the whole course:

- `whether` appears in **0 LEGOs** and **0 seeds**.
- `if` is the taught embedding complementiser: **479 phrases across 281 seeds**, from seed 10, and
  it exists as a standalone chunk (`S0049L03` `अगर` → `if`) plus embedded in
  `I'm not sure if` (s10), `I'll ask him if` (s176), `I wonder if` (s289), `I didn't ask if` (s381).
- Declarative embedded-wh order **is** amply taught — **276 phrases across 61 seeds**, from seed 8
  (`to explain what I mean`, `I'm not sure why you are learning`, `you know what I wanted to say`).

So the learner has met the *shape*. What they have not met is the embedded form of **these ten
specific chunks**, and those chunks cannot supply both forms without breaking ZUT.

## 3. The choice, and why

Per phrase, of Kai's four options:

- **(a) fix in place** — chosen for **3 rows** (s525 p2, s525 p3, s569 p8), and note these are the
  translation-fidelity sub-class, not the ungrammatical one: all three need only an
  `if` inserted, and `if` is taught both standalone (`S0049L03` `अगर`, seed 49) and inside
  `I'm not sure if` (`S0010L03`, seed 10). Producible, gate-clean.
- **(b) rephrase to something producible teaching the same thing** — chosen for **51 rows**. Each
  embedding frame is replaced by a main-clause frame built from the same LEGO plus an adjunct chunk
  taught much earlier and already used dozens to hundreds of times elsewhere in this very course.
  The LEGO being taught is unchanged; only the frame around it moves.
- **(c) replace entirely** — chosen for **1 row** (s569 p6, an unsalvageable double-embedding).
  (s644 p8 is a known-side realignment and is counted separately.)
- **(d) escalate** — the underlying curriculum gap, §6. **No teaching unit was invented.**

### The two adjacent rows in the same family

| row | current | proposal | why |
|---|---|---|---|
| s569 p8 | `have you decided you were able to finish?` | `have you decided if you were able to finish?` | Hindi has `…या नहीं` ("or not"); the English lost its complementiser. `if` is a taught standalone chunk, so this one **is** producible in place. Gate: tiles ✓ contains ✓ |
| s644 p8 | Hindi `एक बार और` ("once more") vs English `for a little longer` | Hindi → `थोड़ा और` | Known/target mismatch, not word order. The row's **own decomposition already cites `S0276L04` `थोड़ा और` → `for a little longer`** — the known_text is out of step with its own edge map. `once more` is untaught, so aligning the Hindi to the taught chunk is the producible direction. English unchanged. |

## 4. Blast radius — measured, not assumed

**No LEGO, seed or decomposition tile is changed by this proposal.** Only phrase text moves, and a
phrase is a leaf: nothing tiles through it. The counterfactual is worth stating anyway, because
"grow the chunk" was the first thing I tested:

| LEGO | English | tiled by | outside its own seed |
|---|---|---|---|
| S0570L01 | how much are you willing to pay for your ticket | 7 phrases | 0 |
| S0631L01 | what would you like | 8 | 0 |
| S0652L01 | what do you need sir | 8 | 0 |
| S0657L01 | how do you all feel | 7 | 0 |
| S0664L01 | are you all ready | 8 | 0 |
| S0666L01 | what do you all think | 8 | 0 |
| S0667L01 | do you all mind | 8 | 0 |
| S0569L01 | have you decided | 10 | 1 |
| S0569L02 | how much you are willing to pay | 8 | 1 |

Unlike the seed-30 trap, growing these would strand almost nothing downstream — they are all late
seeds with purely local reach. **That is not why growing them is refused.** It is refused because
each seed's own sentence *is* the main-clause question, so re-citing the chunk in declarative form
would break the seed and its BUILD phrases. The seed needs both forms of one invariant Hindi chunk,
and that is the ZUT collision escalated in §6.

Every adjunct chunk introduced by the proposal is taught long before its seed and is already
attested in the course (`today` 600 uses, `at the weekend` 123, `this evening` 104, `in English` 87,
`this morning` 70, `in the office` 58, `quickly` 48, `at work` 47, `tomorrow morning` 47,
`in the pub` 45, `in a few minutes` 36, `next year` 25, `next month` 20, `about the economy` 9).

## 5. Zero-repair, measured

Offline replica of `POST /v2/validate/:courseCode` (`scripts/hin-scout/validate-sweep.cjs`), run
against production with and without the 55 proposed rows substituted in memory:

```
before:  seeds_checked=668 passed=622 failed=46   { vocab: 45, phrase_count: 18, containment: 6 }
after:   seeds_checked=668 passed=622 failed=46   { vocab: 45, phrase_count: 18, containment: 6 }
newly failing: []   newly passing: []   seeds with any changed issue detail: 0
```

**The control matters here.** My first baseline (18:08) reported `containment: 5`; the after-run
reported `containment: 6`, on seeds 355 and 385 which this proposal does not touch. That was not my
edit — it was worker #327's concurrent कल sweep moving the course underneath me. Re-running the
*unmodified* baseline at the same moment as the after-run reproduced `containment: 6` exactly, and
the same-moment before/after diff is **0 seeds changed in any issue detail**. Comparing two runs
taken minutes apart on a live course with another writer on it is not a zero-repair proof; a
same-moment control is, and that is what the numbers above are.

Additional per-row gates on all 55 proposals (`gate-results.json`): vocabulary DP ✓, LEGO
containment ✓, every cited chunk taught at or before its seed ✓, not a bare LEGO ✓, no duplicate
target inside the seed ✓, no ZUT collision against any existing known text course-wide ✓ — with the caveat, raised by #335,
that for the three in-place rows the only "collision" the checker sees is the row's own pre-edit
target, which is excluded by design rather than being a genuine cross-row conflict.
**55 of 55 pass.**

## 6. ESCALATION — a curriculum gap, for Kai to rule on

**The English embedded-question transformation is applied nowhere as a teaching unit, and sixteen
late seeds need it.**

The course teaches the declarative-embedded shape by accident of vocabulary — 276 phrases whose
chunks happen to be cited in declarative form (`what the answer is`, `how much you are willing to
pay`, `what he said`). It never teaches the *transformation*: that an English question changes shape
when it goes under `I don't know`. So a learner who has been drilled on `what would you like` has
been given no reason to think it becomes `what you would like`, and no chunk with which to say it.

Three sub-findings inside this, all needing a ruling:

**6a. Seeds 569 and 570 already disagree with each other on the same Hindi.**
`S0569L02` `आप कितना देने को तैयार हैं` → `how much you are willing to pay` (declarative).
`S0570L01` `आप अपने टिकट के लिए कितना देने को तैयार हैं` → `how much are you willing to pay for
your ticket` (inverted). One seed apart, the same Hindi verb phrase, two English shapes. 569 is the
one that got it right. Whatever is decided for the class should probably settle 570 by merging or
re-citing it — its whole USE basket (7 of 8 rows) is defective and my rephrase leaves it a thin
basket of pure time-adjunct swaps, which is weak against P9.

**6b. Six seeds hit the same wall from the other side.** 290, 512, 525, 559, 572 (and s569 p6) do
not embed under `I don't know`; they put a whole main-clause question under `I'm afraid` /
`I think that` / `I'm not sure`. Same collision, different frame — and it shows the defect is not
confined to the `I don't know ___` USE template, which is what a fix scoped to that template would
have assumed.

**6c. `S0652L01` bakes the address term into the chunk** — `आपको किस चीज़ की ज़रूरत है, सर` →
`what do you need sir`. Containment then forces every adjunct after `sir`, giving
`what do you need sir at the weekend?`. Seed 642 solves the identical problem correctly by splitting
`madam` into its own LEGO. My proposal follows the seed's own existing pattern rather than changing
the LEGO, but the LEGO is the real defect. **Not fixed here — it is a LEGO edit.**

**What I did not do:** invent a teaching unit for the embedded shape. That is Kai's call and the
brief forbids it.

**One thing worth Kai's eye even if he rules "leave it":** the three missing-`if` rows are a
different defect from the other 52. `I'm not sure you were able to finish` is perfectly good English;
it just isn't what the Hindi says. Adding `if` is right, but it is a translation-fidelity call, not a
grammar one, and he may want it graded differently from the fifty ungrammatical rows.

## 7. Why nothing was applied

`docs/course-methodology-canon.md` R0.3, and the "What is Kai's call, not an agent's" table, are
explicit: *"Rewrites and deletions of phrases (report, don't apply silently — R0.3)."* 51 of the 55
rows are rewrites. The four that are plain grammar or known/target corrections (s525 p2, s525 p3,
s569 p8, s644 p8) are ours by the same table, but applying 4 of 55 leaves the course in a mixed
state and gains a live learner nothing while the other 51 wait on the same ruling.

So: everything is authored, gated and frozen, and one flag applies it.

## 8. The proposed rows

Current English in every row is the wrong text now live. `tiles` names the chunks the corrected
sentence is built from, each taught at or before its seed.

| seed | pos | role | defect | fix | current English (WRONG) | proposed English | proposed Hindi cue | tiles |
|---|---|---|---|---|---|---|---|---|
| 290 | 5 | build | or-not-tag | replace | he knows the answer or not? | **he knows the answer today** | आज उसे जवाब पता है। | S0290L01 + S0007L01 |
| 512 | 4 | use | embedded-inversion | replace | I think that can you hold the door open | **can you hold the door open this morning?** | आज सुबह क्या आप दरवाज़ा खुला रख सकते हैं? | S0512L01 + S0039L02 |
| 525 | 2 | build | missing-if | inplace | I'm not sure you were able to finish | **I'm not sure if you were able to finish** | मुझे यकीन नहीं है कि आप पूरा कर पाए या नहीं। | S0010L03 + S0525L02 |
| 525 | 3 | build | missing-if | inplace | I didn't know you were able to finish | **I didn't know if you were able to finish** | मुझे नहीं पता था कि आप पूरा कर पाए या नहीं। | S0375L02 + S0049L03 + S0525L02 |
| 559 | 4 | use | embedded-inversion | replace | I think that have you found a friend | **have you found a friend in the office?** | क्या आपको ऑफ़िस में एक दोस्त मिल गया? | S0559L01 + S0265L01 + S0184L02 |
| 569 | 6 | use | embedded-inversion | replace | I don't know have you decided what happens | **have you decided what the answer is?** | क्या आपने फ़ैसला कर लिया है कि जवाब क्या है? | S0569L01 + S0017L03 |
| 569 | 8 | use | missing-if | inplace | have you decided you were able to finish? | **have you decided if you were able to finish?** | क्या आपने फ़ैसला कर लिया है कि आप पूरा कर पाए या नहीं? | S0569L01 + S0049L03 + S0525L02 |
| 570 | 1 | build | embedded-inversion | replace | can you tell me how much are you willing to pay for your ticket? | **how much are you willing to pay for your ticket today?** | आज आप अपने टिकट के लिए कितना देने को तैयार हैं? | S0570L01 + S0007L01 |
| 570 | 2 | build | embedded-inversion | replace | I don't know how much are you willing to pay for your ticket | **how much are you willing to pay for your ticket this evening?** | आज शाम आप अपने टिकट के लिए कितना देने को तैयार हैं? | S0570L01 + S0018L03 |
| 570 | 4 | use | embedded-inversion | replace | do you know how much are you willing to pay for your ticket? | **how much are you willing to pay for your ticket next month?** | अगले महीने आप अपने टिकट के लिए कितना देने को तैयार हैं? | S0570L01 + S0157L03 |
| 570 | 5 | use | embedded-inversion | replace | I didn't know how much are you willing to pay for your ticket | **how much are you willing to pay for your ticket next year?** | अगले साल आप अपने टिकट के लिए कितना देने को तैयार हैं? | S0570L01 + S0176L01 |
| 570 | 6 | use | embedded-inversion | replace | it doesn't matter how much are you willing to pay for your ticket | **how much are you willing to pay for your ticket at the weekend?** | सप्ताहांत में आप अपने टिकट के लिए कितना देने को तैयार हैं? | S0570L01 + S0214L02 |
| 570 | 7 | use | embedded-inversion | replace | nobody was sure how much are you willing to pay for your ticket | **how much are you willing to pay for your ticket in a few minutes?** | कुछ मिनटों में आप अपने टिकट के लिए कितना देने को तैयार हैं? | S0570L01 + S0253L02 |
| 570 | 8 | use | embedded-inversion | replace | have you decided how much are you willing to pay for your ticket? | **how much are you willing to pay for your ticket tomorrow morning?** | कल सुबह आप अपने टिकट के लिए कितना देने को तैयार हैं? | S0570L01 + S0155L04 |
| 572 | 8 | use | embedded-inversion | replace | I'm afraid have you forgotten what happens | **have you forgotten what the answer is?** | क्या आप भूल गए कि जवाब क्या है? | S0572L01 + S0017L03 |
| 631 | 4 | use | embedded-inversion | replace | I don't know what would you like | **what would you like this evening?** | आज शाम आप क्या लेना चाहेंगे? | S0631L01 + S0018L03 |
| 631 | 5 | use | embedded-inversion | replace | can you tell me what would you like? | **what would you like at the weekend?** | सप्ताहांत में आप क्या लेना चाहेंगे? | S0631L01 + S0214L02 |
| 631 | 6 | use | embedded-inversion | replace | I didn't know what would you like | **what would you like tomorrow morning?** | कल सुबह आप क्या लेना चाहेंगे? | S0631L01 + S0155L04 |
| 631 | 7 | use | embedded-inversion | replace | it doesn't matter what would you like | **what would you like in the pub?** | पब में आप क्या लेना चाहेंगे? | S0631L01 + S0118L03 |
| 631 | 8 | use | embedded-inversion | replace | do you know what would you like? | **what would you like in a few minutes?** | कुछ मिनटों में आप क्या लेना चाहेंगे? | S0631L01 + S0253L02 |
| 642 | 4 | use | embedded-inversion | replace | I don't know how do you feel | **how do you feel this morning?** | आज सुबह आप कैसा महसूस कर रही हैं? | S0642L01 + S0039L02 |
| 642 | 5 | use | embedded-inversion | replace | can you tell me how do you feel? | **how do you feel at the weekend?** | सप्ताहांत में आप कैसा महसूस कर रही हैं? | S0642L01 + S0214L02 |
| 642 | 7 | use | embedded-inversion | replace | I didn't know how do you feel | **how do you feel at work?** | काम पर आप कैसा महसूस कर रही हैं? | S0642L01 + S0185L02 |
| 642 | 8 | use | embedded-inversion | replace | it doesn't matter how do you feel | **how do you feel today?** | आज आप कैसा महसूस कर रही हैं? | S0642L01 + S0007L01 |
| 644 | 6 | use | embedded-inversion | replace | I don't know could you say that | **could you say that in English?** | अंग्रेज़ी में क्या आप वह कह सकते हैं? | S0644L01 + S0004L03 |
| 644 | 8 | use | known-target-mismatch | known-fix | could you say that for a little longer? | **could you say that for a little longer?** | थोड़ा और क्या आप वह कह सकते हैं? | S0644L01 + S0276L04 |
| 652 | 3 | build | embedded-inversion | replace | I don't know what do you need sir | **what do you need sir this evening?** | आज शाम आपको किस चीज़ की ज़रूरत है, सर? | S0652L01 + S0018L03 |
| 652 | 4 | use | embedded-inversion | replace | can you tell me what do you need sir? | **what do you need sir at the weekend?** | सप्ताहांत में आपको किस चीज़ की ज़रूरत है, सर? | S0652L01 + S0214L02 |
| 652 | 5 | use | embedded-inversion | replace | I didn't know what do you need sir | **what do you need sir tomorrow morning?** | कल सुबह आपको किस चीज़ की ज़रूरत है, सर? | S0652L01 + S0155L04 |
| 652 | 6 | use | embedded-inversion | replace | it doesn't matter what do you need sir | **what do you need sir in the office?** | ऑफ़िस में आपको किस चीज़ की ज़रूरत है, सर? | S0652L01 + S0184L02 |
| 652 | 7 | use | embedded-inversion | replace | do you know what do you need sir? | **what do you need sir today?** | आज आपको किस चीज़ की ज़रूरत है, सर? | S0652L01 + S0007L01 |
| 657 | 3 | build | embedded-inversion | replace | I don't know how do you all feel | **how do you all feel this morning?** | आज सुबह आप सब कैसा महसूस कर रहे हैं? | S0657L01 + S0039L02 |
| 657 | 4 | use | embedded-inversion | replace | can you tell me how do you all feel? | **how do you all feel at the weekend?** | सप्ताहांत में आप सब कैसा महसूस कर रहे हैं? | S0657L01 + S0214L02 |
| 657 | 5 | use | embedded-inversion | replace | I didn't know how do you all feel | **how do you all feel at work?** | काम पर आप सब कैसा महसूस कर रहे हैं? | S0657L01 + S0185L02 |
| 657 | 7 | use | embedded-inversion | replace | it doesn't matter how do you all feel | **how do you all feel today?** | आज आप सब कैसा महसूस कर रहे हैं? | S0657L01 + S0007L01 |
| 657 | 8 | use | embedded-inversion | replace | do you know how do you all feel? | **how do you all feel in the office?** | ऑफ़िस में आप सब कैसा महसूस कर रहे हैं? | S0657L01 + S0184L02 |
| 659 | 4 | use | embedded-inversion | replace | I don't know could you all say that | **could you all say that in English?** | अंग्रेज़ी में क्या आप सब यह कह सकते हैं? | S0659L01 + S0004L03 |
| 659 | 8 | use | embedded-inversion | replace | I didn't know could you all say that | **could you all say that quickly?** | जल्दी क्या आप सब यह कह सकते हैं? | S0659L01 + S0020L02 |
| 664 | 3 | build | embedded-inversion | replace | I don't know are you all ready | **are you all ready this morning?** | आज सुबह क्या आप सब तैयार हैं? | S0664L01 + S0039L02 |
| 664 | 4 | use | embedded-inversion | replace | can you tell me are you all ready? | **are you all ready at the weekend?** | सप्ताहांत में क्या आप सब तैयार हैं? | S0664L01 + S0214L02 |
| 664 | 6 | use | embedded-inversion | replace | I didn't know are you all ready | **are you all ready tomorrow morning?** | कल सुबह क्या आप सब तैयार हैं? | S0664L01 + S0155L04 |
| 664 | 8 | use | embedded-inversion | replace | it doesn't matter are you all ready | **are you all ready today?** | आज क्या आप सब तैयार हैं? | S0664L01 + S0007L01 |
| 666 | 2 | build | embedded-inversion | replace | I don't know what do you all think | **what do you all think this evening?** | आज शाम आप सब क्या सोचते हैं? | S0666L01 + S0018L03 |
| 666 | 3 | build | embedded-inversion | replace | can you tell me what do you all think? | **what do you all think at the weekend?** | सप्ताहांत में आप सब क्या सोचते हैं? | S0666L01 + S0214L02 |
| 666 | 4 | use | embedded-inversion | replace | do you know what do you all think? | **what do you all think about the economy?** | अर्थव्यवस्था के बारे में आप सब क्या सोचते हैं? | S0666L01 + S0343L02 |
| 666 | 5 | use | embedded-inversion | replace | I didn't know what do you all think | **what do you all think in the pub?** | पब में आप सब क्या सोचते हैं? | S0666L01 + S0118L03 |
| 666 | 6 | use | embedded-inversion | replace | it doesn't matter what do you all think | **what do you all think today?** | आज आप सब क्या सोचते हैं? | S0666L01 + S0007L01 |
| 666 | 7 | use | embedded-inversion | replace | we were talking about what do you all think | **what do you all think tomorrow morning?** | कल सुबह आप सब क्या सोचते हैं? | S0666L01 + S0155L04 |
| 666 | 8 | use | embedded-inversion | replace | nobody was sure what do you all think | **what do you all think at work?** | काम पर आप सब क्या सोचते हैं? | S0666L01 + S0185L02 |
| 667 | 2 | build | embedded-inversion | replace | I don't know do you all mind | **do you all mind this evening?** | आज शाम आप सबको आपत्ति तो नहीं है? | S0667L01 + S0018L03 |
| 667 | 3 | build | embedded-inversion | replace | can you tell me do you all mind? | **do you all mind at the weekend?** | सप्ताहांत में आप सबको आपत्ति तो नहीं है? | S0667L01 + S0214L02 |
| 667 | 4 | use | embedded-inversion | replace | do you know do you all mind? | **do you all mind tomorrow morning?** | कल सुबह आप सबको आपत्ति तो नहीं है? | S0667L01 + S0155L04 |
| 667 | 5 | use | embedded-inversion | replace | I didn't know do you all mind | **do you all mind today?** | आज आप सबको आपत्ति तो नहीं है? | S0667L01 + S0007L01 |
| 667 | 6 | use | embedded-inversion | replace | it doesn't matter do you all mind | **do you all mind in the office?** | ऑफ़िस में आप सबको आपत्ति तो नहीं है? | S0667L01 + S0184L02 |
| 667 | 8 | use | embedded-inversion | replace | nobody was sure do you all mind | **do you all mind in a few minutes?** | कुछ मिनटों में आप सबको आपत्ति तो नहीं है? | S0667L01 + S0253L02 |

## 9. Coverage, and the false positives — reported explicitly

Three independent detector shapes were run over the whole course, not one.

**Sweep 1 — non-initial wh/auxiliary inversion after a subordinating trigger.** 1,103 phrases
carried a trigger followed by a wh-word or auxiliary; classified mechanically into inverted /
bare-auxiliary / clean; the 47 in the first two buckets were read individually against their Hindi
cue. A second, deliberately more permissive pass over the 1,056 "clean" rows (allowing a noun-phrase
subject, and an auxiliary up to three tokens after the wh-word) returned **157 hits and 0 new
defects** — all were correct embedded questions where the wh-word is itself the subject
(`what the answer is`, `what was going to happen`, `how old he is`). That is the strongest evidence
available that the clean bucket really is clean.

**Sweep 2 — missing `if`/`whether`.** Rows whose Hindi carries a yes/no embedding marker
(`या नहीं`, `कि क्या`) while the English has neither `if` nor `whether`. The naive version returned
98 rows and was **almost entirely a tokenisation artifact** — `या नहीं` matches inside
`समस्या नहीं` ("no problem"), and `कि क्या` is usually `कि` + `क्या` = "that what". Requiring a word
boundary and no wh-word in the English cut it to **4 genuine rows**, plus 1 found by the `or not`
filter: **s512 p4, s525 p2, s525 p3, s559 p4, s290 p5**. None was in the reading list.

**Sweep 3 — complementiser followed by an inverted clause** (`that`/`because`/`while`/`so that` +
aux + subject). Returned exactly **2 rows**, both already caught by sweep 2 (s512 p4, s559 p4). **Sweep 4 — any non-initial, unlicensed `auxiliary + subject-pronoun` anywhere in the sentence**,
excluding only positions after a wh-word (sweep 1's territory) or after a coordinator that licenses
a following main clause (`so`, `and`, `but`, `then`). This is the broadest shape and the one that
needs no guess about which verbs introduce a clause. 63 hits, 23 already in the proposal, and of the
remaining 40 exactly **one** was a real defect: **s572 p8 `I'm afraid have you forgotten what
happens`**. The other 39 are correct English — `how many people do you know who like speaking?`,
`how high do you want to climb?`, `how long have you been learning this`, `whatever it is, I don't
want it`.

**Sweep 4 exists because the adversarial verifier #335 found s572 p8 and I had not.** Three of my
sweeps missed it for three different reasons, and all three are instructive: sweep 1's trigger list
did not contain `afraid`; sweep 3 required an explicit complementiser and this row omits `that`;
sweep 2 excluded any row whose English carried a wh-word, and this one carries `what`. Each filter
was a reasonable narrowing and each one was wrong. Sweep 4 drops all of them, costs a 97.5%
false-positive rate, and is the only one of the four I would now trust on its own.

With sweep 4 run, the class is closed across four shapes.

### False positives

**My own scanner:** 55 candidates in sweep 1, 8 rejected → **14.5% false-positive rate.** All 8 are
seed 262 (`so who was that man?`, `and who was that man you were talking to yesterday?`) — they match
"wh + was + subject" but the wh-word *is* the subject and the clause is a main-clause question.
Rejected on reading, not on a rule. Sweep 2's naive form was worse: **94 of 98 were artifacts**,
a 96% false-positive rate, and is recorded here because a sweep that had stopped at the naive form
would have reported a 98-row defect that does not exist.

**The 2026-09-03 reading list:** 7 seeds named, of which **seed 492 is a false positive.**
`can you tell me which of those places do you think is the most interesting?` is correct English —
`do you think` is a parenthetical inside the embedded clause, not inversion of it. Not touched.

### What was NOT checked — the honest limit

The 1,056 rows classified clean in sweep 1 were read *mechanically*, twice, not by a human eye one
by one. Everything outside the three detector shapes above — English defects of a different kind on
these same seeds — was not looked for at all.

## 10. Reproducing

Scratch tooling for this pass lives in this directory as frozen JSON:
`flagged-rows.json` (all 55 defective rows, each tagged with its sub-class),
`inplace-producibility.json` (**the sweep-1 artifact only** — the 0-of-47 measurement over the first
47 rows; the three later inversion rows are measured inline in §2 and not in this file),
`proposed-rows.json` (the 55 proposals), `gate-results.json` (per-row gate verdicts).
The validator replica is `scripts/hin-scout/validate-sweep.cjs` (pre-existing, unmodified).

## 11. Audio

Nothing generated, nothing queued to render. **2 English clips need re-recording**, both on the
same row — s290 p5 carries a `target1_audio_id` and a `target2_audio_id`, and it is the only one of
the 55 that carries any English audio at all. Two Hindi known-side clips would go stale
(s290 p5 and s570 p2, `f3233c4b-263b-4b06-927d-caf1944691d6`). The course is all-xAI and xAI is
retired, so nothing here is renderable today in any case; on a real apply the pass ends by queueing
an audio request (O8), never by rendering.
