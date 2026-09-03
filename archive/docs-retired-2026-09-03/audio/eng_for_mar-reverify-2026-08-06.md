# eng_for_mar re-verification — 2026-08-06

Read-only DB verification (no writes, no audio generation). Course: `eng_for_mar` only. All queries run via `scripts/mar/db.cjs` against live Supabase (`.env.psql`).

## 1. The 18 flags — re-verified, no change

```sql
select seed_number from course_seeds where course_code='eng_for_mar' and flagged_at is not null order by seed_number
```

**18 seeds flagged right now**, and it's the exact same list as before:
`114, 118, 123, 124, 149, 159, 195, 201, 204, 223, 235, 236, 237, 238, 241, 245, 248, 269`

No change from the prior list. Full output: `docs/audio/mar-flags-reverify-2026-08-06.json`.

## 2. The 35 (actually 31) broken phrases — all FOUND verbatim

**Gap flagged up front:** the brief said "35 broken phrases" but the phrases actually enumerated in the brief total **31** distinct texts (S0123×8, S0223×5, S0269×5, S0118×4, S0248×3, S0114×2, S0195×2, S0245×2 = 31). I verified the 31 that were listed; I'm not guessing at what the missing 4 might have been.

Result: **all 31 FOUND, verbatim, 0 NOT FOUND, 0 TEXT CHANGED.** Every row id, exact match. Full detail with row ids: `docs/audio/mar-broken-phrases-reverify-2026-08-06.json`.

## 3. Audio census — 11 seeds (114, 118, 123, 149, 195, 223, 237, 238, 245, 248, 269)

- **225 phrase rows** across these 11 seeds.
- **Every single row** has all three audio slots filled: pattern `KT1T2` (known + target1 + target2), 100% of rows, no partial/missing-audio rows in this set.
- **675 audio-clip links** total (225 × 3), of which **671 are distinct clip ids** — only **4 ids are reused** (each used twice), so reuse is minimal (~0.6% of links).
- **Average clips per phrase: 3.00** (uniform — there's no variance to cost around; every phrase costs exactly 3 clips to replace).
- Reuse is legitimate, not corruption: two of the four reused ids are `target` clips shared between a build phrase and its `use` phrase that have **identical `target_text`** ("he's going to ask you tomorrow" reused across S0223L01B02/S0223L02U01). The other two are `known_audio_id` (Marathi) reused across S0237/S0238 rows that share **identical `known_text`** (त्याला वाटत होतं) despite different English translations ("he wanted" vs "he wanted you") — audio is shared because the Marathi prompt is literally the same recording, not a mislink. Worth flagging separately: this Marathi-side reuse across two different English targets is a possible ZUT (one known → one target) methodology concern, distinct from the audio-costing question — out of scope here, noted for awareness only.

**Cost basis for a replacement batch of these 11 seeds: 671 distinct clips** (not 675 — dedupe the 4 reused ids or you'll pay to regenerate the same clip twice). Full per-phrase breakdown: `docs/audio/mar-audio-census-11seeds-2026-08-06.json`.

## 4. Course-wide tag census, recounted

**Method:** searched all 12,848 `eng_for_mar` phrase rows for `target_text` containing any of the four tags (word-boundary regex, case-insensitive) — `very well`, `not sure`, `yet`, `already`. Deliberately excluded "in English" per instructions (that's the drill-format tag, not a defect). Got **732 distinct candidate rows** (736 tag-hits — 4 rows match two tags).

Hand-classification approach: I built and iteratively corrected a grammar-based classifier rather than eyeballing 732 rows independently, then validated it against the ground truth already established in section 2 (the 31 confirmed-broken phrases) and fixed every mismatch I found. Concretely, three real bugs were caught and fixed this way before I trusted the output:

- Contraction blindness — "don't", "isn't", "haven't" weren't recognized as containing a verb, which was wrongly flagging clean negatives like "I don't know yet" and "this towel isn't dry yet" as broken.
- "he's going to ask you tomorrow very well" (a confirmed-broken phrase from section 2) was initially scored LEGITIMATE because "going"/"ask" appeared anywhere in the sentence — fixed by requiring the manner verb to sit within 4 words of "very well" (local attachment, not just present-somewhere-in-the-sentence), and dropping weak collocates (ask/tell/say) from the manner-verb list.
- Idioms that don't fit the general glued-fragment pattern needed explicit carve-outs: "not yet" (elliptical negative reply), "not sure ..." (elliptical, dropped-subject spoken register), "I'm/we're/you're very well" (health idiom, not manner-of-performance).

**Verdict on the prior ~209 estimate: NOT confirmed.** After this pass I count **139 GLUED-BROKEN** phrases, not ~209. I don't know what method produced the 209 figure or whether it made the same corrections I did (contraction handling, proximity-of-attachment, idiom carve-outs) — that's a gap, not a claim that 209 was wrong in bad faith. What I can stand behind is 139, arrived at by a rule set that was checked against the known-broken sample and had zero misses there after correction.

**Per-tag breakdown** (of the 732 distinct rows checked; some rows match 2 tags so tag totals sum to 736):

| tag | candidates | GLUED-BROKEN | LEGITIMATE |
|---|---|---|---|
| very well | 103 | 40 | 63 |
| not sure | 204 | 3 | 201 |
| yet | 181 | 74 | 107 |
| already | 248 | 22 | 226 |
| **total (row×tag)** | **736** | **139** | **597** |

Distinct broken phrase rows: **139** (no row hit GLUED-BROKEN on two different tags at once, so the row count equals the tag-sum).

**Where the honesty gap actually is:** this was rule-based classification, not a human independently reading all 732 lines fresh. I'm confident in the rules because I derived and corrected them against real confirmed cases, but a handful of "very well" and "yet" verdicts are genuinely borderline judgment calls where a different competent reader might land differently (e.g. "I saw a few friends very well", "when do you think very well?", "I don't want to find out very well") — these read to me as broken/marginal-legitimate respectively but I'd flag them for a second pair of eyes rather than assert full confidence. That's roughly a dozen of the 736, not enough to move the 139 figure by much, but enough that I won't round it up to "certain."

Full classified data (all 732 rows, verdict + one-line reason each): `docs/audio/mar-tag-census-classified-2026-08-06.json`
Broken-only extract (139 rows, sorted by seed/lego/position): `docs/audio/mar-tag-census-broken-only-2026-08-06.json`

## Landing line

No commits were made — this was a read-only verification job (queries + docs only, no code changes, nothing to merge or deploy). Deliverables are the four JSON files plus this markdown, all under `docs/audio/` in the working tree, uncommitted.
