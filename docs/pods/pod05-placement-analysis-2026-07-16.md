# Pod 0.5 — placement analysis (C=8 vs C=12), overlaps, menu-lines, placeholders

*2026-07-16. Evidence pack for the founder's placement ruling on Aran's "first real
conversation" dialogue (`pod05-aran-raw-2026-07-16.txt`, committed verbatim). Structured
DRAFT canon: `pod05-english-canonical-DRAFT.md` — do NOT seed until the ruling lands.
Ceilings and S-LEGO definitions: `pod-ladder-proposal.md` §9a/§9b. Counter =
`tools/lib/syllable-counters.cjs` (eng), same instrument that passed pod-1 at C=12.*

---

## 1. Syllable / S-LEGO numbers — the placement evidence

Per the founder's menu-lines ruling (2026-07-16), each scenario-variant is analysed as
its own turn: **27 turns (17 conversational moments + variants), 77 sentences**.
Sentence-level pieces measured before ellipsis insertion; "no rescuing seam" = even
using every available seam (comma, coordinator, subordinator, and the seams the C=12
pass found) some chunk still exceeds the ceiling — an ellipsis would have to land
mid-constituent (§9a's flag-for-human-ear case) or the sentence must be rewritten.

| | **C=12 (pod-1+ ceiling)** | **C=8 (pod-0 ceiling)** |
|---|---|---|
| Sentences over ceiling | 43 / 77 (56%) | 57 / 77 (74%) |
| Turns needing ellipses | 15 / 27 | 21 / 27 |
| Sentences with NO rescuing seam | 0 (see below) | **40 (52% of all sentences)** |
| Result of an actual §9a pass | **Done — draft passes** | Not attempted — see below |

**The applied C=12 pass** (baked into the DRAFT): 101 '…' marks → **178 pieces, max
piece exactly 12 syllables, zero over ceiling** — verified including every variant row
(the shared audit can't parse those yet; `tools/audit-canon-ellipsis.cjs … eng 12` also
passes on the 18 rows it does parse). Every over-ceiling sentence found a seam, but
**7 of the chosen seams are below finite-clause level** and are flagged for human ear
(§4 list) — real but survivable.

**Why C=8 was not baked:** even the fully C=12-segmented draft still has 69 of 178
pieces over 8, and 40 of 77 sentences have no seam inventory at all that reaches C=8 —
pieces like "with someone who doesn't speak it very well" (12 syl, no internal seam)
would shatter into non-intentions. C=8 is unreachable for this text without rewriting
most of it, which the preserve-Aran's-text rail forbids.

---

## 2. Overlap check — pod-0 canon (DB, 15 scenes) and pod-1 move canon (16 scenes)

**Zero verbatim line collisions.** Seven thematic overlaps, each with a recommendation:

| # | Aran (pod-0.5 draft) | Existing | Verdict |
|---|---|---|---|
| 1 | Sc1 whole scene — the no-English contract | pod-0 sc15 "First conversation" — "Would you mind if I tried to practise speaking [target language] with you?" | **Keep both.** Sc15 asks permission to practise; Aran's is the stronger full contract ("do you mind if we don't use English"). Natural escalation: sc15 is the gentle precursor. Pod-0 sc15 is live Croatian audio — leaving it untouched is also the cheap move. |
| 2 | Sc1 r3 "If I don't know how to answer… I'll ask you to say it again more slowly." | pod-0 sc6 r9 "Could you say that again more slowly?" · pod-1 sc3 r11 "Could you say that again, a bit slower?" | **Keep all three.** Aran's line ANNOUNCES the repair strategy up front; pod-0 executes it once in-flight; pod-1's Say That Again drills the move six ways. Announcement → instance → drill is a ladder, not a dupe. |
| 3 | Sc4 r2 "You'll need to slow down to give me time to think." | pod-1 sc3 r16 pace-apology "Sorry — I'm talking too fast today, aren't I?" · pod-0 sc15 "Am I speaking slowly enough for you now?" | **Keep all.** Mirror moves — listener requests pace vs speaker offers pace. Complementary, both worth hearing. |
| 4 | Sc2 origins Q&A ("where do you come from…") | pod-0 sc6 Introductions ("Where are you from?" / "I'm from Manchester…") | **Keep both.** Pod-0 is the formulaic exchange; Aran's is the biographical monologue with the why-are-you-learning payload. Different depth, same slot in life. |
| 5 | Sc6 "How about you? … tell me about your family" (turning the tables) | pod-1 sc2 And What About You (turn-returning) | **Keep both.** Same move, different footing: Aran's is a stranger/practice-partner first conversation; pod-1 assumes established friends. |
| 6 | Sc6 r2 / Sc7 "So, let me think." / "It's not easy to think of something to ask!" / "I'm not sure I know enough words…" | pod-1 sc15 What's the Word (word-hunting, holding the floor) | **Keep both.** Aran embeds floor-holders as softeners inside longer turns; pod-1 drills them as the scene's point. |
| 7 | Sc4/Sc6 family-and-work Q&A | pod-0 sc15's practice-meta lines about confidence | **Keep both.** No line-level collision; sc15 stays meta, Aran's scenes carry actual biography. |

Net: **no cuts needed anywhere** — the new content slots between pod-0's formulaic
exchanges and pod-1's move drills without displacing either.

---

## 3. Menu-lines — scenario-variants (founder ruling 2026-07-16)

Aran deliberately authored side-by-side alternatives in two turns (raw turns 9 and 14):
married/not-married, children/no-children, partner/no-partner. **Founder ruling: keep
ALL of them, as scenario-variants — every learner learns every variation** (they must
produce their own answer AND understand everyone else's). They are NOT pick-one
personalisation slots. The DRAFT represents them as **variant rows**: `3a`/`3b`/`4a`… —
rows sharing a number form one **turn-group**: sibling takes of the same conversational
moment, all shipped, all drilled, each a complete natural utterance. The only thing the
grouping exists to prevent is the player reading the takes as one contradictory
monologue — it presents them as alternative takes of the moment.

**Pipeline representation** (follows the existing shapes, not new machinery):
- `canonical_pod_scenarios` gains one nullable text column `variant_key` (`a`/`b`/`c`;
  null = ordinary row). Same `sentence_number` = same turn-group. ID becomes
  `pod-0.5:SC04-S03a`.
- `tools/seed-canonical-pods.cjs:63` — row regex `^\d+$` widens to `^(\d+)([a-z])?$`;
  digits → `sentence_number`, letter → `variant_key`. ALL rows seed; nothing filtered.
- `tools/audit-canon-ellipsis.cjs:45` has the same `^\d+$` regex — widen identically
  (today it silently skips variant rows; the analysis script covered them).
- Generation + TTS: every variant row translates and renders like any other row (each
  is a self-contained utterance, so no new prompt machinery). The ledger keeps the
  group's shared vocabulary consistent across takes for free.
- Player: the one real gap — playback must present a turn-group as alternative takes
  of the same moment (however that's staged), not as consecutive lines of one speaker.

**Two content facts the representation must respect (both flagged, no action taken):**
1. **Continuation coherence.** Scene 6 row 5 (the Friend's long tail — "either my
   husband or I…", "I'd really like the children to grow up…") continues the 3b/4b
   takes specifically. All takes still ship and drill; the presentation order should
   just let the tail follow the take it coheres with.
2. **Aran's raw ordering interleaved branches** (turn 9: "I have a daughter and a
   son. We don't have children. I don't have children. My son is fifteen…"). The
   draft regroups continuation sentences with their take — every sentence verbatim,
   only adjacency changed (§4 deviation 3).

---

## 4. Deviations from Aran's raw text (complete log)

All sentences are otherwise verbatim.

1. **`[language]` → `[target language]`** (10 occurrences) — normalisation to the
   existing canon-v2 placeholder machinery (`services/pod-generation-prompt.cjs`,
   `services/pod-generation-prompt.txt` line 29).
2. **`[country]`/`[city]` disambiguated** — raw turn 5 uses `[country]` with two
   different meanings in one turn (learner's home vs the target-language country).
   Now: `[home country]`, `[home city]`, `[target country]`, `[target city]` (§5).
3. **Turn 9 variant regrouping** — "My son is fifteen and my daughter is seventeen."
   and "I love them, of course, even when they spend all my money." moved adjacent to
   "I have a daughter and a son." (they continue that branch); the no-children
   variants become their own rows.
4. **Turn 9 hyphen → ellipsis** — "I work in education - I'm not…" → "I work in
   education… I'm not…" (punctuation only; the seam was needed there anyway).
5. **Turn 14 variant reading** — grouped as 3a "I'm not married. I don't have a
   partner at the moment." / 3b "I do have a partner. My husband works in a tech
   company." A three-way reading (not-married-but-partnered) is possible; Aran to
   confirm if it matters.
6. **101 '…' marks inserted** at C=12 per §9a (the sanctioned breathing mark, not a
   text edit).
7. **7 flagged fine seams** — cuts below finite-clause level, §9a flag-for-human-ear:
   "so I always like to find… the easiest way" · "I don't like learning… lists of
   vocabulary" · "for me to be able to speak… a little of her language" · "that I
   don't speak [target language]… well enough to joke" · "either my husband or I… can
   get a raise" · "you can put on… an extra sweater" · "upper intermediate… with two
   others".
8. **Speaker names assigned** — Learner / Friend (raw had none; matches pod-0 sc15's
   role-based speakers).
9. **Scene structure** — split at the 7 topic shifts (contract · origins · languages ·
   family/work · interests · turning the tables · books/films). Structural only.

---

## 5. Placeholders — per-lang_pair resolution proposal

`[target language]` already resolves deterministically at generation time
(`renderPrompt` substitutes the English name locally; the prompt has the model render
the native self-name in target_text, pinned by the consistency ledger). The three new
tokens follow the identical pattern:

- **Mechanism:** a per-course places map (e.g. `services/pod-course-places.json` or a
  column-per-course config), keyed by course code:
  `{ home_country, home_city, target_country, target_city }` — substituted in
  `renderPrompt` exactly where `[target language]` is, plus one rule line in
  `pod-generation-prompt.txt` (native place-names in target_text, known-language names
  in known_text).
- **Semantics:** home = the learner persona's origin, derived from the KNOWN language
  (eng learners → e.g. Britain/Manchester — pod-0 sc6 already uses Manchester/London);
  target = where the target language is spoken (the Friend's country/city).
- **The taste calls (one line each, per course):** pluricentric targets need a pick —
  spa: Spain or Mexico? por: Portugal or Brazil? ara: which country? eng-as-target:
  Britain or the US? Mechanical once picked; the ledger pins each choice.

---

## 6. Recommendation

**Pod-0.5 at C=12.** C=8 is not a real option for this text: 74% of sentences break the
ceiling and 52% have no legitimate seam that rescues them, so a pod-0 placement at C=8
means rewriting most of a field-tested script — exactly what the preserve-Aran's-text
rail forbids — whereas the C=12 pass is done, passes clean, and cost only 7 flagged
fine seams. The content is also cognitively post-pod-0: long biographical monologues,
hedged opinion, meta-humour — pod-0's formulaic exchanges point at it, pod-1's move
drills assume it. And operationally, pod-0 is live Croatian audio: extending it means
renumbering scenes and re-render queues, while a new `pod-0.5` slug is purely additive
and slots into the ladder between existing levels. Tradeoff stated plainly: a separate
pod-0.5 needs the ladder/player to route pod-0 finishers to it (an extension would ride
existing delivery for free), and pod-0 graduates meet 12-syllable breath groups
immediately — mitigated by the fact that Aran field-tested exactly this material with
exactly this audience for 75 hours. On the founder's word: seed with
`node tools/seed-canonical-pods.cjs --file=docs/pods/pod05-english-canonical-DRAFT.md --slug=pod-0.5 --execute`
— after the §3 variant-row parser widening + `variant_key` column, since all
scenario-variant rows now ship.
