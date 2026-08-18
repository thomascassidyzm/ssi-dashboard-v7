# Bracket annotations — corrected report

**18 Aug 2026, revised.** I read Kai's 2026-08-17 working after shipping a first tranche. **It showed my first fix was wrong. I have reverted it.** This replaces my earlier report.

---

## 1. What I got wrong, and what I did about it

I stripped "I know **(a person)**" → "I know" in **ben_for_eng** (released), re-voiced it, and reported it done. My evidence was that the course only ever glosses চিনি (know-a-person) as "I know", and জানি (know-a-fact) always as something else.

**That evidence was drawn from legos only. The practice phrases say otherwise:**

| Phrase | Bengali | Sense |
|---|---|---|
| "I don't know" | আমি চিনি না | person |
| "I know more than yesterday" | আমি বেশি **জানি** | fact |
| "we don't know" | আমরা **জানি** না | fact |
| "I don't know when you'll be ready" | আমি **জানি** না… | fact |

Bare "know" already carries **both** senses across 336 phrases. So "I know" → চিনি would have left a learner unable to tell which verb to say — the exact defect Kai's procedure exists to prevent, introduced into a released course by me.

**Why I missed it:** my collision check grouped by identical stripped known_text and counted distinct targets. Yesterday's Sinhala plate had *already proved that method blind* — a string-identity ZUT sweep caught 1 trivial row and **none** of the three real ask/hear collisions, because colliding cards differ by surrounding context. I used the method its own precedent had disqualified.

**Reverted.** All five rows restored to their original text and original clips, verified live through the app. Nothing was deleted at any point, so the originals were there to go back to.

---

## 2. What is live and correct

**3 narration fixes in por_for_eng (released).** The lego was already clean; only the *voice* still announced a tag. Fixed by mirroring the lego's own text — the method the Greek case settled.

| Lego says | Voice used to say | Voice now says |
|---|---|---|
| "when did you start" | "The Portuguese for: '**when (for questions)**', is:" | "…'when did you start', is:" |
| "she was very kind" | "The Portuguese for: '**kind (about a woman)**', is:" | "…'she was very kind', is:" |
| "my keys" | "The Portuguese for: '**my (more than one)**', is:" | "…'my keys', is:" |

Hear them: [when did you start](https://ssi-learning-app.vercel.app/api/audio/998c676b-2955-4afe-98c2-1ada8a472e1f?f=.mp3) · [she was very kind](https://ssi-learning-app.vercel.app/api/audio/3c9a5223-b073-4d95-a27b-c26caf26cb9e?f=.mp3) · [my keys](https://ssi-learning-app.vercel.app/api/audio/507ef6de-dc44-4aac-823e-1a1442cef8bd?f=.mp3)

**Zero ZUT risk** — no authored text changed at all, so nothing can collide. Learner previously read one thing and heard another.

**Total spend: $0.007** (422 characters, 14 takes, 7 shipped, 4 of those now reverted). The $0.63 estimate was never approached.

---

## 3. The class I completely missed first time — narration

Kai's original objection was *"I don't like the english brackets in **narration**"*. My first report counted prompt clips and never counted narration at all.

- **2,873** narration clips reachable from a lego speak a bracket, across **47** courses.
- **232** of those sit on legos whose authored text is **already clean** — pure mirror fixes, no ZUT question, no merge question. This is the Greek pattern reproducing, and it is the safest work in the entire job.

What learners hear today: *"The Persian for: 'i'm ready **(1sg positive copula)**', is:"* · *"The Russian for: 'help **(prep)**', is:"* · *"The Icelandic for: 'the money **(accusative definite)**', is:"*

**A severity refinement.** TTS speaks brackets as plain words — "(a person)" is voiced "I know a person", which sounds fine. "(1sg positive copula)" does not. Severity tracks **what the tag says**, not whether a bracket is present. The 232 clean-lego narration rows and the grammar-jargon tags are the real damage; a readable gloss like "(a person)" is mostly a *screen* problem.

---

## 4. Where my brief was wrong

- **"Yesterday's Finnish parenthetical census produced findings" — it did not.** That worker stalled on the Supabase pool and returned two messages, no data. There is no Finnish census. (A *different* Finnish thread, the formal-register sweep, did land — different scope.)
- **My four "commission a native reviewer" questions were the wrong answer.** Kai ruled on 2026-08-17: *"We don't have a Sinhala speaker right now… You keep bringing this up with all languages. We don't expect you to be as good as a real human speaker and that's okay, you can still try!"* Attempt and label confidence; don't defer.
- **And he can't adjudicate these anyway** — fluent Finnish/Italian/Welsh/English only. Bengali, Korean and Portuguese need Deborah or full scaffolding, not a yes/no from him.
- **My "974 collisions" is a floor, not a count** — same blind method as above. The real number is higher and only a context-aware pass can find it.

---

## 5. Corrected estate picture

| | Earlier report | Live today |
|---|---|---|
| Known-side rows with a tag | ~1,356 | **6,804** |
| Rows whose clip speaks it | 1,619 | **4,706** |
| Genuinely audible | — | **3,688** |
| Narration clips speaking a tag | not counted | **2,873** |
| Clean-lego narration (zero-risk) | not counted | **232** |
| Collide on strip | 276 | **≥974** (floor) |

Reduction chain, not raw counts: 6,804 raw → 4,706 linked to a speaking clip → 3,688 audible (1,018 are `component` rows the app never plays, though still visible as tiles) → 1,422 further known-role clips are orphans linked to nothing.

**scan-course** does detect the class (Checks 1, 2, 10, and Check 10's warning about stripping revealing duplicates is right). Three gaps: it never joins `course_audio`, so it cannot see that a tag is *spoken*; Check 1 is legos-only, missing 2,783 phrase rows; and nothing runs it estate-wide.

---

## 6. What I recommend, one word each

1. **The 232 clean-lego narration fixes** — no text changes, no collisions, pure mirror. I'd do all of them next. → **Go?**
2. **ben "I know (a person)"** — needs route 2b: merge the animate object into the lego (the phrase corpus shows the person sense is signalled by a human object: "I don't know him", "I don't know many people"). I'll author it and label confidence rather than defer. → **Author?**
3. **kor_for_eng, 24 rows** — particle tags; English has no distinct word for case, so merging is the only route. Same treatment. → **Author?**
4. **por S0330 "(subj.)"** — the known side is *only* the tag; learner sees "(subj.)" and must say "seja". → **Author?**

---

## Gaps

- **Two earlier sub-workers (#24, #26) finished exit 0 but their reports were truncated on delivery and unretrievable via the API.** I redid their work myself. The adversarial refutation of my census never reached me — which is part of why the ben error survived to production.
- I have not re-checked the other 45 beta/draft courses with a context-aware method. Every collision figure here is a floor.
- The untaught-word checker's non-Latin misfire did not bite: every side I touched is English. It will bite fra_for_jpn, por_for_jpn, kor_for_hin.
