# fin_for_eng — general content issues: status & HOLD list

Companion to `fin-general-issues.md` (Kai's doc) and the think-cluster work. Course is seeds-only (668 seeds, 0 LEGOs). Applied 2026-07-13 via `POST /api/course/fin_for_eng/translate` (course-scoped, no cascade).

## ✅ APPLIED (deterministic, read-before-apply, verified 0-mismatch)

- **§0 corruption reversal — 20 seeds.** `Finnish`+lowercase → `fin` (finish/find/find out/finding/definitely/fine). All mid-sentence, so lowercase reversal is unambiguous. Standalone `Finnish` (language name, 14 seeds) untouched. Seeds: 11,17,50,66,110,117,149,195,200,251,278,281,293,295,404,433,460,525,526,633. **S0101 HELD** (see below).
- **§2.1 keep→carry on** (English): S0092, S0443, S0563.
- **§2.2 like** (Finnish): S0364 `pitänyt`→`tykännyt`.
- **§2.3 doing well→getting on** (English): S0072, S0129, S0655. (S0646/S0661 "doing something"→teette and S0173 "manage"→pärjään left as-is, per doc.)
- **§2.4 might→could** (English): S0520.
- **§5 grammar** (Finnish): S0052/S0053 `halusin`→`halusi`; S0054 `sulles`→`sulle`; S0099 `Sä`→`Sun`; S0100 `Sä`→`Sun` + `jotain vastaavan`→`jonkin vastaavan`; S0025 `Aiotteko sä`→`Aiotko sä`; S0278 `Pititkö sä lopettaa`→`Pitikö sun lopettaa`. English typo S0130 `surrpise`→`surprise`.
- **§5 En/Ei sweep**: S0351, S0280 `En,`→`Ei,` (3sg/impersonal subject). S0375 kept `En` (1sg, correct).
- **§6 contractions→full form** (frozen register rule): vois→voisi (S0310,312,432); pitäis→pitäisi (S0253,407,438,497,499,528) + S0405 `Pitäiskö`→`Pitäisikö`; haluais→haluaisi (S0012,426); tekis→tekisi (S0485).
- **§6 3pl/1pl agreement→colloquial** (main-clause only): S0421 `tietävät`→`tietää`; S0436 `tarvitsevat`→`tarvitsee`; S0424 `tuhlaavat`→`tuhlaa`; S0425 `ymmärtävät`→`ymmärtää`; S0598 `tekivät`→`teki`; S0200 `me lopetamme`→`me lopetetaan`; S0409 `me teemme`→`me tehdään`.

Total: **56 seeds edited this pass** (+ 47 from the think table earlier).

### ✅ can/could cluster + think-table v2 deltas — APPLIED 2026-07-13 (20 seeds, 0-mismatch)
- **think v2 deltas** (only 2 genuinely new; S0072/S0655 "getting on" already landed via §2.3): S0318 `pystyisi`→`voisi` (unify could→voisi with the S0316/S0317 trio); S0336 EN `she can open`→`she's able to open`.
- **can plain-verb pattern** (Finnish retarget; English keeps natural can/can't, LEGOs teach plain forms): S0010, S0056, S0113, S0140, S0526, S0585 (pystyä/voida → plain `muistan`/`en muista`/`nään`/`arvaa`).
- **can ability→"able to" English markers** (Finnish pystyä unchanged): S0007, S0028, S0029, S0148, S0225, S0229, S0331, S0333, S0358, S0359, S0433.
- **S0011 skill→"know how"** EN marker (Finnish osata unchanged).
- **S0427 `haluais`**: think-table v2 re-confirms the contracted form — treated as intentional, HOLD item resolved (not expanded to `haluaisi`).

---

### ✅ followup CSV + v2 resolutions — APPLIED 2026-07-13 (20 seeds, 0-mismatch, corruption now ZERO corpus-wide)
- **need-polarity patch** (amends applied think rows): S0326, S0327 `tarvii`→`pitää`.
- **feel rewrites**: S0040/S0642/S0657 wellbeing→`voida` (miten X voi); S0041 `voin hyvin`+`mua väsyttää`; S0042 `voida paremmin`; S0026/S0114 feel-as-if→`musta tuntuu, että`; S0106 be-not-feel→`olla onnellisia`; S0548 `mua masentaa`.
- **work unification**: S0199, S0230 `työskennellä`→`tehdä töitä`.
- **purpose-so**: S0530, S0109 `jotta`→`niin, että`.
- **wording**: S0450 `ehtiä junaan`; S0138 `Tää oli se paikka, missä…`; **S0101 realigned** (learning; corruption cleared); S0414 `Voitaisko me saada pullo…`.
- **register**: S0668 `Toivon`→`Mä toivon`.
- **v2 resolutions confirmed**: English divergence from other for-eng courses **APPROVED** (flag #5 closed); oppia kept for durational learn; §3 verb-splits all resolved.

### ✅ v3 full-corpus QA pass — APPLIED 2026-07-13 (qa_final_fixes.csv, 88 seeds, 0-mismatch)
Full 668-seed native QA sweep. Closed **all** completeness gaps + all held items below, plus corpus-wide fixes: case/tense/agreement, participial→että/MA-infinitive per register rule, full passive conditionals (voitaisiinko/haluttaisiin/oltaisiin), colloquial perfect (me ollaan + participle), possessive-suffix→mun/sun, relative-clause 3pl colloquial (jotka puhuu/tykkää), plus new mapping rules: works-as/for→olla töissä, care→välittää, worry→huolestua, happy-to→mielellään, cause trouble→aiheuttaa, visit→käydä, first→eka, lead the way→näyttää tietä, next time→ensi kerralla, takes-time→jollain kestää, be-learning→olla -massa (S0021). English-side changes (4): S0117 getting on, S0503 causing trouble, S0027 takes-me-time frame, S0567 "and watching". En/Ei: S0276/S0406 En→Ei (answer agrees with elided verb of QUESTION — impersonal pitää/pitäisi → Ei). S0427 haluais→haluaisi (register rule).
**Post-apply rescan: 0 työskennellä, 0 feeling-tuntea, 0 jotta, 0 corruption corpus-wide.** All previously-flagged stragglers (S0133/197/198/234/118/542) and held items (S0022/286/287/288 relcl-3pl, S0574, S0501, S0273/S0378-class En/Ei) RESOLVED.

**Remaining open flag (course-wide register decision, parked):** contracted infinitive after alkaa (`alkanut oppii` vs full `oppia`) — table uses full forms; admitting contracted infinitives (oppii/sanoo/tehä) is a corpus-wide register-class change needing its own decision.

### ~~⚠️ Edit-table completeness gaps~~ — RESOLVED by v3 QA pass (kept for record)
The v2 doc states these as course-wide rules, but the CSV enumerated only some seeds. Rescan found stragglers still violating the stated rule. Proposed conversions below — **not applied** (would be unreviewed Finnish):
- **`työskennellä` still present** (doc §1/§2.3: "työskennellä removed from course, all senses → tehdä töitä"):
  - S0133 `…kun te työskentelette yhdessä` → `…kun te teette töitä yhdessä` (clean)
  - S0234 `…joka työskentelee sun veljen kanssa` → `…joka tekee töitä sun veljen kanssa` (clean)
  - S0197 `Mun poika työskentelee opettajana` ("works as a teacher") — `tekee töitä opettajana` is awkward; native likely `on opettajana` / `on töissä opettajana`. **Your wording.**
  - S0198 `Mun tytär työskentelee kunnalle` ("works for the council") — same employment-sense awkwardness; `on töissä kunnalla`? **Your wording.**
- **feeling-`tuntea` still present** (doc §2.2: "nothing uses feeling-tuntea; tuntea = know-a-person only"):
  - S0118 `Mä tunnen itseni paremmaksi…` ("I feel better") → `Mä voin paremmin…` (mirrors approved S0042). Clean.
  - S0542 `Aina kun sä tunnet itsesi vihaiseksi` ("whenever you feel angry") — not a wellbeing/experiencer/as-if frame; `be angry`→`oot vihainen` or experiencer `sua suututtaa`? **Your call — no default in the frame map.**

(All other feel-seeds verified correctly handled: S0115/S0122/S0618 tuntua, S0147 olla, S0363 teki mieli.)

## ⏸️ HOLD — needs your call

**All prior HOLD items RESOLVED** by v2 decisions + v3 QA pass. The seed content is now clean (0 corruption, 0 unification leftovers, all held ambiguities decided).

- **One parked flag** (course-wide, needs its own decision): contracted infinitive after alkaa (`oppii`/`sanoo`/`tehä`). Table uses full forms; changing this is a register-class decision, not a seed edit.
- **S0273/S0378** (the two En/Ei I originally flagged): not in the QA CSV, but the confirmed rule (particle agrees with the QUESTION's elided verb) suggests reviewing them the same way S0276/S0406 were handled — flag left in case the course owner wants a final sweep, otherwise harmless.

---

## 📋 §4 — carry into DECOMPOSITION stage (no seed edits)
- **know**: never a LEGO alone. Chunk must include object to disambiguate: know+fact/clause→tietää, know+person→tuntea. Keep e.g. "I know that young woman" whole.
- **pitää** = one target, multiple English sources (obligation / hold S0512,334 / keep-retention S0528 / like). Many-knowns→one-target is ZUT-safe, but practice-phrase prompts must disambiguate by context.
- **Matcher noise — do NOT "fix" these**: opiskelija* = student (S0324,434); tunteja = hours (S0511); johtaa tietä = lead the way, tie=road (S0416); teetä/teestä = tea (S0623,628); tekosyyn = excuse (S0523).
- **need-to atomic chunks** (if §3.1 option (a) chosen): don't split "need to"/"don't need to".
- **Formal te-seeds** (S0642–S0668 range, rouva/herra) exempt from colloquial register sweep.
- **can/could plain-verb pattern** (from can-cluster): English seeds keep natural can/can't but the Finnish uses **plain verb forms** — LEGOs teach `I remember→mä muistan`, `I don't remember→mä en muista`; the "can't-X→plain-negative" mapping is learned as a phrase-level pattern, NOT a `pystyä`/`voida` LEGO. Affects S0010/S0056/S0113/S0140/S0526/S0585. Don't re-introduce pystyä/voida into these.
- **can-cluster English markers are load-bearing**: `able to`→pystyä (physical capacity), `know how`→osata (skill), plain can/can't→plain verb. The decomposer must respect the English marker to pick the Finnish verb.
- **so-purpose** — RESOLVED: unified on `niin, että` (`jotta` removed). S0056/S0109/S0530 done.
- **experiencer chunks are atomic** (from v2 §3.2): in `mua väsyttää`/`mua masentaa` the English "I" is NOT the Finnish subject (partitive experiencer + subjectless 3sg) — `[I'm getting tired → mua väsyttää]` never splits into I+verb. Form-stable under insertion (`mua alkaa väsyttää`, no visible change).
- **start → alkaa vs aloittaa, frame-conditioned** (v2 §3.3): start+verb → `alkaa`+infinitive; bare start / start+noun → `aloittaa`. "start" never a LEGO alone. ⚠️ S0224 straddles (`started to learn`/`aloittanut oppimisen`, noun frame) — course owner to accept or retarget to `alkanut oppia`.
- **plain-verb pattern is productive** (v2 §3.1): restricted to stative perception/cognition (see/remember/guess → plain verb); action verbs keep voida (`can count → voin laskea`, S0530).
- **"could" resolved by markers** (v2 §3.6): bare could+clause = conditional `voisi`; past ability always carries "able to" → `pystyi`. voida past/present homography never appears unmarked.

## Post-build follow-ups (build 452-668, logged 2026-07-17)
- **Cap English "I" sweep (course-wide):** some BUILD fragments lowercase the pronoun "I" (e.g. S0525 "i'm able to check"). Known(English)-side "I" must always be uppercase. Run a cap sweep at scan-course time across fin_for_eng.
- **S0523 canonical translation review:** target "Sen sijaan että olisi antanut tekosyyn" uses conditional-PERFECT (olisi antanut = "having given"); "instead of giving an excuse" wants conditional-PRESENT "antaisi". Builder forced LEGO gloss giving→olisi antanut honestly under the 8-syll cap. Final-pass/Kai decide whether to retranslate canonical to "...että antaisi tekosyyn". Builder correctly did NOT self-retranslate canonical.
- Register-normalization PATCHes in effect (builder editing stored targets standard→colloquial, e.g. S0525 oletko→ootko). Confirmed correct.

## Builder-3 handoff notes (seeds 523-552, 2026-07-17) — reviewer sanity-check list
- ZUT known-side differentiations (avoid collisions with existing glosses): 540 "I don't mind"=mua ei haittaa exists → mulle sopii glossed "it's fine with me"; 537 väärässä glossed "mistaken" (wrong→väärää exists); 531 kuka tahansa glossed "anybody" (anyone→kenenkään exists).
- Single-M-LEGO consolidation seeds (whole sentence = prior vocab): 543 (se oli oikeassa), 549 (mun pitää olla hiljaa), 552 (kylän toisessa päässä); also 538/548/550 single-LEGO (one new chunk).
- English "I" capitalized in known text from seed 535 on; cap-sweep still needed for 523-534 (and confirmed lowercase-i persists in some LEGO labels e.g. 548 "i'm feeling down" — sweep LEGO labels + phrase text, standalone i and i'm/i've/i'll/i'd).
- Register PATCH normalizations applied to stored targets (standard→colloquial), e.g. 525 oletko→ootko.
- Builders: fin-builder-3 handed off cleanly at 552 (context length, not limit); fin-builder-4 (Opus) building 553→668.

## Formal-register seeds (herra/rouva, ~S639-667) — REVIEW ITEM for Kai
- Builder correctly uses formal 2nd-person (teidän kanssanne, expect Oletteko/Haluatteko). Known-side disambiguation good ("with you (formal)" vs colloquial sun kanssa).
- OPEN register call (Kai owns): 1st-person self-reference stays ultra-colloquial inside formal seeds — e.g. S0639 USE "mä oon täällä herra" mixes casual "mä oon" with deferential "herra". Golden analysis only specifies formal 2nd-person forms for these seeds; 1st-person unspecified. Decide: keep "mä oon" (consistent I-form course-wide) OR shift to "olen/minä olen" in herra/rouva seeds for tonal consistency. Applies across S639-667. (cap-I artifact "i'm"→"I'm" also present, on sweep list.)
