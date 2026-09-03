# Tom's own xAI clone, through the real production chain — 12 lines

Rendered 2026-08-27. Voice `gfzdpspr5fdp` ("Tom001", created 2026-05-01) — **your existing clone**, not a stand-in preset. Every clip went out through the live path: `services/tts-service` → xAI `/v1/tts` → phase8 `masterAudio`. Nothing was written to the database and no course audio was touched.

Lines are real SSi content, drawn from the phase-1 benchmark set (`tools/tts-bakeoff/data/utterances-eng.json`), one per difficulty category. Total 300 characters, cost a fraction of a cent.

Tap each to play. If the players do not render on your phone, the same twelve are on one page here: https://watson-1.tail4968cb.ts.net/evidence/tom-xai-clone-sample-2026-08-27/index.html

---

**1. hard_pronunciation** — "I like over there"

https://watson-1.tail4968cb.ts.net/evidence/tom-xai-clone-sample-2026-08-27/clips/01-eng-0001.mp3

**2. minimal_pair** — "known"

https://watson-1.tail4968cb.ts.net/evidence/tom-xai-clone-sample-2026-08-27/clips/02-eng-0015.mp3

**3. proper_noun** — "I live in London"

https://watson-1.tail4968cb.ts.net/evidence/tom-xai-clone-sample-2026-08-27/clips/03-eng-0025.mp3

**4. numbers** — "11 o'clock"

https://watson-1.tail4968cb.ts.net/evidence/tom-xai-clone-sample-2026-08-27/clips/04-eng-0033.mp3

**5. question** — "what would you like today?"

https://watson-1.tail4968cb.ts.net/evidence/tom-xai-clone-sample-2026-08-27/clips/05-eng-0041.mp3

**6. isolated_word** — "tonight"

https://watson-1.tail4968cb.ts.net/evidence/tom-xai-clone-sample-2026-08-27/clips/06-eng-0051.mp3

**7. very_short_lego** — "to stop"

https://watson-1.tail4968cb.ts.net/evidence/tom-xai-clone-sample-2026-08-27/clips/07-eng-0063.mp3

**8. medium_chunk** — "because people who speak English"

https://watson-1.tail4968cb.ts.net/evidence/tom-xai-clone-sample-2026-08-27/clips/08-eng-0075.mp3

**9. full_sentence** — "I'm not going to be able to remember the whole sentence"

https://watson-1.tail4968cb.ts.net/evidence/tom-xai-clone-sample-2026-08-27/clips/09-eng-0087.mp3

**10. repeat_probe** — "I'd like to believe that you can't guess"

https://watson-1.tail4968cb.ts.net/evidence/tom-xai-clone-sample-2026-08-27/clips/10-eng-0099.mp3

**11. hard_pronunciation** — "he fought in Italy at about six o'clock"

https://watson-1.tail4968cb.ts.net/evidence/tom-xai-clone-sample-2026-08-27/clips/11-eng-0002.mp3

**12. hard_pronunciation** — "we don't know the number of students they take"

https://watson-1.tail4968cb.ts.net/evidence/tom-xai-clone-sample-2026-08-27/clips/12-eng-0003.mp3

---

**What to listen for:** whether this is a voice you would put in front of a learner as-is, and whether it is good enough to be the *source* for a clone in another vendor's model. Nine of the twelve tripped the mastering chain's tail-flag heuristic — that flag is suspect-only by standing ruling and no clip was altered, but if you hear a click or a rise at the end of a clip, that is what it was pointing at.
