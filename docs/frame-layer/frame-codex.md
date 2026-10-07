# Frame codex (2026-10-07.3)

> Generated from `tools/frame-layer/frame-codex.json` by `render-codex-md.cjs`. Edit the JSON, never this page. The tagger (`frame-tagger.cjs`) gives the JSON to a Haiku-family model; nothing classifies frames with a regex (r-2026-10-07-never-use-regex-to-classify-language).

The definitions a model (Haiku family) uses to say which frames a phrase's KNOWN side instantiates. Tom 2026-10-07 (r-2026-10-07-never-use-regex-to-classify-language): frames are classified by a model reading these definitions, never by regex. The P-ids are stable and pinned to tools/frame-layer/patterns.cjs.

## General rules

- A frame is a CONSTRUCTION: a grammatical shape that carries a meaning. Judge the grammar and the meaning, never the presence of a word. 'I like it' is P31; 'it's like a dream' is not P31.
- Check EVERY phrase against EVERY frame; in particular every not / n't / never / no-one / nothing fires P23, every question fires P20, and every time word or time phrase fires P28. Do not let a frame from a neighbouring phrase leak into this one.
- Tag the KNOWN side of the phrase as written, whatever language it is in.
- Multi-label: fire every frame the phrase genuinely instantiates. Many phrases fire 1-4 frames; some fire none ('the red car', 'my brother').
- Fragments are normal (BUILD phrases are building blocks). Tag the shape the fragment actually has: 'want to go' fires P1 even without a subject; 'to go' fires nothing.
- OPENER: a detachable discourse opener at the very front ('yes,', 'no,', 'well', 'so', 'and', 'but', 'oh', 'ok', 'thank you,', 'sorry,', 'of course', 'no problem', 'excuse me', 'great', 'actually', 'unfortunately', a vocative like 'Mary,') earns NO frame. Mark the phrase O and tag only what follows. It is an opener only if removing it leaves the rest of the phrase intact; 'no one came' and 'but for you' do not start with openers. A leading 'please' before a command is an opener and the command still fires P26.
- Fire a frame only when its construction is the phrase's own: a word in another sense does not count ('a can of soup' is not P4, 'the month of May' is not P8, 'over there' is not P19).
- When unsure whether a borderline case fires, follow the frame's boundary rules; if they do not settle it, do not fire.

## Known side in a language other than English

- Frames are defined by construction and meaning, with English as the reference language because the 668 canonical seeds were written in English. On a known side in another language (Hindi in eng_for_hin and kor_for_hin, Tamil in zho_for_tam, Japanese in spa_for_jpn, Welsh in ita_for_cym, Yoruba in cym_for_yor, Spanish in cat_for_spa, Chinese in deu_for_zho, French in bre_for_fra, ...), fire a frame when the phrase uses THAT language's ordinary construction for the same meaning. Each frame lists the usual realisations under 'other_languages'.
- Translate the meaning, not the words: Welsh 'dw i'n hoffi coffi' is P31 (liking) and is NOT P3, because the Welsh periphrastic present is the plain present there, not a progressive. French 'j'ai mangé' used as a plain past is NOT P29. Japanese 'たことがある' (experience) IS P29.
- Where a language has no separate construction for an English-specific frame (P5 'be able to', P18 dummy 'it', P25 'as...as'), fire the frame only on that language's closest dedicated construction (Spanish 'ser capaz de' for P5; Hindi 'utna ... jitna' for P25; Hindi 'yah aasaan hai' for P18 when it evaluates a situation). If there is none, the frame simply does not occur in that course and that is correct.
- Where English splits one meaning into two frames that another language merges (English must P8 / have to P6; French 'devoir' covers both), fire the frame that matches the meaning in context: obligation -> P6; advice -> P7; deduction or possibility ('il doit être là', 'puede que') -> P8.

## Output the model gives

One line per phrase: '<number>: <tokens>' where tokens are an optional O (opener present) followed by frame ids, or '-' when there is nothing. Example: '12: O P1 P23 P28'.

## P1 want-chain

Shape: `[SUBJ] want(s) / would like to [VP]  |  [SUBJ] want(s) [SUBJ2] to [VP]`

A verb of wanting (want, would like, 'd like, wish to, feel like + -ing) with a VERBAL complement: wanting to do something, or wanting someone to do something. Negated and questioned forms count.

**Fires:**

- I want to go home
- do you want to come with us?
- she doesn't want me to leave
- I'd like to book a table
- want to speak French

**Does not fire:**

- I want a coffee — want + noun only, no verbal complement
- I like going there — liking (P31), not wanting
- I hope to see you — hope is P11
- would you like some tea? — would like + noun only
- a want of money — noun 'want'
- I'm trying to think — try is not want
- I think I need to look at that — need to = P6

**Boundary:**

- Requires a verb after want/would like (to-infinitive, or object + to-infinitive, or 'feel like' + -ing).
- 'would like' + noun does not fire.
- Only verbs of WANTING. try to, need to (P6), know to, expect to, mean to, decide to, plan to are NOT P1.

**Other known languages:** French vouloir/aimer bien + inf, Spanish querer + inf, Hindi chahna (jaana chahta hoon), Japanese -たい, Welsh eisiau + VN, Chinese 想/要 + verb.

## P2 going-to future

Shape: `[SUBJ] (am|is|are) going to [VP]`

'be going to' / 'gonna' + a VERB, expressing future or intention.

**Fires:**

- I'm going to call him
- it's going to rain
- are you going to stay?
- we were going to leave early
- going to buy a car

**Does not fire:**

- I'm going to Paris — motion to a place: P3 progressive, not P2
- I will call him — plain future, no frame
- I'm going home — motion
- the going rate — adjective
- I want to go to the shop — P1; 'go to' is motion

**Boundary:**

- Only when 'going to' is followed by a verb. Motion 'going to <place>' is P3.
- P2 phrases do NOT also fire P3.

**Other known languages:** French aller + inf (je vais partir), Spanish ir a + inf, Portuguese ir + inf, Welsh mynd i + VN, Hindi -ne vala hai. A plain future tense (Hindi -ga, French futur simple, Chinese 会) does not fire.

## P3 progressive

Shape: `[SUBJ] (am|is|are|was|were) [VPing]`

be + verb-ing describing an action in progress (present or past progressive, including future-arrangement use 'I'm meeting her tomorrow').

**Fires:**

- I'm working now
- she was waiting for you
- what are you doing?
- they're coming tomorrow
- I'm trying to think

**Does not fire:**

- it's interesting — -ing adjective, not a progressive (P18)
- I like swimming — gerund object (P31)
- I'm going to call him — going-to future: P2 only
- speaking French is hard — gerund subject
- before leaving — -ing after a preposition, no be

**Boundary:**

- Needs be + V-ing with the -ing as a verb in progress.
- be going to + verb is P2, not P3.
- try, hope, expect, plan, wait, look forward in the progressive count: 'I'm trying to think', 'I was hoping she'd come', 'I'm looking forward to it' all fire P3.

**Other known languages:** Spanish estar + gerundio, French être en train de, Hindi -raha hai/-rahi thi, Japanese -ている in its in-progress meaning, Chinese 在/正在 + verb. Welsh 'yn' periphrasis is the ordinary present: fire only when the meaning is clearly ongoing right now ('dw i'n gweithio nawr').

## P4 modal can/could

Shape: `[SUBJ] can|can't|could|couldn't [VP]`

The modal can/could (ability, permission, possibility, polite request), affirmative, negative or question.

**Fires:**

- I can't hear you
- can I sit here?
- could you help me?
- she could swim when she was five
- can speak French

**Does not fire:**

- I'm able to come — P5
- a can of beans — noun
- I may come — P8
- it's possible — no modal verb (P18)
- I know how to swim — P10/P22, no modal

**Boundary:**

- 'could have' + past participle fires P4 and P17.

**Other known languages:** French pouvoir, Spanish poder, Hindi sakna, Japanese potential -える/-られる and ことができる, Chinese 能/会/可以, Welsh gallu/medru. Japanese potential verb forms are P4 wherever they appear, including negated and inside かもしれない: できる, 会える, 行けません, 話せる.

## P5 be able to

Shape: `[SUBJ] ... be able to [VP]`

The periphrasis 'be able to' / 'be unable to' + verb, any tense.

**Fires:**

- I won't be able to come
- were you able to find it?
- I'd like to be able to speak French
- she's able to drive
- to be able to help

**Does not fire:**

- I can come — P4
- she's an able student — adjective, no to-VP
- the ability to speak — noun
- I managed to finish — no 'able'
- it's possible to go — P18

**Boundary:**

- Only with 'able to'/'unable to' (or a language's dedicated equivalent).

**Other known languages:** Spanish ser capaz de, French être capable de, Welsh gallu when phrased 'bod yn gallu' with future/infinitive sense. Plain can-verbs (pouvoir, poder, sakna) are P4.

## P6 have to / need to

Shape: `[SUBJ] (have|has|had) to [VP]  |  [SUBJ] need(s) to [VP]`

Obligation or necessity to do something: have to, has to, had to, need to, have got to, don't have to, needn't.

**Fires:**

- I have to go
- you don't need to wait
- she had to work late
- do we have to pay?
- I've got to leave

**Does not fire:**

- I have a car — possession
- I need a car — need + noun, no verb
- you must go — P8 in English
- you should go — P7
- I have finished — perfect (P29)

**Boundary:**

- Needs a verb after to. need + noun does not fire.

**Other known languages:** French il faut / devoir (obligation) / avoir besoin de + inf, Spanish tener que / hay que / necesitar + inf, Hindi -na hai / -na padta hai / -na chahiye when it is obligation not advice, Japanese -なければならない, Chinese 得/必须/需要 + verb, Welsh rhaid i.

## P7 should / ought

Shape: `[SUBJ] should|shouldn't [VP]`

Advice or expectation: should, shouldn't, ought to, had better.

**Fires:**

- you should rest
- we shouldn't stay long
- what should I do?
- you ought to call her
- you'd better hurry

**Does not fire:**

- you must rest — P8
- you have to rest — P6
- I'd like to rest — P1
- I suggest resting — no modal of advice
- shall we go? — shall, not should

**Boundary:**

- 'should have' + past participle fires P7 and P17.

**Other known languages:** French devoir in conditional (tu devrais), Spanish deber (deberías), Hindi -na chahiye (advice), Japanese -たほうがいい / べき, Chinese 应该, Welsh dylai/dylet ti.

## P8 must / may / might

Shape: `[SUBJ] must|may|might [VP]`

The modals must, mustn't, may, might (obligation, permission, deduction or possibility).

**Fires:**

- you must be tired
- it might rain
- may I come in?
- you mustn't touch that
- he may be right

**Does not fire:**

- maybe he's right — adverb, not a modal
- in May — month
- with all his might — noun
- I can come — P4
- perhaps it will rain — adverb

**Boundary:**

- 'might have'/'must have' + participle fires P8 and P17 only when counterfactual ('you might have told me'); deduction about the past ('he must have left') fires P8 and P29.

**Other known languages:** Deduction and possibility constructions: French il doit être / il se peut que, Spanish puede que / deber de, Hindi ho sakta hai (possibility), Japanese かもしれない / はずだ. Obligation in languages without a separate must is P6.

## P9 matrix think/believe

Shape: `[SUBJ] think(s)/believe(s) (that) [CLAUSE]`

A verb of opinion (think, believe, reckon, suppose, guess, imagine, feel = think) taking a CLAUSE (with or without 'that'), or the pro-forms 'so'/'not' standing for a clause.

**Fires:**

- I think it's too late
- do you believe he'll come?
- I don't think so
- she thought that you were here
- I reckon we should go

**Does not fire:**

- I'm thinking about the trip — think about + noun, no clause
- what do you think? — no complement clause
- I believe you — believe + person
- I know he's here — P10
- think of a number — no clause (imperative P26)

**Boundary:**

- A clause or so/not must follow.

**Other known languages:** French penser/croire que, Spanish creer/pensar que, Hindi sochna/lagta hai ki, Japanese と思う, Chinese 觉得/认为, Welsh meddwl bod.

## P10 matrix know/sure

Shape: `[SUBJ] know(s)/(am|is) sure (that|if) [CLAUSE]`

know, be sure, be certain, realise taking a CLAUSE complement (that-clause, if/whether-clause or wh-clause).

**Fires:**

- I know that he's busy
- are you sure it's open?
- I didn't know you were here
- I'm not sure if she'll come
- do you know where the station is?

**Does not fire:**

- I know him — know + person
- I don't know — no clause
- sure, let's go — opener 'sure'
- make sure you lock it — 'make sure' is an instruction, not knowledge
- I know French — know + noun

**Boundary:**

- Requires a clause. With a wh- or if/whether clause it fires P10 and P22.

**Other known languages:** French savoir que / être sûr que, Spanish saber que / estar seguro de que, Hindi pata hai ki / maaloom hai ki / yakeen hai ki, Japanese と知っている / か分かる, Chinese 知道 + clause, Welsh gwybod bod.

## P11 matrix hope/wish

Shape: `[SUBJ] hope(s)/wish(es) (that) [CLAUSE]`

hope or wish (as verbs) taking a clause or a to-infinitive.

**Fires:**

- I hope you're well
- I wish I could stay
- we hope to see you soon
- I hope so
- she wishes she had more time

**Does not fire:**

- best wishes — noun
- hopefully he'll come — adverb
- I want to see you — P1
- there's no hope — noun (P19, P23)
- I'm waiting for you — not hope

**Boundary:**

- 'hope so/not' counts.

**Other known languages:** French espérer / souhaiter que, Spanish esperar que / ojalá, Hindi ummeed hai ki / kaash, Japanese といいな / 願う, Chinese 希望, Welsh gobeithio.

## P12 matrix say/tell

Shape: `[SUBJ] said/told [OBJ] (that) [CLAUSE]`

Reported speech: say, tell, explain, mention, promise, ask (= request) introducing REPORTED CONTENT, a clause, a to-infinitive ('told me to wait') or a quotation.

**Fires:**

- he said he was tired
- she told me to wait
- tell him I'll be late
- they say it's expensive
- I promised I would help

**Does not fire:**

- what did you say? — no reported content
- tell me your name — tell + noun, no clause (P26 only)
- say it again — no clause
- I can't tell the difference — tell = distinguish
- as I said — no reported clause

**Boundary:**

- A reported clause, to-infinitive or quote must be present. With a wh-clause ('tell me where it is') it fires P12 and P22.

**Other known languages:** French dire que / dire de + inf, Spanish decir que, Hindi kahna ki / bataana ki, Japanese と言う, Chinese 说/告诉 + clause, Welsh dweud bod / dweud wrth ... am.

## P13 temporal clause

Shape: `before|after|when|while|until [CLAUSE]`

A subordinate clause of time opened by before, after, when, while, until, as soon as, once, since (time), every time: finite or -ing clause.

**Fires:**

- call me when you arrive
- before you start
- I'll wait until she comes
- after eating, we left
- as soon as I can

**Does not fire:**

- when are you coming? — question word (P21)
- before Monday — preposition + noun (P28)
- after the film — preposition + noun (P28)
- since you're here, sit down — since = because (P15)
- as soon as possible — equative idiom (P25), no clause

**Boundary:**

- A verb must follow the conjunction. 'when' introducing an indirect question is P22.
- 'remember when ...', 'know when ...' are embedded clauses (P22), not P13.

**Other known languages:** French quand / avant de / avant que / après / pendant que / jusqu'à ce que, Spanish cuando / antes de que / mientras, Hindi jab ... tab / se pehle / ke baad / -te hi, Japanese とき / 前に / 後で / まで, Chinese ……的时候 / 以前 / 以后, Welsh pan / cyn / ar ôl / tra / nes.

## P14 conditional if (real)

Shape: `if [CLAUSE], [CLAUSE]`

A condition clause: if, unless, even if, in case, as long as (conditional). Includes present-unreal 'if I were you'; past counterfactual 'if I had known' fires P14 and P17.

**Fires:**

- if it rains, we'll stay home
- if you want
- unless you're busy
- even if he calls
- what if she's right?

**Does not fire:**

- ask him if he's coming — if = whether (P22)
- I don't know if it's open — if = whether (P10, P22)
- as if nothing happened — manner comparison
- if only — wish formula without clause
- when it rains — temporal (P13)

**Boundary:**

- A fragment 'if you want' still fires: the condition clause is present.

**Other known languages:** French si, Spanish si / a menos que, Hindi agar ... to, Japanese -たら / -ば / なら, Chinese 如果/要是, Welsh os.

## P15 because / so / but

Shape: `[CLAUSE] because|so|but [CLAUSE]`

A connective linking two predications or a predication and a reason: because, because of, but, although, even though, though, so (= therefore), so that, since (= because), that's why.

**Fires:**

- I'm tired because I worked late
- it's small but nice
- although it's late, let's go
- I left early so I wouldn't miss it
- because of the rain

**Does not fire:**

- but I want to go — leading 'but' is an opener (O); tag P1 only
- I'm so tired — so = very
- so, what now? — opener
- nothing but trouble — but = except
- I think so — so = pro-form (P9)

**Boundary:**

- The connective must link material inside the phrase; a sentence-initial 'but/so/and' with nothing before it is an opener.
- Every but / because / although / so (= therefore) that joins two parts INSIDE the phrase fires P15, also when the phrase is long.

**Other known languages:** French parce que / mais / bien que / donc, Spanish porque / pero / aunque / así que, Hindi kyonki / lekin / magar / isliye / phir bhi, Japanese から / ので / けど / でも (clause-linking), Chinese 因为 / 但是 / 所以 / 虽然, Welsh achos / ond / er / felly.

## P16 relative clause

Shape: `[NP] who|that|which [VP]`

A clause modifying a noun: who, whom, whose, which, that, where, when (relative), or a reduced/zero relative ('the book I bought', 'the man sitting there').

**Fires:**

- the man who lives next door
- the book that I bought
- the house where I grew up
- the film you recommended
- someone who speaks French

**Does not fire:**

- I think that he's right — complementiser that (P9)
- that book is mine — demonstrative
- who is that? — question word (P21)
- I know what you mean — embedded question/free relative (P10, P22), no head noun
- so that we can leave — purpose connective (P15)

**Boundary:**

- There must be a head noun or pronoun the clause modifies ('someone', 'something', 'the one' count).
- A free relative with no head noun ('what you said', 'where my family lives', 'lo que quiero') is NOT P16.

**Other known languages:** French qui / que / où / dont, Spanish que / quien / donde, Hindi jo ... vah (correlative), Japanese pre-nominal clause (私が買った本), Chinese ……的 + noun (我买的书), Welsh a / sydd / y.

## P17 counterfactual

Shape: `[SUBJ]'d have [VPpp] if [SUBJ]'d [VPpp]  (double-'d)`

An unreal PAST: something that did not happen. would / could / should / might have + past participle, or if + had + past participle, or wish + had + past participle.

**Fires:**

- I would have called you
- if I'd known, I'd have come
- you should have told me
- I could have helped
- I wish I had stayed

**Does not fire:**

- I have called you — plain perfect (P29)
- I would call you — present conditional, not past unreal
- if I were you — present unreal (P14)
- he must have left — deduction about a real past (P8, P29)
- I had called her — past perfect (P29)

**Boundary:**

- Fires together with the modal's own frame (P4/P7/P8) and with P14 for the if-clause.

**Other known languages:** French conditionnel passé (j'aurais dû, si j'avais su), Spanish habría + participio / si hubiera, Hindi -ta (agar mujhe pata hota, to main aata), Japanese -ばよかった / -たらよかったのに, Chinese 要是早知道……就……, Welsh baswn i wedi / pe bawn i wedi.

## P18 It's-adjective

Shape: `it's [ADJ] (to [VP] | that [CLAUSE])`

Subject 'it' + be + an ADJECTIVE or an evaluative noun phrase (a good idea, a shame, a pity, a problem), optionally + to-VP or that-clause. Any tense, negated or questioned.

**Fires:**

- it's easy
- it's hard to say
- it was a good idea
- is it far?
- it's important that you come

**Does not fire:**

- it's raining — progressive (P3)
- it's Peter — a name, not evaluative
- it's five o'clock — time, not an adjective
- that's great — subject 'that'; often an opener
- it's here — location
- this won't work — subject 'this', no adjective
- my friend is very good at German — subject is a noun, not 'it'

**Boundary:**

- The grammatical subject must be the word 'it' (or the language's dummy/situational subject, e.g. French c'est, Spanish es with no subject). 'that is', 'this is', 'he is', 'my daughter is', 'the world is' + adjective do NOT fire P18.
- Adjectives describing a referent called 'it' count ('it's red', 'it's too big').

**Other known languages:** French c'est / il est + adj (c'est facile), Spanish es + adj with no expressed subject (es fácil), Hindi yah ... hai with an evaluative adjective about a situation (yah mushkil hai), Japanese adjective predicate with no expressed subject (難しい / 簡単です), Chinese 很 + adj with no expressed subject or with 它, Welsh mae'n + adj (mae'n hawdd). Demonstrative subjects (那, 这, ìyẹn, 'that', 'this') do not fire.

## P19 there is/are

Shape: `there (is|are|was|were|will be) [NP]`

Existential 'there' + be (any tense, modal or question): stating that something exists or is present.

**Fires:**

- there's a problem
- is there a bank near here?
- there were a lot of people
- there won't be time
- there might be a problem

**Does not fire:**

- over there — locative there
- there he is — presentational locative
- they're here — pronoun they're
- go there — locative
- I have a problem — possession

**Boundary:**

- Only the existential 'there'.

**Other known languages:** French il y a, Spanish hay / había, Hindi ... hai stating existence (mez par kitaab hai), Japanese がある / がいる, Chinese 有 (existential), Welsh mae ... / oes (mae problem).

## P20 question

Shape: `(do|did|are|is|can|would|wh-) ... ?`

A direct question of any kind: yes/no, wh-, tag question, or an intonation question marked by '?'.

**Fires:**

- are you ready?
- where do you live?
- it's nice, isn't it?
- you're coming?
- can I help you

**Does not fire:**

- I wonder where he is — indirect question (P22)
- ask him — imperative
- tell me what you want — embedded (P12, P22, P26)
- what a day! — exclamation
- how nice! — exclamation

**Boundary:**

- A question without '?' still fires if its word order is interrogative ('can I help you').

**Other known languages:** Any interrogative: question particles (Hindi kya, Japanese か, Chinese 吗/呢, Welsh question forms ydy/oes/wyt), inverted order, or '?' marking.

## P21 wh-question

Shape: `[WH] ... ?`

A direct question built on a wh-word: what, where, when, why, who, whom, whose, which, how (including how much, how many, how long). Always also P20.

**Fires:**

- what time is it?
- where are you going?
- why not?
- how much is it?
- which one do you want?

**Does not fire:**

- I know where it is — embedded (P10, P22)
- the man who called — relative (P16)
- when I arrive — temporal clause (P13)
- how lovely! — exclamation
- are you ready? — yes/no question (P20 only)

**Boundary:**

- Direct questions only.

**Other known languages:** Question words: French que/où/quand/pourquoi/qui/comment/combien, Spanish qué/dónde/cuándo/por qué/quién/cómo, Hindi kya/kahan/kab/kyon/kaun/kaise/kitna, Japanese 何/どこ/いつ/なぜ/誰/どう, Chinese 什么/哪里/什么时候/为什么/谁/怎么, Welsh beth/ble/pryd/pam/pwy/sut.

## P22 embedded question

Shape: `[SUBJ] [VP] what|where|why|how [CLAUSE]`

An interrogative clause (wh-clause, wh + to-infinitive, or if/whether clause) as the complement of a verb or adjective: know, ask, wonder, tell, remember, understand, decide, find out, explain, see, not sure, depends on.

**Fires:**

- I don't know where he is
- ask her if she's coming
- I wonder why
- tell me what you want
- I'm not sure how to do it

**Does not fire:**

- where is he? — direct question (P20, P21)
- the place where I live — relative (P16)
- call me when you arrive — temporal (P13)
- if it rains we'll stay — conditional (P14)
- I know that he left — declarative that-clause (P10 only)

**Boundary:**

- The embedded clause must be interrogative. 'I wonder why' with an elided clause still fires.

**Other known languages:** French je ne sais pas où / si, Spanish no sé dónde / si, Hindi pata nahin ki kahan / ki ... ya nahin, Japanese どこにいるか分からない (…か + verb), Chinese 不知道他在哪儿, Welsh dw i ddim yn gwybod ble / os.

## P23 negation

Shape: `[SUBJ] (don't|doesn't|didn't|not|never) [VP]`

Any negation inside the phrase: not / n't (don't, can't, isn't, won't), never, no + noun, nothing, nobody, no one, nowhere, none, neither, nor.

**Fires:**

- I don't understand
- I can't come
- never again
- there's nothing here
- no one knows

**Does not fire:**

- no, thank you — 'no' answer is an opener (O)
- no problem, I'll do it — opener formula
- I'm unhappy — negative prefix, not negation
- hardly anyone — not an explicit negator
- I know — know, not 'no'

**Boundary:**

- 'never' fires P23 and P28.

**Other known languages:** French ne ... pas / jamais / rien / personne, Spanish no / nunca / nada / nadie, Hindi nahin / mat / na / kabhi nahin, Japanese -ない / -ません, Chinese 不 / 没, Welsh ddim / byth / neb / dim byd.

## P24 comparative/superlative

Shape: `more|less|-er than | the most|-est`

Comparison of degree or quantity: -er / more / less / fewer (+ than), better, worse, and superlatives -est / most / least / best / worst.

**Fires:**

- it's bigger than mine
- the best restaurant in town
- I need more time
- less expensive
- faster than me

**Does not fire:**

- as big as mine — equative (P25)
- I don't live there anymore — anymore = time (P23, P28)
- most people agree — most = majority quantifier
- I'd better go — modal idiom (P7)
- I prefer tea — preference verb (P31)

**Boundary:**

- 'more' + noun (more time) counts as comparison of quantity. 'once more' does not.

**Other known languages:** French plus / moins / meilleur / le plus, Spanish más / menos / mejor / el más, Hindi se zyada / sabse, Japanese より / 一番, Chinese 比 / 更 / 最, Welsh mwy / -ach / gorau.

## P25 as ... as

Shape: `as [ADJ] as [X]`

Equative comparison: as + adjective/adverb/much/many + as (including 'not as ... as' and the idiom 'as soon as possible').

**Fires:**

- as big as a house
- not as easy as I thought
- as soon as possible
- as much as you want
- as quickly as you can

**Does not fire:**

- as soon as I arrive — temporal clause (P13)
- the same as yours — 'same as', not as...as
- as well as — coordination
- as if he knew — manner
- such as Paris — example

**Boundary:**

- Both 'as' must be present.

**Other known languages:** French aussi ... que / autant que, Spanish tan ... como / tanto como, Hindi utna ... jitna / ... jaisa, Japanese と同じくらい / ほど (negated), Chinese 跟……一样, Welsh mor ... â / cymaint â.

## P26 imperative

Shape: `[VP] ... !  |  bare-V opening`

A command, instruction or invitation addressed to the listener: bare verb ('come here'), negative ('don't go'), 'let's' / 'let me', 'please' + verb, emphatic 'do'.

**Fires:**

- come here
- don't worry about it
- let's go
- please wait
- tell me the truth

**Does not fire:**

- you should wait — advice (P7)
- can you wait? — request question (P4, P20)
- to wait — infinitive fragment
- I let him go — let with a subject
- waiting for you — -ing fragment

**Boundary:**

- A subjectless phrase starting with a bare verb fires P26 when it can stand alone as an instruction to the listener ('speak slowly', 'go home', 'eat something').
- It does not fire for a 'to' infinitive, an -ing chunk, or a piece that only makes sense after a subject or modal and could never be said as a command ('want to go', 'be able to come', 'know the answer').

**Other known languages:** Imperative mood: French viens / ne pars pas / allons-y, Spanish ven / no te vayas / vamos, Hindi jao / jaiye / mat jao / chalo, Japanese -てください / -て / -ないで / -ましょう, Chinese 请…… / 别…… / ……吧, Welsh dere / cer / paid â / gad i ni.

## P27 what's-it-like

Shape: `what (is|was) [NP] like?  |  it's like [CLAUSE]`

Asking for or giving a DESCRIPTION by resemblance: 'what is X like?', or be / look / sound / feel / seem + 'like' + noun or clause ('it's like a dream', 'it looks like rain').

**Fires:**

- what's the weather like?
- what was it like?
- it's like a dream
- it looks like rain
- that sounds as though you need sleep

**Does not fire:**

- I like it — liking (P31)
- would you like tea? — P1 / offer
- do it like that — manner, no be/look/sound/feel/seem
- what do you like? — liking question (P31, P21)
- how are you? — greeting, not a description request
- he's sick — plain description, no 'like'

**Boundary:**

- Needs the word 'like' (or 'as if' / 'as though') after be / look / sound / feel / seem, or a question asking what something is like. A plain description ('he's sick', 'she's very good at German') is NOT P27.
- Description questions in languages without 'like' fire when they ask what something is like ('¿cómo es tu casa?'), never for greetings.

**Other known languages:** French c'est comment ? / c'est comme, Spanish ¿cómo es? / es como, Hindi kaisa hai? (describe) / ... jaisa lagta hai, Japanese どんな……? / みたい / のよう, Chinese ……怎么样? / 像……一样, Welsh sut un yw / mae fel.

## P28 time adjunct

Shape: `[CLAUSE] [TIME]`

A time expression modifying the phrase: time adverbs (now, today, tomorrow, yesterday, tonight, soon, later, already, still, yet, again, ever, never, always, often, sometimes, usually, then, before, ago) and time phrases (next week, last night, at five, in the morning, on Monday, for two hours, every day, in a minute).

**Fires:**

- I'll call you tomorrow
- I've already eaten
- we always go there
- see you next week
- for two hours

**Does not fire:**

- I don't have time — time as an object noun
- what time is it? — time as the topic (P20, P21)
- first, open the box — sequence, not time
- before you start — temporal clause (P13), not an adjunct
- the weekend is nice — time noun as subject

**Boundary:**

- The time expression must modify the predication, not be its subject or object.
- Place words (here, there, at home) are not time. 'how long' and 'how much time' asked as the question's topic do not fire P28.

**Other known languages:** Any time adverbial: French maintenant / demain / déjà / toujours, Spanish ahora / mañana / ya / siempre, Hindi ab / kal / abhi / hamesha / pehle, Japanese 今 / 明日 / もう / いつも, Chinese 现在 / 明天 / 已经 / 总是, Welsh nawr / yfory / eisoes / bob amser.

## P29 perfect

Shape: `[SUBJ] (have|has|had) [VPpp]`

Perfect aspect: have / has / had + past participle (present, past, future perfect and perfect infinitive 'to have done').

**Fires:**

- I've finished
- have you ever been to Spain?
- she hadn't seen it
- we've lived here for years
- I have tried

**Does not fire:**

- I have to go — obligation (P6)
- I've got a car — 'have got' = possession
- I had lunch — main verb have
- it was finished — passive/adjective (P30)
- I finished — simple past

**Boundary:**

- Modal + have + participle fires P29 only for real-past deduction ('he must have left'); counterfactuals are P17.
- A plain past tense in any language ('we heard a thousand stories', 'I told her') is NOT P29.

**Other known languages:** Fire only for PERFECT meaning (experience, result up to now, already/ever/just/since/for): French passé composé when it carries that meaning (j'ai déjà mangé), Spanish he + participio, Hindi -a hai / -chuka hai / liya hai, Japanese たことがある / もう……た, Chinese 过 / 了 with 已经, Welsh wedi (dw i wedi gorffen). Narrative past forms do not fire.

## P30 passive

Shape: `[SUBJ] (is|was|were) [VPpp] (by [X])`

Passive voice: be / get + past participle with the patient as subject ('it was made in France', 'he got arrested'), with or without 'by'.

**Fires:**

- it was built in 1900
- the shop is closed on Sundays
- he got arrested
- French is spoken here
- it was written by my brother

**Does not fire:**

- I'm tired — adjective
- I'm interested in art — adjective (P31)
- they've made it — perfect active (P29)
- I'm married — adjective
- it's broken — resultant state adjective unless an event is meant
- I told her my grandfather fought in Italy — active past

**Boundary:**

- Fire when an action done to the subject is meant. Plain states (tired, married, worried, broken, closed as a state) do not fire unless a by-agent or event reading ('closed on Sundays') is clear.
- An ordinary active past tense ('he fought in Italy', 'I heard') is NOT passive.

**Other known languages:** French être + participe passé (passive event) / se + verb passive, Spanish ser + participio / se vende, Hindi -ya jaata hai / -ya gaya, Japanese -られる (passive, not potential), Chinese 被, Welsh cael ei + VN.

## P31 like/enjoy (dative)

Shape: `[SUBJ] like(s)/love(s)/enjoy(s) [NP|VPing]`

Verbs of liking, preference or dislike with a noun or verb complement: like, love, enjoy, prefer, hate, can't stand, be fond of, be keen on, be interested in, be into.

**Fires:**

- I like coffee
- do you enjoy swimming?
- I prefer tea
- she hates waiting
- I'm interested in history

**Does not fire:**

- I'd like to go — would like = P1
- it's like a dream — resemblance (P27)
- do it like this — manner preposition
- it's likely — adjective likely
- I want coffee — wanting

**Boundary:**

- 'love' and 'like' with a person as object still fire ('I love you').

**Other known languages:** French aimer / adorer / préférer / détester, Spanish gustar / encantar / preferir (dative construction, hence the frame's name), Hindi pasand hai / achchha lagta hai, Japanese が好き / 楽しむ, Chinese 喜欢 / 爱, Welsh hoffi / licio / caru.
