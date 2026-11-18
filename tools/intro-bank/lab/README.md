# Intro lab (#348)
Web Audio page for tuning the spliced Tom-006 intro by ear: gap before LEGO, gap LEGO→tail, LEGO emphasis dB, tail level, fade, edge trim; six tails (is / is said like this / is said / sounds like this / we say like this / is given as, each rendered once in Tom-006, 67 chars); and CUT mode, which takes "LEGO is" as one continuous piece from an existing continuous Tom-006 intro (`The German for: 'LEGO', is:`, Cartesia word_timings give the cut, onset snapped back to silence) and splices only the new "The X for" in front.
Live: command-surface `public/evidence/348-intro-lab-2026-10-13/` (/evidence/348-intro-lab-2026-10-13/index.html). Regenerate data: `node tools/intro-bank/lab/build-lab.mjs <outDir>` then copy `index.html` beside it. Changes no shipped defaults.

Cut coverage for the five #310 courses (donors = 5,584 distinct plain Tom-006 "LEGO is" intros across 11 courses, normalised lowercase/no punctuation):
| course | LEGO rows | cuttable | distinct LEGOs | cuttable |
|---|---|---|---|---|
| afr | 521 | 346 | 491 | 321 |
| ell | 1023 | 765 | 756 | 531 |
| eus | 744 | 547 | 703 | 509 |
| nld | 626 | 536 | 494 | 409 |
| pol | 748 | 570 | 669 | 497 |
| all | 3662 | 2764 (75.5%) | 1872 | 1097 (58.6%) |

## Target LEGO after the intro (#487)
After the intro the page plays the LEGO's target voice 1 then voice 2, as the intro cycle does (chained, no gap), with a target-speed slider; optionally the debut cycle after the 2000 ms linger (known prompt, computed gap = clamp(1000, 15000, 2.8 × mean native ms + 800), voice 1, voice 2). Timings read from `generateScript.ts` (INTRO_LINGER_MS), `toSimpleRounds.ts` and `computePauseDuration.ts`. Any course with a Tom-006 "The X for" frame: `node tools/intro-bank/lab/build-lab.mjs <outDir> code1,code2`.
