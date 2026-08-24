# A-135 refutation — kor-39-plan.json (eng_for_kor known-side repair)

**Role:** adversarial refuter, read-only. Nothing written to the DB, nothing rendered, nothing committed.
**Scope:** the 39-row plan in `kor-39-plan.json` — 37 patches + Kai's 2 ruled deletions (`S0298L01U04`, `S0300L01U03`).
**Method:** every claim below was **re-derived from the live DB**, not read off the prior report. Queries are in `refute-zut-check.cjs`, `refute-debut-check.cjs`, `refute-adj-check*.cjs` in this same directory.

## Overall verdict: **APPLY-WITH-CHANGES**

37 patches minus 3 refuted (`S0300L02U02/U03/U04`) minus 1 changed (`S0284L01U06`) minus 1 changed (`S0290L01U05`) = **32 apply as-is**, **2 need reworded text before shipping**, **3 need a native check or a rewrite before shipping — do not patch these three with the current text**. Both deletions are confirmed correct and confirmed safe (see §5). The overwrite verdict holds and is now on firmer ground (see §6).

**Row counts:** 39 total → 32 `ok`, 2 `change`, 3 `refuted`, 2 `ok` (deletion ruling confirmed).

---

## 1. Meaning fidelity

Checked every proposed Korean against the English `target_text` it must elicit. No dropped `only`/`still`/`together` found — every `만` (only) and `함께` (together) in the S0280/S0282 cluster is present and correctly placed.

**One thing that looks like a drop but isn't:** `S0040L01U04` and `S0040L01U05` both drop "at the moment" from the Korean (`영어로 말하는 것에 대해 기분이 어때요?` has no word for "at the moment"). I checked this against the course's own lego `S0040L01` (`기분이 어때요?` ↔ *"how do you feel **at the moment**"*) and its siblings (`지금 기분이 어때요?` ↔ *"how do you feel at the moment **now**"* — note "now" and "at the moment" stack in the English gloss without a second Korean word for either). **The whole course's convention is that "at the moment" is baked into the `기분이 어때요?` frame and never gets an independent Korean token.** These two rows are consistent with that convention, not a fidelity defect. Flagging it because it's exactly the failure shape the brief asked me to hunt for, and it deserved verification, not a pass on sight.

No other meaning-shift or paraphrase issues found among the 37, beyond the two the plan itself is deleting (§5) — those two ARE genuine near-paraphrases and that's the right call.

**Verdict:** no meaning-fidelity refutations among the 37 patches.

---

## 2. ZUT — re-derived independently

I rebuilt the check from scratch (`refute-zut-check.cjs`): pulled every `eng_for_kor` `course_practice_phrases.known_text`/`target_text` and every `course_legos.known_text`/`target_text`, normalized with the DB's own `normalize_text()` (lower/trim/strip trailing punctuation), and checked all 37 proposed strings against that set and against each other.

**Result: confirmed independently — 0 forks, 0 collisions among the 37, and the only two hits are the expected recovered-duplicate matches** (`S0282L01U01`/`U02` against BUILD siblings `S0282L01B03`/`B02`, same English both sides — duplication, not a fork).

**Near-miss semantic check (strings differ, meaning doesn't):** I spot-checked the highest-density clusters (S280, S282, S288, S292, S294, S296, S298, S300 — every seed with ≥3 of the 39) for two Korean sentences that would read as the same prompt to a learner but want different English. Found none beyond the already-flagged `S0298L01U04` (see §5). I did **not** exhaustively pairwise-compare all 5,408 phrase rows for semantic near-duplication — that's a fuzzy-match problem outside what I can do reliably without a Korean speaker, and I'm reporting that as a gap rather than a clean bill.

**Verdict:** ZUT re-derivation matches the report's claim exactly.

---

## 3. Controlled known side — found 3 the prior worker missed, confirmed 2 they caught

I re-derived debut seeds directly from the DB (`refute-debut-check.cjs`, `refute-adj-check*.cjs`) rather than trusting the plan's `source`/`confidence_reason` fields.

**Confirmed the prior worker's own catch:** `S0290L01U05` uses `알아야 해요` ("need to know") which does not exist anywhere in the course (lego or phrase) before **seed 293** — 3 seeds after this row's seed 290. Their "medium" label undersells it: the piece isn't attested *at all* at the row's own seed, not just "shown once elsewhere." **Downgrading to `change`** — recommend rewording around the attested `알고 싶어요` ("want to find out", attested since S17) frame instead of `알아야 해요`, e.g. `저는 누가 답을 알고 있는지 알고 싶어요`, which shifts "need to" → "want to" but stays inside the course's controlled Korean at S290. Flagging the modal shift so a human signs off on it rather than shipping it silently.

**Found and NOT caught by the prior worker — three genuine unattested-form violations, all in the S0300L02 lego:**

The lego's frame is `Adj-게 보이고 싶어하지 않아요` ("doesn't want to seem Adj"). At seed 300 itself the course establishes this frame with exactly two adjectives: `불친절하게` (unfriendly-ly) and `조용하게` (quiet-ly) — both appear in BUILD rows in the same lego. The plan substitutes three *other* adjective stems into the same frame:

| row | adjective substituted | `-게` adverbial form anywhere in the whole course (any seed, any role)? |
|---|---|---|
| `S0300L02U02` | 어렵다 (difficult) → `어렵게` | **zero hits.** Only `어렵지 않아요` (predicate negative, "not difficult") is attested, from S66 — a different morphological form. |
| `S0300L02U03` | 피곤하다 (tired) → `피곤하게` | **zero hits.** Only the predicate `피곤해요` ("I'm tired") is attested, from S26/39 — never the `-게` adverbial. |
| `S0300L02U04` | 긴장하다 (nervous) → `긴장하게` | **zero hits.** `긴장하다`/`긴장하고`/`긴장하면`/`긴장했어요` are all attested from S147 — every inflection *except* `-게`. |

This isn't "a form a native might prefer differently" (which is how the plan frames `S0300L02U02` and `S0300L02U04` — it doesn't flag `S0300L02U03` for anything at all). It's the course asking the learner to produce a Korean word-form they have never once been given, in any of these three cases. `불친절하게`/`조용하게` generalize the `-게` derivation productively *if* the learner has internalized it as a rule rather than three memorized chunks — but SSi's own doctrine (`ralph-methodology.md`, "known side is controlled") is "never use known-language words/structures the learner hasn't been given," not "assume productive-rule generalization is safe." Treating three built rows as license to freely re-derive `-게` on any adjective is exactly the kind of drift the brief is designed to catch.

**Verdict: `S0300L02U02`, `S0300L02U03`, `S0300L02U04` → `refuted`.** `S0300L02U01` (reuses the attested `불친절하게`) is fine.

I spot-checked the remainder of the 37 (seed-40, S280, S282, S284, S288, S292, S294, S296, S298 clusters) for the same failure shape — substituting an un-debuted word-form into an attested frame — piece by piece against `course_legos`/`course_practice_phrases` filtered by seed. All cleared (attested by the row's own seed). I did not do this for every single lexical item in every row; the clusters above are where the plan itself signaled composition risk (`medium`/`low` confidence) and where the risk materialized.

---

## 4. Native-speaker plausibility (explicit gap + one finding)

**I am not a Korean speaker and cannot certify naturalness.** Where I have a specific, checkable objection, I've raised it above as a controlled-language finding rather than a vague "sounds off." Everywhere else, treat my "ok" as "conforms to the course's own controlled Korean," not "a Korean speaker approved this."

One additional, checkable finding beyond §3: `S0284L01U06` — `저는 당신이 제 여동생 친구를 만나면 좋겠어요` for *"I would like you to meet my sister's friend."* The plan's own `confidence_reason` names the risk (*"a native might prefer 만났으면 좋겠어요"*) but keeps the present-tense form anyway. I checked the actual precedent: the course's `-(으)면 좋겠어요` frame is well attested with the **ability modal** `수 있으면` directed at another person (*"더 천천히 말할 수 있으면 좋겠어요"* = "if you can speak more slowly that would be great", S90 and others) — but the **sole** precedent for a **bare action verb** aimed at someone else's action, `S177`'s `어디 가고 싶은지 말해줬으면 좋겠어요`, uses the **past-tense conditional** (`-았/었으면`), not present. The proposal breaks with its own only precedent. **Change to `저는 당신이 제 여동생 친구를 만났으면 좋겠어요`.**

Pressure-testing the two the prior worker doubted:
- `S0300L02U02` (`어렵게 보이고 싶어하지 않는다고 생각해요`) — agree it's weak, and now have the harder controlled-language reason above (§3). Refuted, not just downgraded.
- `S0300L02U04` (`긴장하게 보이고`) — same call, same reason (§3). Refuted.

The confidence labels in the plan measure conformance-checking the authors did, not naturalness — that's stated honestly in the report and I have no basis to contradict it for the 32 I'm passing. I'd assign `low` (not `medium`) to `S0300L02U02`, `U03`, `U04` if they were to ship as-is, but my recommendation is don't ship them as-is at all.

---

## 5. The two deletions — confirmed correct, and confirmed safe

**Duplicate claims — verified directly, not by reading the report:**
- `S0300L01U03` (`그녀가 불친절해 보여서 놀랐어요` / *"I'm surprised that she seems unfriendly"*) — queried seed 300 directly; `S0300L01U05` carries **byte-identical** `known_text` and `target_text`, phrase_role `use`. Confirmed: repairing `U03` would put the same USE card in the eternal SRS pool twice.
- `S0298L01U04` (target *"when I'm tired I've got nothing left to say"*) — queried seed 298 directly; the existing `use` row `피곤할 때 저는 할 말이 없어요` has target `"I've got nothing left to say when I'm tired"` — the **same English, reordered**. Any faithful Korean for `U04` collapses onto the same clause shape as this sibling. Confirmed: this is a ZUT-fork-in-spirit, deletion is the right call.

**Progress-stranding check — this is the part nobody asked, so I ran it properly:**

The learner-progress mechanism for this course tracks at the **lego** level (`lego_progress`, with an `eternal_urn` jsonb column that IS the "eternal spaced-repetition pool" the report's own reasoning invokes) and the **seed** level (`seed_progress`), not per individual `course_practice_phrases` row. I checked all of it against `eng_for_kor` directly:

| table | rows for `eng_for_kor` |
|---|---|
| `lego_progress` | **0** (populated for 13 other courses — `eng_for_tam`, `jpn_for_eng`, `deu_for_eng`, etc. — zero for this one) |
| `seed_progress` | **0** |
| `practice_prompts` (course_code='eng_for_kor') | **0** — this course has no rows in the prompt-generation table at all |
| `learner_practice_history` joined to those two phrase ids via `practice_prompts.expected_phrase_id` | **0** |
| `course_progress` | **2 rows** (2 learners "enrolled") — both `legos_seen=0`, `seeds_introduced=0`, `total_practice_minutes=0` |

**Both learners who ever touched `eng_for_kor` never got past enrollment — zero legos seen, zero seeds introduced, for either.** Seeds 298 and 300 are deep into a 668-seed course; nobody has any progress recorded against them, or against anything else in this course.

**Answer: deletion is safe today. No migration is required for these two rows, because there is currently no learner progress in `eng_for_kor` at all to strand.** This is a point-in-time finding, not a standing exemption — the moment this course has real practice activity, the same deletion on a row a learner has actually seen would need the same slot-vs-text scrutiny the pod-migration-protocol doctrine describes for pods (`docs/pods/pod-migration-protocol.md`), even though that specific document is written about pod content, not `course_practice_phrases`. I'd flag to Kai that there's no equivalent written migration protocol for practice-phrase deletion — it currently works only because this course has zero practice history, not because the mechanism is migration-safe by design.

**Verdict:** both deletions confirmed correct on the duplicate-content question, and confirmed safe on the progress-stranding question. `ok` on the deletion ruling for both rows.

---

## 6. The overwrite verdict — re-derived, and one gap the report didn't name

**(a) The `created_at` cluster claim — reconfirmed exactly.** `min(created_at)`/`max(created_at)` over `eng_for_kor` phrase rows where `known_text = target_text` and `created_at::date = '2026-05-14'` returns exactly 39 rows, 21:15:10.216–21:16:02.967. A second, independent query — total rows created that day, and rows created that day with `known_text != target_text` — returns 39 and 0 respectively. **The set "created 2026-05-14" and the set "English on the known side" are exactly the same 39 rows, confirmed directly, not read off the report.**

**(b) A gap the report didn't surface: `updated_at` shows a mass touch on 2026-06-02, invisible to `content_audit_log` (which starts 2026-07-03) — and I checked what it was.** All 39 rows have `updated_at = 2026-06-02T22:36:59.3xx`, ~19 days after creation and 5 weeks before the audit log's coverage begins. This is exactly the scenario the brief told me to test — "a later process rewrote `known_text` without changing `created_at`." I checked whether this touch was selective to the 39 or course-wide: **4,638 of 5,408 `eng_for_kor` phrase rows (86%) were touched at that same 2026-06-02 timestamp**, each at a distinct microsecond consistent with one long batch UPDATE sweeping nearly the whole course. That rules out a targeted rewrite of just these 39 — a script touching 86% of the course uniformly is a maintenance/version-bump pass, not selective content surgery. The `version` column jump the report already noted (all 39 sit at v8 alongside clean February siblings) is consistent with this being that same bulk pass. **This closes the gap the report left open, and the answer is: still no evidence of a rewrite — but the report should have named and closed this gap itself rather than leaving "not touched since 2026-07-03" as the only stated check.** The underlying honesty in the report (§3d: "it can neither confirm nor deny a pre-July Korean value") stands; I'm adding that the mass 2026-06-02 touch, once examined, doesn't change that conclusion, but it needed examining rather than being unmentioned.

**Verdict:** overwrite verdict holds, on slightly firmer ground than the report itself established.

---

## Summary for Kai

- **32 of 37 patches: apply as proposed.**
- **2 of 37: apply with a changed known_text** — `S0284L01U06` (past-tense conditional) and `S0290L01U05` (avoid the unattested `알아야 해요`).
- **3 of 37: do not apply as-is** — `S0300L02U02`, `S0300L02U03`, `S0300L02U04` all substitute an adjective whose `-게` adverbial form has never once appeared in this course. Needs either a native Korean check that the `-게` generalization is safe to ship anyway, or a rewrite using an attested form.
- **Both deletions: confirmed correct and confirmed safe** — zero learner progress exists anywhere in `eng_for_kor` today, so nothing is stranded.
- **Overwrite verdict: holds**, re-derived independently, with one additional gap (the 2026-06-02 mass touch) checked and closed rather than left open.

Full per-row detail: `refute-rows.json`.
