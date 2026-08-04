# Yiddish (`yid_for_eng`) — Opus handoff brief

**Status:** Seeds 1–10 drafted, refined, and fresh-eyes checked by Fable; 6/10 solidly verified, one real error caught in review (*vos ofter* → *vos efter*, umlaut-comparative trap). Native-speaker check NOT yet done — seeds 5/6/7 sit on thin attestation and are HELD from LEGO decomposition until the native-check questions below are answered. **Biggest risk:** baking English calques (seed 7) or a wrong verb frame (seeds 5/6) into the chunk inventory, from which every downstream phrase inherits.

---

## Orthography

**Canonical target script:** Hebrew script in **YIVO Standardized Yiddish Orthography (SYO)** — the *klal-shprakh* standard used by the YIVO Institute, Yiddish Wikipedia, the Forverts, and the Comprehensive English–Yiddish Dictionary (CEYD/Schaechter). **Romanization:** YIVO transliteration, stored in the roman field for every phrase. Reference sources in priority order: CEYD, Weinreich *Modern English–Yiddish Yiddish–English Dictionary*, Harkavy (for attestation, not spelling — Harkavy predates SYO), Wiktionary (Yiddish entries are mostly SYO-conformant), Yiddish Wikipedia (usage/collocation checks).

Hard spelling rules (all load-bearing for TTS — do not drop diacritics):

- **ייִדיש** with khirik-yud (יִ). Bare יידיש is wrong in SYO.
- **פֿ** (fey, /f/) vs **פּ** (pey, /p/) — the rafe and dagesh dots are obligatory: *efter* = עפֿטער, *pruvn* = פּרוּוון.
- **אַ** (pasekh-alef, /a/) vs **אָ** (komets-alef, /o/) — always pointed: אַ ביסל, וואָס.
- **וּ** (shuruk-vov) separates vowel-u from consonant-v in clusters: פּרוּוו (*pruv*), not פּרוו.
- Hebrew/Aramaic-origin words keep traditional (unpointed) spelling and take **Ashkenazi pronunciation** in romanization and audio: שלום = *sholem*, never *shalom*.
- **Romanization diverges from spelling** in places: אויף romanizes **af** (not *oyf*) per YIVO. Do not "correct" it.

**Rejects:** any unpointed alef/pointed-letter shortcuts, Hasidic/Hebrew-style spellings (e.g. איד for ייִד), German-influenced spellings, and any daytshmerish lexicon (see Divergence + Gotcha 3).

## Divergence from parent (German)

Yiddish is Germanic and a German-trained model will produce plausible-looking wrong Yiddish constantly. What transfers vs what must be re-derived:

**Transfers (safe to lean on):**
- V2 main-clause word order; subject–verb inversion after fronted elements.
- Modal + bare infinitive (*ken gedenken*, no *tsu*).
- Three-way gender (der/di/dos), adjective agreement, dative after *mit*.
- Separable/inseparable prefix logic (der-, tse-, on-, oys- …) broadly parallels German be-/er-/an-/aus-.

**Must be re-derived (German intuition actively harmful):**
- **Embedded word order:** Yiddish subordinate clauses stay V2-ish after *az/tsi/vos* — NEVER German verb-final. *vos ikh meyn*, not \**vos ikh meyn* reordered to verb-last (seed 8, seed 10).
- **Future:** *veln* auxiliary (*ikh vel redn*), not *werden*; and the paradigm is irregular — see grammar table. German-style *velst/velt* is a corruption.
- **Negation:** *nisht*, not *nicht* (and course-locked over variant *nit*).
- **Lexicon — the daytshmerish filter:** 19th-century Germanizing borrowings are banned by SYO/YIVO policy. The words that "look right" from German are exactly the suspects: *redn* not *shprekhn*, *efsher* not *vilaykht*, *a bisl* not *ein bisl*, *derklern* not *erklern*, *zikh genitn* not *zikh ibn*. When a new seed needs a word, check whether the German-cognate candidate is flagged daytshmerish before using it.
- **No productive genitive**; case system is nom/acc/dat only.
- **Hebrew and Slavic strata** supply core vocabulary with no German parallel (*efsher*, *mistome*, *khazern*, *sholem*) — these are often the *preferred* choice over the Germanic synonym.

## Core grammar the builder needs

**Present tense (regular, *redn*):**

| person | form | roman |
|---|---|---|
| ikh | רעד | red |
| du | רעדסט | redst |
| er/zi/es | רעדט | redt |
| mir | רעדן | redn |
| ir | רעדט | redt |
| zey | רעדן | redn |

**The vil/vel minimal pair (Gotcha 2 — highest-frequency trap in the course):**

| | *veln* "want" | *veln* future aux "going to/will" |
|---|---|---|
| ikh | **vil** וויל | **vel** וועל |
| du | vilst ווילסט | **vest** וועסט (NOT *velst*) |
| er/zi | vil וויל | **vet** וועט (NOT *velt*) |
| mir/zey | viln ווילן | veln וועלן |

Both precede infinitives: *ikh vil redn* = I want to speak; *ikh vel redn* = I'm going to speak.

**Infinitive complements:**
- Modals (*kenen, veln, muzn, zoln, megn, darfn, torn*) + **bare infinitive**: *ikh ken gedenken*.
- Non-modal matrix verbs + **tsu-infinitive**: *ikh pruv tsu lernen*, *pruvn tsu derklern*.
- Reflexive *zikh* of a lower verb **climbs** to right after the finite verb: *ikh pruv **zikh** tsu lernen* (the *zikh* belongs to *zikh lernen*, not to *pruvn*).

**Word order:** V2 in main clauses; light adverbs (*itst, haynt*) sit between finite verb and infinitive (*ikh vil itst redn*, *ikh vil haynt pruvn*). Embedded clauses after *tsi/vos/az* keep subject–verb order: *tsi ikh ken gedenken*, *vos ikh meyn*.

**Case (as it appears in seeds 1–10):**

| context | form | example |
|---|---|---|
| masc. acc. definite | dem + adj-**n** | דעם גאַנצן זאַץ *dem gantsn zats* |
| dative after *mit* | mit + dat | מיט דיר *mit dir*; מיט עמעצן *mit emetsn* |
| 2sg fam. pronoun | du / dikh / dir | nom / acc / dat |

**Comparatives:** many core adjectives/adverbs umlaut: *oft→efter, alt→elter, grob→greber, klug→kliger*. Never derive a comparative by bare *-er* without checking the umlaut set. *vos* + comparative = "as X as possible": *vos efter, vos gikher, vos mer*.

## LOCKED DECISIONS (contracts Opus must NOT break)

ZUT contracts — one known form maps to exactly one target form, course-wide:

- [ ] **I want** → איך וויל *ikh vil* (never *vel*)
- [ ] **I'm going to / I will** → איך וועל *ikh vel* (2sg *vest*, 3sg *vet*)
- [ ] **to speak** → רעדן *redn* (shprekhn BANNED)
- [ ] **to say** → זאָגן *zogn*
- [ ] **to try** → פּרוּוון *pruvn* (+ *tsu*-inf; see decomposition rail)
- [ ] **to learn** → זיך לערנען *zikh lernen* (reflexive)
- [ ] **to remember (retain/hold)** → געדענקען *gedenken* + direct acc object
- [ ] **to remember (recall/retrieve)** → זיך דערמאָנען אין *zikh dermonen in* (frame provisional — native Q3)
- [ ] **to practise** → זיך געניטן אין + verbal noun *zikh genitn in* (provisional — native Q2)
- [ ] **to explain** → דערקלערן *derklern* (erklern BANNED)
- [ ] **to mean** → מיינען *meynen*
- [ ] **a little** → אַ ביסל *a bisl* (ein bisl BANNED)
- [ ] **now** → איצט *itst* (not *yetst* — pending native Q7)
- [ ] **not** → נישט *nisht* (not *nit*) — course-wide
- [ ] **maybe** → אפֿשר *efsher* (vilaykht BANNED)
- [ ] **in Yiddish** → אויף ייִדיש *af yidish*
- [ ] **something** → עפּעס *epes*; **someone** → עמעצער *emetser* (dat *emetsn*)
- [ ] **how to** → ווי אַזוי צו *vi azoy tsu*
- [ ] **whether/if** (embedded y/n) → צי *tsi*
- [ ] **as X as possible** → **vos + comparative** (never \**azoy X vi meglekh*)
- [ ] **Register:** informal **du/dikh/dir** throughout; learner addressed as *du*.
- [ ] **Pronunciation lock:** Ashkenazi for all Hebrew-origin vocabulary (*sholem*), enforced from seed 1 so audio never needs regeneration.

## The 10 reference seeds

| n | English | Target (roman) | Gloss | Conf. |
|---|---|---|---|---|
| 1 | I want to speak Yiddish with you now | איך וויל איצט רעדן ייִדיש מיט דיר — *ikh vil itst redn yidish mit dir* | I want now speak-INF Yiddish with you-DAT | high |
| 2 | I'm trying to learn | איך פּרוּוו זיך צו לערנען — *ikh pruv zikh tsu lernen* | I try REFL to learn | high |
| 3 | how to speak as often as possible | ווי אַזוי צו רעדן וואָס עפֿטער — *vi azoy tsu redn vos efter* | how to speak what more-often | medium |
| 4 | how to say something in Yiddish | ווי אַזוי צו זאָגן עפּעס אויף ייִדיש — *vi azoy tsu zogn epes af yidish* | how to say something on(=in) Yiddish | high |
| 5 | I'm going to practise speaking with someone else | איך וועל זיך געניטן אין רעדן מיט עמעצן אַנדערש — *ikh vel zikh genitn in redn mit emetsn andersh* | I will REFL practise in speaking with someone-DAT else | medium |
| 6 | I'm trying to remember a word | איך פּרוּוו זיך צו דערמאָנען אין אַ וואָרט — *ikh pruv zikh tsu dermonen in a vort* | I try REFL to recall in a word | medium |
| 7 | I want to try as hard as I can today | איך וויל הײַנט פּרוּוון אַזוי שטאַרק ווי איך קען — *ikh vil haynt pruvn azoy shtark vi ikh ken* | I want today try-INF so strongly as I can | medium |
| 8 | I'm going to try to explain what I mean | איך וועל פּרוּוון צו דערקלערן וואָס איך מיין — *ikh vel pruvn tsu derklern vos ikh meyn* | I will try-INF to explain what I mean | high |
| 9 | I speak a little Yiddish now | איך רעד איצט אַ ביסל ייִדיש — *ikh red itst a bisl yidish* | I speak now a little Yiddish | high |
| 10 | I'm not sure if I can remember the whole sentence | איך בין נישט זיכער צי איך קען געדענקען דעם גאַנצן זאַץ — *ikh bin nisht zikher tsi ikh ken gedenken dem gantsn zats* | I am not sure whether I can remember-INF the-ACC whole sentence | high |

Rule-carrying notes: (3) *efter* is the umlauted comparative — *ofter* is only the inflected adjective. (5) Weakest attestation of the ten; priority native check. (7) Most calque-suspect string; a swap destroys the chunk, so resolve BEFORE decomposition. (8) Plain *pruvn tsu* with no *zikh* — this is why seeds 2/6 must never chunk *ikh pruv zikh*. (10) *gedenken* + acc chosen deliberately over *zikh dermonen* (retention vs retrieval), which also sidesteps the dermonen-valency question here.

## Worked decompositions

**Seed 1** — *ikh vil itst redn yidish mit dir*

| known atom | target atom | note |
|---|---|---|
| I want | איך וויל *ikh vil* | vil not vel |
| now | איצט *itst* | slots between finite verb and infinitive |
| to speak | רעדן *redn* | bare infinitive after *vil* (modal) |
| Yiddish | ייִדיש *yidish* | khirik-yud |
| with you | מיט דיר *mit dir* | **SEALED** — preposition + dative; never split, never reuse *dir* alone as "you" |

Word-order rule the LEGOs must teach: English "…Yiddish with you **now**" → Yiddish *itst* moves up next to *vil*. Build phrases must respect this slot.

**Seed 2** — *ikh pruv zikh tsu lernen* (THE decomposition rail)

| known atom | target atom | note |
|---|---|---|
| I'm trying | איך פּרוּוו *ikh pruv* | matrix verb only — the *zikh* is NOT part of this chunk |
| to learn | זיך צו לערנען *zikh tsu lernen* | **SEALED** — *zikh* belongs to *zikh lernen*; surface order in the full sentence shows the *zikh* climbed to after *pruv* |

**FORBIDDEN cut:** *ikh pruv zikh* as a "trying" chunk. It would ZUT-collide with seed 8's plain *pruvn tsu* (two target forms for one known "try to"), and it steals the *zikh* from the lower verb. Same rail applies verbatim to seed 6 (*ikh pruv* + *zikh tsu dermonen in*). When surface order and chunk boundary disagree (clitic climbing), the chunk follows the **syntax**, not the surface string.

**Seed 10** — *ikh bin nisht zikher tsi ikh ken gedenken dem gantsn zats*

| known atom | target atom | note |
|---|---|---|
| I'm not sure | איך בין נישט זיכער *ikh bin nisht zikher* | *nisht* course-lock |
| if / whether | צי *tsi* | embedded y/n complementizer; clause after it stays V2-ish |
| I can | איך קען *ikh ken* | modal → bare infinitive follows |
| remember | געדענקען *gedenken* | retention verb, direct object |
| the whole sentence | דעם גאַנצן זאַץ *dem gantsn zats* | **SEALED** — masc. acc. dem + adj-n agreement travels as one unit |

## Gotchas

1. **Umlaut comparatives:** *oft* → **efter** (עפֿטער), never *ofter* — unumlauted *ofter* exists (inflected adj., *an ofter gast*) so nothing will flag it. Same class: *alt→elter, grob→greber, klug→kliger*. Any bare *-er* comparative must be checked.
2. **vil ≠ vel:** *vil* = want, *vel* = future; 2sg/3sg future is **vest/vet**, NOT *velst/velt*. German-autopilot conjugation corrupts every future seed.
3. **Daytshmerish filter:** *redn* ✔ *shprekhn* ✘ · *efsher* ✔ *vilaykht* ✘ · *a bisl* ✔ *ein bisl* ✘ · *derklern* ✔ *erklern* ✘ · *zikh genitn* ✔ *zikh ibn* ✘. The German cognate that "looks right" is the suspect.
4. **"as X as possible" = vos + comparative** (*vos efter, vos gikher, vos mer*), never \**azoy oft vi meglekh*. Don't confuse with correlative *vos X-er, alts Y-er* ("the X-er the Y-er"), which shares the surface.
5. **pruvn frames:** plain "try to" = *pruvn tsu* + inf (seed 8); reflexive complement's *zikh* climbs after the matrix verb (seeds 2/6). NEVER cut *ikh pruv zikh* as a chunk — ZUT collision + stolen clitic.
6. **Remember-verbs split:** *gedenken* = retain, + acc object; *zikh dermonen (in/on/fun)* = recall, prepositional frame in the standard; non-reflexive *dermonen* = mention/remind. One English "remember" ≠ one Yiddish verb.
7. **SYO diacritics are TTS-load-bearing:** ייִ, פֿ/פּ, אַ/אָ, וּ (פּרוּוו). Romanization diverges from spelling: אויף = *af*.
8. **Modals take bare infinitive** (*ken gedenken*, no *tsu*); embedded clauses after *tsi/vos/az* stay V2-ish — never German verb-final.
9. **Case shows early:** masc. acc. *dem + adj-n* (*dem gantsn zats*); dative after *mit* (*mit dir, mit emetsn*).
10. **Register locks from seed 1:** *nisht* (not *nit*), informal *du/dir/dikh*, Ashkenazi pronunciation of Hebrew-origin words (*sholem*) — locked now so audio never regenerates for consistency.

## Native-check questions

Blocking (must be answered before LEGO decomposition of the flagged seeds):

1. **Seed 3:** Is *vos efter* natural on its own for "as often as possible"? Is *efter* your comparative of *oft*? Preferred alternative (*vos mer*? *azoy oft vi nor meglekh*?)?
2. **Seed 5:** Does *ikh vel zikh genitn in redn* sound like real speech for "practise speaking"? If not — *praktitsirn*? *khazern/aynkhazern*? And is *mit emetsn andersh* the natural "with someone else"?
3. **Seed 6:** For failing to retrieve a word: *zikh dermonen in a vort*, *…on a vort*, bare *zikh dermonen a vort*, or would you actually say *dos vort falt mir nit ayn*? The course needs the frame that generalizes.
4. **Seed 7:** Is *pruvn azoy shtark vi ikh ken* real Yiddish, or translated? Would you say *zikh staren vi vayt ikh ken* or *mit ale koykhes*? (Determines whether the *vi ikh ken* LEGO survives.)
5. **Seeds 2/6:** Is climbed-*zikh* order (*ikh pruv zikh tsu lernen*) your natural order, or *zikh* after the infinitive?
6. **Seed 10:** *gedenken* vs *zikh dermonen* for a whole sentence just heard — does retention-*gedenken* feel right?
7. **Register:** *nisht* vs *nit*, *itst* vs *yetst* — do the locks match the target variety (YIVO klal-shprakh vs Hasidic usage)? Confirm the course is aiming at klal-shprakh.
8. *(new)* **TTS sanity:** confirm the chosen TTS voice actually reads pointed SYO Hebrew script correctly (ייִ, פֿ/פּ, אויף→*af*) before any bulk audio — if it fails, the romanization field becomes the audio source and needs its own QA pass.
9. *(new)* **emetsn andersh:** is *andersh* the right "else" here, or *an anderer* construction (*mit emetsn an andern*)?

## Instructions to Opus for continuing (seeds 11+)

1. **Reuse before invent.** For every new canonical seed, first map each English chunk against the LOCKED DECISIONS list and the 10 reference targets. If a contract covers it, you MUST use that form — no synonyms, no "variety".
2. **Check every new word three ways** before accepting it: (a) is the German-cognate candidate daytshmerish? (Gotcha 3 list + CEYD usage labels); (b) is the SYO spelling fully pointed (Gotcha 7)?; (c) if it's a comparative, is it in the umlaut set (Gotcha 1)?
3. **Futures and wants:** every "going to / will" → *vel/vest/vet/veln*; every "want" → *vil/vilst/vil/viln*. Re-verify the 2sg/3sg forms each time — this is the single most likely place you will autopilot wrong.
4. **Infinitive plumbing:** modal → bare inf; anything else → *tsu*-inf; reflexive lower verb → *zikh* climbs after the finite verb, and the chunk boundary keeps *zikh* with the lower verb (copy the seed-2 worked decomposition exactly).
5. **Embedded clauses:** after *tsi/vos/az*, keep subject–verb order. If your draft looks like German verb-final, it is wrong.
6. **English "remember", "try", "practise" are pre-split** (Gotchas 5/6, contracts list). Decide which sense the new seed carries before translating; never let one English verb drift to a second Yiddish target — that is a ZUT violation.
7. **When attestation is thin, flag — do not invent.** Yiddish web corpus is small; absence of a collocation online proves nothing either way. If you cannot find the construction in CEYD/Weinreich/Harkavy/Wiktionary or a Forverts/Yiddish-Wikipedia sentence, mark the seed `confidence: low`, add a specific question to the native-check list, and move on. A deferred seed costs a day; a baked-in calque costs the chunk inventory. Known thin zones: effort idioms (seed-7 class), aspectual/phase verbs ("keep doing", "manage to", "end up"), light-verb collocations ("have a go", "make sense"), anything where English uses a preposition idiomatically.
8. **Do not decompose seeds 5, 6, 7 into LEGOs until native questions 2–4 are resolved.** Their chunk boundaries change with the answer.
9. **Before any audio:** run the TTS sanity check (native Q8) and confirm all register locks (nisht, du, itst, Ashkenazi) held across every seed — audio regeneration for consistency is the expensive failure mode this brief exists to prevent.