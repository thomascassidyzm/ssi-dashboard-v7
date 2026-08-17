# A-134 adversarial refutation — eng_for_sin, five orphaned හැබැයි seeds

**Verdict on the proposal in `docs/a134-sin27-2026-08-17/latelego-proposal-2026-08-17.md`
(branch `fix/sin-late-lego-seeds-2026-08-17`, commit `80f852d2`).**

Everything below was re-derived from the **live database** (`.env.psql` → `DATABASE_URL`),
via a worktree at `80f852d2` with a symlinked `node_modules`/`.env.psql`, using **my own
tokenizer implementation**, independent of the proposal's `latelego-gate.cjs`/`sweep.cjs`.
I re-pulled `course_seeds`/`course_legos`/`course_practice_phrases` for `eng_for_sin` fresh
(668/1300/11719 rows — matches the proposal's denominators exactly).

I am **not a Sinhala speaker**. Where that matters I say so and mark the point UNCERTAIN.

---

## Verdict table

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| 1 | Five seeds' live `known_text` byte-identical to proposal, NFC-stable, `status='released'` | **CONFIRMED** | Live query on 246/426/431/456/464: all five `known_text` strings match the proposal's quoted "before" text exactly, `NFC-stable=true` for all, `status='released'` for all, and `known_audio_id` matches §5's five listed clip UUIDs exactly (5a61a893…, 4414a7a5…, 25496b24…, cb93e237…, 9de7685e…). |
| 2 | `හැබැයි` LEGO debut is 469 and taught nowhere else as bare "but"; `ඒත්` debuts at 19 as the course's only standalone "but" | **CONFIRMED** | `select ... where known_text like '%හැබැයි%' or components::text like '%හැබැයි%'` returns **exactly one row in the whole course**: seed 469 lego 2, `components:[{known:'හැබැයි',target:'but'}, ...]`. Same query for `ඒත්` returns seed 19 lego 4 (`known_text='ඒත්'`, `target_text='but'`, bare, `components:[]`) as the earliest, plus 517/537/539 later — no earlier hit. |
| 3 | Substitution takes breach count 1→0 for all five seeds; the repo's known-side gate is inert for Sinhala | **CONFIRMED** | My own from-scratch tokenizer (NFC, whitespace-split, edge-punctuation-stripped, ZWJ kept) built independently of the proposal's script reproduces: BEFORE = 1 breach/seed (`හැබැයි@469`) for all five; AFTER (proposed text) = 0 breaches for all five. Also directly ran `services/course-builder/lib/validation.cjs`'s `tokenizeKnown` (`split(/[^a-z']+/)` on lowercased text) against all five live strings → `[]` every time, confirming it is inert for Sinhala (0 tokens, so it can never flag or clear anything here). |
| 4 | The coherence cost is correctly characterized ("four of their own drill phrases still say හැබැයි") | **CONFIRMED-WITH-CORRECTION, and DO-NOT-SHIP-ALONE** | The proposal undercounts its own finding. Live count of practice-phrase rows containing exact token `හැබැයි` *within these five seeds*: **9 rows across all 5 of the 5 seeds** (246: 4 rows, 426/431/456/464: 1 row each) — not "four." One of them (seed 246, lego 2, position 6, `use`) is a **near-verbatim match of the seed's own current text**: `"මම ඇයට උදව් කරන්නයි ඕනේ කළා හැබැයි ඇය ගොඩක් බිස්ස"` vs the seed `"ඔයාව උදව් කරන්නයි මම ඇයට ඕනේ කළා, හැබැයි ඇය ගොඩක් බිස්ස."` — same clause, same word for "but." After the proposed fix, this seed's own culminating drill phrase would still assert `හැබැයි` for "but" one step before the seed prompt asserts `ඒත්` for the same slot. **My independent ruling, argued against the proposal's neutral framing:** before the fix, seed 246 is *internally consistent* (prompt and drills agree on `හැබැයි`, even though that agreement is itself off the taught path). After the fix as scoped, seed 246 becomes *internally contradictory* — its own drill sequence teaches one word for "but" and its own headline prompt asserts a different one, in the same seed, moments apart. A self-contradiction inside one seed's teaching unit is a worse learner-facing defect than a known-side breach that at least agrees with itself and that the repo's own gate cannot even detect (point 3). I recommend **against shipping the five seed-prompt edits in isolation**: either bundle the ≥9 in-seed drill-phrase edits into the same pass (accepting the audio-render cost the proposal already flags as a real trigger on `course_practice_phrases`), or hold the whole thing. **Gap:** I have not traced the player runtime to confirm the actual within-seed presentation order (drills before or after the headline prompt) — I'm reasoning from row `position` order in `course_practice_phrases`, not a verified UI trace. |
| 5 | Mid-sentence `ඒත්` after a comma is natural Sinhala, attested at 56/69 phrase rows and seeds 41/64/73/112 | **CONFIRMED (counts) / UNCERTAIN (naturalness — not a Sinhala speaker)** | Live count: 69 phrase rows contain `ඒත්`, 56 are non-string-initial ("mid-sentence" by the proposal's definition) — matches exactly. Seeds 41/64/73/112 all exist and use `ඒත්` mid-sentence exactly as quoted; 41 and 73 are comma-then-`ඒත්` exactly as claimed. **I cannot independently judge whether the resulting five sentences read as natural Sinhala** — I have no linguistic basis to confirm or refute grammaticality beyond structural attestation. Flagged as an **explicit gap**, not silently passed. |
| 6 | No new ZUT collision (same known_text, different English) after the substitution | **CONFIRMED** | For each of the five proposed post-fix `known_text` strings, queried `course_seeds`, `course_legos`, `course_practice_phrases` for an exact match — **zero hits in all three tables for all five strings**. No collision introduced. |
| extra 1 | Seed 246 word-order divergence from its own USE phrase L1p7 — leave flagged, don't fix | **CONFIRMED the divergence is real; UNCERTAIN on the "free word order, leave it" ruling** | Live: seed 246 known_text starts `ඔයාව උදව් කරන්නයි මම ...` (object-first); L1p7 (`use`) is `මම ඔයාව උදව් කරන්නයි ...` (subject-first) — same lego, same semantic content (`target_text` "I wanted her to help you"), different constituent order. The divergence is real and exactly as described. I have no independent basis (not a Sinhala speaker) to rule whether Sinhala's free word order genuinely licenses this without confusing a learner mid-lego, so I don't overturn the proposal's LOW-confidence "leave it flagged" call — but I don't confirm it as *safe* either. **UNCERTAIN, flagged as gap.** |
| extra 2 | Sibling-sweep audit: spot-checked 271/`අපේ`, 262/`කවුද`, 230/`කැමැති`, plus 257/`ලෙයිකයි` | **CONFIRMED with one real correction** | **230/`කැමැති`:** confirmed — only teaching of any related form is `කැමැතියි` ("likes") at seed 239, a stem relative not an exact match; seed 230's bare `කැමැති` has zero exact prior teaching anywhere. Class-A designation and gap=9 hold. **262/`කවුද`:** confirmed teach@283 is the only exact occurrence of bare `කවුද` in the whole course; proposal's gloss "who" vs. the live lego's gloss "which" is a benign difference (කවුද covers both senses as a person-interrogative in different frames — seed 262 "Who was that man…", seed 283 "Which of your friends…"), not a defect. **271/`අපේ`:** teach@454 is confirmed as the earliest *exact* match — but I found a candidate near-miss the sweep didn't surface: seed 398 has a lego glossed "our children" spelled `අපිේ ළමාවිල`, i.e. `අපිේ` not `අපේ` — an orthographically anomalous form (looks like a doubled vowel sign, possibly a typo for `අපේ` or `අපිගේ`). If that's genuinely the same word misspelled, 271's real gap shrinks from 183 to 56 and the sweep undercounts an earlier exposure; if it's a distinct word or a database typo, the sweep is unaffected. **Declared gap — I can't resolve Sinhala orthography questions myself; this needs a Sinhala-literate check**, and it doesn't touch the five seeds under repair either way. **257/`ලෙයිකයි` ("like," not one of the three requested but checked because §3 flags it as "heavily drilled" — worth the extra look):** the proposal states in §3 that "the other eight [Class A siblings] do not have an identified earlier-taught equivalent." **This is false for 257.** English "like/would like" is already taught well before seed 257: `මට ආසයි` → "I'd like" (seed 11), `මට ආසා නෑ` → "I wouldn't like" (seed 12), `මට කැමති නෑ` → "I don't like" (seed 27). Whether `ලෙයිකයි` (a colloquial English loanword, "layikai") is truly interchangeable with `ආසයි`/`කැමති` for this course's register is a Sinhala judgement I can't make, but the proposal's blanket claim that *no* Class-A sibling has an earlier-taught equivalent is not accurate as stated — by the proposal's own stated bar for fixing ("requires an earlier-taught word for the same concept to substitute in"), 257 should at minimum have been discussed, not folded silently into "no fix possible." Also: rerunning the proposal's own sweep script fresh against a live pull taken right now gives 1,106 tokens / 176 flagged (proposal: 1,105 / 179) — a small drift, but the **material number (25 tokens with a real teach point and an early use in 201–668) reproduced exactly**, so the sweep's core finding is not undermined by this drift; noting it for completeness. |

---

## Overall recommendation

**DO NOT SHIP the five-seed substitution as currently scoped.**

Points 1, 2, 3, and 6 are cleanly CONFIRMED — the known_text quotes, LEGO debuts, breach-count
arithmetic, and ZUT-safety of the isolated seed-prompt edit are all sound, independently
re-derived. The gate-inertness claim is also confirmed.

But point 4 is where this collapses on its own terms, not on a technicality: the proposal's own
declared "explicit gap" — leaving the in-seed drill phrases untouched — is bigger and more
consequential than the proposal states (all 5 seeds affected via 9 phrase rows, not "four," and
one of those rows is a near-verbatim echo of the seed's own text). Shipping only the seed-prompt
half converts a known-side breach that at least agrees with itself into a self-contradicting
seed. The methodology rails in this repo's own CLAUDE.md require the known side be "a controlled
language too" — a fix that makes the seed's own teaching sequence internally incoherent doesn't
satisfy that spirit even though it clears the (inert-anyway) automated gate.

**Recommendation: either (a) bundle the ≥9 in-seed practice-phrase edits into the same pass before
shipping anything — accepting the audio-render cost the proposal already scopes for the seed
side — or (b) hold this fix entirely** until that companion work is planned. Shipping the seed
side alone, as proposed, should not proceed.

Separately: the sibling-sweep audit (extra 2) surfaced a real correction — `ලෙයිකයි` (257) likely
does have an earlier-taught equivalent for "like," contradicting §3's blanket claim about the
other eight Class-A siblings — worth a second pass on the sweep's classification before it's used
to justify *not* fixing anything else.

### Explicit gaps (not papered over)
- I am not a Sinhala speaker: naturalness of mid-sentence `ඒත්` (point 5) and the safety of seed
  246's free word order (extra 1) are structurally verified but linguistically UNCERTAIN.
- I have not traced the player runtime to confirm within-seed presentation order of drills vs.
  headline prompt (point 4) — reasoning is from `course_practice_phrases.position` order only.
- Seed 398's `අපිේ` orthography (extra 2) is unresolved — could be a typo or a genuine earlier
  "our," and I can't tell which from the DB alone.
- I did not re-sweep the ~11,719 practice phrases course-wide for the same late-LEGO defect
  pattern (the proposal declares this gap too, at §3's close — I did not close it either, beyond
  the seed-local check in point 4).

No database writes were made. Nothing here has been applied.
