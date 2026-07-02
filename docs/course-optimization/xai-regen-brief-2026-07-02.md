# xAI full-regen brief — big nine for_eng (draft 2026-07-02, pre-readiness-report)

**Premise (Kai):** everything regenerates with the new xAI voices — this brief collects what the regen must know. Final version ships with the readiness report; TTS fires only after Kai approves the plan (standing gate).

## Scale (nulled pointers as of late 07-02 — will grow slightly as final-passes finish)

| course | LEGO clips needed (known/target1/presentation) | phrase clips needed (known/target1) |
|---|---|---|
| spa | 622 / 597 / 79 | 5,849 / 5,875 |
| fra | 115 / 33 / 115 | 64 / 30 |
| por | 755 / 753 / 765 | 7,231 / 7,220 |
| deu | 822 / 822 / 835 | 8,260 / 8,253 |
| ita | 95 / 86 / 95 | 738 / 741 (rises when the 39-seed redo phrases count in) |
| zho | 562 / 374 / 569 | 5,577 / 7,859 |
| jpn | 866 / 864 / 114 | 7,585 / 7,593 |
| kor | 862 / 857 / 548 | 8,058 / 8,048 |
| ara | 775 / 770 / 781 | 7,108 / 7,096 |

(t2 mirrors t1. If the regen is truly "everything", these counts are just the *minimum*; the rest is voice-swap regeneration of currently-linked audio.)

## Special handling the regen MUST implement

1. **Short-word ellipsis** (feedback_short_word_ellipsis + Meredith's 处/糟 finding): 1-2 char debut targets need the ellipsis/SSML treatment or they render as "just a sound". Ready lists: **zho 855, jpn 330, kor 47 LEGOs** in `temp/reviewer-mining-2026-07-02/` JSONs. jpn single-char also has the SSML `<sub>`+trailing-dot trick (jpn-single-char-tts-fix).
2. **Presentation regeneration from current known_text** — presentations are text-derived; ~97 known drift rows self-heal by regenerating (deu S0190 verified: LEGO texts correct, only old audio wrong). Component presentations honour `introduce:false` (silent particles: 了, 吗, kor politeness endings).
3. **Human-origin audio is sacred** — phase8's `origin='human'` guard must stay on (ita has 75 human clips; none on the rebuilt seeds, verified).
4. **Gender expansions**: `course_gender_expansions` coverage verified 07-02 — spa **921** (new today; covers Deborah's cansada/sola class), fra 852, ara 366, por 273, ita 267, **deu 0**. deu's zero is probably linguistically correct (German predicate adjectives don't inflect for speaker gender), but run deu's gender-prep pass post-final-pass as confirmation-by-construction (expected ≈0 rows) before its regen.
5. **Arabic punctuation**: ؟ و، (RTL rules) — never ASCII ? , in generated text handling.
6. **jpn conventions**: ka+？ pattern validated as-is; trailing 。 stripped course-wide per Kai's centering directive (65 final-pass seeds swept post-final-pass — check residue before regen).
7. **Voice IDs**: xAI-first ordering already shipped to kai-stage (06-29 session). XAI_API_KEY on ssi-machine prod-api was NOT loaded as of 07-01 (xai-key-not-live memory, parked with Tom) — **must be resolved before any generation run**.
8. **UUID casing**: S3 UUIDs uppercase (feedback_uuid_uppercase).

## Pre-regen gates (the readiness report will confirm each)
- All 9 courses: ZUT detector = 0 (7 done; zho closing + ita re-check in flight)
- Seed grids all-complete (final-passes in flight)
- scan-course mechanical re-run clean per course
- Whole-course known-collision sweep (blind-spot class) per course
- tel/kan/mar are the OTHER session's scope — not in this brief.
