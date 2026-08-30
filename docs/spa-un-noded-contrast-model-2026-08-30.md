# The Spanish census, re-tested against contrast: 2,869 becomes 199

*30 August 2026 — measurement and diagnosis only. Nothing changed: no course data, no audio, no validator.*

## The one line

**Today the checker asks "was this exact word ever handed over as a taught unit of its own?" It should ask "has the learner been given enough to work this out?" — and a contrast between two things they already have is one of the strongest ways of giving it.**

## Tom was right, and the model reproduces his example unprompted

I built a contrast-recoverability model without hard-coding anything about `con`. It looks for three kinds of contrast among the chunks a learner has already been given, and in every case the English side has to corroborate — the two chunks must share a contentful English word and differ elsewhere, so an accidental Spanish string overlap cannot manufacture a false acquisition.

Asked where `con` becomes available, the model answers **seed 15, from the pair `contigo` / `conmigo`**. That is exactly the mechanism Tom named, arrived at independently. `contigo` — "with you" — arrives at seed 1. `conmigo` — "with me" — at seed 15. Shared Spanish `con`, shared English "with", the rest shifts. The learner extracts it. The census dated `con` to seed 333.

**Of the 481 phrases the census says `con` spoils, 481 sit after seed 15. Every single one. The count for `con` goes to zero.**

For `más` there is no fused pair; it is carried by subtraction instead. The learner is given *más tarde* ("later on") at seed 16 and then `tarde` on its own; the difference isolates `más` at **seed 35**. Of its 449 phrases, **423 clear and 26 remain** — the 26 sitting in seeds 23 to 34, genuinely ahead of the contrast. Tom said he suspected the same thing for `más` without knowing the route; that is right in substance, and the residue is 26 phrases rather than 449.

I checked for the contrast sets he suggested. `demás` exists, in *con todos los demás*; `ademas` does not appear in the course at all; bare unaccented `mas` does not appear either. The route that actually does the work is the subtraction pair, not the comparative family.

## The whole top ten, on the same test

| material | census count | still offending | acquired by |
|---|---|---|---|
| `con` | 481 | **0** | fused pair *contigo* / *conmigo*, seed 15 |
| `más` | 449 | **26** | *más tarde* minus *tarde*, seed 35 |
| `me` | 190 | **0** | *me gustaría* / *me gusta* held constant, seed 26 |
| `la` | 163 | **0** | *la semana* minus *semana*, seed 52 |
| `quiere` | 133 | **0** | *él quiere* / *ella quiere*, seed 17 |
| `entender` | 67 | **0** | *a entender* minus *a*, seed 74 |
| `te` | 76 | 73 | contrast only at seed 237 |
| `empezar` | 121 | 94 | contrast only at seed 252 |
| `de` | 237 | 235 | contrast only at seed 153 |
| `todo` | 175 | 175 | no contrast; standalone only at seed 412 |

Six of the ten go to zero or near it. The four that survive survive for a reason worth reading on: they are not words the learner has never seen. `de` sits inside **131 different taught chunks** and the learner has met it in a median of **20 distinct frames** before any of its 235 offending phrases — it is simply never isolated by a clean minimal pair, because prepositions rarely find one. `te` has met eleven frames. That is a limit of the contrast rules, not evidence of a hole, and I have counted it separately rather than quietly folding it in.

## The ladder of numbers

Each step is a different question, and I have kept them apart so you can stop wherever you think the honest line is.

| what is being asked | phrases | share |
|---|---|---|
| the census as published | 2,869 | 18.9% |
| same rule, with a fair matcher instead of a greedy one | 2,801 | 18.4% |
| **material not acquirable by direct instruction or contrast** | **1,331** | **8.8%** |
| also crediting words met inside three or more distinct earlier frames | 815 | 5.4% |
| **hard core: no instruction, no contrast, no exposure of any kind** | **199** | **1.3%** |

**Contrast alone clears 1,470 of the 2,801.** Loosening the contrast rules further barely moves it — a broader frame-substitution rule changes 1,331 to 1,312 — so 1,331 is a solid floor for what contrast can do, not a number that depends on how generous I felt.

## The residue, honestly

**199 phrases, 88 distinct words.** These are phrases where every un-noded word has never appeared in any taught chunk, in any form, at any earlier point — no direct teaching, no contrast, no exposure. This is the number I would act on and the only one I would spend money on.

The biggest single item is `nosotros`, 50 phrases. Then `tú` (15), `siempre` (9), `esto` (7), `sobre` (7), `ya` (5), `mucha` (5). A long tail of one-offs after that: `dame`, `vaya`, `funciona`, `cansada`, `podemos`, `dijeron`. Several are clitic attachments on verbs the course does teach in another shape — `hacerlo`, `guardarlo`, `explicarlo`, `decirlo` — which may be a separate and cheaper question than genuinely missing vocabulary.

Real examples, so it is concrete: at seed 27 the learner is asked for *"Quiero tiempo para contestar en español"* when `tiempo` has appeared nowhere; at seed 51, *"Disfruto haciendo esto aquí"* with `esto` unmet; at seed 42, *"Estaba empezando a explicarlo anoche"*.

199 of 15,205 is 1.3%. The census's headline was 18.9% and its "real content hole" was 2,394.

## What the checker gets wrong, precisely

Its model of acquisition has exactly one route in it: *was this string ever delivered whole, as its own unit?* That model cannot represent the thing the method actually relies on. It has no notion that two things already given can hand over a third thing that was never given. So it reads the strongest teaching move in the method — minimal-pair contrast, the reason `contigo` and `conmigo` are both in the course — as an absence.

Concretely, three faults, none of them repaired:

1. **No contrast route at all.** It should index, for every word, the earliest point at which a contrast among already-introduced chunks isolates it: a fused pair sharing a prefix or suffix, two chunks differing in exactly one slot, or one chunk that is another with a single token removed. Availability is then the earliest of direct instruction and contrast extraction. Requiring the English side to corroborate keeps this honest — without it, *decir* and *descubrir* "teach" a spurious `de`.
2. **The index of words that occur only inside multi-word chunks carries no date and is consulted last**, so a word standing in taught Spanish since seed 5 is reported as first appearing at seed 333.
3. **Greedy longest-match tiling** gives up too early and manufactures 68 phantom offenders; a maximum-coverage tiling costs nothing and removes them.

With the contrast route added, the top ten empties and the number people should be arguing about is 199, not 2,869.

## Gaps, stated

- No direct SQL client on this machine, so the course was read through the same database client the census used. Shared data source; independent logic, independent index, independent tiling.
- The contrast model is deliberately conservative and requires English-side corroboration. It will therefore **under**-credit acquisition, not over-credit it. The 1,331 figure is a ceiling on the defect, and the four survivors in the top ten are the visible evidence of that under-crediting.
- Distributional exposure is offered as a separate line, not folded into the answer, because "met it in twenty frames" is a weaker claim than "was shown a contrast that isolates it" and Tom has not ruled on it.
- The 199 hard-core phrases were not individually triaged. Some are clitic forms of taught verbs rather than missing vocabulary, so 199 is itself a ceiling.
- `spa_for_eng` only. The mechanism is generic and I would expect the same distortion in every course, but that is an expectation, not a measurement.
