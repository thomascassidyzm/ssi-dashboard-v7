# A-108 — Greek, Turkish, Armenian: four lines were wrong, and I can name why each one was

Applied 2026-08-14 against the live DB. 358 staged draft lines read in full, in scene context.
Four changed. Every count below is a query result.

| Course | Drafts examined | Annotations | Gender | Register | Total changed |
|---|---|---|---|---|---|
| ell_for_eng | 114 | 0 | 0 | 0 | **0** |
| tur_for_eng | 118 | 0 | n/a | 1 | **1** |
| hye_for_eng | 126 | 0 | n/a | 3 | **3** |

No audio generated. `target_text_draft = true` preserved on every row written — draft counts
after the write are 114 / 118 / 126, exactly as before.

## Two of Tom's three rules had no work in them, for structural reasons

**Rule 1, annotations: zero.** No draft row in any of the three courses carries a slash form, a
bracket, a paren or any of the other six mark classes. This matches `FINDINGS.md` — the annotation
defect lives in older released audio-backed content, not in these drafts.

**Rule 2, gender: zero, and only Greek could ever have had any.** Turkish and Armenian have no
grammatical gender, so rule 2 is a structural no-op in two of my three languages — not "nothing
found", but nothing findable. Greek can carry it, and Greek is already right: every Learner
self-agreeing adjective in the drafts is feminine (`σίγουρη`, `χαρούμενη`, `ανήσυχη`, `χαζή`),
matching the female cast voice Αθηνά.

## The register limb: one Turkish line, three Armenian ones

**Turkish, scene 2** — a passenger answering a stranger on a bus said `Buyur, geç.` — the intimate
`sen` imperative. Sarah's own adjacent line already says `Affedersiniz`. Now `Buyurun, geçin.`

**Armenian, scenes 15–16** — three lines of one continuous speech act to a stranger whose language
the learner is trying to speak:

- "I prefer to try to speak your language, I think it's polite" — `քո լեզվով` → `ձեր լեզվով`.
  The line claims to be polite while using the intimate form.
- "But if you can speak slowly…" — `խոսես` → `խոսեք`.
- "You spoke a little too quickly…" — `Դու … խոսեցիր` → `Դուք … խոսեցիք`.

Both sibling courses render all three as V. So does the line immediately before them in Armenian.

## The Armenian three are a stalled pass's residue, not my ear

`content_audit_log` shows a register pass ran on `hye_for_eng` at 09:41 UTC today and converted 32
draft rows T→V in service scenes — `Կարո՞ղ ես ասել` → `Կարո՞ղ եք ասել`, `ունե՞ս` → `ունե՞ք`, and so on.
Rows 149, 152 and 153 appear in the audit log only from the 09:27 translation insert. **That pass
never touched them.** The three rows I changed are exactly what it left behind, converted in the
same direction and with the same lowercase `ձեր` orthography it used. Armenian is the language where
I have least independent standing, so anchoring those writes to an external check rather than to my
own judgement is the point, not a coincidence.

`ell` and `tur` have no such prior pass — their drafts are all a single translation batch from
09:28–09:30, so what I read is the translator's original.

## Named gaps — real defects I did not fix

Each of these is a live problem. The first four are barred by the brief's scope rule; the rest are
defects in a dimension A-108 does not cover, and mixing passes would make both harder to audit.

**Barred: the row is not a draft.**
- **`ell` scene 22, three Learner lines** carry MASCULINE self-agreement — `νευρικός`, `σίγουρος`,
  `χαρούμενος`, `έτοιμος` — against a female cast voice. This is a genuine rule-2 violation, and I
  cannot touch it: all three rows are `target_text_draft = false`.
- **`ell` scene 2** has the exact defect I fixed in Turkish (`Παρακαλώ, κάτσε.` — T to a stranger),
  on a non-draft row.
- **`hye` scene 6** is left internally mixed: James asks `քո անունը` (T, draft, correct per canon)
  and Anna answers `Իսկ Դուք` (V, non-draft).
- **`tur` scene 1** uses `siz` to a neighbour, which the canon classes as a peer scene. Non-draft —
  and `siz` to an adult neighbour is defensible Turkish, so this one is a decision candidate anyway.

**Out of A-108's three rules.**
- **`tur` line "That's very kind of you" → `Bu çok naziksiniz.` is ungrammatical**: `Bu` cannot be
  the subject of a 2pl `-siniz` predicate. Proposed: `Bu çok nazikçe.` (the next line is already
  `Çok naziksiniz`, so a naive fix collapses the two).
- **`hye` "I'm not feeling great" → `Իրեն … չեմ զգում`** uses the 3rd-person reflexive where 1st
  person `Ինձ` is required.
- **`hye` "welcome card" → `բարեկամության քարտ`** is "friendship card"; should be `ողջույնի քարտ`.
- **All three courses:** Narrator number lines are inconsistently rendered — early ones spell
  numerals out, later ones leave bare digits. That is a TTS problem for whoever generates this audio.

## How the write was gated

Dry-run in a rolled-back transaction first, then the apply. Both runs gate every UPDATE on the exact
before-text *and* on `target_text_draft`, with pre- and post-flight assertions that raise and abort
on any drift. `PATCH /sentence/:id` was not used — it clears the draft flag. Post-write re-query:
4 rows changed, draft counts unchanged, zero residual T-forms in service scenes across all three
courses, zero annotations.

Per-row log with before/after/reason: `docs/a108/ell-tur-hye-applied-log.json`.
