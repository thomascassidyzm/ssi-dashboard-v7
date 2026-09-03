# Spanish Pod 0 — the two-voice cast, by speaker

Eight new clips, cast under your ruling: **two voices, by speaker**. Maria is the female voice, Pablo the male one. Nobody changes voice mid-thought.

These are all lines the course has never voiced before — you are judging new material, not re-judging old clips.

**The one question: does this sound like two real people having this conversation?**

---

## The coffee shop — Sarah and the barista

Sarah asks two questions in a row, and the barista answers twice in a row. This is the bit strict alternation would have got wrong: under alternation Sarah's two questions would have come out in two different voices.

**1 · Sarah — Maria** *(first of two in a row)*
"Do you have any snacks?" — ¿Tienen algo para picar?

https://ssi-audio-stage.s3.amazonaws.com/mastered/DC68731F-09D9-455D-BA9E-0C61A21C13CF.mp3

**2 · Sarah — Maria** *(second in a row — same voice, and that is the point)*
"Do you have crisps, or nuts, or anything?" — ¿Tienen patatas fritas, o frutos secos, o algo así?

https://ssi-audio-stage.s3.amazonaws.com/mastered/062CF971-52E2-4415-B586-A28E1879341D.mp3

**3 · Barista — Pablo** *(the other voice answers)*
"No, we've only got drinks." — No, solo tenemos bebidas.

https://ssi-audio-stage.s3.amazonaws.com/mastered/02781EA3-30FE-4604-9C6F-1A2C5D1533A7.mp3

**4 · Barista — Pablo** *(second in a row — same voice again)*
"Yes, would you like the menu?" — Sí, ¿quiere la carta?

https://ssi-audio-stage.s3.amazonaws.com/mastered/03B210C8-5211-4029-9A45-0B8DCF5C1639.mp3

**5 · Sarah — Maria**
"Yes, please." — Sí, por favor.

https://ssi-audio-stage.s3.amazonaws.com/mastered/17283133-6702-4800-8FBE-A5D0506167A0.mp3

**6 · Barista — Pablo**
"Here's your coffee." — Aquí tiene su café.

https://ssi-audio-stage.s3.amazonaws.com/mastered/854BD0DC-71C7-4B7D-A994-390A386F135B.mp3

---

## End of the day — the neighbour and Sarah

A clean two-hander, one line each, so you can hear the two voices against each other with nothing else going on.

**7 · Neighbour — Pablo**
"Good evening, Sarah. Did you have a long day?" — Buenas noches, Sarah. ¿Has tenido un día largo?

https://ssi-audio-stage.s3.amazonaws.com/mastered/CBB1819A-D69D-494B-A394-A4DFB98E86FE.mp3

**8 · Sarah — Maria**
"Yes, very. I'm very tired now. Good night. See you tomorrow." — Sí, muy largo. Estoy muy cansada ahora. Buenas noches. Hasta mañana.

https://ssi-audio-stage.s3.amazonaws.com/mastered/9476A39C-7750-4845-8260-BE2B1060AB87.mp3

---

## What you are listening for

Sarah is Maria every time she opens her mouth. The barista is Pablo every time. Clips 1–2 and 3–4 are the consecutive-lines case: same speaker, same voice, no flip. That is the whole difference your ruling made.

## What this cost, and what it did not touch

* **Eight clips generated.** Nothing else. The sample gate held — it truncated a 121-clip queue down to 8, and the run logged `SAMPLE mode`.
* **Nothing learner-facing was touched.** These went into `spa_for_eng:pod-0-unrecorded`, the working copy. The live Spanish pod is untouched.
* **No existing audio was deleted or unlinked.** All eight lines had no audio at all before this.
* It ran on its own service instance, so your hand-regeneration from popty.app and the overnight French and German runs were never in contention.

## One thing worth knowing before the fleet rollout

Casting by speaker alone was not enough. Speakers were being put on the two voices by a guess at their name's gender, which had put Tourist *and* Local, Customer *and* Assistant, Customer *and* Pharmacist, Passenger *and* Driver all on the same male voice — six scenes where one voice talked to itself. The fix deals the two voices across the actual conversation instead, and the "answers himself" count on the Spanish pod drops from 71 to 11.

The cost is that four characters are now voiced against their apparent gender — the barista is Pablo, the tourist and the driver are Maria. That is the trade your hard restriction buys, and it is the trade Aran's Stephen Fry point says is worth making. If your ear says otherwise on the clips above, that is the thing to tell us.
