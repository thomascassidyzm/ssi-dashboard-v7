# Hear the damage — the 13 confirmed fra/deu defects, as they are right now

**These are the EXISTING clips, live in the courses tonight. Nothing has been re-rendered — the redo was dequeued. This is not a before/after: every player below is the broken clip a learner hears today.**

All 13 are worker #340's hand-confirmed genuine defects — the ones that survived reading every one of the 46 raw whisper flags by hand (33 were false positives). Confirmed rate: 4.4%, 13 in 294 sampled, against 0 in 119 in the repaired control.

Tap each player. The pattern is the same every time: it starts correctly and **stops early**.

---

## 1. fra — the negation is gone

**Intended:** *ils ne pourront pas* — "they will not be able to"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/931468C8-7B31-481A-846C-17CDFBE63769.mp3

**What's wrong:** the **pas** is missing — you hear *ne pourront* and stop. The negation is carried by *pas* in speech, so the learner hears the opposite meaning. 352 ms short. Voice xai_leo, rendered 2026-08-04. This is the worst one on the list for meaning.

---

## 2. fra — the conjunction is gone

**Intended:** *j'ai entendu dire que* — "I've heard that"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/1839E6AD-4593-40A4-B9A2-39820FE69EA0.mp3

**What's wrong:** the **que** is missing — it ends on *dire*, so the phrase can't hook onto what follows. 168 ms short. Voice xai_leo, 2026-08-03. This is a LEGO clip, so the learner meets the chunk wrong at its debut.

---

## 3. fra — the noun is gone

**Intended:** *trop de temps* — "too much time"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/3ECC46C1-FA8B-4EDA-A3FD-984820BF4A29.mp3

**What's wrong:** the **temps** is missing — you hear *trop de* and nothing after it. 480 ms short, 55% of the expected length. Voice xai_leo, 2026-08-03.

---

## 4. fra — everything after the auxiliary is gone

**Intended:** *j'ai hâte* — "I can't wait"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/684BD1A6-940F-4216-9416-07E9E8326DA9.mp3

**What's wrong:** the **hâte** is missing — you get *j'ai* and a cut. Two thirds of a two-word phrase. 288 ms short. Voice xai_leo, 2026-08-03.

---

## 5. deu — the worst in the sample

**Intended:** *es macht mir Spaß* — "I enjoy it"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/5CCA06C6-04E6-40EB-8FAC-776EC311D666.mp3

**What's wrong:** **mir Spaß** is missing — you hear *es macht* and it dies. Less than half the clip survives: 648 ms short, ratio 0.46, the lowest of all 13. Voice ara, 2026-03-12.

---

## 6. deu — the verb is gone

**Intended:** *sie will auch mit euch bleiben* — "she wants to stay with you too"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/02487033-F03A-4C89-9EE3-04672CF4FC9B.mp3

**What's wrong:** the **bleiben** is missing — German puts the verb last, so the clipped word is exactly the one that says what she wants to do. 576 ms short. Voice leo, 2026-07-15.

---

## 7. deu — the object is gone

**Intended:** *ich wollte eines von denen* — "I wanted one of those"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/B0319321-541E-427B-BAC5-DF35B6936BF7.mp3

**What's wrong:** **von denen** is missing — you hear *ich wollte eines* and it stops. 360 ms short. Voice leo, 2026-07-15.

---

## 8. deu — a 22-word line that stops one word early

**Intended:** *Sie hat mir gesagt, die Frage war einfach, aber ich dachte, sie war schwierig und ich konnte sie nicht verstehen*

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/4D387624-9497-4134-A2D4-7BCBA6D0AD8E.mp3

**What's wrong:** the **verstehen** is missing — it runs the whole long sentence correctly and then drops the final verb, ending on *…sie nicht*. 480 ms short. On a clip this long the ratio looks fine, which is exactly why it slipped through. Voice ara, 2026-02-15.

---

## The other five #340 confirmed — English/known side

## 9. eng — silence where a prompt should be

**Intended:** "are not"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/F1638532-F52B-4E6D-AE79-3F7DB2AD6145.mp3

**What's wrong:** near-silent. Whisper heard nothing at all. This is a different failure class from the tail clip — the prompt simply isn't there. Voice xai_eve, 2026-08-03.

---

## 10. eng — the modal loses its complement

**Intended:** "will be able to"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/90A77CCD-0C94-4486-A967-46B74C15B418.mp3

**What's wrong:** **able to** is missing — you hear *will be* and a cut. 504 ms short, just over half the clip. Voice eve, 2026-02-16.

---

## 11. eng — the verb is gone

**Intended:** "has just started"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/85F2FA78-BA10-4C92-9CF7-AB1CD155025D.mp3

**What's wrong:** the **started** is missing — *has just* and stop. 432 ms short. Voice xai_eve, 2026-03-12.

---

## 12. deu presentation — the frame never closes

**Intended:** "The German for: 'yellow', as in — 'with the yellow dress', is:"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/E9AA7A53-325C-4148-9E9B-F9FC7B68BB8A.mp3

**What's wrong:** **dress** and the closing **is:** are both missing — it ends on *with the yellow*, so the sentence never hands over to the German. 984 ms short, the largest absolute shortfall of the 13. Voice eve, 2026-08-03.

---

## 13. deu presentation — same shape

**Intended:** "The German for: 'his sister', as in — 'for his sister', is:"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/6EFD38AE-3C40-470C-8869-BD38DB768A20.mp3

**What's wrong:** **sister** and the closing **is:** are missing — it stops on *for his*. 624 ms short. Voice eve, 2026-08-03.

---

## What this is a sample of

These 13 came out of a 294-clip random sample of the 10,456 held course slots still pointing at pre-fix clips. The implied population is **~460 slots carrying a genuine defect** — 95% band 272–776. Not 10,000, and not the 1,621 the fra presentation slot was feared to hold; that slot came back clean.

The defects concentrate on the clips the learner is asked to *produce*: fra/deu `phrase.target1` and `phrase.target2` run 9–11%, roughly 2.4× the known side.

Every clip above was fetched from S3 and decoded before publishing — all 13 play, and every one measured at the short duration #340 reported.
