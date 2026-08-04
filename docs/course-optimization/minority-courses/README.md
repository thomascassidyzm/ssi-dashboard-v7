# Minority / small-language courses — feasibility probe (2026-07-03)

Kai asked to test whether we can build a set of small / minority-language courses now
that Fable is available. This directory holds the **first-10-seed probes + "what to watch
out for" instructions** for each, so that if we commit to any of these, whoever builds it
(possibly Opus) starts with the traps already mapped.

**These are probes, not courses.** Nothing here has been written to the database, decomposed
into LEGOs, or given audio. The seed translations below are **Fable output, web-grounded but
not native-verified** — treat every line as a candidate, not a fact.

## Candidate list & verdicts

| Course | Type | Native checker? | Fable verdict | Notes |
|---|---|---|---|---|
| **Pennsylvania Dutch → Eng** (`pdc_for_eng`) | adapt German | ✅ **yes** | **Most viable** | Real candidate — verifiable. Good source scholarship (Louden). Needs `pdc` code added. |
| **Yiddish → Eng** (`yid_for_eng`) | adapt German | ❌ not yet | Viable core, flagged edges | Model handles core Yiddish; idiom edges + Hebrew-layer need escalation. Ship-blocked till we find a checker. |
| **Neapolitan → Eng** (`nap_for_eng`) | adapt Italian | ❌ not yet | **Hardest** — 8/10 seeds flagged | No standard orthography, near-empty online paradigm tables. Copy nap.wikipedia's spelling. Needs heavy native involvement or it doesn't work. |
| **Breton → Eng** (`bre_for_eng`) | from scratch (may exist) | ❌ not yet | Probing now | Celtic — initial mutations + *ober* periphrasis are the traps. Peurunvan orthography (copy br.wikipedia). Course may already exist. |
| **Yoruba → Eng** (`yor_for_eng`) | from scratch | ❌ not yet* | Not probed yet | *A native-checked `yor.json` reference already exists in the repo (from the `cym_for_yor` sibling); `yor` is already in `WEAK_LLM_LANGS` → auto-Opus. Sequenced after adaptations. |
| **Welsh → Yoruba** (`cym_for_yor`) | from scratch | Welsh ✅ / Yoruba side ❌ | Not probed yet | Hardest structurally: neither side is English (`translate_both`). |
| Other Italian minority langs (Sicilian `scn`, Sardinian, Venetian, Friulian `fur`…) | from scratch | ❌ | Not probed | Sicilian/Sardinian have more online presence than Neapolitan; revisit after nap verdict. |

**Native checkers confirmed available (Kai, 2026-07-03): Welsh and Pennsylvania Dutch only.**
Everything else is a feasibility probe that cannot go live until a checker is found.

## How these were produced (the repeatable method)

Two-stage, per language, on **Fable** (Kai's call: Fable-first, document where it breaks,
escalate to Opus only where flagged):

1. **Research pass** (Fable + web): orthography decision, divergence-from-parent, core grammar,
   gotchas — grounded in real sources (Wikipedia, Wiktionary, Louden's scholarship, nap.wikipedia,
   padutchdictionary.com), not model memory. Every uncertain claim self-flagged `NEEDS NATIVE CHECK`.
2. **Translation pass** (Fable + web): target side of seeds 1–10, using the English as meaning and
   the parent (German/Italian) line as a *structural scaffold only*, with per-seed confidence + an
   ESCALATE flag.

Parent scaffold = the real seeds 1–10 of `deu_for_eng` / `ita_for_eng` (read-only pull from Supabase).
The English known side is shared canonical data — for any `X_for_eng` course it auto-fills from the
`canonical_seeds` table the moment the course row exists (see mechanics below), so only the target
side is ever authored.

**Fable performed well**: it did genuine source-fetching, caught its own false attestations
(Yiddish `pruvn tsu` "proof" was a separable prefix, not the complementizer), and caught a live
false friend (PD `Satz` = yeast, not sentence). The failure mode to watch is not sloppiness — it's
confident *plausible-but-wrong* output on the high-frequency distinctive words, exactly where a
parent-language reviewer wouldn't catch it either.

## Mechanics — how to actually stand one of these up (when a language proves viable)

Grounded in the current code; verify before relying.

**For an `X_for_eng` course (Yiddish, Neapolitan, PA Dutch, Yoruba):**
1. **Register the language code** in `tools/sync/reference/language_codes.csv`. Courses parse
   direction from `course_code = target_for_known` via a regex that **requires a 3-letter target**
   (`services/course-builder/lib/language-config.cjs`). So:
   - `yid` for Yiddish (NOT 2-letter `yi` — breaks the regex, misroutes to DEFAULT).
   - `nap` (Neapolitan) — present as manifest code but **needs a `database_code`**.
   - `pdc` (Pennsylvania Dutch) — **entirely absent from the CSV, must be added.**
   - `yor` (Yoruba) — already resolves.
   - None of yid/nap/pdc/yor have Azure/ElevenLabs voices → **text-only** until voice config is
     hand-built. (Audio is a separate, cost-gated step anyway — needs a plan + Kai's approval.)
2. **Create the course row** — `POST /api/courses/create` (`services/production-api.cjs`), or the
   cleaner precedent script `scripts/fixes/scaffold-tam-hin-courses.cjs` (loads `canonical_seeds`,
   inserts the `courses` row with `voice_config`, inserts empty seed shells).
3. **English known_text auto-fills** on the first `GET /course/<code>/translate`
   (`services/course-builder/routes/translation.cjs` → `initializeCourseSeeds`), pulled from
   `canonical_seeds.source_text` with `{target}` → language name. Nothing to author on the known side.
4. **Translate the target** — `POST /course/<code>/translate` writes `target_text`. The translate
   brief (`services/briefs/translate.cjs`) picks the side data-drivenly and auto-upgrades weak-LLM
   languages to Opus (`yor` already in `WEAK_LLM_LANGS`; add `nap`/`yid`/`pdc` there too).
   For weak languages it injects `services/briefs/reference-examples/<lang>.json` if present
   (a native-checked anchor set — `yor.json` and `fin.json` exist; **make one per new small language**).
5. Then build (LEGOs + phrases) → final-pass → (audio, gated) → export.

**For an adaptation from a parent course** (the Québécois/Austrian precedent —
`scripts/quebecois/LESSONS.md` is the canonical how-to), a variant is a **`course_code` suffix only**;
`target_lang` stays the base. But note: Yiddish/Neapolitan/PA-Dutch are **not** dialect variants of
their parents — the divergence is large enough (see per-language files) that "copy parent target_text
and tweak" is the *wrong* mental model. Use the parent only as a structural scaffold, re-derive the
target. Duplication gotchas if you do fork rows: `seed_id`/`id`/`target_lego_id` rewrites,
`qa_checked` is a timestamp, paginate by `seed_number`.

## Registration TODO (before any real build)

- [ ] Add `pdc` (Pennsylvania Dutch) to `language_codes.csv` — currently absent.
- [ ] Add `database_code` for `nap` (Neapolitan) and `yid` (Yiddish); do **not** use 2-letter `yi`.
- [ ] Add `nap`/`yid`/`pdc` to `WEAK_LLM_LANGS` in `services/briefs/translate.cjs` (force Opus).
- [ ] Build a native-checked `reference-examples/<lang>.json` per language once a checker signs off seeds.
- [ ] Flag all four as **text-only** until voice config exists.

## Per-language files
- [`pennsylvania-dutch.md`](./pennsylvania-dutch.md) — most viable; native checker available.
- [`yiddish.md`](./yiddish.md) — viable core, flagged edges.
- [`neapolitan.md`](./neapolitan.md) — hardest; 8/10 seeds flagged.

## Sequencing (Kai, 2026-07-03)
Adaptations first (done: probes above). Then from-scratch **Yoruba-for-English** (has `yor.json`,
forced Opus) and the structurally hard **Welsh-for-Yoruba** (`translate_both`). Not started.
