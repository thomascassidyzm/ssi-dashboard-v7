# Extra phrases, scenes 15–21 — proposed speaker per line

*2026-08-24. PROPOSAL ONLY. Nothing applied: no DB write, no `content_audit_log` entry, no
cast change, no audio. The paused Italian render (b8ea5db0 / #360) has not been touched and
stays paused.*

---

## Read this first — one premise needs correcting, and it changes the size of the job

The brief says the canonical source has **no** speaker attribution for scenes 15–21 and that
the import defaulted everything to `Learner`. That isn't what the data shows:

- `canonical_pod_scenarios` (`pod_slug='pod-0'`), scenes 15–21: **80 rows, zero NULL
  speakers.** Every line carries an explicit `Learner`, and the drill tails an explicit
  `Narrator`.
- The markdown it was seeded from (`docs/pods/pod0-english-canonical.md`) writes `Learner` out
  in the table for every one of those lines.
- Commit `8dd662493` (2026-08-06) shows those labels were **set deliberately, not defaulted**:
  it moved 11 lines in scenes 16/17/21 *from* an inferred alternating `Friend` *to* `Learner`,
  under Aran's chunk ruling.

So it isn't "unattributed → attributed". It's a live product decision to overrule a prior
ruling — which is entirely yours to make, and the canonical itself licenses it: *"If a future
pass does want a second voice here, that is a free choice, not something the data dictates."*
I've done the full sense-based assignment you asked for on that basis.

**And the headline consequence:** applying conversational sense to all 80 lines lands on
**exactly the 11 lines job 60d19bc1 already changed** — same scenes, same sentence numbers,
same lines, no more and no fewer. That work is already in the DB on all 22 courses. There is
no second batch of replies hiding in these scenes.

---

## Scope in one paragraph

Of 80 lines in scenes 15–21 (73 phrase lines + 7 `Narrator` drill tails, untouched):

| Scene | Canon label | Phrase lines | Proposed non-Learner | Already applied by 60d19bc1 | Net new work |
|---|---|---|---|---|---|
| 15 | 9 · Extra phrases | 10 | **0** | 0 | none |
| 16 | 10 · Extra phrases | 10 | **1** | 1 | none |
| 17 | 11 · Extra phrases | 10 | **4** | 4 | none |
| 18 | 12 · Extra phrases | 10 | **0** | 0 | none |
| 19 | 13 · Extra phrases | 10 | **0** | 0 | none |
| 20 | 14 · Extra phrases | 10 | **0** | 0 | none |
| 21 | 15 · Extra phrases | 13 | **6** | 6 | none |
| **Total** | | **73** | **11** | **11** | **zero rows to change** |

**Scenes 18 and 19 — the ones you were looking at in the viewer — contain no reply lines at
all.** Every line is first-person learner production: *"Do you have any orange juice?"*, *"I
promise I won't be late."*, *"I'd like two scoops of ice-cream, please."* There is no second
party to give them to. Those two scenes will still be ten consecutive Learner lines after any
sense-based pass, because that is what the content is. Same for 15 and 20.

The one thing genuinely still open is the **label split** on the 11 — see the last section.

---

## The full proposed assignment, all 80 lines

`L` = Learner (voice A). `S` = Staff, `I` = Interlocutor (both already cast to **voice B** on
all 22 courses — audibly identical, see below). `N` = Narrator, untouched. **⚠** = the call is
not obvious and I want your eyes on it. **★** = differs from what is live today.

### Scene 15 (canon label 9) — no changes

| # | Now | Proposed | Text | Note |
|---|---|---|---|---|
| 1 | L | **L** | How much is that? | |
| 2 | L | **L** | Can you tell me how much that is? | politeness variant of 1 |
| 3 | L | **L** | How much does it cost to get a taxi into town? | |
| 4 | L | **L** | How much does it cost to get a bus into town? | |
| 5 | L | **L** | Where can we get a bus? | |
| 6 | L | **L** | Where can we get a taxi? | |
| 7 | L | **L** | Four single tickets to town, please. | learner buying |
| 8 | L | **L** | Two return tickets to town, please. | |
| 9 | L | **L** | I prefer to try to speak your language, I think it's polite. | |
| 10 | L | **L** | I'm sorry I can't speak very quickly. | |
| 11 | N | **N** | 100,000. 60. 70. 1 o'clock. 11 o'clock. | drill tail |

Pure learner run. No answer is ever given to any of the questions, so there is no exchange to
build.

### Scene 16 (canon label 10) — 1 non-Learner

| # | Now | Proposed | Text | Note |
|---|---|---|---|---|
| 1 | L | **L** | But if you can speak slowly I think we'll be able to manage. | |
| 2 | L | **L** | You spoke a little too quickly, so I'm not sure if I understood. | |
| 3 | L | **L** | Can we try again? | |
| 4 | L | **L** | Can we see the menu? | |
| 5 | L | **L** | Can we see the dessert menu also? | |
| 6 | L | **L** | Do you have anything to eat? | |
| 7 | L | **L** | Can we pay? | |
| 8 | L | **L** | Can we pay by card? | sets up 9 |
| 9 | S | **S** | No, we only take cash. | only the till can say this; answers 8 |
| 10 | L | **L** | I'm sorry, I don't have any cash. | learner's reply to 9 — the exchange closes |
| 11 | N | **N** | A million. 80. 90. 2 o'clock. 10 o'clock. | drill tail |

Lines 8→9→10 form a genuine three-turn exchange once 9 is on voice B.

### Scene 17 (canon label 11) — 4 non-Learner

| # | Now | Proposed | Text | Note |
|---|---|---|---|---|
| 1 | L | **L** | Is there a cash machine near here? | |
| 2 | S | **S** | Do you want to pay by cash or card or put it on the room? | hotel desk; "the room" is staff-side |
| 3 | L | **L** | Can we put it on the room, please? | answers 2 |
| 4 | S | **S** | Would you like to pay by cash or card or on the room? | politeness variant of 2 |
| 5 | S | **S** | Did you want to pay by cash or card? | softer variant of 2 |
| 6 | L | **L** | We'll pay by card again, please. | answers 4/5 |
| 7 | L | **L** | It's hot today, again. | small talk, learner-side |
| 8 | L | **L** | Is the water warm? | |
| 9 | I | **I** | No, it's a little cold today. | answers 8 |
| 10 | L | **L** ⚠ | It's not bad. | **ambiguous — see below** |
| 11 | N | **N** | 3 o'clock. 9 o'clock. January. February. | drill tail |

### Scene 18 (canon label 12) — no changes

| # | Now | Proposed | Text | Note |
|---|---|---|---|---|
| 1 | L | **L** | That's a bad idea. | learner opinion; nothing precedes it to answer |
| 2 | L | **L** | Do you have any orange juice? | |
| 3 | L | **L** | Do you have any apple juice? | |
| 4 | L | **L** | Does the boat leave from here? | |
| 5 | L | **L** | Does the bus leave from here? | |
| 6 | L | **L** | Where does the bus leave from? | |
| 7 | L | **L** | Is that correct? Am I correct? | |
| 8 | L | **L** | Am I wrong about that? | |
| 9 | L | **L** | I'm sorry, my son lost his ticket. | |
| 10 | L | **L** | We have paid, but my daughter has lost her ticket. | |
| 11 | N | **N** | 4 o'clock. 8 o'clock. March. April. | drill tail |

Ten questions and statements, no answers written for any of them. Nothing here can move.

### Scene 19 (canon label 13) — no changes

| # | Now | Proposed | Text | Note |
|---|---|---|---|---|
| 1 | L | **L** | That makes me happy. | |
| 2 | L | **L** | That makes me feel a little worried. | |
| 3 | L | **L** | When you talk quickly, it makes me feel stupid. | |
| 4 | L | **L** | Is it okay if I sit here? | |
| 5 | L | **L** | Is it okay if we put this here? | |
| 6 | L | **L** | I don't want to be late. | |
| 7 | L | **L** | Are we going to be late? | |
| 8 | L | **L** | I promise I won't be late. | |
| 9 | L | **L** | I promise we won't be late. | |
| 10 | L | **L** | I'd like two scoops of ice-cream, please. | |
| 11 | N | **N** | 5 o'clock. 7 o'clock. May. June. | drill tail |

Every line is first-person learner. There is no second-party line in this scene.

### Scene 20 (canon label 14) — no changes

| # | Now | Proposed | Text | Note |
|---|---|---|---|---|
| 1 | L | **L** | Can I have one scoop of chocolate and one of strawberry? | |
| 2 | L | **L** | And then another cone with one scoop of lemon and one of blueberry. | |
| 3 | L | **L** | Do you have any ice-cream? | |
| 4 | L | **L** | Thank you for all your work. | |
| 5 | L | **L** | I wish you good luck with everything. | |
| 6 | L | **L** | Thank you for helping me. | |
| 7 | L | **L** ⚠ | Good luck with that! | **ambiguous — see below** |
| 8 | L | **L** | That's very kind of you. | |
| 9 | L | **L** | You're very kind. | |
| 10 | L | **L** | Thank you for being so friendly. | |
| 11 | N | **N** | 6 o'clock. July. August. September. | drill tail |

### Scene 21 (canon label 15) — 6 non-Learner

| # | Now | Proposed | Text | Note |
|---|---|---|---|---|
| 1 | L | **L** | It sounds as though we need to leave soon. | |
| 2 | L | **L** | It sounds as though you want us not to do that. | |
| 3 | L | **L** | Is there a toilet here? | sets up 5/6 |
| 4 | L | **L** | Can you tell me where the toilet is? | politeness variant of 3 |
| 5 | I | **I** | It's down there on the left. | answers 3/4 |
| 6 | I | **I** | It's down there on the right. | variant answer |
| 7 | L | **L** | Can you say that again? | learner repair move |
| 8 | I | **I** | Yes, I said it's over there. | answers 7 — "I said" only works from the other side |
| 9 | L | **L** | What is that? | |
| 10 | L | **L** | What is that over there? | |
| 11 | I | **S** ★ | Would you like to order some drinks? | waiter, not a passer-by — see label note |
| 12 | I | **S** ★ | Do you want to order some drinks first? | variant |
| 13 | I | **S** ★ | Did you want something to drink first? | variant |
| 14 | N | **N** | October. November. December. | drill tail |

---

## Two lines I want your eyes on specifically

**1. Scene 17 line 10 — "It's not bad."**
It follows *"Is the water warm?" → "No, it's a little cold today."* It reads either way: the
learner conceding (*"It's not bad."* — carry on swimming), or the other person softening their
own answer. I've kept it **Learner**, which makes the run a clean three-turn Q/A/rejoinder. If
you hear it as the local still talking, it becomes the 12th line and goes to voice B.

**2. Scene 20 line 7 — "Good luck with that!"**
It sits in a run of learner thank-yous (*"Thank you for helping me"*, *"That's very kind of
you"*), which argues Learner. But it's also the natural thing the shopkeeper says back. I've
kept it **Learner** for run consistency. If you want it as the reply, it becomes the 12th line.

Neither is a defect either way — both are defensible, and I'd rather you decided than I
guessed.

---

## The label question — the only genuinely new thing in this proposal

There is **one second voice**, not two. `Staff` and `Interlocutor` are both cast to voice B on
all 22 courses (Italian: Enzo / Tom), as is `Narrator`. **So the Staff-vs-Interlocutor split is
cosmetic — it changes nothing a learner hears.**

Today all six of scene 21's replies are `Interlocutor`, including lines 11–13, which are a
waiter offering drinks — service lines, so `Staff` by sense. Proposing the ★ change for
label honesty only.

**My recommendation: don't make it.** It's three rows × 22 courses = 66 writes, one more
`content_audit_log` batch, and zero audible difference. If you want the labels tidy, the
cheaper moment is whenever those rows are next touched for a real reason. Say the word either
way — it's a one-line answer.

---

## What happens after you skim this (planned, not done)

**If you approve as-is (recommended): there is nothing to apply.** The 11 lines are already
correct in the DB on all 22 courses. The blocker on the Italian render clears the moment you
say the attribution is right, and #360 renders 22 clips for the 11 rows — paying once,
correctly.

**If you take either ⚠ line, or the ★ label change:** one gated script, `content_audit_log` as
the mechanism per 60d19bc1's pattern, DRY_RUN first, per-row before-state assertions, one
assignment mapped across all 22 courses (the English canonical is shared), then re-verify and
reconcile counts exactly before #360 resumes.

**On the learner-progress question you asked me to confirm — the reasoning holds, and the
"unattributed → attributed" worry doesn't apply here.** Two reasons:

1. It's moot on the facts: nothing in scenes 15–21 is unattributed. All 80 rows already carry
   an explicit speaker.
2. It wouldn't matter even if they were. `pod-migration-protocol.md` defines a surviving
   sentence by **text**, folded for ellipsis/quotes/dashes/whitespace/case, at the
   corresponding scene within 8 sentence positions. `speaker` is not in that definition, and
   the change touches no `scene_number`, no `sentence_number`, no `known_text`, no
   `target_text`, and no slot. Every row is a content match at distance 0, so every learner
   keeps every exposure. **No migration needed.**

   The real caveat is a different one: changing `speaker` changes which voice should render
   the line, so it must go **make-before-break** — generate and verify the new clip, swap the
   link, then retire the old. That is exactly what #360 is for, which is why it should stay
   paused until you've ruled.

---

## Method and gaps

- Source of truth for the assignment: `canonical_pod_scenarios` (`pod_slug='pod-0'`, scenes
  15–21, 80 rows), cross-checked against `docs/pods/pod0-english-canonical.md` and Aran's
  archived original `docs/pods/pod0-aran-original-2026-08-06.txt`.
- Live comparison: `listening_pod_sentences` for `ita_for_eng:pod-1`; cast map read from
  `listening_pods.speakers`.
- **Gap:** Aran's own archived file carries no speaker column at all, so no assignment —
  mine or anyone's — can be validated against him directly. The sense calls above are mine.
- **Gap:** `content_audit_log` was not read. The "already applied by 60d19bc1" column is from
  the committed applied/dryrun logs in `docs/pods/`, plus a live read of the current DB
  speakers, not from the audit table.
- Nothing was written. #360 untouched.
