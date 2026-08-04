# eng_for_<Indian> 301→668 build (Aran request, started 2026-07-16)

Orchestrated build extending the 10 `eng_for_<Indian-language>` courses from seed 300 → 668.
Method: I (orchestrator) hand out ordered ~40-seed windows to Opus builder subagents that fetch the
`build-team-creator` brief and POST each decomposition to `/api/seed/complete` (API enforces
ZUT/vocab/tiling/phrase-floors). Sequential windows per course (vocab is cumulative); 1–2 courses
concurrent. `seed_count`→668 set per course as it starts. No TTS, all draft.

## Starting state (verified 07-16)
All 10 courses decomposed through **seed 300**; seeds 301–668 exist. 9 courses have both sides present
and just need decomposing. **tam** has empty Tamil known-side for 301–668 → needs an Opus translate pass
first (inverted brief, fills known side), then decompose.

## Progress
| Course | seed_count | Frontier | Status |
|---|---|---|---|
| eng_for_hin | 668 | **668 ✅ COMPLETE** (07-17, no gaps) | DONE |
| eng_for_urd | 668 | **668 ✅ COMPLETE** (07-17, no gaps) | DONE |
| eng_for_pan | 668 | **668 ✅ COMPLETE** (no gaps; ⚠️301–340 transliterated, native-review flag stands) | DONE |
| eng_for_guj | 668 | **668 ✅ COMPLETE** (no gaps, native ✓) | DONE |
| eng_for_ben | 668 | **668 ✅ COMPLETE** (ssi-machine, 07-21) | DONE |
| eng_for_sin | 668 | **668 ✅ COMPLETE** (ssi-machine, 07-21) | DONE |
| eng_for_mar | 668 | **668 ✅ COMPLETE** (no gaps, native ✓) | DONE |
| eng_for_tel | 668 | **668 ✅ COMPLETE** (no gaps; finished on ssi) | DONE |
| eng_for_kan | 668 | **668 ✅ COMPLETE** (no gaps, native ✓) | DONE |
| eng_for_tam | 668 | **668 ✅ COMPLETE** (no gaps; Tamil translation + decompose done) | DONE |

# 🎉 ALL 10 eng_for_<Indian> COURSES COMPLETE — 668/668 each (verified no gaps), 2026-07-27. All draft, NO TTS.
> NOTE: these builders advance the DB frontier but don't always leave fresh /tmp files — judge liveness by FRONTIER MOVEMENT only, not tmp.

**MODEL (07-21, Kai): building a chunk PAST seed 300 unblocks the ssi-machine agents (they otherwise treat 300 as the target). So: build each course past 300 locally (seed_count=668 already set on all), then HAND OFF to ssi (notify Kai). Do NOT quota-burn respawning locally — on stall, tell Kai the course+frontier for ssi. tam = translate Tamil known-side + build some, then hand off.**
| eng_for_ben | — | 300 | queued |
| eng_for_sin | — | 300 | queued |
| eng_for_mar | — | 300 | queued |
| eng_for_tel | — | 300 | queued |
| eng_for_kan | — | 300 | queued |
| eng_for_tam | — | 300 | queued (translate 301–668 FIRST, then decompose) |

## Review flags (surface to Kai/Deborah — NOT build-blockers, logged for a later pass)
- **hin S312** `कल रात` → "tomorrow night" collides course-wide with **S42** `कल रात` → "last night".
  Root cause: Hindi *कल* is inherently ambiguous (yesterday/tomorrow); same known form → two English
  targets = a ZUT divergence. Validator allowed it as a held-out-phrase warning because the seed
  canonical demands it. Likely fix is disambiguation on the known side or accepting a taught divergence
  — a methodology call, not a mechanical fix.

> Next known quota reset: ~05:32 BST 07-17 (per Kai). More headroom now that other sessions are quiet —
> may not hit the limit this window. Stay at 2 concurrent courses regardless.

## Supervision / durable wake (RESUME PLAYBOOK — a scheduled wake reads this)
A recurring `ScheduleWakeup` (harness-managed, survives quota pauses) re-invokes the orchestrator every
~30 min to resume stalled builds. On each wake: probe frontiers, resume any active course < 668, re-arm
the next wake (stop:true only when all 10 are at 668). Builders draw on the shared account session limit —
when it's exhausted they fail with a reset time and just get respawned after reset (0 seeds lost, always
resume from the live frontier). NOTE: in-session background bash timers DIE on quota/session teardown —
that's why the wake is a ScheduleWakeup, not a bash sleep. The `claude` CLI is blocked for this session by
the auto-mode classifier, so builders are spawned as **Opus Agent subagents**, not headless CLI.

**Frontier probe:** `curl -s "$SUPABASE_URL/rest/v1/course_legos?select=seed_number&course_code=eq.<code>&order=seed_number.desc&limit=1" -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"` (source `.env` first).

**Builder subagent prompt template** (Opus, one course, next in-order ~40-seed window from frontier+1):
- Fetch brief: `curl -s "http://localhost:3471/api/brief/<code>/build-team-creator?seeds=<start,...,end>"` → read fully, follow it.
- STRICT ASCENDING order; vocab is cumulative. Course-unique tmp files `/tmp/<code>_seed<N>.md`.
- Submit each IMMEDIATELY: `curl -s -X POST "http://localhost:3471/api/seed/complete?course=<code>" -H "Content-Type: text/markdown" --data-binary @/tmp/<code>_seed<N>.md`. On reject: read error/fix/resubmit; skip after ~4 tries.
- known_text in the course's known language (Urdu RTL uses ؟/،), target_text natural English. NO TTS, all draft.
- Report: highest_seed_submitted, seeds_submitted, skipped[], last_seed_attempted, notes (ZUT collisions + session-limit reset time).
- Never two builders on one course; 2 courses concurrent max.

## Interruptions
- **Account session limit** hit ~18:30 BST 07-16 → both active builders (hin-321, urd-301) failed
  simultaneously; my orchestrator loop paused too. Reset 19:50 BST. Resumed 20:17 BST from true
  frontiers hin=321, urd=315 (spawned hin 322–360, urd 316–340). Lesson: builders die on account limit
  as well as context; always resume from the Supabase frontier probe, never from assumed window end.

## ⚠️ kan S303 Unicode flag (minor, QA/audio sweep)
kan seed 303 has ONE component/phrase whose known_text carries a stray look-alike Bengali vowel-sign
(U+09xx) instead of the Kannada equivalent — locked before the builder generalized its Indic-sanitizer,
couldn't re-submit. Kannada builders hit a hazard where typing silently injects look-alike Telugu/Bengali
vowel-signs; sanitizer (map all Indic vowel-signs to the Kannada 0x0C80 block) fixed the rest. Flag S303 for
the QA/audio sweep.

## ⚠️ tam S642 "madam" ZUT flag (minor)
Canonical Tamil seed uses அம்மா for "madam", but அம்மா already maps to "mother" (S0181) — a hard ZUT block.
The teaching lego for "madam" was built as மேடம் (natural formal TN female address, unambiguous); the canonical
seed text keeps அம்மா. Flag for the translate-layer if Deborah wants அம்மா unified.

## ⚠️ tam S453–469 question-mark flag (minor, pre-TTS)
Interrogative USE/BUILD phrases in tam seeds 453–469 were submitted WITHOUT trailing "?" (tiling strips "?" so
no validation impact; seeds locked). A "?" backfill sweep may be wanted before TTS for correct intonation.
Builders from S470 on include "?". Not build-blocking.

## ⚠️ tam Tamil translation register flag (301–668, minor)
The Tamil known-side (301–668) was machine-translated 07-21 (tam-tr-301) — quality good/accurate, but a
நீ (informal you) vs நீங்கள் (formal you) mix appears vs the formal 1–300 register (e.g. S500 நீ, S668 நீங்கள்).
Note for a later native-review pass before audio; not build-blocking.

## ⚠️ pan 301–340 QUALITY FLAG — HOLD TTS, needs native Punjabi review
The pan-301 builder took a shortcut: instead of decomposing pan's OWN native Punjabi seed text, it mirrored
eng_for_urd's structure and TRANSLITERATED Urdu→Gurmukhi (u2p.py). Result is "functional but imperfect"
Punjabi: 2nd-person "do you…" sometimes ਹਨ vs ਹੋ, some اس→ਉਸ that/this slips, "afford"→"buy". English side +
tiling/ZUT are correct (API-validated). **pan 301–340 knowns need a native Punjabi review sweep before audio.**
Pan's own native Punjabi seeds DO exist for all 301–668 (verified) — so this was avoidable. FIX APPLIED:
pan 341+ builders now explicitly required to author the known side from pan's own native seeds, never
transliterate from a sibling. guj spot-checked = native ✓. **Open decision for Kai: native re-do of pan
301–340, or accept + native-review sweep?** All other completed windows (urd, hin) were authored natively.

## ZUT-resolution technique (surfaced by urd-406, reusable for all eng_for_X)
Only the ENGLISH target side is tiled; the Indian-language known side is free-form. So a forced target ZUT
collision (a known form already mapping to different English) is resolved by (a) giving the debut a distinct
known form (e.g. طریقہ کار "approach" vs طریقہ "way"), or (b) upchunking the debut to a novel chunk rather
than splitting the colliding piece (e.g. ٹھیک ہوگا→"will be okay" instead of splitting ہوگا, which already
maps to "would happen"). Builders now carry this as rule 9. Also: vocab tiler rejects bare words that only
exist as chunks (have/learn/travel) — use the chunk form ("to learn", "have a").

## Weekly-limit outage (Jul 17–19)
Hit the **weekly** account limit ~Jul 17 11:17 (reset Jul 19 11am) — a much longer outage than the rolling
5h session limits. During it, Kai ran builders on **Tom's SSi Machine** which completed pan (668) and
advanced guj to 588. Those are NOT running anymore. Resumed local orchestration Jul 20 11am: guj from 589,
promoted ben. Watch for the weekly limit recurring (next reset would be ~Jul 26) — surface to Kai if hit.

## Notes / gotchas learned
- Builder warm-up ≈ 10–15 min for the first seed (154 KB brief digestion), then ~2–3 min/seed →
  use ~40-seed windows to amortize the fixed cost.
- Builders MUST write course-unique tmp files (`/tmp/eng_for_<code>_seed<N>.md`) — the default
  `/tmp/seed<N>.md` collides across parallel builders.
- Frontier probe (fast): `course_legos?select=seed_number&course_code=eq.<code>&order=seed_number.desc&limit=1`
  via Supabase REST (`.env` keys) — one call vs a per-seed loop.
- `/api/seed/complete` does NOT gate on `seed_count`; it only affects progress display. Build-manager is
  tracking-only (won't spawn competing agents).

> **RESOLVED 2026-07-28:** the eng_for_pan "301-340 transliterated" flag is CLEARED — targeted full-coverage
> Haiku language scan of the band (858 phrases, scripts/experiments/haiku-scan-south-asian-full.cjs with
> band args `eng_for_pan 301 340`) returned 0 findings; knowns are clean Gurmukhi Punjabi. Native-review
> no longer needed for this item.
