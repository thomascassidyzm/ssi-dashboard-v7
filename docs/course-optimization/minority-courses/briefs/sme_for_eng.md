# Northern Sami (`sme_for_eng`) — Opus handoff brief

**Status:** Seeds 1–10 locked and second-pass verified from scratch — zero grammar errors survived; every gradation, case form, and lexeme confirmed against Wiktionary and attested native text. Fable + rigorous source-checking proved sufficient for grammar-level correctness; **do not re-verify seeds 1–10, build on them.** Native check is PENDING (10 questions below) and the single biggest risk is the **hupmat/hállat dialect decision (gotcha 2)** — it must be settled against the recording voice's dialect BEFORE any TTS, or seeds 1/3/5/9 and everything downstream get re-recorded. Second risk: consonant gradation on every new inflected form — treat every form you produce as wrong until confirmed.

## Orthography

- **Standard:** the 1979 pan-Nordic Northern Sami orthography, exactly as used on `se.wikipedia.org` and in Wiktionary sme entries. Copy se.wikipedia when in doubt.
- **Special letters (all mandatory, never substitute):** `á č đ ŋ š ŧ ž` (upper: `Á Č Đ Ŋ Š Ŧ Ž`). `đ` is U+0111 (d-stroke), NOT ð; `ŋ` is U+014B. Rejects: ASCII-folding (`a c d n s t z`), Icelandic `ð/þ`, apostrophe-marked older orthographies (pre-1979 `Bergsland-Ruong` style with `'` for gradation), any form with `ä ö å` (those are Ume/South Sami tells).
- **Geminates are phonemic and lexical:** `sihkkar` not `sihkar` (Wiktionary lists the degeminated variant as an alternative spelling — reject it), `cealkka` not `cealka`, `hupmat` with single p+m cluster as written. Wiktionary "alternative form of" entries look plausible; always use the lemma-page headword.
- **Pipeline check (do once, early):** verify `á č đ ŋ š ŧ ž` survive TTS input, the `text_normalized` DB trigger, and S3 filename generation before bulk work. Also flag: mainstream TTS coverage of sme is thin/nonexistent — audio sourcing is an open production question, raise it before promising audio.

## Core grammar the builder needs

**Word order:** basically SVO with free-ish adverb placement; seeds put time adverbs (`dál`, `odne`) clause-final. No articles at all — bare noun covers a/the.

**Pronouns (three numbers — dual is real):**

| person | SG | DUAL | PL |
|---|---|---|---|
| 1 | mun | moai | mii |
| 2 | don | doai | dii |
| 3 | son | soai | sii |

`duinna` = comitative sg of `don` ("with you"). Course keeps explicit `mun` in every 1sg sentence (locked convention, seed 2 note). Dual has NOT yet appeared — see gotcha 9.

**Verb: present 1sg is the workhorse.** Two structural classes matter:

| class | behaviour | course examples (lemma → 1sg) |
|---|---|---|
| even (2-syll) stems | GRADATION between lemma and 1sg; direction varies by verb | hupmat → **human** (pm→m weak); sáhttit → **sáhtán** (htt→ht weak); muitit → **muittán** (t→tt STRONG — opposite direction) |
| odd (3-syll, -it) stems | NO gradation; 1sg = stem + **-an** | háliidit → háliidan; geahččalit → geahččalan; oaivvildit → oaivvildan |

Do not "fix" odd verbs by adding gradation, and do not assume even verbs all weaken — check each.

**No future tense:** "going to / will" = `áigut` + infinitive (`mun áiggun` + INF). Infinitives chain freely (`áiggun geahččalit čilget`, seed 8). Simple present covers English progressive (`geahččalan` = "I'm trying").

**No verb 'to have':** possession = locative + `lea` (`mus lea` = at-me is). Not yet in seeds; the moment a "have" seed arrives, this is the frame.

**Negation:** inflecting negative verb + connegative main verb. 1sg neg = `in`; connegative of `leat` is `leat`. So "I'm not (sure)" = `mun in leat sihkkar`. Neg verb paradigm (present): sg `in / it / ii`, dual `ean / eahppi / eaba`, pl `eat / ehpet / eai`.

**Yes/no questions & embedded 'if/whether':** interrogative clitic `go` attached to a fronted verb. Embedded "whether I can" = `sáhtán go` — there is NO word for 'if/whether' here. `jos` = conditional 'if' only; `ahte` = 'that' only.

**Cases in play (7):**

| case | sg marker behaviour | course use |
|---|---|---|
| NOM | citation form | subjects |
| ACC/GEN | identical in sg; usually WEAK grade (sátni→sáni, giella→giela, cealkka→cealkaga) | direct objects; language as object of speak: `davvisámegiela` |
| ILL | (giella→) gillii | language of expression: `davvisámegillii` "in N. Sami" |
| LOC | -s type | possession (`mus lea`), 'in/at/from' |
| COM | sg -in; **bare COM = 'with', no preposition** | `duinna`, `eará olbmuin` |
| ESS | -n | not yet used |

Homophony: COM.SG = LOC.PL for many nouns (`olbmuin`); ACC = GEN throughout sg. Record the intended case on every noun LEGO.

**Adjectives: attributive ≠ predicative.** `sihkkar` (PRED, after leat — seed 10) vs `sihkkaris` (ATTR); `olles` (ATTR — "olles cealkaga") vs `ollis` (PRED). Check the slot before reusing.

## LOCKED DECISIONS (contracts Opus must NOT break)

ZUT: each English item below maps to exactly one Sami form, course-wide. Reuse these surface strings verbatim.

- [ ] **speak → `hupmat`**, 1sg `human` (Guovdageaidnu dialect) — ⚠️ PROVISIONAL until recording voice confirmed as hupmat-speaker; if voice is hállat-dialect, the switch is `hállat`/1sg `hálan` in seeds 1/3/5/9 and everywhere after. Decide ONCE, before TTS. Never mix hupmat/hállat/sárdnut.
- [ ] **want → `háliidit`** (`mun háliidan`)
- [ ] **try → `geahččalit`** (`geahččalan`)
- [ ] **learn → `oahppat`** · **practise → `hárjehallat`** · **say → `dadjat`** · **explain → `čilget`** · **remember → `muitit`** (1sg is `muittán`, STRONG grade) · **mean → `oaivvildit`** (`oaivvildan`) · **can → `sáhttit`** (`sáhtán`)
- [ ] **going to → `áigut` + INF** (`mun áiggun`) — never a šaddat/leat future calque
- [ ] **how → `mo`** (never movt/got) · **now → `dál`** · **today → `odne`** · **often → `dávjá`** · **well → `bures`** · **a little → `veaháš`** · **something → `juoidá`** · **other → `eará`** (indeclinable attributive)
- [ ] **Northern Sami (the language) → `davvisámegiella`** — not plain `sámegiella`, because the English side says "Northern Sami". ACC object = `davvisámegiela`; "in Northern Sami" = ILL `davvisámegillii`. These are TWO separate LEGOs (gotcha 6).
- [ ] **as X as possible → `nu X go vejolaš`** (frame attested; reuse for new X)
- [ ] **'with' a person → bare comitative**, no preposition (`duinna`, `eará olbmuin`)
- [ ] **whether/if (embedded Y/N) → fronted verb + `go`** (`sáhtán go`) — never jos/ahte
- [ ] **Register:** plain `mun`/`don` singular; no honorific layer in Northern Sami — the register decision that DOES exist is dual-vs-plural 'we/you', deferred until the first such seed (methodology decision, escalate, don't pick silently)
- [ ] **Explicit `mun` in every 1sg sentence** (pro-drop is grammatical but the course keeps the pronoun for LEGO reuse)
- [ ] **sure (predicative) → `sihkkar`** · **whole (attributive) → `olles`**

## The 10 reference seeds

| n | English | Target | Gloss | Conf |
|---|---|---|---|---|
| 1 | I want to speak Northern Sami with you now | mun háliidan hupmat davvisámegiela duinna dál | I want-1SG speak-INF N.Sami-ACC you-COM.SG now | high |
| 2 | I'm trying to learn | mun geahččalan oahppat | I try-1SG learn-INF | high |
| 3 | how to speak as often as possible | mo hupmat nu dávjá go vejolaš | how speak-INF so often as possible | medium |
| 4 | how to say something in Northern Sami | mo dadjat juoidá davvisámegillii | how say-INF something-ACC N.Sami-ILL | high |
| 5 | I'm going to practise speaking with another person | mun áiggun hárjehallat hupmat eará olbmuin | I intend-1SG practise-INF speak-INF other person-COM.SG | medium |
| 6 | I'm trying to remember a word | mun geahččalan muitit sáni | I try-1SG remember-INF word-ACC | high |
| 7 | I want to try as well as I can today | mun háliidan geahččalit nu bures go sáhtán odne | I want-1SG try-INF so well as can-1SG today | high |
| 8 | I'm going to try to explain what I mean | mun áiggun geahččalit čilget maid mun oaivvildan | I intend-1SG try-INF explain-INF what-ACC I mean-1SG | high |
| 9 | I speak a little Northern Sami now | mun human veaháš davvisámegiela dál | I speak-1SG a-little N.Sami-ACC now | high |
| 10 | I'm not sure if I can remember the whole sentence | mun in leat sihkkar, sáhtán go muitit olles cealkaga | I NEG-1SG be.CONNEG sure, can-1SG Q remember-INF whole sentence-ACC | high |

Rule-carrying notes: **3** and **5** are grammatically safe patterns but composed-not-attested strings — native-check flags stand. **6**: `muitit` 1sg is `muittán` (strong grade — opposite direction to the nouns). **8**: `maid` = ACC of `mii`, standard for embedded "what I…". **10**: comma clause with `sáhtán go` is the 'whether' template — protect it.

## Worked decompositions

Copy this pattern: known-atom → target-atom, in target order; SEALED = never split further (fused morphology inside).

**Seed 1** — *I want to speak Northern Sami with you now*

| # | known | target | notes |
|---|---|---|---|
| 1 | I want | mun háliidan | SEALED — pronoun + person-suffixed verb travel together per course convention |
| 2 | to speak | hupmat | infinitive; dialect-decision LEGO |
| 3 | Northern Sami | davvisámegiela | ACC (weak grade ll→l); record case=ACC; distinct LEGO from davvisámegillii |
| 4 | with you | duinna | SEALED — comitative fused into the pronoun; there is no separate 'with' word to expose |
| 5 | now | dál | |

**Seed 10** — *I'm not sure if I can remember the whole sentence*

| # | known | target | notes |
|---|---|---|---|
| 1 | I'm not sure | mun in leat sihkkar | SEALED as a unit for debut — `in leat` (neg verb + connegative) must NEVER be split; sihkkar is the PREDICATIVE form, only valid in this slot |
| 2 | if I can | sáhtán go | SEALED — verb fronted + Q-clitic; the English 'if' has NO target word; do not let a jos/ahte LEGO exist |
| 3 | to remember | muitit | |
| 4 | the whole | olles | ATTRIBUTIVE form; predicative is ollis |
| 5 | sentence | cealkaga | ACC (cealkka→cealkaga); record case=ACC |

**Seed 4** — *how to say something in Northern Sami*

| # | known | target | notes |
|---|---|---|---|
| 1 | how | mo | locked variant |
| 2 | to say | dadjat | |
| 3 | something | juoidá | no Wiktionary entry; attested in corpus — keep, low-residual flag |
| 4 | in Northern Sami | davvisámegillii | SEALED — ILLATIVE 'language of expression'; a DIFFERENT LEGO from davvisámegiela (seed 1); never merge, never present one as a variant of the other |

## Gotchas (each with the correct form)

1. **Consonant gradation, bidirectional.** Nouns weaken in ACC/GEN: sátni→**sáni**, giella→**giela**, cealkka→**cealkaga**. Verbs vary: hupmat→**human** (weakens), sáhttit→**sáhtán** (weakens), but muitit→**muittán** (STRENGTHENS). Odd -it verbs (háliidit, geahččalit, oaivvildit) have NO gradation — don't over-correct them. Verify every inflected form you produce.
2. **Dialect 'speak':** hupmat (Guovdageaidnu) / hállat, 1sg hálan (general/Kárášjohka) / sárdnut (eastern). Course = hupmat. Confirm the voice's dialect BEFORE TTS; a late switch re-records seeds 1/3/5/9 + all downstream phrases.
3. **No 'if/whether' word:** embedded Y/N = fronted verb + clitic **go** (`sáhtán go`). jos = conditional only, ahte = 'that' only. English-trained instinct WILL insert one — don't.
4. **No 'have', no future:** possession = **mus lea** (locative); future intent = **áigut + INF**. Reject šaddat/leat future calques.
5. **Case homophony:** COM.SG = LOC.PL (olbmuin = 'with a person' AND 'in people'); ACC = GEN in all singulars. Label every noun LEGO with its case or later reuse silently shifts meaning.
6. **One noun, many surfaces:** davvisámegiela (ACC) vs davvisámegillii (ILL) = separate LEGOs, always. Same for any future noun appearing in two cases.
7. **Orthography:** 1979 standard, á č đ ŋ š ŧ ž; đ≠ð. Geminates lexical: **sihkkar**, **cealkka**. Verify special chars survive TTS/DB-normalize/S3.
8. **Attributive vs predicative adjectives:** sihkkar (PRED) / sihkkaris (ATTR); ollis (PRED) / **olles** (ATTR, as in olles cealkaga). Check the slot every time.
9. **Dual number** on pronouns AND verbs (moai 'we two', hupme 'we two speak'). First 'we/you-two' seed = methodology decision (which number the English maps to) — escalate, don't just translate.
10. **Wiktionary is patchy:** juoga/juoidá, oaivvildit, cealkka have NO entries. Absence ≠ wrongness. Fall back to Giellatekno analyzers and attested text (skuvla.info, Ávvir, Sámediggi, se.wikipedia).

## Native-check questions (open — resolve before ship)

1. **hupmat or hállat** for 'to speak'? (hállat → switch seeds 1/3/5/9 to hállat/hálan course-wide.) And with a language: accusative object (`human davvisámegiela`) or illative (`human davvisámegillii`)?
2. Is `nu dávjá go vejolaš` natural for 'as often as possible', or better with sáhttit (`nu dávjá go sáhtán`)?
3. Chained infinitive `hárjehallat hupmat` for 'practise speaking' — natural, or use an action noun / sámástit-type verb?
4. Seed 1 word order: `hupmat davvisámegiela duinna dál` — natural? Front the comitative? Where does `dál` best sit?
5. Seed 10 as a whole — would you say it? Is the comma clause with fronted `sáhtán go` right, or restructure/insert ahte?
6. Is `cealkka` the everyday spoken word for a sentence, ACC `cealkaga`?
7. Is `áiggun` the natural everyday 'I'm going to' in all these seeds, or too intentional anywhere?
8. Constant explicit `mun` — acceptable-natural for a course, or drop it in some frames?
9. `veaháš` vs veahá / veaháccat in `human veaháš davvisámegiela`?
10. `davvisámegiella` or plain `sámegiella` in these sentences?
11. (new) `eará olbmuin` — does the COM.SG reading come through cleanly, or does the LOC.PL homophone intrude?
12. (new) When the course reaches 'we', which do learners of your community most need first: dual `moai` or plural `mii`?

## Instructions to Opus for continuing (seeds 11+)

1. **Never invent an inflected form.** Pipeline per form: (a) Wiktionary sme entry — use the declension/conjugation table on the lemma page; (b) if absent, Giellatekno/Divvun analyzers (sátni.org, the sme FST); (c) if still unconfirmed, search attested native text (skuvla.info, Ávvir, Sámediggi, se.wikipedia) for the exact surface string. A form confirmed by none of these ships as `confidence: low` with an explicit native-check flag — flagging is success, guessing is failure.
2. **Reuse locked surface strings byte-for-byte.** Every lexeme in the LOCKED DECISIONS list is a contract: same English concept → same Sami form, same case where the frame matches. Before translating a new seed, scan it for concepts already locked and lift the exact chunk from seeds 1–10.
3. **New nouns:** determine the ACC/GEN weak grade from the Wiktionary table before first use as an object; record `case=` on the LEGO. New verbs: determine even/odd class first; odd -it verbs get plain -an with no gradation, even verbs get their table form — never analogize from another verb.
4. **Structural frames to reach for:** possession → `mus lea`; future/intent → `áiggun` + INF; embedded whether → verb + `go`; negation → neg verb + connegative (check the connegative form per verb — it is not the infinitive); 'as X as possible' → `nu X go vejolaš`; comparisons and equatives generally use `go`.
5. **Escalate, don't decide, on:** (a) the first dual/plural 'we' or 'you' seed (gotcha 9); (b) any seed needing the hupmat/hállat lexeme in a new frame while the dialect question is open; (c) any adjective whose attributive/predicative pair you cannot confirm; (d) any point where English 'if' is conditional vs whether (jos vs go) and the seed is ambiguous.
6. **Where sme is thin, prefer low-confidence + defer:** colloquial discourse particles, idioms, aspectual/derivational verb pairs (Sami derivation is rich — hárjehallat-type -hallat forms, momentaneous/frequentative pairs), and anything where Wiktionary has no entry. Mark `confidence: medium/low`, state exactly what is unconfirmed in the notes, and keep the composed string simple enough that a native can approve or minimally repair it.
7. **Before any audio:** resolve native-check Q1 (dialect), rerun the orthography pipeline check (gotcha 7), and remember TTS coverage for sme is itself unresolved — plan and get approval per the standing TTS gate.
8. **Decomposition discipline:** SEALED units so far are `mun in leat sihkkar`-type negation clusters, verb+`go` whether-chunks, case-fused pronouns (duinna), and case-marked nouns (each case = its own LEGO). Copy the three worked decompositions above as the house pattern; when a new fused-morphology chunk appears, seal it and say why in the LEGO note.