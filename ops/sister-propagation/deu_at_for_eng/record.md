# deu_at_for_eng + deu_ch_for_eng — cs #698·AI, 18 Nov 2026 — PLAN ONLY, NOT APPLIED

Course codes checked live: deu_at_for_eng, deu_ch_for_eng. No TTS share left.

deu_at (8 rows, live 18 Nov still old):
- seed 643 / S0643L01U01 "do you want sir?" | `Möchten Sie, der Herr`; seed 650, LEGO S0650L01 (+intro), B01, U01 "do you want to go
  (madam)" | `möchten Sie gehen`. Recommended: keep `möchten` (Austrian polite offers use möchten; the main course went the
  other way, `wollen Sie, mein Herr`) and change the ENGLISH to "would you like …, sir/madam". LEGO S0643L01 is already
  "would you care for". ≈ 200 chars (known side + 1 intro).
- seed 383 + S0383L01U01 `er mechat des in Gortn tan` for "he wanted to put" → `er wollt des in Gortn tan` (wanted =
  wollt, S0127). ≈ 170 chars (Austrian target voice, 2 texts × 2).
deu_ch (16 rows): ten formal LEGOs whose target is a bare verb (`fühled`, `wänd`, `reded`…) that is also we/you-all/they
in Swiss German, two pronoun-less verb LEGOs (S0425L01 `verstönd`, S0448L01 `hälfed` → `si …`), two LEGOs that dropped
their subordinator (S0572L06 → `wo si öis bsuecht händ`, S0538L03 → `as ob s mir egal wär`). Every one is a LEGO re-cut
with a new intro and basket rework — structural, with Swiss voice renders ≈ 1,500–2,500 chars. Not attempted: needs
its own pass. Rows: git show origin/cs/482-cleanup-scan-combined-fix-list-4:ops/paid-cleanup-scan-447/reports/deu.json.

## APPLIED by cs #702·AI, 18 Nov 2026

- Austrian polite offers keep *möchten*, and the ENGLISH is now "would you like…".
  Changed: seeds 643 and 650, LEGO S0650L01 (+ new intro), component S0650L01C01, and 10 rows in S0643/S0650.
  Source: Duden and ÖWB (Österreichisches Wörterbuch). *möchten* is the polite conditional of *mögen*,
  "would like", and Austrian service register uses *Möchten Sie…?* for offers.
  So the English "do you want" was what was wrong, not the German.
- Events: 18251641, fbee5b6a, 6b0de3e6. The undo_ops are in apply.json. readback.json: 14/14.
- Chars: 290 (known side + 1 spliced intro). Plus 43 chars for a target1 clip of the held item below, rendered but unused.
- **HELD:** seed 383 + S0383L01U01, *mechat* → *wollt*.
  The render route refused target2 with VOICE_POLICY: deu_at's male target voice has only the 2026-09-04 draft
  casting, and Tom has not cast it in the Voice Lab.
  Applying now would leave target2 silent or still saying *mechat*, so the text is unchanged.
  The target1 clip for the new wording exists (audio-real.json). Once the male voice is cast, this is one render plus one edit.
