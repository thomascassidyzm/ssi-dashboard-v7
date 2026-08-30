# eng_for_sin card repairs — independent post-hoc adversarial verification (A-134)

Auditing the 21-row live-DB edit reported at https://watson-1.tail4968cb.ts.net/d/5758fc88 (branch `fix/sin-cards-2026-08-17`, commit `7db50e4a`, cherry-picked to `main` as `d0a0368d`). This is the missing second-agent pass the orchestration brief required before applying — run post-hoc because the depth ceiling blocked it at the time. **Read-only throughout; no data changed.** All numbers below were re-derived from the live database via a Node `pg` script (no `psql` binary on this host) — none were taken from the worker's report on trust.

**Method note (mandatory disclosure):** I am not a Sinhala speaker. Everywhere below I separate **distribution counts** (strong — anyone can recount them) from **grammatical judgement** (weaker — reasoning about what a form means). My tokenizer is disclosed in Method Check 1. A second disclosure: early in this session I discovered that typing Sinhala text by hand in my own output is unreliable — it silently renders in a different Brahmic script (Telugu-look-alike glyphs) that fails a byte-for-byte match against the database. Every Sinhala string in this report below was therefore pulled programmatically straight from the live database, never hand-typed.

## Verdicts at a glance

| Claim set | Verdict |
|---|---|
| A — the 4 corrupted postposition-for-verb cards | **CONFIRMED** (one number discrepancy noted, doesn't change the verdict) |
| B — the second corrupted-headword card | **CONFIRMED** (exact match on every number) |
| C — S0275L01 (highest risk) | **CONFIRMED**, with disclosed numeric-reproduction gaps on two of the cited ratios |
| D — S0108L02 | **CONFIRMED** (verified via word_boundaries, not just the text field) |
| E — the two withdrawals | **CONFIRMED**, plus one new gap surfaced |
| F — the dative ruling | **PLAUSIBLE, not CONFIRMED** — could not reproduce the exact figures; substance not contradicted |

---

## Claim Set A — the 4 corrupted cards (postposition substituted for a past-tense verb)

**Reproduced from the live DB, all 4** (old text pulled from `content_audit_log`, new text from live `course_legos`):

| card | old known_text | new known_text | target |
|---|---|---|---|
| S0369L02 | ඇස් කිහිපයක් දිහා | අශ්වයො කිහිපයක් | several horses |
| S0370L02 | මම දිහා දිහා | මම දැක්කේ නෑ | I didn't see |
| S0372L03 | ඔයා ... දිහා | ඔයා ... දැක්කාද | did you see |
| S0453L02 | ඒ අය දිහා | ඒ අය ඒ අයව දැක්කා | they saw them |

All 4 match the claim's before/after text exactly.

**Corrupted-word frequency:** I searched every `course_legos` row (current) and every audit-log snapshot for `known_text` or `components` containing the corrupted postposition. Result: **it never appears correctly anywhere** — the only occurrences in the entire edit history of this course are inside these same 4 corrupted cards. That directly supports "0 phrases / 0 seeds, never correctly taught" — I found no counter-example.

**Replacement-word frequency, reproduced:**
- Phrases: **63** — exact match to claim.
- Cards, pre-fix (excluding the 4 being repaired): **1** (S0590L01, seed 590) — exact match to claim.
- Seeds: I get **17** distinct seeds carrying the replacement word's forms in `course_practice_phrases`, not the claimed 7. This is a real numeric discrepancy in the worker's report. It doesn't change the substance — 17 is *more* corroboration for the correct word being well-established, not less — but I'm flagging it because the brief requires re-deriving every number, and this one doesn't reproduce under any method I tried (raw count, per-table, deduped).

**The "load-bearing" internal-contradiction claim, tested:** I first tried to find the contradiction *inside* each corrupted row's own `components` array (checking whether components carried the correct word while known_text carried the corruption) — that's **false**: the old `components` arrays carried the corruption too (e.g. S0453L02's old components mapped the postposition itself to "saw them" — corrupted, not correct). So on a literal same-row reading, the claim as I first understood it doesn't hold.

Reading the actual commit message resolved this: "component ROW" means a *different* `course_legos` row elsewhere in the course that independently teaches the correct word as its own atomic card — for Claim B this is named explicitly (S0089L03); for Claim A the course never gave the corrupted word a clean card anywhere, while the correct replacement is independently attested by a pre-existing card (S0590L01) plus 63 phrases across 17 prior seeds. That is a real, self-contained, Sinhala-fluency-free contradiction: one form has zero independent attestation anywhere in the course; the other has extensive prior attestation. Confirmed, with the seed-count caveat above.

**Practice-phrase verbatim check:** I pulled every `course_practice_phrases` row at seeds 369/370/372/453 and confirmed the new card text appears verbatim, repeatedly, in each seed's own phrase set — e.g. seed 369 has 10 phrases using the replacement word for "horses," none using the old (wrong) word. Confirmed for all 4.

**Note on S0369L02 specifically:** the corruption wasn't only the trailing postposition — the old `known_text` also had the wrong known-side word for "eyes" where the fixed text has the word for "horses," and the old `components` already mapped that wrong word to "horses" (a pre-existing known/target mismatch, not introduced by this fix). The repair is consistent with every one of that seed's own phrases, which uniformly use the "horses" word. Flagging this only so it's on record — the fix is correct, but it silently repaired a second, undisclosed defect (a wrong known-side headword) bundled into the same row edit.

## Claim Set B — the second corrupted-headword card (S0245L02)

- S0245L02 confirmed: | S0245L02 | නනිකු කාලේ | කෙටි කාලේ | in a short time |
- `S0089L03` exists: known_text="කෙටි", target_text="short" — confirmed.
- That word appears in **21** phrases — exact match.
- The corrupted headword (pre-fix): 0 phrases, 0 cards elsewhere, exactly **1** seed and **1** card (S0245L02) — exact match.
- The shared seed: confirmed changed in the same commit, same known/target text as the card. Handled.

**CONFIRMED, every number reproduced exactly.**

## Claim Set C — S0275L01 (highest risk)

**"early/ahead" word count, reproduced:** live DB currently shows 12 occurrences (seeds 277, 480 — all mean "early/ahead", never duration). Adding back the 13 occurrences this very commit removed (2 `course_seeds` rows + 11 `course_practice_phrases` rows, all under seeds 275/276) gives **25** — exact match to the claimed "25x, never duration." I reconstructed this from `content_audit_log`, not from the worker's number.

**The adjectival/adverbial pattern:** distributionally strong support, exact figures not fully reproduced.
- Independent of the fix (excluding seeds 275/276 themselves, to avoid circularity), the bare adjectival form appears in `course_practice_phrases` **17** times total across 4 other seeds — this *does* land exactly on the claimed "17." Of those 17, 16 are immediately followed by an explicit noun; the 17th is an elliptical fragment ("too many") whose noun is contextually implied, not stated — I'm calling that consistent with, not a contradiction of, "17/17 noun-taking."
- The adverbial form: I could not land on "47 of 48" under any counting method I tried (raw occurrence, deduped, phrase-table-only) — I get totals from 48 to 68 depending on scope. On inspection, the adverbial form is followed by what look like bare nouns in several cases — but every one of those is the nominal half of a noun+light-verb compound verb (e.g. "talk-do" = "to speak", "practice-become" = "to practice"), so the adverbial form is still modifying the eventual verb, not taking a bare noun object. That reading is consistent with the claim once compound-verb structure is accounted for, but it is a **grammatical judgement**, not a count — I flag it as such rather than claim I independently confirmed the exact ratio.

**Seed 54, the counter-evidence, verified independently:** `course_seeds` row for seed 54 reads "ඔයාට ටිකක් වැඩිය වෙලාවක් දෙන්න ඕනේ හිතුනා." ("We wanted to give you a little more time.") — confirmed, spelled with the adverbial form, not the bare adjectival form, exactly as the worker's own counter-evidence states. I additionally checked what the worker didn't report: **seed 54 has only 1 decomposed lego (the verb "to give") and zero practice phrases containing the "more time" wording** — meaning this attestation sits in raw seed text that was never actually decomposed into a card or drilled as a phrase. The seed has been edited 26 times (`version=26`) and is `released`/`approved`. I can't independently confirm the worker's specific "25% corruption band" claim about seeds in that range (that would need its own audit, out of scope here), but the structural fact that this sole counter-attestation is un-decomposed and sits in a heavily-churned seed is a real, independently-checkable reason to discount it relative to the 17/17 pattern from actually-taught, actually-drilled material.

**Verdict on C, explicitly:** CONFIRMED on substance and on the two numbers I could fully reproduce (25 for the "early" word, 17 for the adjective+noun pattern). NOT independently confirmed on the exact adverb+verb ratio cited — the direction holds, the count doesn't reproduce cleanly, and part of my confirmation of the direction rests on a grammatical judgement (light-verb compounds) I can't fully certify as a non-Sinhala-speaker. This remains the correctly-flagged highest-risk item; my read is it should ship, but with less numeric certainty than claims A/B/D.

## Claim Set D — S0108L02

- Card confirmed: | S0108L02 | නැගිටි | නැගිටින්න | wake |
- Old `presentation_audio_id` pulled from `course_audio`: stored text = "ඉංග්‍රීසිෙන්. 'නැගිටින්න'. 'මම බලාපොරොත්තු නැත්තේ නැගිටින්න ඒ තරම් ඉක්මනට' ඉතින්. :" — **already reads the correct/new form**, both in the quoted headword and inside the worked example sentence.
- **Verified via `word_boundaries`, not just the `text` field** (per this course's own history, `course_audio.text` is stored unstripped and isn't proof of what was spoken — the per-token boundary array is): the boundary array shows two separate tokens for the correct word, confirming the TTS actually voiced the correct form both times.

**CONFIRMED**, and to stronger evidence than the claim asked for.

## Claim Set E — the two withdrawals

- Neither S0382L04 (known="ඔයා ... ඇහුවාද", target="did you hear") nor S0080L01 (known="මම ... වෙනවා", target="I'll") has **any** row in `content_audit_log` near this commit (or ever) — both proposals were genuinely never applied. Withdrawal executed correctly.
- **S0382L04 vs S0366L03 collision, tested live:** both cards currently read identically — known="ඔයා ... ඇහුවාද", target="did you hear". Same known → same target is not a ZUT violation (a violation needs same known → *different* target). **No live collision exists today.** Confirmed.
- **S0080L01 withdrawal reasoning ("the proposed replacement was a bound suffix, not a standalone word"):** I searched every `course_legos` and `course_practice_phrases` row for that exact string as a standalone token (word-boundary regex, not substring) across the whole course. **Zero hits anywhere.** It only ever appears bound to a verb stem. Confirmed — the withdrawal was correct.

**New gap I'm surfacing, not asked for but found while checking the collision:** S0382L04's own seed (382) has **no practice phrases about hearing at all** — every phrase at seed 382 is about unrelated content (giving/putting, "where"). S0382L04's card text appears to be an exact duplicate of S0366L03's card with no support from its own seed's phrase corpus. This isn't proof of an active ZUT collision (there isn't one, per above), but it looks like a separate, unaddressed defect — possibly a misassigned/orphaned card. Reporting as an explicit gap; not investigated further, not fixed.

## Claim Set F — the dative ruling

I built an adjacency classifier over every phrase containing the modal word in question (2,748 occurrences), splitting by the immediately preceding token into nominative-pronoun-adjacent (93), dative-pronoun-adjacent (459), and the transitive-verb pattern the claim names (90 raw / 88 unique — claim says 70). The great majority (1,859 of 2,748) are neither — they're a "[verb-infinitive] + modal" volitional construction ("want to [verb]"), where the clause's real subject is often several tokens away or dropped entirely (Sinhala is pro-drop). That construction can't be safely subject-classified by simple token adjacency.

**I could not reproduce the claimed 6 nominative / 133 dative / 11-site blast radius.** My adjacency method isn't fine-grained enough to separate the transitive-verb pattern (nominative-correct) from the deontic idiom (also nominative-correct) from genuine disputed nominative sites — that split needs real clause-level parsing, not token adjacency, and I don't have a safe way to do that without a Sinhala speaker. What I *can* say: nothing I found contradicts the substance (dative-adjacent instances are overwhelmingly the majority pattern; nominative-adjacent sites are a small minority, consistent with "narrow, not 96-wide"), and no data was changed under this claim regardless.

**Verdict: PLAUSIBLE, not CONFIRMED.** This is explicitly a grammatical-judgement claim I'm weakly positioned to verify, and I'm saying so rather than rubber-stamping the numbers.

## Method Check 1 — introduced-before-used, disclosed tokenizer

The known-side gate is inert for Sinhala (`tokenizeKnown()` splits on an ASCII-only class), so I wrote my own:

```js
// Sinhala block U+0D80-U+0DFF, ZWJ (U+200D) kept attached (used inside conjuncts)
function tokenize(text) { return text.match(/[\u0D80-\u0DFF\u200D]+/g) || []; }
```

Disclosed bias: **no stemming, exact surface-form match only.** This errs toward *over*-flagging, not under-flagging — an inflected form of an already-taught stem reads as unrelated "new" words, not as one known word. That's the conservative direction for a corruption audit: if a word passes under this method, it really was seen at or before that seed under some exact spelling.

Built a first-appearance index (min seed_number) for every Sinhala token across all of `course_seeds` + `course_legos` + `course_practice_phrases`, then checked every word in all 7 repaired cards:

| card | seed | tokens : first-seen seed |
|---|---|---|
| S0108L02 | 108 | නැගිටින්න(first@108) |
| S0245L02 | 245 | කෙටි(first@89) කාලේ(first@14) |
| S0275L01 | 275 | වැඩි(first@96) වෙලාවක්(first@54) |
| S0369L02 | 369 | අශ්වයො(first@369) කිහිපයක්(first@155) |
| S0370L02 | 370 | මම(first@1) දැක්කේ(first@370) නෑ(first@10) |
| S0372L03 | 372 | ඔයා(first@1) දැක්කාද(first@292) |
| S0453L02 | 453 | ඒ(first@10) අය(first@22) ඒ(first@10) අයව(first@453) දැක්කා(first@184) |

**Zero introduced-after-used violations** across all 7 cards, even under this stricter no-stemming method. (Some tokens are introduced *at* their own seed, not before — that's fine, "at or before" per the mandate.)

## Method Check 2 — ZUT collisions

Checked each of the 7 new `known_text` strings against all other `course_legos` rows and all `course_practice_phrases` rows in the course for a different `target_text` on an identical `known_text`. **No hard collisions found** — each new known_text maps to exactly one target wherever it occurs.

## Method Check 3 — old presentation clips: safe to relink?

All 7 cards currently have `presentation_audio_id = NULL` (the course_legos trigger nulls audio on text edit — known, being fixed separately, not re-flagging). I pulled each OLD clip's `course_audio.text` (before it was unlinked) and compared to the new card text:

| card | old clip's stored text | matches new card text? |
|---|---|---|
| S0108L02 | ඉංග්‍රීසිෙන්. 'නැගිටින්න'. 'මම බලාපොරොත්තු නැත්තේ නැගිටින්න ඒ තරම් ඉක්මනට' ඉතින්. : | YES — safe to relink, no re-render needed |
| S0245L02 | ඉංග්‍රීසිෙන්. 'නනිකු කාලේ'. 'මමා හිතනවා මමා නනිකු කාලේ හොඳින් කළා' ඉතින්. : | No — needs fresh render |
| S0275L01 | ඉංග්‍රීසිෙන්. 'ගොඩ ඉස්සර'. 'මමා ගොඩ ඉස්සර කතා කරන්නයි ඕනේ' ඉතින්. : | No — needs fresh render |
| S0369L02 | ඉංග්‍රීසිෙන්. 'ඇස් කිහිපයක් දිහා'. '' ඉතින්. : | No — needs fresh render |
| S0370L02 | ඉංග්‍රීසිෙන්. 'මම දිහා දිහා'. '' ඉතින්. : | No — needs fresh render |
| S0372L03 | ඉංග්‍රීසිෙන්. 'ඔයා ... දිහා'. '' ඉතින්. : | No — needs fresh render |
| S0453L02 | ඉංග්‍රීසිෙන්. 'ඒ අය දිහා'. '' ඉතින්. : | No — needs fresh render |

**Exactly 1 of 7 (S0108L02) can be relinked as-is; the other 6 need genuine re-generation**, not just a relink — the old audio actually speaks the wrong words.

## Method Check 4 — 11 phrases + 3 seeds vs. the 7 cards

- Claim-A/B cards (5 of 7): **zero practice-phrase rows were touched by this commit** — I confirmed via `content_audit_log` timestamps that all 11 changed phrase rows belong to S0275L01/S0276L01 (Claim C) only. That's consistent with the claim's own framing ("already voiced by the course" — the phrases were already right, only the card summary line was wrong).
- Claim-C (S0275L01/S0276L01): all 11 phrases + both seeds (275, 276) now read consistently with the repaired card. No internal contradiction found.
- 3 seeds changed total, confirmed by primary key: seed 275, seed 276, and the seed sharing Claim B's corruption — matches "3 seeds" exactly.

---

## Explicit gaps

1. Claim A's "7 seeds" figure for the replacement word does not reproduce (I get 17). Doesn't change the verdict.
2. Claim C's exact adverb+verb ratio does not reproduce under any method I tried; the qualitative pattern (the adverbial form never takes a bare noun object once compound-verb constructions are accounted for) is supported but rests partly on a grammatical judgement I can't fully certify as a non-Sinhala-speaker.
3. Claim F's exact figures (6/133/11/70/96) do not reproduce — I lack a safe way to do clause-level subject parsing for a pro-drop language from here. Substance not contradicted; numbers not confirmed.
4. New: S0382L04 looks like it may be an orphaned/misassigned card (its known_text/target_text duplicate S0366L03's, but its own seed's phrase corpus is about something unrelated). Not investigated further, not fixed — flagging for someone to look at.
5. I discovered mid-session that I cannot reliably hand-type Sinhala text — it silently corrupts into a different script. Every Sinhala string in this report was sourced programmatically from the database for that reason; treat any Sinhala elsewhere in my conversational output (outside this document) as unreliable and prefer this document instead.

No data was changed by this verification. I did not spawn any sub-workers — the checks fit inside a single session given the DB access already available in-repo.

---
**Landing line:** no commits produced — I stayed read-only throughout per the assignment; this report is written to disk on branch `docs/sin-cards-verify-2026-08-17` (worktree `.worktrees/sin-cards-verify-2`) but nothing has been committed, pushed, merged, or deployed.
