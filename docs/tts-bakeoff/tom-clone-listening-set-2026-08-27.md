# Your clone, at length — the listening set

**2026-08-27.** Fifteen clips off your instant clone `tom_001`, in the register the course actually uses: two long passages, teaching lines with questions and pauses, short drill lines, three back-to-back takes of the *same* line, and the English-with-Spanish-embedded mix that is the real production case.

**All raw model output.** No mastering, no post-chain, no cherry-picking — the first take of everything is what you get, in the order generated. Speed pinned to 1.0 and locale sent explicitly, which are the two settings the measurements said should be defaults.

**The words are yours.** Passages D and G from your own recording pack, so this is your prose in your voice — and deliberately **not** Passage A, two sentences of which are inside the clone's training audio. Hearing back its own training text would prove nothing.

---

## 1. Long form — the 33-second read

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/listening/01-long-passage.mp3

## 2. Long form — the closing

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/listening/02-long-closing.mp3

---

## 3. Questions — first run

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/listening/03-questions-a.mp3

## 4. Questions — second run

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/listening/04-questions-b.mp3

**Listen for the question contour.** Four questions in a row is where a TTS voice usually gives itself away — same rising shape stamped on all of them, regardless of whether the question is a genuine one or a rhetorical prompt.

---

## 5. Teaching line — instruction

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/listening/05-teaching-line.mp3

## 6. Teaching line — with a prompt and a pause

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/listening/06-teaching-pause.mp3

## 7. Teaching line — a correction

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/listening/07-teaching-correct.mp3

**This is the register that matters most**, because it is the bulk of what a learner hears. Instruction has to sound like someone addressing *you*, not someone reading aloud.

---

## 8. Short drill lines — run A

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/listening/08-short-run-a.mp3

## 9. Short drill lines — run B

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/listening/09-short-run-b.mp3

---

## 10–12. The consistency question, put directly

Three takes of **the same four words** — *"Now without looking."* — nothing changed between them. Play them straight through:

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/listening/10-repeat-take-1.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/listening/11-repeat-take-2.mp3

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/listening/12-repeat-take-3.mp3

Measured, speech only: **0.90s / 0.77s / 0.90s** — a 17% spread, at the mild end of what the determinism run found. This is the question the numbers cannot answer: three takes that differ *measurably* may be entirely fine to a learner, or may be the thing that makes a course feel unstable. **Your ear is the instrument here, not my table.**

---

## 13–15. The real course mix — English instruction with Spanish inside it

This is the case the course actually lives in, and it is the one with a known trap: a clip carries **one** locale, so whichever language you pin, the other one is being read with the wrong phonology.

**Same sentence, pinned to English (`en-GB`) — how we would ship it today:**

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/listening/13-mix-english-locale.mp3

**The identical sentence, pinned to Spanish (`es-ES`):**

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/listening/14-mix-spanish-locale.mp3

**A longer one, English-pinned:**

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/listening/15-mix-longer.mp3

**Listen to 13 and 14 back to back — this is a real decision hiding in a small clip.** Under `en-GB`, *quiero hablar* gets English vowels; under `es-ES`, the English instruction around it gets Spanish ones. This is the same failure the estate already hit on xAI in the Italian pilot on 2026-07-10, where `'auto'` made *"come stai"* come out English. Neither setting is right for a mixed line — the honest options are to pin English and accept softened Spanish, or to split mixed lines into two clips at generation time, which costs machinery. Worth knowing before it is baked in, not after.

---

## What this cost, and what happens next

Fifteen clips, about 2,000 credits out of 1.25 million. Nothing at volume; this is the sample the policy asks for.

**If your ear says yes**, the wiring is already specified and being built — Cartesia as the provider for new audio only, on your forward-only ruling. **If your ear says nearly**, the answer is a Pro clone, which learns your pacing rather than guessing it from six seconds; the archive is being searched right now for whether 30 minutes of your existing recorded English already exists, in which case that costs you no studio time at all.

**If your ear says no anywhere in particular, say where** — a specific "this clip, this bit" is worth more than a general verdict, because it tells us whether the problem is the clone, the settings, or the length.
