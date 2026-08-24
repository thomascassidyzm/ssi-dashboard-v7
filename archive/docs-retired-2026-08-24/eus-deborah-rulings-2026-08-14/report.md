# Deborah's Basque rulings — applied to eus_for_eng, 2026-08-14

Her seven answers (relayed by Tom) applied to the Basque course. Four phrase texts changed,
two rulings confirmed as no-change, and **three judgement forks deliberately left alone** —
each one is a decision below rather than a guess.

Audio pass **queued**, not generated. No TTS was run.

---

## What changed — four rows

All four passed a before-state assertion; the run is one transaction, and it would have
aborted whole on any drift. Logs: `apply-dryrun-log.json`, `apply-applied-log.json`.

| # | row | before | after |
|---|---|---|---|
| 2 | `S0055L04U06` | `ez zait gustatzen ondo lo egin ez dudanean esna egotea` | `ez zait gustatzen esna egotea ondo lo egiten ez dudanean` |
| 3 | `S0115L02U04` | "I feel that I'm ready to speak Basque" / `euskaraz hitz egiteko prest sentitzen naiz` | "I don't think I'm ready to speak Basque" / `ez dut uste euskaraz hitz egiteko prest nagoenik` |
| 4 | `S0006L02B03` | "I want another one" / `beste bat nahi dut` | "I want to practise a word" / `hitz bat praktikatu nahi dut` |
| 5 | `S0006L02U04` | "I want to practise another one" / `beste bat praktikatu nahi dut` | "I'm trying to learn a word" / `hitz bat ikasten saiatzen ari naiz` |

**Ruling 2** is her wording verbatim, including `egin`→`egiten` for the habitual. The English
gloss was left exactly as it was, per her "English is fine as-is" — but see decision C, because
her note and the existing gloss don't obviously agree.

**Ruling 3** is her rebuild verbatim. It is vocabulary-legal at seed 115: `uste` ("I think") is
introduced at seed 47 (`S0047L04`), and `prest` at seed 26, so nothing is a forward reference.
It is also ZUT-clean — neither the new known nor the new target exists anywhere else in the
course. As a bonus it *removes* a near-collision: the old text sat one apostrophe away from
`S0026L04U02` "I feel that I am ready to speak Basque".

**Rulings 4 and 5** were **remapped, not removed.** Deletion was the obvious reading of
"remove or remap", and the pod-migration protocol permits it cleanly (rule 5 — a removed
sentence drops with no penalty). The **phrase floor** is what forbids it: `S0006L02` carries
exactly 3 BUILD + 5 USE, which is precisely the early-seed ramp minimum. Deleting either row
puts the LEGO under floor, and "fewer phrases is a FAIL". So both were rewritten instead, using
**only whole chunks already introduced before `S0006L02`** — `praktikatu` (S0005L01),
`ikasten saiatzen ari naiz` (S0002L03), `hitz bat` (the LEGO itself). No new Basque judgement
was invented; every chunk is already taught verbatim earlier in the course.

## What was confirmed and correctly needed no change — two rulings

**Ruling 6 — `S0052L01U04` `gauzak idaztea gustatzen zait`.** Deborah: fine, close. No change.
The containment flag is a false positive: `idaztea` is `idatzi` with a nominalising ending, and
the LEGO pairing (`S0052L01` "to write" / `idatzi`) is correct against its own seed
("Iaz bere lagunari gutun bat idatzi nahi zuen"), which does use bare `idatzi`.

**Ruling 7 — `S0126L01U05` `lan hau gustatzen zait`.** Deborah: `lan hau` is correct, `honek`
only as a transitive subject. Kept. **The teaching pairing does claim `honek` — and it is right
to.** `S0126L01` is "this work" / `lan honek`, and its seed is "Lan honek nire burmuinaren forma
aldatzen ari da", where `lan honek` genuinely *is* the ergative transitive subject. So the LEGO
is correct for its seed and the phrase is correct for its own sentence; the two differ only by
case ending. Under the methodology that is a construction-feature absorbed inside the chunk, not
a ZUT fork over an intention. **No change to either.** The containment checker will keep flagging
this pair; it is checking the wrong unit.

---

## Decisions — three forks I did not guess at

### A. R152: is the teaching point `egotea` or `izatea`? (blocks ruling 1)

Deborah ruled `egotea` **correct** — temporary state, so *egon*. Tom's instruction was to read
the round context and set the pairing to what the sentences actually teach, and to note it
rather than guess if ambiguous. It is ambiguous, and the two readings point opposite ways:

- **The seed says `egotea`.** Seed 55's master sentence is
  "Ez zait gustatzen ondo lo egin ez dudanean esna **egotea**." The LEGO `S0055L04` is currently
  "being" / **`izatea`** — a string that **does not appear in its own seed at all**. That is a
  live tiling failure today, and Deborah's ruling says the seed is the one that's right.
- **Seven of the nine phrases say `izatea`.** `B01`, `B03`, `U01`–`U05` are all `esna izatea`.
  Only `B02` and `U06` use `egotea`.

The trap: her ruling is a *Basque-correctness* ruling about `esna`, not a vote count. If `esna`
takes *egon*, then those seven phrases are wrong Basque — repeated seven times, which is
repetition of an error, not evidence for it.

**My read: the LEGO should become `egotea`, and the seven `esna izatea` phrases go back to
Deborah for rewording.** That fixes a real tiling defect and follows her ruling to its
conclusion. I have **not** executed it, for two reasons: it would rewrite seven already-rendered
phrases (audio cost) on an inference from a ruling she gave about two, and rewording them needs
a Basque speaker, not me.

- **A1 (recommended)** — flip the LEGO to `egotea` now; send the seven `esna izatea` phrases to
  Deborah as one short follow-up list.
- **A2** — leave the LEGO as `izatea`; accept that `B02`/`U06` stay the odd ones out and the
  seed stays untiled by its own LEGO.
- **A3** — ask Deborah directly: "is `esna izatea` wrong in all seven of these?" and do nothing
  until she answers.

A1 and A3 differ only in whether the LEGO flip waits. Either is fine; A2 is the one I'd argue
against, because it knowingly leaves a LEGO that cannot tile its seed.

### B. "that I am" maps to three different targets — and a banned parenthesis is holding it together

`S0115L02B01`'s known text is literally **"that I am (subjunctive)"**. That is a direct breach of
the no-parentheses / zero-explanation law and of A-108's no-annotations rule, so my first move
was to strip it. **Stripping it makes things worse**, which is why I stopped:

| row | known | target |
|---|---|---|
| `S0026L04` (LEGO) + `S0026L04B01` | that I am | `nagoela` |
| `S0114L02B01` | that I am | `naizela` |
| `S0115L02` (LEGO) + `S0115L02C01` | that I am | `nagoenik` |

"that I am" already forks three ways. The component row is ZUT-exempt on the known side, but
`S0026L04B01` vs `S0114L02B01` is a live BUILD-level collision **today**, and the two LEGOs
`nagoela` vs `nagoenik` are a LEGO-level collision — the hard-reject class. The parenthesis is
papering over exactly this. Removing it adds a third colliding BUILD row.

The lawful fix is to DIFFERENTIATE by making the English naturally specific — which needs
Deborah's ear for what distinguishes `nagoela` / `naizela` / `nagoenik` in learner-facing
English. **Decision needed: does Deborah own this naming, or does Tom want a convention set?**
Recommendation: one question to Deborah covering all three at once; the parenthesis comes out in
the same pass, never before.

### C. Ruling 2's English gloss — "being awake" or "waking up"?

The relay says *"English gloss stays being awake"* and, in the same breath, *"English is fine
as-is"*. Those two point different ways, because `S0055L04U06`'s English currently reads
**"I don't enjoy waking up when I didn't sleep well"** — i.e. as-is is *not* "being awake".

I applied the Basque reorder (unambiguous, her wording) and **left the English untouched**, which
satisfies "fine as-is" and is also the conservative choice. One line from Deborah settles it.

Two riders worth her eye at the same time:

- The reorder introduces `lo egiten`, but the LEGO `S0055L01` is "to sleep" / `lo egin`. Her
  habitual correction is linguistically right and breaks whole-chunk tiling against that LEGO.
- **The seed still says `ondo lo egin ez dudanean`.** If `egiten` is right in the phrase, the
  master sentence has the same issue. Seed edits are heavier (canonical mismatch, seed audio), so
  I did not touch it.

---

## Explicit gaps

- **I could not find the "sentitzen dut" sibling she just corrected.** Her note (via Tom) says she
  corrected a sibling sentence saying `sentitzen dut` in an earlier round, and asked us to align
  it. `content_audit_log` for `eus_for_eng` across 08-13 and 08-14 contains **no** phrase whose
  old text held `sentitzen dut`. Her seed-26 edits at 13:44–13:53 on 08-13 were word-order
  changes to rows that already read `sentitzen naiz`. Candidates, none confirmed:
  - **Seed 26's master sentence**, "Ia prest nagoela **sentitzen dut**." — still says it, and its
    own LEGO `S0026L03` says `sentitzen naiz`. A seed-vs-sibling outlier, unedited since 06-10.
  - **`S0114L02U05`** `ikasten ari naizela sentitzen dut`, whose R299 sibling `S0115L02U05` reads
    `ikasten ari naizela nagoenik sentitzen dut` — malformed, carrying both `naizela` and
    `nagoenik`.

  **One question to Deborah — "which sentence?" — closes this.** I did not guess.
- **Two more defects in R299 that her ruling did not cover**, both left alone: `S0115L02U05`
  above, and `S0115L02B04` "I feel that I'm ready" / `prest sentitzen naiz`, which contains no
  `nagoenik` at all. Both need her wording; neither can be deleted, because `S0115L02` sits at
  exactly 4 BUILD + 5 USE.
- **Someone else was editing this course an hour before this pass.** `content_audit_log` shows
  `S0006L02` (ruling 4/5's LEGO) touched at 18:34 UTC and `S0006L03` touched nine times between
  18:35:22 and 18:35:51, each with a paired `courses` update — the signature of repeated audio
  regeneration. Text was unchanged. Flagged to the audio-reversion investigation (#569); worth
  knowing that a second writer is live in `eus_for_eng`.
- `content_audit_log` records UPDATE and DELETE only. A newly inserted phrase row is invisible to
  every "what changed" query above.

## Audio

All four changed rows still point at clips rendered from the **old** text, so all four are stale
in known and target1. Per the one-pass text+audio rule an audio pass was **queued** —
`eus_for_eng`, reason "Deborah Basque rulings 2026-08-14", 4 rows. **No TTS was generated**; that
stays approval-gated and phase8 `/generate` fulfils the request when an approved pass runs.
