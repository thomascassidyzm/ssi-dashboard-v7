# Neapolitan (Napulitano) → English — `nap_for_eng`

**Verdict: hardest of the batch — 8 of 10 seeds flagged.** No standardised orthography, near-empty
online paradigm tables (Wiktionary has **zero** Neapolitan conjugation tables).
**Needs heavy native involvement or it doesn't work** — and no Neapolitan checker
is available (2026-07-03). The failure mode sits exactly where it's most dangerous: "plausible
Italianised guess" that an Italian-speaking reviewer wouldn't catch either.

**Status:** Fable probe only. No DB rows, no LEGOs, no audio. `nap` present as manifest code but
**needs a `database_code`** before any build.

Sources: [Wikipedia: Neapolitan language](https://en.wikipedia.org/wiki/Neapolitan_language) ·
[nap.wikipedia.org](https://nap.wikipedia.org/) · [Wikibooks: Neapolitan](https://en.wikibooks.org/wiki/Neapolitan) ·
Wiktionary (thin — many entries are bare "alternative spelling of…" stubs).

---

## 1. Orthography decision: classical/literary, strict & consistent

There is **no standard** (Wikipedia lists *arbero/arvero/àvaro* as three spellings of "tree"). Three
practices exist: (A) classical/literary — writes final unstressed vowels etymologically even though
all are pronounced schwa [ə], articles *'o/'a/'e*, *j* for /j/; (B) scholarly-phonetic (schwa as
*ë/ə*); (C) ad-hoc apostrophe (final vowels dropped inconsistently — *sacc'*, *facenn'*).

**Use (A)**: it's the convention of essentially the entire written corpus (song tradition,
nap.wikipedia, dictionaries); it's the only one internally consistent enough to survive our ZUT/dedup
tooling; writing final vowels preserves gender/number/person visually (*parlo/parle/parla* all sound
[ə] but stay distinct on the page). Enforce: always write the final vowel (never *sacc'*), articles
*'o/'a/'e/ll'*, *j* not *i*, accent on truncated infinitives (*parlà, vulé, pruvà*), **Naples-city
forms only** (the "Neapolitan" online corpus spans Irpinia, south Lazio, Abruzzo — pin the city variety).

## 2. Where "just tweak the Italian" fails

The **skeleton transfers** (modal + bare infinitive, SVO, pro-drop, *cu* = "with"). Everything below
must be **re-derived, not tweaked**:

- **Articles — a different system + a gender Italian lacks.** *'o* (m), *'a* (f), *'e* (both plural,
  f.pl. doubles the noun's first consonant), *ll'* (before vowel), *nu/na/n'* (indefinite). **Neuter**
  = *'o* + doubled consonant, a real meaning difference: *'o napulitano* = the Neapolitan man vs
  *'o **nn**apulitano* = the Neapolitan language.
- **Possession uses `tené` (like Spanish *tener*)**: *tengo famma*, not Italian *ho fame*. `avé` is
  mostly auxiliary/modal. Possessives are **postposed** (*'a casa mia*); kinship takes enclitics
  (*pàtemo* "my dad", no article).
- **Auxiliary generalises to `avé`** where Italian needs *essere* (*aggio stato*, never *songo stato*).
- **No synthetic future in speech** — see the ZUT collision below.
- **`èssere` vs `stà`**: broadly Italian-like (identity vs location/temporary/progressive) but leans
  on *stà* harder (*addó staje?*). **Do not copy the Italian course's essere/stare choices blindly.**
- **Metaphony**: stressed-vowel change carries gender/number (*luongo/longa*), so m/f and sg/pl pairs
  often can't be derived by swapping a final vowel — the stem changes. **Never generate metaphonic
  forms** — dictionary or native only.
- **Vocabulary genuinely different**: *accattà* (buy, not *comprare*), *tené* (have), *guaglione*
  (boy), *jamme* (let's go), *mo* (now), *jì/vaco* (go), *pummarola* (tomato).

## 3. Core verb forms (present) — Naples-city

- **vulé (want)**: voglio · vuó · vô · vulimmo · vulite · vonno
- **parlà (speak)**: parlo · parle (⚠ *-e*, not It. *-i*; check) · parla · parlammo · parlate · parlano
- **èssere (be, identity)**: songo/so' · sî · è · simmo · site · songo (⚠ 1sg = 3pl)
- **stà (be located/temporary/progressive)**: stongo · staje · sta · stammo · state · stanno
- **puté (can)**: pozzo · può · pô · putimmo · putite · ponno → "I can speak" = *pozzo parlà* (bare inf)
- **pruvà (try)**: ⚠ **whole paradigm unverified online**; expected *provo*… but 2sg + u/o alternation
  uncertain; "try to speak" preposition (*pruvà a parlà*?) unverified
- Possession: **tené** — tengo, etc.

Pronouns: io · tu · isso/essa · nuje · vuje (also polite sg) · isse/lloro. Negation: **nun** before
verb. Infinitives truncate + accent: *parlà, vulé, pruvà, puté, durmì, fà, sapé, tené* (but *èssere*
keeps full form).

## 4. Seeds 1–10 (Fable candidate — classical orthography, NOT native-verified)

| # | English | Neapolitan | Conf. | Flag |
|---|---|---|---|---|
| 1 | I want to speak Neapolitan with you now | **voglio parlà napulitano cu tte mo** | HIGH | — |
| 2 | I'm trying to learn | **stongo pruvanno a 'mparà** | MED | **YES** — *pruvà*/gerund/prep |
| 3 | how to speak as often as possible | **comme parlà 'o cchiù spisso pussibbile** | LOW-MED | **YES** — superlative frame is an Italian calque |
| 4 | how to say something in Neapolitan | **comme dicere quaccosa 'n napulitano** | MED | **YES** — *'n* for "in [language]" unverified |
| 5 | I'm going to practise speaking with someone else | **aggi'a fà pratica parlanno cu quaccheduno ato** | LOW-MED | **YES** — *aggi'a* future (see §5); *fà pratica* calque |
| 6 | I'm trying to remember a word | **stongo pruvanno a m'arricurdà na parola** | MED | **YES** — progressive aux; reflexive/clitic syntax |
| 7 | I want to try as hard as I can today | **voglio pruvà 'o cchiù pussibbile ogge** | LOW-MED | **YES** — superlative frame; *pruvà* |
| 8 | I'm going to try to explain what I mean | **aggi'a pruvà a spiegà chello ca voglio dicere** | MED | **YES** — *aggi'a* future (see §5); *spiegà* |
| 9 | I speak a little Neapolitan now | **parlo nu poco 'e napulitano mo** | MED-HIGH | — |
| 10 | I'm not sure if I can remember the whole sentence | **nun songo sicuro si me pozzo arricurdà tutta 'a frase** | MED | **YES** — *sicuro/frase* Italian intrusions?; assumes male speaker |

Only **1 and 9** are safe to build on. Verified lexicon: *dicere, mparà, arricurdà, ca, cchiù,
quaccosa, ogge, comme, mo, spisso*. Unverified: the entire *pruvà* paradigm, the superlative frame,
*pussibbile*, *fà pratica*, *spiegà*, *sicuro*, *frase*, *parola*, *'n [language]*.

## 5. `aggi'a` covers both "going to" and "have to" — this is fine (NOT a ZUT issue)

Neapolitan has **lost the morphological future** in speech; the natural prospective is
**`aggi'a` + infinitive** (*aggia parlà*), which is also how "I have to" is expressed. Two different
English prompts mapping to the same Neapolitan form is **allowed** — ZUT only forbids the reverse
(one known → two different targets). So "I'm going to speak" and "I have to speak" both → *aggia
parlà* is perfectly natural and needs no special handling. Use *aggi'a* for the prospective.
*(Corrected 2026-07-03 — an earlier draft wrongly called this a ZUT collision; many-known→one-target
is exactly what ZUT permits.)*

## 6. Opus-escalation guidance

Because the online record is so thin, Opus won't reliably fix the lexical gaps either — this course
is **native-first, not model-first**. Where Opus helps: ruling on the **`pruvà a` complement** (4 of
10 seeds), the **progressive `stongo` vs `sto`** boundary (poisons every "-ing" seed if wrong), and
whether the **superlative frame** is a calque. But *pussibbile/frase/sicuro/parola* and every
metaphonic form must come from a dictionary or a Naples speaker — never generated.

**Lint (mechanical, cheap):** flag word-final apostrophes (schwa-drop drift), the letters *k/w/x/y*
(not in the Neapolitan alphabet), Italian-only forms (*il/la/le*, *comprare*, *adesso*, *andare*-forms),
and inconsistent *cu te / cu' tte / cu tte* — freeze **`cu tte`** course-wide. Our dedup/ZUT tooling
will treat spelling variants as different LEGOs, so orthographic consistency must be enforced up front.

## 7. Bottom line
Structure adapts from Italian; articles, auxiliaries, possessives, future, "to be", "to need", every
metaphonic form and the whole spelling layer do not. This course needs a native Naples reviewer **in
the loop earlier and more heavily than any standard-language course** — recommend not committing to it
until such a reviewer is found. Sicilian (`scn`) / Sardinian have more online presence and may be
better first bets among Italian minority languages.
