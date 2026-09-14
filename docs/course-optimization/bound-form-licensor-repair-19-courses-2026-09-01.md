# Bound-form / licensor-outside-chunk defects fixed across 19 courses

*2026-09-01. Executing Kai's ruling, verbatim: **"Yup, fix all and regenerate."** This is
the repair pass for every confirmed finding in
`docs/course-optimization/bound-form-licensor-scan-2026-09-01.md`, applied to the live
database. The method is the Italian one
(`docs/course-optimization/ita-voice-config-repoint-and-s558-2026-09-01.md`): merge toward
the licensor where one exists, correct the form where none does, invent no notation, and
never rewrite text that isn't wrong.*

---

## Direct answer

**All 19 courses are done. 22 LEGO cards and 88 practice phrases were repaired in the live
DB, and 110 clips were regenerated and verified — every one rendered in its course's own
incumbent voice, read back and passing. One boundary was moved (Galician), and it was the
cheap kind: no lego index shifted anywhere in the pass, no phrase id was reissued, no
learner-progress migration was owed, and no `course_audio` row was deleted.**

The pass also **removed six ZUT collisions** and created none — fixing this defect usually
takes a collision out, exactly as it did at Italian seed 558.

Three things need Kai and are stated in full below: **nine Welsh clips that cannot be
regenerated** (human-voice courses), **three French clips blocked by the retired xAI
provider**, and **a Lithuanian pattern that turned out to be systemic, not isolated**.

| Course | Confirmed | LEGOs | Phrases | Clips rendered | Notes |
|---|---|---|---|---|---|
| `gle_cn_for_eng` Connacht Irish | ~8 | **9** | 18 | — | no audio in course at all |
| `spa_mx_for_eng` | 8 | 0 | 7 | 14 | 2 scan findings disputed |
| `srp_for_eng` | 5 | 0 | 9 | 18 | one defect family |
| `cym_s_for_eng` South Welsh | 2+1 | **4** | 0 | 0 | human voice; 1 held for Kai |
| `deu_ch_for_eng` Swiss German | 1 | 0 | **5** | — | 4 more than the scan found |
| `rus_for_eng` | 3 | 0 | 8 | 13 | |
| `por_br_for_eng` | 2/8 | 0 | 11 | 22 | 3 more than the scan found |
| `ces_for_eng` | 2 | 0 | 7 | 12 | |
| `hun_for_eng` | 2 | 0 | 4 | 9 | |
| `gla_for_eng` Scottish Gaelic | 1 (low conf.) | 1 | 8 | 0 | **confirmed** and fixed |
| `gle_for_eng` Irish | 2 | 2 | 2 | 2 | |
| `cym_n_for_eng` North Welsh | 1 | 2 | 0 | 0 | human voice |
| `cym_nnew_for_eng` | 1 | 2 | 0 | 0 | same clips as cym_n |
| `lit_for_eng` | 1 | 0 | 3 | 6 | systemic gap found |
| `est_for_eng` | 1+1 | 1 | 3 | 9 | unconfirmed item left |
| `glg_for_eng` Galician | 1 | 1 | 1 | 7 | **the one boundary move** |
| `hrv_for_eng` | 1 | 0 | 1 | 2 | |
| `fra_for_eng` | 1 | 0 | 1 | **0 — blocked** | xAI, real gap |
| `ita_for_eng` | 1 open | — | — | — | **already fixed; verified, not re-touched** |
| **total** | | **22** | **88** | **110** | |

Plus 13 clips healed for free by the text-change trigger's same-voice relink, and 6 human
Welsh takes moved into the re-record queue rather than being deleted.

## How the work was split

Connacht Irish, Swiss German and the Italian verification were done directly. The rest went
to four family workers, one per language family, each briefed with a digest of the method
and the obligations rather than the 103k-character canon: **#783 Celtic**, **#784 Romance**,
**#785 Slavic**, **#786 Baltic/Finno-Ugric**. Their full per-course reports are the four
companion documents committed alongside this one:

- `celtic-bound-form-licensor-repair-2026-09-01.md`
- `romance-bound-form-repair-2026-09-01.md`
- `slavic-bound-form-repair-2026-09-01.md`
- `bound-form-baltic-uralic-repair-2026-09-01.md`

The three done directly are written up in
`bound-form-connacht-swiss-italian-2026-09-01.md`.

---

## The three things that need Kai

### 1. Nine Welsh clips cannot be regenerated — the courses are human-voice

`cym_s_for_eng`, `cym_n_for_eng` and `cym_nnew_for_eng` are Aran and Catrin's recordings
(`legacy_import`, no voice configuration at all). `queue-audio-pass.cjs` refuses them by
design: *"a human-voice course — no TTS is ever queued for it. Changed content there is a
recording task for Aran and Catrin."*

Six of the ten Welsh card edits healed for free — the trigger found existing human takes
that already say the corrected form (`bwyta`, `digwydd`, `gwneud yn siŵr`). **Four cards
are now correct in text and silent in audio**: `coffi` (cym_s `S0292L06`) and
`llawer o resymau` / `diwedd` (`S0266L02`, `S0266L05`, in both northern courses, sharing
clip ids). No take of the corrected word exists anywhere in those courses.

Nothing was deleted. The six superseded takes are still in `course_audio`, unlinked, and
`rerecord_wanted` is set on each with the reason and the before→after text. If your ear says
Aran already says the radical on any of them, restoring the link is one UPDATE.

**Why we did not just re-link the old takes:** whisper-small decodes `1fbc2ea4` as
"**Ll**awer o resymau" and whisper-medium as "**L**awr or yw'r semyl" — the two models
disagree on precisely the consonant in question. Whisper cannot referee Welsh; your ear
settles it in five seconds, and relinking a clip we could not verify is the exact failure
O2 names.

**Also held for you, `cym_s_for_eng:S0279L01` "a big world" = `fyd mawr`.** Same shape,
licensed in its seed by predicative `yn`, radical `byd` attested at `S0290L01`. #783 judges
it a real defect and would fix it to `byd mawr`; the standing instruction is that a Welsh
borderline is your call, so it is untouched. One statement closes it:

```sql
UPDATE course_legos SET target_text='byd mawr'
 WHERE course_code='cym_s_for_eng' AND lego_id='S0279L01' AND target_text='fyd mawr';
```

And eight North Welsh **build fragments** (`lawer o resymau i ystyried`, `ddiwedd yr ail
hanner`, …) were left alone: they are fragments clipped out of a licensed sentence rather
than citations, whether a build fragment keeps the mutation of the sentence it was cut from
is a Welsh-editorial call, and fixing them would silence eight more human takes.

### 2. Three French clips are blocked by the retired xAI provider

`fra_for_eng:S0237L02B02` — known "tell your brother" → `dise à ton frère`, an English
imperative glossing a French subjunctive with nothing licensing it. The text is fixed to
`je dise à ton frère` / "I tell your brother", parallel to its own B01 and to its licensed
use at U04.

The audio could not follow. `fra_for_eng` is configured xAI on all roles **and genuinely
serves xAI** — 15,895 / 15,891 / 15,872 linked clips per role, and **zero** Azure. So the
taste-safe repoint that fixed `ita_for_eng` does not apply; repointing here would be a real
voice migration, which is your decision and was not made. The refusal, verbatim:

> `Retired provider "xai" reached tts-service.generate (403). New renders may not use it (Tom 2026-08-27). Existing clips on it are untouched and still play.`

**One build rung now has correct text and three empty audio slots.** All three superseded
clips are retained and unlinked; the drops are logged in `content_audio_link_drops`.

### 3. Lithuanian genitive-of-negation is systemic, not isolated

The scan called this one isolated instance. It is not: a single sweep of `lit_for_eng` turns
up **≈15–20 more** of the identical defect outside the scanned window — `nenoriu duoti
atsakymą` (should be `atsakymo`), `neturiu atsakymą`, `nenori aiškinti problemą`,
`ji nenori naudoti savo automobilį`, and the `ką nors` → `ko nors` family. The full list is
in #786's report.

Three were fixed (the scan's window). **The rest were deliberately left**: partially
repairing a systemic pattern makes a course *less* internally consistent, not more, and
sizing and sequencing that sweep — plus the R0.2 question of when the genitive is introduced
— is your call, not an agent's. It is a separate job of roughly 15–20 phrases plus audio.

---

## What was found beyond the scan, and what was disputed

**Found beyond it (the brief said to check every phrase under a defective LEGO, not only the
named row):** Swiss German 1 → **5**; Serbian 5 → **9**; Russian 3 → **8**; Czech 2 → **7**;
Brazilian Portuguese 8 → **11**; South Welsh 2 → **4**; North Welsh 1 → **2 per course**;
Scottish Gaelic 1 LEGO → 1 LEGO **+ 8 phrases**. Every extra is the same defect in the same
cluster, evidenced individually in the companion reports.

**Disputed — the scan says defect, we say the text is correct, and it was left alone:**

- `spa_mx_for_eng:S0526L02U01` `no creo que puedas` and `S0532L01U05` `no creo que tengan
  tiempo` — **correct**: negated `creer` licenses the subjunctive. 716 `creer` phrases were
  read and an eighth affirmative-`creer` defect could not be reproduced; the count is
  probably one different item each way, since one of the seven fixed
  (`S0668L02B02 sí, puedan`) is the Portuguese yes/no-response subtype rather than a
  `creo que` case.
- `spa_mx_for_eng:S0482L01U03` — the subjunctive there is licensed by `la esperanza es que`,
  not by `creo`.

**Left unfixed by the pre-decided defaults, with the evidence a ruling would need:**

- The **Estonian partitive-as-existential-subject** item — reported, not fixed. #786 names
  `est_for_eng:S0286L01U04` (`on inimesed kellele meeldib…`, probably `on inimesi`) at ~80%
  confidence, and gives four diagnostic rows where the course contradicts itself. A native
  check on those four settles the rule for the whole course in one pass.
- The **`cym_s_for_eng` borderline** — `S0279L01`, above.

**And one default overturned on the evidence:** `gla_for_eng`'s `thoilichte` was flagged
"lower confidence, wants a native check", default do-not-fix. #783 **confirmed it to a
higher standard than any other item in the pass** and fixed it — the course's own word-level
components gloss the identical known prompt "happy" with the radical `toilichte` twice
(`S0106L02C02`, `S0129L01C02`), which made `S0076L02` a live ZUT collision against both. The
licensor is `glè` ("very"), a separate LEGO. All 13 licensed `glè thoilichte` occurrences
were left intact. Seed 76 was the one approved seed touched in the whole pass, so it has been
unapproved (O5) and an audio-pass request queued.

---

## Which repair case, per course

**Case 2 — correct the form (no licensor to merge toward)** was the answer almost everywhere:
Connacht Irish, Swiss German, Irish, all three Welsh courses, Scottish Gaelic, Spanish,
Portuguese, French, Serbian, Croatian, Czech, most of Russian, Hungarian, Lithuanian.

In every one of those, the deciding evidence was **the course's own attested practice**, not
a grammar anyone recalled. Two examples worth reading:

- **Connacht Irish.** Nine LEGOs stored an initial mutation as the chunk's base form, and 18
  phrases then used them sentence-initially with no trigger at all (`sheanfhear a bhí ag
  iarraidh foghlaim`). The course itself already teaches the unlenited citation elsewhere —
  `S0264L01 seanfhear`, `S0265L01 cara`, `S0276L01 fanacht`, `S0047L03 botúin a dhéanamh` —
  with contextual lenition inside the phrases (23 phrases carry `ar sheanfhear`). So the fix
  was to put the cards back to citation form and unlenite the 18 unlicensed occurrences,
  leaving every licensed one exactly as it was.
- **South Welsh.** The presentation clips are Aran's own recorded introductions and they say
  the answer out loud: *"The Welsh for **to eat** is **bwyta**…"*, *"the Welsh for **to
  happen** is **digwydd**"*, *"the Welsh for **to make sure** is **gwneud yn siŵr**"* — while
  the LEGO cards read `fwyta`, `ddigwydd`, `wneud yn siŵr`. A native speaker was already
  saying the radical on the card the row got wrong.

**Case 1 — merge toward the licensor** was right twice:

- **`glg_for_eng` seed 291** — the one boundary move in the pass. LEGO `S0291L01` was
  `poida falar mellor` ("i'll be able to speak better"), a bare subjunctive whose licensor
  `espero que` sat just outside; three of the four comparable Galician subjunctive LEGOs
  already bundle their licensor. Now `espero que poida falar mellor` / "I hope I'll be able
  to speak better". Cheap because seed 291 has exactly one lego: no index shifted, no id
  reissued, no progress migration. Seed unapproved per O5.
- **`est_for_eng:S0022L03B02`** — a phrase-level merge, pulling `kohtuda` in so the
  comitative is taught with what licenses it.

And one repair took **neither** pure clause: Estonian `S0022L02`, where the target
(`inimestega`, "with people") was perfectly good and the **English gloss** ("people") was
what was wrong — under-describing the marked form and thereby licensing two bad weldings.
Correcting the gloss was the cheapest correct repair; reverting the target would have broken
the eight phrases where the comitative is correctly licensed.

---

## Audio, and two hazards worth writing down

110 clips regenerated, targeted per phrase or per lego, never a course-wide pass. Every one
verified rendered, correct voice on the `course_audio` row, and transcribed back:
`azure_es-MX-Carlota/Luciano`, `azure_pt-BR-*`, `azure_sr-Latn-RS-Sophie/Nicholas`,
`azure_ru-RU-*`, `azure_cs-CZ-*`, `azure_hr-HR-*`, `azure_hu-HU-Noemi/Tamas`,
`azure_lt-LT-Ona/Leonas`, `azure_et-EE-Anu/Kert`, `azure_gl-ES-Sabela/Roi`,
`azure_ga-IE-Orla/Colm`, known and presentation `azure_en-GB-SoniaNeural`. Most passed at
CER 0; the outliers are ASR limits on small languages, not render faults, and each is named
in its companion report. Nothing was deleted anywhere; every superseded clip is still in
`course_audio`, unlinked.

**Two hazards, both new to the written record:**

1. **`POST /regenerate-presentation` reuses the existing row's narration text** and does not
   re-derive it from the LEGO. Both #784 and #786 hit this independently: the first call
   returns `created:false` and happily re-links narration announcing the *old* card wording.
   **Anyone editing a LEGO's known text must pass `text` explicitly** or the presentation
   silently keeps announcing the superseded card — which is precisely the O2 failure.
2. **No CER exists for any Irish or Scottish Gaelic clip in this estate.** `whisper-cli` does
   not support `ga` or `gd` at all (`whisper_lang_id: unknown language 'ga'`), and neither is
   in `audio-veracity.cjs`'s `DECODER_NOT_VALIDATED` set — so the gate returns a confusing
   `unchecked_decode_error` rather than an honest "the decoder cannot read this language".
   Irish clips were verified instead on voice, text, duration, non-silence, served bytes, and
   an advisory initial-consonant contrast. Welsh (`cy`) *is* supported but whisper is a known
   unreliable referee for it, so the same consonant-level reading was used there.

**`spa_mx_for_eng` and `por_br_for_eng` are NOT the ita_for_eng shape**, contrary to what the
ita write-up's list implied: their `known` roles are genuinely **mixed**, and the specific
clips in the affected seed ranges sit on the English clone, not Azure. The taste-safe repoint
would not have been taste-safe there. It was not needed — no known text changed in either —
but the correction is worth having on the record.

---

## Also found, reported and deliberately not fixed

These are real defects of *other* shapes, found while working and left alone rather than
quietly widening the pass:

- **Connacht Irish `bhí mé ag cheapadh` ("I thought", `S0124L01`/`S0248L02`)** — *over*-
  lenition: `ag` does not lenite, so `ag cheapadh` is wrong in every environment.
- **Connacht Irish `choinic mé` for "I saw"** (`S0184L01`, `S0216L01`, 48 phrases) — standard
  spelling is `chonaic`; may be an intentional Connacht rendering. Orthography is never a
  build-time fix, so it is reported, not changed.
- **Swiss German `S0631L01B02`** — its `known_text` is Swiss German (`was hättsch scho gern`),
  not English. The known side is untranslated.
- **Serbian** — `S0020L04U04` `pokušavam da naučiš` (2nd-person verb under a 1st-person
  subject), `S0143L03U02`, `S0038L02B03` stacked prepositions, `S0232L04U04` known/target
  mismatch.
- **Hungarian** — verb-less practice phrases, and grammatical tags on the *known* side
  (`friend-instr`, `unfriendly-dative`). Tags on a known prompt are the thing Kai has ruled
  against outright; worth its own pass.
- **Lithuanian R0.2 ordering** — three genitives now appear at seed 12, before the course
  introduces the genitive at seed 27/30.
- **Galician `S0291L01U04`** — the one link the boundary redraw loosened: it uses a different
  licensor (`gustaríame que`) so it no longer contains the lego's exact string. It is correct
  Galician and still drills the chunk, so it was left rather than reshaping a sentence that
  is not wrong.

## Not touched, as instructed

The ~900-clip xAI voice residue inside `ita_for_eng`; the twenty-eight other courses with an
xAI-configured role; the scan's own declared gaps (unscanned families, regular-conjugation
Romance subjunctives, Welsh Check 4, Breton, non-European languages). No course audit, no ZUT
sweep, no scan-course pass and no application test suite was run — this was course data, not
application code.

## Verification, read back live

Every changed row was read back from the live DB after the pass and matches what this report
says. `ita_for_eng:S0558L01U05` reads `non sapevo che era così tardi` with both target links
present, and a course-wide search for `sapev* che` + subjunctive now returns **0** rows — it
was repaired this morning, twelve minutes before the scan was written, which is why the scan
still listed it open. It was not re-fixed and its clips were not regenerated a second time.
