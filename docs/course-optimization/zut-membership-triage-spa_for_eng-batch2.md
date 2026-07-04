# ZUT membership-failure triage — spa_for_eng, batch 2/2 (component rows), 2026-07-04

*Sub-slice of the 148-item membership-failure fix sweep described in
`zut-rescope-component-rows-2026-07-04.md` (category [2]: target-membership check for
`phrase_role:'component'` rows), following the exact methodology of
`zut-violation-sweep-pilot-fra-40.md` — every entry read against its own seed's full master
sentence (`course_seeds.target_text`) plus every sibling row at the same
`seed_number`/`lego_index`, never judged from the bare fragment alone. Read-only/dry-run: no DB
writes, no apply script run.*

## Result: 38 entries classified — 24 orphan, 11 mislabeled (false positive), 2 synonym/grammatical variant, 1 unclear

| Classification | Count | Meaning |
|---|---|---|
| **(a) orphan** | 24 | Zero relation to the seed's own sentence; a correct sibling (the seed's own build/use family) already covers the meaning, so deleting the row loses nothing |
| **(b) mislabeled component** | 11 | Genuine constituent of the seed's/LEGO's target, just not a literal substring — normalization gaps (stale seed row vs. uniform siblings, clitic fusion, elision, discontinuous clitic, pipe-annotation format, number agreement) |
| **(c) synonym/grammatical variant** | 2 | Not a defect — reflexive-pronoun agreement (infinitive `-se` form vs. seed's conjugated `-nos`/`-te` form); log only |
| **(d) unclear** | 1 | Flagged for Tom's judgment, not resolved |

### (a) Orphan — 24/38 — the majority pattern, consistent with the fra pilot's ~65–75% estimate

Every one of these 24 rows shares **zero content** with its own seed's sentence or any sibling
at that `seed_number` (beyond incidental function words like "cuando"/"mucho"/"me" that also
recur, coincidentally, in unrelated sentences elsewhere in the course). Many of them read as
modal/auxiliary-verb paradigm fragments — *used to* (he/she/they), *could*, *should*, *would*,
*I've had*, *A few months ago*, *A long time*, etc. — that look like conjugation-drill material
misfiled under an unrelated seed_number, rather than components of the sentence they're attached
to. In every case the seed's own correct `build`/`use` rows fully render the seed's actual
teaching sentence, untouched by removing these rows — no learner-facing content would be lost.

### (b) Mislabeled component (false positive) — 11/38 — five distinct normalization-gap patterns

1. **Stale/inconsistent seed row, trust the siblings** (5 rows: `S0578L01C01`, `S0488L01C01`,
   `S0580L01C02`, `S0510L01C01`, `S0426L04C01`) — `course_seeds.target_text` disagrees with a
   *uniform* LEGO + build + use family at the same seed/lego_index (different word choice —
   "sitio" vs "lugar"; contracted "al" vs "a"+"el"; "muchas veces" vs "a menudo"; dropped
   reflexive "se"; singular vs plural agreement). Per the rubric, when the seed's own row looks
   stale against a consistent sibling family, trust the siblings — these components are genuine.
2. **Clitic fusion** (2 rows: `S0241L01C01` "to give"→"dar" fused into "dárselo"; implicitly also
   the pipe-annotation rows below) — the component is the true verb stem, just concatenated with
   Spanish's enclitic pronouns in the actual sentence.
3. **Discontinuous clitic construction** (2 rows: `S0365L01C01`, `S0365L01C02`) — "ella dijo"
   and "le... a él" are both genuine constituents of "ella **le** dijo a él", just split apart
   by the clitic "le" sitting between subject and verb — Spanish's dative-clitic-doubling
   pattern, invisible to a bare substring check.
4. **Pipe-annotation convention** (3 rows: `S0466L01C01`, `S0466L02C01`, `S0500L02C01`) — the
   course uses a documented `X | Y → Z` gloss format to show morpheme-level fusion (e.g.
   `"deja | me → me"` for "déjame") or to append a citation form (e.g. `"sentarte | sit down →
   sentarse"`). This format is never a literal substring of the sentence by design — the audit's
   plain substring check can't parse it, but the content is correct.

### (c) Synonym/grammatical variant — 2/38 — reflexive-pronoun agreement, log only

`S0397L02C01` ("to prepare"→"prepararse") and `S0403L02C01` ("to stay"→"quedarse") both give the
dictionary/infinitive reflexive form, while the seed and its whole sibling family use the
conjugated `nosotros` form (`prepararnos`, `quedarnos`). Per `synonym-choice-architecture.md`
this is a legitimate grammatical variant (reflexive pronoun agreement), not a defect — no action.

### (d) Unclear — 1/38 — needs Tom's read

`S0495L01C01` ("when"→`"cuando | it → importa"`) — the first half ("when"→"cuando") is a clean
match against sibling LEGO li=1. The appended half of the pipe-annotation, `"it → importa"`,
looks like a genuine mislabeling: "importa" is the full verb form for "it matters" (sibling LEGO
li=2: "it matters"→"importa"), and impersonal "importa" has no separate word corresponding to
"it" alone. Flagging rather than resolving — can't tell from this single item whether the
course's pipe-annotation convention intentionally over-attributes the impersonal subject this
way elsewhere, or whether this is a one-off annotation bug.

## Full entry table

| id | known → target | seed known → seed target | classification | reasoning |
|---|---|---|---|---|
| `S0578L01C01` | somewhere → algún lugar | somewhere warmer → un sitio más cálido | **mislabeled** | Seed's own target_text says 'un sitio más cálido' but the LEGO ('somewhere warmer'->'algún lugar más cálido') and every build/use sibling at li=1 uniformly use 'algún lugar' — the seed row itself is stale/inconsistent with its own LEGO family; trusting the siblings, 'somewhere'->'algún lugar' is a genuine constituent. |
| `S0182L01C01` | I don't know how to → No sé cómo | have you seen my keys anywhere? → ¿Has visto mis llaves en algún sitio? | **orphan** | Zero relation to seed 182 ('have you seen my keys anywhere?') or any sibling at seed_number 182 (LEGOs: have you seen/anywhere/my keys/keys) — 'I don't know how to'/'No sé cómo' shares no content; the correct build/use family for this seed is intact and unaffected. |
| `S0122L02C01` | Since last week → Desde la semana pasada | It's starting to feel easier and I'm excited about how it's going → está empezando a sentirse más fácil y estoy emocionado con cómo va | **orphan** | Zero relation to seed 122 ('starting to feel easier...excited...how it's going') or any of its LEGOs/siblings (it is/to feel easier/excited/it goes) — 'Since last week'/'Desde la semana pasada' shares no vocabulary with this seed's family. |
| `S0118L01C01` | She used to → Ella solía | I feel better than I felt when we were in the pub → Me siento mejor de lo que me sentía cuando estábamos en el bar | **orphan** | Zero relation to seed 118 (pub/feel better/we were) or its LEGOs (I felt/we were/the pub) — 'She used to'/'Ella solía' is an imperfect-tense paradigm fragment with no connection to this seed. |
| `S0127L01C01` | A few months ago → Hace unos meses | that isn't why I wanted to see you → no es por eso que quería verte | **orphan** | Zero relation to seed 127 ('that isn't why I wanted to see you') or its LEGOs (to see you/for/that) — 'A few months ago'/'Hace unos meses' shares no vocabulary. |
| `S0120L01C01` | They used to → Solían | It's interesting that you like to go by bus → Es interesante que te guste ir en autobús | **orphan** | Zero relation to seed 120 ('interesting that you like to go by bus') or its LEGOs (bus/to go/you like) — 'They used to'/'Solían' is unrelated. |
| `S0117L01C01` | He used to → Él solía | I'm definitely doing better than I was last time we talked to each other → definitivamente lo estoy haciendo mejor que la última vez que hablamos | **orphan** | Zero relation to seed 117 ('doing better...last time we talked') or its LEGOs (we talked/the last time/definitely) — 'He used to'/'Él solía' is unrelated. |
| `S0143L02C01` | If they tried → Si lo intentaran | It's the same thing as we were talking about earlier → Es lo mismo de lo que estábamos hablando antes | **orphan** | Zero relation to seed 143 ('the same thing...talking about earlier') or its LEGOs (we were talking/the same thing/earlier) — 'If they tried'/'Si lo intentaran' is unrelated. |
| `S0266L01C01` | I shouldn't → No debería | he was an old friend of my father → era un viejo amigo de mi padre | **orphan** | Zero relation to seed 266 ('he was an old friend of my father') — 'I shouldn't'/'No debería' shares no vocabulary with this seed or any sibling. |
| `S0118L02C01` | When she lived there → Cuando vivía allí | I feel better than I felt when we were in the pub → Me siento mejor de lo que me sentía cuando estábamos en el bar | **orphan** | Zero relation to seed 118 (pub/feel better) beyond the trivial function word 'cuando'/'when' — 'When she lived there'/'Cuando vivía allí' is unrelated content; the seed's correct build/use family is untouched. |
| `S0267L01C01` | I should have → Debería haber | have you heard from your friend? → ¿Has tenido noticias de tu amigo? | **orphan** | Zero relation to seed 267 ('have you heard from your friend?') — 'I should have'/'Debería haber' shares no vocabulary. |
| `S0140L01C01` | He could → Él podría | I'm sorry that I can't see what you're trying to show me → lo siento que no puedo ver lo que intentas mostrarme | **orphan** | Zero relation to seed 140 ('sorry that I can't see what you're trying to show me') — 'He could'/'Él podría' is unrelated. |
| `S0125L01C01` | I've had → He tenido | I believe that your idea was very good → creo que tu idea fue muy buena | **orphan** | Zero relation to seed 125 ('I believe that your idea was very good') — 'I've had'/'He tenido' is unrelated. |
| `S0142L01C01` | we could → podríamos | that's very kind of you and I'm grateful to you for helping → eres muy amable y te agradezco por ayudarme | **orphan** | Zero relation to seed 142 ('that's very kind of you...grateful for helping') — 'we could'/'podríamos' is unrelated. |
| `S0134L01C01` | He'll be able to → Él podrá | It's not a problem when you work at something difficult with them → no es un problema cuando trabajas en algo difícil con ellos | **orphan** | Zero relation to seed 134 ('not a problem when you work at something difficult with them') — "He'll be able to"/'Él podrá' is unrelated. |
| `S0488L01C01` | the other → el otro | It's on the other side of that yellow line → está al otro lado de esa línea amarilla | **mislabeled** | Seed's own target_text elides 'a'+'el' to 'al otro lado', but the LEGO ('the other side'->'el otro lado') and every build/use sibling at li=1 use uncontracted 'el otro lado'/'en el otro lado' — the seed row is stale/inconsistent with its own LEGO family; trusting the siblings, 'the other'->'el otro' is a genuine constituent, false-positive due to the al/a-el elision gap. |
| `S0131L02C01` | When I was there → Cuando estaba allí | there are too many ideas going around in my head → hay demasiadas ideas dando vueltas en mi cabeza | **orphan** | Zero relation to seed 131 ('too many ideas going around in my head') beyond the trivial function word 'cuando' — 'When I was there'/'Cuando estaba allí' is unrelated content. |
| `S0117L02C01` | When he was younger → Cuando era más joven | I'm definitely doing better than I was last time we talked to each other → definitivamente lo estoy haciendo mejor que la última vez que hablamos | **orphan** | Zero relation to seed 117 ('doing better...last time we talked') beyond trivial function words 'cuando'/'más' — 'When he was younger'/'Cuando era más joven' is unrelated. |
| `S0131L01C01` | I'd like to have been able to → Me gustaría haber podido | there are too many ideas going around in my head → hay demasiadas ideas dando vueltas en mi cabeza | **orphan** | Zero relation to seed 131 ('too many ideas going around in my head'); overlap on 'me'/'gustaría' is coincidental (those words recur in unrelated use-phrases elsewhere in the course, not in this seed's own family) — "I'd like to have been able to"/'Me gustaría haber podido' is unrelated. |
| `S0138L02C01` | If I tried harder → Si me esforzara más | this was where my friend wanted to meet us → aquí es donde mi amigo quería reunirse con nosotros | **orphan** | Zero relation to seed 138 ('this was where my friend wanted to meet us') — 'If I tried harder'/'Si me esforzara más' is unrelated. |
| `S0123L02C01` | A long time → Durante mucho tiempo | I think that's a good idea → pienso que es una buena idea | **orphan** | Zero relation to seed 123 ('I think that's a good idea'); overlap on 'mucho'/'tiempo' is coincidental (present in unrelated use-phrases elsewhere, not this seed's own family) — 'A long time'/'Durante mucho tiempo' is unrelated. |
| `S0274L01C01` | They should → Deberían | Do you have to leave in a few days? → ¿Tienes que irte en unos días? | **orphan** | Zero relation to seed 274 ('do you have to leave in a few days?') — 'They should'/'Deberían' is unrelated. |
| `S0580L01C02` | often → a menudo | we've often wanted to take the children somewhere a little warmer → muchas veces hemos querido llevar a los niños a un sitio un poco más cálido | **mislabeled** | Seed's own target_text says 'muchas veces' for 'often', but the LEGO ('we've often wanted to'->'hemos querido a menudo') and every build/use sibling uniformly use 'a menudo' — the seed row is stale/inconsistent with its own LEGO family; trusting the siblings, 'often'->'a menudo' is a genuine constituent. |
| `S0241L01C01` | To give → dar | I don't want to give it to him → no quiero dárselo a él | **mislabeled** | 'to give'->'dar' is genuinely the verb stem of the seed's 'dárselo' (dar+se+lo, confirmed by sibling LEGO 'to give it to him'->'dárselo'); it fails containment only because 'dar' is fused with the reflexive/object clitics 'se'+'lo', not because it's unrelated. |
| `S0138L01C01` | I could → Yo podría | this was where my friend wanted to meet us → aquí es donde mi amigo quería reunirse con nosotros | **orphan** | Zero relation to seed 138 ('this was where my friend wanted to meet us') — 'I could'/'Yo podría' is unrelated. |
| `S0125L02C01` | A difficult few weeks → Unas semanas difíciles | I believe that your idea was very good → creo que tu idea fue muy buena | **orphan** | Zero relation to seed 125 ('I believe that your idea was very good') — 'A difficult few weeks'/'Unas semanas difíciles' is unrelated. |
| `S0196L01C01` | I hope → espero | have you heard the latest idea? → ¿Has oído la última idea? | **orphan** | Zero relation to seed 196 ('have you heard the latest idea?') — 'I hope'/'espero' is unrelated. |
| `S0278L01C01` | it would be → sería | did you have to finish everything last night? → ¿Tuviste que terminar todo anoche? | **orphan** | Zero relation to seed 278 ('did you have to finish everything last night?') — 'it would be'/'sería' is unrelated. |
| `S0365L01C01` | she said → ella dijo | I didn't hear what she said to him → no oí lo que ella le dijo a él | **mislabeled** | The seed's own target_text 'no oí lo que ella le dijo a él' does contain both 'ella' and 'dijo', just discontinuous — the clitic 'le' is inserted between subject and verb ('ella le dijo'). 'she said'->'ella dijo' is a genuine constituent split by clitic placement, not an orphan. |
| `S0397L02C01` | to prepare → prepararse | Do we need to get ready soon? → ¿Necesitamos prepararnos pronto? | **synonym-variant** | 'to prepare'->'prepararse' is the dictionary/infinitive reflexive form; the seed and all its siblings at li=2 use the conjugated nosotros form 'prepararnos' ('to remain'->'quedarnos' style pattern) — a reflexive-pronoun agreement variant per synonym-choice-architecture.md, not a defect. |
| `S0466L01C01` | let → deja \| me → me | let me throw it over the wall → déjame tirarlo por encima del muro | **mislabeled** | Target uses the course's morpheme-decomposition annotation convention 'deja \| me → me', correctly showing that 'déjame' (sibling LEGO 'let me'->'déjame') fuses 'deja'+'me' — fails naive substring containment because of the pipe-annotation format, not because the content is wrong. |
| `S0365L01C02` | to him → le... a él | I didn't hear what she said to him → no oí lo que ella le dijo a él | **mislabeled** | Companion to S0365L01C01: the seed's own target_text contains both 'le' and 'a él' ('ella le dijo a él'), discontinuous around the verb 'dijo' — 'to him'->'le... a él' is a genuine (explicitly discontinuous, per the '...' notation) constituent, not an orphan. |
| `S0500L02C01` | to sit → sentarte \| sit down → sentarse | Why don't you want to sit between the two girls? → ¿Por qué no quieres sentarte entre las dos chicas? | **mislabeled** | Target uses the pipe-annotation convention 'sentarte \| sit down → sentarse', correctly showing the tú-form used in the seed plus its reflexive-infinitive citation form — matches sibling LEGO 'sit'->'sentarte'; false-positive due to annotation format. |
| `S0510L01C01` | she's → se ha | she's gone to look for somewhere safe to park the car → ha ido a buscar un sitio seguro para aparcar el coche | **mislabeled** | Seed's own target_text drops the reflexive 'se' ('ha ido a buscar un sitio...') and uses 'sitio' instead of 'lugar', but the LEGO ('she's gone to'->'se ha ido a') and every sibling at li=1/li=2 uniformly use 'se ha ido a'/'un lugar seguro' — the seed row is stale/inconsistent with its own LEGO family; trusting the siblings, "she's"->'se ha' is a genuine constituent. |
| `S0403L02C01` | to stay → quedarse | we should remain quiet for as long as possible → deberíamos quedarnos callados el mayor tiempo posible | **synonym-variant** | 'to stay'->'quedarse' is the dictionary/infinitive reflexive form; the seed and all its siblings at li=2 use the conjugated nosotros form 'quedarnos' ('we should remain quiet') — reflexive-pronoun agreement variant, not a defect. |
| `S0495L01C01` | when → cuando \| it → importa | when it matters → cuando importa | **unclear** | The first half 'when'->'cuando' is a correct literal constituent (matches sibling LEGO li=1 'when it'->'cuando'). But the appended annotation 'it → importa' looks like a mislabeling: 'importa' is the full verb form covering 'it matters' (sibling LEGO li=2 'it matters'->'importa'), not a translation of 'it' alone — impersonal 'importa' has no separate word for 'it'. Flagging rather than resolving: unclear whether this is an intentional (if imprecise) teaching shorthand or a genuine annotation bug. |
| `S0426L04C01` | unhappy → infeliz | they would like to love each other but they're unhappy → les gustaría quererse pero están infelices | **mislabeled** | 'unhappy'->'infeliz' (singular) fails containment against the seed's own 'infelices' (plural, agreeing with 'they'), but the LEGO li=4 ('unhappy'->'infelices') and every build/use sibling at li=4 confirm 'infelices' is the correct plural form for this seed — this component row's singular 'infeliz' is a stale/mismatched number-agreement variant of a genuine constituent, not an orphan (there IS a sibling: course_practice_phrases component li=4 'plural'->'es' explicitly marks the pluralization gap). |
| `S0466L02C01` | throw → tirar \| it → lo | let me throw it over the wall → déjame tirarlo por encima del muro | **mislabeled** | Target uses the same pipe-annotation convention 'tirar \| it → lo', correctly showing 'tirarlo' (sibling LEGO 'throw it'->'tirarlo') fuses 'tirar'+'lo' — false-positive due to annotation format, not a content defect. |

## Decision candidates for Tom

- **`S0495L01C01`** ("it → importa"): is this pipe-annotation over-attribution intentional shorthand elsewhere in the course, or a one-off labeling bug? Needs a read, not resolved here.
- The **5 stale-seed-row cases** (`S0578L01C01`, `S0488L01C01`, `S0580L01C02`, `S0510L01C01`, `S0426L04C01`) all show the same shape: `course_seeds.target_text` disagreeing with a uniform LEGO+build+use family. Worth checking whether `course_seeds` rows for these 5 seed_numbers need a data fix independent of this component-row triage (the seed's own target_text is the one that's actually wrong/stale, not the flagged component).
- The **pipe-annotation format** (`X | Y → Z`) is clearly a deliberate SSi convention for showing morpheme fusion/citation forms (4 rows here: `S0466L01C01`, `S0466L02C01`, `S0500L02C01`, `S0495L01C01`) — confirms the broader point from the fra pilot that `component`-role rows are per-sentence glosses, not literal substrings, and any membership check on them needs to account for this format rather than flag it as a defect.

## Files

- `scripts/zut-membership-triage/batch-spa_for_eng-2.json` — input: 38 flagged rows + full seed/sibling context (read-only source, unmodified).
- `scripts/zut-membership-triage/batch-spa_for_eng-2-classified.json` — same 38 entries annotated with `classification` + `reasoning`.
