# A-307 — the opening phrases, as served and shortest-first

*2026-08-30. Read straight from `course_legos` / `course_practice_phrases` on the live database — no reconstruction, no JSON files. SELECTs only.*

## The headline

**For the opening rounds of both courses pulled, the two orders are almost identical.** Across 14 LEGOs' worth of build/use baskets, exactly **one pair of phrases swaps position** (spa_for_eng, seed 1 LEGO 5). Everywhere else, what the DB already had first is what shortest-first would also put first.

That is a real finding, not a shrug: at the very opening of a course, "DB position order" and "shortest-first" are not visibly fighting each other. If the courses were authored by shortest-build-phrase-first instinct (a natural way to *write* a LEGO's practice set), position order would just be a slower way of arriving at the same list you'd get by sorting.

---

## 1. spa_for_eng — served today vs shortest-first

Syllables counted the way the walk itself counts them (`countTargetSyllables`, `services/learning-script-generator.cjs:208` — vowel-cluster count on the Spanish target).

**LEGO 1 — I want / quiero**
| Served | Shortest-first |
|---|---|
| BUILD I want → *quiero* (2) | BUILD I want → *quiero* (2) |

**LEGO 2 — to speak / hablar**
| Served | Shortest-first |
|---|---|
| USE I want to speak → *Quiero hablar* (4) | USE I want to speak → *Quiero hablar* (4) |

**LEGO 3 — Spanish / español**
| Served | Shortest-first |
|---|---|
| BUILD To speak Spanish → *Hablar español* (5) | BUILD To speak Spanish → *Hablar español* (5) |
| USE I want to speak Spanish → *Quiero hablar español* (7) | USE I want to speak Spanish → *Quiero hablar español* (7) |

**LEGO 4 — with you / contigo**
| Served | Shortest-first |
|---|---|
| BUILD To speak with you → *Hablar contigo* (5) | BUILD To speak with you → *Hablar contigo* (5) |
| BUILD To speak Spanish with you → *Hablar español contigo* (8) | BUILD To speak Spanish with you → *Hablar español contigo* (8) |
| USE I want to speak with you → *Quiero hablar contigo* (7) | USE I want to speak with you → *Quiero hablar contigo* (7) |
| USE I want to speak Spanish with you → *Quiero hablar español contigo* (10) | USE I want to speak Spanish with you → *Quiero hablar español contigo* (10) |

**LEGO 5 — now / ahora — the one place the orders diverge**
| Served (DB position) | Shortest-first |
|---|---|
| BUILD To speak now → *Hablar ahora* (5) | BUILD To speak now → *Hablar ahora* (5) |
| BUILD With you now → *Contigo ahora* (6) | BUILD With you now → *Contigo ahora* (6) |
| **BUILD Spanish with you now → *Español contigo ahora* (9)** | **BUILD To speak Spanish now → *Hablar español ahora* (8)** |
| **BUILD To speak Spanish now → *Hablar español ahora* (8)** | **BUILD Spanish with you now → *Español contigo ahora* (9)** |
| USE ×4, already ascending 7→10→10→13 | same |

That is the entire divergence in this course's opening: two BUILD phrases (8 and 9 syllables) swap order. Everything else — 13 other phrases across 5 LEGOs — is already in ascending-syllable order in the raw DB rows.

**LEGO 1 of seed 2, for one round past the opening — to learn / aprender**
| Served | Shortest-first |
|---|---|
| BUILD I want to learn → *Quiero aprender* (5) | same |
| BUILD To learn Spanish → *Aprender español* (6) | same |
| USE ×6, already ascending 8→8→11→11→14→14 | same |

## 2. fra_for_eng (fallback course — cym_for_eng has no rows in `course_round_index`, see Gap below)

**LEGO 1 — I want / je veux**: BUILD *je veux* (2) — same, only phrase.
**LEGO 2 — to speak / parler**: BUILD *je veux parler* (4) — same, only phrase.
**LEGO 3 — French / français**: BUILD *parler français* (4), USE *je veux parler français* (6) — identical both orders.
**LEGO 4 — with you / avec toi**: BUILD 3/5/7 syllables, then USE 7/9 — identical both orders.
**LEGO 5 — now / maintenant**: BUILD 5/7/8/10, USE 7/9/10/12 — identical both orders.
**Seed 2, LEGO 1 — to learn / apprendre**: BUILD *apprendre maintenant* (6), *apprendre avec toi* (6) — tied, order arbitrary either way; USE 5/8/8/11 — identical both orders (the one 5-syllable USE, *je veux apprendre*, sits after two BUILDs by role, not by length, which is the methodology's own rule — BUILD always precedes USE regardless of syllable count).

**fra_for_eng shows zero divergence** anywhere in its first six LEGOs. Served order and shortest-first order are the same list.

---

## 3. Is the opening order authored, or incidental?

**Incidental — the evidence points one way and I did not find anything pointing the other.**

- `position` is not a field a course-builder chooses or reorders. In `services/course-builder/routes/seed-complete.cjs`, every write path computes it as `practiceStartPosition + i` — the plain array index of whatever order the phrases arrived in on that API call (line 628, 827, 1965, 1988, 2038, 2133; `computePhraseRole(position)` then derives BUILD/USE purely from where that index falls, builds always occupying the lower block). There is no separate "sequence" or "priority" column, no UI or endpoint that lets a human re-rank an already-saved phrase's position, and `validation.cjs` (also open in the working tree right now, unedited by me) validates tiling/ZUT/vocab/phrase-count — never phrase order.
- Where I could check history, position runs with gaps rather than a clean 1..N (fra_for_eng seed 2: LEGO 1 has positions {2,3,4,5,6,7}, missing 1; LEGO 2 has {1,2,3,5,6,7,8,9,10,11}, missing 4). A hand-curated ordering wouldn't leave holes; a monotonic insert counter that has since had a row edited or deleted would — which is the ordinary, unremarkable shape of database churn, not evidence of deliberate sequencing.
- The near-identity found in §1–2 above cuts against "authored ordering was deliberately shortest-first-defying" — there's nothing here that looks like a human picked an *unusual* first phrase on purpose. The one divergence found (spa_for_eng LEGO 5, an 8-vs-9-syllable BUILD swap) is exactly the size of noise you'd expect from an LLM author writing build phrases in a slightly different sequence than pure syllable count, not a considered pedagogical choice — nothing about *"Spanish with you now"* needs to precede *"to speak Spanish now"*.

So: **no mechanism authors this order, no data shows it being hand-edited, and where it differs from shortest-first at all, the difference is too small and too arbitrary to read as intent.** I did not find evidence of the opposite case elsewhere in the course estate — that absence is itself part of the answer, not a claim I'm otherwise unable to make.

---

## Gap, stated plainly

`cym_for_eng` — the brief's first-choice second course — has **zero rows in `course_round_index`**, so the bootstrap endpoint has nothing to walk for it (it would 404 with "LEGO not in round map"). I could not show its opening at all. Per the brief's own fallback instruction, I used `fra_for_eng` instead; if Tom specifically wants to see cym_for_eng, its round-index materialised view needs rebuilding first, which is out of scope for this read-only job.

I did not reconstruct the spaced-review block (offsets 1/2/3/5/8/13…) for either course — that requires per-row audio-completeness data (`known_audio_id`/`target1_audio_id`/`target2_audio_id` all non-null) I did not pull, since the A-307 question is about BUILD/USE ordering, which the spaced-review block doesn't touch. `docs/script-view/what-order-the-learner-hears-2026-08-30.md` already covers that divergence separately and remains the reference for it.

---

**Landing line:** this job produced no code or data changes — only this document. It is committed on branch `docs/a307-opening-order-phrases` in the ssi-dashboard-v7-clean repo, pushed to origin, **not merged** to `main`. Not deployed anywhere (it's a markdown doc, nothing to deploy).
