# Seeds 1-10 backfill — PROPOSAL for review

**Status: PROPOSAL ONLY. Nothing in this document has been applied.**
Date: 2026-08-04 · Scope: seeds 1-10, 16 courses + `fin_for_eng` reference · Read-only DB access throughout.
~1,230 phrases proposed across all 16 courses. No inserts, no updates, no deletes, no TTS, no audio-pass queued.

---

## 0. Decisions you need to make (everything else is detail)

Nothing proceeds until these are settled. Each links to the section with the evidence.

| # | Decision | Where | My recommendation |
|---|---|---|---|
| 1 | **Is `lego_count` repaired first?** It is corrupt estate-wide and already produced one false finding in this document. | §2 | **Yes — a separate sweep, before any backfill.** |
| 2 | **Trim Spanish?** Both Spanish courses land near 400 vs Finnish's 347. | §4 | **Yes — trim to Finnish's shape.** Your rule says a smaller correct set wins. |
| 3 | **Is deriving non-lego morphology sanctioned?** Korean coins `하고 싶어요`, Japanese needs particle changes, `spa_for_eng` S10L02 needs unseen gerunds. It changes how many phrases are legitimately available in three languages. | §6.2, per-course B | **Answer once, globally.** Absent a ruling I'd drop the 8 `spa_for_eng` S10L02 rows as the stricter reading. |
| 4 | **Do the French courses get a `le`/`de` lego?** Without it the whole "to learn French" family is ungrammatical in *both* — and three rows of that shape are already live and wrong. | §6.4 | **Add it.** It unblocks ~10 rows in `fra` and ~13 in `fra_ca` and fixes 3 existing defects at once. |
| 5 | **The two Chinese ZUT clashes** (想起 vs 记住). Needs a ruling, not a backfill. | §6.1 | Pick one verb per known prompt; no phrases proposed in that space. |
| 6 | **The Portuguese contraction bug** — `por` bakes in `da`, `por_br` bakes in `a`; each breaks the half the other covers. | §6.4 | Redefine both legos; fix is in the per-course section. |
| 7 | **`ara_lb` seed 1 teaches a constituent order seed 9 contradicts.** First exposure sets the order the course later abandons. | §6.4 | Fix S1 to match S9. Requires editing existing rows. |
| 8 | **Delete the duplicates?** 6 same-lego build/use pairs, 5 surviving `fra_for_eng` pairs, 7 in `cat_for_spa`. | §8 | Do the 6 same-lego pairs; hold the rest. **None deleted.** |
| 9 | **Is `québécois` the right target for the language name?** `fra_ca` renders "in French" as `en québécois` throughout. No record found that this was deliberate. | §7 fra_ca | Confirm or reject — if wrong it is a find-and-replace across 131 rows, not a rewrite. |

**Before *anything* is written:** none of the ~1,230 proposed phrases has native-speaker verification,
and ZUT was checked against seeds 1-10 only — a clash with seeds 11+ is unverified everywhere. See §10.

---

## 1. The headline

**The gap is density, not missing content.** Almost nothing is *absent*; a great deal is *thin*.

Across all 17 courses there is exactly **one** `is_new` lego in seeds 1-10 that introduces material and
never combines it:

| Course | Lego | Text |
|---|---|---|
| `ita_for_eng` | S1L04 | with you / con te — has the lego restated and nothing else; Finnish's equivalent has 5 rows |

Everything else that looked barren is either a **seed-1 LEGO 1** (correct by your rule — Finnish's is
barren too) or an **`is_new=false` re-introduction** (correct — 3 of those: `fra_for_eng` S3L02,
`kor_for_eng` S4L02 and S4L03). All 17 courses have all 10 seeds present.

### The actual defect, stated once

Every course except Finnish holds a **near-constant ~3 `build` / ~5 `use` per lego from S2 to S10,
regardless of how much inventory has accumulated.** Finnish *grows* with inventory — 1 combination at
S1L02, 16 at S2L02, 17 at S7L01. Three workers on three unrelated language families reached this
independently. That flat curve is the signature of a **fixed per-lego generator quota**, not of
exhaustive combination coverage. It is why the deficits below are so uniform.

---

## 2. ⚠️ `lego_count` is corrupt — read this before trusting any prior audit

`lego_count` cannot be used to identify combination phrases. Multi-lego phrases are widely stored as
`lego_count = 1`.

This is not academic: **it manufactured a false finding in an earlier draft of this very proposal.**
`deu_for_eng` seed 10 appeared truncated — S10L02/L03/L04 reading as zero-combination legos. They are
not. They hold 7, 8 and 8 fully-formed phrases each, all stamped `lego_count = 1`. The German worker
caught it; the correction is folded through every number in this document.

Suspect rows (stored `lego_count = 1` but ≥ 4 known-side words), seeds 1-10:

| Course | Suspect | Course | Suspect |
|---|---:|---|---:|
| `deu_for_eng` | 32 | `deu_at_for_eng` | 4 |
| `zho_for_eng` | 24 | `kor_for_eng` | 3 |
| `fra_for_eng` | 7 | `spa_for_eng` | 3 |
| `fra_ca_for_eng` | 5 | `fin_for_eng` | 3 |
| `ara_for_eng` | 5 | `ara_lb_for_eng` | 3 |
| `ara_eg_for_eng` | 4 | *(others)* | ≤ 2 |

**Recommendation: a `lego_count` repair sweep, separate from and prior to this backfill.** Otherwise
the next audit raises the same false alarm. Not attempted here — it is a mutation.

Every count in this document is therefore derived **from phrase text**, not from `lego_count`: a
"combination phrase" is a `build`/`use` row whose `known_text` differs from its own lego's
`known_text`. As a sanity check, that method independently reproduces Finnish's **347** — the figure
Kai quoted — which is good evidence it is measuring the right thing.

---

## 3. What "Finnish-shaped" actually means (verified against the data, not assumed)

- **`build`** = partial combinations containing the new lego, usually *without* the subject opener.
  S1L05 `now` → "to speak now", "finnish now", "with you now", "to speak Finnish now", "to speak with you now".
- **`use`** = the fuller sentences with the opener → "I want to speak Finnish with you now".
- **`component`** = decomposition pieces of the lego itself ("I", "want"). Generated, not authored —
  **nothing in this proposal adds component rows.**
- Density grows as legos accumulate.

Two caveats about the gold standard, worth knowing before weighting it:

- `fin_for_eng` is **status `draft` and entirely unvoiced** — all 386 of its seeds-1-10 rows have no
  audio. It is a text gold standard, not a shipped one.
- **347 is a shape benchmark, not a quota.** Finnish earns roughly half its count from subject-less
  `build` variants (`puhua suomea` vs `mä haluun puhua suomea` = two distinct strings). Korean and
  Japanese drop the subject anyway, so each such pair collapses to one row — those courses cannot
  reach 347 without padding, and should not be pushed toward it.

---

## 4. Totals — current vs proposed

Corrected counts. Finnish = 347.

| Course | Status | Now | Proposed | Would land at | vs Finnish |
|---|---|---:|---:|---:|---:|
| `fin_for_eng` *(reference)* | draft | **347** | — | — | — |
| `fra_for_eng` | released | 285 | +67 | 352 | +5 |
| `zho_for_eng` | released | 236 | +68 | 304 | −43 |
| `deu_at_for_eng` | draft | 220 | +59 | 279 | −68 |
| `spa_for_eng` | released | 210 | **+195** | **405** | **+58** ⚠️ |
| `spa_mx_for_eng` | beta | 206 | **+192** | **398** | **+51** ⚠️ |
| `fra_ca_for_eng` | draft | 198 | +131 | 329 | −18 |
| `ara_lb_for_eng` | beta | 196 | +124 | 320 | −27 |
| `ara_eg_for_eng` | beta | 186 | +127 | 313 | −34 |
| `por_br_for_eng` | beta | 184 | +135 | 319 | −28 |
| `deu_ch_for_eng` | draft | 183 | +74 | 257 | −90 |
| `por_for_eng` | released | 182 | +129 | 311 | −36 |
| `jpn_for_eng` | released | 181 | +40 | 221 | −126 |
| `deu_for_eng` | beta | 180 | +146 | 326 | −21 |
| `ara_for_eng` | beta | 178 | +120 | 298 | −49 |
| `ita_for_eng` | released | 177 | +149 | 326 | −21 |
| `kor_for_eng` | released | **147** | +100 | 247 | −100 |

Both draft variants flagged as previously missed — `fra_ca_for_eng` and `deu_at_for_eng` — are
included, as are `deu_ch_for_eng`, `ara_eg_for_eng` and `ara_lb_for_eng`.

### ⚠️ Spanish needs a trim decision before anything is written

`spa_for_eng` and `spa_mx_for_eng` land near 400, well past Finnish. The worker deliberately did not
trim, reasoning that shape beats count and the cut is yours. But your own rule — *a smaller correct
set beats a larger forced one* — points the other way. **My recommendation: trim both to roughly
Finnish's shape before writing.** The fragment names which rows to cut first.

Conversely, `jpn_for_eng` (+40) and `kor_for_eng` (+100) stay well short deliberately, for the
subject-drop reason in §3. That is correct, not under-delivery.

---

## 5. Verification of what was already applied

### 5.1 `fra_for_eng:S0001L02B01` — **correct, keep it**

| | |
|---|---|
| known_text | I want to speak |
| target_text | je veux parler |
| role / position | `build` / 1 |
| audio | **NULL** |

Exactly Finnish-shaped: Finnish's S1L02 has one build phrase at position 1, "I want to speak" /
"mä haluun puhua". Straight L1 + L2 concatenation, natural order, nothing invented. Created 14:45Z
today. **No defect found.** Independently re-checked by the French worker, who agrees.

### 5.2 The 24 deleted duplicate `build` rows — **verified sound, with one caveat**

Re-verified independently against the live DB:

- All 24 deleted `known_text` values still have a surviving row of the same text ✅
- Every surviving row has intact audio (`target1_audio_id` present) ✅
- None of the 24 deleted ids is still present ✅
- **No lego was left barren by the deletion** ✅

**Caveat — the record is not truly reconstructive.** `docs/fra-duplicate-deletion-record-2026-08-04.json`
stores only `deleted_known_text`, `deleted_phrase_role`, and the *surviving twin's* full row. It does
**not** store the deleted row's own id, seed, lego_index, position or target_text. It proves nothing
was lost; it would not let you restore the exact rows.

### 5.3 The failed `backfill-apply` job left nothing behind

A conversation labelled `backfill-apply` ("APPROVED: land the seeds 1-10 backfill…") started 14:40Z
today and **failed**. Exactly **one** row was created database-wide today — `fra_for_eng:S0001L02B01`.
No other seeds-1-10 row in any course was created or updated by it. Other same-day activity
(`deu_for_eng` seeds 19–407, `zho_for_eng` S624, the Indic `eng_for_*` courses) belongs to unrelated
concurrent jobs. **No partial or rogue backfill writes are sitting in seeds 1-10.**

---

## 6. Pre-existing defects found along the way — reported, NOT fixed

None of these are backfill gaps; all are existing rows. Nothing here has been changed.

### 6.1 ZUT clashes — only 3 in the whole set

One known prompt bound to two different target forms. Three across ~3,400 phrases is a genuinely
clean result.

| Course | known_text | Target A | Target B |
|---|---|---|---|
| `zho_for_eng` | remember a word | 想起一个词 (S6L2) | 记住一个词 (S10L4) |
| `zho_for_eng` | remember the meaning | 想起意思 (S8L3) | 记住意思 (S10L4) |
| `ara_lb_for_eng` | speak in Arabic | أحكي بالعربي (S4L3) | عم بحكي بالعربي (S9L1) |

Both Chinese clashes share one cause: S10L4's rows generalise 记住 back over objects that S6L1's
想起 already owns. **Needs a decision, not a backfill** — no phrases were proposed in that space.

### 6.2 Controlled-language violations (vocabulary the course never introduces)

- **`por_br_for_eng` — cross-course contamination.** Two rows (S5L2 p9, S9L1 p9) use
  "as often as possible" / `o mais frequentemente possível`. That lego belongs to **`por_for_eng`**.
  `por_br` has "often"/`frequentemente` and "as much as possible"/`o mais possível`, but *not* this.
  Violation on **both** the known and target sides. Verified directly against both lego tables.
- **`ara_lb_for_eng`** — four rows using untaught vocabulary (`منيح`, `معي`).
- **`zho_for_eng`** — uncontrolled known-side vocabulary (`she`, `study`, negation before S10).
- **`spa_for_eng` S10L02** — existing rows use "I'm not sure **about** \<gerund\>", but neither
  *about* nor the gerunds are legos; the pattern exists only inside three phrases.

### 6.3 Rows that break the authoring rule (reordering / punctuation / invented material)

| Course | Row | Problem |
|---|---|---|
| `kor_for_eng` | S1L04 p8 "right now I want to speak Korean together" | "right now" is not a lego; inverts the adverb order used by p5–p7; near-collision with p7 |
| `ara_lb_for_eng` | S1L04 p9 `بدي أحكي عربي، معك!` | added comma and exclamation mark |
| `ara_lb_for_eng` | S1L03 "I want to speak Arabic a lot" → `بدي أحكي عربي، عربي` | renders "a lot" as word repetition |
| `ara_lb_for_eng` | S4L1 `بدي قول، قول` · S5L2 ×2 · S6L1 `أتذكر، أتذكر` | 6 repetition artifacts stored as phrases |
| `spa_for_eng` | 5 rows | fronted "Now I want to…", an added "?", a known/target order mismatch, "to say with you", "I'm trying to try something" |

### 6.4 Structural / lego-definition problems

- **`ara_lb_for_eng` teaches an unnatural constituent order in seed 1 that seed 9 contradicts.**
  S1L4/S1L5 store `بدي أحكي معك عربي` (with-you *before* Arabic); S9L1 stores the natural
  `عم بحكي عربي معك`. The learner's **first** exposure sets the order the course later abandons.
  Verified directly. No phrases proposed for those knowns — fixing it means editing existing rows.
- **The two Portuguese courses have mirror-image contraction bugs.** `por_for_eng` defines the lego as
  `da frase inteira` (baking in *de+a*), so it only combines with `lembrar-me de` — `dizer da frase
  inteira` is ungrammatical, which is why its whole seed-10 tail is remember-only. `por_br_for_eng`
  defines `a frase inteira`, which breaks *remember* instead. Each silently covers the half the other
  cannot.
- **`fra_for_eng`: the "to learn French" family is grammatically blocked.** `apprendre français` is
  wrong; it needs `apprendre **le** français`, and the learner has no `le`. ~10 phrases Finnish gets
  free that French structurally cannot. **The single biggest reason `fra` sits below `fin`** — a
  content decision (add a `le` lego?), not a backfill gap.
- **The two French workers disagreed about `apprendre` + a bare language name. I adjudicated it
  against the data, and both were partly wrong.**
  The `fra_for_eng` worker rejected the whole "to learn French" family as ungrammatical
  (`apprendre français` needs `apprendre **le** français`). The `fra_ca` worker proposed the mirror
  family anyway (~13 rows, `apprendre québécois`), citing an existing row as precedent. Checking the
  DB directly:
  - **Neither course has a `le` article lego anywhere in seeds 1-10.** Confirmed. The family is
    genuinely blocked for both. → **Hold those 13 fra_ca rows.**
  - The fra_ca precedent is a **single** row — S10L01 `apprendre québécois` — and it is itself
    ungrammatical. A lone defective row is not a precedent.
  - **But `fra_for_eng` is not clean here either**, contrary to the rejection's premise. It already
    ships two rows of exactly this shape at **S9L3**: "to learn a little French" →
    `apprendre un peu français`, and "I want to learn a little French" → `je veux apprendre un peu
    français`. Both need `un peu **de** français`.

  So this is **three existing defective rows** (fra S9L3 ×2, fra_ca S10L01), not merely a blocked
  family — and the cleanest fix is the `le`/`de` lego, which unblocks ~10 phrases in French and ~13
  in Quebec French at the same time. Decision #4.
- **`ara_for_eng` MSA subjunctive is a blocker.** `أَقولُ` and `أَتَكَلَّمُ` are stored as indicatives, so
  "I can say…" / "I want to say…" are unbuildable without a form the learner has never heard. Listed
  as rejected rather than guessed.
- **`deu_for_eng`** — four seed-10 phrases prompt with "if" for the lego "whether" → `ob`.

---

## 7. Per-course proposals

Each section gives **every proposed phrase** with exact known_text and target_text, plus a section B
stating what was deliberately NOT proposed and why. Section B is as important as the additions — it
is where the naturalness judgements live. No `position` or `lego_count` values are proposed: existing
positions are non-contiguous and `lego_count` is corrupt (§2), so the write path must derive both.


---

#### spa_for_eng + spa_mx_for_eng — seeds 1–10 density proposal

**Diagnosis (both courses): flat quota, not missing legos.** Both sit at a near-constant ~3 build /
~5 use per lego from S2 onward, regardless of how much inventory the learner has accumulated.
Finnish grows with inventory (S1L02 = 1 combo → S5L01 = 15, S7L01 = 17). That flatness *is* the gap.
Neither course has a barren `is_new=true` lego, and every lego in seeds 1–10 is `is_new=true`.

Proposed: **spa_for_eng 195** (59 build / 136 use), **spa_mx_for_eng 192** (59 build / 133 use).
Style matches each course's own existing
convention (spa_for_eng capitalises phrase-initial words; spa_mx_for_eng is lowercase except
"Spanish"). `frecuentemente` vs `seguido` kept per course.

---

#### COURSE 1 — spa_for_eng

##### A. Proposed phrases (195)

| Seed/Lego | phrase_role | known_text | target_text | combines |
|---|---|---|---|---|
| S1L04 | build | Spanish with you | Español contigo | L3+L4 |
| S1L05 | build | Spanish now | Español ahora | L3+L5 |
| S1L05 | build | To speak with you now | Hablar contigo ahora | L2+L4+L5 |
| S2L01 | build | To learn now | Aprender ahora | S2L1+now |
| S2L01 | build | To learn with you | Aprender contigo | S2L1+with you |
| S2L01 | build | To learn Spanish now | Aprender español ahora | S2L1+Spanish+now |
| S2L01 | build | To learn Spanish with you | Aprender español contigo | S2L1+Spanish+with you |
| S2L01 | use | I want to learn with you | Quiero aprender contigo | I want+S2L1+with you |
| S2L02 | build | I'm trying to speak now | Estoy intentando hablar ahora | S2L2+to speak+now |
| S2L02 | use | I'm trying to learn Spanish | Estoy intentando aprender español | S2L2+to learn+Spanish |
| S2L02 | use | I'm trying to speak with you | Estoy intentando hablar contigo | S2L2+to speak+with you |
| S2L02 | use | I'm trying to learn with you | Estoy intentando aprender contigo | S2L2+to learn+with you |
| S2L02 | use | I'm trying to learn now | Estoy intentando aprender ahora | S2L2+to learn+now |
| S2L02 | use | I'm trying to speak Spanish now | Estoy intentando hablar español ahora | S2L2+to speak+Spanish+now |
| S2L02 | use | I'm trying to learn Spanish with you | Estoy intentando aprender español contigo | S2L2+to learn+Spanish+with you |
| S2L02 | use | I'm trying to speak Spanish with you now | Estoy intentando hablar español contigo ahora | S2L2+to speak+Spanish+with you+now |
| S3L01 | build | How to learn Spanish | Cómo aprender español | how+to learn+Spanish |
| S3L01 | use | How to speak with you | Cómo hablar contigo | how+to speak+with you |
| S3L01 | use | How to speak Spanish with you | Cómo hablar español contigo | how+to speak+Spanish+with you |
| S3L01 | use | How to learn Spanish with you | Cómo aprender español contigo | how+to learn+Spanish+with you |
| S3L01 | use | I want to learn how to speak | Quiero aprender cómo hablar | I want+to learn+how+to speak |
| S3L01 | use | I'm trying to learn how to speak Spanish | Estoy intentando aprender cómo hablar español | I'm trying to+to learn+how+to speak+Spanish |
| S3L02 | build | To learn frequently | Aprender frecuentemente | to learn+frequently |
| S3L02 | build | How to speak frequently | Cómo hablar frecuentemente | how+to speak+frequently |
| S3L02 | use | I want to learn frequently | Quiero aprender frecuentemente | I want+to learn+frequently |
| S3L02 | use | I want to learn Spanish frequently | Quiero aprender español frecuentemente | I want+to learn+Spanish+frequently |
| S3L02 | use | I'm trying to learn frequently | Estoy intentando aprender frecuentemente | I'm trying to+to learn+frequently |
| S3L02 | use | I'm trying to speak with you frequently | Estoy intentando hablar contigo frecuentemente | I'm trying to+to speak+with you+frequently |
| S3L02 | use | I want to speak Spanish with you frequently | Quiero hablar español contigo frecuentemente | I want+to speak+Spanish+with you+frequently |
| S3L03 | build | To speak Spanish as frequently as possible | Hablar español lo más frecuentemente posible | to speak+Spanish+S3L3 |
| S3L03 | build | How to speak as frequently as possible | Cómo hablar lo más frecuentemente posible | how+to speak+S3L3 |
| S3L03 | use | I want to learn as frequently as possible | Quiero aprender lo más frecuentemente posible | I want+to learn+S3L3 |
| S3L03 | use | I want to learn Spanish as frequently as possible | Quiero aprender español lo más frecuentemente posible | I want+to learn+Spanish+S3L3 |
| S3L03 | use | I'm trying to learn as frequently as possible | Estoy intentando aprender lo más frecuentemente posible | I'm trying to+to learn+S3L3 |
| S3L03 | use | I'm trying to speak Spanish as frequently as possible | Estoy intentando hablar español lo más frecuentemente posible | I'm trying to+to speak+Spanish+S3L3 |
| S3L03 | use | I'm trying to speak with you as frequently as possible | Estoy intentando hablar contigo lo más frecuentemente posible | I'm trying to+to speak+with you+S3L3 |
| S4L01 | build | To learn in Spanish | Aprender en español | to learn+in+Spanish |
| S4L01 | use | I want to learn in Spanish | Quiero aprender en español | I want+to learn+in+Spanish |
| S4L01 | use | I'm trying to learn in Spanish | Estoy intentando aprender en español | I'm trying to+to learn+in+Spanish |
| S4L01 | use | I want to speak in Spanish now | Quiero hablar en español ahora | I want+to speak+in+Spanish+now |
| S4L01 | use | I want to speak in Spanish with you | Quiero hablar en español contigo | I want+to speak+in+Spanish+with you |
| S4L01 | use | I want to speak in Spanish frequently | Quiero hablar en español frecuentemente | I want+to speak+in+Spanish+frequently |
| S4L01 | use | I want to speak in Spanish as frequently as possible | Quiero hablar en español lo más frecuentemente posible | I want+to speak+in+Spanish+S3L3 |
| S4L02 | build | How to learn something | Cómo aprender algo | how+to learn+something |
| S4L02 | build | To learn something now | Aprender algo ahora | to learn+something+now |
| S4L02 | use | I want to learn something now | Quiero aprender algo ahora | I want+to learn+something+now |
| S4L02 | use | I want to learn something with you | Quiero aprender algo contigo | I want+to learn+something+with you |
| S4L02 | use | I'm trying to learn something with you | Estoy intentando aprender algo contigo | I'm trying to+to learn+something+with you |
| S4L02 | use | I want to learn something in Spanish now | Quiero aprender algo en español ahora | I want+to learn+something+in+Spanish+now |
| S4L03 | build | To say something now | Decir algo ahora | to say+something+now |
| S4L03 | build | How to say something in Spanish | Cómo decir algo en español | how+to say+something+in+Spanish |
| S4L03 | use | I want to say something | Quiero decir algo | I want+to say+something |
| S4L03 | use | I'm trying to say something | Estoy intentando decir algo | I'm trying to+to say+something |
| S4L03 | use | I want to say something now | Quiero decir algo ahora | I want+to say+something+now |
| S4L03 | use | I'm trying to say something now | Estoy intentando decir algo ahora | I'm trying to+to say+something+now |
| S4L03 | use | I want to learn how to say something | Quiero aprender cómo decir algo | I want+to learn+how+to say+something |
| S5L01 | build | To practise now | Practicar ahora | to practise+now |
| S5L01 | build | To practise with you | Practicar contigo | to practise+with you |
| S5L01 | build | How to practise | Cómo practicar | how+to practise |
| S5L01 | build | To practise frequently | Practicar frecuentemente | to practise+frequently |
| S5L01 | use | I want to practise now | Quiero practicar ahora | I want+to practise+now |
| S5L01 | use | I want to practise with you | Quiero practicar contigo | I want+to practise+with you |
| S5L01 | use | I want to practise frequently | Quiero practicar frecuentemente | I want+to practise+frequently |
| S5L01 | use | I want to practise in Spanish | Quiero practicar en español | I want+to practise+in+Spanish |
| S5L01 | use | I'm trying to practise Spanish | Estoy intentando practicar español | I'm trying to+to practise+Spanish |
| S5L01 | use | I want to practise as frequently as possible | Quiero practicar lo más frecuentemente posible | I want+to practise+S3L3 |
| S5L02 | build | I'm going to say | Voy a decir | S5L2+to say |
| S5L02 | use | I'm going to speak Spanish | Voy a hablar español | S5L2+to speak+Spanish |
| S5L02 | use | I'm going to learn Spanish | Voy a aprender español | S5L2+to learn+Spanish |
| S5L02 | use | I'm going to speak now | Voy a hablar ahora | S5L2+to speak+now |
| S5L02 | use | I'm going to practise now | Voy a practicar ahora | S5L2+to practise+now |
| S5L02 | use | I'm going to speak with you | Voy a hablar contigo | S5L2+to speak+with you |
| S5L02 | use | I'm going to say something | Voy a decir algo | S5L2+to say+something |
| S5L02 | use | I'm going to say something in Spanish | Voy a decir algo en español | S5L2+to say+something+in+Spanish |
| S5L02 | use | I'm going to learn something in Spanish | Voy a aprender algo en español | S5L2+to learn+something+in+Spanish |
| S5L02 | use | I'm going to speak in Spanish | Voy a hablar en español | S5L2+to speak+in+Spanish |
| S5L02 | use | I'm going to speak Spanish frequently | Voy a hablar español frecuentemente | S5L2+to speak+Spanish+frequently |
| S5L02 | use | I'm going to speak as frequently as possible | Voy a hablar lo más frecuentemente posible | S5L2+to speak+S3L3 |
| S5L02 | use | I'm going to practise Spanish with you | Voy a practicar español contigo | S5L2+to practise+Spanish+with you |
| S5L03 | build | I want to practise speaking | Quiero practicar hablando | I want+to practise+speaking |
| S5L03 | build | To practise speaking now | Practicar hablando ahora | to practise+speaking+now |
| S5L03 | use | I'm trying to practise speaking | Estoy intentando practicar hablando | I'm trying to+to practise+speaking |
| S5L03 | use | I want to practise speaking now | Quiero practicar hablando ahora | I want+to practise+speaking+now |
| S5L03 | use | I want to practise speaking Spanish | Quiero practicar hablando español | I want+to practise+speaking+Spanish |
| S5L03 | use | I want to practise speaking frequently | Quiero practicar hablando frecuentemente | I want+to practise+speaking+frequently |
| S5L03 | use | I'm going to practise speaking Spanish with you | Voy a practicar hablando español contigo | I'm going to+to practise+speaking+Spanish+with you |
| S5L03 | use | I want to practise speaking as frequently as possible | Quiero practicar hablando lo más frecuentemente posible | I want+to practise+speaking+S3L3 |
| S5L04 | build | To learn with someone else | Aprender con otra persona | to learn+S5L4 |
| S5L04 | build | To practise speaking with someone else | Practicar hablando con otra persona | to practise+speaking+S5L4 |
| S5L04 | use | I want to practise with someone else | Quiero practicar con otra persona | I want+to practise+S5L4 |
| S5L04 | use | I'm going to practise with someone else | Voy a practicar con otra persona | I'm going to+to practise+S5L4 |
| S5L04 | use | I'm going to practise speaking with someone else | Voy a practicar hablando con otra persona | I'm going to+to practise+speaking+S5L4 |
| S5L04 | use | I want to speak Spanish with someone else | Quiero hablar español con otra persona | I want+to speak+Spanish+S5L4 |
| S5L04 | use | I'm going to speak Spanish with someone else | Voy a hablar español con otra persona | I'm going to+to speak+Spanish+S5L4 |
| S5L04 | use | I want to learn Spanish with someone else | Quiero aprender español con otra persona | I want+to learn+Spanish+S5L4 |
| S5L04 | use | I'm trying to practise speaking with someone else | Estoy intentando practicar hablando con otra persona | I'm trying to+to practise+speaking+S5L4 |
| S6L01 | build | To remember something | Recordar algo | to remember+something |
| S6L01 | build | How to remember | Cómo recordar | how+to remember |
| S6L01 | use | I want to remember something | Quiero recordar algo | I want+to remember+something |
| S6L01 | use | I'm trying to remember something | Estoy intentando recordar algo | I'm trying to+to remember+something |
| S6L01 | use | I want to remember something in Spanish | Quiero recordar algo en español | I want+to remember+something+in+Spanish |
| S6L01 | use | I'm going to remember something in Spanish | Voy a recordar algo en español | I'm going to+to remember+something+in+Spanish |
| S6L01 | use | I want to remember how to speak | Quiero recordar cómo hablar | I want+to remember+how+to speak |
| S6L01 | use | I'm going to remember how to say something in Spanish | Voy a recordar cómo decir algo en español | I'm going to+to remember+how+to say+something+in+Spanish |
| S6L02 | build | To learn a word | Aprender una palabra | to learn+a word |
| S6L02 | build | How to say a word | Cómo decir una palabra | how+to say+a word |
| S6L02 | build | A word in Spanish | Una palabra en español | a word+in+Spanish |
| S6L02 | use | I want to say a word | Quiero decir una palabra | I want+to say+a word |
| S6L02 | use | I'm going to learn a word | Voy a aprender una palabra | I'm going to+to learn+a word |
| S6L02 | use | I'm going to remember a word | Voy a recordar una palabra | I'm going to+to remember+a word |
| S6L02 | use | I want to learn a word in Spanish | Quiero aprender una palabra en español | I want+to learn+a word+in+Spanish |
| S6L02 | use | I'm trying to say a word in Spanish | Estoy intentando decir una palabra en español | I'm trying to+to say+a word+in+Spanish |
| S6L02 | use | I want to remember a word in Spanish | Quiero recordar una palabra en español | I want+to remember+a word+in+Spanish |
| S7L01 | build | To try to learn | Intentar aprender | to try+to learn |
| S7L01 | build | To try to remember | Intentar recordar | to try+to remember |
| S7L01 | use | I want to try to learn Spanish | Quiero intentar aprender español | I want+to try+to learn+Spanish |
| S7L01 | use | I'm going to try to speak Spanish | Voy a intentar hablar español | I'm going to+to try+to speak+Spanish |
| S7L01 | use | I want to try to remember a word | Quiero intentar recordar una palabra | I want+to try+to remember+a word |
| S7L01 | use | I'm going to try to say something in Spanish | Voy a intentar decir algo en español | I'm going to+to try+to say+something+in+Spanish |
| S7L01 | use | I want to try to speak with someone else | Quiero intentar hablar con otra persona | I want+to try+to speak+S5L4 |
| S7L01 | use | I'm going to try to practise speaking | Voy a intentar practicar hablando | I'm going to+to try+to practise+speaking |
| S7L02 | build | To speak today | Hablar hoy | to speak+today |
| S7L02 | build | To learn today | Aprender hoy | to learn+today |
| S7L02 | use | I want to speak today | Quiero hablar hoy | I want+to speak+today |
| S7L02 | use | I want to speak Spanish today | Quiero hablar español hoy | I want+to speak+Spanish+today |
| S7L02 | use | I'm going to practise today | Voy a practicar hoy | I'm going to+to practise+today |
| S7L02 | use | I want to practise speaking today | Quiero practicar hablando hoy | I want+to practise+speaking+today |
| S7L02 | use | I'm going to learn something today | Voy a aprender algo hoy | I'm going to+to learn+something+today |
| S7L02 | use | I'm trying to speak Spanish today | Estoy intentando hablar español hoy | I'm trying to+to speak+Spanish+today |
| S7L02 | use | I want to remember a word today | Quiero recordar una palabra hoy | I want+to remember+a word+today |
| S7L03 | build | To speak as hard as I can | Hablar todo lo que pueda | to speak+S7L3 |
| S7L03 | build | To learn as hard as I can | Aprender todo lo que pueda | to learn+S7L3 |
| S7L03 | use | I'm going to practise as hard as I can | Voy a practicar todo lo que pueda | I'm going to+to practise+S7L3 |
| S7L03 | use | I want to learn as hard as I can | Quiero aprender todo lo que pueda | I want+to learn+S7L3 |
| S7L03 | use | I'm going to try as hard as I can today | Voy a intentar todo lo que pueda hoy | I'm going to+to try+S7L3+today |
| S7L03 | use | I'm going to speak as hard as I can today | Voy a hablar todo lo que pueda hoy | I'm going to+to speak+S7L3+today |
| S8L01 | build | I'm going to explain | Voy a explicar | I'm going to+to explain |
| S8L01 | build | To explain something | Explicar algo | to explain+something |
| S8L01 | build | To try to explain | Intentar explicar | to try+to explain |
| S8L01 | use | I want to explain something | Quiero explicar algo | I want+to explain+something |
| S8L01 | use | I'm trying to explain something | Estoy intentando explicar algo | I'm trying to+to explain+something |
| S8L01 | use | I want to explain how to say something | Quiero explicar cómo decir algo | I want+to explain+how+to say+something |
| S8L01 | use | I want to try to explain something in Spanish | Quiero intentar explicar algo en español | I want+to try+to explain+something+in+Spanish |
| S8L02 | build | To say what I mean | Decir lo que quiero decir | to say+S8L2 |
| S8L02 | use | I want to explain what I mean | Quiero explicar lo que quiero decir | I want+to explain+S8L2 |
| S8L02 | use | I want to remember what I mean | Quiero recordar lo que quiero decir | I want+to remember+S8L2 |
| S8L02 | use | I'm going to explain what I mean | Voy a explicar lo que quiero decir | I'm going to+to explain+S8L2 |
| S8L02 | use | I want to say what I mean in Spanish | Quiero decir lo que quiero decir en español | I want+to say+S8L2+in+Spanish |
| S8L02 | use | I want to explain what I mean in Spanish | Quiero explicar lo que quiero decir en español | I want+to explain+S8L2+in+Spanish |
| S8L02 | use | I'm going to try to explain what I mean today | Voy a intentar explicar lo que quiero decir hoy | I'm going to+to try+to explain+S8L2+today |
| S9L01 | build | I speak with you | Hablo contigo | I speak+with you |
| S9L01 | build | I speak in Spanish | Hablo en español | I speak+in+Spanish |
| S9L01 | use | I speak Spanish today | Hablo español hoy | I speak+Spanish+today |
| S9L01 | use | I speak Spanish with you now | Hablo español contigo ahora | I speak+Spanish+with you+now |
| S9L01 | use | I speak Spanish with you frequently | Hablo español contigo frecuentemente | I speak+Spanish+with you+frequently |
| S9L01 | use | I speak in Spanish with you | Hablo en español contigo | I speak+in+Spanish+with you |
| S9L02 | build | To learn a little Spanish | Aprender un poco de español | to learn+a little+Spanish |
| S9L02 | build | To practise a little Spanish | Practicar un poco de español | to practise+a little+Spanish |
| S9L02 | use | I'm trying to speak a little Spanish | Estoy intentando hablar un poco de español | I'm trying to+to speak+a little+Spanish |
| S9L02 | use | I speak a little Spanish with you | Hablo un poco de español contigo | I speak+a little+Spanish+with you |
| S9L02 | use | I want to speak a little Spanish with you | Quiero hablar un poco de español contigo | I want+to speak+a little+Spanish+with you |
| S9L02 | use | I'm going to practise a little Spanish today | Voy a practicar un poco de español hoy | I'm going to+to practise+a little+Spanish+today |
| S10L01 | build | I can say | Puedo decir | I can+to say |
| S10L01 | build | I can practise | Puedo practicar | I can+to practise |
| S10L01 | build | I can learn | Puedo aprender | I can+to learn |
| S10L01 | build | I can try | Puedo intentar | I can+to try |
| S10L01 | use | I can say something | Puedo decir algo | I can+to say+something |
| S10L01 | use | I can say something in Spanish | Puedo decir algo en español | I can+to say+something+in+Spanish |
| S10L01 | use | I can practise speaking | Puedo practicar hablando | I can+to practise+speaking |
| S10L01 | use | I can learn a word today | Puedo aprender una palabra hoy | I can+to learn+a word+today |
| S10L01 | use | I can speak Spanish with you | Puedo hablar español contigo | I can+to speak+Spanish+with you |
| S10L01 | use | I can explain what I mean | Puedo explicar lo que quiero decir | I can+to explain+S8L2 |
| S10L02 | build | I'm not sure about saying | No estoy seguro de decir | S10L2+to say |
| S10L02 | build | I'm not sure about practising | No estoy seguro de practicar | S10L2+to practise |
| S10L02 | build | I'm not sure about learning | No estoy seguro de aprender | S10L2+to learn |
| S10L02 | use | I'm not sure about learning Spanish | No estoy seguro de aprender español | S10L2+to learn+Spanish |
| S10L02 | use | I'm not sure about saying something in Spanish | No estoy seguro de decir algo en español | S10L2+to say+something+in+Spanish |
| S10L02 | use | I'm not sure about practising speaking today | No estoy seguro de practicar hablando hoy | S10L2+to practise+speaking+today |
| S10L02 | use | I'm not sure about remembering a word | No estoy seguro de recordar una palabra | S10L2+to remember+a word |
| S10L02 | use | I'm not sure about explaining what I mean | No estoy seguro de explicar lo que quiero decir | S10L2+to explain+S8L2 |
| S10L03 | build | If I can say | Si puedo decir | if+I can+to say |
| S10L03 | build | If I can explain | Si puedo explicar | if+I can+to explain |
| S10L03 | build | If I can practise | Si puedo practicar | if+I can+to practise |
| S10L03 | use | I'm not sure if I can say something | No estoy seguro de si puedo decir algo | S10L2+if+I can+to say+something |
| S10L03 | use | I'm not sure if I can remember a word | No estoy seguro de si puedo recordar una palabra | S10L2+if+I can+to remember+a word |
| S10L03 | use | I'm not sure if I can speak a little Spanish | No estoy seguro de si puedo hablar un poco de español | S10L2+if+I can+to speak+a little+Spanish |
| S10L03 | use | I'm not sure if I can explain something in Spanish | No estoy seguro de si puedo explicar algo en español | S10L2+if+I can+to explain+something+in+Spanish |
| S10L04 | build | To explain the whole sentence | Explicar toda la frase | to explain+S10L4 |
| S10L04 | build | To practise the whole sentence | Practicar toda la frase | to practise+S10L4 |
| S10L04 | build | I can say the whole sentence | Puedo decir toda la frase | I can+to say+S10L4 |
| S10L04 | use | I want to say the whole sentence | Quiero decir toda la frase | I want+to say+S10L4 |
| S10L04 | use | I want to remember the whole sentence | Quiero recordar toda la frase | I want+to remember+S10L4 |
| S10L04 | use | I want to practise the whole sentence today | Quiero practicar toda la frase hoy | I want+to practise+S10L4+today |
| S10L04 | use | I want to explain the whole sentence in Spanish | Quiero explicar toda la frase en español | I want+to explain+S10L4+in+Spanish |
| S10L04 | use | I'm not sure if I can say the whole sentence | No estoy seguro de si puedo decir toda la frase | S10L2+if+I can+to say+S10L4 |

##### B. Deliberately NOT proposed — spa_for_eng

**Vocabulary not yet introduced at that lego's position** (spa_for_eng's S4 order is `in` → `something`
→ `to say`, and S5 is `to practise` → `I'm going to`, so these are unavailable earlier than you might expect):
- S4L01 anything with *something* / *to say* — both arrive later in the same seed.
- S4L02 anything with *to say* (e.g. "to say something") — `to say` is S4L03.
- S5L01 anything with *I'm going to* (e.g. "I'm going to practise") — `I'm going to` is S5L02.
- S6L01 anything with *to try* (e.g. "I'm going to try to remember") — `to try` is S7L01.
- S1–S2 anything with *how / frequently* — those are S3.

**Unnatural in the target language / grammatical-but-odd — left out:**
- "I want to say something with you" → *quiero decir algo contigo*. English *say something **to** you* is the
  natural form; *with you* reads as an error, and *decir algo contigo* is odd Spanish.
  (spa_mx_for_eng already has this row — see its structural findings.)
- "I'm trying to try" / "I want to try to try" — *intentar* stacked on *estoy intentando*. Tautological.
- "I want to remember as frequently as possible" — remembering isn't a repeatable-frequency activity here.
- "Something now" / "A word now" as bare builds — Finnish has "something now" but Spanish *algo ahora*
  standing alone is not usable; left out.
- "I'm not sure about ifing"-type blends — no.
- "To speak the whole sentence" — *hablar toda la frase* is wrong; Spanish needs *decir*.

**Would require reordering the known side — not proposed:**
- Any "Now I want to…" / "Today I want to…" fronted variant. (Note: spa_for_eng **already contains one**,
  S2L01 "Now I want to learn Spanish with you" — flagged below, not something I extended.)

**ZUT clashes — checked and avoided:** every proposed `known_text` above was diffed
(case- and punctuation-insensitive) against all 223 existing spa_for_eng rows in seeds 1–10; zero collisions,
and zero duplicates within the proposal. Every target-side token in every proposed row was also checked
against the target text of all legos available at or before that lego's position: **zero unavailable
target tokens**.

**⚠️ One known-side judgement call Kai should rule on — the 8 S10L02 rows.**
spa_for_eng's S10L02 lego is *I'm not sure* / *no estoy seguro de*, and the course's three existing rows
render it on the known side as **"I'm not sure about \<gerund\>"** ("about speaking", "about remembering",
"about explaining"). Neither *about* nor those gerunds are legos — the pattern exists only inside those
three existing phrases. My 8 additions extend it to three **new** gerunds not yet seen anywhere in the
course: *saying*, *practising*, *learning*. That is new known-side morphology, which the controlled-known
rail arguably forbids. Three options, Kai's call:
  (a) accept all 8 — the pattern is already established and gerund formation is trivial for an English speaker;
  (b) keep only the 5 rows built on gerunds the course already uses (*speaking / remembering / explaining*)
      and drop *saying / practising / learning*;
  (c) drop all 8 and leave S10L02 at its current 4 rows.
I have listed all 8 rather than pre-trimming, because trimming is the reviewer's decision.
**spa_mx_for_eng has no equivalent issue** — it uses "I'm not sure **how to** \<infinitive\>", which is
pure lego recombination, and its check returned zero unavailable known-side tokens too.

---

#### COURSE 2 — spa_mx_for_eng

##### A. Proposed phrases (192)

| Seed/Lego | phrase_role | known_text | target_text | combines |
|---|---|---|---|---|
| S2L01 | build | to learn now | aprender ahora | to learn+now |
| S2L01 | build | to learn with you | aprender contigo | to learn+with you |
| S2L01 | build | to learn Spanish now | aprender español ahora | to learn+Spanish+now |
| S2L01 | build | to learn Spanish with you | aprender español contigo | to learn+Spanish+with you |
| S2L01 | use | I want to learn now | quiero aprender ahora | I want+to learn+now |
| S2L01 | use | I want to learn with you | quiero aprender contigo | I want+to learn+with you |
| S2L01 | use | I want to learn Spanish now | quiero aprender español ahora | I want+to learn+Spanish+now |
| S2L01 | use | I want to learn Spanish with you | quiero aprender español contigo | I want+to learn+Spanish+with you |
| S2L01 | use | I want to learn Spanish with you now | quiero aprender español contigo ahora | I want+to learn+Spanish+with you+now |
| S2L02 | build | I'm trying to speak now | estoy intentando hablar ahora | S2L2+to speak+now |
| S2L02 | use | I'm trying to speak with you | estoy intentando hablar contigo | S2L2+to speak+with you |
| S2L02 | use | I'm trying to learn with you | estoy intentando aprender contigo | S2L2+to learn+with you |
| S2L02 | use | I'm trying to learn now | estoy intentando aprender ahora | S2L2+to learn+now |
| S2L02 | use | I'm trying to speak Spanish now | estoy intentando hablar español ahora | S2L2+to speak+Spanish+now |
| S2L02 | use | I'm trying to learn Spanish now | estoy intentando aprender español ahora | S2L2+to learn+Spanish+now |
| S2L02 | use | I'm trying to speak Spanish with you | estoy intentando hablar español contigo | S2L2+to speak+Spanish+with you |
| S2L02 | use | I'm trying to learn Spanish with you now | estoy intentando aprender español contigo ahora | S2L2+to learn+Spanish+with you+now |
| S3L01 | use | how to learn with you | cómo aprender contigo | how+to learn+with you |
| S3L01 | use | how to speak now | cómo hablar ahora | how+to speak+now |
| S3L01 | use | how to speak Spanish now | cómo hablar español ahora | how+to speak+Spanish+now |
| S3L01 | use | how to learn Spanish with you | cómo aprender español contigo | how+to learn+Spanish+with you |
| S3L01 | use | I want to learn how to speak | quiero aprender cómo hablar | I want+to learn+how+to speak |
| S3L01 | use | I want to learn how to speak Spanish | quiero aprender cómo hablar español | I want+to learn+how+to speak+Spanish |
| S3L01 | use | I'm trying to learn how to speak | estoy intentando aprender cómo hablar | S2L2+to learn+how+to speak |
| S3L02 | build | how to speak frequently | cómo hablar seguido | how+to speak+frequently |
| S3L02 | build | to speak Spanish frequently | hablar español seguido | to speak+Spanish+frequently |
| S3L02 | use | I want to learn Spanish frequently | quiero aprender español seguido | I want+to learn+Spanish+frequently |
| S3L02 | use | I'm trying to speak Spanish frequently | estoy intentando hablar español seguido | S2L2+to speak+Spanish+frequently |
| S3L02 | use | I'm trying to learn Spanish frequently | estoy intentando aprender español seguido | S2L2+to learn+Spanish+frequently |
| S3L02 | use | I want to speak with you frequently | quiero hablar contigo seguido | I want+to speak+with you+frequently |
| S3L02 | use | I want to speak Spanish with you frequently | quiero hablar español contigo seguido | I want+to speak+Spanish+with you+frequently |
| S3L03 | build | to learn Spanish as frequently as possible | aprender español lo más seguido posible | to learn+Spanish+S3L3 |
| S3L03 | build | how to learn as frequently as possible | cómo aprender lo más seguido posible | how+to learn+S3L3 |
| S3L03 | use | I'm trying to learn as frequently as possible | estoy intentando aprender lo más seguido posible | S2L2+to learn+S3L3 |
| S3L03 | use | I want to learn Spanish as frequently as possible | quiero aprender español lo más seguido posible | I want+to learn+Spanish+S3L3 |
| S3L03 | use | I'm trying to speak Spanish as frequently as possible | estoy intentando hablar español lo más seguido posible | S2L2+to speak+Spanish+S3L3 |
| S3L03 | use | I want to speak with you as frequently as possible | quiero hablar contigo lo más seguido posible | I want+to speak+with you+S3L3 |
| S4L01 | build | to say now | decir ahora | to say+now |
| S4L01 | build | to say frequently | decir seguido | to say+frequently |
| S4L01 | use | I want to say frequently | quiero decir seguido | I want+to say+frequently |
| S4L01 | use | I'm trying to say frequently | estoy intentando decir seguido | S2L2+to say+frequently |
| S4L01 | use | I'm trying to say as frequently as possible | estoy intentando decir lo más seguido posible | S2L2+to say+S3L3 |
| S4L02 | build | how to learn something | cómo aprender algo | how+to learn+something |
| S4L02 | build | to learn something now | aprender algo ahora | to learn+something+now |
| S4L02 | use | I'm trying to learn something | estoy intentando aprender algo | S2L2+to learn+something |
| S4L02 | use | I want to learn something now | quiero aprender algo ahora | I want+to learn+something+now |
| S4L02 | use | I want to learn something with you | quiero aprender algo contigo | I want+to learn+something+with you |
| S4L02 | use | I'm trying to say something now | estoy intentando decir algo ahora | S2L2+to say+something+now |
| S4L02 | use | I'm trying to learn something with you | estoy intentando aprender algo contigo | S2L2+to learn+something+with you |
| S4L03 | build | to learn in Spanish | aprender en español | to learn+in+Spanish |
| S4L03 | build | to learn something in Spanish | aprender algo en español | to learn+something+in+Spanish |
| S4L03 | use | I want to speak in Spanish | quiero hablar en español | I want+to speak+in+Spanish |
| S4L03 | use | I want to learn something in Spanish | quiero aprender algo en español | I want+to learn+something+in+Spanish |
| S4L03 | use | I'm trying to learn something in Spanish | estoy intentando aprender algo en español | S2L2+to learn+something+in+Spanish |
| S4L03 | use | I want to speak in Spanish now | quiero hablar en español ahora | I want+to speak+in+Spanish+now |
| S4L03 | use | I want to speak in Spanish frequently | quiero hablar en español seguido | I want+to speak+in+Spanish+frequently |
| S4L03 | use | I want to speak in Spanish with you | quiero hablar en español contigo | I want+to speak+in+Spanish+with you |
| S5L01 | build | I'm going to say | voy a decir | S5L1+to say |
| S5L01 | use | I'm going to speak now | voy a hablar ahora | S5L1+to speak+now |
| S5L01 | use | I'm going to speak with you | voy a hablar contigo | S5L1+to speak+with you |
| S5L01 | use | I'm going to say something | voy a decir algo | S5L1+to say+something |
| S5L01 | use | I'm going to learn something | voy a aprender algo | S5L1+to learn+something |
| S5L01 | use | I'm going to speak in Spanish | voy a hablar en español | S5L1+to speak+in+Spanish |
| S5L01 | use | I'm going to learn Spanish now | voy a aprender español ahora | S5L1+to learn+Spanish+now |
| S5L01 | use | I'm going to speak Spanish frequently | voy a hablar español seguido | S5L1+to speak+Spanish+frequently |
| S5L01 | use | I'm going to speak as frequently as possible | voy a hablar lo más seguido posible | S5L1+to speak+S3L3 |
| S5L01 | use | I'm going to learn something in Spanish | voy a aprender algo en español | S5L1+to learn+something+in+Spanish |
| S5L01 | use | I'm going to say something in Spanish now | voy a decir algo en español ahora | S5L1+to say+something+in+Spanish+now |
| S5L02 | build | to practise Spanish | practicar español | to practise+Spanish |
| S5L02 | build | to practise with you | practicar contigo | to practise+with you |
| S5L02 | build | to practise now | practicar ahora | to practise+now |
| S5L02 | build | how to practise | cómo practicar | how+to practise |
| S5L02 | use | I want to practise now | quiero practicar ahora | I want+to practise+now |
| S5L02 | use | I want to practise with you | quiero practicar contigo | I want+to practise+with you |
| S5L02 | use | I'm going to practise Spanish | voy a practicar español | S5L1+to practise+Spanish |
| S5L02 | use | I want to practise in Spanish | quiero practicar en español | I want+to practise+in+Spanish |
| S5L02 | use | I want to practise frequently | quiero practicar seguido | I want+to practise+frequently |
| S5L02 | use | I'm going to practise as frequently as possible | voy a practicar lo más seguido posible | S5L1+to practise+S3L3 |
| S5L03 | build | to practise speaking now | practicar hablando ahora | to practise+speaking+now |
| S5L03 | build | to practise speaking Spanish | practicar hablando español | to practise+speaking+Spanish |
| S5L03 | use | I want to practise speaking now | quiero practicar hablando ahora | I want+to practise+speaking+now |
| S5L03 | use | I want to practise speaking Spanish | quiero practicar hablando español | I want+to practise+speaking+Spanish |
| S5L03 | use | I'm going to practise speaking with you | voy a practicar hablando contigo | S5L1+to practise+speaking+with you |
| S5L03 | use | I want to practise speaking frequently | quiero practicar hablando seguido | I want+to practise+speaking+frequently |
| S5L03 | use | I'm going to practise speaking as frequently as possible | voy a practicar hablando lo más seguido posible | S5L1+to practise+speaking+S3L3 |
| S5L04 | build | to learn with someone else | aprender con otra persona | to learn+S5L4 |
| S5L04 | build | to say something with someone else | decir algo con otra persona | to say+something+S5L4 |
| S5L04 | use | I want to practise with someone else | quiero practicar con otra persona | I want+to practise+S5L4 |
| S5L04 | use | I'm trying to practise speaking with someone else | estoy intentando practicar hablando con otra persona | S2L2+to practise+speaking+S5L4 |
| S5L04 | use | I want to speak Spanish with someone else | quiero hablar español con otra persona | I want+to speak+Spanish+S5L4 |
| S5L04 | use | I'm going to speak Spanish with someone else | voy a hablar español con otra persona | S5L1+to speak+Spanish+S5L4 |
| S5L04 | use | I want to practise speaking with someone else | quiero practicar hablando con otra persona | I want+to practise+speaking+S5L4 |
| S5L04 | use | I want to learn Spanish with someone else | quiero aprender español con otra persona | I want+to learn+Spanish+S5L4 |
| S6L01 | build | to remember something | recordar algo | to remember+something |
| S6L01 | build | how to remember | cómo recordar | how+to remember |
| S6L01 | use | I'm going to remember something | voy a recordar algo | S5L1+to remember+something |
| S6L01 | use | I want to remember how to speak | quiero recordar cómo hablar | I want+to remember+how+to speak |
| S6L01 | use | I want to remember something in Spanish | quiero recordar algo en español | I want+to remember+something+in+Spanish |
| S6L01 | use | I'm going to remember something in Spanish | voy a recordar algo en español | S5L1+to remember+something+in+Spanish |
| S6L01 | use | I'm trying to remember how to speak Spanish | estoy intentando recordar cómo hablar español | S2L2+to remember+how+to speak+Spanish |
| S6L01 | use | I want to remember how to say something | quiero recordar cómo decir algo | I want+to remember+how+to say+something |
| S6L02 | build | to learn a word | aprender una palabra | to learn+a word |
| S6L02 | build | a word in Spanish | una palabra en español | a word+in+Spanish |
| S6L02 | use | I want to say a word | quiero decir una palabra | I want+to say+a word |
| S6L02 | use | I'm going to remember a word | voy a recordar una palabra | S5L1+to remember+a word |
| S6L02 | use | I want to learn a word | quiero aprender una palabra | I want+to learn+a word |
| S6L02 | use | I want to remember a word in Spanish | quiero recordar una palabra en español | I want+to remember+a word+in+Spanish |
| S6L02 | use | I'm trying to say a word in Spanish | estoy intentando decir una palabra en español | S2L2+to say+a word+in+Spanish |
| S7L01 | build | to try to speak | intentar hablar | to try+to speak |
| S7L01 | build | to try to learn | intentar aprender | to try+to learn |
| S7L01 | build | to try to remember | intentar recordar | to try+to remember |
| S7L01 | use | I want to try to learn Spanish | quiero intentar aprender español | I want+to try+to learn+Spanish |
| S7L01 | use | I'm going to try to speak Spanish | voy a intentar hablar español | S5L1+to try+to speak+Spanish |
| S7L01 | use | I want to try to remember a word | quiero intentar recordar una palabra | I want+to try+to remember+a word |
| S7L01 | use | I'm going to try to say something in Spanish | voy a intentar decir algo en español | S5L1+to try+to say+something+in+Spanish |
| S7L01 | use | I want to try to practise speaking | quiero intentar practicar hablando | I want+to try+to practise+speaking |
| S7L02 | build | to speak today | hablar hoy | to speak+today |
| S7L02 | build | to learn today | aprender hoy | to learn+today |
| S7L02 | build | to practise today | practicar hoy | to practise+today |
| S7L02 | use | I want to speak today | quiero hablar hoy | I want+to speak+today |
| S7L02 | use | I'm going to speak Spanish today | voy a hablar español hoy | S5L1+to speak+Spanish+today |
| S7L02 | use | I want to practise Spanish today | quiero practicar español hoy | I want+to practise+Spanish+today |
| S7L02 | use | I'm trying to speak Spanish today | estoy intentando hablar español hoy | S2L2+to speak+Spanish+today |
| S7L02 | use | I want to remember a word today | quiero recordar una palabra hoy | I want+to remember+a word+today |
| S7L03 | build | practise speaking as hard as I can | practicar hablando todo lo que pueda | to practise+speaking+S7L3 |
| S7L03 | build | say as hard as I can | decir todo lo que pueda | to say+S7L3 |
| S7L03 | use | I'm going to practise as hard as I can | voy a practicar todo lo que pueda | S5L1+to practise+S7L3 |
| S7L03 | use | I want to speak as hard as I can | quiero hablar todo lo que pueda | I want+to speak+S7L3 |
| S7L03 | use | I'm going to learn as hard as I can today | voy a aprender todo lo que pueda hoy | S5L1+to learn+S7L3+today |
| S7L03 | use | I want to try as hard as I can today | quiero intentar todo lo que pueda hoy | I want+to try+S7L3+today |
| S7L03 | use | I want to practise speaking as hard as I can | quiero practicar hablando todo lo que pueda | I want+to practise+speaking+S7L3 |
| S8L01 | build | to explain something | explicar algo | to explain+something |
| S8L01 | build | how to explain | cómo explicar | how+to explain |
| S8L01 | build | to try to explain | intentar explicar | to try+to explain |
| S8L01 | use | I want to explain something in Spanish | quiero explicar algo en español | I want+to explain+something+in+Spanish |
| S8L01 | use | I'm going to explain something | voy a explicar algo | S5L1+to explain+something |
| S8L01 | use | I want to try to explain something | quiero intentar explicar algo | I want+to try+to explain+something |
| S8L01 | use | I want to explain how to say something | quiero explicar cómo decir algo | I want+to explain+how+to say+something |
| S8L02 | build | to say what I mean | decir lo que quiero decir | to say+S8L2 |
| S8L02 | build | to remember what I mean | recordar lo que quiero decir | to remember+S8L2 |
| S8L02 | use | I want to say what I mean | quiero decir lo que quiero decir | I want+to say+S8L2 |
| S8L02 | use | I'm trying to remember what I mean | estoy intentando recordar lo que quiero decir | S2L2+to remember+S8L2 |
| S8L02 | use | I'm going to explain what I mean in Spanish | voy a explicar lo que quiero decir en español | S5L1+to explain+S8L2+in+Spanish |
| S8L02 | use | I want to explain what I mean today | quiero explicar lo que quiero decir hoy | I want+to explain+S8L2+today |
| S8L02 | use | I want to say what I mean in Spanish | quiero decir lo que quiero decir en español | I want+to say+S8L2+in+Spanish |
| S9L01 | build | I speak frequently | hablo seguido | I speak+frequently |
| S9L01 | use | I speak Spanish frequently | hablo español seguido | I speak+Spanish+frequently |
| S9L01 | use | I speak Spanish as frequently as possible | hablo español lo más seguido posible | I speak+Spanish+S3L3 |
| S9L01 | use | I speak Spanish with someone else | hablo español con otra persona | I speak+Spanish+S5L4 |
| S9L01 | use | I speak in Spanish with you | hablo en español contigo | I speak+in+Spanish+with you |
| S9L01 | use | I speak Spanish with you today | hablo español contigo hoy | I speak+Spanish+with you+today |
| S9L02 | build | to learn a little Spanish | aprender un poco de español | to learn+a little+Spanish |
| S9L02 | build | to practise a little Spanish | practicar un poco de español | to practise+a little+Spanish |
| S9L02 | use | I want to learn a little Spanish | quiero aprender un poco de español | I want+to learn+a little+Spanish |
| S9L02 | use | I want to speak a little Spanish with you | quiero hablar un poco de español contigo | I want+to speak+a little+Spanish+with you |
| S9L02 | use | I'm going to speak a little Spanish today | voy a hablar un poco de español hoy | S5L1+to speak+a little+Spanish+today |
| S9L02 | use | I speak a little Spanish with you | hablo un poco de español contigo | I speak+a little+Spanish+with you |
| S9L02 | use | I want to try to speak a little Spanish | quiero intentar hablar un poco de español | I want+to try+to speak+a little+Spanish |
| S10L01 | build | I can say | puedo decir | I can+to say |
| S10L01 | build | I can practise | puedo practicar | I can+to practise |
| S10L01 | build | I can learn | puedo aprender | I can+to learn |
| S10L01 | build | I can explain | puedo explicar | I can+to explain |
| S10L01 | build | I can try | puedo intentar | I can+to try |
| S10L01 | use | I can say something | puedo decir algo | I can+to say+something |
| S10L01 | use | I can say something in Spanish | puedo decir algo en español | I can+to say+something+in+Spanish |
| S10L01 | use | I can practise speaking | puedo practicar hablando | I can+to practise+speaking |
| S10L01 | use | I can learn a word | puedo aprender una palabra | I can+to learn+a word |
| S10L01 | use | I can explain what I mean | puedo explicar lo que quiero decir | I can+to explain+S8L2 |
| S10L01 | use | I can speak Spanish today | puedo hablar español hoy | I can+to speak+Spanish+today |
| S10L02 | build | I'm not sure how to learn | no estoy seguro de cómo aprender | S10L2+how+to learn |
| S10L02 | build | I'm not sure how to remember | no estoy seguro de cómo recordar | S10L2+how+to remember |
| S10L02 | build | I'm not sure how to practise | no estoy seguro de cómo practicar | S10L2+how+to practise |
| S10L02 | use | I'm not sure how to say a word | no estoy seguro de cómo decir una palabra | S10L2+how+to say+a word |
| S10L02 | use | I'm not sure how to explain something in Spanish | no estoy seguro de cómo explicar algo en español | S10L2+how+to explain+something+in+Spanish |
| S10L02 | use | I'm not sure how to speak a little Spanish | no estoy seguro de cómo hablar un poco de español | S10L2+how+to speak+a little+Spanish |
| S10L02 | use | I'm not sure how to remember what I mean | no estoy seguro de cómo recordar lo que quiero decir | S10L2+how+to remember+S8L2 |
| S10L03 | build | I'm not sure if I can say | no estoy seguro de si puedo decir | S10L2+if+I can+to say |
| S10L03 | build | I'm not sure if I can practise | no estoy seguro de si puedo practicar | S10L2+if+I can+to practise |
| S10L03 | build | I'm not sure if I can explain | no estoy seguro de si puedo explicar | S10L2+if+I can+to explain |
| S10L03 | build | I'm not sure if I can learn | no estoy seguro de si puedo aprender | S10L2+if+I can+to learn |
| S10L03 | use | I'm not sure if I can say something in Spanish | no estoy seguro de si puedo decir algo en español | S10L2+if+I can+to say+something+in+Spanish |
| S10L03 | use | I'm not sure if I can remember a word | no estoy seguro de si puedo recordar una palabra | S10L2+if+I can+to remember+a word |
| S10L03 | use | I'm not sure if I can explain what I mean | no estoy seguro de si puedo explicar lo que quiero decir | S10L2+if+I can+to explain+S8L2 |
| S10L03 | use | I'm not sure if I can speak Spanish today | no estoy seguro de si puedo hablar español hoy | S10L2+if+I can+to speak+Spanish+today |
| S10L04 | build | explain the whole sentence | explicar toda la frase | to explain+S10L4 |
| S10L04 | build | practise the whole sentence | practicar toda la frase | to practise+S10L4 |
| S10L04 | build | I can say the whole sentence | puedo decir toda la frase | I can+to say+S10L4 |
| S10L04 | use | I want to say the whole sentence | quiero decir toda la frase | I want+to say+S10L4 |
| S10L04 | use | I want to remember the whole sentence | quiero recordar toda la frase | I want+to remember+S10L4 |
| S10L04 | use | I'm going to try to remember the whole sentence today | voy a intentar recordar toda la frase hoy | S5L1+to try+to remember+S10L4+today |
| S10L04 | use | I want to explain the whole sentence in Spanish | quiero explicar toda la frase en español | I want+to explain+S10L4+in+Spanish |
| S10L04 | use | I'm not sure if I can say the whole sentence | no estoy seguro de si puedo decir toda la frase | S10L2+if+I can+to say+S10L4 |

##### B. Deliberately NOT proposed — spa_mx_for_eng

**Vocabulary not yet introduced** (spa_mx's S4 order is `to say` → `something` → `in`, and S5 is
`I'm going to` → `to practise` — the *opposite* of spa_for_eng on both, so availability differs):
- S4L01 anything with *something* or *in Spanish* — both arrive later in the same seed. This is why
  S4L01 gets only 5 additions: a bare *decir* with no object and no *en español* has very little to
  combine with naturally. That thinness is correct, not a shortfall.
- S5L01 anything with *to practise* — `to practise` is S5L02.
- S6L01 anything with *to try* — `to try` is S7L01.

**Unnatural / grammatical-but-odd — left out:**
- "I want to say with you", "to say with you" as a *pattern* — English wants *say something to you*.
  (The course **already has** "to say with you" at S4L01 and "I want to say something with you" at
  S4L02 — see structural findings. I did not extend the pattern.)
- "I'm trying to try …" — tautological in both languages. (Existing S7L01 row "I'm trying to try
  something" / *estoy intentando intentar algo* has this problem — flagged, not extended.)
- "to speak the whole sentence" — needs *decir*, not *hablar*.
- "I speak as hard as I can" — *hablo todo lo que pueda* mixes indicative with subjunctive scope; only
  proposed under an infinitive/future frame.
- "how to try", "I'm not sure how to try" — vacuous.
- "to remember frequently" / "I want to remember as frequently as possible" — not a frequency activity.

**Would require reordering the known side:** no fronted "Today I…" / "Now I…" variants proposed.

**ZUT clashes — checked and avoided:** every proposed `known_text` diffed (case- and
punctuation-insensitive) against all 257 existing spa_mx_for_eng rows in seeds 1–10; zero collisions,
zero duplicates within the proposal, and zero cross-lego collisions. Token-availability check (both
known and target side, against all legos at or before each row's position): **zero unavailable tokens**.

---

#### Structural findings (both courses)

1. **No barren `is_new=true` legos.** Every lego in seeds 1–10 of both courses is `is_new=true`, and every
   one except S1L01 already carries ≥1 combination phrase. Nothing to "unbarren".
2. **S1L01 is NOT barren in either course** — both carry one `build` row "I want" / *quiero* at
   lego_count 2 (spa_for_eng) / 2 (spa_mx). Finnish's S1L01 has only `component` rows. This is a
   *deviation from the gold standard in the opposite direction* (extra content, not missing). Per Kai's
   rule 1 I did not touch it, and I do **not** recommend deleting it — flagging only.
3. **The flat quota is the real defect.** Both courses hold ~3 build / ~5 use per lego from S2 to S10
   regardless of accumulated inventory. Finnish's density climbs with inventory. This looks like a
   generator with a fixed per-lego quota rather than exhaustive combination coverage.
4. **Existing rows that break the authoring rule** (reported, NOT fixed, NOT extended):
   - spa_for_eng S2L01 use `Now I want to learn Spanish with you` — fronted "Now", a known-side reorder.
   - spa_for_eng S4L01 build `How to speak in Spanish?` — question mark added; no sibling row uses one.
   - spa_for_eng S7L03 use `I want to try as hard as I can to speak Spanish` /
     *Quiero intentar hablar español todo lo que pueda* — known and target put *as hard as I can* /
     *todo lo que pueda* in different positions; the known side reads as a reorder to fit.
   - spa_mx_for_eng S4L01 build `to say with you` and S4L02 use `I want to say something with you` —
     *say something **to** you* is the natural English; *decir algo contigo* is odd Spanish.
   - spa_mx_for_eng S7L01 use `I'm trying to try something` / *estoy intentando intentar algo* — tautology.
5. **lego_count values on existing rows are unreliable.** e.g. spa_for_eng S4L02 `I want to learn something`
   is stored with lego_count 2 (should be 4); S6L01 `I'm trying to remember` with lego_count 1;
   S8L01 `I'm going to try to explain` with lego_count 2. I did not propose lego_count values for that
   reason — the `combines` column above states the intent instead.
6. **Neither course's flagged duplicate is a defect.** spa_mx_for_eng's `frequently`/*seguido* appearing
   as both an S3L02 lego and an S3L03 component is the normal component-vs-build overlap (Finnish has
   the same at S3L04). Not reported as a problem.

#### Explicit gaps — things I could NOT verify

- **I did not verify native-speaker naturalness with a native peninsular/Mexican speaker.** All target
  text is my own composition following each course's existing patterns and register. Specific rows I am
  least confident about and would want a native check on before any write:
  - `practicar en español` / `aprender en español` ("to practise in Spanish", "to learn in Spanish") —
    grammatical, but *practicar el español* may be preferred; I followed the course's existing
    `hablar en español` pattern rather than introducing a new one.
  - `No estoy seguro de decir` / `No estoy seguro de aprender` (spa_for_eng S10L02 "I'm not sure about
    saying/learning") — I copied the existing `No estoy seguro de hablar` pattern verbatim. That
    existing pattern is itself slightly odd Spanish (*no estoy seguro de si…* is more idiomatic), but
    changing it would break ZUT with the three existing rows, so I matched it.
  - `decir todo lo que pueda` (spa_mx S7L03 "say as hard as I can") — the weakest of that group.
  - `quiero decir lo que quiero decir` ("I want to say what I mean") — the *quiero…quiero decir* echo is
    unavoidable given the S8L02 lego, and is grammatical, but it reads clumsily. Kai may want to drop it.
- **I did not verify existing audio coverage.** I did not query `course_audio`, so I cannot say how many
  of these ~350 proposed rows would need new TTS, nor whether any proposed `known_text` collides with a
  phrase that already has audio under a different id. That must be checked before any write.
- **I did not check seeds 11+.** A proposed `known_text` here could ZUT-clash with a phrase introduced
  later in the course. My ZUT check covers seeds 1–10 only, per the brief's scope.
- **I did not verify how the course-builder assigns `position` or `phrase_id`** for backfilled rows, so
  I give no positions. Per `[[additive-phrase-write-path]]`, backfill-submit is the only non-destructive
  path — but I did not re-verify that endpoint still exists on the current branch.
- **Counts:** 195 (spa_for_eng) and 192 (spa_mx_for_eng), counted mechanically from the tables above,
  not by hand. That would take spa_for_eng 210 → 405 and spa_mx_for_eng 217 → 409 combination phrases,
  i.e. **past Finnish's 347**. I did not trim to hit 347, because the brief says match the *shape*, not
  the count, and because trimming is the reviewer's call. If Kai does want to land nearer Finnish, the
  `use` rows at the tail of the denser legos (S5L02, S10L01, S10L03 in spa_for_eng; S5L01, S10L01 in
  spa_mx) are the ones to cut first — they are the most mechanical.
- **The verification above is mechanical, not semantic.** "Zero ZUT collisions" means zero *string*
  collisions on normalised `known_text`. It does not catch a near-synonym clash (e.g. a proposed known
  phrase that means the same as an existing one under different wording). I did not attempt that check.

---

#### fra.md — backfill proposal (READ-ONLY, nothing applied)

Courses: `fra_for_eng`, `fra_ca_for_eng`. Baseline: `fin_for_eng` seeds 1-10 = 347 combos.
Current: fra_for_eng 286 combos / fra_ca_for_eng 201 combos.

**Sanity-check of the prior worker's applied changes — both hold.**
- `fra_for_eng:S0001L02B01` "I want to speak" -> "je veux parler" is present, `build`, position 1, and is Finnish-shaped (fin S1L02 has exactly one build, "I want to speak").
- fra_for_eng is at 334 rows / 286 combos. No duplicate `known_text` survives in seeds 1-10 **except the five listed in Structural findings below**, which are a *different* defect (S8L02) and were not part of that dedupe.

---

##### fra_for_eng

###### A. Proposed phrases — 67

Verified before proposing: none of these `known_text` values already exists anywhere in seeds 1-10, and none of these `target_text` values is already in use for a different `known_text`. So no ZUT clash and no reverse collision.

| Seed/Lego | phrase_role | known_text | target_text | combines |
|---|---|---|---|---|
| S1L04 | build | French with you | français avec toi | L3+L4 |
| S1L05 | build | French now | français maintenant | L3+L5 |
| S1L05 | build | with you now | avec toi maintenant | L4+L5 |
| S2L01 | build | to learn with you now | apprendre avec toi maintenant | S2L1+S1L4+S1L5 |
| S3L01 | use | I'm trying to learn how to speak | j'essaie d'apprendre comment parler | S2L3+S3L1+S1L2 |
| S3L01 | use | I want to learn how to speak French now | je veux apprendre comment parler français maintenant | S1L1+S2L1+S3L1+S1L2+S1L3+S1L5 |
| S3L03 | use | I want to speak often | je veux parler souvent | S1L1+S1L2+S3L3 |
| S3L03 | use | I'm trying to speak often | j'essaie de parler souvent | S2L2+S1L2+S3L3 |
| S3L03 | use | I want to learn often | je veux apprendre souvent | S1L1+S2L1+S3L3 |
| S3L04 | use | I want to learn as often as possible | je veux apprendre aussi souvent que possible | S1L1+S2L1+S3L4 |
| S3L04 | use | I'm trying to speak as often as possible | j'essaie de parler aussi souvent que possible | S2L2+S1L2+S3L4 |
| S3L04 | use | I want to speak French with you as often as possible | je veux parler français avec toi aussi souvent que possible | S1L1-4+S3L4 |
| S4L01 | build | to say now | dire maintenant | S4L1+S1L5 |
| S4L01 | use | I'm trying to say | j'essaie de dire | S2L2+S4L1 |
| S4L02 | use | I'm trying to say something | j'essaie de dire quelque chose | S2L2+S4L1+S4L2 |
| S4L02 | use | I want to learn something now | je veux apprendre quelque chose maintenant | S1L1+S2L1+S4L2+S1L5 |
| S4L03 | use | I'm trying to say something in French | j'essaie de dire quelque chose en français | S2L2+S4L1+S4L2+S4L3 |
| S5L01 | build | I'm going to say | je vais dire | S5L1+S4L1 |
| S5L01 | use | I'm going to speak with you | je vais parler avec toi | S5L1+S1L2+S1L4 |
| S5L01 | use | I'm going to speak often | je vais parler souvent | S5L1+S1L2+S3L3 |
| S5L01 | use | I'm going to learn something | je vais apprendre quelque chose | S5L1+S2L1+S4L2 |
| S5L02 | build | to practise speaking with you | m'entraîner à parler avec toi | S5L2+S1L4 |
| S5L02 | build | to practise speaking as often as possible | m'entraîner à parler aussi souvent que possible | S5L2+S3L4 |
| S5L02 | use | I'm going to practise speaking with you | je vais m'entraîner à parler avec toi | S5L1+S5L2+S1L4 |
| S5L02 | use | I want to practise speaking now | je veux m'entraîner à parler maintenant | S1L1+S5L2+S1L5 |
| S5L02 | use | I want to practise speaking French with you | je veux m'entraîner à parler français avec toi | S1L1+S5L2+S1L3+S1L4 |
| S5L03 | build | to practise speaking French with someone else | m'entraîner à parler français avec quelqu'un d'autre | S5L2+S1L3+S5L3 |
| S5L03 | use | I want to speak French with someone else | je veux parler français avec quelqu'un d'autre | S1L1+S1L2+S1L3+S5L3 |
| S6L01 | build | I'm trying to remember how to speak | j'essaie de me souvenir comment parler | S6L1+S3L1+S1L2 |
| S6L01 | use | I'm trying to remember something in French | j'essaie de me souvenir de quelque chose en français | S6L1+S4L2+S4L3 |
| S6L02 | build | to say a word now | dire un mot maintenant | S4L1+S6L2+S1L5 |
| S6L02 | use | I'm going to say a word in French | je vais dire un mot en français | S5L1+S4L1+S6L2+S4L3 |
| S7L01 | build | to try to speak | essayer de parler | S7L1+S1L2 |
| S7L01 | build | to try to say something | essayer de dire quelque chose | S7L1+S4L1+S4L2 |
| S7L01 | use | I'm going to try to speak French | je vais essayer de parler français | S5L1+S7L1+S1L2+S1L3 |
| S7L01 | use | I want to try to say something in French | je veux essayer de dire quelque chose en français | S1L1+S7L1+S4L1+S4L2+S4L3 |
| S7L02 | use | I can practise speaking | je peux m'entraîner à parler | S7L2+S5L2 |
| S7L02 | use | I can say something now | je peux dire quelque chose maintenant | S7L2+S4L1+S4L2+S1L5 |
| S7L02 | use | I can learn something | je peux apprendre quelque chose | S7L2+S2L1+S4L2 |
| S7L03 | use | I'm going to try as hard as I can with you | je vais essayer aussi fort que je peux avec toi | S5L1+S7L1+S7L3+S1L4 |
| S7L04 | build | to say something today | dire quelque chose aujourd'hui | S4L1+S4L2+S7L4 |
| S7L04 | build | to learn today | apprendre aujourd'hui | S2L1+S7L4 |
| S7L04 | use | I want to try today | je veux essayer aujourd'hui | S1L1+S7L1+S7L4 |
| S8L01 | build | to explain in French | expliquer en français | S8L1+S4L3 |
| S8L01 | use | I'm going to explain something in French | je vais expliquer quelque chose en français | S5L1+S8L1+S4L2+S4L3 |
| S8L01 | use | I can explain something today | je peux expliquer quelque chose aujourd'hui | S7L2+S8L1+S4L2+S7L4 |
| S8L03 | use | I can try to explain something | je peux essayer d'expliquer quelque chose | S7L2+S8L3+S4L2 |
| S8L03 | use | I want to try to explain today | je veux essayer d'expliquer aujourd'hui | S1L1+S8L3+S7L4 |
| S8L04 | use | I want to explain what I mean | je veux expliquer ce que je veux dire | S1L1+S8L1+S8L4 |
| S8L04 | use | I can try to explain what I mean | je peux essayer d'expliquer ce que je veux dire | S7L2+S8L3+S8L4 |
| S9L01 | use | I speak French with you now | je parle français avec toi maintenant | S9L1+S1L3+S1L4+S1L5 |
| S9L01 | use | I speak French often | je parle français souvent | S9L1+S1L3+S3L3 |
| S9L01 | use | I speak with someone else | je parle avec quelqu'un d'autre | S9L1+S5L3 |
| S9L01 | use | I speak French as often as possible | je parle français aussi souvent que possible | S9L1+S1L3+S3L4 |
| S9L02 | build | to speak a little | parler un peu | S1L2+S9L2 |
| S9L02 | use | I can speak a little | je peux parler un peu | S7L2+S1L2+S9L2 |
| S9L02 | use | I speak a little today | je parle un peu aujourd'hui | S9L1+S9L2+S7L4 |
| S9L03 | build | to speak a little French | parler un peu français | S1L2+S9L3 |
| S10L01 | build | I'm not sure how to speak French | je ne suis pas sûr de comment parler français | S10L1+S3L1+S1L2+S1L3 |
| S10L01 | use | I'm not sure how to explain in French | je ne suis pas sûr de comment expliquer en français | S10L1+S3L1+S8L1+S4L3 |
| S10L01 | use | I'm not sure how to say something | je ne suis pas sûr de comment dire quelque chose | S10L1+S3L1+S4L1+S4L2 |
| S10L02 | build | to be able to remember | pouvoir me souvenir | S10L2+S6L1(remember) |
| S10L02 | use | I want to be able to speak with you | je veux pouvoir parler avec toi | S1L1+S10L2+S1L2+S1L4 |
| S10L03 | use | I'm not sure if I can explain what I mean in French | je ne suis pas sûr de pouvoir expliquer ce que je veux dire en français | S10L3+S8L1+S8L4+S4L3 |
| S10L04 | build | to try to say the whole sentence | essayer de dire toute la phrase | S7L1+S4L1+S10L4 |
| S10L04 | use | I'm not sure if I can explain the whole sentence | je ne suis pas sûr de pouvoir expliquer toute la phrase | S10L3+S8L1+S10L4 |
| S10L05 | use | I want to remember the whole sentence today | je veux me souvenir de toute la phrase aujourd'hui | S1L1+S10L5+S7L4 |

###### B. Deliberately NOT proposed — and why

**Blocked by French grammar: "to learn French" and its whole family (the single biggest reason fra sits below fin).**
Finnish gets 8+ phrases out of `oppia suomea` ("to learn Finnish", "I want to learn Finnish", "I'm trying to learn Finnish", "I want to learn Finnish with you now", …). French cannot: `apprendre français` is ungrammatical — it requires the article, `apprendre **le** français`. The learner has never been given `le`, and introducing it here would break the controlled-known rule. So the following are all rejected, not missed:
`to learn French` / `I want to learn French` / `I'm trying to learn French` / `I want to learn French now` / `I want to learn French with you` / `I want to learn French with you now` / `I'm going to learn French` / `I can learn French` / `to learn French today` / `to learn French as often as possible`.
> **This is the one thing worth a decision from you.** If you want that family, it needs a `le` lego (or `le français` as a lego). Otherwise fra structurally *cannot* reach fin's density and that is fine. Note the course already half-commits to article-less French in S9L03 (`apprendre un peu français`, `je veux apprendre un peu français`) — standard French would be `un peu **de** français`. Flagging, not fixing.

**Would require reordering / awkward adverb placement on the target side.**
`to speak with you often`, `to speak with you often now`, `to say something in French often`, `to learn a word often`. French puts `souvent` right after the verb (`parler souvent avec toi`), so a straight LEGO-order rendering (`parler avec toi souvent`) is marked-to-odd. The existing `parler français souvent` is already at the edge of this; I did not manufacture more of them.

**Collides with the `je veux dire` overload — see Structural findings.**
`I want to say the whole sentence` (`je veux dire toute la phrase`), `I mean something today`, `I mean the whole sentence`, `I mean a little`, `I mean something now`. Every remaining `I mean X` combination produces a target string that is *also* the correct target for `I want to say X`. Adding more deepens an existing collision rather than adding coverage. I propose **zero** new S8L02 rows for this reason.

**Missing the bare lego the combination would need.**
- `to remember X` as a standalone build (`me souvenir de…`): fra has no bare "to remember" lego — S6L01 is the whole `I'm trying to remember`. I proposed only `to be able to remember`, because S10L02 `pouvoir` + `me souvenir` is a pattern the course already uses (`je ne suis pas sûr de pouvoir me souvenir maintenant`). I did **not** propose `to remember now` / `to remember a word` / `I want to remember a word`.
- `I'm trying now` (fin has it): fra's lego is `I'm trying **to**` = `j'essaie de`, which cannot stand without an infinitive. `j'essaie maintenant` would require chopping the lego. Rejected.
- `to practise X` without "speaking": fra's lego is the fused `to practise speaking` = `m'entraîner à parler` (reflexive, bound to 1sg). No `to practise a word` / `to practise French` possible.

**Grammatical but odd — left out.**
`to say what I mean` (`dire ce que je veux dire` — self-swallowing), `to speak something`, `to say with you`, `I can try as hard as I can` (stacks `je peux … que je peux`; one such row already exists at S7L03, I did not add more), `to speak as hard as I can`, `I want to say something often`.

###### Structural findings — fra_for_eng

1. **S8L02 (`I mean` -> `je veux dire`) is the worst row-block in the course. Look at this first.**
   Five of its nine phrases are **verbatim duplicates** of phrases already authored under earlier legos — same `known_text`, same `target_text`:
   | duplicate known_text | first authored | duplicated at |
   |---|---|---|
   | I want to say something | S4L02 use | S8L02 use |
   | I want to say something now | S4L02 use | S8L02 use |
   | I want to say something in French | S4L03 use | S8L02 use |
   | I want to say a word in French | S6L02 use | S8L02 use |
   | I want to say something in French today | S7L04 use | S8L02 use |
   These are **not** the 24 rows the previous worker deleted — they survived that pass. On top of that, its three `build` rows collide in target with existing "I want to say" phrases (`I mean something` / `I want to say something` both -> `je veux dire quelque chose`; same for `… in French` and `… a word`). **I propose no deletions** — flagging only. After removing the five duplicates S8L02 would hold 3 build + 1 use.
2. **S3L02 (`to speak`, `is_new=false`) correctly carries zero phrases.** Confirmed against the rule — do not "fix" it. It is the only `is_new=false` lego in fra_for_eng seeds 1-10.
3. **No `is_new=true` lego in seeds 1-10 has zero combination phrases.** S1L01 is barren, which is correct.
4. **Thinnest legos before this proposal** (build/use): S6L01 1/6, S7L03 1/6, S9L01 1/6, S10L01 1/6, S3L03 3/2, S2L01 2/4 — versus fin equivalents at 5-9 apiece. My proposals raise these but do not force them to fin parity, because of the `apprendre le français` block above.
5. No seed looks truncated. All ten seeds have a plausible lego arc and a use-heavy tail.

###### Explicit gaps — fra_for_eng

- **I did not verify audio state.** I did not query `course_audio`, so I cannot say whether existing rows have audio or whether adding 67 rows creates a large missing-audio backlog. Assume it does.
- **I did not verify `position` values.** My proposals give seed/lego/role only; positions must be assigned by the write path, not by me.
- **`je ne suis pas sûr` is masculine-only.** Every S10 phrase (existing and proposed) uses `sûr`, never `sûre`. That is a pre-existing course-wide choice; I matched it rather than changing it, but I could not find where that decision is recorded.
- **`m'entraîner à parler` for "to practise speaking"** — I matched the existing target exactly. I did not independently confirm this is the intended register versus `pratiquer`; fra_ca uses `pratiquer à parler`, so the two French courses diverge here. Not my call.
- **Unverified: whether S8L02 should exist at all.** Given that `I mean` = `je veux dire` is homographic with `I want to say` in French, the lego may be methodologically unsound in this language pair. I am flagging the symptom; the judgement is yours.

---


---

#### fra-ca.md — `fra_ca_for_eng` backfill proposal (READ-ONLY, nothing applied)

Course: `fra_ca_for_eng` (Quebec French, draft). Baseline `fin_for_eng` seeds 1-10 = 347 combos.
Current: **198 combination phrases** (243 rows = 85 build + 130 use + 28 component).
Proposed: **+131** → 329. Method matches `fragments/fra.md`; French text is deliberately NOT copied from
`fra_for_eng` — everything below is Quebec register as the course already establishes it
(`j'veux`, `j'essaye de`, `m'as`, `j'peux`, `j'parle`, `chu pas sûr si`, `là` for *now*,
`un ptit peu`, `me rappeler`, `pratiquer à parler`, `québécois` for *French*).

**Where the room is.** From S4 onward every lego sits at exactly 7-8 combos — a hard, uniform cap that
looks generated, not authored. Finnish runs 10-16 there. S1-S3 are much thinner still (1-3 per lego vs
Finnish 1-16). So the proposal is: fill S1-S3 properly (+31) and lift S4-S10 from 7-8 to 11-13 (+100).

Verified before proposing (script check, 0 issues): none of the 131 `known_text` values already exists
anywhere in `fra_ca_for_eng` seeds 1-10 (legos or phrases), and none of the 131 `target_text` values is
already in use for a *different* known_text. No ZUT clash, no reverse collision, no self-duplicates.

---

##### A. Proposed phrases — 131

| Seed/Lego | phrase_role | known_text | target_text | combines |
|---|---|---|---|---|
| S1L04 | build | French with you | québécois avec toi | S1L3+S1L4 |
| S1L04 | build | speak French with you | parler québécois avec toi | S1L2+S1L3+S1L4 |
| S1L05 | build | to speak now | parler là | S1L2+S1L5 |
| S1L05 | build | speak French now | parler québécois là | S1L2+S1L3+S1L5 |
| S1L05 | use | I want to speak now | j'veux parler là | S1L1+S1L2+S1L5 |
| S1L05 | use | I want to speak French now | j'veux parler québécois là | S1L1+S1L2+S1L3+S1L5 |
| S2L01 | build | to learn with you | apprendre avec toi | S1L4+S2L1 |
| S2L01 | build | to learn now | apprendre là | S1L5+S2L1 |
| S2L01 | build | to learn with you now | apprendre avec toi là | S1L4+S1L5+S2L1 |
| S2L01 | use | I want to learn now | j'veux apprendre là | S1L1+S1L5+S2L1 |
| S2L01 | use | I want to learn with you | j'veux apprendre avec toi | S1L1+S1L4+S2L1 |
| S2L01 | use | I want to learn with you now | j'veux apprendre avec toi là | S1L1+S1L4+S1L5+S2L1 |
| S2L02 | use | i'm trying to speak now | j'essaye de parler là | S1L2+S1L5+S2L2 |
| S2L02 | use | i'm trying to speak with you now | j'essaye de parler avec toi là | S1L2+S1L4+S1L5+S2L2 |
| S2L02 | use | i'm trying to speak French with you | j'essaye de parler québécois avec toi | S1L2+S1L3+S1L4+S2L2 |
| S2L02 | use | i'm trying to speak French now | j'essaye de parler québécois là | S1L2+S1L3+S1L5+S2L2 |
| S2L02 | use | i'm trying to speak French with you now | j'essaye de parler québécois avec toi là | S1L2+S1L3+S1L4+S1L5+S2L2 |
| S2L03 | use | i'm trying to learn with you now | j'essaye d'apprendre avec toi là | S1L4+S1L5+S2L3 |
| S3L01 | use | I want to learn how to speak | j'veux apprendre comment parler | S1L1+S1L2+S2L1+S3L1 |
| S3L01 | use | I want to learn how to speak French | j'veux apprendre comment parler québécois | S1L1+S1L2+S1L3+S2L1+S3L1 |
| S3L01 | use | i'm trying to learn how to speak | j'essaye d'apprendre comment parler | S1L2+S2L3+S3L1 |
| S3L01 | use | I want to learn how to speak French with you | j'veux apprendre comment parler québécois avec toi | S1L1+S1L2+S1L3+S1L4+S2L1+S3L1 |
| S3L02 | build | to learn often | apprendre souvent | S2L1+S3L2 |
| S3L02 | use | I want to speak often | j'veux parler souvent | S1L1+S1L2+S3L2 |
| S3L02 | use | I want to learn often | j'veux apprendre souvent | S1L1+S2L1+S3L2 |
| S3L02 | use | i'm trying to learn often | j'essaye d'apprendre souvent | S2L3+S3L2 |
| S3L03 | build | to learn as often as possible | apprendre le plus souvent possible | S2L1+S3L3 |
| S3L03 | use | I want to speak as often as possible | j'veux parler le plus souvent possible | S1L1+S1L2+S3L3 |
| S3L03 | use | I want to learn as often as possible | j'veux apprendre le plus souvent possible | S1L1+S2L1+S3L3 |
| S3L03 | use | i'm trying to speak as often as possible | j'essaye de parler le plus souvent possible | S1L2+S2L2+S3L3 |
| S3L03 | use | i'm trying to learn as often as possible | j'essaye d'apprendre le plus souvent possible | S2L3+S3L3 |
| S4L01 | build | to say now | dire là | S1L5+S4L1 |
| S4L01 | build | to say often | dire souvent | S3L2+S4L1 |
| S4L01 | use | I want to say often | j'veux dire souvent | S1L1+S3L2+S4L1 |
| S4L01 | use | I want to learn how to say | j'veux apprendre comment dire | S1L1+S2L1+S3L1+S4L1 |
| S4L02 | build | to say something now | dire quelque chose là | S1L5+S4L1+S4L2 |
| S4L02 | build | how to say something | comment dire quelque chose | S3L1+S4L1+S4L2 |
| S4L02 | use | I want to say something now | j'veux dire quelque chose là | S1L1+S1L5+S4L1+S4L2 |
| S4L02 | use | I want to learn something | j'veux apprendre quelque chose | S1L1+S2L1+S4L2 |
| S4L02 | use | i'm trying to say something often | j'essaye de dire quelque chose souvent | S2L2+S3L2+S4L1+S4L2 |
| S4L03 | build | how to speak in French | comment parler en québécois | S1L2+S3L1+S4L4 |
| S4L03 | use | i'm trying to speak in French now | j'essaye de parler en québécois là | S1L2+S1L5+S2L2+S4L4 |
| S4L03 | use | I want to speak in French with you | j'veux parler en québécois avec toi | S1L1+S1L2+S1L4+S4L4 |
| S4L04 | build | to say something in French now | dire quelque chose en québécois là | S1L5+S4L1+S4L2+S4L4 |
| S4L04 | use | I want to say something in French as often as possible | j'veux dire quelque chose en québécois le plus souvent possible | S1L1+S3L3+S4L1+S4L2+S4L4 |
| S4L04 | use | i'm trying to say something in French with you | j'essaye de dire quelque chose en québécois avec toi | S1L4+S2L2+S4L1+S4L2+S4L4 |
| S5L01 | use | i'm going to speak now | m'as parler là | S1L2+S1L5+S5L1 |
| S5L01 | use | i'm going to learn now | m'as apprendre là | S1L5+S2L1+S5L1 |
| S5L01 | use | i'm going to say something now | m'as dire quelque chose là | S1L5+S4L1+S4L2+S5L1 |
| S5L01 | use | i'm going to speak French with you | m'as parler québécois avec toi | S1L2+S1L3+S1L4+S5L1 |
| S5L01 | use | i'm going to learn with you | m'as apprendre avec toi | S1L4+S2L1+S5L1 |
| S5L02 | build | to practise with you | pratiquer avec toi | S1L4+S5L2 |
| S5L02 | use | I want to practise | j'veux pratiquer | S1L1+S5L2 |
| S5L02 | use | I want to practise with you | j'veux pratiquer avec toi | S1L1+S1L4+S5L2 |
| S5L02 | use | i'm trying to practise now | j'essaye de pratiquer là | S1L5+S2L2+S5L2 |
| S5L02 | use | I want to practise as often as possible | j'veux pratiquer le plus souvent possible | S1L1+S3L3+S5L2 |
| S5L03 | build | to practise speaking with you | pratiquer à parler avec toi | S1L4+S5L3 |
| S5L03 | build | to practise speaking as often as possible | pratiquer à parler le plus souvent possible | S3L3+S5L3 |
| S5L03 | use | I want to practise speaking with you | j'veux pratiquer à parler avec toi | S1L1+S1L4+S5L3 |
| S5L03 | use | I want to practise speaking French | j'veux pratiquer à parler québécois | S1L1+S1L3+S5L3 |
| S5L03 | use | i'm trying to practise speaking French | j'essaye de pratiquer à parler québécois | S1L3+S2L2+S5L3 |
| S5L04 | build | to speak with someone | parler avec quelqu'un | S1L2+S1L4+S5L4 |
| S5L04 | use | I want to speak with someone | j'veux parler avec quelqu'un | S1L1+S1L2+S1L4+S5L4 |
| S5L04 | use | i'm trying to speak with someone | j'essaye de parler avec quelqu'un | S1L2+S1L4+S2L2+S5L4 |
| S5L04 | use | I want to practise with someone | j'veux pratiquer avec quelqu'un | S1L1+S1L4+S5L2+S5L4 |
| S5L05 | build | to speak with someone else | parler avec quelqu'un d'autre | S1L2+S1L4+S5L5 |
| S5L05 | use | I want to speak with someone else | j'veux parler avec quelqu'un d'autre | S1L1+S1L2+S1L4+S5L5 |
| S5L05 | use | i'm trying to speak with someone else | j'essaye de parler avec quelqu'un d'autre | S1L2+S1L4+S2L2+S5L5 |
| S5L05 | use | I want to practise speaking with someone else | j'veux pratiquer à parler avec quelqu'un d'autre | S1L1+S1L4+S5L3+S5L5 |
| S6L01 | build | to remember something | me rappeler quelque chose | S4L2+S6L1 |
| S6L01 | use | i'm trying to remember something | j'essaye de me rappeler quelque chose | S2L2+S4L2+S6L1 |
| S6L01 | use | I want to remember something now | j'veux me rappeler quelque chose là | S1L1+S1L5+S4L2+S6L1 |
| S6L01 | use | i'm trying to remember as often as possible | j'essaye de me rappeler le plus souvent possible | S2L2+S3L3+S6L1 |
| S6L02 | build | to say a word | dire un mot | S4L1+S6L2 |
| S6L02 | use | I want to say a word | j'veux dire un mot | S1L1+S4L1+S6L2 |
| S6L02 | use | I want to say a word in French | j'veux dire un mot en québécois | S1L1+S4L1+S4L4+S6L2 |
| S6L02 | use | i'm trying to remember a word now | j'essaye de me rappeler un mot là | S1L5+S2L2+S6L1+S6L2 |
| S7L01 | build | to try to say | essayer de dire | S4L1+S7L1 |
| S7L01 | build | to try to remember | essayer de me rappeler | S6L1+S7L1 |
| S7L01 | use | I want to try to speak | j'veux essayer de parler | S1L1+S1L2+S7L1 |
| S7L01 | use | I want to try to learn | j'veux essayer d'apprendre | S1L1+S2L1+S7L1 |
| S7L01 | use | i'm going to try to say something | m'as essayer de dire quelque chose | S4L1+S4L2+S5L1+S7L1 |
| S7L02 | build | I can learn | j'peux apprendre | S2L1+S7L2 |
| S7L02 | build | I can say something | j'peux dire quelque chose | S4L1+S4L2+S7L2 |
| S7L02 | use | I can practise speaking | j'peux pratiquer à parler | S5L3+S7L2 |
| S7L02 | use | I can speak with someone else | j'peux parler avec quelqu'un d'autre | S1L2+S1L4+S5L5+S7L2 |
| S7L02 | use | I can remember a word | j'peux me rappeler un mot | S6L1+S6L2+S7L2 |
| S7L03 | use | I want to practise as hard as I can | j'veux pratiquer aussi fort que j'peux | S1L1+S5L2+S7L3 |
| S7L03 | use | i'm going to try as hard as I can | m'as essayer aussi fort que j'peux | S5L1+S7L1+S7L3 |
| S7L03 | use | i'm trying to remember as hard as I can | j'essaye de me rappeler aussi fort que j'peux | S2L2+S6L1+S7L3 |
| S7L04 | build | to practise today | pratiquer aujourd'hui | S5L2+S7L4 |
| S7L04 | use | I want to speak French today | j'veux parler québécois aujourd'hui | S1L1+S1L2+S1L3+S7L4 |
| S7L04 | use | i'm going to try today | m'as essayer aujourd'hui | S5L1+S7L1+S7L4 |
| S7L04 | use | I can remember a word today | j'peux me rappeler un mot aujourd'hui | S6L1+S6L2+S7L2+S7L4 |
| S7L04 | use | I want to practise speaking with you today | j'veux pratiquer à parler avec toi aujourd'hui | S1L1+S1L4+S5L3+S7L4 |
| S8L01 | build | to explain something | expliquer quelque chose | S4L2+S8L1 |
| S8L01 | use | i'm trying to explain | j'essaye d'expliquer | S2L2+S8L1 |
| S8L01 | use | I can explain something | j'peux expliquer quelque chose | S4L2+S7L2+S8L1 |
| S8L01 | use | I want to explain something in French | j'veux expliquer quelque chose en québécois | S1L1+S4L2+S4L4+S8L1 |
| S8L01 | use | I can explain something today | j'peux expliquer quelque chose aujourd'hui | S4L2+S7L2+S7L4+S8L1 |
| S8L02 | use | I want to try to explain something | j'veux essayer d'expliquer quelque chose | S1L1+S4L2+S8L2 |
| S8L02 | use | I can try to explain | j'peux essayer d'expliquer | S7L2+S8L2 |
| S8L02 | use | I want to try to explain today | j'veux essayer d'expliquer aujourd'hui | S1L1+S7L4+S8L2 |
| S8L02 | use | i'm going to try to explain something today | m'as essayer d'expliquer quelque chose aujourd'hui | S4L2+S5L1+S7L4+S8L2 |
| S8L03 | use | I want to explain what I mean | j'veux expliquer ce que j'veux dire | S1L1+S4L1+S8L1+S8L3 |
| S8L03 | use | I can explain what I mean | j'peux expliquer ce que j'veux dire | S1L1+S4L1+S7L2+S8L1+S8L3 |
| S8L03 | use | i'm going to say what I mean | m'as dire ce que j'veux dire | S1L1+S4L1+S5L1+S8L3 |
| S8L03 | use | I want to try to explain what I mean | j'veux essayer d'expliquer ce que j'veux dire | S1L1+S4L1+S8L2+S8L3 |
| S9L01 | build | I speak French with you | j'parle québécois avec toi | S1L3+S1L4+S9L1 |
| S9L01 | use | I speak with you now | j'parle avec toi là | S1L4+S1L5+S9L1 |
| S9L01 | use | I speak French today | j'parle québécois aujourd'hui | S1L3+S7L4+S9L1 |
| S9L01 | use | I speak with someone | j'parle avec quelqu'un | S1L4+S5L4+S9L1 |
| S9L02 | build | to speak a little | parler un ptit peu | S1L2+S9L2 |
| S9L02 | use | I can speak a little | j'peux parler un ptit peu | S1L2+S7L2+S9L2 |
| S9L02 | use | I speak a little today | j'parle un ptit peu aujourd'hui | S7L4+S9L1+S9L2 |
| S9L02 | use | I can explain a little | j'peux expliquer un ptit peu | S7L2+S8L1+S9L2 |
| S9L02 | use | I want to practise a little today | j'veux pratiquer un ptit peu aujourd'hui | S1L1+S5L2+S7L4+S9L2 |
| S10L01 | build | i'm not sure if I can explain | chu pas sûr si j'peux expliquer | S8L1+S10L1 |
| S10L01 | use | i'm not sure if I can speak French with you | chu pas sûr si j'peux parler québécois avec toi | S1L2+S1L3+S1L4+S10L1 |
| S10L01 | use | i'm not sure if I can say something in French | chu pas sûr si j'peux dire quelque chose en québécois | S4L1+S4L2+S4L4+S10L1 |
| S10L01 | use | i'm not sure if I can explain what I mean | chu pas sûr si j'peux expliquer ce que j'veux dire | S1L1+S4L1+S8L1+S8L3+S10L1 |
| S10L01 | use | i'm not sure if I can remember a word today | chu pas sûr si j'peux me rappeler un mot aujourd'hui | S6L1+S6L2+S7L4+S10L1 |
| S10L02 | build | to say the sentence | dire la phrase | S4L1+S10L2 |
| S10L02 | use | I want to remember the sentence | j'veux me rappeler la phrase | S1L1+S6L1+S10L2 |
| S10L02 | use | i'm not sure if I can say the sentence | chu pas sûr si j'peux dire la phrase | S4L1+S10L1+S10L2 |
| S10L02 | use | I want to try to remember the sentence | j'veux essayer de me rappeler la phrase | S1L1+S6L1+S7L1+S10L2 |
| S10L03 | build | to say the whole sentence | dire toute la phrase | S4L1+S10L3 |
| S10L03 | build | to explain the whole sentence | expliquer toute la phrase | S8L1+S10L3 |
| S10L03 | use | I want to remember the whole sentence | j'veux me rappeler toute la phrase | S1L1+S6L1+S10L3 |
| S10L03 | use | i'm not sure if I can say the whole sentence | chu pas sûr si j'peux dire toute la phrase | S4L1+S10L1+S10L3 |
| S10L03 | use | I want to try to remember the whole sentence today | j'veux essayer de me rappeler toute la phrase aujourd'hui | S1L1+S6L1+S7L1+S7L4+S10L3 |
---

##### B. Deliberately NOT proposed — and why

**Blocked by the missing article: the whole "to learn French" family.**
`apprendre québécois` is ungrammatical — `apprendre` takes the article (`apprendre le québécois`),
unlike `parler québécois`, which is fine bare. The learner has never been given `le`. So these are
**rejected, not missed**: `to learn French`, `I want to learn French`, `i'm trying to learn French`,
`I want to learn French now`, `I want to learn French with you`, `i'm going to learn French`,
`I can learn French`, `to learn French today`, `to learn French as often as possible`,
`I want to learn a little French`.
> **This is the single biggest reason fra_ca cannot reach Finnish density, and it needs your decision.**
> Same finding as `fra_for_eng` in `fragments/fra.md` — but note fra_ca has **already half-committed to
> the article-less form**: S10L01 ships `i'm not sure if I can learn French with someone else` ->
> `chu pas sûr si j'peux apprendre québécois avec quelqu'un d'autre`. That existing row is the problem in
> miniature. Either a `le` lego is added (unlocking ~10 phrases in both French courses), or that one row
> should be reviewed. **I propose no deletion — flagging only.**

**Adverb placement would need the known side reordered, or gives a marked target.**
`to speak French often`, `I want to speak French often`, `to speak with you often`,
`to say something in French often`. French wants `souvent` next to the verb (`parler souvent québécois`),
so a straight LEGO-order rendering (`parler québécois souvent`) is marked-to-odd. `fra_for_eng` made the
same call; unlike fra, fra_ca has **no** existing `parler québécois souvent` row to anchor it, so I
manufactured none. I did keep `dire quelque chose souvent` (adverb after a full object NP) — that one is
natural.

**Stacking the same verb — self-swallowing targets.**
`I can try as hard as I can` (`j'peux essayer aussi fort que j'peux`), `I speak as hard as I can`,
`I want to say what I mean` (`j'veux dire ce que j'veux dire`), `to try to try`. Note the course already
has one of these at S8L03 (`i'm trying to say what I mean` -> `j'essaye de dire ce que j'veux dire`);
I did not add more.

**`m'as` + reflexive.**
I proposed **no** new `m'as me rappeler …` rows. The course already has three
(`m'as me rappeler`, `m'as me rappeler quelque chose là`, `m'as me rappeler un mot là`,
`m'as me rappeler le plus souvent possible`). `m'as` is a reduction of *je m'en vais*, so `m'as me
rappeler` doubles the clitic; it is heard in speech but is the roughest register in the course. I left
that judgement to you rather than multiplying it. Rejected on that basis: `i'm going to remember with
you`, `i'm going to remember the sentence today`, `i'm going to try to remember a word`.

**Bare adverbial fragments that don't stand alone.**
`French now` (`québécois là`), `French with you now`, `often now`, `today with you`, `a little now`.
Grammatical strings, but not phrases a learner would ever say. `fra_for_eng` proposed `French now`;
I did **not**, and that is a deliberate divergence, not an oversight.

**Vocabulary not yet available at that point.**
`I can speak` before S7 (the `I can` lego is S7L02), anything with `the sentence` before S10L02,
`what I mean` before S8L03, `someone` before S5L04. All my proposals were checked against the lego
inventory in course order.

**Not proposed because the lego is fused and cannot be split.**
`to practise` as a bare English lego does exist here (S5L02 `pratiquer`), unlike `fra_for_eng` where it is
the fused reflexive `m'entraîner à parler` — so fra_ca *can* take `to practise with you`,
`I want to practise`, `to practise today`, and I proposed those. This is a genuine advantage fra_ca has
over fra. **I have not normalised `pratiquer à parler` toward fra's `m'entraîner à parler`, per the brief.**

---

##### Structural findings — fra_ca_for_eng

1. **The reported duplicate is confirmed, and I can tell you which of the two is wrong.**
   `in French` -> `en québécois` exists as a `build` under **both S4L03 and S4L04**. It is the only exact
   duplicate `known_text` in seeds 1-10 (verified across all 215 non-component rows).
   - **S4L04** is the lego `in French`, so a build row equal to the lego is *normal* — this course does
     that at S1L04, S3L03, S5L05, S6L02, S7L03, S9L02, S10L01, S10L02, S10L03.
   - **S4L03** is the lego `in` -> `en`. Its `in French` build is **not** its own lego, and S4L03 carries
     no phrase equal to `in` at all. So **S4L03 holds the stray copy.**
   - Deeper issue behind it: S4L03 (`in`) and S4L04 (`in French`) overlap almost entirely — S4L03 already
     ships `to speak in French`, `I want to speak in French`, `i'm trying to say something in French`,
     i.e. it teaches `in French` before the `in French` lego is introduced. Whether `in` should be a
     separate lego at all is a design question I'm flagging, not answering. **No deletion proposed.**

2. **`lego_count` in fra_ca is not corrupt in the way the brief warns — but don't trust it anyway.**
   Exactly 5 non-component rows carry `lego_count=1` with multi-word known text:
   S2L03 `i'm trying to learn`, S3L03 `as often as possible`, S7L03 `as hard as I can`,
   S8L02 `to try to explain`, S10L01 `i'm not sure if I can`. All five are **the lego itself** — fused
   multi-word legos — so `lego_count=1` is arguably *correct* for them, and none of the five is a
   combination phrase. I did not use `lego_count` anywhere; every count above is from comparing
   phrase `known_text` against its own lego `known_text`. **I propose no `lego_count` or `position` values.**

3. **Every lego in seeds 1-10 is `is_new=true`.** There are no `is_new=false` re-introductions in this
   range, so rule 3 never fires here (fra_for_eng has one, S3L02; fra_ca does not).

4. **S1L01 (`I want`) is barren — correct, do not fix.** Its single `build` row is the lego itself, zero
   combinations. Matches Finnish S1L01 and Kai's rule 1.

5. **No `is_new=true` lego in seeds 1-10 has zero combination phrases** other than S1L01.

6. **Nothing looks truncated, but the seed shapes differ from `fra_for_eng` and that is worth a look.**
   fra_ca has 34 legos in seeds 1-10 vs fra's 38. fra_ca's S3 has 3 legos (fra has 4: no separate
   `to speak` re-introduction), S8 has 3 (fra has 4: fra_ca has **no `I mean` lego** — `what I mean` is
   built compositionally at S8L03), and S10 has 3 (fra has 5: fra_ca has **no `to be able to`** and no
   standalone `i'm not sure how to`). Every seed has a plausible arc and a use-heavy tail.

7. **The `je veux dire` / `I mean` overload that wrecks fra_for_eng's S8L02 does not exist here** —
   precisely *because* fra_ca has no `I mean` lego. fra_ca's S8L02 is `to try to explain`, which is clean.
   This is fra_ca's best structural decision and arguably what fra_for_eng should copy.

---

##### Explicit gaps — things I could NOT verify

- **`québécois` as the name of the target language is a course-wide choice I could not find recorded
  anywhere, and it is the highest-risk item in this course.** Every `French` in the known side maps to
  `québécois`, so `I want to speak French` -> `j'veux parler québécois`. That is defensible for
  *parler québécois* (a real colloquialism) but it makes `en québécois` (= "in French") and the
  `apprendre québécois` row read as a claim that Quebec French is a separate language. I matched the
  existing convention throughout rather than changing it. **I could not verify this was a deliberate
  decision as opposed to a generation artifact.** If it is wrong, all 131 proposals need a
  find-and-replace of `québécois` → `français`, not a rewrite — the rest holds either way.
- **I did not query `course_audio`.** I cannot say what audio state existing rows are in, nor how large a
  missing-audio backlog +131 rows would create. Assume it is significant. No audio-pass was queued.
- **I did not verify `position` values and deliberately propose none.** Positions must be assigned by the
  write path.
- **Register consistency of `m'as` is unverified.** The course uses `m'as` for *I'm going to* throughout;
  I matched it. I could not confirm this against any register spec, and I have no way to check whether
  the TTS voice for this course renders `m'as`, `chu`, and `ptit` as intended.
- **I could not verify how `fra_ca_for_eng` differs from `fra_for_eng` by intent.** The brief told me
  `pratiquer à parler` vs `m'entraîner à parler` is likely deliberate; I honoured that and normalised
  nothing. But I found several further divergences (no `I mean` lego, no `to be able to`, `là` vs
  `maintenant`, 34 vs 38 legos) and **have no source that says which of those are intentional.**
- **Draft status.** The course is marked draft. I assumed the seeds 1-10 lego arc is settled enough to
  build on. If legos are still moving, the S4L03/S4L04 finding should be resolved *before* any of these
  131 rows are written, because 6 of my proposals hang off S4L03/S4L04.

---

#### German fragment — deu_for_eng, deu_at_for_eng, deu_ch_for_eng

> **READ THIS FIRST — the audit brief's headline claim is wrong.**
> The brief says deu_for_eng S10L02/L03/L04 have **zero combination phrases** and seed 10 is truncated.
> **They are not truncated.** S10L02 has 7 phrases, S10L03 has 8, S10L04 has 8 — including
> "I can say the whole sentence in German", "I want to explain whether I can say the whole sentence".
> They are all stored with **`lego_count = 1`**, which is what made them invisible to the audit.
> 32 of deu_for_eng's 202 non-component phrases are genuinely multi-lego but carry `lego_count=1`
> (4 in deu_at_for_eng, 2 in deu_ch_for_eng). The "151 combination phrases" figure is a
> metadata artefact, not a content count. **The real count is 202, and the real gap is density in
> S2–S9, not a truncated seed 10.** See Structural findings.

---

##### deu_for_eng

Currently 202 non-component phrases over 34 legos. Gold standard `fin_for_eng` is 360 over 33.
Per-lego German sits at 5–8 from S4 on where Finnish sits at 11–17. **146 phrases proposed → 348.**

###### A. Proposed phrases

| Seed/Lego | phrase_role | known_text | target_text | combines |
|---|---|---|---|---|
| S1L05 | build | To speak German with you now | Jetzt mit dir Deutsch sprechen | L2+L3+L4+L5 |
| S2L01 | build | To learn now | Jetzt lernen | S2L1+S1L4 |
| S2L01 | build | To learn with you | Mit dir lernen | S2L1+S1L5 |
| S2L01 | build | To learn German now | Jetzt Deutsch lernen | S2L1+S1L3+L4 |
| S2L01 | use | I want to learn with you now | Ich will jetzt mit dir lernen | S1L1+S2L1+S1L4+L5 |
| S2L02 | use | I'm trying to speak German | Ich versuche Deutsch zu sprechen | S2L2+S1L2+L3 |
| S2L02 | use | I'm trying to speak now | Ich versuche jetzt zu sprechen | S2L2+S1L2+L4 |
| S2L02 | use | I'm trying to learn now | Ich versuche jetzt zu lernen | S2L2+S2L1+S1L4 |
| S2L02 | use | I'm trying to speak with you | Ich versuche mit dir zu sprechen | S2L2+S1L2+L5 |
| S2L02 | use | I'm trying to learn with you | Ich versuche mit dir zu lernen | S2L2+S2L1+S1L5 |
| S2L02 | use | I'm trying to speak German now | Ich versuche jetzt Deutsch zu sprechen | S2L2+S1L2+L3+L4 |
| S2L02 | use | I'm trying to speak German with you | Ich versuche mit dir Deutsch zu sprechen | S2L2+S1L2+L3+L5 |
| S2L02 | use | I'm trying to learn with you now | Ich versuche jetzt mit dir zu lernen | S2L2+S2L1+S1L4+L5 |
| S2L02 | use | I'm trying to speak German with you now | Ich versuche jetzt mit dir Deutsch zu sprechen | S2L2+S1L2+L3+L4+L5 |
| S3L01 | build | To speak as often as possible | So oft wie möglich sprechen | S3L1+S1L2 |
| S3L01 | build | To learn as often as possible | So oft wie möglich lernen | S3L1+S2L1 |
| S3L01 | build | To speak German as often as possible | So oft wie möglich Deutsch sprechen | S3L1+S1L2+L3 |
| S3L01 | use | I'm trying to speak German as often as possible | Ich versuche so oft wie möglich Deutsch zu sprechen | S2L2+S3L1+S1L2+L3 |
| S3L01 | use | I want to speak with you as often as possible | Ich will so oft wie möglich mit dir sprechen | S1L1+S3L1+S1L5+L2 |
| S3L01 | use | I want to learn with you as often as possible | Ich will so oft wie möglich mit dir lernen | S1L1+S3L1+S1L5+S2L1 |
| S3L01 | use | I want to speak German with you as often as possible | Ich will so oft wie möglich mit dir Deutsch sprechen | S1L1+S3L1+S1L5+L3+L2 |
| S3L02 | use | I'm trying to learn now how to speak | Ich versuche jetzt zu lernen, wie man spricht | S2L2+S2L1+S1L4+S3L2 |
| S3L02 | use | I'm trying to learn with you how to speak | Ich versuche mit dir zu lernen, wie man spricht | S2L2+S2L1+S1L5+S3L2 |
| S3L02 | use | I want to learn how to speak German | Ich will lernen, wie man Deutsch spricht | S1L1+S2L1+S3L2+S1L3 ⚠︎infix |
| S3L02 | use | I'm trying to learn how to speak German | Ich versuche zu lernen, wie man Deutsch spricht | S2L2+S2L1+S3L2+S1L3 ⚠︎infix |
| S3L03 | use | I'm trying to learn now how to speak as often as possible | Ich versuche jetzt zu lernen, wie man so oft wie möglich spricht | S2L2+S2L1+S1L4+S3L3 |
| S3L03 | use | I'm trying to learn with you how to speak as often as possible | Ich versuche mit dir zu lernen, wie man so oft wie möglich spricht | S2L2+S2L1+S1L5+S3L3 |
| S4L01 | build | To learn something | Etwas lernen | S2L1+S4L1 |
| S4L01 | build | To learn something now | Jetzt etwas lernen | S2L1+S4L1+S1L4 |
| S4L01 | use | I want to learn something as often as possible | Ich will so oft wie möglich etwas lernen | S1L1+S3L1+S4L1+S2L1 |
| S4L01 | use | I'm trying to learn something with you | Ich versuche mit dir etwas zu lernen | S2L2+S1L5+S4L1+S2L1 |
| S4L01 | use | I want to learn something with you now | Ich will jetzt mit dir etwas lernen | S1L1+S1L4+L5+S4L1+S2L1 |
| S4L02 | build | To say something | Etwas sagen | S4L2+S4L1 |
| S4L02 | build | To say something now | Jetzt etwas sagen | S4L2+S4L1+S1L4 |
| S4L02 | use | I want to say something as often as possible | Ich will so oft wie möglich etwas sagen | S1L1+S3L1+S4L1+L2 |
| S4L03 | build | To speak in German | Auf Deutsch sprechen | S1L2+S4L3 |
| S4L03 | build | To say something in German | Etwas auf Deutsch sagen | S4L2+S4L1+S4L3 |
| S4L03 | use | I want to speak in German now | Ich will jetzt auf Deutsch sprechen | S1L1+L4+S4L3+S1L2 |
| S4L03 | use | I'm trying to speak in German | Ich versuche auf Deutsch zu sprechen | S2L2+S4L3+S1L2 |
| S4L03 | use | I want to speak in German with you | Ich will mit dir auf Deutsch sprechen | S1L1+S1L5+S4L3+S1L2 |
| S4L03 | use | I want to speak in German as often as possible | Ich will so oft wie möglich auf Deutsch sprechen | S1L1+S3L1+S4L3+S1L2 |
| S4L03 | use | I'm trying to learn something in German | Ich versuche etwas auf Deutsch zu lernen | S2L2+S4L1+S4L3+S2L1 |
| S4L04 | use | I'm trying to learn now how to say something in German | Ich versuche jetzt zu lernen, wie man etwas auf Deutsch sagt | S2L2+S2L1+S1L4+S4L4 |
| S4L04 | use | I'm trying to learn with you how to say something in German | Ich versuche mit dir zu lernen, wie man etwas auf Deutsch sagt | S2L2+S2L1+S1L5+S4L4 |
| S5L01 | build | To practise now | Jetzt üben | S5L1+S1L4 |
| S5L01 | build | To practise with you | Mit dir üben | S5L1+S1L5 |
| S5L01 | use | I'm trying to practise now | Ich versuche jetzt zu üben | S2L2+S1L4+S5L1 |
| S5L01 | use | I want to practise as often as possible | Ich will so oft wie möglich üben | S1L1+S3L1+S5L1 |
| S5L01 | use | I'm trying to practise with you | Ich versuche mit dir zu üben | S2L2+S1L5+S5L1 |
| S5L01 | use | I want to practise with you now | Ich will jetzt mit dir üben | S1L1+S1L4+L5+S5L1 |
| S5L01 | use | I want to practise in German | Ich will auf Deutsch üben | S1L1+S4L3+S5L1 |
| S5L02 | build | I'm going to speak | Ich werde sprechen | S5L2+S1L2 |
| S5L02 | build | I'm going to practise now | Ich werde jetzt üben | S5L2+S1L4+S5L1 |
| S5L02 | build | I'm going to speak now | Ich werde jetzt sprechen | S5L2+S1L4+S1L2 |
| S5L02 | use | I'm going to speak with you | Ich werde mit dir sprechen | S5L2+S1L5+L2 |
| S5L02 | use | I'm going to learn German | Ich werde Deutsch lernen | S5L2+S1L3+S2L1 |
| S5L02 | use | I'm going to say something now | Ich werde jetzt etwas sagen | S5L2+S1L4+S4L1+L2 |
| S5L02 | use | I'm going to say something in German | Ich werde etwas auf Deutsch sagen | S5L2+S4L1+S4L3+S4L2 |
| S5L02 | use | I'm going to learn as often as possible | Ich werde so oft wie möglich lernen | S5L2+S3L1+S2L1 |
| S5L02 | use | I'm going to speak German with you | Ich werde mit dir Deutsch sprechen | S5L2+S1L5+L3+L2 |
| S5L02 | use | I'm going to practise as often as possible | Ich werde so oft wie möglich üben | S5L2+S3L1+S5L1 |
| S5L03 | use | I want to practise with someone else | Ich will mit jemand anderem üben | S1L1+S5L3+S5L1 |
| S5L03 | use | I want to practise with someone else now | Ich will jetzt mit jemand anderem üben | S1L1+S1L4+S5L3+S5L1 |
| S5L03 | use | I want to speak in German with someone else | Ich will mit jemand anderem auf Deutsch sprechen | S1L1+S5L3+S4L3+S1L2 |
| S5L03 | use | I'm trying to speak with someone else | Ich versuche mit jemand anderem zu sprechen | S2L2+S5L3+S1L2 |
| S5L03 | use | I'm going to practise with someone else as often as possible | Ich werde so oft wie möglich mit jemand anderem üben | S5L2+S3L1+S5L3+S5L1 |
| S5L04 | build | I want to practise speaking | Ich will sprechen üben | S1L1+S5L4 |
| S5L04 | build | I'm trying to practise speaking | Ich versuche, sprechen zu üben | S2L2+S5L4 |
| S5L04 | use | I want to practise speaking with you | Ich will mit dir sprechen üben | S1L1+S1L5+S5L4 |
| S5L04 | use | I want to practise speaking as often as possible | Ich will so oft wie möglich sprechen üben | S1L1+S3L1+S5L4 |
| S5L04 | use | I'm going to practise speaking as often as possible | Ich werde so oft wie möglich sprechen üben | S5L2+S3L1+S5L4 |
| S6L01 | build | To learn a word | Ein Wort lernen | S2L1+S6L1 |
| S6L01 | build | To say a word | Ein Wort sagen | S4L2+S6L1 |
| S6L01 | use | I'm going to learn a word | Ich werde ein Wort lernen | S5L2+S6L1+S2L1 |
| S6L01 | use | I'm going to say a word | Ich werde ein Wort sagen | S5L2+S6L1+S4L2 |
| S6L01 | use | I'm trying to say a word | Ich versuche ein Wort zu sagen | S2L2+S6L1+S4L2 |
| S6L01 | use | I want to say a word in German | Ich will ein Wort auf Deutsch sagen | S1L1+S6L1+S4L3+S4L2 |
| S6L01 | use | I want to say a word now | Ich will jetzt ein Wort sagen | S1L1+S1L4+S6L1+S4L2 |
| S6L02 | build | I'm trying to remember | Ich versuche mich zu erinnern | S2L2+S6L2 |
| S6L02 | use | I want to remember now | Ich will mich jetzt erinnern | S1L1+S1L4+S6L2 |
| S6L02 | use | I want to remember something | Ich will mich an etwas erinnern | S1L1+S4L1+S6L2 |
| S6L02 | use | I'm going to remember something | Ich werde mich an etwas erinnern | S5L2+S4L1+S6L2 |
| S6L02 | use | I want to remember how to speak | Ich will mich erinnern, wie man spricht | S1L1+S6L2+S3L2 |
| S6L03 | use | I'm trying to remember a word | Ich versuche mich an ein Wort zu erinnern | S2L2+S6L3 |
| S6L03 | use | I want to remember a word now | Ich will mich jetzt an ein Wort erinnern | S1L1+S1L4+S6L3 |
| S7L01 | use | I want to practise today | Ich will heute üben | S1L1+S7L1+S5L1 |
| S7L01 | use | I'm going to learn today | Ich werde heute lernen | S5L2+S7L1+S2L1 |
| S7L01 | use | I'm trying to learn today | Ich versuche heute zu lernen | S2L2+S7L1+S2L1 |
| S7L01 | use | I want to say something today | Ich will heute etwas sagen | S1L1+S7L1+S4L1+L2 |
| S7L01 | use | I'm going to practise speaking today | Ich werde heute sprechen üben | S5L2+S7L1+S5L4 |
| S7L01 | use | I want to learn a word today | Ich will heute ein Wort lernen | S1L1+S7L1+S6L1+S2L1 |
| S7L01 | use | I'm going to practise with someone else today | Ich werde heute mit jemand anderem üben | S5L2+S7L1+S5L3+S5L1 |
| S7L02 | use | I'm going to try to speak German | Ich werde versuchen, Deutsch zu sprechen | S5L2+S7L2+S1L3+L2 |
| S7L02 | use | I want to try to learn German | Ich will versuchen, Deutsch zu lernen | S1L1+S7L2+S1L3+S2L1 |
| S7L02 | use | I'm going to try to say something in German | Ich werde versuchen, etwas auf Deutsch zu sagen | S5L2+S7L2+S4L1+L3+L2 |
| S7L02 | use | I want to try to practise | Ich will versuchen zu üben | S1L1+S7L2+S5L1 |
| S7L02 | use | I'm going to try to remember a word | Ich werde versuchen, mich an ein Wort zu erinnern | S5L2+S7L2+S6L3 |
| S7L02 | use | I want to try to speak with you today | Ich will heute versuchen, mit dir zu sprechen | S1L1+S7L1+L2+S1L5+L2 |
| S7L03 | use | I want to try as hard as I can today | Ich will heute mein Bestes versuchen | S1L1+S7L1+S7L3+L2 |
| S7L03 | use | I'm going to try as hard as I can now | Ich werde jetzt mein Bestes versuchen | S5L2+S1L4+S7L3+L2 |
| S7L03 | use | I want to try as hard as I can to speak German | Ich will mein Bestes versuchen, Deutsch zu sprechen | S1L1+S7L3+L2+S1L3+L2 |
| S7L03 | use | I'm going to try as hard as I can to learn a word | Ich werde mein Bestes versuchen, ein Wort zu lernen | S5L2+S7L3+L2+S6L1+S2L1 |
| S7L03 | use | I want to try as hard as I can to say something in German | Ich will mein Bestes versuchen, etwas auf Deutsch zu sagen | S1L1+S7L3+L2+S4L1+L3+L2 |
| S8L01 | build | To explain something | Etwas erklären | S8L1+S4L1 |
| S8L01 | build | I'm going to explain | Ich werde erklären | S5L2+S8L1 |
| S8L01 | use | I want to explain now | Ich will jetzt erklären | S1L1+S1L4+S8L1 |
| S8L01 | use | I want to explain a word | Ich will ein Wort erklären | S1L1+S6L1+S8L1 |
| S8L01 | use | I'm trying to explain something | Ich versuche etwas zu erklären | S2L2+S4L1+S8L1 |
| S8L01 | use | I want to explain something in German | Ich will etwas auf Deutsch erklären | S1L1+S4L1+S4L3+S8L1 |
| S8L01 | use | I want to explain something today | Ich will heute etwas erklären | S1L1+S7L1+S4L1+S8L1 |
| S8L02 | build | I want to explain what I mean | Ich will erklären, was ich meine | S1L1+S8L1+S8L2 |
| S8L02 | use | I'm trying to explain what I mean | Ich versuche zu erklären, was ich meine | S2L2+S8L1+S8L2 |
| S8L02 | use | I'm going to say what I mean | Ich werde sagen, was ich meine | S5L2+S4L2+S8L2 |
| S8L02 | use | I want to say what I mean in German | Ich will auf Deutsch sagen, was ich meine | S1L1+S4L3+S4L2+S8L2 |
| S8L02 | use | I'm going to explain what I mean today | Ich werde heute erklären, was ich meine | S5L2+S7L1+S8L1+S8L2 |
| S8L02 | use | I want to try to explain what I mean | Ich will versuchen zu erklären, was ich meine | S1L1+S7L2+S8L1+S8L2 |
| S9L01 | build | I want to speak a little | Ich will ein bisschen sprechen | S1L1+S9L1+S1L2 |
| S9L01 | use | I want to speak a little German | Ich will ein bisschen Deutsch sprechen | S1L1+S9L1+S1L3+L2 |
| S9L01 | use | I'm going to learn a little | Ich werde ein bisschen lernen | S5L2+S9L1+S2L1 |
| S9L01 | use | I'm trying to learn a little | Ich versuche ein bisschen zu lernen | S2L2+S9L1+S2L1 |
| S9L01 | use | I want to practise a little today | Ich will heute ein bisschen üben | S1L1+S7L1+S9L1+S5L1 |
| S9L01 | use | I'm going to speak a little German with you | Ich werde ein bisschen Deutsch mit dir sprechen | S5L2+S9L1+S1L3+L5+L2 |
| S9L02 | use | I speak German today | Ich spreche heute Deutsch | S9L2+S7L1+S1L3 |
| S9L02 | use | I speak German with you | Ich spreche Deutsch mit dir | S9L2+S1L3+L5 |
| S9L02 | use | I speak German with someone else | Ich spreche Deutsch mit jemand anderem | S9L2+S1L3+S5L3 |
| S9L02 | use | I speak a little German today | Ich spreche heute ein bisschen Deutsch | S9L2+S7L1+S9L1+S1L3 |
| S10L01 | use | I don't want to speak German | Ich will nicht Deutsch sprechen | S1L1+S10L1+S1L3+L2 |
| S10L01 | use | I don't want to learn now | Ich will jetzt nicht lernen | S1L1+S1L4+S10L1+S2L1 |
| S10L01 | use | I'm not going to practise today | Ich werde heute nicht üben | S5L2+S7L1+S10L1+S5L1 |
| S10L01 | use | I'm not trying to learn German | Ich versuche nicht, Deutsch zu lernen | S2L2+S10L1+S1L3+S2L1 |
| S10L01 | use | I don't want to practise with someone else | Ich will nicht mit jemand anderem üben | S1L1+S10L1+S5L3+S5L1 |
| S10L01 | use | I'm not going to speak German today | Ich werde heute nicht Deutsch sprechen | S5L2+S7L1+S10L1+S1L3+L2 |
| S10L02 | build | I can speak | Ich kann sprechen | S10L2+S1L2 |
| S10L02 | build | I can learn | Ich kann lernen | S10L2+S2L1 |
| S10L02 | use | I can practise today | Ich kann heute üben | S10L2+S7L1+S5L1 |
| S10L02 | use | I can speak German with you | Ich kann mit dir Deutsch sprechen | S10L2+S1L5+L3+L2 |
| S10L02 | use | I can say a word in German | Ich kann ein Wort auf Deutsch sagen | S10L2+S6L1+S4L3+S4L2 |
| S10L03 | use | I'm going to say the whole sentence | Ich werde den ganzen Satz sagen | S5L2+S10L3+S4L2 |
| S10L03 | use | I can remember the whole sentence | Ich kann mich an den ganzen Satz erinnern | S10L2+S10L3+S6L2 |
| S10L03 | use | I want to try to say the whole sentence | Ich will versuchen, den ganzen Satz zu sagen | S1L1+S7L2+S10L3+S4L2 |
| S10L03 | use | I want to say the whole sentence in German | Ich will den ganzen Satz auf Deutsch sagen | S1L1+S10L3+S4L3+S4L2 |
| S10L03 | use | I'm going to explain the whole sentence today | Ich werde heute den ganzen Satz erklären | S5L2+S7L1+S10L3+S8L1 |
| S10L04 | use | I want to say whether I can practise with someone else | Ich will sagen, ob ich mit jemand anderem üben kann | S1L1+S4L2+S10L4+L2+S5L3+S5L1 |
| S10L04 | use | I'm going to explain whether I can say the whole sentence today | Ich werde heute erklären, ob ich den ganzen Satz sagen kann | S5L2+S7L1+S8L1+S10L4+L2+L3+S4L2 |
| S10L05 | use | I'm not sure whether I can speak German today | Ich bin mir nicht sicher, ob ich heute Deutsch sprechen kann | S10L5+S10L4+L2+S7L1+S1L3+L2 |
| S10L05 | use | I'm not sure whether I can practise with someone else | Ich bin mir nicht sicher, ob ich mit jemand anderem üben kann | S10L5+S10L4+L2+S5L3+S5L1 |

**146 proposed** (the one greyed row above is a placeholder marker, not a proposal — count excludes it).
Two rows are marked ⚠︎**infix**: `I want to learn how to speak German` / `I'm trying to learn how to speak German`
require splitting the S3L02 lego's target (`wie man spricht` → `wie man Deutsch spricht`) because German
puts the object before the verb. They are natural and high-value, but they are **not** a straight
concatenation — Kai should approve or drop these two explicitly.

###### B. Deliberately NOT proposed — and why

**Unnatural in German (bare-fragment builds Finnish gets away with):**
- `German now` → `Jetzt Deutsch` — Finnish has `suomea nyt` as an S1 build; the German equivalent is not
  a usable fragment. Same for `German with you` → `Deutsch mit dir`. Left out; this is why deu S1L04/L05
  are legitimately 1 short of Finnish rather than deficient.
- `I don't want to say something now` — German negates `etwas` as `nichts`, which is not a taught lego.
  Every `not` + `something` combination is excluded for this reason.
- `I want to practise a word` → `Ich will ein Wort üben` — grammatical but not what a speaker says.
- `I'm going to say something with someone else` — grammatical, semantically odd.
- `I speak a little German as often as possible` — the two adverbials collide; forced.

**Requires English not yet introduced:**
- `I can't speak German` / `I can't remember a word` and every other `can` + `not` contraction.
  `not` (S10L01) and `I can` (S10L02) are both present, so these are combinable in principle, but
  `can't` is a new English contraction the course has never given the learner. **Kai's call** — if
  he wants them, the natural targets are `Ich kann nicht Deutsch sprechen` /
  `Ich kann mich nicht an ein Wort erinnern`. I did not propose them unilaterally.
- Anything using `to you` (as in the existing `I want to say something to you`) — the taught lego is
  `with you`, not `to you`. I did not extend that pattern.

**ZUT clash with an existing phrase — skipped:**
- `to learn German` as an S2L01 build → would be `Deutsch lernen`, but `to learn German` is the
  **S2L03 lego** with target `Deutsch zu lernen`. Same known → two targets. Excluded.
- `I want to learn German` at S2L03 — already exists at S2L01 (`Ich will Deutsch lernen`).
- `I want to remember a word` at S6L03 — already present (twice, see findings).
- `I want to practise speaking German` at S5L04 — already exists at S5L01.

**Would require reordering the known side:**
- Nothing proposed uses the `Now I want to…` / `As often as possible I want to…` fronting the existing
  data does. I kept every proposal in plain English subject-first order.

###### Structural findings — deu_for_eng

1. **`lego_count` is corrupt, and it is what generated the false "seed 10 is truncated" alarm.**
   32 multi-lego phrases carry `lego_count=1`. Concentrated in S10 (every single S10L02/L03/L04/L05
   phrase) and scattered through S2L03, S3L01, S4L03, S5L02/03/04, S6, S7L03, S8L02, S9L01, S10L01.
   No `is_new=true` lego in seeds 1–10 has zero combination phrases. S1L01 is correctly barren.
   **This is a data-repair job, not a content job, and it should be fixed before the next audit runs.**
2. **Two exact duplicate phrases**, same seed/lego/known/target, differing only in `phrase_role`:
   - S6L03 `I want to remember a word` / `Ich will mich an ein Wort erinnern` (build **and** use)
   - S10L03 `I can say the whole sentence` / `Ich kann den ganzen Satz sagen` (build **and** use)
3. **ZUT wart in seed 10**: the lego is `whether` → `ob`, but four existing S10L04/L05 phrases prompt
   with `if` for the same `ob` (`I'm not sure if I can explain what I mean`). One known form → one
   target is satisfied, but the learner is being given an untaught English alternate.
4. **Contraction inconsistency**: `I'm trying to` (lego) vs existing phrases using `I am trying to`
   (S4L01, S10L01) and `I will` (S6L02 `I will remember how to speak`, where the lego is `I'm going to`).
   Not ZUT breaches, but they are unlicensed English forms.
5. **Lego ordering wart**: S5L01 already uses `to practise speaking` (`I want to practise speaking German`)
   three legos before `to practise speaking` is introduced as S5L04.

###### Explicit gaps — deu_for_eng

- **`as hard as I can` → `mein Bestes` is a loose gloss** ("my best"), not a translation. Every S7L03
  phrase inherits it. I proposed within the existing convention rather than against it, but I could not
  verify that this choice was deliberate. If it was not, all of S7L03 needs revisiting, not backfilling.
- **`I will nicht Deutsch sprechen` word order**: `Ich will nicht Deutsch sprechen` is what I proposed;
  a native speaker may prefer `Ich will kein Deutsch sprechen`. `kein` is not a taught lego, so I used
  `nicht`. Flagging rather than deciding.
- **Adverb order convention**: the course consistently puts `jetzt`/`heute` before `mit dir` before
  `Deutsch` (`Ich will jetzt mit dir Deutsch lernen`). I followed that everywhere. It is a defensible
  convention, not the only one; if Kai disagrees with it my ordering is systematically wrong, not
  randomly wrong, so it is cheap to fix in bulk.
- I did **not** verify audio coverage for any existing phrase. Everything proposed here is new text and
  would need an audio pass; I did not queue one.

---

##### deu_at_for_eng

**59 phrases proposed.** All target_text is modelled on forms that already exist in this course's own rows (Viennese/Austrian register: `i wü`, `iatz`, `wos`, `deitsch`, `übn`, `i versuch … zum …`, `i wer`, `ned`). Nothing is Hochdeutsch-by-default; anything I could not derive from an existing row is in *Explicit gaps*, not in the table.

###### A. Proposed phrases

| Seed/Lego | phrase_role | known_text | target_text | combines |
|---|---|---|---|---|
| S1L4 | build | now | iatz | L4 |
| S1L4 | build | to speak now | iatz reden | L2+L4 |
| S1L4 | build | to speak German now | iatz Deitsch reden | L2+L3+L4 |
| S1L5 | build | to speak German with you | mit dir Deitsch reden | L2+L3+L5 |
| S1L5 | build | to speak with you now | iatz mit dir reden | L2+L4+L5 |
| S1L5 | use | I want to speak German with you | i wü mit dir Deitsch reden | L1+L2+L3+L5 |
| S2L1 | build | to learn German | Deitsch lernen | S1L3+S2L1 |
| S2L1 | build | to learn now | iatz lernen | S1L4+S2L1 |
| S2L1 | build | to learn with you | mit dir lernen | S1L5+S2L1 |
| S2L1 | build | to learn German now | iatz Deitsch lernen | S1L3+S1L4+S2L1 |
| S2L1 | use | I want to learn now | i wü iatz lernen | S1L1+S1L4+S2L1 |
| S2L1 | use | I want to learn with you | i wü mit dir lernen | S1L1+S1L5+S2L1 |
| S2L1 | use | I want to learn German with you now | i wü iatz mit dir Deitsch lernen | S1L1+L3+L4+L5+S2L1 |
| S2L2 | use | i'm trying to speak German | i versuch, Deitsch zum reden | S1L2+S1L3+S2L2 |
| S2L2 | use | i'm trying to speak with you | i versuch, mit dir zum reden | S1L2+S1L5+S2L2 |
| S2L2 | use | i'm trying to speak now | i versuch iatz zum reden | S1L2+S1L4+S2L2 |
| S2L2 | use | i'm trying to learn German | i versuch, Deitsch zum lernen | S1L3+S2L1+S2L2 |
| S2L2 | use | i'm trying to learn now | i versuch iatz zum lernen | S1L4+S2L1+S2L2 |
| S2L2 | use | i'm trying to learn with you | i versuch, mit dir zum lernen | S1L5+S2L1+S2L2 |
| S2L2 | use | i'm trying to speak German with you | i versuch, mit dir Deitsch zum reden | S1L2+L3+L5+S2L2 |
| S2L2 | use | i'm trying to speak German now | i versuch iatz, Deitsch zum reden | S1L2+L3+L4+S2L2 |
| S2L2 | use | i'm trying to learn German now | i versuch iatz, Deitsch zum lernen | S1L3+L4+S2L1+S2L2 |
| S3L1 | build | to learn as often as possible | so oft wia möglich lernen | S2L1+S3L1 |
| S3L1 | use | i'm trying to learn as often as possible | i versuch, so oft wia möglich zum lernen | S2L1+S2L2+S3L1 |
| S3L1 | use | I want to speak with you as often as possible | i wü so oft wia möglich mit dir reden | S1L1+L2+L5+S3L1 |
| S3L1 | use | I want to learn German as often as possible | i wü so oft wia möglich Deitsch lernen | S1L1+L3+S2L1+S3L1 |
| S3L2 | build | how to speak German | wia ma Deitsch redt | S1L3+S3L2 |
| S3L2 | build | to learn how to speak | lernen, wia ma redt | S2L1+S3L2 |
| S3L2 | use | I want to learn how to speak German | i wü lernen, wia ma Deitsch redt | S1L1+L3+S2L1+S3L2 |
| S3L2 | use | i'm trying to learn how to speak German | i versuch zum lernen, wia ma Deitsch redt | S1L3+S2L1+S2L2+S3L2 |
| S4L2 | use | i'm trying to learn something in German | i versuch, wos auf Deitsch zum lernen | S2L1+S2L2+S4L1+S4L2 |
| S4L3 | use | i'm trying to say something now | i versuch iatz, wos zum sogn | S1L4+S2L2+S4L2+S4L3 |
| S5L1 | build | to practise with you | mit dir übn | S1L5+S5L1 |
| S5L1 | use | i'm trying to practise | i versuch zum übn | S2L2+S5L1 |
| S5L2 | use | i'm going to speak with you | i wer mit dir reden | S1L2+S1L5+S5L2 |
| S5L2 | use | i'm going to practise with you | i wer mit dir übn | S1L5+S5L1+S5L2 |
| S5L3 | use | i'm going to practise speaking with you | i wer mit dir reden übn | S1L5+S5L2+S5L3 |
| S5L4 | use | I want to speak with someone else | i wü mit wem aundern reden | S1L1+S1L2+S5L4 |
| S5L4 | build | to learn with someone else | mit wem aundern lernen | S2L1+S5L4 |
| S6L1 | build | to practise a word | a Wort übn | S5L1+S6L1 |
| S6L1 | use | I want to learn a word | i wü a Wort lernen | S1L1+S2L1+S6L1 |
| S7L1 | build | today | heit | S7L1 |
| S7L1 | use | I want to practise today | i wü heit übn | S1L1+S5L1+S7L1 |
| S7L2 | build | to try to speak | versuchen zum reden | S1L2+S7L2 |
| S7L2 | use | I want to try today | i wü heit versuchen | S1L1+S7L1+S7L2 |
| S7L3 | build | I want to practise it | i wü's übn | S5L1+S7L3 |
| S7L3 | build | I want to say it | i wü's sogn | S4L3+S7L3 |
| S7L4 | use | I want to practise so hard | i wü so fest übn | S1L1+S5L1+S7L4 |
| S7L5 | use | I want to practise as hard as I can | i wü so fest übn, wia i kann | S1L1+S5L1+S7L4+S7L5 |
| S8L1 | build | I want to explain | i wü erklärn | S1L1+S8L1 |
| S8L1 | use | i'm going to explain today | i wer heit erklärn | S5L2+S7L1+S8L1 |
| S8L2 | use | I want to try to explain what I mean | i wü versuchen zum erklärn, wos i moan | S1L1+S7L2+S8L1+S8L2 |
| S9L1 | build | I speak with you | i red mit dir | S1L5+S9L1 |
| S9L2 | use | i'm going to speak a little German | i wer a bissl Deitsch reden | S1L3+S5L2+S9L2 |
| S10L1 | use | i'm not going to practise now | i wer iatz ned übn | S1L4+S5L1+S5L2+S10L1 |
| S10L1 | use | I don't want to say it | i wü's ned sogn | S4L3+S7L3+S10L1 |
| S10L3 | use | I can practise with you | i kann mit dir übn | S1L5+S5L1+S10L3 |
| S10L5 | use | I want to learn the whole sentence | i wü den gaunzn Sotz lernen | S1L1+S2L1+S10L5 |
| S10L6 | use | i'm trying to remember the whole sentence | i versuch, ma den gaunzn Sotz zum merken | S2L2+S10L6 |

###### B. Deliberately NOT proposed — and why

**Verbless fragments (unnatural in this dialect, and no existing row models them)**
- "German now" (`Deitsch iatz` / `iatz Deitsch`), "German with you", "with you now" (`iatz mit dir`). Finnish has these as bare build rows because Finnish tolerates the bare adverbial fragment; every fragment in this course carries a verb (`iatz übn`, `heit übn`, `mit dir reden`). I proposed the verb-bearing equivalents instead.

**Dialect form not confirmed — see Explicit gaps, not proposed anywhere**
- "i'm trying to practise speaking" — the `zum` slot in the compound verb `reden übn` is not modelled anywhere (`i versuch, reden zum übn`? `i versuch zum reden übn`?).
- "I can't speak German", "I can't say something" — negation-with-object order under `kann` is inconsistent in the existing rows (`i kann den gaunzn Sotz ned lernen` puts the object before `ned`, but `i kann ned so oft wia möglich übn` puts `ned` first). Guessing would produce a wrong sentence.
- "as often as I can" (`so oft, wia i kann`) — S7L5's `wia i kann` is only ever attached to `so fest`. Extending it to `so oft` is a new construction, not a combination.

**ZUT / duplication**
- "I want to speak German with you now", "I want to learn German", "I want to practise", "I want to try it today", "I want to say it in German", "i'm trying to speak in German" — all already present; not re-proposed.
- "I want to practise speaking with someone else" — NOT proposed as a standalone. S10L2 already contains that exact English string inside `i'm not sure I want to practise speaking with someone else`, targeted `… i wü reden übn mit wem aundern` (object AFTER the verb cluster), which conflicts with this course's normal `i wü mit wem aundern reden übn`. Adding a standalone row would bake in a contradiction — Kai should decide which order is right first.

**Would need reordering the known side / forced**
- "now I want to learn", "today I want to practise" style fronted variants beyond the ones already present in S6L2/S10L6 — fronting is a reorder of the English, not a combination.
- "I want to learn how to speak as often as possible", "I want to learn something as often as possible" — stacked adverbial + subordinate clause; grammatical but heavy, and Kai's rule is that a smaller correct set wins.
- "to learn in German", "I want to remember a word in German" as new rows — `auf Deitsch` with `lernen`/`erinnern` reads odd; the one existing attempt (`iatz wü i mi an a Wort erinnern, auf Deitsch`) already looks strained.

**Vocabulary not yet introduced at that point**
- Nothing with `heit`/`versuchen`/`i wer` before S5–S7; nothing with `ned`/`kann` before S10. All rows above respect first-introduction position.

###### Structural findings

- **Every lego in seeds 1–10 is `is_new=true`.** No re-introduction legos, so rule 3 never applies here.
- **No `is_new=true` lego has zero combination phrases** other than S1L01, which correctly has only itself + its two components. Confirmed by reading `known_text`, not `lego_count`.
- **The real hole is S1–S3, and it's a shape hole, not just a count hole.** S1L4 (`iatz`) has 2 non-component phrases where the equivalent Finnish slot has 5; S2L2 (`i versuch zum`) has 3 where Finnish has 16. Density in this course *drops* at S2–S3 and only recovers at S4 — the opposite of the gold standard's growth curve. Over half my proposal (30 of 59) lands in S1–S3 for that reason.
- **Capitalisation of the target word for "German" is inconsistent in the existing data**: the lego is `deitsch`, most phrases use `Deitsch`, but S1L3 build (`deitsch reden`) and S5L1 build (`deitsch übn`) are lowercase. I used `Deitsch` (the majority form) throughout. This is a pre-existing inconsistency worth a sweep.
- **Two existing rows look wrong to me** (not mine to fix, flagging only): S10L2 build `i bin ma ned sicher, i wü reden übn mit wem aundern` — every other `i bin ma ned sicher` row uses a `wos`/`ob` complementiser and verb-final order; and S6L2 use `iatz wü i mi an a Wort erinnern, auf Deitsch` — the trailing comma'd `auf Deitsch` reads like an afterthought.

###### Explicit gaps

- **I am not a native speaker of this dialect and had no external Viennese/Austrian reference.** Every form above was derived by pattern-matching against rows that already exist in this course. Where no existing row modelled the construction, I left the phrase out rather than guess — that is the whole of section B's "dialect form not confirmed" group. A native check on the 59 proposed targets is still warranted before any of them are written.
- **Unverified: `mit dir` position relative to `so oft wia möglich`.** I proposed `i wü so oft wia möglich mit dir reden`. Existing rows show `so oft wia möglich` before an object (`… Deitsch reden`) and `mit dir` before an object (`… mit dir Deitsch reden`), but no row has both. Medium confidence only.
- **Unverified: `i versuch iatz, X zum VERB` vs `i versuch, iatz X zum VERB`.** I followed the existing `i versuch iatz, wos zum lernen` (adverb before the comma) for all three `i'm trying … now` proposals. That is one existing example, not a confirmed rule.
- **Unverified: bare `heit` as an S7L1 build row.** Most legos in this course carry a bare build row equal to the lego itself, but S7L1 does not. I proposed adding it for consistency; it may have been omitted deliberately.
- **Not checked: phrase counts outside seeds 1–10.** My scope was seeds 1–10 only, so I cannot say whether the S2–S3 density dip continues past seed 10.

---

##### deu_ch_for_eng

**74 phrases proposed.** Dialect: Züri-register Swiss German, every target form built by analogy from a string already attested in this course (no Hochdeutsch, no invented forms). Verified against all 253 existing rows in seeds 1–10: **zero duplicate known_text, zero duplicate target_text, zero ZUT clash.**

Weighting: 34 of the 74 go to S2–S3 (the thin early seeds); S4–S10 get 2 each, only where a genuinely natural combination was absent. S1 is proposed **nothing** — see B.

###### A. Proposed phrases

| Seed/Lego | phrase_role | known_text | target_text | combines |
|---|---|---|---|---|
| S2L1 | build | to learn Swiss German | Schwiizerdütsch lerne | S1L3+S2L1 |
| S2L1 | build | to learn with you | mit dir lerne | S1L5+S2L1 |
| S2L1 | build | to learn now | jetz lerne | S1L4+S2L1 |
| S2L1 | build | to learn Swiss German now | jetz Schwiizerdütsch lerne | S1L3+S1L4+S2L1 |
| S2L1 | build | to learn Swiss German with you | mit dir Schwiizerdütsch lerne | S1L3+S1L5+S2L1 |
| S2L1 | build | to learn with you now | jetz mit dir lerne | S1L4+S1L5+S2L1 |
| S2L1 | use | I want to learn Swiss German now | ich wott jetz Schwiizerdütsch lerne | S1L1+S1L3+S1L4+S2L1 |
| S2L1 | use | I want to learn with you now | ich wott jetz mit dir lerne | S1L1+S1L4+S1L5+S2L1 |
| S2L1 | use | I want to learn Swiss German with you | ich wott mit dir Schwiizerdütsch lerne | S1L1+S1L3+S1L5+S2L1 |
| S2L1 | use | I want to learn Swiss German with you now | ich wott jetz mit dir Schwiizerdütsch lerne | S1L1+S1L3+S1L4+S1L5+S2L1 |
| S2L2 | use | I'm trying to speak now | ich versuech jetz z rede | S1L4+S2L2 |
| S2L2 | use | I'm trying to learn Swiss German | ich versuech Schwiizerdütsch z lerne | S1L3+S2L2 |
| S2L2 | use | I'm trying to learn with you | ich versuech mit dir z lerne | S1L5+S2L2 |
| S2L2 | use | I'm trying to speak Swiss German now | ich versuech jetz Schwiizerdütsch z rede | S1L3+S1L4+S2L2 |
| S2L2 | use | I'm trying to learn Swiss German now | ich versuech jetz Schwiizerdütsch z lerne | S1L3+S1L4+S2L2 |
| S2L2 | use | I'm trying to speak with you now | ich versuech jetz mit dir z rede | S1L4+S1L5+S2L2 |
| S2L2 | use | I'm trying to learn with you now | ich versuech jetz mit dir z lerne | S1L4+S1L5+S2L2 |
| S2L2 | use | I'm trying to speak Swiss German with you | ich versuech mit dir Schwiizerdütsch z rede | S1L3+S1L5+S2L2 |
| S2L2 | use | I'm trying to learn Swiss German with you | ich versuech mit dir Schwiizerdütsch z lerne | S1L3+S1L5+S2L2 |
| S2L2 | use | I'm trying to speak Swiss German with you now | ich versuech jetz mit dir Schwiizerdütsch z rede | S1L3+S1L4+S1L5+S2L2 |
| S3L1 | build | to learn as often as possible | so oft wie mögli lerne | S2L1+S3L1 |
| S3L1 | use | I'm trying to learn as often as possible | ich versuech so oft wie mögli z lerne | S2L2+S3L1 |
| S3L1 | use | I want to speak Swiss German as often as possible | ich wott so oft wie mögli Schwiizerdütsch rede | S1L1+S1L2+S1L3+S3L1 |
| S3L1 | use | I want to speak with you as often as possible | ich wott so oft wie mögli mit dir rede | S1L1+S1L2+S1L5+S3L1 |
| S3L1 | use | I want to learn Swiss German as often as possible | ich wott so oft wie mögli Schwiizerdütsch lerne | S1L1+S1L3+S2L1+S3L1 |
| S3L1 | use | I want to learn with you as often as possible | ich wott so oft wie mögli mit dir lerne | S1L1+S1L5+S2L1+S3L1 |
| S3L1 | use | I'm trying to speak Swiss German as often as possible | ich versuech so oft wie mögli Schwiizerdütsch z rede | S1L3+S2L2+S3L1 |
| S3L1 | use | I'm trying to speak with you as often as possible | ich versuech so oft wie mögli mit dir z rede | S1L5+S2L2+S3L1 |
| S3L2 | build | how to speak Swiss German | wie mä Schwiizerdütsch redet | S1L3+S3L2 |
| S3L2 | use | I want to learn how to speak Swiss German | ich wott lerne wie mä Schwiizerdütsch redet | S1L1+S1L3+S2L1+S3L2 |
| S3L2 | use | I'm trying to learn how to speak | ich versuech z lerne wie mä redet | S2L2+S3L2 |
| S3L2 | use | I'm trying to learn how to speak Swiss German | ich versuech z lerne wie mä Schwiizerdütsch redet | S1L3+S2L2+S3L2 |
| S3L2 | use | I want to learn how to speak now | ich wott jetz lerne wie mä redet | S1L1+S1L4+S2L1+S3L2 |
| S3L2 | use | I want to learn with you how to speak Swiss German | ich wott mit dir lerne wie mä Schwiizerdütsch redet | S1L1+S1L3+S1L5+S2L1+S3L2 |
| S4L1 | use | I want to learn something as often as possible | ich wott so oft wie mögli öppis lerne | S1L1+S2L1+S3L1+S4L1 |
| S4L1 | use | I want to learn something with you now | ich wott jetz mit dir öppis lerne | S1L1+S1L4+S1L5+S2L1+S4L1 |
| S4L2 | build | how to say something | wie mä öppis seit | S4L1+S4L2 |
| S4L2 | use | I'm trying to learn how to say | ich versuech z lerne wie mä seit | S2L2+S4L2 |
| S4L3 | use | I'm trying to speak in Swiss German | ich versuech uf Schwiizerdütsch z rede | S2L2+S4L3 |
| S4L3 | use | I want to speak in Swiss German now | ich wott jetz uf Schwiizerdütsch rede | S1L1+S1L2+S1L4+S4L3 |
| S5L1 | use | I'm going to speak in Swiss German | ich gaa uf Schwiizerdütsch rede | S4L3+S5L1 |
| S5L1 | use | I'm going to learn as often as possible | ich gaa so oft wie mögli lerne | S3L1+S5L1 |
| S5L2 | build | to speak with someone else | mit öpper anderem rede | S1L2+S5L2 |
| S5L2 | use | I'm trying to speak with someone else | ich versuech mit öpper anderem z rede | S2L2+S5L2 |
| S5L3 | use | I'm going to practise speaking with you | ich gaa mit dir s Rede üebe | S1L5+S5L3 |
| S5L3 | use | I want to practise speaking as often as possible | ich wott so oft wie mögli s Rede üebe | S1L1+S3L1+S5L3 |
| S6L1 | use | I want to learn a word | ich wott es Wort lerne | S1L1+S2L1+S6L1 |
| S6L1 | use | I'm going to learn a word | ich gaa es Wort lerne | S5L1+S6L1 |
| S6L2 | use | I'm going to remember something | ich gaa mi an öppis erinnere | S4L1+S5L1 |
| S6L2 | use | I'm trying to remember a word as often as possible | ich versuech so oft wie mögli mi an es Wort z erinnere | S2L2+S3L1+S6L1 |
| S7L1 | use | I'm going to speak with someone else today | ich gaa hüt mit öpper anderem rede | S5L1+S5L2+S7L1 |
| S7L1 | use | I want to learn a word today | ich wott hüt es Wort lerne | S1L1+S2L1+S6L1+S7L1 |
| S7L2 | use | I want to practise speaking hard | ich wott fescht s Rede üebe | S1L1+S5L3+S7L2 |
| S7L2 | use | I'm going to learn hard today | ich gaa hüt fescht lerne | S5L1+S7L1+S7L2 |
| S7L3 | use | I can practise speaking | ich cha s Rede üebe | S7L3 |
| S7L3 | use | I can learn a word today | ich cha hüt es Wort lerne | S6L1+S7L1+S7L3 |
| S7L4 | use | I want to try to speak | ich wott versueche z rede | S1L1+S1L2+S7L4 |
| S7L4 | use | I can try hard | ich cha fescht versueche | S7L2+S7L3 |
| S7L5 | use | I'm going to try as hard as I can | ich gaa versueche so fescht, wie ich cha | S5L1+S7L5 |
| S7L5 | use | I'm going to speak Swiss German as hard as I can | ich gaa Schwiizerdütsch rede so fescht, wie ich cha | S1L3+S5L1+S7L5 |
| S8L1 | use | I can explain something | ich cha öppis erkläre | S4L1+S7L3 |
| S8L1 | use | I'm going to explain a word | ich gaa es Wort erkläre | S5L1+S6L1 |
| S8L3 | build | what I want | was ich wott | S1L1+S8L3 |
| S8L3 | use | I can explain what I want | ich cha erkläre, was ich wott | S1L1+S7L3+S8L3 |
| S8L4 | use | I want to remember what I mean | ich wott mi an erinnere, was ich mein | S1L1+S6L2+S8L4 |
| S8L4 | use | I'm going to explain what I mean | ich gaa erkläre, was ich mein | S5L1+S8L4 |
| S9L1 | use | I can speak a little Swiss German | ich cha es bitzli Schwiizerdütsch rede | S1L3+S7L3+S9L1 |
| S9L1 | use | I'm going to practise a little today | ich gaa hüt es bitzli üebe | S5L1+S7L1+S9L1 |
| S10L1 | use | I'm going to explain the whole sentence | ich gaa de ganz Satz erkläre | S5L1+S10L1 |
| S10L1 | use | I can remember the whole sentence today | ich cha hüt mi an de ganz Satz erinnere | S7L1+S7L3+S10L1 |
| S10L2 | use | I'm not sure what I can | ich bi mir nöd sicher, was ich cha | S7L3+S8L3+S10L2 |
| S10L2 | use | I'm not sure how to say something | ich bi mir nöd sicher, wie mä öppis seit | S4L1+S4L2+S10L2 |
| S10L3 | build | if I want to learn | öb ich wott lerne | S1L1+S2L1+S10L3 |
| S10L3 | use | I'm not sure if I want to explain | ich bi mir nöd sicher, öb ich wott erkläre | S1L1+S8L1+S10L2+S10L3 |
###### B. Deliberately NOT proposed — and why

**Seed 1 gets nothing — it is already complete.** S1 sits at 1/2/2/4/8 vs Finnish 1/1/2/5/9, and every remaining slot is a verbless fragment that Finnish permits and German does not:
- `Swiss German now` (Finnish has "finnish now"), `Swiss German with you` — a bare noun + adverb with no verb is not a German utterance. `jetz Schwiizerdütsch` would have to be read as an elliptical fragment; it is not natural, so it is out.
- Everything else in S1's combination space (`to speak now`, `to speak Swiss German now`, `to speak with you now`, `to speak Swiss German with you`, and the four full `ich wott …` sentences) already exists.

**Unnatural in the target language / semantically odd**
- `now` + `as often as possible` in one phrase (e.g. "I want to speak now as often as possible") — the two adverbials fight; also would need reordering the known side.
- `I can learn as hard as I can`, `I can try as hard as I can` — `ich cha … so fescht, wie ich cha` repeats *cha* inside its own comparative. Grammatical, ugly, out.
- `I want to speak something`, `I mean a little` — verb/object mismatch in both languages.
- `I mean the whole sentence` at S8L2 — "the whole sentence" is not introduced until S10L1. (S10L1 material is what makes S8L2 hard to extend; see gaps.)

**Would require reordering the known side (explicitly forbidden)**
- `I want to learn how to say something with you` — the course's attested order is "I want to learn **with you** how to say something" (S4L2 p9). Making a second variant means moving the known-side words. Out.
- `I want to learn how to speak with you` — same, S3L2 p7 already fixes the order as "I want to learn with you how to speak".

**Vocabulary not yet introduced at that point**
- At S2L1, nothing using `i'm trying to` (S2L2 comes after it) — all ten S2L1 proposals use only `I want` as opener.
- At S5L3, `I can practise speaking` (`I can` is S7L3) — proposed at S7L3 instead, where it becomes legal.
- At S6L2, `I want to remember a word today` (`today` is S7L1) — proposed the S7 variants instead.
- At S7L2, `I'm going to try hard` (`to try` is S7L4) — proposed at S7L4 as `I can try hard`.

**Left out because the dialect form could not be confirmed — see Explicit gaps**
- `I want to practise speaking as hard as I can`
- `I'm not sure if I want to learn Swiss German`
- `I want to learn how to speak as often as possible`

**S8L2 (`I mean`) gets nothing.** Its combination space at that point is `I mean` + {something, a word, today, now} and all eight products already exist. Every remaining candidate needs S10 vocabulary. Checked exhaustively; nothing safe to add.

###### Structural findings

1. **No barren legos.** All 30 legos in seeds 1–10 are `is_new=true` (there is not a single re-introduction in this range), and every one except S1L01 already carries combination content. S1L01 carries only its own lego row `I want / ich wott` plus two components — correct, untouched.
2. **`lego_count` is garbage, confirmed independently.** e.g. S1L2 build `to speak` carries `lego_count=2` for a single lego; S3L1 build `as often as possible` carries `lego_count=1` while S3L1 p5 `I want to speak as often as possible` carries 8. Nothing in this fragment was derived from that column.
3. **`z`-placement in `versueche` frames is self-inconsistent.** The dominant pattern across the course is *object + `z` + infinitive*: `ich versuech mit dir z rede`, `ich versuech öppis z lerne`, `ich versuech es Wort z lerne`, `ich versuech so oft wie mögli Schwiizerdütsch z lerne`. **S2L2 p7 breaks it**: `I'm trying to speak Swiss German` → `ich versuech z Schwiizerdütsch rede`, with `z` stranded before the object. That single row looks wrong. I followed the dominant pattern in all ten S2L2 proposals; **if Kai agrees, S2L2 p7 wants fixing to `ich versuech Schwiizerdütsch z rede`** — I did not touch it (read-only job).
4. **Adverbial drifts into the subordinate clause in S3L2.** `I'm trying to learn how to speak as often as possible` → `ich versuech z lerne wie mä so oft wie mögli redet`, i.e. "as often as possible" ends up modifying *speaks*, not *learn*. Same in S3L2 p9 and p10. Meaning-changing, not just stylistic. Flagged, not fixed — and it is why I declined to add the `I want …` twin of that phrase.
5. **Two competing renderings of `as hard as I can`.** Extraposed whole — `… versueche so fescht, wie ich cha` (S7L5 p5), `… Schwiizerdütsch lerne so fescht, wie ich cha` (p9) — versus split — `… so fescht üebe, wie ich cha` (p8), `ich wott hüt so fescht versueche, wie ich cha` (p7). Both live side by side in S7L5. My two S7L5 proposals use the extraposed form because each has a direct attested twin.
6. **Modal order inside `öb`-clauses is self-inconsistent.** `öb ich mi an de ganz Satz cha erinnere` (modal after object, S10L3 p4) versus `öb ich cha Schwiizerdütsch rede` and `öb ich cha es bitzli erkläre` (modal before object, p7/p5). Both in the same lego.
7. **Capitalisation drift.** The S1L3 lego target is lowercase `schwiizerdütsch` while every phrase capitalises `Schwiizerdütsch`; S10L2 p7 also drops to lowercase mid-phrase. All my proposals use the capitalised form (the majority).
8. **Seed 9 has a single lego** (`a little`) where its neighbours have 2–5. Not obviously truncated — S8 has 4 and S10 has 3 — but worth an eye if seed sizes are meant to be even.

###### Explicit gaps

- **Not native-verified.** I am not a Zürich-dialect speaker and had no external dialect reference in this workspace. Every target form here is an analogue of a string already present in this course, which is the strongest evidence available to me — it is not the same as a native check. **The one form with no exact precedent is `ich versuech Schwiizerdütsch z lerne`** (and its five siblings), which deliberately contradicts the S2L2 p7 outlier described in finding 3. If Kai judges p7 correct rather than anomalous, those six rows need re-cutting.
- **`so oft wie mögli` before `mit dir` is inferred, not attested.** No existing phrase in seeds 1–10 combines the frequency adverbial with `mit dir`, so `ich wott so oft wie mögli mit dir rede` / `… mit dir lerne` / `ich versuech so oft wie mögli mit dir z rede` (4 rows) rest on the pattern `so oft wie mögli` + object + verb seen with `Schwiizerdütsch`/`öppis`/`es Wort`. Plausible; unconfirmed.
- **`I want to practise speaking as hard as I can`** — could not decide between `ich wott so fescht s Rede üebe, wie ich cha` (split, matching `ich gaa so fescht üebe, wie ich cha`) and `ich wott s Rede üebe so fescht, wie ich cha` (extraposed). Course supports both. **Not proposed.** Substituted `I'm going to speak Swiss German as hard as I can`, which has an exact structural twin.
- **`I'm not sure if I want to learn Swiss German`** — could not confirm whether the öb-clause takes `öb ich Schwiizerdütsch wott lerne` or `öb ich wott Schwiizerdütsch lerne`; the course contradicts itself (finding 6). **Not proposed.** The two S10L3 rows I did propose (`öb ich wott lerne`, `öb ich wott erkläre`) carry no object and so dodge the question entirely.
- **`I want to learn how to speak as often as possible`** — the only convention available is the semantically-drifted one in finding 4. **Not proposed**; I would not bake in a reading I believe is wrong.
- **Comma convention taken from local precedent, not a rule.** `wie mä …` clauses in this course carry no preceding comma; `was ich …` and `öb ich …` clauses do. I matched each locally. I could not find a stated convention to check that against.

---

#### ita_for_eng · por_for_eng · por_br_for_eng — backfill proposal (READ-ONLY)

| course | combos now | proposed | after |
|---|---|---|---|
| ita_for_eng | 177 | **149** | 326 |
| por_for_eng | 182 | **129** | 311 |
| por_br_for_eng | 184 | **135** | 319 |

(fin_for_eng gold standard = 347)

**Read this first:** three lego *definitions* carry a bound preposition/contraction and that
silently caps the combination space. Details in each course's §B — they are the reason the
"missing" counts below are not larger. `ita S9L2 un po' di`, `por S6L1 lembrar-me de` +
`S10L3 da frase inteira`, `por_br S6L1 me lembrar de` + `S9L2 um pouco de`.

---

#### 1. ita_for_eng

##### A. Proposed phrases

###### S1L04 `with you` / `con te` — **the barren lego** (0 combos today)

| Seed/Lego | role | known_text | target_text | combines |
|---|---|---|---|---|
| S1L4 | build | to speak with you | parlare con te | L2+L4 |
| S1L4 | build | to speak Italian with you | parlare italiano con te | L2+L3+L4 |
| S1L4 | use | I want to speak with you | voglio parlare con te | L1+L2+L4 |
| S1L4 | use | I want to speak Italian with you | voglio parlare italiano con te | L1+L2+L3+L4 |

###### Rest of course

| Seed/Lego | role | known_text | target_text | combines |
|---|---|---|---|---|
| S1L5 | build | to speak with you now | parlare con te adesso | L2+L4+L5 |
| S1L5 | use | I want to speak Italian with you now | voglio parlare italiano con te adesso | L1..L5 |
| S2L1 | use | I'm trying to speak now | sto provando a parlare adesso | S2L1+L2+now |
| S2L1 | use | I'm trying to speak with you | sto provando a parlare con te | +with you |
| S2L1 | use | I'm trying to speak Italian now | sto provando a parlare italiano adesso | |
| S2L1 | use | I'm trying to speak Italian with you | sto provando a parlare italiano con te | |
| S2L1 | use | I'm trying to speak Italian with you now | sto provando a parlare italiano con te adesso | |
| S2L2 | build | I'm trying to learn | sto provando a imparare | S2L1+S2L2 |
| S2L2 | build | to learn with you | imparare con te | |
| S2L2 | build | to learn now | imparare adesso | |
| S2L2 | build | to learn Italian now | imparare italiano adesso | |
| S2L2 | build | to learn Italian with you | imparare italiano con te | |
| S2L2 | use | I want to learn with you | voglio imparare con te | |
| S2L2 | use | I want to learn now | voglio imparare adesso | |
| S2L2 | use | I'm trying to learn now | sto provando a imparare adesso | |
| S2L2 | use | I'm trying to learn with you | sto provando a imparare con te | |
| S2L2 | use | I want to learn Italian now | voglio imparare italiano adesso | |
| S2L2 | use | I'm trying to learn Italian now | sto provando a imparare italiano adesso | |
| S2L2 | use | I want to learn Italian with you now | voglio imparare italiano con te adesso | |
| S3L1 | build | how to learn Italian | come imparare italiano | |
| S3L1 | build | how to speak with you | come parlare con te | |
| S3L1 | use | I want to learn how to speak | voglio imparare come parlare | |
| S3L1 | use | how to speak Italian with you | come parlare italiano con te | |
| S3L2 | build | to speak Italian as often as possible | parlare italiano il più spesso possibile | |
| S3L2 | build | how to speak as often as possible | come parlare il più spesso possibile | |
| S3L2 | use | I want to speak as often as possible | voglio parlare il più spesso possibile | |
| S3L2 | use | I want to learn as often as possible | voglio imparare il più spesso possibile | |
| S3L2 | use | I'm trying to learn as often as possible | sto provando a imparare il più spesso possibile | |
| S3L2 | use | I want to speak with you as often as possible | voglio parlare con te il più spesso possibile | |
| S4L1 | build | something now | qualcosa adesso | |
| S4L1 | build | how to learn something | come imparare qualcosa | |
| S4L1 | use | I want to learn something now | voglio imparare qualcosa adesso | |
| S4L1 | use | I'm trying to learn something with you | sto provando a imparare qualcosa con te | |
| S4L1 | use | I want to learn something as often as possible | voglio imparare qualcosa il più spesso possibile | |
| S4L2 | build | how to say | come dire | |
| S4L2 | build | how to say something | come dire qualcosa | |
| S4L2 | use | I'm trying to say something now | sto provando a dire qualcosa adesso | |
| S4L2 | use | I want to say something with you now | voglio dire qualcosa con te adesso | |
| S4L3 | build | to say in Italian | dire in italiano | |
| S4L3 | build | to learn something in Italian | imparare qualcosa in italiano | |
| S4L3 | use | I want to learn something in Italian | voglio imparare qualcosa in italiano | |
| S4L3 | use | I'm trying to speak in Italian | sto provando a parlare in italiano | |
| S4L3 | use | I want to speak in Italian with you | voglio parlare in italiano con te | |
| S4L3 | use | how to say something in Italian | come dire qualcosa in italiano | |
| S5L1 | build | I'm going to say | sto per dire | |
| S5L1 | use | I'm going to speak with you | sto per parlare con te | |
| S5L1 | use | I'm going to say something now | sto per dire qualcosa adesso | |
| S5L1 | use | I'm going to speak in Italian | sto per parlare in italiano | |
| S5L1 | use | I'm going to learn Italian | sto per imparare italiano | |
| S5L1 | use | I'm going to speak Italian with you | sto per parlare italiano con te | |
| S5L1 | use | I'm going to learn something | sto per imparare qualcosa | |
| S5L2 | build | how to practise speaking | come fare pratica parlando | |
| S5L2 | build | to practise speaking with you | fare pratica parlando con te | |
| S5L2 | use | I'm going to practise speaking now | sto per fare pratica parlando adesso | |
| S5L2 | use | I'm trying to practise speaking | sto provando a fare pratica parlando | |
| S5L2 | use | I want to practise speaking with you | voglio fare pratica parlando con te | |
| S5L3 | use | I'm going to speak with someone else | sto per parlare con qualcun altro | |
| S5L3 | use | I'm trying to speak with someone else | sto provando a parlare con qualcun altro | |
| S5L3 | use | I want to practise speaking with someone else | voglio fare pratica parlando con qualcun altro | |
| S5L3 | use | I'm going to speak Italian with someone else | sto per parlare italiano con qualcun altro | |
| S5L3 | use | I want to speak Italian with someone else | voglio parlare italiano con qualcun altro | |
| S6L1 | build | to remember something | ricordare qualcosa | |
| S6L1 | build | to remember now | ricordare adesso | |
| S6L1 | use | I want to remember something | voglio ricordare qualcosa | |
| S6L1 | use | I'm trying to remember something | sto provando a ricordare qualcosa | |
| S6L1 | use | I'm going to remember something | sto per ricordare qualcosa | |
| S6L1 | use | I'm trying to remember something in Italian | sto provando a ricordare qualcosa in italiano | |
| S6L1 | use | I want to remember how to speak Italian | voglio ricordare come parlare italiano | |
| S6L2 | build | to learn a word | imparare una parola | |
| S6L2 | build | to remember a word now | ricordare una parola adesso | |
| S6L2 | use | I want to remember a word | voglio ricordare una parola | |
| S6L2 | use | I'm trying to remember a word | sto provando a ricordare una parola | |
| S6L2 | use | I want to say a word | voglio dire una parola | |
| S6L2 | use | I'm going to remember a word | sto per ricordare una parola | |
| S6L2 | use | I want to say a word in Italian | voglio dire una parola in italiano | |
| S7L1 | build | to try now | provare adesso | |
| S7L1 | build | to try something | provare qualcosa | |
| S7L1 | use | I want to try with you | voglio provare con te | |
| S7L1 | use | I want to try something now | voglio provare qualcosa adesso | |
| S7L1 | use | I'm going to try something in Italian | sto per provare qualcosa in italiano | |
| S7L1 | use | I want to try something with you | voglio provare qualcosa con te | |
| S7L2 | build | to practise speaking as much as possible | fare pratica parlando il più possibile | |
| S7L2 | build | to say as much as possible | dire il più possibile | |
| S7L2 | use | I want to try as much as possible | voglio provare il più possibile | |
| S7L2 | use | I'm trying to speak as much as possible | sto provando a parlare il più possibile | |
| S7L2 | use | I'm going to speak Italian as much as possible | sto per parlare italiano il più possibile | |
| S7L2 | use | I want to learn as much as possible | voglio imparare il più possibile | |
| S7L3 | build | to try today | provare oggi | |
| S7L3 | build | to say something today | dire qualcosa oggi | |
| S7L3 | build | to remember a word today | ricordare una parola oggi | |
| S7L3 | use | I want to try today | voglio provare oggi | |
| S7L3 | use | I'm going to speak Italian today | sto per parlare italiano oggi | |
| S7L3 | use | I'm trying to learn something today | sto provando a imparare qualcosa oggi | |
| S7L3 | use | I want to practise speaking with someone else today | voglio fare pratica parlando con qualcun altro oggi | |
| S8L1 | build | to try to practise speaking | provare a fare pratica parlando | |
| S8L1 | use | I want to try to remember a word | voglio provare a ricordare una parola | |
| S8L1 | use | I'm going to try to speak Italian with someone else | sto per provare a parlare italiano con qualcun altro | |
| S8L1 | use | I want to try to learn a word today | voglio provare a imparare una parola oggi | |
| S8L1 | use | I'm going to try to remember something | sto per provare a ricordare qualcosa | |
| S8L2 | build | to explain something | spiegare qualcosa | |
| S8L2 | build | I'm going to explain | sto per spiegare | |
| S8L2 | use | I want to explain something | voglio spiegare qualcosa | |
| S8L2 | use | I'm going to explain something now | sto per spiegare qualcosa adesso | |
| S8L2 | use | I want to try to explain something in Italian | voglio provare a spiegare qualcosa in italiano | |
| S8L2 | use | I'm going to try to explain a word | sto per provare a spiegare una parola | |
| S8L3 | build | to try to explain what I mean | provare a spiegare quello che intendo | |
| S8L3 | use | I want to say what I mean | voglio dire quello che intendo | |
| S8L3 | use | I'm going to explain what I mean | sto per spiegare quello che intendo | |
| S8L3 | use | I want to explain what I mean in Italian | voglio spiegare quello che intendo in italiano | |
| S8L3 | use | I want to explain what I mean today | voglio spiegare quello che intendo oggi | |
| S8L3 | use | I'm going to try to explain what I mean today | sto per provare a spiegare quello che intendo oggi | |
| S9L1 | build | I speak in Italian | parlo in italiano | |
| S9L1 | use | I speak Italian now | parlo italiano adesso | |
| S9L1 | use | I speak with you today | parlo con te oggi | |
| S9L1 | use | I speak Italian as much as possible | parlo italiano il più possibile | |
| S9L1 | use | I speak Italian with someone else today | parlo italiano con qualcun altro oggi | |
| S9L2 | build | to speak a little Italian | parlare un po' di italiano | |
| S9L2 | use | I want to speak a little Italian | voglio parlare un po' di italiano | |
| S9L2 | use | I'm trying to speak a little Italian | sto provando a parlare un po' di italiano | |
| S9L2 | use | I'm going to speak a little Italian today | sto per parlare un po' di italiano oggi | |
| S9L2 | use | I speak a little Italian with you | parlo un po' di italiano con te | |
| S9L2 | use | I want to try to speak a little Italian | voglio provare a parlare un po' di italiano | |
| S10L1 | build | I can try | posso provare | |
| S10L1 | build | I can learn | posso imparare | |
| S10L1 | build | I can practise speaking | posso fare pratica parlando | |
| S10L1 | use | I can speak a little Italian | posso parlare un po' di italiano | |
| S10L1 | use | I can remember a word | posso ricordare una parola | |
| S10L1 | use | I can try to explain what I mean | posso provare a spiegare quello che intendo | |
| S10L1 | use | I can speak Italian today | posso parlare italiano oggi | |
| S10L2 | build | I'm not sure today | non sono sicuro oggi | |
| S10L2 | use | I'm not sure how to remember a word | non sono sicuro come ricordare una parola | |
| S10L2 | use | I'm not sure how to say a word in Italian | non sono sicuro come dire una parola in italiano | |
| S10L2 | use | I'm not sure how to practise speaking | non sono sicuro come fare pratica parlando | |
| S10L3 | build | if I can speak | se posso parlare | |
| S10L3 | build | if I can remember | se posso ricordare | |
| S10L3 | build | if I can explain | se posso spiegare | |
| S10L3 | use | I'm not sure if I can remember a word | non sono sicuro se posso ricordare una parola | |
| S10L3 | use | I'm not sure if I can try today | non sono sicuro se posso provare oggi | |
| S10L3 | use | I'm not sure if I can say something in Italian | non sono sicuro se posso dire qualcosa in italiano | |
| S10L4 | build | to explain the whole sentence | spiegare tutta la frase | |
| S10L4 | build | if I can remember the whole sentence | se posso ricordare tutta la frase | |
| S10L4 | use | I want to remember the whole sentence | voglio ricordare tutta la frase | |
| S10L4 | use | I want to say the whole sentence in Italian | voglio dire tutta la frase in italiano | |
| S10L4 | use | I'm going to try to remember the whole sentence | sto per provare a ricordare tutta la frase | |
| S10L4 | use | I'm not sure if I can remember the whole sentence today | non sono sicuro se posso ricordare tutta la frase oggi | |

**Total proposed: 149**

##### B. Deliberately NOT proposed — ita_for_eng

**Bare-noun fragments (natural in Finnish, odd in Italian).** Finnish marks the object with the
partitive, so `suomea nyt` / `suomea sun kanssa` stand alone. Italian `italiano adesso`,
`italiano con te` are bare nouns with an adverb and read as non-utterances. So I did NOT
propose `Italian now` / `Italian with you` — the Finnish-parallel slots at S1L4 and S1L5 —
and used the verb-headed partials (`to speak Italian with you`) instead. **This is why S1L04
gets 4 rather than Finnish's 5.**

**`un po' di` carries the preposition (S9L2).** The lego target ends in `di`, so it cannot sit
phrase-finally. Rejected: `I speak a little` (`parlo un po' di` — dangling), `to learn a little`,
`to say a little`, `to practise a little`. Finnish has all four of those. Every `a little`
proposal above is followed by `italiano`.

**`provare` vs `provare a` (S7L1 vs S8L1).** At S7L1 only bare `provare` exists, so
`to try to speak` etc. are **not yet available** — they correctly arrive at S8L1. Rejected at
S7: `to try to speak`, `to try to learn`, `to try to remember`.

**`sto provando a` carries the `a`.** Rejected `I'm trying now` (Finnish has it as
`mä yritän nyt`); in Italian it would need `sto provando adesso`, which is a different lego form.

**Stutter / clash.** Rejected `to learn to say` (Italian needs `imparare a dire` — inserts a
preposition not in any lego). Rejected `to learn in Italian` (`imparare in italiano` reads as
"learn *while using* Italian", not the intended sense; Finnish's `oppia suomeksi` is fine).

**Reordering refused.** No proposal reorders the known side; e.g. I did not manufacture
`with you I want to speak` or punctuation variants of existing rows.

##### C. Structural findings — ita_for_eng

1. **S1L04 `with you` had ZERO combination phrases** — the only `is_new=true` non-S1L01 barren
   lego in this course. Confirmed against the DB. Fixed in §A.
2. **Duplicate rows, same known+target, differing only in role** — these are pre-existing, I did
   not add to them:
   - `S1L3` `I want to speak Italian` / `voglio parlare italiano` exists as **both** `build` p2
     **and** `use` p3.
   - `S2L1` `I'm trying to speak Italian` / `sto provando a parlare italiano` exists as **both**
     `build` p5 **and** `use` p6.
   Worth a dedupe pass — they inflate the 177 count by 2.
3. **`non sono sicuro come …` (S10L2, 5 existing rows) is non-standard Italian** — natural
   Italian is `non sono sicuro **di** come …`. I followed the established form for consistency
   rather than silently diverging, but **all 5 existing rows plus my 3 new ones would need to
   change together** if Kai wants the `di`. Flagging rather than deciding.
4. **`how to say in Italian` (S4L3 p6) is broken English** — "how to say *what* in Italian?".
   Pre-existing. Suggest either deleting it or making it `how to say something in Italian`
   (which I have proposed separately).
5. S1L02 has 1 combo and S1L03 has 2 — this matches Finnish exactly and is **correct**, not a gap.

---

#### 2. por_for_eng

##### A. Proposed phrases

| Seed/Lego | role | known_text | target_text | combines |
|---|---|---|---|---|
| S1L5 | build | to speak Portuguese with you now | falar português contigo agora | L2+L3+L4+L5 |
| S2L1 | build | to learn with you | aprender contigo | |
| S2L1 | build | to learn now | aprender agora | |
| S2L1 | build | to learn Portuguese now | aprender português agora | |
| S2L1 | build | to learn Portuguese with you | aprender português contigo | |
| S2L1 | use | I want to learn with you | quero aprender contigo | |
| S2L1 | use | I want to learn Portuguese now | quero aprender português agora | |
| S2L1 | use | I want to learn Portuguese with you | quero aprender português contigo | |
| S2L1 | use | I want to learn Portuguese with you now | quero aprender português contigo agora | |
| S2L2 | build | I'm trying to speak now | estou a tentar falar agora | |
| S2L2 | use | I'm trying to speak Portuguese now | estou a tentar falar português agora | |
| S2L2 | use | I'm trying to learn with you | estou a tentar aprender contigo | |
| S2L2 | use | I'm trying to speak Portuguese with you | estou a tentar falar português contigo | |
| S2L2 | use | I'm trying to learn Portuguese now | estou a tentar aprender português agora | |
| S2L2 | use | I'm trying to learn Portuguese with you | estou a tentar aprender português contigo | |
| S3L1 | build | how to learn Portuguese | como aprender português | |
| S3L1 | build | how to speak with you | como falar contigo | |
| S3L1 | use | I'm trying to learn how to speak | estou a tentar aprender como falar | |
| S3L1 | use | how to speak Portuguese with you | como falar português contigo | |
| S3L1 | use | I want to learn how to speak Portuguese now | quero aprender como falar português agora | |
| S3L2 | build | to learn Portuguese as often as possible | aprender português o mais frequentemente possível | |
| S3L2 | build | how to learn as often as possible | como aprender o mais frequentemente possível | |
| S3L2 | use | I want to learn as often as possible | quero aprender o mais frequentemente possível | |
| S3L2 | use | I'm trying to speak Portuguese as often as possible | estou a tentar falar português o mais frequentemente possível | |
| S3L2 | use | I want to speak with you as often as possible | quero falar contigo o mais frequentemente possível | |
| S3L2 | use | I'm trying to learn Portuguese as often as possible | estou a tentar aprender português o mais frequentemente possível | |
| S4L1 | build | to say now | dizer agora | |
| S4L1 | use | I want to say as often as possible | quero dizer o mais frequentemente possível | |
| S4L2 | build | something now | algo agora | |
| S4L2 | build | to learn something now | aprender algo agora | |
| S4L2 | use | I'm trying to say something now | estou a tentar dizer algo agora | |
| S4L2 | use | I want to learn something now | quero aprender algo agora | |
| S4L2 | use | I want to say something with you | quero dizer algo contigo | |
| S4L2 | use | I'm trying to learn something now | estou a tentar aprender algo agora | |
| S4L2 | use | I want to learn something as often as possible | quero aprender algo o mais frequentemente possível | |
| S4L3 | build | to speak in Portuguese | falar em português | |
| S4L3 | build | to say in Portuguese | dizer em português | |
| S4L3 | use | I want to speak in Portuguese | quero falar em português | |
| S4L3 | use | I'm trying to speak in Portuguese | estou a tentar falar em português | |
| S4L3 | use | I want to speak in Portuguese with you | quero falar em português contigo | |
| S4L3 | use | I'm trying to learn something in Portuguese | estou a tentar aprender algo em português | |
| S4L3 | use | I want to learn something in Portuguese | quero aprender algo em português | |
| S5L1 | build | I'm going to say | vou dizer | |
| S5L1 | use | I'm going to speak with you | vou falar contigo | |
| S5L1 | use | I'm going to speak now | vou falar agora | |
| S5L1 | use | I'm going to say something now | vou dizer algo agora | |
| S5L1 | use | I'm going to learn Portuguese | vou aprender português | |
| S5L1 | use | I'm going to speak in Portuguese | vou falar em português | |
| S5L1 | use | I'm going to learn something | vou aprender algo | |
| S5L1 | use | I'm going to speak as often as possible | vou falar o mais frequentemente possível | |
| S5L2 | build | how to practise speaking | como praticar a falar | |
| S5L2 | build | to practise speaking now | praticar a falar agora | |
| S5L2 | build | to practise speaking with you | praticar a falar contigo | |
| S5L2 | use | I want to practise speaking now | quero praticar a falar agora | |
| S5L2 | use | I want to practise speaking with you | quero praticar a falar contigo | |
| S5L2 | use | I'm going to practise speaking as often as possible | vou praticar a falar o mais frequentemente possível | |
| S5L3 | build | to learn with someone else | aprender com outra pessoa | |
| S5L3 | use | I want to learn Portuguese with someone else | quero aprender português com outra pessoa | |
| S5L3 | use | I'm going to practise speaking with someone else | vou praticar a falar com outra pessoa | |
| S5L3 | use | I want to speak Portuguese with someone else | quero falar português com outra pessoa | |
| S5L3 | use | I'm trying to practise speaking with someone else | estou a tentar praticar a falar com outra pessoa | |
| S6L1 | build | how to remember something | como lembrar-me de algo | |
| S6L1 | build | to remember how to say | lembrar-me de como dizer | |
| S6L1 | build | to remember something in Portuguese | lembrar-me de algo em português | |
| S6L1 | use | I'm going to remember something | vou lembrar-me de algo | |
| S6L1 | use | I want to remember how to speak | quero lembrar-me de como falar | |
| S6L1 | use | I'm trying to remember how to say something | estou a tentar lembrar-me de como dizer algo | |
| S6L1 | use | I want to remember something in Portuguese | quero lembrar-me de algo em português | |
| S6L2 | build | to learn a word | aprender uma palavra | |
| S6L2 | build | to remember a word now | lembrar-me de uma palavra agora | |
| S6L2 | build | how to say a word | como dizer uma palavra | |
| S6L2 | use | I want to say a word | quero dizer uma palavra | |
| S6L2 | use | I want to learn a word | quero aprender uma palavra | |
| S6L2 | use | I'm going to remember a word | vou lembrar-me de uma palavra | |
| S6L2 | use | I'm trying to say a word in Portuguese | estou a tentar dizer uma palavra em português | |
| S7L1 | build | to try to learn | tentar aprender | |
| S7L1 | build | to try to say | tentar dizer | |
| S7L1 | use | I want to try to remember a word | quero tentar lembrar-me de uma palavra | |
| S7L1 | use | I'm going to try to speak Portuguese | vou tentar falar português | |
| S7L1 | use | I want to try to learn something | quero tentar aprender algo | |
| S7L1 | use | I'm going to try to practise speaking | vou tentar praticar a falar | |
| S7L2 | build | to learn as hard as I can | aprender com toda a força que puder | |
| S7L2 | build | to practise speaking as hard as I can | praticar a falar com toda a força que puder | |
| S7L2 | use | I want to speak as hard as I can | quero falar com toda a força que puder | |
| S7L2 | use | I want to learn as hard as I can | quero aprender com toda a força que puder | |
| S7L2 | use | I'm going to speak Portuguese as hard as I can | vou falar português com toda a força que puder | |
| S7L2 | use | I want to practise speaking as hard as I can | quero praticar a falar com toda a força que puder | |
| S7L3 | build | to say something today | dizer algo hoje | |
| S7L3 | build | to remember a word today | lembrar-me de uma palavra hoje | |
| S7L3 | use | I'm going to speak Portuguese today | vou falar português hoje | |
| S7L3 | use | I want to try to speak Portuguese today | quero tentar falar português hoje | |
| S7L3 | use | I'm trying to learn something today | estou a tentar aprender algo hoje | |
| S7L3 | use | I want to speak with someone else today | quero falar com outra pessoa hoje | |
| S8L1 | build | how to explain | como explicar | |
| S8L1 | build | to explain a word | explicar uma palavra | |
| S8L1 | use | I want to explain a word in Portuguese | quero explicar uma palavra em português | |
| S8L1 | use | I'm going to try to explain something today | vou tentar explicar algo hoje | |
| S8L1 | use | I want to remember how to explain | quero lembrar-me de como explicar | |
| S8L1 | use | I'm trying to explain something in Portuguese | estou a tentar explicar algo em português | |
| S8L2 | build | to try to explain what I mean | tentar explicar o que quero dizer | |
| S8L2 | build | how to explain what I mean | como explicar o que quero dizer | |
| S8L2 | use | I want to explain what I mean | quero explicar o que quero dizer | |
| S8L2 | use | I'm going to explain what I mean | vou explicar o que quero dizer | |
| S8L2 | use | I want to try to explain what I mean today | quero tentar explicar o que quero dizer hoje | |
| S9L1 | build | I speak in Portuguese | falo em português | |
| S9L1 | use | I speak Portuguese now | falo português agora | |
| S9L1 | use | I speak with you today | falo contigo hoje | |
| S9L1 | use | I speak Portuguese with you today | falo português contigo hoje | |
| S9L1 | use | I speak Portuguese with someone else today | falo português com outra pessoa hoje | |
| S9L2 | build | to speak a little Portuguese | falar um pouco de português | |
| S9L2 | use | I want to speak a little Portuguese | quero falar um pouco de português | |
| S9L2 | use | I'm going to speak a little Portuguese today | vou falar um pouco de português hoje | |
| S9L2 | use | I want to try to speak a little Portuguese | quero tentar falar um pouco de português | |
| S9L2 | use | I speak a little Portuguese with you | falo um pouco de português contigo | |
| S10L1 | build | I'm not sure today | não tenho a certeza hoje | |
| S10L1 | use | I'm not sure how to practise speaking | não tenho a certeza de como praticar a falar | |
| S10L1 | use | I'm not sure how to remember a word | não tenho a certeza de como lembrar-me de uma palavra | |
| S10L1 | use | I'm not sure how to speak Portuguese | não tenho a certeza de como falar português | |
| S10L1 | use | I'm not sure how to explain a word in Portuguese | não tenho a certeza de como explicar uma palavra em português | |
| S10L2 | build | if I can learn | se consigo aprender | |
| S10L2 | build | if I can say | se consigo dizer | |
| S10L2 | build | if I can practise speaking | se consigo praticar a falar | |
| S10L2 | use | I'm not sure if I can explain a word | não tenho a certeza se consigo explicar uma palavra | |
| S10L2 | use | I'm not sure if I can speak Portuguese today | não tenho a certeza se consigo falar português hoje | |
| S10L2 | use | I'm not sure if I can learn something today | não tenho a certeza se consigo aprender algo hoje | |
| S10L3 | build | to try to remember the whole sentence | tentar lembrar-me da frase inteira | |
| S10L3 | use | I'm going to remember the whole sentence | vou lembrar-me da frase inteira | |
| S10L3 | use | I want to try to remember the whole sentence today | quero tentar lembrar-me da frase inteira hoje | |
| S10L3 | use | I'm not sure if I can remember the whole sentence today | não tenho a certeza se consigo lembrar-me da frase inteira hoje | |

**Total proposed: 129**

##### B. Deliberately NOT proposed — por_for_eng

**`the whole sentence` = `da frase inteira` — the lego bakes in the `de+a` contraction (S10L3).**
It therefore ONLY combines after `lembrar-me de` (→ `lembrar-me da frase inteira`). With any
other verb the contraction is simply wrong Portuguese. Rejected: `to say the whole sentence`
(`dizer da frase inteira` ✗), `to explain the whole sentence`, `if I can say the whole sentence`,
`I want to say the whole sentence`. **All 11 rows at S10L3 are consequently remember-only.**
This is a lego-definition problem, not a coverage problem — see §C.

**`lembrar-me de` carries the `de` (S6L1).** Rejected `to remember now` (`lembrar-me de agora` ✗
/ `lembrar-me agora` changes the lego surface) and bare `how to remember`. Where the existing
course does drop the `de` (S10L1 `de como lembrar-me`) it is grammatically forced; I did not
extend that pattern into new build rows.

**`um pouco de` carries the `de` (S9L2).** Rejected `to speak a little`, `I'm trying to speak
a little`, `I want to practise a little` — all leave `de` dangling. Every proposal is
`a little Portuguese`.

**`quero dizer` stutter.** Rejected `I want to say what I mean` → `quero dizer o que quero dizer`.
The `what I mean` lego is literally `o que quero dizer`, so it collides with `I want to say`.
(The existing row `I want to say what I mean in Portuguese` already has this — see §C.)

**Bare-noun fragments.** Rejected `Portuguese now`, `Portuguese with you`, `a little` alone —
same reasoning as Italian.

**S4L1 `to say` is genuinely thin** and gets only 2. At that point `something` (S4L2) has not
arrived, so almost every natural `to say` combination needs an object that does not exist yet.
Rejected: `to say with you`, `to say as often as possible` as builds — grammatical but objectless
and odd. A smaller correct set beats a forced one.

##### C. Structural findings — por_for_eng

1. **No barren `is_new=true` lego.** S1L01 is correctly barren; every other lego has ≥1 combo.
   S1L02 has 1, S1L03 has 2 — matches Finnish, correct.
2. **`S10L3 the whole sentence` / `da frase inteira` should probably be re-cut as
   `a frase inteira`,** with the `de` staying on the `to remember` lego. As defined it is
   unusable with `dizer` / `explicar`, which is why the entire seed-10 tail is
   remember-only. **This is the single highest-value thing to look at in this course.**
   Note por_br_for_eng defines the SAME lego as `a frase inteira` (no contraction) and hits the
   mirror-image problem — see §2 of por_br below.
3. **`I want to say what I mean in Portuguese` (S8L2) →
   `quero dizer o que quero dizer em português`** — a real stutter in the target. Pre-existing.
   Suggest replacing with `I want to explain what I mean in Portuguese`.
4. **Role tagging is inconsistent with Finnish** at S1L02 (`I want to speak` tagged `use`, Finnish
   has it `build`) and S2L01 (`I want to learn` tagged `use`, no `build` row at all). Cosmetic,
   but if roles drive anything downstream it is worth a sweep. I matched the *Finnish* convention
   in my proposals, so my `build`/`use` split may look inconsistent next to the existing rows.
5. `S6L1` has no `n=1` self row issue, but `S1L04` has **no `with you` n=1 row** while
   por_br_for_eng does. Not a combination gap; noting the asymmetry.

---

#### 3. por_br_for_eng

##### A. Proposed phrases

| Seed/Lego | role | known_text | target_text | combines |
|---|---|---|---|---|
| S1L4 | build | to speak Portuguese with you | falar português com você | L2+L3+L4 |
| S1L5 | build | to speak now | falar agora | |
| S1L5 | build | to speak Portuguese now | falar português agora | |
| S1L5 | build | with you now | com você agora | |
| S2L1 | build | to learn now | aprender agora | |
| S2L1 | build | to learn with you | aprender com você | |
| S2L1 | build | to learn Portuguese now | aprender português agora | |
| S2L1 | build | to learn Portuguese with you | aprender português com você | |
| S2L1 | use | I want to learn Portuguese now | quero aprender português agora | |
| S2L1 | use | I want to learn Portuguese with you | quero aprender português com você | |
| S2L1 | use | I want to learn Portuguese with you now | quero aprender português com você agora | |
| S2L2 | build | I'm trying to speak now | estou tentando falar agora | |
| S2L2 | use | I'm trying to speak Portuguese now | estou tentando falar português agora | |
| S2L2 | use | I'm trying to learn Portuguese now | estou tentando aprender português agora | |
| S2L2 | use | I'm trying to learn Portuguese with you | estou tentando aprender português com você | |
| S2L2 | use | I'm trying to speak Portuguese with you now | estou tentando falar português com você agora | |
| S3L1 | build | how to learn Portuguese | como aprender português | |
| S3L1 | build | how to speak with you | como falar com você | |
| S3L1 | use | I'm trying to learn how to speak | estou tentando aprender como falar | |
| S3L1 | use | how to speak Portuguese with you | como falar português com você | |
| S3L1 | use | I want to learn how to speak Portuguese now | quero aprender como falar português agora | |
| S3L2 | build | to learn often | aprender frequentemente | |
| S3L2 | build | to speak Portuguese often | falar português frequentemente | |
| S3L2 | build | how to learn often | como aprender frequentemente | |
| S3L2 | use | I want to speak often | quero falar frequentemente | |
| S3L2 | use | I want to learn often | quero aprender frequentemente | |
| S3L2 | use | I'm trying to learn often | estou tentando aprender frequentemente | |
| S3L2 | use | I want to speak with you often | quero falar com você frequentemente | |
| S3L2 | use | I'm trying to speak Portuguese often | estou tentando falar português frequentemente | |
| S3L3 | build | how to speak as much as possible | como falar o mais possível | |
| S3L3 | build | to speak Portuguese as much as possible | falar português o mais possível | |
| S3L3 | use | I'm trying to speak as much as possible | estou tentando falar o mais possível | |
| S3L3 | use | I want to learn Portuguese as much as possible | quero aprender português o mais possível | |
| S3L3 | use | I want to speak with you as much as possible | quero falar com você o mais possível | |
| S3L3 | use | I want to learn how to speak as much as possible | quero aprender como falar o mais possível | |
| S4L1 | build | to say now | dizer agora | |
| S4L1 | use | I'm trying to say now | estou tentando dizer agora | |
| S4L1 | use | I want to say often | quero dizer frequentemente | |
| S4L2 | build | something now | algo agora | |
| S4L2 | build | to learn something now | aprender algo agora | |
| S4L2 | use | I want to say something now | quero dizer algo agora | |
| S4L2 | use | I'm trying to say something | estou tentando dizer algo | |
| S4L2 | use | I want to say something with you | quero dizer algo com você | |
| S4L3 | build | to speak in Portuguese | falar em português | |
| S4L3 | build | to learn something in Portuguese | aprender algo em português | |
| S4L3 | use | I want to speak in Portuguese | quero falar em português | |
| S4L3 | use | I'm trying to speak in Portuguese | estou tentando falar em português | |
| S4L3 | use | I want to learn something in Portuguese | quero aprender algo em português | |
| S4L3 | use | I want to speak in Portuguese with you | quero falar em português com você | |
| S5L1 | build | I'm going to say | vou dizer | |
| S5L1 | use | I'm going to speak now | vou falar agora | |
| S5L1 | use | I'm going to speak with you | vou falar com você | |
| S5L1 | use | I'm going to say something now | vou dizer algo agora | |
| S5L1 | use | I'm going to learn Portuguese | vou aprender português | |
| S5L1 | use | I'm going to speak in Portuguese | vou falar em português | |
| S5L1 | use | I'm going to learn something | vou aprender algo | |
| S5L2 | build | how to practise speaking | como praticar falando | |
| S5L2 | build | to practise speaking now | praticar falando agora | |
| S5L2 | use | I want to practise speaking now | quero praticar falando agora | |
| S5L2 | use | I want to practise speaking with you | quero praticar falando com você | |
| S5L2 | use | I'm trying to practise speaking | estou tentando praticar falando | |
| S5L2 | use | I'm going to practise speaking as much as possible | vou praticar falando o mais possível | |
| S5L2 | use | I want to practise speaking often | quero praticar falando frequentemente | |
| S5L3 | build | to learn with someone else | aprender com outra pessoa | |
| S5L3 | use | I want to learn Portuguese with someone else | quero aprender português com outra pessoa | |
| S5L3 | use | I'm going to practise speaking with someone else | vou praticar falando com outra pessoa | |
| S5L3 | use | I want to speak Portuguese with someone else | quero falar português com outra pessoa | |
| S5L3 | use | I'm trying to practise speaking with someone else | estou tentando praticar falando com outra pessoa | |
| S6L1 | build | to remember something in Portuguese | me lembrar de algo em português | |
| S6L1 | use | I'm going to remember something | vou me lembrar de algo | |
| S6L1 | use | I want to remember how to speak | quero me lembrar de como falar | |
| S6L1 | use | I want to remember how to say something | quero me lembrar de como dizer algo | |
| S6L1 | use | I'm trying to remember how to say something | estou tentando me lembrar de como dizer algo | |
| S6L1 | use | I want to remember something in Portuguese | quero me lembrar de algo em português | |
| S6L2 | build | to learn a word | aprender uma palavra | |
| S6L2 | build | how to say a word | como dizer uma palavra | |
| S6L2 | build | to remember a word now | me lembrar de uma palavra agora | |
| S6L2 | use | I want to say a word | quero dizer uma palavra | |
| S6L2 | use | I want to learn a word | quero aprender uma palavra | |
| S6L2 | use | I'm going to remember a word | vou me lembrar de uma palavra | |
| S6L2 | use | I'm trying to say a word in Portuguese | estou tentando dizer uma palavra em português | |
| S7L1 | build | to try to learn | tentar aprender | |
| S7L1 | build | to try to say | tentar dizer | |
| S7L1 | build | to try to remember | tentar me lembrar de | |
| S7L1 | use | I'm going to try to speak Portuguese | vou tentar falar português | |
| S7L1 | use | I want to try to learn something | quero tentar aprender algo | |
| S7L1 | use | I want to try to remember a word | quero tentar me lembrar de uma palavra | |
| S7L2 | build | to practise speaking as hard as I can | praticar falando o máximo que puder | |
| S7L2 | use | I want to speak as hard as I can | quero falar o máximo que puder | |
| S7L2 | use | I want to learn as hard as I can | quero aprender o máximo que puder | |
| S7L2 | use | I'm going to speak Portuguese as hard as I can | vou falar português o máximo que puder | |
| S7L2 | use | I'm trying to learn as hard as I can | estou tentando aprender o máximo que puder | |
| S7L3 | build | to say something today | dizer algo hoje | |
| S7L3 | build | to remember a word today | me lembrar de uma palavra hoje | |
| S7L3 | use | I'm going to speak Portuguese today | vou falar português hoje | |
| S7L3 | use | I want to try to speak Portuguese today | quero tentar falar português hoje | |
| S7L3 | use | I'm trying to learn something today | estou tentando aprender algo hoje | |
| S7L3 | use | I want to speak with someone else today | quero falar com outra pessoa hoje | |
| S8L1 | build | how to explain | como explicar | |
| S8L1 | build | to explain something | explicar algo | |
| S8L1 | build | to explain a word | explicar uma palavra | |
| S8L1 | use | I want to explain a word in Portuguese | quero explicar uma palavra em português | |
| S8L1 | use | I'm going to try to explain something today | vou tentar explicar algo hoje | |
| S8L1 | use | I'm trying to explain something in Portuguese | estou tentando explicar algo em português | |
| S8L2 | build | to try to explain what I mean | tentar explicar o que quero dizer | |
| S8L2 | build | how to explain what I mean | como explicar o que quero dizer | |
| S8L2 | use | I want to try to explain what I mean today | quero tentar explicar o que quero dizer hoje | |
| S8L2 | use | I'm going to explain what I mean in Portuguese | vou explicar o que quero dizer em português | |
| S9L1 | build | I speak in Portuguese | falo em português | |
| S9L1 | use | I speak Portuguese with you now | falo português com você agora | |
| S9L1 | use | I speak with you today | falo com você hoje | |
| S9L1 | use | I speak Portuguese as much as possible | falo português o mais possível | |
| S9L1 | use | I speak Portuguese often | falo português frequentemente | |
| S9L1 | use | I speak Portuguese with someone else today | falo português com outra pessoa hoje | |
| S9L2 | build | to speak a little Portuguese | falar um pouco de português | |
| S9L2 | use | I want to speak a little Portuguese | quero falar um pouco de português | |
| S9L2 | use | I'm going to speak a little Portuguese today | vou falar um pouco de português hoje | |
| S9L2 | use | I want to try to speak a little Portuguese | quero tentar falar um pouco de português | |
| S9L2 | use | I speak a little Portuguese with you | falo um pouco de português com você | |
| S10L1 | use | I'm not sure how to speak Portuguese | não tenho certeza de como falar português | |
| S10L1 | use | I'm not sure how to remember a word | não tenho certeza de como me lembrar de uma palavra | |
| S10L1 | use | I'm not sure how to practise speaking | não tenho certeza de como praticar falando | |
| S10L1 | use | I'm not sure how to explain a word in Portuguese | não tenho certeza de como explicar uma palavra em português | |
| S10L1 | use | I'm not sure how to say a word | não tenho certeza de como dizer uma palavra | |
| S10L2 | build | if I can learn | se consigo aprender | |
| S10L2 | build | if I can say | se consigo dizer | |
| S10L2 | build | if I can practise speaking | se consigo praticar falando | |
| S10L2 | use | I'm not sure if I can explain a word | não tenho certeza se consigo explicar uma palavra | |
| S10L2 | use | I'm not sure if I can remember a word | não tenho certeza se consigo me lembrar de uma palavra | |
| S10L2 | use | I'm not sure if I can learn something today | não tenho certeza se consigo aprender algo hoje | |
| S10L3 | build | to try to say the whole sentence | tentar dizer a frase inteira | |
| S10L3 | use | I want to explain the whole sentence | quero explicar a frase inteira | |
| S10L3 | use | I'm trying to say the whole sentence | estou tentando dizer a frase inteira | |
| S10L3 | use | I want to say the whole sentence in Portuguese | quero dizer a frase inteira em português | |
| S10L3 | use | I'm not sure if I can explain the whole sentence | não tenho certeza se consigo explicar a frase inteira | |

**Total proposed: 135**

##### B. Deliberately NOT proposed — por_br_for_eng

**`the whole sentence` = `a frase inteira` — the MIRROR of the por_for_eng problem (S10L3).**
Here there is no contraction, so `dizer` / `explicar` work fine — but `me lembrar de` +
`a frase inteira` would give `me lembrar de a frase inteira`, which must contract to
`da frase inteira`. Rejected: `to remember the whole sentence`,
`I'm not sure if I can remember the whole sentence`, `I'm going to try to remember the whole
sentence`. **The two Portuguese courses each cover the half the other cannot** — see §C.

**`me lembrar de` carries the `de` (S6L1).** Rejected bare `how to remember`, `to remember now`,
`if I can remember` (all leave `de` dangling or force dropping it).

**`um pouco de` carries the `de` (S9L2).** Rejected `to speak a little`, `to say a little`,
`I want to practise a little`. Existing rows `I speak a little` / `to learn a little` already
have the dangling `de` — flagged in §C rather than extended.

**`quero dizer` stutter.** Rejected `to say what I mean` → `dizer o que quero dizer` and
`I want to say what I mean` → `quero dizer o que quero dizer`.

**`often` vs `as much as possible` (S3L2 / S3L3).** por_br has NO `as often as possible` lego —
it has `often` and `as much as possible` separately. I therefore did NOT propose anything using
`as often as possible`, even though the existing course contains two such phrases (§C item 1).

**Bare-noun fragments.** Rejected `Portuguese now`, `Portuguese with you`, `a little` alone.

##### C. Structural findings — por_br_for_eng

1. **Two existing phrases use vocabulary that is never introduced in this course.**
   `S5L2 use "I want to practise speaking as often as possible"` →
   `quero praticar falando o mais frequentemente possível`, and
   `S9L1 use "I speak Portuguese as often as possible"` →
   `falo português o mais frequentemente possível`.
   **`as often as possible` / `o mais frequentemente possível` is NOT a lego in por_br_for_eng**
   (that is the por_for_eng lego). These look copy-pasted across from the European course. This
   is a controlled-language violation on both sides and is **the single most important thing to
   look at in this course.**
2. **`S10L3 the whole sentence` cannot combine with `to remember`** (contraction, see §B). Taken
   together with por_for_eng's opposite constraint, the clean fix for BOTH courses is: define the
   lego as the bare noun phrase (`a frase inteira`) and let the `de`→`da` contraction live on the
   `to remember` combination, exactly as por_for_eng already does inside
   `lembrar-me da frase inteira`. Right now each course silently drops half the combination space.
3. **Same target, two different known prompts (reverse-ZUT) at S10L1:**
   `I'm not sure now` (build) and `I'm not sure right now` (use) BOTH map to
   `não tenho certeza agora`. One of them should go.
4. **`I'm not sure how to explain what I want to say` (S10L1)** uses the known phrase
   `what I want to say`, but the lego is `what I mean` and the target is the same
   `o que quero dizer`. Two known prompts, one target — ZUT clash. Pre-existing.
5. **`I want to learn how to say with you` (S4L1)** is broken English — objectless `say` plus a
   trailing `with you`. Pre-existing; suggest deletion or `…how to say something with you`.
6. **No barren `is_new=true` lego.** S1L01 correctly barren. S1L02=1, S1L03=2 — correct.
7. **Role tagging inconsistent** at S1L05 (`I want to speak now` tagged `build` despite carrying
   the opener) and S2L02 (`I'm trying to speak Portuguese`, `I'm trying to speak with you` tagged
   `build`). Same cosmetic issue as por_for_eng.

---

#### Explicit gaps — things I could NOT verify

1. **Native-speaker sign-off on target text.** Every target above is my own composition from the
   course's own lego surfaces. I verified *internal consistency* (each target is the existing
   lego strings concatenated in natural order) and applied my own grammatical judgement, but
   **no native ita/por/por_br speaker has reviewed these.** The three highest-risk sets, where a
   native check would be most valuable:
   - ita `sto per` (S5L1) — I read it as "I'm about to", which is *narrower* than English
     "I'm going to". If Kai reads it as too narrow, ~15 of my S5L1/S8/S10 rows need rewording.
     **I could not verify the intended sense from the DB alone.**
   - ita `non sono sicuro come …` (missing `di`) — I followed the existing 5 rows rather than
     correcting them. If those are wrong, my 3 additions are wrong the same way.
   - por_br `praticar falando português` (existing S5L2) — I mirrored this pattern; I am not
     confident `praticar falando` takes a direct object cleanly. I avoided creating new rows of
     that exact shape.
2. **I did not check seeds 11+.** A known_text I propose for seeds 1-10 could ZUT-clash with a
   phrase in a later seed. My ZUT check covers **seeds 1-10 only**, per the brief's scope. If
   Kai wants a full-course ZUT check before applying, that is a separate pass.
3. **Audio impact not assessed.** I did not look at `course_audio` and cannot say how many of
   these 414 phrases would need new clips, nor what that costs. No audio pass has been queued.
4. **Position numbers not assigned.** I deliberately left `position` out — the existing rows have
   gaps and non-contiguous positions (e.g. ita S5L1 jumps p9→p11, S7L1 p5→p8), which suggests
   prior deletions. Assigning positions safely needs the write path's own logic, not my guesses.
5. **`lego_count` not computed.** The brief's table format did not ask for it and I did not want
   to guess the counting rule (Finnish's counts imply components are counted, not legos — e.g.
   `to speak Finnish` = 3, not 2). Whoever applies this must derive it, not copy from me.

---

#### zho_for_eng + jpn_for_eng — seeds 1-10 backfill PROPOSAL (read-only)

Baseline: zho 261 rows (247 combos), jpn 201 rows (190 combos) already present in seeds 1-10.
Both courses are already dense — these are gap-fills, not a rebuild.

---

#### zho_for_eng — proposing 68

##### A. Proposed phrases

| Seed/Lego | phrase_role | known_text | target_text | combines |
|---|---|---|---|---|
| S1L5 | build | speak with you now | 现在和你说 | S1L2+L4+L5 |
| S1L5 | build | speak Chinese with you now | 现在和你说中文 | S1L2+L3+L4+L5 |
| S2L1 | build | try now | 现在试试 | S1L5+S2L1 |
| S2L1 | build | try to speak with you | 试试和你说 | S1L2+L4+S2L1 |
| S2L1 | build | try to speak Chinese with you | 试试和你说中文 | S1L2+L3+L4+S2L1 |
| S2L1 | use | I want to try to speak now | 我现在想试试说 | S1L1+L2+L5+S2L1 |
| S2L2 | build | learn Chinese | 学习中文 | S1L3+S2L2 |
| S2L2 | build | learn now | 现在学习 | S1L5+S2L2 |
| S2L2 | build | learn Chinese with you | 和你学习中文 | S1L3+L4+S2L2 |
| S2L2 | use | I want to learn Chinese | 我想学习中文 | S1L1+L3+S2L2 |
| S2L2 | use | I want to learn now | 我现在想学习 | S1L1+L5+S2L2 |
| S2L2 | use | I want to learn Chinese now | 我现在想学习中文 | S1L1+L3+L5+S2L2 |
| S2L2 | use | I want to learn Chinese with you | 我想和你学习中文 | S1L1+L3+L4+S2L2 |
| S2L2 | use | I want to try to learn Chinese | 我想试试学习中文 | S1L1+L3+S2L1+L2 |
| S3L1 | build | how to speak Chinese with you | 怎么和你说中文 | S1L2+L3+L4+S3L1 |
| S3L1 | use | I want to learn how to speak | 我想学习怎么说 | S1L1+L2+S2L2+S3L1 |
| S3L1 | use | I want to learn how to speak Chinese with you | 我想学习怎么和你说中文 | +S1L4 |
| S3L2 | build | speak with you often | 经常和你说 | S1L2+L4+S3L2 |
| S3L2 | build | learn Chinese often | 经常学习中文 | S1L3+S2L2+S3L2 |
| S3L2 | use | I want to learn Chinese often | 我想经常学习中文 | S1L1+L3+S2L2+S3L2 |
| S3L3 | build | learn Chinese as much as possible | 尽可能学习中文 | S1L3+S2L2+S3L3 |
| S3L3 | build | speak with you as often as possible | 尽可能经常和你说 | S1L2+L4+S3L2+L3 |
| S3L3 | use | I want to learn Chinese as much as possible | 我想尽可能学习中文 | S1L1+L3+S2L2+S3L3 |
| S4L2 | build | say something now | 现在说点什么 | S1L2+L5+S4L2 |
| S4L2 | use | I want to try to say something in Chinese | 我想试试用中文说点什么 | S1L1+S2L1+S4L1+L2 |
| S5L1 | use | I'm going to speak Chinese with you | 我要和你说中文 | S1L2+L3+L4+S5L1 |
| S5L1 | use | I'm going to try to speak Chinese | 我要试试说中文 | S1L2+L3+S2L1+S5L1 |
| S5L1 | use | I'm going to speak Chinese as often as possible | 我要尽可能经常说中文 | S1L2+L3+S3L2+L3+S5L1 |
| S5L2 | build | practise Chinese | 练习中文 | S1L3+S5L2 |
| S5L2 | build | practise with you | 和你练习 | S1L4+S5L2 |
| S5L2 | use | I want to practise Chinese | 我想练习中文 | S1L1+L3+S5L2 |
| S5L2 | use | I'm going to practise with you | 我要和你练习 | S1L4+S5L1+L2 |
| S5L3 | build | learn with someone else | 和别人学习 | S2L2+S5L3 |
| S5L3 | build | try to speak with someone else | 试试和别人说 | S1L2+S2L1+S5L3 |
| S5L3 | use | I'm going to speak Chinese with someone else | 我要和别人说中文 | S1L2+L3+S5L1+L3 |
| S5L3 | use | I want to practise Chinese with someone else | 我想和别人练习中文 | S1L1+L3+S5L2+L3 |
| S6L1 | build | try to remember now | 现在试试想起 | S1L5+S2L1+S6L1 |
| S6L1 | use | I want to remember how to speak | 我想想起怎么说 | S1L1+L2+S3L1+S6L1 |
| S6L2 | build | say a word | 说一个词 | S1L2+S6L2 |
| S6L2 | build | practise a word | 练习一个词 | S5L2+S6L2 |
| S6L2 | build | say a word in Chinese | 用中文说一个词 | S1L2+S4L1+S6L2 |
| S6L2 | use | I want to say a word in Chinese | 我想用中文说一个词 | S1L1+L2+S4L1+S6L2 |
| S7L1 | build | say something today | 今天说点什么 | S1L2+S4L2+S7L1 |
| S7L1 | use | I'm going to practise with someone else today | 我今天要和别人练习 | S5L1+L2+L3+S7L1 |
| S7L1 | use | I want to learn a word today | 我今天想学习一个词 | S1L1+S2L2+S6L2+S7L1 |
| S7L2 | use | I'm going to practise hard today | 我今天要努力练习 | S5L1+L2+S7L1+L2 |
| S8L1 | build | explain in Chinese | 用中文解释 | S4L1+S8L1 |
| S8L1 | build | explain a word | 解释一个词 | S6L2+S8L1 |
| S8L1 | use | I want to explain a word | 我想解释一个词 | S1L1+S6L2+S8L1 |
| S8L1 | use | I'm going to explain in Chinese today | 我今天要用中文解释 | S4L1+S5L1+S7L1+S8L1 |
| S8L2 | use | I want to practise my Chinese with you | 我想和你练习我的中文 | S1L1+L3+L4+S5L2+S8L2 |
| S8L2 | use | I'm going to practise my Chinese with someone else | 我要和别人练习我的中文 | S5L1+L2+L3+S8L2 |
| S8L3 | build | explain the meaning in Chinese | 用中文解释意思 | S4L1+S8L1+L3 |
| S8L3 | use | I'm going to explain what I mean today | 我今天要解释我的意思 | S5L1+S7L1+S8L1+L2+L3 |
| S9L1 | build | can practise | 会练习 | S5L2+S9L1 |
| S9L1 | use | I can speak Chinese with you | 我会和你说中文 | S1L2+L3+L4+S9L1 |
| S9L1 | use | I can speak Chinese with someone else | 我会和别人说中文 | S1L2+L3+S5L3+S9L1 |
| S9L2 | build | practise a little | 练习一点 | S5L2+S9L2 |
| S9L2 | use | I can explain a little | 我会解释一点 | S8L1+S9L1+L2 |
| S9L2 | use | I want to practise a little with someone else | 我想和别人练习一点 | S1L1+S5L2+L3+S9L2 |
| S10L1 | build | don't want to practise | 不想练习 | S1L1+S5L2+S10L1 |
| S10L1 | build | can't explain | 不会解释 | S8L1+S9L1+S10L1 |
| S10L1 | use | I can't explain a word | 我不会解释一个词 | S6L2+S8L1+S9L1+S10L1 |
| S10L2 | build | not sure how to practise | 不确定怎么练习 | S3L1+S5L2+S10L1+L2 |
| S10L2 | use | I'm not sure how to say a word in Chinese | 我不确定怎么用中文说一个词 | S3L1+S4L1+S6L2+S10L1+L2 |
| S10L3 | build | whether can practise | 能不能练习 | S5L2+S10L3 |
| S10L3 | use | I'm not sure if I can practise with someone else | 我不确定我能不能和别人练习 | S5L2+L3+S10L1+L2+L3 |
| S10L5 | use | I want to explain the whole sentence in Chinese | 我想用中文解释整个句子 | S1L1+S4L1+S8L1+S10L5 |

##### B. Deliberately NOT proposed — zho

**Would deepen an existing ZUT clash (see structural findings)**
- Anything new with bare "remember": `remember a word` already exists TWICE with different targets
  (S6L2 `想起一个词`, S10L4 `记住一个词`), same for `remember the meaning` (`想起意思` / `记住意思`).
  I added nothing to that space rather than tripling it.

**Unnatural in Chinese**
- `with you now` alone → `现在和你` / `和你现在` is not a phrase in Chinese; the coverative 和你 must
  attach to a verb. (Finnish's `sun kanssa nyt` works; Chinese's doesn't.) Left out — this is why
  S1L5 gets only the two verb-bearing builds above.
- `remember hard` / `努力想起` — 努力 does not modify 想起 naturally.
- `remember a little` / `想起一点` — reads as "recall a bit of it", not a usable practice phrase.
- `learn to speak with you` / `和你学习说` — stacked verbs, unnatural.
- `speak in Chinese with you` / `和你用中文说` — grammatical but redundant beside the existing
  `speak Chinese with you`; a learner can't hear the difference in English either.
- `learn something in Chinese` / `用中文学习点什么` — odd; 学习 wants a real object.
- `can remember a word` — 会想起 reads as future "will recall", not ability. The existing
  `can remember`/`会想起` row already has this problem; I did not extend it.

**Vocabulary not yet introduced at that point**
- `I want to practise today` etc. below S7 — 今天 is S7L1, so nothing before S7 uses it.
- `I'm going to …` before S5 — 我要 is S5L1.
- Any negation before S10 — 不 is S10L1.

**Would require reordering the known side**
- `Chinese now with you`, `now I want to speak` — variants of existing phrases obtainable only by
  shuffling English. Not proposed.

**S8L2 `my` is intrinsically thin.** With the inventory available at S8, 我的 only attaches naturally
to 中文 and 意思. `my word` / `我的词`, `my sentence` are not phrases a learner would say. Two `use`
rows above is the honest ceiling — do not read the sparseness there as a gap.

---

#### jpn_for_eng — proposing 40

S1L01 (`want to speak` / `話したい`) is correctly barren of combinations — confirmed, not touched.

##### A. Proposed phrases

| Seed/Lego | phrase_role | known_text | target_text | combines |
|---|---|---|---|---|
| S2L1 | use | I'll do Japanese together now | 今、一緒に日本語をやる | S1L2+L3+L4+S2L1 |
| S2L2 | use | I'm trying together now | 今、一緒にやってみてる | S1L3+L4+S2L2 |
| S3L1 | build | speak Japanese a lot | 日本語をたくさん話す | S1L2+S3L1 |
| S3L1 | use | I want to speak Japanese a lot | 日本語をたくさん話したい | S1L1+L2+S3L1 |
| S3L1 | use | I want to speak a lot together | 一緒にたくさん話したい | S1L1+L3+S3L1 |
| S3L1 | use | I want to speak a lot now | 今、たくさん話したい | S1L1+L4+S3L1 |
| S3L2 | build | speak Japanese as much as possible | できるだけ日本語を話す | S1L2+S3L2 |
| S3L2 | use | I want to speak Japanese as much as possible | できるだけ日本語を話したい | S1L1+L2+S3L2 |
| S3L2 | use | I want to speak together as much as possible | できるだけ一緒に話したい | S1L1+L3+S3L2 |
| S4L2 | build | do something now | 今、何かやる | S1L4+S2L1+S4L2 |
| S4L2 | use | I want to try saying something now | 今、何か言ってみたい | S1L4+S4L1+L2 |
| S4L3 | build | speak in Japanese | 日本語で話す | S1L1+S4L3 |
| S4L3 | use | I want to speak in Japanese | 日本語で話したい | S1L1+S4L3 |
| S4L3 | use | I want to try saying something in Japanese now | 今、日本語で何か言ってみたい | S1L4+S4L1+L2+L3 |
| S5L1 | build | will try speaking as much as possible | できるだけ話してみる | S3L2+S5L1 |
| S5L1 | use | I'll try speaking Japanese together | 一緒に日本語を話してみる | S1L2+L3+S5L1 |
| S5L2 | build | speak with other people | 他の人とも話す | S1L1+S5L2 |
| S5L2 | use | I want to speak with other people | 他の人とも話したい | S1L1+S5L2 |
| S5L3 | use | I want to speak Japanese later | あとで日本語を話したい | S1L1+L2+S5L3 |
| S6L1 | use | I want to try saying a word now | 今、言葉を言ってみたい | S1L4+S4L1+S6L1 |
| S6L2 | use | I'm trying to remember a word | 言葉を思い出そうとしてる | S6L1+L2 |
| S7L1 | build | will try doing together | 一緒にやってみる | S1L3+S7L1 |
| S7L1 | use | I'll try doing it with other people | 他の人ともやってみる | S5L2+S7L1 |
| S7L1 | use | I'll try doing it later | あとでやってみる | S5L3+S7L1 |
| S7L2 | use | I'll try doing a lot today | 今日はたくさんやってみる | S3L1+S7L1+L2 |
| S7L2 | use | I'll try speaking with other people today | 今日は他の人とも話してみる | S5L1+L2+S7L2 |
| S8L1 | build | will try explaining together | 一緒に説明してみる | S1L3+S8L1 |
| S8L1 | use | I'll try explaining it today | 今日は説明してみる | S7L2+S8L1 |
| S8L2 | use | I'll try explaining what I want to say today | 今日は言いたいことを説明してみる | S7L2+S8L1+L2 |
| S8L2 | use | I want to try saying what I want to say in Japanese | 日本語で言いたいことを言ってみたい | S4L1+L3+S8L2 |
| S9L1 | use | I can speak Japanese together | 一緒に日本語を話せる | S1L2+L3+S9L1 |
| S9L1 | use | I can speak Japanese today | 今日は日本語を話せる | S1L2+S7L2+S9L1 |
| S9L2 | build | speak a little | 少し話す | S1L1+S9L2 |
| S9L2 | use | I want to try saying a little | 少し言ってみたい | S4L1+S9L2 |
| S9L2 | use | I'll try doing a little | 少しやってみる | S7L1+S9L2 |
| S10L2 | use | I want to try saying all of it in Japanese | 日本語で全部言ってみたい | S4L1+L3+S10L2 |
| S10L2 | use | I'm trying to remember all of it | 全部思い出そうとしてる | S6L2+S10L2 |
| S10L3 | use | I'll try explaining the sentence in Japanese | 日本語で文を説明してみる | S4L3+S8L1+S10L3 |
| S10L3 | use | I want to try saying a sentence today | 今日は文を言ってみたい | S4L1+S7L2+S10L3 |
| S10L4 | use | I don't know if I can remember what I want to say | 言いたいことを覚えられるか分からない | S8L2+S10L1+L4 |

##### B. Deliberately NOT proposed — jpn

**Particle collision — the biggest structural constraint in this course.**
`a word` = `言葉を` and `what I want to say` = `言いたいことを` carry the accusative を *inside the
lego*. `don't know` = `分からない` takes が/は, never を. So `I don't know the word`, `I don't know
what I want to say` are unbuildable without editing the lego text — and editing it is out of scope
for a backfill. That is why S10L1 stays at 4 combinations. **Not a coverage gap; a lego-design
consequence.** Kai may want to decide this deliberately.

**Double-topic は — unnatural**
- `as for Japanese, I can speak a little today` → `今日は日本語は少し話せる`. Two は topics in one
  clause is not natural Japanese. Rejected outright. Same reason for
  `as for Japanese, I'll try later` → `あとで日本語は話してみる` (the topic wants clause-initial
  position, which would mean reordering).
- ⚠️ The **existing** row S9L3 `as for Japanese, I'll try today` / `今日は日本語はやってみる` already
  has this fault. Flagged below, not extended.

**Word order won't yield a natural Japanese sentence from the English combination**
- `speak Japanese with you`-style phrases: this course has no "with you" lego — `一緒に` (together)
  and `他の人とも` (with other people) are the only comitatives. No English "with you" combination
  was manufactured.
- `remember a lot of words` / `言葉をたくさん思い出そうとしてる` — grammatical but nobody says it.
- `I'll do it a little later` — English idiom, not a combination of `a little` + `later`. Skipped
  precisely because it *reads* like a valid combination and isn't one.

**Vocabulary not yet introduced**
- `today` (S7L2) not used before S7; `can speak` (S9L1) not before S9; negation `分からない` (S10L1)
  not before S10.

**Would require reordering the known side**
- `now I want to speak Japanese`, `Japanese, I want to speak` — English shuffles of existing rows.

---

#### Structural findings

##### zho_for_eng
1. **Real ZUT clash — same known_text, two different targets (existing rows, not mine):**
   - `remember a word` → `想起一个词` (S6L2) **and** `记住一个词` (S10L4)
   - `remember the meaning` → `想起意思` (S8L3) **and** `记住意思` (S10L4)
   This is the single most important thing to look at. S6L1's lego is `to remember`/`想起`;
   S10L4's is `remember the whole sentence`/`记住整个句子`. The S10L4 practice rows generalise
   记住 back over objects already owned by 想起. Needs a decision, not a backfill.
2. **Known-side vocabulary that was never introduced as a lego** (existing rows): `study`
   (`study often`, `study hard`, `study today` — the lego is `to learn`), `she`
   (`she doesn't want to study today` S7L1, `she wants to practise hard` S7L2, `she can speak a
   little Chinese` S9L2), `you` as a subject (`you want to learn…`, `you study often`), `anyone
   else`, `it`, `things`. Several of these also use negation (`不`) hundreds of phrases before
   S10L1 introduces it. I proposed nothing in that space.
3. `lego_count` is unreliable: many rows carry `c1` (e.g. S3L1 `you want to learn how to speak
   Chinese`, S10L1's last four) while clearly being multi-lego combinations. Whatever populates
   `lego_count` skipped a batch. Doesn't affect the learner, does affect any audit that filters on
   `lego_count>1`.
4. No `is_new=false` legos in seeds 1-10 — all 29 are new, so rule 3 never fires here.
5. Every `is_new=true` lego S1L2–S10L5 has ≥2 combinations. No barren legos other than the
   correct S1L1. No seed looks truncated.

##### jpn_for_eng
1. **Build and use rows are frequently byte-identical in the target**, because Japanese drops the
   subject: S1L2 `want to speak Japanese` and `I want to speak Japanese` are both `日本語を話したい`;
   same at S1L3, S2L2, S4L1, S5L1, S6L2, S9L1, S9L3. This is *correct Japanese* but it means any
   duplicate-detector will report them and any audio pass will generate the same clip twice. Worth
   a deliberate decision rather than a silent dedupe.
2. **English↔Japanese mismatches in existing rows** (not mine, worth a fix pass):
   - `I want to do a lot of Japanese` → `日本語をたくさんやる` (target is "will do", no たい)
   - `I want to do as much as possible` → `できるだけやる` (same, missing たい)
   - `I want to do Japanese as much as possible` → `できるだけ日本語をやる` (same)
   - `I want to do it with other people too` → `他の人ともやる` (same)
   - `I'll try to remember later` → `あとで思い出そうとしてる` (progressive, not future)
   - `try in Japanese` → `日本語でやってみてる` (target is "am trying")
   - `I'll try speaking Japanese today` → `今日は日本語で話してみる` (で vs を: known says
     "speak Japanese", target says "in Japanese")
   - `say something in Japanese` (S4L3 **build**) → `日本語で何か言ってみたい` (target carries
     "want to try", known doesn't)
   - `as for Japanese, I'll try today` → `今日は日本語はやってみる` (double は, see section B)
3. No `is_new=false` legos in seeds 1-10 — all 27 are new.
4. Every lego except S1L1 has ≥3 combinations. S1L1 barren and correct. No truncated seeds.

#### Explicit gaps
- **Not verified: whether any of my proposed `known_text` values collide with phrases in seeds
  11+.** The brief scoped me to seeds 1-10 and I queried only that range, so a ZUT clash against a
  later seed is possible and unchecked. Cheap to check before applying:
  `select known_text,target_text from course_practice_phrases where course_code='X' and known_text in (…)`.
- **Not verified: `position` values for the proposed rows.** I did not assign them; existing
  positions are dense per (seed, lego) and whatever applies these will need to renumber.
- **My Japanese naturalness judgements are model judgements, not a native-speaker sign-off.** The
  ones I am least confident about are `できるだけ日本語を話す` vs `日本語をできるだけ話す` (both
  occur; I chose adverb-first to match the existing `できるだけ話す` rows) and the acceptability of
  `今日は` + `他の人とも` in one clause (S7L2). Flagging rather than asserting.
- **I did not check `course_audio`** — so I cannot say whether any existing seeds 1-10 phrase is
  missing audio, or what the audio cost of these 108 proposals would be.
- Existing-row faults listed above are **reported only**. I changed nothing, wrote nothing to the
  DB, ran no TTS, queued no audio pass, made no commits.

---

#### kor_for_eng — seeds 1–10 backfill PROPOSAL (read-only, nothing applied)

**100 proposed phrases.** Current: 153 combination phrases (lego_count>1). After: ~253.
Checked machine-side against all 190 existing seed 1–10 rows: **0 exact duplicates, 0 ZUT clashes**
(no proposed known_text exists anywhere in seeds 1–10; no proposed target_text either).

##### Read this first — why Korean cannot reach Finnish's 347

Finnish gets roughly half its 347 from **subject-less `build` variants**: `puhua suomea` ("to speak
Finnish") and `mä haluun puhua suomea` ("I want to speak Finnish") are two different target strings,
so both are phrases. **Korean drops the subject anyway.** `한국어로 말하고 싶어요` IS both "to speak
Korean" and "I want to speak Korean" — there is no second string to author. Every Finnish
build/use pair collapses to one row in Korean.

So the honest ceiling here is well under Finnish's, and the gap is not 194 phrases of missing work.
The real room — which is what the 100 below are — is **adverbial × object × verb combinations that
were simply never enumerated**, especially stacked adverbials (`지금 같이 한국어로 …`) and the
older verbs re-crossed with later objects.

##### A. Proposed phrases

| Seed/Lego | phrase_role | known_text | target_text | combines |
|---|---|---|---|---|
| S2L01 | use | let's do it in Korean together now | 지금 같이 한국어로 해요 | L1.2+L1.3+L1.4+L2.1 |
| S2L02 | use | I'm trying to learn in Korean together | 같이 한국어로 배우려고 해요 | L1.3+L1.4+L2.2 |
| S2L02 | use | I'm trying to learn in Korean together now | 지금 같이 한국어로 배우려고 해요 | L1.2+L1.3+L1.4+L2.2 |
| S3L01 | use | I'm trying to learn in Korean often | 한국어로 자주 배우려고 해요 | L1.4+L2.2+L3.1 |
| S3L01 | use | I want to speak together often | 같이 자주 말하고 싶어요 | L1.1+L1.3+L3.1 |
| S3L01 | use | I'm trying to learn together often | 같이 자주 배우려고 해요 | L1.3+L2.2+L3.1 |
| S3L02 | use | I want to speak Korean as often as possible | 한국어로 가능한 한 자주 말하고 싶어요 | L1.1+L1.4+L3.2 |
| S3L02 | use | I'm trying to learn in Korean as often as possible | 한국어로 가능한 한 자주 배우려고 해요 | L1.4+L2.2+L3.2 |
| S3L02 | use | I want to speak together as often as possible | 같이 가능한 한 자주 말하고 싶어요 | L1.1+L1.3+L3.2 |
| S3L02 | use | I'm trying to learn together as often as possible | 같이 가능한 한 자주 배우려고 해요 | L1.3+L2.2+L3.2 |
| S3L03 | use | I'm trying to learn how to speak Korean together | 같이 한국어로 말하는 방법 배우려고 해요 | L1.3+L1.4+L2.2+L3.3 |
| S4L01 | build | I do something often | 자주 뭔가를 해요 | L2.1+L3.1+L4.1 |
| S4L01 | use | I'm trying to learn something in Korean | 한국어로 뭔가를 배우려고 해요 | L1.4+L2.2+L4.1 |
| S4L01 | use | I'm trying to learn something now | 지금 뭔가를 배우려고 해요 | L1.2+L2.2+L4.1 |
| S4L01 | use | I'm trying to learn something together | 같이 뭔가를 배우려고 해요 | L1.3+L2.2+L4.1 |
| S4L01 | use | I'm trying to learn something as often as possible | 가능한 한 자주 뭔가를 배우려고 해요 | L2.2+L3.2+L4.1 |
| S4L01 | use | let's do something in Korean together | 같이 한국어로 뭔가를 해요 | L1.3+L1.4+L2.1+L4.1 |
| S5L01 | build | I'm going to do it in Korean | 한국어로 할 거예요 | L1.4+L5.1 |
| S5L01 | build | I'm going to do it often | 자주 할 거예요 | L3.1+L5.1 |
| S5L01 | use | I'm going to do something as often as possible | 가능한 한 자주 뭔가를 할 거예요 | L3.2+L4.1+L5.1 |
| S5L01 | use | we're going to do something together now | 지금 같이 뭔가를 할 거예요 | L1.2+L1.3+L4.1+L5.1 |
| S5L02 | build | I do something with someone else | 다른 사람과 뭔가를 해요 | L2.1+L4.1+L5.2 |
| S5L02 | use | I want to speak Korean with someone else | 다른 사람과 한국어로 말하고 싶어요 | L1.1+L1.4+L5.2 |
| S5L02 | use | I want to speak with someone else often | 다른 사람과 자주 말하고 싶어요 | L1.1+L3.1+L5.2 |
| S5L02 | use | I want to speak with someone else as often as possible | 다른 사람과 가능한 한 자주 말하고 싶어요 | L1.1+L3.2+L5.2 |
| S5L02 | use | I'm trying to learn in Korean with someone else | 다른 사람과 한국어로 배우려고 해요 | L1.4+L2.2+L5.2 |
| S5L02 | use | I'm trying to learn how to speak with someone else | 다른 사람과 말하는 방법 배우려고 해요 | L2.2+L3.3+L5.2 |
| S5L03 | build | I'm practicing speaking now | 지금 말하는 연습을 해요 | L1.2+L2.1+L5.3 |
| S5L03 | build | let's practice speaking together | 같이 말하는 연습을 해요 | L1.3+L2.1+L5.3 |
| S5L03 | build | I practice speaking in Korean | 한국어로 말하는 연습을 해요 | L1.4+L2.1+L5.3 |
| S5L03 | use | I practice speaking often | 자주 말하는 연습을 해요 | L2.1+L3.1+L5.3 |
| S5L03 | use | I practice speaking as often as possible | 가능한 한 자주 말하는 연습을 해요 | L2.1+L3.2+L5.3 |
| S5L03 | use | I'm going to practice speaking Korean with someone else | 다른 사람과 한국어로 말하는 연습을 할 거예요 | L1.4+L5.1+L5.2+L5.3 |
| S6L01 | use | I'm trying to learn a word in Korean | 한국어로 단어 하나를 배우려고 해요 | L1.4+L2.2+L6.1 |
| S6L01 | use | I'm trying to learn a word now | 지금 단어 하나를 배우려고 해요 | L1.2+L2.2+L6.1 |
| S6L01 | use | I'm trying to learn a word together | 같이 단어 하나를 배우려고 해요 | L1.3+L2.2+L6.1 |
| S6L02 | use | I'm trying to remember how to speak | 말하는 방법 기억하려고 해요 | L3.3+L6.2 |
| S6L02 | use | I'm trying to remember a word now | 지금 단어 하나를 기억하려고 해요 | L1.2+L6.1+L6.2 |
| S6L02 | use | I'm trying to remember something in Korean | 한국어로 뭔가를 기억하려고 해요 | L1.4+L4.1+L6.2 |
| S6L02 | use | I'm trying to remember something now | 지금 뭔가를 기억하려고 해요 | L1.2+L4.1+L6.2 |
| S7L01 | build | I want to speak today | 오늘 말하고 싶어요 | L1.1+L7.1 |
| S7L01 | build | I'm doing it today | 오늘 해요 | L2.1+L7.1 |
| S7L01 | build | I'm going to do it today | 오늘 할 거예요 | L5.1+L7.1 |
| S7L01 | use | I want to speak together today | 오늘 같이 말하고 싶어요 | L1.1+L1.3+L7.1 |
| S7L01 | use | I want to speak with someone else today | 오늘 다른 사람과 말하고 싶어요 | L1.1+L5.2+L7.1 |
| S7L01 | use | I'm trying to learn how to speak today | 오늘 말하는 방법 배우려고 해요 | L2.2+L3.3+L7.1 |
| S7L01 | use | I'm going to practice speaking Korean today | 오늘 한국어로 말하는 연습을 할 거예요 | L1.4+L5.1+L5.3+L7.1 |
| S7L02 | build | I'm going to work hard | 열심히 할 거예요 | L5.1+L7.2 |
| S7L02 | use | I'm trying to learn hard today | 오늘 열심히 배우려고 해요 | L2.2+L7.1+L7.2 |
| S7L02 | use | I'm trying to learn hard in Korean | 한국어로 열심히 배우려고 해요 | L1.4+L2.2+L7.2 |
| S7L02 | use | I'm going to practice speaking hard | 열심히 말하는 연습을 할 거예요 | L5.1+L5.3+L7.2 |
| S7L02 | use | I'm trying to learn hard with someone else | 다른 사람과 열심히 배우려고 해요 | L2.2+L5.2+L7.2 |
| S7L02 | use | I'm trying hard to remember | 열심히 기억하려고 해요 | L6.2+L7.2 |
| S7L03 | build | I work as hard as I can | 최대한 열심히 해요 | L2.1+L7.3 |
| S7L03 | build | I'm going to work as hard as I can | 최대한 열심히 할 거예요 | L5.1+L7.3 |
| S7L03 | use | I'm trying to learn as hard as I can today | 오늘 최대한 열심히 배우려고 해요 | L2.2+L7.1+L7.3 |
| S7L03 | use | I'm trying to remember as hard as I can | 최대한 열심히 기억하려고 해요 | L6.2+L7.3 |
| S7L03 | use | I'm going to practice speaking Korean as hard as I can | 한국어로 최대한 열심히 말하는 연습을 할 거예요 | L1.4+L5.1+L5.3+L7.3 |
| S7L04 | build | I want to try now | 지금 해 보고 싶어요 | L1.2+L7.4 |
| S7L04 | build | I want to try today | 오늘 해 보고 싶어요 | L7.1+L7.4 |
| S7L04 | build | I want to try together | 같이 해 보고 싶어요 | L1.3+L7.4 |
| S7L04 | use | I want to try saying a word | 단어 하나를 말해 보고 싶어요 | L6.1+L7.4 |
| S7L04 | use | I want to try speaking Korean now | 지금 한국어로 말해 보고 싶어요 | L1.2+L1.4+L7.4 |
| S7L04 | use | I want to try doing something today | 오늘 뭔가를 해 보고 싶어요 | L4.1+L7.1+L7.4 |
| S7L04 | use | I want to try speaking Korean with someone else | 다른 사람과 한국어로 말해 보고 싶어요 | L1.4+L5.2+L7.4 |
| S8L01 | use | I'm trying to remember what it means now | 지금 무슨 뜻인지 기억하려고 해요 | L1.2+L6.2+L8.1 |
| S8L01 | use | I'm trying to learn what it means with someone else | 다른 사람과 무슨 뜻인지 배우려고 해요 | L2.2+L5.2+L8.1 |
| S8L02 | build | I'm going to try to explain now | 지금 설명해 볼 거예요 | L1.2+L8.2 |
| S8L02 | build | I'm going to try to explain in Korean | 한국어로 설명해 볼 거예요 | L1.4+L8.2 |
| S8L02 | use | I'm going to try to explain a word | 단어 하나를 설명해 볼 거예요 | L6.1+L8.2 |
| S8L02 | use | I'm going to try to explain something today | 오늘 뭔가를 설명해 볼 거예요 | L4.1+L7.1+L8.2 |
| S9L01 | build | let's speak together | 같이 말해요 | L1.3+L9.1 |
| S9L01 | build | I speak with someone else | 다른 사람과 말해요 | L5.2+L9.1 |
| S9L01 | use | I speak as often as possible | 가능한 한 자주 말해요 | L3.2+L9.1 |
| S9L01 | use | I'm speaking Korean today | 오늘 한국어로 말해요 | L1.4+L7.1+L9.1 |
| S9L02 | build | I want to speak a little | 조금 말하고 싶어요 | L1.1+L9.2 |
| S9L02 | build | I want to try a little | 조금 해 보고 싶어요 | L7.4+L9.2 |
| S9L02 | use | I speak a little now | 지금 조금 말해요 | L1.2+L9.1+L9.2 |
| S9L02 | use | I'm trying to learn a little in Korean | 한국어로 조금 배우려고 해요 | L1.4+L2.2+L9.2 |
| S9L02 | use | I'm trying to remember a little | 조금 기억하려고 해요 | L6.2+L9.2 |
| S9L02 | use | I'm going to practice speaking a little today | 오늘 조금 말하는 연습을 할 거예요 | L5.1+L5.3+L7.1+L9.2 |
| S9L03 | use | I'm trying to learn the Korean language today | 오늘 한국어를 배우려고 해요 | L2.2+L7.1+L9.3 |
| S9L03 | use | I'm trying to learn the Korean language with someone else | 다른 사람과 한국어를 배우려고 해요 | L2.2+L5.2+L9.3 |
| S9L03 | use | I want to try speaking the Korean language | 한국어를 말해 보고 싶어요 | L7.4+L9.3 |
| S9L03 | use | I'm trying to learn the Korean language as often as possible | 가능한 한 자주 한국어를 배우려고 해요 | L2.2+L3.2+L9.3 |
| S9L03 | use | I'm trying to learn the Korean language as hard as I can | 최대한 열심히 한국어를 배우려고 해요 | L2.2+L7.3+L9.3 |
| S9L03 | use | I speak the Korean language a little | 한국어를 조금 말해요 | L9.1+L9.2+L9.3 |
| S10L01 | use | I want to try speaking the whole sentence now | 지금 문장 전체를 말해 보고 싶어요 | L1.2+L7.4+L10.1 |
| S10L01 | use | I'm trying to remember the whole sentence today | 오늘 문장 전체를 기억하려고 해요 | L6.2+L7.1+L10.1 |
| S10L01 | use | I want to try speaking the whole sentence in Korean | 한국어로 문장 전체를 말해 보고 싶어요 | L1.4+L7.4+L10.1 |
| S10L01 | use | I'm trying to remember the whole sentence as hard as I can | 최대한 열심히 문장 전체를 기억하려고 해요 | L6.2+L7.3+L10.1 |
| S10L02 | build | I remember what it means | 무슨 뜻인지 기억해요 | L8.1+L10.2 |
| S10L02 | build | I remember the whole sentence | 문장 전체를 기억해요 | L10.1+L10.2 |
| S10L02 | use | I'm going to remember a word today | 오늘 단어 하나를 기억할 거예요 | L5.1+L6.1+L7.1+L10.2 |
| S10L03 | build | I'm not sure if I can do it now | 지금 할 수 있을지 모르겠어요 | L1.2+L10.3 |
| S10L03 | use | I'm not sure if I can remember a word | 단어 하나를 기억할 수 있을지 모르겠어요 | L6.1+L10.2+L10.3 |
| S10L03 | use | I'm not sure if I can remember the whole sentence today | 오늘 문장 전체를 기억할 수 있을지 모르겠어요 | L7.1+L10.1+L10.3 |
| S10L03 | use | I'm not sure if I can speak Korean with someone else | 다른 사람과 한국어로 말할 수 있을지 모르겠어요 | L1.4+L5.2+L10.3 |
| S10L03 | use | I'm not sure if I can learn the Korean language | 한국어를 배울 수 있을지 모르겠어요 | L2.2+L9.3+L10.3 |
| S10L03 | use | I'm not sure if I can practice speaking today | 오늘 말하는 연습을 할 수 있을지 모르겠어요 | L5.3+L7.1+L10.3 |
Ordering convention followed throughout (derived from the existing corpus, not invented):
`오늘 → 지금 → 다른 사람과 → 같이 → 한국어로 → 자주 / 가능한 한 자주 → 열심히 / 최대한 열심히 → 조금 → OBJECT → VERB`.

`build` = 2-element combos (one adverbial or object + verb); `use` = 3+. Matches how the existing
rows are split.

##### B. Deliberately NOT proposed — and why

###### Would produce no natural Korean sentence
- **Bare adverb pairs as standalone builds** — "together now" `지금 같이`, "Korean now" `지금 한국어로`,
  "hard today" `오늘 열심히` (without a verb). Finnish can do this (`suomea nyt`) because its
  fragments are still utterances; two stacked Korean adverbs with no predicate are not. *Note: the
  existing S7L01 p1 `오늘 같이` ("today together") is exactly this shape and reads as an artefact —
  I did not add more of them, and Kai may want to look at that one.*
- **"do a word"** `단어 하나를 할 거예요` — 하다 does not take 단어 as an object. Nonsense.
- **"explain to someone else"** `다른 사람과 설명해 볼 거예요` — 과 is comitative ("with"), not a
  dative addressee. "I'm going to try to explain *with* someone else" is not the intended meaning.
- **"I speak today"** `오늘 말해요` — bare habitual 말해요 with a time adverb and no object reads as
  incomplete. Proposed `오늘 한국어로 말해요` instead, which is fine.
- **"I remember the Korean language"** `한국어를 기억해요` — 기억하다 takes discrete items, not a
  whole language. `한국어를 배우다/말하다` are fine; 기억하다 is not.
- **"speak hard"** `열심히 말해요` — 열심히 modifies effortful activity (learning, practising,
  working), not the bare act of speaking.

###### Double object-particle collision
- **"practise speaking the whole sentence"** `문장 전체를 말하는 연습을 …` — two `를`-marked NPs in
  one clause. Grammatically arguable, phonetically clumsy, and not a *simple* combination. Left out.
  Same reason for "practise speaking a word / something" with 말하는 연습을.

###### Scope-ambiguous — the adverb could attach to either verb
- **"I'm trying to learn how to speak often"** `자주 말하는 방법 배우려고 해요` — 자주 can read as
  modifying 말하는 (speak often) or 배우려고 (learn often). Two readings = not ZUT-safe.
- **"I'm trying to remember what it means as hard as I can"** — placing 최대한 열심히 relative to
  무슨 뜻인지 changes which clause it scopes over. Left out rather than guessed.

###### Semantically odd rather than ungrammatical
- **"I learn a word often"** `자주 단어 하나를 배우려고 해요` — "a word" is singular-specific; pairing
  it with a frequency adverb is strange.
- **"now" + "often"** in any combination (`지금 자주`) — contradictory.
- **"I'm trying to remember with someone else"** `다른 사람과 기억하려고 해요` — remembering is not a
  joint activity in the way 배우다/연습하다 are.

###### Would require reordering the known side
- Nothing was manufactured by reordering English. Every known_text above is a straight
  left-to-right concatenation of material the learner already has.

##### Structural findings

1. **No `is_new=true` lego in seeds 1–10 has zero combination phrases.** The only zeroes are
   S4L02 `Korean` and S4L03 `how to speak`, both `is_new=false` re-introductions — correct, and
   I proposed nothing for them. S1L01/S1L02/S1L03 are thin (1, 1, 2) but that is the correct
   early-course shape.
2. **Exact duplicate in the existing data:** `I'm trying to remember something` / `뭔가를 기억하려고
   해요` appears twice — S6L02 p7 and S10L02 p5, identical known *and* target. One is redundant.
   Read-only job, so I have not touched it.
3. **S1L04 p8 looks wrong.** known `right now I want to speak Korean together` → `한국어로 지금 같이
   말하고 싶어요`. It introduces "right now" (not a lego, and it collides conceptually with `now`),
   and its target order puts 한국어로 before 지금, contradicting every other row in the course. This
   is the single thing I'd most want Kai to look at.
4. **The course coins verb forms that are not legos.** `하고 싶어요` (S7L02 p3), `배우고 싶어요`
   (S8L01 p7), `연습할 거예요` (S9L03 p4), `기억하고 싶어요` (S10L02 p3), `기억할 거예요` (S10L02 p6).
   These are 어간 + a different auxiliary than the lego supplies — defensible as Korean, but they are
   morphological derivations, not lego concatenations. I followed the established pattern only where
   it was already used for that exact stem (e.g. `기억할 거예요`), and otherwise stayed on plain lego
   combinations. **Kai should decide whether this is sanctioned or drift** — it changes how many
   phrases are legitimately available.
5. **Adverb-order inconsistency in existing rows.** `자주 같이 해요` (S3L01 p3) and `뭔가를 자주 할
   거예요` (S5L01 p9) put adverbs in the opposite order from the rest of the corpus (`같이 자주 …`,
   `자주 뭔가를 …`). Not wrong, but my proposals follow the majority order, so these two will look
   like outliers next to them.

##### Explicit gaps

- **I did not verify audio coverage.** Every phrase here is text-only and would need an audio pass;
  I did not queue one and did not check what `course_audio` holds.
- **I am not a native Korean speaker and had no native reviewer.** The order convention in section A
  is *derived from the existing 153 rows*, not from an external grammar authority. Where the existing
  corpus is internally inconsistent (finding 5), I picked the majority and said so — but a native
  check on the ~15 four-element stacked-adverbial rows (S2L01, S2L02, S5L03, S7L01, S7L03, S10L02) is
  the thing most likely to change my answer.
- **I did not check seeds 11+.** A known_text I propose here could clash with one introduced later;
  the brief scoped me to 1–10 and I stayed there. Worth a cross-check before applying.
- **`position` values are not proposed.** I did not attempt to assign positions — the existing
  numbering has gaps (component rows occupy p1/p2) and I could not confirm the insertion rule.

---

#### Arabic — ara_for_eng (MSA) · ara_eg_for_eng (Egyptian) · ara_lb_for_eng (Levantine)

Existing combos (lego_count>1), seeds 1-10: **ara 180 · ara_eg 186 · ara_lb 195** vs fin_for_eng **347**.
Proposing: **ara +120 · ara_eg +127 · ara_lb +124** → would land at **300 · 313 · 319**.

Every proposed row was machine-checked against the DB: no known_text collides with an existing
known_text in seeds 1-10 (ZUT), no target_text duplicates an existing target, and no row duplicates
another proposal. Normalisation used `/[^\p{L}\p{N}\s']/gu` — Arabic diacritics are `\p{Mn}`, so this
compares consonantal skeletons and catches vowel-only near-collisions too (three were caught and
dropped; see the rejection sections).

Shape followed = fin_for_eng: `build` = partial combination containing the new lego (no opener, or a
short opener+verb stub); `use` = the fuller sentence with the opener. No `component` rows proposed.

> Rendering note: Arabic below is RTL; in a left-to-right markdown table the cell may *display* with
> punctuation at the visual left. The stored string order is correct as written.

---

#### 1. ara_for_eng (MSA)

##### A. Proposed phrases

| Seed/Lego | phrase_role | known_text | target_text | combines |
|---|---|---|---|---|
| S1L4 | build | Arabic now | العَرَبِيَّةَ الآن | L2+L4 |
| S1L4 | build | Arabic with you now | العَرَبِيَّةَ مَعَكَ الآن | L2+L3+L4 |
| S2L1 | build | to learn Arabic | أَتَعَلَّمَ العَرَبِيَّةَ | S2L1+S1L2 |
| S2L1 | build | to learn with you | أَتَعَلَّمَ مَعَكَ | S2L1+S1L3 |
| S2L1 | build | to learn now | أَتَعَلَّمَ الآن | S2L1+S1L4 |
| S2L1 | build | to learn Arabic now | أَتَعَلَّمَ العَرَبِيَّةَ الآن | S2L1+S1L2+S1L4 |
| S2L1 | build | to learn Arabic with you | أَتَعَلَّمَ العَرَبِيَّةَ مَعَكَ | S2L1+S1L2+S1L3 |
| S2L1 | use | I want to learn now | أُريدُ أَنْ أَتَعَلَّمَ الآن | S1L1+S2L1+S1L4 |
| S2L1 | use | I want to learn with you now | أُريدُ أَنْ أَتَعَلَّمَ مَعَكَ الآن | S1L1+S2L1+S1L3+S1L4 |
| S2L1 | use | I want to learn Arabic with you now | أُريدُ أَنْ أَتَعَلَّمَ العَرَبِيَّةَ مَعَكَ الآن | S1L1+S2L1+S1L2+S1L3+S1L4 |
| S2L2 | build | I'm trying to speak now | أُحاوِلُ أَنْ أَتَكَلَّمَ الآن | S2L2+S1L1+S1L4 |
| S2L2 | build | I'm trying to learn now | أُحاوِلُ أَنْ أَتَعَلَّمَ الآن | S2L2+S2L1+S1L4 |
| S2L2 | use | I'm trying to speak with you | أُحاوِلُ أَنْ أَتَكَلَّمَ مَعَكَ | S2L2+S1L1+S1L3 |
| S2L2 | use | I'm trying to speak Arabic now | أُحاوِلُ أَنْ أَتَكَلَّمَ العَرَبِيَّةَ الآن | S2L2+S1L1+S1L2+S1L4 |
| S2L2 | use | I'm trying to speak Arabic with you | أُحاوِلُ أَنْ أَتَكَلَّمَ العَرَبِيَّةَ مَعَكَ | S2L2+S1L1+S1L2+S1L3 |
| S2L2 | use | I'm trying to learn Arabic with you | أُحاوِلُ أَنْ أَتَعَلَّمَ العَرَبِيَّةَ مَعَكَ | S2L2+S2L1+S1L2+S1L3 |
| S2L2 | use | I'm trying to learn Arabic with you now | أُحاوِلُ أَنْ أَتَعَلَّمَ العَرَبِيَّةَ مَعَكَ الآن | S2L2+S2L1+S1L2+S1L3+S1L4 |
| S3L1 | build | how I learn now | كَيْفَ أَتَعَلَّمُ الآن | S3L1+S2L1+S1L4 |
| S3L1 | use | how I learn with you now | كَيْفَ أَتَعَلَّمُ مَعَكَ الآن | S3L1+S2L1+S1L3+S1L4 |
| S3L2 | build | I speak now | أَتَكَلَّمُ الآن | S3L2+S1L4 |
| S3L2 | build | I speak with you | أَتَكَلَّمُ مَعَكَ | S3L2+S1L3 |
| S3L2 | use | I speak Arabic with you now | أَتَكَلَّمُ العَرَبِيَّةَ مَعَكَ الآنَ | S3L2+S1L2+S1L3+S1L4 |
| S3L2 | use | how I speak now | كَيْفَ أَتَكَلَّمُ الآنَ | S3L1+S3L2+S1L4 |
| S3L2 | use | how I speak with you | كَيْفَ أَتَكَلَّمُ مَعَكَ | S3L1+S3L2+S1L3 |
| S3L3 | use | I want to speak as often as possible | أُريدُ أَنْ أَتَكَلَّمَ قَدْرَ الإِمْكان | S1L1+S3L3 |
| S3L3 | use | I want to learn as often as possible | أُريدُ أَنْ أَتَعَلَّمَ قَدْرَ الإِمْكان | S1L1+S2L1+S3L3 |
| S3L3 | use | I'm trying to speak Arabic as often as possible | أُحاوِلُ أَنْ أَتَكَلَّمَ العَرَبِيَّةَ قَدْرَ الإِمْكان | S2L2+S1L1+S1L2+S3L3 |
| S3L3 | use | I want to speak Arabic with you as often as possible | أُريدُ أَنْ أَتَكَلَّمَ العَرَبِيَّةَ مَعَكَ قَدْرَ الإِمْكان | S1L1+S1L2+S1L3+S3L3 |
| S3L3 | use | I speak with you as often as possible | أَتَكَلَّمُ مَعَكَ قَدْرَ الإِمْكان | S3L2+S1L3+S3L3 |
| S4L1 | build | to learn something | أَتَعَلَّمَ شَيْئاً | S2L1+S4L1 |
| S4L1 | use | I want to learn something with you | أُريدُ أَنْ أَتَعَلَّمَ شَيْئاً مَعَكَ | S1L1+S2L1+S4L1+S1L3 |
| S4L1 | use | I'm trying to learn something with you now | أُحاوِلُ أَنْ أَتَعَلَّمَ شَيْئاً مَعَكَ الآن | S2L2+S2L1+S4L1+S1L3+S1L4 |
| S4L1 | use | how I learn something | كَيْفَ أَتَعَلَّمُ شَيْئاً | S3L1+S2L1+S4L1 |
| S4L2 | build | I say something | أَقولُ شَيْئاً | S4L2+S4L1 |
| S4L2 | use | I say something as often as possible | أَقولُ شَيْئاً قَدْرَ الإِمْكان | S4L2+S4L1+S3L3 |
| S4L3 | build | I speak in Arabic with you | أَتَكَلَّمُ بِالعَرَبِيَّةِ مَعَكَ | S3L2+S4L3+S1L3 |
| S4L3 | use | how I speak in Arabic | كَيْفَ أَتَكَلَّمُ بِالعَرَبِيَّةِ | S3L1+S3L2+S4L3 |
| S4L3 | use | I want to speak in Arabic with you | أُريدُ أَنْ أَتَكَلَّمَ بِالعَرَبِيَّةِ مَعَكَ | S1L1+S4L3+S1L3 |
| S4L3 | use | I say something in Arabic as often as possible | أَقولُ شَيْئاً بِالعَرَبِيَّةِ قَدْرَ الإِمْكان | S4L2+S4L1+S4L3+S3L3 |
| S5L1 | use | I'm going to practise Arabic with you now | سَأُمارِسُ العَرَبِيَّةَ مَعَكَ الآن | S5L1+S1L2+S1L3+S1L4 |
| S5L1 | use | I'm going to practise Arabic as often as possible | سَأُمارِسُ العَرَبِيَّةَ قَدْرَ الإِمْكان | S5L1+S1L2+S3L3 |
| S5L1 | use | I'm going to practise with you as often as possible | سَأُمارِسُ مَعَكَ قَدْرَ الإِمْكان | S5L1+S1L3+S3L3 |
| S5L2 | build | I practise speaking | أُمارِسُ التَّكَلُّمَ | S5L1+S5L2 |
| S5L2 | build | I'm going to practise speaking with you | سَأُمارِسُ التَّكَلُّمَ مَعَكَ | S5L1+S5L2+S1L3 |
| S5L2 | use | I'm going to practise speaking with you now | سَأُمارِسُ التَّكَلُّمَ مَعَكَ الآن | S5L1+S5L2+S1L3+S1L4 |
| S5L2 | use | I'm going to practise speaking in Arabic as often as possible | سَأُمارِسُ التَّكَلُّمَ بِالعَرَبِيَّةِ قَدْرَ الإِمْكان | S5L1+S5L2+S4L3+S3L3 |
| S5L3 | build | to learn with someone else | أَتَعَلَّمَ مَعَ شَخْصٍ آخَرَ | S2L1+S5L3 |
| S5L3 | build | I speak Arabic with someone else | أَتَكَلَّمُ العَرَبِيَّةَ مَعَ شَخْصٍ آخَرَ | S3L2+S1L2+S5L3 |
| S5L3 | use | I'm going to practise with someone else | سَأُمارِسُ مَعَ شَخْصٍ آخَرَ | S5L1+S5L3 |
| S5L3 | use | I want to learn with someone else | أُريدُ أَنْ أَتَعَلَّمَ مَعَ شَخْصٍ آخَرَ | S1L1+S2L1+S5L3 |
| S5L3 | use | I'm trying to speak with someone else now | أُحاوِلُ أَنْ أَتَكَلَّمَ مَعَ شَخْصٍ آخَرَ الآن | S2L2+S1L1+S5L3+S1L4 |
| S5L3 | use | I speak with someone else as often as possible | أَتَكَلَّمُ مَعَ شَخْصٍ آخَرَ قَدْرَ الإِمْكان | S3L2+S5L3+S3L3 |
| S6L1 | build | a word in Arabic | كَلِمَة بِالعَرَبِيَّةِ | S6L1+S4L3 |
| S6L1 | build | I say a word | أَقولُ كَلِمَة | S4L2+S6L1 |
| S6L1 | use | I'm trying to learn a word in Arabic | أُحاوِلُ أَنْ أَتَعَلَّمَ كَلِمَة بِالعَرَبِيَّةِ | S2L2+S2L1+S6L1+S4L3 |
| S6L1 | use | I want to learn a word with you | أُريدُ أَنْ أَتَعَلَّمَ كَلِمَة مَعَكَ | S1L1+S2L1+S6L1+S1L3 |
| S6L1 | use | I say a word in Arabic as often as possible | أَقولُ كَلِمَة بِالعَرَبِيَّةِ قَدْرَ الإِمْكان | S4L2+S6L1+S4L3+S3L3 |
| S6L2 | build | to remember a word | أَتَذَكَّرَ كَلِمَة | S6L2+S6L1 |
| S6L2 | build | to remember something | أَتَذَكَّرَ شَيْئاً | S6L2+S4L1 |
| S6L2 | build | I'm trying to remember now | أُحاوِلُ أَنْ أَتَذَكَّرَ الآن | S2L2+S6L2+S1L4 |
| S6L2 | use | I want to remember something in Arabic | أُريدُ أَنْ أَتَذَكَّرَ شَيْئاً بِالعَرَبِيَّةِ | S1L1+S6L2+S4L1+S4L3 |
| S6L2 | use | I'm trying to remember a word in Arabic | أُحاوِلُ أَنْ أَتَذَكَّرَ كَلِمَة بِالعَرَبِيَّةِ | S2L2+S6L2+S6L1+S4L3 |
| S7L1 | build | Arabic today | العَرَبِيَّةَ اليَوْم | S1L2+S7L1 |
| S7L1 | build | with you today | مَعَكَ اليَوْم | S1L3+S7L1 |
| S7L1 | build | I speak today | أَتَكَلَّمُ اليَوْم | S3L2+S7L1 |
| S7L1 | build | I say something today | أَقولُ شَيْئاً اليَوْم | S4L2+S4L1+S7L1 |
| S7L1 | use | I'm going to practise today | سَأُمارِسُ اليَوْم | S5L1+S7L1 |
| S7L1 | use | I'm going to practise speaking with someone else today | سَأُمارِسُ التَّكَلُّمَ مَعَ شَخْصٍ آخَرَ اليَوْم | S5L1+S5L2+S5L3+S7L1 |
| S7L1 | use | I want to remember a word today | أُريدُ أَنْ أَتَذَكَّرَ كَلِمَة اليَوْم | S1L1+S6L2+S6L1+S7L1 |
| S7L1 | use | I'm trying to speak Arabic today | أُحاوِلُ أَنْ أَتَكَلَّمَ العَرَبِيَّةَ اليَوْم | S2L2+S1L1+S1L2+S7L1 |
| S7L2 | build | to try today | أُحاوِلَ اليَوْم | S7L2+S7L1 |
| S7L2 | use | I want to try with someone else | أُريدُ أَنْ أُحاوِلَ مَعَ شَخْصٍ آخَرَ | S1L1+S7L2+S5L3 |
| S7L2 | use | I want to try as often as possible | أُريدُ أَنْ أُحاوِلَ قَدْرَ الإِمْكان | S1L1+S7L2+S3L3 |
| S7L3 | build | I can try | أَسْتَطيعُ أَنْ أُحاوِلَ | S7L3+S7L2 |
| S7L3 | use | I can learn Arabic | أَسْتَطيعُ أَنْ أَتَعَلَّمَ العَرَبِيَّةَ | S7L3+S2L1+S1L2 |
| S7L3 | use | I can speak Arabic with you | أَسْتَطيعُ أَنْ أَتَكَلَّمَ العَرَبِيَّةَ مَعَكَ | S7L3+S1L1+S1L2+S1L3 |
| S7L3 | use | I can speak Arabic today | أَسْتَطيعُ أَنْ أَتَكَلَّمَ العَرَبِيَّةَ اليَوْم | S7L3+S1L1+S1L2+S7L1 |
| S7L3 | use | I can remember a word today | أَسْتَطيعُ أَنْ أَتَذَكَّرَ كَلِمَة اليَوْم | S7L3+S6L2+S6L1+S7L1 |
| S7L3 | use | I can learn something with you | أَسْتَطيعُ أَنْ أَتَعَلَّمَ شَيْئاً مَعَكَ | S7L3+S2L1+S4L1+S1L3 |
| S7L4 | build | I learn as hard as I can | أَتَعَلَّمُ بِكُلِّ ما أَسْتَطيعُ | S2L1+S7L4 |
| S7L4 | use | I'm trying to learn as hard as I can | أُحاوِلُ أَنْ أَتَعَلَّمَ بِكُلِّ ما أَسْتَطيعُ | S2L2+S2L1+S7L4 |
| S7L4 | use | I want to speak Arabic as hard as I can | أُريدُ أَنْ أَتَكَلَّمَ العَرَبِيَّةَ بِكُلِّ ما أَسْتَطيعُ | S1L1+S1L2+S7L4 |
| S7L4 | use | I'm going to practise speaking as hard as I can | سَأُمارِسُ التَّكَلُّمَ بِكُلِّ ما أَسْتَطيعُ | S5L1+S5L2+S7L4 |
| S7L4 | use | I try as hard as I can today | أُحاوِلُ بِكُلِّ ما أَسْتَطيعُ اليَوْم | S7L2+S7L4+S7L1 |
| S8L1 | build | to explain something | أَشْرَحَ شَيْئاً | S8L1+S4L1 |
| S8L1 | build | to explain a word | أَشْرَحَ كَلِمَة | S8L1+S6L1 |
| S8L1 | build | I'm trying to explain now | أُحاوِلُ أَنْ أَشْرَحَ الآن | S2L2+S8L1+S1L4 |
| S8L1 | use | I want to explain a word in Arabic | أُريدُ أَنْ أَشْرَحَ كَلِمَة بِالعَرَبِيَّةِ | S1L1+S8L1+S6L1+S4L3 |
| S8L1 | use | I want to explain something today | أُريدُ أَنْ أَشْرَحَ شَيْئاً اليَوْم | S1L1+S8L1+S4L1+S7L1 |
| S8L1 | use | I can explain something in Arabic | أَسْتَطيعُ أَنْ أَشْرَحَ شَيْئاً بِالعَرَبِيَّةِ | S7L3+S8L1+S4L1+S4L3 |
| S8L2 | build | to explain what I mean | أَشْرَحَ ما أَعْنيه | S8L1+S8L2 |
| S8L2 | use | I want to explain what I mean today | أُريدُ أَنْ أَشْرَحَ ما أَعْنيه اليَوْم | S1L1+S8L1+S8L2+S7L1 |
| S8L2 | use | I'm trying to explain what I mean in Arabic | أُحاوِلُ أَنْ أَشْرَحَ ما أَعْنيه بِالعَرَبِيَّةِ | S2L2+S8L1+S8L2+S4L3 |
| S8L2 | use | I say what I mean as often as possible | أَقولُ ما أَعْنيه قَدْرَ الإِمْكان | S4L2+S8L2+S3L3 |
| S8L3 | build | I'm going to try today | سَأُحاوِلُ اليَوْم | S8L3+S7L1 |
| S8L3 | build | I'm going to try to speak | سَأُحاوِلُ أَنْ أَتَكَلَّمَ | S8L3+S1L1 |
| S8L3 | build | I'm going to try to remember | سَأُحاوِلُ أَنْ أَتَذَكَّرَ | S8L3+S6L2 |
| S8L3 | use | I'm going to try to speak Arabic with you | سَأُحاوِلُ أَنْ أَتَكَلَّمَ العَرَبِيَّةَ مَعَكَ | S8L3+S1L1+S1L2+S1L3 |
| S8L3 | use | I'm going to try to learn something today | سَأُحاوِلُ أَنْ أَتَعَلَّمَ شَيْئاً اليَوْم | S8L3+S2L1+S4L1+S7L1 |
| S8L3 | use | I'm going to try to explain what I mean in Arabic | سَأُحاوِلُ أَنْ أَشْرَحَ ما أَعْنيه بِالعَرَبِيَّةِ | S8L3+S8L1+S8L2+S4L3 |
| S9L1 | build | I learn a little | أَتَعَلَّمُ قَليلاً | S2L1+S9L1 |
| S9L1 | use | I want to learn a little today | أُريدُ أَنْ أَتَعَلَّمَ قَليلاً اليَوْم | S1L1+S2L1+S9L1+S7L1 |
| S9L1 | use | I can speak a little | أَسْتَطيعُ أَنْ أَتَكَلَّمَ قَليلاً | S7L3+S1L1+S9L1 |
| S9L1 | use | I want to explain a little in Arabic | أُريدُ أَنْ أَشْرَحَ قَليلاً بِالعَرَبِيَّةِ | S1L1+S8L1+S9L1+S4L3 |
| S9L2 | build | I learn a little Arabic | أَتَعَلَّمُ قَليلاً مِنَ العَرَبِيَّةِ | S2L1+S9L2 |
| S9L2 | use | I want to speak a little Arabic with you | أُريدُ أَنْ أَتَكَلَّمَ قَليلاً مِنَ العَرَبِيَّةِ مَعَكَ | S1L1+S9L2+S1L3 |
| S9L2 | use | I can speak a little Arabic | أَسْتَطيعُ أَنْ أَتَكَلَّمَ قَليلاً مِنَ العَرَبِيَّةِ | S7L3+S1L1+S9L2 |
| S9L2 | use | I'm going to try to speak a little Arabic today | سَأُحاوِلُ أَنْ أَتَكَلَّمَ قَليلاً مِنَ العَرَبِيَّةِ اليَوْم | S8L3+S1L1+S9L2+S7L1 |
| S10L1 | build | do I say a word? | هَلْ أَقولُ كَلِمَة؟ | S10L1+S4L2+S6L1 |
| S10L1 | use | do I speak Arabic with you today? | هَلْ أَتَكَلَّمُ العَرَبِيَّةَ مَعَكَ اليَوْم؟ | S10L1+S3L2+S1L2+S1L3+S7L1 |
| S10L1 | use | do I remember a word in Arabic? | هَلْ أَتَذَكَّرُ كَلِمَة بِالعَرَبِيَّةِ؟ | S10L1+S6L2+S6L1+S4L3 |
| S10L1 | use | do I speak a little Arabic today? | هَلْ أَتَكَلَّمُ قَليلاً مِنَ العَرَبِيَّةِ اليَوْم؟ | S10L1+S3L2+S9L2+S7L1 |
| S10L2 | build | to remember the whole sentence | أَتَذَكَّرَ الجُمْلَةَ كُلَّها | S6L2+S10L2 |
| S10L2 | build | to explain the whole sentence | أَشْرَحَ الجُمْلَةَ كُلَّها | S8L1+S10L2 |
| S10L2 | use | I want to remember the whole sentence today | أُريدُ أَنْ أَتَذَكَّرَ الجُمْلَةَ كُلَّها اليَوْم | S1L1+S6L2+S10L2+S7L1 |
| S10L2 | use | I'm going to try to remember the whole sentence | سَأُحاوِلُ أَنْ أَتَذَكَّرَ الجُمْلَةَ كُلَّها | S8L3+S6L2+S10L2 |
| S10L2 | use | I want to explain the whole sentence in Arabic | أُريدُ أَنْ أَشْرَحَ الجُمْلَةَ كُلَّها بِالعَرَبِيَّةِ | S1L1+S8L1+S10L2+S4L3 |
| S10L3 | use | I'm not sure how I say a word in Arabic | لَسْتُ مُتَأَكِّداً كَيْفَ أَقولُ كَلِمَة بِالعَرَبِيَّةِ | S10L3+S3L1+S4L2+S6L1+S4L3 |
| S10L3 | use | I'm not sure, do I remember a word? | لَسْتُ مُتَأَكِّداً هَلْ أَتَذَكَّرُ كَلِمَة | S10L3+S10L1+S6L2+S6L1 |
| S10L3 | use | I'm not sure, do I say the whole sentence in Arabic? | لَسْتُ مُتَأَكِّداً هَلْ أَقولُ الجُمْلَةَ كُلَّها بِالعَرَبِيَّةِ | S10L3+S10L1+S4L2+S10L2+S4L3 |

##### B. Deliberately NOT proposed — and why

**Target morphology not yet given (a form the learner has never heard).** MSA needs a *subjunctive*
after `أَنْ` / `أَسْتَطيعُ أَنْ`, but several legos are stored only in the *indicative*:
- `I can say something` → would need `أَقولَ`; the lego is `أَقولُ` (S4L2, indicative). Rejected.
- `I want to say what I mean` → same, needs `أَقولَ`. Rejected.
- `I'm not sure how I explain what I mean` → would need indicative `أَشْرَحُ`; the lego is subjunctive
  `أَشْرَحَ` (S8L1). Rejected.
- `I want to practise speaking` → would need subjunctive `أُمارِسَ`; only `سَأُمارِسُ` (S5L1) and the
  component `أُمارِسُ` exist. Rejected.

**Unnatural in MSA:**
- `to speak something` (`أَتَكَلَّمَ شَيْئاً`) — `تكلّم` doesn't take a direct object like this. Rejected.
- `I learn in Arabic` (`أَتَعَلَّمُ بِالعَرَبِيَّةِ`) — reads as "I learn by means of Arabic", not the intent.
- `I want to explain something with you` — "explain with you" is not idiomatic.
- `I'm going to practise a word` — practising *a word* isn't natural with `مارس`.
- `I want to try to remember a word` (`أُريدُ أَنْ أُحاوِلَ أَنْ أَتَذَكَّرَ…`) — a double `أَنْ` chain; heavy
  and stilted. Rejected even though every piece is available.

**Would differ from an existing row by a vowel only (near-identical audio):**
- `to speak as often as possible` → `أَتَكَلَّمَ قَدْرَ الإِمْكان` vs existing `I speak as often as possible`
  → `أَتَكَلَّمُ قَدْرَ الإِمْكان`. Identical consonantal skeleton, one case ending apart.
- `to learn as often as possible` → `أَتَعَلَّمَ قَدْرَ الإِمْكان` vs existing `I learn as much as possible`
  → `أَتَعَلَّمُ قَدْرَ الإِمْكان`. Same problem.
Both dropped; the `use` rows already carry the combination.

**Would require reordering the known side:** anything modelled on the existing
`now I want to speak Arabic` (S1L4) or `how do I say something now with you?` (S4L2). Not extended.

**Vocabulary not yet introduced at that point:** any `today` phrase before S7L1, any `a little`
phrase before S9, any `the whole sentence` phrase before S10L2. All proposals are gated on this.

---

#### 2. ara_eg_for_eng (Egyptian)

##### A. Proposed phrases

| Seed/Lego | phrase_role | known_text | target_text | combines |
|---|---|---|---|---|
| S1L4 | build | Arabic with you | عربي معاك | L3+L4 |
| S1L4 | use | I want to speak with you | أنا عايز أتكلم معاك | L1+L2+L4 |
| S1L5 | build | to speak now | أتكلم دلوقتي | L2+L5 |
| S1L5 | build | Arabic now | عربي دلوقتي | L3+L5 |
| S1L5 | build | to speak with you now | أتكلم معاك دلوقتي | L2+L4+L5 |
| S1L5 | use | I want to speak now | أنا عايز أتكلم دلوقتي | L1+L2+L5 |
| S1L5 | use | I want to speak Arabic now | أنا عايز أتكلم عربي دلوقتي | L1+L2+L3+L5 |
| S1L5 | use | I want to speak with you now | أنا عايز أتكلم معاك دلوقتي | L1+L2+L4+L5 |
| S2L1 | build | I'm trying to speak now | أنا بحاول أتكلم دلوقتي | S2L1+S1L2+S1L5 |
| S2L1 | use | I'm trying to speak with you | أنا بحاول أتكلم معاك | S2L1+S1L2+S1L4 |
| S2L1 | use | I'm trying to speak Arabic now | أنا بحاول أتكلم عربي دلوقتي | S2L1+S1L2+S1L3+S1L5 |
| S2L1 | use | I'm trying to speak Arabic with you | أنا بحاول أتكلم عربي معاك | S2L1+S1L2+S1L3+S1L4 |
| S2L1 | use | I'm trying to speak Arabic with you now | أنا بحاول أتكلم عربي معاك دلوقتي | S2L1+S1L2+S1L3+S1L4+S1L5 |
| S2L2 | build | want to learn | عايز أتعلم | S1L1+S2L2 |
| S2L2 | build | to learn Arabic | أتعلم عربي | S2L2+S1L3 |
| S2L2 | build | to learn with you | أتعلم معاك | S2L2+S1L4 |
| S2L2 | build | to learn now | أتعلم دلوقتي | S2L2+S1L5 |
| S2L2 | build | to learn Arabic now | أتعلم عربي دلوقتي | S2L2+S1L3+S1L5 |
| S2L2 | use | I want to learn | أنا عايز أتعلم | S1L1+S2L2 |
| S2L2 | use | I want to learn now | أنا عايز أتعلم دلوقتي | S1L1+S2L2+S1L5 |
| S2L2 | use | I want to learn with you | أنا عايز أتعلم معاك | S1L1+S2L2+S1L4 |
| S2L2 | use | I'm trying to learn Arabic | أنا بحاول أتعلم عربي | S2L1+S2L2+S1L3 |
| S2L2 | use | I'm trying to learn now | أنا بحاول أتعلم دلوقتي | S2L1+S2L2+S1L5 |
| S2L2 | use | I want to learn Arabic now | أنا عايز أتعلم عربي دلوقتي | S1L1+S2L2+S1L3+S1L5 |
| S2L2 | use | I want to learn Arabic with you | أنا عايز أتعلم عربي معاك | S1L1+S2L2+S1L3+S1L4 |
| S2L2 | use | I'm trying to learn Arabic with you now | أنا بحاول أتعلم عربي معاك دلوقتي | S2L1+S2L2+S1L3+S1L4+S1L5 |
| S3L1 | build | how to learn Arabic | إزاي أتعلم عربي | S3L1+S2L2+S1L3 |
| S3L1 | use | how to learn Arabic with you | إزاي أتعلم عربي معاك | S3L1+S2L2+S1L3+S1L4 |
| S3L1 | use | how to speak Arabic now | إزاي أتكلم عربي دلوقتي | S3L1+S1L2+S1L3+S1L5 |
| S3L2 | build | I can speak now | أقدر أتكلم دلوقتي | S3L2+S1L2+S1L5 |
| S3L2 | use | I can learn Arabic | أقدر أتعلم عربي | S3L2+S2L2+S1L3 |
| S3L2 | use | I can speak Arabic now | أقدر أتكلم عربي دلوقتي | S3L2+S1L2+S1L3+S1L5 |
| S3L2 | use | I can learn Arabic with you | أقدر أتعلم عربي معاك | S3L2+S2L2+S1L3+S1L4 |
| S3L2 | use | I want to learn how I can speak | أنا عايز أتعلم إزاي أقدر أتكلم | S1L1+S2L2+S3L1+S3L2+S1L2 |
| S3L3 | build | learn as often as possible | أتعلم كل ما أقدر | S2L2+S3L3 |
| S3L3 | use | I want to speak with you as often as possible | أنا عايز أتكلم معاك كل ما أقدر | S1L1+S1L2+S1L4+S3L3 |
| S3L3 | use | how to learn as often as possible | إزاي أتعلم كل ما أقدر | S3L1+S2L2+S3L3 |
| S4L1 | build | to say now | أقول دلوقتي | S4L1+S1L5 |
| S4L1 | use | I want to say now | أنا عايز أقول دلوقتي | S1L1+S4L1+S1L5 |
| S4L1 | use | I'm trying to say now | أنا بحاول أقول دلوقتي | S2L1+S4L1+S1L5 |
| S4L1 | use | I can learn how to say | أقدر أتعلم إزاي أقول | S3L2+S2L2+S3L1+S4L1 |
| S4L2 | build | to say something now | أقول حاجة دلوقتي | S4L1+S4L2+S1L5 |
| S4L2 | build | want to learn something | عايز أتعلم حاجة | S1L1+S2L2+S4L2 |
| S4L2 | use | how to learn something | إزاي أتعلم حاجة | S3L1+S2L2+S4L2 |
| S4L2 | use | I can say something | أقدر أقول حاجة | S3L2+S4L1+S4L2 |
| S4L2 | use | I want to say something now | أنا عايز أقول حاجة دلوقتي | S1L1+S4L1+S4L2+S1L5 |
| S4L2 | use | I can say something with you now | أقدر أقول حاجة معاك دلوقتي | S3L2+S4L1+S4L2+S1L4+S1L5 |
| S4L3 | build | to learn in Arabic | أتعلم بالعربي | S2L2+S4L3 |
| S4L3 | use | I can say something in Arabic | أقدر أقول حاجة بالعربي | S3L2+S4L1+S4L2+S4L3 |
| S4L3 | use | I want to say something in Arabic now | أنا عايز أقول حاجة بالعربي دلوقتي | S1L1+S4L1+S4L2+S4L3+S1L5 |
| S4L3 | use | I'm trying to learn how to say something in Arabic | أنا بحاول أتعلم إزاي أقول حاجة بالعربي | S2L1+S2L2+S3L1+S4L1+S4L2+S4L3 |
| S4L3 | use | how to speak in Arabic with you | إزاي أتكلم بالعربي معاك | S3L1+S1L2+S4L3+S1L4 |
| S5L1 | build | I'm going to practise now | أنا هاتمرن دلوقتي | S5L1+S1L5 |
| S5L1 | use | I'm going to practise speaking Arabic with you | أنا هاتمرن أتكلم عربي معاك | S5L1+S1L2+S1L3+S1L4 |
| S5L1 | use | I'm going to practise saying something now | أنا هاتمرن أقول حاجة دلوقتي | S5L1+S4L1+S4L2+S1L5 |
| S5L1 | use | I'm going to practise speaking in Arabic | أنا هاتمرن أتكلم بالعربي | S5L1+S1L2+S4L3 |
| S5L2 | build | to learn with someone else | أتعلم مع حد تاني | S2L2+S5L2 |
| S5L2 | use | I'm going to practise speaking Arabic with someone else | أنا هاتمرن أتكلم عربي مع حد تاني | S5L1+S1L2+S1L3+S5L2 |
| S5L2 | use | I want to speak Arabic with someone else | أنا عايز أتكلم عربي مع حد تاني | S1L1+S1L2+S1L3+S5L2 |
| S5L2 | use | I can learn with someone else | أقدر أتعلم مع حد تاني | S3L2+S2L2+S5L2 |
| S5L2 | use | I want to speak with someone else as often as possible | أنا عايز أتكلم مع حد تاني كل ما أقدر | S1L1+S1L2+S5L2+S3L3 |
| S6L1 | build | I can remember | أقدر أفتكر | S3L2+S6L1 |
| S6L1 | use | I want to remember something | أنا عايز أفتكر حاجة | S1L1+S6L1+S4L2 |
| S6L1 | use | I can remember how to speak Arabic | أقدر أفتكر إزاي أتكلم عربي | S3L2+S6L1+S3L1+S1L2+S1L3 |
| S6L1 | use | I want to remember how to say something | أنا عايز أفتكر إزاي أقول حاجة | S1L1+S6L1+S3L1+S4L1+S4L2 |
| S6L2 | build | to learn a word | أتعلم كلمة | S2L2+S6L2 |
| S6L2 | use | I can say a word in Arabic | أقدر أقول كلمة بالعربي | S3L2+S4L1+S6L2+S4L3 |
| S6L2 | use | I'm going to practise saying a word | أنا هاتمرن أقول كلمة | S5L1+S4L1+S6L2 |
| S6L2 | use | I'm trying to learn a word in Arabic | أنا بحاول أتعلم كلمة بالعربي | S2L1+S2L2+S6L2+S4L3 |
| S7L1 | build | try to learn | أحاول أتعلم | S7L1+S2L2 |
| S7L1 | build | try to say | أحاول أقول | S7L1+S4L1 |
| S7L1 | use | I can try to speak Arabic | أقدر أحاول أتكلم عربي | S3L2+S7L1+S1L2+S1L3 |
| S7L1 | use | I want to try to learn Arabic | أنا عايز أحاول أتعلم عربي | S1L1+S7L1+S2L2+S1L3 |
| S7L1 | use | I want to try to say something in Arabic | أنا عايز أحاول أقول حاجة بالعربي | S1L1+S7L1+S4L1+S4L2+S4L3 |
| S7L1 | use | how to try to remember a word | إزاي أحاول أفتكر كلمة | S3L1+S7L1+S6L1+S6L2 |
| S7L2 | build | learn as hard as I can | أتعلم على قد ما أقدر | S2L2+S7L2 |
| S7L2 | use | I want to learn as hard as I can | أنا عايز أتعلم على قد ما أقدر | S1L1+S2L2+S7L2 |
| S7L2 | use | I'm trying to speak as hard as I can | أنا بحاول أتكلم على قد ما أقدر | S2L1+S1L2+S7L2 |
| S7L2 | use | I'm going to practise speaking as hard as I can | أنا هاتمرن أتكلم على قد ما أقدر | S5L1+S1L2+S7L2 |
| S7L3 | build | learn today | أتعلم النهارده | S2L2+S7L3 |
| S7L3 | build | say something today | أقول حاجة النهارده | S4L1+S4L2+S7L3 |
| S7L3 | use | I want to learn Arabic today | أنا عايز أتعلم عربي النهارده | S1L1+S2L2+S1L3+S7L3 |
| S7L3 | use | I can speak Arabic with you today | أقدر أتكلم عربي معاك النهارده | S3L2+S1L2+S1L3+S1L4+S7L3 |
| S7L3 | use | I'm going to practise speaking with someone else today | أنا هاتمرن أتكلم مع حد تاني النهارده | S5L1+S1L2+S5L2+S7L3 |
| S7L3 | use | I want to remember a word today | أنا عايز أفتكر كلمة النهارده | S1L1+S6L1+S6L2+S7L3 |
| S8L1 | build | I'm going to try to remember | أنا حاحاول أفتكر | S8L1+S6L1 |
| S8L1 | use | I'm going to try to remember a word | أنا حاحاول أفتكر كلمة | S8L1+S6L1+S6L2 |
| S8L1 | use | I'm going to try today | أنا حاحاول النهارده | S8L1+S7L3 |
| S8L1 | use | I'm going to try to speak Arabic today | أنا حاحاول أتكلم عربي النهارده | S8L1+S1L2+S1L3+S7L3 |
| S8L1 | use | I'm going to try as hard as I can | أنا حاحاول على قد ما أقدر | S8L1+S7L2 |
| S8L2 | build | to explain a word | أشرح كلمة | S8L2+S6L2 |
| S8L2 | build | try to explain | أحاول أشرح | S7L1+S8L2 |
| S8L2 | use | I can explain something in Arabic | أقدر أشرح حاجة بالعربي | S3L2+S8L2+S4L2+S4L3 |
| S8L2 | use | I want to explain a word in Arabic | أنا عايز أشرح كلمة بالعربي | S1L1+S8L2+S6L2+S4L3 |
| S8L2 | use | I'm going to practise explaining something | أنا هاتمرن أشرح حاجة | S5L1+S8L2+S4L2 |
| S8L2 | use | I want to explain something today | أنا عايز أشرح حاجة النهارده | S1L1+S8L2+S4L2+S7L3 |
| S8L3 | build | say what I mean | أقول اللي أنا قصده | S4L1+S8L3 |
| S8L3 | use | I can explain what I mean | أقدر أشرح اللي أنا قصده | S3L2+S8L2+S8L3 |
| S8L3 | use | I want to say what I mean in Arabic | أنا عايز أقول اللي أنا قصده بالعربي | S1L1+S4L1+S8L3+S4L3 |
| S8L3 | use | I'm going to try to explain what I mean today | أنا حاحاول أشرح اللي أنا قصده النهارده | S8L1+S8L2+S8L3+S7L3 |
| S8L3 | use | how to explain what I mean in Arabic | إزاي أشرح اللي أنا قصده بالعربي | S3L1+S8L2+S8L3+S4L3 |
| S9L1 | build | I speak with you | أنا بتكلم معاك | S9L1+S1L4 |
| S9L1 | build | I speak today | أنا بتكلم النهارده | S9L1+S7L3 |
| S9L1 | use | I speak Arabic with you | أنا بتكلم عربي معاك | S9L1+S1L3+S1L4 |
| S9L1 | use | I speak Arabic with you now | أنا بتكلم عربي معاك دلوقتي | S9L1+S1L3+S1L4+S1L5 |
| S9L1 | use | I speak Arabic with someone else | أنا بتكلم عربي مع حد تاني | S9L1+S1L3+S5L2 |
| S9L1 | use | I speak in Arabic today | أنا بتكلم بالعربي النهارده | S9L1+S4L3+S7L3 |
| S9L2 | build | say a little | أقول شوية | S4L1+S9L2 |
| S9L2 | use | I speak a little Arabic | أنا بتكلم عربي شوية | S9L1+S1L3+S9L2 |
| S9L2 | use | I want to speak a little | أنا عايز أتكلم شوية | S1L1+S1L2+S9L2 |
| S9L2 | use | I can speak a little Arabic | أقدر أتكلم عربي شوية | S3L2+S1L2+S1L3+S9L2 |
| S9L2 | use | I'm going to practise a little today | أنا هاتمرن شوية النهارده | S5L1+S9L2+S7L3 |
| S10L1 | build | I'm not sure how to remember | أنا مش متأكد إزاي أفتكر | S10L1+S3L1+S6L1 |
| S10L1 | use | I'm not sure I can remember a word | أنا مش متأكد أقدر أفتكر كلمة | S10L1+S3L2+S6L1+S6L2 |
| S10L1 | use | I'm not sure I can speak Arabic today | أنا مش متأكد أقدر أتكلم عربي النهارده | S10L1+S3L2+S1L2+S1L3+S7L3 |
| S10L1 | use | I'm not sure I can explain what I mean | أنا مش متأكد أقدر أشرح اللي أنا قصده | S10L1+S3L2+S8L2+S8L3 |
| S10L2 | build | if I can remember | لو أقدر أفتكر | S10L2+S3L2+S6L1 |
| S10L2 | build | if I can say something | لو أقدر أقول حاجة | S10L2+S3L2+S4L1+S4L2 |
| S10L2 | use | I'm not sure if I can remember a word | أنا مش متأكد لو أقدر أفتكر كلمة | S10L1+S10L2+S3L2+S6L1+S6L2 |
| S10L2 | use | I'm not sure if I can explain what I mean | أنا مش متأكد لو أقدر أشرح اللي أنا قصده | S10L1+S10L2+S3L2+S8L2+S8L3 |
| S10L2 | use | I'm not sure if I want to try today | أنا مش متأكد لو عايز أحاول النهارده | S10L1+S10L2+S1L1+S7L1+S7L3 |
| S10L3 | build | to explain the whole sentence | أشرح الجملة كلها | S8L2+S10L3 |
| S10L3 | build | to say the whole sentence | أقول الجملة كلها | S4L1+S10L3 |
| S10L3 | use | I can say the whole sentence in Arabic | أقدر أقول الجملة كلها بالعربي | S3L2+S4L1+S10L3+S4L3 |
| S10L3 | use | I'm going to try to remember the whole sentence | أنا حاحاول أفتكر الجملة كلها | S8L1+S6L1+S10L3 |
| S10L3 | use | I'm not sure if I can say the whole sentence today | أنا مش متأكد لو أقدر أقول الجملة كلها النهارده | S10L1+S10L2+S3L2+S4L1+S10L3+S7L3 |
| S10L3 | use | I want to explain the whole sentence in Arabic | أنا عايز أشرح الجملة كلها بالعربي | S1L1+S8L2+S10L3+S4L3 |

##### B. Deliberately NOT proposed — and why

**Clunky repetition in the target:**
- `I can speak as often as possible` → `أقدر أتكلم كل ما أقدر`. The S3L3 lego *is* `كل ما أقدر`, so any
  phrase that also opens with `أقدر` stutters. Rejected wherever `I can` + `as often as possible` met.

**Unnatural in Egyptian:**
- `to say something with someone else` — you say something *to* someone, not *with* them.
- `I want to remember a word with someone else` — remembering isn't a joint activity here.
- `I want to remember a little` (`عايز أفتكر شوية`) — reads as "remember for a bit", not the intent.
- `remember as hard as I can` — `على قد ما أقدر` doesn't collocate with `أفتكر`.

**ZUT / would create a second target for an existing known:**
- Standalone `a little Arabic`. The course already fixes the order in-sentence as `عربي شوية`
  (S9L2 `أنا بتكلم عربي شوية`), but a bare noun phrase wants `شوية عربي`. Two orders for one known
  idea; left out rather than guessed. **See structural finding 3.**

**Vocabulary not yet introduced:** no `today` before S7L3, no `a little` before S9L2, no
`the whole sentence` before S10L3, no `I'm going to try` before S8L1.

---

#### 3. ara_lb_for_eng (Levantine)

Register kept Levantine throughout: `بدي / عم بحاول / رح / فيني / هلق / شو قصدي / حدا`. No MSA
phrasing carried across from ara_for_eng; no Egyptian forms (`عايز / دلوقتي / إزاي / حاجة`) used.

##### A. Proposed phrases

| Seed/Lego | phrase_role | known_text | target_text | combines |
|---|---|---|---|---|
| S1L4 | build | Arabic with you | عربي معك | L3+L4 |
| S1L5 | build | to speak now | أحكي هلق | L2+L5 |
| S1L5 | build | Arabic now | عربي هلق | L3+L5 |
| S2L1 | build | I'm trying to speak now | عم بحاول أحكي هلق | S2L1+S1L2+S1L5 |
| S2L1 | use | I'm trying to speak with you | عم بحاول أحكي معك | S2L1+S1L2+S1L4 |
| S2L1 | use | I'm trying to speak with you now | عم بحاول أحكي معك هلق | S2L1+S1L2+S1L4+S1L5 |
| S2L1 | use | I'm trying to speak Arabic now | عم بحاول أحكي عربي هلق | S2L1+S1L2+S1L3+S1L5 |
| S2L1 | use | I'm trying to speak Arabic with you | عم بحاول أحكي عربي معك | S2L1+S1L2+S1L3+S1L4 |
| S2L2 | build | to learn Arabic | أتعلم عربي | S2L2+S1L3 |
| S2L2 | build | to learn with you | أتعلم معك | S2L2+S1L4 |
| S2L2 | build | to learn now | أتعلم هلق | S2L2+S1L5 |
| S2L2 | use | I want to learn with you | بدي أتعلم معك | S1L1+S2L2+S1L4 |
| S2L2 | use | I'm trying to learn Arabic now | عم بحاول أتعلم عربي هلق | S2L1+S2L2+S1L3+S1L5 |
| S2L2 | use | I want to learn Arabic with you | بدي أتعلم عربي معك | S1L1+S2L2+S1L3+S1L4 |
| S3L1 | build | how to speak with you | كيف أحكي معك | S3L1+S1L2+S1L4 |
| S3L1 | build | how to learn Arabic | كيف أتعلم عربي | S3L1+S2L2+S1L3 |
| S3L1 | use | how to learn Arabic with you | كيف أتعلم عربي معك | S3L1+S2L2+S1L3+S1L4 |
| S3L1 | use | I want to learn how to speak Arabic | بدي أتعلم كيف أحكي عربي | S1L1+S2L2+S3L1+S1L2+S1L3 |
| S3L1 | use | I'm trying to learn how to speak | عم بحاول أتعلم كيف أحكي | S2L1+S2L2+S3L1+S1L2 |
| S3L2 | build | speak with you as often as possible | أحكي معك أكتر ما في وقت | S1L2+S1L4+S3L2 |
| S3L2 | use | I'm trying to speak as often as possible | عم بحاول أحكي أكتر ما في وقت | S2L1+S1L2+S3L2 |
| S3L2 | use | I want to learn as often as possible | بدي أتعلم أكتر ما في وقت | S1L1+S2L2+S3L2 |
| S3L2 | use | how to learn as often as possible | كيف أتعلم أكتر ما في وقت | S3L1+S2L2+S3L2 |
| S4L1 | build | say now | قول هلق | S4L1+S1L5 |
| S4L1 | use | how to say it now | كيف قول هلق | S3L1+S4L1+S1L5 |
| S4L1 | use | I'm trying to learn how to say | عم بحاول أتعلم كيف قول | S2L1+S2L2+S3L1+S4L1 |
| S4L2 | build | say something now | قول شي هلق | S4L1+S4L2+S1L5 |
| S4L2 | build | learn something now | أتعلم شي هلق | S2L2+S4L2+S1L5 |
| S4L2 | use | I want to learn something | بدي أتعلم شي | S1L1+S2L2+S4L2 |
| S4L2 | use | I'm trying to say something now | عم بحاول قول شي هلق | S2L1+S4L1+S4L2+S1L5 |
| S4L2 | use | how to learn something | كيف أتعلم شي | S3L1+S2L2+S4L2 |
| S4L2 | use | I want to learn something with you | بدي أتعلم شي معك | S1L1+S2L2+S4L2+S1L4 |
| S4L3 | build | learn something in Arabic | أتعلم شي بالعربي | S2L2+S4L2+S4L3 |
| S4L3 | use | I want to learn something in Arabic | بدي أتعلم شي بالعربي | S1L1+S2L2+S4L2+S4L3 |
| S4L3 | use | I'm trying to speak in Arabic | عم بحاول أحكي بالعربي | S2L1+S1L2+S4L3 |
| S4L3 | use | I want to speak in Arabic with you | بدي أحكي بالعربي معك | S1L1+S1L2+S4L3+S1L4 |
| S4L3 | use | I want to say something in Arabic as often as possible | بدي قول شي بالعربي أكتر ما في وقت | S1L1+S4L1+S4L2+S4L3+S3L2 |
| S5L1 | build | going to speak with you | رح أحكي معك | S5L1+S1L2+S1L4 |
| S5L1 | use | I'm going to learn Arabic with you | رح أتعلم عربي معك | S5L1+S2L2+S1L3+S1L4 |
| S5L1 | use | I'm going to speak Arabic now | رح أحكي عربي هلق | S5L1+S1L2+S1L3+S1L5 |
| S5L1 | use | I'm going to say something in Arabic now | رح قول شي بالعربي هلق | S5L1+S4L1+S4L2+S4L3+S1L5 |
| S5L1 | use | I'm going to learn as often as possible | رح أتعلم أكتر ما في وقت | S5L1+S2L2+S3L2 |
| S5L2 | build | practise speaking in Arabic | أتمرن على الحكي بالعربي | S5L2+S4L3 |
| S5L2 | build | practise speaking now | أتمرن على الحكي هلق | S5L2+S1L5 |
| S5L2 | use | I'm going to practise speaking now | رح أتمرن على الحكي هلق | S5L1+S5L2+S1L5 |
| S5L2 | use | I want to practise speaking with you | بدي أتمرن على الحكي معك | S1L1+S5L2+S1L4 |
| S5L2 | use | I'm trying to practise speaking as often as possible | عم بحاول أتمرن على الحكي أكتر ما في وقت | S2L1+S5L2+S3L2 |
| S5L3 | build | learn with someone else | أتعلم مع حدا تاني | S2L2+S5L3 |
| S5L3 | use | I want to learn with someone else | بدي أتعلم مع حدا تاني | S1L1+S2L2+S5L3 |
| S5L3 | use | I'm trying to speak with someone else | عم بحاول أحكي مع حدا تاني | S2L1+S1L2+S5L3 |
| S5L3 | use | I want to speak Arabic with someone else | بدي أحكي عربي مع حدا تاني | S1L1+S1L2+S1L3+S5L3 |
| S5L3 | use | I'm going to practise speaking with someone else as often as possible | رح أتمرن على الحكي مع حدا تاني أكتر ما في وقت | S5L1+S5L2+S5L3+S3L2 |
| S6L1 | use | I'm going to remember something | رح أتذكر شي | S5L1+S6L1+S4L2 |
| S6L1 | use | I want to remember how to say something | بدي أتذكر كيف قول شي | S1L1+S6L1+S3L1+S4L1+S4L2 |
| S6L1 | use | I'm trying to remember something in Arabic | عم بحاول أتذكر شي بالعربي | S2L1+S6L1+S4L2+S4L3 |
| S6L2 | build | remember a word in Arabic | أتذكر كلمة بالعربي | S6L1+S6L2+S4L3 |
| S6L2 | build | learn a word in Arabic | أتعلم كلمة بالعربي | S2L2+S6L2+S4L3 |
| S6L2 | use | I want to learn a word in Arabic | بدي أتعلم كلمة بالعربي | S1L1+S2L2+S6L2+S4L3 |
| S6L2 | use | how to remember a word in Arabic | كيف أتذكر كلمة بالعربي | S3L1+S6L1+S6L2+S4L3 |
| S7L1 | build | try to say | أحاول قول | S7L1+S4L1 |
| S7L1 | build | try to remember | أحاول أتذكر | S7L1+S6L1 |
| S7L1 | use | I'm going to try to learn Arabic | رح أحاول أتعلم عربي | S5L1+S7L1+S2L2+S1L3 |
| S7L1 | use | I want to try to say something in Arabic | بدي أحاول قول شي بالعربي | S1L1+S7L1+S4L1+S4L2+S4L3 |
| S7L1 | use | I want to try to speak with someone else | بدي أحاول أحكي مع حدا تاني | S1L1+S7L1+S1L2+S5L3 |
| S7L2 | build | practise speaking as hard as I can | أتمرن على الحكي بكل ما عندي | S5L2+S7L2 |
| S7L2 | use | I'm going to practise speaking as hard as I can | رح أتمرن على الحكي بكل ما عندي | S5L1+S5L2+S7L2 |
| S7L2 | use | I'm going to try to speak Arabic as hard as I can | رح أحاول أحكي عربي بكل ما عندي | S5L1+S7L1+S1L2+S1L3+S7L2 |
| S7L2 | use | I want to learn Arabic as hard as I can | بدي أتعلم عربي بكل ما عندي | S1L1+S2L2+S1L3+S7L2 |
| S7L3 | build | learn today | أتعلم اليوم | S2L2+S7L3 |
| S7L3 | build | say something today | قول شي اليوم | S4L1+S4L2+S7L3 |
| S7L3 | use | I want to learn Arabic today | بدي أتعلم عربي اليوم | S1L1+S2L2+S1L3+S7L3 |
| S7L3 | use | I'm trying to remember a word today | عم بحاول أتذكر كلمة اليوم | S2L1+S6L1+S6L2+S7L3 |
| S7L3 | use | I'm going to try to speak with someone else today | رح أحاول أحكي مع حدا تاني اليوم | S5L1+S7L1+S1L2+S5L3+S7L3 |
| S7L3 | use | I want to speak Arabic with you today | بدي أحكي عربي معك اليوم | S1L1+S1L2+S1L3+S1L4+S7L3 |
| S8L1 | build | explain a word | أشرح كلمة | S8L1+S6L2 |
| S8L1 | build | explain in Arabic | أشرح بالعربي | S8L1+S4L3 |
| S8L1 | use | I want to explain a word in Arabic | بدي أشرح كلمة بالعربي | S1L1+S8L1+S6L2+S4L3 |
| S8L1 | use | I'm going to try to explain something | رح أحاول أشرح شي | S5L1+S7L1+S8L1+S4L2 |
| S8L1 | use | I want to explain something today | بدي أشرح شي اليوم | S1L1+S8L1+S4L2+S7L3 |
| S8L1 | use | I'm trying to explain something in Arabic | عم بحاول أشرح شي بالعربي | S2L1+S8L1+S4L2+S4L3 |
| S8L2 | build | explain what I mean in Arabic | أشرح شو قصدي بالعربي | S8L1+S8L2+S4L3 |
| S8L2 | use | I want to explain what I mean in Arabic | بدي أشرح شو قصدي بالعربي | S1L1+S8L1+S8L2+S4L3 |
| S8L2 | use | I'm trying to say what I mean | عم بحاول قول شو قصدي | S2L1+S4L1+S8L2 |
| S8L2 | use | I'm going to explain what I mean today | رح أشرح شو قصدي اليوم | S5L1+S8L1+S8L2+S7L3 |
| S8L2 | use | how to say what I mean in Arabic | كيف قول شو قصدي بالعربي | S3L1+S4L1+S8L2+S4L3 |
| S9L1 | build | I speak today | عم بحكي اليوم | S9L1+S7L3 |
| S9L1 | use | I speak Arabic with you now | عم بحكي عربي معك هلق | S9L1+S1L3+S1L4+S1L5 |
| S9L1 | use | I speak Arabic with someone else today | عم بحكي عربي مع حدا تاني اليوم | S9L1+S1L3+S5L3+S7L3 |
| S9L1 | use | I speak in Arabic as often as possible | عم بحكي بالعربي أكتر ما في وقت | S9L1+S4L3+S3L2 |
| S9L2 | build | learn a little | أتعلم شوي | S2L2+S9L2 |
| S9L2 | build | explain a little | أشرح شوي | S8L1+S9L2 |
| S9L2 | use | I want to speak a little Arabic | بدي أحكي شوي عربي | S1L1+S1L2+S9L2+S1L3 |
| S9L2 | use | I'm trying to learn a little | عم بحاول أتعلم شوي | S2L1+S2L2+S9L2 |
| S9L2 | use | I want to explain a little in Arabic | بدي أشرح شوي بالعربي | S1L1+S8L1+S9L2+S4L3 |
| S9L2 | use | I speak a little Arabic today | عم بحكي شوي عربي اليوم | S9L1+S9L2+S1L3+S7L3 |
| S10L1 | build | not going to try | مش رح أحاول | S10L1+S5L1+S7L1 |
| S10L1 | build | not going to explain | مش رح أشرح | S10L1+S5L1+S8L1 |
| S10L1 | use | I'm not going to say something today | مش رح قول شي اليوم | S10L1+S5L1+S4L1+S4L2+S7L3 |
| S10L1 | use | I'm not trying to speak Arabic now | مش عم بحاول أحكي عربي هلق | S10L1+S2L1+S1L2+S1L3+S1L5 |
| S10L1 | use | I'm not going to explain what I mean | مش رح أشرح شو قصدي | S10L1+S5L1+S8L1+S8L2 |
| S10L2 | build | I can explain | فيني أشرح | S10L2+S8L1 |
| S10L2 | build | I can learn | فيني أتعلم | S10L2+S2L2 |
| S10L2 | use | I can explain what I mean | فيني أشرح شو قصدي | S10L2+S8L1+S8L2 |
| S10L2 | use | I can remember a word | فيني أتذكر كلمة | S10L2+S6L1+S6L2 |
| S10L2 | use | I can learn Arabic with you | فيني أتعلم عربي معك | S10L2+S2L2+S1L3+S1L4 |
| S10L2 | use | I can speak Arabic today | فيني أحكي عربي اليوم | S10L2+S1L2+S1L3+S7L3 |
| S10L3 | build | not sure if I can learn | مش متأكد إذا فيني أتعلم | S10L3+S2L2 |
| S10L3 | build | not sure if I can explain | مش متأكد إذا فيني أشرح | S10L3+S8L1 |
| S10L3 | use | I'm not sure if I can say something in Arabic | مش متأكد إذا فيني قول شي بالعربي | S10L3+S4L1+S4L2+S4L3 |
| S10L3 | use | I'm not sure if I can explain what I mean | مش متأكد إذا فيني أشرح شو قصدي | S10L3+S8L1+S8L2 |
| S10L3 | use | I'm not sure if I can remember a word | مش متأكد إذا فيني أتذكر كلمة | S10L3+S6L1+S6L2 |
| S10L3 | use | I'm not sure if I can speak Arabic with someone else | مش متأكد إذا فيني أحكي عربي مع حدا تاني | S10L3+S1L2+S1L3+S5L3 |
| S10L4 | build | explain the sentence | أشرح الجملة | S8L1+S10L4 |
| S10L4 | build | learn the sentence | أتعلم الجملة | S2L2+S10L4 |
| S10L4 | use | I can explain the sentence in Arabic | فيني أشرح الجملة بالعربي | S10L2+S8L1+S10L4+S4L3 |
| S10L4 | use | I'm trying to remember the sentence | عم بحاول أتذكر الجملة | S2L1+S6L1+S10L4 |
| S10L4 | use | I want to learn the sentence today | بدي أتعلم الجملة اليوم | S1L1+S2L2+S10L4+S7L3 |
| S10L4 | use | I'm not sure if I can remember the sentence | مش متأكد إذا فيني أتذكر الجملة | S10L3+S6L1+S10L4 |
| S10L5 | build | remember the whole sentence | أتذكر الجملة كلها | S6L1+S10L5 |
| S10L5 | build | learn the whole sentence | أتعلم الجملة كلها | S2L2+S10L5 |
| S10L5 | use | I want to remember the whole sentence | بدي أتذكر الجملة كلها | S1L1+S6L1+S10L5 |
| S10L5 | use | I can say the whole sentence in Arabic | فيني قول الجملة كلها بالعربي | S10L2+S4L1+S10L5+S4L3 |
| S10L5 | use | I'm going to try to say the whole sentence today | رح أحاول قول الجملة كلها اليوم | S5L1+S7L1+S4L1+S10L5+S7L3 |
| S10L5 | use | I'm not sure if I can explain the whole sentence | مش متأكد إذا فيني أشرح الجملة كلها | S10L3+S8L1+S10L5 |

##### B. Deliberately NOT proposed — and why

**Would differ from an existing row by punctuation only** — exactly what the authoring rule forbids:
- `to speak Arabic now` → `أحكي عربي هلق`. S1L5 already stores `speak Arabic now!` → `أحكي عربي هلق!`.
  Dropped.

**ZUT clash with an existing row (same known → a different target already stored):**
- `I want to speak Arabic with you`. The natural Levantine order is `بدي أحكي عربي معك`, but S1L4
  already stores `بدي أحكي معك عربي`. Not proposed; see structural finding 4.
- Anything that would re-render `I speak Arabic` / `I want to speak` — already taken.

**Vocabulary not yet introduced at that point:**
- `try to remember` at S6L1 — `أحاول` doesn't arrive until S7L1. Proposed only from S7L1 onward.
- Nothing using `منيح` ("well"), `معي` ("with me") or `كام كلمة`; none is a lego in this course.
  Two existing rows already break this — see structural finding 5.

**Unnatural in Levantine:**
- `say something with someone else` — you say something *to* someone.
- `I want to remember as often as possible` — `أكتر ما في وقت` doesn't collocate with `أتذكر`.
- `remember as hard as I can` — same, `بكل ما عندي` doesn't fit `أتذكر`.
- `practise saying a word` — `أتمرن على الحكي` is a fixed unit ("practise speaking"); swapping in
  `قول` would need a new lego (`أتمرن على القول`), which the learner has not been given.
- `I want to remember what I mean` — semantically odd.

**Would require reordering the known side:** no phrase modelled on the existing
`I, I want to speak` (S1L2) or `now, with you now` (S1L5).

---

#### Structural findings

1. **`ara_for_eng` S1L01 is not barren, and its one row is a self-duplicate.** `S1L1` has both
   `build lc=1` and `use lc=4` with **identical** known_text *and* target_text
   (`I want to speak` / `أُريدُ أَنْ أَتَكَلَّمَ`). By the LEGO 1 rule S1L01 should carry no combination
   content; `ara_eg_for_eng` and `ara_lb_for_eng` S1L01 are both correctly barren (0 combos).
   **Recommend deleting the `use` row** — but that is a mutation, so it is proposed here only.

2. **`ara_for_eng` S3L3 has known-side drift.** The lego known_text is `as often as possible`, but
   five existing phrases render the same target `قَدْرَ الإِمْكان` as `as much as possible`
   (`I learn as much as possible`, `I'm trying to learn as much as possible`, …). One target, two
   English renderings. My proposals all use `as often as possible`; the existing rows are the ones
   that need Kai's decision.

3. **`ara_eg_for_eng` S9L2 target does not contain the lego.** `I want to say a little in Arabic`
   → `أنا عايز أقول كام كلمة بالعربي` = "a few *words*", not `شوية`. The lego being practised is
   absent from the phrase.

4. **`ara_lb_for_eng` S1 fixes an unnatural constituent order that S9 then contradicts.**
   S1L4/S1L5 store `بدي أحكي معك عربي` (with-you *before* Arabic); S9L1 stores `عم بحكي عربي معك`
   (the natural order). This is the single most important item in this fragment: the S1 rows teach
   the learner the wrong order at the very first exposure, and S9 silently corrects it. I did not
   propose either order for those knowns, to avoid a ZUT clash.

5. **`ara_lb_for_eng` uses untaught vocabulary in four existing rows.**
   `منيح` ("well") in S10L3 `I'm not sure if I can explain it well` and S10L4 `I want to explain the
   sentence well`; `معي` ("with me") in S1L4 `speak Arabic with me`. None is a lego.
   Also S10L5 `I can say the whole sentence` → `فيني قول الجملة كلها هلق` contains `هلق` ("now")
   with no "now" in the known side.

6. **`ara_lb_for_eng` has five repetition artifacts stored as phrases** — the target is a doubled
   fragment, which reads as a TTS/authoring artifact rather than a phrase:
   `بدي أحكي عربي، عربي` (S1L3), `رح أتمرن على الحكي، أتمرن على الحكي` and
   `بدي أتمرن على الحكي، أتمرن على الحكي` (S5L2), `أتذكر، أتذكر` (S6L1), `بدي قول، قول` (S4L1).
   Two more have malformed known_text: `I, I want to speak` (S1L2), `now, with you now` (S1L5).

7. **Density is flat where Finnish's grows.** All three Arabic courses sit at ~6-9 combos per lego
   from S3 onward and 0-3 in S1-S2. Finnish runs 0→1→2→6→9 across S1 and 9→16 in S2 — density
   *grows* as legos accumulate. The Arabic S1-S2 deficit (`ara_eg` and `ara_lb` especially) is
   where most of this proposal lands. No `is_new=true` lego in any of the three courses is fully
   barren other than the two correct S1L01s; nothing looks truncated.

8. **`build` vs `use` is applied inconsistently in `ara_for_eng` S1.** `I want to speak with you`
   (S1L3) and `I want to speak now` (S1L4) carry the opener but are tagged `build`. Under the
   Finnish shape those are `use`. Flagging only; not re-tagged.

#### Explicit gaps — things I could NOT verify

- **No native review.** Everything below the concatenation level is my own judgement. The Levantine
  and Egyptian phrases in particular should be read by a native speaker before anything is written.
- **MSA vowelling (`tashkīl`) is inconsistent in the existing data and I could not determine the
  intended convention.** `الآن` appears both bare and as `الآنَ` for the same lego; `كَلِمَة` never
  takes case. My proposals copy each lego's stored form verbatim rather than normalising, so some
  proposals will inherit the inconsistency. **I do not know which form is canonical.**
- **MSA subjunctive coverage is a real gap I could not resolve.** `أَقولُ` (S4L2) and `أَتَكَلَّمُ` (S3L2)
  are stored as indicatives, so `I can say…` / `I want to say…` are unbuildable without introducing
  a form the learner hasn't heard. Whether the course intends the learner to generalise this is a
  methodology question for Kai, not something I could read off the data.
- **Egyptian `لو` for "if" after "not sure".** The course uses `مش متأكد لو أقدر…` throughout. Many
  Egyptian speakers would say `مش متأكد إني أقدر` or `مش متأكد إذا…`. I followed the existing
  course convention rather than diverging, but **I am not confident `لو` is right here** and I could
  not verify it.
- **I did not check audio.** Whether any existing row already has generated audio (and would
  therefore be expensive to change) is outside what I queried; `course_audio` was not consulted.
- **`lego_count` values.** I did not propose `lego_count` for any row — the existing values are
  computed inconsistently in places (e.g. `ara_lb` S1L5 `speak Arabic now!` = 3 vs `ara` S1L4
  `Arabic with you now` patterns = 8), and I could not determine the rule. Assumed the write path
  assigns it.

---

## 8. Duplicates — found, listed, **not deleted**

Nothing here has been deleted. This section is a recommendation only.

### 8.1 First, a correction to the brief I was given

I was told `cat_for_spa` had 9 duplicates and `spa_for_eng` had 5. Re-running the check with a
Unicode-safe normaliser (`/[^\p{L}\p{N}\s']/gu` — **not** `\w`, which is ASCII-only and silently
zeroes Chinese, Japanese, Korean, Arabic and Indic text into phantom matches) gives a different and,
I think, more useful picture:

**A `component` row that repeats a `build`/`use` text is normal, not a defect.** Components are the
decomposition pieces of a lego, so they legitimately restate earlier material. The gold standard does
this itself — `fin_for_eng` has "I'm not sure" as both a S10L1 `build` and a S10L3 `component`. Any
duplicate count that includes component overlaps is inflated.

Counting only **same-role `build`/`use` pairs**, which are the ones a learner actually experiences as
a repeat:

- **`spa_for_eng` has 0 real duplicates**, not 5. All its hits were component overlaps.
- **`cat_for_spa` has 7**, not 9 — again, two were component overlaps.
- **`fra_for_eng` has 5 remaining** — see 5.2, this one matters.
- **`spa_mx_for_eng` has 0.**

### 8.2 ⚠️ `fra_for_eng` is not at zero duplicates

The brief states "Duplicates remaining: 0" after the 24 build-row deletions. That is true **for
`build` rows only**. Five `use`/`use` duplicate pairs remain, all involving S8L2, all with audio on
both copies:

| known_text | target_text | rows |
|---|---|---|
| I want to say something | je veux dire quelque chose | S4L2 · S8L2 |
| I want to say something now | je veux dire quelque chose maintenant | S4L2 · S8L2 |
| I want to say something in French | je veux dire quelque chose en français | S4L3 · S8L2 |
| I want to say something in French today | je veux dire quelque chose en français aujourd'hui | S7L4 · S8L2 |
| I want to say a word in French | je veux dire un mot en français | S6L2 · S8L2 |

**Recommendation:** leave them for now, but treat S8L2 as needing a look — it appears to have been
populated by re-deriving "I want to say …" phrases that already existed at their original legos.
Deleting the S8L2 copies would be the natural fix, but that is a *second* deletion in a course that
has just had 24 rows removed, and it is your call, not mine.

### 8.3 Same-lego `build` + `use` with identical text

These are a distinct and clearer defect: the learner meets the identical prompt twice within one
lego. `fin_for_eng` never does this. All have audio on both rows.

| Course | Lego | known_text | target_text |
|---|---|---|---|
| `deu_for_eng` | S6L3 | I want to remember a word | Ich will mich an ein Wort erinnern |
| `deu_for_eng` | S10L3 | I can say the whole sentence | Ich kann den ganzen Satz sagen |
| `ita_for_eng` | S1L3 | I want to speak Italian | voglio parlare italiano |
| `ita_for_eng` | S2L1 | I'm trying to speak Italian | sto provando a parlare italiano |
| `zho_for_eng` | S5L2 | how to practise | 怎么练习 |
| `ara_for_eng` | S1L1 | I want to speak | أُريدُ أَنْ أَتَكَلَّمَ |

**Recommendation:** drop the `build` copy in each pair and keep the `use` copy, since the `use` row is
the one carrying the fuller sentence role. Six rows total. **Not done — awaiting your approval.**

### 8.4 Cross-lego duplicates in other courses

| Course | known_text | rows |
|---|---|---|
| `kor_for_eng` | I'm trying to remember something | S6L2 `use` · S10L2 `use` |
| `fra_ca_for_eng` | in French → en québécois | S4L3 `build` · S4L4 `build` — **S4L03 holds the stray copy**: S4L04 *is* the `in French` lego, while S4L03 is the `in` lego and carries no row for `in` at all |
| `deu_ch_for_eng` | what I mean → was ich mein | S8L3 `build` · S8L4 `build` |

### 8.5 `cat_for_spa` — 7 real duplicates (outside the nine-course scope, listed as requested)

| known (spa) | target (cat) | rows |
|---|---|---|
| quiero hablar contigo ahora | vull parlar amb tu ara | S1L5 `use` · S5L3 `use` |
| estoy intentando hablar contigo | estic intentant parlar amb tu | S2L2 `use` · S5L3 `use` |
| voy a practicar contigo | practicaré amb tu | S5L1 `use` · S5L3 `use` |
| decir algo | dir alguna cosa | S4L2 `build` · S8L5 `build` |
| lo que quiero decir | el que vull dir | S8L3 `build` · S8L5 `build` |
| voy a intentar decir algo en catalán | intentaré dir alguna cosa en català | S8L1 `use` · S8L5 `use` |
| voy a intentar explicar lo que quiero decir hoy | intentaré explicar el que vull dir avui | S8L3 `use` · S8L5 `use` |

Pattern: S5L3 and S8L5 are the repeat-magnets, same signature as `fra_for_eng`'s S8L2.
**Recommendation:** same as 5.2 — worth a look, but not deleted, and not urgent.

### 8.6 A note on the wider estate

The same check across *all* courses in the database (not just these seventeen) flags duplicate groups
in ~90 courses. I have not analysed those — they are outside this job's scope and most of the raw
count will be benign component overlap. Flagging only so the number isn't a surprise later.

---

## 9. Required follow-up if any of this is approved

1. **`fra_for_eng` needs an audio pass and does not have one queued.** I confirmed against the pending
   queue: there is no `fra_for_eng` request. The already-created `fra_for_eng:S0001L02B01` is the
   course's **only** row in seeds 1-10 with NULL audio, and it will stay silent until a pass runs.
   The end-step command (**not run — approval-gated, and this is a propose-only job**):

   ```
   node tools/course-optimization/queue-audio-pass.cjs fra_for_eng --reason "seeds 1-10 backfill"
   ```

2. **Every course that receives phrases from this proposal needs the same end step** — queue, never
   generate. TTS stays approval-gated.

3. **Two courses in this set are entirely unvoiced in seeds 1-10** and would need a full pass, not a
   top-up: `fin_for_eng` (386 rows) and `deu_ch_for_eng` (253 rows). Both already have a pending
   request from 2026-07-24 that has not been fulfilled.

---

## 9b. Independent verification of the proposals

Each language worker checked its own output. I then re-checked all of it from outside, by parsing the
proposal tables back out of the fragments and querying the live DB directly:

- **1,976 proposed table rows parsed** (deliberately over-inclusive — the parse also picks up rows
  from the *rejection* tables, so coverage is wider than the proposal set itself).
- **0 exact duplicates** of any existing `build`/`use` row in seeds 1-10.
- **0 ZUT clashes** — no proposed `known_text` is already bound to a different `target_text`.

Normalisation used `/[^\p{L}\p{N}\s']/gu`, never `\w` (ASCII-only, and it silently zeroes Chinese,
Japanese, Korean and Arabic text into phantom matches).

**What this does and does not prove.** It confirms the proposals are internally clean against the
existing data in seeds 1-10. It does **not** address naturalness, native correctness, or clashes with
seeds 11+ — see §10.

---

## 10. Explicit gaps — what I could NOT verify

Reported honestly rather than papered over. Several of these are blocking.

### 10.1 Blocking before any write

1. **No native-speaker verification on any of the ~1,230 proposed phrases.** Every worker reported
   this independently. All target text is composed by following patterns already in each course.
   Highest risk, in order: the **133 Austrian/Swiss German** rows (derived purely by pattern-matching,
   six constructions dropped rather than guessed); the **Egyptian and Levantine Arabic** rows; the
   **~15 Korean stacked-adverbial** rows, where the adverb-order convention is derived from the
   existing 153 rows, not from an authority.
2. **ZUT was checked against seeds 1-10 only** — the brief's scope. A proposed `known_text` could
   still clash with a phrase in seeds 11+. This is unverified for **every** course.
3. **The ZUT check is string-level, not semantic.** It would not catch a near-synonym clash.
4. **Audio cost is unquantified.** No worker queried `course_audio`. ~1,230 new rows imply a
   substantial TTS backlog, and nobody can currently say how large. **Cost this before approving.**

### 10.2 Unresolved questions inside individual courses

- **`ita_for_eng`** — `sto per` read as "I'm about to", which is narrower than "I'm going to". If
  that reading is wrong, ~15 rows need rewording. Could not be settled from the data.
- **`ara_for_eng`** — MSA vowelling is inconsistent in the existing rows (`الآن` vs `الآنَ` for the
  same lego). Proposals copy each lego's stored form verbatim, so some inherit the inconsistency.
  The canonical convention is unknown.
- **`ara_eg_for_eng`** — `لو` for "if" after "not sure" follows the course's existing convention, but
  that convention was not verifiable.
- **`deu_ch_for_eng` S2L2 p7** — `ich versuech z Schwiizerdütsch rede` strands `z` before the object,
  against every other `versueche` frame in the course. The proposal follows the dominant pattern and
  leaves p7 alone. **If you judge p7 correct rather than anomalous, six proposed rows need re-cutting.**
- **`deu_for_eng`** — two `⚠︎infix` rows ("I want to learn how to speak German") require splitting a
  lego's target, because German fronts the object. Natural and high-value, but not a straight
  concatenation. **Approve or drop explicitly.**
- **`deu_for_eng`** — `as hard as I can` → `mein Bestes` is a loose gloss ("my best"). Proposals stay
  inside that convention; whether it was deliberate is unconfirmed.
- **`fra_for_eng`** — whether `je ne suis pas sûr` being masculine-only is a recorded decision, and
  whether the `m'entraîner à parler` (fra) vs `pratiquer à parler` (fra_ca) divergence is intentional.

### 10.3 Deliberately not attempted

- **No `position` or `lego_count` values are proposed.** Existing positions are non-contiguous
  (suggesting prior deletions) and `lego_count` is corrupt (§2). The write path must derive both —
  do not copy them from this document.
- **No existing row was edited or deleted**, including the clearly defective ones in §6.3 and §8.
- **The `backfill-submit` write path was not re-verified** against the current branch. Per the
  project's own notes it is the only non-destructive way to add phrases to a built seed —
  `/seed/complete` and edit-cascade orphan audio. Confirm before applying.
- **The wider estate was not analysed.** The duplicate check across all courses flags groups in ~90
  courses; most of that raw count will be benign component overlap, but it is unexamined.

---

*End of proposal. Nothing in this document has been applied.*
