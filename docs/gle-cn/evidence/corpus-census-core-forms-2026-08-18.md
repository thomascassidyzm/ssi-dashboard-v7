# Irish Core-Forms Corpus Census — gle_for_eng

Generated 2026-08-18 on branch `docs/gle-cn-core-inventory-2026-08-18`. Read-only measurement — no writes to Supabase, no TTS, zero spend.

## Corpora

- **Corpus A (legacy export)**: `.a108-gle/base-items.json`, flattened from `scripts/en-ga-compare/en-ga.json` (511 seeds, 1938 legos, 13455 phrases = **15904 items**).
- **Corpus B (live)**: read directly from Supabase via a fresh read-only SELECT against `course_seeds` / `course_legos` / `course_practice_phrases` WHERE `course_code='gle_for_eng'` at report time — **7586 items** (668 seeds + 943 legos + 5975 phrases). No rows were written, updated, or deleted. This matches a static CSV export in `scripts/en-ga-compare/raw-{seeds,legos,phrases}.csv` (dated 2026-08-17) count-for-count, confirming the CSVs were not stale, but the numbers below come from the live query, not the CSVs.

## Matcher and calibration (mandatory, before results)

Matcher: Irish-aware word-boundary regex reused from `docs/gle-cn/dialect-census.cjs` — word characters are ASCII letters, accented vowels `áéíóúÁÉÍÓÚ`, apostrophe (straight or curly), and hyphen; everything else (space, punctuation, string start/end) is a boundary. Case-insensitive. Multi-word phrases match across an internal space boundary the same way.

**Diacritic note (a real failure mode caught during calibration):** the brief's phrase list is written in plain ASCII (`ceard`, `ta`, `nior`, `teastaionn`...) but both corpora carry fadas throughout (`céard`, `tá`, `níor`, `teastaíonn`...). A literal ASCII match against fada'd text returns 0 for nearly everything — that failure mode was caught, not shipped. This script maps every brief phrase to its fada-correct canonical form (`FADA_MAP` in `scripts/gle-core-inventory-census.cjs`) before matching, rather than diacritic-folding both sides, so matches stay precise instead of over-collapsing distinct words (e.g. `sílim` vs a hypothetical `silim`-as-different-word).

| Check | Expected | Got | Pass? |
|---|---|---|---|
| KNOWN POSITIVE: `céard` in corpus A | ~644 | **644** | YES exact |
| KNOWN NEGATIVE: `cad` standalone in corpus A | 0 | **0** | YES |
| `cad` standalone in corpus B | ~522 | **530** (raw occurrence count) / **522** (distinct-item count, matches the OTHER-group table below exactly) | occurrence count is 530 because a few items contain `cad` twice; item count matches exactly |
| EMBEDDING TRAP: `cad` must not hit `cadas` | 0 spurious | `cadas` substring count in A = **0**; `cad`-matched-items in A = **0** | PASS — the boundary regex correctly excludes `cadas` |
| EMBEDDING TRAP: `ann` must not hit `ceann`/`canna` | distinct counts | `ann`=778, `ceann`=109 (not folded into `ann`'s count), `canna`=0 | PASS — boundary regex keeps these separate |
| EMBEDDING TRAP: `ar` must not hit `arán`/`céard` | distinct counts | `ar`=1648, `arán`=0 (0 — arán doesn't appear in corpus A at all, so this trap is untestable there but the boundary logic that protects it is the same one validated above) | PASS |

Calibration passes. Matcher is trusted for the counts below.

**Known matcher limitation to flag:** the matcher is a literal substring-at-boundaries match, not a morphological/lemma matcher. It will NOT find a form via a different orthographic root (e.g. it will not connect `ceapann` and `cheapann` — the eclipsed/lenited form — as the same verb; each surface form is counted separately). Where the brief lists several eclipsed/mutated variants of the same word (e.g. it did not for most groups here), those variants are undercounted unless explicitly listed. This is flagged, not silently absorbed.

## Core-form group counts

Counts are **item counts** (number of distinct corpus items whose Irish text contains the phrase at a word boundary), per the brief. Examples shown only when count > 0, capped at 3 verbatim EN/GA pairs.

### Corpus A (legacy export, 15,904 items)

| Group | Phrase (brief spelling) | Matched as (fada-correct) | Item count |
|---|---|---|---|
| TRY | ag iarracht | ag iarracht | 0 |
| TRY | iarracht a dheanamh | iarracht a dhéanamh | 38 |
| TRY | ag deanamh iarracht | ag déanamh iarracht | 0 |
| TRY | iarracht | iarracht | 62 |
| TRY | ag triail | ag triail | 125 |
| TRY | triail | triail | 125 |
| TRY | bain triail as | bain triail as | 0 |
| TRY | ag feachaint le | ag féachaint le | 0 |
| TRY | ag breathnu le | ag breathnú le | 0 |
| TRY | ag tabhairt faoi | ag tabhairt faoi | 0 |
| WANT | ag iarraidh | ag iarraidh | 2680 |
| WANT | ba mhaith liom | ba mhaith liom | 806 |
| WANT | ar mhaith leat | ar mhaith leat | 80 |
| WANT | nior mhaith liom | níor mhaith liom | 4 |
| WANT | teastaionn | teastaíonn | 21 |
| WANT | ag teastail | ag teastáil | 60 |
| LIKE | is maith liom | is maith liom | 82 |
| LIKE | taitnionn | taitníonn | 14 |
| CAN | in ann | in ann | 646 |
| CAN | abalta | ábalta | 0 |
| CAN | is feidir | is féidir | 157 |
| CAN | thig liom | thig liom | 0 |
| KNOW | ta a fhios agam | tá a fhios agam | 5 |
| KNOW | ta fhios agam | tá fhios agam | 0 |
| KNOW | nil a fhios agam | níl a fhios agam | 4 |
| KNOW | nil fhios agam | níl fhios agam | 59 |
| KNOW | aithne | aithne | 156 |
| KNOW | is eol | is eol | 8 |
| MUST/NEED | caithfidh | caithfidh | 22 |
| MUST/NEED | ni mor | ní mór | 0 |
| MUST/NEED | ta orm | tá orm | 136 |
| MUST/NEED | ta orainn | tá orainn | 26 |
| THINK | ceapaim | ceapaim | 382 |
| THINK | ceapann | ceapann | 42 |
| THINK | silim | sílim | 0 |
| THINK | is doigh liom | is dóigh liom | 0 |
| THINK | measaim | measaim | 0 |
| SPEAK/PRESENT SYSTEM | labhraim | labhraím | 76 |
| SPEAK/PRESENT SYSTEM | labhrann me | labhrann mé | 0 |
| SPEAK/PRESENT SYSTEM | labhraionn tu | labhraíonn tú | 84 |
| SPEAK/PRESENT SYSTEM | ag labhairt | ag labhairt | 64 |
| SPEAK/PRESENT SYSTEM | ta Gaeilge agam | tá Gaeilge agam | 2 |
| SPEAK/PRESENT SYSTEM | labhraimid | labhraímid | 0 |
| SPEAK/PRESENT SYSTEM | labhrann muid | labhrann muid | 0 |
| COPULA | is maith | is maith | 98 |
| COPULA | ba mhaith | ba mhaith | 972 |
| COPULA | is e | is é | 161 |
| COPULA | is ea | is ea | 0 |
| COPULA | ni hea | ní hea | 0 |
| BE | ta me | tá mé | 1842 |
| BE | nil me | níl mé | 296 |
| BE | ta muid | tá muid | 0 |
| BE | taimid | táimid | 22 |
| BE | an bhfuil | an bhfuil | 320 |
| BE | nach bhfuil | nach bhfuil | 130 |
| BE | bhi me | bhí mé | 220 |
| BE | ta tu | tá tú | 152 |
| OTHER | cen chaoi | cén chaoi | 0 |
| OTHER | conas | conas | 276 |
| OTHER | cen bealach | cén bealach | 0 |
| OTHER | ceard | céard | 641 |
| OTHER | cad | cad | 0 |
| OTHER | eigin | éigin | 352 |
| OTHER | eicint | éicint | 0 |
| OTHER | chuile | chuile | 0 |
| OTHER | gach | gach | 213 |
| OTHER | freisin | freisin | 0 |
| OTHER | fosta | fosta | 0 |
| OTHER | anois | anois | 1730 |
| OTHER | ar ball | ar ball | 31 |
| OTHER | go direach | go díreach | 0 |
| GOING TO | ta me chun | tá mé chun | 48 |
| GOING TO | ta me ag dul | tá mé ag dul | 0 |
| GOING TO | beidh me | beidh mé | 66 |

<details><summary>Examples (corpus A (legacy export, 15,904 items), count > 0 only)</summary>

**TRY / iarracht a dheanamh → iarracht a dhéanamh** (38)
  - EN: "Shouldn't we attempt to set a good example?" → GA: "Nár chóir dúinn iarracht a dhéanamh dea-shampla a leagan?"
  - EN: "to attempt" → GA: "iarracht a dhéanamh"
  - EN: "I want to attempt" → GA: "tá mé ag iarraidh iarracht a dhéanamh"

**TRY / iarracht → iarracht** (62)
  - EN: "Shouldn't we attempt to set a good example?" → GA: "Nár chóir dúinn iarracht a dhéanamh dea-shampla a leagan?"
  - EN: "to attempt" → GA: "iarracht a dhéanamh"
  - EN: "I want to attempt" → GA: "tá mé ag iarraidh iarracht a dhéanamh"

**TRY / ag triail → ag triail** (125)
  - EN: "Because I'm trying to learn Irish." → GA: "Mar tá mé ag triail Gaeilge a fhoghlaim."
  - EN: "trying" → GA: "ag triail"
  - EN: "I am trying to speak Irish" → GA: "tá mé ag triail Gaeilge a labhairt"

**TRY / triail → triail** (125)
  - EN: "Because I'm trying to learn Irish." → GA: "Mar tá mé ag triail Gaeilge a fhoghlaim."
  - EN: "trying" → GA: "ag triail"
  - EN: "I am trying to speak Irish" → GA: "tá mé ag triail Gaeilge a labhairt"

**WANT / ag iarraidh → ag iarraidh** (2680)
  - EN: "I want to speak Irish with you now." → GA: "Tá mé ag iarraidh Gaeilge a labhairt leat anois."
  - EN: "I want" → GA: "tá mé ag iarraidh"
  - EN: "I want to speak" → GA: "Tá mé ag iarraidh labhairt"

**WANT / ba mhaith liom → ba mhaith liom** (806)
  - EN: "I'd like to be able to speak Irish." → GA: "Ba mhaith liom a bheith in ann Gaeilge a labhairt."
  - EN: "I'd like" → GA: "ba mhaith liom"
  - EN: "I'd like to speak Irish" → GA: "ba mhaith liom Gaeilge a labhairt"

**WANT / ar mhaith leat → ar mhaith leat** (80)
  - EN: "Where would you like to meet Saturday night?" → GA: "Cá háit ar mhaith leat bualadh le chéile oíche Shathairn?"
  - EN: "where would you like" → GA: "cá háit ar mhaith leat"
  - EN: "Where would you like to find out about?" → GA: "Cá háit ar mhaith leat fáil faoi?"

**WANT / nior mhaith liom → níor mhaith liom** (4)
  - EN: "I wouldn't like" → GA: "níor mhaith liom"
  - EN: "I wouldn't like to speak Irish now" → GA: "níor mhaith liom Gaeilge a labhairt anois"
  - EN: "I wouldn't like to be able to speak Irish" → GA: "níor mhaith liom a bheith in ann Gaeilge a labhairt"

**WANT / teastaionn → teastaíonn** (21)
  - EN: "you desire" → GA: "teastaíonn uait"
  - EN: "You desire to answer." → GA: "Teastaíonn uait freagra a thabhairt."
  - EN: "You desire sugar, but I'm not thirsty." → GA: "Teastaíonn uait siúcra, ach níl tart orm."

**WANT / ag teastail → ag teastáil** (60)
  - EN: "I said that I needed a little more time." → GA: "Dúirt mé go raibh beagán níos mó ama ag teastáil uaim."
  - EN: "I needed" → GA: "ag teastáil agam"
  - EN: "I said that I needed everything" → GA: "Dúirt mé go raibh gach rud ag teastáil agam"

**LIKE / is maith liom → is maith liom** (82)
  - EN: "I like Irish." → GA: "Is maith liom Gaeilge."
  - EN: "I like it with milk but without sugar." → GA: "Is maith liom le bainne é ach gan siúcra."
  - EN: "I like" → GA: "is maith liom"

**LIKE / taitnionn → taitníonn** (14)
  - EN: "they enjoy" → GA: "taitníonn leo"
  - EN: "they enjoy speaking Irish" → GA: "taitníonn leo Gaeilge a labhairt"
  - EN: "they enjoy speaking Irish now" → GA: "taitníonn leo Gaeilge a labhairt anois"

**CAN / in ann → in ann** (646)
  - EN: "I'd like to be able to speak Irish." → GA: "Ba mhaith liom a bheith in ann Gaeilge a labhairt."
  - EN: "able" → GA: "in ann"
  - EN: "I'd like to be able to speak Irish" → GA: "Ba mhaith liom bheith in ann Gaeilge a labhairt"

**CAN / is feidir → is féidir** (157)
  - EN: "You can speak in a short time." → GA: "Is féidir leat labhairt i mbraon ama."
  - EN: "I can help you, madam." → GA: "is féidir liom cabhrú leat, a bhean uasail"
  - EN: "I can" → GA: "is féidir liom"

**KNOW / ta a fhios agam → tá a fhios agam** (5)
  - EN: "I know that you left it there" → GA: "tá a fhios agam gur fhág tú ansin é"
  - EN: "Now, I know that you were talking to a man over there" → GA: "Anois, tá a fhios agam go raibh tú ag caint le fear thall ansin"
  - EN: "I know that he can leave now" → GA: "tá a fhios agam gur féidir leis imeacht anois"

**KNOW / nil a fhios agam → níl a fhios agam** (4)
  - EN: "I don't know who you mean by the old man." → GA: "Níl a fhios agam cé 'tá i gceist agat leis an seanfhear."
  - EN: "I don't know who you mean by friend." → GA: "Níl a fhios agam cé 'tá i gceist agat le cara."
  - EN: "I don't know the way" → GA: "Níl a fhios agam an bealach"

**KNOW / nil fhios agam → níl fhios agam** (59)
  - EN: "I don't know how to say enough different words yet." → GA: "Níl fhios agam conas a dóthain focal éagsúla a rá fós."
  - EN: "I don't know" → GA: "níl fhios agam"
  - EN: "I don't know what I wanted to say." → GA: "Níl fhios agam céard a bhí mé ag iarraidh a rá."

**KNOW / aithne → aithne** (156)
  - EN: "I don't know those people." → GA: "Níl aithne agam ar na daoine sin."
  - EN: "I don't know them" → GA: "níl aithne agam orthu"
  - EN: "I'm very happy, but I don't know them." → GA: "Tá mé an-sásta, ach níl aithne agam orthu."

**KNOW / is eol → is eol** (8)
  - EN: "If I'd known then what I know now I'd have waited." → GA: "Dá mbeadh a fhios agam ag an am, an méid is eol dom anois, bheinn tar éis fanacht."
  - EN: "what I know" → GA: "an méid is eol dom"
  - EN: "What I know because there wasn't much time left." → GA: "An méid is eol dom mar nach raibh mórán ama fágtha."

**MUST/NEED / caithfidh → caithfidh** (22)
  - EN: "I must" → GA: "caithfidh mé"
  - EN: "I must be ready" → GA: "Caithfidh mé a bheith réidh"
  - EN: "I must because it is obvious" → GA: "Caithfidh mé toisc go bhfuil sé follasach"

**MUST/NEED / ta orm → tá orm** (136)
  - EN: "Or if I need to improve." → GA: "Nó má tá orm feabhsú."
  - EN: "I need" → GA: "tá orm"
  - EN: "I need to speak with you at the moment." → GA: "Tá orm labhairt leat faoi láthair."

**MUST/NEED / ta orainn → tá orainn** (26)
  - EN: "We have to turn left at the next corner." → GA: "Tá orainn casadh ar chlé ag an gcéad choirnéal eile."
  - EN: "we have to" → GA: "tá orainn"
  - EN: "we have to speak Irish now" → GA: "tá orainn Gaeilge a labhairt anois"

**THINK / ceapaim → ceapaim** (382)
  - EN: "Because I think that it's a good thing to make mistakes." → GA: "Mar ceapaim gur rud maith é botúin a dhéanamh."
  - EN: "I think" → GA: "ceapaim"
  - EN: "I think or I need to improve." → GA: "Ceapaim nó tá orm feabhsú."

**THINK / ceapann → ceapann** (42)
  - EN: "They think that it can be done more efficiently." → GA: "Ceapann siad gur féidir é a dhéanamh níos éifeachtaí."
  - EN: "they think" → GA: "ceapann siad"
  - EN: "They think it isn't easy to develop a new approach." → GA: "Ceapann siad níl sé éasca cur chuige nua a fhorbairt."

**SPEAK/PRESENT SYSTEM / labhraim → labhraím** (76)
  - EN: "I speak Irish now." → GA: "Labhraím Gaeilge anois."
  - EN: "I speak" → GA: "labhraím"
  - EN: "I speak Irish" → GA: "labhraím Gaeilge"

**SPEAK/PRESENT SYSTEM / labhraionn tu → labhraíonn tú** (84)
  - EN: "You speak Irish very well." → GA: "Labhraíonn tú Gaeilge go han-mhaith."
  - EN: "you speak" → GA: "labhraíonn tú"
  - EN: "If you speak Irish, I speak Irish with you." → GA: "Má labhraíonn tú Gaeilge, labhraím Gaeilge leat."

**SPEAK/PRESENT SYSTEM / ag labhairt → ag labhairt** (64)
  - EN: "I'd like to be speaking Irish" → GA: "Ba mhaith liom bheith ag labhairt Gaeilge"
  - EN: "I'd like to be speaking Irish with you" → GA: "Ba mhaith liom bheith ag labhairt Gaeilge leat"
  - EN: "If I want to be speaking Irish" → GA: "Má tá mé ag iarraidh bheith ag labhairt Gaeilge"

**SPEAK/PRESENT SYSTEM / ta Gaeilge agam → tá Gaeilge agam** (2)
  - EN: "I have Irish now." → GA: "Tá Gaeilge agam anois."
  - EN: "I have Irish" → GA: "tá Gaeilge agam"

**COPULA / is maith → is maith** (98)
  - EN: "I like Irish." → GA: "Is maith liom Gaeilge."
  - EN: "I like it with milk but without sugar." → GA: "Is maith liom le bainne é ach gan siúcra."
  - EN: "I like" → GA: "is maith liom"

**COPULA / ba mhaith → ba mhaith** (972)
  - EN: "I'd like to be able to speak Irish." → GA: "Ba mhaith liom a bheith in ann Gaeilge a labhairt."
  - EN: "I'd like" → GA: "ba mhaith liom"
  - EN: "I'd like to speak Irish" → GA: "ba mhaith liom Gaeilge a labhairt"

**COPULA / is e → is é** (161)
  - EN: "That is Jane's bag." → GA: "Is é sin mála Jane."
  - EN: "that is" → GA: "is é sin"
  - EN: "That is milk." → GA: "Is é sin bainne."

**BE / ta me → tá mé** (1842)
  - EN: "I want to speak Irish with you now." → GA: "Tá mé ag iarraidh Gaeilge a labhairt leat anois."
  - EN: "I want" → GA: "tá mé ag iarraidh"
  - EN: "I want to speak" → GA: "Tá mé ag iarraidh labhairt"

**BE / nil me → níl mé** (296)
  - EN: "But I don't want to stop talking." → GA: "Ach níl mé ag iarraidh stopadh ag caint"
  - EN: "I don't want" → GA: "níl mé ag iarraidh"
  - EN: "I don't want to speak Irish" → GA: "níl mé ag iarraidh Gaeilge a labhairt"

**BE / taimid → táimid** (22)
  - EN: "We want to be more patient with our children." → GA: "Táimid ag iarraidh a bheith níos foighní lenár bpáistí."
  - EN: "we want" → GA: "táimid ag iarraidh"
  - EN: "we want to speak Irish" → GA: "táimid ag iarraidh Gaeilge a labhairt"

**BE / an bhfuil → an bhfuil** (320)
  - EN: "Have you been learning Irish now?" → GA: "An bhfuil tú ag foghlaim Gaeilge anois?"
  - EN: "Have you been learning and talking?" → GA: "An bhfuil tú ag foghlaim agus ag caint?"
  - EN: "Have you been learning because I want to speak with you?" → GA: "An bhfuil tú ag foghlaim mar tá mé ag iarraidh labhairt leat?"

**BE / nach bhfuil → nach bhfuil** (130)
  - EN: "They are people that I don't know." → GA: "Is daoine iad nach bhfuil aithne agam orthu."
  - EN: "They are people that I don't know." → GA: "Is daoine iad nach bhfuil aithne agam orthu."
  - EN: "That I don't know them." → GA: "Nach bhfuil aithne agam orthu."

**BE / bhi me → bhí mé** (220)
  - EN: "I wanted to ask you a question." → GA: "Bhí mé ag iarraidh ceist a chur ort"
  - EN: "I wanted" → GA: "bhí mé ag iarraidh"
  - EN: "I wanted to speak Irish" → GA: "bhí mé ag iarraidh Gaeilge a labhairt"

**BE / ta tu → tá tú** (152)
  - EN: "You want to learn Irish." → GA: "tá tú ag iarraidh Gaeilge a fhoghlaim."
  - EN: "you want" → GA: "tá tú ag iarraidh"
  - EN: "You want to speak with me now." → GA: "Tá tú ag iarraidh labhairt liom anois."

**OTHER / conas → conas** (276)
  - EN: "How do you feel at the moment?" → GA: "Conas a mhothaíonn tú faoi láthair?"
  - EN: "how" → GA: "conas"
  - EN: "How are you?" → GA: "Conas tá tú?"

**OTHER / ceard → céard** (641)
  - EN: "I don't remember what I wanted say." → GA: "Ní cuimhin liom céard a bhí mé ag iarraidh a rá."
  - EN: "what" → GA: "céard"
  - EN: "What do you feel at the moment?" → GA: "Céard a mothaíonn tú faoi láthair?"

**OTHER / eigin → éigin** (352)
  - EN: "Do you want something to drink?" → GA: "'Bhfuil rud éigin le n-ól uait?"
  - EN: "something" → GA: "rud éigin"
  - EN: "I want something" → GA: "tá mé ag iarraidh rud éigin"

**OTHER / gach → gach** (213)
  - EN: "Did you have to finish everything last night?" → GA: "An raibh ort gach rud a chríochnú aréir?"
  - EN: "everything" → GA: "gach rud"
  - EN: "I don't want to do everything." → GA: "Níl mé ag iarraidh gach rud a dhéanamh."

**OTHER / anois → anois** (1730)
  - EN: "I want to speak Irish with you now." → GA: "Tá mé ag iarraidh Gaeilge a labhairt leat anois."
  - EN: "now" → GA: "anois"
  - EN: "I want to speak with you now" → GA: "Tá mé ag iarraidh labhairt leat anois"

**OTHER / ar ball → ar ball** (31)
  - EN: "Do we want to eat something later on?" → GA: "'Bhfuilimid ag iarraidh rud éigin a ithe ar ball?"
  - EN: "later on" → GA: "ar ball"
  - EN: "I want to speak with you later on" → GA: "tá mé ag iarraidh labhairt leat ar ball"

**GOING TO / ta me chun → tá mé chun** (48)
  - EN: "I'm going to learn more soon." → GA: "Tá mé chun níos mó a fhoghlaim go luath."
  - EN: "I'm going to" → GA: "tá mé chun"
  - EN: "I'm going to speak Irish" → GA: "tá mé chun Gaeilge a labhairt"

**GOING TO / beidh me → beidh mé** (66)
  - EN: "I'll be ready in a short time." → GA: "Beidh mé réidh i mbraon ama."
  - EN: "I'll be able to help you in a short time." → GA: "Beidh mé in ann cabhrú leat i mbraon ama."
  - EN: "And then I'll be able to come and help later." → GA: "Agus ansin beidh mé in ann teacht agus cabhrú níos déanaí."

</details>

### Corpus B (live gle_for_eng, 7,586 items)

| Group | Phrase (brief spelling) | Matched as (fada-correct) | Item count |
|---|---|---|---|
| TRY | ag iarracht | ag iarracht | 0 |
| TRY | iarracht a dheanamh | iarracht a dhéanamh | 0 |
| TRY | ag deanamh iarracht | ag déanamh iarracht | 0 |
| TRY | iarracht | iarracht | 0 |
| TRY | ag triail | ag triail | 263 |
| TRY | triail | triail | 365 |
| TRY | bain triail as | bain triail as | 0 |
| TRY | ag feachaint le | ag féachaint le | 0 |
| TRY | ag breathnu le | ag breathnú le | 0 |
| TRY | ag tabhairt faoi | ag tabhairt faoi | 0 |
| WANT | ag iarraidh | ag iarraidh | 1780 |
| WANT | ba mhaith liom | ba mhaith liom | 198 |
| WANT | ar mhaith leat | ar mhaith leat | 2 |
| WANT | nior mhaith liom | níor mhaith liom | 40 |
| WANT | teastaionn | teastaíonn | 0 |
| WANT | ag teastail | ag teastáil | 0 |
| LIKE | is maith liom | is maith liom | 56 |
| LIKE | taitnionn | taitníonn | 0 |
| CAN | in ann | in ann | 11 |
| CAN | abalta | ábalta | 192 |
| CAN | is feidir | is féidir | 310 |
| CAN | thig liom | thig liom | 0 |
| KNOW | ta a fhios agam | tá a fhios agam | 115 |
| KNOW | ta fhios agam | tá fhios agam | 0 |
| KNOW | nil a fhios agam | níl a fhios agam | 33 |
| KNOW | nil fhios agam | níl fhios agam | 0 |
| KNOW | aithne | aithne | 158 |
| KNOW | is eol | is eol | 0 |
| MUST/NEED | caithfidh | caithfidh | 78 |
| MUST/NEED | ni mor | ní mór | 0 |
| MUST/NEED | ta orm | tá orm | 1 |
| MUST/NEED | ta orainn | tá orainn | 0 |
| THINK | ceapaim | ceapaim | 291 |
| THINK | ceapann | ceapann | 3 |
| THINK | silim | sílim | 0 |
| THINK | is doigh liom | is dóigh liom | 0 |
| THINK | measaim | measaim | 0 |
| SPEAK/PRESENT SYSTEM | labhraim | labhraím | 27 |
| SPEAK/PRESENT SYSTEM | labhrann me | labhrann mé | 0 |
| SPEAK/PRESENT SYSTEM | labhraionn tu | labhraíonn tú | 35 |
| SPEAK/PRESENT SYSTEM | ag labhairt | ag labhairt | 37 |
| SPEAK/PRESENT SYSTEM | ta Gaeilge agam | tá Gaeilge agam | 0 |
| SPEAK/PRESENT SYSTEM | labhraimid | labhraímid | 0 |
| SPEAK/PRESENT SYSTEM | labhrann muid | labhrann muid | 0 |
| COPULA | is maith | is maith | 63 |
| COPULA | ba mhaith | ba mhaith | 208 |
| COPULA | is e | is é | 23 |
| COPULA | is ea | is ea | 0 |
| COPULA | ni hea | ní hea | 0 |
| BE | ta me | tá mé | 978 |
| BE | nil me | níl mé | 248 |
| BE | ta muid | tá muid | 72 |
| BE | taimid | táimid | 0 |
| BE | an bhfuil | an bhfuil | 146 |
| BE | nach bhfuil | nach bhfuil | 88 |
| BE | bhi me | bhí mé | 297 |
| BE | ta tu | tá tú | 43 |
| OTHER | cen chaoi | cén chaoi | 0 |
| OTHER | conas | conas | 271 |
| OTHER | cen bealach | cén bealach | 0 |
| OTHER | ceard | céard | 0 |
| OTHER | cad | cad | 522 |
| OTHER | eigin | éigin | 483 |
| OTHER | eicint | éicint | 0 |
| OTHER | chuile | chuile | 0 |
| OTHER | gach | gach | 380 |
| OTHER | freisin | freisin | 0 |
| OTHER | fosta | fosta | 0 |
| OTHER | anois | anois | 297 |
| OTHER | ar ball | ar ball | 0 |
| OTHER | go direach | go díreach | 0 |
| GOING TO | ta me chun | tá mé chun | 58 |
| GOING TO | ta me ag dul | tá mé ag dul | 0 |
| GOING TO | beidh me | beidh mé | 2 |

<details><summary>Examples (corpus B (live gle_for_eng, 7,586 items), count > 0 only)</summary>

**TRY / ag triail → ag triail** (263)
  - EN: "I'm trying to remember a word" → GA: "Tá mé ag triail focal a chuimhneamh"
  - EN: "I'm trying to learn" → GA: "Tá mé ag triail foghlaim"
  - EN: "I'm trying to" → GA: "ag triail"

**TRY / triail → triail** (365)
  - EN: "I'm trying to remember a word" → GA: "Tá mé ag triail focal a chuimhneamh"
  - EN: "I'm going to try to explain what I mean" → GA: "Tá mé chun triail a mhíniú cad atá i gceist agam"
  - EN: "I'm trying to learn" → GA: "Tá mé ag triail foghlaim"

**WANT / ag iarraidh → ag iarraidh** (1780)
  - EN: "where do you want to meet on Saturday night?" → GA: "cá bhfuil tú ag iarraidh bualadh le chéile oíche Dé Sathairn?"
  - EN: "do we want to eat something later on?" → GA: "an bhfuil muid ag iarraidh rud éigin a ithe níos déanaí?"
  - EN: "Did he want to go out on Friday night?" → GA: "an raibh sé ag iarraidh dul amach oíche Dé hAoine?"

**WANT / ba mhaith liom → ba mhaith liom** (198)
  - EN: "I'd like one of those" → GA: "ba mhaith liom ceann acu sin"
  - EN: "I'd like to be able to speak after you finish" → GA: "ba mhaith liom a bheith ábalta labhairt tar éis duit críochnú"
  - EN: "we're friends, and after we finish I'd like to relax" → GA: "is cairde muid, agus tar éis dúinn críochnú ba mhaith liom scíth a ligean"

**WANT / ar mhaith leat → ar mhaith leat** (2)
  - EN: "would you like to come with us next month?" → GA: "ar mhaith leat teacht linn an mhí seo chugainn?"
  - EN: "would you like" → GA: "ar mhaith leat"

**WANT / nior mhaith liom → níor mhaith liom** (40)
  - EN: "I wouldn't like to guess what's going to happen tomorrow" → GA: "níor mhaith liom buille faoi thuairim a thabhairt faoi cad atá chun tarlú amárach"
  - EN: "I wouldn't like" → GA: "níor mhaith liom"
  - EN: "I wouldn't like to practise speaking with someone else now" → GA: "níor mhaith liom labhairt a chleachtadh le duine éigin eile anois"

**LIKE / is maith liom → is maith liom** (56)
  - EN: "I like feeling as if I'm nearly ready to go" → GA: "is maith liom a bheith ag mothú go bhfuil mé beagnach réidh le himeacht"
  - EN: "I like it with milk but without sugar" → GA: "is maith liom é le bainne ach gan siúcra"
  - EN: "I like that blue thing" → GA: "is maith liom an rud gorm sin"

**CAN / in ann → in ann** (11)
  - EN: "he said he was able to stay longer and I was very happy to hear that" → GA: "dúirt sé go raibh sé in ann fanacht níos faide agus bhí mé an-sásta é sin a chloisteáil"
  - EN: "he told me he can stay for a few minutes before he has to leave" → GA: "dúirt sé liom go bhfuil sé in ann fanacht ar feadh cúpla nóiméad sula gcaithfidh sé imeacht"
  - EN: "I am sorry that I have to leave so soon and I hope that we will be able to meet again" → GA: "tá brón orm go gcaithfidh mé imeacht chomh luath sin agus tá súil agam go mbeidh muid in ann bualadh le chéile arís"

**CAN / abalta → ábalta** (192)
  - EN: "I'll ask him if he'll be able to help next year" → GA: "fiafróidh mé de an mbeidh sé ábalta cabhrú an bhliain seo chugainn"
  - EN: "I wouldn't have been able to without your help" → GA: "Ní bheinn tar éis a bheith ábalta gan do chabhair"
  - EN: "they will be able to carry that suitcase" → GA: "beidh siad ábalta an mála taistil sin a iompar"

**CAN / is feidir → is féidir** (310)
  - EN: "I can see the mountains out of my bedroom window" → GA: "is féidir liom na sléibhte a fheiceáil amach as fuinneog mo sheomra leapa"
  - EN: "he can build a new life for his sister" → GA: "is féidir leis saol nua a thógáil dá dheirfiúr"
  - EN: "I can help you madam" → GA: "is féidir liom cabhrú leat, a bhean uasal"

**KNOW / ta a fhios agam → tá a fhios agam** (115)
  - EN: "I know how to do what I need to do next week" → GA: "Tá a fhios agam conas a dhéanamh cad atá le déanamh agam an tseachtain seo chugainn"
  - EN: "I know how to" → GA: "Tá a fhios agam conas"
  - EN: "I can remember a few words in Irish now and I know I am doing well" → GA: "is féidir liom cúpla focal a chuimhneamh i nGaeilge anois agus tá a fhios agam go bhfuil mé ag déanamh go maith"

**KNOW / nil a fhios agam → níl a fhios agam** (33)
  - EN: "I don't know how to say enough different words yet" → GA: "Níl a fhios agam conas go leor focail éagsúla a rá fós"
  - EN: "I don't know why you think that it's so good" → GA: "Níl a fhios agam cén fáth a gceapann tú go bhfuil sé chomh maith sin"
  - EN: "I don't know who you mean" → GA: "Níl a fhios agam cé atá i gceist agat"

**KNOW / aithne → aithne** (158)
  - EN: "you get to know someone very well when you work together" → GA: "cuireann tú aithne mhaith ar dhuine nuair a oibríonn sibh le chéile"
  - EN: "I know that young man who's sitting over there" → GA: "Tá aithne agam ar an bhfear óg sin atá ina shuí thall ansin"
  - EN: "I didn't see anyone that I knew" → GA: "Ní fhaca mé aon duine a raibh aithne agam air"

**MUST/NEED / caithfidh → caithfidh** (78)
  - EN: "we need to turn left at the next corner" → GA: "caithfidh muid casadh ar chlé ag an gcúinne seo chugainn"
  - EN: "no they have to catch the train themselves" → GA: "Ní bheidh, caithfidh siad an traein a fháil iad féin"
  - EN: "yes they need to make sure they understand" → GA: "Tá, caithfidh siad a chinntiú go dtuigeann siad"

**MUST/NEED / ta orm → tá orm** (1)
  - EN: "I didn't want to ask you but I need to know" → GA: "Ní raibh mé ag iarraidh ceist a chur ort ach tá orm a fhios a bheith agam"

**THINK / ceapaim → ceapaim** (291)
  - EN: "I think that he couldn't afford the car that he wanted" → GA: "ceapaim nach bhféadfadh sé an carr a bhí uaidh a cheannach"
  - EN: "I think that you're doing very well, madam" → GA: "ceapaim go bhfuil tú ag déanamh go han-mhaith, a bhean uasal"
  - EN: "no I think he's hurt himself quite badly" → GA: "Níl, ceapaim go bhfuil sé gortaithe go dona"

**THINK / ceapann → ceapann** (3)
  - EN: "they think that we need to discuss the problem" → GA: "ceapann siad go gcaithfidh muid an fhadhb a phlé"
  - EN: "they think" → GA: "ceapann siad"
  - EN: "they think it's important to achieve more today than yesterday" → GA: "ceapann siad go bhfuil sé tábhachtach níos mó a bhaint amach inniu ná inné"

**SPEAK/PRESENT SYSTEM / labhraim → labhraím** (27)
  - EN: "I speak a little Irish now" → GA: "labhraím beagán Gaeilge anois"
  - EN: "I speak" → GA: "labhraím"
  - EN: "I speak a little Irish now and I want to speak with you" → GA: "labhraím beagán Gaeilge anois agus tá mé ag iarraidh labhairt leat"

**SPEAK/PRESENT SYSTEM / labhraionn tu → labhraíonn tú** (35)
  - EN: "do you speak Irish all day?" → GA: "an labhraíonn tú Gaeilge an lá ar fad?"
  - EN: "you speak it madam" → GA: "labhraíonn tú í, a bhean uasal"
  - EN: "you speak Irish very well" → GA: "labhraíonn tú Gaeilge go han-mhaith"

**SPEAK/PRESENT SYSTEM / ag labhairt → ag labhairt** (37)
  - EN: "I was speaking Irish for a while" → GA: "bhí mé ag labhairt Gaeilge ar feadh tamaill"
  - EN: "I feel as if I am speaking more than yesterday today" → GA: "mothaím go bhfuil mé ag labhairt níos mó ná inné inniu"
  - EN: "I was speaking better last time we talked to each other" → GA: "bhí mé ag labhairt níos fearr an uair dheireanach a labhair muid le chéile"

**COPULA / is maith → is maith** (63)
  - EN: "I like feeling as if I'm nearly ready to go" → GA: "is maith liom a bheith ag mothú go bhfuil mé beagnach réidh le himeacht"
  - EN: "most people I know like watching television" → GA: "is maith le formhór na ndaoine a bhfuil aithne agam orthu féachaint ar theilifís"
  - EN: "I like it with milk but without sugar" → GA: "is maith liom é le bainne ach gan siúcra"

**COPULA / ba mhaith → ba mhaith** (208)
  - EN: "we would like to reserve a table for four tonight" → GA: "ba mhaith linn bord a chur in áirithe do cheathrar anocht"
  - EN: "he'd like to know a little more about what it's like" → GA: "ba mhaith leis beagán níos mó a fhios a bheith aige faoi conas atá sé"
  - EN: "they would like to love each other but they're unhappy" → GA: "ba mhaith leo grá a thabhairt dá chéile ach tá siad míshásta"

**COPULA / is e → is é** (23)
  - EN: "it's the only real hope we have left" → GA: "is é an t-aon dóchas fíor atá fágtha againn"
  - EN: "it's your turn to take the clean clothes upstairs" → GA: "is é do sheal é na héadaí glana a thabhairt suas staighre"
  - EN: "it's the least I could do" → GA: "is é an rud is lú a d'fhéadfainn a dhéanamh"

**BE / ta me → tá mé** (978)
  - EN: "I'm expecting to see an improvement next time we meet" → GA: "Tá mé ag súil le feabhas a fheiceáil an chéad uair eile a bhuailimid le chéile"
  - EN: "I'm enjoying finding out more about this language" → GA: "Tá mé ag baint taitnimh as níos mó a fháil amach faoin teanga seo"
  - EN: "I want to find a shop near the hotel" → GA: "Tá mé ag iarraidh siopa a fháil in aice leis an óstán"

**BE / nil me → níl mé** (248)
  - EN: "I don't want to seem as though I don't care" → GA: "Níl mé ag iarraidh a bheith cosúil le nach bhfuil mé ag cur suim ann"
  - EN: "I'm not sure if I can help you, sir" → GA: "Níl mé cinnte an féidir liom cabhrú leat, a dhuine uasail"
  - EN: "but I don't want to stop talking" → GA: "ach níl mé ag iarraidh stopadh ag caint"

**BE / ta muid → tá muid** (72)
  - EN: "we've often wanted to take the children somewhere a little warmer" → GA: "Tá muid tar éis a bheith ag iarraidh go minic na páistí a thabhairt áit éigin beagán níos teo"
  - EN: "we want to become more patient with our children" → GA: "Tá muid ag iarraidh a bheith níos foighní lenár bpáistí"
  - EN: "we've often tried" → GA: "Tá muid tar éis iarraidh go minic"

**BE / an bhfuil → an bhfuil** (146)
  - EN: "do we want to eat something later on?" → GA: "an bhfuil muid ag iarraidh rud éigin a ithe níos déanaí?"
  - EN: "are you sure you don't mind helping me?" → GA: "an bhfuil tú cinnte nach miste leat cabhrú liom?"
  - EN: "do you all want to go?" → GA: "an bhfuil sibh ar fad ag iarraidh dul?"

**BE / nach bhfuil → nach bhfuil** (88)
  - EN: "Why don't you want to sit between the two girls?" → GA: "Cén fáth nach bhfuil tú ag iarraidh suí idir an dá chailín?"
  - EN: "I don't want to seem as though I don't care" → GA: "Níl mé ag iarraidh a bheith cosúil le nach bhfuil mé ag cur suim ann"
  - EN: "part of the problem is that we don't know the facts" → GA: "cuid den fhadhb ná nach bhfuil na fíricí ar eolas againn"

**BE / bhi me → bhí mé** (297)
  - EN: "so I wanted to grow up and leave home" → GA: "mar sin bhí mé ag iarraidh fás aníos agus an baile a fhágáil"
  - EN: "I wanted her to know that I liked her book" → GA: "bhí mé ag iarraidh go mbeadh a fhios aici gur thaitin a leabhar liom"
  - EN: "yes I was lucky enough to travel to Africa" → GA: "chuaigh, bhí mé ádhmharach go leor taisteal go dtí an Afraic"

**BE / ta tu → tá tú** (43)
  - EN: "you're like someone I used to know" → GA: "Tá tú cosúil le duine a bhíodh ar aithne agam"
  - EN: "you want to learn his name quickly" → GA: "Tá tú ag iarraidh a ainm a fhoghlaim go tapa"
  - EN: "you're doing something sir" → GA: "Tá tú ag déanamh rud éigin, a dhuine uasail"

**OTHER / conas → conas** (271)
  - EN: "what's it like to grow up here?" → GA: "conas atá sé fás aníos anseo?"
  - EN: "how do you feel at the moment?" → GA: "conas a mhothaíonn tú faoi láthair?"
  - EN: "what's it like in this part of the world?" → GA: "conas atá sé sa chuid seo den domhan?"

**OTHER / cad → cad** (522)
  - EN: "what happens after the first part of the show?" → GA: "cad a tharlaíonn tar éis an chéad chuid den seó?"
  - EN: "they didn't want to decide what he should do" → GA: "Ní raibh siad ag iarraidh cinneadh a dhéanamh faoi cad ba cheart dó a dhéanamh"
  - EN: "next time I will ask her what her name is" → GA: "an chéad uair eile fiafróidh mé di cad is ainm di"

**OTHER / eigin → éigin** (483)
  - EN: "do we want to eat something later on?" → GA: "an bhfuil muid ag iarraidh rud éigin a ithe níos déanaí?"
  - EN: "I met someone who said that he wanted to tell you something" → GA: "bhuail mé le duine a dúirt go raibh sé ag iarraidh rud éigin a insint duit"
  - EN: "he said that he wants to show you something" → GA: "dúirt sé go bhfuil sé ag iarraidh rud éigin a thaispeáint duit"

**OTHER / gach → gach** (380)
  - EN: "we couldn't allow them to win everything" → GA: "Ní fhéadfaimis ligean dóibh gach rud a bhuachan"
  - EN: "we don't need to stand until everybody else is ready" → GA: "Ní chaithfidh muid seasamh go dtí go bhfuil gach duine eile réidh"
  - EN: "no they're wasting everybody's time" → GA: "Níl, tá siad ag cur am gach duine amú"

**OTHER / anois → anois** (297)
  - EN: "if I'd known then what I know now I'd have waited" → GA: "dá mbeadh a fhios agam an uair sin cad atá ar eolas agam anois bheinn tar éis fanacht"
  - EN: "if you don't make me a strong cup of coffee right now" → GA: "mura ndéanann tú cupán láidir caife dom anois díreach"
  - EN: "whatever he says it's not far ahead now" → GA: "cibé rud a deir sé níl sé i bhfad chun tosaigh anois"

**GOING TO / ta me chun → tá mé chun** (58)
  - EN: "I'm going to run across the grass" → GA: "Tá mé chun rith trasna an fhéir"
  - EN: "I'm going to ask for the same thing to eat" → GA: "Tá mé chun an rud céanna le hithe a iarraidh"
  - EN: "I'm going to practise speaking with someone else" → GA: "Tá mé chun labhairt a chleachtadh le duine éigin eile"

**GOING TO / beidh me → beidh mé** (2)
  - EN: "and then I'll be able to come and help later on" → GA: "agus ansin beidh mé ábalta teacht agus cabhrú níos déanaí"
  - EN: "I'll be able to" → GA: "beidh mé ábalta"

</details>

## English "try"/"trying"/"tried" — full list, corpus A

200 items in corpus A have English text matching \btry|trying|tried\b. All listed, verbatim, no sampling.

| # | English | Irish |
|---|---|---|
| 1 | Because I'm trying to learn Irish. | Mar tá mé ag triail Gaeilge a fhoghlaim. |
| 2 | trying | ag triail |
| 3 | I am trying to speak Irish | tá mé ag triail Gaeilge a labhairt |
| 4 | I am trying to speak with you now | Tá mé ag triail labhairt leat anois |
| 5 | I'd like to be trying to speak Irish | ba mhaith liom a bheith ag triail Gaeilge a labhairt |
| 6 | I am trying to speak now | Tá mé ag triail labhairt anois |
| 7 | I am trying to speak with you | tá mé ag triail labhairt leat |
| 8 | I am trying to speak Irish with you | Tá mé ag triail Gaeilge a labhairt leat |
| 9 | I am trying to be able to speak Irish | tá mé ag triail bheith in ann Gaeilge a labhairt |
| 10 | I am trying because I want to speak with you | Tá mé ag triail mar tá mé ag iarraidh labhairt leat |
| 11 | because I am trying to learn Irish | mar tá mé ag triail Gaeilge a fhoghlaim |
| 12 | I am trying to learn Irish | tá mé ag triail Gaeilge a fhoghlaim |
| 13 | I am trying to speak Irish now | tá mé ag triail Gaeilge a labhairt anois |
| 14 | I am trying to speak more Irish | tá mé ag triail níos mó Gaeilge a labhairt |
| 15 | I am trying to learn Irish soon | Tá mé ag triail Gaeilge a fhoghlaim go luath |
| 16 | I am trying to learn more now | tá mé ag triail níos mó a fhoghlaim anois |
| 17 | I am trying to speak Irish because it will be easy now | tá mé ag triail Gaeilge a labhairt mar beidh sé éasca anois |
| 18 | It will be easy for you because I am trying to learn Irish. | Beidh sé éasca ort mar tá mé ag triail Gaeilge a fhoghlaim. |
| 19 | I am trying to remember | Tá mé ag triail cuimhneamh |
| 20 | I am trying to remember it | tá mé ag triail cuimhneamh air |
| 21 | I want to remember it because I am trying to learn Irish | tá mé ag iarraidh cuimhneamh air mar tá mé ag triail Gaeilge a fhoghlaim |
| 22 | I wanted to ask a question because I am trying to learn Irish | bhí mé ag iarraidh ceist a chur mar tá mé ag triail Gaeilge a fhoghlaim |
| 23 | I wanted to ask you a question because I am trying to learn Irish | bhí mé ag iarraidh ceist a chur ort mar tá mé ag triail Gaeilge a fhoghlaim |
| 24 | you wanted, because you are trying to learn Irish | bhí tú ag iarraidh, mar tá tú ag triail Gaeilge a fhoghlaim |
| 25 | You wanted to ask me a question because I am trying to learn Irish. | Bhí tú ag iarraidh ceist a chur orm mar tá mé ag triail Gaeilge a fhoghlaim. |
| 26 | I started trying to speak Irish with you | thosaigh mé ag triail Gaeilge a labhairt leat |
| 27 | I was trying to stop last month. | Bhí mé ag triail stopadh an mhí seo caite. |
| 28 | Were you trying to speak Irish last month? | An raibh tú ag triail Gaeilge a labhairt an mhí seo caite? |
| 29 | I started trying to learn Irish | thosaigh mé ag triail Gaeilge a fhoghlaim |
| 30 | I am trying to speak a little Irish | Tá mé ag triail beagán Gaeilge a labhairt |
| 31 | You feel tired because you are trying to learn Irish. | Mothaíonn tú tuirseach mar tá tú ag triail Gaeilge a fhoghlaim. |
| 32 | I need to be trying more. | Tá orm bheith ag triail níos mó. |
| 33 | I don't need to worry because I am trying to learn Irish. | Ní gá imní a bheith orm mar tá mé ag triail Gaeilge a fhoghlaim. |
| 34 | I don't care about making mistakes, I'm trying and it's good. | Is cuma liom faoi bhotúin a dhéanamh, tá mé ag triail agus tá sé maith. |
| 35 | I'm trying to learn how to speak Irish. | Tá mé ag triail foghlaim conas Gaeilge a labhairt. |
| 36 | I'm trying to learn how to speak Irish | tá mé ag triail foghlaim conas Gaeilge a labhairt |
| 37 | I'm trying to speak with you now | tá mé ag triail labhairt leat anois |
| 38 | I'm trying to speak Irish now | tá mé ag triail Gaeilge a labhairt anois |
| 39 | I'm trying to practise more. | Tá mé ag triail níos mó cleachtadh a dhéanamh. |
| 40 | I'm trying to practise more | tá mé ag triail níos mó cleachtadh a dhéanamh |
| 41 | I'm trying to practise more now | tá mé ag triail níos mó cleachtadh a dhéanamh anois |
| 42 | I'm trying to improve | tá mé ag triail feabhsú |
| 43 | I'm trying to practise more at the moment | tá mé ag triail níos mó cleachtadh a dhéanamh faoi láthair |
| 44 | I'm trying to practise now | tá mé ag triail cleachtadh a dhéanamh anois |
| 45 | I'm trying to learn how to speak Irish so that I speak more. | Tá mé ag triail foghlaim conas Gaeilge a labhairt ionas go labhraím níos mó. |
| 46 | I'm trying to practise more so that I speak Irish very well. | Tá mé ag triail níos mó cleachtadh a dhéanamh ionas go labhraím Gaeilge go han-mhaith. |
| 47 | I remember I'm trying to learn how to speak Irish. | Cuimhin liom go bhfuil mé ag triail foghlaim conas Gaeilge a labhairt. |
| 48 | I remember I'm trying to practise more. | Cuimhin liom go bhfuil mé ag triail níos mó cleachtadh a dhéanamh. |
| 49 | I'm trying to speak a few words | tá mé ag triail cúpla focal a labhairt |
| 50 | I am saying that I am trying to practise more | Tá mé ag rá go bhfuil mé ag triail níos mó cleachtadh a dhéanamh |
| 51 | I'm trying to learn how to speak Irish so that I can remember how to say a few words | Tá mé ag triail foghlaim conas Gaeilge a labhairt ionas gur cuimhin liom conas cúpla focal a rá |
| 52 | I'm trying to practice more so that I can remember how to say a few words | Tá mé ag triail níos mó cleachtadh a dhéanamh ionas gur cuimhin liom conas cúpla focal a rá |
| 53 | I'm trying to practise more so that I remember what I wanted to say | Tá mé ag triail níos mó cleachtadh a dhéanamh ionas gur cuimhin liom céard a bhí mé ag iarraidh a rá |
| 54 | I'm trying to practise more but I don't remember what I wanted to say | Tá mé ag triail níos mó cleachtadh a dhéanamh ach ní cuimhin liom céard a bhí mé ag iarraidh a rá |
| 55 | I'm trying to learn how to speak Irish but I don't remember what I wanted to say | Tá mé ag triail foghlaim conas Gaeilge a labhairt ach ní cuimhin liom céard a bhí mé ag iarraidh a rá |
| 56 | I don't know, but I'm trying to practise more. | Níl fhios agam, ach tá mé ag triail níos mó cleachtadh a dhéanamh. |
| 57 | I am trying to say enough different words to you | Tá mé ag triail dóthain focal éagsúla a rá leat |
| 58 | What about saying enough different words because I am trying to learn Irish? | Céard faoi dóthain focal éagsúla a rá mar tá mé ag triail Gaeilge a fhoghlaim? |
| 59 | I don't know how to say enough different words yet, I'm trying to learn how to speak Irish. | Níl fhios agam conas a dóthain focal éagsúla a rá fós, tá mé ag triail foghlaim conas Gaeilge a labhairt. |
| 60 | could you say that? I'm trying to learn | an féidir leat é sin a rá? tá mé ag triail foghlaim |
| 61 | I'm trying to speak more slowly because I think that it's a good thing to make mistakes. | Tá mé ag triail níos moille a labhairt mar ceapaim gur rud maith é botúin a dhéanamh. |
| 62 | You are trying to find. | Tá tú ag iarraidh fáil. |
| 63 | Thank you very much, but I've got more to learn because I am trying to learn Irish. | Go raibh míle maith agat, ach tá níos mó le foghlaim agam mar tá mé ag triail Gaeilge a fhoghlaim. |
| 64 | I don't know them, but I'm trying. | Níl aithne agam orthu, ach tá mé ag triail. |
| 65 | I'm trying to practice more, I think that I've done a lot in a short time. | Tá mé ag triail níos mó cleachtadh a dhéanamh, ceapaim go bhfuil a lán déanta agam i mbraon ama. |
| 66 | I'm sorry, I'm trying to practise more. | Tá brón orm, tá mé ag triail níos mó cleachtadh a dhéanamh. |
| 67 | I'm trying to have more understanding. | Tá mé ag triail tuiscint níos mó a bheith agam. |
| 68 | Were you trying to understand what you said? | Bhí tú ag iarraidh tuiscint a dúirt tú? |
| 69 | If you can, I didn't understand but I am trying to learn Irish. | Má fhéidir leat, níor thuig mé ach tá mé ag triail Gaeilge a fhoghlaim. |
| 70 | That would be great, please, I'm trying to practise more. | Bheadh sé sin go hiontach, le do thoil, tá mé ag triail níos mó cleachtadh a dhéanamh. |
| 71 | I'm trying to get time to speak Irish. | Tá mé ag triail fáil ar am le Gaeilge a labhairt. |
| 72 | Are you trying to get a cup of coffee? | Tá tú ag iarraidh fáil ar cupán caife? |
| 73 | Are you trying to get a cup of tea? No thank you. | An bhfuil tú ag iarraidh fáil ar cupán tae? Níl, go raibh maith agat. |
| 74 | I'm trying to practice more and it would be good. | Tá mé ag triail níos mó cleachtadh a dhéanamh agus bheadh go maith. |
| 75 | I'm trying to think. | Tá mé ag triail smaoineamh. |
| 76 | I'm trying to think. | Tá mé ag triail smaoineamh. |
| 77 | I'm trying to think now. | Tá mé ag triail smaoineamh anois. |
| 78 | I'm trying. | Tá mé ag triail. |
| 79 | I'm trying to think where her bag is. | Tá mé ag triail smaoineamh cá bhfuil a mála. |
| 80 | If I'm trying to think. | Má tá mé ag triail smaoineamh. |
| 81 | I'm trying to think where Jane's bag is. | Tá mé ag triail smaoineamh cá bhfuil mála Jane. |
| 82 | I'd like to be trying to think. | Ba mhaith liom a bheith ag triail smaoineamh. |
| 83 | I'm trying to think, sir. | Tá mé ag triail smaoineamh, a dhuine uasail. |
| 84 | I'm trying to learn how to speak Irish with you, sir. | Tá mé ag triail foghlaim conas Gaeilge a labhairt leat, a dhuine uasail. |
| 85 | I'm trying to learn how to speak Irish quickly enough. | Tá mé ag triail foghlaim conas Gaeilge a labhairt go tapa go leor. |
| 86 | Let's talk because I am trying to learn Irish | Labhraímis mar tá mé ag triail Gaeilge a fhoghlaim |
| 87 | I was trying to practice more in the morning. | Ar maidin a bhí mé ag triail níos mó cleachtadh a dhéanamh. |
| 88 | I'd like you to tell me what you need because I am trying to learn Irish | ba mhaith liom go n-inseofá dom céard 'tá de dhíth ort mar tá mé ag triail Gaeilge a fhoghlaim |
| 89 | I'm trying to look for a book. | Tá mé ag iarraidh lorg leabhar. |
| 90 | I myself am trying to learn Irish. | Tá mé féin ag triail Gaeilge a fhoghlaim. |
| 91 | I myself am trying to think. | Tá mé féin ag triail smaoineamh. |
| 92 | I haven't seen them. I'm trying to learn how to speak Irish | Ní fhaca mé iad. Tá mé ag triail foghlaim conas Gaeilge a labhairt |
| 93 | A while ago, I was trying to remember it. | Tamall ó shin, bhí mé ag iarraidh cuimhneamh air. |
| 94 | A while ago, I was trying to think for a while. | Tamall ó shin, bhí mé ag triail smaoineamh ar feadh tamaill. |
| 95 | I saw them in the office a while ago, I'm trying to remember it | chonaic mé san oifig iad tamall ó shin, tá mé ag triail cuimhneamh air |
| 96 | I'm trying to practise more speaking about my mother. | Tá mé ag triail níos mó cleachtadh a dhéanamh labhairt faoi mo mháthair. |
| 97 | I'm busy because I am trying to learn Irish. | Tá mé gnóthach mar tá mé ag triail Gaeilge a fhoghlaim. |
| 98 | I'm trying to do it within time. | Tá mé ag triail é a dhéanamh laistigh de am. |
| 99 | I'm trying to look for that man. | Tá mé ag triail an fear sin a lorg. |
| 100 | Why are you trying to say a few words? | Cén fáth a bhfuil tú ag triail cúpla focal a rá? |
| 101 | Unfortunately I have too much work, but I'll be trying to help you. | Faraor tá an iomarca oibre agam, ach beidh mé ag iarraidh cabhrú leat. |
| 102 | I'm only trying to think. | Tá mé ag triail ach smaoineamh. |
| 103 | I needed to be trying | Bhí bheith ag triail ag teastáil agam |
| 104 | I'm trying to think about paying. | Tá mé ag triail smaoineamh faoi íoc. |
| 105 | I am trying to buy with a friend. | Tá mé ag triail ceannach le cara. |
| 106 | I want that she could bring her brother with her on Monday and I'm trying to practise more. | Tá mé ag iarraidh go bhféadfadh sí a deartháir a thabhairt léi Dé Luain agus tá mé ag triail níos mó cleachtadh a dhéanamh. |
| 107 | I think that he has to consider ten problems because I am trying to learn Irish. | Ceapaim go bhfuil air deich bhfadhb a mheas mar tá mé ag triail Gaeilge a fhoghlaim. |
| 108 | I'm trying to think that it's very important | Tá mé ag triail smaoineamh go bhfuil sé an-tábhachtach |
| 109 | I was trying to think a few days ago. | Bhí mé ag triail smaoineamh cúpla lá ó shin. |
| 110 | Your friend said that he was trying to reach the top | Dúirt do chara go raibh sé ag iarraidh an barr a shroicheadh |
| 111 | She said that he was trying to send a message | Dúirt sí go raibh sé ag iarraidh teachtaireacht a sheoladh |
| 112 | She sent two emails to me that he was trying to help | Chuir sí dhá ríomhphost chugam go raibh sé ag iarraidh cabhrú |
| 113 | I'm trying to grow tomatoes | tá mé ag triail trátaí a fhás |
| 114 | Did you see what she was trying to create? | An bhfaca tú céard a bhí sí ag iarraidh a chruthú? |
| 115 | Did you see him trying to find out? | An bhfaca tú sé ag iarraidh a fháil amach? |
| 116 | she was trying | bhí sí ag iarraidh |
| 117 | she was trying to ask a question | bhí sí ag iarraidh ceist a chur |
| 118 | she was trying to answer | bhí sí ag iarraidh freagra a thabhairt |
| 119 | she was trying to see anyone | bhí sí ag iarraidh éinne a fheiceáil |
| 120 | she was trying to turn left | bhí sí ag iarraidh casadh ar chlé |
| 121 | she was trying to keep up with different people | bhí sí ag iarraidh coinneáil le daoine éagsúil |
| 122 | she was trying to see the top | bhí sí ag iarraidh an barr a fheiceáil |
| 123 | what do you think? she was trying to get one of those | céard a cheapann tú? bhí sí ag iarraidh ceann acu sin |
| 124 | She was trying to leave me | Bhí sí ag iarraidh mé a fhágáil |
| 125 | She was trying to be at work | Bhí sí ag iarraidh bheith ag an obair |
| 126 | She was trying to write a story | Bhí sí ag iarraidh scéal a scríobh |
| 127 | she was trying to speak Irish | bhí sí ag iarraidh Gaeilge a labhairt |
| 128 | she was trying to speak with you | bhí sí ag iarraidh labhairt leat |
| 129 | she was trying to speak Irish with you | bhí sí ag iarraidh Gaeilge a labhairt leat |
| 130 | She was trying to create with this | Bhí sí ag iarraidh cruthú leis seo |
| 131 | I think that you are trying to create | Ceapaim go bhfuil tú ag iarraidh cruthú |
| 132 | Did you see what she was trying to create? | an bhfaca tú céard a bhí sí ag iarraidh a chruthú? |
| 133 | Did you see what she was trying to create at work? | an bhfaca tú céard a bhí sí ag iarraidh a chruthú ag an obair? |
| 134 | Did you see what she was trying to create? I'm not sure | an bhfaca tú céard a bhí sí ag iarraidh a chruthú? níl mé cinnte |
| 135 | Did you see what she was trying to create an hour ago? | an bhfaca tú céard a bhí sí ag iarraidh a chruthú uair an chloig ó shin? |
| 136 | Did you see what she was trying to create? He was happy with it | an bhfaca tú céard a bhí sí ag iarraidh a chruthú? bhí sé sásta léi |
| 137 | Did you see what she was trying? | an bhfaca tú céard a bhí sí ag iarraidh? |
| 138 | what was she trying to create? | céard a bhí sí ag iarraidh a chruthú? |
| 139 | She was trying to show you something very beautiful | Bhí sí ag iarraidh rud éigin an-álainn a thaispeáint duit |
| 140 | I'm trying to learn how to include more Irish quickly. | Tá mé ag triail foghlaim conas cur san áireamh níos mó Gaeilge go tapa. |
| 141 | Did you see what she was trying to do before you start to follow us? | An bhfaca tú céard a bhí sí ag iarraidh a dhéanamh sula dtosaíonn tú sinn a leanúint? |
| 142 | She was trying to get the book a moment ago | Bhí sí ag iarraidh an leabhar nóiméad ó shin |
| 143 | A moment ago she wasn't trying to sit | Nóiméad ó shin nach raibh sí ag iarraidh suí |
| 144 | I didn't think that you are trying too much | Ní raibh mé den tuairim go bhfuil tú ag triail an iomarca |
| 145 | She was trying that she was right. | Bhí sí ag iarraidh go raibh an ceart aici. |
| 146 | I'm trying to practise more until everybody else is ready | Tá mé ag triail níos mó cleachtadh a dhéanamh go dtí go mbeidh gach éinne eile réidh |
| 147 | I'm just trying to learn how to speak Irish. | Tá mé díreach ag triail foghlaim conas Gaeilge a labhairt. |
| 148 | She was trying to just get something. | Bhí sí ag iarraidh díreach rud éigin a fháil. |
| 149 | I'm trying to think that we will be different. | Tá mé ag triail smaoineamh go mbeimid éagsúil. |
| 150 | The community is trying to help for them. | Tá an pobal ag triail cuideoinn dóibh. |
| 151 | I'm trying to practise more for charity. | Tá mé ag triail níos mó cleachtadh a dhéanamh don charthanacht. |
| 152 | I'm trying to make a meal. | Tá mé ag triail béile a dhéanamh. |
| 153 | They were trying what they wanted to do. | Bhí siad ag iarraidh céard a bhí siad a d'iarraidh a dhéanamh. |
| 154 | During a while, she was trying to develop a new approach. | Le linn ar feadh tamaill, bhí sí ag iarraidh cur chuige nua a fhorbairt. |
| 155 | She was trying to get a name. | Bhí sí ag iarraidh ainm a fháil. |
| 156 | I am still trying to climb | Tá mé ag triail dreapadh fós |
| 157 | You all think she is trying to stop | Cheapann sibh go léir go bhfuil sí ag iarraidh stopadh |
| 158 | You all think that old woman is trying | Cheapann sibh go léir go bhfuil an tseanhbean sin ag triail |
| 159 | I think your eyes are beautiful, did you see what she was trying to create? | Ceapaim go bhfuil do shúile álainn, an bhfaca tú céard a bhí sí ag iarraidh a chruthú? |
| 160 | I love the way you try to help. | Is aoibhinn liom an chaoi a ndéanann tú iarracht cabhrú. |
| 161 | I'm trying to think about the way they could wait. | Tá mé ag triail smaoineamh ar an chaoi a bhféadfaidís fanacht. |
| 162 | try to help | iarracht cabhrú |
| 163 | I'd like to try to help you now | ba mhaith liom iarracht cabhrú leat anois |
| 164 | I want to try to help you now | tá mé ag iarraidh iarracht cabhrú leat anois |
| 165 | I want to try to help you | tá mé ag iarraidh iarracht cabhrú leat |
| 166 | I love to try to help you | is aoibhinn liom iarracht cabhrú leat |
| 167 | I'd like to be able to try to help | ba mhaith liom a bheith in ann iarracht cabhrú |
| 168 | I want to try to help you speak Irish | tá mé ag iarraidh iarracht cabhrú leat Gaeilge a labhairt |
| 169 | I love the way you try to help | is aoibhinn liom an chaoi a ndéanann tú iarracht cabhrú |
| 170 | I love the way you try to help, but I don't want to stop talking | Is aoibhinn liom an chaoi a ndéanann tú iarracht cabhrú, ach níl mé ag iarraidh stopadh ag caint |
| 171 | I heard that I love the way you try to help | Chuala mé go bhfuil is aoibhinn liom an chaoi a ndéanann tú iarracht cabhrú |
| 172 | I love the way you try to help, because there wasn't much time left | Is aoibhinn liom an chaoi a ndéanann tú iarracht cabhrú, mar nach raibh mórán ama fágtha |
| 173 | I think that I love the way you try to help | Ceapaim go bhfuil is aoibhinn liom an chaoi a ndéanann tú iarracht cabhrú |
| 174 | I love the way you try to help, it's beautiful | Is aoibhinn liom an chaoi a ndéanann tú iarracht cabhrú, tá sé álainn |
| 175 | If you don't try to help, I love the way she does it | Mura ndéanann tú iarracht cabhrú, is aoibhinn liom an chaoi a ndéanann sí é |
| 176 | I'd like you to tell me I love the way you try to help | Ba mhaith liom go n-inseofá dom is aoibhinn liom an chaoi a ndéanann tú iarracht cabhrú |
| 177 | I love the way you try | is aoibhinn liom an chaoi a ndéanann tú iarracht |
| 178 | I love the way you try to help now | is aoibhinn liom an chaoi a ndéanann tú iarracht cabhrú anois |
| 179 | the way you try to help | an chaoi a ndéanann tú iarracht cabhrú |
| 180 | I'm not planning to try to help | níl sé i gceist agam iarracht cabhrú |
| 181 | maybe you try to help | b'fhéidir déanann tú iarracht cabhrú |
| 182 | Sometimes, I'm trying to practise more. | Uaireanta, tá mé ag triail níos mó cleachtadh a dhéanamh. |
| 183 | She is trying to find out what might have happened | Tá sí ag iarraidh a fháil amach céard a d'fhéadfadh tarlú |
| 184 | Let's agree to try to help the family. | Aontaímis iarracht cabhrú don teaghlach. |
| 185 | You will be trying for the wrong job. | Beidh tú ag iarraidh an post mícheart. |
| 186 | I was wrong because I am trying to learn Irish | Bhí mé mícheart mar tá mé ag triail Gaeilge a fhoghlaim |
| 187 | I'm trying to practice more next time we meet. | Tá mé ag triail níos mó cleachtadh a dhéanamh an chéad uair eile a bhuailimid le chéile. |
| 188 | The last time she was trying to leave me | An uair dheireanach a bhí sí ag iarraidh mé a fhágáil |
| 189 | We've often tried. | Bhíomar ag triail go minic. |
| 190 | I'm often trying to think how I'm going to pay. | Is minic a tá mé ag triail smaoineamh conas a n-íocfaidh mé. |
| 191 | we've often tried | bhíomar ag triail go minic |
| 192 | we've tried | bhíomar ag triail |
| 193 | we were often trying | bhíomar go minic ag triail |
| 194 | we were trying to speak Irish | bhíomar ag triail Gaeilge a labhairt |
| 195 | we've often tried with you | bhíomar ag triail go minic leat |
| 196 | We've often tried to know what it's like from the doctor. | Bhíomar ag triail go minic fáil amach conas mar atá sé ón dochtúir. |
| 197 | We were trying to count the ants. | Bhíomar ag iarraidh na seangáin a chomhaireamh. |
| 198 | We were trying to continue as they were. | Bhíomar ag iarraidh leanúint ar aghaidh mar a bhí siad. |
| 199 | We were trying to find out how the whole thing started | Bhíomar ag iarraidh a fháil amach conas ar thosaigh an rud ar fad |
| 200 | I love the way you try to let us see the other side. | Is aoibhinn liom an chaoi a ndéanann tú iarracht ligean dúinn an taobh eile a fheiceáil. |

## English "want"/"wants"/"wanted" — capped at 40, spread across corpus A

Full match count in corpus A (before capping) is **2,686** items. Capped list below is every Nth match (N = ceil(2686/40) = 68) so it spans the corpus rather than clustering at the start. 40 rows shown.

| # | English | Irish |
|---|---|---|
| 1 | I want to speak Irish with you now. | Tá mé ag iarraidh Gaeilge a labhairt leat anois. |
| 2 | You want to stop talking. | Tá tú ag iarraidh stopadh ag caint. |
| 3 | I wanted to ask you a question now | bhí mé ag iarraidh ceist a chur ort anois |
| 4 | I wanted to learn Irish about a week. | Bhí mé ag iarraidh Gaeilge a fhoghlaim le timpeall seachtain. |
| 5 | I want to ask you a question so that I feel more about it. | Tá mé ag iarraidh ceist a chur ort ionas go mothaím níos mó faoi. |
| 6 | I want you to say enough different words to me | Tá mé ag iarraidh go labharófá dóthain focal éagsúla a rá liom |
| 7 | I want a cup of coffee now | tá mé ag iarraidh cupán caife anois |
| 8 | I want to get a large glass. | Tá mé ag iarraidh gloine mór a fháil. |
| 9 | if I want to leave | má tá mé ag iarraidh imeacht |
| 10 | I want to speak Irish later | tá mé ag iarraidh Gaeilge a labhairt níos déanaí |
| 11 | although I wanted to, I didn't have time | cé go raibh mé ag iarraidh, ní raibh am agam |
| 12 | I want that you will be ready for the doctor. | Tá mé ag iarraidh go mbeidh tú réidh chuig an dochtúir. |
| 13 | I want to stay here now | tá mé ag iarraidh fanacht anseo anois |
| 14 | I said that I wanted | dúirt mé go raibh mé ag iarraidh |
| 15 | he wants to show now | tá sé ag iarraidh taispeáint anois |
| 16 | I want to speak Irish with you now, I am young. | Tá mé ag iarraidh Gaeilge a labhairt leat anois, tá mé óg. |
| 17 | I want to go to another country now | tá mé ag iarraidh dul go tír eile anois |
| 18 | He doesn't want to bring himself with us. | Níl sé ag iarraidh é féin a thabhairt linn. |
| 19 | he wanted to find out what was going to happen | bhí sé ag iarraidh a fháil amach céard a bhí chun tarlú |
| 20 | she didn't want to even speak with you | ní raibh sí ag iarraidh fiú labhairt leat |
| 21 | Your friend said that he wanted to turn left. | dúirt do chara go raibh sé ag iarraidh casadh ar chlé |
| 22 | I want to speak beautiful Irish with you | tá mé ag iarraidh Gaeilge álainn a labhairt leat |
| 23 | where he wanted | cá háit an raibh sé ag iarraidh |
| 24 | What do you want me to do until everybody else is ready? | Céard 'tá tú ag iarraidh orm a dhéanamh go dtí go mbeidh gach éinne eile réidh? |
| 25 | do we want food now? | 'bhfuilimid ag iarraidh bia anois? |
| 26 | he wants to be in charge now | tá sé ag iarraidh bheith i gceannas anois |
| 27 | they wouldn't like you to think they want something to drink | níor mhaith leo go gceapfá go bhfuil siad ag iarraidh rud éigin le n-ól |
| 28 | Could you tell them that they could come if they wanted to? | An féidir leat a rá leo go dá mbeidís ag iarraidh, d'fhéadfaidís teacht? |
| 29 | they don't want to be able to speak Irish | níl siad ag iarraidh bheith in ann Gaeilge a labhairt |
| 30 | Is what they wanted to do right? | An ceart céard a bhí siad a d'iarraidh a dhéanamh? |
| 31 | I want to speak with you near the hotel | tá mé ag iarraidh labhairt leat gar don óstán |
| 32 | Do you all want to go? | 'Bhfuil sibh go léir ag iarraidh dul? |
| 33 | he said he wanted to put it in the garden, nothing would make me happier | dúirt sé go raibh sé ag iarraidh é a chur sa ghairdín, ní dhéanfadh rud ar bith níos sásta mé |
| 34 | Did he want to play together? | Ar raibh sé ag iarraidh imirt le chéile? |
| 35 | I'm afraid of the reason you want to leave. | Tá eagla orm ar an bhfáth a 'bhfuil tú ag iarraidh imeacht. |
| 36 | I don't want to seem like I know that young woman | níl mé ag iarraidh an chuma a bheith orm go bhfuil aithne agam ar an mbean óg sin |
| 37 | if it's a fast car, I want it | más carr tapaidh é, tá mé ag iarraidh é |
| 38 | we've often wanted | is minic a bhí muid ag iarraidh |
| 39 | I want that we would have eggs | tá mé ag iarraidh go mbeadh uibheacha againn |
| 40 | If I'd known that they wanted the car | Dá mbeadh 'fhios agam gur mian leo an carr |

## English "I speak" / "do you speak" / "speaks" — full list, corpus A

128 items in corpus A have English text matching \b(i speak|do you speak|speaks)\b. All listed, verbatim, no sampling.

| # | English | Irish |
|---|---|---|
| 1 | I speak Irish now. | Labhraím Gaeilge anois. |
| 2 | I speak | labhraím |
| 3 | I speak Irish | labhraím Gaeilge |
| 4 | I speak Irish with you | labhraím Gaeilge leat |
| 5 | I speak Irish with you now | labhraím Gaeilge leat anois |
| 6 | I speak now | labhraím anois |
| 7 | I speak with you now | labhraím leat anois |
| 8 | I speak Irish now. | Labhraím Gaeilge anois. |
| 9 | Now, I speak Irish. | Anois, labhraím Gaeilge. |
| 10 | If I speak Irish now. | Má labhraím Gaeilge anois. |
| 11 | If I speak Irish now | Má labhraím Gaeilge anois |
| 12 | If I speak with you now | Má labhraím leat anois |
| 13 | If I speak Irish with you now | Má labhraím Gaeilge leat anois |
| 14 | if I speak Irish with you | má labhraím Gaeilge leat |
| 15 | if I speak Irish now | má labhraím Gaeilge anois |
| 16 | if I speak Irish | má labhraím Gaeilge |
| 17 | if I speak now | má labhraím anois |
| 18 | I speak Irish if I want | labhraím Gaeilge má tá mé ag iarraidh |
| 19 | If I am able, I speak Irish. | Má tá mé in ann, labhraím Gaeilge. |
| 20 | If you speak Irish, I speak Irish with you. | Má labhraíonn tú Gaeilge, labhraím Gaeilge leat. |
| 21 | If you speak, I speak. | Má labhraíonn tú, labhraím. |
| 22 | Do you speak Irish? | An labhraíonn tú Gaeilge? |
| 23 | do you speak | an labhraíonn tú |
| 24 | do you speak Irish now | an labhraíonn tú Gaeilge anois |
| 25 | do you speak now | an labhraíonn tú anois |
| 26 | do you speak Irish if I want | an labhraíonn tú Gaeilge má tá mé ag iarraidh |
| 27 | Do you speak Irish? | an labhraíonn tú Gaeilge? |
| 28 | You speak Irish very well and I speak Irish now. | Labhraíonn tú Gaeilge go han-mhaith agus labhraím Gaeilge anois. |
| 29 | If I speak Irish now and you speak Irish very well, I want to speak with you. | Má labhraím Gaeilge anois agus labhraíonn tú Gaeilge go han-mhaith, tá mé ag iarraidh labhairt leat. |
| 30 | I speak Irish now and I want to be able to speak with you. | Labhraím Gaeilge anois agus tá mé ag iarraidh a bheith in ann labhairt leat. |
| 31 | If I speak Irish and you speak Irish, I'd like to speak with you now. | Má labhraím Gaeilge agus labhraíonn tú Gaeilge, ba mhaith liom labhairt leat anois. |
| 32 | I speak Irish now and I want to speak Irish with you. | Labhraím Gaeilge anois agus tá mé ag iarraidh Gaeilge a labhairt leat. |
| 33 | You would speak and I speak | Labharófá agus labhraím |
| 34 | I'd like to be able to speak Irish but I speak Irish now | ba mhaith liom a bheith in ann Gaeilge a labhairt ach labhraím Gaeilge anois |
| 35 | I speak Irish now but I want to speak with you | labhraím Gaeilge anois ach tá mé ag iarraidh labhairt leat |
| 36 | I'd like to be able to speak with you but if I speak Irish now | ba mhaith liom a bheith in ann labhairt leat ach má labhraím Gaeilge anois |
| 37 | If I speak Irish, you want to learn it. | má labhraím Gaeilge, tá tú ag iarraidh a fhoghlaim. |
| 38 | Do you speak Irish very well? I want to learn it. | an labhraíonn tú Gaeilge go han-mhaith? tá mé ag iarraidh a fhoghlaim. |
| 39 | Do you speak Irish? I want to learn Irish. | an labhraíonn tú Gaeilge? tá mé ag iarraidh Gaeilge a fhoghlaim. |
| 40 | If I speak Irish now, you want to learn Irish. | má labhraím Gaeilge anois, tá tú ag iarraidh Gaeilge a fhoghlaim. |
| 41 | I speak more Irish now | labhraím níos mó Gaeilge anois |
| 42 | If I speak Irish now, it will be easy for you. | Má labhraím Gaeilge anois, beidh sé éasca ort. |
| 43 | It will be easy for you now because I speak Irish very well. | Beidh sé éasca ort anois mar labhraím Gaeilge go han-mhaith. |
| 44 | Do you speak Irish? I wanted to ask you a question | an labhraíonn tú Gaeilge? bhí mé ag iarraidh ceist a chur ort |
| 45 | Do you speak Irish with me because I started last month? | An labhraíonn tú Gaeilge liom mar thosaigh mé an mhí seo caite? |
| 46 | I speak Irish now, but I wasn't able to last month. | Labhraím Gaeilge anois, ach níl mé in ann an mhí seo caite. |
| 47 | I speak Irish for a week and I am able to remember it | Labhraím Gaeilge le timpeall seachtain agus tá mé in ann cuimhneamh air |
| 48 | I speak Irish about a week now. | Labhraím Gaeilge le timpeall seachtain anois. |
| 49 | I speak Irish for about a week now. | Labhraím Gaeilge le timpeall seachtain anois. |
| 50 | How do you speak Irish very well? | Conas a labhraíonn tú Gaeilge go han-mhaith? |
| 51 | If I speak Irish now, I need to learn more. | Má labhraím Gaeilge anois, tá orm níos mó a fhoghlaim. |
| 52 | If I speak Irish now, I don't care about making mistakes | Má labhraím Gaeilge anois, is cuma liom faoi bhotúin a dhéanamh |
| 53 | I'm trying to learn how to speak Irish so that I speak more. | Tá mé ag triail foghlaim conas Gaeilge a labhairt ionas go labhraím níos mó. |
| 54 | I'm going to learn more soon so that I speak Irish more. | Tá mé chun níos mó a fhoghlaim go luath ionas go labhraím Gaeilge níos mó. |
| 55 | I'm trying to practise more so that I speak Irish very well. | Tá mé ag triail níos mó cleachtadh a dhéanamh ionas go labhraím Gaeilge go han-mhaith. |
| 56 | so that I speak Irish | ionas go labhraím Gaeilge |
| 57 | so that I speak with you | ionas go labhraím leat |
| 58 | so that I speak Irish with you now | ionas go labhraím Gaeilge leat anois |
| 59 | I speak Irish now, but I'm not very good yet. | Labhraím Gaeilge anois, ach níl mé go han-mhaith fós. |
| 60 | If I speak Irish now, it will be easy for me to remember it yet. | Má labhraím Gaeilge anois, beidh sé éasca orm cuimhneamh air fós. |
| 61 | If I speak Irish now, I don't know how to say enough different words yet. | Má labhraím Gaeilge anois, níl fhios agam conas a dóthain focal éagsúla a rá fós. |
| 62 | I speak Irish more slowly now. | Labhraím Gaeilge níos moille anois. |
| 63 | I speak Irish more slowly at the moment. | Labhraím Gaeilge níos moille faoi láthair. |
| 64 | Do you speak more slowly with me? | An labhraíonn tú níos moille liom? |
| 65 | Can I speak with you? | An féidir liom labhairt leat? |
| 66 | Can I speak Irish soon? | An féidir liom Gaeilge a labhairt go luath? |
| 67 | Can I speak a little Irish now? | An féidir liom beagán Gaeilge a labhairt anois? |
| 68 | I want to have learned more so that I speak Irish well. | Tá mé ag iarraidh níos mó a bheith foghlamtha agam ionas go labhraím Gaeilge go maith. |
| 69 | Do you speak Irish? I don't know them. | An labhraíonn tú Gaeilge? Níl aithne agam orthu. |
| 70 | If I speak Irish now, I don't know them. | Má labhraím Gaeilge anois, níl aithne agam orthu. |
| 71 | If I speak Irish, I still don't know those people. | Má labhraím Gaeilge, níl aithne agam ar na daoine sin fós. |
| 72 | If you can, I speak with people so that I remember. | Má fhéidir leat, labhraím le daoine ionas gur cuimhin liom. |
| 73 | Please, do you speak Irish? | Le do thoil, an labhraíonn tú Gaeilge? |
| 74 | can I speak Irish | an féidir liom Gaeilge a labhairt |
| 75 | can I speak Irish with you now? | an féidir liom Gaeilge a labhairt leat anois? |
| 76 | Do you speak Irish? It would be good. | An labhraíonn tú Gaeilge? Bheadh go maith. |
| 77 | do you speak Irish, madam? | an labhraíonn tú Gaeilge, a bhean uasail? |
| 78 | Do you speak Irish in the morning? | An labhraíonn tú Gaeilge ar maidin? |
| 79 | May I speak a little Irish with you? | An bhfuil cead agam beagán Gaeilge a labhairt leat? |
| 80 | may I speak Irish now | 'bhfuil cead agam Gaeilge a labhairt anois |
| 81 | may I speak with you | 'bhfuil cead agam labhairt leat |
| 82 | may I speak Irish with you now | 'bhfuil cead agam Gaeilge a labhairt leat anois |
| 83 | May I speak with you, madam? | 'bhfuil cead agam labhairt leat, a bhean uasail? |
| 84 | may I speak, madam? | 'bhfuil cead agam labhairt, a bhean uasail? |
| 85 | May I speak Irish with you, madam? | 'bhfuil cead agam Gaeilge a labhairt leat, a bhean uasail? |
| 86 | may I speak Irish, madam? | 'bhfuil cead agam Gaeilge a labhairt, a bhean uasail? |
| 87 | May I speak Irish now, madam? | 'bhfuil cead agam Gaeilge a labhairt anois, a bhean uasail? |
| 88 | a mother speaks Irish | tá máthair ag labhairt Gaeilge |
| 89 | Do you speak with a doctor? | An labhraíonn tú le dochtúir? |
| 90 | If I speak Irish now, may I ask you a few questions? | Má labhraím Gaeilge anois, 'bhfuil cead agam cúpla ceist a chur ort? |
| 91 | If I speak Irish now, I'm worried. | Má labhraím Gaeilge anois, tá imní orm. |
| 92 | May I speak with you before you start? | 'bhfuil cead agam labhairt leat sula dtosaíonn tú? |
| 93 | She speaks Irish. | Labhraíonn sí Gaeilge. |
| 94 | she speaks | labhraíonn sí |
| 95 | she speaks Irish now | labhraíonn sí Gaeilge anois |
| 96 | she speaks now | labhraíonn sí anois |
| 97 | if she speaks Irish | má labhraíonn sí Gaeilge |
| 98 | she speaks with you | labhraíonn sí leat |
| 99 | she speaks Irish with you | labhraíonn sí Gaeilge leat |
| 100 | she speaks here | labhraíonn sí anseo |
| 101 | she speaks Irish | labhraíonn sí Gaeilge |
| 102 | she speaks Irish with my sister | labhraíonn sí Gaeilge le mo dheirfiúr |
| 103 | she speaks Irish with my mother | labhraíonn sí Gaeilge le mo mháthair |
| 104 | She speaks Irish with your friends | Labhraíonn sí Gaeilge le do chairde |
| 105 | I think she speaks Irish | Ceapaim go labhraíonn sí Gaeilge |
| 106 | She speaks Irish with friends | Labhraíonn sí Gaeilge le cairde |
| 107 | I think it's true that she speaks Irish | Ceapaim gur fíor go labhraíonn sí Gaeilge |
| 108 | She speaks with people who enjoy learning. | Labhraíonn sí le daoine a dtaitníonn leo foghlaim. |
| 109 | if I speak with people who speak Irish now | má labhraím le daoine a labhraíonn Gaeilge anois |
| 110 | She speaks Irish with three friends. | Labhraíonn sí Gaeilge le trí chairde. |
| 111 | Do you think she speaks Irish? | An gceapann tú go labhraíonn sí Gaeilge? |
| 112 | a student speaks Irish | tá mac léinn ag labhairt Gaeilge |
| 113 | If I speak badly. | Má labhraím go dona. |
| 114 | I speak beautiful Irish now | labhraím Gaeilge álainn anois |
| 115 | if I speak beautiful Irish now | má labhraím Gaeilge álainn anois |
| 116 | Which person speaks Irish? | Cén duine a labhraíonn Gaeilge? |
| 117 | I speak Irish still | labhraím Gaeilge fós |
| 118 | if I speak Irish next year | má labhraím Gaeilge an bhliain seo chugainn |
| 119 | I speak Irish on Tuesday | labhraím Gaeilge Dé Máirt |
| 120 | If I speak Irish now, that you would ask in a few days? | Má labhraím Gaeilge anois, go gcuirfeá ceist i gceann cúpla lá? |
| 121 | I speak with people who speak Irish, it is the only hope. | Labhraím le daoine a labhraíonn Gaeilge, is é an t-aon dóchas. |
| 122 | If I speak Irish now, it will be easy for you to remember left instead of right. | Má labhraím Gaeilge anois, beidh sé éasca ort cuimhneamh ar chlé seachas ar dheis. |
| 123 | When I move, I speak Irish so that I can remember how to say a few words. | Nuair a bhogaim, labhraím Gaeilge ionas gur cuimhin liom conas cúpla focal a rá. |
| 124 | if I speak about the reason | má labhraím ar an bhfáth |
| 125 | I was wrong, do you speak Irish? | Bhí mé mícheart, an labhraíonn tú Gaeilge? |
| 126 | She speaks Irish because she grew up here. | Labhraíonn sí Gaeilge mar fás aníos anseo a bhí sí. |
| 127 | I speak Irish always | labhraím Gaeilge i gcónaí |
| 128 | if I speak Irish always | má labhraím Gaeilge i gcónaí |

## Distinct Irish renderings of English "try" — the frequency distribution

This is not a dedup of full sentences (most try-sentences are unique) — it is a classification of which *root pattern* each of the 200 try-matched corpus-A items uses to render "try", since that is what is actually reusable as a dialect/register signal.

Root patterns tested: `ag triail`/bare `triail` (verbal-noun of the borrowed verb *triail*), `iarracht` (the noun "an attempt", as in *iarracht a dhéanamh*/*iarracht chabhrú*), and `ag iarraidh` (literally "wanting" — reused here to render "trying", an overlap with the WANT group worth flagging on its own).

| Rendering pattern(s) matched | Item count (of 200) |
|---|---|
| `ag triail` / `triail` only | 115 |
| `ag triail` / `triail` + `ag iarraidh` also present in same sentence | 10 |
| `ag iarraidh` only (want-form doing double duty for "try") | 52 |
| `iarracht` only | 19 |
| `iarracht` + `ag iarraidh` also present in same sentence | 4 |
| No known try-pattern matched | 0 |

Collapsed (an item counts once per pattern it contains, so these sum to more than 200): **`ag triail`/`triail` = 125 items, `ag iarraidh` = 66 items, `iarracht` = 23 items.** This is the single most useful number: two-thirds of the corpus renders "try" with `ag triail`/`triail`, but a third of it (66/200) instead reuses `ag iarraidh` — the same form the WANT group uses for "want" — which means a learner cannot always distinguish "I want to X" from "I'm trying to X" from the Irish alone in this corpus. `iarracht` (the noun form) is a distant third at 23 items.

## Honesty / gaps

- Corpus B was read live from Supabase with a plain SELECT (no writes attempted, no transaction opened beyond the read). Row counts (668/943/5975) match the pre-existing CSV export exactly, so there is no evidence of drift, but the CSV itself was not used as the data source for the numbers above — the live query was.
- "Item count" (used throughout, per the brief) differs from raw occurrence count when a phrase appears twice in one sentence; where that distinction mattered it is called out explicitly (the `cad`/calibration row).
- The matcher is literal-substring-at-word-boundary, not morphological — eclipsed/lenited/inflected variants not explicitly listed in the brief's phrase list are NOT folded in and will undercount the true concept frequency (e.g. `cheapann` is not counted under `ceapann`). This is a known, flagged limitation, not a silent gap.
- Several OTHER-group items (`freisin`, `fosta`, `chuile`, `eicint`, `cén chaoi`, `cén bealach`, `go díreach`) return 0 in one or both corpora. Spot-checked with an unbounded substring search (no word-boundary) to rule out a matcher bug — genuinely 0 hits, not a false negative. Flagged rather than assumed.

