# cym_for_yor — Welsh for Yoruba speakers: text-side build

**No audio of any kind was generated.** The course's audio count was 0 before I started and is 0 now. I stopped where audio would begin, as instructed.

---

## 1. How far it got, in numbers

| | Before | After |
|---|---|---|
| Seeds (translated) | 668 | 668 (untouched) |
| **LEGOs** | **0** | **28** |
| **Practice phrases** | **0** | **194** — 65 BUILD, 103 USE, 26 component rows the server generated |
| Seeds decomposed | 0 | **10** |
| Audio clips | 0 | **0** |

Ten seeds of a 668-seed corpus. **That is 1.5%.** I am not going to dress that up.

All ten went through the real course-builder API (`POST /api/seed/complete`), which ran its own tiling, ZUT, vocabulary and phrase-structure gates on each. All ten returned HTTP 200 with no errors and no held-out phrases.

I stopped at ten deliberately. The `calibrate` skill in this repo describes golden decomposition as a human-in-the-loop step whose output is the reference every later build agent copies. Neither of us speaks Yoruba. Ten seeds is a unit a Yoruba speaker can actually sit down and rule on in one sitting; 668 would be ~13,000 unreviewable phrases with any systematic error baked into all of them. The list in §7 is the point of stopping here.

---

## 2. Two things about this course that were not true in the brief

### It is a 668-seed corpus, not 300

The brief said 300, flagged honestly as inferred rather than read. It was inferred, and it is wrong — but not because anyone guessed badly. **`courses.seed_count` for cym_for_yor is NULL.** The 300 comes from a hardcoded fallback that appears thirteen times across the course-builder (`course-data.cjs:259`, `build.cjs:361,644`, `v2.cjs:1080,1224,1382`, `qa.cjs:609`, `seed-complete.cjs:2143`, and others), all of the form `courseInfo?.seed_count || 300`. `/api/resume/cym_for_yor` reports "300/300 done" and "Seeds 301+ are ignored" purely from that fallback.

The database says: **668 seed rows, numbered 1–668 with no gaps, every one carrying both a Yoruba known_text and a Welsh target_text, none empty.** The two released sibling Welsh courses, `cym_n_for_eng` and `cym_s_for_eng`, are both 668-seed. The evidence says flagship.

**This needs your decision, and it is the one blocking item.** Setting `courses.seed_count = 668` would change what every progress display, resume endpoint and QA sweep in the estate believes about this course. I did not touch it. Until you do, the builder will refuse anything past seed 300.

### The Yoruba side is shared with yor_for_eng — the same strings, in both courses

This is the biggest structural fact I found and it changes how the work should be planned.

The 668 Yoruba texts here (the **known** side) are the same translation corpus as `yor_for_eng`'s **target** side:

- **654 of 668 are byte-identical.**
- **668 of 668 are identical once you normalise the language name** — `èdè Welsh` here vs `èdè Yorùbá` there. That is the only difference in the other 14.

Consequences:

1. **One Yoruba review serves two courses.** Every question in §7 is a question about `yor_for_eng` too.
2. **Any defect in the Yoruba is inherited by both.** The seed-10 mistranslation below was independently flagged on the same string by the `yor_for_eng` worker yesterday. Two agents, two courses, one corpus, same finding.
3. I deliberately mirrored `yor_for_eng`'s Yoruba chunk boundaries (commit `3c1efc6c`) rather than inventing my own, so the two courses stay consistent and a speaker can rule once.

I also confirmed the whole thing sits on the shared 668-seed English corpus — `cym_for_yor` seed N is a translation of English seed N, verified against `afr_for_eng` and spot-checked at seeds 1, 3, 10, 50, 200, 400, 668. That gave me an English pivot for every seed while decomposing, which is the only reason a non-speaker of either language could do this carefully.

---

## 3. The defect you told me not to reproduce: my result

**Zero instances. Here is the method, because a clean number with no method is worthless.**

I ran all three checks **against the rows actually stored in Postgres**, not against my source file — `selfcheck-stored.cjs` in the committed directory reads the DB back and re-derives everything.

**Check 1 — do both sides of each LEGO actually correspond, with neither borrowed from a sibling?**

I located each LEGO's known side as a word-span of its seed's Yoruba prompt, and its target side as a word-span of the seed's Welsh sentence, then asked three questions of the resulting spans:

| | Result |
|---|---|
| LEGO sides that are **not a contiguous span** of their seed sentence | **0 of 56** (28 LEGOs × 2 sides) |
| Words claimed by more than one LEGO | 1 seed (S4: `nǹkan`/`rhywbeth`) — and it is claimed **symmetrically on both sides**, which is the overlap teaching mechanism, not a rotation |
| **Order crossings** — LEGOs sorted by position in the Yoruba prompt, do their Welsh positions cross? | **0 of 10 seeds** |

That third one is the direct test for the rotation you described. If two cards hold each other's material, sorting by one side and reading off the other produces a crossing. Across 28 LEGOs in 10 seeds there are none.

**The contiguity check earned its keep — it caught one in my own draft.** I had sliced seed 10 as `rántí gbólóhùn náà` → `gofio'r frawddeg`. That Yoruba span is **discontinuous**: the seed reads `rántí gbogbo gbólóhùn náà`, with `gbogbo` sitting in the middle. A discontinuous slice is precisely how a LEGO ends up holding a neighbour's material — I had reached over `gbogbo` to grab `gbólóhùn náà` while the Welsh side took a clean run. I rebuilt it as one whole chunk, `rántí gbogbo gbólóhùn náà` → `gofio'r frawddeg gyfan`. That is a near-miss of the estate-wide defect, caught by a check the shared machinery does not run.

**Check 2 — self-contradiction (needs no language knowledge).**

Every stored LEGO, every M-LEGO component and every practice phrase — 253 rows, 223 distinct Yoruba prompts:

- **Same Yoruba paired with different Welsh: 0.**
- Different Yoruba paired with the same Welsh: 11. That direction is *convergence*, which the methodology explicitly allows and calls useful — e.g. `láti sọ`, `sọ` and `sísọ` all reach `siarad`, teaching the learner that Yoruba's three forms unify in Welsh.

**Check 3 — missing LEGO (a word the seed needs that nothing teaches).**

- Seeds with an uncovered Yoruba word: **0 of 10**
- Seeds with an uncovered Welsh word: **0 of 10**

(counting a word as covered if this seed's LEGOs cover it *or* an earlier seed taught it — the honest test, since seed 6 legitimately reuses `dw i'n trio` from seed 2.)

---

## 4. Diacritics: round-trip evidence, byte for byte

I wrote real rows through the real API and read them straight back out of Postgres, comparing **hex**, not rendered glyphs.

**26 of 28 LEGO known sides byte-identical. 2 differed, and the difference is ASCII only:**

```
~ S5L2  sent "Mo máa kọ"        stored "mo máa kọ"
~ S8L1  sent "Mo máa gbìyànjú"  stored "mo máa gbìyànjú"
         M → m   (0x4D → 0x6D)
```

Both are `stripBookendPunctuation` lowercasing a leading ASCII capital — documented behaviour applied to every course, and its capital test is ASCII-range-only (`result[0] >= 'A' && result[0] <= 'Z'`), so it can never reach a Yoruba byte. **Yoruba byte loss: 0.**

Across all 222 stored Yoruba strings:

- **222 of 222 NFC-normalised.** Zero zero-width characters, NBSPs or BOMs.
- Inventory: `á í è ọ ẹ à ú ì ó ṣ ò é ǹ ń ù` plus **195 standalone combining marks** — U+0300 ×110, U+0301 ×85.

**That last number is correct, not corruption, and it is the thing that makes Yoruba dangerous here.** There is no precomposed Unicode codepoint for a dot-below vowel carrying a tone mark, so `ẹ́` is necessarily `U+1EB9 + U+0301` — two codepoints — even in fully-normalised NFC. Any code that "cleans up" by stripping combining marks destroys the tone on exactly the commonest Yoruba vowels while leaving `á` and `í` untouched. The corruption would look partial and random rather than obviously broken.

The Welsh side stored cleanly too: `ŵ` ×46, `â` ×32, and ASCII apostrophe U+0027 ×100 — matching this course's seed corpus, which uses ASCII apostrophes in all 397 rows that have one, with zero curly quotes. (Worth knowing: `cym_n_for_eng` uses the *curly* U+2019 in 161 rows. The two courses are on opposite conventions, so Welsh text can never be copied between them without breaking string containment.)

---

## 5. Tone: what I did, given that the gates are blind to it

You told me the automated gates strip combining marks and would not catch a tone error. **On this particular code path that turns out not to be true, and I can show it three ways.**

A sub-worker traced the entire require-graph of the route serving `POST /api/seed/complete`. `normalizeForZUT` — the NFD-then-strip-U+0300–U+036F function — is **imported into `validation.cjs:8` and never called**, and is not imported into `seed-complete.cjs` at all. The gates that actually touch the Yoruba known side are:

- `checkLegoConflict` (`validation.cjs:481`) — queries with `.eq('known_text', …)`, an **exact byte match**, not even case-folded.
- `checkPhraseZUT` (`validation.cjs:631`) — lowercase and trailing-punctuation only.
- The canonical-mismatch check (`seed-complete.cjs:1092`) — whitespace-collapse and lowercase only.

All tone-strict. The blind function lives on *other* routes (`v2.cjs:162`, and `regenerate-stamped-builds.cjs` uses it as a phrase dedupe key — that one would silently delete correct content if pointed at either Yoruba course).

**And I proved it live rather than only reading it.** Seed 2 teaches `kọ́` (high tone, "learn") → `dysgu`. Seed 5 teaches `kọ` (mid tone, "practise") → `ymarfer`. One combining mark apart; a tone-blind key sees one word twice with two different answers and must reject. **Seed 5 submitted successfully after seed 2.** Both are in the database right now as distinct forms:

```
kọ́   ×33   hex = 6b e1bb8d cc81
kọ    ×23   hex = 6b e1bb8d
```

**What I did in my own output, regardless:** every dedupe, ZUT and same-phrase test I ran compares diacritic-exact strings. Nothing was merged on a stripped form. My own tone-blindness probe (§3 of `verify-known-side.cjs`) runs the stripping deliberately, reports what *would* merge, and its verdict is never acted on — it exists as evidence, not as a gate. It reports one pair in my output: `kọ́`/`kọ`. Under a tone-blind key that would be a **false rejection** of correct work.

**A wider hazard for whoever builds seeds 11–668.** Across the full 668-row Yoruba corpus there are **175 groups of distinct word forms that collapse together** under mark-stripping. The worst is `ko`, which merges five different things: `kò` ×59 (negator), `kọ́` ×13 (learn), `kọ̀` ×6 (refuse), `kọ` ×5 (write/practise), `kó` ×1. Others: `mo` merges `mo`/`mọ̀`/`mọ`/`mọ́`; `pe` merges `pé`/`pẹ̀`/`pè`/`pẹ́`; `si` merges `sí`/`sì`/`ṣí`/`ṣì`. The code will not stop you. Eyes must.

---

## 6. The untaught-word rule, and a gap in the machinery worth knowing about

**Result: 0 violations, on both sides, across all 194 stored phrases.** Checked as I built, not after.

But the two sides were checked by different things, and that is the finding.

**The Welsh side is gated by the server** and passed clean. **The Yoruba side is gated by nothing at all.** Every `checkVocabViolations` and `checkTiling` call in the route runs on `.target`; every `extractVocab` call site (twelve of them) is on `.target`. There is a known-side gate, `checkKnownSide`, but it only fires when a pair-contract file loads, and `docs/pair-contracts/cym_for_yor.contract.cjs` does not exist — so for this course it never executes. The known side of this course currently has **zero automated reconstructability enforcement**.

That matters because the methodology is explicit that the known side is a controlled language too, and reconstructability holds in *both* languages. So I wrote the missing gate — `verify-known-side.cjs`, a tone-exact whole-chunk tiler over the Yoruba prompts, using the same dynamic-programming algorithm the server uses on Welsh.

**It found 21 real defects in my own first draft that every server gate had passed.** They were all one shape: a Yoruba prompt using a Yoruba chunk the learner had not been given, while its Welsh translation tiled perfectly. Examples:

- Seed 7's own sentence could not be rebuilt from its own decomposition on the Yoruba side. Welsh `trio` was already available from seed 2, so the target side was happy — but Yoruba `láti gbìyànjú` had never been taught. **The seed could not reconstruct itself in the known language.** Fixed by minting the LEGO.
- Yoruba drops `láti` after `lè` and `máa`, so phrases like `mo lè ṣàlàyé nǹkan` used a bare verb form that only existed inside `láti ṣàlàyé`. Fixed structurally: every `láti V` LEGO now exposes the bare verb as a component, so both sides tile.

**A warning if anyone adds a pair-contract to switch the real known-side gate on:** `checkKnownSide`'s tokenizer is `s.split(/[^a-z']+/)` — ASCII-only. On Yoruba, every diacritic character becomes a word boundary, so `fẹ́` tokenizes as `f` + `` . It is inert today only because no contract file exists, not because it is safe. Fix the tokenizer before writing a contract for either Yoruba course.

---

## 7. Points that need a Yoruba speaker

Not a failure list — the judgements I refused to fake. Each is written so someone who knows Yoruba but nothing about our system can rule on it. **Questions 1–7 are about the shared corpus and therefore affect `yor_for_eng` too.**

**About the existing Yoruba translations:**

1. **Does `sọ` really cover both "speak" and "say"?** Seed 3 uses `bí mo ṣe máa sọ` for "how to speak"; seed 4 uses `bí mo ṣe máa sọ nǹkan` for "how to say something". Welsh uses two different verbs (*siarad* / *deud*). I handled it by teaching `sọ` as "speak" everywhere, and treating `sọ nǹkan` ("say something") as a single fixed phrase. Is that a real distinction in Yoruba — bare `sọ` = speak, `sọ` + object = say — or have I invented it?

2. **Seed 10 looks like a meaning error.** The English is *"I'm not sure if I can remember the whole sentence."* The Yoruba is `Mi ò rò pé mo lè rántí gbogbo gbólóhùn náà`, which reads as **"I don't THINK that I can remember…"** — a stronger and different claim. The Welsh (*dw i ddim yn siŵr*) follows the English. Is the Yoruba wrong? *(Independently flagged on this same string by the yor_for_eng build.)*

3. **`kọ́` (learn) vs `kọ` (practise)** in seeds 2 and 5 — are these the right way round? Everything in §5 rests on the corpus having got these two tones right.

4. **Register.** The corpus is consistently familiar 2sg (`o` / `rẹ`). For a community course whose learners may address elders, is familiar-throughout right, or should some material teach respectful `ẹ`?

5. **`bí mo ṣe máa sọ` embeds a 1sg subject** (`mo`), so it literally means "how **I** speak". I have taught it as "how to speak". Will that break the moment a learner needs it with another subject?

6. **The language name is left in English**, as `èdè Welsh` rather than a Yoruba name for Welsh. Is that acceptable, or should it be rendered in Yoruba? **This affects only 14 of the 668 seeds** — the language is named far less often than the opening seeds suggest — and all 14 use `èdè Welsh` consistently, never bare `Welsh`. So it is a cheap change if a speaker wants one. *(Related, same question and same small cost: 4 seeds — 161, 175, 179, 218 — write the day as `ọjọ́ Sunday`, an English day-name inside the Yoruba, where the Welsh has `dydd Sul`.)*

7. **Seeds 68 and 194 are an exact duplicate.** Both have the Yoruba `Kí ni o ń wá?` (byte-identical, verified) but two different Welsh translations — *"Be wyt ti'n chwilio amdano?"* and *"Be ti'n chwilio amdano fo?"*. One Yoruba prompt cannot have two Welsh answers. Either the Welsh should be consolidated to one form, or the two Yoruba prompts should be made genuinely different. This will hard-block the build when it reaches seed 194.

**About my decompositions:**

8. **`sísọ` vs `láti sọ`.** I taught both, converging on Welsh *siarad*. Is `sísọ` ("speaking") genuinely usable where I put it — e.g. `Mo máa kọ sísọ èdè Welsh`?

9. **`Mo máa kọ` for "I'm going to practise".** I taught `máa` + `kọ` as one unit. Is `máa` correct for the near future here, and does `kọ` take a direct object the way I use it (`kọ sísọ èdè Welsh`)?

10. **`gidigidi` placement.** I generated `Mo fẹ́ láti gbìyànjú gidigidi bí mo ṣe lè`. Is the intensifier correctly placed, or must it sit clause-finally? Affects 8 phrases.

11. **`ohun tí mo túmọ̀ sí` ("what I mean").** I split it `ohun tí` = "what", `mo túmọ̀ sí` = "I mean". Is `túmọ̀ sí` a split verb whose `sí` must sit clause-finally? If so my component gloss misleads even though the whole chunk is right.

12. **`ọ̀rọ̀ kan` for "a word".** Welsh has no indefinite article, so I taught the pair whole and left `kan` unmapped. Is `ọ̀rọ̀ kan` the natural way to say "a word", or is bare `ọ̀rọ̀` better?

**And separately, for a Welsh speaker — these are in-house and should be quick:**

- **W1.** Soft mutation after `fedra i` is the constraint that shaped seed 10. `cofio`→`gofio`, `dysgu`→`ddysgu`, `trio`→`drio`. I confined L1's phrases to verbs that do not mutate (`siarad`, `esbonio`) or to chunks already taught in mutated form. **The server's untaught-word gate cannot see mutation and would happily have accepted the ungrammatical `fedra i cofio`** — it pressures an author toward unmutated, wrong Welsh. Please check my 194 phrases for mutations I missed.
- **W2.** Is `yn Gymraeg` (seed 4) right, or should it be `yn y Gymraeg`? The released `cym_n_for_eng` teaches "in Welsh" → `yn y Gymraeg`, but this course's own seed text says `yn Gymraeg`.
- **W3.** `chydig o Gymraeg` — I taught it whole to avoid the learner assembling the quantifier and mutation. Sound?

---

## 8. The ZUT forks ahead — where Yoruba merges what Welsh splits

The published version of this report listed this as an open gap: I knew of **one** fork (`sọ` = speak/say) and could not claim to know all of them. The worker I sent to find the rest died on an account limit, so I ran the scan myself. **It is no longer a gap.**

**Method.** Distributional alignment over all 668 seed pairs, with the shared English corpus as a readability pivot. For each Yoruba token, find the Welsh tokens it is strongly tied to (Dice ≥ 0.28, lift ≥ 3), then collapse Welsh mutation variants so `deud`/`ddeud` is not miscounted as a fork. All Yoruba grouping is diacritic-exact. **Sanity check: `sọ` comes out at rank 1** — if it had not, the method would be wrong and I would be reporting that instead.

**73 Yoruba tokens have two or more distinct strong Welsh correspondents.** Most are artefacts of co-occurrence (`ràn … lọ́wọ́` = *helpu* is one Yoruba idiom spanning two tokens, not a fork). These are the ones I judge real, ranked by blast radius:

| Yoruba | Seeds | Welsh splits into | The distinction Welsh makes |
|---|---|---|---|
| **sọ** | **97** | siarad / deud | speak vs say — **the confirmed one** |
| **ṣe** | 94 | sut / gwneud | the `bí…ṣe` "how" frame vs `ṣe` = do |
| **kò** | 81 | dydy / doedd | negation is split **by tense** in Welsh, not in Yoruba |
| **tó** | 52 | cyn / nesa | before vs next |
| **mọ̀** | 36 | gwybod / nabod | know a **fact** vs know a **person** — the classic Welsh split |
| **gbogbo** | 34 | i gyd / bob | all (of them) vs every |
| **rẹ** | 34 | dy…di / chdi | your (possessive) vs you (object) |
| **bí** | 34 | sut / fel | how vs like/as |
| **nígbà** | 27 | pan / pryd | when (relative) vs when? (question) |
| **síi** | 25 | mwy / chydig | more vs a little |
| **ọ̀rẹ́** | 22 | ffrind / ffrindiau | Yoruba marks plural with `àwọn`, Welsh on the noun |
| **dáadáa** | 13 | yn dda / yn well | well vs better |

**What this means for the build, concretely.** Each of these will hard-reject at the API the moment two seeds want the same Yoruba chunk to produce different Welsh — the ZUT gate is doing its job. The fix is never to weaken the gate; it is the methodology's *consolidate-or-differentiate* call, made once per fork by a speaker, before the seeds that contain them are built. I made that call for `sọ` at seeds 1–10 (teach `sọ` = *siarad* everywhere; reach "say" only through the whole chunk `sọ nǹkan`), and it is question 1 in §7.

**`kò` and `nígbà` are the two I would look at first**, because they are not vocabulary choices at all — they are places where Welsh grammar forces a distinction Yoruba carries in context. `kò` alone touches 81 seeds. Whoever builds seeds 11–668 should have a ruling on all twelve of these in hand before starting, not discover them one 400-response at a time.

**Limits, stated plainly:** this is co-occurrence, not a real word aligner. It finds candidates for a human to rule on. It will miss forks carried by multi-word chunks rather than single tokens, and the twelve above are my judgement calls out of 73 raw hits — a speaker may promote some I discarded. The scan is committed as `zut-fork-scan.cjs`; re-run it and disagree with me.

---

## 9. Dialect: North, settled with numbers

You asked which the corpus carries. **North Welsh, decisively, and internally consistent.**

Rather than assume a marker list, I had a worker derive one from the two released courses: tokenise all 668 rows of `cym_n_for_eng` and of `cym_s_for_eng`, and keep words appearing in ≥5 rows of one and ≤1 of the other. That produced 21 North and 25 South markers empirically.

Applied to the 668 `cym_for_yor` rows:

| | Rows |
|---|---|
| Contains a North marker | **355** |
| Contains a South marker | 16 |
| Contains both | 6 |
| Contains neither | 303 |

**≈22:1 for North.** All six "both" rows dissolve on inspection: five are the single weak marker `nag` (a general negative particle, plausibly just under-sampled in the North corpus), and the sixth is a false positive where the South pronoun `e` fired on the loanword `e-bost`. **Zero rows contain a genuinely strong South marker alongside a North one.**

My own output follows suit: `dw i isio`, `efo chdi`, `rŵan`, `deud`, `fedra i`, `medru` — all North, all cross-checked against the released `cym_n_for_eng` LEGO inventory.

---

## 10. Method: where I followed it and where I departed

Followed: `ralph-methodology.md` (overlapping LEGOs, BUILD vs USE, ZUT, non-greedy introduction, particles as construction-features), the layered-decomposition brief, and the `calibrate` skill's stop-at-golden discipline.

Three deliberate departures, all forced by this pair:

1. **I wrote a known-side gate the pipeline does not have** (§6). The methodology requires reconstructability in both languages; the machinery only enforces one. For an English-known course that gap is partly covered by a pair-contract; for `cym_for_yor` nothing covers it.

2. **Welsh mutation is never atomised.** `ddeud`, `drio`, `gofio'r`, `Gymraeg`, `feddwl`, `gyfan` only ever appear *inside* whole chunks, never as a component with its own gloss. Minting `gbìyànjú`→`drio` would have collided with `gbìyànjú`→`trio` from seed 2 anyway, but the deeper reason is methodological: mutation is a construction-feature, and asking a learner to choose one is the category error the doctrine names.

3. **LEGO introduction order departs from surface order in three seeds** (4, 7, 10), each recorded as a note on the seed. Seed 10 is the clearest: the negative frame `Mi ò rò pé` → `dw i ddim yn siŵr` is introduced **last**, so its practice phrases can embed a complete `fedra i …` clause instead of the stilted "I'm not sure I speak Welsh" that frame-first ordering forces.

---

## 11. Explicit gaps

- **658 of 668 seeds are not decomposed.** 1.5% done. §1 says why I stopped rather than continuing.
- **`courses.seed_count` is still NULL.** I did not set it. Until it is set to 668, the builder hard-stops at seed 300. Your call (§2).
- **Nobody on this job speaks either language.** Every judgement in §7 is unverified. The Welsh is anchored to a released North Welsh course and is therefore on firmer ground than the Yoruba, which is anchored to nothing but the corpus itself.
- **Seeds 68/194 will hard-block the build** when it reaches them (§7 q7). Not fixable without a speaker.
- **The fork scan is done and this gap is closed** (§8). The worker I sent for it died on an account limit, so I ran it myself: 12 real ZUT forks across the corpus, `kò` (81 seeds) and `nígbà` (27) being the two that are grammar rather than vocabulary. It is co-occurrence, not a true aligner, so it will miss forks carried by multi-word chunks.
- I did not modify a single existing seed row, and generated no audio.

---

## 12. Reproducing any of this

Everything is committed under `docs/cym-for-yor-build-2026-08-15/`:

| File | What it does |
|---|---|
| `golden-decompositions-seeds-1-10.cjs` | The decompositions, with per-LEGO reasoning |
| `verify-gates.cjs` | Runs the **real server gates** over them (target side) |
| `verify-known-side.cjs` | The known-side tiler, ZUT, tone probe and correspondence checks the server lacks |
| `selfcheck-stored.cjs` | Re-runs the three self-checks against **what is in Postgres** |
| `roundtrip-check.cjs` | Byte-for-byte diacritic round-trip |
| `submit.cjs` / `submit-log.json` | Submission and the ten 200 responses |
| `zut-fork-scan.cjs` | The corpus-wide fork scan behind §8 |
