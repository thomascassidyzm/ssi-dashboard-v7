# Welsh Pod 1 English: every character, one voice (job #932, 2026-11-08)

Read live after landing: whole lines and Listen pieces from Popty /api/pod-scripts (the rows staging and production read), Drill pieces from podDrillPieces/<course>.json on origin/staging 740a5ce7e (byte-identical to Popty ops/pod-drill/served/), voices by clip id. A character is its speaker name within a course; its sex is the sex of its human Welsh voice (North: Aran / Catrin, South: Dan / Eleri). Tool: Popty tools/pods/pod-drill/pieces/welsh-english-voice-census.cjs (per-character table added in 3b4803fa2).

**Result: 58 characters, 0 wrong (no character uses a voice of the other sex, and none uses Gemma, Olivia or a Tom clone). 5 North men are "two renditions": Aran own takes on most clips, his PRO clone on a few Listen or Drill pieces. Tom decides whether to unify them on the clone. No split labels: every speaker has one Welsh voice.**

Changed by the fix: North Customer, Bar Customer 3 and Chat Learner, and South Customer, moved from a mix of xAI Olivia and Cartesia Gemma onto Charlotte by #905 (landed 15:57Z, after the 15:39Z cold check). Listening page: https://watson-1.tail4968cb.ts.net/d/38aaa738

## North (cym_n_for_eng)

| Character | Sex | English voice | Lines | Listen pieces | Drill pieces | State |
|---|---|---|---|---|---|---|
| Neighbour | man | Aran (own takes) 5 + Aran PRO clone 2 | 3 | 4 | 0 | two-renditions |
| Sarah | woman | Charlotte 37 | 13 | 17 | 7 | clean |
| Passenger | man | Aran (own takes) 10 + Aran PRO clone 2 | 6 | 6 | 0 | two-renditions |
| Barista | man | Aran (own takes) 6 | 4 | 2 | 0 | clean |
| Friend | man | Aran (own takes) 13 | 7 | 3 | 3 | clean |
| James | man | Aran (own takes) 17 + Aran PRO clone 4 | 6 | 13 | 2 | two-renditions |
| Anna | woman | Charlotte 21 | 6 | 7 | 8 | clean |
| Narrator | man | Aran (own takes) 90 | 16 | 74 | 0 | clean |
| Cafe Barista | woman | Charlotte 19 | 7 | 10 | 2 | clean |
| Cafe Customer 1 | man | Aran (own takes) 5 | 3 | 2 | 0 | clean |
| Cafe Customer 2 | man | Aran (own takes) 5 | 3 | 2 | 0 | clean |
| Cafe Customer 3 | man | Aran (own takes) 5 | 1 | 2 | 2 | clean |
| Bartender | man | Aran (own takes) 10 | 5 | 5 | 0 | clean |
| Bar Customer 1 | woman | Charlotte 17 | 5 | 6 | 6 | clean |
| Bar Customer 2 | woman | Charlotte 5 | 3 | 2 | 0 | clean |
| Bar Customer 3 (changed) | woman | Charlotte 4 | 2 | 2 | 0 | clean |
| Diner 1 | woman | Charlotte 18 | 6 | 8 | 4 | clean |
| Waiter | man | Aran (own takes) 19 + Aran PRO clone 5 | 7 | 13 | 4 | two-renditions |
| Diner 2 | woman | Charlotte 12 | 4 | 4 | 4 | clean |
| Customer (changed) | woman | Charlotte 22 | 10 | 10 | 2 | clean |
| Assistant | man | Aran (own takes) 4 | 4 | 0 | 0 | clean |
| Guest | man | Aran (own takes) 13 + Aran PRO clone 1 | 6 | 6 | 2 | two-renditions |
| Receptionist | woman | Charlotte 20 | 6 | 9 | 5 | clean |
| Pharmacist | man | Aran (own takes) 6 | 4 | 2 | 0 | clean |
| Tourist | woman | Charlotte 11 | 5 | 4 | 2 | clean |
| Local | man | Aran (own takes) 9 | 5 | 2 | 2 | clean |
| Driver | woman | Charlotte 13 | 5 | 6 | 2 | clean |
| Learner | man | Aran (own takes) 64 | 62 | 2 | 0 | clean |
| Local Speaker | woman | Charlotte 11 | 11 | 0 | 0 | clean |
| Chat Learner (changed) | woman | Charlotte 6 | 6 | 0 | 0 | clean |

## South (cym_s_for_eng)

| Character | Sex | English voice | Lines | Listen pieces | Drill pieces | State |
|---|---|---|---|---|---|---|
| Neighbour | man | Aran (own takes) 7 | 3 | 0 | 4 | clean |
| Sarah | woman | Charlotte 17 | 13 | 0 | 4 | clean |
| Passenger | man | Aran (own takes) 10 | 6 | 0 | 4 | clean |
| Barista | man | Aran (own takes) 4 | 4 | 0 | 0 | clean |
| Friend | man | Aran (own takes) 16 | 7 | 0 | 9 | clean |
| James | man | Aran (own takes) 17 | 6 | 0 | 11 | clean |
| Anna | woman | Charlotte 14 | 6 | 0 | 8 | clean |
| Narrator | man | Aran (own takes) 71 | 15 | 0 | 56 | clean |
| Cafe Barista | woman | Charlotte 17 | 7 | 0 | 10 | clean |
| Cafe Customer 1 | man | Aran (own takes) 5 | 3 | 0 | 2 | clean |
| Cafe Customer 2 | man | Aran (own takes) 5 | 3 | 0 | 2 | clean |
| Cafe Customer 3 | man | Aran (own takes) 3 | 1 | 0 | 2 | clean |
| Bartender | man | Aran (own takes) 10 | 5 | 0 | 5 | clean |
| Bar Customer 1 | woman | Charlotte 9 | 5 | 0 | 4 | clean |
| Bar Customer 2 | woman | Charlotte 5 | 3 | 0 | 2 | clean |
| Bar Customer 3 | woman | Charlotte 4 | 2 | 0 | 2 | clean |
| Diner 1 | woman | Charlotte 12 | 6 | 0 | 6 | clean |
| Waiter | man | Aran (own takes) 13 | 7 | 0 | 6 | clean |
| Diner 2 | woman | Charlotte 6 | 4 | 0 | 2 | clean |
| Customer (changed) | woman | Charlotte 20 | 10 | 0 | 10 | clean |
| Assistant | man | Aran (own takes) 4 | 4 | 0 | 0 | clean |
| Guest | man | Aran (own takes) 6 | 6 | 0 | 0 | clean |
| Receptionist | woman | Charlotte 12 | 6 | 0 | 6 | clean |
| Pharmacist | man | Aran (own takes) 4 | 4 | 0 | 0 | clean |
| Tourist | woman | Charlotte 9 | 5 | 0 | 4 | clean |
| Local | man | Aran (own takes) 18 | 16 | 0 | 2 | clean |
| Driver | woman | Charlotte 9 | 5 | 0 | 4 | clean |
| Learner | woman | Charlotte 76 | 69 | 0 | 7 | clean |

## What now stops a character splitting again

Popty 3b4803fa2 (live on Popty production): the render route casts every English clip of a Welsh pod from the line CHARACTER. A Drill or Listen piece that does not name its line is refused (POD_CHARACTER_UNKNOWN); a voice of the other sex, including Aran own take on a woman, is refused (POD_ENGLISH_VOICE); with no voice named, a woman gets Charlotte and a man Aran PRO clone. Probed live by dry run, no spend.

Re-render: none needed, 0 characters spent. Welsh read-back before vs after: 0 diff in both courses.
