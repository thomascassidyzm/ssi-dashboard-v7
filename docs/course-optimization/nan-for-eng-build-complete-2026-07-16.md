# nan_for_eng (Taiwanese Hokkien) — Build Handoff / Post-Build Sweep Queue

**Build date:** 2026-07-16
**Status:** ⏸️ PAUSED at seed **465/668** (Kai asked to stop). All builders stopped cleanly, nothing running. Frontier verified: completed=465, next_seed=466 ("Let me throw it over the wall."). 727 legos / 6327 phrases / ratio 8.7 / quality PASS.

### Resume instructions
1. `curl -s http://localhost:3471/api/resume/nan_for_eng` to confirm next_seed (should be 466).
2. Spawn ONE Sonnet builder from that seed with the accumulated tips (see builder-5 prompt pattern: pull target from /api/resume, `?seed=N` on vocab, containment, ZUT gloss disambiguation, problem-verb discrimination).
3. **Kill-before-spawn on every respawn** — TaskStop the old builder and confirm the frontier is frozen BEFORE spawning the next. A builder's "pausing for context" message is NOT a stop.
4. 203 seeds remain (466→668).
**⛔ HOLD TTS** — this course requires **native Taiwanese Hokkien speaker verification before any audio**. The directional (known→target) pass was generated from a **6-example non-native reference** (see brief `zut_concerns`). Nothing ships until a native reviewer signs off.

## Build orchestration log
- Builder-1 (Sonnet): seeds 1–95, then paused for context.
- **Two-writer race incident:** builder-1 auto-resumed after its "context pause" and collided with a respawn (builder-2), both writing from frontier ~96. Resolved by process-terminating builder-1 (TaskStop). **No data corruption** — duplicate writes bounced off the API's atomic "already built" guard. builder-1 effectively wrote 96–105.
- Builder-2 (Sonnet): seeds 106–200, then context death at 200.
- Builder-3 (Sonnet): seeds 201→ (in progress). Kill-before-spawn applied (TaskStop builder-2 before spawning builder-3) — clean, no race.
- **Lesson:** a builder's "pausing for context" message is NOT a stop; it can auto-resume. Always TaskStop-confirm frozen BEFORE respawning. (Matches `builder-checkpoint-message-not-a-stop`.)

## Quality: strong on spot-checks
Authentic Hokkien lexis throughout, correct problem-verb discrimination per the brief:
- 想欲 (want to), 免/毋免 (needn't), 愛 (must) — desiderative/obligation kept distinct
- 捌/毋捌 (know-acquaintance) vs 知影/毋知 (know-fact) — correctly chosen by context (毋捌 for people, 毋知 for answers)
- 聽無 (understand-spoken) not 了解
- 有路用 (useful, idiomatic — not Mandarin 有用), 查埔人 (man), 查某人 (woman), 禮拜日 (Sunday), 昨昏 (yesterday), 敢若 (resemble), 才拄開始 (just started), 明仔載 (tomorrow), 這馬 (now)

## Post-build sweep queue (for Kai / native reviewer)
1. **⛔ NATIVE VERIFICATION of entire directional pass** — highest priority; non-native reference source.
1b. **⚠️ CONTENT MISMATCH — S0345** — known "Who said that he's not ready to leave yet." → target 伊講伊猶未準備好欲離開 ("He said he's not yet ready to leave"). Target uses 伊 (he), not 啥人 (who); English ends with "." not "?". Likely known-side corruption ("He said…" → "Who said…") from the **translation pass**, inherited by the build. Hokkien is coherent; decision needed on which side to correct. NOT builder error. (Worth grepping the seed set for other "Who said…"/period-ending anomalies.)
2. **Cap leading "I"** — EN known-side BUILD debut fragments lowercase "i" ("i'll speak", "i'm going to guess"). "I" is an exception to the first-letter-lowercase rule (uppercase mid-sentence too). Mechanical SQL cap-sweep. (Similar to `eng-target-lowercase-i-bug` but on the known side.)
3. **Empty-basket seed tally** — some seeds have 0 new LEGOs (all vocab reused), e.g. S0172, S0188. Legitimate per `single-word-seed-empty-baskets`, but confirm the full count with Kai (yue had 62 such seeds as an open question). *[count TBD at completion]*
4. **Relative-clause rendering consistency** — inconsistent: parataxis/resumptive-pronoun at S0232 (我捌一个老查某人，伊會記得答案) vs 的-relative at S0262 (你咧講話的彼个查埔人). Both are valid spoken Hokkien; a reviewer should pick a convention. Native check.
5. **Disambiguating ZUT glosses slightly stilted** — near-synonym collisions resolved by specific EN labels ("at what time" for 當時 vs "when"→當; "how could" for 哪會 vs "why"→為啥物; "concerning" for 關於 vs "about"→差不多). Methodologically required, but review the EN labels for naturalness.
6. **Occasional awkward BUILD debut fragments** — e.g. 啥人是 ("who is", reversed word order). Minor, debut-only.
7. **Component-gloss mislabels (known side, trivial)** — e.g. S0300 M-LEGO 看起來 breaks 起來 as "come" (it's a directional complement, not "come"); the compound gloss "looks/seems" is correct. Cosmetic; only matters if component glosses surface to learners.

## Infra note
- `LOGOGRAPHIC_LANGS` length-ratio allowlist already includes nan (commit 9f0de2a1) — needed for this course.
