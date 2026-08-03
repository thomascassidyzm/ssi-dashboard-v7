# kor_for_eng remediation plan — decomposition re-cut (2026-08)

**Status: PLAN for Kai to approve/trim. Nothing executed. All rebuild steps = audio cost + released-course churn = Kai's call.**

Diagnostic basis (flex-kor, 2026-08-03, read-only): 830 legos across S1-450; 429 orphan legos
(`scripts/deepening/kor/unspreadable.tsv`); full lego dump verified against live DB via course-builder API.
Doctrine: `ralph-methodology.md` (2-4 word grain, honest whole-intention glosses, controlled known language,
contrastive-twin debuts for construction-features).

## The diagnosis in one paragraph

kor has two opposite decomposition failures that converge on the same fix. **Era 1 (S~150-300):** seeds were
never decomposed — 97 of S201-300 are ONE lego = the whole sentence (1.04 legos/seed, median 8 known-words),
so every USE phrase is the same sentence with a filler bolted on front (eternal-pool pollution), and nothing
recombines. **Era 2 (S~300-450):** the opposite — bound fragments minted as bare A-legos (죽고 "die and",
타야 "have to catch", 한다고 "reported speech", 마리를 "animal counter") whose glosses violate the controlled
known language, plus broken phrases from ~S400. Both eras failed to mint the same mid-size machinery chunks;
era 1 needs splitting DOWN to them, era 2 fusing UP to them. **~65-70% of the 429 orphans are badly-cut**
(~190-200 of the 228 long suspects + ~65-70 of the 140 short rows + ~half the 61 three-word rows); ~30% are
correctly-formed and just under-used (case-marked nouns, adverbials, true idioms like 한밤중에 — leave alone).

---

## 1. Machinery-lego inventory (mint once, reuse everywhere)

ROI = distinct seeds whose EXISTING phrases already contain the string (team-lead, 2026-08-03) — i.e., how many
seeds' content this lego would immediately anchor. None of these exist as standalone legos today.

| Machinery | ROI seeds | Proposed lego (honest gloss → target) | Debut realization | First debut at |
|---|---|---|---|---|
| ~다고 했어요 (reported past) | **119** | "said she was ready" → 준비됐다고 했어요 **+twin** "said he'd help" → 도와주겠다고 했어요 | contrastive twins, constant 다고 했어요, content varies | earliest re-cut carrier (S211 or S296 in Band A) |
| ~지 않아요 (plain negation) | 49 | "I don't think so" → 생각하지 않아요 +twin "it doesn't work" → 되지 않아요 | twins | first Band-A carrier (~S202) |
| ~것 같아요 (seems/feels-like) | 43 | "it seems difficult" → 어려운 것 같아요 +twin "I don't feel ready" → 준비가 안 된 것 같아요 | twins | S114/S115 re-cut (Band B) |
| ~야 해요 (have to) | 42 | "I have to leave" → 떠나야 해요 | M-lego; per-verb forms overlap on 야 해요 | S167/S274 re-cut |
| ~고 싶지 않아요 (don't want to) | 19 | "I don't want to ask" → 물어보고 싶지 않아요 | M-lego overlapping existing ~고 싶어요 family (122 seeds already carry 고 싶어요) | S208 re-cut |
| ~면 좋겠어요 (I hope) | 19 | "I hope you finish soon" → 곧 끝나면 좋겠어요 | M-lego | S149 re-cut |
| ~을 때 (when-clause) | 17 | "when she saw me" → 봤을 때 | M-lego, 을 때 silent component | S147 re-cut |
| ~는 사람 (person who) | 12 | "someone who speaks Korean" → 한국어를 하는 사람 | M-lego; powers the S230-236 family | S22 exists partially; consolidate at S230 re-cut |
| ~ㄹ 수 있어요 (can) | 4 | "I can stay" → 있을 수 있어요 (or seed-native verb) | M-lego; also repairs era-2 bare 수 있어요 phrase bugs | S276 re-cut |
| 알아요 / 알아내야 해요 (I know / have to find out) | high (S230-236, 59, 293, 297…) | "I know" → 알아요; "have to find out" → 알아내야 해요 | A + M overlap | S230 re-cut |
| 궁금해요 (I wonder) | S289, S290 | "I wonder" → 궁금해요 (with ~지 clause component) | M-lego 있을지 궁금해요 → A overlap | S289 re-cut |

Placement rule (doctrine): pull, not push — each debuts at the first re-cut seed that carries it, as
`is_new` there; later carriers become recombination, not re-debuts. **Every mint needs a ZUT collision check
against existing phrase-level mappings before insert** (e.g. confirm "I know" has no competing target).

---

## 2. Band A — S201-300 redecomposition (97 whole-seed legos; the core of the campaign)

### 2a. Paradigm families first (worked examples)

**Family 1 — relative clause `~는/ㄴ N을 알아요/만났어요` (S230-236, 7 seeds).** Today: 7 near-identical
sentences each memorized as an unanalyzed blob; S230's 8 USE phrases are all the same sentence + filler.
Re-cut so the learner acquires ONE frame + swappable pieces:

| Seed | Current mega-lego | Proposed sub-legos |
|---|---|---|
| S230 | 같이 일하고 싶어하는 젊은 남자를 알아요 (whole) | 같이 일하고 (work together) · 싶어하는 (who wants to) · 젊은 남자를 (a young man) · 알아요 (I know) |
| S231 | …늙은 남자를 알아요 (whole) | 도움을 요청하고 (ask for help) · 싶어했던 (who wanted to) · 늙은 남자를 (an old man) — frame reuse, only 2 new |
| S232 | …나이 든 여자를 알아요 (whole) | 기억할 수 있는 (who can remember) · 나이 든 여자를 (an old woman) · 답을 (the answer) |
| S233 | 여동생을 아는 젊은 여자를 알아요 (whole) | 아는 (who knows) · 젊은 여자를 (a young woman) |
| S234 | 어젯밤에 남동생과 같이 일하는 사람을 만났어요 (whole) | 같이 일하는 사람을 (someone who works with) · 만났어요 (I met) · 어젯밤에 (last night) |
| S235 | 뭔가 말하고 싶다고 한 사람을 만났어요 (whole) | 말하고 싶다고 한 (who said he wanted to say) · 사람을 · (만났어요 from S234) |
| S236 | 도와주려고 한다고 한 사람을 알아요 (whole) | 도와주려고 (trying to help) · 한다고 한 사람을 (someone who said, M w/ silent 한) |

Net: ~18-20 sub-legos replace 7 blobs; from S232 on, each seed adds only 2-3 genuinely-new pieces —
recombination baskets become real (vary the person-noun, vary the embedded verb) instead of filler-stacks.

**Family 2 — `~(으)면 좋겠어요` hope-frame (S149, S291, S292).** e.g. S292 파티에 올 수 있으면 좋겠어요 →
파티에 (to the party) · 올 수 있으면 (if you can come) · 좋겠어요 (I hope).

**Family 3 — `~고 싶지 않아요/않았어요` (S208, S211, S241, S251, S269, S300).** e.g. S208 → 어떻게 말하는지
(how to say it) · 물어보고 (ask) · 싶지 않았어요 (didn't want to).

**Family 4 — `궁금해요` wonder-frame (S289, S290).** S289 → 오늘 오후에 · 거기 있을지 (whether she'll be
there) · 궁금해요.

**Family 5 — conditional-would `~다면/할 수 있다면 … 텐데요` (S225, S229)** and **quotative-say family
(S295, S296, S211).** Same recipe.

### 2b. Systematic recipe for the remaining ~70 whole-seed legos

Per seed: (1) the mega-lego's existing **components already mark the cut points** — promote 2-4 of them to
real sub-legos (2-4 words, ≤8 syllables), re-glossed honestly if needed ("who said"→한 stays a silent
component, never a debut); (2) reuse machinery legos from §1 wherever the seed carries them — most seeds then
need only 1-2 genuinely-new content legos; (3) rebuild BUILD/USE baskets per lego (min 5 USE, vary along the
new lego's axis — kills the filler-stack pattern); (4) keep the seed sentence + translation unchanged (no
CANONICAL MISMATCH, no re-translation).

Scale: 97 seeds → ~300-340 sub-legos replacing 97 mega-legos (net +210-240 legos), ~2,200-2,600 new phrases
replacing ~1,400 filler-stack phrases.

---

## 3. Band B — S101-200 single-lego seeds (36 seeds; lighter pass)

Same recipe as §2b, but 1.67 legos/seed means partial decomposition exists — only the 36 single-lego seeds
plus the ~30 over-fused 5-8-word clause chunks (fused conditional ~면 / temporal ~을 때·후에·전에 /
nominalizer ~는 걸·게 bundles, e.g. S90 더 천천히 말해 주시면 → 더 천천히 + 말해 주시면; S147 제가 긴장한 걸
봤을 때 → 긴장한 걸 + 봤을 때; S146 → 고치려고 + 한 후에). Scale: ~66 seeds touched, +90-110 legos,
~700-900 phrases. Do AFTER Band A (Band A mints the machinery these reuse).

---

## 4. Era-2 — S300-450 coupled repair + recut

⚠️ **Degradation starts ~S400, not S460** as previously recorded: verified broken phrases at S407
("he didn't do it last week" → 지난 주에 하지 않아요, tense mismatch), S413 ("if you go today you can" →
오늘 가면 수 있어요, ungrammatical bare 수 있어요; seed has NO finite-verb lego at all), S450 (직접
mis-glossed "themselves" → "she knows they have to do it themselves" = 직접 알아요). **Step 0: phrase-level
scan of S380-460 to fix the repair boundary before anything else touches this band.**

**4a. Fuse-up (~65-70 legos; changes target text → audio-affected).** Bound fragments fused with their
licensor into the standard grain:

| Class (count) | Current → proposed examples |
|---|---|
| bare -야 obligation (~10) | 타야 "have to catch" → 타야 해요; 이해해야 → 이해해야 해요; 준비해야/돌아야/봉사해야/이야기해야/뛰어야 likewise |
| bare attributive/-ㄹ/nominalizer (~24) | 넘어질 "will fall" → 넘어질 거예요; 뜻일 수 "could mean" → 뜻일 수 있어요 (current cut isn't a constituent); 동의할 → 동의할 수 있어요; 생각하기를/좋아하길 → fuse with governing verb |
| dangling -고/-서 stems (19) | 죽고 "die and" / 먹고 / 모으고 / 결정하고 / 개발하고 / 여행하고 … → finite form + silent -고 component inside an M-lego with the seed's own continuation |
| bare quotative -다고 (~12) | 도와주겠다고 → 도와주겠다고 했어요; 준비됐다고 → 준비됐다고 했어요 (these two = the §1 twin debut, free); 걱정된다고/안 됐다고/볼 수 없다고 likewise |
| bare -지 negation (5) | 생각하지 "don't think" → 생각하지 않아요; 하지/물어보지/충분하지/알아내지 likewise |
| roots/counters/register (~10) | 새끼 "kitten" → 새끼 고양이 (standalone = animal-baby/vulgar); 명 "people" → 두 명/세 명 twins; 마리를 → 두 마리/세 마리 twins; 기억 → 기억해요; 알려 → 알려 주세요; 화나 → 화났어요; 물어봐 (intimate register) → 물어봐요; 쪽으로 → 이쪽으로 / 우체국 쪽으로 |

**4b. Honest re-gloss only (~25-30 legos; known-side text; cheap).** Target unchanged → target audio
untouched; known audio line re-voiced (small). 가면 "if go" → "if you go"; 먹으면 → "if you eat";
기대하면 → "if you expect"; kill every grammar-label gloss ("reported speech" S322 한다고, "attributive
reported" S346 좋았다는, "animal counter" S369, calques "follow-come" S381) — those whose target must also
change move to 4a.

**4c. Superset dead weight (3 rows flagged `super` in tsv).** e.g. S450 L1 "catch the train themselves"
duplicates its own L2 타야 + L3 기차를 → delete L1 (anchor-check first per redecomp mechanics).

**4d. Broken-phrase repair S380-460** — scope from the step-0 scan; expect low hundreds of phrases (tense
mismatches, ungrammatical tilings, 직접-type gloss poisoning).

**4e. Fold in the open kor rebuild backlog (same campaign, not separate passes):** 싶다 rebuild (OPEN from
final-pass) — resolve inside §1's 싶다-family minting; S549-668 6-phrase broken band + the 47 seeds the
earlier incident recovery missed — same crew, after era-2.

---

## 5. Mechanics + cost

**Mechanics (established paths, per repo memory/docs):**
- Per seed: DELETE its practice phrases → replace/renumber legos (swap lego_index; **anchor-check before any
  merge/drop**) → INSERT new legos + phrases via `POST /api/build/backfill-submit` / seed-complete path
  (validator re-runs tiling/ZUT/vocab; phrase IDs auto-assigned). Every query course-scoped to `kor_for_eng`.
- ZUT sweep before each band: new sub-lego known-glosses vs existing course-wide mappings.
- Coordinate with the 52 deepening phrases just added (draft/no-audio): re-cut seeds must not orphan them —
  re-validate those baskets after recut.
- After lego mutations: dashboard pipeline refreshes `course_round_index`; verify before calling a band done.
- Audio: **queue an audio-pass request per band** (`queue-audio-pass.cjs kor_for_eng --reason`) — never fire
  TTS; **never from kai-stage** (mint from main; kai-stage lacks the audio gates).

**What costs audio vs what doesn't:**
- EXPENSIVE (new presentation audio + full phrase audio): Bands A, B, era-2 fuse-up (4a), phrase repairs (4d).
- CHEAP (known-line only or none): era-2 re-gloss (4b), superset deletions (4c — deletions need the deletion-
  plan approval gate), leaving the ~130 legit orphans alone (explicitly in scope to NOT touch).

**Scale + rough TTS spend** (kor is on xAI eve @ $15/1M chars; Korean phrase ≈ 15-25 chars/line):

| Band | Seeds | Legos +/− | Phrases regenerated | TTS rough order |
|---|---|---|---|---|
| A (S201-300) | 97 | +210-240 | ~2,400 | ~$3-6 |
| B (S101-200) | ~66 | +90-110 | ~800 | ~$1-2 |
| Era-2 (4a/4c/4d) | ~60-80 | ~70 reshaped | ~600-900 | ~$1-2 |
| Era-2 re-gloss (4b) | ~25 | 0 | known lines only | <$1 |
| 549-668 backlog | scope TBD | — | — | separate estimate |

TTS dollars are NOT the constraint. The real costs: (1) craft/review time — this is content craftsmanship,
worked slowly per methodology, weeks not days; (2) **released-course churn** — kor_for_eng is a live released
base course; recut changes deterministic phrase IDs in the affected bands, touching learner progress/audio
mapping. Mitigation: band-by-band deploys, stage-first, verify round-map after each.

**Payoff:** unlocks spreading for most of the 429 orphans (the original deepening goal — kor is worst-in-fleet
at 54.9% orphan rate vs Welsh gold 6-9%), replaces the filler-stack eternal pool in S201-300 with real
recombination, and fixes the era-2 broken phrases learners currently hear.

---

## 6. Priority sequence (cheapest-high-value first) + pilot

**PILOT (recommend approving this alone first):**
1. Re-cut the S230-236 family (7 seeds, ~20 sub-legos, ~150 phrases) per §2a, minting 알아요 / ~는 사람 /
   싶어하는 machinery in the process.
2. Mint the quotative twin pair (준비됐다고 했어요 / 도와주겠다고 했어요) + fuse-up 8-10 era-2 exemplars
   (타야 해요, 넘어질 거예요, 뜻일 수 있어요, 생각하지 않아요, 새끼 고양이, 두 명/세 명…).
3. All draft/no-audio. Success check: re-run `scripts/deepening/lego-flex-diagnostic.cjs` on the pilot scope —
   the new sub-legos must show >0 outside-spread candidates (hard number, not vibes) — plus one Opus
   register-aware review of the new baskets.
4. Kai reviews → approves TTS for pilot → then decides Band A.

**FULL SEQUENCE after pilot validates:**
1. Era-2 re-gloss (4b) + superset deletions (4c) — cheapest, immediate honesty wins.
2. S380-460 phrase scan (step 0) → fix the repair boundary.
3. Band A (S201-300) in sub-bands of ~25 seeds, families first.
4. Era-2 fuse-up + phrase repair (4a/4d), then fold in 549-668 backlog + 싶다 rebuild.
5. Band B (S101-200) lighter pass.
6. Re-run the deepening/spread pass over the whole course — the campaign's actual goal.
7. Never touched: the ~130 correctly-formed orphans (한밤중에, 동시에, case-marked nouns, time adverbials).

**One writer per band at a time** (backfill U-numbering collides across concurrent writers); Opus for all
content authoring; reviewer pass per band before any audio queue.
