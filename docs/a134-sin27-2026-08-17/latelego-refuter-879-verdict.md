# A-134 third independent adversarial refutation — eng_for_sin 20-row plan

**Target:** `scripts/a134-latelego/plan.cjs` (20 rows: 7 seeds + 12 phrases + 1 spelling fix),
staged on branch `fix/sin-late-lego-seeds-2026-08-17` (commit `80f852d2`), as extended in response
to refuter #872's DO-NOT-SHIP-on-completeness ruling on the 18-row plan.

**Method:** own worktree (`.worktrees/a134-refute3`, detached at `80f852d2`), symlinked
`node_modules`/`.env.psql`/`.env`, live `DATABASE_URL`, own probe scripts
(`scripts/a134-refute3/probe1.cjs`, `probe2.cjs`) plus the target's own `gate18.cjs`/
`preflight-full.cjs` re-run fresh (not trusted from a prior log — executed live in this session).
Read-only throughout. No database writes were made, nothing applied.

**I am not a Sinhala speaker.** Points depending on linguistic judgement (grammaticality of the
concessive construction, register) are marked UNCERTAIN.

---

## Verdict table

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| **1. Seed 165** | 1 breach→0; 0 of 11 own drill phrases contain හැබැයි; clip shared with nothing; no existing clip holds the new text | **CONFIRMED, all four sub-claims** | Live: `known_text` = `හැබැයි ඒ ඇත්ත කියලා මට විශ්වාස නෑ.` exactly, no drift. `gate18.cjs` (my own re-run): before=1 breach (`හැබැයි@469`), after=0. Own SQL: 11 practice-phrase rows for seed 165, **0** contain exact token `හැබැයි`. Clip `8d3b7717-…` is linked from **exactly one** row course-wide (seed 165 itself) — no seed, phrase, or lego shares it. `normalize_text()` of the proposed new text (`ඒත් ඒ ඇත්ත කියලා මට විශ්වාස නෑ.`) matches **0** existing `course_audio` rows. |
| **2. Seed 178** | (a) byte-identical to live L2p6; (b) gate 4→0; (c) legitimacy of whole-sentence adoption; (d) honesty of "same sentence" claim; (e) word order — all 7 L2 use phrases put the concessive clause first | **(a) CONFIRMED (b) CONFIRMED (c) CONFIRMED, with a scope caveat (d) CONFIRMED (e) REFUTED on the count, CONFIRMED on the pattern** | **(a)** Live `s178L2p6.known_text` = `"ඔයාව දකින්න ඕනේ වුණත්, මට වෙලාවක් තිබුණේ නෑ"` — `===` the plan's proposed `new_text`, exact string equality, confirmed in code, not eyeballed. **(b)** My own tokenizer against live `course_legos` reproduces the before-state exactly: `ඔයාව→178`(own), `දකින්න→178`(own), `ඕනේ→1`, `වුණා→107`, **`හැබැයි→469`**, `මම→1`, **`ළඟ→358`**, **`ටයිම්→279`**, **`නොතිබුණා→NEVER`** — 4 flagged tokens, exactly as claimed. `gate18.cjs` confirms after-state = 0 residual. **(c) Argued against, then ruled:** the brief that spawned this pass asked for a one-word `හැබැයි→ඒත්` substitution; this is instead a full-sentence replacement that drops the "but" word entirely and restructures the clause order, wholesale-adopting a different lego's phrasing. That is materially more than the mandate as literally stated, and if it were silent or undisclosed I would refute it as scope creep. It is not silent — the plan documents the divergence in detail and the brief itself surfaces it as "the one that matters most." There is also a direct, already-shipped precedent for exactly this move: seed 181 (verified independently in `docs/a134-sin27-2026-08-17/…verification…md`, commit `831151a1`) spliced in its own use-phrase's Sinhala verbatim with only a connective prepended, and that was confirmed clean. On balance: **legitimate, given (i) the seed is otherwise unfixable by simple substitution (4 breaches, not 1), (ii) the replacement text is the course's own attested teaching, and (iii) it is disclosed, not smuggled** — but I record this as the correct call *because* it was surfaced loudly, not because whole-sentence replacement is a rubber stamp in general. **(d)** Live `target_text`: seed = `"I didn't have time, although I wanted to see you."`, L2p6 = `"I didn't have time although I wanted to see you"` — differ by exactly one comma and the terminal period, every other word identical. This is the *same shape* of divergence (case/punctuation only) that seeds 181/207/261 carried and were independently confirmed clean for in `831151a1` (e.g. 207: differs by "leading capitalization and terminal period"; 261: "differ... only by terminal period"). Calling them "the same sentence" here, **with the comma/period difference stated plainly** (as this brief does), is consistent with that precedent, not a repeat of an overstatement — the #850/181 case that needed self-correction was one where the *claim* omitted the punctuation difference, not one where punctuation differences were themselves disqualifying. Disclosed, therefore honest. **(e)** Live count of seed 178's `lego_index=2` rows by `phrase_role`: `build=3, component=2, use=5`. **The claim of "7" use phrases is wrong — there are 5, not 7** (even build+use together is 8, not 7; no natural subset of the row set equals 7). REFUTED on the number. The *pattern* claim survives: all 5 `use` rows (positions 6–10) and all 3 `build` rows (positions 3–5) put the concessive clause (`ඔයාව දකින්න ඕනේ වුණත්`) first — checked every row's leading substring myself. So the adopted word order genuinely is the course's own attested pattern; only the headcount in the brief is off. |
| **3. Reused clip** | S3 bytes: 39,168 B live; duration_ms 3240 vs ffprobe 3204; z=-0.79; tail -88.4 dB; 9/9 tokens; `file_size_bytes` NULL — does it matter? Safe/ZUT-conformant to share with s178L2p6? | **CONFIRMED — exact numbers reproduced; NULL is a real but non-blocking data-quality gap; sharing is safe and ZUT-conformant** | Independently re-ran `gate-existing.cjs` in my own worktree (fresh `GetObjectCommand`/`HeadObjectCommand` against the live S3 bucket `ssi-audio-stage`, not read from a cached log): `S3 ALIVE: 39168B (db file_size_bytes=null)`, `gates: PASS all 7`, `ms=3240 ffprobe=3204 z=-0.79 tail=-88.4dB tokens=9 headword=true fulltext=true` — **matches every number in the claim exactly**. `file_size_bytes IS NULL` on this row: grepped every consumer of that column in the codebase — it feeds a cosmetic `fileSize` field in `api/production/[courseCode]/audio-metadata.js` and a rollback-snapshot field in `audio-repair-core.cjs`'s repair-candidate swap flow. Neither path is touched by this apply (`apply2.cjs` never reads `file_size_bytes` for a reused clip — the reuse branch skips the insert entirely). **Real gap, zero blocking effect on this plan**; worth a follow-up backfill, not a blocker here. Sharing: seed 178's `target_text` and `s178L2p6`'s `target_text` differ only by comma/period (see point 2d) — the same non-breaching divergence class already accepted course-wide for 181/207/261 pairs, so linking both rows to one clip under near-identical English is safe and ZUT-conformant, not a new violation. |
| **4. Seed 426 ZUT decision** | Pre-existing divergence: seed target "would like to" vs phrase target "want to"; disclose-and-leave vs must-fix; verify S0426L02 vs L2p2 gloss contradiction | **CONFIRMED (divergence + internal gloss contradiction) / "disclose and leave" is the defensible call, not a ducking** | Live: seed 426 `target_text` = `"They would like to love each other but they're unhappy."`; `s426L3p6.target_text` = `"they want to love each other but they're unhappy"` — confirmed real divergence, not punctuation-only (want ≠ would like). `S0426L02.target_text` = `"they want"` (the LEGO card's own headline gloss for `ඕනේ`), while its own component `s426L2p2` glosses the identical word `ඕනේ` as `"would like"` — **confirmed, the course already contradicts itself on this word one level down**, independent of this plan. Checked the relevant trigger directly (`null_phrase_audio_on_text_change` on `course_practice_phrases`): editing a phrase's `target_text` fires `NEW.target1_audio_id := audio_id_for_text(...)` / `target2_audio_id := audio_id_for_text(...)`, which **does** pull target-audio into scope (silently NULLs the link if no matching clip exists) — confirms claim (ii) exactly; `course_seeds` carries no equivalent trigger, so a seed-only edit wouldn't, but making seed and phrase agree requires touching at least one `course_practice_phrases.target_text`, which does. **Ruling:** given (i) the divergence predates this plan and isn't created by it, (ii) the course's own LEGO card already disagrees with its own component gloss on this exact word — so "fixing" 426 would require picking a side in an ambiguity the course hasn't resolved anywhere else either, and (iii) fixing it pulls target-audio rendering into an already-scoped-tight pass — **disclose-and-leave is the right call for this ship, not a ducking**, provided the ship record states it as plainly as this brief already does. I do not rule that it must be fixed before shipping. |
| **5. Apply script sequencing (`apply2.cjs`)** | Uploads+inserts (with `s3_key` set) before any `known_text` UPDATE; verifies post-state rather than trusting explicit `known_audio_id`; rolls back on mismatch; never deletes old clips | **CONFIRMED, no ordering bug found** | Read the script directly (not summarized): Step 2 mints `{id,key}` per clip and — when `--apply` — calls `PutObjectCommand` then `HeadObjectCommand` to confirm byte-length, **entirely before the transaction opens**. Step 3 opens `BEGIN`, and its **first** loop `INSERT INTO course_audio (...)` sets `s3_key` from the already-uploaded key for every non-reused clip — **before** the second loop's `UPDATE course_seeds`/`UPDATE course_practice_phrases` statements run. This is the correct order for `audio_id_for_text`'s `s3_key IS NOT NULL` filter (the exact hazard #872 flagged). The explicit `known_audio_id=$2` in each UPDATE is **not** trusted — step 4 re-reads `known_audio_id` for every phrase row after the trigger fires and re-asserts it if the trigger's recompute landed on something else, and step 5 re-selects every one of the 20 rows and asserts both `known_text` and `known_audio_id` match the intended new values, calling `ROLLBACK` and throwing on any mismatch anywhere. Grepped the whole file for `delete`/`DELETE`: the only hit is the comment at line 11 stating deletion is deliberately **not** done. Also independently re-ran `preflight-full.cjs` fresh in this session: `drift=false` on **all 20 rows**, blast-radius check prints nothing (every old-clip link is inside the plan), 20 rows → 16 distinct clips (15 to render + 1 reuse) — matches the script's own accounting exactly. **No ordering bug found.** |

---

## Overall: **SHIP** the 20-row plan

Every mechanical claim across all five points reproduced exactly against the live database and
live S3 bytes, independently, using my own queries and my own tokenizer where a gate was involved.
The two prior refuters' objections are both closed: #870's self-contradiction (seed vs. its own
drills) is cured by bundling the phrase edits; #872's completeness objection (165/178 missing) is
now closed — both are in the plan, both verified clean, and seed 178's harder 4-breach case is
handled correctly (verbatim adoption of the course's own attested phrase, gated on real S3 bytes,
correctly sequenced against the audio-relinking trigger).

The one real correction I found: the brief's claim that "all 7 of seed 178's L2 use phrases put
the concessive clause first" overcounts — there are **5** use-role phrases at that lego_index, not
7 (8 if build rows are folded in, still not 7). The *word-order pattern itself holds* for every one
of those 5 (and for the 3 build rows too), so this doesn't touch the substantive claim, but the
number in the brief should be corrected to 5 before it's repeated elsewhere.

Two items are genuine, disclosed-not-hidden judgement calls, not defects, and I record my
independent agreement with the plan's own posture on both:
- **Seed 426's target_text divergence** ("would like to" vs "want to") is real, pre-existing, and
  the course already contradicts itself on the same word one level down (LEGO gloss vs. component
  gloss) — disclose-and-leave is defensible, not a dodge, given fixing it would mean picking a side
  in an ambiguity the course hasn't resolved anywhere else and would pull target-audio rendering
  into scope via a confirmed trigger.
- **Seed 178's whole-sentence replacement** exceeds "one-word substitution" as literally briefed,
  but is legitimate given the seed cannot be fixed by simple substitution (4 breaches, not 1), the
  replacement is the course's own already-taught phrase, there's a shipped precedent (seed 181) for
  the identical technique, and it is loudly disclosed rather than smuggled in under a substitution
  label.

### Explicit gaps (not papered over)
- **Not a Sinhala speaker.** Cannot independently judge whether `ONEE wunath` genuinely carries
  "although" without any separate "but" word, or whether adopting L2p6's word order for seed 178 is
  natural/expected to a learner mid-seed. Structurally verified; linguistically UNCERTAIN.
- `file_size_bytes IS NULL` on the reused clip (point 3) is a real, disclosed, non-blocking data
  gap — I traced its only two consumers in the codebase and confirmed neither is on this apply's
  path, but I did not backfill it or investigate why the original render never populated it.
- I did not re-verify seed 230's spelling-fix row (point 3 of #872's table) independently in this
  pass — it was CONFIRMED at exact-token granularity by #872 and I did not find reason to re-open
  it; my own `gate18.cjs` run reproduces its 2→1 residual (`කෙනෙකු@370`) exactly, consistent with
  that prior finding, but I did not re-derive its counts from scratch the way I did for 165/178.
- Did not trace player runtime presentation order for any of the 20 rows (same gap #870/#872
  declared) — reasoning is from row `position`/`lego_index` order only.
- Did not re-sweep the full ~11,719 phrases for further undiscovered instances of this defect
  pattern beyond what #872 already surfaced and this plan now covers.

No database writes were made. Nothing here has been applied.
