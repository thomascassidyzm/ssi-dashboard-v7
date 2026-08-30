# The state of Irish — 20 August 2026

**The finding, first: the Irish course is half-built and has never been checked by a human — and in the part learners actually reach, it says the wrong words out loud.**

Ten sentences into the course, a learner hears the English voice ask: **"Do you speak *gle* all day?"** Not "Irish" — the three letters of the language code, read aloud. It happens ten times, at sentences 14, 15, 22, 33, 64, 160, 283, 285, 286 and 297, and the learner hears it before they have any reason to doubt it.

Separately, at sentence 15, a learner is asked to say *"I want to speak Irish with you now"* and the Irish they hear back means **"I want to speak Irish with myself now"**. There are twenty-one sentences like that. They are not typos — the course is quietly copying the pronoun from the teaching sentence into practice sentences where the person has changed.

Nobody caught any of it because nobody has ever looked. Not one Irish sentence in the estate carries a human sign-off, not one review note about Irish exists anywhere in the live system, and the review tool the team actually uses has never had an Irish file opened in it.

**The good news is in the same paragraph as the bad.** The ten "gle" recordings have correctly-worded twins that already exist, already rendered and already paid for, sitting unused in the database. Fixing them costs nothing and needs no new audio at all.

---

## 1. What exists

There are three Irish courses. All numbers below were counted from the live database today.

| | Irish for English speakers | Connemara Irish for English speakers | Chinese for Irish speakers |
|---|---|---|---|
| Status | beta, open to learners | draft | beta |
| Sentences written | 668 | 668 | 5 |
| Sentences actually taught | **300** | **12** | 5 |
| Teaching tiles | 943 | 35 | 15 |
| Practice sentences | 5,975 | 266 | 127 |
| Audio clips | 25,308 | **0** | 414 |
| Rounds a learner can play | **786** | none | a handful |

**The main course stops at sentence 300 of 668.** The other 368 sentences are written and even voiced, but they have no teaching tiles and no practice, so no learner ever reaches them. The course's own round map confirms it: 786 rounds, ending at sentence 300.

**And within those first 300, the practice layer is full of holes.** 117 of the 300 sentences have no practice at all — the learner meets the new words and then gets nothing to do with them. The holes get worse the further in you go:

| Where you are | Sentences with practice |
|---|---|
| 1–50 | 50 of 50 |
| 51–100 | 37 of 50 |
| 101–150 | 32 of 50 |
| 151–200 | 22 of 50 |
| 201–250 | 23 of 50 |
| 251–300 | 19 of 50 |

So the honest description is: **the first fifty sentences are a complete course. After that it thins out, and after sentence 300 it stops.**

### How that compares

Spanish for English speakers is the fair yardstick — it is released, live, and the most complete course in the estate. Same 668-sentence spine.

| | Irish | Spanish |
|---|---|---|
| Sentences taught | 300 | 668 |
| Practice sentences | 5,975 | 16,328 |
| Gaps in the practice layer | 117 | 5 |
| Rounds playable | 786 | 1,339 |
| Audio clips | 25,308 | 78,949 |

**Irish is about a third of a finished course**, and the third that exists is the front third.

The Connemara course is a genuine dialect rewrite, not a copy — it says *cén chaoi* where the main course says *conas*, *céard* where the main one says *cad*. It got to sentence 12 of 668 in August and stopped. It has no audio at all.

---

## 2. Audio

The built part of the course is **fully voiced** — that is the good news, and it is genuinely good. Of the sentences, tiles and practice lines that exist, 99.9% have their audio attached. There is no silent-slot backlog. The only meaningful gap is 155 teaching tiles missing their presentation clip.

**But essentially none of it is human.**

| | Clips |
|---|---|
| Machine-voiced (Microsoft Azure) | 22,689 core course clips |
| — Orla, the main Irish voice | 7,282 |
| — Colm, the second Irish voice | 6,552 |
| — Sonia, the English voice | 7,520 |
| Pod / conversation audio (a different voice set) | 2,542 |
| Human recordings | **75** |
| Human recordings **of Irish** | **0** |

Those 75 human clips are the English narrator's pep talks about how the brain learns — shared across every course in the estate. **Not one word of Irish in the entire course is spoken by a person.**

### Are there Irish recordists?

**No.** The estate's voice register lists human speakers for Welsh, Spanish and English, and one Finnish test identity. For Irish it lists exactly two voices, Orla and Colm, both of them Microsoft's.

**Is there a recording queue with Irish lines waiting? No — and there is nothing for a queue to be built from.** The table that tells the recording system who is cast for which language covers five languages: Breton, Pennsylvania Dutch, Finnish, Welsh and a test entry. Irish is not in it at all.

**Has anyone ever recorded a single Irish take? No.** The recording log holds 447 sessions across the estate — Welsh, German, Finnish and test material. **Irish appears zero times.** So the usual question of "how many recorded takes never made it into the course" has no answer here, because there is no upstream population at all. This is not a backlog. It is an absence.

---

## 3. What is broken

I ran the checks that have caught real defects on other courses. I want to be straight about method, because raw counts from these checks lie: **for every check below, I hand-read every single hit and threw out the ones that were wrong.** The false-positive rate was 36%.

### The worst defect: ten sentences say "gle" instead of "Irish"

Ten sentences in the course have an English prompt recording that speaks the language *code* where the language *name* should be. The written sentences are all correct — they say "Irish". Only the recordings are wrong.

| Sentence | The learner hears |
|---|---|
| 14 | "Do you speak **gle** all day?" |
| 15 | "And I want you to speak **gle** with me tomorrow." |
| 22 | "Because I want to meet people who speak **gle**." |
| 33 | "How long have you been learning **gle**?" |
| 64 | "Learning **gle** isn't easy but it is fun." |
| 160 | "How do you say this word in **gle**?" |
| 283 | "Which of your friends speak **gle**?" |
| 285 | "She speaks **gle**." |
| 286 | "People who like speaking **gle**." |
| 297 | "I don't know many people who speak **gle**." |

I did not take the written record's word for this. There is physical evidence in the recordings themselves: for every one of the ten, a correctly-worded recording of the same sentence already exists on the same voice — and **the "gle" version is longer in all ten cases** despite having two fewer letters. "She speaks gle" runs 2.18 seconds against 2.02 for "she speaks Irish". Three letters read aloud take longer than the word "Irish", and that length difference shows up ten times out of ten. That is not something a typo in a text field can fake.

**This is the cheapest fix in the whole document.** The correct recordings exist, unused, for all ten. Nothing needs to be generated. Only the connection between the sentence and its recording is pointing at the wrong file.

### The systemic defect: the course says the wrong person

The course tells learners to say *"with you"* and gives them Irish that means *"with me"*.

I checked this with a detector for Irish pronoun agreement, and I proved it works before trusting it. There are 133 practice sentences containing *"with you"*. In 116 of them the Irish is correct, and the detector stayed silent on all 116 — no false alarms. I then took a correct sentence, deliberately broke it, and confirmed the detector caught it. Only then did I count.

**Twenty-one confirmed defects survived. Every one of them is voiced and live.** Examples, verbatim:

> **"I want to speak Irish with you now"** → *tá mé ag iarraidh Gaeilge a labhairt **liom** anois*
> The Irish says: I want to speak Irish **with myself** now.

> **"can I practise speaking with you today?"** → *an féidir liom labhairt a chleachtadh **liom** inniu?*
> The Irish says: can I practise speaking **with myself** today?

> **"it is important to do your best when you are speaking Irish"** → *Tá sé tábhachtach **mo dhícheall** a dhéanamh ag labhairt Gaeilge*
> The Irish says: it is important to do **my** best.

> **"thoughts going around in your head"** → *smaointe ag dul timpeall i **mo cheann***
> The Irish says: in **my** head.

The cause is visible and systemic. Sentence 15 teaches *"speak Irish **with me**"* — correctly *liom*. The practice sentences generated from it then keep saying *liom* even when the English flips to *"with you"*. The same thing happens at sentences 65 and 66 with *"your best"* becoming *"my best"* eight times over.

**This matters more than its size suggests**, because six of them sit at sentence 15 — inside the first hour, where every single learner passes through, and where a beginner has no way to know they are being taught something wrong.

### Two sentences where the Irish simply isn't the English

> **"I know Irish is difficult but I want to speak it with you as soon as possible"** → the Irish actually says *"I'd like to know how to speak Irish but it's hard to remember."*

> **"after we finish I would like to be able to speak more Irish with you"** → the Irish says *"after we finish I'd like to be able to speak after you finish"* — the ending is duplicated and the middle is gone.

Both are voiced.

### The course asks for a word it never taught

The course teaches *"to be able to"* as **ábalta** at sentence 11 and uses it 193 times thereafter. But eleven practice sentences ask for **in ann** instead — a different, equally correct Irish phrase the learner has never been shown. All eleven sit at sentences 274, 275 and 276: one batch that drifted. The learner is asked to produce a form the course never gave them.

### The Chinese-for-Irish course contradicts itself at sentence 2 of 5

The smallest Irish course is a five-sentence stub, and it disagrees with itself six times over. Its second sentence gives the Irish *"Tá mé ag iarraidh foghlaim"* (I want to learn) and answers it with Chinese meaning *"I'll give learning a try."* Across the same course's other 53 lines, that same Irish phrase is answered "want" 50 times and "try" 3 times. The odd one out is the released sentence, and it is voiced. A five-sentence course cannot absorb six contradictions — but it is also five sentences, so this is a note rather than an emergency.

### The checks that came back clean

I want these on the record, because a clean result is worth as much as a finding.

**Duplicate known-side text — clean.** The methodology rail says one English prompt must map to exactly one Irish form. Comparing like with like at the teaching-tile level, Irish has 4 collisions in 786 distinct prompts (0.5%). Spanish has 4. Italian has 0. Welsh has 12. **Irish is normal, and better than Welsh.** (My first pass on this looked alarming until I noticed I was comparing Irish's full corpus against a Spanish query that had silently timed out and returned only part of its data. The alarming number was my bug, not Irish's.)

**Dialect leakage between the two Irish courses — clean, and measured.** Across all 7,586 items of the main course: 276 uses of *conas*, 530 of *cad*, 193 of *ábalta*, zero of the Connacht alternatives. Across the Connemara course: 39 *cén chaoi*, 40 *céard*, 36 *in ann*, zero Munster forms. **Neither course has leaked into the other.** (A first attempt at this returned false zeroes because the pattern-matching I used doesn't recognise accented Irish letters as word starts — I caught it and redid it.)

Worth flagging separately, though it is a decision rather than a defect: the main course is labelled *standard* Irish but its only word for "how" is *conas*, which is a Munster form. That is a consistent choice, not a mistake, but it is not what "standard" implies.

**Truncated or corrupt recordings — none reach a learner.** Zero recordings are missing their audio file, zero are under a third of a second, across all 25,722 Irish recordings. One genuinely cut-off recording does exist — a line of Colm's clipped to a third of its proper length — but it is orphaned, connected to nothing, and no learner can reach it. This detector is not asleep: run unchanged against the English-for-Sinhala course it found six *live* truncations, including one sentence cut to 1.4 seconds and another to 1.2. Six there, none reachable in Irish.

**Recordings left behind by a text edit — none.** Every one of the 24,067 connections between a written sentence and its recording was compared. Apart from the ten "gle" recordings, every recording matches the current text of the sentence it belongs to. For contrast, the same comparison on the English-for-Sinhala course immediately turned up a real one: a sentence edited from "the most interesting" to "the tastiest" whose recordings still say the old wording.

### Two honest gaps in the checking

**We cannot hear back what the Irish voices actually said.** The strongest possible test compares the words a voice really spoke against the words it was asked to speak. Only **1.8% of Irish-language recordings** carry the data needed to do that, and the separate verification column has been filled in on **17 of 25,308**. Before that reads as an Irish failure: Spanish is at the same 0.1%, and Welsh at 0%. This is an estate-wide blind spot, not an Irish one. But it means that for 98% of Irish audio we could check what was *ordered* and use recording length as physical corroboration — as with the ten "gle" clips — and nothing more. A recording that says something entirely unrelated to its own label would not be visible to us.

**We could not read the edit history.** The log of who changed what holds 3.9 million entries and is not organised in a way that can be searched by course; every attempt timed out, including one narrowed to a single entry. So the *current state* of every sentence and recording has been checked exhaustively, but the *history* of how they got that way is genuinely missing from this report.

---

## 4. Has anyone reviewed Irish?

**No. Not one person, anywhere in the live system.**

- Human review notes on Irish content: **0**
- Learner or tester feedback on Irish: **0** (out of 2,072 pieces of feedback across the estate)
- Audio quality flags on Irish: **0** (out of 48,868 across the estate)
- Round sign-offs on Irish: **0**

There are 43 quality flags against Irish, but every one is an automated capitalisation-and-punctuation warning raised by a script in February 2026 and closed by the same script minutes later — all 43 within the same twenty-minute window, all with identical wording, none with a name attached. No human hand touched them.

**The clearest single proof is the review tool itself.** The proofreading tool the team actually uses keeps a file for every course somebody has opened. There is exactly one file in it: Finnish. **No Irish course has ever been opened in it.** That is a direct negative, not an inference from silence.

The clearest signal is the sign-off column. Of the 668 sentences:

| Course | Sentences signed off |
|---|---|
| Spanish | 668 of 668 |
| Italian | 667 of 668 |
| Japanese | 667 of 668 |
| French | 666 of 668 |
| Korean | 297 of 668 |
| **Irish** | **0 of 668** |
| Welsh (north) | 0 of 668 |

Irish and northern Welsh are the only live or beta courses that have never had a content pass at all. That single number explains everything in section 3: the errors are the sort a native speaker spots in seconds, and no native speaker has looked.

### This has already been asked for — twice

Worth knowing before deciding anything: the team has been asking for a native Irish reader for months, in writing. A note from 14 August says plainly that Irish pod scripts should not be recorded *"until a native Irish speaker reads the 117 drafts"*, and that the author was *"explicitly not confident enough to rewrite Irish to native standard myself."* A separate note lists specific suspected errors — the Irish given for "pleased to meet you", the word used for sunscreen — and marks them unresolved, *"precisely the class of thing only a native ear settles."* A third proposes putting thirty translation pairs in front of a named native speaker. There is no follow-up anywhere recording an answer.

So the recommendation at the end of this document is not a new idea. **It is the team's own standing request, made twice, still unanswered.**

**Explicit gap — Basecamp.** Neither I nor the colleague I sent could reach Basecamp: no Basecamp tool was available in either session, and they checked the configuration directly to confirm it rather than assuming. **This is "we could not look", not "we looked and found nothing."** If Deborah or another reviewer has left findings on Irish, they are in Basecamp, they are invisible to every system I can see, and they have had no effect on the course. Someone with access should confirm this directly — it is the one question in this document I cannot close.

I also want to be clear about a second gap: my two detectors covered exactly two grammatical patterns — pronoun person and possessive person. Irish has hundreds. **The 21 defects are a floor, not a total.** The fact that a two-pattern search found 21 live errors in an afternoon is itself the most informative number in this document.

---

## 5. The one next thing

**Put a native Irish speaker in front of the first fifty sentences — the only complete, most-heard part of the course — and fix what they find, before building another line of Irish.**

*(Before that, there is a five-minute job that isn't really a decision: reconnect the ten "gle" sentences to their correct recordings, which already exist. It costs nothing, needs no new audio, and stops every learner hearing the language called "gle" in their first hour. I'd just do it — but because it touches a course that is live to learners, it goes through the standing content-change procedure rather than being edited in place, so it needs your nod rather than mine.)*

**Better:** those fifty sentences are where 100% of learners go and where the practice layer is 50-for-50 complete. Every defect fixed there is heard by everyone. Sentence 15 alone carries six wrong-person errors *and* one of the "gle" recordings. And a reviewer will find the classes no detector can — I proved that twice over: by finding eleven more errors by hand in a batch my own detector had passed as clean, and by the fact that four separate automated checks all walked straight past the loudest defect in the course, ten voices saying "gle", because every written record was perfectly correct.

**Simpler:** nothing needs to be built, generated, or migrated. It is reading 1,975 lines of existing Irish and marking the wrong ones. No new content, no new structure, no dependency on anything else.

**Cheaper:** the machine cost is nil for the review, and **under $5** to re-voice the entire first fifty sentences afterwards — I costed it at 245,000 characters across all three voices. The only real cost is a native speaker's time: roughly two days of reading. Compare that with filling the 117 practice gaps or extending past sentence 300, either of which is weeks of authoring on top of a foundation nobody has checked yet.

The argument against building more first is simple: **the course already generates its own errors systematically, we have no way of knowing how many, and for 98% of the audio we cannot even check what the voice actually said.** Extending an unreviewed course multiplies whatever is wrong with it. And this is the team's own request, made twice in writing and never answered — the decision here is not whether to do it, but whether to finally do it.

One thing that will make the reviewer's job easier, and that is worth knowing before commissioning: there is an older, native-authored Irish collection in the archive — 511 sentences with 13,455 practice lines, measured in a previous pass at 99% grammatically clean. Very little of it reached the live course. Matching it against the live course today: it covers only 30 of the 117 current practice gaps, but it covers **217 of the 368 sentences beyond 300, with 5,547 native-written practice lines already available**. So it is a poor patch for today's holes and an excellent foundation for the second half of the course later. Two cautions: it is a file rather than a live course, so its origins are unverified; and it uses the *other* dialect throughout — *céard* and *in ann* where the live course uses *cad* and *ábalta* — so it cannot simply be poured in.

---

---

*Method note. Four of us worked on this: I did the size and shape, and sent three colleagues at the audio, the defects and the review history. Every headline number above I re-measured myself against the live database before printing it — including the ten "gle" recordings, which I confirmed one by one, along with the correctly-worded twin waiting unused for each.*

*Every number in this document was counted from the live database on 20 August 2026, not read from a report. Where I used an older document I have said so and dated it. Where I was blocked I have said so plainly rather than filling the gap.*
