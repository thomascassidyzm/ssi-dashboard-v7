# One English word, two target words — estate-wide index of the shipped fixes

**Date:** 2026-08-21 · **Method:** read-only SELECT against the live DB (`course_seeds`, `course_legos`,
`course_practice_phrases`, `courses`), all eng-known courses, sampled by seed band not by random cap.
**Scope note:** `I know` (fact vs person) is deliberately excluded — a prior survey covered it.

**The one structural fact that organises everything below:** the English seed corpus is *shared* across
eng-known courses, so seed *N* is the same English sentence in every course. That makes the estate a
natural experiment: you can read how ~20 different target languages each resolved the *same* English
prompt. Every "fix as shipped" section below is drawn from that.

**The estate's dominant strategy, stated once:** the ambiguity is almost never resolved by a tag. It is
resolved by **never shipping the bare word** — the lego carries enough lexical context that only one target
form is possible. Bracketed tags (`(formal)`, `(plural)`) exist but are a minority dialect used by about 25
courses; the collisions that are still live are, almost without exception, on the **short, bare** cards.

---

## A. FORMAL vs FAMILIAR "you"

### Which languages it bites in, from the data

Confirmed from target forms: **Spanish** (usted), **Mexican Spanish**, **German / Austrian / Swiss German**
(Sie), **French / Canadian French** (vous), **Italian** (lei), **Portuguese / Brazilian Portuguese**
(consigo/o senhor), **Finnish** (te), **Telugu** (మీరు), **Nepali** (formal honorific verb series),
**Hindi** (आप), **Bulgarian** (Вие), **Catalan**, **Persian**, **Korean** (선생님/여사님 + -세요),
**Japanese** (奥様/ご~ですか), **Hakka**, **Swedish** (a lexical `far` case only).

**Determined NOT to bite in Arabic**, contrary to expectation: `ara_for_eng` S0639 ships
`with you sir` → **مَعَكَ سَيِّدي** — `-ka` is the *masculine singular familiar* suffix. Arabic carries the
politeness lexically in `سَيِّدي` and does not switch pronoun register at all. Same for Hakka
(`同你，先生`) — `你` is the plain form.

**Could not determine:** Czech (`ces_for_eng`), Polish (`pol_for_eng`). Both have vy/ty and pan/ty, but
neither course reaches the seed 639–668 formal block (both stop at 300 seeds) and neither ships a
register-tagged card. No evidence either way in the data.

### The fix as shipped — real verbatim English strings

The estate's primary mechanism is **seed-level, not tag-level**: shared seeds **639–655** put the address
term *inside the English sentence*, and every course reads it as a register switch.

| Verbatim English `known_text` | Course | Target form it produces |
|---|---|---|
| `with you sir` | `spa_for_eng` | **con usted**, señor |
| `with you sir` | `deu_for_eng` | mit **Ihnen**, mein Herr |
| `with you sir` | `ita_for_eng` | con **lei**, signore |
| `with you madam` | `por_for_eng` | **consigo**, senhora |
| `how do you feel madam?` | `fra_for_eng` | comment **vous** sentez-**vous** madame ? |
| `how do you feel madam?` | `deu_for_eng` | wie fühlen **Sie** sich, gnädige Frau? |
| `could you say that sir?` | `deu_for_eng` | **könnten Sie** das sagen, mein Herr? |
| `I can help you madam` | `deu_for_eng` | ich kann **Ihnen** helfen, gnädige Frau |
| `what would you like madam?` | `ita_for_eng` | che cosa **vuole**, signora? |
| `can I help you madam?` | `spa_for_eng` | ¿puedo ayudar a **usted**, señora? |
| `how do you feel madam?` | `jpn_for_eng` | ご気分は**いかがですか**、奥様 |

One English string, five languages, five correct formal pronouns, no tag anywhere. **This is the best
single piece of evidence in the whole survey** — `with you sir` is the copy-pasteable canonical form.

The secondary mechanism is the **`(formal)` suffix on the lego card**, used where the phrase has no room
for an address term. `fin_for_eng` is the reference implementation (19 cards, S0639–S0667, calibrated
against 40+ untagged informal counterparts):

- `how are you (formal)` → **miten te voitte**
- `do you want (formal)` → **haluatteko te**
- `could you (formal)` → **voisitteko te**
- `are you (formal)` → **oletteko te**
- `you speak (formal)` → **te puhutte**
- `i'm not sure (formal)` → **en ole varma**

`fra_ca_for_eng` (`you (formal)` → **vous**, `could you (formal)` → **pourriez-vous`), `deu_ch_for_eng`
(`are you (formal)` → **sind Sie**), and `tel_for_eng` (`do you want? (formal question)` → **కావాలా**) ship
the identical shape at the identical seed numbers. Finnish then carries the tag *down into the phrases*
as `, sir` / `, madam` inside the sentence — `do you want a cup of tea, sir?` → **haluatteko te kupin teetä,
herra?** — which is the same seed-level mechanism, applied one level lower.

### Collisions still live

**`fin_for_eng` — `can you`, three answers:**
- `can you` → **voitko** (phrase, S150) — informal singular
- `can you` → **voitko sä** (lego `S0150L01`) — informal singular, pronoun spelled out
- `can you` → **voitteko** (phrase, S529) — formal/plural

The first two are a cosmetic pronoun-drop pair; the third is a genuine register collision under an
identical, untagged English prompt. A learner at S529 who was taught S150 answers `voitko` and is wrong.

**`fin_for_eng` — the S0133 block.** `you work` → **te teette töitä**, and 10 further rows in the same
basket (`you work hard` → *te teette kovasti töitä*, `when do you work?` → *milloin te teette töitä?*).
These are `te`-forms under English with no register or number signal at all. The 2026-08-17 register sweep
examined them and classified them as *plural* rather than formal, and therefore correctly untagged — but
that classification is invisible to the learner, who sees only `you work`. Same at S0501 (`you play
together` → *te pelaatte yhdessä*) and S0154, S0304, S0361.

**`fra_for_eng` S642 — signal dropped in the target:**
`how do you feel this morning madam?` → **comment vous sentez-vous ce matin ?** — the `madame` is simply
missing from the French. The register survives (`vous`), so the answer is not wrong, but the English↔target
correspondence is broken and the learner hears no `madame`.

### Rejected-style approaches still in the data

Bracketed grammar tags are live in **25 courses** on legos and 22 on phrases. Beyond the disciplined
Finnish `(formal)` series, the data contains progressively more grammatical metalanguage in the English:

- `bul_for_eng` `you work (plural/polite)` → работите — a *slashed* tag, two axes in one bracket
- `bul_for_eng` `would you like (plural formal)` → бихте ли искали
- `hin_for_eng` `to you(formal)` → आपको, `tell(polite-subj)` → बताएँ — no space before the bracket, and
  `subj` is bare linguist's shorthand
- `nep_for_eng` is the extreme case — the tag has become a gloss of the morphology, not a cue to the
  learner: `you (formal ergative)` → तपाईंले · `don't you do? (formal neg question)` → गर्नुहुन्न? ·
  `are you looking for? (formal progressive)` → खोज्दैहुनुहुन्छ? · `you are doing (formal honorific
  progressive)` → गर्दैहुनुहुन्छ। · `please tell (formal imperative, sentence-final)` → बताउनुस्।
- `tel_for_eng` similarly: `you are doing (formal reported speech)` → చేస్తున్నారని ·
  `with you (formal plural sociative)` → మీతో
- `fas_for_eng` `in / at (formal preposition)` → در — a *slashed alternative* and a tag together

`nep_for_eng` and `tel_for_eng` are where this pattern has clearly broken down: a learner cannot act on
"formal honorific progressive". Contrast the same job done by seed framing at S0642 in five other courses.

---

## B. SINGULAR vs PLURAL "you"

### Which languages it bites in, from the data

Confirmed: **German/Austrian/Swiss** (ihr), **French/Canadian French** (vous + tous), **Italian** (potete),
**Portuguese/Brazilian** (podem todos), **Spanish/Mexican** (podéis), **Welsh N and S** (chi gyd / chi i
gyd), **Irish** (sibh), **Finnish** (te kaikki), **Arabic and its three dialects**, **Telugu**, **Korean**,
**Japanese**, **Croatian**, **Hakka**, **Chinese**, **Galician**.

### The fix as shipped

Again seed-level, and it is a **single English formula: `you all`**. Shared seeds **656–668** are the
plural block (`with you all`, `can you all put your hands up?`, `are you all ready?`).

| Verbatim English `known_text` | Course | Target |
|---|---|---|
| `can you all put your hands up?` | `deu_for_eng` | **könnt ihr alle** eure Hände heben? |
| `can you all put your hands up?` | `fra_for_eng` | est-ce que **vous pouvez tous** lever la main ? |
| `can you all put your hands up?` | `por_for_eng` | **podem todos** levantar as mãos? |
| `can you all put your hands up?` | `cym_n_for_eng` | fedrwch **chi gyd** rhoi eich dwylo i fyny? |
| `can you all put your hands up?` | `fin_for_eng` | **voitteko te kaikki** nostaa kätenne? |
| `can you all` | `ita_for_eng` | **potete** |
| `can you all` | `spa_for_eng` | **podéis** |
| `you all` | `gle_for_eng` | **sibh** |
| `when you all work together` | `gle_for_eng` | nuair a oibríonn **sibh** le chéile |
| `will you all put your hands up so that I can count them?` | `cym_s_for_eng` | wnewch **chi i gyd** roi eich dwylo lan…? |

`can you all put your hands up?` is the canonical copy-pasteable string: it appears in that exact wording in
at least eight courses and resolves correctly in every one.

### The trap in this formula — a real hazard, not a hypothetical

**`you all` is not a reliable detector**, because English `all` also attaches rightward to a time
expression. Every one of these is a *singular* you, correctly translated as singular:

- `spa_for_eng` `I've been learning with you all day` → Llevo todo el día aprendiendo **contigo**
- `pol_for_eng` `I'll be waiting for you all afternoon` → będę czekał na **ciebie** przez całe popołudnie
- `hrv_for_eng` `he didn't want to wait for you all afternoon` → nije htio čekati na **tebe**…
- `gle_cn_for_eng` `I'm not going to wait for you all day` → níl mé ag goil a fhanacht **leat** ar feadh an lae

Any sweep or QA rule keyed on `\yyou all\y` will report these as plural-you defects. They are not. The
disambiguator is the following word: `you all day` / `you all afternoon` / `you all morning` are the
false-positive set.

### Collisions still live

`fin_for_eng` `you` → **te** (S501) against `sä` everywhere else — see §A, it is the same rows; the register
and number axes collapse onto one untagged English prompt in Finnish.

`fin_for_eng` `can you` → **voitteko** (S529) is number-ambiguous as well as register-ambiguous.

**A negative result worth recording:** `cym_n_for_eng` shows a large number of same-English/different-target
pairs on `you` prompts — 30+ — and **none of them is a ti/chi collision**. They are all orthographic:
`what are you going to do?` → *be' wnei di?* vs *beth wyt ti'n mynd i wneud?* (be'/beth, and a tense
difference); `did you enjoy this book?` → *wnest ti fwynhau'r llyfr 'ma?* vs *…y llyfr 'ma?* (contracted
article); `you speak it very well` → *ti'n siarad hi'n dda iawn* vs *ti'n siarad hi yn dda iawn*. Welsh ships
`ti` throughout and reserves `chi` for `you all` and the polite `chi` cards. The Welsh ti/chi axis is clean.

Likewise `ces_for_eng`'s `could you say that again?` → *mohl bys to říct **ještě*** vs *…**jednou*** is a
lexical variation in "again", not a vy/ty split.

---

## C. "TO BE" splitting two or more ways

### Which languages it bites in, from the data

Confirmed with live collisions: **Spanish**, **Mexican Spanish**, **Portuguese**, **Brazilian Portuguese**,
**Catalan**, **Galician** (all ser/estar); **Scots Gaelic** (tha / is / 's e / bheil — the worst case on the
estate). Confirmed present but **clean**: **Irish** (tá / is / bí), **Welsh N and S** (bod paradigm).

### The fix as shipped

The estate never tags this. It resolves it by **welding the complement onto the lego** so that the copula
is never presented alone. The English string *is* the disambiguator.

**estar / está — state, location, progressive:**

| Verbatim English | Course | Target |
|---|---|---|
| `I'm trying to` | `spa_for_eng` | **estoy** intentando |
| `I'm not sure` | `spa_for_eng` | no **estoy** seguro de |
| `to be quiet` | `spa_for_eng` | **estar** callado |
| `are you learning` | `spa_for_eng` | **estás** aprendiendo |
| `it's not working` | `spa_for_eng` | no **está** funcionando |
| `are you ready` | `por_for_eng` | **estás** pronto |
| `I'm not ready yet` | `por_for_eng` | eu ainda não **estou** pronto |
| `you are learning` | `cat_for_eng` | **estàs** aprenent |

**ser / é — identity, class membership, defining property:**

| Verbatim English | Course | Target |
|---|---|---|
| `we're friends` | `spa_for_eng` / `por_for_eng` | **somos** amigos |
| `than to be perfect` | `spa_for_eng` | que **ser** perfecto |
| `it's useful to` | `por_for_eng` | **é** útil |
| `it's interesting that` | `por_for_eng` | **é** interessante que |
| `what the answer is` | `por_for_eng` | qual **é** a resposta |
| `it's more important` | `spa_for_eng` | **es** más importante |
| `they are people who` | `spa_for_eng` | **son** personas que |

The rule the data actually encodes: **an adjective of state or a progressive → estar; a noun complement or
an evaluative adjective → ser.** `to be quiet` vs `than to be perfect` is the cleanest minimal pair the
estate contains, and both are shipped in the same course.

**Irish** does the same job with `is` vs `tá`, and does it well — the noun-complement English is what
triggers the copula:

- `gle_cn_for_eng` `they are people who have Irish` → **is daoine iad** a bhfuil Gaeilge acu
- `gle_cn_for_eng` `they are people who want to learn` → **is daoine iad** atá ag iarraidh foghlaim
- `gle_cn_for_eng` `it's useful` → **tá sé** úsáideach (adjective → substantive verb)
- `gle_cn_for_eng` `I like` → **is maith liom** · `I don't care about` → **is cuma liom** faoi
- `gle_cn_for_eng` `that is why he didn't know the answer` → **sin é** an fáth nach raibh a fhios aige…

**Welsh** resolves the bod paradigm purely by **person marking in the English**, and it is airtight:
`I'm trying` → **dw i'n** trio · `he's trying` → **mae o'n** trio · `she wants` → **mae hi** isio ·
`do you want?` → **wyt ti** isio? · `have you been learning?` → **wyt ti** 'di bod yn dysgu?

### Collisions still live

**`gla_for_eng` is the worst on the estate — five answers to one prompt:**
> `it is` → **'s e** | **bheil e** | **is** | **is e** | **tha e**

and alongside it `are you` → **a bheil thu** | **a tha thu** | **tha thu**, and `was` → **bh'** | **bha** |
**robh**. These conflate the copula, the substantive verb, and the dependent (post-particle) form, all under
prompts a learner cannot possibly resolve.

**Iberian bare-copula collisions, all live:**

| Course | Prompt | Answers |
|---|---|---|
| `spa_for_eng` | `it is` | **es** \| **está** |
| `spa_for_eng` | `to be` | **estar** \| **ser** |
| `spa_for_eng` | `you are` | **eres** \| **está** \| **estás** \| **Estés** |
| `spa_for_eng` | `they are` | **son** \| **Están** \| **estén** |
| `spa_for_eng` | `it was` | **era** \| **fue** |
| `spa_mx_for_eng` | `is` | **es** \| **está** |
| `por_for_eng` | `is` | **é** \| **está** \| **seja** |
| `por_for_eng` | `they are` | **são** \| **estão** \| **estão a** |
| `por_br_for_eng` | `it is` | **é** \| **está** |
| `cat_for_eng` | `it is` | **és** \| **està** |
| `cat_for_eng` | `we are` | **estem** \| **som** |
| `glg_for_eng` | `you are` | **es** \| **estás** |

Note that the *same course* that resolves `to be quiet`/`than to be perfect` perfectly also ships bare
`to be` → estar | ser. The failure is entirely a function of card length: **the short cards are where
this class lives.**

**Irish is clean.** Every apparent `it's`/`I'm` collision in `gle_for_eng` is capitalisation only —
`it's true` → *tá sé fíor* | *Tá sé fíor*. Worth stating plainly so nobody re-opens it.

### Rejected-style approaches still in the data

`cat_for_eng` S0137 ships `to be (infinitive)` → **ser**. The tag names the wrong axis entirely — *estar* is
also an infinitive — so it looks like a disambiguator and disambiguates nothing.
`cat_for_eng` S0112 `was / it was` → **va ser** uses a slashed alternative on the English side.

---

## D. "TO KNOW HOW TO" vs "to know of/about" vs "to be able to"

### Which languages it bites in, from the data

Confirmed: **Finnish** (osata / voida / pystyä / tietää / tuntea — a four-way split, the deepest on the
estate), **Spanish**, **Italian**, **Portuguese**, **Catalan**, **Czech**, **Irish**, **Bengali**,
**Korean**, **Hindi**, **Marathi**, **Thai**, **Southern Min** (`nan_for_eng`).

**Could not determine for French.** `fra_for_eng` ships `to know` → **savoir** at S0045, S0347 and S0581 and
`I know` → **je sais**, but has **no `know how to` card at all** — the shared seed 59/60 pair, which every
other mature course uses for exactly this, is realised in French without the "how". So there is no French
evidence in the data for the savoir+infinitive ability sense, in either direction.

### The fix as shipped

The English formula is literally **`know how to`**, and it is honoured at shared seeds 59/60:

| Verbatim English | Course | Target |
|---|---|---|
| `I know how to` | `ita_for_eng` | **so come** |
| `I don't know how to` | `ita_for_eng` | non **so** come |
| `I know how` | `cat_for_eng` | **sé** com |
| `I know how to` | `ces_for_eng` | **vím, jak** |
| `I know how to` | `gle_for_eng` | **Tá a fhios agam conas** |
| `know how to` | `fin_for_eng` | **osata** |
| `I don't know how yet` | `fin_for_eng` | mä en vielä **osaa** |
| `I know how to do` | `kor_for_eng` | 어떻게 **하는지 알아요** |
| `know how to do` | `mar_for_eng` | कसं करायचं ते **माहीत आहे** |
| `I don't know how to say` | `ben_for_eng` | আমি কীভাবে বলতে হয় **জানি না** |
| `don't know how to` | `nan_for_eng` | **袂曉** |

**Finnish is the reference implementation of the whole four-way split**, and its English side is precise
enough that each verb is reachable:

- **osata** (learned skill): `know how to` → osata · `I don't know how yet` → mä en vielä osaa
- **pystyä** (capacity, managing it): `I'm able to` → **mä pystyn** · `as hard as I'm able to` → niin kovasti
  kuin **pystyn** · `as soon as you're able to` → niin pian kuin **pystyt** · `I wasn't able to answer` →
  mä en **pystynyt** vastaamaan · `to be able to come and help` → **pystyä** tulemaan auttamaan
- **voida** (possibility/permission): `can I` → **voinko** mä · `could you` → **voisitko** sä ·
  `I can stay` → mä **voin** jäädä
- **tietää** (fact): `I know` → mä **tiedän** · `I don't know why` → mä en **tiedä** miksi
- **tuntea** (person): `I know him` → mä **tunnen** sen · `you're acquainted with` → sä **tunnet**

`I'm able to` / `as soon as I'm able to` is the copy-pasteable English formula that reliably buys *pystyä*
rather than *voida*. That is the piece other courses do not have.

### Collisions still live

**`fin_for_eng` — English `can` is not resolvable.** Across all `can`/`can't` practice phrases the split is
**voida 226 · pystyä 54 · osata 1**, with no English-side marker separating them. At lego level:
- `can` → **voi** | **voida**
- `can i` → **voinko** | **voinko mä**
- `i'm able to` → **mä pystyn** | **pystyn**

and `I can't` → **mä en pysty** (S0024) sits in the same course as `I can stay` → **mä voin jäädä** (S0276).
A learner who is taught *en pysty* for "I can't" has no way to know that "can" flips to *voida* elsewhere.
**`I'm able to` is the working English cue for pystyä; bare `can` is the hole.**

A second Finnish hazard, in the reverse direction: **voida also means "to feel"** —
`how do you feel` → miten sä **voit** · `I'm feeling fine` → mä **voin** hyvin · `to feel better` →
**voida** paremmin. So *voitko sä* is genuinely two-ways ambiguous in the target.

### Rejected-style approaches still in the data

`hin_for_eng` S0060 ships `I don't know how(m)` → कहना नहीं आता। — `(m)` is a bare gender tag with no space,
tagging the speaker's gender rather than the know-how axis. `fra_for_eng` S0251 ships
`find out` → **savoir**, which is a paraphrase rather than a tag but has the same effect: the English no
longer contains "know" at all.

---

## E. A verb whose OBJECT CASE / ASPECT changes with the sense

### Which languages it bites in, from the data

Confirmed with live collisions: **Russian**, **Polish**, **Ukrainian**, **Czech**, **Croatian**,
**Bulgarian** (aspect pairs); **Finnish** (partitive vs total object); **Portuguese** (preterite vs
imperfect under one English past). **Could not determine for Greek** — `ell_for_eng` stops at 300 seeds and
produced no same-English/two-target pair on the bare-infinitive probe.

### The Finnish case — and an honest gap

The 2026-08-21 `kysyä` sweep fixed three rows (`mä kysyin **sen** keskiviikkona` → `mä kysyin **sitä**
keskiviikkona`; `kysyitkö sä sen` → `kysyitkö sä sitä`) and records explicitly: **"No English prompt was
changed. The known side is untouched on all three rows."**

That is the finding. **For verb-governed case, Finnish resolves nothing on the English side, by design** —
`kysyä` demands the partitive whether or not the English says so, so `I asked it` has exactly one correct
Finnish answer and there is nothing to disambiguate. The class only becomes a *learner-facing* ambiguity
where the case is **semantically** contrastive (bounded vs unbounded), and there the English does carry it:

| Verbatim English | Course | Target — total object |
|---|---|---|
| `I want to say the whole sentence` | `fin_for_eng` | mä haluun sanoa **koko lauseen** |
| `to remember the whole sentence` | `fin_for_eng` | muistaa **koko lauseen** |
| `do I remember the whole sentence` | `fin_for_eng` | muistanko mä **koko lauseen** |
| `I'm trying to say the whole sentence in Finnish` | `fin_for_eng` | mä yritän sanoa **koko lauseen** suomeksi |

**`the whole X`** is the shipped English formula that forces the total object. It is used consistently across
12 rows and there is no counter-example. There is no corresponding shipped formula for forcing the
*partitive* — no `a bit of` / `some of` / `part of` cards exist in `fin_for_eng`.

Note also the cognate-object exception the sweep documented and deliberately preserved:
`kysyä muutaman kysymyksen` — "ask a few questions" takes a total object because the question is the bounded
thing the asking produces. Any rule keyed on "kysyä ⇒ partitive" will false-positive on 7+ rows.

### Slavic aspect — the fix as shipped

The English formula that works is **`to keep …ing`** and **`used to`** for the imperfective:

| Verbatim English | Course | Target (imperfective) |
|---|---|---|
| `to keep asking you` | `pol_for_eng` | **pytać** cię |
| `to keep explaining` | `pol_for_eng` | **wyjaśniać** |
| `to keep changing` | `pol_for_eng` | się **zmieniać** |
| `used to` | `pol_for_eng` | **kiedyś** |
| `someone I used to know` | `pol_for_eng` | ktoś kogo kiedyś **znałem** |
| `used to work in an office` | `ces_for_eng` | **dříve pracoval** v kanceláři |
| `to keep on doing this` | `ces_for_eng` | v tom **pokračoval** |
| `to continue/keep on` | `rus_for_eng` | **продолжать** |
| `finish all of it` | `pol_for_eng` | **skończymy wszystko** (perfective, via `all of it`) |

`to keep asking you` → *pytać* against bare `to ask` → *zapytać* **in the same course** is the cleanest
demonstration on the estate that the English formula does the work.

### Collisions still live

Bare infinitives are unresolved across every Slavic course:

| Course | Prompt | Answers |
|---|---|---|
| `rus_for_eng` | `i said` | **сказал** \| **я говорил** \| **я сказал** |
| `rus_for_eng` | `to ask` | **спрашивать** \| **спросить** |
| `rus_for_eng` | `to give` | **давать** \| **дать** |
| `pol_for_eng` | `to do` | **robić** \| **zrobić** |
| `pol_for_eng` | `to ask` | **pytać** \| **zapytać** |
| `pol_for_eng` | `to read` | **czytać** \| **poczytać** |
| `pol_for_eng` | `to give` | **dać** \| **dawać** |
| `ces_for_eng` | `to do` | **dělat** \| **udělat** |
| `ces_for_eng` | `to understand` | **pochopit** \| **rozumět** |
| `ces_for_eng` | `to finish` | **dokončit** \| **skončit** |
| `ukr_for_eng` | `to give` | **давати** \| **дати** |
| `hrv_for_eng` | `to take` | **uzeti** \| **uzimati** \| **odvesti** |
| `bul_for_eng` | `to write` | **напише** \| **да напише** |
| `por_for_eng` | `i had` | **tinha** \| **tive** |

`rus_for_eng` `i said` is the sharpest: *я говорил* (was saying / used to say) and *я сказал* (said, once,
completed) are different events, and the English prompt is identical.

Two of these are **not** aspect and should not be swept as such: `rus_for_eng` `to learn` → учить | учиться
and `pol_for_eng` `to learn` → uczyć | się uczyć are the transitive/reflexive pair (teach-a-subject vs
study), and `hrv_for_eng` `to ask` → pitati | zamoliti is ask-a-question vs ask-a-favour. Both are real
instances of the one-English-word problem class, just on a different axis.

### Rejected-style approaches still in the data

`rus_for_eng` `to continue/keep on` → продолжать and `rus_for_eng` `at all/completely` → совсем are slashed
alternatives on the English side. `bul_for_eng`'s `да`-prefixed pairs (`to say` → кажа | да кажа) are not a
disambiguation attempt at all — they are the same verb with and without the subjunctive particle, shipped
under one prompt.

---

## F. HAVE / possession splitting

### Which languages it bites in, from the data

Confirmed: **Irish** (all three dialect courses), **Welsh N** (gan) and **Welsh S** (gyda), **Spanish**
(tener/haber/hay), **Mexican Spanish**, **Portuguese** and **Brazilian Portuguese** (ter/haver/há),
**French** (avoir / il y a), **Italian**, **German** (haben / es gibt), **Finnish** (adessive *sillä on* vs
copula *se on*).

**Could not determine for Russian** — `rus_for_eng` has no seed_count recorded and produced no
`у меня есть` / `иметь` pair on the probe. No evidence in the data.

### The fix as shipped — Irish is the best-worked example on the estate

`gle_cn_for_eng` separates **four** senses of English "have" cleanly, and the English side carries every
one of them:

| Sense | Verbatim English | Target |
|---|---|---|
| possession | `I have Irish` | **Tá** Gaeilge **agam** |
| possession | `I've got too much work` | **tá** an iomarca oibre **agam** |
| possession | `I've got an important meeting` | **Tá** cruinniú tábhachtach **agam** |
| possession, 2sg | `you have good Irish` | **Tá** Gaeilge mhaith **agat** |
| possession, neg | `I don't have enough time` | **Níl** mo dhóthain ama **agam** |
| obligation | `I have to` | **caithfidh mé** |
| obligation, past | `I had to` | **b'éigean dom** |
| obligation, 2sg | `do you have to` | **an gcaithfidh tú** |
| perfect auxiliary | `I've learnt a lot` | tá go leor **foghlamtha agam** |
| perfect auxiliary | `that I've done a lot` | go bhfuil go leor **déanta agam** |
| perfect auxiliary | `have you seen` | **an bhfaca tú** |
| experiential | `did you have a good time` | **an raibh** am maith **agat** |

The English distinctions that carry the load are `have to` (obligation), `'ve + past participle` (perfect),
and `have/'ve got + noun` (possession). All three are ordinary English, none is a tag.

### The Welsh N/S A-B — a direct controlled comparison

Same English string, two dialect courses, two possession constructions. This is the cleanest evidence in the
survey that the English side is genuinely dialect-neutral here:

| Verbatim English | `cym_n_for_eng` (gan) | `cym_s_for_eng` (gyda) |
|---|---|---|
| `I've got` | **mae gen i** | **mae gyda fi** |
| `have you got?` | **oes gynnoch chi?** | **oes 'da chi?** |
| `she has` (possession) | **mae ganddi** | **ma gyda hi** |
| `she has` (perfect) | **mae hi wedi** | **mae hi 'di** |
| `have you had?` | wyt ti 'di cael? | wyt ti 'di cael? |
| `it had finished` | oedd o 'di gorffen | oedd e 'di **cwpla** |

The English `I've got` vs `have you had?` split maps exactly onto the possession vs perfect split in both
courses. The English is doing the work; the dialect only changes which possession construction fills the
slot.

### Collisions still live

**`she has` — live in both Welsh courses, and it is a real ambiguity, not a spelling one:**
- `cym_n_for_eng` `S0268L01` `she has` → **mae ganddi** (possession)
- `cym_n_for_eng` `S0289L01` `she has` → **mae hi wedi** (perfect auxiliary)
- `cym_s_for_eng` `S0285L04` `she has` → **ma gyda hi** (possession)
- `cym_s_for_eng` `S0307L04` `she has` → **mae hi 'di** (perfect auxiliary)

Both courses teach possession first and the auxiliary ~20–40 seeds later, under an identical two-word
English prompt. This is the textbook shape of the problem class.

**The same collision, four more languages:**

| Course | Prompt | Answers |
|---|---|---|
| `spa_for_eng` | `he has` | **ha** (aux) \| **tiene** (possession) |
| `spa_for_eng` | `i have` | **He** (aux) \| **Tengo** (possession) |
| `spa_for_eng` | `to have` | **tener** \| **Tener** |
| `fin_for_eng` | `she has` | **se on** (copula/perfect) \| **sillä on** (adessive possession) |
| `ita_for_eng` | `he has` | **ha** \| **si sia** |
| `por_for_eng` | `we have` | **temos** \| **temos de** (possession vs obligation) |
| `por_for_eng` | `to have` | **para ter** \| **ter** |
| `deu_for_eng` | `to have` | **haben** \| **zu haben** |

`por_for_eng` `we have` → temos | temos de is the possession/obligation axis surfacing under a bare prompt —
the exact distinction `gle_cn_for_eng` handles correctly by never shipping bare `have`.

**A defect found in passing, worth a separate look:** `gle_for_eng` `S0096L03`
`I have a little more time` → **tá beagán níos mó ama** — the possessive `agam` is simply missing. The Irish
reads "there is a little more time", not "I have". Its `gle_cn` sibling ships the `agam` correctly at the
equivalent cards. Not part of this class, but it is a wrong answer sitting under a "have" prompt.

### Rejected-style approaches still in the data

None found in this class — no bracketed possession tags and no slashed alternatives anywhere in the
have/possession cards. The estate handles F entirely by English-side lexical framing, which is why the
residual collisions are all on cards of two or three words.

---

## What the six problems have in common

1. **Card length predicts the defect.** Every live collision listed above is on a card of ≤4 English words.
   Every successful disambiguation is on a card long enough to carry a complement, a modal, or an address
   term. The estate already knows the fix — it just does not apply it to short cards.
2. **Seed-level framing beats tagging.** Shared seeds 639–668 solve A and B for ~20 languages at once with
   two English formulas (`…sir` / `…madam`, and `you all`) and no metalanguage. Where tagging was used
   instead, it degrades — `nep_for_eng`'s `(formal honorific progressive)` is unusable by a learner.
3. **Three English formulas are doing most of the work estate-wide** and are worth promoting to doctrine:
   `with you sir` / `how do you feel madam?` (register) · `can you all put your hands up?` (plural) ·
   `to keep …ing` and `the whole X` (aspect/boundedness).
4. **Two detector traps to encode before anyone sweeps on this:** `you all day`/`you all afternoon` is not
   plural-you (§B), and `kysyä + total object` is legitimate with a cognate object (§E).

---

## Gaps, stated explicitly

- **Czech and Polish formal/familiar (§A)** — undetermined. Neither course reaches the formal seed block and
  neither ships a register tag; there is no evidence in the data either way.
- **French `savoir` + infinitive (§D)** — undetermined. `fra_for_eng` has no `know how to` card at all.
- **Greek object/aspect (§E)** — undetermined; no same-English/two-target pair surfaced.
- **Russian possession (§F)** — undetermined; no `у меня есть` / `иметь` contrast in the data.
- **Fan-out was refused.** This survey was planned as six parallel scouts. The dispatch API returned
  *FAN-OUT CEILING — depth*: this conversation already sits at depth 2 of its fan-out tree, so no worker
  was created and none of problems C–F was farmed out. All six were done in this session instead, which is
  why the sampling is by seed band and targeted probe rather than exhaustive per-course enumeration.
  A fuller pass — every course, every card, not just the mature 668-seed ones — is still available and would
  mostly extend §C and §E into the 300-seed courses.
