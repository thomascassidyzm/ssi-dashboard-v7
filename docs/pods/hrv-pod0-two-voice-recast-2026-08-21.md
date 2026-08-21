# Croatian pod — the two-voice recast, and the lines Aran needs to sign off

**21 Aug 2026.** Tom's ruling applied to `hrv_for_eng:pod-0-unrecorded`: **exactly two voices**, so a human-recorded course can be made by two people. **Voice A (male, Srećko / Tom)** is the learner/protagonist thread across the whole pod. **Voice B (female, Gabrijela / Olivia)** is every other character.

**The live pod is untouched.** `hrv_for_eng:pod-0` is still 142 rows / 142 target clips / 142 known clips, its most recent row was last written on **14 July**, and all 284 of its clips were probed and are alive. Nothing in this pass reached it.

**Everything below is on the pilot.** Branch `docs/hrv-pod0-two-voice-2026-08-21`. No switchover has been run, in any mode.

---

## 1. The 16 text edits — PROPOSED, not canon

**These need Aran's personal sign-off, line by line, before they are treated as canon.** They are written to the pilot pod so the audio could be rendered and heard as one coherent thing, and every row carries a `two_voice_pending_signoff` marker in the database naming him as the signatory. Reverting any line is the `old` column below.

Scope was kept to Tom's rule: a line was touched **only** where it explicitly genders a character against the two-voice cast. No style, no register, no naturalness, no orthography, no currency. Every edit changes gender-agreement tokens and nothing else — that is enforced mechanically by the tool, which refuses any edit that changes the shape of a line.

**All 16 are Croatian (`target_text`) only. No English was changed** — see §3 for the one English line the rule does touch and why it was left for him.

| slot | speaker | voice | tokens | old | new |
|---|---|---|---|---|---|
| SC03-S002 | Sarah | A-male | Željela bih -> Želio bih | Dobar dan. Željela bih kavu, molim. S mlijekom, ali bez šećera. Za van. | Dobar dan. Želio bih kavu, molim. S mlijekom, ali bez šećera. Za van. |
| SC04-S003 | Friend | B-female | zauzet -> zauzeta | Ne, žao mi je,… sutra sam zauzet. Ali razgovarajmo… u subotu. Vidimo se tada. | Ne, žao mi je,… sutra sam zauzeta. Ali razgovarajmo… u subotu. Vidimo se tada. |
| SC05-S001 | Neighbour (10:30 pm) | B-female | imala -> imao | Dobra večer, Sarah. Jesi li imala dug dan? | Dobra večer, Sarah. Jesi li imao dug dan? |
| SC05-S002 | Sarah | A-male | umorna -> umoran | Da, jako. Sad sam jako umorna. Laku noć. Vidimo se sutra. | Da, jako. Sad sam jako umoran. Laku noć. Vidimo se sutra. |
| SC07-S004 | Customer 1 | A-male | Željela -> Želio | Željela bih veliku, molim. Sa zobenim mlijekom, ako imate. | Želio bih veliku, molim. Sa zobenim mlijekom, ako imate. |
| SC08-S002 | Customer 1 | A-male | Željela -> Želio | Željela bih pintu, molim. Koja piva imate točena? | Želio bih pintu, molim. Koja piva imate točena? |
| SC08-S004 | Customer 1 | A-male | Željela -> Želio | Željela bih pintu gorkog piva, molim. | Želio bih pintu gorkog piva, molim. |
| SC08-S008 | Customer 3 | A-male | Željela -> Želio | Željela bih veliku… čašu bijelog vina,… molim. | Želio bih veliku… čašu bijelog vina,… molim. |
| SC08-S010 | Customer 2 | A-male | Željela -> Želio | Željela bih… još dvije čaše piva. | Želio bih… još dvije čaše piva. |
| SC08-S012 | Customer 1 | A-male | sigurna -> siguran; gladna -> gladan | Nisam sigurna… jesam li gladna. Imate li jelovnik? | Nisam siguran… jesam li gladan. Imate li jelovnik? |
| SC08-S015 | Customer 2 | A-male | Željela -> Želio | Imate li sendviče? Željela bih sendvič… sa sirom, molim. | Imate li sendviče? Želio bih sendvič… sa sirom, molim. |
| SC20-S006 | Learner | A-male | pomogao -> pomogla | Hvala ti što si mi pomogao. | Hvala ti što si mi pomogla. |
| SC20-S009 | Learner | A-male | ljubazan -> ljubazna | Jako si ljubazan. | Jako si ljubazna. |
| SC20-S010 | Learner | A-male | ljubazan -> ljubazna | Hvala ti što si tako ljubazan. | Hvala ti što si tako ljubazna. |
| SC22-S001 | Learner | A-male | imao -> imala | Bi li imao nešto protiv da pokušam vježbati hrvatski s tobom? Ne učim jako dugo, i još uvijek se osjećam malo nervozno kad govorim s drugim ljudima. | Bi li imala nešto protiv da pokušam vježbati hrvatski s tobom? Ne učim jako dugo, i još uvijek se osjećam malo nervozno kad govorim s drugim ljudima. |
| SC22-S006 | Friend | B-female | Impresioniran -> Impresionirana | Mislim… da se odlično snalaziš. Impresioniran sam. Mislim… da si spreman početi… govoriti hrvatski… s bilo kim… tko govori hrvatski. | Mislim… da se odlično snalaziš. Impresionirana sam. Mislim… da si spreman početi… govoriti hrvatski… s bilo kim… tko govori hrvatski. |

**How these were found and checked.** Four independent readers swept the pod in shards (jobs #826-#829), each given the cast map and the scope rule and nothing else. A fifth, separate reader (#831) was then asked to *refute* all 16 — checking whether the new Croatian is correct, whether the edit was necessary at all, and whether anything beyond a gender token had moved. **16 of 16 CONFIRMED, none amended, none rejected, and no missed lines found.** It independently rejected the same look-alikes the sweep had left alone: `zauzet` agreeing with `dan` (SC01-S004), `bila` with `boca` (SC09-S013), `pekla` with `janjetina` (SC09-S008), `topla` with `voda` (SC17-S008), `izgubio`/`izgubila` with `sin`/`kćer` (SC18-S009/010). Those are noun agreement, not speaker gender, and are correct as they stand.

Three of them are worth calling out because they are the reverse direction from the rest — the gendered word describes the person being **spoken to**, not the speaker:

- **SC05-S001** — the Neighbour asks the protagonist `Jesi li imala dug dan?`. The protagonist is male now, so it is `imao`.
- **SC20-S006/009/010** — the male Learner thanks his interlocutor: `si mi pomogao` → `pomogla`, `si ljubazan` → `ljubazna`. Every interlocutor is female under the rule.
- **SC22-S001** — `Bi li imao nešto protiv…` is addressed to the Friend, who is now female: `imala`.

And scene 22, the one Tom named: the Friend was masculine in Aran's recorded text (`Impresioniran sam`), which is why the flagship conversation was two men on one voice. **One word — `Impresionirana` — makes her female and the scene two-voiced.** The Learner's own text was not touched; `spreman` and `samopouzdan`, which the Friend says *about* him, are correct as they are.

---

## 2. What is now two-voice-consistent

Every character in the pod, both tracks:

| | Voice A · male · Srećko (hr) / Tom (en) | Voice B · female · Gabrijela (hr) / Olivia (en) |
|---|---|---|
| **who** | Sarah (sc 1-5), James (6), Customer 1/2/3 (7-9), Customer (10, 12), Guest (11), Tourist (13), Passenger (14), Learner (15-22) | Neighbour, Fellow passenger (sc 2), Barista, Friend (4 and 22), Anna, Bartender, Waiter, Assistant, Receptionist, Pharmacist, Local, Driver, Narrator |
| **lines** | 150 | 81 |

**19 of the 24 character slots moved.** The previous pass had cast for *contrast within a scene*, which gave two voices per scene but not one protagonist: the learner's own seat changed voice nine times across the pod — female as Sarah, as Customer 1/2/3 and as the Tourist, male as the Learner, the Customer, the Guest, James and the Passenger. It is now one voice from scene 1 to scene 22.

**The known (English) track was the worse half, and it is fixed too.** The Learner's 79 English lines were on Olivia while the Learner's Croatian was Srećko — one character, two genders, depending which language you were hearing. Both tracks now follow the same rule, which is what makes the pod recordable by two people rather than two-and-a-bit.

**One relabel was needed.** Casting resolves per speaker key, and `Passenger` was doing two opposite jobs: in scene 2 the stranger Sarah asks about the seat (a counterpart), in scene 14 the protagonist taking the taxi. One key cannot be both voices. Scene 2's speaker is now `Fellow passenger`; scene 14 keeps `Passenger`. Speaker labels are never spoken and are not part of the known text, so learner progress is unaffected — but it *is* a change to the speaker column of the canonical English, so it belongs on the sign-off list alongside the rest.

---

## 3. The one thing left open — and it is Aran's call, not a model's

**The protagonist is called Sarah, out loud, twice, and is now a male voice.**

- `SC01-S001` — Neighbour: *"Good morning, Sarah!"* / `Dobro jutro, Sarah!`
- `SC05-S001` — Neighbour: *"Good evening, Sarah."* / `Dobra večer, Sarah.`

That is an explicit gendering in conflict with the two-voice rule, so by Tom's own scope rule it is in scope. **It was not changed**, for two reasons. It is a change to Aran's canonical **English**, which propagates to every other language pair built from this pod. And the progress matcher keys on the English text, so editing those two lines drops their learner state — a real cost, small but not zero.

**My recommendation: drop the name rather than replace it.** *"Good morning!"* and *"Good evening. Did you have a long day?"* — four lines total, two English and two Croatian. That removes a gendering instead of inventing a new male name for a character Aran field-tested, it costs fewer words, and it leaves the protagonist's seat unnamed, which is the seat the learner is meant to sit in. The rest of the pod already works that way: the only other spoken names are James and Anna in scene 6, who are two strangers introducing themselves, and the booking names Davies and Jones.

The alternative is to rename her to a male name, which is a bigger change to his text and needs him to choose the name.

**Until he rules, scenes 1 and 5 have a female neighbour greeting a male voice by a female name.** You can hear exactly that in the first sample below — it is the clearest possible statement of the question.

---

## 4. Audio — re-rendered and verified

**239 clips were re-rendered** (89 Croatian, 150 English) — every clip whose voice changed under the new cast, plus the four whose Croatian words changed but whose voice did not (`SC20-S006/009/010`, `SC22-S001`). Those four are the quiet failure mode this pass had to catch: right voice, correct-looking row, clip still saying the old word. Cost was **$0.17**. Nothing failed.

Then **all 462 clips in the pod were verified**, both tracks, and the check was deliberately written to test the *rule* rather than the stored cast — it re-derives the expected voice from Tom's ruling, so a mis-cast character would fail even if every other part of the system agreed with it:

| check | result |
|---|---|
| clips checked | **462 / 462** |
| on the voice the two-voice rule requires | **462** — 150 + 150 Voice A, 81 + 81 Voice B |
| reachable on S3, plausible duration | **462** |
| clip words match the row's current words | **462** |
| veracity failures on any stored clip | **0** |
| **FAILURES** | **0** |

Three punctuation-only differences are logged as notes, not failures: the renderer normalises a hyphen to an em-dash (`SC09-S005`, `SC12-S001`), and one reused clip says *"That's very kind of you!"* where the row has a full stop (`SC20-S008`). Same words spoken.

**No clip was deleted at any point.** `course_audio` was asserted unchanged across the pointer sweep — 2,565,901 rows before and after. Superseded clips were unlinked, never removed, and every old id is in the applied log.

---

## 5. Record only — this pod is becoming POD 1, and that name is already taken

Tom mentioned the new pod is to become **POD 1**, replacing the old pod-0 naming. **Nothing has been renamed** — no file, no branch, no table, no course identifier. Recorded here so whoever writes the switchover plan uses POD 1 as the target name.

**But they need to know this first: `hrv_for_eng:pod-1` already exists, and it is a different pod.** It holds **180 lines across 13 scenes** with 180 clips, its content is a social-conversation pod (Laura and Mark on a wet Monday, not the First Day), and — confusingly — its title in the database still reads *"Croatian Listening Pods — Pod 0"*. It is also **the only `:pod-1` slug in the entire estate**; the other 107 pods are `pod-0`, `pod-0-unrecorded` or one-offs.

So "make this one POD 1" is not a rename, it is a collision. The switchover plan has to say what happens to the existing `hrv_for_eng:pod-1` before it can say what the new one is called. Flagging it, not resolving it.

---

## 6. Listen — scenes 1, 3 and 22

Scene 1 is where the open question in §3 is audible. Scene 3 is the protagonist ordering coffee as a man for the first time. Scene 22 is the flagship conversation that was two men and is now two voices.


**Neighbour (8 am)** · Gabrijela (Voice B · female)

> Good morning, Sarah!

**Dobro jutro, Sarah!**

https://ssi-audio-stage.s3.amazonaws.com/mastered/4ED22655-A154-488B-85A6-C49202E5DBE2.mp3

**Sarah** · Srećko (Voice A · male)

> Good morning. How are you?

**Dobro jutro. Kako si?**

https://ssi-audio-stage.s3.amazonaws.com/mastered/C04DB2EA-AB2E-4FF4-B80C-61C9C3A7A121.mp3

**Neighbour** · Gabrijela (Voice B · female)

> I'm very well, thank you. Are you going to work?

**Odlično sam, hvala. Ideš na posao?**

https://ssi-audio-stage.s3.amazonaws.com/mastered/B6118097-D1F3-42E7-87F6-BC449DBA38AE.mp3

**Sarah** · Srećko (Voice A · male)

> Yes, I've got a busy day today. I hope you have a good day. See you later.

**Da,… imam zauzet dan danas. Nadam se… da ćeš imati lijep dan. Vidimo se kasnije.**

https://ssi-audio-stage.s3.amazonaws.com/mastered/164E9E34-D7A7-47EE-A16C-57122F45B517.mp3

**Barista (3 pm)** · Gabrijela (Voice B · female)

> Good afternoon. What can I get you?

**Dobar dan. Što biste željeli?**

https://ssi-audio-stage.s3.amazonaws.com/mastered/683F9158-3FAD-4829-B0CD-F848BDA2AF98.mp3

**Sarah** · Srećko (Voice A · male)

> Good afternoon. I'd like a coffee, please. With milk but with no sugar. To take away.

**Dobar dan. Želio bih kavu, molim. S mlijekom, ali bez šećera. Za van.**

https://ssi-audio-stage.s3.amazonaws.com/mastered/B27FCFA1-0DF7-4657-A8F1-5BF43B5E5736.mp3

**Sarah** · Srećko (Voice A · male)

> Do you have any food?

**Imate li hrane?**

https://ssi-audio-stage.s3.amazonaws.com/mastered/C6BD7DF3-B73D-4E7C-A5F9-D1F9660F6CD7.mp3

**Sarah** · Srećko (Voice A · male)

> Do you have any snacks?

**Imate li grickalica?**

https://ssi-audio-stage.s3.amazonaws.com/mastered/09A35CEA-F1BC-4F4C-A77C-33B7F9BD41B1.mp3

**Sarah** · Srećko (Voice A · male)

> Do you have crisps, or nuts, or anything?

**Imate li čipsa, ili oraščića, ili nešto slično?**

https://ssi-audio-stage.s3.amazonaws.com/mastered/D103FF98-555B-41A1-9BED-D3C77AC710F1.mp3

**Barista** · Gabrijela (Voice B · female)

> No, we've only got drinks.

**Ne, imamo samo pića.**

https://ssi-audio-stage.s3.amazonaws.com/mastered/EA8962F9-4C04-4C6F-AC15-93C99C032B31.mp3

**Barista** · Gabrijela (Voice B · female)

> Yes, would you like the menu?

**Da, želite li jelovnik?**

https://ssi-audio-stage.s3.amazonaws.com/mastered/73BFFD01-B7CB-43F9-A682-C62A8B3AAEE7.mp3

**Sarah** · Srećko (Voice A · male)

> Yes, please.

**Da, molim.**

https://ssi-audio-stage.s3.amazonaws.com/mastered/DA49851C-61A5-462F-B08C-438B963FCA39.mp3

**Barista** · Gabrijela (Voice B · female)

> Here's your coffee.

**Izvolite vašu kavu.**

https://ssi-audio-stage.s3.amazonaws.com/mastered/443470B3-05D7-4FB2-9589-FF4FFD63B37E.mp3

**Sarah** · Srećko (Voice A · male)

> Thank you very much. Goodbye.

**Hvala vam puno. Doviđenja.**

https://ssi-audio-stage.s3.amazonaws.com/mastered/8026A381-E5EF-4721-A798-74FF73424AB6.mp3

**Learner** · Srećko (Voice A · male)

> Would you mind if I tried to practise speaking Croatian with you? I haven't been learning for very long, and I still feel a little nervous about speaking with other people.

**Bi li imala nešto protiv da pokušam vježbati hrvatski s tobom? Ne učim jako dugo, i još uvijek se osjećam malo nervozno kad govorim s drugim ljudima.**

https://ssi-audio-stage.s3.amazonaws.com/mastered/C0760E93-6AB8-495B-BD4D-630A0667BF5A.mp3

**Friend** · Gabrijela (Voice B · female)

> Of course, no problem. You seem to speak it very well. I can understand you easily.

**Naravno, nema problema. Čini se da to govoriš… jako dobro. Lako te razumijem.**

https://ssi-audio-stage.s3.amazonaws.com/mastered/C1D9234A-4304-4D04-ABF0-88BACD9AE880.mp3

**Learner** · Srećko (Voice A · male)

> Thank you, that's good to know. I need to learn more words, and I need to practise listening. I don't understand people very well when they don't speak slowly.

**Hvala, dobro je to znati. Moram naučiti… više riječi… i moram vježbati… slušanje. Ne razumijem ljude… jako dobro… kada ne govore… polako.**

https://ssi-audio-stage.s3.amazonaws.com/mastered/EF54FF66-767F-4CEE-AC0F-FA2B977C723D.mp3

**Friend** · Gabrijela (Voice B · female)

> Am I speaking slowly enough for you now?

**Govorim li ti dovoljno… polako sada?**

https://ssi-audio-stage.s3.amazonaws.com/mastered/51CF604D-4179-4E01-96F3-8216B7209CA6.mp3

**Learner** · Srećko (Voice A · male)

> Yes, thank you. It's easier talking to just one person. It's a bit difficult thinking of something to say, though. I'm not sure what to say, but I feel as if I can speak enough to start having conversations.

**Da, hvala. Lakše je razgovarati… samo s jednom osobom. Malo je teško smisliti… što reći, ipak. Nisam siguran… što da kažem,… ali osjećam… kao da mogu… govoriti dovoljno… da počnem… imati razgovore.**

https://ssi-audio-stage.s3.amazonaws.com/mastered/79C969FB-E49D-4359-B9CA-B5D9346351F6.mp3

**Friend** · Gabrijela (Voice B · female)

> I think you're doing very well. I'm impressed. I think you're ready to start speaking Croatian to anyone who speaks Croatian.

**Mislim… da se odlično snalaziš. Impresionirana sam. Mislim… da si spreman početi… govoriti hrvatski… s bilo kim… tko govori hrvatski.**

https://ssi-audio-stage.s3.amazonaws.com/mastered/203AE3AC-3494-4ED0-BAAF-6B9EEDD7683E.mp3

**Learner** · Srećko (Voice A · male)

> It's just a little frustrating when I can't think quickly enough to express myself properly. But I know that I need to keep practising if I want to speak more confidently.

**Malo je frustrirajuće… kad ne mogu dovoljno… brzo razmišljati… da bih se… ispravno izrazio. Ali znam… da moram… nastaviti vježbati… ako želim govoriti… samopouzdanije.**

https://ssi-audio-stage.s3.amazonaws.com/mastered/F30C27F8-C2C6-4C98-939C-638A88690C9E.mp3

**Friend** · Gabrijela (Voice B · female)

> You should be confident already. I think you're doing much better than you realise. I feel comfortable speaking with you, and I'm not talking very slowly.

**Trebao bi već biti… samopouzdan. Mislim da se snalaziš… puno bolje… nego što misliš. Osjećam se ugodno… razgovarajući s… tobom,… i ne govorim… jako polako.**

https://ssi-audio-stage.s3.amazonaws.com/mastered/7A420702-5700-4680-98BD-D8E1E32892AF.mp3

**Learner** · Srećko (Voice A · male)

> This is exactly the kind of practice I need. I think I can feel it changing my brain while we're talking! I really appreciate your help. But it's surprising how tired I get when I'm talking in a language I don't speak very well.

**Ovo je točno… onakva vrsta vježbe… kakva mi je potrebna. Mislim… da to mogu osjetiti… kako mijenja moj mozak… dok razgovaramo! Stvarno cijenim… tvoju pomoć. Ali iznenađujuće… je kako se umorim… kad govorim na jeziku… koji ne govorim… jako dobro.**

https://ssi-audio-stage.s3.amazonaws.com/mastered/D70ACDD7-5AEF-4363-889E-923A5741A2C6.mp3

**Friend** · Gabrijela (Voice B · female)

> I think that's normal. Learning a new language is difficult. But it's so much fun when you start to have conversations, isn't it?

**Mislim da je to normalno. Učenje novog jezika… je teško. Ali toliko… je zabavno… kad počneš… imati razgovore… zar ne?**

https://ssi-audio-stage.s3.amazonaws.com/mastered/55B5C00A-2037-4052-AE86-D9E15DDE606F.mp3

**Learner** · Srećko (Voice A · male)

> It really is. I'm really happy that I can have this much of a conversation. And I hope we'll be able to have more conversations in the future as I keep on getting better.

**Stvarno jest. Stvarno sam sretan… što mogu imati… ovoliko razgovora. I nadam se… da ćemo moći imati… više razgovora… u budućnosti… dok nastavim… napredovati.**

https://ssi-audio-stage.s3.amazonaws.com/mastered/2364E972-41AD-401E-B827-066C34C06025.mp3

