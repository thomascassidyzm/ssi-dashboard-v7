# Revised generation plan — 2026-08-12

**Status: awaiting Tom's approval. Nothing has been generated. No DB writes. Nothing triggered on popty.app.**

This supersedes the earlier 539-render approval, which is held and not used.

Five surveys stand behind this page. Each is published in full:

| | Survey | Link |
|---|---|---|
| #332 | Quality gate + reuse gating | https://watson-1.tail4968cb.ts.net/d/21a76a7e |
| #333 | English fresh-build scope | https://watson-1.tail4968cb.ts.net/d/de2ecd42 |
| #334 | Non-English canon render scope | https://watson-1.tail4968cb.ts.net/d/c6af57f5 |
| #335 | Canon translation sanity | https://watson-1.tail4968cb.ts.net/d/29b93f4b |
| #336 | Premium-first rebuild queue | https://watson-1.tail4968cb.ts.net/d/a5f4ec59 |

---

## 1. The number set

| Line item | Renders | Cost | Wall clock |
|---|---:|---:|---:|
| **Pod-0 English fresh build** (Eve + clone) | **1,128** | $1.17 | ~10 min |
| **New canon phrases, non-English** (4 pods) | **330** | ~$0.25 | ~5 min |
| — of which gated on proofreading | 247 | | |
| — renderable tonight without a text decision | **83** (cym_n) | | |
| **Proven-failed clips still live** | **24** | negligible | minutes |
| **All-estate English fresh build** (separate decision) | **784,266** | $350 | 47–98 h |
| **Full non-English rebuilds** (premium-first, gradual) | ~210k | ~$140 | staged |

Tonight's actionable job is **1,128 + 330 + 24 = 1,482 renders, under $2, well inside an hour.**
The 784,266 is a separate approval, not tonight's.

---

## 2. The tail-repair question — settled

**It is (a): the clips are old. The pipeline is not broken.**

The cutover is a **date, 2026-08-05**, and the codebase states the mechanism itself
(`services/audio-reuse-planner.cjs:728`): until that date `masterAudio` called `repairTailDefect`,
which trimmed at the tail detector's timestamp. The detector cannot tell a tail click from a natural
pause, so the trim ate every word after the pause. That is how deu shipped
"Ich will jetzt mit dir Deutsch sprechen" without "sprechen". The planner's own words: *"this is a
DATE, not a boolean."*

Evidence:

- **Pod-0 is 98.5% pre-cutover** — 25,634 of 26,032 linked clips rendered before 2026-08-05.
- **None were re-rendered in place** — 0 of those 25,634 carry `audio_revision > 1`, so this is not a
  dating artefact.
- **The Spanish samples are 100% pre-cutover** — every `spa_for_eng` / `spa_mx_for_eng` /
  `spa_for_jpn` pod-0 clip was rendered 8–19 June 2026. Tonight's comparison page is new; its audio
  is June.
- **Independently reproduced**: #334 measured 10,850 of 11,027 non-English pod-0 target clips (98.4%)
  pre-fix, from a different direction. 33 of 35 languages are 100% pre-fix.
- **No stray render path.** Every path that renders TTS and persists it goes through `masterAudio` —
  phase8 (7 call sites), `audio-repair`, `voicelab`, `repair-presentation-clips`,
  `regen-seed-clips`, `pod-cast-sample-render`. The casting-sample renderer writes no `course_audio`
  rows at all (S3 only).

**Consequence: the fix is a re-render queue, not a code fix.**

**One caveat, flagged not buried:** `tools/persist-stage0-pod0.cjs` writes `course_audio` rows from
pre-made mp3 files without mastering. It is an upload path for recorded atom slices, not TTS, so it
is not a source of the tail-repair signature — but it is a genuine mastering bypass.

### The second cause, which the date does not explain

#332 whispered a 348-clip stratified sample of the 2026-08-08 cohort tonight (read-only, local, no
spend): 21 flagged, but read by hand **~1 is a genuine defect**. Excluding `deu_at_for_eng`
(Austrian dialect — whisper flagged 35% because it cannot read Viennese), that is **6 flags in 268 =
2.2% raw, ~0.4% genuine**. Recent renders are, in fact, largely clean.

So for any *recent* clip that still sounds truncated, the live hypothesis is **(c): device cache**.
`docs/deu-truncation-root-cause-2026-08-06.md` already traced this exact complaint from Tom's own
session and found `cacheHit: TRUE` — the bytes came off the device, the server was never asked.
Exposure measured: **2,511,244 rows (98.0%) sit at `audio_revision = 1`**, i.e. bare-uuid URLs with
no version, permanently cacheable and unbustable when S3 bytes are rewritten in place.

**Thirty-second confirmation, needs Tom's device: clear the app's audio cache and replay the flagged
clips. If they play whole, the render path is exonerated.**

---

## 3. The quality gate — what it can and cannot do

**Canonical check: `checkAudioVeracity` in `services/audio-veracity.cjs`** (whisper round-trip;
`last_word_missing` / `cer_above_threshold`).

**`flagTailDefect` is not usable as a gate.** Its own docstring says 9% precision by ear (7/76);
against real ground truth it measures **46.7% recall / 36.4% precision**.

**Coverage is the problem: 1,608 of 2,562,605 rows have ever been listened to — 0.06%.** The gate is
wired into **1 of 11** modules that write `course_audio`; the pre-publish checker has gated 48 clips
in its lifetime. **0 of the 26,032 pod-0 clips have ever been checked.** The 24,509 clips rendered on
2026-08-08 went out unchecked.

**Fail counts, honestly split:**

- **Proven failed and still live: 24 clips** (fra 13, deu 2, spa 2, four Indian courses 1 each,
  ita_for_jpn 3). The verdict cache holds 534 proven failures, but 520 are already replaced.
- **Suspect, unproven: 2,525,557 pre-gate clips (98.6%).** *No single estate-wide re-render number is
  given, deliberately.* The only two cohorts anyone has listened to disagree **30-fold** — 23.8% for
  the 2026-08-03 emergency batch, ~0.5% for 08-08. Extrapolating either would be fabrication. 44 of
  the 50 largest language cuts have never had a single clip listened to.

**The date test is the practical gate, not whisper.** Dating is free and covers 100% of the estate;
whisper is expensive, has 36% precision on this defect class, and has already passed clips Tom
rejected. Use `created_at >= 2026-08-05 OR audio_revision > 1` to decide reuse; use whisper only on
the narrow set that survives.

### Reuse currently fails Tom's ruling

`findAudioRowForClip` (commit `ee43c5a7`) selects `id, course_code, text, language, voice_id,
s3_key`. **`veracity_pass` is not in the projection and not filtered anywhere.** On a hit it returns
a pure FK link — bytes are never fetched. Given 0.06% coverage, a reused clip has a ~99.94% chance of
never having been listened to, and nothing stops it selecting a `veracity_pass = FALSE` row.

`reusePlanner.verifyPlanVeracity` *does* listen to incumbents, but it is
`if (req.body?.verifyIncumbents === true)` — **off by default**. Its own comment calls it "the only
way a clip that is present, alive and wrong gets caught."

**This needs a ruling, not code (decision D1 below).**

---

## 4. Translations — the answer to "have we built them properly?"

**Yes, with one correction: last night's rollout did not build a single translation.** It aligned
English and carried forward translations that already existed.

For all 5,468 carried target lines, did each keep the exact English it was written for?

| | rows |
|---|---:|
| pairing preserved byte-for-byte | 4,448 |
| English differs, numerals only (`"One. Two. Three."` → `"1. 2. 3."`) | 214 |
| English differs, punctuation only | 113 |
| **genuine reword carrying a stale target** | **0** |

All 214 numeral carries were read by hand; the targets hold the right numbers. **No off-by-one
exists** — 231/231 canon slots matched across 43 pods, zero speaker mismatches, zero ordering
mismatches. **Zero wrong-language leakage**, with confusables separated explicitly (ukr: 0 Bulgarian
ъ; zho: kana on 0/130 lines; hin: 0 Nepali तपाईं).

**Canon line count is 89.** The 91 is the appendix size (scenes 15–21 + scene 22); scene 22's 11
lines are the old canon's scene 15 verbatim, so 91 − 11 = 80 appendix + 9 in scenes 2–3 = 89. The 90
in circulation comes from matching by row position instead of text — a trap that falsely reports 11
already-done lines on every un-aligned pod.

**Translation debt (not renderable, correctly excluded from all render counts): 3,471 lines** — 39
`X_for_eng` courses × 89, English written, target blank. Plus **623 lines** on 7 non-English-known
pods (`cat_for_spa`, `eus_for_spa`, five `*_for_jpn`) needing a pivot decision.

**35 lines carry markup a voice would read aloud** — `pol` ×23 ("Jak się **Pan/Pani** ma?"), `lav` ×6
("pārliecināts**(-a)**"), `por` ×6 ("obrigado**/a**"). Pre-existing and faithfully carried; the align
did not create them. Direct hit on the no-parentheses rail, and **the existing takes may literally
say "slash"** — one listen to a `pol` clip settles it.

**Not assessed, stated as a gap: 13 languages** — fas, tha, hye, nep, swa, eus, gle, isl, lit, est,
bul, hrv, fin. Mechanically clean, humanly unread. Needs a separate run.

---

## 5. Premium-first rebuild queue (non-English, gradual)

`pricing_tier` defaults to `'premium'` for everything including 53 never-shipped drafts, so it is
useless alone. The real reachability gate, confirmed against the learning app's `available.ts` and
the DB's RLS policy, is **`new_app_status IN ('live','beta')`**.

| # | Lang | Clips | Cost | Voice |
|---|---|---:|---:|---|
| 1 | spa | 34,949 | $23 | **blocked** |
| 2 | kor | 34,826 | $23 | ready |
| 3 | zho | 32,558 | $21 | ready |
| 4 | por | 28,383 | $19 | **blocked** |
| 5 | ita | 21,413 | $14 | ready |
| 6 | cym | 12,150 | $8 | **blocked** |
| 7 | jpn | 10,714 | $7 | **blocked** |
| 8 | ara | 35,306 | $23 | **blocked** |

Then 41 free-tier languages ($1.50–$3.75 each, all voice-blocked), then 24 unreachable drafts.

**kor and zho are not blocked on a casting decision.** All five languages with any xAI voice on
record (deu, fra, ita, kor, zho) reuse the same two multilingual IDs, `ara`/`leo` — already proven at
27,140-clip scale, just pointed at `kor_for_hin`/`kor_for_tam` rather than the flagship
`kor_for_eng`. Redirecting a proven pair is far cheaper than casting Spanish from scratch.

**fra/deu are NOT exempt.** Both are only partially rebuilt — fra has 6,030 held slots still on
pre-fix clips (2,464 target-side, and 100% of its 1,621 phrase-presentation holders), deu has 4,426.
`fra_ca` is untouched. **Critically, pod-0 was in neither rebuild: 142/142 target clips pre-fix on
both.** The one German pod genuinely on new-engine clips is `deu_at_for_eng` (100/100, xAI, 7–8 Aug)
— which makes it the best first target for the gate: if post-fix clips fail there, the gate is
measuring something other than the damage.

---

## 6. Decisions needed

**D1 — Reuse gating.** Rejecting `veracity_pass = false` is free. Requiring `= true` rejects 99.94%
of candidates and collapses the reuse saving from ~374 renders back toward ~5,837.
*Recommendation: reject `false`, and gate reuse on the **date test** (`created_at >= 2026-08-05 OR
audio_revision > 1`) rather than on whisper. Add listen-on-reuse — one decode per distinct clip,
cached forever — as the follow-up.*

**D2 — Welsh human recordings.** 462 English slots are Aran and Catrin's real recordings.
*Recommendation: exclude human-origin clips from the fresh build by hard rule, not by memory.
Re-rendering real people over their own voices is what make-before-break exists to prevent.*

**D3 — Estate English scope.** Pod-0 English (1,128, $1.17) tonight is uncontroversial. The
784,266-render estate build is 47–98 hours. *Recommendation: approve pod-0 tonight; take the estate
build as a separate staged decision — and apply cross-course dedupe first, which is one filter and
takes it from 1,388,244 renders / $559 to 784,266 / $350.*

**D4 — The 19 `eng_for_X` courses** have English on the target side and Kannada/Tamil/Japanese on the
known side. Read "same pair both sides" literally and the clone speaks all of them.
*Recommendation: the pair follows the English.*

**D5 — Proofreading gate.** `spa_for_eng` (112), `deu_at_for_eng` (105), `cym_s_for_eng` (104) carry
321 draft rows of the 689 that would render. *Recommendation: proofread first — 267 lines of reading
against a ~$0.20 render bill. Cuts tonight's 330 to 83 (cym_n only).*

**D6 — Explainers.** 9,847 clips have the clone voicing Arabic/Nepali/Swahili/Mandarin inline; 1,631
have him narrating whole lines in Japanese or Spanish. A blind "rebuild all English" re-commits
11,478 constraint violations. *Recommendation: leave explainers out of tonight; own pass.*

**D7 — One English voice or two for course content?** Pods need two. Difference is 392k renders and
$175. *No recommendation — this is a taste call.*

**D8 — Pivot for the 7 non-English-known pods** (623 lines): translate from the English canon, or
from an already-translated sibling? *Recommendation: from the English canon — sibling-pivot compounds
any error already in the sibling.*

**Open, not blocking:** `fra_for_eng` (released) uses *vous* to a daily neighbour while `fra_ca`
writes *tu* on the identical canon line; `pol`/`tur` contradict themselves between scenes 1 and 5;
jpn 8/5 renders "cider" as サイダー (lemonade in Japanese).

---

## 7. Before the first render

- **Re-count pod-0.** Pod count moved 104 → 106 while the aligner kept cloning. Re-run immediately
  before rendering, not from tonight's number.
- **Enumerate the relink set.** 62,811 practice-phrase rows across 43 courses point at a clip whose
  voice disagrees with their own `voice_config` — including 2,177 in `deu_for_eng` and 1,846 in
  `fra_for_eng`. Enumerate per table *before* the first render, or the swap strands rows exactly as
  `753bd4e3` did.
- **Normalise the voice IDs.** Voices are stored under two spellings — `xai_gfzdpspr5fdp` and bare
  `gfzdpspr5fdp`, same for eve/olivia. This mis-counts "already correct" and can mis-match reuse.
- **Make-before-break throughout.** Generate, verify, swap links, and only then retire the old clip.

## 8. Engine

`tools/course-finish-shepherd.sh` → phase8 `applyReusePlan` on a pinned checkout,
`XAI_TTS_CONCURRENCY=8` (the real bind), `REUSE_MAX_CONCURRENCY=32`. Measured from timestamps, not
projected: **16,614 clips in the 03:00Z hour of 2026-08-08, ~8,000/hr sustained.**

Voices of record, both xAI, both verified present and correctly gendered:
`eve` (female) and `gfzdpspr5fdp` (male, Tom's clone). The clone is already language-locked to
`{eng}` in the voices table — the "never speaks target" constraint is encoded in the data.
