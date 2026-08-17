## Cornish (cor_for_eng) ZUT Fork Scan — 668 seeds

**I am not a Cornish speaker.** Everything below is string co-occurrence, not translation verification. Read "distinct forms" as *candidates for a human to check*, not confirmed forks.

### 0. Calibration (done first, as instructed)

Checked English **"want"** (114 seeds containing want/wants/wanted/wanting). It surfaced these Cornish forms: `vynn`(24) / `vynna`(27) / `vynnav`(7) / `vynnydh`(12) / `vynnyn`(6) / `vynnens`(6) / `fynna`(6) — pulled examples for each and they are **person/tense inflections of one verb, mynnes** ("my a vynn" = I want, "a vynna" = wanted-imperfect, "ny vynnav" = I don't want, "a vynnydh" = you want, "a vynnyn" = we want). **Calibration passes**: the method correctly surfaces one verb's paradigm rather than an unrelated set. No changes needed to the method, but it means **raw distinct-token counts overstate forks** — most of the "worst" entries below are conjugation/mutation, not real forks. I flag which is which explicitly.

---

### 1. Fork candidates, worst-first (real semantic forks only, after discounting conjugation/mutation)

**#1 — "know" — 2 distinct verbs (HIGH confidence, real fork).** 35 seeds contain know/knows/knew/known.
- `aswonn`/`aswonnav` (14 seeds) — used for knowing **people**: [133] "You get to know **someone**", [230] "I know a young **man**", [231] "I know an old **man**", [85] "I don't know those **people**".
- `godhvos` (8 seeds) — used for knowing **facts**: [45] "I don't need to know **everything**", [201] "wanted to know **what** was going to happen", [347] "wanted to know what was **happening**".
This is the classic Brittonic/Goidelic savoir/connaître split (cf. Welsh gwybod/adnabod). Every example I pulled respects the split (person→aswonn, fact→godhvos) — looks like the translator already applied a real grammatical rule, not free variation. **Decomposition must treat "know" as two LEGOs conditioned on object type**, or the ZUT rule will force a false single mapping.

**#2 — "think" — 2 distinct verbs, conditioned by construction (HIGH confidence, real fork).** 43 seeds.
- `dyb`/`tybi` (9+ seeds) — used for **"think that X"** (opinion/epistemic): [72] "I think that you're doing very well", [123] "I think that's a good idea", [387] "I didn't think she was right".
- `prederi` (5 seeds) — used for **"think about X"** (deliberate consideration): [37] "started to think about it carefully", [43] "wasn't thinking about how to answer", [91] "difficult to think quickly enough to answer".
Same pattern as #1: a real English-side construction difference (think-that vs think-about) that the translator is honoring, not noise. Decomposition should split by construction, not treat "think" as one lego.

**#3 — "need" — 2 constructions, moderate confidence.** 38 seeds.
- `res yw dhX (gul-Y)` (~31 seeds) — the dominant form, "it is necessary to X (to do Y)": [44] "if I need to improve", [167] "What do you need to do tomorrow".
- `yma edhom dhX a Y` (~7 seeds, one spelled `edhomm` at [296]) — "there is need to X of Y": [96] "I need a little more time", [104] "We need to change what we're doing", [605] "we needed help".
I checked whether this splits cleanly by complement type (infinitive vs noun) — it does **not**: both res and edhom take verbal-noun complements ([44] res+gwellhe vs [104] edhom+janjya, both "verb-ing"-shaped). So unlike #1/#2 I can't identify the conditioning rule from strings alone — this reads as a genuine fork needing a human decision on which form is canonical, or what governs the choice. Flagging as a real open ZUT decision, not resolved by pattern.

**#4 — "get" — not decomposable as one lego at all (structural, not really a "fork").** Only 6 seeds contain get/gets/getting, and each uses a **completely different Cornish verb** for a different English idiom: [133] get-to-know→`dheu dhe aswonn`, [397] get-ready→`ombareusi`, [421] getting-weak→`vos ow kwannhe`, [485] get-away→`mos dhe-ves`, [497] get-some-sleep→`kavos`, [505] get-left-behind→`gesys`, [539] getting-late→`tos ha bos diwedhes`, [562] get-there→`drehedhes`. This is **not a ZUT violation** — English "get" itself has no single intention across these seeds, so there's nothing to unify. Flagging so it isn't mistakenly treated as a fork to "fix": each instance needs its own LEGO regardless.

---

### 2. Checked and cleared — looked like forks, turned out to be conjugation/mutation, or correctly-conditioned constructions

- **speak**: `kewsel`(11)/`gews`(6) — infinitive vs present-tense stem of one verb. Clean.
- **see**: `gweles`(6)/`weles`(4) — g→w soft mutation, same verb. Clean.
- **help**: `gweres`(16)/`weres`(9) — g→w soft mutation, same verb. Clean.
- **start**: `dalleth`(7)/`talleth`(4)/`dhallathas`(3) — d/t/dh consonant mutation across grammatical persons/particles, same verb. Clean.
- **learn**: `dyski`(6)/`tyski`(3) — d→t mutation after the progressive particle. Clean.
- **understand**: `konvedhes`(3)/`gonvedhes`(2) — k→g mutation. Clean.
- **ask**: `govynn`(12)/`govyn`(7) — same verb, but I could **not** find a grammatical rule for the double-n vs single-n; looks like an orthographic inconsistency by the translator rather than mutation. **Not a ZUT semantic fork, but flag for spelling normalization** before it pollutes token-level audits downstream.
- **like**: `garsa`(9, "I'd like…" — conditional) vs `da yw genev`(9, "I like …ing" — general preference). Cross-checked: every `garsa` example is "I'd like to X" and every `da` example is "I like X-ing" / "I like V". English source itself distinguishes these two ("I'd like" vs "I like"), so this is a **correctly conditioned pair, not a fork** — but the LEGO builder needs both forms, keyed off the English surface phrasing.
- **feel**: `omglewes`(6, "I feel [adj]" direct) vs `hevel`(3, "it feels as if/like…" impersonal). Checked all instances — [114]/[115]/[618] are all "feel as if/like" and use `hevel`; direct feeling-adjective seeds use `omglewes`. Correctly conditioned, not a fork.
- **try**: `assaya`(20/20) — single form, clean.
- **go**: `mos`(17/17 dominant) — clean.
- **come**: `dos`(4/5, small sample) — clean.
- **give**: `ri`(5/5) — clean.
- **say**: `leverel`(20/24 dominant) — clean.
- **tell**: `leverel`(11/11) — clean, but see reverse-direction note below.
- **remember**: `perthi kov`(7/7, fixed phrase "bear memory of") — clean.

---

### 3. Reverse direction — Cornish tokens carrying multiple English intentions

Scanned the top ~150 non-function Cornish tokens (by freq.json) for co-occurring English words. Most striking:

- **`leverel`** (n=35): co-occurs with **say**(18) *and* **tell**(11). One Cornish verb serves two distinct English verbs. Not a ZUT violation by itself (ZUT constrains English→Cornish, not the reverse), but worth flagging for decomposition: say and tell may need to be taught as related/interchangeable LEGOs rather than two independently-taught items, since the target form doesn't distinguish them.
- **`res`** (n=44): co-occurs with **need**(22) and **have**(8) — this is the "have to" / "need to" necessity construction; both English surface verbs map to the same Cornish necessity-construction. Expected overlap, not flagged as a problem (need-to and have-to are legitimately synonymous constructions), but noting it since it's the same token family as fork #3 above.
- Everything else in the top-150 (`my`, `bos`/`vos`, `dha`, `henna`, `o`, `kewsel`, `da`, `gul`/`wul`/`kul`/`wrug`, etc.) resolved to function words, pronouns, or conjugated forms of a single verb (e.g. `gul` family = "do/make", all one verb) once I pulled examples — nothing else struck me as a distinct multi-intention case worth a human's time.

---

### 4. Honesty notes on method limits

- Co-occurrence at seed level is coarse: a seed with both "want" and "speak" in English will show up in both words' Cornish-token lists even where the relevant target word is unrelated. I mitigated this only by eyeballing 2-3 pulled examples per form — I did **not** verify all 668 seeds by hand, so low-count forms (n<5) are lower-confidence than the ones above.
- I have zero Cornish vocabulary knowledge; every semantic claim above (e.g. "know-person vs know-fact") is inferred purely from the pattern of English glosses that accompanied each form, not from independent knowledge of Cornish grammar. A Cornish speaker should confirm #1–#3 before you lock in a ZUT decision.
- Nouns/adjectives/adverbs beyond the specified verb list were not separately swept — the brief asked verbs first, and the verb sweep alone surfaced the two highest-confidence real forks (know, think); I'd recommend a follow-up pass on nouns only if you want full coverage before decomposition starts.

Scratch scripts and full per-word dumps are at `.a108-cor/scratch-zut/` (analyze.py, deepdive.py, reverse.py) if you want to re-run with different word lists — nothing was modified outside that directory, no DB access, no commits, no audio.

**No commits were made — read-only analysis only.**
