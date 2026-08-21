# cym_n_for_eng — the reuse factor, measured on a contiguous run (canon seeds 300–339)

2026-08-21. Measurement only. Nothing was written to any course, in any database. No audio, no TTS, no audio-pass queued.

## What this answers

A 40-seed stratified pilot measured the canon tail at **2.78 genuinely new legos per seed** against the 457 legos the kept range (`cym_n_for_eng` seeds 1–267) already teaches. Both halves of that pilot flagged the same limitation: because it sampled every 10th seed, no two sampled seeds were adjacent, so each seed was scored against the kept inventory *only*. In a real build seed 512's new lego is available to seed 532. So 2.78 is an **upper bound**, not an estimate.

This measures a **contiguous run — canon seeds 300 to 339 inclusive** — decomposed in order, each seed drawing on the kept 457 **and** on everything introduced by earlier seeds in the run. Both counts were taken on the same 40 seeds, which is what makes the ratio checkable.

## Headline numbers

| | |
|---|---|
| (a) New legos by the pilot's method (each seed vs kept 457 alone) | **119** — 2.98 / seed |
| (b) Distinct new legos the run actually needs | **97** — 2.43 / seed |
| **Reuse factor (b / a, same 40 seeds)** | **0.815** |
| Of the 97: genuinely new lexis | **39** (0.98 / seed) |
| Of the 97: recombinant rows (new row, no new vocabulary) | **58** (1.45 / seed) |

**The build is ~18.5% smaller than the upper bound says.**

Corrected estimate for the 316 new-content canon seeds:

- Applying the ratio to the pilot's own rate: 316 × 2.78 × 0.815 = **≈ 716 legos** (vs the 878 the raw 2.78 implies — **162 legos of inflation removed**).
- Applying my run's absolute rate directly: 316 × 2.43 = **≈ 766 legos**.
- **Working figure: 716–766 new legos.** The spread is the granularity difference between my decomposition and the pilot's (mine ran slightly finer: 2.98/seed vs their 2.78 on the same *method*), and it is the honest error bar on the absolute count. The **ratio itself is granularity-independent** — that is why it was measured within one sample.

And the split matters for spend: of ~740 legos, only **≈ 308 introduce new vocabulary**; **≈ 432 are recombinant** — a new row assembled entirely from atoms already taught (`dydy hi ddim isio`, `bod o angen`, `bod hi'n medru`). Those still cost a row and still need 4 BUILD + 5 USE phrases each, but they need no lexical research, no synonym-choice pass, and no ZUT adjudication against unfamiliar vocabulary. They are the cheap 58%.

## The two rulings, and which way I went

**Ruling 1 — bound legos and person-forms.**
> A form that appears inside an already-taught M-lego, and a different person-form or inflection of an already-taught verb or frame, counts as **already-taught lexis** — but if it needs its own lego row to be produced, that row is counted, classified **recombinant**.

Permissive on lexis, strict on rows. Rationale: the learner has *heard* `ddynas` inside `hen ddynas` and `llaw` inside `llond llaw go iawn`, so nothing lexical is being taught when `dynes` (305) or `ei dwy law` (324) appears — but the row still exists and still needs phrases, so it is not free. The alternative (bound = untaught) would have inflated new-lexis by counting Welsh mutation as vocabulary, which is exactly the error the brief warned against.

This ruling decided **31 of the 97 calls** — every one of them landing in the recombinant bucket rather than the new-lexis bucket. If Tom rules the other way, new lexis rises from 39 to 70 and the *lexical* cost of the build roughly doubles; **the reuse factor and the total row count do not move at all**, because the row is counted either way.

Mutation and inflection were treated as identity throughout: `problem/broblem`, `ffeithiau/ffaith`, `pump/pum`, `bod/fod`, `adre/adra`, `ystafell/stafell` are all the same lego.

**Ruling 2 — recombinants counted separately.** Done, as above. A recombinant is a row whose every constituent morpheme is already taught: `dydy hi ddim isio` (300) from kept `dydy o ddim isio` + `dydy hi ddim yn licio`; `mae hi angen` (319) from kept `dw i angen` + `ti angen`; `fedrith hi ddim` (331) from kept `fedra i ddim`.

## Where the reuse actually came from

The 22-lego gap between (a) and (b) is not spread evenly. It is concentrated in **frame carriers that the contiguous run hits repeatedly**:

- `y basai hi'n medru` / conditional "could" — debuted at seed 310, then reused by 312, 314, 316, 317, 318. Under the pilot's method that is **6 charges for one lego**.
- `bod hi angen` / `bod o angen` — debuted 322/325, reused by 326, 327.
- `bod o'n medru` / `bod hi'n medru` — debuted 334, reused by 335, 337.
- `dw i ddim yn meddwl` — debuted 318, reused by 326, 330, 336.
- `nac ydw` — debuted 309, reused by 318, 330, 339.
- `yndw` — debuted 308, reused by 317, 328.

This is a canon block built as a *paradigm drill* — one modal frame worked through say/think/question/yes/no variants across eight or ten consecutive seeds. That structure is exactly what a stratified sample destroys and a contiguous run captures. **It is also the reason the 0.815 figure should be treated as sample-specific in one direction:** see the error bar.

## Construction-gap compression (measured separately)

The pilot found 35% of seeds needing a known-side English construction the kept range never debuted. In a contiguous run one carrier serves every later seed that needs the same construction, so the cost should compress harder than the lego cost.

It does.

| | |
|---|---|
| Seeds in the run touching ≥1 undebuted construction | **15 of 40 (37.5%)** — confirms the pilot's 35% |
| **Distinct carriers actually needed** | **8** |
| **Construction compression = 8 / 15** | **0.53** |

The eight carriers, with the seeds each one serves:

| Carrier needed | Seeds served |
|---|---|
| Conditional "could" (`basai`) | 310, 312, 313, 314, 315, 316, 317, 318 (8) |
| Negative short answer "no" (`nac ydw`) | 309, 318, 330, 339 (4) |
| Postposed quantifier "all" (`i gyd`) | 313, 331 (2) |
| Demonstrative NP + relative ("that young woman who's…") | 306, 307 (2) |
| "both of" | 324 (1) |
| Reflexive "himself" | 339 (1) |
| "never … before" | 309 (1) |
| Deictic "over there" (`yn fan'cw`) | 307 (1) |

**Construction cost compresses to 0.53 — nearly twice the compression of lego cost (0.815).** The single conditional carrier alone absorbs eight seeds. Extrapolated to the 316 new-content seeds: ~118 seeds will touch a construction gap, but they need on the order of **63 carriers**, not 118. Given that each carrier is a design decision (which seed debuts it, with which twin contrast) rather than a row of typing, this is the cheaper half of the news.

Caveat: 0.53 is measured on a block that is *thematically* contiguous. Across the whole tail, carriers debuted in one block are reused by later blocks too, so 0.53 is if anything conservative for the full 316.

## Per-seed table

R = recombinant (new row, no new vocabulary). N = new lexis. "Pilot" = new legos counted against the kept 457 alone. "Run" = new legos counted against kept 457 + everything earlier in this run.

| Seed | English | Welsh (10/10 consensus) | Pilot | Run | N | R | Reused from |
|---|---|---|---|---|---|---|---|
| 300 | She doesn't want to seem unfriendly. | Dydy hi ddim isio ymddangos yn anghyfeillgar. | 3 | 3 | 2 | 1 | — |
| 301 | He said that he wants to show you something. | Mi ddeudodd o bod o isio dangos rhywbeth i chdi. | 3 | 3 | 1 | 2 | — |
| 302 | She said that she doesn't want to live in a city. | Mi ddeudodd hi bod hi ddim isio byw mewn dinas. | 3 | 3 | 2 | 1 | — |
| 303 | I think that he wants to sit down. | Dw i'n meddwl bod o isio eistedd i lawr. | 3 | 2 | 1 | 1 | `isio` ← 301 |
| 304 | I think that she doesn't want to work from home. | Dw i'n meddwl bod hi ddim isio gweithio o adra. | 2 | 1 | 0 | 1 | `bod hi ddim isio` ← 302 |
| 305 | Woman. | dynes | 1 | 1 | 0 | 1 | — |
| 306 | I know that young woman who's talking to your friend. | Dw i'n nabod y ddynes ifanc 'na sy'n siarad efo dy ffrind di. | 3 | 3 | 0 | 3 | — |
| 307 | I know that young man who's sitting over there. | Dw i'n nabod y dyn ifanc 'na sy'n eistedd yn fan'cw. | 3 | 3 | 1 | 2 | — |
| 308 | Yes she's a friend of my mother. | Yndw, mae hi'n ffrind i fy mam i. | 3 | 3 | 0 | 3 | — |
| 309 | No I've never seen her before. | Nac ydw, dw i erioed wedi gweld hi o'r blaen. | 5 | 5 | 3 | 2 | — |
| 310 | She could write a story about that man. | Mi fasa hi'n medru sgwennu stori am y dyn 'na. | 4 | 4 | 3 | 1 | — |
| 311 | He couldn't believe the three most important facts. | Doedd o ddim yn medru credu'r tair ffaith bwysica. | 4 | 4 | 2 | 2 | — |
| 312 | She said that she could use the other room tomorrow night. | Ddudodd hi y basai hi'n medru defnyddio'r stafell arall nos fory. | 4 | 3 | 1 | 2 | `basai … medru` ← 310 |
| 313 | He said that he couldn't watch all five games. | Ddudodd o fasai fo ddim yn medru gwylio'r pum gêm i gyd. | 3 | 3 | 1 | 2 | — |
| 314 | I think that she could put it on the table. | Dw i'n meddwl y basai hi'n medru ei roi o ar y bwrdd. | 3 | 2 | 1 | 1 | `y basai hi'n medru` ← 312 |
| 315 | I think that he couldn't afford the car that he wanted. | Dw i'n meddwl doedd o ddim yn medru fforddio'r car oedd o isio. | 4 | 3 | 2 | 1 | `doedd o ddim yn medru` ← 311 |
| 316 | Do you think that she could bring her brother on Monday? | Wyt ti'n meddwl y basai hi'n medru dod â'i brawd ddydd Llun? | 2 | 1 | 0 | 1 | `y basai hi'n medru` ← 312 |
| 317 | Yes I think she could if she wanted to. | Yndw, dw i'n meddwl y basai hi'n medru, tasai hi isio. | 3 | 1 | 0 | 1 | `yndw` ← 308, `y basai hi'n medru` ← 312 |
| 318 | No I don't think she could this time. | Nac ydw, dw i ddim yn meddwl y basai hi'n medru y tro yma. | 4 | 2 | 0 | 2 | `nac ydw` ← 309, `y basai hi'n medru` ← 312 |
| 319 | She needs to move to a different country. | Mae hi angen symud i wlad wahanol. | 3 | 3 | 2 | 1 | — |
| 320 | He doesn't need to buy another television this year. | Dydy o ddim angen prynu teledu arall eleni. | 3 | 3 | 1 | 2 | — |
| 321 | A book. | Llyfr. | 1 | 1 | 0 | 1 | — |
| 322 | She said that she needs to read the same book. | Ddudodd hi bod hi angen darllen yr un llyfr. | 2 | 2 | 0 | 2 | — |
| 323 | He said that he doesn't need to walk to school. | Ddudodd o bod o ddim angen cerdded i'r ysgol. | 1 | 1 | 0 | 1 | — |
| 324 | That student has both of her hands up. | Mae gan y fyfyrwraig yna ei dwy law i fyny. | 4 | 4 | 1 | 3 | — |
| 325 | I think that he needs to consider ten possible problems. | Dw i'n meddwl bod o angen ystyried deg problem bosib. | 2 | 2 | 0 | 2 | — |
| 326 | I don't think that she needs to sell the company. | Dw i ddim yn meddwl bod hi angen gwerthu'r cwmni. | 4 | 2 | 2 | 0 | `dw i ddim yn meddwl` ← 318, `bod hi angen` ← 322 |
| 327 | Do you think that she needs to offer another way? | Wyt ti'n meddwl bod hi angen cynnig ffordd arall? | 2 | 1 | 0 | 1 | `bod hi angen` ← 322 |
| 328 | Yes I think she ought to. | Yndw, dw i'n meddwl y dylai hi. | 2 | 1 | 0 | 1 | `yndw` ← 308 |
| 329 | It's important. | Mae'n bwysig. | 0 | 0 | 0 | 0 | entirely kept (`mae'n bwysig`) |
| 330 | No I don't think it's very important. | Nac ydw, dw i ddim yn meddwl bod o'n bwysig iawn. | 3 | 1 | 0 | 1 | `nac ydw` ← 309, `dw i ddim yn meddwl` ← 318 |
| 331 | She can't provide all the answers. | Fedrith hi ddim darparu'r atebion i gyd. | 4 | 3 | 1 | 2 | `i gyd` ← 313 |
| 332 | He can build a new life for his sister. | Mi fedrith o adeiladu bywyd newydd i'w chwaer. | 4 | 4 | 2 | 2 | — |
| 333 | She said that she can't spend much time with the group. | Ddudodd hi bod hi ddim yn medru treulio llawer o amser efo'r grŵp. | 3 | 3 | 0 | 3 | — |
| 334 | He said that he can let you hold the kitten | Ddudodd o bod o'n medru gadael i chdi ddal y gath fach. | 4 | 4 | 2 | 2 | — |
| 335 | I think that he can add some valuable ideas. | Dw i'n meddwl bod o'n medru ychwanegu rhai syniadau gwerthfawr. | 4 | 3 | 2 | 1 | `bod o'n medru` ← 334 |
| 336 | I don't think that she can open the door. | Dw i ddim yn meddwl bod hi'n medru agor y drws. | 4 | 3 | 1 | 2 | `dw i ddim yn meddwl` ← 318 |
| 337 | Do you think that he can continue to play? | Wyt ti'n meddwl bod o'n medru cario mlaen i chwarae? | 3 | 2 | 2 | 0 | `bod o'n medru` ← 334 |
| 338 | Badly. | Yn ddrwg. | 1 | 1 | 1 | 0 | — |
| 339 | No I think he's hurt himself quite badly. | Nac ydw, dw i'n meddwl bod o wedi brifo'i hun yn reit ddrwg. | 5 | 3 | 2 | 1 | `nac ydw` ← 309, `yn ddrwg` ← 338 |
| **Total** | | | **119** | **97** | **39** | **58** | |

## Welsh source and agreement

Welsh was taken as the consensus across the ten copies named in the digest — `ara/deu/fra/ita/jpn/kor/por/spa/zho_for_cym` (Welsh on the known side) and `cym_for_yor` (Welsh on the target side). Comparison was on NFC-normalised, case-folded, apostrophe-unified text with terminal punctuation stripped.

**All 40 seeds were unanimous 10/10.** No disagreements, no drift, nothing to adjudicate. English on all ten matched `canonical_seeds.source_text` for the same seed numbers. The northern markers hold throughout: `isio`, `efo`, `mae o`, `dw i'n nabod`, `sgwennu`, `rŵan`-family forms; zero `moyn`/`gyda`/`mae e`/`nawr`.

## Error bar — read this before spending on the number

**The ratio is measured, not modelled, but it is one sample of 40.** Three things could move it:

1. **This block is unusually paradigm-heavy — the strongest argument that 0.815 is too HIGH.** Seeds 310–318 are one modal (`could`) worked through eight frame variants; 319–328 do the same for `need`; 331–337 for `can`. If the whole canon tail is built this way, real reuse across 316 seeds is *better* than 0.815, because carriers debuted in the `could` block also serve the `can` block, and my measurement gave no credit across block boundaries beyond seed 339. **A run of 40 cannot see reuse at range 40+.** That is this measurement's own version of the pilot's limitation, and it points the same direction: 716 is likelier an overestimate than an underestimate.
2. **Contrarily, a lexically diverse block would reuse less.** Seeds like 309, 310, 332, 334, 337 carry ordinary new vocabulary (`erioed`, `sgwennu`, `stori`, `adeiladu`, `bywyd`, `dal`, `cath`, `cario mlaen`, `chwarae`) that no amount of contiguity makes free. New lexis ran at 0.98/seed here and there is no reason to expect that rate to compress much at all — **the 39 new-lexis legos are close to irreducible**; all the reuse came out of the recombinant bucket (58 recombinant rows against 80 pilot-method charges for the same material, a 0.725 ratio inside that bucket alone).
3. **Decomposition granularity is a judgment.** My per-seed rate came out at 2.98 against the pilot's 2.78 — 7% finer. That is why the absolute figures are given as a 716–766 range rather than a point. The ratio is immune to it because numerator and denominator were produced by the same hand on the same 40 seeds.

**Practical read: budget 750 legos for the 316 new-content seeds, and treat 878 as retired.** Roughly 310 of those 750 need real translation and synonym-choice work; roughly 440 are recombinant rows that need phrases but not vocabulary decisions.

## Where I was unsure

Honest list of calls that could go the other way. None of them moves the ratio by more than ~2 points, because most are lexis-vs-recombinant reclassifications inside a row that gets counted regardless.

- **`agor` (336) vs kept `agored`** — I called the verb "to open" already-taught off the adjective `bod yn fwy agored` ("to be more open"). Defensible as a root, but a learner who has only met `agored` has not been handed `agor`. If Tom rules it new lexis: N 39→40.
- **`dal` (334, "to hold")** — kept teaches `dal` meaning "still" (`dw i dal angen`). Same string, unrelated sense. I called it **new lexis** on sense, not string. This is the one place I let meaning override the string match in the *strict* direction, and I think it is right — but it is the sharpest instance of the "match on meaning, not string" instruction cutting against itself.
- **`nac ydw` (309)** — I called the negative short answer new lexis. Kept has `yndw` (bound) and `na, sgynnon ni ddim`, but no `nac ydw`. Given how central the yes/no answer paradigm is to this whole block, it may deserve a carrier decision rather than a lego call.
- **`newydd` (332, "new")** — kept teaches `dw i newydd ddechrau` ("I've just started"), which is the adverbial `newydd`. I treated the adjective as already taught. Same word, different function; a stricter reading makes it new lexis.
- **Row granularity on the frame legos.** Whether `bod hi ddim isio` is one lego or `bod hi` + `ddim isio` is a real authoring choice and I made it consistently as one M-lego (all under the 8-syllable cap). Splitting it would raise both counts roughly in proportion and leave the ratio near where it is.
- **Seed 329 scored zero.** `Mae'n bwysig` is exactly kept lego #139. A real build would still need the seed row for phrase scaffolding, but it introduces no lego, and I counted it honestly as 0 rather than rounding it up.

### Explicit gaps

- **I did not decompose to component level.** The kept-inventory file supplied is legos only (457 rows), with no `course_practice_phrases` component rows. Ruling 1's "bound inside a taught M-lego" test was therefore applied by reading the M-lego's target text, not by consulting an authoritative component list. If the components for seeds 1–267 exist and were consulted, a handful of my 31 bound-form calls could flip — in either direction. I did not have that data and did not assume it.
- **No BUILD/USE phrase costing.** This measures lego rows only. The 4-BUILD/5-USE floor applies to every one of the ~750, recombinant included, and that phrase volume is the larger share of the actual spend. It was not in scope here and is the obvious next measurement.
- **Nothing outside 300–339 was decomposed.** Extrapolation to 316 seeds is arithmetic on one contiguous sample, with the caveats above.
