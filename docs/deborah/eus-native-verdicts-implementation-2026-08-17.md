# Deborah's seven Basque verdicts — implementation plan

**2026-08-17.** Her rulings as relayed by Kai, turned into an ordered change list.
**Nothing here has been applied** — every write needs the live database, which was
unreachable all session (HTTP 522, see the programme report). This is the plan and
the reasoning, ready to execute.

Standing discipline for each: impact-check first, handle audio links explicitly
(legos and phrases re-resolve **voice-blind** on a text edit; seeds don't null at
all), adversarially verify seed/card text, render on the default chain, verify on
the production endpoint.

---

## 1. R152 s55 — `egotea` vs `izatea`: the basket question, answered

**Her verdict:** `esna egotea ez zait gustatzen` — `egotea` is **correct** (being awake
is a temporary state, so `egon`, not `izan`). Whether to *teach* `egotea` instead of
`izatea` "depends on the other sentences in the basket — check them and decide
accordingly."

**I can answer that from the repo, without the DB.** Tom already enumerated that exact
basket on 2026-08-16 in `docs/basque-seven-for-deborah-followup-2026-08-16.md`, which
records that after flipping `S0055L04` to `egotea` (commit `882bbbac`, A-122)
**seven sentences in the same group still say `esna izatea`**:

| # | Basque | English gloss |
|---|---|---|
| 1 | esna izatea gauza ona da | being awake is a good thing |
| 2 | esna izatea erabilgarria da | being awake is useful |
| 3 | baina esna izatea ez dut nahi | but I don't want to be awake |
| 4 | esna izatea ongi dela uste dut | I think being awake is good |
| 5 | esna izatea baina nekatuta nago | being awake but I'm tired |
| 6 | esna izatea gauza ona dela uste dut | I think being awake is a good thing |
| 7 | goizean esna izatea erabilgarria da | in the morning being awake is useful |

**The reasoning, and the decision it forces.** The basket is **homogeneous**: every one
of the seven predicates *being awake* — the same temporary state her ruling covers.
Not one of them is a case where `izan` would be right (there is no inherent-property
or identity reading anywhere in the set). So the condition she attached to her answer
is satisfied in the strongest possible way:

> **Teach `egotea`. Flip all seven to `esna egotea`.** There is no sentence in this
> basket that needs `izatea`, so keeping `izatea` anywhere would teach a form the
> course never has a correct use for — and leaving the basket split between the
> already-flipped `S0055L04` and seven `izatea` siblings is a ZUT hazard in itself:
> one known prompt ("being awake") with two target forms.

**Two flags to carry to Kai, not to fix silently:**

- **#5 `esna izatea baina nekatuta nago`** is odd in *both* languages — "being awake
  but I'm tired" is not a sentence. Swapping `izatea`→`egotea` makes it grammatical
  and still meaningless. It wants a rewrite or removal, which is a content-design
  call, not a mechanical swap.
- Tom's seven were put to Deborah as an open question on 08-16 and Kai's excerpt does
  **not** contain a per-sentence answer to them. My decision above is derived from her
  *general* ruling plus the basket's homogeneity. If she has since answered them
  individually, her answers win over this derivation.

*Gap: the basket membership above is Tom's 2026-08-16 snapshot. I could not re-read
`course_practice_phrases` to confirm no eighth sibling has appeared since.*

## 2. R152 s55, second phrase — reorder, tense, and the English is wrong

**Her verdict, three separate changes to one phrase:**

1. **Reorder** to her wording: `ez zait gustatzen esna egotea ondo lo egiten ez dudanean`
2. **`egin` → `egiten`** — general situation, so habitual, not perfective.
3. **The English side is wrong.** "waking up" does not describe this Basque; *being
   awake* does. `esnatzea` would be "waking up". **Fix the known side to "being awake".**

Point 3 is the one to be careful with. It is a **known-side** edit, and the known side
is a controlled language: "being awake" must already be available to the learner at
R152, and it now needs to agree with the seven phrases in §1 (which is a further
argument for doing §1 and §2 as one change).

⚠ **Blast radius.** This touches both sides of a phrase, so it re-resolves `known`,
`target1` and `target2` links, voice-blind. Fix `course_audio.text` before the phrase
row that points at it (audio-first sequencing), or the slot goes silent.

## 3. R299 s115 — `nagoenik` is negative-context only

**Her verdict:** `nagoenik` only occurs in a negative context, so the pairing must become

> `ez dut uste euskaraz hitz egiteko prest nagoenik` = **"I don't think that I'm ready
> to speak Basque"**

This is not a word swap — the English *and* the Basque both change, from an
affirmative to a negative frame. Under ZUT the known prompt must change with it, or
the same prompt would map to two targets.

**She also flagged a sibling**: she "just corrected" a nearby phrase saying
`sentitzen dut` in an earlier round, and asks that consistency be checked.
**I could not find that sibling** — it needs a search of `eus_for_eng` phrases for
`sentitzen dut` with their round numbers. One query, blocked. **This is an explicit
gap, and it should be resolved before the R299 change lands**, because if the sibling
established a different frame the two will disagree.

## 4. R18 s6 — two confirmed leftovers

**Her verdict:** both phrases — `beste bat nahi dut` ("I want another one") and
`beste bat praktikatu nahi dut` ("I want to practise another one") — are **confirmed
leftovers from an earlier version** of the course. Remove or replace them "per the
`hitz bat` card they were meant to serve".

So the instruction is not a bare deletion: they were meant to practise a `hitz bat`
("one word") card, and the replacement must serve that card. **Which card that is, and
what it currently teaches, needs the DB.** Blocked.

⚠ **This is pod/progress-sensitive if these phrases are live.** Progress is filed under
a sentence's *slot*, not its text, so replacing the text in place silently credits a
learner with a sentence they never heard. Removal or replacement here goes through the
content-change migration protocol (`docs/pods/pod-migration-protocol.md`), not an
in-place edit.

## 5. R140 s52 — `idaztea` is fine

**No change.** Her verdict is that `idaztea` is correct as it stands. **Action: clear the
flag** so it stops appearing in her queue. Which flag row that is — `course_qa_flags`
is the likely table — needs the DB.

## 6. R325 s126 — `lan hau` is correct

**No change.** `lan hau` is right there; `honek` would only be correct as a *transitive
subject*, which this is not. **Action: clear the flag.** Same blocked lookup as §5.

---

## Order of operations

1. **§5 and §6 first** — they are flag clears with no content change and no audio risk.
   They also immediately shorten her queue, which matters while she is working.
2. **§3's sibling search** before §3's edit.
3. **§1 + §2 as one change** — same basket, same round, and §2's known-side wording
   depends on §1's decision.
4. **§4 last**, and only with Kai's ruling on the replacement, because it is the one
   item that may need the progress-migration protocol.

## What must be true before any of this is applied

- The **revert channel** must be understood for this course. Deborah has already had
  Basque work appear to revert; applying six more changes into an unexplained revert
  channel risks losing them too. The programme report sets out what Tom's lane already
  proved (the 08-12 serving bug, closed) and what is still unaudited (2026-08-14
  19:40Z → now).
- Every one of these edits touches text, so each needs its audio link handled
  explicitly and verified afterwards — not assumed.
