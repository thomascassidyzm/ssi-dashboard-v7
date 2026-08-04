# Breton (`bre_for_eng`) — Opus handoff brief

**Status:** Seeds 1–10 are locked — grammatically verified against Meurgorf, Arbres (CNRS), and Bretania; all draft defects (V2 violations, soñjal-for-remember, klevout-for-mean, `eur`, `da klask`, `ober komz`, `stank`) are fixed, plus one ZUT unification (remember → `kaout soñj eus` in both 6 and 10). Fable-with-web-grounding was sufficient for grammar; **an 8-question native-speaker pass is still required before ship** (see Native-check section). Biggest ongoing risk for seeds 11+: plausible French-calque or English-calque lexis that is grammatical but wrong in meaning (the soñjal/klevout/stank class), and silent V2/mutation drift — both are invisible to a reviewer who doesn't know Breton, so follow the contracts below mechanically.

## Orthography

**Standard: Peurunvan (unified Breton orthography, 1941 standard), exactly as used on `br.wikipedia.org`.** When in doubt about a spelling, copy br.wikipedia / Meurgorf (the Ofis Publik ar Brezhoneg dictionary at `meurgorf.brezhoneg.bzh`); do not accept forms from older texts or Gwalarn-era spellings.

Hard rules:
- Articles are **ur / un / ul** (indefinite) and **ar / an / al** (definite). Pre-1941 **`eur` is a hard reject** — it will look plausible in older sources.
- Verbal-nouns end in **-añ / -iñ / -out** (`strivañ`, `deskiñ`, `fellout`, `lavarout`). Never `-a`, `-i` bare-stem spellings from other orthographies.
- The digraph is **c'h with apostrophe** (`c'hallan`, `ganeoc'h`) — `ch` and `c'h` are different sounds and different letters; dropping the apostrophe is a spelling error, not a variant.
- Situational verb forms **emaon / emañ / emaomp…** with progressive `o` (`emaon o klask`), spelled as one word with initial e-.
- **zh** where Peurunvan uses it (`brezhoneg`, `frazenn`) — this is the signature of the standard; `z`-only or `h`-only spellings mark other orthographies (falhuneg/skolveurieg) and are rejects.

## Core grammar the builder needs

### Word order (V2) — the #1 structural rule
An **affirmative main clause can NEVER begin with a finite verb.** Something must precede it. The two workhorse strategies in this course:

| Strategy | Pattern | Example |
|---|---|---|
| VN-fronting | verbal-noun + `a` + conjugated `ober` | `komz a ran` = I speak (lit. "speaking [PRT] I-do") |
| Impersonal want-frame | `fellout a ra din` + bare VN complement | `fellout a ra din komz…` = I want to speak… |
| Situational/progressive | `emaon o` + VN | `emaon o klask deskiñ` = I'm trying to learn |

**Negatives are the exception:** `ne/n' … ket` clauses ARE verb-initial and that is correct (`n'on ket sur…`). Do not "fix" a negative into a fronted structure.

With an **explicit subject fronted, the verb stays 3sg** (`me a gomz`, not `me a gomzan`) — relevant the moment seeds introduce overt subjects.

### Conjugated forms actually in use (seeds 1–10)
| Form | Meaning | Frame |
|---|---|---|
| `a ran` | I do (aux) | after fronted VN |
| `a ra din` | it does to-me | inside `fellout a ra din` |
| `emaon` | I am (situational) | before progressive `o` |
| `c'hallan` | I can | after `ma`/`e` (mixed mutation of `gallan`) |
| `galler` | one can (impersonal) | `ma c'haller` = as one can → "possible" |
| `fell din` | wants to-me | in relative `a fell din` |
| `n'on ket` | I am not | negative, verb-initial OK |

### Mutations (load-bearing — a missing mutation is a hard error)
| Trigger | Series | Effects used so far | Examples |
|---|---|---|---|
| `da` (to) | soft | k→g, p→b | `da glask`, `da bleustriñ` |
| particle `a` | soft | (k→g etc. when applicable) | `komz a ran` (k after nothing = no change; mutation fires on the verb after `a` when it starts with a mutable consonant) |
| progressive `o` | **mixed** | b→v, d→t, g→c'h, gw→w, m→v; **k untouched** | `o vont` (m→v), `o klask` (no change — correct!) |
| `e`, `ma` (subordinators) | mixed | g→c'h | `e c'hallan`, `ma c'haller` |
| `ur/ar` + **feminine** noun | soft | k→g | `ar gomz` (komz f.); but `ur ger` unchanged (ger m.) |

**Direction trap:** soft mutation of **k is g, NEVER c'h** (`da glask`, not `da c'hlask`). c'h arises from **g** under mixed/spirant. Also: **f does not soft-mutate** (`ar frazenn a-bezh` is correct as-is).

### Small closed-class inventory locked so far
`bremañ` = now · `un tammig` = a little · `a-bezh` = whole (postposed) · `hiziv` = today · `e brezhoneg` = in Breton · `un dra bennak` = something (fixed form; `tra` mutates after `un`) · `penaos` = how (+ bare VN for "how to X") · equative `ken/kement X ha ma` + finite = "as X as [clause]" · `hag-eñ` = whether (embedded question) · `ar pezh a` = free relative "what/the thing that".

## LOCKED DECISIONS (contracts Opus must NOT break)

ZUT: one known form → exactly one target form, course-wide. These are already spent:

- [ ] **remember** → `kaout soñj eus` (NOT `derc'hel soñj`, NOT `soñjal`). If the native check flips this to `derc'hel soñj`, it flips in BOTH seeds 6 and 10 and everywhere after — never both forms.
- [ ] **want** → `fellout a ra din` / `fell din` frame (NOT `c'hoant kaout`, NOT `me a fell…`).
- [ ] **to try (to do X)** → `klask` + bare VN (`o klask deskiñ`, `da glask displegañ`).
- [ ] **try hard / make an effort** → `strivañ` (distinct English prompt "try as hard as", so no ZUT clash with `klask`; NEVER `esaeañ` for either).
- [ ] **practise** → `pleustriñ war` + noun (NOT `ober komz` or any `ober`-calque).
- [ ] **what I mean** → `ar pezh a fell din lavarout` (NOT anything with `klevout`).
- [ ] **speak** → `komz`; **say** → `lavarout` (keep the pair distinct).
- [ ] **can** → `gallout`, stem **gall-** (`c'hallan`, `c'haller`) — never mix in `gell-` forms (`c'hellan`) even though they're attested; one stem course-wide.
- [ ] **Register: 2nd person = `c'hwi`** (`ganeoc'h`, verb in -it/-oc'h endings) — the polite/default "you", used even for one person. Every later 2nd-person item follows this until/unless the native check overturns it (question 4), in which case ALL of it flips at once.
- [ ] **whether (after not-sure/don't-know)** → `hag-eñ e` + finite (NOT conditional `ma`).
- [ ] **something** → `un dra bennak`; **now** → `bremañ`; **a little** → `un tammig`; **whole** → `a-bezh` postposed; **someone else** → `unan all` (pending native Q1).
- [ ] Orthography: pure Peurunvan; `ur/un/ul` only; house style = phrases start lowercase.

## The 10 reference seeds

| n | English | Target | Gloss | Conf |
|---|---|---|---|---|
| 1 | I want to speak Breton with you now | `fellout a ra din komz brezhoneg ganeoc'h bremañ` | want-VN PRT does to-me speak-VN Breton with-you(pl) now | high |
| 2 | I'm trying to learn | `emaon o klask deskiñ` | am-I PROG try-VN learn-VN | high |
| 3 | how to speak as often as possible | `penaos komz ken alies ha ma c'haller` | how speak-VN as often as that one-can | high |
| 4 | how to say something in Breton | `penaos lavarout un dra bennak e brezhoneg` | how say-VN a thing some in Breton | high |
| 5 | I'm going to practise speaking with someone else | `emaon o vont da bleustriñ war ar gomz gant unan all` | am-I PROG go-VN to practise-VN on the speaking with one other | med |
| 6 | I'm trying to remember a word | `emaon o klask kaout soñj eus ur ger` | am-I PROG try-VN have-VN memory of a word | high |
| 7 | I want to try as hard as I can today | `fellout a ra din strivañ kement ha ma c'hallan hiziv` | want-VN PRT does to-me strive-VN as-much as that I-can today | med |
| 8 | I'm going to try to explain what I mean | `emaon o vont da glask displegañ ar pezh a fell din lavarout` | am-I PROG go-VN to try-VN explain-VN the-thing PRT wants to-me say-VN | high |
| 9 | I speak a little Breton now | `komz a ran un tammig brezhoneg bremañ` | speak-VN PRT do-I a little Breton now | high |
| 10 | I'm not sure if I can remember the whole sentence | `n'on ket sur hag-eñ e c'hallan kaout soñj eus ar frazenn a-bezh` | NEG-am not sure whether PRT I-can have-VN memory of the sentence whole | high |

Rule-carrying notes: seed 1's exact frame is attested in Meurgorf ("Fellout a ra din debriñ krampouezh" — bare VN complement, **no `da`**). Seed 3/7 share the attested `kement/ken … ha ma c'hall-` frame. Seed 10's verb-initial opening is legal **only because it's negative**. Seeds 5 and 7 are medium purely on lexical idiomaticity (native Q1/Q2), not grammar.

## Worked decompositions

Rule of thumb: **particles (`a`, `e`, `o`, `ma`) and the mutations they fire live INSIDE a chunk.** Never cut a LEGO boundary between a particle and its verb, or between a mutation trigger and the mutated word.

**Seed 1** — `fellout a ra din komz brezhoneg ganeoc'h bremañ`
| Known atom | Target atom | Sealed? |
|---|---|---|
| I want | `fellout a ra din` | SEALED — VN + particle + aux + `din` are one grammatical unit; splitting exposes bare `a ra` which is meaningless alone |
| to speak | `komz` | open (bare VN, no `da` — the frame licenses it) |
| Breton | `brezhoneg` | open |
| with you | `ganeoc'h` | open (inflected preposition = one word) |
| now | `bremañ` | open |

**Seed 8** — `emaon o vont da glask displegañ ar pezh a fell din lavarout`
| Known atom | Target atom | Sealed? |
|---|---|---|
| I'm going | `emaon o vont` | SEALED — situational `emaon` + progressive `o` + mixed mutation mont→vont; splitting `o` from `vont` orphans the mutation |
| to try | `da glask` | SEALED — `da` + soft mutation klask→glask travel together |
| to explain | `displegañ` | open (bare VN after klask) |
| what I mean | `ar pezh a fell din lavarout` | SEALED as one chunk at debut (free relative with internal particle `a`); may later decompose into `ar pezh a` + `fell din` + `lavarout` once each piece has debuted, but the `a fell` join stays uncut |

**Seed 10** — `n'on ket sur hag-eñ e c'hallan kaout soñj eus ar frazenn a-bezh`
| Known atom | Target atom | Sealed? |
|---|---|---|
| I'm not sure | `n'on ket sur` | SEALED — negative circumfix `n'…ket` wraps the verb; verb-initial is legal here ONLY because negative |
| if/whether I can | `hag-eñ e c'hallan` | SEALED — `hag-eñ` demands `e` + finite, and `e` fires g→c'h; three interlocking pieces |
| remember | `kaout soñj eus` | SEALED — multiword lexeme incl. its preposition `eus`; never strand `eus` |
| the sentence | `ar frazenn` | open (f- doesn't mutate) |
| whole | `a-bezh` | open (postposed adjective-phrase) |

## Gotchas

1. **V2:** affirmative main clause never opens with a finite verb — front the VN (`komz a ran`) or use `fellout a ra din` / `emaon o…`. Negatives (`ne/n'… ket`) are correctly verb-initial; don't "fix" them.
2. **Mutations are grammar, not decoration.** `da` → soft; `o` → mixed (b/d/g/gw/m only — `o klask` correctly unmutated); `a` → soft; `e`/`ma` → mixed (`e c'hallan`, `ma c'haller`); `ur/ar` → soft on **feminine** nouns only (`ar gomz` yes, `ur ger` no).
3. **Soft of k is g, never c'h:** `da glask` ✓, `da c'hlask` ✗. c'h comes from **g** (mixed/spirant). Reviewers reliably confuse the directions.
4. **False-friend calques (worst error class):** `soñjal` = think (remember = `kaout soñj eus`); `klevout` = hear ("what I mean" = `ar pezh a fell din lavarout`); `stank` = dense/frequent, not effort-hard (use `strivañ`/`kement ha ma`); `ober komz` ≠ practise (use `pleustriñ war`). These were all in the original draft — expect the same class again.
5. **Orthography:** pure Peurunvan only. `eur` = hard reject; VNs in -añ/-iñ/-out; apostrophe in `c'h`; `emaon/emañ` with progressive `o`.
6. **Embedded whether** after "not sure / don't know" = `hag-eñ e` + finite. Conditional `ma` ("if") there is a meaning error.
7. **gallout stems:** `gall-` and `gell-` both exist; this course uses **gall-** (`c'hallan/c'haller`) exclusively — never mix.
8. **ZUT on multiword lexemes:** `kaout soñj eus` won over `derc'hel soñj`; `fellout` over `c'hoant kaout`; `klask` vs `strivañ` split is legal only because the English prompts differ ("trying to X" vs "try as hard as"). Watch for the same twin-trap on any new abstract verb.
9. **Register:** course default is `c'hwi`/`ganeoc'h` (polite/plural, French-vous-like even for one person). Every future 2nd-person form must match until native Q4 rules.
10. **Chunks are sealed through their particles:** `fellout a ra din`, `emaon o klask`, `emaon o vont da`, `kaout soñj eus`, `ken/kement … ha ma` — never place a LEGO boundary through `a`/`e`/`o`/`ma` or between a trigger and its mutated word.
11. **Explicit subject → 3sg verb** (`me a gomz`, not `*me a gomzan`). Not yet exercised in seeds 1–10 but will bite the first time a seed has an overt subject.

## Native-check questions

1. **Seed 5:** is `pleustriñ war ar gomz` natural for "practise speaking", or prefer `pleustriñ war ar brezhoneg` / `war gomz brezhoneg`? And `gant unan all` vs `gant un den all` for "with someone else"?
2. **Seed 7:** does `strivañ kement ha ma c'hallan` sound like real speech for "try as hard as I can", or is `ober ma seizh gwellañ` / `poaniañ kement ha ma c'hallan` the natural utterance?
3. **Seeds 6/10:** is `kaout soñj eus` fine for both "remember a word" and "remember the whole sentence" (retention), or is `derc'hel soñj eus` required for the latter? Pick ONE for the whole course.
4. **Register:** for a friendly adult learner course, `ganit` (te) or `ganeoc'h` (c'hwi-as-default)? Locks all 2nd-person material.
5. **gallout stem:** `c'hallan/c'haller` or `c'hellan/c'heller` for a KLT-leaning standard course?
6. **Seed 10:** is `n'on ket sur` acceptable or a French calque — would `ne ouzon ket re` or another frame be more native for "I'm not sure"?
7. **Seed 3:** `ken alies ha ma c'haller` vs `ken alies ha posupl` vs `an aliesañ ar gwellañ` for "as often as possible"?
8. **Seed 1:** is the bare complement `komz brezhoneg ganeoc'h bremañ` complete and naturally ordered after `fellout a ra din`, or would a native reorder/insert?
9. *(new)* When seeds introduce overt-subject sentences: confirm the course should teach the `me a` + 3sg pattern (rather than `me zo/eo` frames) as the default subject-fronting device.
10. *(new)* Future/past auxiliaries loom in seeds 11+ ("I'll try", "I said"): confirm preferred future of `ober` in the fronted frame (`komz a rin`) and the default past strategy (situational `edon o` vs perfect with `am eus + -et`) before Opus builds either.

## Instructions to Opus for continuing (seeds 11+)

1. **Reuse before invent.** Every new seed: first scan the locked chunk inventory (`fellout a ra din`, `emaon o klask`, `emaon o vont da`, `komz a ran`-style fronting, `kaout soñj eus`, `ken/kement … ha ma`, `hag-eñ e`, `penaos` + VN, `ar pezh a fell din lavarout`). If a new English seed contains "want / trying / going to / remember / whether / as X as / how to / what I mean", the target rendering is already decided — copy it verbatim, including mutations.
2. **Mechanical checklist per new sentence, in order:** (a) affirmative? then confirm it does NOT start with a finite verb; (b) walk every `da/a/e/o/ma/ur/ar` and apply its mutation series from the table; (c) check no rejected twin slipped in (soñjal, klevout, esaeañ, c'hoant, derc'hel, gell-, eur, stank, ober-calques); (d) confirm spelling against Peurunvan (zh, c'h, -añ/-iñ/-out).
3. **Verify against sources, not intuition.** For any new verb or frame, find it in Meurgorf (meurgorf.brezhoneg.bzh) or an Arbres page before using it. If you can find the exact frame attested (as with `fellout a ra din + VN` and `kement ha ma c'hall-`), mark confidence high. If you can only find the word but not the construction, mark **medium** and add a native-check question.
4. **When to flag vs guess:** Grammar (V2, mutations, particle choice) — never guess; the rules above are complete enough to derive it. Lexis for concrete vocabulary — Meurgorf lookup is reliable. **Idiomatic renderings of English abstractions** ("get used to", "manage to", "it depends", "I'd rather") — this is where Breton sources are thin and French calques masquerade as Breton: do NOT invent; produce the best compositional candidate, mark medium/low confidence, and append it to the native-check list. A flagged deferral is cheap; a shipped calque poisons every downstream phrase.
5. **ZUT bookkeeping:** keep a running one-known→one-target ledger starting from the LOCKED DECISIONS checklist. Before assigning any English word/phrase a Breton form, check the ledger; before introducing a Breton form, check no other English known already maps to it. When two Breton candidates exist (the derc'hel/kaout pattern), pick the more decomposable/attested one, record the rejected twin explicitly, and never let both appear.
6. **Decomposition:** copy the worked-decomposition pattern above — sealed chunks contain their particles and mutations; a LEGO boundary may never separate `o` from `vont`, `da` from `glask`, `hag-eñ` from `e c'hallan`, or `soñj` from `eus`. First-debut of a complex chunk goes in sealed; later splitting is allowed only at joins that leave both halves grammatical and already-debuted.
7. **Do not resolve the open native questions yourself.** Especially register (Q4) and gallout stem (Q5): the seeds are internally consistent as-is (`ganeoc'h`, `gall-`); build forward on those defaults, and if the native check flips one, apply the flip as a single course-wide sweep — never a per-seed mixture.