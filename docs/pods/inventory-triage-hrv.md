# Pod-LEGO inventory triage — hrv_for_eng (pod-0)

> Review of all 57 `needs_review` units from the `pod-lego-extractor.cjs` dry run
> (533 units total, 142 sentences). Machine-readable resolutions:
> `inventory-triage-resolutions.json`. Doctrine applied, in priority order:
> ZUT ≥ understandable > minimal-vocab > maximal-pattern > naturalness;
> literal nuance → note (never a competing gloss); particles glue; identity
> chunks → passthrough; the canonical mapping must hold in **every** occurrence.
>
> Every flag in this course was a ZUT-alternates flag (no "no gloss captured"
> flags, no flagged name/identity units — hence zero passthrough verdicts).
> Every remap/split below was re-walked against all of its occurrence sentences;
> two split-glosses were overturned in self-verify for colliding with unflagged
> canonicals (`i-also`: "also"→"as well" vs `također`; `odmah-spatial`:
> "just"→"right" vs `samo`).

## Summary

| verdict | count |
|---|---|
| keep-as-is | 17 |
| remap | 29 |
| needs-note | 6 |
| split | 5 |
| merge-into / passthrough | 0 |
| **total** | **57** |

**TOM-CALL items (source-text questions, not gloss questions — every unit got a
resolution regardless):**

1. **SC11-S001 "Dobro podne"** — non-standard Croatian; the normal daytime
   greeting is *Dobar dan*. Re-author the line, or keep deliberately?
2. **SC08-S001 "Dobar večer"** — *večer* is feminine: should be *Dobra večer*
   (SC05-S001 has it right). Fix the line?
3. **SC07-S005 "Želiš li da ostaneš ili da ponese?"** — *da ponese* (3sg) looks
   wrong for "sit-in or takeaway"; the corpus itself uses *za ponijeti*
   elsewhere. Re-author?
4. **SC14-S004 "ako ne budemo imali smole na semaforima"** — *imati smole* for
   "be unlucky" needs a native-speaker check (*peh*/*sreće*?).

## keep-as-is (17)

| unit | target ↔ known | rationale |
|---|---|---|
| donijeti | donijeti ↔ bring | "bring it" (1) folded in an English-required object |
| možemo-li | možemo li ↔ can we | "could we" is English politeness drift on the same form |
| ja-sam | ja sam ↔ I am | "I'm" = contraction drift |
| to | to ↔ that | "it" = rendering drift; "that" understandable in both |
| malo | malo ↔ a little | holds in all 5 (slower/cider/bread/while/frustrating) |
| želiš-li | želiš li ↔ do you want | "would you like" = politeness drift |
| mogu-li | mogu li ↔ can I | "could I" drift; collision with `mogu` cleared by its remap |
| vode | vode ↔ water | bare noun; "of" lives on the container unit (čašu/bocu) |
| vidjeti | vidjeti ↔ see | all occurrences after a modal; bare verb composes |
| vinsku-kartu | vinsku kartu ↔ wine list | "the" = article drift |
| s-lijeve-strane | s lijeve strane ↔ on the left | "on your left" = rendering drift |
| trebam | trebam ↔ I need | "should I" was the question-rendering of "do I need to" |
| bili-ste | bili ste ↔ you have been | alternate was the same gloss + "— politely" decoration |
| mi | mi ↔ to me | dative clitic; "to me" holds in both |
| glavobolju | glavobolju ↔ a headache | holds in both ("for a headache" fine) |
| ima | ima ↔ there's | "there is" = contraction drift; distinct from ima li |
| možda | možda ↔ maybe | "perhaps" pure synonym; one canonical |

## remap (29)

| unit | new canonical (target ↔ known) | rationale |
|---|---|---|
| je-li | je li ↔ **is...?** | question form of *je*; partitions against je = "is"; "is it that" was decorated |
| izvolite | izvolite ↔ **here you go** (+note) | 4 glosses, one service-word; matches unflagged informal `izvoli` (accepted T/V gloss-share) |
| mogu | mogu ↔ **I can** | was glossed 3 ways incl. both orders for the identical sentence; frees "can I" for mogu li (fixes live ZUT collision) |
| želim | želim ↔ **I want** | `željela-bih` already owns "I'd like" (verified) — ZUT outranks politeness-naturalness |
| kavu | kavu ↔ **coffee** | only gloss that holds standalone and inside "crnu kavu" |
| puno | puno ↔ **a lot** | "thanks a lot" + "a lot of traffic" — holds everywhere |
| doviđenja | doviđenja ↔ **goodbye** (+note) | literal "until seeing" was baked into the gloss; moved to note |
| oprosti | oprosti ↔ **sorry** | holds in both; partitions T/V: oprostite keeps "excuse me" (3-way collision → 2-way) |
| drago-mi-je | drago mi je ↔ **I'm pleased** (+note) | "pleased to meet you" fails in "drago mi je što smo se upoznali" |
| to-je | to je ↔ **that's** | holds in all 3; "it's" fails two |
| malu | malu ↔ **small** | "regular" was barista-English from one rendering |
| mogu-li-dobiti | mogu li dobiti ↔ **can I get** | composes with mogu li = "can I" + dobiti = "get" |
| još | još ↔ **another** (+note) | holds in both; avoids više = "more" collision; s#35 glosses had još/nešto crossed |
| nešto | nešto ↔ **something** | "else" was the crossed gloss (belongs to još in "još nešto") |
| dobiti | dobiti ↔ **get** | both occurrences after modals; matches "can I get" |
| čašu | čašu ↔ **a glass of** | every occurrence precedes a genitive; matches unflagged čaše = "glasses of" |
| piva | piva ↔ **beer** | one surface = gen.sg "of beer" + nom.pl "beers"; bare noun is the only survivor |
| vina | vina ↔ **wine** | same case/number argument as piva |
| možete | možete ↔ **you can** | decoration stripped; register lives in the imate-li note |
| evo | evo ↔ **here's** | neither "here are" nor "here is" holds in both; "here's" covers menus + passport |
| bez-glutena | bez glutena ↔ **gluten-free** (+note) | both known texts say it; literal "without gluten" → note |
| kupiti | kupiti ↔ **buy** | only form composing after both trebam and mogu |
| od-velike-pomoći | od velike pomoći ↔ **very helpful** (+note) | both known texts render it so; literal in note |
| vježbati | vježbati ↔ **practise** | three spellings/forms; bare UK form matches corpus majority |
| podne | podne ↔ **midday** (+note) | "afternoon" was the greeting's rendering; see TOM-CALL 1 |
| odlično | odlično ↔ **wonderful** | holds in all 3; avoids existing "excellent" (odličan/izvrsna) and "lovely" (divan/divna) collisions |
| soba | soba ↔ **room** | only gloss holding the apposition "soba sedam nula devet" |
| možete-li | možete li ↔ **can you** | completes the can-paradigm: I can / can I / can we / you can / can you |
| točno | točno ↔ **exactly** | "right" fails "exactly the kind of practice" |

## needs-note (6) — canonical confirmed, alternate becomes a first-encounter note

| unit | canonical | note |
|---|---|---|
| dobro | dobro ↔ good | dobro is also the adverb 'well' — govoriš dobro = you speak well |
| dan | dan ↔ day | Dobar dan (lit. 'good day') is the standard daytime greeting — English 'good afternoon' |
| molim | molim ↔ please | molim is literally 'I ask' — the all-purpose Croatian 'please' |
| imate-li | imate li ↔ do you have | the -te ending (imate, možete…) is the polite/plural 'you' — used to strangers throughout these scenes |
| ima-li | ima li ↔ is there | ima li is literally 'has it / is there' — with a subject it asks 'does X have' |
| protiv-bolova | protiv bolova ↔ for pain | literally 'against pain' — lijekovi protiv bolova = painkillers |

## split (5) — one surface, two real units

| unit | primary | secondary | basis |
|---|---|---|---|
| da | da ↔ yes (answer) | `da-conj` ↔ that (complementizer; prefer glue to following clause) | homograph: 10 answer vs 4 complementizer occurrences |
| ne | ne ↔ no (answer) | `ne-neg` ↔ not (verbal negator; prefer glue: "ne budemo" = "we won't be") | answer-word vs negation particle |
| što | što ↔ what (question) | `što-conj` ↔ that (after feeling-words; prefer glue) | interrogative vs complementizer |
| i | i ↔ and (conjunction) | `i-also` ↔ as well (additive particle) | "as well" not "also" — ZUT vs također = "also" |
| odmah | odmah ↔ right away (temporal) | `odmah-spatial` ↔ right (intensifier; prefer glue: "odmah iza ugla" = "right round the corner") | "right" not "just" — ZUT vs samo = "just" |

## Residual known-side collisions accepted (documented, not fudged)

- `izvolite`/`izvoli` both "here you go" — formal/informal pair of one word;
  the corpus convention already shares glosses across T/V pairs
  (govorite/govoriš = "you speak").
- `malu`/`malom` both "small" — inflectional variants of one adjective; the
  corpus shares glosses across inflection corpus-wide (dva/dvije, bijelo/bijelog).
- `da-conj`/`što-conj`/`to` all "that" — interim: the two complementizers are
  glue-recommended particles; once re-tiling glues them the collision dissolves.
- `mjesta`/`soba` both "room" (unflagged `mjesta` = room-for-dessert sense) —
  recommend `mjesta` → "space" when unflagged units get a pass.
