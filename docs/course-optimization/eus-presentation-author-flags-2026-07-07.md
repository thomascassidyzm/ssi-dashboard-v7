# eus_for_eng — presentation-author content flags triage (2026-07-07)

When the presentation intros were regenerated (one-button author flow), the Sonnet judgment pass emitted **168 FLAG lines** into `content_feedback` (`feedback_type='presentation_author_flag'`). This is the triage. **The judge has no SaySomethingin-methodology context**, so it flags normal sub-chunk decomposition as "suspicious" — most flags are noise. A minority are real.

## ✅ FIXED (mechanical, verified, done)

Fixed by course-wide scan (not just flagged rows), course-scoped to `eus_for_eng`:

1. **Comitative truncation `-areki` → `-arekin`** — 13 rows (2 LEGO families + their phrases). Basque comitative is `-arekin`; 41 rows already had it right, these 13 dropped the final `-n`. Fixed LEGOs `S0234L03` (*zure anaiarekin*), `S0083L04` (*zenuenarekin*) + 11 phrases incl. component `S0083L04C01`. **Basque target audio on these rows was nulled** (pronunciation changed → needs regen; tiny).
2. **Stray quote in gloss `that"` → `that`** — components `S0125L01C02`, `S0130L03C01`. Pure text artifact (English side; presentation audio unaffected — quote wasn't voiced).

After fix: 0 residual `-areki`, 0 stray quotes, 54 rows correct `-arekin`.

## ⚠️ NEEDS A NATIVE-BASQUE + METHODOLOGY PASS (not blind-fixable)

These look like **real errors** but the correct repair needs a decomposition decision and/or Basque conjugation judgment — guessing risks making the course worse. Grouped by type, highest-confidence first:

### A. Wrong English gloss for the Basque form (gloss↔target mismatch)
- **`S0139L01`** T:`hain` glossed **"early"** — `hain` = *so/such*. And **`S0139L02`** T:`goiz` glossed **"I'm sorry"** — `goiz` = *early*. Seed = *"Sentitzen dut hain goiz utzi behar izatea"*. The glosses are misaligned; but a clean relabel (L01→"so", L02→"early") leaves *sentitzen dut* ("I'm sorry") with no LEGO — **decomposition-structure decision needed** (does seed 139 need a 5th LEGO / is *sentitzen dut* taught elsewhere?).
- **`S0099L01`** T:`funtzionatzen` glossed **"it is"** — means *working/functioning*.
- **`S0198L01`** T:`udalerrian` glossed **"at the council"** — means *at the municipality* (locative).
- **`S0117L03`** T:`azken alditik` glossed **"together"** — means *from the last time*.
- **`S0060L02`** T:`oraindik` glossed **"for now still"** — means *still/yet*.
- **`S0049L03`** T:`badidazu` glossed **"if you understand me"** — looks like a *give me* (didazu) form, not *understand*.
- **`S0288L01`** T:`gehienari` glossed **"to most"**; **`S0274L01C02`/`S0253L01C02`** T:`batzuetan` glossed **"some"** — means *sometimes*.

### B. Malformed / ungrammatical Basque form
- **`S0178L01`** *"ikusten nahi banintuen ere"* + component **`S0178L01C02`** *"nahi banintuen"* — `banintuen` is wrong valency with `nahi`; expected *nahi banuen*. (Judge is linguistically specific here — good candidate, but touches LEGO + seed + phrases.)
- **`S0238L01`** *"esateko nahi zintuen"* ("he wanted you to tell me") — word order/construction looks disordered.
- **`S0153L01`** *"hain modu berdinean"* for "in exactly the same way" — likely *modu berdinean* / *horrelako modu berdinean*.
- **`S0289L01C01`** `galdezkatzen` ("wondering") — nonstandard; expected *galdezka*/*galdetzen*.

### C. LEGO appears mis-seeded (chunk absent from its own seed)
Strongest: **`S0037L01`** & **`S0268L04`** T:`iaz` ("last year") sit in seeds about *last month* / *last week* — `iaz` doesn't belong or the target is wrong. Others in this bucket to check: `S0260L02`, `S0173L01`, `S0267L01`, `S0166L01`, `S0156L01`, `S0268L03`, `S0184L03`, `S0053L02` ("their letter" vs seed "his letter"), `S0049L02`, `S0006L01` ("words" plural vs seed "a word"), `S0216L02`, `S0085L02`, `S0121L03` ("usual" vs seed "unusual").

### D. Probable FALSE POSITIVE (methodology-expected, likely no action)
- **Early debut-seed fragments** `S0003L*`, `S0004L*` — seeds like *"how to say something in Basque"* are intentional debut fragments, not broken data.
- **Bare auxiliaries / particles / complementizers glossed functionally** (~59 flags): `du`/`dit`/`dizu` (transitive aux), `al` (yes/no particle), `-la`/`ela` (complementizer "that"), `a` (determiner). This is normal SSi decomposition — the judge just lacks the methodology. No action unless a genuine ZUT collision is confirmed (e.g. `al` mapped to several different known glosses — `S0182L03C02`, `S0196L01C02` — worth a methodology look, not a mechanical fix).
- **Slash glosses** (~71 course-wide): `he/she`, `his/her`, `our/their` are correct gender-neutral conventions (Basque doesn't mark gender) — leave. Only synonym-pair slashes (`should / need to`, `patient/full of patience`, `to me/to have`) are a style/ZUT question, and picking one side is a judgment call that also re-cuts the intro audio.

## Raw data
Full enriched flags: `/tmp .../scratchpad/eus-flags-enriched.json` (regenerate from `content_feedback` where `feedback_type='presentation_author_flag'`). Categorized split: `eus-triage.json`.
