# eng_for_deu known-side adjudication — the reproducible artefacts

The pipeline behind `../deu-ordering-adjudication-2026-08-17.md`. Run in order, from the repo root,
with `.env` present (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`). They only read.

| file | what it does |
|---|---|
| `deu-dump.cjs` | dumps all 486 findings with full phrase text + the 545-stem taught inventory with debut seeds. Calls the same `checkKnownSide` the submit path calls. |
| `deu-tier1.cjs` | the TIER-1 classifier: German morphological relatedness as of each phrase's seed. Prints every pairing with its reason **so the pairings can be hand-audited** — seven were wrong or missing and were corrected by hand. |
| `deu-english-axis.cjs` | the learner's-shoes axis: is the ENGLISH the prompt demands taught yet? Cross-tabs against the morphology verdict. |
| `deu-ledger.cjs` | the auditable ledger. Every ruling that is a judgement rather than a computation is written out **in this file** with its evidence, so a reviewer can disagree with a line rather than with a number. Emits the funnel. |
| `deu-ledger.json` | its output — the funnel counts, the nine confirmed defects, the dismissals, the hand corrections. |

The raw intermediates (`deu-findings.json`, `deu-legos.json`, `deu-classified.json`,
`deu-english-axis.json`) are deliberately not committed — they are large and re-derived by
`deu-dump.cjs` in one command. Also needs `deu-legos.json` from a one-line `course_legos` dump
(see the report; `deu-tier1.cjs` reads it for the English side).

Scope note: these are course-specific by design. The morphology is German. Do not generalise them
into a shared lemmatiser for the next course — see the runbook on why that would be a lie.
