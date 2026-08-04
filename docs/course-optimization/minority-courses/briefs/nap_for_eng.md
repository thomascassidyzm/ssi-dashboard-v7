# Neapolitan (`nap_for_eng`) — Opus handoff brief

**Status:** Seeds 1–10 desk-verified and locked (Fable, 2026-07-06). Fable-level desk verification is complete and was sufficient — every seed is either verbatim-attested or composed only of attested pieces; Opus re-derivation would add nothing. **Native check is NOT done** and is a hard gate before shipping or scaling past seed 10 (8 questions below, ~30 min with a Naples speaker). **Biggest risk:** wrong-but-plausible Italian calques — frames that look Neapolitan word-by-word but copy an Italian skeleton. Residual desk risk is concentrated in one frame (`'o cchiù (spisso) ca pozzo`, seeds 3/7) plus a handful of spelling rulings.

---

## Orthography

**Standard: classical/literary orthography as practiced on nap.wikipedia.org** (the only reasonably consistent modern corpus in this orthography; secondary anchors: Di Giacomo poetry, classic song lyrics, Rocco's dictionary A–C on Wikisource, native-authored blogs like *Labboratorio 'e Napulitano*). Web Neapolitan mixes at least three competing systems — **normalize every attested form to this standard before it enters a seed**; never copy a source spelling raw.

Hard rules:

1. **Always write final unstressed vowels.** `saccio`, never `sacc'`. `pozzo`, never `pozz'`. (Speech reduces them to schwa; writing does not.)
2. **Accent on truncated infinitives:** `parlà, pruvà, 'mparà, arricurdà, spiegà, vulé, puté`. **No accent** on full proparoxytone infinitives: `dicere, essere`. Never apostrophe-truncation (`fa'`, `parla'` — reject).
3. **`j` not `i`** for the palatal glide: `jurnata`, `jì`.
4. **Articles:** definite `'o` (m.sg), `'a` (f.sg), `'e` (pl), `ll'` before vowels; indefinite `nu` / `na`.
5. **`mo`** ("now") with no apostrophe.
6. **Raddoppiamento house rule** (apply mechanically, see Gotchas #3): written **only** in frozen attested spellings — `cu tte`, and on the noun after feminine-plural `'e` (`'e pparole`). **Not** written after `so'`/`è` (`so' sicuro`, not `so' ssicuro`) pending native ruling (Q7).
7. **Naples-city forms only** — reject provincial/hinterland variants.
8. **Rejects on sight:** š-orthography (`šta`), Italianizing spellings (`napoletano`, `oggi`, `più`, `con te`), elided finals, `i`-for-`j`.

---

## Divergence from parent (Neapolitan ← Italian)

Opus will constantly be tempted to derive Neapolitan by transforming Italian. Here is exactly what transfers and what must be re-derived.

**Transfers safely (structural skeleton):**
- SVO order, `nun` + verb negation (position as Italian `non`).
- Clitic system exists and climbs over modals (`me pozzo arricurdà` ≈ `mi posso ricordare`).
- Complementizer strategy: `ca` where Italian has `che`; `si` = "if"; `chello ca` = "that which/what".
- Article + `cchiù` + relative clause for relative superlatives (pan-Romance pattern).
- Cognate lexicon *shape* — but every individual word's Neapolitan form must be looked up, not derived.

**Must be re-derived — Italian instinct is WRONG here:**

| Function | Italian | Neapolitan (locked) |
|---|---|---|
| possession | avere (ho) | **tené (tengo)** — `avé/aggio` is auxiliary/modal ONLY |
| going to / have to | sto per / devo | **aggi'a + inf** (= aggio (d)a; covers both) |
| progressive 1sg | sto + gerund | **stongo + gerund** (attested: *stongo pruvanno*) |
| future | synthetic -rò | **aggi'a periphrasis** (no synthetic future in course) |
| infinitives | full -are/-ere | -à/-é verbs **truncate with accent**; proparoxytones keep full form (`dicere`) |
| "more" | più | **cchiù** |
| now / today | adesso / oggi | **mo / ogge** |
| something / someone else | qualcosa / qualcun altro | **quaccosa / quacchedun'ato** |
| with you | con te | **cu tte** (written doubling, frozen) |
| of (partitive) | di | **'e** (`nu poco 'e napulitano`) |
| in(side) | in | **'n / in** (preposition; frozen: `'n napulitano`), **int'a** = locative "inside" |

**The trap:** any multi-word frame that "works in Italian" is guilty until attested in Neapolitan. Word-by-word substitution produced our two caught calques (`fà pratica`, `'o cchiù X pussibbile`).

---

## Core grammar the builder needs

**Verb inventory in play (1sg present + non-finites):**

| Verb | 1sg pres | Infinitive | Gerund | Notes |
|---|---|---|---|---|
| vulé (want) | voglio | vulé | — | + bare infinitive |
| puté (can) | pozzo | puté | — | + bare infinitive; clitics climb before it |
| stà (be/PROG) | stongo | stà | — | stongo + gerund = progressive |
| avé (AUX/modal) | aggio → **aggi'a** | avé | — | aggi'a + inf only; never possession |
| tené (have/own) | tengo | tené | — | all possession |
| essere (be, copula) | **so'** | essere | — | `nun so' sicuro` |
| parlà (speak) | parlo | parlà | parlanno | bare language name: `parlà napulitano` |
| pruvà (try) | provo* | pruvà | pruvanno | links with **a** + inf (attested) |
| 'mparà (learn) | — | 'mparà | — | attested in native prose |
| dicere (say) | dico* | dicere | — | no accent (proparoxytone) |
| arricurdà(-se) (remember) | — | arricurdà | — | reflexive; see clitics |
| sapé (know) | saccio | sapé | — | reserve for facts/knowing-how |

\* not yet used in a seed; verify conjugated form on first use.

**Clitics:** `me / te / se` reflexive. Before a finite modal they climb: `me pozzo arricurdà`. Before a governed infinitive the course provisionally uses **proclitic**: `a m'arricurdà` (pattern of song-attested `pe' me scurdà`); enclitic `arricurdarme` exists — native decides (Q3), then it is course-wide law.

**Negation:** `nun` immediately before verb complex, before clitics: `nun me pozzo arricurdà`.

**Articles & partitive:** `'o / 'a / 'e / ll'`; `nu / na`; `nu poco 'e X` = "a little X". `tutta 'a frase` — `tutta` precedes the article.

**Verb-linking prepositions:** each governing verb's linker is lexical, not derivable: `pruvà **a**` (attested), `voglio/pozzo/aggi'a` + bare infinitive. Look up every new governing verb's linker; never assume Italian's.

**Questions/subordination:** `ca` (that/relative), `si` (if), `comme` (how), `chello ca` (what = that-which).

---

## LOCKED DECISIONS (contracts Opus must NOT break)

ZUT direction: one English known → exactly one Neapolitan target, course-wide. Many-known→one-target is allowed (see aggi'a).

- [ ] **"I want to" → `voglio` + inf** (bare)
- [ ] **"I'm trying to" → `stongo pruvanno a` + inf**; "to try to" → `pruvà a` + inf (pruvà, NOT `cercà 'e` — pending Q1 but locked until native overrules)
- [ ] **"I'm going to" AND "I have to" → `aggi'a` + inf** (dual mapping is method-legal; do not split into two targets)
- [ ] **"I can" → `pozzo`**
- [ ] **"remember" → reflexive `arricurdà`**; after modal: `me pozzo arricurdà`; after `a`: proclitic `a m'arricurdà` (provisional, Q3)
- [ ] **"learn" → `'mparà`** · **"speak" → `parlà`** · **"say" → `dicere`** · **"try" → `pruvà`** · **"explain" → `spiegà`** (spelling pending Q6)
- [ ] **possession → `tené/tengo`, NEVER `avé`**
- [ ] **"now" → `mo`** · **"today" → `ogge`** (spelling pending Q6) · **"often" → `spisso`**
- [ ] **"something" → `quaccosa`** · **"someone else" → `quacchedun'ato`**
- [ ] **"a little (of)" → `nu poco 'e`**
- [ ] **"in Neapolitan" → `'n napulitano`** (frozen; `in napulitano` is the audio-stage fallback, not a second course form)
- [ ] **"as much as I can" → `'o cchiù ca pozzo`**; "as often as I can" → `'o cchiù spisso ca pozzo` (frame pending Q2; if native swaps it, swap ALL instances at once)
- [ ] **"not" → `nun`** · **"if" → `si`** · **"I'm (copula)" → `so'`** · **"sure" → `sicuro`** · **"what (=that which)" → `chello ca`**
- [ ] **"word" → `parola`** · **"sentence" → `frase`** (accepted learned borrowings — do not add more borrowings without individual justification, Gotcha #8)
- [ ] **Register: informal `tu` throughout** (`cu tte`); no formal `vuje` forms unless a seed demands them, and then flag it
- [ ] **Raddoppiamento written only in frozen forms** (`cu tte`, `'e pparole`) — rule #6 in Orthography
- [ ] Orthography standard = classical/nap.wikipedia, all 8 rules above

---

## The 10 reference seeds

| n | English | Target | Gloss | Conf |
|---|---|---|---|---|
| 1 | I want to speak Neapolitan with you now | voglio parlà napulitano cu tte mo | I-want to-speak Neapolitan with you now | high |
| 2 | I'm trying to learn | stongo pruvanno a 'mparà | I-am trying to learn | high |
| 3 | how to speak as often as I can | comme parlà 'o cchiù spisso ca pozzo | how to-speak the more often that I-can | medium |
| 4 | how to say something in Neapolitan | comme dicere quaccosa 'n napulitano | how to-say something in Neapolitan | medium |
| 5 | I'm going to try to speak with someone else | aggi'a pruvà a parlà cu quacchedun'ato | going-to try to-speak with someone-else | med-high |
| 6 | I'm trying to remember a word | stongo pruvanno a m'arricurdà na parola | I-am trying to myself-remember a word | medium |
| 7 | I want to try as much as I can today | voglio pruvà 'o cchiù ca pozzo ogge | I-want to-try the more that I-can today | medium |
| 8 | I'm going to try to explain what I mean | aggi'a pruvà a spiegà chello ca voglio dicere | going-to try to-explain that-which I-want to-say | med-high |
| 9 | I speak a little Neapolitan now | parlo nu poco 'e napulitano mo | I-speak a little of Neapolitan now | high |
| 10 | I'm not sure if I can remember the whole sentence | nun so' sicuro si me pozzo arricurdà tutta 'a frase | not I-am sure if myself I-can remember all the sentence | high |

Rule-carrying notes: **2** — verbatim native attestation (*stongo pruvanno pure a fa' parlà*, Ermete's Peacebook / Labboratorio 'e Napulitano) settles stongo + pruvanno + linking `a` at once. **3/7** — the only surviving invented frame; entirely built from attested pieces but whole-frame unattested; do not build more instances of "as X as I can" until Q2 is answered. **4** — `dicere` unaccented is deliberate (proparoxytone). **6** — proclitic choice is provisional (Q3). **10** — doubling after `so'` deliberately unwritten.

---

## Worked decompositions

The pattern: each LEGO is `known-atom → target-atom`, in target order; **sealed** chunks must never be split further because a piece inside them is not a free-standing form.

**Seed 1 — `voglio parlà napulitano cu tte mo`**

| # | Known | Target | Sealed? |
|---|---|---|---|
| 1 | I want | voglio | no |
| 2 | to speak | parlà | no |
| 3 | Neapolitan | napulitano | no |
| 4 | with you | **cu tte** | **SEALED** — written raddoppiamento is frozen to this pair; a bare `tte` LEGO would be a nonsense form, and `cu` + other pronouns doesn't double the same way |
| 5 | now | mo | no |

**Seed 5 — `aggi'a pruvà a parlà cu quacchedun'ato`**

| # | Known | Target | Sealed? |
|---|---|---|---|
| 1 | I'm going to | **aggi'a** | **SEALED** — contraction of aggio + (d)a; never decompose into `aggio` + `a` (learners must never see `aggio a`). Same LEGO serves known "I have to" (legal dual mapping) |
| 2 | to try to | **pruvà a** | **SEALED** — the `a` is pruvà's lexical linker, not the English "to"; splitting it creates a floating `a` that will collide with other preps |
| 3 | to speak | parlà | no (reuse of seed-1 LEGO) |
| 4 | with someone else | **cu quacchedun'ato** | seal the elision `quacchedun'ato` at minimum (quacchedun' is not free-standing); `cu` may split off since here it takes no doubling |

**Seed 10 — `nun so' sicuro si me pozzo arricurdà tutta 'a frase`**

| # | Known | Target | Sealed? |
|---|---|---|---|
| 1 | I'm not sure | **nun so' sicuro** | **SEALED** for now — `so'` alone invites doubling/spelling errors and negation placement questions; keep the negated copula frame whole until the course later teaches `so'` and `nun` separately |
| 2 | if | si | no |
| 3 | I can remember | **me pozzo arricurdà** | **SEALED** — the reflexive `me` belongs to arricurdà but has climbed over pozzo; splitting "I can" → `pozzo` strands the clitic in the wrong LEGO |
| 4 | the whole sentence | **tutta 'a frase** | seal — `tutta` precedes the article (order differs from a naive "the + whole + sentence" build); alternatively teach `'a frase` first and this as its expansion |

Copy this pattern: contractions, clitic-climbing clusters, lexical verb+linker pairs, and frozen-doubling pairs are always sealed; plain content words and reused LEGOs split freely.

---

## Gotchas

1. **Italian-with-a-haircut is THE failure mode.** A frame can be wrong while every word checks out (`fà pratica`, `'o cchiù X pussibbile` — both caught and removed). Rule: every **multi-word frame** needs whole-frame attestation or explicit native sign-off. Word-by-word lookup only clears single words.
2. **One orthography, normalized on entry.** Sources mix ≥3 systems (š-forms, `fa'`-truncation, Italianizing). Convert every attested form to the classical standard (Orthography section) before it touches a seed — correct: `saccio`, `parlà`, `jurnata`, `mo`; reject: `sacc'`, `parla'`, `iurnata`, `mo'`.
3. **Raddoppiamento in the wild is inconsistent.** House rule (locked): write it only in `cu tte` and after fem-pl `'e` (`'e pparole`); leave it unwritten after `so'`/`è` (`so' sicuro`). Apply mechanically or LEGO decomposition will surface two spellings of the same word.
4. **Clitic + governed infinitive has two live orders.** Course uses proclitic `a m'arricurdà`; enclitic `a arricurdarme` also exists. One pattern course-wide (Q3 decides which), or reflexive LEGOs break ZUT.
5. **Possession is `tené` (tengo), NEVER `avé`.** `aggio` appears only inside `aggi'a`. Any "I have a/the X" seed → `tengo`.
6. **"in" has two written shapes (`'n`/`in`) plus `int'a` (inside).** Frozen: `'n napulitano` after dicere; language names after parlà go bare (`parlà napulitano`). One choice per function; don't mix.
7. **Lenition doublets can't all be desk-verified.** `spiegà/spiecà`, `napulitano/napolitano` — Rocco is online only through letter C, so S–Z words are unverifiable at the desk. Batch every S–Z spelling question for the native (Q6); meanwhile use the modern common form and tag medium.
8. **Learned borrowings ration.** `sicuro/frase/parola` are individually justified and attested. Each NEW borrowing needs its own justification line, or the course drifts to Italian-with-articles-swapped.

---

## Native-check questions

Blocking for ship/scale. Q1–Q8 as originally framed; Q9–Q10 added at handoff.

1. "Try to do X": is `pruvà a + inf` (attested *stongo pruvanno pure a fa' parlà*, *aggio pruvato a summuzzà*) the everyday Naples form, or `cercà 'e + inf`? Same answer for gerund (`stongo pruvanno a…`) and plain infinitive (`aggi'a pruvà a…`)?
2. "As much/as often as I can": `'o cchiù (spisso) ca pozzo` natural, or `'o cchiù pussìbbele` / `quanto cchiù pozzo` / other? (Decides seeds 3 and 7.)
3. Reflexive under a governed infinitive: `a m'arricurdà na parola` or `a arricurdarme na parola` — which is normal speech? (Becomes course-wide law.)
4. "In Neapolitan" after dicere: `'n napulitano`, `in napulitano`, or another frame — and which should be written?
5. Is `nun so' sicuro si…` natural or bookish? Would `nun saccio si…` be more real? Is `frase` fine for "sentence"?
6. Spellings Rocco can't settle: `spiegà` vs `spiecà`; `ogge` vs `oje`; `pussìbbele` ending (-ele/-ile) if that frame survives Q2.
7. Written doubling rule you'd want learners to see: after `so'`/`è` (`so' ssicuro`?), or only frozen spellings like `cu tte`?
8. Read all 10 targets aloud: flag ANYTHING that feels like translated Italian rather than what a Neapolitan would say — however small.
9. *(new)* Does `'mparà` = "learn" take a reflexive in everyday speech (`me voglio 'mparà…`), and can it also mean "teach" — if so, how do we keep the two apart when "teach" enters the course?
10. *(new)* Is clause-final `mo` (`…cu tte mo`, `…napulitano mo`) the natural position, or does `mo` prefer another slot?

---

## Instructions to Opus for continuing (seeds 11+)

**Translation workflow per new canonical seed:**
1. **Reuse first.** Scan the LOCKED DECISIONS checklist and seeds 1–10. Any English chunk already mapped gets its locked target verbatim — no synonyms, no respelling. Never introduce a second target for a locked known (ZUT), and never a second known-side phrasing for material the learner hasn't been given.
2. **New single words:** attest before use. Sources in reliability order: nap.wikipedia article prose (matches our orthography), Rocco A–C (Wikisource), Di Giacomo / classic song lyrics, native blogs (*Labboratorio 'e Napulitano*, Ermete's Peacebook). Normalize spelling to the standard (Orthography rules 1–8). No hit → mark **low confidence**, queue for native, prefer recasting the seed to avoid the word.
3. **New multi-word frames:** attestation of the *whole frame* or low-confidence + native queue. This is Gotcha #1 and it is absolute. When unattested, prefer recasting into attested pieces (the `ca pozzo` recast of seeds 3/7 is the model: replace the calque frame with a relative clause built from known parts).
4. **New governing verbs:** determine the linking preposition (`a` / `'e` / bare) by attestation, then seal verb+linker as one LEGO (seed-5 pattern).
5. **Confidence tags, honestly:** high = verbatim attested; medium = composed purely of attested pieces; low = anything with an invented frame or unverifiable spelling. **Low never ships** — it waits for the native. When torn between a plausible guess and flagging: FLAG. A gap is recoverable; a shipped calque teaches thousands of learners wrong Neapolitan.

**Where Neapolitan is thin — default to low-confidence + defer, do not invent:**
- **S–Z initial vocabulary** (Rocco offline past C) — spelling unverifiable at desk.
- **Subjunctive / "I think that…" / "I want you to…" clauses** — Neapolitan mood usage diverges from Italian and is undocumented at our desk; flag every such seed whole.
- **Conditionals and any future reference beyond `aggi'a`** — paradigms not yet established for this course.
- **Comparatives/superlatives beyond the (still-provisional) `'o cchiù ca pozzo`** — frozen pending Q2; build no new instances.
- **Plural noun spellings** (fem-pl doubling, metaphonic plurals like `juorno/juorne`) — attest each plural individually; never pluralize by Italian rule.
- **Formal address (`vuje`)** — out of scope until a seed forces it; then it's a native question, not a derivation.
- **Anything where your Italian knowledge supplies the answer instantly** — that instant answer is exactly the Italian-with-a-haircut trap. Treat fluent-feeling output as a warning sign, not a green light.

**Housekeeping:** batch all native questions into the running list (append to the 10 above); keep per-seed notes citing the attestation for each new form; if the native check overturns a locked decision (e.g. Q2 swaps the superlative frame, Q3 flips clitic order), apply the change to **every** instance course-wide in one pass before building further.