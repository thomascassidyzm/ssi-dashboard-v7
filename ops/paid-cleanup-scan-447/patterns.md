# #447 paid-courses cleanup scan — pattern catalogue (Stage 1) and calibration (Stage 2)

Built 17 Nov 2026 by the orchestrator (#447·AI) from: `course-methodology-canon.md` (rule index read in full, sections 0–1 and Part Two read whole),
Kai's memory index + its older index (read-only), the fix-job directories under `ops/`, and the published fix records they cite
(`d/86704d26` spa 12 families, `d/85773ddc` spa applied-vs-open, `d/a5a155b9` female-voice count, `d/59ff7a00` gle_v2 final check, `d/df9ba1cb` ita #195).
**Nothing here is a defect list.** A detector yields CANDIDATES; a family reaches Kai only after its hits were read by hand (canon R0.5, R0.9, R0.13).

READ GAPS (stated, not papered over): Popty's edit-event history route (`/api/admin/audit-events`) needs an admin login → not read; the fix
history came from `ops/` records and published docs instead. `.kai-chat-archive/` stops at 19 Aug 2026 (the canon already harvested it) → skimmed only.
`~/ssi-evidence` (the #195 findings file) and the TTS spend ledger are outside this workspace → not read.

## A. Mechanical families — `detect.cjs` (all courses), calibrated on live `spa_for_eng` rows

| id | family (Kai's words) | canon | fixed before in | detector | known positive → found? |
|---|---|---|---|---|---|
| zut_lego / zut_seed | one English → two target answers (LEGO/seed level) | K2 K4 K22 L34; K3 = reverse is fine | gle_v2 #241/#251, spa #864 creer, ita K35/K36, deu K45/K46 | builder `normalizeForZUT` on known; >1 target | spa `i know → sé / conozco` (S0059L01 vs S0085L01) ✔ |
| zut_use | same, on USE rows (replay cold, P16). Kai 21 Oct: phrase clash is not a blocker — report only where a LEGO is one side | P16 | #195 passes | same key over new LEGOs + USE rows | ✔ (6 groups spa) |
| lego_not_in_seed_* | LEGO not in its own seed | L26; exceptions K28 (pronoun), K54 ("to"), L33 (stand-in it), L28 (clitic) | ita #529, fry #486, gle_v2 | token containment vs own seed, both sides | spa S0038L01 `llevo todo el día aprendiendo` vs seed `…una semana…` ✔ |
| untaught_target | untaught words used early | P1 K8 K14 K29 P27 | spa #425/#98, fin #912, ita P27 | target token first taught (any LEGO/seed) later than the phrase's seed, or never | spa S0051L01U02 `interesante` (taught S58) ✔; #472 knock-on `camino` S0515 |
| gapped_lego | gapped LEGOs | L32 | gle_v2 12/16 Nov | `…`, `...`, `__` in LEGO text | planted `nuair atá … anseo` in a copy of the spa dump ✔ (0 live in spa) |
| notnew_untaught | not-new LEGOs never taught | L31 P25, "duplicate only if BOTH sides match" | dup-LEGO passes #508–#516 | `is_new=false` with no earlier LEGO equal on both sides | spa S0043L02 ✔ (21) |
| dup_debut | same pair taught as NEW twice | L17 | #509 spa (20 inverted held) | `is_new=true` with an earlier equal LEGO | spa S0264L01 `an old man` (d/85773ddc) ✔ |
| lego_syll_over8 / 7_8 | LEGOs over 8 syllables; ≥7 for the "shortest cut" rule (Kai 17 Nov) | L3 | fry #486 holds, deu 270 | builder `checkLegoSyllables` (chars-per-syllable ESTIMATE) | spa S0057L01 (15) ✔ |
| phrase_missing_lego | row does not contain its LEGO; also catches "the X under a X" on the target side | P17; exceptions K31 K49 L28 K32, Kai 10 Nov article ruling | spa #159/#173, ita #632 | builder `checkWordContainment` | spa S0277L01 (8 rows), S0231L02 (6) ✔ |
| article_drift | 'the X' rows under 'a X' LEGOs | Kai 10 Nov: OK if enough exact rows remain; early seeds strict | spa #446 hold | known-side regex per basket, reports drift vs exact counts | spa S0277L01 10 drift / 6 exact ✔ |
| dup_rows | duplicate practice rows | — | spa #189, #212 U09 | same pair twice in one basket | spa S0040L01U01 = B03 ✔ |
| empty_audio | empty audio slots on played rows | A16 | spa #664, ara #221, every apply ("0 empty") | null known/target1/target2 uuid under a NEW LEGO | planted row with a null known slot ✔ (spa live: 0, matching the fix records' "0 empty") |
| debut_no_practice | debut with no real practice | P30 P10 | 28 Aug coverage day | new LEGO with 0 build+use | planted ✔ |
| seed_not_played | seed sentence in no played basket | P26 | all-review seed rule | seed pair absent from rows under new LEGOs | spa seed 71 ✔ (22) |
| tag_lego / tag_phrase | brackets, slashes, labels, "as in" in text | K11 K42 L19 | fin #846, deu_ch #719 | `()[]{}/+`, `as in` | planted `when? (asking)` ✔ |
| qmark_mismatch | question mark on one side | A7 A9 | fry #735 | terminal `?` on one side only | spa S0470L01B03 ✔ |
| same_both | wrong language / untranslated | — | Aug sweeps | known == target | planted ✔ |

## B. Lexical families — `patterns.json`, per target language (regex → READ)

Seeded for Spanish and for English-known courses from live known positives; each regex must match its own known positive or `detect.cjs` exits 3.
All nine Spanish/English patterns found their live positive: practicar + gerund (S0005/S0228 family), disfrutar + infinitive (S0206L02, S0214L02, S0110L03U11),
gustar/encantar + gerund (S0567L03B02–B04, U03), tomar … tiempo para (S0027L03), poder + tener/tomar request calque (S0586, S0156L02U02),
cuando + present about the future, past frame + present verb, `elderly` (S0231L02 ×9), English progressive calque.
**Every other language's lexical patterns are mined by that language's worker from its own fix records** (listed in the briefs) and returned in this shape
with a known positive each; the orchestrator did not have the context budget to read every per-language fix record itself, and says so.

## C. Families with NO trustworthy detector in this scan (GAPS)

- **Female voice saying the male form** (ita sicuro #126/#130, spa/fra/por #131/#142, ara #641). The #131 method needs the TTS spend ledger (outside this
  workspace) and no check can hear a clip (A22; Whisper is off, Tom 7 Nov). What CAN be counted from text: rows whose target carries a first-person
  masculine form in a course with a female target voice = slots AT RISK. Reported as at-risk counts for the variants, never as defects.
- **Wrong word spoken / clip ≠ text** (A13, A21): by ear only, by ruling (A22). Not scanned.
- **Intro wording** (A2, PR1–PR3, "no target words in intros", human-authored lines): `script-view` carries no intro text. Workers use
  `GET /api/production/<course>/presentation/<legoId>` on LEGOs they already flag, plus the committed `tools/check-intro-mirror.cjs` /
  `tools/check-presentation-drift.cjs` if they run unchanged; coverage is stated per course.
- **Echo yes/no rows**: an Irish ruling (gle_v2, 17 Nov 11:25Z). A known-side regex for bare echoes (`No, I didn't`) runs on every English-known course as
  a candidate list only; whether the target echoes the verb is a per-language read (Welsh/Finnish precedent: plain yes/no).
- **Grammar / naturalness** (R0.16): a separate read by ruling; this scan reads only what a detector or a fix-record pattern points at.
