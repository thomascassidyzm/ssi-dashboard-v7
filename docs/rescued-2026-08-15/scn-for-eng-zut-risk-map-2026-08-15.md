# scn_for_eng ZUT Risk Map and Verb Paradigm Sheet

**Source**: all 668 rows of `course_seeds` where `course_code='scn_for_eng'` (Supabase, live query, 2026-08-15). No nulls. Every claim below is traceable to a seed number quoted from that table — nobody on this task speaks Sicilian, so nothing here is asserted beyond what the corpus itself shows. Where I could not resolve something from the data, it's marked **INFERRED** (a guess, flagged as such) or pushed to §6 as an open question — never presented as fact.

**Top-line finding before the detail: this corpus is unusually clean.** The core modal/auxiliary verbs (*want, can, have-to/going-to, to be, to speak, to say, to know, to remember, to like*) each map to exactly one Sicilian verb with a fully regular paradigm. The real risk in this course is not verb-choice ZUT forks — it's (a) five seeds of leftover **Yoruba** text contaminating the Sicilian column, (b) a handful of genuine lexical forks (people, still, some, more) that need a documented rule before authoring, and (c) two orthographic collisions (*pirchì/picchì*, and *si* meaning both "if" and a reflexive clitic) that will confuse any tooling that treats spelling as identity.

---

## 0. Data-quality flag (read this before anything else)

**5 of 668 seeds have the Sicilian word "yoruba" instead of "sicilianu"** — almost certainly leftover text from a Yoruba course template that wasn't fully swapped:

| Seed | English | Sicilian (as stored) |
|---|---|---|
| 160 | How do you say this word in Sicilian? | comu si dici sta palora 'n **yoruba**? |
| 283 | Which of your friends speak Sicilian? | quali di li tò amici pàrranu **yoruba**? |
| 285 | She speaks Sicilian. | iḍḍa parra **yoruba** |
| 286 | People who like speaking Sicilian. | pirsuni ca ci piaci parrari **yoruba** |
| 297 | I don't know many people who speak Sicilian. | nun canusciu assai pirsuni ca pàrranu **yoruba** |

I checked for other stray language names (english/inglese, welsh/cymraeg, french/francese, spanish/spagnolo, italian/italiano) — none found. This is the only contamination pattern, but it needs a fix (replace `yoruba` → `sicilianu` in those 5 rows) before those seeds are decomposed into LEGOs, or the learner will be taught the wrong language name.

---

## 1. Frequency wordlists

Sicilian side: 1,005 distinct tokens across 668 seeds. English side: 816 distinct tokens. Top 200 of each (raw material for the author — not curated):

### Sicilian top 200

| # | token | count | # | token | count | # | token | count | # | token | count |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ca | 237 | 51 | circannu | 16 | 101 | 'mparari | 8 | 151 | stasira | 5 |
| 2 | nun | 169 | 52 | tanticchia | 16 | 102 | 'n | 8 | 152 | lassari | 5 |
| 3 | di | 165 | 53 | voli | 16 | 103 | megghiu | 8 | 153 | o | 5 |
| 4 | a | 162 | 54 | piaci | 16 | 104 | stari | 8 | 154 | sentu | 5 |
| 5 | lu | 106 | 55 | fussi | 16 | 105 | bona | 8 | 155 | sapiri | 5 |
| 6 | la | 93 | 56 | prontu | 16 | 106 | veni | 8 | 156 | finiri | 5 |
| 7 | è | 84 | 57 | pensu | 16 | 107 | cuntenti | 8 | 157 | sacciu | 5 |
| 8 | mi | 61 | 58 | avissi | 16 | 108 | me | 8 | 158 | fàcili | 5 |
| 9 | si | 49 | 59 | ci | 16 | 109 | casa | 8 | 159 | truvari | 5 |
| 10 | chiḍḍu | 48 | 60 | avìa | 16 | 110 | avemu | 8 | 160 | jennu | 5 |
| 11 | cu | 45 | 61 | chiḍḍa | 16 | 111 | facennu | 8 | 161 | aspittari | 5 |
| 12 | pi | 41 | 62 | accussì | 15 | 112 | sulu | 8 | 162 | chiḍḍi | 5 |
| 13 | li | 39 | 63 | vossìa | 15 | 113 | idea | 8 | 163 | canusci | 5 |
| 14 | bisognu | 38 | 64 | sunnu | 14 | 114 | tantu | 8 | 164 | l'avissi | 5 |
| 15 | quarchi | 37 | 65 | n'àutra | 13 | 115 | vonnu | 8 | 165 | propriu | 5 |
| 16 | na | 37 | 66 | bonu | 13 | 116 | vulìanu | 8 | 166 | sira | 5 |
| 17 | assai | 37 | 67 | amicu | 13 | 117 | vuàutri | 8 | 167 | **yoruba** | 5 |
| 18 | cchiù | 36 | 68 | putissi | 13 | 118 | pussìbbili | 7 | 168 | vèniri | 5 |
| 19 | cosa | 35 | 69 | staju | 12 | 119 | circari | 7 | 169 | purtari | 5 |
| 20 | fari | 34 | 70 | tutti | 12 | 120 | dumani | 7 | 170 | fa | 5 |
| 21 | iḍḍa | 34 | 71 | prima | 12 | 121 | tardu | 7 | 171 | dìssiru | 5 |
| 22 | comu | 33 | 72 | supra | 12 | 122 | stai | 7 | 172 | fini | 5 |
| 23 | vulìa | 33 | 73 | canusciu | 12 | 123 | 'ntirissanti | 7 | 173 | dui | 5 |
| 24 | sì | 32 | 74 | putìa | 12 | 124 | pirsuni | 7 | 174 | beḍḍu | 5 |
| 25 | ti | 31 | 75 | ora | 11 | 125 | fu | 7 | 175 | chiḍḍ'omu | 5 |
| 26 | tempu | 30 | 76 | sicuru | 11 | 126 | manera | 7 | 176 | quarchidunu | 5 |
| 27 | un | 30 | 77 | poi | 11 | 127 | parti | 7 | 177 | manciari | 5 |
| 28 | no | 29 | 78 | dispiaci | 11 | 128 | libbru | 7 | 178 | pensi | 5 |
| 29 | nta | 29 | 79 | èssiri | 11 | 129 | parrannu | 6 | 179 | càmmara | 5 |
| 30 | aju | 28 | 80 | vulissi | 11 | 130 | tu | 6 | 180 | pronti | 5 |
| 31 | dissi | 28 | 81 | ni | 11 | 131 | jornu | 6 | 181 | annu | 5 |
| 32 | sugnu | 27 | 82 | pò | 11 | 132 | risposta | 6 | 182 | nùmmaru | 5 |
| 33 | diri | 24 | 83 | tuttu | 10 | 133 | troppu | 6 | 183 | novu | 5 |
| 34 | avi | 24 | 84 | doppu | 10 | 134 | nenti | 6 | 184 | statu | 5 |
| 35 | iḍḍu | 24 | 85 | sò | 10 | 135 | stu | 6 | 185 | tia | 4 |
| 36 | ma | 22 | 86 | quantu | 10 | 136 | cosi | 6 | 186 | spissu | 4 |
| 37 | chissu | 21 | 87 | ancora | 10 | 137 | abbastanza | 6 | 187 | oggi | 4 |
| 38 | era | 21 | 88 | nni | 10 | 138 | ajutari | 6 | 188 | mia | 4 |
| 39 | pozzu | 20 | 89 | penzu | 10 | 139 | diffìcili | 6 | 189 | appena | 4 |
| 40 | pirchì | 20 | 90 | sicilianu | 9 | 140 | nuḍḍu | 6 | 190 | ajeri | 4 |
| 41 | quannu | 20 | 91 | prestu | 9 | 141 | d'accordu | 6 | 191 | mutu | 4 |
| 42 | chi | 20 | 92 | ai | 9 | 142 | màchina | 6 | 192 | àutra | 4 |
| 43 | sta | 20 | 93 | simana | 9 | 143 | travagghiu | 6 | 193 | ccà | 4 |
| 44 | jiri | 19 | 94 | stava | 9 | 144 | dari | 6 | 194 | lèggiri | 4 |
| 45 | vogghiu | 18 | 95 | vota | 9 | 145 | prubblema | 6 | 195 | misi | 4 |
| 46 | voi | 18 | 96 | 'mpurtanti | 9 | 146 | avìssimu | 6 | 196 | passatu | 4 |
| 47 | mè | 18 | 97 | unni | 9 | 147 | palora | 5 | 197 | menu | 4 |
| 48 | parrari | 17 | 98 | vìdiri | 9 | 148 | arricurdari | 5 | 198 | stancu | 4 |
| 49 | e | 17 | 99 | vitti | 9 | 149 | scupriri | 5 | 199 | mèttiri | 4 |
| 50 | tò | 17 | 100 | ḍḍà | 9 | 150 | vulemu | 5 | 200 | vulìamu | 4 |

*(`yoruba` at #167 is the contamination flagged in §0, not a real Sicilian word choice — left in the table for transparency since it's a raw count.)*

### English top 200

| # | token | count | # | token | count | # | token | count | # | token | count |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | to | 343 | 51 | ready | 22 | 101 | you're | 9 | 151 | now | 6 |
| 2 | i | 226 | 52 | all | 21 | 102 | new | 9 | 152 | try | 6 |
| 3 | you | 180 | 53 | but | 21 | 103 | leave | 9 | 153 | what's | 6 |
| 4 | the | 157 | 54 | her | 21 | 104 | couldn't | 9 | 154 | well | 6 |
| 5 | that | 122 | 55 | who | 21 | 105 | man | 9 | 155 | meet | 6 |
| 6 | a | 91 | 56 | ask | 21 | 106 | learn | 8 | 156 | stop | 6 |
| 7 | want | 66 | 57 | could | 21 | 107 | someone | 8 | 157 | start | 6 |
| 8 | do | 60 | 58 | this | 20 | 108 | else | 8 | 158 | better | 6 |
| 9 | he | 60 | 59 | your | 20 | 109 | wants | 8 | 159 | started | 6 |
| 10 | it | 59 | 60 | more | 19 | 110 | out | 8 | 160 | friends | 6 |
| 11 | i'm | 57 | 61 | and | 18 | 111 | soon | 8 | 161 | few | 6 |
| 12 | we | 56 | 62 | are | 18 | 112 | thing | 8 | 162 | understand | 6 |
| 13 | what | 55 | 63 | go | 18 | 113 | mind | 8 | 163 | enough | 6 |
| 14 | she | 55 | 64 | when | 18 | 114 | isn't | 8 | 164 | yet | 6 |
| 15 | they | 55 | 65 | been | 17 | 115 | hope | 8 | 165 | young | 6 |
| 16 | don't | 47 | 66 | friend | 16 | 116 | problem | 8 | 166 | done | 6 |
| 17 | it's | 46 | 67 | speak | 15 | 117 | them | 8 | 167 | just | 6 |
| 18 | be | 44 | 68 | able | 15 | 118 | us | 8 | 168 | each | 6 |
| 19 | have | 43 | 69 | at | 15 | 119 | saw | 8 | 169 | car | 6 |
| 20 | think | 42 | 70 | did | 15 | 120 | book | 8 | 170 | that's | 6 |
| 21 | wanted | 40 | 71 | doing | 15 | 121 | they're | 8 | 171 | get | 6 |
| 22 | was | 39 | 72 | sicilian | 14 | 122 | madam | 8 | 172 | woman | 6 |
| 23 | if | 37 | 73 | trying | 14 | 123 | possible | 7 | 173 | old | 6 |
| 24 | like | 37 | 74 | i'd | 14 | 124 | remember | 7 | 174 | needs | 6 |
| 25 | me | 35 | 75 | much | 14 | 125 | after | 7 | 175 | one | 6 |
| 26 | of | 35 | 76 | last | 14 | 126 | tomorrow | 7 | 176 | speaking | 5 |
| 27 | for | 34 | 77 | he's | 14 | 127 | find | 7 | 177 | mean | 5 |
| 28 | know | 34 | 78 | an | 14 | 128 | too | 7 | 178 | day | 5 |
| 29 | with | 32 | 79 | feel | 13 | 129 | week | 7 | 179 | come | 5 |
| 30 | my | 32 | 80 | next | 13 | 130 | morning | 7 | 180 | name | 5 |
| 31 | in | 31 | 81 | work | 13 | 131 | wasn't | 7 | 181 | long | 5 |
| 32 | can | 31 | 82 | answer | 12 | 132 | make | 7 | 182 | quiet | 5 |
| 33 | said | 30 | 83 | why | 12 | 133 | interesting | 7 | 183 | here | 5 |
| 34 | no | 30 | 84 | because | 12 | 134 | up | 7 | 184 | afternoon | 5 |
| 35 | not | 29 | 85 | i've | 12 | 135 | can't | 7 | 185 | tired | 5 |
| 36 | time | 29 | 86 | night | 12 | 136 | same | 7 | 186 | everything | 5 |
| 37 | need | 28 | 87 | so | 12 | 137 | got | 7 | 187 | put | 5 |
| 38 | yes | 28 | 88 | there | 12 | 138 | i'll | 7 | 188 | give | 5 |
| 39 | how | 27 | 89 | sure | 11 | 139 | while | 7 | 189 | words | 5 |
| 40 | very | 27 | 90 | finish | 11 | 140 | way | 7 | 190 | take | 5 |
| 41 | is | 27 | 91 | wouldn't | 11 | 141 | will | 7 | 191 | difficult | 5 |
| 42 | as | 25 | 92 | doesn't | 11 | 142 | should | 7 | 192 | look | 5 |
| 43 | going | 25 | 93 | good | 11 | 143 | heard | 7 | 193 | agree | 5 |
| 44 | on | 25 | 94 | tell | 11 | 144 | told | 7 | 194 | those | 5 |
| 45 | didn't | 25 | 95 | see | 11 | 145 | sir | 7 | 195 | talk | 5 |
| 46 | would | 25 | 96 | were | 11 | 146 | now | 6 | 196 | only | 5 |
| 47 | something | 23 | 97 | left | 11 | 147 | ... | | 197-200 | (long tail, ≤5 each) | |
| 48 | about | 23 | 98 | people | 10 | | | | | | |
| 49 | say | 22 | 99 | before | 10 | | | | | | |
| 50 | help | 22 | 100 | other | 10 | | | | | | |

---

## 2. Fork map — the main deliverable

Method: full-text search of every seed's English column for each item, print the paired Sicilian, group by which Sicilian form each instance uses.

| English item | Sicilian form(s) found | Counts | Example seeds | Verdict |
|---|---|---|---|---|
| **want** | *vuliri* (vogghiu/voi/voli/vulemu/vonnu/vuliti + past vulìa/vulivi/vulìamu/vulìanu) | one verb, all persons/tenses | #1, 20, 67, 169, 665 | **LOW RISK** — single verb, fully regular |
| **to speak** | *parrari* (parru/parri/parra/pàrranu/parrati) | one verb | #1, 9, 13, 283 | **LOW RISK** — single verb. Note: #283, #297 have the yoruba bug (§0), so read past that when checking these two |
| **I'm going to / going to** | *aviri a* + infinitive (aju a / ai a / avi a / avìa a) — periphrastic near-future | one construction, 22/22 instances | #5, 8, 23, 179, 223 | **LOW RISK** — but must be authored as the fixed frame "aviri + a + infinitive", not word-by-word |
| **to try** | *circari di* + infinitive (circari/cerchi/circannu/circammu/circàvamu) | one verb, 5/6 instances | #8, 236, 407, 491, 541 | **LOW RISK** for "try" itself — but see §3, *circari* is a **reverse fork** (also = "look for") |
| — seed #7 exception | "I want to try as hard as I can" → *vogghiu fari tuttu chiḍḍu ca pozzu* (lit. "I want to do everything I can") | 1/6 | #7 | Not a translation of "try" at all — a paraphrase. Not a fork, just don't cite #7 as a "try" example when building the LEGO |
| **to remember** | *arricurdari* (reflexive: arricurdàrimi/mi pozzu arricurdari) | one verb, 7/7 | #6, 10, 24, 56, 57, 113, 232 | **LOW RISK** — always reflexive "arricurdàrisi" (to remember oneself of) |
| **what** | *chiḍḍu ca* ("that which") in embedded/relative clauses; *chi* in direct questions | ~40 chiḍḍu ca / ~20 chi | chiḍḍu ca: #8, 12, 17, 57; chi: #162, 169, 258, 631 | **MEDIUM** — not random, but a real fork: it's conditioned by syntax (interrogative "what...?" = *chi*; embedded "[that] which" = *chiḍḍu ca*). The author needs this rule stated explicitly, or LEGOs will look inconsistent. Also idiomatic: "what is your name" → *comu ti chiami* (lit. "how are you called"), not either form (#150, #465) |
| **can** | *putiri* (pozzu/poi/pò/putemu/putiti) | one verb, all persons | #7, 90, 150, 331, 529 | **LOW RISK** — single verb |
| **more** | *cchiù* (comparative, modifying adj/adv/verb); *n'àutra tanticchia di* ("another little bit of") when quantifying a mass noun like time | cchiù: 15/19; n'àutra tanticchia di: 4/19 (all "a little more time/slowly") | cchiù: #23, 101, 137, 209; n'àutra tanticchia di: #54, 61, 96, 296 | **MEDIUM** — conditioned split (comparative adv/adj = cchiù; "a little more + mass noun" = n'àutra tanticchia di), not random, but needs the rule documented |
| **people** | *genti* (collective) vs *pirsuni* (countable plural) | genti: 3 (#22, 34, 419); pirsuni: 7 (#85, 87, 88, 286, 287, 288, 297) | see above | **HIGH RISK** — I could not find a reliable conditioning rule from the data alone (see §6 open question). Pick one or get the rule from a native speaker before building this LEGO |
| **thing** | *cosa* | one word, 8/8 | #47, 143, 257, 258, 573 | **LOW RISK** |
| **time** | *tempu* (duration/uncountable); *vota* (an occurrence — "this/next/last time"); *ura* ("it's time to..." = lit. "it's the hour to") | tempu: ~19; vota: ~7; ura: 1 (#93) | tempu: #27, 65, 209; vota: #61, 214, 465, 572; ura: #93 | **MEDIUM** — three distinct senses of English "time" map predictably to three different Sicilian words. Not a coin-flip, but three LEGOs, not one |
| **to know** | *sapiri* (facts/propositions) vs *canusciri* (people/acquaintance) | sapiri: ~20; canusciri: ~14 | sapiri: #45, 49, 59, 105, 135, 201; canusciri: #85, 128, 133, 230, 233, 284 | **NOT A FORK** — this is the classic savoir/connaître split and it is applied *consistently* in this corpus: every "know [fact/clause]" is sapiri, every "know [a person]" is canusciri, with zero counterexamples found. Document the rule; it will make LEGO authoring easier, not harder |
| **to say** | *diri* (dici/dissi/dìssiru/dicìstivu) | one verb, 21/21 | #4, 61, 102, 200, 360 | **LOW RISK** — single verb. Note #160 has the yoruba bug (§0) |
| **to get** | 6 different Sicilian verbs, one per idiom: canusciri ("get to know"), priparàrisi ("get ready"), jìrisinni ("get away"), dòrmiri ("get some sleep"), arristari arreri ("get left behind"), arrivari ("get there") | 6/6, no repeats | #133, 397, 485, 497, 505, 562 | **NOT A ZUT FORK** (no English "get X" repeats with two different translations) but a strong methodology note: "get" has **no single Sicilian correspondent**. Never build a "get" LEGO — build one LEGO per idiom (get-ready, get-away, etc.) |
| **to make / to do** | Both converge on *fari* | fari: "make" 6/7, "do" ~50/56 | make: #47, 116, 408, 489; do: #59, 169, 218, 451 | **CONVERGENCE, not fork** (see §3) — "make" and "do" are the same Sicilian verb. Fine for ZUT (English→Sicilian is still consistent per-item), but means the two LEGOs will look identical in Sicilian, which the author should know going in |
| **name** | *nomu* (noun, stated fact) vs *comu ti chiami / comu si chiama* ("how are you/is she called" — idiom for "what is X's name") | nomu: 3 (#20, 21, 166); comu chiamari: 2 (#150, 465) | see above | **MEDIUM** — predictable: "my/his/her name is..." = nomu; "what is X's name?" = the *chiamari* idiom. Two LEGOs, not a coin-flip |
| **all** | *tuttu/tutti* (quantifier); *vuàutri* ("you all" = 2nd person plural pronoun, unrelated meaning) | tuttu/tutti: 8; vuàutri: 13 (all "you all" contexts, seeds 656-668) | #14, 69, 313, 331; #656-668 | **NOT A FORK** — two different grammatical functions of English "all" (quantifier vs. part of the pronoun "you-all"), not two translations of the same idea |
| **some** | *quarchi* (countable — "some questions/ideas/friends/postcards"); *tanticchia* ("a little" — for the uncountable "some sleep") | quarchi: 4 (#190, 335, 350, 461); tanticchia: 1 (#497) | see above | **MEDIUM** — conditioned by countable vs. uncountable, consistent with n=5, but small sample; flag for confirmation |
| **again** | *n'àutra vota* ("another time/occasion") | 1 clean instance (#61); #490 is "never...again" = *mai cchiù*, a fixed idiom, not "again" alone | #61, 490 | Sample too small to call a pattern either way — **note only** |
| **still** | *ancora* (temporal — "still young/still fighting"); *lu stissu* ("the same" — concessive "still/anyway") | ancora: 2 (#410, 440); lu stissu: 1 (#593) | see above | **MEDIUM** — two different senses of English "still" (temporal continuation vs. concessive "nonetheless") get two different Sicilian words. Small sample (n=3) but the split is semantically well-motivated, not noise |
| **already** | *già* | 3/3 | #76, 244, 421 | **LOW RISK** |
| **always** | 0 hits in the 668-seed corpus | — | — | Not present — no risk data available, and no LEGO can be built from this corpus for "always" without new seeds |
| **never** | *mai* | 2/2 | #309, 490 | **LOW RISK** (small sample) |
| **because** | *pirchì* (20 instances) / *picchì* (2 instances, #421, #455) | same word, two spellings | #22, 47, 130 (pirchì); #421, #455 (picchì) | **HIGH RISK — but orthographic, not semantic.** This looks like a dialectal/authoring-inconsistency spelling variant of the identical word, not two different Sicilian words for "because". Needs a native speaker to confirm they're the same word before the decomposer picks one canonical spelling (§6) |
| **when** | *quannu* | 18/18 | #34, 79, 111, 252, 495 | **LOW RISK** |
| **if** | *si* (34 instances) / *siddu* (1 instance, #90) / *macari si* ("even if", #352 — a fixed compound, not a plain fork) | si dominant | #10, 26, 49, 165... (si); #90 (siddu) | **HIGH RISK / open question** — *siddu* appears exactly once, in "If you can speak more slowly..." I cannot tell from one instance whether *siddu* is a free variant of *si*, a register/dialect choice, or conditioned by something (e.g. clause-initial position — #90 is the only "if" that opens the sentence in my sample of these instances). Flagged in §6 |
| **after** | *doppu* (+ *doppu ca* before a clause, *doppu* + noun otherwise) | 7/7 | #11, 69, 110, 251, 494 | **LOW RISK** — predictable doppu ca/doppu split by what follows (clause vs. noun), not a fork |
| **before** | *prima* (+ *prima ca* before a clause, *prima di* before a noun) | 10/10 | #25, 119, 237, 250, 309 | **LOW RISK** — same predictable split as "after" |

---

## 3. Reverse forks (convergence)

These are cases where **one Sicilian word covers more than one distinct English idea**. Not ZUT violations on their own (the English→Sicilian direction can still be one-to-one per item), but they constrain how English prompts must be worded so the learner isn't asked to disambiguate something Sicilian doesn't distinguish.

### 3a. *circari* = both "to try" and "to look for / to search for" — **HIGH RISK, flag prominently**
26 seeds use *circari*. Two clearly distinct English senses:
- "try to X" (circari di + infinitive): #8, 102, 146, 159, 205, 236, 372, 407, 541
- "look for / search for X" (circari, no "di"): #68, 171, 194, 510, 610, 611

Example: #68/#194 "What are you looking for?" → *chi stai circannu?* vs. #8 "I'm going to try to explain" → *aju a circari di spiegari*. The presence/absence of *di* + infinitive appears to be the syntactic marker separating the two senses (INFERRED — consistent across all 26 instances here, but nobody has confirmed this is a real grammatical rule and not a coincidence of this particular seed set). **This directly answers the brief's question**: yes, one Sicilian verb covers both "try" and "look for" in this corpus. Author needs to know this before writing English prompts that could be read either way.

### 3b. *fari* = both "to do" and "to make" — convergence, low risk
"do" (~50 instances: #59, 169, 218, 451) and "make" (6/7 instances: #47, 116, 408, 489) both render as *fari*. Standard Romance-language convergence (compare French/Italian/Spanish *faire/fare/hacer*). Not a problem for ZUT, but the "do" and "make" LEGOs will be built on the identical Sicilian verb.

### 3c. *sapiri* vs *canusciri* — checked, NOT a convergence
Per the brief's specific question: does one form cover both "to know a fact" and "to know a person"? **No** — the corpus is clean here. *sapiri* = facts/propositions only, *canusciri* = people only, with zero mixing across ~34 "know" instances (§2). This is worth documenting as a confirmed *non-issue*, since it's exactly the kind of thing that could have gone wrong.

### 3d. *si* = "if" AND a reflexive/reciprocal/impersonal clitic — **HIGH RISK, orthographic collision**
53 seeds contain the bare token *si*. The overwhelming majority (~50) are the conditional conjunction "if" (#10, 26, 49, 165...). But at least two are a different grammatical word entirely:
- #410 "They still fight with each other." → *si sciarrìanu ancora unu cu l'àutru* — reciprocal clitic ("they fight-themselves")
- #465 "...what her name is." → *comu si chiama* — impersonal/reflexive clitic ("how she calls-herself")

These are spelled identically to conditional "si" but are a different part of speech. Any automated ZUT/gloss tool that treats "si" as one token will conflate a conjunction with a pronoun. Flagged for the decomposer's tokenizer, not just the human author.

### 3e. *avi* — idiomatic elapsed-time use of "to have"
Beyond the plain "has" sense (#12, 289, 319), *avi* is also used existentially for elapsed time: #33 "How long have you been learning?" → *quantu tempu avi ca stai 'mparannu...* (lit. "how much time has-it that you're learning"), #38 "I've been learning for about a week" → *avi cchiù o menu na simana ca...*. This is a standard extension of "to have" (compare French *ça fait...*/Italian *sono...che*) — not a fork, just worth flagging so the "have"-LEGO author doesn't miss that this idiom exists in the corpus (2 instances: #33, #38).

---

## 4. Verb paradigm sheet

All forms below are taken directly from the 668 seeds — nothing invented. Person/tense labels are inferred from the paired English gloss.

### vuliri — "to want" (66 English instances, fully regular)
| Form | Person/tense | Example seed | English |
|---|---|---|---|
| vogghiu | 1sg present | #1 | I want to speak Sicilian... |
| voi | 2sg present | #20 | You want to learn his name... |
| voli | 3sg present (also polite "vossìa") | #34, 643 | He doesn't want to.../Do you want, sir |
| vulemu | 1pl present | #18 | We want to meet at six... |
| vonnu | 3pl present | #209 | They want to spend more time... |
| vuliti | 2pl present ("you all") | #658 | Do you all want? |
| vulìa | 1sg/3sg imperfect (syncretic) | #208, #69 | I didn't want to ask.../He didn't want... |
| vulivi | 2sg imperfect | #32 | Did you want to show me...? |
| vulìamu | 1pl imperfect | #71 | We didn't want to let anyone... |
| vulìanu | 3pl imperfect | #211 | They told us they didn't want... |
| vulissi | 1sg/3sg conditional ("would want/like") | #170, 631 | I'd like you to tell me.../What would you like? |
| vulirìa | 1sg conditional (alt. form) | #11, 12 | I'd like to be able to.../I wouldn't like to guess |
| vulìssiru | 3pl conditional | #427 | They wouldn't like you to think... |

### putiri — "can / to be able to" (38 instances, fully regular)
| Form | Person/tense | Example seed | English |
|---|---|---|---|
| pozzu | 1sg present | #10 | ...if I can remember... |
| poi | 2sg present | #90, 150 | If you can speak.../Can you tell me... |
| pò | 3sg present | #331, 332 | She can't provide.../He can build... |
| putemu | 1pl present (negated) | #469 | ...that doesn't mean we can't change it |
| putiti | 2pl present | #529 | Can you all put your hands up? |
| putìa | 1sg/3sg imperfect | #479 | It's the least I could do |
| putissi | 1sg/3sg conditional | #317 | I think she could if she wanted to |
| putìssimu | 1pl conditional | #413 | We could fall if we go too close |
| putìssiru | 3pl conditional | #435 | Yes they could if they wanted to |
| putìssivu | 2pl conditional | #659 | Could you all say that? |
| pututu | past participle | #563 | I wouldn't have been able to keep going |

### aviri a — "to be going to / have to" (near-future periphrasis, 22+ instances, fully regular)
| Form | Person/tense | Example seed | English |
|---|---|---|---|
| aju a | 1sg present | #5 | I'm going to practise... |
| ai a | 2sg present | #25, 179 | Are you going to help.../What are you going to do |
| avi a | 3sg present | #223, 227 | He's going to ask you.../That man is going to tell me |
| avìa a | 1sg/3sg imperfect | #201, 348 | We wanted to know what was going to happen |
| avemu a | 1pl present | #109 | We must work hard to learn... |
| annu a | 3pl present | #450 | No they have to catch the train... |
| avìamu a | 1pl imperfect | #587 | She used to insist that we had (to)... |
| avissi a | 1sg/3sg conditional/"should" | #98, 253, 438 | I should consider.../I should be ready.../...what he should do |

### aviri — "to have" (plain possession/need, distinct from the "a"+infinitive periphrasis above)
| Form | Person/tense | Example seed | English |
|---|---|---|---|
| aju | 1sg present | #44, 45, 59 | ...if I need.../I don't need to know.../ (bisognu = "need") |
| ai | 2sg present | #75, 167, 274 | Have you got more to learn?/What do you need.../Do you have to leave |
| avi | 3sg present | #33, 38, 319, 320 | How long have you been.../She needs to move... |
| avemu | 1pl present | #104, 106, 396 | We need to change.../We don't need to feel... |
| annu | 3pl present | #418, 420, 423 | They need to serve.../They don't need to ask... |
| appi | 1sg preterite | #178, 379 | I didn't have time.../I was lucky enough to travel |
| avìa | 1sg/3sg imperfect | #280, 296, 353, 354, 355 | I only had to do.../I said I needed... |
| avìanu | 3pl imperfect | #356 | They had something important... |
| avìamu | 1pl imperfect | #521, 603, 605 | ...why we needed to stay/We didn't have anywhere/Because we needed help |
| avissi | 1sg/3sg conditional | #152, 535, 563, 564 | I would have done it.../He wouldn't have chosen.../I wouldn't have been able |

### èssiri — "to be" (highly irregular, extensively attested)
| Form | Person/tense | Example seed | English |
|---|---|---|---|
| sugnu | 1sg present | #10, 39, 76 | I'm not sure.../I'm a little tired.../I'm very happy |
| si' | 2sg present | #252, 255, 569 | When will you be ready.../How much are you willing |
| è | 3sg present (very common, 84 occurrences of the bare form) | #7 (via "chi è"), #93 | "è ura di jiri" — it's time to go |
| semu | 1pl present | #110 | We're friends... |
| siti | 2pl present | #626, 664 | (siti pronti) Are you all ready? |
| sunnu | 3pl present | #87, 131, 396, 440 | They are people.../There are too many ideas... |
| fu | 3sg preterite | #86, 112, 130, 147, 148 | It wasn't possible.../That was very interesting... |
| fusti | 2sg preterite | #615, 616 | I thought you were very brave... |
| era | 1sg/3sg imperfect | #70, 124, 125, 138, 151, 202 | ...where it was/I thought that was a good idea |
| èranu | 3pl imperfect | #449, 455 | They said they were almost ready/...the children were tired |
| fussi | 1sg/3sg conditional/subjunctive | #26, 90, 115, 172, 401, 402, 415, 429 | If you can speak more slowly, that would be great |
| statu / stata | past participle (m/f) | #567, 575, 576, 599, 611 (statu); 566, 608, 609 (stata) | It's been lovely.../It would have been the sensible thing |

### jiri — "to go" (irregular; suppletive present-tense stem)
| Form | Person/tense | Example seed | English |
|---|---|---|---|
| jiri | infinitive | #25, 26, 93, 95, 97, 120, 156 | (used constantly with aviri a / voliri / piaciri, "to go") |
| vaju | 1sg present | #512 | ...while I fetch (go get) the keys |
| vai | 2sg present | #119, 249 | ...before you leave/go |
| jemu | 1pl present | #413 | ...if we go too close to the edge |
| vannu | 3pl present | #131 | ...too many ideas going around |
| jiu | 3sg preterite | #510 | She's gone to look for... |
| jivi | 1sg preterite | #371, 376 | I went to see a film.../I didn't go anywhere |
| jisti | 2sg preterite | #362, 377 | ...after you left/Did you go anywhere |

Note: present-tense forms of "to go" are rare in this corpus (only 5 instances total for vaju/vai/jemu/vannu combined) because most "go" contexts use the *aviri a* / *vuliri* / *piaciri* + jiri infinitive periphrasis rather than a finite present. This is a genuine gap in the 668-seed sample, not a fork — just note it if the decomposer needs more present-tense "go" forms than the corpus currently has.

### parrari — "to speak" (fully regular, 15 instances)
vogghiu **parrari** (inf, #1) · **parru** (1sg, #9) · **parri** (2sg, #13, 14) · **parra** (3sg, #22, and yoruba-contaminated #285) · **pàrranu** (3pl, #283, 297 — yoruba-contaminated) · **parrati** (2pl, #662)

### diri — "to say" (fully regular, 21 instances)
**diri** (inf, #4) · **dici** (3sg present, #160 — yoruba-contaminated, #533) · **dissi** (3sg preterite, #295, 360) · **dìssiru** (3pl preterite, #452, 453) · **dicìstivu** (2pl preterite, #663)

### fari — "to do / to make" (56+ instances, fully regular)
**fari** (inf, #59, 175) · **fazzu** (1sg present, #169) · **fici** (1sg preterite, #218) · **facisti** (2sg preterite, #207) · **facemu** (1pl present, #409) · **facissi** (1sg/3sg conditional, #203) · **fai** (2sg present, #489)

### sapiri — "to know [a fact]" (fully regular, ~20 instances)
**sapiri** (inf, #45, 59, 201, 347) · **sacciu** (1sg present, #135, 263, 606) · **sai** (2sg present, #49) · **sapìa** (1sg/3sg imperfect, #105, 375) · **sapemu** (1pl present, negated, #213, 472) · **sannu** (3pl present, #421) · **saputu** (past participle, #152, 606, 607)

### canusciri — "to know [a person] / be acquainted with" (fully regular, ~14 instances)
**canusciu** (1sg present, #85, 230, 231, 232, 233, 236, 297) · **canusci** (2sg present, #233, 284, 287, 306, 307, 355) · **canuscìa** (1sg/3sg imperfect, #128)

### arricurdari — "to remember" (always reflexive, 7 instances)
**arricurdàrimi** (inf+1sg clitic "myself", #24) · **mi pozzu arricurdari** (1sg present periphrastic, #10, 56, 57, 113) · **si pò arricurdari** (3sg present periphrastic, #232)

### piaciri — "to like" (impersonal/dative construction — "it is pleasing to X", 30 instances)
| Form | Meaning | Example seed |
|---|---|---|
| mi piaci | I like (lit. "it's pleasing to me") | #26, 27, 51, 257, 629 |
| ti piaci | you like | #120, 121, 628 |
| ci piaci | he/she/they like (3rd person dative clitic) | #239, 240, 286, 287, 288 |
| mi piacìa | I liked (imperfect) | #346 |
| ci piacìa | he/she liked (imperfect) | #364 |
| mi sta piacennu | I'm liking / enjoying (progressive) | #101 |

This is a fixed-frame construction (dative clitic + invariant 3rd-person verb agreeing with the thing liked) — the same pattern as Spanish *gustar*. Companion form **dispiaciri** ("to mind/be sorry", lit. "to displease") uses the identical frame: *mi dispiaci, ti dispiaci, ci dispiaci* (#63, 155, 190, 653, 667).

---

## 5. The pronoun/clitic question

**Finding: the corpus is consistent, not ambiguous, on this point** — contrary to what the brief's framing anticipated. Two clean, non-overlapping patterns:

**Pattern A — clitic attaches to the end of the infinitive (and only the infinitive), forming one word.** 41 instances found, no exceptions:
arricurdàri**mi** (#6, 24), aiutàri**mi** (#25, 63, 74, 226), dàri**ti** (#54), pigghiàri**si** (#65, 508), dìri**lu** (#208), dìri**mi** (#222), dìri**ti** (#235), chiamàri**ti** (#294), fàri**lu** (#443), jittàri**lu** (#466), curcàri**mi** (#595), fàri**ni** (#604), and 29 more of the same shape.

**Pattern B — clitic stands as a separate word immediately before a finite (conjugated) verb.** ~312 rough matches (this count is noisy — the search regex also catches non-clitic uses of *mi/ti/si/li* as parts of other words, so treat it as an upper bound, not exact); clean examples: *mi pozzu arricurdari* (#10), *ti voi firmari* (#67), *si vonnu piàciri* (#419), *nun mi dispiaci* (#191), *ci piaci* (#239).

**I searched specifically for counter-examples — a clitic detached before an infinitive, or fused onto a finite verb — and found none.** (A crude regex flagged 6 candidates; all were false positives: *mi pari* is a finite verb "seems," not infinitive+clitic; *lu manciari* is "the meal" — a nominalized infinitive with the definite article *lu*, not a clitic; *li picciriḍḍi* is "the children" — *li* there is the plural definite article, not the clitic.)

**Conclusion for the author**: the placement rule is not a blocking question. Clitics attach to infinitives (and, per #466 "lassami" — "let-me", to positive imperatives too, 1 instance) and precede finite verbs. This is the standard Romance clitic-placement rule and this corpus follows it with no drift.

---

## 6. Open questions for a native speaker

These are the points genuinely not resolvable from the data. Plain-English questions, with the actual competing sentences so a Sicilian speaker can just pick.

**Q1 — "people": genti or pirsuni?**
Both appear for English "people" with no rule I could find:
- "Because I want to meet **people** who speak Sicilian" → *pirchì vogghiu canusciri **genti** ca parra sicilianu* (seed 22)
- "I don't know those **people**." → *nun canusciu a chiḍḍi **pirsuni**.* (seed 85)
- "**People** who like speaking Sicilian." → ***Pirsuni** ca ci piaci parrari [sicilianu]* (seed 286)

Question for the speaker: *Is there a real difference in meaning or register between "genti" and "pirsuni" for "people" in these three sentences, or are they interchangeable? If there's a rule (e.g. countable groups vs. a general mass of people), what is it?*

**Q2 — "because": pirchì or picchì — same word or different?**
20 instances spell it *pirchì*; 2 spell it *picchì* (seeds 421, 455).
Question: *Are "pirchì" and "picchì" the same word just spelled two ways, or are they genuinely different words? If they're the same word, which spelling should the course standardize on?*

**Q3 — "if": si or siddu?**
34 instances use *si* for "if"; exactly one (seed 90) uses *siddu*: *"If you can speak more slowly that would be great." → "siddu poi parrari cchiù chianu, fussi na gran cosa."*
Question: *Is "siddu" just another way of saying "si" ("if"), used here by choice/register, or does it mean something subtly different (e.g. a more formal "if", or "provided that")? Should the course use only one of them?*

**Q4 — "more": is "n'àutra tanticchia di" really conditioned by mass vs. count, or is it free variation with "cchiù"?**
Every "a little more [time/slowness]" case uses *n'àutra tanticchia di* (e.g. seed 54: "We wanted to give you a little more time" → *vulìamu dàriti n'àutra tanticchia di tempu*), while every plain comparative "more [adjective/adverb]" uses *cchiù* (e.g. seed 137: "It's more important..." → *è cchiù 'mpurtanti*).
Question: *Could you say "cchiù tempu" instead of "n'àutra tanticchia di tempu" for "a little more time", or would that sound wrong/different in meaning? I.e., is the "n'àutra tanticchia di" phrasing required for mass nouns like time, or was it just this translator's stylistic choice?*

**Q5 — "still": is "ancora" vs. "lu stissu" a genuine two-way split?**
"They **still** fight with each other" and "They want to travel while they're **still** young" both use *ancora* (temporal, seeds 410, 440). But "However much I argued I **still** had to share" uses *lu stissu* (lit. "the same"): *pi quantu discutìa, avìa a spàrtiri lu stissu* (seed 593).
Question: *For the concessive sense of "still" (as in "even so, I still had to...") is "lu stissu" the normal/only way to say it, or could "ancora" also work there? And for the temporal sense ("still young", "still fighting"), is "ancora" always correct, or does it depend on the verb?*

**Q6 — "know": no counterexamples found for sapiri (facts) vs. canusciri (people) — can you confirm this is a hard rule?**
This one is not a gap so much as a request to confirm a finding: every instance of "know" in this corpus that refers to a fact or clause uses *sapiri*, and every instance that refers to a person uses *canusciri*, with zero mixing across ~34 examples.
Question: *Is this split (sapiri for facts, canusciri for people) an absolute grammatical rule in Sicilian, or are there contexts where the two are interchangeable?*

**Q7 — "circari": does it really cover both "try" and "look for", and is the "di + infinitive" the actual marker?**
Seed 8: "I'm going to try to explain" → *aju a **circari di spiegari**...* Seed 68/194: "What are you looking for?" → *chi stai **circannu**?* (no "di" + infinitive, because there's no infinitive — it's a direct object).
Question: *Is "circari" (without "di") only used for "look for [a thing]", and "circari di" (with "di" + a verb) only used for "try to [do something]"? Or can "circari di" also mean "look for a way to..." in some contexts, in a way that could confuse a learner?*

**Q8 — the "si" collision (if / reflexive-reciprocal clitic): is this a real ambiguity for a listener, or always clear from context?**
Seed 410 "They still fight with each other" → *si sciarrìanu ancora...* uses *si* as a reciprocal clitic, not "if". Seed 465 "...what her name is" → *comu si chiama* uses *si* as an impersonal/reflexive clitic.
Question: *When a Sicilian speaker hears "si" in a sentence, is it always instantly clear from word order/context whether it means "if" or is a reflexive/reciprocal pronoun, or could a learner genuinely get confused? Is there ever ambiguity even for a native speaker?*

---

## Explicit gaps

- **No coverage for "always"** — zero occurrences in this 668-seed corpus. Any LEGO/paradigm claim about "always" needs new seed data; this report has none to offer.
- **Present-tense "to go" (jiri) is thin** — only 5 finite present-tense instances (vaju/vai/jemu/vannu) across the whole corpus; most "go" content routes through the *aviri a jiri* / *vuliri jiri* periphrasis instead. Not a fork, just a real gap in paradigm coverage if the decomposer needs more finite-present "go" examples.
- **"again" has only 2 instances**, one of which is folded into the fixed idiom "never again" (mai cchiù) rather than being "again" on its own — too small a sample to state a rule.
- **"siddu"(if) and "picchì"(because) each have only 1-2 instances** — too small to distinguish "genuine variant word" from "one-off typo/dialect choice" without a native speaker (§6, Q2 and Q3).
- I did not exhaustively check every one of the 1,005 distinct Sicilian tokens against every one of the 816 English tokens for convergence — §3's reverse-fork list covers what surfaced while investigating the §2 fork-map items and the "know" question the brief specifically asked about, not a full cross-product sweep. A deeper reverse-fork pass (e.g. checking every Sicilian word that appears 5+ times against all its English glosses) was out of scope for this pass but would be a reasonable follow-up before authoring is complete.
