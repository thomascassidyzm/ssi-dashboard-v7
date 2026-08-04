# Variant courses → audio-readiness tracker (2026-07-15, @claude-local)

Goal (Kai, Stop-hook): **all variant courses ready for audio generation.** Thorough check, no rush.
Pipeline per course: `BUILD→668 · SCAN (mech+haiku) · SAFE-FIX · READ/DISTINCT · RECURRING-DEFECTS · BACKFILL · FINAL-PASS · GENDER-PREP(end) · AUDIO`.
Rule (Kai): scripts pick candidates, **read every phrase before changing it**. Gender-prep runs at the very END, gendered langs only (NOT yue/hak/nan). Distinctiveness bar: variant must be genuinely ≠ its base.

| Course | Build | Scan | Safe-fix | Distinct vs base | Final-pass | Gender-prep | Notes |
|--------|-------|------|----------|------------------|-----------|-------------|-------|
| **por_br** (BR-PT) | ✅668 | ✅ | ✅ i(362) | ✅ good (teu→seu fixed 27+3+6) | 🏃running | ⏳end | 23 no-build LEGOs → backfill |
| **ara_eg** (Egyptian) | ✅668 | ✅ PASS | ✅ i(340)+dot | ✅✅ excellent (0/10 = MSA) | 🏃running | ⏳end | polarity "anything else"→final-pass |
| **ara_lb** (Lebanese) | ✅668 | ✅ (sans flagged) | ✅ i(691)+dot+sans | ✅✅ excellent (0/10 = MSA) | 🏃running | ⏳end | sans→without fixed |
| **spa_mx** (Mexican) | 🔨~S395 | — | — | — | — | ⏳end | building (restarted) |
| **fra_ca** (Quebecois) | 🔨~S364 | — | — | — | — | ⏳end | building |
| **deu_at** (Austrian) | 🔨~S300 | — | — | — | — | ⏳end | restarted after stall |
| **deu_ch** (Swiss/Zürich) | ⏳translated668 | — | — | — | — | ⏳end | needs decompose/build; native Zürich lexis pass |
| **yue** (Cantonese) | ⏳translated668 | — | — | — | — | ➖ n/a | needs build; verify 口語 not 書面語 |
| **hak** (Hakka) | ⏳translated668 | — | — | — | — | ➖ n/a | needs build; **⛔ native review before audio** |
| **nan** (Taiwanese Hokkien) | ⏳translated668 | — | — | — | — | ➖ n/a | needs build; **⛔ native review before audio** |

## Done so far (07-15)
- Safe deterministic fixes applied to the 3 completed courses (`temp/scan-2026-07-15/fix-safe.cjs`): lowercase-i on English known side (362+340+691, no audio impact per case-rule) + 3 trailing periods. 0 survivors.
- ara_lb: `sans`→`without` (French leak, Haiku-caught S540; LEGO+10 phrases).
- por_br: EU possessive `teu/tua`→`seu/sua` (27 phrases+3 legos+6 seeds, read individually first; target audio nulled). Subject-tu=0, ti/contigo=0, proclitic-te=221 KEPT (authentic BR). `temp/scan-2026-07-15/fix-por-br-teu.cjs`.
- Final passes fired: por_br, ara_eg, ara_lb (Opus, dialect-aware — WATCH for MSA over-correction on the Arabic pair).


## Distinctiveness vs base — measured (identical-target rate across 668 seeds; lower=more distinct)
- ara_eg 0.0% · ara_lb 0.0% (dialects ≫ MSA) · deu_at 26.5% (Austrian dialectal) · por_br 48.4% (BR, teu→seu fixed)
- **spa_mx 91.0%** — but CORRECT: 0 vosotros (base 55), 68 Mexican-lexis, 0 Castilian-lexis. Thin because written MX≈Castilian. OK.
- **fra_ca 98.7%** — thinnest. 39 Quebec-lexis (base 0) but mostly = France-Fr. Defensible (audio-first, QC voice carries accent). ⛔KAI: want a more-colloquial Québécois text pass (tu-inversion/joual) or ship as-is?
- Verdict: NO rebuilds — all differentiate on the correct axes; degree tracks how much the WRITTEN varieties really differ.

## Recurring-defect checklist (from the main-course builds — run on every variant)
- [ ] **Polarity items**: NPI (anything/anyone/ever/yet) in AFFIRMATIVE English USE phrases → should be something/someone ("she has anything else" S360). NOT free-choice "any" (I can go anywhere = fine). Final-pass territory. Seen: ara_eg S360 cluster.
- [ ] **Lowercase-i** on English known side (i'm/i've) — mechanical. Done for the 3.
- [ ] **French/foreign leaks** in English gloss (ara_lb "sans"). Haiku catches.
- [ ] **Register/paradigm leak vs base** (por_br teu/tua; check spa_mx vosotros/Castilian lexis, fra_ca standard-French leak, deu_at standard-German leak, deu_ch Hochdeutsch leak).
- [ ] **Empty/no-build LEGOs** (Check 16) → backfill.
- [ ] **Parentheticals** = gender/person disambiguators (strip → re-check ZUT; gender pairs are ZUT-exempt).
- [ ] **Slashes** = dual-glosses (resolve first-option, check seed context for he/she).
- [ ] **ZUT** conflicts — most are legit gender/person pairs; check synonyms (ara enough كفاية/كافي).
- [ ] **Reported speech** filler / dropped complementizer (por builder), **gender concord** (speaker vs referent → gender-prep).

## Next actions (as capacity frees)
1. Monitor 3 final-passes; verify no MSA over-correction on ara pair (check orchestrator chat findings).
2. Backfill por_br 23 no-build LEGOs → re-final-pass affected seeds.
3. As spa_mx/fra_ca/deu_at hit 668 → scan → safe-fix → distinctiveness read → recurring-defect sweep → final-pass.
4. Build the 4 translated courses (deu_ch to 300 first per Kai; yue/hak/nan) once build slots free → same pipeline.
5. Gender-prep LAST for gendered courses (por_br/ara_eg/ara_lb/spa_mx/fra_ca/deu_at/deu_ch).
6. hak/nan: hold audio pending native review.

## ⚠️ FINAL-PASS SEED-RANGE GAP (07-15)
- `/build/final-pass/:cc` defaults to seeds **4-300** (6 reviewers × ~50). The variants' NEW content is **301-668** — NOT covered by default. Must fire a 2nd pass `?seeds=301,...,668` per course. Currently running (4-300): por_br, ara_eg, ara_lb. AFTER they finish → fire 301-668 pass (that's where S360-class polarity + build defects live).

## spa_mx (Mexican) — SCANNED + SAFE-FIXED 07-16
- Language clean (0 wrong-lang mech; Haiku 6/7 flags = introduce:false components with Spanish word on English side).
- Fixes applied (`temp/scan-2026-07-15/fix-spa-mx.cjs`): deleted 8 malformed USE (5 "creo que, ¿…?" matrix-splice + 3 double-Q); i-fixed 83; glossed 7 components (porque→because etc. + empty se→"(indirect)"); 1 comma. 0 survivors.
- Distinctiveness OK (0 vosotros, 68 Mexican-lexis). Polarity clean (0 real). Multi-sentence KEEP set = natural conditionals/tags (si…, ¿lo harías?).
- ⚠️ BROADER CLASS TO FLAG: introduce:false component phrases glossed with the Spanish word on the English (known) side is systematic (Haiku only sampled 6; full class larger). Not a quick fix — needs a decomposition/component-backfill pass. Non-blocking for audio but should be swept.
- TODO: final pass (waiting for slot) → gender-prep (end).

## ⚠️ FINAL PASSES STALLED under load — must RE-RUN sequentially (07-16 ~03:15)
- Fired por_br+ara_eg+ara_lb final-pass (1-300) in parallel on top of 3 builds + scans → machine hit **loadavg 20+**, Sonnet reviewers died, orchestrators idle-hung ~3hr with 0 progress/0 chat. KILLED all 3.
- Partial work preserved: they deleted ~55 bad phrases + flagged por_br S(2), ara_eg S(3) before stalling. Dialect integrity intact (ara_eg still 0 MSA markers).
- **LESSON: run heavy stages SEQUENTIALLY, not parallel** — one final-pass at a time, and not concurrent with active builds. Cap ~1-2 heavy Opus orchestrators at once on this machine.
- TODO: re-run final passes ONE AT A TIME at low load, covering BOTH 1-300 AND 301-668 (the earlier default only did 4-300). Order: after builds drain.

## fra_ca (Quebecois) — SCANNED + SAFE-FIXED 07-16
- Language PASS (0 wrong-lang, Haiku clean). Fixes: deleted 2 double-Q multi-sentence (S0194L01U04/U05); i-fixed 248. 0 survivors.
- Polarity: 0 real (6 candidates all free-choice "anyone can win/see" = grammatical).
- ⛔ Distinctiveness pending Kai: 98.7% identical to France-Fr (thinnest). Ship as France-text+QC-voice/lexis, or run colloquial-Québécois pass? TODO: final pass + gender-prep.

## deu_at (Austrian) — SCANNED + SAFE-FIXED 07-16
- Haiku FAIL(46) = 45 Austrian dialect FALSE POSITIVES ("I"=ich, "a"=ein — playbook-known FP, LEFT) + 1 real known-side German leak (S0051 "er will interesting things learn" → fixed to English).
- i-fixed 216. Resolved 15 SAFE synonym slashes (real/true→real etc.; 0 survivors).
- ⚠️ deu_at's 82 parens + remaining ~17 slashes are LARGELY FUNCTIONAL CUES (German morphology: case/infinitive/formal/person disambiguators, sense-cues like "right (direction)"→rechts) — NOT bugs, preserve ZUT. Do NOT blind-strip. Remaining careful-pass items: ~17 entangled slashes (case/formal/collision e.g. "to fetch/get" vs "to fetch (infinitive)"), 7 infinitive grammar-labels, 1 ZUT ("should"→soll/solltest = person-differentiate). Fold into deu_at final pass (Austrian-aware Opus).

## ✅ ALL 6 EXPANSIONS through SCAN+SAFE-FIX (07-16). Remaining: final-pass (sequential, low-load) + gender-prep(end). Then the 4 new-course builds.

## ⚠️ FINAL-PASS ORCHESTRATOR UNRELIABLE (07-16)
- ara_eg 301-668 final-pass: flagged 8 seeds (305,310,321,513,553,566,570,598) then went idle 25min+ with 0 chat messages (never posts progress). NOT load-caused this time (load 4). Orchestrator-logic hang — reviewers alive but not finalizing.
- Both final-pass attempts stalled (1st: load 20 overload; 2nd: silent orchestrator hang). Tooling is flaky.
- DECISION: don't keep re-firing it. Capture the flags it produces (= seeds needing rebuild → backfill). The 6 expansions HAVE thorough mechanical QA (scan+fixes) + distinctiveness + polarity. The LLM grammar/naturalness pass is the gap — needs the final-pass tooling debugged, OR Deborah (spa/por/fra/deu) + a native (Arabic).
- ara_eg rebuild-flag seeds (301-668): 305,310,321,513,553,566,570,598 → backfill/rebuild these.
- Prioritizing critical path: get the 4 new courses BUILT (deu_ch/yue/hak/nan) — built beats un-final-passed for audio-readiness proximity.

## yue (Cantonese) — BUILT + SCANNED + SAFE-FIXED 07-16
- 668/668 built (character-based). Colloquial 口語 verified: 4900 phrases with 係/唔/嘅/咗/佢/哋 markers; NOT 書面語.
- Language clean (0 wrong-lang; Haiku 1 flag = S0357 English "send" in target = HK code-mixing, note for review — authentic but consider 傳/寄).
- Fixes: i-fixed 331; resolved 54 clean dual-gloss slashes to first-option (he/she→he, way/method→way etc.; 佢=he/she gender-neutral convergence). 0 survivors. Kept 1 paren-slash + 24 sense-cue parens.
- 1 multi-sentence (S0357-area) minor. TODO: (no gender-prep — Chinese ungendered). ⛔ still wants a native-speaker eye before audio (directional translation).

## fra_ca (Quebecois) — REBUILT in colloquial Québécois 07-16 (supersedes earlier scan+fix)
- ROOT CAUSE of 98.7%-identical: fra_ca missing from DIALECT_NAMES (getLanguageName="French") + golden seeds were standard French. Builder was nominally told "Quebec" (19× via display_name) but anchored to standard-French examples.
- FIX (Kai chose "colloquial spoken Québécois"): added fra_ca→"Quebec French" in DIALECT_NAMES + WEAK_LLM_LANGS(Opus) + reference-examples/fra_ca.json (chu/m'as/-tu/char/frette/pantoute/tsé/faque). Reset translations → re-translated Québécois (Opus, VERIFIED excellent: m'as/asteure/Y-A/a-tu/pognent/eux-autres, ~120/668 strong markers) → wiped standard-French build → team-start rebuild (job 288d4f3c).
- Old standard-French build + its scan-fixes discarded (intentional). Will scan+fix the Québécois rebuild when it completes.
- LESSON [[feedback-verify-builder-told-variant]]: a nominal label ≠ the builder shown the variant; check DIALECT_NAMES + golden seeds + reference.
