# TTS pod cast precedent — answers "haven't we done this for POD-1 already?" (2026-09-03, 00:2Xh)

**Direct answer: no, the hypothesis doesn't hold.** All 61 live TTS-voiced pod courses cast **exactly two voices** (one male, one female) — same as Welsh — and they carry the **identical** customer-to-customer same-voice collisions in the cafe/bar/restaurant scenes, because it's the **same canonical script**, word-for-word cast the same way, everywhere. Nobody used a third voice to dissolve the odd cycle. The collisions were never solved — they were never even computed; TTS casting has no adjacency-aware solver in its path at all.

So Welsh's ten collisions are not a Welsh-specific defect from having "only two humans" — they are the standing, fleet-wide shape of this script at two voices. The question really is what tonight framed it as: **do we want a third Welsh voice** — which would make Welsh the *first* course in the estate to try it, not a catch-up to something already proven elsewhere.

## 1. Fleet voice-count distribution (live, `pod_type='core'`, from `listening_pods.speakers`)

| distinct target voices | # courses |
|---|---|
| 2 | 61 |
| 0 (test course, `fin_for_eng`, no real cast) | 1 |
| 3, 4, 5 | **0** |

Every real TTS pod course — `ara_eg_for_eng`, `deu_for_eng`, `fra_for_eng`, `jpn_for_eng`, `spa_for_eng`, `zho_for_eng`, all 61 — casts **exactly two** target voices, one per gender. This matches the standing rule in code (`services/voice-engine/pods-cast.cjs`, `DEFAULT_POD_VOICES = 2`, `MAX_POD_VOICES = 5`) and Tom's own 2026-08-06 ruling quoted directly in the test suite (`pods-two-voice-default.test.cjs`): *"the whole point of doing this in this way was that we could get by with just two different voices… think about that, if we're making it a lot more complicated… harder for people to do community courses."* Three-to-five voices exists in code as an **opt-in upgrade for human community casts** — nobody has exercised it for a real course yet, TTS or human.

## 2. Same script?

Yes — checked directly. `fra_for_eng:pod-1`'s speaker roster (Anna, Guest, James, Local, Sarah, Staff, Driver, Friend, Waiter, Barista, Diner 1/2, Learner, Tourist, Customer, Narrator, Assistant, Bartender, Neighbour, Passenger, Pharmacist, Cafe Barista, Interlocutor, Receptionist, Bar/Cafe Customer 1-3 — 30 roles) is the same set Welsh (`cym_n_for_eng:pod-0`) carries, and the scene-by-scene structure lines up exactly: scene 7 = cafe (Barista + Customers 1-3), scene 8 = bar (Bartender + Customers 1-3), scene 9 = restaurant (Waiter + Diner 1/2). This is one script, cast per-language — the comparison is exact, not approximate.

## 3. Alternation check, sampled

Ran the same adjacency check job #188 ran on Welsh, against `fra_for_eng`, `deu_for_eng`, `jpn_for_eng`, `spa_for_eng` (four languages, all 231-line "pod-1" full scripts, two distinct provider voices each). Result: **identical in all four** — 11 cross-character same-voice adjacencies, all in the same three scenes:

- **Scene 7 (cafe)**: Cafe Customer 1 → Cafe Customer 2 (1 collision)
- **Scene 8 (bar)**: Bar Customer 1/2/3 cycling on the same voice (5 collisions)
- **Scene 9 (restaurant)**: Diner 1 ↔ Diner 2 (4 collisions)
- **Scene 21**: Interlocutor → Narrator (1, minor, different case)

These are the same three-way odd-cycle scenes job #188 found in Welsh (staff + multiple customers who also address each other) — no two-voice cast alternates cleanly there, in any language. Welsh's ten and these fleet-wide eleven are the same defect, not two different ones (Welsh's count differs by one only because its scene numbering/lines aren't byte-identical to `_for_eng`'s).

## 4. The precedent — what did we actually do?

**(b) — accepted the same collisions, everywhere, without exception**, and **(c) — never computed them at all** for the TTS path. The TTS pod casts (`listening_pods.speakers`) were assigned by gender only, no adjacency solving. The one piece of code that *can* detect and warn about same-voice collisions (`proposePeopleCast` / `proposeHumanCast` in `pods-cast.cjs`, with its `feasibility.collisions` report and "you need N more people" warning) is wired only into the **human-cast proposal flow** — the tool built for community leaders casting real recorders, exercised so far only on Welsh. It was never run against any TTS course; nothing in the TTS assignment path calls it. So there's no design decision on record that says "two voices is fine even with a same-voice customer exchange" for TTS — it's simply never been checked, and the fleet has been serving it uncomplained-of for as long as these 61 courses have been live.

## Bottom line for the decision

Welsh is not inheriting an unsolved problem that 22 other languages solved — it's sitting in the same boat as all of them, and it's the only one where a human actually looked closely enough to name it (job #188, tonight). "Do we want a third Welsh voice" is a live, first-of-its-kind decision, not a catch-up. The code path for a 3-voice human cast already exists and is opt-in-ready (`pods-cast.cjs`); nothing has to be built to try it — only cast and re-render.
