# hye_for_eng — native-speaker check log

Phrases flagged during the orthography simple-fix pass (2026-06-29) that have issues
**beyond spelling** — wrong word choice / grammar / structure. Spelling was still
normalised where unambiguous, but the meaning needs a native Armenian review.

## Word-choice / grammar doubts

- **S0011L03 — "after you finish" → `որ Դու ավարտելու ես`** (LEGO + its 7 build/use phrases:
  B01,B02,B03,U01,U02,U03,U04,U05). `որ` = "that", not "after". Likely should be `երբ` /
  `…ավարտելուց հետո`. Spelling fixed (վոր→որ); **the "after" rendering needs a native call.**
- **S0012L04B02 — "I'm not sure what's going to happen tomorrow" → `ես վստահ չեմ թե ինչ վաղը կլինի`**.
  Spelling fixed (վստահ/թե/վաղը); structure "ինչ վաղը կլինի" is thin (missing `է լինելու`).

## Systematic grammar patterns (spelling cleaned, grammar needs native) — found from ~S0022 on
- **"before" → `նախեվ որ`** (S0025L03 LEGO + all its phrases, also S0025L04U02). `նախեվ` is not a
  valid word for "before"; likely `նախքան` (+ drop `որ`). Whole "before" subsystem needs native rebuild.
- **"I like [doing] X" → `ինձ դուր է [սովորում/participle]`** (S0026 L01/L02 baskets). Should be
  `ինձ դուր է գալիս [gerund -ելը]`; inconsistent (some phrases have `գալիս`, some don't) + present-participle
  used where a gerund is needed.
- **"people who speak…" → `մարդիկի, որ …`** (many: S0022L03, S0024L02U05, S0025L02U04/L04U04). Wrong case +
  relative; prefer `մարդկանց, ովքեր …`.
- **S0022L01U05 — "with you" → `ինձ հետ`** = "with me" (wrong pronoun; should be `քեզ հետ`).

## More patterns (found ~S0028–S0033; spelling cleaned, grammar needs native)
- **"how [good/useful] it is" → `որ …`** (S0033L01 LEGO "how/that"→`որ` + phrases). `որ`="that"; "how" should be `որքան`/`ինչքան`.
- **"with you" → `դու հետ`** (S0031L02U02 etc.) — wrong case; should be `քեզ հետ` (same family as the `ինձ հետ` issue).
- **"you wanted" → `ուզիր`** (S0031L01 phrases) — garbled past; should be `ուզում էիր` / `ուզեցիր`.
- **"to show" → `ցույցադրել`** (S0032L01) — non-standard; should be `ցույց տալ` (or `ցուցադրել`).
- **"as quickly as I/you can" → `ինչպես արագ կարող եմ/ես`** — `ինչպես`="how"; more natural `որքան արագ …`. (minor)
- **"tonight" → `այսօր գիշեր`** ("today night"; should be `այս գիշեր`). (minor)

## More patterns (found ~S0033–S0046)
- **"how long" → `որ կադ`** (S0033L02/L03) — `կադ` non-word; should be `որքան ժամանակ`.
- **"this afternoon" → `այսօր կավիտ`** (S0035L01) — `կավիտ` garbled; should be `այսօր կեսօրից հետո` / `այս կեսօր`.
- **"worry / I don't worry" → `անխնում / չեմ անխնում`** (S0046L03U03) — garbled; should be `անհանգստանալ`.
- **"approximately/about" → `մոտավոր`** (S0038) — adj used adverbially; prefer `մոտավորապես`. (minor)
- **"to know" → `գիտել`** (S0045L02) — archaic/odd; prefer `իմանալ`. (minor)

## More patterns (found ~S0047–S0052)
- **"friends / my friends" → `խնամակ(ների)`** (S0051L04U05) — wrong word (խնամ=care); should be `ընկերներ`.
- **"what should I do?" → `փոխենք պետք է անեմ?`** (S0051L05U05) — garbled (`փոխենք`="let's change"); should be `ի՞նչ պետք է անեմ`.
- **"something interesting" → `հեչասպաս բաներ`** (S0051L05U08) — garbled; should be `ինչ-որ հետաքրքիր բան`.
- **"to you" → `ինձ`** (S0049L03U04 "if it's important to you") — wrong pronoun (=to me); should be `քեզ`.

## More patterns (found ~S0052–S0055, past-tense section)
- **"didn't want" → `չի ուզում եր/էր`** (S0052L02U04 etc.) — broken negative past; should be `չէր ուզում`.
- **"bag" → `պակում`** (S0053L02+) — garbled; should be `պայուսակ(ում)` (or `պարկում`).
- **"to put" → `դալ`** (S0053L03 LEGO) — non-word; should be `դնել`.
- **"read" → `գիտել`** (S0053L01U05) — = "know"; should be `կարդալ`.
- NOTE: `ուզում եր`→`ուզում էր` ("wanted", imperfect "was wanting") accepted; aorist `ուզեց` would be tighter — native call.

## More patterns (found ~S0061–S0070)
- **"slowly" → `ուշով`** (S0061L04) — garbled; should be `դանդաղ`/`կամաց`.
- **"does it bother you / mind" → `խանդորվում`** (S0063L02/L03) — garbled; should be `խանգարում`.
- **"fun" → `զվար(ճ) է`** (S0064) — should be `զվարճալի`.
- **"look after" → `խնամվել`** (S0069L04) — passive voice; should be active `խնամել`.
- **"do you know…?" → `գիտեմ ես`** (S0065L01U03, S0070L01U02) — = "I-know you"; should be `գիտե՞ս`.
- **"stop" → `կանալ`** (S0067L01U05) — non-word; should be `դադարել`/`կանգնել`.
- NOTE markers don't catch standalone `Կարհոր`/`երիտաս`/`վորտեղ` etc. unless a phrase also has վոր/ե — do a final marker-expansion sweep at the end.

## More patterns (found ~S0071–S0086)
- **"let (someone do)" → `տերել`** (S0071L04U05) — non-word; should be `թողնել`.
- **"what you said" → `ասածես`** (S0078, S0083) — garbled; should be `ինչ որ ասել ես` / `ասածդ`.
- **"do you think…?" → `կարծում եմ ես …`** (S0072L01U01) — = "I think you"; should be `կարծո՞ւմ ես`.
- **"are you surprised" → `զարմացած ես եմ`** (S0077L02U05) — doubled aux (ես+եմ); should be `զարմացա՞ծ ես`.
- **S0078L01U05 "I'm surprised at what you said" → `չի հասկանում …`** = "doesn't understand" — fully mismatched; rebuild.
- **"I think you have more to learn" S0075L01U05 → `գիտեմ եմ …`** doubled aux; + several `գիտեմ ես`/`գիտեմ եմ` confusions.

## More patterns (found ~S0086–S0104)
- **"unfortunately" → `վաչոխտ`** (S0086L02) — garbled; should be `ցավոք`/`դժբախտաբար`.
- **"great" → `սիրակ`** (S0092/S0094) — garbled; should be `հիանալի`/`հոյակապ`.
- **"way" → `ջորդ(քն)`** (S0094L04 "the way it will work") — garbled; should be `ձև`/`կերպ`.
- **"know / don't know" → `ճանաչում`** (S0099L02) — = "recognize"; "know (a fact)" should be `գիտեմ`/`իմանալ` (ճանաչ = recognize a person).

## More patterns (found ~S0104–S0109)
- **"hard / work hard" → `կալին`** (S0106/S0109) — garbled; should be `դժվար` (hard) / `քրտնաջան` (work hard).
- **"content / feel happy" → `ուշատ`** (S0106) — garbled; should be `ուրախ`/`գոհ`.
- **"doing (activity)" → `անորդում`** (S0104L02) — garbled; should be `անում`.
- **"because of that" → `փարինածը`** (S0105L02U03) — garbled; should be `դրա պատճառով`.
- NOTE: past-aux `ե→է` (`եիր/եինք/եին`) now in token map; `ուզում եի…` etc. become `…էի`.

## More patterns (found ~S0111–S0119)
- **"brain" → `գլխ(ի)`** (S0111) — = "head"; should be `ուղեղ`.
- **"I wasn't expecting" → `չեմ սպասում եր`** (S0112L03) — broken; should be `չէի սպասում`.
- **"you said" → `ասացիրետ`** (S0113L03) — garbled (variant of `ասածես`); should be `ասածդ`/`ինչ ասացիր`.
- **"can (do/make)" → `կարում`** (S0113/S0116) — = "sewing"; should be `կարող`. (`կարում եմ/ես` auto-fixed; other forms logged.)
- **"as if" → `որ`** (S0114 "I feel as if") — should be `կարծես`/`ասես`; also "I feel"→`եմ զգում` word order off.
- **"before" also appears as `նախկան`** (S0119) = `նախքան` (correct word, just misspelled — auto-fixed). Distinct from the garbled `նախեվ`.

## More patterns (found ~S0120–S0123)
- **"unusual" → `հետկարկ`** (S0121) — garbled; should be `անսովոր`.
- **"car / your car" → `մաշկենան`** (S0121L02) — garbled; should be `(քո) մեքենան`.
- **"to use" → `ոգտակործվել`** (S0121L03U05) — garbled; should be `օգտագործել`.
- **"easy / easier" → `հալտ`** (S0122L03) — garbled; should be `հեշտ` (`ավելի հեշտ`).
- **"exciting / excited" → `հավուտակ`** (S0122L04/L06) — garbled; should be `հուզիչ`/`ոգևորված`.
- **"going (progressing)" → `անկնում`** (S0122L06 "how it is going") — garbled; should be `ընթանում`.

## More patterns (found ~S0123–S0132)
- **"work (noun)" → `աշխատը`** (S0126L02) — garbled; should be `աշխատանքը`.
- **"surprise" → `զլայց`** (S0130) — garbled; should be `անակնկալ`.
- **"than (less than)" → `կան`** (S0132) — NOT auto-fixed (collides with real `կան`=exist); "than" should be `քան`. Native to disambiguate.

## More patterns (found ~S0132–S0138)
- **"important" → `կազմակարապ`** (S0137, all over) — garbled (≈"organize"); should be `կարևոր`. Distinct garble from `կարևր`/`Կարհոր`.
- **"often / frequently" → `հաշիվ`** (S0137L02) — = "account/bill"; should be `հաճախ`.
- **"perfect" → `կատակ լինել`** (S0137L03) — = "joke"; should be `կատարյալ`.
- **"he said" → `նա ասել`** (S0138L01U03) — infinitive; should be `նա ասաց`.
- **S0138L01U01 "I remember which one it was" → `Գիտեմ որ Սա էր`** — "remember"→know, "which one"→this; mismatched, rebuild.

## More patterns (found ~S0138–S0142)
- **2nd-person copula: `դու … է` should be `դու … ես`** — the blanket `ե→է` fix is correct for 3sg ("it is") but wrong after `դու` ("you are"). A handful (e.g. S0142L02U05/L04U04 "you are kind/grateful") now read `դու … է`; native should switch to `ես`.
- **"early" → `արկունակ`** (S0139L02) — garbled; should be `վաղ`/`կանուխ`.
- **"grateful" → `շնորհակալեմ է`** (S0142L04) — merged/garbled; should be `շնորհակալ եմ/ես`.
- **"to show" → `ցույցնել`** (S0140L03) — variant of `ցույցադրել`; should be `ցույց տալ`.

## More patterns (found ~S0142–S0149)
- **⚠️ ENGLISH-side leak: "difficult" → `dzhvar`** (S0149 prompts) — the *known/English* text transliterates the Armenian `դժվար` instead of saying "difficult". Known-side bug; sweep for other transliterated English prompts.
- **"patient" → `ամբերդագան`** (S0148) — garbled; should be `համբերատար`.
- **"feeling nervous" → `կորվում`** (S0147L02) — = "getting lost"; should be `լարված/նյարդային զգում`.
- **"I was unable / couldn't" → `չի կարում եիմ`** (S0148L02) — broken; should be `չէի կարող`.
- **"I hope" → `հույս եմ ունեմ`** (S0149L02) — extra `եմ`; should be `հույս ունեմ`.
- **"grateful" → `շնորհակալեմ եմ/է`** (S0142L04/L05) — merged; should be `շնորհակալ եմ/ես`.

## More patterns (found ~S0149–S0157)
- **"would happen" → `կատանժի`** (S0151) — garbled; should be `կպատահի`/`տեղի կունենա`.
- **"morning" → `արևագունը`** (S0155L05) — garbled; should be `առավոտը`. (distinct from `արավոտ`)
- **"will be able / would be" → `կլինևի`** (S0152/S0157) — garbled; should be `կկարողանամ`/`կլինի`.

## More patterns (found ~S0157–S0169)
- **"month / this month" → `ամիսվան`** (S0157L03) — garbled; should be `ամիսը`/`ամսվա`.
- **"afternoon" → `կևսիլուտյան`** (S0167L01) — garbled (3rd variant of afternoon); should be `կեսօրից հետո`.
- **"you think" → `ես կարկրում` (→`ես կարծում`)** word order/agreement off in S0162; should be `կարծո՞ւմ ես`.

## More patterns (found ~S0169–S0195)
- **"help (me help you)" → `կողևմ`** (S0171L03) — garbled; should be `օգնեմ`.
- **"look for it" → `իշխել`** (S0171L03U05) — = "to rule"; should be `փնտրել`.
- **"I'll ask" → `կհարցնևլ`** (S0176L01) — garbled; should be `կհարցնեմ`.
- **"to the doctor" → `բժկի ժայ`** (S0181L03) — garbled; should be `բժշկի մոտ`.

## More patterns (found ~S0195–S0204)
- **"table" → `սևլիկ`** (S0195) — garbled; should be `սեղան`.
- **"busy" → `կլկլուտ`** (S0197/S0198) — garbled; should be `զբաղված`.
- **"as a (works as a)" → `որևնժիչ`** (S0197L02) — garbled; should be `որպես`.
- **"teacher" → `կրտուտյամբ`** (S0197L03) — garbled; should be `ուսուցիչ`.
- **"to help (subjunctive)" → `ոգնա`** (S0204L01U05) — should be `օգնի`.
- NOTE `հաստատ`=correct "sure/certain"; `դուստրը`=correct "daughter"; `թողեցիր`=correct "you left". Not everything is broken.

## More patterns (found ~S0204–S0233)
- **"arrangements" → `կազմավորումներ`** (S0204) — garbled; should be `կազմակերպումներ`.
- **"I forgot / I've forgotten" → `մարրեծի`** (S0205) — garbled; should be `մոռացա`.
- **"discuss" → `զբահենք`** (S0210L02) — garbled; should be `քննարկենք`.
- **"the problem" → `խտնանդիրյ`** (S0210L03) — garbled; should be `խնդիրը`.
- **"ask for (help)" → `խայնարկել`** (S0212L02) — garbled; should be `խնդրել`.
- **"they told us …" → `նրանք մենք ասեյին վոր …`** (S0211L01) — `մենք`=we (should be `մեզ`=us), `ասեյին`→`ասացին`, missing `ուզում`. Rebuild.
- **"your sister" → `կոոյրե`** (S0233L02) — garbled; should be `քո քույրը`.

## More patterns (found ~S0234–S0249)
- **"he said" → `ասեր`** (S0235) — garbled (variant of `նա ասել`); should be `ասաց`.
- **"fairly" → `համարկեծով`** (S0247L02) — garbled; should be `բավականին`/`համեմատաբար`.
- **"I want" → `ուզեմ`** (S0249) — subjunctive; for "I want X" should be `ուզում եմ`. (not auto-fixed)
- NOTE `եիտ`→`էր` (was/wanted) now in token map; `հանդիպեծի`→`հանդիպեցի` (I met).

## More patterns (found ~S0249–S0283)
- **"be late" → `ուշածնեմ`** (S0270L02) — garbled; should be `ուշանամ`.
- **"talking about (who)" → `նրանից`** (S0262) — ablative "from him"; "about" should be `…մասին`.
- **"idea" → `գաղասարկի`** (S0272L02) — garbled variant; should be `գաղափարի`.
- **"to be ready (subj)" → `լինենայ`** (S0253) — should be `լինեմ`/`լինի` (`պատրասրտ`→`պատրաստ` auto-fixed).

## More patterns (found ~S0285–S0295)
- **⚠️ S0285 "they/she speak" → `(են) չի Նա խոսում ե`** — word-salad (subject/negation/agreement scrambled across "they don't speak"/"she speaks"). Rebuild the seed.
- **"TV / television" → `տելեվիսիոն`** (S0287/S0288) — transliteration leak; should be `հեռուստացույց`.
- **"most / the majority" → `մեջիսակուտյունյ`** (S0288L02) — garbled; should be `մեծամասնությունը`.
- **"I wonder if" → `Խետակնորում եմ արդու`** (S0289) — garbled; should be `հետաքրքրվում եմ արդյոք`.
- **"I'll be able to" → `կարող լինել`** (S0291L02) — should be `կարողանամ`.
- **"in a day" → `(մեկ) որովանյ`** (S0295) — garbled; should be `մեկ օրում`.

## More patterns (found ~S0296–S0300, end)
- **⚠️ S0298 nested "love that … surprised that … nothing/remaining"** — deeply nested `որ`-chains + doubled subjects ("I, she was surprised"); fully garbled, rebuild the seed.
- **"half" → `կարեկ`** (S0299) — garbled; should be `կես`.
- **"unfriendly" → `անբնախալկ`** (S0300) — garbled; should be `անբարյացակամ`.
- **"more" → `ավել`** (S0296) auto-fixed to `ավելի` (note: `ավել` alone = "broom").

## More patterns (straggler sweep)
- **"you (are/know)" → `եկ`** (S0133 "you know someone very well" → `…եկ ճանաչնում…`) — `եկ` is a garbled 2sg aux; should be `ես`. Recurring; not auto-fixed.
- **"politely / kindly" → `ինխուրուտյամբ`** (S0173) — garbled; should be `քաղաքավարի`.
- **"but / however" → `վաթևվ`** (S0178) — garbled connector; should be `բայց`/`սակայն`.
- **"I don't have" → `չունևի`** (S0178 "I have no time") — should be `չունեմ`.
- **"spend (time)" → `անդրել`** (S0209) — garbled; should be `անցկացնել`.
- **"rest / relax" → `հանգրնալու`** (S0219) — garbled; should be `հանգստանալու`.
- **"would help" → `ոգրեյի`** (S0229L02) — garbled; should be `օգնեի`.
- **"tell/should tell (subj)" → `ասե`** (S0227L01U05) — should be `ասի`.
- **"speaking (likes speaking)" → `խոսելք`** (S0240L03) — garbled; should be `խոսելը`/`խոսել`.
- **"tired / upset" → `զասկված`** (S0246L04) — garbled; likely `հոգնած`/`վրդովված`.
- **"back (money back)" → `հեզ`** (S0248L05) — should be `հետ`.
- **`համարկեծով`** (S0247L02, "that book … good") — garbled, meaning unclear; native pass.
- **"you'll be" → `կես`** (S0252 "when ready you'll be") — should be `կլինես`.
- **"less" → `պակե`** (S0256L03) — should be `պակաս`.
- **"serious/important?" → `կարույտ`** (S0257) — garbled; native pass.
- **"disturb / mind" → `խանագարումյ`** (S0281 "do you mind if") — should be `խանգարում`.
- **"coffee" → `կավեյ`** (S0281) — should be `սուրճ`/`կաֆե`.
- **"who (pl)" → `վորքյ`** (S0283) — should be `ովքեր`.
- **"call / phone" → `զվանել`** (S0294) — should be `զանգել`.
- **"enough" → `բավարական`** (S0294) — should be `բավական`.
- **"any / anyone / anything" family garbled** — `վորեվեկից` ("from anyone"→`որևէ մեկից`), `որևեք`/`որևնժիչ` ("any/anything"→`որևէ`), all S0071+; native pass.
