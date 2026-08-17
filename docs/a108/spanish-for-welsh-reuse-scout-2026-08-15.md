# Spanish-for-Welsh reuse claim — scout report

**Claim under test (Kai):** "Building Spanish-for-WELSH-speakers is cheap, because it reuses the existing `spa_for_eng` course entire TARGET side INCLUDING all its recorded Spanish audio, and only the KNOWN side has to be rebuilt in Welsh."

## Verdict: **Partly confirmed, mostly demolished.**

The Spanish *audio* really is reusable — mechanically, cross-course audio references would serve to a learner today (nothing in the serving code filters by `course_code`), and 36,618 of `spa_for_eng`'s clips are cleanly Spanish-only with no English baked in. That part of the claim holds. But "only the known side has to be rebuilt" understates the job on two fronts: (1) the known side is not a thin text layer — LEGO decomposition, tiling and the JSON `components`/`decomposition` structures are joint properties of *both* languages, and Welsh's grammar doesn't map onto Spanish the way English's does, so ~17,800 lego/phrase rows need re-derivation, not translation; and (2) ~1,190 of the audio rows Kai would count as "the expensive half that already exists" are bilingual clips with spoken English narration baked into the same file as the Spanish — those have to be regenerated too, they can't be split. Net effect: real Spanish-only audio reuse is real and valuable, but it's closer to "the hardest 45% of the audio survives" than "only the known side is a rebuild."

---

## 1. Audio separation (`spa_for_eng`, 78,946 `course_audio` rows total)

Counts by role, verified against actual `language` column values and **sampled `text` content** (the `language` column alone is not trustworthy — see below):

| Role | Language codes seen | Count | Spoken language |
|---|---|---|---|
| `known` | eng | 33,977 | **known (English)** |
| `presentation` | eng | 5,057 | **known (English)** — "The Spanish for: 'X', is:" |
| `pod_fine_known` | en, eng | 2,027 | **known (English)** |
| `instruction` | eng | 48 | **known (English)** |
| `encouragement` | eng | 26 | **known (English)** |
| `bookend_listen_intro` | eng | 1 | **known (English)** |
| `bookend_listen_outro` | eng | 1 | **known (English)** |
| `welcome` | eng | 1 | **known (English)** |
| **Known subtotal** | | **41,138** | |
| `target1` | spa, es | 18,990 | **target (Spanish)** |
| `target2` | spa | 16,983 | **target (Spanish)** |
| `pod_take_g` | es-ES, spa | 645 | **target (Spanish)** — human/TTS takes |
| **Pure-target subtotal** | | **36,618** | |
| `pod_explainer` | auto, es, es-ES, spa | 1,190 | **MIXED — bilingual, single clip** |

**Sanity check:** 41,138 + 36,618 + 1,190 = 78,946. ✓ matches total.

**The `language` column lies for `pod_explainer`.** Sampled actual text (not truncated):
```
role=pod_explainer lang=es-ES: "\"Un café con leche\". means A coffee with milk. \"por favor\". means please."
role=pod_explainer lang=auto:  <voice xml:lang="es">Sí</voice> means Yes, <voice xml:lang="es">gracias</voice> ...
```
These are single audio files where one TTS voice speaks BOTH the Spanish phrase and the English "means X" gloss in the same clip (`auto` rows are literally SSML with embedded `<voice xml:lang="es">` tags around Spanish snippets inside an English carrier sentence). `pod_fine_known` (2,027 rows) and `pod_take_g` (645 rows) sampled clean — genuinely single-language.

**The Welsh job is not "the known-language rows."** It is at minimum the 41,138 known-only rows, **plus** the 1,190 `pod_explainer` mixed clips (they contain spoken English that must change), because a bilingual clip can't be half-relinked — **42,328 rows, 54% of the course's audio**, not "half."

## 2. Cross-course reuse — the decisive mechanical question

**(a) Does this happen today?** Checked `spa_for_eng`'s own `course_legos`/`course_practice_phrases` FK columns (`known_audio_id`, `target1_audio_id`, `target2_audio_id`, `presentation_audio_id`) against `course_audio.course_code` — **zero cross-course references** in either table for this course. Widened to a whole-estate scan of `course_legos` (93,854 rows, all 3 audio-id columns): found **exactly one** stray cross-course reference estate-wide — `bre_for_fra`'s `known_audio_id` pointing at a `zho_for_jpn` clip. One row out of 93,854. This reads as a data-integrity accident, not an in-use mechanism — nothing in the pipeline currently relies on or exercises cross-course audio linking.

**(b) Would it actually serve?** Read `ssi-learning-app/api/_utils/audioAccess.ts::lookupAudioRecord` — the function every audio URL resolves through. It queries `course_audio` with **`.eq('id', audioId)` only** — no `course_code` filter anywhere in the lookup. `course_code` is used elsewhere for two unrelated things: (i) premium/entitlement gating, keyed off the **route's** course code, not the audio row's; (ii) revision-stamping for the ~95 estate-wide clips that have been swapped. Neither blocks a cross-course id from serving.

**Conclusion:** reuse would be **mechanically free** — a `spa_for_cym` course_legos/course_practice_phrases row could point its `target1_audio_id`/`target2_audio_id` at a `spa_for_eng` course_audio row's UUID and it would serve to a learner exactly as-is. But this is an *unused capability*, verified by code-reading and a near-zero real-world occurrence count, not a proven, battle-tested pattern. First real use of it carries first-use risk (nothing in the pipeline's write-path, QA tooling, or audio-repair tooling has ever had to reason about a clip belonging to a different course than the row referencing it — e.g. `docs/architecture` audio-repair doctrine's make-before-break rules assume same-course).

## 3. The actual rebuild scope — row counts, not adjectives

For a `spa_for_cym` build reusing `spa_for_eng`'s Spanish target audio:

| Table | Total rows | Known-side columns needing rewrite | Notes |
|---|---|---|---|
| `course_seeds` | 668 | `known_text` (668), `known_audio_id` (668) | `target_text`/`target1_audio_id`/`target2_audio_id` reusable |
| `course_legos` | 1,475 | `known_text` (1,475), `known_audio_id` (1,473), **`components` jsonb (all rows with components)** | components carry nested `known` strings per component, not just the top-level column |
| `course_practice_phrases` | 16,328 | `known_text` (16,328), `known_audio_id` (16,016), **`decomposition` jsonb (15,679 populated)** | decomposition carries a `known` string per LEGO-slice, keyed to English word boundaries |

**The nested JSON is the real cost driver, not the flat columns.** Sampled `course_legos.components`:
```json
[{"known":"so","target":"así que"},{"known":"I hope that","target":"espero que"}]
```
Sampled `course_practice_phrases.decomposition`:
```json
[{"known":"I needed","legoId":"S0296L01","target":"necesitaba",...},
 {"known":"to speak","legoId":"S0001L02","target":" hablar",...}, ...]
```
Every node in both structures embeds an English string aligned to a Spanish/lego slice. These aren't a find-and-replace target — they encode *where the English known-language boundaries fall relative to the target LEGOs*, which is exactly the thing that changes when the known language changes (see §4).

**`display_tiling` and `known_gloss_segments` are unused for this course** (0 populated rows in both `course_legos` and `course_practice_phrases` for `spa_for_eng`) — not a rebuild cost here, though other courses may populate them.

## 4. Is it really just translation? — No. Quoted doctrine.

`ralph-methodology.md`, "The Known Side Is a Controlled Language":

> "Reconstructability (Principle 1) holds in **both** languages. The English prompt is **not** free natural English — it is a designed, controlled language. Every prompt must compose from: (a) the known-glosses of introduced LEGOs, (b) the **free class**... and (c) constructions **licensed by a debuted carrier**."

And directly on point, "2026-02-05: Decomposition Should Be Driven by Phrase Quality":

> "Agent decomposed Dutch 'how to speak as often as possible' → 'hoe je zo vaak mogelijk spreekt' into separate A-LEGO 'how' → 'hoe' — but standalone 'hoe' can't make useful BUILD phrases because Dutch subordinate clauses require conjugated verbs that haven't been introduced yet... Structural mismatches between languages get absorbed into M-LEGOs."

This is the crux: **LEGO boundaries are a joint property of the known and target grammars**, not a target-only decomposition with an English label glued on. Welsh doesn't map onto Spanish the way English does — Welsh has VSO word order, its own mutation system, and different periphrastic-verb structure (`dw i'n mynd i...` vs English `going to`) that changes where a natural LEGO boundary falls. The existing `spa_for_eng` decomposition — 1,475 legos, 15,679 decomposition-tagged phrases, all boundary-derived from *English* structure — cannot be relabelled into Welsh; it has to be re-derived so that Welsh LEGOs still produce valid BUILD/USE phrases and pass ZUT/tiling in Welsh's own grammar. That re-derivation is decomposition-from-scratch work on the same order of magnitude as building a new course's known side, even though the Spanish target strings and target audio survive unchanged underneath it.

**One mitigating data point:** `spa_for_cym` already has a **`course_seeds`-level draft** — 668 rows, `known_text` already translated to Welsh, `target_text` matching `spa_for_eng` 667/668 (one seed differs by word order — `llevo aprendiendo` vs `llevo ... aprendiendo`). This removes the seed-translation step but **does nothing for LEGO decomposition** — `course_legos` for `spa_for_cym` has 0 rows, `course_audio` has 0 rows. The seed corpus is shared estate-wide (all 9 `*_for_cym` shells show 668/668 or 667/668 target-text match against their `_for_eng` sibling), so this head start exists for all nine, not just Spanish.

## 5. Best first candidate for Welsh-known — ranked

Considering existing target audio scale, the `*_for_cym` draft-shell head start, and target-language distance from Welsh (a VSO Celtic language):

| Rank | Course | Target audio rows (`target1`+`target2`) | `*_for_cym` shell status | Notes |
|---|---|---|---|---|
| 1 | **spa_for_cym** | 35,973 (largest of the 9) | 668 seeds drafted, 0 legos, 0 audio | Biggest existing Spanish-audio asset to reuse; Spanish/Welsh are both non-mutually-intelligible with English so no known-side interference risk from English structural leakage |
| 2 | fra_for_cym | 29,914 | 668 seeds drafted (668/668 match) | Second-largest target audio; French closely related to Spanish decomposition patterns, easier contract reuse |
| 3 | deu_for_cym | 28,049 | 668 seeds drafted (668/668 match) | Large audio base; German's verb-second order is a bigger known/target mismatch risk than Romance targets |
| — | ita/por/ara/jpn/kor/zho _for_cym | 22,543–28,293 | seeds drafted, 0 legos/audio each | Smaller target-audio bases; zho/jpn/kor/ara carry non-Latin-script complications on top |

**Veracity/QA completeness gap (explicit):** `veracity_pass` is essentially unrun estate-wide for target audio (0 passed for 7 of 9 courses including spa; only deu at 761/28,049 and fra at 57/29,914 have any checked rows) — raw row counts, not verified-clean counts. "35,973 Spanish clips exist" is not the same claim as "35,973 Spanish clips are known-good"; nobody has audited that at scale.

**Spanish wins on the numbers** — largest reusable target-audio base, and Kai's specific claim was about Spanish, so it's also the one already partially staged (`spa_for_cym` draft seeds exist). It is the best first candidate, but "best" here means "least of a very large job," not "cheap."

---

## Gaps (explicit)

- Did not exhaustively scan `course_practice_phrases` (826,577 rows estate-wide) for cross-course audio references — only checked `spa_for_eng`'s own rows (0 found) and the smaller `course_legos` table estate-wide. The one stray `bre_for_fra`/`zho_for_jpn` reference found in `course_legos` may or may not have siblings in `course_practice_phrases`; a prior memory note ("Orphan jpn clip linked by 21 courses") suggests a similar-shaped issue may exist elsewhere in the estate but I did not reconcile the two.
- Did not test an actual relink end-to-end (would require generating/mutating data — out of scope for a scout leg; this report is read-only).
- Did not price out the LEGO-decomposition re-derivation in agent-hours/cost; only established that it is structurally required and roughly rebuild-from-scratch-sized, not a translation pass.
- Did not check whether `synonym-choice-architecture.md`'s translation-choice step (upstream of decomposition) has language-pair-specific guidance for Welsh as a known language — the doc's `docs/pair-contracts/{course_code}.contract.cjs` model implies a `spa_for_cym` contract would need deriving from scratch, but I did not check whether one exists.

---

**Landing line:** no commits — this was a read-only scout leg (DB queries + code reading only, per the SCOUT LEG brief). This report itself is a new file (`docs/a108/spanish-for-welsh-reuse-scout-2026-08-15.md`) written to disk but not committed to git.
