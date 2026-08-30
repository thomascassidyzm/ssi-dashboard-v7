# Aran — a clone of your English voice, built from your own welcome

*2026-08-27. Third build, and the first one made from a recording confirmed by ear to be genuinely you.*

## Aran: this is a demo, and it is yours to refuse.

We built a voice clone from a recording you already made, to see whether it is good enough to carry English instruction. **Nothing will be published or used in any course in your voice unless you say yes.** If you would rather we did not, that is the end of it — no explanation needed, and no reason asked for.

No new recording was made and nothing was asked of you.

**Welsh does not come into it at all.** Cartesia cannot do Welsh, and Welsh stays human-recorded by standing rule. This is only about English.

---

## The recording it was built from

Your **course welcome** — the "welcome to this unusual game" script. It is continuous spoken English from start to finish: the target language is named in English but never spoken, so there is nothing in it but your English.

Nineteen seconds were taken out of the middle of it, cut at natural pauses on both sides, and nothing else was done to it:

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/aran-clone-003/source-excerpt.mp3

That is the whole of the input. Everything below was generated from those nineteen seconds.

## The clone, saying things you have never said

A longer passage:

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/aran-clone-003/passage.mp3

A teaching line:

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/aran-clone-003/teaching.mp3

Questions:

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/aran-clone-003/questions.mp3

The same short drill line, asked for three separate times:

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/aran-clone-003/drill1.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/aran-clone-003/drill2.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/aran-clone-003/drill3.mp3

---

## What you should listen for, honestly

Two things worth saying plainly rather than leaving you to find them.

**It wanders on short phrases.** Ask for the same two or three words twice and they can come back at noticeably different speeds — measured across 59 test phrases at around a quarter difference typically, and up to double on the very shortest lines. Longer passages are much steadier. The three drill clips above are the same request three times over, which is where you would hear it. On this build the spread is small — under a tenth of a second between the fastest and slowest take — but it is the thing that would bite in real drill work, so it is named rather than hidden.

**This is an instant clone from nineteen seconds.** There is a longer-trained version, built from thirty minutes or more, that would almost certainly hold steadier — and there is well over an hour of your English already sitting in the archive if that were ever wanted. Nothing has been trained. That would be a separate conversation and a separate yes from you.

## The three answers that would help

1. **Yes / no / not yet** — on using a clone of your English voice at all.
2. If yes: **is this one good enough**, or does it need the longer-trained version?
3. Anything specific that sounds wrong — "this clip, this bit" beats a general impression.

---

## The build, for the record

- **New clone: `aran_english_003`** — `33890587-a29f-4416-ba61-2615c74f92fe`, instant clone, similarity mode, no enhancement.
- **Source**: `cym_n_for_eng` welcome, 44.3s, byte-identical with the `cym_s_for_eng` welcome — one recording, both Welsh courses. Cut **5.30s → 24.15s**, 18.85 seconds, both edges landing inside pauses of roughly half a second, with twenty-millisecond fades so no click survives at the joins. Mono, 44.1 kHz. Nothing else touched.
- **German and Spanish welcomes not used.** They were confirmed available as widening material and were not needed — the Welsh cut cloned cleanly on its own. They stay on the shelf if a rebuild ever wants more.
- **`aran_english_001` and `aran_english_002` are both deleted** and neither name nor id has been reused. The Cartesia library holds exactly two owned voices now: this one and `tom_001`.
- **Why this source is different from the last two failures**: the earlier attempts trusted a metadata field that turned out to record an intention rather than a fact. This clip was listened to by Tom personally, along with the German and Spanish welcomes under the same label, and confirmed as genuine human recordings of Aran before anything was built.

**Nothing has been sent to Aran.** That is Tom's call and Tom's send.
