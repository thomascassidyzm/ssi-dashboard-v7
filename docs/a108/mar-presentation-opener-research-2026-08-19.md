# Marathi presentation opener — research and verdict

**Course family:** every course whose *known* language is Marathi (`presentation_templates.known_lang = 'mar'`).
**Date:** 2026-08-19. **Research only — no code or database changes were made.**
**Constraint honoured:** we have no Marathi speaker. Everything below is corpus evidence from Marathi-language sources written by Marathi speakers, or it is marked as unsourced.

---

## 0. The defect, confirmed

The live row really is the emergency fallback. Read directly from `presentation_templates`:

```
mar | priority 5 | active=true | "{target_lang_name} — '{known}' — '{seed}' —:"
```

The emergency fallback literal in the code:

```js
// services/phases/presentation-author.cjs:84
const fallback = `{target_lang_name} — '{known}' — '{seed}' —:`
```

Character-identical. Marathi learners are being read an error state. Two other rows are in the same condition — `kan` and `tel` — byte-for-byte the same string. `hin` and `urd` are a different, milder defect (they end in a stray second locative `में`/`میں` instead of a copula).

For contrast, a healthy row (`spa`, priority 10):

```
En {target_lang_name} — '{known}' — como en — '{seed}' — es:
```

The Marathi row is missing all three joining elements: **no word for "in", no "as in", no verb.**

---

## 1. VERDICT

**"In ⟨LANGUAGE⟩" = `{target_lang_name} भाषेत`** — literally "in the ⟨LANGUAGE⟩ language", the name left **uninflected as an attributive**, with the case ending landing on **भाषा** ("language"), a native Marathi word whose behaviour we control and which never changes.

**Recommended full frame:**

```
{target_lang_name} भाषेत ‘{known}’ — जसं ‘{seed}’ — म्हणजे
```

**Runner-up (warmer, one word shorter, but see the two break cases in §5):**

```
{target_lang_name}मध्ये ‘{known}’ — जसं ‘{seed}’ — म्हणजे
```

**Confidence: HIGH for the opener (§2, §5). MEDIUM-HIGH for the full frame (§3).**

> **Revision note 1 (after workers #244, #247).** The first published version recommended a frame ending `याला {target_lang_name}मध्ये असं म्हणतात:`, flagging its forward-pointing `असं` as the one thing I could not source. That join is gone: **म्हणजे** does the same work and is directly sourced (§3d). Two other corrections are marked **[CORRECTED]**.
>
> **Revision note 2 (after worker #246) — I have changed the opener from `मध्ये` to `भाषेत`.** I recommended `मध्ये` in revisions 1 and 2 on naturalness grounds. #246 produced a break case I could not rebut and had explicitly listed as an open gap in my own §5 — **`मध्ये` fuses with a name ending in a halant, and fails on multi-word names.** Since the brief states that staying correct whatever name is substituted "may matter more than elegance," that decides it. Full argument and verification in §5. The old recommendation is preserved as the runner-up rather than deleted, because on *warmth* it is still the better string and a native reviewer may well prefer it.

**Orthography-independence is the main result.** `भाषेत` has it *by construction* — the case ending never touches the substituted name, so the name's gender, ending, halant and word count are all irrelevant. `मध्ये` has it *almost* — it attaches to the bare name with no oblique, but fuses with `माल्टिज्` and is unattested on the four multi-word names. `-त` does **not** have it and breaks on ~96 of 107 names. §5 is the evidence, including a control experiment and a cited grammar rule.

---

## 2. "In English" — the exact string, and why not the obvious one

There are three candidate ways to put a Marathi language name into the locative. All three are real Marathi. Only one of them is safe in a *template*.

| | Form | What it is |
|---|---|---|
| (a) | `इंग्रजीत` | सप्तमी विभक्ती suffix **-त** directly on the name |
| (b) | `इंग्रजीमध्ये` | postposition **मध्ये** on the bare name |
| (c) | `इंग्रजी भाषेत` | "in the English language" — name uninflected, भाषा carries the case |

### The measurement

Exact-string (`insource:`) counts on Marathi Wikipedia, 2026-08-19. `insource:` matches the literal wikitext, so these are occurrences of the actual string, not fuzzy matches.

| Language name | ends in | `+त/-ात` | `+मध्ये` | `भाषेत` |
|---|---|---|---|---|
| इंग्रजी (English) | -ी | **566** | 196 | 45 |
| हिंदी | -ी | **212** | 133 | 72 |
| मराठी | -ी | **736** | 530 | 208 |
| जपानी (Japanese) | -ी | **0** | 3 | 44 |
| चीनी (Chinese) | -ी | **0** | 0 | 9 |
| गुजराती | -ी | 17 | 19 | 28 |
| बंगाली | -ी | 15 | 24 | 36 |
| फारसी | -ी | 5 | 3 | 8 |
| अरबी | -ी | 4 | 10 | 22 |
| पंजाबी | -ी | 2 | 10 | 7 |
| उर्दू | -ू | **0** | 21 | 32 |
| तेलगू | -ू | **0** | 16 | 9 |
| जर्मन (German) | **cons.** | **0** | 9 | 17 |
| फ्रेंच (French) | **cons.** | 1 | 17 | 28 |
| स्पॅनिश (Spanish) | **cons.** | **0** | 9 | 9 |
| लॅटिन (Latin) | **cons.** | **0** | 26 | 7 |
| डच (Dutch) | **cons.** | **0** | 6 | 3 |
| ग्रीक (Greek) | **cons.** | **0** | 9 | 18 |
| रशियन (Russian) | **cons.** | **0** | 2 | 20 |
| इटालियन (Italian) | **cons.** | **0** | 1 | 6 |
| पोलिश (Polish) | **cons.** | **0** | 1 | 2 |
| कन्नड (Kannada) | **cons.** | **0** | 44 | 37 |
| तामिळ (Tamil) | **cons.** | **0** | 14 | 6 |
| वेल्श (Welsh) | **cons.** | **0** | 0 | 1 |
| थाई (Thai) | -ई | **0** | 0 | 2 |
| माओरी (Maori) | -ी | **0** | 0 | 3 |

*(Method: `https://mr.wikipedia.org/w/api.php?action=query&list=search&srsearch=insource:"…"`. `-त` was tested as `-त` after a vowel and `-ात` after a consonant — the two forms a suffixing rule would produce. `जर्मनात`, `फ्रेंचत`, `स्पॅनिशत`, `लॅटिनत` are all **0**.)*

### What this shows

**The `-त` suffix is lexically restricted, not phonologically conditioned.** It is not a rule you can apply to a name; it is a fossil on a handful of names Marathi has lived with for centuries — इंग्रजी, हिंदी, मराठी, and weakly on गुजराती/बंगाली/अरबी/फारसी/पंजाबी. It is **zero** for जपानी and चीनी, which end in exactly the same -ी as इंग्रजी. Phonology cannot explain that; lexical familiarity can.

So a template of the shape `{target_lang_name}त` would produce the correct, idiomatic `इंग्रजीत` for the one language name a designer is most likely to test with — and then produce unattested strings for the great majority of the ~110 names CLDR can substitute. **This is precisely the bug class the brief asks us to avoid: a template that assumes the shape of one substituted name.**

`मध्ये` and `भाषेत` are both attested across vowel-final *and* consonant-final names. Zeroes in those two columns track how rarely Marathi Wikipedia discusses that language at all (वेल्श appears 79 times in total; योरुबा 8), not ungrammaticality.

---

## 3. The full frame

### 3a. What Marathi actually does — attested

The native pattern for "in ⟨LANG⟩, X is called Y" is verb-final with **म्हणतात** ("they call / it is called"):

> «स्वल्पविराम चिन्हाला **हिंदीत** 'अल्पविराम चिन्ह' व **इंग्रजीत** 'काॅमा' **म्हणतात**.»
> *"The comma mark is called 'alpaviram chinha' in Hindi and 'comma' in English."*
> — [विरामचिन्हे, mr.wikipedia](https://mr.wikipedia.org/wiki/विरामचिन्हे)

> «**इंग्रजीत याला** हायफन **म्हणतात**.» — *"In English this is called a hyphen."*
> — [विरामचिन्हे](https://mr.wikipedia.org/wiki/विरामचिन्हे)

> «नाव नीलगाय असे पडले आहे, **इंग्रजीत याला** ब्लूबुल **असे म्हणतात**.»
> — [नीलगाय](https://mr.wikipedia.org/wiki/नीलगाय)

> «**याला इंग्रजीत** ग्लेशियर **असे म्हणतात**.» — [हिमनदी](https://mr.wikipedia.org/wiki/हिमनदी)

> «**इंग्रजीत त्याला** ‘ऑटिझम’ **म्हणतात**.» — [स्वमग्नता](https://mr.wikipedia.org/wiki/स्वमग्नता)

> «केवळ दिसण्यावरून **याला इंग्रजीत** इंडियन बायसन **असे म्हणतात**.» — [रानगवा](https://mr.wikipedia.org/wiki/रानगवा)

> «या राज्यांना **जर्मनमध्ये** बुंडेस्लँडर(Bundesländer) **म्हणतात**.»
> — [क्षेत्रफळानुसार जर्मन राज्यांची यादी](https://mr.wikipedia.org/wiki/क्षेत्रफळानुसार_जर्मन_राज्यांची_यादी)

> «ज्याला **लॅटिनमध्ये** 'प्लांटागो अम्प्लेक्सी कॅनालिस' **म्हणतात**.» — [इसबगोल](https://mr.wikipedia.org/wiki/इसबगोल)

`म्हणतात` on mr.wikipedia: **4,537** occurrences; `असे म्हणतात`: **1,840**.

**The structural problem this creates for us.** Marathi is verb-final. In every attested example the answer sits *before* `म्हणतात`. Our template must **end**, because the answer is a separate audio clip appended after it. So we cannot use the attested frame as-is.

Japanese and Korean, the two other verb-final languages already in `presentation_templates`, solved exactly this problem the same way — with a converb that can precede the answer:

```
jpn | {known}、「{seed}」のように、を{target_lang_name}で言うと：     ("when you say it in X:")
kor | '{known}'. '{seed}'처럼. 를 {target_lang_name}로 하면:          ("if you do it in X:")
```

### 3b. Marathi *also* has a verb-less gloss convention — and it is directly attested with a colon

This is the shape our template needs, and Marathi writers use it:

> «क्रिस्तोफर कोलंबसने हे बेट ३ नोव्हेंबर १४९२ रोजी शोधुन काढले व त्याला ह्या दिवसाचे (रविवार, **लॅटिनमध्ये: dominica**) नाव दिले.»
> — [डॉमिनिका, mr.wikipedia](https://mr.wikipedia.org/wiki/डॉमिनिका)

> «शेफा (शेफर्ड्स समूह, एफाते – **फ्रेंचमध्ये: शेफा**)» — [व्हानुआतू](https://mr.wikipedia.org/wiki/व्हानुआतू)

> «=== अपूर्णविराम (:) (**इंग्रजीत: Colon**) ===» — [विरामचिन्हे](https://mr.wikipedia.org/wiki/विरामचिन्हे)

> «(**इंग्रजीत: full stop**)», «(**इंग्रजीत: comma**)» — same article.

And the same article defines the colon itself, in Marathi, as exactly the device we are using:

> «जेव्हा एखादा तपशील द्यावयाचा असतो तेव्हा त्या तपशीलाच्या आधी (:) हे अपूर्णविरामाचे चिन्ह वापरतात.»
> *"When some detail is to be given, this colon mark is used before that detail."*
> — [विरामचिन्हे](https://mr.wikipedia.org/wiki/विरामचिन्हे)

**So the trailing colon in the template is correct Marathi punctuation for "the answer follows", on a Marathi source's own account.** That part of the existing template was never the bug.

### 3c. The "as in" clause

Marathi's ordinary "such as / like" is **जसे की** (923 occurrences) or **उदाहरणार्थ** "for example" (707). `जसे` alone: 1,743.

Because this is a *spoken* course, the -े form should be written as the spoken -ं form: **जसं**. **[CORRECTED — the first version of this doc said `जसं की`.** Worker #247 found `जसं की` unattested in its searches and recommends bare **`जसं`**. I am taking that: `जसे की` is well attested in *writing*, but the spoken-orthography compound is not evidenced, and bare `जसं` is.]

The best source for the alternation is Marathi Wikipedia's own article on the grammarian **कृष्ण श्रीनिवास अर्जुनवाडकर**, which states the -े ending becomes a long -a **संभाषणात** ("in conversation") and **संवादलेखनात** ("in dialogue writing") — giving the exact pair we need, «जसें ऐवजी जसं आणि तसें ऐवजी तसं» ("जसं instead of जसें, and तसं instead of तसें"). — [कृष्ण श्रीनिवास अर्जुनवाडकर, mr.wikipedia](https://mr.wikipedia.org/wiki/कृष्ण_श्रीनिवास_अर्जुनवाडकर) *(found by worker #247)*

A second, independent source for the same phonology:

> "In day-to-day communication, words ending with vowel ए (e) are said in little differently. Instead of pronouncing ए (e), the consonant is pronounced elongated… this is indicated by अनुस्वार; though there is no nasal sound." Examples given: झाडे → झाडं, पाने → पानं.
> — [Pronunciation of Anusvar, Learn Marathi With Kaushik](https://learnmarathiwithkaushik.com/courses/pronunciation-of-anusvar-अनुस्वार/)

The corpus counts confirm the register split — Marathi Wikipedia is written register, so it is overwhelmingly -े: `असे म्हणतात` **1,840** vs `असं म्हणतात` **28**; `जसे की` **923** vs `जसं की` **0**. **This is not evidence that जसं is wrong — it is evidence that Wikipedia is not spoken Marathi.** For a spoken card, `जसं` / `असं` are the right choices; for a written card, `जसे` / `असे`.

### 3d. म्हणजे — the join, and it is sourced **[CORRECTED — this replaces the doc's original recommendation]**

Marathi has a dedicated word for exactly this job, and it is medial, so **the answer lands last with no cataphora and no copula at all**.

Wiktionary's entry for **म्हणजे** (adverb) gives two senses:

> 1. "meaning, that is to say"
> 2. **"used for definitions or translations"**
>
> Usage examples:
> «जल **म्हणजे** पाणी» — *"जल (jal) means पाणी (pāṇī)."*
> «什么 **म्हणजे** काय?» — *"What does 什么 mean (in Marathi)?"*
> — [म्हणजे, English Wiktionary](https://en.wiktionary.org/wiki/म्हणजे) *(surfaced by worker #247; I re-fetched and verified it independently)*

Three things fall out of that entry, and each of them fixes a specific problem:

1. **It is lexicographically defined as the translation-gloss word.** Not inferred from examples — stated.
2. **Neither example has a copula.** The equivalence rides on म्हणजे alone. So the "missing copula" in the broken template turns out not to need supplying at all — see the corrected note below.
3. **The second example puts a Chinese-script string in the subject slot** and repairs nothing. That is our case exactly: arbitrary foreign strings with no Marathi gender or number.

`म्हणजे` occurs **6,817** times on Marathi Wikipedia. It is attested in precisely our frame, on both a consonant-final and a vowel-final language name:

> «**संस्कृतमध्ये**, न्याय … **म्हणजे** समानता, सादृश्यता, लोकप्रिय म्हण…»
> — [संस्कृत न्याय, mr.wikipedia](https://mr.wikipedia.org/wiki/संस्कृत_न्याय) *(worker #244)*

> «**बंगालीत** साधुभाषा **म्हणजे** शुद्ध वा उच्च कोटीची भाषा.»
> — [बंगाली भाषा, mr.wikipedia](https://mr.wikipedia.org/wiki/बंगाली_भाषा) *(worker #244)*

### The recommendation

```
Frame B (with seed):  {target_lang_name} भाषेत ‘{known}’ — जसं ‘{seed}’ — म्हणजे
Frame A (no seed):    {target_lang_name} भाषेत ‘{known}’ — म्हणजे
```

Gloss: *"In ⟨LANG⟩, ‘{known}’ — as in ‘{seed}’ — means: ⟨answer clip⟩"*

**A colon after म्हणजे is optional and probably redundant** — worker #247's point, which I accept: म्हणजे already carries the pause. The existing template's trailing colon was never wrong (§3b), it is simply not needed once म्हणजे is there.

**Two honest caveats on this frame:**

- **Direction.** Both Wiktionary examples run *foreign → Marathi* (`जल म्हणजे पाणी`). Our card runs *Marathi → foreign*. The leading locative `{target_lang_name}मध्ये` is what disambiguates, and the संस्कृतमध्ये / बंगालीत examples show the locative doing exactly that job. But the reversed direction is **not separately attested** and I am marking it as such.
- **Scope.** `इंग्रजीमध्ये ‘X’ म्हणजे ‘Y’` could in principle be read as "in English, the word X means Y", implying X is English — when in fact X is the Marathi chunk. English has the identical ambiguity ("in English, *bolne* is *to speak*") and resolves it by context; I expect Marathi does too, but this is **UNSOURCED** and is the item I would put in front of a native listener first.

### Runner-up

More idiomatic, but it gives up the answer-final position, so it does not fit a template that must end before the answer clip:

```
{target_lang_name} भाषेत ‘{known}’ — जसं ‘{seed}’ — याला ‘…’ असं म्हणतात.
```

This is the shape of the closest attested analogue of our card that anyone found:

> «**जपानी भाषेत** जपानला "निहोन" किंवा "निप्पोन" **असं म्हणतात**.»
> — [जपान, mr.wikipedia](https://mr.wikipedia.org/wiki/जपान) *(worker #247)*

**Do not try to have both by inverting to `याला असं म्हणतात ‘{B}’`.** Marathi is verb-final; worker #247 searched for that inversion and found zero attestation. That would be inventing Marathi.

### Third option, if both of the above are rejected

The bare gloss convention of §3b, with the source term fronted — `{target_lang_name} भाषेत ‘{known}’:`. It is 100% attested (`लॅटिनमध्ये: dominica`, `इंग्रजीत: full stop`) and 0% invented. Its cost is that it has no verb at all, and spoken aloud it is terse — closer to a dictionary headword than to a teacher talking. Given the brief's standard is *natural spoken*, I rank it third. It is still enormously better than the current string.

**On the copula. [CORRECTED]** The brief flags the missing copula as part of the defect. The finding is that **Marathi does not want `आहे` here** — but not for the reason I first gave.

The first version of this doc argued that `आहे` would raise a gender-agreement problem with arbitrary foreign strings. **That reasoning was wrong, and it was the one claim in the doc I had explicitly marked as my own unsourced inference.** Worker #247 sourced the actual facts: the Marathi *present* copula inflects for **person and number only, never gender**.

> "The present and presumptive copula distinguish person and number, while the past, subjunctive and contrafactual ones distinguish person, number and gender."
> — [Marathi, Languages Gulper](https://languagesgulper.com/eng/Marathi.html)

So the gender worry evaporates. `आहे` is nonetheless still the wrong choice here, for a different and better-evidenced reason: **it is clause-final.** An `आहे` frame ends on the copula rather than on the answer — reintroducing exactly the structural problem this template has to solve. And every attested gloss in §3a–§3d uses `म्हणतात`, `म्हणजे`, or no verb at all — never `आहे`.

The practical upshot: **the recommended frame needs no copula, because `म्हणजे` supplies the equivalence by itself** (§3d).

---

## 4. Does the frame change with what follows? — **No.**

**Nothing in the frame is conditioned by the shape of the material that follows it.**

- **No vowel/consonant sandhi across the boundary.** The colon and the quoted answer are separated by a pause; Marathi has no article and no liaison at this junction. I found no attested variation.
- **`मध्ये` does not change** whether the following quoted item is a single word (`लॅटिनमध्ये: dominica`), a multi-word phrase (`स्पॅनिशमध्ये एस्तादोस युनिदोस मेक्सिकानोस`), or a clause.
- **Fragment vs full sentence:** the attested examples cover both — a single noun (हायफन, ग्लेशियर, ऑटिझम), a multi-word proper name (युनी व्हॅन झुइड-आफ्रिका), and a glossed phrase (पल्याडचा काठ "the far shore") — with no change to the frame.
- **The one place shape *does* matter is upstream, in the language name itself** — and that is §5.

Worker #247 tested this from the corpus rather than assuming it, and found the same frame used unchanged before three quite different kinds of following material:

> before **vowel-initial Latin script**: «इंग्रजीत याला **Athena** किंवा Gamma Geminorum म्हणतात» — [आर्द्रा (नक्षत्र)](https://mr.wikipedia.org/wiki/आर्द्रा_(नक्षत्र))
> before a **whole imperative clause**: «एकमेकांना **"तिळगूळ घ्या, गोड गोड बोला"** असं म्हणतात»
> before **Devanagari**, throughout §3a above.

**The one real variation it found:** a full *reported-speech clause* takes an extra `की`; a **quoted string does not**. Our `{known}` and `{seed}` are quoted strings, so `की` is not wanted.

*(Marked partly UNSOURCED: "Marathi has no articles and no liaison at this junction" remains an absence-of-evidence finding, now backed by two independent corpus searches that found no variation, but by no source positively stating there is none.)*

---

## 5. Orthography-independence — the general lesson, tested

This is the part the brief said may matter more than elegance, so I tested it rather than asserting it.

### The question

`मध्ये` is a postposition. In Marathi, a noun before a case suffix or a postposition normally changes to its **सामान्यरूप** (oblique / "general form"):

> «विभक्ती प्रत्यय लावण्यापूर्वी नामाच्या किंवा सर्वनामाच्या स्वरूपात जो बदल होतो त्याला सामान्य रूप असे म्हणतात.»
> *"The change that occurs in the form of a noun or pronoun before a case suffix is applied is called the सामान्यरूप."*
> — [विभक्ती, marathivyakaran.com](https://marathivyakaran.com/विभक्ती/)

The same source gives the सप्तमी (locative) suffixes as **त, ई, आ**.

If language names took सामान्यरूप, the template would be unsafe — the oblique form depends on the noun's gender and final segment, which we cannot know for an arbitrary substituted name.

### The control experiment

Compare a native Marathi noun with a foreign language name, same postposition:

| Noun | bare + मध्ये | oblique + मध्ये |
|---|---|---|
| **घर** (house, native neuter) | घरमध्ये — **0** | घरामध्ये — **43** |
| **गाव** (village, native neuter) | गावमध्ये — 9 | गावामध्ये — **314** |
| जर्मन | जर्मनमध्ये — **9** | जर्मनामध्ये — **0** |
| फ्रेंच | फ्रेंचमध्ये — **17** | फ्रेंचामध्ये — **0** |
| स्पॅनिश | स्पॅनिशमध्ये — **9** | स्पॅनिशामध्ये — **0** |
| लॅटिन | लॅटिनमध्ये — **26** | लॅटिनामध्ये — **0** |
| डच | डचमध्ये — **6** | डचामध्ये — **0** |
| ग्रीक | ग्रीकमध्ये — **9** | ग्रीकामध्ये — **0** |
| रशियन | रशियनमध्ये — **2** | रशियनामध्ये — **0** |
| कन्नड | कन्नडमध्ये — **44** | कन्नडामध्ये — 1 |
| तामिळ | तामिळमध्ये — **14** | तामिळामध्ये — **0** |
| पोलिश | पोलिशमध्ये — **1** | पोलिशामध्ये — **0** |
| इटालियन | इटालियनमध्ये — **1** | इटालियनामध्ये — **0** |

The native nouns invert exactly as the grammar predicts. The language names do not take सामान्यरूप at all — **they behave as unassimilated proper nouns and stay invariant.** Eleven names tested, one stray hit total.

### The single best attestation

One Marathi Wikipedia sentence carries four different language names, of two different shapes, all taking bare `मध्ये`:

> «…**पंजाबीमध्ये** खुसरा किंवा झांखा म्हणून, **कन्नडमध्ये** मंगलमुखी (ಮಂಗಳಮುಖಿ) किंवा छक्का (ಚಕ್ಕ), **सिंधीमध्ये** पावा आणि **गुजरातीमध्ये** पावा (खद्र) म्हणून…»
> — [हिजडा, mr.wikipedia](https://mr.wikipedia.org/wiki/हिजडा)

पंजाबी, सिंधी, गुजराती end in -ी; कन्नड ends in a consonant. Identical marking. That is orthography-independence demonstrated inside one attested Marathi sentence.

And a vowel-final and a consonant-final name coordinated in one clause:

> «देशाचे **इंग्रजीमध्ये** युनियन ऑफ साउथ आफ्रिका आणि **डचमध्ये** युनी व्हॅन झुइड-आफ्रिका असे नाव देण्यात आले…»
> — [दक्षिण आफ्रिका, mr.wikipedia](https://mr.wikipedia.org/wiki/दक्षिण_आफ्रिका)

Marathi Wikipedia editors also write this form routinely as piped link text — `[[कन्नड भाषा|कन्नडमध्ये]]`, `[[स्पॅनिश भाषा|स्पॅनिशमध्ये]]`, `[[फ्रेंच भाषा|फ्रेंचमध्ये]]`, `[[जर्मन भाषा|जर्मनमध्ये]]`, `[[डच भाषा|डचमध्ये]]`, `[[पंजाबी भाषा|पंजाबीमध्ये]]`, `[[सिंधी भाषा|सिंधीमध्ये]]` — i.e. they treat `⟨NAME⟩मध्ये` as the productive way to say "in ⟨that language⟩", whatever the name.

### The rule behind the control experiment — now sourced [ADDED, worker #246]

My control experiment showed *that* language names stay invariant. Worker #246 found the grammar source saying *why*. marathivyakaran.com's सामान्यरूप page carries a table headed **«सामान्यरूप न होणाऱ्या शब्दांची यादी»** ("list of words that do not take सामान्यरूप"), and two of its eight classes are exactly our case:

> **१. विशेष नामे** — «व्यक्ती किंवा ठिकाणांच्या नावांत बदल होत नाही.» *("names of people or places do not change")* — अशोक, हिमालय, जळगाव
> **५. परभाषिक शब्द (इंग्रजी इ.)** — «परकीय भाषांतील शब्द अनेकदा आहे तसेच राहतात.» *("words from foreign languages often stay just as they are")* — स्टेशन, फोटो, बस, कोट
> — [सामान्यरूप, marathivyakaran.com](https://marathivyakaran.com/सामान्य-रूप/) *(found by #246; I re-fetched and verified the wording)*

A language name is **both** — a proper noun and a foreign word. That is the rule my `घर`/`गाव` control was measuring. #246 confirmed it independently on loanwords: स्टेशनमध्ये **22** / स्टेशनामध्ये **0**; हॉटेलमध्ये **100** / हॉटेलामध्ये **0**.

**Consequence for `-त`:** the locative `-त` *requires* a सामान्यरूप stem to attach to. Foreign proper nouns have none. So `-त` has nothing to attach to — which is why the corpus shows zero, not a rarity. #246 puts the breakage at **96 of 107** CLDR names and adds the killer datapoint: **तामिळत, कन्नडत, मल्याळमत are all 0** — neighbouring Indian languages that appear constantly in Marathi text. If any consonant-final name took `-त`, those would.

### Two break cases for `मध्ये` — why I changed the recommendation [worker #246, verified]

I had `मध्ये` as the pick and listed multi-word names as an explicit unsourced gap. #246 closed that gap, against me, and found a second break I had not considered.

**1. Halant fusion.** CLDR's Marathi name for Maltese is **`माल्टिज्`** — it ends in a consonant carrying a *halant* (्). Writing `मध्ये` solid onto it gives `माल्टिज्मध्ये`, where the final `ज्` fuses with the `म` of `मध्ये` into a **ज्म conjunct**. The name stops being visually separable and a TTS voice reads it as one fused word. A space-separated frame cannot do this: `माल्टिज् भाषेत` leaves the name intact.

**2. Multi-word names.** Verified counts:

| | attested |
|---|---|
| `स्कॉटिश गेलिक` (the bare name) | 17 |
| `स्कॉटिश गेलिक भाषेत` | **1** |
| `स्कॉटिश गेलिकमध्ये` | **0** |

CLDR gives four multi-word Marathi names — `स्कॉटिश गेलिक`, `दक्षिणी सोथो`, `पश्चिमी फ्रिशियन`, `उत्तरी सामी`. `भाषेत` is attested with one of them; `मध्ये` with none.

**3. And on plain frequency, `भाषेत` leads on the names that matter.** Head-to-head on consonant-final names, roughly 2:1:

| | `भाषेत` | `मध्ये` |
|---|---|---|
| जर्मन | **17** | 9 |
| ग्रीक | **18** | 9 |
| फ्रेंच | **28** | 17 |
| स्पॅनिश | 9 | 9 |
| पोलिश | **2** | 1 |
| डच | 3 | **6** |

**The decisive point is structural, not statistical: with `भाषेत` the case ending never touches the substituted name at all.** It lands on `भाषा`, a native Marathi word we control. The name's gender, its final segment, its halant, its word count — all become irrelevant. That is orthography-independence by construction rather than by observation, and it is exactly the property the brief asked to be prioritised over elegance.

### Verdict on the three candidates [REVISED]

| Frame | Orthography-independent? | Register | Recommendation |
|---|---|---|---|
| `{name}त` / `{name}ात` | **NO — breaks on ~96 of 107 names.** No सामान्यरूप stem to attach to. Correct only for a lexical handful. | most colloquial | **Do not use in a template.** |
| `{name} भाषेत` | **YES, by construction** — the case ending never touches the name. Survives halant-final and multi-word names. Broadest attestation. | neutral-to-slightly-formal | **Recommended.** |
| `{name}मध्ये` | **Almost** — attaches to the bare name with no सामान्यरूप, but **fuses with `माल्टिज्`** and is unattested on multi-word names. | warmest of the safe options | **Runner-up.** Take it if a native reviewer prefers the warmth, but special-case the halant-final and multi-word names. |

**On register, the one point that cuts the other way.** #246 surfaced [Berntsen & Nimbkar, *Spoken Marathi*](https://www.pennpress.org/9780812274578/spoken-marathi-book-1/) saying "with foreign words, and especially names, many speakers avoid the -t suffix and use instead the word *madhe*" — which favours `मध्ये` for speech. **#246 could not verify it**: the full-text host returned "under maintenance" on every fetch, so no page number and no surrounding paragraph. I am recording it as a real argument for the runner-up, from a source neither of us could read in context. Nothing else rests on it — its claim about `-त` is independently confirmed by the corpus.

What tips it back is that the attested `भाषेत` sentences *are* our card:

> «त्याला **जर्मन भाषेत** ''वाइनाख्टन'' असे म्हणतात.» — [जर्मनी, mr.wikipedia](https://mr.wikipedia.org/wiki/जर्मनी)

That is the idiom for this exact sentence type, not a formal retreat from it.

### A qualification I want on the record, from worker #244

Worker #244 mined 15 attested gloss sentences by an independent method (targeted web search rather than `insource:` counting), and its breakdown by name shape runs like this:

| | `-त` suffix | `मध्ये` direct | `भाषेत` periphrasis |
|---|---|---|---|
| Vowel-final (इंग्रजी, हिंदी, बंगाली, जपानी, चिनी) | 5 | 2 | 1 |
| **Consonant-final** (संस्कृत, स्पॅनिश, लॅटिन, इटालियन, फ्रेंच, जर्मन, ग्रीक) | **0** | 1 | **8** |

Its zero for `-त` on consonant-final names independently reproduces my §2 result by a different method — that finding is now doubly evidenced and I regard it as settled.

But its consonant-final column favours **`भाषेत`** 8-to-1 over `मध्ये`, where I ranked `मध्ये` first. **These are not in contradiction** — my `insource:` counts show `मध्ये` is solidly attested on consonant-final names (`लॅटिनमध्ये` 26, `कन्नडमध्ये` 44, `फ्रेंचमध्ये` 17, `जर्मनमध्ये` 9), so it is not a grammaticality question. But #244 was sampling *precisely our genre* — "in X, Y means Z" — and within that genre `भाषेत` may simply be what Marathi writers reach for when the name ends in a consonant.

**[SUPERSEDED — I have since taken #244's side.]** When #244 alone reported this, I held the `मध्ये` recommendation, reasoning that 15 search-found sentences are a convenience sample rather than a frequency estimate. Worker #246 then reported independently, from a grammar-reference angle rather than a corpus one, and reached the same conclusion via the two structural break cases below. **Two independent workers converging on `भाषेत` by different methods, plus a break case I could not rebut, is enough to move me.** #244's genre table stands as the first evidence that pointed this way.

---

## 5b. A separate defect: three CLDR strings are wrong whatever frame you pick

Worker #246 spotted this and it is independent of everything above — it is about the *names* the renderer substitutes, not the frame around them. The names come from `Intl.DisplayNames` in the `mr` locale (`localisedLangName()`, `services/phases/presentation-author.cjs:124` and following). I enumerated ~110 of them and verified #246's three flags directly against corpus usage:

| CLDR `mr` gives | mr.wikipedia occurrences | Marathi corpus actually writes | occurrences |
|---|---|---|---|
| **`माल्टिज्`** (Maltese) | **0** | `माल्टीज` / `माल्टी` | 4 / 12 |
| **`तेलगू`** (Telugu) | 247 | **`तेलुगू`** | **1,044** |
| **`चीनी`** (Chinese) | 426 | **`चिनी`** | **911** |

`माल्टिज्` is the serious one: **zero occurrences anywhere in Marathi Wikipedia.** It is not a spelling preference, it is a string no Marathi writer uses — and it is the same string whose trailing halant fuses under `मध्ये` (§5). `तेलगू` and `चीनी` are attested but minority spellings, outvoted roughly 4:1 and 2:1 by `तेलुगू` and `चिनी`.

**No fix is proposed here** — this is research only, and choosing whether to override CLDR names is a separate decision with its own blast radius across every course. Flagging it because it would otherwise be invisible: a perfect template still reads a wrong language name aloud.

---

## 6. Confidence, and what would change my mind

| Claim | Confidence | What would overturn it |
|---|---|---|
| The `mar` row is the emergency fallback and is broken | **HIGH** | Nothing — it is character-identical to the literal in the source file. |
| "in ⟨LANG⟩" should be `{name} भाषेत` | **HIGH** on safety; **MEDIUM-HIGH** on naturalness | A Marathi speaker calling `भाषेत` stiff and preferring `मध्ये`. That is a live possibility (Berntsen & Nimbkar lean that way for speech) — take it if they say so, but special-case `माल्टिज्` and the four multi-word names. |
| `{name}त` is unsafe in a template | **HIGH** | Attested examples of `जपानीत`, `जर्मनात`, `कन्नडत` etc. Three separate searches by two workers and me found none, across a corpus with 566 of `इंग्रजीत`. Now also explained by a grammar source, not just observed. |
| Language names take no सामान्यरूप | **HIGH** | Both a cited grammar rule (विशेष नामे + परभाषिक शब्द) and a reproducible control experiment would have to be wrong. |
| `माल्टिज्` fuses under `मध्ये` | **HIGH** | It is a mechanical property of the halant; `माल्टिज्` + `मध्ये` forms a ज्म conjunct. |
| The three CLDR name strings are wrong (§5b) | **MEDIUM-HIGH** | Corpus preference is clear for तेलुगू/चिनी and `माल्टिज्` is genuinely absent — but "what the corpus prefers" is not the same as "what SSi should brand them", which is a house call. |
| `म्हणजे` is the right join, and needs no copula | **HIGH** | Wiktionary defines it as the definition/translation word and both its examples are copula-less; two mr.wikipedia sentences use it in our exact frame. |
| The frame reversed to *Marathi → foreign* reads correctly | **MEDIUM** | A native listener hearing `इंग्रजीमध्ये ‘X’ म्हणजे ‘Y’` as claiming X is English. Attested examples run the other way (§3d). This is the item to arbitrate first. |
| The frame is invariant to what follows | **MEDIUM-HIGH** | Two independent corpus searches found no conditioning, including before vowel-initial Latin script and before a full clause; still partly absence-of-evidence. |
| Spoken register wants `जसं`/`असं` over `जसे`/`असे` | **HIGH** | Now directly sourced to a Marathi grammarian's own article giving «जसें ऐवजी जसं» for संभाषण. Whether an SSi card counts as speech is still a house-style call, not a fact. |

---

## 7. Explicit gaps

- **No Marathi speaker has reviewed any of this.** Everything is corpus inference. The two items I would put in front of a speaker first are the **direction/scope question** in §3d (does `इंग्रजीमध्ये ‘X’ म्हणजे ‘Y’` correctly mean "X is Y in English", or does it imply X is English?) and the **`मध्ये` vs `भाषेत`** naturalness call in §5.
- **Marathi Wikipedia is written register.** It cannot attest spoken forms, and its counts systematically under-represent `जसं`/`असं`. The register claim is now sourced to a grammarian's article rather than to corpus counts, but no spoken corpus was consulted.
- **`webshodhinmarathi.in`**, a Marathi-language site teaching English vocabulary — the closest genre to our card — returned HTTP 403 to automated fetching. That was the source most likely to show the exact teaching frame in natural register, and I could not read it.
- **An OSU 2019 paper on Marathi's two copulas** (आहे "particular" vs असतो/असते "characterizing/generic") could not be read: worker #247 reports the PDF is subset-font CID-encoded and yielded no extractable text, so only its title is cited. A definition is arguably a *characterizing* statement, so it might argue for `असतं`. It does not move the recommendation — `म्हणजे` takes no copula and sidesteps the contrast — but it could move the §3d copula analysis.
- **`insource:` search is punctuation-insensitive**, so I could not *count* the colon shape `⟨LANG⟩मध्ये:`. The colon examples in §3b are from full-text article extracts read directly, not from counts.
- **The Berntsen & Nimbkar *Spoken Marathi* quote could not be read in context** — the full-text host returned "under maintenance" on every fetch, so no page number and no surrounding paragraph. It is the one source that speaks directly to *spoken* register, and it leans toward the runner-up (§5).
- **`जसं की` is unattested**; bare `जसं` is what the doc now recommends (§3c).
- **All three dispatched workers have now reported** (#244 corpus, #246 morphology, #247 spoken frame). No further evidence is in flight. Where they disagreed with me I have said so and shown which way I went and why.
- `kan` and `tel` carry the identical broken string and are **not** covered by this document; `hin` and `urd` have a related but different defect (a doubled locative where the copula should be).

---

## 8. Punctuation notes (from worker #247)

- **Sentence-final stop is the full stop `.`, not the danda `।`.** Marathi Wikipedia's [विरामचिन्हे](https://mr.wikipedia.org/wiki/विरामचिन्हे) frames दंड (।) as the Sanskrit/Modi-era practice that Candy's reforms replaced.
- **Cited word-forms take single curly quotes ‘ ’**; quoted *utterances* take double. Our `{known}` and `{seed}` are cited forms, so single. The current template uses ASCII `'…'`.
- **A colon (अपूर्णविराम) is legitimate** and uniquely takes a space before it in Marathi typography — but it is redundant after `म्हणजे`, which already carries the pause.

---

*Research only. No code or database changes were made. Revised twice on 2026-08-19 as workers #244, #247 and #246 reported. Corrections and reversals are marked **[CORRECTED]**, **[REVISED]** or **[SUPERSEDED]** in place rather than silently overwritten, so the reasoning that changed is auditable.*
