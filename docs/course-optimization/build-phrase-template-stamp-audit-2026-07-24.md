# BUILD-phrase template-stamp audit — 2026-07-24

**Trigger:** Spanish-course tester complaint (team Slack): BUILD phrases degenerated into one
template per LEGO — bare LEGO + tacked-on filler ("ella tenía razón aquí, bien", "…, sí",
"… antes, ¿no?"), duplicating the USE phrases with the fillers stripped. "Not built upon
anything, doesn't lead anywhere."

**Method principle violated:** `ralph-methodology.md` §BUILD (lines ~184-192): "BUILD phrases
combine the **new LEGO** with **previously introduced LEGOs**… Each BUILD phrase must contain
the entire LEGO plus content from LEGOs the learner already knows." Reinforced by lesson
2026-02-05 ("BUILD Phrases Must Show LEGO Plugging Into Prior Vocabulary"): NOT the LEGO by
itself, NOT random extensions.

**Verdict: confirmed, NOT Spanish-only, and ACTIVE in the current build swarm** (eng_for_kan
stamped 111 rows today, 2026-07-24).

## Classifier

`scripts/build-audit/classify-builds.cjs` (read-only; word-level cross-reference of every BUILD
phrase against the course's actual LEGO introduction order). Classes: debut-row (first build row
= bare LEGO — a storage convention, not a defect, 80-92% of first rows in ALL eras),
bare-repeat (bare LEGO in a later row), comma-tag (LEGO + ", <short tag>"), use-stem+tag
(one of the lego's own USE phrases + ", <tag>" — the tester's exact pattern), filler-unknown,
append-known-1w, recombination.

## Findings

### 1. The template-stamp defect (the tester's complaint)

spa_for_eng band analysis (non-debut builds, trailing-filler-tag regex `, sí|no|bien|claro|por favor|…`):

| seeds | non-debut builds | filler-tagged |
|---|---|---|
| 1-300 (Feb, Opus era) | 2336 | 1 (0.0%) |
| 301-511 (May 28, same wave) | 988 | 2 (0.2%) |
| **512-600 (May 28 15:42-16:36 UTC)** | **459** | **220 (47.9%)** |
| 601-668 (same day, later) | 169 | 0 (0.0%) |

Surgical boundary at seed 512, which is exactly where the builder's cadence accelerates from
~30-60 s/seed to ~10-20 s/seed — one session degenerating mid-run. Tester's seed (543,
"ella tenía razón") sits in the band: builds = bare LEGO, "…, sí", "… aquí, bien",
"… antes, ¿no?"; USE = same stems without the tags.

Mechanical stamp-count (comma-tag + use-stem+tag) per course, estate scan of all 92 courses
with >1000 builds — every hotspot is a single-day burst (= one builder session):

| course | stamped | rate | dominant burst |
|---|---|---|---|
| eng_for_pan | 465 | 14.2% (72% of seeds 601+) | 2026-07-19 (168 seeds in 69 min) |
| spa_for_eng | 213 | 5.4% (27% of seeds 501-600) | 2026-05-28 |
| eng_for_urd | 176 | 5.7% | 2026-05-30 |
| eng_for_kan | 122 | 3.1% (26% of seeds 601+) | **2026-07-24 (today)** |
| deu_at_for_eng | 95 | 2.3% | 2026-07-16/17/19 |
| eng_for_guj | 77 | 2.5% | 2026-07-19 (+06-01) |
| rus_for_eng | 76 | 4.0% | 2026-05-12 |
| deu_ch_for_eng | 75 | 2.2% | 2026-07-16 |
| eng_for_tel | 61 | 1.8% | 2026-07-21 |
| tur / hun / lit / bul / lav / ukr / ell … | 16-49 each | 1-3% | one burst each, Mar-May |

Estate total ≈ 1,670 mechanically-provable stamped rows; the true junk count is higher — rows
like "¿podéis aquí?, bien" (tier-3 wrong) classify as "recombination" because the filler words
are individually known. English-target examples are identical in shape: "do you all mind, now /
…, tomorrow / …, again" (eng_for_pan s667).

Old Opus-era content (cym_s Dec 2025, all Feb-built bands) is at 0.0-0.4%.

### 2. Secondary, older defect (different, not the tester's complaint)

Feb-era (Opus) ita/fra/por/kor/jpn/cat/eng_for_jpn seeds ~101-300 carry 10-24% duplicate
bare-LEGO rows (the debut row stored twice+). Zero in post-May builds. Lesser learner impact
(redundant, not wrong). Caveat: cym filler-unknown/other rates are mutation-matching noise, not
defects.

## Timeline & what changed

- **2026-02-19, commit `1d6b6a28` "Switch all agent spawns from Opus to Sonnet 4.6"** —
  `spawn-course-builder.cjs:593` still reads `model = 'sonnet', // Always use Opus for vocab
  discipline`. All stamped bursts postdate this; Opus-era content is clean.
- Generation prompts did NOT change (consistent with Tom's statement) — the brief has always
  said: fetch vocab once at batch start, maintain a "mental vocab list", re-fetch every 20 seeds.
- First small bursts Mar-May (tur 03-09, bul, lav, ukr, ell, lit, hun, rus); step-change late
  May (spa 05-28, urd 05-30); worst in July swarm builds (pan 07-19, kan 07-24).

## Mechanism, evidence-ranked

1. **Session-level context loss in long fast Sonnet runs (primary).** The prior-LEGO list lives
   only in the agent's context ("mental vocab list"); after compaction/mid-run drift it's gone,
   and the builder can no longer recombine — it appends the only universally-safe words it
   still knows (sí/bien/aquí/por favor; now/tomorrow/again/please). Evidence: mid-session onset
   at spa seed 512 coinciding with cadence acceleration; filler vocabulary is a tiny
   universally-known set; every burst is one session; seeds after a session boundary are clean.
2. **Opus→Sonnet switch as precondition.** Zero stamps before 2026-02-19; matches the recorded
   rote-carrier regression (Sonnet builders emitting templated phrases that pass validation).
3. **No gate can catch it (enabler).** The stamps pass every validator check: fillers are known
   vocab, the LEGO is contained, ZUT holds, and the debut row counts toward the BUILD floor.
   There is no recombination/anti-template check anywhere in `validation.cjs`.
4. Param change / prompt regression: no evidence.

## Proposed fix shape (report only — awaiting ruling)

1. **BUILD-quality gate in the submit path** (`services/course-builder/lib/validation.cjs`),
   with the audit tool changed in lockstep: reject non-debut BUILD rows whose target is (a) the
   bare LEGO, or (b) LEGO-or-own-USE-stem + trailing short tag; require per LEGO ≥2 builds
   whose non-LEGO material tiles from previously-introduced LEGOs (the classifier logic,
   promoted from `scripts/build-audit/` into the gate).
2. **Server-side vocab injection**, not agent memory: return the introduced-LEGO list in every
   `/api/seed/complete` response (or require the builder to echo the vocab-fetch seed number),
   so a compacted session cannot silently lose it.
3. **Targeted BUILD regeneration pass** for the stamped bands (spa 512-600, pan 07-19 band,
   kan 07-24 band, urd, guj, tel, deu_at/ch July rows, plus the small Mar-May bursts) — BUILD
   rows only, seeds/LEGOs/USE untouched; approval-gated; audio consequences via
   `queue-audio-pass`. BUILD phrases are debut-round-only and never reviewed, so this is the
   cheapest possible repair surface.
4. **Model ruling**: either restore Opus for builders (per the stranded comment) or keep Sonnet
   behind the new gate and judge by post-gate reject rates.
5. Separate, lower priority: sweep the Feb-era duplicate bare-LEGO rows (mechanical dedup).

Artifacts: `scripts/build-audit/classify-builds.cjs`, per-course `*-builds.json`,
`estate-scan.txt` (gitignored workspace).

## Fix — IMPLEMENTED 2026-07-24 (owner-approved), branch `fix/build-template-stamp`

1. **Server-side vocab injection** — every `/seed/complete` round-trip (success,
   rejection, draft, canonical-mismatch) carries `introduced_vocab`: the course's
   introduced-LEGO list, injected server-side per call
   (`vocab-cache.cjs: loadIntroducedLegoPairs + buildVocabInjection`). Full list ≤300
   legos; above that, recent-200 + 100 evenly sampled from the earlier estate
   (bounded response size; the recent window is what recombination needs most).
2. **Anti-template gate** — `validation.cjs: classifyBuildPhrase +
   checkBuildRecombination`, wired into `/seed/complete`: non-debut bare-LEGO repeats,
   comma-tag and use-stem+tag stamps reject; ramp-aware floor (≥2 from seed 4+) of
   BUILD rows whose non-LEGO material draws on previously-introduced chunks. Lockstep
   with the audit classifier; unit tests in `build-recombination.test.cjs` include the
   tester's exact spa S0543 basket.
3. **3-strike Opus escalation** — builder model stays Sonnet; on the 3rd consecutive
   gate rejection of the same lego, the server regenerates just that BUILD basket via
   Claude CLI Opus (`build-escalation.cjs`), re-validates through the same gates, and
   proceeds if clean. No blanket model switch.
4. **Regeneration sweep** — `tools/course-optimization/regenerate-stamped-builds.cjs`:
   stamped BUILD rows only, updated in place (same id/position; seeds/LEGOs/USE/audio
   untouched), Sonnet×3→Opus×2 per lego, same validation stack, before-state drift
   guard, per-course `scripts/build-audit/regen-logs/*.json`. Courses with applied
   rows queue an audio-pass request (approval-gated). eng_for_kan audio held: no
   pending audio_pass_request existed pre-sweep; its request is queued only after its
   rows regenerate.
