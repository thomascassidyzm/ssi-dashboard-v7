# Spanish Pod 1 — text/casting construction audit

**Date:** 2026-08-24 · **Scope:** `spa_for_eng:pod-1` and `spa_mx_for_eng:pod-1`, both `visibility='live'`
**Level:** text and metadata only. No clip touched, no pointer changed, no audio generated.
**Source of truth:** `listening_pods.speakers` + `listening_pod_sentences` in the live database.
**Standard applied:** the pod casting rule, `docs/pods/pod0-casting-rule-2026-08-08.md` (two voices, cast by speaker, never by line position; a third character recycles voice 1; adjacent-turn collisions minimised by max-cut).

---

## Verdict

**Not perfect. Four defect classes, 26 defective lines across the two courses, all correctable in text/metadata alone.**

The foundations are clean: exactly two target voices, exactly two known voices, every line has a speaker, every speaker resolves to the cast, and every character keeps one voice for the whole pod. What fails is (1) the two-voice *deal* in scenes 8 and 9 — the current assignment is measurably worse than the optimum the estate's own solver can reach, (2) three scenes carry four and three characters, which no two-voice cast can seat without collisions, and (3) the Learner's Spanish gender agreement contradicts the Learner's own cast voice on six lines.

---

## 1. Cast identity — PASS (both courses)

| | `spa_for_eng:pod-1` | `spa_mx_for_eng:pod-1` |
|---|---|---|
| Target male | **Manuel** — `xai:yis75yfp` | **Luciano** — `azure:es-MX-LucianoNeural` |
| Target female | **Elvira** — `azure:es-ES-ElviraNeural` | **Carlota** — `azure:es-MX-CarlotaNeural` |
| Known male | **Tom (clone)** — `xai:gfzdpspr5fdp` | same |
| Known female | **Olivia** — `xai:bedd6226` | same |

Exactly two target voices and exactly two known voices in each pod's `speakers` map — no third voice is referenced anywhere. The known pair matches the standing English cast doctrine (clone + Olivia, `docs/audio-pass-queue-2026-08-13/approved-render-run-2026-08-13.md`). **231 sentences, 22 scenes, 0 blank speaker fields, 0 speakers that fail to resolve to a cast entry**, in each course. Every character carries a single `gender` and a single voice pair for the entire pod — no character is ever split across two voices.

## 2. Cast-by-speaker coherence — PASS (both courses)

Casting is keyed by canonical speaker, with `variants[]` folding the time-stamped labels ("Neighbour (8 am)", "Barista (3 pm)", "Friend (7 pm)") onto their canonical character. No line-position alternation anywhere. The Stephen Fry ruling is satisfied: a character with consecutive lines keeps their voice through all of them.

## 3. Two speakers per exchange — FAIL, 3 scenes

Scenes with more than two characters on stage. The Narrator is listed separately: it delivers a one-line numbers/colours drill at the end of a scene, not dialogue.

| Scene | Setting | Dialogue characters | Verdict |
|---|---|---|---|
| 7 | Coffee shop | Cafe Barista (F) + Cafe Customer 1, 2, 3 (all M) | **4 characters** |
| 8 | Pub | Bartender (M) + Bar Customer 1, 2, 3 (all F) | **4 characters** |
| 9 | Restaurant | Waiter (M) + Diner 1, Diner 2 (both F) | **3 characters** |

Every other dialogue scene (1–6, 10–14, 22) is a clean two-hander. Scenes 15–21 are single-voice Learner drill lists, one line per prompt, plus the Narrator drill — monologue by design, not a defect.

**Consequence:** with two voices, scenes 7, 8 and 9 cannot be cast without a same-voice hand-off. Under the 2026-08-08 rule this is the accepted cost ("a third or subsequent character recycles voice 1"). Under today's stricter brief — zero third speakers in a scene's dialogue — these three scenes are the text-level defect, and the fix is a **script** fix, not a casting fix: merge Cafe Customer 2 and 3 into Cafe Customer 1; merge Bar Customer 2 and 3 into Bar Customer 1; keep Diner 1 and drop Diner 2's four lines onto Diner 1. That reduces all three scenes to two-handers, at the price of losing the "several customers in turn" texture.

## 4. Adjacent same-voice hand-offs — FAIL, 10 lines per course, 4 of them avoidable

A hand-off where the speaker changes but the voice does not: the listener hears one person continuing.

**`spa_for_eng:pod-1` (identical in `spa_mx_for_eng:pod-1`, same line numbers):**

| Scene | Line (global_order) | From → To | Voice |
|---|---|---|---|
| 7 | 44 | Cafe Customer 1 → Cafe Customer 2 | Manuel / Luciano |
| 8 | 57 | Bar Customer 1 → Bar Customer 2 | Elvira / Carlota |
| 8 | 58 | Bar Customer 2 → Bar Customer 3 | Elvira / Carlota |
| 8 | 61 | Bar Customer 3 → Bar Customer 1 | Elvira / Carlota |
| 8 | 62 | Bar Customer 1 → Bar Customer 2 | Elvira / Carlota |
| 8 | 67 | Bar Customer 1 → Bar Customer 2 | Elvira / Carlota |
| 9 | 73 | Diner 2 → Diner 1 | Elvira / Carlota |
| 9 | 78 | Diner 1 → Diner 2 | Elvira / Carlota |
| 9 | 81 | Diner 1 → Diner 2 | Elvira / Carlota |
| 9 | 85 | Diner 1 → Diner 2 | Elvira / Carlota |

**The correctable part.** Brute-forcing every two-colouring of each scene's conversation graph (≤5 characters, exhaustive, so this is the true optimum, the same objective `exactColourTwoVoices` targets):

| Scene | Current collisions | Optimal | Gap |
|---|---|---|---|
| 7 | 1 | 1 | optimal already |
| 8 | **5** | **2** | **3 avoidable** |
| 9 | **4** | **3** | **1 avoidable** |

Scene 8's optimum needs Bar Customer 2 moved to the male voice (Bartender + Bar Customers 1 and 3 female, or the mirror). Scene 9's optimum needs Diner 2 moved to the male voice, sharing with the Waiter. Both trade gender realism for ear-clarity — which the ruling explicitly permits: "gender realism is what gives way".

**So: 10 hand-offs today, 6 is the floor while the scripts keep 4/4/3 characters, and 0 only if the scripts are cut to two-handers as in §3.** The current pod-1 cast was not run through the optimiser, or was run with gender realism outranking the ear metric.

## 5. Learner gender agreement vs cast voice — FAIL, 6 + 4 lines

The Learner is cast **female** (Elvira/Carlota on target, Olivia on known) yet speaks about herself in the **masculine** on these lines. Every other female-cast character (Sarah, Anna, Customer) is feminine-consistent throughout, and every male-cast character is masculine-consistent — so this is isolated to the Learner, and it is a text defect, not a casting one.

**`spa_for_eng:pod-1` — 6 lines:**

| Line | Scene | Current | Correction |
|---|---|---|---|
| 153 | 16 | …no estoy **seguro** de si te he entendido. | **segura** |
| 186 | 19 | Eso me hace sentir un poco **preocupado**. | **preocupada** |
| 221 | 22 | …me siento un poco **nervioso** por hablar… | **nerviosa** |
| 225 | 22 | No estoy **seguro** de qué decir… | **segura** |
| 229 | 22 | …lo **cansado** que me pongo… | **cansada** |
| 231 | 22 | Estoy muy **contento** de poder tener… | **contenta** |

**`spa_mx_for_eng:pod-1` — 4 lines:** 221 (**nerviosa**), 225 (**segura**), 229 (**cansada**), 231 (**contenta**).

The Mexican course is the proof of intent: its lines 153 and 186 already read "no estoy **segura**" and "un poco **preocupada**". The feminine Learner is the deliberate reading; both courses simply failed to carry it into scene 22, and the Castilian course failed in scenes 16 and 19 as well.

*(Checked and cleared as false positives: "solo" as the adverb *only/just* at lines 84, 160, 227; "ha perdido" as a compound participle at 182–183. Neither is a gendered adjective.)*

## 6. Missing, ambiguous or third-voice-forcing assignments — NONE

Zero blank `speaker` values. Zero speaker strings that do not resolve to a cast entry through the canonical name or a `variants[]` alias. Zero references to a voice outside the declared pair on either track. No line would force a third voice at render time.

---

## Correction list, in priority order

1. **`spa_for_eng` lines 153, 186, 221, 225, 229, 231 and `spa_mx_for_eng` lines 221, 225, 229, 231** — masculine → feminine agreement as tabled in §5. Pure text edit; requires the standing content-change migration protocol (`docs/pods/pod-migration-protocol.md`) and an audio-pass queue entry, since the target text changes.
2. **Recolour scenes 8 and 9 in both courses** to the max-cut optimum — 4 avoidable hand-offs per course removed, metadata only, `pod-recolour --keep-audio` so no clip is unlinked ahead of its replacement.
3. **Decide the scene 7/8/9 cast size** — three-and-four-character scenes are a script property, not a casting property. Collapsing the extra customers to one character is the only way to reach zero same-voice hand-offs on two voices; keeping them is the 2026-08-08 accepted cost. This one is a taste call.

---

## The template check, for the other 20 courses

The audit is six mechanical checks, each a single query against `listening_pods` + `listening_pod_sentences`, no audio involved:

| # | Check | Pass condition |
|---|---|---|
| C1 | Voice inventory | `speakers` declares exactly 2 distinct target voices and exactly 2 distinct known voices; known pair is clone + Olivia |
| C2 | Resolution | Every `speaker` value resolves via canonical name or `variants[]`; zero blanks |
| C3 | Speaker-stability | Each canonical character maps to exactly one voice pair across the whole pod |
| C4 | Scene cast size | Per scene, count dialogue characters excluding the Narrator drill line; flag >2 |
| C5 | Adjacent hand-offs | Consecutive lines with different character but identical voice; report count and the brute-forced optimum per scene |
| C6 | Gender agreement | Female-cast lines carrying masculine self-predicates and vice versa (language-specific word list; only applies to gendered targets) |

C1–C5 are language-neutral and run unchanged on all 22 courses. C6 needs a per-language adjective list and only applies where the target marks gender on the speaker.

Audit scripts used for this run are one-off probes; if this becomes the estate template, C1–C5 belong in a committed tool under `tools/pods/`.
