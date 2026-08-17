# A-134 — the bare-ගෙ phrase cluster (eng_for_sin), 2026-08-17

24 practice phrases across seeds 60, 154, 155, 156 and 158 carried a standalone `ගෙ`
token on the Sinhala known side. 21 were voiced to learners; 3 at seed 158 were silent
(a text-edit trigger had nulled their link and a gate had correctly refused to re-render
text still containing the placeholder). All 24 are now repaired, re-rendered and live.

## What ගෙ actually was

The incoming hypothesis — that `ගෙ` is a corruption of `ගැන` ("about") — is right for
**7 of the 24** and wrong for the other 17. Applied blanket it produces `ගැන ගැන`, turns
a directional "to a restaurant" into "about a restaurant", and leaves several rows still
meaningless.

What the corpus actually shows is a generator that emitted a small closed set of
`ඒ ග…` tokens — `ඒ ගාවෙ`, `ඒ ගැන`, `ඒ ගෙදර`, `ඒ ගෙ` — as **fillers in whatever slot it
could not fill**, and dropped the verb, the subject and the question particle with them.
`ගෙ` is not one substitutable token; in 9 rows it stands for nothing at all. Compare
`රෙස්ටෝරන්ට් ගෙ ඒ ගාවෙ ඒ ගෙ` ("do you want to go to a restaurant with them tonight?"):
three fillers, no verb, no question marker.

The `decomposition` column of every one of the 24 is **intact and correct** — it carries
the right lego ids and the right known-side Sinhala. That is what made a grounded rebuild
possible rather than a guess.

## Classification of all 24

| ගෙ stood for | rows |
|---|---|
| `ගැන` "about" | 7 — S0060L01U06, S0158L01U01, S0158L01U02, S0158L01U05, S0158L02U01, S0158L02U03, S0158L02U04 |
| the dative `-ට` on "restaurant" | 7 — S0156L01B02/B03/U01/U02/U03/U04/U05/U06 (8 rows, one of which also needed `ගැන`) |
| `ගැන` **and** the dative | 2 — S0158L01U06, S0158L02U05 |
| the instrumental `-යෙන්` (ඉංග්‍රීසියෙන්) | 1 — S0158L01U04 |
| **nothing — pure filler** | 5 — S0154L01U05, S0154L02U04, S0154L02U05, S0155L02U03, S0155L02U04, S0158L02U06 |

Every row also lost material beyond the `ගෙ` itself, so all 24 were rebuilt rather than
patched. 22 of 24 are grounded on a course string that already existed; 2 required a
construction (`කවුරුහරි එක්ක` "with someone", by analogy with the taught `ඔයා එක්ක`).

## Method

* **Every Sinhala string was sliced out of a database row at runtime** (`parts.cjs`).
  Nothing was hand-typed. Two earlier workers on this plate silently corrupted Sinhala
  into Telugu look-alike glyphs by typing it; this makes that failure impossible.
* Two independent native-speaker passes via the Claude CLI (`opinion1.txt`,
  `opinion2.txt`). The first raised 11 objections; **6 were refuted by measured course
  usage** (e.g. it wanted `කමක් නැද්ද`, which appears 0 times against 31 for the taught
  `කමක් නෑද`), **3 were accepted** (`අපට`→`අපිට`, 220 course hits vs 34;
  `ඉගෙන ගැනීම`→`ඉගෙනීම`, 15 vs 1), and **2 were held with the reason recorded** (see
  Held, below). The second pass, given those constraints, returned 23 GOOD and 1 BAD;
  that last one — a real `ඉගෙනගන්න එකට` parsing ambiguity — was fixed by reordering.
* **ZUT** run over the whole 11,719-phrase corpus with the repairs substituted in:
  136 pre-existing conflicts before, 136 after, **0 new**, 0 duplicate known strings
  among the 24.
* **Known-side introduced-before-used**: the repo's own gate is INERT for Sinhala
  (`tokenizeKnown()` splits on an ASCII-only class, so Sinhala tokenises to nothing and
  it always returns 0). `knowngate.cjs` is an independent Unicode-aware implementation —
  see its header for the method and for which way it errs.
* Learner-progress migration (plate A-111 protocol): **verified, genuine no-op**.
  `lego_progress` holds 0 rows for eng_for_sin (of 135,874 estate-wide), `seed_progress`
  0, and 0 rows anywhere reference the 24 slots. No slot identity changed in any case —
  only `known_text` on existing rows.
* Audio: rendered on the compressor-free chain, 24/24 passed every gate on the first
  take, 24 insurance spares kept. Make-before-break throughout; **no old clip was
  deleted** — the 21 superseded clips are still live on S3 and in `course_audio`.

## The rate model

The presentation model (3143 + 45.4 × chars) does not transfer to phrase/known clips.
Refitted here on this course's own known/sin clips in this voice:

| population | n | model | sd |
|---|---|---|---|
| all known/sin | 13,412 | ms = 1398.2 + 45.57 × chars | 149.9 |
| excluding `...` | 13,338 | ms = 1387.6 + 45.78 × chars | 133.3 |

This independently **reproduces** the earlier worker's figure (1398.0 + 45.58x, sd 149.6,
n=13,301) to three significant figures on a slightly larger set. It fires on 1.0% of
known-good clips at |z|>3, so it is a gate and not a rubber stamp. None of the 24 texts
contain `...`, so the ellipsis correction was not engaged.

## The gate

`gates.cjs` extends the null-sweep gate again: **gate 5d asserts no standalone `ගෙ`
token is ever voiced.** It is word-boundary aware and runs over the TTS word boundaries,
so `ගෙදර` ("home") and `ගෙන` — real words containing `ගෙ` — still pass. Self-tested
both ways. Three presentation-only gates (headword, final `ඉතින්`, example-voiced) do not
transfer and are replaced by a stronger one: every word of the phrase must be voiced.

## Held, with reasons

* **`මේ රෑ` for "tonight"** — the reviewer is right that `අද රෑ` is the idiomatic form and
  more common in this course (34 vs 18). But `මේ රෑ` is lego S0031L02, and the word
  mapping of these very rows points at it. Changing the known text would desync the
  decomposition. This is a **lego-level issue for the S0031L02 owner**, not a phrase fix.
* **`ලියන්නෙ` vs `ලියන්න`** — held at `ලියන්නෙ` for consistency with the sibling row in
  the same seed and 30 other course uses. The `-න්නෙ`/`-න්න` split is course-wide.
* **`අපිට මුණ ගැහෙන්න` for "meet us"** — held; it is the course's own verbatim string
  (S0138L01U01) for exactly this English. The reviewer's `අපිව` first appears 200+ seeds
  later.

## Disclosed breach

`එකකට` (in `රෙස්ටෝරන්ට් එකකට`) is used at seeds 156 and 158 but its exact form first
appears at seed 161 — 10 tokens, disclosed rather than hidden. Adjudicated as acceptable:
every morpheme in it is taught earlier (`එක` + dative at s95 `බස් එකට`, indefinite `-ක්`
at s155 `කිහිපයක්`), it is the course's **own** rendering of exactly this English at
seeds 161 and 167, and the earlier-attested alternative `එකට` is a homograph of
"together" (S0133L02) which would have been genuinely ambiguous here.

---

# Adversarial verification

**EXPLICIT GAP: an independent verifier was refused on the fan-out depth ceiling** (this
job already sits at depth 1 of a 2-level tree). Everything below is **self-review**, plus
three independent linguistic opinions taken via the Claude CLI — which is not a dispatched
worker. Weigh it accordingly: mechanical claims below are re-derived from the live database
rather than from my own logs, but no second pair of eyes signed them off.

`refute.cjs` runs nine attacks against the live database. **7 confirmed, 1 refuted, 1 done
separately.**

| # | attack | verdict |
|---|---|---|
| 1 | text/audio desync — byte-compare `known_text` vs `course_audio.text` | CONFIRMED, 0/24 desync |
| 2 | re-derive the defect set across all four tables | **REFUTED — see below** |
| 3 | the 3 silent rows, and no new silence | CONFIRMED, 0 silent, 24/24 voiced |
| 4 | make-before-break | CONFIRMED, 21/21 superseded clips still in the DB and HEAD-200 on S3 |
| 5 | learner path, **all 24 not a sample** | CONFIRMED, 24/24 HTTP 200, decode within 60ms |
| 6 | ZUT from live data | CONFIRMED, 136 course-wide conflicts, **0 involving the 24** |
| 7 | the Sinhala itself (hostile third pass) | CONFIRMED, 24/24 OK |
| 8 | gate5d against 10 adversarial inputs | CONFIRMED, 0 wrong |
| 9 | independent refit of the rate model | CONFIRMED, reproduced: 1398.4 + 45.56x, sd 149.8, n=13,438 |

## Attack 2 — what it refuted, and what it did not

My scan of `course_practice_phrases` alone was too narrow. **454 `course_audio` rows in
this course still hold a bare `ගෙ` in their text.** Reachability, measured through every
content pointer that exists:

| pointer | rows |
|---|---|
| `course_legos.presentation_audio_id` | **4** |
| `course_legos.known_audio_id` | 0 |
| `course_practice_phrases.known_audio_id` | 0 |
| `course_practice_phrases.presentation_audio_id` | 0 |
| `course_seeds.known_audio_id` | 0 |

So **450 of the 454 are inert** — superseded takes and orphans that nothing points at,
including the 21 clips this job itself just superseded and deliberately kept.

The **4 that are reachable are all presentation clips carrying the `ඒ ගෙ` placeholder** —
a different defect class, assigned to the sibling worker, and one of them (S0207L02) sits
on this job's explicit do-not-touch list. **They were left alone, on purpose.**

The honest restatement of my claim: zero bare `ගෙ` remains in the **text** of any phrase,
lego or seed, and zero is reachable through any practice-phrase pointer. Four remain
reachable as presentation audio and are somebody else's scope.

## Soft near-conflict, reported for judgement, not widened into a failure

The hostile reviewer noted that S0154L02U04 renders "meet" as `හමු වෙන්න` while
S0154L02U05 renders it `මුණ ගැහෙන්න`. Both are correct Sinhala and both are the string
the course itself teaches for their respective English. Measured against a snapshot taken
**before** my edits, the course already carried three renderings of "meet" across 78
phrases: `හම්බවෙන්න` (39), `හමු වෙන්න` (32), `මුණ ගැහෙන්න` (7). **The split predates this
job and was not introduced by it.** It is a translation-choice question for the course
owner, not a defect in these rows.
