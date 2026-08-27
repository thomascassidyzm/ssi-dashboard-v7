# Is this really Aran? — the course-welcome candidates

**2026-08-27. Step 1 only.** These are candidate source clips. **No clone has been built from any of them, and none will be until you have listened and said yes.**

Both previous attempts are dead: the first source had Welsh in it, the second turned out to be TTS output wearing a `human_recording` label. So this page asks one question and nothing else — **is this Aran's actual voice?**

---

## The Welsh course welcome — the one you pointed at

**44.3 seconds.** `cym_n_for_eng` and `cym_s_for_eng` share a single recording, so this one file is the welcome for both Welsh courses:

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/aran-welcome/cym_n_for_eng-welcome.mp3

## Two more welcomes under a different voice id — same script, worth comparing

If these are the same person, that is corroboration. If one of them is obviously *not*, that is worth knowing before anything is built.

**German course welcome, 43.3s:**

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/aran-welcome/deu_for_eng-welcome.mp3

**Spanish course welcome, 45.8s:**

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/aran-welcome/spa_for_eng-welcome.mp3

---

## What I can tell you, and what I deliberately cannot

**The text is 100% English, all three, start to finish.** I read every word rather than trusting a description this time. The script is *"Welcome to this unusual game that will help you to become a Welsh speaker…"* through to *"So, let's start playing."* — the target language is named in English but never spoken. Whatever else is true, the Welsh-contamination problem that killed the first attempt does not exist here.

**The provenance field says `human`. I am not offering that as evidence, because I have just proved it worthless:** the `instruction` clips you correctly identified as clone output *also* carry `origin: 'human'`, all 1,178 of them. So that column records an intention, not a fact, and it cannot distinguish a real recording from a good clone. Anyone relying on it — including me, two attempts ago — will be wrong.

**And I am not going to tell you these sound human.** I cannot hear them. A level meter or a loudness statistic would not settle it either — AGC flattens exactly the dynamics that would betray a synthetic take, and a meter has no business vetoing audio. **That is why this page exists instead of another clone.**

**What is technically true, offered as context rather than proof:**

| | |
|---|---|
| Welsh welcome | 44.3s, 48 kHz mono, created 10 Jan |
| German welcome | 43.3s, 48 kHz mono, created 28 Jan |
| Spanish welcome | 45.8s, 48 kHz mono, created 28 Jan |
| Voice ids | `Aran` (Welsh), `human_Aran` (German, Spanish) |

The two Welsh entries are byte-identical — one file, two courses.

---

## What I need from you

1. **Is the Welsh welcome actually Aran, in his own voice?** That is the whole question.
2. If yes, **is it clean enough to clone from** — 44 seconds is far more than the ~10 the instant clone needs, so I can cut the best 15–25 seconds of it, or you can tell me which stretch to take.
3. If the German and Spanish welcomes are also him, they widen the choice. If they are not, say so — it tells us the `human_Aran` label is as unreliable as `human_recording` turned out to be.

**Nothing else happens until you answer.** No clone, no demo page, no spend.

---

## Why this went wrong twice, in one line each

- **Attempt 1** — built from a `presentation` clip: *"The Welsh for: 'to improve'… is:"*. English lead-in, Welsh payload. I believed a report calling it pure English and never read the clip's text.
- **Attempt 2** — built from an `instruction` clip. Text genuinely was pure English, and I checked it that time — but the audio was TTS, and I had no way to tell because I checked the words rather than the voice.

**The pattern in both: I verified the property I could measure and assumed the one I could not.** Hence a listening page, before anything is built.
