# Marathi locative for language names — which template survives all 107 CLDR names

**Question:** a card reads *"In &lt;LANGUAGE&gt;, X is Y"*. The `<LANGUAGE>` slot is filled at render time from CLDR `mr` with a name we do not control. Which Marathi frame stays grammatical **whatever** name lands in the slot?

**Answer up front:** `<NAME> भाषेत`. It is the only one of the three candidates that survives all 107 names. `<NAME>त` breaks on **96 of 107**.

Research method: published Marathi grammars + a quantitative corpus probe of Marathi Wikipedia via the MediaWiki `insource:` search API (exact-substring counts over ~100k articles). Every count below is reproducible with:

```
https://mr.wikipedia.org/w/api.php?action=query&list=search&format=json&srsearch=insource:"<phrase>"
```

---

## 1. The Marathi locative (सप्तमी विभक्ती) — allomorphs and conditioning

Marathi's seventh case has three suffixes, not one.

[English Wikipedia, *Marathi grammar*](https://en.wikipedia.org/wiki/Marathi_grammar) gives the paradigm as **7th / Saptamī / locative: singular `-ta`, `-i`, `-ā`; plural `-ṁta`, `-ī`, `-ā`**, and states the conditioning is **semantic, not phonological**:

> "-ta suffix has connotation of location inside a well-defined area in space or time" … "-ī has connotation of location at a less well defined space."

Worked example from the same source: **घरात** (*gharāt*) "in (a) house" vs **घरी** (*gharī*) "at (a) home".

[Marathi Wikipedia, *विभक्ती*](https://mr.wikipedia.org/wiki/विभक्ती) gives the full declension of मुंगी:

> सप्तमी — **मुंगीत** (sg.) / **मुंग्यांत** (pl.)

The [*Marathi Reference Grammar* (Berntsen & Nimbkar)](https://pdfcoffee.com/spoken-marathi-reference-grammar-pdf-free.html) adds that the `-ī` locative behaves differently from `-त`:

> "The locative functions as an adverb. It is formed by adding **-i directly to the noun without requiring a change to the oblique form**." — with *ghar → ghari*, *pay → payi*, *sakal → sakali*

**This matters:** `-त` **does** require the oblique; `-ी` does not. Only `-त` is a candidate for our template, and `-त` is the one that carries the oblique requirement.

---

## 2. The oblique stem (सामान्यरूप) — and its exceptions

### The rule

[mr.wikipedia, *सामान्यरूप*](https://mr.wikipedia.org/wiki/सामान्यरूप):

> "नामाला किंवा सर्वनामाला विभक्तिप्रत्यय **किंवा शब्दयोगी अव्यय** लागण्यापूर्वी त्याचे जे रूप होते त्याला 'सामान्यरूप' असे म्हणतात."
> ("The form a noun or pronoun takes before a case suffix **or a postposition** is called सामान्यरूप.")

Example given: पत्र + -ने → **पत्रा**ने, oblique stem *पत्रा*.

Note the "**किंवा शब्दयोगी अव्यय**" — **मध्ये is a शब्दयोगी अव्यय** ([The Study Katta, शब्दयोगी अव्यय](https://www.thestudykatta.com/2023/07/preposition-in-marathi-shabd-yogi-avyay-marathi-shabdyogi-avyay-marathi.html) lists the स्थलवाचक set as "आत, बाहेर, मागे, पुढे, **मध्ये**, अलीकडे, समोर, जवळ, ठायी, पाशी, नजीक"), so the oblique requirement applies to मध्ये too, not just to `-त`. [*Marathi Reference Grammar*](https://pdfcoffee.com/spoken-marathi-reference-grammar-pdf-free.html): "The oblique form is used before postpositions."

### Oblique formation by gender and final segment

From [marathivyakaran.com, *सामान्य रूप*](https://marathivyakaran.com/सामान्य-रूप/):

| class | rule | example |
|---|---|---|
| पुल्लिंगी अ-कारान्त (consonant-final masc.) | "यांचे सामान्य रूप **'आ'** कारान्त होते" | हात → हाता |
| पुल्लिंगी आ-कारान्त | "यांचे सामान्य रूप **'या'** कारान्त होते" | घोडा → घोड्या |
| पुल्लिंगी ई-कारान्त | → 'या' | धोबी → धोब्या |
| पुल्लिंगी उ-कारान्त | → 'वा' | भाऊ → भावा |
| स्त्रीलिंगी आ-कारान्त | → 'ए' | शाळा → शाळे |
| स्त्रीलिंगी इ/ई-कारान्त तत्सम | **no change** | भक्ती → भक्ती |
| स्त्रीलिंगी अ-कारान्त | → 'ई' | चूल → चुली |

### ⭐ The exception list — this is the whole answer to Q3

The same source lists **eight classes that take NO सामान्यरूप**. Two of them are decisive here:

> 1. **विशेष नामे:** अशोक, हिमालय *(proper nouns)*
> …
> 5. **परभाषिक शब्द:** स्टेशन, फोटो, बस, कोट *(foreign words)*

**A language name like जर्मन / डच / ग्रीक is both a proper noun and a परभाषिक शब्द. By this rule it has no oblique form at all — so there is no stem for `-त` to attach to.**

**Corpus verification of the परभाषिक rule** (mr.wikipedia `insource:` hit counts):

| bare + मध्ये | hits | oblique + मध्ये | hits |
|---|---|---|---|
| स्टेशनमध्ये | **22** | स्टेशनामध्ये | **0** |
| बसमध्ये | **19** | बसामध्ये | **0** |
| हॉटेलमध्ये | **100** | हॉटेलामध्ये | **0** |

Contrast with **native** nouns, where the oblique is obligatory and the bare form is categorically absent:

| bare + मध्ये | hits | oblique + मध्ये | hits |
|---|---|---|---|
| घरमध्ये | **0** | घरामध्ये | **43** |
| शहरमध्ये | **0** | शहरामध्ये | **265** |
| देशमध्ये | **0** | देशामध्ये | **150** |
| पुस्तकमध्ये | **0** | पुस्तकामध्ये | **94** |

That is a clean 0-vs-N split in **both** directions. The grammar's exception list is not a stylistic note — it is exceptionless in this corpus.

### And the published spoken-Marathi textbook says the same thing explicitly

**Berntsen, Maxine & Jai Nimbkar, *Spoken Marathi, Book 1*, University of Pennsylvania Press** ([Penn Press](https://www.pennpress.org/9780812274578/spoken-marathi-book-1/), ISBN 9781512817249):

> "With foreign words, and especially names, **many speakers avoid the -t suffix and use instead the word *madhe* with the straight form of the noun**: *hotel madhe, ingland madhe, nyu york madhe*, etc."

> "feminine nouns ending in -i in the straight form make no change for the oblique: *mumbai* 'Bombay' → *mumbait* 'in Bombay'; *yunivarsiti* 'university' → *yunivarsitit* 'in the university'"

⚠️ **Sourcing caveat, stated honestly:** these two quotations were surfaced through a search index of a full-text copy of the book hosted at `dokumen.pub/spoken-marathi-book-1-reprint-2016nbsped-9781512817249.html`. That host returned "website under maintenance" on every direct fetch during this research, so **I could not re-open the page to confirm the page number or read the surrounding paragraph.** The wording above is verbatim as indexed. The book itself is a real, in-print Penn Press title (link above). Treat the *attribution* as solid and the *page reference* as missing. Everything the quote asserts is independently confirmed by the corpus counts in §3, so nothing in this report rests on it alone.

---

## 3. Applying it to the actual 107-name list

### The list sorts by final segment as follows (107 names total)

| class | n | names |
|---|---|---|
| **consonant-final** (inherent -अ) | **69** | स्पॅनिश, फ्रेंच, जर्मन, इटालियन, पोर्तुगीज, वेल्श, कोरियन, रशियन, डच, आयरिश, स्वीडिश, पोलिश, फिनिश, तामिळ, कन्नड, थाई, इंडोनेशियन, ग्रीक, झेक, डॅनिश, नॉर्वेजियन, रोमानियन, हंगेरियन, युक्रेनियन, मलय, अफ्रिकान्स, बास्क, कातालान, गॅलिशियन, आईसलँडिक, लात्व्हियन, लिथुआनियन, इस्टोनियन, स्लोव्हाक, स्लोव्हेनियन, सर्बियन, क्रोएशियन, बल्गेरियन, मॅसेडोनियन, अल्बानियन, अर्मेनियन, जॉर्जियन, कझाक, उझ्बेक, ख्मेर, लाओ, मंगोलियन, अम्हारिक, हवाईयन, सामोअन, टोंगन, पश्चिमी फ्रिशियन, लक्झेंबर्गिश, ब्रेतॉन, कॉर्सिकन, ऑक्सितान, सर्दिनियन, फ्रियुलियान, लोंबार्ड, नेपोलिटान, सिसिलियन, व्हेनेशियन, रोमान्श, स्कॉटिश गेलिक, मांक्स, कोर्निश, यिद्दिश, कुर्दिश, मल्याळम |
| **ī-final** | **23** | इंग्रजी, जपानी, चीनी, हिंदी, अरबी, तुर्की, गुजराती, बंगाली, पंजाबी, स्वाहिली, व्हिएतनामी, फारसी, मराठी, अझरबैजानी, नेपाळी, बर्मी, सोमाली, माओरी, उत्तरी सामी, सिंधी, आसामी, तिबेटी, दिवेही |
| **ā-final** | **5** | सिंहला, योरुबा, खोसा, हौसा, उडिया |
| **o-final** | **5** | दक्षिणी सोथो, ईग्बो, सिबुआनो, फिलिपिनो, पश्तो |
| **u/ū-final** | **4** | हिब्रू, तेलगू, उर्दू, झुलू |
| **halant-final (्)** | **1** | माल्टिज् |

Four names are **multi-word**: दक्षिणी सोथो, पश्चिमी फ्रिशियन, स्कॉटिश गेलिक, उत्तरी सामी.

### Is इंग्रजीत correct? — YES, emphatically

**इंग्रजीत: 566 hits.** It is one of the most common words in the corpus.

> "**इंग्रजीत** ख, च, छ, ठ, फ, घ, ढ, भ, ष, ळ हे उच्चार नाहीत." — [देवनागरी](https://mr.wikipedia.org/wiki/देवनागरी)
> "मूळ **इंग्रजीत** असलेला हा चित्रपट अनेक भारतीय भाषांत डब झाला आहे." — [सचिन तेंडुलकर](https://mr.wikipedia.org/wiki/सचिन_तेंडुलकर)

It works because इंग्रजी is ī-final and, per Berntsen & Nimbkar above, **ī-final nouns make no oblique change** — the suffix simply attaches. Same for मराठीत (736), हिंदीत (212).

### Is जर्मनत / जर्मनात correct? — NO. Both are zero.

| form | hits |
|---|---|
| जर्मनत | **0** |
| जर्मनात | **0** |
| फ्रेंचत | **0** |
| डचत / डचात | **0 / 0** |
| ग्रीकत / ग्रीकात | **0 / 0** |
| स्पॅनिशत / स्पॅनिशात | **0 / 0** |
| रशियनत / रशियनात | **0 / 0** |
| कोरियनत | **0** |
| पोलिशत | **0** |
| झेकत | **0** |
| डॅनिशत | **0** |
| इटालियनत / इटालियनात | **0 / 0** |
| **तामिळत / तामिळात** | **0 / 0** |
| **कन्नडत / कन्नडात** | **0 / 0** |
| **मल्याळमत / मल्याळमात** | **0 / 0** |

The last three are the killer datapoint. तामिळ, कन्नड and मल्याळम are **not** exotic — they are neighbouring-state Indian languages appearing constantly in Marathi text, with `कन्नड भाषेत` at 37 hits and `कन्नडमध्ये` at 44. If a consonant-final language name were ever going to take `-त`, it would be these. It is still zero.

> ⚠️ One apparent hit needs killing: **फ्रेंचात = 1**, but it is a **false positive**. The sentence is "…इंग्रज **फ्रेंचात** युद्ध झाले…" ([प्लासीची लढाई](https://mr.wikipedia.org/wiki/प्लासीची_लढाई)) — "war broke out **between the English and the French**". That is the plural oblique of the *ethnonym* (people), not the locative of the *language*. Genuine language-locative hits for consonant-final names: **zero across every form tested.**

### What does a Marathi writer actually do?

Both of the other two frames, and both are freely attested with the **bare, uninflected** name:

> "…त्याला **जर्मन भाषेत** ''वाइनाख्टन'' (weinachten) असे म्हणतात." — [जर्मनी](https://mr.wikipedia.org/wiki/जर्मनी)
> "…आंबेडकरांनी तिथल्या प्रशासनास अस्खलित **जर्मन भाषेत** लिहिलेले पत्र." — [बाबासाहेब आंबेडकर](https://mr.wikipedia.org/wiki/बाबासाहेब_आंबेडकर)
> "नूशातेलचा **जर्मनमध्ये** ''नवीन गढी'' असा होतो." — [न्यूशातेल](https://mr.wikipedia.org/wiki/न्यूशातेल)
> "…त्याला कन्नड भाषा|**कन्नडमध्ये** दसोह असे म्हणतात." — [सिद्धारुढ स्वामी](https://mr.wikipedia.org/wiki/सिद्धारुढ_स्वामी)

### ⭐ Which names break under a bare `<NAME>` + `त` template?

**96 of 107 break. 11 survive.**

**The 11 that survive** (attested `-त` locative in the corpus):
इंग्रजी (566), मराठी (736), हिंदी (212), गुजराती (17), बंगाली (15), उर्दू (8), फारसी (5), अरबी (4), पंजाबी (2), तेलगू\* (2, as तेलुगूत), तुर्की (1).

**The 96 that break**, in two tiers:

**Tier A — hard break, 80 names.** No oblique stem exists (परभाषिक/विशेष नाम rule) and no attested form. Grammatically ill-formed, not merely rare:
- all **69 consonant-final** names listed in the table above
- all **5 ā-final**: सिंहला, योरुबा, खोसा, हौसा, उडिया (सिंहलात, योरुबात, हौसात, खोसात all **0**)
- all **5 o-final**: दक्षिणी सोथो, ईग्बो, सिबुआनो, फिलिपिनो, पश्तो (पश्तोत, ईग्बोत **0**) — `-ो` + `त` is phonotactically alien in Marathi
- **माल्टिज्** — worst case. It ends in an explicit **halant (्)**. Appending त yields `माल्टिज्त`, an orthographically illegal consonant cluster. A template that concatenates strings produces literal garbage here.

**Tier B — soft break, 16 names.** Same phonological class as the survivors, so arguably well-formed, but **zero attestation** — the corpus prefers another frame even where `-त` should be legal:
- ī-final: जपानी (**जपानीत = 0**, but जपानी भाषेत = 44), चीनी (**चिनीत = 0**, चिनी भाषेत = 23), नेपाळी (**नेपाळीत = 0**, नेपाळी भाषेत = 9), स्वाहिली, व्हिएतनामी, अझरबैजानी, बर्मी, सोमाली, माओरी, उत्तरी सामी, सिंधी, आसामी, तिबेटी, दिवेही
- u-final: हिब्रू (**हिब्रूत = 0**, हिब्रू भाषेत = 7), झुलू (**झुलूत = 0**, झुलू भाषेत = 2)

> **UNSOURCED REASONING:** the Tier B pattern looks like graded nativisation — इंग्रजी/मराठी/हिंदी/गुजराती/बंगाली are deeply assimilated into Marathi and behave like native ī-final nouns, while जपानी/चीनी/माओरी remain felt as परभाषिक and resist the suffix even though they end in the same vowel. I can source the परभाषिक rule (§2) but not this specific gradience; the hit counts are data, the explanation is mine.

### Two orthography bugs in the CLDR list itself, separate from grammar

- CLDR gives **तेलगू**; Marathi Wikipedia overwhelmingly writes **तेलुगू** (तेलुगू भाषेत = 17, तेलुगूमध्ये = 36).
- CLDR gives **चीनी**; the corpus writes **चिनी** (चिनी भाषेत = 23).
- **माल्टिज्** with a trailing halant is a spelling nobody uses (`माल्टिज्` = **0** occurrences anywhere in mr.wikipedia).

These are not fixed by choosing a better frame — they are wrong strings coming out of CLDR. Frame (c) at least renders them harmlessly rather than fusing them into a broken word.

---

## 4. The three candidate frames

### (a) `<NAME>त` — **BREAKS. 96 of 107.**

Breaks because the locative `-त` requires a सामान्यरूप, and language names — being simultaneously **विशेष नामे** and **परभाषिक शब्द** — are on the explicit no-सामान्यरूप list ([marathivyakaran.com](https://marathivyakaran.com/सामान्य-रूप/)). Zero attestation for every consonant-final name tested, including the well-integrated Indian ones (तामिळ, कन्नड, मल्याळम). Catastrophic on माल्टिज् (halant fusion) and on the four multi-word names, where `-त` would attach to the second word of a phrase. **Rejected.**

### (b) `<NAME>मध्ये` — **Does not break. Safe, with two caveats.**

The oblique requirement applies to मध्ये in principle (it is a शब्दयोगी अव्यय), **but** the same परभाषिक exception cancels it, and the corpus confirms this categorically (स्टेशनमध्ये 22 / स्टेशनामध्ये 0). So the bare name is correct.

Attested across every class:

| form | hits | | form | hits |
|---|---|---|---|---|
| कन्नडमध्ये | 44 | | तेलुगूमध्ये | 36 |
| उर्दूमध्ये | 21 | | मल्याळममध्ये | 22 |
| फ्रेंचमध्ये | 17 | | तामिळमध्ये | 14 |
| हिब्रूमध्ये | 10 | | अरबीमध्ये | 10 |
| जर्मनमध्ये | 9 | | स्पॅनिशमध्ये | 9 |
| ग्रीकमध्ये | 9 | | तुर्कीमध्ये | 8 |
| डचमध्ये | 6 | | जपानीमध्ये | 3 |
| रशियनमध्ये | 2 | | पश्तोमध्ये | 1 |
| इंग्रजीमध्ये | 196 | | मराठीमध्ये | 530 |

Caveats:
1. **Ambiguity.** मध्ये is the general "in/inside/among" postposition and is the *same string* used for countries and places (जर्मनीमध्ये "in Germany"). With a bare name and no भाषा, a learner hearing `<NAME>मध्ये` gets no signal that a *language* is meant. For a metalinguistic card this is a real cost.
2. **माल्टिज् still fuses**: `माल्टिज्मध्ये` is as broken as `माल्टिज्त`. Any suffix-concatenating frame inherits the halant bug.

### (c) `<NAME> भाषेत` — **Does not break. Safe for all 107.**

Structure: भाषा is a **स्त्रीलिंगी आ-कारान्त** noun → oblique **भाषे-** ([marathivyakaran.com](https://marathivyakaran.com/सामान्य-रूप/): "स्त्रीलिंगी आ-कारान्त: शाळा → शाळे") → locative **भाषेत**. The inflection lands entirely on भाषा, a native word we control. The language name stands **uninflected as an attributive** in front of it and is never touched — so its gender, final segment, halant, or word count are all irrelevant. That is exactly the orthography-independence the template needs.

**Attestation that the name really does stand bare before भाषेत — the crux, answered:**

| frame | hits | frame | hits |
|---|---|---|---|
| मराठी भाषेत | **208** | हिंदी भाषेत | **72** |
| संस्कृत भाषेत | **71** | इंग्रजी भाषेत | **45** |
| जपानी भाषेत | **44** | कन्नड भाषेत | **37** |
| बंगाली भाषेत | **36** | उर्दू भाषेत | **32** |
| **फ्रेंच भाषेत** | **28** | गुजराती भाषेत | **28** |
| चिनी भाषेत | **23** | मल्याळम भाषेत | **23** |
| अरबी भाषेत | **22** | रशियन भाषेत | **20** |
| **ग्रीक भाषेत** | **18** | **जर्मन भाषेत** | **17** |
| तेलुगू भाषेत | **17** | आसामी भाषेत | **9** |
| **स्पॅनिश भाषेत** | **9** | नेपाळी भाषेत | **9** |
| फारसी भाषेत | **8** | हिब्रू भाषेत | **7** |
| पंजाबी भाषेत | **7** | तुर्की भाषेत | **7** |
| तिबेटी भाषेत | **6** | तामिळ भाषेत | **6** |
| इटालियन भाषेत | **6** | सिंधी भाषेत | **5** |
| पोर्तुगीज भाषेत | **5** | **डच भाषेत** | **3** |
| स्वीडिश भाषेत | **3** | कोरियन भाषेत | **3** |
| युक्रेनियन भाषेत | **3** | माओरी भाषेत | **3** |
| उडिया भाषेत | **3** | ख्मेर भाषेत | **2** |
| थाई भाषेत | **2** | झुलू भाषेत | **2** |
| **पोलिश भाषेत** | **2** | स्वाहिली भाषेत | **2** |
| **वेल्श भाषेत** | **1** | **फिनिश भाषेत** | **1** |
| मंगोलियन भाषेत | **1** | बर्मी भाषेत | **1** |
| मलय भाषेत | **1** | इंडोनेशियन भाषेत | **1** |
| यिद्दिश भाषेत | **1** | कातालान भाषेत | **1** |
| **स्कॉटिश गेलिक भाषेत** | **1** | | |

Bolded rows are **consonant-final** names — the class that kills frame (a). Every one of them appears **bare** before भाषेत. Quoted attestations:

> "मुख्य सण ''नाताळ'' अथवा ख्रिसमस असून त्याला **जर्मन भाषेत** ''वाइनाख्टन'' (weinachten) असे म्हणतात."
> — [जर्मनी, mr.wikipedia](https://mr.wikipedia.org/wiki/जर्मनी)

> "मूळ **डच भाषेत** लिहिलेल्या त्या दैनंदिनीचे इ.स. १९५२ मध्ये इंग्रजीत भाषांतर झाले…"
> — [ॲन फ्रँक, mr.wikipedia](https://mr.wikipedia.org/wiki/ॲन_फ्रँक)

> "जेकब पीटर्स यांनी सुरतला **डच भाषेत** ''सॉर्रेट'' म्हणून संबोधले आहे"
> — [सुरत, mr.wikipedia](https://mr.wikipedia.org/wiki/सुरत)

> "'''स्कॉटलंड''' ([[स्कॉटिश गेलिक भाषा|**स्कॉटिश गेलिक भाषेत**]] नाव ''अल्बा'') हा वायव्य युरोपातील एक देश आहे."
> — [स्कॉटलंड, mr.wikipedia](https://mr.wikipedia.org/wiki/स्कॉटलंड) — **a multi-word name, bare, working.**

> "या शहरास **झुलू भाषेत** ''उमगुंडलोव्हु'' असे नाव आहे."
> — [पीटरमारित्झबर्ग, mr.wikipedia](https://mr.wikipedia.org/wiki/पीटरमारित्झबर्ग)

> "याला स्थानिक **माओरी भाषेत** ''माउआओ'' म्हणतात."
> — [माउंट माउंगानुई, mr.wikipedia](https://mr.wikipedia.org/wiki/माउंट_माउंगानुई)

**On the zeros in frame (c).** 20-odd names in the list returned 0 for `<NAME> भाषेत` (आयरिश, हंगेरियन, नॉर्वेजियन, अल्बानियन, अर्मेनियन, बास्क, माल्टिज्, हवाईयन, सोमाली, अम्हारिक, योरुबा, ब्रेतॉन, पश्तो, कुर्दिश, दक्षिणी सोथो, उत्तरी सामी, सिंहला, व्हिएतनामी, रोमानियन, डॅनिश …). **These are corpus sparsity, not ungrammaticality**, and the distribution proves it: the zeros do not cluster by shape. वेल्श, फिनिश, पोलिश, स्कॉटिश गेलिक — same shapes, same class — are attested. What the zeros track is how rarely mr.wikipedia has occasion to say "in Albanian" at all. Note also that some of these names are common in the corpus in *other* contexts (आयरिश 255, हंगेरियन 169, नॉर्वेजियन 122, सिंहला 56, हवाईयन 30) — so the name exists, the sentence type just doesn't. Crucially, **there is no shape in the 107-name list that frame (c) is unattested for**, because the name is never inflected: the frame's grammaticality does not depend on the name at all, only on भाषेत, which is attested thousands of times.

> **UNSOURCED REASONING:** the inference "if the attributive slot works for जर्मन, डच, ग्रीक, पोलिश, फिनिश, वेल्श, माओरी, झुलू and a two-word स्कॉटिश गेलिक, it works for अल्बानियन too" is mine. It follows directly from the fact that the slot is uninflected, but I am labelling it rather than dressing a gap as a finding.

---

## 5. Register — which is spoken, which is written?

This is the weakest-sourced of the five questions and I'll say so plainly.

**What I can source:**

**Berntsen & Nimbkar, *Spoken Marathi, Book 1*** — a textbook explicitly of the *spoken* register, based on the Poona dialect ([Penn Press](https://www.pennpress.org/9780812274578/spoken-marathi-book-1/)) — makes the register claim directly:

> "With foreign words, and especially names, **many speakers** avoid the -t suffix and use instead the word *madhe* with the straight form of the noun: *hotel madhe, ingland madhe, nyu york madhe*."

"many **speakers**", in a spoken-Marathi course, in a lesson about foreign words: **मध्ये is the documented spoken strategy for exactly our case.** (Sourcing caveat from §2 applies — page unverifiable.)

[English Wikipedia, *Marathi language*](https://en.wikipedia.org/wiki/Marathi_language) confirms that written Marathi is a distinct, more Sanskritised register: "Standard Marathi is based on dialects used by academics and the print media", from a "Sanskrit dominated dialect spoken by the elite".

**What the corpus shows** (bearing in mind mr.wikipedia is *written*, formal, Sanskritised register — it is evidence about the written pole, not the spoken one):

| name | `-त` | `मध्ये` | `भाषेत` |
|---|---|---|---|
| इंग्रजी | **566** | 196 | 45 |
| मराठी | **736** | 530 | 208 |
| हिंदी | **212** | 133 | 72 |
| जर्मन | 0 | 9 | **17** |
| फ्रेंच | 0 | 17 | **28** |
| कन्नड | 0 | **44** | 37 |
| डच | 0 | **6** | 3 |

**Reading:**
- For the three deeply-nativised names, plain `-त` dominates even in formal writing — it is the unmarked, everyday form. This is why इंग्रजीत sounds so natural: it is not a formal construction, it is the ordinary one.
- For foreign names, `-त` is simply unavailable, and the competition is मध्ये vs भाषेत, running roughly level (भाषेत ahead for जर्मन/फ्रेंच, मध्ये ahead for कन्नड/डच). Neither is marginal.

**Honest limits.** I could not find a published source that ranks `भाषेत` against `मध्ये` for formality. Searches for register/colloquial treatments of the `-त`/`मध्ये` alternation returned nothing on point ([languageinindia.com Marathi Postpositions PDF](https://www.languageinindia.com/sep2014/arvindmarathipostpositionsfinal.pdf) does not address it; nor does the [Konstanz Marathi DOM paper](https://ling.sprachwiss.uni-konstanz.de/pages/home/beck/presentations/Marathi_DOM.pdf)). **What would settle it: a native-speaker judgement panel, or a spoken-Marathi corpus** (mr.wikipedia cannot answer a spoken-register question, and I will not pretend it can).

**What the evidence leans toward, and one argument that I think is decisive for this particular course.** The card is *metalinguistic*: "In &lt;LANGUAGE&gt;, X is Y". Look at what the attested `भाषेत` sentences actually are:

> "त्याला **जर्मन भाषेत** ''वाइनाख्टन'' असे म्हणतात." — *"They call it 'Weihnachten' in German."*
> "या शहरास **झुलू भाषेत** ''उमगुंडलोव्हु'' असे नाव आहे." — *"This city is called 'uMgungundlovu' in Zulu."*
> "याला स्थानिक **माओरी भाषेत** ''माउआओ'' म्हणतात." — *"They call this 'Mauao' in Maori."*

That is not an approximation of our card — **it is our card, verbatim, in the wild.** `<NAME> भाषेत X ला Y म्हणतात` is the naturally occurring Marathi frame for saying exactly this thing. It is not a formal fallback we're retreating to on grammatical grounds; it is the idiom for the sentence type.

---

## Summary table

| | frame | breaks? | count broken | why |
|---|---|---|---|---|
| (a) | `<NAME>त` | **YES** | **96 / 107** | `-त` needs a सामान्यरूप; language names are विशेष नामे **and** परभाषिक शब्द, both on the no-oblique exception list. Zero corpus attestation for any consonant-final name. Fuses माल्टिज् into an illegal cluster. |
| (b) | `<NAME>मध्ये` | no | 0 (1 orthographic: माल्टिज्) | परभाषिक exception cancels the oblique; बare name correct and widely attested. But gives no "language" signal — same string shape as places. |
| (c) | `<NAME> भाषेत` | **no** | **0** | Inflection falls on भाषा (native, controlled); name is an uninflected attributive, never touched. Attested bare for every shape in the list, including consonant-final and multi-word. |

---

## Recommendation

**Use `<NAME> भाषेत` — it is the only frame of the three that is grammatical for all 107 CLDR names without knowing any name's gender, final segment, or word count, and the attested Marathi idiom for this exact metalinguistic sentence is `<NAME> भाषेत … असे म्हणतात`.**

**Confidence: HIGH** on questions 1–4 (grammatical rule sourced to a published Marathi grammar, independently confirmed by a 0-vs-N corpus split in both directions, and by direct quoted attestations for the hard cases). **MEDIUM** on question 5 (register), because the corpus evidence is written-register only and no published source ranks `भाषेत` against `मध्ये` for formality — a native-speaker panel would settle it, and if that panel says `मध्ये` is warmer in speech, frame (b) is an equally safe grammatical fallback.

**Two things to fix regardless of frame choice**, since they come from CLDR and not from Marathi grammar: the strings `तेलगू` (corpus writes तेलुगू), `चीनी` (corpus writes चिनी), and `माल्टिज्` (trailing halant; zero occurrences in mr.wikipedia — the name is unusable as spelled).
