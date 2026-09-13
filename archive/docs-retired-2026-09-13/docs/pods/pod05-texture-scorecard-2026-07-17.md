# Pod 0.5 — texture scorecard (the rubric applied to itself)

*2026-07-17. The Realness Rubric (`real-vs-authored-texture-analysis.md` §3) applied to
the pod-0.5 canon (`pod05-english-canonical.md`), scene by scene, scored honestly —
including where the canonicalisation and variant-splitting sanded texture off Aran's
raw text (`pod05-aran-raw-2026-07-16.txt`). §5 is the verdict and the runnable
acceptance checklist for future pod generation (fork B, hybrid + rubric gate). This
document is the proposed acceptance gate for the pod-1 re-sourcing discussion.*

**Method.** All counts computed 2026-07-17 directly from the two files (whitespace
tokenisation; canon = 27 rows / 1,023 words, raw = 17 turns / 1,010 words — the small
word-count delta is the multi-word placeholders, e.g. `[home country]` for
`[country]`). Two measurement rules, both forced by findings below and both now part
of the gate itself:

1. **Strip §9a ellipses before counting.** The '…' marks are pipeline breath notation
   (101 inserted at C=12), not authored text. Counting them as disfluency makes the
   gate flag its own machinery — see R12.
2. **Measure turns at turn-group level.** Scenario-variant rows (`3a`/`3b`…) are
   sibling takes of one conversational moment, not consecutive turns. Row-level
   counting misreads the menu scenes as ping-pong — see R1 and §4.2.

---

## 1. Whole-pod scorecard — canon vs raw, all twelve checks

| # | Check | Raw | Canon | Verdict |
|---|---|---|---|---|
| **R1** | Turn-length CV ≥ ~0.6; ≥1 floor-hold ≥4× median; ≥1 minimal turn | CV 0.84; 7 vs 183 words | CV **0.93** (22 turn-groups, 7–153 words; 153 ≈ 5× median) | **PASS** — variance survived canonicalisation intact. Row-level CV is 1.12, but that figure is inflated by 3-word variant rows; 0.93 is the honest number. |
| **R2** | Marker idiolect, not inventory | "really" ×10, "well" ×7, "so" ×8; zero actually/anyway/honestly/right/exactly/you know | **Bit-identical** — same counts to the token | **PASS** — the verbatim rail preserved the idiolect perfectly. This is the check pod-1 fails hardest, and pod-0.5's pass costs nothing because nothing was rewritten. |
| **R3** | Redundant self-restatement left in | "not a teacher any more, although I used to be" | Verbatim | **PASS** |
| **R4** | Imperfect answers (partial, hedged, deferred) | "I understand a lot of it, I think. Maybe I understand most of it…" | Verbatim | **PASS** |
| **R5** | Question overload happens, gets called out | 4-question burst incl. a duplicate → "So many questions!" | Verbatim | **PASS** |
| **R6** | Unprompted worldview leak | capitalism; the sweater theory; "I'm very lazy" | Verbatim | **PASS** |
| **R7** | Associative drift inside turns | interests → time → children → money → capitalism | Verbatim | **PASS** |
| **R8** | Vagueness on content, precision on self-facts | "a complicated murder mystery" vs "my son is fifteen" | Verbatim | **PASS** |
| **R9** | No buttons; ends where energy runs out | fatigue flagged; ends on "interesting characters in them" | Same ending — but scene-splitting manufactures 6 intermediate scene-ends, one of which now reads as a curtain line (§4.4) | **PASS with a flag** |
| **R10** | Epigram ceiling ~1 per conversation | 0 balanced epigrams | 0 (closest candidate: "people just think they're not understanding you properly" — wry observation, not architected antithesis) | **PASS** |
| **R11** | Enthusiasm economy | 3 exclamations / 1,010 words; strongest praise "That's always really interesting" | 3 / 1,023; identical | **PASS** |
| **R12** | Disfluency structural, not typographic | 1 dash, 0 ellipses; hesitation as restarts and "let me think" | **0 → 101 ellipses; the raw's single authored dash deleted** | **CONDITIONAL PASS** — the underlying text passes (all structural hesitation verbatim); the surface, read source-blind, carries 99 typographic hesitation marks per 1,000 words vs pod-1's 16. The gate must strip §9a notation before scoring, or it fails its own best content. §4.1. |

**Score: 11 clean passes + 1 conditional.** Raw scored 12/12; the single degradation is
notational, not lexical — but it is real (§4), and two of the twelve checks turn out to
need measurement rules before they can gate pipeline output at all.

---

## 2. Per-scene matrix

Distributional checks (R1, R2) and per-conversation ceilings (R9, R10, R11) are
whole-conversation properties — a 2-turn scene cannot meaningfully have a CV, and
"one epigram per conversation" has no per-scene meaning. Scene-level CV is reported as
information, not as a gate. The pointwise checks (R3–R8, R12-structural) are scored
per scene where the scene gives them anything to score; "—" = no opportunity in that
scene, which is normal (real conversations don't exhibit every realness property every
90 seconds — demanding that WOULD be rubric-chasing).

| Scene | Turn-groups (words) | CV (info) | R3 | R4 | R5 | R6 | R7 | R8 | R12-structural | Ellipses | Fine seams |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 Language contract | 3 (49/19/34) | 0.36 | ✓ | ✓✓ | — | — | — | — | ✓ | 8 | 0 |
| 2 Origins | 2 (16/123) | 0.77 | ✓ | — | — | ✓ | ✓✓ | — | — | 16 | 1 |
| 3 Languages | 2 (7/153) | 0.91 | ✓ | ✓ | — | ✓✓ | ✓ | — | — | 22 | **4** |
| 4 Family & work | 5 (16/14/7/36/33) | 0.53 | ✓✓ | — | ✓✓ | — | — | ✓ | — | 6 | 0 |
| 5 Interests | 2 (20/100) | 0.67 | — | ✓ | — | ✓✓ | ✓✓ | — | — | 14 | 0 |
| 6 Turning the tables | 6 (35/33/23/13/148/42) | 0.92 | — | ✓ | — | ✓ | ✓ | ✓ | ✓✓ | 23 | 2 |
| 7 Books & films | 2 (33/69) | 0.35 | — | ✓ | — | — | — | ✓✓ | ✓ | 12 | 0 |

✓✓ = the scene contains one of the rubric's calibration examples (the star instance).

**Scene notes, honest ones:**

- **Scene 1** — the weakest scene distributionally (CV 0.36, no floor-hold) and the
  strongest on R4: "I understand a lot of it, I think. Maybe I understand most of it…
  when you speak slowly" is claim → weaken → re-scope → contingency plan in four
  sentences. Also carries the raw's densest restatement cluster ("I'm asking a lot…
  it takes a lot to be patient"). A per-scene R1 gate would fail this scene; that is
  the gate's error, not the scene's — see §5, rule G2.
- **Scene 2** — the drift exemplar: two questions asked, five topics answered
  (residence history, politeness doctrine, the friend's language, family nerves,
  restaurant duties). One fine seam ("for me to be able to speak… a little of her
  language").
- **Scene 3** — the R1 star (7 vs 153 words) and the R6 self-exposure run ("I'm very
  lazy… I get bored very quickly"). Also **the most ellipsis-damaged scene**: 22 marks
  and 4 of the 7 flagged fine seams, including the worst ("upper intermediate… with
  two others" — a manufactured word-hunt where Aran had none, §4.1).
- **Scene 4** — menu moment #1. R5's calibration example lives here, and so does the
  biggest structural texture cost: raw turn 9 was ONE 96-word floor-holding turn; the
  canon's longest row in this scene is 33 words (§4.2). Grouped CV 0.53 — below the
  whole-text bar even after merging. The floor-hold in this moment is genuinely gone
  as a distributional fact, preserved only as content.
- **Scene 5** — capitalism and the associative slide, verbatim. But the scene split
  makes "Maybe capitalism isn't the best way… to organise societies" the scene's
  final line — verbatim text, manufactured curtain-line position (§4.4).
- **Scene 6** — menu moment #2, on the Friend's side, plus the live-thinking star
  ("The truth is, I'm not sure… So, let me think.") and the biggest surviving
  floor-hold (148 words). The variant regrouping is at its most visible here
  (§4.3), and row 5's continuation coherence (it follows the 3b/4b takes
  specifically) is a presentation risk already logged in the placement analysis §3.
- **Scene 7** — the R9 exemplar: fatigue announced ("I'm not finding it easy… to
  think of any more questions!"), content recalled approximately ("something unusual
  in the countryside"), and the conversation stops on a line that resolves nothing.
  Distributionally flat (CV 0.35) — which is exactly what running out of road looks
  like.

---

## 3. What survived — and why that was cheap

The single most important fact in this scorecard: **every lexical check passes because
nothing lexical was touched.** The preserve-Aran's-text rail meant the canonicalisation
had no opportunity to regress the idiolect to the mean — R2 is bit-identical to the
token ("really" ×10, "well" ×7, zero inventory-markers), the restatements, hedges,
leaks, drift and vague recall are all verbatim, and the turn-length distribution
actually measures slightly WIDER in the canon (grouped CV 0.93 vs raw 0.84).

Pod-1 failed because authoring happened. Pod-0.5 passes because it didn't. The
texture was never at risk from the pipeline's *text* handling — it was at risk from
the pipeline's *structure* handling, and that is exactly where the four real
degradations landed.

---

## 4. Where canonicalisation sanded texture — the honest findings

### 4.1 The ellipsis carpet (0 → 101), and seven marks that fake hesitation

The C=12 pass inserted 101 breath marks. Most sit at clause seams and read as pacing.
But R12's whole point is that typographic hesitation is pod-1's tell (40 em-dashes),
and the canon now out-dashes pod-1 six-to-one per thousand words. Two distinct costs:

- **Source-blind, the check inverts.** Any future gate that counts hesitation marks
  will score pod-0.5 worse than pod-1. The fix is a measurement rule, not a text
  change: §9a '…' is notation, strip before scoring (gate rule G1).
- **The 7 fine seams manufacture disfluency Aran didn't produce.** Below-clause cuts
  read as word-hunts:

  > raw: "but I'm also upper intermediate with two others"
  > canon: "but I'm also upper intermediate… with two others"

  > raw: "I don't like learning lists of vocabulary or studying grammar"
  > canon: "I don't like learning… lists of vocabulary… or studying grammar"

  Aran's real hesitations are structural ("So, let me think.") and sit at points of
  genuine cognitive load; these seven are the pipeline performing hesitation at points
  of syllable arithmetic. This is texture-sprinkling — the exact failure mode the
  rubric warned Option B about — committed by the segmenter. Already flagged for
  human ear (placement analysis §7); this scorecard upgrades that from "worth Aran's
  ear" to **the only place the canon actively fakes a realness signal**. Four of the
  seven are in scene 3.

### 4.2 Variant-splitting chopped the raw's biggest floor-hold

Raw turn 9 — the married/not-married menu plus children, ages, money, and the job
history — is one 96-word turn, the second-longest in the text. The canon renders it
as six rows (16/14/3/4/28/4/4/33 words at row level); the longest surviving piece is
33 words. Even merged back into turn-groups the scene reaches CV 0.53, below the bar
the whole raw text clears. The same happens to raw turn 14 (the Friend's ~200-word
menu-plus-monologue) in scene 6, though there the 148-word tail survives as one row.

This is a real trade, and it was traded for something the rubric itself prizes: the
menu structure (§1.10 of the analysis — the answer-space that makes pod-0.5 a
conversation the learner will *have*). The founder's menu-lines ruling makes each
variant a complete, drillable utterance; complete utterances are short. The cost is
that **in the two menu scenes, floor-holding as a heard experience depends entirely on
the player** — if playback runs 3a, 3b, 4a, 4b, 4c as a sequence of six short takes,
the learner hears ping-pong where Aran wrote a monologue. The placement analysis
already requires take-grouping in the player; this scorecard adds the texture reason.

### 4.3 Regrouping normalised the raw's strangest structure

Aran's raw interleaves contradictory branches mid-stream:

> raw: "Yes, I'm married. No, I'm not married. I have a daughter and a son. We don't
> have children. I don't have children. My son is fifteen and my daughter is
> seventeen."

> canon: 3a "Yes, I'm married." / 3b "No, I'm not married." / 4a "I have a daughter
> and a son. My son is fifteen… and my daughter is seventeen. I love them, of
> course… even when they spend all my money." / 4b "We don't have children." / 4c "I
> don't have children."

Every sentence verbatim, only adjacency changed — but adjacency IS texture here. The
raw's jarring oscillation is the single most inimitable structure in the text (no
fictional character could produce it); the canon's rows each read as a tidy,
coherent mini-answer — closer to a normal authored character per row. The
answer-space survives at group level; the strangeness is sanded at row level. Right
call (the raw ordering was unshippable as audio takes), but it should be counted, and
it is counted here.

### 4.4 Scene-splitting manufactures curtain lines

The raw is one unbroken conversation; the canon cuts it at 7 topic shifts. Six
mid-points now exist where the text "ends" — and position does register as authorial
intent. The sharpest case: "Maybe capitalism isn't the best way… to organise
societies" was mid-flow in the raw, one more link in a drift chain; as scene 5's final
line it reads like a written punchline — a button the author never wrote. Scene 3's
ending ("people just think they're not understanding you properly") has a touch of
the same. Nothing to fix in the text — the splits are structural necessities — but a
future gate must score R9 on the *conversation's* ending, not on scene endings, and
should specifically check whether a scene split has promoted a mid-turn line into a
curtain-line position it didn't earn (gate rule G3).

### 4.5 Two zero-cost notes, for completeness

- **The raw's one authored dash died** ("I work in education - I'm not a teacher any
  more" → "I work in education… I'm not…"). Trivial, and the seam was needed anyway —
  but the canon now contains zero authored disfluency punctuation, and the one mark
  Aran chose is indistinguishable from pipeline notation. Worth one line in the log;
  it gets one line here.
- **Scene titles add a register the dialogue doesn't have** ("So Many Questions!" —
  an exclamation mark in a title over a text with three in a thousand words). Titles
  are metadata, not learner-facing dialogue; zero cost unless the player ever
  surfaces them as content.

---

## 5. Verdict — is pod-0.5 the bar, and what exactly does the gate run?

**Yes. Pod-0.5 is the quality bar for future pods.** It scores 11 clean + 1
conditional against a rubric its own source calibrated at 12/12, and every degradation
found is structural or notational — introduced by segmentation machinery every future
pod will share, not by the writing. The bar it sets is therefore precise: **future pod
content must match pod-0.5 on the lexical checks BEFORE the pipeline touches it, and
the pipeline's own structural costs must be measured with the rules below so they are
neither hidden nor double-counted.**

What exactly makes it pass where pod-1 failed — reduced to the mechanism: pod-1's
words were sampled from the centre of the ensemble distribution (maximal typicality);
pod-0.5's words were sampled from one real person's off-centre distribution and then
**never rewritten**. Everything else — the CV, the peaked marker palette, the failed
answers, the capitalism — is downstream of those two facts. So the gate has two jobs:
verify the off-centre sampling (checks 1–12) and verify the never-rewritten rail held
(deviation log + verbatim diff), and the measurement rules keep the pipeline's own
marks from polluting either.

### The acceptance gate (runnable, source-blind, per candidate pod canon)

**Measurement rules — apply before any counting:**
- **G1.** Strip §9a ellipsis marks; score the underlying text. Track authored
  dashes/ellipses separately from pipeline notation (require the deviation log to
  distinguish them, as pod-0.5's does).
- **G2.** Merge scenario-variant rows into turn-groups; distributional checks run on
  turn-groups across the WHOLE conversation, never per scene.
- **G3.** R9 scores the conversation's ending; additionally, flag any scene split
  that promotes a mid-drift line into scene-final position.

**The twelve checks, with pod-0.5's calibration values:**
1. **Turn variance:** turn-group CV ≥ 0.6 whole-conversation; ≥1 turn ≥4× median; ≥1
   turn ≤10 words. (pod-0.5: 0.93, 153 vs median ~28, min 7.)
2. **Marker idiolect:** per speaker, top-3 marker types carry the clear majority of
   marker tokens; total palette narrow (pod-0.5: really/well/so dominate; ~6 types);
   zero even-spread inventory (15+ types at 2–6/1,000 each = fail); speakers'
   palettes must differ from each other.
3. **Restatement:** ≥1 redundant self-restatement left standing.
4. **Imperfect answers:** a meaningful share of questions answered partially, hedged,
   deferred or obliquely — not every question serviced completely in the next turn.
5. **Overload/misfire:** somewhere, questions stack, repeat, or misfire; a call-out is
   a plus.
6. **Worldview leak:** ≥1 unprompted, self-exposing stance tangent to the scene's
   business.
7. **Drift:** ≥1 turn whose ending its opening doesn't predict, moved by associative
   chaining, not signposted pivots.
8. **Vagueness placement:** content recall approximate; precision reserved for
   self-facts. Crisp prop-specifics everywhere = fail.
9. **No buttons** (under G3). Visible fatigue is a plus.
10. **Epigram ceiling:** ≤1 balanced aphorism per conversation.
11. **Enthusiasm economy:** exclamations ≈ ≤3/1,000 words; superlative praise ≈ 0;
    warmth mild.
12. **Structural disfluency** (under G1): hesitation appears as restarts/re-scoping/
    "let me think", not typography. Authored hesitation marks ≈ 0–1.

**Pipeline riders (the two lessons this scorecard adds to the rubric):**
- **P1. Fine-seam budget:** below-clause ellipsis cuts are manufactured disfluency —
  keep them near zero, log every one, and route them to a human ear before audio.
  (pod-0.5: 7, all logged, concentrated in scene 3 — still awaiting Aran's ear.)
- **P2. Menu presentation:** the player must present variant rows as alternative
  takes of one moment. In menu scenes the floor-holding texture lives entirely in
  playback; sequential rendering of takes converts a monologue into ping-pong.

**Pass bar** (proposed, taste call remains the founders'): all of 1, 2 and 12
mandatory — 1 and 2 are the unfakeable distributional core and 12 is the
cheapest-to-fake surface; plus ≥7 of the remaining 9; plus both pipeline riders
clean or explicitly waived. Pod-0.5 passes this bar today. Pod-1's canon scores ~1/12
and fails both mandatory distributional checks — which is the re-sourcing discussion's
starting fact.

---

## 6. Open items

1. The **7 fine seams** still await a human ear (placement analysis §7) — this
   scorecard raises their priority: they are the one place the canon fakes a signal
   the rubric exists to protect.
2. **Player take-grouping** (P2) is the one place pod-0.5's realness can still be
   destroyed downstream of a passing gate — the texture case now documented, the
   implementation already required by the placement analysis §3.
3. The **pass bar** in §5 is a proposal; where it sits is the founders' taste call
   (the rubric doc said the same — this scorecard just supplies the first calibrated
   candidate).

*Method note: all figures re-derivable in minutes from the two named files; counting
is whitespace tokenisation with '…' stripped per G1, variant rows grouped per G2.
Quotes verbatim.*
