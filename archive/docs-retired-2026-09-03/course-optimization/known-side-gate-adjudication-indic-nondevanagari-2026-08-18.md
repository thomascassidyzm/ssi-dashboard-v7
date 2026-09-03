# Known-side gate v2 — adjudication, Indic non-Devanagari (ben/guj/pan/sin/urd)

*2026-08-18. Adjudicates a sample of `services/course-builder/lib/known-side-gate-v2.cjs`'s output
for the five Indic non-Devanagari eng_for_X courses, per Kai's standing rule: never hand over a raw
hit count as a finding. Method, evidence and code cited throughout; a plain gap statement at the
end for what could not be judged.*

## Headline

The raw sweep reports 1,634–1,810 "violation rows" per course (see table below). **The true rate is
far lower — my best estimate is 2–11% of what the gate calls high-confidence, and effectively 0% of
what it calls borderline (NPI).** The gap is not random noise; it is **two specific, nameable code
defects** that recur identically across all five courses, plus a handful of missing free-class
entries per language. Fixing the two code defects would eliminate the large majority of both
buckets without touching a single seed of course content.

## The two root-cause bugs (this is the actionable part)

### Bug 1 — every contract ships `stemStrip: []` (absent), so E2 (inflection) almost never fires

`services/course-builder/lib/known-side-gate-v2.cjs` only forgives an inflected form via
`resolveByStemStrip(tok, ctx.inventory, c.stemStrip, ...)` — and none of the five contracts define
a `stemStrip` array at all (`grep -n stemStrip docs/pair-contracts/eng_for_{ben,guj,pan,sin,urd}.contract.cjs`
returns nothing). Two of the five briefs **document the exact suffixes needed, in prose, in their
own header comment**, and never transcribed them into the field the gate reads:

- `eng_for_guj` header: *"the stem_strip list is offered as a crude aid (infinitive/oblique
  -વા/-વું/-વી, imperfective -તો/-તી/-તું/-તા, perfective -્યો/-્યું/-્યા, postpositional
  -માં/-ને/-થી/-નો/-ની/-નું)"* — never written into `module.exports.stemStrip`.
- `eng_for_sin` header: *"Sinhala verb endings (-නවා/-න්න/-න්නේ/-ලා/-ද) strip cleanly"* — same gap.
- `eng_for_pan` header says stem_strip is **deliberately** empty (agreement is portmanteau, not
  concatenative) — a real design call, but it leaves the identical practical hole: content verbs
  like ਕਰ ('do'), ਜਾਣ ('know'), ਸੋਚ ('think') get every person/tense form flagged as new vocabulary.
- `eng_for_ben`/`eng_for_urd` don't even discuss a candidate list.

Even where a stem does share a literal prefix with an earlier-taught form, the *fallback* path
(`stemPrefixHit`/`anyStemInside` in `known-side-script.cjs`) only checks literal character-prefix
truncation against the **inventory of exact attested surface forms** — and Indo-Aryan verb stems
routinely change vowel between forms (Bengali শোনা 'to hear' ~ শুনতে 'to hear-INF'; পারা 'can' ~
পেরে 'having been able'). A crude character-count strip cannot see across that, so genuinely
resolvable inflections still fall through to `UNCHECKED(morphology_unresolved)` or, worse, straight
past it to `VIOLATION` when the surface *inflected* form happens to already be attested (later) in
the inventory — see Bug-1-consequence below.

**Bug 1's specific consequence** (this is why so much lands in `not_introduced_until` rather than
`unchecked`): the exact-match branch (`ctx.inventory.get(tok)`) runs **before** any stem-based
check. If the literal inflected string happens to appear *somewhere* in the course (even in an
unrelated later seed), the gate reports `not_introduced_until` at high confidence and never asks
whether an *earlier* form of the same lemma was already taught. Example, `eng_for_ben`, verified
directly against the loaded inventory:

```
করা  (do, bare)      → taught seed 5
চাই  (want, 1sg)      → taught seed 1
করতে (do-infinitive)  → taught seed 44  ← exact string's own first seed
```

`করতে` used at seed 40 in `"এই মুহূর্তে কিছু জিজ্ঞেস করতে চাই"` ("I want to ask something at the
moment") is flagged `not_introduced_until` — but করা has been known since seed 5 and চাই since
seed 1; করতে is simply the infinitive of a verb the learner has had for 35+ seeds. This pattern
(চাই/চান/চায়, করি/করো/করেন/করব/করেছিলে/করুক/করেনি, once/other person-forms of যাওয়া/হওয়া/থাকা/পারা/
শোনা/লেখা) accounted for **53 of 55 sampled Bengali "high" rows**, and the identical shape recurs in
every other course (Gujarati বોલવું/ઇચ્છ-/જોવ- forms, Punjabi ਜਾਣ-/ਕਰ-/ਸੋਚ- forms, Sinhala
දැනෙ-/වෙ-/ය-/කර- forms, Urdu چاہ-/بول-/کر- forms).

### Bug 2 — `isNegated()` implements 2 of the ~9 licensing environments every brief documents

Every one of the five briefs' `npiLicensing.licensedIn` lists 6–11 environments where an NPI is
licensed *without* clausal negation: desiderative/want, ability/potential modal, necessity modal,
conditionals, comparatives, restrictive/scalar focus (also/even/only particles), free-choice `-ই`/
`પણ`/`ਵੀ` suffixes, temporal before/until. `isNegated()` (known-side-gate-v2.cjs:127) checks only:

```js
for (const n of c.negation) if (n && norm.includes(n)) return true;
if (/[?？؟]/.test(text)) return true;   // literal question-mark character
return false;
```

— the explicit negation-word list, and a literal `?`/`？`/`؟` character in the **known-side** text
(most of these languages mark questions with a bound particle, not always a `?` glyph). It has no
knowledge of want/ability/conditional/comparative/scalar licensing at all. Concretely, Gujarati's
own brief states *"કોઈ પણ... yields the 'any whatsoever' reading independent of negation"* — yet
`isNegated` has no `પણ` check, so every `કોઈ પણ` (anyone-at-all) instance in a positive clause is
flagged, contradicting the brief that ships alongside the gate.

**A second, structural half of Bug 2**: `checkKnownSideV2(known, currentPos, ctx)` never receives
the English **target** gloss. Every brief's `npiLicensing.rule` explicitly says the *same* bare NPI
token is the **free, always-permitted** positive-indefinite reading ("someone/something/somewhere")
outside licensing, and only the "anyone/anything/anywhere" reading needs a licensor — but the gate
can't tell which reading is intended without the target, so it flags the bare NPI token every time
regardless of which English word it renders. In my Bengali sample, target-gloss reading alone
(`some-`/`still`/`already` vs `any-`/`ever`) accounted for **12 of 20** borderline flags; of the
remaining 8, licensing-word co-occurrence in the known text (চাই/পার-/desiderative-or-ability
context the brief explicitly licenses) accounted for another 3.

## Per-course numbers

Sample: for each course I regenerated the **full, uncapped** findings (the cached `/tmp/sweep-31.json`
row list is capped at 400 and seed-ordered, so I re-ran `checkKnownSideV2` myself over every lego +
phrase via a scratch script, `scripts/adj-indic/full-sweep.cjs`, reusing the real gate/inventory
code unmodified). From the full list I sampled 55 high-confidence and up to 20 borderline rows per
course with a seeded shuffle (`scripts/adj-indic/full-sweep.cjs`'s `mulberry32`), spread across the
whole seed range, then adjudicated using inventory cross-checks (does a form of the same lemma
appear taught at an earlier seed, allowing for vowel-alternating stems) plus each brief's own
free-class/NPI-licensing text.

| course | rows checked | pass | machine HIGH | machine BORDERLINE | unchecked (morphology) |
|---|--:|--:|--:|--:|--:|
| eng_for_ben | 13,799 | 10,956 | 1,605 | 30 | 1,209 |
| eng_for_guj | 15,393 | 13,399 | 1,228 | 107 | 663 |
| eng_for_pan | 13,910 | 12,893 | 613 | 63 | 342 |
| eng_for_sin | 13,019 | 11,292 | 1,048 | 68 | 612 |
| eng_for_urd | 12,426 | 11,282 | 661 | 3 | 482 |

(Small deltas from the cached `/tmp/sweep-31.json` totals — e.g. ben 1,810 vs 1,605 — are the capped
sample's `findingsTruncated` interacting with a `.slice(0,400)`-then-recount artifact upstream; the
counts above are from my own uncapped re-run and are the ones the sample percentages below apply to.)

### HIGH-confidence bucket — adjudicated

| course | sampled | auto-confirmed inflection FP¹ | manually reviewed | of those: TRUE | of those: FALSE-POS (missing freeClass/pronoun-variant) | of those: gap |
|---|--:|--:|--:|--:|--:|--:|
| eng_for_ben | 55 rows / 64 hit-tokens | 59 | 5 | **2** | 3 | 0 |
| eng_for_guj | 55 rows / 57 hit-tokens | 50 | 7 | **1** | 5 | 1 |
| eng_for_pan | 55 rows / 60 hit-tokens | 57 | 3 | **2** | 1 | 0 |
| eng_for_sin | 55 rows / 67 hit-tokens | 61 | 6 | **2** | 3 | 1 (spelling variant, out-of-scope) |
| eng_for_urd | 55 rows / 57 hit-tokens | 48 | 9 | **6** | 3 | 0 |

¹ "auto-confirmed inflection FP" = a hit-token where an earlier-taught inventory entry shares ≥50%
of its characters (plain or vowel-diacritic-stripped) with the flagged token — verified by spot
manual check (courtesy of the করা/চাই/থাকা/হওয়া/যাওয়া/পারা/শোনা family cross-checks above and their
equivalents in the other four languages) to be genuinely the same lemma, not a coincidental match.
This is a **lower bound** on false positives — several of the "manually reviewed" FALSE-POS rows
above (এবং, এওঁ, ওুণা, ইতা, তব-family, اپنی/اپنے) were inflections/variants the crude character
heuristic missed too, so they're counted as reviewed, not auto.

**Extrapolated true-violation rate, HIGH bucket**: 2/55 (ben, 3.6%), 1/55 (guj, 1.8%), 2/55 (pan,
3.6%), 2/55 (sin, 3.6%), 6/55 (urd, 10.9%). Pooled: **13/275 sampled rows ≈ 4.7%**, i.e. roughly
**95% of what the gate calls "high-confidence violation" in this bucket is not a real content-vocab
gap** once inflection and missing-freeClass items are excluded. Confidence: **medium** — the sample
is randomised and reasonably sized (55/course), but I do not have native fluency in any of these
five languages; my calls rest on inventory-based morphological evidence (does a related surface
form exist earlier — very reliable) and reading the contract's own documented exemptions (reliable)
rather than a native speaker's judgment of naturalness. See Gaps below.

### BORDERLINE (NPI) bucket — adjudicated

| course | machine borderline total | sampled | positive-reading exempt by brief² | missed-licensing-environment³ | residual "needs native check" |
|---|--:|--:|--:|--:|--:|
| eng_for_ben | 30 | 20 | 10 | 3 | 7⁴ |
| eng_for_guj | 107 | 20 | 7 | 9 | 4 |
| eng_for_pan | 63 | 20 | 14 | 2 | 4 |
| eng_for_sin | 68 | 20 | 2 | 5 | 13 |
| eng_for_urd | 3 | 3 | 0 | 0 | 3 |

² target gloss reads "some-/still/already/much/too" (the brief's own always-free reading), not
"any-/ever/at all" — regex `\b(some\w*|still|already|a lot|much|often|too)\b` vs `\b(any\w*|ever|at all)\b`
on the English target column, spot-checked against each brief's `npiLicensing.rule` text.
³ target reads "any-/ever" AND the known-side text contains a documented licensing-environment
marker (want/desiderative, ability modal, question particle, conditional, scalar-focus particle)
that `isNegated()` does not check.
⁴ of ben's 7 residual, 5 were bare single-word lego rows (e.g. `এখনো` alone → "yet") with no clause
to judge licensing against — I could not respectably call these either way; see Gaps.

**Extrapolated true-violation rate, BORDERLINE bucket**: **0 confirmed TRUE across all 271 machine
flags**, out of 83 sampled. Every single sampled borderline row resolved to either the brief's own
documented free reading or a licensing environment the gate fails to check. Confidence: **medium-
high** for "the vast majority are false positives" (the mechanism is a code gap, not a judgment
call, and it reproduces identically in every language); **low** for "literally zero true NPI
violations exist in these five courses" — the residual rows (31 across 5 courses) are real gaps in
my ability to judge without either native fluency or the fuller licensing-environment list wired
into a checker. I did not find a single confident TRUE npi_unlicensed row in this sample; the June
pilot found 15 across all 41,885 India prompts (~0.05%), so a low-but-nonzero rate for these five is
the credible prior.

## False-positive classes, largest first

1. **Verb-inflection false positives caused by Bug 1 (missing `stemStrip`)** — by far the largest
   class. ~90%+ of the HIGH bucket in every course. Fix: transcribe each brief's own documented
   suffix list (guj, sin already spell them out) into `module.exports.stemStrip`; for Punjabi (whose
   brief argues stemStrip should stay empty because agreement is portmanteau, not concatenative) the
   fix is different — either license high-frequency light verbs (ਕਰ-, ਜਾਣ-, ਸੋਚ-) as `knownConstructions`
   the way হবে/দরকার/উচিত already are for Bengali, or accept the false-positive rate as the tradeoff
   for not risking over-forgiveness.
2. **NPI licensing-environment gaps caused by Bug 2 (`isNegated` incompleteness + no target-gloss
   access)** — the entire BORDERLINE bucket, 271 machine flags across the 5 courses, of which my
   sample found 0 confirmed TRUE. Fix: either (a) pass the target gloss into `checkKnownSideV2` so
   the gate can read whether the English rendering is the "any-" or "some-" reading before flagging
   at all, or (b) extend `isNegated` (or a parallel `isLicensed` check) to scan for each brief's
   documented desiderative/ability/conditional/scalar-focus markers.
3. **Missing free-class entries, per language, small but real** (~3–5 items each, none costs more
   than editing one array):
   - ben: এবং (formal 'and' conjunction) missing alongside আর/বা.
   - guj: এওঁ (colloquial spelling of তেওঁ 'they') missing as a pronoun variant.
   - pan: ਜਿਸ (oblique/relativizer paradigm-mate of the already-free ਜੋ) missing.
   - sin: ওুণা (past tense of the already-free ওেনওা 'become'), ইতা ('very', a closed-class
     intensifier), তবত (a morphological variant of the already-NPI-listed তব 'more') all missing.
   - urd: تب ('then', discourse connective) missing; اپنی/اپنے (reflexive possessive 'own',
     gender/number-agreeing closed-class paradigm) missing entirely from freeClass.
4. **Pronoun/spelling variants flagged as new vocabulary** (out-of-scope, not a vocab gap): sin
   ওয়া/ওেয়া (colloquial 3rd-person, never otherwise attested in the course — likely a one-off
   authoring spelling choice, not a controlled-vocabulary violation).

## Best 10 confirmed TRUE violations

| # | course | seed | known-side prompt | target | why unresolvable |
|---|---|--:|---|---|---|
| 1 | eng_for_ben | 92 | আমি এটা করতে চাই কিছুক্ষণের জন্য | I want to do this for a while | কিছুক্ষণ ('a while') never taught before seed 155 — used here 63 seeds early; ক্ষণ ('moment') is never independently taught at all. |
| 2 | eng_for_ben | 159 | যা আমি বলছি তা আমার পক্ষে ব্যাখ্যা করা সহজ নয় | it's not easy for me to explain what I'm trying to say | পক্ষ ('side/behalf') and every inflection of it never appear anywhere else in the course inventory. |
| 3 | eng_for_guj | 92 | થોડા સમય માટે અંગ્રેજી શીખવું મહત્વનું છે | it's important to learn English for a while | મહત્વનું ('important', neuter) debuts at seed 137, used here 45 seeds early; no other gender form (મહત્વનો/મહત્વની) is taught anywhere. |
| 4 | eng_for_pan | 291 | ਮੈਨੂੰ ਉਮੀਦ ਹੈ ਕਿ ਮੈਂ ਜਲਦੀ ਬਿਹਤਰ ਬੋਲਣ ਦੇ ਯੋਗ ਹੋਵਾਂਗਾ | I hope I'll be able to speak better soon | ਯੋਗ ('capable/worthy') never appears elsewhere in the course before its own seed-379 debut. |
| 5 | eng_for_pan | 315 | ਉਹ ਇਸ ਸਾਲ ਇਸਨੂੰ ਖਰੀਦ ਨਹੀਂ ਸਕਦਾ ਸੀ | he couldn't afford it this year | bare stem ਖਰੀਦ ('buy') used 5 seeds before its own infinitive ਖਰੀਦਣਾ debuts at seed 320 — see cross-language note below. |
| 6 | eng_for_sin | 103 | ඒක නියමයි ගොඩාක් මිනිස්සු ඉගෙනගන්නවා | it is great that many people want to learn | මිනිස්සු ('people') and its singular මිනිසා never appear anywhere else in the course. |
| 7 | eng_for_sin | 161 | ඉරිදා හවස | Sunday afternoon | හවස ('evening/afternoon') never taught anywhere in the course. |
| 8 | eng_for_urd | 132 | یہ کم اہم ہے | that's less important | اہم ('important') doesn't debut until seed 277 — used here 145 seeds early. |
| 9 | eng_for_urd | 111 | ہمارا دماغ بہت اہم ہے | it's very important for our brain | same gap as #8, recurring — اہم used twice, both well before its own debut. |
| 10 | eng_for_urd | 504 / 620 | گھاس بہت لمبی ہے / ...بہت لمبا عرصہ ہو گیا ہے | the grass is very long / ...a very long time... | لمبی/لمبا ('long', fem/masc) — **neither gender form is taught anywhere in the entire course.** |

**Cross-language note**: #5 (Punjabi ਖਰੀਦ, "buy") and Urdu's parallel خریدنا ("to buy", seed 315,
same 5-seeds-early gap, same debut seed 320) show the identical pattern in two independently-built
courses. That is much more likely a shared upstream generator/template defect (per the 2026-06
findings doc's "same defect families across courses" pattern) than two unrelated one-off
translation slips — worth a targeted look at whatever produced both courses' seed ~310–320 batch.

## Gaps — stated plainly

1. **I am not a native or fluent speaker of Bengali, Gujarati, Punjabi, Sinhala, or Urdu.** My TRUE
   vs FALSE-POSITIVE calls rest on (a) direct inventory cross-checks — does a related surface form
   of the same word already appear at an earlier seed, which is mechanical and reliable — and (b)
   reading each contract's own documented exemptions and applying them. This is NOT the same as a
   native speaker's or an agent's contextual judgment of naturalness, idiom, or a subtle mis-gloss,
   which is exactly the class of thing the June 2026 pilot's agent-based check was built to catch
   and a inventory-lookup script cannot. Treat the "TRUE" counts above as a floor, and the June
   pilot's methodology (a real reasoning agent per batch) as the calibration standard if Kai wants a
   number he can fully trust.
2. **NPI borderline bucket: 31 of 83 sampled rows (ben 7, guj 4, pan 4, sin 13, urd 3) I could not
   confidently call TRUE or FALSE-POSITIVE.** Several are single-word lego rows with no clause
   structure to test licensing against (is a bare `এখনো` → "yet" lego debut a "positive declarative"
   at all?); others plausibly sit in a licensing environment I didn't have a keyword for. I did not
   find a single confident TRUE in this sample, but I also would not report "0 real NPI violations"
   as a fact — see the June pilot's 15-in-41,885 baseline for a believable low-but-nonzero rate.
3. **I did not verify every one of the ~90 "auto-confirmed inflection FP" rows individually** —
   given 5 languages × up to 60 hit-tokens each, I verified the mechanism (vowel-alternating stem
   evidence) on a representative subset per language (details in the Bengali করা/চাই/থাকা/হওয়া/
   যাওয়া/পারা/শোনা walkthrough above, which is fully reproducible) and applied the same evidence
   test uniformly; I did not hand-check all ~275 individually against a dictionary.
4. **Read-only compliance**: no seeds/legos/phrases/gate/brief/tool files were edited. Everything
   above came from ad-hoc read-only scripts in `scripts/adj-indic/` (gitignored) that import the
   real gate/inventory modules unmodified.
