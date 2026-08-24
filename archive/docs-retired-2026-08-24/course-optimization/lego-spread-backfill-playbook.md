# Lego-spread backfill playbook

**Problem.** A large share of each course's new LEGOs are "orphans" — introduced in their
own seed, practiced in their own basket, then never encountered again. Fleet scan
2026-07-27 (per-course % of new LEGOs with zero uses outside their own seed): most courses
sit at **20–55%** (ara_lb 48%, kor 55%, eng_for_sin 56%, fra 45%, fin 38% pre-work…).
The hand-crafted Welsh originals sit at **6–9%** — that's the profile the method wants:
chunks keep coming back in fresh contexts, feeding long-range spaced recall.
⚠️ jpn/hak/yue/nan/zho/tha numbers from a space-based scan are inflated artifacts — rerun
with `--cjk`.

**Fix.** Spread under-used LEGOs by adding new USE phrases to *later* seeds' baskets, where
each phrase contains both the host basket's LEGO and the spread LEGO verbatim. Proven on
fin_for_eng 2026-07 (~500 phrases over three agent runs, validated).

## Method (per course)

1. **Analyze + prepare** (a scratchpad dir the agent can read):
   `node tools/backfill-spread/analyze.cjs <course> --max-uses 5 --out <dir>`
   First pass `--max-uses 5`; deepening pass `--max-uses 10`. Add `--cjk` for unspaced
   scripts. Outputs `<course>-targets.json` + `all-knowns.txt` + `all-phrases.tsv`.
2. **Write the agent brief** from the template below, adding the course's per-language
   addendum (see fin example). Give the brief + file paths to ONE agent.
3. **Spawn ONE backfill agent per course** — never two writers on the same course
   (backfill-submit assigns U-numbers per basket at submit time; concurrent writers can
   collide). Batches of ~50–250 target LEGOs per agent run work well.
4. **Validate after every run** (and after crashes — submissions are incremental):
   `node tools/backfill-spread/validate.cjs <course> --since <run start ISO>`
   Read every reported line. Fix or delete offenders before continuing.
5. **Reconcile human review state** if the course has a proofread/approval process:
   any seed whose approval predates a new insert goes back to review (compare
   `course_seeds.approved_at` vs phrase `updated_at`/`created_at`, timestamp-wise).

## Agent brief template (universal rules)

- Mission: for each LEGO in the targets file, add natural USE phrases hosted in LATER
  seeds' baskets until it reaches ~N outside uses or natural hosts run out.
  **NEVER force. Skip freely with a one-line reason.** 2 great phrases beat 10 stilted ones.
- Hosts anywhere later in the course, including the final seeds (late hosts are actively
  good). ≤2 new phrases per host basket per run.
- `target_text` must contain the HOST LEGO's target verbatim (the endpoint enforces this)
  AND the spread LEGO's target verbatim. Never inflect or reorder either chunk.
- **Form discipline** (the #1 failure mode): every target-language word FORM must already be
  attested at ≤ the host seed — check `GET /api/vocab/<course>?seed=N` (word-form list;
  never call it without ?seed=N) and grep `all-phrases.tsv` for multi-word frames.
  Pronoun-swaps of an established frame are fine ("mun pitää" → "sun pitää"); a frame that
  has only ever appeared in another shape is NOT ("pitikö sun" attested ≠ "sun piti" usable).
- **Object-case discipline** (case languages): object forms introduced under
  negation/irresultative seeds may only be reused in contexts licensing that case
  (negation, try-verbs, "it's hard to…"-type impersonals). Do not invent total-object
  forms the course hasn't taught. When unsure, skip.
- **Dup-check** every English known against `all-knowns.txt` (lowercase, strip `?!.,`).
- **ZUT consistency**: grep the TSV for how an English chunk is already rendered; never add
  a second rendering, or reuse a rendering under a different English chunk.
- Register and style must match the course (check existing phrases); questions end with `?`
  on both sides; no sentence-initial capitalisation (English "I" and proper nouns excepted);
  no trailing periods.
- Variety (ralph-methodology P7): questions / negations / clause-embeddings over adverb swaps.
- Submit incrementally (~10 phrases per POST) via the validator endpoint:
  `POST /api/build/backfill-submit/<course>` — body
  `{"phrases":[{"seed_number":N,"lego_index":L,"use":[{"known_text":"…","target_text":"…","target_score":7}]}]}`
  Check each response; a containment error means the host LEGO isn't verbatim in your target.
- USE phrases only. Never touch existing rows. No sub-agents. No Anthropic SDK.
- If context runs low: submit what you have, then output `FRONTIER: stopped after list index N`.
- Final output: per-LEGO summary (`SPREAD n: hosts…` / `SKIPPED — reason`) — and if running
  under a team lead, send it via the SendMessage tool (plain output is invisible).

## Per-language addendum — example (fin_for_eng)

- English signals Finnish structure: dummy-it = "it's / it's not"; referential = "it is /
  it isn't / it was"; perfect referential = "it has been".
- like→tykätä, enjoy→nauttia; use→käyttää, spend→viettää (one-to-one, never cross).
- Partitive objects from negative seeds (vastausta, totuutta, tarinaa, koko iltapäivää…)
  need partitive-licensing contexts: negation / yrittää / "on vaikeaa + INF".
- kuinka only with quantifier/adverb (kuinka paljon/kauan/nopeesti); bare "how" = miten.
- Reflexive possessives: bare -nsa ("laukkuunsa"), not "oma…", unless English says "own".
- **Future tense**: "will/'ll" → Finnish present, never aikoa. "going to" → aikoa ONLY for
  intention; predictions/ability stay present ("mä myöhästyn", "sille käy hyvin", pystyä).
  **Stative predicates** (olla + adj/location, pystyä bare): future English needs a licensor
  (time word / when-if-clause / hope-afraid-sure embed) — bare stative pairs gloss as present
  ("I'm ready → mä oon valmis", "I can't be → mä en pysty olemaan"). Dynamic verbs may pair
  bare future English with present Finnish ("I'll call you → mä soitan sulle") — natural in both.
- Destination "here/there" with motion verbs = tänne/sinne (illative), not täällä/siellä.

Write an equivalent addendum per course before spawning (register rules, known
translation-choice conventions, script quirks). Sources: the course's build patterns
memory/docs, `courses.quality_rules`, and recent final-pass docs.

## Operational gotchas (learned the expensive way)

- **One writer per course.** See step 3.
- **targets.json `lego_index` can be OFFSET from the DB** (eng_for_hin 2026-07-27: "on Monday"
  is DB 316/4 but targets.json said 316/1). Always take the HOST basket's lego_index from
  `all-phrases.tsv` (or the DB), never from targets.json. The submit endpoint's containment
  check catches most mislabels — read its errors.
- **Apostrophes get SILENTLY stripped when submitting via `curl -d '...'` single-quote
  wrapping** ("don't"→"dont"). Always submit from a JSON *file* (`--data-binary @file.json`
  or a small python helper). After any run, sweep new rows for
  `\b(dont|cant|im|wont|didnt|youre|thats…)\b` before calling it clean.
- **Resume after crash/limit**: submissions are already saved (incremental) — validate them,
  regenerate targets (counts changed) and dumps (scratchpads get wiped between sessions),
  then message the same agent to resume; it reconciles its frontier from the fresh counts.
- **Read scripted-change dry-runs in full before applying** any bulk fix that comes out of
  validation — regex/heuristic edge cases (JS `\b` fails on accented letters; homographs;
  "it's been" ≠ "it is") only surface on a full read.
- Backfill inserts do NOT touch `course_round_index` (phrase-only), so no view refresh is
  needed for spreading alone. Lego-structure edits DO dangle the view.
- `analyze.cjs` containment and `validate.cjs` FORM checks are space-based — always `--cjk`
  for unspaced scripts, and accept that CJK form-checking then needs a model/native pass.
- The proofread tool (`tools/proofread/`) shows new phrases as pending dots; approvals whose
  timestamp predates an insert must be re-earned (step 5).
