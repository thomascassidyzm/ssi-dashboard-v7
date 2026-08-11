# T-14, rebuilt — the Casting & Approval gate

**11 Aug 2026.** You rejected T-14 for two reasons. Both were real, both were the page's fault,
and a third one was hiding behind them that mattered more than either.

**Page:** https://popty.app/admin/configs/pods → pick a course → **Casting & approval**

---

## The counts you asked for

Welsh pod-0 holds **232 sentences**, on both courses. Not ~140.

| Pod | Lines | Target audio | Known audio |
|---|---|---|---|
| `cym_n_for_eng:pod-0` | **0** | 0 | 0 |
| `cym_n_for_eng:pod-0-unrecorded` | **232** | 87 (all Aran) | 23 |
| `cym_s_for_eng:pod-0` | **0** | 0 | 0 |
| `cym_s_for_eng:pod-0-unrecorded` | **232** | 0 | 0 |
| `spa_for_eng:pod-0` | 142 | 142 | 133 |
| `spa_for_eng:pod-0-unrecorded` | **232** | 119 | 83 |

The `pod-0` rows are the gated placeholders from 6 Aug — deliberately emptied so no learner sees an
unrecorded pod. Aran's work lives in `pod-0-unrecorded`.

---

## Reason 1 — stale source. Fixed.

The page had `<course>:pod-0` hard-coded. So Spanish was sampled off the **142-line snapshot** taken
before Aran's authoring pass — your "~140" — and Welsh showed **nothing at all**, because its pod-0
was emptied when the pod was gated.

It now resolves the pod that actually holds the current content, and **says on screen which pod it is
and which one it is not**:

> Sampling `spa_for_eng:pod-0-unrecorded` — **232** live lines. Not: `spa_for_eng:pod-0` (142 lines).

---

## Reason 2 — one voice. Fixed.

The old sampler only guaranteed *coverage*: one clip per voice, each from a different scene. Ten
clips off ten scenes never let an ear judge a two-hander.

The sample now **leads with an exchange** — consecutive lines of the pod where the cast puts two
different voices against each other, anchored at the voice change so you never get a window off the
front of a monologue. Coverage isn't sacrificed: slots are held back for every voice the exchange
doesn't reach, so two characters talking can't crowd out the rest of the cast.

Same function phase-8 uses to truncate a sample render, so what you hear and what a sample run
generates stay one decision.

---

## The third thing, which was worse

Verifying against the live database turned up this: **only 16 of the 119 Spanish target clips were
rendered on the two-voice cast at all.** The other 103 are five *other* voices — `yis75yfp`, `eve`,
`ekhwx401`, `ara`, `jupvcf34` — from June.

And the page took each clip's voice *label* from the casting, not from the clip. So a June clip
rendered by `yis75yfp` was shown to you as **"Pablo"**. The "two-voice exchange" could have been two
clips of the same retired voice wearing two different names.

Approving a casting on that evidence approves nothing — which is the exact failure the sample-first
gate exists to prevent.

Every clip now carries the voice off its own audio row. The sample draws **only** from clips the cast
under approval actually rendered, the ratio is stated in words, and everything else stays playable in
a collapsed list labelled with the voice that really rendered it.

---

## Listen — Spanish, the two-voice cast

This is the page's actual sample, not a hand-picked one. Sixteen clips qualify; these are the top of
the list. **Maria** is the female voice, **Pablo** the male one.

**The exchange — the two voices against each other**

**1 · Neighbour — Pablo**
"I'm very well, thank you. Are you going to work?" — Muy bien, gracias. ¿Vas al trabajo?

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/BBE83CE1-2BF1-49FB-8179-D1D0F0AC0106.mp3

**2 · Sarah — Maria**
"Yes, I've got a busy day today. I hope you have a good day. See you later." — Sí, tengo un día ocupado hoy. Espero que tengas un buen día. Hasta luego.

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/83166586-3345-49BE-B35E-B7FAF859EB15.mp3

**Then the voices the exchange didn't reach**

**3 · Sarah, English side — Olivia**
"Good morning. How are you?"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/82C91907-1BA3-4094-8F8C-55673F9515D6.mp3

**4 · Sarah — Maria**
"How far is it into town?" — ¿A qué distancia está el centro?

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/A6E933A7-A467-4F5E-B1F8-896D1F39F908.mp3

**5 · Passenger — Pablo**
"It's not very far. Maybe three or four miles." — No está muy lejos. Quizás tres o cuatro millas.

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/BEAE3398-BD32-46CD-897E-26F5D798956B.mp3

**6 · Sarah — Maria**
"Do you have any snacks?" — ¿Tienen algo para picar?

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/DC68731F-09D9-455D-BA9E-0C61A21C13CF.mp3

**7 · Sarah — Maria** *(the line straight after, same voice — that is the point)*
"Do you have crisps, or nuts, or anything?" — ¿Tienen patatas fritas, o frutos secos, o algo así?

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/062CF971-52E2-4415-B586-A28E1879341D.mp3

All seven fetch live from S3 (verified with ranged GETs, 19 KB–63 KB).

**The one question: does that sound like two real people having this conversation?**

---

## Welsh — an explicit gap, not a delivery

**I cannot give you two-voice Welsh samples today, and I am not going to fake one.** Three separate
blocks, all of them upstream of the page:

1. **The Welsh cast names five voices, not two.** `HUMAN_M1`, `HUMAN_M2`, `HUMAN_F1`, `HUMAN_F2`,
   `HUMAN_F3` across the pod's 26 speakers. That breaks Aran's two-hander rule on its face, and the
   page now flags it in words.
2. **Those five names match no recording that exists.** All 110 Welsh clips are Aran's own voice
   (`human_aran_cym_n`, `human_aran_cym_n_2`). So *nothing* on the pod was rendered on the casting
   you'd be approving — the page says exactly that rather than playing you Aran's clips under five
   invented names.
3. **There is no second Welsh voice and no Welsh TTS.** Catrin has recorded nothing on either course,
   and `cym` isn't in the pod voice pool at all — every Welsh clip in the estate is human. So a
   two-voice Welsh sample can't be synthesised even as a stopgap, and shouldn't be: these pods are
   meant to be human-recorded.

`cym_s_for_eng` has 232 proofread lines and **zero** audio of any kind.

I did not recast Welsh to two voices. Aran has 87 clips already recorded against the current
speaker-to-person mapping, and changing who reads whom is his call and yours, not a repair.

---

## Nothing was rendered

No TTS was run. No clip was created, deleted, or relinked. Everything above is read-only against the
live database plus the page rebuild.

The **Generate a sample** button on the page is hard-wired to `sample_limit=10` and scoped to the one
pod on screen — the cap lives on the server, where omitting that parameter is what turns the same
endpoint into a bulk run. It refuses outright on a human-cast pod. Bulk still can't run until you
approve.

---

## What needs you

**A. Spanish — approve or reject the two-voice cast.** Listen to the seven above, or hit the page.
That's the decision the gate is waiting on.

**B. Welsh — who reads it?** The cast says five people. Aran's rule says two, and only Aran has
recorded. Either the cast collapses to two humans (Aran + Catrin) before he records another line, or
the five-slot plan is deliberate and the rule doesn't apply to pod-0. One sentence either way and
I'll apply it.

**C. Spanish, one to know about.** 103 of the 119 clips on the current Spanish pod are on retired
voices. Approving the cast doesn't fix those — it unlocks the run that would. Worth knowing the size
of the job before you press it.
