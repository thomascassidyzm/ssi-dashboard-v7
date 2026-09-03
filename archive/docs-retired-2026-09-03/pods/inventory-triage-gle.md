# Pod-LEGO inventory triage — gle_for_eng (pod-0)

> Review of all 43 `needs_review` units from the `pod-lego-extractor.cjs` dry run
> (531 units total, 142 sentences). Machine-readable resolutions:
> `inventory-triage-resolutions.json`. Doctrine applied, in priority order:
> ZUT ≥ understandable > minimal-vocab > maximal-pattern > naturalness;
> literal nuance → note (never a competing gloss); particles glue; fixed
> expressions stay whole; the canonical mapping must hold in **every** occurrence.
>
> Every flag was a ZUT-alternates flag (no "no gloss captured", no flagged
> identity units — hence zero passthrough verdicts). The big Irish theme: the
> language routes *have/hope/hunger/yes* through **be + preposition** and
> **echo-answers**, so chunk-level English renderings inevitably wobble. The
> fix throughout is the literal canonical (at me / at you / at us) + one
> first-encounter note carrying the construction — not per-sentence gloss drift.

## Summary

| verdict | count |
|---|---|
| keep-as-is | 21 |
| remap | 13 |
| needs-note | 5 |
| split | 4 |
| merge-into / passthrough | 0 |
| **total** | **43** |

**TOM-CALL items (source-text questions, not gloss questions — every unit got a
resolution regardless):**

1. **SC06-S004 / SC06-S012 "(ba) bhreá liom(sa) a bheith i do dhíol"** for
   "pleased/lovely to meet you" — *i do dhíol* looks like broken Irish (expected
   e.g. *deas bualadh leat*). Needs a native check; both near-duplicate units
   currently carry the decorated gloss "a fixed way to say 'pleased to meet you'".
2. **SC10-S005 / SC10-S006 "scéim ghréine"** for "sunscreen" — *scéim* = scheme;
   expected *grianscéith / uachtar gréine*. Verify.
3. **SC07-S011 "An féadfainn…?" / SC14-S001 "An féadfá…?"** — eclipsis missing
   (standard *An bhféadfainn / An bhféadfá*, which the corpus also uses). The
   variant spellings create duplicate inventory units ("could I": an-bhféadfainn
   + an-féadfainn; "could you": an-bhféadfá + an-féadfá). Fix the text or accept
   both forms?

## keep-as-is (21)

| unit | target ↔ known | rationale |
|---|---|---|
| feicfidh-mé | feicfidh mé ↔ I will see | "I'll see" = contraction drift |
| duit | duit ↔ for you | "to you" same preposition *do*; "for you" holds in all 4 |
| ba-mhaith-liom | ba mhaith liom ↔ I'd like | "I would like" = contraction drift |
| an-féidir-linn | an féidir linn ↔ can we | literal "is it possible for us" dies; partitions vs an bhféadfaimis = "could we" |
| freisin | freisin ↔ too | also/as well/too pure synonyms; one canonical |
| agus-tusa | agus tusa ↔ and you? | alternate differs only by punctuation |
| é-sin | é sin ↔ that | "that is" folded the copula in |
| tá-sé | tá sé ↔ it is | "it's" = contraction drift |
| le | le ↔ with | "to" (1 occ) is the *réidh le* + verbal-noun junction |
| an-bhféadfainn | an bhféadfainn ↔ could I | "politely" decoration stripped |
| a-fháil | a fháil ↔ to get | "to have" readings are English service-register drift; *faigh* = get |
| ar-fad | ar fad ↔ altogether | "completely" = intensity drift; "altogether" holds in all 4 |
| ceann | ceann ↔ one | "one (item)" was decoration |
| seo-é | seo é ↔ here it is | "here is" drift on "Seo é mo phas" (lit. 'here it-is my passport') |
| an-bhféadfaimis | an bhféadfaimis ↔ could we | "can we" drift; partitions vs an féidir linn |
| agaibh | agaibh ↔ at you (plural) | already literal; completes the at-paradigm |
| ceart-go-leor | ceart go leor ↔ alright | spelling variant only |
| go-bhfuil | go bhfuil ↔ that ... are | 3/4 are "go bhfuil tú"; elliptical "Sílim go bhfuil" reads acceptably |
| bhí-tú | bhí tú ↔ you have been | contraction drift |
| a-dhéanamh | a dhéanamh ↔ to do | "have a conversation/check-out" is English idiom for the same déan |
| ag-caint | ag caint ↔ talking | "speaking" drift; partitions vs labhairt = "speak" |

## remap (13)

| unit | new canonical (target ↔ known) | rationale |
|---|---|---|
| an-bhfuil | an bhfuil ↔ **is...?** (+note) | 8 alternates collapse to "question-form of be"; have-readings come from the *agat* junction; partitions vs tá = "is" |
| agam | agam ↔ **at me** (+note) | "I have" fails "Beidh an t-uan agam" (I'LL have) and "curtha in áirithe agam"; literal holds in all 4 |
| agat | agat ↔ **at you** (+note) | 6 alternates; literal holds in all 11; paradigm: at me / at you / at us / at you (plural) |
| níl | níl ↔ **no** (+note) | "no, it's not" fails "Níl, tá brón orm…"; note: Irish answers 'no' by negating the verb |
| caife | caife ↔ **coffee** | bare noun holds standalone and in "caife dubh" |
| labhairt | labhairt ↔ **speak** | bare VN after féidir/mian; partitions vs ag caint = "talking" |
| dom | dom ↔ **to me** (+note) | "my" was the name-idiom rendering; note: is ainm dom = lit. 'is a name to me' |
| mé | mé ↔ **me** | bare mé here is copula-final or object; subject uses live inside tá mé / níl mé units |
| an-bhfuil-tú | an bhfuil tú ↔ **are you** | "do you" was the rendering of "are you wanting" (ag iarraidh junction) |
| atá | atá ↔ **that is** | relative form of tá; "are" fails "Is tú atá go cineálta" |
| againn | againn ↔ **at us** (+note) | paradigm consistency; note carries "tá X againn = we have X" |
| go-dtí | go dtí ↔ **to** | core "to/toward" holds in all 4 (spatial + "from half seven to ten"); "until" fails spatial uses |
| bíonn-sé | bíonn sé ↔ **it tends to be** (+note) | preserves the habitual; "it is" erases it and collides with tá sé |

## needs-note (5) — canonical confirmed, alternate/literal becomes a first-encounter note

| unit | canonical | note |
|---|---|---|
| go-raibh-maith-agat | go raibh maith agat ↔ thank you | a fixed expression — literally 'may there be good at you' |
| seo | seo ↔ this | sentence-initial Seo X (lit. 'this [is] X') = 'here is X' |
| dia-duit | dia duit ↔ hello | literally 'God to you' — the standard Irish greeting |
| oíche-mhaith | oíche mhaith ↔ good evening | covers both the evening greeting and the parting 'good night' (no single English rendering holds; splitting one fixed expression would be worse) |
| is-as | is as ↔ is from | Is as X mé = 'I'm from X' — lit. 'is from X me'; the person comes last |

## split (4) — one surface, two real units

| unit | primary | secondary | basis |
|---|---|---|---|
| tá | tá ↔ is (the verb) | `tá-yes` ↔ yes (it is) — standalone echo-answer | 11 verb vs 7 answer occurrences; "yes (it is)" keeps ZUT against sea = "yes" and bhí = "yes" |
| ansin | ansin ↔ then (temporal) | `ansin-place` ↔ there (spatial) | "síos ansin" = down there; neither gloss holds for the other |
| díreach | díreach ↔ right (intensifier) | `díreach-straight` ↔ straight (motion) | a single gloss risks "go right" being heard as a turn |
| sin | sin ↔ that's (presentational Sin X) | `sin-det` ↔ that (postposed determiner; prefer glue: "an séipéal sin" = "that church") | determiner is glue per the particle rule |

## Residual known-side collisions accepted (documented, not fudged)

- `sea` = "yes" and `bhí` = "yes" (both unflagged) — the Irish echo-answer
  system genuinely multiplies "yes"; my `tá-yes` deliberately took
  "yes (it is)" instead of joining the pile. Recommend (next pass, unflagged):
  `bhí` → "yes (it was/did)".
- `atá-tú` (unflagged) = "are you" now shares with `an-bhfuil-tú` — recommend
  aligning `atá-tú` with the atá family ("that you are" after conas).
- `ann` (unflagged) = "there" shares with `ansin-place` — *ann* is the
  existential particle and per the particle rule should likely glue anyway.
- `é-sin` = "that" / `sin-det` = "that" — interim: sin-det is glue-recommended;
  the collision dissolves once re-tiling glues it to its noun.
