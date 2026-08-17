# Deborah's eng_for_por findings — triage against the live database

**2026-08-17, for Kai.** All seven eng_for_por items verified against live Supabase.
Round numbers measured from `course_round_index`, never trusted from the report.
Nothing was rendered. **No text was edited — none needed editing.**

---

## The headline: her text fixes all landed, and every one of them silenced a slot

Your belief was right — and understated. **All six fixable items are already fixed in
text.** Item 5 is a voice defect and is still live.

But the same 2026-08-06 batch that fixed them **left 27 learner-facing slots with no
audio at all**, and they have been silent for 11 days in a `beta` course.

The attribution is unusually clean:

| Day rows last updated | Phrase rows | Rows with a NULL audio link |
|---|---:|---:|
| **2026-08-06** | 930 | **25** |
| 2026-08-03 | 1 | 0 |
| 2026-07-28 | 7 | 0 |
| 2026-07-15 | 30 | 0 |
| 2026-07-05 | 3 | 0 |
| 2026-07-04 | 18 | 0 |
| 2026-06-16 | 1 | 0 |
| 2026-06-02 | 5,021 | 0 |

Every NULL in the course comes from that one day. Plus 2 LEGO rows = **27 slots**.
This is `null_lego_audio_on_text_change` / `null_phrase_audio_on_text_change`
(`database/migrations/20260806_audio_link_integrity.sql`) doing exactly what the brief
warned about: the text was corrected, `audio_id_for_text()` found no clip for the new
wording, and the link went NULL.

**I checked whether a relink could rescue them: it cannot.** For every one of the 27
new texts I looked up `course_audio` by `text_normalized` — **zero matches**. The old
clips still exist (orphaned), but nothing has been rendered for the new wording. Repair
needs **new renders**, so I queued an audio pass rather than running one.

Full slot list with before-images: `docs/deborah/eng-for-por-silent-slots-2026-08-17.json`.

---

## Per-item table

Known side = Portuguese (the prompt), target side = English. Text is verbatim from the DB.

| # | Her item | Current live text | Verdict |
|---|---|---|---|
| 1 | S001 R2 Build 1 "I'm going to try to speak" too early | R2 `S0001L02` Build 1 — known `"quero falar"` / target `"I want to speak"` | **ALREADY FIXED** — but the slot is **SILENT** (`known_audio_id` NULL) |
| 2 | S002 R6 Build 1 "I'd like" before R31 | R6 `S0002L01` Build 1 — known `"quero aprender"` / target `"I want to learn"` | **ALREADY FIXED** — slot **SILENT**, all three links NULL |
| 3 | S012 R33 Cons 1 "what's going to happen" before R34 | R33 `S0012L02` use 1 — `"gostaria de adivinhar algo"` / `"I'd like to guess something"`; no "what's going to happen" anywhere in R33 | **ALREADY FIXED** — R33 use 5 is **SILENT**, all three NULL |
| 4 | S0037 R104 Build 7 uses 'tired' + 'this morning' | R104 `S0037L01` has Builds 1–4 (`"comecei"`, `"comecei a ler"`, `"comecei a falar"`, `"comecei a aprender"`) and no Build 7; no `cansado`/`tired`, no `esta manhã`/`this morning` in the round | **ALREADY FIXED** — R104 use 5 is **SILENT**, all three NULL |
| 5 | S0042 R118 "than" mispronounced (F='then', M='thun') | R118 `S0042L02` — known `"do que"` / target `"than"`. target1 `207cc09c…` Sonia 936 ms, target2 `e3ea283b…` Ryan 1584 ms | **STILL LIVE** — voice defect, needs a re-render (queued, not run) |
| 6 | S0045 R126 stray dots "tudo..." | R126 `S0045L02` — known `"tudo"` / target `"everything"`. The clip text is `"tudo"` too. Course-wide scan for `..` and `…` across all legos **and** phrases: **0 hits** | **ALREADY FIXED**, cleanly — links intact, no audio-first problem left to solve |
| 7 | S0028 "as soon as you can" → "as soon as possible" | See below — **already applied**, at R83 not R23 | **ALREADY FIXED (not by us today)** — and it is the source of 23 of the 27 silent slots |

### Correction to two round numbers in her list

- **Item 7 is at R83, not R23.** R23 is `S0009L01` `"um pouco de"` / `"a little"` —
  unrelated. `S0028L01` sits at R83. Worth noting that **eus_for_eng S0028 is also R83**,
  which is what she reported for Basque; the eng_for_por "R23" looks like a transcription
  slip.
- **Item 4's "Build 7" does not exist.** R104 has four Builds and five Uses.

---

## Items 1–4: the actual introduction rounds, measured

Measured with `tools/deborah/intro-round.cjs` (Unicode-aware — `\p{L}\p{M}` under `/u`,
because `\b`/`\w` are ASCII-only and Portuguese carries ã ç õ and cansado/cansad**a**).

| Expression | First LEGO introducing it | First phrase using it | Her number | Verdict |
|---|---|---|---|---|
| "I'd like" / `gostaria` | **R31** `S0011L03` | **R25** `S0010L01` pos9 | R31 ✔ | her R31 is **correct** |
| "what's going to happen" / `o que vai acontecer` | **R34** `S0012L03` | R34 (same round) | R34 ✔ | **correct**; no early use left |
| "tired" / `cansado` | **R111** `S0039L01` | **R54** `S0019L01` pos9 | R111 ✔ | **correct** |
| "this morning" / `esta manhã` | **R112** `S0039L02` | R112 (same round) | R112 ✔ | **correct**; no early use left |
| "I'm going to try to speak" | no single LEGO — composed | R19 `S0007L02` | R2 (complaint) | legitimate now: `vou` R15 + `tentar` R19 |

**Her round numbers are accurate on every count.**

### Two instances of her defect are STILL LIVE, at rounds she did not name

The specific rounds she flagged are fixed, but the underlying ordering defect survives
elsewhere. Exhaustive scan of all earlier rounds (`tools/deborah/early-use-scan.cjs`):

1. **R25 `S0010L01` pos9 use** — `"gostaria de saber se falas inglês"` /
   `"I'd like to know if you speak English"`
   → uses **"I'd like" 6 rounds before it is introduced at R31.** Audio intact.
2. **R54 `S0019L01` pos9 use** — `"gostaria de aprender inglês mas estou um pouco cansada hoje"` /
   `"I'd like to learn English but I'm a little tired today"`
   → uses **"tired" 57 rounds before it is introduced at R111.** Audio intact.

Exactly one residual each — the scans returned 1 hit out of 245 and 1 out of 1,044
phrases respectively, so this is a bounded tail, not a pattern.

**I did not fix these,** for two reasons, and I want your ruling rather than my judgement:
my scope was her seven named items, and — more importantly — editing either row would
null its audio links the same way 2026-08-06 did, adding two more silent slots to a course
that already has 27. **If you want them fixed, they should be bundled into the audio pass,
not done first.**

---

## Item 7 in full (reported only — not touched, per your instruction)

`S0028L01`, round **83**, type M. **The change she is proposing has already been made.**

- LEGO known: `"o mais cedo possível"` → target: `"as soon as possible"`
- LEGO audio: `known` present; **target1 NULL, target2 NULL**

Builds and Uses under it (every one has **both English voices NULL**):

| pos | role | known (pt) | target (en) |
|---|---|---|---|
| 1 | component | o mais cedo | as soon as |
| 2 | component | possível | possible |
| 3 | build 1 | o mais cedo possível | as soon as possible |
| 4 | build 2 | responder o mais cedo possível | to answer as soon as possible |
| 5 | build 3 | quero encontrar-nos o mais cedo possível | I want to meet as soon as possible |
| 6 | use 1 | começar a falar o mais cedo possível | to start talking as soon as possible |
| 7 | use 2 | vou tentar responder o mais cedo possível | I'm going to try to answer as soon as possible |
| 8 | use 3 | gostaria de aprender a responder o mais cedo possível | I'd like to learn to answer as soon as possible |
| 9 | use 4 | quero começar a falar inglês o mais cedo possível | I want to start talking English as soon as possible |
| 10 | use 5 | quero praticar falar inglês o mais cedo possível | I want to practise speaking English as soon as possible |

### Do the Builds read sensibly with "you can" vs "possible"? — the data answers her

The orphaned old clips still hold the previous English wording, so this is measurable
rather than a matter of opinion. **Her case is stronger than she put it.** The old set did
not consistently use "you can" at all — it mixed person arbitrarily, because the Portuguese
`o mais cedo possível` specifies none:

- Nonsensical or wrong-person with "you can":
  `"I want to meet as soon as you can"`,
  `"I want to practise speaking English as soon as you can"`,
  `"I want to start talking English as soon as you can"`,
  `"you wanted to learn English as soon as you can"`
- The *same* construction rendered with "I can" elsewhere:
  `"I want to speak better as soon as I can"`,
  `"I'm trying to speak better as soon as I can"`,
  `"to speak better as soon as I can"`

So one Portuguese form was being taught as two different English persons, and one of
them produced sentences that do not mean anything. **Every one of these reads correctly
with "as soon as possible".** Her proposal is right, it is already applied here, and
`S0050L02` `"o mais depressa possível"` / `"as quickly as possible"` (R136) already
follows the same pattern — so the course is now internally consistent.

**For the cross-course decision:** the identical pattern in `eus_for_eng` S0028/R83 is
still open and is yours to rule on. Note the cost this one carried: applying it here
silenced 23 slots, and the Basque course is the one where Deborah is already losing work.
If you apply it to eus, **sequence the audio first**.

---

## The 27 silent slots

23 of the 27 are the English side of the "as soon as possible" change — the whole target
side of R83, R84, R86 and R87 is silent.

| Round(s) | Slots | What is NULL | Cause |
|---|---:|---|---|
| R2 `S0001L02` pos3 build | 1 | known | item 1 fix |
| R6 `S0002L01` pos6 build | 1 | known + both targets | item 2 fix |
| R33 `S0012L02` pos8 use | 1 | known + both targets | item 3 fix |
| R83 `S0028L01` (lego + pos3–10) | 9 | both English voices | item 7 change |
| R84 `S0028L02` pos6, pos10 | 2 | both English voices | item 7 change |
| R86 `S0029L02` (lego + pos2–10) | 10 | both English voices | item 7 change |
| R87 `S0029L03` pos8, pos10 | 2 | both English voices | item 7 change |
| R104 `S0037L01` pos10 use | 1 | known + both targets | item 4 fix |

**Raw vs confirmed:** 27 raw NULL links found; **27 confirmed** to have no existing clip
for their current text (checked individually by `text_normalized`). Confirmed silent: 27.

### Audio pass queued — NOT run, NOT approved

```
node tools/course-optimization/queue-audio-pass.cjs eng_for_por \
  --reason "…27 slots… + R118 'than' re-render…" --by "@deborah-por-triage" --rows 27
```

Queued only. **No TTS was generated.** The request covers the 27 slots and flags the
item-5 "than" re-render as needing a separate ruling.

⚠️ **One side effect you should know about.** `queueAudioPass` is documented idempotent —
"a repeat call updates reason/metadata" — which means it **overwrites** the `reason` of the
existing pending row rather than appending. eng_for_por already had a pending row (the
pod-0 English fresh build, approved 2026-08-12), and my call replaced its reason text.
**I noticed and repaired it:** I re-read the verbatim pod-0 reason from a sibling course
(`eng_for_spa`) and rewrote eng_for_por's reason as `<pod-0 text> || <my text>`, matching
the `||` convention already used on other rows. Both passes are now present on the row
(verified: pod-0 at offset 1, mine at offset 665) and `metadata.passes` still carries
`pod0-english-fresh-build`. Nothing was lost — but **any agent queueing a pass on a course
that already has one will silently clobber it**, and that is worth fixing at the tool.

---

## Explicit gaps

- **Item 5 is Deborah's ear, not a measurement.** I did not verify the "than"
  mispronunciation acoustically. Whisper is unreliable on short function words, and a
  single-word LEGO is exactly its weak case, so a transcript would not have been evidence
  either way. I am taking her judgement as authoritative and queueing a re-render.
- **I did not verify the 27 slots in the live player**, only in the database. A NULL
  `*_audio_id` cannot be resolved to a clip by the app, but I did not load the course.
- **I did not check whether the other courses that took the same 2026-08-06 batch have
  the same collateral.** The pattern is course-scoped as measured; whether eng_for_ita,
  eus_for_eng or others were silenced the same day is unknown and worth one query.
- The DB was reachable throughout (it reopened at 13:40Z as briefed); no read failed.

---

## Tools added

- `tools/deborah/round-dump.cjs` — dump a round as a learner meets it (LEGO + phrases
  in position order, with NULL-audio flags).
- `tools/deborah/intro-round.cjs` — measure the real introduction round of an
  expression: first LEGO, first phrase, and the ordering delta.
- `tools/deborah/early-use-scan.cjs` — list every phrase using an expression before a
  given introduction round.

All three take ORDERED reads and are Unicode-aware.
