# gla_for_eng — REPLACE/KEEP decisions (111 substantive diffs)

Conservative classification of the 111 substantive DB-vs-ours diffs from `gla-thorough-check.md`,
judged against the LOCKED rules in `briefs/gla_for_eng.md` and general Gaelic grammar.
Rule of thumb: **REPLACE only when the DB form is genuinely ungrammatical or a clear wrong-but-plausible
calque and ours is correct; otherwise KEEP.**

**Result: 28 REPLACE, 83 KEEP.**

Machine-readable per-seed verdicts: `temp/minority-seeds/gla-decisions.json`.

---

## REPLACE (28) — DB is genuinely wrong

Grouped by the DB error pattern.

### 1. feuch-ri government dropped (6) — the biggest cluster
Locked decision: *'try to X' → feuchainn **ri** X*. DB repeatedly omits the obligatory `ri`.
- **2** `a'feuchainn ionnsachadh` → `a' feuchainn ri ionnsachadh`
- **6** `a' feuchainn cuimhneachadh air facal` → `... ri cuimhneachadh ...`
- **8** `a' dol a dh'fheuchainn mìneachadh` → `... ri mìneachadh`
- **50** `a' feuchainn crìoch a chur air` → `a' feuchainn ri crìochnachadh`
- **102** `a' feuchainn a ràdh` → `a' feuchainn ri ràdh`
- **103** `a' feuchainn mòran ... a chluinntinn` → `a' feuchainn ri mòran ...`

### 2. Missing lenition (4)
- **1** `a bruidhinn` → `a bhruidhinn` (lenition after infinitive particle `a`).
- **15** `a bruidhinn` → `a bhruidhinn` (same; also wrong 'with', see below).
- **17** `an freagairt` → `an fhreagairt` (feminine noun must lenite after the article).
- **66** `am freagairt` → `an fhreagairt` (same; DB even mis-forms the article as masculine `am`).
- (also **101** `mun cànan` → `mun chànan`, counted under pattern 4.)

### 3. Progressive calque instead of the possession idiom for language competence (3)
Gotcha 5 / rubric example: competence "speak a language" = `tha ... agam`, NOT `tha ... a' bruidhinn`.
- **9** `tha mi a' bruidhinn beagan Gàidhlig` → `tha beagan Gàidhlig agam`
- **13** `tha thu a' bruidhinn Gàidhlig gu math` → `tha Gàidhlig glè mhath agad`
- **22** `daoine a tha a' bruidhinn Gàidhlig` → `daoine aig a bheil Gàidhlig`

### 4. Wrong / missing verb-preposition government or wrong subject (5)
- **24** `comasach cuimhneachadh` → `comasach **air** cuimhneachadh` (comasach air).
- **82** `a dh'fheitheamh **ort**` → `... **riut**` (feith **ri**, not air).
- **83** `aontachadh **le**` → `aontachadh **ris**` (aontaich **ri**).
- **84** `aontachadh **le**` → `aontachadh **ris**` (aontaich **ri**).
- **101** `tha **mi** a' còrdadh rium` → `tha **e** a' còrdadh rium` (còrd-ri subject must be the thing enjoyed) + `mun cànan` → `mun chànan`.
- **10** (reference) DB fronts the air-object and drops both `air` and the `t-` prefix: `an seantans ... a chuimhneachadh` → `cuimhneachadh **air an t-seantans**` (cuimhnich air never fronts).

### 5. Wrong pronoun / bare pronoun object of a verbal noun / missing possessor (4)
- **20** `ainm` → `an t-ainm aige` (DB drops the possessor "his").
- **25** `a chuideachadh mi` → `gam chuideachadh` (pronoun object of a VN must be possessive).
- **74** `do chuideachadh` (helping *you*) → `mo chuideachadh` (helping *me*).
- **92** `leantainn orra leis an seo` → `cumail orm a' dèanamh seo` (orra = "them", no antecedent; "with this" misses "doing this").

### 6. Other clear grammatical / semantic errors (4)
- **45** `a h-uile càil a bhith agam` (have everything) → `fios ... agam air a h-uile rud` (know everything).
- **46** `a' dragh a ghabhail` (a' before a noun — malformed) → `a' gabhail dragh`.
- **77** `tha mi iongnadh` (malformed) → `tha iongnadh orm` ("I'm surprised").
- **95** `a' bhus as fhaisge` (nearest bus) → `an ath bhus` (next bus).
- **127** `do choinneachadh` (to meet you) → `d' fhaicinn` (to see you).

*(Semantic-mismatch cases 95 and 127 are wrong-word errors where ours matches the English and DB does not.)*

---

## KEEP (83) — DB is a defensible variant, or ours deviates from the English

Recurring KEEP buckets:

- **mar vs ciamar ("how")** — rubric KEEP; native-check Q1 is *open* on the embedded form: **3, 4, 43, 56, 57, 59, 60**.
- **as-as frames** `'s a ghabhas` vs `'s as urrainn dhomh` — both sealed valid: **7, 28, 29**.
- **bu toil vs bu toigh; toil agad vs toigh leat** — spelling/idiom variant: **11, 12, 26, 51, 110, 120** (and embedded elsewhere).
- **Emphatic vs plain pronoun** (esan/ise/sinne vs e/i/sinn) for unemphatic English — not wrong: **16, 34, 35, 36, 52, 70, 71** (and embedded in 17*/69/84 where another issue drove the call).
- **Lexical near-synonyms** — duilich/doirbh, tuilleadh/barrachd, mòran/tòrr, sgur/stad, cruth/cumadh, neònach/neo-àbhaisteach, mar-thà/mu thràth, gu dearbh/gu cinnteach, ceasnaich/faighnich, aithne/eòlach, etc.: **30, 38, 42, 48, 65, 67, 73, 75, 76, 85, 87, 88, 89, 117, 119, 121, 126** and more.
- **Idiom/construction variants** — enjoy/like (còrd ri vs is toil), know-a-person (aithne air vs eòlach air), finish (crìoch a chur air vs crìochnachadh), work-hard (obair chruaidh a dhèanamh vs obair gu cruaidh), copula constructions, gum bheil/gu bheil spelling: **41, 47, 49, 61, 63, 69, 85, 90, 94, 99, 100, 104, 105, 106, 108, 109, 111, 112, 114, 115, 118, 122, 124, 125, 130**.
- **Ours deviates from the English / DB is more faithful** — KEEP DB: **5** (ours "my Gaelic" vs prompt "speaking"), **26** (ours shifts to conditional), **64** (ours' `Gàidhlig ionnsachadh` arguably needs the particle `a`), **128** (DB keeps "used to know", ours drops it).
- **Minor omissions that are not grammar errors** — dropped "very" (72), dropped discourse "No" (96), "this evening" nuance (18): KEEP conservatively.
- **Borderline, not confident DB is ungrammatical** — 14 (a bheil vs habitual am bi), 37 (`an mìos` article slip amid variants), 91 (`gu leòr luath` ordering), 116 (`a ghabhadh mi a dhèanamh`): KEEP.

---

## Recurring DB error patterns (headline)

1. **`feuch` + `ri` dropped** for "try to" — 6 seeds, the single most common defect.
2. **Missing lenition** — after infinitive particle `a` (a bruidhinn) and on feminine nouns after the article (an fhreagairt); also `mun chànan`.
3. **Progressive calque for language competence** instead of the `tha ... agam` possession idiom.
4. **Wrong/missing verb-preposition government** — comasach air, feith ri, aontaich ri, and the còrd-ri subject slot.
5. **Pronoun handling** — bare pronoun object of a VN (`a chuideachadh mi`), wrong person (do/mo, orra), or dropped possessor.

Plus a handful of one-off wrong-word semantic errors (see/meet, next/nearest, know/have, surprised idiom).
