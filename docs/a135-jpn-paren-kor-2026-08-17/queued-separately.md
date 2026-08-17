# Two defects found by A-135, filed out of scope

**Kai's ruling, 2026-08-17: "The S0201 build-phrase fault and the saber/conocer basket rewrite file
as separate queued items, not this job's scope."**

Both were found while repairing the two truncated `spa_for_jpn` legos. Neither is caused by that
repair; both are pre-existing and both are **live in a beta course today**. Recorded here with the
evidence so whoever picks them up does not have to re-derive it.

---

## 1. `spa_for_jpn` S0201 — a LEGO and its own build phrase are the same prompt with different answers

| row | known side | target |
|---|---|---|
| lego `S0201L01` | 「～するつもりだった」 *(after the A-135 strip)* | `iba` |
| build phrase `S0201L01B01` | 「～するつもりだった。」 | `iba a` |

`normalize_text()` strips the trailing `。`, so these are **one prompt with two answers** — a ZUT
fault. It was previously masked by the lego carrying a grammar annotation; removing the annotation
did not create the fault, it revealed it.

**Which is wrong is a judgement call, not obvious.** 「～するつもりだった」 means "was going to /
intended to", which is `iba a` + infinitive — so the *phrase* arguably has the better mapping and the
LEGO's bare `iba` is the imprecise one. But the whole S201 basket (B02–B07: `iba a pasar`,
`iba a decir algo`, `iba a hacer algo`…) is built on `iba a`, so changing the lego's target has a
basket-wide blast radius.

**Also note** sibling lego `S0236L01` 「～するつもりだった（ir過去三人称）」 → `iba` — same target,
still annotated. Whatever is decided for S0201 should be decided for S0236 in the same pass.

---

## 2. `spa_for_jpn` S0128 — saber and conocer share one Japanese prompt

| row | known side | target |
|---|---|---|
| lego `S0105L01` | 「知っていました」 | `sabía` |
| build phrase `S0105L01B01` | 「知っていました」 | `sabía` |
| lego `S0128L03` | 「知っていました」 *(after the A-135 strip)* | `conocía` |
| build phrase `S0128L03B01` | 「知っていました」 | `conocía` |

One Japanese prompt, two Spanish verbs. **This fork already ran on the served phrase surface before
A-135 touched anything** — `S0105L01B01` and `S0128L03B01` are both live build phrases today — so
the learner already meets it. The strip added the lego to a fork it did not create.

**The real defect is that Japanese 知っていました does not distinguish saber from conocer.** Spanish
splits them: `saber` = know a fact, `conocer` = be acquainted with a person or place. The S128 seed
is 「あなたは以前知っていた人に似ています」 = *"You're like someone I used to know"* — squarely
`conocer`.

**Why it is not a one-line fix.** The whole S0128L03 basket (B01–B07) uses 知っていました for
`conocía`. Giving the lego a distinguishing Japanese sense (e.g. 面識がありました / 知り合いでした for
`conocer`) means rewriting all seven build phrases and re-rendering their audio. It is the family
worker #880 classified as "sense splits wearing a tense label", and it wants a Japanese author —
see `docs/native-speaker-review-queue.md`.

---

## Both are instances of one pattern worth naming

The grammar annotations were not only authoring litter. In at least these two places they were
**load-bearing patches over a prompt space that does not discriminate**. Worker #880 measured this
estate-wide and found **62 of 100 collision groups on the production surface are pre-existing** —
`deu_for_jpn` already maps bare 「友達」 to `freund` / `freunde` / `Freund` / `ein Freund`, and bare
「する」 to `machen` / `tue` / `tut` / `tun`, with no parenthesis anywhere near them.

So the annotation defect and the ZUT-discrimination defect are the same story told twice. Removing
the labels does not create the second problem; it stops hiding it. That is an argument for doing the
strip, not against it — but it means the strip should be planned as *two* pieces of work.
