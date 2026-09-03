# Six courses that teach one form and drill the other — the proposal, for your review

**30 August 2026. PROPOSAL ONLY.** Nothing was applied. No course row was changed, no audio was made, no database write was issued. Everything below is a change waiting for your yes.

---

## In fifteen seconds

**707 drill lines are proposed for rewrite across five courses — 352 Egyptian Arabic, 180 English-for-German, 136 Portuguese, 39 Korean-for-English. 130 flagged lines are refused with a named reason, plus three Korean seeds and a class of ~20 by-design register pairs. One of the six courses cannot be fixed by rewriting drills at all, and that is the most important thing on this page.**

| | |
|---|---:|
| Courses in scope | **6** |
| Drill lines proposed for rewrite | **707** |
| Flagged lines refused, with a named reason | **130** |
| Courses your ruling fully decides | **4** |
| Courses it does not decide | **2** |

## Your ruling, and where it lands

> Fix these by making the **drills match the taught lego**. The teaching is authoritative; the drills bend to it, never the reverse.

That ruling decides four courses cleanly. In two it hits something it was not aimed at, and in both cases the honest answer was to stop and show you rather than to improvise:

- **Brazilian Portuguese** teaches the pronoun *explicit* and drills it *dropped*. Bending the drills to the lesson means **adding** `eu` to 78 drills — the exact opposite of the August survey's "standardise on dropped".
- **Korean for Hindi** has **no** lesson-versus-drill disagreement at all. Every drill already matches its own lesson. The two halves of the course disagree with *each other*. Your ruling does not reach it; the repair is lesson-level.

## Where the finding came from, and one honest gap

The source is `docs/optional-feature-consistency-2026-08-28.md` — a survey of 49 courses across a dozen optional features, run 28 August, which found 43 courses internally consistent and six not.

**That survey saved no per-row data.** Only a fragment of its classifier survives, as a gitignored scratch file. So **every row quoted in these documents was re-derived from the live database today**, not copied out of the survey. Where the numbers differ, both are shown and the difference is named. The survey's headline stands; its exact counts are not reproducible from what it left behind.

---

# The four one-off cases

## 1 & 2. Portuguese — European and Brazilian

**→ Full before/after for all 136 lines: https://watson-1.tail4968cb.ts.net/d/cb6002d7**

**54 rewrites in European Portuguese, 82 in Brazilian, 17 refusals, 84 rows out of scope.**

The two courses need opposite fixes. European teaches the pronoun dropped and drills it explicit — `eu`/`nós` come **out** of 54 drills. Brazilian teaches it explicit (`eu quero` at seed 1) and drills it dropped — `eu` goes **in** to 78 drills.

**Recommendation: follow the ruling and add them.** Explicit `eu` is ordinary everyday Brazilian register, so bending the drills to the lesson is also the better Portuguese. The survey was reading a course-wide majority; your ruling reads the taught lesson. If you would rather have the survey's answer, the honest route is changing 17 Brazilian *lesson labels* — a different and bigger job, and yours to call, not something to slide into a drills pass.

**Two corrections to the survey's story.** European is **not** one bad day: 2026-02-11 is 40 of 59 rows, the rest spread over four days in June and July, so re-touching February alone leaves a third of it behind. Brazilian's cluster is **2026-03-12/13**, not the 2026-07-15 batch the survey named — 11 of the 12 July rows are among the refusals.

**Ten of the rewrites close live ZUT breaks**, converging on the form already in the course. No rewrite creates a new one; the single row that would have was refused and flagged.

**Parked for you:** the one Brazilian first-person-plural row sits on the 53/47 coin-flip the survey left open — it should follow your policy, not anyone's ear.

## 3. Korean for English speakers

**→ Full before/after: https://watson-1.tail4968cb.ts.net/d/9da3723c**

**39 drill lines across 8 lessons — not the 3 the survey reported.**

The survey undercounted because its two biggest cases are invisible to a keyword scan: the lesson *and* its drills both carry an honorific, just different ones. `S0644L03` teaches `말해 주실` and drills `말씀해` across 9 lines; `S0650L02` teaches `가고 싶으세요` and drills `가시고 싶으세요` across 9 more. The honorific pocket also runs to seed 668, not 653.

Applied against a full-course ZUT recheck the 39 lines **resolve 4 collision groups and introduce 1** — and that one is diagnostic rather than a cost: it only appears because lesson `S0643L02` is labelled `do you want? (honorific)`, a parenthetical doing the disambiguation work. That is a no-parentheses violation and the known side is the real defect there. Flagged, not patched.

**Three seeds refused** (660, 661, 667): the drills already match their own lessons and the contradiction is between two lessons *inside one seed*. Your ruling does not reach those either — someone has to pick which half is right.

## 4. Korean for Hindi speakers — the one the ruling does not decide

**→ Detail, same document: https://watson-1.tail4968cb.ts.net/d/9da3723c**

**All 89 drills in the pocket already match their lessons. The repair is 11 lessons plus 89 drills.**

The survey's causal story is also wrong, and the truth is worse for the "one bad day" frame: seeds 630–668 were written in **one 23-minute run on 29 July, 03:07–03:19**. Seeds 640–641 and 656–668, written in the same minutes, are plain 해요체. The formal 합쇼체 is confined to exactly the fourteen "sir/madam" seeds. It is a topic pocket rendered in the wrong register, not a batch boundary.

The realignment introduces 0 new ZUT breaks and resolves 1 existing hard one. `kor_for_eng` and `kor_for_tam` agree line-for-line at every one of those seeds, and `kor_for_hin` is the outlier at every row.

**Wants your eye before anyone applies it:** three of the eleven lessons become copies of lessons taught 400+ seeds earlier once normalised — `모르겠어요`, `것 같아요`, `괜찮으세요`. That is how the drift got in: the author invented a new Hindi known string to license a formal variant of a form the course already taught. **Normalise and leave redundant, or replace with new content — your call.**

---

# The two course-wide passes

## 5. Egyptian Arabic — how large the pass really is

**→ Full before/after for all 352 lines: https://watson-1.tail4968cb.ts.net/d/7b129cd9**

**352 drill lines. Not 425.** The survey said 425 of 2,296 pairs; my re-derivation found 394 of 2,205; reading them one by one brings the true drill-level drift to **352, with 42 refusals**.

**35 of the refusals are a defect in the check, not the course.** This course has 42 legos that teach the pronoun deliberately — `I want = أنا عايز` at seed 1, `I'm trying to = أنا بحاول`, `she was = هي كانت`. Those 35 drills open with one of those chunks verbatim: they are correctly tiling an earlier lesson. Deleting the pronoun would break the tiling *and* split that lego's known string across two targets — a real ZUT break. The detector cannot see it because it only ever compares a drill against the one lego it hangs off. **An automated sweep would have run straight through this class.**

Six more refusals are language: completely verbless sentences (`هي مشغولة كتير`) where the pronoun is the only thing naming the subject, and dropping it flips the reading to *I* or *we*.

**Verified: the 352 edits introduce 0 new ZUT collisions** across every known string in the course. Three pre-existing collisions are untouched and unrelated.

**Lebanese forms: none** in these 394 rows. The August survey's flag about Lebanese `إنو`/`بتحكي` inside the Egyptian course **stays open** — nobody looked outside these rows, and this says nothing about the rest of the course.

**Not touched, and yours to decide:** after all 352 edits the course still teaches `أنا عايز` for *I want* at seed 1 and drops the pronoun for near-identical intentions from seed 45 on. That is lesson-versus-lesson drift — a larger question than the one you ruled on. Seed 246 has the same shape inside a single seed.

## 6. English for German speakers — how large the pass really is

**→ Full before/after for all 180 lines: https://watson-1.tail4968cb.ts.net/d/6f900824**

**180 rewrites, 71 refusals — out of 251 candidate lines, and the scope needs one word from you.**

Three scopes exist, and the difference between them is not cosmetic:

| Scope | Lines | What it means |
|---|---:|---|
| Strict | **3** | The drill's *own* taught lego is contracted and the drill spells it out |
| Recommended | **180** | The course teaches that contraction as a lego somewhere; the drill's own lesson does not teach the long form |
| Everything the regex flagged | 410 | Includes 71 refusals and ~140 lines nothing teaches either way |

On the strictest reading of your ruling this pass is **three lines**. The recommended 180 is the wider reading — and it is the one that matches what the survey actually found, which was a *habit*, scattered through the same days, not a lesson-versus-drill contradiction.

**The 71 refusals are why this was not run mechanically.** "Have to" as an obligation modal, 33 lines — *"I've to go"* is not English. Possessive and experiential *have*, 25 lines — *"I've a car"* likewise. Simple-past *had*, 10 lines — *"I'd a good weekend"* is not idiomatic the way *"I'd known"* is. Contracting everything the regex found would have broken grammar in about a quarter of the flagged lines.

---

# A seventh repair, verified today

Not one of the six broken courses — these six are internally consistent — but a real, cheap fix the survey spotted and it would be a waste to lose it.

**"I will" written out long at seeds 465 and 490, in six English-target courses, all dated 17–21 July** — a later authoring pass than the original build, against each course's own contracted majority everywhere else.

| Course | Lesson | Taught text | Drills under it |
|---|---|---|---:|
| eng_for_hin | S0465L02 | "I will ask" | 9, all long |
| eng_for_hin | S0490L02 | "I will" | 9, all long |
| eng_for_pan | S0465L02 | "I will ask" | 11, all long |
| eng_for_sin | S0490L02 | "then I will never trust" | 5, all long |
| eng_for_guj | S0465L01 | "I will ask her what her name is" | 10, all long |
| eng_for_mar | S0465L02 | "I will ask" | 10, all long |
| eng_for_mar | S0490L04 | "I will" | 12, all long |
| eng_for_tel | S0465L01 | "I will ask her what her name is" | 8, all long |
| eng_for_tel | S0490L02 | "I will never ever trust" | 7, all long |

**9 lessons, 81 drills, every drill agreeing with its own lesson.** So this is *not* a drills-bend job either: it is a lesson relabel, with the 81 drills following behind. Same shape as Korean-for-Hindi, one twentieth of the size.

---

# What needs you

1. **English for German — which scope?** 3 lines (strict) or 180 (recommended). One word.
2. **Brazilian Portuguese — confirm the direction.** Add `eu` to 78 drills per your ruling, or change 17 lesson labels instead per the survey. My recommendation is the first.
3. **Korean for Hindi — the three redundant lessons.** Normalise and leave them redundant, or replace with new content.
4. **Brazilian first-person plural** — the 53/47 coin-flip the survey left open for you. One row here depends on it.
5. **Two lesson-versus-lesson questions raised but deliberately untouched**: Egyptian Arabic seed 1 vs seed 45 (`أنا عايز` then bare), and Korean seeds 660/661/667.

## What was not done, said plainly

- **Nothing was applied.** No writes, no audio, no merge, no deploy.
- **The Lebanese-forms question in Egyptian Arabic is still open** — checked only inside the 394 flagged rows, found none, and the rest of the course was not examined.
- **The survey's per-row data does not exist**; every figure here is a fresh derivation and differs from the survey's in four of the six courses. Those differences are named, not smoothed.
- **The honorific detector handed to the Korean pass was wrong** (it fires on `마시고`, the stem of "to drink") and its numbers were discarded rather than repaired.
